# Who Takes Care — entrance rollout r17

## Scope

All 72 researcher order previews share the approved house/school entrance format. Each of the 12 stories follows: exterior → zoom, opening door and entry hall → empty room → three cumulative character introductions → location confirmation → event → helper choice. No Likert questions were added. The same six matched stories and six distinct colors are retained in each context block, with house-first/school-first counterbalancing unchanged.

The approved lavender entrance images are shared across conditions. Existing story-specific room palettes and original character pixels/positions are preserved. Captions sit above entrance artwork so they do not cover the roof. The original source images were not overwritten.

## Narration

25 new NaturalReaders Commercial Evelyn recordings were exported on September 17, 2026: Soft style, 0.90× / 180 WPM, mono 44.1 kHz, 320 kbps MP3. Four introduce the exterior/room; 21 replace remaining spoken “home” wording with “house.” Existing school narration is retained. Export source and per-clip hashes are recorded in `../data/entrance_house_audio_import_receipt.json`.

Participant playback requires real prerecorded audio. Browser speech is not substituted. An explicitly marked silent visual mode is restricted to researcher previews. Researchers can listen to all new recordings at `entrance-audio-review.html`; subjective listening approval remains with the researcher.

## Verification

- All 56 source trials × 3 events × 2 settings checked (336 source stories).
- All 72 review configurations checked: 864 helper choices, zero Likert pages, and 6,912 story pages.
- Directional parent/teacher-center stories introduce the kid in the correct left/right position, retaining each previously introduced character.
- All 168 identity-page foreground masks checked without modifying source pixels.
- All 25 new recording hashes and mappings verified; old recordings preserved.
- Animation pause, resume, replay, skip, teardown, and reduced-motion behavior checked.
- Browser checks included actual recorded playback through a complete school story and cumulative reveals in a house story.
- Eleven relevant test suites passed. A pre-existing unrelated v74 test still expects 158 root Evelyn MP3s where the repository already contains 159.

## Protected scope

Find the Caregiver runtime and review versions are unchanged. CHS study 6349 was saved as a draft, with no active study changed and no submission for approval. Researcher Back/Skip controls remain review-only; participant launch restrictions are preserved.

## Deployment and draft-save receipt — September 17, 2026

- Commits `2d4f9bb` (entrance runtime/assets/audio) and `8f11329` (r17 Lookit wrapper) were pushed to GitHub Pages `main`. The public r17 index was verified; entrance images and Evelyn audio returned HTTP 200.
- The Who Takes Care design wrapper was saved in Lookit/CHS study 6349 and checked against an exact copy of the saved code. Saved listing descriptions now describe 12 stories, both settings, and no character ratings.
- The study overview remained **Created / not submitted for approval** after saving. No active CHS study or Find the Caregiver configuration was changed.
- A full CHS participant run has not been verified. Researcher listening review of the new Evelyn recordings remains pending.
