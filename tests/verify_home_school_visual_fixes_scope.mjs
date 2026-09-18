import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Pin the approved r20 commit, not HEAD: a later commit must not make unrelated
// timing, audio or CHS-flow changes pass this narrow visual scope gate. The
// later explicit scene-size/choice-overlay request permits only the CSS below.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseline = "1eb0344b850bb759d655bd51d2c7619d454ecf35";
const candidate = "versions/chs-home-school-evelyn-v1";
const approvedRoot = path.resolve(root, "../who-takes-care-entrance-rollout");
const previousRelease = "chs-home-school-evelyn-v1-r20-approved-openings-1";
const release = "chs-home-school-evelyn-v1-r21-visual-fixes-1";
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const read = (filename) => fs.readFileSync(path.join(root, filename), "utf8");
const before = (filename) => git("show", `${baseline}:${filename}`);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const bytes = (filename) => fs.readFileSync(path.join(root, filename));

function replaceOnce(source, oldText, newText, label) {
  assert.equal(source.split(oldText).length - 1, 1, `${label}: expected exactly one approved edit`);
  return source.replace(oldText, newText);
}

function entranceFunction(source) {
  const start = source.indexOf("function entranceLayersHtml(");
  const end = source.indexOf("\nfunction entranceController(", start);
  assert.ok(start >= 0 && end > start, "Cannot locate the bounded entrance renderer");
  return source.slice(start, end);
}

const appPath = `${candidate}/app.js`;
const baselineApp = before(appPath);
const app = read(appPath);
const approvedEntranceHash = "4b57a9791066b0ad06715991940cc8dbe7b80b822116815d6fe88fc2016127e8";
assert.equal(sha(entranceFunction(app)), approvedEntranceHash,
  "Entrance renderer must exactly match the approved palette/door-crop integration");
let normalizedApp = replaceOnce(app, release, previousRelease, "runtime release");
normalizedApp = replaceOnce(normalizedApp, entranceFunction(app), entranceFunction(baselineApp), "entrance renderer");
normalizedApp = replaceOnce(normalizedApp,
  "entranceLayersHtml(studyContext, furnishedScene.paletteSlug, furnishedScene.accent)",
  "entranceLayersHtml(studyContext, furnishedScene.paletteSlug)", "exact character palette argument");
normalizedApp = replaceOnce(normalizedApp,
  '      context_window_greenery_repair_version: studyContext === "SCHOOL" ? trial?.homeSchoolFurnished?.windowGreeneryRepairVersion || null : null,\n',
  "", "School greenery provenance");
normalizedApp = replaceOnce(normalizedApp,
  '      context_help_gap_repair_version: studyContext && suffix === "HELP" ? trial?.homeSchoolFurnished?.helpGapRepairVersion || null : null,\n',
  "", "Help gap provenance");
normalizedApp = replaceOnce(normalizedApp,
  "  // Route every School page and its preloader through the original-green bush correction.\n  window.WTCWindowGreenery?.applyToManifest(eventManifest);\n",
  "", "School background routing hook");
normalizedApp = replaceOnce(normalizedApp,
  "  // Remove only enclosed white source-background gaps on the box story layers.\n  window.WTCHelpGapRepair?.applyToManifest(eventManifest);\n",
  "", "Help foreground routing hook");
assert.ok(normalizedApp === baselineApp,
  "Runtime changed outside the named renderer/call/provenance/routing/release edits");
assert.ok(app.indexOf("WTCWindowGreenery?.applyToManifest(eventManifest)")
  < app.indexOf("const eventPlan = planEventSession(eventManifest"), "Repair must precede planning and preload");
assert.ok(app.indexOf("WTCHelpGapRepair?.applyToManifest(eventManifest)")
  < app.indexOf("const eventPlan = planEventSession(eventManifest"), "Foreground repair must precede planning and preload");

const indexPath = `${candidate}/index.html`;
let expectedIndex = before(indexPath).replaceAll(previousRelease, release);
expectedIndex = replaceOnce(expectedIndex,
  "entrance.css?v=who-helps-where-caption-v3", `entrance.css?v=${release}`, "entrance CSS cache refresh");
expectedIndex = replaceOnce(expectedIndex,
  `<script src="app.js?v=${release}"></script>`,
  `<script src="exterior-palette.js?v=${release}"></script>\n<script src="window-greenery.js?v=${release}"></script>\n<script src="help-gap-repair.js?v=${release}"></script>\n<script src="app.js?v=${release}"></script>`,
  "helper script insertion");
assert.ok(read(indexPath) === expectedIndex, "HTML may change only release tokens and the three helper script tags");

const wrapperPath = "chs_ready/home_school_18_cell_wrapper_draft.js";
const expectedWrapper = before(wrapperPath).replaceAll(previousRelease, release)
  .replace("This source targets the r20 within-child", "This source targets the r21 within-child");
assert.ok(read(wrapperPath) === expectedWrapper, "CHS wrapper may change only its release token and version comment");

const metadataPath = `${candidate}/candidate.json`;
const metadata = JSON.parse(read(metadataPath));
const oldMetadata = JSON.parse(before(metadataPath));
const verifiedSaved = metadata.status === "published_chs_draft_saved_not_submitted";
assert.ok(verifiedSaved || metadata.status === "local_r21_prepared_chs_access_blocked",
  "R21 metadata must describe either the pending candidate or the verified draft save");
assert.equal(metadata.candidateRelease, release);
assert.equal(metadata.lastPublishedRelease, verifiedSaved ? release : previousRelease);
assert.equal(metadata.chsDraftRelease, verifiedSaved ? release : previousRelease);
assert.equal(metadata.activeChsStudyChanged, false);
assert.equal(metadata.chsDraftConfigurationUpdated, verifiedSaved);
assert.equal(metadata.chsSubmissionStatus, "not_submitted");
assert.equal(metadata.published, verifiedSaved);
assert.equal(metadata.revisionPendingPublication, !verifiedSaved);
if (verifiedSaved) {
  assert.equal(Object.hasOwn(metadata, "pendingReason"), false,
    "Verified save must not retain an obsolete browser-blocked publication claim");
  assert.equal(metadata.latestChsDraftSaveReceipt, "review/chs-draft-save-r21.md");
  const saveReceipt = read(`${candidate}/review/chs-draft-save-r21.md`);
  const browserReceipt = read(`${candidate}/review/r21-browser-verification.md`);
  assert.ok(saveReceipt.includes(release), "Verified CHS save receipt must identify this exact release");
  assert.match(saveReceipt, /6349/, "Verified CHS save receipt must identify the actual study");
  assert.match(saveReceipt, /not submitted|not_submitted|not been submitted/i,
    "Save receipt must record that the study was not submitted");
  assert.match(browserReceipt, /224/, "Browser receipt must identify the full rendered fixture set");
} else {
  assert.match(metadata.pendingReason, /no hosted publication or CHS save attempted for r21/);
}
const restoredMetadata = structuredClone(metadata);
for (const key of ["status", "candidateRelease", "chsDraftConfigurationUpdated", "published", "revisionPendingPublication",
  "lastPublishedRelease", "chsDraftRelease", "latestChsDraftSaveReceipt"]) {
  restoredMetadata[key] = oldMetadata[key];
}
delete restoredMetadata.pendingReason;
assert.deepEqual(restoredMetadata, oldMetadata, "Candidate metadata must retain all approved design/audio/assignment facts");

// Byte-preservation is checked against the immutable commit across all tracked
// paths, including source media and every existing data/manifest file.
const approvedCss = new Set([`${candidate}/styles.css`, `${candidate}/entrance.css`]);
const mutableProduction = new Set([appPath, indexPath, metadataPath, wrapperPath, ...approvedCss]);
const additions = new Set([
  `${candidate}/exterior-palette.js`, `${candidate}/window-greenery.js`,
  `${candidate}/data/window_greenery_manifest.json`, "scripts/build_home_school_window_greenery.mjs",
  `${candidate}/help-gap-repair.js`, `${candidate}/data/help_gap_mask_manifest.json`,
  "scripts/build_home_school_help_gap_masks.mjs",
  "scripts/build_home_school_help_gap_review.mjs",
  `${candidate}/review/help-gap-mask-audit.md`,
  `${candidate}/review/help-gap-repair-before-after.png`,
  `${candidate}/review/help-gap-repair-layout-audit.png`,
  `${candidate}/review/r21-audio-at-audit.md`, `${candidate}/review/r21-layout-audit.md`,
  `${candidate}/review/r21-prepared-not-published.md`,
  `${candidate}/review/r21-layout-audit.md`, `${candidate}/review/r21-audio-at-audit.md`,
]);
const releaseReceiptPaths = [
  `${candidate}/review/r21-browser-verification.md`,
  `${candidate}/review/chs-draft-save-r21.md`,
];
for (const filename of releaseReceiptPaths) {
  assert.equal(git("ls-tree", "--name-only", baseline, "--", filename).trim(), "",
    `New release receipt must not overwrite any r20 artifact: ${filename}`);
  if (fs.existsSync(path.join(root, filename))) additions.add(filename);
}
const repair = JSON.parse(read(`${candidate}/data/window_greenery_manifest.json`));
for (const record of Object.values(repair.palettes)) additions.add(record.output);
const helpRepair = JSON.parse(read(`${candidate}/data/help_gap_mask_manifest.json`));
assert.deepEqual(helpRepair.coverage, {
  auditedHelpFiles: 112, repairedFiles: 88, unchangedDirectionalFiles: 24, removedWhitePixels: 32096,
});
for (const record of helpRepair.assets) {
  assert.equal(sha(bytes(record.source)), record.sourceSha256, "Original HELP foreground must remain unchanged");
  if (record.output) {
    additions.add(record.output);
    assert.equal(sha(bytes(record.output)), record.outputSha256, "Mask artifact must match its audited receipt");
  }
}
const baselineFiles = git("ls-tree", "-r", "--name-only", baseline).trim().split("\n");
const baselineSet = new Set(baselineFiles);
const changed = git("diff", "--name-only", baseline, "--").trim().split("\n").filter(Boolean);
assert.deepEqual(changed.filter((filename) => !mutableProduction.has(filename)
  && !additions.has(filename) && !filename.startsWith("tests/")), [],
"Unexpected production change: unrelated CSS, old manifests/audio, existing visuals and Find the Caregiver are immutable");
for (const filename of additions) assert.equal(baselineSet.has(filename), false, `New visual artifact overwrites r20: ${filename}`);
const protectedFiles = baselineFiles.filter((filename) => !approvedCss.has(filename) && (/\.css$/i.test(filename)
  || /\.(?:mp3|wav|m4a|aac|ogg|flac|aiff)$/i.test(filename)
  || /(?:^|\/)data\//.test(filename) || /manifest[^/]*\.json$/i.test(filename)));
assert.deepEqual(protectedFiles.filter((filename) => changed.includes(filename)), [],
  "Unrelated r20 CSS and all audio/manifest/data files must be byte-unchanged");
let expectedStyles = replaceOnce(before(`${candidate}/styles.css`),
  ".ksize-furnished-scene .ksize-char-btn {\n  z-index: 4;\n}",
  ".ksize-furnished-scene .ksize-char-btn {\n  /* Glowing and bouncing choice boxes stay in front when they cross text. */\n  z-index: 6;\n}",
  "choice boxes above captions");
expectedStyles = replaceOnce(expectedStyles,
  ".ksize-who-helps-where-welcome {\n  background:",
  ".ksize-who-helps-where-welcome {\n  /* Match story panels while allowing short screens to grow with content. */\n  min-height: calc(100vh - 42px);\n  background:",
  "matching welcome and story panel minimum height");
assert.equal(read(`${candidate}/styles.css`), expectedStyles, "Only requested welcome sizing and choice stacking order may change");
let expectedEntranceCss = replaceOnce(before(`${candidate}/entrance.css`),
  ".ksize-slide-image.ksize-furnished-scene.ksize-entry-shell { display:block; aspect-ratio:auto; overflow:hidden; }\n.ksize-entry-shell > .ksize-context-spoken-banner { position:relative; display:grid; width:100%; inset:auto; }\n.ksize-entry-stage { display:block; position:relative; width:100%; aspect-ratio:16 / 9; overflow:hidden; }",
  ".ksize-slide-image.ksize-furnished-scene.ksize-entry-shell { display:block; aspect-ratio:16 / 9; overflow:hidden; }\n/* Entrance and character pages share one frame. The empty room fills that\n   frame; the exterior and hallway begin below its existing caption strip. */\n.ksize-entry-stage { display:block; position:absolute; inset:0; width:100%; height:100%; overflow:hidden; }",
  "equal scene frame dimensions");
expectedEntranceCss = replaceOnce(expectedEntranceCss,
  ".ksize-entry-layers { position:absolute; inset:0; z-index:2; pointer-events:none; overflow:hidden; }",
  ".ksize-entry-layers { position:absolute; inset:5.3cqw 0 0; z-index:2; pointer-events:none; overflow:hidden; }",
  "caption-safe entrance viewport");
expectedEntranceCss = replaceOnce(expectedEntranceCss,
  ".ksize-entry-backing, .ksize-entry-world, .ksize-entry-fade { position:absolute; inset:0; }",
  ".ksize-entry-backing, .ksize-entry-world, .ksize-entry-fade { position:absolute; inset:0; }\n/* Keep the original building and door-crop proportions. The smaller visible\n   viewport trims only the lower foreground rather than covering the roof. */\n.ksize-entry-world { bottom:auto; width:100%; aspect-ratio:1672 / 941; }",
  "preserve source and door proportions");
expectedEntranceCss = replaceOnce(expectedEntranceCss,
  ".ksize-entry-stage .ksize-entry-hall { object-fit:fill; transform-origin:50% 45%; }",
  ".ksize-entry-stage .ksize-entry-hall { object-fit:cover; transform-origin:50% 45%; }",
  "undistorted hallway in matching scene frame");
assert.equal(read(`${candidate}/entrance.css`), expectedEntranceCss, "Entrance CSS changed outside equal-frame geometry");

// These fingerprints pin the approved L artifacts even when the original
// sibling review checkout is unavailable (for example in CI).
const approvedHashes = new Map([
  [`${candidate}/exterior-palette.js`, "84bd0d07e5981872edd465a6ae7dd49aabd0d46616fa9f52f83fdbbba489c804"],
  [`${candidate}/window-greenery.js`, "1c63a9319806a4d35b2e1f328d7081d92845aa9cb39b0d700d485923442f700c"],
  [`${candidate}/data/window_greenery_manifest.json`, "1c24459dec1612fba65c8a61e52c64e443fff071e1191184b63c5a678ca2e341"],
  ["scripts/build_home_school_window_greenery.mjs", "9f8b30d96db1632ea51e3e1b48cf83ca9efe47cc6c7222eca96d88f433c005bf"],
]);
assert.equal(Object.keys(repair.palettes).length, 17);
assert.deepEqual(repair.geometry.roi, { x: 0, y: 384, width: 34, height: 39 });
assert.equal(repair.geometry.selectedPixelCount, 1216);
assert.equal(sha(bytes(repair.sourceMaster)), repair.sourceMasterSha256);
assert.equal(sha(bytes(`${candidate}/data/visual_repair_manifest.json`)), repair.visualRepairManifestSha256);
for (const [slug, record] of Object.entries(repair.palettes)) {
  assert.equal(record.output, `${candidate}/assets/window-greenery-v1/${slug}/school-room.svg`);
  assert.equal(sha(bytes(record.schoolBackgroundSource)), record.schoolBackgroundSourceSha256);
  approvedHashes.set(record.output, record.outputSha256);
  const svg = read(record.output);
  assert.match(svg, /width="1536" height="1024" viewBox="0 0 1536 1024"/);
  assert.equal((svg.match(/<image /g) || []).length, 2);
  const hrefs = [...svg.matchAll(/\bhref="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(hrefs.length, 2);
  assert.ok(hrefs.every((href) => href.startsWith("data:image/png;base64,")), "Greenery SVG must remain self-contained");
  assert.doesNotMatch(svg, /<filter|feColorMatrix|hue-rotate|<path|<polygon/);
}
let directlyComparedToL = 0;
for (const [filename, expectedHash] of approvedHashes) {
  const currentBytes = bytes(filename);
  assert.equal(sha(currentBytes), expectedHash, `Approved artifact changed: ${filename}`);
  if (fs.existsSync(approvedRoot)) {
    assert.ok(currentBytes.equals(fs.readFileSync(path.join(approvedRoot, filename))), `Artifact differs from approved L: ${filename}`);
    directlyComparedToL += 1;
  }
}
if (fs.existsSync(approvedRoot)) {
  assert.equal(entranceFunction(app), entranceFunction(fs.readFileSync(path.join(approvedRoot, appPath), "utf8")));
}

console.log(JSON.stringify({
  status: "PASS", baseline, release,
  runtimeChanges: "approved entrance renderer, palette argument, School/HELP routing and provenance, and release only",
  wrapperTokenAndCommentOnly: true,
  approvedCssChangesOnly: "equal scene frames, matching welcome panel minimum, and choice boxes above captions",
  protectedR20FilesUnchanged: protectedFiles.length,
  approvedArtifactHashes: approvedHashes.size,
  approvedArtifactsComparedDirectlyToL: directlyComparedToL,
  correctedSchoolSVGs: Object.keys(repair.palettes).length,
  correctedHelpForegroundSVGs: helpRepair.coverage.repairedFiles,
  metadataState: metadata.status,
  lastPublishedRelease: metadata.lastPublishedRelease,
  chsDraftRelease: metadata.chsDraftRelease,
  previousPublicationAndChsDraftRemainR20: !verifiedSaved,
  publicationAndChsSaveRecordedInMetadata: verifiedSaved,
  thisTestPerformsPublicationOrChsActions: false,
  outputVerification: "Pinned exact approved output bytes, source hashes, dimensions and self-contained image structure; full pixel tests run separately",
}, null, 2));
