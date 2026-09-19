import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(out,'../../../..');
const names=[
  'verify_home_school_media_recovery','verify_home_school_entrance_rollout','verify_home_school_followup_runtime_behavior',
  'verify_home_school_furnished_candidate','verify_home_school_review_board','verify_chs_home_school_candidate',
  'verify_who_helps_where_welcome','verify_home_school_chs_wrapper','verify_home_school_directional_audio_import',
  'verify_home_school_question_audio_pauses','verify_home_school_r26_clear_at_questions',
  'verify_home_school_exterior_palette','verify_home_school_window_greenery_routing',
];
const selected=process.argv.slice(2);
const previous=selected.length&&fs.existsSync(path.join(out,'current-tests.json'))?JSON.parse(fs.readFileSync(path.join(out,'current-tests.json'),'utf8')).results:[];
const results=previous.filter(r=>!selected.includes(r.name));
for(const name of names.filter(name=>!selected.length||selected.includes(name))){const start=Date.now();const r=spawnSync(process.execPath,[`tests/${name}.mjs`],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024});const record={name,status:r.status===0?'PASS':'FAIL',exitCode:r.status,seconds:(Date.now()-start)/1000,stdout:r.stdout,stderr:r.stderr,error:r.error?.message};results.push(record);console.log(`${record.status} ${name} (${record.seconds}s)`);}
const report={generated:new Date().toISOString(),release:'chs-home-school-evelyn-v1-r26-complete-polish-1',results,
  deferredToParallelArtReview:['verify_home_school_food_artwork_repair','verify_home_school_caption_contrast','verify_home_school_yellow_release_scope','verify_home_school_yellow_warmth','verify_home_school_yellow_exterior_cleanup','verify_home_school_yellow_door_cleanup','verify_home_school_yellow_interior_cleanup','verify_home_school_window_greenery','verify_home_school_window_interior_palette','verify_home_school_r26_clean_windows','verify_home_school_help_gap_masks'],
  intentionallyNotRun:[
    {name:'verify_home_school_caption_layout',reason:'Starts a browser outside CUA; live browser layout is being verified separately via CUA.'},
    ...['verify_home_school_approved_openings_scope','verify_home_school_clear_at_events_scope','verify_home_school_two_role_scope','verify_home_school_visual_fixes_scope'].map(name=>({name,reason:'Historical frozen-release change-scope gate (r20/r22/r23/r21), not the current r26 acceptance test. Historical assertions are preserved, not weakened.'})),
  ]};
fs.writeFileSync(path.join(out,'current-tests.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').map(r=>({name:r.name,stderr:r.stderr?.slice(-2400)}))},null,2));
