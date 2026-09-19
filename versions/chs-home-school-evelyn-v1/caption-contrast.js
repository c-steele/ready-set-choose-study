(function installCaptionContrast(globalObject) {
  "use strict";
  const version = "pale-caption-lettering-v1";
  const root = "versions/chs-home-school-evelyn-v1/assets/home_school/foregrounds/";
  const darkText = "#17252b";
  const paleColors = new Set(["#FFD100", "#81D653", "#F2B13D", "#A9A9A9", "#4CA98F", "#EB52F7"]);
  const repairedTrials = new Set(["1a", "1c", "2a", "2c", "5a", "5b", "5c", "5d", "6a", "6b", "6c", "6d", "7b", "7d", "9a", "9c", "10a", "10c", "13b", "13d"]);
  function textColorForHex(hex) {
    return paleColors.has(String(hex || "").toUpperCase()) ? darkText : "#ffffff";
  }
  function correctedForegroundPath(source, hex) {
    if (typeof source !== "string" || !source.startsWith(root) || textColorForHex(hex) !== darkText) return source;
    const match = /^(?:(?:help-gaps-v1|food-repair-v1)\/)?(\d+[abcd])\/(intro_0[2-4]|hug_0[12]|help_0[12]|food_0[12])\.(?:png|svg)$/.exec(source.slice(root.length));
    if (!match || !repairedTrials.has(match[1])) return source;
    return `${root}caption-contrast-v1/${match[1]}/${match[2]}.svg`;
  }
  function applyToManifest(manifest) {
    for (const trial of manifest?.trials || []) {
      const hex = trial.homeSchoolFurnished?.characterHex;
      if (textColorForHex(hex) !== darkText) continue;
      let repaired = false;
      function visit(value) {
        if (!value || typeof value !== "object") return;
        if (typeof value.homeSchoolForegroundSrc === "string") {
          const corrected = correctedForegroundPath(value.homeSchoolForegroundSrc, hex);
          if (corrected !== value.homeSchoolForegroundSrc) {
            value.homeSchoolForegroundBeforeCaptionContrast = value.homeSchoolForegroundSrc;
            value.homeSchoolForegroundSrc = corrected;
            value.captionContrastVersion = version;
            repaired = true;
          }
        }
        for (const child of Object.values(value)) if (child && typeof child === "object") visit(child);
      }
      visit(trial.blocks);
      if (repaired) trial.homeSchoolFurnished.captionContrastVersion = version;
    }
    return manifest;
  }
  globalObject.WTCCaptionContrast = Object.freeze({ version, textColorForHex, correctedForegroundPath, applyToManifest });
})(typeof window === "undefined" ? globalThis : window);
