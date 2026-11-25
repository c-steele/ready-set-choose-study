(() => {
  const slides = Array.from(document.querySelectorAll('template[data-audio]'));
  const stage = document.getElementById('jspsych-html-button-response-stimulus');
  let position = 0;
  let narration = null;
  let parentSound = true;
  const introOptions = new URLSearchParams(location.search);
  const openingMusicEnabled = introOptions.get('openingMusic') === '1';
  const immediateStartEnabled = introOptions.get('immediateStart') === '1';
  const localCameraEnabled = introOptions.get('cameraPreview') === 'local';
  let closeCamera = null;
  let music = null;
  let audioRun = 0;

  function stopAudio() {
    audioRun += 1;
    music?.stop();
    music = null;
    if (!narration) return;
    narration.onended = narration.onerror = null;
    narration.pause();
    narration = null;
  }

  function setStartReady(ready) {
    const start = stage.querySelector('.ksize-next-btn');
    if (start) {
      const enabled = ready || (immediateStartEnabled && position === slides.length - 1);
      start.disabled = !enabled;
      start.classList.toggle('ksize-prompt-glow', enabled);
    }
  }

  async function playAudio() {
    stopAudio();
    const run = audioRun;
    setStartReady(false);
    const childMusic = openingMusicEnabled && position === slides.length - 1;
    if (childMusic) {
      const notice = stage.querySelector('.intro-audio-status');
      notice.textContent = '';
      music = window.MarshallOpeningMusic.play();
      try {
        const completed = await music.finished;
        if (!completed || run !== audioRun) return;
      } catch {
        if (run === audioRun) notice.textContent = 'Select Replay to hear the introduction.';
        return;
      }
    }
    const clip = new Audio(slides[position].dataset.audio);
    narration = clip;
    const notice = stage.querySelector('.intro-audio-status');
    notice.textContent = '';
    clip.onended = () => {
      if (narration !== clip) return;
      setStartReady(true);
      if (childMusic) {
        music = window.MarshallOpeningMusic.play();
        music.finished.catch(() => {});
      }
    };
    function onError(error) {
      if (narration !== clip) return;
      const child = position === slides.length - 1;
      // A fresh browser may require one click on Listen before playing audio.
      if (error?.name === 'NotAllowedError' && !child) return;
      notice.textContent = child ? 'Select Replay to hear the introduction.' : 'Select Listen to try again, or read the instructions below.';
    }
    clip.onerror = onError;
    clip.play().catch(onError);
  }

  function mountCamera(panel) {
    const slot = panel.querySelector('.ksize-camera-preview-slot');
    const status = panel.querySelector('.ksize-camera-preview-status');
    const button = panel.querySelector('.ksize-camera-preview-retry');
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('aria-label', 'Live view from your camera');
    slot.replaceChildren(video);
    panel.classList.add('local-camera-preview');
    panel.removeAttribute('data-camera-preview-state');
    let request = 0;
    let cameraOn = false;
    const off = 'You can turn on your camera to check the picture, or continue using the examples below. This view stays on your device.';

    function stop(message = off, label = 'Turn on camera') {
      request += 1;
      cameraOn = false;
      video.srcObject?.getTracks().forEach(track => track.stop());
      video.srcObject = null;
      slot.hidden = true;
      status.textContent = message;
      button.textContent = label;
    }

    async function toggleCamera() {
      if (cameraOn) {
        stop();
        return;
      }
      cameraOn = true;
      const current = ++request;
      status.textContent = 'Allow camera access in your browser to see the picture.';
      button.textContent = 'Cancel camera preview';
      try {
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
        if (current !== request) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          if (current === request) stop('The camera disconnected. You can reconnect it or continue.', 'Try camera again');
        }, {once: true});
        video.srcObject = stream;
        slot.hidden = false;
        await video.play();
        if (current !== request) return;
        status.textContent = 'Check that your child’s face and shoulders are in view. The camera turns off when you leave this step.';
        button.textContent = 'Turn off camera';
      } catch (error) {
        if (current !== request) return;
        const message = error.name === 'NotAllowedError'
          ? 'Camera access is blocked. You can allow it in your browser and try again, or continue using the examples below.'
          : 'The camera could not start. Check that it is connected and available, or continue using the examples below.';
        stop(message, 'Try camera again');
      }
    }

    stop();
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = 'A live view is unavailable in this browser. Use the examples below to check your position.';
      return;
    }
    button.hidden = false;
    button.addEventListener('click', toggleCamera);
    closeCamera = stop;
  }

  function showSlide(index) {
    stopAudio();
    closeCamera?.();
    closeCamera = null;
    position = index;
    stage.replaceChildren(slides[index].content.cloneNode(true));
    if (localCameraEnabled) {
      const summary = stage.querySelector('[data-camera-summary]');
      if (summary) summary.textContent = 'You can use your camera to check your position. Your microphone stays off, and this preview does not record.';
      const panel = stage.querySelector('.ksize-camera-live-preview');
      if (panel) {
        stage.querySelector('[data-camera-position-note]').textContent = 'Use these examples to check where your child sits.';
        mountCamera(panel);
      }
    }
    setStartReady(false);
    const heading = stage.querySelector('h1');
    heading.tabIndex = -1;
    if (index > 0) heading.focus({preventScroll: true});
    document.querySelector('.jspsych-content-wrapper').scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);

    const notice = document.createElement('p');
    notice.className = 'intro-audio-status';
    notice.setAttribute('role', 'status');
    const listen = stage.querySelector('.ksize-parent-listen, .ksize-start-audio');
    listen.parentNode.insertBefore(notice, listen);
    listen.addEventListener('click', playAudio);
    stage.querySelector('.intro-back')?.addEventListener('click', () => showSlide(index - 1));

    const toggle = stage.querySelector('.ksize-parent-narration-toggle');
    if (toggle) {
      const transcript = stage.querySelector('.ksize-parent-transcript');
      const update = () => {
        toggle.setAttribute('aria-pressed', String(!parentSound));
        toggle.textContent = parentSound ? 'Read instructions without narration' : 'Turn parent narration on';
        transcript.open = !parentSound;
      };
      toggle.addEventListener('click', () => {
        parentSound = !parentSound;
        update();
        if (parentSound) playAudio();
        else stopAudio();
      });
      update();
    }
    const next = stage.querySelector('.ksize-setup-next, .ksize-next-btn');
    next.addEventListener('click', () => {
      if (next.disabled) return;
      if (index + 1 < slides.length) {
        showSlide(index + 1);
      } else {
        stopAudio();
        window.frameElement.dispatchEvent(new Event('intro-complete'));
      }
    });
    if (!toggle || parentSound) playAudio();
  }

  window.addEventListener('pagehide', () => {
    closeCamera?.();
    stopAudio();
  });
  showSlide(0);
})();
