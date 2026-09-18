# R21 browser verification

Verified September 18, 2026 in the Codex in-app browser after normal browser access recovered.

The actual current app renderer, styles, and three repair helpers were loaded by a temporary local-only QA page. It did not start a participant session, recording, or audio. The page rendered fixtures in a resized iframe using the same assertions as the caption-layout test.

- 224 / 224 captions and equal-frame comparisons passed.
- 224 welcome/story outer-panel sizing comparisons passed.
- Four sizes: 900×600, 1280×720, 1650×720, and 1650×1000.
- Both Home and School, all three events, and four recipient types.
- 96 bouncing-choice checks and 96 caption-overlap paint-order checks passed.
- 112 corrected School image checks and 16 corrected HELP image checks passed.
- Host reduced motion was false; no accessibility preference was overridden.
- No failures were displayed.

A separate actual 12-story local runtime preview showed the repaired HELP SVG loading successfully, a themed house exterior, preview Back/Skip controls, identical entrance/choice frame dimensions (716.796875 × 403.1953125 at the default browser size), and choice layer 6 above caption layer 5. Screenshots were visually inspected.

These checks do not certify audio naturalness or an end-to-end CHS participant session. The original Home HELP event recording still needs a clearer “At” take; the user noticed it again during the actual local preview. Separate narration-delay improvements are not included in R21.
