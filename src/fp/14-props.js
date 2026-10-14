// ================= the woods' small things, built solid: rocks, posts, bushes, ferns, grass, flowers, pebbles, mushrooms =================
// Every one of these used to be a painted picture turned to face you. Now each is modelled a few ways over in the pictures'
// own colours and sizes (a rock is as wide and as tall as its picture was), with the same dark outline as the trees, and
// stood about the woods many times over in one draw per model. Plants lean in the breeze; rocks and posts stand still.
// Out at the edge of where they used to be drawn they thin away rather than pop.
const PROP_PC = { value: new V3() };
// the trees' own paint and light, with a gentler sway for things this small and a soft edge round you
function propMats(sway, cullR) {
  const sw = `position.y * ${sway.toFixed(4)}`, cut = `uniform vec3 pc; uniform float cullR;
    void main() { if (cullR > 0.0 && distance(vW.xz, pc.xz) > cullR - 60.0 * fract(sin(dot(gl_FragCoord.xy, vec2(41.31, 17.93))) * 4375.85)) discard;`;
  const uni = () => Object.assign({}, LU, { pc: PROP_PC, cullR: { value: cullR } });
  const m = new THREE.ShaderMaterial({ uniforms: uni(), vertexShader: treeMat.vertexShader.replace('max(0.0, position.y - 24.0) / 90.0', sw), fragmentShader: treeMat.fragmentShader.replace('void main() {', cut) });
  const e = new THREE.ShaderMaterial({ uniforms: uni(), side: THREE.BackSide, vertexShader: treeEdge.vertexShader.replace('max(0.0, position.y - 24.0) / 90.0', sw), fragmentShader: treeEdge.fragmentShader.replace('void main() {', cut) });
  return { m, e };
}
const PROP_MAT = { still: null, plant: null, grass: null };
function propMat(k) {
  if (!PROP_MAT.still) { PROP_MAT.still = propMats(0, 0); PROP_MAT.plant = propMats(0.02, 470); PROP_MAT.grass = propMats(0.035, 470); }
  return PROP_MAT[k];
}

// a boulder: a rounder, lumpier stone than the little faceted ones, flat underneath where it sits in the ground
const P_BOULDER = (k = 0) => prim('boulder' + k, () => {
  const g = new THREE.IcosahedronGeometry(0.5, 1), p = g.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const h = 0.86 + 0.24 * hash(Math.round(v.x * 11) + k * 3.7, Math.round(v.y * 9) * 1.3 + Math.round(v.z * 10) * 0.7);
    v.multiplyScalar(h); if (v.y < -0.18) v.y = -0.18 + (v.y + 0.18) * 0.2;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
});
// a blade or a frond: flat, wide at the foot and running to a point
const P_PEA = (w = 7, h = 5) => prim('pea' + w + h, () => new THREE.SphereGeometry(0.5, w, h));   // a ball with fewer faces, for things too small to show them
const P_KNOB = (k = 0) => prim('knob' + k, () => {   // the trees' soft lump of leaf, in fewer faces for a bush
  const g = new THREE.SphereGeometry(0.5, 10, 7), p = g.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 0.9 + 0.14 * Math.sin(v.x * 9 + k) * Math.sin(v.y * 8 + k * 2) * Math.sin(v.z * 10 + k * 3) + 0.07 * Math.sin(v.x * 27 + v.y * 13 + v.z * 21 + k); v.multiplyScalar(n); v.y *= 0.88; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
});
const P_BLADE = () => prim('blade', () => { const g = new THREE.ConeGeometry(0.5, 1, 4, 1); g.scale(1, 1, 0.25); g.translate(0, 0.5, 0); return g; });

// the models, foot at the origin, in the pictures' own units (each is drawn at the scale its picture was)
const PETAL = { flowerY: '#f2cf34', flowerB: '#8796ee', flowerR: '#e43c34', flowerW: '#f4f1e6', flowerV: '#9644cc' };
const PROP_KIND = {
  rock: { n: 3, mat: 'still', edge: true, shadow: true }, rockIron: { n: 3, mat: 'still', edge: true, shadow: true }, post: { n: 2, mat: 'still', edge: true, shadow: true },
  bush: { n: 3, mat: 'plant', edge: true, shadow: true }, fern: { n: 3, mat: 'plant', edge: true, shadow: false },
  grass: { n: 3, mat: 'grass', edge: false, shadow: false }, pebbles: { n: 3, mat: 'still', edge: true, shadow: false },
  shrooms: { n: 2, mat: 'still', edge: true, shadow: false },
};
for (const k in PETAL) PROP_KIND[k] = { n: 2, mat: 'grass', edge: false, shadow: false };
// what you gather, each one its own few models now rather than rebuilt by hand every time you walk on (30-things)
Object.assign(PROP_KIND, { nsticks: { n: 3, mat: 'still', edge: true, shadow: false }, nstones: { n: 4, mat: 'still', edge: true, shadow: false },
  nshroom1: { n: 2, mat: 'still', edge: true, shadow: false }, nshroom2: { n: 2, mat: 'still', edge: true, shadow: false }, nshroom3: { n: 2, mat: 'still', edge: true, shadow: false },
  nberries: { n: 3, mat: 'still', edge: true, shadow: false }, bbush: { n: 3, mat: 'plant', edge: true, shadow: true } });
PROP_KIND.log = { n: 3, mat: 'still', edge: true, shadow: true };
function propModel(kind, vi) {
  let s = 4211 + vi * 337 + kind.length * 59; const R = () => (s = (s * 16807) % 2147483647) / 2147483647, K = new Kit();
  const pick = (list, j) => hex(list[((j % list.length) + list.length) % list.length]);
  if (kind === 'rock' || kind === 'rockIron') {   // a big dark boulder (36 wide, 26 high as drawn) with a stone or two leaning on it
    const iron = kind === 'rockIron';   // out past where iron is found: warmer, rust-streaked stone studded with orange lumps of ore
    K.mt = 'stone';
    K.add(P_BOULDER(vi), 0, 9, 0, 32, 24, 26, pick(iron ? ['#6a5850', '#725e54', '#64534b'] : ['#5c5e63', '#65676c', '#56585d'], vi), R() * 6.28, (R() - 0.5) * 0.2, (R() - 0.5) * 0.2, 0, 0.55);
    const n = 1 + vi % 2;
    for (let i = 0; i < n; i++) { const a = R() * 6.28, d = 15 + R() * 4, r = 7 + R() * 5; K.add(P_BOULDER(vi + 3 + i), Math.cos(a) * d, r * 0.3, Math.sin(a) * d, r * 1.3, r, r * 1.1, pick(iron ? ['#76625a', '#6a5a52'] : ['#6a6c70', '#5e6064'], i), R() * 6.28, 0, 0, 0, 0.45); }
    K.mt = null;
    if (iron) for (let i = 0; i < 9; i++) {   // the ore: rusty knobs breaking the surface all round, a few with a bright glint
      const a = i * 2.4 + vi, e = 0.15 + (i % 3) * 0.38, cx = Math.cos(a) * Math.cos(e), cz = Math.sin(a) * Math.cos(e), sz = 4.2 + (i % 4) * 1.1;
      K.add(P_PEA(7, 5), cx * 14.5, 9 + Math.sin(e) * 11.5, cz * 12, sz, sz * 0.8, sz, hex(i % 3 ? '#b8622c' : '#d4823a'), a, 0, 0, i % 4 === 0 ? 0.25 : 0, 0.4);
    }
  } else if (kind === 'post') {   // a squared-off stake with a strap of rope round it
    K.mt = 'bark'; K.add(P_CYL(6), 0, 0, 0, 8, 38, 8, hex(vi ? '#5a3e2a' : '#634530'), 0.3 * vi, 0, 0, 0, 0.5);
    K.add(P_CONE(6), 0, 38, 0, 8, 2.5, 8, hex('#6e4e36'), 0.3 * vi, 0, 0, 0, 0.4); K.mt = null;
    K.mt = 'cloth'; K.add(P_CYL(8), 0, 27, 0, 9.2, 2.2, 9.2, hex('#b08654'), 0, 0, 0.18, 0, 0.3); K.mt = null;
  } else if (kind === 'bush') {   // a low mound of leaf, darker at its heart (28 wide, 20 high)
    K.mt = 'plant';
    const G = ['#2b5426', '#34622d', '#3e7034', '#487c3c'], lumps = 5 + vi;
    for (let i = 0; i < lumps; i++) { const a = i / lumps * 6.28 + R(), d = 7 + R() * 4, r = 12 + R() * 5; K.add(P_KNOB(i % 5), Math.cos(a) * d, 6 + R() * 4, Math.sin(a) * d, r, r * 0.85, r, pick(G, i + vi), R() * 6.28, 0, 0, 0, 0.35); }
    K.add(P_KNOB(5), 0, 11, 0, 17, 14, 17, pick(G, 2 + vi), 0, 0, 0, 0, 0.35);
    K.mt = null;
  } else if (kind === 'fern') {   // fronds arching out and down from the middle (34 wide, 16 high)
    K.mt = 'plant';
    const G = ['#3d7a32', '#4a8a3a', '#356c2c'], fronds = 8 + vi;
    for (let i = 0; i < fronds; i++) {
      const a = i / fronds * 6.28 + R() * 0.5, L = 13 + R() * 5, up = 0.55 + R() * 0.35;
      // each frond in two pieces: up and out, then over and down
      const mx = Math.cos(a) * L * 0.5, mz = Math.sin(a) * L * 0.5, my = L * up * 0.7;
      K.add(P_PEA(8, 5), mx * 0.5, my * 0.5, mz * 0.5, 3.4, 1.2, L * 0.58, pick(G, i), -a + Math.PI / 2, -0.95 * up, 0, 0, 0.25);
      K.add(P_PEA(8, 5), mx * 1.45, my * 0.85, mz * 1.45, 3.0, 1.0, L * 0.55, pick(G, i + 1), -a + Math.PI / 2, 0.45, 0, 0, 0.25);
    }
    K.mt = null;
  } else if (kind === 'grass') {   // a tuft of blades leaning out (16 wide, 13 high)
    const G = ['#5b8c3a', '#6a9a44', '#4e7e32', '#78a64c'], blades = 9 + vi * 2;
    K.mt = 'plain';
    for (let i = 0; i < blades; i++) { const a = R() * 6.28, h = 9 + R() * 6, lean = 0.15 + R() * 0.45, o = R() * 3; K.add(P_BLADE(), Math.cos(a) * o, 0, Math.sin(a) * o, 1.6, h, 1.6, pick(G, i), -a + Math.PI / 2, lean, 0, 0, 0); }
    K.mt = null;
  } else if (kind === 'pebbles') {   // a few small stones in a scatter (16 wide)
    K.mt = 'stone';
    for (let i = 0; i < 4 + vi; i++) { const a = R() * 6.28, d = i ? 3 + R() * 5 : 0, r = 3.4 - i * 0.35 + R(); K.add(P_ROCK(i % 4), Math.cos(a) * d, r * 0.25, Math.sin(a) * d, r * 1.3, r * 0.8, r, pick(['#3c3e42', '#4a4b4f', '#56575b'], i), R() * 6.28, 0, 0, 0, 0.3); }
    K.mt = null;
  } else if (kind === 'shrooms') {   // a little clump of pink-capped mushrooms (14 wide, 11 high)
    K.mt = 'plain';
    for (let i = 0; i < 3 + vi; i++) {
      const a = R() * 6.28, d = i ? 2.5 + R() * 3 : 0, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 4 + R() * 4, w = 3.5 + R() * 2.5;
      K.add(P_CYL(6), x, 0, z, 1.3, h, 1.3, hex('#f0e2d4'), 0, 0, 0, 0, 0.25);
      K.add(P_PEA(9, 5), x, h, z, w, w * 0.55, w, pick(['#e89a82', '#f0a890', '#dc8a72'], i), 0, 0, 0, 0, 0.3);
    }
    K.mt = null;
  } else if (PETAL[kind]) {   // a patch of flowers on thin stems, with a leaf or two (40 wide, 22 high)
    const col = hex(PETAL[kind]), mid = hex(kind === 'flowerY' ? '#c28a1c' : kind === 'flowerW' ? '#f0c030' : '#f4d860');
    K.mt = 'plain';
    const n = 12 + vi * 3;
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, d = Math.sqrt(R()) * 15, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 4.5 + R() * 6, tx = x + (R() - 0.5) * 3, tz = z + (R() - 0.5) * 3;
      K.rod(P_CYL(4), x, 0, z, tx, h, tz, 0.35, hex('#3e6e2c'));
      const fs = 3.4 + R() * 1.4;
      K.add(P_PEA(7, 4), tx, h, tz, fs, fs * 0.38, fs, col, R() * 6.28, (R() - 0.5) * 0.5, (R() - 0.5) * 0.5, 0.08, 0);
      K.add(P_PEA(5, 3), tx, h + fs * 0.16, tz, fs * 0.36, fs * 0.3, fs * 0.36, mid, 0, 0, 0, 0.05, 0);
      if (i % 3 === 0) K.add(P_BLADE(), x, 0, z, 2.2, h * 0.45, 2.2, hex('#4a7e34'), R() * 6.28, 0.5, 0, 0, 0);
    }
    K.mt = null;
  } else if (kind === 'log') {   // a fallen log lying along the ground, sawn ends pale, a broken branch or two off it
    const L = 38, r = 4.2, ux = L / 2, col = hex(vi % 2 ? '#4e4034' : '#5c4a3a');
    logRod(K, -ux, r * 0.8, 0, ux, r * 0.85, 0, r, col);
    for (let j = 0; j < 2; j++) { const t = j ? 0.3 : -0.2, bx = ux * t, ba = (j ? 1 : -1) * (0.8 + 0.4 * ((vi * 0.37 + j * 0.21) % 1)); K_BR(K, bx, r * 1.2, 0, bx + Math.cos(ba) * r * 2.2, r * 2.4, Math.sin(ba) * r * 2.2, r * 0.3); }
  } else if (kind === 'nsticks') {   // a few fallen sticks, crossed, each with a twig off it
    const sd = vi * 0.37 + 0.11;
    for (let i = 0; i < 4; i++) {
      const a = sd * 3 + i * 1.3, L = 7 + 3 * hash(sd + i, 2), cx = Math.cos(a + 1.6) * (i - 1.5) * 1.6, cy = Math.sin(a + 1.6) * (i - 1.5) * 1.6, z = 0.8 + (i % 2) * 1.3;
      K.mt = 'bark'; K.rod(P_CYL(5), cx - Math.cos(a) * L, z, cy - Math.sin(a) * L, cx + Math.cos(a) * L, z + 0.4, cy + Math.sin(a) * L, 0.75, hex(['#6e5235', '#5e4630', '#7a5c3c'][i % 3]));
      const tx = cx + Math.cos(a) * L * 0.3, ty = cy + Math.sin(a) * L * 0.3; K.rod(P_CYL(4), tx, z, ty, tx + Math.cos(a + 0.7) * 4, z + 0.6, ty + Math.sin(a + 0.7) * 4, 0.35, hex('#6e5235')); K.mt = null;
    }
  } else if (kind === 'nstones') {   // a little pile of grey stones
    const sd = vi * 0.29 + 0.07;
    for (let i = 0; i < 4; i++) { const a = sd + i * 1.7, r = i ? 6 : 0; K.mt = 'stone'; K.add(P_ROCK((i + vi) % 4), Math.cos(a) * r, 1.4, Math.sin(a) * r, 7.5 - i, 4.6 - i * 0.4, 6.2 - i * 0.6, hex(['#8d8b85', '#a19f98', '#77756f', '#96938b'][i]), a); K.mt = null; }
  } else if (kind.startsWith('nshroom')) {   // pale stems, brown caps flecked white; one more mushroom for each you can take
    const n = +kind.slice(7), sd = vi * 1.3 + 0.4;
    for (let i = 0; i < n + 1; i++) {
      const a = sd + i * 2.4, x = Math.cos(a) * 4 * i, y = Math.sin(a) * 4 * i, h = 5 + 2 * ((i + vi) % 2);
      K.mt = 'plain'; K.add(P_CYL(6), x, 0, y, 1.8, h, 1.8, hex('#e8dcc4')); K.add(P_PEA(10, 6), x, h, y, 7.2, 4, 7.2, hex('#b07848'));
      for (let f = 0; f < 4; f++) { const q = a * 3 + f * 1.6; K.add(P_PEA(5, 3), x + Math.cos(q) * 1.9, h + 1.55, y + Math.sin(q) * 1.9, 1, 0.5, 1, hex('#f2ead8')); } K.mt = null;
    }
  } else if (kind === 'bbush') {   // a berry bush: rounder and a cooler, glossier green than the woods' bushes, so you know one even picked bare
    K.mt = 'plant';
    const G = ['#245a44', '#2c6a50', '#347858', '#3c8460'], lumps = 6 + vi;
    for (let i = 0; i < lumps; i++) { const a = i / lumps * 6.28 + R(), d = 6 + R() * 3, r = 12 + R() * 3; K.add(P_KNOB(i % 5), Math.cos(a) * d, 7 + R() * 3, Math.sin(a) * d, r, r * 0.95, r, pick(G, i + vi), R() * 6.28, 0, 0, 0, 0.35); }
    K.add(P_KNOB(5), 0, 12, 0, 17, 15, 17, pick(G, 2 + vi), 0, 0, 0, 0, 0.35);
    K.mt = null;
  } else if (kind === 'nberries') {   // bunches of fat red berries all over the outside of a berry bush
    for (let c = 0; c < 9; c++) {
      const a = c * 2.1 + vi * 0.7, e = 0.1 + (c % 3) * 0.4, rr = 15.5 - (c % 3) * 2.5, cx = Math.cos(a) * Math.cos(e) * rr, cz = Math.sin(a) * Math.cos(e) * rr, cy = 7 + Math.sin(e) * 13;
      for (let i = 0; i < 3; i++) { const q = a + i * 2.1; K.add(P_PEA(7, 5), cx + Math.cos(q) * 1.6, cy + (i - 1) * 1.2, cz + Math.sin(q) * 1.6, 3.4, 3.4, 3.4, hex(i === 1 ? '#a8182c' : '#dc2c3c'), 0, 0, 0, 0.12); }
    }
  } else return null;
  return K.geometry();
}

// one instanced draw (and its outline) per kind and way of building it; a set for the woods, and one for what you gather
class PropSet {
  constructor(cap) { this.cap = cap; this.k = {}; }
  _kind(kind) {
    let L = this.k[kind]; if (L !== undefined) return L;
    const P = PROP_KIND[kind]; if (!P) return (this.k[kind] = null);
    const M = propMat(P.mat); L = [];
    for (let v = 0; v < P.n; v++) {
      const g = propModel(kind, v), m = new THREE.InstancedMesh(g, M.m, this.cap);
      m.count = 0; m.frustumCulled = false; scene.add(P.shadow ? castsShadow(m) : m);
      let e = null; if (P.edge) { e = new THREE.InstancedMesh(g, M.e, this.cap); e.count = 0; e.frustumCulled = false; e.instanceMatrix = m.instanceMatrix; scene.add(e); }
      L.push({ m, e, n: 0, items: [], shN: 0, shadow: P.shadow });
    }
    return (this.k[kind] = L);
  }
  begin() { for (const kind in this.k) if (this.k[kind]) for (const B of this.k[kind]) B.n = 0; }
  // one thing: its kind and variant, its foot at (x, y), sized as its picture was, turned by its seed; tilt a beat when struck
  add(kind, v, x, y, s, seed = 0, shakeT = -99) {
    const L = this._kind(kind); if (!L) return false;
    const B = L[((v % L.length) + L.length) % L.length]; if (B.n >= this.cap) return true;
    _tq.setFromEuler(_te.set(0, (seed * 7919 % 1) * 6.283 + x * 0.013, 0));
    const st = S.t - shakeT; if (st >= 0 && st < 0.45) { _tq2.setFromAxisAngle(_tax.set(Math.sin(seed * 9), 0, Math.cos(seed * 9)), Math.sin(st * 30) * 0.12 * (1 - st / 0.45)); _tq.premultiply(_tq2); }
    const M = _tm.compose(_tp.set(x, 0, y), _tq, _ts.set(s, s, s)), d = (x - S.p.x) ** 2 + (y - S.p.y) ** 2;
    let it = B.items[B.n]; if (!it) it = B.items[B.n] = { d: 0, m: new Float32Array(16) };
    it.d = d; M.toArray(it.m); B.n++;
    return true;
  }
  end() {   // nearest first, so the sun's pass can draw only those inside its map
    const SR = shadowReach() ** 2;
    for (const kind in this.k) if (this.k[kind]) for (const B of this.k[kind]) {
      const L = B.items.slice(0, B.n).sort((a, b) => a.d - b.d), arr = B.m.instanceMatrix.array; B.shN = 0;
      for (let i = 0; i < L.length; i++) { arr.set(L[i].m, i * 16); if (L[i].d < SR) B.shN = i + 1; }
      B.m.count = B.n; if (B.e) B.e.count = B.n; B.m.instanceMatrix.needsUpdate = true;
    }
  }
}
const propsW = new PropSet(2400), propsN = new PropSet(300);
function propsFrame() { PROP_PC.value.set(S.p.x, 0, S.p.y); }
