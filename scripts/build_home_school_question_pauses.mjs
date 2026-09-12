import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidateRoot = path.join(projectRoot, "versions", "chs-home-school-evelyn-v1");
const candidateDataRoot = path.join(candidateRoot, "data");
const audioManifestPath = path.join(candidateDataRoot, "home_school_audio_manifest.json");
const contextManifestPath = path.join(candidateDataRoot, "home_school_context_manifest.json");
const pauseManifestPath = path.join(candidateDataRoot, "home_school_question_pause_manifest.json");
const outputRoot = "assets/home_school/generated/audio/setting_pause_450ms";
const targetPauseSeconds = 0.45;
const ffmpeg = process.env.FTC_FFMPEG_PATH || "ffmpeg";
const ffprobe = process.env.FTC_FFPROBE_PATH || "ffprobe";

if (!process.argv.includes("--rebuild-rejected-450ms-derivatives")) {
  throw new Error(
    "This historical builder creates the rejected 450 ms question pauses and rewires the candidate. "
    + "The active study intentionally uses NaturalReaders' original comma timing. "
    + "Pass --rebuild-rejected-450ms-derivatives only for an explicit historical rollback."
  );
}

// These intervals were reviewed on the immutable NaturalReaders source clips.
// Each one is the low-energy word boundary immediately before the terminal
// setting phrase, "at the kid's home/school." The edit splits at the interval
// midpoint and inserts only the additional silence needed to make the complete
// boundary 450 ms, so no source samples are removed.
const editPlan = [
  ["hs_004", "assets/home_school/generated/audio/hs_004_home_hug_question.mp3", "badf0da6a58a0ef1ec6297a7de4aac86fffa135c07eb2bd6bd63ff553f20b053", 3.224470, 3.287170],
  ["hs_006", "assets/home_school/generated/audio/hs_006_school_hug_question.mp3", "6aed625ca52ddf2b3d3e0e75779764202013bb64a9e77a90d1cb53ce52e6834f", 3.201660, 3.262150],
  ["hs_008", "assets/home_school/generated/audio/hs_008_home_food_question.mp3", "e5fe7c383dca00829dd490b3784de25e938a0111c5401d25635365a527a66639", 3.700090, 3.775260],
  ["hs_010", "assets/home_school/generated/audio/hs_010_school_food_question.mp3", "5a319ee0a50c13a35e30e1d327183f2587ff9acc5b35227a9533a19ff85f5222", 3.694100, 3.764830],
  ["hs_012", "assets/home_school/generated/audio/hs_012_home_help_question.mp3", "567da3e0ebe2faba6fc598b3e4f3b56405c315f3762027b6048d94a5d8f04ac7", 3.162200, 3.222130],
  ["hs_014", "assets/home_school/generated/audio/hs_014_school_help_question.mp3", "4afff6f8a6607c54a21a6c56fd8cb1c4aea72ba4b2528e485cb9f209b7e5ba8b", 3.190000, 3.247870],
  ["hs_v2_015", "assets/home_school/generated/audio/hs_v2_015_home_mom_hug_question.mp3", "f093c190ce6b1fc891befd79256e8351f310f7e965346196723cbc5dab616161", 3.272040, 3.337170],
  ["hs_v2_017", "assets/home_school/generated/audio/hs_v2_017_home_mom_food_question.mp3", "ded738963c4d6ea0a7594225649e39604eb17f079335a421e69803ef9e726ee1", 3.687350, 3.764830],
  ["hs_v2_019", "assets/home_school/generated/audio/hs_v2_019_home_mom_help_question.mp3", "9c2ca35eb33d8edd2a2dc301ee88c3e4d466387f46a4c15e5b7bbb476a5e7b5a", 3.189120, 3.247850],
  ["hs_v2_020", "assets/home_school/generated/audio/hs_v2_020_home_dad_hug_question.mp3", "8cc21621eb2a5ba0ea2f8929f3425081aaaaafe5b350b44c4e368e28652ea8df", 3.221930, 3.287170],
  ["hs_v2_022", "assets/home_school/generated/audio/hs_v2_022_home_dad_food_question.mp3", "5bfbcd7c6bb3f1a7b6bc67bd5b99fa8a3222e2fe59e212acb13f671dc6d4f4b7", 3.687320, 3.764830],
  ["hs_v2_024", "assets/home_school/generated/audio/hs_v2_024_home_dad_help_question.mp3", "f5fb5c8dc0711f35c875557c6c16045ac1f203da2b9e636120832abc65a17cbe", 3.188910, 3.247870],
  ["hs_v2_025", "assets/home_school/generated/audio/hs_v2_025_home_teacher_hug_question.mp3", "0cd8cddcd6f80ef9218191ce296eaf83d898e6459d4c4e70252b06bbcb989999", 3.349820, 3.412150],
  ["hs_v2_027", "assets/home_school/generated/audio/hs_v2_027_home_teacher_food_question.mp3", "92aed9f430e01ccc1b92ff016ca575b62f016731ec5625ac99b2c91b0c0ac2f3", 3.719230, 3.788050],
  ["hs_v2_029", "assets/home_school/generated/audio/hs_v2_029_home_teacher_help_question.mp3", "d1d30f5c294b5ef62722070beddaeb29d3600a279cd6b4490eec449c014e51ea", 3.249730, 3.310360],
  ["hs_v2_030", "assets/home_school/generated/audio/hs_v2_030_school_mom_hug_question.mp3", "9966b18d150f64b6288e6095c950a2ff19285e24b5c123d79d3fe373fe148446", 3.237690, 3.299660],
  ["hs_v2_032", "assets/home_school/generated/audio/hs_v2_032_school_mom_food_question.mp3", "001c436a00dd529166e8ed44fb3f7107c99816435cfd72db0c0960f2d6f64399", 3.674970, 3.749980],
  ["hs_v2_034", "assets/home_school/generated/audio/hs_v2_034_school_mom_help_question.mp3", "3a2e6a93623a8bf5e60867481a6546426ef3b3d2ee0ce5fa4a56511e70c28247", 3.200180, 3.260360],
  ["hs_v2_035", "assets/home_school/generated/audio/hs_v2_035_school_dad_hug_question.mp3", "25d8448e6dd0d117af215d59e478e45322073fa461117cfbf3d68792051fcc61", 3.222150, 3.287170],
  ["hs_v2_037", "assets/home_school/generated/audio/hs_v2_037_school_dad_food_question.mp3", "cb87bb9f86f9ce0c80172944dd69480f28a688d4b6ed47ae1187fb6f2c6c15e8", 3.650250, 3.725260],
  ["hs_v2_039", "assets/home_school/generated/audio/hs_v2_039_school_dad_help_question.mp3", "6a1b82121ea3408f8ad63b2bdeb6661bf82f3bc958236970d15591453a767183", 3.200140, 3.260360],
  ["hs_v2_040", "assets/home_school/generated/audio/hs_v2_040_school_teacher_hug_question.mp3", "16cfdc8951044529ffcb0fa8d11e9bd01c1d26798f854735dbb0f65f79aeef40", 3.274630, 3.337170],
  ["hs_v2_042", "assets/home_school/generated/audio/hs_v2_042_school_teacher_food_question.mp3", "4c9a2b6dbcdd7c0940d2b219e04efab86ec7c9d2421339296861c1bc7e8ca665", 3.720880, 3.788070],
  ["hs_v2_044", "assets/home_school/generated/audio/hs_v2_044_school_teacher_help_question.mp3", "ba1fe79b7d8b03b8018bf93ae2b510514807e90cd13075a2b80ebbeced68323f", 3.262720, 3.324970],
].map(([id, source, sourceSha256, silenceStartSeconds, silenceEndSeconds]) => ({
  id,
  source,
  sourceSha256,
  silenceStartSeconds,
  silenceEndSeconds,
  output: `${outputRoot}/${path.basename(source)}`,
}));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${String(result.stderr || result.stdout || "unknown error")}`);
  }
  return result;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function rounded(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}

function labelsForEdit(edit) {
  const filename = path.basename(edit.source);
  const context = filename.includes("_school_") ? "SCHOOL" : "HOME";
  const recipient = filename.match(/_(mom|dad|teacher)_/)?.[1]?.toUpperCase() || "KID";
  const event = filename.match(/_(hug|food|help)_/)?.[1]?.toUpperCase() || "";
  if (!event) throw new Error(`${edit.id}: could not derive its event label from ${filename}.`);
  return { context, recipient, event };
}

async function readJson(filename) {
  return JSON.parse(await fs.readFile(filename, "utf8"));
}

function probe(filename) {
  const result = run(ffprobe, [
    "-v", "error",
    "-select_streams", "a:0",
    "-show_entries", "stream=codec_name,bit_rate,sample_rate,channels",
    "-show_entries", "format=duration,size",
    "-of", "json",
    filename,
  ]);
  const parsed = JSON.parse(result.stdout);
  const stream = parsed.streams?.[0] || {};
  return {
    codec: stream.codec_name || "",
    bitrate: Number(stream.bit_rate || 0),
    sampleRate: Number(stream.sample_rate || 0),
    channels: Number(stream.channels || 0),
    durationSeconds: Number(parsed.format?.duration || 0),
    bytes: Number(parsed.format?.size || 0),
  };
}

function detectSilences(filename) {
  const result = run(ffmpeg, [
    "-nostdin", "-hide_banner", "-nostats",
    "-i", filename,
    "-af", "silencedetect=n=-38dB:d=0.40",
    "-f", "null", "-",
  ]);
  const silences = [];
  let pendingStart = null;
  for (const line of String(result.stderr || "").split(/\r?\n/)) {
    const start = line.match(/silence_start:\s*([0-9.]+)/);
    if (start) pendingStart = Number(start[1]);
    const end = line.match(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/);
    if (end && pendingStart != null) {
      silences.push({
        startSeconds: pendingStart,
        endSeconds: Number(end[1]),
        durationSeconds: Number(end[2]),
      });
      pendingStart = null;
    }
  }
  return silences;
}

function assertAudioSpec(metadata, label) {
  if (
    metadata.codec !== "mp3"
    || metadata.bitrate !== 320000
    || metadata.sampleRate !== 44100
    || metadata.channels !== 1
  ) {
    throw new Error(`${label} is not a 44.1 kHz mono 320 kbps MP3: ${JSON.stringify(metadata)}`);
  }
}

async function atomicWriteJson(filename, value) {
  const temporaryPath = `${filename}.building-${process.pid}`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(temporaryPath, filename);
}

function findManifestLine(audioManifest, edit) {
  const matches = (audioManifest.lines || []).filter((line) =>
    line.output === edit.source
    || line.output === edit.output
    || line.sourceOutput === edit.source
    || line.id === edit.id
  );
  if (matches.length !== 1) {
    throw new Error(`${edit.id}: expected one candidate audio-manifest line; found ${matches.length}.`);
  }
  return matches[0];
}

function updateContextMappings(contextManifest, outputBySource) {
  let mappingCount = 0;
  for (const context of Object.values(contextManifest.contexts || {})) {
    const eventGroups = [context.events, ...Object.values(context.recipientEvents || {})];
    for (const eventGroup of eventGroups) {
      for (const event of Object.values(eventGroup || {})) {
        for (const [source, output] of outputBySource) {
          if (event.questionAudio === source || event.questionAudio === output) {
            event.questionAudio = output;
            mappingCount += 1;
            break;
          }
        }
      }
    }
  }
  if (mappingCount !== editPlan.length) {
    throw new Error(`Expected to update ${editPlan.length} context question mappings; updated ${mappingCount}.`);
  }
  return mappingCount;
}

const ffmpegVersion = run(ffmpeg, ["-version"]).stdout.split(/\r?\n/)[0].trim();
const ffprobeVersion = run(ffprobe, ["-version"]).stdout.split(/\r?\n/)[0].trim();
const audioManifest = await readJson(audioManifestPath);
const contextManifest = await readJson(contextManifestPath);
const temporaryOutputs = [];
const completed = [];

try {
  for (const edit of editPlan) {
    const sourcePath = path.join(projectRoot, edit.source);
    const outputPath = path.join(projectRoot, edit.output);
    const sourceBytes = await fs.readFile(sourcePath);
    const actualSourceSha256 = sha256(sourceBytes);
    if (actualSourceSha256 !== edit.sourceSha256) {
      throw new Error(`${edit.id}: source hash changed; refusing to edit an unreviewed recording.`);
    }

    const sourceProbe = probe(sourcePath);
    assertAudioSpec(sourceProbe, `${edit.id} source`);
    const originalPauseSeconds = edit.silenceEndSeconds - edit.silenceStartSeconds;
    const splitSeconds = (edit.silenceStartSeconds + edit.silenceEndSeconds) / 2;
    const insertedSilenceSeconds = targetPauseSeconds - originalPauseSeconds;
    if (insertedSilenceSeconds <= 0) {
      throw new Error(`${edit.id}: reviewed source pause is already at least ${targetPauseSeconds}s.`);
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const temporaryPath = path.join(
      path.dirname(outputPath),
      `.${path.basename(outputPath, ".mp3")}.building-${process.pid}.mp3`,
    );
    temporaryOutputs.push(temporaryPath);

    const split = splitSeconds.toFixed(6);
    const addition = insertedSilenceSeconds.toFixed(6);
    const filter = [
      `[0:a]atrim=end=${split},asetpts=PTS-STARTPTS[pre]`,
      `anullsrc=r=44100:cl=mono,atrim=start=0:end=${addition},asetpts=PTS-STARTPTS[sil]`,
      `[0:a]atrim=start=${split},asetpts=PTS-STARTPTS[post]`,
      "[pre][sil][post]concat=n=3:v=0:a=1,aresample=44100[out]",
    ].join(";");
    run(ffmpeg, [
      "-nostdin", "-v", "error", "-y",
      "-i", sourcePath,
      "-filter_complex", filter,
      "-map", "[out]",
      "-map_metadata", "-1",
      "-c:a", "libmp3lame",
      "-b:a", "320k",
      "-ar", "44100",
      "-ac", "1",
      temporaryPath,
    ]);

    const outputProbe = probe(temporaryPath);
    assertAudioSpec(outputProbe, `${edit.id} output`);
    const expectedDurationSeconds = sourceProbe.durationSeconds + insertedSilenceSeconds;
    // MP3 frame quantization plus encoder delay/padding can add a little over
    // one 26.1 ms MPEG frame to ffprobe's container duration.
    if (Math.abs(outputProbe.durationSeconds - expectedDurationSeconds) > 0.06) {
      throw new Error(
        `${edit.id}: output duration ${outputProbe.durationSeconds}s is not close to expected ${expectedDurationSeconds}s.`,
      );
    }
    const silences = detectSilences(temporaryPath);
    const measuredPause = silences.find((silence) =>
      silence.durationSeconds >= 0.44
      && silence.durationSeconds <= 0.46
      && Math.abs(silence.startSeconds - edit.silenceStartSeconds) <= 0.08
    );
    if (!measuredPause) {
      throw new Error(`${edit.id}: no verified 440–460 ms internal setting-phrase pause was found.`);
    }

    const outputBytes = await fs.readFile(temporaryPath);
    const outputSha256 = sha256(outputBytes);
    if (outputSha256 === actualSourceSha256) {
      throw new Error(`${edit.id}: derived output unexpectedly matches its source hash.`);
    }

    const manifestLine = findManifestLine(audioManifest, edit);
    if (!/, at the kid's (home|school)\?$/.test(manifestLine.text || "")) {
      throw new Error(`${edit.id}: candidate question text lacks the expected comma before the setting phrase.`);
    }

    completed.push({
      id: edit.id,
      text: manifestLine.text,
      ...labelsForEdit(edit),
      kind: "question",
      source: edit.source,
      sourceBytes: sourceBytes.length,
      sourceDurationSeconds: rounded(sourceProbe.durationSeconds),
      sourceSha256: actualSourceSha256,
      boundary: {
        silenceStartSeconds: rounded(edit.silenceStartSeconds),
        silenceEndSeconds: rounded(edit.silenceEndSeconds),
        originalPauseSeconds: rounded(originalPauseSeconds),
        splitSeconds: rounded(splitSeconds),
        insertedSilenceSeconds: rounded(insertedSilenceSeconds),
        targetPauseSeconds,
      },
      output: edit.output,
      bytes: outputBytes.length,
      durationSeconds: rounded(outputProbe.durationSeconds),
      sha256: outputSha256,
      measuredPause: {
        startSeconds: rounded(measuredPause.startSeconds),
        endSeconds: rounded(measuredPause.endSeconds),
        durationSeconds: rounded(measuredPause.durationSeconds),
      },
      validation: {
        sourceHashVerified: true,
        outputAudioSpecVerified: true,
        durationDeltaVerified: true,
        pauseDurationVerified: true,
      },
      temporaryPath,
      outputPath,
    });
  }

  for (const clip of completed) {
    await fs.rename(clip.temporaryPath, clip.outputPath);
  }

  const outputBySource = new Map(editPlan.map((edit) => [edit.source, edit.output]));
  for (const clip of completed) {
    const edit = editPlan.find((candidate) => candidate.id === clip.id);
    const line = findManifestLine(audioManifest, edit);
    line.sourceOutput = edit.source;
    line.sourceBytes = clip.sourceBytes;
    line.sourceDurationSeconds = clip.sourceDurationSeconds;
    line.sourceSha256 = clip.sourceSha256;
    line.output = clip.output;
    line.bytes = clip.bytes;
    line.durationSeconds = clip.durationSeconds;
    line.sha256 = clip.sha256;
    line.audioEdit = {
      type: "insert_silence_before_terminal_setting_phrase",
      targetPauseSeconds,
      manifest: "data/home_school_question_pause_manifest.json",
    };
  }
  audioManifest.recording.questionSettingPauseSeconds = targetPauseSeconds;
  audioManifest.recording.questionSettingPauseClipCount = completed.length;
  audioManifest.recording.pauseEditedAudioRoot = outputRoot;
  audioManifest.questionPauseManifest = "data/home_school_question_pause_manifest.json";

  const contextMappingCount = updateContextMappings(contextManifest, outputBySource);
  contextManifest.questionPauseManifest = "data/home_school_question_pause_manifest.json";
  contextManifest.questionSettingPauseSeconds = targetPauseSeconds;

  const pauseManifest = {
    schemaVersion: 1,
    candidateId: "chs-home-school-evelyn-v1",
    status: "complete",
    generatedOn: new Date().toISOString(),
    targetPauseSeconds,
    sourceAudioRoot: "assets/home_school/generated/audio",
    outputAudioRoot: outputRoot,
    processor: {
      script: "scripts/build_home_school_question_pauses.mjs",
      ffmpegVersion,
      ffprobeVersion,
      outputCodec: "MP3, 44.1 kHz, mono, 320 kbps CBR",
    },
    method: {
      description: "Split each source inside its reviewed low-energy boundary and insert only enough digital silence to make that complete boundary 450 ms. No source samples are removed.",
      sourceSilenceDetection: "Reviewed with ffmpeg silencedetect=n=-38dB:d=0.025.",
      outputSilenceValidation: "Verified with ffmpeg silencedetect=n=-38dB:d=0.40; accepted range 0.44–0.46 seconds.",
      scope: "The 24 question clips whose terminal setting phrase is 'at the kid's home/school.' Event and context-introduction clips are unchanged.",
    },
    clipCount: completed.length,
    validation: {
      sourceHashesVerified: true,
      outputAudioSpecsVerified: true,
      durationDeltasVerified: true,
      pauseDurationsVerified: true,
      contextQuestionMappingCount: contextMappingCount,
      originalSourcesPreserved: true,
      historicalDirectionalImportReceiptPreserved: true,
    },
    clips: completed.map(({ temporaryPath, outputPath, ...clip }) => clip),
  };

  await atomicWriteJson(audioManifestPath, audioManifest);
  await atomicWriteJson(contextManifestPath, contextManifest);
  await atomicWriteJson(pauseManifestPath, pauseManifest);
} finally {
  await Promise.all(temporaryOutputs.map((filename) => fs.unlink(filename).catch(() => {})));
}

console.log(`Built and verified ${completed.length} candidate-specific question clips.`);
console.log(`Each edited boundary now contains ${targetPauseSeconds.toFixed(3)} seconds of silence.`);
console.log(`Updated ${path.relative(projectRoot, audioManifestPath)}.`);
console.log(`Updated ${path.relative(projectRoot, contextManifestPath)}.`);
console.log(`Wrote ${path.relative(projectRoot, pauseManifestPath)}.`);
