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
const P_BLADE = () => prim('blade', () => { const g = new THREE.ConeGeometry(0.5, 1, 4, 1); g.scale(1, 1, 0.25); g.translate(0, 0.5, 0); return g; });

// the models, foot at the origin, in the pictures' own units (each is drawn at the scale its picture was)
const PETAL = { flowerY: '#f2cf34', flowerB: '#8796ee', flowerR: '#e43c34', flowerW: '#f4f1e6', flowerV: '#9644cc' };
const PROP_KIND = {
  rock: { n: 3, mat: 'still', edge: true, shadow: true }, post: { n: 2, mat: 'still', edge: true, shadow: true },
  bush: { n: 3, mat: 'plant', edge: true, shadow: true }, fern: { n: 3, mat: 'plant', edge: true, shadow: false },
  grass: { n: 3, mat: 'grass', edge: false, shadow: false }, pebbles: { n: 3, mat: 'still', edge: true, shadow: false },
  shrooms: { n: 2, mat: 'still', edge: true, shadow: false },
};
for (const k in PETAL) PROP_KIND[k] = { n: 2, mat: 'grass', edge: false, shadow: false };
function propModel(kind, vi) {
  let s = 4211 + vi * 337 + kind.length * 59; const R = () => (s = (s * 16807) % 2147483647) / 2147483647, K = new Kit();
  const pick = (list, j) => hex(list[((j % list.length) + list.length) % list.length]);
  if (kind === 'rock') {   // a big dark boulder (36 wide, 26 high as drawn) with a stone or two leaning on it
    K.mt = 'stone';
    K.add(P_BOULDER(vi), 0, 9, 0, 32, 24, 26, pick(['#5c5e63', '#65676c', '#56585d'], vi), R() * 6.28, (R() - 0.5) * 0.2, (R() - 0.5) * 0.2, 0, 0.55);
    const n = 1 + vi % 2;
    for (let i = 0; i < n; i++) { const a = R() * 6.28, d = 15 + R() * 4, r = 7 + R() * 5; K.add(P_BOULDER(vi + 3 + i), Math.cos(a) * d, r * 0.3, Math.sin(a) * d, r * 1.3, r, r * 1.1, pick(['#6a6c70', '#5e6064'], i), R() * 6.28, 0, 0, 0, 0.45); }
    K.mt = null;
  } else if (kind === 'post') {   // a squared-off stake with a strap of rope round it
    K.mt = 'bark'; K.add(P_CYL(6), 0, 0, 0, 8, 38, 8, hex(vi ? '#5a3e2a' : '#634530'), 0.3 * vi, 0, 0, 0, 0.5);
    K.add(P_CONE(6), 0, 38, 0, 8, 2.5, 8, hex('#6e4e36'), 0.3 * vi, 0, 0, 0, 0.4); K.mt = null;
    K.mt = 'cloth'; K.add(P_CYL(8), 0, 27, 0, 9.2, 2.2, 9.2, hex('#b08654'), 0, 0, 0.18, 0, 0.3); K.mt = null;
  } else if (kind === 'bush') {   // a low mound of leaf, darker at its heart (28 wide, 20 high)
    K.mt = 'plant';
    const G = ['#2b5426', '#34622d', '#3e7034', '#487c3c'], lumps = 5 + vi;
    for (let i = 0; i < lumps; i++) { const a = i / lumps * 6.28 + R(), d = 7 + R() * 4, r = 12 + R() * 5; K.add(P_LUMP(i % 5), Math.cos(a) * d, 6 + R() * 4, Math.sin(a) * d, r, r * 0.85, r, pick(G, i + vi), R() * 6.28, 0, 0, 0, 0.35); }
    K.add(P_LUMP(5), 0, 11, 0, 17, 14, 17, pick(G, 2 + vi), 0, 0, 0, 0, 0.35);
    K.mt = null;
  } else if (kind === 'fern') {   // fronds arching out and down from the middle (34 wide, 16 high)
    K.mt = 'plant';
    const G = ['#3d7a32', '#4a8a3a', '#356c2c'], fronds = 8 + vi;
    for (let i = 0; i < fronds; i++) {
      const a = i / fronds * 6.28 + R() * 0.5, L = 13 + R() * 5, up = 0.55 + R() * 0.35;
      // each frond in two pieces: up and out, then over and down
      const mx = Math.cos(a) * L * 0.5, mz = Math.sin(a) * L * 0.5, my = L * up * 0.7;
      K.add(P_BALL(), mx * 0.5, my * 0.5, mz * 0.5, 3.4, 1.2, L * 0.58, pick(G, i), -a + Math.PI / 2, -0.95 * up, 0, 0, 0.25);
      K.add(P_BALL(), mx * 1.45, my * 0.85, mz * 1.45, 3.0, 1.0, L * 0.55, pick(G, i + 1), -a + Math.PI / 2, 0.45, 0, 0, 0.25);
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
      K.add(P_BALL(), x, h, z, w, w * 0.55, w, pick(['#e89a82', '#f0a890', '#dc8a72'], i), 0, 0, 0, 0, 0.3);
    }
    K.mt = null;
  } else if (PETAL[kind]) {   // a patch of flowers on thin stems, with a leaf or two (40 wide, 22 high)
    const col = hex(PETAL[kind]), mid = hex(kind === 'flowerY' ? '#c28a1c' : kind === 'flowerW' ? '#f0c030' : '#f4d860');
    K.mt = 'plain';
    const n = 14 + vi * 4;
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, d = Math.sqrt(R()) * 15, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 4.5 + R() * 6, tx = x + (R() - 0.5) * 3, tz = z + (R() - 0.5) * 3;
      K.rod(P_CYL(4), x, 0, z, tx, h, tz, 0.35, hex('#3e6e2c'));
      const fs = 3.4 + R() * 1.4;
      K.add(P_BALL(), tx, h, tz, fs, fs * 0.38, fs, col, R() * 6.28, (R() - 0.5) * 0.5, (R() - 0.5) * 0.5, 0.08, 0);
      K.add(P_BALL(), tx, h + fs * 0.16, tz, fs * 0.36, fs * 0.3, fs * 0.36, mid, 0, 0, 0, 0.05, 0);
      if (i % 3 === 0) K.add(P_BLADE(), x, 0, z, 2.2, h * 0.45, 2.2, hex('#4a7e34'), R() * 6.28, 0.5, 0, 0, 0);
    }
    K.mt = null;
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
      L.push({ m, e, n: 0 });
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
    B.m.setMatrixAt(B.n++, _tm.compose(_tp.set(x, 0, y), _tq, _ts.set(s, s, s)));
    return true;
  }
  end() {
    for (const kind in this.k) if (this.k[kind]) for (const B of this.k[kind]) { B.m.count = B.n; if (B.e) B.e.count = B.n; B.m.instanceMatrix.needsUpdate = true; }
  }
}
const propsW = new PropSet(2400), propsN = new PropSet(300);
function propsFrame() { PROP_PC.value.set(S.p.x, 0, S.p.y); }
