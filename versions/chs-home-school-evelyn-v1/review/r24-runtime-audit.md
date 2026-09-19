# Who Helps Where? — runtime, layout, and audio-routing audit

Audit completed 2026-09-19 01:33 UTC (September 18 in New York).

## Scope and outcome

The current design has **48 organized preview runs**, not 96: two role sets × three events × four visual profiles × two context orders. Each run contains twelve stories, eight story pages per story, and twelve helper choices. The kid is the recipient in every current story.

All 48 preview configurations passed the real story-builder/main-function structural audit: **4,608 story pages and 576 choices**. The local browser layout audit passed **224 representative caption/scene fixtures**, including both settings and four viewport sizes. Correct audio files and hashes were found for every current manifest caption containing “At”. These results do **not** certify that every spoken “At” is clearly audible or that every browser/network transition is delay-free.

Two current School/Kid question recordings still require listening verification; their prior machine-screening flags have not been resolved by the checks below. Historical Mom/Dad/Teacher-recipient audio flags are not current participant conditions.

This is a local pre-deployment audit. It does not certify a new hosted release or a CHS save. Release metadata still identified r23 when these tests ran. No participant session, consent, recording, submission, or activation was performed by this audit.

## Measured test results

| Check | Result | What was established |
|---|---|---|
| `verify_home_school_entrance_rollout.mjs` | PASS | 48 preview runs; 576 choices; 4,608 pages; 12 assignment cells; 36 eligible source trials; 9 unique pairings; 11 eligible palettes; all recipients Kid; matched six-story Home/School blocks. |
| Same runtime audit: participant assignment | PASS | Twelve unforced-variant participant configurations plus twelve fully hashed configurations; all six pairings repeated in both contexts with the same colors and side placements. Fifty obsolete-role main-entry overrides rejected before asset loading/session initialization. |
| Same runtime audit: retained sources and lifecycle | PASS | 336 source story/event/context combinations, including archived assets; eight-page sequence, ordered character reveals, 17 hallway palettes per context, audio fail-closed behavior, entrance cancellation/replay cleanup, and room narration waiting for entrance completion. |
| `verify_home_school_followup_runtime_behavior.mjs` | PASS | Story-specific Home/School room selection, location caption appearing once, and narrator-mouth state responding to simulated playing, buffering, pause, empty, stop, and end events. Follow-up coverage is compatibility coverage; current runs have no ratings/follow-ups. |
| `verify_home_school_chs_wrapper.mjs` | PASS | Twelve deterministic cells; 12,000 sample child keys; trusted CHS identity handling; intact seven-stage consent/recording/game/exit structure; preview-only Back/Skip; no researcher tools in live runs. This executes a local mock host, not the actual CHS site. |
| `verify_home_school_review_board.mjs` | PASS | 24 base profiles/48 order-specific links; twelve cells; nine unique pairings; Woman/Man roles only; three events and four visual profiles. |
| `verify_chs_home_school_candidate.mjs` | PASS | Current design metadata, caption/audio mappings, source existence and hashes; 46 context-audio records, ten Teacher/Classmate records, and retained historical imports. The output's “published” flags describe stored r23 metadata, not a new deployment receipt. |
| `verify_who_helps_where_welcome.mjs` | PASS | “Who Helps Where?” title and parent/child naming agree; welcome palette scoped; autoplay/replay use the same canonical Evelyn recording; 620,713 bytes, 15.490612 seconds; original export retained. |
| `verify_home_school_directional_audio_import.mjs` | PASS | Immutable historical audio receipts, current r20 openings and r22 split-event mappings, all question recordings unchanged. This is provenance/routing validation, not listening. |
| `verify_home_school_question_audio_pauses.mjs` | PASS | All 24 retained context-first question recordings decode, match hashes, retain short natural opening-context boundaries, and contain no internal silence ≥400 ms under the test's −38 dB criterion. Only six Kid-recipient questions are current; other recipients remain archived. |
| `verify_home_school_furnished_candidate.mjs` | PASS | Retained 56 source trials/17 palettes/560 foreground pages/1,120 contextual source scenes and compatibility follow-ups. These counts include archived conditions and are not the count of active versions. |
| `verify_home_school_caption_layout.mjs` | PASS | Real headless Chrome: 224 captions, 224 equal-scene-frame checks, 224 welcome-panel comparisons, 96 bouncing-choice checks and 96 actual caption-overlap paint-order checks across four viewports, two settings and three events. Reduced-motion behavior also passes. |
| `verify_home_school_two_role_scope.mjs` | EXPECTED HISTORICAL-GATE FAILURE | Frozen r23 design-only gate rejects the new yellow-background hooks in `app.js`; it permits role changes only. Current role/assignment behavior passes the independent runtime tests above. This historical gate was not weakened or represented as passing. A release-appropriate r24 scope gate is needed for the new visual release. |

The generic `verify_researcher_back_preview.mjs` also passed, but it targets the separate v81/96-link study. It is **excluded** from the Who Helps Where? coverage claim. Current Back/Skip coverage comes from the current CHS wrapper test.

## Current “At” caption/audio inventory

A separate read-only check examined the current Kid-recipient context specifications, selected every caption containing standalone “at”, and required exactly one active exact-text mapping, matching audio path, file existence, byte count, and SHA-256. **Twelve captions/twelve files passed**:

- Two “They are all at the kid's…” setting confirmations.
- Four event statements: Home Food/Help and School Food/Help.
- Six questions: Home/School × Hug/Food/Help.

The Hug event statement itself is “Oh no! The kid in the middle is sad now!” and contains no “At”; it therefore was not incorrectly counted as a missing-At mapping.

Three of the five earlier r22 joined event recordings are current: School/Kid/Food, School/Kid/Help, and Home/Kid/Help. Their recorded join gaps are approximately 302, 296, and 301 ms. The other two r22 replacements were adult-recipient cases retained only for history. Prior source approval, hash/signal checks, and machine recognition are distinct from a fresh listening review of the final delivery.

## Issues and follow-up status

### NEEDS LISTENING VERIFICATION — two current questions

1. **School/Kid/Hug** — “At the kid's school, who will give the kid in the middle a hug now that they're sad?”
   - Active file: `assets/home_school/generated/audio/hs_r15_013_school_kid_hug_question_context_first.mp3`
   - SHA-256: `fac54d5949f7854f92c8557e6640984857dc2aca325ca50a0e3ad942031b59a0`
2. **School/Kid/Help** — “At the kid's school, who will help the kid in the middle pick up the heavy box?”
   - Active file: `assets/home_school/generated/audio/hs_r15_015_school_kid_help_question_context_first.mp3`
   - SHA-256: `f0e759d4622a7519500e990f66cbf91d4c9d0127ec6a1ff86f2a1bf5d2454532`

`review-at-audio-status.md` documents six prior question auditions awaiting approval/installation. `review-at-audio-stt-base-en.json` flags the two current files above and identifies those exact current hashes. This is **screening evidence, not proof that “At” is absent**. The earlier Dad-in-the-middle question and other Mom/Dad-recipient flags are outside the current study. No new audio was installed by this audit.

### NOT REPRODUCED AS A CURRENT LAYOUT FAILURE — slide size, captions, and glowing boxes

The real-browser fixtures have equal scene dimensions, captions fit the scene, and the animated choice boxes paint in front of captions when they overlap. This is meaningful browser evidence, but it is not a screenshot inspection of all 4,608 pages. Fixtures cover representative shared layouts, including archived recipient layouts as extra regression coverage. Artwork/color-mask inspection is separate from this runtime report.

### NOT FULLY MEASURED — long pauses/freezing

Tests establish preload-list construction, missing-audio fail-closed behavior, event/timer cancellation, and playback-driven mouth state. They do not emulate all real network speeds, audio decoder delays, device performance, or the actual CHS iframe. The question-silence check addresses silence inside files, not waiting before playback. Do not describe all perceived timing issues as resolved solely from these results.

### RELEASE CHECK STILL REQUIRED — new hosted assets and CHS draft

After final visual changes and release-token updates, rerun relevant behavioral tests against the final files, verify hosted bytes and the CHS saved/reopened source, and retain a separate save receipt. Saving a draft is not submission; this audit does not authorize or perform submission/activation.

## Coverage boundaries

- The 48-run test executes the actual app story builder/main logic in a minimal JavaScript host. Optional visual helpers are not loaded in that host, so it does not verify the final yellow/greenery/foreground SVG composition. Dedicated pixel/routing tests and browser artwork review cover that layer separately.
- The caption test renders actual markup/CSS in Chrome without audio, participant identity, or CHS access. Its first sandboxed launch failed environmentally; the same test passed in a temporary permitted headless profile. No production/browser-account state was used.
- Audio tests establish source integrity, textual routing, decoding, and selected silence measurements. No new human listening certification or speech-recognition pass was performed in this audit.
- A passing mock wrapper test is not evidence that new source has been saved on CHS. The actual saved draft must be read back independently.

## Audited snapshot hashes

These hashes identify the local pre-r24-token snapshot tested here; later release-only changes should receive a new release receipt rather than silently inheriting this snapshot identity.

| File | SHA-256 |
|---|---|
| `versions/chs-home-school-evelyn-v1/app.js` | `03611df28c0d3c8990c606b7610ecbd38bb504d6f6575dffe7156e6d731df20d` |
| `chs_ready/home_school_12_cell_wrapper_draft.js` | `ca7a661359a18ce30faad2ade01e99c48b39f96492507c89a24fa15d055324cc` |
| `versions/chs-home-school-evelyn-v1/data/home_school_context_manifest.json` | `c436807f3cde100ec5d5a63da532d4c37819d1c11002eadca7c7079b9bd037b5` |
| `versions/chs-home-school-evelyn-v1/data/home_school_audio_manifest.json` | `2f9d11451bb871030447cf2e7cb1515005c230d334eaed0ff837f05fd97c49d9` |
