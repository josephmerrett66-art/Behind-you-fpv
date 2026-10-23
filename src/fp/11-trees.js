// ================= the trees, built solid: the same pines, oaks, cherries and dead trees as the pictures, in the round =================
// Each kind is modelled a few ways over (trunk, limbs, and a crown of soft lumps or drooping tiers of needles), in the
// pictures' own colours with the same dark outline, then stood about the woods many times over in one draw per model.
const TREE_R3D = 1e9, TREE_NV = 3;   // every tree solid, near or far
const treeMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU),
  vertexShader: TERR_GLSL + `attribute vec3 color, gu; attribute float em, mt; uniform float time; uniform vec3 fogC;
      #ifdef USE_INSTANCING
        attribute float baseHeight;
      #endif
      varying float vTreeD; varying vec3 vC, vW, vN, vG, vL; varying float vE, vM;
    void main() {
      mat4 im = modelMatrix;
      #ifdef USE_INSTANCING
        im = modelMatrix * instanceMatrix;
      #endif
      vec4 w = im * vec4(position, 1.0);
      float k = max(0.0, position.y - 24.0) / 90.0, ph = im[3].x * 0.013 + im[3].z * 0.017;   // the crown sways in the breeze, the trunk stands
      w.x += (sin(time * 0.9 + ph) * 0.6 + sin(time * 2.3 + ph * 3.0) * 0.25) * k * k * 6.0; w.z += sin(time * 0.7 + ph * 1.7) * k * k * 3.0;
      #ifdef USE_INSTANCING
        #ifdef CAVES
          if (im[3].x > ${CAVE_X0.toFixed(1)}) w.y += terrH(im[3].xz); else
        #endif
        w.y += baseHeight;
      #else
        w.y += terrH(im[3].xz);
      #endif
      vTreeD = distance(im[3].xz, fogC.xz); vW = w.xyz; vL = position; vN = normalize(mat3(im) * normal); vC = color; vE = em; vG = gu; vM = mt;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: LIGHT_GLSL + PAINT_GLSL + `varying vec3 vC, vW, vN, vG, vL; varying float vE, vM;
    uniform vec4 occ;
    float occluding(vec3 p) {   // from above: on the line between the camera and you, a tree thins away
      if (occ.w < 0.5 || p.y < occ.y - 4.0) return 0.0;
      vec3 ab = occ.xyz - camPos; float t = clamp(dot(p - camPos, ab) / dot(ab, ab), 0.0, 1.0);
      return 1.0 - smoothstep(26.0, 46.0, distance(p, camPos + ab * t));
    }
    void main() {
      if (occluding(vW) > fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.999) discard;
      vec3 N = normalize(vN), c;
      bool leaf = vM > 4.5 && vM < 5.5, needle = vM > 7.5;
      if (leaf || needle) {
        // right beside you, the leaves thin out so a tree never blinds you
        float d = distance(vW, camPos), dz = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        if (d < 34.0 && dz > smoothstep(16.0, 34.0, d)) discard;
        float up = smoothstep(-0.5, 0.9, N.y) * 0.55 + smoothstep(10.0, 110.0, vL.y) * 0.25;   // lit from above, darker underneath and inside
        if (leaf) {   // dabs of paint: clumps of leaves, lighter ones catching the light
          float a = vn(vG * 0.55), b = vn(vG * 1.7 + 7.0);
          c = vC * (0.62 + 0.5 * up) * (0.78 + 0.32 * a) + vC * smoothstep(0.62, 0.8, b) * 0.35 * up;
        } else {      // needles: short strokes raked down and out
          float s = vn(vec3(vG.x * 1.6, vG.y * 0.35, vG.z * 1.6)), t = vn(vG * 0.4);
          c = vC * (0.68 + 0.45 * up) * (0.75 + 0.35 * s) * (0.9 + 0.2 * t) + vec3(0.06, 0.12, 0.08) * smoothstep(0.7, 0.85, s) * up;   // (never quite black underneath: light comes in sideways under the canopy)
        }
      } else { paintH = vL.y; c = paint(vC, vM, vG, vW, N); }
      vec3 o = c * lightAt(vW, N, 1.0) * 1.05;
      gl_FragColor = vec4(fogged(grey(o), vW), 1.0);
    }`,
});
const treeEdge = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU), side: THREE.BackSide,
  vertexShader: TERR_GLSL + `attribute float ew; uniform float time; varying vec3 vW;
    void main() {
      mat4 im = modelMatrix;
      #ifdef USE_INSTANCING
        im = modelMatrix * instanceMatrix;
      #endif
      vec4 w = im * vec4(position + normal * ew, 1.0);
      float k = max(0.0, position.y - 24.0) / 90.0, ph = im[3].x * 0.013 + im[3].z * 0.017;
      w.x += (sin(time * 0.9 + ph) * 0.6 + sin(time * 2.3 + ph * 3.0) * 0.25) * k * k * 6.0; w.z += sin(time * 0.7 + ph * 1.7) * k * k * 3.0; w.y += terrH(im[3].xz);
      vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: LIGHT_GLSL + `varying vec3 vW;
    uniform vec4 occ;
    void main() { if (distance(vW, camPos) < 30.0) discard; if (occ.w > 0.5 && vW.y > occ.y - 4.0) { vec3 ab = occ.xyz - camPos; float t = clamp(dot(vW - camPos, ab) / dot(ab, ab), 0.0, 1.0); if (distance(vW, camPos + ab * t) < 40.0) discard; } vec3 L = lightAt(vW, vec3(0.0), 0.0); float b = clamp(dot(L, vec3(0.34)) * 2.2, 0.0, 1.0); gl_FragColor = vec4(fogged(vec3(0.122, 0.114, 0.102) * b, vW), 1.0); }`,
});

// soft lumps for a crown, and a tier of a pine's skirt with a ragged, drooping hem
const P_LUMP = (k = 0, lo = false) => prim('lump' + k + (lo ? 'lo' : ''), () => {
  const g = lo ? new THREE.SphereGeometry(0.5, 8, 6) : new THREE.SphereGeometry(0.5, 12, 9), p = g.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 0.9 + 0.14 * Math.sin(v.x * 9 + k) * Math.sin(v.y * 8 + k * 2) * Math.sin(v.z * 10 + k * 3) + 0.07 * Math.sin(v.x * 27 + v.y * 13 + v.z * 21 + k); v.multiplyScalar(n); v.y *= 0.88; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
});
const P_TIER = (k = 0, lo = false) => prim('tier' + k + (lo ? 'lo' : ''), () => {
  const n = lo ? 9 : 16, g = new THREE.ConeGeometry(0.5, 1, n, lo ? 1 : 2), p = g.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); if (v.y > 0.49) continue;
    const r = Math.hypot(v.x, v.z); if (r < 1e-4) continue;
    const a = Math.atan2(v.z, v.x), f = r / 0.5, tuft = 0.5 + 0.5 * Math.cos(a * 9 + k * 1.7), jag = 1 + (0.16 * tuft + 0.07 * Math.sin(a * 23 + k)) * f;
    p.setXYZ(i, v.x * jag, v.y - 0.12 * f * f * tuft, v.z * jag);
  }
  g.translate(0, 0.5, 0); g.computeVertexNormals(); return g;
});

// Share identical model vertices, preserving every attribute bit-for-bit. The GPU then runs
// terrain/wind/lighting setup once per shared vertex rather than for every triangle corner.
function indexModel(g) {
  const entries=Object.entries(g.attributes),n=g.attributes.position.count;
  const bits=entries.map(([,a])=>new Uint32Array(a.array.buffer,a.array.byteOffset,a.array.length));
  const heads=new Map(),next=[],original=[],indices=new Uint32Array(n);
  for(let i=0;i<n;i++){
    let hash=2166136261;
    for(let a=0;a<entries.length;a++){const w=entries[a][1].itemSize;for(let k=0;k<w;k++)hash=Math.imul(hash^bits[a][i*w+k],16777619);}
    let found=-1;
    for(let j=heads.get(hash);j!==undefined&&j>=0;j=next[j]){
      const other=original[j];let same=true;
      for(let a=0;a<entries.length&&same;a++){const w=entries[a][1].itemSize;for(let k=0;k<w;k++)if(bits[a][i*w+k]!==bits[a][other*w+k]){same=false;break;}}
      if(same){found=j;break;}
    }
    if(found<0){found=original.length;original.push(i);next.push(heads.get(hash)??-1);heads.set(hash,found);}
    indices[i]=found;
  }
  for(const [name,a] of entries){const out=new a.array.constructor(original.length*a.itemSize);for(let j=0;j<original.length;j++)out.set(a.array.subarray(original[j]*a.itemSize,(original[j]+1)*a.itemSize),j*a.itemSize);g.setAttribute(name,new THREE.BufferAttribute(out,a.itemSize,a.normalized));}
  g.setIndex(new THREE.BufferAttribute(original.length<=65535?new Uint16Array(indices):indices,1));
  return g;
}

function treeModel(kind, vi, lo = false) {   // one tree, in the pictures' own units (a pine is about 112 high), its foot at the origin
  let s = 977 + vi * 131 + kind.length * 17; const R = () => (s = (s * 16807) % 2147483647) / 2147483647, K = new Kit();
  const tone = (list, j) => hex(list[j % list.length]);
  // lo: the same tree for the far woods, in fewer faces and without the twigs you couldn't see from there (TREE_LOD)
  const roots = (r, n, col) => { for (let i = 0; i < n; i++) { const a = i / n * 6.283 + R() * 0.6; K.rod(P_CYL_(5), Math.cos(a) * r * 0.4, r * 1.6, Math.sin(a) * r * 0.4, Math.cos(a) * r * 2.3, -0.6, Math.sin(a) * r * 2.3, r * 0.34, col); } };   // roots running out into the ground (bark)
  const P_TIER_ = k => P_TIER(k, lo), P_LUMP_ = k => P_LUMP(k, lo), P_CYL_ = n => P_CYL(lo ? Math.max(4, n >> 1) : n), P_CONE_ = n => P_CONE(lo ? Math.max(4, n >> 1) : n), P_KNOB_ = k => lo ? P_LUMP(k, true) : P_KNOB(k);
  if (kind === 'pine') {
    // three of them: a spruce in drooping skirts of boughs, blue-green; a fir, broader and greener, the trunk showing at its
    // foot; and a tall pine, a long bare trunk going orange up high and a ragged crown of needle clumps on top. Each skirt is
    // pale at its tips where the new growth is and dark in toward the trunk, so the tiers read one under the next
    if (vi < 2) {
      const sp = vi === 0, H = sp ? 110 : 102, y0 = sp ? 29 : 33;   // the lowest boughs clear your head, so you walk in under them
      K.mt = 'bark';
      K.add(P_CONE_(9), 0, 0, 0, 8.4, H - 6, 8.4, hex('#6a4c37'), 0, 0, 0, 0, 0.35);        // the trunk, tapering up through the boughs
      roots(4.2, 5, hex('#5a402e'));
      K.mt = 8;
      const tiers = sp ? 8 : 7, G = sp ? [['#173b2e', '#47836a'], ['#1b4234', '#52907a'], ['#15372a', '#3f7a60']] : [['#1d4026', '#58944f'], ['#22482b', '#66a05a'], ['#1b3c24', '#4c8846']];
      for (let i = 0; i < tiers; i++) {
        const f = i / (tiers - 1), y = y0 + f * (H - y0 - 18), r = (sp ? 66 : 72) * Math.pow(1 - f * 0.84, 1.08) * (0.9 + 0.2 * R()), h = (sp ? 22 : 24) - f * 9, c = G[(i + vi) % 3];
        kitGrad(K, () => K.add(P_TIER_((i + vi) % 4), (R() - 0.5) * 3, y, (R() - 0.5) * 3, r, h, r, hex(c[1]), R() * 6.28, 0, (R() - 0.5) * 0.1, 0, 0.32), hex(c[1]), hex(c[0]), 1.4);
      }
      kitGrad(K, () => K.add(P_CONE_(7), 0, H - 20, 0, 10, 24, 10, hex(G[1][1]), 0, 0, 0.05, 0, 0.3), hex(G[1][0]), hex(G[1][1]));   // the leader
    } else {
      K.mt = 'bark';
      K.rod(P_CYL_(9), 0, 0, 0, 1.5, 64, 0.6, 3.7, hex('#5e4433'));                           // low down the bark is dark and deep-furrowed...
      K.add(P_CONE_(9), 1.5, 62, 0.6, 6.8, 60, 6.8, hex('#b4704a'), 0, 0, 0, 0, 0.3);        // ...up high it goes thin and orange
      roots(3.7, 4, hex('#523a2b'));
      for (let i = 0; i < 4; i++) { const a = i * 2.3 + 0.7, y = 30 + i * 8, L = 7 + R() * 5, dy = R() * 3; if (!lo) K.rod(P_CYL_(4), 1.2, y, 0.4, 1.2 + Math.cos(a) * L, y - 2 - dy, 0.4 + Math.sin(a) * L, 0.7, hex('#4a3a2e')); }   // old snapped-off branches (the same draws of R near and far, so the two forms match)
      const tips = [];
      for (let i = 0; i < 6; i++) {   // boughs out from the top of the trunk, each ending in a clump of needles
        const a = i * 2.4 + vi + R() * 0.5, y = 74 + i * 6 + R() * 4, L = 16 + R() * 10 - i * 1.2, tx = 1.5 + Math.cos(a) * L, tz = 0.6 + Math.sin(a) * L, ty = y + 6 + R() * 6;
        K.rod(P_CYL_(5), 1.5, y, 0.6, tx, ty, tz, 1.3, hex('#7a4c32')); tips.push([tx, ty, tz, 1 - i / 7]);
      }
      tips.push([1.5, 122, 0.6, 0.5]);
      K.mt = 8;
      const G = [['#22462a', '#64a058'], ['#284e2e', '#72aa62'], ['#1f4127', '#58944e']];
      tips.forEach(([x, y, z, w], i) => { const r = 30 + w * 14 + R() * 6, c = G[i % 3]; kitGrad(K, () => K.add(P_TIER_((i + 1) % 4), x, y - 4, z, r, r * 0.42, r * 0.92, hex(c[1]), R() * 6.28, 0, (R() - 0.5) * 0.25, 0, 0.32), hex(c[1]), hex(c[0]), 1.3); });   // flat ragged tufts of needles, pale at their tips
    }
    K.mt = null;
  } else if (kind === 'oak' || kind === 'cherry') {
    const ch = kind === 'cherry', trunkH = ch ? 46 : 50, crownY = ch ? 66 : 64;
    K.mt = 'bark';
    K.rod(P_CYL_(10), 0, 0, 0, (R() - 0.5) * 4, trunkH, (R() - 0.5) * 4, ch ? 4.4 : 5.2, hex(ch ? '#54443a' : '#5c4a3a'));
    roots(ch ? 4.4 : 5.2, 5, hex(ch ? '#4a3c32' : '#4e3f31'));   // roots spreading into the ground at its foot
    const limbs = ch ? 5 : 4, tips = [];
    for (let i = 0; i < limbs; i++) {   // limbs out from the top of the trunk into the crown
      const a = i / limbs * 6.28 + R() * 0.8, L = (ch ? 30 : 22) + R() * 10, y0 = trunkH * (0.6 + 0.3 * R());
      const tx = Math.cos(a) * L, tz = Math.sin(a) * L, ty = crownY - 4 + R() * 10;
      K.rod(P_CYL_(7), 0, y0, 0, tx, ty, tz, ch ? 1.9 : 2.3, hex('#54443a')); tips.push([tx, ty, tz]);
    }
    K.mt = null;
    // the crown: soft lumps of leaf (or blossom), bigger and darker at the heart, smaller and lighter round the top and edges
    const G = ch ? ['#cc649c', '#e080b2', '#ee9ec4', '#d670a8'] : ['#2b5220', '#386628', '#477834', '#3d6c2b'];
    K.mt = 'plant';
    const lumps = ch ? 5 + vi % 2 : 8 + vi % 2;
    for (let i = 0; i < lumps; i++) {
      const a = i / lumps * 6.28 + R(), d = (ch ? 22 : 20) + R() * 12, r = (ch ? 32 : 38) + R() * 12, y = crownY + (R() - 0.3) * 18;
      K.add(P_LUMP_(i % 5), Math.cos(a) * d, y, Math.sin(a) * d, r, r * 0.85, r, tone(G, i), R() * 6.28, 0, 0, 0, 0.32);
    }
    K.add(P_LUMP_(5), 0, crownY + 16, 0, ch ? 34 : 40, 30, ch ? 34 : 40, tone(G, 2), 0, 0, 0, 0, 0.32);
    if (ch) for (const [x, y, z] of tips) K.add(P_LUMP_(6), x, y + 4, z, 30, 24, 30, tone(G, 3), R() * 6.28, 0, 0, 0, 0.3);
    K.mt = null;
  } else {   // dead: a bare trunk, snapped at the top, its limbs forking into twigs
    K.mt = 'bark';
    K.add(P_CYL_(9), 0, 0, 0, 10, 5, 10, hex('#3f3630'), 0, 0, 0, 0, 0.35);
    K.rod(P_CYL_(9), 0, 0, 0, 1, 52, 0, 4.4, hex('#4d433b'));
    K.add(P_CONE_(7), 1, 51, 0, 7, 8, 7, hex('#4d433b'), 0, 0, 0.3, 0, 0.3);
    const fork = (x, y, z, a, el, L, r, depth) => {
      const ex = x + Math.cos(a) * Math.cos(el) * L, ey = y + Math.sin(el) * L, ez = z + Math.sin(a) * Math.cos(el) * L;
      if (!lo || depth > 0) K.rod(P_CYL_(5), x, y, z, ex, ey, ez, r, hex('#4d433b'));   // far off, without the finest twigs
      if (depth > 0) for (let j = 0; j < 2; j++) fork(ex, ey, ez, a + (j ? 0.6 : -0.6) + (R() - 0.5) * 0.5, el + 0.15 + R() * 0.3, L * 0.6, r * 0.6, depth - 1);
    };
    for (let i = 0; i < 4; i++) fork(0, 26 + i * 7, 0, i * 1.7 + R(), 0.35 + R() * 0.4, 20 + R() * 8, 1.25, 2);
    K.mt = null;
  }
  return indexModel(K.geometry());
}

// one instanced draw (and its outline) per kind and way of building it
// Three bands round you, each its own draw: up close (TREE_NEAR) the trees whose leaves thin away as you brush past and,
// seen from above, fade where they'd hide you; then the same trees drawn solid; then past TREE_LOD the plainer far-off
// form, solid too. A shader that can throw away a pixel stops a phone skipping the hidden surfaces behind it, which in a
// stand of trees is most of them, so only the few trees near enough to need it get that shader
const TREE_KINDS = ['pine', 'oak', 'cherry', 'dead'], TREE_CAP = 2800, TREE_LOD = 800, TREE_LOD_END = 1000, TREE_NEAR = 120;
const treeMatSolid = (() => {
  const a = 'if (occluding(vW) > fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.999) discard;', b = 'if (d < 34.0 && dz > smoothstep(16.0, 34.0, d)) discard;';
  if (!treeMat.fragmentShader.includes(a) || !treeMat.fragmentShader.includes(b)) throw new Error('treeMatSolid: the tree shader changed');
  return new THREE.ShaderMaterial({ uniforms: treeMat.uniforms, vertexShader: treeMat.vertexShader, fragmentShader: treeMat.fragmentShader.replace(a, '').replace(b, '') });
})();
// Load both forms before the transition, then crossfade them per pixel as the player moves.
function treeLodMaterial(high) {
  const m = treeMatSolid.clone(); m.uniforms = treeMatSolid.uniforms;
  m.fragmentShader = 'varying float vTreeD;\n' + treeMatSolid.fragmentShader.replace('void main() {', `void main() {
    float lf = smoothstep(${TREE_LOD.toFixed(1)}, ${TREE_LOD_END.toFixed(1)}, vTreeD);
    float ln = fract(sin(dot(floor(vW * 2.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    if (${high ? 'ln < lf || lf >= 1.0' : 'ln >= lf'}) discard;`);
  return m;
}
const treeLodHigh = treeLodMaterial(true), treeLodLow = treeLodMaterial(false);
const TREE_SHADOWS = {};
const TREES = {};
for (const k of TREE_KINDS) TREES[k] = [];
let treesBuilt = false;
function terrainInstanceGeometry(base, capacity) {
  const g = new THREE.BufferGeometry();
  for (const k in base.attributes) g.setAttribute(k, base.attributes[k]);
  if (base.index) g.setIndex(base.index);
  g.setAttribute('baseHeight', new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage));
  g.boundingSphere = base.boundingSphere;
  return g;
}
function treesBuild() {
  treesBuilt = true;
  for (const k of TREE_KINDS) { const high = [], low = [];
    for (let v = 0; v < TREE_NV * 5; v++) {
      const band = Math.floor(v / TREE_NV), vi = v % TREE_NV;
      const g = band < 3 ? (high[vi] || (high[vi] = treeModel(k, vi, false))) : (low[vi] || (low[vi] = treeModel(k, vi, true)));
      const mat = [treeMat, treeMatSolid, treeLodHigh, treeLodLow, treeMatSolid][band];
      const m = new THREE.InstancedMesh(terrainInstanceGeometry(g, TREE_CAP), mat, TREE_CAP), e = new THREE.InstancedMesh(g, treeEdge, TREE_CAP);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = e.count = 0; m.frustumCulled = e.frustumCulled = false; e.instanceMatrix = m.instanceMatrix; scene.add(castsShadow(m)); scene.add(e);
      TREES[k].push({ m, e, band, list: [] });
    }
    TREE_SHADOWS[k] = low.map(g => { const m = new THREE.InstancedMesh(g, SUN.mat, TREE_CAP); m.layers.set(1); m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); return { m, n: 0, casters: [], selected: [] }; });
  }
}
const _tm = new M4(), _tq = new THREE.Quaternion(), _tq2 = new THREE.Quaternion(), _te = new THREE.Euler(), _tp = new V3(), _ts = new V3(), _tax = new V3();
function treeMatrix(o, tilt, ta) {
  const k = TREE_K * o.s, yaw = (o.seed * 7919 % 1) * 6.283;
  _tq.setFromEuler(_te.set(0, yaw, 0));
  if (tilt) { _tq2.setFromAxisAngle(_tax.set(-Math.sin(ta), 0, Math.cos(ta)), tilt); _tq.premultiply(_tq2); }
  return _tm.compose(_tp.set(o.x, 0, o.y), _tq, _ts.set(k, k, k));
}
function treesBegin() { if (!treesBuilt) treesBuild(); for (const k of TREE_KINDS) for (const B of TREES[k]) B.list.length = 0; }
function treeAdd(o, kind, d) {   // near enough to stand solid? then it's ours, not a picture
  if (d > TREE_R3D) return false;
  const near = isoP() ? TREE_LOD : TREE_NEAR, vi = (o.seed * 997 | 0) % TREE_NV;
  const add = band => { const B = TREES[kind][vi + band * TREE_NV]; if (B.list.length < TREE_CAP) B.list.push(o); };
  const margin = VIS.worldStep + 10;
  if (d < TREE_LOD - margin) add(d > near ? 1 : 0);
  else if (d <= TREE_LOD_END + margin) { add(2); add(3); }
  else add(4);
  return true;
}
function treeUpload(B, count) {
  if (!count) return;
  const a = B.m.instanceMatrix; a.needsUpdate = true;
  if (a.clearUpdateRanges) { a.clearUpdateRanges(); if (count) a.addUpdateRange(0, count * 16); }
  else { a.updateRange.offset = 0; a.updateRange.count = count * 16; }
  const h = B.m.geometry.attributes.baseHeight;
  if (h) { h.needsUpdate = true; if (h.clearUpdateRanges) { h.clearUpdateRanges(); h.addUpdateRange(0, count); } else { h.updateRange.offset = 0; h.updateRange.count = count; } }
}
// Keep full model data on the CPU, uploading only instances in view or needed by nearby shadows.
const INSTANCE_VIEW = new THREE.Frustum(), INSTANCE_M = new M4(), INSTANCE_SPHERE = new THREE.Sphere();
let instanceCulling = true;
function instanceView() { cam.updateMatrixWorld(); INSTANCE_M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); INSTANCE_VIEW.setFromProjectionMatrix(INSTANCE_M); }
function instanceSource(B) {
  if (!B.source) { B.source = new Float32Array(B.m.instanceMatrix.array.length); B.heights = new Float32Array(B.m.instanceMatrix.count); B.selected = []; }
}
function instanceCompact(B) {
  instanceSource(B);
  const g = B.m.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere.center, radius = g.boundingSphere.radius, a = B.source, selected = [];
  for (let i = 0; i < B.n; i++) {
    const j = i * 16;
    INSTANCE_SPHERE.center.set(a[j]*c.x+a[j+4]*c.y+a[j+8]*c.z+a[j+12], a[j+1]*c.x+a[j+5]*c.y+a[j+9]*c.z+a[j+13]+B.heights[i], a[j+2]*c.x+a[j+6]*c.y+a[j+10]*c.z+a[j+14]);
    INSTANCE_SPHERE.radius = radius * Math.max(Math.hypot(a[j],a[j+1],a[j+2]),Math.hypot(a[j+4],a[j+5],a[j+6]),Math.hypot(a[j+8],a[j+9],a[j+10])) + 24;
    if (!instanceCulling || S.p.x >= CAVE_X0 || i < (B.keepShadow || 0) || INSTANCE_VIEW.intersectsSphere(INSTANCE_SPHERE)) selected.push(i);
  }
  const changed = B.dirty || selected.length !== B.selected.length || selected.some((v,i)=>v!==B.selected[i]);
  if (changed) {
    const out=B.m.instanceMatrix.array,h=g.attributes.baseHeight;
    for(let j=0;j<selected.length;j++){const i=selected[j];out.set(a.subarray(i*16,i*16+16),j*16);h.setX(j,B.heights[i]);}
    treeUpload(B,selected.length); B.selected=selected; B.dirty=false;
  }
  B.m.count=selected.length;if(B.e)B.e.count=selected.length;
}
function treesEnd() {
  const px=S.p.x,py=S.p.y,SR=shadowReach()**2,unique=new Set();
  for(const k of TREE_KINDS)for(const B of TREE_SHADOWS[k]){B.n=0;B.casters.length=0;}
  for (const k of TREE_KINDS) for (const B of TREES[k]) {
    instanceSource(B);
    const d2=o=>(o.x-px)**2+(o.y-py)**2;
    B.list.sort((a,b)=>d2(a)-d2(b)); B.shN=0;
    for(let i=0;i<B.list.length;i++){
      const o=B.list[i],d=d2(o);treeMatrix(o,0).toArray(B.source,i*16);B.heights[i]=terrH(o.x,o.y);
      if(B.band<2&&d<=400**2)B.shN=i+1;
      if(d>400**2&&d<SR&&!unique.has(o)){
        unique.add(o);const vi=(o.seed*997|0)%TREE_NV,Q=TREE_SHADOWS[k][vi];if(Q.n<TREE_CAP){
          const matrix=treeMatrix(o,0).clone();
          if(!Q.m.geometry.boundingSphere)Q.m.geometry.computeBoundingSphere();
          const sphere=Q.m.geometry.boundingSphere.clone().applyMatrix4(matrix);
          sphere.center.y+=B.heights[i];sphere.radius+=24;
          Q.casters.push({matrix,sphere});Q.n++;
        }
      }
    }
    B.n=B.list.length;B.keepShadow=B.shN;B.dirty=true;instanceCompact(B);
  }
  for(const k of TREE_KINDS)for(const B of TREE_SHADOWS[k]){B.selected=[];B.m.count=0;}
}
// A shadow caster can be behind the player or far beyond the visible ground it shades.
// Cull its entire volume against the light, never its root against the player radius.
function treeShadowFrame() {
  if(!treesBuilt)return;
  for(const k of TREE_KINDS)for(const B of TREE_SHADOWS[k]){
    const selected=[];
    for(let i=0;i<B.casters.length;i++)if(SUN.frustum.intersectsSphere(B.casters[i].sphere))selected.push(i);
    if(selected.length!==B.selected.length||selected.some((v,i)=>v!==B.selected[i])){
      for(let i=0;i<selected.length;i++)B.m.setMatrixAt(i,B.casters[selected[i]].matrix);
      treeUpload(B,selected.length);B.selected=selected;
    }
    B.m.count=selected.length;
  }
}
// each frame: a tree you're chopping shudders with each blow
function treesFrame() {
  instanceView();
  if (!treesBuilt) return;
  for (const k of TREE_KINDS) for (const B of TREES[k]) {
    let dirty = false;
    B.list.forEach((o, i) => {
      const t = S.t - (o.shakeT ?? -99); if (t > 0.7 && !o.fpShook) return;
      o.fpShook = t <= 0.7;
      const a = Math.atan2(o.y - S.p.y, o.x - S.p.x), tilt = t <= 0.7 ? Math.sin(t * 34) * Math.exp(-t * 6) * 0.05 : 0;
      treeMatrix(o, tilt, a).toArray(B.source, i * 16); dirty = true;
    });
    B.n = B.list.length;
    if (dirty) B.dirty = true;
  }
  // the tree you just felled topples away from you, solid, the same tree it was
  for (const g of S.day.logs) if (g.kind === 'poof') {
    const kind = kindOfTree(g), B = TREES[kind][(g.seed * 997 | 0) % TREE_NV]; if (B.n >= TREE_CAP) continue;
    const u = Math.min(1, g.t / (g.T || POOF_T)), a = g.fa ?? (g.fa = Math.atan2(g.y - S.p.y, g.x - S.p.x));
    B.heights[B.n] = terrH(g.x, g.y); treeMatrix(g, u * u * 1.5, a).toArray(B.source, B.n++ * 16); B.dirty = true;
  }
  for (const k of TREE_KINDS) for (const B of TREES[k]) instanceCompact(B);
}
