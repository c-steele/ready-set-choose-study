import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

// Pin the verified r21 save, not HEAD. This is a five-event-audio release;
// prior scope gates remain historical and cannot be loosened by this test.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseline = "41809f000f95fae75f91c527df10dd5dab0714f5";
const candidate = "versions/chs-home-school-evelyn-v1";
const previousRelease = "chs-home-school-evelyn-v1-r21-visual-fixes-1";
const release = "chs-home-school-evelyn-v1-r22-clear-at-events-1";
const audioRoot = "assets/home_school/generated/audio/";
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const read = filename => fs.readFileSync(path.join(root, filename), "utf8");
const before = filename => git("show", `${baseline}:${filename}`);
const json = filename => JSON.parse(read(filename));
const oldJson = filename => JSON.parse(before(filename));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const fileSha = filename => sha(fs.readFileSync(path.join(root, filename)));

const approved = [
  { context: "SCHOOL", recipient: "KID", event: "FOOD", text: "Oh no! At the kid's school, the kid in the middle is hungry now!",
    filename: "hs_r22_001_school_kid_food_event_split.mp3", sha256: "d248ec113498810d67573e26116564ce2c96b6a2b8502ebafe1315becf7f8646", bytes: 198574, durationSeconds: 4.937143,
    previous: "hs_009_school_food_event.mp3", previousSha256: "e9c5e6f8d75dfa8971dac259fa4342a4bfeada8baed5d53db6a76814680134dd",
    suffix: "2.At_the_kids_school,_the_kid_i.mp3", suffixSha256: "adecfbb5bedc9ecb03f6279b46bcf28508711c80a8dcda24183d2d75db8b150b", suffixSamples: 169344 },
  { context: "SCHOOL", recipient: "KID", event: "HELP", text: "Oh no! At the kid's school, the kid in the middle dropped a heavy box!",
    filename: "hs_r22_002_school_kid_help_event_split.mp3", sha256: "fef5effd8ab7f2c3a1d4df4df1a9e91e6c6957c9450fcd30049ec4bc65062cd7", bytes: 209023, durationSeconds: 5.198367,
    previous: "hs_013_school_help_event.mp3", previousSha256: "f9825979c6934ad9481418129cd5dbfa82faa0815e262ba4e0516a9d3f8aff21",
    suffix: "3.At_the_kids_school,_the_kid_i.mp3", suffixSha256: "9cbc999396de3c5e7a69635d6e8769f1feee6d3aad5ede45b464249a19a03d08", suffixSamples: 180864 },
  { context: "HOME", recipient: "KID", event: "HELP", text: "Oh no! At the kid's house, the kid in the middle dropped a heavy box!",
    filename: "hs_r22_003_house_kid_help_event_split.mp3", sha256: "934ea3006ac618427620b40d224aae47f8cdeb568e6cbaa6ffc250ce0b781e12", bytes: 207978, durationSeconds: 5.172245,
    previous: "hs_r17_009_house_help_event.mp3", previousSha256: "2f9d6bbe81b41e5174d0d17937b07df2b9ecfb81495272bbd02e6d63faf824f0",
    suffix: "4.At_the_kids_house,_the_kid_in.mp3", suffixSha256: "d529070f3f49c19645ad04ed4ebec69779a2d60070dc3458af169463804ade9c", suffixSamples: 179712 },
  { context: "SCHOOL", recipient: "MOM", event: "HELP", text: "Oh no! At the kid's school, the mom in the middle dropped a heavy box!",
    filename: "hs_r22_004_school_mom_help_event_split.mp3", sha256: "b0debe35bd984e5a78dcf806552b3894a433b49c580998a2f2c5fc775623bc50", bytes: 211113, durationSeconds: 5.250612,
    previous: "hs_v2_033_school_mom_help_event.mp3", previousSha256: "221ff3ae00a61e8b8c81cad2e4357b4fafe896f74d376de3b48c840a05e42676",
    suffix: "5.At_the_kids_school,_the_mom_i.mp3", suffixSha256: "8bbcac8f5868ed6eff039ca2cda44d6abac298150dbde28244c9adcd9a9378d1", suffixSamples: 183168 },
  { context: "SCHOOL", recipient: "DAD", event: "HELP", text: "Oh no! At the kid's school, the dad in the middle dropped a heavy box!",
    filename: "hs_r22_005_school_dad_help_event_split.mp3", sha256: "2aeb623028ca7a880d52d10c2741ae9a829f8588965ba7b2f7b056ad7d54de58", bytes: 210068, durationSeconds: 5.22449,
    previous: "hs_v2_038_school_dad_help_event.mp3", previousSha256: "620edf664b701f4c15f6699000cc2ba2223451a76c8054359654d74f02f139d3",
    suffix: "6.At_the_kids_school,_the_dad_i.mp3", suffixSha256: "a506b513ca842eaa4664a04b367717a4318c153927daf7f4e309aae50ca5a661", suffixSamples: 182016 },
];
const receiptPath = `${candidate}/data/event_audio_revision_r22.json`;
const receipt = json(receiptPath);
assert.equal(receipt.revision, "r22-clear-at-events");
assert.equal(receipt.status, "approved_sources_joined_for_chs_draft");
assert.equal(receipt.voice, "Evelyn"); assert.equal(receipt.style, "Soft"); assert.equal(receipt.speed, 0.9);
assert.equal(receipt.sourceExportSha256, "349067c5e05fd1e1d50e06c9f93e4fe1ebf4aed049d7980f3278822fb9eef70f");
assert.equal(receipt.listeningReview, "separate_sources_approved_by_researcher; joined_files_machine_checked_pending_researcher_preview");
assert.equal(receipt.screening.expectedCaptionsProvidedToModel, false);
assert.equal(receipt.screening.audioUploaded, false);
assert.equal(receipt.prefixEdit.retainedSamples, 46766);
assert.equal(receipt.prefixEdit.removedTailSamples, 18898);
assert.ok(receipt.prefixEdit.removedTailPeakDbfs < -60, "Only the quiet prefix tail may be shortened");
assert.match(receipt.processing, /No gain, speed change, pitch change, crossfade, or added silence/);
assert.equal(receipt.files.length, 5, "Only the five approved split event recordings may be installed");
assert.equal(new Set(receipt.files.map(clip => clip.output)).size, 5);
const audioPath = `${candidate}/data/home_school_audio_manifest.json`;
const contextPath = `${candidate}/data/home_school_context_manifest.json`;
const currentAudio = json(audioPath), oldAudio = oldJson(audioPath);
const currentContext = json(contextPath), oldContext = oldJson(contextPath);
const restoredAudio = structuredClone(currentAudio), restoredContext = structuredClone(currentContext);
const eventAt = (manifest, spec) => spec.recipient === "KID"
  ? manifest.contexts[spec.context].events[spec.event]
  : manifest.contexts[spec.context].recipientEvents[spec.recipient][spec.event];
let availableSourceHashesChecked = 0;
for (const expected of approved) {
  const output = audioRoot + expected.filename;
  const records = receipt.files.filter(clip => clip.output === output);
  assert.equal(records.length, 1, `${output}: exactly one receipt record`);
  const clip = records[0];
  for (const key of ["context", "recipient", "event", "text", "bytes", "sha256", "durationSeconds"]) assert.equal(clip[key], expected[key], `${output}: receipt ${key}`);
  assert.deepEqual(clip.replaces, { output: audioRoot + expected.previous, sha256: expected.previousSha256 });
  assert.equal(fileSha(output), expected.sha256, `${output}: installed join differs from audited bytes`);
  assert.equal(fs.statSync(path.join(root, output)).size, expected.bytes);
  assert.equal(fileSha(clip.replaces.output), expected.previousSha256, "The replaced recording must remain intact");
  assert.equal(clip.sampleRateHz, 44100); assert.equal(clip.channels, 1); assert.equal(clip.bitrateKbps, 320);
  assert.equal(clip.sources.length, 2);
  const expectedSources = [
    { path: "review-at-split-v3/1.Oh_no!.mp3", sha256: "f9a722c291b6568e7cb759aecc336fdf009f971c9649db7e6c18ad20e4595d1e", retainedSampleRange: [0, 46766] },
    { path: `review-at-split-v3/${expected.suffix}`, sha256: expected.suffixSha256, retainedSampleRange: [0, expected.suffixSamples] },
  ];
  assert.deepEqual(clip.sources, expectedSources, "Only the six user-approved separate originals may supply the joins");
  for (const source of clip.sources) {
    // Source originals are local audition evidence, not participant assets.
    // In a release-only checkout, their pinned hashes remain in this test/receipt.
    if (fs.existsSync(path.join(root, source.path))) {
      assert.equal(fileSha(source.path), source.sha256, "Approved local source changed"); availableSourceHashesChecked++;
    }
  }
  assert.equal(clip.joinSample, 46766);
  assert.equal(clip.suffixSpeechSamplesRetainedWithoutModification, true);
  assert.equal(clip.retainedPrefixSamplesUnchanged, true);
  assert.equal(clip.silenceAddedSamples, 0);
  assert.equal(clip.fullScaleClippedSamples, 0);
  assert.ok(clip.measuredEncodedGap.durationSeconds >= 0.25 && clip.measuredEncodedGap.durationSeconds <= 0.35);
  assert.match(clip.listeningCaveat, /require playback review.*do not certify/i,
    "Signal checks must not be mislabeled as a human review of the joined files");
  const words = text => String(text).toLowerCase().replace(/[’']/g, "").match(/[a-z]+/g);
  assert.equal(clip.atRecognized, true);
  assert.deepEqual(words(clip.machineTranscript), words(expected.text), "Unprompted transcript must retain the full At sentence; this is not a listening-quality certificate");
  const matches = currentAudio.lines.filter(line => line.text === expected.text && line.active !== false);
  assert.equal(matches.length, 1, "Every revised event needs exactly one canonical text mapping");
  const active = matches[0];
  for (const key of ["text", "output", "sha256", "bytes", "durationSeconds"]) assert.equal(active[key], clip[key], `Active event ${key}`);
  const previous = oldAudio.lines.find(line => line.text === expected.text);
  assert.ok(previous); assert.equal(previous.output, clip.replaces.output); assert.equal(previous.sha256, clip.replaces.sha256);
  assert.equal(active.eventRevision, "r22-clear-at-events");
  const normalizedActive = structuredClone(active);
  for (const key of ["output", "bytes", "durationSeconds", "sha256"]) normalizedActive[key] = previous[key];
  delete normalizedActive.eventRevision;
  assert.deepEqual(normalizedActive, previous, "Stable IDs, text, historical provenance and playback properties must not change in a replaced record");
  assert.equal(currentAudio.lines.some(line => line.output === previous.output), false, "Replaced event must not retain an active stale mapping");
  const currentEvent = eventAt(currentContext, expected), oldEvent = eventAt(oldContext, expected);
  assert.equal(currentEvent.eventText, expected.text); assert.equal(oldEvent.eventText, expected.text);
  assert.equal(currentEvent.eventAudio, output); assert.equal(oldEvent.eventAudio, previous.output);
  restoredAudio.lines[restoredAudio.lines.findIndex(line => line.text === expected.text)] = structuredClone(previous);
  eventAt(restoredContext, expected).eventAudio = oldEvent.eventAudio;
}
assert.deepEqual(restoredAudio, oldAudio, "Exactly five event records may change; questions, openings and audio metadata must not change");
assert.deepEqual(restoredContext, oldContext, "Only five eventAudio pointers may change: all captions, questions, assignments and artwork stay identical");
for (const clip of oldAudio.lines) assert.equal(fileSha(clip.output), clip.sha256, `Prior audio bytes changed: ${clip.output}`);
const questions = oldAudio.lines.filter(clip => /^At the kid's (?:house|school), who will /.test(clip.text));
assert.equal(questions.length, 24, "All 24 context-first questions remain unchanged");
assert.doesNotMatch(JSON.stringify(currentAudio) + JSON.stringify(currentContext), /review-at-retakes|review-at-split|audio-candidates.*local/,
  "Local auditions must not leak into participant playback routes");

// Run the actual canonical lookup functions, not a parallel test implementation.
const app = read(`${candidate}/app.js`);
const canonicalStart = app.indexOf("function normalizeAudioText(");
const canonicalEnd = app.indexOf("\nfunction finishParticipantTrial(", canonicalStart);
assert.ok(canonicalStart > 0 && canonicalEnd > canonicalStart);
const runtime = vm.createContext({});
vm.runInContext(`const requestedVoiceProfile = ""; const PREFERRED_AUDIO_DIR = "audio_preferred";
  const TEACHER_CLASSMATE_GENERATED_ROOT = "assets/teacher_classmate/generated/";
  const HOME_SCHOOL_GENERATED_ROOT = "assets/home_school/generated/";
  const HOME_SCHOOL_REVISED_AUDIO_ROOT = "versions/chs-home-school-evelyn-v1/assets/audio-r18/";
  let canonicalAudioByText = new Map(), canonicalAudioByOriginalSrc = new Map();
  ${app.slice(canonicalStart, canonicalEnd)}
  globalThis.api = { installCanonicalAudioMap, canonicalAudioPathForText };`, runtime);
runtime.api.installCanonicalAudioMap(json(`${candidate}/data/canonical_audio_manifest_evelyn.json`), json(`${candidate}/data/teacher_classmate_audio_manifest.json`), currentAudio);
for (const clip of currentAudio.lines) assert.equal(runtime.api.canonicalAudioPathForText(clip.text), clip.output, `Runtime text lookup ${clip.text}`);

for (const filename of [`${candidate}/app.js`, `${candidate}/index.html`, "chs_ready/home_school_18_cell_wrapper_draft.js"]) {
  let expected = before(filename).replaceAll(previousRelease, release);
  if (filename === "chs_ready/home_school_18_cell_wrapper_draft.js") expected = expected.replace("This source targets the r21 within-child", "This source targets the r22 within-child");
  assert.equal(read(filename), expected, `${filename}: only the cache token/version comment may change`);
}
const metadataPath = `${candidate}/candidate.json`, metadata = json(metadataPath), oldMetadata = oldJson(metadataPath);
const saved = metadata.status === "published_chs_draft_saved_not_submitted";
assert.ok(saved || metadata.status === "prepared_for_chs_draft_update");
assert.equal(metadata.candidateRelease, release);
assert.equal(metadata.published, true); assert.equal(metadata.chsDraftConfigurationUpdated, true);
assert.equal(metadata.activeChsStudyChanged, false); assert.equal(metadata.chsSubmissionStatus, "not_submitted");
assert.equal(metadata.lastPublishedRelease, saved ? release : previousRelease);
assert.equal(metadata.chsDraftRelease, saved ? release : previousRelease);
assert.equal(metadata.revisionPendingPublication, !saved);
assert.equal(metadata.latestChsDraftSaveReceipt, saved ? "review/chs-draft-save-r22.md" : "review/chs-draft-save-r21.md");
assert.equal(metadata.clearAtEventAudioRevision, "data/event_audio_revision_r22.json");
if (saved) {
  assert.equal(Object.hasOwn(metadata, "pendingReason"), false);
  const saveReceipt = read(`${candidate}/review/chs-draft-save-r22.md`);
  assert.ok(saveReceipt.includes(release)); assert.match(saveReceipt, /6349/);
  assert.match(saveReceipt, /not submitted|not_submitted|not been submitted/i);
} else assert.match(metadata.pendingReason, /Five researcher-approved split event recordings.*deployment and CHS draft save pending verification/);
const restoredMetadata = structuredClone(metadata);
for (const key of ["status", "candidateRelease", "revisionPendingPublication", "lastPublishedRelease", "chsDraftRelease", "latestChsDraftSaveReceipt"]) restoredMetadata[key] = oldMetadata[key];
delete restoredMetadata.pendingReason; delete restoredMetadata.clearAtEventAudioRevision;
assert.deepEqual(restoredMetadata, oldMetadata, "Design, visual, participant and prior audio metadata must remain unchanged");

const allowedChanges = new Set([
  ...approved.map(clip => audioRoot + clip.filename), audioPath, contextPath, receiptPath, metadataPath,
  `${candidate}/app.js`, `${candidate}/index.html`, "chs_ready/home_school_18_cell_wrapper_draft.js",
  `${candidate}/review/chs-draft-save-r22.md`, `${candidate}/review/r22-audio-verification.md`,
  "tests/verify_home_school_clear_at_events_scope.mjs", "tests/verify_chs_home_school_candidate.mjs",
  "tests/verify_home_school_furnished_candidate.mjs", "tests/verify_home_school_chs_wrapper.mjs",
  "tests/verify_home_school_directional_audio_import.mjs", "tests/verify_home_school_entrance_rollout.mjs",
]);
const changed = git("diff", "--name-only", baseline, "--").trim().split("\n").filter(Boolean);
assert.deepEqual(changed.filter(filename => !allowedChanges.has(filename)), [],
  "Unexpected tracked production change: visuals, CSS, timings, old audio, unrelated data, historical gates and other studies are immutable");
const newProduction = git("ls-files", "--others", "--exclude-standard", "--", "assets", candidate, "chs_ready").trim().split("\n").filter(Boolean);
assert.deepEqual(newProduction.filter(filename => !allowedChanges.has(filename)), [], "Unexpected untracked production asset outside this five-event release");
for (const file of ["tests/verify_home_school_visual_fixes_scope.mjs", "tests/verify_home_school_approved_openings_scope.mjs"]) assert.equal(read(file), before(file), "Historical scope regression must retain its meaning");
console.log(JSON.stringify({ status: "PASS", baseline, release, replacedEventMappings: 5,
  approvedJoinedHashes: 5, canonicalRuntimeMappings: currentAudio.lines.length, availableSourceHashesChecked,
  unchangedQuestionRecordings: questions.length, unchangedPreviousAudioRecords: oldAudio.lines.length,
  captionsAndAssignmentsUnchanged: true, visualsAndTimingsUnchanged: true,
  metadataState: metadata.status, chsDraftRelease: metadata.chsDraftRelease,
  listeningLimit: "Source takes were approved; signal/hash checks do not certify human approval of the joined playback." }, null, 2));
