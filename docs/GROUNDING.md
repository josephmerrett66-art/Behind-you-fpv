# Terrain contact and floating objects

Large mineable boulders were authored with their main body's lowest vertices several units above the model origin. A smaller neighbouring stone could touch the ground while the main body visibly floated. Instanced props also used one terrain height for the whole model, leaving downhill gaps on slopes.

The main boulder and its neighbouring stones are now seated independently. Ore remains attached to the lowered main body. Other ground-prop models with an entirely positive foot are lowered to their actual foot; berries retain their authored attachment height on their bush.

Reusable models keep up to twelve contact samples around their base. Each stationary placement fits the local slope and settles its sampled base slightly into the terrain. Rocks and logs follow the slope as rigid objects. Plants and posts remain upright, with their footprint following the local ground plane. These transforms are cached across world updates and stationary gatherable frames, bounded by the existing prop-set capacity and invalidated when terrain levelling fields change. This adds no draw calls, per-vertex terrain noise, textures or instance attributes. Tree root origins were checked without tilting or moving the trees.

Dropped items now rest on their visible silhouette's bottom edge instead of hovering and spinning. Existing tool glints remain. A cached triangle query places drops on completed built floors when present, including the floor's authored shape and elevation. Pickup, mining, collision and save rules are unchanged.

## Validation

`tools/check-grounding.cjs` checks all 21 ground-prop kinds across 324 model/terrain placements, including flat land, slopes and coast. Every inspected bottom vertex is at or below the terrain in these fixtures. It also checks tree roots across 72 placements, berry/bush alignment, stationary cache reuse, ground/floor support for dropped items, removal of drop bobbing/spinning and successful mining with a pick.

**216 checks passed**, with no browser or shader errors. The existing ground-cover GPU checks, distance checks, smoothing checks, shadow checks and playtest suite also run against the packed page. Before/after mineable-rock and ore screenshots are in `outputs/grounding-before` and `outputs/grounding-after` in the task workspace; `outputs/grounding-comparison.html` provides a slider comparison. Outlines are off in both versions.

This uses finite contact samples and slight embedding rather than a general rigid-body physics solver. It addresses ground-prop footing; intentional heights of built structures, flying objects and effects are preserved.

## Performance

The final cache fast path retains a stationary prop's fitted transform directly on its reusable item slot, avoiding per-frame string-key construction and Map lookups. The terrain work runs only for a new placement or changed terrain fields.

Final fixed-resolution comparison: Sharp, DPR 1, 1280×720, outlines off, the same seeded moving coastal route, 60 warm-up frames and 300 measured frames. Mean frame interval **24.721 → 24.666 ms**, p95 **33.4 → 33.4 ms**. Mean CPU/submission time **10.332 → 10.681 ms**; the `thingsFrame` scope averaged **0.623 → 0.674 ms**. Frame pacing was effectively unchanged in this local test. Exploratory Auto runs varied between repeats and were inconclusive; no general FPS improvement is claimed. These browser measurements include scheduling and driver waits and are not independent GPU timings. Full final metrics and packed-build hashes are in `GROUNDING-RESULTS.json`.

## Reproduce

Requires Node, Playwright and Chrome/Chromium (`CHROME_PATH`).

```sh
node build.js index.html
node tools/check-grounding.cjs
node tools/check-ground-cover.cjs
node tools/check-distance.cjs
node tools/check-smooth.cjs
node tools/check-shadows.cjs
node tools/check-playtest.cjs
BENCH_INK=0 BENCH_COAST=1 node tools/profile-smooth.cjs
```

Use `GAME_FILE` to select a prior packed build for profiling. For before screenshots, also set `VISUAL_ONLY=1` and `TEST_OUTPUT` to a separate directory. The baseline is commit `2c19447`.
