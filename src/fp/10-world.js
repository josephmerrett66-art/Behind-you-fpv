// ================= the woods: the main game's own trees, rocks, ground cover and ponds, stood up around you =================

// ---------------- billboards: every painted sprite, stood upright and facing you, swaying at the top ----------------
// One instanced draw per board. Boards are refilled from the game's world as you walk (only when you've moved far enough).
class Board {
  // cross: instead of one card turned to face you, that many cards crossed through each other at odd angles, each a little
  // smaller or set off from the middle, so a plant seen from any side is a full clump rather than a picture
  constructor(cap, cull, near, cover, tex = atlasTex, atlas = ATLAS, cross = false) {
    this.cap = cap; this.atlas = atlas;
    const g = new THREE.InstancedBufferGeometry();
    const nq = cross || 1, pos = [], idx = [];
    for (let q = 0; q < nq; q++) { pos.push(0, 0, q, 1, 0, q, 1, 1, q, 0, 1, q); idx.push(q * 4, q * 4 + 2, q * 4 + 1, q * 4, q * 4 + 3, q * 4 + 2); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    this.P = new Float32Array(cap * 4); this.R = new Float32Array(cap * 4); this.D = new Float32Array(cap * 4); this.X = new Float32Array(cap * 4);
    for (const [k, a] of [['iPos', this.P], ['iRect', this.R], ['iDim', this.D], ['iMisc', this.X]]) { const b = new THREE.InstancedBufferAttribute(a, 4); b.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, b); }
    g.instanceCount = 0; this.g = g;
    const m = new THREE.ShaderMaterial({
      uniforms: Object.assign({ map: { value: tex }, cull: { value: cull }, near: { value: near }, now: { value: 0 } }, LU),
      defines: Object.assign(AA ? { A2C: 1 } : {}, cross ? { CROSS: cross } : {}), alphaToCoverage: AA, side: THREE.DoubleSide,   // a flipped sprite turns its back; draw both faces
      vertexShader: TERR_GLSL + `attribute vec4 iPos, iRect, iDim, iMisc; uniform vec3 camPos, camRight, fogC; uniform float time, cull, near, now;
        varying vec2 vUv; varying vec3 vW; varying vec3 vNear; varying vec2 vSh;
        void main() {
          float d = distance(iPos.xz, fogC.xz);
          vec3 R = camRight, off = vec3(0.0); float edge = 1.0, card = 1.0, sc = 1.0;
          #ifdef CROSS
            float q = position.z, a = iMisc.w * 6.2832 + q * 2.39996; R = vec3(cos(a), 0.0, sin(a));   // each card turned by the golden angle
            float h1 = fract(sin(q * 12.9898 + iMisc.w * 78.233) * 43758.5453), h2 = fract(h1 * 91.7 + q * 0.37);
            float b = q * 1.7 + iMisc.w * 9.0;
            off = vec3(cos(b), 0.0, sin(b)) * (q < 0.5 ? 0.0 : h1 * 0.3 * iDim.x * iPos.w);           // set off from the middle
            sc = q < 0.5 ? 1.0 : mix(0.68, 0.95, h2);                                                  // and a little smaller
            vec3 tv = normalize(vec3(camPos.x - iPos.x, 0.0, camPos.z - iPos.z) + vec3(1e-4));
            edge = smoothstep(0.08, 0.4, abs(dot(vec3(-R.z, 0.0, R.x), tv)));   // a card seen edge-on thins away instead of showing as a sliver
            card = mix(0.8, 1.04, h2);                                          // the cards a shade apart, so they read as layers of leaves
          #endif
          if (d > cull) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          float s = iPos.w;
          float lx = (position.x * iDim.x - iDim.z) * s * iMisc.x * sc;
          float ly = (iDim.w - (1.0 - position.y) * iDim.y) * s * sc;
          float up = max(ly, 0.0) / (iDim.w * s + 0.001);
          float sw = sin(time * 0.7 + iMisc.w * 20.0) * 1.6 + sin(time * 1.9 + iMisc.w * 7.0) * 0.5;
          float st = now - iMisc.z; float shake = st >= 0.0 && st < 0.45 ? sin(st * 48.0) * (1.0 - st / 0.45) * 5.0 : 0.0;   // struck: it shudders
          sw = (sw * iMisc.y + shake) * up * up;
          vec3 w = vec3(iPos.x, iPos.y + terrH(iPos.xz), iPos.z) + off + R * lx + camRight * sw * s + vec3(0.0, ly, 0.0);
          vSh = vec2(edge, card * mix(0.62, 1.0, smoothstep(0.0, 0.45, up)));   // darker down at the roots, where it meets the ground
          vUv = iRect.xy + vec2(position.x, 1.0 - position.y) * iRect.zw;
          vW = w;
          vNear = vec3(near > 0.0 && iDim.y * s > 70.0 ? clamp((d - near) / (near * 0.9), 0.0, 1.0) : 1.0, abs(lx) / s, ly / s);   // right beside a tree, all but its trunk melts away so it never fills the screen
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
        }`,
      fragmentShader: LIGHT_GLSL + `uniform sampler2D map; varying vec2 vUv; varying vec3 vW; varying vec3 vNear; varying vec2 vSh;
        void main() {
          vec4 t = texture2D(map, vUv);
          float trunk = (vNear.y < 7.0 && vNear.z < 34.0) ? 1.0 : 0.0;
          float keep = max(vNear.x, trunk) * vSh.x;
          #ifdef A2C
            t.a *= keep * keep;
            if (t.a < 0.08) discard;
          #else
            if (keep < 1.0) { vec2 b = mod(floor(gl_FragCoord.xy), 4.0); float h = (mod(b.x + b.y * 2.0, 4.0) * 4.0 + mod(b.x * 2.0 + b.y, 4.0)) / 16.0 + 0.03; if (h > keep) discard; }
            if (t.a < 0.5) discard;
          #endif
          gl_FragColor = vec4(fogged(grey(t.rgb * vSh.y * lightAt(vW, vec3(0.0), 0.0) * ${cover ? '1.18' : '1.12'}), vW), t.a);
        }`,
    });
    this.m = m; this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; scene.add(castsShadow(this.mesh)); this.n = 0;
  }
  begin() { this.n = 0; }
  // one sprite: kind and variant from the atlas, its foot at (x, y) on the ground (h above it), scale, facing (1 or -1), sway, struck time, seed
  add(kind, v, x, y, s, flip = 1, sway = 0, shakeT = -99, seed = 0, h = 0) {
    if (this.n >= this.cap) return;
    const A = this.atlas, M = A.meta[kind]; if (!M) return; const r = M[v % M.length], i = this.n++ * 4;
    this.P[i] = x; this.P[i + 1] = h; this.P[i + 2] = y; this.P[i + 3] = s;
    this.R[i] = r[0] / A.W; this.R[i + 1] = r[1] / A.H; this.R[i + 2] = r[2] / A.W; this.R[i + 3] = r[3] / A.H;
    this.D[i] = r[4]; this.D[i + 1] = r[5]; this.D[i + 2] = r[6]; this.D[i + 3] = r[7];
    this.X[i] = flip; this.X[i + 1] = sway; this.X[i + 2] = shakeT; this.X[i + 3] = seed;
  }
  end() {
    this.g.instanceCount = this.n;
    for (const k of ['iPos', 'iRect', 'iDim', 'iMisc']) { const a = this.g.attributes[k]; a.needsUpdate = true; if (a.clearUpdateRanges) { a.clearUpdateRanges(); a.addUpdateRange(0, this.n * 4); } else { a.updateRange.offset = 0; a.updateRange.count = this.n * 4; } }
  }
}
const tallB = new Board(2600, VIEW, 30, false), coverB = new Board(6000, 420, 0, true), plantB = new Board(6000, 420, 0, true), bushB = new Board(2000, 420, 0, true), nearB = new Board(900, 300, 0, true);

// ---------------- the kit: solid things built from simple shapes, with the game's dark outline round them ----------------
// Shapes are baked into one mesh per batch (vertex colours), drawn twice: once lit, once as a slightly fatter dark shell.
// Each shape carries what it is made of (wood, stone, iron, cloth, leaves, water) and where each point sits along it, so the
// surface can be painted: grain running the length of a log or plank, mottled stone, iron that catches the light, a weave in
// cloth. Everything also darkens where it meets the ground, which seats it in the world instead of floating on it.
const MT = { plain: 0, wood: 1, stone: 2, metal: 3, cloth: 4, plant: 5, water: 6, bark: 7 };
const PAINT_GLSL = `
uniform float time;
float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float paintH = 99.0;   // the shader sets this: how far above the ground the point is
vec3 paint(vec3 c, float mt, vec3 g, vec3 W, vec3 N) {
  if (mt > 0.5 && mt < 1.5) {        // wood: long streaks of grain, the odd dark knot
    float w = vn(vec3(g.x * 0.05, g.y * 0.8, g.z * 0.8));
    float streak = sin((g.y + g.z) * 1.9 + w * 9.0) * 0.5 + 0.5;
    float knot = smoothstep(0.82, 0.9, vn(g * vec3(0.12, 0.6, 0.6)));
    c *= 0.8 + 0.26 * streak + 0.12 * (vn(g * 0.35) - 0.5); c *= 1.0 - 0.3 * knot;
  } else if (mt > 1.5 && mt < 2.5) { // stone: mottled, with grit
    float n = vn(g * 0.22) * 0.6 + vn(g * 0.8) * 0.4;
    c *= 0.72 + 0.5 * n; c *= h3(floor(g * 1.7)) > 0.9 ? 0.82 : 1.0;
  } else if (mt > 2.5 && mt < 3.5) { // iron: a little rust and wear, and it catches the sun and your torch
    c *= 0.86 + 0.24 * vn(g * 0.6);
    vec3 V = normalize(W - camPos), R = reflect(V, N);
    float sp = pow(max(dot(R, sunDir), 0.0), 14.0) * 0.55 * sunK + pow(max(dot(R, -normalize(W - tPos)), 0.0), 20.0) * 0.5 * length(tCol);
    c += vec3(sp);
  } else if (mt > 3.5 && mt < 4.5) { // cloth and hide: a soft weave and some staining
    c *= 1.0 + sin(g.x * 2.6) * sin(g.y * 2.6) * 0.05 + (vn(g * 0.15) - 0.5) * 0.22;
  } else if (mt > 4.5 && mt < 5.5) { // leaves
    c *= 0.78 + 0.4 * vn(g * 0.7);
  } else if (mt > 5.5 && mt < 6.5) { // water: the sky in it, a slow shimmer
    float f = pow(1.0 - abs(dot(normalize(camPos - W), N)), 2.0);
    c = mix(c, fogCol * 0.85, 0.15 + 0.35 * f) * (0.92 + 0.12 * sin(time * 1.7 + (W.x + W.z) * 0.35));
  } else if (mt > 6.5) {             // bark: deep furrows up the trunk
    c *= 0.72 + 0.4 * smoothstep(0.2, 0.8, vn(vec3(g.x * 0.08, g.y * 1.4, g.z * 1.4)));
  }
  return c * mix(0.58, 1.0, smoothstep(0.0, 9.0, paintH));   // seated: darker where it meets the ground (how high off it, not how high up the hill)
}`;
const kitMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ glow: { value: 0 } }, LU),
  vertexShader: TERR_GLSL + `attribute vec3 color, gu; attribute float em, mt; varying vec3 vC, vW, vN, vG; varying float vE, vM, vH;
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); vH = w.y; w.y += terrH(w.xz); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; vE = em; vG = gu; vM = mt; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + PAINT_GLSL + `varying vec3 vC, vW, vN, vG; varying float vE, vM, vH;
    void main() { vec3 N = normalize(vN); paintH = vH; vec3 base = paint(vC, vM, vG, vW, N); vec3 c = base * lightAt(vW, N, 1.0) * 1.05 + vC * vE; gl_FragColor = vec4(fogged(grey(c), vW), 1.0); }`,
});
const kitEdge = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU), side: THREE.BackSide,
  vertexShader: TERR_GLSL + `attribute float ew; varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position + normal * ew, 1.0); w.y += terrH(w.xz); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `varying vec3 vW;
    void main() { vec3 L = lightAt(vW, vec3(0.0), 0.0); float b = clamp(dot(L, vec3(0.34)) * 2.2, 0.0, 1.0); gl_FragColor = vec4(fogged(vec3(0.122, 0.114, 0.102) * b, vW), 1.0); }`,
});
const _km = new M4(), _kq = new THREE.Quaternion(), _ke = new THREE.Euler(), _kv = new V3(), _ks = new V3();
const PRIM = {};
function prim(key, make) { let g = PRIM[key]; if (!g) { g = make(); if (g.index) g = g.toNonIndexed(); g.deleteAttribute('uv'); PRIM[key] = g; } return g; }
const P_BOX = () => prim('box', () => new THREE.BoxGeometry(1, 1, 1));
const P_CYL = (n = 8) => prim('cyl' + n, () => { const g = new THREE.CylinderGeometry(0.5, 0.5, 1, n); g.translate(0, 0.5, 0); return g; });
const P_CONE = (n = 8) => prim('cone' + n, () => { const g = new THREE.ConeGeometry(0.5, 1, n); g.translate(0, 0.5, 0); return g; });
const P_ROCK = (k = 0) => prim('rock' + k, () => { const g = new THREE.IcosahedronGeometry(0.5, 0), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const h = 0.85 + 0.3 * hash(Math.round(p.getX(i) * 9) + k * 3.1, Math.round(p.getY(i) * 7 + p.getZ(i) * 5)); p.setXYZ(i, p.getX(i) * h, p.getY(i) * h, p.getZ(i) * h); } g.computeVertexNormals(); return g; });   // a faceted stone, each variant knocked about a little
const P_BALL = () => prim('ball', () => new THREE.SphereGeometry(0.5, 10, 7));
const P_TENT = () => prim('tent', () => { const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 3, 1); g.rotateZ(Math.PI / 2); g.rotateX(Math.PI / 6); g.translate(0, 0.25, 0); return g; });   // a triangular prism lying along x, ridge up (0.75 high, 0.87 wide)
// what a colour is most likely made of, when the shape doesn't say
function autoMt(col) {
  const [r, g, b] = col, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx > 0 ? (mx - mn) / mx : 0;
  if (g > r * 1.08 && g > b) return MT.plant;
  if (b > r * 1.12 && b > g) return mx > 0.5 ? MT.water : MT.metal;
  if (sat < 0.09) return mx > 0.6 && b >= r ? MT.metal : MT.stone;
  return r >= b ? MT.wood : MT.stone;
}
const KIT_ATTR = [['position', 'pos', 3], ['normal', 'nor', 3], ['color', 'col', 3], ['em', 'em', 1], ['ew', 'ew', 1], ['gu', 'gu', 3], ['mt', 'mts', 1]];
class Kit {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.em = []; this.ew = []; this.gu = []; this.mts = []; this.mt = null; this.ch = null; }
  _mat(col) { return this.mt !== null ? MT[this.mt] ?? this.mt : autoMt(col); }
  // put a shape in: at (x, y, z) in 3D (z is the game's y), turned by yaw (and pitch, roll), sized (sx, sy, sz), coloured
  add(geo, x, y, z, sx, sy, sz, col, yaw = 0, pitch = 0, roll = 0, em = 0, ew = 0.7) {
    _km.compose(_kv.set(x, y, z), _kq.setFromEuler(_ke.set(pitch, yaw, roll, 'YXZ')), _ks.set(sx, sy, sz));
    const p = geo.attributes.position, n = geo.attributes.normal, nm = new THREE.Matrix3().getNormalMatrix(_km), v = new V3();
    const m = this._mat(col), ax = sx >= sy && sx >= sz ? 0 : sy >= sz ? 1 : 2, o = (x * 0.37 + z * 0.61) % 97;   // grain runs along the longest side
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const l = [v.x * sx, v.y * sy, v.z * sz];
      this.gu.push(l[ax] + o, l[(ax + 1) % 3] + o * 0.3, l[(ax + 2) % 3]); this.mts.push(m);
      v.applyMatrix4(_km); this.pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); this.nor.push(v.x, v.y, v.z);
      this.col.push(col[0], col[1], col[2]); this.em.push(em); this.ew.push(ew);
    }
  }
  // a shape running from one ground point to another (a log, a beam, a stake), r thick
  rod(geo, ax, ay, az, bx, by, bz, r, col, em = 0) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz) || 1;
    _kq.setFromUnitVectors(_kv.set(0, 1, 0), new V3(dx / L, dy / L, dz / L));
    _km.compose(new V3(ax, ay, az), _kq, _ks.set(r * 2, L, r * 2));
    const p = geo.attributes.position, n = geo.attributes.normal, nm = new THREE.Matrix3().getNormalMatrix(_km), v = new V3();
    const m = this._mat(col), o = (ax * 0.37 + az * 0.61) % 97;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); this.gu.push(v.y * L + o, v.x * r * 2 + o * 0.3, v.z * r * 2); this.mts.push(m);
      v.applyMatrix4(_km); this.pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); this.nor.push(v.x, v.y, v.z);
      this.col.push(col[0], col[1], col[2]); this.em.push(em); this.ew.push(0.6);
    }
  }
  // what's been put in so far, packed away to be added again later as it is (a piece you built, while it doesn't change)
  take() { return { pos: new Float32Array(this.pos), nor: new Float32Array(this.nor), col: new Float32Array(this.col), em: new Float32Array(this.em), ew: new Float32Array(this.ew), gu: new Float32Array(this.gu), mts: new Float32Array(this.mts) }; }
  chunk(c) { (this.ch || (this.ch = [])).push(c); }
  geometry() {
    const g = new THREE.BufferGeometry(), ch = this.ch;
    for (const [name, f, w] of KIT_ATTR) {
      const own = this[f];
      if (!ch) { g.setAttribute(name, new THREE.Float32BufferAttribute(own, w)); continue; }
      let N = own.length; for (const c of ch) N += c[f].length;
      const A = new Float32Array(N); A.set(own); let off = own.length;
      for (const c of ch) { A.set(c[f], off); off += c[f].length; }
      g.setAttribute(name, new THREE.BufferAttribute(A, w));
    }
    g.computeBoundingSphere();
    return g;
  }
}
class KitMesh {   // a batch you can rebuild: the lit shapes and their outline
  constructor(edge = true) { this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), kitMat); this.edge = edge ? new THREE.Mesh(this.mesh.geometry, kitEdge) : null; this.mesh.frustumCulled = false; scene.add(this.mesh); if (this.edge) { this.edge.frustumCulled = false; scene.add(this.edge); } }
  set(kit) { const old = this.mesh.geometry; const g = kit.geometry(); this.mesh.geometry = g; if (this.edge) this.edge.geometry = g; old.dispose(); }
  get visible() { return this.mesh.visible; } set visible(v) { this.mesh.visible = v; if (this.edge) this.edge.visible = v; }
}

// ---------------- the camp: the palisade with its four gates, two watchtowers, the yard ----------------
const logTone3 = k => hex(['#4a453e', '#3f3a34', '#524c44', '#46413a'][((k % 4) + 4) % 4]);
function campKit(K) {
  if (!NO_CAMP) yardKit(K);
  { const x = EX_FIRE.x, y = EX_FIRE.y;   // the fire in the middle: a ring of stones, the logs crossed in it, a bed of ash
    K.add(P_CYL(12), x, -0.4, y, 24, 1, 24, hex('#2e2a26'));
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283 + 0.2; K.mt = 'stone'; K.add(P_ROCK(k % 4), x + Math.cos(a) * 14, 1.6, y + Math.sin(a) * 14, 8 + hash(k, 3) * 2, 6, 7, hex(k % 2 ? '#7a7872' : '#8d8b85'), -a); K.mt = null; }
    for (let k = 0; k < 4; k++) { const a = k / 4 * 3.1416 + 0.4; K.rod(P_CYL(6), x - Math.cos(a) * 9, 1.5, y - Math.sin(a) * 9, x + Math.cos(a) * 9, 4.5, y + Math.sin(a) * 9, 1.8, hex(k % 2 ? '#4a3420' : '#5a3e28'), 0.15); } }
  for (const o of CAMP) {
    if (o.camp === 'wall') {   // three logs, each its own height with a point on top, lashed twice
      for (let m = 0; m < 3; m++) { const f = (m + 0.5) / 3, x = o.ax + (o.bx - o.ax) * f, y = o.ay + (o.by - o.ay) * f, h = 27 + 5 * hash((o.seq * 3 + m) * 1.3, 7);
        K.add(P_CYL(7), x, 0, y, 4.6, h, 4.6, logTone3(o.seq + m)); K.add(P_CONE(7), x, h, y, 4.6, 4.5, 4.6, logTone3(o.seq + m)); }
      K.rod(P_CYL(5), o.ax, 7, o.ay, o.bx, 7, o.by, 0.75, hex('#2a2724')); K.rod(P_CYL(5), o.ax, 21, o.ay, o.bx, 21, o.by, 0.75, hex('#2a2724'));
    } else if (o.camp === 'post') {
      K.add(P_CYL(8), o.x, 0, o.y, 6.8, 46, 6.8, hex('#4a453e')); K.add(P_CONE(8), o.x, 46, o.y, 6.8, 5, 6.8, hex('#4a453e'));
      K.add(P_CYL(8), o.x, 14, o.y, 7.4, 2, 7.4, hex('#2a2724')); K.add(P_CYL(8), o.x, 30, o.y, 7.4, 2, 7.4, hex('#2a2724'));
    } else if (o.camp === 'beam') {
      K.rod(P_CYL(6), o.ax, 42, o.ay, o.bx, 42, o.by, 2.2, hex('#3f3a34'));
    } else if (o.camp === 'door') {   // a gate leaf swung open outward
      const a = Math.atan2(o.by - o.ay, o.bx - o.ax), L = Math.hypot(o.bx - o.ax, o.by - o.ay);
      K.add(P_BOX(), (o.ax + o.bx) / 2, 2 + 11.5, (o.ay + o.by) / 2, L, 23, 2, hex('#3d3934'), -a);
    } else if (o.camp === 'tower') {
      const H = 58;
      for (const [lx, ly] of [[-9, -9], [9, -9], [9, 9], [-9, 9]]) K.rod(P_CYL(5), o.x + lx, 0, o.y + ly, o.x + lx * 0.8, H, o.y + ly * 0.8, 1.5, hex('#3a3631'));
      K.rod(P_CYL(4), o.x - 9, 0, o.y - 9, o.x + 4, H * 0.55, o.y + 4, 0.7, hex('#3a3631')); K.rod(P_CYL(4), o.x + 9, 0, o.y - 9, o.x - 4, H * 0.55, o.y + 4, 0.7, hex('#3a3631'));
      K.add(P_BOX(), o.x, H, o.y, 24, 4, 24, hex('#4a453e'));
      for (const [lx, ly] of [[-10, -10], [10, -10], [10, 10], [-10, 10]]) K.add(P_CYL(5), o.x + lx, H + 4, o.y + ly, 1.3, 20, 1.3, hex('#3f3a34'));
      K.add(P_CONE(4), o.x, H + 22, o.y, 36, 14, 36, hex('#3b3732'), Math.PI / 4);
    } else if (o.camp === 'stakes') {   // three sharpened stakes leaning out
      const ux = Math.cos(o.a), uy = Math.sin(o.a);
      for (let m = -1; m <= 1; m++) { const bx = o.x - uy * m * 7, by = o.y + ux * m * 7, h = 15 + 4 * ((m + 1 + o.seed * 3) % 2);
        K.rod(P_CONE(5), bx, 0, by, bx + ux * 13, h, by + uy * 13, 1.4, logTone3(m + 1)); }
      K.rod(P_CYL(5), o.x - uy * 10, 2, o.y + ux * 10, o.x + uy * 10, 2, o.y - ux * 10, 1.5, hex('#3a3631'));
    } else if (o.camp === 'bench') {   // a split log to sit on, on two short stumps
      const ux = Math.cos(o.a), uy = Math.sin(o.a);
      for (const m of [-8, 8]) K.add(P_CYL(8), o.x + ux * m, 0, o.y + uy * m, 4.4, 4.2, 4.4, hex('#4a4038'));
      logRod(K, o.x - ux * 14, 6.2, o.y - uy * 14, o.x + ux * 14, 6.2, o.y + uy * 14, 2.8, hex('#5c4a3a'));
    } else if (o.camp === 'tent') {
      tentKit(K, o, hex('#8c8474'));
    } else if (o.camp === 'rack') {
      K.add(P_CYL(5), o.x - 9, 0, o.y, 2, 18, 2, hex('#3a3631')); K.add(P_CYL(5), o.x + 9, 0, o.y, 2, 16, 2, hex('#3a3631'));
      K.rod(P_CYL(5), o.x - 10, 15, o.y, o.x + 10, 13, o.y, 1, hex('#3a3631'));
      for (let m = 0; m < 4; m++) { const x = o.x - 6 + m * 4; K.rod(P_CYL(4), x - 1, 0, o.y + 2, x + 1, 32, o.y - 2, 0.65, hex('#4f4a43')); K.add(P_CONE(4), x + 1, 32, o.y - 2, 2.2, 6, 2.2, hex('#7a756c')); }
    } else if (o.camp === 'flag') {
      K.add(P_CYL(6), o.x, 0, o.y, 2.4, 74, 2.4, hex('#3a3631'));
    }
  }
}
// a ridge tent: canvas over a pole, the door a dark triangle, guy ropes out to pegs at each end
function tentKit(K, o, col) {
  const ca = Math.cos(o.a), sa = Math.sin(o.a), at = (f, s2 = 0) => [o.x + ca * f - sa * s2, o.y + sa * f + ca * s2], H = 18.75;
  K.mt = 'cloth'; K.add(P_TENT(), o.x, 0, o.y, 34, 25, 26, col, -o.a);
  { const [fx, fy] = at(17.1); K.mt = 'plain'; K.add(P_TENT(), fx, 0, fy, 0.5, 18, 15, hex('#16140f'), -o.a); }
  K.mt = 'wood'; { const [ax, ay] = at(-20), [bx, by] = at(20); K.rod(P_CYL(6), ax, H + 0.4, ay, bx, H + 0.4, by, 0.85, hex('#6a5034')); }
  for (const f of [-17.6, 17.6]) { const [px, py] = at(f); K.add(P_CYL(6), px, 0, py, 1.5, H, 1.5, hex('#6a5034')); const [gx, gy] = at(f * 1.75); K.mt = 'cloth'; K.rod(P_CYL(4), px + ca * Math.sign(f) * 2, H, py + sa * Math.sign(f) * 2, gx, 0.5, gy, 0.22, hex('#c8b890')); K.mt = 'wood'; K.add(P_CONE(4), gx, -0.5, gy, 1.4, 3.4, 1.4, hex('#6a5034')); }
  for (const f of [-10, 0, 10]) for (const sd of [-1, 1]) { const [px, py] = at(f, sd * 13.6); K.add(P_CONE(4), px, -0.5, py, 1.2, 2.6, 1.2, hex('#6a5034')); }
  K.mt = null;
}
// a log: bark round it, the pale cut wood showing at each end
function logRod(K, ax, ay, az, bx, by, bz, r, col, cut = hex('#b89a74')) {
  K.mt = 'bark'; K.rod(P_CYL(9), ax, ay, az, bx, by, bz, r, col); K.mt = 'wood';
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz), e = 0.35 / L;
  K.rod(P_CYL(9), ax - dx * e, ay - dy * e, az - dz * e, ax + dx * e, ay + dy * e, az + dz * e, r * 0.86, cut);
  K.rod(P_CYL(9), bx - dx * e, by - dy * e, bz - dz * e, bx + dx * e, by + dy * e, bz + dz * e, r * 0.86, cut);
  K.mt = null;
}
// ---------------- the yard: your storage box by the tent, the water barrel across the fire from it, the woodpile ----------------
// The main game keeps these four stores in one huddle; here the box and the barrel each get their own place so you can
// tell them apart at a glance, and they're built solid rather than painted.
YARD_DAY[0] = YARD_DAY[1] = { x: -52, y: -50 };   // the box (the two crates share its place)
YARD_DAY[2] = YARD_DAY[3] = { x: 60, y: 56 };     // the water barrel (and its twin)
// a strongbox: planked sides, iron at the corners, a rounded lid strapped twice, a lock on the front (facing a); open 0..1 tips the lid back
function chestKit(K, bx, by, a, sc = 1, open = 0) {
  const ca = Math.cos(a), sa = Math.sin(a);
  const put = (geo, lx, h, lz, sx, sy, sz, col, mt, pitch = 0, roll = 0) => { K.mt = mt; K.add(geo, bx + (ca * lx - sa * lz) * sc, h * sc, by + (sa * lx + ca * lz) * sc, sx * sc, sy * sc, sz * sc, col, -a, pitch, roll); };
  const planks = ['#7a5a3c', '#6e5034', '#83613f'];
  for (let i = 0; i < 3; i++) put(P_BOX(), 0, 2.6 + i * 4.75, 0, 20, 4.5, 30, hex(planks[i]), 'wood');
  for (const [lx, lz] of [[-9, -14], [9, -14], [9, 14], [-9, 14]]) { put(P_BOX(), lx, 0.4, lz, 3, 1.2, 3, hex('#3a2c20'), 'wood'); put(P_BOX(), lx * 1.04, 7.6, lz * 1.02, 2.2, 15, 2.2, hex('#5a5e62'), 'metal'); }
  if (open > 0) {   // tipped back on its hinge: the inside dark, the lid's underside showing
    put(P_BOX(), 0, 14.1, 0, 18, 0.4, 28, hex('#1e1712'), 'plain');
    const t = open * 1.9, hx = -10, hh = 14.4, cx = hx + Math.cos(t) * 10, ch = hh + Math.sin(t) * 10;
    put(P_BOX(), cx, ch, 0, 20, 2.4, 30, hex('#6a4c30'), 'wood', 0, t);
  } else {
    put(P_CYL(14), 0, 14.6, -15, 20, 30, 8, hex('#6a4c30'), 'wood', Math.PI / 2);
    for (const lz of [-9, 9]) put(P_CYL(14), 0, 14.6, lz - 0.8, 20.8, 1.6, 8.8, hex('#4e5256'), 'metal', Math.PI / 2);
    put(P_BOX(), 10.3, 13, 0, 1, 5, 4.4, hex('#8a8e92'), 'metal'); put(P_BOX(), 10.9, 11.2, 0, 0.8, 1.6, 1.4, hex('#2a2a2a'), 'metal');
  }
  for (const lz of [-15.4, 15.4]) put(P_BOX(), 0, 9.5, lz, 6, 1.2, 1, hex('#8a7550'), 'cloth');   // rope handles
  K.mt = null;
}
function yardKit(K) {
  chestKit(K, CAMP_BOX.x, CAMP_BOX.y, Math.atan2(-CAMP_BOX.y, -CAMP_BOX.x), 1, 0);
  { // the water barrel: staves held by three iron hoops, standing on a flat stone, brimming; a dipper hung on the rim
    const wx = CAMP_BARREL.x, wy = CAMP_BARREL.y, R = 9.4;
    K.mt = 'stone'; K.add(P_CYL(12), wx, 0, wy, 26, 1.6, 24, hex('#7c7a74'), 0.4); K.mt = null;
    K.add(P_CYL(16), wx + 4, 0.05, wy + 3, 40, 0.1, 34, hex('#3f3a33'));   // the ground dark where it's spilled
    for (let i = 0; i < 16; i++) {
      const t = i / 16 * 6.283, col = hex(['#6f5236', '#7a5b3c', '#664a30', '#80603f'][i % 4]);
      K.mt = 'wood'; K.add(P_BOX(), wx + Math.cos(t) * R, 12.6, wy + Math.sin(t) * R, 1.6, 23, 3.9, col, -t);
    }
    K.mt = 'metal'; for (const h of [3.2, 12.2, 21]) K.add(P_CYL(18), wx, h, wy, R * 2 + 2, 1.7, R * 2 + 2, hex('#4c5054'));
    K.mt = 'wood'; K.add(P_CYL(16), wx, 1.4, wy, R * 2 - 1, 1, R * 2 - 1, hex('#5a4230'));
    K.mt = 'water'; K.add(P_CYL(18), wx, 22.4, wy, R * 2 - 1.6, 0.4, R * 2 - 1.6, hex('#3a6c94'), 0, 0, 0, 0.12);
    K.mt = 'wood'; K.rod(P_CYL(6), wx + 5, 22.8, wy - 1, wx + 11, 30, wy - 3, 0.45, hex('#8a6a46'));
    K.add(P_CYL(10), wx + 4.2, 21, wy - 0.8, 3.4, 2.6, 3.4, hex('#7a5a3a')); K.mt = null;
  }
  { // the woodpile: split logs stacked between two stakes
    const w = CAMP.find(q => q.camp === 'wood'); if (w) {
      const a = Math.atan2(-w.y, -w.x) + Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
      const rows = [4, 3, 2];
      rows.forEach((n, row) => { for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * 6.6, h = 3.2 + row * 5.6, j = hash(row * 7 + i, 5) * 3 - 1.5;
        logRod(K, w.x + vx * off - ux * (13 + j), h, w.y + vy * off - uy * (13 + j), w.x + vx * off + ux * (13 - j), h, w.y + vy * off + uy * (13 - j), 3.1, hex(['#5a4634', '#4e3c2c', '#62503c'][(row + i) % 3])); } });
      for (const s of [-15.5, 15.5]) { K.mt = 'bark'; K.add(P_CYL(6), w.x + vx * s, 0, w.y + vy * s, 2.2, 20, 2.2, hex('#4a3a2a')); K.mt = null; }
    }
  }
}
// the camp's flag stirs: a cloth that ripples, rebuilt each frame (a dozen triangles)
const flagGeo = new THREE.BufferGeometry(); flagGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(7 * 2 * 3), 3));
{ const idx = []; for (let i = 0; i < 6; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } flagGeo.setIndex(idx); }
const flagMat = new THREE.ShaderMaterial({ uniforms: Object.assign({ col: { value: new V3(...hex('#625d55')) } }, LU), side: THREE.DoubleSide,
  vertexShader: TERR_GLSL + `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); w.y += terrH(w.xz); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `uniform vec3 col; varying vec3 vW; void main() { gl_FragColor = vec4(fogged(grey(col * lightAt(vW, vec3(0.0), 0.0)), vW), 1.0); }` });
const flagMesh = new THREE.Mesh(flagGeo, flagMat); flagMesh.frustumCulled = false; scene.add(flagMesh);
function flagStep(t) {
  const f = CAMP.find(o => o.camp === 'flag'); if (!f) return; const a = flagGeo.attributes.position;
  for (let m = 0; m <= 6; m++) { const u = m / 6, w = Math.sin(t * 2.4 - u * 4) * 2.5 * u; a.setXYZ(m * 2, f.x + 1.2 + 26 * u, 72, f.y + w); a.setXYZ(m * 2 + 1, f.x + 1.2 + 26 * u - (m === 6 ? 4 : 0), 58, f.y + w); }
  a.needsUpdate = true;
}


// ---------------- ponds: still water filling the hollows (08-ponds), with reeds round the shallows and lily pads ----------------
// The water is a flat sheet at the pond's level; the ground decides the shore (where it rises above the water). Clear and
// brown-green in the shallows, so you see the muddy bottom, dark peaty green-black in the deep; little ripples, the sky in it
// at a low angle, the sun glinting, and now and then rings spreading where something rose.
const pondMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ lt: { value: 1 }, sky: { value: SKY.hor }, skyTop: { value: SKY.top } }, LU), transparent: true, depthWrite: true,
  vertexShader: `attribute vec3 pdat; varying vec3 vW; varying vec3 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vP = pdat; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: TERR_GLSL + LIGHT_GLSL + `uniform float lt, time; uniform vec3 sky, skyTop; varying vec3 vW; varying vec3 vP;
    float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0)), f.x), f.y); }
    void main() {
      if (vP.z < 0.5) discard;                                                   // past the rim of the hollow
      float depth = vW.y - terrH(vW.xz); if (depth < 0.0) discard;
      vec3 shal = vec3(0.3, 0.34, 0.2), mid = vec3(0.1, 0.2, 0.16), deep = vec3(0.03, 0.08, 0.08);
      vec3 c = mix(shal, mid, smoothstep(0.1, 1.6, depth)); c = mix(c, deep, smoothstep(1.2, 4.0, depth));
      float t = time;
      vec2 q = vW.xz * 0.16; float e = 0.5;   // fine ripples, drifting with the breeze
      float r0 = n2(q + t * vec2(0.12, 0.07)) + 0.5 * n2(q * 2.7 - t * vec2(0.09, 0.15));
      float rx = n2(q + vec2(e, 0.0) + t * vec2(0.12, 0.07)) + 0.5 * n2((q + vec2(e, 0.0)) * 2.7 - t * vec2(0.09, 0.15));
      float rz = n2(q + vec2(0.0, e) + t * vec2(0.12, 0.07)) + 0.5 * n2((q + vec2(0.0, e)) * 2.7 - t * vec2(0.09, 0.15));
      vec3 N = normalize(vec3((r0 - rx) * 0.35, 1.0, (r0 - rz) * 0.35));
      // rings where a fish rose or a drop fell: a few at a time, each spreading and fading
      for (int k = 0; k < 4; k++) {
        float cyc = t * 0.22 + float(k) * 0.25 + vP.y * 0.1, id = floor(cyc), f = fract(cyc);
        vec2 o = vP.xy + (vec2(h2(vec2(id, float(k) + vP.y)), h2(vec2(float(k) - vP.y, id))) - 0.5) * 70.0;
        float d = distance(vW.xz, o), rr = f * 22.0, ring = exp(-pow((d - rr) * 0.9, 2.0)) * (1.0 - f) * step(0.0, rr);
        N.xz += normalize(vW.xz - o + 0.001) * ring * 0.35;
      }
      N = normalize(N);
      vec3 V = normalize(camPos - vW);
      float fres = pow(1.0 - max(dot(V, N), 0.0), 3.0);
      c = mix(c, mix(sky, skyTop, 0.5) * 0.8, clamp(0.04 + fres * 0.8, 0.0, 0.7) * (0.35 + 0.65 * lt));   // the sky in it
      float sp = pow(max(dot(reflect(-V, N), sunDir), 0.0), 180.0);
      c += vec3(1.0, 0.95, 0.82) * sp * 1.8 * sunK;                             // sun glints
      float edge = 1.0 - smoothstep(0.0, 0.35, depth);                          // a pale line where it laps the mud
      c = mix(c, vec3(0.5, 0.52, 0.44), edge * 0.25 * smoothstep(0.3, 0.7, n2(vW.xz * 0.3 + t * 0.2)));
      float a = mix(0.7, 1.0, smoothstep(0.0, 2.0, depth)) * smoothstep(0.0, 0.1, depth);
      vec3 lit = c * mix(vec3(1.0), lightAt(vW, vec3(0.0, 1.0, 0.0), 0.0), 0.7);
      gl_FragColor = vec4(fogged(grey(lit), vW), a);
    }`,
});
const pondMesh = new THREE.Mesh(new THREE.BufferGeometry(), pondMat); pondMesh.frustumCulled = false; pondMesh.renderOrder = 1; scene.add(pondMesh);
const pondK = new KitMesh(false);   // no ink outline: it would swallow a reed
const P_PAD = () => prim('pad', () => { const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 14, 1, false, 0.45, 6.2832 - 0.45); g.translate(0, 0.5, 0); return g; });   // a lily pad: a disc with its notch
let pondKey = '';
const pondPart = new Map();   // (pondsSync) each pond's pieces, by where it lies
function pondKit(K, P) {
  const R = (a, b) => hash(P.x * 0.31 + a * 7.7, P.y * 0.27 + b * 3.3);
  // reeds: clumps standing in the shallows round the shore, thicker on some sides than others; slim tapering stems that
  // splay out from the root, a few bulrush heads, and flat blades bent over
  const reedC = [hex('#a8c868'), hex('#b8d070'), hex('#98b85a'), hex('#c4d47e')], head = hex('#8a5a34'), blade = hex('#b0c868');
  const n = Math.round(P.rad * 0.6);
  for (let k = 0; k < n; k++) {
    const a = (k + R(k, 1) * 0.8) / n * 6.2832, side = 0.5 + 0.5 * Math.sin(a * 2 + P.seed);
    if (R(k, 2) > 0.2 + 0.65 * side) continue;
    const reach = pondReach(P, P.x + Math.cos(a), P.y + Math.sin(a)), d = reach * (0.8 + R(k, 3) * 0.22);
    const cx = P.x + Math.cos(a) * d, cy = P.y + Math.sin(a) * d, m = 7 + (R(k, 4) * 7 | 0);
    for (let j = 0; j < m; j++) {
      const b = R(k, j + 10) * 6.2832, rr = Math.sqrt(R(j, k + 20)) * 4, x = cx + Math.cos(b) * rr, y = cy + Math.sin(b) * rr;
      const h = 9 + R(k + j, 30) * 10, sp = 0.12 + rr * 0.05, lx = Math.cos(b) * h * sp + (R(j, k + 40) - 0.5) * 1.5, ly = Math.sin(b) * h * sp + (R(j + 5, k + 41) - 0.5) * 1.5;
      const yb = Math.min(0, P.lvl - terrH(x, y)) - 0.5;   // from the bottom, up through the water
      K.mt = 'plant';
      if (R(j, k + 45) < 0.3) {   // a blade: two pieces, bent over at the knee
        const kx = x + lx * 0.5, ky = y + ly * 0.5, kh = h * 0.62;
        K.rod(P_BOX(), x, yb, y, kx, kh, ky, 0.28, blade, 0.22); K.rod(P_CONE(4), kx, kh, ky, kx + lx * 0.9, kh + h * 0.12, ky + ly * 0.9, 0.28, blade, 0.22);
      } else {
        K.rod(P_CONE(5), x, yb, y, x + lx, h, y + ly, 0.3, reedC[(k + j) % 4], 0.22);   // lifted a little: so thin, the shade would turn them black
        if (R(j, k + 50) < 0.22) K.rod(P_CYL(6), x + lx * 0.7, h * 0.7, y + ly * 0.7, x + lx * 0.82, h * 0.82, y + ly * 0.82, 0.55, head);   // a bulrush head
      }
      K.mt = null;
    }
  }
  // lily pads: drifts of them out on the water, some in flower
  const padC = [hex('#4f7a34'), hex('#5e8a3c'), hex('#466c2e')], flC = [hex('#f2eee6'), hex('#f0b8c8')];
  const groups = 2 + (R(0, 60) * 3 | 0);
  for (let g = 0; g < groups; g++) {
    const a = R(g, 61) * 6.2832, d = pondReach(P, P.x + Math.cos(a), P.y + Math.sin(a)) * (0.25 + R(g, 62) * 0.45);
    const gx = P.x + Math.cos(a) * d, gy = P.y + Math.sin(a) * d;
    for (let j = 0; j < 9; j++) {
      const b = R(g, j + 70) * 6.2832, rr = R(j, g + 80) * 16, x = gx + Math.cos(b) * rr, y = gy + Math.sin(b) * rr;
      if (!pondIn(P, x, y, -6) || P.lvl - terrH(x, y) < 0.3) continue;
      const s = 3.2 + R(j, g + 90) * 2.6, yy = P.lvl - terrH(x, y) + 0.06;
      K.mt = 'plant'; K.add(P_PAD(), x, yy, y, s, 0.12, s, padC[j % 3], R(j, g + 95) * 6.2832); K.mt = null;
      if (R(j, g + 99) < 0.22) {   // a flower: a ring of petals round a yellow heart
        const f = flC[R(g, j + 101) < 0.6 ? 0 : 1];
        for (let p = 0; p < 6; p++) { const t = p / 6 * 6.2832; K.add(P_BALL(), x + Math.cos(t) * 0.7, yy + 0.35, y + Math.sin(t) * 0.7, 1.0, 0.45, 0.6, f, -t); }
        K.add(P_BALL(), x, yy + 0.55, y, 0.6, 0.45, 0.6, hex('#e8c040'));
      }
    }
  }
}
function pondsSync(px, py) {
  const L = lakesNear(px, py, drawR() + 100), key = L.map(P => P.x | 0).join();
  if (key === pondKey) return L; pondKey = key;
  // each pond's water and reeds are built the first time it comes near and kept, so walking on past ponds only puts the
  // pieces together again (rebuilding every pond in reach each time the set changed was a hitch you could feel)
  const N = 26, K = new Kit(), parts = [];
  for (const P of L) {
    const id = (P.x | 0) + ',' + (P.y | 0); let q = pondPart.get(id);
    if (!q) {
      const pos = [], dat = [];   // a sheet at the water's level over the hollow, marked where the pond reaches
      const R = P.rmax * 1.12 + 8, st = 2 * R / N, v = (i, j) => { const x = P.x - R + i * st, y = P.y - R + j * st; pos.push(x, P.lvl, y); dat.push(P.x, P.seed, pondIn(P, x, y, 10) ? 1 : 0); };
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { v(i, j); v(i + 1, j + 1); v(i + 1, j); v(i, j); v(i, j + 1); v(i + 1, j + 1); }
      const T = new Kit(); pondKit(T, P);
      q = { pos: new Float32Array(pos), dat: new Float32Array(dat), kit: T.take() };
      if (pondPart.size > 80) pondPart.clear(); pondPart.set(id, q);
    }
    parts.push(q); K.chunk(q.kit);
  }
  const cat = f => { const A = new Float32Array(parts.reduce((n, q) => n + q[f].length, 0)); let o = 0; for (const q of parts) { A.set(q[f], o); o += q[f].length; } return A; };
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(cat('pos'), 3)); g.setAttribute('pdat', new THREE.BufferAttribute(cat('dat'), 3));
  pondMesh.geometry.dispose(); pondMesh.geometry = g; pondK.set(K);
  return L;
}

// ---------------- shadows: a soft dark pool under everything that stands, strongest in full sun ----------------
const MAXSH = 3000;
const shGeo = new THREE.InstancedBufferGeometry();
shGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1], 3)); shGeo.setIndex([0, 2, 1, 0, 3, 2]);
const shDat = new Float32Array(MAXSH * 4); { const b = new THREE.InstancedBufferAttribute(shDat, 4); b.setUsage(THREE.DynamicDrawUsage); shGeo.setAttribute('sd', b); }
shGeo.instanceCount = 0;
const shMat = new THREE.ShaderMaterial({ uniforms: Object.assign({ k: { value: 0.3 }, lean: { value: new THREE.Vector2(0.3, 0.3) } }, LU), transparent: true, depthWrite: false,
  vertexShader: TERR_GLSL + `attribute vec4 sd; uniform vec2 lean; uniform vec4 shC; varying vec2 vQ; varying vec3 vW; varying float vK; void main() { vQ = position.xz; float near = sd.w < 0.0 ? shC.w * smoothstep(shC.z * 0.92, shC.z * 0.72, distance(sd.xy, shC.xy)) : 0.0, r = sd.z * mix(1.0, 0.5, near), len = abs(sd.w) * (1.0 - near); vK = 1.0 - 0.45 * near; vec3 w = vec3(sd.x + position.x * r + lean.x * len * (position.z * 0.5 + 0.5), 0.0, sd.y + position.z * r * 0.75 + lean.y * len * (position.z * 0.5 + 0.5)); w.y = terrH(w.xz) + 0.25; vW = w; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
  fragmentShader: LIGHT_GLSL + `uniform float k; varying vec2 vQ; varying vec3 vW; varying float vK; void main() { float r = dot(vQ, vQ); float dap = sin(vW.x * 0.21 + sin(vW.z * 0.13) * 2.0) * sin(vW.z * 0.19 + sin(vW.x * 0.11) * 2.0); float a = k * vK * (0.85 + 0.3 * dap) * (1.0 - smoothstep(0.35, 1.0, r)) * (1.0 - smoothstep(fogR.x, fogR.y, distance(vW.xz, fogC.xz))); if (a < 0.004) discard; gl_FragColor = vec4(0.0, 0.0, 0.0, a); }` });
const shMesh = new THREE.Mesh(shGeo, shMat); shMesh.frustumCulled = false; shMesh.renderOrder = 2; scene.add(shMesh);
let shN = 0, shBase = 0;
function shadow(x, y, r, len = 0) { if (shN >= MAXSH) return; const i = shN++ * 4; shDat[i] = x; shDat[i + 1] = y; shDat[i + 2] = r; shDat[i + 3] = len; }
function shadowsEnd() { shGeo.instanceCount = shN; const a = shGeo.attributes.sd; a.needsUpdate = true; if (a.clearUpdateRanges) { a.clearUpdateRanges(); a.addUpdateRange(0, shN * 4); } else { a.updateRange.offset = 0; a.updateRange.count = shN * 4; } }

// ---------------- keeping the woods filled in round you ----------------
// The trees, rocks and posts are the game's own (propsNear: the same trees in the same places, the ones you chop and mine);
// the ground cover is the game's decor; the sticks, stones, grass, bushes and mushrooms you gather are Daylight's nodes.
const WORLD = { x: 1e9, y: 1e9, gen: -1, props: [], nodes: [], lakes: [] };
let worldDirty = true;
const kindOfTree = o => o.type === 'pine' || o.type === 'oak' || o.type === 'cherry' ? o.type : 'dead';
let staticK = null;
// (the fallen logs on the forest floor are models now, laid down with the rest of the small things: 14-props)
const K_BR = (K, ax, ay, az, bx, by, bz, r) => { K.mt = 'bark'; K.rod(P_CYL(6), ax, ay, az, bx, by, bz, r, hex('#4a3c30')); K.mt = null; };   // the palisade, the yard and the raiders' camps never move: built once
function worldSync(force) {
  const p = S.p, D = S.day;
  if (!staticK) { const K = new Kit(); campKit(K); staticK = new KitMesh(); staticK.set(K); }
  const gen = D.felled.size * 7 + D.nodes.size * 3 + (D.bchunks ? D.bchunks.size : 0);
  if (!force && !worldDirty && Math.hypot(p.x - WORLD.x, p.y - WORLD.y) < 70 && gen === WORLD.gen && drawR() === WORLD.vr) return;
  WORLD.x = p.x; WORLD.y = p.y; WORLD.gen = gen; WORLD.vr = drawR(); worldDirty = false;
  // trees, rocks, posts
  tallB.begin(); treesBegin(); propsW.begin(); shN = 0;
  const props = propsNear(p.x, p.y, drawR() + 60); WORLD.props = props;
  const far2 = (drawR() + 60) ** 2;   // propsNear gives a square: its corners are past the haze, so they're left undrawn
  for (const o of props) {
    if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 > far2) continue;
    if (o.kind === 'tree') {
      const kind = kindOfTree(o), M = ATLAS.meta[kind], v = (o.seed * 997 | 0) % M.length, m = (o.seed * 7919 % 1) < 0.5 ? 1 : -1;
      if (!treeAdd(o, kind, Math.hypot(o.x - p.x, o.y - p.y))) tallB.add(kind, v, o.x, o.y, o.s * TREE_K, m, kind === 'dead' ? 0.4 : 1, o.shakeT ?? -99, o.seed);
      shadow(o.x, o.y, (kind === 'pine' ? 15 : kind === 'dead' ? 10 : 20) * o.s * 1.2, -(kind === 'pine' ? 90 : 70) * o.s);
    } else if (o.kind === 'rock') {
      propsW.add(Math.hypot(o.x, o.y) > IRON_FROM ? 'rockIron' : 'rock', (hash(o.x * 0.37, o.y * 0.91) * 50 | 0), o.x, o.y, o.s * ROCK_K, hash(o.y * 0.7, o.x * 0.3));   // out where iron is found, the rocks show their ore
      shadow(o.x, o.y, 15 * o.s, 10 * o.s);
    } else if (o.kind === 'post') { propsW.add('post', (hash(o.x * 0.53, o.y * 0.29) * 50 | 0), o.x, o.y, 1.4, hash(o.x, o.y)); shadow(o.x, o.y, 5, 18); }
  }
  // the camp's storage box, water barrel and woodpile are solid (yardKit); they only need their shadows here
  if (!NO_CAMP) for (const o of [CAMP_BOX, CAMP_BARREL, CAMP.find(q => q.camp === 'wood')]) if (o) shadow(o.x, o.y, 14, -10);
  tallB.end(); treesEnd(); shBase = shN;
  // ground cover
  // plants are single pictures turned to face you; flowers sit low and small among the turf, bushes a little smaller than the main game's
  coverB.begin(); plantB.begin(); bushB.begin();
  for (const d of decorNear(p.x, p.y, 430)) {
    if ((d.x - p.x) ** 2 + (d.y - p.y) ** 2 > 450 * 450) continue;   // round you, not the square decorNear gives (its corners are past where plants fade)
    const k = d.dk === 'log' ? 'log' : d.dk;
    if (!ATLAS.meta[k] && !PROP_KIND[k]) continue;   // (a sapling has only its model, no picture)
    if (k === 'log') {   // a fallen log lies flat on the ground as a solid log, with a broken branch or two
      propsW.add('log', d.seed * 31 | 0, d.x, d.y, d.s, d.seed);   // one of a few logs modelled once, laid down many times (14-props)
      shadow(d.x, d.y, 38 * d.s * 0.45, 0);
      continue;
    }
    const fl = k.startsWith('flower'), plant = fl || k === 'grass' || k === 'fern' || k === 'bush';
    if (propsW.add(k, d.v, d.x, d.y, d.s * (k === 'bush' ? 1.1 : fl ? 0.72 : 1.15), d.seed)) continue;   // solid now (14-props); the pictures stay only for anything without a model
    (k === 'bush' ? bushB : plant ? plantB : coverB).add(k, d.v, d.x, d.y, d.s * (k === 'log' ? 1.3 : k === 'bush' ? 1.1 : fl ? 0.72 : 1.15), (d.seed * 7919 % 1) < 0.5 ? 1 : -1, k === 'grass' || k === 'fern' || fl ? 1.2 : k === 'bush' ? 0.6 : 0, -99, d.seed);
  }
  coverB.end(); plantB.end(); bushB.end(); propsW.end(); shBase = shN;   // the logs cast shadows too
  WORLD.lakes = pondsSync(p.x, p.y); terrLevelSync(p.x, p.y, WORLD.lakes);
}
