import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidateRelative = "versions/chs-home-school-evelyn-v1/";
const candidate = path.join(root, candidateRelative);
const repairPath = path.join(candidate, "data/visual_repair_manifest.json");
const repairBytes = fs.readFileSync(repairPath);
const repair = JSON.parse(repairBytes);
const masterRelative = `${candidateRelative}assets/visual-repair-v1/source-school-room.webp`;
const masterPath = path.join(root, masterRelative);
const masterBytes = fs.readFileSync(masterPath);
const master = await sharp(masterBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
if (master.info.width !== 1536 || master.info.height !== 1024 || master.info.channels !== 3) throw new Error("Unexpected original School room geometry");
const roi = { x: 0, y: 384, width: 34, height: 39 };
const rowRuns = [];
for (let y = roi.y; y < roi.y + roi.height; y += 1) {
  let start = -1;
  for (let x = roi.x; x <= roi.x + roi.width; x += 1) {
    const index = (y * 1536 + x) * 3;
    const selected = x < roi.x + roi.width && master.data[index + 1] > master.data[index] && master.data[index + 1] > master.data[index + 2];
    if (selected && start < 0) start = x;
    if (!selected && start >= 0) { rowRuns.push([start, y, x - start, 1]); start = -1; }
  }
}
const selectedPixelCount = rowRuns.reduce((total, run) => total + run[2], 0);
if (!selectedPixelCount || selectedPixelCount >= roi.width * roi.height) throw new Error("Original greenery selection is empty or covers the entire ROI");
const patchPng = await sharp(masterBytes).extract({ left: roi.x, top: roi.y, width: roi.width, height: roi.height }).png().toBuffer();
const patchHref = `data:image/png;base64,${patchPng.toString("base64")}`;
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const relative = (value) => path.relative(root, value).split(path.sep).join("/");
const manifest = {
  version: "who-takes-care-window-greenery-v1",
  scope: "Local Who Takes Care candidate only; no source raster, existing manifest, CHS source, or published study is changed",
  treatment: "Copy immutable original green outdoor bush pixels through a fixed source-coordinate integer clip; no drawing, recoloring, or regenerated artwork",
  sourceMaster: masterRelative,
  sourceMasterSha256: sha(masterBytes),
  visualRepairManifestSha256: sha(repairBytes),
  geometry: { width: 1536, height: 1024, roi, selection: "G > R AND G > B in original master within fixed ROI", rowRuns, selectedPixelCount },
  palettes: {},
};
for (const [slug, palette] of Object.entries(repair.palettes)) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Unexpected palette slug");
  const expectedSource = `${candidateRelative}assets/visual-repair-v1/${slug}/school-room.webp`;
  if (palette.schoolBackground !== expectedSource) throw new Error(`Unexpected School source: ${palette.schoolBackground}`);
  const sourcePath = path.join(root, expectedSource);
  const sourceBytes = fs.readFileSync(sourcePath);
  if (sha(sourceBytes) !== palette.schoolBackgroundSha256) throw new Error(`School source no longer matches verified repair manifest: ${slug}`);
  const source = await sharp(sourceBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (source.info.width !== 1536 || source.info.height !== 1024) throw new Error(`Unexpected School palette geometry: ${slug}`);
  const sourcePng = await sharp(sourceBytes).png().toBuffer();
  const sourceHref = `data:image/png;base64,${sourcePng.toString("base64")}`;
  const clip = rowRuns.map(([x, y, width, height]) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" shape-rendering="crispEdges"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024" preserveAspectRatio="none"><title>Original ${slug} School room with original outdoor window greenery restored</title><defs><clipPath id="original-outdoor-greenery" clipPathUnits="userSpaceOnUse">${clip}</clipPath></defs><image href="${sourceHref}" width="1536" height="1024" preserveAspectRatio="none"/><image href="${patchHref}" x="${roi.x}" y="${roi.y}" width="${roi.width}" height="${roi.height}" preserveAspectRatio="none" clip-path="url(#original-outdoor-greenery)"/></svg>\n`;
  const destination = path.join(candidate, "assets/window-greenery-v1", slug, "school-room.svg");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, svg);
  let changedPixelCount = 0;
  for (const [x, y, width] of rowRuns) for (let column = x; column < x + width; column += 1) {
    const offset = (y * 1536 + column) * 3;
    if ([0, 1, 2].some((channel) => source.data[offset + channel] !== master.data[offset + channel])) changedPixelCount += 1;
  }
  manifest.palettes[slug] = { characterHex: palette.characterHex, schoolBackgroundSource: expectedSource, schoolBackgroundSourceSha256: sha(sourceBytes), output: relative(destination), outputSha256: sha(Buffer.from(svg)), selectedPixelCount, changedPixelCount };
}
if (Object.keys(manifest.palettes).length !== 17) throw new Error("Expected all 17 palettes");
if (!fs.readFileSync(repairPath).equals(repairBytes) || !fs.readFileSync(masterPath).equals(masterBytes)) throw new Error("An immutable input changed during the build");
fs.writeFileSync(path.join(candidate, "data/window_greenery_manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ status: "BUILT", palettes: 17, selectedPixelCount, roi, outputRoot: `${candidateRelative}assets/window-greenery-v1/`, sourceRastersChanged: 0, existingManifestsChanged: 0 }));
