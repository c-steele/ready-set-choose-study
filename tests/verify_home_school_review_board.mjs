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

assert.match(html, /72 Home \/ School order previews/);
assert.match(html, /36 matched visual configurations/);
assert.match(html, /Every child completes 12 stories/);
assert.match(html, /Home → School/);
assert.match(html, /School → Home/);
assert.match(html, /Back and Skip buttons/);
assert.match(html, /no longer includes any Likert rating questions/);
assert.match(html, /Visual profiles A–D/);
assert.match(html, /home-school-review\.js\?v=who-takes-care-entrance-review-r17/);
assert.match(html, /review\.css\?v=who-takes-care-entrance-review-r17/);
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
assert.equal(api.REVIEW_VERSION, "who-takes-care-entrance-review-r17");
assert.equal(api.STUDY_RUNTIME_VERSION, "chs-home-school-evelyn-v1-r17-entrance-preview-1");

const orderValues = Array.from(api.CONTEXT_ORDERS, (order) => order.value);
assert.deepEqual(orderValues, ["HOME", "SCHOOL"]);
assert.deepEqual(
  Array.from(api.CONTEXT_ORDERS, (order) => [order.first, order.second]),
  [["HOME", "SCHOOL"], ["SCHOOL", "HOME"]],
);

const entries = Array.from(api.renditionEntries());
assert.equal(entries.length, 36, "board should enumerate 36 matched visual configurations");
assert.equal(new Set(entries.map((entry) => entry.id)).size, 36, "configuration IDs must be unique");
assert.equal(new Set(entries.map((entry) => entry.seed)).size, 36, "review seeds must be unique");

const roleCounts = Object.fromEntries(Array.from(api.ROLE_SETS, (role) => [
  role.value,
  entries.filter((entry) => entry.role === role.value).length,
]));
assert.deepEqual(roleCounts, { woman: 12, man: 12, family: 12 });
for (const event of Array.from(api.EVENTS)) {
  assert.equal(entries.filter((entry) => entry.event === event).length, 12);
}
for (const variant of Array.from(api.VARIANTS)) {
  assert.equal(entries.filter((entry) => entry.variant === variant).length, 9);
}
for (const entry of entries) {
  assert.equal(entry.conditions.length, 6, `${entry.id} should list six pairings`);
  assert.deepEqual(
    Array.from(entry.conditions),
    Array.from(api.ROLE_CONDITIONS[entry.role]),
    `${entry.id} should use the correct role-set pairings`,
  );
  assert.equal(entry.seed, api.seedForRendition(entry.role, entry.event, entry.variant));
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
assert.deepEqual([...assignmentCells].sort((a, b) => a - b), Array.from({ length: 18 }, (_, index) => index + 1));
assert.equal(new Set(assignmentCells).size, 18, "all 18 role × event × order cells should be unique");

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
    assert.equal(url.searchParams.get("v"), "chs-home-school-evelyn-v1-r17-entrance-preview-1");
    assert.equal(url.searchParams.get("syntheticSpeech"), "0");
    assert.equal(url.searchParams.get("ratingMode"), "none");
    assert.equal(url.searchParams.get("contextStudy"), "1");
    assert.equal(url.searchParams.get("withinChildContexts"), "1");
    assert.equal(url.searchParams.get("context"), order.first);
    assert.equal(url.searchParams.get("roleSet"), entry.role);
    assert.equal(url.searchParams.get("set"), entry.set);
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

assert.equal(launchUrls.length, 72, "36 configurations × 2 orders should yield 72 links");
assert.equal(new Set(launchUrls).size, 72, "all 72 order-specific links should be unique");
assert.equal(reviewKeys.length, 72);
assert.equal(new Set(reviewKeys).size, 72, "review keys must be unique across order and configuration");
assert.equal(api.reviewCheckKey("HOME", entries[0].id), `HOME:${entries[0].id}`);
assert.equal(api.reviewCheckKey("SCHOOL", entries[0].id), `SCHOOL:${entries[0].id}`);

assert.throws(
  () => api.buildStudyUrl(entries[0], sandbox.window.location.href, "PARK"),
  /Unknown first context/,
);
assert.throws(() => api.assignmentCell("PARK", "woman", "HUG"), /Unknown first context/);
assert.throws(() => api.reviewCheckKey("PARK", entries[0].id), /Unknown first context/);

console.log(JSON.stringify({
  status: "PASS",
  baseConfigurations: entries.length,
  orderSpecificRuns: launchUrls.length,
  assignmentCells: assignmentCells.length,
  roleCounts,
  orders: orderValues,
  events: Array.from(api.EVENTS),
  visualProfiles: Array.from(api.VARIANTS),
}, null, 2));
