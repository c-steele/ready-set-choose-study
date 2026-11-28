/* The screen-share introduction follows the Find the Caregiver Zoom deck.
   The facilitator verifies the lab's signed study-specific form separately. */
(() => {
  'use strict';

  const content = [
    'Your child will hear short stories about characters on the screen.',
    'Your child can tell me an answer or point to a character.',
    'With your permission, I will record our game in Zoom.'
  ];
  const pages = {
    '-3': {
      title: 'About today’s game',
      text: '',
      cue: 'Before recording, check the signed study-specific parent permission form and answer any questions. Families and children can pause or stop at any time.',
      options: [],
      nextLabel: 'Next'
    },
    '-2': {
      title: 'Verbal Consent',
      text: '“I have read and understand the consent document. I am this child\'s parent or legal guardian and we both agree to participate in this study.”',
      cue: 'When the parent is ready, start the Harvard-licensed Zoom recording. Ask the parent to read the statement aloud. Then ask the child, “Would you like to play?” Continue once the parent has given permission and the child is willing to participate. End the visit if either declines.',
      options: ['Continue', 'End visit']
    }
  };
  function getPage(index, count = 6) {
    const page = pages[index];
    if (Number(index) !== -3) return page;
    const duration = count === 'both' ? 'About 5 minutes for one story or 10–15 minutes for six stories.' :
      Number(count) === 1 ? 'About 5 minutes.' : 'About 10–15 minutes.';
    const bullets = [duration, ...content];
    return {...page, text:bullets.join(' '), bullets};
  }
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }
  function button(label, id, action) {
    const b = el('button', '', label);
    b.type = 'button';
    if (id) b.id = id;
    b.addEventListener('click', action);
    return b;
  }
  function render(stage, index, onNext, onAnswer, onBack, canBack, count = 6) {
    const page = getPage(index,count);
    const wrap = el('section','zoom-parent-page');
    const card = el('div',page.bullets ? 'zoom-parent-sheet instructions' : 'zoom-parent-sheet consent');
    wrap.setAttribute('aria-labelledby','prompt');
    const title = el('h1','',page.title);
    title.id = 'prompt';
    card.append(title);
    const body = el(page.bullets ? 'ul' : 'blockquote','', page.bullets ? '' : page.text);
    body.id = 'choice-prompt';
    if (page.bullets) {
      page.bullets.forEach((label, i) => {
        const row = el('li');
        const icon = el('span','zoom-parent-icon icon-' + i);
        icon.setAttribute('aria-hidden','true');
        row.append(icon,el('span','zoom-parent-label',label));
        body.append(row);
      });
    }
    card.append(body);
    const footer = el('nav','zoom-parent-footer');
    footer.setAttribute('aria-label','Slide controls');
    const back = button('← Back','back',onBack);
    back.disabled = !canBack;
    const answers = el('div','zoom-parent-actions');
    answers.id = 'answers';
    if (page.options.length) {
      for (const [i,label] of page.options.entries()) {
        const b = button(label,'',()=>onAnswer(i));
        b.dataset.answer = String(i);
        b.className = i===0 ? 'primary' : 'stop';
        answers.append(b);
      }
    } else {
      const next = button(page.nextLabel + ' →','next', onNext);
      next.className = 'primary';
      answers.append(next);
    }
    footer.append(back,answers);
    wrap.append(card,footer);
    stage.replaceChildren(wrap);
  }
  window.ZoomParentSlides = {pages, getPage, render};
})();
