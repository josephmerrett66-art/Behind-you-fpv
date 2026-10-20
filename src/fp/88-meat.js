// ================= the body stays where it fell, and a knife cuts it up (Joe) =================
// Joe: "when something dies, like a deer or a rabbit or a cannibal, their body falls ... and then you can equip a knife and
// skin the body or harvest the body's remains." The way The Forest, Red Dead and Green Hell do it:
//   - whatever you kill topples over where it is (one shot out of a tree drops to the ground) and lies there. Nothing comes
//     into your pack by itself any more.
//   - stand over it with a knife and press Use: you kneel to it and cut, a piece at a time: the hide first, then the meat, then
//     bone and the rest, each one into your pack as it comes free. A better knife is quicker; a bear takes longer than a rabbit.
//     Walk off (or get hit) and you stop, and what's left stays on it for later.
//   - a knife on your hotbar but something else in your hand: Use takes the knife out for you. No knife: it says so.
//   - a cannibal's club and flint fall by it as before (79-spoils); its bone, hide and teeth are in the body, for the knife.
//   - cut up, what's left lies there red and raw a while. Left whole, a body lasts most of a day before something drags it off.
const CUT = { R: 40, life: 600, left: 90, cap: 14, capC: 10,
  T: { rabbit: 1.4, deer: 3.2, boar: 3.6, wolf: 3, bear: 5.5, lizard: 0.9, grouse: 1.1, turtle: 1.6 }, clanT: 3.6,
  ord: { hide: 0, feather: 0, meat: 1, shell: 2, bone: 2, ctooth: 3, fang: 3, antler: 3 } };
const CUT_RAW = hexK('#7a2620');
CHIP_COL.blood = ['#6e1610', '#8a2016', '#4a0e0a'];
// the fall: over it goes, faster as it goes, and a little bounce as it hits the ground
const cutFallK = t => { const u = clamp((t ?? 9) / 0.55, 0, 1); return u < 0.78 ? (u / 0.78) * (u / 0.78) : 1 + 0.07 * Math.sin((u - 0.78) / 0.22 * Math.PI); };
const isKnife = id => !!(id && DIT[id] && DIT[id].wpn === 'knife');
function cutKnife() {   // 'held', a hotbar slot to take it from, 'pack', or null
  const D = S.day, s = heldSlot(); if (s && isKnife(s.id)) return 'held';
  for (let i = 0; i < HOTN; i++) if (D.inv[i] && isKnife(D.inv[i].id)) return i;
  return D.inv.some(q => q && isKnife(q.id)) ? 'pack' : null;
}
const cutKey = () => inputMode === 'pad' ? 'X' : inputMode === 'touch' ? 'Use' : 'E';
const cutSort = L => L.sort((a, b) => (CUT.ord[a] ?? 2) - (CUT.ord[b] ?? 2));
function cutAdd(g, id, n) { if (!g || n <= 0) return; for (let i = 0; i < n; i++) g.cut.push(id); cutSort(g.cut); g.cutN = g.cut.length; }
function cutBody(g) { if (g && !g.cut) { g.cut = []; g.cutN = 0; g.life = CUT.life; } return g; }   // a cannibal's (or a pale one's) body
// where a body is: an animal lies where it stood; one of them pitched forward onto its face, so its middle is ahead of its feet
function cutPos(r) {
  const P = r._pos || (r._pos = {});
  if (r.e) { const f = r.face || 0; P.x = r.x + Math.cos(f) * 16; P.y = r.y + Math.sin(f) * 16; P.s = 12; P.h = 6; P.name = r.e.cl && r.e.cl.cave ? 'pale one' : 'cannibal'; }
  else { const B = BEAST[r.k]; P.x = r.x; P.y = r.y; P.s = B.w * 0.55; P.h = Math.max(2.5, B.h * 0.3); P.name = r.k; }
  return P;
}
// an animal goes down: it topples and lies there, all it's worth still in it
function cutDrops(b) {   // the main game's own drops (beastDie), and a bone from a deer, and the clean kill's extra cut
  const drop = Object.assign({}, BEAST[b.k].drop); if (drop.hide && Math.random() < 0.3 * sr('skinner')) drop.hide++;
  if (b.k === 'wolf' && Math.random() < 0.6) drop.fang = 1; else if (b.k === 'bear') drop.fang = 2; else if (b.k === 'deer' && Math.random() < 0.4) drop.antler = 1;
  if (b.k === 'deer') drop.bone = (drop.bone || 0) + 1;
  if (b.clean && !critOf(b)) drop.meat = (drop.meat || 0) + 1;
  return cutSort(Object.entries(drop).flatMap(([k, n]) => Array(n).fill(k)));
}
{ const bd = beastDie; beastDie = function (b) {
  if (b.dead) return;
  if (!BEAST[b.k]) return bd.call(this, b);
  if (HUNT.by && HUNT.zone === 2) b.clean = 1;
  const p = S.p, d = Math.hypot(b.x - p.x, b.y - p.y), far = d > HUNT.near * 1.6, crit = critOf(b);
  b.dead = true; b.dieT = 0; b.carc = 1; b.carcT = S.t; b.cut = cutDrops(b); b.cutN = b.cut.length; b.skin = 0;
  dayKillLog(b.k);
  huntBlood(b.x, b.y, crit ? 2 : 5, crit ? 1 : 2.2);
  if (actx && !snd('body_fall', { x: b.x, y: b.y, far: 1400, at: crit ? 0.05 : 0.4, v: crit ? 0.35 : BEAST[b.k].big ? 1.3 : 1 })) { const out = placeOut(b.x, b.y, 1, 1400, b, 1.5); if (out) boomAt(actx.currentTime + (crit ? 0.05 : 0.4), 90, 40, 0.3, crit ? 0.15 : BEAST[b.k].big ? 0.7 : 0.5, out); }   // the thud as it hits the ground
  if (b.wound && !HUNT.by && far) exNote(`you hear the ${b.k} go down · follow the blood`, true);
  else cutTell(b, far);
}; }
function cutTell(r, far) {   // what to do with it: the first time it says how; with no knife, that you need one
  const D = S.day, P = cutPos(r), kn = cutKnife();
  if (!D.told.butch) { D.told.butch = 1; exNote(kn === null ? `the ${P.name} lies where it fell · you need a knife to cut it up · a flint knife: 1 stick, 2 flint, 2 fibre, by hand` : `the ${P.name} lies where it fell · stand over it with a knife and press ${cutKey()} to cut it up`, true); return; }
  if (r.e) { if (kn === null) exNote('you need a knife to cut it up', true); return; }   // the clan's own line has said it's dead
  exNote(far ? `the ${P.name} is down · go and cut it up` : kn === null ? `a ${P.name} down · you need a knife to cut it up` : `a ${P.name} down · cut it up`, true);
}
// what's in reach to cut up: the nearest body with anything left on it
function cutNear() {
  const D = S.day, p = S.p; let best = null, bd = CUT.R;
  for (const b of D.beasts) if (b.carc && b.cut && b.cut.length) { const P = cutPos(b), d = Math.hypot(P.x - p.x, P.y - p.y) - P.s; if (d < bd) { bd = d; best = b; } }
  const C = S.rg && S.rg.clan;
  if (C) for (const g of C.dead) if (g.cut && g.cut.length) { const P = cutPos(g), d = Math.hypot(P.x - p.x, P.y - p.y) - P.s; if (d < bd) { bd = d; best = g; } }
  if (!best) return null;
  const P = cutPos(best), o = best._cp || (best._cp = { kind: 'dbody', ref: best }); o.x = P.x; o.y = P.y;
  return { o, d: bd };
}
{ const ut = dayUseTarget; dayUseTarget = function () {
  const best = ut(), D = S.day; if (!D || !S.rg) return best;
  if (D.butch) return D.butch.r._cp || best;   // cutting: it stays on the body
  const c = cutNear(); if (!c) return best;
  if (!best) return c.o;
  if (cutKnife() === null) return best;   // no knife: whatever else is here comes first (the club it dropped, say)
  return Math.hypot(best.x - S.p.x, best.y - S.p.y) + 6 < c.d ? best : c.o;
}; }
{ const du = dayUse; dayUse = function () {
  const D = S.day, rg = S.rg;
  if (D && rg && rg.phase === 'fight' && S.running) {
    if (D.butch) return;
    const o = dayUseTarget(); if (o && o.kind === 'dbody') { cutStart(o.ref); return; }
  }
  return du.apply(this, arguments);
}; }
// cutting it up
function cutStart(r) {
  const D = S.day, kn = cutKnife(), P = cutPos(r);
  if (kn === null) { dayNote('butchk', `you need a knife to cut up the ${P.name} · a flint knife: 1 stick, 2 flint, 2 fibre, by hand`, 3); return; }
  if (kn === 'pack') { dayNote('butchk', 'your knife is in your pack · put it on your hotbar to use it', 3); return; }
  if (typeof kn === 'number') daySelect(kn);
  const T = heldIt(), tot = (r.e ? (r.e.cl && r.e.cl.old ? 5.5 : CUT.clanT) : CUT.T[r.k] ?? 2.5) / (0.55 + 0.5 * (T.dmg || 1));
  D.butch = { r, k: tot / Math.max(1, r.cutN), s: 0, x0: S.p.x, y0: S.p.y, hp: S.rg.hp, got: {} };
  S.p.vx *= 0.3; S.p.vy *= 0.3; S.p.atk = null;
  cutStroke(D.butch, true);
}
function cutStroke(c, first) { c.mid = 0; dayAct(11, c.k * 1.08); if (!first) S.p.act.cont = 1; }
function cutGone(r) { if (r.e) { const C = S.rg.clan; return !C || !C.dead.includes(r); } return !r.carc || !S.day.beasts.includes(r); }
function cutStep(dt) {
  const D = S.day, p = S.p, c = D.butch;
  D.butK = lerp(D.butK || 0, c ? 1 : 0, Math.min(1, dt * 7));
  if (!c) return;
  const r = c.r, P = cutPos(r), T = heldIt();
  const why = cutGone(r) || !r.cut.length ? 'gone' : S.rg.hp < c.hp - 0.01 ? 'hurt'
    : !T || T.wpn !== 'knife' || p.atk || D.draw || !craftEl.hidden || S.rg.phase !== 'fight' || Math.hypot(p.x - c.x0, p.y - c.y0) > 22 || Math.hypot(P.x - p.x, P.y - p.y) - P.s > CUT.R + 10 ? 'stop' : '';
  if (why) return cutEnd(why);
  c.s += dt;
  if (!c.mid && c.s > c.k * 0.5) { c.mid = 1; cutFx(P, r, 0.5); }   // the knife going in
  if (c.s >= c.k) { c.s -= c.k; cutTake(c); if (r.cut.length) cutStroke(c); else cutEnd('done'); }
}
function cutTake(c) {   // one piece comes free, into your pack (what doesn't fit is left by it)
  const r = c.r, P = cutPos(r), id = r.cut.shift();
  if (r.quiver) { for (const [a, n] of Object.entries(r.quiver)) if (n > 0) { dayGive(a, n, P.x, P.y, true); c.back = (c.back || 0) + n; } r.quiver = null; r.stuck = null; }   // the arrows first
  dayGive(id, 1, P.x, P.y, true); c.got[id] = (c.got[id] || 0) + 1;
  wpPop('+1 ' + DIT[id].n.toUpperCase(), P.x, P.y, P.h + 12, '255,214,170', 0.6);
  if (!r.e) r.skin = 1 - r.cut.length / r.cutN;
  cutFx(P, r, 1);
}
function cutFx(P, r, k) {
  const p = S.p, toYou = Math.atan2(p.y - P.y, p.x - P.x);
  huntBlood(P.x + (Math.random() - 0.5) * P.s, P.y + (Math.random() - 0.5) * P.s, 1, 0.8 + k);
  dayChips(P.x, P.y, P.h, 'blood', Math.round(2 + 4 * k), toYou, 0.6);
  if (actx && !snd('meat_cut', { x: P.x, y: P.y, v: 0.7 + 0.3 * k })) { const t = actx.currentTime, out = placeOut(P.x, P.y, 1, 500, r, 1) || sfxGain;
    noiseAt(t, 1300 + Math.random() * 700, 700, 0.12 + 0.1 * k, 0.16 + 0.08 * k, out);   // the slice, wet
    if (k >= 1) { noiseAt(t + 0.06, 520 + Math.random() * 200, 300, 0.24, 0.2, out); boomAt(t, 150, 70, 0.06, 0.14, out); } }   // and the tear as it comes away
}
function cutEnd(why) {
  const D = S.day, c = D.butch; D.butch = null;
  if (S.p.act && S.p.act.pose === 11) S.p.act = null;
  const r = c.r, P = cutPos(r), list = Object.entries(c.got).map(([k, n]) => `${n} ${DIT[k].n.toLowerCase()}`).concat(c.back ? [`${c.back} arrow${c.back > 1 ? 's' : ''} back`] : []).join(' · ');
  if (why === 'done') {
    r.cutDone = S.t; if (r.e) r.life = r.t + CUT.left; else r.skin = 1;
    dayWear(); exNote(`the ${P.name} is cut up${list ? ' · ' + list : ''}${r.clean ? ' · a clean kill' : ''}`, true);
    huntBlood(P.x, P.y, 3, 1.6);
  } else if (why !== 'gone' && list) exNote(`${why === 'hurt' ? 'you\'re hit · ' : ''}you stop cutting · ${list} · more left on it`, true);
  else if (why === 'hurt') exNote('you\'re hit · you stop cutting', true);
  dayChanged();
}
// the bodies: an animal's lasts till it's cut up and a while after (or most of a day left whole), and no more than so many at once
{ const bs = beastStep; beastStep = function (dt) {
  bs(dt);
  const D = S.day; if (!D) return;
  cutStep(dt);
  let n = 0;
  for (let i = D.beasts.length - 1; i >= 0; i--) { const b = D.beasts[i]; if (!b.carc) continue;
    if (b.cut && !b.cut.length ? S.t - (b.cutDone ?? b.carcT) > CUT.left : S.t - b.carcT > CUT.life) b.carc = 0;   // gone: something's had it
    else if (++n > CUT.cap && !(D.butch && D.butch.r === b)) b.carc = 0; }
}; }
// a cannibal's body keeps its rig only near you, so the living always have theirs; one shot out of a tree drops to the ground
function cutRigOff(g) { const R = g.rig; if (!R) return; R.keep = false; R.owner = null; R.mesh.visible = R.edge.visible = false; g.rig = null; }
const CUT_RIG = clanRig;
clanRig = function (vi) {
  const R = CUT_RIG(vi); if (R) return R;
  const C = S.rg && S.rg.clan; if (!C) return null;
  let g0 = null, d0 = -1; for (const g of C.dead) if (g.rig && !(S.day && S.day.butch && S.day.butch.r === g)) { const d = Math.hypot(g.x - S.p.x, g.y - S.p.y) + (g.rig.vi === vi ? 1e5 : 0); if (d > d0) { d0 = d; g0 = g; } }
  if (!g0) return null; cutRigOff(g0); return CUT_RIG(vi);   // the farthest body gives its rig up to the living (made over, if it must be: 80-pale)
};
{ const cd = clanDraw; clanDraw = function (now, dt) {
  const C = CLAN_ON && S.rg && S.rg.clan, p = S.p;
  if (C && C.dead.length) {
    const R0 = drawR() + 150;
    for (const g of C.dead) {
      if (g.z > 0) { g.vz = (g.vz || 0) - 320 * dt; g.z = Math.max(0, g.z + g.vz * dt); }
      if (g.rig && (Math.abs(g.x - p.x) > R0 || Math.abs(g.y - p.y) > R0)) cutRigOff(g);
    }
    while (C.dead.length > CUT.capC) { const i = C.dead.findIndex(g => !(S.day && S.day.butch && S.day.butch.r === g)); if (i < 0) break; cutRigOff(C.dead[i]); C.dead.splice(i, 1); }
  }
  cd(now, dt);
  if (C && C.dead.length) {
    const R0 = drawR();
    for (const g of C.dead) if (!g.rig && g.e.cl && g.t < (g.life || 40) && Math.abs(g.x - p.x) < R0 && Math.abs(g.y - p.y) < R0) {   // back in sight: lying as it was
      const R = CUT_RIG(g.e.cl.vi); if (!R) continue;
      R.owner = g.e; R.keep = true; g.rig = R; Object.values(R.cur).forEach(a => a.fill(0)); R.root = [0, 2]; R.px = R.py = R.vs = R.stepI = undefined;
    }
  }
}; }
// what it says: Butcher, and how far through you are
{ const dh = drawHud; drawHud = function (...a) {
  const r = dh.apply(this, a), D = S && S.day; if (!D || !S.rg) return r;
  const c = D.butch, o = c ? null : dayUseTarget(), R = c ? c.r : o && o.kind === 'dbody' ? o.ref : null, el = hudEl.prompt;
  if (R) {
    const P = cutPos(R), kn = c ? 'held' : cutKnife(), key = inputMode === 'kb' ? 'E · ' : inputMode === 'pad' ? 'X · ' : '';
    const t = c ? `CUTTING UP THE ${P.name.toUpperCase()}` : key + 'BUTCHER ' + P.name.toUpperCase() + (kn === null ? ' · NEEDS A KNIFE' : kn === 'pack' ? ' · KNIFE IS IN YOUR PACK' : '');
    if (el.textContent !== t) el.textContent = t;
    if (el.className !== 'cut') el.className = 'cut';
    const u = (R.cutN - R.cut.length + (c ? clamp(c.s / c.k, 0, 1) : 0)) / Math.max(1, R.cutN);
    el.style.setProperty('--cut', (u * 100).toFixed(1) + '%');
    if (useBtn.textContent !== 'Butcher') useBtn.textContent = 'Butcher';
    D.butHud = 1;
  } else if (D.butHud) { D.butHud = 0; el.className = ''; el.style.removeProperty('--cut'); promptKey = ''; }   // the main prompt has it back next frame
  return r;
}; }
