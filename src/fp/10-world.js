// ================= the woods: the main game's own trees, rocks, ground cover and ponds, stood up around you =================

// ---------------- billboards: every painted sprite, stood upright and facing you, swaying at the top ----------------
// One instanced draw per board. Boards are refilled from the game's world as you walk (only when you've moved far enough).
class Board {
  // cross: instead of one card turned to face you, three cards crossed through each other (a plant seen from any side has body)
  constructor(cap, cull, near, cover, tex = atlasTex, atlas = ATLAS, cross = false) {
    this.cap = cap; this.atlas = atlas;
    const g = new THREE.InstancedBufferGeometry();
    const nq = cross ? 3 : 1, pos = [], idx = [];
    for (let q = 0; q < nq; q++) { pos.push(0, 0, q, 1, 0, q, 1, 1, q, 0, 1, q); idx.push(q * 4, q * 4 + 2, q * 4 + 1, q * 4, q * 4 + 3, q * 4 + 2); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    this.P = new Float32Array(cap * 4); this.R = new Float32Array(cap * 4); this.D = new Float32Array(cap * 4); this.X = new Float32Array(cap * 4);
    for (const [k, a] of [['iPos', this.P], ['iRect', this.R], ['iDim', this.D], ['iMisc', this.X]]) { const b = new THREE.InstancedBufferAttribute(a, 4); b.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, b); }
    g.instanceCount = 0; this.g = g;
    const m = new THREE.ShaderMaterial({
      uniforms: Object.assign({ map: { value: tex }, cull: { value: cull }, near: { value: near }, now: { value: 0 } }, LU),
      defines: Object.assign(AA ? { A2C: 1 } : {}, cross ? { CROSS: 1 } : {}), alphaToCoverage: AA, side: THREE.DoubleSide,   // a flipped sprite turns its back; draw both faces
      vertexShader: `attribute vec4 iPos, iRect, iDim, iMisc; uniform vec3 camPos, camRight; uniform float time, cull, near, now;
        varying vec2 vUv; varying vec3 vW; varying vec3 vNear; varying vec2 vSh;
        void main() {
          float d = distance(iPos.xz, camPos.xz);
          vec3 R = camRight; float edge = 1.0, card = 1.0;
          #ifdef CROSS
            float a = iMisc.w * 6.2832 + position.z * 1.0472; R = vec3(cos(a), 0.0, sin(a));
            vec3 tv = normalize(vec3(camPos.x - iPos.x, 0.0, camPos.z - iPos.z) + vec3(1e-4));
            edge = smoothstep(0.08, 0.4, abs(dot(vec3(-R.z, 0.0, R.x), tv)));   // a card seen edge-on thins away instead of showing as a sliver
            card = 0.84 + 0.16 * position.z * 0.5;                                    // the three cards a shade apart, so they read as layers
          #endif
          if (d > cull) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          float s = iPos.w;
          float lx = (position.x * iDim.x - iDim.z) * s * iMisc.x;
          float ly = (iDim.w - (1.0 - position.y) * iDim.y) * s;
          float up = max(ly, 0.0) / (iDim.w * s + 0.001);
          float sw = sin(time * 0.7 + iMisc.w * 20.0) * 1.6 + sin(time * 1.9 + iMisc.w * 7.0) * 0.5;
          float st = now - iMisc.z; float shake = st >= 0.0 && st < 0.45 ? sin(st * 48.0) * (1.0 - st / 0.45) * 5.0 : 0.0;   // struck: it shudders
          sw = (sw * iMisc.y + shake) * up * up;
          vec3 w = vec3(iPos.x, iPos.y, iPos.z) + R * lx + camRight * sw * s + vec3(0.0, ly, 0.0);
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
    this.m = m; this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; scene.add(this.mesh); this.n = 0;
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
const tallB = new Board(2600, VIEW, 30, false), coverB = new Board(6000, 420, 0, true), plantB = new Board(6000, 420, 0, true, atlasTex, ATLAS, true), nearB = new Board(900, 300, 0, true);

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
  return c * mix(0.58, 1.0, smoothstep(0.0, 9.0, W.y));   // seated: darker where it meets the ground
}`;
const kitMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ glow: { value: 0 } }, LU),
  vertexShader: `attribute vec3 color, gu; attribute float em, mt; varying vec3 vC, vW, vN, vG; varying float vE, vM;
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; vE = em; vG = gu; vM = mt; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + PAINT_GLSL + `varying vec3 vC, vW, vN, vG; varying float vE, vM;
    void main() { vec3 N = normalize(vN); vec3 base = paint(vC, vM, vG, vW, N); vec3 c = base * lightAt(vW, N, 1.0) * 1.05 + vC * vE; gl_FragColor = vec4(fogged(grey(c), vW), 1.0); }`,
});
const kitEdge = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU), side: THREE.BackSide,
  vertexShader: `attribute float ew; varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position + normal * ew, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
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
class Kit {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.em = []; this.ew = []; this.gu = []; this.mts = []; this.mt = null; }
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
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); g.setAttribute('em', new THREE.Float32BufferAttribute(this.em, 1)); g.setAttribute('ew', new THREE.Float32BufferAttribute(this.ew, 1));
    g.setAttribute('gu', new THREE.Float32BufferAttribute(this.gu, 3)); g.setAttribute('mt', new THREE.Float32BufferAttribute(this.mts, 1));
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
  yardKit(K);
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
  vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `uniform vec3 col; varying vec3 vW; void main() { gl_FragColor = vec4(fogged(grey(col * lightAt(vW, vec3(0.0), 0.0)), vW), 1.0); }` });
const flagMesh = new THREE.Mesh(flagGeo, flagMat); flagMesh.frustumCulled = false; scene.add(flagMesh);
function flagStep(t) {
  const f = CAMP.find(o => o.camp === 'flag'); if (!f) return; const a = flagGeo.attributes.position;
  for (let m = 0; m <= 6; m++) { const u = m / 6, w = Math.sin(t * 2.4 - u * 4) * 2.5 * u; a.setXYZ(m * 2, f.x + 1.2 + 26 * u, 72, f.y + w); a.setXYZ(m * 2 + 1, f.x + 1.2 + 26 * u - (m === 6 ? 4 : 0), 58, f.y + w); }
  a.needsUpdate = true;
}

// ---------------- the raider camps: stakes and skulls round a fire, two tents, a rack, the relic on its stand ----------------
function raiderKit(K) {
  for (const C of dayCampList()) for (const o of C.parts) {
    if (o.sub === 'tent') tentKit(K, o, hex('#7a6a56'));
    else if (o.sub === 'stake') { K.add(P_CYL(6), o.x, 0, o.y, 3.6, 30, 3.6, logTone3(o.seed * 9 | 0)); K.add(P_CONE(6), o.x, 30, o.y, 3.6, 6, 3.6, logTone3(o.seed * 9 | 0)); if (o.skull) K.add(P_BALL(), o.x, 30, o.y, 5, 5.5, 5.5, hex('#d8d0bc')); }
    else if (o.sub === 'dirt') K.add(P_CYL(10), o.x, -0.6, o.y, 22 + o.seed * 8, 1, 14 + o.seed * 6, hex('#3e3428'), o.seed * 6);
    else if (o.sub === 'bones') { for (let k = 0; k < 3; k++) { const a = o.seed * 9 + k * 2.1; K.rod(P_CYL(4), o.x + Math.cos(a) * 3, 0.8, o.y + Math.sin(a) * 3, o.x + Math.cos(a) * 3 + Math.cos(a + 1.3) * 9, 0.8, o.y + Math.sin(a) * 3 + Math.sin(a + 1.3) * 9, 0.8, hex('#e6dfcc')); } }
    else if (o.sub === 'fire') { for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; K.add(P_ROCK(k % 4), o.x + Math.cos(a) * 11, 1.4, o.y + Math.sin(a) * 11, 7, 5, 7, hex(k % 2 ? '#7a7872' : '#8d8b85'), a); } K.rod(P_CYL(5), o.x - 6, 2, o.y - 3, o.x + 6, 2, o.y + 3, 1.6, hex('#5a3e28')); K.rod(P_CYL(5), o.x - 5, 2, o.y + 4, o.x + 5, 2, o.y - 4, 1.6, hex('#4a3420')); }
    else if (o.sub === 'wrack') { K.add(P_CYL(5), o.x - 9, 0, o.y, 2, 22, 2, hex('#4a3a2a')); K.add(P_CYL(5), o.x + 9, 0, o.y, 2, 22, 2, hex('#4a3a2a')); K.rod(P_CYL(5), o.x - 10, 18, o.y, o.x + 10, 18, o.y, 1, hex('#4a3a2a')); }
  }
}

// ---------------- ponds: still water with a muddy bank and reeds; ripples cross it ----------------
const pondMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ lt: { value: 1 }, now: { value: 0 }, sky: { value: SKY.hor } }, LU), transparent: false,
  vertexShader: `attribute vec4 pdat; varying vec3 vW; varying vec4 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vP = pdat; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `uniform float lt, now; uniform vec3 sky; varying vec3 vW; varying vec4 vP;
    void main() {
      vec2 d = vW.xz - vP.xy; float a = atan(d.y, d.x), r = length(d) / (vP.z * (1.0 + sin(a * 3.0 + vP.w) * 0.08 + sin(a * 5.0 - vP.w) * 0.04));
      if (r > 1.06) discard;
      vec3 bank = vec3(0.29, 0.267, 0.212), deep = mix(vec3(0.106, 0.165, 0.2), vec3(0.184, 0.29, 0.322), lt);
      vec3 c = r > 1.0 ? bank : deep + vec3(0.59, 0.78, 0.84) * (0.1 + 0.12 * lt) * smoothstep(0.78, 0.7, r);
      if (r <= 1.0) {
        vec3 V = normalize(camPos - vW); float fres = pow(1.0 - max(V.y, 0.0), 3.0);
        c = mix(c, sky * 0.9, fres * 0.55 * lt);
        for (int k = 0; k < 3; k++) { float t = fract(now * 0.25 + float(k) / 3.0 + vP.w); float rr = 0.25 + t * 0.7; c += vec3(0.75, 0.88, 0.92) * (0.25 + 0.3 * lt) * (1.0 - t) * 0.5 * smoothstep(0.025, 0.0, abs(r - rr)); }
      }
      gl_FragColor = vec4(fogged(grey(c * (r > 1.0 ? lightAt(vW, vec3(0.0, 1.0, 0.0), 0.0) : mix(vec3(1.0), lightAt(vW, vec3(0.0, 1.0, 0.0), 0.0), 0.6))), vW), 1.0);
    }`,
});
const pondMesh = new THREE.Mesh(new THREE.BufferGeometry(), pondMat); pondMesh.frustumCulled = false; pondMesh.renderOrder = 1; scene.add(pondMesh);
let pondKey = '';
function pondsSync(px, py) {
  const L = lakesNear(px, py, VIEW + 100), key = L.map(P => P.x | 0).join();
  if (key === pondKey) return L; pondKey = key;
  const pos = [], dat = [];
  for (const P of L) { const R = P.rad * 1.2, y = 0.35; for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) { pos.push(P.x + a * R, y, P.y + b * R); dat.push(P.x, P.y, P.rad, P.seed); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('pdat', new THREE.Float32BufferAttribute(dat, 4));
  pondMesh.geometry.dispose(); pondMesh.geometry = g;
  return L;
}

// ---------------- shadows: a soft dark pool under everything that stands, strongest in full sun ----------------
const MAXSH = 3000;
const shGeo = new THREE.InstancedBufferGeometry();
shGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1], 3)); shGeo.setIndex([0, 2, 1, 0, 3, 2]);
const shDat = new Float32Array(MAXSH * 4); { const b = new THREE.InstancedBufferAttribute(shDat, 4); b.setUsage(THREE.DynamicDrawUsage); shGeo.setAttribute('sd', b); }
shGeo.instanceCount = 0;
const shMat = new THREE.ShaderMaterial({ uniforms: Object.assign({ k: { value: 0.3 }, lean: { value: new THREE.Vector2(0.3, 0.3) } }, LU), transparent: true, depthWrite: false,
  vertexShader: `attribute vec4 sd; uniform vec2 lean; varying vec2 vQ; varying vec3 vW; void main() { vQ = position.xz; vec3 w = vec3(sd.x + position.x * sd.z + lean.x * sd.w * (position.z * 0.5 + 0.5), 0.2, sd.y + position.z * sd.z * 0.75 + lean.y * sd.w * (position.z * 0.5 + 0.5)); vW = w; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
  fragmentShader: LIGHT_GLSL + `uniform float k; varying vec2 vQ; varying vec3 vW; void main() { float r = dot(vQ, vQ); float dap = sin(vW.x * 0.21 + sin(vW.z * 0.13) * 2.0) * sin(vW.z * 0.19 + sin(vW.x * 0.11) * 2.0); float a = k * (0.85 + 0.3 * dap) * (1.0 - smoothstep(0.35, 1.0, r)) * (1.0 - smoothstep(fogR.x, fogR.y, distance(vW.xz, camPos.xz))); if (a < 0.004) discard; gl_FragColor = vec4(0.0, 0.0, 0.0, a); }` });
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
let staticK = null;   // the palisade, the yard and the raiders' camps never move: built once
function worldSync(force) {
  const p = S.p, D = S.day;
  if (!staticK) { const K = new Kit(); campKit(K); raiderKit(K); staticK = new KitMesh(); staticK.set(K); }
  const gen = D.felled.size * 7 + D.nodes.size * 3 + (D.bchunks ? D.bchunks.size : 0);
  if (!force && !worldDirty && Math.hypot(p.x - WORLD.x, p.y - WORLD.y) < 70 && gen === WORLD.gen) return;
  WORLD.x = p.x; WORLD.y = p.y; WORLD.gen = gen; worldDirty = false;
  // trees, rocks, posts
  tallB.begin(); shN = 0;
  const props = propsNear(p.x, p.y, VIEW + 60); WORLD.props = props;
  for (const o of props) {
    if (o.kind === 'tree') {
      const kind = kindOfTree(o), M = ATLAS.meta[kind], v = (o.seed * 997 | 0) % M.length, m = (o.seed * 7919 % 1) < 0.5 ? 1 : -1;
      tallB.add(kind, v, o.x, o.y, o.s * TREE_K, m, kind === 'dead' ? 0.4 : 1, o.shakeT ?? -99, o.seed);
      shadow(o.x, o.y, (kind === 'pine' ? 15 : kind === 'dead' ? 10 : 20) * o.s * 1.2, (kind === 'pine' ? 90 : 70) * o.s);
    } else if (o.kind === 'rock') {
      tallB.add('rock', (hash(o.x * 0.37, o.y * 0.91) * 50 | 0), o.x, o.y, o.s * ROCK_K, 1, 0, o.shakeT ?? -99, 0);
      shadow(o.x, o.y, 15 * o.s, 10 * o.s);
    } else if (o.kind === 'post') { tallB.add('post', (hash(o.x * 0.53, o.y * 0.29) * 50 | 0), o.x, o.y, 1.4, 1, 0); shadow(o.x, o.y, 5, 18); }
  }
  // the camp's storage box, water barrel and woodpile are solid (yardKit); they only need their shadows here
  for (const o of [CAMP_BOX, CAMP_BARREL, CAMP.find(q => q.camp === 'wood')]) if (o) shadow(o.x, o.y, 14, 10);
  tallB.end(); shBase = shN;
  // ground cover
  // plants are crossed cards so they have body from every side; flowers sit low and small among the turf
  coverB.begin(); plantB.begin();
  for (const d of decorNear(p.x, p.y, 430)) {
    const k = d.dk === 'log' ? 'log' : d.dk;
    if (!ATLAS.meta[k]) continue;
    const fl = k.startsWith('flower'), plant = fl || k === 'grass' || k === 'fern' || k === 'bush';
    (plant ? plantB : coverB).add(k, d.v, d.x, d.y, d.s * (k === 'log' ? 1.3 : k === 'bush' ? 1.5 : fl ? 0.72 : 1.15), (d.seed * 7919 % 1) < 0.5 ? 1 : -1, k === 'grass' || k === 'fern' || fl ? 1.2 : k === 'bush' ? 0.6 : 0, -99, d.seed);
  }
  coverB.end(); plantB.end();
  WORLD.lakes = pondsSync(p.x, p.y);
}
