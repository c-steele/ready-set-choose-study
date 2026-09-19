# Who Helps Where? — r23 CHS draft save receipt

Verified September 18, 2026 (America/New_York); verification completed by September 19, 2026, 00:22 UTC.

## Authorized scope

The researcher approved retaining only the six Woman and six Man role-set pairings at both Home and School. All active recipients are Kid. Predictions remain tentative notes, not scoring or assignment rules. The separate Family/Teacher set is excluded; Teacher–Classmate remains in both retained sets.

- Release: `chs-home-school-evelyn-v1-r23-two-role-sets-1`
- Design: `home_school_within_child_two_role_sets_v2`
- 9 unique pairings, 12 assignment cells, 48 organized preview runs.
- Each child still receives 12 stories, six per setting.
- Source and verification: `r23-two-role-verification.md`.

## Deployment

- Implementation commit: `f37528e244abbdbdd1ff937bf12299c7273d6b15`.
- Existing public repository: `c-steele/ready-set-choose-study`, branch `main`.
- GitHub Pages build/deployment **35408753362** completed successfully.
- Before saving CHS, seven hosted files returned HTTP 200 and exactly matched local bytes: candidate app, index, context manifest, candidate metadata, review HTML, review JS, and the 12-cell CHS wrapper.
- Hosted app SHA256: `c7cdf59d67cd4bda651e05b34f2c06a35b0200f5646a2b7f428645a2063de250`.
- Hosted 12-cell wrapper file SHA256: `ca7a661359a18ce30faad2ade01e99c48b39f96492507c89a24fa15d055324cc` (includes its final newline).

## CHS save and read-back

- Study: **6349**, UUID `981133ce-7d08-4801-9c31-0ae72400e135`.
- Opened the existing jsPsych editor, replaced only its experiment code with the verified 12-cell wrapper, and used **Save Changes**.
- Editor paste and underlying form value were both checked before saving.
- Navigated back to the editor after saving and read the persisted form value. It exactly matched the intended wrapper with trailing whitespace removed.
- Persisted characters: **32,838**.
- Persisted SHA256: `8f1dcf0236147669aaccc2f5bc717e4c9cedf495bf64c8ab6b05e5359b22f09e`.
- Persisted release: `chs-home-school-evelyn-v1-r23-two-role-sets-1`.
- CHS study page reported **created**, **Private**, **not currently active**, and **Study has not been submitted for approval**.
- Official preview page opened successfully; no child profile selected and no consent, webcam, response, or participant submission performed.

Official preview: https://childrenhelpingscience.com/exp/studies/981133ce-7d08-4801-9c31-0ae72400e135/preview-detail/

Organized preview board: https://c-steele.github.io/ready-set-choose-study/screen-share-study/home-school-review.html?v=who-helps-where-review-r23

## Preserved boundaries

No submission or activation. No new media, changed caption/audio text, playback timing, character art, colors, entrance scenes, consent language, recording settings, participant data handling, recruitment wording, eligibility or compensation changes. Temporary Back/Skip remains preview-only. Existing Family/adult-recipient media remains archived and cannot be selected in the active design. The previously flagged Dad-recipient question recording is now unreachable, not repaired.
