// ================= hunting with the bow: where it goes in, the wounded, the blood, the body you go and take =================
// Joe: "I want to make an arrow the main way you can hunt for meat". The way Red Dead, theHunter and The Forest do it:
//   - an animal has a head and a body (taken from its own drawn shape, so it's where you see it). An arrow in the head drops
//     it where it stands: a clean kill, and a clean kill gives an extra cut of meat. A shot from a crouch at one that
//     hasn't seen you does double, so a full draw from hiding drops it.
//   - an arrow in the body wounds it. It bolts, but it bleeds: it slows as it weakens, leaves blood on the ground behind it,
//     and before long it goes down. Follow the blood to find it.
//   - one that drops lies where it fell, with the arrows that went in still in it, till you cut it up (88-meat): then the
//     meat and the hide are yours, and most of the arrows come back out.
//   - deer and rabbits hear you creeping long before you're near enough for a blade (sneakHide in the main game), and a
//     blade no longer kills a deer outright from behind: it bolts, faster than you run. The bow is how you'll get them;
//     boars, wolves and bears still come at you.
const HUNT = { by: null, thrown: 0, zone: 0, back: 0.8, near: 70, bloodLife: 150, bloodCap: 320, R: 700 };
PT.blood = new Part(new THREE.SphereGeometry(0.5, 8, 4), HUNT.bloodCap + 8, false);
const _hnv = new V3(), _hnd = new V3(), _hnm = new M4();
// where its body (a capsule from chest to haunch) and head (a ball) are, heights above the ground under it
function huntParts(b) {
  if (b._hpT === S.t && b._hp) return b._hp;
  const B = BEAST[b.k], A = ANAT[b.k], g = terrH(b.x, b.y); let P;
  if (A && b.fgHit && b.fgB && S.t - (b.fgT ?? -9) < 0.4) {   // drawn just now: its own pose
    const w = v => { _hnv.set(v[0], v[1], v[2]).applyMatrix4(b.fgB); return [_hnv.x, _hnv.y, _hnv.z]; };
    P = { g, a: w(b.fgHit[0]), b: w(b.fgHit[1]), r: Math.max(A.bw, A.dp) * 0.56, hd: w(b.fgHit[2]), hr: A.hs * 0.95 };
  } else if (A) {   // out of sight: where they would be, standing
    const f = b.fgFace ?? b.dir ?? 0, cx = Math.cos(f), cy = Math.sin(f), hb = A.sh - A.dp * 0.4, hl = A.len * 0.45 + A.nk * 0.55;
    P = { g, a: [b.x + cx * A.len * 0.33, hb, b.y + cy * A.len * 0.33], b: [b.x - cx * A.len * 0.33, hb, b.y - cy * A.len * 0.33], r: Math.max(A.bw, A.dp) * 0.56, hd: [b.x + cx * hl, A.sh + A.nk * 0.6, b.y + cy * hl], hr: A.hs * 0.95 };
  } else { const h = B.h || 8, z = (b.z || 0) + h * 0.5; P = { g, a: [b.x, z, b.y], b: [b.x, z, b.y], r: Math.max(B.w, h) * 0.7 + 1.5, hd: null, hr: 0 }; }   // the small ones: one ball
  b._hp = P; b._hpT = S.t; return P;
}
function huntSegD(px, py, pz, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L2 = dx * dx + dy * dy + dz * dz;
  const t = L2 ? clamp(((px - a[0]) * dx + (py - a[1]) * dy + (pz - a[2]) * dz) / L2, 0, 1) : 0;
  return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t, pz - a[2] - dz * t);
}
function huntZone(b, x, Y, y) {   // 2 the head, 1 the body, 0 a miss
  const P = huntParts(b), yl = Y - P.g;
  if (P.hd && Math.hypot(x - P.hd[0], yl - P.hd[1], y - P.hd[2]) < P.hr + 1.2) return 2;
  return huntSegD(x, yl, y, P.a, P.b) < P.r + 1.2 ? 1 : 0;
}
// an arrow (or a stone) goes into an animal
function huntStrike(q, b, zone) {
  const B = BEAST[b.k], k = q.dmg;
  if (zone === 2) q.dmg *= BAL.head;
  HUNT.by = q; HUNT.zone = zone;
  try { dayShotHit(q, b, true); } finally { HUNT.by = null; q.dmg = k; }   // the main game's blow: the damage, a sneak shot, its fright
  if (q.kind === 'arrow') { q.noKeep = 1; huntStick(q, b); }
  huntBlood(q.x, q.y, zone === 2 ? 4 : 2, 1.4);
  if (!b.dead) {   // v129: no marks or words for a hit; it goes down, or it bolts and bleeds
    b.wound = (b.wound || 0) + 1;
    if (!critOf(b)) dayNote('wounded', 'it\'s hit · it won\'t get far · follow the blood', 45);
  }
  if (actx && snd('arrow_hit_flesh', { x: b.x, y: b.y, who: b })) { if (!b.dead) snd(beastVoice(b, 'bolt'), { x: b.x, y: b.y, who: b, at: 0.05 }); }
  else if (actx) { const t = actx.currentTime, out = placeOut(b.x, b.y, 1, 800, b, 1.2) || sfxGain;
    boomAt(t, 170, 70, 0.07, 0.45, out); noiseAt(t, 2600, 900, 0.05, 0.25, out);   // the thunk of it going in
    if (!b.dead) noiseAt(t + 0.05, b.k === 'deer' ? 1300 : b.k === 'rabbit' || B.crit ? 3200 : 420, 500, 0.28, 0.32, out); }   // and its cry
}
function huntStick(q, b) {   // most arrows come back out of the body; and you can see them in it till then
  if (Math.random() < HUNT.back) { const Q = b.quiver || (b.quiver = {}); Q[q.id] = (Q[q.id] || 0) + 1; }
  if (!b.fgB || critOf(b)) return;
  _hnm.copy(b.fgB).invert(); _hnv.set(q.x, q.Y - terrH(b.x, b.y), q.y).applyMatrix4(_hnm); _hnd.set(q.vx, q.vz, q.vy).normalize().transformDirection(_hnm);
  (b.stuck || (b.stuck = [])).push([_hnv.x, _hnv.y, _hnv.z, _hnd.x, _hnd.y, _hnd.z]); if (b.stuck.length > 6) b.stuck.shift();
}
const HUNT_SHAFT = hexK('#a08a62'), HUNT_FLETCH = hexK('#d8cbb0');
function huntStuckDraw(o) {   // called from poseBeast, in the animal's own frame
  for (const [x, y, z, dx, dy, dz] of o.stuck) {
    const p = [x, y, z], tail = addv(p, [dx, dy, dz], -14), tip = addv(p, [dx, dy, dz], 2.5);
    bOval(PT.aBall, tail, tip, 0.6, 0.6, HUNT_SHAFT, 0); bOval(PT.aBall, tail, addv(p, [dx, dy, dz], -10.5), 1.8, 0.3, HUNT_FLETCH, 0);
  }
}
// the wounded slow and bleed, and leave a trail
{ const bs = beastStep; beastStep = function (dt) {
  const D = S.day, W = D.beasts.filter(b => b.wound && !b.dead), at = W.map(b => [b.x, b.y]);
  bs(dt);
  W.forEach((b, i) => {
    if (b.dead) return;
    const B = BEAST[b.k], k = 0.55 + 0.45 * clamp(b.hp / B.hp, 0, 1), [x0, y0] = at[i];
    b.x = x0 + (b.x - x0) * k; b.y = y0 + (b.y - y0) * k;   // it can't keep up its pace
    b.hp -= Math.min(3, b.wound) * clamp(B.hp * 0.06, 0.12, 0.35) * dt;
    b.bled = (b.bled || 0) + Math.hypot(b.x - x0, b.y - y0); b.bT = (b.bT ?? 2.5) - dt;
    if (b.bled > 13 || b.bT <= 0) { huntBlood(b.x, b.y, b.bT <= 0 ? 2 : 1, 1); b.bled = 0; b.bT = 2.5; }
    if (b.hp <= 0) beastDie(b);
  });
}; }
// the blood: dark spots on the ground, fresh ones wetter, fading over a couple of minutes
function huntBlood(x, y, n, spread) {
  const L = S.day.blood || (S.day.blood = []);
  for (let i = 0; i < n; i++) L.push([x + (Math.random() - 0.5) * spread * 6, y + (Math.random() - 0.5) * spread * 6, S.t, 0.6 + Math.random() * 0.7 * spread, Math.random() * 6.283]);
  while (L.length > HUNT.bloodCap) L.shift();
}
const HUNT_BLOOD = [hex('#5a1410'), hex('#7c1c14')];
function huntBloodDraw() {
  const L = S.day.blood, p = S.p; if (!L || !L.length) return;
  const now = S.t; while (L.length && now - L[0][2] > HUNT.bloodLife) L.shift();
  for (const [x, y, t, s, a] of L) {
    if (Math.abs(x - p.x) > HUNT.R || Math.abs(y - p.y) > HUNT.R) continue;
    const u = clamp((now - t - (HUNT.bloodLife - 45)) / 45, 0, 1), k = s * (1 - u * 0.5);
    blob(PT.blood, x, 0.14 - u * 0.22, y, 2.3 * k, 0.12, 1.6 * k, a, HUNT_BLOOD[now - t < 25 ? 1 : 0]);
  }
}
{ const df = drawFigures; drawFigures = function (now, dt) { df(now, dt); if (S && S.day) huntBloodDraw(); }; }
// the first time you draw a bow: how it works now
{ const ds = dayDrawStart; dayDrawStart = function () {
  const had = !!(S.day && S.day.draw), r = ds.apply(this, arguments);
  if (!had && S.day.draw && S.day.draw.kind === 'bow' && !isoP() && !S.day.told.bowaim) { S.day.told.bowaim = 1; exNote('hold to draw · the diamond is where it lands · far off, hold a touch high · go for the head', true); }
  return r;
}; }
// a sneak on a deer or a rabbit: double for an arrow from hiding; a blade still takes a rabbit, but not a deer
{ const sh = sneakHit; sneakHit = function (b) {
  const B = BEAST[b.k], prey = !B.angry && !B.pack;
  if (!prey || !S.day || !S.day.crouch || b.st !== 'graze' || b.tame) return sh(b);
  if (HUNT.by) { exNote('sneak shot', true); return 2; }
  if (b.k === 'deer' && !HUNT.thrown) return 1;
  return sh(b);
}; }
{ const ss = daySpearStep; daySpearStep = function () { HUNT.thrown = 1; try { return ss.apply(this, arguments); } finally { HUNT.thrown = 0; } }; }   // a thrown spear, axe or javelin is a shot too
{ const st = dayShotStep; dayShotStep = function () { HUNT.thrown = 1; try { return st.apply(this, arguments); } finally { HUNT.thrown = 0; } }; }
