(function (root, factory) {
  'use strict';
  const api = typeof module !== 'undefined' && module.exports
    ? factory(require('./script-data.js'), require('./pairing-catalog.js'))
    : factory(root.ObligationDraft, root.ObligationPairings);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ObligationSession = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (draft, catalog) {
  'use strict';
  if (!draft || !catalog) throw new Error('Load the question template and pairing catalog before session-data.js.');
  const templates = Object.fromEntries(draft.steps.map(s => [s.id, s]));
  const upper = text => text.charAt(0).toUpperCase() + text.slice(1);
  const apostrophes = text => String(text).replace(/'/g, '’');
  const copy = value => JSON.parse(JSON.stringify(value));
  const wordCount = text => (String(text).match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || []).length;
  const questionOrders = [
    {id:'will-first', label:'Who WILL help? → Who HAS TO help?', firstQuestion:'prediction', steps:['predict-compare','obligation-compare']},
    {id:'has-to-first', label:'Who HAS TO help? → Who WILL help?', firstQuestion:'obligation', steps:['obligation-compare','predict-compare']}
  ];

  function nextIndex(steps, index, answers) {
    let next = index + 1;
    while (next < steps.length) {
      const step = steps[next];
      if (step.when && answers[step.when[0]] !== step.when[1] ||
          step.unless && answers[step.unless[0]] === step.unless[1]) next++;
      else break;
    }
    return next;
  }

  function storySteps(pairing, storyIndex, questionOrder, care, firstRatingSide) {
    const result = [], p = copy(pairing);
    // Use one clear name for the child recipient in every prompt and cue.
    if (!p.recipient.isAdult) {
      p.recipient.description = p.recipient.reference;
      for (const intro of p.intros) if (intro.actorId === 'recipient') intro.description = p.recipient.reference;
    }
    const recipient = p.recipient, helpers = p.helpers;
    const scene = p.careEvents[care];
    p.care = care;
    p.images.need = scene.image;
    p.needSummary = upper(scene.need.replace(/^Oh no! /, '').replace(/ now!$/, '.'));
    const prefix = localId => `${p.id}:${localId}`;
    function add(localId, source, overrides) {
      const template = typeof source === 'string' ? templates[source] : source;
      const step = {...copy(template), image:p.images.need, ...overrides,
        id:prefix(localId), localId, pairing:p, care, storyIndex, adapted:true};
      if (step.replayFrom) step.replayFrom = prefix(step.replayFrom);
      if (step.when) step.when = [prefix(step.when[0]), step.when[1]];
      if (step.unless) step.unless = [prefix(step.unless[0]), step.unless[1]];
      if (step.point || step.expected) { step.requireCorrect = true; step.allowBypass = false; }
      result.push(step);
    }
    const helperChoices = helpers.map(h => upper(h.description));
    const choiceQuestion = apostrophes(p.sourceHugQuestion.trim().split('\n').pop());
    const pairOptions = {choices:helperChoices, choiceQuestion, optionActors:helpers.map(h => h.id)};
    add('group', 'group', {image:p.images.group});
    for (const intro of p.intros) {
      add(`intro-${intro.actorId}`, 'kid', {
        phase:`Meet ${intro.description}`, image:intro.image,
        text:apostrophes(intro.sourceText),
        note:'Narrated character introduction from Find the Caregiver.'
      });
    }
    add('need', 'need', {phase:`${upper(recipient.description)} needs help`, text:scene.need});
    const earlyQuestions = {
      'predict-compare':scene.prediction,
      'obligation-compare':scene.obligation
    };
    questionOrder.steps.forEach((localId, index) => add(localId, localId, {
      ...pairOptions, text:earlyQuestions[localId], questionPosition:index+1
    }));
    const outcomeSummary = `No one helped ${recipient.description}.`;
    add('outcome-summary', 'outcome-summary', {text:outcomeSummary, displayText:outcomeSummary, outcomeVisual:true});
    const outcomeCaptions = helpers.map(helper=>`${upper(helper.description)} did NOT help ${recipient.description}.`).concat(outcomeSummary);
    const explicitOutcome = outcomeCaptions.join(' ');
    add('outcome', 'outcome', {text:explicitOutcome, displayText:outcomeCaptions[0], outcomeCaptions, outcomeVisual:true});
    add('recall-all', 'recall-all', {
      text:`Can you tell me, did either of these people help ${recipient.description}?`,
      replayFrom:'outcome-summary'
    });
    const ratingOrder = firstRatingSide === 'left' ? helpers : [...helpers].reverse();
    ratingOrder.forEach((helper, index) => {
      for (const step of draft.ratingsFor(helper, recipient.reference, index + 1)) {
        add(step.id, step);
      }
    });
    return result;
  }

  function spokenWords(step) {
    // Count the full read-aloud script, context and preface. Count each displayed
    // response option once, omitting binary labels already spoken in the prompt.
    const text = [step.context, step.preface, step.text].filter(Boolean).join(' ');
    const labelsInPrompt = /Yes or No\.?$/i.test(step.text || '') || /Mean or Not Mean/i.test(step.text || '');
    const choices = labelsInPrompt ? [] : step.choices || [];
    return wordCount(text) + wordCount(step.choiceQuestion || choices.join(' ')) + wordCount(step.correctFeedback || '');
  }

  function pathStats(steps, maximize) {
    const answers = {}, reached = [];
    for (let index = 0; index < steps.length;) {
      const step = steps[index]; reached.push(step);
      let answer = step.expected || step.point;
      if (!answer && step.choices) {
        const children = steps.filter(s => s.when && s.when[0] === step.id);
        const cost = choice => (step.confirmChoice ? wordCount(step.choiceConfirmations[choice].text) : 0)
          + children.filter(child => child.when[1] === choice).reduce((sum, child) => sum + spokenWords(child), 0);
        answer = step.choices.reduce((chosen, choice) =>
          (maximize ? cost(choice) > cost(chosen) : cost(choice) < cost(chosen)) ? choice : chosen);
      }
      answers[step.id] = answer || 'Continue';
      index = nextIndex(steps, index, answers);
    }
    return {
      staticScreens:reached.length,
      virtualConfirmationScreens:reached.filter(s => s.confirmChoice).length,
      virtualCorrectFeedbackScreens:reached.filter(s => s.correctFeedback).length,
      screens:reached.length + reached.filter(s => s.confirmChoice).length + reached.filter(s => s.correctFeedback).length,
      responses:reached.filter(s => s.choices || s.point).length + reached.filter(s => s.confirmChoice).length,
      words:reached.reduce((sum, step) => sum + spokenWords(step) + (step.confirmChoice ? wordCount(step.choiceConfirmations[answers[step.id]].text) : 0), 0),
      substantive:reached.filter(s => /^Forced-choice/.test(s.measure || '') || s.measure === 'Individual evaluation').length,
      forcedChoiceResponses:reached.filter(s => /^Forced-choice/.test(s.measure || '')).length,
      individualEvaluationResponses:reached.filter(s => s.measure === 'Individual evaluation').length,
      confirmationResponses:reached.filter(s => s.confirmChoice).length,
      checks:reached.filter(s => s.point || s.expected && !s.localId.startsWith('practice-')).length,
      practiceResponses:reached.filter(s => s.localId.startsWith('practice-') && s.choices).length,
      strengthResponses:reached.filter(s => /meanness strength$/i.test(s.measure || '')).length
    };
  }

  function statsFor(steps, storyCount) {
    const min = pathStats(steps, false), max = pathStats(steps, true);
    return {
      storyCount, possibleScreens:steps.length + steps.filter(s => s.confirmChoice).length + steps.filter(s => s.correctFeedback).length,
      possibleStaticScreens:steps.length, staticScreens:{min:min.staticScreens, max:max.staticScreens},
      virtualConfirmationScreens:min.virtualConfirmationScreens, virtualCorrectFeedbackScreens:min.virtualCorrectFeedbackScreens,
      screens:{min:min.screens, max:max.screens}, responses:{min:min.responses, max:max.responses},
      words:{min:min.words, max:max.words},
      minutes:{min:Math.round((min.words / 130 + min.responses * 3 / 60) * 10) / 10,
        max:Math.round((max.words / 110 + max.responses * 5 / 60) * 10) / 10},
      substantive:min.substantive, forcedChoiceResponses:min.forcedChoiceResponses, individualEvaluationResponses:min.individualEvaluationResponses, confirmationResponses:min.confirmationResponses, checks:min.checks, practiceResponses:min.practiceResponses,
      strengthResponses:{min:min.strengthResponses, max:max.strengthResponses},
      assumptions:[
        'Illustrative estimate, not observed child-session duration.',
        'Read-aloud pace: 110–130 words per minute; response time: 3–5 seconds per selection.',
        'Includes each response label once; excludes repeated binary labels already stated in the prompt.',
        'Assumes correct recall answers. Incorrect recall responses replay the outcome story and then repeat the question; there is no bypass.',
        'Does not include correction repeats, breaks, setup, narration-only transition delays, or extra pauses between glowing options. Error retries are not counted.'
      ]
    };
  }

  const careLabels = {hug: 'Comfort (hug)', food: 'Sharing food', help: 'Practical help (heavy box)'};
  // Each half of a six-child block uses one of the six permutations, drawn
  // independently for this pairing set, block number and question order.
  const carePermutations = [
    ['hug', 'food', 'help'], ['hug', 'help', 'food'],
    ['food', 'hug', 'help'], ['food', 'help', 'hug'],
    ['help', 'hug', 'food'], ['help', 'food', 'hug']
  ];
  function assignedCare(setId, number, order) {
    const slot = number - 1;
    const block = Math.floor(slot / 6);
    const key = `care-v1:${setId}:${block}:${order}`;
    // A seeded hash keeps replayed links reproducible across browsers.
    let hash = 2166136261;
    for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    const permutation = ((hash ^ (hash >>> 16)) >>> 0) % carePermutations.length;
    return carePermutations[permutation][Math.floor((slot % 6) / 2)];
  }
  function resolveAssignment(setId, questionOrderId, assignmentNumber = null, care = 'hug') {
    if (assignmentNumber !== null) {
      if (!catalog.roleSets.some(set => set.id === setId)) {
        throw new Error('Choose a single pairing set for a numbered assignment.');
      }
      const number = Number(assignmentNumber);
      if (!/^\d+$/.test(String(assignmentNumber)) || !Number.isSafeInteger(number) || number < 1) {
        throw new Error('Enter a whole assignment number of 1 or higher.');
      }
      const order = number % 2 === 1 ? 'will-first' : 'has-to-first';
      return {assignmentNumber: number, questionOrderId: order, care: assignedCare(setId, number, order)};
    }
    if (!questionOrders.some(order => order.id === questionOrderId)) {
      throw new Error(`Unknown question order: ${questionOrderId}`);
    }
    if (!Object.hasOwn(careLabels, care)) throw new Error(`Unknown care condition: ${care}`);
    return {assignmentNumber: null, questionOrderId, care};
  }

  function parseStorySeed(value) {
    const seed = Number(value);
    if (!/^\d+$/.test(String(value)) || !Number.isInteger(seed) || seed > 0xffffffff) {
      throw new Error('The story seed must be a whole number from 0 to 4294967295.');
    }
    return seed;
  }

  function shuffledPairingIds(ids, seed) {
    const result = [...ids];
    // SplitMix32-style counter with a bijective MurmurHash3 finalizer. Zero is valid.
    let state = seed;
    function nextUint32() {
      state = (state + 0x9e3779b9) >>> 0;
      let word = Math.imul(state ^ (state >>> 16), 0x85ebca6b);
      word = Math.imul(word ^ (word >>> 13), 0xc2b2ae35);
      return (word ^ (word >>> 16)) >>> 0;
    }
    for (let remaining = result.length; remaining > 1; remaining--) {
      const limit = 0x100000000 - (0x100000000 % remaining);
      let draw;
      do { draw = nextUint32(); } while (draw >= limit);
      const other = draw % remaining;
      [result[remaining - 1], result[other]] = [result[other], result[remaining - 1]];
    }
    return result;
  }

  // Offline examples use seed zero. Browser launches always pass a resolved session seed.
  function build(setId = 'woman', questionOrderId = 'will-first', assignmentNumber = null, care = 'hug', seed = 0) {
    // Legacy practice=once/each links use the same practice-free flow.
    const practiceMode = 'none';
    // Older script/timing exporters passed their practice mode here.
    if (['once','each','none'].includes(questionOrderId)) questionOrderId = 'will-first';
    const set = catalog.roleSets.find(s => s.id === setId);
    if (!set && setId !== 'all') throw new Error(`Unknown pairing set: ${setId}`);
    const assignment = resolveAssignment(setId, questionOrderId, assignmentNumber, care);
    const questionOrder = questionOrders.find(order => order.id === assignment.questionOrderId);
    const storySeed = setId === 'all' ? null : parseStorySeed(seed);
    const pairingOrder = setId === 'all'
      ? catalog.pairings.map(pairing => pairing.id)
      : shuffledPairingIds(set.pairingIds, storySeed);
    const pairings = pairingOrder.map(id => catalog.pairings.find(pairing => pairing.id === id));
    // Alternate sides within every six-story session; the seed determines which side starts.
    const firstRatingSide = (storySeed ?? 0) % 2 ? 'right' : 'left';
    const steps = pairings.flatMap((p, index) => {
      const leftFirst = (firstRatingSide === 'left') === (index % 2 === 0);
      return storySteps(p, index, questionOrder, assignment.care, leftFirst ? 'left' : 'right');
    });
    steps.push({...copy(templates.end), id:'session-end', localId:'end', image:null,
      phase:'End of this session', text:'That’s the end of our stories. Thank you!',
      pairing:null, storyIndex:null, adapted:true,
      note:'Draft closing wording. This is the end of the selected preview.'});
    return {
      variant:'forced-choice', setId, setLabel:setId === 'all' ? 'All pairings · researcher review' : set.label,
      storySeed, pairingOrder, storyOrderVersion:storySeed === null ? 'catalog-v1' : 'shuffle-v1',
      firstRatingSide, practiceMode, assignmentNumber:assignment.assignmentNumber, questionOrder:questionOrder.id, questionOrderLabel:questionOrder.label,
      care:assignment.care, careLabel:careLabels[assignment.care],
      firstQuestion:questionOrder.firstQuestion, counterbalanceCell:`${setId}:${assignment.care}:${questionOrder.id}`,
      isAllReview:setId === 'all', pairings:steps.filter(step => step.localId === 'group').map(step => step.pairing), steps, stats:statsFor(steps, pairings.length),
      notes:[
        'The characters, artwork and pairing sets come from Find the Caregiver.',
        `Question order for this session: ${questionOrder.label}. This order is kept across every story. Both orders are available within each role set; alternate the assigned order across participants within each set.`,
        'Children choose between the two helpers for prediction and obligation. Both questions precede the outcome. Helper options are read in scene order, left then right.',
        `All stories in this session concern ${careLabels[assignment.care].toLowerCase()}. Source relationships, character positions, and introduction order are preserved.`,
        'Children hear that neither helper helped. A Yes response on the recall check replays the outcome and repeats the check until the child answers No.',
        `Children then rate both helpers individually. The ${firstRatingSide} helper is rated first in the first story. The starting side alternates across stories.`,
        'For each helper, the child first answers Yes or No about whether that person was mean for not helping. Yes leads immediately to three degrees of mean. No leads immediately to three degrees of not mean. Then the child answers the same questions about the other helper.',
        'Instructional HAVE TO practice is omitted; the two early questions follow the assigned order.',
        setId === 'all' ? 'The 18 stories appear in catalog order for researcher review.' : `The six pairings appear once each in a shuffled order, recorded with story seed ${storySeed}.`
      ],
      nextIndex(index, answers) { return nextIndex(steps, index, answers); },
      retryIndex(index) {
        const target = steps[index]?.replayFrom;
        const found = target ? steps.findIndex(step => step.id === target) : -1;
        return found >= 0 ? found : index;
      }
    };
  }

  function toMarkdown(session) {
    const {stats} = session;
    const lines = [
      '# Forced-choice obligation study draft — full session', '',
      `**${session.setLabel} · ${session.pairings.length} stories**`, '',
      `**Type of care: ${session.careLabel}**`, '',
      `**Question order: ${session.questionOrderLabel}**`, '',
      ...(session.assignmentNumber === null ? [] : [`Assignment ${session.assignmentNumber} within this pairing set.`, '']),
      ...session.notes.map(note => `- ${note}`), '',
      `Expected path range: **${stats.screens.min}–${stats.screens.max} screens**, **${stats.responses.min}–${stats.responses.max} responses**.`, '',
      `${stats.forcedChoiceResponses} forced choices + ${stats.individualEvaluationResponses} individual Yes/No meanness judgments + ${stats.strengthResponses.min}–${stats.strengthResponses.max} three-option ratings + ${stats.checks} recall checks.`, '',
      `Illustrative duration: **${stats.minutes.min}–${stats.minutes.max} minutes**, based on ${stats.words.min}–${stats.words.max} spoken words.`, '',
      ...stats.assumptions.map(note => `- ${note}`), '',
      'The storyboard shows both follow-ups for each helper. During the study, the child sees only the follow-up for the answer they gave.', ''
    ];
    let lastStory = -1;
    for (const [index, step] of session.steps.entries()) {
      if (step.pairing && step.storyIndex !== lastStory) {
        lastStory = step.storyIndex;
        lines.push(`## Story ${lastStory + 1}: ${step.pairing.label}`, '',
          `Left: ${step.pairing.helpers[0].description}. Middle: ${step.pairing.recipient.description}. Right: ${step.pairing.helpers[1].description}.`, '');
      }
      lines.push(`### ${index + 1}. ${step.phase}${step.proposed ? ' — PROPOSED WORDING' : ''}`, '');
      if (step.when) {
        const parent = session.steps.find(s => s.id === step.when[0]);
        lines.push(`*Only after “${step.when[1]}” to ${parent.phase}.*`, '');
      }
      if (step.context) lines.push(`**${step.context}**`, '');
      if (step.preface) lines.push(step.preface, '');
      const scriptText=step.captionEmphasis==='HAVE TO'?step.text.replace(/\bHAVE TO\b/g,'*HAVE TO*'):step.text;
      lines.push(`“${scriptText}”`, '');
      if (step.displayTitle) lines.push(`Display treatment: ${step.displayTitle} / ${step.displaySetup} / ${step.displayQuestion}`, '');
      if (step.displayText) lines.push(`Display wording: “${step.displayText}” ${step.outcomeVisual?'Both no-help badges remain visible beneath the scene showing the recipient’s need. The first outcome screen speaks only the no-one-helped sentence; the next names both helpers and repeats that sentence at the end. Each helper’s outline glows when their role is spoken; the characters and badges stay still.':'The role is included in the question; no separate role label is displayed above it.'}`, '');
      if (step.outcomeCaptions) lines.push(`Captions follow the narration, in order: ${step.outcomeCaptions.map(text=>`“${text}”`).join(' → ')}.`, '');
      if (step.image) lines.push(`[Stimulus source](${step.image}) — original reference image; the preview replaces its caption with the wording above.`, '');
      if (step.choiceQuestion) lines.push(`Read the choices together: “${step.choiceQuestion}”`, '');
      if (step.choices) lines.push(`Choices: ${step.choices.join(' / ')}.`, '');
      if (step.point) lines.push(`Selection check: ${step.point}.`, '');
      if (step.expected) lines.push(`Expected recall answer: ${step.expected}.`, '');
      if (step.replayFrom) lines.push('After Yes, replay the two nonhelping outcome screens with their original narration and role highlights, then ask this question again. Repeat until No.', '');
      if (step.requireCorrect) lines.push('A correct response is required to advance; there is no bypass.', '');
      if (step.correctFeedback) lines.push(`Mandatory correct-answer feedback: “${step.correctFeedback}”`, '');
      if (step.incorrectFeedback) lines.push(`Incorrect-answer correction: “${step.incorrectFeedback}”`, '');
      if (step.choiceConfirmations) for (const [choice, confirmation] of Object.entries(step.choiceConfirmations)) lines.push(`After choosing “${choice}”, confirm: “${confirmation.text}” Choices: ${confirmation.choices.join(' / ')}. No returns to the original choice; Yes accepts it.`, '');
      if (step.reminder) lines.push(`Reminder if needed: “${step.reminder}”`, '');
      if (step.rereadAfterReminder) lines.push('After the reminder, reread the full question and response labels before reopening the choices.', '');
      if (step.note) lines.push(`*${step.note}*`, '');
    }
    return lines.join('\n');
  }
  return {build, parseStorySeed, resolveAssignment, toMarkdown, spokenWords, questionOrders};
});
