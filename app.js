const params = new URLSearchParams(window.location.search);
const requestedVoiceProfile = params.get("voice") || "";
const DYAD_MANIFEST_URL = "data/dyad_manifest.json?v=two-part-pairs-1";
const EVENT_MANIFEST_URL = "data/ksize_manifest.json?v=two-part-pairs-1";
const INTRO_IMAGE_FIXES_URL = "data/intro_image_fixes.json?v=two-part-pairs-1";
const CANONICAL_AUDIO_MANIFEST_URL = "data/canonical_audio_manifest.json?v=preferred-v32";
const PREFERRED_AUDIO_DIR = requestedVoiceProfile === "relkind" ? "audio_relkind_voice" : "audio_preferred";
const AUDIO_VERSION = requestedVoiceProfile === "relkind" ? "relkind-stable-v47" : "parent-audio-v47";
const DATA_ENDPOINT_URL = "";
const AUTO_ADVANCE_PAUSE_MS = 1200;
const START_INTRO_TEXT = "Hi there! Welcome to Who Will Help? We are going to look at pictures and play a choosing game. Listen to each page. When you see choices, tap the one you pick. When you are ready, hit the green button to start.";
const START_INTRO_AUDIO = requestedVoiceProfile === "relkind"
  ? `${PREFERRED_AUDIO_DIR}/080_welcome_Hit_green_button_to_start.mp3`
  : "audio/welcome_with_start_cue_original_voice.mp3";
const GAME_START_TEXT = "Let’s play. Listen to the story, then answer the questions. Hit the green button to start.";
const GAME_START_AUDIO = requestedVoiceProfile === "relkind"
  ? `${PREFERRED_AUDIO_DIR}/081_game_start_Lets_play.mp3`
  : "audio/game_start_without_game_1.mp3";
const PARENT_WELCOME_AUDIO = `${PREFERRED_AUDIO_DIR}/077_parent_setup_Welcome_grownups.mp3`;
const PARENT_WELCOME_TEXT = "Welcome, grown-ups! Thank you for helping your child take part. First, we'll get the sound, screen, and camera ready. Then your child will listen to stories and tap their choices. You can help with the device, but please let your child choose the answers.";
const PARENT_QUICK_CHECKS_AUDIO = `${PREFERRED_AUDIO_DIR}/078_parent_setup_Three_quick_checks.mp3`;
const PARENT_QUICK_CHECKS_TEXT = "Before you begin: This is a recorded picture game about social relationships. It takes about ten to fifteen minutes. You and your child may stop at any time. There are no right or wrong answers in this game. Now, three quick checks. Use one screen and place it in front of your child. Turn the sound to a comfortable volume. Stay close to help with the device, but let your child choose the answers.";
const PARENT_CAMERA_AUDIO = `${PREFERRED_AUDIO_DIR}/079_parent_setup_Check_the_camera.mp3`;
const PARENT_CAMERA_TEXT = "Let's check the camera. Put the screen directly in front of your child. Keep their full face and shoulders in view, and avoid a bright window behind them. Use one screen, and keep the webcam centered above the screen your child is watching.";
const PARENT_HANDOFF_AUDIO = `${PREFERRED_AUDIO_DIR}/083_parent_handoff_Invite_your_child.mp3`;
const PARENT_HANDOFF_TEXT = "Grown-up setup is finished. Please invite your child to come sit in front of the screen now. Grown-ups, you may stay nearby to help with the device, but please let your child choose the answers. There are no right or wrong answers in this game. When your child is ready, press the green button to continue.";
const CHILD_ASSENT_AUDIO = `${PREFERRED_AUDIO_DIR}/084_child_assent_Would_you_like_to_play.mp3`;
const CHILD_ASSENT_TEXT = "Hi there! Do you want to play a fun game today? In my game, I'm going to show you some shapes and ask you some questions. You'll press buttons on the screen to tell me what you think. There are no right or wrong answers, so you can say whatever you think! We're just curious about how kids think. The camera will stay on while you play, and you can stop at any time. Are you ready to play my game?";
const CHILD_GET_GROWNUP_AUDIO = `${PREFERRED_AUDIO_DIR}/085_child_closeout_Get_your_grownup.mp3`;
const CHILD_GET_GROWNUP_TEXT = "Great job! You finished the game! Please go get your grown-up so they can finish the last few steps.";
const ENABLE_CHILD_ASSENT = false;
const COIN_PARTY_TEXT = "Hooray! You did it! You finished the game! Thanks so much for playing!";
const COIN_PARTY_AUDIO = `${PREFERRED_AUDIO_DIR}/074_ending_Hooray_you_did_it_finished_game_slower_v44.mp3`;
const ALL_DONE_TEXT = "Thank you for playing! We're all done!";
const ALL_DONE_AUDIO_SEQUENCE = [
  {
    src: `${PREFERRED_AUDIO_DIR}/075_ending_Thank_you_for_playing_fun_profile_v61.mp3`,
    text: "Thank you for playing!",
    volume: 0.8,
    playbackRate: 1,
    preservePitch: true,
  },
  {
    src: `${PREFERRED_AUDIO_DIR}/075_ending_Were_all_done_fun_profile_v59.mp3`,
    text: "We're all done!",
    volume: 0.8,
    playbackRate: 1,
    preservePitch: true,
  },
];
let REWARD_GOAL_COINS = 20;
const REWARD_VALUES = {
  next: 1,
  choice: 1,
  rating: 1,
};

const runtimeConfig = window.KSIZE_RUNTIME_CONFIG || {};
const assetBaseUrl = runtimeConfig.assetBaseUrl || window.KSIZE_ASSET_BASE_URL || "";

function assetUrl(path) {
  if (!path || /^(https?:|data:|blob:)/.test(path)) return path;
  if (!assetBaseUrl) return path;
  return new URL(path, assetBaseUrl).toString();
}

function configValue(...keys) {
  for (const key of keys) {
    const value = params.get(key);
    if (value != null && value !== "") return value;
    if (runtimeConfig[key] != null && runtimeConfig[key] !== "") return String(runtimeConfig[key]);
  }
  return "";
}

const requestedParticipantId = configValue("pid", "participant", "session", "PROLIFIC_PID");
const requestedSeed = configValue("seed") || requestedParticipantId || String(Date.now());
const requestedRoleSet = configValue("roleSet", "role");
const requestedSet = configValue("set") || "role";
const requestedColor = configValue("color").toLowerCase();
const requestedVariant = configValue("variant").toLowerCase();
const requestedEvent = configValue("event").toUpperCase();
const requestedPartOrder = configValue("partOrder", "order");
const requestedRatingMode = configValue("ratingMode") || "one-after-story";
const requestedPreviewIndex = Math.max(0, Number(configValue("previewIndex") || 0) || 0);
const requestedResearcherTools = configValue("researcherTools", "researcher", "debug");
const isLocalResearchPreview = window.location.protocol === "file:"
  || ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
const showResearcherTools = requestedResearcherTools
  ? requestedResearcherTools === "1"
  : isLocalResearchPreview;
const requestedRewardCoins = Math.max(0, Number(configValue("rewardCoins")) || 0);
const requestedDataEndpoint = configValue("dataEndpoint") || DATA_ENDPOINT_URL;
const shouldDownloadData = configValue("downloadData") === "1";
const useSyntheticSpeech = configValue("syntheticSpeech") !== "0";
const requestedChsChild = configValue("child", "CHILD_ID");
const requestedChsResponse = configValue("response", "response_uuid", "CHS_RESPONSE_ID");
const currentSessionId = configValue("session_id", "SESSION_ID")
  || requestedChsResponse
  || `${Date.now()}-${hashSeed(`${requestedSeed}:session`).toString(16)}`;

const CORE_CONDITIONS = [
  "MOM-TEACHER",
  "SISTER-FRIEND",
  "BESTFRIEND-FRIEND",
  "TEACHER-FRIEND",
  "MOM-SISTER",
];

const MAN_ROLE_CONDITIONS = [
  "DAD-TEACHER",
  "BROTHER-FRIEND",
  "BESTFRIEND-FRIEND",
  "TEACHER-FRIEND",
  "DAD-BROTHER",
];

const FAMILY_ROLE_CONDITIONS = [
  "MOM-DAD",
  "SISTER-BROTHER",
  "DAD-KID",
  "MOM-KID",
  "TEACHER-KID",
];

const EVENT_SUFFIXES = ["HUG", "FOOD", "HELP"];
const PART_EVENT = "event";
const PART_DYAD = "dyad";
const PART_INTERLEAVED = "interleaved";
const DYAD_PAIR_FOLDERS = [
  "mom-kid",
  "dad-kid",
  "teacher-kid",
  "sister-kid",
  "brother-kid",
  "friend-kid",
  "best friend-kid",
  "kid-mom",
  "kid-dad",
  "kid-teacher",
  "dad-mom",
  "mom-dad",
  "teacher-teacher",
];

const CONDITION_DYAD_FOLDERS = {
  "MOM-SISTER": [{ folder: "mom-kid", sourceKey: "MKS" }, { folder: "sister-kid", sourceKey: "MKS" }],
  "DAD-KID": [{ folder: "dad-mom", sourceKey: "DMK" }, { folder: "kid-mom", sourceKey: "DMK" }],
  "DAD-BROTHER": [{ folder: "dad-kid", sourceKey: "DKB" }, { folder: "brother-kid", sourceKey: "DKB" }],
  "TEACHER-FRIEND": [{ folder: "teacher-kid", sourceKey: "TKF" }, { folder: "friend-kid", sourceKey: "TKF" }],
  "TEACHER-KID": [{ folder: "teacher-teacher", sourceKey: "TTK" }, { folder: "kid-teacher", sourceKey: "TTK" }],
  "MOM-KID": [{ folder: "mom-dad", sourceKey: "MDK" }, { folder: "kid-dad", sourceKey: "MDK" }],
  "MOM-DAD": [{ folder: "mom-kid", sourceKey: "MKD" }, { folder: "dad-kid", sourceKey: "MKD" }],
  "MOM-TEACHER": [{ folder: "mom-kid", sourceKey: "MKT" }, { folder: "teacher-kid", sourceKey: "MKT" }],
  "DAD-TEACHER": [{ folder: "dad-kid", sourceKey: "DKT" }, { folder: "teacher-kid", sourceKey: "DKT" }],
  "SISTER-FRIEND": [{ folder: "sister-kid", sourceKey: "SKF" }, { folder: "friend-kid", sourceKey: "SKF" }],
  "BROTHER-FRIEND": [{ folder: "brother-kid", sourceKey: "BKF" }, { folder: "friend-kid", sourceKey: "BKF" }],
  "SISTER-BROTHER": [{ folder: "sister-kid", sourceKey: "SKB" }, { folder: "brother-kid", sourceKey: "SKB" }],
  "BESTFRIEND-FRIEND": [{ folder: "best friend-kid", sourceKey: "BFKF" }, { folder: "friend-kid", sourceKey: "BFKF" }],
};

const ONE_PAIR_SCRIPT_SCHEDULES = [
  {
    "MOM-TEACHER": "kid-TEACHER",
    "SISTER-FRIEND": "kid-SISTER",
    "TEACHER-FRIEND": "kid-FRIEND",
    "MOM-SISTER": "kid-MOM",
    "BESTFRIEND-FRIEND": "kid-BEST FRIEND",
    "DAD-TEACHER": "kid-TEACHER",
    "BROTHER-FRIEND": "kid-BROTHER",
    "DAD-BROTHER": "kid-DAD",
    "MOM-DAD": "kid-MOM",
    "SISTER-BROTHER": "kid-SISTER",
    "DAD-KID": "mom-DAD",
    "MOM-KID": "dad-MOM",
    "TEACHER-KID": "teacher-TEACHER",
  },
  {
    "MOM-TEACHER": "kid-MOM",
    "SISTER-FRIEND": "kid-FRIEND",
    "TEACHER-FRIEND": "kid-TEACHER",
    "MOM-SISTER": "kid-SISTER",
    "BESTFRIEND-FRIEND": "kid-BEST FRIEND",
    "DAD-TEACHER": "kid-DAD",
    "BROTHER-FRIEND": "kid-FRIEND",
    "DAD-BROTHER": "kid-BROTHER",
    "MOM-DAD": "kid-DAD",
    "SISTER-BROTHER": "kid-BROTHER",
    "DAD-KID": "mom-KID",
    "MOM-KID": "dad-KID",
    "TEACHER-KID": "teacher-KID",
  },
];

const OPTION_LABELS = {
  love: ["Does not love", "Loves a little", "Loves a lot"],
  like: ["Does not like", "Likes a little", "Likes a lot"],
  charge: ["Not in charge", "A little in charge", "Very much in charge"],
  old: ["Not old", "A little old", "Very old"],
  strong: ["Not strong", "A little strong", "Very strong"],
};
const COIN_RAIN_HTML = Array.from({ length: 18 }, (_, index) =>
  `<span class="ksize-rain-coin ksize-rain-coin-${index + 1}">C</span>`
).join("");

let introImageFixes = {};
let currentPreviewIndex = 0;
let totalPreviewScreens = 0;
let currentSessionParams = {};
let canonicalAudioByText = new Map();
let canonicalAudioByOriginalSrc = new Map();
let rewardCoins = showResearcherTools ? requestedRewardCoins : 0;
let rewardMusicStopper = null;
let rewardMusicAudio = null;
let introMusicStopper = null;
let welcomeSequenceToken = 0;

function hashSeed(seedText) {
  let hash = 2166136261;
  for (const char of String(seedText)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRng(seedText) {
  let state = hashSeed(seedText) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function shuffle(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeAudioText(text) {
  return String(text || "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeAudioSrc(src) {
  return String(src || "").split("?")[0].replace(/^\.\//, "");
}

function preferredAudioPathFromOutput(output) {
  const filename = String(output || "").split("/").pop();
  return filename ? `${PREFERRED_AUDIO_DIR}/${filename}` : "";
}

function installCanonicalAudioMap(manifest) {
  canonicalAudioByText = new Map();
  canonicalAudioByOriginalSrc = new Map();
  for (const line of manifest?.lines || []) {
    const preferredPath = preferredAudioPathFromOutput(line.output);
    if (!preferredPath) continue;
    canonicalAudioByText.set(normalizeAudioText(line.text), preferredPath);
    for (const original of line.currentOutputs || []) {
      canonicalAudioByOriginalSrc.set(normalizeAudioSrc(original), preferredPath);
    }
  }
}

function canonicalAudioPathForText(text) {
  return canonicalAudioByText.get(normalizeAudioText(text)) || "";
}

function canonicalAudioPathForSrc(src) {
  return canonicalAudioByOriginalSrc.get(normalizeAudioSrc(src)) || "";
}

function rewardHudHtml() {
  return `
    <div class="ksize-coin-hud" aria-live="polite">
      <span class="ksize-coin-icon" aria-hidden="true">C</span>
      <span class="ksize-coin-count">${rewardCoins}</span>
      <span class="ksize-coin-goal">/ ${REWARD_GOAL_COINS}</span>
    </div>
  `;
}

function compactRewardHudHtml() {
  return `<div class="ksize-compact-coin-wrap">${rewardHudHtml()}</div>`;
}

function updateRewardHud() {
  document.querySelectorAll(".ksize-coin-count").forEach((node) => {
    node.textContent = String(rewardCoins);
  });
  document.querySelectorAll(".ksize-coin-goal").forEach((node) => {
    node.textContent = `/ ${REWARD_GOAL_COINS}`;
  });
  document.querySelectorAll(".ksize-reward-total").forEach((node) => {
    node.textContent = String(rewardCoins);
  });
}

function awardCoins(amount, label = "coin") {
  rewardCoins += amount;
  updateRewardHud();
  const pop = document.createElement("div");
  pop.className = "ksize-coin-pop";
  pop.innerHTML = `<span aria-hidden="true">C</span><strong>+${amount}</strong>`;
  document.body.appendChild(pop);
  window.setTimeout(() => pop.remove(), 1350);
  return {
    reward_coins_earned: amount,
    reward_coin_label: label,
    reward_coin_total: rewardCoins,
    reward_goal: REWARD_GOAL_COINS,
    reward_unlocked: rewardCoins >= REWARD_GOAL_COINS,
  };
}

function finishWithReward(jsPsych, data, amount, label) {
  document.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
  const rewardData = amount > 0 ? awardCoins(amount, label) : {
    reward_coins_earned: 0,
    reward_coin_label: label,
    reward_coin_total: rewardCoins,
    reward_goal: REWARD_GOAL_COINS,
    reward_unlocked: rewardCoins >= REWARD_GOAL_COINS,
  };
  window.setTimeout(() => {
    jsPsych.finishTrial({ ...data, ...rewardData });
  }, amount > 0 ? 220 : 0);
}

function stopRewardMusic() {
  if (rewardMusicAudio) {
    rewardMusicAudio.pause();
    rewardMusicAudio.currentTime = 0;
    rewardMusicAudio = null;
  }
  rewardMusicStopper?.();
  rewardMusicStopper = null;
}

function stopIntroMusic() {
  introMusicStopper?.();
  introMusicStopper = null;
  document.body.classList.remove("ksize-intro-music-playing");
}

function playIntroOpeningMusic() {
  stopIntroMusic();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  context.resume?.().catch(() => {});
  const master = context.createGain();
  master.gain.value = 0.28;
  master.connect(context.destination);
  document.body.classList.add("ksize-intro-music-playing");
  const startAt = context.currentTime + 0.05;
  const beat = 0.28;
  const melody = [
    [523.25, 0, 0.22], [659.25, 1, 0.22], [783.99, 2, 0.3],
    [659.25, 3.2, 0.18], [880, 4, 0.22], [987.77, 5, 0.22],
    [1046.5, 6, 0.38], [783.99, 7.5, 0.2], [987.77, 8.5, 0.22],
    [1174.66, 9.5, 0.22], [1318.51, 10.5, 0.55],
  ];
  const playTone = (frequency, offset, duration, type = "triangle", level = 0.1) => {
    const begins = startAt + offset * beat;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, begins);
    gain.gain.setValueAtTime(0.0001, begins);
    gain.gain.linearRampToValueAtTime(level, begins + 0.025);
    gain.gain.setValueAtTime(level * 0.7, begins + Math.max(0.05, duration - 0.06));
    gain.gain.exponentialRampToValueAtTime(0.0001, begins + duration);
    osc.connect(gain).connect(master);
    osc.start(begins);
    osc.stop(begins + duration + 0.03);
  };
  melody.forEach(([frequency, offset, duration]) => {
    playTone(frequency, offset, duration);
    playTone(frequency * 2, offset + 0.04, duration * 0.72, "sine", 0.025);
  });
  [
    [261.63, 0, 3.4], [349.23, 4, 2.7], [392, 7.5, 2.8], [523.25, 10.5, 1.6],
  ].forEach(([frequency, offset, duration]) => {
    [1, 1.25, 1.5].forEach((ratio) => playTone(frequency * ratio, offset, duration * beat, "sine", 0.018));
  });
  const closeTimer = window.setTimeout(() => {
    master.gain.setTargetAtTime(0.0001, context.currentTime, 0.18);
    window.setTimeout(() => context.close().catch(() => {}), 500);
    introMusicStopper = null;
    document.body.classList.remove("ksize-intro-music-playing");
  }, 3900);
  introMusicStopper = () => {
    window.clearTimeout(closeTimer);
    master.gain.setTargetAtTime(0.0001, context.currentTime, 0.06);
    window.setTimeout(() => context.close().catch(() => {}), 250);
  };
}

function playLoopingMusic(src, volume = 0.5) {
  stopRewardMusic();
  rewardMusicAudio = new Audio(versionedAudioSrc(src));
  rewardMusicAudio.loop = true;
  rewardMusicAudio.volume = volume;
  rewardMusicAudio.addEventListener("timeupdate", () => {
    if (!Number.isFinite(rewardMusicAudio.duration)) return;
    if (rewardMusicAudio.duration - rewardMusicAudio.currentTime < 0.08) {
      rewardMusicAudio.currentTime = 0.01;
      rewardMusicAudio.play().catch(() => {});
    }
  });
  rewardMusicAudio.play().catch(() => {});
}

function playCoinPartyMusic() {
  stopRewardMusic();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  context.resume?.().catch(() => {});
  const master = context.createGain();
  master.gain.value = 0.2;
  master.connect(context.destination);
  const delay = context.createDelay();
  const delayGain = context.createGain();
  delay.delayTime.value = 0.18;
  delayGain.gain.value = 0.1;
  delay.connect(delayGain).connect(master);
  const beat = 0.23;
  const melody = [
    [783.99, 0, 0.18],
    [987.77, 1, 0.18],
    [1174.66, 2, 0.22],
    [987.77, 3, 0.16],
    [1318.51, 4, 0.22],
    [1174.66, 5, 0.16],
    [987.77, 6, 0.18],
    [783.99, 7, 0.18],
    [880.0, 8, 0.18],
    [987.77, 9, 0.18],
    [1174.66, 10, 0.22],
    [1318.51, 11, 0.16],
    [1567.98, 12, 0.24],
    [1318.51, 13, 0.18],
    [1174.66, 14, 0.18],
    [987.77, 15, 0.28],
  ];
  const bass = [
    [261.63, 0],
    [261.63, 2],
    [349.23, 4],
    [349.23, 6],
    [392.0, 8],
    [392.0, 10],
    [523.25, 12],
    [523.25, 14],
  ];
  const chords = [
    [261.63, 329.63, 392.0],
    [349.23, 440.0, 523.25],
    [392.0, 493.88, 587.33],
    [523.25, 659.25, 783.99],
  ];

  const playTone = (frequency, start, duration, type = "triangle", gainLevel = 0.13, attack = 0.025) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainLevel, start + attack);
    gain.gain.setValueAtTime(gainLevel * 0.78, start + Math.max(attack + 0.02, duration - 0.05));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(master);
    if (frequency > 700) gain.connect(delay);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  };

  const playTick = (start, gainLevel = 0.035) => {
    const noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.035), context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 5200;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainLevel, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.04);
    noise.connect(filter).connect(gain).connect(master);
    noise.start(start);
    noise.stop(start + 0.05);
  };

  const scheduleLoop = () => {
    const now = context.currentTime + 0.04;
    melody.forEach(([frequency, step, duration]) => {
      const start = now + step * beat;
      playTone(frequency, start, duration, "triangle", 0.135, 0.022);
      playTone(frequency * 2, start + 0.012, duration * 0.72, "sine", 0.03, 0.018);
    });
    bass.forEach(([frequency, step]) => {
      playTone(frequency, now + step * beat, beat * 1.25, "square", 0.032, 0.018);
    });
    chords.forEach((frequencies, index) => {
      const start = now + index * beat * 4;
      frequencies.forEach((frequency) => playTone(frequency, start, beat * 3.6, "sine", 0.018, 0.06));
    });
    Array.from({ length: 16 }, (_, step) => step).forEach((step) => {
      playTick(now + step * beat + 0.02, step % 4 === 0 ? 0.045 : 0.026);
    });
  };

  scheduleLoop();
  const loopId = window.setInterval(scheduleLoop, beat * 16 * 1000);
  rewardMusicStopper = () => {
    window.clearInterval(loopId);
    master.gain.setTargetAtTime(0.0001, context.currentTime, 0.08);
    window.setTimeout(() => context.close().catch(() => {}), 300);
  };
}

function playOutroMusic() {
  stopRewardMusic();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  context.resume?.().catch(() => {});
  const master = context.createGain();
  master.gain.value = 0.13;
  master.connect(context.destination);
  const notes = [
    [523.25, 0.00, 0.46],
    [659.25, 0.54, 0.46],
    [783.99, 1.08, 0.64],
    [659.25, 1.90, 0.38],
    [783.99, 2.34, 0.38],
    [1046.5, 2.78, 0.78],
  ];
  const playTone = (frequency, start, duration, gainLevel = 0.12) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainLevel, start + 0.08);
    gain.gain.setValueAtTime(gainLevel * 0.8, start + Math.max(0.1, duration - 0.14));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  };
  const schedule = () => {
    const now = context.currentTime + 0.04;
    notes.forEach(([frequency, offset, duration]) => {
      playTone(frequency, now + offset, duration, 0.1);
      playTone(frequency * 2, now + offset + 0.018, duration * 0.72, 0.022);
    });
    [261.63, 329.63, 392.0].forEach((frequency) => playTone(frequency, now, 1.38, 0.02));
    [349.23, 440.0, 523.25].forEach((frequency) => playTone(frequency, now + 1.62, 1.18, 0.018));
    [392.0, 493.88, 587.33].forEach((frequency) => playTone(frequency, now + 2.72, 1.0, 0.018));
  };
  schedule();
  const loopId = window.setInterval(schedule, 3900);
  rewardMusicStopper = () => {
    window.clearInterval(loopId);
    master.gain.setTargetAtTime(0.0001, context.currentTime, 0.08);
    window.setTimeout(() => context.close().catch(() => {}), 300);
  };
}

function playTaDaSfx() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const master = context.createGain();
  master.gain.value = 0.62;
  master.connect(context.destination);

  const playHorn = (delay, frequencies, duration = 0.34) => {
    const start = context.currentTime + delay;
    frequencies.forEach((frequency, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(frequency, start);
      osc.frequency.linearRampToValueAtTime(frequency * 1.015, start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2 / frequencies.length, start + 0.035);
      gain.gain.setValueAtTime(0.18 / frequencies.length, start + duration - 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(master);
      osc.start(start + index * 0.006);
      osc.stop(start + duration + 0.02);
    });
  };

  playHorn(0.02, [392, 494, 587], 0.26);
  playHorn(0.34, [523, 659, 784], 0.44);
  window.setTimeout(() => context.close().catch(() => {}), 1300);
}

function playFireworkSfx({ loop = false } = {}) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return () => {};
  const context = new AudioContextClass();
  context.resume?.().catch(() => {});
  const master = context.createGain();
  master.gain.value = 0.16;
  master.connect(context.destination);

  const makePop = (delay, baseFrequency) => {
    const start = context.currentTime + delay;
    const noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.16), context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.0001, start);
    noiseGain.gain.exponentialRampToValueAtTime(0.7, start + 0.015);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    noise.connect(noiseGain).connect(master);
    noise.start(start);
    noise.stop(start + 0.2);

    [1, 1.26, 1.5].forEach((ratio, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(baseFrequency * ratio, start);
      osc.frequency.exponentialRampToValueAtTime(baseFrequency * ratio * 1.6, start + 0.18);
      gain.gain.setValueAtTime(0.0001, start + index * 0.012);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.035 + index * 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42 + index * 0.04);
      osc.connect(gain).connect(master);
      osc.start(start + index * 0.012);
      osc.stop(start + 0.5 + index * 0.04);
    });
  };

  const schedulePops = () => {
    [0.15, 0.72, 1.35, 2.15].forEach((delay, index) => {
      makePop(delay, 360 + index * 80);
    });
  };

  schedulePops();
  const loopId = loop ? window.setInterval(schedulePops, 2600) : null;
  const closeTimer = loop ? null : window.setTimeout(() => context.close().catch(() => {}), 3600);
  return () => {
    if (loopId) window.clearInterval(loopId);
    if (closeTimer) window.clearTimeout(closeTimer);
    master.gain.setTargetAtTime(0.0001, context.currentTime, 0.05);
    window.setTimeout(() => context.close().catch(() => {}), 250);
  };
}

function audioIdForText(text) {
  let hash = 0x811c9dc5;
  for (const char of String(text || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `rating_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function audioPathForText(text) {
  return canonicalAudioPathForText(text) || `audio/${audioIdForText(text)}.mp3`;
}

function versionedAudioSrc(src) {
  if (!src) return src;
  const resolvedSrc = assetUrl(src);
  return resolvedSrc.includes("?") ? `${resolvedSrc}&v=${AUDIO_VERSION}` : `${resolvedSrc}?v=${AUDIO_VERSION}`;
}

function sessionId() {
  return currentSessionId;
}

function makeDataPayload(jsPsych) {
  const rows = jsPsych.data.get().values();
  const completedAt = new Date().toISOString();
  const participantId = requestedParticipantId || "test_no_pid";
  return {
    study: "K-SIZE-dyad-likert",
    audio_version: AUDIO_VERSION,
    participant_id: participantId,
    prolific_pid: params.get("PROLIFIC_PID") || participantId,
    study_id: params.get("STUDY_ID") || "",
    session_id: sessionId(),
    chs_child_id: requestedChsChild,
    chs_response_id: requestedChsResponse,
    seed: requestedSeed,
    event_suffix: currentSessionParams.event || "",
    role_set: currentSessionParams.roleSet || "",
    rating_mode: currentSessionParams.ratingMode || requestedRatingMode,
    completed_at: completedAt,
    user_agent: navigator.userAgent,
    url: window.location.href,
    rows,
  };
}

function saveLocalDataBackup(payload) {
  try {
    const key = `who-will-help-data:${payload.session_id}`;
    localStorage.setItem(key, JSON.stringify(payload));
    localStorage.setItem("who-will-help-data:last-session", key);
    return key;
  } catch (error) {
    console.warn("Could not save local data backup", error);
    return "";
  }
}

function flattenRow(row, payload) {
  return {
    exported_at: payload.completed_at,
    participant_id: payload.participant_id,
    prolific_pid: payload.prolific_pid,
    study_id: payload.study_id,
    session_id: payload.session_id,
    chs_child_id: payload.chs_child_id,
    chs_response_id: payload.chs_response_id,
    seed: payload.seed,
    assigned_event_suffix: payload.event_suffix,
    assigned_role_set: payload.role_set,
    assigned_rating_mode: payload.rating_mode,
    audio_version: payload.audio_version,
    ...row,
  };
}

function payloadRowsForExport(payload) {
  return payload.rows.map((row) => flattenRow(row, payload));
}

function csvEscape(value) {
  if (value == null) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows) {
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

function downloadTextFile(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadPayloadFiles(payload) {
  const safeId = String(payload.session_id || "session").replace(/[^a-zA-Z0-9_-]/g, "_");
  downloadTextFile(`who-will-help_${safeId}.json`, JSON.stringify(payload, null, 2), "application/json");
  window.setTimeout(() => {
    downloadTextFile(`who-will-help_${safeId}.csv`, rowsToCsv(payloadRowsForExport(payload)), "text/csv");
  }, 300);
}

async function postDataPayload(payload) {
  if (!requestedDataEndpoint) return { sent: false, reason: "no_endpoint" };
  await fetch(requestedDataEndpoint, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return { sent: true, reason: "posted_no_cors" };
}

async function handleStudyFinish(jsPsych) {
  const payload = makeDataPayload(jsPsych);
  const backupKey = saveLocalDataBackup(payload);
  const result = await postDataPayload(payload).catch((error) => ({
    sent: false,
    reason: error.message || "post_failed",
  }));
  if (shouldDownloadData) downloadPayloadFiles(payload);
  const completionMessage = {
      type: "GAME_COMPLETE",
      study: payload.study,
      session_id: payload.session_id,
      chs_child_id: payload.chs_child_id,
      chs_response_id: payload.chs_response_id,
      data_posted: result.sent,
      payload,
  };
  if (window.opener) {
    window.opener.postMessage(completionMessage, "*");
  }
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(completionMessage, "*");
  }
  if (shouldDownloadData || params.get("showDataStatus") === "1") {
    document.body.innerHTML = `
      <main class="ksize-shell">
        <section class="ksize-screen ksize-done-screen">
          <h1 class="ksize-title">Data saved</h1>
          <p class="ksize-text">${result.sent ? "Submitted to the data endpoint." : "Saved as a local browser backup."}</p>
          <p class="ksize-small">Backup key: ${escapeHtml(backupKey || "not available")}</p>
          <div class="ksize-controls">
            <button class="ksize-next-btn ksize-icon-btn" type="button" data-download-json>
              <span class="ksize-icon-symbol" aria-hidden="true">↓</span>
              <span class="ksize-icon-label">JSON</span>
            </button>
            <button class="ksize-next-btn ksize-icon-btn" type="button" data-download-csv>
              <span class="ksize-icon-symbol" aria-hidden="true">↓</span>
              <span class="ksize-icon-label">CSV</span>
            </button>
          </div>
        </section>
      </main>
    `;
    document.querySelector("[data-download-json]")?.addEventListener("click", () => {
      const safeId = String(payload.session_id || "session").replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadTextFile(`who-will-help_${safeId}.json`, JSON.stringify(payload, null, 2), "application/json");
    });
    document.querySelector("[data-download-csv]")?.addEventListener("click", () => {
      const safeId = String(payload.session_id || "session").replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadTextFile(`who-will-help_${safeId}.csv`, rowsToCsv(payloadRowsForExport(payload)), "text/csv");
    });
  }
}

function optionAudioText(options) {
  return options.join(". ") + ".";
}

function audioTextForSlide(slide) {
  if (slide.kind === "response" && OPTION_LABELS[slide.trait]) {
    return optionAudioText(OPTION_LABELS[slide.trait]);
  }
  return slide.text;
}

function questionTextForResponse(chunk, slide) {
  if (slide.kind !== "response" || !slide.trait) return "";
  return chunk.slides.find((candidate) =>
    candidate.kind === "question" && candidate.trait === slide.trait
  )?.text || "";
}

function localImage(src) {
  return src ? { src, width: 1920, height: 1080, local: true } : null;
}

function displayImageSrc(src) {
  return assetUrl(src);
}

function imageHtml(images, className = "") {
  if (!images?.length) return "";
  return `<div class="ksize-images ${className}">
    ${images.map((img) => `<img src="${escapeHtml(displayImageSrc(img.src))}" alt="">`).join("")}
  </div>`;
}

function singleImageHtml(image, className = "") {
  if (!image) return "";
  return `<div class="ksize-slide-image ${className}">
    <img src="${escapeHtml(displayImageSrc(image.src))}" alt="">
  </div>`;
}

function introImageForSlide(trial, slide, slideIndex) {
  return localImage(introImageFixes[`${trial.id}|${slideIndex}`]) || slide.images[0];
}

function selectRoleSet(seedText, forcedRoleSet) {
  const normalized = String(forcedRoleSet || "").toLowerCase();
  if (["woman", "women", "female", "mom"].includes(normalized)) return "woman";
  if (["man", "men", "male", "dad"].includes(normalized)) return "man";
  const rng = makeRng(`${seedText}:role-set`);
  return rng() < 0.5 ? "woman" : "man";
}

function normalizeRoleSet(roleSet) {
  const normalized = String(roleSet || "").toLowerCase();
  if (["woman", "women", "female", "mom"].includes(normalized)) return "woman";
  if (["man", "men", "male", "dad"].includes(normalized)) return "man";
  return "";
}

function balancedAssignment(participantId, forcedRoleSet, forcedEvent) {
  const roleOptions = ["woman", "man"];
  const eventOptions = EVENT_SUFFIXES;
  const roleForced = normalizeRoleSet(forcedRoleSet);
  const eventForced = EVENT_SUFFIXES.includes(forcedEvent) ? forcedEvent : "";
  const baseHash = hashSeed(participantId || requestedSeed);
  const cell = baseHash % (roleOptions.length * eventOptions.length);
  return {
    roleSet: roleForced || roleOptions[cell % roleOptions.length],
    eventSuffix: eventForced || eventOptions[Math.floor(cell / roleOptions.length) % eventOptions.length],
    cell,
    method: participantId ? "participant_hash" : "seed_hash",
  };
}

function selectPartOrder(seedText, forcedPartOrder) {
  const normalized = String(forcedPartOrder || "").toLowerCase();
  if (["ratings-first", "dyad-first", "people-first", "likert-first"].includes(normalized)) return "ratings-first";
  if (["stories-first", "event-first", "choice-first", "hug-first"].includes(normalized)) return "stories-first";
  return hashSeed(`${seedText}:part-order`) % 2 === 0 ? "stories-first" : "ratings-first";
}

function selectedConditionsForSet(setName, roleSet) {
  const normalizedSet = String(setName || "").toLowerCase();
  if (normalizedSet === "all") return null;
  if (["family", "mixed", "third", "parent-peer"].includes(normalizedSet)) {
    return FAMILY_ROLE_CONDITIONS;
  }
  return roleSet === "man" ? MAN_ROLE_CONDITIONS : CORE_CONDITIONS;
}

function trialColor(trial) {
  return trial?.blocks.INTRO?.color || "";
}

function shuffleAvoidingAdjacentColors(items, rng) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const shuffled = shuffle(items, rng);
    const hasAdjacentRepeat = shuffled.some((trial, idx) =>
      idx > 0 && trialColor(trial) === trialColor(shuffled[idx - 1])
    );
    if (!hasAdjacentRepeat) return shuffled;
  }
  return shuffle(items, rng);
}

function chooseUniqueColorTrials(conditionOrder, byCondition, rng, forcedVariant) {
  const selected = [];
  const usedColors = new Set();

  const search = (conditionIndex) => {
    if (conditionIndex >= conditionOrder.length) return true;
    const condition = conditionOrder[conditionIndex];
    const variants = byCondition.get(condition) || [];
    const pool = forcedVariant
      ? variants.filter((trial) => trial.variant === forcedVariant)
      : shuffle(variants, rng);
    const freshPool = pool.filter((trial) => !usedColors.has(trialColor(trial)));
    const orderedPool = [...freshPool, ...pool.filter((trial) => usedColors.has(trialColor(trial)))];

    for (const trial of orderedPool) {
      const color = trialColor(trial);
      const wasUsed = usedColors.has(color);
      if (wasUsed && freshPool.length) continue;
      selected.push(trial);
      usedColors.add(color);
      if (search(conditionIndex + 1)) return true;
      selected.pop();
      if (!wasUsed) usedColors.delete(color);
    }
    return false;
  };

  return search(0) ? selected : [];
}

function planEventSession(manifest, seedText, forcedVariant, conditionSet, roleSet) {
  const rng = makeRng(`${seedText}:event-plan`);
  const byCondition = new Map();
  const selectedConditions = selectedConditionsForSet(conditionSet, roleSet);
  for (const trial of manifest.trials) {
    if (!trial.isComplete) continue;
    const condition = trial.blocks.INTRO?.condition;
    if (selectedConditions && !selectedConditions.includes(condition)) continue;
    if (!byCondition.has(condition)) byCondition.set(condition, []);
    byCondition.get(condition).push(trial);
  }

  const conditionOrder = selectedConditions || Array.from(byCondition.keys());
  const selected = chooseUniqueColorTrials(conditionOrder, byCondition, rng, forcedVariant);
  if (!selected.length) {
    return shuffleAvoidingAdjacentColors(conditionOrder.map((condition) => {
      const variants = byCondition.get(condition) || [];
      const forced = forcedVariant ? variants.find((trial) => trial.variant === forcedVariant) : null;
      return forced || variants[Math.floor(rng() * variants.length)];
    }).filter(Boolean), rng);
  }

  return shuffleAvoidingAdjacentColors(selected, rng);
}

function selectEventSuffix(seedText, forcedEvent) {
  if (EVENT_SUFFIXES.includes(forcedEvent)) return forcedEvent;
  const rng = makeRng(`${seedText}:event`);
  return EVENT_SUFFIXES[Math.floor(rng() * EVENT_SUFFIXES.length)];
}

function chooseOne(items, rng) {
  if (!items.length) return null;
  return items[Math.floor(rng() * items.length)];
}

function traitOrderForChunk(chunk) {
  const traitNames = [...new Set(chunk.slides.map((slide) => slide.trait).filter(Boolean))];
  return shuffle(traitNames, makeRng(`${requestedSeed}:dyad-traits:${chunk.scriptKey || chunk.folder}`));
}

function orderedDyadSlides(chunk, { includeIntro = true } = {}) {
  const introSlides = includeIntro ? chunk.slides.filter((slide) => slide.kind === "intro") : [];
  const ratingSlides = traitOrderForChunk(chunk).flatMap((trait) =>
    chunk.slides.filter((slide) => slide.trait === trait && slide.kind === "response")
  );
  return [...introSlides, ...ratingSlides];
}

function normalizeRatingMode(mode) {
  const normalized = String(mode || "").toLowerCase();
  if (["one-after-story", "one-after-each-story", "interleaved-one", "one-pair"].includes(normalized)) {
    return "one-after-story";
  }
  return "all-pairs";
}

function dyadRequestsForTrial(trial) {
  const requests = [];
  const condition = trial.blocks.INTRO?.condition;
  const color = trial.blocks.INTRO?.color?.toLowerCase() || null;
  const entries = CONDITION_DYAD_FOLDERS[condition] || [];
  for (const entry of entries) {
    requests.push({ ...entry, condition, color });
  }
  return requests;
}

function dedupeDyadGroupsByRelationship(dyadGroups) {
  const seen = new Set();
  return dyadGroups.map((group) => group.filter((chunk) => {
    const key = chunk.scriptKey || `${chunk.subject}-${chunk.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }));
}

function selectOneDyadPerTrial(dyadGroups, eventPlan, scheduleIndex) {
  const schedule = ONE_PAIR_SCRIPT_SCHEDULES[scheduleIndex] || ONE_PAIR_SCRIPT_SCHEDULES[0];
  const seen = new Set();
  return dyadGroups.map((group, idx) => {
    const condition = eventPlan[idx]?.blocks.INTRO?.condition || "";
    const preferred = schedule[condition];
    const preferredChunk = group.find((chunk) => chunk.scriptKey === preferred && !seen.has(chunk.scriptKey));
    const fallbackFresh = group.find((chunk) => !seen.has(chunk.scriptKey));
    const selected = preferredChunk || fallbackFresh || group[0];
    if (!selected) return [];
    seen.add(selected.scriptKey || `${selected.subject}-${selected.target}`);
    return [selected];
  });
}

function selectDyadChunk(manifest, request) {
  const chunks = manifest.chunks;
  const folder = request.folder;
  const candidates = chunks.filter((chunk) => chunk.folder === folder);
  if (!candidates.length) return null;
  const sourceCandidates = request.sourceKey
    ? candidates.filter((chunk) => chunk.sourceKey === request.sourceKey)
    : [];
  const requestedColorCandidates = requestedColor
    ? candidates.filter((chunk) => chunk.color?.toLowerCase() === requestedColor)
    : [];
  const matchingSourceAndColor = request.color
    ? sourceCandidates.filter((chunk) => chunk.color?.toLowerCase() === request.color)
    : [];
  const matchingColor = request.color
    ? candidates.filter((chunk) => chunk.color?.toLowerCase() === request.color)
    : [];
  const pool = requestedColorCandidates.length
    ? requestedColorCandidates
    : (matchingSourceAndColor.length
      ? matchingSourceAndColor
      : (sourceCandidates.length ? sourceCandidates : (matchingColor.length ? matchingColor : candidates)));
  const chunk = chooseOne(pool, makeRng(`${requestedSeed}:dyad:${request.condition}:${folder}`));
  if (!chunk) return null;
  return {
    ...chunk,
    familyName: chunk.scriptKey || chunk.folder,
    familyVariant: chunk.variantKey,
    sourceCondition: request.condition,
    sourceColor: request.color,
  };
}

const audio = {
  voice: null,
  current: null,
  token: 0,
  init() {
    if (!("speechSynthesis" in window)) return;
    const chooseVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      this.voice = voices.find((v) => /samantha|joanna|aria|jenny|female|english/i.test(v.name)) || voices[0] || null;
    };
    chooseVoice();
    window.speechSynthesis.addEventListener?.("voiceschanged", chooseVoice);
  },
  stop() {
    this.token += 1;
    document.body.classList.remove("ksize-audio-playing");
    if (this.current) {
      this.current.pause();
      this.current.currentTime = 0;
      this.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  },
  playSpeech(text) {
    if (!useSyntheticSpeech || !("speechSynthesis" in window) || !text) return Promise.resolve(false);
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.86;
      utterance.pitch = 1.08;
      utterance.volume = 1;
      if (this.voice) utterance.voice = this.voice;
      document.body.classList.add("ksize-audio-playing");
      utterance.addEventListener("end", () => {
        document.body.classList.remove("ksize-audio-playing");
        resolve(true);
      }, { once: true });
      utterance.addEventListener("error", () => {
        document.body.classList.remove("ksize-audio-playing");
        resolve(false);
      }, { once: true });
      window.speechSynthesis.speak(utterance);
    });
  },
  play(text) {
    this.stop();
    return this.playFile(audioPathForText(text), text);
  },
  playFile(src, text, options = {}) {
    this.stop();
    const token = this.token;
    return new Promise((resolve) => {
      const resolvedSrc = canonicalAudioPathForText(text) || canonicalAudioPathForSrc(src) || src;
      const fileAudio = new Audio(versionedAudioSrc(resolvedSrc));
      fileAudio.volume = options.volume ?? 1;
      fileAudio.playbackRate = options.playbackRate ?? 1;
      if (options.preservePitch === false) {
        fileAudio.preservesPitch = false;
        fileAudio.mozPreservesPitch = false;
        fileAudio.webkitPreservesPitch = false;
      }
      this.current = fileAudio;
      document.body.classList.add("ksize-audio-playing");
      fileAudio.addEventListener("play", () => {
        options.onStart?.();
      }, { once: true });
      fileAudio.addEventListener("ended", () => {
        document.body.classList.remove("ksize-audio-playing");
        options.onEnd?.();
        resolve(true);
      }, { once: true });
      fileAudio.addEventListener("error", async () => {
        document.body.classList.remove("ksize-audio-playing");
        if (token !== this.token) return resolve(false);
        options.onStart?.();
        resolve(await this.playSpeech(text));
      }, { once: true });
      fileAudio.play().catch(async () => {
        document.body.classList.remove("ksize-audio-playing");
        if (token !== this.token) return resolve(false);
        options.onStart?.();
        resolve(await this.playSpeech(text));
      });
    });
  },
  speak(text) {
    this.stop();
    if (!("speechSynthesis" in window) || !text) return Promise.resolve(false);
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88;
      utterance.pitch = 1.12;
      utterance.volume = 1;
      if (this.voice) utterance.voice = this.voice;
      document.body.classList.add("ksize-audio-playing");
      utterance.addEventListener("end", () => {
        document.body.classList.remove("ksize-audio-playing");
        resolve(true);
      }, { once: true });
      utterance.addEventListener("error", () => {
        document.body.classList.remove("ksize-audio-playing");
        resolve(false);
      }, { once: true });
      window.speechSynthesis.speak(utterance);
    });
  },
};

function installResearcherSkip(jsPsych) {
  const existing = document.querySelector(".ksize-researcher-tools");
  if (existing) existing.remove();
  if (!showResearcherTools) return;

  const wrap = document.createElement("div");
  wrap.className = "ksize-researcher-tools";

  const jumpToPreview = (index) => {
    window.currentRewardPageCleanup?.();
    audio.stop();
    const url = new URL(window.location.href);
    Object.entries(currentSessionParams).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    url.searchParams.set("previewIndex", String(Math.max(0, Math.min(index, totalPreviewScreens - 1))));
    url.searchParams.set("rewardCoins", String(rewardCoins));
    window.location.href = url.toString();
  };

  const start = document.createElement("button");
  start.type = "button";
  start.className = "ksize-researcher-start";
  start.textContent = "Start";
  start.title = "Jump back to the first preview screen.";
  start.disabled = currentPreviewIndex <= 0;
  start.addEventListener("click", () => jumpToPreview(0));

  const back = document.createElement("button");
  back.type = "button";
  back.className = "ksize-researcher-back";
  back.textContent = "Back";
  back.title = "Go back one preview screen.";
  back.disabled = currentPreviewIndex <= 0;
  back.addEventListener("click", () => {
    if (currentPreviewIndex <= 0) return;
    jumpToPreview(currentPreviewIndex - 1);
  });

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ksize-researcher-skip";
  button.textContent = "Skip";
  button.addEventListener("click", () => {
    window.currentRewardPageCleanup?.();
    audio.stop();
    jsPsych.finishTrial({ researcher_skip: true });
  });

  const end = document.createElement("button");
  end.type = "button";
  end.className = "ksize-researcher-end";
  end.textContent = "End";
  end.title = "Jump to the final preview screen.";
  end.disabled = !totalPreviewScreens || currentPreviewIndex >= totalPreviewScreens - 1;
  end.addEventListener("click", () => jumpToPreview(totalPreviewScreens - 1));

  wrap.append(start, back, button, end);
  document.body.appendChild(wrap);
}

function withPreviewIndex(node, index) {
  const originalOnLoad = node.on_load;
  return {
    ...node,
    data: {
      ...(node.data || {}),
      preview_index: index,
    },
    on_load: () => {
      currentPreviewIndex = index;
      originalOnLoad?.();
      updateRewardHud();
    },
  };
}

function storyCounterHtml(storyNumber, storyTotal) {
  if (!storyNumber || !storyTotal) return "";
  return `<div class="ksize-story-counter">Story ${storyNumber} of ${storyTotal}</div>`;
}

function topHudHtml(storyNumber = null, storyTotal = null) {
  return `
    <div class="ksize-top-hud">
      <div class="ksize-top-hud-left">${storyCounterHtml(storyNumber, storyTotal)}</div>
      <div class="ksize-top-hud-center">${rewardHudHtml()}</div>
      <div class="ksize-top-hud-right"></div>
    </div>
  `;
}

function renderKidSlide({ image, text, choices = [], overlayChoices = false, showText = false, slideKind = "", showNext = false, visualChoices = false, storyNumber = null, storyTotal = null }) {
  const imageBlock = overlayChoices && image
    ? `<div class="ksize-scene-wrap">
        <img src="${escapeHtml(displayImageSrc(image.src))}" alt="" draggable="false">
        <button class="ksize-char-btn ksize-char-left${visualChoices ? " ksize-char-cue-box" : ""}" data-choice-index="0" type="button" aria-label="${escapeHtml(choices[0]?.label || "left choice")}" ${visualChoices ? "tabindex=\"-1\"" : ""}></button>
        <button class="ksize-char-btn ksize-char-right${visualChoices ? " ksize-char-cue-box" : ""}" data-choice-index="1" type="button" aria-label="${escapeHtml(choices[1]?.label || "right choice")}" ${visualChoices ? "tabindex=\"-1\"" : ""}></button>
      </div>`
    : singleImageHtml(image);

  return `
    <main class="ksize-shell ksize-kid-shell">
      <section class="ksize-screen ksize-kid-screen" data-slide-kind="${escapeHtml(slideKind)}">
        ${topHudHtml(storyNumber, storyTotal)}
        ${imageBlock}
        ${showText && text ? `<div class="ksize-kid-text">${escapeHtml(text)}</div>` : ""}
        <div class="ksize-bottom-area">
          <div class="ksize-helper" aria-hidden="true">
            <div class="ksize-helper-face">
              <span class="ksize-eye ksize-eye-left"></span>
              <span class="ksize-eye ksize-eye-right"></span>
              <span class="ksize-mouth"></span>
            </div>
            <div class="ksize-helper-bubble">${overlayChoices && !visualChoices ? "Choose one!" : "Listen and look!"}</div>
          </div>
          <div class="ksize-controls">
            <button class="ksize-audio-btn ksize-icon-btn" type="button" aria-label="Play">
              <span class="ksize-icon-symbol" aria-hidden="true">▶</span>
              <span class="ksize-icon-label">Play</span>
            </button>
            ${showNext ? `
              <button class="ksize-next-btn ksize-icon-btn" type="button" aria-label="Next">
                <span class="ksize-icon-symbol" aria-hidden="true">➜</span>
                <span class="ksize-icon-label">Next</span>
              </button>
            ` : ""}
          </div>
        </div>
      </section>
    </main>
  `;
}

function makeKidNode(jsPsych, { trial, block, suffix, image, text, audioSegments = [], choices = [], slideKind, overlayChoices = false, showText = false, autoPlay = true, autoAdvanceAfterAudio = false, partKind, partNumber, visualChoices = false, highlightChoices = false, highlightStartMs = 350, storyNumber = null, storyTotal = null }) {
  const hasChoices = choices.length > 0 && !visualChoices;
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: renderKidSlide({ image, text, choices, overlayChoices, showText, slideKind, showNext: !hasChoices, visualChoices, storyNumber, storyTotal }),
    choices: [],
    data: {
      trial_key: trial.id,
      trial_number: trial.number,
      variant: trial.variant,
      suffix,
      study_part: partNumber,
      part_kind: partKind,
      slide_kind: slideKind,
      block_id: block.blockId,
      question_id: block.questionId,
      condition: block.condition,
      side: block.side,
      color: block.color,
      story_number: storyNumber,
      story_total: storyTotal,
    },
    on_load: () => {
      installResearcherSkip(jsPsych);
      let didFinish = false;
      let highlightTimers = [];
      const finishNext = () => {
        if (didFinish) return;
        didFinish = true;
        finishWithReward(jsPsych, { response: "auto_next" }, REWARD_VALUES.next, "auto_next_page");
      };
      const finishNextAfterPause = async () => {
        await new Promise((resolve) => window.setTimeout(resolve, AUTO_ADVANCE_PAUSE_MS));
        finishNext();
      };
      const clearHighlights = () => {
        highlightTimers.forEach((timer) => clearTimeout(timer));
        highlightTimers = [];
        document.querySelectorAll(".ksize-char-btn").forEach((button) => {
          button.classList.remove("ksize-char-name-cue");
        });
      };
      const highlightChoiceNames = () => {
        if (!highlightChoices) return;
        clearHighlights();
        const buttons = Array.from(document.querySelectorAll(".ksize-char-btn"));
        const optionLabels = String(text || "").split(/\s+or\s+/i);
        const firstLabelMs = optionLabels[0] ? estimatedSpeechMs(optionLabels[0]) : 1150;
        const cueGapMs = Math.max(900, Math.min(1750, firstLabelMs - 250));
        buttons.forEach((button, idx) => {
          highlightTimers.push(setTimeout(() => {
            buttons.forEach((item) => item.classList.remove("ksize-char-name-cue"));
            button.classList.add("ksize-char-name-cue");
          }, highlightStartMs + idx * cueGapMs));
        });
        highlightTimers.push(setTimeout(() => {
          buttons.forEach((item) => item.classList.remove("ksize-char-name-cue"));
        }, highlightStartMs + buttons.length * cueGapMs + 700));
      };
      const playAudio = async ({ advanceWhenDone = false } = {}) => {
        clearHighlights();
        if (highlightChoices && audioSegments.length === 1) {
          await audio.playFile(audioSegments[0], text || "", {
            onStart: highlightChoiceNames,
            onEnd: clearHighlights,
          });
          clearHighlights();
          if (advanceWhenDone && autoAdvanceAfterAudio && !hasChoices) await finishNextAfterPause();
          return;
        }
        if (highlightChoices && audioSegments.length > 1) {
          const leadSegments = audioSegments.slice(0, -1);
          const optionSegment = audioSegments.at(-1);
          for (const segment of leadSegments) {
            await audio.playFile(segment, "");
          }
          await audio.playFile(optionSegment, text || "", {
            onStart: highlightChoiceNames,
            onEnd: clearHighlights,
          });
          clearHighlights();
          if (advanceWhenDone && autoAdvanceAfterAudio && !hasChoices) await finishNextAfterPause();
          return;
        }
        for (const segment of audioSegments) {
          await audio.playFile(segment, text || "");
        }
        if (advanceWhenDone && autoAdvanceAfterAudio && !hasChoices) await finishNextAfterPause();
      };
      document.querySelector(".ksize-audio-btn")?.addEventListener("click", playAudio);
      document.querySelector(".ksize-next-btn")?.addEventListener("click", () => {
        if (didFinish) return;
        didFinish = true;
        clearHighlights();
        audio.stop();
        finishWithReward(jsPsych, { response: "next" }, REWARD_VALUES.next, "next_page");
      });
      document.querySelectorAll(".ksize-char-btn").forEach((button) => {
        if (visualChoices) return;
        button.addEventListener("click", () => {
          if (didFinish) return;
          didFinish = true;
          clearHighlights();
          audio.stop();
          const idx = Number(button.dataset.choiceIndex);
          finishWithReward(jsPsych, {
            response: idx,
            choice_id: choices[idx]?.id || null,
            choice_label: choices[idx]?.label || null,
          }, REWARD_VALUES.choice, "story_choice");
        });
      });
      if (autoPlay) setTimeout(() => playAudio({ advanceWhenDone: autoAdvanceAfterAudio }), 250);
    },
    on_finish: () => audio.stop(),
  };
}

function estimatedSpeechMs(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1300, Math.min(5200, words * 390));
}

function buildEventTrialNodes(jsPsych, trial, trialIndex, totalTrials, eventSuffix, partKind, partNumber) {
  return trial.blockOrder.flatMap((suffix) => {
    const block = trial.blocks[suffix];
    if (!block) return [];
    if (suffix !== "INTRO" && suffix !== eventSuffix) return [];
    if (suffix === "INTRO" && block.introSlides?.length) {
      return block.introSlides.map((slide, slideIndex) => makeKidNode(jsPsych, {
        trial,
        block,
        suffix,
        image: introImageForSlide(trial, slide, slideIndex),
        text: slide.text,
        audioSegments: slide.audioSegments,
        choices: [],
        slideKind: "intro",
        showText: false,
        autoAdvanceAfterAudio: true,
        partKind,
        partNumber,
        storyNumber: trialIndex + 1,
        storyTotal: totalTrials,
      }));
    }

    const lines = block.text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const nodes = [];
    const storyImages = block.choices?.length ? block.images.slice(0, -1) : block.images;
    const storyLines = lines.slice(0, storyImages.length);
    storyLines.forEach((line, idx) => {
      nodes.push(makeKidNode(jsPsych, {
        trial,
        block,
        suffix,
        image: storyImages[idx] || block.images[0],
        text: line,
        audioSegments: block.audioSegments?.[idx] ? [block.audioSegments[idx]] : [],
        choices: [],
        slideKind: "story",
        showText: false,
        autoAdvanceAfterAudio: true,
        partKind,
        partNumber,
        storyNumber: trialIndex + 1,
        storyTotal: totalTrials,
      }));
    });

    const responseImage = block.images.at(-1) || null;
    const responseLines = lines.slice(storyLines.length);
    const responseAudio = block.audioSegments?.slice(storyLines.length) || block.audioSegments || [];
    if (block.choices?.length && responseLines.length > 1) {
      const questionLines = responseLines.slice(0, -1);
      const questionAudio = responseAudio.slice(0, -1);
      const optionLine = responseLines.at(-1);
      const optionAudio = responseAudio.at(-1) ? [responseAudio.at(-1)] : [];
      nodes.push(makeKidNode(jsPsych, {
        trial,
        block,
        suffix,
        image: responseImage,
        text: optionLine,
        audioSegments: [...questionAudio, ...optionAudio],
        choices: block.choices || [],
        slideKind: "response_choices",
        overlayChoices: Boolean(responseImage),
        showText: false,
        autoPlay: true,
        highlightChoices: true,
        highlightStartMs: 350,
        partKind,
        partNumber,
        storyNumber: trialIndex + 1,
        storyTotal: totalTrials,
      }));
    }
    return nodes;
  });
}

function renderSlide({ chunk, slide, index, total, storyNumber = null, storyTotal = null }) {
  const options = OPTION_LABELS[slide.trait] || [];
  const buttons = slide.kind === "response"
    ? `<div class="ksize-rating-options">
        ${options.map((option, idx) => `
          <button class="ksize-rating-choice" data-rating-index="${idx}" type="button" aria-label="${escapeHtml(option)}">
            <span class="ksize-rating-thumb ksize-rating-thumb-${idx + 1}" aria-hidden="true">👍</span>
            <span>${escapeHtml(option)}</span>
          </button>
        `).join("")}
      </div>`
    : "";
  return `
    <main class="ksize-shell">
      <section class="ksize-screen" data-slide-kind="${escapeHtml(slide.kind)}">
        ${topHudHtml(storyNumber, storyTotal)}
        <div class="ksize-image-wrap">
          <img src="${escapeHtml(slide.src)}" alt="">
        </div>
        ${buttons}
        <div class="ksize-bottom-area">
          <div class="ksize-helper" aria-hidden="true">
            <div class="ksize-helper-face">
              <span class="ksize-eye ksize-eye-left"></span>
              <span class="ksize-eye ksize-eye-right"></span>
              <span class="ksize-mouth"></span>
            </div>
            <div class="ksize-helper-bubble">${slide.kind === "response" ? "Pick one!" : "Listen and look!"}</div>
          </div>
          <div class="ksize-controls">
            <button class="ksize-audio-btn ksize-icon-btn" type="button" aria-label="Play">
              <span class="ksize-icon-symbol" aria-hidden="true">▶</span>
              <span class="ksize-icon-label">Play</span>
            </button>
            ${slide.kind !== "response" ? `
              <button class="ksize-next-btn ksize-icon-btn" type="button" aria-label="Next">
                <span class="ksize-icon-symbol" aria-hidden="true">➜</span>
                <span class="ksize-icon-label">Next</span>
              </button>
            ` : ""}
          </div>
        </div>
      </section>
    </main>
  `;
}

function makeSlideNode(jsPsych, chunk, slide, index, total, storyNumber = null, storyTotal = null) {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: renderSlide({ chunk, slide, index, total, storyNumber, storyTotal }),
    choices: [],
    data: {
      slide_kind: slide.kind,
      family: chunk.familyName,
      family_variant: chunk.familyVariant,
      dyad_id: chunk.id,
      dyad_folder: chunk.folder,
      subject: chunk.subject,
      target: chunk.target,
      color: chunk.color,
      trait: slide.trait || null,
      image_src: slide.src,
      story_number: storyNumber,
      story_total: storyTotal,
    },
    on_load: () => {
      installResearcherSkip(jsPsych);
      const buttons = Array.from(document.querySelectorAll(".ksize-rating-choice"));
      let playToken = 0;
      let revealTimers = [];
      const clearRevealTimers = () => {
        revealTimers.forEach((timer) => clearTimeout(timer));
        revealTimers = [];
      };
      const resetOptions = () => {
        clearRevealTimers();
        buttons.forEach((button) => {
          button.disabled = true;
          button.classList.remove("ksize-rating-visible", "ksize-rating-current", "ksize-rating-ready");
        });
      };
      const revealOption = (idx) => {
        const button = buttons[idx];
        if (!button) return;
        button.classList.add("ksize-rating-visible", "ksize-rating-current");
        revealTimers.push(setTimeout(() => {
          button.classList.remove("ksize-rating-current");
        }, 850));
      };
      const enableOptions = () => {
        clearRevealTimers();
        buttons.forEach((button) => {
          button.disabled = false;
          button.classList.add("ksize-rating-visible", "ksize-rating-ready");
          button.classList.remove("ksize-rating-current");
        });
      };
      const playAudio = async () => {
        playToken += 1;
        const token = playToken;
        if (slide.kind === "response") {
          resetOptions();
          const questionText = questionTextForResponse(chunk, slide);
          if (questionText) {
            await audio.play(questionText);
            if (token !== playToken) return;
          }
          OPTION_LABELS[slide.trait]?.forEach((_, idx) => {
            revealTimers.push(setTimeout(() => revealOption(idx), 250 + idx * 900));
          });
        }
        await audio.play(audioTextForSlide(slide));
        if (token !== playToken) return;
        if (slide.kind === "response") {
          enableOptions();
        }
      };
      document.querySelector(".ksize-audio-btn")?.addEventListener("click", playAudio);
      document.querySelector(".ksize-next-btn")?.addEventListener("click", () => {
        audio.stop();
        finishWithReward(jsPsych, { response: "next" }, REWARD_VALUES.next, "next_page");
      });
      document.querySelectorAll(".ksize-rating-choice").forEach((button) => {
        button.addEventListener("click", () => {
          const idx = Number(button.dataset.ratingIndex);
          audio.stop();
          finishWithReward(jsPsych, {
            response: idx,
            rating_value: idx + 1,
            rating_label: OPTION_LABELS[slide.trait]?.[idx] || null,
          }, REWARD_VALUES.rating, "rating_choice");
        });
      });
      if (slide.kind === "response") resetOptions();
      setTimeout(playAudio, 250);
    },
    on_finish: () => {
      audio.stop();
    },
  };
}

function partTitle(partKind) {
  if (partKind === PART_INTERLEAVED) return "Let’s Play";
  return partKind === PART_EVENT ? "Choosing Game" : "People Questions";
}

function partText(partKind) {
  if (partKind === PART_INTERLEAVED) {
    return "Listen to the story, then answer the questions.";
  }
  return partKind === PART_EVENT
    ? "Now we will look at the people and choose one."
    : "Now we will answer questions about the people.";
}

function makePartBreakNode(jsPsych, partKind, partNumber, eventSuffix) {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <main class="ksize-shell">
        <section class="ksize-screen ksize-start-screen ksize-welcome-screen">
          ${rewardHudHtml()}
          <div class="ksize-helper ksize-helper-start" aria-hidden="true">
            <div class="ksize-helper-face">
              <span class="ksize-eye ksize-eye-left"></span>
              <span class="ksize-eye ksize-eye-right"></span>
              <span class="ksize-mouth"></span>
            </div>
            <div class="ksize-helper-bubble">Ready?</div>
          </div>
          <h1 class="ksize-title">${partNumber === 1 ? "Let’s Play" : `Game ${partNumber}`}</h1>
          ${partNumber === 1 ? "" : `<p class="ksize-text">${escapeHtml(partTitle(partKind))}</p>`}
          <p class="ksize-small">${escapeHtml(partText(partKind))}</p>
          <div class="ksize-controls">
            <button class="ksize-next-btn ksize-icon-btn" type="button" aria-label="Start">
              <span class="ksize-icon-symbol" aria-hidden="true">➜</span>
              <span class="ksize-icon-label">Start</span>
            </button>
          </div>
        </section>
      </main>
    `,
    choices: [],
    data: {
      study_part: partNumber,
      part_kind: partKind,
      slide_kind: "part_break",
      event_suffix: eventSuffix,
    },
    on_load: () => {
      installResearcherSkip(jsPsych);
      const partAudioText = partNumber === 1
        ? GAME_START_TEXT
        : `Game ${partNumber}. Hit the green button to start.`;
      const partAudioSrc = partNumber === 1 ? GAME_START_AUDIO : "";
      document.querySelector(".ksize-next-btn")?.addEventListener("click", () => {
        audio.stop();
        finishWithReward(jsPsych, { response: "start_part" }, 0, "start_part");
      });
      setTimeout(() => {
        if (partAudioSrc) {
          audio.playFile(partAudioSrc, partAudioText);
          return;
        }
        audio.speak(partAudioText);
      }, 250);
    },
    on_finish: () => audio.stop(),
  };
}

async function main() {
  const [dyadManifest, eventManifest, canonicalAudioManifest] = await Promise.all([
    fetch(assetUrl(DYAD_MANIFEST_URL)).then((res) => res.json()),
    fetch(assetUrl(EVENT_MANIFEST_URL)).then((res) => res.json()),
    fetch(assetUrl(CANONICAL_AUDIO_MANIFEST_URL)).then((res) => res.json()),
  ]);
  installCanonicalAudioMap(canonicalAudioManifest);
  introImageFixes = await fetch(assetUrl(INTRO_IMAGE_FIXES_URL)).then((res) => res.json()).catch(() => ({}));
  const assignment = balancedAssignment(requestedParticipantId, requestedRoleSet, requestedEvent);
  const selectedRoleSet = ["family", "mixed", "third", "parent-peer"].includes(String(requestedSet).toLowerCase())
    ? "family"
    : assignment.roleSet;
  const eventPlan = planEventSession(eventManifest, requestedSeed, requestedVariant, requestedSet, selectedRoleSet);
  const selectedEventSuffix = assignment.eventSuffix;
  currentSessionParams = {
    seed: requestedSeed,
    session_id: currentSessionId,
    ...(requestedChsChild ? { child: requestedChsChild } : {}),
    ...(requestedChsResponse ? { response: requestedChsResponse } : {}),
    ...(requestedParticipantId ? { pid: requestedParticipantId } : {}),
    event: selectedEventSuffix,
    roleSet: selectedRoleSet,
    set: requestedSet,
    ...(requestedVariant ? { variant: requestedVariant } : {}),
    ...(requestedPartOrder ? { partOrder: requestedPartOrder } : {}),
    ...(requestedRatingMode ? { ratingMode: requestedRatingMode } : {}),
    ...(requestedDataEndpoint ? { dataEndpoint: requestedDataEndpoint } : {}),
    ...(shouldDownloadData ? { downloadData: "1" } : {}),
    ...(params.get("showDataStatus") === "1" ? { showDataStatus: "1" } : {}),
    syntheticSpeech: useSyntheticSpeech ? "1" : "0",
  };
  const rawDyadGroupsByTrial = eventPlan.map((trial) => {
    const chunks = dyadRequestsForTrial(trial)
      .map((request) => selectDyadChunk(dyadManifest, request))
      .filter(Boolean);
    return shuffle(chunks, makeRng(`${requestedSeed}:dyad-order:${trial.id}`));
  });
  const selectedRatingMode = normalizeRatingMode(requestedRatingMode);
  const onePairScheduleIndex = hashSeed(`${requestedSeed}:one-pair-schedule`) % ONE_PAIR_SCRIPT_SCHEDULES.length;
  const dyadGroupsByTrial = selectedRatingMode === "one-after-story"
    ? selectOneDyadPerTrial(rawDyadGroupsByTrial, eventPlan, onePairScheduleIndex)
    : dedupeDyadGroupsByRelationship(rawDyadGroupsByTrial);
  const allDyadChunks = dyadGroupsByTrial.flat();
  const includePairIntros = selectedRatingMode !== "one-after-story";
  const allDyadSlides = allDyadChunks.flatMap((chunk) =>
    orderedDyadSlides(chunk, { includeIntro: includePairIntros }).map((slide) => ({ chunk, slide }))
  );
  const selectedPartOrder = selectPartOrder(requestedSeed, requestedPartOrder);
  const imagePaths = [
    ...allDyadSlides.map(({ slide }) => slide.src),
    ...eventPlan.flatMap((trial) =>
      [
        introImageFixes[`${trial.id}|3`],
        ...trial.blockOrder.flatMap((suffix) => {
          const block = trial.blocks[suffix];
          if (!block) return [];
          return [
            ...block.images.map((img) => displayImageSrc(img.src)),
            ...block.choices.flatMap((choice) => choice.images.map((img) => displayImageSrc(img.src))),
          ];
        }),
      ].filter(Boolean)
    ),
  ];
  audio.init();

  const jsPsych = initJsPsych({
    on_finish: () => handleStudyFinish(jsPsych),
  });

  jsPsych.data.addProperties({
    study: "K-SIZE-dyad-likert",
    source_survey_id: eventManifest.source?.surveyId || null,
    source_survey_name: eventManifest.source?.surveyName || null,
    participant_id: requestedParticipantId || null,
    session_id: sessionId(),
    chs_child_id: requestedChsChild || null,
    chs_response_id: requestedChsResponse || null,
    data_endpoint_configured: Boolean(requestedDataEndpoint),
    data_download_requested: shouldDownloadData,
    seed: requestedSeed,
    assignment_method: assignment.method,
    assignment_cell: assignment.cell,
    role_set: selectedRoleSet,
    event_suffix: selectedEventSuffix,
    part_order: selectedRatingMode === "one-after-story" ? "interleaved-one-after-story" : selectedPartOrder,
    rating_mode: selectedRatingMode,
    one_pair_schedule: selectedRatingMode === "one-after-story" ? onePairScheduleIndex : null,
    one_pair_schedule_map: selectedRatingMode === "one-after-story"
      ? JSON.stringify(ONE_PAIR_SCRIPT_SCHEDULES[onePairScheduleIndex])
      : null,
    requested_set: requestedSet,
    requested_color: requestedColor || null,
    n_event_trials: eventPlan.length,
    n_dyads: allDyadChunks.length,
    event_condition_order: eventPlan.map((trial) => trial.blocks.INTRO?.condition).join(","),
    event_trial_order: eventPlan.map((trial) => trial.id).join(","),
    event_color_order: eventPlan.map((trial) => trial.blocks.INTRO?.color).join(","),
    dyad_unique_relationships: allDyadChunks.map((chunk) => chunk.scriptKey || `${chunk.subject}-${chunk.target}`).join(","),
    dyad_order: allDyadChunks.map((chunk) => chunk.id).join(","),
    dyad_source_conditions: allDyadChunks.map((chunk) => `${chunk.sourceCondition}:${chunk.id}`).join(","),
    dyad_color_order: allDyadChunks.map((chunk) => chunk.color).join(","),
    dyad_trait_order: allDyadChunks.map((chunk) => `${chunk.id}:${traitOrderForChunk(chunk).join("/")}`).join(","),
  });

  let dyadSlideIndex = 0;
  const storyNodes = eventPlan.flatMap((trial, idx) =>
    buildEventTrialNodes(jsPsych, trial, idx, eventPlan.length, selectedEventSuffix, PART_EVENT, 1)
  );
  const ratingNodes = selectedRatingMode === "one-after-story"
    ? []
    : dyadGroupsByTrial.flatMap((group) =>
        group.flatMap((chunk) =>
          orderedDyadSlides(chunk, { includeIntro: includePairIntros }).map((slide) => {
            const node = makeSlideNode(jsPsych, chunk, slide, dyadSlideIndex, allDyadSlides.length);
            dyadSlideIndex += 1;
            return node;
          })
        )
      );
  if (selectedRatingMode === "one-after-story") dyadSlideIndex = 0;
  const oneAfterStoryNodes = selectedRatingMode === "one-after-story"
    ? eventPlan.flatMap((trial, idx) => {
        const eventNodes = buildEventTrialNodes(jsPsych, trial, idx, eventPlan.length, selectedEventSuffix, PART_EVENT, 1);
        const dyadNodes = dyadGroupsByTrial[idx].flatMap((chunk) =>
          orderedDyadSlides(chunk, { includeIntro: false }).map((slide) => {
            const node = makeSlideNode(
              jsPsych,
              chunk,
              slide,
              dyadSlideIndex,
              allDyadSlides.length,
              idx + 1,
              eventPlan.length
            );
            dyadSlideIndex += 1;
            return node;
          })
        );
        return [...eventNodes, ...dyadNodes];
      })
    : [];
  REWARD_GOAL_COINS = Math.max(
    1,
    selectedRatingMode === "one-after-story"
      ? oneAfterStoryNodes.length
      : storyNodes.length + ratingNodes.length
  );

  const parentProgressHtml = (activeStep) => {
    const labels = ["Welcome", "Quick check", "Camera", "Child’s turn"];
    return `
    <nav class="ksize-parent-progress" aria-label="Parent setup progress">
      ${labels.map((label, index) => {
        const step = index + 1;
        const state = step < activeStep ? "complete" : step === activeStep ? "active" : "";
        return `<span class="ksize-parent-progress-step ${state}"><i>${step < activeStep ? "✓" : step}</i><b>${label}</b></span>`;
      }).join("")}
    </nav>
  `;
  };
  const parentWelcomeNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <main class="ksize-shell ksize-setup-shell">
          <section class="ksize-screen ksize-setup-screen ksize-parent-welcome-screen">
            ${parentProgressHtml(1)}
            <header class="ksize-parent-welcome-header">
              <span class="ksize-setup-eyebrow">Who Will Help?</span>
              <h1 class="ksize-setup-title">Welcome, grown-ups!</h1>
              <p class="ksize-parent-welcome-lead">Thank you for helping your child take part. We’ll get set up together.</p>
            </header>
            <div class="ksize-parent-welcome-grid">
              <article class="ksize-parent-welcome-card">
                <span class="ksize-parent-welcome-icon ksize-icon-bob" aria-hidden="true">◉</span>
                <h2>Quick setup</h2>
                <p>Check the sound, screen, and camera.</p>
              </article>
              <article class="ksize-parent-welcome-card">
                <span class="ksize-parent-welcome-icon ksize-icon-pulse" aria-hidden="true">▶</span>
                <h2>Your child plays</h2>
                <p>Listen to stories and tap choices.</p>
              </article>
              <article class="ksize-parent-welcome-card">
                <span class="ksize-parent-welcome-icon ksize-icon-heart" aria-hidden="true">♡</span>
                <h2>Stay close by</h2>
                <p>Help with the device—not the answers.</p>
              </article>
            </div>
            <button class="ksize-parent-listen ksize-parent-welcome-audio" type="button"><span aria-hidden="true">▶</span><span>Listen</span></button>
            <footer class="ksize-setup-footer">
              <p>The next pages are for the grown-up.</p>
              <button class="ksize-setup-next ksize-parent-welcome-next" type="button"><span>Let’s get set up</span><span aria-hidden="true">➜</span></button>
            </footer>
          </section>
        </main>
      `,
      choices: [],
      on_load: () => {
        installResearcherSkip(jsPsych);
        const playParentWelcomeAudio = () => audio.playFile(PARENT_WELCOME_AUDIO, PARENT_WELCOME_TEXT);
        document.querySelector(".ksize-parent-welcome-audio")?.addEventListener("click", playParentWelcomeAudio);
        window.setTimeout(playParentWelcomeAudio, 500);
        document.querySelector(".ksize-parent-welcome-next")?.addEventListener("click", () => {
          audio.stop();
          finishWithReward(jsPsych, { response: "parent_welcome_continue" }, 0, "parent_welcome");
        });
      },
    };

  const setupNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <main class="ksize-shell ksize-setup-shell">
          <section class="ksize-screen ksize-setup-screen">
            ${parentProgressHtml(2)}
            <header class="ksize-setup-heading">
              <span class="ksize-setup-eyebrow">A quick note for the grown-up</span>
              <h1 class="ksize-setup-title">Get ready to play</h1>
              <p class="ksize-setup-intro">A few important details, then three quick checks.</p>
            </header>
            <div class="ksize-before-begin-card">
              <strong>Before you begin</strong>
              <span>A recorded picture game about social relationships</span>
              <span>About 10–15 minutes</span>
              <span>You and your child may stop at any time</span>
              <span>There are no right or wrong answers in this game</span>
            </div>
            <h2 class="ksize-quick-checks-heading">Three quick checks</h2>
            <div class="ksize-setup-list">
              <article class="ksize-setup-card">
                <span class="ksize-setup-number">1</span>
                <div class="ksize-setup-copy">
                  <h2>Make the game easy to see</h2>
                  <p>Use one screen and place it in front of your child.</p>
                </div>
                <div class="ksize-setup-picture ksize-screen-picture" aria-hidden="true">
                  <span class="ksize-monitor">
                    <span class="ksize-monitor-scene"><i></i><i></i><i></i></span>
                    <span class="ksize-monitor-stand"></span>
                  </span>
                  <span class="ksize-setup-check">✓</span>
                  <span class="ksize-setup-spark ksize-setup-spark-1">✦</span>
                </div>
              </article>
              <article class="ksize-setup-card">
                <span class="ksize-setup-number">2</span>
                <div class="ksize-setup-copy">
                  <h2>Turn the sound on</h2>
                  <p>Choose a comfortable listening volume.</p>
                </div>
                <div class="ksize-setup-picture ksize-sound-picture" aria-hidden="true">
                  <span class="ksize-speaker">▶</span>
                  <span class="ksize-sound-wave ksize-sound-wave-1"></span>
                  <span class="ksize-sound-wave ksize-sound-wave-2"></span>
                  <span class="ksize-sound-wave ksize-sound-wave-3"></span>
                </div>
              </article>
              <article class="ksize-setup-card">
                <span class="ksize-setup-number">3</span>
                <div class="ksize-setup-copy">
                  <h2>Let your child choose</h2>
                  <p>Help with the device, but not with answers.</p>
                  <p class="ksize-no-right-wrong-reminder">There are no right or wrong answers in this game.</p>
                </div>
                <div class="ksize-setup-picture ksize-choice-picture" aria-hidden="true">
                  <span class="ksize-choice-dot ksize-choice-dot-left">A</span>
                  <span class="ksize-choice-hand">☝</span>
                  <span class="ksize-choice-dot ksize-choice-dot-right">B</span>
                </div>
              </article>
            </div>
            <button class="ksize-parent-listen ksize-quick-checks-audio" type="button"><span aria-hidden="true">▶</span><span>Listen</span></button>
            <footer class="ksize-setup-footer">
              <button class="ksize-setup-next" type="button"><span>Ready</span><span aria-hidden="true">➜</span></button>
            </footer>
          </section>
        </main>
      `,
      choices: [],
      on_load: () => {
        installResearcherSkip(jsPsych);
        const playQuickChecksAudio = () => audio.playFile(PARENT_QUICK_CHECKS_AUDIO, PARENT_QUICK_CHECKS_TEXT);
        document.querySelector(".ksize-quick-checks-audio")?.addEventListener("click", playQuickChecksAudio);
        window.setTimeout(playQuickChecksAudio, 500);
        document.querySelector(".ksize-setup-next")?.addEventListener("click", () => {
          audio.stop();
          finishWithReward(jsPsych, { response: "setup_ready" }, 0, "setup_ready");
        });
      },
    };

  const cameraSetupNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <main class="ksize-shell ksize-setup-shell">
          <section class="ksize-screen ksize-setup-screen ksize-camera-screen">
            ${parentProgressHtml(3)}
            <header class="ksize-setup-heading">
              <span class="ksize-setup-eyebrow">Camera check</span>
              <h1 class="ksize-setup-title">Set up the camera for recording</h1>
              <p class="ksize-setup-intro">Make sure your child stays easy to see.</p>
            </header>
            <div class="ksize-camera-layout">
              <div class="ksize-camera-instructions">
                <article class="ksize-camera-tip">
                  <span class="ksize-camera-tip-number">1</span>
                  <span class="ksize-camera-tip-icon ksize-camera-center-icon" aria-hidden="true"><i></i></span>
                  <div>
                    <h2>Center the camera</h2>
                    <p>Put the screen directly in front of your child.</p>
                  </div>
                </article>
                <article class="ksize-camera-tip">
                  <span class="ksize-camera-tip-number">2</span>
                  <span class="ksize-camera-tip-icon ksize-camera-frame-icon" aria-hidden="true"><i></i></span>
                  <div>
                    <h2>Frame head and shoulders</h2>
                    <p>Keep their full face and shoulders in view.</p>
                  </div>
                </article>
                <article class="ksize-camera-tip">
                  <span class="ksize-camera-tip-number">3</span>
                  <span class="ksize-camera-tip-icon ksize-camera-light-icon" aria-hidden="true">☀</span>
                  <div>
                    <h2>Check the light</h2>
                    <p>Avoid a bright window behind your child.</p>
                  </div>
                </article>
              </div>
              <div class="ksize-camera-panel">
                <h2 class="ksize-camera-examples-title">Use these examples to check your setup</h2>
                <div class="ksize-lookit-example-stack">
                  <figure class="ksize-lookit-example ksize-camera-combined-example">
                    <img src="assets/lookit-camera-centering.png" alt="Three original setup photos: a correct centered external webcam, an incorrect off-center external webcam, and a correct laptop with a built-in camera.">
                    <figcaption>
                      <span><strong>External webcam:</strong> center it above the study screen.</span>
                      <span><strong>Most families:</strong> use the camera built into your laptop.</span>
                    </figcaption>
                  </figure>
                  <figure class="ksize-lookit-example">
                    <img src="assets/lookit-monitor-setup-correct-first.png?v=camera-fix-v40" alt="Two correct one-screen setups appear first, with the large monitor setup first; an incorrect two-screen setup appears last.">
                    <figcaption><strong>Use one study screen.</strong> Turn off or close other screens that might distract your child.</figcaption>
                  </figure>
                </div>
                <div class="ksize-recording-note">
                  <span class="ksize-recording-dot" aria-hidden="true"></span>
                  <p><strong>Next:</strong> CHS will show a live view for one final check.</p>
                </div>
              </div>
            </div>
            <button class="ksize-parent-listen ksize-camera-setup-audio" type="button"><span aria-hidden="true">▶</span><span>Listen</span></button>
            <footer class="ksize-setup-footer ksize-camera-footer">
              <p>Keep this position during the game.</p>
              <button class="ksize-setup-next ksize-camera-next" type="button"><span>Finish grown-up setup</span><span aria-hidden="true">➜</span></button>
            </footer>
          </section>
        </main>
      `,
      choices: [],
      on_load: () => {
        installResearcherSkip(jsPsych);
        const playCameraSetupAudio = () => audio.playFile(PARENT_CAMERA_AUDIO, PARENT_CAMERA_TEXT);
        document.querySelector(".ksize-camera-setup-audio")?.addEventListener("click", playCameraSetupAudio);
        window.setTimeout(playCameraSetupAudio, 500);
        document.querySelector(".ksize-camera-next")?.addEventListener("click", () => {
          audio.stop();
          finishWithReward(jsPsych, { response: "camera_setup_continue" }, 0, "camera_setup");
        });
      },
    };

  const childHandoffNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <main class="ksize-shell ksize-setup-shell">
          <section class="ksize-screen ksize-setup-screen ksize-handoff-screen">
            ${parentProgressHtml(4)}
            <div class="ksize-handoff-complete"><span aria-hidden="true">✓</span> Grown-up setup complete</div>
            <div class="ksize-handoff-visual" aria-hidden="true">
              <div class="ksize-handoff-person ksize-handoff-grownup"><span></span><b></b></div>
              <div class="ksize-handoff-arrow">➜</div>
              <div class="ksize-handoff-person ksize-handoff-child"><span></span><b></b><i>★</i></div>
            </div>
            <header class="ksize-handoff-heading">
              <span class="ksize-setup-eyebrow">Time to switch players</span>
              <h1 class="ksize-setup-title">Now it’s your child’s turn!</h1>
              <p>Please invite your child to sit in front of the screen.</p>
            </header>
            <div class="ksize-handoff-reminder">
              <span aria-hidden="true">♡</span>
              <p>
                <strong>Grown-ups,</strong> you may stay nearby to help with the device, but please let your child choose the answers.
                <span class="ksize-handoff-reassurance">There are no right or wrong answers in this game.</span>
              </p>
            </div>
            <button class="ksize-parent-listen ksize-handoff-audio" type="button"><span aria-hidden="true">▶</span><span>Listen</span></button>
            <footer class="ksize-setup-footer ksize-handoff-footer">
              <button class="ksize-setup-next ksize-handoff-next" type="button"><span>My child is ready</span><span aria-hidden="true">➜</span></button>
            </footer>
          </section>
        </main>
      `,
      choices: [],
      on_load: () => {
        installResearcherSkip(jsPsych);
        const playHandoffAudio = () => audio.playFile(PARENT_HANDOFF_AUDIO, PARENT_HANDOFF_TEXT);
        document.querySelector(".ksize-handoff-audio")?.addEventListener("click", playHandoffAudio);
        window.setTimeout(playHandoffAudio, 500);
        document.querySelector(".ksize-handoff-next")?.addEventListener("click", () => {
          audio.stop();
          finishWithReward(jsPsych, { response: "child_ready" }, 0, "child_handoff");
        });
      },
    };

  const childAssentNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <main class="ksize-shell">
          <section class="ksize-screen ksize-assent-screen">
            <div class="ksize-child-turn-badge">Child’s turn</div>
            <div class="ksize-helper ksize-helper-start ksize-assent-study-helper" aria-hidden="true">
              <div class="ksize-helper-face">
                <span class="ksize-eye ksize-eye-left"></span>
                <span class="ksize-eye ksize-eye-right"></span>
                <span class="ksize-mouth"></span>
              </div>
            </div>
            <header class="ksize-assent-heading">
              <span class="ksize-setup-eyebrow">Before we play</span>
              <h1>Want to play a fun game?</h1>
              <p>I’ll show you some shapes. Tap the buttons to tell me what you think!</p>
            </header>
            <div class="ksize-assent-points">
              <article><span aria-hidden="true">✓</span><p>Say whatever you think!</p></article>
              <article><span aria-hidden="true">■</span><p>The camera stays on.</p></article>
              <article><span aria-hidden="true">♡</span><p>You can stop at any time.</p></article>
            </div>
            <button class="ksize-parent-listen ksize-assent-audio" type="button"><span aria-hidden="true">▶</span><span>Listen</span></button>
            <div class="ksize-assent-actions">
              <button class="ksize-assent-yes" type="button"><span aria-hidden="true">✓</span> Yes!</button>
              <button class="ksize-assent-no" type="button">No, thank you</button>
            </div>
          </section>
        </main>
      `,
      choices: [],
      data: {
        slide_kind: "child_assent",
      },
      on_load: () => {
        installResearcherSkip(jsPsych);
        const playAssentAudio = () => audio.playFile(CHILD_ASSENT_AUDIO, CHILD_ASSENT_TEXT);
        document.querySelector(".ksize-assent-audio")?.addEventListener("click", playAssentAudio);
        window.setTimeout(playAssentAudio, 500);
        document.querySelector(".ksize-assent-yes")?.addEventListener("click", () => {
          audio.stop();
          playIntroOpeningMusic();
          finishWithReward(jsPsych, { response: "yes", child_assent: true }, 0, "child_assent");
        });
        document.querySelector(".ksize-assent-no")?.addEventListener("click", () => {
          audio.stop();
          jsPsych.data.write({
            slide_kind: "child_assent",
            response: "no",
            child_assent: false,
          });
          jsPsych.endExperiment(`
            <main class="ksize-shell">
              <section class="ksize-screen ksize-assent-decline-screen">
                <div class="ksize-assent-decline-icon" aria-hidden="true">♡</div>
                <h1>That’s okay!</h1>
                <p>Thank you for telling us. You do not have to play today.</p>
                <p class="ksize-small">Grown-up: you may close this page.</p>
              </section>
            </main>
          `);
        });
      },
      on_finish: () => audio.stop(),
    };

  const welcomeNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <main class="ksize-shell">
          <section class="ksize-screen ksize-start-screen ksize-welcome-screen">
            <div class="ksize-welcome-sky" aria-hidden="true">
              <span class="ksize-welcome-floater ksize-welcome-star ksize-welcome-floater-1">★</span>
              <span class="ksize-welcome-floater ksize-welcome-circle ksize-welcome-floater-2"></span>
              <span class="ksize-welcome-floater ksize-welcome-diamond ksize-welcome-floater-3"></span>
              <span class="ksize-welcome-floater ksize-welcome-coin ksize-welcome-floater-4">C</span>
              <span class="ksize-welcome-floater ksize-welcome-star ksize-welcome-floater-5">✦</span>
              <span class="ksize-welcome-floater ksize-welcome-triangle ksize-welcome-floater-6"></span>
              <span class="ksize-welcome-floater ksize-welcome-circle ksize-welcome-floater-7"></span>
              <span class="ksize-welcome-floater ksize-welcome-coin ksize-welcome-floater-8">C</span>
              <span class="ksize-welcome-floater ksize-welcome-star ksize-welcome-floater-9">★</span>
              <span class="ksize-welcome-floater ksize-welcome-diamond ksize-welcome-floater-10"></span>
            </div>
            ${compactRewardHudHtml()}
            <div class="ksize-child-turn-badge">Child’s turn</div>
            <div class="ksize-helper ksize-helper-start" aria-hidden="true">
              <div class="ksize-helper-face">
                <span class="ksize-eye ksize-eye-left"></span>
                <span class="ksize-eye ksize-eye-right"></span>
                <span class="ksize-mouth"></span>
              </div>
              <div class="ksize-helper-bubble">Ready?</div>
            </div>
            <h1 class="ksize-title">Who Will Help?</h1>
            <p class="ksize-text">Listen and play. Earn coins as you go, then see a silly coin party at the end.</p>
            <p class="ksize-start-cue">When you are ready, hit the green button to start.</p>
            <div class="ksize-controls">
              <button class="ksize-audio-btn ksize-icon-btn ksize-start-audio ksize-prompt-glow" type="button" aria-label="Play">
                <span class="ksize-icon-symbol" aria-hidden="true">▶</span>
                <span class="ksize-icon-label">Play</span>
              </button>
              <button class="ksize-next-btn ksize-icon-btn" type="button" aria-label="Start">
                <span class="ksize-icon-symbol" aria-hidden="true">➜</span>
                <span class="ksize-icon-label">Start</span>
              </button>
            </div>
          </section>
        </main>
      `,
      choices: [],
      on_load: () => {
        installResearcherSkip(jsPsych);
        const playButton = document.querySelector(".ksize-start-audio");
        const startButton = document.querySelector(".ksize-next-btn");
        const runWelcomeSequence = async ({ includeOpening = true } = {}) => {
          welcomeSequenceToken += 1;
          const sequenceToken = welcomeSequenceToken;
          if (includeOpening) playIntroOpeningMusic();
          await new Promise((resolve) => window.setTimeout(resolve, 4100));
          if (sequenceToken !== welcomeSequenceToken) return;
          stopIntroMusic();
          playButton?.classList.remove("ksize-prompt-glow");
          await audio.playFile(START_INTRO_AUDIO, START_INTRO_TEXT);
          if (sequenceToken !== welcomeSequenceToken) return;
          playIntroOpeningMusic();
          startButton?.classList.add("ksize-prompt-glow");
        };
        runWelcomeSequence({ includeOpening: !introMusicStopper });
        playButton?.addEventListener("click", async () => {
          welcomeSequenceToken += 1;
          stopIntroMusic();
          audio.stop();
          playButton.classList.remove("ksize-prompt-glow");
          await audio.playFile(START_INTRO_AUDIO, START_INTRO_TEXT);
          playIntroOpeningMusic();
          startButton?.classList.add("ksize-prompt-glow");
        });
        startButton?.addEventListener("click", () => {
          welcomeSequenceToken += 1;
          stopIntroMusic();
          audio.stop();
          finishWithReward(jsPsych, { response: "start" }, 0, "start_game");
        });
      },
      on_finish: () => {
        welcomeSequenceToken += 1;
        stopIntroMusic();
        audio.stop();
      },
    };
  const rewardNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <main class="ksize-shell">
          <section class="ksize-screen ksize-reward-screen">
            ${rewardHudHtml()}
            <div class="ksize-reward-stage" aria-hidden="true">
              <div class="ksize-coin-rain">
                ${COIN_RAIN_HTML}
              </div>
              <div class="ksize-dance-helper">
                <span class="ksize-dance-eye ksize-dance-eye-left"></span>
                <span class="ksize-dance-eye ksize-dance-eye-right"></span>
                <span class="ksize-dance-mouth"></span>
              </div>
              <div class="ksize-dance-coin ksize-dance-coin-1">C</div>
              <div class="ksize-dance-coin ksize-dance-coin-2">C</div>
              <div class="ksize-dance-coin ksize-dance-coin-3">C</div>
              <div class="ksize-dance-coin ksize-dance-coin-4">C</div>
            </div>
            <h1 class="ksize-title">Coin party!</h1>
            <p class="ksize-text">Hooray! You did it!</p>
            <p class="ksize-small">You finished the game. Thanks so much for playing! You earned <span class="ksize-reward-total">${rewardCoins}</span> coins.</p>
            <p class="ksize-reward-auto-note">The celebration will continue on its own.</p>
            <div class="ksize-controls">
              <button class="ksize-next-btn ksize-icon-btn" type="button" aria-label="Finish">
                <span class="ksize-icon-symbol" aria-hidden="true">➜</span>
                <span class="ksize-icon-label">Finish</span>
              </button>
            </div>
          </section>
        </main>
      `,
      choices: [],
      data: {
        slide_kind: "reward",
        reward_goal: REWARD_GOAL_COINS,
      },
      on_load: () => {
        installResearcherSkip(jsPsych);
        updateRewardHud();
        playTaDaSfx();
        const finishButton = document.querySelector(".ksize-next-btn");
        const rewardScreen = document.querySelector(".ksize-reward-screen");
        const glowFinish = () => finishButton?.classList.add("ksize-prompt-glow");
        let partyStarted = false;
        let rewardEnded = false;
        let autoFinishTimer = null;
        const startCoinParty = () => {
          if (rewardEnded) return;
          if (partyStarted) return;
          partyStarted = true;
          rewardScreen?.classList.add("ksize-party-started");
          playCoinPartyMusic();
          glowFinish();
          autoFinishTimer = window.setTimeout(() => {
            completeRewardPage("auto_finish_reward");
          }, 6000);
        };
        const fallbackTimer = window.setTimeout(startCoinParty, 7000);
        const narrationTimer = window.setTimeout(() => {
          if (rewardEnded) return;
          audio.playFile(COIN_PARTY_AUDIO, COIN_PARTY_TEXT, {
            onEnd: () => {
              window.clearTimeout(fallbackTimer);
              startCoinParty();
            },
          });
        }, 1650);
        const cleanupRewardPage = () => {
          rewardEnded = true;
          window.clearTimeout(fallbackTimer);
          window.clearTimeout(narrationTimer);
          if (autoFinishTimer) window.clearTimeout(autoFinishTimer);
          stopRewardMusic();
          audio.stop();
        };
        const completeRewardPage = (response) => {
          if (rewardEnded) return;
          cleanupRewardPage();
          finishWithReward(jsPsych, { response }, 0, "finish_reward");
        };
        finishButton?.addEventListener("click", () => {
          completeRewardPage("finish_reward");
        });
        window.currentRewardPageCleanup = cleanupRewardPage;
      },
      on_finish: () => {
        window.currentRewardPageCleanup?.();
        window.currentRewardPageCleanup = null;
      },
    };
  let stopDoneFireworkSounds = null;
  const doneNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <main class="ksize-shell">
          <section class="ksize-screen ksize-done-screen ksize-grownup-return-screen">
            ${rewardHudHtml()}
            <div class="ksize-firework-field" aria-hidden="true">
              <span class="ksize-firework ksize-firework-1"></span>
              <span class="ksize-firework ksize-firework-2"></span>
              <span class="ksize-firework ksize-firework-3"></span>
              <span class="ksize-firework ksize-firework-4"></span>
              <span class="ksize-firework ksize-firework-5"></span>
            </div>
            <h1 class="ksize-title">Thank you for playing!</h1>
            <p class="ksize-text">Great job—you finished the game!</p>
            <div class="ksize-get-grownup-visual" aria-hidden="true">
              <div class="ksize-get-grownup-child"><span></span><b></b></div>
              <div class="ksize-get-grownup-arrow">➜</div>
              <div class="ksize-get-grownup-adult"><span></span><b></b></div>
            </div>
            <div class="ksize-get-grownup-callout">
              <strong>Please go get your grown-up.</strong>
              <span>They have a few last steps to finish.</span>
            </div>
            <button class="ksize-grownup-here-btn" type="button">Grown-up is here</button>
            <div class="ksize-final-grownup-panel" hidden>
              <span class="ksize-final-grownup-label">For the grown-up</span>
              <h2>The child’s game is complete</h2>
              <p>${requestedChsResponse
                ? "Continue to stop the recording and complete the final Children Helping Science pages, including payment information, a short exit survey, and the study debrief."
                : "Continue to complete the final grown-up steps."}</p>
              <button class="ksize-final-grownup-continue" type="button">Continue to grown-up steps <span aria-hidden="true">➜</span></button>
            </div>
          </section>
        </main>
      `,
      choices: [],
      on_load: () => {
        installResearcherSkip(jsPsych);
        updateRewardHud();
        playOutroMusic();
        stopDoneFireworkSounds = playFireworkSfx({ loop: true });
        const grownupHereButton = document.querySelector(".ksize-grownup-here-btn");
        const grownupPanel = document.querySelector(".ksize-final-grownup-panel");
        const continueButton = document.querySelector(".ksize-final-grownup-continue");
        (async () => {
          await new Promise((resolve) => window.setTimeout(resolve, 350));
          for (const [index, line] of ALL_DONE_AUDIO_SEQUENCE.entries()) {
            if (index > 0) await new Promise((resolve) => window.setTimeout(resolve, 180));
            await audio.playFile(line.src, line.text, {
              volume: line.volume ?? 0.8,
              playbackRate: line.playbackRate ?? 1,
              preservePitch: line.preservePitch ?? true,
            });
          }
          await audio.playFile(CHILD_GET_GROWNUP_AUDIO, CHILD_GET_GROWNUP_TEXT, {
            volume: 0.8,
          });
        })();
        grownupHereButton?.addEventListener("click", () => {
          audio.stop();
          stopDoneFireworkSounds?.();
          stopDoneFireworkSounds = null;
          stopRewardMusic();
          grownupHereButton.hidden = true;
          grownupPanel.hidden = false;
          continueButton?.focus();
        });
        continueButton?.addEventListener("click", () => {
          finishWithReward(jsPsych, { response: "grownup_closeout_continue" }, 0, "grownup_closeout");
        });
      },
      on_finish: () => {
        stopDoneFireworkSounds?.();
        stopDoneFireworkSounds = null;
        stopRewardMusic();
        audio.stop();
      },
    };
  const firstPartKind = selectedPartOrder === "ratings-first" ? PART_DYAD : PART_EVENT;
  const secondPartKind = selectedPartOrder === "ratings-first" ? PART_EVENT : PART_DYAD;
  const firstPartNodes = selectedPartOrder === "ratings-first" ? ratingNodes : storyNodes;
  const secondPartNodes = selectedPartOrder === "ratings-first" ? storyNodes : ratingNodes;
  const reviewNodes = (
    selectedRatingMode === "one-after-story"
      ? [
          parentWelcomeNode,
          setupNode,
          cameraSetupNode,
          childHandoffNode,
          ...(ENABLE_CHILD_ASSENT ? [childAssentNode] : []),
          welcomeNode,
          ...oneAfterStoryNodes,
          rewardNode,
          doneNode,
        ]
      : [
          parentWelcomeNode,
          setupNode,
          cameraSetupNode,
          childHandoffNode,
          ...(ENABLE_CHILD_ASSENT ? [childAssentNode] : []),
          welcomeNode,
          makePartBreakNode(jsPsych, firstPartKind, 1, selectedEventSuffix),
          ...firstPartNodes,
          makePartBreakNode(jsPsych, secondPartKind, 2, selectedEventSuffix),
          ...secondPartNodes,
          rewardNode,
          doneNode,
        ]
  ).map((node, index) => withPreviewIndex(node, index));
  totalPreviewScreens = reviewNodes.length;
  const startIndex = Math.min(requestedPreviewIndex, Math.max(0, reviewNodes.length - 1));
  currentPreviewIndex = startIndex;

  const timeline = [
    { type: jsPsychPreload, images: imagePaths, show_progress_bar: true },
    ...reviewNodes.slice(startIndex),
  ];

  jsPsych.run(timeline);
}

main().catch((error) => {
  document.body.innerHTML = `<pre>${escapeHtml(error.stack || error.message || error)}</pre>`;
});
