(function installHomeSchoolReview(globalObject, documentObject) {
  "use strict";

  const REVIEW_VERSION = "who-takes-care-entrance-review-r17";
  const STUDY_RUNTIME_VERSION = "chs-home-school-evelyn-v1-r17-entrance-preview-1";
  const STORAGE_KEY = `${REVIEW_VERSION}:checked`;
  const STUDY_ENTRYPOINT = "../versions/chs-home-school-evelyn-v1/index.html";
  const CONTEXT_ORDERS = Object.freeze([
    Object.freeze({
      value: "HOME",
      label: "Home first",
      shortLabel: "Home → School",
      first: "HOME",
      second: "SCHOOL",
    }),
    Object.freeze({
      value: "SCHOOL",
      label: "School first",
      shortLabel: "School → Home",
      first: "SCHOOL",
      second: "HOME",
    }),
  ]);
  const ROLE_SETS = Object.freeze([
    Object.freeze({ value: "woman", label: "Woman", set: "role" }),
    Object.freeze({ value: "man", label: "Man", set: "role" }),
    Object.freeze({ value: "family", label: "Family–teacher", set: "family" }),
  ]);
  const EVENTS = Object.freeze(["HUG", "FOOD", "HELP"]);
  const VARIANTS = Object.freeze(["a", "b", "c", "d"]);
  const ROLE_CONDITIONS = Object.freeze({
    woman: Object.freeze(["MOM-TEACHER", "SISTER-FRIEND", "BESTFRIEND-FRIEND", "TEACHER-FRIEND", "MOM-SISTER", "TEACHER-CLASSMATE"]),
    man: Object.freeze(["DAD-TEACHER", "BROTHER-FRIEND", "BESTFRIEND-FRIEND", "TEACHER-FRIEND", "DAD-BROTHER", "TEACHER-CLASSMATE"]),
    family: Object.freeze(["MOM-DAD", "SISTER-BROTHER", "DAD-KID", "MOM-KID", "TEACHER-KID", "TEACHER-CLASSMATE"]),
  });

  function stableHash(text) {
    let hash = 2166136261;
    const input = String(text || "");
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seedForRendition(role, event, variant) {
    const stem = `WTC-BOTH-${String(role).toUpperCase()}-${String(event).toUpperCase()}-${String(variant).toUpperCase()}`;
    return `${stem}-${stableHash(stem).toString(36).toUpperCase()}`;
  }

  function renditionEntries() {
    return ROLE_SETS.flatMap((role) =>
      EVENTS.flatMap((event) =>
        VARIANTS.map((variant) => Object.freeze({
          id: `${role.value}-${event.toLowerCase()}-${variant}`,
          role: role.value,
          roleLabel: role.label,
          set: role.set,
          event,
          variant,
          conditions: ROLE_CONDITIONS[role.value],
          seed: seedForRendition(role.value, event, variant),
        }))
      )
    );
  }

  function contextOrderDefinition(requestedFirstContext) {
    const normalized = String(requestedFirstContext || "").toUpperCase();
    const order = CONTEXT_ORDERS.find((entry) => entry.value === normalized);
    if (!order) throw new Error(`Unknown first context: ${requestedFirstContext}`);
    return order;
  }

  function assignmentCell(requestedFirstContext, requestedRole, requestedEvent) {
    const order = contextOrderDefinition(requestedFirstContext);
    const orderIndex = CONTEXT_ORDERS.findIndex((entry) => entry.value === order.value);
    const roleIndex = ROLE_SETS.findIndex((entry) => entry.value === String(requestedRole || "").toLowerCase());
    const eventIndex = EVENTS.indexOf(String(requestedEvent || "").toUpperCase());
    if (orderIndex < 0 || roleIndex < 0 || eventIndex < 0) return null;
    return roleIndex * 6 + eventIndex * 2 + orderIndex + 1;
  }

  function buildStudyUrl(entry, baseHref, requestedFirstContext = "HOME") {
    const order = contextOrderDefinition(requestedFirstContext);
    const url = new URL(STUDY_ENTRYPOINT, baseHref);
    const reviewId = `wtc-${entry.id}-${order.value.toLowerCase()}-first`;
    const values = {
      v: STUDY_RUNTIME_VERSION,
      syntheticSpeech: "0",
      ratingMode: "none",
      contextStudy: "1",
      withinChildContexts: "1",
      context: order.first,
      roleSet: entry.role,
      set: entry.set,
      event: entry.event,
      variant: entry.variant,
      seed: entry.seed,
      assignmentCell: String(assignmentCell(order.value, entry.role, entry.event)),
      child: reviewId,
      response: reviewId,
      researcherTools: "1",
      researcherToolbar: "back-skip",
      researcherJump: "1",
      skipParentSetup: "1",
      previewIndex: "0",
      showReadAloud: "0",
      downloadData: "0",
      showDataStatus: "0",
      exportFormat: "csv",
    };
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
  }

  function reviewCheckKey(firstContext, entryId) {
    return `${contextOrderDefinition(firstContext).value}:${entryId}`;
  }

  const api = Object.freeze({
    REVIEW_VERSION,
    STUDY_RUNTIME_VERSION,
    STUDY_ENTRYPOINT,
    CONTEXT_ORDERS,
    ROLE_SETS,
    EVENTS,
    VARIANTS,
    ROLE_CONDITIONS,
    stableHash,
    seedForRendition,
    renditionEntries,
    contextOrderDefinition,
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
      // The review board still works when storage is unavailable.
    }
  }

  function updateProgress() {
    const total = entries.length * CONTEXT_ORDERS.length;
    const completed = entries.reduce((count, entry) => count + CONTEXT_ORDERS.filter(
      (order) => checks[reviewCheckKey(order.value, entry.id)]
    ).length, 0);
    progressCount.textContent = `${completed} / ${total}`;
    progressBar.style.width = `${Math.round((completed / total) * 100)}%`;
  }

  function matchesFilters(entry) {
    if (filters.role.value !== "all" && entry.role !== filters.role.value) return false;
    if (filters.event.value !== "all" && entry.event !== filters.event.value) return false;
    if (filters.variant.value !== "all" && entry.variant !== filters.variant.value) return false;
    if (filters.unfinished.checked) {
      const bothReviewed = CONTEXT_ORDERS.every(
        (order) => checks[reviewCheckKey(order.value, entry.id)]
      );
      if (bothReviewed) return false;
    }
    return true;
  }

  function displayCondition(condition) {
    return condition.replace("BESTFRIEND", "BEST FRIEND").replaceAll("-", " + ");
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

    for (const entry of visible) {
      const card = template.content.firstElementChild.cloneNode(true);
      const orderChecks = CONTEXT_ORDERS.map((order) => Boolean(
        checks[reviewCheckKey(order.value, entry.id)]
      ));
      card.dataset.renditionId = entry.id;
      card.classList.toggle("is-reviewed", orderChecks.every(Boolean));
      card.querySelector(".review-role").textContent = `${entry.roleLabel} role set`;
      card.querySelector("h2").textContent = `${entry.event[0]}${entry.event.slice(1).toLowerCase()} · Visual profile ${entry.variant.toUpperCase()}`;
      card.querySelector('[data-field="event"]').textContent = entry.event[0] + entry.event.slice(1).toLowerCase();
      card.querySelector('[data-field="variant"]').textContent = `Profile ${entry.variant.toUpperCase()}`;
      card.querySelector('[data-field="matching"]').textContent = "Same palettes, sides, and story order in both settings";
      card.querySelector('[data-field="cells"]').textContent = `Home first ${assignmentCell("HOME", entry.role, entry.event)} · School first ${assignmentCell("SCHOOL", entry.role, entry.event)}`;

      const pairingList = card.querySelector(".review-pairing-list");
      entry.conditions.forEach((condition) => {
        const item = documentObject.createElement("li");
        item.textContent = displayCondition(condition);
        pairingList.append(item);
      });

      CONTEXT_ORDERS.forEach((order) => {
        const checkKey = reviewCheckKey(order.value, entry.id);
        const panel = card.querySelector(`[data-context-panel="${order.value}"]`);
        const checkbox = card.querySelector(`[data-reviewed-context="${order.value}"]`);
        const openLink = card.querySelector(`[data-open-context="${order.value}"]`);
        panel.classList.toggle("is-reviewed", Boolean(checks[checkKey]));
        checkbox.checked = Boolean(checks[checkKey]);
        openLink.href = buildStudyUrl(entry, globalObject.location.href, order.value).toString();
        openLink.querySelector("[data-open-label]").textContent = order.shortLabel;
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
  resetButton.addEventListener("click", () => {
    if (!globalObject.confirm("Clear every reviewed check mark?")) return;
    checks = {};
    saveChecks();
    render();
  });
  render();
})(window, document);
