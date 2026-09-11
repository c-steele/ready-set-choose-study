(async function installAudioPauseAudit() {
  "use strict";

  const RELEASE = "chs-home-school-evelyn-v1-r13-audio-pause-r1";
  const candidateRoot = new URL("../", window.location.href);
  const studyRoot = new URL("../../../", window.location.href);
  const manifestUrl = new URL("data/home_school_question_pause_manifest.json", candidateRoot);
  manifestUrl.searchParams.set("v", RELEASE);

  const elements = {
    summary: document.querySelector("[data-summary]"),
    pauseSummary: document.querySelector("[data-pause-summary]"),
    loading: document.querySelector("[data-loading]"),
    groups: document.querySelector("[data-groups]"),
    empty: document.querySelector("[data-empty]"),
    error: document.querySelector("[data-error]"),
    errorMessage: document.querySelector("[data-error-message]"),
    reset: document.querySelector("[data-reset]"),
    manifestLink: document.querySelector("[data-manifest-link]"),
    template: document.querySelector("#clip-card-template"),
  };
  const controls = Object.fromEntries(
    Array.from(document.querySelectorAll("[data-filter]")).map((control) => [control.dataset.filter, control])
  );

  elements.manifestLink.href = manifestUrl.toString();

  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error(`Manifest request returned ${response.status} ${response.statusText}.`);
  const manifest = await response.json();
  if (!Array.isArray(manifest.clips)) throw new Error("The comparison manifest does not contain a clips list.");

  function normalizedValue(value) {
    return String(value || "").trim().toUpperCase();
  }

  function inferFromFilename(path, choices) {
    const filename = String(path || "").toLowerCase();
    return choices.find((choice) => filename.includes(`_${choice.toLowerCase()}_`)) || "";
  }

  const clips = manifest.clips.map((clip, index) => {
    const source = String(clip.source || "").trim();
    const context = normalizedValue(clip.context) || inferFromFilename(source, ["HOME", "SCHOOL"]);
    const recipient = normalizedValue(clip.recipient)
      || inferFromFilename(source, ["MOM", "DAD", "TEACHER"])
      || "KID";
    const event = normalizedValue(clip.event) || inferFromFilename(source, ["HUG", "FOOD", "HELP"]);
    return {
      ...clip,
      source,
      output: String(clip.output || "").trim(),
      text: String(clip.text || "").trim(),
      context,
      recipient,
      event,
      manifestIndex: index,
    };
  });

  if (clips.some((clip) => !clip.source || !clip.output || !clip.text)) {
    throw new Error("At least one comparison entry is missing its source, output, or transcript.");
  }

  const contextOrder = ["HOME", "SCHOOL"];
  const recipientOrder = ["KID", "MOM", "DAD", "TEACHER"];
  const eventOrder = ["HUG", "FOOD", "HELP"];
  const byPreferredOrder = (order) => (left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    return (leftIndex < 0 ? order.length : leftIndex) - (rightIndex < 0 ? order.length : rightIndex)
      || left.localeCompare(right);
  };

  clips.sort((left, right) => byPreferredOrder(contextOrder)(left.context, right.context)
    || byPreferredOrder(recipientOrder)(left.recipient, right.recipient)
    || byPreferredOrder(eventOrder)(left.event, right.event)
    || left.manifestIndex - right.manifestIndex);

  function titleCase(value) {
    const labels = { HOME: "At Home", SCHOOL: "At School", KID: "Kid", MOM: "Mom", DAD: "Dad", TEACHER: "Teacher", HUG: "Hug", FOOD: "Food", HELP: "Heavy box" };
    return labels[value] || value.toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
  }

  function addOptions(control, values, order) {
    [...new Set(values)].sort(byPreferredOrder(order)).forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = titleCase(value);
      control.append(option);
    });
  }

  addOptions(controls.context, clips.map((clip) => clip.context), contextOrder);
  addOptions(controls.recipient, clips.map((clip) => clip.recipient), recipientOrder);
  addOptions(controls.event, clips.map((clip) => clip.event), eventOrder);

  function resolveAsset(path) {
    if (/^(?:https?:|data:|blob:)/i.test(path)) return path;
    return new URL(path.replace(/^\/+/, ""), studyRoot).toString();
  }

  function basename(path) {
    const cleanPath = String(path).split(/[?#]/, 1)[0];
    return cleanPath.slice(cleanPath.lastIndexOf("/") + 1);
  }

  function secondsLabel(seconds, fallback) {
    const value = Number(seconds);
    return Number.isFinite(value) ? `${Math.round(value * 1000)} ms pause` : fallback;
  }

  function validationLabel(validation) {
    if (typeof validation === "string") return validation;
    if (!validation || typeof validation !== "object") return "Ready to review";
    return validation.status || validation.result || (validation.passed === false ? "Check needed" : "Validated");
  }

  function insertTranscript(parent, text) {
    const match = text.match(/^(.*?)(,?\s+)(at the kid(?:'|’)s (?:home|school)\??)$/i);
    if (!match) {
      parent.textContent = text;
      return;
    }
    const prefix = `${match[1].replace(/,\s*$/, "")}${match[2].includes(",") ? "," : ""}`;
    parent.append(document.createTextNode(prefix));
    const marker = document.createElement("span");
    marker.className = "pause-marker";
    marker.textContent = "pause";
    marker.setAttribute("aria-label", "pause before setting");
    parent.append(document.createTextNode(" "), marker, document.createTextNode(` ${match[3]}`));
  }

  function buildCard(clip, visibleIndex) {
    const fragment = elements.template.content.cloneNode(true);
    const card = fragment.querySelector(".clip-card");
    fragment.querySelector("[data-number]").textContent = `#${visibleIndex}`;
    fragment.querySelector(".clip-tags [data-context]").textContent = titleCase(clip.context);
    fragment.querySelector(".clip-tags [data-recipient]").textContent = `${titleCase(clip.recipient)} in middle`;
    fragment.querySelector(".clip-tags [data-event]").textContent = titleCase(clip.event);

    const validation = fragment.querySelector("[data-validation]");
    validation.textContent = validationLabel(clip.validation);
    if (/check|fail|warning|review/i.test(validation.textContent)) validation.classList.add("warning");

    insertTranscript(fragment.querySelector("[data-transcript]"), clip.text);

    const originalAudio = fragment.querySelector("[data-original-audio]");
    const editedAudio = fragment.querySelector("[data-edited-audio]");
    originalAudio.src = resolveAsset(clip.source);
    editedAudio.src = resolveAsset(clip.output);
    originalAudio.dataset.clipId = clip.id || basename(clip.source);
    editedAudio.dataset.clipId = clip.id || basename(clip.output);
    fragment.querySelector("[data-original-file]").textContent = clip.source;
    fragment.querySelector("[data-edited-file]").textContent = clip.output;

    const originalPause = clip.boundary?.originalPauseSeconds;
    const editedPause = clip.measuredPause?.durationSeconds ?? clip.boundary?.targetPauseSeconds ?? manifest.targetPauseSeconds;
    fragment.querySelector("[data-original-pause]").textContent = secondsLabel(originalPause, "Original timing");
    fragment.querySelector("[data-edited-pause]").textContent = secondsLabel(editedPause, "Edited timing");
    card.dataset.context = clip.context;
    card.dataset.recipient = clip.recipient;
    card.dataset.event = clip.event;
    return fragment;
  }

  function matchesFilters(clip) {
    return Object.entries(controls).every(([key, control]) => control.value === "all" || clip[key] === control.value);
  }

  function render() {
    document.querySelectorAll("audio").forEach((audio) => audio.pause());
    const filtered = clips.filter(matchesFilters);
    elements.groups.replaceChildren();
    elements.groups.hidden = filtered.length === 0;
    elements.empty.hidden = filtered.length !== 0;
    elements.summary.textContent = `${filtered.length} of ${clips.length} questions`;

    const grouped = new Map();
    filtered.forEach((clip) => {
      if (!grouped.has(clip.context)) grouped.set(clip.context, []);
      grouped.get(clip.context).push(clip);
    });

    let visibleIndex = 0;
    [...grouped.entries()]
      .sort(([left], [right]) => byPreferredOrder(contextOrder)(left, right))
      .forEach(([context, entries]) => {
        const section = document.createElement("section");
        section.className = "context-group";
        const heading = document.createElement("header");
        heading.className = "group-heading";
        const title = document.createElement("h2");
        title.textContent = titleCase(context);
        const count = document.createElement("span");
        count.textContent = `${entries.length} ${entries.length === 1 ? "question" : "questions"}`;
        heading.append(title, count);
        const list = document.createElement("div");
        list.className = "clip-list";
        entries.forEach((clip) => {
          visibleIndex += 1;
          list.append(buildCard(clip, visibleIndex));
        });
        section.append(heading, list);
        elements.groups.append(section);
      });
  }

  const targetPause = Number(manifest.targetPauseSeconds);
  elements.pauseSummary.textContent = Number.isFinite(targetPause)
    ? `${Math.round(targetPause * 1000)} ms target pause`
    : "Original versus edited";
  elements.loading.hidden = true;
  controls.context.addEventListener("change", render);
  controls.recipient.addEventListener("change", render);
  controls.event.addEventListener("change", render);
  elements.reset.addEventListener("click", () => {
    Object.values(controls).forEach((control) => { control.value = "all"; });
    render();
  });
  document.addEventListener("play", (event) => {
    if (!(event.target instanceof HTMLAudioElement)) return;
    document.querySelectorAll("audio").forEach((audio) => {
      if (audio !== event.target) audio.pause();
    });
  }, true);

  render();
})().catch((error) => {
  const loading = document.querySelector("[data-loading]");
  const errorState = document.querySelector("[data-error]");
  const errorMessage = document.querySelector("[data-error-message]");
  const summary = document.querySelector("[data-summary]");
  if (loading) loading.hidden = true;
  if (errorState) errorState.hidden = false;
  if (errorMessage) errorMessage.textContent = error?.message || String(error);
  if (summary) summary.textContent = "Comparison unavailable";
  console.error(error);
});
