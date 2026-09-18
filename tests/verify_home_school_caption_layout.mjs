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
const welcomeTemplate = app.match(/const welcomeNode = \{\s*type: jsPsychHtmlButtonResponse,\s*stimulus: `([\s\S]*?)`,\s*choices: \[\]/)?.[1];
assert.ok(welcomeTemplate, "Actual welcome markup must be available for the shared-panel check");
const browser = await chromium.launch({ headless: true, channel: process.env.CHROME_CHANNEL || "chrome" });
const outputDirectory = process.env.CAPTION_SCREENSHOT_DIR;
if (outputDirectory) fs.mkdirSync(outputDirectory, { recursive: true });
let checked = 0;
let comparedSceneFrames = 0;
let bouncingChoiceChecks = 0;
let choiceCaptionOverlapChecks = 0;
let welcomePanelChecks = 0;

try {
  const page = await browser.newPage();
  await page.emulateMedia({ reducedMotion: "no-preference" });
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
    window.renderWelcomeFixture = () => {
      const requestedWithinChildContexts = true;
      document.body.innerHTML = \`${welcomeTemplate}\`;
    };
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
      if (kind === "room_entry") {
        entranceController(document.querySelector(".ksize-entry-layers"), context).skip();
        document.querySelector(".ksize-context-spoken-banner").textContent = text;
      }
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
    await page.evaluate(() => window.renderWelcomeFixture());
    const welcome = await page.evaluate(() => ({
      shellWidth: document.querySelector(".ksize-shell").getBoundingClientRect().width,
      panelWidth: document.querySelector(".ksize-screen").getBoundingClientRect().width,
      panelMinHeight: getComputedStyle(document.querySelector(".ksize-screen")).minHeight,
    }));
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
          const layers = document.querySelector(".ksize-entry-layers")?.getBoundingClientRect();
          const world = document.querySelector(".ksize-entry-world");
          const room = document.querySelector(".ksize-furnished-room");
          const roomRect = room.getBoundingClientRect();
          const roomStyle = getComputedStyle(room);
          return { width: scene.width, height: rect.height, font: parseFloat(style.fontSize),
            shellWidth: document.querySelector(".ksize-shell").getBoundingClientRect().width,
            panelWidth: document.querySelector(".ksize-screen").getBoundingClientRect().width,
            panelMinHeight: getComputedStyle(document.querySelector(".ksize-screen")).minHeight,
            family: style.fontFamily, weight: style.fontWeight, padding: style.padding,
            bottom: rect.bottom, sceneHeight: scene.height, sceneTop: scene.top,
            stageTop: stage?.top, stageHeight: stage?.height, layersTop: layers?.top,
            roomTop: roomRect.top, roomWidth: roomRect.width, roomHeight: roomRect.height,
            roomFit: roomStyle.objectFit, roomPosition: roomStyle.objectPosition,
            worldAspect: world ? getComputedStyle(world).aspectRatio : null,
            textFits: text.left >= rect.left && text.right <= rect.right + 0.1 && text.bottom <= rect.bottom,
            wrapped: text.height > parseFloat(style.lineHeight) * 1.5 };
        });
        const label = `${viewport.width}x${viewport.height} ${context} ${fixture.kind} ${fixture.event || ""}`;
        standard ||= metrics;
        assert.equal(metrics.shellWidth, welcome.shellWidth, `${label}: welcome/story shell widths differ`);
        assert.equal(metrics.panelWidth, welcome.panelWidth, `${label}: welcome/story outer panel widths differ`);
        assert.equal(metrics.panelMinHeight, welcome.panelMinHeight, `${label}: welcome/story panel sizing differs`);
        welcomePanelChecks += 1;
        assert.ok(Math.abs(metrics.width - standard.width) < 0.1, `${label}: scene width changes between pages`);
        assert.ok(Math.abs(metrics.sceneHeight - standard.sceneHeight) < 0.1, `${label}: scene height changes between pages`);
        assert.ok(Math.abs(metrics.sceneHeight - metrics.width * 9 / 16) < 0.1, `${label}: scene frame is not 16:9`);
        assert.ok(Math.abs(metrics.roomWidth - metrics.width) < 0.1, `${label}: room width does not fill scene`);
        assert.ok(Math.abs(metrics.roomHeight - metrics.sceneHeight) < 0.1, `${label}: room height changes across entrance/character scenes`);
        assert.ok(Math.abs(metrics.roomTop - metrics.sceneTop) < 0.1, `${label}: empty room has a different vertical origin`);
        assert.equal(metrics.roomFit, "cover");
        assert.equal(metrics.roomPosition, "50% 57%");
        comparedSceneFrames += 1;
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
          assert.ok(Math.abs(metrics.stageTop - metrics.sceneTop) < 0.1, `${label}: entry stage does not start at the scene origin`);
          assert.ok(Math.abs(metrics.stageHeight - metrics.sceneHeight) < 0.1, `${label}: entry stage adds caption height`);
          assert.ok(metrics.bottom <= metrics.layersTop + 0.1, `${label}: caption overlaps entrance roof`);
          assert.equal(metrics.worldAspect, "1672 / 941", `${label}: building/door proportions change`);
        }
        if (fixture.kind === "response_choices") {
          const choice = await page.evaluate(() => {
            const button = document.querySelector(".ksize-char-btn");
            const caption = document.querySelector(".ksize-context-spoken-banner");
            const baseAnimation = getComputedStyle(button).animationName;
            button.classList.add("ksize-char-name-cue");
            for (const animation of button.getAnimations()) { animation.pause(); animation.currentTime = 279; }
            const style = getComputedStyle(button);
            const rect = button.getBoundingClientRect();
            const captionRect = caption.getBoundingClientRect();
            const overlap = rect.top < captionRect.bottom;
            let paintedInFront = true;
            if (overlap) {
              caption.style.pointerEvents = "auto";
              const x = rect.left + rect.width / 2;
              const y = (Math.max(rect.top, captionRect.top) + Math.min(rect.bottom, captionRect.bottom)) / 2;
              paintedInFront = document.elementFromPoint(x, y) === button;
              caption.style.pointerEvents = "none";
            }
            return { baseAnimation, animation: style.animationName, transform: style.transform,
              glow: style.boxShadow, choiceZ: Number(style.zIndex), captionZ: Number(getComputedStyle(caption).zIndex),
              overlap, paintedInFront };
          });
          assert.equal(choice.baseAnimation, "ksize-choice-pulse", `${label}: ordinary choices must keep their glow`);
          assert.equal(choice.animation, "ksize-name-cue-bounce", `${label}: spoken choices must keep their bounce`);
          assert.notEqual(choice.transform, "none", `${label}: name-cue bounce is not moving`);
          assert.notEqual(choice.glow, "none", `${label}: name-cue glow is missing`);
          assert.ok(choice.choiceZ > choice.captionZ, `${label}: choices must paint above captions`);
          assert.ok(choice.paintedInFront, `${label}: overlapping caption covers choice box`);
          bouncingChoiceChecks += 1;
          if (choice.overlap) choiceCaptionOverlapChecks += 1;
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
  assert.ok(choiceCaptionOverlapChecks > 0, "At least one real bouncing choice must overlap a caption to verify paint order");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedChoice = await page.locator(".ksize-char-btn").first().evaluate((button) => getComputedStyle(button).animationName);
  assert.equal(reducedChoice, "none", "Reduced-motion preference must still stop choice animation");
  console.log(JSON.stringify({ status: "PASS", renderedCaptions: checked, equalSceneFrames: comparedSceneFrames,
    bouncingChoiceChecks, choiceCaptionOverlapChecks, welcomePanelChecks,
    viewportSizes: 4, settings: 2, events: 3, recipientTypes: 4 }));
} finally {
  await browser.close();
}
