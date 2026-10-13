// ================= sun shafts: light slanting down through the treetops on a clear day =================
// A few soft beams hang under the canopies round you, running from the leaves down to the ground along the sun's own angle.
// Each is one glowing ribbon that turns about its length to face you, so they cost next to nothing to draw. They fade in
// with full sun, out at dusk, in rain and fog, and as you walk right into one.
const RAY_MAX = 48;
const rayGeo = new THREE.InstancedBufferGeometry();
rayGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0], 3)); rayGeo.setIndex([0, 1, 2, 0, 2, 3]);
const rayDat = new Float32Array(RAY_MAX * 4), rayDat2 = new Float32Array(RAY_MAX * 4);
{ const a = new THREE.InstancedBufferAttribute(rayDat, 4); a.setUsage(THREE.DynamicDrawUsage); rayGeo.setAttribute('rd', a); }
{ const a = new THREE.InstancedBufferAttribute(rayDat2, 4); a.setUsage(THREE.DynamicDrawUsage); rayGeo.setAttribute('rd2', a); }
rayGeo.instanceCount = 0;
const rayMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ rk: { value: 0 }, rAx: { value: new V3(0, -1, 0) } }, LU), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: `attribute vec4 rd, rd2; uniform vec3 rAx, camPos; varying vec2 vQ; varying float vF, vS, vB;
    void main() {
      // rd: the top of the beam (in the leaves) and its width; rd2: how long it runs, a seed
      vec3 top = rd.xyz, ax = rAx, bot = top + ax * rd2.x;
      vec3 p = mix(top, bot, position.y);
      vec3 side = normalize(cross(ax, normalize(p - camPos))); float w = rd.w * mix(0.8, 1.35, position.y);   // spreads a little as it falls
      p += side * position.x * w;
      vQ = position.xy; vS = rd2.y;
      vB = 0.6 + 1.1 * pow(max(dot(normalize(p - camPos), -ax), 0.0), 2.0);   // brightest looking up into the light
      float d = distance(camPos, p); vF = smoothstep(8.0, 70.0, d) * (1.0 - smoothstep(300.0, 520.0, d));
      gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: `uniform float rk, time; uniform float colourK; varying vec2 vQ; varying float vF, vS, vB;
    void main() {
      float across = smoothstep(1.0, 0.15, abs(vQ.x));
      float along = smoothstep(0.0, 0.18, vQ.y) * (1.0 - smoothstep(0.55, 1.0, vQ.y));           // soft where it leaves the canopy and as it nears the ground
      float streak = 0.65 + 0.35 * sin(vQ.x * 7.0 + vS * 40.0) * sin(vQ.x * 3.1 - vS * 13.0 + time * 0.15);   // a few strands in it
      float breathe = 0.75 + 0.25 * sin(time * 0.35 + vS * 30.0);                                   // leaves moving overhead
      float a = rk * across * along * streak * breathe * vF * vB * 0.7;
      vec3 c = mix(vec3(0.95), vec3(1.0, 0.9, 0.68), colourK) * a;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
const rayMesh = new THREE.Mesh(rayGeo, rayMat); rayMesh.frustumCulled = false; rayMesh.renderOrder = 5; scene.add(rayMesh);

// where each beam lands: a warm, dappled patch of sun on the ground
const spotGeo = new THREE.InstancedBufferGeometry();
spotGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1], 3)); spotGeo.setIndex([0, 2, 1, 0, 3, 2]);
spotGeo.setAttribute('rd', rayGeo.attributes.rd); spotGeo.setAttribute('rd2', rayGeo.attributes.rd2);
const spotMat = new THREE.ShaderMaterial({
  uniforms: rayMat.uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute vec4 rd, rd2; uniform vec3 rAx, camPos; varying vec2 vQ; varying vec3 vW; varying float vS;
    void main() {
      vec3 bot = rd.xyz + rAx * rd2.x; vec2 along = normalize(rAx.xz + vec2(1e-4)), across = vec2(-along.y, along.x);
      float w = rd.w * 1.5; vec2 xz = bot.xz + across * position.x * w + along * position.z * w * 1.6;
      vW = vec3(xz.x, 0.3, xz.y); vQ = position.xz; vS = rd2.y;
      gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
    }`,
  fragmentShader: `uniform float rk, colourK; uniform vec3 camPos; uniform vec2 fogR; varying vec2 vQ; varying vec3 vW; varying float vS;
    void main() {
      float r = dot(vQ, vQ); if (r > 1.0) discard;
      float dap = 0.6 + 0.4 * sin(vW.x * 0.5 + vS * 20.0) * sin(vW.z * 0.43 - vS * 11.0);
      float a = rk * (1.0 - smoothstep(0.2, 1.0, r)) * dap * 0.22 * (1.0 - smoothstep(fogR.x, fogR.y, distance(vW.xz, camPos.xz)));
      gl_FragColor = vec4(mix(vec3(0.95), vec3(1.0, 0.86, 0.6), colourK) * a, 1.0);
    }`,
});
const spotMesh = new THREE.Mesh(spotGeo, spotMat); spotMesh.frustumCulled = false; spotMesh.renderOrder = 3; scene.add(spotMesh);

// which trees let light through: re-picked when the woods round you are re-filled
let rayKey = null;
function raysPlace() {
  let n = 0; const p = S.p;
  const trees = WORLD.props.filter(o => o.kind === 'tree' && kindOfTree(o) !== 'dead' && (o.seed * 7.31 % 1) < 0.45)
    .map(o => [Math.hypot(o.x - p.x, o.y - p.y), o]).filter(q => q[0] < 480).sort((a, b) => a[0] - b[0]);
  for (const [, o] of trees) {
    const beams = 1 + ((o.seed * 13.7 % 1) < 0.4 ? 1 : 0);
    for (let b = 0; b < beams && n < RAY_MAX; b++, n++) {
      const sd = (o.seed * 3.17 + b * 0.37) % 1, ang = sd * Math.PI * 2, off = (kindOfTree(o) === 'pine' ? 6 : 12) * o.s * (0.4 + 0.6 * ((sd * 5.3) % 1));
      const h = (kindOfTree(o) === 'pine' ? 30 : 38) * o.s * TREE_K * (0.75 + 0.25 * ((sd * 9.1) % 1));
      rayDat.set([o.x + Math.cos(ang) * off, h, o.y + Math.sin(ang) * off, (14 + 16 * ((sd * 2.9) % 1)) * o.s], n * 4);
      rayDat2.set([0, sd, 0, 0], n * 4);
    }
  }
  rayGeo.instanceCount = spotGeo.instanceCount = n; rayGeo.attributes.rd.needsUpdate = true;
}
function raysFrame() {
  if (rayKey !== WORLD.props) { rayKey = WORLD.props; raysPlace(); }
  // strongest with the sun well up and clear skies; gone at night, in rain and in fog
  const lt = ENV.lt, sun = LU.sunK.value, sd = LU.sunDir.value;
  const k = clamp((lt - 0.55) / 0.35, 0, 1) * clamp(sun, 0, 1) * (1 - Math.max(WXV.rain, WXV.fog));
  rayMat.uniforms.rk.value = k;
  rayMesh.visible = spotMesh.visible = k > 0.01 && rayGeo.instanceCount > 0;
  if (!rayMesh.visible) return;
  // they lean away from the sun, but never lower than a steep slant, so a low sun doesn't lay them flat
  const hl = Math.hypot(sd.x, sd.z) || 1, ax = rayMat.uniforms.rAx.value.set(-sd.x / hl * 0.5, -1, -sd.z / hl * 0.5).normalize();
  // how far each beam runs: from its height in the leaves down to the ground
  const n = rayGeo.instanceCount;
  for (let i = 0; i < n; i++) rayDat2[i * 4] = rayDat[i * 4 + 1] / -ax.y;
  rayGeo.attributes.rd2.needsUpdate = true;
}
