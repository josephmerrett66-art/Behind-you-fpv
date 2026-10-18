// ================= caves: under the island (Joe) =================
// Six cave mouths open in the hills of the island, each a dark arch in a heap of boulders. Walk in and the daylight goes: the
// cave beyond is pitch dark but for your torch, glowworms, a cold glow of fungus and the grey light back at the way out.
// Four caves lie under the island. Two run right through, so you come up somewhere else entirely; two only go down, deeper
// and nastier, with the best of what's down there at the far end. Each is a string of chambers, some huge, joined by winding
// passages, with side passages off to dead ends. In them: stalagmites and hanging stalactites, rock with iron in it, still
// black pools (you can drink, and fish), bats in the high places, bones, an old explorer's camp, crates left behind, and the
// pale ones who live down there (80-pale).
//
// How it's made: the insides lie far off past the sea (x > CAVE_X0), where nothing else is (the sea's filters already keep
// the woods off it). Each cave's chambers and passages are circles and capsules on a plan, run together into one smooth
// "how far from the rock" field. The floor is the ground there (00-core's terrH: gently rolling), curving up into the walls;
// the ceiling arches over from the walls, high and domed in the chambers, lower in the passages. Floor and ceiling are two
// sheets that meet where the field crosses into rock, so it's sealed all round. Seen from above (isometric) the ceiling isn't
// drawn, and you look down into the passages cut out of dark rock, like a map.

const CV = { G: 5, Wf: 13, Hs: 24, RW: 14, k: 24, cell: 128 };   // grid step; how far the floor curves up the wall; where floor meets ceiling; how close to a wall you can stand; how softly passages run into chambers
const CAVE_SP = 4400;
const CAVE_SPEC = [
  { n: 'the long cave', ents: 2, main: 6, side: 2, pale: 3, pool: 1, glow: 0, bats: 1, camp: 1, seed: 101, ore: 4 },
  { n: 'the echoing cave', ents: 2, main: 5, side: 2, pale: 2, pool: 0, glow: 1, bats: 1, seed: 207, ore: 3 },
  { n: 'the deep', ents: 1, main: 7, side: 3, pale: 6, pool: 1, glow: 1, bats: 1, deep: 1, seed: 313, ore: 7 },
  { n: 'the glow grotto', ents: 1, main: 3, side: 1, pale: 1, pool: 1, glow: 2, bats: 0, seed: 419, ore: 2 },
];
const caveC = i => ({ x: CAVE_X0 + 2400 + i * CAVE_SP, y: 0 });
const caveSysAt = x => CAVES && x > CAVE_X0 ? clamp(Math.floor((x - CAVE_X0 - 200) / CAVE_SP), 0, CAVE_SPEC.length - 1) : -1;
const caveIn = () => CAVES && !!S && !!S.p && S.p.x > CAVE_X0;
const CAVE_SYS = [];
function caveSys(i) { return CAVE_SYS[i] || (CAVE_SYS[i] = caveGen(i)); }

// ---- noise for the rock (in a cave's own coordinates, so it stays exact) ----
const cvH = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
function cvN(x, y) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(cvH(i, j), cvH(i + 1, j), u), lerp(cvH(i, j + 1), cvH(i + 1, j + 1), u), v);
}
const segT = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1; return clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1); };

// ---------------- the plan of a cave: chambers on a winding path, side passages, the ways out ----------------
function caveGen(si) {
  const sp = CAVE_SPEC[si], R = rng(sp.seed * 7919 + 17), C = caveC(si), rooms = [], tubes = [], pillars = [], exits = [];
  const ri = (a, b) => a + R() * (b - a);
  const mkRoom = (x, y, r, H, tag) => { const o = { x, y, r, H, tag: tag || '', k: rooms.length, ph: R() * 6.28, ph2: R() * 6.28, wob: ri(0.06, 0.15), nb: [] }; rooms.push(o); return o; };
  const clearOf = (x, y, r, skip) => {
    if (Math.abs(x) > 1550 - r || Math.abs(y) > 1550 - r) return false;
    for (const o of rooms) if (o !== skip && Math.hypot(o.x - x, o.y - y) < o.r + r + 80) return false;
    for (const t of tubes) if (t.A !== skip && t.B !== skip && segD(x, y, t.ax, t.ay, t.bx, t.by) < r + t.w + 45) return false;
    return true;
  };
  const link = (A, B, w = ri(25, 35), H = ri(58, 80)) => {   // a passage that wanders a little on its way
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, n = 1 + Math.floor(R() * 3), pts = [[A.x, A.y]];
    for (let k = 1; k <= n; k++) { const t = k / (n + 1), off = (R() - 0.5) * Math.min(L * 0.3, 160); pts.push([A.x + dx * t + nx * off, A.y + dy * t + ny * off]); }
    pts.push([B.x, B.y]);
    for (let k = 0; k < pts.length - 1; k++) tubes.push({ ax: pts[k][0], ay: pts[k][1], bx: pts[k + 1][0], by: pts[k + 1][1], w: w * ri(0.9, 1.12), H: H * ri(0.92, 1.08), A, B });
    A.nb.push(B); B.nb.push(A);
  };
  const grow = (P, a, r, H, tag) => {
    for (let k = 0; k < 50; k++) {
      const b = a + (R() - 0.5) * (0.5 + k * 0.09), d = P.r + r + ri(140, 320), x = P.x + Math.cos(b) * d, y = P.y + Math.sin(b) * d;
      if (!clearOf(x, y, r, P)) continue;
      if (rooms.some(o => o !== P && segD(o.x, o.y, P.x, P.y, x, y) < o.r + 50)) continue;   // the way to it mustn't cut through another chamber
      const o = mkRoom(x, y, r, H, tag); link(P, o); return o;
    }
    return null;
  };
  const e0 = mkRoom(-1150, ri(-250, 250), ri(55, 70), ri(85, 105), 'ent'), main = [e0];
  const goal = sp.ents === 2 ? { x: 1150, y: ri(-380, 380) } : null;
  let cur = e0, head = (R() - 0.5) * 0.6;
  for (let k = 0; k < sp.main; k++) {
    const a = goal ? Math.atan2(goal.y - cur.y, goal.x - cur.x) + (R() - 0.5) * 1.0 : head + (R() - 0.5) * 1.2;
    const big = (k === sp.main - 1 && sp.deep) || R() < 0.35, o = grow(cur, a, big ? ri(135, 185) : ri(72, 120), big ? ri(160, 220) : ri(100, 140), '');
    if (!o) break;
    head = lerp(head, Math.atan2(o.y - cur.y, o.x - cur.x), 0.5) * 0.85; main.push(o); cur = o;
  }
  if (goal) { const o = grow(cur, Math.atan2(goal.y - cur.y, goal.x - cur.x), ri(55, 70), ri(85, 105), 'ent'); if (o) main.push(o); else cur.tag = 'ent'; }
  for (let k = 0; k < sp.side; k++) {   // side passages to dead ends
    const cand = main.filter(o => o.tag !== 'ent' && o !== main[1]); if (!cand.length) break;
    let P = cand[Math.floor(R() * cand.length)];
    const n = 1 + (R() < 0.5 ? 1 : 0);
    for (let j = 0; j < n; j++) { const o = grow(P, R() * 6.283, ri(55, 95), ri(85, 125), j === n - 1 ? 'end' : ''); if (!o) break; P = o; }
  }
  // the ways out: a passage from each entrance chamber up toward the light
  for (const e of rooms.filter(o => o.tag === 'ent')) {
    const nb = e.nb[0], away = nb ? Math.atan2(e.y - nb.y, e.x - nb.x) : Math.PI;
    for (let k = 0; k < 30; k++) {
      const a = away + (R() - 0.5) * (0.6 + k * 0.15), L = e.r + ri(150, 210), x = e.x + Math.cos(a) * L, y = e.y + Math.sin(a) * L;
      if (Math.abs(x) > 1560 || Math.abs(y) > 1560) continue;
      if (rooms.some(o => o !== e && (Math.hypot(o.x - x, o.y - y) < o.r + 90 || segD(o.x, o.y, e.x, e.y, x, y) < o.r + 50))) continue;
      if (tubes.some(t => t.A !== e && t.B !== e && segD(x, y, t.ax, t.ay, t.bx, t.by) < t.w + 80)) continue;
      const w = 27; tubes.push({ ax: e.x, ay: e.y, bx: x, by: y, w, H: 64, A: e, B: null, exit: 1 });
      exits.push({ x, y, a, w, room: e, n: exits.length });
      break;
    }
  }
  // stone pillars in the big chambers, clear of the passages
  for (const o of rooms) if (o.r > 115) {
    const n = 1 + (R() < 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) for (let t = 0; t < 12; t++) {
      const a = R() * 6.283, d = o.r * ri(0.25, 0.55), x = o.x + Math.cos(a) * d, y = o.y + Math.sin(a) * d, r = ri(9, 20);
      if (tubes.some(q => (q.A === o || q.B === o) && segD(x, y, q.ax, q.ay, q.bx, q.by) < r + q.w + 18)) continue;
      if (pillars.some(q => Math.hypot(q.x - x, q.y - y) < q.r + r + 40)) continue;
      pillars.push({ x, y, r }); break;
    }
  }
  // what each chamber is for: how far it is from the way in (by passages)
  const far = new Map([[e0, 0]]), q = [e0];
  while (q.length) { const o = q.shift(); for (const n of o.nb) if (!far.has(n)) { far.set(n, far.get(o) + 1); q.push(n); } }
  for (const o of rooms) o.far = far.get(o) ?? 0;
  const pickRoom = (f, tag) => { const c = rooms.filter(o => !o.tag && f(o)); if (!c.length) return null; const o = c.sort((a, b) => b.r - a.r)[0]; o.tag = tag; return o; };
  const inner = rooms.filter(o => o.tag !== 'ent').sort((a, b) => b.far - a.far);
  const S0 = { i: si, sp, C, rooms, tubes, pillars, exits, pools: [], lairs: [] };
  // the lair: far in, in a big chamber; the deep has a second
  { const L = inner.filter(o => !o.tag && o.r > 80)[0] || inner[0]; if (L) { L.tag = L.tag || 'lair'; S0.lairs.push(L); } }
  if (sp.deep) { const L = inner.filter(o => !o.tag && o.far >= 2)[0]; if (L) { L.tag = 'lair'; S0.lairs.push(L); } }
  if (sp.pool) { const o = pickRoom(o => o.r > 85 && o.far >= 1, 'pool'); if (o) S0.pools.push(o); }
  for (let k = 0; k < sp.glow; k++) { const c = rooms.filter(o => (!o.tag || o.tag === 'end' || o.tag === 'pool') && !o.glow); if (c.length) c[Math.floor(R() * c.length)].glow = 1; }
  if (sp.bats) { const c = rooms.filter(o => o.tag !== 'ent' && o.H > 130).sort((a, b) => b.H - a.H)[0]; if (c) c.bats = 1; }
  if (sp.camp) { const c = rooms.filter(o => (o.tag === 'end' || !o.tag) && o.far >= 1 && o.far <= 3).sort((a, b) => a.far - b.far)[0]; if (c) c.camp = 1; }
  // bounds, and where each piece lies, for looking things up quickly
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const grid = new Map(), cs = CV.cell, put = (el, bx0, by0, bx1, by1) => {
    for (let i = Math.floor(bx0 / cs); i <= Math.floor(bx1 / cs); i++) for (let j = Math.floor(by0 / cs); j <= Math.floor(by1 / cs); j++) { const k = i * 4096 + j; let L = grid.get(k); if (!L) grid.set(k, L = { el: [], pl: [] }); (el.pil ? L.pl : L.el).push(el); }
    x0 = Math.min(x0, bx0); y0 = Math.min(y0, by0); x1 = Math.max(x1, bx1); y1 = Math.max(y1, by1);
  };
  for (const o of rooms) { const m = o.r * (1 + o.wob + 0.05) + 70; put(o, o.x - m, o.y - m, o.x + m, o.y + m); }
  for (const t of tubes) { const m = t.w + 70; put(t, Math.min(t.ax, t.bx) - m, Math.min(t.ay, t.by) - m, Math.max(t.ax, t.bx) + m, Math.max(t.ay, t.by) + m); }
  for (const p of pillars) { p.pil = 1; const m = p.r + 4; put(p, p.x - m, p.y - m, p.x + m, p.y + m); }
  S0.grid = grid; S0.bb = { x0, y0, x1, y1 };
  // the pools: a hollow in the floor of the chamber, with black water standing in it
  S0.pools = S0.pools.map(o => ({ room: o, x: o.x + (R() - 0.5) * o.r * 0.3, y: o.y + (R() - 0.5) * o.r * 0.3, r: o.r * ri(0.5, 0.62), dep: ri(9, 13) }));
  return S0;
}

// ---------------- how far a point is from the rock (negative: out in the open), and how high the roof is there ----------------
const _cvO = { d: 0, H: 0, W: 0 };
function cvRaw(Sy, lx, ly, out = _cvO) {
  const L = Sy.grid.get(Math.floor(lx / CV.cell) * 4096 + Math.floor(ly / CV.cell));
  out.d = 999; out.H = 80; out.W = 30;
  if (!L) return out;
  let s = 0, sH = 0, sW = 0;
  for (const el of L.el) {
    let d, W;
    if (el.r) { const dx = lx - el.x, dy = ly - el.y, th = Math.atan2(dy, dx); d = Math.hypot(dx, dy) - el.r * (1 + el.wob * Math.sin(3 * th + el.ph) + 0.05 * Math.sin(7 * th + el.ph2)); W = Math.min(el.r * 0.8, 95); }
    else { d = segD(lx, ly, el.ax, el.ay, el.bx, el.by) - el.w; W = el.w * 1.1; }
    if (d > 140) continue;
    const e = Math.exp(-d / CV.k); s += e; sH += e * el.H; sW += e * W;
  }
  if (s <= 0) return out;
  let d = -CV.k * Math.log(s);
  for (const p of L.pl) d = Math.max(d, p.r - Math.hypot(lx - p.x, ly - p.y));
  d += 12 * (cvN(lx * 0.035, ly * 0.035) - 0.5) + 4.8 * (cvN(lx * 0.11 + 5.3, ly * 0.11 - 2.1) - 0.5);   // the walls aren't smooth
  out.d = d; out.H = sH / s; out.W = sW / s;
  return out;
}
// in world coordinates
function caveSdf(x, y) { const si = caveSysAt(x); if (si < 0) return 999; const Sy = caveSys(si); return cvRaw(Sy, x - Sy.C.x, y - Sy.C.y).d; }
function caveGrad(x, y) { const e = 2, a = caveSdf(x + e, y) - caveSdf(x - e, y), b = caveSdf(x, y + e) - caveSdf(x, y - e), L = Math.hypot(a, b) || 1; return { x: a / L, y: b / L }; }
// the floor: level out in the open, curving up into the wall; the roof: arching over from the wall, domed in a chamber
const cvFloorRise = (d, lx, ly) => { const q = -d; if (q <= 0) return CV.Hs; if (q >= CV.Wf) return 0; const u = 1 - q / CV.Wf; return CV.Hs * (1 - Math.sqrt(Math.max(0, 1 - u * u))) + 10 * cvN(lx * 0.2, ly * 0.2) * u * (1 - u); };   // a little rubble where it starts to rise
const cvCeilRise = (o, lx, ly) => {
  const q = -o.d; if (q <= 0) return CV.Hs;
  const W = Math.max(8, o.W), u = 1 - Math.min(q, W) / W, k = Math.sqrt(Math.max(0, 1 - u * u)), H = Math.max(CV.Hs + 20, o.H);
  const bump = (cvN(lx * 0.05 + 3.1, ly * 0.05) - 0.5) * (8 + (H - 60) * 0.12) + (cvN(lx * 0.17, ly * 0.17 + 7) - 0.5) * 4;
  return CV.Hs + (H - CV.Hs) * k + bump * k;
};
function caveCeilAt(x, y) { const si = caveSysAt(x); if (si < 0) return 999; const Sy = caveSys(si), lx = x - Sy.C.x, ly = y - Sy.C.y, o = cvRaw(Sy, lx, ly, {}); return cvCeilRise(o, lx, ly); }   // above the floor's base
// can one point see another down here (a wall between, or the far side of a bend)
function caveLos(ax, ay, bx, by, pad = 4) {
  const L = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.ceil(L / 9));
  for (let i = 1; i < n; i++) { const t = i / n; if (caveSdf(ax + (bx - ax) * t, ay + (by - ay) * t) > -pad) return false; }
  return true;
}
// keep something off the walls: back out along the slope of the field, to where it has room
function cavePush(o, R = CV.RW) {
  for (let k = 0; k < 3; k++) {
    const d = caveSdf(o.x, o.y); if (d <= -R) return;
    if (d > 60) {   // deep in the rock: put it back in the nearest chamber
      const si = caveSysAt(o.x), Sy = caveSys(si); let b = null, bd = 1e9;
      for (const r of Sy.rooms) { const q = Math.hypot(Sy.C.x + r.x - o.x, Sy.C.y + r.y - o.y); if (q < bd) { bd = q; b = r; } }
      if (b) { o.x = Sy.C.x + b.x; o.y = Sy.C.y + b.y; } return;
    }
    const g = caveGrad(o.x, o.y); o.x -= g.x * (d + R + 0.2); o.y -= g.y * (d + R + 0.2);
  }
}

// ---------------- the rock itself: one mesh for floor, walls and roof ----------------
const caveMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ caveC: { value: new V3() } }, LU),
  vertexShader: `attribute vec4 cd; varying vec3 vW, vN; varying vec4 vD;
    void main() { vW = position; vN = normal; vD = cd; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
  fragmentShader: LIGHT_GLSL + `uniform vec3 caveC; uniform float time; varying vec3 vW, vN; varying vec4 vD;
    float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float vn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
                 mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
    uniform vec4 occ;
    void main() {
      vec3 N = normalize(vN), lp = vW - caveC;
      float d = vD.x, roof = vD.y, glow = vD.z, moss = vD.w;
      // from above: the rock between the camera and you isn't drawn, so you look down into the passage you're in
      if (occ.w > 0.5 && roof > 0.5 && dot(vW.xz - occ.xz, normalize(camPos.xz - occ.xz)) > 16.0) discard;
      float n1 = vn(lp * 0.045), n2 = vn(lp * 0.17 + 3.0), n3 = vn(lp * 0.55 + 11.0);
      float wall = 1.0 - abs(N.y);
      // the rock: grey-brown limestone, banded where the layers show in the walls, mottled and gritty
      vec3 c = mix(vec3(0.30, 0.27, 0.24), vec3(0.44, 0.40, 0.35), n1);
      float strata = 0.5 + 0.5 * sin(lp.y * 0.36 + n1 * 6.0 + n2 * 2.0);
      c *= mix(1.0, 0.82 + 0.3 * strata, wall);
      c *= 0.86 + 0.26 * n2;
      // the floor: damp grit and gravel, darker, a pebble here and there
      float flr = smoothstep(0.6, 0.9, N.y) * (1.0 - roof);
      c = mix(c, vec3(0.25, 0.22, 0.19) * (0.78 + 0.44 * n3), flr * 0.85);
      c *= mix(1.0, 0.8 + 0.42 * step(0.74, vn(lp * 0.8 + 2.0)), flr);
      // streaks down the walls: white where water has left lime behind, rust where there's iron in the rock
      float st = smoothstep(0.76, 0.86, vn(vec3(lp.x * 0.07, lp.y * 0.011, lp.z * 0.07)));
      c = mix(c, vec3(0.66, 0.64, 0.58), st * wall * 0.6);
      float rs = smoothstep(0.8, 0.9, vn(vec3(lp.x * 0.05 + 7.0, lp.y * 0.012, lp.z * 0.05 - 3.0)));
      c = mix(c, vec3(0.48, 0.25, 0.13), rs * wall * 0.55);
      // moss and green slime near the way out, where a little daylight reaches
      c = mix(c, vec3(0.19, 0.29, 0.11) * (0.7 + 0.6 * n2), moss * smoothstep(0.35, 0.75, n1 + N.y * 0.25) * 0.85);
      // seen from above: the cut face of the rock between the passages
      float top = smoothstep(1.5, 7.0, d) * (1.0 - roof);
      c = mix(c, vec3(0.085, 0.08, 0.075) * (0.75 + 0.5 * n2), top);
      vec3 col = c * lightAt(vW, N, 1.0);
      // wet rock: it glints in your torch
      vec3 V = normalize(camPos - vW), Lt = normalize(tPos - vW);
      float wet = 0.3 + 0.7 * smoothstep(0.45, 0.75, vn(lp * 0.025 + 9.0)) + 0.4 * flr;
      float tl = smoothstep(tCone.x, tCone.y, dot(-Lt, tDir)) * clamp(1.0 - distance(vW, tPos) / tRange, 0.0, 1.0);
      col += tCol * pow(max(dot(reflect(-Lt, N), V), 0.0), 26.0) * wet * tl * 0.9 * (1.0 - top);
      // a faint green-blue cast under the glowworms
      col += vec3(0.02, 0.07, 0.07) * glow * (0.6 + 0.4 * roof);
      gl_FragColor = vec4(fogged(grey(col), vW), 1.0);
    }`,
});
const caveMesh = new THREE.Mesh(new THREE.BufferGeometry(), caveMat); caveMesh.frustumCulled = false; caveMesh.visible = false; scene.add(caveMesh);
let caveBuilt = -1;
function caveBuild(si) {
  if (caveBuilt === si) return;
  const Sy = caveSys(si), G = CV.G, bb = Sy.bb, x0 = Math.floor(bb.x0 / G) * G, y0 = Math.floor(bb.y0 / G) * G;
  const nx = Math.ceil((bb.x1 - x0) / G) + 1, ny = Math.ceil((bb.y1 - y0) / G) + 1, N = nx * ny;
  caveSetPools(Sy);
  const Dd = new Float32Array(N).fill(999), FY = new Float32Array(N), CY = new Float32Array(N), o = {};
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const lx = x0 + i * G, ly = y0 + j * G, k = j * nx + i;
    cvRaw(Sy, lx, ly, o); Dd[k] = o.d;
    if (o.d > 60) continue;
    const base = caveBase(Sy.C.x + lx, Sy.C.y + ly);
    FY[k] = base + cvFloorRise(o.d, lx, ly); CY[k] = base + cvCeilRise(o, lx, ly);
  }
  const fi = new Int32Array(N).fill(-1), ci = new Int32Array(N).fill(-1), pos = [], cd = [], idx = [];
  const glowAt = (lx, ly) => { let g = 0; for (const r of Sy.rooms) if (r.glow) g = Math.max(g, _sst(r.r + 40, r.r * 0.4, Math.hypot(lx - r.x, ly - r.y))); return g; };
  const mossAt = (lx, ly) => { let m = 0; for (const e of Sy.exits) m = Math.max(m, clamp(1 - Math.hypot(lx - e.x, ly - e.y) / 190, 0, 1)); return m; };
  const vert = (k, roof) => {
    const M = roof ? ci : fi; if (M[k] >= 0) return M[k];
    const i = k % nx, j = (k - i) / nx, lx = x0 + i * G, ly = y0 + j * G;
    M[k] = pos.length / 3; pos.push(Sy.C.x + lx, roof ? CY[k] : FY[k], Sy.C.y + ly); cd.push(Dd[k], roof, glowAt(lx, ly), mossAt(lx, ly));
    return M[k];
  };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1, m = Math.min(Dd[a], Dd[b], Dd[c], Dd[d]), M = Math.max(Dd[a], Dd[b], Dd[c], Dd[d]);
    if (M > 60) continue;
    if (m < 42) { const A = vert(a, 0), B = vert(b, 0), Cc = vert(c, 0), D2 = vert(d, 0); idx.push(A, Cc, B, B, Cc, D2); }   // the floor (and the cut top of the rock round it)
    if (m < 3) { const A = vert(a, 1), B = vert(b, 1), Cc = vert(c, 1), D2 = vert(d, 1); idx.push(A, B, Cc, B, D2, Cc); }   // the roof, facing down
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('cd', new THREE.Float32BufferAttribute(cd, 4));
  g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  g.computeVertexNormals(); g.computeBoundingSphere();
  caveMesh.geometry.dispose(); caveMesh.geometry = g; caveMat.uniforms.caveC.value.set(Sy.C.x, 0, Sy.C.y);
  caveBuilt = si; caveDecoBuild(Sy);
}
// the hollows the pools lie in: the floor (terrH) dips under them, here and on the graphics card
function caveSetPools(Sy) {
  const L = LU.cavePl.value; L.forEach(v => v.set(0, 0, 0, 0));
  Sy.pools.forEach((P, i) => { if (i < L.length) L[i].set(Sy.C.x + P.x, Sy.C.y + P.y, P.r, P.dep); });
  if (!Sy.lakes) Sy.lakes = Sy.pools.map((P, i) => {   // and the water, as a pond (08-ponds: you can drink from it, fish it, wade the edge)
    const x = Sy.C.x + P.x, y = Sy.C.y + P.y, b0 = caveBase(x, y) + P.dep, lvl = b0 - P.dep * 0.62, rays = new Float32Array(POND.NR);
    for (let k = 0; k < POND.NR; k++) { const a = k / POND.NR * 6.2832; let d = 0; while (d < P.r && caveBase(x + Math.cos(a) * d, y + Math.sin(a) * d) < lvl) d += 1.5; rays[k] = d; }
    return { kind: 'dlake', x, y, r: 0, s: 1, rad: pondMean(rays), rmax: Math.max(...rays), lvl, h0: lvl - P.dep * 0.4, rays, seed: 3 + i * 2.3, cave: 1 };
  });
}

// ---------------- what's down there: stalagmites, stalactites, rock with iron, bones, fungus, crates, the old camp ----------------
const caveK = new KitMesh(), caveRoofK = new KitMesh(), caveLootK = new KitMesh();   // the roof's own (hidden from above)
caveK.visible = caveRoofK.visible = caveLootK.visible = false;
const CVD = { props: [], lights: [], worms: [], crates: [], bats: [], si: -1, lootKey: '' };
function caveDecoBuild(Sy) {
  const R = rng(Sy.sp.seed * 31 + 5), K = new Kit(), RK = new Kit(), C = Sy.C, props = [], lights = [], worms = [], crates = [];
  const ri = (a, b) => a + R() * (b - a), o = {};
  const at = (lx, ly) => cvRaw(Sy, lx, ly, o);
  const base = (lx, ly) => caveBase(C.x + lx, C.y + ly);
  const inPool = (lx, ly, pad) => Sy.pools.some(P => Math.hypot(P.x - lx, P.y - ly) < P.r + pad);
  const nearExit = (lx, ly, r) => Sy.exits.some(e => Math.hypot(e.x - lx, e.y - ly) < r);
  const rock = [hex('#6e665a'), hex('#625a50'), hex('#7a7062'), hex('#585248')], lime = [hex('#a89c86'), hex('#9a8e7a'), hex('#b4a890')];
  const spot = (r, lo, hi, tries = 30) => {   // somewhere in a chamber, between lo and hi in from the wall
    for (let t = 0; t < tries; t++) {
      const a = R() * 6.283, d = Math.sqrt(R()) * r.r * 1.05, lx = r.x + Math.cos(a) * d, ly = r.y + Math.sin(a) * d, q = -at(lx, ly).d;
      if (q < lo || q > hi || inPool(lx, ly, 14) || nearExit(lx, ly, 70)) continue;
      if (props.some(p => Math.hypot(p.lx - lx, p.ly - ly) < p.r + 12)) continue;
      return [lx, ly];
    }
    return null;
  };
  const stalag = (lx, ly, h, rr, solid) => {   // a stalagmite: stacked cones of wet lime, a broad foot
    const c = lime[(R() * 3) | 0], x = C.x + lx, y = C.y + ly, yaw = R() * 6.28;
    K.mt = 'stone';
    K.add(P_ROCK((R() * 4) | 0), x, -rr * 0.3, y, rr * 2.6, rr * 1.1, rr * 2.4, rock[(R() * 4) | 0], yaw);
    K.add(P_CONE(7), x, 0, y, rr * 2, h, rr * 2, c, yaw);
    K.add(P_CONE(6), x + (R() - 0.5) * rr * 0.5, h * 0.35, y + (R() - 0.5) * rr * 0.5, rr * 1.3, h * 0.85, rr * 1.3, lime[(R() * 3) | 0], yaw + 1);
    if (R() < 0.5) { const a = R() * 6.28, d = rr * 1.4; K.add(P_CONE(6), x + Math.cos(a) * d, 0, y + Math.sin(a) * d, rr * 0.9, h * 0.35, rr * 0.9, c, yaw); }
    K.mt = null;
    if (solid) props.push({ kind: 'stal', x, y, r: rr * 1.15, s: 1, lx, ly, key: 'cs' + Sy.i + '_' + props.length });
  };
  const stalac = (lx, ly, k) => {   // hanging from the roof: a cluster of thin cones, dripping
    const rr = cvCeilRise(at(lx, ly), lx, ly), b = base(lx, ly), x = C.x + lx, y = C.y + ly;
    if (rr < 50) return;
    RK.mt = 'stone';
    const n = 1 + ((R() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const ox = (R() - 0.5) * 9, oy = (R() - 0.5) * 9, L = ri(10, 26) * k, w = ri(2.4, 4.6) * Math.sqrt(k);
      RK.add(P_CONE(6), x + ox, rr + 3, y + oy, w * 2, L + 3, w * 2, lime[(R() * 3) | 0], R() * 6.28, Math.PI);
    }
    RK.mt = null;
    void b;
  };
  for (const r of Sy.rooms) {
    const big = r.r > 110;
    // stalagmites, mostly out toward the walls, leaving the middle clear
    const n = Math.round(r.r / 14 + R() * 4);
    for (let k = 0; k < n; k++) { const s = spot(r, CV.RW + 4, big ? 60 : 34); if (!s) continue; const h = ri(10, big ? 46 : 28); stalag(s[0], s[1], h, ri(3.2, 6.5) * (0.7 + h / 50), h > 14); }
    // a few great columns of them in the big chambers
    if (big) for (let k = 0; k < 2; k++) { const s = spot(r, 40, 200); if (s) stalag(s[0], s[1], ri(55, 90), ri(9, 13), true); }
    // stalactites over all of it
    const m = Math.round(r.r * r.r / 900);
    for (let k = 0; k < m; k++) { const a = R() * 6.283, d = Math.sqrt(R()) * r.r, lx = r.x + Math.cos(a) * d, ly = r.y + Math.sin(a) * d; if (-at(lx, ly).d > 10) stalac(lx, ly, r.H > 140 ? 1.6 : 1); }
    // loose rubble along the walls
    for (let k = 0; k < n * 2; k++) { const s = spot(r, CV.RW - 2, CV.RW + 10); if (!s) continue; K.mt = 'stone'; const z = ri(2, 5); K.add(P_ROCK((R() * 4) | 0), C.x + s[0], z * 0.2, C.y + s[1], z * 2.2, z * 1.5, z * 2, rock[(R() * 4) | 0], R() * 6); K.mt = null; }
    // glowing fungus: pale stems with cold blue-green caps, in clumps; the chamber with glowworms has the most
    const fz = r.glow ? 7 : R() < 0.35 ? 1 : 0;
    for (let k = 0; k < fz; k++) {
      const s = spot(r, CV.RW, 70); if (!s) continue;
      const x = C.x + s[0], y = C.y + s[1], nm = 4 + ((R() * 6) | 0);
      for (let i = 0; i < nm; i++) {
        const a = R() * 6.28, d = R() * 9, mx = x + Math.cos(a) * d, my = y + Math.sin(a) * d, h = ri(2.5, 7);
        K.mt = 'plant'; K.add(P_CYL(5), mx, 0, my, 0.9, h, 0.9, hex('#d8dccc'), 0, 0, 0, 0.35); K.add(P_BALL(), mx, h, my, ri(2.4, 4.2), ri(1.0, 1.6), ri(2.4, 4.2), hex('#5ae0c8'), R() * 6, 0, 0, 1.4); K.mt = null;
      }
      lights.push({ x, y, h: 8, r: 95, c: [0.08, 0.32, 0.3], f: R() * 9 });
    }
    // glowworms on the roof: thousands of tiny blue-green lights
    if (r.glow) for (let k = 0; k < 420; k++) {
      const a = R() * 6.283, d = Math.sqrt(R()) * r.r * 1.1, lx = r.x + Math.cos(a) * d, ly = r.y + Math.sin(a) * d, q = at(lx, ly);
      if (q.d > -6) continue;
      worms.push({ x: C.x + lx, y: C.y + ly, h: cvCeilRise(q, lx, ly) - 1.5, ph: R() * 40, s: ri(1.6, 3.2) });
    }
  }
  // stalactites along the passages too, and rubble
  for (const t of Sy.tubes) {
    const L = Math.hypot(t.bx - t.ax, t.by - t.ay), n = Math.round(L / 45);
    for (let k = 0; k < n; k++) { const u = R(), off = (R() - 0.5) * t.w * 1.2, nx = -(t.by - t.ay) / L, ny = (t.bx - t.ax) / L; const lx = t.ax + (t.bx - t.ax) * u + nx * off, ly = t.ay + (t.by - t.ay) * u + ny * off; if (-at(lx, ly).d > 8) stalac(lx, ly, 0.8); }
  }
  // rock with iron in it, for your pick (it shows its ore: 10-world draws it, 40-sim's mining gives it)
  for (let k = 0, tries = 0; k < Sy.sp.ore && tries < 60; tries++) {
    const r = Sy.rooms[1 + Math.floor(R() * (Sy.rooms.length - 1))] || Sy.rooms[0]; if (r.tag === 'ent' && R() < 0.7) continue;
    const s = spot(r, CV.RW + 10, 45); if (!s) continue;
    props.push({ kind: 'rock', x: C.x + s[0], y: C.y + s[1], r: 9, s: ri(0.9, 1.25), lx: s[0], ly: s[1], key: 'cv' + Sy.i + '_' + k, cave: 1 }); k++;
  }
  // bones about the lairs: a litter of them, gnawed, and skulls
  for (const L of Sy.lairs) for (let k = 0; k < 26; k++) {
    const s = spot(L, CV.RW, 90, 8); if (!s) continue;
    const x = C.x + s[0], y = C.y + s[1], a = R() * 6.28, len = ri(5, 12), bc = hex(R() < 0.5 ? '#d8d0bc' : '#c8bea6');
    K.mt = 'plain';
    if (R() < 0.18) { K.add(P_BALL(), x, 2.6, y, 5.2, 4.8, 6, bc, a); K.add(P_BALL(), x + Math.cos(a) * 1.2, 2.4, y + Math.sin(a) * 1.2, 1.5, 1.5, 1.5, hex('#1a1612'), a); }   // a skull, one dark eye showing
    else { K.rod(P_CYL(5), x, 0.6, y, x + Math.cos(a) * len, 0.6 + R() * 0.8, y + Math.sin(a) * len, ri(0.5, 0.9), bc); K.add(P_BALL(), x, 0.6, y, 1.8, 1.4, 1.8, bc); }
    K.mt = null;
  }
  // the old explorer's camp: a bedroll, a pack, a dead fire, a lantern long out, and the explorer, sat against the wall
  for (const r of Sy.rooms) if (r.camp) {
    const s = spot(r, CV.RW + 6, CV.RW + 24, 60) || [r.x, r.y], x = C.x + s[0], y = C.y + s[1], g = caveGrad(x, y), a = Math.atan2(-g.y, -g.x);   // facing out from the wall
    const fx = x + Math.cos(a) * 34, fy = y + Math.sin(a) * 34, side = a + Math.PI / 2;
    K.mt = 'stone'; for (let i = 0; i < 8; i++) { const b = i / 8 * 6.283; K.add(P_ROCK(i % 4), fx + Math.cos(b) * 8, 0.8, fy + Math.sin(b) * 8, 4.2, 3, 3.6, rock[i % 4], b); } K.mt = null;
    K.mt = 'wood'; for (let i = 0; i < 4; i++) { const b = i * 1.6 + 0.3; K.rod(P_CYL(5), fx - Math.cos(b) * 5, 0.8, fy - Math.sin(b) * 5, fx + Math.cos(b) * 5, 1.6, fy + Math.sin(b) * 5, 0.9, hex('#241c16')); } K.mt = null;
    const bx = x + Math.cos(side) * 26 + Math.cos(a) * 12, by = y + Math.sin(side) * 26 + Math.sin(a) * 12;
    K.mt = 'cloth'; K.add(P_BOX(), bx, 1.2, by, 30, 2.4, 11, hex('#4e5a46'), -side); K.add(P_CYL(10), bx - Math.cos(side) * 13, 2.6, by - Math.sin(side) * 13, 3.4, 11, 3.4, hex('#5c6a52'), -side, Math.PI / 2); K.mt = null;
    const px = x - Math.cos(side) * 20 + Math.cos(a) * 8, py = y - Math.sin(side) * 20 + Math.sin(a) * 8;
    K.mt = 'cloth'; K.add(P_BOX(), px, 7, py, 12, 14, 8, hex('#6a5a3a'), -a); K.add(P_BOX(), px + Math.cos(a) * 4.5, 5, py + Math.sin(a) * 4.5, 9, 7, 2, hex('#5a4a30'), -a); K.mt = null;
    K.mt = 'metal'; K.add(P_CYL(8), fx + 14, 0, fy - 6, 4, 7, 4, hex('#3a3a36')); K.add(P_BALL(), fx + 14, 7.5, fy - 6, 4.4, 3, 4.4, hex('#2e2e2a')); K.mt = null;
    // the explorer: a skeleton slumped against the rock, in the rags of a coat
    const sx = x + Math.cos(a) * 4, sy = y + Math.sin(a) * 4, bone = hex('#d6ceb8'), coat = hex('#3e3a30');
    K.mt = 'cloth'; K.add(P_BOX(), sx, 10, sy, 11, 15, 7, coat, -a, -0.35); K.mt = 'plain';
    K.add(P_BALL(), sx + Math.cos(a) * 3, 21, sy + Math.sin(a) * 3, 6, 6.6, 6.4, bone, -a, 0.4);
    K.add(P_BALL(), sx + Math.cos(a) * 5.4 + Math.cos(side) * 1.4, 21.4, sy + Math.sin(a) * 5.4 + Math.sin(side) * 1.4, 1.6, 1.6, 1.6, hex('#14110e'));
    K.add(P_BALL(), sx + Math.cos(a) * 5.4 - Math.cos(side) * 1.4, 21.4, sy + Math.sin(a) * 5.4 - Math.sin(side) * 1.4, 1.6, 1.6, 1.6, hex('#14110e'));
    for (const sd of [-1, 1]) {
      const hx = sx + Math.cos(side) * sd * 4, hy = sy + Math.sin(side) * sd * 4;
      K.rod(P_CYL(5), hx, 3, hy, hx + Math.cos(a) * 16, 2.5, hy + Math.sin(a) * 16, 1.1, bone); K.rod(P_CYL(5), hx + Math.cos(a) * 16, 2.5, hy + Math.sin(a) * 16, hx + Math.cos(a) * 24, 1, hy + Math.sin(a) * 24, 0.9, bone);
      K.rod(P_CYL(5), hx, 15, hy, hx + Math.cos(a) * 6 + Math.cos(side) * sd * 3, 6, hy + Math.sin(a) * 6 + Math.sin(side) * sd * 3, 0.8, bone);
    }
    K.mt = null;
    crates.push({ kind: 'chest', key: 'cvn' + Sy.i, x: px + Math.cos(a) * 10, y: py + Math.sin(a) * 10, s: 1, cave: Sy.i, note: 1, noModel: 1 });
    lights.push({ x: fx, y: fy, h: 6, r: 60, c: [0.0, 0.0, 0.0], f: 0, ember: 1 });
  }
  // crates left behind, in the dead ends (and one or two along the way)
  const ends = Sy.rooms.filter(r => r.tag === 'end' || r.tag === 'pool').concat(Sy.lairs);
  ends.forEach((r, k) => {
    const s = spot(r, CV.RW + 8, CV.RW + 30, 40); if (!s) return;
    const x = C.x + s[0], y = C.y + s[1], g = caveGrad(x, y);
    crates.push({ kind: 'chest', key: 'cvc' + Sy.i + '_' + k, x, y, s: 1, a: Math.atan2(-g.y, -g.x), cave: Sy.i, tier: r.tag === 'lair' ? 3 : Sy.sp.deep ? 2 : 1 });
  });
  // puddles on the floor, catching your torch
  for (let k = 0; k < Sy.rooms.length * 2; k++) {
    const r = Sy.rooms[(R() * Sy.rooms.length) | 0], s = spot(r, CV.RW + 6, 80); if (!s) continue;
    K.mt = 'water'; K.add(P_CYL(12), C.x + s[0], 0.05, C.y + s[1], ri(9, 22), 0.25, ri(7, 16), hex('#1c2224'), R() * 6); K.mt = null;
  }
  // the bats, hung up in the roof of the highest chamber
  const bats = [];
  for (const r of Sy.rooms) if (r.bats) for (let k = 0; k < 16; k++) {
    const a = R() * 6.283, d = Math.sqrt(R()) * r.r * 0.75, lx = r.x + Math.cos(a) * d, ly = r.y + Math.sin(a) * d, q = at(lx, ly);
    if (q.d > -20) continue;
    bats.push({ hx: C.x + lx, hy: C.y + ly, hh: cvCeilRise(q, lx, ly) - 3, x: C.x + lx, y: C.y + ly, h: cvCeilRise(q, lx, ly) - 3, room: r, ph: R() * 9, st: 'hang', t: 0, vx: 0, vy: 0, vh: 0, sd: R() });
  }
  // the light at the end of each way out
  for (const e of Sy.exits) lights.push({ x: C.x + e.x - Math.cos(e.a) * 40, y: C.y + e.y - Math.sin(e.a) * 40, h: 30, r: 300, c: [0.5, 0.56, 0.66], day: 1, f: 0 });
  caveK.set(K); caveRoofK.set(RK);
  CVD.props = props; CVD.lights = lights; CVD.worms = worms; CVD.crates = crates; CVD.bats = bats; CVD.si = Sy.i; CVD.lootKey = '';
  caveGlowBuild(Sy);
}
// the crates: drawn shut, or open once you've had what was in them
function caveLootSync() {
  const key = CVD.crates.map(c => S.rg.looted.has(c.key) ? 1 : 0).join('');
  if (key === CVD.lootKey) return; CVD.lootKey = key;
  const K = new Kit();
  for (const c of CVD.crates) if (!c.noModel) chestKit(K, c.x, c.y, c.a || 0, 0.85, S.rg.looted.has(c.key) ? 1 : 0);
  caveLootK.set(K);
}
// the way out: daylight at the end of the passage, grey-white by day, a deep blue at night
const caveGlowMat = new THREE.ShaderMaterial({
  uniforms: { k: { value: 1 }, col: { value: new V3(0.85, 0.9, 1.0) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: `varying vec2 vU; void main() { vU = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float k; uniform vec3 col; varying vec2 vU; void main() { float r = length(vU); float a = (1.0 - smoothstep(0.35, 1.0, r)) * k; gl_FragColor = vec4(col * a, 1.0); }`,
});
const caveGlows = [];
function caveGlowBuild(Sy) {
  for (const m of caveGlows) scene.remove(m); caveGlows.length = 0;
  for (const e of Sy.exits) {
    const x = Sy.C.x + e.x - Math.cos(e.a) * (e.w * 0.55), y = Sy.C.y + e.y - Math.sin(e.a) * (e.w * 0.55);
    for (const [sz, back] of [[e.w * 2.3, 0], [e.w * 4.2, 6]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz * 0.95), caveGlowMat); m.frustumCulled = false;
      m.position.set(x + Math.cos(e.a) * back, caveBase(x, y) + 30, y + Math.sin(e.a) * back); m.rotation.set(0, -e.a + Math.PI / 2, 0); m.renderOrder = 3;
      scene.add(m); caveGlows.push(m); m.visible = false;
    }
  }
}
