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

// These four bounds describe only the two gaps between the central child's
// inner arms and the box. They are below the eyes, above the role label, and
// never intersect either helper. Each selected connected component must fit
// entirely inside one bound and match the audited original component counts.
export const layouts = Object.freeze({
  mixedLeft: { regions: [[879, 649, 20, 51], [1122, 657, 13, 43]], componentCount: 6, pixelCount: 345 },
  mixedRight: { regions: [[769, 649, 22, 51], [1014, 658, 12, 38]], componentCount: 3, pixelCount: 362 },
  adults: { regions: [[830, 649, 21, 47], [1074, 657, 12, 44]], componentCount: 6, pixelCount: 346 },
  children: { regions: [[826, 649, 21, 54], [1070, 657, 12, 32]], componentCount: 3, pixelCount: 390 },
});

export function layoutForTrial(trialId) {
  const match = /^(\d+)([abcd])$/.exec(trialId);
  if (!match) throw new Error(`Unexpected trial id: ${trialId}`);
  const number = Number(match[1]);
  if ([3, 4, 8].includes(number)) return null; // Already-correct adult-recipient art.
  if ([1, 2, 7, 14].includes(number)) return ["a", "b"].includes(match[2]) ? "mixedLeft" : "mixedRight";
  if ([5, 9, 11].includes(number)) return "adults";
  if ([6, 10, 12, 13].includes(number)) return "children";
  throw new Error(`Unaudited trial id: ${trialId}`);
}

export function selectGapComponents(data, width, height, layoutName) {
  if (width !== 1920 || height !== 1080 || data.length !== width * height * 4) throw new Error("Unexpected foreground geometry");
  const layout = layouts[layoutName];
  if (!layout) throw new Error(`Unknown gap layout: ${layoutName}`);
  const visited = new Uint8Array(width * height);
  const selected = new Uint8Array(width * height);
  const components = [];
  const isOpaqueWhite = (pixel) => data[pixel * 4] === 255 && data[pixel * 4 + 1] === 255 && data[pixel * 4 + 2] === 255 && data[pixel * 4 + 3] === 255;
  for (const [left, top, regionWidth, regionHeight] of layout.regions) {
    for (let y = top; y < top + regionHeight; y += 1) for (let x = left; x < left + regionWidth; x += 1) {
      const initial = y * width + x;
      if (visited[initial] || !isOpaqueWhite(initial)) continue;
      const pixels = [initial];
      visited[initial] = 1;
      let minX = x; let maxX = x; let minY = y; let maxY = y;
      for (let cursor = 0; cursor < pixels.length; cursor += 1) {
        const pixel = pixels[cursor]; const column = pixel % width; const row = Math.floor(pixel / width);
        minX = Math.min(minX, column); maxX = Math.max(maxX, column); minY = Math.min(minY, row); maxY = Math.max(maxY, row);
        const adjacent = [];
        if (column > 0) adjacent.push(pixel - 1);
        if (column < width - 1) adjacent.push(pixel + 1);
        if (row > 0) adjacent.push(pixel - width);
        if (row < height - 1) adjacent.push(pixel + width);
        for (const next of adjacent) if (!visited[next] && isOpaqueWhite(next)) { visited[next] = 1; pixels.push(next); }
      }
      if (minX < left || maxX >= left + regionWidth || minY < top || maxY >= top + regionHeight) throw new Error("White component extends outside audited arm/box bounds");
      for (const pixel of pixels) selected[pixel] = 1;
      components.push({ pixelCount: pixels.length, bounds: [minX, minY, maxX - minX + 1, maxY - minY + 1] });
    }
  }
  const pixelCount = components.reduce((sum, item) => sum + item.pixelCount, 0);
  if (pixelCount !== layout.pixelCount || components.length !== layout.componentCount) throw new Error(`Gap component geometry changed for ${layoutName}: ${pixelCount} pixels / ${components.length} components`);
  const rowRuns = [];
  for (let y = 649; y <= 702; y += 1) {
    let start = -1;
    for (let x = 0; x <= width; x += 1) {
      const included = x < width && selected[y * width + x];
      if (included && start < 0) start = x;
      if (!included && start >= 0) { rowRuns.push([start, y, x - start, 1]); start = -1; }
    }
  }
  if (rowRuns.reduce((sum, run) => sum + run[2], 0) !== pixelCount) throw new Error("Gap row-run encoding lost pixels");
  return { components, rowRuns, pixelCount };
}

async function build() {
  const sourceManifestPath = path.join(candidate, "data/furnished_visual_manifest.json");
  const sourceManifestBytes = fs.readFileSync(sourceManifestPath);
  const sourceManifest = JSON.parse(sourceManifestBytes);
  const helpAssets = sourceManifest.assets.filter((asset) => asset.suffix === "HELP");
  if (helpAssets.length !== 112) throw new Error("Expected 56 trials with two HELP pages each");
  const manifest = {
    version: "help-arm-gap-mask-v1",
    treatment: "Native SVG alpha mask hides only audited pure-white source-background components trapped between the central child's arms and box; original embedded PNG bytes remain unchanged",
    sourceManifest: `${candidateRelative}data/furnished_visual_manifest.json`, sourceManifestSha256: sha(sourceManifestBytes),
    selection: { white: "RGBA exactly 255,255,255,255", connectivity: 4, layouts },
    geometry: { width: 1920, height: 1080 },
    coverage: { auditedHelpFiles: 112, repairedFiles: 0, unchangedDirectionalFiles: 0, removedWhitePixels: 0 },
    assets: [],
  };
  for (const source of helpAssets) {
    const sourceBytes = fs.readFileSync(path.join(root, source.output));
    if (sha(sourceBytes) !== source.outputSha256) throw new Error(`Original foreground changed: ${source.output}`);
    const decoded = await sharp(sourceBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const layoutName = layoutForTrial(source.trialId);
    if (!layoutName) {
      // Prove the already-repaired adult recipients have no enclosed opaque
      // white fragments in the entire central box/arm inspection region.
      for (let y = 620; y < 760; y += 1) for (let x = 680; x < 1230; x += 1) {
        const i = (y * 1920 + x) * 4;
        if ([0, 1, 2, 3].every((channel) => decoded.data[i + channel] === 255)) throw new Error(`Unexpected white component in directional trial ${source.trialId}`);
      }
      manifest.coverage.unchangedDirectionalFiles += 1;
      manifest.assets.push({ trialId: source.trialId, imageIndex: source.imageIndex, source: source.output, sourceSha256: sha(sourceBytes), treatment: "already clear; unchanged" });
      continue;
    }
    const selection = selectGapComponents(decoded.data, decoded.info.width, decoded.info.height, layoutName);
    const cuts = selection.rowRuns.map(([x, y, width, height]) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="black" shape-rendering="crispEdges"/>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><title>Original HELP foreground ${source.trialId}, page ${source.imageIndex}, with trapped arm-gap background made transparent</title><defs><mask id="arm-gap-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080" style="mask-type:luminance"><rect width="1920" height="1080" fill="white"/>${cuts}</mask></defs><image href="data:image/png;base64,${sourceBytes.toString("base64")}" width="1920" height="1080" mask="url(#arm-gap-mask)"/></svg>\n`;
    const output = `${candidateRelative}assets/home_school/foregrounds/help-gaps-v1/${source.trialId}/help_${String(source.imageIndex).padStart(2, "0")}.svg`;
    fs.mkdirSync(path.dirname(path.join(root, output)), { recursive: true });
    fs.writeFileSync(path.join(root, output), svg);
    manifest.assets.push({ trialId: source.trialId, imageIndex: source.imageIndex, source: source.output, sourceSha256: sha(sourceBytes), output, outputSha256: sha(Buffer.from(svg)), layout: layoutName, ...selection });
    manifest.coverage.repairedFiles += 1;
    manifest.coverage.removedWhitePixels += selection.pixelCount;
  }
  if (manifest.coverage.repairedFiles !== 88 || manifest.coverage.unchangedDirectionalFiles !== 24) throw new Error("Unexpected HELP repair coverage");
  fs.writeFileSync(path.join(candidate, "data/help_gap_mask_manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify({ status: "BUILT", ...manifest.coverage, sourceRastersChanged: 0 }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
