(function installStandardV80Review(globalObject, documentObject) {
  "use strict";

  const REVIEW_VERSION = "chs-v80-standard-96-review-v1";
  const STORAGE_KEY = `${REVIEW_VERSION}:checked`;
  const EVENTS = Object.freeze(["HUG", "FOOD", "HELP"]);
  const VISUAL_PLAN_COUNT = 4;
  const ROLE_SETS = Object.freeze([
    Object.freeze({
      value: "woman",
      label: "Woman",
      set: "role",
      ratingPlanCount: 2,
      conditions: Object.freeze(["MOM-TEACHER", "SISTER-FRIEND", "BESTFRIEND-FRIEND", "TEACHER-FRIEND", "MOM-SISTER", "TEACHER-CLASSMATE"]),
    }),
    Object.freeze({
      value: "man",
      label: "Man",
      set: "role",
      ratingPlanCount: 2,
      conditions: Object.freeze(["DAD-TEACHER", "BROTHER-FRIEND", "BESTFRIEND-FRIEND", "TEACHER-FRIEND", "DAD-BROTHER", "TEACHER-CLASSMATE"]),
    }),
    Object.freeze({
      value: "family",
      label: "Family",
      set: "family",
      ratingPlanCount: 4,
      conditions: Object.freeze(["MOM-DAD", "SISTER-BROTHER", "DAD-KID", "MOM-KID", "TEACHER-KID", "TEACHER-CLASSMATE"]),
    }),
  ]);

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

  const FOCUSED_ROLE_BY_SCRIPT = Object.freeze({
    "kid-MOM": "Mom",
    "kid-DAD": "Dad",
    "kid-SISTER": "Sister",
    "kid-BROTHER": "Brother",
    "kid-TEACHER": "Teacher",
    "kid-FRIEND": "Friend",
    "kid-BEST FRIEND": "Best friend",
    "kid-CLASSMATE": "Classmate",
    "mom-DAD": "Mom",
    "mom-KID": "Kid",
    "dad-MOM": "Dad",
    "dad-KID": "Kid",
    "teacher-TEACHER": "Teacher",
    "teacher-KID": "Kid",
  });

  function titleCase(value) {
    return String(value || "").toLowerCase().replace(/(^|[ -])\w/g, (letter) => letter.toUpperCase());
  }

  function conditionLabel(condition) {
    return String(condition || "")
      .replace("BESTFRIEND", "BEST FRIEND")
      .split("-")
      .map(titleCase)
      .join(" + ");
  }

  function canonicalPrimaryCell(role, eventName) {
    const roleIndex = ["woman", "man", "family"].indexOf(role);
    const eventIndex = EVENTS.indexOf(eventName);
    return roleIndex < 0 || eventIndex < 0 ? null : eventIndex * 3 + roleIndex + 1;
  }

  function ratingSchedule(role, ratingPlan) {
    const schedules = role === "family" ? FAMILY_ONE_PAIR_SCRIPT_SCHEDULES : ONE_PAIR_SCRIPT_SCHEDULES;
    return schedules[ratingPlan - 1];
  }

  function renditionEntries() {
    let sequence = 0;
    return ROLE_SETS.flatMap((role) =>
      EVENTS.flatMap((eventName) =>
        Array.from({ length: role.ratingPlanCount }, (_, ratingOffset) =>
          Array.from({ length: VISUAL_PLAN_COUNT }, (_, visualOffset) => {
            const ratingPlan = ratingOffset + 1;
            const visualPlan = visualOffset + 1;
            sequence += 1;
            return Object.freeze({
              id: `standard-${role.value}-${eventName.toLowerCase()}-rp${ratingPlan}-vp${visualPlan}`,
              sequence,
              role: role.value,
              roleLabel: role.label,
              set: role.set,
              event: eventName,
              primaryCell: canonicalPrimaryCell(role.value, eventName),
              ratingPlan,
              ratingPlanCount: role.ratingPlanCount,
              visualPlan,
              conditions: role.conditions,
              ratingSchedule: ratingSchedule(role.value, ratingPlan),
              visualPlanMap: SESSION_VISUAL_PLANS[role.value][visualOffset],
            });
          })
        ).flat()
      )
    );
  }

  function buildStudyUrl(entry, baseHref) {
    const url = new URL("index.html", baseHref);
    const assignmentId = `REVIEW-STD-C${String(entry.primaryCell).padStart(2, "0")}-RP${entry.ratingPlan}-VP${entry.visualPlan}`;
    const values = {
      seed: `${assignmentId}-ORDER`,
      session_id: assignmentId,
      roleSet: entry.role,
      set: entry.set,
      event: entry.event,
      primaryCell: entry.primaryCell,
      ratingPlan: entry.ratingPlan,
      visualPlan: entry.visualPlan,
      assignmentId,
      assignmentMethod: "review_preview_only",
      allocatorVersion: "review-preview-v1",
      ratingMode: "one-after-story",
      syntheticSpeech: "0",
      researcherTools: "1",
      showReadAloud: "0",
      downloadData: "0",
      showDataStatus: "0",
      exportFormat: "csv",
      previewIndex: "4",
    };
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    return url;
  }

  const api = Object.freeze({
    REVIEW_VERSION,
    EVENTS,
    VISUAL_PLAN_COUNT,
    ROLE_SETS,
    ONE_PAIR_SCRIPT_SCHEDULES,
    FAMILY_ONE_PAIR_SCRIPT_SCHEDULES,
    SESSION_VISUAL_PLANS,
    FOCUSED_ROLE_BY_SCRIPT,
    canonicalPrimaryCell,
    ratingSchedule,
    renditionEntries,
    buildStudyUrl,
  });
  globalObject.FTCStandardV80Review = api;

  if (!documentObject) return;

  const entries = renditionEntries();
  const grid = documentObject.querySelector("[data-review-grid]");
  const template = documentObject.querySelector("#review-card-template");
  const progressCount = documentObject.querySelector("[data-progress-count]");
  const progressBar = documentObject.querySelector("[data-progress-bar]");
  const visibleCount = documentObject.querySelector("[data-visible-count]");
  const resetButton = documentObject.querySelector("[data-reset]");
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

  function saveChecks() {
    try {
      globalObject.localStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
    } catch (_error) {
      // The review board remains usable when browser storage is unavailable.
    }
  }

  function updateProgress() {
    const completed = entries.filter((entry) => checks[entry.id]).length;
    progressCount.textContent = `${completed} / ${entries.length}`;
    progressBar.style.width = `${Math.round((completed / entries.length) * 100)}%`;
  }

  function matchesFilters(entry) {
    if (filters.role.value !== "all" && entry.role !== filters.role.value) return false;
    if (filters.event.value !== "all" && entry.event !== filters.event.value) return false;
    if (filters.rating.value !== "all" && entry.ratingPlan !== Number(filters.rating.value)) return false;
    if (filters.visual.value !== "all" && entry.visualPlan !== Number(filters.visual.value)) return false;
    if (filters.unfinished.checked && checks[entry.id]) return false;
    return true;
  }

  function render() {
    const visible = entries.filter(matchesFilters);
    grid.replaceChildren();
    visibleCount.textContent = `${visible.length} ${visible.length === 1 ? "configuration" : "configurations"}`;

    if (!visible.length) {
      const empty = documentObject.createElement("p");
      empty.className = "review-empty";
      empty.textContent = "No unchecked configurations match these filters.";
      grid.append(empty);
      updateProgress();
      return;
    }

    visible.forEach((entry) => {
      const card = template.content.firstElementChild.cloneNode(true);
      const checkbox = card.querySelector(".review-done input");
      card.dataset.configurationId = entry.id;
      card.classList.toggle("is-reviewed", Boolean(checks[entry.id]));
      card.classList.add("is-audio-mode");
      card.querySelector(".review-role").textContent = `${entry.roleLabel} role set`;
      const heading = card.querySelector("h2");
      heading.textContent = `${titleCase(entry.event)} · Plans ${entry.ratingPlan} + ${entry.visualPlan}`;
      const position = documentObject.createElement("span");
      position.className = "review-position";
      position.textContent = `Configuration ${entry.sequence} of ${entries.length}`;
      heading.append(position);
      card.querySelector('[data-field="cell"]').textContent = `Cell ${entry.primaryCell} of 9`;
      card.querySelector('[data-field="rating"]').textContent = `${entry.ratingPlan} of ${entry.ratingPlanCount}`;
      card.querySelector('[data-field="visual"]').textContent = `${entry.visualPlan} of 4`;

      const pairingList = card.querySelector(".review-pairing-list");
      entry.conditions.forEach((condition) => {
        const item = documentObject.createElement("li");
        const story = documentObject.createElement("span");
        const plan = documentObject.createElement("strong");
        const scriptKey = entry.ratingSchedule[condition];
        story.textContent = conditionLabel(condition);
        plan.textContent = `Rendition ${entry.visualPlanMap[condition].toUpperCase()} · rates ${FOCUSED_ROLE_BY_SCRIPT[scriptKey] || scriptKey}`;
        item.append(story, plan);
        pairingList.append(item);
      });

      const openLink = card.querySelector(".review-open");
      openLink.href = buildStudyUrl(entry, globalObject.location.href).toString();
      checkbox.checked = Boolean(checks[entry.id]);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) checks[entry.id] = true;
        else delete checks[entry.id];
        saveChecks();
        render();
      });
      grid.append(card);
    });
    updateProgress();
  }

  Object.values(filters).forEach((control) => control.addEventListener("change", render));
  resetButton.addEventListener("click", () => {
    if (!globalObject.confirm("Clear all 96 reviewed check marks?")) return;
    checks = {};
    saveChecks();
    render();
  });
  render();
})(window, document);
