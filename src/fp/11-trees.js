// ================= the trees, built solid: the same pines, oaks, cherries and dead trees as the pictures, in the round =================
// Each kind is modelled a few ways over (trunk, limbs, and a crown of soft lumps or drooping tiers of needles), in the
// pictures' own colours with the same dark outline, then stood about the woods many times over in one draw per model.
// On the fast setting, out past the near woods where the fog has them, the pictures stand in for them.
const TREE_R3D = SET.quality === 'fast' ? 600 : 1e9, TREE_NV = 3;
const treeMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU),
  vertexShader: `attribute vec3 color, gu; attribute float em, mt; uniform float time; varying vec3 vC, vW, vN, vG, vL; varying float vE, vM;
    void main() {
      mat4 im = modelMatrix;
      #ifdef USE_INSTANCING
        im = modelMatrix * instanceMatrix;
      #endif
      vec4 w = im * vec4(position, 1.0);
      float k = max(0.0, position.y - 24.0) / 90.0, ph = im[3].x * 0.013 + im[3].z * 0.017;   // the crown sways in the breeze, the trunk stands
      w.x += (sin(time * 0.9 + ph) * 0.6 + sin(time * 2.3 + ph * 3.0) * 0.25) * k * k * 6.0; w.z += sin(time * 0.7 + ph * 1.7) * k * k * 3.0;
      vW = w.xyz; vL = position; vN = normalize(mat3(im) * normal); vC = color; vE = em; vG = gu; vM = mt;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: LIGHT_GLSL + PAINT_GLSL + `varying vec3 vC, vW, vN, vG, vL; varying float vE, vM;
    void main() {
      vec3 N = normalize(vN), c;
      bool leaf = vM > 4.5 && vM < 5.5, needle = vM > 7.5;
      if (leaf || needle) {
        // right beside you, the leaves thin out so a tree never blinds you
        float d = distance(vW, camPos), dz = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        if (d < 34.0 && dz > smoothstep(16.0, 34.0, d)) discard;
        float up = smoothstep(-0.5, 0.9, N.y) * 0.55 + smoothstep(10.0, 110.0, vL.y) * 0.25;   // lit from above, darker underneath and inside
        if (leaf) {   // dabs of paint: clumps of leaves, lighter ones catching the light
          float a = vn(vG * 0.55), b = vn(vG * 1.7 + 7.0);
          c = vC * (0.55 + 0.55 * up) * (0.78 + 0.32 * a) + vC * smoothstep(0.62, 0.8, b) * 0.35 * up;
        } else {      // needles: short strokes raked down and out
          float s = vn(vec3(vG.x * 1.6, vG.y * 0.35, vG.z * 1.6)), t = vn(vG * 0.4);
          c = vC * (0.6 + 0.5 * up) * (0.75 + 0.35 * s) * (0.9 + 0.2 * t) + vec3(0.06, 0.12, 0.08) * smoothstep(0.7, 0.85, s) * up;
        }
      } else c = paint(vC, vM, vG, vW, N);
      vec3 o = c * lightAt(vW, N, 1.0) * 1.05;
      gl_FragColor = vec4(fogged(grey(o), vW), 1.0);
    }`,
});
const treeEdge = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU), side: THREE.BackSide,
  vertexShader: `attribute float ew; uniform float time; varying vec3 vW;
    void main() {
      mat4 im = modelMatrix;
      #ifdef USE_INSTANCING
        im = modelMatrix * instanceMatrix;
      #endif
      vec4 w = im * vec4(position + normal * ew, 1.0);
      float k = max(0.0, position.y - 24.0) / 90.0, ph = im[3].x * 0.013 + im[3].z * 0.017;
      w.x += (sin(time * 0.9 + ph) * 0.6 + sin(time * 2.3 + ph * 3.0) * 0.25) * k * k * 6.0; w.z += sin(time * 0.7 + ph * 1.7) * k * k * 3.0;
      vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: LIGHT_GLSL + `varying vec3 vW;
    void main() { if (distance(vW, camPos) < 30.0) discard; vec3 L = lightAt(vW, vec3(0.0), 0.0); float b = clamp(dot(L, vec3(0.34)) * 2.2, 0.0, 1.0); gl_FragColor = vec4(fogged(vec3(0.122, 0.114, 0.102) * b, vW), 1.0); }`,
});

// soft lumps for a crown, and a tier of a pine's skirt with a ragged, drooping hem
const P_LUMP = (k = 0) => prim('lump' + k, () => {
  const g = new THREE.SphereGeometry(0.5, 14, 10), p = g.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 0.9 + 0.14 * Math.sin(v.x * 9 + k) * Math.sin(v.y * 8 + k * 2) * Math.sin(v.z * 10 + k * 3) + 0.07 * Math.sin(v.x * 27 + v.y * 13 + v.z * 21 + k); v.multiplyScalar(n); v.y *= 0.88; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
});
const P_TIER = (k = 0) => prim('tier' + k, () => {
  const n = 18, g = new THREE.ConeGeometry(0.5, 1, n, 3), p = g.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); if (v.y > 0.49) continue;
    const r = Math.hypot(v.x, v.z); if (r < 1e-4) continue;
    const a = Math.atan2(v.z, v.x), f = r / 0.5, tuft = 0.5 + 0.5 * Math.cos(a * 9 + k * 1.7), jag = 1 + (0.16 * tuft + 0.07 * Math.sin(a * 23 + k)) * f;
    p.setXYZ(i, v.x * jag, v.y - 0.12 * f * f * tuft, v.z * jag);
  }
  g.translate(0, 0.5, 0); g.computeVertexNormals(); return g;
});

function treeModel(kind, vi) {   // one tree, in the pictures' own units (a pine is about 112 high), its foot at the origin
  let s = 977 + vi * 131 + kind.length * 17; const R = () => (s = (s * 16807) % 2147483647) / 2147483647, K = new Kit();
  const tone = (list, j) => hex(list[j % list.length]);
  if (kind === 'pine') {
    K.mt = 'bark'; K.add(P_CYL(9), 0, 0, 0, 7.5, 34, 7.5, hex('#3e2c20'), 0, 0, 0, 0, 0.35); K.mt = null;
    const tiers = 6 + (vi % 2), G = ['#1a4232', '#21503c', '#1d4a37', '#275a43'];
    for (let i = 0; i < tiers; i++) {
      const f = i / (tiers - 1), y = 14 + f * 74, r = 64 * (1 - f * 0.8) * (0.92 + 0.16 * R()), h = 30 - f * 8;
      K.mt = 8; K.add(P_TIER(i % 4), (R() - 0.5) * 3, y, (R() - 0.5) * 3, r, h, r, tone(G, i + vi), R() * 6.28, 0, (R() - 0.5) * 0.12, 0, 0.32);
    }
    K.add(P_CONE(7), 0, 100, 0, 7, 16, 7, hex('#24533e'), 0, 0, 0.06, 0, 0.3);
    K.mt = 'bark'; K.add(P_CONE(6), 0, 102, 0, 1.8, 14, 1.8, hex('#5a3e2c'), 0, 0, 0, 0, 0.25); K.mt = null;
  } else if (kind === 'oak' || kind === 'cherry') {
    const ch = kind === 'cherry', trunkH = ch ? 46 : 50, crownY = ch ? 66 : 64;
    K.mt = 'bark';
    K.add(P_CYL(10), 0, 0, 0, 13, 6, 13, hex('#2a211b'), 0, 0, 0, 0, 0.35);   // the flare at its foot
    K.rod(P_CYL(10), 0, 0, 0, (R() - 0.5) * 4, trunkH, (R() - 0.5) * 4, ch ? 4.4 : 5.2, hex(ch ? '#2c2420' : '#2e2620'));
    const limbs = ch ? 5 : 4, tips = [];
    for (let i = 0; i < limbs; i++) {   // limbs out from the top of the trunk into the crown
      const a = i / limbs * 6.28 + R() * 0.8, L = (ch ? 30 : 22) + R() * 10, y0 = trunkH * (0.6 + 0.3 * R());
      const tx = Math.cos(a) * L, tz = Math.sin(a) * L, ty = crownY - 4 + R() * 10;
      K.rod(P_CYL(7), 0, y0, 0, tx, ty, tz, ch ? 1.9 : 2.3, hex('#2c2420')); tips.push([tx, ty, tz]);
    }
    K.mt = null;
    // the crown: soft lumps of leaf (or blossom), bigger and darker at the heart, smaller and lighter round the top and edges
    const G = ch ? ['#cc649c', '#e080b2', '#ee9ec4', '#d670a8'] : ['#24461a', '#2f5a21', '#3b6a29', '#325f23'];
    K.mt = 'plant';
    const lumps = ch ? 5 + vi % 2 : 7 + vi % 2;
    for (let i = 0; i < lumps; i++) {
      const a = i / lumps * 6.28 + R(), d = (ch ? 22 : 20) + R() * 12, r = (ch ? 32 : 38) + R() * 12, y = crownY + (R() - 0.3) * 18;
      K.add(P_LUMP(i % 5), Math.cos(a) * d, y, Math.sin(a) * d, r, r * 0.85, r, tone(G, i), R() * 6.28, 0, 0, 0, 0.32);
    }
    K.add(P_LUMP(5), 0, crownY + 16, 0, ch ? 34 : 40, 30, ch ? 34 : 40, tone(G, 2), 0, 0, 0, 0, 0.32);
    if (ch) for (const [x, y, z] of tips) K.add(P_LUMP(6), x, y + 4, z, 30, 24, 30, tone(G, 3), R() * 6.28, 0, 0, 0, 0.3);
    K.mt = null;
  } else {   // dead: a bare trunk, snapped at the top, its limbs forking into twigs
    K.mt = 'bark';
    K.add(P_CYL(9), 0, 0, 0, 10, 5, 10, hex('#2c2622'), 0, 0, 0, 0, 0.35);
    K.rod(P_CYL(9), 0, 0, 0, 1, 52, 0, 4.4, hex('#3a322c'));
    K.add(P_CONE(7), 1, 51, 0, 7, 8, 7, hex('#3a322c'), 0, 0, 0.3, 0, 0.3);
    const fork = (x, y, z, a, el, L, r, depth) => {
      const ex = x + Math.cos(a) * Math.cos(el) * L, ey = y + Math.sin(el) * L, ez = z + Math.sin(a) * Math.cos(el) * L;
      K.rod(P_CYL(5), x, y, z, ex, ey, ez, r, hex('#3a322c'));
      if (depth > 0) for (let j = 0; j < 2; j++) fork(ex, ey, ez, a + (j ? 0.6 : -0.6) + (R() - 0.5) * 0.5, el + 0.15 + R() * 0.3, L * 0.6, r * 0.6, depth - 1);
    };
    for (let i = 0; i < 4; i++) fork(0, 26 + i * 7, 0, i * 1.7 + R(), 0.35 + R() * 0.4, 20 + R() * 8, 1.25, 2);
    K.mt = null;
  }
  return K.geometry();
}

// one instanced draw (and its outline) per kind and way of building it
const TREE_KINDS = ['pine', 'oak', 'cherry', 'dead'], TREE_CAP = 700;
const TREES = {};
for (const k of TREE_KINDS) TREES[k] = [];
let treesBuilt = false;
function treesBuild() {
  treesBuilt = true;
  for (const k of TREE_KINDS) for (let v = 0; v < TREE_NV; v++) {
    const g = treeModel(k, v), m = new THREE.InstancedMesh(g, treeMat, TREE_CAP), e = new THREE.InstancedMesh(g, treeEdge, TREE_CAP);
    m.count = e.count = 0; m.frustumCulled = e.frustumCulled = false; e.instanceMatrix = m.instanceMatrix; scene.add(castsShadow(m)); scene.add(e);
    TREES[k].push({ m, e, list: [] });
  }
}
const _tm = new M4(), _tq = new THREE.Quaternion(), _tq2 = new THREE.Quaternion(), _te = new THREE.Euler(), _tp = new V3(), _ts = new V3(), _tax = new V3();
function treeMatrix(o, tilt, ta) {
  const k = TREE_K * o.s, yaw = (o.seed * 7919 % 1) * 6.283;
  _tq.setFromEuler(_te.set(0, yaw, 0));
  if (tilt) { _tq2.setFromAxisAngle(_tax.set(-Math.sin(ta), 0, Math.cos(ta)), tilt); _tq.premultiply(_tq2); }
  return _tm.compose(_tp.set(o.x, 0, o.y), _tq, _ts.set(k, k, k));
}
function treesBegin() { if (!treesBuilt) treesBuild(); for (const k of TREE_KINDS) for (const B of TREES[k]) B.list.length = 0; }
function treeAdd(o, kind, d) {   // near enough to stand solid? then it's ours, not a picture
  if (d > TREE_R3D) return false;
  const B = TREES[kind][(o.seed * 997 | 0) % TREE_NV]; if (B.list.length >= TREE_CAP) return false;
  B.list.push(o); return true;
}
function treesEnd() {
  for (const k of TREE_KINDS) for (const B of TREES[k]) {
    B.list.forEach((o, i) => B.m.setMatrixAt(i, treeMatrix(o, 0)));
    B.m.count = B.e.count = B.list.length; B.m.instanceMatrix.needsUpdate = true;
  }
}
// each frame: a tree you're chopping shudders with each blow
function treesFrame() {
  if (!treesBuilt) return;
  for (const k of TREE_KINDS) for (const B of TREES[k]) {
    let dirty = false;
    B.list.forEach((o, i) => {
      const t = S.t - (o.shakeT ?? -99); if (t > 0.7 && !o.fpShook) return;
      o.fpShook = t <= 0.7;
      const a = Math.atan2(o.y - S.p.y, o.x - S.p.x), tilt = t <= 0.7 ? Math.sin(t * 34) * Math.exp(-t * 6) * 0.05 : 0;
      B.m.setMatrixAt(i, treeMatrix(o, tilt, a)); dirty = true;
    });
    B.n = B.list.length;
    if (dirty) B.m.instanceMatrix.needsUpdate = true;
  }
  // the tree you just felled topples away from you, solid, the same tree it was
  for (const g of S.day.logs) if (g.kind === 'poof') {
    const kind = kindOfTree(g), B = TREES[kind][(g.seed * 997 | 0) % TREE_NV]; if (B.n >= TREE_CAP) continue;
    const u = Math.min(1, g.t / POOF_T), a = g.fa ?? (g.fa = Math.atan2(g.y - S.p.y, g.x - S.p.x));
    B.m.setMatrixAt(B.n++, treeMatrix(g, u * u * 1.5, a)); B.m.instanceMatrix.needsUpdate = true;
  }
  for (const k of TREE_KINDS) for (const B of TREES[k]) if (B.m.count !== B.n) { B.m.count = B.e.count = B.n; B.m.instanceMatrix.needsUpdate = true; }
}
