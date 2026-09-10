import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const candidateRoot = path.resolve(packageDir, "..");
const projectRoot = process.env.FTC_AUDIO_PROJECT_ROOT
  ? path.resolve(process.env.FTC_AUDIO_PROJECT_ROOT)
  : path.resolve(packageDir, "../../..");
const manifestPath = path.join(candidateRoot, "data", "missing_home_school_directional_audio_manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

if (manifest.missingClipCount !== 30 || manifest.lines?.length !== 30) {
  throw new Error(`Expected the unchanged 30-line recording manifest; found ${manifest.lines?.length ?? 0} lines.`);
}

const ids = new Set();
const outputs = new Set();
const results = [];

for (const line of manifest.lines) {
  if (!line.id || ids.has(line.id)) throw new Error(`Duplicate or missing recording ID: ${line.id || "(blank)"}`);
  if (!line.output || outputs.has(line.output)) throw new Error(`Duplicate or missing output path for ${line.id}`);
  if (path.extname(line.output).toLowerCase() !== ".mp3") throw new Error(`${line.id} does not target an MP3 file.`);
  ids.add(line.id);
  outputs.add(line.output);

  const absoluteOutput = path.resolve(projectRoot, line.output);
  const relativeCheck = path.relative(projectRoot, absoluteOutput);
  if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) {
    throw new Error(`${line.id} points outside the study project.`);
  }

  try {
    const bytes = await fs.readFile(absoluteOutput);
    if (bytes.length === 0) {
      results.push({ id: line.id, status: "EMPTY", bytes: 0, sha256: "", output: line.output });
      continue;
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    results.push({ id: line.id, status: "READY", bytes: bytes.length, sha256, output: line.output });
  } catch (error) {
    if (error?.code === "ENOENT") {
      results.push({ id: line.id, status: "MISSING", bytes: 0, sha256: "", output: line.output });
      continue;
    }
    results.push({ id: line.id, status: "UNREADABLE", bytes: 0, sha256: "", output: line.output, error: error?.message || String(error) });
  }
}

console.table(results.map(({ id, status, bytes, sha256, output }) => ({
  id,
  status,
  bytes,
  sha256: sha256 ? sha256.slice(0, 12) : "",
  file: path.basename(output),
})));

const counts = Object.fromEntries(
  ["READY", "MISSING", "EMPTY", "UNREADABLE"].map((status) => [
    status.toLowerCase(),
    results.filter((result) => result.status === status).length,
  ])
);

console.log(`\nEvelyn directional recordings: ${counts.ready}/30 ready`);
console.log(`Missing: ${counts.missing} | Empty: ${counts.empty} | Unreadable: ${counts.unreadable}`);

if (counts.ready !== 30) {
  console.error("\nINCOMPLETE: Add or replace every required MP3, then run this check again.");
  process.exitCode = 1;
} else {
  console.log("\nCOMPLETE: All 30 MP3 files exist, are nonempty, and produced SHA-256 hashes.");
  console.log("Full verification records:");
  console.log(JSON.stringify(results, null, 2));
}
