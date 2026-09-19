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
const contextFirstReceipt = JSON.parse(fs.readFileSync(path.join(candidateDataRoot, "context_first_question_audio_import_receipt.json"), "utf8"));
const entranceReceipt = JSON.parse(fs.readFileSync(path.join(candidateDataRoot, "entrance_house_audio_import_receipt.json"), "utf8"));
const r26Receipt = JSON.parse(fs.readFileSync(path.join(candidateDataRoot, "question_audio_revision_r26.json"), "utf8"));
const r26ByOutput = new Map(r26Receipt.files.map(clip => [clip.output, clip]));
assert.equal(r26ByOutput.size, 2);

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
const contextFirstByOutput = new Map(contextFirstReceipt.clips.map((clip) => [clip.output, clip]));
const entranceByOutput = new Map(entranceReceipt.clips.map((clip) => [clip.output, clip]));
assert.equal(specs.length, 24);
assert.equal(contextFirstReceipt.clipCount, 24);
assert.equal(contextFirstReceipt.clips.length, 24);
assert.equal(new Set(specs.map((spec) => spec.questionText)).size, 24);
assert.deepEqual(
  Object.fromEntries(["HOME", "SCHOOL"].map((context) => [context, specs.filter((spec) => spec.context === context).length])),
  { HOME: 12, SCHOOL: 12 },
);
assert.deepEqual(
  Object.fromEntries(["KID", "MOM", "DAD", "TEACHER"].map((recipient) => [recipient, specs.filter((spec) => spec.recipient === recipient).length])),
  { KID: 6, MOM: 6, DAD: 6, TEACHER: 6 },
);

// Keep both the untouched context-last source recordings and the inactive
// 450 ms derivatives verifiable as rollback evidence. Neither is active in r17.
for (const clip of pauseManifest.clips) {
  const sourceBytes = fs.readFileSync(path.join(root, clip.source));
  assert.equal(sourceBytes.length, clip.sourceBytes);
  assert.equal(sha256(sourceBytes), clip.sourceSha256);
  const sourceSilences = detectedSilences(path.join(root, clip.source));
  const reviewedBoundary = sourceSilences.find((silence) =>
    Math.abs(silence.start - clip.boundary.silenceStartSeconds) <= 0.002
    && Math.abs(silence.end - clip.boundary.silenceEndSeconds) <= 0.002
  );
  assert.ok(reviewedBoundary, `${clip.id} historical comma boundary must still match its receipt`);

  const derivativeBytes = fs.readFileSync(path.join(root, clip.output));
  assert.equal(derivativeBytes.length, clip.bytes, `${clip.id} rollback derivative byte count drifted`);
  assert.equal(sha256(derivativeBytes), clip.sha256, `${clip.id} rollback derivative hash drifted`);
}

// The complete r15 export stays verifiable, including the twelve Home questions
// superseded by r17 House wording.
for (const clip of contextFirstReceipt.clips) {
  const bytes = fs.readFileSync(path.join(root, clip.output));
  assert.equal(bytes.length, clip.bytes, `r15 source byte count drifted: ${clip.output}`);
  assert.equal(sha256(bytes), clip.sha256, `r15 source hash drifted: ${clip.output}`);
}

for (const spec of specs) {
  const place = spec.context === "HOME" ? "house" : "school";
  assert.match(spec.questionText, new RegExp(`^At the kid's ${place}, who will `));
  const active = activeByText.get(spec.questionText);
  assert.ok(active, `Missing active audio record for ${spec.questionText}`);
  const clip = spec.context === "HOME" ? entranceByOutput.get(active.output) : (r26ByOutput.get(active.output) || contextFirstByOutput.get(active.output));
  assert.ok(clip, `Missing current context-first receipt record for ${spec.questionText}`);
  assert.equal(clip.text, spec.questionText);
  assert.equal(spec.questionAudio, clip.output);
  assert.equal(active.output, clip.output);
  assert.equal(active.bytes, clip.bytes);
  assert.equal(active.durationSeconds, clip.durationSeconds);
  assert.equal(active.sha256, clip.sha256);
  if (spec.context === "HOME") {
    assert.equal(active.revision, "r17-entrance-house");
    const original = contextFirstByOutput.get(clip.replaces?.output);
    assert.ok(original, `Missing r15 provenance for ${clip.output}`);
    assert.equal(clip.replaces.sha256, original.sha256);
    assert.equal(clip.text, original.text.replace(/home/g, "house"));
  } else {
    assert.equal(active.questionRevision, r26ByOutput.has(active.output) ? "r26-clear-at-school-kid-questions" : "r15-context-first");
    if (r26ByOutput.has(active.output)) {
      const previous = contextFirstByOutput.get(clip.replaces.output);
      assert.equal(previous.sha256, clip.replaces.sha256);
      assert.equal(previous.text, clip.text);
      assert.equal(spec.recipient, "KID");
      assert.ok(["HUG", "HELP"].includes(spec.event));
    }
  }
  assert.equal(active.audioEdit, undefined);
  assert.equal(active.sourceOutput, undefined);
  assert.ok(!active.output.startsWith(`${derivedRoot}/`));

  const sourceBytes = fs.readFileSync(path.join(root, clip.output));
  assert.equal(sourceBytes.length, clip.bytes);
  assert.equal(sha256(sourceBytes), clip.sha256);
  const sourceSilences = detectedSilences(path.join(root, clip.output));
  assert.equal(
    sourceSilences.filter((silence) =>
      silence.start > 0.3
      && silence.end < clip.durationSeconds - 0.3
      && silence.duration >= 0.40
    ).length,
    0,
    `${clip.output} must not contain an artificial pause of 400 ms or longer`,
  );
  // Raw r17 Evelyn recordings pronounce "house" with a shorter natural break:
  // kid/dad HUG boundaries measure 43.5/44.1 ms. Preserve that source timing.
  const minimumContextPause = spec.context === "HOME" ? 0.04 : 0.05;
  const naturalContextBoundary = sourceSilences.find((silence) =>
    silence.start >= 0.8
    && silence.start <= 1.75
    && silence.duration >= minimumContextPause
    && silence.duration <= 0.30
  );
  assert.ok(naturalContextBoundary, `${clip.output} must retain a short natural boundary after the opening context`);
}

const activeSerialized = JSON.stringify({ activeAudio, contextManifest });
assert.doesNotMatch(activeSerialized, /setting_pause_450ms/);
assert.doesNotMatch(activeSerialized, /insert_silence_before_terminal_setting_phrase/);

const questionOutputs = new Set(specs.map((spec) => spec.questionAudio));
const nonQuestionLines = activeAudio.lines.filter((line) => !questionOutputs.has(line.output));
assert.equal(nonQuestionLines.length, 24);
for (const line of nonQuestionLines) {
  const bytes = fs.readFileSync(path.join(root, line.output));
  assert.equal(bytes.length, line.bytes, `Non-question byte count drifted: ${line.output}`);
  assert.equal(sha256(bytes), line.sha256, `Non-question hash drifted: ${line.output}`);
}

console.log("PASS: 24 House/School questions use context-first NaturalReaders comma timing");
console.log("- Twelve r17 House, ten retained r15 School and two r26 School/Kid questions cover retained and active recipients.");
console.log("- Independent decoding found a short natural opening-context boundary and no >=400 ms pause in every active recording.");
console.log("- All 24 former derivatives and all 24 r15 sources remain hash-verified as historical evidence; all 24 current non-question clips match their manifest hashes.");
