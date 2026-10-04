/* Recorded narration only. One shared channel prevents prompts and choices
 * from speaking over each other. No browser-generated voice is substituted. */
(function (root) {
  'use strict';
  let active = null;
  let generation = 0;
  const gapMs = 250;
  const stallMs = 30000;

  function manifest() { return root.ObligationNarrationManifest || {}; }
  function clipsById() {
    return Object.fromEntries((manifest().clips || []).map(clip => [clip.id, clip]));
  }
  function screenFor(step) {
    const id = typeof step === 'string' ? step : step?.id;
    const screen = manifest().screens?.[id] || {};
    return {prompt: screen.prompt || null, reminder: screen.reminder || null, options: screen.options || []};
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
    if (active) { active.clear(); active.notifyCancel(); }
    active = null;
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
      callbacks.onClipClear?.(sequence[index], index);
      try { old.pause(); } catch (_) { /* Already released by the browser. */ }
      try { old.removeAttribute('src'); old.load(); } catch (_) { /* Safe on simple audio mocks too. */ }
    }
    const run = {
      clear() { clearTimeout(timer); timer = null; clearAudio(); },
      cancel() { if (current()) stop(); },
      notifyCancel() { callbacks.onCancel?.(); }
    };
    active = run;
    function fail(code, message) {
      if (!current()) return;
      root.console?.warn?.('Recorded narration could not finish', {code, clipId: sequence[index] || null, readyState: audio?.readyState, networkState: audio?.networkState, currentTime: audio?.currentTime, mediaError: audio?.error?.code});
      run.clear();
      active = null;
      const error = new Error(message);
      error.code = code;
      error.clipId = sequence[index] || null;
      callbacks.onError?.(error);
    }
    function watch(watchedAudio) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (audio === watchedAudio) fail('audio-timeout', 'The recording did not finish loading or stopped playing. Read this screen aloud, or try again.');
      }, stallMs);
    }
    function next() {
      if (!current()) return;
      if (index >= sequence.length) {
        run.clear();
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
        audio = new root.Audio(audioSource);
        const currentAudio = audio;
        const clipIndex = index;
        const currentClip = () => current() && audio === currentAudio;
        function reportTime() {
          if (!currentClip() || !playing || currentAudio.paused || currentAudio.ended) return;
          callbacks.onClipTime?.(id, clipIndex, Number(currentAudio.currentTime) || 0);
        }
        function tick() {
          frame = null;
          if (!currentClip() || !playing || currentAudio.paused || currentAudio.ended) return;
          reportTime();
          if (root.requestAnimationFrame) frame = root.requestAnimationFrame(tick);
        }
        function suspendCue() {
          if (!currentClip()) return;
          playing = false; clearFrame(); callbacks.onClipClear?.(id, clipIndex);
        }
        audio.preload = 'auto';
        audio.onplaying = () => {
          if (!currentClip()) return;
          playing = true;
          watch(currentAudio);
          if (!announced) { announced = true; callbacks.onClipStart?.(id, clipIndex); }
          reportTime();
          clearFrame();
          if (root.requestAnimationFrame) frame = root.requestAnimationFrame(tick);
        };
        audio.ontimeupdate = () => { if (currentClip()) { watch(currentAudio); reportTime(); } };
        audio.onseeked = reportTime;
        audio.onpause = suspendCue;
        audio.onwaiting = audio.onstalled = () => { if (currentClip()) { suspendCue(); watch(currentAudio); } };
        audio.onerror = () => { if (currentClip()) fail('audio-load', 'The recording could not be loaded. Read this screen aloud, or try again.'); };
        audio.onended = () => {
          if (!currentClip()) return;
          callbacks.onClipEnd?.(id, clipIndex);
          clearTimeout(timer); clearAudio(); index++;
          if (index === sequence.length) next();
          else timer = setTimeout(next, gapMs);
        };
        watch(currentAudio);
        const started = audio.play();
        if (started?.catch) started.catch(error => {
          if (currentClip()) fail(error?.name === 'NotAllowedError' ? 'audio-blocked' : 'audio-play',
            error?.name === 'NotAllowedError' ? 'Tap Listen to hear the story.' : 'The recording could not play. Read this screen aloud, or try again.');
        });
      } catch (_) {
        fail('audio-unavailable', 'Recorded audio is unavailable in this browser. Read this screen aloud.');
      }
    }
    // Delay validation until the caller receives its cancellable handle.
    Promise.resolve().then(() => {
      if (!current()) return;
      if (!coverage(sequence).complete) {
        fail('recording-missing', 'The NaturalReader recording for this screen is not available yet. Read it aloud.');
        return;
      }
      next();
    });
    return {cancel: run.cancel};
  }
  const api = {screenFor, coverage, stop, play};
  Object.defineProperty(api, 'clipsById', {enumerable: true, get: clipsById});
  root.ObligationNarration = api;
})(window);
