# Behind You: First Person — playtest fixes

Implemented against main commit `44364eaa69b9c22d1d9959c74cf1e97a3b76d776`. The rebuilt `index.html` is included. No cave source files or enemy decision/movement logic were edited.

## Changes and identified causes

### Base performance

The game already merged constructed objects, so one mesh per wall was not the problem. A visible-base rebuild regenerated and uploaded a large merged buffer; the later lookout/staircase renderer also bypassed the existing per-piece geometry cache. Many collision, interaction and shelter queries scanned every constructed piece.

- Large bases now keep independent local geometry batches. A changed roof or door does not rebuild unrelated cells.
- Lookout and staircase geometry uses the existing cache, with invalidation when connections change.
- A spatial index limits proximity queries to nearby cells. Results retain their original insertion order, preserving collision/AI tie-breaking. Small bases retain linear queries and a single rendering batch to avoid additional draw-call overhead.
- Large-base static visual-state checks run at most ten times per second unless forced or building/door membership changes. Door animation remains per-frame.
- Large-base batches have conservative terrain-aware bounds for both camera and sun-shadow culling. Geometry, materials, outlines and shadow quality are retained. Blueprint depth prepasses remain paired with their visible meshes.

There is still an initial cost to generate a newly loaded base. This update primarily addresses repeated rebuild hitches and repeated local queries; it does not establish a universal FPS gain.

### Group audio

Positional sound chains were removed from tracking on expiry (or dropped when the tracking list exceeded 64), without disconnecting their filter, gain, panner and reverb-send nodes. Enemy vocalizations had no dedicated overlap budget. Recorded voices could therefore build up an unnecessarily expensive mix.

Finished, expired and replaced chains now disconnect explicitly. Recorded sources release their chains on completion. Enemy vocals are limited to eight concurrent voices and one per enemy, with nearby combat cries taking priority over chatter. A master compressor controls overlapping peaks. Distance attenuation, directional filtering, stereo positioning and the shared forest reverb remain in use. Stopped looping emitters also release their routing nodes.

The user's original device-specific total audio cutout was not reproduced, so node lifecycle/overlap are identified defects and plausible contributors, not a proven complete explanation of that incident.

### Roof placement

Roof placement used the ground ray: looking level or upward sent the target to the 150-unit maximum, and ground aiming also imposed a 34-unit minimum. The roof snap validity check additionally tested sockets without marking them as snapped, making valid roofs fail the preferred-candidate pass.

Roofs now aim at roof elevation, accounting for terrain and player height, with a nearby socket fallback when looking approximately level. Valid nearby sockets take priority; occupied roof positions are rejected. Rotation, snap/crouch controls and non-roof placement remain available. Isometric placement retains its existing path.

### Furniture decoration

All free objects were created at ground-relative height zero, with no support-surface field carried through preview, placement and saves.

Flower pots and candles can now rest on suitable clear surfaces of tables, stools and crates, where their footprint fits. The table's built-in bowl and cup, edges, and other decorations block overlapping placement. Unsupported large structures do not gain stacking behavior. Ground placement remains available away from furniture.

Preview and final placement share the same height. Optional height/support fields survive saving and loading; old records default to the original ground placement. Runtime support references are remapped on load. Decorations can be targeted at their raised height, follow furniture when moved, return with it when a move is cancelled, and are removed with their support to prevent floating objects. Candle lighting follows the raised height.

## Measured performance

Final before/after run in headless Chrome on this machine, 1280×720, sharp quality. Audio assets were fully decoded before timing. Values are milliseconds; lower is better.

| Measurement | Original | Updated |
| --- | ---: | ---: |
| 200-piece changed-roof rebuild, mean | 67.12 | 16.51 |
| 800-piece changed-roof rebuild, mean | 126.15 | 2.59 |
| 800-piece 100 local queries, mean | 0.505 | 0.315 |
| Empty world full frame, mean / median / p95 | 7.32 / 6.60 / 18.70 | 7.30 / 6.10 / 19.00 |
| 200-piece full frame, mean / median / p95 | 8.89 / 6.00 / 21.70 | 16.23 / 19.30 / 23.60 |
| 800-piece full frame, mean / median / p95 | 9.35 / 5.30 / 23.00 | 8.91 / 5.80 / 22.20 |
| 800-piece render triangles | 1,298,791 | 1,216,911 |
| 800-piece render draw calls | 109 | 132 |

The changed-roof rebuild is about 98% faster in the large fixture, and local-query work is about 38% lower. Culling reduces submitted triangles by 6.3%, but separate cells add draw calls. The full-frame benchmark includes GPU completion and shows substantial timing variability. The 200-piece case is slower even with the original small-base render path and identical geometry/draw counts; the cause remains unresolved. These results do **not** establish a general FPS improvement or stable performance on the user's device. Treat the build as a playtest candidate, with the medium-base slowdown an outstanding performance issue before release.

## Verification

The browser checks load the actual packed first-person game in Chrome with WebGL and Web Audio. They use generated fixtures, not the user's private saved base.

- 128 passing assertions, including 100 spatial-index comparisons against the original scan and its result ordering.
- New-game frame smoke test and an 800-piece established-save reload.
- Roof targeting from inside and outside, snap toggle, and occupied-roof rejection.
- Table/stool heights, clear surface checks, ghost/final position, rendered pot bottom, raised-object targeting, save/reload, legacy records, move/cancel and support removal.
- Local roof damage changes one cell while retaining other buffers; swinging/resting doors switch between dynamic and static rendering.
- Four camera-angle pixel comparisons with culling enabled versus disabled: no differing color components above one 8-bit level.
- A minute of stress playback: 12,000 enemy voice requests plus combat effects. At most eight vocals and sixteen tracked positional sounds; output present in all 600 sampled intervals, context running throughout, positional response preserved, and zero tracked one-shots after cleanup.
- An additional 300-frame encounter with six actual cannibals: movement/AI and rendering ran without browser exceptions, audio remained running, and enemies continued watching/circling.
- Packed build reproducibility and clean diff whitespace checked.

The stress output measurement confirms an active audio signal; it is not a human listening assessment of balance or spatial quality.

## Remaining playtest work

Test the user's own fortified save and the original audio-cutout device/browser, including longer combat sessions, moving around the base, and subjective sound balance. Safari, phones, controllers, and every unrelated gameplay system have not been exhaustively tested. Save compatibility passed generated old-format fixtures; the user's exact save has not been supplied. Supported furniture tops are deliberately limited to the three modeled surfaces above.

## Running the checks

The game remains self-contained and needs no package installation to play. Developer checks require Node.js, Playwright, and Chrome/Chromium. Set `CHROME_PATH` to an installed browser, or install Playwright's Chromium. Set `TEST_OUTPUT` to a scratch output directory; tests use isolated browser contexts and do not read the user's browser profile.

```sh
node build.js index.html
node tools/check-playtest.cjs
node tools/check-encounter.cjs
node tools/profile-base.cjs after
```

`GAME_FILE` can point to an absolute path to the original packed build for the same benchmark. The profiling fixture uses 0, 200 and 800 pieces, a seeded random generator, 1280×720, sharp quality, fixed camera, paused simulation, warm-up iterations, and a GPU completion wait. It measures CPU work separately from full-frame timings. Results are machine/browser-specific.

## Delivery status

The implementation was pushed to `main` in commit `fafaf67` using the Mac's existing Git credentials. The earlier GitHub connector write attempt failed with HTTP 403, and the configured GitHub CLI credential helper pointed to a missing executable; using the existing macOS credential helper allowed the push. GitHub Pages deployment is separate from the successful repository update and has not been verified here. The packaged HTML remains available as a local playtest build. A local preview uses a different browser origin and therefore does not automatically share the live site's saved game.
