const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const api = require('../session-data.js');
const manifest = require('../narration-manifest.json');
const clips = Object.fromEntries(manifest.clips.map(clip => [clip.id, clip]));
const bridgeSource = fs.readFileSync(path.join(__dirname, '../chs-bridge.js'), 'utf8');
let checkedStories = 0;
for (const set of ['woman', 'man', 'family', 'all']) {
  const will = api.build(set, 'will-first'), hasTo = api.build(set, 'has-to-first');
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
        assert.equal(clips[manifest.screens[step.id].prompt].text, step.text);
        const index = session.steps.indexOf(step);
        for (const answer of step.choices) assert.equal(session.nextIndex(index, {[step.id]:answer}), index + 1);
      }
      checkedStories++;
    }
    assert.equal(session.counterbalanceCell, `${set}:${session.questionOrder}`);
    assert.equal(session.firstQuestion, session.questionOrder === 'will-first' ? 'prediction' : 'obligation');
    assert(api.toMarkdown(session).includes(`Question order: ${session.questionOrderLabel}`));
    // Exercise the same message bridge used by the embedded CHS preview.
    const messages = [];
    const parent = {postMessage:(message, origin)=>messages.push({message, origin})};
    const window = {location:{search:'?session_id=TEST'}, parent};
    const context = {window, document:{referrer:'https://childrenhelpingscience.com/preview/'}, URL, URLSearchParams, performance:{now:()=>100}, Date};
    vm.runInNewContext(bridgeSource, context);
    for (const step of session.steps.filter(s => s.questionPosition).slice(0, 2)) {
      window.MarshallCHSBridge.screen(step, session, session.steps.indexOf(step));
      window.MarshallCHSBridge.answer(step, session, step.choices[0], {accepted:true});
    }
    window.MarshallCHSBridge.complete(session, {});
    const records = window.MarshallCHSBridge.snapshot();
    assert.equal(records.length, 2);
    assert.deepEqual(Array.from(records, r=>r.question_position), [1,2]);
    for (const record of records) {
      assert.equal(record.question_order, session.questionOrder);
      assert.equal(record.first_question, session.firstQuestion);
      assert.equal(record.counterbalance_cell, session.counterbalanceCell);
    }
    const completion = messages.find(m => m.message.type === 'GAME_COMPLETE').message;
    assert.equal(completion.payload.question_order, session.questionOrder);
    assert.equal(completion.data_posted, false);
    assert(messages.every(m => m.origin === 'https://childrenhelpingscience.com'));
  }
}
assert.equal(api.build('woman').questionOrder, 'will-first');
for (const legacy of ['once','each','none']) assert.equal(api.build('woman',legacy).questionOrder,'will-first');
assert.throws(()=>api.build('woman','wrong-order'), /Unknown question order/);
console.log(`Passed ${checkedStories} ordered stories including all-set previews: both orders, unchanged measures/audio/branches, and recorded order fields.`);
