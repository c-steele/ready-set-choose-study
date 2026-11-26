const page = new URL(window.location.href);
const query = page.searchParams;
const original = new URL("../chs-home-school-evelyn-v1/", page);
const root = new URL("../../", page);
const data = name => new URL("data/" + name, original).href;
const question = query.get("question") === "has-to" ? "has-to" : "will";

// Only these controls are available on the independent researcher preview.
const controls = ["question", "event", "roleSet", "context", "start", "previewIndex", "previewEnd", "openNavigator"];
for (const key of [...query.keys()]) {
  if (!controls.includes(key)) query.delete(key);
}
history.replaceState(null, "", page);

async function run() {
  let contextManifest = data("home_school_context_manifest.json");
  if (question === "has-to") {
    const response = await fetch(contextManifest);
    if (!response.ok) throw new Error("The story materials could not load.");
    const manifest = await response.json();
    // The two role sets in this study always place the child at the center.
    // The shared player applies neutral setting wording and registers the
    // corresponding audio filename in its neutral-setting audio directory.
    for (const [setting, context] of Object.entries(manifest.contexts)) {
      for (const [care, cue] of Object.entries(context.events)) {
        cue.questionText = cue.questionText.replace(/\bwho will\b/i, "who has to");
        cue.questionAudio = "whw-preview-has-to-" + setting.toLowerCase() + "-" + care.toLowerCase() + ".mp3";
      }
    }
    contextManifest = URL.createObjectURL(new Blob([JSON.stringify(manifest)], {type: "application/json"}));
  }

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
    homeSchoolContextManifestUrl: contextManifest,
    missingHomeSchoolAudioManifestUrl: data("missing_home_school_directional_audio_manifest.json"),
    ratingOptionCuesUrl: data("rating_option_cues.json")
  });
  const player = document.createElement("script");
  player.src = new URL("app.js?v=whw-review-navigation-r1", original).href;
  player.onerror = () => showLoadError();
  document.body.appendChild(player);
}

function showLoadError() {
  document.body.textContent = "The preview could not load. Refresh this page to try again.";
  document.body.setAttribute("role", "alert");
}
run().catch(showLoadError);
