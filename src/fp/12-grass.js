// ================= the turf: fine short grass over all the ground, blade by blade =================
// One field of thin blades rides along with you. Each blade keeps its own spot in the world (the field wraps round as you
// walk, so nothing slides underfoot) and thins out with distance; past the edge the ground's own colour carries on.
// A small top-down mask keeps it off ponds, floors you've laid, fire pits and tent floors.
const GR_R = 120, GR_N = 110000, GM_N = 160, GM_S = (GR_R + 40) * 2;
const grassMaskData = new Uint8Array(GM_N * GM_N).fill(255);
const grassMaskTex = new THREE.DataTexture(grassMaskData, GM_N, GM_N, THREE.RedFormat, THREE.UnsignedByteType);
grassMaskTex.magFilter = grassMaskTex.minFilter = THREE.LinearFilter; grassMaskTex.needsUpdate = true;
const grassU = { mask: { value: grassMaskTex }, mo: { value: new THREE.Vector2(-GM_S / 2, -GM_S / 2) }, ms: { value: GM_S }, gmap: { value: floorTex } };
{
  const pos = new Float32Array(GR_N * 9), bd = new Float32Array(GR_N * 12);
  let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < GR_N; i++) {
    // where it stands in the field (a square 2R across that wraps), how tall, how wide, which way it faces and leans
    const x = (rnd() * 2 - 1) * GR_R, z = (rnd() * 2 - 1) * GR_R, h = 0.9 + rnd() * rnd() * 2.0, w = 0.24 + rnd() * 0.18, f = rnd() * Math.PI * 2, r = rnd();
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
  const m = new THREE.ShaderMaterial({
    uniforms: Object.assign(grassU, LU), side: THREE.DoubleSide,
    vertexShader: `attribute vec4 bd; uniform vec3 camPos; uniform float time, ms; uniform vec2 mo; uniform sampler2D mask; uniform vec2 fogR;
      varying vec3 vW; varying float vUp, vTone, vRoot;
      void main() {
        vec2 R = vec2(${GR_R.toFixed(1)});
        vec2 rt = camPos.xz + mod(bd.xy - camPos.xz + R, 2.0 * R) - R;   // its own spot in the world, the nearest copy to you
        float d = distance(rt, camPos.xz);
        float keep = clamp(1.0 - pow(d / R.x, 1.6), 0.0, 1.0);            // dense underfoot, thinner further off
        float m = texture2D(mask, (rt - mo) / ms).r;
        float k = (bd.w < keep * keep * 1.15 ? 1.0 : 0.0) * smoothstep(0.35, 0.7, m) * smoothstep(R.x, R.x * 0.85, d);
        float up = position.y;
        float c = cos(bd.z), s = sin(bd.z);
        vec3 w = vec3(rt.x + position.x * c, up * k, rt.y + position.x * s);
        // a breeze that runs across the turf, and a little shiver of its own
        float br = sin(time * 1.3 + rt.x * 0.05 + rt.y * 0.035) * 0.5 + sin(time * 2.7 + rt.x * 0.3 + bd.w * 6.0) * 0.25;
        w.x += br * 0.35 * up; w.z += br * 0.2 * up;
        vW = w; vUp = up / 3.3; vTone = bd.w; vRoot = up;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: LIGHT_GLSL + `uniform sampler2D gmap; varying vec3 vW; varying float vUp, vTone, vRoot;
      void main() {
        vec3 g = texture2D(gmap, vW.xz / 384.0).rgb;
        vec3 turf = mix(vec3(0.36, 0.46, 0.2), vec3(0.56, 0.62, 0.3), vTone) * (0.85 + 0.3 * g.r);   // a short, slightly dry green
        vec3 c = mix(turf * 0.62, turf * 1.15, smoothstep(0.0, 0.8, vUp));
        c *= mix(0.75, 1.0, smoothstep(0.0, 1.2, vRoot));                          // shaded down among the roots
        gl_FragColor = vec4(fogged(grey(c * lightAt(vW, vec3(0.0, 1.0, 0.0), 0.0) * 1.12), vW), 1.0);
      }`,
  });
  if (SET.quality === 'fast') g.setDrawRange(0, Math.floor(GR_N * 0.45) * 3);   // a sparser lawn on the fast setting
  var grassMesh = new THREE.Mesh(g, m); grassMesh.frustumCulled = false; grassMesh.renderOrder = 0; scene.add(grassMesh);
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
