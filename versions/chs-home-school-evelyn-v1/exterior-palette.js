(function installExteriorPalette(globalObject) {
  "use strict";

  // The immutable exterior masters and every door crop share this coordinate
  // system. Filtering is applied before cropping, never to the whole page.
  const SOURCE_SIZE = Object.freeze({ width: 1672, height: 941 });
  const DOOR_CROPS = Object.freeze({
    HOME: Object.freeze({ x: 752, y: 375, width: 162, height: 307 }),
    SCHOOL: Object.freeze({ x: 725, y: 440, width: 220, height: 202 }),
  });
  const MASK_GEOMETRY = Object.freeze({
    HOME: Object.freeze({
      rectangles: Object.freeze([[168, 332, 1312, 352]]),
      polygons: Object.freeze(["835,185 640,303 1029,303"]),
      // Window interiors are handled by a separate pigment-only layer below.
      exclusions: Object.freeze([[338, 383, 177, 196], [1149, 383, 176, 196]]),
    }),
    SCHOOL: Object.freeze({
      rectangles: Object.freeze([[0, 117, 1672, 548]]),
      polygons: Object.freeze([]),
      exclusions: Object.freeze([
        [0, 407, 85, 150], [166, 407, 153, 151], [371, 407, 153, 151],
        [1149, 406, 155, 151], [1357, 408, 153, 149], [1589, 407, 83, 151],
        [726, 400, 218, 34],
        [745, 459, 74, 81], [853, 459, 73, 81],
        [745, 565, 74, 50], [853, 565, 73, 50],
      ]),
    }),
  });
  const WINDOW_INTERIORS = Object.freeze({
    HOME: Object.freeze([
      [338, 383, 84, 91], [431, 383, 83, 91],
      [338, 483, 84, 89], [431, 483, 83, 89],
      [1151, 383, 83, 91], [1244, 383, 81, 91],
      [1151, 483, 83, 89], [1244, 483, 81, 89],
    ]),
    SCHOOL: Object.freeze([
      [0, 407, 85, 150], [166, 407, 153, 151], [371, 407, 153, 151],
      [1149, 406, 155, 151], [1357, 408, 153, 149], [1589, 407, 83, 151],
      [745, 459, 74, 81], [853, 459, 73, 81],
      [745, 565, 74, 50], [853, 565, 73, 50],
    ]),
  });
  const LUMINANCE = Object.freeze([0.299, 0.587, 0.114]);
  const PURPLE_CHROMA = Object.freeze([0.5, -1, 0.5]);
  // Explicit curtain silhouettes avoid color-keying the translucent glass.
  // Coordinates are traced from the immutable Home exterior, behind mullions.
  const YELLOW_HOME_CURTAINS = Object.freeze([
    "338,383 366,383 362,421 356,442 350,463 348,474 338,474",
    "338,483 348,483 345,500 347,523 351,543 357,558 353,572 338,572",
    "488,383 514,383 514,474 502,474 497,451 493,426",
    "502,483 514,483 514,572 501,572 502,541 504,517",
    "1151,383 1179,383 1175,413 1168,441 1159,474 1151,474",
    "1151,483 1159,483 1158,513 1162,543 1167,572 1151,572",
    "1298,383 1325,383 1325,474 1312,474 1305,437",
    "1312,483 1325,483 1325,572 1301,572 1307,539",
  ]);
  let nextInstance = 0;

  function escapeAttribute(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;")
      .replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function normalizeContext(value) {
    const context = String(value || "").toUpperCase();
    if (["HOME", "HOUSE"].includes(context)) return "HOME";
    if (context === "SCHOOL") return "SCHOOL";
    throw new Error(`Unknown exterior context: ${value}`);
  }

  function normalizedHex(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toUpperCase() : "";
  }

  function matrixForHex(value) {
    const hex = normalizedHex(value);
    if (!hex) throw new Error(`Exterior palette requires an exact six-digit characterHex: ${value}`);
    const target = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
    const targetY = target.reduce((sum, channel, index) => sum + channel * LUMINANCE[index], 0);
    const span = Math.max(...target) - Math.min(...target);
    // Source purple chroma becomes the target hue while original luminance
    // and gentle/strong pigment contrast are retained. Gray has zero chroma.
    const rows = target.flatMap((channel) => {
      const gain = span > 0 ? (channel - targetY) / span : 0;
      return [...LUMINANCE.map((weight, index) => weight + gain * PURPLE_CHROMA[index]), 0, 0];
    });
    return [...rows, 0, 0, 0, 1, 0];
  }

  function pigmentAlphaForRGB(rgb) {
    const [r, g, b] = rgb.map(Number);
    const clamp = (value) => Math.max(0, Math.min(1, value));
    // Opaque school door frames are much less saturated than facade trim:
    // their original R-G is often only 4-8/255. Blue glass has R<=G, and
    // the barely-purple house glass has R-G=2; neither passes this ramp.
    return clamp((r - g) * 0.5 - 1) * clamp((b - g) / 255 * 32 - 0.5);
  }

  function windowInteriorAlphaForRGB(rgb) {
    const luminance = rgb.reduce((sum, channel, index) => sum + channel * LUMINANCE[index], 0);
    // Do not recolor white blinds, mullions or bright reflected highlights.
    // Blue reflection pixels also fail the original-purple pigment gate.
    return pigmentAlphaForRGB(rgb) * Math.max(0, Math.min(1, (240 - luminance) / 16));
  }

  function rectHtml(rect, fill) {
    const [x, y, width, height] = rect;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
  }

  function architectureMaskHtml(context, id, yellow = false) {
    const geometry = MASK_GEOMETRY[context];
    return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941" style="mask-type:luminance">`
      + geometry.rectangles.map((rect) => rectHtml(rect, "white")).join("")
      + geometry.polygons.map((points) => `<polygon points="${points}" fill="white"/>`).join("")
      + geometry.exclusions.map((rect) => rectHtml(rect, "black")).join("")
      + (yellow && context === "SCHOOL"
        ? `<polygon points="0,0 1672,0 1672,316 1154,316 1154,284 836,132 518,282 518,316 0,316" fill="black"/>`
          + `<circle cx="836" cy="252" r="42" fill="black"/>`
        : "")
      + "</mask>";
  }

  function windowInteriorMaskHtml(context, id) {
    return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941" style="mask-type:luminance">`
      + WINDOW_INTERIORS[context].map((rect) => rectHtml(rect, "white")).join("") + "</mask>";
  }

  function yellowCurtainDefs(maskId, filterId) {
    const softenId = `${maskId}-soften`;
    return `<filter id="${softenId}" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="0.7"/></filter>`
      + `<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941" style="mask-type:luminance"><g filter="url(#${softenId})">`
      + YELLOW_HOME_CURTAINS.map(points => `<polygon points="${points}" fill="white"/>`).join("")
      // Protect the lamp in front of the left curtain.
      + `<polygon points="356,421 387,421 396,468 345,468" fill="black"/></g></mask>`
      + `<filter id="${filterId}" filterUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941" color-interpolation-filters="sRGB">`
      + `<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 21.25 -21.25 0 0 0" result="curtainPigment"/>`
      + `<feColorMatrix in="SourceGraphic" type="matrix" values="0.1196 0.2348 0.0456 0 0.60 0.19435 0.38155 0.0741 0 0.30 0.299 0.587 0.114 0 -0.20 0 0 0 1 0" result="softYellowCurtain"/>`
      + `<feComposite in="softYellowCurtain" in2="curtainPigment" operator="in"/></filter>`;
  }

  function filterHtml(matrix, id, windowInterior = false) {
    const values = matrix.map((value) => Number(value.toFixed(9))).join(" ");
    // AND the two original-source chroma gates. Blue sky/glass has R<G;
    // greenery has R<G/B<G; warm wood, cream walls and paths have B<G.
    const gate = (red, green, blue, offset, result) => `<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${red} ${green} ${blue} 0 ${offset}" result="${result}"/>`;
    return `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941" color-interpolation-filters="sRGB">`
      + gate(127.5, -127.5, 0, -1, "redOverGreen") + gate(0, -32, 32, -0.5, "blueOverGreen")
      + `<feComposite in="redOverGreen" in2="blueOverGreen" operator="in" result="originalPurplePigment"/>`
      + (windowInterior ? gate(...LUMINANCE.map((value) => -255 * value / 16), 15, "excludeBrightWhites")
        + `<feComposite in="originalPurplePigment" in2="excludeBrightWhites" operator="in" result="windowInteriorPigment"/>` : "")
      + `<feColorMatrix in="SourceGraphic" type="matrix" values="${values}" result="palettePigment"/>`
      + `<feComposite in="palettePigment" in2="${windowInterior ? "windowInteriorPigment" : "originalPurplePigment"}" operator="in"/>`
      + "</filter>";
  }

  function create({ context, href, characterHex } = {}) {
    const resolvedContext = normalizeContext(context);
    const hex = normalizedHex(characterHex);
    const source = escapeAttribute(href);
    const matrix = hex ? matrixForHex(hex) : null;
    const yellow = hex === "#FFD100";
    // Yellow alone needs butter-yellow highlights and golden shadows rather
    // than olive tones. Retain the exact source-pigment and geometry masks.
    if (matrix && hex === "#FFD100") {
      const base = matrix.slice();
      [0.27, 0.58, 1].forEach((gain, row) => {
        for (let column = 0; column < 5; column++) {
          matrix[row * 5 + column] = gain * LUMINANCE.reduce((sum, weight, channel) => sum + weight * base[channel * 5 + column], 0);
        }
        matrix[row * 5 + 4] += [0.73, 0.40, -0.24][row];
      });
    }
    return Object.freeze({
      context: resolvedContext,
      characterHex: hex,
      enabled: Boolean(matrix),
      svg({ viewBox = [0, 0, SOURCE_SIZE.width, SOURCE_SIZE.height], className = "", opening = null } = {}) {
        if (!Array.isArray(viewBox) || viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) {
          throw new Error("Exterior viewBox must contain four finite source-space coordinates");
        }
        const id = `wtc-exterior-${resolvedContext.toLowerCase()}-${++nextInstance}`;
        const filterId = `${id}-pigment`;
        const architectureId = `${id}-architecture`;
        const windowId = `${id}-window-interiors`;
        const windowFilterId = `${id}-window-pigment`;
        const openingId = `${id}-opening`;
        const openingRect = opening ? [opening.x, opening.y, opening.width ?? opening.w, opening.height ?? opening.h] : null;
        if (openingRect && (!openingRect.every(Number.isFinite) || openingRect[2] <= 0 || openingRect[3] <= 0)) {
          throw new Error("Exterior opening must contain finite positive source-space dimensions");
        }
        const windowDefs = !matrix ? "" : yellow
          ? (resolvedContext === "HOME" ? yellowCurtainDefs(windowId, windowFilterId) : "")
          : windowInteriorMaskHtml(resolvedContext, windowId) + filterHtml(matrix, windowFilterId, true);
        const defs = (matrix ? architectureMaskHtml(resolvedContext, architectureId, yellow) + filterHtml(matrix, filterId)
          + windowDefs : "")
          + (openingRect ? `<mask id="${openingId}" maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941" style="mask-type:luminance"><rect width="1672" height="941" fill="white"/>${rectHtml(openingRect, "black")}</mask>` : "");
        const image = `<image href="${source}" width="1672" height="941" preserveAspectRatio="none"`;
        const layers = `${image}/>` + (matrix ? `${image} filter="url(#${filterId})" mask="url(#${architectureId})"/>`
          + ((!yellow || resolvedContext === "HOME") ? `${image} filter="url(#${windowFilterId})" mask="url(#${windowId})"/>` : "") : "");
        return `<svg${className ? ` class="${escapeAttribute(className)}"` : ""} viewBox="${viewBox.join(" ")}" preserveAspectRatio="none" data-exterior-palette="${hex}" data-exterior-context="${resolvedContext}" aria-hidden="true"><defs>${defs}</defs><g${openingRect ? ` mask="url(#${openingId})"` : ""}>${layers}</g></svg>`;
      },
    });
  }

  globalObject.WTCExteriorPalette = Object.freeze({
    version: "who-takes-care-selective-exterior-palette-v2-window-interiors",
    yellowCleanupVersion: "yellow-exterior-cleanup-v3",
    sourceSize: SOURCE_SIZE,
    doorCrops: DOOR_CROPS,
    maskGeometry: MASK_GEOMETRY,
    windowInteriors: WINDOW_INTERIORS,
    matrixForHex,
    pigmentAlphaForRGB,
    windowInteriorAlphaForRGB,
    create,
  });
})(typeof window === "undefined" ? globalThis : window);
