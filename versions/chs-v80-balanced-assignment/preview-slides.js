// Only the researcher preview opens this dialog. Its pages come from the assigned timeline.
window.FindCaregiverPreview = (() => {
  const welcomeLabels = {
    parent_welcome: "Welcome, grown-ups!",
    parent_quick_checks: "Quick checks",
    camera_setup: "Camera setup",
    child_handoff: "Child’s turn",
    child_assent: "Would you like to play?",
    child_welcome: "Welcome to the game",
    study_complete: "Thank you for playing!",
  };

  function groupTitle(meta) {
    if (meta.story_number) {
      const roles = (meta.condition_pairing || "").split("-").filter(Boolean)
        .map((role) => role.toLowerCase().replace("bestfriend", "best friend"));
      return ["Story " + meta.story_number, roles.join(" and ")].filter(Boolean).join(" · ");
    }
    if (meta.slide_kind === "study_complete") return "Ending";
    if (meta.study_part) return "Part " + meta.study_part;
    if (meta.dyad_id) return "Questions about " + meta.subject;
    return "Welcome";
  }

  function makeSlideButton(node, index) {
    const template = document.createElement("template");
    template.innerHTML = node.stimulus;
    const page = template.content;
    const meta = node.data;
    const spoken = (meta.facilitator_script || "").split("\n").filter(Boolean);
    const heading = page.querySelector("h1, h2")?.textContent.trim();
    const caption = welcomeLabels[meta.slide_kind] || spoken[0] || heading || "Slide " + (index + 1);
    const choices = Array.from(page.querySelectorAll(".ksize-rating-choice"), (choice) => choice.getAttribute("aria-label"));
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.index = String(index);
    const thumb = document.createElement("span");
    thumb.className = "ftc-thumb";
    thumb.setAttribute("aria-hidden", "true");
    const source = page.querySelector(".ksize-slide-image img, .ksize-scene-wrap img, .ksize-image-wrap img, .ksize-lookit-example img");
    if (source) {
      const image = document.createElement("img");
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.src = source.getAttribute("src");
      thumb.append(image);
    } else {
      thumb.textContent = heading || caption;
    }
    const label = document.createElement("span");
    label.className = "ftc-slide-label";
    label.textContent = (index + 1) + ". " + caption;
    button.title = [caption, ...choices].join(" · ");
    button.append(thumb, label);
    return button;
  }

  function open(nodes, currentIndex, jump) {
    if (!nodes.length || document.querySelector(".ftc-slide-navigator[open]")) return;
    const dialog = document.createElement("dialog");
    dialog.className = "ftc-slide-navigator";
    dialog.setAttribute("aria-labelledby", "ftc-navigator-title");
    dialog.innerHTML = '<header><h2 id="ftc-navigator-title">Slide navigator</h2><button type="button" data-jump="start">Start</button><button type="button" data-jump="end">End</button><form method="dialog"><button type="submit">Close</button></form></header><div class="ftc-navigator-list"></div>';
    dialog.querySelector("header").addEventListener("click", (event) => {
      const target = event.target.closest("[data-jump]")?.dataset.jump;
      if (!target) return;
      dialog.close();
      jump(target === "start" ? 0 : nodes.length - 1);
    });
    const list = dialog.querySelector(".ftc-navigator-list");
    let previousGroup;
    nodes.forEach((node, index) => {
      const group = groupTitle(node.data);
      if (group !== previousGroup) {
        const heading = document.createElement("h3");
        heading.textContent = group;
        list.append(heading);
        previousGroup = group;
      }
      const slide = makeSlideButton(node, index);
      if (index === currentIndex) slide.setAttribute("aria-current", "step");
      list.append(slide);
    });
    list.addEventListener("click", (event) => {
      const slide = event.target.closest("button[data-index]");
      if (slide) {
        dialog.close();
        jump(Number(slide.dataset.index));
      }
    });
    list.addEventListener("keydown", (event) => {
      const slide = event.target.closest("button[data-index]");
      if (!slide) return;
      const index = Number(slide.dataset.index);
      const targets = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: nodes.length - 1 };
      if (Object.hasOwn(targets, event.key)) {
        event.preventDefault();
        list.querySelector('[data-index="' + targets[event.key] + '"]')?.focus();
      }
    });
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
    const current = list.querySelector('[aria-current="step"]');
    current?.focus({ preventScroll: true });
    current?.scrollIntoView({ block: "nearest" });
    return dialog;
  }

  return { open };
})();
