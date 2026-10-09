'use strict';
// Behind You, first person test.
// The trees, rocks, flowers and forest floor are the game's own painted sprites (painted by the game's code, outlines and all),
// stood upright in a 3D forest. Units are the game's: a person is 38 tall, the torch reaches 330, you run at 95.
const ATLAS_SRC = '/*ATLAS*/', ATLAS = /*ATLASMETA*/0, FLOOR_SRC = '/*FLOOR*/', SND = /*SND*/0, AMB_SRC = '/*AMB*/';
const V3 = THREE.Vector3, V4 = THREE.Vector4, M4 = THREE.Matrix4;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, k) => a + (b - a) * k;
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------- settings ----------------
const SET = { sens: 1, invert: false, fps: true, quality: 'auto', sound: true };
try { Object.assign(SET, JSON.parse(localStorage.getItem('behind-you-fp') || '{}')); } catch (e) {}
const saveSet = () => { try { localStorage.setItem('behind-you-fp', JSON.stringify(SET)); } catch (e) {} };

// ---------------- the world's numbers ----------------
const EYE = 33, P_R = 8, RUN = 95, RANGE = 330, HALF = 0.38, WORLD_R = 2100, CAMP_R = 170, TREE_K = 1.75;
const FOES = {   // from the game: hp, speed, speed while lit, height
  shade:   { hp: 1,   sp: 40, lightSp: 0,    h: 38, bulk: 1,    reach: 23, wind: 0.6,  stop: true,  tint: [118, 128, 168], step: 'small', burnK: 1 },
  stalker: { hp: 0.6, sp: 74, lightSp: 0,    h: 31, bulk: 0.95, reach: 21, wind: 0.45, stop: true,  tint: [150, 112, 176], step: 'small', burnK: 1.2 },
  brute:   { hp: 3.2, sp: 27, lightSp: 0.35, h: 48, bulk: 1.3,  reach: 31, wind: 0.9,  stop: false, tint: [150, 112, 84],  step: 'big',   burnK: 0.6 },
};
const RINGS = [[CAMP_R, 'camp'], [950, 'the near woods'], [1550, 'the middle woods'], [1e9, 'the deep woods']];
const ringOf = d => RINGS.findIndex(r => d < r[0]);

// ---------------- renderer ----------------
const canvas = $('gl');
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const DPR = Math.min(window.devicePixelRatio || 1, 3);
const AA = SET.quality !== 'fast';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: AA, powerPreference: 'high-performance', stencil: false, alpha: false });
renderer.autoClear = false;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // colours pass straight through, as in the 2D game
renderer.setClearColor(0x0a0d12, 1);
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
const scene = new THREE.Scene(), vmScene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(70, 1, 2, 900), vmCam = new THREE.PerspectiveCamera(58, 1, 0.5, 100);
cam.rotation.order = 'YXZ';

// quality: how many pixels we draw per screen pixel. Auto moves it to hold the frame rate.
const QCAP = TOUCH ? Math.min(DPR, 1.6) : Math.min(DPR, 2);
let pixK = SET.quality === 'fast' ? Math.min(DPR, 0.8) : SET.quality === 'sharp' ? QCAP : Math.min(QCAP, TOUCH ? 1.25 : 1.5);
let W = 1, H = 1, vmX = 1;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  renderer.setPixelRatio(pixK); renderer.setSize(W, H, false);
  const asp = W / H;
  cam.aspect = vmCam.aspect = asp;
  // a wide view in landscape (96° across), a taller one held upright
  cam.fov = asp >= 1 ? 2 * Math.atan(Math.tan(48 * Math.PI / 180) / asp) * 180 / Math.PI : 78;
  vmCam.fov = asp >= 1 ? 56 : 98;
  vmX = clamp(16 * Math.tan(vmCam.fov * Math.PI / 360) * asp / 18.4, 0.42, 1);   // held upright, the hands come in toward the middle so both stay on screen
  cam.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
  PU.uScale.value = H * pixK * 0.5 * cam.projectionMatrix.elements[5];
}

// ---------------- light: one function every surface shares ----------------
// The torch is a soft-edged cone with no hot core (the pre-v72 beam), fading toward its far end. Fires and lamps are warm
// round pools. Everything else is properly dark.
const NL = 12;
const LU = {
  tPos: { value: new V3() }, tDir: { value: new V3(0, 0, -1) }, tCone: { value: new THREE.Vector2(Math.cos(HALF * 1.12), Math.cos(HALF * 0.5)) },
  tRange: { value: RANGE * 1.25 }, tCol: { value: new V3(1.0, 0.88, 0.7) }, amb: { value: new V3(0.016, 0.018, 0.026) },
  pl: { value: Array.from({ length: NL }, () => new V4(0, -999, 0, 1)) }, plc: { value: Array.from({ length: NL }, () => new V3()) },
  time: { value: 0 }, camPos: { value: new V3() }, camRight: { value: new V3(1, 0, 0) },
};
const LIGHT_GLSL = `
uniform vec3 tPos, tDir, tCol, amb; uniform vec2 tCone; uniform float tRange;
uniform vec4 pl[${NL}]; uniform vec3 plc[${NL}];
vec3 lightAt(vec3 p, vec3 n, float useN) {
  vec3 L = p - tPos; float d = length(L); vec3 l = L / max(d, 0.001);
  float cone = smoothstep(tCone.x, tCone.y, dot(l, tDir));
  float fall = clamp(1.0 - 0.5 * d / tRange, 0.0, 1.0) * smoothstep(tRange, tRange * 0.62, d);
  float lam = mix(1.0, clamp(dot(n, -l) * 0.55 + 0.6, 0.0, 1.0), useN);
  vec3 c = amb + tCol * (cone * fall * lam);
  for (int i = 0; i < ${NL}; i++) { vec4 q = pl[i]; float k = clamp(1.0 - distance(p, q.xyz) / q.w, 0.0, 1.0); c += plc[i] * (k * k); }
  return c;
}`;

// ---------------- textures ----------------
let pending = 3;
function loaded() { if (--pending === 0) { $('loading').textContent = ''; ready = true; } }
let ready = false;
function texFrom(src, repeat) {
  const t = new THREE.Texture(); const img = new Image();
  img.onload = () => { t.image = img; t.needsUpdate = true; loaded(); };
  img.src = src;
  t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.anisotropy = MAX_ANISO;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const atlasTex = texFrom(ATLAS_SRC, false), floorTex = texFrom(FLOOR_SRC, true);

// ---------------- the ground ----------------
{
  const g = new THREE.PlaneGeometry(9000, 9000); g.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    uniforms: Object.assign({ map: { value: floorTex } }, LU),
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: LIGHT_GLSL + `uniform sampler2D map; varying vec3 vW;
      void main() { vec3 t = texture2D(map, vW.xz / 384.0).rgb; gl_FragColor = vec4(t * lightAt(vW, vec3(0.0, 1.0, 0.0), 0.0) * 1.12, 1.0); }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; scene.add(mesh);
}

// ---------------- billboards: every painted sprite, one draw for the tall things and one for the ground cover ----------------
// Each stands up facing the screen, sways at the top in the wind, and is drawn only near enough to matter.
function billboards(list, cull, near) {
  const n = list.length, base = new THREE.InstancedBufferGeometry();
  base.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
  base.setIndex([0, 2, 1, 0, 3, 2]);
  const P = new Float32Array(n * 4), R = new Float32Array(n * 4), D = new Float32Array(n * 4), X = new Float32Array(n * 2);
  list.forEach((o, i) => {
    const r = ATLAS.meta[o.kind][o.v];   // [x, y, pw, ph, w, h, ax, ay]
    P.set([o.x, 0, o.z, o.s], i * 4);
    R.set([r[0] / ATLAS.W, r[1] / ATLAS.H, r[2] / ATLAS.W, r[3] / ATLAS.H], i * 4);
    D.set([r[4], r[5], r[6], r[7]], i * 4);
    X.set([o.flip ? -1 : 1, o.sway || 0], i * 2);
  });
  base.setAttribute('iPos', new THREE.InstancedBufferAttribute(P, 4));
  base.setAttribute('iRect', new THREE.InstancedBufferAttribute(R, 4));
  base.setAttribute('iDim', new THREE.InstancedBufferAttribute(D, 4));
  base.setAttribute('iMisc', new THREE.InstancedBufferAttribute(X, 2));
  base.instanceCount = n;
  const m = new THREE.ShaderMaterial({
    uniforms: Object.assign({ map: { value: atlasTex }, cull: { value: cull }, near: { value: near } }, LU),
    defines: AA ? { A2C: 1 } : {},
    alphaToCoverage: AA,
    vertexShader: `attribute vec4 iPos, iRect, iDim; attribute vec2 iMisc; uniform vec3 camPos, camRight; uniform float time, cull, near;
      varying vec2 vUv; varying vec3 vW; varying float vFade; varying vec3 vNear;
      void main() {
        float d = distance(iPos.xz, camPos.xz);
        if (d > cull) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        float s = iPos.w;
        float lx = (position.x * iDim.x - iDim.z) * s * iMisc.x;
        float ly = (iDim.w - (1.0 - position.y) * iDim.y) * s;
        float up = max(ly, 0.0) / (iDim.w * s + 0.001);
        float sw = sin(time * 0.8 + iPos.x * 0.013 + iPos.z * 0.011) * iMisc.y * up * up;
        vec3 w = vec3(iPos.x, 0.0, iPos.z) + camRight * (lx + sw) + vec3(0.0, ly, 0.0);
        vUv = iRect.xy + vec2(position.x, 1.0 - position.y) * iRect.zw;
        vW = w; vFade = smoothstep(cull, cull * 0.85, d);
        vNear = vec3(near > 0.0 ? clamp((d - near) / (near * 0.9), 0.0, 1.0) : 1.0, abs(lx) / s, ly / s);   // right beside a tree, all but its trunk melts away so it never fills the screen
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: LIGHT_GLSL + `uniform sampler2D map; varying vec2 vUv; varying vec3 vW; varying float vFade; varying vec3 vNear;
      void main() {
        vec4 t = texture2D(map, vUv);
        float trunk = (vNear.y < 7.0 && vNear.z < 34.0) ? 1.0 : 0.0;
        float keep = max(vNear.x, trunk);
        #ifdef A2C
          t.a *= keep * keep;   // the multisampling turns this into a fine, even fade
        #else
          if (keep < 1.0) { vec2 b = mod(floor(gl_FragCoord.xy), 4.0); float h = (mod(b.x + b.y * 2.0, 4.0) * 4.0 + mod(b.x * 2.0 + b.y, 4.0)) / 16.0 + 0.03; if (h > keep) discard; }
        #endif
        #ifdef A2C
          if (t.a < 0.08) discard;
        #else
          if (t.a < 0.5) discard;
        #endif
        gl_FragColor = vec4(t.rgb * lightAt(vW, vec3(0.0), 0.0) * 1.3 * vFade, t.a);
      }`,
  });
  const mesh = new THREE.Mesh(base, m); mesh.frustumCulled = false; scene.add(mesh);
  return mesh;
}

// ---------------- the forest ----------------
const COL = new Map();   // what you bump into: tree trunks, rocks, props, in 64-unit cells
const cellKey = (cx, cz) => cx * 100003 + cz;
function addCol(x, z, r, block = 1) {
  const c = { x, z, r, block }, cx = Math.floor(x / 64), cz = Math.floor(z / 64);
  const k = cellKey(cx, cz); let a = COL.get(k); if (!a) COL.set(k, a = []); a.push(c);
}
function colsNear(x, z, rad, out) {
  out.length = 0;
  const x0 = Math.floor((x - rad) / 64), x1 = Math.floor((x + rad) / 64), z0 = Math.floor((z - rad) / 64), z1 = Math.floor((z + rad) / 64);
  for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) { const a = COL.get(cellKey(cx, cz)); if (a) for (const c of a) out.push(c); }
  return out;
}
const LAMPS = [], LOGS = [];
let FIRE = { x: 0, z: 0 };
{
  const R = rng(20261009), tall = [], cover = [];
  const pick = (kind) => (R() * ATLAS.meta[kind].length) | 0;
  const put = (arr, kind, x, z, s, sway, colR) => { arr.push({ kind, v: pick(kind), x, z, s, flip: R() < 0.5, sway }); if (colR) addCol(x, z, colR); };
  // camp: the fire, lamps on posts round the edge, a woodpile, a crate, a barrel and logs to sit on
  put(tall, 'firepit', 0, 0, 1.25, 0, 18);
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + 0.3, x = Math.cos(a) * (CAMP_R - 22), z = Math.sin(a) * (CAMP_R - 22);
    tall.push({ kind: 'lamp', v: 0, x, z, s: 1.35, flip: false, sway: 0 }); addCol(x, z, 5);
    LAMPS.push({ x: x + 13.5 * 1.35 * 0, z, y: 52 });
  }
  put(tall, 'woodpile', 46, -38, 1.4, 0, 14); put(tall, 'crateB', -52, 34, 1.4, 0, 12); put(tall, 'barrel', -40, 52, 1.4, 0, 9);
  const log = (x, z, a, len) => { LOGS.push({ x, z, a, len, r: 5 + Math.random() * 1.5 }); for (const u of [-0.38, 0, 0.38]) addCol(x + Math.cos(a) * len * u, z + Math.sin(a) * len * u, 8); };
  log(44, 44, 2.3, 56); log(-50, -32, 0.6, 52);
  for (let k = 0; k < 10; k++) { const a = R() * 6.28, d = 30 + R() * 120; put(cover, R() < 0.5 ? 'grass' : 'fern', Math.cos(a) * d, Math.sin(a) * d, 1.3, 1.5, 0); }
  // value noise for clearings and thickets
  const nz = (x, z) => Math.sin(x * 0.0021 + 1.3) * Math.cos(z * 0.0017 - 0.7) + 0.5 * Math.sin((x + z) * 0.0043 + 2.1) + 0.35 * Math.cos((x - z) * 0.0067);
  const CELL = 84;
  for (let gx = -WORLD_R - 200; gx <= WORLD_R + 200; gx += CELL) for (let gz = -WORLD_R - 200; gz <= WORLD_R + 200; gz += CELL) {
    const x = gx + (R() - 0.5) * CELL * 0.9, z = gz + (R() - 0.5) * CELL * 0.9, d = Math.hypot(x, z);
    if (d < CAMP_R + 50) continue;
    if (d > WORLD_R + 260) continue;
    const edge = d > WORLD_R - 40;   // the edge of the world is a wall of trees
    const ring = clamp((d - CAMP_R) / (WORLD_R - CAMP_R), 0, 1), n = nz(x, z);
    const pTree = edge ? 0.95 : clamp(0.32 + ring * 0.3 + n * 0.16, 0.12, 0.72);
    const r = R();
    if (r < pTree) {
      const q = R(); let kind;
      if (q < 0.5 + ring * 0.1) kind = 'pine'; else if (q < 0.72) kind = 'oak'; else if (q < 0.79 && ring < 0.5) kind = 'cherry'; else if (q < 0.79) kind = 'pine'; else kind = 'dead';
      const s = TREE_K * (0.82 + R() * 0.45);
      put(tall, kind, x, z, s, kind === 'dead' ? 2 : 5, kind === 'pine' ? 9 * s / TREE_K + 4 : 7 * s / TREE_K + 3);
    } else if (r < pTree + 0.07) put(tall, 'rock', x, z, 1.5 + R() * 0.7, 0, 15);
    else if (r < pTree + 0.1 && !edge) log(x, z, R() * Math.PI, 60 + R() * 50);
    else if (r < pTree + 0.18) put(tall, 'bush', x, z, 1.7 + R() * 0.5, 3, 0);
    // ground cover: grass, ferns, flowers, mushrooms
    const nc = 3 + (R() * 4 | 0);
    for (let k = 0; k < nc; k++) {
      const cx = x + (R() - 0.5) * CELL, cz = z + (R() - 0.5) * CELL, q = R();
      const kind = q < 0.42 ? 'grass' : q < 0.7 ? 'fern' : q < 0.78 ? 'flowerY' : q < 0.84 ? 'flowerB' : q < 0.88 ? 'flowerR' : q < 0.94 ? 'shrooms' : 'bush';
      put(cover, kind, cx, cz, kind === 'bush' ? 1.5 : 1.3 + R() * 0.3, kind === 'shrooms' ? 0 : 1.6, 0);
    }
  }
  billboards(tall, 820, 30); billboards(cover, 330, 0);
  window.__counts = { tall: tall.length, cover: cover.length };
}
loaded();   // the world is built

// ---------------- enemies: pale figures built of rounded limbs with the game's dark outline ----------------
const MAXE = 24;
function mergeGeo(list) {   // join a few simple shapes into one (positions and normals only)
  const pos = [], nor = [];
  for (const g of list) { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return out;
}
function cap(r, len, top) { const g = new THREE.CapsuleGeometry(r, len, 3, 8); g.translate(0, top ? -(len / 2 + r) : len / 2 + r, 0); return g; }
const torsoG = new THREE.CylinderGeometry(4.7, 3.1, 13, 10, 2); torsoG.translate(0, 6.5, 0); torsoG.scale(1, 1, 0.62);
{ const sh = new THREE.SphereGeometry(4.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); sh.scale(1, 0.45, 0.62); sh.translate(0, 13, 0); torsoG.copy(mergeGeo([torsoG.toNonIndexed(), sh.toNonIndexed()])); }
const headG = new THREE.SphereGeometry(3.5, 12, 9); headG.scale(1, 1.18, 1.02);
const armG = cap(1.2, 13.4, true), legG = cap(1.65, 13.6, true);
const faceG = new THREE.SphereGeometry(2.8, 10, 7); faceG.scale(1, 1.25, 0.45);
const foeMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU),
  vertexShader: `attribute vec4 iCol; varying vec4 vC; varying vec3 vW, vN;
    void main() { vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vC = iCol; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `varying vec4 vC; varying vec3 vW, vN;
    void main() { vec3 c = vC.rgb * lightAt(vW, normalize(vN), 1.0) * 1.05 + vC.rgb * vC.a; gl_FragColor = vec4(c, 1.0); }`,
});
const edgeMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU), side: THREE.BackSide,
  vertexShader: `attribute vec4 iCol; varying vec3 vW; varying float vE;
    void main() { vec4 w = modelMatrix * instanceMatrix * vec4(position + normal * 0.85, 1.0); vW = w.xyz; vE = iCol.a; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `varying vec3 vW; varying float vE;
    void main() { vec3 L = lightAt(vW, vec3(0.0), 0.0); float b = clamp(dot(L, vec3(0.34)) * 2.2 + vE * 0.6, 0.0, 1.0); gl_FragColor = vec4(vec3(0.15, 0.15, 0.14) * b, 1.0); }`,
});
class Part {
  constructor(geo) {
    this.col = new THREE.InstancedBufferAttribute(new Float32Array(MAXE * 4), 4); this.col.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iCol', this.col);
    this.mesh = new THREE.InstancedMesh(geo, foeMat, MAXE); this.edge = new THREE.InstancedMesh(geo, edgeMat, MAXE);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.edge.instanceMatrix = this.mesh.instanceMatrix;
    this.mesh.frustumCulled = this.edge.frustumCulled = false; this.mesh.count = this.edge.count = 0;
    scene.add(this.edge); scene.add(this.mesh); this.n = 0;
  }
  push(m, r, g, b, e) { const i = this.n++; this.mesh.setMatrixAt(i, m); this.col.setXYZW(i, r, g, b, e); }
  done() { this.mesh.count = this.edge.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; this.col.needsUpdate = true; this.n = 0; }
}
// fallen logs are real round logs (the painted ones are drawn for looking down on, and stand up oddly at eye level)
{
  const g = new THREE.CylinderGeometry(1, 1.08, 1, 10, 1); g.rotateZ(Math.PI / 2);
  const col = new THREE.InstancedBufferAttribute(new Float32Array(LOGS.length * 4), 4); g.setAttribute('iCol', col);
  const mesh = new THREE.InstancedMesh(g, foeMat, LOGS.length), edge = new THREE.InstancedMesh(g, edgeMat, LOGS.length);
  const m = new M4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  LOGS.forEach((L, i) => { m.compose(new V3(L.x, L.r * 0.85, L.z), q.setFromEuler(e.set(0, -L.a, (Math.random() - 0.5) * 0.06)), new V3(L.len, L.r, L.r)); mesh.setMatrixAt(i, m); const v = 0.85 + Math.random() * 0.25; col.setXYZW(i, 0.44 * v, 0.32 * v, 0.22 * v, 0); });
  edge.instanceMatrix = mesh.instanceMatrix; scene.add(edge); scene.add(mesh);
}
const PT = { torso: new Part(torsoG), head: new Part(headG), face: new Part(faceG), arm: new Part(armG), leg: new Part(legG) };

// ---------------- sparks, flames, embers, eyes and glints: one additive point cloud ----------------
const MAXP = 1400;
const pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 4), pDat = new Float32Array(MAXP * 2);
const PS = [];   // live particles
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('pcol', new THREE.BufferAttribute(pCol, 4).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('pdat', new THREE.BufferAttribute(pDat, 2).setUsage(THREE.DynamicDrawUsage));
const PU = { uScale: { value: 400 } };
const pMat = new THREE.ShaderMaterial({
  uniforms: PU, transparent: true, depthWrite: false, depthTest: true,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  vertexShader: `attribute vec4 pcol; attribute vec2 pdat; uniform float uScale; varying vec4 vC; varying float vK;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(pdat.x * uScale / max(-mv.z, 1.0), 1.5, 512.0); vC = pcol; vK = pdat.y; }`,
  fragmentShader: `varying vec4 vC; varying float vK;
    void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float r = dot(q, q); float a;
      if (vK < 0.5) a = exp(-r * 3.2);
      else a = max(0.0, 1.0 - abs(q.x) * 7.0) * max(0.0, 1.0 - abs(q.y)) + max(0.0, 1.0 - abs(q.y) * 7.0) * max(0.0, 1.0 - abs(q.x)) + exp(-r * 14.0);
      a *= vC.a; if (a < 0.003) discard; gl_FragColor = vec4(vC.rgb * a, 1.0); }`,
});
const pts = new THREE.Points(pGeo, pMat); pts.frustumCulled = false; scene.add(pts);
function spark(x, y, z, vx, vy, vz, life, size, r, g, b, a, kind = 0, grav = 0, drag = 1.5) {
  if (PS.length >= MAXP - 64) return;
  PS.push({ x, y, z, vx, vy, vz, t: 0, life, size, r, g, b, a, kind, grav, drag, fire: 0 });
}
function flame(x, y, z, k) {   // a lick of fire: white-yellow, then orange, then a dull red as it rises and dies
  const p = { x: x + (Math.random() - 0.5) * 6 * k, y, z: z + (Math.random() - 0.5) * 6 * k, vx: (Math.random() - 0.5) * 8, vy: 26 + Math.random() * 30, vz: (Math.random() - 0.5) * 8,
    t: 0, life: 0.35 + Math.random() * 0.4, size: (6 + Math.random() * 6) * k, r: 1, g: 0.8, b: 0.4, a: 0.7, kind: 0, grav: -10, drag: 2, fire: 1 };
  if (PS.length < MAXP - 64) PS.push(p);
}
const STATIC_PTS = [];   // drawn every frame without moving: eyes, glints, lamp glows (filled each frame)
function stat(x, y, z, size, r, g, b, a, kind = 0) { STATIC_PTS.push(x, y, z, size, r, g, b, a, kind); }
function flushPoints(dt) {
  let n = 0;
  for (let i = PS.length - 1; i >= 0; i--) {
    const p = PS[i]; p.t += dt;
    if (p.t >= p.life) { PS[i] = PS[PS.length - 1]; PS.pop(); continue; }
    const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy = p.vy * dr - p.grav * dt; p.vz *= dr;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
  }
  for (const p of PS) {
    const u = p.t / p.life;
    let r = p.r, g = p.g, b = p.b, a = p.a * (1 - u);
    if (p.fire) { r = 1; g = lerp(0.85, 0.28, u); b = lerp(0.45, 0.06, u); a = p.a * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08)); }
    pPos[n * 3] = p.x; pPos[n * 3 + 1] = p.y; pPos[n * 3 + 2] = p.z;
    pCol[n * 4] = r; pCol[n * 4 + 1] = g; pCol[n * 4 + 2] = b; pCol[n * 4 + 3] = a;
    pDat[n * 2] = p.fire ? p.size * (1 - 0.5 * u) : p.size; pDat[n * 2 + 1] = p.kind; n++;
  }
  const S = STATIC_PTS;
  for (let i = 0; i < S.length && n < MAXP; i += 9, n++) {
    pPos[n * 3] = S[i]; pPos[n * 3 + 1] = S[i + 1]; pPos[n * 3 + 2] = S[i + 2];
    pDat[n * 2] = S[i + 3]; pCol[n * 4] = S[i + 4]; pCol[n * 4 + 1] = S[i + 5]; pCol[n * 4 + 2] = S[i + 6]; pCol[n * 4 + 3] = S[i + 7]; pDat[n * 2 + 1] = S[i + 8];
  }
  S.length = 0;
  pGeo.setDrawRange(0, n);
  for (const k of ['position', 'pcol', 'pdat']) { const a = pGeo.attributes[k]; a.needsUpdate = true; a.clearUpdateRanges ? (a.clearUpdateRanges(), a.addUpdateRange(0, n * a.itemSize)) : (a.updateRange.offset = 0, a.updateRange.count = n * a.itemSize); }
}

// ---------------- your hands: the torch in the left, a blade in the right ----------------
const vmLight = { value: new V3(1, 0.9, 0.76) };
function vmMat(hex, em = 0) {
  const c = new THREE.Color(hex);
  return new THREE.ShaderMaterial({
    uniforms: { col: { value: new V3(c.r, c.g, c.b) }, em: { value: em }, vmL: vmLight },
    vertexShader: `varying vec3 vN; void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 col, vmL; uniform float em; varying vec3 vN;
      void main() { float l = 0.38 + 0.62 * max(dot(normalize(vN), normalize(vec3(0.25, 0.55, 0.8))), 0.0); gl_FragColor = vec4(col * mix(l * vmL, vec3(1.0), em), 1.0); }`,
  });
}
const vmEdge = new THREE.ShaderMaterial({
  side: THREE.BackSide, uniforms: { vmL: vmLight },
  vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * 0.16, 1.0); }`,
  fragmentShader: `uniform vec3 vmL; void main() { gl_FragColor = vec4(vec3(0.15, 0.15, 0.14) * vmL, 1.0); }`,
});
function vmPart(parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, edge = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m);
  if (edge) { const e = new THREE.Mesh(geo, vmEdge); m.add(e); }
  return m;
}
const SLEEVE = 0x56643f, GLOVE = 0x5e4532, STEEL = 0xb9bab3, METAL = 0x66655e;
const torchG = new THREE.Group(), bladeG = new THREE.Group();
vmScene.add(torchG); vmScene.add(bladeG);
{
  // the torch: a dark metal body with a wider head and a warm lens, held in a gloved fist; a green sleeve runs off screen
  const body = new THREE.CylinderGeometry(1.15, 1.0, 9, 10); body.rotateX(Math.PI / 2);
  const head = new THREE.CylinderGeometry(1.75, 1.2, 2.6, 12); head.rotateX(Math.PI / 2);
  const lens = new THREE.CircleGeometry(1.45, 16);
  vmPart(torchG, body, vmMat(METAL), 0, 0, 0);
  vmPart(torchG, head, vmMat(0x5a5850), 0, 0, -5.4);
  vmPart(torchG, lens, vmMat(0xfff1d8, 1), 0, 0, -6.72, 0, 0, 0, false);
  vmPart(torchG, new THREE.SphereGeometry(1.75, 10, 8), vmMat(GLOVE), 0.2, -0.7, 1.6);
  vmPart(torchG, cap(1.9, 12, false), vmMat(SLEEVE), -0.9, -1.6, 3.4, 1.9, 0, 0.45);
  // the blade: a short machete, steel catching the light, a wrapped grip
  const bl = new THREE.BoxGeometry(0.3, 10.5, 2.3, 1, 5, 1); bl.translate(0, 7.6, 0);
  const pos = bl.attributes.position; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), k = clamp((y - 2.4) / 10.5, 0, 1), z = pos.getZ(i); pos.setZ(i, z > 0 ? z * (1 + 0.25 * k) - 1.6 * Math.pow(k, 6) : z * (1 - 0.5 * k) + 0.9 * k * k); } bl.computeVertexNormals();
  vmPart(bladeG, bl, vmMat(STEEL), 0, 0, 0);
  vmPart(bladeG, new THREE.BoxGeometry(0.8, 0.6, 2.6), vmMat(0x4a4a44), 0, 2.2, 0);
  vmPart(bladeG, new THREE.CylinderGeometry(0.65, 0.75, 4.2, 8), vmMat(0x3b2d22), 0, -0.2, 0);
  vmPart(bladeG, new THREE.SphereGeometry(1.75, 10, 8), vmMat(GLOVE), 0, -0.4, 0.2);
  vmPart(bladeG, cap(1.9, 12, true), vmMat(SLEEVE), 0.5, -1.2, 1.2, 1.9, 0, -0.4);
}
// the lens glow, so the torch reads as lit even when the beam falls on nothing
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,215,1)'); gr.addColorStop(0.25, 'rgba(255,215,160,0.5)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const lensGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
lensGlow.scale.set(7, 7, 1); lensGlow.position.set(0, 0, -7.2); torchG.add(lensGlow);
// the swing's trail: a pale arc behind the blade's edge, fading fast
const TRAIL_N = 10;
const trailPos = new Float32Array(TRAIL_N * 2 * 3), trailA = new Float32Array(TRAIL_N * 2);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
trailGeo.setAttribute('ta', new THREE.BufferAttribute(trailA, 1).setUsage(THREE.DynamicDrawUsage));
{ const idx = []; for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } trailGeo.setIndex(idx); }
const trail = new THREE.Mesh(trailGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  vertexShader: `attribute float ta; varying float vA; void main() { vA = ta; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying float vA; void main() { gl_FragColor = vec4(vec3(0.95, 0.92, 0.85) * vA * 0.55, 1.0); }`,
}));
trail.frustumCulled = false; vmScene.add(trail);
const trailPts = [];   // recent [tip, base] pairs in view space

// ---------------- sound ----------------
let ac = null, master = null, sfx = null, muffle = null, ambG = null, burnG = null, burnPan = null;
const BUF = {};
function b64buf(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ac = new AC();
  muffle = ac.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 20000; muffle.connect(ac.destination);
  master = ac.createGain(); master.gain.value = SET.sound ? 1 : 0; master.connect(muffle);
  sfx = ac.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
  ambG = ac.createGain(); ambG.gain.value = 0.55; ambG.connect(master);
  for (const k in SND) ac.decodeAudioData(b64buf(SND[k]), b => { BUF[k] = b; if (k === 'burn') startBurnLoop(); }, () => {});
  ac.decodeAudioData(b64buf(AMB_SRC), b => { const s = ac.createBufferSource(); s.buffer = b; s.loop = true; s.connect(ambG); s.start(); }, () => {});
  const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; BUF.noise = nb;
}
function startBurnLoop() {   // the hiss of anything burning in your light, looped from the peak of Joe's spray recording
  const s = ac.createBufferSource(); s.buffer = BUF.burn; s.loop = true; s.loopStart = 0.38; s.loopEnd = 0.75;
  burnG = ac.createGain(); burnG.gain.value = 0; burnPan = ac.createStereoPanner ? ac.createStereoPanner() : null;
  s.connect(burnG); if (burnPan) { burnG.connect(burnPan); burnPan.connect(sfx); } else burnG.connect(sfx);
  s.start(0, 0.38);
}
// where a sound sits around you: panned left or right, quieter with distance, and muffled when it's behind you
function placeOut(x, z, vol, far = 650) {
  const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz);
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const side = d > 1 ? (dx * rx + dz * rz) / d : 0, front = d > 1 ? (dx * fx + dz * fz) / d : 1;
  const g = ac.createGain(); g.gain.value = vol * Math.pow(clamp(1 - d / far, 0, 1), 1.6);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = front < -0.2 ? 1300 + 1500 * (1 + front) : 9000;
  g.connect(lp);
  if (ac.createStereoPanner) { const pn = ac.createStereoPanner(); pn.pan.value = clamp(side * 0.9, -1, 1); lp.connect(pn); pn.connect(sfx); } else lp.connect(sfx);
  return g;
}
function playBuf(name, x, z, vol, rate = 1, far) {
  if (!ac || !BUF[name]) return;
  const s = ac.createBufferSource(); s.buffer = BUF[name]; s.playbackRate.value = rate;
  s.connect(x === null ? (() => { const g = ac.createGain(); g.gain.value = vol; g.connect(sfx); return g; })() : placeOut(x, z, vol, far)); s.start();
}
function noise(freq0, freq1, dur, vol, q = 1.2, type = 'bandpass') {
  if (!ac || !BUF.noise) return;
  const t = ac.currentTime, s = ac.createBufferSource(); s.buffer = BUF.noise;
  const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq0, t); f.frequency.exponentialRampToValueAtTime(freq1, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
function boom(f0, f1, dur, vol) {
  if (!ac) return;
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.02);
}

// ---------------- input ----------------
const IN = { mx: 0, my: 0, lx: 0, ly: 0, atk: false, atkHeld: false, dodge: false, flask: false, pause: false };
const keys = new Set();
let inputMode = TOUCH ? 'touch' : 'kb';
function setMode(m) { if (inputMode === m) return; inputMode = m; document.body.classList.toggle('touch', m === 'touch'); document.body.classList.toggle('pad', m === 'pad'); }
document.body.classList.toggle('touch', inputMode === 'touch');
addEventListener('keydown', e => {
  if (e.repeat) return; keys.add(e.code); setMode('kb');
  if (state !== 'play') { if ((e.code === 'Enter' || e.code === 'Space') && state === 'title' && ready) begin(); return; }
  if (e.code === 'Space' || e.code === 'KeyQ' || e.code === 'ShiftLeft') IN.dodge = true;
  if (e.code === 'KeyH' || e.code === 'KeyF') IN.flask = true;
  if (e.code === 'Escape' || e.code === 'KeyP') IN.pause = true;
  if (e.code === 'KeyJ') IN.atk = true;
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
// mouse: click the picture to take the mouse, then it looks; left click attacks, right click dodges
canvas.addEventListener('contextmenu', e => e.preventDefault());
$('touch').addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => {
  if (document.pointerLockElement && state === 'play') { IN.lx += e.movementX * 0.0022 * SET.sens; IN.ly += e.movementY * 0.0022 * SET.sens; }
});
addEventListener('mousedown', e => {
  if (state !== 'play' || inputMode === 'touch') return;
  if (!document.pointerLockElement) { (document.body.requestPointerLock || (() => {})).call(document.body); return; }
  if (e.button === 0) { IN.atk = true; IN.atkHeld = true; } if (e.button === 2) IN.dodge = true;
});
addEventListener('mouseup', e => { if (e.button === 0) IN.atkHeld = false; });
// touch: the left side is a stick that appears under your thumb; the right side looks; buttons sit bottom right
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, looks = new Map();
const tl = $('touch');
tl.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  setMode('touch'); e.preventDefault();
  if (state !== 'play') return;
  if (e.clientX < W * 0.42 && stick.id === null) { stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0; showStick(); }
  else looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { tl.setPointerCapture(e.pointerId); } catch (_) {}
});
function onMove(e) {
  if (e.pointerType === 'mouse') return;
  if (e.pointerId === stick.id) {
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const d = Math.hypot(dx, dy), R = 52;
    if (d > R * 1.6) { stick.ox += dx * (1 - R * 1.6 / d); stick.oy += dy * (1 - R * 1.6 / d); dx = e.clientX - stick.ox; dy = e.clientY - stick.oy; }   // the stick follows a thumb that wanders off it
    stick.x = clamp(dx / R, -1, 1); stick.y = clamp(dy / R, -1, 1); showStick(); return;
  }
  const L = looks.get(e.pointerId);
  if (L) { const k = 0.0058 * SET.sens; IN.lx += (e.clientX - L.x) * k; IN.ly += (e.clientY - L.y) * k; L.x = e.clientX; L.y = e.clientY; }
}
function onUp(e) {
  if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; $('stick').style.display = 'none'; }
  looks.delete(e.pointerId);
  if (e.pointerId === atkPointer) { atkPointer = null; IN.atkHeld = false; $('bAtk').classList.remove('on'); }
}
addEventListener('pointermove', onMove, { passive: true });
addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
function showStick() { const s = $('stick'); s.style.display = 'block'; s.style.left = stick.ox + 'px'; s.style.top = stick.oy + 'px'; $('knob').style.transform = `translate(${stick.x * 40}px, ${stick.y * 40}px)`; }
// the attack button also looks: press it and drag to turn while you swing
let atkPointer = null;
$('bAtk').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); setMode('touch'); IN.atk = true; IN.atkHeld = true; atkPointer = e.pointerId; looks.set(e.pointerId, { x: e.clientX, y: e.clientY }); $('bAtk').classList.add('on'); try { $('bAtk').setPointerCapture(e.pointerId); } catch (_) {} });
$('bDodge').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); IN.dodge = true; looks.set(e.pointerId, { x: e.clientX, y: e.clientY }); const b = $('bDodge'); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 140); try { b.setPointerCapture(e.pointerId); } catch (_) {} });
$('bFlask').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); IN.flask = true; });
// controller: left stick moves, right stick looks (with a gentle curve so small moves are fine and full tilt turns fast)
const padPrev = [];
function pollPad(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp || !gp.connected) continue;
    const dz = (x, y, d = 0.16) => { const m = Math.hypot(x, y); if (m < d) return [0, 0]; const k = Math.min(1, (m - d) / (1 - d)) / m; return [x * k, y * k]; };
    const [mx, my] = dz(gp.axes[0] || 0, gp.axes[1] || 0), [rx, ry] = dz(gp.axes[2] || 0, gp.axes[3] || 0, 0.12);
    const btn = i => gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.4);
    let any = Math.abs(mx) + Math.abs(my) + Math.abs(rx) + Math.abs(ry) > 0;
    for (let i = 0; i < gp.buttons.length; i++) if (btn(i)) any = true;
    if (any) setMode('pad');
    if (inputMode !== 'pad') continue;
    IN.mx += mx; IN.my += my;
    const mag = Math.hypot(rx, ry), curve = mag > 0 ? Math.pow(mag, 1.7) / mag : 0;
    padTurn = mag > 0.92 ? Math.min(1, padTurn + dt * 2.2) : Math.max(0, padTurn - dt * 6);   // held at full tilt it speeds up a little more
    IN.lx += rx * curve * (3.1 + 1.6 * padTurn) * SET.sens * dt; IN.ly += ry * curve * 2.2 * SET.sens * dt;
    const press = i => btn(i) && !padPrev[i];
    if (press(0) || press(7)) IN.atk = true;
    IN.atkHeld = IN.atkHeld || btn(0) || btn(7);
    if (press(1) || press(5)) IN.dodge = true;
    if (press(6) || press(3)) IN.flask = true;
    if (press(9)) { if (state === 'play') IN.pause = true; else if (state === 'pause') unpause(); else if (state === 'title' && ready) begin(); else if (state === 'dead') restart(); }
    if (press(0) && state === 'dead') restart();
    if (press(0) && state === 'title' && ready) begin();
    if (press(1) && state === 'pause') unpause();
    for (let i = 0; i < gp.buttons.length; i++) padPrev[i] = btn(i);
  }
}
let padTurn = 0;

// ---------------- the player ----------------
const P = { x: 0, z: -45, vx: 0, vz: 0, yaw: 0, pitch: -0.05, hp: 3, inv: 0, flasks: 3, kills: 0, time: 0,
  bob: 0, bobAmt: 0, tYaw: 0, tPitch: 0, dodgeT: 0, dodgeCd: 0, dx: 0, dz: 0, atk: null, buffer: 0, combo: 0, comboT: 0, drinkT: 0, ring: 0,
  stepSide: 1, lastStepPh: 0 };
let trauma = 0, hitstop = 0, fovKick = 0, roll = 0, dip = 0, hurtFx = 0, healFx = 0;
const ATK = [   // the 3-hit combo: two quick cuts, then a heavy overhead finisher that throws them back
  { dur: 0.3, hitAt: 0.12, dmg: 0.42, reach: 40, arc: 0.95, push: 70, lunge: 0 },
  { dur: 0.3, hitAt: 0.12, dmg: 0.42, reach: 40, arc: 0.95, push: 70, lunge: 0 },
  { dur: 0.5, hitAt: 0.22, dmg: 1.0, reach: 46, arc: 0.8, push: 190, lunge: 1 },
];

// ---------------- enemies ----------------
const E = [];
let spawnT = 4, eid = 0;
function spawnFoe(type, ang, dist) {
  const x = P.x + Math.sin(ang) * dist, z = P.z + Math.cos(ang) * dist;
  if (Math.hypot(x, z) > WORLD_R - 60 || Math.hypot(x, z) < CAMP_R + 30) return false;
  const near = colsNear(x, z, 30, _cols); for (const c of near) if (Math.hypot(c.x - x, c.z - z) < c.r + 10) return false;
  const F = FOES[type];
  E.push({ id: eid++, type, F, x, z, vx: 0, vz: 0, hp: F.hp, face: Math.atan2(P.x - x, P.z - z), st: 'chase', t: 0, ph: Math.random() * 6, gait: 0, beam: 0, burn: 0, pain: 0, flash: 0, die: 0, kx: 0, kz: 0, stepPh: 0, sc: F.h / 38, seen: 0 });
  return true;
}
const _cols = [];
function inBeam(x, y, z) {   // how strongly the torch falls on this point (0 none), not counting trees in the way
  const tp = LU.tPos.value, td = LU.tDir.value;
  const dx = x - tp.x, dy = y - tp.y, dz = z - tp.z, d = Math.hypot(dx, dy, dz);
  if (d > RANGE * 1.05 || d < 1) return d < 1 ? 1 : 0;
  const c = (dx * td.x + dy * td.y + dz * td.z) / d;
  if (c < Math.cos(HALF * 1.02)) return 0;
  return 1 - 0.5 * d / RANGE;
}
function blocked(ax, az, bx, bz) {   // is a tree trunk or rock between these two points?
  const mx = (ax + bx) / 2, mz = (az + bz) / 2, L = Math.hypot(bx - ax, bz - az);
  colsNear(mx, mz, L / 2 + 20, _cols);
  for (const c of _cols) {
    const ux = bx - ax, uz = bz - az, t = ((c.x - ax) * ux + (c.z - az) * uz) / (L * L);
    if (t < 0.04 || t > 0.94) continue;
    const px = ax + ux * t - c.x, pz = az + uz * t - c.z;
    if (px * px + pz * pz < c.r * c.r * 0.7) return true;
  }
  return false;
}
function pushOut(o, r) {   // slide around trunks and rocks rather than sticking on them
  colsNear(o.x, o.z, r + 30, _cols);
  for (const c of _cols) {
    const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
    if (d < m && d > 0.001) { o.x = c.x + dx / d * m; o.z = c.z + dz / d * m; }
  }
  const d = Math.hypot(o.x, o.z); if (d > WORLD_R - 30) { o.x *= (WORLD_R - 30) / d; o.z *= (WORLD_R - 30) / d; }
}
function hurtPlayer(from) {
  if (P.inv > 0 || P.dodgeT > 0.04) return false;
  P.hp--; P.inv = 1.1; trauma = Math.min(1, trauma + 0.75); hitstop = 0.07; hurtFx = 1;
  const dx = P.x - from.x, dz = P.z - from.z, d = Math.hypot(dx, dz) || 1; P.vx += dx / d * 160; P.vz += dz / d * 160;
  boom(90, 40, 0.4, 0.7); noise(1400, 300, 0.25, 0.35);
  if (navigator.vibrate) try { navigator.vibrate(60); } catch (_) {}
  padRumble(0.9, 220);
  if (P.hp <= 0) die();
  return true;
}
function padRumble(k, ms) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) try { gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: k, weakMagnitude: k * 0.6 }); } catch (_) {}
}
function killFoe(e) {
  e.st = 'dying'; e.die = 0; P.kills++;
  const cy = 20 * e.sc;
  for (let k = 0; k < 26; k++) spark(e.x, cy + (Math.random() - 0.5) * 20, e.z, (Math.random() - 0.5) * 120, 20 + Math.random() * 90, (Math.random() - 0.5) * 120, 0.5 + Math.random() * 0.7, 2.2 + Math.random() * 2.5, 1, 0.55 + Math.random() * 0.3, 0.2, 1, 0, 120, 2.5);
  for (let k = 0; k < 10; k++) flame(e.x, cy - 10 + Math.random() * 20, e.z, 1.2);
  playBuf('death', e.x, e.z, 0.9, 0.95 + Math.random() * 0.1);
  hudDirty = true;
}
function updateFoes(dt) {
  if (window.__freeze) return;
  const FX = -Math.sin(P.yaw), FZ = -Math.cos(P.yaw);
  let burnSum = 0, burnPanSum = 0;
  for (let i = E.length - 1; i >= 0; i--) {
    const e = E[i], F = e.F;
    if (e.st === 'dying') { e.die += dt; if (e.die > 1.1) E.splice(i, 1); continue; }
    const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz) || 1;
    // the torch: in the beam and not behind a tree, it burns and (for most) can't move
    let k = inBeam(e.x, 22 * e.sc, e.z);
    if (k > 0 && blocked(LU.tPos.value.x, LU.tPos.value.z, e.x, e.z)) k = 0;
    e.beam = k;
    if (k > 0) { e.hp -= dt * 0.42 * k * F.burnK; e.pain = Math.min(1, e.pain + dt * 5); e.seen = 1; }
    else e.pain = Math.max(0, e.pain - dt * 2.5);
    e.burn = lerp(e.burn, 1 - Math.max(0, e.hp) / F.hp, Math.min(1, dt * 6));
    if (k > 0 && Math.random() < dt * (10 + 30 * e.burn)) flame(e.x, (10 + Math.random() * 22) * e.sc, e.z, e.sc);
    burnSum += k; const side = (dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw)) / d; burnPanSum += -side * k;
    e.flash = Math.max(0, e.flash - dt * 6);
    if (e.hp <= 0) { killFoe(e); continue; }
    // the knock from your blows
    e.x += e.kx * dt; e.z += e.kz * dt; const kd = Math.exp(-8 * dt); e.kx *= kd; e.kz *= kd;
    e.t -= dt;
    const wantFace = Math.atan2(dx, dz);
    let sp = 0;
    if (e.st === 'chase') {
      const lit = k > 0;
      sp = F.sp * (lit ? F.lightSp : 1);
      if (!lit && d > 200) sp *= 1.25;   // out in the dark they close in faster
      if (d < F.reach * e.sc + 2 && (!lit || !F.stop)) { e.st = 'wind'; e.t = F.wind; }
    } else if (e.st === 'wind') {
      if (e.t <= 0) {
        e.st = 'strike'; e.t = 0.14;
        noise(700, 2200, 0.12, 0.25 * clamp(1 - d / 300, 0, 1));
        if (d < F.reach * e.sc + 10) hurtPlayer(e);
      }
    } else if (e.st === 'strike') { if (e.t <= 0) { e.st = 'recover'; e.t = 0.65; } }
    else if (e.st === 'recover' || e.st === 'stagger') { sp = e.st === 'recover' ? F.sp * 0.15 : 0; if (e.t <= 0) e.st = 'chase'; }
    const turn = e.st === 'wind' || e.st === 'strike' ? 5 : 7;
    e.face += clamp(angDiff(wantFace, e.face), -turn * dt, turn * dt);
    // steer: straight at you, bending round trunks in the way and keeping a little apart from each other
    let ux = dx / d, uz = dz / d;
    if (sp > 0) {
      colsNear(e.x, e.z, 44, _cols);
      for (const c of _cols) {
        const cx = c.x - e.x, cz = c.z - e.z, along = cx * ux + cz * uz;
        if (along < 0 || along > 44) continue;
        const lat = cx * -uz + cz * ux, need = c.r + 9;
        if (Math.abs(lat) < need) { const s = lat >= 0 ? -1 : 1, w = (1 - along / 44) * 1.4, px = -dz / d, pz = dx / d; ux += px * s * w; uz += pz * s * w; }
      }
      for (const o of E) if (o !== e && o.st !== 'dying') { const ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz); if (od < 18 && od > 0.01) { ux += ox / od * 0.8; uz += oz / od * 0.8; } }
      const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
      if (d < 16) sp = 0;   // it stops at your shoulder rather than standing in you
    }
    const tvx = ux * sp, tvz = uz * sp, ak = Math.min(1, dt * 8);
    e.vx += (tvx - e.vx) * ak; e.vz += (tvz - e.vz) * ak;
    e.x += e.vx * dt; e.z += e.vz * dt;
    pushOut(e, 8 * e.F.bulk);
    if (Math.hypot(e.x, e.z) < CAMP_R + 10) { const cd = Math.hypot(e.x, e.z); e.x *= (CAMP_R + 10) / cd; e.z *= (CAMP_R + 10) / cd; }   // the camp is safe ground
    const v = Math.hypot(e.vx, e.vz); e.gait = lerp(e.gait, Math.min(1.3, v / 40), Math.min(1, dt * 8));
    const prev = e.ph; e.ph += v / e.sc * dt * 0.21;
    // footsteps in the dark: the main way you know something is behind you
    if (Math.floor(prev / Math.PI) !== Math.floor(e.ph / Math.PI) && v > 8) playBuf(F.step, e.x, e.z, F.step === 'big' ? 0.75 : 0.5, (F.step === 'big' ? 0.8 : 1.05) + Math.random() * 0.12, 520);
  }
  if (burnG) { burnG.gain.setTargetAtTime(Math.min(0.55, burnSum * 0.35), ac.currentTime, 0.06); if (burnPan) burnPan.pan.setTargetAtTime(clamp(burnSum > 0 ? burnPanSum / burnSum : 0, -0.8, 0.8), ac.currentTime, 0.1); }
}
function spawner(dt) {
  if (P.ring === 0) return;
  const alive = E.filter(e => e.st !== 'dying').length;
  const tier = P.ring, age = P.time;
  const cap = Math.min(14, 2 + tier * 2 + Math.floor(age / 35));
  spawnT -= dt;
  if (spawnT > 0 || alive >= cap) return;
  spawnT = Math.max(1.2, 4.2 - tier * 0.6 - age / 60) * (0.7 + Math.random() * 0.6);
  const r = Math.random();
  const type = r < 0.1 * tier + (age > 60 ? 0.05 : 0) ? 'brute' : r < 0.1 * tier + 0.3 ? 'stalker' : 'shade';
  // out of the light: stalkers come from behind, the rest from anywhere you aren't looking
  for (let tries = 0; tries < 8; tries++) {
    const rel = type === 'stalker' ? Math.PI + (Math.random() - 0.5) * 1.6 : (Math.random() < 0.6 ? Math.PI : 0) + (Math.random() - 0.5) * 2.6;
    const ang = P.yaw + Math.PI + rel;   // yaw 0 looks toward -z; spawnFoe's angle 0 is +z
    if (spawnFoe(type, ang, 300 + Math.random() * 140)) break;
  }
}

// ---------------- the frame ----------------
const fwd = new V3(), right = new V3(), _v = new V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
function updatePlayer(dt, rdt) {
  // look: applied straight away and never slowed by hit-stop, so the camera always answers your hand
  let lx = IN.lx, ly = IN.ly * (SET.invert ? -1 : 1); IN.lx = IN.ly = 0;
  P.yaw -= lx; P.pitch = clamp(P.pitch - ly, -1.25, 1.2);
  // gentle aim help on the swing, so a phone thumb doesn't have to be exact
  let mx = 0, my = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  mx += stick.x + IN.mx; my += stick.y + IN.my; IN.mx = IN.my = 0;
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  const FX = -Math.sin(P.yaw), FZ = -Math.cos(P.yaw), RX = Math.cos(P.yaw), RZ = -Math.sin(P.yaw);
  P.time += dt; P.inv = Math.max(0, P.inv - dt); P.dodgeCd = Math.max(0, P.dodgeCd - dt);
  // dodge: a quick roll the way you're pushing (back if you aren't), untouchable for most of it
  if (IN.dodge && P.dodgeT <= 0 && P.dodgeCd <= 0) {
    let ddx = RX * mx - FX * my, ddz = RZ * mx - FZ * my; const dl = Math.hypot(ddx, ddz);
    if (dl < 0.2) { ddx = -FX; ddz = -FZ; } else { ddx /= dl; ddz /= dl; }
    P.dx = ddx; P.dz = ddz; P.dodgeT = 0.3; P.dodgeCd = 0.45; P.atk = null;
    noise(500, 1600, 0.22, 0.22); fovKick = Math.max(fovKick, 7);
    roll = (ddx * RX + ddz * RZ) * 0.09;
  }
  IN.dodge = false;
  let wantVX = 0, wantVZ = 0;
  if (P.dodgeT > 0) {
    P.dodgeT -= dt; const u = 1 - P.dodgeT / 0.3, sp = 340 * (1 - u * u) + 60;
    P.vx = P.dx * sp; P.vz = P.dz * sp; dip = Math.sin(Math.PI * u) * 6;
  } else {
    const back = my > 0 ? 0.72 : 1;
    const slow = P.atk ? 0.4 : P.drinkT > 0 ? 0.45 : 1;
    wantVX = (RX * mx * 0.92 - FX * my * back) * RUN * slow; wantVZ = (RZ * mx * 0.92 - FZ * my * back) * RUN * slow;
    const a = Math.min(1, dt * (ml > 0.05 ? 13 : 10));   // quick to start, quick to stop: about a tenth of a second either way
    P.vx += (wantVX - P.vx) * a; P.vz += (wantVZ - P.vz) * a;
    dip *= Math.exp(-dt * 10);
  }
  P.x += P.vx * dt; P.z += P.vz * dt; pushOut(P, P_R);
  // the combo
  if (IN.atk) P.buffer = 0.28; IN.atk = false;
  P.buffer -= dt; P.comboT -= dt;
  if (P.atk) {
    P.atk.t += dt; const A = ATK[P.atk.n];
    if (!P.atk.hit && P.atk.t >= A.hitAt) { P.atk.hit = true; swingHits(A); }
    if (P.atk.lunge > 0) { P.atk.lunge -= dt; P.x += P.atk.lx * dt; P.z += P.atk.lz * dt; pushOut(P, P_R); }
    const canChain = P.atk.t > A.dur * 0.62;
    if (P.atk.t >= A.dur || (canChain && P.buffer > 0 && P.atk.n < 2)) { const n = P.atk.n; P.atk = null; P.comboT = 0.5; if (P.buffer > 0 && n < 2) startSwing(n + 1); else P.combo = 0; }
  } else if (P.buffer > 0 && P.dodgeT <= 0 && P.drinkT <= 0) startSwing(P.comboT > 0 && P.combo < 2 ? P.combo + 1 : 0);
  // a flask: slow to drink, heals a heart
  if (IN.flask && P.flasks > 0 && P.hp < 3 && P.drinkT <= 0 && !P.atk) { P.drinkT = 0.75; noise(900, 400, 0.5, 0.1, 2, 'lowpass'); }
  IN.flask = false;
  if (P.drinkT > 0) { P.drinkT -= dt; if (P.drinkT <= 0) { P.flasks--; P.hp = Math.min(3, P.hp + 1); healFx = 1; hudDirty = true; boom(300, 600, 0.25, 0.15); } }
  // head bob from your stride, and your own footsteps
  const v = Math.hypot(P.vx, P.vz);
  P.bobAmt = lerp(P.bobAmt, P.dodgeT > 0 ? 0 : Math.min(1, v / RUN), Math.min(1, dt * 8));
  const prev = P.bob; P.bob += v * dt * 0.068;
  if (Math.floor(prev / Math.PI) !== Math.floor(P.bob / Math.PI) && v > 25 && ac && BUF.step) {
    const s = ac.createBufferSource(); s.buffer = BUF.step; s.playbackRate.value = 0.95 + Math.random() * 0.15;
    const g = ac.createGain(); g.gain.value = 0.32 + 0.25 * Math.min(1, v / RUN); s.connect(g); g.connect(sfx); s.start();
  }
  // the torch follows your view a beat behind, which is what makes it feel held
  P.tYaw += angDiff(P.yaw, P.tYaw) * Math.min(1, rdt * 15); P.tPitch += (P.pitch - P.tPitch) * Math.min(1, rdt * 15);
  // which ring of the woods you're in
  const ring = ringOf(Math.hypot(P.x, P.z));
  if (ring !== P.ring) { const was = P.ring; P.ring = ring; $('area').textContent = RINGS[ring][1]; if (ring > was && ring > 0) banner(RINGS[ring][1]); }
}
function startSwing(n) {
  const A = ATK[n]; P.combo = n; P.buffer = 0;
  P.atk = { n, t: 0, hit: false, lunge: 0, lx: 0, lz: 0, side: n === 1 ? -1 : 1 };
  noise(n === 2 ? 600 : 900, n === 2 ? 2600 : 3200, n === 2 ? 0.26 : 0.17, n === 2 ? 0.3 : 0.22);
  // lunge: if something is in front of you a few steps away, close the gap (and turn a touch toward it)
  const FX = -Math.sin(P.yaw), FZ = -Math.cos(P.yaw);
  let best = null, bd = 95;
  for (const e of E) if (e.st !== 'dying') {
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz), c = (dx * FX + dz * FZ) / (d || 1);
    if (d < bd && c > 0.72) { bd = d; best = e; }
  }
  if (best) {
    const dx = best.x - P.x, dz = best.z - P.z, d = Math.hypot(dx, dz);
    P.yaw += angDiff(Math.atan2(-dx, -dz), P.yaw) * 0.35;
    if (d > 30) { const T = 0.12, go = Math.min(d - 26, 60); P.atk.lunge = T; P.atk.lx = dx / d * go / T; P.atk.lz = dz / d * go / T; fovKick = Math.max(fovKick, 4); }
  }
}
function swingHits(A) {
  const FX = -Math.sin(P.yaw), FZ = -Math.cos(P.yaw);
  let any = false;
  for (const e of E) {
    if (e.st === 'dying') continue;
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
    if (d > A.reach + 8 * e.sc) continue;
    const a = Math.acos(clamp((dx * FX + dz * FZ) / (d || 1), -1, 1));
    if (a > A.arc) continue;
    any = true;
    e.hp -= A.dmg; e.flash = 1; e.kx += dx / (d || 1) * A.push * (e.type === 'brute' ? 0.4 : 1); e.kz += dz / (d || 1) * A.push * (e.type === 'brute' ? 0.4 : 1);
    if (e.st === 'wind' && e.type !== 'brute') { e.st = 'stagger'; e.t = 0.4; }   // the weaker ones are knocked out of their swing; brutes aren't
    else if (e.st === 'chase' || e.st === 'recover') { e.st = 'stagger'; e.t = e.type === 'brute' ? 0.12 : 0.28; }
    const hx = P.x + dx * 0.7, hz = P.z + dz * 0.7, hy = 24 * e.sc;
    for (let k = 0; k < 12; k++) spark(hx, hy, hz, (Math.random() - 0.5) * 160 - dx * 1.2, Math.random() * 110, (Math.random() - 0.5) * 160 - dz * 1.2, 0.18 + Math.random() * 0.22, 1.6 + Math.random() * 1.4, 1, 0.92, 0.75, 1, 0, 260, 3);
    spark(hx, hy, hz, 0, 0, 0, 0.09, 26, 1, 0.95, 0.85, 0.9, 1);
    if (e.hp <= 0) killFoe(e);
  }
  if (any) {
    const heavy = A.lunge; hitstop = heavy ? 0.085 : 0.05; trauma = Math.min(1, trauma + (heavy ? 0.42 : 0.22));
    boom(heavy ? 120 : 170, 50, heavy ? 0.22 : 0.14, heavy ? 0.55 : 0.4); noise(2500, 700, 0.1, 0.35, 0.9);
    padRumble(heavy ? 0.7 : 0.35, heavy ? 120 : 70);
  }
}

// ---------------- drawing the enemies ----------------
const _base = new M4(), _torso = new M4(), _m = new M4(), _t = new M4(), _t2 = new M4(), _p = new V3(), _s = new V3(1, 1, 1);
function rot(rx, ry, rz) { _e.set(rx, ry, rz, 'YXZ'); return _t.makeRotationFromEuler(_e); }
function child(out, parent, x, y, z, rx, ry, rz) { rot(rx, ry, rz); _t.setPosition(x, y, z); return out.multiplyMatrices(parent, _t); }
function drawFoes(now) {
  for (const e of E) {
    const F = e.F, sc = e.sc, tint = F.tint;
    const dying = e.st === 'dying' ? Math.min(1, e.die / 0.45) : 0;
    const b = Math.min(1, e.burn * 1.2 + e.pain * (0.12 + 0.18 * Math.random()) + dying);
    const mix3 = (c, kk, hot) => [lerp(c[0], hot[0], kk) / 255, lerp(c[1], hot[1], kk) / 255, lerp(c[2], hot[2], kk) / 255];
    const cl = (c, a) => c.map((v, i) => v + (tint[i] - v) * a);
    const fl = e.flash;
    let body = mix3(cl([218, 218, 211], 0.45), b, [255, 150, 60]), head = mix3(cl([228, 228, 222], 0.12), b, [255, 175, 90]), legs = mix3(cl([158, 158, 152], 0.5), b, [200, 90, 30]), face = mix3([70, 70, 68], b, [120, 40, 10]);
    if (fl > 0) { body = body.map(v => lerp(v, 1.6, fl)); head = head.map(v => lerp(v, 1.6, fl)); legs = legs.map(v => lerp(v, 1.4, fl)); }
    const em = b * (0.22 + 0.16 * Math.sin(now * 23 + e.id)) + fl * 0.8 + (dying ? 0.6 * (1 - dying) : 0);
    // pose
    const jit = (e.pain * 1.6 + (e.st === 'wind' ? 0.5 : 0)) * sc;
    const jx = (Math.random() - 0.5) * jit, jz = (Math.random() - 0.5) * jit;
    _s.set(sc * F.bulk, sc * (dying ? 1 - dying * 0.15 : 1), sc * F.bulk);
    _base.compose(_p.set(e.x + jx, -dying * 6, e.z + jz), _q.setFromEuler(_e.set(-dying * 1.45, e.face, 0, 'YXZ')), _s);
    const g = e.gait, sw = Math.sin(e.ph) * 0.75 * g;
    let lean = (e.type === 'stalker' ? 0.35 : 0) + g * 0.12, armL = -sw * 0.8, armR = sw * 0.8, armZ = 0.12, headX = 0, twist = 0;
    if (e.st === 'wind') {   // arms up and back, trembling, a white glint over its head just before the blow
      const u = 1 - e.t / F.wind; lean = -0.15 * u; armL = armR = lerp(-0.4, -2.75, Math.min(1, u * 1.6)); armZ = 0.35;
      if (e.t < 0.2) { const hp = 46 * sc * F.bulk; stat(e.x, hp, e.z, 9 + 6 * Math.sin(now * 40), 1, 1, 1, 1, 1); }
    } else if (e.st === 'strike') { lean = 0.55; armL = armR = -0.6; armZ = 0.15; }
    else if (e.st === 'recover') { lean = 0.45; armL = armR = 0.25; headX = 0.4; }
    else if (e.st === 'stagger') { lean = -0.35; armL = -1.2; armR = -0.9; armZ = 0.6; headX = -0.4; }
    if (e.pain > 0.05) {   // writhing in your light
      const w = e.pain; armL = lerp(armL, -1.9 + Math.sin(now * 17 + e.id) * 0.7, w); armR = lerp(armR, -2.2 + Math.cos(now * 15 + e.id) * 0.7, w);
      armZ = lerp(armZ, 0.7, w); twist = Math.sin(now * 11 + e.id) * 0.3 * w; headX = lerp(headX, -0.5, w); lean = lerp(lean, -0.2 + Math.sin(now * 9) * 0.15, w);
    }
    child(_torso, _base, 0, 17, 0, lean, twist, 0);
    PT.torso.push(_torso, body[0], body[1], body[2], em);
    child(_m, _torso, 0, 17.6, 0.6, headX + 0.15, 0, Math.sin(now * 13 + e.id) * 0.25 * e.pain);
    PT.head.push(_m, head[0], head[1], head[2], em);
    child(_t2, _m, 0, -0.2, 2.4, 0, 0, 0); PT.face.push(_t2, face[0], face[1], face[2], em * 0.5);
    // eyes, glowing in the dark: two pale points on the front of the head
    for (const sx of [-1.15, 1.15]) { _p.set(sx, 0.5, 3.75).applyMatrix4(_m); const lit = 1 - e.beam * 0.5; stat(_p.x, _p.y, _p.z, 2.6 * sc, 0.94, 0.94, 0.92, (0.9 * lit + 0.2) * (1 - dying), 0); }
    child(_m, _torso, -5.4, 12.2, 0, armL, 0, -armZ); PT.arm.push(_m, body[0] * 0.95, body[1] * 0.95, body[2] * 0.95, em);
    child(_m, _torso, 5.4, 12.2, 0, armR, 0, armZ); PT.arm.push(_m, body[0] * 0.95, body[1] * 0.95, body[2] * 0.95, em);
    child(_m, _base, -2.1, 17, 0, sw, 0, 0); PT.leg.push(_m, legs[0], legs[1], legs[2], em);
    child(_m, _base, 2.1, 17, 0, -sw, 0, 0); PT.leg.push(_m, legs[0], legs[1], legs[2], em);
  }
  for (const k in PT) PT[k].done();
}

// ---------------- lights each frame ----------------
const lamps = [];
function updateLights(now) {
  const L = LU.pl.value, C = LU.plc.value; let n = 0;
  const set = (x, y, z, r, cr, cg, cb) => { if (n >= NL) return; L[n].set(x, y, z, r); C[n].set(cr, cg, cb); n++; };
  // the campfire: big, warm, flickering
  const fk = 0.85 + 0.1 * Math.sin(now * 7.3) + 0.06 * Math.sin(now * 13.1 + 1) + 0.05 * Math.random();
  set(0, 24, 0, 330 * (0.96 + 0.04 * fk), 1.05 * fk, 0.62 * fk, 0.3 * fk);
  // a small glow round you, so your feet aren't lost
  set(P.x, 18, P.z, 95, 0.2, 0.17, 0.13);
  // lamps
  const cr = LU.camRight.value;
  for (const l of LAMPS) { const f = 0.92 + 0.08 * Math.sin(now * 5 + l.x), lx = l.x + cr.x * 12.8, lz = l.z + cr.z * 12.8; set(lx, 50, lz, 120, 0.6 * f, 0.4 * f, 0.2 * f); stat(lx, 51, lz, 14, 1, 0.72, 0.4, 0.55 * f, 0); stat(lx, 51, lz, 3.4, 1, 0.95, 0.8, 1, 0); }
  // the brightest few things burning
  const burning = E.filter(e => e.st !== 'dying' && e.burn > 0.15).sort((a, b) => b.burn - a.burn);
  for (const e of burning) set(e.x, 24 * e.sc, e.z, 70 + 60 * e.burn, 0.6 * e.burn, 0.3 * e.burn, 0.1 * e.burn);
  for (const e of E) if (e.st === 'dying' && e.die < 0.5) set(e.x, 20, e.z, 140, 0.9 * (1 - e.die * 2), 0.5 * (1 - e.die * 2), 0.18 * (1 - e.die * 2));
  for (; n < NL; n++) { L[n].set(0, -9999, 0, 1); C[n].set(0, 0, 0); }
  // the campfire's flames
  if (Math.random() < 0.75) flame((Math.random() - 0.5) * 12, 5, (Math.random() - 0.5) * 12, 1.05);
  if (Math.random() < 0.3) spark((Math.random() - 0.5) * 8, 14, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 14, 40 + Math.random() * 40, (Math.random() - 0.5) * 14, 1.2 + Math.random(), 1.5, 1, 0.6, 0.25, 1, 0, -6, 0.6);
  stat(0, 10, 0, 34, 1, 0.5, 0.18, 0.22 * fk, 0);
  // how lit you are, for your own hands
  const dC = Math.hypot(P.x, P.z), camp = clamp(1 - dC / 330, 0, 1);
  vmLight.value.set(0.92 + 0.45 * camp * camp, 0.82 + 0.28 * camp * camp, 0.7 + 0.12 * camp * camp);
}

// ---------------- the camera and your hands ----------------
let shakeT = 0;
function placeCamera(dt, rdt, now) {
  trauma = Math.max(0, trauma - rdt * 1.6); shakeT += rdt;
  const sh = trauma * trauma, nz = (s) => Math.sin(shakeT * 37 + s) * 0.6 + Math.sin(shakeT * 61 + s * 2) * 0.4;
  fovKick *= Math.exp(-rdt * 7); roll *= Math.exp(-rdt * 6);
  const bobY = Math.sin(P.bob * 2) * 1.1 * P.bobAmt, bobX = Math.cos(P.bob) * 0.7 * P.bobAmt;
  const FX = -Math.sin(P.yaw), FZ = -Math.cos(P.yaw), RX = Math.cos(P.yaw), RZ = -Math.sin(P.yaw);
  cam.position.set(P.x + RX * bobX + nz(1) * sh * 2, EYE + bobY - dip + nz(2) * sh * 2, P.z + RZ * bobX + nz(3) * sh * 2);
  cam.rotation.set(P.pitch + nz(4) * sh * 0.05, P.yaw + nz(5) * sh * 0.05, roll + nz(6) * sh * 0.06 - (P.vx * RX + P.vz * RZ) / RUN * 0.012);
  const baseFov = cam.aspect >= 1 ? 2 * Math.atan(Math.tan(48 * Math.PI / 180) / cam.aspect) * 180 / Math.PI : 78;
  cam.fov = baseFov + fovKick; cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  LU.camPos.value.copy(cam.position);
  LU.camRight.value.set(RX, 0, RZ);
  // the torch's light comes from your left hand and aims where you're looking, a beat behind
  const cp = Math.cos(P.tPitch), tdx = -Math.sin(P.tYaw) * cp, tdy = Math.sin(P.tPitch), tdz = -Math.cos(P.tYaw) * cp;
  const hand = LU.tPos.value.set(cam.position.x - RX * 6, cam.position.y - 6, cam.position.z - RZ * 6);
  _v.set(cam.position.x + tdx * 160 - hand.x, cam.position.y + tdy * 160 - hand.y, cam.position.z + tdz * 160 - hand.z).normalize();
  LU.tDir.value.copy(_v);
  // hands: they sway against your turning and bob with your stride
  const lagY = angDiff(P.tYaw, P.yaw), lagP = P.tPitch - P.pitch;
  const by = Math.sin(P.bob * 2) * 0.55 * P.bobAmt, bx = Math.cos(P.bob) * 0.45 * P.bobAmt;
  torchG.position.set((-8.4 + bx - lagY * 6) * vmX, -7.2 + by + lagP * 5 - dip * 0.12, -16);
  torchG.rotation.set(0.04 + lagP * 0.9 + 0.02, -0.08 + lagY * 0.9, 0.1);
  if (P.drinkT > 0) { const u = 1 - P.drinkT / 0.75, k = Math.sin(Math.PI * u); torchG.position.y -= k * 5; }
  // the blade: a held pose, then three different cuts
  if (window.__vmPose) P.atk = window.__vmPose;
  let px = 9.5 + bx, py = -8.6 + by - dip * 0.15, pz = -16, rx = -0.95, ry = 0.1, rz = 0.45;
  if (P.atk) {
    const A = ATK[P.atk.n], u = P.atk.t / A.dur, n = P.atk.n;
    const w = Math.min(1, u / 0.22), s = clamp((u - 0.22) / 0.3, 0, 1), r = clamp((u - 0.55) / 0.45, 0, 1);
    const es = 1 - Math.pow(1 - s, 3), er = r * r * (3 - 2 * r);
    let k0, k1;
    if (n === 0) { k0 = [11, -3, -13, -1.45, -0.8, -0.6]; k1 = [-9, -8.5, -15, -1.5, 1.1, 0.5]; }      // right to left
    else if (n === 1) { k0 = [-8, -4, -14, -1.45, 1.0, 0.8]; k1 = [11, -9, -14, -1.5, -1.0, -0.4]; }   // back across, left to right
    else { k0 = [3, 4, -12, 0.55, 0.1, -0.1]; k1 = [1, -12, -16, -2.2, 0.05, 0]; }                    // the overhead finisher
    const idle = [px, py, pz, rx, ry, rz], cur = [];
    for (let i = 0; i < 6; i++) { const a = lerp(idle[i], k0[i], w * w * (3 - 2 * w)), b = lerp(k0[i], k1[i], es); cur[i] = s <= 0 ? a : r <= 0 ? b : lerp(k1[i], idle[i], er); }
    [px, py, pz, rx, ry, rz] = cur;
  }
  bladeG.position.set((px - lagY * 6) * vmX, py + lagP * 5, pz); bladeG.rotation.set(rx + lagP * 0.9, ry + lagY * 0.9, rz);
  if (P.drinkT > 0) { const u = 1 - P.drinkT / 0.75, k = Math.sin(Math.PI * u); bladeG.position.y -= k * 9; }
  // the trail behind the edge while it cuts
  bladeG.updateMatrixWorld();
  const tip = new V3(0, 12.8, 0).applyMatrix4(bladeG.matrixWorld), mid = new V3(0, 7, 0).applyMatrix4(bladeG.matrixWorld);
  const cutting = P.atk && P.atk.t / ATK[P.atk.n].dur > 0.2 && P.atk.t / ATK[P.atk.n].dur < 0.6;
  if (cutting) trailPts.unshift({ tip, mid, a: 1 }); else if (trailPts.length) trailPts.unshift({ tip, mid, a: 0 });
  if (trailPts.length > TRAIL_N) trailPts.length = TRAIL_N;
  for (let i = 0; i < TRAIL_N; i++) {
    const t = trailPts[Math.min(i, trailPts.length - 1)];
    if (!t) { trailA[i * 2] = trailA[i * 2 + 1] = 0; continue; }
    trailPos.set([t.tip.x, t.tip.y, t.tip.z], i * 6); trailPos.set([t.mid.x, t.mid.y, t.mid.z], i * 6 + 3);
    const fa = t.a * (1 - i / TRAIL_N); trailA[i * 2] = fa; trailA[i * 2 + 1] = fa * 0.15;
  }
  trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.ta.needsUpdate = true;
  lensGlow.material.opacity = 0.7 + 0.1 * Math.sin(now * 9);
}

// ---------------- HUD ----------------
let hudDirty = true;
const HEART = (on) => `<svg viewBox="0 0 24 21"><path d="M12 20.5 2.4 11A6 6 0 0 1 12 3.6 6 6 0 0 1 21.6 11Z" fill="${on ? '#bdbdb6' : 'none'}" stroke="${on ? '#bdbdb6' : '#5a5a56'}" stroke-width="1.6"/></svg>`;
function drawHud() {
  if (!hudDirty) return; hudDirty = false;
  $('hearts').innerHTML = HEART(P.hp >= 1) + HEART(P.hp >= 2) + HEART(P.hp >= 3);
  $('stats').textContent = `${P.kills} burned · flasks ${P.flasks}/3`;
  $('bFlask').textContent = `Flask ${P.flasks}`; $('bFlask').classList.toggle('empty', P.flasks === 0);
  if (muffle) muffle.frequency.setTargetAtTime(P.hp === 1 ? 900 : 20000, ac.currentTime, 0.3);
}
let bannerT = null;
function banner(text) { const b = $('banner'); b.textContent = text; b.style.opacity = 1; clearTimeout(bannerT); bannerT = setTimeout(() => b.style.opacity = 0, 2600); }
// film grain, like the game's old film look: a noise tile nudged about every frame (cheap: the page just moves it)
{
  const g = $('grain').getContext('2d'), img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const gc = $('grain'); gc.style.width = 'calc(100vw + 128px)'; gc.style.height = 'calc(100vh + 128px)'; gc.style.imageRendering = 'pixelated';
  const tile = gc.toDataURL(); gc.getContext('2d').clearRect(0, 0, 256, 256);
  const div = document.createElement('div'); div.id = 'grain'; div.style.backgroundImage = `url(${tile})`; div.style.backgroundSize = '256px 256px'; gc.replaceWith(div);
}
const grainEl = $('grain');

// ---------------- states ----------------
let state = 'title';
function begin() {
  if (!ready) return;
  initAudio();
  state = 'play'; document.body.classList.add('playing');
  $('title').classList.remove('show');
  if (TOUCH) { const el = document.documentElement; const fs = el.requestFullscreen || el.webkitRequestFullscreen; if (fs) { try { const p = fs.call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
    try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (_) {} }
  else if (inputMode === 'kb') (document.body.requestPointerLock || (() => {})).call(document.body);
  // build every shader now (with an enemy and a spark in view) so nothing stutters the first time one appears
  try { for (const k in PT) PT[k].mesh.count = PT[k].edge.count = 1; renderer.compile(scene, cam); renderer.compile(vmScene, vmCam); for (const k in PT) PT[k].mesh.count = PT[k].edge.count = 0; } catch (_) {}
  banner('camp');
  setTimeout(() => { if (state === 'play' && P.ring === 0) banner('the woods are that way'); }, 3000);
  last = performance.now();
}
function pause() { if (state !== 'play') return; state = 'pause'; $('pause').classList.add('show'); syncSet(); if (document.pointerLockElement) document.exitPointerLock(); if (ac) ac.suspend(); }
function unpause() { state = 'play'; $('pause').classList.remove('show'); if (ac) ac.resume(); last = performance.now(); if (inputMode === 'kb') (document.body.requestPointerLock || (() => {})).call(document.body); }
function die() {
  state = 'dead'; document.body.classList.remove('playing');
  const m = Math.floor(P.time / 60), s = Math.floor(P.time % 60);
  $('deadS').textContent = `${P.kills} burned · ${m}:${String(s).padStart(2, '0')} in the woods`;
  setTimeout(() => $('dead').classList.add('show'), 700);
  if (document.pointerLockElement) document.exitPointerLock();
}
function restart() {
  E.length = 0; PS.length = 0;
  Object.assign(P, { x: 0, z: -45, vx: 0, vz: 0, yaw: 0, pitch: -0.05, hp: 3, inv: 0, flasks: 3, kills: 0, time: 0, dodgeT: 0, atk: null, buffer: 0, drinkT: 0, ring: 0, tYaw: 0, tPitch: 0 });
  $('area').textContent = 'camp'; spawnT = 4; hudDirty = true;
  $('dead').classList.remove('show'); $('pause').classList.remove('show');
  state = 'play'; document.body.classList.add('playing'); if (ac) ac.resume(); last = performance.now();
}
$('begin').addEventListener('click', begin);
$('bMenu').addEventListener('click', () => pause());
$('resume').addEventListener('click', unpause);
$('restart').addEventListener('click', restart);
$('again').addEventListener('click', restart);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
function syncSet() {
  $('sSens').value = SET.sens;
  for (const b of document.querySelectorAll('#sQual .tab')) b.setAttribute('aria-pressed', b.dataset.q === SET.quality ? 'true' : 'false');
  $('sInv').setAttribute('aria-pressed', SET.invert ? 'true' : 'false');
  $('sFps').setAttribute('aria-pressed', SET.fps ? 'true' : 'false');
  $('sSnd').setAttribute('aria-pressed', SET.sound ? 'true' : 'false');
  document.body.classList.toggle('showfps', SET.fps);
}
$('sSens').addEventListener('input', e => { SET.sens = +e.target.value; saveSet(); });
for (const b of document.querySelectorAll('#sQual .tab')) b.addEventListener('click', () => {
  SET.quality = b.dataset.q; saveSet();
  pixK = SET.quality === 'fast' ? Math.min(DPR, 0.8) : SET.quality === 'sharp' ? QCAP : Math.min(QCAP, TOUCH ? 1.25 : 1.5);
  resize(); syncSet();
});
$('sInv').addEventListener('click', () => { SET.invert = !SET.invert; saveSet(); syncSet(); });
$('sFps').addEventListener('click', () => { SET.fps = !SET.fps; saveSet(); syncSet(); });
$('sSnd').addEventListener('click', () => { SET.sound = !SET.sound; saveSet(); syncSet(); if (master) master.gain.value = SET.sound ? 1 : 0; });
syncSet();
$('how').innerHTML = TOUCH
  ? '<div><b>Left thumb</b> anywhere on the left moves</div><div><b>Right thumb</b> drags to look · <b>Attack</b> also drags to look</div><div><b>Dodge</b> rolls the way you\'re moving</div><div>A controller works too: plug it in or pair it and press a button</div>'
  : '<div><b>WASD</b> move · <b>mouse</b> look · <b>click</b> attack</div><div><b>Space / Q / right click</b> dodge · <b>H</b> flask · <b>Esc</b> menu</div><div><b>Controller</b>: left stick move, right stick look, RT or A attack, B dodge, LT flask</div>';

// ---------------- the loop, and keeping the frame rate up ----------------
let last = performance.now(), fpsAcc = 0, fpsN = 0, fpsShow = 0, slowT = 0, fastT = 0, lastDrop = -99;
function autoQuality(rawDt, now) {
  fpsAcc += rawDt; fpsN++;
  if (fpsAcc >= 0.5) {
    const fps = fpsN / fpsAcc; fpsShow = fps; fpsAcc = 0; fpsN = 0;
    $('fps').textContent = `${Math.round(fps)} fps · ${pixK.toFixed(2)}x`;
    if (SET.quality === 'auto' && state === 'play') {
      if (fps < 52) { slowT++; fastT = 0; } else if (fps > 57) { fastT++; slowT = 0; } else { slowT = 0; fastT = 0; }
      if (slowT >= 2 && pixK > 0.55) { pixK = Math.max(0.55, pixK * 0.85); resize(); slowT = 0; lastDrop = now; }
      if (fastT >= 8 && pixK < QCAP && now - lastDrop > 12) { pixK = Math.min(QCAP, pixK * 1.08); resize(); fastT = 0; }
    }
  }
}
function frame(t) {
  requestAnimationFrame(frame);
  const now = t / 1000, rawDt = Math.min(0.1, Math.max(0, (t - last) / 1000)); last = t;
  const rdt = Math.min(rawDt, 1 / 20);
  pollPad(rdt);
  LU.time.value = now;
  if (state === 'play') {
    if (IN.pause) { IN.pause = false; pause(); }
    let dt = rdt;
    if (hitstop > 0) { hitstop -= rdt; dt *= 0.06; }
    updatePlayer(dt, rdt);
    updateFoes(dt);
    spawner(dt);
    autoQuality(rawDt, now);
  } else { IN.atk = IN.dodge = IN.flask = IN.pause = false; IN.lx = IN.ly = 0; if (state === 'title') { P.yaw += rdt * 0.05; } }
  updateLights(now);
  placeCamera(rdt, rdt, now);
  drawFoes(now);
  flushPoints(state === 'play' && hitstop > 0 ? rdt * 0.06 : rdt);
  hurtFx = Math.max(0, hurtFx - rdt * 1.6); healFx = Math.max(0, healFx - rdt * 1.4);
  $('hurt').style.opacity = Math.max(hurtFx, P.hp === 1 && state === 'play' ? 0.25 + 0.1 * Math.sin(now * 4) : 0);
  $('heal').style.opacity = healFx;
  grainEl.style.transform = `translate(${(Math.random() * 64 - 64) | 0}px, ${(Math.random() * 64 - 64) | 0}px)`;
  drawHud();
  renderer.clear();
  renderer.render(scene, cam);
  if (state === 'play' || state === 'pause') { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
}
addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);
window.__fp = { P, E, spawnFoe, begin, LU, renderer, step(n, dt = 1 / 60, fn) { for (let i = 0; i < n; i++) { if (fn) fn(i); updatePlayer(dt, dt); updateLights(i * dt); placeCamera(dt, dt, i * dt); updateFoes(dt); spawner(dt); flushPoints(dt); } }, get fps() { return fpsShow; }, get pixK() { return pixK; }, cam, IN };
