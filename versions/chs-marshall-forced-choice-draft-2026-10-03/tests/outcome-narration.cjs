const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {build} = require('../session-data.js');
const manifest = require('../narration-manifest.json');
const clips = new Map(manifest.clips.map(clip => [clip.id, clip]));
const root = path.join(__dirname, '..');
const page = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'narration-cues.js'), 'utf8'), page);
const timings = page.window.ObligationNarrationCues.clips;
const tokens = text => text.toLowerCase().replace(/[’']/g, '').match(/[a-z]+/g);

// Captions and boxes both depend on the word timings for the recording actually played.
for (const step of build('all').steps.filter(step => step.outcomeVisual)) {
  const clip = clips.get(manifest.screens[step.id].prompt);
  const entry = timings[clip.id];
  assert.ok(entry?.alignmentValid && entry.exactNormalizedWordMatch, step.id);
  assert.equal(entry.sha256, createHash('sha256').update(fs.readFileSync(path.join(root, clip.src))).digest('hex'), clip.id);
  assert.equal(entry.sha256, clip.sha256, clip.id);
  assert.equal(entry.expectedText, clip.text, clip.id);
  const captions = step.outcomeCaptions || [step.displayText];
  assert.deepEqual(tokens(entry.words.map(word => word.word).join(' ')), tokens(captions.join(' ')), step.id);
}
