import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { layoutForTrial, selectGapComponents } from "../scripts/build_home_school_help_gap_masks.mjs";

const require = createRequire(import.meta.url);
const sharp = require("/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidate = path.join(root, "versions/chs-home-school-evelyn-v1");
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(fs.readFileSync(path.join(candidate, "data/help_gap_mask_manifest.json")));
const originalManifestBytes = fs.readFileSync(path.join(root, manifest.sourceManifest));
assert.equal(sha(originalManifestBytes), manifest.sourceManifestSha256);
const originalManifest = JSON.parse(originalManifestBytes);
// Every original foreground (including non-HELP art) remains byte-identical.
for (const asset of originalManifest.assets) assert.equal(sha(fs.readFileSync(path.join(root, asset.output))), asset.outputSha256, asset.output);

let opaqueProtectedPixels = 0; let transparentProtectedPixels = 0; let removedWhitePixels = 0; let renderedMasks = 0;
for (const asset of manifest.assets) {
  const sourceBytes = fs.readFileSync(path.join(root, asset.source));
  assert.equal(sha(sourceBytes), asset.sourceSha256);
  if (!asset.output) { assert.equal(layoutForTrial(asset.trialId), null); continue; }
  const svgBytes = fs.readFileSync(path.join(root, asset.output));
  assert.equal(sha(svgBytes), asset.outputSha256);
  // The wrapper embeds exactly the unmodified source file, not a recompressed
  // or repainted copy. The only native SVG treatment is its bounded mask.
  const embedded = /href="data:image\/png;base64,([^"]+)"/.exec(svgBytes.toString());
  assert.ok(embedded);
  assert.ok(Buffer.from(embedded[1], "base64").equals(sourceBytes));
  const source = await sharp(sourceBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const selection = selectGapComponents(source.data, source.info.width, source.info.height, asset.layout);
  assert.deepEqual(selection.rowRuns, asset.rowRuns);
  assert.deepEqual(selection.components, asset.components);
  assert.equal(selection.pixelCount, asset.pixelCount);
  const rendered = await sharp(svgBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(rendered.info.width, 1920); assert.equal(rendered.info.height, 1080);
  const mask = new Uint8Array(1920 * 1080);
  for (const [x, y, width, height] of asset.rowRuns) {
    assert.equal(height, 1);
    for (let column = x; column < x + width; column += 1) mask[y * 1920 + column] = 1;
  }
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * 4;
    if (mask[pixel]) {
      for (let channel = 0; channel < 4; channel += 1) assert.equal(source.data[offset + channel], 255, "Only opaque pure-white source background can be masked");
      assert.equal(rendered.data[offset + 3], 0, "Gap must be completely transparent");
      removedWhitePixels += 1;
    } else {
      assert.equal(rendered.data[offset + 3], source.data[offset + 3], "No alpha change outside gap mask");
      if (source.data[offset + 3]) {
        for (let channel = 0; channel < 3; channel += 1) assert.equal(rendered.data[offset + channel], source.data[offset + channel], "Eyes, box, characters, captions and all other opaque RGB must remain unchanged");
        opaqueProtectedPixels += 1;
      } else transparentProtectedPixels += 1;
    }
  }
  renderedMasks += 1;
}
assert.equal(renderedMasks, 88);
assert.equal(removedWhitePixels, 32096);

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(candidate, "help-gap-repair.js"), "utf8"), sandbox);
const helper = sandbox.window.WTCHelpGapRepair;
const eventManifest = JSON.parse(fs.readFileSync(path.join(candidate, "data/ksize_manifest.json")));
const originalEventManifest = structuredClone(eventManifest);
helper.applyToManifest(eventManifest);
let routedImages = 0; let routedTrials = 0;
for (let i = 0; i < eventManifest.trials.length; i += 1) {
  const trial = eventManifest.trials[i]; const before = originalEventManifest.trials[i];
  const restored = structuredClone(trial);
  if (trial.homeSchoolFurnished.helpGapRepairVersion) {
    assert.ok(layoutForTrial(trial.id));
    assert.equal(trial.homeSchoolFurnished.helpGapRepairVersion, helper.version);
    delete restored.homeSchoolFurnished.helpGapRepairVersion;
    routedTrials += 1;
  }
  for (let j = 0; j < trial.blocks.HELP.images.length; j += 1) {
    const image = trial.blocks.HELP.images[j]; const oldImage = before.blocks.HELP.images[j];
    if (image.homeSchoolForegroundSrc === oldImage.homeSchoolForegroundSrc) continue;
    assert.equal(image.homeSchoolForegroundBeforeGapRepair, oldImage.homeSchoolForegroundSrc);
    assert.equal(image.helpGapRepairVersion, helper.version);
    assert.ok(fs.existsSync(path.join(root, image.homeSchoolForegroundSrc)));
    assert.equal(image.homeSchoolForegroundSrc, helper.correctedForegroundPath(oldImage.homeSchoolForegroundSrc));
    const restoreImage = restored.blocks.HELP.images[j];
    restoreImage.homeSchoolForegroundSrc = oldImage.homeSchoolForegroundSrc;
    delete restoreImage.homeSchoolForegroundBeforeGapRepair; delete restoreImage.helpGapRepairVersion;
    routedImages += 1;
  }
  assert.deepEqual(restored, before, "Only HELP source routing and repair provenance may change");
}
assert.equal(routedImages, 88); assert.equal(routedTrials, 44);
const once = JSON.stringify(eventManifest);
helper.applyToManifest(eventManifest);
assert.equal(JSON.stringify(eventManifest), once, "Repair routing must be idempotent");
for (const source of [undefined, null, "", "https://example.com/help_01.png", "versions/chs-home-school-evelyn-v1/assets/home_school/foregrounds/3a/help_01.png", "versions/chs-home-school-evelyn-v1/assets/home_school/foregrounds/2d/hug_01.png", "versions/chs-home-school-evelyn-v1/assets/home_school/foregrounds/99a/help_01.png"]) assert.equal(helper.correctedForegroundPath(source), source);
const app = fs.readFileSync(path.join(candidate, "app.js"), "utf8");
const index = fs.readFileSync(path.join(candidate, "index.html"), "utf8");
assert.ok(app.indexOf("WTCHelpGapRepair?.applyToManifest(eventManifest)") > 0);
assert.ok(app.indexOf("WTCHelpGapRepair?.applyToManifest(eventManifest)") < app.indexOf("const eventPlan = planEventSession(eventManifest"), "Repair must be installed before planning and preloading");
assert.ok(index.indexOf('src="help-gap-repair.js') > 0);
assert.ok(index.indexOf('src="help-gap-repair.js') < index.indexOf('src="app.js'), "Helper must be loaded before app");
const foregroundRoot = /const HOME_SCHOOL_FURNISHED_FOREGROUND_ROOT = "([^"]+)";/.exec(app)?.[1];
assert.ok(foregroundRoot);
for (const asset of manifest.assets.filter((asset) => asset.output)) assert.ok(asset.output.startsWith(foregroundRoot), "Masked HELP assets must inherit the foreground release cache version");
const displayBody = app.slice(app.indexOf("function displayImageSrc(src)"), app.indexOf("function displayImageSrc(src)") + 1200);
assert.ok(displayBody.includes("source.startsWith(HOME_SCHOOL_FURNISHED_FOREGROUND_ROOT)"));
assert.ok(displayBody.includes("HOME_SCHOOL_ASSET_VERSION"), "Foreground cache busting must use current release version");
const displayFunction = app.slice(app.indexOf("function displayImageSrc(src)"), app.indexOf("function imageHtml("));
const displaySandbox = { assetUrl: (source) => `https://study.example/${source}` };
for (const name of new Set(displayFunction.match(/\b[A-Z][A-Z_]+\b/g))) {
  const value = new RegExp(`const ${name} = "([^"]+)";`).exec(app)?.[1];
  assert.ok(value, `Missing display source constant: ${name}`);
  displaySandbox[name] = value;
}
vm.runInNewContext(displayFunction, displaySandbox);
for (const asset of manifest.assets.filter((asset) => asset.output)) {
  assert.equal(displaySandbox.displayImageSrc(asset.output), `https://study.example/${asset.output}?v=${displaySandbox.HOME_SCHOOL_ASSET_VERSION}`);
}
console.log(JSON.stringify({ status: "PASS", originalForegroundsByteIdentical: originalManifest.assets.length, auditedHelpFiles: manifest.assets.length, renderedMasks, routedTrials, routedImages, removedWhitePixels, opaqueProtectedPixels, transparentProtectedPixels, changedPixelsOutsideMasks: 0, idempotent: true, runtimeHookBeforePlanning: true, inheritsReleaseCacheVersion: true }));
