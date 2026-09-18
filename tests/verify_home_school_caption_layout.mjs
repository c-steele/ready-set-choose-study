import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Real-browser layout check. Resolve Playwright from the normal installation
// or NODE_PATH; no participant session, remote service, or audio is started.
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidate = path.join(root, "versions/chs-home-school-evelyn-v1");
const contextManifest = JSON.parse(fs.readFileSync(path.join(candidate, "data/home_school_context_manifest.json")));
const trials = JSON.parse(fs.readFileSync(path.join(candidate, "data/ksize_manifest.json"))).trials;
const app = fs.readFileSync(path.join(candidate, "app.js"), "utf8");
const mainIndex = app.lastIndexOf("\nmain().catch(");
assert.ok(mainIndex > 0);
const browser = await chromium.launch({ headless: true, channel: process.env.CHROME_CHANNEL || "chrome" });
const outputDirectory = process.env.CAPTION_SCREENSHOT_DIR;
if (outputDirectory) fs.mkdirSync(outputDirectory, { recursive: true });
let checked = 0;

try {
  const page = await browser.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "caption.test") return route.abort();
    if (url.pathname === "/__caption_test__") {
      return route.fulfill({ contentType: "text/html", body: "<!doctype html><html><head></head><body></body></html>" });
    }
    const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) return route.abort();
    await route.fulfill({ path: file });
  });
  await page.goto("http://caption.test/__caption_test__");
  for (const filename of ["styles.css", "entrance.css"]) {
    await page.addStyleTag({ content: fs.readFileSync(path.join(candidate, filename), "utf8") });
  }
  await page.addScriptTag({ content: `
    window.KSIZE_RUNTIME_CONFIG = { assetBaseUrl: "http://caption.test/", lockedStudyVersion: "home-school" };
    ${app.slice(0, mainIndex)}
    window.renderCaptionFixture = ({ manifest, trial, context, event, kind, text }) => {
      homeSchoolContextManifest = manifest;
      activeStudyContext = context;
      activeStudyEvent = event;
      const entrance = ["exterior", "room_entry"].includes(kind);
      const intro = kind === "intro" || kind === "context_intro";
      const block = trial.blocks[event];
      const image = entrance ? { homeSchoolEmptyRoom: true }
        : intro ? trial.blocks.INTRO.introSlides.at(-1).images[0]
        : block.images[kind === "response_choices" ? block.images.length - 1 : 0];
      document.body.innerHTML = renderKidSlide({ trial, image, text, slideKind: kind,
        contextCondition: trial.blocks.INTRO.condition, studyContext: context,
        overlayChoices: kind === "response_choices",
        choices: kind === "response_choices" ? block.choices : [] });
      // The room caption changes after the entrance finishes in the runtime.
      if (kind === "room_entry") document.querySelector(".ksize-context-spoken-banner").textContent = text;
    };
  ` });

  const generalTrial = trials.find((trial) => trial.isComplete && trial.blocks.INTRO.condition === "TEACHER-CLASSMATE");
  const recipients = [generalTrial, ...["MOM-KID", "DAD-KID", "TEACHER-KID"].map((condition) =>
    trials.find((trial) => trial.isComplete && trial.blocks.INTRO.condition === condition))];
  assert.ok(recipients.every(Boolean));
  const viewportSizes = [{ width: 900, height: 600 }, { width: 1280, height: 720 },
    { width: 1650, height: 720 }, { width: 1650, height: 1000 }];
  for (const viewport of viewportSizes) {
    await page.setViewportSize(viewport);
    for (const context of ["HOME", "SCHOOL"]) {
      const spec = contextManifest.contexts[context];
      const fixtures = [
        { kind: "exterior", text: spec.exterior.text },
        { kind: "room_entry", text: spec.room.text },
        { kind: "intro", text: generalTrial.blocks.INTRO.introSlides.at(-1).text },
        { kind: "context_intro", text: spec.intro.text },
        ...recipients.flatMap((trial) => ["HUG", "FOOD", "HELP"].flatMap((event) =>
          ["story", "response_choices"].map((kind) => ({ trial, event, kind })))),
      ];
      let standard;
      for (const fixture of fixtures) {
        await page.evaluate((args) => window.renderCaptionFixture(args), {
          manifest: contextManifest, trial: generalTrial, context, event: "HUG", ...fixture,
        });
        const metrics = await page.evaluate(() => {
          const caption = document.querySelector(".ksize-context-spoken-banner");
          const rect = caption.getBoundingClientRect();
          const scene = caption.parentElement.getBoundingClientRect();
          const style = getComputedStyle(caption);
          const range = document.createRange();
          range.selectNodeContents(caption);
          const text = range.getBoundingClientRect();
          const stage = document.querySelector(".ksize-entry-stage")?.getBoundingClientRect();
          return { width: scene.width, height: rect.height, font: parseFloat(style.fontSize),
            family: style.fontFamily, weight: style.fontWeight, padding: style.padding,
            bottom: rect.bottom, stageTop: stage?.top,
            textFits: text.left >= rect.left && text.right <= rect.right + 0.1 && text.bottom <= rect.bottom,
            wrapped: text.height > parseFloat(style.lineHeight) * 1.5 };
        });
        const label = `${viewport.width}x${viewport.height} ${context} ${fixture.kind} ${fixture.event || ""}`;
        standard ||= metrics;
        assert.equal(metrics.font, standard.font, `${label}: font size changes between pages`);
        assert.equal(metrics.family, standard.family, `${label}: font family changes`);
        assert.equal(metrics.weight, standard.weight, `${label}: font weight changes`);
        assert.equal(metrics.padding, standard.padding, `${label}: padding changes`);
        assert.ok(Math.abs(metrics.font / metrics.width - 0.028) < 0.00001, `${label}: font does not scale with picture`);
        assert.ok(metrics.height / metrics.width >= 100 / 1920, `${label}: source header is exposed`);
        assert.ok(metrics.height / metrics.width < 160 / 1920, `${label}: caption reaches character boxes`);
        assert.ok(metrics.textFits, `${label}: caption text clips`);
        if (!["story", "response_choices"].includes(fixture.kind)) {
          assert.equal(metrics.height, standard.height, `${label}: short caption height changes`);
        }
        if (metrics.stageTop != null) {
          assert.ok(metrics.bottom <= metrics.stageTop + 0.1, `${label}: caption overlaps entrance roof`);
        }
        if (fixture.kind === "response_choices" && fixture.event === "FOOD") {
          assert.ok(metrics.wrapped, `${label}: long question should wrap at the standard size`);
        }
        if (outputDirectory && viewport.width === 1650 && viewport.height === 1000 && context === "SCHOOL"
            && ["exterior", "context_intro", "response_choices"].includes(fixture.kind)
            && (!fixture.event || (fixture.event === "FOOD" && fixture.trial === recipients.at(-1)))) {
          await page.evaluate(() => Promise.all(Array.from(document.images, (image) => image.decode().catch(() => {}))));
          await page.locator(".ksize-furnished-scene").screenshot({ path: path.join(outputDirectory, `${fixture.kind}.png`) });
        }
        checked += 1;
      }
    }
  }
  console.log(`Verified ${checked} rendered captions across four viewport sizes, both settings, all three events, and all four recipient types.`);
} finally {
  await browser.close();
}
