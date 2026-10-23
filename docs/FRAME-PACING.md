# Frame pacing follow-up — 23 October 2026

The priority is the reported swing from about 17 to 53 FPS. A moving-player profile found repeated building geometry uploads on otherwise unchanged bases. This update targets those long frames; it does not promise a fixed 60 FPS on every device.

The later [render-distance update](RENDER-DISTANCE.md) expands the visible world and records its additional rendering cost and optimizations.

## Causes and fixes

Bases below 256 construction pieces still used one merged building buffer. Walking 120 world units rebuilt and uploaded that entire buffer. In the 200-piece fixture, the rebuild took up to 18.6 ms; the subsequent shadow submission could block for another 63.1 ms. The full frame reached 87.2 ms. Those stalls are significant even when average CPU time is low.

Larger bases already had local batches, but they clipped individual members at a player-relative distance. Walking caused pieces to cross that boundary, which changed batch membership and triggered fresh uploads. An 800-piece moving-camera frame reached 79.6 ms.

- Use local batches once there are 64 construction pieces/stations. The cheap original path remains for smaller scenes.
- Include whole spatial cells, so walking through an existing base does not change the contents of its batches. This conservatively retains extra geometry at the distance boundary; camera/shadow frustum culling still applies.
- Hide distant cells and keep up to 64 recently visited cells resident. Walking back reuses buffers; inactive cells are evicted oldest first. A new small game releases this cache.
- Measure simulation/update CPU time before shadow/world/weapon rendering. Previously a graphics-driver wait could look like heavy simulation and prevent Auto quality from responding to rendering pressure. Sharp and Fast remain explicit player settings.

No model detail, material, lighting quality, shadow cadence, gameplay rules, save fields, enemy logic, or cave source was changed by this follow-up. Initial loading and edits to structures still require geometry creation/uploads. Entering entirely new uncached cells can also upload geometry.

## Measurements

Headless Chrome on this Mac, 1280×720, DPR 1, Sharp quality. Seeded fixtures with 0, 200 and 800 mixed structures; normal health HUD, active simulation, fixed moving-player/camera route; 60 warm-up frames then 300 samples per fixture. Same browser, path and settings before and after. Frame CPU/submission includes graphics-driver blocking. Display interval is the browser animation-frame interval; it also includes GPU/browser scheduling. Timers are not independent GPU measurements.

All values are milliseconds, **mean / p99 / worst**. Lower is better.

| Measurement | Before | After |
| --- | ---: | ---: |
| 0 pieces: frame CPU/submission | 4.79 / 7.70 / 10.30 | 4.54 / 7.20 / 8.50 |
| 0 pieces: building sync | 0.02 / 0.50 / 0.50 | 0.02 / 0.50 / 0.50 |
| 0 pieces: display interval | 20.33 / 33.40 / 33.40 | 20.22 / 33.40 / 33.50 |
| 200 pieces: frame CPU/submission | 6.73 / 70.30 / 87.20 | 4.58 / 6.70 / 7.00 |
| 200 pieces: building sync | 0.56 / 17.40 / 18.60 | 0.05 / 0.40 / 0.40 |
| 200 pieces: display interval | 21.94 / 66.60 / 83.40 | 21.55 / 33.40 / 33.50 |
| 800 pieces: frame CPU/submission | 5.44 / 15.00 / 79.60 | 4.86 / 7.60 / 8.90 |
| 800 pieces: building sync | 0.36 / 8.10 / 14.60 | 0.14 / 0.90 / 1.00 |
| 800 pieces: display interval | 23.05 / 33.40 / 66.70 | 23.28 / 33.40 / 33.50 |

The large frame stalls disappeared in this route: 200-piece worst CPU/submission time fell from 87.2 to 7.0 ms; 800-piece worst fell from 79.6 to 8.9 ms. Worst display intervals fell from 83.4/66.7 ms to about 33.5/33.5 ms. Average display intervals remain around 20–23 ms, and 95th-percentile display intervals remain about 33.4 ms. This is evidence of reduced hitching, **not** a general average-FPS improvement or a guaranteed 60 FPS. The user's exact save, browser, viewport and original 17–53 FPS scenario still require device playtesting.

The old stationary forced-rebuild benchmark was insufficient to reveal movement-driven uploads. Keep those older results as historical measurements, but use this moving profile for the frame-pacing follow-up. Raw results are in `FRAME-PACING-RESULTS.json`.

## Verification

- 128 existing gameplay assertions passed: large-save reload, spatial query ordering, roof placement, furniture placement/move/save/load, door rendering and local damage.
- Existing four camera-angle culling comparisons passed. Audio stress remained active in all 600 sampled intervals with no browser exceptions.
- Ten additional checks passed: medium-base batching; zero existing-buffer replacements across 120 walking positions; distant visibility; return/reuse; cache bounded at 64 across 100 distant cells; cleanup on a new game; Auto response under an injected 20 ms graphics submission; update CPU timing excludes that wait; Sharp stays fixed.
- Source build and packed `index.html` regenerated together; whitespace checks passed.

Developer commands (Node, Playwright and Chrome/Chromium required):

```sh
node build.js index.html
node tools/check-smooth.cjs
node tools/check-playtest.cjs
node tools/profile-smooth.cjs
```

Set `CHROME_PATH` for an installed Chrome, `GAME_FILE` to the original packed HTML for before measurements, and optionally `BENCH_QUALITY=auto BENCH_DPR=2` for a Retina/Auto run. Checks use isolated browser profiles and do not modify the player's live saved game.
