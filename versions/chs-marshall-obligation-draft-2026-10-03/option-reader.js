/* Recorded choices and facilitator-controlled cues share the same glow flow. */
(function (root) {
  'use strict';
  root.createOptionReader = function (container, labels, options = {}) {
    const buttons = [...container.querySelectorAll('[data-answer]:not(.continue-answer)')];
    const play = container.querySelector('[data-read-options]');
    const manual = container.querySelector('[data-read-manually]');
    const status = container.querySelector('[data-reader-status]');
    const clipIds = options.clipIds || [];
    let handle = null;
    let manualIndex = -1;
    let disposed = false;
    let token = 0;
    const scaled = buttons.some(button => button.classList.contains('rating-answer'));
    const updateStatus = text => { if (status) status.textContent = text; };
    const updateControl = (control, text) => { if (control) control.textContent = text; };
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
    function reset() {
      if (disposed) return;
      cancel(); manualIndex = -1; cue(-1, !scaled); updateControl(manual, 'Read myself');
      updateControl(play, 'Read choices'); if (play) play.disabled = !available();
      updateStatus(available() ? 'Listen to each choice, or choose “Read myself”.' : 'Choice recordings are pending. Choose “Read myself” to read each option aloud.');
    }
    function prepare() { cancel(); manualIndex = -1; cue(-1); }
    function complete() {
      handle = null; manualIndex = -1; cue(-1, true);
      updateStatus('Now choose one.');
      updateControl(play, 'Read again'); if (play) play.disabled = !available(); updateControl(manual, 'Read myself');
      options.onComplete?.();
    }
    function read() {
      if (disposed) return false;
      prepare();
      if (!available()) return false;
      options.onReadStart?.();
      if (disposed) return false;
      // The start callback may stop the preceding prompt and reset this reader.
      prepare();
      const activeToken = token;
      updateControl(play, 'Restart reading');
      updateStatus('Loading the choice recordings…');
      handle = root.ObligationNarration.play(clipIds, {
        onClipStart(id, index) {
          if (disposed || token !== activeToken) return;
          cue(index, false, false); updateStatus(`Listen: ${labels[index]}`);
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
          handle = null; cue(-1); manualIndex = -1;
          updateControl(play, 'Try recording again'); updateControl(manual, 'Read myself');
          updateStatus(`${error.message} Choose “Read myself” to highlight each option as you read.`);
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
      updateControl(play, 'Read choices');
      if (manualIndex >= labels.length) { complete(); return; }
      cue(manualIndex); options.onManualCue?.(manualIndex); updateStatus(`Read aloud: ${labels[manualIndex]}`);
      updateControl(manual, manualIndex === labels.length - 1 ? 'Finish reading' : 'Next option');
    }
    play?.addEventListener('click', read);
    manual?.addEventListener('click', readManually);
    reset();
    return {
      read, reset, prepare, ready: complete,
      dispose() {
        disposed = true; cancel();
        play?.removeEventListener('click', read);
        manual?.removeEventListener('click', readManually);
      }
    };
  };
})(window);
