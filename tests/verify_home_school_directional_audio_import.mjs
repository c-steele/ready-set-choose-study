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

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function originalRecordingText(text) {
  return String(text).replace(/, at the kid's (home|school)\?$/, " at the kid's $1?");
}

const activeById = new Map(activeAudio.lines.map((line) => [line.id, line]));
const receiptById = new Map(receipt.clips.map((line) => [line.id, line]));
const contextFirstByLegacyOutput = new Map(contextFirstReceipt.clips.map((line) => [line.legacyOutput, line]));

assert.equal(activeAudio.status, "complete");
assert.equal(activeAudio.recording.clipCount, 44);
assert.equal(activeAudio.recording.directionalClipCount, 30);
assert.equal(requirements.lines.length, 30);
assert.equal(receipt.importedClipCount, 30);
assert.equal(receipt.clips.length, 30);
assert.equal(new Set(receipt.clips.map((clip) => clip.sha256)).size, 30);

for (const line of requirements.lines) {
  const active = activeById.get(line.id);
  const imported = receiptById.get(line.id);
  assert.ok(active, `${line.id} is missing from the active audio manifest`);
  assert.ok(imported, `${line.id} is missing from the import receipt`);
  assert.equal(imported.text, originalRecordingText(line.text));
  assert.equal(imported.output, line.output);
  assert.equal(imported.bitrateKbps, 320);
  assert.equal(imported.sampleRateHz, 44100);
  assert.equal(imported.channels, 1);
  assert.ok(imported.durationSeconds >= 4 && imported.durationSeconds <= 6);

  // The import receipt is historical provenance for the untouched NaturalReaders
  // export, which is also the active source for natural comma-only timing.
  const sourceBytes = fs.readFileSync(path.join(root, imported.output));
  assert.equal(sourceBytes.length, imported.bytes);
  assert.equal(sha256(sourceBytes), imported.sha256);

  const activeBytes = fs.readFileSync(path.join(root, active.output));
  assert.equal(activeBytes.length, active.bytes);
  assert.equal(sha256(activeBytes), active.sha256);

  assert.equal(active.audioEdit, undefined, `${line.id} must not retain an active synthetic-pause edit`);

  const contextEvent = contextManifest.contexts[line.context].recipientEvents[line.recipient][line.event];
  const audioKey = line.kind === "event" ? "eventAudio" : "questionAudio";
  assert.equal(contextEvent[audioKey], active.output);

  if (line.kind === "question") {
    const replacement = contextFirstByLegacyOutput.get(line.output);
    assert.ok(replacement, `${line.id} has no context-first replacement provenance`);
    assert.equal(active.text, replacement.text);
    assert.match(active.text, new RegExp(`^At the kid's ${line.context.toLowerCase()}, who will `));
    assert.equal(active.output, replacement.output);
    assert.equal(active.bytes, replacement.bytes);
    assert.equal(active.durationSeconds, replacement.durationSeconds);
    assert.equal(active.sha256, replacement.sha256);
    assert.equal(active.questionRevision, "r15-context-first");
    assert.notEqual(active.sha256, imported.sha256, `${line.id} still uses the superseded context-last question`);
  } else {
    assert.equal(active.text, line.text);
    assert.equal(active.output, imported.output, `${line.id} event must use the imported NaturalReaders source`);
    assert.equal(active.bytes, imported.bytes, `${line.id} active event byte count changed`);
    assert.equal(active.durationSeconds, imported.durationSeconds, `${line.id} active event duration changed`);
    assert.equal(active.sha256, imported.sha256, `${line.id} active event source hash changed`);
  }
}

console.log("PASS: historical directional audio and r15 context-first replacements are release-wired");
console.log("- All 30 original NaturalReaders files still match the immutable directional import receipt.");
console.log("- Twelve directional event clips remain unchanged; eighteen directional questions use their r15 context-first recordings.");
console.log("- Every recipient-aware Home/School event or question points to its intended active recording, with no synthetic pause edit.");
