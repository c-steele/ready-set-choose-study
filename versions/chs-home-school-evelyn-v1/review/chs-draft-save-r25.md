# Who Helps Where? — r25 CHS draft save receipt

Verified September 19, 2026 (America/New_York), after 04:35 UTC.

## Scope

- Release: `chs-home-school-evelyn-v1-r25-yellow-door-cleanup-1`.
- Targeted correction for blotchy yellow/gray school-door paint and partially yellow metal handles reported after r24.
- The yellow school entrance now uses continuous, geometrically bounded paint coloring. Glass, reflections and complete handles retain their original pixels.
- The same corrected renderer supplies the full school picture and both moving door leaves.
- Home, other color themes, original artwork, character shapes/colors, captions, approved audio, assignments and design are unchanged from r24.

## Hosted release

- Implementation commit: `db6e87b9f597b16a2399c84a1175f8e860f2131f`.
- Existing repository: `c-steele/ready-set-choose-study`, branch `main`.
- GitHub Pages deployment **35421648432** completed successfully at **04:35:40 UTC**.
- Before saving CHS, six hosted files returned HTTP 200 and exactly matched tested local bytes: index, app, exterior palette module, corrected door PNG, review page and CHS wrapper.
- Exterior module SHA256: `a9d37d39f21d23c7a1c47938c69a693edb1c10c2b97a6b38c90340d0e0b7bc08`.
- Wrapper SHA256 including final newline: `6af6368ccb067c1c60fc5a9e09f8f9c33a46f9fd8f04de951e5b8a4ed431ce98`.

## CHS save and read-back

- Study **6349**, UUID `981133ce-7d08-4801-9c31-0ae72400e135`.
- Confirmed the existing saved wrapper differed only in its release token and matching descriptive comment.
- Pasted the tested r25 wrapper and verified the form value matched the local source before saving.
- Used **Save Changes**, then reopened the editor and verified the persisted source matched the intended wrapper after CHS removed its final newline.
- Persisted characters: **32,864**.
- Persisted SHA256: `f66c36c7780b1c83edf7b435a745c41e7756b33ccbe1c4c786be1faabfbcba68`.
- Persisted release: `chs-home-school-evelyn-v1-r25-yellow-door-cleanup-1`.
- CHS reported **created**, **Private**, **not currently active**, and **Study has not been submitted for approval**.
- No Submit, Change State, activation, child selection, consent, recording or participant response action was taken.
- Official preview detail opened successfully; temporary Back/Skip remains preview-only.

## Verification and limits

- Browser visual inspection covered enlarged corrected doors and closed, halfway-open and fully-open fixtures using the runtime palette renderer, crop geometry and actual opening angles. These fixtures are static; this is not a claim of a newly completed normal-speed CHS session.
- New pixel regression passed: 1,513,614 outside-door pixels unchanged; 9,436 sampled frame pixels match continuous paint; 24,959 protected glass/handle pixels unchanged; 177,760 moving-leaf channels match the whole-building render; 1,573,352 building pixels satisfy opening-mask behavior; 112 non-yellow SVG cases unchanged.
- Existing yellow-exterior, general-exterior, window-interior, wrapper, candidate, entrance, furnished-scene, review-board and release-scope checks passed.
- Structural runtime checks covered 48 configurations, 4,608 generated pages and 576 choices. Original 2,448 media/manifest files remain unchanged.
- The full 48-run browser audit was performed for r24, not repeated end-to-end for this narrow door correction. Its reported FOOD cutouts, two question-audio listening checks, preload waits and yellow-caption contrast remain open in the issue log.

## Preview links

- [Official CHS preview](https://childrenhelpingscience.com/exp/studies/981133ce-7d08-4801-9c31-0ae72400e135/preview-detail/)
- [Door correction before/after and opening views](https://c-steele.github.io/ready-set-choose-study/review-yellow-door-local.html?v=r25)
- [Current issue log](https://c-steele.github.io/ready-set-choose-study/review-study-audit-local.html?v=r25)
