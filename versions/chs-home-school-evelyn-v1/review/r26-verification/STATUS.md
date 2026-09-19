# Who Helps Where? — r26 repair status

19 September 2026. Release: `chs-home-school-evelyn-v1-r26-complete-polish-1`.

## Current status

The flagged active-study defects have implementations and passing scoped regression checks. **r26 is published and saved to CHS as a private, inactive draft that has not been submitted.** The saved configuration was reopened and matched the intended wrapper. No study-design, consent-rights, participant-data or submission changes were made. The proposed 12 unique story colors were not implemented; matched Home/School stories retain the same palettes.

Browser security-policy verification became unavailable during the earlier review and ordinary retries continued to fail. No alternative route was used to bypass that restriction. Publication and draft saving have since been verified; the interrupted browser coverage remains incomplete.

## Fix-by-fix result

| Flagged issue | Local r26 treatment | Evidence / remaining boundary |
|---|---|---|
| White wedges around FOOD helpers and bowls | Bounded transparency masks on all 36 active variants' event and choice illustrations | 72 repaired SVGs; zero changes outside masks; original rasters retained. All 144 Home/School composites visually inspected. |
| Violet speckling on Teacher–Kid–Classmate strawberries | Clean matching-side fruit pixels restored in 14b/14d | Four event/choice layers; character, label and bowl geometry protected. |
| Blocky coloring in exterior windows | House tint restricted to eight curtain silhouettes; school glass/blinds restored to source | All 17 stored palettes tested. Protected glass, lamp and mullion checks pass. Both approved yellow exteriors remain pixel-identical to r25. |
| Weak pale-theme caption and role-label contrast | Dark lettering on six pale themes, without changing character/theme colors | All 180 wrappers pixel-tested; contrast 5.30–10.76:1. Original image bytes retained. |
| Weak “At” in two current School questions | Installed clean whole-sentence Evelyn retakes for Kid/Hug and Kid/Help | Both pass fresh unprompted word screening and decode/peak checks. Human naturalness review remains necessary; the review page has both clips. Other recordings, including approved opening pauses, unchanged. |
| Delayed first-use introductions/options | Preload actual assigned final artwork and every assigned narration segment | All 48 profiles checked; no missing narration or files. Unused events, archived roles and original remote slide images excluded. |
| Potential indefinite loading/audio waits | Bounded startup, JSON, picture and playback deadlines; explicit retries; answers remain locked until narration finishes | Simulated timeout, error, stall, replay and cancellation tests pass. Slow-network real-browser verification remains pending. |
| Old audio continuing after navigation | Cancellation guards and immediate handling of image-promise failures | Replay/Skip/page-exit regression tests pass; no silent voice replacement. |
| Excessive intentional pauses | Entrance shortened from 10.1 to 6.5 seconds; after-narration pause from 1.2 to 0.4 seconds | Consistent timing across both settings; recorded speech and approved internal phrase gaps unchanged. Final normal-paced listening remains pending. |
| Parent-facing jargon | Purpose/debrief aligned with the user's preferred wording | Updated wrapper saved to CHS and read back byte-for-byte after trimming trailing whitespace. |
| Misleading old review tools | r11 gallery marked archived; current directory and researcher review board point to r26 | Historical records preserved. Coverage explicitly distinguishes automated checks from browser review. |

Already-repaired yellow doors/interiors/halls, HELP arm gaps, green outdoor bushes, foreground choice highlights and consistent scene dimensions remain in place. Study assignment, pairings, source character identity/colors, story order and narration captions are unchanged across the full r25-to-r26 structural comparison.

## Completed verification

- 13/13 current non-pixel acceptance tests pass.
- All 48 organized profiles checked structurally: 4,608 story pages, 576 choices, 36 active source variants, 11 active palettes.
- All 258 assigned SVG resources are self-contained; no hidden external SVG dependencies.
- Food, caption contrast, exterior-window and audio replacement regression checks pass.
- Actual local browser traversal completed profiles 01–15: 1,440 pages and 180 choices. No recorded broken images, caption overflow, sequence errors, wrong image/palette routes or scene-size changes; all 360 choice boxes have the expected foreground stacking order. Independent visual review covered all 180 captured choice screens.
- Browser traversal used researcher Skip, so it is not continuous audio-listening or normal-playback certification. The final loading-notice debounce/cancellation refinements were unit-tested after the browser interruption; the lossless wrapper optimization was pixel-tested but not re-browsed.
- Implementation commit `b81f71a68cd46e08ff79f135d4bb8538e08561c3` was published by successful Pages run `35448035457` at 14:14:04 UTC on 19 September 2026. At 14:18:05 UTC, all 15 selected hosted files returned HTTP 200 and matched local SHA256 hashes.
- CHS study 6349 was saved through **Save Changes**, then reopened. The persisted 32,677-character wrapper matched the intended trimmed source, SHA256 `388c528f23b6bdf9cf8659cfa42be8ac1c82861d05451144dc579c1a3394728b`. CHS showed **created**, **Private**, **not active**, and **Study has not been submitted for approval**. See the [save receipt](../chs-draft-save-r26.md).
- The official preview portal loaded the correct title and description. It requires **Select a child / Preview now** to continue; no child was selected and the embedded study flow was not entered.

## Still required before calling the release ready

1. Finish browser profiles 16–48, plus a short final-code recheck of the earlier profiles.
2. Check cold-cache loading, normal-paced audio/animation, and responsive layouts; listen to the two replacement questions.
3. Continue the actual embedded CHS preview with the researcher. Child selection and any consent, camera or recording step remain a user handoff; no child identity or consent should be fabricated. Preserve private/inactive/not-submitted status.

There is no assurance of zero defects on all devices. Media is approximately 21.3–30.8 MB of images plus 4.1–4.34 MB of assigned audio per organized preview (parent setup adds more); the new preload/retry behavior is not an unconditional speed claim on slow networks.

Published review: [r26 changes and audio](https://c-steele.github.io/ready-set-choose-study/review-r26-fixes.html?v=r26-saved). The saved CHS configuration now points to r26: [CHS preview](https://childrenhelpingscience.com/exp/studies/981133ce-7d08-4801-9c31-0ae72400e135/preview-detail/).
