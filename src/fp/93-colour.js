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
//     than its depths (11-trees), and the turf and the grass a fresher green (00-core, 12-grass)
const TINT = {
  // [sun, shade] for each part of the day, each kept to the same brightness (the shade a touch lifted, as if by bounced light)
  day: [[1.05, 1.0, 0.9], [0.86, 0.97, 1.16]], morn: [[1.03, 1.0, 0.95], [0.87, 0.97, 1.15]],
  gold: [[1.13, 0.98, 0.74], [0.84, 0.92, 1.26]], set: [[1.16, 0.95, 0.7], [0.86, 0.88, 1.28]],
  leaves: [0.84, 1.04, 0.98],    // the shade under a canopy
  lift: 1.06, liftCover: 0.2, vib: 0.35,
  expo: 0.22,   // in under the trees the eye opens up: everything a little brighter, as the stand closes in (FOREST.cover)
};
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
    b.lerp(t.set(...TINT.leaves), 0.6 * FOREST.cover * (1 - ENV.set));
    a.multiplyScalar(1 / lum(a)); b.multiplyScalar((TINT.lift + TINT.liftCover * FOREST.cover) / lum(b));
    // overcast or dark, the light comes from all round: no split
    const k = clamp((LU.sunK.value - 0.05) / 0.35, 0, 1) * (1 - 0.85 * Math.max(WXV.fog, WXV.rain));
    sun.set(1, 1, 1).lerp(a, k); sh.set(1, 1, 1).lerp(b, k);
    LU.amb.value.multiplyScalar(1 + TINT.expo * FOREST.cover * clamp(LU.sunK.value / 0.4, 0, 1));
    LU.vib.value = TINT.vib * (0.45 + 0.55 * clamp(LU.sunK.value / 0.5, 0, 1));   // by night, colour fades as it does to the eye
  };
}
