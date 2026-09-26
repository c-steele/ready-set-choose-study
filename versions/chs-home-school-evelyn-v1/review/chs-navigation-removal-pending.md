# CHS-only researcher navigation removal — saved September 23, 2026

## Completion

- Browser access was restored. Read the existing CHS study 6349 source and changed only the navigation flag and its adjacent explanatory comment, preserving all other saved content.
- Saved `HOME_SCHOOL_TEMPORARY_CHS_PREVIEW_CONTROLS = false` through the editor's code-panel Close control followed by **Save Changes**. Saving while the code panel was open did not commit the edit; the final save was performed only after verifying the form contained the intended source.
- Reopened the saved editor and verified all **32,680 characters** exactly matched the intended modified source, including the disabled flag.
- CHS overview still reported **created**, **Private**, **not active**, and **Study has not been submitted for approval**. No submission or activation occurred.
- Reran `tests/verify_home_school_chs_wrapper.mjs`: passed, including tool-free CHS previews/live launches and ignored parent-URL researcher flags.
- Hosted r26 child runtime and standalone GitHub researcher previews were not changed. No participant/camera/consent flow was launched.
- Peer feedback about audio stalling, debrief order explanation, and optional parent narration was investigated separately; those changes were not included in this navigation-only save.

## Earlier blocked attempt (historical)

User requested removal of Back/Skip on CHS after the verified r26 draft save.

- Local `chs_ready/home_school_12_cell_wrapper_draft.js` now sets `HOME_SCHOOL_TEMPORARY_CHS_PREVIEW_CONTROLS = false`.
- The updated wrapper regression test passes: CHS previews and live launches omit researcher navigation, even when parent URL flags request it. Recording, consent, assignment and identity handling are unchanged.
- Separate GitHub collaborator preview links are unchanged and retain Back/Skip.
- At that time, **the change had NOT been saved on CHS or published**. Two ordinary attempts to open the CHS editor failed because the browser's admin-enforced security policy could not be verified. No workaround was used.
- At that time, the last verified CHS save was the r26 wrapper described in `chs-draft-save-r26.md`, with the temporary CHS preview controls enabled. No submission or activation occurred.

The September 23 completion above supersedes the earlier pending-save status.
