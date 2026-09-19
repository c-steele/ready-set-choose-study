import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const candidate='versions/chs-home-school-evelyn-v1/';
const destination=path.join(root,candidate,'review/yellow-warmth-v2');
fs.mkdirSync(destination,{recursive:true});
for (const state of ['before','after']) {
  const source=fs.readFileSync(path.join(root,candidate,'exterior-palette.js'),'utf8');
  const sandbox={window:{}};vm.runInNewContext(source,sandbox);
  for(const context of ['HOME','SCHOOL']) {
    const place=context==='HOME'?'house':'school';
    if(state==='before') {
      fs.copyFileSync(path.join(root,candidate,`review/yellow-warmth-v1/${place}-exterior-after.svg`),path.join(destination,`${place}-exterior-before.svg`));
      continue;
    }
    const bytes=fs.readFileSync(path.join(root,candidate,`assets/entrance/${place}-exterior.webp`));
    const factory=sandbox.window.WTCExteriorPalette.create({context,href:`data:image/webp;base64,${bytes.toString('base64')}`,characterHex:'#FFD100'});
    const svg=factory.svg().replace('<svg','<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941"');
    fs.writeFileSync(path.join(destination,`${place}-exterior-${state}.svg`),svg);
  }
}
console.log('Built exact baseline/current exterior review SVGs.');
