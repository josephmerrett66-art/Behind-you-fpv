# Long-shadow bounds

Low-angle sunlight could lose an entire distant tree shadow while that shadow still covered visible ground. The old caster cutoff was about 808 units in Sharp first-person view, although the tilted orthographic light map projects much farther across the ground at sunrise and sunset.

Trees now retain a shadow-only candidate pool throughout the already loaded world range. Each sun pass tests the transformed tree bounding sphere against the current light frustum, independently of the viewing camera. Selection follows walking, looking and sun movement every frame, and instance buffers upload only when the selected set changes. Distant shadows continue using the existing inexpensive tree models.

The fallback soft-shadow geometry also used to stretch or shrink according to the caster root's distance from the moving map centre. Its geometry now stays stable. Each shaded ground fragment fades the fallback against the same map coverage used by the detailed sun shadows. Coverage includes the light depth bounds and uses a defined, increasing-edge smoothstep. At full night the existing sun-shadow disable behaviour is preserved.

Validation:

- `tools/check-shadows.cjs`: seven checks, including actual GPU shadow-map comparisons against all loaded distant tree casters at low morning sun, noon and low evening sun; all compared pixels match. Also checks relevant roots beyond the old cutoff, selection changes without a world rebuild, and night disable.
- Existing distance (37), smoothing (10) and playtest (128) checks.
- Before/after seeded coastal route: Sharp, 1280×720, DPR 1, 60 warm-up frames and 300 measured frames. Mean animation-frame interval 30.276 → 30.388 ms; p95 50 → 50 ms. Mean CPU submission 9.574 → 9.429 ms. These browser measurements include scheduling and driver waits; they are not independent GPU timings or a guarantee for every device.

The existing finite shadow map and tree shadow detail transition remain. This change addresses missing distant casters and the unstable soft-shadow handoff, rather than adding infinite-range shadows.

See `SHADOW-BOUNDS-RESULTS.json` for benchmark metrics. Run checks with Node, Playwright and `CHROME_PATH` pointing to Chrome/Chromium.
