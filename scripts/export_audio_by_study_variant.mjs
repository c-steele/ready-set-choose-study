import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.resolve(projectRoot, "..", "ready_set_choose_audio_by_study");

const variants = {
  woman_roles: [
    "MOM-TEACHER",
    "SISTER-FRIEND",
    "BESTFRIEND-FRIEND",
    "TEACHER-FRIEND",
    "MOM-SISTER",
  ],
  man_roles: [
    "DAD-TEACHER",
    "BROTHER-FRIEND",
    "BESTFRIEND-FRIEND",
    "TEACHER-FRIEND",
    "DAD-BROTHER",
  ],
  family_teacher: [
    "MOM-DAD",
    "SISTER-BROTHER",
    "DAD-KID",
    "MOM-KID",
    "TEACHER-KID",
  ],
};

const conditionDyads = {
  "MOM-SISTER": [["mom-kid", "MKS"], ["sister-kid", "MKS"]],
  "DAD-KID": [["dad-mom", "DMK"], ["kid-mom", "DMK"]],
  "DAD-BROTHER": [["dad-kid", "DKB"], ["brother-kid", "DKB"]],
  "TEACHER-FRIEND": [["teacher-kid", "TKF"], ["friend-kid", "TKF"]],
  "TEACHER-KID": [["teacher-teacher", "TTK"], ["kid-teacher", "TTK"]],
  "MOM-KID": [["mom-dad", "MDK"], ["kid-dad", "MDK"]],
  "MOM-DAD": [["mom-kid", "MKD"], ["dad-kid", "MKD"]],
  "MOM-TEACHER": [["mom-kid", "MKT"], ["teacher-kid", "MKT"]],
  "DAD-TEACHER": [["dad-kid", "DKT"], ["teacher-kid", "DKT"]],
  "SISTER-FRIEND": [["sister-kid", "SKF"], ["friend-kid", "SKF"]],
  "BROTHER-FRIEND": [["brother-kid", "BKF"], ["friend-kid", "BKF"]],
  "SISTER-BROTHER": [["sister-kid", "SKB"], ["brother-kid", "SKB"]],
  "BESTFRIEND-FRIEND": [["best friend-kid", "BFKF"], ["friend-kid", "BFKF"]],
};

const optionLabels = {
  love: ["Does not love", "Loves a little", "Loves a lot"],
  like: ["Does not like", "Likes a little", "Likes a lot"],
  charge: ["Not in charge", "A little in charge", "Very much in charge"],
  old: ["Not old", "A little old", "Very old"],
  strong: ["Not strong", "A little strong", "Very strong"],
};

const sharedAudio = [
  "audio/welcome_with_start_cue_original_voice.mp3",
  "audio/game_start_without_game_1.mp3",
  "audio_preferred/074_ending_Hooray_you_did_it_finished_game_slower_v44.mp3",
  "audio_preferred/075_ending_Thank_you_for_playing_fun_profile_v61.mp3",
  "audio_preferred/075_ending_Were_all_done_fun_profile_v59.mp3",
  "audio_preferred/077_parent_setup_Welcome_grownups.mp3",
  "audio_preferred/078_parent_setup_Three_quick_checks.mp3",
  "audio_preferred/079_parent_setup_Check_the_camera.mp3",
  "audio_preferred/083_parent_handoff_Invite_your_child.mp3",
  "audio_preferred/085_child_closeout_Get_your_grownup.mp3",
];

const normalizeText = (value) => String(value || "")
  .replace(/[’‘]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const normalizeSrc = (value) => String(value || "").split("?")[0].replace(/^\.\//, "");

const hashText = (text) => {
  let hash = 0x811c9dc5;
  for (const char of String(text || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `rating_${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

const readJson = async (relativePath) =>
  JSON.parse(await fs.readFile(path.join(projectRoot, relativePath), "utf8"));

const [eventManifest, dyadManifest, canonicalManifest] = await Promise.all([
  readJson("data/ksize_manifest.json"),
  readJson("data/dyad_manifest.json"),
  readJson("data/canonical_audio_manifest.json"),
]);

const canonicalByText = new Map();
const canonicalBySrc = new Map();
for (const line of canonicalManifest.lines || []) {
  const filename = path.basename(line.output || "");
  if (!filename) continue;
  const preferredPath = `audio_preferred/${filename}`;
  canonicalByText.set(normalizeText(line.text), preferredPath);
  for (const original of line.currentOutputs || []) {
    canonicalBySrc.set(normalizeSrc(original), preferredPath);
  }
}

const resolveAudio = (src, text = "") =>
  canonicalByText.get(normalizeText(text))
  || canonicalBySrc.get(normalizeSrc(src))
  || normalizeSrc(src);

const resolveTextAudio = (text) =>
  canonicalByText.get(normalizeText(text))
  || `audio/${hashText(text)}.mp3`;

const addAudio = (inventory, relativePath, reason) => {
  if (!relativePath) return;
  if (!inventory.has(relativePath)) inventory.set(relativePath, new Set());
  inventory.get(relativePath).add(reason);
};

const addEventBlockAudio = (inventory, trial, suffix) => {
  const block = trial.blocks?.[suffix];
  if (!block) return;

  if (suffix === "INTRO" && block.introSlides?.length) {
    block.introSlides.forEach((slide, slideIndex) => {
      (slide.audioSegments || []).forEach((src) => {
        addAudio(inventory, resolveAudio(src, slide.text), `${trial.id} ${suffix} slide ${slideIndex + 1}`);
      });
    });
    return;
  }

  const lines = String(block.text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const storyImageCount = block.choices?.length ? Math.max(0, block.images.length - 1) : block.images.length;
  const storyLines = lines.slice(0, storyImageCount);
  storyLines.forEach((line, index) => {
    const src = block.audioSegments?.[index];
    if (src) addAudio(inventory, resolveAudio(src, line), `${trial.id} ${suffix} story ${index + 1}`);
  });

  const responseLines = lines.slice(storyLines.length);
  const responseAudio = block.audioSegments?.slice(storyLines.length) || [];
  if (block.choices?.length && responseLines.length > 1) {
    const optionText = responseLines.at(-1);
    responseAudio.forEach((src, index) => {
      const text = index === responseAudio.length - 1 ? optionText : "";
      addAudio(inventory, resolveAudio(src, text), `${trial.id} ${suffix} response ${index + 1}`);
    });
  }
};

const addDyadAudio = (inventory, conditions) => {
  const requested = conditions.flatMap((condition) =>
    (conditionDyads[condition] || []).map(([folder, sourceKey]) => ({ condition, folder, sourceKey }))
  );
  for (const request of requested) {
    const chunks = (dyadManifest.chunks || []).filter((chunk) =>
      chunk.folder === request.folder && chunk.sourceKey === request.sourceKey
    );
    for (const chunk of chunks) {
      for (const responseSlide of chunk.slides.filter((slide) => slide.kind === "response")) {
        const question = chunk.slides.find((slide) =>
          slide.kind === "question" && slide.trait === responseSlide.trait
        )?.text;
        if (question) {
          addAudio(inventory, resolveTextAudio(question), `${request.condition} ${chunk.id} ${responseSlide.trait} question`);
        }
        const labels = optionLabels[responseSlide.trait];
        if (labels) {
          const optionText = `${labels.join(". ")}.`;
          addAudio(inventory, resolveTextAudio(optionText), `${request.condition} ${chunk.id} ${responseSlide.trait} options`);
        }
      }
    }
  }
};

const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;

await fs.mkdir(outputRoot, { recursive: true });

const summary = [];
for (const [variantName, conditions] of Object.entries(variants)) {
  const inventory = new Map();
  sharedAudio.forEach((relativePath) => addAudio(inventory, relativePath, "shared study audio"));

  for (const trial of eventManifest.trials || []) {
    if (!trial.isComplete) continue;
    const condition = trial.blocks?.INTRO?.condition;
    if (!conditions.includes(condition)) continue;
    ["INTRO", "HUG", "FOOD", "HELP"].forEach((suffix) => addEventBlockAudio(inventory, trial, suffix));
  }
  addDyadAudio(inventory, conditions);

  const variantRoot = path.join(outputRoot, variantName);
  await fs.mkdir(variantRoot, { recursive: true });
  const missing = [];
  for (const relativePath of [...inventory.keys()].sort()) {
    const source = path.join(projectRoot, relativePath);
    const destination = path.join(variantRoot, relativePath);
    try {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(source, destination);
    } catch {
      missing.push(relativePath);
    }
  }

  const inventoryRows = [
    ["audio_file", "used_for"],
    ...[...inventory.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([relativePath, reasons]) => [relativePath, [...reasons].sort().join("; ")]),
  ];
  await fs.writeFile(
    path.join(variantRoot, "AUDIO_INVENTORY.csv"),
    inventoryRows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n"
  );

  await fs.writeFile(
    path.join(variantRoot, "README.txt"),
    [
      `Ready, Set, Choose! audio export: ${variantName}`,
      "",
      `Conditions: ${conditions.join(", ")}`,
      `Copied audio files: ${inventory.size - missing.length}`,
      `Missing files: ${missing.length}`,
      "",
      "The folder preserves the same audio/ and audio_preferred/ paths used by the study.",
      "AUDIO_INVENTORY.csv lists each file and the study pages that can use it.",
      "The opening, coin-party, fireworks, and final-page background music is synthesized live in app.js, so those musical cues do not exist as separate audio files.",
      ...(missing.length ? ["", "Missing:", ...missing] : []),
      "",
    ].join("\n")
  );
  summary.push({ variantName, files: inventory.size - missing.length, missing });
}

await fs.writeFile(
  path.join(outputRoot, "README.txt"),
  [
    "Ready, Set, Choose! — audio files by randomized study variant",
    "",
    "woman_roles: woman-role stories and ratings, across HUG, FOOD, and HELP",
    "man_roles: man-role stories and ratings, across HUG, FOOD, and HELP",
    "family_teacher: family/teacher stories and ratings, across HUG, FOOD, and HELP",
    "",
    "Each variant folder includes shared parent/intro/ending narration plus every task clip that can be selected for that condition.",
    "See each AUDIO_INVENTORY.csv for the file-to-page mapping.",
    "Background music and fireworks sounds are synthesized by the browser and therefore are not separate files.",
    "",
  ].join("\n")
);

console.log(JSON.stringify({ outputRoot, summary }, null, 2));
