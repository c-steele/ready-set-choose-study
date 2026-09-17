import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Validate all clips before writing. Runtime activation is a separate reviewed step.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "versions/chs-home-school-evelyn-v1/data");
const requirements = JSON.parse(await fs.readFile(path.join(dataDir, "entrance_house_audio_requirements.json"), "utf8"));
const args = process.argv.slice(2);
const write = args.includes("--write");
const sources = args.filter((arg) => !arg.startsWith("--"));
assert.ok(args.every((arg) => !arg.startsWith("--") || arg === "--write"), "Only --write is supported.");
assert.equal(sources.length, 1, "Usage: node scripts/import_home_school_entrance_audio.mjs /absolute/path/to/export.zip-or-clips-directory [--write]");
const source = path.resolve(sources[0]);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readOptional = async (file) => fs.readFile(file).catch((error) => {
  if (error.code === "ENOENT") return null;
  throw error;
});
function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { maxBuffer: 32 * 1024 * 1024, ...options });
  assert.equal(result.status, 0, `${command} failed: ${result.error?.message || String(result.stderr || result.stdout)}`);
  return result.stdout;
}
const targetName = (line) => path.basename(line.output);
const normalizePrefix = (text) => String(text).toLowerCase().replace(/[^a-z0-9]/g, "");
assert.equal(requirements.lines.length, 25, "Expected 25 recording requirements.");
assert.equal(new Set(requirements.lines.map((line) => line.output)).size, 25, "Target paths must be unique.");
requirements.lines.forEach((line, index) => {
  assert.equal(line.index, index + 1, "Requirements must be ordered 1–25.");
  assert.match(line.output, /^assets\/home_school\/generated\/audio\/hs_r17_\d{3}_[a-z_]+\.mp3$/);
});
const sourceStat = await fs.stat(source);
let archiveHash = null;
let entries;
if (sourceStat.isDirectory()) {
  const names = await fs.readdir(source, { withFileTypes: true });
  entries = names.filter((entry) => entry.isFile() && /\.mp3$/i.test(entry.name)).map((entry) => entry.name);
} else {
  assert.ok(sourceStat.isFile() && /\.zip$/i.test(source), "Provide a ZIP of 25 clips or a directory of 25 MP3s. A combined recording must be segmented and reviewed first.");
  archiveHash = hash(await fs.readFile(source));
  entries = String(run("unzip", ["-Z1", source])).split(/\r?\n/).filter((entry) => /\.mp3$/i.test(entry) && !entry.startsWith("__MACOSX/"));
}
assert.equal(entries.length, 25, `Expected exactly 25 MP3s; found ${entries.length}.`);
const ordered = requirements.lines.map((line) => {
  const matches = entries.filter((entry) => {
    const name = path.basename(entry);
    if (name === targetName(line)) return true;
    const numbered = name.match(/^(\d+)\.(.+)\.mp3$/i);
    if (!numbered || Number(numbered[1]) !== line.index) return false;
    const prefix = normalizePrefix(numbered[2]);
    return prefix.length >= 10 && normalizePrefix(line.text).startsWith(prefix);
  });
  assert.equal(matches.length, 1, `Line ${line.index}: expected one exact target filename or matching numbered NaturalReaders text prefix; found ${matches.length}.`);
  return matches[0];
});
assert.equal(new Set(ordered).size, 25, "Each input clip must map to exactly one requirement.");

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wtc-entrance-audio-"));
const checked = [];
try {
  for (const [index, line] of requirements.lines.entries()) {
    const entry = ordered[index];
    const bytes = sourceStat.isDirectory()
      ? await fs.readFile(path.join(source, entry))
      : run("unzip", ["-p", source, entry]);
    assert.ok(bytes.length > 10000, `Line ${line.index}: MP3 is too small.`);
    const tempFile = path.join(tempDir, `${line.index}.mp3`);
    await fs.writeFile(tempFile, bytes, { flag: "wx" });
    const probe = JSON.parse(String(run(process.env.FTC_FFPROBE_PATH || "ffprobe", [
      "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,bit_rate,sample_rate,channels", "-of", "json", tempFile,
    ])));
    assert.equal(probe.streams?.length, 1, `Line ${line.index}: expected one audio stream.`);
    const stream = probe.streams[0];
    assert.equal(stream.codec_name, "mp3", `Line ${line.index}: codec`);
    assert.equal(Number(stream.bit_rate), 320000, `Line ${line.index}: bitrate`);
    assert.equal(Number(stream.sample_rate), 44100, `Line ${line.index}: sample rate`);
    assert.equal(Number(stream.channels), 1, `Line ${line.index}: channels`);
    const durationSeconds = Number(probe.format.duration);
    assert.ok(durationSeconds >= 0.4 && durationSeconds <= 20, `Line ${line.index}: unexpected duration ${durationSeconds}.`);
    const sha256 = hash(bytes);
    const existing = await readOptional(path.join(root, line.output));
    assert.ok(!existing || hash(existing) === sha256, `Refusing to overwrite differing target ${line.output}.`);
    checked.push({ bytes, clip: {
      index: line.index, id: line.id, text: line.text, output: line.output,
      sourceEntry: entry, bytes: bytes.length, durationSeconds, sampleRateHz: 44100,
      channels: 1, bitrateKbps: 320, sha256, replaces: line.replaces,
    } });
  }
  assert.equal(new Set(checked.map(({ clip }) => clip.sha256)).size, 25, "Duplicate clip bytes detected; all 25 spoken lines are different.");
  const receipt = {
    schemaVersion: 1, candidateId: requirements.candidateId, revision: requirements.revision,
    status: "imported_not_activated", service: requirements.recording.service,
    voice: requirements.recording.voice, recordingSettings: requirements.recording,
    sourceType: sourceStat.isDirectory() ? "directory" : "zip",
    sourceName: path.basename(source), sourceZipSha256: archiveHash,
    importedClipCount: checked.length,
    validation: "Sequential text-matched filenames; nonempty distinct 44.1 kHz mono 320 kbps MP3s; bounded durations; SHA-256 provenance. Spoken content and voice still require listening review.",
    requirementsManifest: "data/entrance_house_audio_requirements.json",
    clips: checked.map(({ clip }) => clip),
  };
  const receiptPath = path.join(dataDir, "entrance_house_audio_import_receipt.json");
  const serializedReceipt = `${JSON.stringify(receipt, null, 2)}\n`;
  const existingReceipt = await readOptional(receiptPath);
  assert.ok(!existingReceipt || existingReceipt.toString("utf8") === serializedReceipt, "Refusing to replace a differing entrance audio receipt.");
  if (write) {
    for (const { bytes, clip } of checked) {
      const destination = path.join(root, clip.output);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      try { await fs.writeFile(destination, bytes, { flag: "wx" }); }
      catch (error) { if (error.code !== "EEXIST") throw error; }
      assert.equal(hash(await fs.readFile(destination)), clip.sha256, `Written hash mismatch: ${clip.output}`);
    }
    if (!existingReceipt) await fs.writeFile(receiptPath, serializedReceipt, { flag: "wx" });
  }
  console.log(JSON.stringify({ status: write ? "imported_not_activated" : "validated_no_files_changed", clipCount: checked.length,
    receipt: write ? path.relative(root, receiptPath) : null,
    message: "Existing recordings and runtime manifests were not changed. Listen to every clip before activating its mapping.",
  }, null, 2));
} finally {
  // This is the unique, process-created temporary directory only.
  await fs.rm(tempDir, { recursive: true, force: true });
}
