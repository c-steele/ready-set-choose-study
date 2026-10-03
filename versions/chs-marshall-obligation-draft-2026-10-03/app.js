(function () {
  'use strict';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=id=>document.getElementById(id), stage=$('stage'), jump=$('jump');
  const params=new URLSearchParams(location.search);
  const chsBridge=window.MarshallCHSBridge;
  let childView=false;
  let session,steps,index=0,answers={},history=[],wrong=null,optionReader=null,downloadUrl=null;
  let elapsed=0,started=null,timerUsed=false,incomplete=false,completed=false;
  let narrationRun=null,narrationEnabled=false,narrationPlaying=false;
  const narration=window.ObligationNarration;
  const roleNames={woman:'Mom / sister set',man:'Dad / brother set',family:'Family set',all:'All three sets · review only'};
  function storyAccent(s){
    // Practice has its own orange illustration; story screens match their stimuli.
    return s.localId.startsWith('practice-')?'#f5b236':s.pairing?.visualHex||'#f5b236';
  }
  function isCharacterIntro(s){return Boolean(s.pairing&&s.point&&s.localId.startsWith('intro-'));}
  function revealIntroducedCharacters(){
    const picture=stage.querySelector('.character-introduction');
    if(!picture)return;
    picture.classList.remove('introduction-focused');
    const img=picture.querySelector('img');img.src=picture.dataset.selectionImage;img.alt=picture.dataset.selectionAlt;
    stage.querySelector('[data-reveal-characters]')?.setAttribute('hidden','');
    const instruction=stage.querySelector('.point-instruction');if(instruction)instruction.textContent='Now choose a character.';
    gateNarration(narrationPlaying);syncChildControls();
  }
  function focusIntroducedCharacter(s){
    const picture=stage.querySelector('.character-introduction');
    if(!picture||wrong)return;
    picture.classList.add('introduction-focused');
    const actor=actors(s).find(a=>a.id===s.point),img=picture.querySelector('img');img.src=s.image;img.alt=`${actor.description} ${actor.side==='middle'?'in the middle':'on the '+actor.side}.`;
    stage.querySelector('[data-reveal-characters]')?.removeAttribute('hidden');
    const instruction=stage.querySelector('.point-instruction');if(instruction)instruction.textContent='Listen and meet this character.';
  }
  function syncChildControls(){
    const replay=stage.querySelector('.child-replay'),stop=stage.querySelector('.child-stop');
    if(!replay)return;
    replay.disabled=$('play-narration').disabled;
    replay.querySelector('.child-control-label').textContent=narrationEnabled?'Replay':'Listen';
    replay.setAttribute('aria-label',narrationEnabled?'Replay narration':'Listen to the narration');
    stop.hidden=!narrationPlaying;
    const s=steps[index]||steps[0],bubble=stage.querySelector('.child-helper-bubble');
    bubble.textContent=narrationPlaying||stage.querySelector('.rating-answer:disabled,.introduction-focused')?'Listen and look!':s.choices||s.point?'Choose one!':s.localId==='end'?'All done!':'Listen and look!';
    if(s.localId==='end')stage.querySelectorAll('.continue-answer').forEach(button=>button.textContent=childView?'All done!':'Read the full storyboard');
  }
  function setChildView(value){
    stopNarration();optionReader?.reset();childView=value;document.body.classList.toggle('child-view',value);
    if(value)showBoard(false);
    const u=new URL(location.href);if(value)u.searchParams.set('view','child');else u.searchParams.delete('view');
    window.history.replaceState(null,'',u);syncChildControls();window.scrollTo(0,0);
  }
  function childFooter(s){return `<div class="child-session-footer"><div class="child-helper" aria-hidden="true"><span class="child-helper-face"><i></i></span><span class="child-helper-bubble">Listen and look!</span></div><div class="child-audio-controls"><button class="child-replay" type="button"><span class="child-control-symbol" aria-hidden="true">▶</span><span class="child-control-label">Listen</span></button>${!s.choices&&!s.point?'<div class="answers child-continue"><button class="continue-answer" data-answer="0">Continue</button></div>':''}<button class="child-stop" type="button" hidden>Stop</button></div></div>`;}
  function narrationIds(s){
    const map=narration.screenFor(s), id=wrong&&map.reminder?map.reminder:map.prompt;
    const spokenBinary=/Yes or No\.?$/i.test(s.text)||/Mean or Not Mean/i.test(s.text);
    return [id,...(!wrong&&s.choices?.length===2&&!spokenBinary?map.options:[])].filter(Boolean);
  }
  function gateNarration(locked){stage.querySelectorAll('.answers button,[data-point],#continue-check,[data-reveal-characters]').forEach(b=>b.disabled=locked||b.hasAttribute('data-point')&&Boolean(stage.querySelector('.introduction-focused')));}
  function stopNarration(){narrationRun?.cancel();narrationRun=null;narration.stop();narrationPlaying=false;gateNarration(false);$('stop-narration').disabled=true;syncChildControls();}
  function narrationStatus(){
    const ids=narrationIds(steps[index]),ready=ids.length>0&&ids.every(id=>narration.clipsById[id]?.src);
    $('play-narration').textContent='Play narration';$('play-narration').disabled=!ready;$('stop-narration').disabled=!narrationPlaying;
    $('narration-status').textContent=ready?'NaturalReader · Evelyn · Soft · 0.90×':'NaturalReader recordings are pending for this screen. Read aloud to review.';
    syncChildControls();
    return ready;
  }
  function playNarration(){
    stopNarration();if(!narrationStatus())return;
    const s=steps[index],screenId=s.id;narrationEnabled=true;narrationPlaying=true;focusIntroducedCharacter(s);gateNarration(true);optionReader?.reset();
    $('stop-narration').disabled=false;$('play-narration').textContent='Replay narration';$('narration-status').textContent='Listen to Evelyn…';
    syncChildControls();
    narrationRun=narration.play(narrationIds(s),{
      onEnd(){if(steps[index].id!==screenId)return;narrationRun=null;narrationPlaying=false;revealIntroducedCharacters();gateNarration(false);$('stop-narration').disabled=true;$('narration-status').textContent='Narration finished.';if(!wrong&&s.choices?.length===3)optionReader?.read();syncChildControls();},
      onError(){if(steps[index].id!==screenId)return;narrationRun=null;narrationPlaying=false;gateNarration(false);$('stop-narration').disabled=true;$('narration-status').textContent='Audio could not play. Try replaying, or read this screen aloud.';syncChildControls();}
    });
  }
  function actors(s){return s.pairing?[s.pairing.recipient,...s.pairing.helpers]:[];}
  function scene(s,interactive=false){
    if(s.visual==='teacher-practice')return `<div class="practice-illustration"><p class="practice-setup">${esc(s.displaySetup)}</p><img src="assets/practice-teacher.svg" alt="A teacher tells a child, Stop being mean. The child is labeled YOU."><h2 class="practice-question">${esc(s.displayQuestion)}</h2></div>`;
    if(!s.image)return '<div class="practice-space" aria-hidden="true"></div>';
    const introduction=interactive&&isCharacterIntro(s),focused=introduction&&!wrong;
    const buttons=interactive&&s.point?actors(s).map(a=>`<button class="point-target side-${a.side}${wrong&&a.id===s.point?' reveal':''}" data-point="${a.id}" ${focused?'disabled':''} aria-label="Select ${esc(a.description)}"></button>`).join(''):'';
    const alt=actors(s).map(a=>`${a.description} ${a.side==='middle'?'in the middle':'on the '+a.side}`).join('; ');
    const actor=focused?actors(s).find(a=>a.id===s.point):null,selectionImage=introduction?s.pairing.intros[s.pairing.intros.length-1].image:s.image;
    const masks=focused?actors(s).filter(a=>a.id!==s.point).map(a=>`<span class="introduction-dimmer side-${a.side}" aria-hidden="true"></span>`).join(''):'';
    const image=introduction&&!focused?selectionImage:s.image,shownAlt=actor?`${actor.description} ${actor.side==='middle'?'in the middle':'on the '+actor.side}`:alt;
    return `<div class="picture${introduction?' character-introduction':''}${focused?' introduction-focused':''}"${introduction?` data-selection-image="${esc(selectionImage)}" data-selection-alt="${esc(alt)}."`:''}><img ${interactive?'':'loading="lazy"'} src="${esc(image)}" alt="${esc(shownAlt)}.${s.image===s.pairing.images.need?' '+esc(s.pairing.recipient.reference)+' is sad.':''}">${masks}${buttons}</div>`;
  }
  function prompt(s){return `<div class="prompt">${s.context?`<p class="referent">${esc(s.context)}</p>`:''}${s.preface?`<p class="preface">${esc(s.preface)}</p>`:''}<h2>${esc(s.displayTitle||s.text)}</h2></div>`;}
  function branchNote(s){if(!s.when)return '';const parent=steps.find(p=>p.id===s.when[0]);return `Only after “${s.when[1]}” to ${parent.phase.toLowerCase()}. `;}
  function scaleOptions(s,interactive=false){
    const cards=s.choices.map((c,i)=>interactive?`<button class="rating-answer" data-answer="${i}" disabled><span class="amount-marker marker-${i}" aria-hidden="true"></span><span>${esc(c)}</span></button>`:`<div class="rating-answer option-visible"><span class="amount-marker marker-${i}" aria-hidden="true"></span><span>${esc(c)}</span></div>`).join('');
    return `<div class="rating-options">${cards}</div>${interactive?'<div class="option-reader-controls"><button data-read-options type="button">Read choices</button><button data-read-manually type="button">Read myself</button></div><p class="reader-status" data-reader-status role="status">Listen to each choice, then pick one.</p>':''}`;
  }
  function render(){
    stopNarration();optionReader?.dispose();optionReader=null;
    const s=steps[index];completed=s.localId==='end';chsBridge?.screen(s,session,index);jump.value=s.id;$('back').disabled=history.length===0;
    stage.style.setProperty('--story-accent',storyAccent(s));
    $('story-jump').value=s.pairing?.id||'end';
    const local=steps.filter(x=>x.pairing?.id===s.pairing?.id),position=local.indexOf(s)+1;
    $('story-progress').textContent=s.pairing?`Story ${s.storyIndex+1} of ${session.pairings.length} · ${s.pairing.label} · Screen ${position} of ${local.length} possible`:'Session complete';
    $('child-story-label').textContent=s.pairing?`Story ${s.storyIndex+1} of ${session.pairings.length}`:'All done!';
    $('progress-bar').style.width=`${100*(index+1)/steps.length}%`;
    $('progress-bar').style.backgroundColor=storyAccent(s);
    let options=s.point?`<p class="point-instruction">${isCharacterIntro(s)&&!wrong?'Listen and meet this character.':'Select a character on the screen.'}</p>${isCharacterIntro(s)&&!wrong?'<div class="introduction-controls"><button data-reveal-characters type="button">Show everyone</button></div>':''}`:`<div class="answers">${(s.choices||[s.localId==='end'?'Read the full storyboard':'Continue']).map((c,i)=>`<button ${s.choices?'':'class="continue-answer"'} data-answer="${i}">${esc(c)}</button>`).join('')}</div>`;
    if(s.choices?.length===3)options=scaleOptions(s,true);
    const feedback=wrong?`<p class="feedback">${esc(s.reminder)}</p><div class="facilitator-controls"><span>Facilitator review</span><button id="continue-check">Continue after reminder</button></div>`:'';
    stage.dataset.screenKind=s.visual==='teacher-practice'?'illustrated-practice':s.image?'story':'practice';
    stage.dataset.responseKind=s.choices?.length===3?'scale':s.point?'character':s.choices?'binary':'continue';
    stage.innerHTML=prompt(s)+scene(s,true)+feedback+options+childFooter(s);
    stage.querySelector('.child-replay').addEventListener('click',playNarration);
    stage.querySelector('.child-stop').addEventListener('click',()=>{stopNarration();optionReader?.reset();$('narration-status').textContent='Audio stopped. Replay, or read aloud.';});
    $('step-note').innerHTML=`${s.proposed?'<strong>Proposed wording · </strong>':''}${esc(branchNote(s)+(s.note||'Adapted from Marshall Study 1.'))}`;
    stage.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>respond((s.choices||['Continue'])[Number(b.dataset.answer)])));
    stage.querySelectorAll('[data-point]').forEach(b=>b.addEventListener('click',()=>respond(b.dataset.point)));
    stage.querySelector('[data-reveal-characters]')?.addEventListener('click',revealIntroducedCharacters);
    $('continue-check')?.addEventListener('click',()=>commit(wrong));
    if(s.choices?.length===3){try{optionReader=window.createOptionReader(stage,s.choices,{clipIds:narration.screenFor(s).options,onManualStart:()=>{stopNarration();$('narration-status').textContent='Reading choices manually.';},onReadStart:()=>{stopNarration();narrationPlaying=true;$('stop-narration').disabled=false;$('narration-status').textContent='Listen to Evelyn read each choice…';syncChildControls();},onComplete:()=>{narrationPlaying=false;$('stop-narration').disabled=true;$('narration-status').textContent='Choose an answer.';syncChildControls();},onError:()=>{narrationPlaying=false;$('stop-narration').disabled=true;$('narration-status').textContent='Choice audio could not play. Try again or read the choices aloud.';syncChildControls();}});}catch(error){stage.querySelector('[data-reader-status]').textContent='Option reading could not start. Please refresh this draft.';}}
    if(completed)pauseTimer();else updateTimer();
    narrationStatus();if(narrationEnabled&&$('auto-narration').checked&&!$('player').hidden)playNarration();
  }
  function respond(answer){const s=steps[index];if(s.localId==='end'){if(chsBridge?.embedded){stopNarration();chsBridge.complete(session,answers);return;}showBoard(true);return;}if((s.expected&&answer!==s.expected)||(s.point&&answer!==s.point)){chsBridge?.answer(s,session,answer,{accepted:false});wrong=answer;render();return;}commit(answer);}
  function commit(answer){chsBridge?.answer(steps[index],session,answer,{accepted:true,continuedAfterReminder:!!wrong});if(timerUsed&&started===null)incomplete=true;for(let n=index;n<steps.length;n++)delete answers[steps[n].id];answers[steps[index].id]=answer;history.push(index);wrong=null;index=Math.min(session.nextIndex(index,answers),steps.length-1);render();}
  function goTo(target){markBrowse();history.push(index);index=target;wrong=null;showBoard(false);render();stage.scrollIntoView({block:'nearest'});}
  function showBoard(value){
    if(value&&childView)setChildView(false);
    if(value){stopNarration();optionReader?.dispose();optionReader=null;if(!completed)markBrowse();}
    $('player').hidden=value;$('storyboard').hidden=!value;
    for(const [id,active]of[['story-tab',!value],['board-tab',value]]){const e=$(id);e.classList.toggle('selected',active);e.setAttribute('aria-pressed',String(active));}
    if(!value&&!optionReader&&steps[index].choices?.length===3)render();
  }
  function card(s,i){return `<article class="story-card" style="--story-accent:${esc(storyAccent(s))}"><h3 class="card-heading">${String(i+1).padStart(2,'0')} · ${esc(s.phase)}${s.proposed?' · PROPOSED WORDING':''}</h3>${prompt(s)}${scene(s)}${s.choices?.length===3?scaleOptions(s):`<p class="card-options">${s.point?'Select '+esc(actors(s).find(a=>a.id===s.point).description):s.choices?s.choices.map(esc).join(' &nbsp; / &nbsp; '):'Narration'}</p>`}${s.when||s.note||s.expected||s.point?`<p class="card-note">${esc(branchNote(s)+(s.note||''))}${s.expected?' Check answer: '+esc(s.expected)+'.':''}${s.reminder?' Reminder if needed: “'+esc(s.reminder)+'”':''}</p>`:''}</article>`;}
  function buildBoard(){
    $('cards').innerHTML=session.pairings.map((p,n)=>`<section class="board-story" id="board-${p.id}"><h2>Story ${n+1} · ${esc(p.label)}</h2><p class="recipient-note">${esc(p.recipient.reference)} is sad.</p><div class="story-grid">${steps.filter(s=>s.pairing?.id===p.id).map(card).join('')}</div></section>`).join('')+`<div class="story-grid">${card(steps[steps.length-1],0)}</div>`;
  }
  function updateOverview(){
    const t=session.stats;
    const recordedTiming=window.ObligationNarrationTiming?.[session.setId+'-'+session.practiceMode];
    const estimatedMinutes=recordedTiming?.estimatedSessionMinutesIncludingResponses||t.minutes;
    $('session-subtitle').textContent=`${roleNames[session.setId]} · ${t.storyCount} stories · Sadness · Plain backgrounds`;
    $('session-warning').textContent=session.isAllReview?'All 18 story instances are shown for review. Shared pairings recur across sets; this is not the six-story session one child would receive.':'One child would see one set of six pairings. The order below is fixed for review.';
    $('session-stats').innerHTML=`<div><strong>${t.storyCount}</strong><span>stories</span></div><div><strong>${t.substantive}</strong><span>main judgments</span></div><div><strong>${t.responses.min}–${t.responses.max}</strong><span>question responses</span></div><div><strong>~${Math.round(estimatedMinutes.min)}–${Math.round(estimatedMinutes.max)} min</strong><span>illustrative estimate</span></div>`;
    $('timing-details').textContent=`${t.screens.min}–${t.screens.max} screens on the correct-practice path. Includes ${t.checks} identity/recall checks, ${t.practiceResponses} practice selections, and 0–${t.strengthResponses.max} main strength follow-ups. ${recordedTiming?'The recordings and programmed pauses total '+recordedTiming.playbackMinutes.min.toFixed(1)+'–'+recordedTiming.playbackMinutes.max.toFixed(1)+' minutes. The estimate adds 3–5 seconds per response.':'Timing assumes reading aloud at 110–130 words/minute plus 3–5 seconds per selection.'} It is not measured child-session time; breaks, corrections and control/navigation time can add to it.`;
    $('practice-note').textContent=session.practiceMode==='each'?'Practice repeats in every story, preserving the current full sequence.':'Shorter draft option: practice occurs in the first story only. This changes the repeated practice in the captured Marshall study.';
    $('pairing-list').innerHTML=session.pairings.map((p,i)=>`<button class="pairing-tile" data-story="${p.id}"><span class="tile-number">${i+1}</span><span class="tile-picture"><img src="${esc(p.images.need)}" alt="${esc(p.label)}; ${esc(p.recipient.reference)} is sad."></span><strong>${esc(p.label)}</strong><span>${p.recipient.role==='KID'?'Kid is sad':esc(p.recipient.label.charAt(0).toUpperCase()+p.recipient.label.slice(1))+' is sad'}</span></button>`).join('');
    $('pairing-list').querySelectorAll('[data-story]').forEach(b=>b.addEventListener('click',()=>goTo(steps.findIndex(s=>s.pairing?.id===b.dataset.story))));
    jump.innerHTML=session.pairings.map((p,i)=>`<optgroup label="Story ${i+1} · ${esc(p.label)}">${steps.filter(s=>s.pairing?.id===p.id).map((s,n)=>`<option value="${s.id}">${n+1} · ${esc(s.phase)}${s.when?' (follow-up)':''}</option>`).join('')}</optgroup>`).join('')+'<option value="session-end">Session end</option>';
    $('story-jump').innerHTML=session.pairings.map((p,i)=>`<option value="${p.id}">${i+1} · ${esc(p.label)}</option>`).join('')+'<option value="end">Session end</option>';
    if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(new Blob([ObligationSession.toMarkdown(session)],{type:'text/markdown'}));$('download-script').href=downloadUrl;$('download-script').download=`obligation-${session.setId}-practice-${session.practiceMode}.md`;
  }
  function resetRun(){chsBridge?.reset();stopNarration();narrationEnabled=false;optionReader?.dispose();optionReader=null;index=0;answers={};history=[];wrong=null;elapsed=0;started=null;timerUsed=false;incomplete=false;completed=false;showBoard(false);render();updateTimer();}
  function configure(){session=ObligationSession.build($('set-select').value,$('practice-select').value);steps=session.steps;const u=new URL(location.href);u.searchParams.set('set',session.setId);u.searchParams.set('practice',session.practiceMode);window.history.replaceState(null,'',u);updateOverview();buildBoard();resetRun();}
  function pauseTimer(){if(started!==null){elapsed+=Date.now()-started;started=null;}updateTimer();}
  function markBrowse(){if(timerUsed){incomplete=true;pauseTimer();}}
  function updateTimer(){const total=Math.floor((elapsed+(started===null?0:Date.now()-started))/1000);$('elapsed').textContent=`${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;$('timer-toggle').textContent=started!==null?'Pause':timerUsed?'Resume timer':'Start timer';$('timer-toggle').disabled=completed;$('timer-note').textContent=incomplete?'Partial walkthrough: navigation or a late start skipped part of the session.':completed&&timerUsed?'Finished walkthrough; this is your preview time.':timerUsed?(started!==null?'Timing this walkthrough.':'Timer paused.'):'Start on the first screen and read aloud to check the pace.';}
  $('timer-toggle').addEventListener('click',()=>{showBoard(false);if(started!==null)pauseTimer();else{if(!timerUsed&&index!==0)incomplete=true;timerUsed=true;started=Date.now();updateTimer();}});
  $('timer-reset').addEventListener('click',()=>{elapsed=0;started=null;timerUsed=false;incomplete=false;completed=false;updateTimer();});
  jump.addEventListener('change',()=>goTo(steps.findIndex(s=>s.id===jump.value)));
  $('story-jump').addEventListener('change',()=>goTo($('story-jump').value==='end'?steps.length-1:steps.findIndex(s=>s.pairing?.id===$('story-jump').value)));
  $('back').addEventListener('click',()=>{if(history.length){markBrowse();index=history.pop();wrong=null;render();}});
  $('restart').addEventListener('click',resetRun);
  $('child-view').addEventListener('click',()=>setChildView(true));$('researcher-view').addEventListener('click',()=>setChildView(false));
  $('story-tab').addEventListener('click',()=>showBoard(false));$('board-tab').addEventListener('click',()=>showBoard(true));$('print').addEventListener('click',async()=>{const imgs=[...$('cards').querySelectorAll('img')];imgs.forEach(img=>img.loading='eager');await Promise.all(imgs.map(img=>img.decode().catch(()=>{})));window.print();});
  window.addEventListener('beforeprint',()=>{document.querySelectorAll('#cards img').forEach(img=>img.loading='eager');});
  $('set-select').value=Object.keys(roleNames).includes(params.get('set'))?params.get('set'):'woman';$('practice-select').value=params.get('practice')==='once'?'once':'each';
  $('set-select').addEventListener('change',configure);$('practice-select').addEventListener('change',configure);
  window.addEventListener('pagehide',()=>{stopNarration();narrationEnabled=false;optionReader?.dispose();optionReader=null;pauseTimer();});window.addEventListener('pageshow',e=>{if(e.persisted)render();});
  $('play-narration').addEventListener('click',playNarration);$('stop-narration').addEventListener('click',()=>{stopNarration();optionReader?.reset();$('narration-status').textContent='Audio stopped. Replay, or read aloud.';});
  $('auto-narration').addEventListener('change',()=>{if(!$('auto-narration').checked){stopNarration();optionReader?.reset();$('narration-status').textContent='Audio stopped. Replay, or read aloud.';}});
  const recordingClips=Object.values(narration.clipsById);$('recording-coverage').textContent=`${recordingClips.filter(c=>c.src).length} of ${recordingClips.length} distinct recordings connected across all pairing sets.`;
  configure();setInterval(updateTimer,1000);if(params.get('view')==='storyboard')showBoard(true);else if(params.get('view')==='child')setChildView(true);
})();
