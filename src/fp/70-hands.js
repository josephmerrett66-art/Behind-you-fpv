// ================= your hands: what you hold in your right, your torch in your left =================
// Whatever is in the hotbar slot you've picked is what you hold: an axe, a pick, a spear, a bow, a sling, a club, a hand torch,
// a hammer; anything else you hold up as itself. It moves with what the main game says you are doing: a swing, a chop,
// a jab, a draw, eating, drinking, picking something up.
const vmLight = { value: new V3(1, 0.95, 0.88) };
function vmMat(h, em = 0) {
  const c = new THREE.Color(h);
  return new THREE.ShaderMaterial({
    uniforms: { col: { value: new V3(c.r, c.g, c.b) }, em: { value: em }, vmL: vmLight, colourK: LU.colourK },
    vertexShader: `varying vec3 vN; void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 col, vmL; uniform float em, colourK; varying vec3 vN;
      void main() { float l = 0.5 + 0.55 * max(dot(normalize(vN), normalize(vec3(0.25, 0.55, 0.8))), 0.0); vec3 c = col * mix(l * vmL, vec3(1.0), em); float g = dot(c, vec3(0.3, 0.55, 0.15)); gl_FragColor = vec4(mix(vec3(g), c, colourK), 1.0); }`,
  });
}
const MATS = new Map(); const mat = (h, em = 0) => { const k = h + em; if (!MATS.has(k)) MATS.set(k, vmMat(h, em)); return MATS.get(k); };
const vmEdge = new THREE.ShaderMaterial({
  side: THREE.BackSide, uniforms: { vmL: vmLight },
  vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * 0.16, 1.0); }`,
  fragmentShader: `uniform vec3 vmL; void main() { gl_FragColor = vec4(vec3(0.15, 0.15, 0.14) * vmL, 1.0); }`,
});
function vmPart(parent, geo, m, x, y, z, rx = 0, ry = 0, rz = 0, edge = true) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); parent.add(o);
  if (edge) o.add(new THREE.Mesh(geo, vmEdge));
  return o;
}
const SLEEVE = '#d0a07a', GLOVE = '#daa880', SKIN = '#c8a07a';   // bare forearms and hands: the sleeves are rolled up (Joe's character sheet)
const cyl = (r0, r1, h, n = 8) => new THREE.CylinderGeometry(r0, r1, h, n);
const _sa = new V3(), _sb = new V3(), _sUp = new V3(0, 1, 0);
function vmString(G, c, at) {   // lay each half of the bowstring from its tip to the nock, drawn back by c (or to the point at)
  const nock = at ? at.clone() : new V3(0, 0, -3.4 + 9 * c);
  for (const [n, y] of [['strA', 10.6], ['strB', -10.6]]) {
    const o = G.getObjectByName(n); if (!o) continue;
    _sa.set(0, y, -3.4); _sb.subVectors(nock, _sa); const L = _sb.length();
    o.position.copy(_sa).addScaledVector(_sb, 0.5); o.quaternion.setFromUnitVectors(_sUp, _sb.normalize()); o.scale.set(1, L, 1);
  }
}
const capsule = (r, h) => new THREE.CapsuleGeometry(r, h, 3, 8);

// ---------------- real hands: a forearm, a palm, three-jointed fingers and a thumb ----------------
// Built round the grip: whatever it holds runs along the hand's +y through the origin, the palm faces -x, the back of the hand
// +x, and the wrist and forearm run back along +z to a rolled shirt cuff. Every finger is a chain of joints, so the same hand
// closes into a fist round a handle, rests half open, or cups something small. mirror makes it a left hand.
const HSKIN = '#e2b28c', HSKIN_D = '#d29e7a', HNAIL = '#efd2bc', HCUFF = '#e6dcc4';
const vmEdgeThin = new THREE.ShaderMaterial({
  side: THREE.BackSide, uniforms: { vmL: vmLight },
  vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * 0.07, 1.0); }`,
  fragmentShader: `uniform vec3 vmL; void main() { gl_FragColor = vec4(vec3(0.15, 0.15, 0.14) * vmL, 1.0); }`,
});
const segGeo = (r0, r1, len) => {   // a finger bone: rounded both ends, a little thinner toward the tip, running out along -z
  const g = new THREE.CapsuleGeometry((r0 + r1) / 2, len, 4, 8), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = clamp(p.getY(i) / len + 0.5, 0, 1), f = lerp(r0, r1, k) / ((r0 + r1) / 2); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
  g.rotateX(-Math.PI / 2); g.translate(0, 0, -len / 2); g.computeVertexNormals(); return g;
};
function vmFlesh(parent, geo, m, thin = true) { const o = new THREE.Mesh(geo, m); parent.add(o); o.add(new THREE.Mesh(geo, thin ? vmEdgeThin : vmEdge)); return o; }
// [y of the knuckle, length, thickness] index to little finger
const FINGERS = [[0.98, 2.45, 0.34], [0.33, 2.7, 0.355], [-0.3, 2.55, 0.34], [-0.9, 2.05, 0.3]];
function makeHand(mirror) {
  const H = new THREE.Group(), root = new THREE.Group(); H.add(root); if (mirror) root.scale.x = -1;
  const skin = mat(HSKIN), dark = mat(HSKIN_D), nail = mat(HNAIL);
  // the palm and the back of the hand: a flattened rounded block, wider across the knuckles than at the wrist
  const pg = new THREE.SphereGeometry(1, 14, 10), pp = pg.attributes.position;
  for (let i = 0; i < pp.count; i++) { const z = pp.getZ(i); pp.setY(i, pp.getY(i) * (1.42 - 0.2 * Math.max(0, z))); }
  pg.scale(0.62, 1, 1.5); pg.computeVertexNormals();
  const palm = vmFlesh(root, pg, skin); palm.position.set(1.2, 0.02, 1.05);
  // the heel of the thumb, a soft pad on the palm's inner edge
  const pad = vmFlesh(root, new THREE.SphereGeometry(0.62, 10, 8).scale(0.8, 1, 1.25), skin); pad.position.set(0.75, 0.78, 1.55);
  // the wrist and forearm, thick toward the elbow, flatter than round, and the shirt's sleeve rolled up just short of the elbow
  // (it angles down and away, so from your eyes it drops out of the bottom of the view instead of coming at you)
  const fore = new THREE.Group(); fore.position.set(1.0, -0.1, 2.2); fore.rotation.x = 0.62; root.add(fore);
  const fa = new THREE.CylinderGeometry(1.15, 0.86, 8, 12, 4); fa.rotateX(Math.PI / 2); fa.translate(0, 0, 4); fa.scale(0.8, 1, 1);
  vmFlesh(fore, fa, skin, false);
  vmFlesh(fore, new THREE.TorusGeometry(1.25, 0.44, 7, 14).scale(0.84, 1, 1), mat(HCUFF), false).position.z = 8.2;
  vmFlesh(fore, new THREE.CylinderGeometry(1.4, 1.34, 3, 12).rotateX(Math.PI / 2).scale(0.84, 1, 1), mat(HCUFF), false).position.z = 9.9;
  // fingers: three bones each, the knuckles in an arc across the top of the palm
  const fingers = FINGERS.map(([y, L, r], i) => {
    const j0 = new THREE.Group(); j0.position.set(1.12, y, -0.25 + Math.abs(i - 1.3) * 0.12); root.add(j0);
    vmFlesh(j0, new THREE.SphereGeometry(r * 1.08, 8, 6), dark);   // the knuckle
    const lens = [L * 0.5, L * 0.3, L * 0.24], js = [j0];
    let par = j0;
    lens.forEach((l, k) => {
      const rr = r * [1, 0.92, 0.84][k];
      vmFlesh(par, segGeo(rr, rr * 0.92, l), skin);
      const nx = new THREE.Group(); nx.position.z = -l; par.add(nx);
      if (k < 2) js.push(nx); else { const n = vmFlesh(nx, new THREE.SphereGeometry(rr * 0.78, 8, 6).scale(0.55, 0.85, 1.05), nail); n.position.set(rr * 0.55, 0, rr * 0.25); }
      par = nx;
    });
    return { js, spread: (1.3 - i) * 0.08 };
  });
  // the thumb: from the heel of the palm, out and over the front of whatever is held
  const t0 = new THREE.Group(); t0.position.set(0.85, 1.0, 1.25); root.add(t0);
  vmFlesh(t0, segGeo(0.46, 0.4, 1.25), skin);
  const t1 = new THREE.Group(); t1.position.z = -1.25; t0.add(t1); vmFlesh(t1, new THREE.SphereGeometry(0.4, 8, 6), dark); vmFlesh(t1, segGeo(0.4, 0.37, 0.95), skin);
  const t2 = new THREE.Group(); t2.position.z = -0.95; t1.add(t2); vmFlesh(t2, segGeo(0.37, 0.32, 0.8), skin);
  const tn = new THREE.Group(); tn.position.z = -0.8; t2.add(tn); vmFlesh(tn, new THREE.SphereGeometry(0.27, 8, 6).scale(0.85, 0.55, 1.05), nail).position.set(0, 0.2, 0.3);
  H.userData = { fingers, thumb: [t0, t1, t2], root };
  bakeHand(H);
  return H;
}
// The hand above is some sixty little meshes, each with its outline: sixty draws a frame per hand, which a phone feels. So it is
// baked into one mesh (and one outline): every vertex carries its colour and which joint it rides on, and the shader moves it
// with that joint. The joints are still the groups above, posed the same way; the little meshes just aren't drawn any more.
function bakeHand(H) {
  const root = H.userData.root, parts = [], groups = [root];
  root.traverse(o => { if (o.isMesh && o.material !== vmEdge && o.material !== vmEdgeThin) parts.push(o); });
  let nV = 0, nI = 0; for (const o of parts) { const g = o.geometry; nV += g.attributes.position.count; nI += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), col = new Float32Array(nV * 3), gi = new Float32Array(nV), ew = new Float32Array(nV), idx = new Uint32Array(nI);
  const v = new V3(), nm = new THREE.Matrix3(); let bv = 0, bi = 0;
  for (const o of parts) {
    o.updateMatrix(); nm.getNormalMatrix(o.matrix);
    let k = groups.indexOf(o.parent); if (k < 0) k = groups.push(o.parent) - 1;
    const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, c = o.material.uniforms.col.value, e = o.children[0], w = e && e.material === vmEdge ? 0.16 : 0.07;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(o.matrix); pos.set([v.x, v.y, v.z], (bv + i) * 3);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (bv + i) * 3);
      col.set([c.x, c.y, c.z], (bv + i) * 3); gi[bv + i] = k; ew[bv + i] = w;
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[bi++] = bv + g.index.getX(i); else for (let i = 0; i < P.count; i++) idx[bi++] = bv + i;
    bv += P.count; o.visible = false;
  }
  const G = new THREE.BufferGeometry();
  G.setAttribute('position', new THREE.BufferAttribute(pos, 3)); G.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  G.setAttribute('cl', new THREE.BufferAttribute(col, 3)); G.setAttribute('gi', new THREE.BufferAttribute(gi, 1)); G.setAttribute('ew', new THREE.BufferAttribute(ew, 1));
  G.setIndex(new THREE.BufferAttribute(idx, 1));
  const M = groups.map(() => new M4()), inv = new M4(), NG = groups.length;
  const head = `attribute float gi, ew; uniform mat4 J[${NG}];`;
  const skin = new THREE.ShaderMaterial({
    uniforms: { J: { value: M }, vmL: vmLight, colourK: LU.colourK },
    vertexShader: `${head} attribute vec3 cl; varying vec3 vN, vC; void main() { mat4 m = J[int(gi + 0.5)]; vN = normalize(normalMatrix * (mat3(m) * normal)); vC = cl; gl_Position = projectionMatrix * modelViewMatrix * (m * vec4(position, 1.0)); }`,
    fragmentShader: `uniform vec3 vmL; uniform float colourK; varying vec3 vN, vC;
      void main() { float l = 0.5 + 0.55 * max(dot(normalize(vN), normalize(vec3(0.25, 0.55, 0.8))), 0.0); vec3 c = vC * l * vmL; float g = dot(c, vec3(0.3, 0.55, 0.15)); gl_FragColor = vec4(mix(vec3(g), c, colourK), 1.0); }`,
  });
  const line = new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { J: { value: M }, vmL: vmLight },
    vertexShader: `${head} void main() { mat4 m = J[int(gi + 0.5)]; gl_Position = projectionMatrix * modelViewMatrix * (m * vec4(position + normal * ew, 1.0)); }`,
    fragmentShader: `uniform vec3 vmL; void main() { gl_FragColor = vec4(vec3(0.15, 0.15, 0.14) * vmL, 1.0); }`,
  });
  const sync = () => { inv.copy(root.matrixWorld).invert(); for (let i = 0; i < NG; i++) M[i].multiplyMatrices(inv, groups[i].matrixWorld); };   // each joint, as the hand is posed this frame
  const body = new THREE.Mesh(G, skin), edge = new THREE.Mesh(G, line);
  body.frustumCulled = edge.frustumCulled = false; body.onBeforeRender = edge.onBeforeRender = sync;
  root.add(body); root.add(edge);
}
// how closed the hand is: 0 open and relaxed, 1 a tight fist round a handle; cup is a little open for holding something small
const THUMB_OPEN = [0.55, 0.3], THUMB_GRIP = [1.05, -0.12];   // [turn in across the palm, lift]
function poseHand(H, k, cup = 0) {
  const { fingers, thumb } = H.userData;
  fingers.forEach((f, i) => {
    const c = k * (1 + 0.06 * i) - cup * 0.35;
    f.js[0].rotation.set(0, lerp(0.12, 0.98, c), f.spread * (1 - k));
    f.js[1].rotation.set(0, lerp(0.22, 1.5, c), 0);
    f.js[2].rotation.set(0, lerp(0.12, 1.05, c), 0);
  });
  thumb[0].rotation.set(lerp(THUMB_OPEN[1], THUMB_GRIP[1], k), lerp(THUMB_OPEN[0], THUMB_GRIP[0], k), 0, 'YXZ');
  thumb[1].rotation.set(-0.08 * k, 0.15 + 0.45 * k, 0);
  thumb[2].rotation.set(-0.1 * k, 0.15 + 0.4 * k, 0);
}

// ---------------- the left hand: the torch that comes on at dusk ----------------
const torchG = new THREE.Group(); vmScene.add(torchG);
{
  const body = cyl(0.82, 0.74, 9, 10); body.rotateX(Math.PI / 2);
  const head = cyl(1.75, 0.9, 2.6, 12); head.rotateX(Math.PI / 2);
  vmPart(torchG, body, mat('#66655e'), 0, 0, 0);
  vmPart(torchG, head, mat('#5a5850'), 0, 0, -5.4);
  vmPart(torchG, new THREE.CircleGeometry(1.45, 16), mat('#fff1d8', 1), 0, 0, -6.72, 0, 0, 0, false);
}
// the left hand round the torch's barrel: the barrel runs through the fist front to back, the forearm comes up from below you
const torchHand = makeHand(true); torchG.add(torchHand); poseHand(torchHand, 0.92);
torchHand.position.set(0, 0, 1.2); torchHand.rotation.set(1.2, 0, -0.35, 'XYZ'); torchHand.scale.setScalar(1.08);
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,215,1)'); gr.addColorStop(0.25, 'rgba(255,215,160,0.5)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
// a tongue of flame: a teardrop, soft at the edges and hot in the middle, its tip ragged
const flameTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'), im = g.createImageData(64, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 64; x++) {
    const v = 1 - y / 127, u = (x - 31.5) / 31.5, half = Math.pow(Math.sin(Math.min(1, v * 1.25) * Math.PI * 0.5), 0.6) * (1 - Math.pow(v, 2.2)) * (0.95 + 0.05 * Math.sin(v * 30));   // narrows to the tip
    const d = half > 0 ? Math.abs(u) / half : 9, a = Math.max(0, 1 - d * d) * Math.min(1, v * 6) * (1 - Math.pow(Math.max(0, v - 0.55) / 0.45, 1.5) * 0.7);
    const i = (y * 64 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a * 1.15));
  }
  g.putImageData(im, 0, 0); return new THREE.CanvasTexture(c); })();
const lensGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
lensGlow.scale.set(7, 7, 1); lensGlow.position.set(0, 0, -7.2); torchG.add(lensGlow);

// ---------------- the right hand and what's in it ----------------
// The hand's grip sits at the group's origin; the item runs up its +y.
const handG = new THREE.Group(); vmScene.add(handG);
const fist = makeHand(false); handG.add(fist); poseHand(fist, 1); let fistK = 1;
const ITEM = new Map();
const vmIconMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: iconTex }, vmL: vmLight, colourK: LU.colourK }, side: THREE.DoubleSide,
  vertexShader: `attribute float sd; varying vec2 vUv; varying vec3 vN; varying float vS; void main() { vUv = uv; vS = sd; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D map; uniform vec3 vmL; uniform float colourK; varying vec2 vUv; varying vec3 vN; varying float vS;
    void main() { vec4 t = texture2D(map, vUv); if (t.a < 0.5) discard; vec3 n = gl_FrontFacing ? vN : -vN; float l = 0.62 + 0.45 * max(dot(normalize(n), normalize(vec3(0.25, 0.55, 0.8))), 0.0);
      vec3 c = t.rgb * vS * l * vmL; float g = dot(c, vec3(0.3, 0.55, 0.15)); gl_FragColor = vec4(mix(vec3(g), c, colourK), 1.0); }`,
});
function iconPlane(id) {   // anything without a shape of its own: its picture from the pack as a thick cut-out, held up
  const xg = extrudeIcon(id);
  if (xg) { const o = new THREE.Mesh(xg, vmIconMat); o.scale.setScalar(0.4); o.position.set(-0.3, 1.5, -0.8); o.rotation.set(0, -0.5, 0); return o; }
  const r = ISHEET.meta[id] && ISHEET.meta[id][0]; const g = new THREE.PlaneGeometry(6.5, 6.5);
  const uv = g.attributes.uv; if (r) for (let i = 0; i < uv.count; i++) uv.setXY(i, (r[0] + uv.getX(i) * r[2]) / ISHEET.W, (r[1] + (1 - uv.getY(i)) * r[3]) / ISHEET.H);
  const m = new THREE.MeshBasicMaterial({ map: iconTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  const o = new THREE.Mesh(g, m); o.position.set(0, 3.6, -0.8); return o;
}
function itemModel(id) {
  if (ITEM.has(id)) return ITEM.get(id);
  const T = DIT[id], G = new THREE.Group(), hc = T.hc || T.c || '#9a9893', wood = '#7a5a3a';
  const shaft = (len, r = 0.55, col = wood, y0 = -2) => { const g = cyl(r, r * 1.08, len, 7); g.translate(0, y0 + len / 2, 0); vmPart(G, g, mat(col), 0, 0, 0); };
  const tool = T.tool, w = T.wpn, thr = T.thr;
  if (tool === 'axe' || w === 'waxe' || thr === 'taxe') {
    const big = w === 'waxe' ? 1.25 : thr === 'taxe' ? 0.8 : 1; shaft(15 * big);
    const hd = new THREE.BoxGeometry(0.9, 3.4 * big, 5 * big); const p = hd.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z < 0) p.setY(i, p.getY(i) * 1.6); } hd.computeVertexNormals();
    vmPart(G, hd, mat(hc), 0, 11.5 * big, -2.2 * big);
  } else if (tool === 'pick') {
    shaft(15);
    const hd = new THREE.TorusGeometry(6, 0.75, 6, 12, Math.PI * 0.8); hd.rotateZ(Math.PI * 0.1); hd.rotateY(Math.PI / 2);
    vmPart(G, hd, mat(hc), 0, 7.4, 0);
  } else if (tool === 'build') {
    shaft(12, 0.5);
    vmPart(G, new THREE.BoxGeometry(1.6, 1.8, 5), mat('#5c6066'), 0, 10.4, -0.6);
  } else if (w === 'spear' || thr === 'jav') {
    shaft(34, 0.5, T.c === '#a08a62' ? '#a08a62' : '#8a6a44', -10);
    const hd = new THREE.ConeGeometry(1.1, 5, 6); vmPart(G, hd, mat(hc), 0, 26.5, 0);
  } else if (w === 'knife' || w === 'sword') {
    const L = w === 'sword' ? 15 : 7.5;
    const bl = new THREE.BoxGeometry(0.3, L, 1.9, 1, 4, 1); bl.translate(0, L / 2 + 2.4, 0);
    const p = bl.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = clamp((y - 2.4) / L, 0, 1); p.setZ(i, p.getZ(i) * (1 - 0.65 * k * k)); } bl.computeVertexNormals();
    vmPart(G, bl, mat(hc), 0, 0, 0);
    vmPart(G, new THREE.BoxGeometry(0.8, 0.6, w === 'sword' ? 4.4 : 2.4), mat('#4a4a44'), 0, 2.2, 0);
    vmPart(G, cyl(0.6, 0.7, 4, 7), mat('#3b2d22'), 0, -0.2, 0);
  } else if (w === 'club' || w === 'bone') {
    shaft(10, 0.7, T.bc || '#6e5235');
    vmPart(G, new THREE.SphereGeometry(2.4, 9, 7).scale(1, 1.6, 1), mat(id === 'maul' ? '#8d8b85' : T.bc || '#6e5235'), 0, 10, 0);
    if (T.spikes) for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; vmPart(G, new THREE.ConeGeometry(0.45, 1.8, 5), mat(T.spikes), Math.cos(a) * 2.3, 10 + (i % 2) * 1.6, Math.sin(a) * 2.3, Math.sin(a) * 1.4, 0, -Math.cos(a) * 1.4, false); }
  } else if (tool === 'bow') {
    const bw = T.bw || '#9a7040', BR = 13.74, BA = 1.9, arc = new THREE.TorusGeometry(BR, 0.55, 6, 18, BA); arc.rotateZ(Math.PI - BA / 2); arc.translate(5.34, 0, 0); arc.rotateY(-Math.PI / 2);   // limbs bellied forward, tips at the string's ends
    const bo = vmPart(G, arc, mat(bw), 0, 0, 0); bo.name = 'bow';
    // the string: two thin cords from the bow's tips to the nock (a THREE.Line drew as a long stray line across the view)
    for (const n of ['strA', 'strB']) { const o = vmPart(G, cyl(0.14, 0.14, 1, 4), mat('#efe6d2', 0.3), 0, 0, 0, 0, 0, 0, false); o.name = n; }
    vmString(G, 0);
    const ar = new THREE.Group(); ar.name = 'arrow'; G.add(ar);
    const sh = cyl(0.22, 0.22, 20, 5); sh.rotateX(Math.PI / 2); vmPart(ar, sh, mat('#a08a62'), 0, 0, -8, 0, 0, 0, false);
    vmPart(ar, new THREE.ConeGeometry(0.6, 2.2, 5).rotateX(-Math.PI / 2), mat('#4d5560'), 0, 0, -19, 0, 0, 0, false);
  } else if (tool === 'sling') {
    const g = new THREE.TorusGeometry(2.6, 0.3, 5, 10); vmPart(G, g, mat(T.c), 0, -3, 0, Math.PI / 2, 0, 0, false);
    const pouch = vmPart(G, new THREE.SphereGeometry(1.4, 8, 6).scale(1, 0.7, 1), mat(T.c), 0, -7, 0); pouch.name = 'pouch';
    vmPart(pouch, new THREE.SphereGeometry(0.9, 7, 5), mat('#9a9893'), 0, 0.6, 0, 0, 0, 0, false);
  } else if (tool === 'rod') {   // a cork grip and a wooden reel, then the rod in three lengths that bend under a fish (71-fish)
    vmPart(G, cyl(0.62, 0.7, 7, 8).translate(0, -1, 0), mat('#b89668'), 0, 0, 0);
    const reel = new THREE.Group(); reel.name = 'reel'; reel.position.set(0, 1.6, 1.1); reel.scale.setScalar(0.62); G.add(reel);
    vmPart(reel, cyl(1.5, 1.5, 0.9, 12).rotateZ(Math.PI / 2), mat('#6e5235'), 0, 0, 0);
    vmPart(reel, cyl(1.0, 1.0, 1.0, 10).rotateZ(Math.PI / 2), mat('#d8d0bc', 0.1), 0, 0, 0, 0, 0, 0, false);
    const crank = new THREE.Group(); crank.name = 'crank'; crank.position.set(0.9, 0, 0); reel.add(crank);
    vmPart(crank, cyl(0.18, 0.18, 1.6, 5).translate(0, 0.8, 0), mat('#4a3c30'), 0, 0, 0, 0, 0, 0, false);
    vmPart(crank, cyl(0.32, 0.32, 0.8, 6).rotateZ(Math.PI / 2), mat('#2e2620'), 0.4, 1.6, 0, 0, 0, 0, false);
    let seg = G, y = 2.5; const L = [11, 10, 9], R = [0.42, 0.3, 0.18];
    ['rodA', 'rodB', 'rodC'].forEach((n, i) => {
      const g = new THREE.Group(); g.name = n; g.position.set(0, y, 0); seg.add(g);
      vmPart(g, cyl(R[i] * 0.8, R[i], L[i], 6).translate(0, L[i] / 2, 0), mat(i === 2 ? '#a0805a' : '#8a6a44'), 0, 0, 0);
      vmPart(g, new THREE.TorusGeometry(0.42 - i * 0.08, 0.08, 4, 8), mat('#cfc8b4', 0.1), 0, L[i] * 0.85, 0, 0, Math.PI / 2, 0, false);   // a line guide
      seg = g; y = L[i];
    });
    const tip = new THREE.Object3D(); tip.name = 'rodTip'; tip.position.set(0, L[2], 0); seg.add(tip);
  } else if (T.k === 'light') {
    shaft(11, 0.7, '#6b4a2e', -3);
    vmPart(G, cyl(1.3, 0.9, 2.6, 8), mat('#3a2a1a'), 0, 8.6, 0);
    for (let k = 0; k < 3; k++) vmPart(G, cyl(1.38, 1.2, 0.5, 8), mat(k % 2 ? '#5a4028' : '#4a3420'), 0, 7.7 + k * 0.85, 0, 0, k * 0.7, 0, false);   // rag bound round the head
    vmPart(G, cyl(1.1, 1.25, 0.6, 8), mat('#ff8a30', 1), 0, 9.8, 0, 0, 0, 0, false);   // the top, burning: an ember glow
    const fl = new THREE.Group(); fl.name = 'flame'; fl.position.set(0, 10.1, 0); G.add(fl);
    for (const [c, o] of [[0xff5a18, 0.75], [0xffa040, 0.85], [0xfff0c0, 0.95]]) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o })); sp.center.set(0.5, 0.08); fl.add(sp); }
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff8a40, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 })); gl.scale.set(26, 26, 1); gl.position.y = 3; fl.add(gl);
  } else if (thr === 'bomb' || thr === 'flash') {
    vmPart(G, new THREE.SphereGeometry(2.4, 10, 8), mat(T.c), 0, 2.6, 0);
    if (thr === 'bomb') vmPart(G, cyl(0.25, 0.25, 2.4, 5), mat('#c8b07a'), 0, 5.2, 0, 0, 0, 0, false);
  } else G.add(iconPlane(id));
  G.visible = false; handG.add(G); ITEM.set(id, G);
  return G;
}

// ---------------- moving them ----------------
// a few poses for the right hand: [x, y, z, rx, ry, rz] in view space
const POSE = {
  idle: [8.8, -7.6, -16, -0.95, 0.1, 0.45], spearIdle: [7.4, -6.7, -11, -1.45, 0.05, 0.12], bowIdle: [3.4, -5.4, -17, -0.05, -0.08, -0.25],
  icon: [8.2, -7.4, -15, -0.35, -0.25, 0.12], fist: [7.6, -7.4, -14.5, -0.4, 0.35, 0.55],
};
const easeOut = u => 1 - Math.pow(1 - u, 3), smooth = u => u * u * (3 - 2 * u);
function lerp6(a, b, k) { const o = []; for (let i = 0; i < 6; i++) o[i] = lerp(a[i], b[i], k); return o; }
function swingPose(base, u, side, kind) {   // a blow's arc: wind up, cut through, return
  const w = Math.min(1, u / 0.22), s = clamp((u - 0.22) / 0.3, 0, 1), r = clamp((u - 0.55) / 0.45, 0, 1);
  let k0, k1;
  if (kind === 'thrust') { k0 = [8, -6, -8, -1.5, 0.1, 0.1]; k1 = [4, -5, -30, -1.55, 0, 0.05]; }
  else if (kind === 'chop') { k0 = [6, 3, -19, 0.35, 0.05, -0.1]; k1 = [2, -12, -19, -2.1, 0.05, 0]; }
  else if (side > 0) { k0 = [12, -3, -17, -1.45, -0.8, -0.6]; k1 = [-9, -8.5, -18, -1.5, 1.1, 0.5]; }
  else { k0 = [-8, -4, -17, -1.45, 1.0, 0.8]; k1 = [11, -9, -17, -1.5, -1.0, -0.4]; }
  const a = lerp6(base, k0, smooth(w)), b = lerp6(k0, k1, easeOut(s));
  return s <= 0 ? a : r <= 0 ? b : lerp6(k1, base, smooth(r));
}
const TRAIL_N = 14, trailPos = new Float32Array(TRAIL_N * 2 * 3), trailA = new Float32Array(TRAIL_N * 2), trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
trailGeo.setAttribute('ta', new THREE.BufferAttribute(trailA, 1).setUsage(THREE.DynamicDrawUsage));
{ const idx = []; for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } trailGeo.setIndex(idx); }
const trail = new THREE.Mesh(trailGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  uniforms: { tcol: { value: new V3(1, 0.8, 0.55) } },
  vertexShader: `attribute float ta; varying float vA; void main() { vA = ta; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 tcol; varying float vA; void main() { gl_FragColor = vec4(mix(tcol, vec3(1.0, 0.98, 0.94), smoothstep(0.55, 1.0, vA)) * vA * 0.95, 1.0); }`,
}));
trail.frustumCulled = false; vmScene.add(trail);
const trailPts = [];
let shownId = null, torchK = 0;
function placeHands(dt, now, bob, lag) {
  const p = S.p, D = S.day, s = heldSlot(), id = s ? s.id : null, T = id ? DIT[id] : null;
  if (id !== shownId) { if (shownId && ITEM.has(shownId)) ITEM.get(shownId).visible = false; shownId = id; if (id) itemModel(id).visible = true; }
  fist.visible = true;
  { // how closed the right hand is: a fist round a handle, cupped under something small, relaxed and half open when empty,
    // and it opens as it reaches down to pick something up
    const icon0 = T && !T.tool && T.k !== 'light', reach = p.act && p.act.t < p.act.dur && p.act.pose === 7 ? Math.sin(Math.PI * p.act.t / p.act.dur) : 0;
    const want = (!T ? 0.32 : icon0 ? 0.62 : 1) * (1 - 0.8 * reach);
    fistK += (want - fistK) * Math.min(1, dt * 14); poseHand(fist, fistK, icon0 ? 0.35 : 0);
  }
  const G = id ? ITEM.get(id) : null;
  const spearish = T && (T.wpn === 'spear' || T.thr === 'jav'), bow = T && T.tool === 'bow', icon = T && !T.tool && T.k !== 'light';
  let base = !T ? POSE.fist : spearish ? POSE.spearIdle : bow ? POSE.bowIdle : icon ? POSE.icon : POSE.idle;
  let cur = base.slice(), cutting = false;
  const A = p.atk, act = p.act, wa = p.wact;
  if (A && A.t < A.dur) {
    const u = A.t / A.dur, kind = A.ov ? 'chop' : A.pose === 3 || spearish ? 'thrust' : A.i === 2 ? 'chop' : 'cut';
    cur = swingPose(base, u, A.side || 1, kind); cutting = u > 0.2 && u < 0.6;
  } else if (wa && wa.t < (wa.dur || 0.4)) {
    const u = wa.t / (wa.dur || 0.4); cur = swingPose(base, u, 1, spearish ? 'thrust' : 'chop'); cutting = u > 0.2 && u < 0.6;
  } else if (act && act.t < act.dur) {
    const u = act.t / act.dur, k = Math.sin(Math.PI * Math.min(1, u * 1.1));
    if (act.pose === 8 || act.pose === 9) cur = lerp6(base, [1.5, -5, -9, 0.6, 0.2, 0.1], k);                 // to your mouth
    else if (act.pose === 7) cur = lerp6(base, [4, -16, -18, -1.9, 0.2, 0.2], k);                            // down to pick it up
    else if (act.pose === 10) { const c = Math.abs(Math.sin(u * Math.PI * 3)); cur = lerp6(base, [5, -6 + 8 * c, -15, -0.4 - 1.4 * (1 - c), 0.05, 0], Math.min(1, u * 5)); }   // working at it
    else if (act.pose === 11) { const c = Math.sin(u * Math.PI * 4); cur = lerp6(base, [4.5 + 2.4 * c, -12.5 + 1.4 * Math.abs(c), -19 + 1.6 * Math.abs(c), -1.35 + 0.18 * c, 0.1 + 0.32 * c, 0.6], act.cont ? 1 : Math.min(1, u * 6)); }   // down at a body, the knife sawing (88-meat)
    else cur = lerp6(base, [6, -2, -20, -1.2, 0, 0.3], k);
  }
  if (bow && D.draw) { const c = clamp(D.draw.t / (RNG.bow ? RNG.bow.full : 0.8), 0, 1); cur = lerp6(base, [1.2, -4, -14, -0.02, -0.04, -0.06], Math.min(1, c * 3)); }
  if (G && bow) {   // the string comes back with the draw, the arrow on it
    const c = D.draw ? clamp(D.draw.t / (RNG.bow ? RNG.bow.full : 0.8), 0, 1) : 0, ar = G.getObjectByName('arrow');
    vmString(G, c);
    ar.visible = !!D.draw || dayAmmoN('bow') > 0; ar.position.z = 9 * c;
  }
  if (G && T.tool === 'sling') { const pu = G.getObjectByName('pouch'); if (D.draw) { const a = now * (8 + 10 * clamp(D.draw.t / 0.8, 0, 1)); pu.position.set(Math.cos(a) * 6, -4 + Math.sin(a) * 2, Math.sin(a) * 6); } else pu.position.set(0, -7, 0); }
  if (G && T.k === 'light') {   // the flame licks up off the head: three tongues, outer red to a pale core, each flickering on its own beat
    const fl = G.getObjectByName('flame'), lit = S.day && dayTorch() ? 1 : 0.15, v = Math.hypot(S.p.vx, S.p.vy) / RUN;
    fl.children.forEach((sp, i) => { if (i > 2) { sp.material.opacity = 0.3 * lit * (0.85 + 0.15 * Math.sin(now * 23)); return; }
      const w = [4.2, 3.2, 2.0][i], h = [6.8, 5.4, 3.4][i] * (1 + 0.16 * Math.sin(now * (13 + i * 4) + i) * Math.sin(now * (7 + i * 3))) * (1 - 0.25 * v) * lit;
      sp.scale.set(w * (1 + 0.08 * Math.sin(now * 19 + i * 2)), Math.max(0.01, h), 1); sp.position.x = 0.5 * Math.sin(now * (9 + i) + i) * (1 + v); sp.material.rotation = -0.12 * v + 0.06 * Math.sin(now * 5 + i); });
  }
  // eating and drinking: the left hand lifts the flask to your mouth
  const drink = S.rg.drink ? Math.sin(Math.PI * clamp(1 - S.rg.drink / FLASK_T, 0, 1)) : 0;
  // the blow lands: the hand jars back and shudders
  if (CFX.recoil > 0) { const r = CFX.recoil; cur = cur.slice(); cur[2] += 3 * r; cur[0] += (Math.random() - 0.5) * 1.6 * r; cur[1] += (Math.random() - 0.5) * 1.2 * r; cur[3] += 0.18 * r; }
  // put the right hand where the pose says, swaying against your turning and bobbing with your stride
  const [bx, by] = bob, [ly, lp] = lag;
  handG.position.set((cur[0] + bx - ly * 6) * vmX, cur[1] + by + lp * 5 - VIEW_FX.dip * 0.15 - drink * 6, cur[2]);
  handG.rotation.set(cur[3] + lp * 0.9, cur[4] + ly * 0.9, cur[5]);
  // the left: the torch, up by night, down by day
  torchK += ((S.torchLvl > 0.05 || S.torchOn ? 1 : 0) - torchK) * Math.min(1, dt * 5);
  torchG.visible = torchK > 0.02;
  torchG.position.set((-8.2 + bx - ly * 6) * vmX, -6.3 + by + lp * 5 - VIEW_FX.dip * 0.12 - (1 - torchK) * 14 + drink * 5, -16 + drink * 6);
  torchG.rotation.set(0.1 + lp * 0.9 + drink * 0.9, -0.2 + ly * 0.9, 0.1 + drink * 0.4);
  lensGlow.material.opacity = (0.7 + 0.1 * Math.sin(now * 9)) * S.torchLvl;
  // the smear behind the edge while it cuts
  handG.updateMatrixWorld();
  { const c = CFX.tint.split(','); trail.material.uniforms.tcol.value.set(c[0] / 255, c[1] / 255, c[2] / 255); }
  const reach = spearish ? 30 : T && (T.wpn === 'sword') ? 17 : 13;
  const tip = new V3(0, reach, 0).applyMatrix4(handG.matrixWorld), mid = new V3(0, reach * 0.55, 0).applyMatrix4(handG.matrixWorld);
  if (cutting && T) trailPts.unshift({ tip, mid, a: 1 }); else if (trailPts.length) trailPts.unshift({ tip, mid, a: 0 });
  if (trailPts.length > TRAIL_N) trailPts.length = TRAIL_N;
  for (let i = 0; i < TRAIL_N; i++) {
    const t = trailPts[Math.min(i, trailPts.length - 1)];
    if (!t) { trailA[i * 2] = trailA[i * 2 + 1] = 0; continue; }
    trailPos.set([t.tip.x, t.tip.y, t.tip.z], i * 6); trailPos.set([t.mid.x, t.mid.y, t.mid.z], i * 6 + 3);
    const fa = t.a * Math.pow(1 - i / TRAIL_N, 1.4); trailA[i * 2] = fa; trailA[i * 2 + 1] = fa * 0.3;
  }
  trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.ta.needsUpdate = true;
}
