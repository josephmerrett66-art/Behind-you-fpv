// ================= what you build: the stations you put down, and every piece the hammer makes =================
// Joe: one solid look for all of it, so you can tell what each thing is at a glance. Everything is made from the same few
// makings, drawn the same way: sawn planks with a darker edge, round logs in their bark with the pale cut wood at the
// ends, dry stone, dark iron that catches the light, rope lashed round the joints, and embers that glow. Each station faces
// you when you put it down: the bench's tools, the furnace's mouth, the forge's anvil and the chest's lock are on the side
// you stood on. Things that hang on a wall sit on it, not just off it.

const MAKE = {
  plank: ['#a8804e', '#98723f', '#b38a58'], trim: '#6e4e30', dark: '#4e3824', board: '#5c4330',
  bark: ['#6c5842', '#5f4d3a', '#78624a'], cut: '#c9aa7a', char: '#2c241e',
  stone: ['#8d8b85', '#7c7a74', '#9a978f', '#85827b'], mortar: '#5a5852', slate: '#646a70',
  iron: '#55595f', ironL: '#878c93', ironD: '#383b40',
  rope: '#c2a874', hide: '#a88a66', hideD: '#7e6248', ticking: '#c8b890', cloth: '#a8443a', gold: '#d8b064',
  straw: '#cdb47a', strawD: '#a8905a', bone: '#e2dccb', boneD: '#b9b2a0', clay: '#8e5a40',
  soot: '#1c1916', ember: '#ff8a30', glow: '#ffc464', water: '#3e6e94', soil: '#4c3a29', soilD: '#382a1c', leaf: '#5a7c38', leafD: '#46622c',
  meat: '#8e3a2a', meatD: '#6e2c20', fish: '#9aa29c', fishD: '#5e6862',
};
for (const k in MAKE) MAKE[k] = Array.isArray(MAKE[k]) ? MAKE[k].map(h => hex(h)) : hex(MAKE[k]);
const lit3 = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

// ---------------- the hand that makes them: shapes placed along (f) and across (s) a thing that faces a ----------------
const _mb = new M4(), _mq = new THREE.Quaternion(), _me = new THREE.Euler(), _mx = new V3(), _my = new V3(), _mz = new V3();
function maker(K, x, y, a, z0 = 0) {   // z0: how far off the ground it all starts (a rug laid on a floor)
  const ca = Math.cos(a), sa = Math.sin(a), at = (f, s) => [x + ca * f - sa * s, y + sa * f + ca * s];
  const W = (f, s, z) => { const [px, py] = at(f, s); return [px, z + z0, py]; };
  const put = (geo, f, s, z, sx, sy, sz, col, mt, turn = 0, lean = 0, tip = 0, em = 0) => { const [px, py] = at(f, s); K.mt = mt; K.add(geo, px, z + z0, py, sx, sy, sz, col, -(a + turn), lean, tip, em); K.mt = null; };
  return {
    at, a,
    // a block standing on z, its middle at (f, s): l along, h tall, w across. o: { turn (in plan), lean (its top towards +s), tip (its far end up), em }
    box(f, s, z, l, h, w, col, mt = 'wood', o) { put(P_BOX(), f, s, z + h / 2, l, h, w, col, mt, o && o.turn, o && o.lean, o && o.tip, o && o.em); },
    // a board from one point to another, w wide (kept level across it) and t thick: a rafter, a roof board, a brace
    slab(A, B, w, t, col, mt = 'wood', em = 0) {
      const p = W(...A), q = W(...B); _mx.set(q[0] - p[0], q[1] - p[1], q[2] - p[2]); const L = _mx.length() || 1; _mx.multiplyScalar(1 / L);
      _mz.crossVectors(_mx, _my.set(0, 1, 0)); if (_mz.lengthSq() < 1e-6) _mz.set(-sa, 0, ca); _mz.normalize(); _my.crossVectors(_mz, _mx);
      _mb.makeBasis(_mx, _my, _mz); _mq.setFromRotationMatrix(_mb); _me.setFromQuaternion(_mq, 'YXZ');
      K.mt = mt; K.add(P_BOX(), (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2, L, t, w, col, _me.y, _me.x, _me.z, em); K.mt = null;
    },
    rod(A, B, r, col, mt = 'wood', n = 6, em = 0) { const p = W(...A), q = W(...B); K.mt = mt; K.rod(P_CYL(n), p[0], p[1], p[2], q[0], q[1], q[2], r, col, em); K.mt = null; },
    point(A, B, r, col, mt = 'wood', n = 5, em = 0) { const p = W(...A), q = W(...B); K.mt = mt; K.rod(P_CONE(n), p[0], p[1], p[2], q[0], q[1], q[2], r, col, em); K.mt = null; },   // a cone: its base at A, its point at B
    cyl(f, s, z, r, h, col, mt = 'wood', n = 10, em = 0, rs = r, turn = 0) { put(P_CYL(n), f, s, z, r * 2, h, rs * 2, col, mt, turn, 0, 0, em); },
    cone(f, s, z, r, h, col, mt = 'wood', n = 6, em = 0, turn = 0) { put(P_CONE(n), f, s, z, r * 2, h, r * 2, col, mt, turn, 0, 0, em); },
    ball(f, s, z, l, h, w, col, mt = 'plain', em = 0, turn = 0) { put(P_BALL(), f, s, z, l, h, w, col, mt, turn, 0, 0, em); },   // its middle at z
    rock(f, s, z, l, h, w, col, k = 0, turn = 0, em = 0, mt = 'stone') { put(P_ROCK(((k % 4) + 4) % 4), f, s, z, l, h, w, col, mt, turn, 0, 0, em); },   // its middle at z
    prism(f, s, z, l, h, w, col, mt = 'wood', turn = 0) { put(P_TENT(), f, s, z, l, h / 0.75, w / 0.866, col, mt, turn); },   // a ridge running along l, standing on z
    sag(f, s, z, l, d, w, col, tip = 0) { put(P_SAG(), f, s, z, l, d, w, col, 'cloth', 0, 0, tip); },   // a cloth tied at its corners at z, d deep in the middle
    // a log in its bark, the pale cut wood showing at each end
    log(A, B, r, col, n = 6, cut = MAKE.cut) {
      const p = W(...A), q = W(...B), dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], e = 0.3 / (Math.hypot(dx, dy, dz) || 1);
      K.mt = 'bark'; K.rod(P_CYL(n), p[0], p[1], p[2], q[0], q[1], q[2], r, col); K.mt = 'wood';
      for (const [u, v] of [[p, -1], [q, 1]]) K.rod(P_CYL(n), u[0] - dx * e * v, u[1] - dy * e * v, u[2] - dz * e * v, u[0] + dx * e * v * 0.6, u[1] + dy * e * v * 0.6, u[2] + dz * e * v * 0.6, r * 0.84, cut);
      K.mt = null;
    },
    // an open hoop of short blocks round a circle: a basket's weave, a rim, a ring of stones that you can see into
    hoop(f, s, z, R, h, t, col, mt = 'wood', n = 12, off = 0) {
      for (let k = 0; k < n; k++) { const q = (k + off) / n * TAU; put(P_BOX(), f + Math.cos(q) * R, s + Math.sin(q) * R, z + h / 2, TAU * R / n * 1.1, h, t, Array.isArray(col[0]) ? col[k % col.length] : col, mt, q + Math.PI / 2); }
    },
    // rope wound round a post
    lash(f, s, z, r, h = 1.4) { put(P_CYL(8), f, s, z, (r + 0.35) * 2, h, (r + 0.35) * 2, MAKE.rope, 'cloth'); },
  };
}
const WALL_TOP = ROOF_H - 2.6;   // a full wall, a doorway or a corner post reaches up to the rafters of a roof laid over it, so a room is closed in
const pcRnd = (o, i) => hash(Math.round(o.x * 3.7) + i * 17.3, Math.round(o.y * 2.9) - i * 5.1);   // the same every time for the same piece

// ---------------- your grid pieces: floors, walls, doors, roofs, fences, lights, furniture ----------------
// is there a floor under it? Then a rug or a pelt lies on the boards, not under them
function floorBelow(o) {
  for (const q of stNear(o.x, o.y, GRID)) {
    const Q = PC(q.id); if (Q.lay !== 'floor' || !q.done || q === o) continue;
    const dx = o.x - q.x, dy = o.y - q.y, c = Math.cos(q.a || 0), s = Math.sin(q.a || 0);
    if (Q.sh === 'sq' ? Math.abs(dx * c + dy * s) < GRID / 2 && Math.abs(dy * c - dx * s) < GRID / 2 : Math.hypot(dx, dy) < TRI_IN) return true;
  }
  return false;
}
function pieceKit(K, o) {
  const P = PC(o.id), a = o.a || 0, x = o.x, y = o.y, H = P.H || 36, L = P.L || GRID, M = maker(K, x, y, a, P.lay === 'flat' && floorBelow(o) ? 1.9 : 0), h2 = L / 2;
  if (P.sh === 'sq' || P.sh === 'tri') {
    const roof = P.lay === 'roof', z = roof ? ROOF_H : 0;
    if (!roof && o.clip) { floorClipKit(K, o, tone(P.m)[1], z - 0.5, 2); return; }
    if (P.sh === 'tri') { triKit(K, o, P, z, roof); return; }
    if (roof) roofKit(M, o, P); else floorKit(M, o, P);
    return;
  }
  if (P.sh === 'edge') {
    const k = P.k;
    if (k === 'wall' || k === 'half') wallKit(M, o, P, 0, k === 'wall' ? WALL_TOP : H, -h2, h2);
    else if (k === 'door' || k === 'gate' || k === 'arch') doorKit(K, M, o, P);
    else if (k === 'window') windowKit(M, o, P);
    else if (k === 'fence') {
      for (const f of [-h2 + 1.6, h2 - 1.6]) { M.cyl(f, 0, 0, 1.6, H + 3, MAKE.bark[1], 'bark', 7); M.cyl(f, 0, H + 3, 1.35, 0.3, MAKE.cut, 'wood', 7); }
      for (const z of [6, 14.5]) M.rod([-h2 + 1.6, 0.4, z], [h2 - 1.6, 0.4, z + 0.4], 0.95, MAKE.bark[0], 'bark', 6);
      for (let i = 1; i < 7; i++) { const f = -h2 + i * L / 7, h = H - 1 + 2.2 * pcRnd(o, i); M.cyl(f, -0.9, 0, 0.8, h, MAKE.bark[i % 3], 'bark', 5); M.cone(f, -0.9, h, 0.8, 2.6, MAKE.cut, 'wood', 5); }
    } else if (k === 'palis') {
      for (let i = 0; i < 6; i++) { const f = -h2 + (i + 0.5) * L / 6, h = H - 6 + 4 * hash(o.x + i, o.y), r = L / 12; M.cyl(f, 0, 0, r, h, MAKE.bark[i % 3], 'bark', 7); M.cone(f, 0, h, r, 7, MAKE.cut, 'wood', 7); }
      for (const z of [9, H - 15]) M.box(0, 0, z, L - 0.6, 1.6, L / 6 + 0.7, lit3(MAKE.rope, 0.72), 'cloth');
    } else M.box(0, 0, 0, L, H, 5, tone(P.m)[0]);
    return;
  }
  furnKit(M, o, P);
}

// floors: planks, flagstones, a woven mat. Each is laid in pieces no bigger than a hand's span or two, so it follows the
// ground's own rise and fall instead of lying flat across it with the bumps showing through
function floorKit(M, o, P) {
  const G = GRID;
  if (P.m === 'wood') {   // five boards across, each in lengths butted end to end, the joints staggered from board to board
    for (let i = 0; i < 5; i++) {
      const s = -G / 2 + (i + 0.5) * G / 5, off = [0, 0.5, 0.25, 0.75, 0.4][i] * 14, cuts = [-G / 2];
      for (let f = -G / 2 + off + (off < 4 ? 14 : 0); f < G / 2 - 4; f += 14) cuts.push(f);
      cuts.push(G / 2);
      for (let j = 0; j < cuts.length - 1; j++) { const q = pcRnd(o, i * 9 + j); M.box((cuts[j] + cuts[j + 1]) / 2, s, -0.2 + q * 0.16, cuts[j + 1] - cuts[j] - 0.25, 1.9, G / 5 - 0.12, lit3(MAKE.plank[(i + j) % 3], 0.92 + 0.12 * q)); }
    }
  } else if (P.m === 'stone') {   // flagstones, three by three, each a little out of true, in a bed of mortar
    const q3 = G / 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const f = -G / 2 + (i + 0.5) * q3, s = -G / 2 + (j + 0.5) * q3, q = pcRnd(o, i * 3 + j);
      M.box(f, s, -0.5, q3, 1.6, q3, MAKE.mortar, 'stone');
      M.box(f + (q - 0.5) * 0.6, s - (q - 0.5) * 0.5, 0.1 + q * 0.25, q3 - 1.2 - q * 0.5, 1.3, q3 - 1.5 + q * 0.4, MAKE.stone[(i + j * 2 + Math.floor(q * 4)) % 4], 'stone');
    }
  } else {   // grass matting, woven in squares that turn each way in turn
    const n = 4, c = G / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const f = -G / 2 + (i + 0.5) * c, s = -G / 2 + (j + 0.5) * c, along = (i + j) % 2 === 0;
      M.box(f, s, -0.4, c, 1.4, c, along ? MAKE.straw : lit3(MAKE.straw, 0.86), 'wood', along ? null : { turn: Math.PI / 2 });
      M.box(f, s, 0.9, along ? c - 1 : 0.6, 0.3, along ? 0.6 : c - 1, MAKE.strawD, 'cloth');
    }
  }
}
// roofs: boards overlapped like shingles, thatch in thick courses, slate in rows; the rafters under each, for inside
function roofKit(M, o, P) {
  const G = GRID, z = ROOF_H;
  for (const s of [-G / 4, G / 4]) M.box(0, s, z - 2.6, G - 0.2, 2.6, 2.4, MAKE.dark);   // the rafters
  if (P.m === 'thatch') {
    M.box(0, 0, z, G, 2.2, G, MAKE.strawD, 'wood');
    for (let i = 0; i < 4; i++) M.box(-G / 2 + (i + 0.5) * G / 4, 0, z + 1.6, G / 4 + 2, 2.4, G, i % 2 ? MAKE.straw : lit3(MAKE.straw, 0.92), 'wood', { tip: -0.1 });
  } else if (P.m === 'stone') {
    M.box(0, 0, z, G, 1.4, G, MAKE.board);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const f = -G / 2 + (i + 0.5) * G / 4, s = -G / 2 + (j + 0.5 + (i % 2 ? 0.25 : -0.25)) * G / 3, w = G / 3 - 0.6;
      if (Math.abs(s) + w / 2 > G / 2 + 0.1) { const s0 = Math.max(-G / 2, s - w / 2), s1 = Math.min(G / 2, s + w / 2); M.box(f, (s0 + s1) / 2, z + 1.1, G / 4 + 1.6, 1.3, s1 - s0 - 0.3, lit3(MAKE.slate, 0.9 + 0.2 * pcRnd(o, i * 3 + j)), 'stone', { tip: -0.07 }); }
      else M.box(f, s, z + 1.1, G / 4 + 1.6, 1.3, w, lit3(MAKE.slate, 0.9 + 0.2 * pcRnd(o, i * 3 + j)), 'stone', { tip: -0.07 });
    }
  } else {
    M.box(0, 0, z, G, 1.2, G, MAKE.board);
    for (let i = 0; i < 4; i++) M.box(-G / 2 + (i + 0.5) * G / 4, 0, z + 0.9, G / 4 + 1.6, 1.5, G, MAKE.plank[(i + Math.floor(pcRnd(o, i) * 3)) % 3], 'wood', { tip: -0.08 });
  }
}
// the corner pieces: a triangle, its edge a shade darker
function triKit(K, o, P, z, roof) {
  const a = o.a || 0, c = P.m === 'stone' ? (roof ? MAKE.slate : MAKE.mortar) : P.m === 'thatch' ? MAKE.strawD : roof ? MAKE.board : MAKE.dark, top = P.m === 'stone' ? (roof ? MAKE.slate : MAKE.stone[0]) : P.m === 'thatch' ? MAKE.straw : MAKE.plank[0];
  K.mt = P.m === 'stone' ? 'stone' : 'wood';
  K.add(P_CYL(3), o.x, z - 0.5, o.y, TRI_R * 2, roof ? 2.6 : 1.6, TRI_R * 2, c, Math.PI / 2 - a);
  K.add(P_CYL(3), o.x, z + (roof ? 1.8 : 0.9), o.y, TRI_R * 1.8, roof ? 2 : 0.6, TRI_R * 1.8, top, Math.PI / 2 - a);
  K.mt = null;
}

// a run of wall from f0 to f1, z0 to z1: logs, stone courses, iron-bound planks, or thatch on a frame
function wallKit(M, o, P, z0, z1, f0, f1) {
  const Hh = z1 - z0, Ln = f1 - f0, fm = (f0 + f1) / 2;
  if (P.m === 'wood') {
    const n = Math.max(1, Math.round(Hh / 7.2)), r = Hh / (2 * n) * 1.05, step = n > 1 ? (Hh - 2 * r) / (n - 1) : 0;
    for (let i = 0; i < n; i++) { const z = z0 + r + i * step, rr = r * (0.96 + 0.06 * pcRnd(o, i)); M.log([f0, 0, z], [f1, 0, z], rr, MAKE.bark[(i + Math.floor(pcRnd(o, 9) * 3)) % 3]); }
  } else if (P.m === 'stone' && P.k === 'half') {   // dry stone: fieldstones packed in two rows without mortar, flat stones laid along the top
    M.box(fm, 0, z0, Ln - 0.4, Hh - 2, 5, MAKE.mortar, 'stone');
    const n = Math.max(2, Math.round(Ln / 7.6)), w = Ln / n;
    for (let row = 0; row < 2; row++) for (let i = 0; i < n + row; i++) {
      const q = pcRnd(o, row * 37 + i), f = Math.min(f1 - w * 0.35, Math.max(f0 + w * 0.35, f0 + (i + (row ? 0 : 0.5)) * w)), hz = (Hh - 3) / 2;
      M.rock(f, (q - 0.5) * 0.8, z0 + hz * (row + 0.5) + 0.4, w * (row && (i === 0 || i === n) ? 0.7 : 1.18), hz * 1.25, 6.6 + q, MAKE.stone[(i + row * 2 + Math.floor(q * 4)) % 4], i + row, q * 0.6 - 0.3);
    }
    for (let i = 0; i < n; i++) { const q = pcRnd(o, 90 + i); M.rock(f0 + (i + 0.5) * w, 0, z1 - 1.6, w * 1.12, 3.4, 7.6 + q * 0.6, MAKE.stone[(i + 2) % 4], i + 2, (q - 0.5) * 0.3); }
  } else if (P.m === 'stone') {
    M.box(fm, 0, z0, Ln, Hh, 6.2, MAKE.mortar, 'stone');
    const n = Math.max(1, Math.round(Hh / 9)), ch = Hh / n, bl = 14;
    for (let i = 0; i < n; i++) {
      const zc = z0 + i * ch, off = (i + Math.round((o.x + o.y) * 0.01)) % 2 ? bl / 2 : 0, cuts = [f0];
      for (let f = f0 + (off || bl); f < f1 - 2; f += bl) cuts.push(f);
      cuts.push(f1);
      for (let j = 0; j < cuts.length - 1; j++) { const u = cuts[j], v = cuts[j + 1], q = pcRnd(o, i * 7 + j); M.box((u + v) / 2, (q - 0.5) * 0.4, zc + 0.3, v - u - 0.8, ch - 0.7, 6.9 + q * 0.5, MAKE.stone[(i + j + Math.floor(q * 4)) % 4], 'stone'); }
    }
  } else if (P.m === 'iron') {
    for (let i = 0; i < 7; i++) { const w = Ln / 7; M.box(f0 + (i + 0.5) * w, 0, z0, w - 0.35, Hh, 5.2, MAKE.plank[(i + 1) % 3]); }
    for (const z of [z0 + 5, z1 - 9]) {
      M.box(fm, 0, z, Ln - 0.4, 4, 6, MAKE.iron, 'metal');
      for (let j = 0; j < 4; j++) for (const sd of [-1, 1]) M.box(f0 + (j + 0.5) * Ln / 4, sd * 3.05, z + 1.4, 1, 1.2, 0.3, MAKE.ironL, 'metal');
    }
    M.box(fm, 0, z1 - 1.2, Ln - 0.4, 1.4, 6.2, MAKE.ironD, 'metal');
  } else {   // thatch: upright bundles of straw on a pole frame, tied across
    for (const f of [f0 + 1.6, f1 - 1.6]) M.cyl(f, 0, z0, 1.7, Hh + 1, MAKE.bark[1], 'bark', 7);
    const n = Math.max(2, Math.round(Ln / 7));
    for (let i = 0; i < n; i++) { const w = (Ln - 3) / n, f = f0 + 1.5 + (i + 0.5) * w, h = Hh - 1.5 + 1.8 * pcRnd(o, i); M.box(f, 0, z0, w + 0.25, h, 4.4, i % 2 ? MAKE.straw : lit3(MAKE.straw, 0.9), 'wood'); }
    for (const z of [z0 + Hh * 0.22, z0 + Hh * 0.55, z0 + Hh * 0.85]) for (const sd of [-1, 1]) M.box(fm, sd * 2.35, z, Ln - 2.6, 1, 0.5, MAKE.strawD, 'cloth');
  }
}

// a doorway: its frame, and the door (or gate leaves) swung open by o.open
function doorKit(K, M, o, P) {
  const L = P.L || GRID, h2 = L / 2, k = P.k, H = k === 'gate' ? P.H || 44 : WALL_TOP, open = o.open || 0, stone = P.m === 'stone';
  if (k === 'gate') {
    for (const f of [-h2 + 3, h2 - 3]) { M.cyl(f, 0, 0, 3.2, H + 5, MAKE.bark[0], 'bark', 8); M.cone(f, 0, H + 5, 3.2, 5, MAKE.cut, 'wood', 8); M.lash(f, 0, H - 6, 3.2); M.lash(f, 0, 8, 3.2); }
    M.log([-h2 + 3, 0, H + 1], [h2 - 3, 0, H + 1], 2.2, MAKE.bark[2]);
    for (const sd of [-1, 1]) {
      const [hx, hy] = M.at(sd * (h2 - 6.5), 0), dir = sd < 0 ? M.a + open * 1.3 : M.a + Math.PI - open * 1.3, w = h2 - 7, G = maker(K, hx, hy, dir), n = 5;
      for (let i = 0; i < n; i++) { const f = (i + 0.5) * w / n, h = H - 6 + (i % 2) * 1.5, rf = w / n / 2 + 0.1; G.cyl(f, 0, 1, rf, h, MAKE.bark[(i + (sd > 0 ? 1 : 0)) % 3], 'bark', 8, 0, 2.2); G.cyl(f, 0, h + 1, rf * 0.84, 0.3, MAKE.cut, 'wood', 8, 0, 1.85); }
      for (const z of [7, H - 14]) G.box(w / 2, 2.9, z, w, 2.6, 1.4, MAKE.plank[1]);
      G.slab([1.5, 2.75, 9], [w - 1.5, 2.75, H - 15], 2.4, 1.2, MAKE.plank[2]);
      for (const z of [7.6, H - 13.4]) G.box(2.4, 3.75, z, 5, 1.4, 0.4, MAKE.ironD, 'metal');
    }
    return;
  }
  // the frame: two posts and a lintel, a sill at the foot; stone is laid in blocks, alternately long and short
  if (stone) {
    for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const w = i % 2 ? 6 : 8.4, hb = (H - 5) / 4; M.box(sd * (h2 - w / 2), 0, i * hb, w, hb - 0.5, 7.4, MAKE.stone[(i + (sd > 0 ? 2 : 0)) % 4], 'stone'); }
    M.box(0, 0, H - 5, L, 5, 7.8, MAKE.stone[2], 'stone');
  } else {
    for (const sd of [-1, 1]) M.box(sd * (h2 - 2.2), 0, 0, 4.4, H - 4, 5.6, MAKE.trim);
    M.box(0, 0, H - 4.4, L, 4.4, 6.2, MAKE.trim);
    if (k === 'arch') for (const sd of [-1, 1]) M.slab([sd * (h2 - 4.4), 0, H - 13], [sd * (h2 - 13), 0, H - 4.4], 2.6, 2.2, MAKE.plank[1]);   // knee braces in the corners
    if (P.m === 'iron') for (const sd of [-1, 1]) for (const ss of [-1, 1]) M.box(sd * (h2 - 2.2), ss * 2.85, 0, 4.6, H - 4, 0.4, MAKE.ironD, 'metal');
  }
  M.box(0, 0, 0, L - 4, 0.8, 6, stone ? MAKE.stone[1] : MAKE.dark, stone ? 'stone' : 'wood');
  if (k !== 'door') return;
  // the door: hung on the left post, swinging out to +s
  const fi = stone ? 8.4 : 4.4, w = L - fi * 2 - 0.6, hd = H - (stone ? 5 : 4.4) - 1.1;
  const [hx, hy] = M.at(-h2 + fi + 0.3, 0), D = maker(K, hx, hy, M.a + open * 1.4);
  if (P.m === 'iron') {
    D.box(w / 2, 0, 0.9, w, hd, 2.6, MAKE.iron, 'metal');
    for (const z of [5, hd / 2, hd - 4]) D.box(w / 2, 0, z, w, 2.4, 3, MAKE.ironD, 'metal');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) for (const sd of [-1, 1]) D.box(w * (i + 1) / 4, sd * 1.4, 3 + j * (hd - 6) / 3, 1, 1, 0.5, MAKE.ironL, 'metal');
  } else {
    const n = 4;
    for (let i = 0; i < n; i++) D.box((i + 0.5) * w / n, 0, 0.9, w / n - 0.3, hd, 2.2, MAKE.plank[(i + 1) % 3]);
    for (const z of [5, hd - 8]) D.box(w / 2, 1.6, z, w - 1.6, 2.6, 1, MAKE.plank[0]);
    D.slab([2, 1.5, 7.5], [w - 2, 1.5, hd - 8], 2.4, 0.9, MAKE.plank[0]);
    for (const z of [5.4, hd - 7.6]) D.box(4.5, stone ? 2.25 : 2.2, z, 9, 1.6, 0.4, MAKE.ironD, 'metal');   // strap hinges
    if (stone) for (const z of [hd * 0.38, hd * 0.68]) D.box(w / 2, -1.25, z, w, 1.8, 0.4, MAKE.ironD, 'metal');
  }
  for (const sd of [-1, 1]) { D.cyl(w - 3.4, sd * 1.6, 17.5, 0.5, 1.2, MAKE.ironD, 'metal', 6); D.box(w - 3.4, sd * 2, 15.6, 0.5, 2.6, 0.5, MAKE.ironL, 'metal'); }   // the latch ring each side
}

// a window: wall below and above in the same make as the walls, a frame round the gap; wood has shutters, stone has slits
function windowKit(M, o, P) {
  const L = P.L || GRID, h2 = L / 2, H = WALL_TOP, z0 = (P.H || 42) * 0.42, z1 = (P.H || 42) * 0.78;
  if (P.m === 'stone') {
    wallKit(M, o, P, 0, z0, -h2, h2); wallKit(M, o, P, z1 + 1.6, H, -h2, h2);
    M.box(0, 0, z0, L, 1.6, 8, MAKE.stone[2], 'stone'); M.box(0, 0, z1, L, 1.8, 8, MAKE.stone[2], 'stone');   // the sill and lintel
    const n = 3, ws = 5.6, gap = (L - (n + 1) * ws) / n;
    for (let i = 0; i <= n; i++) { const f = -h2 + ws / 2 + i * (ws + gap); M.box(f, 0, z0 + 1.6, ws, z1 - z0 - 1.6, 7.2, MAKE.stone[i % 4], 'stone'); }
    return;
  }
  wallKit(M, o, P, 0, z0, -h2, h2); wallKit(M, o, P, z1 + 2, H, -h2, h2);
  for (const sd of [-1, 1]) M.box(sd * (h2 - 2.2), 0, z0, 4.4, z1 - z0 + 2, 6, MAKE.trim);
  M.box(0, 0, z0 - 0.6, L - 2, 1.8, 8, MAKE.plank[0]); M.box(0, 0, z1, L - 2, 2, 6.4, MAKE.trim);
  M.box(0, 0, z0 + 1.2, 1.2, z1 - z0 - 1.2, 1.2, MAKE.trim);
  // the shutter, hung from the top of the frame and propped open outside like an awning
  const n = 4, wb = (L - 9) / n;
  for (let i = 0; i < n; i++) M.slab([-h2 + 4.5 + (i + 0.5) * wb, 3.4, z1 + 1.4], [-h2 + 4.5 + (i + 0.5) * wb, 12.4, z1 - 3.4], wb - 0.3, 1, MAKE.plank[i % 3]);
  for (const f of [-h2 + 7, h2 - 7]) M.slab([f, 11.6, z1 - 2.6], [f, 3.6, z1 + 0.6], 1.6, 0.9, MAKE.trim);
  for (const sd of [-1, 1]) M.rod([sd * (h2 - 9), 4, z0 + 1.2], [sd * (h2 - 9), 11.6, z1 - 3.6], 0.45, MAKE.trim, 'wood', 5);
}

// posts, lights, defences, furniture and decoration
function furnKit(M, o, P) {
  const k = P.k, r = P.r || 6, H = P.H || 10, mz = 26;   // mz: on a wall, about chest height. The wall's face is 2 to 4 behind the spot, so what's mounted reaches back 4
  switch (k) {
    case 'post': M.cyl(0, 0, 0, r * 0.72, WALL_TOP, MAKE.bark[0], 'bark', 9); M.cyl(0, 0, WALL_TOP, r * 0.6, 0.35, MAKE.cut, 'wood', 9); for (const z of [8, WALL_TOP - 7]) M.lash(0, 0, z, r * 0.72); break;
    case 'pillar': {
      const w = r * 1.6, H = WALL_TOP;
      M.box(0, 0, 0, w + 2, 3, w + 2, MAKE.stone[1], 'stone');
      for (let i = 0; i < 4; i++) { const q = pcRnd(o, i); M.box((q - 0.5) * 0.6, (0.5 - q) * 0.6, 3 + i * (H - 6) / 4, w - q * 0.6, (H - 6) / 4 - 0.5, w - (1 - q) * 0.6, MAKE.stone[i % 4], 'stone'); }
      M.box(0, 0, H - 3, w + 2.4, 3, w + 2.4, MAKE.stone[2], 'stone');
      break;
    }
    case 'stakes': {   // stakes crossed through a log, sharpened both ways
      M.log([0, -13, 7.5], [0, 13, 7.5], 2.2, MAKE.bark[1]);
      for (const s of [-10, -3.4, 3.4, 10]) for (const sd of [-1, 1]) {
        const A = [-sd * 11, s, 0], B = [sd * 12, s + sd * 0.6, 17 + 2 * pcRnd(o, s + sd)], m = 0.86, C = [A[0] + (B[0] - A[0]) * m, A[1] + (B[1] - A[1]) * m, A[2] + (B[2] - A[2]) * m];
        M.rod(A, C, 1.25, MAKE.bark[(s > 0) + (sd > 0)], 'bark', 6); M.point(C, B, 1.25, MAKE.cut, 'wood', 6);
      }
      for (const s of [-10, -3.4, 3.4, 10]) M.lash(0, s, 6.6, 2.1, 2.2);
      break;
    }
    case 'spikeF': {   // a shallow pit with sharpened stakes in it, the points just showing through a scatter of leaves
      const w = r * 1.7, c = w / 3;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M.box(-w / 2 + (i + 0.5) * c, -w / 2 + (j + 0.5) * c, -0.3, c, 0.8, c, MAKE.soilD, 'plain');
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { const u = -w / 2 + (i + 0.5) * c; M.box(sd * (w / 2 + 0.6), u, 0, 2.4, 1.2, c + 1.2, MAKE.soil, 'plain'); M.box(u, sd * (w / 2 + 0.6), 0, c + 1.2, 1.2, 2.4, MAKE.soil, 'plain'); }
      for (let i = 0; i < 12; i++) { const f = ((i % 4) - 1.5) * r * 0.4, s = (Math.floor(i / 4) - 1) * r * 0.5 + (i % 2) * 1.6, q = pcRnd(o, i), h = 7 + 2.5 * q; M.rod([f, s, 0], [f + (q - 0.5) * 1.2, s + (0.5 - q) * 0.8, h - 3], 1.05, MAKE.bark[i % 3], 'bark', 5); M.point([f + (q - 0.5) * 1.2, s + (0.5 - q) * 0.8, h - 3], [f + (q - 0.5) * 2, s + (0.5 - q) * 1.4, h], 1.05, MAKE.cut, 'wood', 5); }
      for (let i = 0; i < 8; i++) { const q = pcRnd(o, i + 20); M.box((q - 0.5) * w * 0.8, (pcRnd(o, i + 30) - 0.5) * w * 0.8, 0.5, 3.6, 0.3, 2.2, i % 2 ? MAKE.leaf : hex('#8a6a3a'), 'plant', { turn: q * 3 }); }
      break;
    }
    case 'thorns': {   // a bramble hedge: dark leafy clumps along it, thorny canes arching up out of them, a few dark berries
      for (let i = 0; i < 6; i++) { const f = (i - 2.5) * r * 0.32, s = (i % 2 ? 1 : -1) * 2.2, q = pcRnd(o, i); M.rock(f, s, 4.6 + q, 11 + 3 * q, 9 + 2 * q, 11, i % 2 ? MAKE.leafD : MAKE.leaf, i, q * 2, 0, 'plant'); }
      for (let i = 0; i < 10; i++) {
        const q = pcRnd(o, i + 40), f = (i - 4.5) * r * 0.2, sd = i % 2 ? 1 : -1, A = [f, sd * 2, 7], Bp = [f + (q - 0.5) * 6, sd * (5 + 2 * q), 13 + 3 * q], C = [f + (q - 0.5) * 9, sd * (8 + 2 * q), 9 + 2 * q];
        M.rod(A, Bp, 0.45, hex('#6a3a2a'), 'bark', 4); M.rod(Bp, C, 0.38, hex('#6a3a2a'), 'bark', 4);
        for (const [u, v] of [[A, Bp], [Bp, C]]) { const m = [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2, (u[2] + v[2]) / 2]; M.point(m, [m[0], m[1] + sd * 1.2, m[2] + 0.6], 0.3, hex('#c8b890'), 'plain', 3); }
      }
      for (let i = 0; i < 5; i++) { const q = pcRnd(o, i + 60); M.rock((i - 2) * r * 0.28, (q - 0.5) * 8, 9.6 + q * 2, 1.7, 1.7, 1.7, hex('#4a2238'), i, 0, 0, 'plain'); }
      break;
    }
    case 'chimes': {   // a crook post with bones hung from its arm on cords
      M.cyl(0, 0, 0, 1.6, H, MAKE.bark[0], 'bark', 7); M.cyl(0, 0, H, 1.35, 0.3, MAKE.cut, 'wood', 7);
      M.rod([0, 0, H - 3], [13, 0, H - 3], 0.9, MAKE.bark[1], 'bark', 6); M.rod([0, 0, H - 11], [6, 0, H - 3.2], 0.7, MAKE.bark[2], 'bark', 5);
      for (let i = 0; i < 4; i++) {
        const f = 4.5 + i * 2.7, ln = 6 + (i % 2) * 3.5, zb = H - 3 - ln;
        M.rod([f, 0, H - 3], [f, 0, zb], 0.15, MAKE.rope, 'cloth', 4);
        M.cyl(f, 0, zb - 6, 0.65, 6, MAKE.bone, 'plain', 6); M.rock(f, 0, zb - 6, 1.9, 1.5, 1.6, MAKE.bone, i, 0, 0, 'plain'); M.rock(f, 0, zb, 1.7, 1.4, 1.6, MAKE.boneD, i + 1, 0, 0, 'plain');
      }
      M.lash(0, 0, H - 4, 1.6, 2);
      break;
    }
    case 'sconce': {   // an iron bracket on the wall holding a torch, its rag burning at dusk
      const night = dayLight() < 0.85;
      M.box(0, -3.2, 21, 3.4, 9, 1.8, MAKE.ironD, 'metal');
      M.rod([0, -2.6, 23.4], [0, 2.8, 26.2], 0.45, MAKE.iron, 'metal', 5);
      M.cyl(0, 3, 25.4, 1.5, 2.4, MAKE.iron, 'metal', 8);
      M.rod([0, 2.9, 23.6], [0, 3.4, 30], 0.7, MAKE.trim, 'wood', 6);
      M.cyl(0, 3.4, 29.2, 1.2, 3, night ? MAKE.ember : hex('#4a3a2a'), 'cloth', 7, night ? 0.85 : 0);
      break;
    }
    case 'lamp': {   // a lantern hung from a post's arm, lit at dusk
      const night = dayLight() < 0.85;
      M.cyl(0, 0, 0, 1.9, H, MAKE.bark[0], 'bark', 8); M.cyl(0, 0, H, 1.6, 0.3, MAKE.cut, 'wood', 8);
      for (let i = 0; i < 3; i++) { const t = i * 2.1 + 0.5; M.rock(Math.cos(t) * 3.2, Math.sin(t) * 3.2, 1, 3.4, 2.6, 3, MAKE.stone[i], i, t); }
      M.rod([0, 0, H - 3], [10, 0, H - 3], 0.8, MAKE.bark[1], 'bark', 6); M.rod([0, 0, H - 10], [5.5, 0, H - 3.2], 0.6, MAKE.bark[2], 'bark', 5); M.lash(0, 0, H - 4, 1.9, 2);
      M.rod([8, 0, H - 3], [8, 0, H - 5.4], 0.2, MAKE.ironD, 'metal', 4);
      M.box(8, 0, H - 13, 5.6, 0.8, 5.6, MAKE.ironD, 'metal');
      M.box(8, 0, H - 12.2, 4.2, 5.6, 4.2, night ? MAKE.glow : hex('#d8c8a0'), 'plain', { em: night ? 0.95 : 0.15 });
      for (const [f, s] of [[-2.3, -2.3], [2.3, -2.3], [2.3, 2.3], [-2.3, 2.3]]) M.box(8 + f, s, H - 12.4, 0.6, 6, 0.6, MAKE.ironD, 'metal');
      M.cone(8, 0, H - 6.6, 3.9, 2.4, MAKE.ironD, 'metal', 4, 0, Math.PI / 4);
      break;
    }
    case 'brazier': {   // a stone bowl of coals on a stone foot
      const night = dayLight() < 0.85;
      M.cyl(0, 0, 0, 4.6, 2, MAKE.stone[1], 'stone', 8); M.cyl(0, 0, 2, 3, 6.4, MAKE.stone[3], 'stone', 8);
      M.cyl(0, 0, 8, 6.2, 2.6, MAKE.stone[0], 'stone', 10); M.cyl(0, 0, 10.4, 8.4, 2.4, MAKE.stone[2], 'stone', 12);
      M.cyl(0, 0, 12.6, 7.4, 0.6, MAKE.soot, 'plain', 12);
      M.hoop(0, 0, 12.6, 8, 1.8, 1.4, [MAKE.stone[0], MAKE.stone[1]], 'stone', 12);
      for (let i = 0; i < 6; i++) { const t = i * 1.05, R = i ? 3.8 : 0; M.rock(Math.cos(t) * R, Math.sin(t) * R, 13.6, 3.4, 2, 3, night ? MAKE.ember : hex('#3a2a22'), i, t, night ? 0.9 : 0.12, 'plain'); }
      break;
    }
    case 'candles': {   // three candles on a wooden dish, the tall one in the middle
      const night = dayLight() < 0.85;
      M.cyl(0, 0, 0, 4.6, 0.9, MAKE.trim, 'wood', 10);
      for (const [f, s, h] of [[0, 0, 6.6], [2.6, 1.4, 4.4], [-1.2, -2.7, 3.2]]) {
        M.cyl(f, s, 0.9, 0.95, h, MAKE.bone, 'plain', 7); M.rock(f + 0.5, s + 0.3, 1.4, 1.6, 1.1, 1.4, MAKE.bone, h, 0, 0, 'plain');
        M.cyl(f, s, 0.9 + h, 0.12, 0.6, MAKE.soot, 'plain', 4);
        if (night) M.cone(f, s, 1.4 + h, 0.5, 1.6, MAKE.glow, 'plain', 5, 1);
      }
      break;
    }
    case 'bed': {   // a plank frame, a straw mattress, a pillow and a fur thrown over it
      for (const [f, s] of [[-17, -8.6], [17, -8.6], [17, 8.6], [-17, 8.6]]) M.box(f, s, 0, 2.4, f > 0 ? 15 : 7.6, 2.4, MAKE.trim);
      for (const s of [-8.6, 8.6]) M.box(0, s, 2.6, 32, 3, 1.6, MAKE.plank[1]);
      M.box(-17, 0, 2.6, 1.6, 3, 15, MAKE.plank[1]); M.box(17.2, 0, 3, 1.2, 10.4, 15, MAKE.plank[0]); M.box(17.2, 0, 13.4, 1.8, 1.6, 17.6, MAKE.trim);
      M.box(0, 0, 4.2, 32.6, 3.4, 15.6, MAKE.ticking, 'cloth');
      M.ball(12.4, 0, 8.4, 6.6, 3, 11, hex('#e8e0cc'), 'cloth');
      M.box(-5, 0, 7.5, 21, 1.1, 16.4, MAKE.hide, 'cloth');
      for (const sd of [-1, 1]) M.slab([-5, sd * 8.2, 8.1], [-5, sd * 9.2, 3.6], 21, 0.9, MAKE.hideD, 'cloth');
      break;
    }
    case 'table': {
      for (const [f, s] of [[-11.6, -5.6], [11.6, -5.6], [11.6, 5.6], [-11.6, 5.6]]) M.box(f, s, 0, 2.2, 13.6, 2.2, MAKE.trim);
      for (const s of [-5.6, 5.6]) M.box(0, s, 11.4, 21, 2.2, 1.2, MAKE.plank[1]);
      for (const f of [-11.6, 11.6]) M.box(f, 0, 11.4, 1.2, 2.2, 9, MAKE.plank[1]);
      M.box(0, 0, 3.4, 21, 1.4, 1.4, MAKE.trim); for (const f of [-11.6, 11.6]) M.box(f, 0, 3.4, 1.4, 1.4, 9, MAKE.trim);
      for (let i = 0; i < 3; i++) M.box(0, -5.4 + i * 5.4, 13.6, 28, 2.4, 5.2, MAKE.plank[i]);
      M.cyl(-4, 2, 16, 2.6, 1.4, MAKE.trim, 'wood', 9); M.cyl(-4, 2, 16.2, 2, 1.3, MAKE.dark, 'wood', 9);
      M.cyl(5, -3, 16, 1.2, 2.6, MAKE.clay, 'stone', 7);
      break;
    }
    case 'stool': {   // a log round on three splayed legs
      for (let i = 0; i < 3; i++) { const t = i * 2.094 + 0.3; M.rod([Math.cos(t) * 2.4, Math.sin(t) * 2.4, 8.2], [Math.cos(t) * 4.6, Math.sin(t) * 4.6, 0], 0.75, MAKE.trim, 'wood', 5); }
      M.cyl(0, 0, 7.6, 5, 2.2, MAKE.bark[0], 'bark', 10); M.cyl(0, 0, 9.8, 4.4, 0.35, MAKE.cut, 'wood', 10);
      break;
    }
    case 'seat': {   // a plank on two splayed trestles
      for (const f of [-10.5, 10.5]) { for (const sd of [-1, 1]) M.slab([f, sd * 1.4, 8], [f + Math.sign(f), sd * 3.6, 0], 2, 1.6, MAKE.trim); M.box(f, 0, 6.4, 1.8, 1.6, 7.4, MAKE.trim); }
      M.box(0, 0, 3.2, 21, 1.4, 1.4, MAKE.trim);
      M.box(0, 0, 8, 28, 2.2, 8, MAKE.plank[0]);
      break;
    }
    case 'shelf': {   // a plank on two brackets, against the wall, with pots and a jar on it
      M.box(0, 0.5, mz + 2, 22, 1.6, 8.6, MAKE.plank[0]);
      for (const f of [-8, 8]) { M.box(f, -3.1, mz - 5, 1.6, 7, 1.8, MAKE.trim); M.slab([f, -2.4, mz - 4.4], [f, 3.6, mz + 1.8], 1.4, 1, MAKE.trim); }
      M.cyl(-6, 1, mz + 3.6, 2, 3.4, MAKE.clay, 'stone', 8); M.cyl(-6, 1, mz + 7, 1.4, 1, lit3(MAKE.clay, 0.8), 'stone', 8);
      M.cyl(0, 1.2, mz + 3.6, 1.6, 4.6, MAKE.straw, 'stone', 8); M.cyl(0, 1.2, mz + 8.2, 1.7, 0.7, MAKE.trim, 'wood', 8);
      M.cyl(6, 1.2, mz + 3.6, 2.4, 1.3, MAKE.trim, 'wood', 9);
      break;
    }
    case 'wrack': {   // a stand of spears and an axe, their butts in the foot rail and their shafts leant on the top rail
      for (const f of [-10, 10]) { M.box(f, 0, 0, 2.2, 20, 2.2, MAKE.trim); M.box(f, 0, 0, 2.6, 1.4, 9, MAKE.dark); }
      M.box(0, -0.6, 16.6, 22.4, 2, 2.4, MAKE.plank[1]); M.box(0, 2.2, 1.4, 20, 1.8, 3.6, MAKE.plank[1]);
      for (let m = 0; m < 3; m++) { const f = -6 + m * 6, A = [f, 2.6, 2], B = [f + 0.8, -2.6, 31]; M.rod(A, B, 0.6, hex('#8a6a44'), 'wood', 5); M.lash(f + 0.75, -2.3, 29.2, 0.55, 1.4); M.point([f + 0.82, -2.7, 31.2], [f + 0.95, -3.4, 37.6], 1.1, MAKE.ironL, 'metal', 4); }
      { const A = [8, 2.6, 2], B = [8.5, -1.6, 22]; M.rod(A, B, 0.7, hex('#8a6a44'), 'wood', 5); M.slab([8.6, -1.9, 23.4], [8.6, -3, 19], 4.6, 0.8, MAKE.ironL, 'metal'); }
      break;
    }
    case 'barrel': barrelKit(M, 0, 0, 0, 7.4, H, 'lid'); break;
    case 'crate': {   // planked, framed at the edges, braced across each side
      M.box(0, 0, 0, 15.4, 13.6, 15.4, MAKE.plank[1]);
      for (const [f, s] of [[-7.4, -7.4], [7.4, -7.4], [7.4, 7.4], [-7.4, 7.4]]) M.box(f, s, 0, 1.8, 14, 1.8, MAKE.trim);
      for (const z of [0, 12.4]) for (const sd of [-1, 1]) { M.box(sd * 7.4, 0, z, 1.8, 1.6, 15.4, MAKE.trim); M.box(0, sd * 7.4, z, 15.4, 1.6, 1.8, MAKE.trim); }
      for (const sd of [-1, 1]) { M.slab([-6.4, sd * 7.85, 1.6], [6.4, sd * 7.85, 12.4], 1.8, 0.8, MAKE.plank[0]); M.slab([sd * 7.85, -6.4, 1.6], [sd * 7.85, 6.4, 12.4], 1.8, 0.8, MAKE.plank[0]); }
      break;
    }
    case 'rug': {   // grass woven in bands, fringed at the ends
      for (const sf of [-1, 1]) for (const ss of [-1, 1]) M.box(sf * 9, ss * 6, 0.1, 18, 0.7, 12, hex('#b8483c'), 'cloth');   // in quarters, so it lies on the ground's bumps
      M.box(0, 0, 0.5, 28, 0.6, 17, hex('#e2c070'), 'cloth'); M.box(0, 0, 0.8, 24, 0.6, 13, hex('#b8483c'), 'cloth');
      for (const f of [-8, 0, 8]) M.box(f, 0, 1.1, 1.6, 0.4, 13, hex('#7e2c24'), 'cloth');
      for (const sd of [-1, 1]) for (let i = 0; i < 7; i++) M.box(sd * 19.2, -9 + i * 3, 0.1, 2.6, 0.4, 1, hex('#e2c070'), 'cloth');
      break;
    }
    case 'pelt': {   // a hide laid out: its body, four legs and the head
      M.cyl(0, 0, 0.3, 13.6, 0.6, 8.6, MAKE.hideD, 'cloth', 14); M.cyl(0, 0, 0.6, 12.6, 0.7, 7.6, MAKE.hide, 'cloth', 14);
      for (const [f, s] of [[-8, -8], [8, -8], [8, 8], [-8, 8]]) M.box(f, s, 0.3, 8, 0.6, 3.4, MAKE.hideD, 'cloth', { turn: Math.sign(s) * Math.sign(f) * 0.9 });
      M.cyl(14.4, 0, 0.3, 3.6, 0.7, 3, MAKE.hideD, 'cloth', 8); M.box(-14.6, 0, 0.3, 5, 0.6, 2, MAKE.hideD, 'cloth');
      break;
    }
    case 'woodpile': {   // split logs stacked between stakes, their pale ends towards you
      const L3 = [[-6, 3], [0, 3], [6, 3], [-3, 8.3], [3, 8.3], [0, 13.6]];
      L3.forEach(([s, z], i) => M.log([-9, s, z], [9, s + (pcRnd(o, i) - 0.5) * 0.6, z], 2.9, MAKE.bark[i % 3], 7));
      for (const sd of [-1, 1]) for (const f of [-6, 6]) M.cyl(f, sd * 10, 0, 0.9, 13 + (f > 0 ? 1 : 0), MAKE.bark[1], 'bark', 5);
      break;
    }
    case 'banner': {   // your colours: a cloth hung from a crosspiece at the top of a pole, a pale ring on it
      M.cyl(0, 0, 0, 1.2, H, MAKE.bark[0], 'bark', 7); M.point([0, 0, H], [0, 0, H + 4], 1.2, MAKE.ironL, 'metal', 4);
      M.rod([-1, 0, H - 3], [13.6, 0, H - 3], 0.6, MAKE.bark[1], 'bark', 5); M.lash(0, 0, H - 4, 1.2);
      M.box(6.8, 0, H - 24, 12, 20.6, 0.6, MAKE.cloth, 'cloth');
      for (const sd of [-1, 1]) M.slab([6.8 + sd * 3, 0, H - 24], [6.8 + sd * 4.6, 0, H - 28.4], 2.8, 0.6, MAKE.cloth, 'cloth');
      M.rod([6.8, -0.5, H - 13], [6.8, 0.5, H - 13], 3.3, MAKE.gold, 'cloth', 10); M.rod([6.8, -0.6, H - 13], [6.8, 0.6, H - 13], 2.1, MAKE.cloth, 'cloth', 10);
      break;
    }
    case 'trophy': {   // a deer's skull and antlers on a board, on the wall
      M.box(0, -2.8, mz + 2, 7, 10, 2.2, MAKE.trim);
      M.rock(0, -0.6, mz + 7.6, 4.4, 4.4, 3.6, MAKE.bone, 1, 0, 0, 'plain');
      M.point([0, 0.4, mz + 6.6], [0, 5.4, mz + 3.4], 1.7, MAKE.bone, 'plain', 5);
      for (const sd of [-1, 1]) {
        M.box(sd * 1.2, 1.2, mz + 7.4, 0.9, 0.9, 0.4, MAKE.soot, 'plain');
        const b0 = [sd * 1.4, -0.4, mz + 9.4], b1 = [sd * 5, 0.8, mz + 14.4], b2 = [sd * 7.4, 2, mz + 21];
        M.rod(b0, b1, 0.7, MAKE.boneD, 'plain', 5); M.rod(b1, b2, 0.55, MAKE.boneD, 'plain', 5);
        M.rod(b1, [sd * 3.6, 2.6, mz + 19.4], 0.45, MAKE.boneD, 'plain', 4); M.rod([sd * 6.4, 1.5, mz + 18], [sd * 9.6, 2.2, mz + 21], 0.4, MAKE.boneD, 'plain', 4);
      }
      break;
    }
    case 'skulls': {   // a sharpened stake with skulls on it
      M.cyl(0, 0, 0, 1.3, H, MAKE.bark[0], 'bark', 6); M.cone(0, 0, H, 1.3, 4, MAKE.cut, 'wood', 6);
      for (const [z, sc] of [[H - 5, 1], [H - 16, 0.82]]) {
        M.rock(0, 0, z, 6.4 * sc, 5.8 * sc, 6 * sc, MAKE.bone, z, 0, 0, 'plain'); M.box(-1.2 * sc, 0, z - 4 * sc, 4.4 * sc, 2.2 * sc, 4.6 * sc, MAKE.boneD, 'plain');
        for (const sd of [-1, 1]) M.box(-3 * sc, sd * 1.3 * sc, z - 0.3 * sc, 0.8, 1.5 * sc, 1.4 * sc, MAKE.soot, 'plain');
      }
      for (const sd of [-1, 1]) M.slab([0, sd * 1.4, H - 19], [0.4, sd * 1.6, H - 27], 1.4, 0.3, hex('#5a3a2a'), 'cloth');
      break;
    }
    case 'flowers': {   // a stone pot of flowers
      M.cyl(0, 0, 0, 3.3, 5.2, MAKE.stone[1], 'stone', 10); M.cyl(0, 0, 4.8, 4, 1.5, MAKE.stone[0], 'stone', 10); M.cyl(0, 0, 6.2, 3.4, 0.2, MAKE.soilD, 'plain', 10);
      for (let i = 0; i < 4; i++) {
        const t = i * 1.6 + 0.3, f = Math.cos(t) * 2, s = Math.sin(t) * 2, h = 10 + (i % 2) * 2.4, col = hex(['#e2c070', '#c8507a', '#d87a5a', '#f0e6c8'][i]);
        M.rod([f * 0.4, s * 0.4, 6.3], [f, s, h], 0.25, MAKE.leafD, 'plant', 4);
        M.box(f * 0.6, s * 0.6, 7.6 + i * 0.4, 2.6, 0.3, 1.2, MAKE.leaf, 'plant', { turn: t, tip: 0.5 });
        M.cyl(f, s, h, 1.6, 0.6, col, 'plain', 6); M.cyl(f, s, h + 0.4, 0.6, 0.5, MAKE.gold, 'plain', 5);
      }
      break;
    }
    case 'ring': {   // a ring of stones round an old bed of ash
      M.cyl(0, 0, 0, r * 0.62, 0.4, hex('#3a3430'), 'plain', 12);
      for (let i = 0; i < 10; i++) { const t = i / 10 * TAU; M.rock(Math.cos(t) * r * 0.78, Math.sin(t) * r * 0.78, 1.6, 7, 5, 6.4, MAKE.stone[i % 4], i, t); }
      M.log([-5, -3, 1.2], [5, 2.5, 1.6], 1.4, MAKE.char, 6, hex('#3a2e26')); M.log([-4, 4, 1.4], [4.4, -2.6, 2.4], 1.3, MAKE.char, 6, hex('#3a2e26'));
      break;
    }
    default: M.box(0, 0, 0, r * 1.6, H, r * 1.6, tone(P.m)[0]);
  }
}

// a barrel: staves bulging out to the middle, held in by iron hoops; with a lid on, or open with water in it
function barrelKit(M, f, s, z0, R, H, top, lv = 0) {
  const n = 14, R0 = R * 0.88, z1 = z0 + H / 2, z2 = z0 + H;
  for (let i = 0; i < n; i++) {
    const t = i / n * TAU, c = Math.cos(t), si = Math.sin(t), col = MAKE.plank[i % 3], w = TAU * R / n * 1.12;
    M.slab([f + c * R0, s + si * R0, z0], [f + c * R, s + si * R, z1], w, 1.3, col);
    M.slab([f + c * R, s + si * R, z1], [f + c * R0, s + si * R0, z2], w, 1.3, col);
  }
  for (const [z, rr] of [[z0 + 1.4, R0 + (R - R0) * 0.2], [z1 - 0.8, R + 0.15], [z2 - 2.8, R0 + (R - R0) * 0.2]]) M.cyl(f, s, z, rr + 0.35, 1.4, MAKE.ironD, 'metal', 16);
  if (top === 'lid') { M.cyl(f, s, z2 - 1.4, R0 - 0.3, 1.2, MAKE.plank[0], 'wood', 14); M.box(f, s, z2 - 0.3, 0.5, 0.2, (R0 - 0.4) * 2, MAKE.dark); }
  else { M.cyl(f, s, z0 + 0.4, R0 - 0.4, 1, MAKE.dark, 'wood', 14); if (lv > 0.02) M.cyl(f, s, z0 + 1 + (H - 3) * lv, R0 - 0.5, 0.5, MAKE.water, 'water', 14, 0.1); }
}

// ---------------- Daylight's builds: the stations you put down ----------------
function buildKit(K, o) {
  const B = o.build || o, a = B.a || 0, x = o.x, y = o.y;
  if (o.camp === 'wall' || o.camp === 'stakes') { campKit1(K, o); return; }
  const M = maker(K, x, y, a);
  if (o.kind === 'fire' || B.t === 'fire') {   // stones round a bed of ash, sticks leant together over the embers
    M.cyl(0, 0, 0, 8, 0.5, hex('#3a3430'), 'plain', 10);
    for (let k = 0; k < 9; k++) { const t = k / 9 * TAU; M.rock(Math.cos(t) * 10.4, Math.sin(t) * 10.4, 1.8, 7, 5, 6.4, MAKE.stone[k % 4], k, t); }
    for (let k = 0; k < 4; k++) { const t = k * 1.57 + 0.4; M.rock(Math.cos(t) * 2.4, Math.sin(t) * 2.4, 0.9, 3.6, 2, 3, MAKE.ember, k, t, 0.9, 'plain'); }
    for (let k = 0; k < 5; k++) { const t = k / 5 * TAU + 0.3; M.log([Math.cos(t) * 7, Math.sin(t) * 7, 0.6], [Math.cos(t) * 1.1, Math.sin(t) * 1.1, 10], 1.25, k % 2 ? MAKE.bark[1] : MAKE.char, 6); }
    return;
  }
  switch (o.sub) {
    case 'bench': benchKit(M); break;
    case 'furnace': furnaceKit(M, B); break;
    case 'anvil': forgeKit(M); break;
    case 'rack': rackKit(M); break;
    case 'tcol': tarpKit(M, B); break;
    case 'rainb': {   // a barrel stood on a flat stone, open to the sky, its water showing as it fills; a dipper on the rim
      M.cyl(0, 0, 0, 10.6, 1.6, MAKE.stone[1], 'stone', 12, 0, 9.8);
      barrelKit(M, 0, 0, 1.6, 8.6, 20, 'open', clamp((B.w || 0) / RB_MAX, 0, 1));
      M.rod([-6, 5, 22.6], [-7.4, 6.6, 15], 0.4, MAKE.trim, 'wood', 5); M.cyl(-7.6, 6.8, 13.4, 1.6, 2, MAKE.trim, 'wood', 8);
      break;
    }
    case 'cache': cacheKit(K, M, B, x, y, a); break;
    case 'hearth': {   // a rounded stone set on three flat ones, warm light breathing in the cracks across it and pooled in its hollow
      for (let i = 0; i < 3; i++) { const t = i * 2.094 + 0.5; M.rock(Math.cos(t) * 5.4, Math.sin(t) * 5.4, 0.8, 7, 2.4, 6, MAKE.stone[i + 1], i, t); }
      const hz = (f, s) => 3 + 6.2 * Math.sqrt(Math.max(0, 1 - (f / 7.6) ** 2 - (s / 6.8) ** 2)) - 0.12;
      M.ball(0, 0, 3, 15.2, 12.4, 13.6, MAKE.stone[0], 'stone');
      for (const crack of [[[-1.6, 0.4], [-3.2, -1.4], [-4.6, -1.8], [-6, -3]], [[1.4, 0.8], [2.6, 2.6], [4.4, 3.2]], [[0.4, -1.6], [1.2, -3.6], [0.6, -5.2]]])
        for (let i = 0; i < crack.length - 1; i++) { const [f0, s0] = crack[i], [f1, s1] = crack[i + 1]; M.slab([f0, s0, hz(f0, s0)], [f1, s1, hz(f1, s1)], 0.8 - i * 0.15, 0.5, MAKE.ember, 'plain', 1); }
      M.cyl(0, 0, hz(0, 0) - 0.3, 2.2, 0.55, MAKE.glow, 'plain', 10, 1);
      break;
    }
    case 'chest':
      if (B.pen) penKit(M, B);
      else if (B.smoke) smokeKit(M, B);
      else if (B.comp) compostKit(M, B);
      else if (B.basket) basketKit(M, B);
      else chestKit(K, x, y, a + Math.PI, 0.78, B.openT > 0 ? Math.min(1, B.openT * 4) : 0);
      break;
    case 'tpost': torchPostKit(M, B); break;
    case 'effigy': effigyKit(M); break;
    case 'signal': signalKit(M, B); break;
    case 'plot': plotKit(M, B); break;
  }
}

// a workbench: a thick plank top on square legs, a vice on the front, a shelf of offcuts under it, and a board of tools along the back
function benchKit(M) {
  const T = 15.6;
  for (const s of [-14.5, 14.5]) { M.box(-6, s, 0, 2.8, T, 2.8, MAKE.trim); M.box(6, s, 0, 2.8, T + 13.4, 2.8, MAKE.trim); M.box(0, s, 3.4, 9.4, 1.8, 1.8, MAKE.trim); }
  M.box(0, 0, 5.2, 11, 1.1, 27.4, MAKE.plank[1]);
  M.box(-1.5, -5, 6.3, 7.4, 1.2, 14, MAKE.plank[2], 'wood', { turn: 0.06 }); M.box(1, -4, 7.5, 6, 1.2, 12, MAKE.plank[0], 'wood', { turn: -0.1 }); M.box(1.4, 7, 6.3, 5, 3.6, 5, MAKE.plank[1]);
  for (const f of [-6, 6]) M.box(f, 0, T - 2.6, 1.4, 2.6, 26.2, MAKE.plank[1]);
  for (let i = 0; i < 3; i++) M.box(-5.4 + i * 5.4, 0, T, 5.2, 2.6, 35, MAKE.plank[i]);
  const top = T + 2.6;
  // the vice: a jaw on the front-left, its screw and handle
  M.box(-8.9, -11.5, T - 6, 1.6, 8.6, 6.4, MAKE.plank[0]);
  M.rod([-8.4, -11.5, T - 2], [-12.6, -11.5, T - 2], 0.55, MAKE.ironD, 'metal', 6); M.rod([-12.6, -14.5, T - 2], [-12.6, -8.5, T - 2], 0.5, MAKE.trim, 'wood', 5);
  // on the top: a board in the vice being planed, and shavings
  M.box(-4, -9, top, 4.6, 1.4, 16, MAKE.plank[2]);
  M.box(-4, -5.6, top + 1.4, 3.2, 2.2, 6, MAKE.trim); M.cyl(-4, -3.4, top + 3.6, 0.7, 1.6, MAKE.dark, 'wood', 6); M.box(-4, -7.4, top + 3.6, 1.8, 0.4, 0.6, MAKE.ironL, 'metal');
  for (let i = 0; i < 4; i++) M.box(-1.5 + (i % 2) * 2.4, -1 + i * 2.2, top, 1.6, 0.5, 1, MAKE.cut, 'wood', { turn: i * 1.3 });
  M.box(2.5, 8.5, top, 5.4, 1.6, 2.6, MAKE.ironD, 'metal'); M.rod([2.5, 8.5, top + 0.8], [-4.5, 11.5, top + 0.6], 0.55, MAKE.trim, 'wood', 5);   // a hammer lying on it
  // the tool board along the back: a saw, a hammer, a chisel, a coil of rope
  M.box(6.6, 0, T + 5.4, 1, 7.6, 26.4, MAKE.plank[1]);
  M.box(5.75, -6.6, T + 6.4, 0.3, 3.8, 11.4, MAKE.ironL, 'metal', { lean: -0.22 }); M.box(5.6, -12.8, T + 6.4, 1.2, 4.8, 3.2, MAKE.trim, 'wood', { lean: -0.22 });
  for (let i = 0; i < 6; i++) { const u = -11.4 + i * 1.9; M.point([5.75, u, T + 5.4 + (u + 6.6) * 0.22], [5.75, u + 0.5, T + 4.5 + (u + 6.6) * 0.22], 0.55, MAKE.ironL, 'metal', 3); }
  M.rod([5.6, 3, T + 5.4], [5.6, 3, T + 11.4], 0.55, MAKE.trim, 'wood', 5); M.box(5.4, 3, T + 11.2, 1.8, 1.8, 4.6, MAKE.ironD, 'metal');
  M.rod([5.6, 7.2, T + 6.4], [5.6, 7.2, T + 10.6], 0.6, MAKE.trim, 'wood', 5); M.box(5.6, 7.2, T + 4.4, 0.4, 2.2, 1, MAKE.ironL, 'metal');
  M.hoop(5.4, 11, T + 6.2, 2, 0.8, 0.8, MAKE.rope, 'cloth', 8); M.box(5.4, 11, T + 9.6, 0.8, 0.8, 0.8, MAKE.dark);
}

// a bloomery furnace: a squat tower of dry stone narrowing to a clay chimney, its mouth towards you, bellows at its side,
// and what it makes lying in front of it
function furnaceKit(M, B) {
  const lit = B.fuel > 0 || B.lit || B.smelt;
  const C = [[12.2, 0, 7], [10.8, 7, 7], [9.2, 14, 7], [7.6, 21, 6]];
  C.forEach(([R, z, h], c) => {
    M.cyl(0, 0, z, R - 1.4, h + 0.4, MAKE.mortar, 'stone', 10);
    const n = Math.round(R * 0.95);
    for (let k = 0; k < n; k++) { const t = (k + c * 0.5) / n * TAU; if (c < 2 && Math.abs(angDiff(t, Math.PI)) < 0.5) continue; M.rock(Math.cos(t) * (R - 0.9), Math.sin(t) * (R - 0.9), z + h / 2, TAU * R / n * 1.15, h * 1.12, 4.4, MAKE.stone[(k + c) % 4], k + c, t + Math.PI / 2); }
  });
  M.cyl(0, 0, 25.6, 4.1, 10, MAKE.clay, 'stone', 9); M.cyl(0, 0, 35.2, 4.6, 1.4, lit3(MAKE.clay, 0.85), 'stone', 9); M.cyl(0, 0, 36.4, 3.2, 0.3, lit ? MAKE.ember : MAKE.soot, 'plain', 9, lit ? 0.7 : 0);
  // the mouth: jambs and a lintel stone round a dark opening, the coals glowing in it when it's lit
  M.box(-8.4, 0, 1.4, 5, 9.2, 8.6, MAKE.soot, 'plain');
  for (const sd of [-1, 1]) M.box(-11, sd * 5.4, 0, 4.4, 10.6, 2.8, MAKE.stone[sd > 0 ? 1 : 3], 'stone');
  M.box(-11.2, 0, 10.4, 5, 2.8, 13.4, MAKE.stone[2], 'stone'); M.box(-12.6, 0, 0, 3.6, 1.4, 9, MAKE.stone[0], 'stone');
  for (let k = 0; k < 4; k++) M.rock(-11.2 + (k % 2) * 0.8, -2.6 + k * 1.7, 2.4, 2.6, 1.8, 2.2, lit ? MAKE.ember : hex('#2e2620'), k, k, lit ? 1 : 0, 'plain');
  if (lit) M.box(-10.95, 0, 4, 0.4, 5, 5.6, MAKE.glow, 'plain', { em: 0.85 });
  // the bellows at its side, nosed into it
  M.box(-1, 15.6, 0, 6, 1, 10, MAKE.plank[1]); M.ball(-1, 15.4, 2.6, 5.2, 3.2, 8.6, MAKE.hide, 'cloth');
  M.slab([-1, 20, 2.2], [-1, 11, 4.4], 6, 0.9, MAKE.plank[0]); M.rod([-1, 11.2, 2.6], [-1, 9.6, 3.2], 0.7, MAKE.ironD, 'metal', 6);
  for (const sd of [-1, 1]) M.rod([-1 + sd * 1.6, 20, 2.2], [-1 + sd * 1.6, 23, 2.6], 0.4, MAKE.trim, 'wood', 4);
  // ore heaped at the other side, and two iron bars it has made, in front
  for (let k = 0; k < 5; k++) M.rock(-3 + (k % 3) * 2.6, -14 - Math.floor(k / 3) * 2.4, 1 + (k > 2) * 1.6, 3.4, 2.6, 3, hex(k % 2 ? '#7a4a36' : '#5e4a40'), k, k);
  M.box(-15, -6, 0, 2.4, 1.4, 5.6, MAKE.ironL, 'metal', { turn: 0.25 }); M.box(-15.4, -6.6, 1.4, 2.4, 1.4, 5.6, MAKE.iron, 'metal', { turn: -0.6 });
}

// the forge: an anvil on a stump, a grindstone in its trough beside it, a bucket to quench in
function forgeKit(M) {
  M.cyl(0, 4, 0, 6, 10, MAKE.bark[0], 'bark', 10); M.cyl(0, 4, 10, 5.3, 0.3, MAKE.cut, 'wood', 10);
  M.box(0, 4, 10.3, 6.4, 2.2, 10.6, MAKE.ironD, 'metal'); M.box(0, 4, 12.5, 4.2, 3, 5.8, MAKE.ironD, 'metal');
  M.box(0, 3.2, 15.5, 6, 3.6, 12.6, MAKE.iron, 'metal'); M.box(0, 3.2, 19.1, 6, 0.5, 12.6, MAKE.ironL, 'metal');
  M.point([0, 9.4, 17.4], [0, 16.4, 18.6], 2.7, MAKE.iron, 'metal', 8); M.box(0, -3.9, 16.4, 6, 3, 1.6, MAKE.iron, 'metal');
  M.box(0, -1, 19.6, 1.1, 0.12, 1.1, MAKE.soot, 'plain');
  M.box(1.2, 7, 19.6, 2, 1.8, 4.4, MAKE.ironD, 'metal'); M.rod([1.2, 7, 20.5], [-8.4, 5.4, 20], 0.55, MAKE.trim, 'wood', 5);   // the hammer on its face
  for (const sd of [-0.5, 0.5]) M.rod([-6.6, 9 + sd, 0], [-6.2, 10 + sd * 0.4, 11], 0.3, MAKE.ironD, 'metal', 4);   // tongs leant on the stump
  // the grindstone: a stone wheel on an axle, dipping into a trough of water, a crank towards you
  M.box(1, -11.4, 0, 8.4, 3.4, 13.6, MAKE.trim); M.box(1, -11.4, 3, 7, 0.4, 12, MAKE.water, 'water');
  for (const f of [-2.6, 4.6]) M.box(f, -11.4, 3.4, 1.6, 8.6, 2.4, MAKE.plank[1]);
  M.rod([-0.3, -11.4, 10.2], [2.3, -11.4, 10.2], 6.4, MAKE.stone[2], 'stone', 14); M.rod([-0.36, -11.4, 10.2], [2.36, -11.4, 10.2], 1.4, MAKE.stone[1], 'stone', 8);
  M.rod([-3.8, -11.4, 10.2], [5.6, -11.4, 10.2], 0.5, MAKE.ironD, 'metal', 6);
  M.rod([-3.8, -11.4, 10.2], [-3.8, -11.4, 6.4], 0.45, MAKE.ironD, 'metal', 5); M.rod([-3.8, -11.4, 6.4], [-6.8, -11.4, 6.4], 0.6, MAKE.trim, 'wood', 5);
  // the quench bucket
  M.cyl(6.2, 13.4, 0, 3.4, 6.4, MAKE.plank[1], 'wood', 10); M.cyl(6.2, 13.4, 5.8, 2.9, 0.4, MAKE.water, 'water', 10);
  for (const z of [1, 4.6]) M.cyl(6.2, 13.4, z, 3.6, 0.8, MAKE.ironD, 'metal', 10);
}

// a drying rack: two A-frames lashed at the top, a ridge pole across them hung with strips of meat, and fish on a lower pole
function rackKit(M) {
  for (const s of [-14, 14]) {
    M.rod([-6.4, s, 0], [0.8, s, 27], 1.1, MAKE.bark[1], 'bark', 6); M.rod([6.4, s, 0], [-0.8, s, 27], 1.1, MAKE.bark[2], 'bark', 6);
    M.cyl(0, s, 24.2, 1.7, 1.8, MAKE.rope, 'cloth', 8); M.rod([-4.8, s, 5.4], [4.8, s, 5.4], 0.7, MAKE.bark[0], 'bark', 5);
  }
  M.log([0, -17, 25.2], [0, 17, 25.2], 1.2, MAKE.bark[0], 7);
  M.rod([-2.9, -15.6, 14.2], [-2.9, 15.6, 14.2], 0.8, MAKE.bark[2], 'bark', 6);
  [-9.5, -5, -0.5, 4].forEach((s, i) => {
    const c = i % 2 ? MAKE.meat : MAKE.meatD, ln = 8 + (i % 3) * 1.4;
    M.box(0, s, 25.9, 2.8, 0.7, 2.6, c, 'cloth');
    for (const sd of [-1, 1]) M.slab([sd * 1.2, s, 25.8], [sd * 1.9, s + 0.3, 25.8 - ln + (sd > 0 ? 1.6 : 0)], 2.6, 0.6, c, 'cloth');
  });
  for (const s of [8.5, 12]) {   // fish hung by the tail, head down
    M.rod([-2.9, s, 14], [-2.9, s, 12.6], 0.12, MAKE.rope, 'cloth', 4);
    M.slab([-2.9, s - 1.2, 12.6], [-2.9, s + 1.2, 12.6], 1.2, 0.3, MAKE.fishD, 'plain');
    M.ball(-2.9, s, 8.6, 1.4, 7.4, 2.6, MAKE.fish, 'metal'); M.box(-3.5, s, 9.5, 0.3, 3, 1, MAKE.fishD, 'plain');
  }
}


// a tarp tied out on four forked sticks, sagging in the middle where the rain pools
const P_SAG = () => prim('sag', () => {   // a cloth pinned at its corners: a unit square sagging a unit deep in the middle, cloth both sides
  const N = 6, P = [], Nn = [];
  const pt = (i, j, under) => { const u = 2 * i / N - 1, w = 2 * j / N - 1, A = 1 - 0.9 * u * u, Bw = 1 - 0.9 * w * w, nx = -3.6 * u * Bw, nz = -3.6 * w * A, l = Math.hypot(nx, 1, nz) * (under ? -1 : 1);
    P.push(u / 2, -A * Bw - (under ? 0.05 : 0), w / 2); Nn.push(nx / l, 1 / l, nz / l); };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    for (const [q, r] of [[i, j], [i, j + 1], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i + 1, j]]) pt(q, r, false);
    for (const [q, r] of [[i, j], [i + 1, j + 1], [i, j + 1], [i, j], [i + 1, j], [i + 1, j + 1]]) pt(q, r, true);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); return g;
});
function tarpKit(M, B) {
  const Z = 15.4, D = 4.4, S = 22, tip = 0.08;
  for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const f = 10.4 * i, s = 10.4 * j, h = Z + i * 0.85;
    M.rod([f, s, 0], [f, s, h + 0.4], 0.75, MAKE.bark[(i + j + 2) % 3], 'bark', 5);
    M.rod([f, s, h - 0.6], [f + i * 1.3, s + j * 1.3, h + 2], 0.4, MAKE.bark[1], 'bark', 4);   // the fork the corner's tied in
    M.lash(f, s, h - 0.5, 0.75, 1.2);
  }
  M.sag(0, 0, Z, S, D, S, hex('#6a8a76'), tip);
  const lv = clamp((B.w || 0) / TC_MAX, 0, 1);
  if (lv > 0.05) { const rho = (0.14 + 0.2 * lv) * S, u = 2 * rho / S; M.cyl(0, 0, Z - D + D * 0.9 * u * u, rho, 0.25, MAKE.water, 'water', 14, 0.1); }
}

// a cache out in the woods: a stone box with its lid slab on and moss on it, or a chest bound in iron with a padlock; opened, the lid's off
function cacheKit(K, M, B, x, y, a) {
  if (B.ck === 'chest') {
    chestKit(K, x, y, a + Math.PI, 0.9, B.open ? 1 : 0);
    if (!B.open) {
      M.box(0, 0, 3, 18.8, 1.6, 27.8, MAKE.ironD, 'metal');
      M.box(-9.9, 0, 6.4, 1.2, 4.2, 3.8, MAKE.iron, 'metal'); M.box(-9.9, 0, 11.6, 0.6, 0.7, 3, MAKE.ironL, 'metal'); for (const sd of [-1, 1]) M.box(-9.9, sd * 1.2, 10.4, 0.6, 1.4, 0.6, MAKE.ironL, 'metal');
    }
    return;
  }
  M.box(0, 0, 0, 30, 1.6, 22, MAKE.stone[1], 'stone');
  for (const sd of [-1, 1]) { M.box(sd * 13.7, 0, 0, 2.6, 14, 22, MAKE.stone[sd > 0 ? 0 : 2], 'stone'); M.box(0, sd * 9.7, 0, 24.8, 14, 2.6, MAKE.stone[sd > 0 ? 3 : 1], 'stone'); }
  if (B.open) { M.box(0, 0, 1.6, 24.6, 0.3, 16.8, MAKE.soot, 'plain'); M.box(-12, 15, 0, 31, 3.2, 23, MAKE.stone[2], 'stone', { turn: 0.5 }); }
  else { M.box(0, 0, 14, 33, 4, 25, MAKE.stone[2], 'stone'); for (const sd of [-1, 1]) M.rock(sd * 9, 5, 18.2, 7, 1.6, 5, MAKE.leafD, sd + 2, 0, 0, 'plant'); }
}

// the deer pen: a ring of posts with two rails lashed between them round a feeding trough and some hay; the way in faces you
function penKit(M, B) {
  const N = 14, R = PEN_R, th = i => Math.PI + (i - 0.5) / N * TAU;   // posts 0 and 1 stand either side of the way in
  const pts = []; for (let i = 0; i < N; i++) pts.push([Math.cos(th(i)) * R, Math.sin(th(i)) * R]);
  pts.forEach(([f, s], i) => { const gate = i < 2, h = gate ? 21 : 17, r = gate ? 2 : 1.4; M.cyl(f, s, 0, r, h, MAKE.bark[i % 3], 'bark', 7); M.cyl(f, s, h, r * 0.85, 0.3, MAKE.cut, 'wood', 7); if (gate) M.lash(f, s, h - 4, r); });
  for (let i = 1; i < N; i++) { const [f0, s0] = pts[i], [f1, s1] = pts[(i + 1) % N]; for (const z of [7, 13.5]) M.log([f0, s0, z], [f1, s1, z + 0.3], 0.95, MAKE.bark[(i + (z > 9)) % 3], 5); }
  // the trough: a plank box, dark inside, meat in it when there's some
  M.box(0, 0, 0, 20, 1.4, 8.4, MAKE.plank[1]);
  for (const sd of [-1, 1]) { M.box(0, sd * 3.7, 0, 20, 5, 1.2, MAKE.plank[sd > 0 ? 0 : 2]); M.box(sd * 9.4, 0, 0, 1.2, 5, 8.6, MAKE.trim); }
  M.box(0, 0, 1.4, 17.6, 0.3, 6.2, MAKE.dark);
  if (B.inv.some(s => s && s.id === 'meat')) for (let i = 0; i < 4; i++) M.rock(-6 + i * 4, (i % 2 - 0.5) * 1.6, 2.6, 3.6, 2.2, 2.8, i % 2 ? MAKE.meat : MAKE.meatD, i, i, 0, 'cloth');
  M.rock(2, 16, 3, 13, 6.4, 10, MAKE.straw, 2, 0.4, 0, 'wood'); for (let i = 0; i < 5; i++) M.box(-2 + i * 2.2, 14 + (i % 2) * 3, 0.2, 4, 0.5, 0.6, MAKE.strawD, 'wood', { turn: i * 0.9 });
}

// a little plank shed with a pitched roof and a stone chimney, its door towards you, fish hung under the eave
function smokeKit(M, B) {
  const W = 18, Dp = 15, Hw = 13.6;
  M.box(0, 0, 0, Dp, Hw, W, MAKE.board);
  for (const sd of [-1, 1]) { for (let i = 1; i < 5; i++) M.box(sd * (Dp / 2 + 0.1), -W / 2 + i * W / 5, 0, 0.3, Hw, 0.5, MAKE.dark); for (let i = 1; i < 4; i++) M.box(-Dp / 2 + i * Dp / 4, sd * (W / 2 + 0.1), 0, 0.5, Hw, 0.3, MAKE.dark); }
  M.prism(0, 0, Hw, W, 7.4, Dp + 0.4, MAKE.board, 'wood', Math.PI / 2);
  for (const sd of [-1, 1]) M.slab([sd * (Dp / 2 + 2.6), 0, Hw - 1.4], [0, 0, Hw + 7.9], W + 4, 1.3, MAKE.dark);
  M.log([0, -W / 2 - 2.2, Hw + 8.3], [0, W / 2 + 2.2, Hw + 8.3], 1, MAKE.bark[0], 6);
  // the door, framed, with its latch
  M.box(-Dp / 2 - 0.4, -2, 0, 0.8, 10.4, 6.4, hex('#3e2c1c'));
  for (const s of [-5.6, 1.6]) M.box(-Dp / 2 - 0.55, s, 0, 1, 11.2, 1, MAKE.trim);
  M.box(-Dp / 2 - 0.55, -2, 10.6, 1, 1, 8.2, MAKE.trim); M.box(-Dp / 2 - 0.95, 0.2, 5.4, 0.5, 0.6, 2.4, MAKE.ironD, 'metal');
  // the chimney, through the back of the roof
  M.box(4.4, -5.6, 0, 4.6, 25, 4.6, MAKE.stone[1], 'stone'); M.box(4.4, -5.6, 25, 5.8, 1.2, 5.8, MAKE.stone[2], 'stone'); M.box(4.4, -5.6, 26.2, 3, 0.2, 3, MAKE.soot, 'plain');
  // fish hung under the front eave
  for (const s of [4.6, 7.2]) { M.rod([-9.2, s, 12.6], [-9.2, s, 11], 0.12, MAKE.rope, 'cloth', 4); M.ball(-9.2, s, 7.6, 1.2, 6.4, 2.2, MAKE.fishD, 'metal'); M.slab([-9.2, s - 1, 11], [-9.2, s + 1, 11], 1, 0.3, MAKE.fishD, 'plain'); }
}

// a slatted bin on four posts, lower at the front so you can see in, heaped with dark earth and scraps; a shovel stood in it
function compostKit(M, B) {
  const F = 8.6, Sd = 9.6;
  for (const [f, s] of [[-F, -Sd], [F, -Sd], [F, Sd], [-F, Sd]]) M.box(f, s, 0, 2.2, 10.8, 2.2, MAKE.trim);
  for (let i = 0; i < 3; i++) {
    const z = 0.6 + i * 3.4;
    M.box(F, 0, z, 1.2, 2.6, 2 * Sd, MAKE.plank[i]);
    for (const sd of [-1, 1]) M.box(0, sd * Sd, z, 2 * F, 2.6, 1.2, MAKE.plank[(i + 1) % 3]);
    if (i < 2) M.box(-F, 0, z, 1.2, 2.6, 2 * Sd, MAKE.plank[(i + 2) % 3]);
  }
  M.box(0, 0, 0, 2 * F - 1, 3, 2 * Sd - 1, MAKE.soil, 'plain');
  if (!B.inv.some(Boolean)) return;
  M.rock(1, 0, 4.4, 15, 7.6, 17, MAKE.soilD, 3, 0, 0, 'plain');
  [[-3, 3, MAKE.leaf], [2, -4, hex('#8a6a3a')], [-1, -1, hex('#c23a4a')], [4, 4, MAKE.leafD], [-4, -5, hex('#d8c8a0')]].forEach(([f, s, c], i) => M.box(f, s, 7 + (i % 2) * 0.6, 2.4, 0.6, 1.6, c, 'plant', { turn: i * 1.1, tip: 0.2 }));
  M.box(0.6, -2.8, 4.6, 0.4, 4, 3.2, MAKE.ironD, 'metal', { tip: -0.3 }); M.rod([0.8, -2.8, 7.6], [3.4, -5, 22], 0.55, MAKE.trim, 'wood', 5); M.rod([3.4, -6.8, 22], [3.4, -3.2, 22], 0.5, MAKE.trim, 'wood', 5);
}

// a woven basket flaring to a rolled rim, a handle over it, heaped with what it last picked
function basketKit(M, B) {
  M.cyl(0, 0, 0, 7.4, 1, MAKE.strawD, 'wood', 12);
  for (let r = 0; r < 4; r++) M.hoop(0, 0, 0.6 + r * 2.8, 7.8 + r * 0.7, 2.9, 1.2, r % 2 ? MAKE.straw : MAKE.strawD, 'wood', 14, r % 2 ? 0.5 : 0);
  M.hoop(0, 0, 11.6, 10.4, 1.4, 1.8, MAKE.strawD, 'cloth', 16);
  for (let k = 0; k < 8; k++) { const t = k / 8 * TAU + 0.2; M.rod([Math.cos(t) * 8.3, Math.sin(t) * 8.3, 0.4], [Math.cos(t) * 10.6, Math.sin(t) * 10.6, 12.6], 0.4, MAKE.trim, 'wood', 4); }
  const hp = []; for (let i = 0; i <= 6; i++) { const u = i / 6; hp.push([0, -10.2 + u * 20.4, 12.6 + 8.4 * Math.sin(u * Math.PI)]); }
  for (let i = 0; i < 6; i++) M.rod(hp[i], hp[i + 1], 0.65, MAKE.strawD, 'wood', 5);
  M.cyl(0, 0, 1, 7.2, 0.3, hex('#3a2a1a'), 'plain', 12);
  const top = B.inv.find(Boolean); if (!top) return;
  const c = hex(DIT[top.id] && DIT[top.id].c || '#c23a4a');
  M.cyl(0, 0, 8.4, 9.2, 2.2, lit3(c, 0.6), 'plain', 12);
  for (let i = 0; i < 7; i++) { const t = i / 7 * TAU + B.x, R = i ? 5 : 0; M.ball(Math.cos(t) * R, Math.sin(t) * R, 10.8 + (i ? 0 : 1.2), 4.6, 3.6, 4.6, c); }
}

// a tall post in a cairn of stones with an iron fire basket on top: it burns while it has sticks, and a bundle of them waits at its foot
function torchPostKit(M, B) {
  const lit = B.fuel > 0, H = 44;
  for (let i = 0; i < 6; i++) { const t = i / 6 * TAU + 0.3; M.rock(Math.cos(t) * 4.6, Math.sin(t) * 4.6, 1.8, 5.6, 4.2, 5, MAKE.stone[i % 4], i, t); }
  M.cyl(0, 0, 0, 2.4, H, MAKE.bark[0], 'bark', 8); for (const z of [14, H - 5]) M.lash(0, 0, z, 2.4, 1.6);
  M.cyl(0, 0, H - 1, 3.2, 1.2, MAKE.ironD, 'metal', 8); M.cyl(0, 0, H, 5.6, 1.2, MAKE.ironD, 'metal', 10);
  for (let k = 0; k < 8; k++) { const t = k / 8 * TAU; M.rod([Math.cos(t) * 5.2, Math.sin(t) * 5.2, H + 0.6], [Math.cos(t) * 7, Math.sin(t) * 7, H + 8], 0.36, MAKE.ironD, 'metal', 4); }
  M.hoop(0, 0, H + 7.4, 7, 1, 0.7, MAKE.ironD, 'metal', 12); M.hoop(0, 0, H + 3.6, 6.1, 0.8, 0.6, MAKE.ironD, 'metal', 12);
  for (let k = 0; k < 6; k++) { const t = k * 1.1, R = k ? 3 : 0; M.rock(Math.cos(t) * R, Math.sin(t) * R, H + 2.8, 4, 2.8, 3.6, lit ? MAKE.ember : MAKE.char, k, t, lit ? 1 : 0, 'plain'); }
  if (!lit) for (let k = 0; k < 3; k++) M.rod([Math.cos(k * 2) * 3.6, Math.sin(k * 2) * 3.6, H + 1.6], [-Math.cos(k * 2) * 2, -Math.sin(k * 2) * 2, H + 6], 0.6, MAKE.char, 'bark', 4);
  for (let i = 0; i < 4; i++) M.rod([-7.4 + i * 0.7, 3.8 + (i % 2) * 1.2, 0], [-2.6 + i * 0.25, 1.8 + i * 0.5, 13 + i], 0.55, MAKE.bark[i % 3], 'bark', 4);
}

// a scarecrow of the dead: a cross of poles in a cairn, a ragged hide hung on it, straw arms, and a deer's skull and antlers for a head
function effigyKit(M) {
  for (let i = 0; i < 5; i++) { const t = i / 5 * TAU; M.rock(Math.cos(t) * 3.8, Math.sin(t) * 3.8, 1.6, 4.6, 3.6, 4.2, MAKE.stone[i % 4], i, t); }
  M.cyl(0, 0, 0, 1.5, 36, MAKE.bark[1], 'bark', 7);
  M.rod([0, -14, 30], [0, 14, 30], 1.1, MAKE.bark[0], 'bark', 6); M.lash(0, 0, 29.2, 1.5, 2.2);
  for (const sd of [-1, 1]) {
    M.rod([0, sd * 2.6, 30.2], [0, sd * 12, 30.6], 2.2, MAKE.straw, 'wood', 7); M.point([0, sd * 12, 30.6], [0.8, sd * 16.6, 28.4], 2.3, MAKE.strawD, 'wood', 6);
    M.rod([0, sd * 9.4, 30.5], [0, sd * 10.6, 30.5], 2.55, MAKE.rope, 'cloth', 8);
    M.rod([0, sd * 13.4, 29.8], [0, sd * 13.4, 23.4], 0.14, MAKE.rope, 'cloth', 4); M.cyl(0, sd * 13.4, 19.4, 0.55, 4, MAKE.bone, 'plain', 5); M.rock(0, sd * 13.4, 19.4, 1.5, 1.2, 1.4, MAKE.bone, sd + 2, 0, 0, 'plain');
  }
  M.box(0, 0, 14.6, 4.6, 15.6, 11, MAKE.hide, 'cloth');
  [3.4, 5.6, 2.6, 6.2, 4].forEach((ln, i) => M.box(0, -4.4 + i * 2.2, 14.8 - ln, 4.2, ln, 1.9, i % 2 ? MAKE.hide : MAKE.hideD, 'cloth'));
  M.box(0, 0, 20.4, 5.2, 1.2, 11.4, MAKE.rope, 'cloth');
  M.rock(0, 0, 35, 5.6, 5, 5, MAKE.bone, 2, 0, 0, 'plain');
  M.point([-1.4, 0, 34.2], [-7, 0, 31.4], 2, MAKE.bone, 'plain', 5);
  for (const sd of [-1, 1]) {
    M.box(-2.3, sd * 1.35, 34.7, 0.8, 1.3, 1.3, MAKE.soot, 'plain');
    const b0 = [0.2, sd * 1.4, 37], b1 = [0.8, sd * 5.4, 41.6], b2 = [1.2, sd * 7.6, 48.4];
    M.rod(b0, b1, 0.75, MAKE.boneD, 'plain', 5); M.rod(b1, b2, 0.6, MAKE.boneD, 'plain', 5);
    M.rod(b1, [-1.8, sd * 4, 46.4], 0.45, MAKE.boneD, 'plain', 4); M.rod([1, sd * 6.8, 45.6], [0.4, sd * 10.2, 48.6], 0.42, MAKE.boneD, 'plain', 4);
  }
}

// a pyre of split logs stacked crosswise in a ring of stones, kindling packed in its middle and dry brush on top; lit, it glows through every gap
function signalKit(M, B) {
  const lit = B.lit || (S.day && S.day.siege), r = 2.3;
  for (let i = 0; i < 12; i++) { const t = i / 12 * TAU; M.rock(Math.cos(t) * 24, Math.sin(t) * 24, 2, 9, 6, 8, MAKE.stone[i % 4], i, t); }
  M.cone(0, 0, 0, 9.5, 27, lit ? MAKE.ember : MAKE.strawD, lit ? 'plain' : 'wood', 7, lit ? 1 : 0);
  for (let i = 0; i < 8; i++) {
    const z = r + i * r * 1.85, hw = 15 - i * 1.15;
    for (const sd of [-1, 1]) {
      const col = lit && i < 3 ? MAKE.char : MAKE.bark[(i + (sd > 0)) % 3];
      if (i % 2) M.log([sd * hw, -hw - 2.6, z], [sd * hw, hw + 2.6, z], r, col, 6); else M.log([-hw - 2.6, sd * hw, z], [hw + 2.6, sd * hw, z], r, col, 6);
    }
  }
  M.rock(0, 0, 35.6, 15, 5.4, 15, lit ? MAKE.ember : MAKE.strawD, 1, 0, lit ? 0.8 : 0, lit ? 'plain' : 'wood');
}

// a raised bed: plank sides pegged at the corners round dark tilled earth in three ridged rows, whatever's sown growing on them
function plotKit(M, B) {
  M.box(0, 0, -0.4, 42, 1.6, 28, MAKE.soilD, 'plain');
  for (const sd of [-1, 1]) { M.box(0, sd * 14.6, 0, 44.4, 2.6, 1.4, MAKE.plank[sd > 0 ? 0 : 2]); M.box(sd * 21.6, 0, 0, 1.4, 2.6, 28, MAKE.plank[1]); }
  for (const [f, s] of [[-21.6, -14.6], [21.6, -14.6], [21.6, 14.6], [-21.6, 14.6]]) M.box(f, s, 0, 2, 3.6, 2, MAKE.trim);
  for (const s of [-9, 0, 9]) M.rod([-20, s, 1.2], [20, s, 1.2], 2.4, MAKE.soil, 'plain', 8);
  if (!B.crop) return;
  const gr = B.grown ? 1 : clamp(B.sown ? (S.day.t - B.sown) / 120 : 0.2, 0.15, 0.9);
  for (let i = 0; i < 9; i++) {
    const f = -15 + (i % 3) * 15, s = -9 + Math.floor(i / 3) * 9, z = 3.2;
    if (B.crop === 'fibre') { for (let k = 0; k < 4; k++) { const t = k * 1.6 + i; M.point([f + Math.cos(t) * 1.2, s + Math.sin(t) * 1.2, z], [f + Math.cos(t) * 2.8 * gr, s + Math.sin(t) * 2.8 * gr, z + 14 * gr + 2], 0.5 * gr + 0.35, hex(B.grown ? '#b8b86a' : '#6f9440'), 'plant', 4); } continue; }   // tall grass, gold-green when ready
    if (B.crop === 'mushroom') { for (let k = 0; k < 3; k++) { const t = k * 2.1 + i, q = f + Math.cos(t) * 2, w = s + Math.sin(t) * 2, h = (2.6 + k) * gr + 0.6; M.cyl(q, w, z - 0.4, 0.6 * gr + 0.3, h, hex('#e2d8c0'), 'plain', 6); M.cyl(q, w, z - 0.4 + h, 2 * gr + 0.6, 1.2 * gr + 0.3, hex('#c8a070'), 'plain', 8); } continue; }
    if (B.crop === 'sweetroot') { for (let k = 0; k < 5; k++) { const t = k * 1.26 + i; M.point([f, s, z], [f + Math.cos(t) * 4 * gr, s + Math.sin(t) * 4 * gr, z + 7 * gr + 1], 0.7 * gr + 0.3, k % 2 ? MAKE.leaf : MAKE.leafD, 'plant', 4); } if (B.grown) M.rock(f, s, z + 0.4, 3.6, 2.2, 3.6, hex('#c8784a'), i, 0, 0, 'plain'); continue; }
    M.rock(f, s, z + 2.4 * gr, 6 * gr + 1, 4.6 * gr + 1, 6 * gr + 1, i % 2 ? MAKE.leaf : MAKE.leafD, i, i, 0, 'plant');   // berries: a little bush, red with them when ripe
    if (B.grown) for (let k = 0; k < 5; k++) { const t = k * 1.26 + i; M.rock(f + Math.cos(t) * 2.7, s + Math.sin(t) * 2.7, z + 3 + (k % 2) * 1.4, 1.7, 1.7, 1.7, hex('#c23a4a'), k, 0, 0, 'plain'); }
  }
}

// the stake fence and the spike trap: sharpened logs tied in a row, and stakes leant out at whatever comes
function campKit1(K, o) {
  if (o.camp === 'wall') {
    for (let m = 0; m < 3; m++) { const f = (m + 0.5) / 3, x = o.ax + (o.bx - o.ax) * f, y = o.ay + (o.by - o.ay) * f, h = 27 + 5 * hash((o.seq * 3 + m) * 1.3, 7);
      K.mt = 'bark'; K.add(P_CYL(7), x, 0, y, 4.6, h, 4.6, MAKE.bark[(o.seq + m) % 3]); K.mt = 'wood'; K.add(P_CONE(7), x, h, y, 4.6, 4.5, 4.6, MAKE.cut); }
    K.mt = 'cloth'; for (const h of [7, 21]) K.rod(P_CYL(5), o.ax, h, o.ay, o.bx, h, o.by, 0.75, lit3(MAKE.rope, 0.72));
  } else {
    const ux = Math.cos(o.a), uy = Math.sin(o.a);
    for (let m = -1; m <= 1; m++) { const bx = o.x - uy * m * 7, by = o.y + ux * m * 7, h = 15 + 4 * ((m + 1 + Math.floor(o.seed * 3)) % 2), cx = bx + ux * 10.4, cy = by + uy * 10.4, ch = h * 0.8;
      K.mt = 'bark'; K.rod(P_CYL(5), bx, 0, by, cx, ch, cy, 1.4, MAKE.bark[m + 1]); K.mt = 'wood'; K.rod(P_CONE(5), cx, ch, cy, bx + ux * 13, h, by + uy * 13, 1.4, MAKE.cut); }
    K.mt = 'bark'; K.rod(P_CYL(5), o.x - uy * 10, 2, o.y + ux * 10, o.x + uy * 10, 2, o.y - ux * 10, 1.5, MAKE.bark[0]);
  }
  K.mt = null;
}

// a working furnace throws sparks from its chimney, and a smokehouse with meat or fish in it breathes a little smoke
{ const f = lightsFrame; lightsFrame = function (now, dt) {
    f.apply(this, arguments);
    const D = S.day, p = S.p; if (!D || !dt) return;
    for (const B of D.builds) {
      if (Math.abs(B.x - p.x) > 520 || Math.abs(B.y - p.y) > 520) continue;
      if (B.t === 'furnace' && (B.fuel > 0 || B.lit || B.smelt) && Math.random() < dt * 4) spark(B.x + (Math.random() - 0.5) * 4, 37, B.y + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 10, 30 + Math.random() * 30, (Math.random() - 0.5) * 10, 0.9 + Math.random(), 1.3, 1, 0.6, 0.25, 1, 0, -6, 0.6);
      else if (B.smoke && B.inv && B.inv.some(s => s && (s.id === 'meat' || s.id === 'fish')) && Math.random() < dt * 3) { const [dx, dy] = U(B.a || 0, 4.4, -5.6); spark(B.x + dx, 27, B.y + dy, (Math.random() - 0.5) * 3, 7 + Math.random() * 4, (Math.random() - 0.5) * 3, 2.6 + Math.random(), 6 + Math.random() * 3, 0.32, 0.31, 0.3, 0.14, 0, -1.5, 0.7); }
    }
  }; }
