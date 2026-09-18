# HELP arm / box gap repair

The original foreground extraction preserved small enclosed white areas to protect eye whites and white lettering. That also retained small source-background wedges between the central child's arms and the cardboard box.

The repair uses native SVG masks around the unchanged original PNG files. Four audited geometric arrangements cover all affected trials. Only fully opaque, pure-white connected components wholly inside the narrow arm / box bounds are masked. No source raster is rewritten or recompressed. Eyes, characters, lettering, boxes, other transparencies, and all pixels outside the masks remain unchanged.

- 112 HELP files inspected: two pages for each of 56 trials.
- 88 affected files across 44 child-recipient trials repaired.
- 24 already-correct adult-recipient files left unchanged.
- 32,096 trapped white pixels made transparent.
- All 560 original foreground PNG hashes match the original furnished manifest.
- Native SVG rasterization verified 71,337,664 protected opaque pixels and 111,107,040 protected transparent pixels unchanged outside the masks.
- Runtime mapping is idempotent, runs before planning/preloading, and retains the release cache version through the existing foreground path prefix.

Visual review: `help-gap-repair-before-after.png` shows the reported coral scene. `help-gap-repair-layout-audit.png` shows all four arrangements. The visible white crescents are gone. Original thin antialiased character/box edges are preserved, as they are across the rest of the character outlines; the repair does not redraw or broadly erode them.

Build: `scripts/build_home_school_help_gap_masks.mjs`.

Review images: `scripts/build_home_school_help_gap_review.mjs`.

Verification: `tests/verify_home_school_help_gap_masks.mjs`.

These files are prepared locally; this receipt does not claim a CHS save or publication.
