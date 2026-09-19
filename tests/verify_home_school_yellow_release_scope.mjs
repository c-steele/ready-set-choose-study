import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Yellow releases have their own gate: do not rewrite the frozen r23 design-only gate.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline='87a8fba20d5ffe0e5d00e886aab476ae6a4c9e63';
const candidate='versions/chs-home-school-evelyn-v1/';
const previousRelease='chs-home-school-evelyn-v1-r23-two-role-sets-1';
const lastVerifiedRelease='chs-home-school-evelyn-v1-r24-yellow-cleanup-1';
const release='chs-home-school-evelyn-v1-r25-yellow-door-cleanup-1';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024});
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const before=file=>git('show',`${baseline}:${file}`);
const json=file=>JSON.parse(read(file));
const plain=value=>JSON.parse(JSON.stringify(value));
const load=source=>{const sandbox={window:{}};vm.runInNewContext(source,sandbox);return sandbox.window;};

const metadata=json(candidate+'candidate.json');
const oldMetadata=JSON.parse(before(candidate+'candidate.json'));
assert.equal(metadata.candidateRelease,release);
assert.equal(metadata.yellowBackgroundVersion,'yellow-interior-cleanup-v4');
assert.equal(metadata.yellowExteriorCleanupVersion,'yellow-exterior-cleanup-v4-door-frames');
assert.equal(metadata.yellowBackgroundManifest,'data/yellow_warmth_manifest.json');
const saved=metadata.status==='published_chs_draft_saved_not_submitted';
assert.ok(saved||metadata.status==='prepared_for_chs_draft_update');
assert.equal(metadata.chsDraftConfigurationUpdated,saved);
assert.equal(metadata.revisionPendingPublication,!saved);
assert.equal(metadata.lastPublishedRelease,saved?release:lastVerifiedRelease);
assert.equal(metadata.chsDraftRelease,saved?release:lastVerifiedRelease);
assert.equal(metadata.latestChsDraftSaveReceipt,saved?'review/chs-draft-save-r25.md':'review/chs-draft-save-r24.md');
assert.equal(metadata.chsSubmissionStatus,'not_submitted');
assert.equal(metadata.activeChsStudyChanged,false);
for(const field of ['chsDraftSavedOn','publishedOn','latestRevisionOn'])
  assert.equal(metadata[field],saved?'2026-09-19':'2026-09-18');
if(saved){
  assert.equal(Object.hasOwn(metadata,'pendingReason'),false);
  const receipt=read(candidate+metadata.latestChsDraftSaveReceipt);
  assert.ok(receipt.includes(release));assert.match(receipt,/6349/);
  assert.match(receipt,/not submitted|not_submitted|not been submitted/i);
}else assert.match(metadata.pendingReason,/yellow.*cleanup.*deployment and CHS draft save pending verification/i);
const restoredMetadata=structuredClone(metadata);
for(const key of ['status','candidateRelease','revisionPendingPublication','lastPublishedRelease','chsDraftRelease',
  'chsDraftConfigurationUpdated','latestChsDraftSaveReceipt','pendingReason','yellowBackgroundManifest',
  'yellowBackgroundVersion','yellowExteriorCleanupVersion','yellowVisualRevisionScope',
  'chsDraftSavedOn','publishedOn','latestRevisionOn']){
  if(Object.hasOwn(oldMetadata,key))restoredMetadata[key]=oldMetadata[key];
  else delete restoredMetadata[key];
}
assert.deepEqual(restoredMetadata,oldMetadata,'All design, pairings, recipients, contexts, events, captions, audio and unrelated metadata must remain r23-identical');

// Compare original media and manifests against git blob hashes, not implementation masks.
// This proves that all existing palettes, foreground RGB, recorded audio and wording survive unchanged.
const entries=git('ls-tree','-r',baseline,'--','assets','audio_evelyn','audio_preferred',candidate+'assets',candidate+'data')
  .trim().split('\n').filter(Boolean);
let originalFiles=0;
for(const entry of entries){
  const match=entry.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/);assert.ok(match,entry);
  const bytes=fs.readFileSync(path.join(root,match[2]));
  const hash=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  assert.equal(hash,match[1],`Original media/manifest was changed: ${match[2]}`);originalFiles++;
}
for(const file of ['styles.css','entrance.css','window-greenery.js','help-gap-repair.js'])
  assert.equal(read(candidate+file),before(candidate+file),`Unrelated runtime helper changed: ${file}`);
for(const file of ['verify_home_school_two_role_scope.mjs','verify_home_school_clear_at_events_scope.mjs',
  'verify_home_school_visual_fixes_scope.mjs','verify_home_school_approved_openings_scope.mjs'])
  assert.equal(read('tests/'+file),before('tests/'+file),`Frozen historical scope gate changed: ${file}`);

function functionSource(source,name){
  const start=source.indexOf(`function ${name}(`),end=source.indexOf('\n}\n',start);
  assert.ok(start>=0&&end>start,`Missing ${name}`);return source.slice(start,end+2);
}
const priorApp=before(candidate+'app.js');
let app=read(candidate+'app.js').replaceAll(release,previousRelease);
const yellowApply='  window.WTCYellowBackgrounds?.applyToManifest(eventManifest);\n';
assert.equal(app.split(yellowApply).length,2,'Exactly one yellow background routing call is permitted');
app=app.replace(yellowApply,'');
const currentEntrance=functionSource(app,'entranceAssets');
const expectedEntrance=`function entranceAssets(context, paletteSlug = "") {
  const place = context === "HOME" ? "house" : "school";
  const hall = paletteSlug
    ? \`\${HOME_SCHOOL_VISUAL_REPAIR_ROOT}\${paletteSlug}/\${place}-hall.webp\`
    : \`\${HOME_SCHOOL_ENTRANCE_ROOT}\${place}-hall.webp\`;
  return {
    exterior: \`\${HOME_SCHOOL_ENTRANCE_ROOT}\${place}-exterior.webp\`,
    hall: window.WTCYellowBackgrounds?.correctedPath(hall) || hall,
  };
}`;
assert.equal(currentEntrance,expectedEntrance,'Entrance changes must be limited to yellow hall routing');
app=app.replace(currentEntrance,functionSource(priorApp,'entranceAssets'));
assert.equal(app,priorApp,'The entire participant runtime except yellow room/hall routing and the release token must remain r23-identical');
const expectedIndex=before(candidate+'index.html').replaceAll(previousRelease,release)
  .replace('<script src="help-gap-repair.js',`<script src="yellow-backgrounds.js?v=${release}"></script>\n<script src="help-gap-repair.js`);
assert.equal(read(candidate+'index.html'),expectedIndex,'Only unified cache tokens and the yellow helper script may change in the entry page');
const wrapperPath='chs_ready/home_school_12_cell_wrapper_draft.js';
const expectedWrapper=before(wrapperPath).replaceAll(previousRelease,release)
  .replace('This source targets the r23 two-role-set within-child House/School candidate.',
    'This source targets the r25 yellow-door-cleanup two-role-set within-child House/School candidate.');
assert.equal(read(wrapperPath),expectedWrapper,'CHS assignment, consent, data transport, preview controls and all study text must remain byte-identical');

const manifest=json(candidate+'data/ksize_manifest.json');
const greenery=load(read(candidate+'window-greenery.js')).WTCWindowGreenery;
const helper=load(read(candidate+'yellow-backgrounds.js')).WTCYellowBackgrounds;
const cleanup=json(candidate+'data/yellow_warmth_manifest.json');
assert.equal(helper.version,metadata.yellowBackgroundVersion);assert.equal(cleanup.version,helper.version);
assert.equal(cleanup.characterHex,'#FFD100');
greenery.applyToManifest(manifest);const priorManifest=structuredClone(manifest);
helper.applyToManifest(manifest);let yellowTrials=0;
for(let i=0;i<manifest.trials.length;i++){
  const trial=manifest.trials[i],prior=priorManifest.trials[i];
  if(prior.homeSchoolFurnished?.paletteSlug!=='mkt-skf-yellow-ffd100'){
    assert.deepEqual(trial,prior,`Non-yellow trial changed: ${trial.id}`);continue;
  }
  yellowTrials++;const restored=structuredClone(trial);
  assert.equal(restored.homeSchoolFurnished.yellowWarmthVersion,helper.version);
  for(const field of ['homeBackground','schoolBackground']){
    const scene=field==='homeBackground'?'house-room':'school-room';
    assert.equal(restored.homeSchoolFurnished[field],cleanup.scenes[scene].output);
    assert.equal(restored.homeSchoolFurnished[field+'BeforeYellowWarmth'],prior.homeSchoolFurnished[field]);
    restored.homeSchoolFurnished[field]=prior.homeSchoolFurnished[field];
    delete restored.homeSchoolFurnished[field+'BeforeYellowWarmth'];
  }
  delete restored.homeSchoolFurnished.yellowWarmthVersion;
  assert.deepEqual(restored,prior,'Yellow routing must not change characters, labels, captions, questions or audio');
}
assert.equal(yellowTrials,4);
const once=JSON.stringify(manifest);helper.applyToManifest(manifest);assert.equal(JSON.stringify(manifest),once);
const repair=json(candidate+'data/visual_repair_manifest.json');
for(const palette of Object.values(repair.palettes))for(const place of ['house','school']){
  const source=palette[place==='house'?'houseHall':'schoolHall'];
  assert.equal(helper.correctedPath(source),palette.characterHex==='#FFD100'?cleanup.scenes[place+'-hall'].output:source);
}
for(const value of [undefined,null,'','unrelated.svg','https://example.test/school-room.webp'])assert.equal(helper.correctedPath(value),value);

const oldExterior=load(before(candidate+'exterior-palette.js')).WTCExteriorPalette;
const exterior=load(read(candidate+'exterior-palette.js')).WTCExteriorPalette;
assert.equal(exterior.yellowCleanupVersion,metadata.yellowExteriorCleanupVersion);
let preservedExteriorSvgs=0;
for(const palette of Object.values(repair.palettes))for(const context of ['HOME','SCHOOL']){
  const options={context,href:'immutable-source.webp',characterHex:palette.characterHex};
  assert.deepEqual(plain(exterior.matrixForHex(palette.characterHex)),plain(oldExterior.matrixForHex(palette.characterHex)));
  const old=oldExterior.create(options),current=exterior.create(options),crop=oldExterior.doorCrops[context];
  for(const geometry of [{},{className:'ksize-entry-building',opening:crop},{viewBox:[crop.x,crop.y,context==='HOME'?crop.width:crop.width/2,crop.height]}]){
    const prior=old.svg(geometry),now=current.svg(geometry);
    if(palette.characterHex!=='#FFD100'){assert.equal(now,prior,`Non-yellow exterior changed: ${palette.characterHex}/${context}`);preservedExteriorSvgs++;}
  }
}
assert.equal(preservedExteriorSvgs,96);
console.log(JSON.stringify({status:'PASS',baseline,release,originalMediaAndManifestFilesUnchanged:originalFiles,
  yellowTrials,originalSourcePalettesUnchanged:17,nonYellowExteriorVariantsUnchanged:preservedExteriorSvgs,
  roleSets:metadata.roleSets,assignmentCells:metadata.assignmentCellCount,organizedPreviews:metadata.previewCount,
  approvedAudioCaptionsAndStudySettingsUnchanged:true,metadataState:metadata.status,chsDraftRelease:metadata.chsDraftRelease},null,2));
