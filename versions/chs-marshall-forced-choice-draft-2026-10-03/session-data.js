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

  function nextIndex(steps, index, answers) {
    let next = index + 1;
    while (next < steps.length && steps[next].when && answers[steps[next].when[0]] !== steps[next].when[1]) next++;
    return next;
  }

  function storySteps(pairing, storyIndex, includePractice) {
    const result = [], p = pairing, recipient = p.recipient, helpers = p.helpers;
    const prefix = localId => `${p.id}:${localId}`;
    function add(localId, templateId, overrides) {
      const step = {...copy(templates[templateId]), image:p.images.need, ...overrides,
        id:prefix(localId), localId, pairing:p, storyIndex, adapted:true};
      if (step.when) step.when = [prefix(step.when[0]), step.when[1]];
      result.push(step);
    }
    const helperChoices = helpers.map(h => upper(h.description));
    const pairOptions = {choices:helperChoices, optionActors:helpers.map(h => h.id)};
    add('group', 'group', {image:p.images.group});
    for (const intro of p.intros) {
      const actor = intro.actorId === 'recipient' ? recipient : helpers.find(h => h.id === intro.actorId);
      const sourceText = apostrophes(intro.sourceText);
      add(`intro-${intro.actorId}`, 'kid', {
        phase:`Meet ${intro.description}`, image:intro.image, point:intro.actorId,
        text:`${sourceText} Tap ${intro.description}.`,
        reminder:`${sourceText} This one is ${intro.description}. Tap ${intro.description}.`,
        note:`Relationship introduction and character order from Find the Caregiver. On-screen tap wording is an adaptation. ${actor.isAdult && intro.actorId === 'recipient' ? 'The person who needs help is an adult in this story.' : ''}`.trim()
      });
    }
    add('need', 'need', {phase:`${upper(recipient.description)} needs help`, text:`Now let’s say that one day ${recipient.isAdult ? recipient.description : 'the kid in the middle'} was very sad.`});
    add('witness', 'witness', {text:`${upper(helpers[0].description)} and ${helpers[1].description} both see that ${recipient.description} is sad.`});
    add('predict-compare', 'predict-compare', {
      ...pairOptions,
      text:`Who do you think will help ${recipient.reference}?`
    });
    if (includePractice) {
      for (const template of draft.steps.filter(s => s.id.startsWith('practice-'))) {
        add(template.id, template.id, {image:template.image, note:[template.note,
          'Brief HAVE TO comprehension practice; no strength scale is used in this forced-choice variant.'
        ].filter(Boolean).join(' ')});
      }
    }
    add('obligation-compare', 'obligation-compare', {
      ...pairOptions,
      text:`Who do you think HAS TO help ${recipient.reference}?`
    });
    const explicitOutcome = `No one helped ${recipient.description}. ${upper(helpers[0].description)} did NOT help ${recipient.description}. ${upper(helpers[1].description)} did NOT help ${recipient.description}.`;
    add('outcome', 'outcome', {text:explicitOutcome});
    add('recall-all', 'recall-all', {
      text:`Can you tell me, did either of these people help ${recipient.description}?`,
      reminder:`Actually, remember, no one helped ${recipient.description}. ${upper(helpers[0].description)} did NOT help ${recipient.description}. ${upper(helpers[1].description)} did NOT help ${recipient.description}. Can you tell me, did either of these people help ${recipient.description}?`
    });
    add('compare', 'compare', {
      ...pairOptions,
      text:`Who was meaner for NOT helping ${recipient.reference}?`,
      note:`Two-helper comparison adapted from Marshall. Buttons follow the scene: ${helpers[0].description} left, ${helpers[1].description} right.`
    });
    return result;
  }

  function spokenWords(step) {
    // Count the full read-aloud script, context and preface. Count each displayed
    // response option once, omitting binary labels already spoken in the prompt.
    const text = [step.context, step.preface, step.text].filter(Boolean).join(' ');
    const labelsInPrompt = /Yes or No\.?$/i.test(step.text || '') || /Mean or Not Mean/i.test(step.text || '');
    const choices = labelsInPrompt ? [] : step.choices || [];
    return wordCount(text) + wordCount(choices.join(' '));
  }

  function pathStats(steps, maximize) {
    const answers = {}, reached = [];
    for (let index = 0; index < steps.length;) {
      const step = steps[index]; reached.push(step);
      let answer = step.expected || step.point;
      if (!answer && step.choices) {
        const child = steps.find(s => s.when && s.when[0] === step.id);
        answer = child ? (maximize ? child.when[1] : step.choices.find(c => c !== child.when[1])) : step.choices[0];
      }
      answers[step.id] = answer || 'Continue';
      index = nextIndex(steps, index, answers);
    }
    return {
      screens:reached.length,
      responses:reached.filter(s => s.choices || s.point).length,
      words:reached.reduce((sum, step) => sum + spokenWords(step), 0),
      substantive:reached.filter(s => s.measure && !s.when).length,
      checks:reached.filter(s => s.point || s.expected && !s.localId.startsWith('practice-')).length,
      practiceResponses:reached.filter(s => s.localId.startsWith('practice-') && s.choices).length,
      strengthResponses:reached.filter(s => s.when && !s.localId.startsWith('practice-')).length
    };
  }

  function statsFor(steps, storyCount) {
    const min = pathStats(steps, false), max = pathStats(steps, true);
    return {
      storyCount, possibleScreens:steps.length,
      screens:{min:min.screens, max:max.screens}, responses:{min:min.responses, max:max.responses},
      words:{min:min.words, max:max.words},
      minutes:{min:Math.round((min.words / 130 + min.responses * 3 / 60) * 10) / 10,
        max:Math.round((max.words / 110 + max.responses * 5 / 60) * 10) / 10},
      substantive:min.substantive, checks:min.checks, practiceResponses:min.practiceResponses,
      strengthResponses:{min:min.strengthResponses, max:max.strengthResponses},
      assumptions:[
        'Illustrative estimate, not observed child-session duration.',
        'Read-aloud pace: 110–130 words per minute; response time: 3–5 seconds per selection.',
        'Includes each response label once; excludes repeated binary labels already stated in the prompt.',
        'Assumes correct identity, recall, and practice answers, including Yes to stopping being mean and No to lying.',
        'Does not include correction repeats, breaks, setup, narration-only transition delays, or extra pauses between glowing options.'
      ]
    };
  }

  function build(setId = 'woman', practiceMode = 'each') {
    if (!['each', 'once'].includes(practiceMode)) throw new Error(`Unknown practice mode: ${practiceMode}`);
    const set = catalog.roleSets.find(s => s.id === setId);
    if (!set && setId !== 'all') throw new Error(`Unknown pairing set: ${setId}`);
    const pairings = setId === 'all' ? catalog.pairings.slice() : set.pairingIds.map(id => catalog.pairings.find(p => p.id === id));
    const steps = pairings.flatMap((p, index) => storySteps(p, index, practiceMode === 'each' || index === 0));
    steps.push({...copy(templates.end), id:'session-end', localId:'end', image:null,
      phase:'End of this session', text:'That’s the end of our stories. Thank you!',
      pairing:null, storyIndex:pairings.length, adapted:true,
      note:'Draft closing wording. This is the end of the selected preview.'});
    return {
      variant:'forced-choice', setId, setLabel:setId === 'all' ? 'All pairings · researcher review' : set.label,
      practiceMode, practiceLabel:practiceMode === 'each' ? 'Practice with every story' : 'Practice once · proposed adaptation',
      isAllReview:setId === 'all', pairings, steps, stats:statsFor(steps, pairings.length),
      notes:[
        'This separate forced-choice draft uses the same Find the Caregiver stimuli and pairing catalog as the individual-rating draft.',
        'Each story asks three main questions: who will help, who HAS TO help, and who was meaner for NOT helping.',
        'Each main question requires a choice between the two helpers. Choices appear in scene order: left helper, then right helper. There is no both, neither, or equal option.',
        'Forced-choice prediction and obligation are adaptations of the Marshall paradigm, not the original Study 1 individual Yes/No measures. The meaner comparison is adapted to these two-helper stories.',
        'White backgrounds and the same sadness context are used throughout. Source relationships, character positions, and intro order are preserved.',
        'All paths have the same explicit outcome: no one helped, followed by each named helper did NOT help. A single Yes/No recall check precedes the meaner comparison.',
        'Individual ratings, overall Mean/Nice evaluation, individual recall questions, and all how-much scales are omitted in this compact variant.',
        practiceMode === 'each' ? 'Brief HAVE TO comprehension practice repeats before the obligation comparison in each story.' : 'Brief HAVE TO comprehension practice occurs before the first obligation comparison only.',
        setId === 'all' ? 'The 18-story view is a researcher catalog of all three role sets, not the proposed length of one child’s session.' : 'This preview contains the six pairings from one role set in a fixed review order.'
      ],
      nextIndex(index, answers) { return nextIndex(steps, index, answers); }
    };
  }

  function toMarkdown(session) {
    const {stats} = session;
    const lines = [
      '# Forced-choice obligation study draft — full session', '',
      `**${session.setLabel} · ${session.pairings.length} stories · ${session.practiceLabel}**`, '',
      ...session.notes.map(note => `- ${note}`), '',
      `Expected path range: **${stats.screens.min}–${stats.screens.max} screens**, **${stats.responses.min}–${stats.responses.max} responses**.`, '',
      `${stats.substantive} forced-choice main judgments + ${stats.checks} identity/recall checks + ${stats.practiceResponses} brief practice responses. No strength scales.`, '',
      `Illustrative duration: **${stats.minutes.min}–${stats.minutes.max} minutes**, based on ${stats.words.min}–${stats.words.max} spoken words.`, '',
      ...stats.assumptions.map(note => `- ${note}`), '',
      'All main questions are two-helper choices. There are no conditional strength branches in this version. Correction reminders appear only when needed.', ''
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
      lines.push(`“${step.text}”`, '');
      if (step.displayTitle) lines.push(`Display treatment: ${step.displayTitle} / ${step.displaySetup} / ${step.displayQuestion}`, '');
      if (step.displayText) lines.push(`Display wording: “${step.displayText}” The role is included in the question; no separate role label is displayed above it.`, '');
      if (step.image) lines.push(`[Stimulus source](${step.image}) — original reference image; the preview replaces its caption with the wording above.`, '');
      if (step.choices) lines.push(`Choices: ${step.choices.join(' / ')}.`, '');
      if (step.point) lines.push(`Selection check: ${step.point}.`, '');
      if (step.expected) lines.push(`Expected check/practice answer: ${step.expected}.`, '');
      if (step.reminder) lines.push(`Reminder if needed: “${step.reminder}”`, '');
      if (step.note) lines.push(`*${step.note}*`, '');
    }
    return lines.join('\n');
  }
  return {build, toMarkdown, spokenWords};
});
