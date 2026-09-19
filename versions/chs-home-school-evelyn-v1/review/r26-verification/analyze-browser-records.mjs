import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const inventory=JSON.parse(fs.readFileSync(path.join(here,'../r26-complete-polish/condition-inventory.json'),'utf8'));
const key=url=>{const p=new URL(url).searchParams;return ['roleSet','event','context','variant','seed'].map(k=>p.get(k)).join('|');};
const expected=new Map(inventory.map(r=>[key(r.url),r]));
const route=url=>new URL(url,'http://127.0.0.1:8800').pathname.replace(/^\/ready-set-choose-study\//,'/');
const pale=new Set(['#FFD100','#81D653','#F2B13D','#A9A9A9','#4CA98F','#EB52F7']);
const files=fs.readdirSync(path.join(here,'browser')).filter(f=>/^run-\d+\.json$/.test(f)).sort();
const report={release:'chs-home-school-evelyn-v1-r26-complete-polish-1',generated:new Date().toISOString(),complete:false,runs:[],issues:[],totals:{runs:0,pages:0,questions:0,sceneMeasurements:0,captionColorChecks:0,captionOverflows:0,incompleteImages:0,transientLoadingNotices:0,otherErrors:0,logs:0,choiceZChecks:0},limits:['Researcher Skip traversal verifies structure and rendering records, not continuous listening or natural audio pacing.','Only exact transient “Loading the sound… Please wait.” notices are excluded from errors; they are counted separately.','Question buttons disabled before narration finishes are expected and are not treated as a failure.','Screenshot pixel review and responsive/natural-time checks are separate tasks.']};
for(const file of files) {
  const run=JSON.parse(fs.readFileSync(path.join(here,'browser',file),'utf8'));
  const match=expected.get(key(run.url)),issues=[];
  const totals={pages:run.pages.length,questions:0,sceneMeasurements:0,captionColorChecks:0,captionOverflows:0,incompleteImages:0,transientLoadingNotices:0,otherErrors:0,logs:run.logs?.length||0,choiceZChecks:0};
  const dimensions=new Set(),fonts=new Set(),steps=new Set();
  if(!match)issues.push('Condition URL does not match exact index inventory');
  if(run.pages.length!==96)issues.push(`Expected96pages, found${run.pages.length}`);
  for(const [i,p] of run.pages.entries()) {
    const e=match?.pages[i];if(!e)continue;
    if(steps.has(p.step))issues.push(`Duplicate step${p.step}`);steps.add(p.step);
    if(p.step!==i+1)issues.push(`Step${i+1} recorded as${p.step}`);
    for(const [field,a,b] of [['kind',p.kind,e.kind],['context',p.context,e.context],['story',p.story,`Story ${e.story} of 12`],['palette',p.palette,e.palette]])if(a!==b)issues.push(`Step${p.step} ${field}: ${a} != ${b}`);
    const captions=e.kind==='room_entry'?[e.caption,e.context==='HOME'?'Oh look! Here is a house.':'Oh look! Here is a school.']:[e.caption.split('\n')[0]];
    if(!captions.includes(p.caption))issues.push(`Step${p.step} caption mismatch: ${p.caption}`);
    const color=pale.has(e.hex.toUpperCase())?'rgb(23, 37, 43)':'rgb(255, 255, 255)';
    if(p.captionColor!==color)issues.push(`Step${p.step} caption color${p.captionColor} !=${color}`);
    totals.captionColorChecks++;
    if(p.captionOverflow){totals.captionOverflows++;issues.push(`Step${p.step} caption overflow`);}
    if(!p.scene)issues.push(`Step${p.step} missing scene measurements`);
    else {
      totals.sceneMeasurements++;
      dimensions.add(`${p.scene.width.toFixed(3)}x${p.scene.height.toFixed(3)}@${p.scene.left.toFixed(3)},${p.scene.top.toFixed(3)}`);
      if(Math.abs(p.scene.width*9/16-p.scene.height)>.2)issues.push(`Step${p.step} scene not16:9`);
      if(Math.abs(p.captionRect.width-p.scene.width)>.2)issues.push(`Step${p.step} caption width differs from scene`);
      if(Math.abs(p.captionRect.top-p.scene.top)>.2)issues.push(`Step${p.step} caption position differs from scene top`);
    }
    fonts.add(p.captionFont);
    const expectedRoutes=new Set(e.imageSources.filter(s=>!s.startsWith('data:')).map(route));
    for(const image of p.images||[]) {
      if(!image.complete||!image.width){totals.incompleteImages++;issues.push(`Step${p.step} image incomplete: ${image.src}`);}
      if(!expectedRoutes.has(route(image.src)))issues.push(`Step${p.step} unexpected image route: ${image.src}`);
    }
    for(const error of p.errors||[]) {
      if(error==='Loading the sound… Please wait.')totals.transientLoadingNotices++;
      else {totals.otherErrors++;issues.push(`Step${p.step} error/status: ${error}`);}
    }
    if(p.kind==='response_choices') {
      totals.questions++;
      const labels=e.pairing.split('-').map(s=>s==='BESTFRIEND'?'BEST FRIEND':s).sort();
      if(p.choices.length!==2||JSON.stringify(p.choices.map(c=>c.label).sort())!==JSON.stringify(labels))issues.push(`Step${p.step} wrong helper buttons`);
      for(const c of p.choices){totals.choiceZChecks++;if(c.z!=='6')issues.push(`Step${p.step} choice ${c.label} z=${c.z}, expected6`);}
    }
  }
  if(dimensions.size!==1)issues.push(`Scene geometry changed: ${[...dimensions].join('; ')}`);
  if(fonts.size!==1)issues.push(`Caption font changed: ${[...fonts].join('; ')}`);
  if(totals.questions!==12)issues.push(`Expected12questionpages, found${totals.questions}`);
  if(run.logs?.length)issues.push(`Browser logs: ${JSON.stringify(run.logs)}`);
  report.runs.push({run:run.run,label:run.label,cell:match?.cell,profile:match?.profile,...totals,dimensions:[...dimensions],captionFonts:[...fonts],issues});
  report.issues.push(...issues.map(issue=>({run:run.run,issue})));
  report.totals.runs++;
  for(const k of Object.keys(totals))report.totals[k]+=totals[k];
}
report.complete=report.totals.runs===48&&new Set(report.runs.map(r=>r.run)).size===48;
report.missingRuns=Array.from({length:48},(_,i)=>i+1).filter(n=>!report.runs.some(r=>r.run===n));
fs.writeFileSync(path.join(here,'browser-analysis.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({complete:report.complete,totals:report.totals,issues:report.issues,missingRuns:report.missingRuns},null,2));
