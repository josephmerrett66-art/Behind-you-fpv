// ================= colour: warm light, cool shade, the dull colours lifted =================
// Joe: "one thing that's happened with all the passes is we have lost some of the nice colours for dull colours, I think we
// need to now do a pass on colour making it all a bit nicer using colour theory to make it look great". Most of the dulling
// was in the light, not the paint: the shade was only ever a darker copy of the same colour, and the forest haze was grey.
// So, as a painter would have it:
//   - the sun's light is warm and the shade is cool. Where the sun lands it's gold; in the shade it's the blue of the sky
//     lighting it, and in under the trees the green of the light through the leaves (lightAtS, 00-core)
//   - the split follows the hours: gentle at noon, widest at golden hour and sunset (an orange sun, violet shade), cooler in
//     the morning, and gone under rain or fog and at night, when the light comes from everywhere at once
//   - a dull colour is lifted toward its own hue, and a strong one left as it is (grey, 00-core), so the paint reads again
//     without the bright things going garish
//   - far off goes blue (the sky low down, 90-main) and a stand's haze is blue-green (92-forest), set against the warm light
//   - nearer, the greens themselves vary: each tree a little yellower or bluer than the next, a crown's sunlit top warmer
//     than its depths, and looking up into a crown the daylight glows green through it (11-trees); the turf and the grass
//     a fresher green, the open ground further off reading as turf, not bare earth (00-core, 12-grass)
//   - in under the trees the eye opens up a little, and the shade there is a warm green, so the browns stay rich
//   - the outlines are a deep dark of each thing's own colour (07-ink), and the soft pools of shadow a deep blue (10-world),
//     not flat black
const TINT = {
  // [sun, shade] for each part of the day, each kept to the same brightness (the shade a touch lifted, as if by bounced light)
  day: [[1.03, 1.0, 0.95], [0.89, 0.98, 1.11]], morn: [[1.04, 1.0, 0.93], [0.9, 0.98, 1.1]],
  gold: [[1.13, 0.98, 0.74], [0.84, 0.92, 1.26]], set: [[1.16, 0.95, 0.7], [0.86, 0.88, 1.28]],
  // in under a canopy the shade is lit by light come through the leaves, a warm green, so a trunk or the leaf litter in
  // the shade stays a rich brown rather than going grey under a cold blue
  leaves: [0.98, 1.05, 0.78],
  lift: 1.06, liftCover: 0.2, vib: 0.6,
  expo: 0.22,   // in under the trees the eye opens up: everything a little brighter, the closer the crowns overhead
  canopy: 0, acc: 0, accN: 4,   // how much crown is over and round you (the trees gathered in near you, 10-world), eased
};
// the crowns round you, counted as the trees near you are gathered in, each by how close it stands
{ const tb = treesBegin; treesBegin = function () { TINT.acc = 0; return tb.apply(this, arguments); }; }
{ const ta = treeAdd; treeAdd = function (o, kind, d) { if (d < 160 && kind !== 'dead') TINT.acc += (1 - d / 160) * (1 - d / 160); return ta.apply(this, arguments); }; }
{
  const lum = v => v.x * 0.3 + v.y * 0.55 + v.z * 0.15, a = new V3(), b = new V3(), t = new V3();
  const blend = (v, pair, i, k) => v.lerp(t.set(...pair[i]), k);
  const wl = weatherLight; weatherLight = function () {
    wl.apply(this, arguments);
    const sun = LU.sunT.value, sh = LU.shadeT.value;
    if (!S || !S.p || caveIn()) { sun.set(1, 1, 1); sh.set(1, 1, 1); LU.vib.value = 0.2; return; }
    a.set(...TINT.day[0]); b.set(...TINT.day[1]);
    blend(a, TINT.morn, 0, ENV.morn); blend(b, TINT.morn, 1, ENV.morn);
    blend(a, TINT.gold, 0, ENV.gold); blend(b, TINT.gold, 1, ENV.gold);
    blend(a, TINT.set, 0, ENV.set); blend(b, TINT.set, 1, ENV.set);
    TINT.canopy += (clamp(TINT.acc / TINT.accN, 0, 1) - TINT.canopy) * 0.03;
    const cn = TINT.canopy;
    b.lerp(t.set(...TINT.leaves), 0.75 * cn * (1 - 0.5 * ENV.set));
    a.multiplyScalar(1 / lum(a)); b.multiplyScalar((TINT.lift + TINT.liftCover * cn) / lum(b));
    // overcast or dark, the light comes from all round: no split
    const k = clamp((LU.sunK.value - 0.05) / 0.35, 0, 1) * (1 - 0.85 * Math.max(WXV.fog, WXV.rain));
    sun.set(1, 1, 1).lerp(a, k); sh.set(1, 1, 1).lerp(b, k);
    LU.amb.value.multiplyScalar(1 + TINT.expo * cn * clamp(LU.sunK.value / 0.4, 0, 1));
    LU.vib.value = TINT.vib * (0.45 + 0.55 * clamp(LU.sunK.value / 0.5, 0, 1));   // by night, colour fades as it does to the eye
  };
}
