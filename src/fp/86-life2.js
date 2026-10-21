// ================= more life in the woods: smoke, mist, fireflies, moths, dragonflies, fish, birds going up =================
// Joe: "add or change anything in the world and environment to add to the feeling of the world". None of this changes how
// the game plays except the birds: they go up out of the trees where something big moves (a tree coming down, the clan
// coming through), so a flock bursting off the canopy over there is worth a look.
//  · smoke: a thin column above each of the clan's camps, standing over the trees so you can see where they live from far off,
//    and a wisp off every fire of yours and the pit on the hill
//  · mist: low drifting banks of it at first light and after rain, lying in the hollows
//  · fireflies: on dry nights, low over the ground, each one blinking on its own time
//  · moths: round any fire after dark
//  · dragonflies: darting over a pond on a warm day
//  · fish: rising in the ponds now and then, a splash and a ring spreading
//  · birds: a few flushed off the canopy when you fell a tree, when you push in under them, when the clan comes near
//  · crows: wheeling slowly over the clan's camps by day, and over anything big that's died, for a while after

// ---- smoke and mist: soft puffs, each rising (or drifting) on its own clock, from a list of sources set each frame ----
const SMK = { N: 160, n: 0, wx: 0, wz: 0 };
{
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  SMK.sp = new Float32Array(SMK.N * 4); SMK.sq = new Float32Array(SMK.N * 4);
  for (const [k, a] of [['sp', SMK.sp], ['sq', SMK.sq]]) { const b = new THREE.InstancedBufferAttribute(a, 4); b.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, b); }
  g.instanceCount = 0; SMK.geo = g;
  SMK.mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, LU, { smW: { value: new THREE.Vector2() } }), transparent: true, depthWrite: false,
    vertexShader: TERR_GLSL + `attribute vec4 sp, sq; uniform float time; uniform vec2 smW; varying vec2 vQ; varying vec4 vS; varying vec3 vW; varying float vA;
      // sp: x, base height, z, kind (0 a tall column, 1 a wisp off a small fire, 2 mist) · sq: seed, strength, height, width
      void main() {
        float k = sp.w, T = k < 0.5 ? 26.0 : k < 1.5 ? 9.0 : 46.0, ph = fract(time / T + sq.x), s = sq.x * 37.0;
        vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 c; float w, h, a;
        if (k < 1.5) {   // rising, widening, leaning off on the wind the higher it gets
          float up = sq.z * ph, lean = pow(ph, 1.5) * sq.z * 0.7;
          c = vec3(sp.x, sp.y + up, sp.z) + vec3(smW.x, 0.0, smW.y) * lean + vec3(sin(time * 0.31 + s) * 4.0, 0.0, cos(time * 0.27 + s * 1.3) * 4.0) * (0.3 + ph);
          w = sq.w * (0.35 + 1.5 * ph); h = w;
          a = smoothstep(0.0, 0.08, ph) * pow(1.0 - ph, 1.3);
        } else {   // mist: hanging low and creeping along
          c = vec3(sp.x, sp.y, sp.z) + vec3(smW.x, 0.0, smW.y) * (ph - 0.5) * 60.0 + vec3(sin(time * 0.05 + s) * 14.0, 0.0, cos(time * 0.04 + s) * 14.0);
          c.y = terrH(c.xz) + 4.0 + 3.0 * sin(time * 0.1 + s);
          w = sq.w; h = sq.w * 0.3;
          a = sin(3.1416 * ph);
        }
        vec3 wp = c + R * position.x * w + vec3(0.0, 1.0, 0.0) * position.y * h;
        vQ = position.xy; vS = vec4(sq.x, k, sq.y, ph); vW = wp; vA = a * sq.y;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: LIGHT_GLSL + `uniform float time; varying vec2 vQ; varying vec4 vS; varying vec3 vW; varying float vA;
      float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0)), f.x), f.y); }
      void main() {
        float d = length(vQ); if (d > 1.0) discard;
        float n = n2(vQ * 2.2 + vS.x * 40.0 + time * 0.05) * 0.6 + n2(vQ * 5.0 - vS.x * 20.0) * 0.4;
        float a = vA * smoothstep(1.0, 0.25, d) * (0.55 + 0.7 * n);
        vec3 base = vS.y > 1.5 ? vec3(0.86, 0.88, 0.88) : mix(vec3(0.42, 0.41, 0.4), vec3(0.62, 0.61, 0.6), vS.w);   // smoke greys as it thins; mist is near white
        vec3 c = grey(base * lightAt(vW, vec3(0.0, 1.0, 0.0), 0.0));
        float far = smoothstep(fogR.x, fogR.y * 1.6, distance(vW.xz, fogC.xz));
        c = mix(c, fogCol, (vS.y > 1.5 ? 1.0 : 0.7) * far);   // a far column stays a little darker than the haze, so it still shows
        gl_FragColor = vec4(c, a * (vS.y > 1.5 ? 0.28 : 0.42));
      }`,
  });
  SMK.mesh = new THREE.Mesh(g, SMK.mat); SMK.mesh.frustumCulled = false; SMK.mesh.renderOrder = 2; scene.add(SMK.mesh);
}
function smokeFrom(x, y, base, kind, n, seed, str, H, W) {
  for (let i = 0; i < n && SMK.n < SMK.N; i++) {
    const j = SMK.n++ * 4;
    SMK.sp[j] = x + (hash(seed, i) - 0.5) * W * 0.3; SMK.sp[j + 1] = base; SMK.sp[j + 2] = y + (hash(i, seed) - 0.5) * W * 0.3; SMK.sp[j + 3] = kind;
    SMK.sq[j] = (i / n + hash(seed * 1.7, i) * 0.13) % 1; SMK.sq[j + 1] = str; SMK.sq[j + 2] = H; SMK.sq[j + 3] = W * (0.8 + 0.4 * hash(i * 3.1, seed));
  }
}
let mistK = 0, mistSpots = null;
function smokeFrame(rdt) {
  SMK.n = 0;
  const D = S && S.day, p = S && S.p;
  if (!D || !p || state === 'title' || (typeof caveIn === 'function' && caveIn())) { SMK.geo.instanceCount = 0; return; }
  SMK.mat.uniforms.smW.value.set(0.35 + (FT.wx || 0) * 2, 0.2 + (FT.wz || 0) * 2);
  const rain = WXV.rain;
  // the clan's camps: a column you can see over the treetops (rain beats it down)
  for (const k of clanCamps()) { const d = Math.hypot(k.x - p.x, k.y - p.y); if (d < 2600) smokeFrom(k.x, k.y, terrH(k.x, k.y) + 14, 0, 18, k.seed * 9 + 1, 0.85 * (1 - 0.6 * rain), 300, 26); }
  // your fires and the pit
  const fires = [...pitL(), ...D.builds.filter(B => B.t === 'fire')].filter(f => Math.hypot(f.x - p.x, f.y - p.y) < 900).slice(0, 8);
  for (const f of fires) if (f.fp) { const [cx, cy] = fpFlue(f); smokeFrom(cx, cy, terrH(f.x, f.y) + FPL.top, 1, 5, hash(f.x * 0.1, f.y * 0.1) * 9, 0.75 * (1 - 0.5 * rain), 90, 7); } else smokeFrom(f.x, f.y, terrH(f.x, f.y) + 10, 1, 7, hash(f.x * 0.1, f.y * 0.1) * 9, 0.75 * (1 - 0.5 * rain), f === EX_FIRE ? 110 : 80, 9);
  roofSmoke(smokeFrom);   // a roof scorching over a fire (89-roofs)
  // mist: in the first hour of light, and while the ground is still wet after rain
  const f = dayT(), dawn = f > NIGHT_OUT - 0.02 ? clamp(1 - (f - NIGHT_OUT) / 0.09, 0, 1) * sstep(NIGHT_OUT - 0.02, NIGHT_OUT + 0.01, f) : 0;
  const want = Math.max(dawn, (LU.rainW ? LU.rainW.value : 0) * (1 - rain) * 0.7);
  mistK += clamp(want - mistK, -rdt * 0.05, rdt * 0.05);
  if (mistK > 0.02) {
    if (!mistSpots || Math.hypot(mistSpots.x - p.x, mistSpots.y - p.y) > 260) {   // banks scattered round you, lying lower in the dips
      const L = []; for (let i = 0; i < 40 && L.length < 18; i++) { const a = Math.random() * TAU, r = 90 + Math.random() * 420, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
        if (terrH(x, y) < terrH(p.x, p.y) + 12 && !(BEACH && coastS(x, y) > -60)) L.push([x, y, Math.random()]); }
      mistSpots = { x: p.x, y: p.y, L };
    }
    for (const [x, y, s] of mistSpots.L) smokeFrom(x, y, 0, 2, 1, s * 50, mistK * (0.5 + 0.5 * s), 0, 90 + 80 * s);
  }
  SMK.geo.instanceCount = SMK.n;
  for (const k of ['sp', 'sq']) { const b = SMK.geo.attributes[k]; b.needsUpdate = true; if (b.clearUpdateRanges) { b.clearUpdateRanges(); b.addUpdateRange(0, SMK.n * 4); } }
}

// ---- fireflies and moths: points of light, and pale specks round a fire ----
const GLOW = { ff: 110, moth: 48 };
function glowPoints(n, seed, vert, frag, additive) {
  const g = new THREE.BufferGeometry(), sd = new Float32Array(n * 4), at = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) seed(sd, i);
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('sd', new THREE.BufferAttribute(sd, 4)); g.setAttribute('at', new THREE.BufferAttribute(at, 4).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.ShaderMaterial({ uniforms: Object.assign({}, LU, LIFE_U, { glowK: { value: 0 }, vpH: { value: 600 } }), transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: TERR_GLSL + `attribute vec4 sd, at; uniform float time, lifeB, glowK, vpH; uniform vec3 lifeC; varying float vA; varying vec4 vSd; varying vec3 vW;
      vec2 home(vec2 h, float B) { return lifeC.xz + mod(h * B - lifeC.xz + B * 0.5, B) - B * 0.5; }
      float edge(vec2 p, float B) { vec2 d = abs(p - lifeC.xz); return smoothstep(B * 0.5, B * 0.36, max(d.x, d.y)); }` + vert,
    fragmentShader: LIGHT_GLSL + `uniform float time; varying float vA; varying vec4 vSd; varying vec3 vW;` + frag });
  const P = new THREE.Points(g, m); P.frustumCulled = false; P.renderOrder = 4; scene.add(P); return P;
}
const fflyPts = glowPoints(GLOW.ff, (a, i) => a.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4), `
  void main() {
    float B = lifeB * 0.75, t = time * (0.25 + 0.2 * sd.z) + sd.w * 40.0;
    vec2 h = home(sd.xy, B) + vec2(sin(t) * 9.0 + sin(t * 2.3) * 3.0, cos(t * 0.8) * 9.0 + cos(t * 1.9) * 3.0);
    float y = terrH(h) + 3.0 + 16.0 * sd.z + sin(t * 1.7) * 2.0;
    vec4 mv = viewMatrix * vec4(h.x, y, h.y, 1.0);
    float blink = smoothstep(0.55, 0.8, sin(time * (0.7 + sd.z * 0.6) + sd.w * 31.0) * 0.5 + 0.5);   // each one on its own slow pulse
    vA = glowK * edge(h, B) * blink; vSd = sd; vW = vec3(h.x, y, h.y);
    gl_PointSize = clamp(2.6 * projectionMatrix[1][1] * vpH * 0.5 / -mv.z, 1.5, 9.0);
    gl_Position = projectionMatrix * mv;
  }`, `
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
    float a = vA * pow(1.0 - d, 2.2) * (1.0 - smoothstep(fogR.x * 0.6, fogR.y * 0.7, distance(vW.xz, fogC.xz)));
    gl_FragColor = vec4(vec3(0.78, 1.0, 0.38) * a, a);
  }`, true);
const mothPts = glowPoints(GLOW.moth, (a, i) => a.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4), `
  void main() {
    float t = time * (2.2 + 2.5 * sd.z) + sd.w * 60.0, r = 5.0 + 9.0 * sd.x + 3.0 * sin(t * 0.7);
    vec3 c = at.xyz + vec3(cos(t) * r + sin(t * 3.1) * 2.5, 14.0 + 12.0 * sd.y + sin(t * 1.3) * 5.0 + sin(t * 4.7) * 1.5, sin(t * 1.1) * r + cos(t * 2.7) * 2.5);
    vec4 mv = viewMatrix * vec4(c, 1.0);
    vA = glowK * at.w; vSd = sd; vW = c;
    gl_PointSize = clamp(1.7 * projectionMatrix[1][1] * vpH * 0.5 / -mv.z, 1.2, 6.0);
    gl_Position = projectionMatrix * mv;
  }`, `
  void main() {
    vec2 q = gl_PointCoord - 0.5; float flap = abs(sin(time * 38.0 + vSd.w * 9.0));
    if (abs(q.x) > 0.5 * (0.35 + 0.65 * flap) || abs(q.y) > 0.32) discard;   // a pale flutter, its wings opening and shutting
    gl_FragColor = vec4(fogged(vec3(1.0, 0.86, 0.62), vW), vA * 0.9);
  }`, false);
function glowFrame() {
  const D = S && S.day, p = S && S.p, on = !!(D && p && state !== 'title') && !(typeof caveIn === 'function' && caveIn());
  const vpH = renderer.domElement.height || 600, night = on ? clamp((0.4 - ENV.lt) / 0.25, 0, 1) : 0, dry = 1 - Math.max(WXV.rain, WXV.fog * 0.7);
  fflyPts.material.uniforms.glowK.value = night * dry * 0.9; fflyPts.material.uniforms.vpH.value = vpH; fflyPts.visible = night * dry > 0.01;
  mothPts.visible = false;
  if (!on || night < 0.01) return;
  // moths: shared out among the fires near you (up to four of them)
  const fires = [...pitL(), ...D.builds.filter(B => B.t === 'fire' || (B.t === 'tpost' && B.fuel > 0)), ...clanCamps()].filter(f => Math.hypot(f.x - p.x, f.y - p.y) < 420).slice(0, 4);
  if (!fires.length) return;
  const at = mothPts.geometry.attributes.at, A = at.array, per = Math.floor(GLOW.moth / fires.length);
  for (let i = 0; i < GLOW.moth; i++) { const f = fires[Math.min(fires.length - 1, Math.floor(i / per))], h = f.t === 'tpost' ? 34 : 0; A[i * 4] = f.x; A[i * 4 + 1] = terrH(f.x, f.y) + h; A[i * 4 + 2] = f.y; A[i * 4 + 3] = i < per * fires.length ? 1 : 0; }
  at.needsUpdate = true;
  mothPts.material.uniforms.glowK.value = night * (1 - WXV.rain); mothPts.material.uniforms.vpH.value = vpH; mothPts.visible = true;
}

// ---- dragonflies: over the nearest pond on a warm day, darting, hanging still, darting again ----
const dfMesh = lifeMesh(lifeQuads([
  { p: 0, c: [[-0.07, -0.9, 0, 0], [0.07, -0.9, 1, 0], [0.07, 0.75, 1, 1], [-0.07, 0.75, 0, 1]] },
  { p: -1, c: [[0, 0.25, 0, -1], [-1, 0.32, 1, -1], [-1, 0.5, 1, 1], [0, 0.42, 0, 1]] },
  { p: 1, c: [[0, 0.25, 0, -1], [1, 0.32, 1, -1], [1, 0.5, 1, 1], [0, 0.42, 0, 1]] },
  { p: -1, c: [[0, 0.02, 0, -1], [-0.9, 0.08, 1, -1], [-0.9, 0.24, 1, 1], [0, 0.18, 0, 1]] },
  { p: 1, c: [[0, 0.02, 0, -1], [0.9, 0.08, 1, -1], [0.9, 0.24, 1, 1], [0, 0.18, 0, 1]] }]),
  8, (a, i) => a.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4), `
  attribute float part; uniform vec4 pondC;
  vec2 spot(float k) { float a = fract(sin(k * 91.7 + sd.x * 13.0) * 4375.5) * 6.2832, r = sqrt(fract(sin(k * 47.3 + sd.y * 7.0) * 9137.1)) * pondC.w * 0.75; return pondC.xz + vec2(cos(a), sin(a)) * r; }
  void main() {
    float t = time / (1.1 + sd.z * 1.4) + sd.w * 20.0, i = floor(t), f = fract(t), m = smoothstep(0.0, 0.22, f);
    vec2 a = spot(i), b = spot(i + 1.0), h = mix(a, b, m), dir = b - a;
    float y = pondC.y + 3.5 + 3.0 * fract(sin(i * 3.7 + sd.z * 5.0) * 999.0) + sin(time * 3.0 + sd.w * 9.0) * 0.3;
    vec3 p = position;
    if (part != 0.0) { float fl = sin(time * 70.0 + sd.w * 9.0 + p.z * 4.0) * 0.5, x = abs(p.x); p = vec3(sign(p.x) * cos(fl) * x, p.y + sin(fl) * x, p.z); }
    p *= 3.2 * lifeK;
    vec3 w = vec3(h.x, y, h.y) + rY(atan(dir.x, dir.y)) * p;
    vW = w; vUv = uv; vSd = sd; vPart = part;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`, `
  void main() {
    if (vPart == 0.0) { gl_FragColor = vec4(lit(mix(vec3(0.1, 0.36, 0.5), vec3(0.16, 0.5, 0.32), vSd.x)), 1.0); return; }
    if (length((vUv - vec2(0.5, 0.0)) / vec2(0.55, 1.0)) > 1.0) discard;
    gl_FragColor = vec4(lit(vec3(0.82, 0.86, 0.9)), 1.0);
  }`);
dfMesh.material.uniforms.pondC = { value: new V4(0, -999, 0, 1) };
let dfK = 0, dfPond = null;
function pondNearest(x, y, R) { let best = null, bd = R; for (const P of lakesNear(x, y, R)) { const d = Math.hypot(P.x - x, P.y - y) - P.rad; if (d < bd) { bd = d; best = P; } } return best; }
function dragonflyFrame(rdt) {
  const p = S && S.p, on = !!(S && S.day && p && state !== 'title');
  const P = on ? pondNearest(p.x, p.y, 650) : null;
  if (P && P !== dfPond) { if (dfK < 0.02) { dfPond = P; dfMesh.material.uniforms.pondC.value.set(P.x, P.lvl, P.y, P.rad); } }
  const want = P && P === dfPond ? clamp((ENV.lt - 0.55) / 0.3, 0, 1) * (1 - Math.max(WXV.rain, WXV.fog)) : 0;
  dfK += clamp(want - dfK, -rdt * 0.5, rdt * 0.5);
  dfMesh.visible = dfK > 0.01; dfMesh.material.uniforms.lifeK.value = dfK;
}

// ---- fish rising in the ponds ----
let fishRiseT = 6;
function fishRiseFrame(rdt) {
  const p = S && S.p; if (!S || !S.day || !p || state !== 'play' || (fishRiseT -= rdt) > 0) return;
  const P = pondNearest(p.x, p.y, 520), dusk = Math.abs(ENV.lt - 0.45) < 0.3 ? 2 : 1;   // they come up most at dawn and dusk
  fishRiseT = (7 + Math.random() * 16) / dusk;
  if (!P || WXV.rain > 0.5) return;
  const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * P.rad * 0.6, x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
  if (Math.hypot(x - p.x, y - p.y) < 40) return;
  const big = Math.random() < 0.25;
  fSplash(x, y, P.lvl, big ? 12 : 6, big ? 0.9 : 0.55); fRing(x, y, P.lvl, big ? 4 : 2.5);
  setTimeout(() => { if (S && S.day) fRing(x, y, P.lvl, big ? 9 : 6); }, 450);
  snd(big ? 'splash' : 'splash_small', { x, y, v: big ? 0.7 : 0.55, far: 650 });
}

// ---- birds flushed off the canopy ----
const FLK = { N: 64, list: [], ring: [] };
{
  const g = new THREE.BufferGeometry();   // a dark V: two wings off a body, flapped by squashing it up and down
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.6, -1, 0.35, -0.1, 0, 0, -0.35, 0, 0, 0.6, 1, 0.35, -0.1, 0, 0, -0.35], 3));
  g.computeVertexNormals();
  FLK.mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0x24211e, side: THREE.DoubleSide }), FLK.N);
  FLK.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); FLK.mesh.count = 0; FLK.mesh.frustumCulled = false; scene.add(FLK.mesh);
}
// k: how many · from: what scared them (they fly away from it)
function birdsUp(x, y, k = 5, from = null, quiet = false) {
  if (!S || !S.p || Math.hypot(x - S.p.x, y - S.p.y) > 1400 || (typeof caveIn === 'function' && caveIn())) return;
  const base = terrH(x, y) + 46 + Math.random() * 18, away = from ? Math.atan2(y - from.y, x - from.x) : Math.random() * TAU;
  for (let i = 0; i < k && FLK.list.length < FLK.N; i++) {
    const a = away + (Math.random() - 0.5) * 1.4, sp = 70 + Math.random() * 50;
    FLK.list.push({ x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 24, z: base + (Math.random() - 0.5) * 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 55 + Math.random() * 35,
      t: 0, life: 6 + Math.random() * 3, ph: Math.random() * 6, turn: (Math.random() - 0.5) * 0.6, s: 2.6 + Math.random() * 1.2 });
  }
  if (!quiet) { snd('bird_wings', { x, y, far: 1200, v: 0.7 + 0.08 * k }); if (Math.random() < 0.55) snd(Math.random() < 0.7 ? 'bird_crow' : 'bird_song', { x, y, far: 1500, at: 0.3 + Math.random() * 0.5, v: 0.8 }); }
}
const _flm = new THREE.Matrix4(), _flq = new THREE.Quaternion(), _fle = new THREE.Euler(), _flv = new THREE.Vector3(), _fls = new THREE.Vector3();
function flockFrame(rdt) {
  const L = FLK.list; let n = 0;
  for (let i = L.length - 1; i >= 0; i--) {
    const b = L[i]; b.t += rdt; if (b.t > b.life) { L.splice(i, 1); continue; }
    const c = Math.cos(b.turn * rdt), s = Math.sin(b.turn * rdt), vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx;
    b.vz += (8 - b.vz) * Math.min(1, rdt * 0.8);   // the climb levels off into flight
    b.x += b.vx * rdt; b.y += b.vy * rdt; b.z += b.vz * rdt;
  }
  for (const b of L) {
    const flap = b.t < 2.5 || (b.t % 2.2) < 1.3 ? Math.sin(b.t * 15 + b.ph) : 0.25, k = Math.min(1, (b.life - b.t) * 1.5) * b.s;
    _fle.set(0, Math.atan2(b.vx, b.vy), 0); _flq.setFromEuler(_fle); _flv.set(b.x, b.z, b.y); _fls.set(k, k * flap * 1.4, k);
    _flm.compose(_flv, _flq, _fls); FLK.mesh.setMatrixAt(n++, _flm);
  }
  // the crows going round: over each camp near enough to see, and over a kill
  const p = S && S.p, D = S && S.day, rings = [];
  if (D && p && rmOn() && WXV.rain < 0.5) for (const k of clanCamps()) if (Math.hypot(k.x - p.x, k.y - p.y) < 2200) rings.push({ x: k.x, y: k.y, n: 3, h: 150, r: 70, seed: k.seed * 7 });
  for (let i = FLK.ring.length - 1; i >= 0; i--) { const R = FLK.ring[i]; if (S.t > R.until) FLK.ring.splice(i, 1); else if (rmOn()) rings.push(R); }
  const now = S ? S.t : 0;
  for (const R of rings) for (let j = 0; j < R.n && n < FLK.N; j++) {
    const a = now * (0.22 + 0.05 * j) * (j % 2 ? 1 : -1) + R.seed + j * 2.1, r = R.r * (0.8 + 0.25 * j), h = terrH(R.x, R.y) + R.h + 14 * Math.sin(now * 0.2 + j), dir = a + (j % 2 ? 1 : -1) * Math.PI / 2;
    const flap = (now * 0.4 + j * 0.37) % 1 < 0.25 ? Math.sin(now * 13 + j) : 0.18, k = 3.2;
    _fle.set(0, Math.atan2(Math.cos(dir), Math.sin(dir)), (j % 2 ? -1 : 1) * 0.25); _flq.setFromEuler(_fle); _flv.set(R.x + Math.cos(a) * r, h, R.y + Math.sin(a) * r); _fls.set(k, k * flap * 1.4, k);
    _flm.compose(_flv, _flq, _fls); FLK.mesh.setMatrixAt(n++, _flm);
  }
  FLK.mesh.count = n; if (n) FLK.mesh.instanceMatrix.needsUpdate = true;
}
// a kill: the crows find it, and stay over it a while
{ const bd = beastDie; beastDie = function (b) { const r = bd.apply(this, arguments);
  if (b && BEAST[b.k] && BEAST[b.k].hp > 2 && S && S.day) { const x = b.x, y = b.y; FLK.ring.push({ x, y, n: 2 + (Math.random() * 2 | 0), h: 110, r: 45, seed: Math.random() * 9, until: S.t + 150 });
    setTimeout(() => snd('bird_crow', { x, y, far: 1500, v: 0.8 }), 15000 + Math.random() * 10000); }
  return r; }; }
// what puts them up: a tree you fell, walking in under one by day, the clan coming through
let flushWalkT = 30;
const flushSeen = new WeakMap(), flushPos = new WeakMap();
{ const df = dayFell; dayFell = function (t) { const r = df.apply(this, arguments); if (t && rmOn()) setTimeout(() => birdsUp(t.x, t.y, 4 + (Math.random() * 4 | 0), S.p), 250); return r; }; }
function flushFrame(rdt) {
  const D = S && S.day, p = S && S.p; if (!D || !p || state !== 'play') return;
  if (rmOn() && WXV.rain < 0.4 && (flushWalkT -= rdt) <= 0) {   // you push in under a tree with birds in it
    flushWalkT = 35 + Math.random() * 70;
    const T = propsNear(p.x, p.y, 70).find(o => o.kind === 'tree' && Math.hypot(o.x - p.x, o.y - p.y) < 60);
    if (T) birdsUp(T.x, T.y, 3 + (Math.random() * 3 | 0), p);
  }
  for (const e of clanList()) {   // they come through the woods: the birds go up ahead of them (once a minute at most per man)
    if (e.dead || !rmOn()) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y), last = flushSeen.get(e) || -1e9, pp = flushPos.get(e), moving = pp && Math.hypot(e.x - pp.x, e.y - pp.y) > 45 * rdt;
    flushPos.set(e, { x: e.x, y: e.y });
    if (d < 900 && d > 160 && S.t - last > 60 && moving && Math.random() < rdt * 0.08) {
      flushSeen.set(e, S.t); birdsUp(e.x + (Math.random() - 0.5) * 60, e.y + (Math.random() - 0.5) * 60, 4 + (Math.random() * 3 | 0), e);
    }
  }
}
{ const as = assaultStart; assaultStart = function (C) { const r = as.apply(this, arguments); if (r && C.siege && C.siege.M && C.siege.M[0] && rmOn()) { const e = C.siege.M[0]; setTimeout(() => birdsUp(e.x, e.y, 7, e), 600); } return r; }; }

{ const lf = lifeFrame; lifeFrame = function (rdt) { lf.apply(this, arguments); smokeFrame(rdt); glowFrame(); dragonflyFrame(rdt); fishRiseFrame(rdt); flockFrame(rdt); flushFrame(rdt); }; }
