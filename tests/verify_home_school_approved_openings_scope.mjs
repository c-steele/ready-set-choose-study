import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// This deliberately compares against the last published release, not HEAD:
// committing unrelated local polish must not make that polish pass the gate.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseline = "9afad65";
const candidate = "versions/chs-home-school-evelyn-v1";
const previousRelease = "chs-home-school-evelyn-v1-r19-who-helps-where-1";
const release = "chs-home-school-evelyn-v1-r20-approved-openings-1";
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const read = (filename) => fs.readFileSync(path.join(root, filename), "utf8");
const before = (filename) => git("show", `${baseline}:${filename}`);
const json = (filename) => JSON.parse(read(filename));
const clone = (value) => JSON.parse(JSON.stringify(value));
const hash = (filename) => createHash("sha256").update(fs.readFileSync(path.join(root, filename))).digest("hex");

const approved = [
  {
    context: "HOME", id: "hs_r20_001", text: "Oh look! Here is a house.",
    sourceText: "Oh look. Here is a house.",
    output: "assets/home_school/generated/audio/hs_r20_001_house_exterior_approved.mp3",
    bytes: 124387, durationSeconds: 3.108550,
    sha256: "161d7baa744264751c6199b22801d36e26bd2b4ade5933caf7dc715ed5aa38de",
  },
  {
    context: "SCHOOL", id: "hs_r20_002", text: "Oh look! Here is a school.",
    sourceText: "Oh look. Here is a school.",
    output: "assets/home_school/generated/audio/hs_r20_002_school_exterior_approved.mp3",
    bytes: 125432, durationSeconds: 3.134675,
    sha256: "c2ba588b936caa76be7bde77a7e5ef5e5d89170b89e19b1715c56defd6f7e2bd",
  },
];
const receipt = json(`${candidate}/data/exterior_audio_revision_r20.json`);
assert.equal(receipt.status, "approved_for_chs_draft");
assert.equal(receipt.voice, "Evelyn");
assert.equal(receipt.style, "Soft");
assert.equal(receipt.speed, 0.9);
assert.equal(receipt.files.length, 2, "Only the two researcher-approved exterior takes may be installed");

const audioPath = `${candidate}/data/home_school_audio_manifest.json`;
const contextPath = `${candidate}/data/home_school_context_manifest.json`;
const oldAudio = JSON.parse(before(audioPath));
const oldContext = JSON.parse(before(contextPath));
const currentAudio = json(audioPath);
const currentContext = json(contextPath);
const restoredAudio = clone(currentAudio);
const restoredContext = clone(currentContext);
for (const expected of approved) {
  const records = receipt.files.filter((clip) => clip.id === expected.id);
  assert.equal(records.length, 1, `${expected.id}: exactly one receipt entry`);
  const active = currentAudio.lines.filter((clip) => clip.text === expected.text);
  assert.equal(active.length, 1, `${expected.id}: exactly one canonical text mapping`);
  for (const key of ["id", "text", "sourceText", "output", "bytes", "durationSeconds", "sha256"]) {
    assert.equal(records[0][key], expected[key], `${expected.id}: approved receipt ${key}`);
    assert.equal(active[0][key], expected[key], `${expected.id}: active ${key}`);
  }
  assert.equal(active[0].audioEdit, undefined, "Approved exports must not gain synthetic audio edits");
  assert.equal(hash(expected.output), expected.sha256, `${expected.id}: exact original export bytes`);
  assert.equal(fs.statSync(path.join(root, expected.output)).size, expected.bytes);
  assert.deepEqual(currentContext.contexts[expected.context].exterior, {
    text: expected.text, audio: expected.output,
  });
  const original = oldAudio.lines.find((clip) => clip.text === expected.text);
  assert.ok(original);
  assert.deepEqual(records[0].replaces, { output: original.output, sha256: original.sha256 },
    `${expected.id}: provenance must identify the last published recording`);
  restoredAudio.lines[restoredAudio.lines.findIndex((clip) => clip.text === expected.text)] = clone(original);
  restoredContext.contexts[expected.context].exterior = clone(oldContext.contexts[expected.context].exterior);
}
assert.deepEqual(restoredAudio, oldAudio, "No other audio record or manifest metadata may change");
assert.deepEqual(restoredContext, oldContext, "Only the two exterior audio pointers may change; captions and questions stay identical");

// Check bytes as well as pointers. This covers all old non-question audio and
// all 24 live helping questions, including the unapproved School/Mom/Hug audition.
assert.equal(oldAudio.lines.filter((clip) => /^At the kid's (?:house|school), who will /.test(clip.text)).length, 24);
for (const clip of oldAudio.lines) {
  assert.equal(hash(clip.output), clip.sha256, `Published audio changed or disappeared: ${clip.output}`);
}
const schoolMomHug = currentContext.contexts.SCHOOL.recipientEvents.MOM.HUG.questionAudio;
assert.equal(schoolMomHug, "assets/home_school/generated/audio/hs_r15_016_school_mom_hug_question_context_first.mp3");
assert.equal(hash(schoolMomHug), "f8ba7cadb076820d933cc8430f186edc6e7ac2e35489884a7b6477bf63fae013");
assert.doesNotMatch(JSON.stringify(currentAudio) + JSON.stringify(currentContext), /audio-candidates-(?:pause-)?local/);

// Runtime code and CHS flow may change only their cache/release label. In
// particular, no local narration-pool, palette, or geometry work is authorized.
for (const filename of [`${candidate}/app.js`, `${candidate}/index.html`, "chs_ready/home_school_18_cell_wrapper_draft.js"]) {
  let expected = before(filename).replaceAll(previousRelease, release);
  if (filename === "chs_ready/home_school_18_cell_wrapper_draft.js") {
    expected = expected.replace("This source targets the r19 within-child", "This source targets the r20 within-child");
  }
  assert.ok(read(filename) === expected, `${filename}: change exceeded the release token/comment`);
}

const allowedTrackedChanges = new Set([
  ...approved.map((clip) => clip.output),
  `${candidate}/app.js`, `${candidate}/index.html`, `${candidate}/candidate.json`,
  audioPath, contextPath, `${candidate}/data/exterior_audio_revision_r20.json`,
  `${candidate}/review/chs-draft-save-r20.md`,
  "chs_ready/home_school_18_cell_wrapper_draft.js",
  "tests/verify_home_school_approved_openings_scope.mjs",
  "tests/verify_home_school_directional_audio_import.mjs",
  "tests/verify_home_school_entrance_rollout.mjs",
  "tests/verify_chs_home_school_candidate.mjs",
  "tests/verify_home_school_furnished_candidate.mjs",
  "tests/verify_home_school_chs_wrapper.mjs",
]);
const changedFiles = git("diff", "--name-only", baseline, "--").trim().split("\n").filter(Boolean);
assert.deepEqual(changedFiles.filter((filename) => !allowedTrackedChanges.has(filename)), [],
  "Unexpected tracked changes: Find the Caregiver, shared assets, review board, and unrelated candidate files must remain untouched");

console.log("PASS: approved r20 rollout differs from published 9afad65 only within the explicit release allowlist");
console.log("- Exactly two approved exterior exports match their immutable hashes and canonical/context mappings.");
console.log("- All other narration records, all 24 questions, original audio bytes, and Find the Caregiver remain unchanged.");
console.log("- Candidate runtime/HTML and CHS wrapper contain release-token changes only; no local polish is included.");
