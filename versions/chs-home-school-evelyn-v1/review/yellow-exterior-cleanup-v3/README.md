# Yellow exterior cleanup — local revision 3

Requested cleanup of patchy yellow windows and roof. V2 room/hall yellow colors remain unchanged; only yellow exterior rendering changes.

- School glazing is source-original: blue reflections, blinds, furniture silhouettes, and glass are no longer color-keyed.
- Home glass is source-original outside explicit softly feathered curtain silhouettes; the lamp is protected. Curtains retain a softer yellow color.
- A source-coordinate school roof exclusion preserves the neutral roof and outline while retaining the yellow fascia/gable trim. Clock face/hands retain their original color.
- All other color palettes, source rasters, characters, captions, audio, geometry, and assignment logic are unchanged.

Runtime uses the same updated exterior factory for the full scene and moving door crops. Cache marker: `yellow-exterior-cleanup-v3-local`. Builder `scripts/build_yellow_exterior_cleanup_review.mjs` renders exact PNG/SVG previews from that factory. Current review page: `/review-yellow-exteriors-local.html?v=clean-windows-roof-v3`; existing comparison pages also link/use V3 exteriors.

Local only, not committed/published/saved to CHS. CHS remains the r23 draft. Any future requested deployment needs a new full release/cache marker and hosted verification before the CHS draft save; do not submit or activate.
