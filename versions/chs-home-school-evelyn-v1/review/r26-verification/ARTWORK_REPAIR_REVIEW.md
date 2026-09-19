# R26 artwork repair — independent verification

This report concerns the local R26 candidate only. It does not assert publication, a saved CHS configuration, browser behavior, or audio quality.

## FOOD background holes and contaminated fruit: repaired and verified

The new `food-artwork-repair.js` routes the 36 active trial variants' FOOD event and question foregrounds to 72 native SVG wrappers. The original PNGs remain embedded unchanged. The wrappers only:

1. Mask bounded, fully opaque white background components trapped between the helpers' inner arms/legs and their bowls.
2. On Teacher–Kid–Classmate variants 14b and 14d, restore the contaminated strawberry pixels from matching-side clean illustrations 14a and 14c. Character colors, eyes, role labels, bowl shape and alpha, and all pixels outside the repair masks remain unchanged.

Pixel regression result:

- All 560 original foreground raster files retain their original SHA-256 hashes.
- All 36 active variants × 2 FOOD pages rendered successfully.
- 1,421,400 trapped background pixels made transparent across the 72 files.
- 27,214 contaminated fruit pixels restored across the four 14b/14d event/question files.
- 59,944,100 opaque and 87,906,486 transparent pixels outside the repair masks preserved.
- Independently protected caption/eye/recipient areas cover 123,946,488 pixel checks.
- Zero changed pixels outside the approved masks; runtime routing is idempotent and leaves inactive/non-FOOD routes unchanged.

Visual review covered 144 furnished composites (36 variants × event/question × Home/School), inspected using 18 contact sheets and enlarged before/after crops. The broad white wedges and violet strawberry speckling are absent. Thin original antialiased outlines at extreme magnification are preserved, not indiscriminately erased.

Evidence:

- `food/repair-manifest.json`: exact source hashes, donor hashes, mask components and row runs.
- `food/all-<1|2|5|6|7|9|10|13|14>-page-<1|2>.png`: all active variants, both contexts.
- `food/detail-14b.png` and `food/detail-14d.png`: both helpers' strawberry repairs, before/after.
- `food/detail-5a.png`, `food/detail-1a.png`, `food/detail-1c.png`, `food/detail-6a.png`: adult, mixed and child gap repairs.
- Test: `tests/verify_home_school_food_artwork_repair.mjs` — PASS.

These still composites intentionally preserve the source's baked caption wording; the actual study replaces the top line with its context-aware runtime caption. They are artwork/mask evidence, not a substitute for the main browser/audio review.

## Exterior windows: independent review passed

Reviewed the `exterior-palette.js` changes against commit `535da1c`, the complete `tests/verify_home_school_r26_clean_windows.mjs`, all 34 rendered window-detail entries (17 palettes × Home/School), and full orange/aqua Home and coral/yellow School examples.

The change is appropriately scoped:

- Home: the former pane-wide pigment-key layer is replaced by continuous recoloring inside the eight previously traced curtain silhouettes. The foreground lamp is excluded. The 0.7-pixel edge softening avoids hard mask edges without painting the center of the glass.
- School: the pane-wide recoloring layer is removed. Original glass, blinds and visible interior reflections are retained. The existing exterior architectural trim coloring is unchanged.
- Yellow retains the previous approved Home curtain and School door treatment.

The supplied regression receipt reports 49,930,530 pixels outside the window regions unchanged, 1,770,601 protected School glass/blind pixels identical to the immutable source, and both full yellow exteriors pixel-identical to R25.

An additional independent source-pixel comparison passed for 2,494,274 pixels across all 17 palettes. It checks independently chosen Home clear-pane, lamp and mullion zones, plus School blinds and door glass. No protected-region recoloring or new patchy islands was found in the inspected images.

Evidence:

- `windows/all-window-details.png`: complete window comparison.
- `windows/verification.json`: main regression receipt.
- `windows/independent-verification.json`: independent clear-pane/lamp/blind/door-glass check.
- `independent-window-check.mjs`: reproducible supplementary check against immutable exterior masters.

## Integration notes

Load `food-artwork-repair.js` before `app.js`; call `window.WTCFoodArtworkRepair?.applyToManifest(eventManifest)` before event planning/preloading. Apply foreground contrast routing after FOOD/HELP repair routing so it wraps the repaired artwork rather than bypassing it.

No original raster files, event manifests, application runtime, index page, or CHS state were edited by this artwork-repair subtask. New FOOD verification artifacts were copied into this R26 directory; the earlier working proof under `r25-thorough-audit` is retained rather than deleted.
