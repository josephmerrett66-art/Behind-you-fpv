// ================= flames you can see by day =================
// A fire was only glowing sparks, which wash out to nothing in daylight. Now every fire (the pit on the hill, your
// campfires, the signal fire, braziers, the clan's fires, a torch in someone's hand) has tongues of flame standing up
// off it: each a ragged teardrop, white-hot at the root, through yellow and orange to a dull red tip, licking and
// leaning on its own beat. They're drawn as solid shapes, not glow, so they read in full sun as well as at night.
const FT = { N: 400, n: 0, seen: 0 };
{
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  FT.pos = new Float32Array(FT.N * 4); FT.dat = new Float32Array(FT.N * 4);
  for (const [k, a] of [['fp', FT.pos], ['fd', FT.dat]]) { const b = new THREE.InstancedBufferAttribute(a, 4); b.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, b); }
  g.instanceCount = 0; FT.geo = g;
  FT.mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, LU), transparent: true, depthWrite: false,
    vertexShader: TERR_GLSL + `attribute vec4 fp, fd; uniform float time; varying vec2 vQ; varying vec4 vD; varying vec3 vW;
      void main() {
        // fp: x, height off the ground (or, below -9000, an absolute height + 10000), z, size; fd: seed, heat, lean x, lean z
        float s = fp.w, t = time * (1.6 + fract(fd.x * 7.3)) + fd.x * 17.0;
        float h = s * (1.25 + 0.28 * sin(t * 5.1) * sin(t * 3.3 + 1.0) + 0.12 * sin(t * 11.0));
        vec3 base = vec3(fp.x, fp.y < -9000.0 ? fp.y + 10000.0 : fp.y + terrH(fp.xz), fp.z);
        vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        float v = position.y, sway = (0.18 * sin(t * 4.2) + 0.1 * sin(t * 7.7 + 2.0)) * v * v;
        vec3 w = base + R * (position.x * s * 0.62 + sway * s) + vec3(fd.z * v * v * h, v * h, fd.w * v * v * h);
        vQ = vec2(position.x * 2.0, v); vD = fd; vW = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: LIGHT_GLSL + `uniform float time; varying vec2 vQ; varying vec4 vD; varying vec3 vW;
      float h1(float x) { return fract(sin(x * 127.1) * 43758.5); }
      float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
      void main() {
        float v = vQ.y, t = time * 3.0 + vD.x * 31.0;
        float u = vQ.x + (n1(v * 4.0 - t * 1.7) - 0.5) * 0.35 * v;                     // ragged, the edges flickering upward
        float hw = pow(sin(min(1.0, v * 1.35) * 1.5708), 0.55) * (1.0 - pow(v, 1.8)) * (0.85 + 0.3 * n1(t * 0.9 + 3.0));
        float d = abs(u) / max(hw, 0.001);
        if (d > 1.0 || v > 0.98) discard;
        float core = (1.0 - d) * (1.0 - v);
        vec3 c = mix(vec3(0.74, 0.12, 0.03), vec3(1.0, 0.4, 0.05), smoothstep(0.0, 0.28, core));
        c = mix(c, vec3(1.0, 0.74, 0.22), smoothstep(0.34, 0.6, core)); c = mix(c, vec3(1.0, 0.95, 0.78), smoothstep(0.66, 0.9, core));
        float a = smoothstep(1.0, 0.84, d) * smoothstep(0.0, 0.05, v) * (1.0 - smoothstep(0.7, 0.98, v) * 0.5) * vD.y;
        gl_FragColor = vec4(fogged(grey(c * (1.0 + 0.15 * vD.y)), vW), a);
      }`,
  });
  FT.mesh = new THREE.Mesh(g, FT.mat); FT.mesh.frustumCulled = false; FT.mesh.renderOrder = 3; scene.add(FT.mesh);
}
// a fire's tongues this frame: k is its size (1 a campfire), h how high off the ground it burns
function tongues(x, y, k, h = 0, abs = false) {
  if (!S || !S.p || Math.hypot(x - S.p.x, y - S.p.y) > 700) return;
  const n = abs ? 3 : Math.max(1, Math.round(2 + 3.2 * Math.min(k, 2.2))), seed = abs ? 4.2 : hash(x * 0.13, y * 0.29) * 9;
  for (let i = 0; i < n && FT.n < FT.N; i++) {
    const a = seed + i * 2.4, r = i ? (1.5 + 2.6 * hash(i, seed)) * Math.min(k, 2.5) * (abs ? 0.25 : 1) : 0, j = FT.n++ * 4;
    FT.pos[j] = x + Math.cos(a) * r; FT.pos[j + 1] = abs ? h - 10000 : h + 0.5; FT.pos[j + 2] = y + Math.sin(a) * r;
    FT.pos[j + 3] = (i ? 6.5 + 4 * hash(seed, i) : 11) * k * (abs ? 0.55 : 1);
    FT.dat[j] = seed + i * 1.37; FT.dat[j + 1] = i ? 0.9 : 1; FT.dat[j + 2] = Math.cos(a) * 0.12 + (FT.wx || 0); FT.dat[j + 3] = Math.sin(a) * 0.12 + (FT.wz || 0);
  }
}
function tonguesEnd() {
  FT.geo.instanceCount = FT.n;
  for (const k of ['fp', 'fd']) { const b = FT.geo.attributes[k]; b.needsUpdate = true; if (b.clearUpdateRanges) { b.clearUpdateRanges(); b.addUpdateRange(0, FT.n * 4); } }
  FT.n = 0;
}
// the torch in your hand, seen from outside (third person, from above): its flame stands up off the head
const _ftv = new THREE.Vector3();
function tpTorchTongue() {
  if (typeof TP === 'undefined' || !TP.holdId || !TP.hold.visible) return;
  const G = TP.items.get(TP.holdId), fl = G && G.visible && G.getObjectByName('flame'); if (!fl) return;
  fl.visible = false;   // the hand's sprites are for the first-person view
  if (!(S.day && dayTorch())) return;
  TP.hold.updateMatrixWorld(true); fl.getWorldPosition(_ftv);
  tongues(_ftv.x, _ftv.z, 0.95, _ftv.y - 1, true);
}
