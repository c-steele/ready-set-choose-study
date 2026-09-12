(function installRenditionReview(globalObject, documentObject) {
  "use strict";

  const REVIEW_VERSION = "ftc-rendition-review-v8-unique-colors";
  const STORAGE_KEY = `${REVIEW_VERSION}:checked`;
  const MODE_STORAGE_KEY = `${REVIEW_VERSION}:mode`;
  const PREVIEW_MODES = Object.freeze({
    zoom: Object.freeze({
      value: "zoom",
      label: "Zoom researcher-paced",
      progressLabel: "Zoom runs reviewed",
      openLabel: "Open Zoom rendition",
      help: "The Zoom version is researcher-paced for live screen sharing.",
      summary: "Each opens in manual researcher mode with Back and Skip controls.",
    }),
    chs: Object.freeze({
      value: "chs",
      label: "CHS audio / autoplay",
      progressLabel: "CHS audio runs reviewed",
      openLabel: "Open CHS audio rendition",
      help: "The six-story CHS candidate now has complete prerecorded Evelyn audio and is ready for CHS re-approval review.",
      summary: "Each opens in participant autoplay mode with the proposed Teacher–Classmate story and complete Evelyn narration. The approved CHS v76 study remains unchanged.",
    }),
  });
  const ROLE_SETS = Object.freeze([
    Object.freeze({ value: "woman", label: "Woman", set: "role", scheduleCount: 2 }),
    Object.freeze({ value: "man", label: "Man", set: "role", scheduleCount: 2 }),
    Object.freeze({ value: "family", label: "Family–teacher", set: "family", scheduleCount: 4 }),
  ]);
  const EVENTS = Object.freeze(["HUG", "FOOD", "HELP"]);
  const VISUAL_PLANS = Object.freeze([
    Object.freeze({ value: "a", number: 1, label: "A" }),
    Object.freeze({ value: "b", number: 2, label: "B" }),
    Object.freeze({ value: "c", number: 3, label: "C" }),
    Object.freeze({ value: "d", number: 4, label: "D" }),
  ]);
  const ROLE_CONDITIONS = Object.freeze({
    woman: Object.freeze(["MOM-TEACHER", "SISTER-FRIEND", "BESTFRIEND-FRIEND", "TEACHER-FRIEND", "MOM-SISTER", "TEACHER-CLASSMATE"]),
    man: Object.freeze(["DAD-TEACHER", "BROTHER-FRIEND", "BESTFRIEND-FRIEND", "TEACHER-FRIEND", "DAD-BROTHER", "TEACHER-CLASSMATE"]),
    family: Object.freeze(["MOM-DAD", "SISTER-BROTHER", "DAD-KID", "MOM-KID", "TEACHER-KID", "TEACHER-CLASSMATE"]),
  });
  const ONE_PAIR_SCRIPT_SCHEDULES = Object.freeze([
    Object.freeze({
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
      "TEACHER-CLASSMATE": "kid-CLASSMATE",
    }),
    Object.freeze({
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
      "TEACHER-CLASSMATE": "kid-CLASSMATE",
    }),
  ]);
  const FAMILY_ONE_PAIR_SCRIPT_SCHEDULES = Object.freeze([
    Object.freeze({ "MOM-DAD": "kid-MOM", "SISTER-BROTHER": "kid-SISTER", "DAD-KID": "mom-KID", "MOM-KID": "dad-MOM", "TEACHER-KID": "teacher-TEACHER", "TEACHER-CLASSMATE": "kid-CLASSMATE" }),
    Object.freeze({ "MOM-DAD": "kid-MOM", "SISTER-BROTHER": "kid-BROTHER", "DAD-KID": "mom-KID", "MOM-KID": "dad-MOM", "TEACHER-KID": "teacher-TEACHER", "TEACHER-CLASSMATE": "kid-CLASSMATE" }),
    Object.freeze({ "MOM-DAD": "kid-DAD", "SISTER-BROTHER": "kid-SISTER", "DAD-KID": "mom-DAD", "MOM-KID": "dad-KID", "TEACHER-KID": "teacher-TEACHER", "TEACHER-CLASSMATE": "kid-CLASSMATE" }),
    Object.freeze({ "MOM-DAD": "kid-DAD", "SISTER-BROTHER": "kid-BROTHER", "DAD-KID": "mom-DAD", "MOM-KID": "dad-KID", "TEACHER-KID": "teacher-TEACHER", "TEACHER-CLASSMATE": "kid-CLASSMATE" }),
  ]);

  const FOCUSED_ROLE_BY_SCRIPT = Object.freeze({
    "kid-MOM": "MOM",
    "kid-DAD": "DAD",
    "kid-SISTER": "SISTER",
    "kid-BROTHER": "BROTHER",
    "kid-TEACHER": "TEACHER",
    "kid-FRIEND": "FRIEND",
    "kid-BEST FRIEND": "BEST FRIEND",
    "kid-CLASSMATE": "CLASSMATE",
    "mom-DAD": "MOM",
    "mom-KID": "KID",
    "dad-MOM": "DAD",
    "dad-KID": "KID",
    "teacher-TEACHER": "TEACHER",
    "teacher-KID": "KID",
  });

  function schedulesForRole(role) {
    return role === "family" ? FAMILY_ONE_PAIR_SCRIPT_SCHEDULES : ONE_PAIR_SCRIPT_SCHEDULES;
  }

  function focusedRole(scriptKey) {
    return FOCUSED_ROLE_BY_SCRIPT[scriptKey]
      || String(scriptKey || "").split("-").slice(1).join("-");
  }

  function stableHash(text) {
    let hash = 2166136261;
    const input = String(text || "");
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function scheduleIndexForSeed(seed, scheduleCount) {
    return stableHash(`${seed}:one-pair-schedule`) % scheduleCount;
  }

  function seedForRendition(role, event, visualPlanKey, scheduleIndex, scheduleCount) {
    const stem = `REVIEW-${role.toUpperCase()}-${event}-COLOR-${visualPlanKey.toUpperCase()}-P${scheduleIndex + 1}`;
    for (let suffix = 0; suffix < 10000; suffix += 1) {
      const seed = `${stem}-${suffix}`;
      if (scheduleIndexForSeed(seed, scheduleCount) === scheduleIndex) return seed;
    }
    throw new Error(`Could not create a review seed for ${stem}`);
  }

  function renditionEntries() {
    return ROLE_SETS.flatMap((role) =>
      EVENTS.flatMap((event) =>
        VISUAL_PLANS.flatMap((visualPlan) =>
          Array.from({ length: role.scheduleCount }, (_, scheduleIndex) => {
            const id = `${role.value}-${event.toLowerCase()}-color-${visualPlan.value}-pair-${scheduleIndex + 1}`;
            return Object.freeze({
              id,
              role: role.value,
              roleLabel: role.label,
              set: role.set,
              event,
              visualPlan: visualPlan.number,
              visualPlanKey: visualPlan.value,
              visualPlanLabel: visualPlan.label,
              scheduleIndex,
              scheduleCount: role.scheduleCount,
              pairings: Object.freeze(Object.fromEntries(
                ROLE_CONDITIONS[role.value].map((condition) => [
                  condition,
                  schedulesForRole(role.value)[scheduleIndex][condition],
                ])
              )),
              seed: seedForRendition(role.value, event, visualPlan.value, scheduleIndex, role.scheduleCount),
            });
          })
        )
      )
    );
  }

  function canonicalPrimaryCell(role, event) {
    const roleIndex = ROLE_SETS.findIndex((candidate) => candidate.value === role);
    const eventIndex = EVENTS.indexOf(event);
    return roleIndex < 0 || eventIndex < 0 ? null : eventIndex * ROLE_SETS.length + roleIndex + 1;
  }

  function makeLaunchToken(now = Date.now(), cryptoObject = globalObject.crypto) {
    const timestamp = new Date(now).toISOString().replace(/\D/g, "").slice(0, 17);
    let randomToken = "";
    try {
      if (typeof cryptoObject?.randomUUID === "function") {
        randomToken = cryptoObject.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
      } else if (typeof cryptoObject?.getRandomValues === "function") {
        const values = new Uint32Array(1);
        cryptoObject.getRandomValues(values);
        randomToken = values[0].toString(16).padStart(8, "0").toUpperCase();
      }
    } catch (_error) {
      randomToken = "";
    }
    if (!randomToken) randomToken = Math.random().toString(16).slice(2, 10).padEnd(8, "0").toUpperCase();
    return `${timestamp}-${randomToken}`;
  }

  function buildStudyUrl(entry, baseHref, requestedMode = "zoom", launchToken = "") {
    const mode = PREVIEW_MODES[requestedMode];
    if (!mode) throw new Error(`Unknown review mode: ${requestedMode}`);
    const url = new URL("../versions/chs-v80-balanced-assignment/index.html", baseHref);
    const primaryCell = canonicalPrimaryCell(entry.role, entry.event);
    const ratingPlan = entry.scheduleIndex + 1;
    const assignmentId = `REVIEW-FTC-C${String(primaryCell).padStart(2, "0")}-RP${ratingPlan}-VP${entry.visualPlan}`;
    const commonValues = {
      seed: entry.seed,
      roleSet: entry.role,
      set: entry.set,
      event: entry.event,
      primaryCell,
      ratingPlan,
      visualPlan: entry.visualPlan,
      assignmentId,
      assignmentMethod: "review_preview_only",
      allocatorVersion: "review-preview-v2-unique-colors",
      ratingMode: "one-after-story",
      syntheticSpeech: "0",
      researcherTools: "1",
      showReadAloud: "0",
      downloadData: "0",
      showDataStatus: "0",
      exportFormat: "csv",
    };
    const normalizedLaunchToken = String(launchToken || "")
      .replace(/[^A-Za-z0-9_-]/g, "")
      .slice(0, 80);
    const sessionId = `review-zoom-${entry.id}${normalizedLaunchToken ? `-${normalizedLaunchToken}` : ""}`;
    const values = requestedMode === "chs"
      ? { ...commonValues, previewIndex: "4" }
      : {
          facilitator: "1",
          facilitatorChild: "1",
          liveShare: "1",
          skipParentSetup: "1",
          facilitatorSession: sessionId,
          pid: entry.seed,
          session_id: sessionId,
          STUDY_ID: REVIEW_VERSION,
          ...commonValues,
          studyVersion: "teacher-classmate-preview",
          previewIndex: "0",
        };
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
  }

  function reviewCheckKey(mode, entryId) {
    if (!PREVIEW_MODES[mode]) throw new Error(`Unknown review mode: ${mode}`);
    return `${mode}:${entryId}`;
  }

  const api = Object.freeze({
    REVIEW_VERSION,
    PREVIEW_MODES,
    ROLE_SETS,
    EVENTS,
    VISUAL_PLANS,
    ROLE_CONDITIONS,
    ONE_PAIR_SCRIPT_SCHEDULES,
    FAMILY_ONE_PAIR_SCRIPT_SCHEDULES,
    schedulesForRole,
    focusedRole,
    stableHash,
    scheduleIndexForSeed,
    seedForRendition,
    renditionEntries,
    canonicalPrimaryCell,
    makeLaunchToken,
    buildStudyUrl,
    reviewCheckKey,
  });
  globalObject.FTCRenditionReview = api;

  if (!documentObject) return;

  const entries = renditionEntries();
  const grid = documentObject.querySelector("[data-review-grid]");
  const template = documentObject.querySelector("#review-card-template");
  const progressCount = documentObject.querySelector("[data-progress-count]");
  const progressBar = documentObject.querySelector("[data-progress-bar]");
  const progressLabel = documentObject.querySelector("[data-progress-label]");
  const visibleCount = documentObject.querySelector("[data-visible-count]");
  const modeName = documentObject.querySelector("[data-mode-name]");
  const modeSummary = documentObject.querySelector("[data-mode-summary]");
  const modeHelp = documentObject.querySelector("[data-mode-help]");
  const resetButton = documentObject.querySelector("[data-reset]");
  const modeControls = Array.from(documentObject.querySelectorAll("[data-preview-mode]"));
  const filters = Object.fromEntries(
    Array.from(documentObject.querySelectorAll("[data-filter]")).map((control) => [control.dataset.filter, control])
  );

  function loadChecks() {
    try {
      const parsed = JSON.parse(globalObject.localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  let checks = loadChecks();

  function loadMode() {
    const requestedMode = new URLSearchParams(globalObject.location.search).get("mode");
    if (PREVIEW_MODES[requestedMode]) return requestedMode;
    try {
      const storedMode = globalObject.localStorage.getItem(MODE_STORAGE_KEY);
      return PREVIEW_MODES[storedMode] ? storedMode : "zoom";
    } catch (_error) {
      return "zoom";
    }
  }

  let activeMode = loadMode();

  function saveMode() {
    try {
      globalObject.localStorage.setItem(MODE_STORAGE_KEY, activeMode);
    } catch (_error) {
      // The selector still works when storage is unavailable.
    }
  }

  function saveChecks() {
    try {
      globalObject.localStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
    } catch (_error) {
      // The review board still works when storage is unavailable.
    }
  }

  function updateProgress() {
    const completed = entries.filter((entry) => checks[reviewCheckKey(activeMode, entry.id)]).length;
    progressCount.textContent = `${completed} / ${entries.length}`;
    progressBar.style.width = `${Math.round((completed / entries.length) * 100)}%`;
    progressLabel.textContent = PREVIEW_MODES[activeMode].progressLabel;
  }

  function matchesFilters(entry) {
    if (filters.role.value !== "all" && entry.role !== filters.role.value) return false;
    if (filters.event.value !== "all" && entry.event !== filters.event.value) return false;
    if (filters.visual.value !== "all" && entry.visualPlanKey !== filters.visual.value) return false;
    if (filters.unfinished.checked && checks[reviewCheckKey(activeMode, entry.id)]) return false;
    return true;
  }

  function render() {
    const mode = PREVIEW_MODES[activeMode];
    const visible = entries.filter(matchesFilters);
    grid.replaceChildren();
    grid.dataset.previewMode = activeMode;
    visibleCount.textContent = `${visible.length} ${visible.length === 1 ? "run" : "runs"}`;
    modeName.textContent = mode.label;
    modeSummary.textContent = mode.summary;
    modeHelp.textContent = mode.help;
    resetButton.textContent = `Clear ${activeMode === "zoom" ? "Zoom" : "CHS audio"} checks`;
    modeControls.forEach((control) => {
      control.checked = control.value === activeMode;
    });

    if (!visible.length) {
      const empty = documentObject.createElement("p");
      empty.className = "review-empty";
      empty.textContent = "No unchecked renditions match these filters.";
      grid.append(empty);
      updateProgress();
      return;
    }

    for (const entry of visible) {
      const card = template.content.firstElementChild.cloneNode(true);
      const checkbox = card.querySelector(".review-done input");
      const checkKey = reviewCheckKey(activeMode, entry.id);
      card.dataset.renditionId = entry.id;
      card.classList.toggle("is-reviewed", Boolean(checks[checkKey]));
      card.classList.toggle("is-audio-mode", activeMode === "chs");
      card.querySelector(".review-role").textContent = `${entry.roleLabel} role set`;
      card.querySelector("h2").textContent = `${entry.event[0]}${entry.event.slice(1).toLowerCase()} · Color plan ${entry.visualPlanLabel}`;
      card.querySelector('[data-field="event"]').textContent = entry.event[0] + entry.event.slice(1).toLowerCase();
      card.querySelector('[data-field="visual"]').textContent = `${entry.visualPlanLabel} · six different colors`;
      card.querySelector('[data-field="schedule"]').textContent = `${entry.scheduleIndex + 1} of ${entry.scheduleCount}`;
      const pairingList = card.querySelector(".review-pairing-list");
      Object.entries(entry.pairings).forEach(([condition, scriptKey]) => {
        const item = documentObject.createElement("li");
        const story = documentObject.createElement("span");
        const focus = documentObject.createElement("strong");
        story.textContent = condition.replace("BESTFRIEND", "BEST FRIEND").replaceAll("-", " + ");
        focus.textContent = `rates ${focusedRole(scriptKey)}`;
        item.append(story, focus);
        pairingList.append(item);
      });
      const openLink = card.querySelector(".review-open");
      const prepareLaunch = () => {
        const launchToken = activeMode === "zoom" ? makeLaunchToken() : "";
        openLink.href = buildStudyUrl(entry, globalObject.location.href, activeMode, launchToken).toString();
      };
      prepareLaunch();
      openLink.addEventListener("pointerdown", prepareLaunch);
      openLink.addEventListener("click", prepareLaunch);
      openLink.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") prepareLaunch();
      });
      openLink.querySelector("[data-open-label]").textContent = mode.openLabel;
      checkbox.checked = Boolean(checks[checkKey]);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) checks[checkKey] = true;
        else delete checks[checkKey];
        saveChecks();
        render();
      });
      grid.append(card);
    }
    updateProgress();
  }

  Object.values(filters).forEach((control) => control.addEventListener("change", render));
  modeControls.forEach((control) => control.addEventListener("change", () => {
    if (!control.checked || !PREVIEW_MODES[control.value]) return;
    activeMode = control.value;
    saveMode();
    render();
  }));
  resetButton.addEventListener("click", () => {
    if (!globalObject.confirm(`Clear every ${PREVIEW_MODES[activeMode].label} reviewed check mark?`)) return;
    entries.forEach((entry) => delete checks[reviewCheckKey(activeMode, entry.id)]);
    saveChecks();
    render();
  });
  render();
})(window, document);
