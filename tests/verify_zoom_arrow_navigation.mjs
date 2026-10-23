import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Freeze the comparison before the isolated Zoom navigation edit. This remains
// useful after the change is committed, unlike a comparison against current HEAD.
const BASELINE_REVISION = "4b9e22b4fa9926020888a27eeadb28f3bdfbc20b";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const zoomPrefix = "versions/zoom-ksize-intro-outro-v1";
const zoomRoot = path.join(repo, zoomPrefix);
const manifestRoot = path.join(repo, "versions/chs-v78-teacher-classmate-evelyn-unique-roles/data");
const currentFile = (name) => fs.readFileSync(path.join(repo, name), "utf8");
const baselineFile = (name) => execFileSync("git", ["show", `${BASELINE_REVISION}:${name}`], { cwd: repo, encoding: "utf8" });
const plain = (value) => JSON.parse(JSON.stringify(value));
const manifestCache = new Map();
const sourceBefore = baselineFile(`${zoomPrefix}/app.js`);
const sourceAfter = currentFile(`${zoomPrefix}/app.js`);
const helperBefore = baselineFile(`${zoomPrefix}/zoom-slides.js`);
const helperAfter = currentFile(`${zoomPrefix}/zoom-slides.js`);
const immutableFiles = [
  "screen-share-study/review.html", "screen-share-study/review.js", "screen-share-study/review.css",
  "screen-share-study/live.html", "screen-share-study/live.js", "screen-share-study/zoom_assignment.js",
  "versions/chs-v80-balanced-assignment/app.js", "versions/chs-v80-balanced-assignment/review.js",
  "versions/chs-v78-teacher-classmate-evelyn-unique-roles/styles.css",
];
for (const filename of immutableFiles) {
  assert.equal(currentFile(filename), baselineFile(filename), `${filename}: shared/CHS behavior must stay byte-identical`);
}

function apiFrom(source, name) {
  const context = vm.createContext({ window: {}, document: null, URL, URLSearchParams, Uint32Array });
  vm.runInContext(source, context);
  return context.window[name];
}

function classListFor(node) {
  const values = () => new Set(node.className.split(/\s+/).filter(Boolean));
  return {
    contains: (value) => values().has(value),
    add(...items) { const next = values(); items.forEach((item) => next.add(item)); node.className = [...next].join(" "); },
    remove(...items) { const next = values(); items.forEach((item) => next.delete(item)); node.className = [...next].join(" "); },
    toggle(item, force) {
      const wanted = force ?? !this.contains(item);
      this[wanted ? "add" : "remove"](item);
      return wanted;
    },
  };
}

function element(tag = "div") {
  const node = {
    tagName: tag.toUpperCase(), className: "", textContent: "", hidden: false, disabled: false,
    dataset: {}, children: [], handlers: {}, attributes: {}, style: {}, removed: false,
    addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); },
    append(...children) { children.forEach((child) => { child.parent = this; this.children.push(child); }); },
    appendChild(child) { this.append(child); return child; },
    replaceChildren(...children) { this.children = []; this.append(...children); },
    remove() { this.removed = true; },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === "class") this.className = String(value);
      if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
    },
    getAttribute(name) { return name === "class" ? this.className : this.attributes[name] ?? null; },
    getClientRects() { return this.removed || this.hidden ? [] : [{}]; },
    focus() {},
    matches(selector) {
      return selector.split(",").some((part) => {
        let query = part.trim();
        if (!query || query.includes(" ") || query.includes(">")) return false;
        const not = [...query.matchAll(/:not\(([^)]+)\)/g)].map((match) => match[1]);
        query = query.replace(/:not\([^)]+\)/g, "");
        if (not.some((value) => this.matches(value))) return false;
        const tagMatch = query.match(/^[a-z]+/i);
        if (tagMatch && this.tagName !== tagMatch[0].toUpperCase()) return false;
        for (const match of query.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(match[1])) return false;
        for (const match of query.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)) {
          const value = this.getAttribute(match[1]);
          if (value == null || (match[2] != null && value !== match[2])) return false;
        }
        return Boolean(tagMatch || query.includes(".") || query.includes("["));
      });
    },
    querySelector(selector) { return descendants(this).find((child) => child.matches(selector)) || null; },
    querySelectorAll(selector) { return descendants(this).filter((child) => child.matches(selector)); },
    click() {
      if (!this.disabled && !this.hidden && !this.removed) {
        (this.handlers.click || []).forEach((handler) => handler({ target: this, preventDefault() {} }));
      }
    },
  };
  node.classList = classListFor(node);
  return node;
}

function descendants(node) {
  return node.children.filter((child) => !child.removed).flatMap((child) => [child, ...descendants(child)]);
}

function parseStimulus(source) {
  const nodes = [];
  // Only interactive nodes and confirmation text need a DOM in this harness.
  for (const match of String(source || "").matchAll(/<(button|p|h2)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
    const node = element(match[1]);
    for (const attribute of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
      node.setAttribute(attribute[1], attribute[2] ?? "");
      if (attribute[1] === "disabled") node.disabled = true;
      if (attribute[1] === "hidden") node.hidden = true;
    }
    node.textContent = match[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    nodes.push(node);
  }
  return nodes;
}

async function runtime(source, url, {
  helper = helperAfter,
  storage = new Map(),
  sessionStore = new Map(),
  localStorageFailure = "",
  sessionStorageFailure = "",
  deckVersion = "keynote-v1",
} = {}) {
  let timeline = [];
  let finishOptions;
  const rows = [];
  let properties = {};
  const timers = [];
  const messages = [];
  const body = element("body");
  const stage = element("div");
  stage.className = "jspsych-content";
  body.append(stage);
  const document = {
    body,
    createElement: (tag) => element(tag),
    addEventListener() {},
    querySelector: (selector) => descendants(body).find((node) => node.matches(selector)) || null,
    querySelectorAll: (selector) => descendants(body).filter((node) => node.matches(selector)),
  };
  const collection = (items = rows) => ({
    values: () => items,
    count: () => items.length,
    push: (row) => items.push(row),
    filter: (wanted) => collection(items.filter((row) => Object.entries(wanted).every(([key, value]) => row[key] === value))),
    last: (count) => collection(items.slice(-count)),
  });
  const jsPsych = {
    data: {
      get: () => collection(),
      addProperties: (next) => { properties = { ...properties, ...next }; },
      write: (row) => rows.push({ ...properties, ...row }),
      addDataToLastTrial: (row) => Object.assign(rows.at(-1), row),
    },
    run: (next) => { timeline = next; },
    finishTrial: (data) => {
      const node = timeline[jsPsych.active];
      const result = { ...properties, ...node.data, ...data };
      node.on_finish?.(result);
      rows.push(result);
      finishOptions.on_data_update?.(result);
      if (jsPsych.active === timeline.length - 1) jsPsych.completion = finishOptions.on_finish();
    },
    endExperiment: () => { jsPsych.completion = finishOptions.on_finish(); },
    active: 1,
  };
  const window = {
    document,
    location: { href: url.toString(), search: url.search, origin: url.origin },
    navigator: { userAgent: "zoom-arrow-regression" },
    KSIZE_RUNTIME_CONFIG: {
      assetBaseUrl: "https://example.test/",
      lockedStudyVersion: "teacher-classmate-preview",
      lockedDataStudyVersion: "chs-v80-balanced-assignment",
      zoomIntroOutroVersion: deckVersion,
    },
    addEventListener() {},
    setTimeout: (callback) => { timers.push(callback); return timers.length; },
    clearTimeout() {},
    getComputedStyle: (node) => ({
      display: node.hidden || node.removed ? "none" : "block",
      visibility: "visible",
    }),
    opener: { closed: false, postMessage: (message) => messages.push(message) },
    parent: null,
  };
  const browserStorage = (values, failure) => ({
    getItem: (key) => {
      if (failure === "blocked") throw new Error("SecurityError: browser storage is blocked");
      return values.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (failure) throw new Error(failure === "quota" ? "QuotaExceededError: browser storage is full" : "SecurityError: browser storage is blocked");
      values.set(key, value);
    },
  });
  const context = vm.createContext({
    window, document, navigator: window.navigator, URL, URLSearchParams, Date, Math, Uint32Array,
    performance: { now: () => 100 }, console, CSS: { escape: (value) => value },
    setTimeout: window.setTimeout, clearTimeout() {},
    localStorage: browserStorage(storage, localStorageFailure),
    sessionStorage: browserStorage(sessionStore, sessionStorageFailure),
    fetch: async (resource) => {
      const filename = path.basename(new URL(resource, url).pathname);
      if (!manifestCache.has(filename)) manifestCache.set(filename, JSON.parse(fs.readFileSync(path.join(manifestRoot, filename), "utf8")));
      return { ok: true, json: async () => manifestCache.get(filename) };
    },
    initJsPsych: (options) => { finishOptions = options; return jsPsych; },
    jsPsychHtmlButtonResponse: "button-response", jsPsychPreload: "preload",
  });
  vm.runInContext(helper, context, { filename: "zoom-slides.js" });
  const runnable = source.replace(/\nmain\(\)\.catch\([\s\S]*$/, "");
  vm.runInContext(`${runnable}\n globalThis.__main=main;
    globalThis.__inspect=()=>({currentSessionParams,facilitatorAssignmentSummary,totalPreviewScreens,currentPreviewIndex,facilitatorRestoredRowCount,facilitatorStudyFinished});`, context);
  try {
    await context.__main();
  } catch (error) {
    error.testRuntime = { rows, messages, timeline };
    throw error;
  }
  return {
    context, jsPsych, storage, sessionStore, rows, messages, window, body, document,
    get timeline() { return timeline; },
    inspect: () => plain(context.__inspect()),
    load(index) {
      stage.replaceChildren(...parseStimulus(timeline[index].stimulus));
      jsPsych.active = index;
      timeline[index].on_load?.();
    },
    flushTimers() {
      for (let budget = 1000; timers.length && budget > 0; budget -= 1) timers.shift()();
      assert.equal(timers.length, 0, "timer queue should settle");
    },
    arrow(direction) { return document.querySelector(`.ksize-zoom-${direction}`); },
  };
}

function imagesIn(stimulus = "") {
  return [...stimulus.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/g)].map((match) => match[1]);
}

function taskShape(run, { simplifyZoomBaseline = false } = {}) {
  const timeline = simplifyZoomBaseline
    ? run.timeline.filter((node) => node.data?.slide_kind !== "followup_transition")
    : run.timeline;
  return plain(timeline.map((node, index) => ({
    type: node.type,
    data: simplifyZoomBaseline && node.data
      ? { ...node.data, preview_index: index - 1 }
      : node.data,
    stimulus: simplifyZoomBaseline && node.stimulus
      ? node.stimulus.replace(/<div class="ksize-rating-focus">[^<]*<\/div>/g, "")
      : node.stimulus,
    choices: node.choices,
    preloadImages: node.images,
    stimulusImages: imagesIn(node.stimulus),
    answers: parseStimulus(node.stimulus).filter((node) => node.classList.contains("ksize-char-btn") || node.classList.contains("ksize-rating-choice"))
      .map((node) => ({ text: node.textContent, label: node.getAttribute("aria-label"), choiceIndex: node.dataset.choiceIndex, ratingIndex: node.dataset.ratingIndex })),
  })));
}

const apiBefore = apiFrom(baselineFile("screen-share-study/zoom-review.js"), "FTCRenditionReview");
const apiAfter = apiFrom(currentFile("screen-share-study/zoom-review.js"), "FTCRenditionReview");
const entries = Array.from(apiAfter.renditionEntries());
assert.equal(entries.length, 96);
assert.deepEqual(plain(entries), plain(apiBefore.renditionEntries()), "all 96 versions, colors, rating plans and seeds must remain unchanged");
const allKinds = new Set();
let screenCount = 0;
for (const entry of entries) {
  const beforeUrl = apiBefore.buildStudyUrl(entry, "https://example.test/screen-share-study/zoom-review.html", "zoom", "ARROWS");
  const afterUrl = apiAfter.buildStudyUrl(entry, "https://example.test/screen-share-study/zoom-review.html", "zoom", "ARROWS");
  assert.equal(afterUrl.pathname, `/${zoomPrefix}/index.html`);
  assert.equal(afterUrl.searchParams.get("v"), "zoom-likert-choices-2026-10-22", `${entry.id}: fresh previews use the current Zoom choice treatment`);
  const testingUrl = apiAfter.buildTestingLaunchUrl(entry, "https://example.test/screen-share-study/zoom-review.html");
  assert.equal(testingUrl.searchParams.get("v"), "zoom-likert-choices-2026-10-22", `${entry.id}: workbook launch links refresh the Zoom launcher`);
  const scientificUrl = new URL(afterUrl);
  scientificUrl.searchParams.delete("v");
  assert.equal(scientificUrl.toString(), beforeUrl.toString(), `${entry.id}: assigned URL must not change apart from the cache-refresh parameter`);
  const before = await runtime(sourceBefore, beforeUrl, { helper: helperBefore });
  const after = await runtime(sourceAfter, afterUrl);
  const removedTransitions = before.timeline.filter((node) => node.data?.slide_kind === "followup_transition").length;
  assert.ok(removedTransitions > 0, `${entry.id}: baseline contains the intentionally removed transition screens`);
  assert.equal(after.timeline.filter((node) => node.data?.slide_kind === "followup_transition").length, 0, `${entry.id}: Zoom must go directly from helper choice to the rating pair introduction`);
  assert.equal(after.timeline.length, before.timeline.length - removedTransitions, `${entry.id}: only followup transition screens may be removed`);
  assert.equal(after.timeline.some((node) => /class="ksize-rating-focus"/.test(node.stimulus || "")), false, `${entry.id}: redundant rating-focus banners must not render in Zoom`);
  assert.deepEqual(taskShape(after), taskShape(before, { simplifyZoomBaseline: true }), `${entry.id}: all remaining scientific timeline data, pair introductions, screenshots, questions and answer options must remain identical`);
  const beforeInspection = before.inspect();
  beforeInspection.totalPreviewScreens -= removedTransitions;
  assert.deepEqual(after.inspect(), beforeInspection, `${entry.id}: actual assignments and pair schedules must not change`);
  for (let index = 1; index < after.timeline.length; index += 1) {
    after.load(index);
    const node = after.timeline[index];
    allKinds.add(node.data.slide_kind);
    screenCount += 1;
    assert.ok(after.body.classList.contains("ksize-zoom-arrow-navigation"), `${entry.id}/${index}: Zoom body gate is required`);
    assert.equal(after.document.querySelectorAll(".ksize-zoom-navigation").length, 1, `${entry.id}/${index}: one navigation group only`);
    assert.equal(after.document.querySelectorAll(".ksize-researcher-tools").length, 0, `${entry.id}/${index}: upper-right researcher controls must not mount`);
    assert.ok(after.arrow("start"), `${entry.id}/${index}: Start exists`);
    assert.ok(after.arrow("back"), `${entry.id}/${index}: Back exists`);
    assert.ok(after.arrow("forward"), `${entry.id}/${index}: Forward exists`);
    assert.ok(after.arrow("end"), `${entry.id}/${index}: End exists`);
    assert.deepEqual(after.document.querySelector(".ksize-zoom-navigation").children.map((node) => node.textContent), ["Start", "←", "→", "End"], `${entry.id}/${index}: controls are ordered Start, Back, Forward, End`);
    assert.equal(after.arrow("start").disabled, index === 1, `${entry.id}/${index}: Start is disabled only on the first screen`);
    assert.equal(after.arrow("back").disabled, index === 1, `${entry.id}/${index}: Back is disabled only on the first screen`);
    assert.equal(after.arrow("end").disabled, index === after.timeline.length - 1, `${entry.id}/${index}: End is disabled only on the final screen`);
  }
  // Exercise both new bounds for every assigned version. End previews the last
  // certificate screen; it is not equivalent to completing/submitting the study.
  after.load(2);
  const earlier = { preview_index: 0, response: "retain_before_end", nested: { value: 0 } };
  after.rows.push(plain(earlier));
  const rowsBeforeEnd = plain(after.rows);
  const lastPreview = after.inspect().totalPreviewScreens - 1;
  const oldAssignment = assignmentWithoutRecovery(after);
  after.arrow("end").click();
  assertNavigationDisabled(after, `${entry.id}: End`);
  assert.equal(after.inspect().facilitatorStudyFinished, false, `${entry.id}: End must not finish the session`);
  assert.deepEqual(plain(after.rows), rowsBeforeEnd, `${entry.id}: End must not create a choice, rating or completion row`);
  assert.equal(after.messages.some((message) => message.type === "GAME_COMPLETE"), false, `${entry.id}: End must not submit/complete the study`);
  const endUrl = new URL(after.window.location.href);
  assert.equal(Number(endUrl.searchParams.get("previewIndex")), lastPreview, `${entry.id}: End jumps to the last screen`);
  const atEnd = await runtime(sourceAfter, endUrl, { storage: after.storage, sessionStore: after.sessionStore });
  assert.deepEqual(assignmentWithoutRecovery(atEnd), oldAssignment, `${entry.id}: End preserves the assigned version and rating plan`);
  assert.equal(atEnd.timeline[1].data.zoom_deck_slide_id, "certificate", `${entry.id}: End destination is the final certificate, not completion`);
  assert.equal(atEnd.timeline[1].data.preview_index, lastPreview);
  assert.equal(atEnd.rows.length, rowsBeforeEnd.length, `${entry.id}: End preserves earlier responses without inventing skipped responses`);
  assert.equal(atEnd.rows[0].response, earlier.response);
  atEnd.load(1);
  assert.equal(atEnd.arrow("end").disabled, true);
  assert.equal(atEnd.arrow("start").disabled, false);
  atEnd.arrow("start").click();
  assertNavigationDisabled(atEnd, `${entry.id}: Start`);
  const startUrl = new URL(atEnd.window.location.href);
  assert.equal(startUrl.searchParams.get("previewIndex"), "0", `${entry.id}: Start jumps to the first screen`);
  assert.equal(startUrl.searchParams.has("resumeBackupKey"), false, `${entry.id}: Start must not resurrect old answers`);
  assert.equal(startUrl.searchParams.has("expectedResumeRows"), false);
  const atStart = await runtime(sourceAfter, startUrl, { storage: after.storage, sessionStore: after.sessionStore });
  assert.deepEqual(assignmentWithoutRecovery(atStart), oldAssignment, `${entry.id}: Start preserves the assigned version and rating plan`);
  assert.equal(atStart.timeline[1].data.zoom_deck_slide_id, "welcome");
  assert.equal(atStart.rows.length, 0, `${entry.id}: restarting allows fresh responses rather than retaining stale answers`);
}

function assertNavigationDisabled(run, label) {
  for (const direction of ["start", "back", "forward", "end"]) {
    assert.equal(run.arrow(direction).disabled, true, `${label}: all navigation controls disable after a successful click`);
  }
}

// The same isolated app must retain its old behavior if Zoom's exact gate is off.
const exampleUrl = apiAfter.buildStudyUrl(entries[0], "https://example.test/screen-share-study/zoom-review.html", "zoom", "INTERACTION");
for (const variant of ["no-facilitator", "no-live-share", "no-deck-version"]) {
  const url = new URL(exampleUrl);
  if (variant === "no-facilitator") url.searchParams.delete("facilitator");
  if (variant === "no-live-share") url.searchParams.delete("liveShare");
  const options = variant === "no-deck-version" ? { deckVersion: "" } : {};
  const before = await runtime(sourceBefore, url, { ...options, helper: helperBefore });
  const after = await runtime(sourceAfter, url, options);
  assert.deepEqual(taskShape(after), taskShape(before), `${variant}: scientific/non-Zoom timeline must stay unchanged`);
  assert.deepEqual(after.inspect(), before.inspect(), `${variant}: assignments stay unchanged`);
  // Only run a silent facilitator callback here, not the CHS audio promise chain.
  if (variant !== "no-facilitator") {
    after.load(1);
    assert.equal(after.document.querySelectorAll(".ksize-zoom-navigation").length, 0, `${variant}: arrow pair must not mount`);
    assert.equal(after.body.classList.contains("ksize-zoom-arrow-navigation"), false);
  }
}

const nativeRun = await runtime(sourceAfter, exampleUrl);
for (const kind of ["zoom_intro", "child_welcome", "intro", "story"]) {
  const index = nativeRun.timeline.findIndex((node) => node.data?.slide_kind === kind);
  if (index < 0) continue; // Intro renderer uses distinct kind names across versions.
  nativeRun.load(index);
  const previousCount = nativeRun.rows.length;
  nativeRun.arrow("forward").click();
  nativeRun.flushTimers();
  assertNavigationDisabled(nativeRun, `${kind}: Forward`);
  assert.equal(nativeRun.rows.length, previousCount + 1, `${kind}: Forward must advance exactly once`);
  assert.notEqual(nativeRun.rows.at(-1).researcher_navigation, "forward", `${kind}: Forward uses the native advance callback when one exists`);
  assert.equal(nativeRun.rows.at(-1).researcher_skip, undefined, `${kind}: do not mark native forward as researcher Skip`);
}

for (const kind of ["response_choices", "response"]) {
  const run = await runtime(sourceAfter, exampleUrl);
  const index = run.timeline.findIndex((node) => node.data?.slide_kind === kind);
  assert.ok(index > 0, `${kind}: real answer screen must exist`);
  run.load(index);
  run.arrow("forward").click();
  run.flushTimers();
  assertNavigationDisabled(run, `${kind}: Forward`);
  const row = run.rows.at(-1);
  assert.equal(row.researcher_navigation, "forward", `${kind}: explicit forward navigation is recorded`);
  assert.equal(row.response_missing, true, `${kind}: a bypassed answer must be marked missing`);
  for (const key of ["researcher_skip", "choice_index", "choice_id", "choice_label", "rating_value", "rating_label"]) {
    assert.equal(row[key], undefined, `${kind}: Forward must not invent ${key}`);
  }
  const count = run.rows.length;
  run.arrow("forward").click();
  run.flushTimers();
  assert.equal(run.rows.length, count, `${kind}: repeat/double click must not append duplicate answers`);
}

function assignmentWithoutRecovery(run) {
  const value = run.inspect().facilitatorAssignmentSummary;
  delete value.restoredRowCount;
  return value;
}

async function backAndReanswer(kind, answerClass, firstOption, changedOption) {
  const run = await runtime(sourceAfter, exampleUrl);
  const answerIndex = run.timeline.findIndex((node) => node.data?.slide_kind === kind);
  const answerPreview = run.timeline[answerIndex].data.preview_index;
  run.rows.push({ preview_index: 0, response: "earlier_intro" });
  run.load(answerIndex);
  const answers = run.document.querySelectorAll(answerClass);
  assert.ok(answers.length >= 2, `${kind}: actual answer controls remain available`);
  const changedOptionText = answers[changedOption].getAttribute("aria-label") || answers[changedOption].textContent.trim();
  answers[firstOption].click();
  run.flushTimers();
  const firstAnswer = plain(run.rows.at(-1));
  run.rows.push({ preview_index: answerPreview + 8, response: "stale_future_answer" });
  run.load(answerIndex + 1);
  run.arrow("back").click();
  assertNavigationDisabled(run, `${kind}: Back`);
  const navigation = new URL(run.window.location.href);
  assert.equal(Number(navigation.searchParams.get("previewIndex")), answerPreview, `${kind}: Back returns to the immediately prior question`);
  assert.equal(navigation.searchParams.get("researcherJump"), "1");
  assert.equal(navigation.searchParams.get("expectedResumeRows"), "1", `${kind}: retain only rows preceding destination`);
  for (const key of ["seed", "roleSet", "set", "event", "primaryCell", "ratingPlan", "visualPlan", "assignmentId", "session_id"]) {
    assert.equal(navigation.searchParams.get(key), exampleUrl.searchParams.get(key), `${kind}: ${key} must survive Back`);
  }
  const resumed = await runtime(sourceAfter, navigation, { storage: run.storage, sessionStore: run.sessionStore });
  assert.deepEqual(assignmentWithoutRecovery(resumed), assignmentWithoutRecovery(run), `${kind}: Back must not reassign colors, events, sides or rating pairs`);
  assert.equal(resumed.timeline[1].data.preview_index, answerPreview);
  assert.equal(resumed.rows.length, 1);
  assert.equal(resumed.inspect().facilitatorRestoredRowCount, 1);
  resumed.load(1);
  resumed.document.querySelectorAll(answerClass)[changedOption].click();
  resumed.flushTimers();
  const rowsForQuestion = resumed.rows.filter((row) => row.preview_index === answerPreview);
  assert.equal(rowsForQuestion.length, 1, `${kind}: re-answer must replace, not duplicate, old answer`);
  const result = rowsForQuestion[0];
  assert.equal(result.response, changedOption);
  assert.notEqual(result.response, firstAnswer.response);
  assert.equal(result.response_missing, false);
  assert.equal(resumed.rows.some((row) => row.response === "stale_future_answer"), false, `${kind}: stale later answers must be discarded`);
  if (kind === "response_choices") {
    resumed.load(2);
    assert.equal(resumed.timeline[2].data.slide_kind, "intro", "the actual rating-pair introduction must immediately follow the helper choice");
    assert.ok(resumed.timeline[2].data.dyad_script_key, "the retained introduction identifies the assigned rating pair");
    assert.equal(resumed.document.querySelector("[data-followup-choice]"), null, "the removed choice-confirmation screen must not be mounted");
    assert.equal(result.choice_label, changedOptionText, "stored helper choice must reflect the newly selected answer");
    assert.deepEqual(plain(resumed.timeline.slice(2).map((node) => node.data.dyad_script_key)), plain(run.timeline.slice(answerIndex + 1).map((node) => node.data.dyad_script_key)), "re-answer must not change any assigned rating pair");
  } else {
    assert.equal(result.rating_value, changedOption + 1);
    assert.notEqual(result.rating_label, firstAnswer.rating_label);
    assert.equal(result.dyad_id, firstAnswer.dyad_id);
    assert.equal(result.trait, firstAnswer.trait);
  }
  const invalid = new URL(navigation);
  invalid.searchParams.set("expectedResumeRows", "999");
  await assert.rejects(runtime(sourceAfter, invalid, { storage: run.storage, sessionStore: run.sessionStore }), /Recovery stopped/, `${kind}: invalid restore must fail closed`);
}

await backAndReanswer("response_choices", ".ksize-char-btn", 0, 1);
await backAndReanswer("response", ".ksize-rating-choice", 0, 2);

async function verifyBackCheckpoint({
  withoutParticipantId = false,
  pendingPersistence = false,
  localStorageFailure = "",
  sessionStorageFailure = "",
} = {}) {
  const url = new URL(exampleUrl);
  if (withoutParticipantId) url.searchParams.delete("pid");
  const run = await runtime(sourceAfter, url, { localStorageFailure, sessionStorageFailure });
  const answerIndex = run.timeline.findIndex((node) => node.data?.slide_kind === "response_choices");
  const answerPreview = run.timeline[answerIndex].data.preview_index;
  const earlierRow = { preview_index: 0, response: "earlier_intro", retained_fields: { label: "Do not change", values: [0, false, ""] } };
  run.rows.push(plain(earlierRow));
  run.load(answerIndex);
  run.document.querySelectorAll(".ksize-char-btn")[0].click();
  run.load(answerIndex + 1);
  // The real bridge schedules persistence after clicks. Leave the existing
  // data-update/state timers queued to reproduce a slow-navigation handoff.
  if (!pendingPersistence) run.flushTimers();
  run.arrow("back").click();
  assertNavigationDisabled(run, "Back checkpoint");
  const navigation = new URL(run.window.location.href);
  const backupKey = navigation.searchParams.get("resumeBackupKey");
  assert.ok(backupKey, "Back with earlier responses must have a recovery checkpoint");
  assert.equal(navigation.searchParams.get("expectedResumeRows"), "1");
  assert.equal(Number(navigation.searchParams.get("previewIndex")), answerPreview);
  const checkpointStore = backupKey.startsWith("who-will-help-navigation-session:") ? run.sessionStore : run.storage;
  assert.equal(backupKey.startsWith("who-will-help-navigation-session:"), !sessionStorageFailure, "Back prefers tab storage and explicitly names the selected store");
  const checkpoint = checkpointStore.get(backupKey);
  assert.equal(JSON.parse(checkpoint).zoom_navigation_version, "zoom-streamlined-ratings-v2", "new checkpoints identify their exact Zoom screen order");
  assert.deepEqual(JSON.parse(checkpoint).rows, [earlierRow], "Back checkpoint contains only full, unmodified rows preceding the destination");
  if (pendingPersistence) {
    run.flushTimers();
    assert.equal(checkpointStore.get(backupKey), checkpoint, "pending progress/state publication cannot overwrite the truncated navigation checkpoint");
    const regularKey = `who-will-help-data:${navigation.searchParams.get("session_id")}`;
    assert.notEqual(backupKey, regularKey, "navigation recovery must use a key isolated from ordinary progress saves");
    if (!localStorageFailure) assert.equal(JSON.parse(run.storage.get(regularKey)).rows.length, 2, "fixture actually runs the pending untruncated progress save");
  }
  // A stale checkpoint in the unselected store must never override the current
  // checkpoint identified in the URL, even if its row count happens to match.
  const otherStore = checkpointStore === run.storage ? run.sessionStore : run.storage;
  const otherKey = checkpointStore === run.storage
    ? `who-will-help-navigation-session:${navigation.searchParams.get("session_id")}`
    : `who-will-help-data:${navigation.searchParams.get("session_id")}:navigation`;
  otherStore.set(otherKey, JSON.stringify({ ...JSON.parse(checkpoint), rows: [{ preview_index: 0, response: "stale_other_store" }] }));
  const resumed = await runtime(sourceAfter, navigation, {
    storage: run.storage, sessionStore: run.sessionStore, localStorageFailure, sessionStorageFailure,
  });
  assert.equal(resumed.inspect().facilitatorRestoredRowCount, 1, "Back restores correctly with or without an explicit participant ID");
  assert.equal(resumed.timeline[1].data.preview_index, answerPreview);
  const restored = plain(resumed.rows[0]);
  delete restored.facilitator_restored_from_backup;
  assert.deepEqual(restored, earlierRow, "recovery preserves every original response field");
  assert.deepEqual(assignmentWithoutRecovery(resumed), assignmentWithoutRecovery(run), "recovery leaves the assigned version and rating plan unchanged");
}

await verifyBackCheckpoint({ pendingPersistence: true });
await verifyBackCheckpoint({ withoutParticipantId: true });
await verifyBackCheckpoint({ localStorageFailure: "blocked", pendingPersistence: true });
await verifyBackCheckpoint({ localStorageFailure: "quota", withoutParticipantId: true });
await verifyBackCheckpoint({ sessionStorageFailure: "blocked", pendingPersistence: true });

// Current-format regular local backups remain readable; their version marker
// protects saved indices just as it does for session/local navigation backups.
const legacyRun = await runtime(sourceAfter, exampleUrl);
const legacyIndex = legacyRun.timeline.findIndex((node) => node.data?.slide_kind === "response_choices");
legacyRun.rows.push({ preview_index: 0, response: "legacy_local_intro" });
legacyRun.load(legacyIndex);
legacyRun.flushTimers();
const legacyKey = `who-will-help-data:${exampleUrl.searchParams.get("session_id")}`;
assert.ok(legacyRun.storage.has(legacyKey), "legacy progress fixture was saved by the existing persistence handler");
const legacyUrl = new URL(exampleUrl);
legacyUrl.searchParams.set("previewIndex", String(legacyRun.timeline[legacyIndex].data.preview_index));
legacyUrl.searchParams.set("resumeBackupKey", legacyKey);
legacyUrl.searchParams.set("expectedResumeRows", "1");
const legacyResumed = await runtime(sourceAfter, legacyUrl, { storage: legacyRun.storage });
assert.equal(legacyResumed.rows[0].response, "legacy_local_intro");
assert.equal(legacyResumed.inspect().facilitatorRestoredRowCount, 1);

// A saved index from the old timeline is not interchangeable with the revised
// screen order, even when participant, seed and row count all match. Refuse it
// before importing any answer, leave its original bytes intact, and fail closed.
for (const oldVersion of [undefined, "zoom-before-streamlined-ratings-v1"]) {
  for (const storageKind of ["session", "local-navigation", "local-regular"]) {
    const sessionStore = new Map();
    const storage = new Map();
    const store = storageKind === "session" ? sessionStore : storage;
    const session = exampleUrl.searchParams.get("session_id");
    const key = storageKind === "session"
      ? `who-will-help-navigation-session:${session}`
      : `who-will-help-data:${session}${storageKind === "local-navigation" ? ":navigation" : ""}`;
    const payload = {
      participant_id: exampleUrl.searchParams.get("pid"),
      seed: exampleUrl.searchParams.get("seed"),
      rows: [{ preview_index: 0, response: "old_screen_answer_do_not_import" }],
      ...(oldVersion ? { zoom_navigation_version: oldVersion } : {}),
    };
    const serialized = JSON.stringify(payload);
    store.set(key, serialized);
    const oldUrl = new URL(exampleUrl);
    oldUrl.searchParams.set("previewIndex", "16");
    oldUrl.searchParams.set("resumeBackupKey", key);
    oldUrl.searchParams.set("expectedResumeRows", "1");
    await assert.rejects(runtime(sourceAfter, oldUrl, { storage, sessionStore }), (error) => {
      assert.match(error.message, /older screen order and cannot safely resume.*saved answers have not been changed.*fresh version from the Zoom testing menu/);
      assert.equal(error.testRuntime.rows.length, 0, "outdated checkpoint must fail before importing any saved row");
      assert.equal(error.testRuntime.timeline.length, 0, "outdated checkpoint must not run any study screen");
      assert.equal(error.testRuntime.messages.find((message) => message.type === "FACILITATOR_RECOVERY_FAILED")?.reason, "zoom_navigation_version_mismatch");
      return true;
    }, `${storageKind}: missing/old screen-order marker must fail closed`);
    assert.equal(store.get(key), serialized, "rejecting an old checkpoint must not delete or alter the saved original");
  }
}

// The marker belongs only to revised Zoom recovery. Non-Zoom facilitator saves
// keep their existing restore behavior even when they have no Zoom marker.
const nonZoomUrl = new URL(exampleUrl);
nonZoomUrl.searchParams.delete("liveShare");
const nonZoomPayload = JSON.parse(legacyRun.storage.get(legacyKey));
delete nonZoomPayload.zoom_navigation_version;
const nonZoomStorage = new Map([[legacyKey, JSON.stringify(nonZoomPayload)]]);
nonZoomUrl.searchParams.set("previewIndex", "16");
nonZoomUrl.searchParams.set("resumeBackupKey", legacyKey);
nonZoomUrl.searchParams.set("expectedResumeRows", "1");
const nonZoomResumed = await runtime(sourceAfter, nonZoomUrl, { storage: nonZoomStorage });
assert.equal(nonZoomResumed.rows[0].response, "legacy_local_intro", "non-Zoom recovery must remain backward-compatible");

// If both stores are unavailable, do not reload with unverifiable/unsaved data,
// disable the controls, discard answers, or fail silently. A retry is allowed.
const blocked = await runtime(sourceAfter, exampleUrl, { localStorageFailure: "quota", sessionStorageFailure: "blocked" });
const blockedIndex = blocked.timeline.findIndex((node) => node.data?.slide_kind === "response_choices");
blocked.rows.push({ preview_index: 0, response: "keep_this_answer" });
blocked.load(blockedIndex + 1);
const beforeBlockedRows = plain(blocked.rows);
const beforeBlockedUrl = blocked.window.location.href;
blocked.arrow("back").click();
assert.equal(blocked.window.location.href, beforeBlockedUrl, "failed checkpoint cannot navigate or lose the current page");
assert.deepEqual(plain(blocked.rows), beforeBlockedRows, "failed checkpoint cannot mutate the current answers");
assert.equal(blocked.arrow("back").disabled, false, "Back remains available for retry");
assert.equal(blocked.arrow("forward").disabled, false, "Forward remains available");
assert.equal(blocked.arrow("start").disabled, false, "Start remains available");
assert.equal(blocked.arrow("end").disabled, false, "End remains available");
assert.match(blocked.document.querySelector(".ksize-zoom-navigation-error")?.textContent || "", /Back could not save.*answers are unchanged/);
assert.equal(blocked.document.querySelector(".ksize-zoom-navigation-error").getAttribute("role"), "alert");
blocked.arrow("back").click();
assert.equal(blocked.document.querySelectorAll(".ksize-zoom-navigation-error").length, 1, "retry must not duplicate the recovery message");
blocked.arrow("end").click();
assert.equal(blocked.window.location.href, beforeBlockedUrl, "End cannot navigate when both stores fail and earlier answers need saving");
assert.deepEqual(plain(blocked.rows), beforeBlockedRows, "failed End preserves every current answer");
for (const direction of ["start", "back", "forward", "end"]) {
  assert.equal(blocked.arrow(direction).disabled, false, `failed End leaves ${direction} available for retry`);
}
assert.match(blocked.document.querySelector(".ksize-zoom-navigation-error")?.textContent || "", /End could not save.*answers are unchanged/);
assert.equal(blocked.document.querySelectorAll(".ksize-zoom-navigation-error").length, 1, "failed End replaces, rather than duplicates, an earlier navigation error");
blocked.arrow("start").click();
assert.equal(new URL(blocked.window.location.href).searchParams.get("previewIndex"), "0", "Start works even if both stores are blocked");
assertNavigationDisabled(blocked, "storage-independent Start");
blocked.load(2);
blocked.arrow("back").click();
assert.equal(new URL(blocked.window.location.href).searchParams.get("previewIndex"), "0", "returning to the first screen does not require storage");

for (const failure of [
  { localStorageFailure: "blocked", sessionStorageFailure: "" },
  { localStorageFailure: "quota", sessionStorageFailure: "" },
  { localStorageFailure: "", sessionStorageFailure: "blocked" },
]) {
  const run = await runtime(sourceAfter, exampleUrl, failure);
  const answerIndex = run.timeline.findIndex((node) => node.data?.slide_kind === "response_choices");
  const oldRows = [
    { preview_index: 0, response: "intro_before_end", nested: { value: false } },
    { preview_index: run.timeline[answerIndex].data.preview_index, choice_id: "actual_answer_before_end", response: 1 },
  ];
  run.rows.push(...plain(oldRows));
  run.load(answerIndex + 1);
  run.arrow("end").click();
  assertNavigationDisabled(run, "End storage fallback");
  const destination = new URL(run.window.location.href);
  assert.equal(destination.searchParams.get("expectedResumeRows"), "2", "End retains every earlier completed answer");
  assert.equal(Number(destination.searchParams.get("previewIndex")), run.inspect().totalPreviewScreens - 1);
  const backupKey = destination.searchParams.get("resumeBackupKey");
  assert.equal(backupKey.startsWith("who-will-help-navigation-session:"), !failure.sessionStorageFailure);
  run.flushTimers();
  const resumed = await runtime(sourceAfter, destination, { ...failure, storage: run.storage, sessionStore: run.sessionStore });
  assert.equal(resumed.timeline[1].data.zoom_deck_slide_id, "certificate");
  const restored = plain(resumed.rows).map(({ facilitator_restored_from_backup, ...row }) => row);
  assert.deepEqual(restored, oldRows, "End storage fallback preserves original answers and no skipped answers");
  assert.equal(resumed.inspect().facilitatorStudyFinished, false);
  assert.equal(resumed.messages.some((message) => message.type === "GAME_COMPLETE"), false);
}

const complete = await runtime(sourceAfter, exampleUrl);
complete.load(complete.timeline.length - 1);
assert.equal(complete.arrow("back").disabled, false);
assert.equal(complete.arrow("start").disabled, false);
assert.equal(complete.arrow("end").disabled, true);
complete.arrow("forward").click();
complete.flushTimers();
await complete.jsPsych.completion;
assert.equal(complete.inspect().facilitatorStudyFinished, true, "final Forward completes the actual study");
const completion = complete.messages.filter((message) => message.type === "GAME_COMPLETE");
assert.equal(completion.length, 1, "normal completion must fire exactly once");
assert.equal(completion[0].ended_early, false);
const saved = JSON.parse(complete.storage.get(completion[0].backup_key));
assert.equal(saved.completion_status, "completed");
assert.equal(saved.rows.at(-1).response, "finish_zoom_slides", "last Forward must use native final-slide completion");

const css = currentFile(`${zoomPrefix}/zoom-slides.css`);
const choiceCss = currentFile(`${zoomPrefix}/zoom-choice-effects.css`);
const approvedChoiceCss = currentFile(`${zoomPrefix}/likert-style-choice-preview.css`);
assert.equal(choiceCss.slice(choiceCss.indexOf("body.")), approvedChoiceCss.slice(approvedChoiceCss.indexOf("body.")).replaceAll("ksize-zoom-likert-choice-preview", "ksize-zoom-choice-effects").replaceAll("ksize-zoom-likert-choice-reveal", "ksize-zoom-choice-reveal"), "production CSS is the approved comparison effect with only scoped names changed");
const zoomHtml = currentFile(`${zoomPrefix}/index.html`);
assert.match(zoomHtml, /<body class="ksize-zoom-choice-effects">/, "regular Zoom entry enables the approved effect");
assert.match(zoomHtml, /zoom-choice-effects\.css\?v=zoom-likert-choices-2026-10-22/, "regular Zoom entry loads the current effect stylesheet");
assert.match(zoomHtml, /app\.js\?v=zoom-likert-choices-2026-10-22/, "regular Zoom entry refreshes guarded recovery code");
assert.match(css, /body\.ksize-zoom-arrow-navigation \.ksize-helper\s*\{[^}]*display:\s*none\s*!important/, "animated helper and bubble are hidden only in isolated Zoom study");
assert.match(css, /body\.ksize-zoom-arrow-navigation[^{}]*\.ksize-researcher-tools[\s\S]*?display:\s*none\s*!important/);
assert.match(css, /body\.ksize-zoom-arrow-navigation[^{}]*\.ksize-next-btn[\s\S]*?display:\s*none\s*!important/);
assert.match(css, /body\.ksize-zoom-arrow-navigation[^{}]*\.ksize-zoom-slide-next[\s\S]*?display:\s*none\s*!important/);
assert.match(css, /\.ksize-zoom-navigation/);
assert.match(css, /focus-visible/);
assert.match(css, /\.ksize-zoom-navigation\s*\{[^}]*position:\s*static[^}]*align-self:\s*center[^}]*margin:\s*0 auto/, "arrows stay centered in their original below-slide control slot");
assert.match(css, /\.ksize-zoom-navigation button\s*\{[^}]*background:\s*#176d57[^}]*color:\s*#fff/, "arrows retain the original green button format");
assert.match(sourceAfter, /const controls = document\.querySelector\("\.ksize-zoom-slide-controls, \.ksize-controls"\)/, "arrows replace Next in the original controls area");
assert.doesNotMatch(css, /body\.ksize-zoom-arrow-navigation > \.jspsych-content-wrapper/, "no separate footer scroll pane");
assert.match(css, /\.ksize-controls:has\(> \.ksize-zoom-navigation\)\s*\{[^}]*min-height:\s*0/, "no inherited 72px empty control gap");
assert.match(css, /body\.ksize-zoom-arrow-navigation \.ksize-welcome-screen > \.ksize-child-turn-badge,[\s\S]*?\.ksize-welcome-screen:has\(> \.ksize-child-turn-badge\) > \.ksize-controls:has\(> \.ksize-zoom-navigation\)\s*\{[^}]*margin-top:\s*auto/, "child Welcome navigation uses the same lower content edge as story pages without moving other welcome-style screens");

console.log(JSON.stringify({
  status: "PASS",
  baselineRevision: BASELINE_REVISION,
  versions: entries.length,
  screensChecked: screenCount,
  slideKinds: [...allKinds].sort(),
  sharedChsFilesByteIdentical: immutableFiles.length,
  verified: ["assignment/remaining-timeline identity", "Zoom-only removal of followup transition screens and redundant rating-focus banners", "retained pair introductions, rating images, questions and answer options", "Start/Back/Forward/End on every Zoom screen", "Start/End bounds disabled correctly", "all-version Start/End assignment identity", "Start clears stale responses without needing browser storage", "End previews certificate without completion or invented answers", "End storage fallback and fail-safe", "all four controls disable after successful navigation", "no upper-right toolbar", "native forward semantics", "missing-answer forward", "double-click guard", "Back/recovery", "session-first navigation checkpoint", "blocked/full local storage recovery", "blocked session storage fallback", "both stores blocked visible error without data loss", "selected-store isolation from stale checkpoints", "current-format local/session checkpoint recovery", "missing/old Zoom timeline markers rejected before importing answers without changing saved bytes", "non-Zoom unversioned local recovery unchanged", "pending-persistence Back checkpoint isolation", "Back recovery without participant ID", "full restored-row identity", "helper re-answer followed directly by retained rating-pair introduction", "rating re-answer", "pair-plan stability", "invalid-restore protection", "production choice CSS matches approved comparison effect", "all-version launcher/cache refresh", "final completion", "non-Zoom gate compatibility"],
}, null, 2));
