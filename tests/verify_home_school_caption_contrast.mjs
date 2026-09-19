import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { root, candidate, loadHelpers, sourcesFromManifest, selectCaptionLetters, dark } from "../scripts/build_home_school_caption_contrast.mjs";

const require = createRequire(import.meta.url);
const sharp = require("/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const receipt = JSON.parse(fs.readFileSync(path.join(candidate, "data/caption_contrast_manifest.json")));
const original = JSON.parse(fs.readFileSync(path.join(candidate, "data/furnished_visual_manifest.json")));
for (const asset of original.assets) assert.equal(sha(fs.readFileSync(path.join(root, asset.output))), asset.outputSha256, "All immutable raster foregrounds remain unchanged");
assert.equal(receipt.assets.length, 180);
assert.deepEqual(receipt.assets.map((a) => [a.trialId, a.source, a.output]), sourcesFromManifest().map((a) => [a.trialId, a.source, a.output]));
let changedGlyphPixels = 0; let protectedOpaquePixels = 0; let protectedTransparentPixels = 0; let nestedHelp = 0; let nestedFood = 0;
for (const asset of receipt.assets) {
  const source = fs.readFileSync(path.join(root, asset.source));
  const output = fs.readFileSync(path.join(root, asset.output));
  assert.equal(sha(source), asset.sourceSha256);
  assert.equal(sha(output), asset.outputSha256);
  if (asset.source.endsWith(".svg")) {
    assert.equal(asset.embeddedSourceMode, "native-svg-exact-markup");
    assert.ok(output.toString().includes(source.toString()), "Exact source SVG markup retained in native nesting");
    assert.ok(!output.toString().includes("data:image/svg+xml;base64,"), "No unnecessary extra SVG base64 layer");
    const embeddedPngs = [...source.toString().matchAll(/href="data:image\/png;base64,([^"]+)"/g)];
    assert.ok(embeddedPngs.length);
    for (const embedded of embeddedPngs) assert.ok(output.toString().includes(embedded[0]), "Source repair embedded PNG bytes unchanged");
  } else {
    assert.equal(asset.embeddedSourceMode, "png-exact-base64");
    const embedded = /href="data:image\/png;base64,([^"]+)"/.exec(output.toString());
    assert.ok(embedded && Buffer.from(embedded[1], "base64").equals(source), "Exact immutable foreground PNG embedded");
  }
  if (asset.source.includes("help-gaps-v1/")) nestedHelp += 1;
  if (asset.source.includes("food-repair-v1/")) nestedFood += 1;
  const before = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const after = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(after.info.width, 1920); assert.equal(after.info.height, 1080);
  const selection = selectCaptionLetters(before.data, 1920, 1080, asset.hex, asset.source);
  assert.deepEqual(selection.regions, asset.regions);
  assert.equal(selection.pixels.size, asset.changedGlyphPixels);
  for (let p = 0; p < 1920 * 1080; p += 1) {
    const i = p * 4;
    if (after.data[i + 3] !== before.data[i + 3]) assert.fail(`${asset.output}: alpha changed at ${p}`);
    const target = selection.pixels.get(p);
    if (target) {
      assert.equal(before.data[i + 3], 255);
      for (let c = 0; c < 3; c += 1) if (after.data[i + c] !== target[c]) assert.fail(`${asset.output}: antialiased letter mismatch at ${p}, channel ${c}`);
      if (before.data[i] === 255 && before.data[i + 1] === 255 && before.data[i + 2] === 255) assert.deepEqual(target, dark);
      const y = Math.floor(p / 1920);
      assert.ok((y >= 842 && y < 907) || (y >= 951 && y < 1078), "Only role/response lettering can change; eyes, body and top caption excluded");
      changedGlyphPixels += 1;
    } else if (before.data[i + 3]) {
      for (let c = 0; c < 3; c += 1) if (after.data[i + c] !== before.data[i + c]) assert.fail(`${asset.output}: protected RGB changed at ${p}, channel ${c}`);
      protectedOpaquePixels += 1;
    } else protectedTransparentPixels += 1;
  }
}
assert.equal(nestedHelp, 40); assert.equal(nestedFood, 40);
const helpers = loadHelpers();
const manifest = JSON.parse(fs.readFileSync(path.join(candidate, "data/ksize_manifest.json")));
helpers.WTCHelpGapRepair.applyToManifest(manifest);
helpers.WTCFoodArtworkRepair.applyToManifest(manifest);
const beforeRouting = structuredClone(manifest);
helpers.WTCCaptionContrast.applyToManifest(manifest);
const expectedOutputs = new Set(receipt.assets.map((a) => a.output));
const seen = new Set();
const restored = structuredClone(manifest);
let routedReferences = 0; let routedTrials = 0;
for (const trial of restored.trials) {
  if (trial.homeSchoolFurnished?.captionContrastVersion) {
    assert.equal(trial.homeSchoolFurnished.captionContrastVersion, receipt.version);
    delete trial.homeSchoolFurnished.captionContrastVersion;
    routedTrials += 1;
  }
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.captionContrastVersion) {
      assert.equal(value.captionContrastVersion, receipt.version);
      assert.ok(expectedOutputs.has(value.homeSchoolForegroundSrc));
      seen.add(value.homeSchoolForegroundSrc);
      value.homeSchoolForegroundSrc = value.homeSchoolForegroundBeforeCaptionContrast;
      delete value.homeSchoolForegroundBeforeCaptionContrast; delete value.captionContrastVersion;
      routedReferences += 1;
    }
    for (const child of Object.values(value)) if (child && typeof child === "object") visit(child);
  }
  visit(trial.blocks);
}
assert.deepEqual(restored, beforeRouting, "Only foreground routing/provenance may change; captions, roles, layouts, audio and assignment untouched");
assert.equal(seen.size, 180); assert.equal(routedTrials, 20);
const once = JSON.stringify(manifest);
helpers.WTCCaptionContrast.applyToManifest(manifest);
assert.equal(JSON.stringify(manifest), once, "Idempotent routing");
for (const value of [null, undefined, "", "#ed3b4e", "#a52714", "#000000"]) assert.equal(helpers.WTCCaptionContrast.textColorForHex(value), "#ffffff");
const luminance = (hex) => hex.slice(1).match(/../g).map((n) => parseInt(n, 16) / 255).map((n) => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
const colors = [...new Set(receipt.assets.map((a) => a.hex))];
assert.equal(colors.length, 6);
const contrast = colors.map((hex) => {
  assert.equal(helpers.WTCCaptionContrast.textColorForHex(hex.toLowerCase()), "#17252b");
  const whiteRatio = (1.05) / (luminance(hex) + .05);
  const darkRatio = (luminance(hex) + .05) / (luminance("#17252b") + .05);
  assert.ok(whiteRatio < 3); assert.ok(darkRatio >= 4.5);
  return { hex, oldWhiteContrast: +whiteRatio.toFixed(2), newDarkContrast: +darkRatio.toFixed(2) };
});
const result = { status: "PASS", wrappersRendered: receipt.assets.length, immutableRasterAssetsVerified: original.assets.length, routedTrials, routedReferences, helpRepairPreserved: nestedHelp, foodRepairPreserved: nestedFood, changedGlyphPixels, protectedOpaquePixels, protectedTransparentPixels, alphaChanges: 0, rgbChangesOutsideLetterMasks: 0, contrast };
const directory = path.join(candidate, "review/r26-verification");
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, "caption-contrast.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
