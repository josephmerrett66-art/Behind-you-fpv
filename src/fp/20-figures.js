// ================= figures: the raiders and the animals, built of rounded limbs with the game's dark outline =================
// Each is posed fresh every frame from what the main game says it is doing (walking, winding up a blow, striking, writhing
// in your light, grazing, fleeing, charging), and drawn as a handful of instanced shapes.
const MAXF = 160;
const figMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU),
  vertexShader: `attribute vec4 iCol; varying vec4 vC; varying vec3 vW, vN;
    void main() { vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vC = iCol; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `varying vec4 vC; varying vec3 vW, vN;
    void main() { vec3 c = vC.rgb * lightAt(vW, normalize(vN), 1.0) * 1.05 + vC.rgb * vC.a; gl_FragColor = vec4(fogged(grey(c), vW), 1.0); }`,
});
const figEdge = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU), side: THREE.BackSide,
  vertexShader: `attribute vec4 iCol; varying vec3 vW; varying float vE;
    void main() { vec3 n = normalize(mat3(instanceMatrix) * normal); vec4 w = modelMatrix * (instanceMatrix * vec4(position, 1.0) + vec4(n * 0.7, 0.0)); vW = w.xyz; vE = iCol.a; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `varying vec3 vW; varying float vE;
    void main() { vec3 L = lightAt(vW, vec3(0.0), 0.0); float b = clamp(dot(L, vec3(0.34)) * 2.2 + vE * 0.6, 0.0, 1.0); gl_FragColor = vec4(fogged(vec3(0.15, 0.15, 0.14) * b, vW), 1.0); }`,
});
class Part {
  constructor(geo, cap = MAXF, edge = true) {
    this.cap = cap;
    this.col = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); this.col.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iCol', this.col);
    this.mesh = new THREE.InstancedMesh(geo, figMat, cap); this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0; scene.add(this.mesh);
    if (edge) { this.edge = new THREE.InstancedMesh(geo, figEdge, cap); this.edge.instanceMatrix = this.mesh.instanceMatrix; this.edge.frustumCulled = false; this.edge.count = 0; scene.add(this.edge); }
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
  ball: new Part(ballG, 900), limb: new Part(limbG, 900), rod: new Part(rodG, 500), box: new Part(boxG, 300), cone: new Part(coneG, 200) };
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
const KIT_HEAD = { shade: 'hood', stalker: 'goggles', brute: 'helmet', tall: 'hood', bomber: 'helmet', laser: 'visor', kamikaze: 'goggles', splitter: 'hood', spear: 'helmet', archer: 'hood' };
function poseFoe(e, now, dt, dying) {
  const F = FOES[e.type], sc = foeScale(e), tint = COLOUR ? (FOE_TINT[e.type] || [200, 200, 195]) : [200, 200, 195];
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
  const cl = (c, a) => c.map((v, i) => v + (tint[i] - v) * a);
  const hot = (c, k, h) => rgb(c.map((v, i) => lerp(v, h[i], k)));
  // a blow: it flares white, squashes and springs back, rocks away from you and shudders
  const hkT = !dying && e.kHitT !== undefined ? S.t - e.kHitT : 9, rock = hkT < 0.4 ? Math.exp(-9 * hkT) : 0;
  const sq = hkT < 0.4 ? 0.22 * Math.exp(-10 * hkT) * Math.cos(26 * hkT) : 0;
  const fl = Math.max(e.flash || 0, hkT < 0.14 ? 1 - hkT / 0.14 : 0, dying ? Math.max(0, 1 - e.t / 0.1) : 0);
  let body = hot(cl([218, 218, 211], 0.45), b, [255, 150, 60]), head = hot(cl([228, 228, 222], 0.12), b, [255, 175, 90]), legs = hot(cl([158, 158, 152], 0.5), b, [200, 90, 30]), fc = hot([70, 70, 68], b, [120, 40, 10]);
  if (fl > 0) { body = body.map(v => lerp(v, 1.6, fl)); head = head.map(v => lerp(v, 1.6, fl)); }
  const em = b * (0.22 + 0.16 * Math.sin(now * 23 + (e.fgSeed ?? (e.fgSeed = Math.random() * 9)))) + fl * 0.8 + (dying ? 0.6 * (1 - die) : 0);
  const jit = (pain * 1.6 + rock * 3 + (e.sw && e.sw.ph === 'wind' && e.sw.t > e.sw.T * 0.6 ? 0.8 : 0)) * sc, jx = (Math.random() - 0.5) * jit, jz = (Math.random() - 0.5) * jit;
  const bulk = e.type === 'brute' ? 1.18 : e.type === 'stalker' ? 0.9 : 1;
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
    else { const k = Math.min(1, s.t / s.T); up = 0; fw = (1 - k) * (1 - k); }
    lean = -0.15 * up + 0.55 * fw; armL = armR = lerp(lerp(-0.4, -2.75, up), -0.6, fw); armZ = 0.35 * up + 0.15 * fw;
  } else if (e.type === 'spear' && e.ai === 'wind') { armR = -2.6; armL = -0.5; lean = -0.2; }
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
  const hk = KIT_HEAD[e.type], dark = mixc(legs, [0.12, 0.12, 0.11], 0.35);
  if (hk === 'hood') { child(_m, hm, 0, 1.2, -0.6, -0.25, 0, 0); scaled(_m, 8.6, 9.4, 8.8); PT.ball.push(_m, dark, em); }
  else if (hk === 'helmet') { child(_m, hm, 0, 2.1, -0.2, -0.1, 0, 0); scaled(_m, 8.4, 5.6, 8.6); PT.ball.push(_m, rgb([110, 112, 106]).map((v, i) => lerp(v, body[i], 0.25)), em); }
  else if (hk === 'goggles' || hk === 'visor') { child(_m, hm, 0, 0.9, 3.0, 0, 0, 0); scaled(_m, hk === 'visor' ? 6.4 : 6, 1.7, 1.2); PT.box.push(_m, hk === 'visor' ? rgb([80, 150, 240]) : [0.16, 0.16, 0.15], hk === 'visor' ? 0.6 : 0); }
  // eyes: two points on the front of the head, in its colour, bright in the dark
  const ec = EYES[e.type] ? EYES[e.type].split(',').map(v => +v / 255) : [0.94, 0.94, 0.92], dk = 1 - dayLight() * 0.75;
  for (const x of [-1.15, 1.15]) { _p.set(x, 0.5, 3.75).applyMatrix4(hm); stat(_p.x, _p.y, _p.z, 2.4 * sc, ec[0], ec[1], ec[2], (0.75 * dk + 0.15) * (1 - die), 0); }
  // arms and legs
  child(_m, _torso, -5.4, 12.2, 0, armL, 0, -armZ); PT.arm.push(_m, body.map(v => v * 0.95), em);
  const armRm = child(new M4(), _torso, 5.4, 12.2, 0, armR, 0, armZ); PT.arm.push(armRm, body.map(v => v * 0.95), em);
  child(_m, _base, -2.1, 17, 0, sw, 0, 0); PT.leg.push(_m, legs, em);
  child(_m, _base, 2.1, 17, 0, -sw, 0, 0); PT.leg.push(_m, legs, em);
  // what it carries
  if (e.type === 'spear') { child(_m, armRm, 0, -15, 0, 1.45, 0, 0); _m.multiply(_t.makeTranslation(0, -14, 0)); scaled(_m, 1.3, 40, 1.3); PT.rod.push(_m, hexK('#6e5235'), 0); child(_m, armRm, 0, -15, 0, 1.45, 0, 0); _m.multiply(_t.makeTranslation(0, 26, 0)); scaled(_m, 2.6, 6, 1); PT.cone.push(_m, hexK('#9a9a92'), 0); }
  else if (e.type === 'archer') { const am = child(new M4(), _torso, -5.4, 12.2, 0, armL, 0, -armZ), h = new V3(0, -15, 0).applyMatrix4(am); between(PT.rod, h.x, h.y - 10 * sc, h.z, h.x, h.y + 10 * sc, h.z, 0.7 * sc, hexK('#6b4a2e')); }
  else if (e.type === 'bomber') { child(_m, _torso, 0, 8, -4, 0.3, 0, 0); scaled(_m, 3, 18, 3); PT.rod.push(_m, hexK('#6a6a64'), 0); }
  else if (e.type === 'brute' || e.type === 'tall') { child(_m, armRm, 0, -15, 0, 1.1, 0, 0); scaled(_m, 2.2, 16, 2.2); PT.rod.push(_m, hexK('#4f3a28'), 0); child(_m, armRm, 0, -15, 0, 1.1, 0, 0); _m.multiply(_t.makeTranslation(0, 15, 0)); scaled(_m, 4.4, 5, 4.4); PT.ball.push(_m, hexK('#5a4430'), 0); }
}
const arr3 = v => [v.x, v.y, v.z];

// ---------------- animals ----------------
const BCOL = {   // colour, belly, back (from the 2D game's beast art)
  deer: ['#8e6542', '#d9c6a6', '#61412a'], rabbit: ['#8c7c68', '#e6dccb', '#665846'], boar: ['#4e3d31', '#6e5a4a', '#2e241e'], wolf: ['#6a665e', '#b8b2a4', '#3c3a35'], bear: ['#4a3426', '#6a4c38', '#2c1e16'],
};
const BDIM = {   // body length, shoulder height, hip height, body width, leg width, neck forward, neck up, head size, muzzle
  deer: [25, 21, 20, 8.5, 2.2, 5, 12, 3.2, 4.6], rabbit: [9, 6.5, 7.5, 5.8, 1.8, 1, 2.5, 2.5, 1.6], boar: [22, 14.5, 12.5, 10.5, 3, 2, 0, 4.3, 5.4],
  wolf: [23, 16, 15, 7.6, 2.3, 4, 4.5, 3.3, 5.2], bear: [32, 23, 20, 15, 5, 3, 2.5, 5.4, 4.4],
};
function poseBeast(o, now, dt) {
  const D = BDIM[o.k], C = BCOL[o.k]; if (!D) return;
  const [len, sh, hip, bw, lw, nF, nH, hr, mz] = D;
  const col = hexK(C[0]), belly = hexK(C[1]), back = hexK(C[2]);
  const gdt = Math.max(dt, 1e-4), mdx = o.x - (o.fgx ?? o.x), mdy = o.y - (o.fgy ?? o.y); o.fgx = o.x; o.fgy = o.y;
  const v0 = Math.hypot(mdx, mdy) / gdt; o.fgv = (o.fgv || 0) + (Math.min(v0, 400) - (o.fgv || 0)) * Math.min(1, gdt * 10); if (v0 > 4) o.fgHead = Math.atan2(mdy, mdx);
  const v = o.fgv, still = v < 6, want = !still && o.fgHead !== undefined ? o.fgHead : o.dir || 0;
  o.fgFace = o.fgFace === undefined ? want : o.fgFace + clamp(angDiff(want, o.fgFace), -7 * gdt, 7 * gdt);
  const run = v > (o.k === 'rabbit' ? 30 : 70), stride = o.k === 'rabbit' ? 4 : o.k === 'boar' ? 5.5 : 8;
  o.fgPh = (o.fgPh ?? (o.seed || 0) * 7) + gdt * (still ? 0 : (run ? 2.2 : 1.4) * v / Math.max(4, stride * 1.6));
  const st = o.dead ? 'dead' : o.st, angry = st === 'hunt' || st === 'charge' || st === 'back' || st === 'wind' || st === 'snap';
  const graze = !angry && still && st === 'graze' && o.k !== 'bear' ? Math.max(0, Math.min(1, Math.sin(now * 0.55 + (o.seed || 0) * 9) * 2.2 - 0.4)) : 0;
  const rear = o.k === 'bear' && st === 'wind' ? clamp((0.6 - (o.t || 0)) / 0.25 + 0.2, 0, 1) : 0;
  const deadK = o.dead ? 1 : 0, fl = o.flash > 0 ? o.flash : 0, em = fl * 0.7;
  const ph = o.fgPh, gk = still ? 0 : Math.min(1, v / (run ? 100 : 40)), lift = (o.k === 'rabbit' ? 2 : 4) * gk;
  const yaw = faceYaw(o.fgFace), fx = Math.cos(o.fgFace), fy = Math.sin(o.fgFace), rx = -fy, ry = fx;
  const P = (f, s, h) => [o.x + fx * f + rx * s, h, o.y + fy * f + ry * s];   // forward, side, height -> 3D
  const hop = o.k === 'rabbit' && run ? Math.abs(Math.sin(ph)) * 5 : 0;
  const bodyH = (sh + hip) / 2 * (1 - deadK * 0.75) + hop + rear * 8, pitch = rear * -0.9 + (deadK ? 0 : 0);
  const roll = deadK * 1.45;
  // the body
  const bc = P(0, 0, bodyH);
  blob(PT.ball, bc[0], bc[1], bc[2], bw, bw * (o.k === 'rabbit' ? 1.05 : 0.95), len, yaw, col.map(v => lerp(v, 1.5, fl)), em, pitch, roll);
  blob(PT.ball, bc[0], bc[1] + bw * 0.25, bc[2], bw * 0.7, bw * 0.55, len * 0.9, yaw, back, em, pitch, roll);
  blob(PT.ball, bc[0], bc[1] - bw * 0.2, bc[2], bw * 0.8, bw * 0.6, len * 0.75, yaw, belly, em, pitch, roll);
  if (deadK) { const hc = P(len * 0.55, bw * 0.4, 4); blob(PT.ball, hc[0], hc[1], hc[2], hr * 2, hr * 1.8, hr * 2.6, yaw, col, 0, 0, roll); return; }
  // legs: front pair swing against back pair
  for (const [f, s, k] of [[len * 0.36, 1, 0], [len * 0.36, -1, Math.PI], [-len * 0.36, 1, Math.PI], [-len * 0.36, -1, 0]]) {
    const top = P(f, s * bw * 0.32, bodyH - bw * 0.15), a = Math.sin(ph + k) * 0.5 * gk, up = Math.max(0, Math.sin(ph + k + Math.PI / 2)) * lift;
    if (rear && f > 0) { const ft = P(f + 6, s * bw * 0.4, bodyH + 6); between(PT.limb, ...top, ...ft, lw, col, em); continue; }
    const foot = P(f + Math.sin(a) * (f > 0 ? sh : hip) * 0.6, s * bw * 0.32, up);
    between(PT.limb, ...top, ...foot, lw * (o.k === 'rabbit' ? 0.9 : 1), col.map(v => v * 0.88), em);
  }
  // neck and head: down to graze, up and forward when alert, low and out when it means you harm
  const low = angry ? 0.6 : 0, nk = P(len * 0.42, 0, bodyH + bw * 0.2);
  const hx = len * 0.5 + nF + (angry ? 3 : 0), hh = graze ? 3 : bodyH + nH * (1 - low) + bw * 0.3 - low * 4;
  const hd = P(hx, 0, hh);
  if (nH > 1 || graze) between(PT.limb, ...nk, ...hd, Math.max(2, bw * 0.28), col, em);
  const snap = (o.bite || 0) > 0 && st === 'snap' ? 1 : 0;
  blob(PT.ball, hd[0], hd[1], hd[2], hr * 2, hr * 1.9, hr * 2.2, yaw, col.map(v => lerp(v, 1.5, fl)), em, graze ? 0.9 : -0.1 * snap);
  const mzp = P(hx + hr * 0.9 + mz * 0.4, 0, hh - (graze ? 1 : hr * 0.35));
  blob(PT.ball, mzp[0], mzp[1], mzp[2], hr * 1.2, hr * 1.1, mz * 1.6, yaw, o.k === 'deer' || o.k === 'rabbit' ? belly : back, em, graze ? 0.9 : 0);
  // eyes catch your torch at night
  if (dayLight() < 0.6 && (o.k === 'wolf' || o.k === 'boar' || o.k === 'bear')) for (const s of [-1, 1]) { const ep = P(hx + hr * 0.7, s * hr * 0.55, hh + hr * 0.35); stat(ep[0], ep[1], ep[2], 1.8, 0.85, 0.79, 0.54, 0.8 * (1 - dayLight()), 0); }
  // ears, antlers, tusks, tails
  if (o.k === 'rabbit') for (const s of [-1, 1]) { const a = P(hx - hr * 0.3, s * hr * 0.4, hh + hr * 0.6), b = P(hx - hr * 1.3, s * hr * 0.6, hh + hr * 3.2); between(PT.limb, ...a, ...b, 0.75, col, em); }
  else if (o.k === 'wolf') for (const s of [-1, 1]) { const a = P(hx - hr * 0.2, s * hr * 0.55, hh + hr * 0.5); blob(PT.cone, a[0], a[1], a[2], 2, 3.2, 1.4, yaw, back, em); }
  else if (o.k === 'deer' && !o.doe) for (const s of [-1, 1]) {
    const a = P(hx - hr * 0.2, s * hr * 0.45, hh + hr * 0.7), b = P(hx - hr * 1.2, s * hr * 2.2, hh + hr * 3.6), c = P(hx + hr * 0.2, s * hr * 1.8, hh + hr * 2.9);
    between(PT.rod, ...a, ...b, 0.45, hexK('#d9c6a6'), 0); between(PT.rod, ...P(hx - hr * 0.7, s * hr * 1.3, hh + hr * 2.1), ...c, 0.4, hexK('#d9c6a6'), 0);
  } else if (o.k === 'boar') for (const s of [-1, 1]) { const a = P(hx + hr * 0.9 + mz * 0.6, s * hr * 0.6, hh - hr * 0.4), b = P(hx + hr * 1.2 + mz * 0.6, s * hr * 0.8, hh + hr * 0.4); between(PT.rod, ...a, ...b, 0.55, hexK('#e6dfcc'), 0); }
  if (o.k === 'bear') for (const s of [-1, 1]) { const a = P(hx - hr * 0.2, s * hr * 0.75, hh + hr * 0.75); blob(PT.ball, a[0], a[1], a[2], 2.6, 2.6, 1.6, yaw, col, em); }
  const tl = P(-len * 0.52, 0, bodyH + bw * 0.2), tt = P(-len * 0.52 - (o.k === 'wolf' ? 9 : 3), 0, bodyH + (o.k === 'wolf' ? -3 + Math.sin(now * 3) * 2 : 3));
  if (o.k !== 'bear') between(PT.limb, ...tl, ...tt, o.k === 'wolf' ? 1.6 : 1.2, o.k === 'rabbit' || o.k === 'deer' ? belly : back, em);
  if (o.tame) { const tg = P(len * 0.35, 0, bodyH + bw * 0.5); stat(tg[0], tg[1] + 3, tg[2], 2.4, 1, 0.85, 0.55, 0.6, 0); }   // the one you tamed: a warm mark over its shoulders
}

function drawFigures(now, dt) {
  const rg = S.rg, D = S.day, p = S.p;
  for (const e of rg.enemies) if (!e.dead && Math.abs(e.x - p.x) < VIEW && Math.abs(e.y - p.y) < VIEW && e.type !== 'centi') poseFoe(e, now, dt, false);
  for (const g of rg.dying) if (g.type !== 'centi') poseFoe(g, now, dt, true);
  for (const o of D.beasts) if (Math.abs(o.x - p.x) < VIEW && Math.abs(o.y - p.y) < VIEW) poseBeast(o, now, dt);
}
function figuresEnd() { for (const k in PT) PT[k].done(); }
