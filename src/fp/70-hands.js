// ================= your hands: what you hold in your right, your torch in your left =================
// Whatever is in the hotbar slot you've picked is what you hold: an axe, a pick, a spear, a bow, a sling, a club, a hand torch,
// a hammer; anything else you hold up as itself. It moves with what the main game says you are doing: a swing, a chop,
// a jab, a draw, eating, drinking, picking something up. (What each thing looks like: 70-kit.)
const vmLight = { value: new V3(1, 0.95, 0.88) };
// a colour as it was picked: the renderer passes colours straight through (00-core), so a hex read the usual way (as sRGB,
// turned linear) came out darker and oranger than it was meant, the hands a sunburnt orange and every haft near black
const vmCol = h => typeof h === 'number' ? new THREE.Color().setHex(h, THREE.LinearSRGBColorSpace) : new THREE.Color().setStyle(h, THREE.LinearSRGBColorSpace);
function vmMat(h, em = 0) {
  const c = vmCol(h);
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
  const nock = at ? at.clone() : new V3(0, BOW_NOCK, -3.4 + 9 * c);
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
const HSKIN = '#e2b28c', HSKIN_D = '#d29e7a', HNAIL = '#efd2bc', HCUFF = '#d6cab0';
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
  // (slim at the wrist, filling out with the muscle toward the elbow)
  const fa = new THREE.LatheGeometry([[0.76, -0.3], [0.8, 0], [0.9, 1.4], [1.08, 3.4], [1.24, 5.4], [1.24, 6.8], [1.14, 8.4]].map(([r, z]) => new THREE.Vector2(r, z)), 14);
  fa.rotateX(Math.PI / 2); fa.scale(0.8, 1, 1);
  vmFlesh(fore, fa, skin, false);
  vmFlesh(fore, new THREE.TorusGeometry(1.2, 0.36, 7, 14).scale(0.84, 1, 1), mat(HCUFF), false).position.z = 8.3;
  vmFlesh(fore, new THREE.CylinderGeometry(1.3, 1.26, 3, 12).rotateX(Math.PI / 2).scale(0.84, 1, 1), mat(HCUFF), false).position.z = 9.9;
  // the wrist: a rounded joint for the forearm to turn on, so it bends there instead of folding through the hand
  vmFlesh(root, new THREE.SphereGeometry(0.9, 10, 8).scale(0.84, 1, 1), skin).position.set(1.0, -0.1, 2.2);
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
  H.userData = { fingers, thumb: [t0, t1, t2], root, fore, elbow: new V3(), arm: false };
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
  const sync = () => { aimFore(H); inv.copy(root.matrixWorld).invert(); for (let i = 0; i < NG; i++) M[i].multiplyMatrices(inv, groups[i].matrixWorld); };   // each joint, as the hand is posed this frame
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
// ---------------- moving them ----------------
// Joe: "the axe and stuff like that, especially how they're held and used, doesn't look very good... a lot more natural with
// their hand, wrist, and arm movement." Each hand used to be one stiff block turned to a few set angles, the forearm stuck
// out behind it like a log, and a swing was the whole block swept from one corner to another. Now:
//   - the arm is a real arm. Each hand hangs off a shoulder down below the view; the elbow finds its own place between the
//     two (bent out and down), and the forearm runs from the wrist to it, turning at the wrist as far as a wrist turns.
//   - the hand is aimed, not spun: where the grip is, which way what it holds points, and which way its edge or head faces.
//   - a blow has a wind-up, a strike and a follow-through, timed so the head lands as the blow does. The arm leads and the
//     head trails it, then the wrist snaps it through, and the edge leads the way it's travelling.
//   - picking a thing up brings it up into view; it breathes with you, rides lower and swings with your stride at a run.
//   - a bow is held in the left hand, upright, and the right hand draws its string (the torch goes on your belt).
const VM_UA = 9.5, VM_FA = 11.2;   // shoulder to elbow; elbow to the middle of the fist (a hand is about 3.3cm to a unit)
const FORE_N = new V3(0, -Math.sin(0.62), Math.cos(0.62)), FORE_MAX = 1.05, _fZ = new V3(0, 0, 1);
const _afw = new V3(), _fd = new V3(), _fm = new M4(), _fq = new THREE.Quaternion(), _fq1 = new THREE.Quaternion();
function aimFore(H) {   // as it's drawn: the forearm from the wrist toward the elbow, as far as a wrist will bend
  const { root, fore, elbow, arm } = H.userData;
  if (!arm) { fore.quaternion.setFromAxisAngle(_fv1.set(1, 0, 0), 0.62); fore.updateMatrixWorld(true); return; }
  _afw.setFromMatrixPosition(fore.matrixWorld);
  _fd.subVectors(elbow, _afw).transformDirection(_fm.copy(root.matrixWorld).invert());
  const a = FORE_N.angleTo(_fd);
  if (a > FORE_MAX) { _fq.setFromUnitVectors(FORE_N, _fd); _fq1.identity().slerp(_fq, FORE_MAX / a); _fd.copy(FORE_N).applyQuaternion(_fq1); }
  fore.quaternion.setFromUnitVectors(_fZ, _fd); fore.updateMatrixWorld(true);
}
const _fv1 = new V3(), _ikD = new V3(), _ikP = new V3();
function elbowAt(sh, T, pole, out) {   // two bones from the shoulder to T, the elbow bent out toward pole
  const D = _ikD.subVectors(T, sh), d = clamp(D.length(), 2, VM_UA + VM_FA - 0.05); D.normalize();
  const a = Math.acos(clamp((VM_UA * VM_UA + d * d - VM_FA * VM_FA) / (2 * VM_UA * d), -1, 1));
  _ikP.copy(pole).addScaledVector(D, -pole.dot(D)).normalize();
  return out.copy(sh).addScaledVector(D, VM_UA * Math.cos(a)).addScaledVector(_ikP, VM_UA * Math.sin(a));
}
const _hx = new V3(), _hy = new V3(), _hz = new V3(), _hm = new M4();
const _ha = new V3(), _hb = new V3();
function handFrame(U, F, q, arm) {   // the hand's turn: what it holds along U, its knuckles (and so an edge or a head) toward F
  _hy.copy(U).normalize(); _hz.copy(F).addScaledVector(_hy, -F.dot(_hy));
  if (_hz.lengthSq() < 1e-5) _hz.set(0, 0, -1).addScaledVector(_hy, _hy.z);
  _hz.normalize().negate();
  if (arm) {   // only as far round as the wrist allows from the way the forearm comes in (arm: toward the elbow)
    _ha.copy(arm).addScaledVector(_hy, -arm.dot(_hy));
    if (_ha.lengthSq() > 1e-4) {
      _ha.normalize(); const th = Math.atan2(_hb.crossVectors(_ha, _hz).dot(_hy), _ha.dot(_hz)), lim = 0.85;
      if (Math.abs(th) > lim) { const a = Math.sign(th) * lim; _hb.crossVectors(_hy, _ha); _hz.copy(_ha).multiplyScalar(Math.cos(a)).addScaledVector(_hb, Math.sin(a)); }
    }
  }
  _hx.crossVectors(_hy, _hz);
  return q.setFromRotationMatrix(_hm.makeBasis(_hx, _hy, _hz));
}
// a pose: where the grip is, which way the thing points (u), which way its edge, head or knuckles face (f)
const PZ = (p, u, f) => ({ p: new V3(...p), u: new V3(...u).normalize(), f: new V3(...f).normalize() });
const pzCopy = (o, a) => { o.p.copy(a.p); o.u.copy(a.u); o.f.copy(a.f); return o; };
function pzMix(o, a, b, k, ku = k) { o.p.lerpVectors(a.p, b.p, k); o.u.lerpVectors(a.u, b.u, ku).normalize(); o.f.lerpVectors(a.f, b.f, ku).normalize(); return o; }
// how each kind of thing rests in your hand
const HOLD = {
  fist: PZ([6.8, -6.7, -13], [-0.1, 0.95, -0.3], [-0.05, -0.75, -0.65]),
  tool: PZ([7.4, -6.4, -13.6], [-0.3, 0.86, -0.4], [-0.62, -0.1, -0.78]),
  heavy: PZ([7.8, -7.2, -14], [-0.36, 0.82, -0.44], [-0.62, -0.1, -0.78]),
  blade: PZ([6.8, -5.6, -13], [-0.3, 0.62, -0.72], [-0.1, -0.76, -0.6]),
  spear: PZ([7.4, -5.2, -11], [-0.24, 0.28, -0.93], [-0.55, 0.82, 0.05]),
  light: PZ([7.2, -6.2, -14], [-0.24, 0.92, -0.3], [-0.45, -0.1, -0.88]),
  small: PZ([6.6, -2.8, -12.5], [-0.12, 0.96, -0.24], [-0.4, -0.15, -0.9]),
  icon: PZ([7.0, -4.8, -13], [-0.12, 0.95, -0.3], [-0.3, -0.2, -0.93]),
  rod: PZ([7.8, -7.6, -12.5], [-0.3, 0.55, -0.78], [-0.15, 0.82, 0.55]),
  sling: PZ([7.0, -4.0, -13.5], [-0.05, 0.99, -0.1], [-0.3, 0, -0.95]),
};
const HEAVY = new Set(['waxe1', 'waxe2', 'waxe3', 'waxe4', 'maul', 'mace', 'bonec', 'nbell', 'nlant']);
function holdOf(T, id) {
  if (!T || T.tool === 'bow') return 'fist';
  if (T.tool === 'rod') return 'rod'; if (T.tool === 'sling') return 'sling';
  if (T.wpn === 'spear' || T.thr === 'jav') return 'spear';
  if (T.wpn === 'knife' || T.wpn === 'sword') return 'blade';
  if (HEAVY.has(id)) return 'heavy';
  if (T.tool === 'axe' || T.tool === 'pick' || T.tool === 'build' || T.wpn || T.thr === 'taxe') return 'tool';
  if (T.k === 'light') return 'light';
  if (T.thr === 'bomb' || T.thr === 'flash') return 'small';
  return 'icon';
}
// how far out along it the business end is: the head that lands on the mark
function headOf(T, id) {
  if (!T) return 0;
  if (T.tool === 'axe' || T.wpn === 'waxe' || T.thr === 'taxe') return 11.6 * (T.wpn === 'waxe' ? 1.22 : T.thr === 'taxe' ? 0.8 : 1);
  if (T.tool === 'pick') return 12.2; if (T.tool === 'build') return 10.9;
  if (T.wpn === 'sword') return 10; if (T.wpn === 'knife') return 5.5;
  if (id === 'maul') return 13.6; if (T.wpn === 'club' || T.wpn === 'bone') return 11.5;
  if (T.k === 'light') return 9;
  return 2;
}
// the blows: a wind-up, the strike (the head on the mark, hd, at the middle of the view), and the follow-through
const STRIKE = {
  fell: { w: PZ([8.5, -3.5, -12.5], [0.62, 0.74, 0.22], [0, 0, -1]), hd: [-0.5, -1.8, -22], hu: [-0.6, 0.42, -0.68], fo: PZ([2, -13, -15], [-0.65, -0.45, -0.6], [0, 0, -1]) },
  chop: { w: PZ([8, -1.5, -12.5], [0.25, 0.86, 0.42], [0, 0, -1]), hd: [0.5, -7, -24], hu: [-0.12, -0.3, -0.95], fo: PZ([3, -13.5, -14], [-0.1, -0.8, -0.6], [0, 0, -1]) },
  cut: { w: PZ([10, -4, -13], [0.65, 0.55, -0.35], [0, 0, -1]), hd: [-1, -2, -21], hu: [-0.75, 0.15, -0.65], fo: PZ([-3, -12.5, -15], [-0.8, -0.45, -0.4], [0, 0, -1]) },
  back: { w: PZ([-3, -4, -14], [-0.75, 0.45, -0.45], [0, 0, -1]), hd: [1, -2, -21], hu: [0.6, 0.15, -0.78], fo: PZ([10, -12, -14], [0.85, -0.35, -0.35], [0, 0, -1]) },
  punch: { w: PZ([8.5, -8.5, -12], [0.05, 0.95, 0.3], [0, 0, -1]), hd: [2, -6.8, -22], hu: [-0.85, 0.5, -0.15], fo: PZ([3, -7, -20.5], [-0.85, 0.5, -0.15], [0, 0, -1]) },
  throw: { w: PZ([11, 1.5, -6], [0.2, 0.5, 0.85], [0, 0, -1]), hd: [4, -3, -21], hu: [-0.1, 0.35, -0.93], fo: PZ([1, -10, -17], [-0.2, -0.5, -0.85], [0, 0, -1]), hand: 1 },
  hurl: { w: PZ([10.5, -1.5, -4], [-0.1, 0.15, -0.98], [-0.55, 0.82, 0.05]), hd: [5, -3, -22], hu: [-0.12, 0.1, -0.99], fo: PZ([3, -8, -20], [-0.15, -0.1, -0.98], [-0.55, 0.82, 0.05]), hand: 1, keepF: 1 },
};
const _sk = [0, 1, 2, 3, 4].map(() => PZ([0, 0, 0], [0, 1, 0], [0, 0, -1])), _skH = [new V3(), new V3(), new V3(), new V3(), new V3()];
const easeIO = k => k * k * (3 - 2 * k), easeOut = k => 1 - (1 - k) * (1 - k), easeBack = k => { const c = 1.70158, q = k - 1; return 1 + (c + 1) * q * q * q + c * q * q; };
const smooth = easeIO;
function crV(o, a, b, c, d, t) {   // through b to c on a curve that also passes through a and d
  const t2 = t * t, t3 = t2 * t;
  for (const k of ['x', 'y', 'z']) o[k] = 0.5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3);
  return o;
}
// a blow of kind, u of the way through, hitting at h: the five keys, then where between them u falls
function strikePose(out, base, kind, u, h, L) {
  const S0 = STRIKE[kind], K = _sk;
  pzCopy(K[0], base); pzCopy(K[4], base);
  if (kind === 'thrust') {   // a jab: back a little, then straight out at the mark and back
    pzCopy(K[1], base); K[1].p.add(_fv1.set(1.2, 0.4, 4));
    pzCopy(K[2], base); K[2].p.add(_fv1.set(-3.2, 1.6, -12)); K[2].u.lerp(_fv1.set(-0.1, 0.1, -1).normalize(), 0.6).normalize();
    pzCopy(K[3], K[2]); K[3].p.add(_fv1.set(0.4, -0.4, 2));
  } else {
    pzCopy(K[1], S0.w); pzCopy(K[3], S0.fo);
    K[2].u.set(...S0.hu).normalize(); K[2].p.set(...S0.hd).addScaledVector(K[2].u, -L);
    // the edge leads: each key faces the way the head is travelling through it
    if (!S0.keepF) {
      for (let i = 1; i < 4; i++) _skH[i].copy(K[i].p).addScaledVector(K[i].u, Math.max(L, 3));
      K[1].f.subVectors(_skH[2], _skH[1]).normalize(); K[2].f.subVectors(_skH[3], _skH[1]).normalize(); K[3].f.subVectors(_skH[3], _skH[2]).normalize();
    } else { K[1].f.copy(base.f); K[2].f.copy(base.f); K[3].f.copy(base.f); }
  }
  const T = [0, 0.62 * h, h, h + 0.3 * (1 - h), 1];
  let i = 0; while (i < 3 && u > T[i + 1]) i++;
  const k = clamp((u - T[i]) / (T[i + 1] - T[i]), 0, 1);
  // into the wind-up eased; the strike speeding up, the head trailing the hands until the wrist snaps it through; then easing off
  const e = i === 1 ? Math.pow(k, 1.5) : i === 2 ? easeOut(k) : easeIO(k), eu = i === 1 ? k * k : e;
  crV(out.p, K[Math.max(0, i - 1)].p, K[i].p, K[i + 1].p, K[Math.min(4, i + 2)].p, e);
  out.u.lerpVectors(K[i].u, K[i + 1].u, eu).normalize(); out.f.lerpVectors(K[i].f, K[i + 1].f, eu).normalize();
  return out;
}
function strikeKind(A, T, spearish) {
  if (A.wd) { const D = A.wd; if (D.thrust || A.w === 'twin' || A.w === 'spear') return 'thrust'; if (D.slam || D.round || D.fin) return 'chop'; return (A.side || 1) < 0 ? 'back' : 'cut'; }
  if (A.ov) { const t = T && T.tool; return t === 'axe' ? 'fell' : t === 'pick' || t === 'build' ? 'chop' : !T ? 'punch' : spearish ? 'thrust' : T.k === 'light' || T.wpn || T.thr === 'taxe' ? 'cut' : 'punch'; }
  if (A.i === 2) return 'chop'; if (A.i === 3 || spearish) return 'thrust';
  return (A.side || 1) < 0 ? 'back' : 'cut';
}
function hitOf(A) {
  const D = A.wd || A.ov || (typeof ATK !== 'undefined' && ATK[A.i]) || {}, at = D.hits && D.hits.length ? D.hits[D.hits.length - 1].at : D.hitAt;
  return clamp((at || A.dur * 0.4) / A.dur, 0.15, 0.8);
}
// the poses a few things you do bring your hand to
const ACT = {
  mouth: PZ([1.6, -4.6, -8], [-0.35, 0.55, 0.75], [-0.6, -0.3, -0.6]),
  pick: PZ([3.5, -15, -17], [-0.25, 0.4, -0.88], [-0.4, -0.85, -0.3]),
  reach: PZ([5.5, -3.5, -20], [-0.3, 0.8, -0.5], [-0.5, -0.2, -0.85]),
  workUp: PZ([6.5, -2.5, -13.5], [-0.15, 0.6, 0.78], [0, 0, -1]), workDn: PZ([4, -9, -16], [-0.2, -0.3, -0.93], [0, -1, 0]),
  cutA: PZ([5.5, -12.5, -18], [-0.35, -0.35, -0.87], [-0.2, -0.9, 0.3]), cutB: PZ([3.2, -11.2, -20.5], [-0.35, -0.45, -0.82], [-0.2, -0.9, 0.3]),
  guard: PZ([3.8, -4.8, -14], [-0.92, 0.35, -0.15], [0.05, 0.3, -1]), guardF: PZ([5, -4.6, -12], [-0.3, 0.95, 0], [0, 0, -1]),
  spin: PZ([7.5, -1.5, -12], [0, 1, 0], [-0.3, 0, -0.95]), loose: PZ([4, -4, -19], [-0.1, 0.9, -0.4], [-0.3, 0, -0.95]),
};
// the bow, in the left fist: carried low and canted at rest, up and square to your aim when you draw
const BOW_REST = PZ([-7, -6.8, -17.5], [0.5, 0.85, -0.12], [0.3, 0, -0.95]), BOW_AIM = PZ([-1.2, -4.6, -21], [0.24, 0.97, 0], [0.15, 0.04, -1]);
const bowRig = new THREE.Group(); vmScene.add(bowRig); bowRig.visible = false;
const bowHand = makeHand(true); bowRig.add(bowHand); poseHand(bowHand, 0.95); bowHand.rotation.y = -0.25;   // the knuckles turned out a little
let shownId = null, torchK = 0, equipT = 1, runK = 0, bowK = 0, drawH = 0, strHold = 0;
const VM = { cur: PZ([0, 0, 0], [0, 1, 0], [0, 0, -1]), tmp: PZ([0, 0, 0], [0, 1, 0], [0, 0, -1]), sh: new V3(), pole: new V3(), q: new THREE.Quaternion(), lagQ: new THREE.Quaternion(), e: new THREE.Euler(), v: new V3(), w: new V3() };
function armTo(H, side, grip, pole) {   // the elbow for a hand gripping at grip (view space), for the forearm to reach to
  const sh = VM.sh.set(side * 5.8 * vmX, -6.8, 2);
  sh.x += (grip.x - side * 7.4 * vmX) * 0.12; sh.y += clamp((grip.y + 6.4) * 0.12, -1, 1.5); sh.z += clamp((grip.z + 13.6) * 0.15, -1.5, 1);   // the shoulder follows the reach a little
  elbowAt(sh, grip, pole || VM.pole.set(side * 0.65, -1, 0.1), H.userData.elbow); H.userData.arm = true;
}
function placeHands(dt, now, bob, lag) {
  const p = S.p, D = S.day, s = heldSlot(), id = s ? s.id : null, T = id ? DIT[id] : null;
  if (id !== shownId) {
    if (shownId && ITEM.has(shownId)) ITEM.get(shownId).visible = false;
    shownId = id; equipT = 0;
    if (id) { const G = itemModel(id); G.visible = true; if (T.tool === 'bow' && G.parent !== bowRig) { bowRig.add(G); G.position.set(0, 0, BOW_GRIP); } }
  }
  equipT = Math.min(1, equipT + dt / 0.38);
  const G = id ? ITEM.get(id) : null, hold = holdOf(T, id), bow = !!T && T.tool === 'bow', spearish = hold === 'spear', L = headOf(T, id);
  const A = p.atk, act = p.act, wa = p.wact, cur = VM.cur;
  pzCopy(cur, HOLD[hold]);
  let closeK = !T ? 0.85 : hold === 'icon' || hold === 'small' ? 0.62 : 1, cup = hold === 'icon' ? 0.35 : 0, hideItem = false;
  // what you're doing: a blow, a throw, a turn of the sling, or something with your hands
  if (A && A.t < A.dur && !bow) {
    const kind = strikeKind(A, T, spearish);
    strikePose(cur, HOLD[hold], kind, A.t / A.dur, hitOf(A), L);
    if (!T) closeK = 1;
  } else if (wa && wa.t < (wa.dur || 0.4) && !bow && !(D && D.draw)) {
    const u = wa.t / (wa.dur || 0.4);
    if (wa.fn && wa.rel >= 0.15 && hold !== 'sling') { strikePose(cur, HOLD[hold], spearish ? 'hurl' : 'throw', u, clamp(wa.rel / wa.dur, 0.2, 0.8), spearish ? 0 : L); hideItem = u > wa.rel / wa.dur + 0.02 && u < 0.9; if (hideItem) closeK = 0.3; }   // let go: the hand opens after it
    else if (hold === 'sling') { pzMix(cur, ACT.spin, ACT.loose, easeOut(clamp(u * 3, 0, 1))); if (u > 0.6) pzMix(cur, cur, HOLD.sling, easeIO((u - 0.6) / 0.4)); }   // let go: the arm snaps forward
    else pzMix(cur, cur, T ? ACT.guard : ACT.guardF, Math.sin(Math.PI * u) * 0.7);
  } else if (act && act.t < act.dur) {
    const u = act.t / act.dur, k = Math.sin(Math.PI * Math.min(1, u * 1.1));
    if (act.pose === 8 || act.pose === 9) pzMix(cur, cur, ACT.mouth, easeIO(k));                    // to your mouth
    else if (act.pose === 7) { pzMix(cur, cur, ACT.pick, easeIO(k)); closeK *= 1 - 0.8 * k; }       // down to pick it up
    else if (act.pose === 10) { const c = 0.5 - 0.5 * Math.cos(u * Math.PI * 6); pzMix(VM.tmp, ACT.workUp, ACT.workDn, c < 0.5 ? easeIO(c * 2) * 0.35 : 0.35 + 0.65 * Math.pow((c - 0.5) * 2, 1.6)); pzMix(cur, cur, VM.tmp, Math.min(1, u * 6, (1 - u) * 6)); }   // working at it
    else if (act.pose === 11) { const c = 0.5 + 0.5 * Math.sin(u * Math.PI * 4); pzMix(VM.tmp, ACT.cutA, ACT.cutB, c); pzMix(cur, cur, VM.tmp, act.cont ? 1 : Math.min(1, u * 6)); }   // down at a body, the knife sawing (88-meat)
    else if (act.pose !== 4 || !T || T.tool !== 'rod') pzMix(cur, cur, ACT.reach, easeIO(k));
  }
  if (hold === 'sling' && D && D.draw) pzMix(cur, cur, ACT.spin, Math.min(1, D.draw.t * 5));   // up over your head to turn it
  // your guard up: what you hold brought up and across in front of you (68-guard)
  if (GUARD.k > 0.01) pzMix(cur, cur, T ? ACT.guard : ACT.guardF, easeIO(GUARD.k));
  // the blow lands: the hand jars back (v129: back, not a shudder)
  if (CFX.recoil > 0) { const r = smooth(Math.min(1, CFX.recoil)); cur.p.z += 2.2 * r; cur.p.y += 0.6 * r; cur.u.z += 0.3 * r; cur.u.normalize(); }
  // eating and drinking: the left hand lifts the flask to your mouth
  const drink = S.rg.drink ? Math.sin(Math.PI * clamp(1 - S.rg.drink / FLASK_T, 0, 1)) : 0;
  // alive in your hand: it rises into view when you take it up, moves with your breath, rides lower and swings at a run
  const v = Math.hypot(p.vx, p.vy) / RUN; runK += (clamp((v - 0.45) / 0.4, 0, 1) - runK) * Math.min(1, dt * 6);
  const busy = (A && A.t < A.dur) || (wa && wa.t < (wa.dur || 0.4)) || (act && act.t < act.dur) ? 1 : 0, calm = 1 - busy, eq = easeBack(equipT);
  const ph = p.phase || 0, br = Math.sin(now * 1.7);
  cur.p.y += (0.14 * br - 1.3 * runK + 0.35 * runK * Math.abs(Math.sin(ph))) * calm - 9 * (1 - eq);
  cur.p.x += (0.5 * Math.sin(ph) * runK + 0.06 * Math.sin(now * 0.9)) * calm + 2 * (1 - eq);
  cur.p.z += 0.8 * runK * calm;
  cur.u.x += 0.05 * br * calm * 0.3 + 0.18 * Math.sin(ph) * runK * calm; cur.u.z += (0.3 * runK * calm + 0.6 * (1 - eq)); cur.u.normalize();
  // swaying against your turning and bobbing with your stride
  const [bx, by] = bob, [ly, lp] = lag;
  cur.p.x += bx - ly * 6; cur.p.y += by + lp * 5 - VIEW_FX.dip * 0.15 - drink * 6;
  VM.lagQ.setFromEuler(VM.e.set(lp * 0.5, ly * 0.5, 0)); cur.u.applyQuaternion(VM.lagQ); cur.f.applyQuaternion(VM.lagQ);
  cur.p.x *= vmX;
  // the right hand: closed round what it holds, cupped under something small, loosely closed when empty
  fist.visible = true; fistK += (closeK - fistK) * Math.min(1, dt * 14); poseHand(fist, fistK, cup);
  if (bow) placeBow(dt, now, G, cur, bx, by, ly, lp);
  else {
    bowRig.visible = false;
    handG.position.copy(cur.p); armTo(fist, 1, cur.p);
    handFrame(cur.u, cur.f, handG.quaternion, VM.v.subVectors(fist.userData.elbow, cur.p));
    if (G) G.visible = !hideItem;
  }
  if (G && T.tool === 'sling') swingSling(G, now, D);
  if (G && T.k === 'light') {   // the flame licks up off the head: three tongues, outer red to a pale core, each flickering on its own beat
    const fl = G.getObjectByName('flame'), lit = S.day && dayTorch() ? 1 : 0.15;
    fl.children.forEach((sp, i) => { if (i > 2) { sp.material.opacity = 0.3 * lit * (0.85 + 0.15 * Math.sin(now * 23)); return; }
      const w = [4.2, 3.2, 2.0][i], h = [6.8, 5.4, 3.4][i] * (1 + 0.16 * Math.sin(now * (13 + i * 4) + i) * Math.sin(now * (7 + i * 3))) * (1 - 0.25 * v) * lit;
      sp.scale.set(w * (1 + 0.08 * Math.sin(now * 19 + i * 2)), Math.max(0.01, h), 1); sp.position.x = 0.5 * Math.sin(now * (9 + i) + i) * (1 + v); sp.material.rotation = -0.12 * v + 0.06 * Math.sin(now * 5 + i); });
  }
  // the left: the torch, up by night, down by day (and on your belt while you've a bow in hand)
  torchK += (((S.torchLvl > 0.05 || S.torchOn) && !bow ? 1 : 0) - torchK) * Math.min(1, dt * 5);
  torchG.visible = torchK > 0.02 && !bow;
  torchG.position.set((-8.2 + bx - ly * 6 - 0.4 * Math.sin(ph) * runK) * vmX, -6.3 + by + lp * 5 - VIEW_FX.dip * 0.12 - (1 - torchK) * 14 + drink * 5 + 0.12 * Math.sin(now * 1.7 + 0.6) - 1.0 * runK, -16 + drink * 6 + 0.6 * runK);
  torchG.rotation.set(0.1 + lp * 0.5 + drink * 0.9 + 0.12 * runK, -0.2 + ly * 0.5, 0.1 + drink * 0.4);
  if (torchG.visible) { torchG.updateMatrixWorld(true); armTo(torchHand, -1, torchHand.getWorldPosition(VM.w)); }
  lensGlow.material.opacity = (0.7 + 0.1 * Math.sin(now * 9)) * S.torchLvl;
}
function placeBow(dt, now, G, cur, bx, by, ly, lp) {
  const D = S.day, R = RNG.bow ? RNG.bow.full : 0.8, wa = S.p.wact;
  let c = D && D.draw ? clamp(D.draw.t / R, 0, 1) : 0;
  if (wa && wa.fn && wa.t < wa.dur && wa.rel) c = wa.t < wa.rel ? easeOut(wa.t / wa.rel) : 0;   // a volley: a quick draw and loose
  bowK += ((D && D.draw) || c > 0 ? 1 : -1) * dt * 6; bowK = clamp(bowK, 0, 1);
  // the string snaps forward when you loose; your hand comes after it more slowly
  drawH = c >= drawH ? c : Math.max(c, drawH - dt * 2.6);
  const P = pzMix(VM.tmp, BOW_REST, BOW_AIM, easeIO(bowK)), eq = easeBack(equipT), run = runK * (1 - bowK);
  P.p.x += bx - ly * 6 + 2 * (1 - eq); P.p.y += by + lp * 5 - VIEW_FX.dip * 0.15 - 9 * (1 - eq) - 1.2 * run + 0.14 * Math.sin(now * 1.7) * (1 - bowK);
  P.p.z += 0.8 * run;
  P.u.applyQuaternion(VM.lagQ); P.f.applyQuaternion(VM.lagQ);
  P.p.x *= vmX;
  bowRig.visible = true; bowRig.position.copy(P.p); handFrame(P.u, P.f, bowRig.quaternion); bowRig.updateMatrixWorld(true);
  vmString(G, c);
  const ar = G.getObjectByName('arrow'); ar.visible = c > 0.01 || (!!(D && D.draw) && dayAmmoN('bow') > 0); ar.position.set(-0.5, BOW_NOCK, -5.4 + 9 * c); ar.quaternion.identity();
  // the right hand: hanging easy while you carry the bow, then onto the string, fingers hooked round it under the nock,
  // drawing it back to your chin
  const N = VM.v.set(0, BOW_NOCK - 0.4, BOW_GRIP - 3.4 + 9 * drawH), k = easeIO(bowK);
  bowRig.localToWorld(N); handG.position.lerpVectors(cur.p, N, k);
  handFrame(cur.u, cur.f, handG.quaternion).slerp(bowRig.quaternion, k);
  const off = drawH > c + 0.04 ? 1 : 0; fistK += ((bowK < 0.5 ? 0.85 : off ? 0.25 : 0.62) - fistK) * Math.min(1, dt * 18); poseHand(fist, fistK, 0);
  armTo(fist, 1, handG.position, VM.pole.set(0.65 + 0.25 * k, -1 + 1.3 * k, 0.1 + 0.1 * k)); armTo(bowHand, -1, bowRig.position, VM.w.set(-0.8, -1, 0));
}
function swingSling(G, now, D) {   // the pouch on its cords: hanging from your fingers, or turning round over your head
  const pu = G.getObjectByName('pouch'), A = G.getObjectByName('cordA'), B = G.getObjectByName('cordB');
  handG.updateMatrixWorld(true);
  const wa = S.p.wact, loose = !(D && D.draw) && wa && wa.t < wa.dur ? wa.t / wa.dur : -1, free = (D && D.draw) || loose >= 0;
  const W = VM.w.copy(G.localToWorld(VM.v.set(0, -1.6, 0)));
  if (D && D.draw) { const a = now * (8 + 10 * clamp(D.draw.t / 0.8, 0, 1)); W.add(_fv1.set(Math.cos(a) * 6.5, 0.6 + Math.sin(a * 0.5) * 0.4, Math.sin(a) * 6.5)); }
  else if (loose >= 0) W.add(_fv1.set(-0.5 * (1 - loose), 1.5 - 7 * loose * loose, -6.5 * (1 - loose * loose)));   // let go: flung out ahead, then dropping
  if (free) { G.worldToLocal(W); pu.position.copy(W); } else pu.position.set(0, 1.3, -0.3);   // between throws the pouch is in your fist, the cords hanging in a loop
  for (const [o, sx] of [[A, 1], [B, -1]]) {   // each cord from the loop round your finger to its end of the pouch (or hanging)
    const a = _fd.set(0.18 * sx, -1.65, 0), d = free ? _afw.set(1.0 * sx, 0.15, 0).add(pu.position).sub(a) : _afw.set(-0.13 * sx, -3.2, 0.25 + 0.1 * Math.sin(now * 1.3)), l = d.length();
    o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(_sUp, d.normalize()); o.scale.set(1, l, 1);
  }
}
