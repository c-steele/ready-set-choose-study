# Two clearer School/Kid questions — r26

## Implemented locally

Only the School/Kid HUG and HELP question recordings were replaced. The replacement files are unchanged, whole-sentence NaturalReaders Evelyn retakes from the user's September 18 `Ohno.Atthekids.zip` export. Existing settings were recorded as Evelyn / Soft / 0.90× / 180 WPM / zero paragraph pause / 320 kbps MP3. No splice, trim, gain, speed, pitch, or re-encoding was applied.

Only two entries in `home_school_audio_manifest.json` and the two corresponding `questionAudio` pointers in `home_school_context_manifest.json` changed. All caption wording, all other mappings, and every previous recording remain intact. Runtime/CHS publication is owned by the main task; this audio work did not publish or save the study.

| Question | Duration | Peak | Clipped samples | Leading quiet | Natural comma gap |
|---|---:|---:|---:|---:|---:|
| School/Kid/HUG | 4.780400 s | −4.05 dBFS | 0 | 192 ms | 207 ms |
| School/Kid/HELP | 4.754275 s | −3.94 dBFS | 0 | 190 ms | 209 ms |

Fresh unprompted local Whisper base.en screening of the installed complete files recognized **“At” and every expected word** in both. Neither contained an internal quiet gap ≥400 ms at the −38 dB threshold. Silence measurement does not prove subjective naturalness.

`tests/verify_home_school_r26_clear_at_questions.mjs` passes: exactly two records/pointers replaced, zero caption changes, all 48 pre-existing context-audio files retain their hashes, current runtime canonical lookup uses the new paths, both new files are byte-identical to their source takes, and both transcripts contain all words.

## Preview and limit

[Listen to both new recordings, with optional old comparisons](index.html).

**Researcher naturalness review is still required before submission.** Machine screening establishes neither human listening approval nor absence of every possible voice-quality artifact. These are appropriate for a saved draft preview; they do not authorize submission.

Evidence: `../../data/question_audio_revision_r26.json`, `screening.json`; sources remain preserved locally in `review-at-retakes-v1` and in the user's original ZIP. The old r15 files remain available at their original paths.
