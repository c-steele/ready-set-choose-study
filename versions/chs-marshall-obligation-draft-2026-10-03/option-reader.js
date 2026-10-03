/* Recorded choices and facilitator-controlled cues share the same glow flow. */
(function (root) {
  'use strict';
  root.createOptionReader = function (container, labels, options = {}) {
    const buttons = [...container.querySelectorAll('.rating-answer')];
    const play = container.querySelector('[data-read-options]');
    const manual = container.querySelector('[data-read-manually]');
    const status = container.querySelector('[data-reader-status]');
    const clipIds = options.clipIds || [];
    let handle = null;
    let manualIndex = -1;
    let disposed = false;
    let token = 0;
    const available = () => clipIds.length === labels.length && !!root.ObligationNarration?.coverage(clipIds).complete;
    function cancel() { token++; handle?.cancel(); handle = null; }
    function cue(current, ready = false) {
      buttons.forEach((button, i) => {
        button.disabled = !ready;
        button.classList.toggle('option-visible', ready || i <= current);
        button.classList.toggle('option-current', !ready && i === current);
        button.classList.toggle('option-ready', ready);
      });
    }
    function reset() {
      if (disposed) return;
      cancel(); manualIndex = -1; cue(-1); manual.textContent = 'Read myself';
      play.textContent = 'Read choices'; play.disabled = !available();
      status.textContent = available() ? 'Listen to each choice, or choose “Read myself”.' : 'Choice recordings are pending. Choose “Read myself” to read each option aloud.';
    }
    function complete() {
      handle = null; manualIndex = -1; cue(-1, true);
      status.textContent = 'Now choose one.';
      play.textContent = 'Read again'; play.disabled = !available(); manual.textContent = 'Read myself';
      options.onComplete?.();
    }
    function read() {
      if (disposed) return false;
      reset();
      if (!available()) return false;
      options.onReadStart?.();
      if (disposed) return false;
      const activeToken = token;
      play.textContent = 'Restart reading';
      status.textContent = 'Loading the choice recordings…';
      handle = root.ObligationNarration.play(clipIds, {
        onClipStart(id, index) {
          if (disposed || token !== activeToken) return;
          cue(index); status.textContent = `Listen: ${labels[index]}`;
        },
        onEnd() { if (!disposed && token === activeToken) complete(); },
        onError(error) {
          if (disposed || token !== activeToken) return;
          handle = null; cue(-1); manualIndex = -1;
          play.textContent = 'Try recording again'; manual.textContent = 'Read myself';
          status.textContent = `${error.message} Choose “Read myself” to highlight each option as you read.`;
          options.onError?.(error);
        }
      });
      return true;
    }
    function readManually() {
      if (disposed) return;
      if (manualIndex < 0) {
        options.onManualStart?.();
        root.ObligationNarration?.stop();
        reset(); manualIndex = 0;
      } else { cancel(); manualIndex++; }
      play.textContent = 'Read choices';
      if (manualIndex >= labels.length) { complete(); return; }
      cue(manualIndex); status.textContent = `Read aloud: ${labels[manualIndex]}`;
      manual.textContent = manualIndex === labels.length - 1 ? 'Finish reading' : 'Next option';
    }
    play.addEventListener('click', read);
    manual.addEventListener('click', readManually);
    reset();
    return {
      read, reset,
      dispose() {
        disposed = true; cancel();
        play.removeEventListener('click', read);
        manual.removeEventListener('click', readManually);
      }
    };
  };
})(window);
