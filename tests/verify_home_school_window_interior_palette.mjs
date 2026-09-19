import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidate = path.join(root, "versions/chs-home-school-evelyn-v1");
const manifest = JSON.parse(fs.readFileSync(path.join(candidate, "data/visual_repair_manifest.json"), "utf8"));
const trialManifest = JSON.parse(fs.readFileSync(path.join(candidate, "data/ksize_manifest.json"), "utf8"));
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(candidate, "exterior-palette.js"), "utf8"), sandbox);
const api = sandbox.window.WTCExteriorPalette;
assert.equal(api.version, "who-takes-care-selective-exterior-palette-v2-window-interiors");
assert.equal(Object.keys(manifest.palettes).length, 17);
const WIDTH = 1672;
const HEIGHT = 941;
const weights = [0.299, 0.587, 0.114];
const luminance = (rgb) => rgb.reduce((sum, value, index) => sum + value * weights[index], 0);
const pixelAt = (data, x, y) => Array.from(data.subarray((y * WIDTH + x) * 4, (y * WIDTH + x) * 4 + 3));
const maxDelta = (left, right) => Math.max(...left.map((value, index) => Math.abs(value - right[index])));
const sha = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

// Original source-space coordinates and decoded RGB are independent of the
// helper's gate, mask exports, and color-matrix implementation.
const selected = {
  HOME: [
    [355, 405, [192, 172, 213]], [495, 405, [185, 166, 211]],
    [355, 550, [189, 179, 215]], [503, 550, [183, 161, 212]],
    [1158, 405, [188, 165, 209]], [1316, 405, [181, 159, 207]],
    [1158, 550, [181, 162, 210]], [1316, 550, [179, 159, 212]],
  ],
  SCHOOL: [
    [230, 500, [204, 198, 234]], [1400, 475, [208, 203, 235]],
    [1400, 525, [199, 195, 231]],
  ],
};
const protectedProbes = {
  HOME: [
    [450, 450, [188, 186, 223], "blue-ish glass"],
    [390, 450, [209, 210, 228], "neutral lamp behind glass"],
    [427, 450, [250, 244, 242], "vertical white mullion"],
    [450, 478, [253, 245, 241], "horizontal white mullion"],
    [1238, 450, [253, 242, 236], "right vertical mullion"],
    [1280, 478, [253, 242, 234], "right horizontal mullion"],
    [650, 50, [128, 191, 252], "sky"],
    [300, 670, [139, 163, 75], "greenery"],
    [835, 850, [239, 222, 214], "path"],
    [780, 500, [201, 134, 83], "wood door"],
  ],
  SCHOOL: [
    [780, 485, [201, 217, 246], "blue door reflection"],
    [788, 510, [189, 208, 242], "blue door reflection"],
    [788, 408, [215, 227, 250], "blue transom reflection"],
    [885, 426, [218, 226, 248], "transom excluded geometrically"],
    [1400, 435, [233, 232, 239], "neutral white blind"],
    [250, 552, [249, 248, 253], "white sill"],
    [172, 450, [228, 227, 236], "window edge/mullion"],
    [318, 500, [216, 207, 206], "warm window frame"],
    [600, 80, [151, 207, 252], "sky"],
    [1200, 600, [137, 173, 79], "greenery"],
    [835, 800, [247, 230, 220], "path"],
  ],
};

function allowedGeometry(context) {
  const allowed = new Uint8Array(WIDTH * HEIGHT);
  const markRect = (left, top, width, height) => {
    for (let y = Math.max(0, top); y < Math.min(HEIGHT, top + height); y += 1) {
      allowed.fill(1, y * WIDTH + Math.max(0, left), y * WIDTH + Math.min(WIDTH, left + width));
    }
  };
  // One-pixel safety fringe accommodates polygon-edge raster antialiasing,
  // not arbitrary whole-image recoloring. Every window pane is inside these
  // source-coordinate architecture bounds.
  if (context === "SCHOOL") markRect(0, 116, WIDTH, 550);
  else {
    markRect(167, 331, 1314, 354);
    for (let y = 184; y <= 304; y += 1) {
      const fraction = Math.max(0, Math.min(1, (y - 185) / 118));
      const left = Math.floor(835 - 195 * fraction) - 2;
      const right = Math.ceil(835 + 194 * fraction) + 2;
      markRect(left, y, right - left + 1, 1);
    }
  }
  return allowed;
}

function independentExpectedRGB(sourceRGB, hex) {
  const target = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const targetY = luminance(target);
  const span = Math.max(...target) - Math.min(...target);
  const sourceY = luminance(sourceRGB);
  const sourceChroma = (sourceRGB[0] + sourceRGB[2]) / 2 - sourceRGB[1];
  // The sixteen unchanged palettes retain their exact equal-luminance
  // expectation. Yellow's protected glazing/curtain-only treatment is tested
  // independently in the dedicated branches below.
  return target.map((channel) => sourceY + (span ? (channel - targetY) / span * sourceChroma : 0));
}

function fullSizeSvg(context, href, characterHex) {
  const svg = api.create({ context, href, characterHex }).svg();
  assert.match(svg, /viewBox="0 0 1672 941"/);
  return svg.replace("<svg", `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"`);
}

let rasterScenes = 0;
let selectedChecks = 0;
let protectedChecks = 0;
let outsideGeometryChecks = 0;
let maxSelectedLuminanceDrift = 0;
let maxYellowSelectedLuminanceLift = 0;
let maxLavenderBlindHighlightDrift = 0;
for (const context of ["HOME", "SCHOOL"]) {
  const place = context === "HOME" ? "house" : "school";
  const sourcePath = path.join(candidate, `assets/entrance/${place}-exterior.webp`);
  const sourceHash = sha(fs.readFileSync(sourcePath));
  // libRSVG cannot reliably decode embedded WebP in this bundled runtime;
  // embed a lossless in-memory PNG conversion of the immutable source.
  const png = await sharp(sourcePath).png().toBuffer();
  const href = `data:image/png;base64,${png.toString("base64")}`;
  const original = await sharp(png).ensureAlpha().raw().toBuffer();
  const baseline = await sharp(Buffer.from(fullSizeSvg(context, href))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(baseline.info.width, WIDTH);
  assert.equal(baseline.info.height, HEIGHT);
  assert.equal(baseline.info.channels, 4);
  assert.ok(baseline.data.equals(original), `${context}: unfiltered SVG does not reproduce the source pixels`);
  for (const [x, y, rgb] of [...selected[context], ...protectedProbes[context]]) {
    assert.deepEqual(pixelAt(original, x, y), rgb, `${context}/${x},${y}: source-probe provenance changed`);
  }
  const allowed = allowedGeometry(context);
  for (const [slug, palette] of Object.entries(manifest.palettes)) {
    const result = await sharp(Buffer.from(fullSizeSvg(context, href, palette.characterHex))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(result.info.width, WIDTH, `${slug}/${context}: exterior width changed`);
    assert.equal(result.info.height, HEIGHT, `${slug}/${context}: exterior height changed`);
    assert.equal(result.info.channels, 4);
    const yellow = palette.characterHex.toUpperCase() === "#FFD100";
    for (const [x, y, rgb] of selected[context]) {
      const actual = pixelAt(result.data, x, y);
      if (yellow) {
        if (context === "SCHOOL") {
          assert.deepEqual(actual, rgb, `Yellow School glazing must remain original at ${x},${y}`);
          selectedChecks += 1;
        }
        // The old Home probes include new silhouette/feather boundaries;
        // replace them with eight interior curtain probes below, not a
        // relaxed tolerance over entire glass panes.
        continue;
      }
      const expected = independentExpectedRGB(rgb, palette.characterHex);
      assert.ok(maxDelta(actual, rgb) >= 3, `${slug}/${context}/${x},${y}: selected curtain/interior remained unthemed`);
      assert.ok(maxDelta(actual, expected) <= 2, `${slug}/${context}/${x},${y}: raster hue differs from the exact target palette: ${actual} vs ${expected}`);
      const drift = Math.abs(luminance(actual) - luminance(rgb));
      maxSelectedLuminanceDrift = Math.max(maxSelectedLuminanceDrift, drift);
      assert.ok(drift <= 1.1, `${slug}/${context}/${x},${y}: selected pigment brightness moved by ${drift}`);
      if (palette.characterHex === "#A9A9A9") assert.ok(Math.max(...actual) - Math.min(...actual) <= 1, "Gray window interior retains purple hue");
      selectedChecks += 1;
    }
    if (yellow && context === "HOME") {
      for (const [x,y] of [[347,405],[504,405],[343,548],[508,548],[1157,405],[1318,405],[1156,550],[1318,550]]) {
        const rgb=pixelAt(original,x,y), actual=pixelAt(result.data,x,y), ySource=luminance(rgb);
        const tint=[.4*ySource+.6*255,.65*ySource+.3*255,ySource-.2*255].map(v=>Math.max(0,Math.min(255,v)));
        const alpha=Math.max(0,Math.min(1,(rgb[0]-rgb[1])/12));
        const expected=rgb.map((value,c)=>value+(tint[c]-value)*alpha);
        assert.ok(maxDelta(actual,expected)<=2,`Yellow curtain differs at ${x},${y}: ${actual} vs ${expected}`);
        assert.ok(maxDelta(actual,rgb)>=3,`Yellow curtain not themed at ${x},${y}`);
        maxYellowSelectedLuminanceLift=Math.max(maxYellowSelectedLuminanceLift,Math.abs(luminance(actual)-luminance(rgb)));
        selectedChecks+=1;
      }
    }
    for (const [x, y, rgb, label] of protectedProbes[context]) {
      assert.deepEqual(pixelAt(result.data, x, y), rgb, `${slug}/${context}: protected ${label} changed at ${x},${y}`);
      protectedChecks += 1;
    }
    for (let index = 0; index < allowed.length; index += 1) {
      const offset = index * 4;
      assert.equal(result.data[offset + 3], 255, `${slug}/${context}: source geometry became transparent at pixel ${index}`);
      if (allowed[index]) continue;
      if (result.data[offset] !== original[offset] || result.data[offset + 1] !== original[offset + 1] || result.data[offset + 2] !== original[offset + 2]) {
        assert.fail(`${slug}/${context}: source pigment changed outside selected geometry at ${index % WIDTH},${Math.floor(index / WIDTH)}`);
      }
      outsideGeometryChecks += 1;
    }
    if (context === "SCHOOL") {
      // This original highlight is lavender-tinged, not an exact neutral:
      // its soft luminance gate may cause a tiny change while it stays white.
      const before = pixelAt(original, 275, 435);
      const after = pixelAt(result.data, 275, 435);
      const drift = maxDelta(before, after);
      maxLavenderBlindHighlightDrift = Math.max(maxLavenderBlindHighlightDrift, drift);
      assert.ok(drift <= 4 && Math.min(...after) >= 231, `${slug}: lavender blind highlight stopped reading as white`);
    }
    rasterScenes += 1;
  }
  assert.equal(sha(fs.readFileSync(sourcePath)), sourceHash, "A source exterior was modified during the regression check");
}
const roomPaths = [...new Set(trialManifest.trials.flatMap((trial) => [trial.homeSchoolFurnished.homeBackground, trial.homeSchoolFurnished.schoolBackground]))];
assert.equal(roomPaths.length, 34);
for (const relative of roomPaths) {
  const metadata = await sharp(path.join(root, relative)).metadata();
  assert.equal(metadata.width, 1536, `Room master width changed: ${relative}`);
  assert.equal(metadata.height, 1024, `Room master height changed: ${relative}`);
}
console.log(JSON.stringify({ status: "PASS", renderer: "sharp/libRSVG with PNG-embedded immutable sources", palettes: 17, rasterScenes, selectedCurtainInteriorChecks: selectedChecks, exactProtectedPixelChecks: protectedChecks, outsideGeometryChecks, roomMastersChecked: roomPaths.length, maxSelectedLuminanceDrift: Number(maxSelectedLuminanceDrift.toFixed(3)), maxYellowSelectedLuminanceLift: Number(maxYellowSelectedLuminanceLift.toFixed(3)), maxLavenderBlindHighlightChannelDrift: maxLavenderBlindHighlightDrift, caveat: "No broad School glazing gate: blue reflections and neutral blinds are intentionally retained; this is not browser animation verification." }));
