import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const candidate='versions/chs-home-school-evelyn-v1';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const ffmpeg='/Users/christinasteele/anaconda3/bin/ffmpeg';
const ffprobe='/Users/christinasteele/anaconda3/bin/ffprobe';
const spec=[
  {event:'HUG',source:'review-at-retakes-v1/3.At_the_kids_school,_who_will_.mp3',sha256:'64ff8c83d28f7b6c4de7dcd1ef0b6c451ac614b3f5e55d31f482fa9a4edf92da',output:'assets/home_school/generated/audio/hs_r26_001_school_kid_hug_question_clear_at.mp3',text:"At the kid's school, who will give the kid in the middle a hug now that they're sad?",replaces:{output:'assets/home_school/generated/audio/hs_r15_013_school_kid_hug_question_context_first.mp3',sha256:'fac54d5949f7854f92c8557e6640984857dc2aca325ca50a0e3ad942031b59a0'}},
  {event:'HELP',source:'review-at-retakes-v1/4.At_the_kids_school,_who_will_.mp3',sha256:'db0025573952468c21ad05102383ae379d191b58ca3ec35e1c76544aaa2356d1',output:'assets/home_school/generated/audio/hs_r26_002_school_kid_help_question_clear_at.mp3',text:"At the kid's school, who will help the kid in the middle pick up the heavy box?",replaces:{output:'assets/home_school/generated/audio/hs_r15_015_school_kid_help_question_context_first.mp3',sha256:'f0e759d4622a7519500e990f66cbf91d4c9d0127ec6a1ff86f2a1bf5d2454532'}},
];
const prior=JSON.parse(fs.readFileSync(path.join(root,'review-at-audio-stt-retakes-v1.json')));
const receipt={revision:'r26-clear-at-school-kid-questions',status:'selected_for_draft_human_naturalness_preview_pending',sourceExport:'Ohno.Atthekids.zip',sourceExportSha256:'bafbc13f2ee323f15859b50828b8cac48e52407774a70d6f0264ac27b2d61972',sourceDate:'2026-09-18',importedOn:'2026-09-19',provider:'NaturalReaders Commercial',voice:'Evelyn',style:'Soft',speed:0.9,wordsPerMinute:180,paragraphPauseSeconds:0,format:'mp3',bitrateKbps:320,voiceSettingsEvidence:'review-at-audio-status.md: first retake batch UI verification; researcher-supplied source export',processing:'Byte-for-byte whole-sentence import. No splicing, silence trimming, gain, speed, pitch change, crossfade, or re-encoding. Original recordings and source exports preserved.',listeningReview:'Whole-sentence retakes machine checked; researcher naturalness preview required before submission.',files:[]};
for(const s of spec){
  const source=path.join(root,s.source),output=path.join(root,s.output),bytes=fs.readFileSync(source);
  assert.equal(sha(bytes),s.sha256);
  assert.equal(sha(fs.readFileSync(path.join(root,s.replaces.output))),s.replaces.sha256);
  const screened=prior.clips.find(c=>c.sha256===s.sha256);assert.ok(screened?.atRecognized);assert.equal(screened.caption,s.text);
  if(fs.existsSync(output))assert.equal(sha(fs.readFileSync(output)),s.sha256,'Refuse to overwrite another asset');
  else fs.copyFileSync(source,output,fs.constants.COPYFILE_EXCL);
  const info=JSON.parse(execFileSync(ffprobe,['-v','error','-show_entries','format=duration,bit_rate:stream=sample_rate,channels','-of','json',output],{encoding:'utf8'}));
  const pcm=execFileSync(ffmpeg,['-nostdin','-v','error','-i',output,'-f','f32le','-ac','1','-ar','44100','pipe:1'],{maxBuffer:16e6});
  let peak=0,clippedSamples=0;for(let i=0;i<pcm.length;i+=4){const v=Math.abs(pcm.readFloatLE(i));peak=Math.max(peak,v);if(v>=1)clippedSamples++;}
  receipt.files.push({...s,context:'SCHOOL',recipient:'KID',bytes:bytes.length,durationSeconds:Number(info.format.duration),sampleRateHz:Number(info.streams[0].sample_rate),channels:info.streams[0].channels,decodedSampleCount:pcm.length/4,decodedPeakDbfs:20*Math.log10(peak),fullScaleClippedSamples:clippedSamples,encodedBytesIdenticalToSource:true,join:'not_applicable_whole_sentence',priorUnpromptedTranscript:screened.transcript});
}
fs.writeFileSync(path.join(root,candidate,'data/question_audio_revision_r26.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
