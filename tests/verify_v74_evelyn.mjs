import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(projectRoot, "app.js");
const indexPath = path.join(projectRoot, "index.html");
const stylesPath = path.join(projectRoot, "styles.css");
const eventManifestPath = path.join(projectRoot, "data", "ksize_manifest.json");
const dyadManifestPath = path.join(projectRoot, "data", "dyad_manifest.json");
const evelynManifestPath = path.join(projectRoot, "data", "canonical_audio_manifest_evelyn.json");
const evelynAudioDir = path.join(projectRoot, "audio_evelyn");

const EXPECTED_EVELYN_CLIPS = 158;
const EXPECTED_SCENARIOS = 18;

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function normalizePathname(filename) {
  return String(filename || "").split("?")[0].replace(/^\.\//, "");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(filename) {
  return JSON.parse(await fs.readFile(filename, "utf8"));
}

function loadAppForVerification(appSource, search = "") {
  const mainCallIndex = appSource.lastIndexOf("\nmain().catch(");
  assert(mainCallIndex > 0, "Could not isolate app.js from its final main() call");

  const speechCalls = [];
  const constructedAudio = [];
  const classList = { add() {}, remove() {} };

  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.currentTime = 0;
      this.listeners = new Map();
      constructedAudio.push(src);
    }

    addEventListener(type, callback) {
      this.listeners.set(type, callback);
    }

    pause() {}

    play() {
      return Promise.reject(new Error("Expected verification audio-load failure"));
    }
  }

  class FakeSpeechSynthesisUtterance {
    constructor(text) {
      this.text = text;
      this.listeners = new Map();
    }

    addEventListener(type, callback) {
      this.listeners.set(type, callback);
    }
  }

  const windowObject = {
    location: {
      search,
      href: `https://example.test/index.html${search}`,
    },
    KSIZE_RUNTIME_CONFIG: {},
    KSIZE_ASSET_BASE_URL: "",
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    speechSynthesis: {
      getVoices: () => [],
      addEventListener() {},
      cancel() {},
      speak(utterance) {
        speechCalls.push(utterance.text);
      },
    },
  };
  windowObject.parent = windowObject;

  const context = vm.createContext({
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
    window: windowObject,
    document: {
      body: { classList },
      querySelectorAll: () => [],
      querySelector: () => null,
      createElement: () => ({
        addEventListener() {},
        append() {},
        remove() {},
        click() {},
        classList,
      }),
    },
    navigator: { userAgent: "v74-verification" },
    localStorage: { setItem() {} },
    Audio: FakeAudio,
    SpeechSynthesisUtterance: FakeSpeechSynthesisUtterance,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  });

  const exportSource = `
    ;globalThis.__FTC_VERIFY__ = {
      requestedVoiceProfile,
      CANONICAL_AUDIO_MANIFEST_URL,
      AUDIO_VERSION,
      PREFERRED_AUDIO_DIR,
      useSyntheticSpeech,
      ENABLE_CHILD_ASSENT,
      CORE_CONDITIONS,
      MAN_ROLE_CONDITIONS,
      FAMILY_ROLE_CONDITIONS,
      EVENT_SUFFIXES,
      CONDITION_DYAD_FOLDERS,
      OPTION_LABELS,
      CHOICE_CONFIRMATION_TEXT,
      FOLLOWUP_TEXT_BY_SCRIPT,
      TEACHER_BOX_QUESTION_TEXT,
      FOLLOWUP_MEET_TEXT,
      START_INTRO_TEXT,
      GAME_START_TEXT,
      PARENT_WELCOME_TEXT,
      PARENT_QUICK_CHECKS_TEXT,
      PARENT_CAMERA_TEXT,
      PARENT_HANDOFF_TEXT,
      CHILD_ASSENT_TEXT,
      CHILD_GROWNUP_HANDOFF_TEXT,
      FINAL_GROWNUP_TEXT,
      ALL_DONE_AUDIO_SEQUENCE,
      normalizeAudioText,
      normalizeAudioSrc,
      installCanonicalAudioMap,
      canonicalAudioPathForText,
      canonicalAudioPathForSrc,
      audioTextForSlide,
      questionTextForResponse,
      ratingFocusLabel,
      playReviewNarration,
      makeKidNode,
      buildEventTrialNodes,
      makeFollowupTransitionNode,
      makeSlideNode,
      makePartBreakNode,
      audio,
    };
  `;

  const script = new vm.Script(`${appSource.slice(0, mainCallIndex)}\n${exportSource}`, {
    filename: appPath,
  });
  script.runInContext(context);
  return {
    app: context.__FTC_VERIFY__,
    speechCalls,
    constructedAudio,
  };
}

function reachableDyadChunks(app, dyadManifest, conditions) {
  const chunks = [];
  const seenIds = new Set();
  for (const condition of conditions) {
    for (const request of app.CONDITION_DYAD_FOLDERS[condition] || []) {
      const folderCandidates = dyadManifest.chunks.filter((chunk) => chunk.folder === request.folder);
      const sourceCandidates = request.sourceKey
        ? folderCandidates.filter((chunk) => chunk.sourceKey === request.sourceKey)
        : [];
      const candidates = sourceCandidates.length ? sourceCandidates : folderCandidates;
      for (const chunk of candidates) {
        if (seenIds.has(chunk.id)) continue;
        seenIds.add(chunk.id);
        chunks.push(chunk);
      }
    }
  }
  return chunks;
}

function runtimeTextCollector(app, expectedOutputs) {
  const all = new Map();
  const missing = [];
  const add = (text, context, scenarioTexts = null) => {
    const normalized = app.normalizeAudioText(text);
    if (!normalized) return;
    const resolved = normalizePathname(app.canonicalAudioPathForText(text));
    if (!resolved || !expectedOutputs.has(resolved)) {
      missing.push({ text, context, resolved });
    }
    if (!all.has(normalized)) all.set(normalized, { text, contexts: [] });
    all.get(normalized).contexts.push(context);
    scenarioTexts?.add(normalized);
  };
  return { all, missing, add };
}

const [appSource, indexSource, stylesSource, eventManifest, dyadManifest, evelynManifest] = await Promise.all([
  fs.readFile(appPath, "utf8"),
  fs.readFile(indexPath, "utf8"),
  fs.readFile(stylesPath, "utf8"),
  readJson(eventManifestPath),
  readJson(dyadManifestPath),
  readJson(evelynManifestPath),
]);

// Compiling the isolated source is also a syntax check for app.js.
const participantRuntime = loadAppForVerification(appSource, "");
const explicitParticipantRuntime = loadAppForVerification(appSource, "?syntheticSpeech=0");
const app = participantRuntime.app;

assert(app.requestedVoiceProfile === "", "Default participant profile unexpectedly selected a non-Evelyn voice");
assert(normalizePathname(app.CANONICAL_AUDIO_MANIFEST_URL) === "data/canonical_audio_manifest_evelyn.json",
  `Default participant manifest is ${app.CANONICAL_AUDIO_MANIFEST_URL}, not the Evelyn manifest`);
assert(app.AUDIO_VERSION === "evelyn-full-v74",
  `Expected AUDIO_VERSION evelyn-full-v74, found ${app.AUDIO_VERSION}`);
assert(/styles\.css\?v=chs-polish-v76/.test(indexSource), "index.html does not request v76 styles");
assert(/app\.js\?v=chs-polish-v76/.test(indexSource), "index.html does not request v76 app.js");
assert(appSource.includes("sister-kid_01_mks-orange/sister-kid.007.png"),
  "The isolated orange LOVE-2 outline correction target is missing");
assert(appSource.includes("sister-kid_01_mks-orange/sister-kid.006.png"),
  "The correct orange outline reference is missing");
assert(stylesSource.includes(".ksize-orange-outline-reference"),
  "The exact orange outline overlay style is missing");

const evelynLines = evelynManifest.evelynLines || [];
const normalizedTextToOutput = evelynManifest.normalizedTextToOutput || {};
assert(evelynManifest.evelynImport?.clipCount === EXPECTED_EVELYN_CLIPS,
  `Manifest metadata reports ${evelynManifest.evelynImport?.clipCount} clips, expected ${EXPECTED_EVELYN_CLIPS}`);
assert(evelynLines.length === EXPECTED_EVELYN_CLIPS,
  `Manifest contains ${evelynLines.length} Evelyn lines, expected ${EXPECTED_EVELYN_CLIPS}`);
assert(Object.keys(normalizedTextToOutput).length === EXPECTED_EVELYN_CLIPS,
  `Manifest contains ${Object.keys(normalizedTextToOutput).length} normalized mappings, expected ${EXPECTED_EVELYN_CLIPS}`);

const expectedOutputs = new Set();
const expectedFilenames = new Set();
const seenNormalizedTexts = new Set();
let totalAudioBytes = 0;
for (const [index, line] of evelynLines.entries()) {
  const expectedId = `ftc_${String(index + 1).padStart(3, "0")}`;
  assert(line.id === expectedId, `Expected line ID ${expectedId}, found ${line.id}`);
  assert(line.normalizedText === app.normalizeAudioText(line.text),
    `${line.id}: stored normalized text disagrees with app.js normalization`);
  assert(!seenNormalizedTexts.has(line.normalizedText), `${line.id}: duplicate normalized text`);
  seenNormalizedTexts.add(line.normalizedText);
  assert(normalizedTextToOutput[line.normalizedText] === line.output,
    `${line.id}: normalized-text mapping does not point to ${line.output}`);
  assert(normalizePathname(line.output).startsWith("audio_evelyn/"),
    `${line.id}: output is outside audio_evelyn: ${line.output}`);
  assert(!expectedOutputs.has(line.output), `${line.id}: duplicate output ${line.output}`);
  expectedOutputs.add(line.output);
  const filename = path.basename(line.output);
  assert(!expectedFilenames.has(filename), `${line.id}: duplicate filename ${filename}`);
  expectedFilenames.add(filename);

  const audioBuffer = await fs.readFile(path.join(projectRoot, line.output));
  assert(audioBuffer.length > 0, `${line.id}: MP3 is empty`);
  assert(audioBuffer.length === line.bytes,
    `${line.id}: expected ${line.bytes} bytes, found ${audioBuffer.length}`);
  assert(sha256(audioBuffer) === line.sha256, `${line.id}: MP3 hash disagrees with manifest`);
  totalAudioBytes += audioBuffer.length;
}

const actualAudioFilenames = (await fs.readdir(evelynAudioDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp3"))
  .map((entry) => entry.name)
  .sort();
assert(actualAudioFilenames.length === EXPECTED_EVELYN_CLIPS,
  `audio_evelyn contains ${actualAudioFilenames.length} MP3s, expected ${EXPECTED_EVELYN_CLIPS}`);
assert(actualAudioFilenames.every((filename) => expectedFilenames.has(filename)),
  "audio_evelyn contains an MP3 that is not in the Evelyn manifest");

app.installCanonicalAudioMap(evelynManifest);
for (const line of evelynLines) {
  const resolved = normalizePathname(app.canonicalAudioPathForText(line.text));
  assert(resolved === line.output,
    `${line.id}: app resolves ${JSON.stringify(line.text)} to ${resolved || "nothing"}, expected ${line.output}`);
}

// Exercise every randomized role/event combination in both timeline modes.
// Candidate variants are all included so color/variant randomization cannot hide a missing line.
const roleProfiles = [
  { name: "woman-girl", conditions: app.CORE_CONDITIONS },
  { name: "man-boy", conditions: app.MAN_ROLE_CONDITIONS },
  { name: "mixed-family-teacher", conditions: app.FAMILY_ROLE_CONDITIONS },
];
const ratingModes = ["one-after-story", "all-pairs"];
const collector = runtimeTextCollector(app, expectedOutputs);
const scenarioSummaries = [];

const addSupportNarration = (scenarioLabel, scenarioTexts) => {
  const supportTexts = [
    app.PARENT_WELCOME_TEXT,
    app.PARENT_QUICK_CHECKS_TEXT,
    app.PARENT_CAMERA_TEXT,
    app.PARENT_HANDOFF_TEXT,
    app.START_INTRO_TEXT,
    ...app.ALL_DONE_AUDIO_SEQUENCE.map((line) => line.text),
    app.CHILD_GROWNUP_HANDOFF_TEXT,
    app.FINAL_GROWNUP_TEXT,
  ];
  supportTexts.forEach((text) => collector.add(text, `${scenarioLabel}:support`, scenarioTexts));
  if (app.ENABLE_CHILD_ASSENT) {
    collector.add(app.CHILD_ASSENT_TEXT, `${scenarioLabel}:child-assent`, scenarioTexts);
  }
};

for (const roleProfile of roleProfiles) {
  for (const eventSuffix of app.EVENT_SUFFIXES) {
    for (const ratingMode of ratingModes) {
      const scenarioLabel = `${roleProfile.name}/${eventSuffix}/${ratingMode}`;
      const scenarioTexts = new Set();
      addSupportNarration(scenarioLabel, scenarioTexts);

      const candidateTrials = eventManifest.trials.filter((trial) =>
        trial.isComplete && roleProfile.conditions.includes(trial.blocks.INTRO?.condition)
      );
      for (const condition of roleProfile.conditions) {
        assert(candidateTrials.some((trial) => trial.blocks.INTRO?.condition === condition),
          `${scenarioLabel}: no complete event trial for ${condition}`);
      }

      for (const trial of candidateTrials) {
        for (const slide of trial.blocks.INTRO?.introSlides || []) {
          collector.add(slide.text, `${scenarioLabel}:${trial.id}:INTRO`, scenarioTexts);
        }
        const block = trial.blocks[eventSuffix];
        assert(block, `${scenarioLabel}:${trial.id} is missing ${eventSuffix}`);
        const lines = String(block.text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
        lines.forEach((text, lineIndex) => {
          collector.add(text, `${scenarioLabel}:${trial.id}:${eventSuffix}:line-${lineIndex + 1}`, scenarioTexts);
        });

        // Choice pages carry several narration lines in one node. Verify the
        // corresponding text for every segment; this lets the app resolve each
        // line from the complete Evelyn text map even when a legacy source file
        // never appeared in the old 73-line canonical manifest.
        if (block.choices?.length) {
          const storyImageCount = block.images.slice(0, -1).length;
          const responseLines = lines.slice(storyImageCount);
          const responseAudio = (block.audioSegments || []).slice(storyImageCount);
          const questionLines = responseLines.slice(0, -1);
          const questionAudio = responseAudio.slice(0, -1);
          questionAudio.forEach((src, index) => {
            const expected = normalizePathname(app.canonicalAudioPathForText(questionLines[index]));
            const resolved = normalizePathname(app.canonicalAudioPathForSrc(src));
            assert(expectedOutputs.has(expected),
              `${scenarioLabel}:${trial.id}: question text does not resolve to Evelyn: ${questionLines[index]}`);
            if (resolved) {
              assert(resolved === expected,
                `${scenarioLabel}:${trial.id}: legacy source ${src} resolves to ${resolved}, expected ${expected}`);
            }
          });
        }

        if (ratingMode === "one-after-story") {
          for (const choice of block.choices || []) {
            const choiceText = app.CHOICE_CONFIRMATION_TEXT[String(choice.label || "").toUpperCase()];
            assert(choiceText, `${scenarioLabel}:${trial.id}: no confirmation for ${choice.label}`);
            collector.add(choiceText, `${scenarioLabel}:${trial.id}:choice-confirmation`, scenarioTexts);
          }
        }
      }

      const chunks = reachableDyadChunks(app, dyadManifest, roleProfile.conditions);
      assert(chunks.length > 0, `${scenarioLabel}: no reachable dyad chunks`);
      for (const chunk of chunks) {
        for (const slide of chunk.slides.filter((candidate) => candidate.kind === "intro")) {
          collector.add(slide.text, `${scenarioLabel}:${chunk.scriptKey}:intro`, scenarioTexts);
        }
        for (const slide of chunk.slides.filter((candidate) => candidate.kind === "response")) {
          const questionText = app.questionTextForResponse(chunk, slide);
          assert(questionText, `${scenarioLabel}:${chunk.scriptKey}:${slide.trait} has no question text`);
          collector.add(questionText, `${scenarioLabel}:${chunk.scriptKey}:${slide.trait}:question`, scenarioTexts);
          collector.add(app.audioTextForSlide(slide),
            `${scenarioLabel}:${chunk.scriptKey}:${slide.trait}:scale`, scenarioTexts);
        }
        if (ratingMode === "one-after-story") {
          const followupText = app.FOLLOWUP_TEXT_BY_SCRIPT[chunk.scriptKey];
          assert(followupText, `${scenarioLabel}: no follow-up orientation for ${chunk.scriptKey}`);
          collector.add(followupText, `${scenarioLabel}:${chunk.scriptKey}:follow-up`, scenarioTexts);
          collector.add(app.FOLLOWUP_MEET_TEXT, `${scenarioLabel}:meet-transition`, scenarioTexts);
        }
      }

      if (ratingMode === "all-pairs") {
        collector.add(app.GAME_START_TEXT, `${scenarioLabel}:game-1`, scenarioTexts);
        collector.add("Game 2. Hit the green button to start.", `${scenarioLabel}:game-2`, scenarioTexts);
      }

      scenarioSummaries.push({
        scenario: scenarioLabel,
        uniqueNarrationTexts: scenarioTexts.size,
        candidateTrials: candidateTrials.length,
        reachableDyadChunks: chunks.length,
      });
    }
  }
}

assert(scenarioSummaries.length === EXPECTED_SCENARIOS,
  `Exercised ${scenarioSummaries.length} scenarios, expected ${EXPECTED_SCENARIOS}`);
assert(collector.missing.length === 0,
  `Runtime narration did not resolve:\n${collector.missing.map((item) =>
    `- ${item.context}: ${JSON.stringify(item.text)} -> ${item.resolved || "nothing"}`).join("\n")}`);
assert(collector.all.size === 155,
  `Expected 155 unique reachable narration strings across roles/events/modes, found ${collector.all.size}`);

// The three remaining package lines are intentional defensive/inactive paths;
// all are still installed and verified above, yielding the complete 158-clip set.
const reachableNormalized = new Set(collector.all.keys());
const packageOnlyLines = evelynLines.filter((line) => !reachableNormalized.has(line.normalizedText));
assert(packageOnlyLines.length === 3,
  `Expected 3 package-only lines, found ${packageOnlyLines.length}`);
assert(packageOnlyLines.filter((line) => line.runtimeGroup === "defensive_fallbacks").length === 2,
  "Expected two defensive fallback clips outside valid randomized paths");
assert(packageOnlyLines.filter((line) => line.runtimeGroup === "inactive_optional").length === 1,
  "Expected one disabled child-assent clip outside valid randomized paths");

// Teacher-teacher wording must resolve to the explicit target labels, not the
// ambiguous generic teacher questions from the source dyad manifest.
const teacherChunk = dyadManifest.chunks.find((chunk) => chunk.scriptKey === "teacher-TEACHER");
assert(teacherChunk, "teacher-TEACHER dyad chunk is missing");
const teacherQuestionTexts = teacherChunk.slides
  .filter((slide) => slide.kind === "response")
  .map((slide) => app.questionTextForResponse(teacherChunk, slide));
assert(teacherQuestionTexts.length === 5, `Expected five teacher-teacher questions, found ${teacherQuestionTexts.length}`);
assert(teacherQuestionTexts.every((text) => /teacher inside the box/i.test(text)),
  "A teacher-teacher question does not identify the teacher inside the box");
assert(teacherQuestionTexts.slice(0, 2).every((text) => /other teacher/i.test(text)),
  "Teacher-teacher love/like wording does not identify the other teacher");
assert(app.FOLLOWUP_TEXT_BY_SCRIPT["teacher-TEACHER"] ===
  "Now let's answer some questions about the teacher inside the box and the other teacher.",
  "Teacher-teacher follow-up orientation is not the approved wording");
assert(app.ratingFocusLabel(teacherChunk) ===
  "Questions are about the teacher inside the box, not the other teacher.",
  "Teacher-teacher persistent focus label is not explicit");
for (const text of [...teacherQuestionTexts, app.FOLLOWUP_TEXT_BY_SCRIPT["teacher-TEACHER"]]) {
  const resolved = normalizePathname(app.canonicalAudioPathForText(text));
  assert(expectedOutputs.has(resolved) && resolved.startsWith("audio_evelyn/"),
    `Teacher-teacher narration does not resolve to Evelyn: ${JSON.stringify(text)}`);
}

const followupSource = app.makeFollowupTransitionNode.toString();
assert(followupSource.includes("playReviewNarration(FOLLOWUP_MEET_TEXT)"),
  "The displayed ‘First, we’ll meet…’ transition is not wired for narration");
assert(followupSource.includes('finishTransition("auto_continue", "followup_transition_auto")'),
  "The narrated follow-up transition does not auto-advance");
assert(followupSource.includes("AUTO_ADVANCE_PAUSE_MS"),
  "The follow-up transition does not pause after narration before auto-advancing");
assert(app.playReviewNarration.toString().includes("audio.play(text)"),
  "Reviewer-added narration does not route through prerecorded audio.play(text)");

const makeSlideSource = app.makeSlideNode.toString();
assert(makeSlideSource.includes('finishSlide({ response: "auto_next" }, TRIAL_ADVANCE_VALUES.next, "auto_next_page")'),
  "Narration-only paired-question slides do not auto-advance");
assert(makeSlideSource.includes('if (slide.kind === "response")'),
  "Paired-question response slides are not distinguished from narration-only slides");
assert(makeSlideSource.includes("AUTO_ADVANCE_PAUSE_MS"),
  "Narration-only paired-question slides do not pause before auto-advancing");
assert(makeSlideSource.includes("if (!narrationPlayed) return"),
  "A failed paired-question narration can be silently skipped");

const makeKidSource = app.makeKidNode.toString();
const buildEventSource = app.buildEventTrialNodes.toString();
assert(makeKidSource.includes("audioTexts.map"),
  "Event nodes do not pair each narration segment with its runtime text");
assert(makeKidSource.includes("for (const [index, item] of narrationItems.entries())"),
  "Event narration items are not played sequentially");
assert(buildEventSource.includes("audioTexts: [...questionLines, optionLine]"),
  "Choice pages do not pass both question and options text to the audio player");

// No valid participant timeline calls audio.speak directly. The only remaining
// browser synthesis call is the explicit researcher opt-in fallback in playSpeech.
const directAudioSpeakCalls = [...appSource.matchAll(/\baudio\.speak\s*\(/g)];
assert(directAudioSpeakCalls.length === 0,
  `Found ${directAudioSpeakCalls.length} direct audio.speak call(s) in app.js`);
assert(app.useSyntheticSpeech === false, "Synthetic speech is enabled by default");
assert(explicitParticipantRuntime.app.useSyntheticSpeech === false,
  "syntheticSpeech=0 unexpectedly enables browser speech");

app.installCanonicalAudioMap(evelynManifest);
explicitParticipantRuntime.app.installCanonicalAudioMap(evelynManifest);
await app.audio.playFile("missing-verification-file.mp3", "This deliberately has no mapping.");
await explicitParticipantRuntime.app.audio.playFile(
  "missing-verification-file.mp3",
  "This deliberately has no mapping."
);
assert(participantRuntime.speechCalls.length === 0,
  `Default participant fallback called browser speech ${participantRuntime.speechCalls.length} time(s)`);
assert(explicitParticipantRuntime.speechCalls.length === 0,
  `syntheticSpeech=0 fallback called browser speech ${explicitParticipantRuntime.speechCalls.length} time(s)`);

const result = {
  status: "PASS",
  version: app.AUDIO_VERSION,
  manifest: path.relative(projectRoot, evelynManifestPath),
  evelynMp3Files: actualAudioFilenames.length,
  evelynManifestLines: evelynLines.length,
  normalizedTextMappings: Object.keys(normalizedTextToOutput).length,
  verifiedAudioBytes: totalAudioBytes,
  runtimeScenarioCount: scenarioSummaries.length,
  runtimeRoleProfiles: roleProfiles.map((profile) => profile.name),
  runtimeEvents: app.EVENT_SUFFIXES,
  runtimeModes: ratingModes,
  runtimeUniqueNarrationTexts: collector.all.size,
  packageOnlyLines: packageOnlyLines.map((line) => ({
    id: line.id,
    runtimeGroup: line.runtimeGroup,
    text: line.text,
  })),
  teacherTeacherQuestions: teacherQuestionTexts.length,
  directAudioSpeakCalls: directAudioSpeakCalls.length,
  participantBrowserSpeechCallsOnForcedAudioFailure:
    participantRuntime.speechCalls.length + explicitParticipantRuntime.speechCalls.length,
  scenarioSummaries,
};

console.log(JSON.stringify(result, null, 2));
