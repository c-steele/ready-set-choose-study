const assert=require('node:assert/strict');
const api=require('../session-data.js'),manifest=require('../narration-manifest.json');
const clips=Object.fromEntries(manifest.clips.map(c=>[c.id,c]));
let checked=0;
for(const set of ['woman','man','family'])for(const order of ['will-first','has-to-first']){
 const session=api.build(set,order);
 for(const pairing of session.pairings){
  const recallIndex=session.steps.findIndex(s=>s.pairing?.id===pairing.id&&s.localId==='recall-all');
  const recall=session.steps[recallIndex];
  assert.equal(recall.expected,'No');assert.equal(recall.allowBypass,false);
  assert.equal(recall.reminder,undefined);assert.equal(manifest.screens[recall.id].reminder,null);
  // Repeat multiple errors: no cap and no unrelated story/question is replayed.
  for(let attempt=0;attempt<4;attempt++){
   let index=session.retryIndex(recallIndex);
   assert.equal(session.steps[index].localId,'outcome-summary');
   const sequence=[];
   while(index!==recallIndex){
    const step=session.steps[index];sequence.push(step.localId);
    assert.equal(step.pairing.id,pairing.id);
    assert.equal(step.outcomeVisual,true);
    const clip=clips[manifest.screens[step.id].prompt];assert(clip?.src);
    index=session.nextIndex(index,{});
   }
   assert.deepEqual(sequence,['outcome-summary','outcome']);
  }
  assert.equal(session.steps[session.nextIndex(recallIndex,{[recall.id]:'No'})].localId,'compare');
  for(const scale of session.steps.filter(s=>s.pairing?.id===pairing.id&&s.choices?.length===4)){
   const options=manifest.screens[scale.id].options;
   assert.equal(options.length,4);
   assert.deepEqual(options.map(id=>clips[id].text.toLowerCase()),scale.choices.map(c=>c.toLowerCase()));
   assert(options.every(id=>clips[id].src));
  }
  checked++;
 }
}
console.log(`Passed ${checked} stories: unlimited outcome-only recall retries, No advances, and four recorded scale options in order.`);
