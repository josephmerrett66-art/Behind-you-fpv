// ================= third person: you, seen from over your shoulder =================
// The same woods and the same fight with the camera pulled back behind your right shoulder. You're the top-down game's
// pale figure in a knitted cap with a pack on your back, built from the raiders' rig: walking, rolling, swinging, chopping,
// drawing a bow, eating, with whatever's in your hand held in it and your torch in the other by night.
// The camera pulls in when a tree trunk gets between it and you. Toggle it in the pause menu, or with V.
const thirdP = () => SET.view === 'third';
const TP = { boom: 76, face: undefined, holdId: null, items: new Map(), hold: new THREE.Group(), yawLast: 0 };
TP.hold.matrixAutoUpdate = false; scene.add(TP.hold);
const TP_BODY = [214, 210, 198], TP_HEAD = [226, 222, 212], TP_LEGS = [120, 112, 100], TP_CAP = '#b3532e', TP_PACK = '#6a5236';

// the camera: from your head, back along where you look and over your right shoulder, short of any trunk in the way
const _tpv = new V3();
function thirdCamera(p, yaw, pitch, headY) {
  const cp = Math.cos(pitch), fx = -Math.sin(yaw) * cp, fy = Math.sin(pitch), fz = -Math.cos(yaw) * cp, rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const sh = cam.aspect >= 1 ? 19 : 7, px = p.x + rx * sh, py = headY + 4, pz = p.y + rz * sh;   // the point it swings round: just over your right shoulder
  let want = 76;
  for (const o of WORLD.props) {   // a trunk between: come in short of it
    if (o.kind !== 'tree' && o.kind !== 'rock' && o.kind !== 'post') continue;
    const ox = o.x - px, oz = o.y - pz; if (ox * ox + oz * oz > 120 * 120) continue;
    const bx = -fx, bz = -fz, bl = Math.hypot(bx, bz) || 1, t = (ox * bx + oz * bz) / bl; if (t < 0) continue;
    const off = Math.abs(ox * bz - oz * bx) / bl, r = (o.kind === 'tree' ? 8 : o.kind === 'rock' ? 16 : 4) * (o.s || 1) + 5;
    if (off < r) want = Math.min(want, Math.max(14, (t - Math.sqrt(r * r - off * off)) / Math.max(0.2, bl)));
  }
  TP.boom += (want - TP.boom) * (want < TP.boom ? 1 : 0.08);   // snap in, ease back out
  cam.position.set(px - fx * TP.boom, Math.max(5, py - fy * TP.boom), pz - fz * TP.boom);
}

// you: posed from what the main game says you're doing
const _tpm = new M4(), _tpT = new M4();
function posePlayer(now) {
  const p = S.p, D = S.day, rg = S.rg, s = heldSlot(), id = s ? s.id : null, T = id ? DIT[id] : null;
  const v = Math.hypot(p.vx, p.vy), g = Math.min(1.5, v / WALK), gk = Math.min(1, g), ph = p.phase || 0;
  const A = p.atk && p.atk.t < p.atk.dur ? p.atk : null, W = p.wact && p.wact.t < (p.wact.dur || 0.4) ? p.wact : null, act = p.act && p.act.t < p.act.dur ? p.act : null;
  // which way you face: where you aim when you fight or shoot, else the way you're going
  const aimF = A || W || D.draw || !(v > 12), want = aimF ? S.aimW : Math.atan2(p.vy, p.vx);
  TP.face = TP.face === undefined ? want : TP.face + angDiff(want, TP.face) * Math.min(1, frameDtTP * (aimF ? 18 : 9));
  const face = TP.face, yawF = faceYaw(face);
  // a roll: you tuck and tumble forward
  const rollU = p.roll > 0 ? 1 - p.roll / ROLL_T : -1, tumble = rollU >= 0 ? rollU * Math.PI * 2 * (p.rollBack ? -1 : 1) : 0, tuck = rollU >= 0 ? Math.sin(Math.PI * rollU) : 0;
  const crouch = (D.crK || 0), dead = rg.phase === 'dead' ? Math.min(1, (rg.deadT || 0) / 0.8) : 0;
  const bob = Math.abs(Math.cos(ph)) * 1.4 * gk;
  _base.compose(_p.set(p.x, bob - crouch * 4 - tuck * 8 + tuck * 8 * 0 - dead * 3, p.y), _q.setFromEuler(_e.set(tumble - dead * 1.45, yawF, 0, 'YXZ')), _s.set(1, 1 - tuck * 0.25, 1));
  if (rollU >= 0) _base.multiply(_tpT.makeTranslation(0, 12 * tuck, 0));
  const sw = Math.sin(ph) * 0.75 * gk;
  let lean = gk * 0.14 + crouch * 0.35 + tuck * 0.9, twist = 0, armL = -sw * 0.8, armR = sw * 0.8 - 0.35, zL = 0.14, zR = 0.14, bL = 0.35 + 0.25 * gk, bR = 0.6, headX = 0;
  const kind = A ? (A.ov ? 'chop' : A.pose === 3 || (T && (T.wpn === 'spear' || T.thr === 'jav')) ? 'thrust' : A.i === 2 ? 'chop' : 'cut') : W ? 'chop' : null;
  if (kind) {   // a blow: wind up, cut through, recover (the same timing as the hands in first person)
    const u = (A || W).t / ((A || W).dur || 0.4), side = A ? A.side || 1 : 1;
    const w = smooth(Math.min(1, u / 0.22)), k = easeOut(clamp((u - 0.22) / 0.3, 0, 1)), r = smooth(clamp((u - 0.55) / 0.45, 0, 1));
    const at = (a, b, c) => r > 0 ? lerp(c, a, r) : k > 0 ? lerp(b, c, k) : lerp(a, b, w);
    if (kind === 'thrust') { armR = at(armR, -0.9, -1.55); bR = at(bR, 1.6, 0.05); zR = 0.05; lean = at(lean, -0.1, 0.45); twist = at(0, 0.4, -0.35); }
    else if (kind === 'chop') { armR = at(armR, -3.0, -0.5); armL = at(armL, -2.8, -0.6); bR = at(bR, 0.9, 0.2); bL = at(bL, 0.9, 0.2); lean = at(lean, -0.25, 0.55); zR = 0.1; zL = 0.1; }
    else { armR = at(armR, -2.3, -0.9); zR = at(0.14, 0.9 * side, -0.9 * side); bR = at(bR, 1.1, 0.15); twist = at(0, 0.7 * side, -0.8 * side); lean = at(lean, 0, 0.35); }
  } else if (D.draw && T && T.tool === 'bow') { const c = clamp(D.draw.t / (RNG.bow ? RNG.bow.full : 0.8), 0, 1); armL = -1.55; bL = 0.05; zL = -0.15; armR = -1.5; bR = 0.8 + 1.0 * c; zR = -0.35; twist = 0.35; }
  else if (D.draw) { armR = -2.4 - Math.sin(now * 14) * 0.3; bR = 0.7; }   // the sling whirling
  else if (act) {
    const u = act.t / act.dur, k = Math.sin(Math.PI * Math.min(1, u * 1.1));
    if (act.pose === 8 || act.pose === 9) { armR = lerp(armR, -1.6, k); bR = lerp(bR, 2.3, k); headX = -0.25 * k; }   // to your mouth
    else if (act.pose === 7) { lean = lerp(lean, 1.0, k); armR = lerp(armR, -0.9, k); bR = 0.2; }                       // down to pick it up
    else if (act.pose === 10) { const c = Math.abs(Math.sin(u * Math.PI * 3)); armR = -1.2 - 1.2 * (1 - c); bR = 0.9; lean = 0.35; }
    else { armR = lerp(armR, -1.3, k); bR = 0.5; }
  }
  const torch = (S.torchLvl > 0.05 || S.torchOn) && !kind && !D.draw;
  if (torch) { armL = -1.25; bL = 0.35; zL = 0.05; }
  if (rollU >= 0) { armL = armR = -1.2; bL = bR = 2; }
  if (dead) { armL = armR = -2.8 * dead; }
  // flashing as you take a blow
  const hurtK = CFX.hurt ? Math.max(0, 1 - CFX.hurt.t / 0.2) : 0;
  const tint = c => rgb(c).map(v => lerp(v, 1.5, hurtK * 0.8)), body = tint(TP_BODY), head = tint(TP_HEAD), legs = tint(TP_LEGS), em = hurtK * 0.5;
  const skin = mixc(head, [0.6, 0.5, 0.42], 0.3), boot = mixc(legs, [0.1, 0.1, 0.09], 0.6);
  child(_torso, _base, 0, 17, 0, lean, twist, 0); PT.torso.push(_torso, body, em);
  child(_m, _torso, 0, 17.6, 0.6, headX + 0.1, -twist * 0.5, 0); PT.head.push(_m, head, em);
  const hm = _t2.copy(_m);
  child(_t, hm, 0, -0.2, 2.4, 0, 0, 0); PT.face.push(_t, hex('#8f8f89'), 0);
  child(_m, hm, 0, 1.8, -0.2, -0.15, 0, 0); scaled(_m, 8.2, 6.2, 8.4); PT.ball.push(_m, hex(TP_CAP), em);   // the knitted cap
  child(_m, hm, 0, 0.9, -0.1, -0.15, 0, 0); scaled(_m, 8.6, 1.6, 8.8); PT.ball.push(_m, hex('#7a3a20'), em);
  child(_m, _torso, 0, 8.5, -3.9, -0.08, 0, 0); scaled(_m, 7.6, 10, 3.8); PT.box.push(_m, hex(TP_PACK), em);   // the pack
  child(_m, _torso, 0, 15.5, -3.6, -0.08, 0, 0); scaled(_m, 8.2, 2.6, 3.2); PT.box.push(_m, hex('#7a6a50'), em);
  child(_m, _base, 0, 17.5, 0, lean * 0.3, twist * 0.5, 0); scaled(_m, 9.2, 5, 6); PT.ball.push(_m, legs, em);
  child(_m, _torso, 0, 0.8, 0, 0, 0, 0); scaled(_m, 7.4, 1.6, 4.9); PT.box.push(_m, hex('#3a2e24'), em);
  child(_m, _torso, 0, 13.5, 0.4, 0, 0, 0); scaled(_m, 2.6, 4.5, 2.6); PT.rod.push(_m, skin, em);
  const jt = (m, x, y, z) => _p.set(x, y, z).applyMatrix4(m).clone();
  const limb = (sx, ang, z, bend) => {
    const sm = child(new M4(), _torso, sx, 12.2, 0, ang, 0, z), sh = jt(sm, 0, 0, 0), el = jt(sm, 0, -6.7, 0), fm = child(new M4(), sm, 0, -6.7, 0, -bend, 0, 0), hd = jt(fm, 0, -6.3, 0);
    blob(PT.ball, sh.x, sh.y, sh.z, 3.2, 3, 3, 0, body, em);
    between(PT.limb, sh.x, sh.y, sh.z, el.x, el.y, el.z, 1.45, body, em); between(PT.limb, el.x, el.y, el.z, hd.x, hd.y, hd.z, 1.2, body, em);
    blob(PT.ball, hd.x, hd.y, hd.z, 2.4, 2.6, 2.4, 0, skin, em);
    return fm;
  };
  const fL = limb(-5.4, armL, -zL, bL), fR = limb(5.4, armR, zR, bR);
  const leg = (hx, ang, kb) => {
    const tm = child(new M4(), _base, hx, 17, 0, ang, 0, 0), hp = jt(tm, 0, 0, 0), kn = jt(tm, 0, -8, 0), sm = child(new M4(), tm, 0, -8, 0, kb, 0, 0), ft = jt(sm, 0, -7.6, 0), toe = jt(sm, 0, -8.4, 1.6);
    between(PT.limb, hp.x, hp.y, hp.z, kn.x, kn.y, kn.z, 1.9, legs, em); between(PT.limb, kn.x, kn.y, kn.z, ft.x, ft.y, ft.z, 1.6, legs, em);
    blob(PT.ball, toe.x, toe.y, toe.z, 3.4, 2.6, 5.2, yawF, boot, em);
  };
  const tk = rollU >= 0 ? 1.8 : crouch * 1.1;
  leg(-2.2, sw - tk * 0.9 - (kind === 'thrust' ? 0.4 : 0), 0.12 + 0.95 * gk * Math.max(0, Math.cos(ph)) + tk * 1.6);
  leg(2.2, -sw - tk * 0.9 + (kind === 'thrust' ? 0.3 : 0), 0.12 + 0.95 * gk * Math.max(0, -Math.cos(ph)) + tk * 1.6);
  // what's in your hand: the same model as in first person, held out from your fist
  if (id !== TP.holdId) {
    if (TP.holdId && TP.items.has(TP.holdId)) TP.items.get(TP.holdId).visible = false;
    TP.holdId = id;
    if (id) { if (!TP.items.has(id)) { const G = itemModel(id).clone(true); G.visible = true; TP.hold.add(G); TP.items.set(id, G); } TP.items.get(id).visible = true; }
  }
  if (id && TP.items.has(id)) {
    const G = TP.items.get(id); G.position.set(0, 0, 0); G.rotation.set(0, 0, 0);
    const bow = T && T.tool === 'bow';
    TP.hold.matrix.copy(bow ? fL : fR).multiply(_tpT.makeTranslation(0, -6.3, 0)).multiply(rot(bow ? 0 : Math.PI / 2, bow ? Math.PI / 2 : 0, 0));
    TP.hold.matrixWorldNeedsUpdate = true; TP.hold.visible = true;
  } else TP.hold.visible = false;
  // your torch by night: a short lamp in the left fist, its lens glowing
  if (torch) {
    const a = jt(fL, 0, -6.3, 0), b = jt(fL, 0, -6.3, 7); between(PT.rod, a.x, a.y, a.z, b.x, b.y, b.z, 1.2, hex('#66655e'), 0);
    stat(b.x, b.y, b.z, 9, 1, 0.92, 0.75, 0.8 * S.torchLvl, 0); stat(b.x, b.y, b.z, 3, 1, 1, 0.95, 1, 0);
  }
}
let frameDtTP = 1 / 60;

// called at the end of placing the camera: swap your eyes for the camera over your shoulder
function thirdFrame(rdt, now, headY) {
  frameDtTP = rdt;
  const on = thirdP() && state === 'play';
  trail.visible = !on;
  if (!on) { TP.hold.visible = false; TP.boom = 76; return false; }
  handG.visible = torchG.visible = false;
  thirdCamera(S.p, look.yaw, look.pitch, headY);
  cam.rotation.z *= 0.25;   // fallen: the camera stays upright and watches you go down
  cam.updateMatrixWorld(); LU.camPos.value.copy(cam.position);
  return true;
}
addEventListener('keydown', e => {
  if (e.code !== 'KeyV' || e.repeat || state !== 'play' || menusOpen()) return;
  SET.view = thirdP() ? 'first' : 'third'; saveSet(); syncSet();
});
