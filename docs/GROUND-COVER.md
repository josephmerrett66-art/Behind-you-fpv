# Grass and ground-cover visual pass

The short, evenly scattered turf read as speckles. The new turf groups slim blades in small root neighbourhoods, with varied heights and softer sage/green colour gradients. It uses 60,000 triangles per ring instead of 100,000: 240,000 across four rings instead of 400,000. Geometry attribute storage drops from 8.4 MB to 5.04 MB (decimal), shared across the four draws.

The ground beneath it has more coherent mossy green patches and warm exposed earth. This reuses the ground shader's existing noise values and texture samples. Modelled grass tufts have narrower blades and less saturated colour gradients. Living ground-cover leaves use gentler lighting on both faces so fern leaflets and foliage remain readable. Solid props retain their original lighting.

Plant locations, instance counts, interaction rules, terrain geometry, exclusion masks, grass rings and fade ranges are preserved. Outlines are untouched; screenshots and performance comparisons use **outlines off**, as requested. Fully masked or out-of-ring blades now clip before terrain/wind work instead of flattening into degenerate triangles that could leave tiny raster slivers. No new textures, noise samples, draw calls or post-processing effects were added. The extra leaf normal arithmetic is offset in these measurements by reduced turf geometry and narrower tuft silhouettes.

## Visual review

`tools/check-ground-cover.cjs` captures deterministic forest, underfoot, glade, meadow, coast and night views with outlines off, and checks shader/browser errors. It also renders turf alone on the GPU to verify that a filled exclusion mask removes every blade, that grass produces visible pixels without the mask, and that hiding grass removes every blade. Before/after screenshots are in the workspace outputs folders `ground-cover-before` and `ground-cover-after`.

The result keeps the game's simple low-poly style. It is a modest in-engine foliage improvement, not the generated concept image's dense, highly detailed vegetation.

## Performance

All runs use the same seeded moving-player/camera routes, 60 warm-up frames and 300 measured frames per fixture. Outlines are off in both versions. The baseline is commit `fa2e2cf`.

| Test | Before mean frame interval | After | Before p95 | After p95 |
| --- | ---: | ---: | ---: | ---: |
| Fixed Sharp, DPR 1, coastal route | 29.00 ms | 25.22 ms | 50.0 ms | 33.4 ms |
| Auto, DPR 2, empty base | 24.33 ms | 22.94 ms | 49.9 ms | 33.4 ms |
| Auto, DPR 2, 200 pieces | 31.05 ms | 30.00 ms | 50.0 ms | 50.0 ms |
| Auto, DPR 2, 800 pieces | 27.89 ms | 25.28 ms | 50.0 ms | 49.9 ms |

Auto settled at the same resolution scale (0.55) before and after in all three fixtures. The fixed-resolution comparison prevents a resolution reduction from hiding a rendering slowdown. Frame intervals include browser/GPU scheduling; CPU timings include graphics submission/driver waits. Results are local measurements, not a guarantee for every device. Full metrics and loaded-build hashes are in `GROUND-COVER-RESULTS.json`.

Validation completed: **185 checks passed** (3 ground-cover GPU checks, 37 distance checks, 10 smoothing checks, 7 shadow checks and 128 playtest checks), with no browser/shader errors.

## Reproduce

Requires Node, Playwright and Chrome/Chromium (`CHROME_PATH`).

```sh
node build.js index.html
TEST_OUTPUT=../../outputs/ground-cover-after node tools/check-ground-cover.cjs
BENCH_INK=0 BENCH_COAST=1 node tools/profile-smooth.cjs
BENCH_INK=0 BENCH_DPR=2 BENCH_QUALITY=auto node tools/profile-smooth.cjs
node tools/check-distance.cjs
node tools/check-smooth.cjs
node tools/check-shadows.cjs
node tools/check-playtest.cjs
```

Set `GAME_FILE` to a saved prior packed HTML for before captures and measurements. For captures of an older build, add `VISUAL_ONLY=1` to skip the new strict zero-pixel exclusion check; the baseline can leave a few degenerate raster slivers. The profiling tool retains its previous default outline setting unless `BENCH_INK=0` is specified.
