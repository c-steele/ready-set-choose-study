(function() {
  "use strict";

  var nextMountId = 0;
  var messages = Object.freeze({
    pending: "Connecting your live camera view…",
    ready: "Use this live view to keep your child’s full face and shoulders in view.",
    unavailable: "The live view is unavailable. Try again to check your child’s position.",
    fullscreen: "Exit full screen to check your child’s position in the live view.",
    review: "A live camera view is available when you open this study through Children Helping Science. This review page does not access your camera."
  });

  function requestedParentOrigin() {
    var query = new URLSearchParams(window.location.search);
    if (query.get("cameraPreviewBridge") !== "chs-parent") return "";
    var requested = query.get("cameraPreviewParentOrigin") || "";
    try {
      var parsed = new URL(requested);
      if (requested !== parsed.origin) return "";
      if (requested === "https://childrenhelpingscience.com") return requested;
      // An explicitly configured loopback parent is used only by local review.
      if (parsed.protocol === "http:" && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost")) {
        return requested;
      }
    } catch (_error) {}
    return "";
  }

  function mount(panel) {
    if (!panel) return function() {};
    var slot = panel.querySelector(".ksize-camera-preview-slot");
    var status = panel.querySelector(".ksize-camera-preview-status");
    var retry = panel.querySelector(".ksize-camera-preview-retry");
    if (!slot || !status) return function() {};
    var parentOrigin = requestedParentOrigin();
    var parentWindow = window.parent;
    var bridgeEnabled = Boolean(parentOrigin && parentWindow && parentWindow !== window);

    function setStatus(state) {
      panel.setAttribute("data-camera-preview-state", state);
      status.textContent = messages[state];
      if (retry) retry.hidden = state !== "unavailable";
    }

    if (!bridgeEnabled) {
      setStatus("review");
      return function() {};
    }

    function newPreviewId() {
      return "camera-preview-" + Date.now().toString(36) + "-" + (++nextMountId).toString(36)
        + "-" + Math.random().toString(36).slice(2, 10);
    }
    var previewId = newPreviewId();
    var active = true;
    var frame = null;
    var timeout = null;
    var requested = false;
    var observer = null;

    function clearPendingTimeout() {
      if (timeout !== null) window.clearTimeout(timeout);
      timeout = null;
    }

    function hidePreview() {
      if (!requested) return;
      requested = false;
      parentWindow.postMessage({ type: "CAMERA_PREVIEW_HIDE", preview_id: previewId }, parentOrigin);
      // A hidden host preview is closed permanently. A later visible request
      // gets a fresh identity, so queued show/status messages cannot revive it.
      previewId = newPreviewId();
    }

    function sendGeometry() {
      frame = null;
      if (!active) return;
      if (document.fullscreenElement) {
        clearPendingTimeout();
        hidePreview();
        setStatus("fullscreen");
        return;
      }
      var bounds = slot.getBoundingClientRect();
      var rect = {
        x: Number(bounds.x === undefined ? bounds.left : bounds.x),
        y: Number(bounds.y === undefined ? bounds.top : bounds.y),
        width: Number(bounds.width),
        height: Number(bounds.height)
      };
      var viewport = { width: Number(window.innerWidth), height: Number(window.innerHeight) };
      if (![rect.x, rect.y, rect.width, rect.height, viewport.width, viewport.height].every(Number.isFinite)
        || rect.width <= 0 || rect.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
        hidePreview();
        return;
      }
      if (panel.getAttribute("data-camera-preview-state") === "fullscreen") setStatus("pending");
      requested = true;
      parentWindow.postMessage({
        type: "CAMERA_PREVIEW_SHOW",
        preview_id: previewId,
        rect: rect,
        viewport: viewport
      }, parentOrigin);
      if (panel.getAttribute("data-camera-preview-state") === "pending" && timeout === null) {
        timeout = window.setTimeout(function() {
          timeout = null;
          if (active) setStatus("unavailable");
        }, 8000);
      }
    }

    function scheduleGeometry() {
      if (!active || frame !== null) return;
      frame = window.requestAnimationFrame(sendGeometry);
    }

    function receiveStatus(event) {
      if (!active || event.source !== parentWindow || event.origin !== parentOrigin) return;
      var data = event.data;
      if (!data || data.type !== "CAMERA_PREVIEW_STATUS" || data.preview_id !== previewId) return;
      if (!requested || document.fullscreenElement) return;
      if (data.status !== "ready" && data.status !== "unavailable") return;
      clearPendingTimeout();
      // Parent text never becomes HTML or visible copy; only known local messages are displayed.
      setStatus(data.status);
    }

    function retryPreview() {
      if (!active) return;
      clearPendingTimeout();
      setStatus("pending");
      scheduleGeometry();
    }

    function dispose() {
      if (!active) return;
      active = false;
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      clearPendingTimeout();
      if (observer) observer.disconnect();
      window.removeEventListener("message", receiveStatus);
      window.removeEventListener("resize", scheduleGeometry);
      window.removeEventListener("scroll", scheduleGeometry, true);
      window.removeEventListener("pagehide", dispose);
      document.removeEventListener("fullscreenchange", scheduleGeometry);
      if (retry) retry.removeEventListener("click", retryPreview);
      hidePreview();
    }

    setStatus("pending");
    window.addEventListener("message", receiveStatus);
    window.addEventListener("resize", scheduleGeometry);
    window.addEventListener("scroll", scheduleGeometry, true);
    window.addEventListener("pagehide", dispose);
    document.addEventListener("fullscreenchange", scheduleGeometry);
    if (retry) retry.addEventListener("click", retryPreview);
    if (typeof window.ResizeObserver === "function") {
      observer = new window.ResizeObserver(scheduleGeometry);
      observer.observe(slot);
    }
    scheduleGeometry();
    return dispose;
  }

  window.WTCCameraPreview = Object.freeze({ mount: mount });
})();
