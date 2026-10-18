// ---------------- ink: the bold dark lines round everything ----------------
// Joe: the original Behind You draws black lines round everything, which is what makes it look like a cartoon. The world
// is drawn into a picture first, then laid on the screen with a line wherever one thing stands in front of another: the
// silhouettes of trees, rocks, animals, you, the hills against the sky. It works from depth alone, so flat ground and
// gentle slopes stay clean and only real edges get a line, and the lines thin out into the distance like the fog.
// Pause > Options > Outlines turns it off, along with every other line in the game (91-outline).
const INK = { rt: null, scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
INK.mat = new THREE.ShaderMaterial({
  uniforms: { tCol: { value: null }, tDep: { value: null }, px: { value: new THREE.Vector2(1, 1) }, rad: { value: 1.5 }, near: { value: 2 }, far: { value: 1400 }, fz: { value: 220 }, fr: { value: new THREE.Vector2(400, 900) } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `#include <packing>
    uniform sampler2D tCol, tDep; uniform vec2 px; uniform float rad, near, far, fz; uniform vec2 fr; varying vec2 vUv;
    float W(vec2 o) { float d = texture2D(tDep, vUv + o * px * rad).x; return 1.0 / max(1e-3, -perspectiveDepthToViewZ(d, near, far)); }
    void main() {
      vec3 c = texture2D(tCol, vUv).rgb;
      float w = W(vec2(0.0)), k = 0.0;
      // a plane is straight in 1/depth across the screen, so its second difference is nothing; an edge is a kink in it.
      // Only the nearer side of the kink takes the line, so it sits on the outside of the thing in front. Two rings of
      // samples, so the line is a solid band rather than a hairline.
      for (int i = 0; i < 2; i++) {
        float s = i == 0 ? 0.5 : 1.0;
        k = max(k, max(2.0 * w - W(vec2(-s, 0.0)) - W(vec2(s, 0.0)), 2.0 * w - W(vec2(0.0, s)) - W(vec2(0.0, -s))));
        k = max(k, max(2.0 * w - W(vec2(-0.7, 0.7) * s) - W(vec2(0.7, -0.7) * s), 2.0 * w - W(vec2(0.7, 0.7) * s) - W(vec2(-0.7, -0.7) * s)));
      }
      k /= w;
      float z = 1.0 / w, ink = smoothstep(0.025, 0.07, k) * (1.0 - smoothstep(fz, fz + 450.0, z)) * (1.0 - 0.85 * smoothstep(fr.x * 0.7, fr.y * 0.75, z));   // and thin out as the haze swallows things
      gl_FragColor = vec4(mix(c, vec3(0.03, 0.025, 0.02), ink), 1.0);
    }`,
  depthTest: false, depthWrite: false,
});
INK.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), INK.mat));
function inkResize() {
  const w = Math.max(1, Math.round(VW * pixK)), h = Math.max(1, Math.round(VH * pixK));
  if (!INK.rt) {
    INK.rt = new THREE.WebGLRenderTarget(w, h, { samples: AA ? 4 : 0, depthBuffer: true, stencilBuffer: false });
    INK.rt.depthTexture = new THREE.DepthTexture(w, h); INK.rt.depthTexture.type = THREE.UnsignedIntType;
  } else INK.rt.setSize(w, h);
  INK.mat.uniforms.tCol.value = INK.rt.texture; INK.mat.uniforms.tDep.value = INK.rt.depthTexture;
  INK.mat.uniforms.px.value.set(1 / w, 1 / h); INK.mat.uniforms.rad.value = Math.max(2, 2.6 * pixK);
}
function inkRender() {   // the world, with its lines if they're on
  if (!SET.ink || !INK.rt) { renderer.clear(); renderer.render(scene, cam); return; }
  INK.mat.uniforms.near.value = cam.near; INK.mat.uniforms.far.value = cam.far;
  INK.mat.uniforms.fz.value = S && S.p ? Math.max(220, Math.hypot(cam.position.x - S.p.x, cam.position.z - S.p.y) + 200) : 220;   // from high up (isometric) the lines reach further
  INK.mat.uniforms.fr.value.copy(LU.fogR.value); if (isoP()) INK.mat.uniforms.fr.value.addScalar(INK.mat.uniforms.fz.value);
  renderer.setRenderTarget(INK.rt); renderer.clear(); renderer.render(scene, cam);
  renderer.setRenderTarget(null); renderer.clear(); renderer.render(INK.scene, INK.cam);
}
