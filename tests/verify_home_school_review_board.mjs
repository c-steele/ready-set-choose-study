import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(root, "screen-share-study");
const html = fs.readFileSync(path.join(reviewRoot, "home-school-review.html"), "utf8");
const css = fs.readFileSync(path.join(reviewRoot, "review.css"), "utf8");
const source = fs.readFileSync(path.join(reviewRoot, "home-school-review.js"), "utf8");

const expectedRelease = "chs-home-school-evelyn-v1-r26-complete-polish-1";
assert.match(html, /48 Home \/ School order previews/);
assert.match(html, /24 matched visual configurations/);
assert.match(html, /12 study conditions/);
assert.match(html, /9 unique relationship pairings/);
assert.match(html, /96 story pages/);
assert.match(html, /Every child completes 12 stories/);
assert.match(html, /Home → School/);
assert.match(html, /School → Home/);
assert.match(html, /Back and Skip buttons/);
assert.match(html, /no longer includes any Likert rating questions/);
assert.match(html, /Visual profiles A–D/);
assert.match(html, /home-school-review\.js\?v=who-helps-where-review-r26/);
assert.match(html, /review\.css\?v=who-helps-where-review-r26/);
assert.match(html, /curtains seen through the windows/);
assert.match(html, /recording has not been fixed, but it is no longer reachable/);
assert.doesNotMatch(html, /value="family"|72 order-specific|36 matched|96 versions|exterior art is shared/);
assert.match(html, /See the six pairings in both settings/);
assert.match(css, /\.review-grid/);
assert.doesNotMatch(html, /See who is rated after each story/);
assert.doesNotMatch(html, /data-preview-mode/);
assert.doesNotMatch(source, /one-after-story|ONE_PAIR_SCRIPT_SCHEDULES|FAMILY_ONE_PAIR_SCRIPT_SCHEDULES/);
assert.doesNotMatch(source, /location\.replace|location\.assign/);

const sandbox = {
  window: {
    location: { href: "https://example.test/screen-share-study/home-school-review.html" },
  },
  document: null,
  URL,
};
vm.runInNewContext(source, sandbox, { filename: "home-school-review.js" });
const api = sandbox.window.FTCHomeSchoolReview;
assert.ok(api, "Home/School review API should be exported");
assert.equal(api.REVIEW_VERSION, "who-helps-where-review-r26");
assert.equal(api.STUDY_RUNTIME_VERSION, expectedRelease);

const orderValues = Array.from(api.CONTEXT_ORDERS, (order) => order.value);
assert.deepEqual(orderValues, ["HOME", "SCHOOL"]);
assert.deepEqual(
  Array.from(api.CONTEXT_ORDERS, (order) => [order.first, order.second]),
  [["HOME", "SCHOOL"], ["SCHOOL", "HOME"]],
);

const entries = Array.from(api.renditionEntries());
assert.equal(entries.length, 24, "board should enumerate 24 matched visual configurations");
assert.equal(new Set(entries.map((entry) => entry.id)).size, 24, "configuration IDs must be unique");
assert.equal(new Set(entries.map((entry) => entry.seed)).size, 24, "review seeds must be unique");

const roleCounts = Object.fromEntries(Array.from(api.ROLE_SETS, (role) => [
  role.value,
  entries.filter((entry) => entry.role === role.value).length,
]));
assert.deepEqual(roleCounts, { woman: 12, man: 12 });
assert.deepEqual(Array.from(api.ROLE_SETS, (role) => role.value), ["woman", "man"]);
assert.ok(Array.from(api.ROLE_SETS).every((role) => role.set === "role"));
assert.equal(api.ROLE_CONDITIONS.family, undefined);
assert.equal(api.assignmentCell("HOME", "family", "HUG"), null);
assert.equal(api.assignmentCell("SCHOOL", "family", "HELP"), null);
const expectedPairs = {
  woman: ["MOM-TEACHER", "SISTER-FRIEND", "BESTFRIEND-FRIEND", "TEACHER-FRIEND", "MOM-SISTER", "TEACHER-CLASSMATE"],
  man: ["DAD-TEACHER", "BROTHER-FRIEND", "BESTFRIEND-FRIEND", "TEACHER-FRIEND", "DAD-BROTHER", "TEACHER-CLASSMATE"],
};
for (const [role, pairs] of Object.entries(expectedPairs)) {
  assert.deepEqual(Array.from(api.ROLE_CONDITIONS[role]), pairs);
}
const uniquePairs = new Set(entries.flatMap((entry) => Array.from(entry.conditions)));
assert.equal(uniquePairs.size, 9, "the two six-pair sets share three pairs, yielding nine unique pairs");
assert.ok([...uniquePairs].every((pair) => !pair.split("-").includes("KID")), "adult-recipient family pairs are excluded");
// Captured from the pre-r23 board; keep all woman/man review seeds stable.
const historicalSeedSuffixes = {
  "woman-hug": ["1T27FK9", "1S88MHC", "1SI886B", "1TW68N6"],
  "woman-food": ["K5BZ", "AJR0Y", "KJCPX", "1XNQ6U8"],
  "woman-help": ["CSZS10", "DMYL3X", "DCYZEY", "BZ0YY3"],
  "man-hug": ["1DH6L3R", "1DR66SQ", "1E15SHP", "1C38KMW"],
  "man-food": ["EZRAP", "1YM506W", "1YW4LVV", "18YKDM"],
  "man-help": ["J4QEQY", "IUQT1Z", "IKR7D0", "IARLO1"],
};
for (const event of Array.from(api.EVENTS)) {
  assert.equal(entries.filter((entry) => entry.event === event).length, 8);
}
for (const variant of Array.from(api.VARIANTS)) {
  assert.equal(entries.filter((entry) => entry.variant === variant).length, 6);
}
for (const entry of entries) {
  assert.equal(entry.conditions.length, 6, `${entry.id} should list six pairings`);
  assert.deepEqual(
    Array.from(entry.conditions),
    Array.from(api.ROLE_CONDITIONS[entry.role]),
    `${entry.id} should use the correct role-set pairings`,
  );
  assert.equal(entry.seed, api.seedForRendition(entry.role, entry.event, entry.variant));
  const suffix = historicalSeedSuffixes[`${entry.role}-${entry.event.toLowerCase()}`]["abcd".indexOf(entry.variant)];
  assert.equal(entry.seed, `WTC-BOTH-${entry.role.toUpperCase()}-${entry.event}-${entry.variant.toUpperCase()}-${suffix}`);
}

const assignmentCells = [];
for (const [roleIndex, role] of Array.from(api.ROLE_SETS).entries()) {
  for (const [eventIndex, event] of Array.from(api.EVENTS).entries()) {
    for (const [orderIndex, order] of orderValues.entries()) {
      const cell = api.assignmentCell(order, role.value, event);
      assert.equal(
        cell,
        roleIndex * 6 + eventIndex * 2 + orderIndex + 1,
        `${role.value}/${event}/${order}-first should have the expected cell`,
      );
      assignmentCells.push(cell);
    }
  }
}
assert.deepEqual([...assignmentCells].sort((a, b) => a - b), Array.from({ length: 12 }, (_, index) => index + 1));
assert.equal(new Set(assignmentCells).size, 12, "all 12 role × event × order cells should be unique");

const launchUrls = [];
const reviewKeys = [];
for (const entry of entries) {
  const pairedSeeds = [];
  for (const orderValue of orderValues) {
    const order = api.contextOrderDefinition(orderValue);
    const url = api.buildStudyUrl(entry, sandbox.window.location.href, orderValue);
    launchUrls.push(url.href);
    pairedSeeds.push(url.searchParams.get("seed"));
    reviewKeys.push(api.reviewCheckKey(orderValue, entry.id));

    assert.equal(url.pathname, "/versions/chs-home-school-evelyn-v1/index.html");
    assert.equal(url.searchParams.get("v"), expectedRelease);
    assert.equal(url.searchParams.get("syntheticSpeech"), "0");
    assert.equal(url.searchParams.get("ratingMode"), "none");
    assert.equal(url.searchParams.get("contextStudy"), "1");
    assert.equal(url.searchParams.get("withinChildContexts"), "1");
    assert.equal(url.searchParams.get("context"), order.first);
    assert.equal(url.searchParams.get("roleSet"), entry.role);
    assert.equal(url.searchParams.get("set"), "role");
    assert.equal(url.searchParams.get("event"), entry.event);
    assert.equal(url.searchParams.get("variant"), entry.variant);
    assert.equal(url.searchParams.get("seed"), entry.seed);
    assert.equal(
      url.searchParams.get("assignmentCell"),
      String(api.assignmentCell(orderValue, entry.role, entry.event)),
    );
    assert.equal(url.searchParams.get("researcherTools"), "1");
    assert.equal(url.searchParams.get("researcherToolbar"), "back-skip");
    assert.equal(url.searchParams.get("researcherJump"), "1");
    assert.equal(url.searchParams.get("skipParentSetup"), "1");
    assert.equal(url.searchParams.get("previewIndex"), "0");
    assert.equal(url.searchParams.get("showReadAloud"), "0");
    assert.equal(url.searchParams.has("facilitator"), false);
    assert.equal(url.searchParams.has("facilitatorChild"), false);
  }
  assert.equal(new Set(pairedSeeds).size, 1, `${entry.id} should use one matched seed across both orders`);
}

assert.equal(launchUrls.length, 48, "24 configurations × 2 orders should yield 48 links");
assert.equal(new Set(launchUrls).size, 48, "all 48 order-specific links should be unique");
assert.equal(reviewKeys.length, 48);
assert.equal(new Set(reviewKeys).size, 48, "review keys must be unique across order and configuration");
assert.equal(api.reviewCheckKey("HOME", entries[0].id), `HOME:${entries[0].id}`);
assert.equal(api.reviewCheckKey("SCHOOL", entries[0].id), `SCHOOL:${entries[0].id}`);

assert.throws(
  () => api.buildStudyUrl(entries[0], sandbox.window.location.href, "PARK"),
  /Unknown first context/,
);
assert.throws(() => api.assignmentCell("PARK", "woman", "HUG"), /Unknown first context/);
assert.throws(() => api.reviewCheckKey("PARK", entries[0].id), /Unknown first context/);

// The local-only directory is deliberately optional in clean hosted checkouts.
// When available, verify its independently generated links match every canonical URL.
const localDirectory = path.join(root, "review-all-versions-local.html");
let localDirectoryChecked = false;
if (fs.existsSync(localDirectory)) {
  const localHtml = fs.readFileSync(localDirectory, "utf8");
  assert.match(localHtml, /<strong>12<\/strong> study conditions/);
  assert.match(localHtml, /<strong>48<\/strong> organized previews/);
  assert.match(localHtml, /<strong>96<\/strong> story pages per run/);
  assert.match(localHtml, /9 unique relationship pairings/);
  assert.match(localHtml, /recording has not been fixed, but it is no longer reachable/);
  assert.doesNotMatch(localHtml, /value="family"|All three sets|72 previews|96 versions|r22/);
  const localSandbox = { window: {}, document: null, URL };
  const localScript = localHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(localScript, "local preview directory must expose its inline script");
  vm.runInNewContext(localScript, localSandbox, { filename: "review-all-versions-local.html" });
  const local = localSandbox.window.WHWPreviewDirectory;
  assert.ok(local, "local preview directory API should be exported");
  assert.equal(local.RELEASE, expectedRelease);
  assert.deepEqual(Array.from(local.roles, (role) => role.value), ["woman", "man"]);
  assert.ok(Array.from(local.roles).every((role) => role.set === "role"));
  assert.equal(local.conditions.length, 12);
  assert.deepEqual(Array.from(local.conditions, (condition) => condition.cell), assignmentCells);
  const localUrls = Array.from(local.conditions).flatMap((condition) => Array.from(local.profiles, (profile) => {
    const entry = entries.find((item) => item.role === condition.role.value && item.event === condition.event.value && item.variant === profile);
    assert.ok(entry, "each local preview must identify a canonical role/event/profile");
    assert.equal(local.seedFor(entry.role, entry.event, profile), entry.seed);
    const actual = local.previewUrl(condition, profile, "https://example.test/review-all-versions-local.html");
    assert.equal(actual, api.buildStudyUrl(entry, sandbox.window.location.href, condition.order.value).href);
    return actual;
  }));
  assert.equal(localUrls.length, 48);
  assert.deepEqual([...localUrls].sort(), [...launchUrls].sort());
  localDirectoryChecked = true;
}

console.log(JSON.stringify({
  status: "PASS",
  baseConfigurations: entries.length,
  orderSpecificRuns: launchUrls.length,
  assignmentCells: assignmentCells.length,
  uniquePairs: uniquePairs.size,
  historicalSeedsPreserved: entries.length,
  localDirectoryChecked,
  roleCounts,
  orders: orderValues,
  events: Array.from(api.EVENTS),
  visualProfiles: Array.from(api.VARIANTS),
}, null, 2));
