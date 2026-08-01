import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultReviewRoot = path.resolve(projectRoot, "..", "Find_the_Caregiver_Evelyn_Audio_Review");
const reviewRoot = path.resolve(process.env.FIND_CAREGIVER_EVELYN_REVIEW_ROOT || defaultReviewRoot);
const sourceClipsDir = path.join(reviewRoot, "clips_for_review");
const sourceNarrationManifestPath = path.join(reviewRoot, "find_the_caregiver_narration_manifest.json");
const legacyManifestPath = path.join(projectRoot, "data", "canonical_audio_manifest.json");
const destinationAudioDir = path.join(projectRoot, "audio_evelyn");
const destinationManifestPath = path.join(projectRoot, "data", "canonical_audio_manifest_evelyn.json");

const EXPECTED_CLIP_COUNT = 158;
const EXPECTED_LEGACY_LINE_COUNT = 73;

function normalizeAudioText(text) {
  return String(text || "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readJson(filename) {
  return JSON.parse(await fs.readFile(filename, "utf8"));
}

async function sha256File(filename) {
  return sha256(await fs.readFile(filename));
}

async function writeIfChanged(filename, content) {
  let current = null;
  try {
    current = await fs.readFile(filename, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (current === content) return false;
  await fs.writeFile(filename, content);
  return true;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [narrationManifest, legacyManifest] = await Promise.all([
  readJson(sourceNarrationManifestPath),
  readJson(legacyManifestPath),
]);

const clips = narrationManifest.clips || [];
assert(clips.length === EXPECTED_CLIP_COUNT,
  `Expected ${EXPECTED_CLIP_COUNT} narration records, found ${clips.length}`);
assert((legacyManifest.lines || []).length === EXPECTED_LEGACY_LINE_COUNT,
  `Expected ${EXPECTED_LEGACY_LINE_COUNT} legacy lines, found ${(legacyManifest.lines || []).length}`);

const expectedFilenames = new Set();
const expectedIds = new Set();
const expectedNormalizedTexts = new Set();
for (const [index, clip] of clips.entries()) {
  const expectedId = `ftc_${String(index + 1).padStart(3, "0")}`;
  assert(clip.id === expectedId, `Record ${index + 1}: expected ID ${expectedId}, found ${clip.id}`);
  assert(path.basename(clip.filename || "") === clip.filename,
    `${clip.id}: filename must be a basename, found ${clip.filename}`);
  assert(String(clip.filename).toLowerCase().endsWith(".mp3"),
    `${clip.id}: expected an MP3 filename, found ${clip.filename}`);
  assert(!expectedFilenames.has(clip.filename), `${clip.id}: duplicate filename ${clip.filename}`);
  expectedFilenames.add(clip.filename);
  assert(!expectedIds.has(clip.id), `Duplicate clip ID ${clip.id}`);
  expectedIds.add(clip.id);
  const normalizedText = normalizeAudioText(clip.text);
  assert(normalizedText, `${clip.id}: normalized text is empty`);
  assert(!expectedNormalizedTexts.has(normalizedText),
    `${clip.id}: duplicate normalized text ${JSON.stringify(normalizedText)}`);
  expectedNormalizedTexts.add(normalizedText);
}

const sourceDirectoryEntries = await fs.readdir(sourceClipsDir, { withFileTypes: true });
const sourceMp3Names = sourceDirectoryEntries
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp3"))
  .map((entry) => entry.name)
  .sort();
assert(sourceMp3Names.length === EXPECTED_CLIP_COUNT,
  `Expected ${EXPECTED_CLIP_COUNT} source MP3s, found ${sourceMp3Names.length}`);
const missingSourceNames = [...expectedFilenames].filter((filename) => !sourceMp3Names.includes(filename));
const unexpectedSourceNames = sourceMp3Names.filter((filename) => !expectedFilenames.has(filename));
assert(missingSourceNames.length === 0,
  `Missing source MP3s: ${missingSourceNames.join(", ")}`);
assert(unexpectedSourceNames.length === 0,
  `Unexpected source MP3s: ${unexpectedSourceNames.join(", ")}`);

await fs.mkdir(destinationAudioDir, { recursive: true });
const existingDestinationEntries = await fs.readdir(destinationAudioDir, { withFileTypes: true });
const existingUnexpectedMp3s = existingDestinationEntries
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp3"))
  .map((entry) => entry.name)
  .filter((filename) => !expectedFilenames.has(filename));
assert(existingUnexpectedMp3s.length === 0,
  `Refusing to continue with unexpected destination MP3s: ${existingUnexpectedMp3s.join(", ")}`);

let copied = 0;
let unchanged = 0;
const evelynLines = [];
for (const clip of clips) {
  const source = path.join(sourceClipsDir, clip.filename);
  const destination = path.join(destinationAudioDir, clip.filename);
  const sourceBuffer = await fs.readFile(source);
  assert(sourceBuffer.length > 0, `${clip.id}: source MP3 is empty`);
  const sourceHash = sha256(sourceBuffer);

  let destinationHash = null;
  try {
    destinationHash = await sha256File(destination);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (destinationHash === sourceHash) {
    unchanged += 1;
  } else {
    await fs.copyFile(source, destination);
    copied += 1;
    destinationHash = await sha256File(destination);
  }
  assert(destinationHash === sourceHash, `${clip.id}: destination hash does not match source`);

  evelynLines.push({
    id: clip.id,
    text: clip.text,
    normalizedText: normalizeAudioText(clip.text),
    category: clip.category,
    runtimeGroup: clip.runtimeGroup,
    active: Boolean(clip.active),
    conditional: Boolean(clip.conditional),
    plannedForNarration: Boolean(clip.plannedForNarration),
    output: `audio_evelyn/${clip.filename}`,
    sha256: sourceHash,
    bytes: sourceBuffer.length,
    sourceKey: clip.sourceKey ?? null,
    note: clip.note ?? null,
  });
}

const destinationMp3Names = (await fs.readdir(destinationAudioDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp3"))
  .map((entry) => entry.name)
  .sort();
assert(destinationMp3Names.length === EXPECTED_CLIP_COUNT,
  `Expected ${EXPECTED_CLIP_COUNT} destination MP3s, found ${destinationMp3Names.length}`);
assert(destinationMp3Names.every((filename) => expectedFilenames.has(filename)),
  "Destination audio directory contains an unexpected MP3");

const normalizedTextToOutput = Object.fromEntries(
  evelynLines.map((line) => [line.normalizedText, line.output])
);
assert(Object.keys(normalizedTextToOutput).length === EXPECTED_CLIP_COUNT,
  "Normalized-text mapping count does not match clip count");

const legacyManifestHash = await sha256File(legacyManifestPath);
const sourceNarrationManifestHash = await sha256File(sourceNarrationManifestPath);
const combinedAudioHash = sha256(Buffer.from(
  evelynLines.map((line) => `${line.id}\t${line.sha256}\t${line.output}`).join("\n"),
  "utf8"
));

const extendedManifest = {
  ...legacyManifest,
  evelynImport: {
    schemaVersion: 1,
    voice: "Evelyn — 90+ Languages",
    provider: "NaturalReaders Commercial",
    sourceNarrationManifest: "local-review-package/find_the_caregiver_narration_manifest.json",
    sourceNarrationManifestSha256: sourceNarrationManifestHash,
    legacyManifest: "data/canonical_audio_manifest.json",
    legacyManifestSha256: legacyManifestHash,
    legacyLineCount: legacyManifest.lines.length,
    destinationDirectory: "audio_evelyn",
    clipCount: evelynLines.length,
    combinedAudioMappingSha256: combinedAudioHash,
    normalization: "Curly apostrophes to straight apostrophe; curly quotes to straight quote; collapse whitespace; trim; lowercase (matches app.js normalizeAudioText).",
    corpusCounts: narrationManifest.countSummary,
  },
  evelynLines,
  normalizedTextToOutput,
};

// Prove that extending the new manifest did not mutate legacy metadata or entries.
assert(JSON.stringify(extendedManifest.source) === JSON.stringify(legacyManifest.source),
  "Legacy source metadata changed unexpectedly");
assert(JSON.stringify(extendedManifest.generation) === JSON.stringify(legacyManifest.generation),
  "Legacy generation metadata changed unexpectedly");
assert(JSON.stringify(extendedManifest.lines) === JSON.stringify(legacyManifest.lines),
  "Legacy line entries changed unexpectedly");

const manifestChanged = await writeIfChanged(
  destinationManifestPath,
  `${JSON.stringify(extendedManifest, null, 2)}\n`
);

// Read the written artifact back and verify every normalized mapping and hash.
const writtenManifest = await readJson(destinationManifestPath);
assert((writtenManifest.lines || []).length === EXPECTED_LEGACY_LINE_COUNT,
  "Written manifest legacy-line count is incorrect");
assert((writtenManifest.evelynLines || []).length === EXPECTED_CLIP_COUNT,
  "Written manifest Evelyn-line count is incorrect");
assert(Object.keys(writtenManifest.normalizedTextToOutput || {}).length === EXPECTED_CLIP_COUNT,
  "Written manifest normalized mapping count is incorrect");
for (const line of writtenManifest.evelynLines) {
  assert(writtenManifest.normalizedTextToOutput[line.normalizedText] === line.output,
    `${line.id}: normalized-text map does not point to its output`);
  const destination = path.join(projectRoot, line.output);
  assert(await sha256File(destination) === line.sha256,
    `${line.id}: written manifest hash does not match destination MP3`);
}

console.log(JSON.stringify({
  projectRoot,
  sourceClipsDir,
  destinationAudioDir,
  destinationManifestPath,
  copied,
  unchanged,
  destinationMp3Count: destinationMp3Names.length,
  legacyLineCount: writtenManifest.lines.length,
  evelynLineCount: writtenManifest.evelynLines.length,
  normalizedTextMappingCount: Object.keys(writtenManifest.normalizedTextToOutput).length,
  legacyManifestSha256: legacyManifestHash,
  sourceNarrationManifestSha256: sourceNarrationManifestHash,
  combinedAudioMappingSha256: combinedAudioHash,
  manifestChanged,
}, null, 2));
