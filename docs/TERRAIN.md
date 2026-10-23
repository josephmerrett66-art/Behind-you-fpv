# Terrain character pass

The forest floor now combines irregular moss, warm soil, leaf litter, needles and mineral grit, taking the earthy greens and golds of the reference concept into the existing low-poly style. Broad material regions, canopy coverage and fine detail control the transitions together. Worn seams shorten the turf and expose soil; stony slopes and dry areas remain distinct. Fine relief affects lighting without adding geometry. Outdoor contours use coupled versions of the existing height waves to make ridges and hollows less symmetrical.

## Runtime budget

Material noise is baked offline into two deterministic 512 × 512 RGBA data maps. Their combined RGBA8 storage including mip levels is 2,796,200 bytes, versus 3,145,720 for the former 768 × 768 ground image: approximately 11.1% less. There are no added terrain triangles, world objects, draw calls or runtime map-generation jobs. The shader exchanges repeated procedural noise for texture lookups. Inland normals use analytic slopes; coasts, caves and levelled-ground transitions retain sampled normals. Grass count, barely visible wind and draw distances retain their previous settings.

The packed HTML download increases from approximately 14.08 MB to 15.25 MB because PNG preserves semantic data channels. GPU storage and download size are different budgets. Alpha data is encoded in the opaque half of its range and decoded in shaders; GPU round-trip checks verify the channel values survive browser image decoding.

## Verification

All 223 checks pass: terrain 7, grounding 31, ground cover 3, distance 37, smoothness 10, shadows 7 and gameplay 128. GPU heights agree with CPU collision heights across 48 locations (maximum error 0.000094 world units). GPU normals match finite-difference slopes within 0.00431 component error, including image quantisation. The camp remains level. Grounding checks cover 324 prop placements and 72 tree-root placements, plus dropped items on terrain and built floors and normal rock mining. Day, night, coast, rain, low sun and forest landmark captures were inspected with outlines off.

Serial headless Chrome profiles use 60 warm-up frames followed by 300 measured frames per fixture. No map generation or other performance run overlapped the final measurements. Outlines were disabled. Each profile records the loaded build hash.

| Scene / setting | Before mean frame interval | After mean frame interval | Before / after CPU mean |
|---|---:|---:|---:|
| Coast, Sharp, DPR 1 | 31.67 ms | 30.89 ms | 13.70 / 13.88 ms |
| Forest, Auto, DPR 2, 0 pieces | 29.28 ms | 28.72 ms | 14.54 / 14.42 ms |
| Forest, Auto, DPR 2, 200 pieces | 29.78 ms | 29.17 ms | 12.70 / 13.27 ms |
| Forest, Auto, DPR 2, 800 pieces | 29.67 ms | 27.44 ms | 13.63 / 14.47 ms |

The tested average frame intervals show no regression. CPU time and individual spikes vary; these runs do not establish a universal FPS improvement. Auto chose the same 0.55 render scale before and after. Exact metrics, tails and hashes are in TERRAIN-RESULTS.json.

## Rebuilding and testing

Run `python3 tools/make-terrain-maps.py` with NumPy and Pillow to regenerate the maps and reference samples, then `node build.js index.html`. Map generation is deterministic. `node tools/check-terrain.cjs` runs the GPU channel, height, normal and camp checks and captures five landmark/weather views. Set GAME_FILE for a different packed build, TEST_OUTPUT for JSON output and VISUAL_ONLY=1 to capture the corresponding baseline. The existing grounding, ground-cover, distance, smoothness, shadows and playtest tools provide the remaining checks.

Outdoor elevations intentionally change slightly. Gameplay coordinates and save formats are unchanged; existing base levelling and terrain contact fitting continue to apply. Cave mechanics are unchanged.
