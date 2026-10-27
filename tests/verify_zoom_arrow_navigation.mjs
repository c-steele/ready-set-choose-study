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
  hasOpener = true,
} = {}) {
  let timeline = [];
  let finishOptions;
  const rows = [];
  let properties = {};
  const timers = [];
  const messages = [];
  const windowHandlers = {};
  const popupMessages = [];
  const openedWindows = [];
  const head = element("head");
  const styleUrls = ["styles.css?test=child", "zoom-slides.css?test=child", "zoom-choice-effects.css?test=child"]
    .map((href) => new URL(href, url).toString());
  styleUrls.forEach((href) => {
    const link = element("link");
    link.setAttribute("rel", "stylesheet");
    link.href = href;
    head.append(link);
  });
  const body = element("body");
  const stage = element("div");
  stage.className = "jspsych-content";
  body.append(stage);
  const document = {
    body, head,
    createElement: (tag) => element(tag),
    addEventListener() {},
    querySelector: (selector) => [...descendants(head), ...descendants(body)].find((node) => node.matches(selector)) || null,
    querySelectorAll: (selector) => [...descendants(head), ...descendants(body)].filter((node) => node.matches(selector)),
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
    addEventListener(name, handler) { (windowHandlers[name] ||= []).push(handler); },
    setTimeout: (callback) => { timers.push(callback); return timers.length; },
    clearTimeout() {},
    getComputedStyle: (node) => ({
      display: node.hidden || node.removed ? "none" : "block",
      visibility: "visible",
    }),
    opener: hasOpener ? { closed: false, postMessage: (message) => messages.push(message) } : null,
    open: (...args) => {
      const popup = { closed: false, focused: false, focus() { this.focused = true; }, postMessage: (message) => popupMessages.push(message) };
      openedWindows.push({ args, popup });
      return popup;
    },
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
    globalThis.__inspect=()=>({currentSessionParams,facilitatorAssignmentSummary,totalPreviewScreens,currentPreviewIndex,facilitatorRestoredRowCount,facilitatorStudyFinished});
    globalThis.__presenterDeck=()=>typeof zoomPresenterDeck === "undefined" ? null : zoomPresenterDeck;
    globalThis.__makePresenterDeck=(nodes)=>makeZoomPresenterDeck(nodes);
    globalThis.__coalesceRows=(rows)=>coalesceZoomNavigatorRows(rows);
    globalThis.__receiveCommand=(message)=>receiveFacilitatorCommand(message);`, context);
  try {
    await context.__main();
  } catch (error) {
    error.testRuntime = { rows, messages, timeline };
    throw error;
  }
  return {
    context, jsPsych, storage, sessionStore, rows, messages, window, body, document, styleUrls, popupMessages, openedWindows,
    get timeline() { return timeline; },
    inspect: () => plain(context.__inspect()),
    deck: () => plain(context.__presenterDeck()),
    makeDeck: (nodes) => plain(context.__makePresenterDeck(nodes)),
    coalesceRows: (rows) => plain(context.__coalesceRows(rows)),
    command: (message) => context.__receiveCommand(message),
    dispatchMessage(data, { origin = url.origin, source = null } = {}) {
      (windowHandlers.message || []).forEach((handler) => handler({ data, origin, source }));
    },
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
  assert.equal(afterUrl.searchParams.get("v"), "zoom-slides-button-2026-10-27", `${entry.id}: fresh previews load the current Zoom slide controls`);
  const testingUrl = apiAfter.buildTestingLaunchUrl(entry, "https://example.test/screen-share-study/zoom-review.html");
  assert.equal(testingUrl.searchParams.get("v"), "zoom-slides-button-2026-10-27", `${entry.id}: workbook launch links refresh the Zoom launcher`);
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
  // The private catalog is a projection of the already assigned timeline. It
  // must never construct a second assignment or run participant trial hooks.
  const deck = after.deck();
  assert.ok(deck, `${entry.id}: Zoom publishes an assigned presenter catalog`);
  assert.equal(deck.version, "zoom-streamlined-ratings-v2");
  assert.deepEqual(deck.navigationCapabilities, { preserveResponses: true }, `${entry.id}: direct navigation advertises explicit answer-preservation support`);
  assert.equal(deck.baseUrl, afterUrl.toString());
  assert.deepEqual(deck.styles, after.styleUrls, `${entry.id}: private previews use this child's exact stylesheet URLs`);
  assert.equal(deck.bodyClass, "ksize-facilitator-child ksize-live-share ksize-zoom-arrow-navigation ksize-zoom-choice-effects");
  assert.equal(deck.slides.length, after.inspect().totalPreviewScreens);
  assert.equal(deck.slides.length, after.timeline.length - 1, `${entry.id}: preload is not a participant preview`);
  deck.slides.forEach((slide, index) => {
    const node = after.timeline[index + 1];
    const data = node.data || {};
    const script = Array.isArray(data.facilitator_script) ? data.facilitator_script : String(data.facilitator_script || "").split(/\n+/);
    assert.deepEqual(slide, {
      index, title: slide.title, storyNumber: data.story_number || null,
      condition: data.condition_pairing || data.condition || "", kind: data.slide_kind || "slide",
      scriptLines: script.map((line) => String(line || "").replace(/\s+/g, " ").trim()).filter(Boolean),
      html: typeof node.stimulus === "string" ? node.stimulus : "",
    }, `${entry.id}/${index}: preview preserves exact assigned images, options, pair, script and order`);
    assert.equal(index, data.preview_index);
    assert.ok(slide.title.trim(), `${entry.id}/${index}: every preview has a readable label`);
  });
  assert.deepEqual([...new Set(deck.slides.filter((slide) => slide.storyNumber).map((slide) => slide.storyNumber))], [1, 2, 3, 4, 5, 6], `${entry.id}: private story navigation follows this child's six-story order`);
  const deckRequestSnapshot = { rows: plain(after.rows), inspect: after.inspect(), url: after.window.location.href,
    local: [...after.storage], session: [...after.sessionStore] };
  after.command({ type: "FACILITATOR_COMMAND", action: "deck", commandId: `${entry.id}-catalog`, facilitatorSession: afterUrl.searchParams.get("facilitatorSession") });
  const published = plain(after.messages.filter((message) => message.type === "FACILITATOR_DECK").at(-1));
  assert.deepEqual(published, { facilitatorSession: afterUrl.searchParams.get("facilitatorSession"), type: "FACILITATOR_DECK", ...deck, currentIndex: after.inspect().currentPreviewIndex }, `${entry.id}: catalog replies include all assigned previews and the live position`);
  assert.deepEqual({ rows: plain(after.rows), inspect: after.inspect(), url: after.window.location.href,
    local: [...after.storage], session: [...after.sessionStore] }, deckRequestSnapshot, `${entry.id}: requesting previews cannot change answers, location, assignment or saved rows`);
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
    assert.deepEqual(after.document.querySelector(".ksize-zoom-navigation").children.map((node) => node.textContent), ["Start", "←", "→", "End", "Slides ↗"], `${entry.id}/${index}: the private navigator follows the original four controls`);
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
  // Actual recorded helper/rating responses must survive a direct rail jump
  // back to the first slide for every fixed assignment, unlike legacy Start.
  const helperIndex = atStart.timeline.findIndex((node) => node.data?.slide_kind === "response_choices");
  const ratingIndex = atStart.timeline.findIndex((node) => node.data?.slide_kind === "response");
  atStart.load(helperIndex);
  atStart.document.querySelectorAll(".ksize-char-btn")[0].click();
  atStart.flushTimers();
  atStart.load(ratingIndex);
  atStart.document.querySelectorAll(".ksize-rating-choice")[0].click();
  atStart.flushTimers();
  const recorded = plain(atStart.rows);
  assert.equal(recorded.length, 2);
  assert.ok(recorded[0].choice_id != null && recorded[1].rating_value === 1);
  atStart.load(atStart.timeline.length - 2);
  const current = atStart.inspect().currentPreviewIndex;
  const directMessage = { type: "FACILITATOR_COMMAND", action: "navigate", facilitatorSession: new URL(atStart.window.location.href).searchParams.get("facilitatorSession"), commandId: `${entry.id}-direct-first`, targetIndex: 0, previewIndex: current, preserveResponses: true };
  atStart.command(directMessage);
  assert.equal(atStart.messages.findLast((message) => message.commandId === directMessage.commandId)?.status, "accepted", `${entry.id}: supported direct Back does not require resetting answers`);
  const directUrl = new URL(atStart.window.location.href);
  assert.equal(directUrl.searchParams.get("navigatorKeepAnswers"), "1");
  assert.equal(directUrl.searchParams.get("previewIndex"), "0");
  assert.equal(directUrl.searchParams.get("expectedResumeRows"), "2");
  const checkpointKey = directUrl.searchParams.get("resumeBackupKey");
  const checkpointStore = checkpointKey.startsWith("who-will-help-navigation-session:") ? atStart.sessionStore : atStart.storage;
  assert.deepEqual(JSON.parse(checkpointStore.get(checkpointKey)).rows, recorded, `${entry.id}: direct slide 1 checkpoints both full actual answers unchanged`);
  assert.deepEqual(plain(atStart.rows), recorded, `${entry.id}: a direct jump itself does not edit the running data collection`);
  const directFirst = await runtime(sourceAfter, directUrl, { storage: atStart.storage, sessionStore: atStart.sessionStore });
  assert.deepEqual(plain(directFirst.rows).map(({ facilitator_restored_from_backup, ...row }) => row), recorded, `${entry.id}: direct first-slide navigation restores every recorded answer`);
  assert.deepEqual(assignmentWithoutRecovery(directFirst), oldAssignment, `${entry.id}: direct first-slide navigation keeps the exact assigned roles, colors, sides and rating plan`);
  assert.deepEqual(directFirst.deck().slides, deck.slides, `${entry.id}: answer-preserving reload retains the exact full scientific deck`);
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
  assert.equal(after.deck(), null, `${variant}: the Zoom-only private catalog is absent`);
  const gateSnapshot = { rows: plain(after.rows), inspect: after.inspect(), url: after.window.location.href };
  after.command({ type: "FACILITATOR_COMMAND", action: "deck", commandId: `${variant}-catalog`, facilitatorSession: url.searchParams.get("facilitatorSession") });
  after.command({ type: "FACILITATOR_COMMAND", action: "navigate", targetIndex: 5, previewIndex: 0, commandId: `${variant}-navigate`, facilitatorSession: url.searchParams.get("facilitatorSession") });
  assert.equal(after.messages.some((message) => message.type === "FACILITATOR_DECK"), false, `${variant}: presenter commands stay gated off`);
  assert.deepEqual({ rows: plain(after.rows), inspect: after.inspect(), url: after.window.location.href }, gateSnapshot, `${variant}: presenter commands cannot affect non-Zoom trials`);
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

let presenterCommandNumber = 0;
function presenterCommand(run, action, details = {}) {
  const message = {
    type: "FACILITATOR_COMMAND", action,
    facilitatorSession: new URL(run.window.location.href).searchParams.get("facilitatorSession"),
    commandId: `presenter-regression-${++presenterCommandNumber}`,
    ...details,
  };
  run.command(message);
  return message;
}

function presenterAck(run, command) {
  return plain(run.messages.findLast((message) => message.type === "FACILITATOR_COMMAND_ACK" && message.commandId === command.commandId));
}

const inertPreview = await runtime(sourceAfter, exampleUrl);
let trialHooksCalled = 0;
const inertSnapshot = { rows: plain(inertPreview.rows), inspect: inertPreview.inspect(), url: inertPreview.window.location.href,
  local: [...inertPreview.storage], session: [...inertPreview.sessionStore] };
const inertCatalog = inertPreview.makeDeck([
  { stimulus: '<div><button data-choice-index="0">MOM</button><img src="exact-assigned.png"></div>',
    data: { slide_kind: "response_choices", story_number: 2, condition_pairing: "MOM-TEACHER", facilitator_script: ["  Ask   this question.  ", "", "Then wait."] },
    on_load() { trialHooksCalled += 1; }, on_finish() { trialHooksCalled += 1; } },
  { stimulus() { trialHooksCalled += 1; return "must not evaluate dynamic trial content"; }, data: {} },
]);
assert.equal(trialHooksCalled, 0, "building private previews never runs stimulus functions or trial lifecycle hooks");
assert.deepEqual(inertCatalog.slides[0].scriptLines, ["Ask this question.", "Then wait."]);
assert.equal(inertCatalog.slides[1].html, "", "a non-string trial stimulus is never executed in a private preview");
assert.deepEqual({ rows: plain(inertPreview.rows), inspect: inertPreview.inspect(), url: inertPreview.window.location.href,
  local: [...inertPreview.storage], session: [...inertPreview.sessionStore] }, inertSnapshot, "catalog construction is read-only");

const guardedPresenter = await runtime(sourceAfter, exampleUrl);
guardedPresenter.load(11);
guardedPresenter.rows.push({ preview_index: 0, response: "preserve-before-invalid-command", nested: { falseValue: false, zero: 0 } });
const guardedSnapshot = { rows: plain(guardedPresenter.rows), inspect: guardedPresenter.inspect(), url: guardedPresenter.window.location.href };
const invalidNavigations = [
  { targetIndex: 5, previewIndex: 9, resetLaterAnswers: true, reason: "stale_screen" },
  { targetIndex: -1, previewIndex: 10, resetLaterAnswers: true, reason: "invalid_screen" },
  { targetIndex: guardedPresenter.inspect().totalPreviewScreens, previewIndex: 10, reason: "invalid_screen" },
  { targetIndex: 10.5, previewIndex: 10, reason: "invalid_screen" },
  { targetIndex: "not-a-slide", previewIndex: 10, reason: "invalid_screen" },
  { targetIndex: null, previewIndex: 10, reason: "invalid_screen" },
  { targetIndex: true, previewIndex: 10, reason: "invalid_screen" },
  { targetIndex: "5", previewIndex: 10, reason: "invalid_screen" },
  { targetIndex: 5, previewIndex: 10, reason: "reset_not_confirmed" },
  { targetIndex: 0, previewIndex: 10, resetLaterAnswers: "true", reason: "reset_not_confirmed" },
];
for (const { reason, ...details } of invalidNavigations) {
  const command = presenterCommand(guardedPresenter, "navigate", details);
  const ack = presenterAck(guardedPresenter, command);
  assert.equal(ack.status, "rejected");
  assert.equal(ack.reason, reason, `presenter navigation rejects ${JSON.stringify(details)}`);
  assert.deepEqual({ rows: plain(guardedPresenter.rows), inspect: guardedPresenter.inspect(), url: guardedPresenter.window.location.href }, guardedSnapshot, `${reason}: no answer or live screen changes`);
}
const sameSlide = presenterCommand(guardedPresenter, "navigate", { targetIndex: 10, previewIndex: 10 });
assert.equal(presenterAck(guardedPresenter, sameSlide).status, "accepted", "showing the current slide is a harmless no-op");
assert.deepEqual({ rows: plain(guardedPresenter.rows), inspect: guardedPresenter.inspect(), url: guardedPresenter.window.location.href }, guardedSnapshot);
const messagesBeforeForeign = guardedPresenter.messages.length;
presenterCommand(guardedPresenter, "navigate", { targetIndex: 20, previewIndex: 10, facilitatorSession: "another-child-session" });
presenterCommand(guardedPresenter, "navigate", { targetIndex: 20, previewIndex: 10, type: "NOT_A_FACILITATOR_COMMAND" });
assert.equal(guardedPresenter.messages.length, messagesBeforeForeign, "foreign sessions and non-command messages are ignored");
const catalogRequest = presenterCommand(guardedPresenter, "deck");
presenterCommand(guardedPresenter, "deck");
const catalogsBeforeDuplicate = guardedPresenter.messages.filter((message) => message.type === "FACILITATOR_DECK").length;
guardedPresenter.command(catalogRequest);
assert.equal(guardedPresenter.messages.filter((message) => message.type === "FACILITATOR_DECK").length, catalogsBeforeDuplicate, "a delayed duplicate remains ignored after an intervening command");

for (const direction of ["forward", "back", "restart"]) {
  const run = await runtime(sourceAfter, exampleUrl);
  const targetIndex = direction === "restart" ? 0 : 6;
  const fromIndex = direction === "forward" ? 4 : 10;
  run.load(fromIndex + 1);
  const rows = direction === "forward"
    ? [{ preview_index: 0, response: "earlier" }, { preview_index: 2, rating_value: 2 }, { preview_index: 4, choice_label: "actual recorded role" }]
    : [{ preview_index: 0, response: "earlier" }, { preview_index: 5, rating_value: 2 }, { preview_index: 6, choice_label: "stale destination answer" }, { preview_index: 9, rating_value: 3 }];
  run.rows.push(...plain(rows));
  const assignment = assignmentWithoutRecovery(run);
  const command = presenterCommand(run, "navigate", { targetIndex, previewIndex: fromIndex, ...(direction !== "forward" ? { resetLaterAnswers: true } : {}) });
  assert.equal(presenterAck(run, command).status, "accepted", `${direction}: an explicit valid Show command is accepted`);
  assert.deepEqual(plain(run.rows), rows, `${direction}: a jump itself does not finish a trial or fabricate an answer`);
  assert.equal(run.inspect().facilitatorStudyFinished, false);
  assert.equal(run.messages.some((message) => message.type === "GAME_COMPLETE"), false);
  const destination = new URL(run.window.location.href);
  assert.equal(Number(destination.searchParams.get("previewIndex")), targetIndex);
  const retained = rows.filter((row) => row.preview_index < targetIndex);
  if (retained.length) {
    const backupKey = destination.searchParams.get("resumeBackupKey");
    assert.ok(backupKey);
    assert.equal(destination.searchParams.get("expectedResumeRows"), String(retained.length));
    const store = backupKey.startsWith("who-will-help-navigation-session:") ? run.sessionStore : run.storage;
    assert.deepEqual(JSON.parse(store.get(backupKey)).rows, retained, `${direction}: checkpoint preserves exactly the preceding complete rows`);
  } else {
    assert.equal(destination.searchParams.has("resumeBackupKey"), false, "restart explicitly discards stale recovery");
  }
  const resumed = await runtime(sourceAfter, destination, { storage: run.storage, sessionStore: run.sessionStore });
  assert.deepEqual(assignmentWithoutRecovery(resumed), assignment, `${direction}: private navigation preserves colors, sides, role pair, event and trait schedule`);
  assert.equal(resumed.timeline[1].data.preview_index, targetIndex);
  assert.deepEqual(plain(resumed.rows).map(({ facilitator_restored_from_backup, ...row }) => row), retained, `${direction}: only the intended preceding answers return`);
  assert.deepEqual(resumed.deck().slides, run.deck().slides, `${direction}: reload still previews the complete assigned deck, not only its remaining tail`);
}

const blockedPresenter = await runtime(sourceAfter, exampleUrl, { localStorageFailure: "blocked", sessionStorageFailure: "blocked" });
blockedPresenter.load(11);
blockedPresenter.rows.push({ preview_index: 0, response: "must-not-lose" });
const blockedSnapshot = { rows: plain(blockedPresenter.rows), url: blockedPresenter.window.location.href };
const blockedCommand = presenterCommand(blockedPresenter, "navigate", { targetIndex: 6, previewIndex: 10, resetLaterAnswers: true });
assert.equal(presenterAck(blockedPresenter, blockedCommand).reason, "storage_unavailable");
assert.deepEqual({ rows: plain(blockedPresenter.rows), url: blockedPresenter.window.location.href }, blockedSnapshot, "failed private navigation preserves the live screen and responses when both browser stores are blocked");

const coalesceFixture = [
  { technical: "unindexed preload", nested: { zero: 0, falseValue: false, empty: "" } },
  { preview_index: 3, choice_index: 0, choice_id: "recorded-first-role", response_missing: false },
  { preview_index: 8, rating_value: 1, rating_label: "Original rating" },
  { preview_index: 3, response_missing: true, researcher_navigation: "forward" },
  { preview_index: 6, response_missing: true },
  { preview_index: 8, rating_value: 3, rating_label: "Changed rating" },
  { preview_index: 6, choice_id: "newly-answered-role", response_missing: false },
  { preview_index: 8, response_missing: true, researcher_navigation: "forward" },
  { preview_index: "3", technical: "noninteger identity is retained" },
  { preview_index: 4, response: "first visit without a question" },
  { preview_index: 4, response: "latest visit without a question" },
];
const coalesceSnapshot = plain(coalesceFixture);
assert.deepEqual(inertPreview.coalesceRows(coalesceFixture), [coalesceFixture[0], coalesceFixture[1], coalesceFixture[5], coalesceFixture[6], coalesceFixture[8], coalesceFixture[10]], "coalescing keeps first row position, latest actual answer, earlier answer over a missing response, and every unindexed technical row");
assert.deepEqual(coalesceFixture, coalesceSnapshot, "coalescing is pure and preserves the original input records");

for (const [direction, targetIndex] of [["forward", 20], ["back", 6], ["first", 0]]) {
  const run = await runtime(sourceAfter, exampleUrl);
  run.load(11);
  const rows = [
    { technical: "retain complete non-answer row" },
    { preview_index: 0, response: "earlier", nested: { zero: 0, falseValue: false } },
    { preview_index: 6, choice_index: 0, choice_id: "recorded destination role" },
    { preview_index: 19, rating_value: 3, rating_label: "later recorded rating" },
  ];
  run.rows.push(...plain(rows));
  const assignment = assignmentWithoutRecovery(run);
  const command = presenterCommand(run, "navigate", { targetIndex, previewIndex: 10, preserveResponses: true });
  assert.equal(presenterAck(run, command).status, "accepted", `${direction}: direct navigation preserves responses without a backward-reset confirmation`);
  assert.deepEqual(plain(run.rows), rows, `${direction}: checkpoint creation cannot mutate running responses`);
  const destination = new URL(run.window.location.href);
  assert.equal(destination.searchParams.get("navigatorKeepAnswers"), "1");
  assert.equal(destination.searchParams.get("expectedResumeRows"), String(rows.length));
  const key = destination.searchParams.get("resumeBackupKey");
  const store = key.startsWith("who-will-help-navigation-session:") ? run.sessionStore : run.storage;
  assert.deepEqual(JSON.parse(store.get(key)).rows, rows, `${direction}: every earlier and later answer is checkpointed intact`);
  run.flushTimers();
  assert.deepEqual(JSON.parse(store.get(key)).rows, rows, `${direction}: pending ordinary progress saves cannot replace the full navigation checkpoint`);
  const resumed = await runtime(sourceAfter, destination, { storage: run.storage, sessionStore: run.sessionStore });
  assert.deepEqual(plain(resumed.rows).map(({ facilitator_restored_from_backup, ...row }) => row), rows);
  assert.deepEqual(assignmentWithoutRecovery(resumed), assignment);
  assert.equal(resumed.timeline[1].data.preview_index, targetIndex);
  if (direction === "back") {
    resumed.load(1);
    resumed.arrow("back").click();
    const legacyBackUrl = new URL(resumed.window.location.href);
    assert.equal(legacyBackUrl.searchParams.has("navigatorKeepAnswers"), false, "the original Back arrow exits answer-preserving mode");
    assert.equal(legacyBackUrl.searchParams.get("expectedResumeRows"), "1", "the original Back arrow retains only rows preceding its destination");
    const legacyKey = legacyBackUrl.searchParams.get("resumeBackupKey");
    const legacyStore = legacyKey.startsWith("who-will-help-navigation-session:") ? resumed.sessionStore : resumed.storage;
    assert.deepEqual(JSON.parse(legacyStore.get(legacyKey)).rows.map(({ facilitator_restored_from_backup, ...row }) => row), [rows[1]], "old arrow semantics still deliberately truncate destination and later answers");
  }
}

for (const targetIndex of [0, 6, 20]) {
  const run = await runtime(sourceAfter, exampleUrl, { localStorageFailure: "blocked", sessionStorageFailure: "blocked" });
  run.load(11); run.rows.push({ preview_index: 19, rating_value: 3, rating_label: "must survive failed direct navigation" });
  const snapshot = { rows: plain(run.rows), url: run.window.location.href, assignment: assignmentWithoutRecovery(run) };
  const command = presenterCommand(run, "navigate", { targetIndex, previewIndex: 10, preserveResponses: true });
  assert.equal(presenterAck(run, command).reason, "storage_unavailable");
  assert.deepEqual({ rows: plain(run.rows), url: run.window.location.href, assignment: assignmentWithoutRecovery(run) }, snapshot, `slide ${targetIndex}: failed direct navigation preserves all data and the live view`);
}

// Exercise real helper and Likert handlers after a preserve-all checkpoint in
// every role-set/care-act cell, including a zero-index choice and the last
// rating. Merely looking and moving on retains the recorded answer; choosing
// again replaces that question's single row without touching later answers.
for (const role of ["woman", "man", "family"]) for (const care of ["hug", "food", "help"]) {
  const entry = entries.find((item) => item.id.startsWith(`${role}-${care}-`));
  assert.ok(entry);
  const url = apiAfter.buildStudyUrl(entry, "https://example.test/screen-share-study/zoom-review.html", "zoom", "DIRECT-REANSWER");
  const run = await runtime(sourceAfter, url);
  const helperIndex = run.timeline.findIndex((node) => node.data?.slide_kind === "response_choices");
  const ratingIndex = run.timeline.findIndex((node) => node.data?.slide_kind === "response");
  const laterIndex = run.timeline.findLastIndex((node) => node.data?.slide_kind === "response");
  const helperPreview = run.timeline[helperIndex].data.preview_index;
  const ratingPreview = run.timeline[ratingIndex].data.preview_index;
  const laterPreview = run.timeline[laterIndex].data.preview_index;
  run.load(helperIndex); run.document.querySelectorAll(".ksize-char-btn")[0].click(); run.flushTimers();
  run.load(ratingIndex); run.document.querySelectorAll(".ksize-rating-choice")[0].click(); run.flushTimers();
  run.load(laterIndex); run.document.querySelectorAll(".ksize-rating-choice")[2].click(); run.flushTimers();
  const command = presenterCommand(run, "navigate", { targetIndex: helperPreview, previewIndex: laterPreview, preserveResponses: true });
  assert.equal(presenterAck(run, command).status, "accepted");
  const resumed = await runtime(sourceAfter, new URL(run.window.location.href), { storage: run.storage, sessionStore: run.sessionStore });
  const original = plain(resumed.rows);
  assert.equal(original.length, 3);
  resumed.load(1); resumed.arrow("forward").click(); resumed.flushTimers();
  assert.deepEqual(plain(resumed.rows), original, `${entry.id}: Forward past a revisited helper choice preserves the old answer and every later record`);
  resumed.load(1);
  const helperLabel = resumed.document.querySelectorAll(".ksize-char-btn")[1].getAttribute("aria-label");
  resumed.document.querySelectorAll(".ksize-char-btn")[1].click(); resumed.flushTimers();
  const changedHelper = resumed.rows.find((row) => row.preview_index === helperPreview);
  assert.equal(changedHelper.choice_index, 1);
  assert.equal(changedHelper.choice_label, helperLabel);
  assert.equal(changedHelper.response_missing, false);
  assert.deepEqual(plain(resumed.rows.slice(1)), original.slice(1), `${entry.id}: changing a helper choice keeps both later ratings intact`);
  const resumedRating = resumed.timeline.findIndex((node) => node.data?.preview_index === ratingPreview);
  const beforeRatingVisit = plain(resumed.rows);
  resumed.load(resumedRating); resumed.arrow("forward").click(); resumed.flushTimers();
  assert.deepEqual(plain(resumed.rows), beforeRatingVisit, `${entry.id}: Forward past a revisited rating cannot replace its answer with missingness`);
  resumed.load(resumedRating); resumed.document.querySelectorAll(".ksize-rating-choice")[2].click(); resumed.flushTimers();
  assert.equal(resumed.rows.find((row) => row.preview_index === ratingPreview).rating_value, 3);
  assert.equal(resumed.rows.find((row) => row.preview_index === ratingPreview).response_missing, false);
  assert.deepEqual(plain(resumed.rows.find((row) => row.preview_index === laterPreview)), original[2]);
  assert.deepEqual(plain(resumed.rows[0]), plain(changedHelper));
  assert.equal(resumed.rows.length, 3);
  assert.equal(new Set(resumed.rows.map((row) => row.preview_index)).size, 3, `${entry.id}: each question retains exactly one row after navigation and re-answering`);
  assert.deepEqual(assignmentWithoutRecovery(resumed), assignmentWithoutRecovery(run));
  assert.deepEqual(resumed.deck().slides, run.deck().slides, `${entry.id}: updated answers do not change assigned roles, images, colors, sides or rating order`);
  const regularKey = `who-will-help-data:${new URL(resumed.window.location.href).searchParams.get("session_id")}`;
  assert.deepEqual(JSON.parse(resumed.storage.get(regularKey)).rows, plain(resumed.rows), `${entry.id}: saved progress reflects the unique current answer rows`);
}

for (const variant of ["ordinary-zoom", "no-facilitator", "no-live-share", "no-deck-version"]) {
  const url = new URL(exampleUrl);
  if (variant !== "ordinary-zoom") url.searchParams.set("navigatorKeepAnswers", "1");
  if (variant === "no-facilitator") url.searchParams.delete("facilitator");
  if (variant === "no-live-share") url.searchParams.delete("liveShare");
  const run = await runtime(sourceAfter, url, variant === "no-deck-version" ? { deckVersion: "" } : {});
  run.jsPsych.active = run.timeline.findIndex((node) => node.data?.slide_kind === "response_choices");
  run.jsPsych.finishTrial({ choice_index: 0, choice_id: "first-recorded-role", response: 0 });
  run.jsPsych.finishTrial({ choice_index: 1, choice_id: "second-recorded-role", response: 1 });
  assert.equal(run.rows.length, 2, `${variant}: row coalescing is scoped only to supported Zoom navigator preservation mode`);
}

// The child normally has no opener because the launch link uses noopener.
// Exercise the direct popup fallback without providing BroadcastChannel at all.
const popupRun = await runtime(sourceAfter, exampleUrl, { hasOpener: false });
popupRun.load(3);
const popupSnapshot = { rows: plain(popupRun.rows), inspect: popupRun.inspect(), url: popupRun.window.location.href };
popupRun.document.querySelector(".ksize-zoom-presenter-open").click();
assert.equal(popupRun.openedWindows.length, 1);
const opened = popupRun.openedWindows[0];
const popupUrl = new URL(opened.args[0]);
assert.equal(popupUrl.pathname, `/${zoomPrefix}/presenter.html`);
assert.deepEqual([...popupUrl.searchParams], [["facilitatorSession", exampleUrl.searchParams.get("facilitatorSession")], ["v", "zoom-slides-button-2026-10-27"]], "private window receives only its session channel and UI version, not an independently runnable child assignment");
assert.equal(opened.popup.focused, true);
popupRun.dispatchMessage({ type: "FACILITATOR_COMMAND", action: "deck", commandId: "popup-first-catalog", facilitatorSession: popupUrl.searchParams.get("facilitatorSession") }, { source: opened.popup });
assert.ok(popupRun.popupMessages.some((message) => message.type === "FACILITATOR_DECK"), "child-opened popup receives the catalog without BroadcastChannel or a child opener");
assert.deepEqual({ rows: plain(popupRun.rows), inspect: popupRun.inspect(), url: popupRun.window.location.href }, popupSnapshot, "opening and connecting the private popup is read-only");
const reconnected = await runtime(sourceAfter, exampleUrl, { hasOpener: false });
const reconnectMessages = [];
const reconnectSource = { closed: false, postMessage: (message) => reconnectMessages.push(message) };
const reconnectRequest = { type: "FACILITATOR_COMMAND", action: "deck", commandId: "popup-after-child-reload", facilitatorSession: popupUrl.searchParams.get("facilitatorSession") };
reconnected.dispatchMessage(reconnectRequest, { origin: "https://foreign.example", source: reconnectSource });
reconnected.dispatchMessage({ ...reconnectRequest, facilitatorSession: "wrong-session" }, { source: reconnectSource });
assert.equal(reconnectMessages.length, 0, "popup reconnection rejects foreign origins and sessions");
reconnected.dispatchMessage(reconnectRequest, { source: reconnectSource });
assert.equal(reconnectMessages.filter((message) => message.type === "FACILITATOR_DECK").length, 1, "a still-open popup can reconnect after child reload with no BroadcastChannel");
const pingReconnected = await runtime(sourceAfter, exampleUrl, { hasOpener: false });
const pingMessages = [];
pingReconnected.dispatchMessage({ ...reconnectRequest, action: "ping", commandId: "popup-ping-after-reload" }, {
  source: { closed: false, postMessage: (message) => pingMessages.push(message) },
});
assert.ok(pingMessages.some((message) => message.type === "FACILITATOR_STATE"), "an already-open private navigator reconnects by heartbeat without requesting its cached catalog again");

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
assert.match(zoomHtml, /app\.js\?v=zoom-slides-button-2026-10-27/, "regular Zoom entry loads the current slide controls");
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
  presenterCatalogsChecked: entries.length,
  presenterSlidesChecked: screenCount,
  answerPreservingAssignmentsChecked: entries.length,
  realReanswerRoleCareCellsChecked: 9,
  slideKinds: [...allKinds].sort(),
  sharedChsFilesByteIdentical: immutableFiles.length,
  verified: ["assignment/remaining-timeline identity", "Zoom-only removal of followup transition screens and redundant rating-focus banners", "retained pair introductions, rating images, questions and answer options", "Start/Back/Forward/End on every Zoom screen", "Start/End bounds disabled correctly", "all-version Start/End assignment identity", "Start clears stale responses without needing browser storage", "End previews certificate without completion or invented answers", "End storage fallback and fail-safe", "all four controls disable after successful navigation", "no upper-right toolbar", "native forward semantics", "missing-answer forward", "double-click guard", "Back/recovery", "session-first navigation checkpoint", "blocked/full local storage recovery", "blocked session storage fallback", "both stores blocked visible error without data loss", "selected-store isolation from stale checkpoints", "current-format local/session checkpoint recovery", "missing/old Zoom timeline markers rejected before importing answers without changing saved bytes", "non-Zoom unversioned local recovery unchanged", "pending-persistence Back checkpoint isolation", "Back recovery without participant ID", "full restored-row identity", "helper re-answer followed directly by retained rating-pair introduction", "rating re-answer", "pair-plan stability", "invalid-restore protection", "production choice CSS matches approved comparison effect", "all-version launcher/cache refresh", "final completion", "non-Zoom gate compatibility",
    "all-version private catalog preserves exact assigned order, HTML, script, pair and stylesheet URLs",
    "catalog construction and requests never run trials or change answers, location or storage",
    "presenter stale/negative/fractional/out-of-range navigation and unconfirmed reset guards",
    "presenter duplicate-command and foreign-session guards",
    "explicit presenter forward/back/restart preserves assignment and exact checkpoint rows",
    "presenter blocked-storage navigation fails without losing answers",
    "private popup and child-reload reconnection without BroadcastChannel or child opener",
    "presenter commands remain Zoom-only",
    "all 96 assignments retain actual helper and rating answers when navigating directly to slide 1",
    "direct forward/back/first checkpoints preserve all earlier, destination, later and unindexed rows",
    "pure coalescing keeps original row position and latest actual answer without mutating input",
    "revisiting then advancing without answering retains the recorded helper/rating response",
    "real re-answer handlers replace one row and preserve all other answers in all nine role/care cells",
    "answer-preserving mode is Zoom-only and old arrows retain their original reset semantics",
    "blocked-storage direct navigation preserves all rows even when targeting slide 1"],
}, null, 2));
