# Who Helps Where? — r23 two-role design verification

Prepared September 18, 2026, following explicit researcher approval to retain only the existing Woman and Man role sets for the Home/School study. Predictions remain tentative planning notes; none are encoded as expected answers, scoring, or assignment rules.

Release: `chs-home-school-evelyn-v1-r23-two-role-sets-1`.
Design: `home_school_within_child_two_role_sets_v2`.
Baseline: verified r22 draft save, commit `b2c4d0c58fec5f5bf94e452ceeed286111e50722`.

## Design

- Woman: Mom–Teacher, Sister–Friend, Best friend–Friend, Teacher–Friend, Mom–Sister, Teacher–Classmate.
- Man: Dad–Teacher, Brother–Friend, Best friend–Friend, Teacher–Friend, Dad–Brother, Teacher–Classmate.
- Nine unique helper-choice pairings; Kid is the recipient in every active story.
- Three events retained: HUG, FOOD, HELP.
- Two context orders retained: Home→School, School→Home.
- 12 assignment cells; four repeatable visual profiles per cell give 48 organized preview runs, not all possible seeded participant permutations.
- Every child still hears 12 stories: six pairings once in each setting. Each story has eight pages, for 96 story pages per run.
- Teacher–Classmate remains in both retained sets.
- Former Family/Teacher choices and adult-recipient media are retained as historical assets, but cannot be assigned or selected in the current Home/School runtime.

## Changes and safeguards

The CHS wrapper is now `chs_ready/home_school_12_cell_wrapper_draft.js`. Its trusted-child deterministic assignment changes from hash modulo 18 to modulo 12. Cells 1–12 keep their role/event/order interpretation, but a child's hash may select a different cell under this new design. The new release/design labels distinguish it from the earlier design.

Old Family/all-pair preview overrides fail with an explicit out-of-date-link message before loading or starting a session; they are never silently relabeled. CHS preview retains temporary Back/Skip. Live participant routes remain tool-free, with trusted CHS identity and the same recording/consent architecture.

No audio, caption text, character art, entrance art, styles, animation or playback timing changed. The five approved r22 event recordings remain mapped as before. The reported School/Dad/Hug question is not repaired; it is no longer reached because Dad is no longer a recipient in this study.

## Verification

- `verify_home_school_two_role_scope.mjs`: exact baseline comparison protects 2,425 media files, all caption/audio/context contents, styles and runtime outside role selection/assignment/obsolete-link validation.
- `verify_home_school_entrance_rollout.mjs`: real main() execution for all 48 previews; 576 choices and 4,608 story pages; 12 unforced-variant participant configurations; Kid-only recipients; six distinct palettes per block; matched story/color/side/order across contexts; 50 obsolete overrides rejected.
- `verify_home_school_chs_wrapper.mjs`: all 12 cells plus 12,000 deterministic keys, out-of-range validation, no Family assignment, preserved consent/recording flow, preview-only researcher tools and live identity guards.
- `verify_home_school_review_board.mjs`: 48 distinct URLs; 24 original Woman/Man seeds preserved; both review directories match.
- Candidate, furnished artwork, welcome/title audio, historical audio imports, question timing, exterior palette and window greenery regression checks passed.
- Browser check: current r23 preview list has two role options and 48 links; one linked Woman/Home/Hug run loaded the current title, Back/Skip and “Story 1 of 12” exterior sequence. No child choice, CHS consent, camera prompt or participant submission was performed.

At preparation, the online CHS editor still exactly matched the r22 saved baseline (32,850 characters, SHA256 `8f50d45fd06d647eb33a857855d011643488bd444bce11359cca0a5cbea95dc7`). Deployment and final CHS draft save are recorded separately in `chs-draft-save-r23.md` after verification. No submission or activation is authorized.
