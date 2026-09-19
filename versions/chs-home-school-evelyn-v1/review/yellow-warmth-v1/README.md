# Yellow background warmth — local review

Superseded by `../yellow-warmth-v2/README.md`: the user found this first tint too green. V1 files remain only for before/after comparison; current local routing uses V2.

Status: implemented locally, not committed/published, not saved to CHS. The hosted CHS draft remains approved r23 (`87a8fba20d5ffe0e5d00e886aab476ae6a4c9e63`).

Request: make the yellow backgrounds a little more yellow; all other color sets are already satisfactory.

Only `#FFD100` / `mkt-skf-yellow-ffd100` changes. The source artwork, all other palettes, character/foreground files, captions, narration, assignment logic, and geometry remain untouched. Home/School rooms and hallways have new native SVG palette overlays; the existing exterior/door/window pigment filter applies the same small warmth lift to yellow only. All previously repaired outdoor bush pixels are protected. Trial IDs: 5b, 5d, 6b, 6d.

Local comparison: `/review-yellow-warmth-local.html`. Existing `/review-green-yellow-characters-local.html` also uses the updated yellow room; other scenes are unchanged.

Builders: `scripts/build_home_school_yellow_warmth.mjs` and `scripts/build_yellow_warmth_review.mjs`. Yellow assets and manifest use `yellow-warmth-v1`. Routing runs after the existing greenery correction and before planning/preload.

Checks: `verify_home_school_yellow_warmth.mjs`, `verify_home_school_exterior_palette.mjs`, `verify_home_school_window_interior_palette.mjs`, `verify_home_school_window_greenery.mjs`, `verify_home_school_window_greenery_routing.mjs`, and `verify_home_school_furnished_candidate.mjs`. Independent invariants check original asset/manifest bytes, other palettes' SVGs, mask-zero pixels, and the entire corrected window-bush region.

Before any future CHS deployment: obtain review outcome, give the release a new cache/version marker, include the yellow helper and generated SVGs, verify the hosted files, then save the requested CHS draft. Do not submit/activate the study.
