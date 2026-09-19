(async function installSceneAudit() {
  "use strict";

  const archiveNotice = document.createElement("p");
  archiveNotice.style.cssText = "padding:18px;background:#fff3cd;color:#332b15;border:2px solid #b28a2b;font:600 17px/1.5 system-ui";
  archiveNotice.append("Archived r11 artwork viewer — not the current CHS runtime. It does not include later repairs. ");
  const currentLink = document.createElement("a");
  currentLink.href = new URL("../../../review-all-versions-local.html", window.location.href).href;
  currentLink.textContent = "Open all current study previews";
  archiveNotice.append(currentLink);
  document.body.prepend(archiveNotice);

  const VISUAL_RELEASE = "chs-home-school-evelyn-v1-r11";
  const STORAGE_KEY = `${VISUAL_RELEASE}:scene-audit-reviewed`;
  const candidateRoot = new URL("../", window.location.href);
  const studyRoot = new URL("../../../", window.location.href);
  const versioned = (relative, base = candidateRoot) => {
    const url = new URL(relative, base);
    url.searchParams.set("v", VISUAL_RELEASE);
    return url;
  };
  const [eventManifest, visualManifest, contextManifest] = await Promise.all([
    fetch(versioned("data/ksize_manifest.json")).then((response) => response.json()),
    fetch(versioned("data/furnished_visual_manifest.json")).then((response) => response.json()),
    fetch(versioned("data/home_school_context_manifest.json")).then((response) => response.json()),
  ]);

  const trialById = new Map(eventManifest.trials.map((trial) => [trial.id, trial]));
  const contexts = ["HOME", "SCHOOL"];
  const directionalRecipient = Object.freeze({ "DAD-KID": "MOM", "MOM-KID": "DAD", "TEACHER-KID": "TEACHER" });
  const suffixOrder = Object.freeze({ INTRO: 0, HUG: 1, FOOD: 2, HELP: 3 });
  const assetUrl = (relative) => versioned(relative, studyRoot).toString();

  const allEntries = visualManifest.assets.flatMap((asset) => {
    const trial = trialById.get(asset.trialId);
    if (!trial?.homeSchoolFurnished) return [];
    const visual = trial.homeSchoolFurnished;
    return contexts.map((context) => {
      const background = context === "HOME" ? visual.homeBackground : visual.schoolBackground;
      return {
        ...asset,
        context,
        variant: trial.variant,
        palette: visual.paletteSlug,
        characterHex: visual.characterHex,
        background,
        backgroundUrl: assetUrl(background),
        foregroundUrl: assetUrl(asset.output),
        exactVisualKey: `${context}|${background}|${asset.outputSha256}`,
        reviewKey: `${context}|${asset.logicalId}`,
      };
    });
  }).sort((left, right) => {
    const leftNumber = Number.parseInt(left.trialId, 10);
    const rightNumber = Number.parseInt(right.trialId, 10);
    return leftNumber - rightNumber
      || left.trialId.localeCompare(right.trialId)
      || suffixOrder[left.suffix] - suffixOrder[right.suffix]
      || left.imageIndex - right.imageIndex
      || contexts.indexOf(left.context) - contexts.indexOf(right.context);
  });

  const seenVisuals = new Set();
  const uniqueEntries = allEntries.filter((entry) => {
    if (seenVisuals.has(entry.exactVisualKey)) return false;
    seenVisuals.add(entry.exactVisualKey);
    return true;
  });

  const controls = {
    context: document.querySelector('[data-filter="context"]'),
    condition: document.querySelector('[data-filter="condition"]'),
    suffix: document.querySelector('[data-filter="suffix"]'),
    variant: document.querySelector('[data-filter="variant"]'),
    palette: document.querySelector('[data-filter="palette"]'),
    repaired: document.querySelector('[data-filter="repaired"]'),
    duplicates: document.querySelector('[data-filter="duplicates"]'),
  };
  const elements = {
    summary: document.querySelector("[data-summary]"),
    progressSummary: document.querySelector("[data-progress-summary]"),
    viewer: document.querySelector(".viewer-card"),
    empty: document.querySelector("[data-empty]"),
    position: document.querySelector("[data-position]"),
    title: document.querySelector("[data-title]"),
    frame: document.querySelector("[data-scene-frame]"),
    room: document.querySelector("[data-room]"),
    foreground: document.querySelector("[data-foreground]"),
    banner: document.querySelector("[data-banner]"),
    previous: document.querySelector("[data-previous]"),
    next: document.querySelector("[data-next]"),
    transparency: document.querySelector("[data-transparency]"),
    reviewed: document.querySelector("[data-reviewed]"),
    openForeground: document.querySelector("[data-open-foreground]"),
    fileDetail: document.querySelector("[data-file-detail]"),
  };
  const detailElements = Object.fromEntries(
    Array.from(document.querySelectorAll("[data-detail]")).map((element) => [element.dataset.detail, element])
  );

  function optionLabel(value, kind) {
    if (kind === "context") return value === "HOME" ? "At Home" : "At School";
    if (kind === "suffix") return value === "INTRO" ? "Introduction" : value[0] + value.slice(1).toLowerCase();
    if (kind === "variant") return value.toUpperCase();
    if (kind === "condition") return value.split("-").map((part) => part === "BESTFRIEND" ? "Best Friend" : part[0] + part.slice(1).toLowerCase()).join(" – ");
    return value.replace(/-[0-9a-f]{6}$/i, "").split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
  }

  function addOptions(control, values, kind) {
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = optionLabel(value, kind);
      control.append(option);
    });
  }

  addOptions(controls.context, contexts, "context");
  addOptions(controls.condition, [...new Set(allEntries.map((entry) => entry.condition))], "condition");
  addOptions(controls.suffix, ["INTRO", "HUG", "FOOD", "HELP"], "suffix");
  addOptions(controls.variant, ["a", "b", "c", "d"], "variant");
  addOptions(controls.palette, [...new Set(allEntries.map((entry) => entry.palette))].sort(), "palette");

  let reviewed = new Set();
  try { reviewed = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch (_) {}
  let filtered = uniqueEntries;
  let currentIndex = 0;

  function saveReviewed() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...reviewed])); } catch (_) {}
  }

  function eventSpec(entry) {
    if (entry.suffix === "INTRO") return null;
    const context = contextManifest.contexts?.[entry.context];
    const recipient = directionalRecipient[entry.condition];
    return recipient ? context?.recipientEvents?.[recipient]?.[entry.suffix] : context?.events?.[entry.suffix];
  }

  function bannerText(entry) {
    const spec = eventSpec(entry);
    if (!spec) return "";
    return entry.imageIndex === 1 ? spec.eventText : spec.questionText;
  }

  function slideLabel(entry) {
    if (entry.suffix === "INTRO") return `Introduction picture ${entry.imageIndex} of 4`;
    return `${optionLabel(entry.suffix, "suffix")} ${entry.imageIndex === 1 ? "event picture" : "choice picture"}`;
  }

  function isPreviouslyAffected(entry) {
    return entry.suffix === "HELP"
      && ["DAD-KID", "MOM-KID", "TEACHER-KID"].includes(entry.condition)
      && entry.removedDirectionalHelpGapComponents === 1;
  }

  function matches(entry) {
    for (const key of ["context", "condition", "suffix", "variant", "palette"]) {
      if (controls[key].value !== "all" && entry[key] !== controls[key].value) return false;
    }
    if (controls.repaired.checked && !isPreviouslyAffected(entry)) return false;
    return true;
  }

  function applyFilters() {
    const source = controls.duplicates.checked ? allEntries : uniqueEntries;
    filtered = source.filter(matches);
    currentIndex = 0;
    render();
  }

  function render() {
    const total = filtered.length;
    elements.summary.textContent = `${uniqueEntries.length.toLocaleString()} unique scenes`;
    elements.progressSummary.textContent = `${allEntries.length.toLocaleString()} total slide slots · ${reviewed.size.toLocaleString()} checked`;
    elements.viewer.hidden = total === 0;
    elements.empty.hidden = total !== 0;
    if (!total) return;

    currentIndex = Math.max(0, Math.min(currentIndex, total - 1));
    const entry = filtered[currentIndex];
    elements.position.textContent = `Scene ${currentIndex + 1} of ${total}`;
    elements.title.textContent = `${optionLabel(entry.condition, "condition")} · ${slideLabel(entry)}`;
    elements.room.src = entry.backgroundUrl;
    elements.foreground.src = entry.foregroundUrl;
    const banner = bannerText(entry);
    elements.banner.hidden = !banner;
    elements.banner.textContent = banner;
    elements.banner.style.backgroundColor = entry.characterHex;
    elements.reviewed.checked = reviewed.has(entry.reviewKey);
    elements.previous.disabled = currentIndex === 0;
    elements.next.disabled = currentIndex === total - 1;
    detailElements.context.textContent = optionLabel(entry.context, "context");
    detailElements.condition.textContent = optionLabel(entry.condition, "condition");
    detailElements.palette.textContent = `${optionLabel(entry.palette, "palette")} · ${entry.characterHex}`;
    detailElements.slide.textContent = slideLabel(entry);
    detailElements.variant.textContent = entry.variant.toUpperCase();
    detailElements.trial.textContent = entry.trialId;
    elements.openForeground.href = entry.foregroundUrl;
    elements.fileDetail.textContent = entry.output;

    const nextEntry = filtered[currentIndex + 1];
    if (nextEntry) {
      new Image().src = nextEntry.backgroundUrl;
      new Image().src = nextEntry.foregroundUrl;
    }
  }

  elements.previous.addEventListener("click", () => { currentIndex -= 1; render(); });
  elements.next.addEventListener("click", () => { currentIndex += 1; render(); });
  elements.transparency.addEventListener("click", () => {
    const active = elements.frame.classList.toggle("transparency-check");
    elements.transparency.textContent = active ? "Show actual room" : "Check transparency";
  });
  elements.reviewed.addEventListener("change", () => {
    const entry = filtered[currentIndex];
    if (!entry) return;
    if (elements.reviewed.checked) reviewed.add(entry.reviewKey);
    else reviewed.delete(entry.reviewKey);
    saveReviewed();
    render();
  });
  Object.values(controls).forEach((control) => control.addEventListener("change", applyFilters));
  document.addEventListener("keydown", (event) => {
    if (["SELECT", "INPUT"].includes(document.activeElement?.tagName)) return;
    if (event.key === "ArrowLeft" && currentIndex > 0) { currentIndex -= 1; render(); }
    if (event.key === "ArrowRight" && currentIndex < filtered.length - 1) { currentIndex += 1; render(); }
  });

  render();
})().catch((error) => {
  const summary = document.querySelector("[data-summary]");
  if (summary) summary.textContent = "The scene list could not load";
  console.error(error);
});
