# Clearer yellow — revision 2 (local review)

Exterior rendering is superseded by `../yellow-exterior-cleanup-v3/README.md` after the user requested cleanup of window/roof artifacts. V2 room/hall assets remain current. The current comparison pages use V3 for exteriors; retain V2 exterior snapshots only as history.

The user found V1 still too green. V2 maps existing theme luminance Y to butter-yellow highlights and golden accents: R=.27Y+.73, G=.58Y+.40, B=Y−.24 (clamped). The same transformation is used for both rooms, halls, exteriors, and exterior window/door details.

Only #FFD100 / `mkt-skf-yellow-ffd100` and trials 5b, 5d, 6b, 6d are affected. Room and hall masks are identical to V1, including the full protected outdoor-bush region. Yellow exterior window details have stricter bright-white protection to preserve the blinds. All prior source artwork, other 16 palettes, characters, captions, audio, geometry and assignments are unchanged. V1 assets are retained for comparison.

Local study routing and both comparison pages use `assets/yellow-warmth-v2/`. The comparison shows V1 on the left and V2 on the right. Rebuild using `scripts/build_home_school_yellow_warmth.mjs` then `scripts/build_yellow_warmth_review.mjs`.

Not committed, published, or saved to CHS. CHS remains the r23 draft at 87a8fba20d5ffe0e5d00e886aab476ae6a4c9e63. This revision still needs the user's visual review. A future requested deployment must have a new release/cache marker and hosted-byte verification before the CHS draft save; do not submit or activate.
