// ---------------- ink: the bold dark lines round everything ----------------
// Joe: the original Behind You draws black lines round everything, which is what makes it look like a cartoon. The world
// is drawn into a picture first, then laid on the screen with a line wherever one thing stands in front of another: the
// silhouettes of trees, rocks, animals, you, the hills against the sky. It works from depth alone, so flat ground and
// gentle slopes stay clean and only real edges get a line, and the lines thin out into the distance like the fog.
// Pause > Options > Outlines turns it off, along with every other line in the game (91-outline).
const INK = { rt: null, scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
INK.mat = new THREE.ShaderMaterial({
  uniforms: { tCol: { value: null }, tDep: { value: null }, px: { value: new THREE.Vector2(1, 1) }, rad: { value: 1.5 }, near: { value: 2 }, far: { value: 1400 }, fz: { value: 220 }, fr: { value: new THREE.Vector2(400, 900) },
    inkOn: { value: 1 }, inkTint: { value: new THREE.Vector2(0.22, 0.3) }, sharpK: { value: 0.6 }, tShaft: { value: null }, shaftPx: { value: new THREE.Vector2(1, 1) }, shaftCol: { value: new THREE.Vector3() } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `#include <packing>
    uniform sampler2D tCol, tDep, tShaft; uniform vec2 px, shaftPx; uniform float rad, near, far, fz, inkOn, sharpK; uniform vec2 inkTint; uniform vec2 fr; uniform vec3 shaftCol; varying vec2 vUv;
    float W(vec2 o) { float d = texture2D(tDep, vUv + o * px * rad).x; return 1.0 / max(1e-3, -perspectiveDepthToViewZ(d, near, far)); }
    void main() {
      vec4 c4 = texture2D(tCol, vUv); vec3 c = c4.rgb;
      // crisped: each pixel pushed away from the four round it, a little and no more, so fine detail (bark, leaves, grass, the
      // far trees through the haze) stands out without a bright fringe along every edge (Joe: "we have lost a lot of the sharpness")
      vec3 nb = (texture2D(tCol, vUv + vec2(px.x, 0.0)).rgb + texture2D(tCol, vUv - vec2(px.x, 0.0)).rgb
               + texture2D(tCol, vUv + vec2(0.0, px.y)).rgb + texture2D(tCol, vUv - vec2(0.0, px.y)).rgb) * 0.25;
      c = max(c + sharpK * clamp(c - nb, -0.07, 0.07), 0.0);
      // the sun's light caught in the air (92-forest), worked out at a quarter of the size and softened here
      vec3 air = vec3(0.0);
      if (shaftCol.r > 0.0) { float a = texture2D(tShaft, vUv).r * 0.4;
        a += (texture2D(tShaft, vUv + vec2(shaftPx.x, 0.0)).r + texture2D(tShaft, vUv - vec2(shaftPx.x, 0.0)).r + texture2D(tShaft, vUv + vec2(0.0, shaftPx.y)).r + texture2D(tShaft, vUv - vec2(0.0, shaftPx.y)).r) * 0.15;
        air = shaftCol * a; }
      if (inkOn < 0.5) { gl_FragColor = vec4(c + air, 1.0); return; }
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
      // a tree's leaves (drawn with no alpha, 11-trees) are full of little gaps, each with its edge: beyond the nearest trees
      // their lines fade sooner, or a crown further off would be more line than leaf
      ink *= 1.0 - (1.0 - c4.a) * 0.7 * smoothstep(fz - 100.0, fz + 160.0, z);
      // the line is a deep dark of the thing's own colour, not a flat black: a crown's lines a dark green, a trunk's a dark brown,
      // so a tree full of little edges keeps its colour (93-colour)
      gl_FragColor = vec4(mix(c, mix(vec3(0.03, 0.025, 0.02), c * inkTint.x, inkTint.y), ink) + air, 1.0);
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
function inkRender() {   // the world, with its lines if they're on (and the light in the air, 92-forest)
  const air = shaftsOn();
  if ((!SET.ink && !air) || !INK.rt) { renderer.clear(); renderer.render(scene, cam); return; }
  INK.mat.uniforms.inkOn.value = SET.ink ? 1 : 0;
  INK.mat.uniforms.near.value = cam.near; INK.mat.uniforms.far.value = cam.far;
  INK.mat.uniforms.fz.value = S && S.p ? Math.max(220, Math.hypot(cam.position.x - S.p.x, cam.position.z - S.p.y) + 200) : 220;   // from high up (isometric) the lines reach further
  INK.mat.uniforms.fr.value.copy(LU.fogR.value); if (isoP()) INK.mat.uniforms.fr.value.addScalar(INK.mat.uniforms.fz.value);
  renderer.setRenderTarget(INK.rt); renderer.clear(); renderer.render(scene, cam);
  shaftsRender(air);
  renderer.setRenderTarget(null); renderer.clear(); renderer.render(INK.scene, INK.cam);
}
