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

async function runtime(source, url, { helper = helperAfter, storage = new Map(), deckVersion = "keynote-v1" } = {}) {
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
  const context = vm.createContext({
    window, document, navigator: window.navigator, URL, URLSearchParams, Date, Math, Uint32Array,
    performance: { now: () => 100 }, console, CSS: { escape: (value) => value },
    setTimeout: window.setTimeout, clearTimeout() {},
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
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
  await context.__main();
  return {
    context, jsPsych, storage, rows, messages, window, body, document,
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

function taskShape(run) {
  return plain(run.timeline.map((node) => ({
    type: node.type,
    data: node.data,
    stimulus: node.stimulus,
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
  assert.equal(afterUrl.toString(), beforeUrl.toString(), `${entry.id}: assigned URL must not change`);
  const before = await runtime(sourceBefore, beforeUrl, { helper: helperBefore });
  const after = await runtime(sourceAfter, afterUrl);
  assert.deepEqual(taskShape(after), taskShape(before), `${entry.id}: scientific timeline data, screenshots, and answer options must not change`);
  assert.deepEqual(after.inspect(), before.inspect(), `${entry.id}: actual assignments and pair schedules must not change`);
  for (let index = 1; index < after.timeline.length; index += 1) {
    after.load(index);
    const node = after.timeline[index];
    allKinds.add(node.data.slide_kind);
    screenCount += 1;
    assert.ok(after.body.classList.contains("ksize-zoom-arrow-navigation"), `${entry.id}/${index}: Zoom body gate is required`);
    assert.equal(after.document.querySelectorAll(".ksize-zoom-navigation").length, 1, `${entry.id}/${index}: one navigation pair only`);
    assert.equal(after.document.querySelectorAll(".ksize-researcher-tools").length, 0, `${entry.id}/${index}: upper-right researcher controls must not mount`);
    assert.ok(after.arrow("back"), `${entry.id}/${index}: Back exists`);
    assert.ok(after.arrow("forward"), `${entry.id}/${index}: Forward exists`);
    assert.equal(after.arrow("back").disabled, index === 1, `${entry.id}/${index}: Back is disabled only on the first screen`);
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
for (const kind of ["zoom_intro", "child_welcome", "intro", "story", "followup_transition"]) {
  const index = nativeRun.timeline.findIndex((node) => node.data?.slide_kind === kind);
  if (index < 0) continue; // Intro renderer uses distinct kind names across versions.
  nativeRun.load(index);
  const previousCount = nativeRun.rows.length;
  nativeRun.arrow("forward").click();
  nativeRun.flushTimers();
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
  answers[firstOption].click();
  run.flushTimers();
  const firstAnswer = plain(run.rows.at(-1));
  run.rows.push({ preview_index: answerPreview + 8, response: "stale_future_answer" });
  run.load(answerIndex + 1);
  run.arrow("back").click();
  const navigation = new URL(run.window.location.href);
  assert.equal(Number(navigation.searchParams.get("previewIndex")), answerPreview, `${kind}: Back returns to the immediately prior question`);
  assert.equal(navigation.searchParams.get("researcherJump"), "1");
  assert.equal(navigation.searchParams.get("expectedResumeRows"), "1", `${kind}: retain only rows preceding destination`);
  for (const key of ["seed", "roleSet", "set", "event", "primaryCell", "ratingPlan", "visualPlan", "assignmentId", "session_id"]) {
    assert.equal(navigation.searchParams.get(key), exampleUrl.searchParams.get(key), `${kind}: ${key} must survive Back`);
  }
  const resumed = await runtime(sourceAfter, navigation, { storage: run.storage });
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
    assert.equal(resumed.timeline[2].data.slide_kind, "followup_transition");
    const confirmation = resumed.document.querySelector("[data-followup-choice]");
    assert.ok(confirmation.textContent && confirmation.textContent !== "Thanks for choosing!", "helper confirmation must use the new answer");
    resumed.arrow("forward").click();
    resumed.flushTimers();
    assert.equal(resumed.rows.at(-1).story_choice_label, result.choice_label.toUpperCase(), "helper confirmation must not retain the old answer");
    assert.deepEqual(plain(resumed.timeline.slice(2).map((node) => node.data.dyad_script_key)), plain(run.timeline.slice(answerIndex + 1).map((node) => node.data.dyad_script_key)), "re-answer must not change any assigned rating pair");
  } else {
    assert.equal(result.rating_value, changedOption + 1);
    assert.notEqual(result.rating_label, firstAnswer.rating_label);
    assert.equal(result.dyad_id, firstAnswer.dyad_id);
    assert.equal(result.trait, firstAnswer.trait);
  }
  const invalid = new URL(navigation);
  invalid.searchParams.set("expectedResumeRows", "999");
  await assert.rejects(runtime(sourceAfter, invalid, { storage: run.storage }), /Recovery stopped/, `${kind}: invalid restore must fail closed`);
}

await backAndReanswer("response_choices", ".ksize-char-btn", 0, 1);
await backAndReanswer("response", ".ksize-rating-choice", 0, 2);

const complete = await runtime(sourceAfter, exampleUrl);
complete.load(complete.timeline.length - 1);
assert.equal(complete.arrow("back").disabled, false);
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

console.log(JSON.stringify({
  status: "PASS",
  baselineRevision: BASELINE_REVISION,
  versions: entries.length,
  screensChecked: screenCount,
  slideKinds: [...allKinds].sort(),
  sharedChsFilesByteIdentical: immutableFiles.length,
  verified: ["assignment/timeline identity", "arrows on every Zoom screen", "no upper-right toolbar", "native forward semantics", "missing-answer forward", "double-click guard", "Back/recovery", "helper re-answer/updated confirmation", "rating re-answer", "pair-plan stability", "invalid-restore protection", "final completion", "non-Zoom gate compatibility"],
}, null, 2));
