import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'versions/chs-home-school-evelyn-v1/camera-preview.js'),'utf8');
const parentOrigin='https://childrenhelpingscience.com';
const configuredSearch=`?cameraPreviewBridge=chs-parent&cameraPreviewParentOrigin=${encodeURIComponent(parentOrigin)}`;

function eventTarget() {
  const listeners=new Map();
  const capture=options=>typeof options==='boolean'?options:!!options?.capture;
  return {
    listeners,
    addEventListener(type,fn,options) {
      const entries=listeners.get(type)||[];
      if(!entries.some(entry=>entry.fn===fn&&entry.capture===capture(options))) entries.push({fn,capture:capture(options)});
      listeners.set(type,entries);
    },
    removeEventListener(type,fn,options) {
      listeners.set(type,(listeners.get(type)||[]).filter(entry=>entry.fn!==fn||entry.capture!==capture(options)));
    },
    dispatch(type,event={}) {
      for(const entry of [...(listeners.get(type)||[])]) entry.fn({...event,type});
    },
    count(type) {return (listeners.get(type)||[]).length;},
    get listenerCount() {return [...listeners.values()].reduce((sum,entries)=>sum+entries.length,0);},
  };
}

function fixture({search=configuredSearch,embedded=true,rect={x:120,y:90,width:480,height:270},resizeObserver=true}={}) {
  const messages=[],frames=new Map(),timers=new Map(),observers=[];
  let frameId=0,timerId=0,now=0,cameraCalls=0,currentRect=rect;
  const status={textContent:'',innerHTML:'',setAttribute(){}};
  const retry=Object.assign(eventTarget(),{hidden:true,disabled:false,style:{},setAttribute(){},removeAttribute(){}});
  const classes=new Set();
  const slot={
    isConnected:true,dataset:{},style:{},
    classList:{add(...values){values.forEach(value=>classes.add(value));},remove(...values){values.forEach(value=>classes.delete(value));},contains(value){return classes.has(value);}},
    getBoundingClientRect(){return {...currentRect,left:currentRect.x,top:currentRect.y,right:currentRect.x+currentRect.width,bottom:currentRect.y+currentRect.height};},
    setAttribute(){},removeAttribute(){},
  };
  const attributes=new Map();
  const panel={
    querySelector(selector){return selector==='.ksize-camera-preview-slot'?slot:selector==='.ksize-camera-preview-status'?status:selector==='.ksize-camera-preview-retry'?retry:null;},
    setAttribute(name,value){attributes.set(name,String(value));},
    getAttribute(name){return attributes.get(name)??null;},
  };
  const parent={postMessage(message,origin){messages.push({message:JSON.parse(JSON.stringify(message)),origin});}};
  const document=Object.assign(eventTarget(),{visibilityState:'visible',contains:el=>el===slot});
  const window=Object.assign(eventTarget(),{
    location:{search,href:`https://candidate.test/index.html${search}`,origin:'https://candidate.test'},
    innerWidth:1280,innerHeight:800,document,
    requestAnimationFrame(fn){frames.set(++frameId,fn);return frameId;},
    cancelAnimationFrame(id){frames.delete(id);},
    setTimeout(fn,delay=0){timers.set(++timerId,{fn,at:now+delay});return timerId;},
    clearTimeout(id){timers.delete(id);},
  });
  window.parent=embedded?parent:window;
  document.defaultView=window;
  class ResizeObserver {
    constructor(callback){this.callback=callback;this.targets=new Set();this.disconnected=false;observers.push(this);}
    observe(target){this.targets.add(target);}
    unobserve(target){this.targets.delete(target);}
    disconnect(){this.disconnected=true;this.targets.clear();}
    emit(){this.callback([{target:slot}],this);}
  }
  const navigator={mediaDevices:{getUserMedia(){cameraCalls++;throw new Error('Unexpected camera request');}}};
  Object.assign(window,{navigator,ResizeObserver:resizeObserver?ResizeObserver:undefined,URL,URLSearchParams});
  const context=vm.createContext({window,document,navigator,ResizeObserver:resizeObserver?ResizeObserver:undefined,URL,URLSearchParams,console,Date,Math,Number,String,Object,Array,JSON,Map,Set,
    requestAnimationFrame:window.requestAnimationFrame,cancelAnimationFrame:window.cancelAnimationFrame,
    setTimeout:window.setTimeout,clearTimeout:window.clearTimeout});
  vm.runInContext(source,context,{filename:'camera-preview.js'});
  assert.equal(typeof window.WTCCameraPreview?.mount,'function','Preview helper must expose mount(slot)');
  const dispose=window.WTCCameraPreview.mount(panel);
  assert.equal(typeof dispose,'function','Preview mount must return a disposer');
  return {
    window,document,parent,messages,frames,timers,observers,status,retry,slot,panel,dispose,
    get cameraCalls(){return cameraCalls;},
    setRect(value){currentRect=value;},
    flushFrame(){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback(now));},
    advance(ms){const end=now+ms;for(let count=0;count<100;count++){const next=[...timers].filter(([,job])=>job.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;},
    respond(data,options={}){window.dispatch('message',{data,origin:options.origin??parentOrigin,source:options.source??parent});},
  };
}

// Protocol assertions below deliberately exercise only fake windows and media.
// No test can ask the browser for a camera or touch a CHS recording stream.

const text={
  pending:'Connecting your live camera view…',
  ready:'Use this live view to keep your child’s full face and shoulders in view.',
  unavailable:'The live view is unavailable. Try again to check your child’s position.',
  fullscreen:'Exit full screen to check your child’s position in the live view.',
  standalone:'A live camera view is available when you open this study through Children Helping Science. This review page does not access your camera.',
};
const shows=x=>x.messages.filter(entry=>entry.message.type==='CAMERA_PREVIEW_SHOW');
const hides=x=>x.messages.filter(entry=>entry.message.type==='CAMERA_PREVIEW_HIDE');
const statusMessage=(id,status,extra={})=>({type:'CAMERA_PREVIEW_STATUS',preview_id:id,status,...extra});

// An explicit CHS bridge requests a live host overlay without requesting media.
{
  const x=fixture();
  assert.equal(x.status.textContent,text.pending);
  x.flushFrame();
  assert.equal(shows(x).length,1);
  const {message,origin}=shows(x)[0];
  assert.equal(origin,parentOrigin);
  assert.ok(typeof message.preview_id==='string'&&message.preview_id.length>0);
  assert.deepEqual(message.rect,{x:120,y:90,width:480,height:270});
  assert.deepEqual(message.viewport,{width:1280,height:800});
  assert.equal(x.cameraCalls,0);
  assert.ok(x.observers.some(observer=>observer.targets.has(x.slot)));
  x.dispose();
}

// Only matching messages from the selected parent may update the page.
{
  const x=fixture();x.flushFrame();
  const id=shows(x)[0].message.preview_id;
  for(const [data,options] of [
    [statusMessage(id,'ready'),{origin:'https://attacker.test'}],
    [statusMessage(id,'ready'),{source:{}}],
    [statusMessage(`${id}-old`,'ready'),{}],
    [{type:'OTHER_MESSAGE',preview_id:id,status:'ready'},{}],
    [statusMessage(id,'unexpected'),{}],
    [null,{}],
    ['ready',{}],
  ]) {
    x.respond(data,options);
    assert.equal(x.status.textContent,text.pending,'Untrusted or unrelated status changed the page');
  }
  x.respond(statusMessage(id,'ready',{message:'<img src=x onerror=alert(1)>',text:'Attacker message'}));
  assert.equal(x.status.textContent,text.ready);
  assert.equal(x.status.innerHTML,'');
  assert.equal(x.retry.hidden,true);
  x.respond(statusMessage(id,'unavailable',{message:'Untrusted text'}));
  assert.equal(x.status.textContent,text.unavailable);
  assert.equal(x.retry.hidden,false);
  x.retry.dispatch('click',{preventDefault(){}});x.flushFrame();
  assert.equal(x.status.textContent,text.pending);
  assert.equal(shows(x).length,2);
  assert.equal(shows(x)[1].message.preview_id,id,'Retry must keep the active preview identity');
  assert.ok(x.messages.every(entry=>entry.origin===parentOrigin));
  x.respond(statusMessage(id,'ready'));
  assert.equal(x.status.textContent,text.ready);
  x.advance(9000);
  assert.equal(x.status.textContent,text.ready,'A pending timeout changed a ready preview');
  assert.equal(x.cameraCalls,0);x.dispose();
}

// A silent host exposes a bounded retry state; retry starts a new pending period.
{
  const x=fixture();x.flushFrame();
  x.advance(7999);assert.equal(x.status.textContent,text.pending);
  x.advance(1);assert.equal(x.status.textContent,text.unavailable);
  assert.equal(x.retry.hidden,false);
  x.retry.dispatch('click',{preventDefault(){}});x.flushFrame();
  assert.equal(x.status.textContent,text.pending);
  x.advance(8000);assert.equal(x.status.textContent,text.unavailable);
  x.dispose();
}

// Geometry events coalesce into one animation frame and preserve the session.
{
  const x=fixture();x.flushFrame();const id=shows(x)[0].message.preview_id;
  assert.ok(x.window.listeners.get('scroll')?.some(entry=>entry.capture),'Nested scrolling must be captured');
  x.setRect({x:45,y:110,width:360,height:203});
  x.window.dispatch('resize');x.window.dispatch('scroll');x.observers[0].emit();
  assert.equal(shows(x).length,1);
  assert.equal(x.frames.size,1,'Geometry events queued redundant frame callbacks');
  x.flushFrame();
  assert.equal(shows(x).length,2);
  assert.deepEqual(shows(x)[1].message.rect,{x:45,y:110,width:360,height:203});
  assert.equal(shows(x)[1].message.preview_id,id);
  x.window.innerWidth=640;x.window.innerHeight=480;x.window.dispatch('resize');x.flushFrame();
  assert.deepEqual(shows(x).at(-1).message.viewport,{width:640,height:480});
  x.dispose();
}

// A fullscreen child cannot cover itself with the host overlay. Hide while it
// is fullscreen, ignore late ready replies, and re-request the current slot on exit.
{
  const x=fixture();x.flushFrame();const id=shows(x)[0].message.preview_id;
  x.respond(statusMessage(id,'ready'));assert.equal(x.status.textContent,text.ready);
  x.document.fullscreenElement=x.slot;x.document.dispatch('fullscreenchange');
  assert.equal(hides(x).length,0);x.flushFrame();
  assert.equal(hides(x).length,1);assert.equal(hides(x)[0].message.preview_id,id);
  assert.equal(x.status.textContent,text.fullscreen);assert.equal(x.retry.hidden,true);
  x.respond(statusMessage(id,'ready'));assert.equal(x.status.textContent,text.fullscreen);
  x.advance(9000);assert.equal(x.status.textContent,text.fullscreen);
  x.document.fullscreenElement=null;x.document.dispatch('fullscreenchange');x.flushFrame();
  assert.equal(shows(x).length,2);
  const resumedId=shows(x)[1].message.preview_id;
  assert.notEqual(resumedId,id,'A hidden host preview must resume with a fresh identity');
  assert.equal(x.status.textContent,text.pending);
  x.respond(statusMessage(id,'ready'));assert.equal(x.status.textContent,text.pending,'Closed preview status must remain stale after resuming');
  x.respond(statusMessage(resumedId,'ready'));assert.equal(x.status.textContent,text.ready);
  x.dispose();assert.equal(hides(x).length,2);assert.equal(x.document.count('fullscreenchange'),0);
}

// Invalid or invisible bounds never reach the host; a later valid size can recover.
for(const rect of [
  {x:0,y:0,width:0,height:270},
  {x:0,y:0,width:480,height:-1},
  {x:NaN,y:0,width:480,height:270},
  {x:0,y:Infinity,width:480,height:270},
  {x:0,y:0,width:Infinity,height:270},
]) {
  const x=fixture({rect});x.flushFrame();assert.equal(shows(x).length,0);
  x.setRect({x:0,y:0,width:100,height:100});x.window.dispatch('resize');x.flushFrame();
  assert.equal(shows(x).length,1);x.dispose();
}

// Losing visible bounds removes an existing overlay and invalidates host replies
// until a subsequent visible geometry request, including a bad viewport size.
for(const invalidate of [
  x=>x.setRect({x:0,y:0,width:0,height:270}),
  x=>{x.window.innerWidth=NaN;},
  x=>{x.window.innerHeight=0;},
]) {
  const x=fixture();x.flushFrame();const id=shows(x)[0].message.preview_id;
  invalidate(x);x.window.dispatch('resize');x.flushFrame();
  assert.equal(shows(x).length,1);assert.equal(hides(x).length,1);
  x.respond(statusMessage(id,'ready'));assert.equal(x.status.textContent,text.pending);
  x.setRect({x:0,y:0,width:100,height:100});x.window.innerWidth=1280;x.window.innerHeight=800;
  x.window.dispatch('resize');x.flushFrame();
  const recoveredId=shows(x).at(-1).message.preview_id;
  assert.notEqual(recoveredId,id,'Temporary invisibility must not reopen a closed preview identity');
  x.respond(statusMessage(id,'ready'));assert.equal(x.status.textContent,text.pending);
  x.respond(statusMessage(recoveredId,'ready'));assert.equal(x.status.textContent,text.ready);
  x.dispose();assert.equal(hides(x).length,2);
}

// Ordinary review pages and invalid parent origins never send preview messages.
for(const configuration of [
  {search:''},
  {embedded:false},
  {search:`?cameraPreviewParentOrigin=${encodeURIComponent(parentOrigin)}`},
  {search:`?cameraPreviewBridge=other&cameraPreviewParentOrigin=${encodeURIComponent(parentOrigin)}`},
  {search:'?cameraPreviewBridge=chs-parent'},
  {search:'?cameraPreviewBridge=chs-parent&cameraPreviewParentOrigin=*'},
  {search:'?cameraPreviewBridge=chs-parent&cameraPreviewParentOrigin=null'},
  {search:'?cameraPreviewBridge=chs-parent&cameraPreviewParentOrigin=https%3A%2F%2Fattacker.test'},
  {search:'?cameraPreviewBridge=chs-parent&cameraPreviewParentOrigin=http%3A%2F%2Fchildrenhelpingscience.com'},
  {search:'?cameraPreviewBridge=chs-parent&cameraPreviewParentOrigin=https%3A%2F%2Fchildrenhelpingscience.com.attacker.test'},
  {search:'?cameraPreviewBridge=chs-parent&cameraPreviewParentOrigin=https%3A%2F%2Fchildrenhelpingscience.com%2Fpath'},
  {search:'?cameraPreviewBridge=chs-parent&cameraPreviewParentOrigin=https%3A%2F%2Fchildrenhelpingscience.com%3A444'},
  {search:'?cameraPreviewBridge=chs-parent&cameraPreviewParentOrigin=http%3A%2F%2Flocalhost.attacker.test%3A8123'},
  {search:'?cameraPreviewBridge=chs-parent&cameraPreviewParentOrigin=https%3A%2F%2Flocalhost%3A8123'},
  {search:'?cameraPreviewBridge=chs-parent&cameraPreviewParentOrigin=http%3A%2F%2F192.168.1.2%3A8123'},
]) {
  const x=fixture(configuration);x.flushFrame();x.retry.dispatch('click',{});x.window.dispatch('resize');x.flushFrame();
  assert.equal(x.status.textContent,text.standalone);
  assert.equal(x.messages.length,0);
  assert.equal(x.retry.hidden,true);
  assert.equal(x.cameraCalls,0);x.dispose();assert.equal(x.messages.length,0);
}

// A local synthetic harness is opt-in and still uses an explicit exact origin.
for(const origin of ['http://127.0.0.1:8123','http://localhost:8123']) {
  const x=fixture({search:`?cameraPreviewBridge=chs-parent&cameraPreviewParentOrigin=${encodeURIComponent(origin)}`});
  x.flushFrame();assert.equal(shows(x).length,1);assert.equal(shows(x)[0].origin,origin);
  const id=shows(x)[0].message.preview_id;
  x.respond(statusMessage(id,'ready'),{origin});assert.equal(x.status.textContent,text.ready);
  x.respond(statusMessage(id,'unavailable'),{origin:origin.replace('8123','8124')});assert.equal(x.status.textContent,text.ready);
  x.dispose();
}

// Explicit disposal and pagehide cancel all work and cannot resurrect a preview.
for(const finish of ['dispose','pagehide']) {
  const x=fixture();x.flushFrame();const id=shows(x)[0].message.preview_id;
  x.window.dispatch('resize');assert.equal(x.frames.size,1);
  if(finish==='dispose')x.dispose();else x.window.dispatch('pagehide');
  assert.equal(hides(x).length,1);
  assert.equal(hides(x)[0].message.preview_id,id);
  assert.equal(hides(x)[0].origin,parentOrigin);
  assert.equal(x.frames.size,0);
  assert.equal(x.timers.size,0);
  for(const type of ['message','resize','scroll','pagehide'])assert.equal(x.window.count(type),0,`Leaked ${type} listener`);
  assert.equal(x.document.count('fullscreenchange'),0,'Leaked fullscreenchange listener');
  assert.equal(x.retry.count('click'),0);
  assert.ok(x.observers.every(observer=>observer.disconnected));
  const count=x.messages.length,status=x.status.textContent;
  x.respond(statusMessage(id,'ready'));x.window.dispatch('resize');x.window.dispatch('scroll');
  x.observers.forEach(observer=>observer.emit());
  x.retry.dispatch('click',{});x.advance(10000);x.flushFrame();x.dispose();
  assert.equal(x.messages.length,count,'Disposed helper sent another message');
  assert.equal(x.status.textContent,status,'Disposed helper processed a late reply');
  assert.equal(x.cameraCalls,0);
}

// Leaving before the first animation frame cannot create a late host overlay.
{
  const x=fixture();assert.equal(x.frames.size,1);x.dispose();x.flushFrame();x.advance(10000);
  assert.equal(x.messages.length,0);assert.equal(x.frames.size,0);assert.equal(x.timers.size,0);
  assert.equal(x.window.listenerCount,0);assert.equal(x.document.listenerCount,0);
}

// Mounts have separate identities, so late status from a previous page is ignored.
{
  const x=fixture();x.flushFrame();const firstId=shows(x)[0].message.preview_id;x.dispose();
  const dispose=x.window.WTCCameraPreview.mount(x.panel);x.flushFrame();
  const secondId=shows(x).at(-1).message.preview_id;
  assert.notEqual(secondId,firstId);
  x.respond(statusMessage(firstId,'ready'));assert.equal(x.status.textContent,text.pending);
  x.respond(statusMessage(secondId,'ready'));assert.equal(x.status.textContent,text.ready);dispose();
}

// Resize/scroll remain usable on browsers without ResizeObserver.
{
  const x=fixture({resizeObserver:false});x.flushFrame();assert.equal(shows(x).length,1);
  x.setRect({x:100,y:10,width:300,height:169});x.window.dispatch('scroll');x.flushFrame();
  assert.equal(shows(x).length,2);x.dispose();
}

console.log('Camera preview helper verified with synthetic windows: origin/source isolation, safe status, geometry, retry, and cleanup. No camera was accessed.');
