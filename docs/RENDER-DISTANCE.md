# Extended render distance — 23 October 2026

This update extends the surface world's visible/detail ranges to about twice the previous distance and removes mismatched loading edges that made objects appear in otherwise clear view.

| Visual class | Previous | Updated |
| --- | ---: | ---: |
| First-person world/fog horizon | 950 | 1900 |
| Isometric world horizon | 1500 | 3000 |
| Full-detail trees | 400 | 800 |
| Tree detail transition | abrupt at 400 | gradual from 800 to 1000 |
| Plants / ground decoration fade limit | 470 | 940 |
| Gatherable resource loading range | 540 | 1160 (fade ends at 1080) |
| Dropped items | 600 | 1200, with a gradual fade |
| Built structures / stations | about 560–620 | fade ends at 1240; preloaded farther |
| Fine beach detail | 560 | 1120, with a gradual fade |
| Grass outer field | 1080 | 2160; original near fields retained |

Distances are internal world units. Day/night and weather still affect fog. Sky and sea already extended past the world horizon. Figures use the expanded world range; gameplay spawn, encounter, interaction and audio rules retain their existing distances. This changes rendering visibility, not when gameplay entities are created.

## Preventing visible pop-in

Plant geometry previously loaded inside its shader's fade range. A 70-unit world refresh step could bring new plants directly into clear view. Geometry now preloads beyond the entire fade range plus movement and model-size margins. Trees likewise preload past the fog horizon, and both tree detail levels are resident before the crossfade starts. Buildings, resources, drops and fine shoreline geometry fade before their CPU loading/removal boundaries.

The camera far plane and terrain coverage extend past the new horizon. The original 10-unit terrain grid remains underfoot, with a coarser outer apron. The grass mask covers the wider area at its original world-space texel size. Render capacities and the bounded building cache accommodate the larger area rather than silently dropping instances.

## Performance work

Doubling distance covers roughly four times the area. The first implementation cost too much rendering time, so it was not published. The implementation now:

- Culls individual tree and plant instances against conservative camera bounds, keeping off-camera shadow casters needed by the sun pass. Camera matrices update before visibility testing, including rapid turns.
- Keeps tree shadows at their original detail distances while the visible models remain detailed twice as far away.
- Caches surface terrain height per instance, instead of evaluating terrain for every model vertex. Underground instances retain their original shader height path and skip the new camera compaction.
- Indexes identical model vertices while preserving every triangle attribute. No faces, normals, colors or model details are removed.
- Uploads only live instance entries, with dynamic buffers, instead of uploading unused expanded capacity.
- Keeps beach cells as cached, culled batches. Walking along the coast no longer merges and uploads the entire shoreline repeatedly. Fine shoreline data loads before it can become visible.

Initial loading, first visits to uncached areas and graphics-resolution changes can still cause stalls. No cave source, AI logic, save schema, placement rules or collision code was edited.

## Validation

Browser checks run the actual packed game in isolated Chrome profiles. They verify extended ranges, day/night fog, first-person/isometric far planes, model capacity, terrain coverage, grass mask density, resource materials, building/drop distances, camera-turn visibility and shoreline reuse.

GPU pixel checks verify gradual tree/detail fading and exact images with instance culling enabled versus disabled at four camera angles. Beach-cell culling likewise matches its unculled image, including shadows. Indexed model data reconstructs the original triangle attributes exactly. The existing gameplay checks cover the large saved fixture, placement, move/save/load, doors, damage, spatial queries and audio stress.

These fixtures do not contain the user's exact save and do not establish that every possible gameplay entity can never visibly spawn. Existing gameplay spawning remains unchanged. Test the player's usual travel route and save on the actual device.

## Measured cost and quality tradeoff

Sharp at DPR 1 keeps the same resolution, making the extra distance's cost visible. Values are animation-frame interval in ms / estimated average FPS; worst CPU/submission time is in ms.

| Scene | Previous Sharp | Extended Sharp | Worst CPU before → after |
| --- | ---: | ---: | ---: |
| 0 pieces | 20.28 / 49.3 | 27.89 / 35.9 | 7.8 → 26.0 |
| 200 pieces | 21.61 / 46.3 | 29.83 / 33.5 | 7.1 → 21.0 |
| 800 pieces | 23.39 / 42.8 | 32.67 / 30.6 | 6.9 → 23.0 |

The longer range still costs GPU time in Sharp. It is not a free FPS improvement. The final Auto run used DPR 2 and the existing governor:

| Scene | Interval ms / estimated FPS | Final rendering scale | Worst CPU ms |
| --- | ---: | ---: | ---: |
| 0 pieces | 20.22 / 49.5 | 0.55× | 86.4 |
| 200 pieces | 16.94 / 59.0 | 0.55× | 19.3 |
| 800 pieces | 17.78 / 56.3 | 0.55× | 19.4 |

Auto reduces rendering resolution to retain frame rate; it does not shorten the requested draw ranges. The first scene includes quality settling/resizing, so it is not a steady-state limit. These headless results are specific to this machine, viewport and test route; they do not promise the same FPS on the player's device.

On the coastal route, average Sharp interval changed from 18.67 to 24.00 ms; worst CPU/submission time changed from 24.5 to 17.1 ms. The naive expanded shoreline had reached 75.3 ms before persistent cell batches were added; that version was not published.

All **175 assertions passed**: 37 visibility/rendering checks, ten smoothing/cache checks, and 128 gameplay checks. Final Sharp and Auto profiles record SHA-256 hashes matching the delivered packed build. Raw results and checks are in `RENDER-DISTANCE-RESULTS.json`.

## Running checks

Requires Node, Playwright, and Chrome/Chromium; set `CHROME_PATH` to an installed browser if necessary.

```sh
node build.js index.html
node tools/check-distance.cjs
node tools/check-smooth.cjs
node tools/check-playtest.cjs
node tools/profile-smooth.cjs
BENCH_DPR=2 BENCH_QUALITY=auto node tools/profile-smooth.cjs
BENCH_COAST=1 node tools/profile-smooth.cjs
```

`GAME_FILE` selects a previous packed HTML build for before measurements. The baseline is commit `c7ca4da` (the previous smoothing update). The default benchmark uses Sharp, 1280×720, DPR 1, seeded mixed bases and active simulation on a moving-player/camera route, with 60 warm-up frames and 300 samples per fixture. The Auto run uses DPR 2 and allows the existing quality governor to change resolution. CPU measurements include graphics submission/driver waits; animation-frame intervals also include GPU/browser scheduling. They are not independent GPU timings.
