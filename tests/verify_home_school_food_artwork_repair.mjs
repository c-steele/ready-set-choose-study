import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { activeTrials, layoutForTrial, selectGapComponents, fruitDonorForTrial, selectFruitPixels } from "../scripts/build_home_school_food_artwork_repair.mjs";

const sharp = createRequire(import.meta.url)("/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidate = path.join(root, "versions/chs-home-school-evelyn-v1");
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const receipt = JSON.parse(fs.readFileSync(path.join(candidate, "review/r26-verification/food/repair-manifest.json")));
const sourceManifestBytes = fs.readFileSync(path.join(root, receipt.sourceManifest));
assert.equal(sha(sourceManifestBytes), receipt.sourceManifestSha256);
const sourceManifest = JSON.parse(sourceManifestBytes);
for (const source of sourceManifest.assets) assert.equal(sha(fs.readFileSync(path.join(root, source.output))), source.outputSha256, `Original raster changed: ${source.output}`);
assert.equal(receipt.assets.length, 72);
assert.deepEqual([...new Set(receipt.assets.map((a) => a.trialId))].sort(), [...activeTrials].sort());
const maskFor = (runs) => {
  const mask = new Uint8Array(1920 * 1080);
  for (const [x, y, width, height] of runs) { assert.equal(height, 1); for (let c = x; c < x + width; c += 1) mask[y * 1920 + c] = 1; }
  return mask;
};
let protectedOpaque = 0; let protectedTransparent = 0; let gaps = 0; let fruitPixels = 0; let fruitFiles = 0; let protectedCaptionAndEyePixels = 0;
for (const asset of receipt.assets) {
  const sourceBytes = fs.readFileSync(path.join(root, asset.source));
  const svgBytes = fs.readFileSync(path.join(root, asset.output));
  assert.equal(sha(sourceBytes), asset.sourceSha256);
  assert.equal(sha(svgBytes), asset.outputSha256);
  const embedded = [...svgBytes.toString().matchAll(/href="data:image\/png;base64,([^"]+)"/g)].map((m) => Buffer.from(m[1], "base64"));
  assert.ok(embedded[0].equals(sourceBytes), "SVG must embed the original immutable PNG bytes");
  const source = await sharp(sourceBytes).ensureAlpha().raw().toBuffer();
  const actual = await sharp(svgBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(actual.info.width, 1920); assert.equal(actual.info.height, 1080);
  assert.equal(asset.layout, layoutForTrial(asset.trialId));
  const gap = selectGapComponents(source, 1920, 1080, asset.layout);
  assert.deepEqual(gap, asset.gap);
  const gapMask = maskFor(gap.rowRuns);
  let donor; let fruit = { rowRuns: [], pixelCount: 0 };
  if (asset.donor) {
    assert.equal(asset.trialId === "14b" ? "14a" : "14c", fruitDonorForTrial(asset.trialId));
    const donorBytes = fs.readFileSync(path.join(root, asset.donor));
    assert.equal(sha(donorBytes), asset.donorSha256);
    assert.ok(embedded[1].equals(donorBytes)); assert.equal(embedded.length, 2);
    donor = await sharp(donorBytes).ensureAlpha().raw().toBuffer();
    fruit = selectFruitPixels(source, donor, 1920, 1080, asset.trialId);
    fruitFiles += 1;
  } else assert.equal(embedded.length, 1);
  assert.deepEqual(fruit, asset.fruit);
  const fruitMask = maskFor(fruit.rowRuns);
  for (let pixel = 0; pixel < gapMask.length; pixel += 1) {
    const offset = pixel * 4; const x = pixel % 1920; const y = Math.floor(pixel / 1920);
    assert.ok(!(gapMask[pixel] && fruitMask[pixel]), "Gap mask may never erase fruit");
    if (gapMask[pixel]) {
      for (let channel = 0; channel < 4; channel += 1) assert.equal(source[offset + channel], 255, "Only pure-white opaque source background may become transparent");
      assert.equal(actual.data[offset + 3], 0, "Selected gap must reveal the furnished room"); gaps += 1;
    } else if (fruitMask[pixel]) {
      assert.equal(source[offset + 3], 255); assert.equal(donor[offset + 3], 255);
      for (let channel = 0; channel < 4; channel += 1) assert.equal(actual.data[offset + channel], donor[offset + channel], "Repaired fruit must exactly equal clean matching-side donor pixels");
      assert.ok(donor[offset] > donor[offset + 2] + 5, "Original purple characters must not enter fruit mask");
      assert.ok(y < 836 || y > 911, "All role label pixels are protected");
      fruitPixels += 1;
    } else {
      assert.equal(actual.data[offset + 3], source[offset + 3], `Alpha outside masks changed: ${asset.trialId} ${x},${y}`);
      if (source[offset + 3]) {
        for (let channel = 0; channel < 3; channel += 1) assert.equal(actual.data[offset + channel], source[offset + channel], `RGB outside masks changed: ${asset.trialId} ${x},${y}`);
        protectedOpaque += 1;
      } else protectedTransparent += 1;
    }
    // Explicit, independently specified protected areas: top/bottom captions,
    // all role labels, the full central recipient, and helpers' eyes/heads.
    if (y < 600 || y >= 945 || (y >= 836 && y <= 911) || (x >= 660 && x <= 1270)) {
      assert.equal(gapMask[pixel], 0); assert.equal(fruitMask[pixel], 0);
      protectedCaptionAndEyePixels += 1;
    }
  }
}
assert.equal(gaps, receipt.coverage.removedWhitePixels);
assert.equal(fruitPixels, receipt.coverage.fruitRepairedPixels);
assert.equal(fruitFiles, 4);
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(candidate, "food-artwork-repair.js"), "utf8"), sandbox);
const helper = sandbox.window.WTCFoodArtworkRepair;
assert.equal(helper.version, receipt.version);
const manifest = JSON.parse(fs.readFileSync(path.join(candidate, "data/ksize_manifest.json")));
const original = structuredClone(manifest); helper.applyToManifest(manifest);
let routed = 0;
for (let i = 0; i < manifest.trials.length; i += 1) {
  const trial = manifest.trials[i]; const before = original.trials[i]; const restored = structuredClone(trial);
  if (activeTrials.includes(trial.id)) {
    assert.equal(trial.homeSchoolFurnished.foodArtworkRepairVersion, helper.version);
    delete restored.homeSchoolFurnished.foodArtworkRepairVersion;
    for (let j = 0; j < trial.blocks.FOOD.images.length; j += 1) {
      const image = trial.blocks.FOOD.images[j]; const old = before.blocks.FOOD.images[j];
      assert.equal(image.homeSchoolForegroundBeforeFoodRepair, old.homeSchoolForegroundSrc);
      assert.equal(image.foodArtworkRepairVersion, helper.version);
      assert.equal(image.homeSchoolForegroundSrc, helper.correctedForegroundPath(old.homeSchoolForegroundSrc));
      assert.ok(fs.existsSync(path.join(root, image.homeSchoolForegroundSrc)));
      const reverted = restored.blocks.FOOD.images[j]; reverted.homeSchoolForegroundSrc = old.homeSchoolForegroundSrc;
      delete reverted.homeSchoolForegroundBeforeFoodRepair; delete reverted.foodArtworkRepairVersion; routed += 1;
    }
  }
  assert.deepEqual(restored, before, "No non-FOOD routes, captions, metadata or inactive trial may change");
}
assert.equal(routed, 72);
const once = JSON.stringify(manifest); helper.applyToManifest(manifest); assert.equal(JSON.stringify(manifest), once);
for (const source of [undefined, null, "", "https://example.com/food_01.png", "versions/chs-home-school-evelyn-v1/assets/home_school/foregrounds/3a/food_01.png", "versions/chs-home-school-evelyn-v1/assets/home_school/foregrounds/1a/help_01.png", "versions/chs-home-school-evelyn-v1/assets/home_school/foregrounds/1a/food_03.png"]) assert.equal(helper.correctedForegroundPath(source), source);
console.log(JSON.stringify({ status: "PASS", originalForegroundsByteIdentical: sourceManifest.assets.length, activeTrials: 36, renderedFoodEventAndQuestionFiles: 72, removedWhitePixels: gaps, restoredFruitPixels: fruitPixels, fruitFiles, protectedOpaque, protectedTransparent, protectedCaptionAndEyePixels, changedPixelsOutsideMasks: 0, routed, idempotent: true }));
