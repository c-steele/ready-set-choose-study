const assert = require('node:assert/strict');
const {forNumber, forCell} = require('../zoom-assignment.js');
const {pairings} = require('../pairing-catalog.js');
const {buildZoomStory} = require('../session-data.js');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');

const page = {window:{}};
vm.runInNewContext(readFileSync(join(__dirname,'../zoom-slide-visuals.js'),'utf8'),page);
const {numberedPairing} = page.window.ZoomSlideVisuals;
const byId = new Map(pairings.map(pair => [pair.id,pair]));
const cells = new Map();

for (let block = 0; block < 24; block++) {
  const inBlock = new Set();
  for (let slot = 1; slot <= 9; slot++) {
    const plan = forNumber(block*9 + slot);
    assert.deepEqual(forCell(plan.set,plan.care,plan.cellVisit),plan);
    const cell = plan.set + '/' + plan.care;
    inBlock.add(cell);
    if (!cells.has(cell)) cells.set(cell,[]);
    cells.get(cell).push(plan);
    const colors = new Set();
    for (const [i,layout] of plan.stories.entries()) {
      const pair = numberedPairing(byId.get(layout.pairingId),layout.trialId);
      colors.add(pair.visualHex);
      const story = buildZoomStory(pair,i,plan.care,layout);
      const question = story.find(s => s.localId === 'obligation-compare');
      const [left,right] = pair.helpers;
      assert.equal(left.side,'left');
      assert.equal(right.side,'right');
      assert.deepEqual(Array.from(question.optionActors),[left.id,right.id]);
      const names = layout.firstMentionSide === 'left' ? [left,right] : [right,left];
      assert.equal(question.choiceQuestion.toLowerCase(),names.map(h=>h.description).join(' or ')+'?');
      const firstRating = story.find(s => s.ratedActor);
      assert.equal(firstRating.ratedActor,(layout.firstRatingSide === 'left' ? left : right).id);
    }
    assert.equal(colors.size,6);
    for (const key of ['firstRatingSide','firstMentionSide']) {
      assert.equal(plan.stories.filter(s => s[key] === 'left').length,3);
    }
  }
  assert.equal(inBlock.size,9);
}

for (const plans of cells.values()) {
  const counts = key => {
    const tally = new Map();
    for (const p of plans) for (const [i,s] of p.stories.entries()) {
      const k = key(p,i,s);
      tally.set(k,(tally.get(k) || 0) + 1);
    }
    return Array.from(tally.values());
  };
  const positions = counts((p,i,s)=>[p.visualPlan,i,s.pairingId].join('/'));
  assert.equal(positions.length,4*6*6);
  assert(positions.every(n=>n===1));
  const orders = counts((p,i,s)=>[s.pairingId,s.mirrored,s.firstMentionSide,s.firstRatingSide].join('/'));
  assert.equal(orders.length,6*8);
  assert(orders.every(n=>n===3));
}
console.log('Verified all nine cells, native colors, story positions, choices and helper orders across 216 Zoom assignments.');
