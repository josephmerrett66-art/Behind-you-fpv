// ================= Daylight's cannibals, reading you =================
// Joe: what you do should decide what they do. Every frame they read you: where you're looking, whether you're coming at
// them, how much of a fight you've put up, whether your back is turned, whether you've stood quietly, run, or got hurt.
// Each of them answers that straight away (it doesn't wait for its turn to come round), and it looks after its own skin.

function clanRead(dt) {   // what you're up to, as the clan sees it (once a frame)
  const C = clan(), p = S.p, rg = S.rg, R = C.rd || (C.rd = { aggr: 0, stillT: 0, calmT: 0, atk: null, hpK: 1, hp: null, hurtT: -99, sp: 0 });
  R.sp = Math.hypot(p.vx, p.vy);
  R.stillT = R.sp < 15 ? R.stillT + dt : 0;
  R.calmT += dt;
  if (p.atk && p.atk !== R.atk) { R.atk = p.atk; if (clanList().some(e => e.cl.eng && e.cl.d < 260)) { R.aggr += 0.18; R.calmT = 0; } }   // swinging at them
  R.aggr = clamp(R.aggr - dt * 0.025, 0, 2.5);   // and it fades again if you leave them be
  R.hpK = rg.hp / rg.maxHp; if (R.hp !== null && rg.hp < R.hp) R.hurtT = S.t; R.hp = rg.hp;
}
const clanRd = () => clan().rd || { aggr: 0, stillT: 0, calmT: 0, hpK: 1, hurtT: -99, sp: 0 };
const clanAggK = () => clamp(clanRd().aggr / 1.5, 0, 1);   // how much of a fight you've put up lately: hits, kills, swings
const clanCalm = () => { const R = clanRd(); return R.stillT > 5 && R.calmT > 10; };   // you've stood quietly and left them alone
const clanHurtK = () => { const R = clanRd(); return (1 - R.hpK) * 0.6 + (S.t - R.hurtT < 4 ? 0.25 : 0); };   // you're bleeding: they smell it

// where your eyes are: on it, or your back to it
function clanEye(e, c, d, dt) {
  const p = S.p, da = Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), S.aimW)), w = Math.max(0.3, Math.atan2(32, Math.max(d, 1)));
  const was = c.eyed; c.eyed = c.vis && da < w;
  c.eyedT = c.eyed ? (c.eyedT || 0) + dt : 0;
  c.backT = da > 1.9 ? (c.backT || 0) + dt : 0;
  c.caught = c.eyed && !was;   // you've just turned and looked straight at it
  c.yield = Math.max(0, (c.yield || 0) - dt / 40);
  c.wary = Math.max(0, (c.wary || 0) - dt / 60);
  c.pushT = c.closing > 18 && d < 260 ? (c.pushT || 0) + dt : 0;
}

// its answer to what you just did, there and then; true if it changed what it's doing
const CL_CALM = ['watch', 'circle', 'approach', 'stalk', 'hide', 'search', 'inspect', 'command'];
function clanAnswer(e, c, d, dt) {
  if (!c.eng || !CL_CALM.includes(c.st) || c.z > 0 || clan().rage > 0) return false;
  const p = S.p, lit = !!clanRefugeAt(p.x, p.y, 40);
  if ((c.ansT = (c.ansT || 0) - dt) > 0) return false;
  const go = (st, o, cd = 1.2) => { c.ansT = cd; clanGo(e, st, o); return true; };
  // caught creeping up on you: it freezes where it is, ducks behind a trunk, or stands up tall at you
  if (c.caught && (c.st === 'stalk' || c.st === 'approach') && d < 420) {
    c.allies = clanAllies(e); const conf = clanConf(e); c.flinch = Math.max(c.flinch || 0, 0.5);
    if (conf > 0.55 && Math.random() < 0.6) { clanSay(e, 'growl', 0.8); return go('watch', { pose: 0.12 }); }
    if (Math.random() < 0.25 + c.fear * 0.6) return go('hide');
    return go('watch', { pose: 0.88, frozen: 1 });
  }
  // you hold its eye, close: the timid ones can't bear it and back off, the bold ones scream at you, the rest look away
  if (c.st === 'watch' && c.eyedT > 3 + 2 * c.P.cur && d < 230 && !c.o.gz) {
    c.o.gz = 1; c.allies = clanAllies(e); const conf = clanConf(e);
    if (c.fear > 0.55 || conf < 0) return go('retreat');
    if (conf > 0.45 && !lit && Math.random() < 0.6) return go('threat', { k: pick(['scream', 'beat', 'bluff']) });
    c.lookAt = { x: e.x + Math.cos(c.face + 1.2) * 50, y: e.y + Math.sin(c.face + 1.2) * 50 }; c.lookT = S.t;
  }
  // your back's turned: it comes in
  if (c.st === 'watch' && !lit && c.backT > 1.2 + 2.5 * (1 - c.P.agg) + 2 * c.fear && d > 90 && d < 520 && !c.o.bk) {
    c.o.bk = 1;
    if (Math.random() < 0.35 + 0.5 * c.P.cur + 0.4 * c.P.agg + clanHurtK() - 0.5 * clanAggK() - 0.6 * c.wary) return go('stalk');
  }
  // you've stood quietly a while: it can't help coming a bit nearer for a look
  if (c.st === 'watch' && clanCalm() && c.t > 2 && !c.o.cm && d > 140) {
    c.o.cm = 1;
    if (Math.random() < 0.3 + 0.6 * c.P.cur - c.fear * 0.5) return go('approach', { calm: 1 });
  }
  return false;
}

// you've walked at it (or rushed it) again and again: it gives ground a couple of times, then it won't
function clanPushed(e) {
  const c = e.cl, hurt = e.hp < e.maxHp * 0.6;
  c.allies = clanAllies(e); const conf = clanConf(e);
  if (hurt || c.wary > 0.5) { clanGo(e, c.fear > 0.6 ? 'flee' : 'retreat', { dist: 300 }); return true; }   // it looks after itself
  if ((c.yield || 0) >= 1.6 && conf > 0.15 - 0.2 * c.P.agg) {   // not again: it stands its ground
    c.yield = 0.8;
    if (clanTokFree(true) && conf > 0.4 && Math.random() < 0.4 + 0.4 * c.P.agg) clanGo(e, 'attack', { now: 1 });
    else clanGo(e, 'threat', { k: pick(['scream', 'beat', 'bluff', 'fake']) });
    return true;
  }
  c.yield = (c.yield || 0) + 1;
  return false;   // the usual answer
}

// one of them hit near the others: the bold ones come for you, the timid ones scatter, the rest flinch and stare
function clanFriendHit(e) {
  const p = S.p;
  for (const o of clanList()) {
    if (o === e || !o.cl || o.cl.z > 0 || ['down', 'drag', 'rescue', 'attack', 'mourn', 'leave', 'flee', 'hdart', 'hwarn', 'pounce'].includes(o.cl.st)) continue;
    if (Math.hypot(o.x - e.x, o.y - e.y) > 380) continue;
    const c = o.cl; c.lookAt = { x: e.x, y: e.y }; c.lookT = S.t; c.fear += 0.08; c.wary = Math.max(c.wary || 0, 0.3);
    if (!c.eng) { clanNotice(o, true); continue; }
    c.allies = clanAllies(o); const conf = clanConf(o);
    if (conf > 0.55 && c.P.agg > 0.45 && !clanRefugeAt(p.x, p.y, 40)) { if (clanTokFree(true) && Math.random() < 0.5) clanGo(o, 'attack', { now: 1 }); else clanGo(o, 'threat', { k: 'bluff' }); }
    else if (c.fear > 0.6 || conf < 0.05) clanGo(o, 'retreat');
    else if (Math.random() < 0.5) { clanSay(o, 'growl', 0.7); c.flinch = 0.4; }
  }
}

Object.assign(CLAN_ST, {
  stalk(e, c, d, dt) {   // your back's turned: it comes in, low and quick, and stops dead when you look round
    const p = S.p;
    if (!c.o.init) { c.o.init = 1; c.o.stop = Math.max(clanHomeR(e), clamp(115 + 80 * c.fear - 60 * c.P.agg, 60, 190)); }
    c.cr = 0.8;
    if (d > c.o.stop) clanMove(e, p.x, p.y, CL.walk * (c.backT > 0.3 ? 1.3 : 0.5), dt);
    else {
      c.stare = 1; c.want = 0; c.o.held = (c.o.held || 0) + dt;
      c.allies = clanAllies(e);
      if (c.backT > 0.4 && clanTokFree() && clanConf(e) > 0.3 && Math.random() < dt * (0.4 + c.P.agg + (c.P.opp ? 0.5 : 0) + clanHurtK())) return clanGo(e, 'attack');   // from behind you
      if (c.o.held > (c.backT > 0 ? 10 : 3)) return clanGo(e, 'watch', { pose: 0.85 });   // crouched there behind you, waiting its moment
    }
    if (c.t > 12 || c.stuck > 0.8 || clanRefugeAt(p.x, p.y, 40)) clanGo(e, 'watch');
  },
  hide(e, c, d, dt) {   // you looked straight at it: it slips behind the nearest trunk and peers round at you
    const p = S.p;
    if (!c.o.init) {
      c.o.init = 1; let best = null, bd = 1e9;
      for (const t of propsNear(e.x, e.y, 170)) if (t.kind === 'tree' && t.type !== 'dead') { const k = Math.hypot(t.x - e.x, t.y - e.y) - 0.3 * Math.hypot(t.x - p.x, t.y - p.y); if (k < bd) { bd = k; best = t; } }
      if (!best) return clanGo(e, 'retreat');
      const a = Math.atan2(best.y - p.y, best.x - p.x), r = best.r * best.s + 12; c.o.G = { x: best.x + Math.cos(a) * r, y: best.y + Math.sin(a) * r };
      clanSay(e, Math.random() < 0.5 ? 'click' : 'grunt', 0.6);
    }
    const L = clanMove(e, c.o.G.x, c.o.G.y, CL.run, dt); c.cr = 0.6;
    if (L < 8) { c.cr = 0.9; c.stare = 1; c.o.at = (c.o.at || 0) + dt; if (c.o.at > (c.o.atT ??= 2 + Math.random() * 3)) return clanGo(e, 'watch', { pose: 0.85 }); }
    if (c.t > 6 || c.stuck > 0.5) clanGo(e, 'watch');
  },
});
ENGAGED.push('stalk', 'hide');
