// ================= the crossbow =================
// Joe: "add a crossbow that is essentially an upgraded bow. I would love the idea of standing on the platform shooting the
// cannibals, that's the fantasy!" Made at a workbench from a short bow, planks, an iron bar and rope: the bow lashed across
// the nose of a wooden stock, an iron nut to hold the string back and a long trigger under it. It shoots the arrows you
// already make, and it's made for the lookout (68-lift):
//   - click and you span it: up against you, nose high, you haul the string back over the nut and lay an arrow in the
//     groove. That takes a breath and some stamina, and you walk slowly while you do it: it's for while they're coming.
//   - once spanned it stays spanned: put it away, take it out again, and the shot is still waiting (the +1 on its slot).
//   - hold to bring it up to your eye (the view comes in closer than with a bow), let go to shoot. Every shot is a full one,
//     faster and flatter than any bow's, and it goes through the first one it meets into the one behind. In the head it
//     drops a cannibal; two in the body do for most of them.
//   - after a shot it spans itself again if you've arrows, so up on the stand it's shoot, span, shoot.
const XB = { span: 1.4, latch: 0.7, st: 9, cd: 0.3, auto: 0.35 };
const xbHeld = () => { const T = heldIt(); return !!(T && T.tool === 'xbow'); };

// ---- spanning it, bringing it up, and letting go ----
{ const ds = dayDrawStart; dayDrawStart = function () {
  if (!S.day || !S.rg || !xbHeld()) return ds.apply(this, arguments);
  const D = S.day, s = heldSlot();
  if (D.draw || D.xspan || S.p.act || (S.rg.rngCd || 0) > 0) return true;
  if (s.ld && DIT[s.ld]) { D.draw = { kind: 'xbow', t: 0, full: true, a: S.aimW || 0 }; snd('cloth', { v: 0.3, rate: 1.4 }); return true; }   // spanned: up to your eye
  xbSpan(s, false); return true;
}; }
function xbSpan(s, auto) {   // start hauling the string back (auto: straight after a shot, quietly, if you've the breath)
  const D = S.day;
  if (!dayAmmo('xbow')) {
    if (!auto) { dayNote('noammo', 'no arrows · make some at a fire or a bench', 2); if (actx && !snd('ui_error')) toneAt(actx.currentTime, 300, 0.08, 0.04, 'square', sfxGain); }
    return false;
  }
  if (auto) { if (D.st < XB.st) return false; D.st -= XB.st; D.stT = 0; } else if (!dayStam(XB.st)) return false;
  D.xspan = { t: 0, s };
  if (!D.told.xbow) { D.told.xbow = 1; exNote('spanning · it stays spanned till you shoot · hold to aim, let go to shoot', true); }
  return true;
}
{ const dr = dayDrawRelease; dayDrawRelease = function () {
  const D = S.day; if (!D || !D.draw || D.draw.kind !== 'xbow') return dr.apply(this, arguments);
  const W = D.draw, s = heldSlot(), rg = S.rg; D.draw = null;
  if (!s || !s.ld || !DIT[s.ld] || !xbHeld()) return;
  const bolt = { id: s.ld, n: 2 }, n0 = rg.dshots ? rg.dshots.length : 0; delete s.ld;   // the arrow in the groove left your quiver when you spanned it
  const G = aimLooseAt('xbow', 1);
  dayLoose('xbow', bolt, 1, W.a, G.off, 1, G.L);
  if (rg.dshots && rg.dshots.length > n0) { const q = rg.dshots[rg.dshots.length - 1]; q.pierce = Math.max(q.pierce || 0, DIT[bolt.id].pierce ? 2 : 1); q.knock = 22; q.xb = 1; }
  dayWear(); rg.rngCd = XB.cd; D.xauto = XB.auto; XBV.kick = 1;
  camKick(W.a, -3); addShake(0.1); padRumble(0.35, 70);
  snd('trap_snap', { v: 0.5, rate: 1.4 });   // the nut letting go
}; }
{ const dt0 = dayDrawTick; dayDrawTick = function (dt) { dt0.apply(this, arguments); xbTick(dt); }; }
function xbTick(dt) {
  const D = S.day, s = heldSlot();
  if (D.xauto > 0 && (D.xauto -= dt) <= 0) { D.xauto = 0; if (xbHeld() && s && !s.ld && !D.xspan && !D.draw && !S.p.act && S.rg.phase === 'fight') xbSpan(s, true); }
  const X = D.xspan; if (!X) return;
  if (s !== X.s || !xbHeld() || S.p.act || S.rg.phase !== 'fight') { D.xspan = null; return; }   // put down part way: the string slips back off the nut
  const u0 = X.t / XB.span; X.t += dt * dayFgSp(); const u = X.t / XB.span;
  if (u0 < 0.16 && u >= 0.16 && actx && !snd('bow_draw', { v: 0.9, rate: 0.75 })) noiseAt(actx.currentTime, 700, 300, 0.4, 0.1, sfxGain);   // hauling it back
  if (u0 < XB.latch && u >= XB.latch) {   // over the nut: it catches, and an arrow goes in the groove
    const a = dayAmmo('xbow'); if (!a) { D.xspan = null; dayNote('noammo', 'no arrows', 2); return; }
    s.ld = a.id; dayAmmoUse(a); padRumble(0.2, 50);
    if (actx && !snd('latch', { v: 0.8, rate: 1.5 })) toneAt(actx.currentTime, 1500, 0.05, 0.04, 'square', sfxGain);
  }
  if (u >= 1) D.xspan = null;
}
{ const ss = sprintStep; sprintStep = function (dt, ml) {   // spanning it: a slow walk, no running
  if (!S.day || !S.day.xspan) return ss.apply(this, arguments);
  const h = SPR.held; SPR.on = SPR.held = false; const k = ss.apply(this, arguments); SPR.held = h; return k * 0.6;
}; }
{ const dv = dayVerb; dayVerb = function () {
  if (!S.day || !xbHeld()) return dv.apply(this, arguments);
  const D = S.day, s = heldSlot(); return D.draw ? 'Shoot' : D.xspan ? 'Spanning' : s && s.ld ? 'Aim' : 'Span';
}; }

// ---- what it looks like ----
// Its origin is the stock's wrist, where your right hand closes round it; it points down -z with its deck up +y. The short
// bow it was made from runs across the nose, lashed on; the string sits on the deck in front of the iron nut, or drawn
// back over it; the arrow lies in the groove with its nock against the string.
const XBM = { tip: [10.5, 0.34, -13.1], rest: [0, 0.82, -13.1], nut: [0, 0.98, -1.85], grip: [0, -0.2, 0.9], fore: [0, -0.3, -8.2] };
function xbModel(G, K, T) {
  const wd = T.c || '#6a4a2e', bw = T.bw || '#9a7040';
  // the stock: a heavy butt dropping below the line, a slim wrist for your hand, the long fore-stock with its groove, the nose
  const ST = [[9.3, -1.55, 0.5, 0.9], [9.0, -1.5, 0.66, 1.25], [6.2, -1.12, 0.66, 1.2], [3.2, -0.56, 0.56, 0.86], [1.6, -0.28, 0.48, 0.66], [-0.4, -0.08, 0.5, 0.64],
    [-2.0, 0, 0.58, 0.72], [-14.5, 0, 0.58, 0.72], [-14.9, -0.28, 0.76, 1.0], [-16.6, -0.28, 0.76, 1.0], [-16.95, -0.24, 0.6, 0.8]];
  K.add(sweep(ST.map(([z, y, w, h]) => [[0, y, z], sqS(w, h, 0.5, 12)]), [1, 0, 0]), wd, HMT.wood, { cf: (x, y, z, c) => y > 0.6 && z < -1.3 && z > -14.6 && Math.abs(x) < 0.2 ? _hkc.copy(c).lerp(COLR('#2a1c12'), 0.65) : null });
  // the bow across the nose, its limbs tapering out to the nocks and swept back toward you
  const path = [];
  for (let i = 0; i <= 20; i++) { const s = i / 10 - 1, a = Math.abs(s); path.push([[10.6 * s, 0.32, -15.8 + 2.7 * s * s], ovalS(lerp(0.5, 0.26, a), lerp(0.42, 0.22, a), 8)]); }
  K.add(sweep(path, [0, 1, 0]), bw, HMT.wood);
  for (const s of [-1, 1]) K.add(hBallG([s * 10.55, 0.34, -13.1], [0.34, 0.4, 0.34], 7, 6), '#d8c8a0', HMT.bone, { ew: 0.06 });   // the nocks
  for (const z of [-15.05, -16.55]) K.add(turnG(wrapG(0, 0.42, 1.12), Math.PI / 2, 0, 0, [0, -0.28, z]), RAWHIDE, HMT.cord, { ew: 0.06 });   // lashed on either side of it
  // iron: the nut the string catches on, the long trigger under the wrist, the stirrup out in front
  K.add(hRodG([-0.62, 0.72, -1.5], [0.62, 0.72, -1.5], 0.36, 0.36, 9), IRON_D, HMT.metal, { ew: 0.06 });
  K.add(hRodG([0, -0.5, -2.2], [0, -1.9, 1.5], 0.2, 0.16, 6), IRON_D, HMT.metal, { ew: 0.05 });
  K.add(hBallG([0, -0.62, -2.1], [0.62, 0.26, 0.26], 7, 5), IRON_D, HMT.metal, { ew: 0.05 });   // its pin through the stock
  K.add(new THREE.TorusGeometry(1.25, 0.17, 6, 14, Math.PI).rotateX(-Math.PI / 2).translate(0, -0.28, -16.9), IRON_D, HMT.metal, { ew: 0.05 });
  const st = new THREE.Group(); st.name = 'xstock'; G.add(st); K.bake(st);
  for (const n of ['strA', 'strB']) { const o = vmPart(G, cyl(0.12, 0.12, 1, 4), mat('#efe6d2', 0.3), 0, 0, 0, 0, 0, 0, false); o.name = n; }
  for (const [n, iron] of [['bolt', false], ['boltI', true]]) {   // an arrow cut down to a bolt, flint-headed or iron
    const b = new THREE.Group(); b.name = n; b.scale.set(1.1, 1.1, 0.68); b.position.set(0, 0.98, XBM.nut[2] - 2 * 0.68); b.visible = false; G.add(b); buildArrow(b, iron);
  }
  xbString(G, 0);
}
const _xa = new V3(), _xb = new V3(), _xc = new V3();
function xbString(G, k) {   // each half of the string from its nock to the middle: k 0 on the deck in front, 1 back over the nut
  _xc.set(0, lerp(XBM.rest[1], XBM.nut[1], k), lerp(XBM.rest[2], XBM.nut[2], k));
  for (const [n, sx] of [['strA', 1], ['strB', -1]]) {
    const o = G.getObjectByName(n); if (!o) continue;
    _xa.set(sx * XBM.tip[0], XBM.tip[1], XBM.tip[2]); _xb.subVectors(_xc, _xa); const L = _xb.length();
    o.position.copy(_xa).addScaledVector(_xb, 0.5); o.quaternion.setFromUnitVectors(_sUp, _xb.normalize()); o.scale.set(1, L, 1);
  }
}
function xbBolt(G, id, slide) {   // the arrow in the groove (id null: none), slid back by slide
  for (const n of ['bolt', 'boltI']) { const b = G.getObjectByName(n); b.visible = !!id && (n === 'boltI') === (id === 'arrowsI'); b.position.z = XBM.nut[2] - 2 * 0.68 + (slide || 0); }
}
// where it is in the span: how far the string is back, where the right hand is, whether the arrow is in
function xbPhase(D, s) {
  const X = D && D.xspan, u = X ? clamp(X.t / XB.span, 0, 1) : 0, L = XB.latch;
  if (!X) return { u: 0, on: 0, str: s && s.ld ? 1 : 0, hand: 0, slide: 0, bolt: s && s.ld };
  const on = u < 0.16 ? easeIO(u / 0.16) : u > 0.86 ? easeIO((1 - u) / 0.14) : 1;
  const str = u < 0.16 ? 0 : u < L ? easeIO((u - 0.16) / (L - 0.16)) : 1;
  const hand = u < 0.16 ? easeIO(u / 0.16) : u < 0.86 ? 1 : easeIO((1 - u) / 0.14);   // 0 on the grip, 1 at the string (or the arrow)
  const lay = u < L ? 0 : clamp((u - L) / (0.84 - L), 0, 1);
  return { u, on, str, hand, lay, slide: u < L ? 0 : 4.5 * (1 - easeOut(lay)), bolt: u >= L && s ? s.ld : null };
}

// ---- in first person: both hands on it ----
const XBV = { k: 0, kick: 0 };   // up at your eye (0..1); the kick of a shot
const xbRig = new THREE.Group(); vmScene.add(xbRig); xbRig.visible = false;
const xbHand = makeHand(true); vmScene.add(xbHand); xbHand.visible = false; poseHand(xbHand, 0.85);
// rest: carried low on the right, canted; aim: the stock under your cheek, the arrow running in under the crosshair;
// span: nose up in front of you, the deck toward you, so you see the string come back
const XBP = { rest: PZ([5.2, -6.2, -13.5], [0.3, 1, 0.04], [-0.12, -0.02, -1]), aim: PZ([1.6, -4.6, -9.6], [0, 1, 0], [0, 0, -1]), span: PZ([2.4, -9.6, -11.5], [0.12, 0.78, 0.6], [-0.04, 0.55, -0.83]) };
const XBQ = { a: new THREE.Quaternion(), b: new THREE.Quaternion(), u: new V3(), f: new V3(), p: new V3() };
const xbR = (v, x, y, z) => xbRig.localToWorld(v.set(x, y, z));
const xbDir = (v, x, y, z) => v.set(x, y, z).applyQuaternion(xbRig.quaternion);
function placeXbow(dt, now, G, bx, by, ly, lp) {
  const D = S.day, s = heldSlot(), ph = xbPhase(D, s);
  if (G.parent !== xbRig) xbRig.add(G);
  G.visible = true; G.position.set(0, 0, 0); G.quaternion.identity();
  XBV.k = clamp(XBV.k + ((D && D.draw && D.draw.kind === 'xbow') ? 1 : -1) * dt * 7, 0, 1); XBV.kick = Math.max(0, XBV.kick - dt * 4.5);
  const eq = easeBack(equipT), run = runK * (1 - XBV.k) * (1 - ph.on), P = pzMix(VM.tmp, XBP.rest, XBP.aim, easeIO(XBV.k));
  if (ph.on > 0) pzMix(P, P, XBP.span, ph.on);
  const kk = XBV.kick * XBV.kick, br = 0.14 * Math.sin(now * 1.7) * (1 - 0.7 * XBV.k);
  P.p.x += bx * (1 - 0.6 * XBV.k) - ly * 6 + 2 * (1 - eq); P.p.y += by * (1 - 0.6 * XBV.k) + lp * 5 - VIEW_FX.dip * 0.15 - 9 * (1 - eq) - 1.4 * run + br + 0.7 * kk;
  P.p.z += 0.8 * run + 2.4 * kk; P.f.y += 0.22 * kk; P.f.normalize();
  P.u.applyQuaternion(VM.lagQ); P.f.applyQuaternion(VM.lagQ);
  P.p.x *= Math.max(vmX, 0.8);
  xbRig.visible = true; xbRig.position.copy(P.p); handFrame(P.u, P.f, xbRig.quaternion); xbRig.updateMatrixWorld(true);
  xbString(G, ph.str); xbBolt(G, ph.bolt, ph.slide);
  // the right hand: round the wrist of the stock, thumb up its side, a finger on the trigger; while spanning, hooked on the string, then laying the arrow in
  const grip = xbR(XBQ.p, ...XBM.grip), qg = handFrame(xbDir(XBQ.u, 0, 0.08, -1), xbDir(XBQ.f, -1, 0, 0), XBQ.a);
  let close = 1;
  if (ph.hand > 0) {
    const k = ph.str, at = ph.lay > 0 ? xbR(_xa, 0, 1.55, XBM.nut[2] + 0.9 + ph.slide) : xbR(_xa, 0, lerp(XBM.rest[1], XBM.nut[1], k) + 0.85, lerp(XBM.rest[2], XBM.nut[2], k) + 0.35);
    const qs = handFrame(xbDir(XBQ.u, -1, 0, 0.1), xbDir(XBQ.f, 0, -0.5, 1), XBQ.b);
    grip.lerp(at, ph.hand); qg.slerp(qs, ph.hand); close = lerp(1, ph.lay > 0 ? 0.45 : 0.6, ph.hand);
  }
  handG.position.copy(grip); handG.quaternion.copy(qg);
  fist.visible = true; fistK += (close - fistK) * Math.min(1, dt * 16); poseHand(fist, fistK, 0);
  armTo(fist, 1, handG.position, VM.pole.set(0.7 - 0.45 * ph.hand, -1, 0.15 + 0.2 * ph.hand));
  // the left hand: under the fore-stock, its fingers round the far side, holding it up
  xbHand.visible = true; xbR(xbHand.position, ...XBM.fore);
  handFrame(xbDir(XBQ.u, 0, 0, -1), xbDir(XBQ.f, 1, 0, 0), xbHand.quaternion);
  armTo(xbHand, -1, xbHand.position, VM.w.set(-0.7, -1, 0.1));
}

// ---- in third person (76-body) ----
// The same model, scaled to you: carried low across you in both hands, up into your right shoulder with your cheek on the
// stock to shoot, nose up against your belly while you haul the string back.
const XBT = { sc: 0.85, o: new V3(), f: new V3(0, 0, 1), u: new V3(0, 1, 0), go: 0, M: new M4() };
const _xm = new M4(), _xq = new V3(), _xr = new V3(), _xs = new V3();
function xbArms(P, D, s, dt) {   // the pose for both arms, and (in XBT) where the crossbow is in your chest
  const iq = chestQ(P), fw = new V3(0, 0, 1).applyQuaternion(iq), up = new V3(0, 1, 0).applyQuaternion(iq), rt = new V3(1, 0, 0).applyQuaternion(iq);
  const ph = xbPhase(D, s), aim = D.draw && D.draw.kind === 'xbow', sc = XBT.sc, at = (x, y, z) => new V3().addScaledVector(rt, x).addScaledVector(up, y).addScaledVector(fw, z);
  let o, f, u;
  if (ph.on > 0.5) { f = at(0, 0.6, 0.8).normalize(); u = at(0, 0.8, -0.6).normalize(); o = at(1.2, -4.8, 6.2); }   // spanning
  else if (aim) { f = fw.clone(); u = up.clone(); o = at(3.0, 4.4, 1.0).addScaledVector(f, 9.3 * sc).addScaledVector(u, 1.55 * sc); }   // the butt in your shoulder
  else { f = at(-0.3, -0.32, 1).normalize(); u = at(0.3, 1, 0.25).normalize(); o = at(3.2, -3.2, 6.4); }   // carried
  const k = XBT.go ? 1 - Math.exp(-16 * dt) : 1; XBT.go = 1;
  XBT.o.lerp(o, k); XBT.f.lerp(f, k).normalize(); XBT.u.lerp(u, k).normalize();
  // the hands, at their places on it
  const Z = _xq.copy(XBT.f).negate(), Y = _xr.copy(XBT.u).addScaledVector(Z, -XBT.u.dot(Z)).normalize(), X = _xs.crossVectors(Y, Z);
  const pt = (x, y, z) => XBT.o.clone().addScaledVector(X, x * sc).addScaledVector(Y, y * sc).addScaledVector(Z, z * sc);
  const shL = new V3(-5.6, 3.6, 0), shR = new V3(5.6, 3.6, 0);
  let HR = pt(...XBM.grip);
  if (ph.hand > 0) { const sk = ph.str; HR.lerp(pt(0, lerp(XBM.rest[1], XBM.nut[1], sk) + 1.2, lerp(XBM.rest[2], XBM.nut[2], sk)), ph.hand); }
  const HL = pt(XBM.fore[0], XBM.fore[1] - 1, XBM.fore[2]);
  const [aR, bR] = armReach(shR, HR, new V3(1, -0.8, 0).addScaledVector(fw, -0.5)); P.armR = aR; P.foreR = [bR, 0, 0]; P.handR = [0, 0, 0];
  const [aL, bL] = armReach(shL, HL, new V3(-0.4, -1, 0)); P.armL = aL; P.foreL = [bL, 0, 0]; P.handL = [0, 0, 0];
}
function xbHoldTP(G, chest, ty, D, s) {   // the model where xbArms put it, and its string and arrow
  const Z = _xq.copy(XBT.f).negate(), Y = _xr.copy(XBT.u).addScaledVector(Z, -XBT.u.dot(Z)).normalize(), X = _xs.crossVectors(Y, Z);
  XBT.M.makeBasis(X, Y, Z).setPosition(XBT.o).multiply(_xm.makeScale(XBT.sc, XBT.sc, XBT.sc));
  TP.hold.matrix.makeTranslation(0, ty, 0).multiply(chest.matrixWorld).multiply(XBT.M);
  G.position.set(0, 0, 0); G.rotation.set(0, 0, 0);
  const ph = xbPhase(D, s); xbString(G, ph.str); xbBolt(G, ph.bolt, ph.slide);
}
