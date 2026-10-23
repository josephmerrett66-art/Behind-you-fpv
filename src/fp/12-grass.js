// ================= the turf: fine short grass over all the ground, blade by blade =================
// Fields of thin blades ride along with you, one inside the next: a dense one underfoot and wider, sparser ones out to the
// horizon, blending into each other so there's no edge to see. Each blade keeps its own spot in the world (a field wraps
// round as you walk, so nothing slides or pops underfoot), and blades thin out and shrink smoothly with distance.
// A top-down mask keeps it off ponds, floors you've laid, fire pits and tent floors.
const GR_N = 60000, GR_RINGS = [120, 360, 1080, 2160], GM_N = 1024, GM_S = 4800;
const grassMaskData = new Uint8Array(GM_N * GM_N).fill(255);
const grassMaskTex = new THREE.DataTexture(grassMaskData, GM_N, GM_N, THREE.RedFormat, THREE.UnsignedByteType);
grassMaskTex.magFilter = grassMaskTex.minFilter = THREE.LinearFilter; grassMaskTex.needsUpdate = true;
const grassU = { mask: { value: grassMaskTex }, mo: { value: new THREE.Vector2(-GM_S / 2, -GM_S / 2) }, ms: { value: GM_S }, gmap: { value: floorTex } };
const GRASS_V = TERR_GLSL + SOIL_GLSL + `attribute vec4 bd; uniform vec3 camPos; uniform float time, ms, ring; uniform vec2 mo; uniform sampler2D mask;
  varying vec3 vW, vTN; varying vec4 vS; varying float vUp, vTone, vRoot;
  const float R0 = ${GR_RINGS[0].toFixed(1)}, R1 = ${GR_RINGS[1].toFixed(1)}, R2 = ${GR_RINGS[2].toFixed(1)}, R3 = ${GR_RINGS[3].toFixed(1)};
  float fin(float R, float d) { return 1.0 - smoothstep(R * 0.7, R, d); }   // 1 well inside a field, 0 at its edge
  void main() {
    float R = ring < 0.5 ? R0 : ring < 1.5 ? R1 : ring < 2.5 ? R2 : R3;
    vec2 rt = camPos.xz + mod(bd.xy * R - camPos.xz + R, 2.0 * R) - R;   // its own spot in the world, the nearest copy to you
    float d = distance(rt, camPos.xz);
    // how thick the turf is out here, and this field's share of it: the shares add to one, so the fields meet without a seam
    float want = min(1.0, pow(40.0 / max(d, 1.0), 2.0)), dens = pow(R / R0, 2.0);
    float share = ring < 0.5 ? fin(R0, d) : ring < 1.5 ? fin(R1, d) - fin(R0, d) : ring < 2.5 ? fin(R2, d) - fin(R1, d) : fin(R3, d) - fin(R2, d);
    float m = texture2D(mask, (rt - mo) / ms).r;
    float k = (bd.w < want * dens * share ? 1.0 : 0.0) * smoothstep(0.35, 0.7, m) * step(0.5, coastGrass(rt));
    vS = vec4(0.0);
    if (k > 0.0) {                                                     // (only for the blades that stand: most are hidden)
      vec4 sw = soilW(rt); vS = sw;
      k *= step(sw.w * 0.85, fract(bd.w * 13.7));                       // thin on stony ground
      k *= 1.0 - 0.35 * sw.x + 0.4 * sw.y;
      vec4 L = landW(rt); k *= step(L.r * 0.6, fract(bd.w * 5.3)) * (1.0 + 0.25 * L.a);
      float cv = coverW(rt); k *= step(smoothstep(0.22, 0.6, cv + (sNoise(rt * 0.022 + 5.0) - 0.5) * 0.45) * 0.82, fract(bd.w * 3.71));   // thin on a stand's floor (the ground's own litter, 00-core)   // sparse in the thickets' shade, lush in the glades                              // short and dry on sand, long on loam
    }
    // Fully excluded blades must be clipped, rather than flattened into tiny slivers.
    // This also skips terrain and wind work for the majority outside each ring.
    if (k <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float shrink = 1.0 / (1.0 + d / 260.0), widen = 1.0 + d / 140.0;      // smaller further off, but never thinner than a hair
    float up = position.y * shrink * k;
    float c = cos(bd.z), s = sin(bd.z);
    vec3 w = vec3(rt.x + position.x * widen * c, up + terrH(rt), rt.y + position.x * widen * s); vTN = terrN(rt);
    // a breeze that runs across the turf, and a little shiver of its own
    float br = sin(time * 1.3 + rt.x * 0.05 + rt.y * 0.035) * 0.5 + sin(time * 2.7 + rt.x * 0.3 + bd.w * 6.0) * 0.25;
    w.x += br * 0.35 * up; w.z += br * 0.2 * up;
    vW = w; vUp = position.y / 6.6; vTone = fract(bd.w * 7.13); vRoot = position.y;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`;
const GRASS_F = LIGHT_GLSL + `uniform sampler2D gmap; uniform float rainW; varying vec3 vW, vTN; varying vec4 vS; varying float vUp, vTone, vRoot;
  void main() {
    vec3 g = texture2D(gmap, vW.xz / 384.0).rgb;
    vec3 lo = vec3(0.27, 0.39, 0.19), hi = vec3(0.57, 0.66, 0.34);                // a short, slightly dry green...
    lo = mix(lo, vec3(0.43, 0.43, 0.23), vS.x); hi = mix(hi, vec3(0.69, 0.65, 0.38), vS.x);   // ...straw on dry ground
    lo = mix(lo, vec3(0.22, 0.36, 0.19), vS.y); hi = mix(hi, vec3(0.46, 0.61, 0.29), vS.y);   // ...deep green on loam
    lo = mix(lo, vec3(0.42, 0.42, 0.2), vS.z * 0.6); hi = mix(hi, vec3(0.6, 0.56, 0.3), vS.z * 0.6);   // ...olive on clay
    vec3 turf = mix(lo, hi, vTone) * (0.85 + 0.3 * g.r);
    vec3 c = mix(turf * 0.76, turf * 1.12, smoothstep(0.0, 0.8, vUp));
    c *= mix(0.86, 1.0, smoothstep(0.0, 1.8, vRoot));                          // shaded down among the roots
    c *= mix(1.0, 0.72, rainW); c = mix(c, c * vec3(0.9, 1.0, 1.04), rainW);      // wet: darker and a little cooler
    gl_FragColor = vec4(fogged(grey(c * lightAt(vW, vec3(0.0, 1.0, 0.0), 0.0) * 1.12 * slopeLit(normalize(vTN))), vW), 1.0);
  }`;
{
  const pos = new Float32Array(GR_N * 9), bd = new Float32Array(GR_N * 12);
  let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  let tuftX = 0, tuftZ = 0;
  for (let i = 0; i < GR_N; i++) {
    // where it stands in its field (a square that wraps, -1..1 across), how tall, how wide, which way it faces and leans
    // Three slim blades share a root neighbourhood. No additional triangles or draws.
    // Tufts are scattered through the buffer so quality reductions leave an even field.
    if (i % 3 === 0) { tuftX = rnd() * 2 - 1; tuftZ = rnd() * 2 - 1; }
    const x = tuftX + (rnd() - 0.5) * 0.008, z = tuftZ + (rnd() - 0.5) * 0.008;
    const h = 2.2 + rnd() * rnd() * 4.4, w = 0.28 + rnd() * 0.28, f = rnd() * Math.PI * 2, r = rnd();
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
  const meshes = [];
  GR_RINGS.forEach((R, i) => {
    const m = new THREE.ShaderMaterial({ uniforms: Object.assign({ ring: { value: i } }, grassU, LU), side: THREE.DoubleSide, vertexShader: GRASS_V, fragmentShader: GRASS_F, depthWrite: false });   // no depth, so the outline pass reads the ground under it, not every blade
    const o = new THREE.Mesh(g, m); o.frustumCulled = false; o.renderOrder = 1; o.visible = SET.grass; scene.add(o); meshes.push(o);
  });
  var grassMesh = { geometry: g, meshes };   // what the quality governor thins, and the Grass setting hides
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
  const rect = (x, y, a, hl, hw, keep) => {   // a turned square or oblong (keep: only where this says so)
    const r = Math.hypot(hl, hw), ca = Math.cos(a), sa = Math.sin(a);
    const i0 = Math.max(0, Math.floor((x - r - ox) / c)), i1 = Math.min(GM_N - 1, Math.ceil((x + r - ox) / c));
    const j0 = Math.max(0, Math.floor((y - r - oy) / c)), j1 = Math.min(GM_N - 1, Math.ceil((y + r - oy) / c));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = ox + (i + 0.5) * c - x, dy = oy + (j + 0.5) * c - y, f = dx * ca + dy * sa, s = -dx * sa + dy * ca;
      if (Math.abs(f) < hl && Math.abs(s) < hw && (!keep || keep(ox + (i + 0.5) * c, oy + (j + 0.5) * c))) M[j * GM_N + i] = 0;
    }
  };
  for (const P of lakes) {   // the water and a muddy margin round it, following the shore (08-ponds)
    const r = P.rmax + 12, i0 = Math.max(0, Math.floor((P.x - r - ox) / c)), i1 = Math.min(GM_N - 1, Math.ceil((P.x + r - ox) / c));
    const j0 = Math.max(0, Math.floor((P.y - r - oy) / c)), j1 = Math.min(GM_N - 1, Math.ceil((P.y + r - oy) / c));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (pondIn(P, ox + (i + 0.5) * c, oy + (j + 0.5) * c, 6)) M[j * GM_N + i] = 0;
  }
  if (!EX_FIRE.gone) disc(EX_FIRE.x, EX_FIRE.y, 20);
  for (const o of CAMP) if (o.camp === 'tent') disc(o.x, o.y, 22);
  const D = S.day;
  for (const B of D.builds) if (B.t === 'fire') disc(B.x, B.y, 14);
  for (const o of D.bld.values()) {
    const P = PC(o.id); if (!P || P.lay === 'roof') continue;
    // a floor trimmed at the camp fence leaves the grass growing on the side it was cut from
    const keep = o.clip ? (gx, gy) => (Math.hypot(gx, gy) < CAMP_R) === (o.clip > 0) : null;
    if (P.sh === 'sq') rect(o.x, o.y, o.a || 0, GRID / 2, GRID / 2, keep); else if (P.sh === 'tri') { if (keep) rect(o.x, o.y, o.a || 0, TRI_R * 0.8, TRI_R * 0.8, (gx, gy) => keep(gx, gy) && Math.hypot(gx - o.x, gy - o.y) < TRI_R * 0.8); else disc(o.x, o.y, TRI_R * 0.8); }
  }
  grassU.mo.value.set(ox, oy); grassMaskTex.needsUpdate = true;
}
Object.assign(groundMesh.material.uniforms, { mask: grassU.mask, mo: grassU.mo, ms: grassU.ms });   // the ground under it knows where it grows
