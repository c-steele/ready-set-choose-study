const assert = require('node:assert/strict');
const api = require('../session-data.js');

let paths = 0;
for (const set of ['woman', 'man', 'family']) {
  const session = api.build(set);
  for (const pairing of session.pairings) {
    const compareIndex = session.steps.findIndex(s => s.pairing?.id === pairing.id && s.localId === 'compare');
    const compare = session.steps[compareIndex];
    for (const [chosen, choice] of compare.choices.entries()) {
      const selected = pairing.helpers[chosen], other = pairing.helpers[1 - chosen];
      const answers = {[compare.id]: choice};
      const selectedIndex = session.nextIndex(compareIndex, answers);
      const selectedRating = session.steps[selectedIndex];
      assert.equal(selectedRating.localId, `compare-${selected.id}-amount`);
      for (const amount of selectedRating.choices) {
        const afterRating = {...answers, [selectedRating.id]: amount};
        // Even stale values from an earlier preview must not reopen the selected helper's rating.
        afterRating[`${pairing.id}:evaluation-${selected.id}`] = 'Mean';
        const otherIndex = session.nextIndex(selectedIndex, afterRating);
        const otherQuestion = session.steps[otherIndex];
        assert.equal(otherQuestion.localId, `evaluation-${other.id}`);
        for (const evaluation of ['Mean', 'Not Mean']) {
          const afterOther = {...afterRating, [otherQuestion.id]: evaluation};
          let next = session.nextIndex(otherIndex, afterOther);
          if (evaluation === 'Mean') {
            const otherRating = session.steps[next];
            assert.equal(otherRating.localId, `evaluation-${other.id}-amount`);
            for (const otherAmount of otherRating.choices) {
              const end = session.steps[session.nextIndex(next, {...afterOther, [otherRating.id]: otherAmount})];
              assert(end.localId === 'group' || end.localId === 'end');
              assert.notEqual(end.pairing?.id, pairing.id);
              paths++;
            }
          } else {
            const end = session.steps[next];
            assert(end.localId === 'group' || end.localId === 'end');
            assert.notEqual(end.pairing?.id, pairing.id);
            paths++;
          }
        }
      }
    }
  }
  assert.deepEqual(session.stats.responses, {min:36, max:42});
  assert.equal(session.stats.individualEvaluationResponses, 6);
  assert.deepEqual(session.stats.strengthResponses, {min:6, max:12});
  assert.equal(session.stats.forcedChoiceResponses, 18);
}
const all = api.build('all');
assert.deepEqual(all.stats.responses, {min:108, max:126});
console.log(`Passed ${paths} paths across all 18 stories: both helper choices, all face ratings, and Mean / Not Mean branches.`);
