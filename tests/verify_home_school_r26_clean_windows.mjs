import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const base='versions/chs-home-school-evelyn-v1/',out=base+'review/r26-verification/windows/';
fs.mkdirSync(out,{recursive:true});
const load=src=>{const b={window:{}};vm.runInNewContext(String(src),b);return b.window.WTCExteriorPalette;};
const old=load(execFileSync('git',['show','535da1c:'+base+'exterior-palette.js']));
const api=load(fs.readFileSync(base+'exterior-palette.js'));
const paletteManifest=JSON.parse(fs.readFileSync(base+'data/visual_repair_manifest.json'));
const width=1672,height=941;
const palettes=Object.entries(paletteManifest.palettes);
let unchangedOutsideWindows=0,protectedSchoolPixels=0,yellowChecks=0;
const pictures=[];
for(const context of ['HOME','SCHOOL']){
 const source=await sharp(base+'assets/entrance/'+(context==='HOME'?'house':'school')+'-exterior.webp').png().toBuffer();
 const sourceRaw=await sharp(source).ensureAlpha().raw().toBuffer();
 for(const [slug,palette]of palettes){
  const opts={context,characterHex:palette.characterHex,href:'data:image/png;base64,'+source.toString('base64')};
  const render=async factory=>sharp(Buffer.from(factory.svg().replace('<svg',`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"`))).ensureAlpha().raw().toBuffer();
  const a=await render(old.create(opts)),b=await render(api.create(opts));
  if(palette.characterHex==='#FFD100'){assert.ok(a.equals(b),'Approved yellow exterior must be unchanged');yellowChecks++;}
  const regions=context==='HOME'?[[334,379,185,198],[1147,379,182,198]]:api.windowInteriors.SCHOOL;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const within=regions.some(([rx,ry,rw,rh])=>x>=rx&&x<rx+rw&&y>=ry&&y<ry+rh);
   const i=(y*width+x)*4;
   if(!within){for(let c=0;c<4;c++)assert.equal(b[i+c],a[i+c],`Non-window change ${slug}/${context}/${x},${y}`);unchangedOutsideWindows++;}
  }
  if(context==='SCHOOL')for(const [rx,ry,rw,rh]of [[4,411,77,142],[170,411,145,143],[375,411,145,142],[1153,410,147,142],[1361,412,145,141],[1593,411,75,141]]){
   for(let y=ry;y<ry+rh;y++)for(let x=rx;x<rx+rw;x++){const i=(y*width+x)*4;for(let c=0;c<4;c++)assert.equal(b[i+c],sourceRaw[i+c],`School glass/blinds altered ${slug}/${x},${y}`);protectedSchoolPixels++;}
  }
  const crop=context==='HOME'?{left:318,top:363,width:220,height:233}:{left:156,top:397,width:178,height:175};
  const img=await sharp(b,{raw:{width,height,channels:4}}).extract(crop).resize(360,360,{fit:'contain',background:'#fff'}).png().toBuffer();
  const label=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="38"><rect width="360" height="38" fill="white"/><text x="8" y="25" font-family="sans-serif" font-size="16">${context} ${palette.characterHex}</text></svg>`);
  pictures.push({img,label});
  await sharp(b,{raw:{width,height,channels:4}}).png().toFile(out+slug+'-'+context.toLowerCase()+'.png');
 }
}
const cols=6,layers=[];
for(let i=0;i<pictures.length;i++){let x=(i%cols)*360,y=Math.floor(i/cols)*398;layers.push({input:pictures[i].label,left:x,top:y},{input:pictures[i].img,left:x,top:y+38});}
await sharp({create:{width:cols*360,height:Math.ceil(pictures.length/cols)*398,channels:3,background:'#fff'}}).composite(layers).png().toFile(out+'all-window-details.png');
const result={status:'PASS',paletteCount:palettes.length,exteriors:palettes.length*2,unchangedOutsideWindows,protectedSchoolPixels,yellowChecks};
fs.writeFileSync(out+'verification.json',JSON.stringify(result,null,2)+'\n');console.log(result);
