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

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function originalRecordingText(text) {
  return String(text).replace(/, at the kid's (home|school)\?$/, " at the kid's $1?");
}

const activeById = new Map(activeAudio.lines.map((line) => [line.id, line]));
const receiptById = new Map(receipt.clips.map((line) => [line.id, line]));

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
  assert.equal(active.text, line.text);
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

  assert.equal(active.output, imported.output, `${line.id} must use the imported NaturalReaders source`);
  assert.equal(active.bytes, imported.bytes, `${line.id} active byte count changed`);
  assert.equal(active.durationSeconds, imported.durationSeconds, `${line.id} active duration changed`);
  assert.equal(active.sha256, imported.sha256, `${line.id} active source hash changed`);
  assert.equal(active.audioEdit, undefined, `${line.id} must not retain an active synthetic-pause edit`);

  const contextEvent = contextManifest.contexts[line.context].recipientEvents[line.recipient][line.event];
  const audioKey = line.kind === "event" ? "eventAudio" : "questionAudio";
  assert.equal(contextEvent[audioKey], active.output);
}

console.log("PASS: 30 Home/School directional Evelyn clips are imported and release-wired");
console.log("- All 30 active NaturalReaders files match the immutable import receipt.");
console.log("- Twelve event clips and eighteen questions use their original recordings; no synthetic-pause derivative is active.");
console.log("- Every recipient-aware Home/School event or question points to its intended active recording.");
