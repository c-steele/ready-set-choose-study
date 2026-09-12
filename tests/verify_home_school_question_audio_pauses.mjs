import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidateDataRoot = path.join(root, "versions", "chs-home-school-evelyn-v1", "data");
const derivedRoot = "assets/home_school/generated/audio/setting_pause_450ms";
const ffmpeg = process.env.FTC_FFMPEG_PATH || "ffmpeg";

const pauseManifest = JSON.parse(fs.readFileSync(path.join(candidateDataRoot, "home_school_question_pause_manifest.json"), "utf8"));
const activeAudio = JSON.parse(fs.readFileSync(path.join(candidateDataRoot, "home_school_audio_manifest.json"), "utf8"));
const contextManifest = JSON.parse(fs.readFileSync(path.join(candidateDataRoot, "home_school_context_manifest.json"), "utf8"));

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function detectedSilences(filePath) {
  const result = spawnSync(ffmpeg, [
    "-hide_banner", "-nostats", "-i", filePath,
    "-af", "silencedetect=noise=-38dB:d=0.025",
    "-f", "null", "-",
  ], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, `${ffmpeg} failed for ${filePath}: ${result.stderr || result.stdout}`);
  const silences = [];
  let pendingStart = null;
  const pattern = /silence_start:\s*([0-9.]+)|silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/g;
  for (const match of result.stderr.matchAll(pattern)) {
    if (match[1] != null) pendingStart = Number(match[1]);
    else if (pendingStart != null) {
      silences.push({ start: pendingStart, end: Number(match[2]), duration: Number(match[3]) });
      pendingStart = null;
    }
  }
  return silences;
}

function questionSpecs() {
  const specs = [];
  for (const [context, contextSpec] of Object.entries(contextManifest.contexts || {})) {
    for (const [event, eventSpec] of Object.entries(contextSpec.events || {})) {
      specs.push({ context, recipient: "KID", event, ...eventSpec });
    }
    for (const [recipient, events] of Object.entries(contextSpec.recipientEvents || {})) {
      for (const [event, eventSpec] of Object.entries(events || {})) {
        specs.push({ context, recipient, event, ...eventSpec });
      }
    }
  }
  return specs;
}

assert.equal(pauseManifest.clipCount, 24, "Historical pause receipt must retain all 24 source/derivative pairs");
assert.equal(pauseManifest.clips.length, 24);
assert.equal(pauseManifest.status, "inactive_historical");
assert.equal(pauseManifest.active, false);
assert.equal(activeAudio.recording.questionSettingPauseSeconds, undefined);
assert.equal(activeAudio.recording.questionSettingPauseClipCount, undefined);
assert.equal(activeAudio.recording.pauseEditedAudioRoot, undefined);
assert.equal(activeAudio.questionPauseManifest, undefined);
assert.equal(contextManifest.questionPauseManifest, undefined);
assert.equal(contextManifest.questionSettingPauseSeconds, undefined);

const specs = questionSpecs();
const activeByText = new Map(activeAudio.lines.map((line) => [line.text, line]));
const historicalByText = new Map(pauseManifest.clips.map((clip) => [clip.text, clip]));
assert.equal(specs.length, 24);
assert.equal(new Set(specs.map((spec) => spec.questionText)).size, 24);
assert.deepEqual(
  Object.fromEntries(["HOME", "SCHOOL"].map((context) => [context, specs.filter((spec) => spec.context === context).length])),
  { HOME: 12, SCHOOL: 12 },
);
assert.deepEqual(
  Object.fromEntries(["KID", "MOM", "DAD", "TEACHER"].map((recipient) => [recipient, specs.filter((spec) => spec.recipient === recipient).length])),
  { KID: 6, MOM: 6, DAD: 6, TEACHER: 6 },
);

for (const spec of specs) {
  assert.match(spec.questionText, /, at the kid's (?:home|school)\?$/);
  const clip = historicalByText.get(spec.questionText);
  const active = activeByText.get(spec.questionText);
  assert.ok(clip, `Missing historical pause record for ${spec.questionText}`);
  assert.ok(active, `Missing active audio record for ${spec.questionText}`);
  assert.equal(spec.questionAudio, clip.source, `${clip.id} context must use the untouched NaturalReaders source`);
  assert.equal(active.output, clip.source, `${clip.id} active audio must use the untouched NaturalReaders source`);
  assert.equal(active.bytes, clip.sourceBytes);
  assert.equal(active.durationSeconds, clip.sourceDurationSeconds);
  assert.equal(active.sha256, clip.sourceSha256);
  assert.equal(active.audioEdit, undefined);
  assert.equal(active.sourceOutput, undefined);
  assert.ok(!active.output.startsWith(`${derivedRoot}/`));

  const sourceBytes = fs.readFileSync(path.join(root, clip.source));
  assert.equal(sourceBytes.length, clip.sourceBytes);
  assert.equal(sha256(sourceBytes), clip.sourceSha256);
  const sourceSilences = detectedSilences(path.join(root, clip.source));
  assert.equal(
    sourceSilences.filter((silence) =>
      silence.start > 0.3
      && silence.end < clip.sourceDurationSeconds - 0.3
      && silence.duration >= 0.40
    ).length,
    0,
    `${clip.id} source must not contain an artificial pause of 400 ms or longer`,
  );
  const reviewedBoundary = sourceSilences.find((silence) =>
    Math.abs(silence.start - clip.boundary.silenceStartSeconds) <= 0.002
    && Math.abs(silence.end - clip.boundary.silenceEndSeconds) <= 0.002
  );
  assert.ok(reviewedBoundary, `${clip.id} natural comma boundary must match the reviewed source boundary`);
  assert.ok(reviewedBoundary.duration >= 0.05 && reviewedBoundary.duration <= 0.08);

  const derivativeBytes = fs.readFileSync(path.join(root, clip.output));
  assert.equal(derivativeBytes.length, clip.bytes, `${clip.id} rollback derivative byte count drifted`);
  assert.equal(sha256(derivativeBytes), clip.sha256, `${clip.id} rollback derivative hash drifted`);
}

const activeSerialized = JSON.stringify({ activeAudio, contextManifest });
assert.doesNotMatch(activeSerialized, /setting_pause_450ms/);
assert.doesNotMatch(activeSerialized, /insert_silence_before_terminal_setting_phrase/);

const nonQuestionLines = activeAudio.lines.filter((line) => !/, at the kid's (?:home|school)\?$/.test(line.text));
assert.equal(nonQuestionLines.length, 20);
for (const line of nonQuestionLines) {
  const bytes = fs.readFileSync(path.join(root, line.output));
  assert.equal(bytes.length, line.bytes, `Non-question byte count drifted: ${line.output}`);
  assert.equal(sha256(bytes), line.sha256, `Non-question hash drifted: ${line.output}`);
}

console.log("PASS: 24 Home/School questions use untouched NaturalReaders comma timing");
console.log("- Twelve Home and twelve School questions cover Kid, Mom, Dad, and Teacher recipients.");
console.log("- Independent decoding found the reviewed 50–80 ms comma boundary and no >=400 ms pause in every active source.");
console.log("- All 24 former derivatives remain hash-verified as inactive rollback evidence; all 20 non-question clips remain unchanged.");
