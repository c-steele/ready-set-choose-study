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
    const helperTitle = helper => upper(helper.label) + (helpers.filter(h => h.label === helper.label).length > 1 ? ` (${helper.side})` : '');
    function add(localId, templateId, overrides) {
      const step = {...copy(templates[templateId]), image:p.images.need, ...overrides,
        id:prefix(localId), localId, pairing:p, storyIndex, adapted:true};
      if (step.when) step.when = [prefix(step.when[0]), step.when[1]];
      result.push(step);
    }
    add('group', 'group', {image:p.images.group});
    for (const intro of p.intros) {
      const actor = intro.actorId === 'recipient' ? recipient : helpers.find(h => h.id === intro.actorId);
      const sourceText = apostrophes(intro.sourceText);
      add(`intro-${intro.actorId}`, 'kid', {
        phase:`Meet ${intro.description}`, image:intro.image, point:intro.actorId,
        text:`${sourceText} Tap ${intro.description}.`,
        reminder:`${sourceText} This one is ${intro.description}. Tap ${intro.description}.`,
        note:`Relationship introduction and character order from Find the Caregiver. On-screen selection wording is an adaptation. ${actor.isAdult && intro.actorId === 'recipient' ? 'The person who needs help is an adult in this story.' : ''}`.trim()
      });
    }
    add('need', 'need', {phase:`${upper(recipient.description)} needs help`, text:`Now let’s say that one day ${recipient.isAdult ? recipient.description : 'the kid in the middle'} was very sad.`});
    add('witness', 'witness', {text:`${upper(helpers[0].description)} and ${helpers[1].description} both see that ${recipient.description} is sad.`});
    for (const helper of helpers) {
      add(`predict-${helper.id}`, 'predict-mom', {
        phase:`Prediction · ${helperTitle(helper)}`,
        text:`Now, do you think ${helper.description} will help ${recipient.description}?`
      });
      add(`predict-${helper.id}-confidence`, 'predict-mom-confidence', {
        phase:`Prediction confidence · ${helperTitle(helper)}`,
        relatedPrediction:prefix(`predict-${helper.id}`)
      });
    }
    if (includePractice) {
      for (const template of draft.steps.filter(s => s.id.startsWith('practice-'))) {
        add(template.id, template.id, {image:template.image, note:[template.note,
          'Practice is repeated with each story in the main preview, as in the captured Marshall Study 1 sequence. The once-only setting is a proposed adaptation.'
        ].filter(Boolean).join(' ')});
      }
    }
    for (const helper of helpers) {
      add(`obligation-${helper.id}`, 'obligation-mom', {
        phase:`Obligation · ${helperTitle(helper)}`,
        text:`Now, do you think ${helper.description} HAS TO help ${recipient.description}? Yes or No.`
      });
      add(`obligation-${helper.id}-amount`, 'obligation-mom-amount', {
        phase:`Obligation strength · ${helperTitle(helper)}`,
        text:`How much do you think ${helper.pronoun === 'they' ? helper.description : helper.pronoun} HAS TO?`,
        displayText:`How much do you think ${helper.description} HAS TO?`,
        context:upper(helper.description), when:[`obligation-${helper.id}`, 'Yes']
      });
    }
    const explicitOutcome = `No one helped ${recipient.description}. ${upper(helpers[0].description)} did NOT help ${recipient.description}. ${upper(helpers[1].description)} did NOT help ${recipient.description}.`;
    add('outcome', 'outcome', {text:explicitOutcome});
    add('recall-all', 'recall-all', {
      text:`Can you tell me, did either of these people help ${recipient.description}?`,
      reminder:`Actually, remember, no one helped ${recipient.description}. ${upper(helpers[0].description)} did NOT help ${recipient.description}. ${upper(helpers[1].description)} did NOT help ${recipient.description}. Can you tell me, did either of these people help ${recipient.description}?`
    });
    add('overall', 'overall', {preface:`No one helped ${recipient.description}.`});
    add('overall-amount', 'overall-amount');
    for (const helper of helpers) {
      add(`recall-${helper.id}`, 'recall-mom', {
        phase:`Recall · ${helperTitle(helper)}`,
        text:`Do you remember, did ${helper.description} help ${recipient.description}?`,
        reminder:`Remember, ${helper.description} did not help ${recipient.description}. Do you remember, did ${helper.description} help ${recipient.description}?`
      });
      add(`evaluation-${helper.id}`, 'evaluation-mom', {
        phase:`Individual evaluation · ${helperTitle(helper)}`,
        text:`Do you think it was Mean or Not Mean that ${helper.description} did NOT help ${recipient.reference}?`
      });
      add(`evaluation-${helper.id}-amount`, 'evaluation-mom-amount', {
        phase:`Meanness strength · ${helperTitle(helper)}`,
        text:`How mean do you think ${helper.description} was for NOT helping ${recipient.reference}?`,
        displayText:`How mean do you think ${helper.description} was for NOT helping ${recipient.reference}?`,
        when:[`evaluation-${helper.id}`, 'Mean']
      });
    }
    add('compare', 'compare', {
      choices:helpers.map(h => upper(h.description)),
      note:`Exploratory comparison. Buttons follow the scene: ${helpers[0].description} left, ${helpers[1].description} right.`
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
      confidenceResponses:reached.filter(s => s.measure === 'Prediction confidence').length,
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
      substantive:min.substantive, confidenceResponses:min.confidenceResponses, checks:min.checks, practiceResponses:min.practiceResponses,
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
      setId, setLabel:setId === 'all' ? 'All pairings · researcher review' : set.label,
      practiceMode, practiceLabel:practiceMode === 'each' ? 'Practice with every story' : 'Practice once · proposed adaptation',
      isAllReview:setId === 'all', pairings, steps, stats:statsFor(steps, pairings.length),
      notes:[
        'This is a draft adaptation using Find the Caregiver stimuli and the Marshall Study 1 question structure.',
        'Helpers are questioned individually in left-to-right order. All paths lead to neither helper helping.',
        'Prediction confidence is an added adaptation measure, not recovered Marshall wording. Its three response labels remain provisional.',
        'Prediction is Yes/No, as in Marshall Study 1. A new provisional confidence question follows each prediction after either Yes or No. Strength questions follow obligation and meanness judgments conditionally.',
        'The overall-evaluation strength prompt remains proposed wording, not verified verbatim Marshall wording.',
        'White backgrounds and the same sadness context are used throughout. Source relationships, character positions, and intro order are preserved.',
        practiceMode === 'each' ? 'Practice repeats before obligation questions in each story, matching the captured Marshall Study 1 sequence.' : 'Practice once is an explicit proposed change from the repeated practice in the captured Marshall Study 1 sequence.',
        setId === 'all' ? 'The 18-story view is a researcher catalog of all three role sets, not the proposed length of one child’s session.' : 'This preview contains the six pairings from one role set in a fixed review order.'
      ],
      nextIndex(index, answers) { return nextIndex(steps, index, answers); }
    };
  }

  function toMarkdown(session) {
    const {stats} = session;
    const lines = [
      '# Obligation study draft — full session', '',
      `**${session.setLabel} · ${session.pairings.length} stories · ${session.practiceLabel}**`, '',
      ...session.notes.map(note => `- ${note}`), '',
      `Expected path range: **${stats.screens.min}–${stats.screens.max} screens**, **${stats.responses.min}–${stats.responses.max} responses**.`, '',
      `${stats.substantive} main judgments (including ${stats.confidenceResponses} prediction-confidence responses) + ${stats.checks} identity/recall checks + ${stats.practiceResponses} practice responses + ${stats.strengthResponses.min}–${stats.strengthResponses.max} conditional study-strength responses.`, '',
      `Illustrative duration: **${stats.minutes.min}–${stats.minutes.max} minutes**, based on ${stats.words.min}–${stats.words.max} spoken words.`, '',
      ...stats.assumptions.map(note => `- ${note}`), '',
      'The storyboard below includes all possible branches, including a practice branch that is normally skipped after a correct No answer to the lying question.', ''
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
      if (step.relatedPrediction) lines.push(`*Confidence about the immediately preceding prediction, after either Yes or No (${step.relatedPrediction}).*`, '');
      if (step.context) lines.push(`**${step.context}**`, '');
      if (step.preface) lines.push(step.preface, '');
      const scriptText=step.captionEmphasis==='HAVE TO'?step.text.replace(/\bHAVE TO\b/g,'*HAVE TO*'):step.text;
      lines.push(`“${scriptText}”`, '');
      if (step.displayTitle) lines.push(`Display treatment: ${step.displayTitle} / ${step.displaySetup} / ${step.displayQuestion}`, '');
      if (step.displayText) lines.push(`Display wording: “${step.displayText}” The role is included in the question; no separate role label is displayed above it.`, '');
      if (step.image) lines.push(`[Stimulus source](${step.image}) — original reference image; the preview replaces its caption with the wording above.`, '');
      if (step.choices) lines.push(`Choices: ${step.choices.join(' / ')}.`, '');
      if (step.point) lines.push(`Selection check: ${step.point}.`, '');
      if (step.expected) lines.push(`Expected check/practice answer: ${step.expected}.`, '');
      if (step.reminder) lines.push(`Reminder if needed: “${step.reminder}”`, '');
      if (step.rereadAfterReminder) lines.push('After the reminder, reread the full question and response labels before reopening the choices.', '');
      if (step.note) lines.push(`*${step.note}*`, '');
    }
    return lines.join('\n');
  }
  return {build, toMarkdown, spokenWords};
});
