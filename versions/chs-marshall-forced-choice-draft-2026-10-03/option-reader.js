/* Answer choices are read automatically and unlock after the complete audio. */
(function (root) {
  'use strict';
  root.createOptionReader = function (container, labels, options = {}) {
    const buttons = [...container.querySelectorAll('[data-answer]:not(.continue-answer)')];
    const play = container.querySelector('[data-read-options]');
    const status = container.querySelector('[data-reader-status]');
    const clipIds = options.clipIds || [];
    let handle = null, disposed = false, token = 0;
    const scaled = buttons.some(button => button.classList.contains('rating-answer'));
    const updateStatus = text => { if (status) status.textContent = text; };
    const available = () => clipIds.length === labels.length && !!root.ObligationNarration?.coverage(clipIds).complete;
    function cancel() { token++; handle?.cancel(); handle = null; }
    function cue(current, ready = false, highlight = true) {
      buttons.forEach((button, i) => {
        button.disabled = !ready;
        button.classList.toggle('option-visible', !scaled || ready || i <= current);
        button.classList.toggle('option-current', highlight && !ready && i === current);
        button.classList.toggle('option-ready', ready);
      });
    }
    function replayControl() {
      if (!play) return;
      play.textContent = '▶'; play.setAttribute('aria-label','Replay choices');
      play.disabled = !available();
    }
    function reset() {
      if (disposed) return;
      cancel(); cue(-1); replayControl();
      updateStatus('Listen and look!');
    }
    function prepare() { cancel(); cue(-1); }
    function complete() {
      handle = null; cue(-1, true); replayControl();
      updateStatus('Tap one!'); options.onComplete?.();
    }
    function read() {
      if (disposed) return false;
      prepare();
      if (!available()) { updateStatus('Tap play to hear the choices.'); return false; }
      options.onReadStart?.();
      if (disposed) return false;
      prepare();
      const activeToken = token;
      updateStatus('Listen and look!');
      handle = root.ObligationNarration.play(clipIds, {
        onClipStart(id, index) {
          if (disposed || token !== activeToken) return;
          cue(index, false, false); updateStatus('Listen and look!');
        },
        onClipTime(id, index, seconds) {
          if (disposed || token !== activeToken) return;
          options.onClipTime?.(id, index, seconds);
        },
        onClipClear() {
          if (disposed || token !== activeToken) return;
          buttons.forEach(button => button.classList.remove('option-current'));
          options.onClipClear?.();
        },
        onEnd() { if (!disposed && token === activeToken) complete(); },
        onError(error) {
          if (disposed || token !== activeToken) return;
          handle = null; cue(-1); replayControl();
          updateStatus('Tap play to hear the choices again.'); options.onError?.(error);
        }
      });
      return true;
    }
    play?.addEventListener('click', read);
    reset();
    return {read, reset, prepare, ready: complete,
      dispose() { disposed = true; cancel(); play?.removeEventListener('click', read); }
    };
  };
})(window);
