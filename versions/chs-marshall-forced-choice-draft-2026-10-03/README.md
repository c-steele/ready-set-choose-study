# Who Has to Help?

Do children expect care from the same person they believe has an obligation to provide it? If children expect one person to act but think someone else has to act, whom do they blame when both fail to help? This forced-choice study asks those questions about emotional comfort, food sharing, and practical help. Each child sees six stories about **one** kind of need and answers questions about two potential helpers in every story.

[Open a randomly assigned child preview](https://c-steele.github.io/ready-set-choose-study/versions/chs-marshall-forced-choice-draft-2026-10-03/index.html?view=child&assign=random) or [choose a specific version and view its storyboard](https://c-steele.github.io/ready-set-choose-study/versions/chs-marshall-forced-choice-draft-2026-10-03/index.html).

## Care conditions and question order

These links show the same six pairings from the mom and sister set. Use the researcher view to select the dad and brother set or the family and teacher set.

| Kind of care | Situation | Prediction first | Obligation first |
| --- | --- | --- | --- |
| Comfort | Someone is sad. Who will give them a hug? | [WILL first](https://c-steele.github.io/ready-set-choose-study/versions/chs-marshall-forced-choice-draft-2026-10-03/index.html?view=child&set=woman&care=hug&questionOrder=will-first) | [HAS TO first](https://c-steele.github.io/ready-set-choose-study/versions/chs-marshall-forced-choice-draft-2026-10-03/index.html?view=child&set=woman&care=hug&questionOrder=has-to-first) |
| Food sharing | Someone is hungry. Who will give them strawberries? | [WILL first](https://c-steele.github.io/ready-set-choose-study/versions/chs-marshall-forced-choice-draft-2026-10-03/index.html?view=child&set=woman&care=food&questionOrder=will-first) | [HAS TO first](https://c-steele.github.io/ready-set-choose-study/versions/chs-marshall-forced-choice-draft-2026-10-03/index.html?view=child&set=woman&care=food&questionOrder=has-to-first) |
| Practical help | Someone drops a heavy box. Who will help pick it up? | [WILL first](https://c-steele.github.io/ready-set-choose-study/versions/chs-marshall-forced-choice-draft-2026-10-03/index.html?view=child&set=woman&care=help&questionOrder=will-first) | [HAS TO first](https://c-steele.github.io/ready-set-choose-study/versions/chs-marshall-forced-choice-draft-2026-10-03/index.html?view=child&set=woman&care=help&questionOrder=has-to-first) |

### Random preview

Opening the random link gives each care condition a one-in-three chance. The preview also draws the pairing set and question order. All three choices then appear in the address, so refreshing or sharing that resolved address preserves the same version. To vary only the care condition, for example, use `?view=child&assign=random&set=family&questionOrder=has-to-first`. An ordinary unnumbered link with no care or order specified opens comfort with WILL first.

### Pairing order

Each child sees all six pairings from the assigned set once, in shuffled order. The story-order draw is independent of the care condition and the order of the WILL and HAS TO questions. Reloading, restarting, or reopening the child's resolved URL preserves the entire session. For a fresh draw, open a link without a `storySeed`. A first pairing can recur across draws.

In researcher view, **Shuffle pairings** draws another sequence for the selected conditions. The WILL-first, HAS-TO-first, and numbered child-preview links on that page keep the displayed sequence for comparison. The 18-story review lists all pairings in catalog order.

The `storySeed` parameter accepts an unsigned 32-bit integer, including 0. A new unseeded launch generates one with the browser's secure random number generator and puts it in the URL before the welcome. The study uses a seeded Fisher–Yates shuffle with rejection sampling. A Children Helping Science launcher can provide the seed with the assignment.

### Numbered assignments

The three pairing sets each have a separate sequence of assignment numbers, starting at 1. A researcher can enter a child's number within their set, or open a link such as `?view=child&set=woman&assignmentNumber=2`. Save the child's resolved link when returning to a numbered assignment. The number fixes care and question order, and the story seed fixes pairing order. The researcher maintains the enrollment list independently of the preview.

In each complete block of six assignments within a set, every care condition occurs once with WILL first and once with HAS TO first. Odd slots ask WILL first, and even slots ask HAS TO first. The schedule shuffles the three care conditions separately for odd and even slots, using the pairing set, block number, and question order to reproduce the draw on return. A numbered assignment takes precedence over explicit care and order parameters. Manually changing either selection clears the number. The all-pairings catalog shows 18 stories for researcher review and accepts explicit care and order selections.

## What children see and answer

1. Families see the welcome and the child meets the three characters. Recorded introductions identify the characters in their original positions. The recipient is in the middle. In three family-set stories the recipient is an adult.
2. The story shows the recipient's need and identifies both witnesses. The child chooses who **will** help and who **has to** help in the assigned order. The two choices correspond to the helpers on the left and right. The same order holds across the child's six stories. The first story goes directly to these questions without a separate obligation-training round.
3. The child learns that neither person helped. A Yes/No recall check confirms that the child understood the outcome. A Yes response replays the outcome and repeats the recall check until the child answers No.
4. The child chooses who was **meaner** for failing to help, then rates that helper. For the other helper the child also indicates *mean* or *not mean* before giving a rating. Both helpers receive the same four response options, from *not mean* through *very mean*, once each.

The main comparisons measure relative judgments between two helpers. A choice of one person leaves open whether the child also attributes some responsibility to the other. Incorrect recall attempts and the number of outcome replays are recorded separately from the judgments.

## Study materials and records

The pairings and artwork come from *Find the Caregiver!*. Role labels distinguish the two teachers in the teacher–child story. Helper options are read aloud in the order of their positions. The standalone preview allows researchers to advance narration pages with **Next**. A response screen waits for a choice, and the embedded Children Helping Science preview retains the narration gate. The private draft is for researcher review.

The researcher view offers a full storyboard and a downloadable script for the selected set, care condition, and question order. [SCRIPT.md](SCRIPT.md) shows one reproducible mom and sister comfort session with story seed 528. Historical script filenames containing `once` or `each` and older URLs with a practice parameter use the practice-free flow. Timing estimates are illustrative and exclude setup, breaks, and outcome replays.

Screen messages, response records, and completion messages carry `role_set`, `care_context`, `question_order`, `first_question`, `assignment_number` (when supplied), `assignment_version`, and `counterbalance_cell`. The cell identifies the set, care condition, and question order. Records include `story_seed`, the presented pairing IDs in `pairing_order`, and `story_order_version`. The zero-based `story_index` points to the current pairing in that list. Prediction and obligation also carry `question_position`. Private CHS preview responses stay in memory.

The experiment adapts the expectation, obligation, and failure-to-help judgments used by Marshall and colleagues. Their main Study 1 asked about each helper individually. Their supplemental study included forced choices and counterbalanced expectation and obligation question sets. [Main article](https://doi.org/10.1037/xge0001136) · [Supplemental study methods](https://doi.org/10.1037/xge0001136.supp)
