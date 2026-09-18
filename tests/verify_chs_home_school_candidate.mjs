import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidateRoot = path.join(root, "versions", "chs-home-school-evelyn-v1");
const dataRoot = path.join(candidateRoot, "data");
const indexHtml = fs.readFileSync(path.join(candidateRoot, "index.html"), "utf8");
const app = fs.readFileSync(path.join(candidateRoot, "app.js"), "utf8");
const metadata = JSON.parse(fs.readFileSync(path.join(candidateRoot, "candidate.json"), "utf8"));
const contextManifest = JSON.parse(fs.readFileSync(path.join(dataRoot, "home_school_context_manifest.json"), "utf8"));
const homeSchoolAudio = JSON.parse(fs.readFileSync(path.join(dataRoot, "home_school_audio_manifest.json"), "utf8"));
const missingAudio = JSON.parse(fs.readFileSync(path.join(dataRoot, "missing_home_school_directional_audio_manifest.json"), "utf8"));
const directionalAudioReceipt = JSON.parse(fs.readFileSync(path.join(dataRoot, "directional_audio_import_receipt.json"), "utf8"));
const contextFirstQuestionReceipt = JSON.parse(fs.readFileSync(path.join(dataRoot, "context_first_question_audio_import_receipt.json"), "utf8"));
const entranceHouseReceipt = JSON.parse(fs.readFileSync(path.join(dataRoot, "entrance_house_audio_import_receipt.json"), "utf8"));
const entranceHouseByReplacedOutput = new Map(entranceHouseReceipt.clips.filter((clip) => clip.replaces).map((clip) => [clip.replaces.output, clip]));
const historicalPauseManifest = JSON.parse(fs.readFileSync(path.join(dataRoot, "home_school_question_pause_manifest.json"), "utf8"));
const canonicalAudio = JSON.parse(fs.readFileSync(path.join(dataRoot, "canonical_audio_manifest_evelyn.json"), "utf8"));
const teacherClassmateAudio = JSON.parse(fs.readFileSync(path.join(dataRoot, "teacher_classmate_audio_manifest.json"), "utf8"));
const eventManifest = JSON.parse(fs.readFileSync(path.join(dataRoot, "ksize_manifest.json"), "utf8"));
const dyadManifest = JSON.parse(fs.readFileSync(path.join(dataRoot, "dyad_manifest.json"), "utf8"));
const reviewSource = fs.readFileSync(path.join(root, "screen-share-study", "home-school-review.js"), "utf8");

function normalizeText(text) {
  return String(text || "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function literalConst(source, name) {
  const marker = `const ${name} =`;
  const markerIndex = source.indexOf(marker);
  assert.ok(markerIndex >= 0, `Missing ${marker}`);
  const start = markerIndex + marker.length;
  let quote = "";
  let escaped = false;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (["\"", "'", "`"].includes(char)) {
      quote = char;
      continue;
    }
    if (["[", "{", "("].includes(char)) depth += 1;
    if (["]", "}", ")"].includes(char)) depth -= 1;
    if (char === ";" && depth === 0) return vm.runInNewContext(`(${source.slice(start, index)})`);
  }
  throw new Error(`Could not parse ${name}`);
}

function functionDeclaration(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `Missing ${marker}`);
  const bodyStart = source.indexOf("{", start);
  let quote = "";
  let escaped = false;
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (["\"", "'", "`"].includes(char)) {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse function ${name}`);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

assert.equal(metadata.candidateId, "chs-home-school-evelyn-v1");
assert.equal(metadata.status, "published_chs_draft_saved_not_submitted");
assert.equal(metadata.activeChsStudyChanged, false);
assert.equal(metadata.chsDraftConfigurationUpdated, true);
assert.equal(metadata.chsDraftStudyId, 6349);
assert.equal(metadata.chsDraftSavedOn, "2026-09-17");
assert.equal(metadata.chsSubmissionStatus, "not_submitted");
assert.equal(metadata.published, true);
assert.equal(metadata.publishedOn, "2026-09-17");
assert.equal(metadata.lastPublishedRelease, "chs-home-school-evelyn-v1-r18-preview-polish-1");
assert.equal(metadata.candidateRelease, "chs-home-school-evelyn-v1-r19-who-helps-where-1");
assert.equal(metadata.latestRevisionOn, "2026-09-18");
assert.equal(metadata.storyCount, 12);
assert.equal(metadata.storyCountPerContext, 6);
assert.equal(metadata.ratingMode, "none");
assert.equal(metadata.contextDesign, "within-child");
assert.equal(metadata.assignmentCellCount, 18);
assert.equal(metadata.participantAutoplay, true);
assert.equal(metadata.syntheticSpeech, false);
assert.equal(metadata.missingEvelynClipCount, 0);
assert.equal(metadata.directionalEvelynClipCount, 30);
assert.equal(metadata.directionalEvelynAudioStatus, "complete");
assert.equal(metadata.questionContextPlacement, "Each helping question begins with 'At the kid's house,' or 'At the kid's school,' followed by the helping question.");
assert.equal(metadata.contextFirstQuestionClipCount, 24);
assert.equal(metadata.contextFirstQuestionAudioReceipt, "data/context_first_question_audio_import_receipt.json");
assert.equal(metadata.artificialQuestionPauseSeconds, 0);

assert.match(indexHtml, /lockedStudyVersion:\s*"home-school"/);
assert.match(indexHtml, /<title>Who Helps Where\? — CHS Home \/ School candidate<\/title>/);
assert.match(indexHtml, /lockedDataStudyVersion:\s*"chs-home-school-evelyn-v1"/);
assert.match(indexHtml, /homeSchoolContextManifestUrl:\s*versionedDataUrl\("home_school_context_manifest\.json"\)/);
assert.match(indexHtml, /missingHomeSchoolAudioManifestUrl:\s*versionedDataUrl\("missing_home_school_directional_audio_manifest\.json"\)/);
assert.doesNotMatch(indexHtml, /facilitator=1|liveShare=1|syntheticSpeech=1/);
assert.match(app, /const useSyntheticSpeech = showResearcherTools && configValue\("syntheticSpeech"\) === "1"/);
assert.match(app, /const START_INTRO_TEXT = "Hi there! Welcome to Who Helps Where\?/);
assert.match(app, /<span class="ksize-setup-eyebrow">Who Helps Where\?<\/span>/);
assert.match(app, /<h1 class="ksize-title">Who Helps Where\?<\/h1>/);
assert.doesNotMatch(app, /Welcome to Find the Caregiver|>Find the Caregiver!</);
assert.match(app, /if \(autoPlay && !isFacilitatorMode\)/);
assert.match(app, /if \(!isFacilitatorMode\) setTimeout\(\(\) => playAudio\(\{ advanceWhenDone: true \}\), 250\)/);
assert.match(app, /contextOrder\.forEach\(\(context\) => \{[\s\S]*?assertParticipantContextAudioCoverage\(eventPlan, selectedEventSuffix, context\)/);
assert.match(app, /slideIndex === block\.introSlides\.length - 1 && studyContext/);
assert.doesNotMatch(app, /slideIndex === 0 && (?:activeStudyContext|studyContext)/);
assert.match(app, /slideKind === "context_intro"[\s\S]*?text \|\| contextIntroText\(studyContext\)/);
assert.match(
  app,
  /\["intro", "exterior", "room_entry"\]\.includes\(slideKind\)[\s\S]*?text \|\| ""[\s\S]*?slideKind === "context_intro"[\s\S]*?slideKind === "story"[\s\S]*?slideKind === "response_choices"/,
  "Every Home/School story heading must use the same in-scene caption banner",
);
assert.match(indexHtml, /app\.js\?v=chs-home-school-evelyn-v1-r19-who-helps-where-1/);
assert.doesNotMatch(app, /contextIntro \? `<div class="ksize-context-intro-cue"/);
assert.match(app, /fileAudio\.addEventListener\("playing",[\s\S]*?setMouthPlaying\(true\)/);
assert.match(app, /fileAudio\.addEventListener\("waiting", \(\) => setMouthPlaying\(false\)\)/);
assert.match(app, /fileAudio\.addEventListener\("pause", \(\) => setMouthPlaying\(false\)\)/);
assert.doesNotMatch(app, /this\.current = fileAudio;\s*document\.body\.classList\.add\("ksize-audio-playing"\)/);
assert.match(app, /if \(!context \|\| entranceVisualOnly\) return \[\]/);
assert.match(app, /lockedDataStudyVersion \|\| `home_school_context_\$\{selectedContext\.toLowerCase\(\)\}_preview_v1`/);
assert.match(app, /\$\{topHudHtml\(storyNumber, storyTotal\)\}/);
assert.doesNotMatch(app, /topHudHtml\(storyNumber, storyTotal, \{ showContext: Boolean\(activeStudyContext\) \}\)/);

const expectedPairings = plain(literalConst(reviewSource, "ROLE_CONDITIONS"));
assert.deepEqual(plain(literalConst(app, "CORE_CONDITIONS")), expectedPairings.woman);
assert.deepEqual(plain(literalConst(app, "MAN_ROLE_CONDITIONS")), expectedPairings.man);
assert.deepEqual(plain(literalConst(app, "FAMILY_ROLE_CONDITIONS")), expectedPairings.family);
assert.deepEqual(metadata.pairings, expectedPairings);
assert.equal(literalConst(app, "ONE_PAIR_SCRIPT_SCHEDULES").length, 2);
assert.equal(literalConst(app, "FAMILY_ONE_PAIR_SCRIPT_SCHEDULES").length, 4);

const allCandidateText = [
  JSON.stringify(eventManifest),
  JSON.stringify(dyadManifest),
  JSON.stringify(teacherClassmateAudio),
].join("\n");
assert.doesNotMatch(allCandidateText, /not friends with/i);
assert.match(allCandidateText, /kid's classmate/i);

assert.equal(contextManifest.schemaVersion, 3);
assert.equal(contextManifest.status, "review_ready_not_submitted");
assert.equal(contextManifest.designVersion, "home_school_within_child_counterbalanced_context_order_v1");
assert.equal(contextManifest.assignment.design, "within-child");
assert.equal(contextManifest.assignment.storyCount, 12);
assert.equal(contextManifest.assignment.storyCountPerContext, 6);
assert.equal(contextManifest.assignment.ratings, "none");
assert.equal(contextManifest.scriptVersion, "home_school_house_entrance_recipient_aware_v6");
assert.deepEqual(Object.keys(contextManifest.contexts).sort(), ["HOME", "SCHOOL"]);

const expectedContextIntroductions = {
  HOME: {
    text: "They are all at the kid's house.",
    audio: "assets/home_school/generated/audio/hs_r17_005_context_intro_house.mp3",
    sha256: "e6d2e7187aa75f095db59d2661c06e5a4bcfd0eb49e582f4cb7ad66687e72911",
  },
  SCHOOL: {
    text: "They are all at the kid's school.",
    audio: "assets/home_school/generated/audio/hs_r13_002_context_intro_school.mp3",
    sha256: "772cc1c85c43fb6aa08b17443802206acb3c6e7299531d477d29e211493b9bc0",
  },
};
for (const [context, expected] of Object.entries(expectedContextIntroductions)) {
  const intro = contextManifest.contexts[context].intro;
  assert.equal(intro.text, expected.text);
  assert.equal(intro.audio, expected.audio);
  assert.equal(intro.presentation, "palette-colored top caption above the furnished scene");
  assert.equal(intro.image, undefined);
  const audioLine = homeSchoolAudio.lines.find((line) => normalizeText(line.text) === normalizeText(expected.text));
  assert.ok(audioLine, `Missing ${context} context-introduction audio metadata`);
  assert.equal(audioLine.output, expected.audio);
  const audioPath = path.join(root, expected.audio);
  assert.ok(fs.existsSync(audioPath), `Missing revised ${context} context-introduction audio`);
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(audioPath)).digest("hex"), expected.sha256);
}
assert.doesNotMatch(JSON.stringify(contextManifest), /Today, these people are at the kid's/);

const contextFunctions = vm.runInNewContext(`
  ${functionDeclaration(app, "contextSpec")}
  ${functionDeclaration(app, "recipientKeyForCondition")}
  ${functionDeclaration(app, "contextEventSpec")}
  ${functionDeclaration(app, "contextualizedEventLines")}
  ({ recipientKeyForCondition, contextualizedEventLines });
`, {
  homeSchoolContextManifest: contextManifest,
  activeStudyContext: "HOME",
});

const directionalRecipients = {
  "DAD-KID": "mom",
  "MOM-KID": "dad",
  "TEACHER-KID": "teacher",
};
for (const [condition, recipient] of Object.entries(directionalRecipients)) {
  assert.equal(contextFunctions.recipientKeyForCondition(condition), recipient.toUpperCase());
  for (const context of ["HOME", "SCHOOL"]) {
    for (const event of ["HUG", "FOOD", "HELP"]) {
      const sourceTrial = eventManifest.trials.find((trial) =>
        trial.isComplete && trial.variant === "a" && trial.blocks?.INTRO?.condition === condition
      );
      assert.ok(sourceTrial, `Missing ${condition} source trial`);
      const baseLines = sourceTrial.blocks[event].text.split(/\n+/).filter(Boolean);
      const lines = plain(contextFunctions.contextualizedEventLines(baseLines, event, context, condition));
      assert.equal(lines.length, 3);
      assert.match(lines[0], new RegExp(`the ${recipient} in the middle`, "i"));
      assert.match(lines[1], new RegExp(`the ${recipient} in the middle`, "i"));
      assert.match(lines[1], new RegExp(`kid's ${context === "HOME" ? "house" : "school"}`, "i"));
      assert.doesNotMatch(lines.slice(0, 2).join(" "), /the kid in the middle/i);
      assert.equal(lines[2], baseLines[2], "choice order wording must stay tied to the source rendition");
    }
  }
}

const normalKidTrial = eventManifest.trials.find((trial) =>
  trial.isComplete && trial.variant === "a" && trial.blocks?.INTRO?.condition === "MOM-TEACHER"
);
for (const context of ["HOME", "SCHOOL"]) {
  for (const event of ["HUG", "FOOD", "HELP"]) {
    const baseLines = normalKidTrial.blocks[event].text.split(/\n+/).filter(Boolean);
    const lines = plain(contextFunctions.contextualizedEventLines(baseLines, event, context, "MOM-TEACHER"));
    assert.match(lines[0], /kid in the middle/i);
    assert.match(lines[1], /kid in the middle/i);
    assert.match(lines[1], new RegExp(`kid's ${context === "HOME" ? "house" : "school"}`, "i"));
  }
}

const assignmentFunctions = vm.runInNewContext(`
  ${functionDeclaration(app, "hashSeed")}
  ${functionDeclaration(app, "normalizeRoleSet")}
  ${functionDeclaration(app, "balancedAssignment")}
  ({ balancedAssignment });
`, {
  EVENT_SUFFIXES: ["HUG", "FOOD", "HELP"],
  STUDY_CONTEXTS: ["HOME", "SCHOOL"],
  requestedSeed: "fallback",
  requestedSeedSource: "explicit_seed",
  normalizeStudyContext(value) {
    const normalized = String(value || "").trim().toUpperCase().replace(/[-_ ]+/g, "_");
    if (["HOME", "AT_HOME"].includes(normalized)) return "HOME";
    if (["SCHOOL", "AT_SCHOOL"].includes(normalized)) return "SCHOOL";
    return "";
  },
});
for (const roleSet of ["woman", "man", "family"]) {
  for (const event of ["HUG", "FOOD", "HELP"]) {
    for (const context of ["HOME", "SCHOOL"]) {
      const first = plain(assignmentFunctions.balancedAssignment("CHS-CHILD-42", roleSet, event, context, true, "chs_child_id"));
      const second = plain(assignmentFunctions.balancedAssignment("CHS-CHILD-42", roleSet, event, context, true, "chs_child_id"));
      assert.deepEqual(first, second, "assignment must be stable for the same CHS child key");
      assert.equal(first.roleSet, roleSet);
      assert.equal(first.eventSuffix, event);
      assert.equal(first.context, context);
    }
  }
}

const availableAudio = new Map();
for (const [text, output] of Object.entries(canonicalAudio.normalizedTextToOutput || {})) {
  availableAudio.set(normalizeText(text), output);
}

const welcomeText = "Hi there! Welcome to Who Helps Where? We are going to look at pictures and play a choosing game. Listen to each page. When you see choices, choose the one you pick. When you are ready, hit the green button to start.";
const welcomeOutput = canonicalAudio.normalizedTextToOutput[normalizeText(welcomeText)];
assert.equal(welcomeOutput, "audio_evelyn/whw_001_child_welcome_who_helps_where.mp3");
const welcomePath = path.join(root, welcomeOutput);
assert.ok(fs.existsSync(welcomePath), `Missing revised welcome audio ${welcomeOutput}`);
assert.equal(fs.statSync(welcomePath).size, 620713);
assert.equal(
  crypto.createHash("sha256").update(fs.readFileSync(welcomePath)).digest("hex"),
  "13378d652f12b9971a78ab2148a6f9d9fa04735cf3a3ace5554c176a9894963f",
);
assert.doesNotMatch(JSON.stringify(canonicalAudio), /welcome to find the caregiver/i);
for (const manifest of [teacherClassmateAudio, homeSchoolAudio]) {
  for (const line of manifest.lines || []) {
    if (line.active === false || !line.output) continue;
    availableAudio.set(normalizeText(line.text), line.output);
    const outputPath = path.join(root, line.output);
    assert.ok(fs.existsSync(outputPath), `Missing recorded file ${line.output}`);
  }
}

for (const [context, contextSpec] of Object.entries(contextManifest.contexts)) {
  for (const [recipient, recipientEvents] of Object.entries(contextSpec.recipientEvents)) {
    for (const [event, eventSpec] of Object.entries(recipientEvents)) {
      for (const [kind, textKey, audioKey] of [
        ["event", "eventText", "eventAudio"],
        ["question", "questionText", "questionAudio"],
      ]) {
        const text = eventSpec[textKey];
        if (kind === "question") {
          assert.match(
            text,
            new RegExp(`^At the kid's ${context === "HOME" ? "house" : "school"}, who will `),
            `Missing context-first wording in ${context}/${recipient}/${event}/${kind}`,
          );
        }
        assert.ok(availableAudio.has(normalizeText(text)), `Missing ${context}/${recipient}/${event}/${kind} audio`);
        assert.equal(eventSpec[audioKey], availableAudio.get(normalizeText(text)));
      }
    }
  }
}
assert.equal(homeSchoolAudio.status, "complete");
assert.equal(homeSchoolAudio.candidateStatus, "local_review_recorded");
assert.equal(homeSchoolAudio.recording.clipCount, 48);
assert.equal(homeSchoolAudio.recording.directionalClipCount, 30);
assert.equal(homeSchoolAudio.recording.questionRevision, "r15-context-first");
assert.equal(homeSchoolAudio.recording.questionClipCount, 24);
assert.equal(homeSchoolAudio.recording.questionWording, "Context first, followed by a natural comma pause");
assert.equal(missingAudio.status, "awaiting_recordings");
assert.equal(missingAudio.missingClipCount, 30);
assert.equal(missingAudio.lines.length, 30);
assert.equal(new Set(missingAudio.lines.map((line) => line.id)).size, 30);
assert.equal(new Set(missingAudio.lines.map((line) => line.output)).size, 30);
assert.equal(directionalAudioReceipt.importedClipCount, 30);
assert.equal(directionalAudioReceipt.clips.length, 30);
assert.equal(contextFirstQuestionReceipt.candidateRelease, "chs-home-school-evelyn-v1-r15-context-first-preview-1");
assert.equal(contextFirstQuestionReceipt.scriptVersion, "home_school_context_first_recipient_aware_v5", "Historical r15 receipt must retain its original script version");
assert.equal(contextFirstQuestionReceipt.service, "NaturalReaders Commercial");
assert.equal(contextFirstQuestionReceipt.voice, "Evelyn");
assert.equal(contextFirstQuestionReceipt.clipCount, 24);
assert.equal(contextFirstQuestionReceipt.clips.length, 24);
assert.equal(new Set(contextFirstQuestionReceipt.clips.map((clip) => clip.output)).size, 24);
assert.equal(historicalPauseManifest.status, "inactive_historical");
assert.equal(historicalPauseManifest.active, false);
assert.equal(historicalPauseManifest.clipCount, 24);
const activeAudioById = new Map(homeSchoolAudio.lines.map((line) => [line.id, line]));
const contextFirstByOutput = new Map(contextFirstQuestionReceipt.clips.map((clip) => [clip.output, clip]));
const contextFirstByLegacyOutput = new Map(contextFirstQuestionReceipt.clips.map((clip) => [clip.legacyOutput, clip]));
for (const line of missingAudio.lines) {
  const imported = directionalAudioReceipt.clips.find((clip) => clip.id === line.id);
  const priorClip = line.kind === "question" ? contextFirstByLegacyOutput.get(line.output) : imported;
  const houseReplacement = entranceHouseByReplacedOutput.get(priorClip?.output);
  const active = houseReplacement
    ? homeSchoolAudio.lines.find((clip) => clip.output === houseReplacement.output)
    : activeAudioById.get(line.id);
  assert.ok(active, `${line.id} is missing from the active audio manifest`);
  assert.ok(imported, `${line.id} is missing from the historical import receipt`);
  assert.equal(fs.existsSync(path.join(root, line.output)), true, `${line.output} was not imported`);
  assert.equal(imported.output, line.output, `${line.id} source provenance path drifted`);
  if (line.kind === "question") {
    const contextFirst = contextFirstByLegacyOutput.get(line.output);
    assert.ok(contextFirst, `${line.id} is missing from the context-first import receipt`);
    const currentClip = entranceHouseByReplacedOutput.get(contextFirst.output) || contextFirst;
    assert.equal(active.text, currentClip.text);
    assert.equal(active.output, currentClip.output);
    assert.equal(availableAudio.get(normalizeText(active.text)), active.output, `${line.id} is not active in the audio map`);
    assert.equal(active.bytes, currentClip.bytes);
    assert.equal(active.durationSeconds, currentClip.durationSeconds);
    assert.equal(active.sha256, currentClip.sha256);
    if (houseReplacement) assert.equal(active.revision, "r17-entrance-house");
    else assert.equal(active.questionRevision, "r15-context-first");
    assert.notEqual(active.sha256, imported.sha256, `${line.id} must not retain the superseded context-last recording`);
  } else {
    const currentClip = entranceHouseByReplacedOutput.get(imported.output) || imported;
    assert.equal(availableAudio.get(normalizeText(currentClip.text)), active.output, `${line.id} is not active in the audio map`);
    assert.equal(active.output, currentClip.output, `${line.id} output path drifted`);
    assert.equal(active.text, currentClip.text, `${line.id} event wording drifted`);
    assert.equal(active.bytes, currentClip.bytes, `${line.id} event byte count drifted`);
    assert.equal(active.durationSeconds, currentClip.durationSeconds, `${line.id} event duration drifted`);
    assert.equal(active.sha256, currentClip.sha256, `${line.id} event recording drifted`);
  }
  assert.equal(active.audioEdit, undefined, `${line.id} must not retain a synthetic-pause edit`);
}

const activeQuestionOutputs = [];
for (const contextSpec of Object.values(contextManifest.contexts)) {
  for (const eventSpec of Object.values(contextSpec.events)) {
    assert.match(eventSpec.questionText, /^At the kid's (?:house|school), who will /);
    assert.ok(availableAudio.has(normalizeText(eventSpec.eventText)), `Missing kid-recipient event audio: ${eventSpec.eventText}`);
    assert.ok(availableAudio.has(normalizeText(eventSpec.questionText)), `Missing kid-recipient question audio: ${eventSpec.questionText}`);
    activeQuestionOutputs.push(eventSpec.questionAudio);
  }
  for (const recipientEvents of Object.values(contextSpec.recipientEvents)) {
    for (const eventSpec of Object.values(recipientEvents)) {
      activeQuestionOutputs.push(eventSpec.questionAudio);
    }
  }
}
assert.equal(activeQuestionOutputs.length, 24);
assert.equal(new Set(activeQuestionOutputs).size, 24);
for (const output of activeQuestionOutputs) {
  assert.match(output, /^assets\/home_school\/generated\/audio\/[^/]+\.mp3$/);
  assert.equal(fs.existsSync(path.join(root, output)), true, `Missing context-first question audio ${output}`);
  const imported = entranceHouseReceipt.clips.find((clip) => clip.output === output) || contextFirstByOutput.get(output);
  assert.ok(imported, `Question output is absent from the r15/r17 receipts: ${output}`);
  const bytes = fs.readFileSync(path.join(root, output));
  assert.equal(bytes.length, imported.bytes, `Context-first byte count drifted: ${output}`);
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), imported.sha256, `Context-first hash drifted: ${output}`);
}

console.log(JSON.stringify({
  status: "PASS",
  candidateId: metadata.candidateId,
  published: metadata.published,
  chsDraftConfigurationUpdated: metadata.chsDraftConfigurationUpdated,
  chsSubmissionStatus: metadata.chsSubmissionStatus,
  assignmentCells: metadata.assignmentCellCount,
  storiesPerRoleSet: metadata.storyCount,
  pairings: metadata.pairings,
  directionalRecipients,
  existingContextClipsVerified: homeSchoolAudio.lines.filter((line) => line.active !== false).length,
  teacherClassmateClipsVerified: teacherClassmateAudio.lines.length,
  importedDirectionalEvelynClips: directionalAudioReceipt.importedClipCount,
  contextFirstNaturalReadersQuestionClips: activeQuestionOutputs.length,
  missingDirectionalEvelynClips: metadata.missingEvelynClipCount,
  participantAutoplay: true,
  browserSpeech: false,
  collectionSafety: "all_18_cells_pass_audio_preflight_without_browser_speech",
}, null, 2));
