import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const sharp=require('/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const candidate='versions/chs-home-school-evelyn-v1/';
const destination=path.join(root,candidate,'review/yellow-exterior-cleanup-v3');
fs.mkdirSync(destination,{recursive:true});
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,candidate,'exterior-palette.js'),'utf8'),sandbox);
for(const context of ['HOME','SCHOOL']) {
  const place=context==='HOME'?'house':'school';
  const bytes=fs.readFileSync(path.join(root,candidate,`assets/entrance/${place}-exterior.webp`));
  const png=await sharp(bytes).png().toBuffer();
  const factory=sandbox.window.WTCExteriorPalette.create({context,href:`data:image/png;base64,${png.toString('base64')}`,characterHex:'#FFD100'});
  const svg=factory.svg().replace('<svg','<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941"');
  fs.writeFileSync(path.join(destination,`${place}-exterior-after.svg`),svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(destination,`${place}-exterior-after.png`));
}
console.log('Rendered current yellow exterior cleanup for full-size visual review.');
