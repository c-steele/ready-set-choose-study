import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const base='versions/chs-home-school-evelyn-v1/';
const baseline='e8b6504636a9e05e5bd3109597eed56fd1089ac6';
const load=src=>{const box={window:{}};vm.runInNewContext(String(src),box);return box.window.WTCExteriorPalette;};
const old=load(execFileSync('git',['show',baseline+':'+base+'exterior-palette.js']));
const current=load(fs.readFileSync(base+'exterior-palette.js'));
assert.equal(current.yellowCleanupVersion,'yellow-exterior-cleanup-v4-door-frames');
const width=1672,height=941,sourceFile=base+'assets/entrance/school-exterior.webp';
const sourceBytes=fs.readFileSync(sourceFile);
assert.ok(sourceBytes.equals(execFileSync('git',['show',baseline+':'+sourceFile])));
const source=await sharp(sourceBytes).ensureAlpha().raw().toBuffer();
const png=await sharp(sourceBytes).png().toBuffer();
const options={context:'SCHOOL',characterHex:'#FFD100',href:'data:image/png;base64,'+png.toString('base64')};
const factory=current.create(options);
const render=async(svg,w=width,h=height)=>sharp(Buffer.from(svg.replace('<svg',`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"`))).ensureAlpha().raw().toBuffer();
const full=await render(factory.svg()),prior=await render(old.create(options).svg());
const rgb=(buffer,x,y)=>Array.from(buffer.subarray((y*width+x)*4,(y*width+x)*4+3));
let outsideDoorPixels=0,framePixels=0,protectedPixels=0,leafChannels=0,buildingPixels=0,nonYellowSvgs=0;
for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x<716||x>=954||y<392||y>=643){
 assert.deepEqual(rgb(full,x,y),rgb(prior,x,y),`Outside door changed at ${x},${y}`);outsideDoorPixels++;
}
// Independent rectangles safely inside painted portions, spanning previously
// fragmented bright/low-chroma areas. Continuous luminance tint, no color key.
const frameAreas=[[729,444,90,9],[842,444,96,9],[729,467,9,146],[935,467,8,146],[824,463,11,68],[822,585,26,47],[747,554,71,6],[856,554,70,6],[748,621,176,14]];
for(const [left,top,w,h]of frameAreas)for(let y=top;y<top+h;y++)for(let x=left;x<left+w;x++){
 const original=rgb(source,x,y),Y=original[0]*.299+original[1]*.587+original[2]*.114;
 const expected=[.27*Y+.73*255,.58*Y+.4*255,Y-.24*255].map(v=>Math.max(0,Math.min(255,v)));
 const actual=rgb(full,x,y);actual.forEach((v,c)=>assert.ok(Math.abs(v-expected[c])<=2,`Frame ${x},${y}: ${actual} vs ${expected}`));framePixels++;
}
for(const [left,top,w,h]of [[747,461,70,87],[856,461,70,87],[747,566,70,46],[856,566,70,46],[729,403,212,28],[824,542,6,31],[842,542,7,31]])for(let y=top;y<top+h;y++)for(let x=left;x<left+w;x++){
 assert.deepEqual(rgb(full,x,y),rgb(source,x,y),`Glass/metal ${x},${y} was tinted`);protectedPixels++;
}
for(const x of [725,835]){
 const leaf=await render(factory.svg({viewBox:[x,440,110,202]}),110,202);
 for(let y=0;y<202;y++)for(let col=0;col<110;col++)for(let c=0;c<4;c++){
  assert.equal(leaf[(y*110+col)*4+c],full[((440+y)*width+x+col)*4+c],`Moving leaf differs at ${x}/${col},${y}`);leafChannels++;
 }
}
const building=await render(factory.svg({opening:{x:725,y:440,width:220,height:202}}));
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const offset=(y*width+x)*4;
 if(x>=725&&x<945&&y>=440&&y<642)assert.equal(building[offset+3],0,'Doorway opening must stay transparent');
 else for(let c=0;c<4;c++)assert.equal(building[offset+c],full[offset+c],'Building layer mismatch');
 buildingPixels++;
}
const palettes=JSON.parse(fs.readFileSync(base+'data/visual_repair_manifest.json')).palettes;
// Fresh factories/VMs keep generated ID counters synchronized.
const beforeApi=load(execFileSync('git',['show',baseline+':'+base+'exterior-palette.js']));
const afterApi=load(fs.readFileSync(base+'exterior-palette.js'));
for(const palette of Object.values(palettes))for(const context of ['HOME','SCHOOL']){
 const opts={context,characterHex:palette.characterHex,href:'source.webp'},a=beforeApi.create(opts),b=afterApi.create(opts),crop=a.context==='HOME'?{x:752,y:375,width:162,height:307}:{x:725,y:440,width:220,height:202};
 const scenes=[{}, {opening:crop}, {viewBox:[crop.x,crop.y,context==='HOME'?162:110,crop.height]}];
 if(context==='SCHOOL')scenes.push({viewBox:[835,440,110,202]});
 for(const scene of scenes){const priorSvg=a.svg(scene),newSvg=b.svg(scene);if(palette.characterHex!=='#FFD100'){assert.equal(newSvg,priorSvg);nonYellowSvgs++;}}
}
assert.equal(nonYellowSvgs,112);
console.log(JSON.stringify({status:'PASS',outsideDoorPixels,framePixels,protectedPixels,leafChannels,buildingPixels,nonYellowSvgs}));
