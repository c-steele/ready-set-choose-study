# Who Helps Where? — r18 draft save

Saved September 17, 2026 (America/New_York), study 6349.

- Release: `chs-home-school-evelyn-v1-r18-preview-polish-1`.
- Runtime/assets commit: `8adf957bdc7a4958e97d145185658eb28362ee3f`.
- GitHub Pages deployment 35302873768 completed successfully; hosted index verified as r18.
- CHS source before editing matched the previous saved r17 source, apart from its trailing newline.
- CHS source read back after saving exactly matched the validated r18 wrapper, apart from its trailing newline.
- Only the wrapper release and temporary preview-navigation gate changed in CHS. No study-ad, consent, assignment or data-flow changes were made in this save.
- CHS overview remained **created — Study has not been submitted for approval**. No submission or activation was performed.
- Approved Find the Caregiver was not changed.

## Included fixes

- Back/Skip is temporarily enabled for the actual official CHS Preview Study route. Live participant launches remain tool-free regardless of parent URL flags.
- House and school entry halls match all 17 story palettes.
- Classroom floor patches were restored from the clean original master; all pixels outside the repair mask are unchanged.
- Narrative captions share a picture-relative font size and consistent short-caption height.
- One new NaturalReaders Evelyn school-opening take uses “Oh, look. Here is a school.” for spoken prosody. The displayed wording remains “Oh look! Here is a school.” No inserted silence or synthetic fallback; researcher listening review remains pending.

## Verification and limitation

Wrapper, furnished-candidate, CHS-candidate, review-board, follow-up-runtime, entrance-rollout and visual-repair checks passed. Local browser verification confirmed Skip advances and Back returns a screen, and rendered the repaired classroom and palette-matched hall.

Launched the actual CHS preview using the existing Fake Kid test profile. CHS stopped at **No webcam detected**, before loading the child-game iframe. No webcam permission or guardian consent was accepted. Therefore the persisted CHS code and preview-route logic are verified, but end-to-end story navigation through CHS still needs the researcher's device check.

Preview entry: https://childrenhelpingscience.com/exp/studies/981133ce-7d08-4801-9c31-0ae72400e135/preview-detail/
