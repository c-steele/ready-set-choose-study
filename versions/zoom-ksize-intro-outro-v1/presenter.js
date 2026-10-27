(function installPrivateSlideNavigator() {
  "use strict";

  const session = new URLSearchParams(location.search).get("facilitatorSession");
  const $ = (selector) => document.querySelector(selector);
  const VERSION = "zoom-streamlined-ratings-v2";
  const connection = $("[data-connection]");
  let deck = null;
  let live = null;
  let selected = null;
  let following = true;
  let lastStateAt = 0;
  let pending = null;
  let lastRenderedLive = null;
  let lastRenderedPreview = null;
  let thumbnailObserver = null;
  const seen = new Set();
  const channel = session && "BroadcastChannel" in window ? new BroadcastChannel(`ftc-facilitator:${session}`) : null;

  const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const safeUrl = (value) => {
    try { const url = new URL(value, deck?.baseUrl || location.href); return url.origin === location.origin && ["http:", "https:"].includes(url.protocol) ? url.href : null; }
    catch { return null; }
  };
  const safeImageUrl = (value) => {
    const local = safeUrl(value);
    if (local) return local;
    try { const url = new URL(value, deck?.baseUrl || location.href); return url.origin === "https://harvard.az1.qualtrics.com" ? url.href : null; }
    catch { return null; }
  };
  function send(action, details = {}) {
    if (!session) return;
    const command = { type: "FACILITATOR_COMMAND", facilitatorSession: session, commandId: `presenter-${Date.now()}-${Math.random().toString(36).slice(2)}`, action, ...details };
    channel?.postMessage(command);
    if (window.opener && !window.opener.closed) window.opener.postMessage(command, location.origin);
    return command.commandId;
  }
  function isConnected() { return Boolean(deck && live && Date.now() - lastStateAt < 14000); }
  function updateConnection() {
    const ready = isConnected();
    connection.dataset.connected = String(ready);
    connection.textContent = ready ? "Connected to study" : deck ? "Waiting for study window…" : "Connecting…";
    if (!session) connection.textContent = "Open from the study’s Slide navigator button";
    $("[data-show]").disabled = !ready || pending !== null || selected === live?.previewIndex;
  }
  function slideAt(index) { return deck?.slides.find((slide) => slide.index === index); }
  function inertDocument(slide) {
    const parsed = new DOMParser().parseFromString(String(slide.html || ""), "text/html");
    parsed.querySelectorAll("script,iframe,object,embed,base,meta,link,audio,video,source").forEach((node) => node.remove());
    for (const node of parsed.body.querySelectorAll("*")) {
      for (const attr of [...node.attributes]) {
        if (/^on/i.test(attr.name) || ["srcdoc", "href", "action", "formaction", "srcset", "autofocus"].includes(attr.name)) node.removeAttribute(attr.name);
      }
      if (node.hasAttribute("src")) {
        const src = node.tagName === "IMG" ? safeImageUrl(node.getAttribute("src")) : safeUrl(node.getAttribute("src"));
        if (src) node.setAttribute("src", src); else node.removeAttribute("src");
      }
      if (node.matches("button,input,select,textarea")) node.setAttribute("disabled", "");
      node.setAttribute("tabindex", "-1");
    }
    const styles = deck.styles.map(safeUrl).filter(Boolean).map((url) => `<link rel="stylesheet" href="${escape(url)}">`).join("");
    const base = safeUrl(deck.baseUrl) || location.href;
    const policy = `default-src 'none'; script-src 'none'; style-src 'unsafe-inline' ${location.origin}; img-src ${location.origin} https://harvard.az1.qualtrics.com data:; media-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri ${location.origin}`;
    const bodyClass = String(deck.bodyClass || "ksize-facilitator-child ksize-live-share ksize-zoom-arrow-navigation ksize-zoom-choice-effects").replace(/[^a-zA-Z0-9_ -]/g, "");
    return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escape(policy)}"><base href="${escape(base)}">${styles}<style>html,body{margin:0!important;width:1280px!important;height:720px!important;overflow:hidden!important}body{pointer-events:none!important}.ksize-zoom-navigation,.ksize-zoom-story-shortcuts,.ksize-zoom-presenter-open{display:none!important}.ksize-rating-choice{opacity:1!important;visibility:visible!important;transform:none!important}button:disabled{opacity:1!important}*{animation:none!important;transition:none!important}</style></head><body class="jspsych-display-element ${escape(bodyClass)}"><div id="jspsych-content">${parsed.body.innerHTML}</div></body></html>`;
  }
  function renderFrame(which, slide) {
    if (!slide) return;
    const frame = $(`[data-${which}-frame]`);
    frame.parentElement.dataset.loading = "true";
    frame.setAttribute("aria-busy", "true");
    frame.onload = () => {
      frame.parentElement.dataset.loading = "false";
      frame.setAttribute("aria-busy", "false");
    };
    frame.srcdoc = inertDocument(slide);
    $(`[data-${which}-title]`).textContent = slide.title;
    $(`[data-${which}-counter]`).textContent = `Slide ${slide.index + 1} of ${deck.slides.length}`;
  }
  function resizeFrames() {
    document.querySelectorAll("[data-viewport]").forEach((box) => { box.querySelector("iframe").style.transform = `scale(${box.clientWidth / 1280})`; });
    document.querySelectorAll(".slide-miniature iframe").forEach((frame) => { frame.style.transform = `scale(${frame.parentElement.clientWidth / 1280})`; });
  }
  function mountThumbnail(button) {
    const box = button.querySelector(".slide-miniature");
    if (box.querySelector("iframe")) return;
    const slide = slideAt(Number(button.dataset.slideIndex));
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "");
    frame.setAttribute("tabindex", "-1");
    frame.setAttribute("aria-hidden", "true");
    frame.title = `Slide ${slide.index + 1} thumbnail`;
    frame.style.transform = `scale(${box.clientWidth / 1280})`;
    frame.srcdoc = inertDocument(slide);
    box.appendChild(frame);
  }
  function revealSelectedThumbnail() {
    const rail = $("[data-slide-list]");
    const button = rail.querySelector(`[data-slide-index="${selected}"]`);
    if (!button) return;
    const item = button.getBoundingClientRect(), viewport = rail.getBoundingClientRect();
    if (item.top < viewport.top) rail.scrollTop += item.top - viewport.top - 4;
    else if (item.bottom > viewport.bottom) rail.scrollTop += item.bottom - viewport.bottom + 4;
  }
  function paint() {
    if (!deck || !live) return updateConnection();
    const actual = slideAt(live.previewIndex);
    const preview = slideAt(selected);
    $("[data-empty]").hidden = true;
    $("[data-viewers]").hidden = false;
    $("[data-actions]").hidden = false;
    $("[data-script-panel]").hidden = false;
    if (actual && lastRenderedLive !== actual.index) { renderFrame("live", actual); lastRenderedLive = actual.index; }
    if (preview && lastRenderedPreview !== preview.index) {
      renderFrame("preview", preview); lastRenderedPreview = preview.index;
      $("[data-preview-script]").replaceChildren(...preview.scriptLines.map((line) => { const p = document.createElement("p"); p.textContent = line; return p; }));
    }
    $("[data-preview-heading]").textContent = following ? "Next" : "Preview";
    $("[data-preview-previous]").disabled = selected <= 0;
    $("[data-preview-next]").disabled = selected >= deck.slides.length - 1;
    $("[data-follow]").setAttribute("aria-pressed", String(following));
    document.querySelectorAll("[data-slide-index]").forEach((button) => {
      const index = Number(button.dataset.slideIndex);
      button.setAttribute("aria-pressed", String(index === selected));
      button.dataset.live = String(index === live.previewIndex);
    });
    document.querySelectorAll("[data-story-index]").forEach((button) => button.setAttribute("aria-current", String(slideAt(Number(button.dataset.storyIndex))?.storyNumber === preview?.storyNumber)));
    revealSelectedThumbnail();
    resizeFrames();
    updateConnection();
  }
  function select(index) {
    if (!deck) return;
    selected = Math.max(0, Math.min(index, deck.slides.length - 1));
    following = false;
    paint();
  }
  function buildNavigation() {
    $("[data-slide-total]").textContent = `(${deck.slides.length})`;
    $("[data-slide-list]").replaceChildren(...deck.slides.map((slide) => {
      const button = document.createElement("button"); button.type = "button"; button.dataset.slideIndex = String(slide.index);
      button.setAttribute("aria-label", `Slide ${slide.index + 1}: ${slide.title}`);
      button.title = slide.title;
      const number = document.createElement("span"); number.className = "slide-number"; number.textContent = String(slide.index + 1);
      const image = document.createElement("span"); image.className = "slide-miniature"; image.setAttribute("aria-hidden", "true");
      button.append(number, image); button.addEventListener("click", () => select(slide.index)); return button;
    }));
    thumbnailObserver?.disconnect();
    const rail = $("[data-slide-list]");
    thumbnailObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) mountThumbnail(entry.target);
        else entry.target.querySelector(".slide-miniature iframe")?.remove();
      });
    }, { root: rail, rootMargin: "160px 0px" });
    rail.querySelectorAll("[data-slide-index]").forEach((button) => thumbnailObserver.observe(button));
    const stories = new Map();
    deck.slides.forEach((slide) => { if (slide.storyNumber && !stories.has(slide.storyNumber)) stories.set(slide.storyNumber, slide); });
    $("[data-story-buttons]").replaceChildren(...[...stories.values()].map((slide) => {
      const button = document.createElement("button"); button.type = "button"; button.dataset.storyIndex = String(slide.index);
      button.textContent = `${slide.storyNumber} · ${String(slide.condition || "Story").replaceAll("BESTFRIEND", "BEST FRIEND").replaceAll("-", "–")}`;
      button.title = "Privately preview this story; participant slide stays unchanged";
      button.addEventListener("click", () => select(slide.index)); return button;
    }));
  }
  function receive(message) {
    if (!message || message.facilitatorSession !== session) return;
    if (message.type === "FACILITATOR_DECK") {
      if (message.version !== VERSION || !Array.isArray(message.slides) || !message.slides.length || message.slides.length > 1000) return;
      if (deck) return;
      const slides = message.slides.filter((slide, index) => slide.index === index && typeof slide.html === "string").map((slide) => ({ ...slide, title: String(slide.title || `Slide ${slide.index + 1}`), scriptLines: Array.isArray(slide.scriptLines) ? slide.scriptLines.map(String) : [] }));
      if (slides.length !== message.slides.length) return;
      deck = { slides, styles: Array.isArray(message.styles) ? message.styles : [], baseUrl: message.baseUrl, bodyClass: message.bodyClass };
      selected = Math.min((live?.previewIndex ?? message.currentIndex ?? 0) + 1, slides.length - 1);
      buildNavigation(); paint(); send("ping");
    } else if (message.type === "FACILITATOR_STATE") {
      if (!Number.isInteger(message.previewIndex) || message.previewIndex < 0) return;
      const changed = live?.previewIndex !== message.previewIndex;
      live = message; lastStateAt = Date.now();
      if (deck && following) selected = Math.min(live.previewIndex + 1, deck.slides.length - 1);
      if (pending !== null && live.previewIndex === pending.target) { pending = null; $("[data-navigation-status]").textContent = "Participant view updated."; }
      if (changed || lastRenderedLive === null) paint(); else updateConnection();
    } else if (message.type === "FACILITATOR_COMMAND_ACK") {
      if (!pending || message.commandId !== pending.id || seen.has(message.commandId)) return;
      seen.add(message.commandId);
      if (message.status === "rejected") { pending = null; $("[data-navigation-status]").textContent = "The study moved or could not navigate. Check its current slide and try again."; updateConnection(); }
    } else if (message.type === "GAME_COMPLETE") {
      pending = null; lastStateAt = 0; $("[data-navigation-status]").textContent = "The study has ended."; updateConnection();
    }
  }
  channel?.addEventListener("message", (event) => receive(event.data));
  window.addEventListener("message", (event) => { if (event.origin === location.origin && event.source === window.opener) receive(event.data); });
  $("[data-preview-previous]").addEventListener("click", () => select(selected - 1));
  $("[data-slide-list]").addEventListener("keydown", (event) => {
    const current = event.target.closest("[data-slide-index]");
    if (!current || !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = Number(current.dataset.slideIndex);
    select(event.key === "Home" ? 0 : event.key === "End" ? deck.slides.length - 1 : index + (event.key === "ArrowDown" ? 1 : -1));
    $("[data-slide-list]").querySelector(`[data-slide-index="${selected}"]`)?.focus({ preventScroll: true });
  });
  $("[data-preview-next]").addEventListener("click", () => select(selected + 1));
  $("[data-follow]").addEventListener("click", () => { if (!deck || !live) return; following = true; selected = Math.min(live.previewIndex + 1, deck.slides.length - 1); paint(); });
  $("[data-show]").addEventListener("click", () => {
    if (!isConnected() || pending !== null || selected === live.previewIndex) return;
    const backward = selected < live.previewIndex;
    if (backward && !window.confirm("Show this earlier slide to the participant? Answers from this slide onward will be reset, just like using Back. To look without changing answers, keep browsing this private preview.")) return;
    const id = send("navigate", { previewIndex: live.previewIndex, targetIndex: selected, resetLaterAnswers: backward });
    pending = { id, target: selected, sent: Date.now() };
    $("[data-navigation-status]").textContent = "Updating participant view…";
    updateConnection();
  });
  const observer = new ResizeObserver(resizeFrames);
  document.querySelectorAll("[data-viewport]").forEach((box) => observer.observe(box));
  observer.observe($("[data-slide-list]"));
  const timer = window.setInterval(() => {
    if (!deck) send("deck");
    if (!deck || Date.now() - lastStateAt > 4000) send("ping");
    if (pending && Date.now() - pending.sent > 12000) { pending = null; $("[data-navigation-status]").textContent = "The study has not confirmed the change. Check its current slide before trying again."; }
    updateConnection();
  }, 2000);
  window.addEventListener("pagehide", () => { clearInterval(timer); channel?.close(); observer.disconnect(); thumbnailObserver?.disconnect(); });
  send("deck"); send("ping"); updateConnection();
})();
