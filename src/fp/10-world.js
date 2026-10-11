// ================= the woods: the main game's own trees, rocks, ground cover and ponds, stood up around you =================

// ---------------- billboards: every painted sprite, stood upright and facing you, swaying at the top ----------------
// One instanced draw per board. Boards are refilled from the game's world as you walk (only when you've moved far enough).
class Board {
  constructor(cap, cull, near, cover, tex = atlasTex, atlas = ATLAS) {
    this.cap = cap; this.atlas = atlas;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setIndex([0, 2, 1, 0, 3, 2]);
    this.P = new Float32Array(cap * 4); this.R = new Float32Array(cap * 4); this.D = new Float32Array(cap * 4); this.X = new Float32Array(cap * 4);
    for (const [k, a] of [['iPos', this.P], ['iRect', this.R], ['iDim', this.D], ['iMisc', this.X]]) { const b = new THREE.InstancedBufferAttribute(a, 4); b.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, b); }
    g.instanceCount = 0; this.g = g;
    const m = new THREE.ShaderMaterial({
      uniforms: Object.assign({ map: { value: tex }, cull: { value: cull }, near: { value: near }, now: { value: 0 } }, LU),
      defines: AA ? { A2C: 1 } : {}, alphaToCoverage: AA, side: THREE.DoubleSide,   // a flipped sprite turns its back; draw both faces
      vertexShader: `attribute vec4 iPos, iRect, iDim, iMisc; uniform vec3 camPos, camRight; uniform float time, cull, near, now;
        varying vec2 vUv; varying vec3 vW; varying vec3 vNear;
        void main() {
          float d = distance(iPos.xz, camPos.xz);
          if (d > cull) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          float s = iPos.w;
          float lx = (position.x * iDim.x - iDim.z) * s * iMisc.x;
          float ly = (iDim.w - (1.0 - position.y) * iDim.y) * s;
          float up = max(ly, 0.0) / (iDim.w * s + 0.001);
          float sw = sin(time * 0.7 + iMisc.w * 20.0) * 1.6 + sin(time * 1.9 + iMisc.w * 7.0) * 0.5;
          float st = now - iMisc.z; float shake = st >= 0.0 && st < 0.45 ? sin(st * 48.0) * (1.0 - st / 0.45) * 5.0 : 0.0;   // struck: it shudders
          sw = (sw * iMisc.y + shake) * up * up;
          vec3 w = vec3(iPos.x, iPos.y, iPos.z) + camRight * (lx + sw * s) + vec3(0.0, ly, 0.0);
          vUv = iRect.xy + vec2(position.x, 1.0 - position.y) * iRect.zw;
          vW = w;
          vNear = vec3(near > 0.0 && iDim.y * s > 70.0 ? clamp((d - near) / (near * 0.9), 0.0, 1.0) : 1.0, abs(lx) / s, ly / s);   // right beside a tree, all but its trunk melts away so it never fills the screen
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
        }`,
      fragmentShader: LIGHT_GLSL + `uniform sampler2D map; varying vec2 vUv; varying vec3 vW; varying vec3 vNear;
        void main() {
          vec4 t = texture2D(map, vUv);
          float trunk = (vNear.y < 7.0 && vNear.z < 34.0) ? 1.0 : 0.0;
          float keep = max(vNear.x, trunk);
          #ifdef A2C
            t.a *= keep * keep;
            if (t.a < 0.08) discard;
          #else
            if (keep < 1.0) { vec2 b = mod(floor(gl_FragCoord.xy), 4.0); float h = (mod(b.x + b.y * 2.0, 4.0) * 4.0 + mod(b.x * 2.0 + b.y, 4.0)) / 16.0 + 0.03; if (h > keep) discard; }
            if (t.a < 0.5) discard;
          #endif
          gl_FragColor = vec4(fogged(grey(t.rgb * lightAt(vW, vec3(0.0), 0.0) * ${cover ? '1.18' : '1.12'}), vW), t.a);
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
const tallB = new Board(2600, VIEW, 30, false), coverB = new Board(6000, 420, 0, true), nearB = new Board(900, 300, 0, true);

// ---------------- the kit: solid things built from simple shapes, with the game's dark outline round them ----------------
// Shapes are baked into one mesh per batch (vertex colours), drawn twice: once lit, once as a slightly fatter dark shell.
const kitMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ glow: { value: 0 } }, LU),
  vertexShader: `attribute vec3 color; attribute float em; varying vec3 vC, vW, vN; varying float vE;
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; vE = em; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `varying vec3 vC, vW, vN; varying float vE;
    void main() { vec3 c = vC * lightAt(vW, normalize(vN), 1.0) * 1.05 + vC * vE; gl_FragColor = vec4(fogged(grey(c), vW), 1.0); }`,
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
const P_BALL = () => prim('ball', () => new THREE.SphereGeometry(0.5, 10, 7));
const P_TENT = () => prim('tent', () => { const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 3, 1); g.rotateZ(Math.PI / 2); g.rotateX(Math.PI / 6 + Math.PI); g.translate(0, 0.25, 0); return g; });   // a triangular prism lying along x
class Kit {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.em = []; this.ew = []; }
  // put a shape in: at (x, y, z) in 3D (z is the game's y), turned by yaw (and pitch, roll), sized (sx, sy, sz), coloured
  add(geo, x, y, z, sx, sy, sz, col, yaw = 0, pitch = 0, roll = 0, em = 0, ew = 0.7) {
    _km.compose(_kv.set(x, y, z), _kq.setFromEuler(_ke.set(pitch, yaw, roll, 'YXZ')), _ks.set(sx, sy, sz));
    const p = geo.attributes.position, n = geo.attributes.normal, nm = new THREE.Matrix3().getNormalMatrix(_km), v = new V3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(_km); this.pos.push(v.x, v.y, v.z);
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
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(_km); this.pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); this.nor.push(v.x, v.y, v.z);
      this.col.push(col[0], col[1], col[2]); this.em.push(em); this.ew.push(0.6);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); g.setAttribute('em', new THREE.Float32BufferAttribute(this.em, 1)); g.setAttribute('ew', new THREE.Float32BufferAttribute(this.ew, 1));
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
  { const x = EX_FIRE.x, y = EX_FIRE.y;   // the fire in the middle: a ring of stones, the logs crossed in it, a bed of ash
    K.add(P_CYL(12), x, -0.4, y, 24, 1, 24, hex('#2e2a26'));
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283 + 0.2; K.add(P_BALL(), x + Math.cos(a) * 14, 1.2, y + Math.sin(a) * 14, 7 + hash(k, 3) * 2, 5, 6, hex(k % 2 ? '#7a7872' : '#8d8b85'), -a); }
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
    } else if (o.camp === 'bench') {
      const ux = Math.cos(o.a) * 13, uy = Math.sin(o.a) * 13;
      K.rod(P_CYL(8), o.x - ux, 3, o.y - uy, o.x + ux, 3, o.y + uy, 3, hex('#46413a'));
    } else if (o.camp === 'tent') {
      K.add(P_TENT(), o.x, 0, o.y, 34, 25, 26, hex('#57534c'), -o.a);
      K.add(P_BOX(), o.x + Math.cos(o.a) * 17.2, 5, o.y + Math.sin(o.a) * 17.2, 0.4, 10, 6, hex('#1c1b19'), -o.a);
    } else if (o.camp === 'rack') {
      K.add(P_CYL(5), o.x - 9, 0, o.y, 2, 18, 2, hex('#3a3631')); K.add(P_CYL(5), o.x + 9, 0, o.y, 2, 16, 2, hex('#3a3631'));
      K.rod(P_CYL(5), o.x - 10, 15, o.y, o.x + 10, 13, o.y, 1, hex('#3a3631'));
      for (let m = 0; m < 4; m++) { const x = o.x - 6 + m * 4; K.rod(P_CYL(4), x - 1, 0, o.y + 2, x + 1, 32, o.y - 2, 0.65, hex('#4f4a43')); K.add(P_CONE(4), x + 1, 32, o.y - 2, 2.2, 6, 2.2, hex('#7a756c')); }
    } else if (o.camp === 'flag') {
      K.add(P_CYL(6), o.x, 0, o.y, 2.4, 74, 2.4, hex('#3a3631'));
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
    if (o.sub === 'tent') { K.add(P_TENT(), o.x, 0, o.y, 34, 25, 26, hex('#5a5048'), -o.a); K.add(P_BOX(), o.x + Math.cos(o.a) * 17.2, 5, o.y + Math.sin(o.a) * 17.2, 0.4, 10, 6, hex('#1c1b19'), -o.a); }
    else if (o.sub === 'stake') { K.add(P_CYL(6), o.x, 0, o.y, 3.6, 30, 3.6, logTone3(o.seed * 9 | 0)); K.add(P_CONE(6), o.x, 30, o.y, 3.6, 6, 3.6, logTone3(o.seed * 9 | 0)); if (o.skull) K.add(P_BALL(), o.x, 30, o.y, 5, 5.5, 5.5, hex('#d8d0bc')); }
    else if (o.sub === 'dirt') K.add(P_CYL(10), o.x, -0.6, o.y, 22 + o.seed * 8, 1, 14 + o.seed * 6, hex('#3e3428'), o.seed * 6);
    else if (o.sub === 'bones') { for (let k = 0; k < 3; k++) { const a = o.seed * 9 + k * 2.1; K.rod(P_CYL(4), o.x + Math.cos(a) * 3, 0.8, o.y + Math.sin(a) * 3, o.x + Math.cos(a) * 3 + Math.cos(a + 1.3) * 9, 0.8, o.y + Math.sin(a) * 3 + Math.sin(a + 1.3) * 9, 0.8, hex('#e6dfcc')); } }
    else if (o.sub === 'fire') { for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; K.add(P_BALL(), o.x + Math.cos(a) * 11, 1, o.y + Math.sin(a) * 11, 6, 4, 6, hex(k % 2 ? '#7a7872' : '#8d8b85')); } K.rod(P_CYL(5), o.x - 6, 2, o.y - 3, o.x + 6, 2, o.y + 3, 1.6, hex('#5a3e28')); K.rod(P_CYL(5), o.x - 5, 2, o.y + 4, o.x + 5, 2, o.y - 4, 1.6, hex('#4a3420')); }
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
  fragmentShader: LIGHT_GLSL + `uniform float k; varying vec2 vQ; varying vec3 vW; void main() { float r = dot(vQ, vQ); float a = k * (1.0 - smoothstep(0.35, 1.0, r)) * (1.0 - smoothstep(fogR.x, fogR.y, distance(vW.xz, camPos.xz))); if (a < 0.004) discard; gl_FragColor = vec4(0.0, 0.0, 0.0, a); }` });
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
  // the camp yard's own sprites: crates, barrels, the woodpile
  for (const o of CAMP) {
    if (o.camp === 'crate') tallB.add(o.big ? 'crateB' : 'crateS', 0, o.x, o.y, 1.4, 1, 0);
    else if (o.camp === 'barrel') tallB.add('barrel', 0, o.x, o.y, 1.4, 1, 0);
    else if (o.camp === 'wood') tallB.add('woodpile', 0, o.x, o.y, 1.4, 1, 0);
    else continue;
    shadow(o.x, o.y, 12, 8);
  }
  tallB.end(); shBase = shN;
  // ground cover
  coverB.begin();
  for (const d of decorNear(p.x, p.y, 430)) {
    const k = d.dk === 'log' ? 'log' : d.dk;
    if (!ATLAS.meta[k]) continue;
    coverB.add(k, d.v, d.x, d.y, d.s * (k === 'log' ? 1.3 : k === 'bush' ? 1.5 : 1.25), (d.seed * 7919 % 1) < 0.5 ? 1 : -1, k === 'grass' || k === 'fern' || k.startsWith('flower') ? 1.2 : k === 'bush' ? 0.6 : 0, -99, d.seed);
  }
  coverB.end();
  WORLD.lakes = pondsSync(p.x, p.y);
}
