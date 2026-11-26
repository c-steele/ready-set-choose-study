(function () {
  'use strict';

  window.createStudySlideNavigator = function ({getSteps, getIndex, jumpTo, onOpen, onDismiss}) {
    if (window.parent !== window) return {refresh() {}};

    const toolbar = document.createElement('nav');
    toolbar.className = 'study-preview-nav';
    toolbar.setAttribute('aria-label', 'Researcher preview controls');
    toolbar.innerHTML = `
      <button type="button" class="spn-open" aria-haspopup="dialog" aria-controls="study-slide-dialog">
        <svg aria-hidden="true" viewBox="0 0 20 20" width="17" height="17"><rect x="1.5" y="3" width="17" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 3v14M3.6 6.5h1.5m-1.5 3.5h1.5m-1.5 3.5h1.5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>
        Slide navigator
      </button>
      <button type="button" class="spn-back">← Back</button>
      <button type="button" class="spn-skip">Skip →</button>`;
    const dialog = document.createElement('dialog');
    dialog.className = 'study-preview-dialog';
    dialog.id = 'study-slide-dialog';
    dialog.setAttribute('aria-labelledby', 'spn-heading');
    dialog.innerHTML = `
      <header class="spn-header"><h2 id="spn-heading">Slide navigator</h2><form method="dialog"><button>Close</button></form></header>
      <div class="spn-commands">
        <label>Jump to section <select class="spn-sections"></select></label>
        <button type="button" class="spn-first">First question</button>
        <button type="button" class="spn-last">Skip to end</button>
        <a href="review.html">All preview versions</a>
      </div>
      <div class="spn-list"></div>`;
    document.body.prepend(toolbar);
    document.body.append(dialog);
    document.body.classList.add('has-study-preview-nav');

    const opener = toolbar.querySelector('.spn-open');
    const back = toolbar.querySelector('.spn-back');
    const skip = toolbar.querySelector('.spn-skip');
    const first = dialog.querySelector('.spn-first');
    const last = dialog.querySelector('.spn-last');
    const sections = dialog.querySelector('.spn-sections');
    const list = dialog.querySelector('.spn-list');
    let listedSteps;
    let selectedRow;
    let navigatedFromDialog = false;

    function go(index) {
      if (index < 0 || index >= getSteps().length) return;
      if (dialog.open) {
        navigatedFromDialog = true;
        dialog.close();
      }
      jumpTo(index);
      refresh();
    }

    function sectionLabel(step) {
      if (step.previewIntro) return 'Family welcome and setup';
      if (!step.pairing) return 'Ending';
      return `Story ${step.storyIndex + 1} · ${step.pairing.label}`;
    }

    function previewRow(step, index) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.slideIndex = index;
      const thumb = document.createElement('span');
      thumb.className = 'spn-thumb';
      thumb.setAttribute('aria-hidden', 'true');
      if (step.image) {
        const image = document.createElement('img');
        image.loading = 'lazy';
        image.alt = '';
        image.src = step.image;
        thumb.append(image);
      } else {
        thumb.classList.add('spn-symbol');
        const introSymbols = ['▶', '✓', '▣', '→', '★'];
        thumb.textContent = step.previewIntro ? introSymbols[index] || '▶' : '✓';
      }
      const caption = document.createElement('span');
      caption.className = 'spn-caption';
      const title = document.createElement('strong');
      const label = step.previewIntro ? step.phase : step.displayText || step.text || step.phase;
      title.textContent = `${index + 1}. ${label}`;
      caption.append(title);
      if (step.when || step.unless) {
        const branch = document.createElement('small');
        branch.textContent = step.when ? `After choosing ${step.when[1]}` : `When the other helper is chosen`;
        caption.append(branch);
      }
      button.append(thumb, caption);
      return button;
    }

    function buildList(steps) {
      listedSteps = steps;
      selectedRow = null;
      sections.replaceChildren();
      const fragment = document.createDocumentFragment();
      let previousSection;
      for (const [index, step] of steps.entries()) {
        const name = sectionLabel(step);
        if (name !== previousSection) {
          const heading = document.createElement('h3');
          heading.id = 'spn-section-' + index;
          heading.tabIndex = -1;
          heading.textContent = name;
          sections.add(new Option(name, heading.id));
          fragment.append(heading);
          previousSection = name;
        }
        const row = previewRow(step, index);
        row.dataset.section = sections.options[sections.length - 1].value;
        fragment.append(row);
      }
      list.replaceChildren(fragment);
    }

    function refresh() {
      const steps = getSteps();
      const index = getIndex();
      back.disabled = index <= 0;
      skip.disabled = index < 0 || index >= steps.length - 1;
      opener.disabled = steps.length === 0;
      if (!dialog.open) return;
      if (listedSteps !== steps) buildList(steps);
      selectedRow?.removeAttribute('aria-current');
      selectedRow = list.querySelector(`[data-slide-index="${index}"]`);
      if (selectedRow) {
        selectedRow.setAttribute('aria-current', 'step');
        sections.value = selectedRow.dataset.section;
      }
      first.disabled = !steps.some(step => step.questionPosition === 1);
      last.disabled = steps.length === 0;
    }

    opener.addEventListener('click', () => {
      navigatedFromDialog = false;
      onOpen?.();
      dialog.showModal();
      refresh();
      if (selectedRow) {
        selectedRow.focus({preventScroll: true});
        selectedRow.scrollIntoView({block: 'nearest'});
      }
    });
    back.addEventListener('click', () => go(getIndex() - 1));
    skip.addEventListener('click', () => go(getIndex() + 1));
    first.addEventListener('click', () => go(getSteps().findIndex(step => step.questionPosition === 1)));
    last.addEventListener('click', () => go(getSteps().length - 1));
    list.addEventListener('click', event => {
      const row = event.target.closest('button[data-slide-index]');
      if (row) go(Number(row.dataset.slideIndex));
    });
    sections.addEventListener('change', () => {
      const heading = document.getElementById(sections.value);
      heading.focus({preventScroll: true});
      heading.scrollIntoView({block: 'start'});
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      opener.focus({preventScroll: true});
      if (!navigatedFromDialog) onDismiss?.();
    });
    return {refresh};
  };
})();
