(function installRenditionReview(globalObject, documentObject) {
  "use strict";

  // Keep this stable so existing "Reviewed" checkmarks carry into presentation-only updates.
  const REVIEW_VERSION = "ftc-rendition-review-v9-back-preview";
  const PUBLIC_REVIEW_BASE = "https://c-steele.github.io/ready-set-choose-study/screen-share-study/review-back-preview.html";
  const STORAGE_KEY = `${REVIEW_VERSION}:checked`;
  const MODE_STORAGE_KEY = `${REVIEW_VERSION}:mode`;
  const PREVIEW_MODES = Object.freeze({
    zoom: Object.freeze({
      value: "zoom",
      label: "Zoom researcher-paced",
      progressLabel: "Zoom runs reviewed",
      openLabel: "Open Zoom rendition",
      help: "The isolated Zoom preview has the improved researcher Back control.",
      summary: "Each opens in manual researcher mode with the improved Back and Skip controls.",
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
  const SESSION_VISUAL_PLANS = Object.freeze({
    woman: Object.freeze([
      Object.freeze({ "MOM-TEACHER": "a", "SISTER-FRIEND": "d", "BESTFRIEND-FRIEND": "a", "TEACHER-FRIEND": "c", "MOM-SISTER": "b", "TEACHER-CLASSMATE": "c" }),
      Object.freeze({ "MOM-TEACHER": "b", "SISTER-FRIEND": "c", "BESTFRIEND-FRIEND": "c", "TEACHER-FRIEND": "a", "MOM-SISTER": "d", "TEACHER-CLASSMATE": "b" }),
      Object.freeze({ "MOM-TEACHER": "d", "SISTER-FRIEND": "a", "BESTFRIEND-FRIEND": "b", "TEACHER-FRIEND": "d", "MOM-SISTER": "c", "TEACHER-CLASSMATE": "a" }),
      Object.freeze({ "MOM-TEACHER": "c", "SISTER-FRIEND": "b", "BESTFRIEND-FRIEND": "d", "TEACHER-FRIEND": "b", "MOM-SISTER": "a", "TEACHER-CLASSMATE": "d" }),
    ]),
    man: Object.freeze([
      Object.freeze({ "DAD-TEACHER": "a", "BROTHER-FRIEND": "d", "BESTFRIEND-FRIEND": "a", "TEACHER-FRIEND": "c", "DAD-BROTHER": "b", "TEACHER-CLASSMATE": "c" }),
      Object.freeze({ "DAD-TEACHER": "b", "BROTHER-FRIEND": "c", "BESTFRIEND-FRIEND": "c", "TEACHER-FRIEND": "a", "DAD-BROTHER": "d", "TEACHER-CLASSMATE": "b" }),
      Object.freeze({ "DAD-TEACHER": "d", "BROTHER-FRIEND": "a", "BESTFRIEND-FRIEND": "b", "TEACHER-FRIEND": "d", "DAD-BROTHER": "c", "TEACHER-CLASSMATE": "a" }),
      Object.freeze({ "DAD-TEACHER": "c", "BROTHER-FRIEND": "b", "BESTFRIEND-FRIEND": "d", "TEACHER-FRIEND": "b", "DAD-BROTHER": "a", "TEACHER-CLASSMATE": "d" }),
    ]),
    family: Object.freeze([
      Object.freeze({ "MOM-DAD": "a", "SISTER-BROTHER": "d", "DAD-KID": "c", "MOM-KID": "a", "TEACHER-KID": "b", "TEACHER-CLASSMATE": "c" }),
      Object.freeze({ "MOM-DAD": "b", "SISTER-BROTHER": "c", "DAD-KID": "a", "MOM-KID": "c", "TEACHER-KID": "d", "TEACHER-CLASSMATE": "b" }),
      Object.freeze({ "MOM-DAD": "d", "SISTER-BROTHER": "a", "DAD-KID": "d", "MOM-KID": "b", "TEACHER-KID": "c", "TEACHER-CLASSMATE": "a" }),
      Object.freeze({ "MOM-DAD": "c", "SISTER-BROTHER": "b", "DAD-KID": "b", "MOM-KID": "d", "TEACHER-KID": "a", "TEACHER-CLASSMATE": "d" }),
    ]),
  });
  const EXACT_VISUAL_PALETTES = Object.freeze({
    "MOM-SISTER": ["#F2B13D", "#ED6E57"],
    "TEACHER-FRIEND": ["#F2B13D", "#ED6E57"],
    "MOM-TEACHER": ["#81D653", "#FFD100"],
    "SISTER-FRIEND": ["#81D653", "#FFD100"],
    "DAD-BROTHER": ["#893DF6", "#4CA98F"],
    "DAD-TEACHER": ["#A9A9A9", "#92902C"],
    "BROTHER-FRIEND": ["#A9A9A9", "#92902C"],
    "BESTFRIEND-FRIEND": ["#1432F5", "#EB52F7"],
    "MOM-DAD": ["#8DD3FB", "#F19AC8"],
    "SISTER-BROTHER": ["#8DD3FB", "#F19AC8"],
    "DAD-KID": ["#64D4CE", "#7B80F7"],
    "TEACHER-KID": ["#64D4CE", "#7B80F7"],
    "MOM-KID": ["#A62B17", "#22528E"],
    "TEACHER-CLASSMATE": ["#8E2D94", "#8E2D94"],
  });
  const COLOR_NAMES_BY_HEX = Object.freeze({
    "#F2B13D": "Warm orange",
    "#ED6E57": "Coral red",
    "#81D653": "Lime green",
    "#FFD100": "Golden yellow",
    "#893DF6": "Violet",
    "#4CA98F": "Sea green",
    "#A9A9A9": "Gray",
    "#92902C": "Olive green",
    "#1432F5": "Electric blue",
    "#EB52F7": "Bright pink",
    "#8DD3FB": "Sky blue",
    "#F19AC8": "Soft pink",
    "#64D4CE": "Aqua",
    "#7B80F7": "Periwinkle",
    "#A62B17": "Deep red",
    "#22528E": "Navy blue",
    "#8E2D94": "Plum",
  });
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

  const MIDDLE_ROLE_BY_SCRIPT_PREFIX = Object.freeze({
    kid: "KID",
    mom: "MOM",
    dad: "DAD",
    teacher: "TEACHER",
  });

  function schedulesForRole(role) {
    return role === "family" ? FAMILY_ONE_PAIR_SCRIPT_SCHEDULES : ONE_PAIR_SCRIPT_SCHEDULES;
  }

  function focusedRole(scriptKey) {
    return FOCUSED_ROLE_BY_SCRIPT[scriptKey]
      || String(scriptKey || "").split("-").slice(1).join("-");
  }

  function displayRole(role) {
    return String(role || "")
      .replace("BESTFRIEND", "BEST FRIEND")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function sidePlacement(condition, variant, scriptKey = "kid-") {
    const roles = String(condition || "").split("-");
    if (roles.length !== 2) return Object.freeze({ left: "", middle: "", right: "" });
    const firstRoleIsLeft = variant === "a" || variant === "b";
    const middleRole = MIDDLE_ROLE_BY_SCRIPT_PREFIX[String(scriptKey || "").split("-")[0]] || "KID";
    return Object.freeze({
      left: displayRole(firstRoleIsLeft ? roles[0] : roles[1]),
      middle: displayRole(middleRole),
      right: displayRole(firstRoleIsLeft ? roles[1] : roles[0]),
    });
  }

  function pairingColor(condition, variant) {
    const palettes = EXACT_VISUAL_PALETTES[condition];
    if (!palettes) return Object.freeze({ name: "Unknown color", hex: "" });
    const hex = palettes[["b", "d"].includes(String(variant || "").toLowerCase()) ? 1 : 0];
    return Object.freeze({ name: COLOR_NAMES_BY_HEX[hex] || "Custom color", hex });
  }

  function previewBaseHref(baseHref) {
    const requestedBase = new URL(baseHref || PUBLIC_REVIEW_BASE, PUBLIC_REVIEW_BASE);
    return requestedBase.protocol === "file:" ? PUBLIC_REVIEW_BASE : requestedBase.href;
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
              visualPlanMap: SESSION_VISUAL_PLANS[role.value][visualPlan.number - 1],
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
    const url = new URL("../versions/chs-v81-researcher-back-preview/index.html", previewBaseHref(baseHref));
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
      allocatorVersion: "review-preview-v3-back-navigation",
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
    PUBLIC_REVIEW_BASE,
    PREVIEW_MODES,
    ROLE_SETS,
    EVENTS,
    VISUAL_PLANS,
    SESSION_VISUAL_PLANS,
    EXACT_VISUAL_PALETTES,
    COLOR_NAMES_BY_HEX,
    ROLE_CONDITIONS,
    ONE_PAIR_SCRIPT_SCHEDULES,
    FAMILY_ONE_PAIR_SCRIPT_SCHEDULES,
    MIDDLE_ROLE_BY_SCRIPT_PREFIX,
    schedulesForRole,
    focusedRole,
    displayRole,
    sidePlacement,
    pairingColor,
    previewBaseHref,
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
        const details = documentObject.createElement("span");
        const colorLabel = documentObject.createElement("span");
        const colorSwatch = documentObject.createElement("i");
        const colorText = documentObject.createElement("span");
        const sides = documentObject.createElement("span");
        const focus = documentObject.createElement("strong");
        const variant = entry.visualPlanMap[condition];
        const placement = sidePlacement(condition, variant, scriptKey);
        const color = pairingColor(condition, variant);
        story.textContent = condition.replace("BESTFRIEND", "BEST FRIEND").replaceAll("-", " + ");
        details.className = "review-pairing-details";
        colorLabel.className = "review-color-label";
        colorSwatch.className = "review-color-swatch";
        colorSwatch.setAttribute("aria-hidden", "true");
        colorSwatch.style.backgroundColor = color.hex;
        colorText.textContent = `${color.name} (${color.hex})`;
        colorLabel.append(colorSwatch, colorText);
        sides.className = "review-side-placement";
        sides.textContent = `${placement.left} left · ${placement.middle} middle · ${placement.right} right`;
        focus.textContent = `rates ${focusedRole(scriptKey)}`;
        details.append(colorLabel, sides, focus);
        item.append(story, details);
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
