// ================= the forest's air: haze among the trunks, the sun's shafts through the crowns, motes in the light =================
// Joe: "my goal now is to make the whole forest really feel like a forest. So do whatever you can to do a full in depth pass
// on just making the forest look better with more detail and atmosphere". What makes a wood feel deep is mostly the air in it:
//   - the haze: the trunks further off go paler and bluer, layer behind layer, thickest in a close stand and lying low among
//     the trunks rather than up in the crowns, glowing toward the sun (fogged, 00-core; set here each frame)
//   - the shafts: where the sun gets through the crowns it lights the air on its way down, so you see the beams, warm when the
//     sun is low. Each pixel walks its line of sight through the sun's own shadow map, so a beam is exactly where a gap in the
//     leaves lets the light through, and moves when they do. Worked out at a quarter of the screen's size
//   - motes: dust and pollen hanging in the air round you, only seen where the sun catches them
// On Fast the shafts are left out; the haze and the motes cost next to nothing.

// ---- the haze ----
const FOREST = { cover: 0, hz: [0.00045, 0.00055] };   // hz: the haze's density in the open, and how much more in a close stand
{ const wl = weatherLight; weatherLight = function () {
    wl.apply(this, arguments);
    const D = S && S.p, H = LU.haze.value;
    if (!D || caveIn()) { H.w = 0; return; }
    // how close the trees stand round you, looked at a little way off on each side too, eased so it never jumps
    const p = S.p; let c = landCover(p.x, p.y) * 0.4;
    for (let k = 0; k < 4; k++) c += landCover(p.x + Math.cos(k * 1.57) * 160, p.y + Math.sin(k * 1.57) * 160) * 0.15;
    FOREST.cover += (c - FOREST.cover) * 0.02;
    const cv = FOREST.cover, f = WXV.fog, r = WXV.rain;
    H.set((FOREST.hz[0] + FOREST.hz[1] * cv) * (1 + 0.6 * f + 0.3 * r), 55 + 25 * f, 1.3 * LU.sunK.value, isoP() ? 0.4 : 1);
    // the air is the sky's own colour at the horizon, dimmer in under the trees where less light reaches it, and a cool
    // blue-green there (93-colour): against the warm light it gives the depth, where a grey haze only dulled everything
    const g = cv * (1 - 0.6 * Math.max(f, r));
    LU.hazeCol.value.copy(LU.fogCol.value).multiply(_hzT.set(1 - 0.43 * g, 1 - 0.26 * g, 1 - 0.25 * g));
  }; }
const _hzT = new V3();

// ---- the shafts ----
const SHAFT = { rt: null, scene: new THREE.Scene(), max: 320, k: [0.2, 0.22, 0.12] };   // k: how strong in the open, the more in a close stand, the more with the sun low
SHAFT.mat = new THREE.ShaderMaterial({
  uniforms: { tDep: { value: null }, shMap: LU.shMap, shM: LU.shM, shP: LU.shP, camPos: LU.camPos, sunDir: LU.sunDir,
    projInv: { value: new M4() }, camWorld: { value: new M4() }, maxD: { value: SHAFT.max } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D tDep, shMap; uniform mat4 projInv, camWorld, shM; uniform vec4 shP; uniform vec3 camPos, sunDir; uniform float maxD; varying vec2 vUv;
    float lit(vec3 p) {   // can the sun reach this point in the air? (off the edge of its map, yes)
      vec3 s = (shM * vec4(p, 1.0)).xyz * 0.5 + 0.5;
      if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
      return step(s.z - shP.z, texture2D(shMap, s.xy).r);
    }
    void main() {
      float z = texture2D(tDep, vUv).x;
      vec4 v = projInv * vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0); v.xyz /= v.w;
      vec3 rd = (camWorld * vec4(v.xyz, 1.0)).xyz - camPos; float L = length(rd); rd /= max(L, 0.001);
      float Lm = min(L, maxD), j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))), a = 0.0;
      for (int i = 0; i < 14; i++) a += lit(camPos + rd * (Lm * (float(i) + j) / 14.0));
      // most of the light is thrown on forward: the beams stand out looking toward the sun, faint looking away
      float ph = 0.1 + pow(max(dot(rd, sunDir), 0.0), 5.0);
      gl_FragColor = vec4(a / 14.0 * ph * Lm / maxD, 0.0, 0.0, 1.0);
    }`,
  depthTest: false, depthWrite: false,
});
SHAFT.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), SHAFT.mat));
function shaftsOn() {
  return SET.quality !== 'fast' && state === 'play' && !isoP() && !caveIn() && LU.shC.value.w > 0 && LU.sunK.value > 0.05;
}
function shaftsRender(on) {
  const U = INK.mat.uniforms;
  if (!on) { U.shaftCol.value.set(0, 0, 0); return; }
  const w = Math.max(1, Math.ceil(INK.rt.width / 4)), h = Math.max(1, Math.ceil(INK.rt.height / 4));
  if (!SHAFT.rt) { SHAFT.rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, stencilBuffer: false }); SHAFT.rt.texture.minFilter = SHAFT.rt.texture.magFilter = THREE.LinearFilter; }
  else if (SHAFT.rt.width !== w || SHAFT.rt.height !== h) SHAFT.rt.setSize(w, h);
  const M = SHAFT.mat.uniforms; M.tDep.value = INK.rt.depthTexture; M.projInv.value.copy(cam.projectionMatrixInverse); M.camWorld.value.copy(cam.matrixWorld);
  renderer.setRenderTarget(SHAFT.rt); renderer.render(SHAFT.scene, INK.cam);
  // warm, and stronger, with the sun low; more of it in a close stand, where there's shade for the beams to stand out against
  const sk = LU.sunK.value, low = 1 - clamp((LU.sunDir.value.y - 0.25) / 0.5, 0, 1), a = LU.amb.value;
  const k = (SHAFT.k[0] + SHAFT.k[1] * FOREST.cover + SHAFT.k[2] * low) * Math.min(1, sk * 1.5) * (1 + 0.8 * WXV.fog) * (1 - 0.7 * WXV.rain);
  U.shaftCol.value.set(a.x * k * (1 + 0.15 * low), a.y * k, a.z * k * (1 - 0.25 * low));
  U.tShaft.value = SHAFT.rt.texture; U.shaftPx.value.set(1 / w, 1 / h);
}

// ---- motes ----
const MOTE = { N: TOUCH ? 200 : 420, B: 70 };
{
  const g = new THREE.BufferGeometry(), a = new Float32Array(MOTE.N * 3);
  for (let i = 0; i < a.length; i++) a[i] = Math.random();
  g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.boundingSphere = new THREE.Sphere(new V3(), 1e9);
  MOTE.mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, LU, { uScale: PU.uScale, B: { value: MOTE.B } }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    // (the sun test is in the fragment: a depth map read in a vertex shader isn't to be relied on everywhere)
    vertexShader: TERR_GLSL + `uniform float time, uScale, B, rainW, sunK; uniform vec3 camPos, sunDir; varying float vA; varying vec3 vW;
      void main() {
        vec3 sd = position;
        // drifting on the air, settling slowly, each on its own wander; wrapped round you so there are always some about
        vec3 drift = vec3(time * 1.1, -time * 0.5, time * 0.6) + vec3(sin(time * 0.31 + sd.x * 40.0) * 3.0, sin(time * 0.23 + sd.y * 31.0) * 2.0, cos(time * 0.27 + sd.z * 27.0) * 3.0);
        vec3 rel = mod(sd * B + drift - camPos + B * 0.5, B) - B * 0.5, w = camPos + rel;
        float d = length(rel), ph = 0.3 + 1.4 * pow(max(dot(rel / max(d, 0.01), sunDir), 0.0), 4.0);
        vA = sunK * ph * smoothstep(2.0, 7.0, d) * (1.0 - smoothstep(24.0, 35.0, d)) * (0.55 + 0.45 * sin(time * 1.7 + sd.x * 60.0)) * (1.0 - rainW)
           * step(terrH(w.xz) + 1.0, w.y);
        vW = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
        gl_PointSize = vA < 0.01 ? 0.0 : clamp(uScale * 0.3 / gl_Position.w, 1.0, 3.5);
      }`,
    fragmentShader: LIGHT_GLSL + `varying float vA; varying vec3 vW;
      void main() { float r = length(gl_PointCoord - 0.5) * 2.0, a = vA * smoothstep(0.6, 0.9, sunShade(vW)); if (r > 1.0 || a < 0.01) discard;
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.78) * a * (1.0 - r * r) * 0.55, 1.0); }`,
  });
  MOTE.pts = new THREE.Points(g, MOTE.mat); MOTE.pts.frustumCulled = false; MOTE.pts.renderOrder = 6; scene.add(MOTE.pts);
}
{ const lf = lifeFrame; lifeFrame = function (rdt) { lf.apply(this, arguments); MOTE.pts.visible = !caveIn() && LU.sunK.value > 0.05; }; }
