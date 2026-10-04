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
    return s.pairing?.visualHex||'#f5b236';
  }
  function isCharacterIntro(s){return Boolean(s.pairing&&s.point&&s.localId.startsWith('intro-'));}
  // Bounds include each character, their existing outline and their role label.
  // Measured from the unmodified final intro stimulus, inside the 1920 × 840 crop.
  const introActorBounds={"woman-mom-teacher":{"recipient":[38.49,31.667,23.125,63.452],"helper1":[3.073,4.405,29.688,90.714],"helper2":[67.135,4.405,29.635,90.714]},"woman-sister-friend":{"recipient":[38.281,31.667,23.125,63.452],"helper1":[3.75,31.667,23.125,63.452],"helper2":[72.552,31.667,23.125,63.452]},"woman-bestfriend-friend":{"recipient":[38.281,31.667,23.125,63.452],"helper1":[3.75,31.667,23.125,63.452],"helper2":[72.5,31.667,23.177,63.452]},"woman-teacher-friend":{"recipient":[41.094,31.667,23.125,63.452],"helper1":[4.531,4.405,29.688,90.714],"helper2":[71.25,31.667,23.177,63.452]},"woman-mom-sister":{"recipient":[41.094,31.667,23.125,63.452],"helper1":[4.531,4.405,29.688,90.714],"helper2":[71.25,31.667,23.177,63.452]},"woman-teacher-classmate":{"recipient":[35.26,31.667,23.177,63.452],"helper1":[4.531,31.667,23.177,63.452],"helper2":[65.833,4.405,29.688,90.714]},"man-dad-teacher":{"recipient":[38.49,31.667,23.125,63.452],"helper1":[3.073,4.405,29.688,90.714],"helper2":[67.135,4.405,29.635,90.714]},"man-brother-friend":{"recipient":[38.281,31.667,23.125,63.452],"helper1":[3.75,31.667,23.125,63.452],"helper2":[72.5,31.667,23.177,63.452]},"man-bestfriend-friend":{"recipient":[38.281,31.667,23.125,63.452],"helper1":[3.75,31.667,23.125,63.452],"helper2":[72.5,31.667,23.177,63.452]},"man-teacher-friend":{"recipient":[41.094,31.667,23.125,63.452],"helper1":[4.531,4.405,29.688,90.714],"helper2":[71.25,31.667,23.177,63.452]},"man-dad-brother":{"recipient":[41.094,31.667,23.125,63.452],"helper1":[4.531,4.405,29.688,90.714],"helper2":[71.25,31.667,23.177,63.452]},"man-teacher-classmate":{"recipient":[35.26,31.667,23.177,63.452],"helper1":[4.531,31.667,23.177,63.452],"helper2":[65.833,4.405,29.688,90.714]},"family-mom-dad":{"recipient":[38.49,31.667,23.125,63.452],"helper1":[3.073,4.405,29.688,90.714],"helper2":[67.135,4.405,29.635,90.714]},"family-sister-brother":{"recipient":[38.281,31.667,23.125,63.452],"helper1":[3.75,31.667,23.125,63.452],"helper2":[72.552,31.667,23.125,63.452]},"family-dad-kid":{"recipient":[38.49,4.405,27.031,90.714],"helper1":[4.531,4.405,29.688,90.714],"helper2":[65.521,4.405,28.906,90.714]},"family-mom-kid":{"recipient":[34.479,4.405,26.979,90.714],"helper1":[4.375,4.405,30.104,90.714],"helper2":[65.521,4.405,29.635,90.714]},"family-teacher-kid":{"recipient":[38.49,4.405,27.031,90.714],"helper1":[4.531,4.405,29.688,90.714],"helper2":[65.521,4.405,28.906,90.714]},"family-teacher-classmate":{"recipient":[35.26,31.667,23.177,63.452],"helper1":[4.531,31.667,23.177,63.452],"helper2":[65.833,4.405,29.688,90.714]}};
  function visibleIntroActors(s){
    if(!s.pairing)return [];
    const intros=s.pairing.intros;
    if(s.localId==='group')return intros.slice(0,1).map(intro=>intro.actorId);
    if(!isCharacterIntro(s))return actors(s).map(actor=>actor.id);
    const current=intros.findIndex(intro=>intro.actorId===s.point);
    return intros.slice(0,current+1).map(intro=>intro.actorId);
  }
  function actorTargetStyle(s,actor){
    const bounds=introActorBounds[s.pairing.id]?.[actor.id];
    return bounds?` style="left:${bounds[0]}%;top:${bounds[1]}%;width:${bounds[2]}%;height:${bounds[3]}%"`:'';
  }
  function helperChoiceActors(s){
    const ids=s.optionActors || (s.localId==='compare'?s.pairing?.helpers.map(actor=>actor.id):null);
    if(!s.pairing || !ids || ids.length!==s.choices?.length)return [];
    const helpers=ids.map(id=>s.pairing.helpers.find(actor=>actor.id===id));
    return helpers.every(Boolean)?helpers:[];
  }
  // Choice boxes cover the people, while their original role labels stay below.
  function characterChoiceStyle(s,actor){
    const bounds=introActorBounds[s.pairing.id]?.[actor.id];
    return bounds?` style="left:${bounds[0]}%;top:${bounds[1]}%;width:${bounds[2]}%;height:${bounds[3]-13.5}%"`:'';
  }
  const cueTokens=text=>(String(text).toLowerCase().replace(/[’‘']/g,'').match(/[\p{L}\p{N}]+/gu)||[]);
  function phraseMatches(words,phrase){
    const tokens=cueTokens(phrase),result=[];
    if(!tokens.length)return result;
    for(let at=0;at<=words.length-tokens.length;at++){
      if(tokens.every((token,n)=>words[at+n].token===token))result.push({at,length:tokens.length,start:words[at].start,end:words[at+tokens.length-1].end});
    }
    return result;
  }
  function embeddedChoices(s){
    if(s.choices?.length!==2)return false;
    const words=cueTokens(s.text).map(token=>({token,start:0,end:0}));
    return phraseMatches(words,`${s.choices[0]} or ${s.choices[1]}`).length>0;
  }
  function recordingWords(clipId,allowRecognizedMismatch=false){
    const clip=narration.clipsById[clipId],entry=window.ObligationNarrationCues?.clips?.[clipId];
    if(!clip?.sha256||entry?.sha256!==clip.sha256||(!allowRecognizedMismatch&&entry.exactNormalizedWordMatch===false)||entry.alignmentValid===false||!Array.isArray(entry.words))return [];
    if(entry.expectedText&&cueTokens(entry.expectedText).join(' ')!==cueTokens(clip.text).join(' '))return [];
    const duration=clip.durationSeconds||entry.durationSeconds;
    const words=[];
    for(const word of entry.words){
      if(!Number.isFinite(word.start)||!Number.isFinite(word.end)||word.start<0||word.end<word.start||(Number.isFinite(duration)&&word.end>duration+.08))return [];
      for(const token of cueTokens(word.word))words.push({token,start:word.start,end:word.end});
    }
    return words;
  }
  function spokenCueSpans(s,clipId,optionIndex=null){
    const words=recordingWords(clipId,optionIndex!==null),spans=[];
    if(!words.length)return spans;
    if(optionIndex!==null){
      // Each option is a separate verified recording. A recognizer spelling
      // error (for example Mean/Meen) need not suppress its voiced interval.
      if(cueTokens(narration.clipsById[clipId]?.text).join(' ')!==cueTokens(s.choices[optionIndex]).join(' '))return spans;
      spans.push({start:words[0].start,end:words[words.length-1].end,optionIndex,wordTimes:words.map((word,wordIndex)=>({start:word.start,end:word.end,wordIndex})),...(s.localId==='compare'?{actorId:s.pairing.helpers[optionIndex].id}:{})});
      return spans;
    }
    // Whole relationship names win over the possessive kid word inside them.
    // The current scene resolves shared clips to its own helper IDs and sides.
    const candidates=[];
    for(const actor of actors(s)){
      const names=[actor.description,actor.reference].filter(Boolean);
      if(actor.role==='KID')names.push('this kid','a kid');
      names.push(actor.description.replace(/^the /,'this '));
      for(const name of new Set(names))candidates.push({actorId:actor.id,tokens:cueTokens(name)});
    }
    if(isCharacterIntro(s)){
      const intro=s.pairing.intros.find(value=>value.actorId===s.point);
      const name=intro.sourceText.split(/\bis\s+/i).pop();
      candidates.push({actorId:s.point,tokens:cueTokens(name)});
    }
    if(s.visual==='teacher-practice'){
      candidates.length=0;
      candidates.push({actorId:'practice-teacher',tokens:cueTokens('a teacher')},{actorId:'practice-you',tokens:cueTokens('you')});
    }
    candidates.sort((a,b)=>b.tokens.length-a.tokens.length);
    for(let at=0;at<words.length;){
      const match=candidates.find(candidate=>candidate.tokens.length&&candidate.tokens.every((token,n)=>words[at+n]?.token===token));
      if(!match){at++;continue;}
      spans.push({actorId:match.actorId,start:words[at].start,end:words[at+match.tokens.length-1].end});
      at+=match.tokens.length;
    }
    // Only the adjacent response-label phrase lights embedded binary choices.
    // In particular, "No one helped" is story text, not the No response option.
    if(s.choices?.length===2){
      const pair=phraseMatches(words,`${s.choices[0]} or ${s.choices[1]}`);
      for(const range of pair){
        const firstLength=cueTokens(s.choices[0]).length,secondStart=range.at+firstLength+1;
        spans.push({optionIndex:0,start:words[range.at].start,end:words[range.at+firstLength-1].end,wordTimes:words.slice(range.at,range.at+firstLength).map((word,wordIndex)=>({start:word.start,end:word.end,wordIndex}))});
        spans.push({optionIndex:1,start:words[secondStart].start,end:words[range.at+range.length-1].end,wordTimes:words.slice(secondStart,range.at+range.length).map((word,wordIndex)=>({start:word.start,end:word.end,wordIndex}))});
      }
    }
    return spans;
  }
  function clearSpokenCues(){
    stage.querySelectorAll('.narration-actor-current,.option-current,.choice-bounce-a,.choice-bounce-b').forEach(element=>element.classList.remove('narration-actor-current','option-current','choice-bounce-a','choice-bounce-b'));
  }
  function showSpokenCues(spans,seconds){
    const current=spans.filter(cue=>seconds>=cue.start&&seconds<cue.end),actorIds=new Set(current.map(cue=>cue.actorId).filter(Boolean)),optionIndexes=new Set(current.map(cue=>cue.optionIndex).filter(value=>value!==undefined));
    stage.querySelectorAll('[data-narration-actor]').forEach(element=>element.classList.toggle('narration-actor-current',actorIds.has(element.dataset.narrationActor)));
    stage.querySelectorAll('[data-answer]:not(.continue-answer)').forEach(button=>{
      const answer=Number(button.dataset.answer),cue=current.find(value=>value.optionIndex===answer);
      button.classList.toggle('option-current',optionIndexes.has(answer));
      const word=cue?.wordTimes?.find(value=>seconds>=value.start&&seconds<value.end);
      const bounce=button.classList.contains('spoken-choice') && (word || (cue&&!cue.wordTimes));
      // Alternate identical animation names so the second word restarts the hop.
      button.classList.toggle('choice-bounce-a',!!bounce&&((word?.wordIndex||0)%2===0));
      button.classList.toggle('choice-bounce-b',!!bounce&&((word?.wordIndex||0)%2===1));
    });
  }
  function childAudioMode(s,fullReady){
    if(fullReady)return 'full';
    const optionIds=narration.screenFor(s).options;
    const ready=!!s.choices?.length && optionIds.length===s.choices.length && optionIds.every((id,index)=>{
      const clip=narration.clipsById[id];
      return !!clip?.src && cueTokens(clip.text).join(' ')===cueTokens(s.choices[index]).join(' ');
    });
    return ready?'choices':'unavailable';
  }
  // Expose pure cue mapping for local regression checks and review diagnostics.
  window.ObligationSpokenCues={recordingWords,spansFor:spokenCueSpans,embeddedChoices,childAudioMode};
  function syncChildControls(){
    const replay=stage.querySelector('.child-replay'),stop=stage.querySelector('.child-stop');
    if(!replay)return;
    const s=steps[index]||steps[0],mode=childAudioMode(s,!$('play-narration').disabled);
    replay.disabled=mode==='unavailable';
    replay.querySelector('.child-control-label').textContent=mode==='choices'?'Choices':narrationEnabled?'Replay':'Listen';
    replay.setAttribute('aria-label',mode==='choices'?'Listen to the choices':narrationEnabled?'Replay narration':'Listen to the narration');
    replay.title=mode==='choices'?'Hear only the answer choices':'Hear the narration';
    stop.hidden=!narrationPlaying;
    const bubble=stage.querySelector('.child-helper-bubble');
    bubble.textContent=narrationPlaying||stage.querySelector('.rating-answer:disabled')?'Listen and look!':s.point?'Tap '+actors(s).find(a=>a.id===s.point).description+'!':helperChoiceActors(s).length?'Tap a person!':s.choices?'Tap one!':s.localId==='end'?'All done!':'Listen and look!';
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
    return [id].filter(Boolean);
  }
  function gateNarration(locked){stage.querySelectorAll('[data-answer],[data-point],#continue-check').forEach(b=>b.disabled=locked);}
  function stopNarration(){narrationRun?.cancel();narrationRun=null;narration.stop();narrationPlaying=false;clearSpokenCues();gateNarration(false);$('stop-narration').disabled=true;syncChildControls();}
  function narrationStatus(){
    const s=steps[index],ids=[...narrationIds(s),...(!wrong&&s.choices&&!embeddedChoices(s)?narration.screenFor(s).options:[])],ready=ids.length>0&&ids.every(id=>narration.clipsById[id]?.src);
    $('play-narration').textContent='Play narration';$('play-narration').disabled=!ready;$('stop-narration').disabled=!narrationPlaying;
    const slowerReminder=ids.some(id=>narration.clipsById[id]?.audioTreatment?.kind==='slow-neither-reminder');
    $('narration-status').textContent=ready?(slowerReminder?'NaturalReader · Evelyn · Slower reminder':'NaturalReader · Evelyn · Soft · 0.90×'):'NaturalReader recordings are pending for this screen. Read aloud to review.';
    syncChildControls();
    return ready;
  }
  function playChildNarration(){
    if(!$('play-narration').disabled)return playNarration();
    const s=steps[index];
    if(childAudioMode(s,false)==='choices' && optionReader?.read()){
      $('narration-status').textContent='Question narration is pending. Evelyn is reading only the answer choices.';
    }
  }
  function playNarration(){
    stopNarration();if(!narrationStatus())return;
    const s=steps[index],screenId=s.id;narrationEnabled=true;narrationPlaying=true;optionReader?.prepare();gateNarration(true);
    $('stop-narration').disabled=false;$('play-narration').textContent='Replay narration';$('narration-status').textContent='Listen to Evelyn…';
    syncChildControls();
    const clipSpans=new Map();
    narrationRun=narration.play(narrationIds(s),{
      onClipTime(id,clipIndex,seconds){if(steps[index].id!==screenId)return;if(!clipSpans.has(id))clipSpans.set(id,spokenCueSpans(s,id));showSpokenCues(clipSpans.get(id),seconds);},
      onClipClear:clearSpokenCues,
      onEnd(){if(steps[index].id!==screenId)return;narrationRun=null;clearSpokenCues();if(!wrong&&s.choices&&!embeddedChoices(s)){if(optionReader?.read())return;narrationPlaying=false;$('narration-status').textContent='Read the choices aloud, or try Replay.';}else{narrationPlaying=false;optionReader?.ready();gateNarration(false);$('narration-status').textContent='Narration finished.';}$('stop-narration').disabled=true;syncChildControls();},
      onError(){if(steps[index].id!==screenId)return;narrationRun=null;narrationPlaying=false;clearSpokenCues();$('stop-narration').disabled=true;$('narration-status').textContent='Audio could not play. Try replaying, or read this screen aloud.';syncChildControls();}
    });
  }
  function actors(s){return s.pairing?[s.pairing.recipient,...s.pairing.helpers]:[];}
  function practiceArtwork(s){
    // Reuse the original FTC teacher and kid pixels, rather than redrawing them.
    const source=window.ObligationPairings.pairings.find(p=>p.id==='woman-mom-teacher').images.group;
    const sourceColor=[129,214,83].map(n=>n/255),accent=storyAccent(s);
    const targetColor=accent.match(/[a-f\d]{2}/gi).map(n=>parseInt(n,16)/255);
    const mean=sourceColor.reduce((a,b)=>a+b,0)/3,direction=sourceColor.map(n=>n-mean);
    const norm=direction.reduce((a,b)=>a+b*b,0),vector=direction.map(n=>n/norm);
    // This linear map preserves black, white, and their antialias blends.
    const matrix=targetColor.flatMap((n,i)=>[...vector.map((v,j)=>(i===j?1:0)+(n-sourceColor[i])*v),0,0]).concat([0,0,0,1,0]).join(' ');
    const filterId='practice-palette-'+s.id.replace(/[^a-z\d-]/gi,'-');
    return `<svg class="practice-artwork" viewBox="0 0 900 390" role="img" aria-label="A teacher tells a child, Stop being mean. The child is labeled YOU." xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="${filterId}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${matrix}"/></filter></defs>
      <svg x="145" y="62" width="215" height="281" viewBox="100 160 490 640"><image href="${esc(source)}" width="1920" height="1080" filter="url(#${filterId})"/></svg>
      <svg x="595" y="179" width="180" height="172" viewBox="760 390 410 390"><image href="${esc(source)}" width="1920" height="1080" filter="url(#${filterId})"/></svg>
      <path class="practice-bubble" d="M350 25 H660 Q677 25 677 42 V89 Q677 106 660 106 H362 L326 133 L340 100 Q333 95 333 85 V42 Q333 25 350 25Z"/>
      <text class="practice-bubble-text" x="505" y="76" text-anchor="middle">Stop being mean.</text>
      <rect x="173" y="350" width="159" height="34" fill="${accent}"/><rect x="631" y="350" width="108" height="34" fill="${accent}"/>
      <text class="practice-role-label" x="252.5" y="376" text-anchor="middle">TEACHER</text><text class="practice-role-label" x="685" y="376" text-anchor="middle">YOU</text>
      <rect class="practice-actor-cue" data-narration-actor="practice-teacher" x="140" y="59" width="225" height="329" rx="8" aria-hidden="true"/>
      <rect class="practice-actor-cue" data-narration-actor="practice-you" x="589" y="175" width="191" height="213" rx="8" aria-hidden="true"/>
    </svg>`;
  }
  function scene(s,interactive=false){
    if(s.visual==='teacher-practice')return `<div class="practice-illustration"><p class="practice-setup">${esc(s.displaySetup)}</p>${practiceArtwork(s)}<h2 class="practice-question">${esc(s.displayQuestion)}</h2></div>`;
    if(!s.image)return '<div class="practice-space" aria-hidden="true"></div>';
    const introduction=isCharacterIntro(s),guided=introduction||s.localId==='group';
    const visible=visibleIntroActors(s),allActors=actors(s),current=allActors.find(a=>a.id===s.point);
    // Keep the final labeled cast in its original positions. Only actors not yet
    // introduced are masked; previously tapped characters remain visible.
    const shownActors=guided?allActors.filter(a=>visible.includes(a.id)):allActors;
    const image=guided?s.pairing.intros[s.pairing.intros.length-1].image:s.image;
    const masks=guided?allActors.filter(a=>!visible.includes(a.id)).map(a=>`<span class="introduction-mask side-${a.side}" aria-hidden="true"></span>`).join(''):'';
    const tapActors=introduction?[current]:allActors;
    const buttons=interactive&&s.point?tapActors.map(a=>`<button class="point-target side-${a.side}${introduction?' introduction-target':''}${wrong&&a.id===s.point?' reveal':''}"${introduction?actorTargetStyle(s,a):''} data-point="${a.id}" aria-label="Tap ${esc(a.description)}"></button>`).join(''):'';
    const cue=introduction&&!interactive?`<span class="point-target introduction-cue"${actorTargetStyle(s,current)} aria-hidden="true"></span>`:'';
    const choiceActors=helperChoiceActors(s);
    const choiceBoxes=choiceActors.map((actor,choiceIndex)=>interactive
      ?`<button class="character-choice-target option-visible"${characterChoiceStyle(s,actor)} data-answer="${choiceIndex}" data-narration-actor="${actor.id}" aria-label="${esc(s.choices[choiceIndex])}"></button>`
      :`<span class="character-choice-cue"${characterChoiceStyle(s,actor)} aria-hidden="true"></span>`).join('');
    const spokenCues=interactive?shownActors.filter(actor=>!choiceActors.some(choice=>choice.id===actor.id)).map(actor=>`<span class="narration-actor-cue" data-narration-actor="${actor.id}"${actorTargetStyle(s,actor)} aria-hidden="true"></span>`).join(''):'';
    const alt=shownActors.map(a=>`${a.description} ${a.side==='middle'?'in the middle':'on the '+a.side}`).join('; ');
    return `<div class="picture${guided?' character-introduction':''}"><img ${interactive?'':'loading="lazy"'} src="${esc(image)}" alt="${esc(alt)}.${s.image===s.pairing.images.need?' '+esc(s.pairing.recipient.reference)+' is sad.':''}">${masks}${buttons}${choiceBoxes}${cue}${spokenCues}</div>`;
  }
  function prompt(s){return `<div class="prompt">${s.context&&!s.displayText?`<p class="referent">${esc(s.context)}</p>`:''}${s.preface?`<p class="preface">${esc(s.preface)}</p>`:''}<h2>${esc(s.displayTitle||s.displayText||s.text)}</h2></div>`;}
  function branchNote(s){if(!s.when)return '';const parent=steps.find(p=>p.id===s.when[0]);return `Only after “${s.when[1]}” to ${parent.phase.toLowerCase()}. `;}
  function choiceReaderControls(binary=false){return `<div class="option-reader-controls${binary?' binary-reader-controls':''}"><button data-read-options type="button">Read choices</button><button data-read-manually type="button">Read myself</button></div><p class="reader-status${binary?' binary-reader-status':''}" data-reader-status role="status">Listen to each choice, then pick one.</p>`;}
  function scaleOptions(s,interactive=false){
    const cards=s.choices.map((c,i)=>interactive?`<button class="rating-answer" data-answer="${i}" disabled><span class="amount-marker marker-${i}" aria-hidden="true"></span><span>${esc(c)}</span></button>`:`<div class="rating-answer option-visible"><span class="amount-marker marker-${i}" aria-hidden="true"></span><span>${esc(c)}</span></div>`).join('');
    return `<div class="rating-options">${cards}</div>${interactive?choiceReaderControls():''}`;
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
    let options=s.point?`<p class="point-instruction">Tap ${esc(actors(s).find(a=>a.id===s.point).description)}.</p>`:`<div class="answers">${(s.choices||[s.localId==='end'?'Read the full storyboard':'Continue']).map((c,i)=>`<button class="${s.choices?'spoken-choice option-visible':'continue-answer'}" data-answer="${i}">${esc(c)}</button>`).join('')}</div>${s.choices?choiceReaderControls(true):''}`;
    if(helperChoiceActors(s).length)options=choiceReaderControls(true);
    if(s.choices?.length===3)options=scaleOptions(s,true);
    const feedback=wrong?`<p class="feedback">${esc(s.reminder)}</p><div class="facilitator-controls"><span>Facilitator review</span><button id="continue-check">Continue after reminder</button></div>`:'';
    stage.dataset.choiceLocation=helperChoiceActors(s).length?'characters':'controls';
    stage.dataset.screenKind=s.visual==='teacher-practice'?'illustrated-practice':s.image?'story':'practice';
    stage.dataset.responseKind=s.choices?.length===3?'scale':s.point?'character':s.choices?'binary':'continue';
    stage.innerHTML=prompt(s)+scene(s,true)+feedback+options+childFooter(s);
    stage.querySelector('.child-replay').addEventListener('click',playChildNarration);
    stage.querySelector('.child-stop').addEventListener('click',()=>{stopNarration();optionReader?.reset();$('narration-status').textContent='Audio stopped. Replay, or read aloud.';});
    $('step-note').innerHTML=`${s.proposed?'<strong>Proposed wording · </strong>':''}${esc(branchNote(s)+(s.note||'Adapted from Marshall Study 1.'))}`;
    stage.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>respond((s.choices||['Continue'])[Number(b.dataset.answer)])));
    stage.querySelectorAll('[data-point]').forEach(b=>b.addEventListener('click',()=>respond(b.dataset.point)));
    $('continue-check')?.addEventListener('click',()=>commit(wrong));
    if(s.choices){
      const optionSpans=new Map();
      try{optionReader=window.createOptionReader(stage,s.choices,{
        clipIds:narration.screenFor(s).options,
        onClipTime(id,choiceIndex,seconds){if(steps[index].id!==s.id)return;const key=id+':'+choiceIndex;if(!optionSpans.has(key))optionSpans.set(key,spokenCueSpans(s,id,choiceIndex));showSpokenCues(optionSpans.get(key),seconds);},
        onClipClear:clearSpokenCues,
        onManualCue(choiceIndex){showSpokenCues([{start:0,end:1,optionIndex:choiceIndex,...(s.localId==='compare'?{actorId:s.pairing.helpers[choiceIndex].id}:{})}],0);},
        onManualStart:()=>{stopNarration();$('narration-status').textContent='Reading choices manually.';},
        onReadStart:()=>{stopNarration();narrationPlaying=true;gateNarration(true);$('stop-narration').disabled=false;$('narration-status').textContent='Listen to Evelyn read each choice…';syncChildControls();},
        onComplete:()=>{clearSpokenCues();narrationPlaying=false;gateNarration(false);$('stop-narration').disabled=true;$('narration-status').textContent='Choose an answer.';syncChildControls();},
        onError:()=>{clearSpokenCues();narrationPlaying=false;$('stop-narration').disabled=true;$('narration-status').textContent='Choice audio could not play. Try again or read the choices aloud.';syncChildControls();}
      });}catch(error){stage.querySelector('[data-reader-status]').textContent='Option reading could not start. Please refresh this draft.';}
    }
    if(completed)pauseTimer();else updateTimer();
    narrationStatus();if(narrationEnabled&&$('auto-narration').checked&&!$('player').hidden)playNarration();
  }
  function respond(answer){const s=steps[index];if(s.localId==='end'){if(chsBridge?.embedded){stopNarration();chsBridge.complete(session,answers);return;}showBoard(true);return;}if((s.expected&&answer!==s.expected)||(s.point&&answer!==s.point)){chsBridge?.answer(s,session,answer,{accepted:false});wrong=answer;render();return;}commit(answer);}
  function commit(answer){chsBridge?.answer(steps[index],session,answer,{accepted:true,continuedAfterReminder:!!wrong,relatedPredictionResponse:steps[index].relatedPrediction?answers[steps[index].relatedPrediction]??null:null});if(timerUsed&&started===null)incomplete=true;for(let n=index;n<steps.length;n++)delete answers[steps[n].id];answers[steps[index].id]=answer;history.push(index);wrong=null;index=Math.min(session.nextIndex(index,answers),steps.length-1);render();}
  function goTo(target){markBrowse();history.push(index);index=target;wrong=null;showBoard(false);render();stage.scrollIntoView({block:'nearest'});}
  function showBoard(value){
    if(value&&childView)setChildView(false);
    if(value){stopNarration();optionReader?.dispose();optionReader=null;if(!completed)markBrowse();}
    $('player').hidden=value;$('storyboard').hidden=!value;
    for(const [id,active]of[['story-tab',!value],['board-tab',value]]){const e=$(id);e.classList.toggle('selected',active);e.setAttribute('aria-pressed',String(active));}
    if(!value&&!optionReader&&steps[index].choices)render();
  }
  function card(s,i){return `<article class="story-card" style="--story-accent:${esc(storyAccent(s))}"><h3 class="card-heading">${String(i+1).padStart(2,'0')} · ${esc(s.phase)}${s.proposed?' · PROPOSED WORDING':''}</h3>${prompt(s)}${scene(s)}${s.choices?.length===3?scaleOptions(s):`<p class="card-options">${s.point?'Tap '+esc(actors(s).find(a=>a.id===s.point).description):s.choices?s.choices.map(esc).join(' &nbsp; / &nbsp; '):'Narration'}</p>`}${s.when||s.note||s.expected||s.point?`<p class="card-note">${esc(branchNote(s)+(s.note||''))}${s.expected?' Check answer: '+esc(s.expected)+'.':''}${s.reminder?' Reminder if needed: “'+esc(s.reminder)+'”':''}</p>`:''}</article>`;}
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
    $('timing-details').textContent=`${t.screens.min}–${t.screens.max} screens on the correct-practice path. Includes ${t.confidenceResponses} proposed prediction-confidence responses, ${t.checks} identity/recall checks, ${t.practiceResponses} practice selections, and 0–${t.strengthResponses.max} main strength follow-ups. ${recordedTiming?'The recordings and programmed pauses total '+recordedTiming.playbackMinutes.min.toFixed(1)+'–'+recordedTiming.playbackMinutes.max.toFixed(1)+' minutes. The estimate adds 3–5 seconds per response.':'Timing assumes reading aloud at 110–130 words/minute plus 3–5 seconds per selection.'} It is not measured child-session time; breaks, corrections and control/navigation time can add to it.`;
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
