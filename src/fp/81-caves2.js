// ================= caves, part two: the mouths, getting in and out, and what changes down there (Joe) =================
// The mouths: six of them round the island, set into hillsides well inland, clear of the raiders' camps, the clan's, the
// ponds and the caches. Each cave's two ways out (when it has two) open far apart, so a cave can take you right across.
// In the dark: no sky, no sun, no weather but a far-off hiss of rain at the mouth; your torch lights itself; the woods' sounds
// fall away and every sound rings off the rock. The clan won't follow you down. Your tame animals do.

const CAVE_MOUTHS = [   // which cave, which of its ways out, the bearing round the island, how far out from the middle
  [0, 0, 0.4, 2300, 3700], [0, 1, 2.55, 2300, 3700],
  [1, 0, 3.55, 2100, 3500], [1, 1, 5.55, 2100, 3500],
  [2, 0, 1.45, 3400, 4500],
  [3, 0, 4.55, 1500, 2300],
];
CV.mouths = [];
function caveEnts() {
  const D = S && S.day; if (!D || !CAVES) return [];
  if (!D.cave) D.cave = { v: 1 };
  if (!D.cave.ents) D.cave.ents = caveEntsMake();
  if (!D.cave.found) D.cave.found = {};
  CV.mouths = D.cave.ents;
  return D.cave.ents;
}
function caveEntsMake() {
  const R = rng(5551), out = [], D = S.day;
  const bad = (x, y) => coastS(x, y) > -700 || Math.hypot(x, y) < 1300 || dayCampList().some(C => Math.hypot(C.x - x, C.y - y) < 700)
    || clanCamps().some(k => Math.hypot(k.x - x, k.y - y) < 650) || lakesNear(x, y, 500).some(P => Math.hypot(P.x - x, P.y - y) < P.rmax + 220)
    || D.builds.some(B => B.t === 'cache' && Math.hypot(B.x - x, B.y - y) < 350) || D.drops.some(f => f.keep && Math.hypot(f.x - x, f.y - y) < 250)
    || out.some(m => Math.hypot(m.x - x, m.y - y) < 1000);
  CAVE_MOUTHS.forEach(([si, en, a0, r0, r1], k) => {
    let best = null, bs = -1, ok = 0;
    for (let t = 0; t < 220 && ok < 14; t++) {
      const a = a0 + (R() - 0.5) * 0.9, r = r0 + R() * (r1 - r0), x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (bad(x, y)) continue; ok++;
      const gx = terrBase0(x + 20, y) - terrBase0(x - 20, y), gy = terrBase0(x, y + 20) - terrBase0(x, y - 20), sl = Math.hypot(gx, gy);   // a hillside if it can
      const sc = sl + R() * 0.8;
      if (sc > bs) { bs = sc; best = { x, y, a: sl > 0.6 ? Math.atan2(-gy, -gx) : Math.atan2(-y, -x) }; }   // facing down the slope
    }
    if (!best) { const a = a0, r = (r0 + r1) / 2; best = { x: Math.cos(a) * r, y: Math.sin(a) * r, a: a + Math.PI }; }
    out.push({ x: Math.round(best.x), y: Math.round(best.y), a: best.a, si, en, key: 'm' + k });
  });
  return out;
}
const mouthC = m => ({ x: m.x - Math.cos(m.a) * 34, y: m.y - Math.sin(m.a) * 34 });   // the middle of the heap of rock
const mouthsNear = (x, y, R) => CV.mouths.filter(m => Math.abs(m.x - x) < R + 130 && Math.abs(m.y - y) < R + 130);
// the rocks of a mouth: a heap of boulders on the hillside, an arch of three great stones, the dark inside
function mouthSolids(m) {
  if (m.sol) return m.sol;
  const ca = Math.cos(m.a), sa = Math.sin(m.a), W = (u, v) => [m.x + ca * u - sa * v, m.y + sa * u + ca * v];
  m.sol = [[-96, 0, 62], [-70, -62, 34], [-70, 62, 34], [-130, -50, 42], [-130, 50, 42], [-150, 0, 46], [-8, -27, 11], [-8, 27, 11], [-40, -78, 18], [-40, 78, 18], [-30, -40, 14], [-30, 40, 14]]
    .map(([u, v, r]) => { const [x, y] = W(u, v); return { kind: 'crag', x, y, r, s: 1 }; });
  return m.sol;
}
function mouthKit(K, m, i) {
  const R = rng(777 + i * 31), ca = Math.cos(m.a), sa = Math.sin(m.a), W = (u, v) => [m.x + ca * u - sa * v, m.y + sa * u + ca * v];
  const cols = [hex('#78726a'), hex('#6c665e'), hex('#837c72'), hex('#625d56'), hex('#8a8378')], mossy = [hex('#626b4a'), hex('#5a6342'), hex('#6c7352')];
  const rock = (u, v, h, sx, sy, sz, yaw = 0, col) => { const [x, y] = W(u, v); K.mt = 'stone'; K.add(P_ROCK((R() * 4) | 0), x, h, y, sx, sy, sz, col || cols[(R() * 5) | 0], -m.a + yaw + (R() - 0.5) * 0.3); K.mt = null; };
  const moss = () => mossy[(R() * 3) | 0];
  // the hill: a great heap of rock with the face of it just behind the arch, lower boulders either side, moss and lichen on top
  rock(-96, 0, -16, 150, 96, 150); rock(-150, 0, 22, 104, 76, 116, 0, moss());
  rock(-70, -62, -10, 80, 64, 70, 0.5); rock(-70, 62, -10, 80, 64, 70, -0.5);
  rock(-130, -50, 0, 92, 80, 90, 0.9, moss()); rock(-130, 50, 0, 92, 80, 90, -0.9, moss());
  rock(-40, -78, -4, 40, 34, 38, 0.3); rock(-40, 78, -4, 40, 34, 38, -0.3); rock(-30, -42, -4, 30, 40, 30, 0.2); rock(-30, 42, -4, 30, 40, 30, -0.2);
  rock(-60, -26, 52, 46, 26, 40, 0.4, moss()); rock(-60, 26, 52, 46, 26, 40, -0.4, moss());
  // the arch: two standing stones leaning in, and a long stone laid across them
  rock(-8, -27, -3, 22, 56, 24, 0.12); rock(-8, 27, -3, 22, 56, 24, -0.12); rock(-10, 0, 41, 30, 22, 80, 0);
  // the dark: the throat of the cave going back into the hill, black past the first few steps
  { const [x, y] = W(-31, 0); K.mt = 'plain'; K.add(P_BALL(), x, 8, y, 21, 34, 24, [0.006, 0.005, 0.005], -m.a); K.mt = null; }
  // stones fallen round the front
  for (let k = 0; k < 7; k++) { const a = (R() - 0.5) * 2.6, d = 26 + R() * 30; rock(Math.cos(a) * d * 0.6 + 6, Math.sin(a) * d * 1.4, -1, 5 + R() * 7, 4 + R() * 4, 5 + R() * 7); }
  if (m.si === 2) for (const v of [-38, 38]) {   // the deep: someone has set skulls on stakes either side, as a warning
    const [x, y] = W(8, v); K.mt = 'wood'; K.rod(P_CYL(5), x, 0, y, x, 38, y, 1.2, hex('#4a3a2a')); K.mt = 'plain';
    K.add(P_BALL(), x, 41, y, 6, 6.6, 7, hex('#d8d0bc'), -m.a + Math.PI / 2); K.add(P_BALL(), x + ca * 3, 41.5, y + sa * 3, 1.6, 1.6, 1.6, hex('#16120e')); K.mt = null;
  }
}
const mouthK = new KitMesh();
let mouthKey = '';
function mouthSync() {
  const key = CV.mouths.map(m => m.key + m.x).join();
  if (key === mouthKey) return; mouthKey = key;
  const K = new Kit(); CV.mouths.forEach((m, i) => mouthKit(K, m, i)); mouthK.set(K);
}

// ---------------- the island round the mouths: nothing grows in them, and the rocks are solid ----------------
const mouthClear = (o, r) => CV.mouths.some(m => { const c = mouthC(m); return Math.hypot(o.x - c.x, o.y - c.y) < r; });
{ const pn = propsNear; propsNear = function (x, y, R) {
    if (CAVES && x > CAVE_X0) {
      if (caveSysAt(x) !== CVD.si) return [];
      const D = S && S.day; return CVD.props.filter(o => Math.abs(o.x - x) < R + 20 && Math.abs(o.y - y) < R + 20 && !(D && D.felled.has(o.key)));
    }
    const r = pn(x, y, R), M = CV.mouths.length ? mouthsNear(x, y, R) : null;
    if (!M || !M.length) return r;
    const out = r.filter(o => !mouthClear(o, o.kind === 'tree' ? 175 : 130));
    for (const m of M) for (const o of mouthSolids(m)) if (Math.abs(o.x - x) < R + o.r && Math.abs(o.y - y) < R + o.r) out.push(o);
    return out;
  }; }
{ const dn = decorNear; decorNear = function (x, y, R) {
    if (CAVES && x > CAVE_X0) return [];
    const r = dn(x, y, R); return CV.mouths.length && mouthsNear(x, y, R).length ? r.filter(o => !mouthClear(o, 90)) : r;
  }; }
{ const nn = dayNodesNear; dayNodesNear = function (x, y, R) {
    if (CAVES && x > CAVE_X0) return [];
    const r = nn(x, y, R); return CV.mouths.length && mouthsNear(x, y, R).length ? r.filter(o => !mouthClear(o, 80)) : r;
  }; }
{ const ln = lakesNear; lakesNear = function (x, y, R) {
    if (CAVES && x > CAVE_X0) { const si = caveSysAt(x); if (si !== CVD.si) return []; const L = caveSys(si).lakes || []; return L.filter(P => Math.abs(P.x - x) < R + P.rmax && Math.abs(P.y - y) < R + P.rmax); }
    return ln(x, y, R);
  }; }
{ const pk = pondKit; pondKit = function (K, P) { if (!P.cave) return pk(K, P);   // a pool in the dark: no reeds or lilies, a rim of pale stones
    const R = rng(P.seed * 1000 | 0);
    for (let k = 0; k < 22; k++) { const a = k / 22 * 6.283 + R() * 0.2, d = pondReach(P, P.x + Math.cos(a), P.y + Math.sin(a)) + 2 + R() * 6, x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d; K.mt = 'stone'; K.add(P_ROCK(k % 4), x, Math.min(0, P.lvl - terrH(x, y)) + 0.6, y, 3 + R() * 5, 2 + R() * 2.5, 3 + R() * 4, hex(R() < 0.5 ? '#8a8476' : '#9a9282'), R() * 6); K.mt = null; }
  }; }
{ const ec = exChestsNear; exChestsNear = function (x, y, R) {
    if (CAVES && x > CAVE_X0) return CVD.crates.filter(c => Math.abs(c.x - x) < R + 10 && Math.abs(c.y - y) < R + 10);
    return ec(x, y, R);
  }; }
// the grass stops at the mouth's worn threshold
{ const gm = grassMask; grassMask = function (px, py, lakes, gen) {
    const k0 = grassKey; gm(px, py, lakes, gen); if (grassKey === k0) return;
    if (CAVES && px > CAVE_X0) { grassMaskData.fill(0); grassMaskTex.needsUpdate = true; return; }   // nothing grows down here
    if (!CV.mouths.length) return;
    const M = CV.mouths.filter(m => Math.abs(m.x - px) < GM_S && Math.abs(m.y - py) < GM_S); if (!M.length) return;
    const ox = grassU.mo.value.x, oy = grassU.mo.value.y, c = GM_S / GM_N;
    for (const m of M) {
      const cx = m.x - Math.cos(m.a) * 22, cy = m.y - Math.sin(m.a) * 22, r = 62;
      const i0 = Math.max(0, Math.floor((cx - r - ox) / c)), i1 = Math.min(GM_N - 1, Math.ceil((cx + r - ox) / c)), j0 = Math.max(0, Math.floor((cy - r - oy) / c)), j1 = Math.min(GM_N - 1, Math.ceil((cy + r - oy) / c));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(ox + (i + 0.5) * c - cx, oy + (j + 0.5) * c - cy) < r) grassMaskData[j * GM_N + i] = 0;
    }
    grassMaskTex.needsUpdate = true;
  }; }

// ---------------- going in and coming out: the daylight goes, and comes back ----------------
const CT = { ph: 0, t: 0, go: null, cool: 0, wave: 1, rm: 0 };
const caveFade = (() => { const d = document.createElement('div'); d.id = 'caveFade'; d.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;'; const h = $('hud'); if (h && h.parentNode) h.parentNode.insertBefore(d, h); else document.body.appendChild(d); return d; })();
function caveGo(to) { if (CT.ph) return; CT.ph = 1; CT.t = 0; CT.go = to; caveWhoosh(to.inCave); }
function caveTrStep(rdt) {
  if (!CT.ph) { if (caveFade.style.opacity !== '0') caveFade.style.opacity = '0'; return; }
  CT.t += rdt;
  if (CT.ph === 1) { caveFade.style.opacity = Math.min(1, CT.t / 0.5).toFixed(3); if (CT.t >= 0.5) { caveJump(CT.go); CT.ph = 2; CT.t = 0; } }
  else { caveFade.style.opacity = Math.max(0, 1 - CT.t / 0.9).toFixed(3); if (CT.t >= 0.9) { CT.ph = 0; caveFade.style.opacity = '0'; } }
}
function caveJump(to) {
  const p = S.p, D = S.day, rg = S.rg, ox = p.x, oy = p.y;
  for (const b of D.beasts) if (!b.dead && !b.pen && (b.tame || b.lead > 0) && Math.hypot(b.x - ox, b.y - oy) < 450) {   // the animals that follow you come too
    const a = to.a + Math.PI + (Math.random() - 0.5) * 1.2, d = 24 + Math.random() * 26; b.x = to.x + Math.cos(a) * d; b.y = to.y + Math.sin(a) * d; b._sx = b._px = undefined;
  }
  p.x = to.x; p.y = to.y; p.vx = p.vy = 0; S.cam.x = p.x; S.cam.y = p.y;
  look.yaw = look.tYaw = yawOfAim(to.a); look.pitch = look.tPitch = -0.04; setAim();
  if (isoP()) ISO.yaw = ISO.yawT = look.yaw;
  worldDirty = true; grassKey = ''; pondKey = ''; TP.boom = 30;
  CT.cool = 1.5;
  if (to.inCave) caveEnter(to.si, to.m); else caveLeave(to.m);
  try { daySave(); } catch (e) {}
}
function caveEnter(si, m) {
  const D = S.day, rg = S.rg, Sy = caveSys(si);
  caveBuild(si);
  for (const e of rg.enemies) if (e.type === 'cannibal' && !e.dead && !(e.cl && e.cl.cave)) e.dead = e.gone = true;   // the clan won't follow you down
  CT.rm = rg.ringMax; CT.wave = Math.min(13, 1 + Math.hypot(m ? m.x : 3000, m ? m.y : 0) / 800 + dayTough());
  rg.ringMsg = { text: Sy.sp.n, sub: Sy.sp.ents === 2 ? 'it goes right through, somewhere' : 'it only goes down', t: 0 };
  D.cave.seen = D.cave.seen || {}; const first = !D.cave.seen[si]; D.cave.seen[si] = (D.cave.seen[si] || 0) + 1;
  if (m) D.cave.found[m.key] = 1;
  if (first) { dayJLog(`went down into ${Sy.sp.n}`); caveStock(si); }
  if (!D.cave.told) { D.cave.told = 1; setTimeout(() => { if (caveIn()) exNote(`it is pitch dark down here${dayTorch() ? '' : ' · you need a fire torch'} · walk into the light to get out`, true); }, 2600); }
  if (typeof paleEnter === 'function') paleEnter(si);
}
function caveLeave(m) {
  const rg = S.rg;
  for (const e of rg.enemies) if (e.cl && e.cl.cave && !e.dead) e.dead = e.gone = true;
  rg.ringMax = Math.max(CT.rm || 0, exRing(Math.hypot(S.p.x, S.p.y)));
  if (m) S.day.cave.found[m.key] = 1;
}
// the first time you're down each cave: bones and fungus and flint lying about
function caveStock(si) {
  const D = S.day; D.cave.stock = D.cave.stock || {}; if (D.cave.stock[si]) return; D.cave.stock[si] = 1;
  const Sy = caveSys(si), R = rng(Sy.sp.seed + 99), C = Sy.C;
  const drop = (x, y, it, n) => { const f = dayDrop(x, y, it, n); return f; };
  for (const L of CVD.lights) if (L.f && !L.day && !L.ember && R() < 0.75) drop(L.x + (R() - 0.5) * 20, L.y + (R() - 0.5) * 20, 'mushroom', 1 + (R() < 0.4 ? 1 : 0));
  for (const L of Sy.lairs) for (let k = 0; k < 3; k++) { const a = R() * 6.28, d = L.r * 0.5 * R(); drop(C.x + L.x + Math.cos(a) * d, C.y + L.y + Math.sin(a) * d, 'bone', 1 + (R() < 0.5 ? 1 : 0)); }
  for (const r of Sy.rooms) if (R() < 0.45) { const a = R() * 6.28, d = r.r * 0.5 * R(); drop(C.x + r.x + Math.cos(a) * d, C.y + r.y + Math.sin(a) * d, R() < 0.5 ? 'flint' : 'stones', 1 + (R() < 0.5 ? 1 : 0)); }
  for (const f of D.drops.slice(-60)) if (f.x > CAVE_X0) cavePush(f, CV.RW);
}
// what's in a crate: better the further down, the explorer's own things and their journal
const CAVE_LOOT = [
  [['rope', 2, 3], ['flint', 2, 4], ['bandage', 1, 2], ['torch', 1, 1], ['arrows', 5, 10], ['cooked', 1, 2]],
  [['iron', 1, 3], ['arrowsI', 4, 8], ['jerky', 1, 3], ['bandage', 1, 2], ['torch', 1, 1], ['rope', 1, 2]],
  [['iron', 3, 5], ['arrowsI', 6, 12], ['jerky', 2, 3], ['pbomb', 1, 2], ['flash', 1, 2]],
];
const CAVE_RARE = ['knife3', 'sword2', 'mace', 'bow3', 'helm', 'mail', 'waxe4', 'spear3'];
const CAVE_NOTE = ['a journal, swollen with damp · the last pages:', '"day 31 · the draught comes up from below · there must be other ways out under the hills"',
  '"day 34 · something pale in the dark past the pool · it does not like the lamp"', '"day 36 · the oil is gone · I can hear them clicking"', 'folded in the back: a rough map of the caves'];
{ const dc = dayChest; dayChest = function (c) {
    if (c.cave === undefined) return dc(c);
    const rg = S.rg, D = S.day, R = Math.random; rg.looted.add(c.key);
    (rg.chestFx = rg.chestFx || []).push({ x: c.x, y: c.y, t: 0, best: c.tier || 1 }); playChestOpen(c.tier || 1); addShake(0.1);
    const n = ([it, a, b]) => dayDrop(c.x, c.y, it, a + Math.floor(R() * (b - a + 1)), DIT[it] && DIT[it].dur ? DIT[it].dur : undefined);
    if (c.note) {   // the explorer's pack
      for (const it of [['torch', 1, 1], ['rope', 2, 2], ['bandage', 2, 2], ['knife1', 1, 1]]) n(it);
      CAVE_NOTE.forEach((t, i) => setTimeout(() => exNote(t, true), i * 2600));
      for (const m of CV.mouths) D.cave.found[m.key] = 1;
      D.cave.note = 1; dayJLog('found an explorer\'s journal in the long cave, with a map of the caves');
      return;
    }
    const T = CAVE_LOOT[(c.tier || 1) - 1], k = 2 + Math.floor(R() * 2);
    const pool = T.slice(); for (let i = 0; i < k && pool.length; i++) n(pool.splice(Math.floor(R() * pool.length), 1)[0]);
    if ((c.tier || 1) >= 2 && R() < (c.tier === 3 ? 0.9 : 0.35)) { const t = CAVE_RARE[Math.floor(R() * CAVE_RARE.length)]; dayDrop(c.x, c.y, t, 1, DIT[t].dur ? Math.round(DIT[t].dur * (0.6 + R() * 0.3)) : undefined); }
    if (R() < 0.4) dayDrop(c.x, c.y, 'bandage', 1 + (R() < 0.4 ? 1 : 0));   // v127: a bandage or two where a flask was
  }; }

// ---------------- every frame: in or out ----------------
function caveView() {
  const D = S && S.day; if (!D || !CAVES) return;
  caveEnts(); mouthSync();
  const inC = caveIn(), si = inC ? caveSysAt(S.p.x) : -1;
  if (inC && caveBuilt !== si) caveBuild(si);   // a run saved down here
  caveMesh.visible = caveK.visible = caveLootK.visible = inC; caveRoofK.visible = inC && !isoP();
  for (const g of caveGlows) g.visible = inC;
  groundMesh.visible = skyMesh.visible = !inC;
  if (inC) rainMesh.visible = false;
  if (!inC) return;
  caveLootSync();
  // the dark: almost nothing but what you bring, a little grey light near the way out by day
  const lt = dayLight(), Sy = caveSys(si), p = S.p;
  let spill = 0; for (const e of Sy.exits) spill = Math.max(spill, Math.pow(clamp(1 - Math.hypot(Sy.C.x + e.x - p.x, Sy.C.y + e.y - p.y) / 320, 0, 1), 2));
  const dk = 0.15 + 0.85 * lt, iso = isoP() ? 0.045 : 0;   // from above, a little more, so you can make out the way the passages go
  LU.amb.value.set(0.03 + iso + 0.2 * spill * dk, 0.028 + iso + 0.21 * spill * dk, 0.036 + iso * 1.1 + 0.24 * spill * dk);
  LU.sunK.value = 0; LU.fogCol.value.set(0, 0, 0); LU.fogR.value.set(260, 720);
  ENV.lt = 0; shMat.uniforms.k.value = 0; pondMat.uniforms.lt.value = 0;
  vmLight.value.set(0.3 + 0.3 * spill, 0.28 + 0.3 * spill, 0.34 + 0.32 * spill);
  caveGlowMat.uniforms.k.value = 0.35 + 0.65 * lt; caveGlowMat.uniforms.col.value.set(lerp(0.22, 0.95, lt), lerp(0.3, 0.97, lt), lerp(0.55, 1.0, lt));
}
{ const wl = weatherLight; weatherLight = function () { wl(); caveView(); }; }
{ const lf = lifeFrame; lifeFrame = function (rdt) { lf(rdt); if (caveIn()) flyMesh.visible = beeMesh.visible = birdMesh.visible = leafMesh.visible = false; }; }
{ const rs = rainSound; rainSound = function (k) { return rs(caveIn() ? k * 0.1 : k); }; }
{ const cl = clanLights; clanLights = function (add, fire) {
    cl(add, fire);
    if (!caveIn()) return;
    const lt = dayLight(), now = LU.time.value;
    for (const L of CVD.lights) {
      if (L.day) { const k = 0.18 + 0.82 * lt; add(L.x, L.h, L.y, L.r, L.c[0] * k, L.c[1] * k, L.c[2] * k, 3); }
      else if (!L.ember) { const f = 0.85 + 0.15 * Math.sin(now * 0.9 + L.f); add(L.x, L.h, L.y, L.r, L.c[0] * f, L.c[1] * f, L.c[2] * f, 1); }
    }
    // the torch in your hand: its flame lights the rock all round you, not just where you point it (more of it from above, so you can see yourself)
    if (S.torchOn) { const p = S.p, f = 0.9 + 0.06 * Math.sin(now * 13.1) + 0.04 * Math.sin(now * 23.7); add(p.x, 27, p.y, isoP() ? 170 : 88, 0.4 * f, 0.29 * f, 0.17 * f, 1); }
  }; }
// the clan stay up top; the pale ones live down here (80-pale)
{ const cs = clanStep; clanStep = function (dt) {
    const rg = S.rg;
    if (caveIn()) {
      for (const e of rg.enemies) if (e.type === 'cannibal' && !e.dead && !(e.cl && e.cl.cave)) e.dead = e.gone = true;
      if (typeof paleStep === 'function') paleStep(dt);
      return;
    }
    for (const e of rg.enemies) if (e.cl && e.cl.cave && !e.dead) e.dead = e.gone = true;
    cs(dt);
  }; }
// the woods' animals don't wander into the dark (yours follow you)
{ const bs = beastStep; beastStep = function (dt) { bs(dt); const D = S.day; if (caveIn()) D.beasts = D.beasts.filter(b => b.x < CAVE_X0 || b.tame || b.lead > 0 || b.pen || b.cave); }; }
// how deep "the deep woods" are, down here: as deep as the way you came in
{ const ex = FP.exStep; FP.exStep = function (dt) {
    const rg = S.rg, cv = caveIn();
    if (cv) { rg.tallCd = 99; rg.ringMax = 3; }
    ex(dt);
    if (cv) rg.wave = CT.wave;
  }; }
// the walls: you, them and the animals stay off the rock; the ways in and out
{ const ss = simStep; simStep = function (dt) {
    if (CT.ph) { MV.x = MV.y = 0; }
    ss(dt);
    if (!S || !S.day || !CAVES) return;
    CT.cool -= dt;
    const p = S.p;
    if (caveIn()) {
      cavePush(p, CV.RW);
      for (const e of S.rg.enemies) if (!e.dead && e.x > CAVE_X0) cavePush(e, 12);
      for (const b of S.day.beasts) if (!b.dead && b.x > CAVE_X0) cavePush(b, 10);
      if (CT.ph || CT.cool > 0) return;
      const si = caveSysAt(p.x), Sy = caveSys(si);
      for (const e of Sy.exits) {
        const tx = Sy.C.x + e.x, ty = Sy.C.y + e.y;
        if (Math.hypot(p.x - tx, p.y - ty) < 32) {
          const m = CV.mouths.find(q => q.si === si && q.en === e.n) || CV.mouths.find(q => q.si === si);
          if (m) caveGo({ x: m.x + Math.cos(m.a) * 46, y: m.y + Math.sin(m.a) * 46, a: m.a, inCave: false, m });
          return;
        }
      }
      return;
    }
    if (CT.ph || CT.cool > 0) return;
    for (const m of CV.mouths) {
      const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy);
      if (d < 330 && !S.day.cave.found[m.key]) { S.day.cave.found[m.key] = 1; exNote(`a cave in the rocks · it goes down into the dark`, true); dayJLog('found a cave mouth in the hills'); }
      if (d > 70) continue;
      const u = dx * Math.cos(m.a) + dy * Math.sin(m.a), v = -dx * Math.sin(m.a) + dy * Math.cos(m.a);
      if (u < 3 && u > -16 && Math.abs(v) < 13) {
        const Sy = caveSys(m.si), e = Sy.exits[Math.min(m.en, Sy.exits.length - 1)];
        if (!e) continue;
        caveGo({ x: Sy.C.x + e.x - Math.cos(e.a) * 72, y: Sy.C.y + e.y - Math.sin(e.a) * 72, a: e.a + Math.PI, inCave: true, si: m.si, m });
        return;
      }
    }
  }; }
// over your shoulder: the camera comes in short of the rock, and under the roof
{ const tc = thirdCamera; thirdCamera = function (p, yaw, pitch, headY) {
    tc(p, yaw, pitch, headY);
    if (!caveIn()) return;
    const c = cam.position, rx = Math.cos(yaw), rz = -Math.sin(yaw), sh = cam.aspect >= 1 ? 19 : 7;
    let px = p.x + rx * sh, pz = p.y + rz * sh; const py = headY + 4;
    if (caveSdf(px, pz) > -6) { px = p.x; pz = p.y; }
    const ok = (x, y, z) => caveSdf(x, z) < -7 && y < terrH(x, z) + caveCeilAt(x, z) - 7;
    if (ok(c.x, c.y, c.z)) return;
    let lo = 0, hi = 1;
    for (let i = 0; i < 9; i++) { const t = (lo + hi) / 2; if (ok(lerp(px, c.x, t), lerp(py, c.y, t), lerp(pz, c.z, t))) lo = t; else hi = t; }
    c.set(lerp(px, c.x, lo), lerp(py, c.y, lo), lerp(pz, c.z, lo)); TP.boom = Math.max(14, TP.boom * lo);
  }; }
// saving: the caves, what you've found, what you've taken
{ const sv = daySave; daySave = function () {
    const r = sv.apply(this, arguments);
    try { const D = S && S.day; if (D && D.cave && !ARENA) { const k = dayKey(), raw = localStorage.getItem(k); if (raw) { const o = JSON.parse(raw); if (o && o.d) { o.d.cave = D.cave; localStorage.setItem(k, JSON.stringify(o)); } } } } catch (e) {}
    return r;
  }; }

// ---------------- the bats: hung up in the roof until you come in, then all round your head ----------------
const BATS = { cd: 0, sq: 0 };
function batsStep(dt, now) {
  if (!caveIn()) return;
  const p = S.p, Bs = CVD.bats; if (!Bs.length) return;
  const r0 = Bs[0].room, Sy = caveSys(CVD.si), rx = Sy.C.x + r0.x, ry = Sy.C.y + r0.y, inRoom = Math.hypot(p.x - rx, p.y - ry) < r0.r + 20;
  BATS.cd -= dt;
  const loud = Math.hypot(p.vx, p.vy) > RUN * 1.1 || (p.atk && p.atk.t < 0.1);
  if (inRoom && BATS.cd <= 0 && (!S.day.crouch || loud) && Bs.every(b => b.st === 'hang')) {   // in they come and up they all go
    BATS.cd = 50; for (const b of Bs) { b.st = 'fly'; b.t = 7 + Math.random() * 6; b.dive = Math.random() < 0.35 ? 1.2 + Math.random() * 1.5 : 0; b.vh = -40; }
    batSnd(rx, ry, 1); BATS.sq = 0;
  }
  let any = false;
  for (const b of Bs) {
    if (b.st === 'hang') { b.x = b.hx; b.y = b.hy; b.h = b.hh; continue; }
    any = true; b.t -= dt;
    const fl = terrH(b.x, b.y), roof = caveCeilAt(b.x, b.y);
    let tx, ty, th;
    if (b.st === 'fly') {
      if (b.dive > 0 && b.t > 4) { b.dive -= dt; tx = p.x + Math.cos(S.aimW) * 30; ty = p.y + Math.sin(S.aimW) * 30; th = EYE + 6; }   // straight past your face
      else { const a = now * (0.9 + b.sd * 0.9) * (b.sd > 0.5 ? 1 : -1) + b.ph, rr = r0.r * (0.35 + 0.4 * b.sd); tx = rx + Math.cos(a) * rr; ty = ry + Math.sin(a) * rr; th = 55 + 50 * Math.sin(now * 0.7 + b.ph); }
      if (b.t <= 0) b.st = 'home';
    } else { tx = b.hx; ty = b.hy; th = b.hh; if (Math.hypot(b.x - b.hx, b.y - b.hy) < 6 && Math.abs(b.h - b.hh) < 5) { b.st = 'hang'; continue; } }
    const dx = tx - b.x, dy = ty - b.y, dh = th - b.h, L = Math.hypot(dx, dy, dh) || 1, sp = b.st === 'home' ? 90 : 170;
    b.vx += (dx / L * sp - b.vx) * Math.min(1, dt * 3); b.vy += (dy / L * sp - b.vy) * Math.min(1, dt * 3); b.vh += (dh / L * sp - b.vh) * Math.min(1, dt * 3);
    b.vx += (Math.random() - 0.5) * 300 * dt; b.vy += (Math.random() - 0.5) * 300 * dt;   // the flutter: never a straight line
    b.x += b.vx * dt; b.y += b.vy * dt; b.h = clamp(b.h + b.vh * dt, 14, Math.max(16, roof - 6)); void fl;
    cavePush(b, 6);
  }
  if (any && (BATS.sq -= dt) <= 0) { BATS.sq = 0.12 + Math.random() * 0.35; const b = Bs[(Math.random() * Bs.length) | 0]; if (b.st !== 'hang') batSnd(b.x, b.y, 0.5); }
}
function batsDraw(now) {
  if (!caveIn()) return;
  const body = hex('#1e1814'), wing = hex('#2a221c');
  for (const b of CVD.bats) {
    if (b.st === 'hang') { blob(PT.ball, b.x, b.h - 3, b.y, 2.6, 6, 2.4, b.ph, body); continue; }
    const yaw = Math.atan2(b.vx, b.vy), f = Math.sin(now * 26 + b.ph * 7) * 0.9, sx = Math.cos(yaw), sz = -Math.sin(yaw);
    blob(PT.ball, b.x, b.h, b.y, 2.8, 2.4, 4.2, yaw, body);
    for (const s of [-1, 1]) { const w = 5.2 * Math.cos(f); blob(PT.ball, b.x + sx * s * w, b.h + 4 * Math.sin(f), b.y + sz * s * w, 8, 0.5, 4.4, yaw, wing, 0, 0, s * f); }
  }
}
// glowworms: tiny cold lights in the roof, each with its own slow pulse
function wormsDraw(now) {
  if (!caveIn() || !CVD.worms.length) return;
  for (const w of CVD.worms) { const k = 0.55 + 0.45 * Math.sin(now * 0.8 + w.ph); stat(w.x, w.h, w.y, w.s, 0.35, 0.95, 0.85, 0.75 * k, 0); }
}
{ const df = drawFigures; drawFigures = function (now, dt) { df(now, dt); if (caveIn()) { batsStep(dt, now); batsDraw(now); wormsDraw(now); } caveTrStep(frameDtTP || 1 / 60); }; }

// ---------------- the sound of it: the woods fall away, the rock rings, water drips, the bats ----------------
const CA = { t: 0, drip: 0, rumble: 40 };
function caveAudioInit() {
  if (CA.ok || !actx || !sfxGain || !noiseBuf || !OUT) return; CA.ok = 1;
  // the echo off the rock: a long rough tail, built once
  const sr = actx.sampleRate, n = Math.floor(sr * 2.6), ir = actx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2) * Math.exp(-t * 1.1) * (t < 0.012 ? t / 0.012 : 1); } }
  CA.conv = actx.createConvolver(); CA.conv.buffer = ir; CA.wet = actx.createGain(); CA.wet.gain.value = 0;
  sfxGain.connect(CA.conv); CA.conv.connect(CA.wet); CA.wet.connect(OUT);
  // a low hollow hum, the weight of the rock overhead
  const src = actx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; lp.Q.value = 2.5;
  CA.hum = actx.createGain(); CA.hum.gain.value = 0; src.connect(lp); lp.connect(CA.hum); CA.hum.connect(sfxGain); src.start();
  for (const f of [43, 64.5]) { const o = actx.createOscillator(); o.frequency.value = f; const g = actx.createGain(); g.gain.value = 0.18; o.connect(g); g.connect(CA.hum); o.start(); }
  // the draught through a mouth: a breathy moan of wind in the rock
  const s2 = actx.createBufferSource(); s2.buffer = noiseBuf; s2.loop = true; s2.playbackRate.value = 0.7;
  CA.bp = actx.createBiquadFilter(); CA.bp.type = 'bandpass'; CA.bp.frequency.value = 420; CA.bp.Q.value = 1.6;
  CA.wind = actx.createGain(); CA.wind.gain.value = 0; CA.pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
  s2.connect(CA.bp); CA.bp.connect(CA.wind); if (CA.pan) { CA.wind.connect(CA.pan); CA.pan.connect(sfxGain); } else CA.wind.connect(sfxGain); s2.start();
}
function caveAudio() {
  if (!actx || !S || !S.day) return;
  caveAudioInit(); if (!CA.ok) return;
  const t = actx.currentTime, dt = clamp(t - (CA.t || t), 0, 0.2); CA.t = t;
  const inC = caveIn(), on = state === 'play' ? 1 : 0, p = S.p;
  CA.wet.gain.setTargetAtTime(inC ? 0.34 : 0, t, 0.4);
  CA.hum.gain.setTargetAtTime(inC ? 0.09 * on : 0, t, 0.8);
  if (inC && ambG) ambG.gain.setTargetAtTime(0, t, 0.4);
  // the nearest mouth (or way out) moans when you're close to it
  let wd = 1e9, wa = 0;
  if (inC) { const Sy = caveSys(caveSysAt(p.x)); for (const e of Sy.exits) { const x = Sy.C.x + e.x, y = Sy.C.y + e.y, d = Math.hypot(x - p.x, y - p.y); if (d < wd) { wd = d; wa = Math.atan2(y - p.y, x - p.x); } } }
  else for (const m of CV.mouths) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < wd) { wd = d; wa = Math.atan2(m.y - p.y, m.x - p.x); } }
  const wk = Math.pow(clamp(1 - wd / (inC ? 420 : 300), 0, 1), 1.6);
  CA.wind.gain.setTargetAtTime(0.16 * wk * on * (0.75 + 0.25 * Math.sin(t * 0.37) * Math.sin(t * 0.23)), t, 0.4);
  CA.bp.frequency.setTargetAtTime(380 + 90 * Math.sin(t * 0.31), t, 0.5);
  if (CA.pan) CA.pan.pan.setTargetAtTime(clamp(-Math.sin(S.aimW) * Math.cos(wa) + Math.cos(S.aimW) * Math.sin(wa), -1, 1) * 0.7, t, 0.2);
  if (!inC || !on) return;
  // water dripping somewhere in the dark, each drop ringing round the rock
  if ((CA.drip -= dt) <= 0) {
    CA.drip = 0.35 + Math.random() * 1.8;
    const a = Math.random() * 6.283, d = 40 + Math.random() * 260, o = placeOut(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 0.32 + Math.random() * 0.25, 420);
    if (o) { const f = 900 + Math.random() * 1700, g = actx.createGain(), os = actx.createOscillator(); os.type = 'sine'; os.frequency.setValueAtTime(f * 1.6, t); os.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); os.connect(g); g.connect(o); os.start(t); os.stop(t + 0.14); }
  }
  // now and then the rock settles: a far-off grinding thud and a patter of grit
  if ((CA.rumble -= dt) <= 0) { CA.rumble = 50 + Math.random() * 80; boomAt(t, 70, 38, 1.4, 0.32, sfxGain); for (let i = 0; i < 6; i++) noiseAt(t + 0.4 + i * 0.09 + Math.random() * 0.1, 5000, 2500, 0.05, 0.05, sfxGain); }
}
{ const af = audioFrame; audioFrame = function () { af(); caveAudio(); }; }
function caveWhoosh(inward) {   // stepping through: a rush of air and the light (or the dark) closing round you
  if (!actx || !noiseBuf) return;
  const t = actx.currentTime;
  noiseAt(t, inward ? 900 : 1600, inward ? 200 : 600, 0.9, 0.22, sfxGain); boomAt(t + 0.1, inward ? 90 : 120, 50, 0.7, inward ? 0.25 : 0.12, sfxGain);
}
function batSnd(x, y, k) {
  if (!actx || !noiseBuf) return;
  const o = placeOut(x, y, 0.5 * k, 500); if (!o) return;
  const t = actx.currentTime, n = k > 0.8 ? 14 : 2;
  for (let i = 0; i < n; i++) {   // high squeaks, and the leathery clatter of wings
    const at = t + i * (0.03 + Math.random() * 0.05), os = actx.createOscillator(), g = actx.createGain(), f = 5200 + Math.random() * 3200;
    os.type = 'triangle'; os.frequency.setValueAtTime(f, at); os.frequency.exponentialRampToValueAtTime(f * 0.7, at + 0.04);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.18 * k, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    os.connect(g); g.connect(o); os.start(at); os.stop(at + 0.06);
  }
  noiseAt(t, 1800, 700, k > 0.8 ? 1.2 : 0.25, 0.12 * k, o);
}

// ---------------- the way out: the marker that points home points along the passages to the nearest way out ----------------
const CAVE_NAV = [];
function caveWay(x, y) {   // the next place to head for on the shortest way out, and how far it is all told
  const si = caveSysAt(x); if (si < 0) return null;
  const Sy = caveSys(si), N = CAVE_NAV[si] || (CAVE_NAV[si] = paleGraph(Sy)); if (!N.length) return null;
  const n = N.length, dist = new Float64Array(n).fill(1e18), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n), a = paleNear(N, x, y);
  dist[a] = Math.hypot(N[a].x - x, N[a].y - y);
  for (;;) { let u = -1, bd = 1e18; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; u = i; } if (u < 0) break; done[u] = 1; for (const [v, w] of N[u].e) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; } }
  let best = null;
  for (const e of Sy.exits) {
    const tx = Sy.C.x + e.x, ty = Sy.C.y + e.y;
    if (caveLos(x, y, tx, ty, 4)) { const d = Math.hypot(tx - x, ty - y); if (!best || d < best.d) best = { d, x: tx, y: ty }; continue; }
    const rx = Sy.C.x + e.room.x, ry = Sy.C.y + e.room.y; let k = -1, kd = 1e9; N.forEach((q, i) => { const d = Math.hypot(q.x - rx, q.y - ry); if (d < kd) { kd = d; k = i; } });
    if (k < 0 || dist[k] >= 1e17) continue;
    const d = dist[k] + Math.hypot(tx - rx, ty - ry);
    if (!best || d < best.d) { const path = []; for (let u = k; u >= 0; u = prev[u]) path.unshift(N[u]); path.push({ x: tx, y: ty }); best = { d, path }; }
  }
  if (!best) return null;
  if (best.path) { let w = best.path[0]; for (let i = Math.min(best.path.length - 1, 5); i >= 0; i--) if (caveLos(x, y, best.path[i].x, best.path[i].y, 4)) { w = best.path[i]; break; } best.x = w.x; best.y = w.y; }
  return best;
}
const CWAY = { t: 0, w: null };
{ const hf = homeFrame; homeFrame = function () {
    if (!caveIn()) { if (CWAY.w) { CWAY.w = null; homeM = -1; } return hf(); }
    if (!(state === 'play' && S && S.rg && S.rg.phase !== 'dead' && !menusOpen())) { homeEl.hidden = true; return; }
    const now = performance.now(); if (now - CWAY.t > 400 || !CWAY.w) { CWAY.t = now; CWAY.w = caveWay(S.p.x, S.p.y); }
    const w = CWAY.w; if (!w) { homeEl.hidden = true; return; }
    const m = Math.round(w.d / 20); if (m !== homeM) { homeM = m; homeTxt.textContent = `WAY OUT · ${m} m`; }
    _hv.set(w.x, terrH(w.x, w.y) + 30, w.y).applyMatrix4(cam.matrixWorldInverse);
    const fwd = -_hv.z, right = _hv.x, cx = FW / 2, cy = FH / 2; let x = null, y, th = null;
    if (fwd > 3) { _hv.applyMatrix4(cam.projectionMatrix); x = (_hv.x + 1) / 2 * FW; y = (1 - _hv.y) / 2 * FH; if (!(x > 40 && x < FW - 40 && y > 50 && y < FH - 90)) x = null; }
    if (x == null) { th = Math.atan2(-fwd, right); x = cx + Math.cos(th) * FW * 0.36 * 1.12; y = Math.min(FH - 100, cy + Math.sin(th) * FH * 0.29 * 1.12); }
    homeEl.hidden = false; homeEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    homeArrow.hidden = th === null; if (th !== null) homeArrow.style.transform = `rotate(${th.toFixed(3)}rad) translateX(26px)`;
  }; }
// the place name under the clock: the cave you're in
{ const dh = drawHud; drawHud = function () {
    dh(); const rg = S && S.rg; if (!rg || !S.day || !hudEl.day) return;
    const cv = caveIn(), k = hudEl.day.dataset.k + (cv ? '|' + caveSysAt(S.p.x) : '');
    if (hudEl.day.dataset.c === k) return; hudEl.day.dataset.c = k;
    if (cv) { const el = hudEl.day.querySelector('.clk'); if (el) el.textContent = `${dayClock(S.day.t)} · ${caveSys(caveSysAt(S.p.x)).sp.n}`; }
  }; }
