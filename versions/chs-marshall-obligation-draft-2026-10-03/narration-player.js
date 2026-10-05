/* Recorded narration only. One shared channel prevents prompts and choices
 * from speaking over each other. No browser-generated voice is substituted. */
(function (root) {
  'use strict';
  let active = null;
  let generation = 0;
  // WebKit grants playback permission per media element. Keep the same real
  // element for prompts, choices and later screens after an authorized start.
  let media = null;
  const gapMs = 250;
  const stallMs = 30000;

  function manifest() { return root.ObligationNarrationManifest || {}; }
  function clipsById() {
    return Object.fromEntries((manifest().clips || []).map(clip => [clip.id, clip]));
  }
  function screenFor(step) {
    const id = typeof step === 'string' ? step : step?.id;
    const screen = manifest().screens?.[id] || {};
    const prompt = typeof step === 'object' && step?.predictionResponse
      ? screen.promptVariants?.[step.predictionResponse] || null
      : screen.prompt;
    return {prompt: prompt || null, reminder: screen.reminder || null, options: screen.options || []};
  }
  function coverage(ids) {
    const clips = clipsById();
    const wanted = [...new Set(ids === undefined ? Object.keys(clips) : (Array.isArray(ids) ? ids : [ids]))];
    const missingIds = wanted.filter(id => !id || typeof clips[id]?.src !== 'string' || !clips[id].src.trim());
    return {total: wanted.length, available: wanted.length - missingIds.length,
      missing: missingIds.length, missingIds, complete: wanted.length > 0 && missingIds.length === 0};
  }
  function stop() {
    generation++;
    const previous = active;
    active = null;
    if (previous) { previous.clear(); previous.notifyCancel(); }
  }
  function play(ids, callbacks = {}) {
    stop();
    const token = generation;
    const sequence = Array.isArray(ids) ? [...ids] : [ids];
    const clips = clipsById();
    let audio = null;
    let timer = null;
    let frame = null;
    let index = 0;
    let clipSerial = 0;
    const current = () => active === run && generation === token;
    function clearFrame() {
      if (frame !== null && root.cancelAnimationFrame) root.cancelAnimationFrame(frame);
      frame = null;
    }
    function clearAudio() {
      clearFrame();
      if (!audio) return;
      const old = audio;
      audio = null;
      old.onplaying = old.onended = old.onerror = old.onwaiting = old.onstalled = old.ontimeupdate = old.onpause = old.onseeked = null;
      try { old.pause(); } catch (_) { /* Already released by the browser. */ }
      // Clear the old element before notifying the caller: a callback may
      // immediately start another run on this same element.
      callbacks.onClipClear?.(sequence[index], index);
    }
    const run = {
      clear() { clearTimeout(timer); timer = null; clearAudio(); },
      cancel() { if (current()) stop(); },
      notifyCancel() { callbacks.onCancel?.(); }
    };
    active = run;
    function fail(code, message) {
      if (!current()) return;
      root.console?.warn?.('Recorded narration could not finish: ' + JSON.stringify({code, clipId: sequence[index] || null, readyState: audio?.readyState, networkState: audio?.networkState, currentTime: audio?.currentTime, mediaError: audio?.error?.code}));
      run.clear();
      if (!current()) return;
      active = null;
      const error = new Error(message);
      error.code = code;
      error.clipId = sequence[index] || null;
      callbacks.onError?.(error);
    }
    function watch(watchedAudio, watchedSerial) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (audio === watchedAudio && clipSerial === watchedSerial) fail('audio-timeout', 'The recording did not finish loading or stopped playing. Read this screen aloud, or try again.');
      }, stallMs);
    }
    function next() {
      if (!current()) return;
      if (index >= sequence.length) {
        run.clear();
        if (!current()) return;
        active = null;
        callbacks.onEnd?.();
        return;
      }
      const id = sequence[index];
      let announced = false;
      let playing = false;
      try {
        const source = clips[id].src;
        const version = clips[id].sha256?.slice(0, 12);
        const audioSource = version ? `${source}${source.includes('?') ? '&' : '?'}v=${version}` : source;
        if (!media) media = new root.Audio();
        audio = media;
        const currentAudio = audio;
        const clipIndex = index;
        const serial = ++clipSerial;
        const currentClip = () => current() && audio === currentAudio && index === clipIndex && clipSerial === serial;
        function reportTime() {
          if (!currentClip() || !playing || currentAudio.paused || currentAudio.ended) return;
          callbacks.onClipTime?.(id, clipIndex, Number(currentAudio.currentTime) || 0);
        }
        function tick() {
          if (!currentClip() || !playing || currentAudio.paused || currentAudio.ended) return;
          frame = null;
          reportTime();
          if (root.requestAnimationFrame) frame = root.requestAnimationFrame(tick);
        }
        function suspendCue() {
          if (!currentClip()) return;
          playing = false; clearFrame(); callbacks.onClipClear?.(id, clipIndex);
        }
        audio.preload = 'auto';
        audio.onplaying = () => {
          if (!currentClip() || currentAudio.paused || currentAudio.ended) return;
          playing = true;
          watch(currentAudio, serial);
          if (!announced) { announced = true; callbacks.onClipStart?.(id, clipIndex); }
          reportTime();
          clearFrame();
          if (root.requestAnimationFrame) frame = root.requestAnimationFrame(tick);
        };
        audio.ontimeupdate = () => { if (currentClip()) { watch(currentAudio, serial); reportTime(); } };
        audio.onseeked = reportTime;
        audio.onpause = () => { if (currentAudio.paused) suspendCue(); };
        audio.onwaiting = audio.onstalled = () => {
          if (!currentClip()) return;
          if (currentAudio.readyState < 3) suspendCue();
          watch(currentAudio, serial);
        };
        audio.onerror = () => { if (currentClip() && currentAudio.error) fail('audio-load', 'The recording could not be loaded. Read this screen aloud, or try again.'); };
        audio.onended = () => {
          if (!currentClip() || !currentAudio.ended) return;
          callbacks.onClipEnd?.(id, clipIndex);
          if (!currentClip()) return;
          clearTimeout(timer); clearAudio(); index++;
          if (!current()) return;
          if (index === sequence.length) next();
          else timer = setTimeout(next, gapMs);
        };
        // Changing the source keeps this element's browser-granted permission.
        // The real recording starts here, without a Promise/timer before play().
        audio.src = audioSource;
        watch(currentAudio, serial);
        const started = audio.play();
        if (started?.catch) started.catch(error => {
          if (currentClip()) fail(error?.name === 'NotAllowedError' ? 'audio-blocked' : 'audio-play',
            error?.name === 'NotAllowedError' ? 'Tap Listen to hear the story.' : 'The recording could not play. Read this screen aloud, or try again.');
        });
      } catch (_) {
        Promise.resolve().then(() => fail('audio-unavailable', 'Recorded audio is unavailable in this browser. Read this screen aloud.'));
      }
    }
    if (coverage(sequence).complete) {
      // Preserve the user gesture when this call is made by the start/replay
      // control. A browser may still reject autoplay, which is reported above.
      next();
    } else {
      // Missing-recording notification waits until the caller has its handle.
      Promise.resolve().then(() => {
        fail('recording-missing', 'The NaturalReader recording for this screen is not available yet. Read it aloud.');
      });
    }
    return {cancel: run.cancel};
  }
  const api = {screenFor, coverage, stop, play};
  Object.defineProperty(api, 'clipsById', {enumerable: true, get: clipsById});
  root.ObligationNarration = api;
})(window);
