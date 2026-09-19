import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A new design-only release gate, pinned to the verified r22 CHS save.
// Earlier audio and artwork release gates remain historical and unchanged.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseline = "b2c4d0c58fec5f5bf94e452ceeed286111e50722";
const candidate = "versions/chs-home-school-evelyn-v1";
const previousRelease = "chs-home-school-evelyn-v1-r22-clear-at-events-1";
const release = "chs-home-school-evelyn-v1-r23-two-role-sets-1";
const previousDesign = "home_school_within_child_counterbalanced_context_order_v1";
const design = "home_school_within_child_two_role_sets_v2";
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const read = filename => fs.readFileSync(path.join(root, filename), "utf8");
const before = filename => git("show", `${baseline}:${filename}`);
const json = filename => JSON.parse(read(filename));
const oldJson = filename => JSON.parse(before(filename));

const contextPath = `${candidate}/data/home_school_context_manifest.json`;
const context = json(contextPath), oldContext = oldJson(contextPath);
assert.equal(context.designVersion, design);
assert.deepEqual(context.assignment.roleSets, ["WOMAN", "MAN"]);
assert.equal(context.assignment.cellCount, 12);
const restoredContext = structuredClone(context);
restoredContext.designVersion = oldContext.designVersion;
restoredContext.assignment.roleSets = oldContext.assignment.roleSets;
restoredContext.assignment.cellCount = oldContext.assignment.cellCount;
assert.deepEqual(restoredContext, oldContext,
  "Only design version, active role sets and cell count may change: all recordings, captions, artwork and context text stay identical");

const metadataPath = `${candidate}/candidate.json`;
const metadata = json(metadataPath), oldMetadata = oldJson(metadataPath);
assert.equal(metadata.candidateRelease, release);
assert.deepEqual(metadata.roleSets, ["woman", "man"]);
assert.deepEqual(metadata.pairings, { woman: oldMetadata.pairings.woman, man: oldMetadata.pairings.man });
assert.equal(new Set(Object.values(metadata.pairings).flat()).size, 9);
assert.equal(metadata.assignmentCellCount, 12);
assert.equal(metadata.activePairingCount, 9);
assert.equal(metadata.activeTrialVariantCount, 36);
assert.equal(metadata.previewCount, 48);
assert.equal(metadata.recipientRole, "KID");
assert.equal(metadata.designVersion, design);
assert.deepEqual(metadata.directionalRecipients, {}, "The active study contains no adult recipients");
assert.equal(metadata.storyCount, 12);
assert.equal(metadata.storyCountPerContext, 6);
assert.deepEqual(metadata.events, ["HUG", "FOOD", "HELP"]);
assert.deepEqual(metadata.contextOrders, ["HOME,SCHOOL", "SCHOOL,HOME"]);
assert.deepEqual(metadata.visualCoverage, oldMetadata.visualCoverage, "Historical artwork assets are retained, not deleted or recolored");
const saved = metadata.status === "published_chs_draft_saved_not_submitted";
assert.ok(saved || metadata.status === "prepared_for_chs_draft_update");
assert.equal(metadata.published, true);
assert.equal(metadata.chsDraftConfigurationUpdated, true);
assert.equal(metadata.activeChsStudyChanged, false);
assert.equal(metadata.chsSubmissionStatus, "not_submitted");
assert.equal(metadata.lastPublishedRelease, saved ? release : previousRelease);
assert.equal(metadata.chsDraftRelease, saved ? release : previousRelease);
assert.equal(metadata.revisionPendingPublication, !saved);
assert.equal(metadata.latestChsDraftSaveReceipt, saved ? "review/chs-draft-save-r23.md" : "review/chs-draft-save-r22.md");
if (saved) {
  assert.equal(Object.hasOwn(metadata, "pendingReason"), false);
  const receipt = read(`${candidate}/review/chs-draft-save-r23.md`);
  assert.ok(receipt.includes(release));
  assert.match(receipt, /6349/);
  assert.match(receipt, /not submitted|not_submitted|not been submitted/i);
} else assert.match(metadata.pendingReason, /two.*role.*sets.*deployment and CHS draft save pending verification/i);
const restoredMetadata = structuredClone(metadata);
const changedMetadataKeys = [
  "status", "candidateRelease", "revisionPendingPublication", "lastPublishedRelease", "chsDraftRelease", "latestChsDraftSaveReceipt",
  "description", "roleSets", "assignmentCellCount", "pairings", "directionalRecipients", "participantSafety",
  "designVersion", "activePairingCount", "activeTrialVariantCount", "previewCount", "recipientRole", "pendingReason", "inactiveAssetRetention",
];
for (const key of changedMetadataKeys) {
  if (Object.hasOwn(oldMetadata, key)) restoredMetadata[key] = oldMetadata[key];
  else delete restoredMetadata[key];
}
assert.deepEqual(restoredMetadata, oldMetadata, "Unrelated participant, visual and audio metadata must remain unchanged");

// Restore only four role/assignment functions and the explicit stale-link guard.
// Comparing the rest of app.js byte-for-byte protects all rendering, captions,
// narration timing, animation, selection boxes and prerecorded-audio routing.
function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing function ${name}`);
  const end = source.indexOf("\n}\n", start);
  assert.ok(end > start, `Missing end of ${name}`);
  return source.slice(start, end + 2);
}
const appPath = `${candidate}/app.js`;
const currentApp = read(appPath), oldApp = before(appPath);
let restoredApp = currentApp
  .replaceAll(release, previousRelease)
  .replaceAll(design, previousDesign);
for (const name of ["selectRoleSet", "balancedAssignment", "describeActualAssignment", "selectedConditionsForSet"]) {
  restoredApp = restoredApp.replace(functionSource(restoredApp, name), functionSource(oldApp, name));
}
restoredApp = restoredApp.replace(functionSource(restoredApp, "validateHomeSchoolRoleSelection") + "\n\n", "");
restoredApp = restoredApp.replace(
  "  // Reject obsolete Family/all-pair links before loading or starting a session;\n  // never silently reinterpret an old preview as a different assigned set.\n  if (isHomeSchoolStudy) validateHomeSchoolRoleSelection(requestedSet, requestedRoleSet);\n", "");
restoredApp = restoredApp.replace(
  "const selectedRoleSet = !isHomeSchoolStudy && isFamilyConditionSet(requestedSet, requestedRoleSet)",
  "const selectedRoleSet = isFamilyConditionSet(requestedSet, requestedRoleSet)");
restoredApp = restoredApp.replace(
  '  if (error.code === "HOME_SCHOOL_UNAVAILABLE_ROLE_SET") {\n    document.body.innerHTML = `<main class="ksize-shell"><section class="ksize-screen" role="alert"><h1>This preview link is out of date</h1><p>${escapeHtml(error.message)}</p></section></main>`;\n    return;\n  }\n', "");
assert.equal(restoredApp, oldApp, "Only active role selection/assignment, stale-link rejection and design/release IDs may change in runtime");
assert.equal(read(`${candidate}/index.html`), before(`${candidate}/index.html`).replaceAll(previousRelease, release),
  "Only the candidate cache/release token may change in index.html");

// The CHS wrapper is copied from the verified draft. Only assignment-specific
// declarations and audit labels change; consent, eligibility, recordings,
// participant instructions, data transport and preview-only controls are fixed.
const wrapperPath = "chs_ready/home_school_12_cell_wrapper_draft.js";
let expectedWrapper = before("chs_ready/home_school_18_cell_wrapper_draft.js")
  .replaceAll(previousRelease, release)
  .replaceAll(previousDesign, design)
  .replace("This source targets the r22 within-child House/School entrance candidate.",
    "This source targets the r23 two-role-set within-child House/School candidate.")
  .replace("    3 role sets × 3 events × 2 context orders = 18 cells.",
    "    2 role sets × 3 events × 2 context orders = 12 cells.\n  Only Woman and Man role sets are included; the kid always needs care.")
  .replace('  { dataLabel: "MAN", urlValue: "man", conditionSet: "role" },\n  { dataLabel: "FAMILY_TEACHER", urlValue: "family", conditionSet: "family" }',
    '  { dataLabel: "MAN", urlValue: "man", conditionSet: "role" }')
  .replace("17 Family-Teacher/Help/Home-first, 18 Family-Teacher/Help/School-first.",
    "11 Man/Help/Home-first, 12 Man/Help/School-first.")
  .replace("if (cellIndex < 0 || cellIndex >= 18 || Math.floor(cellIndex) !== cellIndex)",
    "if (!Number.isFinite(cellIndex) || cellIndex < 0 || cellIndex >= 12 || Math.floor(cellIndex) !== cellIndex)")
  .replace("Home/School assignment cell index must be an integer from 0 through 17.",
    "Home/School assignment cell index must be an integer from 0 through 11.")
  .replace("assignmentFromCellIndex(stableHash(childLevelKey) % 18)",
    "assignmentFromCellIndex(stableHash(childLevelKey) % 12)")
  .replaceAll('assignment_method: "fnv1a_mod_18"', 'assignment_method: "fnv1a_mod_12"');
assert.equal(read(wrapperPath), expectedWrapper,
  "Only the two-role assignment table, bounds/hash modulus and design/release audit labels may change in the CHS wrapper");

const allowedChanges = new Set([
  appPath, `${candidate}/index.html`, metadataPath, contextPath,
  "chs_ready/home_school_18_cell_wrapper_draft.js", "chs_ready/home_school_12_cell_wrapper_draft.js",
  "screen-share-study/home-school-review.html", "screen-share-study/home-school-review.js",
  "tests/verify_chs_home_school_candidate.mjs", "tests/verify_home_school_chs_wrapper.mjs",
  "tests/verify_home_school_furnished_candidate.mjs",
  "tests/verify_home_school_entrance_rollout.mjs", "tests/verify_home_school_review_board.mjs",
  "tests/verify_home_school_followup_runtime_behavior.mjs",
  "tests/verify_who_helps_where_welcome.mjs", "tests/verify_home_school_two_role_scope.mjs",
  `${candidate}/review/chs-draft-save-r23.md`, `${candidate}/review/r23-two-role-verification.md`,
]);
const changed = git("diff", "--name-only", baseline, "--").trim().split("\n").filter(Boolean);
assert.deepEqual(changed.filter(filename => !allowedChanges.has(filename)), [],
  "Unexpected tracked changes: all art/audio/CSS, unrelated study versions and historical gates are immutable");
const untrackedProduction = git("ls-files", "--others", "--exclude-standard", "--", "assets", "audio_evelyn", "audio_preferred", candidate, "chs_ready", "screen-share-study")
  .trim().split("\n").filter(Boolean);
assert.deepEqual(untrackedProduction.filter(filename => !allowedChanges.has(filename)), [],
  "A design-only release must not introduce new audio/artwork or unrelated participant files");
for (const gate of ["verify_home_school_clear_at_events_scope.mjs", "verify_home_school_visual_fixes_scope.mjs", "verify_home_school_approved_openings_scope.mjs"]) {
  assert.equal(read(`tests/${gate}`), before(`tests/${gate}`), "Historical scope gates must retain their original meaning");
}
const retainedMedia = git("ls-tree", "-r", "--name-only", baseline, "--", "assets", "audio_evelyn", "audio_preferred", `${candidate}/assets`)
  .trim().split("\n").filter(Boolean);
for (const filename of retainedMedia) assert.ok(fs.existsSync(path.join(root, filename)), `Protected media missing: ${filename}`);
console.log(JSON.stringify({ status: "PASS", baseline, release, activeRoleSets: metadata.roleSets,
  uniquePairings: 9, assignmentCells: 12, organizedPreviews: 48, recipient: "KID", storiesPerChild: 12,
  protectedMediaFiles: retainedMedia.length, audioCaptionsArtworkStylesAndTimingUnchanged: true,
  staleFamilyLinksRejectedNotReassigned: true, metadataState: metadata.status, chsDraftRelease: metadata.chsDraftRelease }, null, 2));
