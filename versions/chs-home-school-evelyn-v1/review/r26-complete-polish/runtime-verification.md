# r26 runtime verification

Release: `chs-home-school-evelyn-v1-r26-complete-polish-1`.
Date: 2026-09-19. This is runtime/asset verification, not a claim that every recording has been personally listened to or every browser pixel inspected.

## Changes implemented

- Preload is derived from the final assigned timeline, including actual composed image sources, canvas reveal sources, and SVG image references. Welcome, introductions, options and ending narration are included. Unassigned events, archived recipient audio and raw source slides are not loaded merely because they appear somewhere in the manifest.
- Missing required narration throws rather than silently disappearing from the preload list. All assigned media must finish loading before the game begins.
- The media loader has a 90-second deadline and a visible “Try loading again” button. Required JSON requests have two bounded 15-second attempts before presenting the startup error screen. The retry preserves the assigned URL.
- Playback has two attempts: 10 seconds to start, or 7 seconds without playback progress. A retry restarts the whole recording, never seeking past the start of “At.” A total playback deadline also prevents an indefinitely progressing/broken file. The page visibly says it is loading/retrying; after failure it offers an explicit audio retry. Answer buttons remain disabled until the page’s complete narration succeeds.
- Pending playback is canceled cleanly on Replay/Skip/page exit. Welcome and closing sequences now check generation tokens so canceled speech cannot restart music or a later clip after the page has been left. Intentional cancellation is not logged as an audio-load failure.
- Loading notices are debounced by 1.8 seconds, including stalls; ordinary short transitions do not flash a warning. Real playback progress removes the notice. The retry deadline is not extended by repeated buffering events.
- Character reveal images have a 10-second deadline, a visible picture retry, and failed-cache eviction so a failed request cannot poison subsequent Replay attempts.
- Eager reveal-image promises are handled immediately so a very fast researcher Skip cannot leave an unhandled rejection before the playback timer gets to await the image.
- New additive slide provenance records food artwork repair, caption contrast, exterior palette version, entrance duration and auto-advance pause. Response meanings and assignment fields are unchanged.
- The researcher review board and its links now identify r26.

## Exact-condition coverage

The inventory executes the production app with the actual `index.html` configuration and these exact modules, in index order: exterior palette, window greenery, yellow backgrounds, HELP gaps, FOOD artwork and caption contrast.

- 48 organized preview profiles; 4,608 story pages; 576 question pages.
- All 36 eligible source variants and all 11 eligible palettes.
- Every assigned narration segment is present in the preload list.
- All assigned media paths exist locally.
- 258 distinct assigned SVG resources were inspected recursively, including nested base64 SVGs. They are self-contained: zero external file dependencies were found inside those SVGs. Inline data URLs are not added as separate external preload entries.
- Food repair routes and pale-caption contrast provenance are present on all relevant assigned pages.
- Every story page reports the intended 6,500 ms entrance duration and 400 ms inter-page auto-advance pause.
- Comparing all 48 r25 and r26 inventories found **zero changes** in story number, page kind, context, trial ID, pairing, palette, character hex or caption. This is a media/presentation repair, not a redesign of the experiment.

## Tests run

Passing current tests:

- `verify_home_school_media_recovery.mjs`: all 48 configurations / 5,184 narrated story segments, missing-required-audio rejection, assigned-source exclusions, SVG dependencies, two-attempt start/stall/error handling, explicit retry, cancellation, no leaked timers, actual bundled preload timeout behavior, required JSON timeout, image timeout/retry, welcome/closing teardown and false-failure-counter prevention.
- `verify_home_school_followup_runtime_behavior.mjs`: original runtime behavior assertions retained; test DOM updated only to support real status-notice elements.
- `verify_home_school_furnished_candidate.mjs`: media-listener inspection now recognizes direct and grouped registrations and additionally requires `stalled` handling.
- `verify_home_school_entrance_rollout.mjs`: 48 review profiles, 4,608 pages and lifecycle behavior; expected phase checkpoints updated for 6.5-second entrance and 400-ms gap.
- `verify_home_school_review_board.mjs`: 24 base configurations / 48 order-specific runs, preserved historical seeds and current release links.
- `review/r26-complete-polish/condition-inventory.mjs`: exact live-entry helper configuration, all 48 profiles, dependency/routing/provenance checks.

The final selected non-pixel acceptance batch is **13/13 PASS**, with details in `../r26-verification/current-tests.json`. It additionally covers current candidate/audio provenance, welcome, CHS wrapper/recording architecture, directional-audio import, question pauses, r26 clear-At questions, exterior palette and window-greenery routing. Historical frozen-release scope gates were not rewritten into r26 tests; browser-starting legacy tests were not used outside CUA.

## Remaining verification boundaries

- Real-browser cold-cache timing, responsive layout, continuous audio listening and animated border painting remain separate checks. Publication and the CHS saved draft have now been verified as recorded below; VM tests alone do not establish those facts.
- With the final flattened/self-contained artwork wrappers, preview image payloads are roughly 21.3–30.8 MB, plus 4.1–4.34 MB of assigned audio (parent setup adds more). Therefore this change fixes missing preloads and recovery, but does **not** justify an unconditional speed claim on slow networks. The 90-second loader deadline remains explicit and fail-closed.
- Browser screenshots captured through rapid researcher Skip are suitable for visual/routing checks, not natural playback timing or audio intelligibility. A transient loading notice during such skipping is not by itself evidence of a participant-facing freeze.

## Browser coverage and remaining handoff

The collected r26 local browser records cover **15/48 profiles**, **1,440 pages**, and **180 questions**. All 1,440 recorded pages have the expected caption, context, palette, final image routes, caption color and stable scene geometry. The 360 recorded choice buttons have the expected labels and foreground stacking order. No incomplete images, caption overflows, page-sequence skips/duplicates, browser logs or non-loading error notices were recorded. Eighty-seven transient loading notices were recorded during rapid navigation before the final notice-debounce refinement; these are counted separately, not silently dropped. This is **not** complete browser coverage.

Browser security-policy verification subsequently became unavailable. No alternative browser-control route was used to bypass it. The incomplete browser coverage remains an open verification boundary:

1. Continue local browser traversal for profiles 16–48 and finish visual review.
2. Run hosted, normal-paced cold-cache/audio and responsive-layout checks.
3. Continue the actual embedded CHS preview with the researcher; the verified portal requires child selection before **Preview now**. No child was selected, and no consent, camera, recording or participant response action was taken. **Do not submit or activate.**

## Publication and CHS saved-draft verification

Implementation commit `b81f71a68cd46e08ff79f135d4bb8538e08561c3` was published successfully in Pages run `35448035457` at 14:14:04 UTC on 19 September 2026. All 15 selected hosted files returned HTTP 200 and matched local SHA256 hashes at 14:18:05 UTC: entry, app, three changed repair helpers, two manifests, both new audio files, two yellow FOOD contrast files, both repaired strawberry variants, CHS wrapper and review page.

CHS study 6349 was saved through **Save Changes** and the editor reopened. The persisted 32,677-character source matched the intended wrapper after `trimEnd()`, SHA256 `388c528f23b6bdf9cf8659cfa42be8ac1c82861d05451144dc579c1a3394728b`. The saved release is `chs-home-school-evelyn-v1-r26-complete-polish-1`. CHS remains **created**, **Private**, **not active**, and **not submitted for approval**. The official preview portal loaded the correct title and description; the embedded study flow remains a researcher handoff. See the [save receipt](../chs-draft-save-r26.md).

This verifies publication and draft persistence without claiming complete browser or normal-playback coverage. The proposed 12 unique story colors were not implemented; study design and matched Home/School palettes are unchanged.
