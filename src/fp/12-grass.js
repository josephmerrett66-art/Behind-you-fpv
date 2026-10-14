// ================= the turf: fine short grass over all the ground, blade by blade =================
// Fields of thin blades ride along with you, one inside the next: a dense one underfoot and wider, sparser ones out to the
// horizon, blending into each other so there's no edge to see. Each blade keeps its own spot in the world (a field wraps
// round as you walk, so nothing slides or pops underfoot), and blades thin out and shrink smoothly with distance.
// A top-down mask keeps it off ponds, floors you've laid, fire pits and tent floors.
const GR_N = 100000, GR_RINGS = [120, 360, 1080], GM_N = 512, GM_S = 2400;
const grassMaskData = new Uint8Array(GM_N * GM_N).fill(255);
const grassMaskTex = new THREE.DataTexture(grassMaskData, GM_N, GM_N, THREE.RedFormat, THREE.UnsignedByteType);
grassMaskTex.magFilter = grassMaskTex.minFilter = THREE.LinearFilter; grassMaskTex.needsUpdate = true;
const grassU = { mask: { value: grassMaskTex }, mo: { value: new THREE.Vector2(-GM_S / 2, -GM_S / 2) }, ms: { value: GM_S }, gmap: { value: floorTex } };
const GRASS_V = TERR_GLSL + SOIL_GLSL + `attribute vec4 bd; uniform vec3 camPos; uniform float time, ms, ring; uniform vec2 mo; uniform sampler2D mask;
  varying vec3 vW, vTN; varying vec4 vS; varying float vUp, vTone, vRoot;
  const float R0 = ${GR_RINGS[0].toFixed(1)}, R1 = ${GR_RINGS[1].toFixed(1)}, R2 = ${GR_RINGS[2].toFixed(1)};
  float fin(float R, float d) { return smoothstep(R, R * 0.7, d); }   // 1 well inside a field, 0 at its edge
  void main() {
    float R = ring < 0.5 ? R0 : ring < 1.5 ? R1 : R2;
    vec2 rt = camPos.xz + mod(bd.xy * R - camPos.xz + R, 2.0 * R) - R;   // its own spot in the world, the nearest copy to you
    float d = distance(rt, camPos.xz);
    // how thick the turf is out here, and this field's share of it: the shares add to one, so the fields meet without a seam
    float want = min(1.0, pow(40.0 / max(d, 1.0), 2.0)), dens = pow(R / R0, 2.0);
    float share = ring < 0.5 ? fin(R0, d) : ring < 1.5 ? fin(R1, d) - fin(R0, d) : fin(R2, d) - fin(R1, d);
    float m = texture2D(mask, (rt - mo) / ms).r;
    float k = (bd.w < want * dens * share ? 1.0 : 0.0) * smoothstep(0.35, 0.7, m);
    vS = vec4(0.0);
    if (k > 0.0) {                                                     // (only for the blades that stand: most are hidden)
      vec4 sw = soilW(rt); vS = sw;
      k *= step(sw.w * 0.85, fract(bd.w * 13.7));                       // thin on stony ground
      k *= 1.0 - 0.35 * sw.x + 0.4 * sw.y;
      vec4 L = landW(rt); k *= step(L.r * 0.6, fract(bd.w * 5.3)) * (1.0 + 0.25 * L.a);   // sparse in the thickets' shade, lush in the glades                              // short and dry on sand, long on loam
    }
    float shrink = 1.0 / (1.0 + d / 260.0), widen = 1.0 + d / 140.0;      // smaller further off, but never thinner than a hair
    float up = position.y * shrink * k;
    float c = cos(bd.z), s = sin(bd.z);
    vec3 w = vec3(rt.x + position.x * widen * c, up + terrH(rt), rt.y + position.x * widen * s); vTN = terrN(rt);
    // a breeze that runs across the turf, and a little shiver of its own
    float br = sin(time * 1.3 + rt.x * 0.05 + rt.y * 0.035) * 0.5 + sin(time * 2.7 + rt.x * 0.3 + bd.w * 6.0) * 0.25;
    w.x += br * 0.35 * up; w.z += br * 0.2 * up;
    vW = w; vUp = position.y / 3.3; vTone = fract(bd.w * 7.13); vRoot = position.y;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`;
const GRASS_F = LIGHT_GLSL + `uniform sampler2D gmap; varying vec3 vW, vTN; varying vec4 vS; varying float vUp, vTone, vRoot;
  void main() {
    vec3 g = texture2D(gmap, vW.xz / 384.0).rgb;
    vec3 lo = vec3(0.36, 0.46, 0.2), hi = vec3(0.56, 0.62, 0.3);                // a short, slightly dry green...
    lo = mix(lo, vec3(0.54, 0.5, 0.25), vS.x); hi = mix(hi, vec3(0.74, 0.68, 0.38), vS.x);   // ...straw on dry ground
    lo = mix(lo, vec3(0.2, 0.35, 0.12), vS.y); hi = mix(hi, vec3(0.34, 0.52, 0.18), vS.y);   // ...deep green on loam
    lo = mix(lo, vec3(0.42, 0.42, 0.2), vS.z * 0.6); hi = mix(hi, vec3(0.6, 0.56, 0.3), vS.z * 0.6);   // ...olive on clay
    vec3 turf = mix(lo, hi, vTone) * (0.85 + 0.3 * g.r);
    vec3 c = mix(turf * 0.62, turf * 1.15, smoothstep(0.0, 0.8, vUp));
    c *= mix(0.75, 1.0, smoothstep(0.0, 1.2, vRoot));                          // shaded down among the roots
    gl_FragColor = vec4(fogged(grey(c * lightAt(vW, vec3(0.0, 1.0, 0.0), 0.0) * 1.12 * slopeLit(normalize(vTN))), vW), 1.0);
  }`;
{
  const pos = new Float32Array(GR_N * 9), bd = new Float32Array(GR_N * 12);
  let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < GR_N; i++) {
    // where it stands in its field (a square that wraps, -1..1 across), how tall, how wide, which way it faces and leans
    const x = rnd() * 2 - 1, z = rnd() * 2 - 1, h = 0.9 + rnd() * rnd() * 2.0, w = 0.24 + rnd() * 0.18, f = rnd() * Math.PI * 2, r = rnd();
    const lean = (rnd() - 0.5) * 0.9;
    // three corners: two at the root, one at the tip, leaning a little to one side
    const v = [[-w / 2, 0], [w / 2, 0], [lean * h * 0.35, h]];
    for (let k = 0; k < 3; k++) {
      pos.set([v[k][0], v[k][1], 0], i * 9 + k * 3);
      bd.set([x, z, f, r], i * 12 + k * 4);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('bd', new THREE.BufferAttribute(bd, 4));
  g.boundingSphere = new THREE.Sphere(new V3(), 1e5);
  if (SET.quality === 'fast') g.setDrawRange(0, Math.floor(GR_N * 0.45) * 3);   // a sparser lawn on the fast setting
  GR_RINGS.forEach((R, i) => {
    const m = new THREE.ShaderMaterial({ uniforms: Object.assign({ ring: { value: i } }, grassU, LU), side: THREE.DoubleSide, vertexShader: GRASS_V, fragmentShader: GRASS_F });
    const o = new THREE.Mesh(g, m); o.frustumCulled = false; o.renderOrder = 0; scene.add(o);
  });
  var grassMesh = { geometry: g };   // what the quality governor thins
}

// the mask: re-drawn when you've walked a way or something on the ground has changed
let grassKey = '';
function grassMask(px, py, lakes, gen) {
  const cx = Math.round(px / 40) * 40, cy = Math.round(py / 40) * 40, key = cx + ',' + cy + ',' + gen;
  if (key === grassKey) return; grassKey = key;
  const ox = cx - GM_S / 2, oy = cy - GM_S / 2, c = GM_S / GM_N, M = grassMaskData;
  M.fill(255);
  const disc = (x, y, r) => {
    const i0 = Math.max(0, Math.floor((x - r - ox) / c)), i1 = Math.min(GM_N - 1, Math.ceil((x + r - ox) / c));
    const j0 = Math.max(0, Math.floor((y - r - oy) / c)), j1 = Math.min(GM_N - 1, Math.ceil((y + r - oy) / c));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(ox + (i + 0.5) * c - x, oy + (j + 0.5) * c - y) < r) M[j * GM_N + i] = 0;
  };
  const rect = (x, y, a, hl, hw) => {   // a turned square or oblong
    const r = Math.hypot(hl, hw), ca = Math.cos(a), sa = Math.sin(a);
    const i0 = Math.max(0, Math.floor((x - r - ox) / c)), i1 = Math.min(GM_N - 1, Math.ceil((x + r - ox) / c));
    const j0 = Math.max(0, Math.floor((y - r - oy) / c)), j1 = Math.min(GM_N - 1, Math.ceil((y + r - oy) / c));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = ox + (i + 0.5) * c - x, dy = oy + (j + 0.5) * c - y, f = dx * ca + dy * sa, s = -dx * sa + dy * ca;
      if (Math.abs(f) < hl && Math.abs(s) < hw) M[j * GM_N + i] = 0;
    }
  };
  for (const P of lakes) disc(P.x, P.y, P.rad * 1.12);
  disc(EX_FIRE.x, EX_FIRE.y, 20);
  for (const o of CAMP) if (o.camp === 'tent') disc(o.x, o.y, 22);
  const D = S.day;
  for (const B of D.builds) if (B.t === 'fire') disc(B.x, B.y, 14);
  for (const o of D.bld.values()) {
    const P = PC(o.id); if (!P || P.lay === 'roof') continue;
    if (P.sh === 'sq') rect(o.x, o.y, o.a || 0, GRID / 2, GRID / 2); else if (P.sh === 'tri') disc(o.x, o.y, TRI_R * 0.8);
  }
  grassU.mo.value.set(ox, oy); grassMaskTex.needsUpdate = true;
}
Object.assign(groundMesh.material.uniforms, { mask: grassU.mask, mo: grassU.mo, ms: grassU.ms });   // the ground under it knows where it grows
