// ================= the first-person view of Daylight =================
// Everything here draws, hears and steers. What happens in the woods is the main game's own code (src/ported.js).
// Ground coordinates are the game's (x, y); in 3D they are (x, height, y). A person is 38 tall; your eyes are at 35.
const ATLAS_SRC = '/*ATLAS*/', ATLAS = /*ATLASMETA*/0, FLOOR_SRC = '/*FLOOR*/', SND = /*SND*/0, AMB_SRC = '/*AMB*/';
const V3 = THREE.Vector3, V4 = THREE.Vector4, M4 = THREE.Matrix4;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, k) => a + (b - a) * k;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hex = (h, k = 1) => { const c = new THREE.Color(h); return [c.r * k, c.g * k, c.b * k]; };
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------- settings ----------------
const SET = { sens: 1, invert: false, fps: false, quality: 'auto', sound: true, colour: true, fov: 104, view: 'first' };
try { Object.assign(SET, JSON.parse(localStorage.getItem('behind-you-fp') || '{}')); } catch (e) {}
const saveSet = () => { try { localStorage.setItem('behind-you-fp', JSON.stringify(SET)); } catch (e) {} };
COLOUR = SET.colour !== false;

// ---------------- the numbers that are the first-person view's own ----------------
const EYE = 35, TREE_K = 1.75, ROCK_K = 1.5, VIEW = 950;
const FOE_SIZE = 1;   // figures are drawn at the game's own heights

// ---------------- renderer ----------------
const canvas = $('gl');
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const DPR = Math.min(window.devicePixelRatio || 1, 3);
const AA = SET.quality !== 'fast';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: AA, powerPreference: 'high-performance', stencil: false, alpha: false });
renderer.autoClear = false;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // colours pass straight through, as in the 2D game
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
const scene = new THREE.Scene(), vmScene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(70, 1, 2, 1400), vmCam = new THREE.PerspectiveCamera(58, 1, 0.5, 100);
cam.rotation.order = 'YXZ';
const QCAP = TOUCH ? Math.min(DPR, 1.6) : Math.min(DPR, 2);
let pixK = SET.quality === 'fast' ? Math.min(DPR, 0.8) : SET.quality === 'sharp' ? QCAP : Math.min(QCAP, TOUCH ? 1.25 : 1.5);
let VW = 1, VH = 1, vmX = 1;
// field of view: the setting is how wide you see across a landscape screen; held upright, the same setting widens the view up and down
const baseFov = () => cam.aspect >= 1 ? 2 * Math.atan(Math.tan(SET.fov / 2 * Math.PI / 180) / cam.aspect) * 180 / Math.PI : clamp(78 + (SET.fov - 96) * 0.6, 62, 96);
function resize() {
  VW = window.innerWidth; VH = window.innerHeight; W = VW; H = VH;
  renderer.setPixelRatio(pixK); renderer.setSize(VW, VH, false);
  const asp = VW / VH;
  cam.aspect = vmCam.aspect = asp;
  cam.fov = baseFov(); vmCam.fov = asp >= 1 ? 56 : 98;
  vmX = clamp(16 * Math.tan(vmCam.fov * Math.PI / 360) * asp / 18.4, 0.42, 1);   // held upright, the hands come in toward the middle so both stay on screen
  cam.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
  PU.uScale.value = VH * pixK * 0.5 * cam.projectionMatrix.elements[5];
  ovResize();
}

// ---------------- light: one function every surface shares ----------------
// By day: the sun, a warm wash like the 2D game's, and haze in the distance. As it sets the light goes red, then it is properly
// dark, lit only by your torch (the pre-v72 beam: soft-edged, no hot core), your fires, lamps and anything burning.
const NL = 12;
const LU = {
  tPos: { value: new V3() }, tDir: { value: new V3(0, 0, -1) }, tCone: { value: new THREE.Vector2(Math.cos(0.38 * 1.12), Math.cos(0.38 * 0.5)) },
  tRange: { value: RANGE * 1.25 }, tCol: { value: new V3(1.0, 0.88, 0.7) }, amb: { value: new V3(1, 1, 1) },
  sunDir: { value: new V3(-0.4, 0.75, -0.5).normalize() }, sunK: { value: 1 },
  shMap: { value: null }, shM: { value: new M4() }, shP: { value: new V4(0, 1 / 2048, 0.002, 0) }, shC: { value: new V4(0, 0, 1, 0) },
  pl: { value: Array.from({ length: NL }, () => new V4(0, -999, 0, 1)) }, plc: { value: Array.from({ length: NL }, () => new V3()) }, plN: { value: 0 },
  fogCol: { value: new V3(0.8, 0.82, 0.8) }, fogR: { value: new THREE.Vector2(420, 950) },
  time: { value: 0 }, camPos: { value: new V3() }, camRight: { value: new V3(1, 0, 0) }, colourK: { value: 1 },
};
const LIGHT_GLSL = `
uniform vec3 tPos, tDir, tCol, amb, sunDir, fogCol, camPos; uniform vec2 tCone, fogR; uniform float tRange, sunK, plN, colourK;
uniform vec4 pl[${NL}]; uniform vec3 plc[${NL}];
uniform sampler2D shMap; uniform mat4 shM; uniform vec4 shP, shC;
// the sun's shadow (13-sun.js): 1 in the open, down toward shP.x's share in the shade of whatever stands between here and the sun
float sunShade(vec3 p) {
  if (shP.x < 0.005) return 1.0;
  vec3 s = (shM * vec4(p, 1.0)).xyz * 0.5 + 0.5;
  float e = smoothstep(0.5, 0.4, max(abs(s.x - 0.5), abs(s.y - 0.5)));
  if (e <= 0.0) return 1.0;
  float d = s.z - shP.z, o = shP.y, k = 0.0;
  k += step(texture2D(shMap, s.xy).r, d);
  k += step(texture2D(shMap, s.xy + vec2(o, o * 0.4)).r, d); k += step(texture2D(shMap, s.xy - vec2(o, o * 0.4)).r, d);
  k += step(texture2D(shMap, s.xy + vec2(-o * 0.4, o)).r, d); k += step(texture2D(shMap, s.xy - vec2(-o * 0.4, o)).r, d);
  return 1.0 - shP.x * e * k * 0.2;
}
vec3 lightAt(vec3 p, vec3 n, float useN) {
  float sun = mix(1.0, 0.7 + 0.45 * max(dot(n, sunDir), 0.0), useN * sunK);
  vec3 c = amb * sun * sunShade(p + n * 0.6);
  vec3 L = p - tPos; float d = length(L); vec3 l = L / max(d, 0.001);
  float cone = smoothstep(tCone.x, tCone.y, dot(l, tDir));
  float fall = clamp(1.0 - 0.5 * d / tRange, 0.0, 1.0) * smoothstep(tRange, tRange * 0.62, d);
  float lam = mix(1.0, clamp(dot(n, -l) * 0.55 + 0.6, 0.0, 1.0), useN);
  c += tCol * (cone * fall * lam);
  if (plN > 0.5) for (int i = 0; i < ${NL}; i++) { vec4 q = pl[i]; float k = clamp(1.0 - distance(p, q.xyz) / q.w, 0.0, 1.0); c += plc[i] * (k * k); }
  return c;
}
float slopeLit(vec3 n) { return 1.0 + (dot(n, sunDir) - sunDir.y) * (0.25 + 1.15 * sunK) + (n.y - 1.0) * 0.6; }
vec3 grey(vec3 c) { float g = dot(c, vec3(0.3, 0.55, 0.15)); return mix(vec3(g), c, colourK); }
vec3 fogged(vec3 c, vec3 p) { return mix(c, fogCol, smoothstep(fogR.x, fogR.y, distance(p.xz, camPos.xz))); }`;

// ---------------- the lie of the land: rolling hills ----------------
// One height for every point of the woods, worked out the same way here and on the graphics card, so the ground, the grass,
// every tree, the camp, the raiders and you all stand on the same slopes. A few broad swells with smaller rises over them;
// the camp, the raiders' camps and the ponds sit on level ground let into the hillside.
const TERR_N = 8;
LU.terrF = { value: Array.from({ length: TERR_N }, () => new V4(0, 0, 0, 0)) };   // level places: x, y, radius, height
function terrBase(x, z) {
  return 24 * Math.sin(x * 0.0061 + 1.3) * Math.sin(z * 0.0053 + 0.4) + 11 * Math.sin(x * 0.013 + z * 0.0081) * Math.cos(z * 0.0117 - x * 0.004) + 3 * Math.sin(x * 0.031 + 2.0) * Math.sin(z * 0.027 + 1.0);
}
const _sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function terrH(x, z) {
  let h = terrBase(x, z);
  for (const f of LU.terrF.value) if (f.z > 0) h = lerp(h, f.w, _sst(f.z * 1.9, f.z, Math.hypot(x - f.x, z - f.y)));
  return h;
}
const TERR_GLSL = `uniform vec4 terrF[${TERR_N}];
float terrBase(vec2 p) { return 24.0 * sin(p.x * 0.0061 + 1.3) * sin(p.y * 0.0053 + 0.4) + 11.0 * sin(p.x * 0.013 + p.y * 0.0081) * cos(p.y * 0.0117 - p.x * 0.004) + 3.0 * sin(p.x * 0.031 + 2.0) * sin(p.y * 0.027 + 1.0); }
float terrLevel(vec2 p, inout float h) {   // pulls h onto any level place here; returns how level it is
  float lv = 0.0;
  for (int i = 0; i < ${TERR_N}; i++) { vec4 f = terrF[i]; if (f.z <= 0.0) continue; float k = smoothstep(f.z * 1.9, f.z, distance(p, f.xy)); h = mix(h, f.w, k); lv = max(lv, k); }
  return lv;
}
float terrH(vec2 p) { float h = terrBase(p); terrLevel(p, h); return h; }
// the ground's slope as a normal (from the swells themselves; flat where the land's been levelled)
vec3 terrN(vec2 p) {
  float a = p.x * 0.0061 + 1.3, b = p.y * 0.0053 + 0.4, u = p.x * 0.013 + p.y * 0.0081, v = p.y * 0.0117 - p.x * 0.004, c = p.x * 0.031 + 2.0, d = p.y * 0.027 + 1.0;
  float dx = 24.0 * 0.0061 * cos(a) * sin(b) + 11.0 * (0.013 * cos(u) * cos(v) + 0.004 * sin(u) * sin(v)) + 3.0 * 0.031 * cos(c) * sin(d);
  float dz = 24.0 * 0.0053 * sin(a) * cos(b) + 11.0 * (0.0081 * cos(u) * cos(v) - 0.0117 * sin(u) * sin(v)) + 3.0 * 0.027 * sin(c) * cos(d);
  float h = 0.0, lv = terrLevel(p, h);
  return normalize(vec3(-dx * (1.0 - lv), 1.0, -dz * (1.0 - lv)));
}`;
// which places are level: the camp, the nearest raiders' camps and ponds (re-chosen as you move about)
function terrLevelSync(px, py, lakes) {
  const L = [];
  L.push([0, 0, CAMP_R + 55, terrBase(0, 0)]);
  for (const C of dayCampList()) { const o = C.parts && C.parts[0] ? C.parts[0] : C; L.push([o.x, o.y, 120, terrBase(o.x, o.y)]); }
  for (const P of lakes || []) L.push([P.x, P.y, P.rad * 1.25 + 8, terrBase(P.x, P.y) - 3]);
  L.sort((a, b) => Math.hypot(a[0] - px, a[1] - py) - a[2] - (Math.hypot(b[0] - px, b[1] - py) - b[2]));
  LU.terrF.value.forEach((v, i) => { const q = L[i]; if (q && Math.hypot(q[0] - px, q[1] - py) - q[2] * 1.9 < VIEW + 300) v.set(q[0], q[1], q[2], q[3]); else v.set(0, 0, 0, 0); });
}


// ---------------- textures ----------------
let pending = 2, ready = false;
function loaded() { if (--pending === 0) { ready = true; onReady(); } }
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

// ---------------- the sky: a dome that follows you, from haze at the horizon to clear overhead ----------------
const SKY = { top: new V3(), hor: new V3() };
{
  const g = new THREE.SphereGeometry(1200, 24, 12);
  const m = new THREE.ShaderMaterial({
    uniforms: { top: { value: SKY.top }, hor: { value: SKY.hor }, sunDir: LU.sunDir, sunK: LU.sunK, colourK: LU.colourK }, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vD; void main() { vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 top, hor, sunDir; uniform float sunK, colourK; varying vec3 vD;
      void main() { float h = clamp(vD.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(h, 0.6));
        float s = max(dot(vD, sunDir), 0.0); c += vec3(1.0, 0.85, 0.6) * (pow(s, 600.0) * 1.5 + pow(s, 12.0) * 0.18) * sunK;
        float g = dot(c, vec3(0.3, 0.55, 0.15)); gl_FragColor = vec4(mix(vec3(g), c, colourK), 1.0); }`,
  });
  var skyMesh = new THREE.Mesh(g, m); skyMesh.frustumCulled = false; skyMesh.renderOrder = -10; scene.add(skyMesh);
}

// ---------------- the ground ----------------
{
  const g = new THREE.PlaneGeometry(2800, 2800, 280, 280); g.rotateX(-Math.PI / 2);   // follows you, in 10-unit steps (90-main)
  const m = new THREE.ShaderMaterial({
    uniforms: Object.assign({ map: { value: floorTex } }, LU),
    vertexShader: TERR_GLSL + `varying vec3 vW, vTN; void main() { vec4 w = modelMatrix * vec4(position, 1.0); w.y = terrH(w.xz); vTN = terrN(w.xz); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: LIGHT_GLSL + `uniform sampler2D map, mask; uniform vec2 mo; uniform float ms; varying vec3 vW, vTN;
      void main() { vec3 t = texture2D(map, vW.xz / 384.0).rgb;
        float gm = texture2D(mask, (vW.xz - mo) / ms).r;   // under the turf the ground is green too, bare where the grass stops (ponds, floors, fires)
        t = mix(t, vec3(0.34, 0.42, 0.19) * (0.8 + 0.4 * t.r), 0.55 * smoothstep(0.2, 0.8, gm));
        gl_FragColor = vec4(fogged(grey(t * lightAt(vW, vec3(0.0, 1.0, 0.0), 0.0) * 1.12 * slopeLit(normalize(vTN))), vW), 1.0); }`,
  });
  var groundMesh = new THREE.Mesh(g, m); groundMesh.frustumCulled = false; scene.add(groundMesh);
}
