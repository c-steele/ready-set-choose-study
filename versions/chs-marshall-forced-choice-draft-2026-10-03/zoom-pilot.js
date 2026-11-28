/* Live, read-aloud version. Answers stay in this browser tab until the facilitator exports them. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const oldStorageKey = 'who-has-to-help-zoom-v3';
  const requestedNumber = params.get('assignment');
  const isRehearsal = params.get('rehearsal') === '1';
  const storageKey = requestedNumber === null ? oldStorageKey :
    'who-has-to-help-zoom-v5-' + (isRehearsal ? 'rehearsal-' : 'collection-') + requestedNumber;
  const presenter = window.ObligationZoomPresenter;
  const parentSlides = window.ZoomParentSlides;
  const firstSlide = -4;
  const sets = ['woman', 'man', 'family'];
  const careTypes = ['hug', 'food', 'help'];
  const ratingOptions = ['Not mean', 'A teeny bit mean', 'A little bit mean', 'Very mean'];
  let run, session, steps;
  let sharedPreview = null;
  let previewStarted = 0;
  let startedScreen = 0;
  let lastTap = -Infinity;

  function draw() {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  function preselect(id, param, values) {
    if (values.includes(params.get(param))) byId(id).value = params.get(param);
  }
  preselect('set-select', 'set', sets);
  preselect('care-select', 'care', careTypes);

  function savedRun(key = storageKey) {
    try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
  }
  function remember() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(run)); } catch { /* CSV export also works without browser storage. */ }
  }
  function reconstruct() {
    if (run.assignmentNumber) {
      const plan = ZoomAssignment.forNumber(run.assignmentNumber);
      const byPairing = new Map(ObligationPairings.pairings.map(pairing => [pairing.id,pairing]));
      const pairings = plan.stories.map(layout => ZoomSlideVisuals.numberedPairing(byPairing.get(layout.pairingId),layout.trialId));
      const plannedSteps = pairings.flatMap((pairing,index) => ObligationSession.buildZoomStory(pairing,index,plan.care,plan.stories[index]));
      session = {plan, pairings, pairingOrder:plan.pairingOrder, steps:plannedSteps};
    } else {
      session = ObligationSession.build(run.set, 'has-to-first', null, run.care, run.seed);
    }
    steps = session.steps.filter(step =>
      step.pairing && step.storyIndex < run.count &&
      (!step.ratingBranch || (run.version >= 4 && step.ratingBranch === 'mean')) &&
      step.localId !== 'predict-compare' && step.localId !== 'recall-all'
    ).map(step => {
      if (!step.ratedActor) return step;
      const actor = step.pairing.helpers.find(helper => helper.id === step.ratedActor);
      const role = actor.role === step.pairing.recipient.role ? actor.description : 'the ' + actor.label;
      if (step.ratingBranch === 'mean') {
        return {...step, text:`How mean was ${role}?`, choices:ratingOptions.slice(1),
          when:[step.when[0], 'Mean'], ratingScale:'meanness-degree'};
      }
      const recipient = step.pairing.recipient;
      const missedAction = {
        hug: `giving a hug to the sad ${recipient.label} in the middle`,
        food: `giving strawberries to the hungry ${recipient.label} in the middle`,
        help: `helping ${recipient.reference} pick up the heavy box`
      }[step.care];
      if (run.version >= 4) {
        return {...step, text:`Was ${role} mean or not mean for not ${missedAction}?`,
          choices:['Mean', 'Not mean'], ratingScale:'meanness-binary'};
      }
      // Sessions started with the one-step scale retain their original slide indices and scoring.
      const id = 'evaluation-four-' + actor.id;
      return {...step, id:step.pairing.id + ':' + id, localId:id,
        text:`How mean or not mean was ${role} for not ${missedAction}?`, choices:ratingOptions,
        measure:'Individual meanness (four points)', ratingScale:'meanness-four'};
    });
  }
  function view(name) {
    document.body.classList.toggle('child-view',name !== 'setup');
    document.body.classList.toggle('choice-box-preview',name === 'study');
    for (const id of ['setup','study','finish']) byId(id).hidden = id !== name;
  }
  function setup() {
    view('setup');
    const saved = savedRun();
    byId('resume-previous').hidden = !savedRun('who-has-to-help-zoom-v1');
    byId('resume').hidden = !saved;
    byId('resume').textContent = saved?.ended ? 'Reopen completed pilot' : 'Resume pilot';
  }
  function prepareBoardPreview(number) {
    const plan = ZoomAssignment.forNumber(number);
    run = {
      id: Array.from(crypto.getRandomValues(new Uint32Array(2)), n => n.toString(16).padStart(8,'0')).join(''),
      version:5, assignmentNumber:plan.number, rehearsal:isRehearsal,
      set:plan.set, care:plan.care, count:6, index:firstSlide, line:0, trail:[], ended:false
    };
    reconstruct();
    syncPresenter(true);
  }
  function start() {
    history.replaceState({...history.state, zoomPilotId:run.id},'');
    remember();
    render();
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
    return step.text;
  }
  function currentOptions() {
    if (run.ended) return [];
    return parentSlides.getPage(run.index,run.count)?.options || steps[run.index]?.choices || [];
  }
  function render() {
    startedScreen = performance.now();
    if (run.ended) {
      view('finish');
      byId('finish-title').textContent = run.declined ? 'Thank you for meeting with us!' : 'Thank you for helping!';
      byId('finish').querySelector('.lede').textContent = run.declined ? 'We’ll finish here today.' :
        run.count === 1 ? 'That’s the end of our story.' : 'That’s the end of our stories.';
      const hasResponses = run.trail.some(item=>item.record);
      byId('download').hidden = !hasResponses;
      byId('finish-note').hidden = !hasResponses;
      syncPresenter();
      return;
    }
    view('study');
    const stage = byId('stage');
    const page = parentSlides.getPage(run.index,run.count);
    const step = steps[run.index];
    const canBack = Boolean(run.trail.length);
    const canSave = run.trail.some(item=>item.record);
    byId('study').classList.toggle('zoom-parent-step',Boolean(page));
    byId('story-counter').textContent = page ? page.title : step ? 'Story ' + (step.storyIndex+1) + ' of ' + run.count : 'Who Has to Help?';
    byId('partial-download').hidden = !canSave;
    if (page) {
      stage.classList.remove('zoom-welcome');
      parentSlides.render(stage,run.index,()=>advance(),advance,back,canBack,run.count);
    } else {
      stage.classList.remove('zoom-parent-stage');
      ZoomSlideVisuals.render({stage, step:step || null, line:run.line, prompt:step ? displayed(step) : 'Who Has to Help?',
        options:currentOptions(), onAnswer:advance, onNext:()=>advance(), onBack:back, onSave:download, canBack, canSave});
    }
    syncPresenter();
  }
  function makeRecord(step, picked) {
    const helpers = step.pairing.helpers;
    const helper = helpers.find(h => h.id === (step.ratedActor || step.optionActors?.[picked]));
    const layout = session.plan?.stories[step.storyIndex];
    let score = '';
    if (step.ratingScale === 'meanness-four') score = picked;
    if (step.ratingScale === 'meanness-degree') score = picked + 1;
    if (step.ratingScale === 'meanness-binary' && step.choices[picked] === 'Not mean') score = 0;
    return {
      story:step.storyIndex+1, pairing_id:step.pairing.id, recipient:step.pairing.recipient.reference,
      ...(layout && {
        source_trial:layout.trialId, visual_variant:layout.variant, stimulus_color:step.pairing.visualHex,
        first_mentioned_side:layout.firstMentionSide, first_mentioned_helper:helpers.find(h=>h.side===layout.firstMentionSide).description,
        first_rated_side:layout.firstRatingSide, first_rated_helper:helpers.find(h=>h.side===layout.firstRatingSide).description
      }),
      left:step.pairing.helpers[0].description, right:step.pairing.helpers[1].description,
      step_id:step.id, measure:step.measure || step.phase, prompt:displayed(step), options:step.choices.join(' | '),
      answer:step.choices[picked], accepted:true,
      helper_role:helper?.description || '', helper_side:helper?.side || '', rating_position:step.ratingPosition || '',
      rating_scale:step.ratingScale || '', meanness_score:score,
      elapsed_ms:Math.round(performance.now()-startedScreen)
    };
  }
  function advance(picked) {
    if (sharedPreview || byId('study').hidden || performance.now() - lastTap < 180) return;
    const step = steps[run.index];
    const options = currentOptions();
    if (options.length && (!Number.isInteger(picked) || !options[picked])) return;
    lastTap = performance.now();
    const visit = {index:run.index,line:run.line};
    run.trail.push(visit);
    if (run.index < -1) {
      if (options.length && picked === 1) {
        run.declined = true;
        run.ended = true;
      } else {
        if (options.length) visit.confirmedAt = new Date().toISOString();
        run.index++;
      }
    } else if (!step) run.index = 0;
    else if (step.outcomeCaptions && run.line+1 < step.outcomeCaptions.length) run.line++;
    else {
      if (options.length) visit.record = makeRecord(step,picked);
      run.index++;
      const followup = steps[run.index]?.when;
      if (followup && followup[0] === step.id && visit.record?.answer !== followup[1]) run.index++;
      run.line = 0;
      run.ended = run.index >= steps.length;
    }
    remember();
    render();
  }
  function jumpBack(trailIndex) {
    if (sharedPreview || !Number.isInteger(trailIndex) || !run?.trail[trailIndex]) return;
    const previous = run.trail[trailIndex];
    run.trail.length = trailIndex;
    run.index = previous.index;
    run.line = previous.line;
    run.ended = false;
    run.declined = false;
    lastTap = -Infinity;
    remember();
    render();
  }
  function back() { jumpBack(run.trail.length - 1); }

  // Browse or show a slide without moving the live response cursor.
  function showPreview(item) {
    if (run.ended || byId('study').hidden) return;
    if (!sharedPreview) previewStarted = performance.now();
    sharedPreview = item;
    const stage = byId('stage');
    const page = parentSlides.getPage(item.parentIndex);
    const noop = () => {};
    stage.classList.remove('zoom-parent-stage','zoom-welcome');
    byId('study').classList.toggle('zoom-parent-step', Boolean(page));
    byId('story-counter').textContent = item.step ? 'Story ' + (item.step.storyIndex + 1) + ' of ' + run.count : item.label;
    byId('partial-download').hidden = true;
    if (item.finish) {
      const goodbye = byId('finish').querySelector('.message-slide').cloneNode(true);
      goodbye.querySelector('.lede').textContent = 'That’s the end of our stories.';
      goodbye.querySelector('h2').removeAttribute('id');
      stage.replaceChildren(goodbye);
    } else if (page) {
      parentSlides.render(stage,item.parentIndex,noop,noop,noop,false,run.count);
    } else {
      ZoomSlideVisuals.render({stage,step:item.step,line:item.line,prompt:item.label,options:item.options,
        onAnswer:noop,onNext:noop,onBack:noop,onSave:noop});
    }
    stage.inert = true;
    byId('return-live').hidden = false;
    syncPresenter();
  }
  function returnToLive() {
    if (!sharedPreview) return;
    const adjustedStart = startedScreen + performance.now() - previewStarted;
    sharedPreview = null;
    byId('return-live').hidden = true;
    byId('stage').inert = false;
    render();
    startedScreen = adjustedStart;
  }
  function syncPresenter(beforeStart = false) {
    if (!presenter) return;
    const visited = new Map();
    run.trail.forEach(({index,line}, n) => visited.set(index + ':' + line, n));
    const stories = session.pairings.slice(0,run.count).map((p,i) => ({title:'Story ' + (i+1) + ' · ' + p.label, slides:[]}));
    steps.forEach((step,index) => {
      const lines = step.outcomeCaptions || [displayed(step,0)];
      lines.forEach((label,line) => {
        stories[step.storyIndex].slides.push({label, conditional:step.when?.[1], step, line, options:step.choices || [], body:step.choiceQuestion || '', image:step.image, current:!run.ended && index===run.index && line===run.line,
          visitedIndex:visited.get(index + ':' + line) ?? null});
      });
    });
    const intro = Object.keys(parentSlides.pages).map(Number).sort((a,b)=>a-b).concat(-1);
    stories.unshift({title:'Welcome and instructions',slides:intro.map(index=>{
      const page = parentSlides.getPage(index,run.count);
      return {parentIndex:index, label:page?.title || 'Child’s turn', body:page?.text || '', fullSlideImage:page?.image,
        current:!run.ended && run.index===index, visitedIndex:visited.get(index + ':0') ?? null};
    })});
    stories.push({title:'Closing',slides:[{finish:true,label:'Thank you for helping!',current:run.ended && !run.declined}]});
    const step = run.ended ? null : steps[run.index];
    const page = parentSlides.getPage(run.index,run.count);
    const options = currentOptions();
    const counter = beforeStart ? 'Six-story pilot' : run.ended ? 'Pilot complete' :
      step ? 'Story ' + (step.storyIndex+1) + ' of ' + run.count : page?.title || 'Child’s turn';
    const prompt = run.ended ? byId('finish-title').textContent : page?.title || (step ? displayed(step) : 'Who Has to Help?');
    const cue = run.ended ? '' : page ? [page.text,page.cue].filter(Boolean).join(' ') :
      step?.ratingScale === 'meanness-degree' ? 'Read all three choices aloud.' :
      step?.optionActors && session.plan ? step.choiceQuestion + '  Record the choice: 1 = left, 2 = right.' :
      step?.choiceQuestion || (!step ? 'Listen to the story, then answer the questions.' : '');
    presenter.update({active:!beforeStart && !run.ended, ended:run.ended, previewing:Boolean(sharedPreview),
      counter:session.plan ? (beforeStart || run.rehearsal ? 'Rehearsal' : 'Participant') + ' ' + run.assignmentNumber + ' · ' + counter : counter,
      image:step?.image, title:'Who Has to Help?', prompt, cue, options, stories, count:run.count,
      canNext:!beforeStart && !run.ended && !options.length, canBack:Boolean(run.trail.length),
      canSave:run.trail.some(item => item.record)});
  }

  function download() {
    const base = {
      pilot_version:'who-has-to-help-zoom-' + (run.version || 3), pilot_id:run.id, completed:run.ended,
      assigned_stories:run.count, set:run.set, care:run.care, question_type:'has-to-only',
      verbal_permission_confirmed_at:run.trail.find(v=>v.index===-2)?.confirmedAt || '',
      ...(session.plan && {
        session_type:run.rehearsal ? 'rehearsal' : 'participant',
        assignment_number:session.plan.number, assignment_schedule:session.plan.version,
        cell_visit:session.plan.cellVisit, visual_plan:session.plan.visualPlan, story_order_row:session.plan.orderRow
      }),
      story_seed:run.seed ?? '', pairing_order:session.pairingOrder.slice(0,run.count).join(' | ')
    };
    const rows = run.trail.filter(item=>item.record).map(({record},i)=>({...base,response_number:i+1,...record}));
    if (!rows.length) return;
    const quote = value => '"' + String(value ?? '').replace(/"/g,'""') + '"';
    const csv = [Object.keys(rows[0]), ...rows.map(row=>Object.values(row))].map(row=>row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF',csv], {type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    const assignmentLabel = run.assignmentNumber ? (run.rehearsal ? 'rehearsal-' : 'participant-') + run.assignmentNumber + '-' : '';
    a.download = 'who-has-to-help-zoom-' + assignmentLabel + run.id + (run.ended ? '' : '-partial') + '.csv';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const returnButton = document.createElement('button');
  returnButton.type = 'button';
  returnButton.id = 'return-live';
  returnButton.textContent = 'Return to live slide';
  returnButton.hidden = true;
  byId('study-navigator').after(returnButton);
  returnButton.addEventListener('click',returnToLive);
  presenter?.register({next:()=>advance(), back, choose:i=>advance(i), download, jumpBack, showPreview, returnToLive});
  function openPresenter() {
    if (!presenter?.openNavigator()) window.alert('Allow pop-ups for this study to open the private presenter. You can also control the pilot from the study window.');
  }
  byId('open-presenter').addEventListener('click',openPresenter);
  byId('study-navigator').addEventListener('click',openPresenter);
  window.addEventListener('zoom-rehearsal-selected',event=>{
    if (byId('setup').hidden) return;
    try { prepareBoardPreview(event.detail.number); }
    catch(error) { byId('setup-error').textContent = error.message; }
  });
  document.addEventListener('keydown', event => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        event.target.closest?.('input,select,textarea,[contenteditable="true"]')) return;
    const active = !byId('study').hidden;
    if (event.key.toLowerCase() === 'p') { event.preventDefault(); openPresenter(); return; }
    if (!active) return;
    if (event.key === 'Escape' && sharedPreview) { event.preventDefault(); returnToLive(); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); advance(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); back(); }
    else if (/^[1-4]$/.test(event.key) && currentOptions().length) {
      event.preventDefault(); advance(Number(event.key)-1);
    }
  });
  byId('resume').addEventListener('click',resume);
  byId('download').addEventListener('click',download);
  byId('again').addEventListener('click',()=>{
    location.assign(location.pathname);
  });
  setup();
  if (params.get('launch') === '1') {
    try {
      const saved = savedRun();
      if (saved && history.state?.zoomPilotId === saved.id) resume();
      else if (requestedNumber !== null) {
        prepareBoardPreview(requestedNumber);
        start();
      } else {
        // Bookmarked role/care previews remain rehearsals. A participant launch always has a number.
        const pick = values => values[draw() % values.length];
        const set = sets.includes(params.get('set')) ? params.get('set') : pick(sets);
        const care = careTypes.includes(params.get('care')) ? params.get('care') : pick(careTypes);
        const url = new URL(location.href);
        url.searchParams.set('assignment',ZoomAssignment.forCell(set,care,1).number);
        url.searchParams.set('rehearsal','1');
        location.replace(url);
      }
    } catch(error) { byId('setup-error').textContent = error.message; }
  }
})();
