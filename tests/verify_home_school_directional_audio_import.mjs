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

// Check every new clip and its exact context mapping, including the four
// entrance lines and six kid-recipient replacements outside the old 30-line pack.
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
  const active = activeByOutput.get(clip.output);
  assert.ok(active, `Missing r17 active mapping ${clip.id}`);
  assertActiveMatches(active, clip);
  assert.equal(active.revision, "r17-entrance-house");
  assert.equal(active.audioEdit, undefined);
  if (clip.replaces) {
    assert.equal(clip.text, clip.replaces.text.replace(/home/g, "house"));
    const original = fs.readFileSync(path.join(root, clip.replaces.output));
    assert.equal(sha256(original), clip.replaces.sha256, `${clip.id}: replaced source changed`);
  }
  for (const location of required.contextManifestLocations) {
    const at = (pointer) => pointer.split("/").slice(1).reduce((value, key) => value[key], contextManifest);
    assert.equal(at(location.textPointer), clip.text, `${clip.id}: runtime text`);
    assert.equal(at(location.audioPointer), clip.output, `${clip.id}: runtime audio`);
  }
}

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
    const expected = line.context === "HOME" ? houseByReplacedOutput.get(imported.output) : imported;
    assert.ok(expected, `${line.id} lacks its current event recording`);
    assertActiveMatches(active, expected);
  }
}

console.log("PASS: historical directional/r15 provenance and current r17 House recordings are release-wired");
console.log("- All 30 original NaturalReaders files still match the immutable directional import receipt.");
console.log("- All 25 r17 clips match their receipt and runtime mappings; all 21 replaced files retain their original hashes.");
console.log("- School recordings are unchanged; House events and context-first questions use r17 recordings with no synthetic pause edit.");
