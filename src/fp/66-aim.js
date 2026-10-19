// ---------------- aiming the bow (and the sling) ----------------
// v124 (Joe: "make the bow and arrow aiming better, also use inspirations from other games"). An arrow used to slide
// along the ground to where your crosshair met it, inside a wedge of random stray, and the guide was drawn on the grass.
// Now it goes the way The Forest, Skyrim and Horizon do it:
//   - it flies for real: off along exactly where you look, and gravity takes it. A full draw goes fast and flat; a light
//     pull is slow and dips. No random stray: where you point is where it goes, so it's yours to get right.
//   - drawing brings the view in (Skyrim, Far Cry) and steadies the turn, more the further you draw.
//   - the crosshair: four ticks that close in as you draw and lock gold at full draw, and a small diamond where the arrow
//     will come down, worked out with the same sums as the flight. Up close it sits on the crosshair; far off it falls
//     below it, so you learn to hold a touch high. Over an animal or one of them, the ticks go red. On a pad, the turn
//     slows a little while you're on one (the aim friction console shooters use).
// It hits what it meets in the air: the head or the body of an animal, the head or the body of one of them, a trunk, the
// ground. The top-down view (isometric) still aims along the ground the old way.
const AIM_SPREAD = 0.2, AIM_NEAR = 50;
const aimSpread = c => isoP() ? AIM_SPREAD * Math.pow(1 - Math.min(1, c), 1.4) : 0;   // half-angle the shot can stray, in radians (top-down only)
function aimReach(kind, c) {   // top-down: how far this draw carries, and where under the crosshair that is
  const R = RNG[kind], max = R.rng[0] + (R.rng[1] - R.rng[0]) * Math.max(0.2, Math.min(1, c));
  const sp = Math.sin(look.pitch), d = sp < -0.02 ? EYE * Math.cos(look.pitch) / -sp : 1e9;
  return Math.max(AIM_NEAR, Math.min(max, d));
}
// top-down: height along the flight: it leaves your hand at bow height, rises a touch and comes down at the end
const shotZ = (L, u) => 22 * (1 - u) + (4 + 0.035 * L) * Math.sin(Math.PI * u);
function aimLooseAt(kind, c) { const s = aimSpread(c); return { off: s * (Math.random() * 2 - 1), L: aimReach(kind, c) }; }
function aimBusy() { return !!(S.day && S.day.draw && state === 'play' && !isoP()); }

// ---- the flight ----
// world units are about 5 cm: a full draw leaves at some 66 m/s and drops about a metre over 30 m
const BAL = { g: 190, drag: 0.3, life: 2.6, step: 5, bow: [430, 1320], sling: [380, 960], gk: { arrow: 1, stone: 1.4 }, head: 2.5, fhead: 1.6 };
const balSpeed = (kind, c) => { const v = BAL[kind] || BAL.bow; return v[0] + (v[1] - v[0]) * Math.pow(Math.max(0.2, Math.min(1, c)), 0.85); };
const balFwd = () => { const cp = Math.cos(look.pitch); return [-Math.sin(look.yaw) * cp, Math.sin(look.pitch), -Math.cos(look.yaw) * cp]; };   // (x, up, z)
// what an arrow could meet along the way: the living near the line it takes
function balCands(x, y, ang, reach) {
  const ux = Math.cos(ang), uy = Math.sin(ang), out = [], near = (ox, oy, pad) => { const dx = ox - x, dy = oy - y, t = dx * ux + dy * uy; return t > -pad && t < reach + pad && Math.abs(dx * uy - dy * ux) < pad; };
  for (const o of S.rg.enemies) if (!o.dead && near(o.x, o.y, 40)) out.push([o, 0]);
  for (const b of S.day.beasts) if (!b.dead && !b.tame && near(b.x, b.y, 50)) out.push([b, 1]);
  return out;
}
const _bsc = new Map();
function balSolid(x, y, z, cache) {   // a trunk or a rock at this height: trees take an arrow up to their crowns, rocks only low down
  const k = Math.floor(x / 50) + ',' + Math.floor(y / 50); let L = cache.get(k);
  if (!L) { L = propsNear(Math.floor(x / 50) * 50 + 25, Math.floor(y / 50) * 50 + 25, 90).filter(o => o.r && o.s); cache.set(k, L); }
  for (const o of L) if (Math.hypot(o.x - x, o.y - y) < o.r * o.s + 1.5 && z < (o.kind === 'tree' ? 170 : o.r * o.s * 1.4 + 4)) return o;
  return null;
}
// where it is at (x, height above the sea of the world, y): which of these it's in, and where (1 body, 2 head)
function balHit(cands, x, Y, y) {
  for (const [o, beast] of cands) {
    if (beast) { const z = huntZone(o, x, Y, y); if (z) return [o, beast, z]; continue; }
    const F = FOES[o.type], h = (F ? F.h : 34) * (o.k || 1), w = F ? F.w : 12, d = Math.hypot(o.x - x, o.y - y), yl = Y - terrH(o.x, o.y) - (o.z || 0);
    if (d < w * 0.55 + 3 && yl > -2 && yl < h + 2) return [o, 0, yl > h * 0.8 ? 2 : 1];
  }
  return null;
}
// run a flight through without touching anything: where it ends, and on what. The guide and the throw both use it.
function balTrace(x, Y, y, vx, vY, vy, gk, maxT, path) {   // from (x, height, y) at (vx, vY up, vy)
  const sp = Math.hypot(vx, vy, vY) || 1, h = BAL.step / sp, cache = _bsc; cache.clear();
  const cands = balCands(x, y, Math.atan2(vy, vx), sp * maxT);
  for (let t = 0, i = 0; t < maxT; t += h, i++) {
    vY -= BAL.g * gk * h; const dk = Math.exp(-BAL.drag * h); vx *= dk; vy *= dk; vY *= dk;
    x += vx * h; y += vy * h; Y += vY * h;
    if (path && i % 6 === 0) path.push([x, Y, y]);
    const hit = balHit(cands, x, Y, y); if (hit) return { x, Y, y, t, o: hit[0], beast: hit[1], zone: hit[2] };
    const g = terrH(x, y); if (Y <= g + 0.3) return { x, Y: g, y, t, ground: 1 };
    if (i % 2 === 0 && balSolid(x, y, Y - g, cache)) return { x, Y, y, t, solid: 1 };
    if (caveIn() && Y - g > 75) return { x, Y, y, t, solid: 1 };
  }
  return { x, Y, y, t: maxT, none: 1 };
}
// let go: it leaves your eye (or from over your shoulder, toward what the crosshair is on) along where you look
function balLaunch(q, kind, c, off) {
  const v = balSpeed(kind, c), f = balFwd(); let ox, oY, oy, d;
  if (thirdP()) {
    const cp = cam.position, T = balTrace(cp.x, cp.y, cp.z, f[0] * 1e3, f[1] * 1e3, f[2] * 1e3, 0, 1.8);
    ox = S.p.x + Math.cos(S.aimW) * 10; oy = S.p.y + Math.sin(S.aimW) * 10; oY = terrH(S.p.x, S.p.y) + 28;
    const dx = T.x - ox, dY = T.Y - oY, dy = T.y - oy, L = Math.hypot(dx, dY, dy) || 1; d = [dx / L, dY / L, dy / L];
  } else { const cp = cam.position; ox = cp.x + f[0] * 6; oY = cp.y - 1.2 + f[1] * 6; oy = cp.z + f[2] * 6; d = [f[0], f[1], f[2]]; }
  if (off) { const hz = Math.hypot(d[0], d[2]), a = Math.atan2(d[2], d[0]) + off; d = [Math.cos(a) * hz, d[1], Math.sin(a) * hz]; }   // a volley's arrows fan out
  Object.assign(q, { bal: 1, x: ox, y: oy, Y: oY, vx: d[0] * v, vy: d[2] * v, vz: d[1] * v, gk: BAL.gk[q.kind] || 1, t: 0, d: 0 });
  q.a = Math.atan2(q.vy, q.vx); q.z = q.Y - terrH(q.x, q.y); q.dz = q.vz / Math.max(1, Math.hypot(q.vx, q.vy));
}
{ const dl = dayLoose; dayLoose = function (kind, s, c, a, spread, kk, L) {
  const rg = S.rg, n0 = rg.dshots ? rg.dshots.length : 0;
  dl.apply(this, arguments);
  if (isoP() || !rg.dshots || rg.dshots.length === n0) return;
  balLaunch(rg.dshots[rg.dshots.length - 1], kind, c, angDiff(a + (spread || 0), S.aimW));
}; }
// each step of a shot in flight (dayShotStep hands its flying ones here)
function balStep(q, dt) {
  const sp = Math.hypot(q.vx, q.vy, q.vz), n = Math.max(1, Math.ceil(sp * dt / BAL.step)), h = dt / n, D = S.day, rg = S.rg;
  const cands = []; for (const o of rg.enemies) if (!o.dead && !q.hit.has(o) && Math.hypot(o.x - q.x, o.y - q.y) < sp * dt + 50) cands.push([o, 0]);
  for (const b of D.beasts) if (!b.dead && !b.tame && !q.hit.has(b) && Math.hypot(b.x - q.x, b.y - q.y) < sp * dt + 60) cands.push([b, 1]);
  _bsc.clear();
  for (let k = 0; k < n && !q.done; k++) {
    q.vz -= BAL.g * q.gk * h; const dk = Math.exp(-BAL.drag * h); q.vx *= dk; q.vy *= dk; q.vz *= dk;
    q.x += q.vx * h; q.y += q.vy * h; q.Y += q.vz * h; q.d += Math.hypot(q.vx, q.vy) * h;
    const g = terrH(q.x, q.y); q.z = q.Y - g;
    const hit = balHit(cands.filter(([o]) => !q.hit.has(o)), q.x, q.Y, q.y);
    if (hit) { const [o, beast, zone] = hit; q.hit.add(o); balStrike(q, o, beast, zone); if (q.pierce-- <= 0) { q.done = q.stop = true; if (q.noKeep) q.gone = true; break; } continue; }   // gone into it: it shows stuck in the animal now
    if (q.z <= 0.3) { q.z = 0.5; q.done = true; break; }
    if (balSolid(q.x, q.y, q.z, _bsc) || q.t > BAL.life || (caveIn() && q.z > 75)) { q.done = true; break; }
  }
  q.a = Math.atan2(q.vy, q.vx); q.dz = clamp(q.vz / Math.max(1, Math.hypot(q.vx, q.vy)), -1.5, 1.5);
}
function balStrike(q, o, beast, zone) {   // it went in: a head shot counts for more
  if (beast) { huntStrike(q, o, zone); return; }
  const k = q.dmg; if (zone === 2) { q.dmg *= BAL.fhead; const F = FOES[o.type]; wpPop('HEADSHOT', o.x, o.y, (F ? F.h : 34) + 12, '255,214,120', 0.8); }
  dayShotHit(q, o, false); q.dmg = k;
}

// ---- in the view: closer, steadier, and the crosshair that tells you ----
const AIM = { z: 0, on: null, pv: null, at: 0 };
function aimZoomStep(rdt) {
  const W = S && S.day && S.day.draw && !isoP() && state === 'play' ? S.day.draw : null, c = W ? Math.min(1, W.t / RNG[W.kind].full) : 0;
  const want = W ? (W.kind === 'bow' ? 0.24 : 0.12) * sEase(c) : 0;
  AIM.z += (want - AIM.z) * Math.min(1, rdt * (want > AIM.z ? 5 : 10));
  if (!W) AIM.on = null;
}
function aimSensK() { return (1 - AIM.z * 0.9) * (AIM.on && inputMode === 'pad' ? 0.6 : 1); }
function aimDraw(g) {
  const W = S.day && S.day.draw; if (!W || isoP()) return;
  const R = RNG[W.kind], c = Math.min(1, W.t / R.full), full = c >= 1, now = S.t, kind = W.kind === 'bow' ? 'arrow' : 'stone';
  // where this draw would come down if you let go now: the same flight, run through ahead of time
  const v = balSpeed(W.kind, c), f = balFwd(), path = thirdP() ? [] : null; let P;
  if (thirdP()) {
    const cp = cam.position, T = balTrace(cp.x, cp.y, cp.z, f[0] * 1e3, f[1] * 1e3, f[2] * 1e3, 0, 1.8), ox = S.p.x + Math.cos(S.aimW) * 10, oy = S.p.y + Math.sin(S.aimW) * 10, oY = terrH(S.p.x, S.p.y) + 28;
    const dx = T.x - ox, dY = T.Y - oY, dy = T.y - oy, L = Math.hypot(dx, dY, dy) || 1;
    P = balTrace(ox, oY, oy, dx / L * v, dY / L * v, dy / L * v, BAL.gk[kind], BAL.life, path);
  } else { const cp = cam.position; P = balTrace(cp.x + f[0] * 6, cp.y - 1.2 + f[1] * 6, cp.z + f[2] * 6, f[0] * v, f[1] * v, f[2] * v, BAL.gk[kind], BAL.life, null); }
  AIM.on = P.o || null; AIM.pv = P;
  const on = !!P.o, col = on ? '255,112,92' : full ? '255,214,120' : '240,236,226', mx = FW / 2, my = FH / 2;
  g.globalCompositeOperation = 'source-over'; g.lineCap = 'round';
  // from over your shoulder: the arc it will fly along
  if (path && path.length > 1) {
    g.setLineDash([6, 8]); g.lineDashOffset = -now * 50; g.strokeStyle = `rgba(${col},${0.25 + 0.3 * c})`; g.lineWidth = 1.6; g.beginPath(); let pen = false;
    for (const [x, Y, y] of path) { const q = scr(x, Y - terrH(x, y), y); if (!q) { pen = false; continue; } pen ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); pen = true; }
    g.stroke(); g.setLineDash([]);
  }
  // four ticks that close in on the middle as you draw, and lock at full draw
  const r = 6 + 24 * (1 - sEase(c)) + (full ? Math.sin(now * 10) * 0.8 : 0), L = full ? 9 : 7;
  for (const pass of [0, 1]) {
    g.strokeStyle = pass ? `rgba(${col},${0.65 + 0.35 * c})` : 'rgba(8,6,4,0.55)'; g.lineWidth = pass ? (full ? 2.4 : 1.8) : 4.2;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a); g.beginPath(); g.moveTo(mx + ca * r, my + sa * r); g.lineTo(mx + ca * (r + L), my + sa * (r + L)); g.stroke(); }
  }
  // the diamond: where it comes down (or goes in), with a faint line down to it from the crosshair when it falls short
  const q = scr(P.x, P.Y - terrH(P.x, P.y), P.y);
  if (q && !P.none) {
    const dx = q[0] - mx, dy = q[1] - my, far = Math.hypot(dx, dy), s = on ? 5 : 4;
    if (far > r + 2) { g.strokeStyle = `rgba(${col},0.3)`; g.lineWidth = 1.2; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(mx + dx / far * (r + 2), my + dy / far * (r + 2)); g.lineTo(q[0] - dx / far * s, q[1] - dy / far * s); g.stroke(); g.setLineDash([]); }
    const dia = () => { g.beginPath(); g.moveTo(q[0], q[1] - s); g.lineTo(q[0] + s, q[1]); g.lineTo(q[0], q[1] + s); g.lineTo(q[0] - s, q[1]); g.closePath(); };
    g.strokeStyle = 'rgba(8,6,4,0.6)'; g.lineWidth = 3.5; dia(); g.stroke(); g.strokeStyle = `rgba(${col},0.95)`; g.lineWidth = 1.6; dia(); g.stroke();
    if (on) { g.fillStyle = `rgba(${col},0.5)`; dia(); g.fill(); }
  }
}
