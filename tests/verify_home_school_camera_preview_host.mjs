import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wrapperPath = path.join(root, 'chs_ready/home_school_12_cell_wrapper_draft.js');
const source = fs.readFileSync(wrapperPath, 'utf8');
const fixtures = [];
const failures = [];
let passed = 0;

function eventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, fn) {
      const entries = listeners.get(type) || new Set();
      entries.add(fn);
      listeners.set(type, entries);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    dispatch(type, event = {}) {
      for (const fn of [...(listeners.get(type) || [])]) fn({...event, type});
    },
    count(type) { return listeners.get(type)?.size || 0; },
    get listenerCount() { return [...listeners.values()].reduce((total, entries) => total + entries.size, 0); },
  };
}

function styleDeclaration() {
  const style = {setProperty(name, value) { this[name] = String(value); }};
  Object.defineProperty(style, 'cssText', {
    get() { return this._cssText || ''; },
    set(value) {
      this._cssText = value;
      for (const declaration of value.split(';')) {
        const separator = declaration.indexOf(':');
        if (separator === -1) continue;
        const name = declaration.slice(0, separator).trim().replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        this[name] = declaration.slice(separator + 1).trim();
      }
    },
  });
  return style;
}

// Execute the whole production wrapper, including its real origin/source gate.
// These objects cannot access a browser, device, network, or CHS recording.
function fixture({apiMode = 'recorder', playback = 'resolve', live = true} = {}) {
  const messages = [], videos = [], timers = new Map(), finished = [];
  const calls = {cameraRequests: 0, recorderChanges: 0, trackStops: 0, streamClones: 0, network: 0, cameraRecorderReads: 0, cameraStreamReads: 0};
  let now = 0, timerId = 0, bounds = {left: 40, top: 30, width: 960, height: 600};
  const poison = key => () => { calls[key] += 1; throw new Error(`Unexpected ${key}`); };
  const videoTrack = Object.assign(eventTarget(), {kind: 'video', readyState: live ? 'live' : 'ended', enabled: true, stop: poison('trackStops')});
  const audioTrack = Object.assign(eventTarget(), {kind: 'audio', readyState: 'live', enabled: true, stop: poison('trackStops')});
  const stream = {active: true, getVideoTracks: () => [videoTrack], getTracks: () => [videoTrack, audioTrack], clone: poison('streamClones')};
  const recorder = {stream, state: 'recording', start: poison('recorderChanges'), stop: poison('recorderChanges'), pause: poison('recorderChanges'), resume: poison('recorderChanges')};
  const sessionRecorder = {state: 'recording', start: poison('recorderChanges'), stop: poison('recorderChanges'), reset: poison('recorderChanges')};

  function makeElement(tag) {
    const attributes = new Map();
    const element = Object.assign(eventTarget(), {
      tagName: tag.toUpperCase(), style: styleDeclaration(), children: [], parentElement: null,
      setAttribute(name, value) { attributes.set(name, String(value)); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      hasAttribute(name) { return attributes.has(name); },
      appendChild(child) { child.parentElement = this; this.children.push(child); return child; },
      remove() {
        if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
        this.parentElement = null;
      },
      contains(child) { return child === this || this.children.some(item => item.contains?.(child)); },
      querySelector() { return null; },
      querySelectorAll() { return []; },
    });
    if (tag === 'video') {
      element.srcObject = null;
      element.pauseCalls = 0;
      element.playCalls = 0;
      element.pause = () => { element.pauseCalls += 1; };
      element.play = () => {
        element.playCalls += 1;
        if (playback === 'throw') throw new Error('Synthetic playback failure');
        if (playback === 'reject') return Promise.reject(new Error('Synthetic playback rejection'));
        if (playback === 'pending') return new Promise(() => {});
        return Promise.resolve();
      };
      videos.push(element);
    }
    return element;
  }

  const host = makeElement('div');
  const gameWindow = {postMessage(message, origin) { messages.push({message: JSON.parse(JSON.stringify(message)), origin}); }};
  const gameFrame = Object.assign(makeElement('iframe'), {contentWindow: gameWindow, getBoundingClientRect: () => ({...bounds})});
  host.appendChild(gameFrame);
  const document = Object.assign(eventTarget(), {
    createElement: makeElement,
    head: makeElement('head'), documentElement: makeElement('html'), fullscreenElement: null,
    getElementById(id) { return id === 'ready-set-choose-frame' ? gameFrame : null; },
    querySelectorAll() { return []; },
  });
  const window = Object.assign(eventTarget(), {
    location: {search: '', pathname: '/studies/6349/run/', origin: 'https://childrenhelpingscience.com'},
    chs: {response: {attributes: {hash_child_id: 'HOST-PREVIEW-TEST-CHILD'}}, sessionRecorder},
  });
  const pluginAPI = {initializeCameraRecorder: poison('recorderChanges'), initializeMicrophoneRecorder: poison('recorderChanges')};
  if (apiMode === 'recorder' || apiMode === 'both') pluginAPI.getCameraRecorder = () => { calls.cameraRecorderReads += 1; return recorder; };
  if (apiMode === 'fallback') pluginAPI.getCameraRecorder = () => { calls.cameraRecorderReads += 1; return null; };
  if (apiMode === 'stream' || apiMode === 'both' || apiMode === 'fallback') pluginAPI.getCameraStream = () => { calls.cameraStreamReads += 1; return stream; };
  if (apiMode === 'throws') pluginAPI.getCameraRecorder = () => { throw new Error('Synthetic missing camera'); };
  const jsPsych = {pluginAPI, data: {addProperties() {}}, run(timeline) { this.timeline = timeline; }, finishTrial(data) { finished.push(data); }};
  const navigator = {mediaDevices: {getUserMedia: poison('cameraRequests')}};
  const setTimeout = (fn, delay = 0) => { timers.set(++timerId, {fn, at: now + delay}); return timerId; };
  const clearTimeout = id => { timers.delete(id); };
  const context = vm.createContext({
    console, URLSearchParams, Math, JSON, Number, String, Object, Array, encodeURIComponent,
    window, document, navigator, setTimeout, clearTimeout, responseUuid: 'HOST-PREVIEW-TEST-RESPONSE',
    initJsPsych: () => jsPsych,
    jsPsychFullscreen: 'FullscreenPlugin', jsPsychHtmlButtonResponse: 'HtmlButtonResponsePlugin',
    chsRecord: {VideoConfigPlugin: 'VideoConfigPlugin', VideoConsentPlugin: 'VideoConsentPlugin', StartRecordPlugin: 'StartRecordPlugin', StopRecordPlugin: 'StopRecordPlugin'},
    chsSurvey: {ExitSurveyPlugin: 'ExitSurveyPlugin'},
    MutationObserver: class {observe() {}},
    fetch: poison('network'),
  });
  vm.runInContext(source, context, {filename: wrapperPath});
  context.readySetChooseGame.on_load();
  const candidateOrigin = context.HOME_SCHOOL_CANDIDATE_ORIGIN;
  const x = {
    context, window, document, host, gameFrame, gameWindow, stream, recorder, sessionRecorder,
    videoTrack, audioTrack, messages, videos, timers, finished, calls, jsPsych,
    get overlay() { return host.children.find(child => child.getAttribute('data-home-school-camera-preview') === 'true'); },
    send(data, options = {}) { window.dispatch('message', {data, origin: options.origin ?? candidateOrigin, source: options.source ?? gameWindow}); },
    show(id = 'preview-a', rect = {x: 100, y: 80, width: 400, height: 240}, viewport = {width: 1200, height: 750}) {
      this.send({type: 'CAMERA_PREVIEW_SHOW', preview_id: id, rect, viewport});
    },
    hide(id = 'preview-a') { this.send({type: 'CAMERA_PREVIEW_HIDE', preview_id: id}); },
    statuses(id) { return messages.filter(entry => !id || entry.message.preview_id === id).map(entry => entry.message.status); },
    setBounds(value) { bounds = value; },
    advance(ms) {
      const end = now + ms;
      for (let iteration = 0; iteration < 100; iteration++) {
        const job = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!job) break;
        now = job[1].at; timers.delete(job[0]); job[1].fn();
      }
      now = end;
    },
    completionPayload() {
      const cell = context.assignedCell;
      return {assigned_context: cell.assignedContext, assigned_contexts: Array.from(cell.assignedContexts), context_order: Array.from(cell.contextOrder), first_context: cell.firstContext, second_context: cell.secondContext, role_set: cell.roleSetParam, event_suffix: cell.event, assignment_cell: cell.assignmentCell};
    },
    finish() { context.readySetChooseGame.on_finish(); },
  };
  fixtures.push(x);
  return x;
}

async function test(name, fn) {
  try { await fn(); passed += 1; }
  catch (error) { failures.push({name, error}); }
}

await test('production origin/source validation and lazy allocation', () => {
  const x = fixture();
  assert.equal(x.videos.length, 0);
  assert.equal(x.overlay, undefined);
  assert.equal(x.calls.cameraRecorderReads, 0);
  const request = {type: 'CAMERA_PREVIEW_SHOW', preview_id: 'valid', rect: {x: 0, y: 0, width: 100, height: 100}, viewport: {width: 1200, height: 750}};
  for (const [data, options] of [[request, {origin: 'https://attacker.test'}], [request, {source: {}}], [null, {}], ['CAMERA_PREVIEW_SHOW', {}], [{...request, type: 'OTHER'}, {}]]) x.send(data, options);
  assert.equal(x.videos.length, 0);
  assert.equal(x.messages.length, 0);
  x.show('valid');
  const overlay = x.overlay;
  x.send({type: 'CAMERA_PREVIEW_HIDE', preview_id: 'valid'}, {origin: 'https://attacker.test'});
  x.send({type: 'CAMERA_PREVIEW_HIDE', preview_id: 'valid'}, {source: {}});
  assert.equal(x.overlay, overlay, 'Untrusted HIDE removed the preview');
});

await test('existing v7 recorder stream and v8 stream fallback', () => {
  for (const apiMode of ['recorder', 'stream', 'fallback', 'both']) {
    const x = fixture({apiMode}); x.show();
    const video = x.videos[0];
    assert.equal(video.srcObject, x.stream);
    assert.equal(video.autoplay, true); assert.equal(video.muted, true); assert.equal(video.playsInline, true);
    assert.equal(video.getAttribute('playsinline'), ''); assert.equal(video.getAttribute('aria-hidden'), 'true');
    assert.equal(video.style.transform, 'scaleX(-1)'); assert.equal(x.overlay.style.pointerEvents, 'none');
    assert.equal(x.recorder.state, 'recording'); assert.equal(x.window.chs.sessionRecorder, x.sessionRecorder);
    if (apiMode === 'both') assert.equal(x.calls.cameraStreamReads, 0, 'Existing recorder stream must take precedence');
  }
});

await test('ready status and visibility require the actual playing event', async () => {
  const x = fixture(); x.show(); const video = x.videos[0];
  await Promise.resolve();
  assert.equal(x.overlay.style.visibility, 'hidden', 'play() resolution does not prove a camera image is playing');
  assert.deepEqual(x.statuses(), []); assert.equal(x.timers.size, 1);
  video.dispatch('playing');
  assert.equal(x.overlay.style.visibility, 'visible'); assert.deepEqual(x.statuses(), ['ready']); assert.equal(x.timers.size, 0);
  assert.equal(x.messages[0].origin, x.context.HOME_SCHOOL_CANDIDATE_ORIGIN);
  assert.deepEqual(Object.keys(x.messages[0].message).sort(), ['preview_id', 'status', 'type'], 'Statuses must not transmit streams or camera/device details');
  x.advance(9000); assert.deepEqual(x.statuses(), ['ready']);
});

await test('geometry changes reuse the stream and clip the host overlay', () => {
  const x = fixture(); x.show(); const video = x.videos[0], overlay = x.overlay; video.dispatch('playing');
  assert.deepEqual([overlay.style.left, overlay.style.top, overlay.style.width, overlay.style.height], ['120px', '94px', '320px', '192px']);
  x.show('preview-a', {x: -20, y: -10, width: 200, height: 100});
  assert.equal(x.overlay, overlay); assert.equal(x.videos.length, 1); assert.equal(video.playCalls, 1);
  assert.deepEqual([overlay.style.left, overlay.style.top, overlay.style.width, overlay.style.height], ['40px', '30px', '144px', '72px']);
  assert.deepEqual([video.style.left, video.style.top, video.style.width, video.style.height], ['-16px', '-8px', '160px', '80px']);
  x.show('preview-a', {x: 1150, y: 720, width: 200, height: 100});
  assert.deepEqual([overlay.style.left, overlay.style.top, overlay.style.width, overlay.style.height], ['960px', '606px', '40px', '24px']);
  x.setBounds({left: 5, top: 10, width: 1200, height: 750}); x.window.dispatch('resize');
  assert.deepEqual([overlay.style.left, overlay.style.top, overlay.style.width, overlay.style.height], ['1155px', '730px', '50px', '30px']);
});

await test('invalid identities and nonfinite or zero geometry are rejected', () => {
  const x = fixture();
  for (const preview_id of ['', 3, null, 'x'.repeat(121)]) x.send({type: 'CAMERA_PREVIEW_SHOW', preview_id, rect: {x: 0, y: 0, width: 100, height: 100}, viewport: {width: 1200, height: 750}});
  for (const rect of [{x: NaN, y: 0, width: 100, height: 100}, {x: 0, y: Infinity, width: 100, height: 100}, {x: 0, y: 0, width: 0, height: 100}, {x: 0, y: 0, width: 100, height: -1}, {x: 0, y: 0, width: '100', height: 100}, {x: 1000001, y: 0, width: 100, height: 100}, {x: 0, y: 0, width: 100, height: 1e308}]) x.show('preview-a', rect);
  for (const viewport of [{width: 0, height: 750}, {width: 1200, height: NaN}, {width: 20001, height: 750}, {width: 1200, height: 20001}]) x.show('preview-a', undefined, viewport);
  assert.equal(x.videos.length, 0); assert.equal(x.calls.cameraRecorderReads, 0); assert.equal(x.messages.length, 0);
  x.show(); const overlay = x.overlay;
  x.show('preview-a', {x: 0, y: 0, width: -1, height: 100});
  assert.equal(x.overlay, overlay, 'Invalid update must not remove a working preview');
});

await test('missing or ended camera stream yields unavailable without camera access', () => {
  for (const options of [{apiMode: 'none'}, {apiMode: 'throws'}, {live: false}]) {
    const x = fixture(options); x.show();
    assert.deepEqual(x.statuses(), ['unavailable']); assert.equal(x.videos.length, 0); assert.equal(x.timers.size, 0);
  }
});

await test('timeout detaches preview and retry reuses existing stream', () => {
  const x = fixture({playback: 'pending'}); x.show(); const first = x.videos[0];
  const lateReady = [...first.listeners.get('playing')][0];
  x.advance(7999); assert.ok(x.overlay); assert.deepEqual(x.statuses(), []);
  x.advance(1); assert.equal(x.overlay, undefined); assert.equal(first.srcObject, null); assert.equal(first.pauseCalls, 1);
  assert.deepEqual(x.statuses(), ['unavailable']); assert.equal(first.listenerCount, 0); assert.equal(x.videoTrack.listenerCount, 0);
  x.show(); const second = x.videos[1]; assert.equal(second.srcObject, x.stream);
  lateReady(); assert.deepEqual(x.statuses(), ['unavailable'], 'A stale playing callback must not mark the retry ready');
  second.dispatch('playing'); assert.deepEqual(x.statuses(), ['unavailable', 'ready']);
});

await test('video error, playback rejection/throw, and ended track clean up safely', async () => {
  for (const failure of ['error', 'reject', 'throw', 'ended']) {
    const x = fixture({playback: ['reject', 'throw'].includes(failure) ? failure : 'resolve'}); x.show();
    const video = x.videos[0];
    if (failure === 'error') video.dispatch('error');
    if (failure === 'ended') { video.dispatch('playing'); x.videoTrack.readyState = 'ended'; x.videoTrack.dispatch('ended'); }
    await Promise.resolve();
    assert.equal(x.overlay, undefined); assert.equal(video.srcObject, null); assert.equal(video.listenerCount, 0);
    assert.equal(x.videoTrack.listenerCount, 0); assert.equal(x.timers.size, 0); assert.equal(x.statuses().at(-1), 'unavailable');
  }
});

await test('stale HIDE/SHOW and stale media callbacks cannot replace current preview', () => {
  const x = fixture(); x.show('preview-a'); const first = x.videos[0];
  const lateFailure = [...first.listeners.get('error')][0], lateReady = [...first.listeners.get('playing')][0];
  x.show('preview-b'); const current = x.overlay, currentVideo = x.videos[1];
  assert.equal(first.srcObject, null); assert.equal(first.listenerCount, 0);
  lateReady(); lateFailure(); assert.equal(x.overlay, current); assert.deepEqual(x.statuses(), []);
  x.show('preview-a'); assert.equal(x.overlay, current, 'A superseded SHOW replaced the newer preview');
  x.hide('preview-a'); assert.equal(x.overlay, current, 'A stale HIDE removed the newer preview');
  currentVideo.dispatch('playing'); assert.deepEqual(x.statuses('preview-b'), ['ready']);
  x.hide('preview-b'); x.show('preview-b'); assert.equal(x.overlay, undefined, 'A closed identity must not reopen');
  x.show('preview-c'); assert.ok(x.overlay, 'A fresh identity must recover after a temporary HIDE');
});

await test('HIDE arriving before its first SHOW prevents delayed resurrection', () => {
  const x = fixture(); x.hide('preview-old'); x.show('preview-old');
  assert.equal(x.videos.length, 0); assert.equal(x.messages.length, 0);
  x.show('preview-new'); assert.equal(x.videos.length, 1);
});

await test('iframe navigation removes overlay and media event handlers', () => {
  const x = fixture(); x.show(); const video = x.videos[0]; x.gameFrame.dispatch('load');
  assert.equal(x.overlay, undefined); assert.equal(video.srcObject, null); assert.equal(video.listenerCount, 0); assert.equal(x.timers.size, 0);
  x.show(); assert.equal(x.overlay, undefined, 'Navigation must retire the old page identity');
  x.show('after-navigation'); assert.ok(x.overlay);
});

await test('fullscreen supports enclosing parent and cleans up obscured preview', () => {
  const x = fixture(); x.show(); x.videos[0].dispatch('playing'); const overlay = x.overlay;
  x.document.fullscreenElement = x.host; x.document.dispatch('fullscreenchange');
  assert.equal(x.overlay, overlay, 'Fullscreen containing the overlay must retain it');
  x.document.fullscreenElement = x.gameFrame; x.document.dispatch('fullscreenchange');
  assert.equal(x.overlay, undefined); assert.deepEqual(x.statuses(), ['ready', 'unavailable']);
  x.document.fullscreenElement = null; x.document.dispatch('fullscreenchange'); x.hide(); x.show('after-fullscreen');
  assert.ok(x.overlay, 'A fresh resumed request must work after leaving fullscreen');
});

await test('pagehide and explicit trial finish dispose all preview listeners', () => {
  for (const reason of ['pagehide', 'finish']) {
    const x = fixture(); x.show(); const video = x.videos[0];
    if (reason === 'pagehide') x.window.dispatch('pagehide'); else x.finish();
    assert.equal(x.overlay, undefined); assert.equal(video.srcObject, null); assert.equal(video.listenerCount, 0);
    assert.equal(x.timers.size, 0); assert.equal(x.videoTrack.listenerCount, 0);
    for (const type of ['resize', 'pagehide']) assert.equal(x.window.count(type), 0);
    assert.equal(x.document.count('fullscreenchange'), 0); assert.equal(x.gameFrame.count('load'), 0);
    x.show('late-after-disposal'); assert.equal(x.videos.length, 1, 'A disposed preview recreated DOM');
    x.finish(); assert.equal(x.window.count('message'), 0); assert.equal(x.window.readySetChooseMessageHandler, null);
  }
});

await test('only validated completion tears down preview and completes the game trial', () => {
  const x = fixture(); x.show(); x.videos[0].dispatch('playing'); const overlay = x.overlay;
  const complete = {type: 'GAME_COMPLETE', payload: x.completionPayload(), session_id: 'synthetic-session'};
  x.send(complete, {origin: 'https://attacker.test'}); x.send(complete, {source: {}});
  x.send({...complete, payload: {...complete.payload, assignment_cell: 999}});
  assert.equal(x.overlay, overlay); assert.equal(x.finished.length, 0);
  x.send(complete);
  assert.equal(x.overlay, undefined); assert.equal(x.videos[0].srcObject, null); assert.equal(x.timers.size, 0);
  assert.equal(x.window.count('message'), 0); assert.equal(x.window.readySetChooseMessageHandler, null);
  assert.equal(x.finished.length, 1); assert.equal(x.finished[0].completed_game, true);
  assert.equal(x.finished[0].game_session_id, 'synthetic-session'); assert.equal(x.recorder.state, 'recording');
  x.send(complete); assert.equal(x.finished.length, 1, 'Late completion completed the trial twice');
});

await test('all scenarios preserve shared recording, devices, and stream ownership', () => {
  for (const x of fixtures) {
    x.finish();
    assert.equal(x.calls.cameraRequests, 0, 'Preview requested camera permission');
    assert.equal(x.calls.recorderChanges, 0, 'Preview started, stopped, or reinitialized the shared recorder');
    assert.equal(x.calls.trackStops, 0, 'Preview stopped a shared camera/microphone track');
    assert.equal(x.calls.streamClones, 0, 'Preview created a separate owned stream');
    assert.equal(x.calls.network, 0, 'Preview initiated a network request');
    assert.equal(x.recorder.state, 'recording'); assert.equal(x.window.chs.sessionRecorder, x.sessionRecorder);
    assert.equal(x.videoTrack.enabled, true); assert.equal(x.audioTrack.enabled, true);
    assert.equal(x.overlay, undefined); assert.equal(x.timers.size, 0); assert.equal(x.videoTrack.listenerCount, 0);
  }
});

for (const {name, error} of failures) console.error(`FAIL: ${name}\n${error.stack}`);
if (failures.length) {
  console.error(`Host camera preview: ${passed} passed; ${failures.length} failed.`);
  process.exitCode = 1;
} else console.log(`Host camera preview: ${passed} checks passed using synthetic DOM, windows, and media only.`);
