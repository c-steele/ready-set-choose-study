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
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export const version = "food-gap-and-fruit-mask-v1";
export const activeTrials = Object.freeze([1, 2, 5, 6, 7, 9, 10, 13, 14].flatMap((number) => ["a", "b", "c", "d"].map((letter) => `${number}${letter}`)));

// These bounded semantic regions contain only trapped background between a
// helper's lower torso/hands and the fruit bowl. Eyes, mouths, role labels,
// captions and the central recipient are outside every region. Only complete
// pure-white 4-connected components entirely inside a region are removed.
export const layouts = Object.freeze({
  mixedLeft: { regions: [[310, 610, 125, 155], [1445, 640, 310, 140]], pixelRange: [20000, 21000] },
  mixedRight: { regions: [[160, 640, 300, 140], [1490, 610, 125, 160]], pixelRange: [20000, 21000] },
  adults: { regions: [[285, 610, 125, 160], [1520, 610, 125, 160]], pixelRange: [24500, 26000] },
  children: { regions: [[150, 640, 310, 140], [1465, 640, 310, 140]], pixelRange: [14000, 16000] },
});

export function layoutForTrial(trialId) {
  if (!activeTrials.includes(trialId)) return null;
  const number = Number(trialId.slice(0, -1));
  if ([1, 2, 7, 14].includes(number)) return ["a", "b"].includes(trialId.at(-1)) ? "mixedLeft" : "mixedRight";
  return [5, 9].includes(number) ? "adults" : "children";
}

export function rowRunsForMask(mask, width, height) {
  const rowRuns = [];
  for (let y = 0; y < height; y += 1) {
    let start = -1;
    for (let x = 0; x <= width; x += 1) {
      const included = x < width && mask[y * width + x];
      if (included && start < 0) start = x;
      if (!included && start >= 0) { rowRuns.push([start, y, x - start, 1]); start = -1; }
    }
  }
  return rowRuns;
}

export function selectGapComponents(data, width, height, layoutName) {
  if (width !== 1920 || height !== 1080 || data.length !== width * height * 4) throw new Error("Unexpected FOOD foreground geometry");
  const layout = layouts[layoutName];
  if (!layout) throw new Error(`Unknown FOOD layout: ${layoutName}`);
  const visited = new Uint8Array(width * height);
  const selected = new Uint8Array(width * height);
  const components = [];
  const isWhite = (pixel) => [0, 1, 2, 3].every((channel) => data[pixel * 4 + channel] === 255);
  for (const [left, top, regionWidth, regionHeight] of layout.regions) {
    for (let y = top; y < top + regionHeight; y += 1) for (let x = left; x < left + regionWidth; x += 1) {
      const initial = y * width + x;
      if (visited[initial] || !isWhite(initial)) continue;
      const pixels = [initial]; visited[initial] = 1;
      let minX = x; let maxX = x; let minY = y; let maxY = y;
      for (let cursor = 0; cursor < pixels.length; cursor += 1) {
        const pixel = pixels[cursor]; const column = pixel % width; const row = Math.floor(pixel / width);
        minX = Math.min(minX, column); maxX = Math.max(maxX, column); minY = Math.min(minY, row); maxY = Math.max(maxY, row);
        const adjacent = [];
        if (column > 0) adjacent.push(pixel - 1);
        if (column < width - 1) adjacent.push(pixel + 1);
        if (row > 0) adjacent.push(pixel - width);
        if (row < height - 1) adjacent.push(pixel + width);
        for (const next of adjacent) if (!visited[next] && isWhite(next)) { visited[next] = 1; pixels.push(next); }
      }
      if (minX < left || maxX >= left + regionWidth || minY < top || maxY >= top + regionHeight) throw new Error(`White FOOD component escaped audited bounds: ${layoutName} ${[minX, minY, maxX, maxY]}`);
      for (const pixel of pixels) selected[pixel] = 1;
      components.push({ pixelCount: pixels.length, bounds: [minX, minY, maxX - minX + 1, maxY - minY + 1] });
    }
  }
  const pixelCount = components.reduce((sum, item) => sum + item.pixelCount, 0);
  if (pixelCount < layout.pixelRange[0] || pixelCount > layout.pixelRange[1]) throw new Error(`Unexpected FOOD gap area for ${layoutName}: ${pixelCount}`);
  return { components, rowRuns: rowRunsForMask(selected, width, height), pixelCount };
}

export function fruitDonorForTrial(trialId) { return ({ "14b": "14a", "14d": "14c" })[trialId] || null; }

// Within the two bowl regions, restore only visibly corrupted red/green fruit
// pixels from the clean matching-side illustration. The original character
// purple (B >= R), white highlights, gray bowl, labels and all alpha values are
// protected. Large per-channel changes distinguish violet contamination from
// harmless one-level edge rounding between the two source exports.
export function selectFruitPixels(source, donor, width, height, trialId) {
  if (width !== 1920 || height !== 1080) throw new Error("Unexpected fruit geometry");
  if (!fruitDonorForTrial(trialId)) return { rowRuns: [], pixelCount: 0 };
  const bounds = trialId === "14b" ? [[195, 720, 340, 220], [1435, 720, 340, 220]] : [[150, 720, 340, 220], [1370, 720, 340, 220]];
  const mask = new Uint8Array(width * height);
  let pixelCount = 0;
  for (const [left, top, regionWidth, regionHeight] of bounds) for (let y = top; y < top + regionHeight; y += 1) {
    if (y >= 836 && y <= 911) continue; // Entire label band is immutable.
    for (let x = left; x < left + regionWidth; x += 1) {
      const pixel = y * width + x; const offset = pixel * 4;
      const [r, g, b, a] = donor.subarray(offset, offset + 4);
      const coloredFruit = r > b + 5 && (r > g + 5 || g > b + 5);
      const meaningfulDifference = Math.max(...[0, 1, 2].map((channel) => Math.abs(source[offset + channel] - donor[offset + channel]))) > 8;
      if (!coloredFruit || !meaningfulDifference || a !== 255 || source[offset + 3] !== 255) continue;
      mask[pixel] = 1; pixelCount += 1;
    }
  }
  if (pixelCount < 5000 || pixelCount > 15000) throw new Error(`Unexpected fruit repair area for ${trialId}: ${pixelCount}`);
  return { bounds, rowRuns: rowRunsForMask(mask, width, height), pixelCount };
}

const rectangles = (runs, fill) => runs.map(([x, y, width, height]) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" shape-rendering="crispEdges"/>`).join("");

export async function build() {
  const sourceManifestPath = path.join(candidate, "data/furnished_visual_manifest.json");
  const sourceManifestBytes = fs.readFileSync(sourceManifestPath);
  const sourceManifest = JSON.parse(sourceManifestBytes);
  const foodAssets = sourceManifest.assets.filter((asset) => asset.suffix === "FOOD" && activeTrials.includes(asset.trialId));
  if (foodAssets.length !== 72) throw new Error("Expected 36 active trials, each with two FOOD pages");
  const manifest = {
    version,
    treatment: "Native SVG masks remove trapped pure-white background and restore contaminated fruit from the clean matching-side source; every embedded original PNG is byte-identical",
    sourceManifest: `${candidateRelative}data/furnished_visual_manifest.json`, sourceManifestSha256: sha(sourceManifestBytes),
    geometry: { width: 1920, height: 1080 }, selection: { gapWhite: "RGBA exactly 255,255,255,255", connectivity: 4, layouts },
    coverage: { activeTrials: 36, repairedFiles: 0, fruitRepairedFiles: 0, removedWhitePixels: 0, fruitRepairedPixels: 0 }, assets: [],
  };
  for (const source of foodAssets) {
    const sourceBytes = fs.readFileSync(path.join(root, source.output));
    if (sha(sourceBytes) !== source.outputSha256) throw new Error(`Original FOOD source changed: ${source.output}`);
    const decoded = await sharp(sourceBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const layout = layoutForTrial(source.trialId);
    const gap = selectGapComponents(decoded.data, decoded.info.width, decoded.info.height, layout);
    const donorTrial = fruitDonorForTrial(source.trialId);
    let donorBytes; let donor; let fruit = { rowRuns: [], pixelCount: 0 };
    if (donorTrial) {
      donor = foodAssets.find((item) => item.trialId === donorTrial && item.imageIndex === source.imageIndex);
      donorBytes = fs.readFileSync(path.join(root, donor.output));
      if (sha(donorBytes) !== donor.outputSha256) throw new Error("Fruit donor raster changed");
      const donorData = await sharp(donorBytes).ensureAlpha().raw().toBuffer();
      fruit = selectFruitPixels(decoded.data, donorData, 1920, 1080, source.trialId);
    }
    const gapMask = `<mask id="food-gap" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080" style="mask-type:luminance"><rect width="1920" height="1080" fill="white"/>${rectangles(gap.rowRuns, "black")}</mask>`;
    const fruitMask = donorBytes ? `<mask id="fruit-only" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080" style="mask-type:luminance"><rect width="1920" height="1080" fill="black"/>${rectangles(fruit.rowRuns, "white")}</mask>` : "";
    const fruitLayer = donorBytes ? `<image href="data:image/png;base64,${donorBytes.toString("base64")}" width="1920" height="1080" mask="url(#fruit-only)"/>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><title>Original FOOD ${source.trialId}, page ${source.imageIndex}; bounded gap and fruit repair</title><defs>${gapMask}${fruitMask}</defs><image href="data:image/png;base64,${sourceBytes.toString("base64")}" width="1920" height="1080" mask="url(#food-gap)"/>${fruitLayer}</svg>\n`;
    const output = `${candidateRelative}assets/home_school/foregrounds/food-repair-v1/${source.trialId}/food_${String(source.imageIndex).padStart(2, "0")}.svg`;
    fs.mkdirSync(path.dirname(path.join(root, output)), { recursive: true });
    fs.writeFileSync(path.join(root, output), svg);
    manifest.assets.push({ trialId: source.trialId, imageIndex: source.imageIndex, source: source.output, sourceSha256: sha(sourceBytes), output, outputSha256: sha(Buffer.from(svg)), layout, gap, fruit, ...(donor ? { donor: donor.output, donorSha256: sha(donorBytes) } : {}) });
    manifest.coverage.repairedFiles += 1; manifest.coverage.removedWhitePixels += gap.pixelCount; manifest.coverage.fruitRepairedPixels += fruit.pixelCount;
    if (donor) manifest.coverage.fruitRepairedFiles += 1;
  }
  const receiptPath = path.join(candidate, "review/r26-verification/food/repair-manifest.json");
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify({ status: "BUILT", ...manifest.coverage, sourceRastersChanged: 0 }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
