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
      facilitatorSession: sessionId,
      pid: normalizedId,
      seed: normalizedId,
      session_id: sessionId,
      STUDY_ID: "ftc-live-screen-share-two-part-v1",
      roleSet: assignment.condition.role.value,
      set: assignment.condition.role.set,
      event: assignment.condition.event,
      studyVersion: mode.studyVersion,
      partOrder: assignment.partOrder.value,
      ratingMode: "all-pairs",
      syntheticSpeech: "0",
      researcherTools: "0",
      downloadData: "1",
      showDataStatus: "1",
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
    buildStudyUrl,
  });
  globalObject.FTCLiveLauncher = launcherApi;

  if (!documentObject) return;

  const form = documentObject.querySelector("[data-live-form]");
  if (!form) return;
  const participantInput = documentObject.querySelector("[data-participant-id]");
  const modeInputs = Array.from(documentObject.querySelectorAll('input[name="studyMode"]'));
  const previewEmpty = documentObject.querySelector("[data-preview-empty]");
  const previewReady = documentObject.querySelector("[data-preview-ready]");
  const previewId = documentObject.querySelector("[data-preview-id]");
  const previewCell = documentObject.querySelector("[data-preview-cell]");
  const previewRole = documentObject.querySelector("[data-preview-role]");
  const previewEvent = documentObject.querySelector("[data-preview-event]");
  const previewMode = documentObject.querySelector("[data-preview-mode]");
  const previewFirst = documentObject.querySelector("[data-preview-first]");
  const previewFirstDetail = documentObject.querySelector("[data-preview-first-detail]");
  const previewSecond = documentObject.querySelector("[data-preview-second]");
  const previewSecondDetail = documentObject.querySelector("[data-preview-second-detail]");
  const startButton = documentObject.querySelector("[data-start-button]");

  function currentMode() {
    const selected = modeInputs.find((input) => input.checked)?.value;
    return selectedMode(selected);
  }

  function renderPreview() {
    const participantId = normalizeParticipantId(participantInput?.value);
    if (participantId.length < 3) {
      previewEmpty.hidden = false;
      previewReady.hidden = true;
      return;
    }

    const mode = currentMode();
    const assignment = assignmentForParticipant(participantId);
    previewId.textContent = participantId;
    previewCell.textContent = `Cell ${assignment.condition.cell + 1} of 9`;
    previewRole.textContent = assignment.condition.role.label;
    previewEvent.textContent = assignment.condition.event[0] + assignment.condition.event.slice(1).toLowerCase();
    previewMode.textContent = `${mode.storyCount} stories`;
    previewFirst.textContent = assignment.partOrder.first.title;
    previewFirstDetail.textContent = assignment.partOrder.first.detail;
    previewSecond.textContent = assignment.partOrder.second.title;
    previewSecondDetail.textContent = assignment.partOrder.second.detail;
    previewEmpty.hidden = true;
    previewReady.hidden = false;
  }

  participantInput?.addEventListener("input", renderPreview);
  participantInput?.addEventListener("blur", () => {
    const normalizedId = normalizeParticipantId(participantInput.value);
    if (normalizedId) participantInput.value = normalizedId;
    renderPreview();
  });
  modeInputs.forEach((input) => input.addEventListener("change", renderPreview));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const participantId = normalizeParticipantId(participantInput?.value);
    if (participantId.length < 3) {
      participantInput?.setCustomValidity("Enter a de-identified participant ID with at least three characters.");
      participantInput?.reportValidity();
      return;
    }
    participantInput.setCustomValidity("");
    participantInput.value = participantId;
    const launch = buildStudyUrl(participantId, currentMode().value, globalObject.location.href);
    startButton.disabled = true;
    startButton.querySelector("strong").textContent = "Opening the study…";
    startButton.querySelector("small").textContent = "This setup page will be replaced in the same tab";
    globalObject.location.assign(launch.url.toString());
  });

  renderPreview();
})(window, document);
