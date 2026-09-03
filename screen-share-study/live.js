(function installLiveScreenShareLauncher(globalObject, documentObject) {
  "use strict";

  const assignmentApi = globalObject.FTCZoomAssignment;
  if (!assignmentApi) throw new Error("The study assignment helper did not load.");

  const MODES = Object.freeze({
    "teacher-classmate": Object.freeze({
      value: "teacher-classmate",
      studyVersion: "teacher-classmate-preview",
      label: "Current + Teacher–Classmate",
      storyCount: 6,
    }),
    v76: Object.freeze({
      value: "v76",
      studyVersion: "chs-v76",
      label: "Original CHS v76",
      storyCount: 5,
    }),
  });

  const PARTS = Object.freeze({
    stories: Object.freeze({
      title: "Story choices",
      detail: "Hug, Help, or Food stories",
    }),
    ratings: Object.freeze({
      title: "Pair ratings",
      detail: "Like, love, in charge, strong, and old",
    }),
  });

  function normalizeParticipantId(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, "-")
      .toUpperCase();
  }

  function safeKey(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  }

  function selectedMode(value) {
    return MODES[value] || MODES["teacher-classmate"];
  }

  function partOrderForKey(participantId) {
    const normalizedId = normalizeParticipantId(participantId);
    const orderHash = assignmentApi.stableHash(`${normalizedId}:two-part-order`);
    const storiesFirst = orderHash % 2 === 0;
    return {
      hash: orderHash,
      value: storiesFirst ? "stories-first" : "ratings-first",
      first: storiesFirst ? PARTS.stories : PARTS.ratings,
      second: storiesFirst ? PARTS.ratings : PARTS.stories,
    };
  }

  function assignmentForParticipant(participantId) {
    const normalizedId = normalizeParticipantId(participantId);
    return {
      participantId: normalizedId,
      condition: assignmentApi.assignmentForKey(normalizedId),
      partOrder: partOrderForKey(normalizedId),
    };
  }

  function timestampToken(now = Date.now()) {
    return new Date(now).toISOString().replace(/\D/g, "").slice(0, 17);
  }

  function makeSessionId(participantId, mode, now = Date.now()) {
    return `live-${safeKey(participantId)}-${safeKey(mode.value)}-${timestampToken(now)}`;
  }

  function automaticIdToken() {
    if (typeof globalObject.crypto?.randomUUID === "function") {
      return globalObject.crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    }
    if (typeof globalObject.crypto?.getRandomValues === "function") {
      const values = new Uint32Array(2);
      globalObject.crypto.getRandomValues(values);
      return Array.from(values, (value) => value.toString(16).padStart(8, "0")).join("").slice(0, 8).toUpperCase();
    }
    return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0").toUpperCase();
  }

  function makeAutomaticParticipantId(now = Date.now(), token = automaticIdToken()) {
    const anonymousToken = safeKey(token).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()
      || "SESSION";
    return `AUTO-${timestampToken(now)}-${anonymousToken}`;
  }

  function buildStudyUrl(participantId, modeValue, baseHref, now = Date.now()) {
    const normalizedId = normalizeParticipantId(participantId);
    if (normalizedId.length < 3) throw new Error("Enter a de-identified participant ID with at least three characters.");

    const mode = selectedMode(modeValue);
    const assignment = assignmentForParticipant(normalizedId);
    const sessionId = makeSessionId(normalizedId, mode, now);
    const url = new URL("index.html", baseHref);
    const values = {
      facilitator: "1",
      facilitatorChild: "1",
      liveShare: "1",
      skipParentSetup: "1",
      facilitatorSession: sessionId,
      pid: normalizedId,
      seed: normalizedId,
      session_id: sessionId,
      STUDY_ID: "ftc-live-screen-share-interleaved-unique-roles-v2",
      roleSet: assignment.condition.role.value,
      set: assignment.condition.role.set,
      event: assignment.condition.event,
      studyVersion: mode.studyVersion,
      ratingMode: "one-after-story",
      syntheticSpeech: "0",
      researcherTools: "1",
      showReadAloud: "0",
      downloadData: "1",
      showDataStatus: "1",
      exportFormat: "csv",
      previewIndex: "0",
    };
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
    return {
      url,
      participantId: normalizedId,
      sessionId,
      mode,
      condition: assignment.condition,
      partOrder: assignment.partOrder,
    };
  }

  const launcherApi = Object.freeze({
    MODES,
    PARTS,
    normalizeParticipantId,
    safeKey,
    selectedMode,
    partOrderForKey,
    assignmentForParticipant,
    makeSessionId,
    makeAutomaticParticipantId,
    buildStudyUrl,
  });
  globalObject.FTCLiveLauncher = launcherApi;

  if (!documentObject) return;

  function openAutomaticSession() {
    const participantId = makeAutomaticParticipantId();
    const launch = buildStudyUrl(participantId, "teacher-classmate", globalObject.location.href);
    const status = documentObject.querySelector("[data-auto-status]");
    const fallback = documentObject.querySelector("[data-auto-fallback]");
    if (fallback) fallback.href = launch.url.toString();
    if (status) status.textContent = "Opening the child study…";
    globalObject.location.replace(launch.url.toString());
  }

  if (documentObject.readyState === "loading") {
    documentObject.addEventListener("DOMContentLoaded", openAutomaticSession, { once: true });
  } else {
    openAutomaticSession();
  }
})(window, document);
