# Who Helps Where? — prepared visual correction, NOT saved on CHS

**Historical preparation log — superseded:** normal browser access recovered later on September 18. R21 was subsequently browser-verified, deployed, and saved to the CHS draft without submission. See `chs-draft-save-r21.md` and `r21-browser-verification.md` for the current verified status. The entries below document the earlier blocked preparation phase.

Prepared September 18, 2026, from the verified r20 baseline `1eb0344`.

Candidate release: `chs-home-school-evelyn-v1-r21-visual-fixes-1`.

## Current status

- Local preparation only. No r21 commit, push, hosted deployment, or CHS source save has occurred.
- The last verified CHS draft remains r20, created/private and unsubmitted.
- Browser access was denied because the admin-enforced security policy could not be verified. Do not bypass this check or substitute other mechanisms to access CHS.
- User has authorized saving the update to CHS, but explicitly has NOT authorized submitting or activating the study.

## Included changes

- All 17 exterior palettes use their assigned character hue, including the interior curtain/detail pigment seen through windows. Original soft glass reflections and neutral blinds are protected.
- Door leaves and building use the same palette transformation and source coordinates.
- All 17 classroom backgrounds restore the tiny outdoor bush selection to original green. The indoor pot, windows, furniture, room geometry, and all other pixels remain unchanged.
- Runtime maps corrected classroom backgrounds before trial planning and media preloading, so empty-room, character, and test scenes use the same correction.
- Entrance, empty-room and character pages now share a 16:9 outer frame. The exterior/hallway stays below the caption within that frame, without changing the building or door proportions.
- Choice-button outlines and their glow/bounce now paint above the captions when they cross them.
- The welcome panel uses the same minimum sizing rule as story panels. The revised entrance stylesheet gets the new release token, preventing the previous stylesheet URL from being reused from cache.
- Native SVG masks remove only the exact trapped white background between the child's arms and box in 88 HELP foregrounds (44 trial variants). All 112 HELP files were audited; the 24 adult-recipient files do not need this repair. Original PNG files remain unchanged.

## Latest preview report and verification limits

- The renewed normal CHS access attempt on September 18 still failed at the admin-enforced browser policy check. No alternative browser/HTTP mechanism may be used to bypass it.
- Source/regression checks and native rendered palette/bush pixel checks pass. The new real-browser size/overlap test is prepared but browser verification is pending access restoration. Static checks are not a substitute for that verification.
- The foreground mask manifest is `data/help_gap_mask_manifest.json`; its focused test passes, including all 560 unchanged original PNGs, 88 rendered masks, 32,096 removed white pixels, zero outside-mask changes, runtime routing and release-token checks. Enlarged native-rendered before/after images were visually inspected. App routing applies the mask mapping before trial planning/preloading and records its version for HELP pages only.
- The researcher listened to both original Home / Kid / Help files and confirmed “At” is audible in the question, but not in the event. The event therefore needs a clearer whole-sentence Evelyn take. Preserve the question recording and approved r20 openings. No new audio has been installed; see `r21-audio-at-audit.md` for recording evidence and the browser-access blocker.
- Final local regression rerun passes: candidate design/audio mappings, furnished assets, CHS wrapper, welcome title/audio, 72-configuration entrance/runtime audit, strict r20-preservation scope, native palette/window pixel tests, HELP mask test, and diff whitespace. Browser-rendered scene-size/paint-order verification and the actual CHS preview remain pending; do not describe those as tested.

## Explicitly preserved

Approved r20 Evelyn house/school openings and every other recording; r19 Who Helps Where? title/welcome; 12 stories, 18 assignment cells, counterbalanced context order, no Likert items; preview-only Back/Skip; CHS consent/recording flow. Entrance animation timing remains byte-identical to r20. The newly authorized scene-geometry and choice-layer CSS changes are included; separate narration-timing, caption-sizing and cancellation changes in the older rollout checkout are not included wholesale.

## Resume safely

1. Restore normal browser access and read the current CHS draft source before modifying it. Preserve any intervening user edits.
2. Complete browser checks of the prepared candidate when the browser security check is available.
3. Publish the verified assets through the repository's existing GitHub Pages workflow, and verify hosted bytes before changing CHS's release pointer.
4. Save the draft source with the r21 release identifier; read it back and verify persisted contents.
5. Confirm the study is still unsubmitted and inactive. Do not use Submit, Change State, or activation controls.
6. Only after verified deployment/save, update candidate metadata and add a new CHS save receipt. The current metadata correctly records publication and draft-save as pending.

The prepared wrapper is `chs_ready/home_school_18_cell_wrapper_draft.js`; it must not be installed before hosted r21 assets are verified.

## Separate local preview supplied after the renewed save request

The normal CHS tab access attempt again failed at the same security-policy check. No CHS save, hosted publication, or browser-access workaround was performed.

A loopback-only development server was started on `127.0.0.1:8799`, serving this R21 checkout (not the older L checkout on port 8798). The process was verified listening. This supplies a user-openable local preview; it is not an end-to-end browser test or a CHS update.

Full 12-story, real-audio preview with temporary Back/Skip:

http://127.0.0.1:8799/versions/chs-home-school-evelyn-v1/index.html?v=chs-home-school-evelyn-v1-r21-visual-fixes-1&syntheticSpeech=0&ratingMode=none&contextStudy=1&withinChildContexts=1&context=HOME&roleSet=family&set=family&event=HELP&variant=a&seed=WTC-BOTH-FAMILY-HELP-A-7023VI&researcherTools=1&researcherToolbar=back-skip&researcherJump=1&skipParentSetup=1&previewIndex=0&downloadData=0

The event “At” retake, separate local narration/timing improvements, final browser verification, and CHS save remain outstanding. No submission or activation is authorized.
