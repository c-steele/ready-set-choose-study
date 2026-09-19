# Who Helps Where? — 48-run first-choice visual audit

## Outcome

All **48 first-choice screenshots** were visually reviewed. Captions, character labels, setting backgrounds, and glowing-choice borders are present and fit in the captured frames. The current central-Kid HELP scenes do not show the previously reported large white wedges around the box.

**One confirmed visual issue remains open:** FOOD foregrounds retain opaque white cutout areas inside the outer helpers' arms, above the strawberry bowls. This audit must not be summarized as “all artifacts resolved.”

This is a local browser-preview audit, not a hosted-release or CHS-save certification. No participant session, consent, recording, submission, or activation was performed by this reviewer.

## Exact coverage

Evidence was captured by the main browser operator in `/private/tmp/whw-browser-r24/`:

- `run-01.png` through `run-48.png`: all 48 first-choice screens visually inspected.
- `browser-audit.json`: 48 run records, eight recorded first-story DOM snapshots per run, **384 recorded snapshots** total.
- Every screenshot has a 1280 × 720 viewport.
- Every run's recorded final choice-scene size is exactly 716.796875 × 403.1953125 CSS pixels.
- Every run's final `brokenImages` array is empty.

The DOM snapshots are not 384 separately inspected images. Entrance-animation snapshots sometimes repeat “Oh look!” / “approaching” while a transition is still running; therefore they are not proof of 384 distinct settled story-page appearances. This audit does not claim a human/visual review of all 4,608 story pages or all 576 helper choices.

| Screenshots reviewed | Character set | Event | First setting / profiles |
|---|---|---|---|
| 01–04 | Mom / sister | HUG | Home / A–D |
| 05–08 | Mom / sister | HUG | School / A–D |
| 09–12 | Mom / sister | FOOD | Home / A–D |
| 13–16 | Mom / sister | FOOD | School / A–D |
| 17–20 | Mom / sister | HELP | Home / A–D |
| 21–24 | Mom / sister | HELP | School / A–D |
| 25–28 | Dad / brother | HUG | Home / A–D |
| 29–32 | Dad / brother | HUG | School / A–D |
| 33–36 | Dad / brother | FOOD | Home / A–D |
| 37–40 | Dad / brother | FOOD | School / A–D |
| 41–44 | Dad / brother | HELP | Home / A–D |
| 45–48 | Dad / brother | HELP | School / A–D |

Inspection used labeled, four-column contact sheets containing the full stimulus rectangle from each screenshot. Full-viewport individual images 01, 17, 18, 33, 34, 35, 41, and 42 were additionally inspected at native resolution. Temporary sheets are `contact-01-12.png`, `contact-13-24.png`, `contact-25-32.png`, `contact-33-40.png`, and `contact-41-48.png` in the same evidence folder.

## Checks that passed within the captured scope

- **Palette consistency:** the captured caption/character colors agree, and room accents match their displayed palette. No missing or obviously wrong-setting background was seen.
- **Captions and labels:** no text overflow, cropped caption, missing role label, or missing image was observed. The middle recipient is Kid in every captured choice scene; the two helper names agree with the two outside characters.
- **Choice-border layering:** the visible upper edges of glowing borders appear in front of captions where they overlap in these static captures. A still image is not a complete audit of every animation phase.
- **Scene size:** final choice-scene dimensions are identical across all 48 DOM records. This does not independently prove constant size through every intro/entrance transition.
- **HELP cutouts:** the middle Kid/box region appears clean in the 16 HELP first-choice screens. Native-resolution checks of 17, 18, 41, and 42 did not show the previously reported large white arm/box gaps.
- **Loading:** final choice-state image diagnostics reported no broken images in all 48 runs.

## Open finding — FOOD helper cutouts

The most unambiguous examples are screenshots **33–40**. White wedges remain between the outer helpers' torsos and arms, immediately above the strawberry bowls. The white regions remain visible in school scenes against the darker room furniture, so they are not merely the light rug showing through.

Run 33, Dad–Kid–Brother, provides a reproducible pixel-level example:

- Foreground: `assets/home_school/foregrounds/7a/food_02.png`, relative to this version directory.
- Foreground size: 1920 × 1080, RGBA.
- Source coordinates `(1489, 684)` and `(1677, 684)` are both **RGBA `[255, 255, 255, 255]`**: fully opaque white in the right Brother's inner-arm gaps.
- Adjacent body sample `(1570, 698)` is RGBA `[137, 61, 246, 255]`.
- Those white samples map approximately to screenshot positions `(838, 345)` and `(908, 345)`.

This is a foreground transparency/compositing issue, separate from the yellow background masks. No foreground repair was made by this audit. It remains open until corrected files and fresh browser captures are checked. The broader set of FOOD foregrounds should be examined rather than fixing only the sample above.

## Startup-wait observation

The main browser operator reported that initial cold starts for runs **26, 35, 36, and 37** exceeded the Start-wait deadline, then eventually became ready without an application error. This is recorded as an **observed startup wait**, not diagnosed as a freeze. These screenshots and DOM snapshots do not establish the cause or certify that playback is free of pauses on all networks/devices.

## Important limits and follow-up

1. **Bright yellow is not represented in these first choices.** None of the 48 first-story choice screenshots uses the bright-yellow `#FFD100` Mom–Teacher / Sister–Friend palette. Gold Teacher–Friend and Mom–Sister screenshots are a different palette. The main operator subsequently captured and visually checked the actual yellow trial 5b choice screen in both settings (story 6, previewIndex 48, Woman/Hug/B seed WTC-BOTH-WOMAN-HUG-B-1S88MHC), saved as `yellow-home-choice.png` and `yellow-school-choice.png`. The DOM confirms loaded `yellow-interior-cleanup-v4/house-room.svg` and `school-room.svg`, plus the unchanged 5b foreground. These two focused captures supplement—not replace—the four full-size interior/hall and two exterior asset reviews. Directly jumping to a choice can require pressing Replay to satisfy browser audio-gesture requirements; it is not an end-to-end listening test.
2. **Release query values are mixed in the browser evidence.** Runs 01–24 retain `v=chs-home-school-evelyn-v1-r23-two-role-sets-1`; runs 25–48 use `v=chs-home-school-evelyn-v1-r24-yellow-cleanup-1`. All evidence URLs point to the local port-8800 checkout. These query strings do not prove which bytes were deployed publicly; hosted-byte and CHS-source readback checks remain separate.
3. **Audio is outside this visual review.** A visible “At” in a caption does not demonstrate that the recording clearly says “At.” No new listening certification is claimed.
4. **Later stories and transitions are not visually covered here.** This review concerns the first helper-choice frame in each organized run, not every later pairing, every animation frame, or the entire child session.
5. The local preview directory's stale visible “r23” labels were reported during the audit; the main operator confirmed their correction. That label correction is not a hosted deployment receipt.

See `r24-runtime-audit.md` for the separate structural/layout/audio-routing test coverage and its limitations. Keep the open FOOD foreground issue visible in the overall release status.
