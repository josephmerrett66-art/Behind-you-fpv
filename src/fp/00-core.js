// ================= the first-person view of Daylight =================
// Everything here draws, hears and steers. What happens in the woods is the main game's own code (src/ported.js).
// Ground coordinates are the game's (x, y); in 3D they are (x, height, y). A person is 38 tall; your eyes are at 35.
const ATLAS_SRC = '/*ATLAS*/', ATLAS = /*ATLASMETA*/0, FLOOR_SRC = '/*FLOOR*/', SND = /*SND*/0, AMB_SRC = '/*AMB*/', VOX = /*VOX*/0;
const V3 = THREE.Vector3, V4 = THREE.Vector4, M4 = THREE.Matrix4;
const BEACH = /*BEACH*/true;   // the island's coast and the sea round it (Joe); BEACH=0 node build.js builds the old endless woods
const NIGHT_FOES = false;   // the night's own monsters (the wanderers, the tall one in the deep, the raid on a pen): off (Joe)
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, k) => a + (b - a) * k;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hex = (h, k = 1) => { const c = new THREE.Color(h); return [c.r * k, c.g * k, c.b * k]; };
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------- settings ----------------
const SET = { sens: 1, invert: false, fps: false, quality: 'auto', sound: true, colour: true, fov: 104, view: 'first', isoZoom: 1.7, ink: true };
try { Object.assign(SET, JSON.parse(localStorage.getItem('behind-you-fp') || '{}')); } catch (e) {}
const saveSet = () => { try { localStorage.setItem('behind-you-fp', JSON.stringify(SET)); } catch (e) {} };
COLOUR = SET.colour !== false;

// ---------------- the numbers that are the first-person view's own ----------------
const EYE = 35, TREE_K = 1.75, ROCK_K = 1.5, VIEW = 950, VIEW_ISO = 1500;
const drawR = () => SET.view === 'iso' ? VIEW_ISO : VIEW;   // how far the woods are drawn: further from above, where you see more of them
const FOE_SIZE = 1;   // figures are drawn at the game's own heights

// ---------------- renderer ----------------
const canvas = $('gl');
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const DPR = Math.min(window.devicePixelRatio || 1, 3);
const AA = SET.quality !== 'fast';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: AA, powerPreference: 'high-performance', stencil: false, alpha: false });
renderer.debug.checkShaderErrors = /[?&]debug/.test(location.search);   // reading back each new shader's log stalls the frame it first appears in
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
  if (typeof inkResize === 'function') inkResize();
  PU.uScale.value = VH * pixK * 0.5 * cam.projectionMatrix.elements[5];
  ovResize();
  // the menus are laid out for a phone; on a laptop or a TV they're scaled up to fill the screen so they can be read from a seat
  document.documentElement.style.setProperty('--uiz', clamp(Math.min(VW / 920, VH / 560), 1, 2.4).toFixed(3));
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
  landT: { value: AREA.tex }, time: { value: 0 }, camPos: { value: new V3() }, fogC: { value: new V3() }, camRight: { value: new V3(1, 0, 0) }, colourK: { value: 1 },
};
const LIGHT_GLSL = `
uniform vec3 tPos, tDir, tCol, amb, sunDir, fogCol, camPos, fogC; uniform vec2 tCone, fogR; uniform float tRange, sunK, plN, colourK;
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
  if (plN > 0.5) for (int i = 0; i < ${NL}; i++) { vec4 q = pl[i]; float k = clamp(1.0 - distance(p, q.xyz) / q.w, 0.0, 1.0); c += plc[i] * (k * k) * mix(1.0, 0.3 + 0.9 * max(dot(n, normalize(q.xyz - p)), 0.0), useN); }   // a firelit side and a dark side
  return c;
}
float slopeLit(vec3 n) { return 1.0 + (dot(n, sunDir) - sunDir.y) * (0.25 + 1.15 * sunK) + (n.y - 1.0) * 0.6; }
vec3 grey(vec3 c) { float g = dot(c, vec3(0.3, 0.55, 0.15)); return mix(vec3(g), c, colourK); }
vec3 fogged(vec3 c, vec3 p) { return mix(c, fogCol, smoothstep(fogR.x, fogR.y, distance(p.xz, fogC.xz))); }`;   // the haze is measured from you (from above, not from the camera)

// ---------------- the lie of the land: rolling hills ----------------
// One height for every point of the woods, worked out the same way here and on the graphics card, so the ground, the grass,
// every tree, the camp, the raiders and you all stand on the same slopes. A few broad swells with smaller rises over them;
// the camp, the raiders' camps and the ponds sit on level ground let into the hillside.
const TERR_N = 8;
LU.rainW = { value: 0 };   // how wet the woods are from the rain: darker ground, darker grass (85-weather)
LU.wph = { value: 0 }; LU.wsz = { value: 0.5 }; LU.wash = { value: 0 }; LU.wet = { value: 0 };   // the waves on the shore, timed to the surf's sound (15-sea)
LU.occ = { value: new V4(0, 0, 0, 0) };   // from above: the line from the camera to you, which trees keep clear of (77-iso.js)
LU.terrF = { value: Array.from({ length: TERR_N }, () => new V4(0, 0, 0, 0)) };   // level places: x, y, radius, height
function terrBase(x, z) { return coastH(terrBase0(x, z), x, z); }
function terrBase0(x, z) {
  return 24 * Math.sin(x * 0.0061 + 1.3) * Math.sin(z * 0.0053 + 0.4) + 11 * Math.sin(x * 0.013 + z * 0.0081) * Math.cos(z * 0.0117 - x * 0.004) + 3 * Math.sin(x * 0.031 + 2.0) * Math.sin(z * 0.027 + 1.0);
}
const _sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------- the island (Joe) ----------------
// The woods are an island now. The coast runs right round, about 5,700 out from the camp (well past the raiders' camps and the
// caches), in and out: broad swells of shore, three deep bays and a headland. Off one shore lies a small sandy islet you can
// wade out to along a sandbar. coastS is how far out to sea a point is (negative inland). The land runs down through dunes to a
// wide beach and shelves away under the water.
const SEA_Y = -6;
const ISLE = { R: 5750, wig: [[260, 3, 0.4], [150, 7, 1.3], [70, 13, 2.1], [30, 29, 0.5]], bays: [[2.6, 0.11, 700], [-0.7, 0.09, 520], [4.2, 0.13, 600], [1.2, 0.08, -380]] };
const isleR = a => { let R = ISLE.R; for (const [k, n, c] of ISLE.wig) R += k * Math.sin(n * a + c); for (const [b, w, d] of ISLE.bays) { const q = ((a - b + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; R -= d * Math.exp(-(q / w) * (q / w)); } return R; };
const ISLET = (() => { const a = 1.95, r = isleR(a) + 360; return { x: Math.cos(a) * r, y: Math.sin(a) * r, r: 170 }; })();
function coastS(x, z) { const s0 = Math.hypot(x, z) - isleR(Math.atan2(z, x)), s1 = Math.hypot(x - ISLET.x, z - ISLET.y) - ISLET.r * (1 + 0.12 * Math.sin(Math.atan2(z - ISLET.y, x - ISLET.x) * 3 + 1)); return Math.min(s0, s1); }
function coastProf(s, x, z) { return SEA_Y + 7 + 2.2 * Math.sin(x * 0.021 + z * 0.013) * (1 - _sst(-160, -50, s)) - 6.5 * _sst(-110, 10, s) - 4 * _sst(0, 170, s) - 40 * _sst(130, 800, s); }
function coastH(h, x, z) { if (!BEACH) return h; const s = coastS(x, z); return s < -360 ? h : lerp(h, coastProf(s, x, z), _sst(-360, -140, s)); }
function terrH(x, z) {
  let h = terrBase(x, z);
  for (const f of LU.terrF.value) if (f.z > 0) h = lerp(h, f.w, _sst(f.z * 1.9, f.z, Math.hypot(x - f.x, z - f.y)));
  return h;
}
const COAST_GLSL = `
#ifndef COAST_DEF
#define COAST_DEF
${BEACH ? '#define BEACH 1' : ''}
const float SEA_Y = ${SEA_Y.toFixed(1)};
float cSst(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float coastS(vec2 p) { float a = atan(p.y, p.x), R = ${ISLE.R.toFixed(1)}${ISLE.wig.map(([k, n, c]) => ` + ${k.toFixed(1)} * sin(${n.toFixed(1)} * a + ${c.toFixed(2)})`).join('')};
  { float q = mod(a - 2.6000 + 3.14159265, 6.2831853) - 3.14159265; R -= 700.0 * exp(-(q / 0.1100) * (q / 0.1100)); }
  { float q = mod(a - -0.7000 + 3.14159265, 6.2831853) - 3.14159265; R -= 520.0 * exp(-(q / 0.0900) * (q / 0.0900)); }
  { float q = mod(a - 4.2000 + 3.14159265, 6.2831853) - 3.14159265; R -= 600.0 * exp(-(q / 0.1300) * (q / 0.1300)); }
  { float q = mod(a - 1.2000 + 3.14159265, 6.2831853) - 3.14159265; R -= -380.0 * exp(-(q / 0.0800) * (q / 0.0800)); }
  vec2 d = p - vec2(${ISLET.x.toFixed(1)}, ${ISLET.y.toFixed(1)});
  float s1 = length(d) - ${ISLET.r.toFixed(1)} * (1.0 + 0.12 * sin(atan(d.y, d.x) * 3.0 + 1.0));
  return min(length(p) - R, s1); }
float coastH(float h, vec2 p) {
#ifdef BEACH
  float s = coastS(p); if (s < -360.0) return h;
  float pr = SEA_Y + 7.0 + 2.2 * sin(p.x * 0.021 + p.y * 0.013) * (1.0 - cSst(-160.0, -50.0, s)) - 6.5 * cSst(-110.0, 10.0, s) - 4.0 * cSst(0.0, 170.0, s) - 40.0 * cSst(130.0, 800.0, s);
  return mix(h, pr, cSst(-360.0, -140.0, s));
#else
  return h;
#endif
}
float coastGrass(vec2 p) {
#ifdef BEACH
  return 1.0 - cSst(-215.0, -150.0, coastS(p) + 30.0 * sin(p.x * 0.05) * sin(p.y * 0.043));
#else
  return 1.0;
#endif
}
#endif
`;
const TERR_GLSL = COAST_GLSL + `uniform vec4 terrF[${TERR_N}];
float terrBase0(vec2 p);
float terrBase(vec2 p) { return coastH(terrBase0(p), p); }
float terrBase0(vec2 p) { return 24.0 * sin(p.x * 0.0061 + 1.3) * sin(p.y * 0.0053 + 0.4) + 11.0 * sin(p.x * 0.013 + p.y * 0.0081) * cos(p.y * 0.0117 - p.x * 0.004) + 3.0 * sin(p.x * 0.031 + 2.0) * sin(p.y * 0.027 + 1.0); }
float terrLevel(vec2 p, inout float h) {   // pulls h onto any level place here; returns how level it is
  float lv = 0.0;
  for (int i = 0; i < ${TERR_N}; i++) { vec4 f = terrF[i]; if (f.z <= 0.0) continue; float k = smoothstep(f.z * 1.9, f.z, distance(p, f.xy)); h = mix(h, f.w, k); lv = max(lv, k); }
  return lv;
}
float terrH(vec2 p) { float h = terrBase(p); terrLevel(p, h); return h; }
// the ground's slope as a normal (from the swells themselves; flat where the land's been levelled)
#ifdef BEACH
vec3 terrN(vec2 p) { float hx = terrH(p + vec2(3.0, 0.0)) - terrH(p - vec2(3.0, 0.0)), hz = terrH(p + vec2(0.0, 3.0)) - terrH(p - vec2(0.0, 3.0)); return normalize(vec3(-hx / 6.0, 1.0, -hz / 6.0)); }
vec3 terrN0(vec2 p) {
#else
vec3 terrN(vec2 p) {
#endif
  float a = p.x * 0.0061 + 1.3, b = p.y * 0.0053 + 0.4, u = p.x * 0.013 + p.y * 0.0081, v = p.y * 0.0117 - p.x * 0.004, c = p.x * 0.031 + 2.0, d = p.y * 0.027 + 1.0;
  float dx = 24.0 * 0.0061 * cos(a) * sin(b) + 11.0 * (0.013 * cos(u) * cos(v) + 0.004 * sin(u) * sin(v)) + 3.0 * 0.031 * cos(c) * sin(d);
  float dz = 24.0 * 0.0053 * sin(a) * cos(b) + 11.0 * (0.0081 * cos(u) * cos(v) - 0.0117 * sin(u) * sin(v)) + 3.0 * 0.027 * sin(c) * cos(d);
  float h = 0.0, lv = terrLevel(p, h);
  return normalize(vec3(-dx * (1.0 - lv), 1.0, -dz * (1.0 - lv)));
}`;
// The soil changes as you walk: broad patches of dry sandy ground, dark rich loam, a reddish clay and stony bare ground,
// laid out by slow noise so each patch runs a long way. The bare ground and the turf over it (12-grass) read the same patches,
// so dry ground grows short straw-coloured grass, loam grows it deep and green, and the stony bits are thin.
const SOIL_GLSL = COAST_GLSL + `uniform sampler2D landT; vec4 landW(vec2 p) { return texture2D(landT, p / ${AREA_P.toFixed(1)}); }
float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), f.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0)), f.x), f.y); }
vec4 soilW(vec2 p) {   // how much of each soil is here: dry, loam, clay, stony
  float a = sNoise(p * 0.0042) * 0.7 + sNoise(p * 0.013 + 5.1) * 0.3;
  float b = sNoise(p * 0.0035 + 11.7) * 0.7 + sNoise(p * 0.011 + 2.3) * 0.3;
  float c = sNoise(p * 0.0021 - 7.3) * 0.8 + sNoise(p * 0.009 + 1.7) * 0.2;
  float e = sNoise(p * 0.0075 + 31.0) * 0.75 + sNoise(p * 0.03 + 8.0) * 0.25;
  vec4 s = vec4(smoothstep(0.52, 0.72, a), smoothstep(0.54, 0.72, b), smoothstep(0.56, 0.76, c), smoothstep(0.6, 0.76, e));
  vec4 L = landW(p);                                                   // the lie of the land (00-areas): dry ground, rocky ground, the thickets' dark loam
  s.x = max(s.x, L.b * 0.95); s.y = max(s.y * (1.0 - L.b), L.r * 0.75); s.w = max(s.w, L.g * 0.9); s.z *= 1.0 - 0.6 * L.a;
  return s;
}`;
// which places are level: the camp and the nearest raiders' camps (re-chosen as you move about); ponds lie in the land's own hollows (08-ponds)
function terrLevelSync(px, py, lakes) {
  const L = [];
  L.push([0, 0, CAMP_R + 55, terrBase(0, 0)]);
  for (const C of dayCampList()) { const o = C.parts && C.parts[0] ? C.parts[0] : C; L.push([o.x, o.y, 120, terrBase(o.x, o.y)]); }
  L.sort((a, b) => Math.hypot(a[0] - px, a[1] - py) - a[2] - (Math.hypot(b[0] - px, b[1] - py) - b[2]));
  LU.terrF.value.forEach((v, i) => { const q = L[i]; if (q && Math.hypot(q[0] - px, q[1] - py) - q[2] * 1.9 < drawR() + 300) v.set(q[0], q[1], q[2], q[3]); else v.set(0, 0, 0, 0); });
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
// Drawn round the camera wherever it goes (only its turn is used, never where it stands). Over the gradient: the sun with its
// glow, and a warm band along the horizon on its side as it sets; drifting clouds, lit on the side toward the sun and grey
// underneath, pink and gold at dusk, filling in to a low grey lid when it rains; and by night a moon and a sky of stars.
const SKY = { top: new V3(), hor: new V3(), cover: { value: 0.42 }, set: { value: 0 } };
{
  const g = new THREE.SphereGeometry(1200, 32, 16);
  const m = new THREE.ShaderMaterial({
    uniforms: { top: { value: SKY.top }, hor: { value: SKY.hor }, sunDir: LU.sunDir, sunK: LU.sunK, colourK: LU.colourK, time: LU.time, cover: SKY.cover, dusk: SKY.set }, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vD; void main() { vD = normalize(position); vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 top, hor, sunDir; uniform float sunK, colourK, time, cover, dusk; varying vec3 vD;
      float hs(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hs(i), hs(i + vec2(1.0, 0.0)), f.x), mix(hs(i + vec2(0.0, 1.0)), hs(i + vec2(1.0)), f.x), f.y); }
      float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
      void main() {
        vec3 d = normalize(vD); float h = clamp(d.y, 0.0, 1.0), night = 1.0 - sunK;
        vec3 c = mix(hor, top, pow(h, 0.55));
        float s = max(dot(d, sunDir), 0.0);
        // the sun's side of the sky warms at dusk, low along the horizon
        float side = pow(max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0), 3.0);
        c += vec3(1.0, 0.45, 0.2) * dusk * side * exp(-h * 6.0) * 0.55;
        c += vec3(1.0, 0.85, 0.6) * (pow(s, 12.0) * 0.18 + pow(s, 80.0) * 0.25) * sunK;
        // stars, by night: a fine grid of points, only some lit, each twinkling at its own pace
        if (night > 0.02 && d.y > 0.0) {
          vec2 sp = vec2(atan(d.z, d.x) * 120.0, d.y * 190.0), si = floor(sp), sf = fract(sp) - 0.5;
          float r = hs(si), lit = step(0.93, r) * smoothstep(0.18, 0.0, length(sf)) * (0.6 + 0.4 * sin(time * (1.0 + r * 3.0) + r * 60.0));
          c += vec3(0.85, 0.88, 1.0) * lit * night * smoothstep(0.0, 0.25, d.y) * (0.5 + r * 0.8);
          float band = exp(-pow(dot(d, normalize(vec3(0.5, 0.3, 0.8))) * 3.2, 2.0));   // a faint river of stars across the sky
          c += vec3(0.12, 0.13, 0.18) * band * night * fbm(sp * 0.08) * smoothstep(0.0, 0.3, d.y);
        }
        // the moon, across the sky from where the sun went down
        vec3 md = normalize(vec3(-sunDir.x, 0.62, -sunDir.z)); float mc = dot(d, md);
        float disc = smoothstep(0.99935, 0.99955, mc);
        c += night * (vec3(0.92, 0.94, 1.0) * disc * (0.85 + 0.15 * vn(d.xz * 900.0)) + vec3(0.25, 0.3, 0.42) * pow(max(mc, 0.0), 60.0) * 0.5);
        // the clouds: a layer overhead seen in perspective, drifting on the wind, thinning toward the horizon
        if (d.y > 0.0) {
          vec2 uv = d.xz / (d.y + 0.12) * 1.6 + vec2(time * 0.006, time * 0.0025);
          uv += 0.5 * vec2(fbm(uv * 0.5 + 3.1), fbm(uv * 0.5 + 7.7));                       // warped, so they billow instead of streaking
          float n = fbm(uv), k = smoothstep(1.0 - cover - 0.02, 1.0 - cover + 0.16, n);
          float n2 = fbm(uv + normalize(sunDir.xz + 1e-4) * 0.09);                          // a step toward the sun: is it thicker there?
          float lightK = clamp(0.62 + (n - n2) * 4.0, 0.25, 1.15);
          vec3 lit = mix(vec3(1.0, 0.98, 0.95), vec3(1.0, 0.72, 0.5), dusk);                // the sunlit tops, gold as it sets
          vec3 shade = mix(vec3(0.62, 0.66, 0.74), vec3(0.55, 0.42, 0.5), dusk);            // the grey undersides, mauve at dusk
          vec3 cc = mix(shade, lit, lightK) * mix(0.55, 1.0, sunK) + vec3(1.0, 0.9, 0.7) * pow(s, 8.0) * 0.35 * sunK * (1.0 - k);   // a silver edge against the sun
          cc = mix(cc, vec3(0.06, 0.07, 0.1) + vec3(0.1, 0.11, 0.14) * pow(max(mc, 0.0), 8.0), night * 0.92);   // by night: dark shapes, a little moonlit
          cc = mix(cc, mix(hor, vec3(0.6, 0.62, 0.64) * (0.4 + 0.6 * sunK), 0.6), smoothstep(0.65, 1.0, cover) * 0.6);   // rain: a flat grey lid
          float fade = smoothstep(0.0, 0.22, d.y);
          c = mix(c, cc, k * fade * 0.95);
        }
        c += vec3(1.0, 0.92, 0.75) * pow(s, 700.0) * 2.0 * sunK;                             // the sun's disc, through thin cloud
        float gy = dot(c, vec3(0.3, 0.55, 0.15)); gl_FragColor = vec4(mix(vec3(gy), c, colourK), 1.0); }`,
  });
  var skyMesh = new THREE.Mesh(g, m); skyMesh.frustumCulled = false; skyMesh.renderOrder = -10; scene.add(skyMesh);
}

// ---------------- the ground ----------------
{
  const g = new THREE.PlaneGeometry(3400, 3400, 340, 340); g.rotateX(-Math.PI / 2);   // follows you, in 10-unit steps (90-main)
  const m = new THREE.ShaderMaterial({
    uniforms: Object.assign({ map: { value: floorTex } }, LU),
    vertexShader: TERR_GLSL + `varying vec3 vW, vTN; void main() { vec4 w = modelMatrix * vec4(position, 1.0); w.y = terrH(w.xz); vTN = terrN(w.xz); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: LIGHT_GLSL + SOIL_GLSL + `uniform sampler2D map, mask; uniform vec2 mo; uniform float ms, time, wet, rainW; varying vec3 vW, vTN;
      void main() { vec3 t = texture2D(map, vW.xz / 384.0).rgb;
        vec4 s = soilW(vW.xz);
        t *= 0.86 + 0.28 * sNoise(vW.xz * 0.006 + 40.0);                              // broad light and dark, so the texture never reads as tiles
        t = mix(t, t * vec3(1.22, 1.1, 0.8) + vec3(0.05, 0.04, 0.0), s.x);            // dry, sandy
        t = mix(t, t * vec3(0.6, 0.55, 0.5), s.y);                                    // dark loam
        t = mix(t, t * vec3(1.2, 0.8, 0.62) + vec3(0.03, 0.0, 0.0), s.z);             // reddish clay
        float sp = sNoise(vW.xz * 0.45), sp2 = sNoise(vW.xz * 1.3 + 9.0);              // stony: pebbles and grit
        t = mix(t, mix(t * 0.9, vec3(0.6, 0.57, 0.52) * (0.7 + 0.5 * sp2), smoothstep(0.55, 0.7, sp) * 0.75), s.w);
        float st = 1.0 - normalize(vTN).y;                                             // the steeper slopes wear through to stone
        t = mix(t, vec3(0.44, 0.41, 0.37) * (0.75 + 0.5 * sp2), smoothstep(0.02, 0.07, st) * 0.45);
        vec4 L = landW(vW.xz);
        t = mix(t, t * vec3(0.66, 0.56, 0.44) + vec3(0.03, 0.015, 0.0) * sNoise(vW.xz * 0.2), L.r * 0.65);   // leaf litter under the thickets
        float gm = texture2D(mask, (vW.xz - mo) / ms).r;   // under the turf the ground is green too, bare where the grass stops (ponds, floors, fires)
        vec3 under = mix(vec3(0.34, 0.42, 0.19), vec3(0.5, 0.47, 0.24), s.x); under = mix(under, vec3(0.22, 0.34, 0.13), s.y);
        t = mix(t, under * (0.8 + 0.4 * t.r), 0.55 * smoothstep(0.2, 0.8, gm) * (1.0 - 0.75 * s.w));
        #ifdef BEACH
        { float cs = coastS(vW.xz), n1 = sNoise(vW.xz * 0.035), n2 = sNoise(vW.xz * 0.6 + 3.0);
          float sandK = smoothstep(-205.0, -140.0, cs + 30.0 * sin(vW.x * 0.05) * sin(vW.z * 0.043) + (n1 - 0.5) * 40.0);   // 1 on the sand
          vec3 sand = vec3(0.92, 0.84, 0.66) * (0.9 + 0.14 * n1) * (0.94 + 0.1 * n2);
          sand = mix(sand, sand * vec3(0.95, 0.9, 0.82), smoothstep(0.55, 0.8, sNoise(vW.xz * 0.012 + 7.0)) * 0.5);   // drifts of darker sand
          float rip = sin((cs * 0.9 + 6.0 * sNoise(vW.xz * 0.02)) * 0.55);              // wind ripples across the dry sand
          sand *= 1.0 + 0.035 * rip * (1.0 - smoothstep(-40.0, 10.0, cs));
          t = mix(t, sand, sandK);
          float wl = SEA_Y + wet + 0.12 * sin(vW.z * 0.004 + vW.x * 0.003);              // how high the last waves washed
          float wet = 1.0 - smoothstep(wl - 0.2, wl + 1.2, vW.y);
          t = mix(t, t * vec3(0.7, 0.68, 0.64), wet * sandK);                          // dark wet sand where the waves reach
          float under = smoothstep(SEA_Y + 0.3, SEA_Y - 3.0, vW.y) * smoothstep(-200.0, -120.0, cs);   // only by the sea: low ground inland is dry
          t = mix(t, t * vec3(0.55, 0.75, 0.72), under);                               // under the water, the sand goes green-blue
        }
        #endif
        t = mix(t, t * vec3(0.66, 0.68, 0.7), rainW);                                  // soaked: the earth goes dark
        { float pd = smoothstep(0.62, 0.72, sNoise(vW.xz * 0.018 + 17.0)) * (1.0 - smoothstep(0.03, 0.06, 1.0 - normalize(vTN).y)) * rainW;   // puddles in the flat dips
          vec3 V = normalize(camPos - vW); t = mix(t, mix(t * 0.45, fogCol * 0.8, pow(1.0 - max(V.y, 0.0), 2.0)), pd * 0.85); }
        gl_FragColor = vec4(fogged(grey(t * lightAt(vW, vec3(0.0, 1.0, 0.0), 0.0) * 1.12 * slopeLit(normalize(vTN))), vW), 1.0); }`,
  });
  var groundMesh = new THREE.Mesh(g, m); groundMesh.frustumCulled = false; scene.add(groundMesh);
}
