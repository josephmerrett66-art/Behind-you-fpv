// ================= the sun's shadows: the real shape of whatever stands in its light =================
// Each frame the trees, logs, the camp, everyone in the woods and you are drawn once more from the sun's side into a depth
// map covering the ground round you, and every lit surface (13-sun's sunShade in LIGHT_GLSL) checks it to see whether the sun
// can reach it. So a pine lays down a long jagged shadow, a raider's shadow swings its arms, and your own runs along beside
// you. They lengthen and warm as the sun goes down and fade out at dusk; past the edge of the map the old soft pools take over.
const SUN = (() => {
  const fast = SET.quality === 'fast', N = fast || TOUCH ? 1024 : 2048, R = fast ? 260 : TOUCH ? 300 : 360;   // a phone gets a lighter map
  const rt = new THREE.WebGLRenderTarget(N, N, { depthBuffer: true, stencilBuffer: false });
  rt.depthTexture = new THREE.DepthTexture(N, N); rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter;
  const cam = new THREE.OrthographicCamera(-R, R, R, -R, 10, 2600); cam.layers.set(1);
  const mat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {   // lifted onto the hills, as everything is in its own shader
    sh.uniforms.terrF = LU.terrF;
    sh.vertexShader = TERR_GLSL + '\n' + sh.vertexShader.replace('#include <project_vertex>', `vec4 wpos = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wpos = instanceMatrix * wpos;
      #endif
      wpos = modelMatrix * wpos; wpos.y += terrH(wpos.xz);
      vec4 mvPosition = viewMatrix * wpos; gl_Position = projectionMatrix * mvPosition;`);
  };
  LU.shMap.value = rt.depthTexture; LU.shP.value.set(0, 1.1 / N, 1.6 / 2590, 0);
  return { N, R, rt, cam, mat, c: new V3(), v: new V3(), d: new V3() };
})();
// mark something as standing in the sun's light (a mesh, or a group and everything in it)
function castsShadow(o) { o.traverse(q => q.layers.enable(1)); return o; }

function sunShadows() {
  const k = LU.sunK.value, on = state === 'play' && k > 0.04;
  LU.shP.value.x = on ? 0.6 * Math.min(1, k * 1.4) : 0; LU.shC.value.w = on ? 1 : 0;
  if (!on) return;
  const { R, N, cam: sc, c, v, d } = SUN, p = S.p;
  // centred a little ahead of where you look, so more of what you can see is covered
  const iso = isoP(), Rk = iso ? Math.max(1, (SET.isoZoom || 1.7) * 0.75) : 1;   // from above, round you and as wide as you can see
  if (sc.right !== R * Rk) { sc.left = sc.bottom = -R * Rk; sc.right = sc.top = R * Rk; sc.updateProjectionMatrix(); LU.shP.value.y = 1.1 / N * Math.min(1.6, Rk); }
  const fx = iso ? 0 : -Math.sin(look.yaw), fz = iso ? 0 : -Math.cos(look.yaw);
  c.set(p.x + fx * R * 0.35, 0, p.y + fz * R * 0.35); c.y = terrH(c.x, c.z);
  d.copy(LU.sunDir.value); if (d.y < 0.3) { d.y = 0.3; d.normalize(); }   // a low sun's shadows run long, but not off the map
  sc.position.copy(c).addScaledVector(d, 1300); sc.up.set(0, 1, 0); sc.lookAt(c); sc.updateMatrixWorld();
  // keep the map's texels fixed on the ground as you walk, so the edges don't crawl
  const tx = 2 * R * Rk / N; v.copy(c).applyMatrix4(sc.matrixWorldInverse);
  const ox = v.x - Math.round(v.x / tx) * tx, oy = v.y - Math.round(v.y / tx) * tx;
  const right = new V3().setFromMatrixColumn(sc.matrixWorld, 0), up = new V3().setFromMatrixColumn(sc.matrixWorld, 1);
  sc.position.addScaledVector(right, -ox).addScaledVector(up, -oy); sc.updateMatrixWorld();
  LU.shM.value.multiplyMatrices(sc.projectionMatrix, sc.matrixWorldInverse);
  LU.shC.value.set(c.x, c.z, R * Rk, 1);
  // the depth from the sun's side: only things marked as casting
  const prevT = renderer.getRenderTarget();
  scene.overrideMaterial = SUN.mat;
  renderer.setRenderTarget(SUN.rt); renderer.clear(false, true, false); renderer.render(scene, sc);
  scene.overrideMaterial = null; renderer.setRenderTarget(prevT);
}
