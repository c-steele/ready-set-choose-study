/*
  PRODUCTION-READY CHS WRAPPER SOURCE FOR STUDY 6349.

  This source targets the locally reviewed r14-preview-3 Home/School candidate.
  Installing it in CHS remains a separate researcher-controlled action.

  Public title: Who Takes Care? A Colorful Story Game
  Child task name: Who Takes Care?

  CHS handles webcam configuration, guardian video consent, recording,
  participant messaging, the exit survey, and debrief. The child task is
  hosted in an isolated GitHub Pages candidate and runs inside an iframe.

  Between-child assignment:
    2 contexts × 3 role sets × 3 events = 18 cells.
  Live assignment uses CHS's trusted study-specific child hash; that one cell
  and the same seed are reused after reloads. URL, response, and pathname
  fallbacks are restricted to CHS preview or clearly non-CHS local review.
*/

/* Frozen Home/School participant candidate for CHS study 6349. */
var HOME_SCHOOL_CANDIDATE_ROOT_URL =
  "https://c-steele.github.io/ready-set-choose-study/versions/chs-home-school-evelyn-v1";
var HOME_SCHOOL_CANDIDATE_ORIGIN = "https://c-steele.github.io";

var HOME_SCHOOL_STUDY_VERSION = "chs-home-school-evelyn-v1";
var HOME_SCHOOL_CANDIDATE_RELEASE = "chs-home-school-evelyn-v1-r14-preview-3";
var HOME_SCHOOL_CONTEXT_SCRIPT_VERSION = "home_school_context_recipient_aware_v4";
/* Intentionally blank for study 6349. Google mirroring is disabled and CHS
   remains the complete, authoritative primary record. */
var HOME_SCHOOL_SHEETS_WEBHOOK = "";
var HOME_SCHOOL_DATA_MIRROR_CONTRACT = "find-the-caregiver-sheets-v1";
var jsPsych = initJsPsych();
var timeline = [];

/* CHS mirrors live webcam feeds. Keep that behavior for setup, but unmirror
   the recorded-consent playback video so parents see it in its native view. */
var consentPlaybackStyle = document.createElement("style");
consentPlaybackStyle.textContent =
  "div#consent-video-trial video.webcam-feed[controls]," +
  "div#consent-video-trial video.webcam-feed[data-chs-playback-video='true'] {" +
  " transform: rotateY(0deg) !important; direction:ltr !important; }" +
  "div#consent-video-trial #lookit-jspsych-video-container:has(video.webcam-feed[controls])," +
  "div#consent-video-trial #lookit-jspsych-video-container:has(video.webcam-feed[data-chs-playback-video='true']) {" +
  " transform:none !important; direction:ltr !important; }";
document.head.appendChild(consentPlaybackStyle);

function normalizeConsentPlaybackVideo(video) {
  if (!video || !video.matches || !video.matches("video.webcam-feed")) return;
  var isPlayback = video.hasAttribute("controls") || video.controls || !!video.getAttribute("src");
  if (!isPlayback) return;
  video.setAttribute("data-chs-playback-video", "true");
  video.style.setProperty("transform", "rotateY(0deg)", "important");
  video.style.setProperty("direction", "ltr", "important");
  var container = video.parentElement;
  if (container && container.id === "lookit-jspsych-video-container") {
    container.style.setProperty("transform", "none", "important");
    container.style.setProperty("direction", "ltr", "important");
  }
}

function normalizeConsentPlaybackVideos() {
  Array.prototype.forEach.call(
    document.querySelectorAll("div#consent-video-trial video.webcam-feed"),
    normalizeConsentPlaybackVideo
  );
}

var consentPlaybackObserver = new MutationObserver(function(mutations) {
  normalizeConsentPlaybackVideos();
  mutations.forEach(function(mutation) {
    if (mutation.type === "attributes") normalizeConsentPlaybackVideo(mutation.target);
    Array.prototype.forEach.call(mutation.addedNodes || [], function(node) {
      if (!node || node.nodeType !== 1) return;
      normalizeConsentPlaybackVideo(node);
      if (node.querySelectorAll) {
        Array.prototype.forEach.call(node.querySelectorAll("video.webcam-feed"), normalizeConsentPlaybackVideo);
      }
    });
  });
});
consentPlaybackObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["controls", "src", "class", "style"],
  childList: true,
  subtree: true
});
normalizeConsentPlaybackVideos();

function getUrlParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || "";
  } catch (_error) {
    return "";
  }
}

function normalizedChsIdentifier(value) {
  var normalized = String(value == null ? "" : value).trim();
  return normalized && normalized.length <= 200 ? normalized : "";
}

function getInjectedChsResponseId() {
  try {
    /* CHS injects this lexical constant immediately before researcher code. */
    return typeof responseUuid !== "undefined" ? normalizedChsIdentifier(responseUuid) : "";
  } catch (_error) {
    return "";
  }
}

function getRuntimeChsChildId() {
  try {
    var response = window.chs && window.chs.response;
    var attributes = response && response.attributes;
    var childId = attributes && attributes.hash_child_id;
    if (!childId && response && typeof response.get === "function") {
      childId = response.get("hash_child_id");
    }
    if (!childId && response) childId = response.hash_child_id;
    return normalizedChsIdentifier(childId);
  } catch (_error) {
    return "";
  }
}

function getQueryChsResponseId() {
  return normalizedChsIdentifier(
    getUrlParam("response_uuid") ||
    getUrlParam("response") ||
    getUrlParam("CHS_RESPONSE_ID")
  );
}

function getQueryChsChildId() {
  return normalizedChsIdentifier(
    getUrlParam("child") ||
    getUrlParam("CHILD_ID") ||
    getUrlParam("CHS_CHILD_ID")
  );
}

function isInternalChsOrigin(origin) {
  return origin === "https://childrenhelpingscience.com" || origin === "https://lookit.mit.edu";
}

function stableHash(text) {
  var hash = 2166136261;
  var value = String(text || "");
  for (var index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

var HOME_SCHOOL_CONTEXTS = ["HOME", "SCHOOL"];
var HOME_SCHOOL_ROLE_SETS = [
  { dataLabel: "WOMAN", urlValue: "woman", conditionSet: "role" },
  { dataLabel: "MAN", urlValue: "man", conditionSet: "role" },
  { dataLabel: "FAMILY_TEACHER", urlValue: "family", conditionSet: "family" }
];
var HOME_SCHOOL_EVENTS = ["HUG", "FOOD", "HELP"];

/* Cell numbering is fixed and matches the preregistration table:
   1 Woman/Hug/Home, 2 Woman/Hug/School, ...,
   17 Family-Teacher/Help/Home, 18 Family-Teacher/Help/School. */
function assignmentFromCellIndex(zeroBasedCellIndex) {
  var cellIndex = Number(zeroBasedCellIndex);
  if (cellIndex < 0 || cellIndex >= 18 || Math.floor(cellIndex) !== cellIndex) {
    throw new Error("Home/School assignment cell index must be an integer from 0 through 17.");
  }
  var roleSetIndex = Math.floor(cellIndex / 6);
  var eventIndex = Math.floor((cellIndex % 6) / 2);
  var contextIndex = cellIndex % 2;
  var roleSet = HOME_SCHOOL_ROLE_SETS[roleSetIndex];
  var context = HOME_SCHOOL_CONTEXTS[contextIndex];
  var eventName = HOME_SCHOOL_EVENTS[eventIndex];
  return {
    assignmentCell: cellIndex + 1,
    context: context,
    roleSet: roleSet.dataLabel,
    roleSetParam: roleSet.urlValue,
    conditionSet: roleSet.conditionSet,
    event: eventName,
    variantId: "home_school_" + roleSet.urlValue + "_" + eventName.toLowerCase() + "_" + context.toLowerCase()
  };
}

function assignHomeSchoolCell(childLevelKey) {
  return assignmentFromCellIndex(stableHash(childLevelKey) % 18);
}

var isChsPreviewContext = window.location.pathname.split("/").indexOf("preview") !== -1;
var runtimeChsChildId = getRuntimeChsChildId();
var injectedChsResponseId = getInjectedChsResponseId();
var allowUrlIdentityAliases = !isInternalChsOrigin(window.location.origin) || isChsPreviewContext;
var queryChsChildId = allowUrlIdentityAliases ? getQueryChsChildId() : "";
var queryChsResponseId = allowUrlIdentityAliases ? getQueryChsResponseId() : "";
var chsChildId = runtimeChsChildId || queryChsChildId;
var chsResponseId = injectedChsResponseId || queryChsResponseId;
var assignmentKey = runtimeChsChildId || queryChsChildId ||
  (isChsPreviewContext ? (chsResponseId || window.location.pathname) : "");
var assignmentKeyType = runtimeChsChildId
  ? "chs_hash_child_id"
  : (queryChsChildId
      ? (isChsPreviewContext ? "child_id_url_preview" : "child_id_url_local_review")
      : (isChsPreviewContext && chsResponseId
          ? "response_id_preview_fallback"
          : (isChsPreviewContext ? "pathname_preview_fallback" : "missing_identity")));
var assignedCell = assignmentKey ? assignHomeSchoolCell(assignmentKey) : null;
/* One entrypoint serves both contexts; the locked context is passed below. */
var assignedEntrypoint = "index.html";
var candidateRoot = HOME_SCHOOL_CANDIDATE_ROOT_URL.replace(/\/$/, "");
var researcherToolsParam = getUrlParam("researcherTools") === "1" ? "&researcherTools=1" : "";
var sheetsWebhook = String(HOME_SCHOOL_SHEETS_WEBHOOK || "").trim();
if (sheetsWebhook && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(sheetsWebhook)) {
  throw new Error("The approved Google Sheets receiver must be a deployed script.google.com /exec URL.");
}
var dataMirrorParams = sheetsWebhook
  ? "&dataMirrorBridge=parent"
  : "";
var gameUrl = assignedCell
  ? candidateRoot + "/" + assignedEntrypoint +
    "?v=" + encodeURIComponent(HOME_SCHOOL_CANDIDATE_RELEASE) +
    "&syntheticSpeech=0" +
    "&ratingMode=one-after-story" +
    "&contextStudy=1" +
    "&context=" + encodeURIComponent(assignedCell.context) +
    "&set=" + encodeURIComponent(assignedCell.conditionSet) +
    "&roleSet=" + encodeURIComponent(assignedCell.roleSetParam) +
    "&event=" + encodeURIComponent(assignedCell.event) +
    "&seed=" + encodeURIComponent(assignmentKey) +
    "&assignmentCell=" + encodeURIComponent(assignedCell.assignmentCell) +
    "&child=" + encodeURIComponent(chsChildId) +
    "&response=" + encodeURIComponent(chsResponseId) +
    dataMirrorParams +
    researcherToolsParam
  : "about:blank";

var assignmentData = {
  study_version: HOME_SCHOOL_STUDY_VERSION,
  candidate_release: HOME_SCHOOL_CANDIDATE_RELEASE,
  context_script_version: HOME_SCHOOL_CONTEXT_SCRIPT_VERSION,
  assignment_cell: assignedCell ? assignedCell.assignmentCell : null,
  assigned_context: assignedCell ? assignedCell.context : "",
  assigned_role_set: assignedCell ? assignedCell.roleSet : "",
  assigned_event: assignedCell ? assignedCell.event : "",
  assigned_study_variant: assignedCell ? assignedCell.variantId : "",
  assigned_condition_set: assignedCell ? assignedCell.conditionSet : "",
  assignment_method: "fnv1a_mod_18",
  assignment_key_type: assignmentKeyType,
  chs_child_id: chsChildId,
  chs_response_id: chsResponseId,
  external_data_mirror_configured: Boolean(sheetsWebhook),
  external_data_mirror_contract: HOME_SCHOOL_DATA_MIRROR_CONTRACT
};

jsPsych.data.addProperties(assignmentData);

function sheetMirrorMessageMatchesAssignment(message) {
  return Boolean(message) && Boolean(assignedCell) &&
    message.data_mirror_contract === HOME_SCHOOL_DATA_MIRROR_CONTRACT &&
    String(message.study || "") === "K-SIZE-home-school-context" &&
    String(message.chs_response_id || "") === String(chsResponseId || "") &&
    String(message.assigned_context || "").toUpperCase() === assignedCell.context &&
    String(message.role_set || "").toLowerCase() === assignedCell.roleSetParam &&
    String(message.event_suffix || "").toUpperCase() === assignedCell.event &&
    Number(message.assignment_cell) === assignedCell.assignmentCell;
}

function showAssignmentFailure(gameFrame, explanation) {
  var host = gameFrame && gameFrame.parentElement;
  if (!host) return;
  var existing = host.querySelector && host.querySelector("[data-home-school-assignment-error]");
  if (existing) existing.remove();
  var overlay = document.createElement("div");
  overlay.setAttribute("data-home-school-assignment-error", "true");
  overlay.style.cssText = "position:absolute;inset:0;z-index:3;display:grid;place-items:center;padding:24px;background:#f7fbfb;font-family:Arial,sans-serif;color:#213b50;text-align:center";
  var box = document.createElement("div");
  box.style.cssText = "max-width:620px;padding:36px;border-radius:24px;background:#fff;box-shadow:0 15px 42px rgba(35,61,80,.14)";
  var heading = document.createElement("h1");
  heading.style.fontSize = "36px";
  heading.textContent = "The study could not be assigned";
  var copy = document.createElement("p");
  copy.style.cssText = "font-size:20px;line-height:1.45";
  copy.textContent = String(explanation || "Please contact the research team.") + " No fallback condition was used.";
  box.appendChild(heading);
  box.appendChild(copy);
  overlay.appendChild(box);
  host.appendChild(overlay);
}

function compactSheetMirrorRow(row) {
  var compact = {};
  var omitted = {
    stimulus: true,
    html: true,
    url: true,
    user_agent: true,
    facilitator_script: true
  };
  Object.keys(row || {}).forEach(function(key) {
    var value = row[key];
    if (omitted[key] || value === undefined || typeof value === "function") return;
    compact[key] = value;
  });
  return compact;
}

function isSheetMirrorAnswerRow(row) {
  return Boolean(row) && (
    row.slide_kind === "response_choices" ||
    row.slide_kind === "response" ||
    row.choice_index !== undefined && row.choice_index !== null ||
    row.rating_value !== undefined && row.rating_value !== null
  );
}

function sheetMirrorMetadata(source) {
  var keys = [
    "study", "audio_version", "participant_id", "study_id", "session_id",
    "chs_child_id", "chs_response_id", "seed", "event_suffix", "role_set",
    "assigned_context", "study_version", "context_script_version",
    "assignment_cell", "assignment_cell_schema", "assignment_method",
    "assignment_key_type", "rating_mode", "rating_schedule_version",
    "rating_focal_roles", "rating_focal_roles_unique", "part_order",
    "design_version", "relationship_status", "completion_status",
    "completed_at", "data_mirror_mode", "data_mirror_answer_rows_shared"
  ];
  var result = {
    data_mirror_contract: HOME_SCHOOL_DATA_MIRROR_CONTRACT
  };
  keys.forEach(function(key) {
    if (source && source[key] !== undefined) result[key] = source[key];
  });
  return result;
}

function requestSheetMirror(message) {
  if (!sheetsWebhook) return false;
  try {
    var request = fetch(sheetsWebhook, {
      method: "POST",
      mode: "no-cors",
      credentials: "omit",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(message)
    });
    if (request && typeof request.catch === "function") {
      request.catch(function(error) {
        console.warn("Google Sheet mirror request failed", error);
      });
    }
    return true;
  } catch (error) {
    console.warn("Could not start the Google Sheet mirror request", error);
    return false;
  }
}

function mirrorAnswerRowMessage(message) {
  if (!sheetsWebhook || !sheetMirrorMessageMatchesAssignment(message)) return false;
  if (!isSheetMirrorAnswerRow(message.row)) return false;
  return requestSheetMirror(Object.assign(
    sheetMirrorMetadata(message),
    {
      mirror_message_type: "answer_row",
      mirror_row_index: Number(message.mirror_row_index),
      saved_at: message.saved_at || new Date().toISOString(),
      completion_status: "in_progress",
      row: compactSheetMirrorRow(message.row)
    }
  ));
}

function mirrorCompletedSession(gamePayload) {
  if (!sheetsWebhook || !sheetMirrorMessageMatchesAssignment(gamePayload)) {
    return { requested: false, rowCount: 0 };
  }
  var rows = Array.isArray(gamePayload.rows) ? gamePayload.rows : [];
  var answerRows = [];
  rows.forEach(function(row, rowIndex) {
    if (!isSheetMirrorAnswerRow(row)) return;
    var compact = compactSheetMirrorRow(row);
    compact.mirror_row_index = rowIndex;
    answerRows.push(compact);
  });
  var requested = requestSheetMirror(Object.assign(
    sheetMirrorMetadata(gamePayload),
    {
      mirror_message_type: "session_complete",
      rows: answerRows
    }
  ));
  return { requested: requested, rowCount: answerRows.length };
}

var enterFullscreen = {
  type: jsPsychFullscreen,
  fullscreen_mode: true,
  button_label: "Go full screen"
};

var videoConfig = {
  type: chsRecord.VideoConfigPlugin
};

/* STUDY 6349 CONSENT CONFIGURATION:
   The duration, furnished-room stimuli, Home/School manipulation, payment, PI,
   institution, contact, and recording language below are the production source
   values. Google mirroring is intentionally disabled for this release. */
var videoConsent = {
  type: chsRecord.VideoConsentPlugin,
  PIName: "Ashley Thomas",
  institution: "Harvard University",
  PIContact: "athomas@g.harvard.edu",
  summary_statement: "<h2>Before you begin</h2><ul><li>This is a recorded picture game about social relationships and where events happen.</li><li>It takes about 15 minutes.</li><li>You and your child may stop at any time.</li><li>There are no right or wrong answers in this game.</li></ul>",
  payment: "You will receive a $5 Amazon.com gift card after participating. Families may still receive compensation if they stop early. To be eligible, your child must be within the study age range and visible in the study video, including any portion recorded before stopping. Each child can receive one gift card. The gift card will be sent through Children Helping Science messaging within 2 weeks.",
  procedures: "Your participation is completely voluntary; you and your child can choose not to take part. You and your child can agree to take part and later change your mind. The study session will be conducted remotely and recorded through Children Helping Science, an online platform for developmental research studies. During the study, your child will play a picture game called Who Takes Care? The game includes colorful pictures and prerecorded narration. Your child will hear six stories that all take place either at the kid's home or at the kid's school. In each story, someone needs comfort, food, or help and two characters could respond. Your child will select who is more likely to help and then answer questions about the characters, including who is in charge and how much one character loves another. Children do not need to be able to read to participate. Children are randomly assigned to one version of the game; different versions include different locations, relationship sets, and events. The study takes about 15 minutes. Please keep the sound on and let the game audio play. A grown-up may help with the device, but please do not suggest answers or point to a choice. All responses are stored automatically and uploaded to the research team. The recording is used for research purposes so the team can check how children responded during the task. We do not believe there are any risks for your child from participating in this research. Participation is completely voluntary. You and your child can stop at any time without penalty or loss of benefits to which you are otherwise entitled.",
  purpose: "We invite your child to take part in a research study about how children connect caregiving with different kinds of social relationships and settings. Children notice social roles, relationships, and locations and use them to make predictions about what people will do. This study asks whether children's caregiving expectations differ when the same kinds of events take place at home versus at school. By comparing children's helper choices with their answers about authority and affection, we can learn how they connect caregiving with relationships and settings.",
  research_rights_statement: "You are not waiving any legal claims, rights, or remedies because of your participation in this research study. If you have questions, concerns, or complaints, or think the research has hurt your child, talk to the research team at 617-384-7777. You can also contact the PI, Ashley Thomas, at athomas@g.harvard.edu. This research has been reviewed and approved by the Harvard University Area Institutional Review Board. You may talk to them at (617) 496-2847 or cuhs@harvard.edu if: <ul><li>Your questions, concerns, or complaints are not being answered by the research team.</li><li>You cannot reach the research team.</li><li>You want to talk to someone besides the research team.</li><li>You have questions about your child's rights as a research subject.</li><li>You want to get information or provide input about this research.</li></ul>"
};

var startRecording = {
  type: chsRecord.StartRecordPlugin
};

var readySetChooseGame = {
  type: jsPsychHtmlButtonResponse,
  choices: [],
  stimulus: '<div style="position:fixed;inset:0;background:#f7fbfb;z-index:9999;">' +
    '<iframe id="ready-set-choose-frame" title="Who Takes Care? child game" ' +
    'allow="autoplay; fullscreen; camera; microphone" ' +
    'style="width:100%;height:100%;border:0;display:block;" ' +
    'src="' + gameUrl + '"></iframe>' +
    '</div>',
  data: {
    trial_type: "ready_set_choose_home_school_iframe",
    study_version: HOME_SCHOOL_STUDY_VERSION,
    candidate_release: HOME_SCHOOL_CANDIDATE_RELEASE,
    context_script_version: HOME_SCHOOL_CONTEXT_SCRIPT_VERSION,
    assignment_cell: assignedCell ? assignedCell.assignmentCell : null,
    assigned_context: assignedCell ? assignedCell.context : "",
    assigned_role_set: assignedCell ? assignedCell.roleSet : "",
    assigned_event: assignedCell ? assignedCell.event : "",
    assigned_study_variant: assignedCell ? assignedCell.variantId : "",
    assigned_condition_set: assignedCell ? assignedCell.conditionSet : "",
    assignment_method: "fnv1a_mod_18",
    assignment_key_type: assignmentKeyType,
    chs_child_id: chsChildId,
    chs_response_id: chsResponseId,
    external_data_mirror_configured: Boolean(sheetsWebhook),
    external_data_mirror_contract: HOME_SCHOOL_DATA_MIRROR_CONTRACT,
    game_url: gameUrl
  },
  on_load: function() {
    var gameFrame = document.getElementById("ready-set-choose-frame");
    if (!assignedCell) {
      showAssignmentFailure(
        gameFrame,
        "No trusted CHS child identity was available. Live CHS runs require the study-specific child ID supplied by CHS; preview fallbacks are never used for a live assignment."
      );
      return;
    }
    window.readySetChooseMessageHandler = function(event) {
      if (!event || !event.data) return;
      if (event.origin !== HOME_SCHOOL_CANDIDATE_ORIGIN) return;
      if (!gameFrame || event.source !== gameFrame.contentWindow) return;
      if (event.data.type === "DATA_MIRROR_ROW") {
        mirrorAnswerRowMessage(event.data);
        return;
      }
      if (event.data.type !== "GAME_COMPLETE") return;
      var gamePayload = event.data.payload || {};
      var payloadMatchesAssignment =
        String(gamePayload.assigned_context || "").toUpperCase() === assignedCell.context &&
        String(gamePayload.role_set || "").toLowerCase() === assignedCell.roleSetParam &&
        String(gamePayload.event_suffix || "").toUpperCase() === assignedCell.event &&
        Number(gamePayload.assignment_cell) === assignedCell.assignmentCell;
      if (!payloadMatchesAssignment) return;
      window.removeEventListener("message", window.readySetChooseMessageHandler);
      window.readySetChooseMessageHandler = null;
      var sheetMirror = mirrorCompletedSession(gamePayload);
      jsPsych.finishTrial({
        completed_game: true,
        game_session_id: event.data.session_id || "",
        game_chs_child_id: event.data.chs_child_id || "",
        game_chs_response_id: event.data.chs_response_id || "",
        study_version: HOME_SCHOOL_STUDY_VERSION,
        candidate_release: HOME_SCHOOL_CANDIDATE_RELEASE,
        context_script_version: HOME_SCHOOL_CONTEXT_SCRIPT_VERSION,
        assignment_cell: assignedCell.assignmentCell,
        assigned_context: assignedCell.context,
        assigned_role_set: assignedCell.roleSet,
        assigned_event: assignedCell.event,
        assigned_study_variant: assignedCell.variantId,
        assigned_condition_set: assignedCell.conditionSet,
        assignment_method: "fnv1a_mod_18",
        assignment_key_type: assignmentKeyType,
        data_posted: event.data.data_posted || false,
        data_post_status: event.data.data_post_status || "",
        external_data_mirror_configured: Boolean(sheetsWebhook),
        external_data_mirror_contract: HOME_SCHOOL_DATA_MIRROR_CONTRACT,
        sheet_mirror_requested: sheetMirror.requested,
        sheet_mirror_row_count: sheetMirror.rowCount,
        game_payload_json: JSON.stringify(gamePayload)
      });
    };
    window.addEventListener("message", window.readySetChooseMessageHandler);
  },
  on_finish: function() {
    if (window.readySetChooseMessageHandler) {
      window.removeEventListener("message", window.readySetChooseMessageHandler);
      window.readySetChooseMessageHandler = null;
    }
  }
};

var stopRecording = {
  type: chsRecord.StopRecordPlugin
};

var exitSurvey = {
  type: chsSurvey.ExitSurveyPlugin,
  includeWithdrawalExample: false
};

var debrief = {
  type: jsPsychHtmlButtonResponse,
  stimulus: '<div style="min-height:calc(100vh - 90px);padding:34px 20px;background:linear-gradient(145deg,#fff9d9 0%,#edfaff 55%,#f7f1ff 100%);box-sizing:border-box;font-family:Arial,sans-serif;color:#263b50;text-align:left;">' +
    '<main style="max-width:920px;margin:0 auto;">' +
      '<header style="display:flex;align-items:center;gap:18px;margin-bottom:22px;padding:26px 28px;border-radius:24px;background:#fff;box-shadow:0 15px 38px rgba(41,62,82,.12);">' +
        '<div style="display:grid;place-items:center;flex:0 0 78px;width:78px;height:78px;border-radius:50%;background:#ffd15c;border:7px solid #fff;box-shadow:0 6px 18px rgba(41,62,82,.16);font-size:38px;">✓</div>' +
        '<div><span style="color:#278473;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;">Study complete</span><h2 style="margin:5px 0 4px;font-size:40px;line-height:1.05;color:#17466f;text-align:left;">Thank you for participating!</h2></div>' +
      '</header>' +
      '<section style="display:grid;gap:14px;">' +
        '<article style="padding:22px 24px;border-left:7px solid #4f91c8;border-radius:16px;background:#fff;box-shadow:0 8px 22px rgba(41,62,82,.08);"><h3 style="margin:0 0 8px;font-size:22px;color:#17466f;">1. What we are studying</h3><p style="margin:0;font-size:17px;line-height:1.55;">We want to understand how children use relationships and settings to predict who will provide care. Children are randomly assigned to stories that all take place either at the kid\'s home or at the kid\'s school. We compare patterns across these versions.</p></article>' +
        '<article style="padding:22px 24px;border-left:7px solid #57ad95;border-radius:16px;background:#fff;box-shadow:0 8px 22px rgba(41,62,82,.08);"><h3 style="margin:0 0 8px;font-size:22px;color:#245c50;">2. What your child did</h3><p style="margin:0;font-size:17px;line-height:1.55;">Your child heard six stories about family members, friends, a teacher, and a classmate. Depending on their assigned version, your child chose who they thought would respond at home or at school and answered questions about the people in the pictures.</p></article>' +
        '<article style="padding:22px 24px;border-left:7px solid #9a7bd5;border-radius:16px;background:#fff;box-shadow:0 8px 22px rgba(41,62,82,.08);"><h3 style="margin:0 0 8px;font-size:22px;color:#5b438e;">3. How we interpret the answers</h3><p style="margin:0;font-size:17px;line-height:1.55;">Children may make different choices for many reasons, and every answer is okay. We look at patterns across many children rather than judging any individual response.</p></article>' +
        '<article style="padding:22px 24px;border-left:7px solid #e3ad39;border-radius:16px;background:#fff;box-shadow:0 8px 22px rgba(41,62,82,.08);"><h3 style="margin:0 0 8px;font-size:22px;color:#755619;">4. Gift card</h3><p style="margin:0;font-size:17px;line-height:1.55;">Your $5 Amazon.com gift card will be sent through Children Helping Science messaging within 2 weeks. Families may still receive compensation if they stop early, provided the child is within the study age range and visible in the portion of video recorded before stopping.</p></article>' +
        '<article style="padding:22px 24px;border-left:7px solid #f07b6d;border-radius:16px;background:#fff;box-shadow:0 8px 22px rgba(41,62,82,.08);"><h3 style="margin:0 0 8px;font-size:22px;color:#994235;">5. Learn more</h3><p style="margin:0;font-size:17px;line-height:1.55;">If you would like to learn more about this topic, please watch this short video: <a href="https://www.youtube.com/watch?v=-G-kVhEqAtE" target="_blank" rel="noopener" style="color:#17466f;font-weight:700;">https://www.youtube.com/watch?v=-G-kVhEqAtE</a><br><br>Thank you again for your participation!</p></article>' +
      '</section>' +
    '</main></div>',
  choices: ["Finish"],
  data: {
    trial_type: "debrief"
  }
};

timeline.push(
  videoConfig,
  videoConsent,
  startRecording,
  readySetChooseGame,
  stopRecording,
  exitSurvey,
  debrief
);

jsPsych.run(timeline);
