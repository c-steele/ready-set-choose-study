import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const base='versions/chs-home-school-evelyn-v1/';
const out=base+'review/yellow-door-cleanup-v4/';
fs.mkdirSync(out,{recursive:true});
const png=await sharp(base+'assets/entrance/school-exterior.webp').png().toBuffer();
for(const version of ['before','after']){
 const source=version==='before'?execFileSync('git',['show','e8b6504636a9e05e5bd3109597eed56fd1089ac6:'+base+'exterior-palette.js']):fs.readFileSync(base+'exterior-palette.js');
 const box={window:{}};vm.runInNewContext(String(source),box);
 const api=box.window.WTCExteriorPalette.create({context:'SCHOOL',characterHex:'#FFD100',href:'data:image/png;base64,'+png.toString('base64')});
 const svg=api.svg().replace('<svg','<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941"');
 await sharp(Buffer.from(svg)).png().toFile(out+'school-exterior-'+version+'.png');
 await sharp(Buffer.from(svg)).extract({left:716,top:435,width:238,height:210}).resize(952,840).png().toFile(out+'school-door-'+version+'.png');
}
console.log('Rendered unchanged r24 reference and current school-door repair.');
