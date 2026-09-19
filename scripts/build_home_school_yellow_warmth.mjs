// Native SVG palette adjustment; immutable illustrations are embedded unchanged.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {roomNeutralRegions, roomAccentRegions} from './yellow_room_regions.mjs';
import {makeHallMask} from './yellow_hall_regions.mjs';
const require = createRequire(import.meta.url);
const sharp = require('/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidate = 'versions/chs-home-school-evelyn-v1/';
const yellow = 'mkt-skf-yellow-ffd100';
const gray = 'dkt-bkf-gray-a9a9a9';
const output = `${candidate}assets/yellow-interior-cleanup-v4/`;
const home = slug => `assets/home_school/furnished_color_group_preview/${slug}/home_room_subtle_palette_wall_matched_pillows_palette_picture_floor_clean_v17.webp`;
const school = slug => `${candidate}assets/window-greenery-v1/${slug}/school-room.svg`;
const repair = `${candidate}assets/visual-repair-v1/`;
const scenes = [
  {name:'house-room', source:home(yellow), reference:home(gray)},
  {name:'school-room', source:school(yellow), reference:school(gray)},
  ...['house','school'].map(place => ({name:`${place}-hall`, source:`${repair}${yellow}/${place}-hall.webp`, mask:`${repair}${place}-hall-palette-mask.png`})),
];
// Map existing theme shading to butter-yellow highlights and golden shadows.
// Y=.299R+.587G+.114B; R=.27Y+.73, G=.58Y+.40, B=Y-.24.
// Chroma-proportional warmth: neutral pixels remain neutral. Unlike v2's
// luminance-only mapping, a stray low-chroma edge cannot become solid yellow.
const matrix = '2 0.3 -1.3 0 0 0.4 1.1 -0.5 0 0 -0.35 0 1.35 0 0 0 0 0 1 0';
const goldMatrix = '0.08073 0.15849 0.03078 0 0.73 0.17342 0.34046 0.06612 0 0.40 0.299 0.587 0.114 0 -0.24 0 0 0 1 0';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = {version:'yellow-interior-cleanup-v4', characterHex:'#FFD100', paletteSlug:yellow, treatment:'Chroma-proportional yellow warmth, smooth theme selection and explicit neutral-object protections; source artwork, geometry and other color sets unchanged', matrix, scenes:{}};
fs.mkdirSync(path.join(root, output), {recursive:true});
for (const scene of scenes) {
  const bytes = fs.readFileSync(path.join(root, scene.source));
  const original = await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const {width,height} = original.info;
  const sceneMatrix=scene.mask ? goldMatrix : matrix;
  const mask = Buffer.alloc(width * height);
  if (scene.mask) {
    const decoded = await sharp(Buffer.from(makeHallMask(scene.name,width,height))).removeAlpha().greyscale().raw().toBuffer({resolveWithObject:true});
    if (decoded.info.width !== width || decoded.info.height !== height) throw Error('Hall mask geometry mismatch');
    decoded.data.copy(mask);
  } else {
    const reference = await sharp(path.join(root,scene.reference)).removeAlpha().raw().toBuffer({resolveWithObject:true});
    if (reference.info.width !== width || reference.info.height !== height) throw Error('Room reference geometry mismatch');
    for (let i=0;i<mask.length;i++) {
      // Preserve the complete previously repaired outdoor-bush region,
      // including its antialiased/window boundary pixels, not just green cores.
      const x=i%width, y=Math.floor(i/width);
      if (scene.name==='school-room' && x<34 && y>=384 && y<423) continue;
      const offset=i*3, [r,g,b]=original.data.subarray(offset,offset+3);
      if(scene.name==='house-room' && x<180 && y>=410 && y<565 && g>r) continue;
      const difference=Math.max(...[0,1,2].map(c=>Math.abs(original.data[offset+c]-reference.data[offset+c])));
      // Natural green foliage and all shared neutral/wood surfaces are protected.
      if (difference>=3) mask[i]=Math.round(Math.min(1,(difference-2)/10)*255);
    }
  }
  const png = await sharp(original.data,{raw:{width,height,channels:3}}).png().toBuffer();
  const maskPng = await sharp(mask,{raw:{width,height,channels:1}}).png().toBuffer();
  const href=`data:image/png;base64,${png.toString('base64')}`;
  const neutral=roomNeutralRegions(scene.name), accents=roomAccentRegions(scene.name);
  let restorationDefs='', restorationUses='';
  if(neutral) {
    const grayPng=await sharp(path.join(root,scene.reference)).removeAlpha().png().toBuffer();
    restorationDefs=`<image id="neutral-source" href="data:image/png;base64,${grayPng.toString('base64')}" width="${width}" height="${height}"/><mask id="neutral" maskUnits="userSpaceOnUse" style="mask-type:luminance"><g fill="white">${neutral}</g></mask><mask id="accents" maskUnits="userSpaceOnUse" style="mask-type:luminance"><g fill="white">${accents}</g></mask><filter id="gold" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.08073 0.15849 0.03078 0 0.73 0.17342 0.34046 0.06612 0 0.40 0.299 0.587 0.114 0 -0.24 0 0 0 1 0"/></filter>`;
    restorationUses='<use href="#neutral-source" mask="url(#neutral)"/><use href="#neutral-source" filter="url(#gold)" mask="url(#accents)"/>';
    if(scene.name==='school-room') {
      // The source palette has a small gray wedge above the desk. Restore
      // the wall from the adjacent, identically shaded wall, keeping the
      // original desktop's diagonal boundary intact.
      restorationDefs+='<clipPath id="desk-wall-edge"><path d="M586 492H607L586 509Z"/></clipPath><clipPath id="desk-wall-edge-right"><path d="M1036 492H1059V509Z"/></clipPath>';
      restorationUses+='<g clip-path="url(#desk-wall-edge)"><use href="#source" transform="translate(30 0)" filter="url(#warm)"/></g><g clip-path="url(#desk-wall-edge-right)"><use href="#source" transform="translate(-30 0)" filter="url(#warm)"/></g>';
    }
  }
  // Reuse one embedded source rather than downloading the same image twice.
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><title>Butter-yellow ${scene.name}</title><defs><image id="source" href="${href}" width="${width}" height="${height}"/><mask id="theme" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" style="mask-type:luminance"><image href="data:image/png;base64,${maskPng.toString('base64')}" width="${width}" height="${height}"/></mask><filter id="warm" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${sceneMatrix}"/></filter>${restorationDefs}</defs><use href="#source"/><use href="#source" filter="url(#warm)" mask="url(#theme)"/>${restorationUses}</svg>\n`;
  const destination=`${output}${scene.name}.svg`;
  fs.writeFileSync(path.join(root,destination),svg);
  manifest.scenes[scene.name]={...scene,width,height,matrix:sceneMatrix,maskMethod:scene.mask?'hand-traced-vector-regions':'chroma-proportional-with-neutral-object-restoration',sourceSha256:sha(bytes),output:destination,outputSha256:sha(svg),selectedPixels:mask.reduce((n,v)=>n+(v>0),0)};
}
fs.writeFileSync(path.join(root,candidate,'data/yellow_warmth_manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:'BUILT',scenes:4,otherPalettesChanged:0,sourceArtworkChanged:0}));
