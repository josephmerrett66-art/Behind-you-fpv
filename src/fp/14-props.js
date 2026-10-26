// ================= the woods' small things, built solid: rocks, posts, bushes, ferns, grass, flowers, pebbles, mushrooms =================
// Every one of these used to be a painted picture turned to face you. Now each is modelled a few ways over in the pictures'
// own colours and sizes (a rock is as wide and as tall as its picture was), with the same dark outline as the trees, and
// stood about the woods many times over in one draw per model. Plants lean in the breeze; rocks and posts stand still.
// Out at the edge of where they used to be drawn they thin away rather than pop.
const PROP_PC = { value: new V3() };
// the trees' own paint and light, with a gentler sway for things this small and a soft edge round you
function propMats(sway, cullR) {
  const sw = `position.y * ${sway.toFixed(4)}`, cut = `uniform vec3 pc; uniform float cullR;
    void main() { if (cullR > 0.0 && distance(vW.xz, pc.xz) > cullR - 120.0 * fract(sin(dot(gl_FragCoord.xy, vec2(41.31, 17.93))) * 4375.85)) discard;`;
  const uni = () => Object.assign({}, LU, { pc: PROP_PC, cullR: { value: cullR } });
  const m = new THREE.ShaderMaterial({ uniforms: uni(), vertexShader: treeMat.vertexShader.replace('max(0.0, position.y - 24.0) / 90.0', sw), fragmentShader: treeMat.fragmentShader.replace('void main() {', cut) });
  // Thin leaves receive light on both faces. Use a gentle upward normal only for
  // living foliage; rocks, logs and other solid props keep their original lighting.
  // The undergrowth's leaves are marked soft for the ink (07-ink), so a bush or a fern gets a fine dark-green edge to each
  // leaf rather than a black one round every gap; and a bush's leaves are smaller than a tree's, and lit at their edges,
  // paler where they catch the light than in their middles.
  if (sway > 0) for (const [a, b] of [
    ['smoothstep(-0.5, 0.9, N.y)', 'smoothstep(-0.5, 0.9, abs(N.y))'],
    ['vec3 o = c * lightAtS(vW, N, 1.0, sh)', 'vec3 o = c * lightAtS(vW, leaf ? normalize(vec3(N.x * 0.45, abs(N.y) * 0.4 + 0.65, N.z * 0.45)) : N, leaf ? 0.65 : 1.0, sh)'],
    ['frond ? 0.5 : leaf || needle ? 0.0 : 1.0', 'frond || leaf ? 0.5 : needle ? 0.0 : 1.0'],
    ['vec4 f=foliageAt(vG,vTreeD,cut);', 'vec4 f=foliageAt(vG*1.8,vTreeD*1.8,cut);'],
    ['c=vC*(.64+.43*up)*cluster*mix(.86,1.14,blade);', 'c=vC*(.7+.43*up)*cluster*mix(1.2,.9,smoothstep(.3,.62,f.r));'],
  ]) { if (!m.fragmentShader.includes(a)) throw new Error('propMats: the tree shader changed'); m.fragmentShader = m.fragmentShader.replace(a, b); }
  const e = new THREE.ShaderMaterial({ uniforms: uni(), side: THREE.BackSide, vertexShader: treeEdge.vertexShader.replace('max(0.0, position.y - 24.0) / 90.0', sw), fragmentShader: treeEdge.fragmentShader.replace('void main() {', cut) });
  return { m, e };
}
const PROP_MAT = { still: null, plant: null, grass: null, sap: null };
function propMat(k) {
  if (!PROP_MAT.still) { PROP_MAT.still = propMats(0, 0); PROP_MAT.plant = propMats(0.02, VIS.plants); PROP_MAT.grass = propMats(0.006, VIS.plants); PROP_MAT.sap = propMats(0.011, VIS.plants); }
  return PROP_MAT[k];
}

// a boulder: chunky stone, as if split off along a few planes into broad flat faces with sharp edges between them, the rest
// of it knocked about, and flat underneath where it sits in the ground
const P_BOULDER = (k = 0) => prim('boulder' + k, () => {
  const g = new THREE.IcosahedronGeometry(0.5, 2), p = g.attributes.position, v = new V3(), cuts = [];
  let s = 7 + k * 1013; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 10; i++) { const y = R() * 1.2 - 0.35, a = R() * 6.283, r = Math.sqrt(1 - y * y); cuts.push([new V3(Math.cos(a) * r, y, Math.sin(a) * r), 0.34 + R() * 0.1]); }
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(0.92 + 0.14 * hash(Math.round(v.x * 13) + k * 3.7, Math.round(v.y * 11) * 1.3 + Math.round(v.z * 12) * 0.7));
    for (const [n, d] of cuts) { const o = v.dot(n) - d; if (o > 0) v.addScaledVector(n, -o); }
    if (v.y < -0.18) v.y = -0.18 + (v.y + 0.18) * 0.2;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
});
// a blade or a frond: flat, wide at the foot and running to a point
const P_PEA = (w = 7, h = 5) => prim('pea' + w + h, () => new THREE.SphereGeometry(0.5, w, h));   // a ball with fewer faces, for things too small to show them
const P_KNOB = (k = 0, lo = false) => prim('knob' + k + (lo ? 'lo' : ''), () => {   // the trees' soft lump of leaf, in fewer faces for a bush (lo: fewer still, for the little ones)
  const g = lo ? new THREE.SphereGeometry(0.5, 7, 5) : new THREE.SphereGeometry(0.5, 10, 7), p = g.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 0.9 + 0.14 * Math.sin(v.x * 9 + k) * Math.sin(v.y * 8 + k * 2) * Math.sin(v.z * 10 + k * 3) + 0.07 * Math.sin(v.x * 27 + v.y * 13 + v.z * 21 + k); v.multiplyScalar(n); v.y *= 0.88; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
});
// a blade of grass that curves over as it rises: a folded strip, wide at the foot and running to a point, faced both ways
const P_CBLADE = (k = 0) => prim('cblade' + k, () => {
  const N = 5, bend = 0.35 + 0.12 * k, pos = [], idx = [];
  for (let i = 0; i <= N; i++) { const t = i / N, w = 0.5 * Math.pow(1 - t, 0.75) + 0.02, z = bend * t * t, y = t * (1 - 0.18 * t * k * 0.5);
    pos.push(-w, y, z, 0, y, z - 0.06 * (1 - t), w, y, z); }
  for (let i = 0; i < N; i++) { const a = i * 3, b = a + 3;
    for (const [p, q, r] of [[a, a + 1, b], [a + 1, b + 1, b], [a + 1, a + 2, b + 1], [a + 2, b + 2, b + 1]]) idx.push(p, q, r, p, r, q); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
});
// shade a part just put into a kit from one colour at its foot to another at its top (light on the outside, dark in its heart)
function kitGrad(K, add, bot, top, pow = 1) {
  const n0 = K.col.length / 3; add(); const n1 = K.col.length / 3;
  let lo = 1e9, hi = -1e9; for (let i = n0; i < n1; i++) { const y = K.pos[i * 3 + 1]; lo = Math.min(lo, y); hi = Math.max(hi, y); }
  for (let i = n0; i < n1; i++) { const t = Math.pow(clamp((K.pos[i * 3 + 1] - lo) / Math.max(hi - lo, 1e-3), 0, 1), pow); for (let c = 0; c < 3; c++) K.col[i * 3 + c] = bot[c] + (top[c] - bot[c]) * t; }
}
// a bush: a dark heart, and leafy clusters heaped round it in a dome, each paler toward the light on top; a twig or two at the foot
function bushKit(K, R, vi, dark, mid, light, tall) {
  const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  K.mt = 'plant';
  K.add(P_KNOB(5), 0, 7, 0, 22, 14 * tall, 22, dark, 0, 0, 0, 0, 0.35);
  const n = 19 + vi * 2, ga = 2.39996;   // (a bush is drawn by the dozen under a stand: kept to a few thousand points)
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, e = Math.asin(f) * 1.05, a = i * ga + vi * 1.3 + R() * 0.4, rr = 12.5 * Math.cos(e) + 1 + R() * 1.5;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = 3.5 + Math.sin(e) * 12 * tall, sz = 8 - f * 2.5 + R() * 1.8, h = mixc(mid, light, 0.45 + 0.55 * f + R() * 0.15), d = mixc(dark, mid, 0.3 + 0.5 * f);
    kitGrad(K, () => K.add(P_KNOB(i % 5), x, y, z, sz * 1.1, sz * 0.9, sz * 1.1, h, R() * 6.28, 0, 0, 0, 0.35), d, h, 0.8);
  }
  for (let i = 0; i < 15; i++) {
    const f = R() * 0.85, e = Math.asin(f), a = R() * 6.28, rr = 14.5 * Math.cos(e) + 1.5, x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = 3 + Math.sin(e) * 13.5 * tall, c = mixc(mid, light, 0.5 + 0.5 * f + R() * 0.2);
    K.add(P_KNOB(i % 5, true), x, y, z, 3.6 + R() * 1.6, 1.5, 2.4 + R(), c, -a, 0.6 - f * 0.9, R() - 0.5, 0, 0.35);
  }
  K.mt = 'bark';
  for (let j = 0; j < 3; j++) { const a = j * 2.1 + vi; K.rod(P_CYL(4), Math.cos(a) * 3, 0, Math.sin(a) * 3, Math.cos(a) * 9, 4.5, Math.sin(a) * 9, 0.7, hex('#4a3826')); }
  K.mt = null;
}
// a fern frond, one piece: a stalk rising from the middle and arching over, and either side of it a band that drops away
// a little from the stalk, as a frond does. The leaflets themselves are cut out of the band where it's drawn (11-trees):
// the band carries, in gu, how far along the frond each point is (in leaflets) and how far out from the stalk (0 to 1),
// so each leaflet comes out crisp at any size, swept forward and lobed along its edges, without a face for every lobe.
// Length 1 along +z, faced both ways.
const FROND_N = 14;   // leaflets up each side
const P_FROND = (k = 0) => prim('frond' + k, () => {
  const N = 10, pos = [], fuv = [], arch = 0.62 + 0.1 * k, droop = 0.18 - 0.1 * k;
  const sp = t => { const u = 1 - t; return [0, 2 * u * t * arch + t * t * droop, 2 * u * t * 0.3 + t * t]; };   // a curve: up steeply, then over
  const W = t => 0.36 * Math.sin(Math.PI * clamp((t - 0.06) / 0.97, 0, 1)) + 0.035;   // longest leaflets near the middle, shrinking to the tip
  const row = t => { const c = sp(t), w = W(t), r = [];   // across the frond: out from the stalk, dropping away a little at the edges, swept forward
    for (const v of [-1, -0.5, 0, 0.5, 1]) { const a = Math.abs(v); r.push([[v * w, c[1] + w * (0.1 * a - 0.32 * a * a), c[2] + w * 0.3 * a], [t * FROND_N, v]]); } return r; };
  const quad = (a, b, c, d) => { for (const [p, q, r] of [[a, b, c], [c, b, d]]) { pos.push(...p[0], ...q[0], ...r[0], ...p[0], ...r[0], ...q[0]); fuv.push(...p[1], ...q[1], ...r[1], ...p[1], ...r[1], ...q[1]); } };
  for (let i = 0; i < N; i++) { const t0 = 0.04 + 0.96 * i / N, t1 = 0.04 + 0.96 * (i + 1) / N, A = row(t0), B = row(t1); for (let j = 0; j < 4; j++) quad(A[j], A[j + 1], B[j], B[j + 1]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('fuv', new THREE.Float32BufferAttribute(fuv, 2)); g.computeVertexNormals(); return g;
});
// put a frond in, its band carrying where each point sits on the frond (above), coloured from its foot to its top
function frondAdd(K, k, bot, top, pow, ...at) {
  const g = P_FROND(k), f = g.attributes.fuv, first = K.gu.length, m = K.mt; K.mt = 9;
  kitGrad(K, () => K.add(g, ...at), bot, top, pow); K.mt = m;
  for (let i = 0; i < f.count; i++) { K.gu[first + i * 3] = f.getX(i); K.gu[first + i * 3 + 1] = f.getY(i); K.gu[first + i * 3 + 2] = 0; }
}
const P_BLADE = () => prim('blade', () => { const g = new THREE.ConeGeometry(0.5, 1, 4, 1); g.scale(1, 1, 0.25); g.translate(0, 0.5, 0); return g; });

// the models, foot at the origin, in the pictures' own units (each is drawn at the scale its picture was)
const PETAL = { flowerY: '#f2cf34', flowerB: '#8796ee', flowerR: '#e43c34', flowerW: '#f4f1e6', flowerV: '#9644cc' };
const PROP_KIND = {
  rock: { n: 3, mat: 'still', edge: true, shadow: true }, rockIron: { n: 3, mat: 'still', edge: true, shadow: true }, post: { n: 2, mat: 'still', edge: true, shadow: true },
  bush: { n: 3, mat: 'plant', edge: false, shadow: true }, fern: { n: 3, mat: 'plant', edge: false, shadow: false },   // (a frond's outline would be its band's, not its leaflets')
  grass: { n: 3, mat: 'grass', edge: false, shadow: false }, pebbles: { n: 3, mat: 'still', edge: true, shadow: false },
  shrooms: { n: 2, mat: 'still', edge: true, shadow: false },
};
for (const k in PETAL) PROP_KIND[k] = { n: 2, mat: 'grass', edge: false, shadow: false };
// what you gather, each one its own few models now rather than rebuilt by hand every time you walk on (30-things)
Object.assign(PROP_KIND, { nsticks: { n: 3, mat: 'still', edge: true, shadow: false }, nstones: { n: 4, mat: 'still', edge: true, shadow: false },
  nshroom1: { n: 2, mat: 'still', edge: true, shadow: false }, nshroom2: { n: 2, mat: 'still', edge: true, shadow: false }, nshroom3: { n: 2, mat: 'still', edge: true, shadow: false },
  nberries: { n: 3, mat: 'still', edge: true, shadow: false }, bbush: { n: 3, mat: 'plant', edge: false, shadow: true } });
PROP_KIND.log = { n: 3, mat: 'still', edge: true, shadow: true };
PROP_KIND.sapling = { n: 3, mat: 'sap', edge: true, shadow: true };
function propModel(kind, vi) {
  let s = 4211 + vi * 337 + kind.length * 59; const R = () => (s = (s * 16807) % 2147483647) / 2147483647, K = new Kit();
  const pick = (list, j) => hex(list[((j % list.length) + list.length) % list.length]);
  const stoneHex = (list, j) => paintHex(list[j % list.length], 0.72);   // a boulder's grey as it's written, a little darker (paintHex, 00-core): a stone, not a dark lump
  // Seat separate stones independently; a small side stone must not define the main boulder's foot.
  const seat = (start, inset = 0.35) => {
    let bottom=Infinity;for(let i=start+1;i<K.pos.length;i+=3)bottom=Math.min(bottom,K.pos[i]);
    const dy=-bottom-inset;for(let i=start+1;i<K.pos.length;i+=3)K.pos[i]+=dy;return dy;
  };
  if (kind === 'rock' || kind === 'rockIron') {   // a big boulder (36 wide, 26 high as drawn) with a stone or two leaning on it
    const iron = kind === 'rockIron';   // out past where iron is found: warmer, rust-streaked stone studded with orange lumps of ore
    K.mt = 'stone';
    K.add(P_BOULDER(vi), 0, 9, 0, 32, 24, 26, stoneHex(iron ? ['#7a665a', '#82695c', '#735f54'] : ['#6c6d6a', '#767772', '#666866'], vi), R() * 6.28, (R() - 0.5) * 0.2, (R() - 0.5) * 0.2, 0, 0.55);
    const rockY = seat(0, 0.6);
    const n = 1 + vi % 2;
    for (let i = 0; i < n; i++) { const a = R() * 6.28, d = 15 + R() * 4, r = 7 + R() * 5, start=K.pos.length; K.add(P_BOULDER(vi + 3 + i), Math.cos(a) * d, r * 0.3, Math.sin(a) * d, r * 1.3, r, r * 1.1, stoneHex(iron ? ['#857066', '#7a665c'] : ['#7a7b76', '#6e706c'], i), R() * 6.28, 0, 0, 0, 0.45); seat(start); }
    K.mt = null;
    if (iron) for (let i = 0; i < 9; i++) {   // the ore: rusty knobs breaking the surface all round, a few with a bright glint
      const a = i * 2.4 + vi, e = 0.15 + (i % 3) * 0.38, cx = Math.cos(a) * Math.cos(e), cz = Math.sin(a) * Math.cos(e), sz = 4.2 + (i % 4) * 1.1;
      K.add(P_PEA(7, 5), cx * 14.5, 9 + rockY + Math.sin(e) * 11.5, cz * 12, sz, sz * 0.8, sz, hex(i % 3 ? '#b8622c' : '#d4823a'), a, 0, 0, i % 4 === 0 ? 0.25 : 0, 0.4);
    }
  } else if (kind === 'post') {   // a squared-off stake with a strap of rope round it
    K.mt = 'bark'; K.add(P_CYL(6), 0, 0, 0, 8, 38, 8, hex(vi ? '#5a3e2a' : '#634530'), 0.3 * vi, 0, 0, 0, 0.5);
    K.add(P_CONE(6), 0, 38, 0, 8, 2.5, 8, hex('#6e4e36'), 0.3 * vi, 0, 0, 0, 0.4); K.mt = null;
    K.mt = 'cloth'; K.add(P_CYL(8), 0, 27, 0, 9.2, 2.2, 9.2, hex('#b08654'), 0, 0, 0.18, 0, 0.3); K.mt = null;
  } else if (kind === 'bush') {   // a low leafy mound (28 wide, 20 high): deep green in its heart, sunlit yellow-green on top
    bushKit(K, R, vi, hex('#4a7a3a'), hex('#3a6a2e'), hex('#6fa24a'), 1);   // (a heart lit enough to show leaves through the gaps, not black)
  } else if (kind === 'fern') {   // a crown of fronds rising from one root and arching out over the ground (34 wide, 16 high)
    const G = [['#2a5a22', '#6aa646'], ['#2f6126', '#78b250'], ['#27541f', '#5e9a3e']], fronds = 8 + vi;
    K.mt = 'plant'; K.add(P_KNOB(vi), 0, 0.5, 0, 4.5, 2.5, 4.5, hex('#33461f'), 0, 0, 0, 0, 0.3);
    for (let i = 0; i < fronds; i++) {
      const a = i * 2.39996 + vi + R() * 0.3, L = 15 + R() * 6, c = G[(i + vi) % 3];
      frondAdd(K, i % 2, hex(c[0]), hex(c[1]), 0.7, Math.cos(a) * 0.8, 0.5, Math.sin(a) * 0.8, L, L * (0.9 + R() * 0.35), L, hex(c[1]), -a + Math.PI / 2, -0.05 + R() * 0.15, (R() - 0.5) * 0.3, 0, 0.25);
    }
    for (let i = 0; i < 3; i++) {   // young fronds still standing up in the middle, a fresher green
      const a = i * 2.1 + vi, L = 7 + R() * 3;
      frondAdd(K, 1, hex('#3a6e2a'), hex('#9cc864'), 0.8, 0, 0.5, 0, L * 0.8, L * 1.5, L * 0.5, hex('#7ab04e'), -a + Math.PI / 2, 0, 0, 0, 0.25);
    }
    K.mt = null;
  } else if (kind === 'grass') {   // a tuft of curving blades springing from a dark base (16 wide, 13 high), green at the root, pale at the tips
    const G = [['#3d542e', '#8ca95b'], ['#405d35', '#9ab96c'], ['#344e2c', '#799d56'], ['#4c6134', '#aca96b']], blades = 18 + vi * 3;
    K.mt = 'plant'; K.add(P_KNOB(vi), 0, 0.3, 0, 5, 1.4, 5, hex('#3a5a26'), 0, 0, 0, 0, 0.3);
    K.mt = 'plain';
    for (let i = 0; i < blades; i++) {
      const a = i * 2.39996 + R() * 0.6, o = R() * 2.6, h = 7 + R() * 8 - (i % 4 === 3 ? 3 : 0), w = 0.85 + R() * 0.65, c = G[(i + vi) % 4];
      kitGrad(K, () => K.add(P_CBLADE(i % 3), Math.cos(a) * o, 0, Math.sin(a) * o, w, h, h * (0.55 + R() * 0.5), hex(c[1]), -a + Math.PI / 2, 0, 0, 0, 0), hex(c[0]), hex(c[1]), 0.9);
    }
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
    const L = 38, r = 4.2, ux = L / 2, col = paintHex(vi % 2 ? '#4e4034' : '#5c4a3a', 0.85);   // (the trees' own bark, 11-trees)
    logRod(K, -ux, r * 0.8, 0, ux, r * 0.85, 0, r, col);
    for (let j = 0; j < 2; j++) { const t = j ? 0.3 : -0.2, bx = ux * t, ba = (j ? 1 : -1) * (0.8 + 0.4 * ((vi * 0.37 + j * 0.21) % 1)); K_BR(K, bx, r * 1.2, 0, bx + Math.cos(ba) * r * 2.2, r * 2.4, Math.sin(ba) * r * 2.2, r * 0.3); }
  } else if (kind === 'sapling') {   // a young tree come up where the light gets in: a little pine, a little spruce, or an oak whip in leaf
    if (vi < 2) {
      const H = 44 + vi * 10, tiers = 4 + vi, G = vi ? [['#1f4a36', '#4a8a66'], ['#245040', '#559674']] : [['#2a4f2c', '#62964f'], ['#30582f', '#70a258']];
      K.mt = 'bark'; K.add(P_CONE(6), 0, 0, 0, 3.4, H, 3.4, paintHex('#5c4232', 0.85), 0, 0, 0, 0, 0.3);
      K.mt = 8;
      for (let i = 0; i < tiers; i++) {
        const f = i / (tiers - 1), y = 7 + f * (H - 18), r = (vi ? 22 : 27) * (1 - f * 0.72) * (0.92 + 0.16 * R()), h = 13 - f * 3, c = G[i % 2];
        kitGrad(K, () => K.add(P_TIER((i + vi) % 4), 0, y, 0, r, h, r, hex(c[1]), R() * 6.28, 0, (R() - 0.5) * 0.12, 0, 0.3), hex(c[1]), hex(c[0]), 1.2);
      }
      K.add(P_CONE(6), 0, H - 9, 0, 4.5, 11, 4.5, hex(G[0][1]), 0, 0, 0, 0, 0.28);
    } else {
      K.mt = 'bark'; K.rod(P_CYL(5), 0, 0, 0, 1.5, 40, -1, 1.5, paintHex('#4c3c2e', 0.85));
      const tips = [[0, 46, 0]];
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4, y0 = 18 + i * 7, L = 11 + R() * 4, t = [Math.cos(a) * L, y0 + 9, Math.sin(a) * L]; K.rod(P_CYL(4), 0.5, y0, 0, t[0], t[1], t[2], 0.8, paintHex('#4c3c2e', 0.85)); tips.push(t); }
      K.mt = 'plant';
      const G = ['#36622a', '#447434', '#528440'];
      tips.forEach(([x, y, z], i) => kitGrad(K, () => K.add(P_KNOB(i % 5), x, y, z, 15 - i, 12 - i * 0.8, 15 - i, hex(G[i % 3]), R() * 6.28, 0, 0, 0, 0.3), hex('#24451c'), hex(G[i % 3]), 0.8));
    }
    K.mt = null;
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
  } else if (kind === 'bbush') {   // a berry bush: rounder and a cooler, glossier blue-green than the woods' bushes, so you know one even picked bare
    bushKit(K, R, vi, hex('#3a6e5a'), hex('#2c6a50'), hex('#5aa27a'), 1.12);
  } else if (kind === 'nberries') {   // bunches of fat red berries all over the outside of a berry bush
    for (let c = 0; c < 9; c++) {
      const a = c * 2.1 + vi * 0.7, e = 0.1 + (c % 3) * 0.4, rr = 15.5 - (c % 3) * 2.5, cx = Math.cos(a) * Math.cos(e) * rr, cz = Math.sin(a) * Math.cos(e) * rr, cy = 7 + Math.sin(e) * 13;
      for (let i = 0; i < 3; i++) { const q = a + i * 2.1; K.add(P_PEA(7, 5), cx + Math.cos(q) * 1.6, cy + (i - 1) * 1.2, cz + Math.sin(q) * 1.6, 3.4, 3.4, 3.4, hex(i === 1 ? '#a8182c' : '#dc2c3c'), 0, 0, 0, 0.12); }
    }
  } else return null;
  const g=indexModel(K.geometry());g.computeBoundingBox();
  if(kind!=='nberries'&&g.boundingBox.min.y>0.05){g.translate(0,-g.boundingBox.min.y,0);g.computeBoundingBox();g.computeBoundingSphere();}
  const p=g.attributes.position,limit=g.boundingBox.min.y+0.65,points=[],seen=new Set();
  if(kind!=='nberries')for(let i=0;i<p.count;i++)if(p.getY(i)<=limit){
    const key=Math.round(p.getX(i)*2)+','+Math.round(p.getZ(i)*2);
    if(!seen.has(key)){seen.add(key);points.push(new V3().fromBufferAttribute(p,i));}
  }
  // Cover the footprint with a small fixed set, computed once per reusable model. A boulder's broad flat foot (P_BOULDER)
  // needs more of them, or a stretch of it between two could stand off a hollow in the ground.
  const contacts=[],most=kind==='rock'||kind==='rockIron'?40:12;if(points.length)contacts.push(points.shift());
  while(points.length&&contacts.length<most){let best=0,dist=-1;for(let i=0;i<points.length;i++){
    let d=Infinity;for(const q of contacts)d=Math.min(d,(q.x-points[i].x)**2+(q.z-points[i].z)**2);
    if(d>dist){dist=d;best=i;}
  }contacts.push(points.splice(best,1)[0]);}
  g.userData.groundContacts=contacts;
  g.userData.groundRigid=['rock','rockIron','log','pebbles','nstones','nsticks'].includes(kind);
  return g;
}

// Fit once per stationary placement, reusing the result while it stays loaded.
// The rigid model follows the local slope, then its lowest contacts settle into the surface.
const PROP_GROUND_FIELDS={key:'',gen:0};
function propGroundGeneration(){
  let key='';for(const fields of [LU.terrF.value,LU.cavePl.value])for(const v of fields)key+=v.x+','+v.y+','+v.z+','+v.w+';';
  if(key!==PROP_GROUND_FIELDS.key){PROP_GROUND_FIELDS.key=key;PROP_GROUND_FIELDS.gen++;}
  return PROP_GROUND_FIELDS.gen;
}
function propGroundFit(g,x,y,s,seed,h) {
  const r=Math.max(4,Math.min(24,g.boundingSphere.radius*s*0.45));
  const dx=(terrH(x+r,y)-terrH(x-r,y))/(2*r),dz=(terrH(x,y+r)-terrH(x,y-r))/(2*r);
  const q=new THREE.Quaternion();
  if(g.userData.groundRigid)q.setFromUnitVectors(new V3(0,1,0),new V3(-dx,1,-dz).normalize());
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),(seed*7919%1)*6.283+x*0.013));
  const m=new M4().compose(new V3(x,0,y),q,new V3(s,s,s)),v=new V3();let gap=0;
  // Plants and posts keep growing upright; only their footprint follows the ground plane.
  if(!g.userData.groundRigid){const a=m.elements;for(const i of [0,4,8])a[i+1]+=dx*a[i]+dz*a[i+2];}
  for(const p of g.userData.groundContacts){v.copy(p).applyMatrix4(m);gap=Math.max(gap,h+v.y-terrH(v.x,v.z));}
  const offset=-gap-0.4;m.elements[13]=offset;
  return {m,offset};
}

// one instanced draw (and its outline) per kind and way of building it; a set for the woods, and one for what you gather
const PROP_SHAKE_M=new M4();
class PropSet {
  constructor(cap, range = 0) { this.cap = cap; this.k = {}; this.range = range; this.materials = {}; this.groundFits = new Map(); this.groundFrame=0; }
  _kind(kind) {
    let L = this.k[kind]; if (L !== undefined) return L;
    const P = PROP_KIND[kind]; if (!P) return (this.k[kind] = null);
    let M = propMat(P.mat);
    const range = this.range || (['log', 'pebbles', 'shrooms'].includes(kind) ? VIS.plants : 0);
    if (range) {
      if (!this.materials[P.mat]) { const m = M.m.clone(); m.uniforms = Object.assign({}, M.m.uniforms, { cullR: { value: range } }); this.materials[P.mat] = { m, e: M.e }; }
      M = this.materials[P.mat];
    }
    L = [];
    for (let v = 0; v < P.n; v++) {
      const g = propModel(kind, v), m = new THREE.InstancedMesh(terrainInstanceGeometry(g, this.cap), M.m, 1);   // made for one, then given room for cap: three sets every slot to a matrix as it makes one,
      m.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(this.cap * 16), 16).setUsage(THREE.DynamicDrawUsage);   // and fifty shapes of rock at 2400 each was a tenth of a second the first time one came in sight
      m.count = 0; m.frustumCulled = false; scene.add(P.shadow ? castsShadow(m) : m);
      let e = null; if (P.edge) { e = new THREE.InstancedMesh(g, M.e, 1); e.count = 0; e.frustumCulled = false; e.instanceMatrix = m.instanceMatrix; scene.add(e); }
      L.push({ m, e, n: 0, items: [], shN: 0, shadow: P.shadow });
    }
    return (this.k[kind] = L);
  }
  begin() { this.groundFrame++; const gen=propGroundGeneration();if(this.groundTerrainGen!==gen){this.groundFits.clear();this.groundTerrainGen=gen;} for (const kind in this.k) if (this.k[kind]) for (const B of this.k[kind]) B.n = 0; }
  // one thing: its kind and variant, its foot at (x, y), sized as its picture was, turned by its seed; tilt a beat when struck
  add(kind, v, x, y, s, seed = 0, shakeT = -99) {
    const L = this._kind(kind); if (!L) return false;
    const B = L[((v % L.length) + L.length) % L.length]; if (B.n >= this.cap) return true;
    let it = B.items[B.n]; if (!it) it = B.items[B.n] = { d: 0, m: new Float32Array(16) };
    const h=terrH(x,y);let fit=it.fit;
    // Stationary gatherables retain their fit directly: no string key or Map lookup each frame.
    if(!fit||it.fitX!==x||it.fitY!==y||it.fitS!==s||it.fitSeed!==seed||it.fitGen!==this.groundTerrainGen||fit.h!==h){
      const fitKind=kind==='nberries'?'bbush':kind,fitB=kind==='nberries'?this._kind('bbush')[((v%3)+3)%3]:B;
      const key=fitKind+','+v+','+x+','+y+','+s+','+seed;
      fit=this.groundFits.get(key);
      if(!fit||fit.h!==h){fit=Object.assign(propGroundFit(fitB.m.geometry,x,y,s,seed,h),{h});this.groundFits.set(key,fit);}
      Object.assign(it,{fit,fitX:x,fitY:y,fitS:s,fitSeed:seed,fitGen:this.groundTerrainGen});
    }
    fit.seen=this.groundFrame;
    const M=_tm.copy(fit.m),st=S.t-shakeT;
    if(st>=0&&st<0.45){_tq2.setFromAxisAngle(_tax.set(Math.sin(seed*9),0,Math.cos(seed*9)),Math.sin(st*30)*0.12*(1-st/0.45));M.multiply(PROP_SHAKE_M.makeRotationFromQuaternion(_tq2));}
    const d=(x-S.p.x)**2+(y-S.p.y)**2;
    it.d = d; it.h = h; M.toArray(it.m); B.n++;
    return true;
  }
  end() {   // nearest first, so the sun's pass can draw only those inside its map
    if(this.groundFits.size>this.cap)for(const [key,fit] of this.groundFits)if(fit.seen!==this.groundFrame)this.groundFits.delete(key);
    const SR = shadowReach() ** 2;
    for (const kind in this.k) if (this.k[kind]) for (const B of this.k[kind]) {
      instanceSource(B);
      const L = B.items.slice(0, B.n).sort((a, b) => a.d - b.d), arr = B.source; B.shN = 0;
      for (let i = 0; i < L.length; i++) { arr.set(L[i].m, i * 16); B.heights[i] = L[i].h; if (L[i].d < SR) B.shN = i + 1; }
      B.keepShadow = B.shadow ? B.shN : 0; B.dirty = true; instanceCompact(B);
    }
  }
}
const propsW = new PropSet(9600), propsN = new PropSet(1200, VIS.nodes);
function propsFrame() { PROP_PC.value.set(S.p.x, 0, S.p.y); for (const P of [propsW, propsN]) for (const k in P.k) if(P.k[k]) for(const B of P.k[k]) instanceCompact(B); }
