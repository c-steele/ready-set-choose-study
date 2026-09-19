"""Verify complete selected MP3s locally, without caption hints or audio upload."""
import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess
import numpy as np
import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor
out=Path(__file__).resolve().parent
root=out.parents[3]
receipt=json.loads((root/'versions/chs-home-school-evelyn-v1/data/question_audio_revision_r26.json').read_text())
model_path=root.parent/'at-audio-audit-models/models--openai--whisper-base.en/snapshots/911407f4214e0e1d82085af863093ec0b66f9cd6'
torch.set_num_threads(4)
torch.manual_seed(0)
processor=WhisperProcessor.from_pretrained(str(model_path),local_files_only=True)
model=WhisperForConditionalGeneration.from_pretrained(str(model_path),local_files_only=True,use_safetensors=True).to('cpu').eval()
result={'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'model':'openai/whisper-base.en','modelRevision':model_path.name,'expectedCaptionsProvidedToModel':False,'audioUploaded':False,'status':'machine_screening_only_human_naturalness_preview_pending','clips':[]}
words=lambda s:re.findall(r'[a-z]+',s.lower().replace("'",'').replace('’',''))
for clip in receipt['files']:
    filename=root/clip['output']
    assert hashlib.sha256(filename.read_bytes()).hexdigest()==clip['sha256']
    decoded=subprocess.run(['/Users/christinasteele/anaconda3/bin/ffmpeg','-nostdin','-v','error','-i',str(filename),'-f','f32le','-ac','1','-ar','16000','pipe:1'],capture_output=True,check=True).stdout
    features=processor(np.frombuffer(decoded,dtype=np.float32),sampling_rate=16000,return_tensors='pt').input_features
    with torch.inference_mode():
        ids=model.generate(features,do_sample=False,num_beams=1,max_new_tokens=128)
    transcript=processor.batch_decode(ids,skip_special_tokens=True)[0].strip()
    scanned=subprocess.run(['/Users/christinasteele/anaconda3/bin/ffmpeg','-nostdin','-hide_banner','-nostats','-i',str(filename),'-af','silencedetect=noise=-38dB:d=0.025','-f','null','-'],capture_output=True,text=True,check=True)
    silences=[]
    for match in re.finditer(r'silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)',scanned.stderr):
        end,duration=map(float,match.groups());silences.append({'start':round(end-duration,6),'end':end,'duration':duration})
    entry={'output':clip['output'],'sha256':clip['sha256'],'caption':clip['text'],'transcript':transcript,'wordsMatch':words(transcript)==words(clip['text']),'startsWithAt':words(transcript)[0]=='at','silenceCriterionDbfs':-38,'silences':silences,'internalSilencesOver400ms':[s for s in silences if s['start']>.01 and s['end']<clip['durationSeconds']-.12 and s['duration']>=.4]}
    assert entry['wordsMatch'] and entry['startsWithAt'] and not entry['internalSilencesOver400ms']
    result['clips'].append(entry)
    print(json.dumps(entry),flush=True)
(out/'screening.json').write_text(json.dumps(result,indent=2)+'\n')
