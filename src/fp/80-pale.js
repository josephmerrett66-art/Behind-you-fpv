// ================= the pale ones: what lives down in the caves (Joe: "do caves ... do an amazing job") =================
// People once, or nearly: bald, grey-white, thin as rakes, the eyes gone milky. They sleep curled up together in the lairs at
// the bottom of the caves and hunt by sound, clicking to find their way, so how you move is everything down here. Creep
// (crouch) and you can get right past them, or close enough to kill one in its sleep; run, fight or swing a pick at the ore
// and every one in earshot wakes. Rock between you muffles you, a straight passage carries you a long way.
// They can't stand the light. Your torch burns their skin: caught in the beam one flinches, covers its face and darts out of
// it, so they keep to the dark and come at you from behind and from the side, clicking as they close in. You hear them before
// you see them. One at a time they rush you, shrieking, rake at you and are gone again into the dark; hold the light on one
// too long and it goes mad and comes anyway. Daylight at the mouths and a fire of your own keep them off.
// The deep has the most of them, two awake and prowling, and the old one: twice the size, and the light hardly checks it.
// Killed ones stay dead for a few days, then others come up from below.

// ---------------- how they look: CLAN_LOOK 5 (the pale ones) and 6 (the old one) ----------------
const PALE_SKIN = [198, 200, 196], PALE_RIB = [158, 162, 160], PALE_SOCK = [64, 60, 66], PALE_VEIN = [150, 162, 180];
const PALE_LOOK = o => ({
  C: { tunic: PALE_SKIN, trou: [96, 92, 84], trouL: [88, 84, 78], skin: PALE_SKIN, hair: o.hair || [186, 188, 184], eye: [224, 228, 222], nose: [186, 184, 182],
    feet: [184, 184, 178], sole2: [128, 126, 120], mud: [118, 116, 110], belt: [70, 64, 56], nail: [64, 60, 54] },
  bare: 1, pale: 1, old: o.old,
  // the ribs showing through, and blue veins down the arms
  body: (x, y, z) => z > 0.8 && y > 21.2 && y < 28.8 && Math.abs(x) > 0.9 && ((y + Math.abs(x) * 0.3) % 1.75) < 0.42 ? PALE_RIB
    : Math.abs(x) > 6.2 && Math.abs(Math.sin(y * 0.9 + z * 2.6 + x)) < 0.08 ? PALE_VEIN : null,
  // the eyes sunk in dark hollows
  paintC: PALE_SOCK, paint: (x, y, z) => z > 2.5 && Math.abs(y - 36.5) < 1.45 && Math.abs(Math.abs(x) - 1.45) < 1.3,
});
CLAN_LOOK.push(PALE_LOOK({}), PALE_LOOK({ old: 1, hair: [222, 220, 212] }));
const PALE_VI = 5, PALE_OLD_VI = 6;
{ const ct = clanTint; clanTint = function (V) {
    const f = ct(V); if (!V.pale) return f; const C = V.C;
    return (c, x, y, z) => f((c === C.trou || c === C.trouL) && y < 14.4 + 0.9 * Math.sin(x * 2.3 + z * 1.7) ? C.skin : c, x, y, z);   // a rag round the loins, and nothing else
  }; }
{ const cx = clanExtra; clanExtra = function (V) {
    if (!V.pale) return cx(V);
    return K => {
      const { lump, one, col } = K;
      lump([0, 16.6, 2.9], [3.3, 2.7, 0.9], one('hips'), col('trou'), 10, 8);   // the loin rag, hanging in front
      lump([0, 18.3, 0], [4.8, 0.6, 3.8], one('hips'), col('belt'), 12, 4);   // a cord to hold it
      for (let i = 0; i < 7; i++) lump([0, 19.5 + i * 1.75, -3.9 - Math.sin(i * 0.5) * 0.4], [0.75, 0.6, 0.65], one(i < 3 ? 'spine' : 'chest'), col('skin'), 6, 5);   // the knobs of its spine
      for (const s of [1, -1]) for (let k = 0; k < 3; k++) lump([s * (6.0 + (k - 1) * 0.55), 11.4, 0.6 + k * 0.25], [0.24, 1.25, 0.24], one(s > 0 ? 'handR' : 'handL'), col('nail'), 5, 5);   // long black nails
      if (V.old) for (let i = 0; i < 9; i++) { const a = -1.5 + i * 0.37; lump([Math.sin(a) * 3.6, 33.6 - (i % 3) * 1.2, -1.4 - Math.cos(a) * 1.6], [0.5, 4.2 + (i % 2) * 1.5, 0.45], one('head'), col('hair'), 5, 6); }   // long white strings of hair
    };
  }; }
// past twelve figures, an idle one (not a body lying there) is made over into whatever's needed
{ const cr = clanRig; clanRig = function (vi) {
    const R = cr(vi); if (R || !CLAN_GEO) return R;
    const Q = CLAN_RIGS.find(q => !q.owner && !q.keep); if (!Q) return null;
    Q.mesh.geometry = CLAN_GEO[vi]; Q.edge.geometry = CLAN_GEO[vi]; Q.vi = vi; return Q;
  }; }

// ---------------- the numbers ----------------
const PALE_MELEE = { wind: 0.24, trig: 40, hit: 32, lunge: 46, rec: 0.45 };
const PALE_OLD_MELEE = { wind: 0.34, trig: 50, hit: 42, lunge: 52, rec: 0.55 };
const PL = {
  crawl: 84, prowl: 56, search: 76, rush: 214, back: 150, dart: 175, flee: 190,
  hp: 0.45, oldHp: 1.8,      // of a cannibal's
  sleepEar: 0.45,            // how much less a sleeper hears
  rock: 0.5,                 // rock in the way halves how far a sound carries
  gap: [3, 6],               // seconds between one rushing you and the next
  back: 4,                   // days the dead stay dead (the old one twice that)
};
// how far you're heard: creeping, walking, running flat out; and what else makes a noise
const PALE_EAR = { still: 0, sneak: [30, 0.6], walk: [60, 1.35], sprint: 320, swing: 150, ore: 380, hurt: 260, bow: 150, bats: 520, blast: 680, shriek: 430 };
const PALE = { si: -1, nav: null, tok: null, gap: 4, ev: [], pn: 0, atk: null, hp: 0, bats: false, amb: 14, pLit: null };
const paleList = () => S.rg.enemies.filter(e => !e.dead && e.cl && e.cl.cave);
function paleNoise(x, y, r) { PALE.ev.push({ x, y, r, t: S.t }); }

// ---------------- finding the way: along the passages, then straight once it can ----------------
function paleGraph(Sy) {
  const N = [], key = new Map(), at = (x, y) => { const k = Math.round(x) + ',' + Math.round(y); let i = key.get(k); if (i === undefined) { i = N.length; key.set(k, i); N.push({ x: Sy.C.x + x, y: Sy.C.y + y, e: [] }); } return i; };
  for (const t of Sy.tubes) { if (t.exit) continue; const a = at(t.ax, t.ay), b = at(t.bx, t.by), w = Math.hypot(t.bx - t.ax, t.by - t.ay); N[a].e.push([b, w]); N[b].e.push([a, w]); }
  return N;
}
function paleNear(N, x, y) {
  const o = N.map((n, i) => [Math.hypot(n.x - x, n.y - y), i]).sort((a, b) => a[0] - b[0]);
  for (let k = 0; k < Math.min(6, o.length); k++) if (caveLos(x, y, N[o[k][1]].x, N[o[k][1]].y, 5)) return o[k][1];
  return o[0][1];
}
function palePath(N, a, b) {
  const n = N.length, dist = new Float64Array(n).fill(1e18), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n); dist[a] = 0;
  for (;;) {
    let u = -1, bd = 1e18; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; u = i; }
    if (u < 0 || u === b) break; done[u] = 1;
    for (const [v, w] of N[u].e) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
  }
  const out = []; for (let u = b; u >= 0; u = prev[u]) { out.push(u); if (u === a) break; }
  return out.reverse();
}
function paleNav(e, tx, ty) {
  const c = e.cl, N = PALE.nav; if (!N || !N.length) return { x: tx, y: ty };
  let P = c.path;
  if (!P || (S.t - P.t > 0.4 && (Math.hypot(P.tx - tx, P.ty - ty) > 45 || S.t - P.t > 1.6))) {
    P = c.path = { tx, ty, t: S.t, pts: [], pullT: S.t };
    if (!caveLos(e.x, e.y, tx, ty, 6)) P.pts = palePath(N, paleNear(N, e.x, e.y), paleNear(N, tx, ty)).map(i => N[i]);
    P.pts.push({ x: tx, y: ty, end: 1 });
  }
  const last = P.pts[P.pts.length - 1]; if (last.end) { last.x = tx; last.y = ty; }
  while (P.pts.length > 1 && Math.hypot(P.pts[0].x - e.x, P.pts[0].y - e.y) < 22) P.pts.shift();
  if (P.pts.length > 1 && S.t - P.pullT > 0.3) { P.pullT = S.t; if (caveLos(e.x, e.y, P.pts[1].x, P.pts[1].y, 6)) P.pts.shift(); }
  return P.pts[0];
}
// a spot it can stand on: pulled back toward (fx, fy) until it's clear of the rock
function paleOpen(tx, ty, fx, fy, pad = 16) {
  for (let k = 0; k < 6; k++) { if (caveSdf(tx, ty) < -pad) return { x: tx, y: ty }; tx = lerp(tx, fx, 0.35); ty = lerp(ty, fy, 0.35); }
  return { x: fx, y: fy };
}
function paleAway(e, dist) {   // off into the dark, away from you
  const p = S.p, a0 = Math.atan2(e.y - p.y, e.x - p.x);
  for (let k = 0; k < 12; k++) {
    const a = a0 + (k ? (Math.random() - 0.5) * (1 + k * 0.3) : 0), x = e.x + Math.cos(a) * dist, y = e.y + Math.sin(a) * dist;
    if (caveSdf(x, y) < -18 && caveLos(e.x, e.y, x, y, 6) && !paleLitAt(x, y, 20)) return { x, y };
  }
  const N = PALE.nav || []; let b = null, bd = -1;
  for (const n of N) { const de = Math.hypot(n.x - e.x, n.y - e.y), dp = Math.hypot(n.x - p.x, n.y - p.y); if (de < 360 && dp > bd && !paleLitAt(n.x, n.y, 20)) { bd = dp; b = n; } }
  return b ? { x: b.x, y: b.y } : { x: e.x, y: e.y };
}

// ---------------- the light ----------------
// your torch's beam, as it falls on the body (the same cone the light is drawn with, a little wider at the edges)
function paleBeamK(e) {
  if (!S.torchOn) return 0;
  const tl = LU.tCol.value.x; if (tl < 0.05) return 0;
  const P = LU.tPos.value, Dv = LU.tDir.value, hx = e.x - P.x, hz = e.y - P.z, hy = terrH(e.x, e.y) + 22 - P.y, d = Math.hypot(hx, hy, hz);
  if (d < 16) return tl;
  const rng0 = LU.tRange.value; if (d > rng0) return 0;
  const cs = (hx * Dv.x + hy * Dv.y + hz * Dv.z) / d, c0 = Math.cos(Math.acos(LU.tCone.value.x) * 1.3), c1 = LU.tCone.value.y;
  return clamp((cs - c0) / (c1 - c0), 0, 1) * clamp(1.15 - 0.75 * d / rng0, 0, 1) * Math.min(1, tl);
}
// where they won't go: daylight in the mouths, a fire of yours, a lit torch post
function paleLitAt(x, y, pad = 0) {
  const si = caveSysAt(x); if (si < 0) return null;
  const Sy = caveSys(si), lt = dayLight();
  if (lt > 0.25) for (const q of Sy.exits) { const ex = Sy.C.x + q.x, ey = Sy.C.y + q.y, r = 120 + 140 * lt; if (Math.hypot(ex - x, ey - y) < r + pad) return { x: ex, y: ey, r }; }
  for (const B of S.day.builds) {
    if (B.x < CAVE_X0) continue;
    if (B.t === 'fire' && Math.hypot(B.x - x, B.y - y) < 115 + pad) return { x: B.x, y: B.y, r: 115 };
    if (B.t === 'tpost' && B.fuel > 0 && Math.hypot(B.x - x, B.y - y) < 140 + pad) return { x: B.x, y: B.y, r: 140 };
  }
  return null;
}

// ---------------- their voices: clicking, hissing, the shriek ----------------
const PALE_SND = { click: [0.95, 760], clickF: [1, 650], hiss: [0.8, 520], rattle: [0.75, 820], snore: [0.5, 300], shriek: [1.2, 1500], hurt: [1, 900], die: [1.1, 1300], chitter: [0.95, 1100], breath: [0.7, 300] };
function paleSnd(k, x, y, v = 1, vp = 210) {
  if (!actx || !noiseBuf || !sfxGain || !PALE_SND[k]) return;
  const o = placeOut(x, y, PALE_SND[k][0] * v, PALE_SND[k][1]); if (!o) return;
  const t = actx.currentTime, R = Math.random;
  if (k === 'click' || k === 'clickF') {   // the clicks it finds its way by: a tongue against the teeth, quick as a rattle
    const n = k === 'clickF' ? 9 + Math.floor(R() * 6) : 4 + Math.floor(R() * 5), gap = k === 'clickF' ? 0.024 : 0.045 + R() * 0.03, f = 2900 + R() * 1400;
    for (let i = 0; i < n; i++) { const ti = t + i * gap * (0.85 + R() * 0.3); clanNz(ti, 'bandpass', f * (0.94 + R() * 0.12), 0.011, 0.95, o, 7); clanNz(ti, 'highpass', 5200, 0.006, 0.4, o); }
  } else if (k === 'hiss') {   // caught in the light
    clanNz(t, 'highpass', 3400, 0.75 + R() * 0.3, 0.55, o, 0.7); clanNz(t + 0.05, 'bandpass', 5600, 0.6, 0.4, o, 2);
    clanVoice(t, o, { len: 0.5, f: [[0, vp * 1.6], [1, vp * 1.2]], v: [[0, 'i'], [1, 'e']], env: [[0.1, 0.35], [0.6, 0.25]], g: 0.25, breath: 0.9, rasp: 0.6, fk: 1.25 });
  } else if (k === 'rattle' || k === 'snore') {   // a wet rattle in the throat; asleep, slow and low
    const L = k === 'snore' ? 1.2 : 0.8, s = actx.createOscillator(), am = actx.createOscillator(), ag = actx.createGain(), g = actx.createGain(), lp = actx.createBiquadFilter();
    s.type = 'sawtooth'; s.frequency.setValueAtTime(k === 'snore' ? 48 : 70 + R() * 15, t); s.frequency.linearRampToValueAtTime(k === 'snore' ? 40 : 58, t + L);
    am.type = 'square'; am.frequency.value = k === 'snore' ? 14 + R() * 4 : 22 + R() * 8; ag.gain.value = 0.5; am.connect(ag); ag.connect(g.gain);
    lp.type = 'lowpass'; lp.frequency.value = k === 'snore' ? 380 : 650;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(k === 'snore' ? 0.3 : 0.5, t + L * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + L);
    s.connect(lp); lp.connect(g); g.connect(o); s.start(t); am.start(t); s.stop(t + L + 0.05); am.stop(t + L + 0.05);
    clanNz(t, 'bandpass', k === 'snore' ? 600 : 900, L, 0.25, o, 1.2);
  } else if (k === 'shriek') {   // thin and piercing, nothing like a voice any more
    const L = 0.6 + R() * 0.3, hi = vp * (4 + R() * 0.8);
    clanVoice(t, o, { len: L, f: [[0, hi * 0.7], [0.1, hi * 1.08], [0.55, hi], [1, hi * 0.6]], v: [[0, 'ae'], [0.4, 'i'], [1, 'e']], env: [[0.05, 1], [0.75, 0.8]], g: 1, breath: 0.7, rasp: 1, jit: 0.07, vib: 11, fk: 1.3 });
    clanNz(t, 'highpass', 2600, L, 0.5, o, 0.9);
  } else if (k === 'chitter') {   // to the others: a burst of clicks and a squeal
    for (let i = 0; i < 12; i++) clanNz(t + i * 0.03, 'bandpass', 3400 + R() * 900, 0.01, 0.9, o, 7);
    clanVoice(t + 0.38, o, { len: 0.32, f: [[0, vp * 3.2], [1, vp * 3.8]], v: [[0, 'i'], [1, 'i']], env: [[0.1, 0.8], [0.7, 0.6]], g: 0.6, breath: 0.6, rasp: 0.7, jit: 0.06, vib: 13, fk: 1.3 });
  } else if (k === 'hurt') {
    clanVoice(t, o, { len: 0.28, f: [[0, vp * 3.4], [1, vp * 2.2]], v: [[0, 'ae'], [1, 'a']], env: [[0.06, 1], [0.6, 0.6]], g: 0.9, breath: 0.6, rasp: 0.9, jit: 0.06, fk: 1.25 });
  } else if (k === 'die') {
    clanVoice(t, o, { len: 1.5, f: [[0, vp * 3.6], [0.2, vp * 3], [0.7, vp * 1.6], [1, vp * 0.9]], v: [[0, 'i'], [0.4, 'ae'], [1, 'u']], env: [[0.05, 1], [0.4, 0.75], [0.85, 0.3]], g: 1, breath: 0.6, rasp: 1, jit: 0.08, vib: 9, fk: 1.25 });
    boomAt(t + 0.9, 90, 40, 0.3, 0.3, o);
  } else if (k === 'breath') { clanNz(t, 'bandpass', 1500, 0.35, 0.4, o, 1.6); clanNz(t + 0.45, 'bandpass', 1100, 0.4, 0.35, o, 1.6); }
}
function paleSay(e, k, v = 1) {
  const c = e.cl; paleSnd(k, e.x, e.y, v, c.vp);
  if (k === 'click' || k === 'clickF' || k === 'chitter') c.clickT = S.t;
  if (k === 'shriek') { c.shriekT = S.t; paleNoise(e.x, e.y, PALE_EAR.shriek); }
  if (k === 'chitter') paleNoise(e.x, e.y, PALE_EAR.shriek * 0.8);
}

// ---------------- down they come: as many as are left of them ----------------
function paleEnter(si) {
  caveEnts(); const D = S.day, rg = S.rg, Sy = caveSys(si), sp = Sy.sp, R = Math.random;
  for (const e of rg.enemies) if (e.cl && e.cl.cave && !e.dead) e.dead = e.gone = true;
  PALE.si = si; PALE.tok = null; PALE.gap = 6; PALE.nav = paleGraph(Sy); PALE.ev.length = 0; PALE.amb = 10 + R() * 10;
  D.cave.dead = D.cave.dead || {};
  const fresh = (D.cave.dead[si] || []).filter(n => D.n - n < PL.back); D.cave.dead[si] = fresh;
  const oldIn = !!sp.deep && !(D.cave.oldN !== undefined && D.n - D.cave.oldN < PL.back * 2);
  let n = Math.max(0, sp.pale - fresh.length);
  const lairs = Sy.lairs.length ? Sy.lairs : [Sy.rooms[Sy.rooms.length - 1]], prowl = sp.deep ? 2 : si === 0 ? 1 : 0;
  const spot = (L, f = 0.5) => { for (let k = 0; k < 20; k++) { const a = R() * 6.283, d = L.r * f * Math.sqrt(R()), q = { x: Sy.C.x + L.x + Math.cos(a) * d, y: Sy.C.y + L.y + Math.sin(a) * d }; if (caveSdf(q.x, q.y) < -20) return q; } return { x: Sy.C.x + L.x, y: Sy.C.y + L.y }; };
  if (oldIn) { const q = spot(lairs[0], 0.25); paleSpawn(q.x, q.y, { old: 1, lair: lairs[0] }); }
  for (let k = 0; k < n; k++) {
    const pr = k >= n - prowl, L = pr ? pick(Sy.rooms.filter(r => r.tag !== 'ent' && r.far >= 1)) || lairs[0] : lairs[k % lairs.length], q = spot(L, pr ? 0.4 : 0.55);
    if (Math.hypot(q.x - S.p.x, q.y - S.p.y) < 420) continue;   // not right on top of you
    paleSpawn(q.x, q.y, { prowl: pr, lair: lairs[k % lairs.length] });
  }
}
function paleSpawn(x, y, o) {
  const rg = S.rg; spawnFoe('cannibal', { x, y, d: 600 });
  const e = rg.enemies[rg.enemies.length - 1]; clanInit(e, null);
  const c = e.cl, R = Math.random;
  e.maxHp = e.hp = e.maxHp * (o.old ? PL.oldHp : PL.hp);
  Object.assign(c, { cave: 1, old: o.old ? 1 : 0, vi: o.old ? PALE_OLD_VI : PALE_VI, club: false, kind: o.old ? 'leader' : 'reg', hp0: e.hp,
    vp: o.old ? 150 + R() * 20 : 195 + R() * 50, home: { x, y }, lair: o.lair, prowler: !!o.prowl, side: R() < 0.5 ? -1 : 1, sideS: R() < 0.5 ? -1 : 1,
    lx: x, ly: y, heardT: -99, ht: R() * 0.2, lt: R() * 0.15, los: false, beam: 0, burn: 0, shyCd: 0, sN: 0, clickT: -9, shriekT: -9, nextC: 1 + R() * 3,
    crawl: 1, crawlK: 1, sleepK: o.prowl ? 0 : 1, cockK: 0, shyK: 0, rr: 200, spd: o.old ? 0.9 : 0.94 + R() * 0.14 });
  paleGo(e, o.prowl ? 'prowl' : 'sleep');
  return e;
}

// ---------------- each of them ----------------
function paleGo(e, st, o = {}) {
  const c = e.cl, prev = c.st; c.st = st; c.t = 0; c.o = o; c.dest = null; c.swung = 0; c.closeT = 0;
  if (prev === 'rush' && st !== 'rush' && PALE.tok === e) { PALE.tok = null; PALE.gap = PL.gap[0] + Math.random() * (PL.gap[1] - PL.gap[0]); }
  if (st === 'rush') { if (!PALE.tok || PALE.tok.dead) PALE.tok = e; e.swCd = 0; paleSay(e, 'shriek'); }
  if (st === 'stalk') c.rr = Math.max(c.rr, clamp(c.d || 200, 150, 240));
  if (st === 'shy') { paleSay(e, 'hiss', 0.9); c.burnHop = 1; }
  if (st === 'flee') paleSay(e, 'shriek', 0.8);
  if (st === 'listen') c.o.T = o.T || 0.7 + Math.random() * 0.8;
}
function paleWake(e, x, y) {
  const c = e.cl; if (c.st !== 'sleep') return;
  c.lx = x; c.ly = y; c.heardT = S.t; paleGo(e, 'rouse'); paleSay(e, 'rattle');
  for (const o of paleList()) if (o !== e && o.cl.st === 'sleep' && Math.hypot(o.x - e.x, o.y - e.y) < 280 && !(o.cl.wakeIn > 0)) { o.cl.wakeIn = 0.5 + Math.random() * 1.2; o.cl.wx = x; o.cl.wy = y; }
}
// what it heard: you moving, your blows and the clang of the pick, the bats going up, the others calling
function paleHear(e, c) {
  const p = S.p, sl = c.st === 'sleep' || c.st === 'rouse' ? PL.sleepEar : 1;
  let best = null, bk = 0;
  const one = (x, y, r0, me) => {
    const d = Math.hypot(x - e.x, y - e.y); let r = r0 * sl; if (d > r) return;
    if (d > 60 && !(me ? c.los : caveLos(e.x, e.y, x, y, 3))) { r *= PL.rock; if (d > r) return; }
    const k = 1 - d / r; if (k > bk) { bk = k; best = { x, y, k, me }; }
  };
  if (PALE.pn > 0) one(p.x, p.y, PALE.pn, 1);
  for (const n of PALE.ev) if (n.t > (c.evT || -9)) one(n.x, n.y, n.r, Math.hypot(n.x - p.x, n.y - p.y) < 30);
  c.evT = S.t;
  if (!best) return null;
  if (sl < 1 && Math.random() > Math.min(1, bk * 2.2)) return null;   // asleep, it might sleep through a soft one
  return best;
}
function paleHeard(e, c, n) {
  const d = Math.hypot(n.x - e.x, n.y - e.y), err = Math.min(70, d * 0.14) * (1 - n.k);
  c.lx = n.x + (Math.random() - 0.5) * 2 * err; c.ly = n.y + (Math.random() - 0.5) * 2 * err; c.heardT = S.t; c.sN = 0;
  if (c.st === 'sleep') return paleWake(e, c.lx, c.ly);
  if (['prowl', 'search', 'home'].includes(c.st)) { paleGo(e, 'listen', { T: 0.45 + Math.random() * 0.6 }); paleSay(e, Math.random() < 0.5 ? 'chitter' : 'click'); }
}
function paleHurt(e, c) {
  const asleep = c.st === 'sleep' || c.st === 'rouse';
  if (asleep) { e.hp -= (c.hp0 - e.hp) * 1.6; exNote('it never heard you coming', true); }   // a blow it never heard coming
  c.hp0 = e.hp; c.flinch = 1; paleSay(e, 'hurt');
  c.lx = S.p.x; c.ly = S.p.y; c.heardT = S.t; paleNoise(e.x, e.y, 360);
  if (e.hp <= 0) return;
  if (e.hp < e.maxHp * (c.old ? 0.18 : 0.3) && Math.random() < 0.75) return paleGo(e, 'flee');
  if (asleep) return paleGo(e, 'rush', { mad: 1 });   // woken by it: straight at you
  if (c.st === 'rush' && !c.swung) return;
  const k = Math.atan2(e.y - S.p.y, e.x - S.p.x); c.hop = { vx: Math.cos(k) * 150, vy: Math.sin(k) * 150, t: 0.2, T: 0.2 };   // knocked back a step
  paleGo(e, Math.random() < (c.old ? 0.65 : 0.4) ? 'rush' : 'back', { mad: 1 });
}
function paleHopStep(e, dt) {
  const c = e.cl; if (!c.hop) return;
  const k = Math.min(dt, c.hop.t), nx = e.x + c.hop.vx * k, ny = e.y + c.hop.vy * k;
  if (caveSdf(nx, ny) < -12) { e.x = nx; e.y = ny; }
  c.hop.t -= dt; if (c.hop.t <= 0) c.hop = null;
}
const paleKnow = c => S.t - c.heardT;
function paleFaceTo(c, e, x, y) { c.faceW = Math.atan2(y - e.y, x - e.x); }
function paleClicks(e, c, dt, close) {
  if ((c.nextC -= dt) > 0) return;
  c.nextC = close ? 1 + Math.random() * 1.3 : 2.2 + Math.random() * 3;
  paleSay(e, close && c.d < 140 ? 'clickF' : 'click', close ? 1 : 0.85);
  if (close && c.d < 90 && Math.random() < 0.5) setTimeout(() => { if (!e.dead) paleSay(e, 'breath', 0.8); }, 500);
}

const PALE_ST = {
  sleep(e, c, d, dt) {
    c.crawl = 1; c.faceW = c.face; c.v = 0;
    if (d < 170 && (c.snT = (c.snT ?? 1) - dt) <= 0) { c.snT = 2.4 + Math.random() * 2.6; paleSay(e, 'snore', 0.7); }   // asleep, close by: you hear it breathing
    if (c.wakeIn > 0 && (c.wakeIn -= dt) <= 0) paleWake(e, c.wx, c.wy);
    if (d < 20) paleWake(e, S.p.x, S.p.y);
    // your light on its skin: it stirs, and then it wakes
    c.lightT = c.beam > 0.6 && d < 75 ? (c.lightT || 0) + dt : Math.max(0, (c.lightT || 0) - dt * 0.5);
    if (c.lightT > 1.1 && !c.stir) { c.stir = 1; paleSay(e, 'rattle', 0.6); } else if (c.lightT < 0.3) c.stir = 0;
    if (c.lightT > 2.4) paleWake(e, S.p.x, S.p.y);
  },
  rouse(e, c, d, dt) {   // up off the floor, head jerking round toward the noise
    c.crawl = 0.5; paleFaceTo(c, e, c.lx, c.ly);
    if (c.t > 0.3 && !c.o.cl) { c.o.cl = 1; paleSay(e, 'chitter'); }
    if (c.t > 1.1) paleGo(e, 'listen', { T: 0.4 });
  },
  listen(e, c, d, dt) {   // frozen, the head cocked
    c.crawl = 0.35; c.cock = 1; paleFaceTo(c, e, c.lx, c.ly);
    if (c.t < dt * 1.5 && Math.random() < 0.6) paleSay(e, 'click');
    if (c.t < c.o.T) return;
    if (paleKnow(c) < 2.5) return paleGo(e, 'stalk');
    if (c.prowler && paleKnow(c) > 6) return paleGo(e, 'prowl');
    paleGo(e, ++c.sN > 3 ? 'home' : 'search');
  },
  prowl(e, c, d, dt) {   // the ones awake wander from chamber to chamber, clicking
    c.crawl = 1;
    if (!c.dest) {
      const Sy = caveSys(PALE.si), L = c.lair || Sy.rooms[0], hop = [L, ...L.nb, ...L.nb.flatMap(r => r.nb)].filter(r => r.tag !== 'ent'), r = pick(hop) || L;
      const a = Math.random() * 6.283, q = paleOpen(Sy.C.x + r.x + Math.cos(a) * r.r * 0.45, Sy.C.y + r.y + Math.sin(a) * r.r * 0.45, Sy.C.x + r.x, Sy.C.y + r.y);
      c.dest = paleLitAt(q.x, q.y, 30) ? { x: Sy.C.x + L.x, y: Sy.C.y + L.y } : q;
    }
    const w = paleNav(e, c.dest.x, c.dest.y); clanMove(e, w.x, w.y, PL.prowl, dt); paleClicks(e, c, dt, false);
    if (Math.hypot(c.dest.x - e.x, c.dest.y - e.y) < 24 || c.t > 30) paleGo(e, 'listen', { T: 1.5 + Math.random() * 2.5 });
  },
  search(e, c, d, dt) {   // to where it last heard you, slowly, clicking
    c.crawl = 1;
    const q = c.dest || (c.dest = paleOpen(c.lx, c.ly, e.x, e.y)), w = paleNav(e, q.x, q.y);
    clanMove(e, w.x, w.y, PL.search, dt); paleClicks(e, c, dt, false);
    if (Math.hypot(q.x - e.x, q.y - e.y) < 26 || c.t > 14) paleGo(e, 'listen', { T: 1.2 + Math.random() * 1.6 });
  },
  home(e, c, d, dt) {   // back to the lair, and to sleep
    c.crawl = 1;
    const w = paleNav(e, c.home.x, c.home.y); clanMove(e, w.x, w.y, PL.prowl, dt);
    if (Math.hypot(c.home.x - e.x, c.home.y - e.y) < 22 || c.t > 40) { c.sN = 0; if (c.prowler) paleGo(e, 'prowl'); else { paleGo(e, 'sleep'); c.face = Math.random() * 6.283; } }
  },
  stalk(e, c, d, dt) {   // it knows about where you are: round behind you, in the dark, closer and closer
    c.crawl = 1; const p = S.p, lost = paleKnow(c);
    if (lost > 7) return paleGo(e, 'search');
    if (c.burn > (c.old ? 1.2 : 2.3) && d < 140 && !PALE.pLit && !PALE.tok) { c.burn = 0; return paleGo(e, 'rush', { mad: 1 }); }   // held in the light too long: it goes mad
    c.rr = Math.max(c.old ? 52 : 68, c.rr - dt * (c.old ? 30 : 21));
    const lit = PALE.pLit, minR = lit ? Math.max(c.rr, lit.r - Math.hypot(p.x - lit.x, p.y - lit.y) + 50) : c.rr;
    const ba = S.aimW + Math.PI + c.side * 0.65, tx = c.lx + Math.cos(ba) * minR, ty = c.ly + Math.sin(ba) * minR;
    const q = paleOpen(tx, ty, c.lx + (e.x - c.lx) * minR / Math.max(1, Math.hypot(e.x - c.lx, e.y - c.ly)), c.ly + (e.y - c.ly) * minR / Math.max(1, Math.hypot(e.x - c.lx, e.y - c.ly)));
    const w = paleNav(e, q.x, q.y), far = Math.hypot(q.x - e.x, q.y - e.y);
    clanMove(e, w.x, w.y, far < 30 ? PL.crawl * 0.4 : PL.crawl * (c.old ? 0.85 : 1) * (d > 320 ? 1.35 : 1), dt);
    if (far < 30 || d < 130) paleFaceTo(c, e, c.lx, c.ly);
    paleClicks(e, c, dt, true);
    // close, in the dark, and nobody else coming at you: now
    if (d < (c.old ? 120 : 105) && c.beam < 0.08 && lost < 1.6 && !lit) c.closeT += dt; else c.closeT = Math.max(0, c.closeT - dt);
    if (c.closeT > (c.old ? 0.4 : 0.7) && !PALE.tok && PALE.gap <= 0) paleGo(e, 'rush');
  },
  rush(e, c, d, dt) {   // at you, shrieking, and rake at you
    c.crawl = 0; const p = S.p;
    if (c.t > 3.2 || (PALE.pLit && !c.o.mad)) return paleGo(e, 'back');
    const sw = foeMelee(e, d, dt, c.old ? PALE_OLD_MELEE : PALE_MELEE);
    if (sw || e.sw) { c.swung = 1; paleFaceTo(c, e, p.x, p.y); return; }
    if (c.swung) return paleGo(e, 'back');   // hit or missed: off into the dark
    if (c.beam > (c.old ? 0.85 : 0.5) && d > 46 && !c.o.mad && Math.random() < dt * (c.old ? 0.6 : 3.2)) return paleGo(e, 'shy');
    const w = paleNav(e, p.x, p.y); clanMove(e, w.x, w.y, PL.rush * (c.old ? 1.08 : 1), dt);
  },
  back(e, c, d, dt) {   // away into the dark again
    c.crawl = 0.7;
    const q = c.dest || (c.dest = paleAway(e, 180 + Math.random() * 70)), w = paleNav(e, q.x, q.y);
    clanMove(e, w.x, w.y, PL.back, dt);
    if (Math.hypot(q.x - e.x, q.y - e.y) < 22 || c.t > 2.6) { c.side = -c.side; c.rr = 190 + Math.random() * 40; paleGo(e, 'stalk'); }
  },
  shy(e, c, d, dt) {   // the light: an arm over its face, a hiss, and out of the beam sideways
    c.crawl = 0.55; const p = S.p, rx = e.x - p.x, ry = e.y - p.y, L = Math.hypot(rx, ry) || 1, ax = Math.cos(S.aimW), ay = Math.sin(S.aimW);
    const side = c.o.side || (c.o.side = (rx * -ay + ry * ax) >= 0 ? 1 : -1);
    let q = c.dest;
    if (!q) {   // sideways, as far as it takes to be out of the beam, and a little back
      const half = Math.acos(LU.tCone.value.x) * 1.3 + 0.15, along = Math.max(30, rx * ax + ry * ay), lat = Math.abs(rx * -ay + ry * ax), need = Math.max(0, Math.tan(half) * along - lat) + 34;
      const at = s => ({ x: e.x - ay * s * need + rx / L * 22, y: e.y + ax * s * need + ry / L * 22 }), ok = q => caveSdf(q.x, q.y) < -14 && caveLos(e.x, e.y, q.x, q.y, 6);
      q = at(side); if (!ok(q)) { const q2 = at(-side); if (ok(q2)) { q = q2; c.o.side = -side; } else q = paleAway(e, 120); }
      c.dest = q; c.o.T = 0.3 + Math.hypot(q.x - e.x, q.y - e.y) / PL.dart + 0.4;
    }
    if (c.t < 0.28) clanMove(e, e.x + rx / L * 12, e.y + ry / L * 12, 40, dt);   // a start back from it
    else clanMove(e, q.x, q.y, PL.dart, dt);
    c.faceW = Math.atan2(-ry, -rx) + c.o.side * 1.0;
    c.shySide = c.o.side;
    if ((c.beam < 0.08 && c.t > 0.45) || c.t > c.o.T) { c.side = c.o.side; c.shyCd = 0.9 + Math.random() * 0.9; c.rr = Math.max(c.rr, 140); paleGo(e, 'stalk'); }
  },
  flee(e, c, d, dt) {   // badly hurt: back to the lair to lick its wounds
    c.crawl = 0.2;
    const q = c.dest || (c.dest = Math.hypot(c.home.x - S.p.x, c.home.y - S.p.y) < 260 ? paleAway(e, 340) : c.home), w = paleNav(e, q.x, q.y); clanMove(e, w.x, w.y, PL.flee, dt);
    if (Math.hypot(q.x - e.x, q.y - e.y) < 30 || c.t > 12) { c.heardT = -99; paleGo(e, 'listen', { T: 8 + Math.random() * 6 }); }
  },
};
function paleAI(e, d, dt) {
  const c = e.cl, p = S.p;
  c.t += dt; c.d = d; c.shyCd -= dt;
  c.flinch = Math.max(0, (c.flinch || 0) - dt * 3); c.cock = 0;
  if (e.hp < c.hp0 - 0.01) paleHurt(e, c);
  if ((c.lt -= dt) <= 0) { c.lt = 0.15; c.los = d < 900 && caveLos(e.x, e.y, p.x, p.y, 3); c.beam = c.los ? paleBeamK(e) : 0; }
  if ((c.ht -= dt) <= 0) { c.ht = 0.2; const n = paleHear(e, c); if (n) paleHeard(e, c, n); }
  if (c.st !== 'sleep' && c.st !== 'rouse' && d < 50) { c.lx = p.x; c.ly = p.y; c.heardT = S.t; }   // right by you: it can hear you breathe
  c.burn = c.beam > 0.35 && d < 160 ? c.burn + dt : Math.max(0, c.burn - dt * 0.6);
  if (c.beam > (c.old ? 0.75 : 0.32) && c.shyCd <= 0 && !['rush', 'shy', 'flee', 'sleep', 'rouse'].includes(c.st) && !(c.st === 'stalk' && c.burn > (c.old ? 1.2 : 2.3) && !PALE.tok && d < 140)) { c.lx = p.x; c.ly = p.y; c.heardT = S.t; paleGo(e, 'shy'); }
  (PALE_ST[c.st] || PALE_ST.prowl)(e, c, d, dt);
  if (e.dead) return;
  paleHopStep(e, dt);
  // never into the light
  const L = c.st !== 'rush' || !c.o.mad ? paleLitAt(e.x, e.y, 18) : null;
  if (L) { const dx = e.x - L.x, dy = e.y - L.y, dd = Math.hypot(dx, dy) || 1, r = L.r + 18; if (dd < r) { e.x = L.x + dx / dd * r; e.y = L.y + dy / dd * r; } }
  // bodies don't pass through each other
  if (d < 24 && c.st !== 'sleep') { const dx = p.x - e.x, dy = p.y - e.y, l = Math.hypot(dx, dy) || 1; p.x = e.x + dx / l * 24; p.y = e.y + dy / l * 24; }
  if (c.st === 'sleep' && d < 20) { const dx = p.x - e.x, dy = p.y - e.y, l = Math.hypot(dx, dy) || 1; p.x = e.x + dx / l * 20; p.y = e.y + dy / l * 20; }
  if (!c.mvF) c.v = 0; c.mvF = 0;
  if (c.v > 25 && c.st !== 'shy') c.faceW = c.dir;
  c.face += angDiff(c.faceW ?? c.face, c.face) * Math.min(1, dt * (c.v > 100 ? 12 : c.v < 5 ? 8 : 6));
  e.face = Math.cos(c.face) >= 0 ? 1 : -1;
}
{ const ai = FOE_AI.cannibal; FOE_AI.cannibal = (e, sp, d, dt) => e.cl && e.cl.cave ? paleAI(e, d, dt) : ai(e, sp, d, dt); }

// ---------------- every step, down here: what made a noise, whose turn it is ----------------
function paleStep(dt) {
  const D = S.day, rg = S.rg, p = S.p, si = caveSysAt(p.x);
  if (si < 0) return;
  if (PALE.si !== si) paleEnter(si);   // a run saved down here
  PALE.gap -= dt; if (PALE.tok && (PALE.tok.dead || PALE.tok.cl.st !== 'rush')) PALE.tok = null;
  PALE.pLit = paleLitAt(p.x, p.y, 0);
  // you, moving
  const v = Math.hypot(p.vx, p.vy), cur = v < 8 ? PALE_EAR.still : D.crouch ? PALE_EAR.sneak[0] + PALE_EAR.sneak[1] * v : v > RUN * 1.1 ? PALE_EAR.sprint : PALE_EAR.walk[0] + PALE_EAR.walk[1] * v;
  PALE.pn = Math.max(cur, PALE.pn - 500 * dt);
  // your blows; the pick on the ore; your blood
  const A = p.atk;
  if (A && A !== PALE.atk) { PALE.atk = A; paleNoise(p.x, p.y, D.crouch ? PALE_EAR.swing * 0.6 : PALE_EAR.swing); }
  if (A && A.hit && !A._pn && A.hit.has && A.hit.has('world')) { A._pn = 1; paleNoise(p.x, p.y, PALE_EAR.ore); }
  if (rg.hp < PALE.hp) paleNoise(p.x, p.y, PALE_EAR.hurt); PALE.hp = rg.hp;
  // the bats going up; anything that goes off
  const bf = CVD.bats.some(b => b.st === 'fly');
  if (bf && !PALE.bats && CVD.bats.length) paleNoise(CVD.bats[0].x, CVD.bats[0].y, PALE_EAR.bats); PALE.bats = bf;
  for (const b of rg.blasts) if (!b._pn) { b._pn = 1; paleNoise(b.x, b.y, PALE_EAR.blast); }
  PALE.ev = PALE.ev.filter(n => S.t - n.t < 0.5);
  // they keep a little apart
  const L = paleList();
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j], dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy); if (dd > 22 || dd < 0.01) continue;
    if (a.cl.st === 'sleep' && b.cl.st === 'sleep') continue;
    const k = (22 - dd) / dd * 0.5; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k;
  }
  // far off in the dark, now and then, one of them
  if ((PALE.amb -= dt) <= 0) {
    PALE.amb = 12 + Math.random() * 20;
    const far = L.filter(e => Math.hypot(e.x - p.x, e.y - p.y) > 380);
    if (far.length) { const e = pick(far); paleSnd(e.cl.st === 'sleep' ? 'rattle' : Math.random() < 0.6 ? 'click' : 'chitter', e.x, e.y, 0.75, e.cl.vp); }
  }
}
{ const cl = caveLeave; caveLeave = function (m) { cl(m); PALE.si = -1; PALE.tok = null; PALE.ev.length = 0; }; }
// killed down here: you come round on your bed, your things left where you fell in the dark, and they're all back in their holes
{ const dw = dayWake; dayWake = function (...a) {
    const si = caveSysAt(S.p.x), r = dw.apply(this, a);
    S.day.bleed = 0;
    if (si >= 0) { PALE.si = -1; PALE.tok = null; PALE.ev.length = 0; exNote(`your things are down in ${caveSys(si).sp.n}`, true); }
    return r;
  }; }
// a dead one: no tooth, no tally of the clan; bone and hide, and the others shrieking in the dark
function paleDied(e) {
  const C = clan(), D = S.day, c = e.cl, si = caveSysAt(e.x);
  C.dead.push({ e, t: 0, rig: c.rig, face: c.face || 0, z: 0, x: e.x, y: e.y }); if (c.rig) c.rig.keep = true;
  paleSnd('die', e.x, e.y, 1, c.vp);
  if (PALE.tok === e) PALE.tok = null;
  const got = [], drop = (id, n) => { if (n <= 0) return; dayDrop(e.x + (Math.random() - 0.5) * 16, e.y + (Math.random() - 0.5) * 16, id, n); got.push(n > 1 ? `${DIT[id].n.toLowerCase()} ×${n}` : DIT[id].n.toLowerCase()); };
  drop('bone', c.old ? 6 : 2 + (Math.random() < 0.5 ? 1 : 0)); drop('hide', c.old ? 3 : 1);
  if (c.old) { drop('iron', 3); const t = pick(['sword2', 'mace', 'spear3', 'bow3']); dayDrop(e.x, e.y, t, 1, DIT[t].dur ? Math.round(DIT[t].dur * 0.7) : undefined); got.push(DIT[t].n.toLowerCase()); }
  else if (Math.random() < 0.35) drop('flint', 1);
  if (D.cave && si >= 0) {
    D.cave.dead = D.cave.dead || {}; if (c.old) D.cave.oldN = D.n; else (D.cave.dead[si] = D.cave.dead[si] || []).push(D.n);
    D.cave.kills = (D.cave.kills || 0) + 1;
  }
  const left = paleList().filter(o => o !== e).length;
  exNote(`${c.old ? 'the old one is dead' : 'a pale one dead'} · ${left ? `${left} more down here` : 'nothing else moving down here'} · it dropped ${got.join(', ')}`, true);
  dayJLog(c.old ? 'killed the old one at the bottom of the deep' : `killed one of the pale ones in the caves (${D.cave ? D.cave.kills : 1})`);
  // the others: the near ones come for you, shrieking; when the old one goes, they all run
  for (const o of paleList()) {
    if (o === e) continue; const q = o.cl, dd = Math.hypot(o.x - e.x, o.y - e.y); if (dd > 650) continue;
    if (q.st === 'sleep') { q.wakeIn = 0.3 + Math.random() * 0.8; q.wx = e.x; q.wy = e.y; continue; }
    q.lx = S.p.x; q.ly = S.p.y; q.heardT = S.t;
    if (c.old) paleGo(o, 'flee'); else if (q.st !== 'rush' && Math.random() < 0.5) setTimeout(() => { if (!o.dead && o.cl.st !== 'rush') paleGo(o, 'rush', { mad: 1 }); }, 300 + Math.random() * 900);
  }
  if (actx) { const t = actx.currentTime; boomAt(t + 0.15, 110, 55, 0.4, 0.35, sfxGain); }
  addShake(0.15); dayChanged();
}
{ const died = clanDied; clanDied = function (e) { if (e.cl && e.cl.cave) return paleDied(e); died(e); }; }
// down here a killing blow is just that: nobody drags you off to their camp
{ const cap = clanCapture; clanCapture = function () { return caveIn() ? false : cap(); }; }
// you can't sleep with one of them awake nearby
{ const ch = clanHostile; clanHostile = function (e) { return e.cl && e.cl.cave ? e.cl.st !== 'sleep' : ch(e); }; }
// the name on the blow that got you
{ const rh = rdHitBy; rdHitBy = function (e, kind) { rh(e, kind); if (e && e.cl && e.cl.cave && CFX.hurt) CFX.hurt.name = e.cl.old ? 'THE OLD ONE' : 'A PALE ONE'; }; }
// the bow's twang carries too
{ const dl = dayLoose; dayLoose = function (...a) { const r = dl.apply(this, a); if (caveIn()) paleNoise(S.p.x, S.p.y, PALE_EAR.bow); return r; }; }

// ---------------- how they move: on all fours mostly, up on their legs to run at you ----------------
const _pe = new V3();
function palePose(R, e, c, now, dt, dead) {
  const P = {}; for (const [n] of BONES) P[n] = [0, 0, 0];
  const first = R.pal !== e; if (first) R.pal = e;
  const mx = e.x - (R.px ?? e.x), my = e.y - (R.py ?? e.y), md = dead || c.hop ? 0 : Math.hypot(mx, my); R.px = e.x; R.py = e.y;
  const vNow = dt > 0 && md < 40 ? md / dt : 0; R.vs = (R.vs ?? vNow) + (vNow - (R.vs ?? vNow)) * Math.min(1, dt * 7);
  const cwK = c.crawlK = (c.crawlK ?? 1) + ((dead ? 0 : c.crawl ?? 1) - (c.crawlK ?? 1)) * Math.min(1, dt * 4);
  const slK = c.sleepK = (c.sleepK ?? 0) + ((c.st === 'sleep' && !dead ? 1 : 0) - (c.sleepK ?? 0)) * Math.min(1, dt * (c.st === 'sleep' ? 1.2 : 2.8));
  c.cockK += ((c.cock ? 1 : 0) - c.cockK) * Math.min(1, dt * 6);
  c.shyK += ((c.st === 'shy' && !dead ? 1 : 0) - c.shyK) * Math.min(1, dt * 9);
  if (md < 40) R.ph = (R.ph ?? c.seed * 6.283) + md * 1.348 / lerp(lerp(11, 15, clamp((R.vs - 45) / 50, 0, 1)), 8.5, cwK);
  { const st = Math.floor((R.ph ?? 0) / Math.PI); if (R.stepI !== undefined && st !== R.stepI && R.vs > 8 && !dead) clanFoot(e, R.vs * (1 - 0.5 * cwK), 0.3 + 0.6 * cwK); R.stepI = st; }
  const t = now + c.seed * 37, v = R.vs, ph = R.ph ?? 0, wk = smoothK(clamp((v - 3) / 24, 0, 1)), sw = Math.sin(ph), cw = Math.cos(ph);
  let rootY = -2.6, stiff = 12, lunge = 0, roll = 0;
  // up on its legs: stooped, the knees bent, long arms hanging forward, the head thrust out
  P.spine[0] = 0.5; P.chest[0] = 0.3; P.neck[0] = -0.3; P.head = [-0.35 + 0.04 * Math.sin(t * 0.8), 0.2 * Math.sin(t * 0.29), 0];
  P.legL[0] = P.legR[0] = -0.45; P.shinL[0] = P.shinR[0] = 0.85; P.footL[0] = P.footR[0] = -0.4;
  P.armL = [-0.42 + 0.05 * Math.sin(t * 1.1), 0, -0.1]; P.armR = [-0.42 - 0.05 * Math.sin(t * 1.1), 0, 0.1]; P.foreL[0] = P.foreR[0] = -0.45; P.handL[0] = P.handR[0] = -0.3;
  if (wk > 0) {   // running at you: bent low, the arms reaching
    const I = {}; for (const [n] of BONES) I[n] = P[n].slice(); const rY = rootY;
    const gk = Math.min(1, v / RUN) + 0.6 * clamp((v - 130) / 50, 0, 1), k = 0.35 + 0.65 * gk;
    P.legL = [-sw * 0.95 * k - 0.25, 0, 0]; P.legR = [sw * 0.95 * k - 0.25, 0, 0];
    P.shinL[0] = 0.35 + 1.45 * k * Math.max(0, cw) ** 1.5 + 0.2 * k; P.shinR[0] = 0.35 + 1.45 * k * Math.max(0, -cw) ** 1.5 + 0.2 * k;
    P.footL[0] = -P.legL[0] * 0.5 - P.shinL[0] * 0.55 + 0.15; P.footR[0] = -P.legR[0] * 0.5 - P.shinR[0] * 0.55 + 0.15;
    P.armL = [-0.75 + sw * 0.55 * k, 0.1 * sw * k, -0.2]; P.armR = [-0.75 - sw * 0.55 * k, 0.1 * sw * k, 0.2];
    P.foreL[0] = -0.35 - 0.3 * k * Math.max(0, -sw); P.foreR[0] = -0.35 - 0.3 * k * Math.max(0, sw);
    P.hips = [0, sw * 0.25 * k, -cw * 0.1 * k]; P.spine = [0.75 + 0.25 * gk, 0, 0]; P.chest = [0.3, -sw * 0.3 * k, cw * 0.06 * k];
    P.neck[0] = -0.45; P.head = [-0.4, sw * 0.1 * k, 0];
    rootY = Math.abs(cw) * 1.8 * k - 3.2 * k - 1.5;
    if (wk < 1) { for (const [n] of BONES) P[n] = cmix(I[n], P[n], wk); rootY = lerp(rY, rootY, wk); }
  }
  if (cwK > 0.01) {   // on all fours: low to the ground, a hand and the other foot together, the head up and turning
    const Q = {}; for (const [n] of BONES) Q[n] = [0, 0, 0];
    const k = smoothK(clamp(v / 30, 0, 1)), hs = 0.2 * Math.sin(t * 0.37);
    Q.hips = [0, -0.12 * sw * k, 0]; Q.spine = [0.8, 0.12 * sw * k, 0]; Q.chest = [0.52, 0.1 * sw * k, -0.06 * cw * k];
    Q.neck = [-0.65, hs * 0.5, 0]; Q.head = [-0.6 + 0.05 * Math.sin(t * 0.9), hs, 0];
    Q.legL = [-1.45 + 0.42 * sw * k, 0, -0.24]; Q.legR = [-1.45 - 0.42 * sw * k, 0, 0.24];
    Q.shinL = [2.15 + 0.35 * Math.max(0, -cw) * k, 0, 0]; Q.shinR = [2.15 + 0.35 * Math.max(0, cw) * k, 0, 0]; Q.footL = [-0.55, 0, 0]; Q.footR = [-0.55, 0, 0];
    Q.armL = [-1.8 - 0.42 * sw * k, 0, -0.14]; Q.armR = [-1.8 + 0.42 * sw * k, 0, 0.14];
    Q.foreL = [-0.25 - 0.45 * Math.max(0, cw) * k, 0, 0]; Q.foreR = [-0.25 - 0.45 * Math.max(0, -cw) * k, 0, 0]; Q.handL = [-0.6, 0, 0]; Q.handR = [-0.6, 0, 0];
    const qY = -10.2 + 0.7 * Math.abs(cw) * k;
    for (const [n] of BONES) P[n] = cmix(P[n], Q[n], cwK); rootY = lerp(rootY, qY, cwK);
  }
  // listening: dead still, the head cocked right over
  if (c.cockK > 0.01) { const k = c.cockK, s = c.seed > 0.5 ? 1 : -1; P.head[2] += 0.5 * s * k; P.head[1] *= 1 - k; P.neck[0] -= 0.15 * k; }
  // clicking: the jaw going
  if (S.t - (c.clickT ?? -9) < 0.45 && !dead) { P.head[0] += 0.05 * Math.sin(t * 85); P.neck[0] -= 0.08; }
  // the shriek: the head thrust out, the arms flung wide
  if (S.t - (c.shriekT ?? -9) < 0.8 && !dead) { const u = (S.t - c.shriekT) / 0.8, k = Math.sin(Math.PI * u); P.neck[0] -= 0.4 * k; P.head[0] -= 0.25 * k; P.armL = cmix(P.armL, [-1.0, 0, -1.1], k * 0.7); P.armR = cmix(P.armR, [-1.0, 0, 1.1], k * 0.7); P.chest[0] -= 0.2 * k; }
  // in the light: cringing back, an arm up over its eyes, the face turned away
  if (c.shyK > 0.01) {
    const k = c.shyK, s = c.shySide || 1;
    P.armL = cmix(P.armL, [-1.95, -0.45, -0.55], k); P.foreL[0] = lerp(P.foreL[0], -1.8, k);
    P.armR = cmix(P.armR, [-1.1, 0, 0.55], k); P.foreR[0] = lerp(P.foreR[0], -1.3, k);
    P.head[1] += 0.75 * s * k; P.head[0] += 0.3 * k; P.chest[1] -= 0.35 * s * k; P.spine[0] -= 0.2 * k; lunge -= 3 * k; stiff = 20;
  }
  // the rake: both arms up and back, then down across you with its whole weight
  const sw2 = e.sw;
  if (sw2 && !dead) {
    stiff = 30; const u = clamp(sw2.t / sw2.T, 0, 1);
    if (sw2.ph === 'wind') { P.armL = [-2.7, 0.3, -0.75]; P.armR = [-2.7, -0.3, 0.75]; P.foreL[0] = P.foreR[0] = -1.25; P.handL[0] = P.handR[0] = -0.7; P.spine[0] = 0.05; P.chest[0] = -0.15; P.neck[0] = -0.15; P.head[0] = -0.3; rootY = lerp(rootY, -1, 0.6); lunge = -2 * u; }
    else if (sw2.ph === 'strike') { P.armL = [-0.45, 0, -0.25]; P.armR = [-0.45, 0, 0.25]; P.foreL[0] = P.foreR[0] = -0.15; P.spine[0] = 1.0; P.chest[0] = 0.4; P.head[0] = -0.7; P.legL[0] = -1.0; P.shinL[0] = 0.5; P.legR[0] = 0.5; P.shinR[0] = 0.4; lunge = 7; rootY = -3.5; }
    else { const k = 1 - u; P.armL = cmix(P.armL, [-0.45, 0, -0.25], k); P.armR = cmix(P.armR, [-0.45, 0, 0.25], k); P.spine[0] += 0.4 * k; lunge = 4 * k; }
  }
  if (c.flinch > 0 && !dead) { P.spine[0] -= 0.5 * c.flinch; P.head[0] -= 0.4 * c.flinch; P.armL[2] -= 0.5 * c.flinch; P.armR[2] += 0.5 * c.flinch; lunge -= 4 * c.flinch; }
  if (c.hop && !dead) { const u = 1 - c.hop.t / c.hop.T, k = Math.sin(Math.PI * u); rootY += 4 * k; stiff = 26; }
  // asleep: curled up on its side on the bare rock, knees to its chest, breathing slow
  if (slK > 0.01) {
    const Q = {}; for (const [n] of BONES) Q[n] = [0, 0, 0];
    Q.spine = [0.6 + 0.04 * Math.sin(t * 1.3), 0, 0]; Q.chest = [0.4, 0, 0]; Q.neck = [0.25, 0, 0]; Q.head = [0.35, 0, 0];
    Q.legL = [-1.75, 0, 0]; Q.legR = [-1.6, 0, 0.05]; Q.shinL = [2.35, 0, 0]; Q.shinR = [2.2, 0, 0]; Q.footL = [-0.3, 0, 0]; Q.footR = [-0.3, 0, 0];
    Q.armL = [-1.25, 0, 0.35]; Q.armR = [-1.35, 0, -0.3]; Q.foreL = [-1.7, 0, 0]; Q.foreR = [-1.6, 0, 0];
    for (const [n] of BONES) P[n] = cmix(P[n], Q[n], slK); rootY = lerp(rootY, 4.2, slK); stiff = Math.min(stiff, 6);
  }
  // dead: pitched over onto its face
  if (dead) { const k = ease.back(Math.min(1, dead.t / 0.6)); roll = 1.45 * k; rootY = -9.5 * (1 - k) + 2 * k - Math.max(0, dead.t - 37) * 3; P.armL = [-2.5, 0.2, -0.5]; P.armR = [-2.2, -0.2, 0.6]; P.foreL[0] = -0.4; P.foreR[0] = -0.3; P.legL[0] = 0.2; P.shinL[0] = 1.1; P.head[0] = -0.5; stiff = 10; }
  const k = first ? 1 : 1 - Math.exp(-stiff * dt);   // (the first time it's drawn: straight into its pose, not unfolding from nothing)
  for (const [n] of BONES) { const cu = R.cur[n], w = P[n]; for (let i = 0; i < 3; i++) cu[i] += (w[i] - cu[i]) * k; R.B[n].rotation.set(cu[0], cu[1], cu[2], 'YXZ'); }
  R.root[0] += (lunge - R.root[0]) * (first ? 1 : Math.min(1, dt * 25)); R.root[1] += (rootY - R.root[1]) * (first ? 1 : Math.min(1, dt * 18));
  const x = dead ? dead.x : e.x, y = dead ? dead.y : e.y, f = dead ? dead.face : c.face, rzW = dead ? 0 : 1.45 * slK * c.sideS;
  R.rz = first ? rzW : R.rz + (rzW - R.rz) * Math.min(1, dt * 5);
  const sr = Math.sin(R.rz) * 19, sc = c.old ? 1.32 : 1;   // lying down, its middle (not its feet) is where it is
  R.mesh.position.set(x + Math.cos(f) * R.root[0] + sr * Math.sin(f), R.root[1] * sc, y + Math.sin(f) * R.root[0] - sr * Math.cos(f));
  R.mesh.scale.set(sc * 0.9, sc * 1.03, sc * 0.9); R.edge.scale.copy(R.mesh.scale);
  if (!dead) { R.rollK = (R.rollK || 0) + (roll - (R.rollK || 0)) * Math.min(1, dt * 6); roll = R.rollK; }
  R.mesh.rotation.set(roll, faceYaw(f), R.rz, 'YXZ'); R.edge.position.copy(R.mesh.position); R.edge.rotation.copy(R.mesh.rotation);
  R.mesh.visible = R.edge.visible = true;
  { const ht = Math.max(e.kHitT ?? -9, e.spkHitT ?? -9); R.mat.uniforms.flash.value = S.t - ht < 0.15 ? 0.7 * (1 - (S.t - ht) / 0.15) : 0; }
  R.mesh.updateMatrixWorld(true);
  // the milky eyes catch your light
  if (!dead && slK < 0.5) {
    const g = Math.max(c.beam || 0, clamp(1 - (c.d || 999) / 90, 0, 1) * 0.5);
    if (g > 0.04) for (const s of [-1, 1]) { _pe.set(s * 1.45, 3.6, 4.3).applyMatrix4(R.B.head.matrixWorld); stat(_pe.x, _pe.y, _pe.z, 1.5 * sc, 0.86, 0.92, 0.88, 0.85 * g, 0); }
  }
}
{ const cp = clanPose; clanPose = function (R, e, c, now, dt, dead) { if (c && c.cave) return palePose(R, e, c, now, dt, dead); return cp(R, e, c, now, dt, dead); }; }
