import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidate = path.join(root, "versions/chs-home-school-evelyn-v1");
const manifest = JSON.parse(fs.readFileSync(path.join(candidate, "data/window_greenery_manifest.json"), "utf8"));
const repairBytes = fs.readFileSync(path.join(candidate, "data/visual_repair_manifest.json"));
const repair = JSON.parse(repairBytes);
const sha = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
assert.equal(manifest.version, "who-takes-care-window-greenery-v1");
assert.equal(sha(repairBytes), manifest.visualRepairManifestSha256);
assert.equal(Object.keys(manifest.palettes).length, 17);
assert.deepEqual(Object.keys(manifest.palettes).sort(), Object.keys(repair.palettes).sort());
assert.deepEqual(manifest.geometry.roi, { x: 0, y: 384, width: 34, height: 39 });
assert.equal(manifest.geometry.width, 1536);
assert.equal(manifest.geometry.height, 1024);
const masterBytes = fs.readFileSync(path.join(root, manifest.sourceMaster));
assert.equal(sha(masterBytes), manifest.sourceMasterSha256);
const master = await sharp(masterBytes).removeAlpha().raw().toBuffer();
const mask = new Uint8Array(1536 * 1024);
let selectedPixelCount = 0;
// Independently reconstruct the narrow original-green pixel selection.
for (let y = 384; y < 423; y += 1) for (let x = 0; x < 34; x += 1) {
  const offset = (y * 1536 + x) * 3;
  if (master[offset + 1] > master[offset] && master[offset + 1] > master[offset + 2]) { mask[y * 1536 + x] = 1; selectedPixelCount += 1; }
}
assert.equal(selectedPixelCount, manifest.geometry.selectedPixelCount);
let changedPixels = 0;
let restoredPixelChecks = 0;
let unchangedPixelChecks = 0;
for (const [slug, record] of Object.entries(manifest.palettes)) {
  const originalBytes = fs.readFileSync(path.join(root, record.schoolBackgroundSource));
  assert.equal(sha(originalBytes), record.schoolBackgroundSourceSha256);
  assert.equal(sha(originalBytes), repair.palettes[slug].schoolBackgroundSha256);
  const original = await sharp(originalBytes).removeAlpha().raw().toBuffer();
  const svgBytes = fs.readFileSync(path.join(root, record.output));
  assert.equal(sha(svgBytes), record.outputSha256);
  const svg = svgBytes.toString("utf8");
  assert.equal((svg.match(/<image /g) || []).length, 2);
  assert.doesNotMatch(svg, /<filter|feColorMatrix|hue-rotate|<path|<polygon/);
  assert.match(svg, /shape-rendering="crispEdges"/);
  const rendered = await sharp(svgBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(rendered.info.width, 1536);
  assert.equal(rendered.info.height, 1024);
  assert.equal(rendered.info.channels, 3);
  let paletteChangedPixels = 0;
  for (let index = 0; index < mask.length; index += 1) {
    const offset = index * 3;
    const expected = mask[index] ? master : original;
    if (rendered.data[offset] !== expected[offset] || rendered.data[offset + 1] !== expected[offset + 1] || rendered.data[offset + 2] !== expected[offset + 2]) {
      assert.fail(`${slug}: ${mask[index] ? "restored greenery does not match master" : "pixel outside repair changed"} at ${index % 1536},${Math.floor(index / 1536)}`);
    }
    if (mask[index]) restoredPixelChecks += 1; else unchangedPixelChecks += 1;
    if ([0, 1, 2].some((channel) => rendered.data[offset + channel] !== original[offset + channel])) paletteChangedPixels += 1;
  }
  assert.equal(paletteChangedPixels, record.changedPixelCount);
  assert.ok(paletteChangedPixels > 0, `${slug}: expected affected outdoor bush was not repaired`);
  changedPixels += paletteChangedPixels;
}
console.log(JSON.stringify({ status: "PASS", palettes: 17, nativeSchoolRoomDimensions: "1536×1024", selectedPixelCount, restoredPixelChecks, exactUnchangedPixelChecks: unchangedPixelChecks, changedPixels, scope: "Only original-green pixels in fixed outdoor-bush ROI; sky, sill, indoor plant/pot, all furniture and remaining artwork retain each original palette source exactly" }));
