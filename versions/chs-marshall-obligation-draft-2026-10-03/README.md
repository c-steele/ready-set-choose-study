# Full-session obligation draft

Full-session revision, September 28, 2026. Open `index.html` in the local preview; choose **Try the session** or **Full storyboard**. `SCRIPT.md` contains every spoken prompt, response set, conditional rule, and reminder. The storyboard also has a print/save as PDF control.

Current October 3 explicit-outcome revision: **209 active narration clips, 149 retained recordings connected and 60 new recordings pending**. The changed questions have no substituted older audio. Their saved NaturalReaders project is **Marshall explicit outcome Evelyn 2026-10-03**, with all 60 ordered paragraphs verified at Evelyn / Soft / 0.80× / 160 WPM / paragraph pause 0; its export file has not been retrieved or imported. Recorded session timing is unavailable until that batch is complete, so the preview uses the current script's illustrative read-aloud estimate.

### Child view

Choose **Child view**, or open `index.html?set=woman&practice=each&view=child`, to see the child-facing presentation. It follows the existing Find the Caregiver / Who Helps Where look: soft blue/cream surround, a white play area, compact captions matching the characters, a story badge, the yellow helper, blue Listen/Replay, and green Continue. **Researcher view** returns to pairing menus, jumps, script exports, timing and source notes at the current screen. The questions, branch rules, stimulus files and NaturalReader recordings are shared between both views.

Visual references: `Find_the_Caregiver_Zoom_Facilitator/versions/chs-v78-teacher-classmate-evelyn-unique-roles/styles.css` (used by the v80 CHS runtime), and `work/who-helps-where-visual-fixes-r21/versions/chs-home-school-evelyn-v1/styles.css` (Who Helps Where r27). Those original studies are unchanged. This remains a local presentation draft; it is not a deployed Lookit study or participant-data collector.

The preview includes three existing Find the Caregiver sets of six pairings each, plus an all-18 researcher review view (14 distinct pairing labels). It preserves visual plan 4, including the original orange mom-left/sister-right illustration. All stories use sadness on plain backgrounds. Adult recipients in the family set remain mom, dad, or teacher; their original introductions establish their relationship to the kid. It adapts the question sequence of Marshall et al. (2022), Study 1. No existing study was edited.

## What is included

- Guided character introductions using cumulative reveals and on-screen taps.
- Need narration, with both helpers seeing that the kid is sad.
- Separate binary prediction questions for both helpers.
- “Have to” practice after prediction and before obligation.
- Separate binary obligation questions, each with a conditional strength follow-up after Yes.
- A fixed outcome in which neither helper helps, regardless of responses.
- Global recall and overall Mean/Nice evaluation; proposed overall strength follow-up after Mean.
- Per-helper recall and Mean/Not mean evaluations; conditional strength after Mean.
- One comparison between the two helpers per story.

Each six-story set has 48 main judgments. With practice every story, the ordinary correct-practice path has 139–169 screens and 102–132 responses; the full storyboard has 175 possible cards. With practice once, these become 114–144 screens and 87–117 responses (145 possible cards). Conditional cards are skipped in the player according to answers.

The illustrative estimate is approximately 20–35 minutes with repeated practice, or 16–29 minutes with practice once, before breaks/corrections. It counts actual script/choice words at 110–130 words/minute and 3–5 seconds per selection; it is not an observed child duration. Navigation-only delays and extra option-reading pauses are excluded. A start/pause/reset timer records the reviewer’s preview time and labels jumps or untimed progress as partial.

Pairing and practice selectors rebuild the session and its script download. SCRIPT.md is the default mom/sister set with repeated practice; SCRIPT-{woman,man,family,all}-{each,once}.md provides all combinations. The full storyboard includes every possible follow-up and can be printed. Practice once is a new adaptation; the captured Marshall survey repeated practice.

## Source limits and draft decisions

The overall intensity prompt **and response wording** are reconstructed and visibly flagged: the supplement confirms score levels but the exact spoken follow-up was not recovered. Practice strength routing and reminder text are draft implementation choices. The published obligation-helper order was randomized; this preview fixes story order and asks helpers from left to right. Checks permit retries or facilitator continuation and do not reproduce research exclusion rules.

This is a two-helper sadness adaptation, not an exact copy of the original three-helper injury/hunger stories. Generic “help” remains in the questions. Original Find the Caregiver trait/Likert questions and forced-choice hug prediction are omitted. Marshall conditional strength questions remain.

October 3 practice presentation revision: the stop-being-mean practice item reuses the actual Find the Caregiver teacher and kid artwork from the green mom/teacher introduction. Inline SVG crops preserve the original shapes, eyes, mouths, and hands. Its palette follows the current story’s exact `visualHex`; the color mapping preserves black, white, and antialias blends. Square Futura-style role bars and Helvetica Neue captions match the existing study. The speech bubble and split display wording are adaptations; `SCRIPT.md` retains the full Marshall read-aloud prompt. Question wording, recordings, response controls, scoring, and branching are unchanged.

The original images are reused unchanged via pairing-catalog.json. They come from the archived plain foreground images, the previously reviewed orange mom–sister images, the corrected brother introduction, and native teacher–classmate SVGs. The web layout hides their old banner and adds the adapted prompt as text. The earlier September 28 narration package used Evelyn / Soft / 0.90× across its 195 recordings, including the exact existing opening. The current revision retains 149 exact recordings and has 60 new prompts/reminders pending at the settings stated above. No webcam, microphone, persistent responses, or survey submission is implemented.

September 28 option-cue revision: all seven three-choice strength screens use FTC-style option boxes. **Read choices** uses the recorded NaturalReader voice; each box is revealed and glows blue as its phrase begins. After the final phrase, all boxes become selectable and the active glow clears. **Read again** resets the sequence. **Read myself** highlights the first option; **Next option** advances it; **Finish reading** enables all choices. Neutral circles of increasing size indicate magnitude, rather than the original positive thumb symbols. These visuals are adaptation choices, not original Marshall stimuli. All 195 recordings were connected at that earlier revision; the current coverage is 149 of 209 as noted above.

The reader cancels speech and pending callbacks when navigating away, restarting, or opening the storyboard. Browser history restoration reinitializes the controls. Failed or missing recordings explicitly offer the manual path; no browser speech is substituted. The storyboard shows all options statically, without audio controls or dimming.

## Verification

- Verified unique screen IDs, existing image files, all five substantive intensity-branch rules, practice placement, and the fixed nonhelping outcome.
- Walked through the browser from introduction to ending using both Yes/No and Mean/Not mean branches.
- Checked a missed identity check and a missed recall check with reminder/continuation.
- Verified all 18 pairing instances, all image paths, prefixed branching IDs, and 8 main judgments per story.
- Browser-checked six-story/all-18 counts, adult-recipient wording, No skipping strength, Yes revealing it, manual option gating, fixed outcome, between-story progression, missed identity checks, and timer invalidation.
- Confirmed 175 storyboard cards in a six-story repeated-practice set and reviewed the full-session layout.
- Print control loads/decodes storyboard images before printing; no PDF was exported in this revision.

Sources are linked in the draft and listed in `SCRIPT.md`.


## NaturalReader narration (September 28)

Use **Play narration** to begin. With **Read new screens automatically** checked, subsequent screens read after each response. Binary answers and Continue wait for the prompt/choices to finish. Three-option screens read the prompt followed by three separate option recordings, highlighting the spoken option and unlocking choices after the last clip. Replay, Stop audio, navigation, reminders, and manual reading share one audio channel and cancel previous playback.

Two new NaturalReader files are saved as **Obligation Evelyn 2026-09-28 Batch 01** and **Batch 02**, using Evelyn, Soft, 0.90×, zero paragraph pause. 194 new MP3s were exported at 320 kbps in two batches; the exact previously recorded opening is retained. Saved project text was verified against the complete 194-paragraph script before import. ZIP CRC, indexed file mapping, audio decode, duration and SHA256 passed for every imported recording. Offline automated transcription spot-checked 13 clips and the three-option sequence; it is not a complete listening review.

See NARRATION_README.md and the import receipts for source details. All research source caveats remain, including the explicitly proposed overall-strength wording.

The overview now uses measured recording lengths plus programmed option pauses and an assumed 3–5 seconds per response: approximately 19–30 minutes with repeated practice, or 16–26 minutes with practice once. The earlier word-rate estimate remains in the read-aloud script export as a separate manual-narration estimate. Actual child duration still depends on response pace, breaks, corrections and navigation.

## Character introductions (October 3)

The introduction now builds the scene one character at a time. The first actor is visible on the opening screen; their introduction asks the child to **Tap** that actor. Once tapped, the next actor appears while the first stays visible. Each pairing preserves its original introduction order, positions, sizes, colors and role labels. Only the newly introduced actor is tappable, with a blue glowing box fitted around the character and label. That glow remains until the child taps it. Unintroduced actors stay hidden; the full cast is present only after the last introduction and on later story screens.

There is no **Show everyone** control. Narration temporarily locks the current tap target and unlocks it when the prompt ends; audio completion never reveals another character. Without narration, the target is immediately tappable. The storyboard shows the same cumulative sequence. Source stimulus files, judgment flow, screen identifiers and question counts remain unchanged. The spoken introduction wording has been adapted from “Select” to “Tap” for young children. These glowing targets provide guided orientation rather than uncued identity checks. All 26 affected introduction and reminder recordings were regenerated in NaturalReader with the same voice settings; all 195 current clips and their screen mappings were verified.

Static verification checked JavaScript syntax, all 54 actor cue bounds, all pairing introduction orders, and removal of the old reveal transition. Live browser verification is recorded separately with the CHS draft update.


## Obligation emphasis (October 3)

The child captions and full read-aloud script capitalize **HAVE TO** and **HAS TO** throughout practice, reminders, obligation judgments and their strength follow-ups. This emphasis treatment is an adaptation; the words, response options, branches and scoring are unchanged. The corresponding 32 unique NaturalReaders recordings require replacement so auditory emphasis can be reviewed separately from visual capitalization. Original export scripts and audio provenance remain archived.

## Follow-up captions (October 3)

Obligation-strength and individual-meanness-strength captions include the full relationship directly in the question, such as “How much do you think the kid’s teacher HAS TO?” The separate role label above the caption is omitted. These display adaptations preserve role clarity for every pairing, including follow-ups whose recorded question uses “she” or “he.” The existing read-aloud text, spoken context, response options, branching and narration mappings are unchanged; the full-script exports document the distinct display wording.


## Slower neither-helped reminders (October 3)

The four corrective reminders after the neither-helped recall check use the original Evelyn recording with pitch-preserving slower pacing. The first sentence plays at 68% of its previous tempo and the question at 76%, with an approximately 1.2-second sentence pause. The kid reminder is 10.14 seconds (previously 7.16). Words, captions, response options and branching remain unchanged. Original files and offline transcription verification are archived in the CHS output folder. These reminders occur after an incorrect recall response and do not affect the displayed correct-response session timing ranges.

## Explicit outcome wording (October 3)

The new script states “No one helped” and then names each helper who did NOT help the recipient. The overall-evaluation preface and corrective recall reminder use the same clear outcome. Individual meanness questions repeat the helper, recipient and failure to help; their strength follow-ups do the same instead of using a pronoun or separate spoken role label. These wording adaptations retain the Mean/Not Mean choices, scoring and conditional branches. They supersede the older neither-helped correction wording. The source manifest and script exports now activate the revised 209-clip mappings: 149 retained recordings are ready, while the 60 changed recordings have null audio sources and remain pending. The saved NaturalReaders project **Marshall explicit outcome Evelyn 2026-10-03** has all 60 ordered paragraphs verified at **Evelyn / Soft / 0.80× / 160 WPM / paragraph pause 0**, but no export file has been retrieved or imported. Existing audio files are unchanged; older words are never played as the revised questions. The recording index, saved project evidence and generic timing verification workflow are in `../marshall_chs_draft_2026-10-03/explicit-outcome-and-cues/`. The old measured timing ranges above are historical; current recorded totals are cleared until this batch is imported and measured.
