import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidate = path.join(root, "versions/chs-home-school-evelyn-v1");
const source = fs.readFileSync(path.join(candidate, "exterior-palette.js"), "utf8");
const app = fs.readFileSync(path.join(candidate, "app.js"), "utf8");
const index = fs.readFileSync(path.join(candidate, "index.html"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(candidate, "data/visual_repair_manifest.json"), "utf8"));
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "exterior-palette.js" });
const api = sandbox.window.WTCExteriorPalette;
assert.equal(api.version, "who-takes-care-selective-exterior-palette-v2-window-interiors");
assert.deepEqual({ ...api.sourceSize }, { width: 1672, height: 941 });
assert.equal(Object.keys(manifest.palettes).length, 17);
assert.doesNotMatch(source, /hue-rotate|mix-blend-mode|drawImage|putImageData|fetch\(/);
assert.ok(index.indexOf('src="exterior-palette.js?') < index.indexOf('src="app.js?'), "Palette helper must load before the runtime");
assert.match(app, /entranceLayersHtml\(studyContext, furnishedScene\.paletteSlug, furnishedScene\.accent\)/, "Entrance must receive the trial's exact character colour");
assert.match(app, /WTCExteriorPalette\?\.create\(\{ context, href: displayImageSrc\(assets\.exterior\), characterHex \}\)/, "Exterior factory must receive the original unescaped source URL");
assert.match(app, /exterior\.svg\(\{ className: "ksize-entry-building", opening: g \}\)/);
assert.match(app, /exterior\.svg\(\{ viewBox: \[x, g\.y, width, g\.h\] \}\)/);

const weights = [0.299, 0.587, 0.114];
const luminance = (rgb) => rgb.reduce((sum, channel, index) => sum + weights[index] * channel, 0);
const applyMatrix = (rgb, matrix) => [0, 1, 2].map((row) => rgb.reduce((sum, channel, index) => sum + matrix[row * 5 + index] * channel, matrix[row * 5 + 4]));

// Independently decoded original-source probes: all protected categories must
// receive zero overlay alpha before any architectural exclusions are applied.
const protectedPixels = [
  [151, 207, 252], [137, 173, 79], [247, 230, 220], [254, 242, 230],
  [169, 151, 148], [201, 217, 246], [128, 191, 252], [139, 163, 75],
  [239, 222, 214], [254, 244, 236], [150, 132, 129], [201, 134, 83],
  [188, 186, 223],
];
protectedPixels.forEach((rgb) => assert.equal(api.pigmentAlphaForRGB(rgb), 0, `Protected source pigment changed: ${rgb}`));
for (const rgb of [[212, 184, 216], [191, 159, 193], [205, 175, 215], [226, 201, 228], [225, 202, 228]]) {
  assert.equal(api.pigmentAlphaForRGB(rgb), 1, `Original lavender pigment missing: ${rgb}`);
}
// Low-saturation opaque school door frames/leafs must not remain lavender.
// Their independent blue-over-green pigment still distinguishes warm neutrals.
const schoolDoorFramePixels = [[230, 225, 238], [217, 209, 230], [210, 199, 221], [227, 223, 236]];
schoolDoorFramePixels.forEach((rgb) => assert.equal(api.pigmentAlphaForRGB(rgb), 1, `Opaque school door frame suppressed: ${rgb}`));
const edgeAlpha = api.pigmentAlphaForRGB([202, 199, 223]);
assert.ok(edgeAlpha > 0 && edgeAlpha < 1, "Low-chroma architectural edges need a soft transition");

const allIds = [];
const curtainPixels = [[189,168,212],[180,161,209],[176,156,206],[186,163,207],[190,169,213],[182,160,209],[179,161,213]];
curtainPixels.forEach(rgb=>assert.equal(api.windowInteriorAlphaForRGB(rgb),1,`Curtain theme suppressed: ${rgb}`));
const windowProtectedPixels = [[201,217,246],[187,185,222],[199,202,237],[183,208,245],[250,240,230],[255,250,255],[249,249,253],[235,233,247]];
windowProtectedPixels.forEach(rgb=>assert.equal(api.windowInteriorAlphaForRGB(rgb),0,`Reflection/neutral window feature recolored: ${rgb}`));
assert.equal(api.windowInteriors.HOME.length,8);
assert.equal(api.windowInteriors.SCHOOL.length,10);
for (const [hex, expectedOrder] of [["#64D4CE", [1, 2, 0]], ["#A62B17", [0, 1, 2]], ["#FFD100", [0, 1, 2]]]) {
  const output = applyMatrix([230, 225, 238].map((channel) => channel / 255), Array.from(api.matrixForHex(hex)));
  assert.ok(output[expectedOrder[0]] > output[expectedOrder[1]] && output[expectedOrder[1]] > output[expectedOrder[2]], `${hex}: opaque school door frame has the wrong palette hue`);
}
for (const [slug, record] of Object.entries(manifest.palettes)) {
  const matrix = Array.from(api.matrixForHex(record.characterHex));
  assert.equal(matrix.length, 20);
  assert.ok(matrix.every(Number.isFinite));
  for (const input of [[226, 201, 228].map((channel) => channel / 255), [212, 184, 216].map((channel) => channel / 255), ...schoolDoorFramePixels.map((rgb) => rgb.map((channel) => channel / 255)), [0.8, 0.7, 0.85], [0.5, 0.5, 0.5]]) {
    const output = applyMatrix(input, matrix);
    assert.ok(Math.abs(luminance(input) - luminance(output)) < 1e-10, `${slug}: matrix moved source luminance`);
    assert.ok(output.every((channel) => channel >= 0 && channel <= 1), `${slug}: representative pigment clips in the SVG filter`);
    if (input[0] === input[1] && input[1] === input[2]) {
      output.forEach((channel) => assert.ok(Math.abs(channel - input[0]) < 1e-10, `${slug}: neutral shifted`));
    }
    if (record.characterHex.toLowerCase() === "#a9a9a9") {
      assert.ok(Math.max(...output) - Math.min(...output) < 1e-10, "Gray exterior still carries a hue");
    }
  }
  for (const context of ["HOME", "SCHOOL"]) {
    const place = context === "HOME" ? "house" : "school";
    const href = `assets/entrance/${place}-exterior.webp?v=local&test="escaped"`;
    const factory = api.create({ context, href, characterHex: record.characterHex });
    assert.equal(factory.enabled, true);
    const crop = api.doorCrops[context];
    const full = factory.svg({ className: "ksize-entry-building", opening: crop });
    const leaf = factory.svg({ viewBox: [crop.x, crop.y, context === "HOME" ? crop.width : crop.width / 2, crop.height] });
    for (const svg of [full, leaf]) {
      assert.match(svg, /color-interpolation-filters="sRGB"/);
      assert.match(svg, /127\.5 -127\.5 0 0 -1" result="redOverGreen"/);
      const yellow = record.characterHex.toUpperCase() === "#FFD100";
      assert.equal((svg.match(/<image /g) || []).length, 3, `${slug}/${context}: required image layers differ`);
      if (!yellow) {
        assert.match(svg,/result="excludeBrightWhites"/);
        assert.match(svg,/result="windowInteriorPigment"/);
      } else {
        assert.doesNotMatch(svg,/result="windowInteriorPigment"/);
        if (context === "HOME") assert.match(svg,/result="softYellowCurtain"/);
        else assert.doesNotMatch(svg,/result="softYellowCurtain"/);
      }
      assert.match(svg, /preserveAspectRatio="none"/);
      assert.match(svg, new RegExp(`data-exterior-palette="${record.characterHex}"`, "i"));
      assert.match(svg, /&amp;test=&quot;escaped&quot;/);
      assert.doesNotMatch(svg, /href="[^"\n]*"escaped"/);
      allIds.push(...Array.from(svg.matchAll(/id="([^"]+)"/g), (match) => match[1]));
    }
    assert.match(full, /class="ksize-entry-building"/);
    assert.match(full, new RegExp(`<rect x="${crop.x}" y="${crop.y}" width="${crop.width}" height="${crop.height}" fill="black"`));
    assert.match(leaf, new RegExp(`viewBox="${crop.x} ${crop.y} ${context === "HOME" ? crop.width : crop.width / 2} ${crop.height}"`));
    assert.doesNotMatch(leaf, /-opening/);
    // Both SVGs contain precisely the same pigment matrix/gates and geometric
    // exclusions; only their IDs, viewBox and opening differ.
    const matrixValues = (svg) => svg.match(/values="([^"]+)" result="palettePigment"/)?.[1];
    assert.equal(matrixValues(full), matrixValues(leaf), "Door crop does not share full-scene palette treatment");
    const holes = Array.from(api.maskGeometry[context].exclusions, (rect) => Array.from(rect));
    for (const [x, y, width, height] of holes) {
      const pattern = new RegExp(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="black"`);
      assert.match(full, pattern);
      assert.match(leaf, pattern);
    }
  }
}
assert.equal(new Set(allIds).size, allIds.length, "Inline SVG IDs collide across palettes or door leaves");
assert.equal(api.create({ context: "HOME", href: "source.webp" }).enabled, false);
assert.equal((api.create({ context: "HOME", href: "source.webp" }).svg().match(/<image /g) || []).length, 1);
assert.throws(() => api.matrixForHex("aqua"), /characterHex/);
assert.throws(() => api.create({ context: "PARK", href: "source.webp", characterHex: "#64D4CE" }), /Unknown exterior context/);
assert.throws(() => api.create({ context: "HOME", href: "source.webp", characterHex: "#64D4CE" }).svg({ viewBox: [0, 0, 0, 10] }), /viewBox/);

console.log(JSON.stringify({ status: "PASS", palettes: 17, exteriorScenes: 34, protectedRGBProbes: protectedPixels.length, curtainProbes:curtainPixels.length, protectedWindowProbes:windowProtectedPixels.length, schoolDoorFrameProbes: schoolDoorFramePixels.length, rendering: "inline-svg" }));
