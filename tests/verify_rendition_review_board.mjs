import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(root, "screen-share-study");
const html = fs.readFileSync(path.join(reviewRoot, "review.html"), "utf8");
const css = fs.readFileSync(path.join(reviewRoot, "review.css"), "utf8");
const source = fs.readFileSync(path.join(reviewRoot, "review.js"), "utf8");

assert.match(html, /Study review board/);
assert.match(html, /review\.js\?v=ftc-rendition-review-v8-unique-colors/);
assert.match(html, /review\.css\?v=ftc-rendition-review-v4/);
assert.match(html, /data\.html\?v=ftc-browser-dataset-v1/);
assert.match(html, /View \/ download data/);
assert.match(html, /Zoom researcher-paced/);
assert.match(html, /CHS audio \/ autoplay/);
assert.match(html, /complete prerecorded Evelyn audio/);
assert.doesNotMatch(`${html}\n${source}`, /still need new Evelyn|pending Evelyn clips/i);
assert.match(html, /data-preview-mode/);
assert.match(html, /Only show unchecked/);
assert.match(html, /See who is rated after each story/);
assert.match(html, /Every run uses six different character colors/);
assert.match(html, /Session color plan/);
assert.match(css, /\.review-grid/);
assert.doesNotMatch(source, /location\.replace|location\.assign/);

const sandbox = {
  window: {
    location: { href: "https://example.test/screen-share-study/review.html" },
  },
  document: null,
  URL,
};
vm.runInNewContext(source, sandbox, { filename: "review.js" });
const api = sandbox.window.FTCRenditionReview;
assert.ok(api, "review API should be exported");
assert.equal(api.REVIEW_VERSION, "ftc-rendition-review-v8-unique-colors");
assert.deepEqual(Object.keys(api.PREVIEW_MODES), ["zoom", "chs"]);

const entries = Array.from(api.renditionEntries());
assert.equal(entries.length, 96, "review board should enumerate all 96 balanced color-plan combinations");
assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length, "rendition IDs must be unique");

const roleCounts = Object.fromEntries(api.ROLE_SETS.map((role) => [
  role.value,
  entries.filter((entry) => entry.role === role.value).length,
]));
assert.deepEqual(roleCounts, { woman: 24, man: 24, family: 48 });

function extractSchedule(sourceText, constantName) {
  const match = sourceText.match(new RegExp(`const ${constantName} = (\\[[\\s\\S]*?\\n\\]);`));
  assert.ok(match, `${constantName} should be present in app.js`);
  return vm.runInNewContext(`(${match[1]})`);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const v80Root = path.join(root, "versions", "chs-v80-balanced-assignment");
const appSource = fs.readFileSync(path.join(v80Root, "app.js"), "utf8");
const v80ReviewSource = fs.readFileSync(path.join(v80Root, "review.js"), "utf8");
const v80Sandbox = { window: {}, document: null, URL };
vm.runInNewContext(v80ReviewSource, v80Sandbox, { filename: "v80-review.js" });
const v80Api = v80Sandbox.window.FTCStandardV80Review;
assert.ok(v80Api, "v80 review API should be exported");

const exactPaletteMatch = appSource.match(
  /const EXACT_VISUAL_PALETTES = Object\.freeze\((\{[\s\S]*?\})\);\n\nfunction trialExactColor/,
);
assert.ok(exactPaletteMatch, "exact rendered palette map should be present in the v80 runtime");
const exactVisualPalettes = vm.runInNewContext(`(${exactPaletteMatch[1]})`);

assert.deepEqual(
  plain(api.ONE_PAIR_SCRIPT_SCHEDULES),
  plain(extractSchedule(appSource, "ONE_PAIR_SCRIPT_SCHEDULES")),
  "review-board woman/man pair plans must match the study runtime",
);
assert.deepEqual(
  plain(api.FAMILY_ONE_PAIR_SCRIPT_SCHEDULES),
  plain(extractSchedule(appSource, "FAMILY_ONE_PAIR_SCRIPT_SCHEDULES")),
  "review-board family pair plans must match the study runtime",
);

for (const role of api.ROLE_SETS) {
  const v80Role = Array.from(v80Api.ROLE_SETS).find((candidate) => candidate.value === role.value);
  assert.ok(v80Role, `${role.value} should exist in the v80 runtime review`);
  assert.deepEqual(plain(api.ROLE_CONDITIONS[role.value]), plain(v80Role.conditions));
  for (const condition of api.ROLE_CONDITIONS[role.value]) {
    const variants = Array.from(v80Api.SESSION_VISUAL_PLANS[role.value], (plan) => plan[condition]);
    assert.deepEqual([...variants].sort(), ["a", "b", "c", "d"],
      `${role.value} ${condition} should receive every rendition once across the four color plans`);
  }
}

const v80Entries = Array.from(v80Api.renditionEntries());

for (const entry of entries) {
  assert.equal(
    api.scheduleIndexForSeed(entry.seed, entry.scheduleCount),
    entry.scheduleIndex,
    `${entry.id} seed should force its displayed pair-plan index`,
  );
  const zoomUrl = api.buildStudyUrl(entry, sandbox.window.location.href, "zoom");
  const uniqueZoomUrl = api.buildStudyUrl(
    entry,
    sandbox.window.location.href,
    "zoom",
    "20260907123456789-ABCD1234",
  );
  const audioUrl = api.buildStudyUrl(entry, sandbox.window.location.href, "chs");
  assert.equal(zoomUrl.pathname, "/versions/chs-v80-balanced-assignment/index.html");
  assert.equal(audioUrl.pathname, "/versions/chs-v80-balanced-assignment/index.html");

  for (const url of [zoomUrl, audioUrl]) {
    assert.equal(url.searchParams.get("researcherTools"), "1");
    assert.equal(url.searchParams.get("showReadAloud"), "0");
    assert.equal(url.searchParams.get("ratingMode"), "one-after-story");
    assert.equal(url.searchParams.get("syntheticSpeech"), "0");
    assert.equal(url.searchParams.get("roleSet"), entry.role);
    assert.equal(url.searchParams.get("set"), entry.set);
    assert.equal(url.searchParams.get("event"), entry.event);
    assert.equal(url.searchParams.has("variant"), false, "a whole-session color plan must never force one rendition letter");
    assert.equal(url.searchParams.get("primaryCell"), String(api.canonicalPrimaryCell(entry.role, entry.event)));
    assert.equal(url.searchParams.get("ratingPlan"), String(entry.scheduleIndex + 1));
    assert.equal(url.searchParams.get("visualPlan"), String(entry.visualPlan));
    assert.match(url.searchParams.get("assignmentId") || "", /^REVIEW-FTC-C\d{2}-RP\d-VP\d$/);
    assert.equal(url.searchParams.get("assignmentMethod"), "review_preview_only");
    assert.equal(url.searchParams.get("allocatorVersion"), "review-preview-v2-unique-colors");
    assert.equal(url.searchParams.get("seed"), entry.seed);
  }
  assert.equal(zoomUrl.searchParams.get("facilitator"), "1");
  assert.equal(zoomUrl.searchParams.get("facilitatorChild"), "1");
  assert.equal(zoomUrl.searchParams.get("liveShare"), "1");
  assert.equal(zoomUrl.searchParams.get("skipParentSetup"), "1");
  assert.equal(zoomUrl.searchParams.get("previewIndex"), "0");
  assert.equal(zoomUrl.searchParams.get("studyVersion"), "teacher-classmate-preview");
  assert.equal(zoomUrl.searchParams.get("pid"), entry.seed);
  assert.equal(zoomUrl.searchParams.get("STUDY_ID"), "ftc-rendition-review-v8-unique-colors");
  assert.equal(
    uniqueZoomUrl.searchParams.get("session_id"),
    `review-zoom-${entry.id}-20260907123456789-ABCD1234`,
    "each clicked Zoom rendition should be able to receive a distinct run ID",
  );
  assert.equal(uniqueZoomUrl.searchParams.get("seed"), entry.seed,
    "a unique run ID must not change the balanced plan seed");

  assert.equal(audioUrl.searchParams.get("previewIndex"), "4");
  for (const omittedParam of [
    "facilitator",
    "facilitatorChild",
    "liveShare",
    "skipParentSetup",
    "facilitatorSession",
    "pid",
    "session_id",
    "STUDY_ID",
    "studyVersion",
  ]) {
    assert.equal(audioUrl.searchParams.has(omittedParam), false, `audio preview should omit ${omittedParam}`);
  }
  assert.equal(zoomUrl.searchParams.get("seed"), audioUrl.searchParams.get("seed"),
    `${entry.id} should use the same randomization seed in both modes`);

  const v80Entry = v80Entries.find((candidate) =>
    candidate.role === entry.role
      && candidate.event === entry.event
      && candidate.ratingPlan === entry.scheduleIndex + 1
      && candidate.visualPlan === entry.visualPlan
  );
  assert.ok(v80Entry, `${entry.id} should map to one canonical v80 plan`);
  const variants = Array.from(api.ROLE_CONDITIONS[entry.role], (condition) => v80Entry.visualPlanMap[condition]);
  const exactColors = Array.from(api.ROLE_CONDITIONS[entry.role], (condition) => {
    const variant = v80Entry.visualPlanMap[condition];
    const palettes = exactVisualPalettes[condition];
    assert.ok(palettes, `${condition} should have an exact rendered palette mapping`);
    return palettes[["b", "d"].includes(variant) ? 1 : 0];
  });
  assert.equal(new Set(exactColors).size, 6, `${entry.id} should use six unique exact character colors`);
  assert.equal(variants.filter((variant) => ["a", "b"].includes(variant)).length, 3,
    `${entry.id} should use three left-side layouts`);
  assert.equal(variants.filter((variant) => ["c", "d"].includes(variant)).length, 3,
    `${entry.id} should use three right-side layouts`);

  assert.deepEqual(
    JSON.parse(JSON.stringify(entry.pairings)),
    JSON.parse(JSON.stringify(Object.fromEntries(
      Array.from(api.ROLE_CONDITIONS[entry.role]).map((condition) => [
        condition,
        api.schedulesForRole(entry.role)[entry.scheduleIndex][condition],
      ])
    ))),
  );
  assert.deepEqual(
    Object.keys(entry.pairings),
    Array.from(api.ROLE_CONDITIONS[entry.role]),
    `${entry.id} should display only the six conditions in its role set`,
  );
  const focalRoles = Object.values(entry.pairings).map((scriptKey) => api.focusedRole(scriptKey).toLowerCase());
  assert.equal(new Set(focalRoles).size, 6, `${entry.id} should rate six different focal roles`);
  if (entry.role === "woman") {
    assert.deepEqual([...focalRoles].sort(), ["best friend", "classmate", "friend", "mom", "sister", "teacher"]);
  } else if (entry.role === "man") {
    assert.deepEqual([...focalRoles].sort(), ["best friend", "brother", "classmate", "dad", "friend", "teacher"]);
  } else {
    for (const required of ["classmate", "dad", "kid", "mom", "teacher"]) {
      assert.ok(focalRoles.includes(required), `${entry.id} should include ${required}`);
    }
    assert.equal(focalRoles.filter((role) => role === "sister" || role === "brother").length, 1,
      `${entry.id} should include one sibling role`);
  }
}

assert.match(api.makeLaunchToken(
  Date.parse("2026-09-07T12:34:56.789Z"),
  { randomUUID: () => "abcd1234-0000-0000-0000-000000000000" },
), /^20260907123456789-ABCD1234$/);
assert.notEqual(
  api.buildStudyUrl(entries[0], sandbox.window.location.href, "zoom", "RUN-A").searchParams.get("session_id"),
  api.buildStudyUrl(entries[0], sandbox.window.location.href, "zoom", "RUN-B").searchParams.get("session_id"),
  "repeated launches of one configuration must not overwrite one another",
);

assert.throws(
  () => api.buildStudyUrl(entries[0], sandbox.window.location.href, "unknown"),
  /Unknown review mode/,
);
assert.equal(api.reviewCheckKey("zoom", entries[0].id), `zoom:${entries[0].id}`);
assert.equal(api.reviewCheckKey("chs", entries[0].id), `chs:${entries[0].id}`);
assert.notEqual(api.reviewCheckKey("zoom", entries[0].id), api.reviewCheckKey("chs", entries[0].id));

console.log(JSON.stringify({
  status: "PASS",
  totalRenditions: entries.length,
  roleCounts,
  events: Array.from(api.EVENTS),
  visualPlans: Array.from(api.VISUAL_PLANS, (plan) => plan.label),
}, null, 2));
