import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const candidate = path.join(root, "versions/chs-home-school-evelyn-v1");
export const dark = [23, 37, 43];
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export function loadHelpers() {
  const sandbox = { window: {} };
  for (const file of ["help-gap-repair.js", "food-artwork-repair.js", "caption-contrast.js"]) vm.runInNewContext(fs.readFileSync(path.join(candidate, file), "utf8"), sandbox);
  return sandbox.window;
}
export function sourcesFromManifest() {
  const helpers = loadHelpers();
  const manifest = JSON.parse(fs.readFileSync(path.join(candidate, "data/ksize_manifest.json")));
  helpers.WTCHelpGapRepair.applyToManifest(manifest);
  helpers.WTCFoodArtworkRepair.applyToManifest(manifest);
  const sources = new Map();
  for (const trial of manifest.trials) {
    const hex = trial.homeSchoolFurnished?.characterHex;
    if (helpers.WTCCaptionContrast.textColorForHex(hex) !== "#17252b") continue;
    function visit(value) {
      if (!value || typeof value !== "object") return;
      if (typeof value.homeSchoolForegroundSrc === "string") {
        const source = value.homeSchoolForegroundSrc;
        const output = helpers.WTCCaptionContrast.correctedForegroundPath(source, hex);
        if (source !== output) sources.set(output, { trialId: trial.id, hex, source, output });
      }
      for (const child of Object.values(value)) if (child && typeof child === "object") visit(child);
    }
    visit(trial.blocks);
  }
  return [...sources.values()];
}

// The exported templates place every role bar at y=836..910. Detect the
// actual bar spans from exact source-color runs, rather than assuming each
// layout has the same horizontal coordinates. Only the inset of a confirmed
// solid bar can contain a selected glyph; its anti-aliased outer rim is kept.
export function selectCaptionLetters(data, width, height, hex, sourceName) {
  assert.equal(width, 1920); assert.equal(height, 1080);
  const base = hex.slice(1).match(/../g).map((value) => parseInt(value, 16));
  const exactBase = (x, y) => {
    const i = (y * width + x) * 4;
    return data[i + 3] === 255 && base.every((v, c) => data[i + c] === v);
  };
  const bars = [];
  let start = -1;
  for (let x = 0; x <= width; x += 1) {
    const hit = x < width && exactBase(x, 840);
    if (hit && start < 0) start = x;
    if (!hit && start >= 0) {
      if (x - start >= 300 && x - start <= 370) {
        assert.ok(exactBase(start + 2, 905) && exactBase(x - 3, 905), `${sourceName}: confirmed label bar lower edge`);
        bars.push({ x: start + 1, y: 842, width: x - start - 2, height: 65, kind: "role" });
      }
      start = -1;
    }
  }
  assert.ok(bars.length >= 1 && bars.length <= 3, `${sourceName}: expected one to three exact role bars`);
  if (/_(?:02)\.(?:png|svg)$/.test(sourceName) && !/intro_/.test(sourceName)) {
    assert.ok(exactBase(0, 950) && exactBase(1919, 950) && exactBase(0, 1078) && exactBase(1919, 1078), `${sourceName}: full-width response bar`);
    bars.push({ x: 1, y: 951, width: 1918, height: 127, kind: "options" });
  }
  const selector = base.indexOf(Math.min(...base));
  const pixels = new Map();
  const regionCounts = [];
  for (const region of bars) {
    let count = 0; let core = 0;
    for (let y = region.y; y < region.y + region.height; y += 1) {
      for (let x = region.x; x < region.x + region.width; x += 1) {
        const p = y * width + x; const i = p * 4;
        // A box or fruit bowl may overlap the role bar. Non-opaque/non-blend
        // artwork is not lettering, and must never become part of the mask.
        if (data[i + 3] !== 255) continue;
        const t = (data[i + selector] - base[selector]) / (255 - base[selector]);
        if (t <= 0 || t > 1) continue;
        if (!base.every((v, c) => Math.abs(data[i + c] - (v + (255 - v) * t)) <= 1.1)) continue;
        const color = base.map((v, c) => Math.max(0, Math.min(255, Math.round(v + (dark[c] - v) * t))));
        pixels.set(p, color); count += 1;
        if (t === 1) core += 1;
      }
    }
    assert.ok(core >= 100, `${sourceName}: ${region.kind} requires actual white glyph cores`);
    regionCounts.push({ ...region, pixels: count, pureWhiteCorePixels: core });
  }
  return { pixels, regions: regionCounts };
}
export function pathsForPixels(pixels, width) {
  const groups = new Map();
  const rows = [...pixels.keys()].sort((a, b) => a - b);
  for (let j = 0; j < rows.length;) {
    const p = rows[j]; const color = pixels.get(p).map((v) => v.toString(16).padStart(2, "0")).join("");
    let n = 1;
    while (j + n < rows.length && rows[j + n] === p + n && Math.floor((p + n) / width) === Math.floor(p / width) && pixels.get(p + n).every((v, c) => v === pixels.get(p)[c])) n += 1;
    if (!groups.has(color)) groups.set(color, []);
    groups.get(color).push(`M${p % width} ${Math.floor(p / width)}h${n}v1h-${n}z`);
    j += n;
  }
  return [...groups].map(([hex, commands]) => `<path fill="#${hex}" d="${commands.join("")}"/>`).join("");
}
export async function build() {
  const assets = [];
  for (const asset of sourcesFromManifest()) {
    const sourceBytes = fs.readFileSync(path.join(root, asset.source));
    const decoded = await sharp(sourceBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const selected = selectCaptionLetters(decoded.data, decoded.info.width, decoded.info.height, asset.hex, asset.source);
    const sourceIsSvg = asset.source.endsWith(".svg");
    // Native SVG nesting avoids base64-encoding an SVG which already embeds
    // a PNG. Keep the exact source SVG markup and all embedded PNG bytes;
    // no raster re-encoding, source recoloring or mask geometry changes.
    const embeddedSource = sourceIsSvg ? sourceBytes.toString("utf8") : `<image width="1920" height="1080" href="data:image/png;base64,${sourceBytes.toString("base64")}"/>`;
    if (sourceIsSvg) assert.ok(embeddedSource.startsWith("<svg"), "Expected self-contained native SVG repair source");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><title>Caption lettering contrast only; original artwork preserved</title>${embeddedSource}<g shape-rendering="crispEdges">${pathsForPixels(selected.pixels, 1920)}</g></svg>\n`;
    fs.mkdirSync(path.dirname(path.join(root, asset.output)), { recursive: true });
    fs.writeFileSync(path.join(root, asset.output), svg);
    assets.push({ ...asset, sourceSha256: sha(sourceBytes), outputSha256: sha(svg), embeddedSourceMode: sourceIsSvg ? "native-svg-exact-markup" : "png-exact-base64", changedGlyphPixels: selected.pixels.size, regions: selected.regions });
  }
  assert.equal(assets.length, 180);
  const manifest = { version: "pale-caption-lettering-v1", darkText: "#17252b", method: "Immutable corrected foreground embedded with exact per-pixel native SVG glyph overlays. Letter anti-aliasing is recomposited against the unchanged original bar hue. No raster source is modified.", assets };
  fs.writeFileSync(path.join(candidate, "data/caption_contrast_manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify({ status: "BUILT", assets: assets.length, trials: new Set(assets.map((a) => a.trialId)).size, changedGlyphPixels: assets.reduce((sum, a) => sum + a.changedGlyphPixels, 0) }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
