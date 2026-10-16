(function installZoomIntroOutro(globalObject) {
  "use strict";

  // Exact slide exports from the supplied introoutroslidesksize.key, in deck order.
  // These are researcher-led visual prompts, not a consent form or answer collector.
  const VERSION = "keynote-v1";
  const sourceSlides = [
    { id: "welcome", phase: "intro", text: "Welcome!" },
    { id: "about-game", phase: "intro", text: "About today’s game\n10-15 minutes\nHear stories about animated characters on a screen\nHow does your child think?\nThis game will be recorded" },
    { id: "verbal-consent", phase: "intro", text: "Verbal Consent\n\"I have read and understand the consent document. I am this child’s parent or legal guardian and we both agree to participate in this study.\"" },
    { id: "get-started", phase: "intro", text: "Let’s get started!" },
    { id: "all-done", phase: "outro", text: "All done! Thank you for playing my game, today!" },
    { id: "video-release", phase: "outro", text: "1. Portions of videotape or pictures to be viewed by students or researchers as examples of behavior (in a textbook or academic presentation).\n2. Portions of videotape or pictures to be viewed by the public in brochures or publications used to educate and/or recruit for the lab.\n3. These videotapes will be uploaded to a repository that can be accessed by other researchers in the field of Developmental Psychology.\n4. Decline the release of any videotape or pictures, videos can only be viewed/used for people in lab" },
    { id: "sibling-questions", phase: "outro", text: "Quick Q’s:\n1. Does your child have any siblings (e.g., who live with them, or are regularly in contact)?\n2. If so, how many?\n3. How old?" },
    { id: "certificate", phase: "outro", text: "Would you like a certificate for your child?" },
  ];
  const slides = Object.freeze(sourceSlides.map((slide, index) => Object.freeze({
    ...slide,
    number: index + 1,
    image: new URL(`slide-${String(index + 1).padStart(2, "0")}.png`, globalObject.location.href).toString(),
  })));
  const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character]);

  function buildNodes({ phase, nodeType, jsPsych, installResearcherSkip, finishParticipantTrial, stopMedia }) {
    return slides.filter((slide) => slide.phase === phase).map((slide) => {
      const finalSlide = slide.number === slides.length;
      return {
        type: nodeType,
        choices: [],
        stimulus: `
          <main class="ksize-zoom-slide-shell">
            <div class="ksize-zoom-slide-frame">
              <img class="ksize-zoom-deck-image" src="${escape(slide.image)}" alt="${escape(slide.text)}" width="1920" height="1080">
            </div>
            <div class="ksize-zoom-slide-controls">
              <button class="ksize-zoom-slide-next" type="button">${finalSlide ? "Finish" : "Next"}</button>
            </div>
          </main>
        `,
        data: {
          slide_kind: `zoom_${phase}`,
          zoom_intro_outro_version: VERSION,
          zoom_deck_slide_number: slide.number,
          zoom_deck_slide_id: slide.id,
          researcher_led: true,
          facilitator_mode: true,
          facilitator_script: slide.text,
        },
        on_load: () => {
          stopMedia();
          installResearcherSkip(jsPsych);
          globalObject.document.querySelector(".ksize-zoom-slide-next")?.addEventListener("click", () => {
            finishParticipantTrial(jsPsych, {
              response: finalSlide ? "finish_zoom_slides" : "advance_zoom_slide",
              zoom_slide_advanced: true,
            }, 0, `zoom_${phase}_slide`);
          });
        },
        on_finish: () => stopMedia(),
      };
    });
  }

  globalObject.FTCZoomIntroOutro = Object.freeze({ version: VERSION, slides, buildNodes });
})(window);
