# Fine canopy openings

This corrects the previous branch-gap interpretation. The rounded crowns and layered conifer forms are restored, with fine leaf-shaped cutouts distributed across their surfaces. Trunks and roots stay solid. The existing packed foliage field supplies the coverage; no new image assets or texture allocations are needed. Native primitive UVs keep the detail attached to the canopy and avoid the long slits created by planar projection around curved surfaces.

The sun-depth material reads the same foliage coverage data. Visible gaps can therefore transmit sunlight and produce small breaks in ground shadows. Ordinary shadow casters keep their opaque depth material. Materials are temporarily selected within the existing sun render pass and restored afterward. The canopy tag aliases the existing material attribute buffer.

## Rendering budget

Fine cutouts merge into solid coverage as they become smaller than a rendered pixel. Their range follows render resolution and projection. The full tree shapes, the 800–1000 unit geometry LOD transition and world draw distance are retained. A compiled opaque material handles trees beyond the resolved cutout range. Close/opaque membership updates from cached instance matrices each frame, with hysteresis, while preserving terrain heights and shadow prefixes; it does not rebuild the world or resample terrain. Coverage is already solid at the material boundary, verified by GPU depth comparison.

The existing coverage field has a minimum of approximately 0.149. The fade closes its gaps before 80% of the configured range end; the opaque-path boundary uses that point. This keeps an unused cutout shader from extending across distant trees. Changes to the field or fade must preserve the boundary check in check-porous-canopy.cjs.

Redundant folded edge leaves and cone subdivision are removed. Summed across the 24 species/variant/LOD models, triangles fall from 24,122 to 17,554 (27.2%), and indexed vertices from 19,392 to 16,848 (13.1%). This is an aggregate model budget, not a claim that every individual model changes by the same percentage. Trees render after ordinary opaque objects so buildings can occlude their shaded pixels.

Auto starts at a desktop render scale of 1.0 rather than 1.5, while keeping the same maximum and subsequent adaptive-quality rules. Auto uses a 1536-square sun map instead of 2048, approximately 44% fewer shadow texels, giving somewhat softer shadow detail. Sharp retains 2048; Fast and touch retain 1024. This balances the new leaf coverage against the GPU budget. Zero-intensity torch cone work is skipped in the shared lighting function; enabled-torch calculations are unchanged.

## Validation

242 checks passed: canopy coverage 24, tree geometry 2, ground cover 3, distance/culling 37, sun shadows 7, grounding 31, smoothness 10 and gameplay 128. GPU depth tests cover visible leaf openings and light transmission for pine, oak and cherry at both detail levels, solid trunks and non-tree casters, continuous coverage at the opaque boundary, material restoration, and moving between close/opaque batches without changing cached transforms, terrain heights or shadow prefixes. The existing full-caster comparisons cover morning, noon and evening. Day, night, forest and close-up captures were inspected with outlines off.

Performance was measured serially on the AMD Radeon Pro 555X through ANGLE Metal, using headless Chrome, a 1280 × 720 viewport, DPR 2, Auto, outlines off, 60 warm-up frames and 300 measured frames per fixture. Both builds settled at 0.55 render scale in these runs. The day is held at the same time to avoid comparing different sun angles. Simulation timestamps remain real so Auto can respond to actual frame cadence. GPU timings use EXT_disjoint_timer_query_webgl2; disjoint or unavailable results are omitted by the profiler.

| Built pieces | GPU mean before / after | CPU mean before / after | Frame interval mean before / after |
|---|---:|---:|---:|
| 0 | 18.14 / 17.31 ms | 9.38 / 8.04 ms | 22.11 / 21.28 ms |
| 200 | 18.77 / 18.23 ms | 7.30 / 7.29 ms | 21.11 / 21.56 ms |
| 800 | 15.99 / 16.34 ms | 6.89 / 7.60 ms | 18.72 / 20.44 ms |

The measured GPU means stay within about 0.83 ms of the previous build; the 800-piece case adds approximately 0.35 ms. Browser frame cadence and CPU tails still vary, as the interval column shows. These are Auto measurements on this machine and do not establish a universal FPS guarantee. Full tails, geometry counts, checks and packed-build hashes are in POROUS-CANOPY-RESULTS.json.

## Reproduce

Run `node build.js index.html`. `node tools/check-porous-canopy.cjs` checks actual visible and sun-depth coverage and batch transfers. The older check-canopy-light.cjs command forwards to it. check-foliage.cjs captures tree forms and audits all 24 models. check-ground-cover.cjs accepts CHECK_QUALITY (default sharp), GAME_FILE, TEST_OUTPUT and VISUAL_ONLY for matching scene captures.

For a comparable Auto profile, use BENCH_LOCK_DAY=1, BENCH_QUALITY=auto, BENCH_DPR=2 and BENCH_INK=0 with tools/profile-smooth.cjs. GAME_FILE selects the baseline packed build. The profiler records GPU renderer, render scale and timer availability. BENCH_WARM can extend warm-up; BENCH_FIXED_STEP is reserved for non-Auto simulation comparisons because a synthetic frame cadence would hide the load from Auto.

Grass sway, gameplay, save format, collision positions and cave mechanics are unchanged.

## Every tree in sight

Joe asked for the leaf gaps on every tree he can see, not only the nearest. Past `leafRange.x` the gaps are no longer closed up: the same packed field is read at twice its size, then four times, and so on, chosen by each tree's own distance, so the gaps stay a few pixels across on every tree and never shift within one crown. Between one size and the next the two are blended with the cut raised to keep the same share of sky; that correction was measured offline from the field (`cut = .25 + .157·(4t(1−t))^3.3`). Crown edges seen edge-on cut a little more, where the pattern would otherwise smear solid. Leaves lit from behind by the sun now glow, most at a crown's edge, using the sun visibility the lighting already computes (`lightAtS`).

The further bands lose their opaque program except on Fast, which keeps the previous behaviour (`treeLeafSync`). Tree bands now draw nearest first (render order by band) rather than by material, so a near crown's depth is in place before the trees behind it. Counting the tree fragments that pass the depth test as drawn (`tools/count-tree-fragments.cjs`, 320×180, Sharp), the new build shades 6–34% fewer tree fragments than the previous one across four forest views (1.70–2.45 → 1.46–1.78 per covered pixel); the per-fragment cut test and any lost early-depth efficiency on real GPUs are not captured by that count, and no real-GPU profile was run here.

With outlines on, the ink pass reads leaf pixels from the colour target's alpha (trees write 0 on leaves) and fades lines inside crowns beyond the nearest trees, so a far crown isn't more line than leaf. The canvas has no alpha, so nothing else sees it.

check-porous-canopy.cjs now checks that the close and further materials cut identical gaps at the hand-over, that trees 600, 1200 and 1800 away keep gaps, and that Fast still draws the further trees solid: 28 of 28 pass.
