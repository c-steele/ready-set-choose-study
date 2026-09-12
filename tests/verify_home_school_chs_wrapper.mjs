import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const wrapperPath = path.resolve(here, "../chs_ready/home_school_18_cell_wrapper_draft.js");
const source = fs.readFileSync(wrapperPath, "utf8");

const recorded = { properties: null, timeline: null, finishTrials: [] };
const registeredListeners = {};
const gameFrameWindow = {};
const assignmentFailureHost = {
  children: [],
  querySelector() { return null; },
  appendChild(child) { this.children.push(child); },
};
const gameFrame = { contentWindow: gameFrameWindow, parentElement: assignmentFailureHost };
const jsPsych = {
  data: { addProperties(value) { recorded.properties = value; } },
  finishTrial(value) { recorded.finishTrials.push(value); },
  run(value) { recorded.timeline = value; },
};
const inertVideo = {
  matches() { return false; },
  hasAttribute() { return false; },
  getAttribute() { return ""; },
  setAttribute() {},
  style: { setProperty() {} },
};
function makeElement() {
  return {
    textContent: "",
    style: { cssText: "", fontSize: "", setProperty() {} },
    setAttribute() {},
    appendChild() {},
    remove() {},
  };
}
const context = vm.createContext({
  console,
  Math,
  JSON,
  Number,
  String,
  URLSearchParams,
  encodeURIComponent,
  responseUuid: "TEST-RESPONSE",
  initJsPsych() { return jsPsych; },
  jsPsychFullscreen: "jsPsychFullscreen",
  jsPsychHtmlButtonResponse: "jsPsychHtmlButtonResponse",
  chsRecord: {
    VideoConfigPlugin: "VideoConfigPlugin",
    VideoConsentPlugin: "VideoConsentPlugin",
    StartRecordPlugin: "StartRecordPlugin",
    StopRecordPlugin: "StopRecordPlugin",
  },
  chsSurvey: { ExitSurveyPlugin: "ExitSurveyPlugin" },
  MutationObserver: class {
    constructor(callback) { this.callback = callback; }
    observe() {}
  },
  document: {
    createElement: makeElement,
    head: { appendChild() {} },
    documentElement: {},
    getElementById(id) { return id === "ready-set-choose-frame" ? gameFrame : null; },
    querySelectorAll() { return []; },
  },
  window: {
    location: {
      search: "?child=SPOOFED-QUERY-CHILD&response_uuid=SPOOFED-QUERY-RESPONSE",
      pathname: "/studies/6349/run/",
      origin: "https://childrenhelpingscience.com",
    },
    chs: { response: { attributes: { hash_child_id: "TEST-CHILD" } } },
    addEventListener(type, listener) { registeredListeners[type] = listener; },
    removeEventListener(type, listener) {
      if (registeredListeners[type] === listener) delete registeredListeners[type];
    },
  },
  inertVideo,
});

vm.runInContext(source, context, { filename: wrapperPath });

assert.equal(typeof context.assignHomeSchoolCell, "function");
assert.equal(typeof context.assignmentFromCellIndex, "function");
assert.equal(context.chsChildId, "TEST-CHILD", "live CHS must use window.chs.response.attributes.hash_child_id");
assert.equal(context.chsResponseId, "TEST-RESPONSE", "live CHS must use the injected responseUuid");
assert.equal(context.assignmentKey, "TEST-CHILD", "the trusted CHS child hash must drive assignment");
assert.equal(context.assignmentKeyType, "chs_hash_child_id");
assert.doesNotMatch(context.gameUrl, /SPOOFED-QUERY/);
assert.equal(recorded.timeline.length, 7, "consent/recording/game/exit/debrief architecture must remain intact");

const expectedRoleSets = ["WOMAN", "MAN", "FAMILY_TEACHER"];
const expectedEvents = ["HUG", "FOOD", "HELP"];
const expectedContexts = ["HOME", "SCHOOL"];
const seenCells = new Set();

for (let index = 0; index < 18; index += 1) {
  const cell = context.assignmentFromCellIndex(index);
  assert.equal(cell.assignmentCell, index + 1);
  assert.equal(cell.roleSet, expectedRoleSets[Math.floor(index / 6)]);
  assert.equal(cell.event, expectedEvents[Math.floor((index % 6) / 2)]);
  assert.equal(cell.context, expectedContexts[index % 2]);
  seenCells.add(cell.assignmentCell);
}
assert.equal(seenCells.size, 18);

for (let targetCell = 1; targetCell <= 18; targetCell += 1) {
  let matchingKey = "";
  for (let suffix = 0; suffix < 10000; suffix += 1) {
    const key = `CHILD-${targetCell}-${suffix}`;
    if (context.assignHomeSchoolCell(key).assignmentCell === targetCell) {
      matchingKey = key;
      break;
    }
  }
  assert.ok(matchingKey, `must find a deterministic child key for cell ${targetCell}`);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.assignHomeSchoolCell(matchingKey))),
    JSON.parse(JSON.stringify(context.assignHomeSchoolCell(matchingKey))),
    `child assignment must be stable for cell ${targetCell}`,
  );
}

for (const field of [
  "assignment_cell",
  "assigned_context",
  "assigned_role_set",
  "assigned_event",
  "assignment_method",
  "assignment_key_type",
]) {
  assert.ok(Object.hasOwn(recorded.properties, field), `global data must include ${field}`);
}
assert.equal(recorded.properties.external_data_mirror_configured, false);
assert.equal(recorded.properties.external_data_mirror_contract, "find-the-caregiver-sheets-v1");
assert.equal(recorded.properties.chs_child_id, "TEST-CHILD");
assert.equal(recorded.properties.chs_response_id, "TEST-RESPONSE");
assert.equal(recorded.properties.candidate_release, "chs-home-school-evelyn-v1-r15-context-first-preview-1");
assert.doesNotMatch(context.gameUrl, /researcherTools=1/, "live CHS runs must not expose researcher controls");

assert.doesNotMatch(source, /REPLACE_WITH_FROZEN_HOME_SCHOOL_CANDIDATE/);
assert.doesNotMatch(source, /DO NOT PASTE|DRAFT\s*[—-]/i);
assert.match(source, /PRODUCTION-READY CHS WRAPPER SOURCE FOR STUDY 6349/);
assert.match(source, /versions\/chs-home-school-evelyn-v1/);
assert.match(source, /assignedEntrypoint\s*=\s*"index\.html"/);
assert.doesNotMatch(source, /assignedEntrypoint[^;]*(?:home\.html|school\.html)/);
assert.match(source, /context="\s*\+\s*encodeURIComponent\(assignedCell\.context\)/);
assert.match(source, /HOME_SCHOOL_STUDY_VERSION\s*=\s*"chs-home-school-evelyn-v1"/);
assert.match(source, /HOME_SCHOOL_CONTEXT_SCRIPT_VERSION\s*=\s*"home_school_context_first_recipient_aware_v5"/);
assert.match(source, /HOME_SCHOOL_CANDIDATE_RELEASE\s*=\s*"chs-home-school-evelyn-v1-r15-context-first-preview-1"/);
assert.doesNotMatch(source, /chs-home-school-evelyn-v1-r(?:[1-9])(?!\d)/);
assert.match(source, /Who Takes Care\? child game/);
assert.match(source, /HOME_SCHOOL_SHEETS_WEBHOOK\s*=\s*""/);
assert.match(source, /window\.chs\s*&&\s*window\.chs\.response/);
assert.match(source, /attributes\s*&&\s*attributes\.hash_child_id/);
assert.match(source, /typeof responseUuid !== "undefined"/);
assert.match(source, /No fallback condition was used/);
assert.doesNotMatch(context.gameUrl, /dataEndpoint|dataMirrorBridge/);
assert.match(source, /event\.origin\s*!==\s*HOME_SCHOOL_CANDIDATE_ORIGIN/);
assert.match(source, /event\.source\s*!==\s*gameFrame\.contentWindow/);
assert.match(source, /gamePayload\.assigned_context/);
assert.match(source, /gamePayload\.role_set/);
assert.match(source, /gamePayload\.event_suffix/);
assert.match(source, /gamePayload\.assignment_cell/);
assert.doesNotMatch(source, /15[\u2013-]20 minutes/);

function loadIdentityScenario({ origin, pathname, search = "", runtimeChildId = "", responseId }) {
  const localRecorded = { properties: null, timeline: null };
  const localHost = {
    children: [],
    querySelector() { return null; },
    appendChild(child) { this.children.push(child); },
  };
  const localFrame = { contentWindow: {}, parentElement: localHost };
  const localJsPsych = {
    data: { addProperties(value) { localRecorded.properties = value; } },
    finishTrial() {},
    run(value) { localRecorded.timeline = value; },
  };
  const localContext = vm.createContext({
    console,
    Math,
    JSON,
    Number,
    String,
    URLSearchParams,
    encodeURIComponent,
    responseUuid: responseId,
    initJsPsych() { return localJsPsych; },
    jsPsychFullscreen: "jsPsychFullscreen",
    jsPsychHtmlButtonResponse: "jsPsychHtmlButtonResponse",
    chsRecord: {
      VideoConfigPlugin: "VideoConfigPlugin",
      VideoConsentPlugin: "VideoConsentPlugin",
      StartRecordPlugin: "StartRecordPlugin",
      StopRecordPlugin: "StopRecordPlugin",
    },
    chsSurvey: { ExitSurveyPlugin: "ExitSurveyPlugin" },
    MutationObserver: class { observe() {} },
    document: {
      createElement: makeElement,
      head: { appendChild() {} },
      documentElement: {},
      getElementById(id) { return id === "ready-set-choose-frame" ? localFrame : null; },
      querySelectorAll() { return []; },
    },
    window: {
      location: { origin, pathname, search },
      chs: runtimeChildId ? { response: { attributes: { hash_child_id: runtimeChildId } } } : undefined,
      addEventListener() {},
      removeEventListener() {},
    },
  });
  vm.runInContext(source, localContext, { filename: wrapperPath });
  return { context: localContext, recorded: localRecorded, frame: localFrame, host: localHost };
}

const liveWithoutChild = loadIdentityScenario({
  origin: "https://childrenhelpingscience.com",
  pathname: "/studies/6349/run/",
  search: "?child=SPOOFED-CHILD&response=SPOOFED-RESPONSE",
  responseId: "LIVE-RESPONSE",
});
assert.equal(liveWithoutChild.context.chsChildId, "", "live URL child aliases must be ignored");
assert.equal(liveWithoutChild.context.chsResponseId, "LIVE-RESPONSE");
assert.equal(liveWithoutChild.context.assignmentKey, "", "a response ID must not assign a live CHS condition");
assert.equal(liveWithoutChild.context.assignmentKeyType, "missing_identity");
assert.equal(liveWithoutChild.context.assignedCell, null);
assert.equal(liveWithoutChild.context.gameUrl, "about:blank");
liveWithoutChild.recorded.timeline[3].on_load();
assert.equal(liveWithoutChild.host.children.length, 1, "missing live identity must render the fail-closed screen");

const responsePreview = loadIdentityScenario({
  origin: "https://childrenhelpingscience.com",
  pathname: "/responses/PREVIEW-RESPONSE/preview/",
  search: "?response=PREVIEW-RESPONSE",
});
assert.equal(responsePreview.context.assignmentKey, "PREVIEW-RESPONSE");
assert.equal(responsePreview.context.assignmentKeyType, "response_id_preview_fallback");
assert.ok(responsePreview.context.assignedCell, "CHS preview should remain renderable with its response fallback");
assert.match(responsePreview.context.gameUrl, /[?&]researcherTools=1(?:&|$)/, "CHS response previews must expose researcher controls");
assert.match(responsePreview.context.gameUrl, /[?&]researcherToolbar=back-skip(?:&|$)/, "CHS response previews must request the Back/Skip toolbar");

const pathnamePreview = loadIdentityScenario({
  origin: "https://childrenhelpingscience.com",
  pathname: "/responses/path-only/preview/",
});
assert.equal(pathnamePreview.context.assignmentKey, "/responses/path-only/preview/");
assert.equal(pathnamePreview.context.assignmentKeyType, "pathname_preview_fallback");
assert.ok(pathnamePreview.context.assignedCell, "CHS preview should remain renderable with its pathname fallback");
assert.match(pathnamePreview.context.gameUrl, /[?&]researcherTools=1(?:&|$)/, "CHS pathname previews must expose researcher controls");
assert.match(pathnamePreview.context.gameUrl, /[?&]researcherToolbar=back-skip(?:&|$)/, "CHS pathname previews must request the Back/Skip toolbar");

const localReview = loadIdentityScenario({
  origin: "http://127.0.0.1:8000",
  pathname: "/chs_ready/wrapper-review/",
  search: "?child=LOCAL-REVIEW-CHILD",
});
assert.equal(localReview.context.assignmentKey, "LOCAL-REVIEW-CHILD");
assert.equal(localReview.context.assignmentKeyType, "child_id_url_local_review");
assert.doesNotMatch(localReview.context.gameUrl, /researcherTools=1/, "local review links should opt into researcher tools explicitly");

const liveResearcherParam = loadIdentityScenario({
  origin: "https://childrenhelpingscience.com",
  pathname: "/studies/6349/run/",
  search: "?researcherTools=1",
  runtimeChildId: "LIVE-TOOLS-CHILD",
  responseId: "LIVE-TOOLS-RESPONSE",
});
assert.doesNotMatch(
  liveResearcherParam.context.gameUrl,
  /[?&]researcherTools=1(?:&|$)/,
  "a live CHS query parameter must not enable preview-only researcher controls",
);

const iframeTrial = recorded.timeline[3];
assert.equal(iframeTrial.data.trial_type, "ready_set_choose_home_school_iframe");
iframeTrial.on_load();
assert.equal(typeof registeredListeners.message, "function");
const expectedAssignment = context.assignHomeSchoolCell("TEST-CHILD");
const matchingPayload = {
  assigned_context: expectedAssignment.context,
  role_set: expectedAssignment.roleSetParam,
  event_suffix: expectedAssignment.event,
  assignment_cell: expectedAssignment.assignmentCell,
  rows: [{ trial_type: "story_choice", response: 0 }],
};
registeredListeners.message({
  origin: "https://example.invalid",
  source: gameFrameWindow,
  data: { type: "GAME_COMPLETE", payload: matchingPayload },
});
registeredListeners.message({
  origin: "https://c-steele.github.io",
  source: {},
  data: { type: "GAME_COMPLETE", payload: matchingPayload },
});
registeredListeners.message({
  origin: "https://c-steele.github.io",
  source: gameFrameWindow,
  data: { type: "GAME_COMPLETE", payload: { ...matchingPayload, assignment_cell: 99 } },
});
assert.equal(recorded.finishTrials.length, 0, "untrusted or mismatched completion messages must be ignored");
registeredListeners.message({
  origin: "https://c-steele.github.io",
  source: gameFrameWindow,
  data: {
    type: "GAME_COMPLETE",
    session_id: "TEST-SESSION",
    chs_child_id: "TEST-CHILD",
    chs_response_id: "TEST-RESPONSE",
    data_posted: false,
    payload: matchingPayload,
  },
});
assert.equal(recorded.finishTrials.length, 1, "the assigned candidate frame must complete the iframe trial");
assert.equal(recorded.finishTrials[0].assignment_cell, expectedAssignment.assignmentCell);
assert.equal(recorded.finishTrials[0].game_session_id, "TEST-SESSION");
assert.equal(recorded.finishTrials[0].sheet_mirror_requested, false);
assert.equal(recorded.finishTrials[0].sheet_mirror_row_count, 0);
assert.deepEqual(JSON.parse(recorded.finishTrials[0].game_payload_json), matchingPayload);
assert.equal(context.isSheetMirrorAnswerRow({ slide_kind: "response_choices" }), true);
assert.equal(context.isSheetMirrorAnswerRow({ slide_kind: "response" }), true);
assert.equal(context.isSheetMirrorAnswerRow({ slide_kind: "intro" }), false);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.compactSheetMirrorRow({
    slide_kind: "response",
    rating_value: 2,
    stimulus: "<large html>",
    facilitator_script: "read this",
  }))),
  { slide_kind: "response", rating_value: 2 },
);
assert.match(source, /VideoConsentPlugin/);
assert.match(source, /StartRecordPlugin/);
assert.match(source, /StopRecordPlugin/);
assert.match(source, /ExitSurveyPlugin/);
assert.match(source, /GAME_COMPLETE/);

console.log("Verified production-ready CHS study 6349 wrapper: trusted live identity, bounded preview fallbacks, 18 deterministic cells, and intact CHS recording flow.");
