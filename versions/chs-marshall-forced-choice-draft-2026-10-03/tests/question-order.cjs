const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const api = require('../session-data.js');
const manifest = require('../narration-manifest.json');
const clips = Object.fromEntries(manifest.clips.map(clip => [clip.id, clip]));
const bridgeSource = fs.readFileSync(path.join(__dirname, '../chs-bridge.js'), 'utf8');
let checkedStories = 0;
for (const set of ['woman', 'man', 'family', 'all']) for(const care of ['hug','food','help']) {
  const will = api.build(set, 'will-first', null, care), hasTo = api.build(set, 'has-to-first', null, care);
  assert.deepEqual(will.stats, hasTo.stats);
  assert.deepEqual(will.pairings, hasTo.pairings);
  assert.equal(will.steps.length, hasTo.steps.length);
  // Only the two positions swap; question text, IDs, assets, choices and branches stay attached to their measures.
  for (const before of will.steps) {
    const after = hasTo.steps.find(s => s.id === before.id);
    const {questionPosition: p1, ...a} = before;
    const {questionPosition: p2, ...b} = after;
    assert.deepEqual(a, b);
    if (p1) assert.equal(p2, 3 - p1);
  }
  for (const session of [will, hasTo]) {
    const expected = api.questionOrders.find(order => order.id === session.questionOrder).steps;
    for (const pairing of session.pairings) {
      const story = session.steps.filter(s => s.pairing?.id === pairing.id);
      const need = story.findIndex(s => s.localId === 'need');
      const early = story.slice(need + 1, need + 3);
      assert.deepEqual(early.map(s => s.localId), expected);
      assert.deepEqual(early.map(s => s.questionPosition), [1, 2]);
      assert.equal(story[need + 3].localId, 'outcome-summary');
      for (const step of early) {
        const screen = manifest.screens[step.id];
        assert.equal(clips[screen.carePrompts?.[care] || screen.prompt].text, step.text);
        assert.equal(step.care, care);
        const index = session.steps.indexOf(step);
        for (const answer of step.choices) assert.equal(session.nextIndex(index, {[step.id]:answer}), index + 1);
      }
      checkedStories++;
    }
    assert.equal(session.counterbalanceCell, `${set}:${session.care}:${session.questionOrder}`);
    assert.equal(session.firstQuestion, session.questionOrder === 'will-first' ? 'prediction' : 'obligation');
    assert(api.toMarkdown(session).includes(`Question order: ${session.questionOrderLabel}`));
    // Exercise the same message bridge used by the embedded CHS preview.
    const messages = [];
    const parent = {postMessage:(message, origin)=>messages.push({message, origin})};
    const window = {location:{search:'?session_id=TEST'}, parent};
    const context = {window, document:{referrer:'https://childrenhelpingscience.com/preview/'}, URL, URLSearchParams, performance:{now:()=>100}, Date};
    vm.runInNewContext(bridgeSource, context);
    const number = session.questionOrder === 'will-first' ? 3 : 4;
    const loggedSession = set === 'all' ? session : api.build(set, session.questionOrder, number);
    for (const step of loggedSession.steps.filter(s => s.questionPosition).slice(0, 2)) {
      window.MarshallCHSBridge.screen(step, loggedSession, loggedSession.steps.indexOf(step));
      window.MarshallCHSBridge.answer(step, loggedSession, step.choices[0], {accepted:true});
    }
    window.MarshallCHSBridge.complete(loggedSession, {});
    const records = window.MarshallCHSBridge.snapshot();
    assert.equal(records.length, 2);
    assert.deepEqual(Array.from(records, r=>r.question_position), [1,2]);
    for (const record of records) {
      assert.equal(record.question_order, session.questionOrder);
      assert.equal(record.first_question, session.firstQuestion);
      assert.equal(record.counterbalance_cell, loggedSession.counterbalanceCell);
      assert.equal(record.care_context, loggedSession.care);
      assert.equal(record.assignment_number, loggedSession.assignmentNumber);
      assert.equal(record.story_seed, loggedSession.storySeed);
      assert.deepEqual(Array.from(record.pairing_order), loggedSession.pairingOrder);
      assert.equal(record.pairing_order[record.story_index], record.pairing_id);
    }
    const completion = messages.find(m => m.message.type === 'GAME_COMPLETE').message;
    assert.equal(completion.payload.question_order, session.questionOrder);
    assert.equal(completion.payload.assignment_number, loggedSession.assignmentNumber);
    assert.deepEqual(Array.from(completion.payload.pairing_order), loggedSession.pairingOrder);
    assert.equal(completion.payload.care_context, loggedSession.care);
    assert.equal(completion.data_posted, false);
    assert(messages.every(m => m.origin === 'https://childrenhelpingscience.com'));
  }
}
assert.equal(api.build('woman').questionOrder, 'will-first');
for (const legacy of ['once','each','none']) assert.equal(api.build('woman',legacy).questionOrder,'will-first');
assert.throws(()=>api.build('woman','wrong-order'), /Unknown question order/);
for (const set of ['woman','man','family']) {
  for (const number of [1,2,3,4,5,6]) {
    const order = number % 2 ? 'will-first' : 'has-to-first';
    const conflictingOrder = number % 2 ? 'has-to-first' : 'will-first';
    const session = api.build(set, conflictingOrder, String(number));
    assert.equal(session.assignmentNumber, number);
    assert.equal(session.questionOrder, order);
    assert.equal(session.practiceMode, 'none');
    assert.equal(session.stats.practiceResponses, 0);
    assert.deepEqual(session.steps, api.build(set, order, null, session.care).steps);
  }
}
// Every complete block of six numbered children contains all six care × order cells.
const cares=['hug','food','help'];
for(const set of ['woman','man','family']){
  const sequences=new Set();
  const expected=cares.flatMap(care=>['will-first','has-to-first'].map(order=>care+':'+order)).sort();
  for(let block=0;block<64;block++){
    const cells=[];
    for(let slot=1;slot<=6;slot++){
      const number=block*6+slot;
      const assignment=api.resolveAssignment(set,'has-to-first',number,'food');
      assert.deepEqual(api.resolveAssignment(set,'will-first',String(number),'hug'),assignment);
      assert.equal(assignment.questionOrderId,number%2?'will-first':'has-to-first');
      cells.push(assignment.care+':'+assignment.questionOrderId);
    }
    sequences.add(cells.join('|'));
    assert.deepEqual(cells.sort(),expected);
  }
  assert(sequences.size>1);
}
for(const care of cares)for(const order of ['will-first','has-to-first']){
  assert.deepEqual(api.resolveAssignment('man',order,null,care),{assignmentNumber:null,questionOrderId:order,care});
}
assert.throws(()=>api.build('woman','will-first',null,'unknown'),/Unknown care condition/);
for(const set of ['woman','man','family']){
  const orders=new Set();
  for(const seed of [0,1,100,12345678,4294967295]){
    const preview=api.build(set,'will-first',null,'hug',seed);
    const numbered=api.build(set,'has-to-first',2,'food',String(seed));
    assert.deepEqual(numbered.pairingOrder,preview.pairingOrder);
    assert.equal(preview.storySeed,seed);
    assert.equal(new Set(preview.pairingOrder).size,6);
    assert.deepEqual(preview.pairings.map(pair=>pair.id),preview.pairingOrder);
    for(const step of preview.steps.filter(step=>step.pairing))assert.equal(preview.pairingOrder[step.storyIndex],step.pairing.id);
    orders.add(preview.pairingOrder.join(','));
  }
  assert.equal(orders.size,5);
}
for(const value of ['',-1,4294967296,'1e2','1.5',null])assert.throws(()=>api.parseStorySeed(value),/story seed/);
const catalogReview=api.build('all');
assert.equal(catalogReview.storySeed,null);
assert.deepEqual(catalogReview.pairingOrder,api.build('all','has-to-first',null,'food',42).pairingOrder);
assert.equal(api.build('all','has-to-first').assignmentNumber, null);
assert.throws(()=>api.build('all','will-first',1), /single pairing set/);
for (const invalid of ['', '0', '-1', '2.5', '1e3', 'x', '9007199254740992']) {
  assert.throws(()=>api.build('man','will-first',invalid), /whole assignment number/);
}
console.log(`Passed ${checkedStories} ordered stories including all-set previews: both orders, unchanged measures/audio/branches, and recorded order fields.`);
