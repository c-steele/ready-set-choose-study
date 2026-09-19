import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

// Executes the candidate's real story builder and main() in a minimal host.
// These are structural/runtime checks; they do not claim browser visual QA.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidateRoot = path.join(root, "versions/chs-home-school-evelyn-v1");
const appPath = path.join(candidateRoot, "app.js");
const appSource = fs.readFileSync(appPath, "utf8");
const mainCallIndex = appSource.lastIndexOf("\nmain().catch(");
assert.ok(mainCallIndex > 0, "Cannot isolate the candidate runtime's main() call");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(candidateRoot, "data", name), "utf8"));
const eventManifest = readJson("ksize_manifest.json");
const contextManifest = readJson("home_school_context_manifest.json");
const canonicalAudio = readJson("canonical_audio_manifest_evelyn.json");
const teacherAudio = readJson("teacher_classmate_audio_manifest.json");
const contextAudio = readJson("home_school_audio_manifest.json");
const visualRepair = readJson("visual_repair_manifest.json");
const plain = (value) => JSON.parse(JSON.stringify(value));
const DIRECTIONS = new Set(["DAD-KID", "MOM-KID", "TEACHER-KID"]);
const STORY_KINDS = ["exterior", "room_entry", "intro", "intro", "intro", "context_intro", "story", "response_choices"];
const CURRENT_RELEASE = "chs-home-school-evelyn-v1-r23-two-role-sets-1";
const CURRENT_DESIGN = "home_school_within_child_two_role_sets_v2";
const CURRENT_SCHEMA = "one_based_role_major_2_role_sets_x_3_events_x_2_context_orders";
const ACTIVE_CONDITIONS = {
  woman: ["MOM-TEACHER", "SISTER-FRIEND", "BESTFRIEND-FRIEND", "TEACHER-FRIEND", "MOM-SISTER", "TEACHER-CLASSMATE"],
  man: ["DAD-TEACHER", "BROTHER-FRIEND", "BESTFRIEND-FRIEND", "TEACHER-FRIEND", "DAD-BROTHER", "TEACHER-CLASSMATE"],
};

function makeHost(search = "") {
  const classes = new Set();
  const classList = {
    add(...names) { names.forEach((name) => classes.add(name)); },
    remove(...names) { names.forEach((name) => classes.delete(name)); },
    contains(name) { return classes.has(name); },
  };
  const document = {
    body: { classList, innerHTML: "", appendChild() {} },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => ({ addEventListener() {}, append() {}, click() {}, remove() {}, classList }),
  };
  const frames = new Map();
  let frameId = 0;
  let now = 0;
  const mediaQuery = { matches: false, addEventListener() {}, removeEventListener() {} };
  const window = {
    location: { search, href: `https://entrance.test/index.html${search}`, origin: "https://entrance.test" },
    KSIZE_RUNTIME_CONFIG: {},
    KSIZE_ASSET_BASE_URL: "",
    document,
    opener: null,
    addEventListener() {},
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    matchMedia: () => mediaQuery,
    speechSynthesis: { getVoices: () => [], addEventListener() {}, cancel() {}, speak() {} },
  };
  window.parent = window;
  const context = vm.createContext({
    console, URL, URLSearchParams, Date, Math, Map, Set, Promise, Object, Array, String,
    Number, Boolean, RegExp, JSON, Error, Blob, AbortController, Uint8Array, Uint32Array,
    Int32Array, window, document,
    performance: { now: () => now },
    navigator: { userAgent: "entrance-rollout-test" },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    Audio: class { addEventListener() {} removeEventListener() {} pause() {} play() { return Promise.resolve(); } },
    SpeechSynthesisUtterance: class { addEventListener() {} },
    jsPsychHtmlButtonResponse: { name: "html-button-response" },
    jsPsychPreload: { name: "preload" },
    setTimeout, clearTimeout, setInterval, clearInterval,
  });
  return {
    context, mediaQuery, frames,
    tick(timestamp) {
      now = timestamp;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(timestamp));
    },
  };
}

const testExports = `
  globalThis.__ENTRANCE_TEST_API__ = {
    main, audio, buildEventTrialNodes, introRevealedSlots, entranceNarrationSpec,
    entranceAssets, entranceController, prepareIntroReveal,
    missingContextAudioForPlan, assertParticipantContextAudioCoverage,
    installCanonicalAudioMap, canonicalAudioPathForText,
    validateHomeSchoolRoleSelection, selectRoleSet, selectedConditionsForSet,
    balancedAssignment, describeActualAssignment, planEventSession, recipientKeyForCondition,
    configure(context, event, manifest, canonical, teacher, audioManifest) {
      activeStudyContext = context;
      activeStudyEvent = event;
      homeSchoolContextManifest = manifest;
      installCanonicalAudioMap(canonical, teacher, audioManifest);
    },
    deleteAudio(text) { canonicalAudioByText.delete(normalizeAudioText(text)); },
  };
`;

function loadRuntime(search = "", runtimeConfig = {}) {
  const host = makeHost(search);
  host.context.window.KSIZE_RUNTIME_CONFIG = runtimeConfig;
  new vm.Script(`${appSource.slice(0, mainCallIndex)}\n${testExports}`, { filename: appPath }).runInContext(host.context);
  return { ...host, api: host.context.__ENTRANCE_TEST_API__ };
}

function configure(api, contextName, event) {
  api.configure(contextName, event, contextManifest, canonicalAudio, teacherAudio, contextAudio);
}

async function localJsonResponse(url) {
  const raw = String(url);
  const filename = raw.replace(/^https?:\/\/[^/]+\//, "").split("?")[0].replace(/^\//, "");
  const absolute = path.resolve(candidateRoot, filename);
  assert.ok(absolute.startsWith(`${candidateRoot}${path.sep}`), `Fetch escaped candidate: ${raw}`);
  return { ok: fs.existsSync(absolute), json: async () => JSON.parse(fs.readFileSync(absolute, "utf8")) };
}

async function runMain(search) {
  const host = loadRuntime(search);
  let timeline;
  let properties;
  const collection = { values: () => [], filter() { return this; }, last() { return this; }, push() {} };
  host.context.fetch = localJsonResponse;
  host.context.initJsPsych = () => ({
    data: { get: () => collection, addProperties(value) { properties = value; } },
    run(value) { timeline = value; }, finishTrial() {},
  });
  await host.api.main();
  assert.ok(timeline, `main() did not build a timeline for ${search}`);
  assert.ok(properties, `main() did not attach data properties for ${search}`);
  return { timeline: Array.from(timeline), properties, host };
}

function expectedReveal(trial, sourceIndex) {
  // Explicitly encode the study geometry independently of runtime role inference.
  const directional = DIRECTIONS.has(trial.blocks.INTRO.condition);
  const firstThree = directional
    ? (["a", "b"].includes(trial.variant) ? ["right", "left", "center"] : ["left", "center", "right"])
    : ["center", "left", "right"];
  return firstThree.slice(0, sourceIndex).sort();
}

function assertStory(nodes, trial, event, contextName, label) {
  assert.deepEqual(nodes.map((node) => node.data.slide_kind), STORY_KINDS, `${label}: incorrect eight-page sequence`);
  assert.equal(nodes.at(-1).data.suffix, event, `${label}: wrong event DV`);
  assert.ok(nodes.every((node) => node.data.context === contextName), `${label}: context changed inside story`);
  assert.equal(nodes.filter((node) => node.data.slide_kind === "response_choices").length, 1);
  const palette = trial.homeSchoolFurnished.paletteSlug;
  const place = contextName === "HOME" ? "house" : "school";
  const expectedHall = `versions/chs-home-school-evelyn-v1/assets/visual-repair-v1/${palette}/${place}-hall.webp`;
  const expectedRoom = contextName === "HOME" ? trial.homeSchoolFurnished.homeBackground
    : `versions/chs-home-school-evelyn-v1/assets/visual-repair-v1/${palette}/school-room.webp`;
  assert.equal(trial.homeSchoolFurnished.schoolBackground, visualRepair.palettes[palette].schoolBackground,
    `${label}: trial is not mapped to the corrected school room`);
  for (const node of nodes) {
    const room = node.stimulus.match(/<img[^>]*class="ksize-furnished-room"[^>]*src="([^"]+)"/)?.[1]?.split("?")[0];
    assert.equal(room, expectedRoom, `${label}: ${node.data.slide_kind} has the wrong room/palette`);
  }
  for (const index of [0, 1]) {
    assert.deepEqual(plain(nodes[index].data.revealed_character_slots || []), [], `${label}: entrance revealed characters`);
    assert.doesNotMatch(nodes[index].stimulus, /<canvas[^>]*ksize-character-reveal|<img[^>]*ksize-furnished-foreground/,
      `${label}: entrance rendered a character foreground`);
    const hall = nodes[index].stimulus.match(/<img[^>]*class="ksize-entry-hall"[^>]*src="([^"]+)"/)?.[1]?.split("?")[0];
    assert.equal(hall, expectedHall, `${label}: entrance does not use the assigned hallway palette`);
  }
  const intros = nodes.slice(2, 5);
  for (const [index, node] of intros.entries()) {
    const sourceIndex = index + 1;
    assert.equal(node.data.facilitator_script, trial.blocks.INTRO.introSlides[sourceIndex].text,
      `${label}: character narration no longer follows source introductions 2–4`);
    const expected = expectedReveal(trial, sourceIndex);
    assert.deepEqual(plain(node.data.revealed_character_slots).sort(), expected, `${label}: incorrect reveal ${sourceIndex}`);
    assert.match(node.stimulus, /<canvas[^>]*ksize-character-reveal/, `${label}: introduction has no masked foreground`);
    const renderedSlots = node.stimulus.match(/data-revealed-slots="([^"]*)"/)?.[1]?.split(",").sort();
    assert.deepEqual(renderedSlots, expected, `${label}: rendered and logged reveal disagree`);
    assert.ok(!node.data.facilitator_script.includes("Here are some people"), `${label}: removed people page survived`);
  }
  assert.equal(nodes[5].data.facilitator_script, contextManifest.contexts[contextName].intro.text);
  assert.match(nodes[5].stimulus, /<img[^>]*ksize-furnished-foreground/, `${label}: context page must display the complete foreground`);
}

// Keep every original source asset covered, including archived Family/teacher
// cases. Rendering an archived asset does not make it eligible for assignment.
const completeTrials = eventManifest.trials.filter((trial) => trial.isComplete);
assert.equal(completeTrials.length, 56);
const coveredPalettes = { HOME: new Set(), SCHOOL: new Set() };
const expectedPalettes = Object.keys(visualRepair.palettes).sort();
assert.equal(expectedPalettes.length, 17);
const runtime = loadRuntime("?contextStudy=1&withinChildContexts=1&context=HOME&researcherTools=1&entranceVisualOnly=1");
let sourceStoryCount = 0;
for (const contextName of ["HOME", "SCHOOL"]) {
  for (const event of ["HUG", "FOOD", "HELP"]) {
    configure(runtime.api, contextName, event);
    for (const trial of completeTrials) {
      const nodes = Array.from(runtime.api.buildEventTrialNodes({}, trial, 0, 12, event, "events", 1, contextName, 1, 1));
      assertStory(nodes, trial, event, contextName, `${trial.id}/${event}/${contextName}`);
      const palette = trial.homeSchoolFurnished.paletteSlug;
      coveredPalettes[contextName].add(palette);
      const place = contextName === "HOME" ? "house" : "school";
      assert.equal(runtime.api.entranceAssets(contextName, palette).hall,
        `versions/chs-home-school-evelyn-v1/assets/visual-repair-v1/${palette}/${place}-hall.webp`);
      for (const sourceIndex of [1, 2, 3]) {
        assert.deepEqual(plain(runtime.api.introRevealedSlots(trial, sourceIndex)).sort(), expectedReveal(trial, sourceIndex));
      }
      sourceStoryCount += 1;
    }
  }
}
assert.equal(sourceStoryCount, 336);
for (const contextName of ["HOME", "SCHOOL"]) {
  assert.deepEqual([...coveredPalettes[contextName]].sort(), expectedPalettes,
    `${contextName}: source story checks must cover every hallway palette`);
}

// R23 narrows eligibility, not the retained assets or their narration. Exercise
// every assignment/planner entry point, including obsolete override aliases.
const activePairings = new Set(Object.values(ACTIVE_CONDITIONS).flat());
const eligibleTrials = completeTrials.filter((trial) => activePairings.has(trial.blocks.INTRO.condition));
assert.equal(activePairings.size, 9);
assert.equal(eligibleTrials.length, 36);
assert.equal(new Set(eligibleTrials.map((trial) => trial.homeSchoolFurnished.paletteSlug)).size, 11);
assert.ok(eligibleTrials.every((trial) => runtime.api.recipientKeyForCondition(trial.blocks.INTRO.condition) === "KID"));
const assignmentCells = new Set();
const seedForAssignmentCell = new Map();
for (let index = 0; index < 512; index += 1) {
  const seed = `r23-hash-${index}`;
  const assignment = runtime.api.balancedAssignment(seed, "", "", "", true, "explicit_seed");
  assert.ok(["woman", "man"].includes(assignment.roleSet));
  assert.ok(["HUG", "FOOD", "HELP"].includes(assignment.eventSuffix));
  assert.ok(["HOME", "SCHOOL"].includes(assignment.context));
  assert.ok(assignment.cell >= 0 && assignment.cell < 12);
  const metadata = runtime.api.describeActualAssignment(assignment, assignment.roleSet, assignment.eventSuffix,
    false, false, assignment.context, false, true, true);
  assert.equal(metadata.cell, assignment.cell + 1);
  assert.equal(metadata.cellSchema, CURRENT_SCHEMA);
  assignmentCells.add(metadata.cell);
  if (!seedForAssignmentCell.has(metadata.cell)) seedForAssignmentCell.set(metadata.cell, seed);
}
assert.deepEqual([...assignmentCells].sort((a, b) => a - b), Array.from({ length: 12 }, (_, index) => index + 1));
for (const [role, aliases] of Object.entries({ woman: ["woman", "women", "female", "mom", " WOMAN "], man: ["man", "men", "male", "dad", " MAN "] })) {
  for (const alias of aliases) {
    assert.equal(runtime.api.validateHomeSchoolRoleSelection("role", alias), role);
    assert.equal(runtime.api.selectRoleSet("r23-alias", alias), role);
    assert.equal(runtime.api.balancedAssignment("r23-alias", alias, "HELP", "HOME", true).roleSet, role);
    assert.deepEqual(plain(runtime.api.selectedConditionsForSet("role", alias)), ACTIVE_CONDITIONS[role]);
  }
}
const obsoleteRoles = ["family", "family-teacher", "family_teacher", "mixed", "third", "parent-peer", " FAMILY ", "all", "unknown"];
const unavailableRole = (error) => error?.code === "HOME_SCHOOL_UNAVAILABLE_ROLE_SET";
for (const role of obsoleteRoles) {
  assert.throws(() => runtime.api.validateHomeSchoolRoleSelection("role", role), unavailableRole);
  assert.throws(() => runtime.api.selectRoleSet("r23-obsolete", role), unavailableRole);
  assert.throws(() => runtime.api.balancedAssignment("r23-obsolete", role, "HELP", "HOME", true), unavailableRole);
  assert.throws(() => runtime.api.describeActualAssignment({}, role, "HELP", true, true, "HOME", true, true, true), unavailableRole);
  assert.throws(() => runtime.api.planEventSession(eventManifest, "r23-obsolete", "a", "role", role), unavailableRole);
}
const obsoleteSets = ["family", "mixed", "third", "parent-peer", "all", "unknown", " FAMILY "];
for (const set of obsoleteSets) {
  assert.throws(() => runtime.api.planEventSession(eventManifest, "r23-obsolete", "a", set, "woman"), unavailableRole);
}
let rejectedMainOverrides = 0;
async function assertMainRejects(search, runtimeConfig = {}) {
  const host = loadRuntime(search, runtimeConfig);
  let fetchCount = 0;
  let initializationCount = 0;
  host.context.fetch = async () => { fetchCount += 1; throw new Error("Invalid role reached asset loading"); };
  host.context.initJsPsych = () => { initializationCount += 1; throw new Error("Invalid role started a session"); };
  await assert.rejects(host.api.main(), unavailableRole);
  assert.equal(fetchCount, 0, "Obsolete links must fail before loading assets");
  assert.equal(initializationCount, 0, "Obsolete links must never start a mislabeled session");
  rejectedMainOverrides += 1;
}
for (const role of obsoleteRoles) {
  for (const parameter of ["roleSet", "role"]) {
    await assertMainRejects(`?contextStudy=1&withinChildContexts=1&${parameter}=${encodeURIComponent(role)}`);
    await assertMainRejects("", { lockedStudyVersion: "home-school", withinChildContexts: "1", [parameter]: role });
  }
}
for (const set of obsoleteSets) {
  await assertMainRejects(`?contextStudy=1&withinChildContexts=1&roleSet=woman&set=${encodeURIComponent(set)}`);
  await assertMainRejects("", { lockedStudyVersion: "home-school", withinChildContexts: "1", roleSet: "man", set });
}
const legacyRuntime = loadRuntime();
assert.equal(legacyRuntime.api.selectRoleSet("legacy", "family"), "family");
assert.equal(legacyRuntime.api.balancedAssignment("legacy", "family", "HELP", "", false).roleSet, "family");
assert.deepEqual(plain(legacyRuntime.api.selectedConditionsForSet("family", "family")),
  ["MOM-DAD", "SISTER-BROTHER", "DAD-KID", "MOM-KID", "TEACHER-KID", "TEACHER-CLASSMATE"]);
assert.equal(legacyRuntime.api.selectedConditionsForSet("all", ""), null);

// Run exactly the current review board's 2 × 3 × 4 × 2 launch configurations.
const reviewSource = fs.readFileSync(path.join(root, "screen-share-study/home-school-review.js"), "utf8");
const reviewHost = { window: { location: { href: "https://entrance.test/screen-share-study/home-school-review.html" } }, document: null, URL };
vm.runInNewContext(reviewSource, reviewHost);
const review = reviewHost.window.FTCHomeSchoolReview;
assert.ok(review);
const entries = Array.from(review.renditionEntries());
assert.equal(entries.length, 24);
const seenReviewUrls = new Set();
const reviewCells = new Set();
let choiceCount = 0;
let storyPageCount = 0;
for (const entry of entries) {
  const matchedAcrossOrders = [];
  for (const firstContext of ["HOME", "SCHOOL"]) {
    const url = review.buildStudyUrl(entry, reviewHost.window.location.href, firstContext);
    assert.equal(url.searchParams.get("researcherTools"), "1");
    assert.equal(url.searchParams.get("syntheticSpeech"), "0");
    assert.equal(url.searchParams.get("ratingMode"), "none");
    assert.equal(url.searchParams.get("v"), CURRENT_RELEASE);
    assert.equal(url.searchParams.get("set"), "role");
    assert.ok(Object.hasOwn(ACTIVE_CONDITIONS, entry.role));
    seenReviewUrls.add(url.href);
    const { timeline, properties } = await runMain(url.search);
    const storyNodes = timeline.filter((node) => node?.data?.trial_key && node.data.story_number);
    const choices = storyNodes.filter((node) => node.data.slide_kind === "response_choices");
    assert.equal(storyNodes.length, 96, `${entry.id}/${firstContext}: twelve stories need eight pages each`);
    assert.equal(choices.length, 12, `${entry.id}/${firstContext}: wrong DV count`);
    assert.equal(properties.n_event_trials, 12);
    assert.equal(properties.n_dyads, 0);
    assert.equal(properties.rating_mode, "none");
    assert.equal(properties.role_set, entry.role);
    assert.equal(properties.design_version, CURRENT_DESIGN);
    assert.equal(properties.assignment_cell_schema, CURRENT_SCHEMA);
    const expectedCell = ["woman", "man"].indexOf(entry.role) * 6
      + ["HUG", "FOOD", "HELP"].indexOf(entry.event) * 2 + ["HOME", "SCHOOL"].indexOf(firstContext) + 1;
    assert.equal(properties.assignment_cell, expectedCell);
    assert.equal(url.searchParams.get("assignmentCell"), String(expectedCell));
    reviewCells.add(properties.assignment_cell);
    assert.equal(timeline.filter((node) => node?.data?.dyad_id || node?.data?.rating_value != null).length, 0);
    const secondContext = firstContext === "HOME" ? "SCHOOL" : "HOME";
    assert.deepEqual(choices.map((node) => node.data.context), [...Array(6).fill(firstContext), ...Array(6).fill(secondContext)]);
    assert.deepEqual(choices.map((node) => node.data.story_number), Array.from({ length: 12 }, (_, i) => i + 1));
    const blockIdentity = (block) => block.map(({ data }) => ({
      trial: data.trial_key, condition: data.condition_pairing, variant: data.variant,
      side: data.side, color: data.color, palette: data.context_palette_slug, hex: data.context_character_hex,
    }));
    const firstBlock = blockIdentity(choices.slice(0, 6));
    assert.deepEqual(blockIdentity(choices.slice(6)), firstBlock, `${entry.id}/${firstContext}: order, colors, or side changed across contexts`);
    assert.equal(new Set(firstBlock.map((story) => story.hex)).size, 6, `${entry.id}/${firstContext}: duplicate character color`);
    assert.equal(new Set(firstBlock.map((story) => story.palette)).size, 6);
    assert.deepEqual(firstBlock.map((story) => story.condition).sort(), [...ACTIVE_CONDITIONS[entry.role]].sort());
    assert.ok(firstBlock.every((story) => runtime.api.recipientKeyForCondition(story.condition) === "KID"));
    assert.ok(firstBlock.every((story) => story.side === (["a", "b"].includes(entry.variant) ? "LEFT" : "RIGHT")));
    for (let storyNumber = 1; storyNumber <= 12; storyNumber += 1) {
      const nodes = storyNodes.filter((node) => node.data.story_number === storyNumber);
      const trial = completeTrials.find((candidate) => candidate.id === nodes[0]?.data.trial_key);
      assert.ok(trial);
      assertStory(nodes, trial, entry.event, storyNumber <= 6 ? firstContext : secondContext, `${entry.id}/${firstContext}/story${storyNumber}`);
    }
    const preloaded = new Set((timeline[0]?.images || []).map((src) => String(src).split("?")[0]));
    const expectedHalls = new Set();
    for (const contextName of ["HOME", "SCHOOL"]) {
      for (const story of firstBlock) {
        const assets = runtime.api.entranceAssets(contextName, story.palette);
        expectedHalls.add(assets.hall);
        for (const src of Object.values(assets)) {
          assert.ok(fs.existsSync(path.join(root, src)), `Missing entrance asset: ${src}`);
          assert.ok(preloaded.has(src), `${entry.id}: assigned entrance image not preloaded: ${src}`);
        }
        const trial = completeTrials.find((candidate) => candidate.id === story.trial);
        const room = contextName === "HOME" ? trial.homeSchoolFurnished.homeBackground : trial.homeSchoolFurnished.schoolBackground;
        assert.ok(preloaded.has(room), `${entry.id}: assigned room not preloaded: ${room}`);
      }
    }
    assert.deepEqual([...preloaded].filter((src) => /\/(?:house|school)-hall\.webp$/.test(src)).sort(),
      [...expectedHalls].sort(), `${entry.id}: preloaded hallways differ from the selected story palettes`);
    matchedAcrossOrders.push(firstBlock);
    choiceCount += choices.length;
    storyPageCount += storyNodes.length;
  }
  assert.deepEqual(matchedAcrossOrders[0], matchedAcrossOrders[1], `${entry.id}: reversing context order changed matched story assignment`);
}
assert.equal(seenReviewUrls.size, 48);
assert.deepEqual([...reviewCells].sort((a, b) => a - b), [...assignmentCells].sort((a, b) => a - b));

// Participant sessions do not force A–D. Confirm all twelve actual conditions
// still receive six unique-color Kid-recipient stories, identically repeated.
let participantConfigurations = 0;
for (const role of ["woman", "man"]) {
  for (const event of ["HUG", "FOOD", "HELP"]) {
    for (const context of ["HOME", "SCHOOL"]) {
      const query = new URLSearchParams({ contextStudy: "1", withinChildContexts: "1", roleSet: role,
        event, context, seed: `r23-participant-${role}-${event}`, ratingMode: "none", syntheticSpeech: "0" });
      const { timeline, properties } = await runMain(`?${query}`);
      const choices = timeline.filter((node) => node?.data?.slide_kind === "response_choices");
      assert.equal(choices.length, 12);
      assert.equal(properties.role_set, role);
      assert.equal(properties.design_version, CURRENT_DESIGN);
      assert.equal(properties.assignment_cell_schema, CURRENT_SCHEMA);
      const firstBlock = choices.slice(0, 6).map((node) => node.data);
      assert.deepEqual(firstBlock.map((story) => story.condition_pairing).sort(), [...ACTIVE_CONDITIONS[role]].sort());
      assert.ok(firstBlock.every((story) => runtime.api.recipientKeyForCondition(story.condition_pairing) === "KID"));
      assert.equal(new Set(firstBlock.map((story) => story.context_palette_slug)).size, 6);
      assert.equal(new Set(firstBlock.map((story) => story.context_character_hex)).size, 6);
      assert.deepEqual(choices.slice(6).map((node) => node.data.trial_key), firstBlock.map((story) => story.trial_key));
      assert.deepEqual(choices.map((node) => node.data.context), [...Array(6).fill(context), ...Array(6).fill(context === "HOME" ? "SCHOOL" : "HOME")]);
      participantConfigurations += 1;
    }
  }
}
assert.equal(participantConfigurations, 12);

// Also run main() without a forced role, event, or context. This catches fallback
// branches that helper-level hash tests alone cannot exercise.
for (const [cell, seed] of seedForAssignmentCell) {
  const { timeline, properties } = await runMain(`?contextStudy=1&withinChildContexts=1&seed=${seed}&ratingMode=none`);
  assert.equal(properties.assignment_cell, cell);
  assert.equal(properties.assignment_cell_schema, CURRENT_SCHEMA);
  assert.equal(properties.design_version, CURRENT_DESIGN);
  const role = cell <= 6 ? "woman" : "man";
  const event = ["HUG", "FOOD", "HELP"][Math.floor(((cell - 1) % 6) / 2)];
  const context = cell % 2 ? "HOME" : "SCHOOL";
  assert.equal(properties.role_set, role);
  assert.equal(properties.event_suffix, event);
  assert.equal(properties.first_context, context);
  const choices = timeline.filter((node) => node?.data?.slide_kind === "response_choices");
  assert.equal(choices.length, 12);
  const firstBlock = choices.slice(0, 6).map((node) => node.data);
  assert.deepEqual(firstBlock.map((story) => story.condition_pairing).sort(), [...ACTIVE_CONDITIONS[role]].sort());
  assert.equal(new Set(firstBlock.map((story) => story.context_character_hex)).size, 6);
  assert.deepEqual(choices.slice(6).map((node) => node.data.trial_key), firstBlock.map((story) => story.trial_key));
}

// Preserve the full r17/r18 audit. R20 replaces two exteriors, and r22 replaces
// House/Kid/HELP; all earlier recordings remain immutable historical evidence.
const entranceRequirements = readJson("entrance_house_audio_requirements.json");
const entranceReceipt = readJson("entrance_house_audio_import_receipt.json");
const schoolOpeningRevision = readJson("school_exterior_audio_revision_r18.json");
const exteriorRevision = readJson("exterior_audio_revision_r20.json");
const eventRevision = readJson("event_audio_revision_r22.json");
const eventRevisionByReplacedOutput = new Map(eventRevision.files.map((clip) => [clip.replaces.output, clip]));
assert.equal(eventRevisionByReplacedOutput.size, 5);
assert.equal(entranceRequirements.lines.length, 25);
assert.equal(entranceReceipt.importedClipCount, 25);
assert.equal(entranceReceipt.clips.length, 25);
assert.equal(new Set(entranceReceipt.clips.map((clip) => clip.sha256)).size, 25);
assert.equal(entranceReceipt.voice, "Evelyn");
assert.equal(entranceReceipt.service, "NaturalReaders Commercial");
const originalSchoolOpening = entranceReceipt.clips.find((clip) => clip.id === "hs_r17_002");
assert.ok(originalSchoolOpening);
assert.equal(schoolOpeningRevision.displayText, originalSchoolOpening.text);
assert.equal(schoolOpeningRevision.displayText, "Oh look! Here is a school.");
const words = (text) => String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu);
assert.deepEqual(words(schoolOpeningRevision.sourceText), words(schoolOpeningRevision.displayText),
  "School opening may change delivery punctuation, but not its words");
assert.equal(schoolOpeningRevision.replaces.output, originalSchoolOpening.output);
assert.equal(schoolOpeningRevision.replaces.sha256, originalSchoolOpening.sha256);
assert.notEqual(schoolOpeningRevision.output, originalSchoolOpening.output, "Replacement must preserve the original recording");
assert.notEqual(schoolOpeningRevision.sha256, originalSchoolOpening.sha256, "School replacement must be a distinct export");
assert.match(schoolOpeningRevision.output, /^versions\/chs-home-school-evelyn-v1\/assets\/audio-r18\/[^/]+\.mp3$/);
const replacementBytes = fs.readFileSync(path.join(root, schoolOpeningRevision.output));
assert.equal(replacementBytes.length, schoolOpeningRevision.bytes);
assert.equal(createHash("sha256").update(replacementBytes).digest("hex"), schoolOpeningRevision.sha256);
assert.ok(schoolOpeningRevision.durationSeconds >= 1 && schoolOpeningRevision.durationSeconds <= 12);
assert.equal(exteriorRevision.status, "approved_for_chs_draft");
assert.equal(exteriorRevision.voice, "Evelyn");
assert.equal(exteriorRevision.style, "Soft");
assert.equal(exteriorRevision.speed, 0.9);
assert.equal(exteriorRevision.files.length, 2);
const exteriorByText = new Map(exteriorRevision.files.map((clip) => [clip.text, clip]));
assert.deepEqual([...exteriorByText.keys()].sort(), ["Oh look! Here is a house.", "Oh look! Here is a school."]);
for (const clip of exteriorRevision.files) {
  assert.deepEqual(words(clip.sourceText), words(clip.text), "Exterior words must remain unchanged");
  const bytes = fs.readFileSync(path.join(root, clip.output));
  assert.equal(bytes.length, clip.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), clip.sha256);
  assert.ok(clip.durationSeconds >= 1 && clip.durationSeconds <= 12);
}
assert.equal(contextAudio.lines.some((clip) => clip.output === schoolOpeningRevision.output), false,
  "Historical r18 school export must not remain an active mapping");
let replacedMappingCount = 0;
let replacedEventMappingCount = 0;
const atPointer = (object, pointer) => pointer.split("/").slice(1).reduce((value, key) => value[key.replace(/~1/g, "/").replace(/~0/g, "~")], object);
for (const line of entranceRequirements.lines) {
  const clip = entranceReceipt.clips.find((candidate) => candidate.id === line.id);
  assert.ok(clip, `Missing recording receipt: ${line.id}`);
  assert.equal(clip.text, line.text);
  assert.equal(clip.output, line.output);
  const bytes = fs.readFileSync(path.join(root, clip.output));
  assert.equal(bytes.length, clip.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), clip.sha256);
  assert.equal(clip.sampleRateHz, 44100);
  assert.equal(clip.channels, 1);
  assert.equal(clip.bitrateKbps, 320);
  assert.ok(clip.durationSeconds >= 1 && clip.durationSeconds <= 12);
  const replacement = exteriorByText.get(line.text);
  const eventReplacement = eventRevisionByReplacedOutput.get(clip.output);
  const activeClip = replacement || eventReplacement || clip;
  if (replacement) {
    replacedMappingCount += 1;
    assert.notEqual(activeClip.output, clip.output, "Preserve the original exterior filename");
    assert.notEqual(activeClip.sha256, clip.sha256, "Approved exterior must be a distinct export");
    assert.equal(contextAudio.lines.some((active) => active.output === clip.output), false,
      `${line.id}: superseded r17 exterior remains active`);
  }
  if (eventReplacement) {
    replacedEventMappingCount += 1;
    assert.equal(line.id, "hs_r17_009", "Only House/Kid/HELP is an r22 replacement of an r17 event");
    assert.equal(eventReplacement.replaces.sha256, clip.sha256);
    const revisedBytes = fs.readFileSync(path.join(root, eventReplacement.output));
    assert.equal(revisedBytes.length, eventReplacement.bytes);
    assert.equal(createHash("sha256").update(revisedBytes).digest("hex"), eventReplacement.sha256);
    assert.equal(contextAudio.lines.some((active) => active.output === clip.output), false,
      "Superseded House/HELP event must not remain active");
  }
  const activeMappings = contextAudio.lines.filter((active) => active.text === line.text && active.active !== false);
  assert.equal(activeMappings.length, 1, `Narration must have exactly one active mapping: ${line.id}`);
  assert.equal(activeMappings[0].output, activeClip.output, `Unexpected audio mapping: ${line.id}`);
  assert.equal(activeMappings[0].sha256, activeClip.sha256, `Unexpected mapped audio hash: ${line.id}`);
  assert.equal(runtime.api.canonicalAudioPathForText(line.text), activeClip.output,
    `Runtime canonical mapping differs from the approved recording: ${line.id}`);
  for (const target of line.contextManifestLocations || []) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, target.manifest), "utf8"));
    assert.equal(atPointer(manifest, target.textPointer), line.text);
    assert.equal(atPointer(manifest, target.audioPointer), activeClip.output);
  }
  if (clip.replaces?.sha256) {
    const original = fs.readFileSync(path.join(root, clip.replaces.output));
    assert.equal(createHash("sha256").update(original).digest("hex"), clip.replaces.sha256, `Original recording changed: ${clip.replaces.output}`);
  }
}
assert.equal(replacedMappingCount, 2, "Only the two approved exterior lines may replace r17 audio mappings");
assert.equal(replacedEventMappingCount, 1, "Exactly one approved r22 event supersedes an r17 event");

// Deleting a required approved mapping must fail closed, even when someone
// adds the visual-only query flag without researcher mode.
for (const contextName of ["HOME", "SCHOOL"]) {
  for (const mode of ["participant", "participant-flag", "researcher", "researcher-visual"]) {
    const params = new URLSearchParams({ contextStudy: "1", context: contextName });
    if (mode.startsWith("researcher")) params.set("researcherTools", "1");
    if (mode.endsWith("flag") || mode.endsWith("visual")) params.set("entranceVisualOnly", "1");
    const { api } = loadRuntime(`?${params}`);
    configure(api, contextName, "HUG");
    const exteriorText = `Oh look! Here is a ${contextName === "HOME" ? "house" : "school"}.`;
    const roomText = `This is a room inside the ${contextName === "HOME" ? "house" : "school"}.`;
    assert.equal(api.entranceNarrationSpec(contextName, "exterior").text, exteriorText);
    assert.equal(api.entranceNarrationSpec(contextName, "room").text, roomText);
    api.deleteAudio(exteriorText);
    api.deleteAudio(roomText);
    const missing = Array.from(api.missingContextAudioForPlan(completeTrials, "HUG", contextName));
    assert.ok(missing.includes(exteriorText), `${mode}: missing exterior narration not detected`);
    assert.ok(missing.includes(roomText), `${mode}: missing room narration not detected`);
    if (mode === "researcher-visual") {
      assert.doesNotThrow(() => api.assertParticipantContextAudioCoverage(completeTrials, "HUG", contextName));
    } else {
      assert.throws(() => api.assertParticipantContextAudioCoverage(completeTrials, "HUG", contextName), /not ready|missing|record/i,
        `${mode}: unauthorized silent entrance bypass`);
    }
  }
}

// Exercise actual page audio routing too: the visual flag alone must neither
// silence the exterior nor suppress its normal advance-after-narration timer.
for (const researcher of [false, true]) {
  const host = loadRuntime(`?contextStudy=1&context=HOME&entranceVisualOnly=1${researcher ? "&researcherTools=1" : ""}`);
  configure(host.api, "HOME", "HUG");
  const scheduled = new Map();
  let nextTimer = 0;
  host.context.window.setTimeout = (callback, delay) => { scheduled.set(++nextTimer, { callback, delay }); return nextTimer; };
  host.context.window.clearTimeout = (timer) => scheduled.delete(timer);
  const calls = [];
  host.api.audio.playFile = async (src, text) => { calls.push({ src, text }); return true; };
  const nodes = Array.from(host.api.buildEventTrialNodes({}, completeTrials[0], 0, 12, "HUG", "events", 1, "HOME", 1, 1));
  const exterior = nodes[0];
  assert.equal(exterior.data.entrance_visual_only, researcher);
  exterior.on_load();
  const startup = [...scheduled.entries()].find(([, timer]) => timer.delay === 250);
  assert.ok(startup);
  scheduled.delete(startup[0]);
  startup[1].callback();
  await new Promise(setImmediate);
  assert.equal(calls.length, researcher ? 0 : 1);
  if (!researcher) assert.equal(calls[0].text, "Oh look! Here is a house.");
  assert.equal([...scheduled.values()].some((timer) => timer.delay === 1200), !researcher);
  exterior.on_finish({});
  assert.equal(scheduled.size, 0, "Page teardown must cancel outstanding timers");
}

// Drive real animation state with a deterministic clock. Completion, skipping,
// pausing, reduced motion, and cleanup must settle without orphaned frames.
function animationElement() {
  const children = new Map();
  for (const name of ["world", "backing", "hall", "fade", "doorway", "door-left", "door-right"]) {
    children.set(`.ksize-entry-${name}`, { style: {}, hidden: false, offsetHeight: 200 });
  }
  return {
    dataset: {}, attributes: {}, children,
    querySelector: (selector) => children.get(selector) || null,
    setAttribute(name, value) { this.attributes[name] = value; },
  };
}
for (const contextName of ["HOME", "SCHOOL"]) {
  const host = loadRuntime();
  const element = animationElement();
  const controller = host.api.entranceController(element, contextName);
  const playback = controller.play();
  for (const [timestamp, phase] of [[0, "approaching"], [4000, "opening"], [5500, "crossing_doorway"], [6500, "entry_hall"], [8000, "moving_through_hall"], [9600, "entering_room"], [10100, "empty_room"]]) {
    host.tick(timestamp);
    assert.equal(element.dataset.phase, phase, `${contextName}: animation phase at ${timestamp}`);
  }
  assert.equal(await playback, true);
  assert.equal(host.frames.size, 0);
  assert.equal(element.dataset.entranceProgress, "1");
  assert.equal(element.attributes["aria-label"], `Room inside the ${contextName === "HOME" ? "house" : "school"}; no characters are visible`);
  assert.ok(element.children.get(".ksize-entry-world").hidden);
  assert.ok(element.children.get(".ksize-entry-backing").hidden);

  const pausedPlayback = controller.play();
  host.tick(11100);
  assert.equal(controller.pause(), true);
  assert.equal(host.frames.size, 0);
  assert.equal(controller.pause(), false);
  assert.equal(host.frames.size, 1);
  controller.skip();
  assert.equal(await pausedPlayback, true);
  assert.equal(host.frames.size, 0);

  const abandoned = controller.play();
  controller.destroy();
  assert.equal(await abandoned, false);
  assert.equal(host.frames.size, 0);

  host.mediaQuery.matches = true;
  const reduced = host.api.entranceController(animationElement(), contextName);
  assert.equal(await reduced.play(), true);
  assert.equal(host.frames.size, 0);
  reduced.destroy();
}

// The actual room page must finish its entrance before saying the room line.
// Replay cancels the first entrance; unloading cancels the restarted one.
for (const contextName of ["HOME", "SCHOOL"]) {
  const host = loadRuntime(`?contextStudy=1&context=${contextName}`);
  configure(host.api, contextName, "HUG");
  const element = animationElement();
  const handlers = {};
  const replayButton = { addEventListener(type, callback) { handlers[type] = callback; } };
  const caption = { textContent: "" };
  host.context.document.querySelector = (selector) => ({
    ".ksize-entry-layers": element,
    ".ksize-audio-btn": replayButton,
    ".ksize-context-spoken-banner": caption,
  })[selector] || null;
  const scheduled = new Map();
  let nextTimer = 0;
  host.context.window.setTimeout = (callback, delay) => { scheduled.set(++nextTimer, { callback, delay }); return nextTimer; };
  host.context.window.clearTimeout = (id) => scheduled.delete(id);
  const calls = [];
  host.api.audio.playFile = async (src, text) => { calls.push({ src, text }); return true; };
  const nodes = Array.from(host.api.buildEventTrialNodes({}, completeTrials[0], 0, 12, "HUG", "events", 1, contextName, 1, 1));
  const room = nodes[1];
  room.on_load();
  const startup = [...scheduled.entries()].find(([, timer]) => timer.delay === 250);
  assert.ok(startup);
  scheduled.delete(startup[0]);
  startup[1].callback();
  await new Promise(setImmediate);
  assert.equal(calls.length, 0, "Room narration began before the entrance animation");
  assert.equal(caption.textContent, host.api.entranceNarrationSpec(contextName, "exterior").text);
  host.tick(5000);
  handlers.click();
  await new Promise(setImmediate);
  host.tick(10100);
  await new Promise(setImmediate);
  assert.equal(calls.length, 0, "Cancelled first entrance leaked its room narration during replay");
  host.tick(15100);
  await new Promise(setImmediate);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].text, host.api.entranceNarrationSpec(contextName, "room").text);
  assert.equal(caption.textContent, calls[0].text);
  handlers.click();
  await new Promise(setImmediate);
  room.on_finish({});
  assert.equal(host.frames.size, 0);
  assert.equal(scheduled.size, 0);
  host.tick(25200);
  await new Promise(setImmediate);
  assert.equal(calls.length, 1, "An unloaded room page leaked narration");
}

console.log(JSON.stringify({
  status: "PASS",
  sourceTrials: completeTrials.length,
  activePairings: activePairings.size,
  eligibleSourceTrials: eligibleTrials.length,
  assignmentCells: assignmentCells.size,
  rejectedObsoleteMainOverrides: rejectedMainOverrides,
  unforcedVariantParticipantConfigurations: participantConfigurations,
  fullyHashedParticipantConfigurations: seedForAssignmentCell.size,
  activeRecipientsAllKid: true,
  sourceEventContextStories: sourceStoryCount,
  importedEntranceHouseRecordings: entranceReceipt.clips.length,
  approvedExteriorOpeningRecordings: replacedMappingCount,
  hallwayPalettesPerContext: expectedPalettes.length,
  matchedHallwaysAndCorrectedSchoolRooms: true,
  reviewConfigurations: seenReviewUrls.size,
  helperChoicesAcrossReviewConfigurations: choiceCount,
  storyPagesAcrossReviewConfigurations: storyPageCount,
  pagesPerStory: 8,
  likertPages: 0,
  matchedContextBlocks: true,
  directionalRevealOrder: true,
  audioReadinessFailsClosed: true,
  researcherOnlyVisualBypass: true,
  animationLifecycle: true,
  roomNarrationWaitsForEntrance: true,
  replayAndTeardownCancelStaleNarration: true,
  browserVisualVerification: "not performed by this test",
}, null, 2));
