/* Numbered, reproducible assignments for the six-story live Zoom study. */
(function (root, factory) {
  'use strict';
  const api = factory(typeof module !== 'undefined' && module.exports
    ? require('./pairing-catalog.js') : root.ObligationPairings);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ZoomAssignment = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (catalog) {
  'use strict';
  const version = 'zoom-numbered-v1';
  const sets = ['woman', 'man', 'family'];
  const cares = ['hug', 'food', 'help'];
  const roleSets = new Map(catalog.roleSets.map(set => [set.id,set]));
  const pairings = new Map(catalog.pairings.map(pair => [pair.id,pair]));

  // Columns are the four original Find the Caregiver SESSION_VISUAL_PLANS.
  // Each letter identifies native artwork, including the characters' side,
  // labels and colors. All four Teacher–Classmate variants use deep purple.
  const visualVariants = {
    'MOM-TEACHER':'abdc', 'DAD-TEACHER':'abdc', 'MOM-DAD':'abdc',
    'SISTER-FRIEND':'dcab', 'BROTHER-FRIEND':'dcab', 'SISTER-BROTHER':'dcab',
    'BESTFRIEND-FRIEND':'acbd', 'MOM-KID':'acbd',
    'TEACHER-FRIEND':'cadb', 'DAD-KID':'cadb',
    'MOM-SISTER':'bdca', 'DAD-BROTHER':'bdca', 'TEACHER-KID':'bdca',
    'TEACHER-CLASSMATE':'cbad'
  };
  const williamsBase = [0,1,5,2,4,3];
  const rowSequence = [0,3,4,1,2,5];
  const side = right => right ? 'right' : 'left';

  function positiveInteger(value) {
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) value = Number(value);
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError('Enter a positive whole assignment number.');
    }
    return value;
  }

  // In each group of three slots, each set and each care context occurs once.
  // In nine slots, every set is paired with every care context. Rotating the
  // offsets also avoids reserving one serial position for the same cell.
  function cellForSlot(block, slot) {
    const group = Math.floor(slot / 3), position = slot % 3;
    return {
      set:sets[(position + group + Math.floor(block / 3) % 3) % 3],
      care:cares[(2 * position + group + block % 3) % 3]
    };
  }

  function forNumber(value) {
    const number = positiveInteger(value);
    const visit = Math.floor((number - 1) / 9);
    const {set,care} = cellForSlot(visit,(number - 1) % 9);
    const cell = sets.indexOf(set) * 3 + cares.indexOf(care);
    const ids = roleSets.get(set).pairingIds;
    const orderRow = (rowSequence[visit % 6] + sets.indexOf(set) * 2 + cares.indexOf(care)) % 6;
    // A normal 4-by-6 rotation repeats after only twelve visits. Shift one
    // visual plan in the second twelve to pair every plan with every row.
    const plan = (visit % 4 + Math.floor((visit % 24) / 12) + cell) % 4;
    const cycle = Math.floor(visit / 24) % 4;
    const rightFirst = (orderRow % 3 === 1) ^ (plan % 2) ^ (cell % 2) ^ (cycle % 2);

    const stories = williamsBase.map((offset,index) => {
      const pairingId = ids[(orderRow + offset) % 6];
      const pair = pairings.get(pairingId);
      const variant = visualVariants[pair.condition][plan];
      const nativeLeft = letter => letter === 'a' || letter === 'b';
      const mirrored = nativeLeft(variant) !== nativeLeft(pair.variant);

      // Within each original plan these masks select three of six stories.
      // For a fixed story and side, its two native variants name opposite
      // actors first. Reversing the mask with the row crosses mention order
      // with the side rated first, including for Teacher–Classmate.
      const rightMentionMask = pair.condition === 'TEACHER-CLASSMATE' ? 'bc' : 'bd';
      const mentionRight = rightFirst ^ (orderRow >= 3) ^ rightMentionMask.includes(variant) ^ (cycle >> 1);
      return {
        pairingId, variant, trialId:pair.trialId.replace(/[a-d]$/,variant), mirrored,
        firstRatingSide:side(rightFirst ^ (index % 2)),
        firstMentionSide:side(mentionRight)
      };
    });
    return {
      version,number,set,care,cellVisit:visit+1,orderRow:orderRow+1,visualPlan:plan+1,
      firstRatingSide:side(rightFirst),pairingOrder:stories.map(story=>story.pairingId),stories
    };
  }

  function forCell(set,care,value) {
    if (!roleSets.has(set) || !cares.includes(care)) throw new RangeError('Unknown role set or care context.');
    const visit = positiveInteger(value) - 1;
    for (let slot=0; slot<9; slot++) {
      const cell = cellForSlot(visit,slot);
      if (cell.set === set && cell.care === care) return forNumber(visit * 9 + slot + 1);
    }
    throw new Error('Assignment schedule is incomplete.');
  }

  return {version,forNumber,forCell};
});
