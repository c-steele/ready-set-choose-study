import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(root, "versions/chs-v81-researcher-back-preview/app.js");
const indexPath = path.join(root, "versions/chs-v81-researcher-back-preview/index.html");
const boardPath = path.join(root, "screen-share-study/review-back-preview.js");
const boardHtmlPath = path.join(root, "screen-share-study/review-back-preview.html");

const appSource = fs.readFileSync(appPath, "utf8");
const indexSource = fs.readFileSync(indexPath, "utf8");
const boardSource = fs.readFileSync(boardPath, "utf8");
const boardHtmlSource = fs.readFileSync(boardHtmlPath, "utf8");

assert.match(appSource, /window\.location\.replace\(url\.toString\(\)\)/);
assert.match(appSource, /requestedAssignmentMethod === "review_preview_only"/);
assert.match(appSource, /reuseWarmedResearcherAssets/);
assert.doesNotMatch(appSource, /requestedResearcherJump\s*&&\s*startIndex > 0/);
assert.match(appSource, /Going back…/);
assert.doesNotMatch(
  appSource.slice(appSource.indexOf("function installResearcherSkip"), appSource.indexOf("function withPreviewIndex")),
  /Object\.entries\(currentSessionParams\)/,
);
assert.match(indexSource, /chs-v81-researcher-back-preview-r1/);
assert.match(indexSource, /researcher-navigation\.css/);
assert.match(boardHtmlSource, /left\/middle\/right positions/);

const sandbox = { window: {}, document: null, URL, URLSearchParams, Date, Math, Uint32Array };
vm.runInNewContext(boardSource, sandbox, { filename: boardPath });
const review = sandbox.window.FTCRenditionReview;
assert.ok(review);
assert.equal(review.REVIEW_VERSION, "ftc-rendition-review-v9-back-preview");
assert.deepEqual(
  { ...review.sidePlacement("MOM-DAD", "a") },
  { left: "Mom", middle: "Kid", right: "Dad" },
);
assert.deepEqual(
  { ...review.sidePlacement("SISTER-BROTHER", "d") },
  { left: "Brother", middle: "Kid", right: "Sister" },
);
assert.deepEqual(
  { ...review.sidePlacement("SISTER-BROTHER", "b") },
  { left: "Sister", middle: "Kid", right: "Brother" },
);
assert.deepEqual(
  { ...review.sidePlacement("DAD-KID", "c", "mom-KID") },
  { left: "Kid", middle: "Mom", right: "Dad" },
);
assert.deepEqual(
  { ...review.sidePlacement("TEACHER-KID", "a", "teacher-TEACHER") },
  { left: "Teacher", middle: "Teacher", right: "Kid" },
);

const entries = review.renditionEntries();
assert.equal(entries.length, 96);
for (const entry of entries) {
  assert.ok(entry.visualPlanMap);
  assert.deepEqual(Object.keys(entry.visualPlanMap).sort(), [...review.ROLE_CONDITIONS[entry.role]].sort());
  const zoomUrl = review.buildStudyUrl(
    entry,
    "https://example.test/screen-share-study/review-back-preview.html",
    "zoom",
    "TESTTOKEN",
  );
  assert.equal(zoomUrl.pathname, "/versions/chs-v81-researcher-back-preview/index.html");
  assert.equal(zoomUrl.searchParams.get("facilitator"), "1");
  assert.equal(zoomUrl.searchParams.get("assignmentMethod"), "review_preview_only");
  assert.equal(zoomUrl.searchParams.get("previewIndex"), "0");
}

const familyPlanD = entries.find((entry) =>
  entry.role === "family"
  && entry.event === "HUG"
  && entry.visualPlan === 4
  && entry.scheduleIndex === 0
);
assert.ok(familyPlanD);
assert.equal(familyPlanD.visualPlanMap["SISTER-BROTHER"], "b");
assert.deepEqual(
  { ...review.sidePlacement(
    "SISTER-BROTHER",
    familyPlanD.visualPlanMap["SISTER-BROTHER"],
    familyPlanD.pairings["SISTER-BROTHER"],
  ) },
  { left: "Sister", middle: "Kid", right: "Brother" },
);

console.log("Researcher Back preview verification passed: 96 isolated v81 links.");
