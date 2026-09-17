import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidateRoot = path.join(root, "versions", "chs-home-school-evelyn-v1");
const appPath = path.join(candidateRoot, "app.js");
const appSource = fs.readFileSync(appPath, "utf8");
const eventManifest = JSON.parse(fs.readFileSync(path.join(candidateRoot, "data", "ksize_manifest.json"), "utf8"));
const mainCallIndex = appSource.lastIndexOf("\nmain().catch(");

assert.ok(mainCallIndex > 0, "Could not isolate the candidate runtime from its final main() call");

const bodyClasses = new Set();
const quietClassList = {
  add(...names) { names.forEach((name) => bodyClasses.add(name)); },
  remove(...names) { names.forEach((name) => bodyClasses.delete(name)); },
  contains(name) { return bodyClasses.has(name); },
};

class FakeAudio {
  static instances = [];

  constructor(src) {
    this.src = src;
    this.currentTime = 0;
    this.duration = 0;
    this.listeners = new Map();
    FakeAudio.instances.push(this);
  }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener() {}
  pause() {}
  play() { return Promise.resolve(); }
  emit(type) { this.listeners.get(type)?.(); }
}

class FakeSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
    this.listeners = new Map();
  }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
}

function makeDocument() {
  return {
    body: { classList: quietClassList, innerHTML: "" },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => ({
      addEventListener() {},
      append() {},
      click() {},
      remove() {},
      classList: quietClassList,
    }),
  };
}

function makeWindow(search, document) {
  const windowObject = {
    location: {
      search,
      href: `https://runtime-behavior.test/index.html${search}`,
      origin: "https://runtime-behavior.test",
    },
    KSIZE_RUNTIME_CONFIG: {},
    KSIZE_ASSET_BASE_URL: "",
    document,
    opener: null,
    addEventListener() {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    speechSynthesis: {
      getVoices: () => [],
      addEventListener() {},
      cancel() {},
      speak() {},
    },
  };
  windowObject.parent = windowObject;
  return windowObject;
}

function makeSandbox(search = "") {
  const document = makeDocument();
  const window = makeWindow(search, document);
  return vm.createContext({
    console,
    URL,
    URLSearchParams,
    Date,
    Math,
    Map,
    Set,
    Promise,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    JSON,
    Error,
    Blob,
    AbortController,
    performance,
    window,
    document,
    navigator: { userAgent: "home-school-followup-runtime-test" },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    Audio: FakeAudio,
    SpeechSynthesisUtterance: FakeSpeechSynthesisUtterance,
    jsPsychHtmlButtonResponse: { name: "html-button-response" },
    jsPsychPreload: { name: "preload" },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  });
}

function loadPureRuntime(search = "") {
  const context = makeSandbox(search);
  const exportSource = `
    globalThis.__FOLLOWUP_RUNTIME__ = {
      furnishedSceneSpec,
      followupForegroundSrc,
      furnishedFollowupSceneSpec,
      renderSlide,
      makeSlideNode,
      audio,
      setContext(value) { activeStudyContext = value; },
    };
  `;
  new vm.Script(`${appSource.slice(0, mainCallIndex)}\n${exportSource}`, { filename: appPath })
    .runInContext(context);
  return context.__FOLLOWUP_RUNTIME__;
}

async function localJsonResponse(url) {
  const raw = String(url);
  const pathname = raw.replace(/^https?:\/\/[^/]+\//, "").split("?")[0].replace(/^\//, "");
  const absolute = path.resolve(candidateRoot, pathname);
  assert.ok(
    absolute === candidateRoot || absolute.startsWith(`${candidateRoot}${path.sep}`),
    `Runtime fetch escaped the candidate directory: ${raw}`,
  );
  return {
    ok: fs.existsSync(absolute),
    json: async () => JSON.parse(fs.readFileSync(absolute, "utf8")),
  };
}

async function runMain(search) {
  let capturedTimeline = null;
  let capturedProperties = null;
  const context = makeSandbox(search);
  const dataCollection = {
    values: () => [],
    filter() { return this; },
    last() { return this; },
    push() {},
  };
  const jsPsych = {
    data: {
      get: () => dataCollection,
      addProperties(properties) { capturedProperties = properties; },
    },
    run(timeline) { capturedTimeline = timeline; },
    finishTrial() {},
  };
  context.fetch = localJsonResponse;
  context.initJsPsych = () => jsPsych;
  const testSource = `${appSource.slice(0, mainCallIndex)}
    globalThis.__FOLLOWUP_MAIN_PROMISE__ = main();
  `;
  new vm.Script(testSource, { filename: appPath }).runInContext(context);
  await context.__FOLLOWUP_MAIN_PROMISE__;
  assert.ok(capturedTimeline, `main() did not build a timeline for ${search}`);
  assert.ok(capturedProperties, `main() did not attach session properties for ${search}`);
  return { timeline: capturedTimeline, properties: capturedProperties };
}

function queryFor(context = "") {
  const params = new URLSearchParams({
    seed: "followup-runtime-association",
    set: "family",
    roleSet: "family",
    event: "HUG",
    ratingMode: "one-after-story",
    researcherTools: "1",
    syntheticSpeech: "1",
  });
  if (context) {
    params.set("contextStudy", "1");
    params.set("context", context);
  }
  return `?${params.toString()}`;
}

function withinChildQuery(firstContext, roleSet = "family", variant = "") {
  const params = new URLSearchParams({
    seed: `within-child-runtime-${firstContext.toLowerCase()}-${roleSet}-${variant || "random"}`,
    set: roleSet === "family" ? "family" : "role",
    roleSet,
    event: "HUG",
    ratingMode: "none",
    contextStudy: "1",
    withinChildContexts: "1",
    context: firstContext,
    researcherTools: "1",
    skipParentSetup: "1",
    syntheticSpeech: "1",
  });
  if (variant) params.set("variant", variant);
  return `?${params.toString()}`;
}

function dyadNodes(timeline) {
  return timeline.filter((node) => node?.data?.dyad_id && ["intro", "response"].includes(node.data.slide_kind));
}

// Exercise the actual production helpers directly, including the null fallback.
const runtime = loadPureRuntime(queryFor("HOME"));
const trialA = {
  homeSchoolFurnished: {
    homeBackground: "rooms/trial-a-home.webp",
    schoolBackground: "rooms/trial-a-school.webp",
    paletteSlug: "trial-a",
    characterHex: "#123456",
    version: "visual-a",
  },
};
const trialB = {
  homeSchoolFurnished: {
    homeBackground: "rooms/trial-b-home.webp",
    schoolBackground: "rooms/trial-b-school.webp",
    paletteSlug: "trial-b",
    characterHex: "#654321",
    version: "visual-b",
  },
};
const chunk = {
  id: "test-dyad",
  subject: "MOM",
  target: "KID",
  slides: [],
};
const slide = {
  kind: "response",
  trait: "love",
  src: "assets/dyads/test-dyad/response.png",
  homeSchoolForegroundSrc: "versions/chs-home-school-evelyn-v1/assets/home_school/foregrounds/followups/test-dyad/response.png",
};

runtime.setContext("HOME");
assert.equal(runtime.furnishedFollowupSceneSpec(trialA, chunk, slide).backgroundSrc, trialA.homeSchoolFurnished.homeBackground);
const homeNodeA = runtime.makeSlideNode({}, trialA, chunk, slide, 0, 1, 1, 6);
const homeNodeB = runtime.makeSlideNode({}, trialB, chunk, slide, 0, 1, 2, 6);
assert.equal(homeNodeA.data.context_background_src, trialA.homeSchoolFurnished.homeBackground);
assert.equal(homeNodeB.data.context_background_src, trialB.homeSchoolFurnished.homeBackground);
assert.equal(homeNodeA.data.context_palette_slug, "trial-a");
assert.equal(homeNodeB.data.context_palette_slug, "trial-b");
assert.match(homeNodeA.stimulus, /rooms\/trial-a-home\.webp/);
assert.match(homeNodeB.stimulus, /rooms\/trial-b-home\.webp/);

runtime.setContext("SCHOOL");
assert.equal(runtime.furnishedFollowupSceneSpec(trialA, chunk, slide).backgroundSrc, trialA.homeSchoolFurnished.schoolBackground);
const schoolNodeA = runtime.makeSlideNode({}, trialA, chunk, slide, 0, 1, 1, 6);
assert.equal(schoolNodeA.data.context_background_src, trialA.homeSchoolFurnished.schoolBackground);
assert.match(schoolNodeA.stimulus, /rooms\/trial-a-school\.webp/);

runtime.setContext("");
assert.equal(runtime.furnishedFollowupSceneSpec(trialA, chunk, slide), null);
const neutralNode = runtime.makeSlideNode({}, trialA, chunk, slide, 0, 1, 1, 6);
assert.equal(neutralNode.data.context_background_src, null);
assert.equal(neutralNode.data.context_foreground_src, null);
assert.doesNotMatch(neutralNode.stimulus, /ksize-rating-furnished-scene/);
assert.match(neutralNode.stimulus, /assets\/dyads\/test-dyad\/response\.png/);

// Exercise the real timeline builder so a dyad is paired with its own story trial,
// rather than accidentally inheriting a neighboring trial's room palette.
for (const contextName of ["HOME", "SCHOOL"]) {
  const { timeline, properties } = await runMain(queryFor(contextName));
  assert.equal(properties.assigned_context, contextName);
  const storyTrials = new Map(
    timeline
      .filter((node) => node?.data?.trial_key && node.data.story_number)
      .map((node) => [node.data.story_number, node.data.trial_key]),
  );
  const followups = dyadNodes(timeline);
  const contextIntros = timeline.filter((node) => node?.data?.slide_kind === "context_intro");
  const locationSentence = `They are all at the kid's ${contextName === "HOME" ? "house" : "school"}.`;
  const obsoleteCue = `assets/home_school/generated/${contextName.toLowerCase()}_context_intro_cue_v2.png`;
  assert.equal(contextIntros.length, 6, `${contextName} timeline must show one location sentence per story`);
  for (const node of contextIntros) {
    assert.match(node.stimulus, /class="ksize-context-spoken-banner"/);
    assert.equal(node.stimulus.split(locationSentence).length - 1, 1, "Location sentence must appear exactly once");
    assert.doesNotMatch(node.stimulus, /ksize-context-intro-cue|ksize-context-badge-large/);
    assert.ok(!node.stimulus.includes(obsoleteCue), "Obsolete blue/white location card must not render");
  }
  assert.ok(followups.length > 0, `${contextName} timeline did not contain furnished follow-up slides`);
  assert.deepEqual([...new Set(followups.map((node) => node.data.story_number))], [1, 2, 3, 4, 5, 6]);

  for (const node of followups) {
    const trialId = storyTrials.get(node.data.story_number);
    const trial = eventManifest.trials.find((candidate) => candidate.id === trialId);
    assert.ok(trial, `Could not resolve story ${node.data.story_number} trial ${trialId}`);
    const expectedBackground = contextName === "HOME"
      ? trial.homeSchoolFurnished.homeBackground
      : trial.homeSchoolFurnished.schoolBackground;
    assert.equal(
      node.data.context_background_src,
      expectedBackground,
      `${contextName} story ${node.data.story_number} follow-up used another trial's room`,
    );
    assert.equal(node.data.context_palette_slug, trial.homeSchoolFurnished.paletteSlug);
    assert.equal(node.data.context, contextName);
    assert.match(node.stimulus, /ksize-rating-furnished-scene/);
    assert.ok(node.stimulus.includes(expectedBackground), `Rendered HTML omitted ${expectedBackground}`);
    assert.ok(node.stimulus.includes(node.data.context_foreground_src), "Rendered HTML omitted its dyad foreground");
  }
}

// The revised Who Takes Care preview presents the same six matched stories in
// both settings, counterbalances which six-story block comes first, and omits
// every dyad/Likert follow-up.
for (const firstContext of ["HOME", "SCHOOL"]) {
  const secondContext = firstContext === "HOME" ? "SCHOOL" : "HOME";
  const { timeline, properties } = await runMain(withinChildQuery(firstContext));
  const timelineNodes = Array.from(timeline);
  const choices = timelineNodes.filter((node) => node?.data?.slide_kind === "response_choices");
  const intros = timelineNodes.filter((node) => node?.data?.slide_kind === "context_intro");
  const ratings = timelineNodes.filter((node) => node?.data?.rating_value != null || node?.data?.dyad_id);
  const parentSetup = timelineNodes.filter((node) => ["parent_welcome", "parent_setup", "camera_setup", "child_handoff"].includes(node?.data?.slide_kind));
  const contextSequence = choices.map((node) => node.data.context);

  assert.equal(properties.assigned_context, "BOTH");
  assert.equal(properties.assigned_contexts, `${firstContext},${secondContext}`);
  assert.equal(properties.context_order, `${firstContext},${secondContext}`);
  assert.equal(properties.first_context, firstContext);
  assert.equal(properties.second_context, secondContext);
  assert.equal(properties.context_order_condition, `${firstContext}_FIRST`);
  assert.equal(properties.assignment_cell_schema, "one_based_role_major_3_role_sets_x_3_events_x_2_context_orders");
  assert.equal(properties.context_manipulation, "within_child_two_six_story_blocks_counterbalanced_order");
  assert.equal(properties.design_version, "home_school_within_child_counterbalanced_context_order_v1");
  assert.equal(properties.rating_mode, "none");
  assert.equal(properties.part_order, "stories-only");
  assert.equal(properties.n_event_trials, 12);
  assert.equal(properties.n_event_trials_per_context, 6);
  assert.equal(properties.n_dyads, 0);

  assert.equal(choices.length, 12, "Within-child study must collect twelve helper choices");
  assert.equal(intros.length, 12, "Every story must repeat its setting sentence");
  assert.equal(ratings.length, 0, "Within-child study must not contain Likert/dyad pages");
  assert.equal(parentSetup.length, 0, "Researcher review URL must open directly to the child study");
  assert.deepEqual(contextSequence.slice(0, 6), Array(6).fill(firstContext));
  assert.deepEqual(contextSequence.slice(6), Array(6).fill(secondContext));
  assert.deepEqual(choices.map((node) => node.data.story_number), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.deepEqual(choices.map((node) => node.data.story_total), Array(12).fill(12));
  assert.deepEqual(choices.map((node) => node.data.context_block), [...Array(6).fill(1), ...Array(6).fill(2)]);
  assert.deepEqual(choices.map((node) => node.data.story_within_context), [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6]);

  const firstBlock = choices.slice(0, 6).map((node) => ({
    trial: node.data.trial_key,
    condition: node.data.condition_pairing,
    variant: node.data.variant,
    side: node.data.side,
    color: node.data.color,
    palette: node.data.context_palette_slug,
  }));
  const secondBlock = choices.slice(6).map((node) => ({
    trial: node.data.trial_key,
    condition: node.data.condition_pairing,
    variant: node.data.variant,
    side: node.data.side,
    color: node.data.color,
    palette: node.data.context_palette_slug,
  }));
  assert.deepEqual(secondBlock, firstBlock, "Only the room setting should change across matched blocks");
  assert.equal(new Set(firstBlock.map((story) => story.palette)).size, 6, "Each six-story block must keep unique visual palettes");

  const preloadImages = timeline[0]?.images || [];
  for (const trial of eventManifest.trials.filter((candidate) => firstBlock.some((story) => story.trial === candidate.id))) {
    assert.ok(preloadImages.some((src) => String(src).includes(trial.homeSchoolFurnished.homeBackground)));
    assert.ok(preloadImages.some((src) => String(src).includes(trial.homeSchoolFurnished.schoolBackground)));
  }
}

// The review profiles may request a left- or right-placement rendition. The
// planner may mix the two same-side source variants, but must still retain six
// genuinely distinct visual palettes in every role set.
for (const roleSet of ["woman", "man", "family"]) {
  for (const variant of ["a", "b", "c", "d"]) {
    const { timeline } = await runMain(withinChildQuery("HOME", roleSet, variant));
    const choices = Array.from(timeline).filter((node) => node?.data?.slide_kind === "response_choices");
    const firstBlock = choices.slice(0, 6);
    assert.equal(new Set(firstBlock.map((node) => node.data.context_palette_slug)).size, 6,
      `${roleSet}/${variant} repeated a visual palette within its first block`);
    assert.equal(new Set(firstBlock.map((node) => node.data.side)).size, 1,
      `${roleSet}/${variant} mixed left and right placement within one review profile`);
    assert.equal(firstBlock[0]?.data?.side, ["a", "b"].includes(variant) ? "LEFT" : "RIGHT");
  }
}

// The yellow narrator's mouth follows actual media state, not the request to
// start playback. It closes while buffering/paused and ignores stale media.
bodyClasses.clear();
FakeAudio.instances.length = 0;
let startedWithMouthOpen = false;
let endedWithMouthClosed = false;
const playback = runtime.audio.playFile("audio_evelyn/runtime-mouth-test.mp3", "Runtime mouth test.", {
  onStart: () => { startedWithMouthOpen = bodyClasses.has("ksize-audio-playing"); },
  onEnd: () => { endedWithMouthClosed = !bodyClasses.has("ksize-audio-playing"); },
});
const media = FakeAudio.instances.at(-1);
assert.ok(media, "Audio runtime did not construct its prerecorded media element");
assert.equal(bodyClasses.has("ksize-audio-playing"), false, "Mouth opened before media began playing");
media.emit("playing");
assert.equal(bodyClasses.has("ksize-audio-playing"), true, "Mouth did not open on media playing");
assert.equal(startedWithMouthOpen, true, "Playback callback ran before the mouth state was synchronized");
media.emit("waiting");
assert.equal(bodyClasses.has("ksize-audio-playing"), false, "Mouth kept moving while media buffered");
media.emit("playing");
media.emit("pause");
assert.equal(bodyClasses.has("ksize-audio-playing"), false, "Mouth kept moving while media was paused");
media.emit("playing");
media.emit("emptied");
assert.equal(bodyClasses.has("ksize-audio-playing"), false, "Mouth kept moving after media was emptied");
media.emit("playing");
media.emit("ended");
assert.equal(await playback, true);
assert.equal(bodyClasses.has("ksize-audio-playing"), false, "Mouth kept moving after narration ended");
assert.equal(endedWithMouthClosed, true, "End callback ran before the mouth closed");

const stalePlayback = runtime.audio.playFile("audio_evelyn/runtime-mouth-stale.mp3", "Stale audio.");
const staleMedia = FakeAudio.instances.at(-1);
staleMedia.emit("playing");
assert.equal(bodyClasses.has("ksize-audio-playing"), true);
runtime.audio.stop();
assert.equal(bodyClasses.has("ksize-audio-playing"), false, "Stopping narration did not close the mouth");
staleMedia.emit("playing");
assert.equal(bodyClasses.has("ksize-audio-playing"), false, "A stale media event restarted the mouth animation");
staleMedia.emit("ended");
await stalePlayback;

const neutralStudy = await runMain(queryFor());
assert.equal(neutralStudy.properties.assigned_context, null);
const neutralFollowups = dyadNodes(neutralStudy.timeline);
assert.ok(neutralFollowups.length > 0, "Non-context timeline did not contain follow-up slides");
for (const node of neutralFollowups) {
  assert.equal(node.data.context, null);
  assert.equal(node.data.context_background_src, null);
  assert.equal(node.data.context_foreground_src, null);
  assert.doesNotMatch(node.stimulus, /ksize-rating-furnished-scene/);
  assert.ok(node.stimulus.includes(node.data.image_src), "Non-context fallback omitted the original dyad image");
}

console.log(JSON.stringify({
  status: "PASS",
  verified: [
    "HOME follow-ups use each story trial's home room",
    "SCHOOL follow-ups use each story trial's school room",
    "non-context follow-ups keep the original dyad image",
    "dyad intro and response nodes retain their own story trial association",
    "location sentence renders once in the colored top caption with no lower card",
    "yellow narrator mouth follows media playback state",
  ],
}, null, 2));
