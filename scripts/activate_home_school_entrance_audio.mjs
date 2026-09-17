// Activate validated r17 recordings in the local Who Takes Care candidate only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'versions/chs-home-school-evelyn-v1/';
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const write = (p, data) => fs.writeFileSync(path.join(root, p), JSON.stringify(data, null, 2) + '\n');
const requirements = read(base + 'data/entrance_house_audio_requirements.json');
const receipt = read(base + 'data/entrance_house_audio_import_receipt.json');
const context = read(base + 'data/home_school_context_manifest.json');
const audio = read(base + 'data/home_school_audio_manifest.json');
const candidate = read(base + 'candidate.json');
const setPointer = (object, pointer, value) => {
  const keys = pointer.split('/').slice(1);
  let current = object;
  for (const key of keys.slice(0, -1)) current = current[key] ??= {};
  current[keys.at(-1)] = value;
};
if (requirements.lines.length !== 25 || receipt.clips.length !== 25) throw new Error('Expected exactly 25 recordings');
for (const line of requirements.lines) {
  const clip = receipt.clips.find((item) => item.id === line.id);
  if (!clip || clip.text !== line.text || clip.output !== line.output) throw new Error('Recording mismatch: ' + line.id);
  const bytes = fs.readFileSync(path.join(root, clip.output));
  if (bytes.length !== clip.bytes || crypto.createHash('sha256').update(bytes).digest('hex') !== clip.sha256) throw new Error('Clip integrity failure: ' + line.id);
  const mapped = { id: line.id, text: line.text, output: clip.output, bytes: clip.bytes, durationSeconds: clip.durationSeconds, sha256: clip.sha256, revision: requirements.revision };
  if (line.replaces) {
    const current = audio.lines[line.replaces.lineIndex];
    if (current.output !== line.replaces.output && current.output !== clip.output) throw new Error('Old mapping changed: ' + line.id);
    audio.lines[line.replaces.lineIndex] = mapped;
  } else {
    const existing = audio.lines.findIndex((item) => item.id === line.id);
    if (existing >= 0) audio.lines[existing] = mapped;
    else audio.lines.push(mapped);
  }
  for (const location of line.contextManifestLocations) {
    setPointer(context, location.textPointer, line.text);
    setPointer(context, location.audioPointer, clip.output);
  }
}
context.scriptVersion = 'home_school_house_entrance_recipient_aware_v6';
context.contexts.HOME.label = "At the kid's house";
context.contexts.HOME.badge.alt = "At the kid's house";
context.entrance = { version: 'house_school_entry_halls_v1', sequence: ['exterior', 'entrance_room', 'character_1', 'character_2', 'character_3', 'context', 'event', 'helper_choice'], scope: 'all conditions in both matched setting blocks', audioReceipt: 'data/entrance_house_audio_import_receipt.json' };
audio.recording.entranceRevision = 'r17-entrance-house';
audio.recording.entranceClipCount = 4;
audio.recording.houseReplacementClipCount = 21;
audio.recording.clipCount = audio.lines.length;
audio.recording.entranceGeneratedOn = '2026-09-17';
audio.entranceImportReceipt = 'data/entrance_house_audio_import_receipt.json';
audio.status = 'complete';
audio.candidateStatus = 'local_review_recorded';
requirements.status = 'recorded_mapped_for_local_review';
receipt.status = 'mapped_for_local_review';
receipt.listeningReview = 'Pending researcher listening review; text, export voice/settings, filenames, formats, durations and hashes verified.';
candidate.missingEvelynClipCount = 0;
candidate.entranceEvelynClipCount = 4;
candidate.houseReplacementEvelynClipCount = 21;
candidate.entranceEvelynAudioReceipt = 'data/entrance_house_audio_import_receipt.json';
candidate.entranceEvelynListeningReview = 'pending_researcher_review';
for (const [file, value] of [['data/home_school_context_manifest.json', context], ['data/home_school_audio_manifest.json', audio], ['data/entrance_house_audio_requirements.json', requirements], ['data/entrance_house_audio_import_receipt.json', receipt], ['candidate.json', candidate]]) write(base + file, value);
console.log('Mapped 25 validated Evelyn recordings in the local Who Takes Care candidate. No deployment or CHS change.');
