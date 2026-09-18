(function installHelpGapRepair(globalObject) {
  "use strict";
  const version = "help-arm-gap-mask-v1";
  const root = "versions/chs-home-school-evelyn-v1/assets/home_school/foregrounds/";
  const repairedTrials = new Set([1, 2, 5, 6, 7, 9, 10, 11, 12, 13, 14].flatMap((number) => ["a", "b", "c", "d"].map((variant) => `${number}${variant}`)));
  function correctedForegroundPath(source) {
    if (typeof source !== "string" || !source.startsWith(root)) return source;
    const match = /^(\d+[abcd])\/(help_0[12])\.png$/.exec(source.slice(root.length));
    if (!match || !repairedTrials.has(match[1])) return source;
    return `${root}help-gaps-v1/${match[1]}/${match[2]}.svg`;
  }
  function applyToManifest(manifest) {
    for (const trial of manifest?.trials || []) {
      let repaired = false;
      for (const image of trial.blocks?.HELP?.images || []) {
        const corrected = correctedForegroundPath(image.homeSchoolForegroundSrc);
        if (corrected === image.homeSchoolForegroundSrc) continue;
        image.homeSchoolForegroundBeforeGapRepair = image.homeSchoolForegroundSrc;
        image.homeSchoolForegroundSrc = corrected;
        image.helpGapRepairVersion = version;
        repaired = true;
      }
      if (repaired && trial.homeSchoolFurnished) trial.homeSchoolFurnished.helpGapRepairVersion = version;
    }
    return manifest;
  }
  globalObject.WTCHelpGapRepair = Object.freeze({ version, correctedForegroundPath, applyToManifest });
})(typeof window === "undefined" ? globalThis : window);
