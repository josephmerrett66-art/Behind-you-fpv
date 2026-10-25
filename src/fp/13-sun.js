// ================= the sun's shadows: the real shape of whatever stands in its light =================
// Each frame the trees, logs, the camp, everyone in the woods and you are drawn once more from the sun's side into a depth
// map covering the ground round you, and every lit surface (13-sun's sunShade in LIGHT_GLSL) checks it to see whether the sun
// can reach it. So a pine lays down a long jagged shadow, a raider's shadow swings its arms, and your own runs along beside
// you. They lengthen and warm as the sun goes down and fade out at dusk; past the edge of the map the old soft pools take over.
const SUN = (() => {
  const fast = SET.quality === 'fast', N = fast || TOUCH ? 1024 : SET.quality==='auto'?1536:2048, R = fast ? 260 : TOUCH ? 300 : 360;   // a phone gets a lighter map
  const rt = new THREE.WebGLRenderTarget(N, N, { depthBuffer: true, stencilBuffer: false });
  rt.depthTexture = new THREE.DepthTexture(N, N); rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter;
  const cam = new THREE.OrthographicCamera(-R, R, R, -R, 10, 2600); cam.layers.set(1);
  const mat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  const treeMat=mat.clone();treeMat.defaultAttributeValues={canopy:[0],gu:[0,0,0]};
  for(const material of [mat,treeMat])material.onBeforeCompile=sh=>{
    sh.uniforms.terrF=LU.terrF;
    sh.vertexShader=TERR_GLSL+'\n'+sh.vertexShader.replace('#include <project_vertex>',`vec4 wpos=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        wpos=instanceMatrix*wpos;
      #endif
      wpos=modelMatrix*wpos;wpos.y+=terrH(wpos.xz);
      vec4 mvPosition=viewMatrix*wpos;gl_Position=projectionMatrix*mvPosition;`);
    if(material===treeMat){
      sh.uniforms.foliageT=LU.foliageT;sh.uniforms.leafT=LU.time;sh.uniforms.leafRange=LU.leafRange;
      // the crowns sway in the breeze as they do in view (11-trees), so their shadows sway with them
      sh.uniforms.gustC=LU.fogC;
      sh.vertexShader='attribute vec3 gu;attribute float canopy;uniform float leafT;uniform vec3 gustC;varying vec3 vCanopyG;varying float vCanopyM;\n'+GUST_GLSL+sh.vertexShader.replace('vec4 wpos=','vCanopyG=gu;vCanopyM=canopy;vec4 wpos=').replace('wpos=modelMatrix*wpos;wpos.y+=terrH(wpos.xz);',`wpos=modelMatrix*wpos;
      { mat4 im=modelMatrix;
        #ifdef USE_INSTANCING
          im=modelMatrix*instanceMatrix;
        #endif
        float k=max(0.0,transformed.y-24.0)/90.0,ph=im[3].x*0.013+im[3].z*0.017;k*=k*(1.0+1.4*gustAt(im[3].xz,gustC.xz,leafT));
        wpos.x+=(sin(leafT*0.9+ph)*0.6+sin(leafT*2.3+ph*3.0)*0.25+sin(leafT*4.1+ph*5.0)*0.08)*k*6.0;wpos.z+=sin(leafT*0.7+ph*1.7)*k*3.0; }
      wpos.y+=terrH(wpos.xz);`);
      sh.fragmentShader=FOLIAGE_CUT_GLSL+'varying vec3 vCanopyG;varying float vCanopyM;\n'+sh.fragmentShader.replace('void main() {','void main() {if(((vCanopyM>4.5&&vCanopyM<5.5)||vCanopyM>7.5)&&foliageGap(foliageField(vCanopyG)))discard;');
    }
  };
  // Distinct cache keys: the opaque depth-only program must not acquire foliage cutouts.
  mat.customProgramCacheKey=()=> 'sun-opaque';treeMat.customProgramCacheKey=()=> 'sun-foliage';
  LU.shMap.value = rt.depthTexture; LU.shP.value.set(0, 1.1 / N, 1.6 / 2590, 0);
  return { N, R, rt, cam, mat, treeMat, materials:[], c: new V3(), v: new V3(), d: new V3(), frustum: new THREE.Frustum() };
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
  // Test complete caster bounds in light space, including casters outside the camera view.
  SUN.frustum.setFromProjectionMatrix(LU.shM.value);
  treeShadowFrame();
  // the depth from the sun's side: only things marked as casting
  const prevT = renderer.getRenderTarget();
  // only the trees and rocks near enough to land a shadow in the map (they're kept nearest first): the rest are left out of this pass
  const cut = [];
  if (typeof TREES !== 'undefined') for (const k of TREE_KINDS) for (const B of TREES[k]) if (B.shN !== undefined && B.m.count > B.shN) { cut.push([B.m, B.m.count]); B.m.count = B.shN; }
  for (const P of [propsW]) for (const kind in P.k) if (P.k[kind]) for (const B of P.k[kind]) if (B.shadow && B.m.count > B.shN) { cut.push([B.m, B.m.count]); B.m.count = B.shN; }
  // Keep ordinary casters on their fast opaque depth program. Only trees need
  // the leaf mask; assigning materials preserves the existing one-draw-per-mesh pass.
  const materials=SUN.materials;materials.length=0;
  scene.traverseVisible(o=>{if(o.material&&o.layers.test(sc.layers)){materials.push(o,o.material);o.material=o.geometry?.attributes.canopy?SUN.treeMat:SUN.mat;}});
  const prevOverride=scene.overrideMaterial;scene.overrideMaterial=null;
  try{renderer.setRenderTarget(SUN.rt);renderer.clear(false,true,false);renderer.render(scene,sc);}
  finally{for(let i=0;i<materials.length;i+=2)materials[i].material=materials[i+1];materials.length=0;scene.overrideMaterial=prevOverride;renderer.setRenderTarget(prevT);}
  for (const [m, n] of cut) m.count = n;
}
// The tilted map projects much farther across the ground at sunrise/sunset than its
// orthographic radius. Keep the loaded tree pool; the light frustum selects each frame.
function shadowReach() { return drawR() + VIS.preload; }
