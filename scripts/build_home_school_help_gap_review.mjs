import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("/Users/christinasteele/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidate = path.join(root, "versions/chs-home-school-evelyn-v1");
const manifest = JSON.parse(fs.readFileSync(path.join(candidate, "data/ksize_manifest.json")));
const examples = [
  { trialId: "2d", left: 700, label: "Reported coral Friend / Kid / Teacher scene" },
  { trialId: "1a", left: 815, label: "Opposite mixed-size helper arrangement" },
  { trialId: "5a", left: 770, label: "Two adult helpers" },
  { trialId: "6a", left: 765, label: "Two child helpers" },
];
const rows = [];
for (const example of examples) {
  const trial = manifest.trials.find((row) => row.id === example.trialId);
  const background = await sharp(path.join(root, trial.homeSchoolFurnished.homeBackground)).resize(1920, 1080, { fit: "cover" }).png().toBuffer();
  const sources = [
    path.join(candidate, `assets/home_school/foregrounds/${example.trialId}/help_01.png`),
    path.join(candidate, `assets/home_school/foregrounds/help-gaps-v1/${example.trialId}/help_01.svg`),
  ];
  const hrefs = [];
  for (const source of sources) {
    const foreground = await sharp(source).png().toBuffer();
    const composed = await sharp(background).composite([{ input: foreground }]).png().toBuffer();
    const crop = await sharp(composed).extract({ left: example.left, top: 590, width: 430, height: 290 }).resize(610, 411).png().toBuffer();
    hrefs.push(`data:image/png;base64,${crop.toString("base64")}`);
  }
  rows.push({ ...example, hrefs });
}
function reviewSvg(selectedRows) {
  const height = 90 + selectedRows.length * 457;
  const content = selectedRows.map((row, index) => {
    const y = 88 + index * 457;
    return `<text x="20" y="${y + 19}" font-size="18" font-weight="600">${row.label}</text><image x="20" y="${y + 32}" width="610" height="411" href="${row.hrefs[0]}"/><image x="650" y="${y + 32}" width="610" height="411" href="${row.hrefs[1]}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${height}" viewBox="0 0 1280 ${height}"><rect width="1280" height="${height}" fill="#fff"/><g font-family="Arial, sans-serif" fill="#24313b"><text x="20" y="33" font-size="24" font-weight="700">Arm / box gap repair — original artwork preserved</text><text x="20" y="68" font-size="19">Before · trapped white background</text><text x="650" y="68" font-size="19">After · room visible through arm gaps</text>${content}</g></svg>`;
}
for (const [filename, selectedRows] of [["help-gap-repair-before-after.png", rows.slice(0, 1)], ["help-gap-repair-layout-audit.png", rows]]) {
  const output = path.join(candidate, "review", filename);
  await sharp(Buffer.from(reviewSvg(selectedRows))).png().toFile(output);
  console.log(output);
}
