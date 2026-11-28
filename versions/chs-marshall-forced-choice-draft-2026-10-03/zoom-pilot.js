/* Live, read-aloud version. Answers stay in this browser tab until the facilitator exports them. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const storageKey = 'who-has-to-help-zoom-v1';
  const presenter = window.ObligationZoomPresenter;
  const sets = ['woman', 'man', 'family'];
  const careTypes = ['hug', 'food', 'help'];
  const orders = ['will-first', 'has-to-first'];
  let run, session, steps;
  let startedScreen = 0;
  let lastTap = -Infinity;

  function draw() {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  function condition(id, values) {
    const selected = byId(id).value;
    if (values.includes(selected)) return selected;
    const limit = 2 ** 32 - (2 ** 32 % values.length);
    let n;
    do { n = draw(); } while (n >= limit);
    return values[n % values.length];
  }
  function preselect(id, param, values) {
    if (values.includes(params.get(param))) byId(id).value = params.get(param);
  }
  preselect('set-select', 'set', sets);
  preselect('care-select', 'care', careTypes);
  preselect('order-select', 'questionOrder', orders);
  preselect('length-select', 'stories', ['1','6']);

  function savedRun() {
    try { return JSON.parse(sessionStorage.getItem(storageKey)); } catch { return null; }
  }
  function remember() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(run)); } catch { /* CSV export also works without browser storage. */ }
  }
  function reconstruct() {
    session = ObligationSession.build(run.set, run.order, null, run.care, run.seed);
    steps = session.steps.filter(s => s.pairing && s.storyIndex < run.count);
  }
  function view(name) {
    for (const id of ['setup','study','finish']) byId(id).hidden = id !== name;
  }
  function setup() {
    view('setup');
    presenter?.update({active:false, ended:false, stories:[], options:[]});
    const saved = savedRun();
    byId('resume').hidden = !saved;
    byId('resume').textContent = saved?.ended ? 'Reopen completed pilot' : 'Resume pilot';
  }
  function start(event) {
    event.preventDefault();
    try {
      const seed = params.has('storySeed') ? ObligationSession.parseStorySeed(params.get('storySeed')) : draw();
      run = {
        id: Array.from(crypto.getRandomValues(new Uint32Array(2)), n => n.toString(16).padStart(8,'0')).join(''),
        set: condition('set-select',sets), order: condition('order-select',orders), care: condition('care-select',careTypes),
        seed, count:Number(byId('length-select').value), index:-1, line:0, trail:[], ended:false
      };
      reconstruct();
      remember();
      render();
    } catch (error) { byId('setup-error').textContent = error.message; }
  }
  function resume() {
    const saved = savedRun();
    if (!saved) return setup();
    run = saved;
    reconstruct();
    render();
  }

  function displayed(step, line = run.line) {
    if (step.outcomeCaptions) return step.outcomeCaptions[line];
    if (!step.ratedActor) return step.text;
    const actor = step.pairing.helpers.find(h => h.id === step.ratedActor).description;
    if (!step.ratingBranch) return 'Do you think ' + actor + ' was mean or not mean?';
    const recipient = step.pairing.recipient.reference;
    const action = {
      hug: 'giving ' + recipient.replace(/^the /,'the sad ') + ' a hug',
      food: 'giving ' + recipient.replace(/^the /,'the hungry ') + ' strawberries',
      help: 'helping ' + recipient + ' pick up the heavy box'
    }[step.care];
    return 'How mean or not mean was ' + actor + ' for not ' + action + '?';
  }
  function choices(step) {
    return step.ratedActor && !step.ratingBranch ? ['Mean','Not mean'] : step.choices || [];
  }
  function button(label, action, className) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    if (className) element.className = className;
    element.addEventListener('click', action);
    return element;
  }
  function degreeFace(branch, index) {
    const brows = branch === 'not-mean' ? 'M26 30 L38 30 M58 30 L70 30' :
      ['M26 30 L38 32 M58 32 L70 30','M25 27 L39 33 M57 33 L71 27','M24 25 L40 35 M56 35 L72 25'][index];
    const mouth = branch === 'not-mean' ? 'M34 63 L62 63' :
      ['M33 65 Q48 59 63 65','M31 68 Q48 50 65 68','M29 71 Q48 43 67 71'][index];
    return `<svg class="zoom-degree-face" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="43" fill="#ffd35c" stroke="#e6b648" stroke-width="2.5"/><g fill="#29333d"><circle cx="33" cy="43" r="4.5"/><circle cx="63" cy="43" r="4.5"/></g><path d="${brows} ${mouth}" fill="none" stroke="#29333d" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function showScene(step) {
    const targets = byId('targets');
    targets.replaceChildren();
    byId('picture').hidden = !step.image;
    if (!step.image) return;
    byId('scene').src = step.image;
    byId('scene').alt = [step.pairing.helpers[0],step.pairing.recipient,step.pairing.helpers[1]]
      .map(actor => actor.side + ': ' + actor.description).join('. ');
    targets.insertAdjacentHTML('afterbegin', ObligationStudyVisuals.nonhelpingEyeOverlay(step));
    const paired = Boolean(step.optionActors);
    let highlighted = [];
    if (step.outcomeVisual) {
      const helper = step.outcomeCaptions && step.pairing.helpers[run.line];
      highlighted = helper ? [helper.id] : step.pairing.helpers.map(h => h.id);
    }
    for (const [i, actor] of step.pairing.helpers.entries()) {
      if (!paired && actor.id !== step.ratedActor && !highlighted.includes(actor.id)) continue;
      const target = paired ? button('', () => advance(i), 'helper-target') : document.createElement('span');
      if (paired) target.setAttribute('aria-label',step.choices[i]);
      else { target.className = 'helper-outline'; target.setAttribute('aria-hidden','true'); }
      target.dataset.side = actor.side;
      targets.appendChild(target);
    }
  }

  function render() {
    startedScreen = performance.now();
    if (run.ended) {
      view('finish');
      byId('finish').querySelector('.lede').textContent = run.count === 1 ? 'That’s the end of our story.' : 'That’s the end of our stories.';
      syncPresenter();
      return;
    }
    view('study');
    const step = steps[run.index];
    const welcome = run.index === -1;
    byId('study').style.setProperty('--story-accent',step?.pairing.visualHex || '#2d769b');
    byId('story-counter').textContent = welcome ? 'Who Has to Help?' : 'Story ' + (step.storyIndex + 1) + ' of ' + run.count;
    byId('prompt').textContent = welcome ? 'Let’s look at some stories together!' : displayed(step);
    byId('choice-prompt').textContent = welcome ? 'I’ll read each story out loud. You can tell me your answer or point to your choice.' : step.choiceQuestion || '';
    const options = welcome ? [] : choices(step);
    byId('answers').replaceChildren();
    if (welcome) byId('picture').hidden = true;
    else showScene(step);
    options.forEach((label, i) => {
      const option = button(label, () => advance(i));
      if (step.ratingBranch) {
        option.dataset.degree = i + 1;
        option.insertAdjacentHTML('afterbegin',degreeFace(step.ratingBranch,i));
      }
      byId('answers').appendChild(option);
    });
    byId('next').hidden = options.length > 0;
    byId('next').textContent = welcome ? 'Start story →' : 'Next →';
    byId('back').disabled = !run.trail.length;
    byId('partial-download').hidden = !run.trail.some(item => item.record);
    syncPresenter();
  }
  function valuesSoFar() {
    const values = {};
    for (const {record} of run.trail) if (record?.accepted) values[record.step_id] = record.branch_value;
    return values;
  }
  function makeRecord(step, picked, branchValue, accepted) {
    const helper = step.pairing.helpers.find(h => h.id === (step.ratedActor || step.optionActors?.[picked]));
    return {
      story:step.storyIndex+1, pairing_id:step.pairing.id, recipient:step.pairing.recipient.reference,
      left:step.pairing.helpers[0].description, right:step.pairing.helpers[1].description,
      step_id:step.id, measure:step.measure || step.phase, prompt:displayed(step), options:choices(step).join(' | '),
      answer:choices(step)[picked], branch_value:branchValue, accepted,
      helper_role:helper?.description || '', helper_side:helper?.side || '', rating_position:step.ratingPosition || '',
      rating_branch:step.ratingBranch || '', meanness_score:step.ratingBranch ? (step.ratingBranch==='mean' ? 4+picked : 3-picked) : '',
      elapsed_ms:Math.round(performance.now()-startedScreen)
    };
  }
  function advance(picked) {
    if (byId('study').hidden || performance.now() - lastTap < 180) return;
    const step = steps[run.index];
    const options = step ? choices(step) : [];
    if (options.length && (!Number.isInteger(picked) || !options[picked])) return;
    lastTap = performance.now();
    const visit = {index:run.index,line:run.line};
    run.trail.push(visit);
    if (!step) run.index = 0;
    else if (step.outcomeCaptions && run.line+1 < step.outcomeCaptions.length) run.line++;
    else {
      let accepted = true;
      if (options.length) {
        const branchValue = step.choices[picked];
        accepted = !step.expected || branchValue === step.expected;
        visit.record = makeRecord(step,picked,branchValue,accepted);
      }
      run.index = accepted ? session.nextIndex(run.index,valuesSoFar()) : session.retryIndex(run.index);
      run.line = 0;
      run.ended = run.index >= steps.length;
    }
    remember();
    render();
  }
  function jumpBack(trailIndex) {
    if (!Number.isInteger(trailIndex) || !run?.trail[trailIndex]) return;
    const previous = run.trail[trailIndex];
    run.trail.length = trailIndex;
    run.index = previous.index;
    run.line = previous.line;
    run.ended = false;
    lastTap = -Infinity;
    remember();
    render();
  }
  function back() { jumpBack(run.trail.length - 1); }

  function syncPresenter() {
    if (!presenter) return;
    const visited = new Map();
    run.trail.forEach(({index,line}, n) => visited.set(index + ':' + line, n));
    const stories = session.pairings.slice(0,run.count).map((p,i) => ({title:'Story ' + (i+1) + ' · ' + p.label, slides:[]}));
    const answers = valuesSoFar();
    steps.forEach((step,index) => {
      // Only the applicable follow-up appears after a helper has been rated.
      if (step.when && answers[step.when[0]] && answers[step.when[0]] !== step.when[1]) return;
      const lines = step.outcomeCaptions || [displayed(step,0)];
      lines.forEach((label,line) => {
        stories[step.storyIndex].slides.push({label, image:step.image, current:!run.ended && index===run.index && line===run.line,
          visitedIndex:visited.get(index + ':' + line) ?? null});
      });
    });
    const step = run.ended ? null : steps[run.index];
    const options = step ? choices(step) : [];
    presenter?.update({active:!run.ended, ended:run.ended, counter:run.ended ? 'Pilot complete' : byId('story-counter').textContent, image:step?.image,
      title:'Who Has to Help?', prompt:run.ended ? byId('finish-title').textContent : byId('prompt').textContent,
      cue:run.ended ? '' : byId('choice-prompt').textContent,
      options, stories, canNext:!run.ended && !options.length, canBack:Boolean(run.trail.length),
      canSave:run.trail.some(item => item.record)});
  }

  function download() {
    const base = {
      pilot_version:'who-has-to-help-zoom-1', pilot_id:run.id, completed:run.ended,
      assigned_stories:run.count, set:run.set, care:run.care, question_order:run.order,
      story_seed:run.seed, pairing_order:session.pairingOrder.slice(0,run.count).join(' | ')
    };
    const rows = run.trail.filter(item=>item.record).map(({record},i)=>({...base,response_number:i+1,...record}));
    if (!rows.length) return;
    const quote = value => '"' + String(value ?? '').replace(/"/g,'""') + '"';
    const csv = [Object.keys(rows[0]), ...rows.map(row=>Object.values(row))].map(row=>row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF',csv], {type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'who-has-to-help-zoom-' + run.id + (run.ended ? '' : '-partial') + '.csv';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  presenter?.register({next:()=>advance(), back, choose:i=>advance(i), download, jumpBack});
  function openPresenter() {
    if (!presenter?.open()) window.alert('Allow pop-ups for this study to open the private presenter. You can also control the pilot from the study window.');
  }
  byId('open-presenter').addEventListener('click',openPresenter);
  document.addEventListener('keydown', event => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        event.target.closest?.('input,select,textarea,[contenteditable="true"]')) return;
    const active = !byId('study').hidden;
    if (event.key.toLowerCase() === 'p') { event.preventDefault(); openPresenter(); return; }
    if (!active) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); advance(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); back(); }
    else if (/^[1-3]$/.test(event.key) && steps[run.index] && choices(steps[run.index]).length) {
      event.preventDefault(); advance(Number(event.key)-1);
    }
  });
  byId('pilot-form').addEventListener('submit',start);
  byId('resume').addEventListener('click',resume);
  byId('next').addEventListener('click',()=>advance());
  byId('back').addEventListener('click',back);
  byId('partial-download').addEventListener('click',download);
  byId('download').addEventListener('click',download);
  byId('again').addEventListener('click',setup);
  setup();
})();
