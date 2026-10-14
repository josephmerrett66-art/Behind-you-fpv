// ================= life in the air: leaves coming down, butterflies, and bees =================
// None of it does anything; it's there so the woods feel alive. Each kind is one instanced mesh moved entirely on the graphics
// card from a seed per instance and the clock, so it costs nothing on the main thread. Each instance keeps its own spot in a
// square that follows you round (the same wrap the turf uses), shrinking away toward the square's edge so nothing pops.
// Butterflies and bees are out by day and in the dry; the leaves keep falling, only fewer once it's dark.
const LIFE_U = { lifeC: { value: new V3() }, lifeB: { value: 400 } };
const LIFE_V = TERR_GLSL + `attribute vec4 sd; uniform float time, lifeB, lifeK; uniform vec3 lifeC;
  varying vec3 vW; varying vec2 vUv; varying vec4 vSd; varying float vPart;
  mat3 rY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
  mat3 rX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
  mat3 rZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
  vec2 home(vec2 h, float B) { return lifeC.xz + mod(h * B - lifeC.xz + B * 0.5, B) - B * 0.5; }
  float edge(vec2 p, float B) { vec2 d = abs(p - lifeC.xz); return smoothstep(B * 0.5, B * 0.36, max(d.x, d.y)); }`;
const LIFE_F_HEAD = LIGHT_GLSL + `varying vec3 vW; varying vec2 vUv; varying vec4 vSd; varying float vPart;
  vec3 lit(vec3 c) { return fogged(grey(c * lightAt(vW, vec3(0.0, 1.0, 0.0), 0.0) * 1.12), vW); }`;

function lifeMesh(geo, n, seed, vert, frag) {
  const g = new THREE.InstancedBufferGeometry(); g.index = geo.index;
  for (const k in geo.attributes) g.setAttribute(k, geo.attributes[k]);
  const sd = new Float32Array(n * 4); for (let i = 0; i < n; i++) seed(sd, i);
  g.setAttribute('sd', new THREE.InstancedBufferAttribute(sd, 4)); g.instanceCount = n;
  const m = new THREE.ShaderMaterial({ uniforms: Object.assign({}, LU, LIFE_U, { lifeK: { value: 1 } }), vertexShader: LIFE_V + vert, fragmentShader: LIFE_F_HEAD + frag, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; scene.add(mesh); mesh.userData.n = n; return mesh;
}
// a flat quad, u across and v along, with a 'part' number on every corner (wings left and right, a bee's body)
function lifeQuads(list) {
  const pos = [], uv = [], part = [], idx = [];
  for (const q of list) {
    const b = pos.length / 3;
    for (const [x, z, u, v, y] of q.c) { pos.push(x, q.y || y || 0, z); uv.push(u, v); part.push(q.p); }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('part', new THREE.Float32BufferAttribute(part, 1)); g.setIndex(idx); return g;
}
const LIFE_FEW = SET.quality === 'fast' ? 0.5 : 1;

// ---- leaves: tumbling down from up in the canopy, drifting on the breeze, a few colours of autumn and summer ----
const leafMesh = lifeMesh(lifeQuads([{ p: 0, c: [[-1, -0.6, 0, 0], [1, -0.6, 1, 0], [1, 0.6, 1, 1], [-1, 0.6, 0, 1]] }]),
  Math.round(200 * LIFE_FEW), (a, i) => a.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4), `
  attribute float part;
  void main() {
    float B = lifeB * 0.8, T = 13.0 + 9.0 * sd.z, ph = fract(time / T + sd.w), H = 70.0 + 70.0 * sd.z;
    vec2 h = home(sd.xy, B) + vec2(ph * 40.0 + sin(time * 1.2 + sd.w * 40.0) * 7.0, sin(time * 0.9 + sd.x * 30.0) * 5.0);
    float k = edge(h, B) * smoothstep(1.0, 0.94, ph) * smoothstep(0.0, 0.05, ph) * lifeK;
    float a = time * (1.6 + sd.x * 2.4) + sd.y * 9.0, b = time * (0.8 + sd.z * 1.5) + sd.x * 7.0;
    vec3 p = rY(b) * rX(a) * rZ(sin(time * 2.0 + sd.w * 9.0) * 0.6) * (position * 1.6 * k);
    vec3 w = vec3(h.x, terrH(h) + 1.0 + H * (1.0 - ph), h.y) + p;
    vW = w; vUv = uv; vSd = sd; vPart = part;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`, `
  void main() {
    vec2 q = vUv * 2.0 - 1.0; if (q.y * q.y + pow(abs(q.x), 1.6) * (1.0 + 0.6 * q.x) > 1.0) discard;   // a leaf shape, pointed at one end
    float s = vSd.x;
    vec3 c = s < 0.3 ? vec3(0.86, 0.46, 0.12) : s < 0.55 ? vec3(0.88, 0.72, 0.22) : s < 0.75 ? vec3(0.62, 0.24, 0.1) : vec3(0.46, 0.56, 0.2);
    c *= 0.85 + 0.25 * vSd.y; c *= 1.0 - 0.25 * smoothstep(0.04, 0.0, abs(q.y)) * step(-0.8, q.x);   // the vein down the middle
    gl_FragColor = vec4(lit(c), 1.0);
  }`);

// ---- butterflies: lazy loops over the open ground, wings beating and gliding ----
const flyMesh = lifeMesh(lifeQuads([
  { p: -1, c: [[0, -0.85, 0, -1], [-1, -0.85, 1, -1], [-1, 0.85, 1, 1], [0, 0.85, 0, 1]] },
  { p: 1, c: [[0, -0.85, 0, -1], [1, -0.85, 1, -1], [1, 0.85, 1, 1], [0, 0.85, 0, 1]] },
  { p: 0, y: 0.05, c: [[-0.08, -0.6, 0, -1], [0.08, -0.6, 1, -1], [0.08, 0.6, 1, 1], [-0.08, 0.6, 0, 1]] }]),
  Math.round(46 * LIFE_FEW), (a, i) => a.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4), `
  attribute float part;
  vec2 path(float t) { return vec2(sin(t * 0.31 + sd.w * 20.0) * 38.0 + sin(t * 0.83 + sd.x * 9.0) * 11.0, cos(t * 0.27 + sd.z * 20.0) * 38.0 + cos(t * 0.91 + sd.y * 9.0) * 11.0); }
  void main() {
    float B = lifeB;
    vec2 h0 = home(sd.xy, B), h = h0 + path(time), dh = path(time + 0.08) - path(time);
    float k = edge(h, B) * lifeK;
    float beat = fract(time * 0.35 + sd.w) < 0.3 ? 0.15 : 1.0;   // now and then a glide
    float flap = (sin(time * (13.0 + sd.z * 5.0) + sd.w * 30.0) * 0.85 + 0.35) * beat + (1.0 - beat) * 0.25;
    vec3 p = position;
    if (part != 0.0) { float x = abs(p.x); p = vec3(sign(p.x) * cos(flap) * x, sin(flap) * x, p.z); }
    p *= 2.6 * k;
    float y = terrH(h) + 9.0 + 6.0 * sin(time * 0.7 + sd.y * 20.0) + sin(time * 13.0 + sd.w * 30.0) * 0.6;
    vec3 w = vec3(h.x, y, h.y) + rY(atan(dh.x, dh.y)) * rX(-0.2) * p;
    vW = w; vUv = uv; vSd = sd; vPart = part;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`, `
  void main() {
    if (vPart == 0.0) { gl_FragColor = vec4(lit(vec3(0.12, 0.1, 0.08)), 1.0); return; }
    vec2 q = vec2(vUv.x, vUv.y);   // u out from the body, v front to back
    float fore = length((q - vec2(0.45, 0.42)) / vec2(0.62, 0.62)), hind = length((q - vec2(0.38, -0.5)) / vec2(0.45, 0.5));
    if (min(fore, hind) > 1.0) discard;
    float s = vSd.x;
    vec3 c = s < 0.3 ? vec3(0.96, 0.94, 0.88) : s < 0.55 ? vec3(0.98, 0.82, 0.22) : s < 0.8 ? vec3(0.95, 0.52, 0.14) : vec3(0.36, 0.56, 0.95);
    c = mix(c, vec3(0.1, 0.08, 0.07), smoothstep(0.78, 0.92, min(fore, hind)));                      // dark edges
    c = mix(c, vec3(0.1, 0.08, 0.07), step(length(q - vec2(0.62, 0.55)), 0.09));                     // an eye spot
    gl_FragColor = vec4(lit(c), 1.0);
  }`);

// ---- bees: little swarms of a few, darting about low over the turf and the bushes ----
const beeMesh = lifeMesh(lifeQuads([
  { p: 0, c: [[-0.32, -0.6, 0, 0], [0.32, -0.6, 1, 0], [0.32, 0.6, 1, 1], [-0.32, 0.6, 0, 1]] },
  { p: 0, c: [[0, -0.6, 0, 0, -0.32], [0, -0.6, 1, 0, 0.32], [0, 0.6, 1, 1, 0.32], [0, 0.6, 0, 1, -0.32]] },
  { p: -1, y: 0.25, c: [[-0.05, -0.15, 0, -1], [-0.7, -0.15, 1, -1], [-0.7, 0.3, 1, 1], [-0.05, 0.3, 0, 1]] },
  { p: 1, y: 0.25, c: [[0.05, -0.15, 0, -1], [0.7, -0.15, 1, -1], [0.7, 0.3, 1, 1], [0.05, 0.3, 0, 1]] }]),
  Math.round(60 * LIFE_FEW), (a, i) => { const g = Math.floor(i / 5) * 7.31; a.set([(g * 0.618) % 1, (g * 0.414 + 0.3) % 1, Math.random(), Math.random()], i * 4); }, `
  attribute float part;
  void main() {
    float B = lifeB * 0.9, t = time * (0.8 + sd.z * 0.6) + sd.w * 50.0;
    vec2 c0 = home(sd.xy, B);
    vec2 o = vec2(sin(t * 1.7) * 7.0 + sin(t * 4.3) * 2.0, cos(t * 1.3) * 7.0 + cos(t * 5.1) * 2.0);
    vec2 o2 = vec2(sin((t + 0.05) * 1.7) * 7.0 + sin((t + 0.05) * 4.3) * 2.0, cos((t + 0.05) * 1.3) * 7.0 + cos((t + 0.05) * 5.1) * 2.0);
    vec2 h = c0 + o, dh = o2 - o;
    float k = edge(h, B) * lifeK;
    vec3 p = position;
    if (part != 0.0) { float f = sin(time * 90.0 + sd.w * 9.0) * 0.6 + 0.3, x = abs(p.x); p = vec3(sign(p.x) * cos(f) * x, p.y + sin(f) * x, p.z); }
    p *= 1.5 * k;
    float y = terrH(h) + 4.0 + 2.0 * sin(t * 2.3) + sin(t * 9.0) * 0.4;
    vec3 w = vec3(h.x, y, h.y) + rY(atan(dh.x, dh.y)) * p;
    vW = w; vUv = uv; vSd = sd; vPart = part;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`, `
  void main() {
    if (vPart != 0.0) { if (length((vUv - vec2(0.5, 0.0)) / vec2(0.55, 1.0)) > 1.0) discard; gl_FragColor = vec4(lit(vec3(0.85, 0.88, 0.9)), 1.0); return; }
    vec2 q = vUv * 2.0 - 1.0; if (q.x * q.x + q.y * q.y * 0.9 > 1.0) discard;
    vec3 c = fract(vUv.y * 2.6) < 0.5 ? vec3(0.95, 0.72, 0.12) : vec3(0.12, 0.09, 0.05);           // the stripes
    if (vUv.y > 0.82) c = vec3(0.12, 0.09, 0.05);                                                      // the head
    gl_FragColor = vec4(lit(c), 1.0);
  }`);

let lifeOut = 1, lifeLeaf = 1;
function lifeFrame(rdt) {
  const on = !!(S && S.day && state !== 'title');
  const dry = 1 - Math.max(WXV.rain, WXV.fog * 0.6), want = on ? clamp((ENV.lt - 0.35) / 0.4, 0, 1) * dry : 0;
  lifeOut += clamp(want - lifeOut, -rdt * 0.4, rdt * 0.4);           // they drift in at dawn and away at dusk or when it rains
  lifeLeaf += clamp((on ? 0.45 + 0.55 * ENV.lt : 0) - lifeLeaf, -rdt * 0.4, rdt * 0.4);
  const p = S ? S.p : { x: 0, y: 0 };
  LIFE_U.lifeC.value.set(p.x, 0, p.y); LIFE_U.lifeB.value = isoP() ? 640 : 420;
  flyMesh.visible = beeMesh.visible = lifeOut > 0.01; leafMesh.visible = lifeLeaf > 0.01;
  flyMesh.material.uniforms.lifeK.value = beeMesh.material.uniforms.lifeK.value = lifeOut;
  leafMesh.material.uniforms.lifeK.value = lifeLeaf;
}
