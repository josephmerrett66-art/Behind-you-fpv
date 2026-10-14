// ================= figures: the raiders and the animals, built of rounded limbs with the game's dark outline =================
// Each is posed fresh every frame from what the main game says it is doing (walking, winding up a blow, striking, writhing
// in your light, grazing, fleeing, charging), and drawn as a handful of instanced shapes.
const MAXF = 160;
const figMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU),
  vertexShader: TERR_GLSL + `attribute vec4 iCol; varying vec4 vC; varying vec3 vW, vN;
    void main() { vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); w.y += terrH(w.xz); vW = w.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vC = iCol; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `varying vec4 vC; varying vec3 vW, vN;
    void main() { vec3 c = vC.rgb * lightAt(vW, normalize(vN), 1.0) * 1.05 + vC.rgb * vC.a; gl_FragColor = vec4(fogged(grey(c), vW), 1.0); }`,
});
const figEdge = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU), side: THREE.BackSide,
  vertexShader: TERR_GLSL + `attribute vec4 iCol; varying vec3 vW; varying float vE;
    void main() { vec3 n = normalize(mat3(instanceMatrix) * normal); vec4 w = modelMatrix * (instanceMatrix * vec4(position, 1.0) + vec4(n * 0.7, 0.0)); w.y += terrH(w.xz); vW = w.xyz; vE = iCol.a; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `varying vec3 vW; varying float vE;
    void main() { vec3 L = lightAt(vW, vec3(0.0), 0.0); float b = clamp(dot(L, vec3(0.34)) * 2.2 + vE * 0.6, 0.0, 1.0); gl_FragColor = vec4(fogged(vec3(0.15, 0.15, 0.14) * b, vW), 1.0); }`,
});
class Part {
  constructor(geo, cap = MAXF, edge = true, emat = figEdge) {
    this.cap = cap;
    this.col = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); this.col.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iCol', this.col);
    this.mesh = new THREE.InstancedMesh(geo, figMat, cap); this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0; scene.add(castsShadow(this.mesh));
    if (edge) { this.edge = new THREE.InstancedMesh(geo, emat, cap); this.edge.instanceMatrix = this.mesh.instanceMatrix; this.edge.frustumCulled = false; this.edge.count = 0; scene.add(this.edge); }
    this.n = 0;
  }
  push(m, c, e = 0) { if (this.n >= this.cap) return; const i = this.n++; this.mesh.setMatrixAt(i, m); this.col.setXYZW(i, c[0], c[1], c[2], e); }
  done() { this.mesh.count = this.n; if (this.edge) this.edge.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; this.col.needsUpdate = true; this.n = 0; }
}
function mergeGeo(list) {
  const pos = [], nor = [];
  for (const g of list) { const n = g.index ? g.toNonIndexed() : g; pos.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return out;
}
function capG(r, len, top) { const g = new THREE.CapsuleGeometry(r, len, 3, 8); g.translate(0, top ? -(len / 2 + r) : len / 2 + r, 0); return g; }
// a person (the raiders are the same pale figure as the 2D game's, sized by kind)
const torsoG = (() => { const t = new THREE.CylinderGeometry(4.7, 3.1, 13, 10, 2); t.translate(0, 6.5, 0); t.scale(1, 1, 0.62);
  const sh = new THREE.SphereGeometry(4.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); sh.scale(1, 0.45, 0.62); sh.translate(0, 13, 0); return mergeGeo([t, sh]); })();
const headG = new THREE.SphereGeometry(3.5, 12, 9); headG.scale(1, 1.18, 1.02);
const faceG = new THREE.SphereGeometry(2.8, 10, 7); faceG.scale(1, 1.25, 0.45);
// shapes for everything else: a ball, a limb (a capsule a unit long, hanging down), a rod (a unit tall), a box, a cone
const ballG = new THREE.SphereGeometry(0.5, 12, 8), limbG = (() => { const g = new THREE.CapsuleGeometry(0.5, 1, 3, 8); g.scale(1, 0.5, 1); g.translate(0, -0.5, 0); return g; })(), rodG = (() => { const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 7); g.translate(0, 0.5, 0); return g; })();
const boxG = new THREE.BoxGeometry(1, 1, 1), coneG = (() => { const g = new THREE.ConeGeometry(0.5, 1, 8); g.translate(0, 0.5, 0); return g; })();
const PT = { torso: new Part(torsoG, 96), head: new Part(headG, 96), face: new Part(faceG, 96), arm: new Part(capG(1.2, 13.4, true), 192), leg: new Part(capG(1.65, 13.6, true), 192),
  ball: new Part(ballG, 1800), limb: new Part(limbG, 1500), rod: new Part(rodG, 700), box: new Part(boxG, 700), cone: new Part(coneG, 300) };
// the animals' own: smooth rounded shapes with no drawn outline, so the overlapping parts melt into one soft body
const aBallG = new THREE.SphereGeometry(0.5, 16, 11);
PT.aBall = new Part(aBallG, 1600, false); PT.aLimb = new Part(limbG, 900, false); PT.aLimb.geoDown = true; PT.aRod = new Part(rodG, 300, false); PT.aCone = new Part(coneG, 600, false);
const _base = new M4(), _torso = new M4(), _m = new M4(), _t = new M4(), _t2 = new M4(), _p = new V3(), _s = new V3(1, 1, 1), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _u = new V3();
function rot(rx, ry, rz) { _e.set(rx, ry, rz, 'YXZ'); return _t.makeRotationFromEuler(_e); }
function child(out, parent, x, y, z, rx, ry, rz) { rot(rx, ry, rz); _t.setPosition(x, y, z); return out.multiplyMatrices(parent, _t); }
function scaled(m, sx, sy, sz) { return m.scale(_s.set(sx, sy, sz)); }
// a limb or rod between two points, r thick
function between(part, ax, ay, az, bx, by, bz, r, col, em = 0) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz) || 0.001;
  if (part === PT.limb) { _q.setFromUnitVectors(_u.set(0, -1, 0), _p.set(dx / L, dy / L, dz / L)); _m.compose(_p.set(ax, ay, az), _q, _s.set(r * 2, L, r * 2)); }
  else { _q.setFromUnitVectors(_u.set(0, 1, 0), _p.set(dx / L, dy / L, dz / L)); _m.compose(_p.set(ax, ay, az), _q, _s.set(r * 2, L, r * 2)); }
  part.push(_m, col, em);
}
function blob(part, x, y, z, sx, sy, sz, yaw, col, em = 0, pitch = 0, roll = 0) {
  _e.set(pitch, yaw, roll, 'YXZ'); _m.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(sx, sy, sz)); part.push(_m, col, em);
}
const rgb = (c, k = 1) => [c[0] / 255 * k, c[1] / 255 * k, c[2] / 255 * k];
const hexK = (h, k = 1) => hex(h, k);
const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ---------------- raiders ----------------
// ground (x, y) facing angle a -> the yaw a figure turns to so its front (+z) faces that way
const faceYaw = a => Math.PI / 2 - a;
const KIT_WEAR = { shade: { coat: 1 }, tall: { coat: 2 }, archer: { coat: 1 }, brute: { vest: 1 }, bomber: { vest: 1, pack: 1 }, laser: { vest: 1 }, splitter: { vest: 1 }, spear: { vest: 1 }, kamikaze: { charges: 1 } };
// each kind dressed in its own colour, as in the top-down game: a shirt in its colour, trousers a dark earthy shade of it,
// a weathered skin tone, and its coat or hood a deep shade of the same
const FOE_SKIN = { shade: [176, 150, 132], stalker: [168, 140, 128], brute: [184, 140, 108], tall: [150, 122, 108], bomber: [190, 150, 118], laser: [178, 150, 130], kamikaze: [196, 160, 120],
  splitter: [186, 152, 136], spear: [176, 132, 98], archer: [188, 156, 120], woodcutter: [184, 140, 108], lamplighter: [196, 160, 124], huntsman: [176, 140, 110], warden: [170, 136, 112] };
function foeDress(type) {
  const t0 = FOE_TINT[type] || [170, 150, 120], m = (t0[0] + t0[1] + t0[2]) / 3, t = t0.map(v => clamp(m + (v - m) * 1.6, 0, 255));   // a touch richer than the top-down tint
  return { shirt: mixc(t, [150, 140, 125], 0.05), trou: mixc(t.map(v => v * 0.5), [64, 56, 46], 0.55), skin: FOE_SKIN[type] || [182, 148, 120], deep: mixc(t.map(v => v * 0.42), [40, 36, 32], 0.4) };
}
const KIT_HEAD = { shade: 'hood', stalker: 'goggles', brute: 'helmet', tall: 'hood', bomber: 'helmet', laser: 'visor', kamikaze: 'goggles', splitter: 'hood', spear: 'helmet', archer: 'hood' };
function poseFoe(e, now, dt, dying) {
  const F = FOES[e.type], sc = foeScale(e), dr = foeDress(e.type);
  // walk like the 2D figure: face the way it is really moving, turning smoothly, and plant each step in time
  if (!dying) {
    const gdt = Math.max(dt, 1e-4), mdx = e.x - (e.fgx ?? e.x), mdy = e.y - (e.fgy ?? e.y); e.fgx = e.x; e.fgy = e.y;
    const v = Math.hypot(mdx, mdy) / gdt; e.fgv = (e.fgv || 0) + (Math.min(v, 400) - (e.fgv || 0)) * Math.min(1, gdt * 10); if (v > 6) e.fgHead = Math.atan2(mdy, mdx);
    const aiming = (e.type === 'laser' && e.ai !== 'move') || (e.type === 'spear' && e.ai === 'wind') || (e.type === 'archer' && e.ai === 'draw') || e.sw;
    const want = !aiming && e.fgv > 10 && e.fgHead !== undefined ? e.fgHead : foeDir(e);
    e.fgFace = e.fgFace === undefined ? want : e.fgFace + clamp(angDiff(want, e.fgFace), -9 * gdt, 9 * gdt);
    if (e.fgv > 1) e.fgPh = (e.fgPh || e.phase || 0) + 1.348 * e.fgv / sc / 7.5 * gdt;
  }
  const face = dying ? e.dir : e.fgFace, gv = dying ? 0 : e.fgv || 0, ph = dying ? e.phase || 0 : e.fgPh || 0;
  const die = dying ? Math.min(1, e.t / 0.6) : 0, burn = dying ? 1 : 1 - Math.max(0, e.hp) / e.maxHp, pain = dying ? 0 : e.pain || 0;
  const b = Math.min(1, burn * 1.2 + pain * (0.12 + 0.18 * Math.random()) + die);
    const hot = (c, k, h) => rgb(c.map((v, i) => lerp(v, h[i], k)));
  // a blow: it flares white, squashes and springs back, rocks away from you and shudders
  const hkT = !dying && e.kHitT !== undefined ? S.t - e.kHitT : 9, rock = hkT < 0.4 ? Math.exp(-9 * hkT) : 0;
  const sq = hkT < 0.4 ? 0.22 * Math.exp(-10 * hkT) * Math.cos(26 * hkT) : 0;
  const fl = Math.max(e.flash || 0, hkT < 0.14 ? 1 - hkT / 0.14 : 0, dying ? Math.max(0, 1 - e.t / 0.1) : 0);
  let body = hot(dr.shirt, b, [255, 150, 60]), head = hot(dr.skin, b, [255, 175, 90]), legs = hot(dr.trou, b, [200, 90, 30]), fc = hot(dr.skin.map(v => v * 0.82), b, [120, 40, 10]);
  if (fl > 0) { body = body.map(v => lerp(v, 1.6, fl)); head = head.map(v => lerp(v, 1.6, fl)); }
  const em = b * (0.22 + 0.16 * Math.sin(now * 23 + (e.fgSeed ?? (e.fgSeed = Math.random() * 9)))) + fl * 0.8 + (dying ? 0.6 * (1 - die) : 0);
  const jit = (pain * 1.6 + rock * 3 + (e.sw && e.sw.ph === 'wind' && e.sw.t > e.sw.T * 0.6 ? 0.8 : 0)) * sc, jx = (Math.random() - 0.5) * jit, jz = (Math.random() - 0.5) * jit;
  const bulk = e.type === 'woodcutter' ? 1.22 : e.type === 'brute' ? 1.18 : e.type === 'stalker' ? 0.9 : 1;
  // a kill throws it back off its feet, away from you, before it falls
  const ka = dying ? (e.ka ?? Math.atan2(e.y - S.p.y, e.x - S.p.x)) : 0, fly = dying ? 26 * (1 - Math.pow(1 - Math.min(1, e.t / 0.35), 3)) : 0, hop = dying ? Math.sin(Math.PI * Math.min(1, e.t / 0.35)) * 9 : 0;
  _base.compose(_p.set(e.x + jx + Math.cos(ka) * fly, -die * 4 + hop, e.y + jz + Math.sin(ka) * fly), _q.setFromEuler(_e.set(-die * 1.45, faceYaw(face), 0, 'YXZ')), _s.set(sc * bulk * (1 + sq * 0.6), sc * (1 - die * 0.15) * (1 - sq), sc * bulk * (1 + sq * 0.6)));
  const g = Math.min(1.5, gv / (WALK * sc)), sw = Math.sin(ph) * 0.75 * Math.min(1, g);
  let lean = (e.type === 'stalker' ? 0.35 : e.type === 'kamikaze' ? 0.45 : 0) + Math.min(1, g) * 0.12, armL = -sw * 0.8, armR = sw * 0.8, armZ = 0.12, headX = 0, twist = 0;
  const s = e.sw;
  if (s) {   // the swing: arms up and back, trembling, then thrown forward and down
    let up, fw;
    if (s.ph === 'wind') { const k = Math.min(1, s.t / (s.T * 0.6)); up = 1 - (1 - k) * (1 - k); fw = 0; if (s.T - s.t < 0.2 && s.T - s.t > 0) { _p.set(0, 46, 0).applyMatrix4(_base); stat(_p.x, _p.y, _p.z, 9 + 6 * Math.sin(now * 40), 1, 1, 1, 1, 1); } }
    else if (s.ph === 'strike') { const k = Math.min(1, s.t / s.T); up = 1 - k; fw = k; }
    else { const k = Math.min(1, s.t / s.T); up = 0; fw = s.stuck ? (k < 0.8 ? 1 : (1 - k) / 0.2) : (1 - k) * (1 - k); }   // a stuck axe holds him bent over it
    lean = -0.15 * up + 0.55 * fw; armL = armR = lerp(lerp(-0.4, -2.75, up), -0.6, fw); armZ = 0.35 * up + 0.15 * fw;
  } else if (e.bpose) { const u = e.bpose; if (u <= 1) { armR = -2.7 * u; armL = -0.6 * u; lean = -0.2 * u; twist = -0.5 * u; } else { armR = -0.9; armL = -0.3; lean = 0.3; twist = 0.4; } }   // the hatchet back over his shoulder, then thrown
  else if (e.type === 'spear' && e.ai === 'wind') { armR = -2.6; armL = -0.5; lean = -0.2; }
  else if (e.type === 'archer' && e.ai === 'draw') { armL = -1.55; armR = -1.5; armZ = -0.1; twist = 0.5; }
  if (pain > 0.05) {   // writhing in your light
    armL = lerp(armL, -1.9 + Math.sin(now * 17 + e.fgSeed) * 0.7, pain); armR = lerp(armR, -2.2 + Math.cos(now * 15 + e.fgSeed) * 0.7, pain);
    armZ = lerp(armZ, 0.7, pain); twist = Math.sin(now * 11 + e.fgSeed) * 0.3 * pain; headX = lerp(headX, -0.5, pain); lean = lerp(lean, -0.2 + Math.sin(now * 9) * 0.15, pain);
  }
  if (e.kick) lean -= 0.4 * e.kick;
  lean -= 0.55 * rock; headX -= 0.6 * rock; armL -= 0.9 * rock; armR -= 1.1 * rock; armZ += 0.5 * rock;   // knocked back by the blow
  child(_torso, _base, 0, 17, 0, lean, twist, 0); PT.torso.push(_torso, body, em);
  child(_m, _torso, 0, 17.6, 0.6, headX + 0.15, 0, Math.sin(now * 13) * 0.25 * pain); PT.head.push(_m, head, em);
  const hm = _t2.copy(_m);
  child(_t, hm, 0, -0.2, 2.4, 0, 0, 0); PT.face.push(_t, fc, em * 0.5);
  // what it wears on its head, so each kind reads at a glance
  const hk = KIT_HEAD[e.type], dark = hot(dr.deep, b, [200, 90, 30]);
  if (hk === 'hood') { child(_m, hm, 0, 1.2, -0.6, -0.25, 0, 0); scaled(_m, 8.6, 9.4, 8.8); PT.ball.push(_m, dark, em); }
  else if (hk === 'helmet') { child(_m, hm, 0, 2.1, -0.2, -0.1, 0, 0); scaled(_m, 8.4, 5.6, 8.6); PT.ball.push(_m, rgb([110, 112, 106]).map((v, i) => lerp(v, body[i], 0.25)), em); }
  else if (hk === 'beanie') { child(_m, hm, 0, 2.2, -0.3, -0.12, 0, 0); scaled(_m, 8.8, 6.6, 9); PT.ball.push(_m, hot([150, 40, 34], b, [255, 120, 60]), em); child(_m, hm, 0, 0.6, -0.2, -0.12, 0, 0); scaled(_m, 9.4, 1.8, 9.6); PT.ball.push(_m, hot([110, 30, 26], b, [255, 120, 60]), em);
    child(_m, hm, 0, 6, -0.8, 0, 0, 0); scaled(_m, 3, 3, 3); PT.ball.push(_m, hot([220, 200, 170], b, [255, 200, 120]), em);   // a bobble on top
    child(_m, hm, 0, -2.6, 2.2, 0.2, 0, 0); scaled(_m, 7.4, 4.6, 5); PT.ball.push(_m, hot([96, 62, 40], b, [200, 90, 30]), em); }   // and a beard
  else if (hk === 'goggles' || hk === 'visor') { child(_m, hm, 0, 0.9, 3.0, 0, 0, 0); scaled(_m, hk === 'visor' ? 6.4 : 6, 1.7, 1.2); PT.box.push(_m, hk === 'visor' ? rgb([80, 150, 240]) : [0.16, 0.16, 0.15], hk === 'visor' ? 0.6 : 0); }
  // eyes: two points on the front of the head, in its colour, bright in the dark
  const ec = EYES[e.type] ? EYES[e.type].split(',').map(v => +v / 255) : [0.94, 0.94, 0.92], dk = 1 - dayLight() * 0.75;
  for (const x of [-1.15, 1.15]) { _p.set(x, 0.5, 3.75).applyMatrix4(hm); stat(_p.x, _p.y, _p.z, 2.4 * sc, ec[0], ec[1], ec[2], (0.75 * dk + 0.15) * (1 - die), 0); }
  // arms and legs in two parts each, bending at the elbow and the knee, with hands and boots
  const sleeve = body.map(v => v * 0.95), skin = head, boot = mixc(legs, [0.1, 0.1, 0.09], 0.6), dk2 = mixc(legs, [0.1, 0.1, 0.09], 0.4);
  const jt = (m, x, y, z) => _p.set(x, y, z).applyMatrix4(m).clone();
  const winding = s && s.ph === 'wind' ? Math.min(1, s.t / (s.T * 0.6)) : 0, striking = s && s.ph === 'strike';
  const limb = (sx, ang, z, bend) => {
    const sm = child(new M4(), _torso, sx, 12.2, 0, ang, 0, z), sh = jt(sm, 0, 0, 0), el = jt(sm, 0, -6.7, 0), fm = child(new M4(), sm, 0, -6.7, 0, -bend, 0, 0), hd = jt(fm, 0, -6.3, 0);
    blob(PT.ball, sh.x, sh.y, sh.z, 3.2 * sc, 3 * sc, 3 * sc, 0, sleeve, em);
    between(PT.limb, sh.x, sh.y, sh.z, el.x, el.y, el.z, 1.45 * sc, sleeve, em); between(PT.limb, el.x, el.y, el.z, hd.x, hd.y, hd.z, 1.2 * sc, sleeve, em);
    blob(PT.ball, hd.x, hd.y, hd.z, 2.4 * sc, 2.6 * sc, 2.4 * sc, 0, skin, em);
    return fm.multiply(_t.makeTranslation(0, 8.7, 0));   // a frame whose (0, -15, 0) is the hand, for what it holds
  };
  const walkB = 0.35 + 0.25 * Math.min(1, g), bendL = pain > 0.05 ? 1.3 : winding ? 0.4 + 1.2 * winding : striking ? 0.15 : e.type === 'archer' && e.ai === 'draw' ? 0.1 : walkB + 0.3 * Math.max(0, -sw);
  const bendR = pain > 0.05 ? 1.1 : winding ? 0.4 + 1.2 * winding : striking ? 0.15 : e.type === 'archer' && e.ai === 'draw' ? 1.7 : e.type === 'spear' && e.ai === 'wind' ? 0.6 : walkB + 0.3 * Math.max(0, sw);
  limb(-5.4, armL, -armZ, bendL);
  const armRm = limb(5.4, armR, armZ, bendR);
  const leg = (hx, ang, kb) => {
    const tm = child(new M4(), _base, hx, 17, 0, ang, 0, 0), hp = jt(tm, 0, 0, 0), kn = jt(tm, 0, -8, 0), sm = child(new M4(), tm, 0, -8, 0, kb, 0, 0), ft = jt(sm, 0, -7.6, 0), toe = jt(sm, 0, -8.4, 1.6);
    between(PT.limb, hp.x, hp.y, hp.z, kn.x, kn.y, kn.z, 1.9 * sc, legs, em); between(PT.limb, kn.x, kn.y, kn.z, ft.x, ft.y, ft.z, 1.6 * sc, legs, em);
    blob(PT.ball, toe.x, toe.y, toe.z, 3.4 * sc, 2.6 * sc, 5.2 * sc, faceYaw(face), boot, em);
  };
  const gk = Math.min(1, g);
  leg(-2.2, sw, 0.12 + 0.95 * gk * Math.max(0, Math.cos(ph)) + rock * 0.4);
  leg(2.2, -sw, 0.12 + 0.95 * gk * Math.max(0, -Math.cos(ph)) + rock * 0.4);
  // the hips, the belt, the neck, and what it wears: a long coat, a padded vest, a pack, charges strapped across its chest
  child(_m, _base, 0, 17.5, 0, lean * 0.3, twist * 0.5, 0); scaled(_m, 9.2, 5, 6); PT.ball.push(_m, legs, em);
  child(_m, _torso, 0, 0.8, 0, 0, 0, 0); scaled(_m, 7.4, 1.6, 4.9); PT.box.push(_m, dk2, em);
  child(_m, _torso, 0, 13.5, 0.4, 0, 0, 0); scaled(_m, 2.6, 4.5, 2.6); PT.rod.push(_m, skin, em);
  const K = KIT_WEAR[e.type] || {};
  if (K.coat) { child(_m, _base, 0, 4 - K.coat * 2, 0, lean * 0.3, 0, 0); scaled(_m, 12 + 2 * K.coat, 26 + 3 * K.coat, 8.6); PT.cone.push(_m, mixc(dark, body, 0.3), em); }
  if (K.vest) { child(_m, _torso, 0, 8, 0.15, 0, 0, 0); scaled(_m, 9.4, 10.5, 6.3); PT.box.push(_m, mixc(hexK('#5e4632'), body, 0.3), em); }
  if (K.pack) { child(_m, _torso, 0, 8.5, -3.9, -0.08, 0, 0); scaled(_m, 7.4, 9.5, 3.6); PT.box.push(_m, hexK('#5a4a36'), em); }
  if (K.charges) for (const x of [-2.6, 0, 2.6]) { child(_m, _torso, x, 8.5, 3.3, 0, 0, 0); scaled(_m, 2, 3.6, 1.6); PT.box.push(_m, hexK('#a8352a'), em + (Math.sin(now * 12) > 0.6 ? 0.8 : 0)); }
  if (hk === 'helmet') { child(_m, hm, 0, 1.4, 0, -0.1, 0, 0); scaled(_m, 10.4, 1.2, 10.6); PT.ball.push(_m, rgb([90, 92, 86]), em); }
  if (hk === 'goggles') { child(_m, hm, 0, 0.9, 0, 0, 0, 0); scaled(_m, 7.4, 1, 7.6); PT.ball.push(_m, [0.14, 0.13, 0.12], em); }
  // what it carries
  if (e.type === 'spear') { child(_m, armRm, 0, -15, 0, 1.45, 0, 0); _m.multiply(_t.makeTranslation(0, -14, 0)); scaled(_m, 1.3, 40, 1.3); PT.rod.push(_m, hexK('#6e5235'), 0); child(_m, armRm, 0, -15, 0, 1.45, 0, 0); _m.multiply(_t.makeTranslation(0, 26, 0)); scaled(_m, 2.6, 6, 1); PT.cone.push(_m, hexK('#9a9a92'), 0); }
  else if (e.type === 'archer') { const am = child(new M4(), _torso, -5.4, 12.2, 0, armL, 0, -armZ), h = new V3(0, -15, 0).applyMatrix4(am); between(PT.rod, h.x, h.y - 10 * sc, h.z, h.x, h.y + 10 * sc, h.z, 0.7 * sc, hexK('#6b4a2e')); }
  else if (e.type === 'bomber') { child(_m, _torso, 0, 8, -4, 0.3, 0, 0); scaled(_m, 3, 18, 3); PT.rod.push(_m, hexK('#6a6a64'), 0); }
  else if (e.type === 'woodcutter') {   // his felling axe: a long haft and a broad iron head, with a hatchet at his belt to throw
    const sk = s ? (s.ph === 'strike' ? Math.min(1, s.t / s.T) : s.ph === 'rec' ? (s.stuck ? Math.min(1, (1 - s.t / s.T) * 5) : 1 - Math.min(1, s.t / s.T)) : 0) : 0, axR = 1.25 + 1.0 * sk;   // the blade swings through and buries itself
    child(_m, armRm, 0, -15, 0, axR, 0, 0); _m.multiply(_t.makeTranslation(0, 4, 0)); scaled(_m, 1.6, 30, 1.6); PT.rod.push(_m, hexK('#6e5235'), 0);
    child(_m, armRm, 0, -15, 0, axR, 0, 0); _m.multiply(_t.makeTranslation(0, 17, 2.4)); scaled(_m, 1.3, 6.5, 7); PT.box.push(_m, hexK('#9fa4a8'), 0.1);
    child(_m, armRm, 0, -15, 0, axR, 0, 0); _m.multiply(_t.makeTranslation(0, 17, 6)); scaled(_m, 0.7, 8, 1.4); PT.box.push(_m, hexK('#d8dcdf'), 0.2);
    if (!e.hatch && !(e.bpose > 1)) { child(_m, _torso, 4.6, 2, 3.6, 0, 0, 0.3); scaled(_m, 1, 8, 1); PT.rod.push(_m, hexK('#6e5235'), 0); child(_m, _torso, 4.6, 5.5, 4.8, 0, 0, 0.3); scaled(_m, 1, 3, 3.4); PT.box.push(_m, hexK('#b8bcc0'), 0); }   // the hatchet at his belt
  }
  else if (e.type === 'brute' || e.type === 'tall') { child(_m, armRm, 0, -15, 0, 1.1, 0, 0); scaled(_m, 2.2, 16, 2.2); PT.rod.push(_m, hexK('#4f3a28'), 0); child(_m, armRm, 0, -15, 0, 1.1, 0, 0); _m.multiply(_t.makeTranslation(0, 15, 0)); scaled(_m, 4.4, 5, 4.4); PT.ball.push(_m, hexK('#5a4430'), 0); }
}
const arr3 = v => [v.x, v.y, v.z];

// ---------------- animals ----------------
const BCOL = {   // colour, belly, back (from the 2D game's beast art)
  deer: ['#a8693f', '#eadcc6', '#6a4329'], rabbit: ['#93745a', '#f2eadf', '#664f3c'], boar: ['#8c6d56', '#c9b39b', '#5a4536'], wolf: ['#a8a397', '#e2dccd', '#6c675f'], bear: ['#8a6448', '#c7a98c', '#553b2a'],
};
const BDIM = {   // body length, shoulder height, hip height, body width, leg width, neck forward, neck up, head size, muzzle
  deer: [25, 21, 20, 8.5, 2.2, 5, 12, 3.2, 4.6], rabbit: [9, 6.5, 7.5, 5.8, 1.8, 1, 2.5, 2.5, 1.6], boar: [22, 14.5, 12.5, 10.5, 3, 2, 0, 4.3, 5.4],
  wolf: [23, 16, 15, 7.6, 2.3, 4, 4.5, 3.3, 5.2], bear: [32, 23, 20, 15, 5, 3, 2.5, 5.4, 4.4],
};
// Each animal is a proper four-legged body: a deep chest, a waist, haunches; legs in three parts that bend the way real ones do
// (a front leg's elbow back, a hind leg's stifle forward and hock back), with each foot planted on the ground and lifted in an
// arc in time with a real gait: a four-beat walk, a trot on the diagonals, a gallop, a rabbit's hop. Worked out in the animal's
// own frame (x across, y up, z forward) and turned into the woods by one matrix, so it can roll over dead or rear up as one.
const ANAT = {   // shoulder & hip height, body length, width, chest depth, waist tuck, leg thickness, neck length & rise, head length & size,
                 // muzzle length & thickness, ear length, tail; speeds at which it trots and gallops
  deer:   { sh: 22, hp: 22.5, len: 26, bw: 8.4, dp: 10.5, tuck: 0.78, lr: 1.2, nk: 13, nA: 1.0, hl: 4.4, hs: 3.1, mzl: 4.4, mzr: 1.5, ear: 5.4, earW: 2.1, tail: 'flag', trot: 55, gal: 120, nod: 1 },
  rabbit: { sh: 6.5, hp: 8.2, len: 9.5, bw: 6.2, dp: 6.2, tuck: 0.97, lr: 0.7, nk: 2.2, nA: 0.7, hl: 2.6, hs: 2.9, mzl: 1.5, mzr: 1.35, ear: 7.2, earW: 1.9, tail: 'puff', trot: 999, gal: 999, hop: 1 },
  boar:   { sh: 17, hp: 15.5, len: 23, bw: 9.5, dp: 10.5, tuck: 0.92, lr: 1.25, nk: 4.5, nA: 0.05, hl: 5.5, hs: 4.3, mzl: 5.6, mzr: 2.1, ear: 3, earW: 2.2, tail: 'thin', trot: 60, gal: 125, mane: 1 },
  wolf:   { sh: 17, hp: 16, len: 24, bw: 7.2, dp: 9.5, tuck: 0.66, lr: 1.3, nk: 5.5, nA: 0.3, hl: 4.4, hs: 3.4, mzl: 5.8, mzr: 1.35, ear: 3.6, earW: 2.2, tail: 'bush', trot: 60, gal: 135 },
  bear:   { sh: 24, hp: 21.5, len: 31, bw: 14, dp: 13.5, tuck: 0.95, lr: 3.1, nk: 6, nA: 0.25, hl: 6, hs: 6.2, mzl: 4.8, mzr: 2.6, ear: 2.4, earW: 2.6, tail: 'stub', trot: 999, gal: 90, hump: 1, paw: 1 },
};
const GAIT = {   // when each foot (left fore, right fore, left hind, right hind) leaves off in the cycle, and how long it's on the ground
  walk: { o: [0.25, 0.75, 0, 0.5], duty: 0.66, stride: 0.6, lift: 0.16, bob: 0.03 },
  trot: { o: [0, 0.5, 0.5, 0], duty: 0.48, stride: 0.95, lift: 0.22, bob: 0.05 },
  gallop: { o: [0.5, 0.6, 0, 0.1], duty: 0.36, stride: 1.75, lift: 0.3, bob: 0.08 },
  hop: { o: [0.45, 0.5, 0, 0.03], duty: 0.38, stride: 1.4, lift: 0.5, bob: 0.25 },
};
// a little shade low down and underneath, as if the body's own bulk kept the light off (AO_H: its height at the shoulder)
let AO_H = 20; const _aoC = [0, 0, 0];
const aoc = (c, y) => { const k = 0.74 + 0.26 * clamp(y / AO_H, 0, 1); _aoC[0] = c[0] * k; _aoC[1] = c[1] * k; _aoC[2] = c[2] * k; return _aoC; };
const _B = new M4(), _L = new M4(), _aM = new M4(), _X = new V3(), _Y = new V3(), _Z = new V3(), _UP = new V3(0, 1, 0), _aQ = new THREE.Quaternion(), _aV = new V3(), _aS = new V3();
// an oval from a to b (local points [x, y, z]), w wide and h deep across that line
function bOval(part, a, b, w, h, col, em, ext = 1) {
  _Z.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = _Z.length() || 0.001; _Z.divideScalar(L);
  _X.crossVectors(_UP, _Z); if (_X.lengthSq() < 1e-6) _X.set(1, 0, 0); _X.normalize(); _Y.crossVectors(_Z, _X);
  _L.makeBasis(_X.multiplyScalar(w), _Y.multiplyScalar(h), _Z.multiplyScalar(L * ext)); _L.setPosition((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  part.push(_aM.multiplyMatrices(_B, _L), aoc(col, (a[1] + b[1]) / 2), em);
}
// a ball at p, w × h × l, turned by pitch and yaw in the animal's frame
function bBall(part, p, w, h, l, pitch, yaw, col, em) { _L.compose(_aV.set(p[0], p[1], p[2]), _aQ.setFromEuler(_e.set(pitch, yaw, 0, 'YXZ')), _aS.set(w, h, l)); part.push(_aM.multiplyMatrices(_B, _L), aoc(col, p[1] + h * 0.3), em); }
// a limb (rounded) or a cone from a toward b
function bSeg(part, a, b, r, col, em, r2) {
  _aV.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = _aV.length() || 0.001; _aV.divideScalar(L);
  _aQ.setFromUnitVectors(part.geoDown ? _u.set(0, -1, 0) : _u.set(0, 1, 0), _aV);
  _L.compose(_aS.set(a[0], a[1], a[2]), _aQ, _p.set(r * 2, L, (r2 ?? r) * 2)); part.push(_aM.multiplyMatrices(_B, _L), aoc(col, (a[1] + b[1]) / 2), em);
}
const v3 = (x, y, z) => [x, y, z], addv = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k], lerpv = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
// two bones from root to end, lengths l1 and l2, the joint bending toward +z (fwd 1) or -z (fwd -1) in the leg's own up-forward plane
function ik2(root, end, l1, l2, fwd) {
  const dy = end[1] - root[1], dz = end[2] - root[2], d0 = Math.hypot(dy, dz) || 0.001, d = Math.min(d0, (l1 + l2) * 0.999), uy = dy / d0, uz = dz / d0;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  // perpendicular in the y-z plane, pointing forward (+z) when fwd is 1
  let py = -uz, pz = uy; if (pz * fwd < 0 || (Math.abs(pz) < 1e-4 && fwd < 0)) { py = -py; pz = -pz; }
  return [lerp(root[0], end[0], a / d), root[1] + uy * a + py * h, root[2] + uz * a + pz * h];
}
const _sm = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
function poseBeast(o, now, dt) {
  const A = ANAT[o.k], C = BCOL[o.k]; if (!A) return;
  const fl = o.flash > 0 ? o.flash : 0, em = fl * 0.7, tint = c => fl ? c.map(v => lerp(v, 1.5, fl)) : c;
  const col = tint(hexK(C[0])), belly = tint(hexK(C[1])), back = tint(hexK(C[2])), hoof = hexK('#1e1814'), dark = hexK('#120f0d');
  // lighter belly and muzzle, darker lower legs and feet, a pale tip to the nose, pink inside the ears
  const legC = col, legLo = mixc(col, back, 0.6).map(v => v * 0.88), joint = mixc(col, legLo, 0.6), pale = mixc(belly, col, 0.15), pink = hexK('#d39a92'), shine = [1, 1, 1];
  AO_H = A.sh;
  // how it's moving: speed from where it actually went, facing turned smoothly toward that
  const gdt = Math.max(dt, 1e-4), mdx = o.x - (o.fgx ?? o.x), mdy = o.y - (o.fgy ?? o.y); o.fgx = o.x; o.fgy = o.y;
  const v0 = Math.hypot(mdx, mdy) / gdt; o.fgv = (o.fgv || 0) + (Math.min(v0, 400) - (o.fgv || 0)) * Math.min(1, gdt * 8); if (v0 > 4) o.fgHead = Math.atan2(mdy, mdx);
  const v = o.fgv, still = v < 5, want = !still && o.fgHead !== undefined ? o.fgHead : o.dir ?? o.fgFace ?? 0;
  const turn = o.fgFace === undefined ? 0 : clamp(angDiff(want, o.fgFace), -6 * gdt, 6 * gdt);
  o.fgFace = o.fgFace === undefined ? want : o.fgFace + turn; o.fgTurn = lerp(o.fgTurn || 0, turn / gdt, Math.min(1, gdt * 6));
  const st = o.dead ? 'dead' : o.st, angry = st === 'hunt' || st === 'charge' || st === 'back' || st === 'wind' || st === 'snap';
  // the gait it's in, and how far through its cycle each foot is
  const G = A.hop ? GAIT.hop : v > A.gal ? GAIT.gallop : v > A.trot ? GAIT.trot : GAIT.walk;
  if (o.fgG !== G) { o.fgG = G; }
  const S = Math.min(A.len * G.stride * (A.hop ? 1 : clamp(0.55 + v / (A.gal * 1.6), 0.6, 1.25)), A.sh * (A.hop ? 1.6 : 1.05)), gk = still ? 0 : _sm(5, 25, v);
  o.fgPh = ((o.fgPh ?? (o.seed || 0) * 3.7) + gdt * (still ? 0 : v * G.duty / S)) % 1;
  o.fgGk = lerp(o.fgGk || 0, gk, Math.min(1, gdt * 8)); const mk = o.fgGk;   // eased in and out, so starting and stopping don't snap
  const ph = o.fgPh, seed = (o.fgSeed ?? (o.fgSeed = Math.random() * 50));
  // its body: position and turn in the woods, rearing (a bear stands up to strike), lying on its side when dead
  const rear = o.k === 'bear' && st === 'wind' ? clamp((0.6 - (o.t || 0)) / 0.25 + 0.2, 0, 1) : 0, dead = o.dead ? 1 : 0;
  const bobW = A.hop ? Math.max(0, Math.sin(ph * Math.PI * 2 - 0.6)) * A.hp * 0.55 * mk : (G === GAIT.gallop ? Math.sin(ph * 6.283 + 1) : Math.cos(ph * 12.566)) * A.sh * G.bob * mk;
  const lean = clamp(-o.fgTurn * 0.04 * mk, -0.25, 0.25);   // leaning into a turn
  _B.compose(_aV.set(o.x, 0, o.y), _aQ.setFromEuler(_e.set(0, faceYaw(o.fgFace), lean + dead * 1.5, 'YXZ')), _aS.set(1, 1, 1));
  if (dead) _B.multiply(_t.makeTranslation(A.bw * 0.45, -A.sh * 0.12, 0));   // on its side, resting on its flank
  // pivoting up on its hind legs
  if (rear) { const hz = -A.len * 0.34; _B.multiply(_t.makeTranslation(0, 0, hz)).multiply(_t2.makeRotationX(-rear * 1.05)).multiply(_t.makeTranslation(0, 0, -hz)); }
  const breathe = Math.sin(now * (angry ? 5 : 1.6) + seed) * (angry ? 0.035 : 0.02);
  // the spine: withers over the front legs, the croup over the hind; galloping, it flexes and stretches
  const flex = G === GAIT.gallop || A.hop ? Math.sin(ph * 6.283 + 0.4) * 0.08 * mk : 0;
  const crouchK = o.k === 'wolf' && (st === 'hunt' || st === 'wind') ? 0.12 : 0;   // a wolf stalking you goes low
  const shY = A.sh * (1 - crouchK) + bobW + (G === GAIT.gallop ? Math.sin(ph * 6.283 + 2.2) * A.sh * 0.04 * mk : 0), hpY = A.hp * (1 - crouchK * 0.6) + bobW + (G === GAIT.gallop ? Math.sin(ph * 6.283 - 0.5) * A.sh * 0.04 * mk : 0);
  const fz = A.len * (0.33 + flex), hz = -A.len * (0.34 + flex);
  const wither = v3(0, shY, fz), croup = v3(0, hpY, hz);
  const chest = v3(0, shY - A.dp * 0.5, fz - A.len * 0.04), haunch = v3(0, hpY - A.dp * 0.45, hz + A.len * 0.03);
  const mid = lerpv(chest, haunch, 0.5); mid[1] += A.dp * (1 - A.tuck) * 0.4;
  // the trunk: one long rounded barrel, a deep chest and round haunches overlapping it, a smooth topline over them all,
  // and a pale band along the belly
  const bw = A.bw * (1 + breathe);
  bOval(PT.aBall, addv(haunch, v3(0, A.dp * 0.05, -A.len * 0.1)), addv(chest, v3(0, A.dp * 0.05, A.len * 0.1)), bw * (0.62 + A.tuck * 0.3), A.dp * (0.55 + A.tuck * 0.3), col, em, 1.05);
  bOval(PT.aBall, addv(chest, v3(0, 0, -A.len * 0.17)), addv(chest, v3(0, A.dp * 0.04, A.len * 0.19)), bw, A.dp * (1 + breathe), col, em, 1.1);
  bOval(PT.aBall, addv(haunch, v3(0, A.dp * 0.03, A.len * 0.15)), addv(haunch, v3(0, -A.dp * 0.02, -A.len * 0.17)), bw * 0.97, A.dp * 0.96, col, em, 1.12);
  bOval(PT.aBall, addv(croup, v3(0, -A.dp * 0.26, -A.len * 0.04)), addv(wither, v3(0, -A.dp * 0.24, A.len * 0.02)), bw * 0.74, A.dp * 0.5, col, em, 1.08);
  bOval(PT.aBall, addv(lerpv(chest, haunch, 0.15), v3(0, -A.dp * 0.3, 0)), addv(lerpv(chest, haunch, 0.8), v3(0, -A.dp * (0.12 + (1 - A.tuck) * 0.6), 0)), bw * 0.74, A.dp * 0.46, belly, em + 0.22, 1.1);   // lit a little from below, as the ground would
  if (A.hump) bOval(PT.aBall, addv(wither, v3(0, -A.dp * 0.3, -A.len * 0.2)), addv(wither, v3(0, -A.dp * 0.28, A.len * 0.1)), bw * 0.82, A.dp * 0.6, col, em, 1.1);
  // the legs
  const legs = [[1, 1, 0], [1, -1, 1], [-1, 1, 2], [-1, -1, 3]];   // front or hind, which side, gait slot
  for (const [fh, sd, gi] of legs) {
    const front = fh > 0, root = front ? v3(sd * bw * 0.33, shY - A.dp * 0.32, fz + A.len * 0.02) : v3(sd * bw * 0.36, hpY - A.dp * 0.3, hz - A.len * 0.02);
    const H = root[1], l1 = H * (front ? 0.42 : 0.4), l2 = H * (front ? 0.36 : 0.38), l3 = H * (A.paw ? 0.14 : A.hop && !front ? 0.34 : 0.26);
    let foot;
    if (dead) foot = addv(root, v3(sd * 1, -(l1 + l2 + l3) * 0.98, front ? 3 : -2));
    else if (rear && front) foot = addv(root, v3(sd * 1.5, -l1 * 0.6, l1 * 0.9 + Math.sin(now * 9) * 1.5));
    else {
      const u = ((ph - G.o[gi]) % 1 + 1) % 1, d = G.duty;
      let fz2, fy;
      if (u < d) { fz2 = S * (0.5 - u / d); fy = 0; }
      else { const t = (u - d) / (1 - d), e = t * t * (3 - 2 * t); fz2 = S * (-0.5 + e); fy = Math.sin(t * Math.PI) * H * G.lift * (t < 0.5 ? 1.2 : 0.8); }
      foot = v3(root[0], fy * mk, root[2] + (fz2 * mk) + (front ? 0.5 : -0.5));
      if (A.hop && !front) foot[2] -= 1.5;
    }
    // the lowest bone: a hoof's cannon nearly upright, a hind one slanted back to the hock; tucked up under it in the swing
    const swingK = foot[1] > 0.3 && !dead ? clamp(foot[1] / (H * G.lift + 0.01), 0, 1) : 0;
    const tilt = front ? -0.05 - swingK * 1.25 : (A.hop ? 0.9 : A.paw ? 0.15 : 0.32) + swingK * 0.5;
    const ank = addv(foot, v3(0, Math.cos(tilt) * l3, -Math.sin(tilt) * l3 * (front ? -1 : 1)));
    const knee = ik2(root, ank, l1, l2, front ? -1 : 1);
    const r = A.lr * (front ? 1 : 1.08);
    // the top of the leg is muscle (the shoulder, the thigh), then thinner bone down to the foot
    // a big rounded shoulder or thigh blending up into the body, a tapering upper leg in the body's colour, a soft joint, then
    // the darker slim lower leg down to a clear dark hoof or paw
    const big = A.hop && !front ? 1.45 : 1;
    bOval(PT.aBall, addv(root, v3(0, l1 * 0.4, front ? 0.3 : -0.3)), lerpv(root, knee, 0.78), r * (front ? 2.6 : 3.3) * big, r * (front ? 3.2 : 4.2) * big, col, em, 1.08);
    bSeg(PT.aLimb, lerpv(root, knee, 0.4), knee, r * 1.12, legC, em);
    bBall(PT.aBall, knee, r * 1.75, r * 1.75, r * 1.75, 0, 0, joint, em);
    bSeg(PT.aLimb, knee, ank, r * 0.92, legLo, em);
    bBall(PT.aBall, ank, r * 1.55, r * 1.55, r * 1.55, 0, 0, legLo, em);
    bSeg(PT.aLimb, ank, foot, r * 0.78, legLo, em);
    if (A.paw || o.k === 'wolf' || o.k === 'rabbit') bBall(PT.aBall, addv(foot, v3(0, r * 0.45, r * 0.8)), r * 2.1, r * 1.15, r * (A.hop && !front ? 5 : 2.7), 0, 0, o.k === 'rabbit' ? mixc(col, belly, 0.3) : hoof, em);
    else bBall(PT.aBall, addv(foot, v3(0, r * 0.5, r * 0.35)), r * 1.95, r * 1.35, r * 2.2, 0.15, 0, hoof, em);   // a hoof: a rounded wedge, darker than the leg
  }
  // neck and head: grazing, it goes right down to the ground; alert, it's up and turning to look; hunting, low and out
  const grazeK = !angry && still && st === 'graze' && o.k !== 'bear' ? _sm(0.2, 0.7, Math.sin(now * 0.45 + seed) * 0.5 + 0.5) : 0;
  o.fgGr = lerp(o.fgGr || 0, grazeK, Math.min(1, gdt * 3)); const gr = dead ? 0 : o.fgGr;
  const look = still && !angry ? Math.sin(now * 0.7 + seed * 2) * 0.6 * (1 - gr) : 0, nod = A.nod && !still ? Math.sin(ph * 12.566) * 0.08 * mk : 0;
  const nA = dead ? -0.25 : lerp(A.nA * (angry ? (o.k === 'deer' ? 1 : 0.2) : 1) - (G === GAIT.gallop ? 0.25 : 0) + nod, -1.05, gr);
  const nb = addv(wither, v3(0, -A.dp * 0.18, A.len * 0.08));
  const nDir = v3(Math.sin(look) * Math.cos(nA), Math.sin(nA), Math.cos(look) * Math.cos(nA)), nLen = A.nk * (gr > 0 ? 1 + gr * 0.5 : 1);
  const ne = addv(nb, nDir, nLen + A.hs * 0.3);
  // the neck tapers from the shoulders up into the head, with a soft join where it meets the jaw
  if (A.nk > 3) { const nm = addv(nb, nDir, nLen * 0.45); bOval(PT.aBall, addv(nb, nDir, -A.dp * 0.2), nm, A.bw * 0.62, A.dp * 0.62, col, em, 1.15); bOval(PT.aBall, nm, ne, A.bw * 0.44, A.dp * 0.46 * (o.k === 'deer' ? 0.85 : 1), col, em, 1.2); }
  else bOval(PT.aBall, addv(nb, nDir, -A.dp * 0.1), ne, A.bw * 0.6, A.dp * 0.6, col, em, 1.1);
  // the head tips down along the muzzle; the jaw drops open when it bites
  const hp = dead ? 0.25 : lerp(o.k === 'deer' ? 0.55 : 0.35, 1.25, gr) - (angry && o.k === 'wolf' ? 0.15 : 0) + nod * 0.5;
  const hDir = v3(Math.sin(look) * Math.cos(hp), -Math.sin(hp), Math.cos(look) * Math.cos(hp));
  const skull = addv(ne, hDir, A.hs * 0.2), snout = addv(skull, hDir, A.hl * 0.45 + A.mzl * 0.55), tip = addv(skull, hDir, A.hl * 0.45 + A.mzl);
  bOval(PT.aBall, addv(skull, hDir, -A.hs * 0.55), addv(skull, hDir, A.hs * 0.6), A.hs * 1.15, A.hs * 1.05, col, em);
  bOval(PT.aBall, addv(ne, hDir, -A.hs * 0.2), addv(skull, hDir, A.hs * 0.1), A.hs * 1.05, A.hs * 1.15, col, em);   // the jowl, where the neck meets the head
  bOval(PT.aBall, addv(skull, hDir, A.hs * 0.2), tip, A.mzr * 2, A.mzr * 2.1, col, em, 1.05);
  bOval(PT.aBall, addv(snout, hDir, -A.mzl * 0.1), addv(tip, hDir, A.mzr * 0.15), A.mzr * 1.85, A.mzr * 1.8, pale, em + 0.12, 1.05);   // a paler muzzle
  bBall(PT.aBall, addv(addv(tip, hDir, A.mzr * 0.1), v3(0, A.mzr * 0.4, 0)), A.mzr * (o.k === 'boar' ? 1.5 : 0.95), A.mzr * (o.k === 'boar' ? 1.2 : 0.7), A.mzr * 0.6, hp, look, o.k === 'boar' ? hexK('#5e3f36') : dark, 0);   // nose
  const bite = (o.bite || 0) > 0 && st === 'snap' ? 1 : st === 'snap' || st === 'charge' && o.k === 'wolf' ? 0.6 : 0;
  if (o.k === 'wolf' || o.k === 'bear' || o.k === 'boar') {
    const jDir = v3(hDir[0], hDir[1] - 0.5 * bite - 0.1, hDir[2]), jb = addv(skull, v3(0, -A.hs * 0.35, 0));
    bOval(PT.aBall, addv(jb, jDir, A.hs * 0.1), addv(jb, jDir, A.hl * 0.4 + A.mzl * 0.8), A.mzr * 1.7, A.mzr * 0.9, mixc(col, belly, 0.4), em);
  }
  // eyes, and at night the animals that might hunt you catch your torch
  const side = v3(Math.cos(look), 0, -Math.sin(look));
  for (const s of [-1, 1]) {
    const ep = addv(skull, hDir, A.hs * 0.35), e2 = addv(addv(ep, side, s * A.hs * 0.52), v3(0, A.hs * 0.3, 0));
    const er = A.hs * (A.hop ? 0.46 : 0.36);
    bBall(PT.aBall, e2, er, er, er * 0.8, 0, look, dark, 0);
    bBall(PT.aBall, addv(addv(addv(e2, side, s * er * 0.32), v3(0, er * 0.22, 0)), hDir, er * 0.12), er * 0.3, er * 0.3, er * 0.24, 0, look, shine, 0.5);   // the glint that makes it look alive
    if (dayLight() < 0.6 && (o.k === 'wolf' || o.k === 'boar' || o.k === 'bear')) { _aV.set(e2[0], e2[1], e2[2]).applyMatrix4(_B); stat(_aV.x, _aV.y, _aV.z, 1.6, 0.85, 0.79, 0.54, 0.8 * (1 - dayLight()), 0); }
  }
  // ears: they turn about and flick; laid back flat when it means you harm
  const flick = Math.max(0, Math.sin(now * 0.9 + seed * 3) - 0.94) * 12;
  for (const s of [-1, 1]) {
    const eb = addv(addv(skull, side, s * A.hs * 0.42), v3(0, A.hs * 0.42, 0), 1), back2 = angry && o.k !== 'deer' ? 1 : 0;
    const ed = A.hop ? v3(s * 0.15, 0.9 - gr * 0.3, -0.4 - mk * 0.5) : o.k === 'deer' ? v3(s * 0.4, 0.95 + flick * 0.05 * s, -0.25 - (angry ? 0.5 : 0)) : o.k === 'boar' ? v3(s * 0.6, 0.35, 0.55) : v3(s * 0.25, 1 - back2 * 0.6, -0.15 - back2 * 0.8);
    const L = Math.hypot(...ed), et = addv(eb, ed, A.ear / L);
    if (A.hop || o.k === 'deer') { bOval(PT.aBall, eb, et, A.earW, A.earW * 0.48, col, em, 1.1); bOval(PT.aBall, addv(addv(eb, hDir, A.earW * 0.2), ed, A.ear * 0.12 / L), addv(addv(et, hDir, A.earW * 0.2), ed, -A.ear * 0.08 / L), A.earW * 0.62, A.earW * 0.22, pink, em, 1); }
    else bSeg(PT.aCone, eb, et, A.earW * 0.5, o.k === 'wolf' ? back : col, em, A.earW * 0.25);
  }
  // a mane: short dark triangles along the top of the neck and over the shoulders
  if (A.mane) {
    const mc = o.k === 'wolf' ? mixc(back, dark, 0.3) : mixc(back, dark, 0.45), n = A.mane ? 7 : 4, sz = A.mane ? 1 : 0.7;
    for (let i = 0; i < n; i++) { const f = i / (n - 1), p = lerpv(addv(ne, v3(0, A.hs * 0.55, -A.hs * 0.3)), addv(wither, v3(0, -A.dp * 0.02, -A.len * 0.06)), f), up2 = (3.4 - f * 1.1) * sz;
      bSeg(PT.aCone, p, addv(p, v3(0, up2, -up2 * 0.45)), 0.38 * sz, mc, em, 1.7 * sz); }
  }
  // antlers on a stag; tusks on a boar
  if (o.k === 'deer' && !o.doe) for (const s of [-1, 1]) {
    const bone = hexK('#d9c6a6'), a = addv(addv(skull, side, s * A.hs * 0.3), v3(0, A.hs * 0.55, 0)), b = addv(a, v3(s * 2.6, 4.5, -1.5)), c = addv(b, v3(s * 1.6, 4, -2.2)), d = addv(c, v3(s * 0.4, 3, 0.8));
    bSeg(PT.aRod, a, b, 0.42, bone, 0); bSeg(PT.aRod, b, c, 0.36, bone, 0); bSeg(PT.aRod, c, d, 0.3, bone, 0);
    bSeg(PT.aRod, b, addv(b, v3(s * 0.4, 2.6, 2.4)), 0.3, bone, 0); bSeg(PT.aRod, c, addv(c, v3(s * 1.4, 2.2, 1.6)), 0.26, bone, 0);
  } else if (o.k === 'boar') for (const s of [-1, 1]) { const a = addv(addv(snout, side, s * A.mzr * 0.9), v3(0, -A.mzr * 0.4, 0)); bSeg(PT.aCone, a, addv(a, v3(s * 0.8, 2.6, -0.4)), 0.5, hexK('#e6dfcc'), 0, 0.5); }
  // the tail
  const swish = Math.sin(now * (angry ? 9 : 2.2) + seed) * (angry ? 0.3 : 0.15), tb = addv(croup, v3(0, -A.dp * 0.1, -A.len * 0.08));
  if (A.tail === 'bush') {   // a wolf's: hanging low as it walks, straight out at a run, raised when it means you harm
    const up = angry ? 0.25 : G === GAIT.gallop ? -0.15 : -0.85 + 0.1 * Math.sin(now * 1.5 + seed), t1 = addv(tb, v3(Math.sin(swish) * 3, Math.sin(up) * 5.5, -Math.cos(up) * 5.5)), t2 = addv(t1, v3(Math.sin(swish) * 4, Math.sin(up - 0.3) * 6, -Math.cos(up - 0.3) * 6));
    bOval(PT.aBall, tb, t1, 2.4, 2.4, col, em, 1.2); bOval(PT.aBall, t1, t2, 2.9, 2.9, back, em, 1.15); bBall(PT.aBall, t2, 1.8, 1.8, 2.4, 0, 0, dark, em);
  } else if (A.tail === 'flag') { const up = st === 'flee' ? 1.1 : 0.15; const t1 = addv(tb, v3(Math.sin(swish) * 1.5, Math.sin(up) * 3.6, -Math.cos(up) * 3.6)); bOval(PT.aBall, tb, t1, 2.6, 1.5, st === 'flee' ? belly : col, em, 1.2); if (st === 'flee') bOval(PT.aBall, addv(tb, v3(0, 0, 0.6)), t1, 2.1, 1.2, hexK('#f1ece2'), em, 0.9); }
  else if (A.tail === 'puff') bBall(PT.aBall, addv(tb, v3(0, 0.9, -1.2)), 3.4, 3.2, 3, 0, 0, hexK('#f2ede4'), em);
  else if (A.tail === 'thin') { const t1 = addv(tb, v3(Math.sin(swish * 3) * 2, -3.5, -2)); bSeg(PT.aLimb, tb, t1, 0.5, back, em); bBall(PT.aBall, t1, 1.2, 1.8, 1.2, 0, 0, dark, em); }
  else bBall(PT.aBall, addv(tb, v3(0, 0, -0.6)), 3, 2.4, 2.4, 0, 0, back, em);
  if (o.tame) { _aV.set(0, shY + 3, fz).applyMatrix4(_B); stat(_aV.x, _aV.y + 3, _aV.z, 2.4, 1, 0.85, 0.55, 0.6, 0); }   // the one you tamed: a warm mark over its shoulders
}
function drawFigures(now, dt) {
  const rg = S.rg, D = S.day, p = S.p;
  for (const e of rg.enemies) if (!e.dead && Math.abs(e.x - p.x) < drawR() && Math.abs(e.y - p.y) < drawR() && e.type !== 'centi') poseFoe(e, now, dt, false);
  for (const g of rg.dying) if (g.type !== 'centi') poseFoe(g, now, dt, true);
  bossFigs(now);
  if (outsideP() && state === 'play') posePlayer(now);
  for (const o of D.beasts) if (Math.abs(o.x - p.x) < drawR() && Math.abs(o.y - p.y) < drawR()) poseBeast(o, now, dt);
}
function figuresEnd() { for (const k in PT) PT[k].done(); }
