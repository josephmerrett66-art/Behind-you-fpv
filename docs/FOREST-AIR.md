# The forest's air

Joe asked for a full pass on making the whole forest feel like a forest, with more detail and atmosphere. The survey before it showed the deep woods as flat dark: near-black trunks with nothing between them to show how far back the stand went, and no sense of the light coming down through it. This pass is mostly about the air, plus some detail on the trees.

## What changed

- **Haze among the trunks** (`fogged`, 00-core; set each frame in 92-forest). A light haze now builds up with distance before the existing far fog, so each row of trunks is paler and greener than the one in front. It lies low among the trunks and thins out up in the crowns. It is denser in a close stand (the area map's cover round you, eased so it never jumps) and dimmer and greener under the trees. It glows toward the sun, thickens in fog and rain, and is off in caves and weaker in the overhead view.
- **Sun shafts** (92-forest, composited in 07-ink). At a quarter of the screen size, each pixel walks its line of sight (up to 320 units, 14 jittered steps) through the sun's own shadow map. The light it collects is thrown mostly forward, so the beams stand out when you look toward the sun. Because the shadow map already has the leaf gaps in it, a beam appears exactly where a gap lets light through, and it moves when the leaves do. The shafts are warmer and stronger with the sun low, and stronger in a close stand. They are off on Fast, in caves, at night and in the overhead view. With outlines off, the frame now goes through the same full-screen composite that outlines use.
- **Motes**: 420 points of dust and pollen (200 on touch devices) drift in a box round you. They are seen only where the sun reaches them, brighter toward the sun, and not in the rain. The sun test runs in the fragment shader, because SwiftShader returned nothing from a depth map read in the vertex shader.
- **Leaves stir** (`leafStir`, 11-trees). The leaf-gap pattern wavers slightly, differently across each part of a crown, in both the visible pass and the sun pass, so the flecks of sun on the ground flicker with it.
- **Shadows sway** (13-sun). The sun pass applies the same crown sway as the visible trees, so canopy shadows move with their crowns instead of standing still.
- **Gusts** (`GUST_GLSL`, 11-trees and 13-sun). Now and then a gust sweeps through the woods along the leaves' drift direction, and the crowns and their shadows toss harder as it passes. It runs on the same clock and gust curve as the falling leaves, timed to reach you when the leaves come down.
- **Bark**: moss up the foot of each trunk, over the roots and along the tops of limbs, heavier on the shady side, with pale lichen spots higher up. Fallen trees get moss on their upper side.

## Cost

The haze is a few ALU operations per shaded pixel in the shared fog function. The shaft pass is about 14 shadow-map taps per quarter-resolution pixel (roughly 450k taps at 960×540), plus five taps per screen pixel in the composite. Motes are 420 points. No real-GPU profile was run here; Fast drops the shafts.

## Validation

- check-porous-canopy.cjs passes 28 of 28, including the swaying, stirring sun pass.
- The held-item game test (Fast, grass off) runs with 0 errors.
- A direct read of the shaft buffer in a sun-facing thicket shows distinct beams with trunk and branch shadows through them.
- Mote probes find them in sunny glades and in sun flecks in part-covered woods, and none in the deep-shade thicket air.
- Captures of thicket, sun-facing thicket, glade edge, meadow, low sun and the overhead view were inspected with outlines on.
