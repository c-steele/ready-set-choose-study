// The same four-second opening tune used by Who Helps Where.
window.MarshallOpeningMusic = {
  play() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return {finished: Promise.resolve(true), stop() {}};
    const context = new AudioContextClass();
    let settled = false;
    let started = false;
    let endTimer;
    let resumeTimer;
    let resolveFinished;
    let rejectFinished;
    const finished = new Promise((resolve, reject) => {
      resolveFinished = resolve;
      rejectFinished = reject;
    });

    function finish(completed, error) {
      if (settled) return;
      settled = true;
      clearTimeout(endTimer);
      clearTimeout(resumeTimer);
      context.onstatechange = null;
      document.body.classList.remove('ksize-intro-music-playing');
      context.close().catch(() => {});
      if (error) rejectFinished(error);
      else resolveFinished(completed);
    }

    function start() {
      if (started || settled || context.state !== 'running') return;
      started = true;
      clearTimeout(resumeTimer);
      const master = context.createGain();
      master.gain.value = 0.28;
      master.connect(context.destination);
      document.body.classList.add('ksize-intro-music-playing');
      const startAt = context.currentTime + 0.05;
      const beat = 0.28;
      const melody = [
        [523.25, 0, 0.22], [659.25, 1, 0.22], [783.99, 2, 0.3],
        [659.25, 3.2, 0.18], [880, 4, 0.22], [987.77, 5, 0.22],
        [1046.5, 6, 0.38], [783.99, 7.5, 0.2], [987.77, 8.5, 0.22],
        [1174.66, 9.5, 0.22], [1318.51, 10.5, 0.55],
      ];
      const playTone = (frequency, offset, duration, type = "triangle", level = 0.1) => {
        const begins = startAt + offset * beat;
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, begins);
        gain.gain.setValueAtTime(0.0001, begins);
        gain.gain.linearRampToValueAtTime(level, begins + 0.025);
        gain.gain.setValueAtTime(level * 0.7, begins + Math.max(0.05, duration - 0.06));
        gain.gain.exponentialRampToValueAtTime(0.0001, begins + duration);
        osc.connect(gain).connect(master);
        osc.start(begins);
        osc.stop(begins + duration + 0.03);
      };
      melody.forEach(([frequency, offset, duration]) => {
        playTone(frequency, offset, duration);
        playTone(frequency * 2, offset + 0.04, duration * 0.72, "sine", 0.025);
      });
      [
        [261.63, 0, 3.4], [349.23, 4, 2.7], [392, 7.5, 2.8], [523.25, 10.5, 1.6],
      ].forEach(([frequency, offset, duration]) => {
        [1, 1.25, 1.5].forEach((ratio) => playTone(frequency * ratio, offset, duration * beat, "sine", 0.018));
      });
      endTimer = setTimeout(() => finish(true), 3900);
    }

    resumeTimer = setTimeout(() => {
      finish(false, new Error('Select Replay to start the welcome audio.'));
    }, 1500);
    context.onstatechange = start;
    context.resume().then(start).catch(error => finish(false, error));
    start();
    return {finished, stop: () => finish(false)};
  }
};
