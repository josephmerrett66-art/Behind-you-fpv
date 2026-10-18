// ================= the clan, closer to The Forest (Joe: "that is the target") =================
// What 72-clan's brain lacked next to The Forest's cannibals, each its own section below:
//  - they fight like people: a hop aside or back from your swing, the club up to block, a running leap in at you, two blows
//    from the bold ones, and the skinny ones hit once and run;
//  - they care for each other: they kneel over their dead, and one of them drags a badly hurt friend away by the wrists;
//  - leaders and skinny ones: a painted leader in a bone crown holds back, points at you and sends the others in; kill it and
//    its band breaks and runs, and comes back later for revenge. The skinny ones are quick and fragile;
//  - anger that builds over the days: each kill, each tree you chop, each day survived and each visit to their camps makes
//    them bolder. The first days they mostly watch;
//  - their camps out in the woods: a fire ringed with stones, lean-tos, bones and an effigy, a band resting there;
//  - up in the trees they leap from trunk to trunk and drop on you from above;
//  - your effigy frightens them off; and the first time they beat you by day, you wake in their camp instead of dying.

// ---------------- kinds ----------------
const CL_KIND = { reg: { hp: 1, spd: 1 }, skinny: { hp: 0.65, spd: 1.14 }, leader: { hp: 1.45, spd: 0.95 } };
function clanKind(e, k) {
  const c = e.cl, K = CL_KIND[k]; c.kind = k; c.spd = K.spd; e.hp *= K.hp; e.maxHp *= K.hp; c.hp0 = e.hp;
  if (k === 'leader') { c.vi = 4; c.club = true; c.vp = 85 + Math.random() * 20; c.P.cur = Math.max(c.P.cur, 0.5); c.P.fear = Math.min(c.P.fear, 0.3); }
  if (k === 'skinny') { c.P.fear = Math.min(1, c.P.fear + 0.1); c.vp = Math.max(c.vp, 150 + Math.random() * 60); }
}

// ---------------- anger: how they feel about you, building over the days ----------------
// 0 the first morning; up with each day, each one you kill, each tree you fell, time in their camps. It never quite goes away.
const clanAng = () => (S.day && S.day.clanAng) || 0;
function clanAngAdd(k) { const D = S.day; if (D) D.clanAng = clamp((D.clanAng || 0) + k, 0, 100); }
const clanAngK = () => clanAng() / 100;   // 0..1

// ---------------- fighting like people ----------------
// your swing starting near one: it may hop clear, or get its club up; caught off guard, it takes the blow
function clanParry(e, A, d) {
  const c = e.cl, p = S.p;
  if (d > 95 || c.z > 0 || ['down', 'drag', 'mourn', 'pounce'].includes(c.st) || (e.sw && e.sw.ph === 'strike') || S.t < (c.dgCd || 0)) return;
  if (Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), A.a)) > 1.1) return;   // not in the swing's way
  const hurt = 1 - e.hp / e.maxHp, r = Math.random();
  const dodge = clamp(0.22 + (c.kind === 'skinny' ? 0.18 : 0) + 0.1 * c.P.agg - 0.3 * hurt, 0.05, 0.45), block = c.club && c.kind !== 'skinny' ? 0.12 + 0.12 * c.P.agg + (c.kind === 'leader' ? 0.15 : 0) : 0;
  c.dgCd = S.t + 1.3 + Math.random() * 0.8;   // never every swing: a combo lands
  if (r < dodge) {
    const a = Math.atan2(e.y - p.y, e.x - p.x) + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.7);
    c.hop = { vx: Math.cos(a) * 215, vy: Math.sin(a) * 215, t: 0.26, T: 0.26 }; clanSnd('breath', e.x, e.y, 0.6); clanSnd('rustle', e.x, e.y, 1);
  } else if (r < dodge + block) { c.block = S.t + 0.55; c.o.facing = 1; }
}
// a blow that lands while its club is up: a crack of wood, a stagger, and maybe straight back at you
function clanBlocked(e) {
  const c = e.cl, lost = c.hp0 - e.hp; e.hp = c.hp0 - lost * 0.12; c.hp0 = e.hp; c.block = 0; c.blockedT = S.t;
  clanSnd('clack', e.x, e.y); addShake(0.05);
  const a = Math.atan2(e.y - S.p.y, e.x - S.p.x); c.hop = { vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, t: 0.18, T: 0.18 };
  if (!c.eng) clanNotice(e, true);
  if (clanConf(e) > 0.35 && Math.random() < 0.5 && clanTokFree(true)) clanGo(e, 'attack', { now: 1 });
}
function clanHopStep(e, dt) {
  const c = e.cl; if (!c.hop) return;
  const k = Math.min(dt, c.hop.t), nx = e.x + c.hop.vx * k, ny = e.y + c.hop.vy * k;
  if (!lakeAt(nx, ny, 10) && !propsNear(nx, ny, 14).some(o => (o.kind === 'tree' || o.kind === 'rock') && Math.hypot(o.x - nx, o.y - ny) < o.r * o.s + 6)) { e.x = nx; e.y = ny; }
  c.hop.t -= dt; if (c.hop.t <= 0) c.hop = null;
}

// ---------------- caring for each other ----------------
// badly hurt, one may go down: on its back, groaning, dragging itself away; another comes for it
function clanDown(e) {
  const c = e.cl; clanGo(e, 'down'); c.done = 1; c.downT = 0; c.saver = null;
  clanSay(e, 'scream', 0.9);
  // someone of its band (or any of them near) who isn't too frightened comes for it
  const cand = clanList().filter(o => o !== e && o.cl.st !== 'down' && o.cl.st !== 'drag' && !o.cl.saving && o.cl.kind !== 'leader' && o.cl.fear < 0.8 && Math.hypot(o.x - e.x, o.y - e.y) < 1000)
    .sort((a, b) => (a.cl.band === c.band ? -200 : 0) + Math.hypot(a.x - e.x, a.y - e.y) - ((b.cl.band === c.band ? -200 : 0) + Math.hypot(b.x - e.x, b.y - e.y)));
  const s = cand.find(o => o.cl.P.soc > 0.45 || Math.random() < 0.6);
  if (s) { s.cl.saving = e; c.saver = s; s.cl.hunter = 0; clanGo(s, 'rescue'); clanLater(0.4, 'yell', s, 0.9); }
}
Object.assign(CLAN_ST, {
  down(e, c, d, dt) {   // on its back, hurt, pushing itself away from you with its heels
    c.cr = 1; c.downT += dt; c.o.facing = 1;
    if (c.dragged) { c.dragged = Math.max(0, c.dragged - dt); return; }
    const a = Math.atan2(e.y - S.p.y, e.x - S.p.x); c.faceW = a + Math.PI;   // facing you, sliding back
    clanMove(e, e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, 9, dt); c.v = 0;
    if ((c.o.g = (c.o.g ?? 1) - dt) <= 0) { c.o.g = 1.6 + Math.random() * 1.6; clanSay(e, 'grunt', 0.8); }
    if (c.downT > 22 && (!c.saver || c.saver.dead)) { c.saver = null; clanGo(e, 'flee', { hurt: 1 }); }   // nobody came: up and limping off
  },
  rescue(e, c, d, dt) {   // running to the fallen one
    const w = c.saving; if (!w || w.dead || w.cl.st !== 'down') { c.saving = null; return clanThink(e); }
    const L = clanMove(e, w.x, w.y, CL.run * 1.1, dt); c.cr = 0.4;
    if (L < 16) { clanGo(e, 'drag'); clanSnd('breath', e.x, e.y, 0.8); }
    if (c.t > 9) { c.saving = null; clanThink(e); }
  },
  drag(e, c, d, dt) {   // bent over, hauling it backwards by the wrists, away from you, its eyes on you
    const w = c.saving; if (!w || w.dead || w.cl.st !== 'down') { c.saving = null; c.dragK = 0; return clanThink(e); }
    if (!c.dest) c.dest = clanAway(e, 480);
    const L = clanMove(e, c.dest.x, c.dest.y, CL.walk * 1.05, dt); c.cr = 0.55; c.dragK = 1;
    const a = Math.atan2(c.dest.y - e.y, c.dest.x - e.x); c.faceW = a + Math.PI; c.o.facing = 1;   // walking backwards, facing the one it drags
    w.x = e.x - Math.cos(a) * 60; w.y = e.y - Math.sin(a) * 60; w.cl.dragged = 0.2; w.cl.faceW = w.cl.face = a + Math.PI;   // its feet toward you, its head toward the one dragging it
    if ((c.o.g = (c.o.g ?? 2) - dt) <= 0) { c.o.g = 2.5 + Math.random() * 2; clanSay(w, 'grunt', 0.7); }
    if (L < 15 || c.stuck > 1.2 || (c.unseenT > 2 && d > 320)) {   // far enough: off together, and the hurt one lives
      c.saving = null; c.dragK = 0; w.hp = Math.max(w.hp, w.maxHp * 0.5); w.cl.hp0 = w.hp; w.cl.dragged = 0;
      clanGo(w, 'leave'); clanGo(e, 'leave'); w.cl.done = e.cl.done = 1;
    }
  },
  mourn(e, c, d, dt) {   // to the body: down on its knees beside it, a hand on it, a wail
    const B = c.o.body; if (!B) return clanThink(e);
    const L = clanMove(e, B.x + Math.cos(c.o.a ?? (c.o.a = Math.random() * 6.283)) * 18, B.y + Math.sin(c.o.a) * 18, CL.run * 0.8, dt);
    if (L < 6) {
      c.cr = 1; c.faceW = Math.atan2(B.y - e.y, B.x - e.x); c.o.facing = 1; c.kneel = 1;
      if (!c.gest || c.gest.k !== 'touch') c.gest = { k: 'touch', t: S.t };
      c.o.at = (c.o.at || 0) + dt;
      if (!c.o.said && c.o.at > 0.6) { c.o.said = 1; clanSay(e, 'wail'); }
      if (c.o.at > 4 + 3 * c.seed) { c.kneel = 0; clanThink(e); }
    }
    if (d < 100) { c.kneel = 0; clanReact(e); }
    if (c.t > 14) { c.kneel = 0; clanThink(e); }
  },
  // ---- the leader: holds back, watching; points at you and sends the others ----
  command(e, c, d, dt) {
    c.cr = 0.15; c.stare = 1;
    if (!c.o.init) { c.o.init = 1; c.gest = { k: 'point', t: S.t }; clanSay(e, 'yell'); }
    if (c.t > 0.9 && !c.o.sent) {
      c.o.sent = 1;
      const M = clanList().filter(o => o !== e && o.cl.band === c.band && o.cl.eng && ['watch', 'circle', 'approach', 'search'].includes(o.cl.st));
      const o = M.sort((a, b) => a.cl.d - b.cl.d)[0];
      if (o) { o.cl.allies = clanAllies(o); const k = clanTokFree() && clanConf(o) > 0.25 ? 'attack' : wpick([['threat', 1], ['flank', 0.6], ['approach', 0.6]]); o.cl.lookT = S.t; o.cl.lookAt = { x: e.x, y: e.y }; clanLater(0.5, 'chatter', o, 0.7); clanGo(o, k); }
    }
    if (c.t > 2) clanGo(e, 'watch');
  },
  // ---- in the trees: across to the next trunk, or down onto you ----
  leap(e, c, d, dt) {
    const o = c.o, u = Math.min(1, c.t / o.T);
    e.x = lerp(o.x0, o.x1, u); e.y = lerp(o.y0, o.y1, u); c.z = lerp(o.z0, o.z1, u) + Math.sin(Math.PI * u) * 22; c.flyK = 1; c.cr = 0.5;
    c.faceW = Math.atan2(o.y1 - o.y0, o.x1 - o.x0); c.o.facing = 1;
    if (u >= 1) { c.flyK = 0; clanSnd('rustle', e.x, e.y, 1.2); c.post = o.post; clanGo(e, 'perch'); }
  },
  pounce(e, c, d, dt) {   // off the branch and down on you
    const o = c.o, u = Math.min(1, c.t / o.T);
    if (!o.init) { o.init = 1; clanSay(e, 'scream'); c.gest = { k: 'scream', t: S.t }; }
    const p = S.p; o.x1 = lerp(o.x1, p.x, dt * 3); o.y1 = lerp(o.y1, p.y, dt * 3);
    e.x = lerp(o.x0, o.x1, u); e.y = lerp(o.y0, o.y1, u); c.z = Math.max(0, lerp(o.z0, 0, u * u) + Math.sin(Math.PI * u) * 10); c.flyK = 1;
    c.faceW = Math.atan2(p.y - e.y, p.x - e.x); c.o.facing = 1;
    if (u >= 1) { c.flyK = 0; c.z = 0; clanSnd('thud', e.x, e.y); addShake(0.12); clan().tok = e; clanGo(e, 'attack', { now: 1, landed: 1 }); }
  },
});
// a leap to the next tree, or down onto you: called from the perch
function clanPerchMove(e, c, d) {
  const C = clan();
  if (d < 95 && d > 30 && clanTokFree(true) && (C.rage > 0 || clanConf(e) > 0.35) && Math.random() < 0.6) {
    const o = { x0: e.x, y0: e.y, z0: c.z, x1: S.p.x, y1: S.p.y, T: 0.55 }; c.perched = 0; clanGo(e, 'pounce', o); return true;
  }
  if (Math.random() < 0.5 && c.post && c.post.t) {
    const t = propsNear(e.x, e.y, 150).filter(o => o !== c.post.t && o.kind === 'tree' && (o.type === 'oak' || o.type === 'cherry') && Math.hypot(o.x - e.x, o.y - e.y) > 50)[0];
    if (t) { const P2 = clanSpotAt(t, true); c.perched = 0; clanGo(e, 'leap', { x0: e.x, y0: e.y, z0: c.z, x1: P2.x, y1: P2.y, z1: t.s * 62, T: 0.7, post: { t, x: P2.x, y: P2.y, perch: 1 } }); clanSnd('rustle', e.x, e.y, 1.2); return true; }
  }
  return false;
}

// ---------------- their camps ----------------
// Three or four of them out in the woods, well away from your camp and the hunters' camps: a fire ringed with stones, a lean-to
// or two, bones about, an effigy on a pole. A band rests there; walk in and they're on their own ground.
const CL_CAMP_R = 260;
function clanCamps() {
  const D = S.day; if (!D) return [];
  if (D.clanCamps) return D.clanCamps;
  const out = [], rnd = (() => { let s = 7331; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let k = 0; k < 400 && out.length < 4; k++) {
    const a = rnd() * 6.283, d = 1500 + rnd() * 1600, x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (lakeAt(x, y, 260) || propsNear(x, y, 70).length || out.some(o => Math.hypot(o.x - x, o.y - y) < 1300)) continue;
    if (dayCampList().some(C => Math.hypot(C.x - x, C.y - y) < 1000)) continue;
    if (propsNear(x, y, 400).filter(o => o.kind === 'tree').length < 10) continue;   // in thick woods
    out.push({ x: Math.round(x), y: Math.round(y), a: rnd() * 6.283, seed: rnd() });
  }
  return (D.clanCamps = out);
}
const clanCampAt = (x, y, pad = 0) => clanCamps().find(k => Math.hypot(k.x - x, k.y - y) < CL_CAMP_R + pad);
// their fire: a light like yours, which isn't a refuge
function clanLights(add, fire) {
  if (!CLAN_ON || !S.day) return;
  const p = S.p;
  for (const k of clanCamps()) if (Math.hypot(k.x - p.x, k.y - p.y) < 900) { const f = 0.85 + 0.12 * Math.sin(S.t * 7 + k.seed * 9); add(k.x, 20, k.y, 200, f, 0.55 * f, 0.25 * f, 1); fire(k.x, k.y, 0.8); tongues(k.x, k.y, 0.85); }
}
function clanCampDraw() {
  if (!CLAN_ON || !S.day) return;
  const p = S.p;
  for (const k of clanCamps()) {
    if (Math.hypot(k.x - p.x, k.y - p.y) > 1000) continue;
    const g = () => 0, at = (r, a) => [k.x + Math.cos(k.a + a) * r, k.y + Math.sin(k.a + a) * r];
    // the fire pit: a ring of stones, charred logs
    for (let i = 0; i < 9; i++) { const [x, y] = at(17, i / 9 * 6.283); blob(PT.ball, x, g(x, y) + 2, y, 7, 5, 6, i, hex(i % 2 ? '#6f6c66' : '#85827b')); }
    for (let i = 0; i < 4; i++) { const [ax, ay] = at(13, i * 1.6), [bx, by] = at(4, i * 1.6 + 2.6); between(PT.rod, ax, g(ax, ay) + 1.5, ay, bx, g(bx, by) + 6, by, 2, hex('#3a2a1e')); }
    // lean-tos: poles on a ridge, branches leaning on them
    for (const s of [0, 1]) {
      const b = s ? 2.3 : -1.9, [cx, cy] = at(95 + 15 * s, b), fa = k.a + b + Math.PI, ux = Math.cos(fa + Math.PI / 2), uy = Math.sin(fa + Math.PI / 2), h0 = g(cx, cy);
      between(PT.rod, cx - ux * 28, h0 + 30, cy - uy * 28, cx + ux * 28, h0 + 30, cy + uy * 28, 2, hex('#5a4330'));
      for (const e of [-1, 1]) between(PT.rod, cx + ux * 26 * e, h0, cy + uy * 26 * e, cx + ux * 26 * e, h0 + 31, cy + uy * 26 * e, 1.8, hex('#5a4330'));
      for (let i = 0; i < 9; i++) { const o = -24 + i * 6, x0 = cx + ux * o, y0 = cy + uy * o, bx = x0 - Math.cos(fa) * 30, by = y0 - Math.sin(fa) * 30; between(PT.rod, bx, g(bx, by), by, x0, h0 + 31, y0, 1.6, hex(i % 3 ? '#4d3a28' : '#3f5a34')); }
    }
    // bones about the fire
    for (let i = 0; i < 7; i++) { const [x, y] = at(40 + 30 * ((i * 0.37 + k.seed) % 1), i * 0.9 + 0.4), r = i * 1.7; between(PT.rod, x - Math.cos(r) * 6, g(x, y) + 1, y - Math.sin(r) * 6, x + Math.cos(r) * 6, g(x, y) + 1, y + Math.sin(r) * 6, 0.9, hex('#ddd4bc')); blob(PT.ball, x + Math.cos(r) * 6, g(x, y) + 1.2, y + Math.sin(r) * 6, 2.2, 2, 2.2, 0, hex('#e2dac4')); }
    // their effigy: a pole and a crosspiece, a skull, limbs hung from it
    { const [x, y] = at(60, 0.6), h = g(x, y), fa = k.a + 0.6, ux = Math.cos(fa + Math.PI / 2), uy = Math.sin(fa + Math.PI / 2);
      between(PT.rod, x, h, y, x, h + 58, y, 2.2, hex('#5a4330')); between(PT.rod, x - ux * 20, h + 44, y - uy * 20, x + ux * 20, h + 44, y + uy * 20, 1.8, hex('#5a4330'));
      blob(PT.ball, x, h + 62, y, 8, 9, 8, -fa, hex('#e4dcc6')); blob(PT.ball, x + Math.cos(fa) * 3 + ux * 2.4, h + 63, y + Math.sin(fa) * 3 + uy * 2.4, 2.4, 2.8, 2, 0, hex('#1e1a16')); blob(PT.ball, x + Math.cos(fa) * 3 - ux * 2.4, h + 63, y + Math.sin(fa) * 3 - uy * 2.4, 2.4, 2.8, 2, 0, hex('#1e1a16'));
      for (const e of [-1, 1]) { const hx = x + ux * 18 * e, hy = y + uy * 18 * e; between(PT.rod, hx, h + 44, hy, hx, h + 30, hy, 0.5, hex('#3a2c20')); between(PT.limb, hx, h + 30, hy, hx, h + 14, hy, 2.4, hex('#b88a66')); } }
  }
}

// ---------------- being caught ----------------
// The first time they beat you by day you don't die: you wake in one of their camps, hurt, with the band gone off. Get out.
function clanCapture() {
  const D = S.day, rg = S.rg;
  if (!CLAN_ON || !D || D.clanCaught || ARENA) return false;
  const p = S.p, K = clanCamps().slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  if (!K) return false;
  D.clanCaught = 1; clanAngAdd(5);
  rg.hp = Math.max(1, Math.ceil(rg.maxHp / 2)); rg.inv = 4; D.bleed = 0;
  for (const e of clanList()) e.dead = e.gone = true;
  const C = clan(); C.bands = []; C.rage = 0; C.tok = null; C.reinf = 0; C.gap = 40; C.bandT = 70; C.campT = 90;
  p.x = K.x + Math.cos(K.a + 3.6) * 70; p.y = K.y + Math.sin(K.a + 3.6) * 70; p.vx = p.vy = 0; S.cam.x = p.x; S.cam.y = p.y; worldDirty = true;
  S.rg.ringMsg = { text: 'They dragged you to their camp', sub: 'You came to by their fire. Get out before they come back', t: 0 };
  addShake(0.4);
  for (let i = 0; i < 2; i++) { const a = Math.random() * 6.283; clanLater(4 + i * 3, 'yell', { x: p.x + Math.cos(a) * 700, y: p.y + Math.sin(a) * 700, vp: 110 + Math.random() * 40 }, 0.9); }
  return true;
}
