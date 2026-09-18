import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(root, "versions", "chs-home-school-evelyn-v1", "data");
const requirements = JSON.parse(fs.readFileSync(path.join(dataRoot, "missing_home_school_directional_audio_manifest.json"), "utf8"));
const activeAudio = JSON.parse(fs.readFileSync(path.join(dataRoot, "home_school_audio_manifest.json"), "utf8"));
const contextManifest = JSON.parse(fs.readFileSync(path.join(dataRoot, "home_school_context_manifest.json"), "utf8"));
const receipt = JSON.parse(fs.readFileSync(path.join(dataRoot, "directional_audio_import_receipt.json"), "utf8"));
const contextFirstReceipt = JSON.parse(fs.readFileSync(path.join(dataRoot, "context_first_question_audio_import_receipt.json"), "utf8"));
const entranceRequirements = JSON.parse(fs.readFileSync(path.join(dataRoot, "entrance_house_audio_requirements.json"), "utf8"));
const entranceReceipt = JSON.parse(fs.readFileSync(path.join(dataRoot, "entrance_house_audio_import_receipt.json"), "utf8"));
const schoolOpeningRevision = JSON.parse(fs.readFileSync(path.join(dataRoot, "school_exterior_audio_revision_r18.json"), "utf8"));
const exteriorRevision = JSON.parse(fs.readFileSync(path.join(dataRoot, "exterior_audio_revision_r20.json"), "utf8"));
const eventRevision = JSON.parse(fs.readFileSync(path.join(dataRoot, "event_audio_revision_r22.json"), "utf8"));
const eventRevisionByReplacedOutput = new Map(eventRevision.files.map((clip) => [clip.replaces.output, clip]));
assert.equal(eventRevisionByReplacedOutput.size, 5, "Only the five r22 event revisions may supersede prior event mappings");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function originalRecordingText(text) {
  return String(text).replace(/, at the kid's (home|school)\?$/, " at the kid's $1?");
}

const activeByOutput = new Map(activeAudio.lines.map((line) => [line.output, line]));
const receiptById = new Map(receipt.clips.map((line) => [line.id, line]));
const contextFirstByLegacyOutput = new Map(contextFirstReceipt.clips.map((line) => [line.legacyOutput, line]));
const houseByReplacedOutput = new Map(entranceReceipt.clips.filter((line) => line.replaces).map((line) => [line.replaces.output, line]));

function assertFileMatches(clip, message) {
  const bytes = fs.readFileSync(path.join(root, clip.output));
  assert.equal(bytes.length, clip.bytes, `${message}: byte count`);
  assert.equal(sha256(bytes), clip.sha256, `${message}: hash`);
}

function assertActiveMatches(active, clip) {
  for (const key of ["text", "output", "bytes", "durationSeconds", "sha256"]) {
    assert.equal(active[key], clip[key], `${clip.id || clip.output}: active ${key}`);
  }
}

assert.equal(activeAudio.status, "complete");
assert.equal(activeAudio.recording.clipCount, 48);
assert.equal(activeAudio.lines.length, 48);
assert.equal(activeAudio.recording.directionalClipCount, 30);
assert.equal(requirements.lines.length, 30);
assert.equal(receipt.importedClipCount, 30);
assert.equal(receipt.clips.length, 30);
assert.equal(new Set(receipt.clips.map((clip) => clip.sha256)).size, 30);
assert.equal(entranceRequirements.clipCount, 25);
assert.equal(entranceReceipt.importedClipCount, 25);
assert.equal(entranceReceipt.clips.length, 25);
assert.equal(houseByReplacedOutput.size, 21);
assert.equal(new Set(entranceReceipt.clips.map((clip) => clip.sha256)).size, 25);

// The r18 school export remains immutable historical evidence after r20.
const originalSchoolOpening = entranceReceipt.clips.find((clip) => clip.id === "hs_r17_002");
assert.ok(originalSchoolOpening);
assert.equal(schoolOpeningRevision.displayText, originalSchoolOpening.text);
assert.equal(schoolOpeningRevision.replaces.output, originalSchoolOpening.output);
assert.equal(schoolOpeningRevision.replaces.sha256, originalSchoolOpening.sha256);
assertFileMatches(schoolOpeningRevision, "historical r18 school opening");
assert.equal(activeByOutput.has(schoolOpeningRevision.output), false, "Superseded r18 school opening must not remain active");
assert.equal(exteriorRevision.status, "approved_for_chs_draft");
assert.equal(exteriorRevision.voice, "Evelyn");
assert.equal(exteriorRevision.style, "Soft");
assert.equal(exteriorRevision.speed, 0.9);
assert.equal(exteriorRevision.files.length, 2);
const exteriorByText = new Map(exteriorRevision.files.map((clip) => [clip.text, clip]));
assert.deepEqual([...exteriorByText.keys()].sort(), ["Oh look! Here is a house.", "Oh look! Here is a school."]);
const words = (text) => String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu);
for (const clip of exteriorRevision.files) {
  assert.deepEqual(words(clip.sourceText), words(clip.text), "Only delivery punctuation may change");
  assertFileMatches(clip, `approved r20 ${clip.id}`);
}

// Check every original clip and exact current mapping. R20 replaces two exterior
// lines; r22 replaces only the specifically approved House/Kid/HELP event here.
let replacedMappingCount = 0;
let replacedEventMappingCount = 0;
for (const [index, clip] of entranceReceipt.clips.entries()) {
  const required = entranceRequirements.lines[index];
  assert.equal(clip.index, index + 1);
  assert.equal(clip.id, required.id);
  assert.equal(clip.text, required.text);
  assert.equal(clip.output, required.output);
  assert.deepEqual(clip.replaces, required.replaces);
  assert.equal(clip.bitrateKbps, 320);
  assert.equal(clip.sampleRateHz, 44100);
  assert.equal(clip.channels, 1);
  assertFileMatches(clip, `r17 ${clip.id}`);
  const replacement = exteriorByText.get(clip.text);
  const eventReplacement = eventRevisionByReplacedOutput.get(clip.output);
  const expected = replacement || eventReplacement || clip;
  const active = activeByOutput.get(expected.output);
  assert.ok(active, `Missing approved active mapping ${clip.id}`);
  assertActiveMatches(active, expected);
  assert.equal(activeAudio.lines.filter((line) => line.text === clip.text && line.active !== false).length, 1,
    `${clip.id}: exactly one canonical text mapping`);
  if (replacement) {
    replacedMappingCount += 1;
    assert.equal(activeByOutput.has(clip.output), false, `${clip.id}: superseded r17 exterior remains active`);
    assert.notEqual(replacement.sha256, clip.sha256, `${clip.id}: replacement is not a distinct export`);
    assert.equal(active.sourceText, replacement.sourceText);
  } else if (eventReplacement) {
    replacedEventMappingCount += 1;
    assert.equal(clip.id, "hs_r17_009", "No other r17 event may be replaced in r22");
    assert.equal(activeByOutput.has(clip.output), false, "Superseded r17 House/HELP remains active");
    assertFileMatches(eventReplacement, "approved r22 House/HELP event");
    assert.equal(eventReplacement.replaces.sha256, clip.sha256);
  } else {
    assert.equal(active.revision, "r17-entrance-house");
  }
  assert.equal(active.audioEdit, undefined);
  if (clip.replaces) {
    assert.equal(clip.text, clip.replaces.text.replace(/home/g, "house"));
    const original = fs.readFileSync(path.join(root, clip.replaces.output));
    assert.equal(sha256(original), clip.replaces.sha256, `${clip.id}: replaced source changed`);
  }
  for (const location of required.contextManifestLocations) {
    const at = (pointer) => pointer.split("/").slice(1).reduce((value, key) => value[key], contextManifest);
    assert.equal(at(location.textPointer), clip.text, `${clip.id}: runtime text`);
    assert.equal(at(location.audioPointer), expected.output, `${clip.id}: runtime audio`);
  }
}
assert.equal(replacedMappingCount, 2, "Only the two exterior lines may replace r17 mappings");
assert.equal(replacedEventMappingCount, 1, "Exactly the approved House/Kid/HELP event may additionally replace an r17 mapping");

for (const line of requirements.lines) {
  const contextEvent = contextManifest.contexts[line.context].recipientEvents[line.recipient][line.event];
  const audioKey = line.kind === "event" ? "eventAudio" : "questionAudio";
  const textKey = line.kind === "event" ? "eventText" : "questionText";
  const active = activeByOutput.get(contextEvent[audioKey]);
  const imported = receiptById.get(line.id);
  assert.ok(active, `${line.id} is missing from the active audio manifest`);
  assert.ok(imported, `${line.id} is missing from the import receipt`);
  assert.equal(imported.text, originalRecordingText(line.text));
  assert.equal(imported.output, line.output);
  assert.equal(imported.bitrateKbps, 320);
  assert.equal(imported.sampleRateHz, 44100);
  assert.equal(imported.channels, 1);
  assert.ok(imported.durationSeconds >= 4 && imported.durationSeconds <= 6);

  // Original exports remain immutable provenance even after r15 and r17 replacements.
  const sourceBytes = fs.readFileSync(path.join(root, imported.output));
  assert.equal(sourceBytes.length, imported.bytes);
  assert.equal(sha256(sourceBytes), imported.sha256);

  const activeBytes = fs.readFileSync(path.join(root, active.output));
  assert.equal(activeBytes.length, active.bytes);
  assert.equal(sha256(activeBytes), active.sha256);

  assert.equal(active.audioEdit, undefined, `${line.id} must not retain an active synthetic-pause edit`);

  assert.equal(contextEvent[audioKey], active.output);
  assert.equal(contextEvent[textKey], active.text);

  if (line.kind === "question") {
    const replacement = contextFirstByLegacyOutput.get(line.output);
    assert.ok(replacement, `${line.id} has no context-first replacement provenance`);
    assertFileMatches(replacement, `r15 ${line.id}`);
    const expected = line.context === "HOME" ? houseByReplacedOutput.get(replacement.output) : replacement;
    assert.ok(expected, `${line.id} lacks the current context-first recording`);
    assertActiveMatches(active, expected);
    const place = line.context === "HOME" ? "house" : "school";
    assert.match(active.text, new RegExp(`^At the kid's ${place}, who will `));
    if (line.context === "HOME") assert.equal(active.revision, "r17-entrance-house");
    else assert.equal(active.questionRevision, "r15-context-first");
    assert.notEqual(active.sha256, imported.sha256, `${line.id} still uses the superseded context-last question`);
  } else {
    const previous = line.context === "HOME" ? houseByReplacedOutput.get(imported.output) : imported;
    assert.ok(previous, `${line.id} lacks its historical event recording`);
    const expected = eventRevisionByReplacedOutput.get(previous.output) || previous;
    if (expected !== previous) {
      assert.equal(expected.replaces.sha256, previous.sha256, `${line.id}: r22 replacement lacks exact provenance`);
      assertFileMatches(expected, `approved r22 event ${line.id}`);
    }
    assertActiveMatches(active, expected);
  }
}

console.log("PASS: historical directional/r15/r17/r18 provenance, r20 exterior recordings and approved r22 event mappings are release-wired");
console.log("- All 30 original NaturalReaders files still match the immutable directional import receipt.");
console.log("- All 25 r17 sources match their receipt; 22 remain active, two exteriors use r20 and House/Kid/HELP uses r22.");
console.log("- Historical r18 and all 21 replaced files retain their hashes; all question recordings remain unchanged.");
