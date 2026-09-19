import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const sharp=require('/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const candidate='versions/chs-home-school-evelyn-v1/';
const baseline='87a8fba20d5ffe0e5d00e886aab476ae6a4c9e63';
const read=p=>fs.readFileSync(path.join(root,p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=p=>execFileSync('git',['show',`${baseline}:${p}`],{cwd:root,maxBuffer:64*1024*1024});
const load=source=>{const box={window:{}};vm.runInNewContext(String(source),box);return box.window.WTCExteriorPalette;};
const old=load(before(candidate+'exterior-palette.js')),api=load(read(candidate+'exterior-palette.js'));
assert.equal(api.yellowCleanupVersion,'yellow-exterior-cleanup-v3');
const palettes=JSON.parse(read(candidate+'data/visual_repair_manifest.json')).palettes;
const WIDTH=1672,HEIGHT=941;
const pixel=(data,x,y)=>Array.from(data.subarray((y*WIDTH+x)*4,(y*WIDTH+x)*4+3));
const samePixel=(left,right,x,y,label)=>assert.deepEqual(pixel(left,x,y),pixel(right,x,y),`${label} changed at ${x},${y}`);
const parse=text=>text.split(' ').map(pair=>pair.split(',').map(Number));
// Independent source-coordinate specification, not implementation exports.
const curtains=[
 '338,383 366,383 362,421 356,442 350,463 348,474 338,474',
 '338,483 348,483 345,500 347,523 351,543 357,558 353,572 338,572',
 '488,383 514,383 514,474 502,474 497,451 493,426',
 '502,483 514,483 514,572 501,572 502,541 504,517',
 '1151,383 1179,383 1175,413 1168,441 1159,474 1151,474',
 '1151,483 1159,483 1158,513 1162,543 1167,572 1151,572',
 '1298,383 1325,383 1325,474 1312,474 1305,437',
 '1312,483 1325,483 1325,572 1301,572 1307,539',
].map(parse);
const lamp=parse('356,421 387,421 396,468 345,468');
const roof=parse('0,0 1672,0 1672,316 1154,316 1154,284 836,132 518,282 518,316 0,316');
const homePanes=[[338,383,84,91],[431,383,83,91],[338,483,84,89],[431,483,83,89],[1151,383,83,91],[1244,383,81,91],[1151,483,83,89],[1244,483,81,89]];
const schoolGlass=[[0,407,85,150],[166,407,153,151],[371,407,153,151],[1149,406,155,151],[1357,408,153,149],[1589,407,83,151],[726,400,218,34],[745,459,74,81],[853,459,73,81],[745,565,74,50],[853,565,73,50]];
const inside=(x,y,polygon)=>{let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;
}return hit;};
const distance=(x,y,polygon)=>Math.min(...polygon.map(([ax,ay],i)=>{const [bx,by]=polygon[(i+1)%polygon.length],dx=bx-ax,dy=by-ay;
 const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-ax-t*dx,y-ay-t*dy);
}));
let exactNonYellowSvgs=0;
for(const palette of Object.values(palettes))for(const context of ['HOME','SCHOOL']){
 const options={context,href:'immutable-source.webp',characterHex:palette.characterHex},a=old.create(options),b=api.create(options),crop=old.doorCrops[context];
 for(const geometry of [{},{opening:crop,className:'ksize-entry-building'},{viewBox:[crop.x,crop.y,context==='HOME'?crop.width:crop.width/2,crop.height]}]){
  const prior=a.svg(geometry),current=b.svg(geometry);
  if(palette.characterHex!=='#FFD100'){assert.equal(current,prior,`Other palette changed: ${palette.characterHex}/${context}`);exactNonYellowSvgs++;}
 }
}
assert.equal(exactNonYellowSvgs,96);
// The exterior cleanup must not rebuild or alter the already reviewed v2 rooms/halls.
const roomHashes={
 'house-room':'4381d3c2d2502ae5858cc1af3dbffb338a7e30207f11fd47c4b31a438fa70ada',
 'school-room':'1b8db2e723d173e7de85f43a32fcb64be4dd8a5aa9d9d37bd9fb0e19f5ea7120',
 'house-hall':'ae00ffc7bc16be85945ae0254ad0d7d1ea4e8d2cd7e4171d4e23c94ce333e635',
 'school-hall':'79613e1049bd72acb9a8afc9489d57815bc5a6d667f469196f71b099ddcc06d8',
};
for(const [name,expected]of Object.entries(roomHashes))assert.equal(sha(read(`${candidate}assets/yellow-warmth-v2/${name}.svg`)),expected,`${name}: v2 room/hall changed during exterior cleanup`);
let glassPixels=0,roofPixels=0,clockPixels=0,homeGlassPixels=0,lampPixels=0,curtainPixels=0;
for(const context of ['HOME','SCHOOL']){
 const sourcePath=`${candidate}assets/entrance/${context==='HOME'?'house':'school'}-exterior.webp`;
 assert.ok(read(sourcePath).equals(before(sourcePath)),'Exterior source artwork changed');
 const png=await sharp(read(sourcePath)).png().toBuffer(),original=await sharp(png).ensureAlpha().raw().toBuffer();
 const svg=api.create({context,href:'data:image/png;base64,'+png.toString('base64'),characterHex:'#FFD100'}).svg();
 const result=await sharp(Buffer.from(svg.replace('<svg',`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"`))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(result.info.width,WIDTH);assert.equal(result.info.height,HEIGHT);assert.equal(result.info.channels,4);
 for(let p=0;p<WIDTH*HEIGHT;p++)assert.equal(result.data[p*4+3],255,'Exterior became transparent');
 if(context==='SCHOOL'){
  assert.doesNotMatch(svg,/windowInteriorPigment|softYellowCurtain/,'School glazing must have no recoloring layer');
  assert.equal((svg.match(/<image /g)||[]).length,2);
  for(const [left,top,width,height]of schoolGlass)for(let y=top+1;y<top+height-1;y++)for(let x=left+1;x<left+width-1;x++){
   samePixel(result.data,original,x,y,'School glazing');glassPixels++;
  }
  for(let y=1;y<316;y++)for(let x=1;x<WIDTH-1;x++)if(inside(x+.5,y+.5,roof)&&distance(x+.5,y+.5,roof)>1){samePixel(result.data,original,x,y,'School roof');roofPixels++;}
  for(let y=211;y<=293;y++)for(let x=795;x<=877;x++)if(Math.hypot(x+.5-836,y+.5-252)<41){samePixel(result.data,original,x,y,'Clock face');clockPixels++;}
 }else{
  assert.match(svg,/<feGaussianBlur stdDeviation="0.7"/);
  assert.match(svg,/result="softYellowCurtain"/);
  assert.doesNotMatch(svg,/result="windowInteriorPigment"/,'Home must not color-key entire glass panes');
  for(const [left,top,width,height]of homePanes)for(let y=top+1;y<top+height-1;y++)for(let x=left+1;x<left+width-1;x++){
   const overlaps=curtains.some(p=>inside(x+.5,y+.5,p)||distance(x+.5,y+.5,p)<=3);
   if(!overlaps){samePixel(result.data,original,x,y,'Home non-curtain glass');homeGlassPixels++;}
   if(inside(x+.5,y+.5,lamp)&&distance(x+.5,y+.5,lamp)>3){samePixel(result.data,original,x,y,'Lamp cutout');lampPixels++;}
  }
  for(const [x,y]of [[347,405],[504,405],[343,548],[508,548],[1157,405],[1318,405],[1156,550],[1318,550]]){
   const rgb=pixel(original,x,y),actual=pixel(result.data,x,y),Y=rgb[0]*.299+rgb[1]*.587+rgb[2]*.114;
   const tint=[.4*Y+.6*255,.65*Y+.3*255,Y-.2*255].map(v=>Math.max(0,Math.min(255,v))),alpha=Math.max(0,Math.min(1,(rgb[0]-rgb[1])/12));
   const expected=rgb.map((v,c)=>v+(tint[c]-v)*alpha);
   assert.ok(curtains.some(p=>inside(x+.5,y+.5,p)&&distance(x+.5,y+.5,p)>3),'Curtain probe is not safely inside silhouette');
   actual.forEach((v,c)=>assert.ok(Math.abs(v-expected[c])<=2,`Curtain tint disagrees at ${x},${y}: ${actual} vs ${expected}`));
   assert.ok(actual[0]>actual[2]+25,'Curtain remains purple or neutral');curtainPixels++;
  }
 }
}
console.log(JSON.stringify({status:'PASS',exactNonYellowSvgs,unchangedV2Rooms:4,glassPixels,roofPixels,clockPixels,homeGlassPixels,lampPixels,curtainPixels}));
