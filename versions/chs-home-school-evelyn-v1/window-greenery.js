(function installWindowGreenery(globalObject) {
  "use strict";
  const version = "school-window-greenery-v1";
  const root = "versions/chs-home-school-evelyn-v1/assets/";
  const slugs = new Set([
    "bfkf-blue-1432f5", "bfkf-pink-eb52f7", "dkb-green-4ca98f", "dkb-purple-893df6",
    "dkt-bkf-gray-a9a9a9", "dkt-bkf-green-92902c", "dmk-ttk-blue-64d4ce", "dmk-ttk-purple-7b80f7",
    "mdk-blue-22528e", "mdk-red-a62b17", "mkd-skb-blue-8dd3fb", "mkd-skb-pink-f19ac8",
    "mks-tkf-orange-f2b13d", "mks-tkf-red-ed6e57", "mkt-skf-green-81d653", "mkt-skf-yellow-ffd100", "tkc-plum-8e2d94",
  ]);
  function correctedRoomPath(source) {
    const prefix = `${root}visual-repair-v1/`;
    const suffix = "/school-room.webp";
    if (typeof source !== "string" || !source.startsWith(prefix) || !source.endsWith(suffix)) return source;
    const slug = source.slice(prefix.length, -suffix.length);
    return slugs.has(slug) ? `${root}window-greenery-v1/${slug}/school-room.svg` : source;
  }
  function applyToManifest(manifest) {
    for (const trial of manifest?.trials || []) {
      const visual = trial.homeSchoolFurnished;
      if (!visual) continue;
      const corrected = correctedRoomPath(visual.schoolBackground);
      if (corrected === visual.schoolBackground) continue;
      visual.schoolBackgroundBeforeWindowRepair = visual.schoolBackground;
      visual.schoolBackground = corrected;
      visual.windowGreeneryRepairVersion = version;
    }
    return manifest;
  }
  globalObject.WTCWindowGreenery = Object.freeze({ version, correctedRoomPath, applyToManifest });
})(typeof window === "undefined" ? globalThis : window);
