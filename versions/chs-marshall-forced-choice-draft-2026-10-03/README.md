# Forced-choice obligation study draft

October 6 consistent-reference revision: the child who needs help is called **the kid in the middle** throughout participant captions, questions, confidence follow-ups, confirmations, outcome statements and reminders. Full native narration is updated to match those references. This terminology revision preserves the study questions, choices, branching, character positions and source artwork.

October 3, 2026. This is a separate compact version of the Marshall obligation follow-up. The individual-rating draft and the original Find the Caregiver / Who Helps Where studies are separate files and remain unchanged by this version.

Child-view links start with the shared Who Helps Where? visual introduction, then enter this version’s own character introductions and questions. Both camera examples are shown. The preview keeps the camera and microphone off.

Open `index.html` for the child preview or full storyboard. Pairing selectors show the Woman, Man, or Family set of six stories; All pairings shows 18 entries for researcher review. Each main question asks the child to choose between the two helpers.

| Main question | Example wording | Responses |
| --- | --- | --- |
| Prediction | Who will help the kid in the middle now that they’re sad? | The kid’s mom / The kid’s sister |
| Obligation | Who do you think HAS TO help the kid in the middle? | The kid’s mom / The kid’s sister |
| Meanness | Who was meaner for NOT helping the kid in the middle? | The kid’s mom / The kid’s sister |

These are forced comparisons between helpers. There is no both, neither, or equal option. Prediction and obligation are new forced-choice adaptations of the Marshall paradigm, rather than the original Study 1 individual Yes/No measures. The meaner comparison is adapted to the two-helper pairings and repeats the recipient reference.

## Story sequence

1. Meet the group.
2. Show the original Find the Caregiver introduction slides. Each character gains an outline and label as the recording introduces them. Preserve the source intro order, which begins with the kid even when the recipient is an adult.
3. Say the recipient is sad.
4. Ask the first assigned question: who WILL help or who HAS TO help. The two helper choices follow their positions in the scene, left then right.
5. Ask the other question, with the same two helper choices.
6. State the fixed outcome: no one helped, then name each helper who did NOT help.
7. Ask one Yes/No recall check: did either person help? The expected answer is No. Yes returns to the two original nonhelping outcome screens with narration and role highlights, then repeats the recall question. This repeats until No; there is no small-text correction panel.
8. Ask who was meaner for NOT helping the recipient, with the same helper choices.
9. Rate the selected helper’s meanness once, then ask only about the other helper with Mean / Not Mean and a strength rating after either Mean or Not Mean. Each helper receives exactly one scale: Not mean / A teeny bit mean / A little bit mean / Very mean. Skip both repeated questions for the selected helper.
10. Continue to the next pairing, then thank the child at session end.

There are **three forced-choice judgments per story**, followed by a selected-helper meanness rating and an individual evaluation of the other helper. Prediction or obligation responses never change whether the helpers help: the nonhelping outcome is fixed.

## Counts and illustrative duration

The six-story session includes 18 narrated character introductions. Each introduction advances at the end of its recording. See the [current default script](SCRIPT.md) for the response count and the researcher view for the recording-based duration of the selected role set.

## Stimuli and presentation

The pairing catalog, white backgrounds, exact existing characters and palettes, plain sadness context, original character positions, and cumulative character introductions come from the existing draft. Family-set stories with an adult recipient keep that adult in the middle. The two-teacher story distinguishes the helper as “the teacher on the left” and the recipient as “the teacher in the middle.” The complete source choice recording names the left helper “the kid’s teacher,” matching the original character introduction; the response record continues to identify this helper by position.

Choices always match the two displayed helpers. Their alternatives are read together using the original Find the Caregiver recordings, for example, “The kid’s teacher or the kid’s mom?” Children tap transparent response targets around the actual helpers, with the original role labels preserved in the scene. Characters and choice boxes remain still during narration; only the speaking face animates. No school or home backdrop is added.

## Scripts and narration

Instructional practice is omitted. Existing `practice=once` and `practice=each` links also use the practice-free flow. `SCRIPT.md` is the Woman set; the existing `SCRIPT-{woman,man,family,all}-{each,once}.md` download paths are retained as compatible copies of the current scripts. The full storyboard can also be printed.

New forced-choice prompts need new NaturalReaders recordings. Existing recordings may be reused only when the complete spoken text matches exactly. A changed prompt must not play an older individual-rating recording. The narration manifest and recording index document current coverage and pending clips; duration remains illustrative until the required recordings are connected.

## Scope and source limits

This is a two-helper sadness adaptation using the relationship pairings from Find the Caregiver. It is not a verbatim copy of Marshall et al. (2022), Study 1, which used individual Yes/No prediction and obligation measures with follow-ups. Explicit nonhelping narration, outcome replays after an incorrect recall answer, fixed review order, and on-screen taps are implementation choices in this draft. Six stories per role set is retained for review; question order has two explicit versions per role set; role-set assignment and randomized story order remain separate study-design decisions.

This preview is for reviewing the proposed task. Do not submit, activate, or recruit from this draft without the user’s separate instruction.

The green Next arrow is visible beside Replay on narration pages. Standalone review links can advance before narration ends; embedded CHS sessions retain the narration gate. Question pages still require a response. Helper-question outlines glow in place during each role name in the original paired recording, using verified recording-specific word timings.

Helper selections now advance directly, without a separate “Did you mean…? Yes or No” confirmation. This applies to prediction, obligation, and the meaner comparison in every pairing set. The selected helper still determines the following how-mean rating.

Instructional practice removed: prediction and obligation follow the assigned question order. Welcome, character introductions, story questions, recall checks, ratings, narration and visual styling are unchanged.

## Question-order counterbalancing

Each role set has two versions. Keep the assigned order across all six stories:

| Link parameter | First question | Second question |
| --- | --- | --- |
| `questionOrder=will-first` | Who WILL help? | Who HAS TO help? |
| `questionOrder=has-to-first` | Who HAS TO help? | Who WILL help? |

Use both versions within Woman/Girl (`set=woman`), Man/Boy (`set=man`), and Gender/Adult in Need (`set=family`): six role-set × order cells. Alternate the two order links across participants **within each role set**. The researcher view has an order selector and child-view links for both orders. The selected order is written into the URL, retained on restart/reload, and included in the downloaded script.

These are fixed condition links, not a shared enrollment allocator. Opening links does not reserve a slot or automatically enforce equal enrollment. Old links without `questionOrder` retain WILL-first for compatibility; use the explicit links to counterbalance. In the CHS draft, the parent launcher must pass the selected `questionOrder` to the iframe.

Screen messages, response records and completion payloads include `question_order`, `first_question`, `counterbalance_cell`, and `question_order_version`. Prediction and obligation records also include `question_position` (1 or 2). Screen IDs and response keys keep their original measure names even when their positions swap. Data submission remains disabled in the private CHS review draft.

Recall responses retain every Yes attempt as an unaccepted response. `outcome_replay_count` records how many outcome replays preceded the accepted No. Replays do not repeat the prediction or obligation questions or change their responses.
