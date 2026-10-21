// ================= the things you hold, made properly =================
// Joe: "the axe and stuff like that... doesn't look very good. We need to do a pass on adding details to these things."
// Every tool and weapon used to be two or three plain blocks: a stick and a box for an axe, a stick and a hoop for a pick.
// Now each is built the way it would have been made out here. A haft swept along a slight bend, thicker at the head and
// at the knob, slim at the grip. A stone head ground to an edge and lashed into a split haft; a flint one knapped into
// facets; an iron one forged with an eye round the haft, a cheek and a flared, polished bit. Spear points shaped like a
// leaf, knives with a guard and rivets, a femur club with its knuckles, a mace with flanges, a bow whose limbs taper to
// the nocks with a leather grip at the middle, arrows with fletching.
// Each is a few dozen shapes baked into one mesh with one outline, like the hands. Every vertex carries its colour and
// what it's made of, and the shader paints the stuff in: grain running along wood, flecks in stone, ripples in knapped
// flint, a brushed sheen and a glint on metal, cord wound round and round. The parts that move (a bowstring, an arrow,
// a sling's pouch, a reel, a flame) stay parts of their own.
// The model's grip is at its origin and it runs up its +y; a head or an edge faces -z (the way the fingers wrap), the
// palm side is -x. Third person holds the very same models (76-body).
const HMT = { plain: 0, wood: 1, stone: 2, flint: 3, metal: 4, cord: 5, leather: 6, bone: 7, rag: 8 };
const HMT_SHINE = [0, 0.05, 0.08, 0.55, 0.9, 0.04, 0.14, 0.2, 0];
const HKIT_V = `attribute vec3 cl; attribute vec4 mx; varying vec3 vN, vC, vP; varying vec4 vX;
  void main() { vN = normalize(normalMatrix * normal); vC = cl; vP = position; vX = mx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const HKIT_F = `uniform vec3 vmL; uniform float colourK; varying vec3 vN, vC, vP; varying vec4 vX;
  float kh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float kn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(kh(i), kh(i + vec3(1.0, 0.0, 0.0)), f.x), mix(kh(i + vec3(0.0, 1.0, 0.0)), kh(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
               mix(mix(kh(i + vec3(0.0, 0.0, 1.0)), kh(i + vec3(1.0, 0.0, 1.0)), f.x), mix(kh(i + vec3(0.0, 1.0, 1.0)), kh(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
  void main() {
    vec3 n = normalize(vN), L = normalize(vec3(0.25, 0.55, 0.8)); float m = vX.x, l = 0.5 + 0.55 * max(dot(n, L), 0.0);
    vec3 c = vC;
    if (m < 0.5) {}
    else if (m < 1.5) { float g = sin(vP.x * 4.0 + vP.z * 3.0 + kn(vP * vec3(1.3, 0.16, 1.3)) * 9.0); c *= 0.9 + 0.1 * g; c *= 0.9 + 0.16 * kn(vP * vec3(2.6, 0.45, 2.6)); }   // wood: grain along the haft
    else if (m < 2.5) { c *= 0.8 + 0.34 * kn(vP * 2.2); c *= 1.0 - 0.2 * step(0.9, kh(floor(vP * 7.0))); }   // stone: mottled and flecked
    else if (m < 3.5) { c *= 0.76 + 0.32 * kn(vP * 1.6 + kn(vP * 4.0) * 1.5); }   // flint: the ripples where it was knapped
    else if (m < 4.5) { c *= 0.9 + 0.14 * kn(vP * vec3(10.0, 0.8, 10.0)); }   // metal: brushed
    else if (m < 5.5) { float w = sin(vP.y * 11.0 + atan(vP.x, vP.z) * 2.0); c *= 0.72 + 0.32 * smoothstep(-0.5, 0.6, w); }   // cord wound round and round
    else if (m < 6.5) { c *= 0.86 + 0.16 * kn(vP * 4.5); }   // leather
    else if (m < 7.5) { c *= 0.9 + 0.12 * kn(vP * vec3(2.2, 0.7, 2.2)); c *= 1.0 - 0.16 * step(0.93, kh(floor(vP * 6.0))); }   // bone, pitted
    else { c *= 0.8 + 0.22 * (0.5 + 0.5 * sin(vP.y * 7.0 + vP.x * 3.0) * sin(vP.y * 3.5 - vP.z * 5.0)); }   // rag
    vec3 o = c * l * vmL;
    vec3 hv = normalize(L + vec3(0.0, 0.0, 1.0)); o += vmL * vX.z * pow(max(dot(n, hv), 0.0), 28.0) * 0.6;   // a glint off metal, a gleam off flint
    o = mix(o, c, vX.y);
    float g = dot(o, vec3(0.3, 0.55, 0.15)); gl_FragColor = vec4(mix(vec3(g), o, colourK), 1.0);
  }`;
const hkMat = new THREE.ShaderMaterial({ uniforms: { vmL: vmLight, colourK: LU.colourK }, vertexShader: HKIT_V, fragmentShader: HKIT_F });
const hkLine = new THREE.ShaderMaterial({
  side: THREE.BackSide, uniforms: { vmL: vmLight },
  vertexShader: `attribute vec3 en; attribute float ew; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + en * ew, 1.0); }`,
  fragmentShader: `uniform vec3 vmL; void main() { gl_FragColor = vec4(vec3(0.15, 0.15, 0.14) * vmL, 1.0); }`,
});
const hkHash = (a, b, c) => { const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return s - Math.floor(s); };
const _hkc = new THREE.Color();
// a kit: parts added one by one, then baked into one mesh (and one outline) in a group
function hkit() {
  const parts = [];
  return {
    add(g, col, m = HMT.plain, o = {}) { parts.push({ g, col, m, em: o.em || 0, sh: o.sh ?? HMT_SHINE[m], ew: o.ew ?? 0.13, cf: o.cf }); return g; },
    bake(into) {
      const G = parts.map(P => P.g.index ? P.g.toNonIndexed() : P.g);
      let nV = 0; for (const g of G) nV += g.attributes.position.count;
      const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), en = new Float32Array(nV * 3), cl = new Float32Array(nV * 3), mx = new Float32Array(nV * 4), ew = new Float32Array(nV);
      let o = 0;
      G.forEach((g, pi) => {
        const P = parts[pi], A = g.attributes.position, N = g.attributes.normal, KC = g.attributes.kc, base = vmCol(P.col);
        // the outline is pushed out along normals smoothed across each part's corners, so a faceted head keeps an unbroken line
        const sm = new Map(), key = i => `${Math.round(A.getX(i) * 200)},${Math.round(A.getY(i) * 200)},${Math.round(A.getZ(i) * 200)}`;
        for (let i = 0; i < A.count; i++) { const k = key(i), s = sm.get(k) || [0, 0, 0]; s[0] += N.getX(i); s[1] += N.getY(i); s[2] += N.getZ(i); sm.set(k, s); }
        for (let i = 0; i < A.count; i++, o++) {
          const x = A.getX(i), y = A.getY(i), z = A.getZ(i);
          pos.set([x, y, z], o * 3); nor.set([N.getX(i), N.getY(i), N.getZ(i)], o * 3);
          const s = sm.get(key(i)), sl = Math.hypot(s[0], s[1], s[2]) || 1; en.set([s[0] / sl, s[1] / sl, s[2] / sl], o * 3);
          let c = base;
          if (KC) c = _hkc.setRGB(KC.getX(i), KC.getY(i), KC.getZ(i));
          if (P.cf) { const r = P.cf(x, y, z, c); if (r) c = r; }
          cl.set([c.r, c.g, c.b], o * 3); mx.set([P.m, P.em, P.sh, 0], o * 4); ew[o] = P.ew;
        }
      });
      const B = new THREE.BufferGeometry();
      B.setAttribute('position', new THREE.BufferAttribute(pos, 3)); B.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); B.setAttribute('en', new THREE.BufferAttribute(en, 3));
      B.setAttribute('cl', new THREE.BufferAttribute(cl, 3)); B.setAttribute('mx', new THREE.BufferAttribute(mx, 4)); B.setAttribute('ew', new THREE.BufferAttribute(ew, 1));
      B.computeBoundingSphere();
      const body = new THREE.Mesh(B, hkMat), line = new THREE.Mesh(B, hkLine);
      body.frustumCulled = line.frustumCulled = false; into.add(body); into.add(line);
      return into;
    },
  };
}

// ---- shapes ----
// a shape swept along a path: each step is [point, section], a section being a closed loop of [u, v] going round
// anticlockwise (u along ref, pushed square to the path; v across); the ends shut with a fan. kc(i, j) may colour a point.
const _swT = new V3(), _swN = new V3(), _swB = new V3(), _swR = new V3();
function sweep(path, ref = [1, 0, 0], o = {}) {
  const n = path[0][1].length, pos = [], idx = [], kc = o.kc ? [] : null;
  path.forEach(([p, sec], i) => {
    const a = path[Math.max(0, i - 1)][0], b = path[Math.min(path.length - 1, i + 1)][0];
    _swT.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    _swR.set(ref[0], ref[1], ref[2]); _swN.copy(_swR).addScaledVector(_swT, -_swR.dot(_swT)).normalize(); _swB.crossVectors(_swT, _swN);
    sec.forEach(([u, v], j) => {
      pos.push(p[0] + _swN.x * u + _swB.x * v, p[1] + _swN.y * u + _swB.y * v, p[2] + _swN.z * u + _swB.z * v);
      if (kc) { const c = vmCol(o.kc(i, j) || o.col || '#888'); kc.push(c.r, c.g, c.b); }
    });
  });
  for (let i = 0; i < path.length - 1; i++) for (let j = 0; j < n; j++) { const a = i * n + j, b = i * n + (j + 1) % n, c = a + n, d = b + n; idx.push(a, b, c, b, d, c); }
  const cap = (i, end) => {
    const k = pos.length / 3; let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < n; j++) { const q = (i * n + j) * 3; cx += pos[q]; cy += pos[q + 1]; cz += pos[q + 2]; }
    pos.push(cx / n, cy / n, cz / n); if (kc) kc.push(kc[i * n * 3], kc[i * n * 3 + 1], kc[i * n * 3 + 2]);
    for (let j = 0; j < n; j++) { const a = i * n + j, b = i * n + (j + 1) % n; end ? idx.push(k, a, b) : idx.push(k, b, a); }
  };
  if (o.capA !== false) cap(0, false);
  if (o.capB !== false) cap(path.length - 1, true);
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (kc) g.setAttribute('kc', new THREE.Float32BufferAttribute(kc, 3));
  g.setIndex(idx);
  if (o.flat) g = g.toNonIndexed();
  g.computeVertexNormals(); return g;
}
// sections
const ovalS = (ru, rv, n = 9, ph = 0) => Array.from({ length: n }, (_, i) => { const a = ph + i / n * TAU; return [Math.cos(a) * ru, Math.sin(a) * rv]; });
const sqS = (ru, rv, e = 0.6, n = 12) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU, c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.pow(Math.abs(c), e) * ru, Math.sign(s) * Math.pow(Math.abs(s), e) * rv]; });
const lozS = (t, wf, wb = wf) => [[t, 0], [0, wf], [-t, 0], [0, -wb]];                                                   // double-edged: an edge each side, a ridge down the middle
const ribS = (t, w) => [[t, 0], [t * 0.32, w * 0.55], [0, w], [-t * 0.32, w * 0.55], [-t, 0], [-t * 0.32, -w * 0.55], [0, -w], [t * 0.32, -w * 0.55]];   // a raised midrib
const knifeS = (t, w, wb) => [[t, 0], [0, w], [-t, 0], [-t * 0.85, -wb], [t * 0.85, -wb]];                              // one edge, a thick spine
// a lump of stone or bone: an icosahedron nudged out of round, faceted or smooth
function rockG(c, s, seed = 1, rough = 0.16, det = 1, smoothIt = false) {
  const g = smoothIt ? new THREE.SphereGeometry(1, 12, 9) : new THREE.IcosahedronGeometry(1, det), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + rough * (hkHash(Math.round(x * 40), Math.round(y * 40), Math.round(z * 40) + seed * 7) * 2 - 1);
    p.setXYZ(i, x * k * s[0] + c[0], y * k * s[1] + c[1], z * k * s[2] + c[2]);
  }
  g.computeVertexNormals(); return g;
}
const _hkm = new THREE.Matrix4(), _hke = new THREE.Euler();
const turnG = (g, rx, ry, rz, at) => { g.applyMatrix4(_hkm.makeRotationFromEuler(_hke.set(rx, ry, rz))); if (at) g.translate(at[0], at[1], at[2]); return g; };
const hBallG = (c, r, ws = 10, hs = 8) => new THREE.SphereGeometry(1, ws, hs).scale(r[0], r[1], r[2]).translate(c[0], c[1], c[2]);
// a straight round rod from a to b, radius r0 at a and r1 at b, shut at both ends
function hRodG(a, b, r0, r1 = r0, n = 8, seg = 2) {
  const path = []; for (let i = 0; i <= seg; i++) { const t = i / seg; path.push([[lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)], ovalS(lerp(r0, r1, t), lerp(r0, r1, t), n)]); }
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ref = Math.abs(d[1]) > Math.abs(d[0]) + Math.abs(d[2]) ? [1, 0, 0] : [0, 1, 0];
  return sweep(path, ref);
}
// a band of lashing wound round an upright haft at y, h high
const wrapG = (y, h, r, n = 12) => sweep([[[0, y - h / 2, 0], ovalS(r * 0.94, r * 0.94, n)], [[0, y - h / 2 + 0.08, 0], ovalS(r, r, n)], [[0, y + h / 2 - 0.08, 0], ovalS(r, r, n)], [[0, y + h / 2, 0], ovalS(r * 0.94, r * 0.94, n)]]);
// a wooden haft from y0 up to y1: prof(t) its radius along the way, bowed a touch forward, the ends rounded off
function haftG(y0, y1, prof, o = {}) {
  const seg = o.seg || 14, path = [], L = y1 - y0, n = o.n || 9;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, e0 = 0.5 / L, rnd = Math.sqrt(Math.max(0.12, Math.min(1, t / e0, (1 - t) / e0)));
    const r = prof(t) * (o.roundEnds === false ? 1 : rnd);
    path.push([[(o.bx || 0) * Math.sin(Math.PI * t), y0 + L * t, -(o.bend ?? 0.28) * Math.sin(Math.PI * t) + (o.foot || 0) * Math.max(0, 1 - t * 8)], ovalS(r * (o.flat || 0.9), r, n)]);
  }
  return sweep(path);
}
const COLR = vmCol;
const WOOD = '#7a5a3a', HICKORY = '#a8834f', ASH = '#8a6a46', DARKWOOD = '#5c4330', RAWHIDE = '#c4a67a', SINEW = '#9c7f58', LEATHER = '#5a3e2a', TAN = '#8a6440';
const IRON_D = '#7a7e84', STEEL_B = '#3c434c', BRASS = '#b89448';
const headKind = c => c === STONE_HEAD ? 'stone' : c === FLINT_HEAD ? 'flint' : c === IRON_HEAD ? 'iron' : c === '#dfe6ee' ? 'steel' : c === '#e6dfcc' || c === '#f4ecd8' || c === '#e2cc9e' || c === '#cfc6ae' || c === '#d8cfb8' ? 'bone' : 'other';

// ---- axes ----
// a head as a run of cross-sections from the poll at the back to the edge at the front: [z, half thickness, half height, drop]
const AXE_PROF = {
  iron: [[1.45, 0.6, 1.1, 0], [1.3, 0.84, 1.28, 0], [0.6, 0.98, 1.36, 0], [-0.6, 0.98, 1.36, 0], [-1.3, 0.62, 1.22, 0.05], [-2.4, 0.42, 1.5, 0.25], [-3.4, 0.24, 2.05, 0.5], [-4.3, 0.1, 2.45, 0.7], [-4.75, 0.035, 2.5, 0.75], [-4.86, 0.01, 2.2, 0.75]],
  beard: [[1.45, 0.6, 1.1, 0], [1.3, 0.84, 1.28, 0], [0.6, 0.98, 1.36, 0], [-0.6, 0.98, 1.36, 0], [-1.3, 0.62, 1.25, 0.1], [-2.4, 0.42, 1.7, 0.5], [-3.4, 0.24, 2.35, 0.95], [-4.3, 0.1, 2.95, 1.25], [-4.75, 0.035, 3.05, 1.3], [-4.86, 0.01, 2.75, 1.3]],
  stone: [[2.0, 0.45, 0.75, 0], [1.6, 0.82, 1.12, 0], [0.8, 1.04, 1.32, 0], [-0.4, 1.0, 1.42, 0], [-1.6, 0.76, 1.52, 0.05], [-2.8, 0.42, 1.62, 0.1], [-3.6, 0.16, 1.66, 0.12], [-3.95, 0.05, 1.5, 0.12], [-4.05, 0.02, 1.15, 0.12]],
  flint: [[1.8, 0.4, 0.7, 0], [1.4, 0.72, 1.0, 0], [0.6, 0.9, 1.2, 0], [-0.6, 0.84, 1.32, 0], [-1.8, 0.58, 1.5, 0.08], [-3.0, 0.3, 1.66, 0.14], [-3.9, 0.1, 1.74, 0.18], [-4.3, 0.03, 1.5, 0.18], [-4.4, 0.01, 1.05, 0.18]],
  bone: [[1.3, 0.42, 0.85, 0], [0.9, 0.62, 1.1, 0], [-0.3, 0.7, 1.35, 0], [-1.6, 0.46, 1.9, 0.3], [-2.8, 0.26, 2.6, 0.5], [-3.7, 0.12, 2.9, 0.55], [-4.15, 0.04, 2.75, 0.55], [-4.3, 0.01, 2.2, 0.55]],
};
function axeHeadG(prof, y, b, o = {}) {
  const path = prof.map(([z, t, h, cy], i) => {
    const j = o.jit ? 1 + o.jit * (hkHash(i, 3, o.seed || 1) * 2 - 1) : 1, sc = o.scallop && i >= prof.length - 4 ? 1 + 0.07 * Math.sin(i * 2.1) : 1;
    return [[0, y - cy * b, z * b], sqS(t * b * j, h * b * j * sc, o.e ?? 0.62, 12)];
  });
  return sweep(path, [1, 0, 0], { flat: o.flat });
}
function buildAxe(K, T, id) {
  const w = T.wpn === 'waxe', thr = T.thr === 'taxe', b = w ? 1.22 : thr ? 0.8 : 1, kind = headKind(T.hc || T.c);
  const y0 = -3.2 * b, y1 = (kind === 'iron' || kind === 'steel' ? 13.0 : 14.2) * b, hy = 11.6 * b;
  const haftCol = kind === 'steel' ? HICKORY : kind === 'iron' ? ASH : WOOD;
  K.add(haftG(y0, y1, t => (t < 0.06 ? 0.66 : t < 0.2 ? lerp(0.6, 0.5, (t - 0.06) / 0.14) : t < 0.7 ? 0.5 : lerp(0.5, 0.6, (t - 0.7) / 0.3)) * (w ? 1.1 : 1) * (thr ? 0.9 : 1), { foot: 0.5, bend: 0.3 * b }), haftCol, HMT.wood);
  if (w) K.add(wrapG(0.4, 4.6, 0.62), LEATHER, HMT.leather, { ew: 0.08 });   // a war axe's grip, bound in leather
  const edgeLit = (zEdge, hi) => (x, y, z, c) => z < zEdge * b ? _hkc.copy(c).lerp(COLR(hi), clamp((zEdge * b - z) / (0.7 * b), 0, 1)) : null;
  if (kind === 'iron' || kind === 'steel') {
    const prof = w ? AXE_PROF.beard : AXE_PROF.iron, col = kind === 'steel' ? STEEL_B : IRON_D;
    K.add(axeHeadG(prof, hy, b * (kind === 'steel' ? 1.05 : 1)), col, HMT.metal, { cf: edgeLit(-3.7, kind === 'steel' ? '#eef3f8' : '#d8dcde') });
    K.add(hRodG([0, hy + 1.2 * b, 0], [0, hy + 1.62 * b, 0], 0.5 * b, 0.46 * b, 8), haftCol, HMT.wood, { ew: 0.05 });   // the haft's end through the eye, and its wedge
    K.add(new THREE.BoxGeometry(0.12, 0.2, 0.8).translate(0, hy + 1.64 * b, 0), '#3a2c20', HMT.plain, { ew: 0 });
  } else {
    const prof = AXE_PROF[kind] || AXE_PROF.stone, col = T.hc || T.c, flint = kind === 'flint';
    K.add(axeHeadG(prof, hy, b, { flat: flint, jit: flint ? 0.05 : 0.08, seed: id.length, scallop: flint, e: flint ? 0.7 : 0.85 }), col, kind === 'bone' ? HMT.bone : flint ? HMT.flint : HMT.stone);
    if (kind === 'bone') for (let i = 0; i < 4; i++) K.add(rockG([0, hy + (1.2 + 0.15 * i) * b, (-0.6 - i * 0.75) * b], [0.3 * b, 0.42 * b, 0.3 * b], i + 2, 0.12, 0, true), '#efe8d6', HMT.bone, { ew: 0.06 });   // teeth along the jaw's top
    // lashed into a split haft: bound tight above and below the head, and crossed over it
    const cord = kind === 'bone' ? SINEW : RAWHIDE, rH = 0.62 * b;
    K.add(wrapG(hy + 1.75 * b, 1.0 * b, rH), cord, HMT.cord, { ew: 0.07 });
    K.add(wrapG(hy - 1.75 * b, 1.0 * b, rH), cord, HMT.cord, { ew: 0.07 });
    for (const s of [-1, 1]) for (const d of [-1, 1]) {
      const x = s * (prof[2][1] * b + 0.08), pth = [[[x, hy - 1.5 * b, 0.95 * b * d], ovalS(0.12, 0.26, 6)], [[x * 1.04, hy, 0], ovalS(0.12, 0.26, 6)], [[x, hy + 1.5 * b, -0.95 * b * d], ovalS(0.12, 0.26, 6)]];
      K.add(sweep(pth, [s, 0, 0]), cord, HMT.cord, { ew: 0.05 });
    }
  }
}
// ---- picks: a spike through the haft's top (stone and flint lashed; iron and steel forged, a point one way and a chisel the other) ----
function buildPick(K, T, id) {
  const kind = headKind(T.c), metal = kind === 'iron' || kind === 'steel', hy = 12.2;
  K.add(haftG(-3.2, metal ? 13.4 : 14.0, t => t < 0.06 ? 0.66 : t < 0.2 ? lerp(0.6, 0.5, (t - 0.06) / 0.14) : t < 0.7 ? 0.5 : lerp(0.5, 0.6, (t - 0.7) / 0.3), { foot: 0.5 }), metal ? ASH : WOOD, HMT.wood);
  const path = [], zs = metal ? [3.9, 3.2, 2.2, 1.0, 0, -1.0, -2.4, -3.8, -5.0, -6.0, -6.6] : [1.6, 1.0, 0, -1.0, -2.2, -3.4, -4.5, -5.3, -5.8];
  zs.forEach((z, i) => {
    const y = hy + 0.35 - 0.042 * z * z, eye = Math.max(0, 1 - Math.abs(z) / 1.1);
    let t, h;
    if (z > 0 && metal) { const k = (z - 1.0) / 2.9; t = lerp(0.62, 0.1, clamp(k, 0, 1)); h = lerp(0.72, 0.62, clamp(k, 0, 1)); }   // the chisel end: thin but broad
    else if (z > 0) { const k = z / 1.6; t = lerp(0.8, 0.45, k); h = lerp(0.9, 0.55, k); }
    else { const k = -z / (metal ? 6.6 : 5.8); t = lerp(0.62, 0.04, Math.pow(k, 0.9)); h = lerp(0.72, 0.05, Math.pow(k, 0.9)); }
    t += eye * (metal ? 0.36 : 0.3); h += eye * (metal ? 0.42 : 0.36);
    path.push([[0, y, z], sqS(t, h, metal ? 0.55 : 0.8, 10)]);
  });
  K.add(sweep(path, [1, 0, 0], { flat: kind === 'flint' }), metal ? (kind === 'steel' ? '#9aa4ae' : IRON_D) : T.c, metal ? HMT.metal : kind === 'flint' ? HMT.flint : HMT.stone,
    { cf: metal ? (x, y, z, c) => z < -5.2 || z > 3.4 ? _hkc.copy(c).lerp(COLR('#e4e8ea'), 0.6) : null : null });
  if (!metal) { K.add(wrapG(hy + 1.6, 0.9, 0.62), RAWHIDE, HMT.cord, { ew: 0.07 }); K.add(wrapG(hy - 1.5, 0.9, 0.62), RAWHIDE, HMT.cord, { ew: 0.07 }); }
  else K.add(hRodG([0, hy + 1.1, 0], [0, hy + 1.45, 0], 0.5, 0.46), ASH, HMT.wood, { ew: 0.05 });
}
// ---- the hammer: a claw hammer from the plane's tool kit ----
function buildHammer(K) {
  K.add(haftG(-2.4, 10.6, t => t < 0.45 ? 0.56 : lerp(0.56, 0.44, (t - 0.45) / 0.55), { bend: 0.1 }), '#a8834f', HMT.wood);
  K.add(wrapG(0.6, 5.2, 0.62, 12), '#2e2e2c', HMT.leather, { ew: 0.08 });   // a rubber grip
  const hy = 10.9;
  K.add(sweep([[[0, hy, -2.7], ovalS(0.78, 0.78, 12)], [[0, hy, -2.45], ovalS(0.86, 0.86, 12)], [[0, hy, -1.7], ovalS(0.78, 0.78, 12)], [[0, hy, -1.3], ovalS(0.52, 0.52, 12)], [[0, hy, -0.85], sqS(0.6, 0.82, 0.5)], [[0, hy, 0.85], sqS(0.6, 0.82, 0.5)]], [1, 0, 0]),
    '#6e747c', HMT.metal, { cf: (x, y, z, c) => z < -2.5 ? _hkc.copy(c).lerp(COLR('#d8dde2'), 0.7) : null });
  for (const s of [-1, 1]) {   // the claw, split down the middle and curving down
    const pth = []; for (let i = 0; i <= 6; i++) { const t = i / 6, a = t * 1.05; pth.push([[s * 0.24, hy - 0.1 - Math.sin(a) * 2.2 + 0.2, 0.85 + Math.sin(a) * 1.0 + t * 1.4], sqS(0.2 * (1 - 0.6 * t), 0.62 * (1 - 0.75 * t), 0.6, 8)]); }
    K.add(sweep(pth, [1, 0, 0]), '#6e747c', HMT.metal, { ew: 0.08 });
  }
}
// ---- spears ----
function leafW(s, w) { return w * (s < 0.32 ? lerp(0.34, 1, Math.sin(s / 0.32 * Math.PI / 2)) : Math.pow(1 - (s - 0.32) / 0.68, 0.85)); }
function buildSpear(K, T, id) {
  const jav = T.thr === 'jav', kind = id === 'spear0' ? 'stick' : id === 'nglaive' ? 'antler' : headKind(T.hc || T.c), r = jav ? 0.42 : 0.5;
  const y0 = jav ? -12 : -10, top = kind === 'stick' ? 27.8 : 24.4;
  K.add(haftG(y0, top, t => kind === 'stick' ? r * (t > 0.82 ? Math.pow(Math.max(0.02, (1 - t) / 0.18), 0.75) : 1) : r * (t > 0.92 ? 1.06 : 1), { bend: 0.22, seg: 22, n: 8, roundEnds: kind !== 'stick' }), kind === 'stick' ? '#a08a62' : jav ? '#9a7a52' : '#8a6a44', HMT.wood,
    { cf: kind === 'stick' ? (x, y, z, c) => y > 22 ? _hkc.copy(c).lerp(COLR('#2a1e16'), clamp((y - 22) / 4.5, 0, 0.92)) : null : null });   // fire-hardened: charred to the point
  if (kind === 'stick') { K.add(wrapG(0.4, 3.4, 0.56), RAWHIDE, HMT.cord, { ew: 0.06 }); return; }
  K.add(wrapG(0.5, jav ? 3.4 : 4.2, r + 0.1), jav ? TAN : LEATHER, HMT.leather, { ew: 0.07 });   // a leather grip where you hold it
  const hb = top - 0.4;
  if (kind === 'iron') {
    K.add(sweep([[[0, 21.4, 0], ovalS(0.6, 0.6, 10)], [[0, 24.0, 0], ovalS(0.54, 0.54, 10)], [[0, 24.6, 0], ovalS(0.36, 0.36, 10)]], [0, 0, 1]), IRON_D, HMT.metal, { ew: 0.08 });   // the socket
    K.add(hBallG([0.6, 22.4, 0], [0.16, 0.16, 0.16], 6, 5), '#d0d4d6', HMT.metal, { ew: 0 });
    const path = []; for (let i = 0; i <= 14; i++) { const s = i / 14; path.push([[0, 24.4 + s * 7.4, 0], ribS(0.3 * (1 - s * 0.85) + 0.02, Math.max(0.03, leafW(s, 1.35)))]); }
    K.add(sweep(path, [0, 0, 1], { flat: true }), '#c4c8cc', HMT.metal);
    return;
  }
  if (kind === 'antler') {   // a curved blade of antler with a tine off it, socketed in leather
    const P = [[0, 24, 0], [0.5, 26, 0], [1.3, 28.4, 0], [1.75, 30.6, 0], [1.4, 32.4, 0], [0.6, 33.6, 0]];
    K.add(sweep(P.map((p, i) => [p, ovalS(0.4 * (1 - i / 7), 0.9 * (1 - i / 6.2) + 0.06, 8)]), [0, 0, 1]), T.hc || '#e2cc9e', HMT.bone);
    K.add(sweep([[[0.6, 26.4, 0], ovalS(0.3, 0.34, 7)], [[-0.6, 28.0, 0], ovalS(0.24, 0.26, 7)], [[-1.3, 29.6, 0], ovalS(0.12, 0.12, 7)]], [0, 0, 1]), T.hc || '#e2cc9e', HMT.bone, { ew: 0.08 });
    K.add(wrapG(23.4, 2.4, 0.66), LEATHER, HMT.leather, { ew: 0.07 });
    return;
  }
  // a knapped point lashed into a split shaft: stone ground smooth, flint flaked into facets, bone filed jagged
  const flint = kind === 'flint', bone = kind === 'bone', L = jav ? 4.6 : bone ? 7.0 : 6.2, W = jav ? 0.95 : bone ? 0.85 : 1.3, path = [];
  for (let i = 0; i <= 12; i++) { const s = i / 12, sc = flint ? 1 + 0.08 * Math.sin(s * 38) : 1; path.push([[0, hb + s * L, 0], lozS(0.36 * (1 - s * 0.85) + 0.02, Math.max(0.03, leafW(s, W) * sc))]); }
  K.add(sweep(path, [0, 0, 1], { flat: flint || bone }), T.hc || T.c, bone ? HMT.bone : flint ? HMT.flint : HMT.stone);
  if (bone) for (const y of [hb + 2.2, hb + 3.8]) for (const s of [-1, 1]) K.add(turnG(new THREE.ConeGeometry(0.2, 1.1, 5), 0, 0, s * 2.5, [s * (leafW((y - hb) / L, W) + 0.18), y - 0.25, 0]), T.hc || T.c, HMT.bone, { ew: 0.06 });   // barbs
  K.add(wrapG(hb - 0.6, 2.2, r + 0.14), bone ? SINEW : RAWHIDE, HMT.cord, { ew: 0.07 });
}
// ---- knives and swords ----
function buildBlade(K, T, id) {
  const sword = T.wpn === 'sword', kind = id === 'nfang' ? 'fang' : headKind(T.hc || T.c), named = !!T.named, col = T.hc || T.c;
  const L = sword ? 15.2 : 7.4, by = sword ? 2.4 : 1.9;
  if (kind === 'fang') {   // a great curved fang, bound into a leather hilt
    const path = []; for (let i = 0; i <= 12; i++) { const s = i / 12; path.push([[0, by - 0.4 + s * 8.2, 1.1 * s * s], ovalS(0.62 * (1 - s) + 0.05, 0.8 * (1 - s) + 0.05, 9)]); }
    K.add(sweep(path), col, HMT.bone, { cf: (x, y, z, c) => y < by + 1 ? _hkc.copy(c).lerp(COLR('#c8b48c'), 0.5) : null });
    K.add(haftG(-2.6, by, () => 0.6, { bend: 0 }), '#3a2a20', HMT.leather);
    K.add(wrapG(-0.4, 3.2, 0.66), SINEW, HMT.cord, { ew: 0.07 });
    return;
  }
  const metal = kind === 'iron' || kind === 'other' || named;
  const path = [];
  for (let i = 0; i <= 14; i++) {
    const s = i / 14, y = by + s * L;
    if (metal) {
      const w = (sword ? 1.0 : 0.95) * (s < 0.72 ? lerp(1, 0.86, s / 0.72) : 0.86 * Math.pow(Math.max(0, 1 - (s - 0.72) / 0.28), 0.8)) + 0.02;
      path.push([[0, y, 0], sword ? ribS(0.26 * (1 - s * 0.6), w) : knifeS(0.26 * (1 - s * 0.55), w, Math.max(0.05, 0.5 * (s < 0.7 ? 1 : 1 - (s - 0.7) / 0.3)))]);
    } else {
      const jag = kind === 'bone' && sword ? 1 + 0.1 * Math.sin(s * 70) : kind === 'flint' ? 1 + 0.07 * Math.sin(s * 44) : 1;
      const w = (sword ? 0.95 : 0.9) * (s < 0.25 ? lerp(0.75, 1, s / 0.25) : Math.pow(Math.max(0, 1 - (s - 0.25) / 0.75), 0.75)) * jag + 0.03;
      path.push([[0, y, kind === 'bone' ? -0.3 * s * s : 0], lozS(0.3 * (1 - s * 0.7) + 0.02, w)]);
    }
  }
  const bladeCol = named && kind !== 'bone' ? col : metal ? '#c4c8cc' : col;
  K.add(sweep(path, [1, 0, 0], { flat: true }), bladeCol, metal ? HMT.metal : kind === 'flint' ? HMT.flint : kind === 'bone' ? HMT.bone : HMT.stone, { em: id === 'nash' ? 0.3 : 0 });
  if (metal) {
    // a guard across the blade, a wrapped grip and a pommel
    const gw = sword ? 2.3 : 1.25;
    K.add(sweep([[[0, by - 0.1, -gw], sqS(0.28, 0.3, 0.6, 8)], [[0, by + 0.05, -gw * 0.5], sqS(0.34, 0.36, 0.6, 8)], [[0, by + 0.05, gw * 0.5], sqS(0.34, 0.36, 0.6, 8)], [[0, by - 0.1, gw], sqS(0.28, 0.3, 0.6, 8)]], [1, 0, 0]),
      named ? BRASS : '#5a5650', HMT.metal, { ew: 0.08 });
    K.add(haftG(-2.9, by - 0.2, t => lerp(0.5, 0.56, Math.sin(Math.PI * t)), { bend: 0, flat: 0.78 }), sword ? LEATHER : '#5e4630', sword ? HMT.cord : HMT.wood);
    if (!sword) for (const y of [-1.6, -0.2]) for (const s of [-1, 1]) K.add(hBallG([s * 0.42, y, 0], [0.1, 0.16, 0.16], 6, 5), BRASS, HMT.metal, { ew: 0 });   // rivets through the scales
    K.add(hBallG([0, -3.15, 0], sword ? [0.62, 0.5, 0.75] : [0.5, 0.36, 0.56]), named ? BRASS : '#6a6e72', HMT.metal, { ew: 0.09 });
  } else {
    K.add(haftG(-2.8, by + 0.2, t => 0.5 + 0.05 * Math.sin(Math.PI * t), { bend: 0 }), kind === 'bone' ? '#d8ceb6' : DARKWOOD, kind === 'bone' ? HMT.bone : HMT.wood);
    K.add(wrapG(-0.3, sword ? 3.6 : 3.0, 0.6), kind === 'bone' ? SINEW : RAWHIDE, HMT.cord, { ew: 0.07 });
    K.add(wrapG(by - 0.25, 0.7, 0.62), kind === 'bone' ? SINEW : RAWHIDE, HMT.cord, { ew: 0.06 });
    if (sword) K.add(hBallG([0, -3.0, 0], [0.62, 0.55, 0.62]), kind === 'bone' ? '#e6dfcc' : DARKWOOD, HMT.bone, { ew: 0.08 });
  }
}
// ---- clubs ----
function buildClub(K, T, id) {
  const bc = T.bc || '#6e5235', spikes = T.spikes;
  if (id === 'bonec') {   // a great thighbone: held round its shaft, the knuckled end up
    K.add(haftG(-4.2, 11.4, t => 0.58 + 0.5 * Math.pow(Math.abs(t - 0.4) / 0.6, 2.2), { bend: 0.4, seg: 16 }), bc, HMT.bone);
    for (const s of [-1, 1]) K.add(rockG([s * 0.8, 12.0, 0.1], [1.15, 1.3, 1.25], s + 3, 0.08, 0, true), bc, HMT.bone);
    K.add(rockG([0.5, -4.6, 0], [1.05, 1.05, 1.0], 9, 0.06, 0, true), bc, HMT.bone);
    K.add(wrapG(0.2, 3.6, 0.72), SINEW, HMT.cord, { ew: 0.07 });
    return;
  }
  if (id === 'maul') {   // a rock lashed across the end of a log
    K.add(haftG(-2.8, 12.6, t => 0.68 - 0.06 * Math.sin(Math.PI * t), { bend: 0.2 }), '#6e5235', HMT.wood);
    K.add(rockG([0, 13.6, -0.2], [2.4, 2.0, 3.1], 5, 0.14, 1, true), STONE_HEAD, HMT.stone);
    for (const z of [-0.9, 0.7]) K.add(turnG(new THREE.TorusGeometry(1.95, 0.22, 6, 16).scale(1.22, 1.06, 1), 0, Math.PI / 2, 0, [0, 13.5, z]), RAWHIDE, HMT.cord, { ew: 0.06 });
    K.add(wrapG(11.6, 1.4, 0.8), RAWHIDE, HMT.cord, { ew: 0.07 });
    return;
  }
  if (id === 'mace' || id === 'nbell' || id === 'nlant') {
    const shaftC = id === 'nlant' ? '#3a3d42' : id === 'nbell' ? bc : '#4a4038';
    K.add(haftG(-2.8, 10.4, t => 0.52 + 0.04 * t, { bend: 0.1 }), shaftC, id === 'nlant' ? HMT.metal : HMT.wood);
    K.add(wrapG(0.4, 4.4, 0.62), LEATHER, HMT.leather, { ew: 0.08 });
    if (id === 'mace') {   // flanged: seven blades of iron round a core, and a spike on top
      K.add(sweep([[[0, 9.2, 0], ovalS(0.7, 0.7, 10)], [[0, 9.8, 0], ovalS(0.95, 0.95, 10)], [[0, 13.0, 0], ovalS(0.95, 0.95, 10)], [[0, 13.5, 0], ovalS(0.6, 0.6, 10)]], [0, 0, 1]), bc, HMT.metal);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU, rd = [Math.cos(a), 0, Math.sin(a)], pth = [];
        for (let k = 0; k <= 6; k++) { const s = k / 6, e = 1.15 * Math.sin(Math.PI * (0.12 + 0.76 * s)); pth.push([[0, 9.5 + s * 3.8, 0], [[0.75, -0.1], [0.75 + e, -0.04], [0.8 + e, 0], [0.75 + e, 0.04], [0.75, 0.1]]]); }
        K.add(sweep(pth, rd, { flat: true }), spikes || '#c8ccd0', HMT.metal, { ew: 0.07 });
      }
      K.add(new THREE.ConeGeometry(0.42, 1.8, 7).translate(0, 14.3, 0), spikes || '#d8dce0', HMT.metal, { ew: 0.07 });
    } else if (id === 'nbell') {   // a bell for a hammer's head, its mouth forward, spikes behind
      const prof = [[0.01, 0], [0.7, 0.05], [0.95, 0.5], [1.05, 1.4], [1.35, 2.2], [1.9, 2.75], [1.95, 2.95], [1.6, 2.9], [0.01, 2.9]].map(([r, y]) => new THREE.Vector2(r, y));
      K.add(turnG(new THREE.LatheGeometry(prof, 14), -Math.PI / 2, 0, 0, [0, 11.6, -0.4]), '#b8903c', HMT.metal);
      for (const [y, z] of [[11.6, 1.4], [12.5, 1.0], [10.7, 1.0]]) K.add(turnG(new THREE.ConeGeometry(0.32, 1.6, 6), Math.PI / 2, 0, 0, [0, y, z + 0.6]), spikes, HMT.metal, { ew: 0.06 });
      K.add(sweep([[[0, 11.6, -0.6], ovalS(0.72, 0.72, 10)], [[0, 11.6, 1.2], ovalS(0.72, 0.72, 10)]], [1, 0, 0]), '#8a6a2c', HMT.metal, { ew: 0.07 });
    } else {   // a lantern on a mace: an iron cage round a coal that glows
      for (const y of [9.4, 13.4]) K.add(sweep([[[0, y - 0.3, 0], ovalS(1.0, 1.0, 12)], [[0, y + 0.3, 0], ovalS(1.35, 1.35, 12)]], [0, 0, 1]), '#3a3d42', HMT.metal, { ew: 0.08 });
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; K.add(hRodG([Math.cos(a) * 1.15, 9.6, Math.sin(a) * 1.15], [Math.cos(a) * 1.15, 13.2, Math.sin(a) * 1.15], 0.14, 0.14, 6), '#3a3d42', HMT.metal, { ew: 0.05 }); }
      K.add(rockG([0, 11.4, 0], [0.85, 1.1, 0.85], 4, 0.18, 1), spikes || '#ffb050', HMT.plain, { em: 1, ew: 0 });
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; K.add(turnG(new THREE.ConeGeometry(0.28, 1.3, 6), 0, 0, -Math.PI / 2, [1.9, 0, 0]).applyMatrix4(_hkm.makeRotationY(a)).translate(0, 11.4, 0), '#5a5e64', HMT.metal, { ew: 0.05 }); }
      K.add(new THREE.ConeGeometry(0.36, 1.4, 7).translate(0, 14.3, 0), '#5a5e64', HMT.metal, { ew: 0.06 });
    }
    return;
  }
  // a wooden club: a heavy branch, knotted and thick at the end, its grip carved slim and bound
  K.add(sweep(Array.from({ length: 19 }, (_, i) => {
    const t = i / 18, y = lerp(-2.6, 13.6, t), r = 0.6 + 1.45 * sstep(3, 11.8, y), e = Math.sqrt(Math.max(0.1, Math.min(1, t / 0.03, (1 - t) / 0.1)));
    return [[0, y, -0.2 * Math.sin(Math.PI * t)], ovalS(r * e * 0.95, r * e, 10).map(([u, v], j) => { const k = 1 + (y > 5 ? 0.14 : 0.03) * (hkHash(i, j, 3) * 2 - 1); return [u * k, v * k]; })];
  })), bc, HMT.wood);
  for (const [y, a] of [[8.2, 0.6], [10.6, 2.8], [12.0, 4.6], [9.4, 4.0]]) K.add(rockG([Math.cos(a) * (0.6 + 1.45 * sstep(3, 11.8, y)), y, Math.sin(a) * (0.6 + 1.45 * sstep(3, 11.8, y))], [0.45, 0.4, 0.45], y, 0.15, 0, true), bc, HMT.wood, { ew: 0.07 });   // knots
  K.add(wrapG(0.4, 3.6, 0.68), RAWHIDE, HMT.cord, { ew: 0.07 });
  if (spikes) for (let i = 0; i < 9; i++) {   // flint driven through the head
    const a = i / 9 * TAU + (i % 2) * 0.35, y = 8.4 + (i % 3) * 1.7, r = 0.6 + 1.45 * sstep(3, 11.8, y);
    K.add(rockG([0, 0, 0], [0.22, 0.95, 0.42], i + 11, 0.2, 0).applyMatrix4(_hkm.makeRotationFromEuler(_hke.set(0.5 * Math.sin(i), -a, Math.PI / 2 - 0.25))).translate(Math.cos(a) * (r + 0.55), y, Math.sin(a) * (r + 0.55)), spikes, HMT.flint, { ew: 0.07 });
  }
}
// ---- bows: tips at the string's ends (0, +-10.6, -3.4), the grip 8.4 out in front of the string ----
const BOW_NOCK = 1.3, BOW_DRAW = 12.5;   // the nock above the grip; how far back a full draw takes the string (to under your eye)
function buildBow(K, T, id) {
  const bw = T.bw || '#9a7040', bone = id === 'bow2', path = [];
  for (let i = 0; i <= 24; i++) {
    const s = i / 12 - 1, a = Math.abs(s), y = 10.9 * s, z = -8.4 + 5.0 * s * s;
    const wd = a < 0.12 ? 0.82 : lerp(0.72, 0.26, (a - 0.12) / 0.88), th = a < 0.12 ? 0.75 : lerp(0.5, 0.2, (a - 0.12) / 0.88);
    path.push([[0, y, z], ovalS(wd, th, 8)]);
  }
  K.add(sweep(path, [1, 0, 0]), bw, bone ? HMT.bone : HMT.wood, { cf: bone ? (x, y, z, c) => Math.abs(Math.sin(y * 1.6)) < 0.18 ? _hkc.copy(c).lerp(COLR(SINEW), 0.7) : null : null });
  K.add(sweep([[[0, -1.9, -8.4], ovalS(0.86, 0.8, 10)], [[0, -1.7, -8.4], ovalS(0.95, 0.9, 10)], [[0, 1.7, -8.4], ovalS(0.95, 0.9, 10)], [[0, 1.9, -8.4], ovalS(0.86, 0.8, 10)]]), id === 'nbow' ? '#2a1a10' : LEATHER, HMT.leather, { ew: 0.08 });   // the grip
  for (const s of [-1, 1]) K.add(hBallG([0, s * 10.75, -3.3], [0.32, 0.5, 0.32], 7, 6), T.tip || (id === 'nbow' ? '#d8c8a0' : bw), T.tip ? HMT.metal : HMT.bone, { ew: 0.06 });   // the nocks
  if (id === 'nbow') for (const s of [-1, 1]) K.add(wrapG(0, 0.5, 0.6).translate(0, s * 4.2, -8.4 + 5 * 0.15), BRASS, HMT.metal, { ew: 0.05 });
}
function buildArrow(G, iron) {   // a shaft, three vanes at the nock, and a point (with its nock at z = +2, as 76-body expects)
  const K = hkit();
  K.add(hRodG([0, 0, 2.0], [0, 0, -18.2], 0.2, 0.2, 6, 1), '#a08a62', HMT.wood, { ew: 0.05 });
  K.add(hRodG([0, 0, 2.25], [0, 0, 1.6], 0.26, 0.24, 6, 1), '#3a2a20', HMT.plain, { ew: 0.04 });
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; K.add(turnG(new THREE.BoxGeometry(0.06, 0.62, 3.0).translate(0, 0.42, 0), 0, 0, a, [0, 0, 0.1]), i ? '#e8e0cc' : '#b04030', HMT.plain, { ew: 0.03 }); }
  K.add(sweep([0, 0.35, 0.7, 1].map(s => [[0, 0, -18.0 - s * 2.4], lozS(0.12 * (1 - s) + 0.02, 0.6 * (s < 0.35 ? lerp(0.5, 1, s / 0.35) : 1 - (s - 0.35) / 0.65) + 0.02)]), [1, 0, 0], { flat: true }), iron ? '#b8bcc0' : FLINT_HEAD, iron ? HMT.metal : HMT.flint, { ew: 0.04 });
  K.bake(G);
}
// ---- small things you throw ----
function buildPot(K) {   // a clay pot of pitch, held by its neck: a rag stuffed in its mouth for a wick, a cord tied under the lip
  const prof = [[0.01, -4.3], [1.2, -4.2], [2.0, -3.5], [2.25, -2.4], [2.0, -1.3], [1.2, -0.55], [0.62, -0.3], [0.6, 0.3], [0.78, 0.55], [0.6, 0.62], [0.01, 0.5]].map(([r, y]) => new THREE.Vector2(r, y));
  K.add(new THREE.LatheGeometry(prof, 14), '#7a4c2c', HMT.stone, { cf: (x, y, z, c) => y > -1.2 ? _hkc.copy(c).lerp(COLR('#20160e'), clamp((y + 1.2) / 1.8, 0, 0.7)) : null });   // pitch run down from the mouth
  K.add(sweep([[[0, 0.5, 0], ovalS(0.42, 0.42, 8)], [[0.2, 1.6, 0.1], ovalS(0.38, 0.32, 8)], [[0.5, 2.5, 0.3], ovalS(0.18, 0.18, 8)]], [0, 0, 1]), '#c8b07a', HMT.rag, { cf: (x, y, z, c) => y > 1.9 ? _hkc.copy(c).lerp(COLR('#2a1a10'), 0.8) : null });
  K.add(wrapG(-0.45, 0.3, 0.86), RAWHIDE, HMT.cord, { ew: 0.05 });
}
function buildPouch(K, T) {   // a cloth pouch of powder, held by its tied neck, the ends of the cloth sticking up out of your fist
  K.add(rockG([0, -2.3, 0], [1.9, 2.0, 1.8], 3, 0.1, 1, true), '#d8cdb0', HMT.rag);
  K.add(sweep([[[0, -0.6, 0], ovalS(0.75, 0.75, 9)], [[0, 0, 0], ovalS(0.5, 0.5, 9)], [[0, 1.1, 0], ovalS(0.62, 0.62, 9)], [[0, 1.6, 0], ovalS(0.95, 0.85, 9)], [[0, 1.85, 0], ovalS(0.7, 0.6, 9)]], [0, 0, 1]), '#d8cdb0', HMT.rag, { ew: 0.08 });
  K.add(wrapG(-0.4, 0.3, 0.62), '#8a6a48', HMT.cord, { ew: 0.04 });
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; K.add(hBallG([Math.cos(a) * 1.1, -2.2 + Math.sin(i * 2.3) * 1.2, Math.sin(a) * 1.0], [0.16, 0.16, 0.16], 5, 4), T.c || '#efe6d2', HMT.plain, { em: 0.25, ew: 0 }); }   // powder showing through the weave
}
// ---- a torch you carry: a knotted branch, its head wound in rag and pitch, burning at the top ----
function buildTorchItem(K) {
  K.add(haftG(-3, 8.2, t => lerp(0.62, 0.74, t), { bend: 0.25 }), '#6b4a2e', HMT.wood);
  for (const [y, a] of [[1.5, 1], [4.2, 3.6]]) K.add(rockG([Math.cos(a) * 0.62, y, Math.sin(a) * 0.62], [0.32, 0.28, 0.32], a, 0.1, 0, true), '#5a3e26', HMT.wood, { ew: 0.06 });
  K.add(sweep(Array.from({ length: 9 }, (_, i) => { const t = i / 8, y = 6.9 + t * 2.9, r = 1.05 + 0.32 * Math.sin(Math.PI * t) + 0.08 * Math.sin(t * 19); return [[0, y, 0], ovalS(r, r * 0.96, 10)]; }), [0, 0, 1]), '#4a3420', HMT.rag);
  K.add(sweep([[[0, 9.6, 0], ovalS(1.15, 1.15, 10)], [[0, 10.0, 0], ovalS(0.9, 0.9, 10)]], [0, 0, 1]), '#ff8a30', HMT.plain, { em: 1, ew: 0 });
}
function itemModel(id) {
  if (ITEM.has(id)) return ITEM.get(id);
  const T = DIT[id], G = new THREE.Group(), K = hkit(), tool = T.tool, w = T.wpn, thr = T.thr;
  let baked = true;
  if (tool === 'axe' || w === 'waxe' || thr === 'taxe') buildAxe(K, T, id);
  else if (tool === 'pick') buildPick(K, T, id);
  else if (tool === 'build') buildHammer(K);
  else if (w === 'spear' || thr === 'jav') buildSpear(K, T, id);
  else if (w === 'knife' || w === 'sword') buildBlade(K, T, id);
  else if (w === 'club' || w === 'bone') buildClub(K, T, id);
  else if (tool === 'bow') {
    buildBow(K, T, id); const bo = new THREE.Group(); bo.name = 'bow'; G.add(bo); K.bake(bo); baked = false;
    // the string: two thin cords from the bow's tips to the nock (a THREE.Line drew as a long stray line across the view)
    for (const n of ['strA', 'strB']) { const o = vmPart(G, cyl(0.13, 0.13, 1, 4), mat('#efe6d2', 0.3), 0, 0, 0, 0, 0, 0, false); o.name = n; }
    vmString(G, 0);
    const ar = new THREE.Group(); ar.name = 'arrow'; G.add(ar); buildArrow(ar, !!T.tip || id === 'nbow');
  } else if (tool === 'sling') {
    const pouch = new THREE.Group(); pouch.name = 'pouch'; pouch.position.set(0, -7, 0); G.add(pouch);
    const P = hkit(); P.add(rockG([0, 0, 0], [1.3, 0.55, 1.0], 2, 0.08, 1, true), T.c, HMT.leather); P.add(rockG([0, 0.5, 0], [0.78, 0.7, 0.78], 5, 0.12, 1), '#9a9893', HMT.stone, { ew: 0.06 }); P.bake(pouch);
    for (const n of ['cordA', 'cordB']) { const o = vmPart(G, cyl(0.12, 0.12, 1, 4), mat(T.c), 0, 0, 0, 0, 0, 0, false); o.name = n; }
    K.add(new THREE.TorusGeometry(0.75, 0.16, 5, 12).rotateX(Math.PI / 2).translate(0, -1.6, 0), T.c, HMT.cord, { ew: 0.04 });   // the loop round your finger
  } else if (tool === 'rod') {   // a cork grip and a wooden reel, then the rod in three lengths that bend under a fish (71-fish)
    baked = false;
    vmPart(G, cyl(0.62, 0.7, 7, 8).translate(0, -1, 0), mat('#b89668'), 0, 0, 0);
    const reel = new THREE.Group(); reel.name = 'reel'; reel.position.set(0, 1.6, 1.1); reel.scale.setScalar(0.62); G.add(reel);
    vmPart(reel, cyl(1.5, 1.5, 0.9, 12).rotateZ(Math.PI / 2), mat('#6e5235'), 0, 0, 0);
    vmPart(reel, cyl(1.0, 1.0, 1.0, 10).rotateZ(Math.PI / 2), mat('#d8d0bc', 0.1), 0, 0, 0, 0, 0, 0, false);
    const crank = new THREE.Group(); crank.name = 'crank'; crank.position.set(0.9, 0, 0); reel.add(crank);
    vmPart(crank, cyl(0.18, 0.18, 1.6, 5).translate(0, 0.8, 0), mat('#4a3c30'), 0, 0, 0, 0, 0, 0, false);
    vmPart(crank, cyl(0.32, 0.32, 0.8, 6).rotateZ(Math.PI / 2), mat('#2e2620'), 0.4, 1.6, 0, 0, 0, 0, false);
    let seg = G, y = 2.5; const L = [11, 10, 9], R = [0.42, 0.3, 0.18];
    ['rodA', 'rodB', 'rodC'].forEach((n, i) => {
      const g = new THREE.Group(); g.name = n; g.position.set(0, y, 0); seg.add(g);
      vmPart(g, cyl(R[i] * 0.8, R[i], L[i], 6).translate(0, L[i] / 2, 0), mat(i === 2 ? '#a0805a' : '#8a6a44'), 0, 0, 0);
      vmPart(g, new THREE.TorusGeometry(0.42 - i * 0.08, 0.08, 4, 8), mat('#cfc8b4', 0.1), 0, L[i] * 0.85, 0, 0, Math.PI / 2, 0, false);   // a line guide
      seg = g; y = L[i];
    });
    const tip = new THREE.Object3D(); tip.name = 'rodTip'; tip.position.set(0, L[2], 0); seg.add(tip);
  } else if (T.k === 'light') {
    buildTorchItem(K);
    const fl = new THREE.Group(); fl.name = 'flame'; fl.position.set(0, 10.1, 0); G.add(fl);
    for (const [c, o] of [[0xff5a18, 0.75], [0xffa040, 0.85], [0xfff0c0, 0.95]]) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o })); sp.center.set(0.5, 0.08); fl.add(sp); }
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff8a40, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 })); gl.scale.set(26, 26, 1); gl.position.y = 3; fl.add(gl);
  } else if (thr === 'bomb') buildPot(K);
  else if (thr === 'flash') buildPouch(K, T);
  else { G.add(iconPlane(id)); baked = false; }
  if (baked) K.bake(G);
  G.visible = false; handG.add(G); ITEM.set(id, G);
  return G;
}
