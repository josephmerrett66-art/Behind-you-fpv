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
function vmString(G, c) {   // lay each half of the bowstring from its tip to the nock, drawn back by c
  const nock = new V3(0, 0, -3.4 + 9 * c);
  for (const [n, y] of [['strA', 10.6], ['strB', -10.6]]) {
    const o = G.getObjectByName(n); if (!o) continue;
    _sa.set(0, y, -3.4); _sb.subVectors(nock, _sa); const L = _sb.length();
    o.position.copy(_sa).addScaledVector(_sb, 0.5); o.quaternion.setFromUnitVectors(_sUp, _sb.normalize()); o.scale.set(1, L, 1);
  }
}
const capsule = (r, h) => new THREE.CapsuleGeometry(r, h, 3, 8);

// ---------------- the left hand: the torch that comes on at dusk ----------------
const torchG = new THREE.Group(); vmScene.add(torchG);
{
  const body = cyl(1.15, 1.0, 9, 10); body.rotateX(Math.PI / 2);
  const head = cyl(1.75, 1.2, 2.6, 12); head.rotateX(Math.PI / 2);
  vmPart(torchG, body, mat('#66655e'), 0, 0, 0);
  vmPart(torchG, head, mat('#5a5850'), 0, 0, -5.4);
  vmPart(torchG, new THREE.CircleGeometry(1.45, 16), mat('#fff1d8', 1), 0, 0, -6.72, 0, 0, 0, false);
  vmPart(torchG, new THREE.SphereGeometry(1.75, 10, 8), mat(GLOVE), 0.2, -0.7, 1.6);
  vmPart(torchG, capsule(1.1, 5), mat(SLEEVE), -0.6, -1.3, 6.2, 1.75, 0, 0.35);
}
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,215,1)'); gr.addColorStop(0.25, 'rgba(255,215,160,0.5)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const lensGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
lensGlow.scale.set(7, 7, 1); lensGlow.position.set(0, 0, -7.2); torchG.add(lensGlow);

// ---------------- the right hand and what's in it ----------------
// The hand's grip sits at the group's origin; the item runs up its +y.
const handG = new THREE.Group(); vmScene.add(handG);
const fist = new THREE.Group(); handG.add(fist);
vmPart(fist, new THREE.SphereGeometry(1.75, 10, 8), mat(GLOVE), 0, -0.4, 0.2);
vmPart(fist, capsule(1.1, 4.5), mat(SLEEVE), 0.2, -1.1, 3.9, 1.6, 0, -0.3);
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
  } else if (tool === 'rod') {
    shaft(30, 0.35, '#8a6a44', -4);
    const ln = new THREE.BufferGeometry(); ln.setAttribute('position', new THREE.Float32BufferAttribute([0, 26, 0, 0, 14, -12], 3)); G.add(new THREE.Line(ln, new THREE.LineBasicMaterial({ color: 0xd8d0bc })));
  } else if (T.k === 'light') {
    shaft(11, 0.7, '#6b4a2e', -3);
    vmPart(G, cyl(1.3, 0.9, 2.6, 8), mat('#3a2a1a'), 0, 8.6, 0);
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); fl.scale.set(9, 12, 1); fl.position.set(0, 12, 0); fl.name = 'flame'; G.add(fl);
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
  idle: [9.5, -8.6, -16, -0.95, 0.1, 0.45], spearIdle: [8, -7.5, -10, -1.45, 0.05, 0.12], bowIdle: [3.4, -5.4, -17, -0.05, -0.08, -0.25],
  icon: [8.2, -7.4, -15, -0.35, -0.25, 0.12], fist: [8.8, -9, -15, -0.6, 0.2, 0.4],
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
    else cur = lerp6(base, [6, -2, -20, -1.2, 0, 0.3], k);
  }
  if (bow && D.draw) { const c = clamp(D.draw.t / (RNG.bow ? RNG.bow.full : 0.8), 0, 1); cur = lerp6(base, [1.2, -4, -14, -0.02, -0.04, -0.06], Math.min(1, c * 3)); }
  if (G && bow) {   // the string comes back with the draw, the arrow on it
    const c = D.draw ? clamp(D.draw.t / (RNG.bow ? RNG.bow.full : 0.8), 0, 1) : 0, ar = G.getObjectByName('arrow');
    vmString(G, c);
    ar.visible = !!D.draw || dayAmmoN('bow') > 0; ar.position.z = 9 * c;
  }
  if (G && T.tool === 'sling') { const pu = G.getObjectByName('pouch'); if (D.draw) { const a = now * (8 + 10 * clamp(D.draw.t / 0.8, 0, 1)); pu.position.set(Math.cos(a) * 6, -4 + Math.sin(a) * 2, Math.sin(a) * 6); } else pu.position.set(0, -7, 0); }
  if (G && T.k === 'light') { const fl = G.getObjectByName('flame'); fl.material.opacity = 0.75 + 0.25 * Math.sin(now * 17) * Math.sin(now * 7); fl.scale.set(8 + Math.sin(now * 11), 11 + 2 * Math.sin(now * 13), 1); }
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
  torchG.position.set((-8.4 + bx - ly * 6) * vmX, -7.2 + by + lp * 5 - VIEW_FX.dip * 0.12 - (1 - torchK) * 14 + drink * 5, -16 + drink * 6);
  torchG.rotation.set(0.06 + lp * 0.9 + drink * 0.9, -0.08 + ly * 0.9, 0.1 + drink * 0.4);
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
