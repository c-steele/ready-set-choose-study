(function installRenditionReview(globalObject, documentObject) {
  "use strict";

  const REVIEW_VERSION = "ftc-rendition-review-v2";
  const STORAGE_KEY = `${REVIEW_VERSION}:checked`;
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
    const stem = `REVIEW-${role.toUpperCase()}-${event}-${variant.toUpperCase()}-P${scheduleIndex + 1}`;
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

  function buildStudyUrl(entry, baseHref) {
    const url = new URL("index.html", baseHref);
    const sessionId = `review-${entry.id}`;
    const values = {
      facilitator: "1",
      facilitatorChild: "1",
      liveShare: "1",
      skipParentSetup: "1",
      facilitatorSession: sessionId,
      pid: entry.seed,
      seed: entry.seed,
      session_id: sessionId,
      STUDY_ID: REVIEW_VERSION,
      roleSet: entry.role,
      set: entry.set,
      event: entry.event,
      variant: entry.variant,
      studyVersion: "teacher-classmate-preview",
      ratingMode: "one-after-story",
      syntheticSpeech: "0",
      researcherTools: "1",
      showReadAloud: "1",
      downloadData: "0",
      showDataStatus: "0",
      exportFormat: "csv",
      previewIndex: "0",
    };
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
  }

  const api = Object.freeze({
    REVIEW_VERSION,
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
    buildStudyUrl,
  });
  globalObject.FTCRenditionReview = api;

  if (!documentObject) return;

  const entries = renditionEntries();
  const grid = documentObject.querySelector("[data-review-grid]");
  const template = documentObject.querySelector("#review-card-template");
  const progressCount = documentObject.querySelector("[data-progress-count]");
  const progressBar = documentObject.querySelector("[data-progress-bar]");
  const visibleCount = documentObject.querySelector("[data-visible-count]");
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
      // The review board still works when storage is unavailable.
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
    if (filters.variant.value !== "all" && entry.variant !== filters.variant.value) return false;
    if (filters.unfinished.checked && checks[entry.id]) return false;
    return true;
  }

  function render() {
    const visible = entries.filter(matchesFilters);
    grid.replaceChildren();
    visibleCount.textContent = `${visible.length} ${visible.length === 1 ? "run" : "runs"}`;

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
      card.dataset.renditionId = entry.id;
      card.classList.toggle("is-reviewed", Boolean(checks[entry.id]));
      card.querySelector(".review-role").textContent = `${entry.roleLabel} role set`;
      card.querySelector("h2").textContent = `${entry.event[0]}${entry.event.slice(1).toLowerCase()} · Rendition ${entry.variant.toUpperCase()}`;
      card.querySelector('[data-field="event"]').textContent = entry.event[0] + entry.event.slice(1).toLowerCase();
      card.querySelector('[data-field="variant"]').textContent = entry.variant.toUpperCase();
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
      openLink.href = buildStudyUrl(entry, globalObject.location.href).toString();
      checkbox.checked = Boolean(checks[entry.id]);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) checks[entry.id] = true;
        else delete checks[entry.id];
        saveChecks();
        render();
      });
      grid.append(card);
    }
    updateProgress();
  }

  Object.values(filters).forEach((control) => control.addEventListener("change", render));
  documentObject.querySelector("[data-reset]").addEventListener("click", () => {
    if (!globalObject.confirm("Clear every reviewed check mark?")) return;
    checks = {};
    saveChecks();
    render();
  });
  render();
})(window, document);
