# Who Helps Where — r27 peer-review repairs

Prepared September 26, 2026. Release: `chs-home-school-evelyn-v1-r27-peer-review-1`.

## Scope

- Parent setup and assent narration now own and cancel their pending autoplay callbacks and ignore departed-page Listen/retry/toggle actions.
- Stopped/retried recordings release their media source, not just pause it. Cleanup is idempotent and ignores resulting abort/emptied events.
- Repeated `playing` or unchanged/tiny time updates cannot indefinitely reset the stall timer. A duration-aware total deadline additionally bounds abnormally slow playback. Ordinary startup failures retry once at 10 seconds per attempt; stalls retry once after 7 seconds without meaningful progress.
- Choice buttons still require successful question and option narration. Failure retains the answer gate and offers a visible audio retry; silence is not accepted as successful narration.
- All four parent pages offer quiet reading and a complete transcript. The preference applies within the current run, not across families. Listen remains an explicit one-page playback option. Child narration and its answer gate remain unchanged.
- Debrief explains that varying house-first/school-first order helps separate setting-related differences from practice or tiredness.
- The wrapper retains disabled CHS researcher navigation, including preview launches. Separate researcher review links retain their tools.
- Assignment rules, role pairs, settings, stimuli, approved Evelyn recordings, consent, recording, payment, and child-task wording are unchanged.

## Verification

- Media recovery: 48 configurations and 5,184 narration segments; regressions for departed-page callbacks, quiet-reading persistence, child gating, no-progress playback, media disposal and duration limits pass.
- CHS wrapper, furnished candidate, entrance rollout, follow-up behavior and review-board tests pass. Entrance checks cover 4,608 story pages and 576 choices structurally, not as browser traversal.
- Local browser: quiet reading carried through all four parent pages; complete transcript visible; child welcome Replay activated the narrator playback indicator; no parent mute control or researcher toolbar in the child section. This is a functional playback check, not a new perceptual audio-quality audit.
- The peer's exact frozen session was not reproduced. A stale-page narration defect was reproduced in a controlled regression; it is a plausible contributor, not a proven diagnosis of that session.

## Publication verification

- Implementation commit: `02c3164507d2bb4b3c630e5f41782400fa91ebd8`.
- GitHub Pages deployment **36233912559** completed successfully September 26, 2026 at **09:50:42 UTC**.
- The hosted candidate entry, app, styles and CHS wrapper all returned HTTP 200 and exactly matched the tested local bytes (SHA256 comparison).
- Local browser first story: choice buttons enabled after narration, disabled during Replay, enabled afterward, and selection advanced to story two. No browser error logs were present at that check. This does not claim all 48 conditions were traversed in a browser.
- Publication was verified independently of these subsequent status/documentation edits.

## CHS save still pending

CHS r27 save has **not** been confirmed. CHS requested researcher sign-in. The new debrief is in the prepared wrapper but not saved in the CHS editor. The previous verified CHS navigation-only save was September 23, 2026; no study submission or activation was performed.
