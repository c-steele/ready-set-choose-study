/* The same child-facing component classes and stimulus crop as index.html.
   Only the facilitator advances the Zoom rendition and records responses. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function helperFace(level) {
    const brows = ['M26 30 L38 32 M58 32 L70 30','M25 27 L39 33 M57 33 L71 27','M24 25 L40 35 M56 35 L72 25'];
    const mouth = ['M33 65 Q48 59 63 65','M31 68 Q48 50 65 68','M29 71 Q48 43 67 71'];
    const expression = level === 'neutral' ? 'M26 30 L38 30 M58 30 L70 30 M34 63 L62 63' : brows[level]+' '+mouth[level];
    return '<svg class="meanness-face" viewBox="0 0 96 96" aria-hidden="true" focusable="false"><circle cx="48" cy="48" r="43" fill="#FFD35C" stroke="#E6B648" stroke-width="2.5"/><g fill="#29333D"><circle cx="33" cy="43" r="4.5"/><circle cx="63" cy="43" r="4.5"/></g><path d="'+expression+'" fill="none" stroke="#29333D" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function yesNo(label) {
    const stroke = label === 'Yes' ? 'M13 34 L27 48 L53 17' : 'M17 17 L47 47 M47 17 L17 47';
    return '<svg class="yes-no-symbol" viewBox="0 0 64 64" aria-hidden="true"><path d="'+stroke+'" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="yes-no-label">'+esc(label)+'</span>';
  }
  function welcome(canBack) {
    const shapes = ['star','circle','diamond','star','star','triangle','circle','diamond','star','diamond'];
    const sky = shapes.map((shape,i)=>'<span class="ksize-welcome-floater ksize-welcome-'+shape+' ksize-welcome-floater-'+(i+1)+'">'+(shape==='star'?(i===3||i===4?'✦':'★'):'')+'</span>').join('');
    return '<section class="ksize-screen ksize-start-screen ksize-welcome-screen ksize-who-helps-where-welcome">'+
      '<div class="ksize-welcome-sky" aria-hidden="true">'+sky+'</div><div class="ksize-child-turn-badge">Child’s turn</div>'+
      '<div class="ksize-helper ksize-helper-start" aria-hidden="true"><div class="ksize-helper-face"><span class="ksize-eye ksize-eye-left"></span><span class="ksize-eye ksize-eye-right"></span><span class="ksize-mouth"></span></div><div class="ksize-helper-bubble">Ready?</div></div>'+
      '<h1 id="prompt" class="ksize-title">Who Has to Help?</h1><p id="choice-prompt" class="ksize-text">Listen to the story, then answer the questions.</p><p class="ksize-start-cue">Tell me when you’re ready to start.</p>'+
      '<div class="ksize-controls">'+(canBack?'<button id="back" type="button" class="zoom-welcome-back" aria-label="Back">← Back</button>':'')+'<button id="next" class="ksize-next-btn ksize-icon-btn" type="button" aria-label="Start"><span class="ksize-icon-symbol" aria-hidden="true">➜</span><span class="ksize-icon-label">Start</span></button></div></section>';
  }
  function sideStyle(actor) { return 'left:'+(actor.side==='left' ? 4 : 66)+'%'; }

  function artwork(step,line) {
    const helpers = step.pairing.helpers;
    const alt = [helpers[0].description,step.pairing.recipient.reference,helpers[1].description].join(', ');
    const selection = (step.optionActors||[]).map((id,i)=>{
      const actor=helpers.find(h=>h.id===id);
      return '<button type="button" class="character-choice-target option-visible" style="'+sideStyle(actor)+'" data-answer="'+i+'" aria-label="'+esc(step.choices[i])+'"></button>';
    }).join('');
    const rated=helpers.find(h=>h.id===step.ratedActor);
    const highlight=rated?'<span class="rated-helper-cue" style="'+sideStyle(rated)+'" aria-hidden="true"></span>':'';
    const spokenId=step.outcomeCaptions?.[line] && helpers[line]?.id;
    const cues=step.outcomeVisual?helpers.map(h=>'<span class="outcome-role-cue'+(!spokenId||h.id===spokenId?' narration-actor-current':'')+'" style="'+sideStyle(h)+'" aria-hidden="true"></span>').join(''):'';
    const picture='<div class="picture" id="picture"><img id="scene" src="'+esc(step.image)+'" alt="'+esc(alt)+'">'+window.ObligationStudyVisuals.nonhelpingEyeOverlay(step)+'<div id="targets">'+selection+highlight+cues+'</div></div>';
    if(!step.outcomeVisual) return picture;
    const badges=helpers.map(h=>{
      const bounds=window.ObligationStudyVisuals.actorBoundsFor(step,h.id);
      const center=bounds?bounds[0]+bounds[2]/2:h.side==='left'?19:81;
      return '<div class="no-help-badge'+(spokenId===h.id?' outcome-spoken':'')+'" style="left:'+center+'%" aria-label="'+esc(h.description)+' did not help"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16"/><path d="M9 9 31 31"/></svg><span>did <strong>NOT</strong> help</span></div>';
    }).join('');
    return '<div class="outcome-scene">'+picture+'<div class="no-help-strip">'+badges+'</div></div>';
  }

  function answerCards(step, options) {
    if(step.optionActors || !options.length) return '<div id="answers" hidden></div>';
    if(step.ratingBranch){
      return '<div class="rating-options" id="answers">'+options.map((label,i)=>
        '<button type="button" class="rating-answer option-visible option-ready" data-degree="'+(i+1)+'" data-answer="'+i+'"><span class="degree-icon degree-'+(i+1)+'">'+helperFace(step.ratingBranch==='mean'?i:'neutral')+'</span><span>'+esc(label)+'</span></button>'
      ).join('')+'</div>';
    }
    const binary=options.length===2 && options[0]==='Yes' && options[1]==='No';
    return '<div class="answers '+(binary?'yes-no-answers':'evaluation-answers')+'" id="answers">'+options.map((label,i)=>
      '<button type="button" class="spoken-choice option-visible '+(binary?'yes-no-answer':'evaluation-answer')+'" data-answer="'+i+'"'+(binary?' data-answer-kind="'+label.toLowerCase()+'"':'')+'>'+(binary?yesNo(label):helperFace(i===0?1:'neutral')+'<span>'+esc(label)+'</span>')+'</button>'
    ).join('')+'</div>';
  }

  function footer(hasChoices,canBack) {
    const control=(id,cls,icon,label,state)=>'<button type="button" id="'+id+'" class="'+cls+'" aria-label="'+label+'"'+state+'><span class="child-control-symbol" aria-hidden="true">'+icon+'</span><span class="child-control-label">'+label+'</span></button>';
    return '<div class="child-session-footer"><div class="child-helper" aria-hidden="true"><span class="child-helper-face"><i></i></span><span class="child-helper-bubble">'+(hasChoices?'Tell me your choice!':'Listen and look!')+'</span></div><div class="child-audio-controls">'+
      control('back','child-replay','←','Back',canBack?'':' disabled')+
      '<div class="answers child-continue"'+(hasChoices?' hidden':'')+'>'+control('next','continue-answer child-next','➜','Next',hasChoices?' hidden':'')+'</div></div></div>';
  }

  function render({stage,step,line=0,prompt,options=[],onAnswer,onNext,onBack,onSave,canBack=false,canSave=false}) {
    stage.classList.toggle('zoom-welcome',!step);
    stage.dataset.screenKind=step?'story':'welcome';
    stage.dataset.care=step?.care||'';
    stage.dataset.choiceLocation=step?.optionActors?'characters':'controls';
    stage.dataset.responseFormat=step?.optionActors?'forced-choice':step?.ratedActor?'individual-rating':options.length?'check':'continue';
    stage.dataset.responseKind=step?.ratingBranch?'scale':options.length?'binary':'continue';
    stage.style.setProperty('--story-accent',step?.pairing.visualHex||'#f5b236');
    if(!step){
      stage.innerHTML=welcome(canBack);
    }else{
      const kind=step.optionActors?'care-question-prompt':step.ratingBranch?'scale-prompt':step.ratedActor?'evaluation-prompt':step.localId==='recall-all'?'recall-prompt':'';
      const detail=(step.context&&!step.displayText?'<p class="referent">'+esc(step.context)+'</p>':'')+(step.preface?'<p class="preface">'+esc(step.preface)+'</p>':'');
      const header='<div class="prompt '+kind+'">'+detail+'<h2 id="prompt">'+esc(prompt)+'</h2></div>';
      const band=step.optionActors?'<p class="choice-caption" id="choice-prompt">'+esc(step.choiceQuestion)+'</p>':'<span id="choice-prompt" hidden></span>';
      stage.innerHTML=header+'<div class="story-art">'+artwork(step,line)+'</div>'+band+answerCards(step,options)+footer(options.length,canBack);
    }
    stage.querySelectorAll('[data-answer]').forEach(el=>el.addEventListener('click',()=>onAnswer(Number(el.dataset.answer))));
    stage.querySelector('#next')?.addEventListener('click',onNext);
    stage.querySelector('#back')?.addEventListener('click',onBack);
    const save=document.querySelector('#partial-download');
    if(save){ save.hidden=!canSave; save.onclick=onSave; }
  }
  window.ZoomSlideVisuals={render};
})();
