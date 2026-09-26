import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const candidate=path.join(root,'versions/chs-home-school-evelyn-v1');
const helper=fs.readFileSync(path.join(root,'tests/verify_home_school_entrance_rollout.mjs'),'utf8');
const prefix=helper.slice(0,helper.indexOf('// Keep every original source asset covered'))
  .replace(/^import[^\n]*\n/gm,'')
  .replace('const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");',`const root=${JSON.stringify(root)};`);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const h=await new AsyncFunction('assert','fs','path','vm','createHash',prefix+'\nreturn {runMain,loadRuntime,configure,localJsonResponse};')(assert,fs,path,vm,createHash);
const search='?contextStudy=1&withinChildContexts=1&context=HOME&roleSet=woman&set=role&event=HUG&variant=a&seed=media-recovery&syntheticSpeech=0';
const {timeline,host}=await h.runMain(search);
const preloader=timeline[0];
assert.equal(preloader.max_load_time,90000);
assert.equal(preloader.continue_after_error,false);
assert.match(preloader.error_message,/Try loading again/);
assert.equal(preloader.images.length,new Set(preloader.images).size);
assert.equal(preloader.audio.length,new Set(preloader.audio).size);
const preloadedAudio=new Set(preloader.audio.map(s=>s.split('?')[0]));
assert.throws(()=>vm.runInContext('mediaForAssignedNodes([{stimulus:"",_ksizeNarration:[{text:"This required recording deliberately does not exist."}]}])',host.context),/Required study recording is unavailable/);
const dependencyFixture=vm.runInContext(`mediaForAssignedNodes([{stimulus:'<svg><image href="assets/exterior.webp?v=1&amp;x=2"/><image href="#frame"/></svg><canvas data-source="assets/reveal.png"></canvas><img src="data:image/svg+xml,inline.svg"><img src="blob:local.svg">',_ksizeNarration:[]}])`,host.context);
assert.deepEqual(Array.from(dependencyFixture.images),['assets/exterior.webp?v=1&x=2','assets/reveal.png']);
for(const node of timeline.slice(1)) {
  for(const line of node._ksizeNarration||[]) {
    const src=host.api.canonicalAudioPathForText(line.text)||line.src;
    assert.ok(preloadedAudio.has(src),`Assigned audio absent: ${line.text}`);
  }
}
assert.ok([...preloadedAudio].some(s=>s.includes('whw_001_child_welcome')));
assert.ok([...preloadedAudio].some(s=>s.includes('parent_setup')));
assert.ok(preloadedAudio.has(host.api.canonicalAudioPathForText("We're all done!")));
assert.ok(preloader.images.every(s=>!s.includes('/Qualtrics/')&&!s.includes('/HELP/')&&!s.includes('/FOOD/')));
for(const src of [...preloader.images,...preloader.audio]) {
  const file=src.split('?')[0];
  const absolute=path.join(root,file);
  assert.ok(fs.existsSync(absolute),`Missing assigned preload resource: ${file}`);
}
// Full assigned timeline, not the global manifest: every condition and profile.
let configurations=0,storyNarrationSegments=0;
for(const role of ['woman','man']) for(const event of ['HUG','FOOD','HELP']) for(const context of ['HOME','SCHOOL']) for(const variant of ['a','b','c','d']) {
  const run=await h.runMain(`?contextStudy=1&withinChildContexts=1&roleSet=${role}&set=role&event=${event}&context=${context}&variant=${variant}&seed=media-${role}-${event}&syntheticSpeech=0`);
  const audios=new Set(run.timeline[0].audio.map(s=>s.split('?')[0]));
  for(const node of run.timeline.filter(n=>n.data?.story_number)) for(const line of node._ksizeNarration) {
    const src=run.host.api.canonicalAudioPathForText(line.text)||line.src;
    assert.ok(audios.has(src),`${role}/${event}/${context}/${variant}: ${line.text}`);
    storyNarrationSegments++;
  }
  const forbidden=['HUG','FOOD','HELP'].filter(e=>e!==event);
  assert.ok(run.timeline[0].images.every(s=>!forbidden.some(e=>new RegExp(`(?:^|[._/-])${e}(?:[._/-]|$)`,'i').test(s))),`Unassigned event preload in ${event}`);
  configurations++;
}

function fakeClock() {
  let now=0,id=0;const jobs=new Map();
  return {
    setTimeout(fn,delay=0){jobs.set(++id,{at:now+delay,fn});return id;},
    clearTimeout(id){jobs.delete(id);},
    async advance(ms){const end=now+ms;for(let n=0;n<1000;n++){const due=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;jobs.delete(due[0]);due[1].fn();await Promise.resolve();await Promise.resolve();}now=end;},
    get pending(){return jobs.size;},
    get now(){return now;},
  };
}
function playbackHost(host=h.loadRuntime(search)) {
  h.configure(host.api,'HOME','HUG');
  const clock=fakeClock(),clips=[],notices=[];
  let notice=null;
  const element=()=>({style:{},children:[],textContent:'',setAttribute(){},appendChild(child){this.children.push(child);},addEventListener(event,fn){this[event]=fn;},remove(){if(notice===this)notice=null;}});
  host.context.document.createElement=element;
  host.context.document.querySelector=selector=>selector==='.ksize-media-status'?notice:null;
  host.context.document.body.appendChild=el=>{notice=el;notices.push(el.children[0]?.textContent);};
  Object.assign(host.context.window,{setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout});
  Object.assign(host.context,{setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout});
  host.context.Date=class extends Date {
    constructor(...args){super(...(args.length?args:[clock.now]));}
    static now(){return clock.now;}
  };
  class FakeAudio {
    constructor(src){this.src=src;this.currentTime=0;this.duration=5;this.events={};this.loadCalls=0;this.released=false;clips.push(this);}
    addEventListener(name,fn){(this.events[name] ||= []).push(fn);}
    emit(name){for(const fn of this.events[name]||[])fn();}
    play(){return Promise.resolve();}
    pause(){this.emit('pause');}
    removeAttribute(name){if(name==='src'){this.src='';this.released=true;}}
    // Browsers can emit these events synchronously while releasing a source.
    load(){this.loadCalls++;this.emit('abort');this.emit('emptied');}
  }
  host.context.Audio=FakeAudio;
  return {...host,clock,clips,notices,get notice(){return notice;}};
}
function mountControls(host,selectors) {
  const controls=Object.fromEntries(selectors.map(selector=>{
    const classes=new Set();
    return [selector,{disabled:false,textContent:'',dataset:{},attributes:{},
      classList:{add(...names){names.forEach(name=>classes.add(name));},remove(...names){names.forEach(name=>classes.delete(name));},contains(name){return classes.has(name);}},
      setAttribute(name,value){this.attributes[name]=String(value);},
      addEventListener(type,fn){this[type]=fn;},focus(){},
    }];
  }));
  const query=host.context.document.querySelector;
  host.context.document.querySelector=selector=>controls[selector]||query(selector);
  return controls;
}
const caption='Oh look! Here is a house.';
// Never-starting playback resolves false after two bounded tries, not forever.
{
  const x=playbackHost();let resolved;
  x.api.audio.play(caption).then(v=>{resolved=v;});
  await x.clock.advance(10000);assert.equal(x.clips.length,2);
  assert.equal(resolved,undefined);
  await x.clock.advance(10000);assert.equal(resolved,false);
  assert.match(x.notices.at(-1),/could not play/);
  assert.equal(x.clock.pending,0);
}
// Stall recovery restarts at the beginning and succeeds only at ended.
{
  const x=playbackHost();let resolved,starts=0,ends=0;
  x.api.audio.play(caption,{onStart(){starts++;},onEnd(){ends++;}}).then(v=>{resolved=v;});
  x.clips[0].emit('playing');x.clips[0].currentTime=1;x.clips[0].emit('timeupdate');x.clips[0].emit('stalled');
  await x.clock.advance(7000);assert.equal(x.clips.length,2);assert.equal(x.clips[1].currentTime,0);
  assert.equal(resolved,undefined);x.clips[1].emit('playing');x.clips[1].emit('ended');await Promise.resolve();
  assert.equal(resolved,true);assert.equal(starts,2);assert.equal(ends,2);assert.equal(x.clock.pending,0);
}
// Repeated browser "playing" events are not evidence that the recording is
// advancing. They must not stretch a silent stall to the total playback cap.
{
  const x=playbackHost();let resolved,starts=0;
  x.api.audio.play(caption,{onStart(){starts++;}}).then(value=>{resolved=value;});
  for(let attempt=0;attempt<2;attempt++) {
    const clip=x.clips[attempt];clip.emit('playing');
    for(let second=0;second<6;second++) {
      await x.clock.advance(1000);clip.emit('playing');clip.emit('timeupdate');
    }
    assert.equal(x.clips.length,attempt+1);
    await x.clock.advance(1000);
    assert.ok(clip.released,'Timed-out playback kept its network source');
    assert.ok(clip.loadCalls>0,'Timed-out playback did not release its media request');
  }
  assert.equal(x.clips.length,2);assert.equal(starts,2);
  assert.equal(resolved,false);assert.equal(x.clock.pending,0);
}
// A known short recording cannot remain alive indefinitely on tiny genuine
// progress. Later metadata must not move its already established deadline.
{
  const x=playbackHost();const result=x.api.audio.play(caption);
  const clip=x.clips[0];clip.emit('playing');
  for(let step=1;step<=3;step++) {
    await x.clock.advance(6000);clip.currentTime=step;clip.emit('timeupdate');
    clip.duration=300;clip.emit('durationchange');
  }
  await x.clock.advance(1999);assert.equal(x.clips.length,1);
  await x.clock.advance(1);assert.equal(x.clips.length,2);
  x.api.audio.stop();assert.equal(await result,false);assert.equal(x.clock.pending,0);
}
// Brief start/buffering transitions do not flash a warning. Repeated stalled
// events do not postpone the recovery deadline; real progress clears notices.
{
  const x=playbackHost();const result=x.api.audio.play(caption);
  await x.clock.advance(100);x.clips[0].emit('playing');x.clips[0].emit('waiting');
  await x.clock.advance(1799);assert.equal(x.notices.length,0);
  x.clips[0].currentTime=1;x.clips[0].emit('timeupdate');await x.clock.advance(2);assert.equal(x.notices.length,0);
  x.clips[0].emit('waiting');await x.clock.advance(1800);assert.match(x.notices.at(-1),/Loading the sound/);
  x.clips[0].emit('stalled');await x.clock.advance(5200);assert.equal(x.clips.length,2);
  x.api.audio.stop();assert.equal(await result,false);
}
// Skip/replay cancellation resolves pending narration and cannot leak callbacks.
{
  const x=playbackHost();let resolved,ended=0;
  x.api.audio.play(caption,{onEnd(){ended++;}}).then(v=>{resolved=v;});
  x.api.audio.stop();await Promise.resolve();assert.equal(resolved,false);
  assert.equal(x.clips[0].src,'');assert.equal(x.clips[0].released,true);
  assert.ok(x.clips[0].loadCalls>0);assert.equal(x.api.audio.current,null);
  x.clips[0].emit('ended');await x.clock.advance(50000);
  assert.equal(ended,0);assert.equal(x.clips.length,1);assert.equal(x.clock.pending,0);
}
// Replacing a clip releases the previous request before starting the new one;
// late failure or progress events from that released element are harmless.
{
  const x=playbackHost();let starts=0,ends=0;
  const first=x.api.audio.play(caption);
  const second=x.api.audio.play(caption,{onStart(){starts++;},onEnd(){ends++;}});
  assert.equal(await first,false);assert.equal(x.clips.length,2);
  const [old,current]=x.clips;
  assert.ok(old.released);assert.ok(old.loadCalls>0);assert.ok(current.src);
  old.emit('error');old.emit('playing');old.emit('ended');
  assert.equal(starts,0);assert.equal(ends,0);assert.equal(x.clips.length,2);
  current.emit('playing');current.emit('ended');assert.equal(await second,true);
  assert.equal(starts,1);assert.equal(ends,1);assert.equal(x.clock.pending,0);
}
// Network error is retried once, and the final notice uses the node-level replay.
{
  const x=playbackHost();let resolved,retries=0;
  x.api.audio.play(caption,{onRetry(){retries++;}}).then(v=>{resolved=v;});
  x.clips[0].emit('error');assert.equal(x.clips.length,2);
  x.clips[1].emit('error');await Promise.resolve();assert.equal(resolved,false);
  x.notice.children[1].click();assert.equal(retries,1);assert.equal(x.clock.pending,0);
}
// Exercise the actual bundled preload plugin, including a cold never-completing
// request: it must show the retry screen without advancing into the study.
{
  const clock=fakeClock();let advanced=0,cancelled=0;
  const ctx=vm.createContext({jsPsychModule:{ParameterType:{BOOL:0,TIMELINE:1,STRING:2,HTML_STRING:3,INT:4,FUNCTION:5}}});
  vm.runInContext(fs.readFileSync(path.join(root,'vendor/jspsych/plugin-preload-1.1.3.js'),'utf8'),ctx);
  const display={innerHTML:'',querySelector:()=>null};
  const plugin=new ctx.jsPsychPreload({getSafeModeStatus:()=>false,utils:{unique:a=>[...new Set(a)]},finishTrial(){advanced++;},pluginAPI:{setTimeout:clock.setTimeout,clearAllTimeouts(){},cancelPreloads(){cancelled++;},preloadImages(){},preloadAudio(){}}});
  plugin.trial(display,{...preloader,auto_preload:false,trials:[],video:[],show_detailed_errors:false,on_error:null,on_success:null});
  await clock.advance(90000);assert.equal(advanced,0);assert.ok(cancelled>0);assert.match(display.innerHTML,/Try loading again/);
}
// Required JSON requests have bounded retries as well, before preload begins.
{
  const x=h.loadRuntime(search),clock=fakeClock();let calls=0,result;
  Object.assign(x.context.window,{setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout});
  x.context.fetch=(_url,{signal})=>{calls++;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('timeout'))));};
  vm.runInContext('fetchStudyJson("required.json")',x.context).catch(e=>{result=e.message;});
  await clock.advance(15000);await clock.advance(15000);await Promise.resolve();
  assert.equal(calls,2);assert.equal(result,'timeout');assert.equal(clock.pending,0);
}
const parentPages=[
  ['parent_welcome','.ksize-parent-welcome-audio'],
  ['parent_quick_checks','.ksize-quick-checks-audio'],
  ['camera_setup','.ksize-camera-audio'],
  ['child_handoff','.ksize-handoff-audio'],
];
// Leaving any parent page before its delayed autoplay must invalidate both
// the timer and the old page's Listen/toggle event handlers.
for(const [kind,listenSelector] of parentPages) {
  const run=await h.runMain(search),x=playbackHost(run.host);
  const controls=mountControls(x,[listenSelector,'.ksize-parent-narration-toggle','.ksize-parent-transcript']);
  const page=run.timeline.find(node=>node.data?.slide_kind===kind);
  assert.match(page.stimulus,/ksize-parent-narration-toggle/);
  assert.match(page.stimulus,/ksize-parent-transcript/);
  page.on_load();await x.clock.advance(499);assert.equal(x.clips.length,0);
  page.on_finish({});await x.clock.advance(1000);
  await controls[listenSelector].click();controls['.ksize-parent-narration-toggle'].click();
  assert.equal(x.clips.length,0,`${kind}: departed page restarted its recording`);
  assert.equal(vm.runInContext('parentNarrationEnabled',x.context),true);
  assert.equal(x.clock.pending,0);
}
// Parent narration-off persists between setup pages, opens the transcript,
// and still permits an explicit Listen. Turning it back on starts one clip.
{
  const run=await h.runMain(search),x=playbackHost(run.host);
  const controls=mountControls(x,['.ksize-parent-welcome-audio','.ksize-parent-narration-toggle','.ksize-parent-transcript']);
  const welcome=run.timeline.find(node=>node.data?.slide_kind==='parent_welcome');
  welcome.on_load();controls['.ksize-parent-narration-toggle'].click();
  assert.equal(controls['.ksize-parent-transcript'].open,true);
  assert.equal(controls['.ksize-parent-narration-toggle'].attributes['aria-pressed'],'true');
  await x.clock.advance(1000);assert.equal(x.clips.length,0);
  const manual=controls['.ksize-parent-welcome-audio'].click();
  assert.equal(x.clips.length,1);assert.equal(vm.runInContext('parentNarrationEnabled',x.context),false);
  controls['.ksize-parent-narration-toggle'].click();assert.equal(await manual,false);
  assert.ok(x.clips[0].released);assert.equal(x.clips.length,2);
  assert.equal(controls['.ksize-parent-narration-toggle'].attributes['aria-pressed'],'false');
  controls['.ksize-parent-narration-toggle'].click();assert.ok(x.clips[1].released);
  const data={};welcome.on_finish(data);assert.equal(data.parent_instruction_narration_enabled,false);
  const nextControls=mountControls(x,['.ksize-quick-checks-audio','.ksize-parent-narration-toggle','.ksize-parent-transcript']);
  const next=run.timeline.find(node=>node.data?.slide_kind==='parent_quick_checks');
  next.on_load();await x.clock.advance(1000);
  assert.equal(x.clips.length,2);assert.equal(nextControls['.ksize-parent-transcript'].open,true);
  next.on_finish({});assert.equal(x.clock.pending,0);
}
// The parent preference must not silence child questions/options or unlock
// choices before every recording ends successfully, including a failed replay.
{
  const run=await h.runMain(search),x=playbackHost(run.host);
  const parentControls=mountControls(x,['.ksize-parent-welcome-audio','.ksize-parent-narration-toggle','.ksize-parent-transcript']);
  const parent=run.timeline.find(node=>node.data?.slide_kind==='parent_welcome');
  parent.on_load();parentControls['.ksize-parent-narration-toggle'].click();parent.on_finish({});
  const controls=mountControls(x,['.ksize-audio-btn','#test-choice-a','#test-choice-b']);
  const choices=[controls['#test-choice-a'],controls['#test-choice-b']];
  choices.forEach((choice,index)=>{choice.dataset.choiceIndex=String(index);});
  x.context.document.querySelectorAll=selector=>selector==='.ksize-char-btn'?choices:[];
  const page=run.timeline.find(node=>node.data?.slide_kind==='response_choices');
  const segments=page._ksizeNarration.length;assert.ok(segments>=2);
  page.on_load();assert.ok(choices.every(choice=>choice.disabled));
  await x.clock.advance(250);assert.equal(x.clips.length,1);
  for(let index=0;index<segments;index++) {
    assert.ok(choices.every(choice=>choice.disabled),`Choice enabled before child segment ${index+1}`);
    assert.ok(x.clips[index],`Child segment ${index+1}/${segments} did not start; ${x.clips.length} clips were constructed`);
    x.clips[index].emit('playing');x.clips[index].emit('ended');
    await new Promise(setImmediate);
  }
  assert.equal(x.clips.length,segments);assert.ok(choices.every(choice=>!choice.disabled));
  controls['.ksize-audio-btn'].click();await new Promise(setImmediate);
  assert.ok(choices.every(choice=>choice.disabled));assert.equal(x.clips.length,segments+1);
  x.clips.at(-1).emit('error');x.clips.at(-1).emit('error');
  await new Promise(setImmediate);
  assert.ok(choices.every(choice=>choice.disabled),'Failed child replay unlocked responses');
  const data={};page.on_finish(data);assert.equal(data.audio_playback_or_load_failure,true);
  assert.equal(vm.runInContext('parentNarrationEnabled',x.context),false);assert.equal(x.clock.pending,0);
}
// Assent is disabled in this release's timeline. Exercise the same attached
// child-page narration lifecycle directly, with the parent preference off.
{
  const x=playbackHost();const controls=mountControls(x,['.ksize-assent-audio']);
  const page=vm.runInContext(`(() => {
    parentNarrationEnabled = false;
    const node = {};
    attachPageNarration(node, {src: CHILD_ASSENT_AUDIO, text: CHILD_ASSENT_TEXT, listenSelector: '.ksize-assent-audio'});
    return node;
  })()`,x.context);
  page.on_load();await x.clock.advance(500);assert.equal(x.clips.length,1);
  page.on_finish({});assert.ok(x.clips[0].released);
  await controls['.ksize-assent-audio'].click();await x.clock.advance(1000);
  assert.equal(x.clips.length,1);assert.equal(x.clock.pending,0);
}
// A post-preload character-image failure cannot hang revealReady or poison its
// cache: a second explicit try must construct a fresh image request.
{
  const x=h.loadRuntime(search),clock=fakeClock(),images=[];let result;
  Object.assign(x.context.window,{setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout});
  x.context.Image=class {constructor(){images.push(this);}set src(value){this.source=value;}};
  const canvas={dataset:{source:'assets/reveal-test.png',revealedSlots:'center'}};
  x.api.prepareIntroReveal(canvas).catch(e=>{result=e.message;});
  await clock.advance(10000);await Promise.resolve();assert.match(result,/timed out/);
  const retry=x.api.prepareIntroReveal(canvas).catch(e=>e.message);
  assert.equal(images.length,2);images[1].onerror();assert.match(await retry,/could not load/);assert.equal(clock.pending,0);
}
// Cancelled narration is not a load failure, and finishing the closing page
// cannot restart its remaining audio after the pending promise settles.
{
  const run=await h.runMain(search),clock=fakeClock();let resolveNarration;
  Object.assign(run.host.context.window,{setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout});
  run.host.api.audio.playFile=()=>new Promise(resolve=>{resolveNarration=resolve;});
  const page=run.timeline.find(n=>n.data?.slide_kind==='exterior');
  const before=vm.runInContext('audioPlaybackFailureCount',run.host.context);
  page.on_load();await clock.advance(250);page.on_finish({});resolveNarration(false);await Promise.resolve();await Promise.resolve();
  assert.equal(vm.runInContext('audioPlaybackFailureCount',run.host.context),before);
  const finished={};page.on_finish(finished);assert.equal(finished.audio_playback_or_load_failure,false);
}
// Skip before autoplay begins still handles an eager character-image rejection.
{
  const run=await h.runMain(search),clock=fakeClock(),images=[],unhandled=[];
  Object.assign(run.host.context.window,{setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout});
  run.host.context.Image=class {constructor(){images.push(this);}set src(value){this.source=value;}};
  const canvas={dataset:{source:'assets/skip-before-reveal.png',revealedSlots:'center'}};
  run.host.context.document.querySelector=selector=>selector==='.ksize-character-reveal'?canvas:null;
  const listener=error=>unhandled.push(error);process.on('unhandledRejection',listener);
  try {
    const intro=run.timeline.find(n=>n.data?.slide_kind==='intro');
    intro.on_load();intro.on_finish({});images[0].onerror();await new Promise(setImmediate);
    assert.equal(unhandled.length,0);
  } finally {process.off('unhandledRejection',listener);}
}
{
  const run=await h.runMain(search),clock=fakeClock(),calls=[];let resolveNarration;
  Object.assign(run.host.context.window,{setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout});
  const grownup={addEventListener(type,fn){this[type]=fn;}},panel={},next={addEventListener(){},focus(){}};
  run.host.context.document.querySelector=selector=>({'.ksize-grownup-here-btn':grownup,'.ksize-final-grownup-panel':panel,'.ksize-final-grownup-continue':next})[selector]||null;
  run.host.api.audio.playFile=(src,text)=>{calls.push(text);return new Promise(resolve=>{resolveNarration=resolve;});};
  const done=run.timeline.find(n=>n.data?.slide_kind==='study_complete');
  done.on_load();await clock.advance(350);assert.equal(calls.length,1);
  grownup.click();done.on_finish();resolveNarration(false);await clock.advance(500);
  assert.equal(calls.length,1,'Cancelled ending sequence started a stale clip');
}
{
  const run=await h.runMain(search),clock=fakeClock();let resolveNarration,glowAdds=0;
  Object.assign(run.host.context.window,{setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout});
  const replay={classList:{remove(){}},addEventListener(type,fn){this[type]=fn;}},start={classList:{add(){glowAdds++;}},addEventListener(){}};
  run.host.context.document.querySelector=selector=>({'.ksize-start-audio':replay,'.ksize-next-btn':start})[selector]||null;
  run.host.api.audio.playFile=()=>new Promise(resolve=>{resolveNarration=resolve;});
  const welcome=run.timeline.find(n=>n.data?.slide_kind==='child_welcome');
  welcome.on_load();const replayPromise=replay.click();welcome.on_finish();resolveNarration(false);await replayPromise;await clock.advance(5000);
  assert.equal(glowAdds,0,'Cancelled welcome replay restarted the next-page cue');
}
const bytes=files=>files.reduce((sum,s)=>sum+fs.statSync(path.join(root,s.split('?')[0])).size,0);
console.log(JSON.stringify({status:'PASS',configurations,storyNarrationSegments,preloadImages:preloader.images.length,preloadAudio:preloader.audio.length,preloadImageBytes:bytes(preloader.images),preloadAudioBytes:bytes(preloader.audio),startTimeout:'two attempts, 10s each',stallTimeout:'two attempts, 7s without progress',startupTimeout:'90s, fail closed with retry',browserColdCacheCheck:'required separately through CUA'},null,2));
