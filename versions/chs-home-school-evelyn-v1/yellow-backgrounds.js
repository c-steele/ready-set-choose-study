(function installYellowBackgrounds(globalObject) {
  'use strict';
  const slug = 'mkt-skf-yellow-ffd100';
  const version = 'yellow-interior-cleanup-v4';
  const root = 'versions/chs-home-school-evelyn-v1/assets/';
  const routes = new Map([
    [`assets/home_school/furnished_color_group_preview/${slug}/home_room_subtle_palette_wall_matched_pillows_palette_picture_floor_clean_v17.webp`, `${root}${version}/house-room.svg`],
    [`${root}window-greenery-v1/${slug}/school-room.svg`, `${root}${version}/school-room.svg`],
    ...['house','school'].map(place => [`${root}visual-repair-v1/${slug}/${place}-hall.webp`, `${root}${version}/${place}-hall.svg`]),
  ]);
  const correctedPath = source => routes.get(source) || source;
  function applyToManifest(manifest) {
    for (const trial of manifest?.trials || []) {
      const visual=trial.homeSchoolFurnished;
      if (visual?.paletteSlug!==slug || visual.characterHex?.toUpperCase()!=='#FFD100') continue;
      for (const field of ['homeBackground','schoolBackground']) {
        const corrected=correctedPath(visual[field]);
        if (corrected===visual[field]) continue;
        visual[`${field}BeforeYellowWarmth`]=visual[field];
        visual[field]=corrected;
        visual.yellowWarmthVersion=version;
      }
    }
    return manifest;
  }
  globalObject.WTCYellowBackgrounds=Object.freeze({version,correctedPath,applyToManifest});
})(typeof window==='undefined'?globalThis:window);
