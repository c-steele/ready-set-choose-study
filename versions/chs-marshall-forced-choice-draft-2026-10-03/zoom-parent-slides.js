/* Opening screens for facilitator-led Zoom. Written consent is completed via the lab's study-specific form. */
(() => {
  'use strict';

  const pages = {
    '-5': {
      title: 'Welcome, grown-ups!',
      text: 'I will tell your child short stories about someone who needs help. Your child will choose between characters and tell me what they think about each person. With your permission, I will record our visit in Zoom.',
      detail: 'Did you receive and sign the parent permission form the Spelke Lab emailed you? We can review it together. What questions do you have before we begin?',
      note: 'Taking part is your choice and your child’s choice. Either of you can ask for a break or stop at any time.',
      cue: 'Keep Zoom recording off. Confirm receipt of the signed parent permission form for this study. Describe the procedures, answer questions, and explain that you will record the parent’s verbal consent. Continue only once the parent says they are ready. If the form is missing, use the lab’s Adobe Sign process before proceeding.',
      options: ['Signed form confirmed', 'End visit']
    },
    '-4': {
      title: 'Parent or guardian’s permission',
      text: '“I have read and understand the consent document. I am this child\'s parent or legal guardian and we both agree to participate in this study.”',
      lead: 'Once you are ready and I have started recording in Zoom, please read this statement aloud.',
      cue: 'When the parent confirms readiness, start recording with the Harvard-licensed Zoom account. Ask the parent to say the displayed statement. Confirm only after you have heard it on the recording. These study slides do not start or store a recording.',
      options: ['Verbal consent confirmed', 'End visit']
    },
    '-3': {
      title: 'Getting ready for the stories',
      text: 'Can your child see the pictures and hear me clearly?',
      cards: [
        ['◉', 'One screen', 'Place the shared study screen directly in front of your child.'],
        ['♫', 'Listen and choose', 'I will read aloud. Your child can say an answer or point to a character and tell me which one.'],
        ['♡', 'Stay nearby', 'You can help with the device. Please let your child choose each answer on their own.']
      ],
      note: 'We can take a break whenever your child likes.',
      cue: 'Check the screen and sound with the family. If pointing is unclear over Zoom, ask which character the child meant before entering the response.',
      options: [],
      nextLabel: 'Ready'
    },
    '-2': {
      title: 'Would you like to play?',
      text: 'I have some picture stories to show you. I will read them to you, and you can tell me what you think.',
      detail: 'You can say yes or no. You can ask for a break or stop whenever you want.',
      cue: 'Ask the child directly, “Would you like to play?” Where verbal assent applies, capture both the question and the child’s answer on the Zoom recording. Accept their answer and end the visit if they decline.',
      options: ['Yes, I want to play', 'End visit']
    }
  };
  const stepNames = ['Written permission', 'Spoken permission', 'Instructions', 'Child’s turn'];

  function element(tag, classes, text, id) {
    const el = document.createElement(tag);
    if (classes) el.className = classes;
    if (text) el.textContent = text;
    if (id) el.id = id;
    return el;
  }

  function control(label, classes, callback, id) {
    const button = element('button', classes, label, id);
    button.type = 'button';
    button.addEventListener('click', callback);
    return button;
  }

  function progress(current) {
    const nav = element('nav', 'ksize-parent-progress');
    nav.setAttribute('aria-label', 'Getting ready');
    stepNames.forEach((label, index) => {
      const status = index === current ? ' active' : index < current ? ' complete' : '';
      const span = element('span', 'ksize-parent-progress-step' + status);
      if (index === current) span.setAttribute('aria-current', 'step');
      span.append(element('i', '', index < current ? '✓' : String(index + 1)), element('b', '', label));
      nav.append(span);
    });
    return nav;
  }

  function render(stage, index, onNext, onAnswer, onBack, canBack) {
    const page = pages[index];
    const shell = element('div', 'ksize-shell ksize-setup-shell zoom-parent-page');
    const card = element('section','ksize-screen ksize-setup-screen ksize-parent-welcome-screen');
    card.setAttribute('aria-labelledby', 'prompt');
    shell.append(card);
    card.append(progress(index + 5));
    const header = element('header','ksize-parent-welcome-header');
    header.append(element('span','ksize-setup-eyebrow','Who Has to Help? · Spelke Lab'),
      element('h1','ksize-setup-title',page.title,'prompt'));
    if (page.lead) header.append(element('p','ksize-parent-welcome-lead',page.lead));
    card.append(header);
    const copy = element(index === -4 ? 'blockquote' : 'p','zoom-parent-copy',page.text,'choice-prompt');
    card.append(copy);
    if (page.detail) card.append(element('p','zoom-parent-detail',page.detail));
    if (page.cards) {
      const grid = element('div','ksize-parent-welcome-grid');
      page.cards.forEach(([symbol, title, detail]) => {
        const item = element('article','ksize-parent-welcome-card');
        const icon = element('span','ksize-parent-welcome-icon',symbol);
        icon.setAttribute('aria-hidden','true');
        item.append(icon,element('h2','',title),element('p','',detail));
        grid.append(item);
      });
      card.append(grid);
    }
    if (page.note) card.append(element('p','zoom-parent-note',page.note));
    const footer = element('footer','zoom-parent-footer');
    const back = control('← Back','zoom-parent-back',onBack,'back');
    back.disabled = !canBack;
    footer.append(back);
    const answers = element('div','zoom-parent-actions',null,'answers');
    if (page.options.length) {
      page.options.forEach((label,i) => {
        const button=control(label,i===0?'ksize-setup-next':'zoom-parent-stop',()=>onAnswer(i));
        button.dataset.answer=String(i);
        answers.append(button);
      });
    } else {
      answers.append(control(page.nextLabel + ' ➜','ksize-setup-next',onNext,'next'));
    }
    footer.append(answers);
    card.append(footer);
    stage.replaceChildren(shell);
  }

  window.ZoomParentSlides = {pages, render};
})();
