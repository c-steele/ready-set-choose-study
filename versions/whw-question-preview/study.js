const page = new URL(window.location.href);
const query = page.searchParams;
const original = new URL("../chs-home-school-evelyn-v1/", page);
const root = new URL("../../", page);
const data = name => new URL("data/" + name, original).href;
const orders = {
  will: ["will"],
  "has-to": ["has-to"],
  "will-first": ["will", "has-to"],
  "has-to-first": ["has-to", "will"]
};
let question = query.get("question");
if (question === "paired") {
  question = crypto.getRandomValues(new Uint8Array(1))[0] < 128 ? "will-first" : "has-to-first";
  query.set("question", question);
}
if (!Object.hasOwn(orders, question)) question = "will";

// Only these controls are available on the independent researcher preview.
const controls = ["question", "event", "roleSet", "context", "start", "previewIndex", "previewEnd", "openNavigator"];
for (const key of [...query.keys()]) {
  if (!controls.includes(key)) query.delete(key);
}
history.replaceState(null, "", page);

// Keep the scene, the two options and their narration identical across prompts.
function helpingQuestions(setting, care, event) {
  return orders[question].map((type, index) => ({
    type,
    order: question,
    position: index + 1,
    text: type === "will" ? event.questionText : event.questionText.replace(/\bwho will\b/i, "who has to"),
    src: type === "will" ? event.questionAudio
      : "versions/chs-home-school-evelyn-v1/audio/home_school_neutral/whw-preview-has-to-"
        + setting.toLowerCase() + "-" + care.toLowerCase() + ".mp3"
  }));
}

function run() {
  window.KSIZE_RUNTIME_CONFIG = Object.freeze({
    assetBaseUrl: root.href,
    lockedStudyVersion: "home-school",
    lockedDataStudyVersion: "who-helps-where-preview-" + question,
    settingLanguage: "neutral",
    roleSet: "woman",
    context: "HOME",
    event: "HUG",
    set: "role",
    withinChildContexts: "1",
    ratingMode: "none",
    seed: "whw-preview-4",
    researcherTools: "1",
    researcherJump: "1",
    immediateChildStart: "1",
    downloadData: "0",
    showDataStatus: "0",
    // Four family screens and the child welcome precede the first story.
    // Its two entrance slides, three character slides, setting and need come
    // before the first choice. The navigator supplies explicit indices later.
    previewIndex: query.get("start") === "question" ? 12 : 0,
    dyadManifestUrl: data("dyad_manifest.json"),
    eventManifestUrl: data("ksize_manifest.json"),
    introImageFixesUrl: data("intro_image_fixes.json"),
    canonicalAudioManifestUrl: data("canonical_audio_manifest_evelyn.json"),
    teacherClassmateAudioManifestUrl: data("teacher_classmate_audio_manifest.json"),
    homeSchoolAudioManifestUrl: data("home_school_audio_manifest.json"),
    homeSchoolContextManifestUrl: data("home_school_context_manifest.json"),
    previewHelpingQuestions: helpingQuestions,
    missingHomeSchoolAudioManifestUrl: data("missing_home_school_directional_audio_manifest.json"),
    ratingOptionCuesUrl: data("rating_option_cues.json")
  });
  const player = document.createElement("script");
  player.src = new URL("app.js?v=whw-paired-questions-r1", original).href;
  player.onerror = () => showLoadError();
  document.body.appendChild(player);
}

function showLoadError() {
  document.body.textContent = "The preview could not load. Refresh this page to try again.";
  document.body.setAttribute("role", "alert");
}
run();
