const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const api = require('../session-data.js');
const bridgeSource = fs.readFileSync(path.join(__dirname, '../chs-bridge.js'), 'utf8');
const choices = {
  Yes: ['A tiny bit mean', 'A little bit mean', 'Very mean'],
  No: ['A tiny bit not mean', 'A little bit not mean', 'Very not mean']
};

let paths = 0;
for (const set of ['woman', 'man', 'family']) for (const order of ['will-first', 'has-to-first']) {
  for (const care of ['hug', 'food', 'help']) for (const seed of [0, 1]) {
    const session = api.build(set, order, null, care, seed);
    const firstSides = [];
    for (const [index, pairing] of session.pairings.entries()) {
      const recallIndex = session.steps.findIndex(step => step.pairing?.id === pairing.id && step.localId === 'recall-all');
      const firstIndex = session.nextIndex(recallIndex, {[session.steps[recallIndex].id]:'No'});
      const first = session.steps[firstIndex];
      const firstActor = pairing.helpers.find(actor => actor.id === first.ratedActor);
      firstSides.push(firstActor.side);
      assert.equal(firstActor.side, (index + seed) % 2 === 0 ? 'left' : 'right');
      function checkHelper(questionIndex, previous, position) {
        const step = session.steps[questionIndex];
        const helper = pairing.helpers.find(actor => actor.id === step.ratedActor);
        assert.equal(step.ratingPosition, position);
        assert.deepEqual(step.choices, ['Yes', 'No']);
        assert.equal(step.text, `Do you think ${helper.description} was mean for not helping ${pairing.recipient.reference}?`);
        assert.equal(step.expected, undefined);
        if (position === 2) assert.notEqual(helper.id, firstActor.id);
        for (const answer of step.choices) {
          const answers = {...previous, [step.id]:answer};
          const degreeIndex = session.nextIndex(questionIndex, answers);
          const degree = session.steps[degreeIndex];
          const branch = answer === 'Yes' ? 'mean' : 'not-mean';
          assert.equal(degree.localId, `evaluation-${helper.id}-${branch}`);
          assert.equal(degree.text, `How ${branch.replace('-', ' ')} was ${helper.description}?`);
          assert.equal(degree.ratedActor, helper.id);
          assert.equal(degree.ratingPosition, position);
          assert.deepEqual(degree.when, [step.id, answer]);
          assert.deepEqual(degree.choices, choices[answer]);
          for (const label of degree.choices) {
            const nextAnswers = {...answers, [degree.id]:label};
            const nextIndex = session.nextIndex(degreeIndex, nextAnswers);
            if (position === 1) checkHelper(nextIndex, nextAnswers, 2);
            else {
              const next = session.steps[nextIndex];
              assert.ok(next.localId === 'group' || next.localId === 'end');
              assert.notEqual(next.pairing?.id, pairing.id);
              paths++;
            }
          }
        }
      }
      checkHelper(firstIndex, {}, 1);
    }
    assert.equal(firstSides.filter(side => side === 'left').length, 3);
    assert.deepEqual(session.stats.responses, {min:42, max:42});
    assert.equal(session.stats.individualEvaluationResponses, 12);
    assert.deepEqual(session.stats.strengthResponses, {min:12, max:12});
    assert.equal(session.stats.forcedChoiceResponses, 12);
    assert.equal(session.stats.checks, 6);
    assert.ok(session.stats.words.min < session.stats.words.max);
    assert.ok(!session.steps.some(step => step.localId === 'compare' || step.localId.startsWith('compare-')));
  }
}
const all = api.build('all');
assert.deepEqual(all.stats.responses, {min:126, max:126});

const parent = {postMessage() {}};
const window = {location:{search:'?session_id=TEST'}, parent};
vm.runInNewContext(bridgeSource, {window, document:{referrer:'https://childrenhelpingscience.com/'}, URL, URLSearchParams, performance:{now:() => 100}, Date});
const binary = all.steps.find(step => step.ratedActor);
window.MarshallCHSBridge.answer(binary, all, 'No', {accepted:true});
const [record] = window.MarshallCHSBridge.snapshot();
assert.equal(record.rated_actor_id, binary.ratedActor);
assert.equal(record.rated_role, binary.pairing.helpers[0].role);
assert.equal(record.rated_side, 'left');
assert.equal(record.rating_position, 1);
assert.equal(record.response_format, 'yes-no-rating');
assert.equal(record.meanness_score, undefined);
const degrees = all.steps.filter(step => step.when?.[0] === binary.id);
for (const degree of degrees) for (const [i, value] of degree.choices.entries()) {
  window.MarshallCHSBridge.answer(degree, all, value, {accepted:true});
  const logged = window.MarshallCHSBridge.snapshot().at(-1);
  assert.equal(logged.rating_branch, degree.ratingBranch);
  assert.equal(logged.response_format, 'three-degree-rating');
  assert.equal(logged.response, value);
  assert.equal(logged.meanness_score, degree.ratingBranch === 'mean' ? 4 + i : 3 - i);
  assert.equal(logged.meanness_version, 'individual-yes-no-degree-v1');
}
console.log(`Passed ${paths} meanness paths, including both helper orders, independent ratings, and six recorded degrees.`);
