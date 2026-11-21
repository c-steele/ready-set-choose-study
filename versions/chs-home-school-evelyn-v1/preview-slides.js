// Researcher navigation uses the family task's assigned slides and artwork.
window.WhoHelpsWherePreview = (() => {
  const screens = {
    parent_welcome: "Welcome, grown-ups!",
    parent_quick_checks: "Quick checks",
    camera_setup: "Camera setup",
    child_handoff: "Child’s turn",
    child_assent: "Would you like to play?",
    child_welcome: "Welcome to the game",
    study_complete: "Thank you for playing!",
    family_debrief: "Family debrief"
  };
  function open(nodes, current, jump) {
    let dialog = document.querySelector(".whw-slide-navigator");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "whw-slide-navigator";
      dialog.setAttribute("aria-labelledby", "whw-navigator-title");
      dialog.innerHTML = '<header><h2 id="whw-navigator-title">Slide navigator</h2><form method="dialog"><button type="submit">Close</button></form></header><div class="whw-navigator-list"></div>';
      const list = dialog.querySelector(".whw-navigator-list");
      let group;
      nodes.forEach((node, index) => {
        const meta = node.data;
        const heading = meta.story_number
          ? `${meta.context === "HOME" ? "House" : "School"} · Story ${meta.story_within_context || meta.story_number} · ${(meta.condition_pairing || "").replaceAll("-", " / ").toLowerCase()}`
          : ["study_complete", "family_debrief"].includes(meta.slide_kind) ? "Ending" : "Family welcome";
        if (heading !== group) {
          const section = document.createElement("h3");
          section.textContent = heading;
          list.append(section);
          group = heading;
        }
        const page = document.createElement("template");
        page.innerHTML = node.stimulus;
        const content = page.content;
        const caption = screens[meta.slide_kind] || content.querySelector(".ksize-context-spoken-banner")?.textContent.trim()
          || meta.facilitator_script?.split("\n")[0] || meta.slide_kind;
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.index = String(index);
        const thumb = document.createElement("span");
        thumb.className = "whw-thumb";
        thumb.setAttribute("aria-hidden", "true");
        const addImage = (url, position) => {
          if (!url) return;
          const image = document.createElement("img");
          image.alt = "";
          image.loading = "lazy";
          if (position) image.className = "whw-slot-" + position;
          image.src = url;
          thumb.append(image);
        };
        const exterior = content.querySelector(".ksize-entry-building image");
        if (exterior) {
          addImage(exterior.getAttribute("href"));
        } else {
          addImage(content.querySelector(".ksize-furnished-room")?.getAttribute("src"));
          const reveal = content.querySelector("canvas[data-revealed-slots]");
          if (reveal) {
            for (const slot of reveal.dataset.revealedSlots.split(",")) addImage(reveal.dataset.source, slot);
          } else {
            addImage(content.querySelector(".ksize-furnished-foreground, .ksize-slide-image img, .ksize-scene-wrap img, .ksize-camera-examples img")?.getAttribute("src"));
          }
        }
        if (!thumb.childElementCount) thumb.textContent = caption;
        const label = document.createElement("span");
        label.textContent = `${index + 1}. ${caption}`;
        button.append(thumb, label);
        button.addEventListener("click", () => jump(index));
        list.append(button);
      });
      document.body.append(dialog);
    }
    dialog.querySelector("[aria-current]")?.removeAttribute("aria-current");
    const selected = dialog.querySelector(`[data-index="${current}"]`);
    selected?.setAttribute("aria-current", "step");
    if (!dialog.open) dialog.showModal();
    selected?.scrollIntoView({ block: "nearest" });
  }
  return { open };
})();
