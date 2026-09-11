(function installHomeSchoolReview(globalObject, documentObject) {
  "use strict";

  const REVIEW_VERSION = "who-takes-care-home-school-review-r11";
  const STUDY_RUNTIME_VERSION = "chs-home-school-evelyn-v1-r11";
  const STORAGE_KEY = `${REVIEW_VERSION}:checked`;
  const MODE_STORAGE_KEY = `${REVIEW_VERSION}:mode`;
  const PREVIEW_MODES = Object.freeze({
    zoom: Object.freeze({
      value: "zoom",
      label: "Zoom researcher-paced",
      progressLabel: "Zoom launches reviewed",
      help: "The Zoom version is researcher-paced for live screen sharing.",
      summary: "Each opens in manual researcher mode with Back, Skip, and End controls.",
    }),
    chs: Object.freeze({
      value: "chs",
      label: "CHS-style audio / autoplay",
      progressLabel: "Audio launches reviewed",
      help: "The participant-style version uses the study's prerecorded narration and moves on automatically.",
      summary: "Each opens in participant autoplay mode with the current prerecorded narration.",
    }),
  });
  const CONTEXTS = Object.freeze([
    Object.freeze({ value: "HOME", label: "At Home", shortLabel: "Home", entrypoint: "../versions/chs-home-school-evelyn-v1/index.html" }),
    Object.freeze({ value: "SCHOOL", label: "At School", shortLabel: "School", entrypoint: "../versions/chs-home-school-evelyn-v1/index.html" }),
  ]);
  const ROLE_SETS = Object.freeze([
    Object.freeze({ value: "woman", label: "Woman", set: "role", scheduleCount: 2 }),
    Object.freeze({ value: "man", label: "Man", set: "role", scheduleCount: 2 }),
    Object.freeze({ value: "family", label: "Family–teacher", set: "family", scheduleCount: 4 }),
  ]);
  const EVENTS = Object.freeze(["HUG", "FOOD", "HELP"]);
  const VARIANTS = Object.freeze(["a", "b", "c", "d"]);
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

  function seedForRendition(role, event, variant, scheduleIndex, scheduleCount) {
    const stem = `HOME-SCHOOL-REVIEW-${role.toUpperCase()}-${event}-${variant.toUpperCase()}-P${scheduleIndex + 1}`;
    for (let suffix = 0; suffix < 10000; suffix += 1) {
      const seed = `${stem}-${suffix}`;
      if (scheduleIndexForSeed(seed, scheduleCount) === scheduleIndex) return seed;
    }
    throw new Error(`Could not create a review seed for ${stem}`);
  }

  function renditionEntries() {
    return ROLE_SETS.flatMap((role) =>
      EVENTS.flatMap((event) =>
        VARIANTS.flatMap((variant) =>
          Array.from({ length: role.scheduleCount }, (_, scheduleIndex) => {
            const id = `${role.value}-${event.toLowerCase()}-${variant}-pair-${scheduleIndex + 1}`;
            return Object.freeze({
              id,
              role: role.value,
              roleLabel: role.label,
              set: role.set,
              event,
              variant,
              scheduleIndex,
              scheduleCount: role.scheduleCount,
              pairings: Object.freeze(Object.fromEntries(
                ROLE_CONDITIONS[role.value].map((condition) => [
                  condition,
                  schedulesForRole(role.value)[scheduleIndex][condition],
                ])
              )),
              seed: seedForRendition(role.value, event, variant, scheduleIndex, role.scheduleCount),
            });
          })
        )
      )
    );
  }

  function contextDefinition(requestedContext) {
    const normalized = String(requestedContext || "").toUpperCase();
    const context = CONTEXTS.find((entry) => entry.value === normalized);
    if (!context) throw new Error(`Unknown review context: ${requestedContext}`);
    return context;
  }

  function assignmentCell(requestedContext, requestedRole, requestedEvent) {
    const context = contextDefinition(requestedContext);
    const contextIndex = CONTEXTS.findIndex((entry) => entry.value === context.value);
    const roleIndex = ROLE_SETS.findIndex((entry) => entry.value === String(requestedRole || "").toLowerCase());
    const eventIndex = EVENTS.indexOf(String(requestedEvent || "").toUpperCase());
    if (contextIndex < 0 || roleIndex < 0 || eventIndex < 0) return null;
    return roleIndex * 6 + eventIndex * 2 + contextIndex + 1;
  }

  function buildStudyUrl(entry, baseHref, requestedMode = "zoom", requestedContext = "HOME") {
    const mode = PREVIEW_MODES[requestedMode];
    if (!mode) throw new Error(`Unknown review mode: ${requestedMode}`);
    const context = contextDefinition(requestedContext);
    const url = new URL(context.entrypoint, baseHref);
    const commonValues = {
      v: STUDY_RUNTIME_VERSION,
      seed: entry.seed,
      roleSet: entry.role,
      set: entry.set,
      event: entry.event,
      variant: entry.variant,
      context: context.value,
      ratingMode: "one-after-story",
      syntheticSpeech: "0",
      researcherTools: "1",
      showReadAloud: "0",
      downloadData: "0",
      showDataStatus: "0",
      exportFormat: "csv",
      contextStudy: "1",
    };
    const contextSlug = context.value.toLowerCase();
    const sessionId = `review-home-school-${contextSlug}-${entry.id}`;
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
          previewIndex: "0",
        };
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
  }

  function reviewCheckKey(mode, context, entryId) {
    if (!PREVIEW_MODES[mode]) throw new Error(`Unknown review mode: ${mode}`);
    const normalizedContext = contextDefinition(context).value;
    return `${mode}:${normalizedContext}:${entryId}`;
  }

  const api = Object.freeze({
    REVIEW_VERSION,
    STUDY_RUNTIME_VERSION,
    PREVIEW_MODES,
    CONTEXTS,
    ROLE_SETS,
    EVENTS,
    VARIANTS,
    ROLE_CONDITIONS,
    ONE_PAIR_SCRIPT_SCHEDULES,
    FAMILY_ONE_PAIR_SCRIPT_SCHEDULES,
    schedulesForRole,
    focusedRole,
    stableHash,
    scheduleIndexForSeed,
    seedForRendition,
    renditionEntries,
    assignmentCell,
    buildStudyUrl,
    reviewCheckKey,
  });
  globalObject.FTCHomeSchoolReview = api;

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
    const total = entries.length * CONTEXTS.length;
    const completed = entries.reduce((count, entry) => count + CONTEXTS.filter(
      (context) => checks[reviewCheckKey(activeMode, context.value, entry.id)]
    ).length, 0);
    progressCount.textContent = `${completed} / ${total}`;
    progressBar.style.width = `${Math.round((completed / total) * 100)}%`;
    progressLabel.textContent = PREVIEW_MODES[activeMode].progressLabel;
  }

  function matchesFilters(entry) {
    if (filters.role.value !== "all" && entry.role !== filters.role.value) return false;
    if (filters.event.value !== "all" && entry.event !== filters.event.value) return false;
    if (filters.variant.value !== "all" && entry.variant !== filters.variant.value) return false;
    if (filters.unfinished.checked) {
      const bothReviewed = CONTEXTS.every(
        (context) => checks[reviewCheckKey(activeMode, context.value, entry.id)]
      );
      if (bothReviewed) return false;
    }
    return true;
  }

  function render() {
    const mode = PREVIEW_MODES[activeMode];
    const visible = entries.filter(matchesFilters);
    grid.replaceChildren();
    grid.dataset.previewMode = activeMode;
    visibleCount.textContent = `${visible.length} ${visible.length === 1 ? "configuration" : "configurations"}`;
    modeName.textContent = mode.label;
    modeSummary.textContent = mode.summary;
    modeHelp.textContent = mode.help;
    resetButton.textContent = `Clear ${activeMode === "zoom" ? "Zoom" : "audio"} checks`;
    modeControls.forEach((control) => {
      control.checked = control.value === activeMode;
    });

    if (!visible.length) {
      const empty = documentObject.createElement("p");
      empty.className = "review-empty";
      empty.textContent = "No unchecked configurations match these filters.";
      grid.append(empty);
      updateProgress();
      return;
    }

    for (const entry of visible) {
      const card = template.content.firstElementChild.cloneNode(true);
      const contextChecks = CONTEXTS.map((context) => Boolean(
        checks[reviewCheckKey(activeMode, context.value, entry.id)]
      ));
      card.dataset.renditionId = entry.id;
      card.classList.toggle("is-reviewed", contextChecks.every(Boolean));
      card.classList.toggle("is-audio-mode", activeMode === "chs");
      card.querySelector(".review-role").textContent = `${entry.roleLabel} role set`;
      card.querySelector("h2").textContent = `${entry.event[0]}${entry.event.slice(1).toLowerCase()} · Rendition ${entry.variant.toUpperCase()}`;
      card.querySelector('[data-field="event"]').textContent = entry.event[0] + entry.event.slice(1).toLowerCase();
      card.querySelector('[data-field="variant"]').textContent = entry.variant.toUpperCase();
      card.querySelector('[data-field="schedule"]').textContent = `${entry.scheduleIndex + 1} of ${entry.scheduleCount}`;
      card.querySelector('[data-field="cells"]').textContent = `Home ${assignmentCell("HOME", entry.role, entry.event)} · School ${assignmentCell("SCHOOL", entry.role, entry.event)}`;

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

      CONTEXTS.forEach((context) => {
        const checkKey = reviewCheckKey(activeMode, context.value, entry.id);
        const panel = card.querySelector(`[data-context-panel="${context.value}"]`);
        const checkbox = card.querySelector(`[data-reviewed-context="${context.value}"]`);
        const openLink = card.querySelector(`[data-open-context="${context.value}"]`);
        panel.classList.toggle("is-reviewed", Boolean(checks[checkKey]));
        checkbox.checked = Boolean(checks[checkKey]);
        openLink.href = buildStudyUrl(entry, globalObject.location.href, activeMode, context.value).toString();
        openLink.querySelector("[data-open-label]").textContent = activeMode === "zoom"
          ? `Open Zoom ${context.shortLabel}`
          : `Open Audio ${context.shortLabel}`;
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) checks[checkKey] = true;
          else delete checks[checkKey];
          saveChecks();
          render();
        });
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
    entries.forEach((entry) => CONTEXTS.forEach((context) => {
      delete checks[reviewCheckKey(activeMode, context.value, entry.id)];
    }));
    saveChecks();
    render();
  });
  render();
})(window, document);
