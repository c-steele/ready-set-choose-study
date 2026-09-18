import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidateRoot = path.join(root, "versions", "chs-home-school-evelyn-v1");
const dataRoot = path.join(candidateRoot, "data");

const candidate = JSON.parse(fs.readFileSync(path.join(candidateRoot, "candidate.json"), "utf8"));
const eventManifest = JSON.parse(fs.readFileSync(path.join(dataRoot, "ksize_manifest.json"), "utf8"));
const dyadManifest = JSON.parse(fs.readFileSync(path.join(dataRoot, "dyad_manifest.json"), "utf8"));
const contextManifest = JSON.parse(fs.readFileSync(path.join(dataRoot, "home_school_context_manifest.json"), "utf8"));
const visualManifest = JSON.parse(fs.readFileSync(path.join(dataRoot, "furnished_visual_manifest.json"), "utf8"));
const dyadVisualManifest = JSON.parse(fs.readFileSync(path.join(dataRoot, "furnished_dyad_visual_manifest.json"), "utf8"));
const missingAudio = JSON.parse(fs.readFileSync(path.join(dataRoot, "missing_home_school_directional_audio_manifest.json"), "utf8"));
const app = fs.readFileSync(path.join(candidateRoot, "app.js"), "utf8");
const css = fs.readFileSync(path.join(candidateRoot, "styles.css"), "utf8");
const html = fs.readFileSync(path.join(candidateRoot, "index.html"), "utf8");

function manifestImages(trial) {
  const intro = (trial.blocks.INTRO?.introSlides || []).flatMap((slide) => slide.images || []);
  const events = ["HUG", "FOOD", "HELP"].flatMap((suffix) => trial.blocks[suffix]?.images || []);
  return [...intro, ...events];
}

function readPngHeader(filePath) {
  const header = Buffer.alloc(26);
  const handle = fs.openSync(filePath, "r");
  try {
    assert.equal(fs.readSync(handle, header, 0, header.length, 0), header.length);
  } finally {
    fs.closeSync(handle);
  }
  assert.deepEqual([...header.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${filePath} is not PNG`);
  return {
    width: header.readUInt32BE(16),
    height: header.readUInt32BE(20),
    bitDepth: header[24],
    colorType: header[25],
  };
}

assert.equal(candidate.candidateId, "chs-home-school-evelyn-v1");
assert.equal(candidate.activeChsStudyChanged, false);
assert.equal(candidate.published, false);
assert.equal(candidate.publishedOn, "2026-09-18");
assert.equal(candidate.lastPublishedRelease, "chs-home-school-evelyn-v1-r20-approved-openings-1");
assert.equal(candidate.candidateRelease, "chs-home-school-evelyn-v1-r21-visual-fixes-1");
assert.equal(candidate.status, "local_r21_prepared_chs_access_blocked");
assert.equal(candidate.revisionPendingPublication, true);
assert.equal(candidate.chsDraftRelease, "chs-home-school-evelyn-v1-r20-approved-openings-1");
assert.equal(candidate.latestChsDraftSaveReceipt, "review/chs-draft-save-r20.md");
assert.equal(candidate.missingEvelynClipCount, 0);
assert.equal(candidate.directionalEvelynClipCount, 30);
assert.equal(missingAudio.missingClipCount, 30);
assert.equal(missingAudio.lines.length, 30);

assert.equal(candidate.visualStatus, "researcher_preview");
assert.equal(candidate.visualVersion, "home_school_furnished_palette_picture_v38");
assert.equal(contextManifest.visualTreatment.type, "furnished-palette-matched-background");
assert.equal(contextManifest.visualTreatment.version, candidate.visualVersion);
assert.equal(contextManifest.visualTreatment.fullyIllustratedBackgrounds, true);
assert.equal(contextManifest.scriptVersion, "home_school_house_entrance_recipient_aware_v6");
assert.equal(contextManifest.visualTreatment.followupRatings, "removed from this design");
assert.match(contextManifest.visualTreatment.scope, /helping-choice pages in both matched setting blocks/);
assert.equal(contextManifest.visualTreatment.followupQualityControl, "data/furnished_dyad_visual_manifest.json");

const completeTrials = eventManifest.trials.filter((trial) => trial.isComplete);
assert.equal(completeTrials.length, 56);
assert.equal(new Set(completeTrials.map((trial) => trial.blocks.INTRO.condition)).size, 14);

const foregrounds = [];
const roomPaths = new Set();
const palettes = new Set();
for (const trial of completeTrials) {
  assert.equal(trial.blocks.INTRO?.introSlides?.length, 4, `${trial.id} must introduce the kid and both candidates before the context cue`);
  const visual = trial.homeSchoolFurnished;
  assert.ok(visual, `Missing furnished mapping for ${trial.id}`);
  assert.equal(visual.version, candidate.visualVersion);
  assert.match(visual.characterHex, /^#[0-9A-F]{6}$/);
  assert.equal(visual.characterTreatment, "original_rgb_and_geometry_unchanged");
  assert.match(visual.homeBackground, /palette_picture_floor_clean_v17\.webp$/);
  palettes.add(visual.paletteSlug);
  roomPaths.add(visual.homeBackground);
  roomPaths.add(visual.schoolBackground);

  const images = manifestImages(trial);
  assert.equal(images.length, 10, `${trial.id} must have four intro and six event pages`);
  for (const image of images) {
    assert.match(
      image.homeSchoolForegroundSrc || "",
      new RegExp(`^versions/chs-home-school-evelyn-v1/assets/home_school/foregrounds/${trial.id}/`),
    );
    foregrounds.push(image.homeSchoolForegroundSrc);
  }
}

assert.equal(palettes.size, 17);
assert.equal(roomPaths.size, 34);
for (const roomPath of roomPaths) {
  const absolute = path.join(root, roomPath);
  assert.ok(fs.existsSync(absolute), `Missing furnished room ${roomPath}`);
  assert.ok(fs.statSync(absolute).size > 10_000, `Empty furnished room ${roomPath}`);
}

assert.equal(foregrounds.length, 560);
assert.equal(new Set(foregrounds).size, 560);
for (const foregroundPath of foregrounds) {
  const absolute = path.join(root, foregroundPath);
  assert.ok(fs.existsSync(absolute), `Missing generated foreground ${foregroundPath}`);
  assert.deepEqual(
    readPngHeader(absolute),
    { width: 1920, height: 1080, bitDepth: 8, colorType: 6 },
    `Unexpected foreground encoding for ${foregroundPath}`,
  );
}

assert.equal(visualManifest.candidate, candidate.candidateId);
assert.equal(visualManifest.status, "visual-assets-complete");
assert.equal(visualManifest.visualVersion, candidate.visualVersion);
assert.equal(visualManifest.coverage.trialCount, 56);
assert.equal(visualManifest.coverage.conditionCount, 14);
assert.equal(visualManifest.coverage.paletteCount, 17);
assert.equal(visualManifest.coverage.pageForegroundCount, 560);
assert.equal(visualManifest.coverage.contextualSceneCount, 1120);
assert.equal(visualManifest.assets.length, 560);
assert.equal(visualManifest.integrity.opaqueRgbChangedPixelsAcrossAllFiles, 0);
assert.equal(visualManifest.integrity.filesWithPartialAlpha, 0);
assert.equal(visualManifest.integrity.removedDirectionalHelpGapComponentsAcrossAllFiles, 24);
assert.deepEqual(new Set(visualManifest.assets.map((asset) => asset.output)), new Set(foregrounds));
assert.ok(visualManifest.assets.every((asset) => asset.rgbChangedOpaquePixels === 0));
assert.ok(visualManifest.assets.every((asset) => asset.partialAlphaPixels === 0));
assert.ok(visualManifest.assets.every((asset) => asset.preservedEnclosedWhiteComponents > 0));
const repairedHelpForegrounds = visualManifest.assets.filter(
  (asset) => asset.removedDirectionalHelpGapComponents === 1,
);
assert.equal(repairedHelpForegrounds.length, 24);
assert.ok(repairedHelpForegrounds.every((asset) =>
  asset.suffix === "HELP" && ["DAD-KID", "MOM-KID", "TEACHER-KID"].includes(asset.condition)
));

const followupForegrounds = [];
for (const chunk of dyadManifest.chunks) {
  for (const slide of chunk.slides) {
    const needsForeground = ["intro", "response"].includes(slide.kind)
      || slide.src === "assets/dyads/sister-kid_01_mks-orange/sister-kid.006.png";
    if (!needsForeground) continue;
    assert.match(
      slide.homeSchoolForegroundSrc || "",
      new RegExp(`^versions/chs-home-school-evelyn-v1/assets/home_school/foregrounds/followups/${chunk.id}/`),
    );
    followupForegrounds.push(slide.homeSchoolForegroundSrc);
  }
}
assert.equal(followupForegrounds.length, 449);
assert.equal(new Set(followupForegrounds).size, 449);
for (const foregroundPath of followupForegrounds) {
  const absolute = path.join(root, foregroundPath);
  assert.ok(fs.existsSync(absolute), `Missing follow-up foreground ${foregroundPath}`);
  assert.deepEqual(
    readPngHeader(absolute),
    { width: 1920, height: 1080, bitDepth: 8, colorType: 6 },
    `Unexpected follow-up foreground encoding for ${foregroundPath}`,
  );
}
assert.equal(dyadVisualManifest.candidate, candidate.candidateId);
assert.equal(dyadVisualManifest.status, "visual-assets-complete");
assert.equal(dyadVisualManifest.coverage.chunkCount, 56);
assert.equal(dyadVisualManifest.coverage.foregroundCount, 449);
assert.equal(dyadVisualManifest.assets.length, 449);
assert.equal(dyadVisualManifest.integrity.opaqueRgbChangedPixelsAcrossAllFiles, 0);
assert.equal(dyadVisualManifest.integrity.filesWithPartialAlpha, 0);
assert.deepEqual(new Set(dyadVisualManifest.assets.map((asset) => asset.output)), new Set(followupForegrounds));

const contactSheet = path.join(root, visualManifest.contactSheet);
assert.ok(fs.existsSync(contactSheet), "Missing all-pairings Home/School contact sheet");
assert.ok(fs.statSync(contactSheet).size > 100_000, "Contact sheet is unexpectedly small");

assert.match(app, /function furnishedSceneSpec\(/);
assert.match(app, /const HOME_SCHOOL_ASSET_VERSION = "chs-home-school-evelyn-v1-r21-visual-fixes-1"/);
assert.match(app, /slideIndex === block\.introSlides\.length - 1 && studyContext/);
assert.doesNotMatch(app, /slideIndex === 0 && (?:activeStudyContext|studyContext)/);
assert.doesNotMatch(css, /text-wrap:\s*balance/);
assert.match(css, /\.ksize-context-spoken-banner[\s\S]*?text-wrap:\s*wrap/);
assert.match(css, /\.ksize-context-spoken-banner[\s\S]*?font-size:\s*2\.8cqw/);
assert.doesNotMatch(css, /data-slide-kind="context_intro"[\s\S]{0,500}?42vh/);
assert.match(app, /`data\/ksize_manifest\.json\?v=\$\{HOME_SCHOOL_ASSET_VERSION\}`/);
assert.match(app, /function furnishedImageLayersHtml\(/);
assert.match(app, /function furnishedFollowupSceneSpec\(/);
assert.match(app, /function followupForegroundSrc\(/);
assert.doesNotMatch(app, /ksize-context-intro-cue|ksize-context-badge-large/);
assert.doesNotMatch(app, /contextBadgeSrc\([^\n]*large/);
assert.doesNotMatch(css, /\.ksize-context-intro-cue|\.ksize-context-badge-large/);
assert.match(app, /function setNarratorMouthPlaying\(/);
for (const mediaEvent of ["playing", "waiting", "pause", "abort", "emptied", "ended", "error"]) {
  assert.match(app, new RegExp(`fileAudio\\.addEventListener\\("${mediaEvent}"`));
}
assert.match(app, /makeSlideNode\(jsPsych, trial, chunk, slide/);
assert.match(app, /context_foreground_src:/);
assert.match(app, /homeSchoolForegroundSrc/);
assert.match(app, /context_visual_treatment: selectedContext \? "furnished_palette_matched_background"/);
assert.match(app, /context_visual_version: selectedContext \? HOME_SCHOOL_FURNISHED_VISUAL_VERSION/);
assert.match(app, /recipientEvents/);
assert.match(app, /contextOrder\.forEach\(\(context\) => \{[\s\S]*?assertParticipantContextAudioCoverage\(eventPlan, selectedEventSuffix, context\)/);
assert.match(css, /\.ksize-furnished-scene > \.ksize-furnished-room/);
assert.match(css, /\.ksize-furnished-scene > \.ksize-furnished-foreground/);
assert.match(css, /\.ksize-image-wrap \.ksize-rating-furnished-scene/);
assert.match(css, /\.ksize-furnished-scene \.ksize-char-btn/);
assert.match(css, /\.ksize-screen\[data-context="HOME"\],[\s\S]*?\.ksize-screen\[data-context="SCHOOL"\][\s\S]*?justify-content:\s*flex-start/);
assert.match(css, /\.ksize-screen\[data-context="HOME"\] \.ksize-bottom-area,[\s\S]*?\.ksize-screen\[data-context="SCHOOL"\] \.ksize-bottom-area[\s\S]*?margin-top:\s*8px/);
assert.match(html, /chs-home-school-evelyn-v1-r21-visual-fixes-1/g);
assert.doesNotMatch(html, /chs-home-school-evelyn-v1-r(?:[1-9])(?!\d)/);

console.log(JSON.stringify({
  status: "PASS",
  candidate: candidate.candidateId,
  visualVersion: candidate.visualVersion,
  pairings: 14,
  trials: 56,
  palettes: 17,
  foregroundPages: 560,
  contextualScenes: 1120,
  contactSheet: visualManifest.contactSheet,
  originalOpaqueRgbPixelsChanged: 0,
  importedDirectionalEvelynClips: 30,
  missingDirectionalEvelynClips: 0,
  followupForegroundPages: 448,
  followupAuxiliaryLayers: 1,
  contextualFollowupScenes: 896,
  published: candidate.published,
}, null, 2));
