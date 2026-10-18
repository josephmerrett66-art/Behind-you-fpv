// ================= ponds lie in the hollows (Joe) =================
// A pond is where the land dips: the lowest point of a natural hollow, filled up to a level so the water finds its own
// shoreline round the slopes. Only the deep, low hollows hold one, and only the lowest hollow in its part of the woods, so
// they're scattered, not everywhere. Nothing grows in the water (trees, bushes, things to gather); reeds stand round the
// shallows and lily pads float out on it (10-world draws them). The water is too deep to walk in past your knees.
const POND = { cell: 500, near: 850, low: -14, dMin: 1.5, rMax: 160, NR: 24, wade: 2.2 };
const pondCells = new Map(), pondKept = new Map();
// roll downhill from a point to the bottom of its hollow
function pondDescend(x, y) {
  let s = 24;
  for (let it = 0; it < 400 && s >= 1.5; it++) {
    let bx = x, by = y, bh = terrBase0(x, y);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, nx = x + Math.cos(a) * s, ny = y + Math.sin(a) * s, h = terrBase0(nx, ny); if (h < bh) { bh = h; bx = nx; by = ny; } }
    if (bx === x && by === y) s /= 2; else { x = bx; y = by; }
  }
  return [x, y];
}
// how far the water reaches along each of NR directions when it stands at lvl (300 = it spills away)
function pondRays(x, y, lvl) {
  const r = new Float32Array(POND.NR);
  for (let k = 0; k < POND.NR; k++) { const a = k / POND.NR * 6.2832, c = Math.cos(a), s = Math.sin(a); let d = 0; while (d < 300 && terrBase0(x + c * d, y + s * d) < lvl) d += 3; r[k] = d; }
  return r;
}
const pondMean = r => r.reduce((a, b) => a + b, 0) / r.length;
// the hollows in one cell that could hold a pond: low enough, a real bowl, and clear of the camps
function pondCands(ci, cj) {
  const key = ci + ',' + cj; let out = pondCells.get(key); if (out) return out; out = [];
  for (const [u, v] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
    const [x, y] = pondDescend((ci + u) * POND.cell, (cj + v) * POND.cell);
    if (Math.floor(x / POND.cell) !== ci || Math.floor(y / POND.cell) !== cj || out.some(P => Math.hypot(P.x - x, P.y - y) < 40)) continue;
    const h0 = terrBase0(x, y); if (h0 > POND.low) continue;
    if (Math.hypot(x, y) < CAMP_R + 300 || inPlaza(x, y) || (BEACH && coastS(x, y) > -600)) continue;
    if (dayCampList().some(C => { const o = C.parts && C.parts[0] ? C.parts[0] : C; return Math.hypot(o.x - x, o.y - y) < 420; })) continue;
    const seed = hash(x * 0.013 + 3.1, y * 0.017 - 1.7), T = 42 + seed * 40;   // how big a pond this hollow makes
    let lo = 0.6, hi = 7;
    for (let i = 0; i < 14; i++) { const d = (lo + hi) / 2, r = pondRays(x, y, h0 + d); if (Math.max(...r) >= 300 || pondMean(r) > T) hi = d; else lo = d; }
    const rays = pondRays(x, y, h0 + lo), rmax = Math.max(...rays);
    if (lo < POND.dMin || rmax > POND.rMax) continue;   // too shallow a dip, or it would run off down a valley
    out.push({ kind: 'dlake', x, y, r: 0, s: 1, rad: pondMean(rays), rmax, lvl: h0 + lo, h0, rays, seed: seed * 9 });
  }
  pondCells.set(key, out); return out;
}
// the ponds of a cell: only the lowest hollow for a way round holds water
function pondsIn(ci, cj) {
  const key = ci + ',' + cj; let out = pondKept.get(key); if (out) return out;
  const n = Math.ceil(POND.near / POND.cell);
  out = pondCands(ci, cj).filter(P => {
    for (let a = ci - n; a <= ci + n; a++) for (let b = cj - n; b <= cj + n; b++)
      for (const Q of pondCands(a, b)) if (Q !== P && Q.h0 < P.h0 && Math.hypot(Q.x - P.x, Q.y - P.y) < POND.near) return false;
    return true;
  });
  pondKept.set(key, out); return out;
}
lakesNear = function (x, y, R) {
  const out = [], c = POND.cell;
  for (let ci = Math.floor((x - R - 200) / c); ci <= Math.floor((x + R + 200) / c); ci++)
    for (let cj = Math.floor((y - R - 200) / c); cj <= Math.floor((y + R + 200) / c); cj++)
      for (const P of pondsIn(ci, cj)) if (Math.abs(P.x - x) < R + P.rmax && Math.abs(P.y - y) < R + P.rmax) out.push(P);
  return out;
};
// how far the water reaches from the middle towards (x, y)
function pondReach(P, x, y) {
  const a = (Math.atan2(y - P.y, x - P.x) / 6.2832 + 1) % 1 * POND.NR, i = Math.floor(a) % POND.NR, f = a - Math.floor(a);
  return P.rays[i] * (1 - f) + P.rays[(i + 1) % POND.NR] * f;
}
const pondIn = (P, x, y, pad = 0) => Math.hypot(x - P.x, y - P.y) < pondReach(P, x, y) + pad;
const pondAt = (x, y, pad = 0) => lakesNear(x, y, 1).find(P => pondIn(P, x, y, pad));
const pondDepth = (x, y) => { const P = pondAt(x, y, 0); return P ? P.lvl - terrH(x, y) : 0; };

// nothing grows in the water
{ const pn = propsNear; propsNear = function (x, y, R) { const r = pn(x, y, R), L = lakesNear(x, y, R); return L.length ? r.filter(o => !L.some(P => pondIn(P, o.x, o.y, o.kind === 'tree' ? 16 : 8))) : r; }; }
{ const dn = decorNear; decorNear = function (x, y, R) { const r = dn(x, y, R), L = lakesNear(x, y, R); return L.length ? r.filter(o => !L.some(P => pondIn(P, o.x, o.y, o.dk === 'log' ? 14 : 5))) : r; }; }
{ const nn = dayNodesNear; dayNodesNear = function (x, y, R) { const r = nn(x, y, R), L = lakesNear(x, y, R); return L.length ? r.filter(o => !L.some(P => pondIn(P, o.x, o.y, 4))) : r; }; }

// wading: in to your knees and no further; the animals and the clan keep out
{ const ss = simStep; simStep = function (dt) {
    const p = S && S.p, x0 = p ? p.x : 0, y0 = p ? p.y : 0; ss(dt);
    if (!S || !S.day) return;
    if (p && pondDepth(p.x, p.y) > POND.wade && pondDepth(p.x, p.y) > pondDepth(x0, y0)) { p.x = x0; p.y = y0; p.vx = p.vy = 0; dayNote('pdeep', 'the pond gets too deep', 6); }
    for (const L of [S.rg.enemies, S.day.beasts]) if (L) for (const o of L) {
      if (o.dead) continue;
      if (o._px !== undefined && pondDepth(o.x, o.y) > 1 && pondDepth(o.x, o.y) > pondDepth(o._px, o._py)) { o.x = o._px; o.y = o._py; }
      o._px = o.x; o._py = o.y;
    }
  }; }
