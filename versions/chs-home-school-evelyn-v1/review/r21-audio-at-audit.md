# R21 audio audit — “At” in the Home / Kid / Help narration

Audited September 18, 2026. Documentation only; no recordings, runtime code, manifests, hosted assets, or CHS source changed by this audit.

## Finding and remaining blocker

The researcher initially reported that Evelyn seemed to omit “At” in the coral Friend / Kid / Teacher Home event and helping question. After listening to the two original MP3s, the researcher confirmed that **“At” is audible in the question, but not audible in the event**. Keep the question recording unchanged. The remaining audio correction is the event only.

The correct two original r17 recordings are selected. Their source scripts include “At,” and their current bytes match their import receipt. No code-level leading trim, positive seek, rate change, or normal narration overlap was found. The researcher’s original-file comparison supports pursuing a clearer event recording, not replacing the already-clear question or claiming a playback fix.

**Listening evidence is the researcher’s assessment, not the agent’s.** No agent listening or speech-recognition assessment was performed. Text, hashes, waveform activity, and successful decoding cannot establish that a word is spoken clearly. The distinction between an omitted phoneme and an unclear/reduced pronunciation was not independently measured.

Browser access is currently unavailable because the admin-enforced security policy could not be verified across browser surfaces. Do not bypass that restriction. Browser playback comparison, NaturalReaders listening, and any rerecording remain blocked. No replacement has been generated, approved, installed, or published.

## Exact active recordings

1. [Original event MP3](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-helps-where-visual-fixes-r21/assets/home_school/generated/audio/hs_r17_009_house_help_event.mp3)

   - Canonical ID: `hs_r17_009`.
   - Script: “Oh no! At the kid's house, the kid in the middle dropped a heavy box!”
   - Bytes: 212159; manifest duration: 5.30285 seconds.
   - SHA-256: `2f9d6bbe81b41e5174d0d17937b07df2b9ecfb81495272bbd02e6d63faf824f0`.
   - Original export entry: `9.Oh_no!_At_the_kids_house,_the.mp3`.

2. [Original question MP3](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-helps-where-visual-fixes-r21/assets/home_school/generated/audio/hs_r17_010_house_kid_help_question.mp3)

   - Canonical ID: `hs_r17_010`.
   - Script: “At the kid's house, who will help the kid in the middle pick up the heavy box?”
   - Bytes: 186036; manifest duration: 4.649775 seconds.
   - SHA-256: `c095cbf21c8c7da82bfc7ff31d5184973f1846c55e9df902ce273c409161d200`.
   - Original export entry: `10.At_the_kids_house,_who_will_h.mp3`.

Sources:

- [Numbered recording script, event and question](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-helps-where-visual-fixes-r21/versions/chs-home-school-evelyn-v1/recording-package/evelyn_entrance_house_recording_script.txt:58), also present in the [paste-only recording script](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-helps-where-visual-fixes-r21/versions/chs-home-school-evelyn-v1/recording-package/evelyn_entrance_house_paste_only.txt:17).
- [Original import receipt](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-helps-where-visual-fixes-r21/versions/chs-home-school-evelyn-v1/data/entrance_house_audio_import_receipt.json:175): NaturalReaders Commercial, Evelyn, Soft, speed 0.9 / 180 WPM, paragraph pause 0, mono 44.1 kHz, 320 kbps.
- [Active context mappings](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-helps-where-visual-fixes-r21/versions/chs-home-school-evelyn-v1/data/home_school_context_manifest.json:80) and [canonical audio records](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-helps-where-visual-fixes-r21/versions/chs-home-school-evelyn-v1/data/home_school_audio_manifest.json:119).

The mappings and these two MP3s have no change from verified r20 baseline `1eb0344`. Their hashes also match the files in the older unpublished narration-fix checkout.

## Mapping coverage

Both clips are shared by every non-directional Home / Help story whose recipient is the kid: **44 source trial variants across 11 pairings**, not only the coral scene. The relevant mapping is `contexts.HOME.events.HELP`.

The pairings are MOM-SISTER, TEACHER-FRIEND, MOM-TEACHER, SISTER-FRIEND, DAD-BROTHER, DAD-TEACHER, BROTHER-FRIEND, MOM-DAD, SISTER-BROTHER, BESTFRIEND-FRIEND, and TEACHER-CLASSMATE. Directional DAD-KID, MOM-KID, and TEACHER-KID use separate adult-recipient records. School recordings are separate.

A future replacement of the event’s canonical record would affect all 44 Home / Kid / Help variants. Keep the current question canonical record and context pointer unchanged. Do not replace School or adult-recipient clips, the approved r20 exterior openings, or the separate unapproved question audition.

## Acoustic and playback evidence

Read-only decoding succeeded for both MP3s. At a −38 dB silence threshold:

| Measurement | Event | Question |
| --- | ---: | ---: |
| Initial quiet interval | 194.989 ms | 191.088 ms |
| Peak decoded level | −4.8 dB | −4.3 dB |
| Mean decoded level | −21.4 dB | −22.6 dB |

The event also has a quiet interval from 0.933265 to 1.60744 seconds (674.172 ms) after its opening signal burst. These are threshold-based signal measurements, not identified word boundaries. There is no evidence of full-scale digital clipping.

The audited [candidate playback code](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-helps-where-visual-fixes-r21/versions/chs-home-school-evelyn-v1/app.js) creates a fresh Audio object, defaults to playback rate 1 and volume 1, and only seeks to zero when stopping. Autoplay delays invocation by 250 ms; it does not skip the first 250 ms of the file. Replay uses the same full-clip routine. Event/question narration is awaited to completion; question and option clips play in sequence, and welcome music is stopped before the game.

A read-only mock execution of the actual R audio object confirmed sequential starts at time 0, rate 1, volume 1, with no positive seeks. This is a code-level diagnostic, not a real-browser or device-output test.

The older checkout’s unpublished narration pool/preload/cancellation fixes do not modify these MP3s or add missing speech. The current R cancellation path can leave an interrupted playback promise unresolved; that separate weakness is not evidence of selectively skipping “At.”

If “Oh no!” is audible, startup-only truncation would not explain omission of the event’s later “At.” The researcher has now reported the problem while listening to the event original and confirmed the question original is clear. This narrows the requested correction to the event recording; it is not proof of a runtime bug or a phonetic diagnosis.

## Checks completed

- [Question-audio provenance and timing audit](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-helps-where-visual-fixes-r21/tests/verify_home_school_question_audio_pauses.mjs): PASS; all 24 current questions and all 24 non-question hashes match their respective manifests/receipts.
- [Entrance/runtime audit](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-helps-where-visual-fixes-r21/tests/verify_home_school_entrance_rollout.mjs): PASS; 72 review configurations, 6,912 story pages, canonical mapping and narration sequencing checks.
- In the older checkout, [narration-pool](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-takes-care-entrance-rollout/tests/verify_home_school_narration_pool.mjs) and [narration-timing](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-takes-care-entrance-rollout/tests/verify_home_school_narration_timing.mjs) checks passed during the comparison.
- No browser checks were attempted through alternative mechanisms after the policy block; none of these results certify audible pronunciation.

## Existing-alternative search

No documented alternative original whole-sentence take of the exact House / Kid / Help event was found in either the r21 checkout or the older rollout checkout. The bounded search covered audio-file inventories, exact-sentence scripts/manifests/import receipts, local audition folders, and relevant Git history. The event’s only file-history entry is `2d4f9bb`; it is the same current r17 export, not another take.

- The older [Home event MP3](/Users/christinasteele/.codex/.chatgpt-projects/g-p-6a68b271d66c8191ab7518c24cd35212/work/who-helps-where-visual-fixes-r21/assets/home_school/generated/audio/hs_011_home_help_event.mp3), SHA-256 `05c8a930430b08637de9dfbba4acb41eb147551a2deff18067f08b5a6e29a9fe`, is documented as “At the kid's **home**,” not “house.” It is not an exact replacement.
- Other Help events use School or Mom/Dad/Teacher recipients; their words do not match this event.
- The older checkout’s local audition folders contain exterior openings and the School / Mom / Hug question, not a Home / Kid / Help event retake.
- The r17 receipt names source archive `Ohlook!Hereisa.zip` (SHA-256 `8df8d1637b7998c4e87885a80a7e43086fb42c6c0d3ca7522612d9e84f8b44e6`), but that archive is not stored in either searched repo. Reimporting the existing r17 file would reproduce the same bytes, not improve its pronunciation.

This search did not access Downloads, browser storage, external services, or any source outside the two repos. No candidate has been assessed as audibly suitable, and no alternative has been installed.

## Event-only rerecording brief

When ordinary authorized NaturalReaders access is restored, create one local review take using NaturalReaders Commercial, Evelyn, Soft, speed 0.9 / 180 WPM, paragraph pause 0, original mono 44.1 kHz / 320 kbps MP3 export. Keep the entire event together; no splicing, synthetic-voice substitution, inserted silence, trimming, normalization, or rate changes.

Suggested single paste line, changing only the punctuation after “Oh no” to invite a natural sentence break:

> Oh no. At the kid's house, the kid in the middle dropped a heavy box!

This candidate wording is a rerecording brief, not a generated or approved take. All spoken words remain exactly the same as the caption. A sentence break is not guaranteed to improve articulation; the researcher must confirm that “At” is clearly audible and that the overall pace/pause sounds natural before installation. Do not add a pause inside “At the kid's house” merely to force a word boundary.

The original event link above remains the comparison reference. The question link is retained as evidence for the researcher’s confirmation, not as a replacement target. After approval, compare the new event in standalone playback and study autoplay/Replay when browser access permits.

Any approved event replacement needs a new filename, a provenance receipt, the event context pointer and canonical record updated together, and regression checks covering the shared mapping scope. Keep the question’s hash `c095cbf21c8c7da82bfc7ff31d5184973f1846c55e9df902ce273c409161d200` and the approved r20 openings unchanged. Preserve the original event. No CHS submission or activation is authorized.
