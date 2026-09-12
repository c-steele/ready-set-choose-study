import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenShareRoot = path.join(root, "screen-share-study");
const assignmentSource = fs.readFileSync(path.join(screenShareRoot, "zoom_assignment.js"), "utf8");
const launcherSource = fs.readFileSync(path.join(screenShareRoot, "live.js"), "utf8");
const liveHtml = fs.readFileSync(path.join(screenShareRoot, "live.html"), "utf8");

assert.match(liveHtml, /live\.js\?v=ftc-live-auto-v5-unique-colors/);
assert.match(liveHtml, /\.\.\/versions\/chs-v80-balanced-assignment\/index\.html/);

const sandbox = {
  window: {},
  document: null,
  URL,
  Uint32Array,
};
vm.runInNewContext(assignmentSource, sandbox, { filename: "zoom_assignment.js" });
vm.runInNewContext(launcherSource, sandbox, { filename: "live.js" });
const api = sandbox.window.FTCLiveLauncher;
assert.ok(api, "live launcher API should be exported");

for (let index = 0; index < 300; index += 1) {
  const participantId = `TEST-${String(index).padStart(3, "0")}`;
  const first = api.buildStudyUrl(
    participantId,
    "teacher-classmate",
    "https://example.test/screen-share-study/live.html",
    Date.parse("2026-09-12T12:00:00Z"),
  );
  const repeat = api.buildStudyUrl(
    participantId,
    "teacher-classmate",
    "https://example.test/screen-share-study/live.html",
    Date.parse("2026-09-12T12:05:00Z"),
  );
  const url = first.url;

  assert.equal(url.pathname, "/versions/chs-v80-balanced-assignment/index.html");
  assert.equal(url.searchParams.has("variant"), false);
  assert.equal(url.searchParams.get("primaryCell"), String(first.condition.cell + 1));
  assert.match(url.searchParams.get("ratingPlan") || "", /^[1-4]$/);
  assert.match(url.searchParams.get("visualPlan") || "", /^[1-4]$/);
  assert.ok(url.searchParams.get("assignmentId"));
  assert.equal(url.searchParams.get("assignmentMethod"), "deterministic_participant_hash");
  assert.equal(url.searchParams.get("allocatorVersion"), "zoom-balanced-unique-colors-v1");
  assert.equal(url.searchParams.get("facilitator"), "1");
  assert.equal(url.searchParams.get("liveShare"), "1");

  assert.equal(
    url.searchParams.get("ratingPlan"),
    repeat.url.searchParams.get("ratingPlan"),
    "one participant should keep the same question plan",
  );
  assert.equal(
    url.searchParams.get("visualPlan"),
    repeat.url.searchParams.get("visualPlan"),
    "one participant should keep the same six-color plan",
  );
  assert.notEqual(
    url.searchParams.get("session_id"),
    repeat.url.searchParams.get("session_id"),
    "separate launches should keep distinct session IDs",
  );

  const maxRatingPlan = first.condition.role.value === "family" ? 4 : 2;
  assert.ok(Number(url.searchParams.get("ratingPlan")) <= maxRatingPlan);
}

const v76 = api.buildStudyUrl(
  "TEST-V76",
  "v76",
  "https://example.test/screen-share-study/live.html",
);
assert.equal(v76.url.pathname, "/index.html");
assert.equal(v76.url.searchParams.has("visualPlan"), false);

console.log(JSON.stringify({ status: "PASS", participantIdsChecked: 300 }, null, 2));
