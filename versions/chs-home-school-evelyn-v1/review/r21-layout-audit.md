# R21 scene-size and choice-overlay audit

Status: local changes prepared; rendered-browser verification pending. No publication, CHS save, or CHS submission was performed for this work.

## Bounded changes

- `entrance.css`: exterior, entrance animation, and empty-room pages now use the same total 16:9 scene frame as character, context, event, and choice pages. The caption is inside that frame rather than adding height above it. The empty room fills the complete frame at the same origin, `object-fit: cover`, and `object-position: 50% 57%` used after characters appear.
- `entrance.css`: the exterior/door/hall animation viewport starts below the existing `5.3cqw` caption strip. The building and cropped doors retain the native 1672:941 proportions; the smaller viewport clips lower foreground instead of covering the roof. Hall art uses proportional `cover` rather than stretching. Actual roof/hall appearance still needs a browser check.
- `styles.css`: character choice/name-cue boxes use z-index 6, above caption z-index 5. Existing glowing and bouncing animations are unchanged, including the reduced-motion override. This places the boxes in front if their animation crosses the caption.
- `styles.css`: only the Who Helps Where welcome panel overrides the old fixed 520px start-panel minimum with the same viewport-based minimum as story panels. Text, title, controls, narration, and welcome art are unchanged.

No `app.js` changes were made for this layout request. The separately prepared r21 palette/greenery routing remains intact, and all approved r20 audio and pre-existing manifests remain unchanged.

## Static geometry evidence

At the time of this audit:

- `styles.css:21` gives welcome and story screens the same `.ksize-shell` width and outer padding. Both use `.ksize-screen` from line 27. The welcome markup at `app.js:4412` has no story-image frame: it is an instruction panel with title, narration controls, and Start.
- `styles.css:193` now applies the same `calc(100vh - 42px)` minimum height to that specific welcome panel. The later mobile rule at line 3082 applies `calc(100vh - 20px)` to both panel types. These are minimums, not fixed heights, so short-screen content can still grow rather than clip. This does not claim every outer panel will have identical height when content exceeds its minimum.
- `styles.css:431` supplies every story scene width `min(100%, 1080px, calc(56vh * 16 / 9))` and aspect ratio `16 / 9`.
- `entrance.css:2` no longer overrides the scene aspect ratio to `auto`; `entrance.css:5` makes the stage an absolute full-frame layer. The removed relative caption rule can no longer add a second height to the exterior/entry scene. Thus for the same available width W, all story-scene frames have height `W * 9 / 16`, including their caption.
- Room layers before/after the entrance have the same full-frame bounds and crop anchor. Building-door coordinates, palette filters, and character geometry were not changed by the layout patch.
- `styles.css:465` and `styles.css:469` establish choice-box z-index 6 versus caption 5 in the same scene stacking context. The existing pulse and bounce are defined at lines 739 and 766, with bounce keyframes at 778. `entrance.css` retains the reduced-motion animation override.

## Verification performed

- `tests/verify_home_school_visual_fixes_scope.mjs`: PASS. Exact baseline-to-current comparisons permit only the approved r21 runtime hooks/release changes plus these named CSS edits. 853 protected r20 CSS/audio/data files are unchanged; 21 approved helper/output artifacts match their pinned hashes and the approved local source; 17 repaired School SVGs are accounted for. Last publication and CHS draft remain r20.
- `tests/verify_home_school_entrance_rollout.mjs`: PASS. All 72 role/event/variant/context-order review configurations remain valid: 864 choice pages, 6,912 story pages, eight pages per story, no Likert pages, correct cumulative reveals, audio preflight, and entrance lifecycle/replay checks.
- `tests/verify_home_school_caption_layout.mjs`: syntax check PASS. The rendered test was expanded to compare total scene size, full-frame room bounds/crop, exterior caption clearance, actual welcome/story outer sizing, animated choice-box/caption paint order, and reduced motion at four viewport sizes in both settings. Its new browser assertions have NOT completed a rendered run.
- `git diff --check`: PASS.

## Browser verification remains blocked

The attempted local rendered-layout check could not launch the browser: the process exited with SIGABRT/EPERM. The parent task independently retried the normal computer-use browser and confirmed the existing administrator security block. No alternate-browser, headless retry, permission escalation, or other workaround was attempted after that instruction.

Once normal authorized browser access is restored, run the prepared rendered-layout check and visually review welcome → exterior → entrance → empty room → characters → choices for both House and School. Confirm equal story-frame dimensions, full roof visibility, undistorted doors/hall, unchanged room framing, and glowing/bouncing boxes visibly in front of any crossed caption. Do not treat this static audit as a substitute for that visual approval.
