// ================= the woods' own sound: what's round you, where it is, and when it goes quiet =================
// There was one recording of the woods under everything, louder at night. Now the woods are made of real things in real
// places: songbirds in the trees round you by day (a chorus at first light), a woodpecker, crows off in the distance, a hawk
// high up; owls once it's dark, crickets, wolves howling a long way off; frogs and lapping water as you come near a pond;
// the wind in the canopy (more of it in a storm and out on the beach), the trees creaking in it; a fire's crackle as you sit
// by it; the cave's own hush underground. Each call comes from somewhere: a tree, the pond's edge, a direction far off, and
// is placed round your head like every other sound.
// And they go quiet: when the clan is close, the birds stop. If the woods fall silent round you, look about.
const AMB = { beds: {}, fires: [], pond: null, t: {}, calm: 1, on: false };
// each kind of call: when it can happen (day, night, dusk), how often (seconds between, at the most and the least), how far off
const AMB_CALLS = {
  bird_song: { when: 'day', gap: [2.2, 7], d: [70, 380], tree: 1, birds: 1 },
  bird_woodpecker: { when: 'day', gap: [40, 110], d: [220, 600], tree: 1, birds: 1 },
  bird_crow: { when: 'day', gap: [30, 85], d: [350, 1000], birds: 1 },
  bird_hawk: { when: 'day', gap: [90, 230], d: [500, 900], birds: 1, clear: 1 },
  bird_owl: { when: 'night', gap: [18, 50], d: [200, 700], tree: 1, birds: 1 },
  wolf_howl: { when: 'night', gap: [80, 220], d: [900, 1700], far: 2600 },
  tree_creak: { when: 'any', gap: [14, 40], d: [40, 220], tree: 1, wind: 1 },
  leaves_rustle: { when: 'any', gap: [25, 60], d: [50, 170], v: 0.45 },   // something small moving in the brush
  gull: { when: 'day', gap: [12, 35], d: [200, 700], beach: 1 },
};
const ambDay = () => clamp((ENV.lt - 0.3) / 0.4, 0, 1), ambNight = () => 1 - clamp(ENV.lt / 0.45, 0, 1);
function ambBed(k) {   // a bed, made the first time its recording is in
  if (AMB.beds[k] === undefined || AMB.beds[k] === null) AMB.beds[k] = sndHas(k) ? emitter(k, { flat: true }) : null;
  return AMB.beds[k];
}
function ambTree(x, y, d) {   // a tree about d off in some direction, or just a spot there
  const a = Math.random() * TAU, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
  const T = d < 700 ? propsNear(px, py, 60).find(o => o.kind === 'tree') : null;
  return T ? { x: T.x, y: T.y } : { x: px, y: py };
}
function ambCalm(p) {   // 1 when nothing's about; down toward 0 as the clan comes close (and nothing sings through an attack)
  if (typeof assaultOn === 'function' && assaultOn()) return 0;
  let k = 1; for (const e of clanList()) if (!e.dead) k = Math.min(k, sstep(260, 620, Math.hypot(e.x - p.x, e.y - p.y)));
  return k;
}
function ambFrame(dt) {
  const D = S && S.day, p = S && S.p;
  if (!actx || !D || !p || state === 'title') { for (const k in AMB.beds) emitSet(AMB.beds[k], 0); return; }
  const cave = typeof caveIn === 'function' && caveIn() ? 1 : 0, out = 1 - cave, rain = WXV.rain, fog = WXV.fog;
  const storm = S.wx && S.wx.kind === 'storm' ? S.wx.k : 0, day = ambDay(), night = ambNight();
  const beach = BEACH ? sstep(-420, -120, coastS(p.x, p.y)) : 0;
  AMB.calm += (ambCalm(p) - AMB.calm) * Math.min(1, dt * (ambCalm(p) < AMB.calm ? 1.5 : 0.12));   // they go quiet fast, and only slowly start again
  const calm = AMB.calm, f = dayT(), chorus = f > NIGHT_OUT ? clamp(1 - (f - NIGHT_OUT) / 0.07, 0, 1) : 0;   // the dawn chorus
  // the beds: day birds and leaves, the night's insects, the wind, the cave
  emitSet(ambBed('bed_day'), out * day * (1 - 0.75 * rain) * (0.25 + 0.75 * calm) * (1 - 0.6 * beach) * (1 + 0.5 * chorus));
  emitSet(ambBed('bed_night'), out * night * (1 - 0.6 * rain) * (0.35 + 0.65 * calm) * (1 - 0.5 * beach));
  emitSet(ambBed('bed_wind'), out * Math.min(1.4, 0.32 + 0.9 * storm + 0.35 * rain + 0.5 * beach + 0.15 * fog));
  emitSet(ambBed('bed_cave'), cave * 0.9);
  // the old recording of the woods stays under it all, a little lower now there's more on top
  if (ambG && (AMB.beds.bed_day || AMB.beds.bed_night) && !cave) ambG.gain.setTargetAtTime((0.1 + 0.22 * night) * (0.5 + 0.5 * calm), actx.currentTime, 0.5);
  // the pond: lapping water and frogs at the edge nearest you
  const P = out ? pondNearest(p.x, p.y, 620) : null;
  if (sndHas('bed_pond')) {
    if (!AMB.pond) AMB.pond = emitter('bed_pond', { far: 520 });
    if (P) { const a = Math.atan2(p.y - P.y, p.x - P.x), r = pondReach(P, p.x, p.y) * 0.9; emitSet(AMB.pond, 1, P.x + Math.cos(a) * r, P.y + Math.sin(a) * r); } else emitSet(AMB.pond, 0);
  }
  if (P && (AMB.t.frog = (AMB.t.frog ?? 2) - dt) <= 0) {   // single croaks, more at dusk and night and in the rain
    AMB.t.frog = (1.4 + Math.random() * 4.5) / (0.4 + night + 0.8 * rain) * (calm < 0.5 ? 4 : 1);
    const a = Math.random() * TAU, r = pondReach(P, P.x + Math.cos(a), P.y + Math.sin(a)) * (0.85 + Math.random() * 0.2), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
    if (Math.hypot(x - p.x, y - p.y) < 520) snd('frog', { x, y, far: 600, v: 0.6 + 0.4 * Math.random() });
  }
  // fires: their crackle, at the ones nearest you
  if (sndHas('fire_loop')) {
    const F = out ? [EX_FIRE, ...D.builds.filter(B => B.t === 'fire'), ...clanCamps()].map(o => [o, Math.hypot(o.x - p.x, o.y - p.y)]).filter(q => q[1] < 300).sort((a, b) => a[1] - b[1]).slice(0, 2) : [];
    while (AMB.fires.length < 2) AMB.fires.push(emitter('fire_loop', { far: 280 }));
    AMB.fires.forEach((E, i) => { const q = F[i]; if (q) emitSet(E, 1 - 0.5 * rain, q[0].x, q[0].y); else emitSet(E, 0); });
  }
  if (!out) return;
  // the calls
  for (const k in AMB_CALLS) {
    const C = AMB_CALLS[k]; if (!sndHas(k)) continue;
    const when = C.when === 'day' ? day : C.when === 'night' ? night : 1;
    let rate = when * (C.birds ? calm * (1 - 0.8 * rain) * (1 - 0.5 * fog) * (k === 'bird_song' ? 1 + 2 * chorus : 1) : 1);
    if (C.clear) rate *= 1 - Math.max(rain, fog);
    if (C.wind) rate *= Math.min(1.5, 0.15 + 1.4 * storm + 0.4 * rain + 0.2 * night);
    if (C.beach) rate *= beach; else if (C.birds) rate *= 1 - 0.7 * beach;
    if (k === 'leaves_rustle') rate *= 0.4 + 0.6 * night;
    if (rate < 0.02) continue;
    if ((AMB.t[k] = (AMB.t[k] ?? C.gap[0] * Math.random()) - dt * rate) > 0) continue;
    AMB.t[k] = C.gap[0] + Math.random() * (C.gap[1] - C.gap[0]);
    const d = C.d[0] + Math.random() * (C.d[1] - C.d[0]);
    let at = C.tree ? ambTree(p.x, p.y, d) : { x: p.x + Math.cos(Math.random() * TAU) * d, y: p.y + Math.sin(Math.random() * TAU) * d };
    if (k === 'wolf_howl') { const w = D.beasts.find(b => b.k === 'wolf' && !b.dead && !b.tame); if (w) at = { x: w.x, y: w.y }; }   // the pack out there, where it is
    snd(k, { x: at.x, y: at.y, far: C.far || 1400, v: (C.v || 1) * (0.7 + 0.3 * Math.random()), j: 0.04 });
  }
}
{ const af = audioFrame; audioFrame = function () { af.apply(this, arguments); try { ambFrame(frameDtTP || 0.016); } catch (e) {} }; }
