import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Static checks for the isolated child welcome; this never starts a browser,
// participant session, recording, or audio playback.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidate = path.join(root, "versions/chs-home-school-evelyn-v1");
const read = (name) => fs.readFileSync(path.join(candidate, name), "utf8");
const app = read("app.js");
const css = read("styles.css");
const canonical = JSON.parse(read("data/canonical_audio_manifest_evelyn.json"));
const receipt = JSON.parse(read("data/child_welcome_audio_revision_r19.json"));
const stringConstant = (name) => {
  const match = app.match(new RegExp(`const ${name} = ("(?:\\\\.|[^"\\\\])*");`));
  assert.ok(match, `Missing string constant: ${name}`);
  return JSON.parse(match[1]);
};
const text = stringConstant("START_INTRO_TEXT");
const output = stringConstant("START_INTRO_AUDIO");
const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
const welcome = app.slice(app.indexOf("const welcomeNode = {"), app.indexOf("const doneNode = {"));
assert.ok(welcome.length > 0);
assert.match(welcome, /<h1 class="ksize-title">Who Helps Where\?<\/h1>/);
assert.match(app, /<span class="ksize-setup-eyebrow">Who Helps Where\?<\/span>/);
assert.match(read("index.html"), /<title>Who Helps Where\?/);
assert.doesNotMatch(app, /Who Takes Care\?|Welcome to Find the Caregiver/i);
const wrapper = fs.readFileSync(path.join(root, "chs_ready/home_school_18_cell_wrapper_draft.js"), "utf8");
assert.match(wrapper, /picture game called Who Helps Where\?/);
assert.match(wrapper, /title="Who Helps Where\? child game"/);
assert.doesNotMatch(wrapper, /Who Takes Care\?/);

const scope = "ksize-who-helps-where-welcome";
assert.equal(app.split(scope).length - 1, 1, "Welcome palette must be assigned to one page only");
assert.match(welcome, new RegExp(`<section class="[^"]*${scope}[^"]*"`));
const theme = css.slice(css.indexOf(`.${scope} {`), css.indexOf(`@keyframes ksize-who-helps-where-replay-glow`));
assert.ok(theme.length > 0);
for (const rule of theme.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
  assert.ok(rule[1].trim().startsWith(`.${scope}`), `Unscoped welcome rule: ${rule[1]}`);
}
assert.match(theme, /linear-gradient\(135deg, #eee5f5 0%, #fff9f3 52%, #f8ddd0 100%\)/);
assert.match(theme, /\.ksize-title\s*\{\s*color: #56366f;/);
assert.match(theme, /\.ksize-welcome-star\s*\{\s*color: #d3a185;/);
assert.doesNotMatch(theme, /\.ksize-next-btn|\.ksize-helper-face|\.ksize-context-spoken-banner|\.ksize-furnished-scene/,
  "Welcome palette must not recolor Start, narrator, captions, or story pictures");
assert.match(css, /\.ksize-next-btn\s*\{\s*background: #1f8b6f;/);
assert.match(css, /\.ksize-welcome-screen \.ksize-helper-face,[\s\S]*?background: #ffd15c;/);

assert.match(text, /^Hi there! Welcome to Who Helps Where\?/);
assert.match(text, /hit the green button to start\.$/);
assert.equal(output, "audio_evelyn/whw_001_child_welcome_who_helps_where.mp3");
assert.equal(receipt.text, text);
assert.equal(receipt.output, output);
assert.equal(receipt.provider, "NaturalReaders Commercial");
assert.equal(receipt.voice, "Evelyn");
assert.equal(receipt.style, "Soft");
assert.equal(canonical.normalizedTextToOutput[normalized], output);
const activeWelcome = canonical.evelynLines.filter((line) => line.category === "child-welcome" && line.active);
assert.equal(activeWelcome.length, 1, "Only the revised welcome should be active");
assert.equal(activeWelcome[0].text, text);
assert.equal(activeWelcome[0].output, output);
assert.equal(activeWelcome[0].sha256, receipt.sha256);
assert.equal(activeWelcome[0].bytes, receipt.bytes);
assert.doesNotMatch(JSON.stringify(canonical.normalizedTextToOutput), /welcome to (?:who takes care|find the caregiver)/i);
const audioBytes = fs.readFileSync(path.join(root, output));
assert.equal(audioBytes.length, receipt.bytes);
assert.equal(createHash("sha256").update(audioBytes).digest("hex"), receipt.sha256);
assert.ok(receipt.durationSeconds > 10 && receipt.durationSeconds < 30);
assert.equal(receipt.originalRetained, true);
assert.notEqual(receipt.replaces, output);
assert.ok(fs.existsSync(path.join(root, receipt.replaces)), "Original welcome export must remain intact");

const autoplay = welcome.slice(welcome.indexOf("const runWelcomeSequence = async"), welcome.indexOf("if (!isFacilitatorMode)"));
const replay = welcome.slice(welcome.indexOf('playButton?.addEventListener("click"'), welcome.indexOf('startButton?.addEventListener("click"'));
for (const [name, handler] of [["autoplay", autoplay], ["Replay", replay]]) {
  assert.match(handler, /await audio\.playFile\(START_INTRO_AUDIO, START_INTRO_TEXT\);/, `${name} must use the shared recording and script`);
  assert.equal((handler.match(/audio\.playFile\(/g) || []).length, 1, `${name} has an unexpected additional recording`);
}
assert.match(welcome, /if \(!isFacilitatorMode\)\s*\{\s*runWelcomeSequence\(/);
assert.match(welcome, /facilitator_script: START_INTRO_TEXT/);

console.log(JSON.stringify({ status: "PASS", welcomeTitle: "Who Helps Where?", scopedWelcomePalette: true,
  parentAndChildNamesAgree: true, canonicalEvelynRecordingVerified: true,
  autoplayAndReplayShareRecording: true, originalExportRetained: true,
  bytes: audioBytes.length, durationSeconds: receipt.durationSeconds }, null, 2));
