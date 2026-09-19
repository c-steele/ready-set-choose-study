# Pale caption lettering repair

Status: implemented locally; all asset and routing tests passed. Publishing and CHS draft installation are managed separately.

Only the white letters in role-name bars and bottom response-option bars change to dark `#17252b`. Character hues, bar hues, white eyes, facial features, body geometry, masks, fruit/boxes, and source raster bytes remain unchanged. The HTML top-caption color must be supplied by `WTCCaptionContrast.textColorForHex()` in the application.

| Palette | White contrast before | Dark contrast after | Active variants |
| --- | ---: | ---: | --- |
| `#F2B13D` | 1.89:1 | 8.33:1 | 1a, 1c, 2a, 2c |
| `#81D653` | 1.80:1 | 8.74:1 | 5a, 5c, 6a, 6c |
| `#FFD100` | 1.46:1 | 10.76:1 | 5b, 5d, 6b, 6d |
| `#4CA98F` | 2.85:1 | 5.52:1 | 7b, 7d |
| `#A9A9A9` | 2.35:1 | 6.69:1 | 9a, 9c, 10a, 10c |
| `#EB52F7` | 2.97:1 | 5.30:1 | 13b, 13d |

## Method

Each native SVG embeds its exact immutable foreground or already repaired Help/Food foreground. Existing SVG repairs are included as exact native SVG markup, avoiding an unnecessary extra base64 layer; their embedded PNG bytes remain unchanged. The builder finds actual role-bar spans by their exact source-color runs, confirms both bar edges, and selects only white/anti-aliased letters within inset caption rectangles. Native SVG paths replace those exact glyph pixels, recompositing anti-aliasing against the unchanged bar color. Outer bar rims and all nonletter pixels stay intact. INTRO 1 has no role labels and is deliberately not wrapped.

## Evidence

- 180 generated wrappers, covering 20 active variants × 9 applicable foregrounds.
- All 180 wrappers were rendered and compared pixel by pixel against their composed source.
- All 560 original furnished raster foregrounds remain byte-identical.
- 3,544,759 letter pixels changed; 130,975,217 opaque nonletter pixels protected.
- Zero alpha changes; zero RGB changes outside the letter masks.
- Existing Help repair retained in 40 wrappers; Food repair retained in 40 wrappers.
- Routing changes only foreground pointers and repair provenance; idempotence, all caption text, role assignment, scene layout, audio mappings, and unselected palettes are unchanged.
- Spot inspection of rendered yellow FOOD and magenta HUG confirmed dark, clean role/option lettering and preserved eyes, shapes, and bar hues.

Full receipt: `caption-contrast.json` in this directory. Source/output hashes and confirmed caption rectangles are in `../../data/caption_contrast_manifest.json`.

## Integration and remaining verification

Load `caption-contrast.js` before the application. Apply `WTCCaptionContrast.applyToManifest(eventManifest)` after Help and Food repair helpers and before timeline planning/preloading. Use `textColorForHex(hex)` for the HTML top-caption text color. Existing paths outside these six selected palettes pass through unchanged.

Native SVG rendering and transparent composition were verified locally. The complete 180-file pixel audit passed again after native SVG flattening. That byte-only optimization reduces the full wrapper collection from 53,507,852 to 46,760,578 bytes (12.6%) while preserving exact decoded RGBA and original embedded raster bytes. No PNG recompression or glyph-geometry compaction was installed. This is not a per-session transfer measurement and does not account for HTTP compression.

Independent review of local-browser runs 01–06 confirmed the integrated top captions and baked label/option lettering in 72 saved choice screenshots; see `browser-independent-review.md`. A hosted CHS check and actual delivery-performance check remain separate requirements.
