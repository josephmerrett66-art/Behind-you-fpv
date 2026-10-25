# Light through the canopy

Current implementation: [fine canopy cutouts](POROUS-CANOPY.md). The earlier report below is retained as history.


The canopies now have real openings between solid leaf tufts and conifer boughs. Sky and sun can pass through these spaces. The same geometry is used by the existing depth and shadow rendering, so the openings also break up the ground shadows. Trunks remain solid. This is distinct from the distance LOD transition's temporary dither pattern, which can affect the whole tree.

Each former 80-triangle broadleaf crown core becomes four 20-triangle tufts, with the folded edge leaves attached to the smaller tufts. Crown triangle counts stay unchanged and indexed vertex counts fall. Conifer tiers use separate closed boughs: 64 triangles nearby and 24 at distance, replacing 80 and 27. Complete detailed conifer models use 13–16% fewer triangles. No model gains triangles or indexed vertices. There are no new draws, texture allocations, blending layers, per-pixel cutouts or frame callbacks. These openings remain present in both high and low detail models; the existing distance crossfade is retained.

## Validation

83 checks passed: model geometry 2, canopy transmission 3, ground cover 3, distance 37, shadows 7 and grounding 31. The new GPU check renders opaque, double-sided geometry from front and elevated sun directions, then measures actual empty pixels inside canopy row spans. All 12 species/LOD/view samples show more openings than the previous build. For example, a detailed spruce's sun-view internal openings increase from 3 to 42 pixels at the test resolution. Every sample retains predominantly covered canopy rows. Raycasts confirm the trunks remain solid. Double-sided rendering ensures an apparent front opening is not being blocked by the rear shell from the sun's view.

Actual forest captures show small sunlit patches under the canopy. Species and close-up captures were inspected, and the existing shadow test verifies selection against the full loaded caster pool. Saplings share the conifer tier geometry and are included in the grounding checks.

Serial headless Chrome profiles use 60 warm-up frames and 300 measured frames, with outlines disabled:

| Scene / setting | Before / after mean frame interval | Before / after CPU mean |
|---|---:|---:|
| Coast, Sharp, DPR 1 | 18.17 / 18.33 ms | 6.51 / 7.09 ms |
| Forest, Auto, DPR 2, 0 pieces | 18.61 / 18.17 ms | 7.65 / 7.76 ms |
| Forest, Auto, DPR 2, 200 pieces | 21.11 / 17.11 ms | 7.44 / 7.37 ms |
| Forest, Auto, DPR 2, 800 pieces | 16.67 / 16.83 ms | 6.82 / 6.98 ms |

Render scales match for each Auto pair (0.697, 0.55 and 0.55). The small increases in the coast and 800-piece means are approximately 0.17 ms; these samples show broadly steady frame times rather than a universal speedup. Timing tails, loaded build hashes and geometry budgets are recorded in CANOPY-LIGHT-RESULTS.json. No map generation or second benchmark overlapped these measurements.

Run `node build.js index.html` to rebuild. `node tools/check-canopy-light.cjs` checks real openings and solid trunks; GAME_FILE can select another packed build. The existing check-foliage tool captures tree forms, and the ground-cover tool captures matching forest views. No gameplay, grass-wind or terrain-height logic changes are part of this follow-up.
