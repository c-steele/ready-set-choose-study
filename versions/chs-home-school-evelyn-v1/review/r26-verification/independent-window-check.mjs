import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const base='versions/chs-home-school-evelyn-v1/',out=base+'review/r26-verification/windows/';
const palettes=Object.keys(JSON.parse(fs.readFileSync(base+'data/visual_repair_manifest.json')).palettes);
const width=1672;
// Independently chosen inset zones outside the traced curtain fabric: clear
// panes, lamp interior, vertical/horizontal mullions. Furniture/reflections
// remain exactly the original, rather than being pixel-key recolored.
const homeProtected=[
 [374,386,44,30],[399,424,18,43],[435,387,46,82],
 [361,488,56,80],[436,488,59,80],
 [1184,387,44,82],[1248,387,42,82],
 [1175,488,54,80],[1248,488,49,80],
 [357,438,24,14],[425,389,3,179],[342,477,166,3],
];
const schoolProtected=[
 [5,411,76,142],[171,412,143,139],[376,412,143,139],
 [1154,411,145,140],[1362,413,143,140],[1594,411,72,142],
 [749,463,65,72],[858,464,63,71],[749,570,64,38],[859,570,61,38],
];
let checked=0;
for(const context of ['home','school']){
 const raw=await sharp(base+'assets/entrance/'+(context==='home'?'house':'school')+'-exterior.webp').ensureAlpha().raw().toBuffer();
 for(const slug of palettes){
  const current=await sharp(out+slug+'-'+context+'.png').ensureAlpha().raw().toBuffer();
  for(const [left,top,w,h] of context==='home'?homeProtected:schoolProtected)for(let y=top;y<top+h;y++)for(let x=left;x<left+w;x++){
   const p=(y*width+x)*4;for(let c=0;c<4;c++)assert.equal(current[p+c],raw[p+c],`${slug} ${context} protected pixel ${x},${y}`);checked++;
  }
 }
}
const result={status:'PASS',palettes:palettes.length,independentlyProtectedPixels:checked,includesHomeGlass:true,includesHomeLamp:true,includesHomeMullions:true,includesSchoolBlinds:true,includesSchoolDoorGlass:true};
fs.writeFileSync(out+'independent-verification.json',JSON.stringify(result,null,2)+'\n');console.log(result);
