(() => {
  const slides = Array.from(document.querySelectorAll('template[data-audio]'));
  const stage = document.getElementById('jspsych-html-button-response-stimulus');
  let position = 0;
  let narration = null;
  let parentSound = true;

  function stopAudio() {
    if (!narration) return;
    narration.onended = narration.onerror = null;
    narration.pause();
    narration = null;
  }

  function setStartReady(ready) {
    const start = stage.querySelector('.ksize-next-btn');
    if (start) {
      start.disabled = !ready;
      start.classList.toggle('ksize-prompt-glow', ready);
    }
  }

  function playAudio() {
    stopAudio();
    setStartReady(false);
    const clip = new Audio(slides[position].dataset.audio);
    narration = clip;
    const notice = stage.querySelector('.intro-audio-status');
    notice.textContent = '';
    clip.onended = () => {
      if (narration === clip) setStartReady(true);
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

  function showSlide(index) {
    stopAudio();
    position = index;
    stage.replaceChildren(slides[index].content.cloneNode(true));
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

  window.addEventListener('pagehide', stopAudio);
  showSlide(0);
})();
