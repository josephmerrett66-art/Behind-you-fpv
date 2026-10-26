# Models up close (version 152)

Joe asked where the visuals needed the most work. The answer was the models you see up close: straight dark trunks with stick roots, ferns as black jagged cut-outs, bushes as lumps, and rocks as smooth dark blobs. He said "Ok please do those changes".

## Trunks and limbs (11-trees)

- **One tube per trunk** (`TreeKit.tube`). A trunk runs from under the ground to its top as one tube that bends with its path. Each ring is carried on from the one before, so the tube never twists.
- **Foot.** The trunk flares at its foot into four or five buttresses. Each buttress runs on out along the ground and down into it as a surface root.
- **Lean.** Each trunk leans a little and bows gently, and its crown is carried over to wherever the top has got to. The lean and the buttresses draw on their own random sequence (`Q`). The old draws of `R` are kept, so every crown has the shape it had before.
- **Limbs.** Limbs are curved tubes that leave the trunk low and sweep up into the crown, tapering as they go. On an oak or a cherry each limb forks once, which you only see from under the tree.
- **Three builds of each tree.** The near build is used for the band of trees round you (`TREE_NEAR`) and has the most faces. The mid build is used out to `TREE_LOD`. The far build has the fewest faces and no roots.
- **Bark.** The bark is drawn as plates split by furrows that wander up the trunk, with cracks across them. The surface is tipped the way the furrows go, so the light catches the edges of the plates. Further off, between 200 and 700, the furrows fade to their average so they don't shimmer.

## Why the trunks were near-black

`hex()` uses three.js colour management, which turns a written colour into linear light. The renderer then outputs that linear value without converting it back, so a colour comes out roughly squared. An oak's `#5c4a3a` was drawn as about (27, 18, 11) before any lighting, and in the shade under a canopy a trunk ended up at about (17, 12, 7).

The bark of the trees, the fallen logs and the saplings now uses `paintHex` (00-core), which keeps the colour as written, at 0.85. Boulders use it at 0.72. Everything else is unchanged, because the rest of the palette was tuned with the darkening in place.

## Undergrowth (14-props, 11-trees, 07-ink)

- **Ferns.** A frond is now a band that drops away slightly from the stalk. The leaflets are cut out of it in the shader, from where each point sits along the frond and out from the stalk (`gu`, material 9). Each frond has 14 leaflets up each side. They alternate, sweep forward, are lobed along their edges, and are paler at the edges than down the middle. Between 90 and 260 away they merge into the band. Fronds are no longer outlined, because the outline was the band's, not the leaflets'.
- **Bushes.** A bush's leaves are drawn 1.8 times smaller than a tree's, and paler at their edges. Its heart is lighter, so the gaps show leaves rather than black. The soft upward light meant for undergrowth leaves had stopped applying when `lightAt` became `lightAtS`, and it is back.
- **Lines.** The undergrowth's leaves write an alpha of a half. The ink draws their edges at half strength in a dark green.

## Rocks (14-props, 11-trees)

A boulder is now a subdivided icosahedron cut by ten planes into broad flat faces with sharp edges. The stone has dark cracks through it, moss over the top (most where it's shady), and pale lichen here and there. It is a mid grey rather than a dark lump.

## The dark in close stands

- The trunk colour fix is most of it.
- The shade under a canopy is lifted more (`TINT.liftCover` from 0.2 to 0.38, 93-colour). The eye opens up a little more under the trees too (`TINT.expo` from 0.22 to 0.32).
- Looking up into a crown, daylight comes through from lower angles (`leafUnder` 0.7). The light takes the leaf's hue at a set brightness, so a deep green crown glows a visible green.
- A crown's own leaf lines are a deep green at 85% strength, not black.

## Measured (SwiftShader captures, film grain hidden)

The table gives median luma, then the share of pixels darker than 30 out of 255. The near woods are at (1400, 1000) and the "up" shot looks into the crowns there.

| view | version 151 | version 152 |
| --- | --- | --- |
| near woods | 9, 80% | 21, 72% |
| looking up | 8, 91% | 20, 74% |
| thicket | 38, 42% | 45, 24% |
| glade | 88, 27% | 88, 22% |
| meadow | 107, 9% | 108, 4% |

Looking up in the near woods, the green crowns went from about (7, 8, 4) to (14, 26, 7), and the share of them darker than 20 from 99% to 46%.

Fine detail (mean Laplacian) went from 11.1 to 16.7 in the near woods. In the glade and meadow it is within 5% of version 151. Contrast (the spread of luma) is 5 to 9% lower in the glade, meadow and thicket, because there are fewer near-black pixels: glade 43.8 to 41.4, meadow 45.5 to 42.8, thicket 27.6 to 25.1.

## Cost

Triangles per model. Version 151 used one build for the near and mid bands.

| tree | version 151 | version 152 mid | version 152 near | far, 151 then 152 |
| --- | --- | --- | --- | --- |
| spruce, fir | 400 to 436 | 528 to 564 | 738 to 774 | 272 to 296, then 234 to 258 |
| tall pine | 579 | 688 | 1012 | 356, then 342 |
| oak | 972 to 1052 | 1115 to 1195 | 1537 to 1617 | 884 to 964, then 854 to 934 |
| cherry | 1160 to 1240 | 1310 to 1390 | 1785 to 1865 | 1060 to 1140, then 1034 to 1114 |
| dead | 653 | 860 | 1140 | 236, then 274 |

The mid build, which covers most trees in view, is 13 to 32% heavier. The far build is a little lighter for every kind except the dead tree. The near build is only used for the trees within about 340 of you.

A boulder is 320 triangles instead of 80, and its foot is fitted to the ground at up to 40 points instead of 12, so its broad flat base doesn't stand off a hollow. A fern frond is 80 triangles a side, about what it was.
