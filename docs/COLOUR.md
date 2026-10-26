# Colour

Joe: "one thing that's happened with all the passes is we have lost some of the nice colours for dull colours, I think we need to now do a pass on colour making it all a bit nicer using colour theory to make it look great."

## What had dulled it

Captures of the same five spots in this version, the grass pass before it (594ebd2) and version 132 showed the mean saturation in the woods down from about 0.45 to 0.28. Most of the dulling was in the light, not the paint:

- The shade was only ever a darker copy of the sunlit colour (`amb * sh`), so a shaded brown went to a flat dark grey-brown.
- The forest haze from the last pass mixed everything toward a grey-green.
- The day's horizon colour, which the far fog and the haze both start from, was a near-grey.
- Codex's terrain pass left much of the open ground as a khaki bare earth, and the grass had gone a dry olive.
- Outlines were flat black over every little leaf edge, so a crown read more as black than green.

## What the pass does (93-colour, with small changes where each thing is drawn)

- **Warm light, cool shade** (`lightAtS`, 00-core). Each part of the day has a sun tint and a shade tint, kept to the same brightness. In the open the shade gets the sky's blue; under a canopy it gets a warm green, so trunks and leaf litter stay a rich brown. The split is gentle at noon, widest at golden hour and sunset (an orange sun and violet shade), and gone in rain, fog, caves and at night.
- **Dull colours lifted** (`grey`, 00-core). Vibrance lifts a colour toward its own hue by how dull it is, and the darks most. Strong colours such as the cherry blossom and the red mushrooms are left as they are.
- **Aerial perspective**. The day's horizon is a clear pale blue (90-main), so the distance goes blue, not grey. A stand's haze is a cool blue-green (92-forest).
- **Greens of their own** (11-trees). Each tree is a little yellower or bluer than the next, and a crown's sunlit top is warmer than its depths. Looking up into a crown, daylight glows through it as green, or pink for a cherry.
- **Eye adaptation under the trees**. The canopy round you is measured from the trees gathered near you, and the light opens up a little under a close canopy.
- **Turf and grass** (00-core, 12-grass). The turf and grass are a fresher green. Open ground further off reads as turf rather than bare earth, and dry ground is an ochre instead of khaki.
- **No flat black**. Outlines are a deep dark of each thing's own colour (07-ink, `inkTint`), and the soft pools of shadow are a deep blue (10-world).

## Measured on the same captures (Hasler and Süsstrunk colourfulness)

| spot | before | after |
| --- | --- | --- |
| meadow | 44.8 | 53.2 |
| glade | 35.7 | 42.0 |
| thicket | 18.4 | 21.6 |
| golden hour | 26.5 | 29.8 |
| sunset | 33.3 | 37.5 |

The "after" numbers come from the test build just before the last small changes: a stronger lift, a softer daytime blue and the ochre dry earth. They are SwiftShader captures, so they compare versions with each other but are not what a real screen shows.

## Tuning

All the numbers are in `TINT` at the top of 93-colour.js: the sun and shade tints for each part of the day, the canopy shade colour, the shade lift, `vib` (how much dull colours are lifted), `expo` (how much the light opens up under a canopy) and `accN` (how much crown counts as a full canopy). `INK.mat.uniforms.inkTint` sets how much an outline takes its thing's own colour (x is how dark, y is how much; `(0, 0)` gives the old black).
