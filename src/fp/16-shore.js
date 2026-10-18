// ================= the beach, washed up on (Joe) =================
// The sand ran bare from the dunes to the water. Now the sea has left things on it: bleached driftwood lying along the top
// of the beach, some of it whole trunks with their roots still on and branches broken short, sticks and the odd board; a
// dark line of wrack where the last high tide turned; shells and pebbles strewn down to the wet sand and out under the
// shallows; low rocks; and tufts of marram grass where the woods give way to the dunes, leaning away from the wind off the sea.
// Laid out in cells along the coast, the same every time you come back; the small things only near you.
if (BEACH) {
  const SH = { cell: 90, near: 560, step: 120 };
  // driftwood and rocks: inked like the logs in the woods, but only a little darker where they lie on the sand (all of a log
  // that low is "where it meets the ground", and it went dark grey instead of sea-bleached)
  const shoreK = new KitMesh(); castsShadow(shoreK.mesh);
  shoreK.mesh.material = new THREE.ShaderMaterial({ uniforms: kitMat.uniforms, vertexShader: kitMat.vertexShader, fragmentShader: kitMat.fragmentShader.replace('paintH = vH;', 'paintH = 5.0 + vH;') });
  // shells, weed, pebbles, grass: too small for lines (the ink would fill them in black), so they leave no depth for the ink
  // to find and are drawn after the rest; and not darkened at the foot at all
  const shoreF = new KitMesh(false); shoreF.mesh.renderOrder = 1;
  shoreF.mesh.material = new THREE.ShaderMaterial({ uniforms: kitMat.uniforms, vertexShader: kitMat.vertexShader, fragmentShader: kitMat.fragmentShader.replace('paintH = vH;', 'paintH = 99.0;'), depthWrite: false });
  const cells = new Map();
  const P_BLADE = () => prim('blade3', () => { const g = new THREE.ConeGeometry(0.5, 1, 3, 1, true); g.translate(0, 0.5, 0); return g; });   // a grass blade: no base
  const P_STRIP = () => prim('strip', () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; });   // a strand of weed, flat on the sand
  let shoreKey = '';
  const C = a => a.map(h => hex(h));
  const WOOD = C(['#d2c7b4', '#c4baa8', '#dcd2c0', '#b8ae9e', '#cbbca2']), BOARD = C(['#8c7b63', '#7a6c58']);
  const WEED = C(['#7a6a3c', '#6c683c', '#626c42', '#8a7448', '#5c5834']), DRY = C(['#b09a68', '#a08c5c']);
  const SHELL = C(['#efe6d6', '#e6d2bf', '#d8b9a6', '#f3ede4', '#c9a88e', '#e9c9b8']);
  const PEB = C(['#a49e96', '#8c8780', '#b2aba0', '#9a9086']), PEBW = C(['#77726c', '#6a6560', '#7c746a']);
  const ROCK = C(['#7d776e', '#6c675f', '#857d72']), GRASS = C(['#b8b26e', '#a3a862', '#c8bd84', '#8e9a58', '#d1c690']);
  // which way the shore runs here: n out to sea, t along the beach
  function shoreDir(x, y) {
    const gx = coastS(x + 2, y) - coastS(x - 2, y), gy = coastS(x, y + 2) - coastS(x, y - 2), l = Math.hypot(gx, gy) || 1;
    return { nx: gx / l, ny: gy / l, tx: -gy / l, ty: gx / l };
  }
  const wrackS = (x, y) => -34 + 6 * Math.sin(x * 0.013 + y * 0.017) + 3 * Math.sin(x * 0.041 - y * 0.029);   // the high-tide line
  function driftwood(K, x, y, R, d) {
    const a = Math.atan2(d.ty, d.tx) + (R(1) - 0.5) * 1.3, ux = Math.cos(a), uy = Math.sin(a);
    const L = 26 + R(2) * 36, r = 1.5 + R(3) * 1.4, col = WOOD[R(4) * WOOD.length | 0], yc = r * 0.7;
    const ax = x - ux * L / 2, ay = y - uy * L / 2, bx = x + ux * L / 2, by = y + uy * L / 2;
    K.mt = 'wood';
    K.rod(P_CYL(7), ax, yc, ay, bx, yc, by, r, col);
    K.rod(P_CONE(7), bx, yc, by, bx + ux * L * 0.22, yc * 0.8, by + uy * L * 0.22, r * 0.92, col);   // worn to a point
    if (R(5) < 0.55) for (let k = 0; k < 5; k++) {   // the root plate, splayed and sand-scoured
      const b = a + Math.PI + (k - 2) * 0.55 + (R(10 + k) - 0.5) * 0.4, l = 7 + R(20 + k) * 8;
      K.rod(P_CONE(5), ax, yc, ay, ax + Math.cos(b) * l, Math.max(0.3, yc + (R(30 + k) - 0.35) * r * 3), ay + Math.sin(b) * l, r * 0.5, col);
    }
    const nb = R(6) * 3 | 0;
    for (let k = 0; k < nb; k++) {   // branches broken off short
      const t = 0.25 + R(40 + k) * 0.55, px = ax + ux * L * t, py = ay + uy * L * t, sd = R(50 + k) < 0.5 ? -1 : 1, l = 4 + R(60 + k) * 7;
      K.rod(P_CONE(5), px, yc, py, px - uy * sd * l + ux * l * 0.5, yc + l * 0.35, py + ux * sd * l + uy * l * 0.5, r * 0.42, col);
    }
    K.mt = null;
  }
  function stick(K, x, y, R) {
    const a = R(1) * 6.2832, l = 5 + R(2) * 8, col = WOOD[R(3) * WOOD.length | 0], ux = Math.cos(a) * l / 2, uy = Math.sin(a) * l / 2;
    K.mt = 'wood'; K.rod(P_CYL(5), x - ux, 0.5, y - uy, x + ux, 0.6, y + uy, 0.45 + R(4) * 0.35, col); K.mt = null;
  }
  function board(K, x, y, R, d) {
    const a = Math.atan2(d.ty, d.tx) + (R(1) - 0.5) * 2;
    K.mt = 'wood'; K.add(P_BOX(), x, 0.35, y, 16 + R(2) * 8, 0.8, 3.4, BOARD[R(3) * 2 | 0], -a, 0, (R(4) - 0.5) * 0.12); K.mt = null;
  }
  function rocks(K, x, y, R) {
    const n = 2 + (R(1) * 3 | 0);
    K.mt = 'stone';
    for (let k = 0; k < n; k++) {
      const b = R(10 + k) * 6.2832, rr = k ? 4 + R(20 + k) * 6 : 0, s = (k ? 3 : 6) + R(30 + k) * 4;
      K.add(P_ROCK(k % 3), x + Math.cos(b) * rr, s * 0.18, y + Math.sin(b) * rr, s * 1.2, s * 0.75, s, ROCK[(k + (R(2) * 3 | 0)) % 3], R(40 + k) * 6.2832);
    }
    K.mt = null;
  }
  function marram(F, x, y, R, d) {
    const n = 9 + (R(1) * 7 | 0), wx = -d.nx * 0.35, wy = -d.ny * 0.35, i0 = F.nor.length;   // leaning inland, away from the sea wind
    F.mt = 'plant';
    for (let k = 0; k < n; k++) {
      const b = R(10 + k) * 6.2832, rr = Math.sqrt(R(20 + k)) * 2.6, bx = x + Math.cos(b) * rr, by = y + Math.sin(b) * rr;
      const h = 7 + R(30 + k) * 7, sp = 0.18 + rr * 0.07, lx = (Math.cos(b) * sp + wx) * h, ly = (Math.sin(b) * sp + wy) * h;
      F.rod(P_BLADE(), bx, -0.3, by, bx + lx, h, by + ly, 0.34, GRASS[(k + (R(2) * 5 | 0)) % 5], 0.12);
    }
    // lit as a tuft, from above, not as so many thin three-sided spikes (their shaded sides went black)
    for (let i = i0; i < F.nor.length; i += 3) { const nx = F.nor[i] * 0.35, ny = F.nor[i + 1] * 0.35 + 1, nz = F.nor[i + 2] * 0.35, l = Math.hypot(nx, ny, nz); F.nor[i] = nx / l; F.nor[i + 1] = ny / l; F.nor[i + 2] = nz / l; }
    F.mt = null;
  }
  function wrack(F, x, y, R, d) {   // a clump of weed on the tide line
    const n = 3 + (R(1) * 4 | 0);
    F.mt = 'plant';
    for (let k = 0; k < n; k++) {
      const b = R(10 + k) * 6.2832, rr = R(20 + k) * 3.5, px = x + d.tx * Math.cos(b) * rr * 1.6 + d.nx * Math.sin(b) * rr * 0.5, py = y + d.ty * Math.cos(b) * rr * 1.6 + d.ny * Math.sin(b) * rr * 0.5;
      const dry = R(30 + k) < 0.25, col = dry ? DRY[k & 1] : WEED[(k + (R(2) * 5 | 0)) % 5], ang = Math.atan2(d.ty, d.tx) + (R(60 + k) - 0.5) * 1.1;
      F.add(P_STRIP(), px, 0.12, py, 2.4 + R(40 + k) * 4, 1, 0.45 + R(50 + k) * 0.6, col, -ang, 0, 0, 0.06);   // a strand lying along the line the water left it on
    }
    F.mt = null;
  }
  function shell(F, x, y, R) {
    const col = SHELL[R(1) * SHELL.length | 0];
    F.mt = 'plain';
    if (R(2) < 0.7) F.add(P_CONE(6), x, -0.05, y, 1.4 + R(3) * 0.9, 0.5 + R(4) * 0.3, 1.2 + R(5) * 0.7, col, R(6) * 6.2832, (R(7) - 0.5) * 0.3, 0, 0.12);   // a cockle
    else { const a = R(6) * 6.2832, l = 1.6 + R(3) * 1.2; F.rod(P_CONE(5), x, 0.55, y, x + Math.cos(a) * l, 0.4, y + Math.sin(a) * l, 0.6 + R(4) * 0.25, col, 0.12); }   // a whelk on its side
    F.mt = null;
  }
  function pebble(F, x, y, R, wet) {
    const s = 1 + R(1) * 1.8, P = wet ? PEBW : PEB;
    F.mt = 'plain'; F.add(P_CONE(6), x, -0.1, y, s * 1.3, s * 0.42, s, P[R(3) * P.length | 0], R(4) * 6.2832, (R(5) - 0.5) * 0.2, 0, 0.06); F.mt = null;   // a low sea-worn dome
  }
  let budget = 0;
  function shoreCell(ci, cj) {
    const k = ci + ',' + cj; let c = cells.get(k); if (c) return c;
    if (budget-- <= 0) return null;   // a few new cells a frame: coming down to the coast doesn't stall on the whole beach at once
    const K = new Kit(), F = new Kit(), x0 = ci * SH.cell, y0 = cj * SH.cell;
    c = { K: null, F: null }; cells.set(k, c);
    const s0 = coastS(x0 + SH.cell / 2, y0 + SH.cell / 2);
    if (s0 < -330 || s0 > 150) { c.K = pack(K); c.F = pack(F); return c; }
    const H = (a, b) => hash(ci * 13.17 + a * 7.71, cj * 17.31 + b * 3.37);
    const at = (j, tries, fn) => { for (let i = 0; i < tries; i++) {
      const x = x0 + H(j, i) * SH.cell, y = y0 + H(j + 0.5, i + 0.5) * SH.cell, s = coastS(x, y), R = q => H(j * 31 + i + q * 0.137, q + i * 0.71);
      fn(x, y, s, R);
    } };
    at(1, 1, (x, y, s, R) => { if (s > -150 && s < -55 && R(9) < 0.5) driftwood(K, x, y, R, shoreDir(x, y)); });
    at(2, 3, (x, y, s, R) => { if (s > -135 && s < -38 && R(9) < 0.6) stick(K, x, y, R); });
    at(3, 1, (x, y, s, R) => { if (s > -140 && s < -50 && R(9) < 0.1) board(K, x, y, R, shoreDir(x, y)); });
    at(4, 1, (x, y, s, R) => { if (s > -170 && s < -70 && R(9) < 0.14) rocks(K, x, y, R); });
    at(5, 10, (x, y, s, R) => { if (s > -205 && s < -112 && R(9) < 0.25 + 0.6 * _sst(-112, -190, s)) marram(F, x, y, R, shoreDir(x, y)); });
    if (Math.abs(s0 + 34) < 90) at(6, 11, (x, y, s, R) => {   // drawn onto the tide line
      const d = shoreDir(x, y), m = wrackS(x, y) - s + (R(8) - 0.5) * 6;
      if (Math.abs(m) > 60 || R(9) < 0.25) return;
      wrack(F, x + d.nx * m, y + d.ny * m, R, d);
    });
    at(7, 16, (x, y, s, R) => { if (s > -115 && s < -6) shell(F, x, y, R); });
    at(8, 12, (x, y, s, R) => { if (s > -75 && s < 28) pebble(F, x, y, R, s > -28); });
    c.K = pack(K); c.F = pack(F);
    if (cells.size > 900) { const it = cells.keys(); for (let i = 0; i < 300; i++) cells.delete(it.next().value); }
    return c;
  }
  // each cell kept as finished arrays, so walking along the beach only copies them together (a rebuild from the shapes each
  // time cost a dropped frame)
  const ATT = [['position', 'pos', 3], ['normal', 'nor', 3], ['color', 'col', 3], ['em', 'em', 1], ['ew', 'ew', 1], ['gu', 'gu', 3], ['mt', 'mts', 1]];
  const pack = K => ({ n: K.em.length, a: ATT.map(([, f]) => new Float32Array(K[f])) });
  function merge(list) {
    const n = list.reduce((t, c) => t + c.n, 0);
    return { geometry() {
      const g = new THREE.BufferGeometry();
      ATT.forEach(([name, , w], j) => { const a = new Float32Array(n * w); let o = 0; for (const c of list) { a.set(c.a[j], o); o += c.a[j].length; } g.setAttribute(name, new THREE.BufferAttribute(a, w)); });
      return g;
    } };
  }
  function shoreSync() {
    const p = S.p, vr = drawR(), key = Math.round(p.x / SH.step) + ',' + Math.round(p.y / SH.step) + ',' + vr;
    if (key === shoreKey) return; shoreKey = key;
    const BK = [], BF = []; budget = 4; let more = false;
    if (coastS(p.x, p.y) > -vr - 400) {
      const c0 = Math.floor((p.x - vr) / SH.cell), c1 = Math.floor((p.x + vr) / SH.cell), r0 = Math.floor((p.y - vr) / SH.cell), r1 = Math.floor((p.y + vr) / SH.cell);
      const L = [];
      for (let cj = r0; cj <= r1; cj++) for (let ci = c0; ci <= c1; ci++) {
        const d = Math.hypot((ci + 0.5) * SH.cell - p.x, (cj + 0.5) * SH.cell - p.y); if (d > vr + 60) continue;
        const s = coastS((ci + 0.5) * SH.cell, (cj + 0.5) * SH.cell); if (s < -330 || s > 150) continue;
        L.push([d, ci, cj]);
      }
      L.sort((a, b) => a[0] - b[0]);   // nearest first
      for (const [d, ci, cj] of L) {
        const c = shoreCell(ci, cj); if (!c) { more = true; continue; }
        BK.push(c.K); if (d < SH.near) BF.push(c.F);
      }
    }
    shoreK.set(merge(BK)); shoreF.set(merge(BF));
    if (more) shoreKey = '';   // the rest next frame
  }
  { const ws = worldSync; worldSync = function (f) { const r = ws(f); if (S && S.p) { if (f) shoreKey = ''; shoreSync(); } return r; }; }
}
