import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const out=path.dirname(fileURLToPath(import.meta.url));
const candidate=path.join(root,'versions/chs-home-school-evelyn-v1');
const test=fs.readFileSync(path.join(root,'tests/verify_home_school_entrance_rollout.mjs'),'utf8');
const helperSource=test.slice(0,test.indexOf('// Keep every original source asset covered'))
  .replace(/^import[^\n]*\n/gm,'')
  .replace('const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");',`const root=${JSON.stringify(root)};`);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const helpers=await new AsyncFunction('assert','fs','path','vm','createHash',helperSource+'\nreturn {loadRuntime};')(assert,fs,path,vm,createHash);
const index=fs.readFileSync(path.join(candidate,'index.html'),'utf8');
const setup=index.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const scripts=[...index.matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?"/g)].map(m=>m[1]).filter(s=>!s.startsWith('../../')&&s!=='app.js');
assert.ok(scripts.includes('food-artwork-repair.js')&&scripts.includes('caption-contrast.js'),'New helpers absent from actual index');
const review=fs.readFileSync(path.join(root,'review-all-versions-local.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const reviewHost={window:{location:{href:'https://c-steele.github.io/ready-set-choose-study/review-all-versions-local.html'}},document:null,URL};
vm.runInNewContext(review,reviewHost);
const directory=reviewHost.window.WHWPreviewDirectory;
const diskPath=url=>{const p=new URL(url,'https://c-steele.github.io/ready-set-choose-study/').pathname.replace(/^\/ready-set-choose-study\//,'');const result=path.resolve(root,p);assert.ok(result.startsWith(root+path.sep));return result;};
const results=[],svgDependencies=new Map();
function inspectSvg(file,source=null,depth=0) {
  assert.ok(depth<6,'SVG dependency nesting unexpectedly deep');
  const text=source||fs.readFileSync(file,'utf8');
  const hrefs=[...text.matchAll(/(?:xlink:)?href="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'));
  let embeddedSvgCount=0,embeddedRasterCount=0;const external=[];
  for(const href of hrefs) {
    if(href.startsWith('#'))continue;
    if(href.startsWith('data:image/svg+xml;base64,')) {
      embeddedSvgCount++;
      const child=inspectSvg(file,Buffer.from(href.split(',')[1],'base64').toString('utf8'),depth+1);
      embeddedSvgCount+=child.embeddedSvgCount;embeddedRasterCount+=child.embeddedRasterCount;external.push(...child.external);
    } else if(href.startsWith('data:'))embeddedRasterCount++;
    else external.push(href);
  }
  return {embeddedSvgCount,embeddedRasterCount,external};
}
for(const condition of directory.conditions) for(const profile of directory.profiles) {
  const url=new URL(directory.previewUrl(condition,profile,reviewHost.window.location.href));
  const boot={window:{location:{href:url.href}},URL,Object};vm.runInNewContext(setup,boot);
  const host=helpers.loadRuntime(url.search,boot.window.KSIZE_RUNTIME_CONFIG);
  Object.assign(host.context.window.location,{href:url.href,origin:url.origin});
  for(const script of scripts)vm.runInContext(fs.readFileSync(path.join(candidate,script),'utf8'),host.context,{filename:script});
  host.context.fetch=async url=>{const file=diskPath(url);return {ok:fs.existsSync(file),json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))};};
  let timeline,properties;
  const collection={values:()=>[],filter(){return this;},last(){return this;},push(){}};
  host.context.initJsPsych=()=>({data:{get:()=>collection,addProperties(value){properties=value;}},run(value){timeline=value;},finishTrial(){}});
  await host.api.main();
  const preload=timeline[0],preloaded=new Set(preload.audio.map(s=>s.split('?')[0]));
  const pages=timeline.filter(n=>n.data?.story_number).map(n=>({
    index:n.data.preview_index,story:n.data.story_number,kind:n.data.slide_kind,context:n.data.context,trial:n.data.trial_key,
    pairing:n.data.condition_pairing,palette:n.data.context_palette_slug,hex:n.data.context_character_hex,
    caption:n.data.facilitator_script,foodRepair:n.data.context_food_artwork_repair_version,contrast:n.data.context_caption_contrast_version,
    exteriorPalette:n.data.exterior_palette_version,entranceDurationMs:n.data.entrance_duration_ms,autoAdvancePauseMs:n.data.auto_advance_pause_ms,
    imageSources:[...n.stimulus.matchAll(/\b(?:src|href|data-source)=["']([^"']+)["']/g)].map(m=>m[1].replaceAll('&amp;','&')).filter(s=>!s.startsWith('#')),
    narrationSegments:n._ksizeNarration.map(line=>{
      const src=host.api.canonicalAudioPathForText(line.text)||line.src;
      const absolute=new URL(src,boot.window.KSIZE_RUNTIME_CONFIG.assetBaseUrl).href;
      return {...line,resolvedAudio:src,preloaded:preloaded.has(absolute.split('?')[0])};
    }),
  }));
  assert.equal(pages.length,96);
  for(const page of pages) {
    assert.ok(page.narrationSegments.every(s=>s.preloaded),`Narration missing preload: ${url.href} page${page.index}`);
    assert.equal(page.entranceDurationMs,6500);assert.equal(page.autoAdvancePauseMs,400);
    assert.equal(page.exteriorPalette,'who-helps-where-selective-exterior-palette-v3-curtain-silhouettes');
    if(condition.event.value==='FOOD'&&['story','response_choices'].includes(page.kind))assert.equal(page.foodRepair,'food-gap-and-fruit-mask-v1');
    if(['#FFD100','#81D653','#F2B13D','#A9A9A9','#4CA98F','#EB52F7'].includes(page.hex?.toUpperCase()))assert.equal(page.contrast,'pale-caption-lettering-v1');
  }
  for(const src of [...preload.images,...preload.audio])assert.ok(fs.existsSync(diskPath(src)),`Missing assigned resource ${src}`);
  for(const src of preload.images) {
    const file=diskPath(src);if(!file.endsWith('.svg')||svgDependencies.has(file))continue;
    const deps=inspectSvg(file);assert.equal(deps.external.length,0,`SVG requires unpreloaded external dependency: ${src}`);svgDependencies.set(file,deps);
  }
  const choices=pages.filter(p=>p.kind==='response_choices');
  assert.equal(choices.length,12);assert.equal(new Set(choices.map(p=>p.trial)).size,6);
  const sumBytes=srcs=>srcs.reduce((n,s)=>n+fs.statSync(diskPath(s)).size,0);
  results.push({cell:condition.cell,role:condition.role.value,event:condition.event.value,order:condition.order.value,profile,url:url.href,properties,pages,choices,
    preload:{images:preload.images.length,imageBytes:sumBytes(preload.images),audio:preload.audio.length,audioBytes:sumBytes(preload.audio),missingNarration:0}});
}
const summary={release:'chs-home-school-evelyn-v1-r26-complete-polish-1',generated:new Date().toISOString(),exactIndexScripts:scripts,
  profiles:results.length,storyPages:results.reduce((n,r)=>n+r.pages.length,0),questions:results.reduce((n,r)=>n+r.choices.length,0),
  eligibleTrialIds:[...new Set(results.flatMap(r=>r.choices.map(p=>p.trial)))].sort(),palettes:[...new Set(results.flatMap(r=>r.choices.map(p=>p.palette)))].sort(),
  svgResources:svgDependencies.size,svgExternalDependencies:0,
  preloads:results.map(r=>({cell:r.cell,profile:r.profile,...r.preload})),
  svgDetails:[...svgDependencies].map(([file,info])=>({file:path.relative(root,file),...info})),
  scope:'Executes real app with exact index configuration and all six visual helper modules; not a browser rendering or audio-listening test.'};
fs.writeFileSync(path.join(out,'condition-inventory.json'),JSON.stringify(results,null,2)+'\n');
fs.writeFileSync(path.join(out,'condition-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary,svgDetails:undefined,preloads:summary.preloads.slice(0,4)},null,2));
