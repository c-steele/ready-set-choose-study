// Independent rendered-pixel checks for the current yellow interior repair.
// Probe coordinates describe visible objects, not exported production masks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const sharp=require('/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const C='versions/chs-home-school-evelyn-v1/';
const baseline='87a8fba20d5ffe0e5d00e886aab476ae6a4c9e63';
const read=p=>fs.readFileSync(path.join(root,p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(read(C+'data/yellow_warmth_manifest.json'));
assert.equal(manifest.version,'yellow-interior-cleanup-v4');
assert.equal(manifest.characterHex,'#FFD100');
const counts={neutralPixels:0,wallGapPixels:0,wallRepairProbes:0,foliagePixels:0,floorPixels:0,bushPixels:0,goldProbes:0,immutableSourceFiles:0};
const decode=async bytes=>sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
function checkRegion(actual,expected,width,[left,top,w,h],label,key,predicate=()=>true){
  let checked=0;
  for(let y=top;y<top+h;y++)for(let x=left;x<left+w;x++){
    const i=(y*width+x)*3;
    if(!predicate(x,y,i))continue;
    for(let c=0;c<3;c++)assert.equal(actual[i+c],expected[i+c],`${label}: ${x},${y} channel ${c}`);
    checked++;
  }
  assert.ok(checked>0,label+' had no pixels');counts[key]+=checked;
}
for(const name of ['school-room','house-room']){
  const scene=manifest.scenes[name];
  assert.equal(scene.width,1536);assert.equal(scene.height,1024);
  assert.equal(scene.output,C+'assets/yellow-interior-cleanup-v4/'+name+'.svg');
  const bytes=read(scene.source),refBytes=read(scene.reference),svg=read(scene.output);
  assert.equal(sha(bytes),scene.sourceSha256,name+' source manifest hash');
  assert.equal(sha(svg),scene.outputSha256,name+' output manifest hash');
  for(const p of [scene.source,scene.reference]){
    const prior=execFileSync('git',['show',`${baseline}:${p}`],{cwd:root,maxBuffer:64*1024*1024});
    assert.ok(read(p).equals(prior),p+' original source was modified');counts.immutableSourceFiles++;
  }
  const [original,reference,result]=await Promise.all([decode(bytes),decode(refBytes),decode(svg)]);
  assert.deepEqual(result.info,original.info,name+' source geometry changed');
  const w=result.info.width,a=result.data,s=original.data,g=reference.data;
  // The complete lower floor and rug have no theme recoloring or restoration.
  // At school the left baseboard runs diagonally down to y668; it is themed.
  const floorTop=name==='school-room'?675:650;
  checkRegion(a,s,w,[0,floorTop,1536,1024-floorTop],name+' floor/rug','floorPixels');
  const plants=name==='school-room'
    ? [[34,322,83,69],[168,318,78,77],[1230,300,80,63]]
    : [[0,416,141,144],[1183,257,121,76],[1328,100,94,165],[1390,510,88,77]];
  for(const box of plants)checkRegion(a,s,w,box,name+' natural foliage','foliagePixels',(_x,_y,i)=>s[i+1]>s[i]+4&&s[i+1]>s[i+2]+12);
  if(name==='school-room'){
    // Board face + metal border, blinds and furniture cores are exactly the
    // immutable gray artwork (not merely "less yellow"). No gold accent is
    // included in these independent rectangles.
    const neutrals=[
      [520,105,538,279],[501,104,13,282],[1064,104,13,282],
      [520,84,530,11],[500,410,570,5],[2,62,138,154],
      [174,464,247,126],[599,528,3,96],[615,548,5,61],
      [756,527,4,94],[875,526,6,93],[1023,547,5,62],[1039,527,5,94],
      [653,516,51,36],[940,516,55,36],
    ];
    for(const box of neutrals)checkRegion(a,g,w,box,'School neutral object','neutralPixels');
    // Removing only the two restoration uses provides the independently
    // observable yellow-wall result. Gaps between traced legs must retain it.
    const baseSvg=svg.toString().replace('<use href="#neutral-source" mask="url(#neutral)"/>','')
      .replace('<use href="#neutral-source" filter="url(#gold)" mask="url(#accents)"/>','');
    const base=(await decode(Buffer.from(baseSvg))).data;
    for(const box of [[624,547,6,10],[738,547,7,13],[660,585,41,10],[891,547,13,14],[944,585,35,10],[1014,548,3,7]])
      checkRegion(a,base,w,box,'Wall/baseboard between furniture','wallGapPixels');
    // The tiny source-artifact triangles above both desk corners must be wall,
    // not gray furniture. Check their independent adjacent-source samples;
    // desktop/metal probes above still prohibit recoloring the furniture.
    for(const [x,y,offset]of [[590,495,-30],[590,500,-30],[597,495,-30],[1051,495,30],[1055,499,30],[1046,495,30]]){
      const i=(y*w+x)*3,j=(y*w+x+offset)*3,[r,g,b]=s.subarray(j,j+3);
      const expected=[2*r+.3*g-1.3*b,.4*r+1.1*g-.5*b,-.35*r+1.35*b].map(v=>Math.max(0,Math.min(255,v)));
      for(let c=0;c<3;c++)assert.ok(Math.abs(a[i+c]-expected[c])<=2,`Wall corner at ${x},${y}: ${Array.from(a.subarray(i,i+3))} vs ${expected}`);
      counts.wallRepairProbes++;
    }
    checkRegion(a,s,w,[0,384,34,39],'Previously repaired bush','bushPixels');
    // Full window pot, desk pot and pencil cup: independently apply the exact
    // luminance-to-gold formula to the gray source at top AND bottom probes.
    for(const [x,y]of [[71,400],[77,416],[94,423],[188,403],[203,424],[217,430],[401,408],[410,432],[425,428]]){
      const i=(y*w+x)*3,Y=.299*g[i]+.587*g[i+1]+.114*g[i+2];
      const expected=[.27*Y+.73*255,.58*Y+.40*255,Y-.24*255].map(v=>Math.max(0,Math.min(255,v)));
      for(let c=0;c<3;c++)assert.ok(Math.abs(a[i+c]-expected[c])<=2,`Complete gold accent at ${x},${y}: ${Array.from(a.subarray(i,i+3))} vs ${expected}`);
      assert.ok(a[i]>a[i+2]+30,'Accent is still gray/green at '+x+','+y);counts.goldProbes++;
    }
  }else{
    for(const box of [[1168,390,7,201],[1180,493,300,10],[1178,593,305,8]])
      checkRegion(a,g,w,box,'Home neutral cabinet frame','neutralPixels');
  }
}
console.log(JSON.stringify({status:'PASS',version:manifest.version,...counts}));
