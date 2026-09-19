# Who Helps Where? — r24 CHS draft save receipt

Verified September 18, 2026 (America/New_York), after September 19, 2026, 02:06 UTC.

## Scope

- Release: `chs-home-school-evelyn-v1-r24-yellow-cleanup-1`.
- Yellow-only visual revision: clean house/school interiors and hallways, plus the approved exterior window/roof cleanup.
- Other 16 palettes, character geometry and RGB, original 2,448 media/manifest assets, narration, captions, participant assignment and design are unchanged from r23.
- 12 assignment cells, 48 organized preview runs, 12 matched Home/School stories per child. No rating trials.

## Hosted release

- Implementation commit: `d3c0f615b71fb6e09a71c3c9ff21704f985b78ec`.
- Existing public repository: `c-steele/ready-set-choose-study`, branch `main`.
- GitHub Pages deployment **35414604173** completed successfully at 02:06:24 UTC.
- Before saving CHS, 13 hosted files returned HTTP 200 and exactly matched tested local bytes: app, index, yellow routing helper, exterior palette module, all four v4 interior/hall SVGs, yellow manifest, three review pages and the CHS wrapper.
- Hosted app SHA256: `23c2dccadd6c81cf20210070a2edf7a2be2cd972b06b1ef9723588d7244d16f2`.
- Hosted wrapper SHA256, including final newline: `7a722ea492a17e14128511e389db960d794e6d3a79a5c781cd46c01dd5d105cf`.

## CHS save and persisted read-back

- Study **6349**, UUID `981133ce-7d08-4801-9c31-0ae72400e135`.
- Pasted the tested wrapper into the existing jsPsych editor. The form value exactly matched the local source before saving.
- Used **Save Changes**. No Submit, Change State, or activation action.
- Reopened the editor and read its persisted textarea value. It exactly matched the intended wrapper after removal of the final newline by CHS.
- Persisted characters: **32,854**.
- Persisted SHA256: `d58d03bab28d8728411e1049beb9effbb25f306fa830940c2cf62d79e0d443ff`.
- Persisted release: `chs-home-school-evelyn-v1-r24-yellow-cleanup-1`.
- CHS reported **created**, **Private**, **not currently active**, and **Study has not been submitted for approval**.
- Official preview detail opened successfully. No child selected, consent accepted, webcam enabled, participant response created, or recording made.
- Temporary Back/Skip remains preview-only; live participant launches remain tool-free.

## Audit scope and limitations

- Runtime checks covered all 48 organized configurations, 4,608 generated story pages and 576 helper choices.
- Actual browser review opened all 48 configurations, advanced through each first story, and visually inspected all 48 first-choice screenshots. Focused Home/School yellow captures additionally verified v4 artwork loading.
- These checks are **not** a normal-speed listen/watch of every page in every run, nor a completed CHS recording/consent session.
- Newly logged but not repaired in r24: white cutouts around some FOOD helper arms/legs; two current school question recordings requiring a listening check for the initial “At”; occasional initial preload waits; lower contrast of white caption text on bright yellow.
- Details: `r24-runtime-audit.md`, `r24-visual-audit.md`, and the user-facing issue log below.

## Preview links

- [Official CHS preview](https://childrenhelpingscience.com/exp/studies/981133ce-7d08-4801-9c31-0ae72400e135/preview-detail/)
- [All 48 previews](https://c-steele.github.io/ready-set-choose-study/review-all-versions-local.html?v=r24)
- [Fixed and open issue log](https://c-steele.github.io/ready-set-choose-study/review-study-audit-local.html?v=r24)
- [Yellow hallways, rooms and exteriors with captions](https://c-steele.github.io/ready-set-choose-study/review-yellow-cleanup-local.html?v=r24)
