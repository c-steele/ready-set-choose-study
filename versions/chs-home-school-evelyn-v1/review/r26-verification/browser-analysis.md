# r26 browser record analysis — partial

Status: **15 of 48 profiles recorded; 33 remain**. The unrecorded profiles are 16–48.

The local-browser traversal contains 1,440 story pages and 180 question pages. Comparison against the independent, exact-index runtime inventory found:

- Zero missing, duplicated or out-of-order pages.
- Expected captions, contexts, palette identifiers and assigned image paths on every recorded page.
- Expected dark caption text on the six pale palettes and white text on other palettes.
- Stable scene rectangle: approximately 716.797 × 403.195 px, at the same position on every recorded page. This is 16:9 at the tested viewport. Caption font stayed 20.0703 px.
- Zero caption overflows or incomplete image records.
- Exactly two correct helper buttons on every question; all 360 buttons recorded at foreground z-index 6.
- Zero browser logs or non-loading error notices.

There were 87 exact “Loading the sound… Please wait.” notices during rapid researcher Skip navigation. These were counted separately from errors, not discarded without disclosure. The final runtime debounces loading notices for 1.8 seconds; its unit regressions pass. These fast-navigation captures cannot establish natural audio pacing or whether a spoken word is intelligible.

The partial capture covers the Woman HUG profiles in both context orders; Woman FOOD Home-first A–D; and Woman FOOD School-first A–C. It does not include profile 16, the HELP runs or the Man runs. All 48 profiles were separately checked structurally in the runtime inventory, which is a different kind of verification.

Browser security-policy verification became unavailable. The remaining local traversal, hosted normal-paced/cold-cache checks, responsive checks and CHS draft save remain pending. No security restriction was bypassed. No r26 CHS publication, save or submission is established by this analysis.

Machine-readable details: `browser-analysis.json`. Re-run `analyze-browser-records.mjs` as further CUA browser records arrive; it marks coverage complete only after all 48 distinct run records exist.
