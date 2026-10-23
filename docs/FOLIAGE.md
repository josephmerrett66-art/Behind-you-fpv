# More convincing tree foliage

Oak and cherry crowns have lobed cores and twelve small solid folded leaves around each clump. The extra edge detail replaces some of the core's sphere tessellation: each high-detail clump now costs 176 triangles instead of 192. Complete oak and cherry models use approximately 7% fewer triangles. Their indexed vertex counts increase by about 3%, while conifer triangle and vertex counts stay unchanged. Conifer hems now have deeper branch-tip notches and droop. Saplings share that tier primitive and were included in grounding checks.

The tree material uses a deterministic 256 × 256 packed field for pointed leaf blades, veins and needle sprays. Two local-space samples replace the previous two or three calls to eight-corner procedural noise. Fine detail is mipmapped and stays attached to swaying trees. Lighting varies between canopy interiors, upper growth and a restrained sun-facing highlight. Near-camera leaf thinning and the existing distance crossfade remain in place. The detail map is generated offline, with no image-generation work at runtime.

Foliage remains opaque with the same instanced draws and shadow approach. There are no additional tree draw calls or transparency layers. The new RGBA8 texture occupies 349,524 bytes including mip levels (about 0.33 MiB); the encoded PNG adds approximately 0.12 MB to the packed HTML. Grass movement, terrain, gameplay and outline settings are unchanged.

## Validation

208 checks pass: foliage geometry 2, ground cover 3, distance 37, shadows 7, grounding 31 and gameplay 128. All 24 species/variant/LOD models have finite attributes and retain indexed geometry. Triangle counts for every model were compared with the previous packed build: none increased. The existing gameplay suite includes construction, saving and loading. Shadow selection was tested against the full loaded caster pool. Actual game captures cover oak, cherry, spruce, fir and tall pine, leaf/needle close-ups, forest views and night, with outlines off.

Serial headless Chrome profiles measure 300 frames after 60 warm-up frames. No map generation or other benchmark overlapped these runs. The fixed Sharp/DPR 1 coast scene's average frame interval was 19.78 ms before and 19.56 ms after, with a 33.4 ms 95th percentile in both. CPU mean was 8.35 / 9.18 ms. Auto/DPR 2 forest scenes were:

| Built pieces | Before / after frame interval mean | Before / after CPU mean | Before / after render scale |
|---|---:|---:|---:|
| 0 | 19.89 / 18.83 ms | 9.14 / 9.97 ms | 0.613 / 0.697 |
| 200 | 21.67 / 20.00 ms | 8.51 / 8.38 ms | 0.55 / 0.55 |
| 800 | 17.89 / 17.72 ms | 8.57 / 8.55 ms | 0.55 / 0.55 |

These samples show no observed average frame-time regression. Auto chooses its own resolution, so the 0-piece pair uses different scales and is not an identical-resolution comparison. CPU timings and individual spikes vary; this is not a universal FPS guarantee. Full metrics, hashes and model budgets are in FOLIAGE-RESULTS.json.

## Reproduce

`python3 tools/make-foliage-map.py` uses NumPy and Pillow to regenerate the periodic packed map. Then run `node build.js index.html`. `node tools/check-foliage.cjs` captures the five tree forms and two close-ups, and audits all 24 geometries. GAME_FILE selects a previous packed build and TEST_OUTPUT selects the screenshot folder. Existing ground-cover, distance, shadow, grounding, playtest and profile tools provide the scene and regression checks.
