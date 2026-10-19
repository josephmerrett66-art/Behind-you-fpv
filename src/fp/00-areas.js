// ================= the lie of the land: areas of the woods with a character of their own =================
// A map of the woods (repeating every 12288 units, far further than you'll ever notice) says how much each spot is
// thick woods, rocky ground, dry ground or open glade. The trees, rocks and plants are set out by it (makeProp, decorAt),
// and the ground and the turf are coloured by it (soilW reads the same map as a texture), so a thicket is dark and close
// with fern and fungus underfoot, rocky ground is boulders and grit, dry ground is straw grass and dead trees, and a glade
// is open meadow with oaks and flowers. Here and there a place with a story to it, made of things already in the woods:
// a ring of standing stones round a dead tree, a grove of old oaks round a clearing, a stand of dead wood, a lone oak with
// a fairy ring of mushrooms, trees brought down in a storm, and a field of boulders.
const AREA_N = 256, AREA_CELL = 48, AREA_P = AREA_N * AREA_CELL, MARK_N = 8, MARK_CELL = AREA_P / MARK_N;
const MARK_KINDS = ['stones', 'grove', 'deadwood', 'fairy', 'fallen', 'boulders'];
const MARK_R = { stones: 140, grove: 200, deadwood: 300, fairy: 130, fallen: 240, boulders: 260 };
const AREA = (() => {
  const N = AREA_N, rnd = (a, b, s) => { const v = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
  const sm = t => t * t * (3 - 2 * t);
  const noise = (x, y, f, s) => {   // value noise with f cells across the map, wrapping at its edges
    const fx = x / N * f, fy = y / N * f, i = Math.floor(fx), j = Math.floor(fy), u = sm(fx - i), v = sm(fy - j);
    const g = (a, b) => rnd(((a % f) + f) % f, ((b % f) + f) % f, s);
    return (g(i, j) * (1 - u) + g(i + 1, j) * u) * (1 - v) + (g(i, j + 1) * (1 - u) + g(i + 1, j + 1) * u) * v;
  };
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // the places with stories: at most one to a cell of the map, well inside it, never near the camp
  const marks = [];
  for (let a = 0; a < MARK_N; a++) for (let b = 0; b < MARK_N; b++) {
    if (rnd(a, b, 91) > 0.62) continue;
    const t = MARK_KINDS[Math.floor(rnd(a, b, 92) * MARK_KINDS.length)], x = (a + 0.5) * MARK_CELL + (rnd(a, b, 93) - 0.5) * 760, y = (b + 0.5) * MARK_CELL + (rnd(a, b, 94) - 0.5) * 760;
    const dx = Math.min(x, AREA_P - x), dy = Math.min(y, AREA_P - y); if (Math.hypot(dx, dy) < 1300) continue;
    marks.push({ t, x, y, r: MARK_R[t], a: rnd(a, b, 95) * 6.283, seed: rnd(a, b, 96), ci: a, cj: b });
  }
  const STAMP = { stones: [3, 0.7], grove: [3, 1], deadwood: [2, 1], fairy: [3, 1], fallen: [0, 0.85], boulders: [1, 1] };
  const data = new Uint8Array(N * N * 4), stand = new Uint8Array(N * N), w = [0, 0, 0, 0];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const th = noise(i, j, 4, 1) * 0.6 + noise(i, j, 16, 2) * 0.4, ro = noise(i, j, 8, 3) * 0.6 + noise(i, j, 32, 4) * 0.4;
    const dr = noise(i, j, 4, 5) * 0.65 + noise(i, j, 16, 6) * 0.35, gl = noise(i, j, 8, 7) * 0.6 + noise(i, j, 16, 8) * 0.4;
    w[0] = ss(0.56, 0.7, th); w[1] = ss(0.6, 0.72, ro); w[2] = ss(0.58, 0.7, dr); w[3] = ss(0.58, 0.7, gl);
    const px = (i + 0.5) * AREA_CELL, py = (j + 0.5) * AREA_CELL;
    for (const M of marks) {   // each place has the ground to suit it
      const dx = Math.abs(px - M.x), dy = Math.abs(py - M.y), d = Math.hypot(Math.min(dx, AREA_P - dx), Math.min(dy, AREA_P - dy)); if (d > M.r * 1.6) continue;
      const [c, k] = STAMP[M.t], f = k * ss(M.r * 1.6, M.r * 0.7, d);
      for (let q = 0; q < 4; q++) w[q] = q === c ? Math.max(w[q], f) : w[q] * (1 - f);
    }
    const cd = Math.hypot(Math.min(px, AREA_P - px), Math.min(py, AREA_P - py)), calm = ss(500, 1100, cd);   // round the camp the woods stay as they were
    const sum = w[0] + w[1] + w[2] + w[3], k = (sum > 1 ? 1 / sum : 1) * calm, o = (j * N + i) * 4;
    for (let q = 0; q < 4; q++) data[o + q] = Math.round(w[q] * k * 255);
    // the stands: the trees grow close in clumps a few hundred across, with clearings and thinner woods between them. Thick
    // woods are close nearly everywhere, glades, dry and rocky ground mostly open; the camp keeps its clearing
    const st = noise(i, j, 48, 21) * 0.55 + noise(i, j, 96, 22) * 0.3 + noise(i, j, 24, 23) * 0.15, A0 = w[0] * k, A1 = w[1] * k, A2 = w[2] * k, A3 = w[3] * k;
    let cv = ss(0.38, 0.6, st) * Math.max(0, 0.62 + 0.38 * A0 - 0.5 * A3 - 0.32 * A2 - 0.36 * A1) + 0.32 * A0 * ss(0.25, 0.45, st);
    for (const M of marks) { const dx = Math.abs(px - M.x), dy = Math.abs(py - M.y), d = Math.hypot(Math.min(dx, AREA_P - dx), Math.min(dy, AREA_P - dy)); if (d < M.r * 1.4) cv *= ss(M.r * 0.8, M.r * 1.4, d); }   // the places with stories keep their own ground
    stand[j * N + i] = Math.round(Math.min(1, cv) * ss(150, 430, cd) * 255);
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const standTex = new THREE.DataTexture(stand, N, N, THREE.RedFormat, THREE.UnsignedByteType); standTex.wrapS = standTex.wrapT = THREE.RepeatWrapping; standTex.magFilter = standTex.minFilter = THREE.LinearFilter; standTex.needsUpdate = true;
  return { data, marks, tex, stand, standTex };
})();
const _land = [0, 0, 0, 0];
function landAt(x, y) {   // [thicket, rocky, dry, glade] here, 0 to 1: the same as the ground's shader reads
  const N = AREA_N, D = AREA.data, fx = x / AREA_CELL - 0.5, fy = y / AREA_CELL - 0.5, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
  const i0 = ((i % N) + N) % N, j0 = ((j % N) + N) % N, i1 = (i0 + 1) % N, j1 = (j0 + 1) % N;
  for (let q = 0; q < 4; q++) _land[q] = ((D[(j0 * N + i0) * 4 + q] * (1 - u) + D[(j0 * N + i1) * 4 + q] * u) * (1 - v) + (D[(j1 * N + i0) * 4 + q] * (1 - u) + D[(j1 * N + i1) * 4 + q] * u) * v) / 255;
  return _land;
}
function landCover(x, y) {   // how close the trees stand here, 0 (a clearing) to 1 (a dense stand): the same as the ground's shader reads
  const N = AREA_N, D = AREA.stand, fx = x / AREA_CELL - 0.5, fy = y / AREA_CELL - 0.5, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
  const i0 = ((i % N) + N) % N, j0 = ((j % N) + N) % N, i1 = (i0 + 1) % N, j1 = (j0 + 1) % N;
  return ((D[j0 * N + i0] * (1 - u) + D[j0 * N + i1] * u) * (1 - v) + (D[j1 * N + i0] * (1 - u) + D[j1 * N + i1] * u) * v) / 255;
}
function landMark(x, y) {   // the place with a story whose ground this is, if any, where it stands in the world
  const px = ((x % AREA_P) + AREA_P) % AREA_P, py = ((y % AREA_P) + AREA_P) % AREA_P, a = Math.floor(px / MARK_CELL), b = Math.floor(py / MARK_CELL);
  for (const M of AREA.marks) if (M.ci === a && M.cj === b) {
    const wx = x - px + M.x, wy = y - py + M.y, d = Math.hypot(x - wx, y - wy);
    return d < M.r + 60 ? { t: M.t, x: wx, y: wy, r: M.r, a: M.a, seed: M.seed, d } : null;
  }
  return null;
}
const inTile = (px, py, i, j) => px >= i * AREA_CELL && px < (i + 1) * AREA_CELL && py >= j * AREA_CELL && py < (j + 1) * AREA_CELL;
const mHash = (M, k) => { const v = Math.sin(M.seed * 913.7 + k * 71.3) * 43758.5453; return v - Math.floor(v); };
function ringPt(M, n, R, i, j, jit = 0) {   // which of n points round a ring falls in tile (i, j)
  for (let k = 0; k < n; k++) { const a = M.a + k / n * 6.283 + (mHash(M, k) - 0.5) * jit, r = R * (1 + (mHash(M, k + 50) - 0.5) * jit * 0.5), px = M.x + Math.cos(a) * r, py = M.y + Math.sin(a) * r; if (inTile(px, py, i, j)) return { x: px, y: py, k }; }
  return null;
}
// the trees: which kind grows where (pine, oak, dead, cherry)
const TREE_MIX = [[0.57, 0.24, 0.13, 0.06], [0.74, 0.13, 0.1, 0.03], [0.62, 0.14, 0.2, 0.04], [0.25, 0.08, 0.64, 0.03], [0.18, 0.5, 0.04, 0.28]];
function landTree(A, tv) {
  const s = A[0] + A[1] + A[2] + A[3], w = TREE_MIX[0].map((b, k) => b * Math.max(0, 1 - s) + A[0] * TREE_MIX[1][k] + A[1] * TREE_MIX[2][k] + A[2] * TREE_MIX[3][k] + A[3] * TREE_MIX[4][k]);
  const tot = w[0] + w[1] + w[2] + w[3]; let c = 0;
  for (let k = 0; k < 4; k++) { c += w[k] / tot; if (tv < c) return ['pine', 'oak', 'dead', 'cherry'][k]; }
  return 'pine';
}
// what makeProp sets down on tile (i, j): a tree, a rock, a post or nothing, by the lie of the land
function landProp(i, j, h, tv, x, y) {
  const T = AREA_CELL, key = i + ',' + j, sc = hash(i * 3, j);
  const tree = (type, s, px = x, py = y) => ({ kind: 'tree', type, seed: hash(i + 0.3, j + 0.7), x: px, y: py, r: 10, s, key, birds: hash(i * 5.1, j * 2.3) < 0.3 });
  const rock = (s, px = x, py = y) => ({ kind: 'rock', x: px, y: py, r: 9, s, key });
  const M = landMark(i * T + T / 2, j * T + T / 2);
  if (M) {
    const d = M.d;
    if (M.t === 'stones') {   // standing stones in a ring round an old dead tree
      if (inTile(M.x, M.y, i, j)) return tree('dead', 1.25, M.x, M.y);
      const p = ringPt(M, 7, 92, i, j); if (p) return rock(0.85 + mHash(M, p.k + 9) * 0.35, p.x, p.y);
      if (d < 150) return null;
    } else if (M.t === 'grove') {   // old oaks and cherries round a clearing
      const p = ringPt(M, 8, 150, i, j, 0.3); if (p) return tree(mHash(M, p.k + 3) < 0.65 ? 'oak' : 'cherry', 1.3 + mHash(M, p.k + 4) * 0.3, p.x, p.y);
      if (d < 175) return null;
    } else if (M.t === 'fairy') {   // a lone great oak in the open
      if (inTile(M.x, M.y, i, j)) return tree('oak', 1.6, M.x, M.y);
      if (d < M.r) return null;
    } else if (d < M.r) {
      const f = 1 - d / M.r;
      if (M.t === 'deadwood') return h > 1 - 0.12 - 0.08 * f ? tree('dead', 0.8 + sc * 0.6) : h < 0.02 + 0.03 * f ? rock(0.6 + sc * 0.4) : null;   // a stand of dead trees on dry ground
      if (M.t === 'fallen') return d < 60 ? null : h > 0.88 ? tree(tv < 0.8 ? 'pine' : 'dead', 0.9 + sc * 0.6) : null;   // the storm's clearing, the trees still standing round it
      if (M.t === 'boulders') return h > 1 - 0.06 - 0.14 * f ? rock(0.9 + sc * 0.8 + f * 0.3) : h < 0.03 ? tree('dead', 0.7 + sc * 0.4) : null;   // great stones strewn about
    }
  }
  // the trees by the stands (landCover): close together in them, few and far between in the clearings. One to a tile at most,
  // so a tile in the heart of a stand nearly always has its tree; those in a stand grow taller, reaching for the light
  const A = landAt(x, y), cv = landCover(x, y), tp = Math.max(0.025, 0.04 + 0.6 * cv - 0.02 * A[3]), rp = Math.max(0.006, 0.025 + 0.055 * A[1] + 0.01 * A[2] - 0.015 * A[3] - 0.01 * A[0]);
  if (h > 1 - tp) return tree(landTree(A, tv), 0.78 + sc * 0.55 + 0.2 * A[0] + 0.18 * cv);
  if (h > 1 - tp - rp) return rock(0.7 + hash(i, j * 5) * 0.7 + 0.35 * A[1]);
  if (h > 1 - tp - rp - 0.01) return { kind: 'post', x, y, r: 4, s: 1 };
  return null;
}
// what decorAt grows on tile (i, j): grass, fern, pebbles, bush, mushrooms or a log, by the lie of the land
const DECOR_KINDS = ['grass', 'fern', 'pebbles', 'bush', 'shrooms', 'log', 'sapling'];
const DECOR_MIX = [[0.36, 0.16, 0.12, 0.12, 0.09, 0.15], [0.1, 0.36, 0.03, 0.15, 0.2, 0.16], [0.22, 0.1, 0.48, 0.08, 0.04, 0.08], [0.56, 0.02, 0.2, 0.05, 0.02, 0.15], [0.44, 0.12, 0.04, 0.28, 0.08, 0.04]];
function landDecor(i, j, h) {   // undefined: the ordinary rule; null: nothing here; else the kind to grow
  const T = AREA_CELL, cx = i * T + T / 2, cy = j * T + T / 2, M = landMark(cx, cy);
  if (M && M.d < M.r + 20) {
    const at = (dk, px, py) => ({ dk, x: px, y: py });
    if (M.t === 'fairy') { const p = ringPt(M, 12, 68, i, j); if (p) return at('shrooms', p.x, p.y); if (M.d < 60) return null; return h < 0.45 ? at(h < 0.2 ? 'bush' : 'grass') : null; }
    if (M.t === 'fallen') { for (let k = 0; k < 6; k++) { const a = M.a + (mHash(M, k) - 0.5) * 0.7, r = 25 + k * 22 + mHash(M, k + 7) * 10, px = M.x + Math.cos(a + (k % 2) * Math.PI) * r, py = M.y + Math.sin(a + (k % 2) * Math.PI) * r; if (inTile(px, py, i, j)) return at('log', px, py); }
      return h < 0.5 ? at(h < 0.22 ? 'fern' : h < 0.38 ? 'shrooms' : 'bush') : null; }
    if (M.t === 'deadwood') return h < 0.34 ? at(h < 0.1 ? 'log' : h < 0.2 ? 'pebbles' : 'grass') : null;
    if (M.t === 'stones') return M.d < 92 ? (h < 0.3 ? at(h < 0.12 ? 'flowerW' : 'grass') : null) : h < 0.3 ? at('pebbles') : null;
    if (M.t === 'boulders') return h < 0.45 ? at(h < 0.3 ? 'pebbles' : 'grass') : null;
    if (M.t === 'grove') return M.d < 150 ? (h < 0.4 ? at(h < 0.18 ? 'flowerY' : h < 0.26 ? 'flowerW' : 'grass') : null) : undefined;
  }
  // under the stands (landCover) the floor is ferns, bushes, fungus and fallen wood rather than grass, and young trees
  // come up round their edges where the light gets in
  const A = landAt(cx, cy), cv = landCover(cx, cy), dens = 0.3 + 0.16 * A[0] + 0.12 * A[1] - 0.06 * A[2] + 0.04 * A[3] + 0.2 * cv;
  if (h >= dens) return null;
  const r = h / dens, s = A[0] + A[1] + A[2] + A[3], edge = cv * (1 - cv) * 4;
  let c = 0, tot = 0; const w = DECOR_MIX[0].map((b, k) => b * Math.max(0, 1 - s) + A[0] * DECOR_MIX[1][k] + A[1] * DECOR_MIX[2][k] + A[2] * DECOR_MIX[3][k] + A[3] * DECOR_MIX[4][k]);
  const under = [1 - 0.65 * cv, 1 + 1.1 * cv, 1 - 0.3 * cv, 1 + 0.6 * cv, 1 + 0.9 * cv, 1 + 0.5 * cv];
  for (let k = 0; k < 6; k++) w[k] *= under[k];
  w.push(0.03 + 0.2 * edge * (1 - A[2]) * (1 - A[1]));   // a sapling
  for (const v of w) tot += v;
  for (let k = 0; k < 7; k++) { c += w[k] / tot; if (r < c) return { dk: DECOR_KINDS[k] }; }
  return { dk: 'log' };
}
const flowerLand = (a, b) => { const A = landAt((a * 6 + 3) * AREA_CELL, (b * 6 + 3) * AREA_CELL); return 0.2 + 0.32 * A[3] - 0.12 * A[2] - 0.14 * A[0] - 0.08 * A[1]; };   // how likely a patch of flowers is here
