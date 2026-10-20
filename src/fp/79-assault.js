// ================= when they come for you: all at once, out to kill you (Joe) =================
// Joe: "they are pretty much always there meaning eventually it doesn't feel scary to see them... they should come for short
// periods of time but not close and not attacking so they feel mysterious and maybe then you drop your guard slightly then
// that is when they decide to attack you and really try to kill you. It needs to feel like they are going crazy being scary
// and threatening making you run for your house." Most of the time now you only glimpse them (79-pace). This is the rest.
// War cries go up out in the trees, one after another, and a few breaths later they all come at you together (72-clan's
// rage, the hunt after a kill, with no fear left in them). They don't stand and watch: each closes in screaming and beating
// its chest, and goes at you again and again, two at once from the fifth day. Run and they come after you; at a sprint you
// can just keep ahead of them, until your legs give out. Get inside your house with the doors shut and they pound on the
// walls and doors and scream round it (a wall in their way, they look for a gap, and if there isn't one they club it,
// ported stStep saying when they're through), and after a while they give it up. The fire pit on the hill and a
// hearthstone they won't come into; they wait at the edge, and give that up sooner. Kill or see off half of them and the
// rest break and run. At your camp one may go for a chest instead: kill it before it's away and it drops what it took.
const ASL = { len: [60, 90], warn: 4.5, blow: 0.6, gap: [3, 5], gapEarly: [5, 8], cd: [3, 5], two: 5, shut: [15, 25], safe: [14, 22] };   // gap: between one going at you and the next (the first few days, and after)
const assaultOn = () => { const C = S.rg && S.rg.clan; return !!(C && C.siege && C.siege.go && C.rage > 0); };
const aslSize = () => { const D = S.day; return (D.n <= 2 ? 2 : 3) + (D.n >= 5 && Math.random() < 0.5 ? 1 : 0) + (clanAngK() > 0.5 ? 1 : 0); };

function assaultStart(C, o = {}) {   // the war cries; they come in a few breaths later (assaultGo)
  const D = S.day, g = clanBand(o.n || aslSize(), { d: o.d || 430, noLead: D.n < 3 }), M = g ? bandOf(g) : []; if (!M.length) return false;
  const B = clanBase(), home = !!B && Math.hypot(S.p.x - B.x, S.p.y - B.y) < B.r + 60;
  C.siege = { at: S.t + ASL.warn, M, B: home ? { x: B.x, y: B.y, r: B.r } : null, n: M.length, gapT: 0, shutT: 0, safeT: 0 };
  for (const e of M) { e.cl.asl = 1; clanGo(e, 'muster'); }
  M.forEach((e, i) => clanLater(0.3 + i * (0.6 + Math.random() * 0.5), i % 3 === 1 ? 'yell' : i % 3 === 2 ? 'wail' : 'scream', e, 1.25));   // from all round you
  return true;
}
function assaultGo(C, G) {   // in they come, all of them
  G.go = 1; C.rage = rnd(ASL.len); C.more = 0; C.reinf = 0; C.tok = null;
  const M = G.M.filter(e => !e.dead && e.cl);
  const chests = G.B ? S.day.builds.filter(B => Array.isArray(B.inv) && !B.pen && !B.snare && !B.ftrap && B.inv.some(Boolean) && Math.hypot(B.x - G.B.x, B.y - G.B.y) < G.B.r + 60) : [];
  const thief = chests.length && M.length > 2 && Math.random() < 0.6 ? M.find(e => e.cl.kind === 'skinny') || M[M.length - 1] : null;
  for (const e of M) {
    const c = e.cl; c.hunter = 1; c.fear = 0; c.done = 0; c.P.agg = Math.max(c.P.agg, 0.7); c.climbing = 0; c.cd = Math.random() * 2;
    if (c.z > 0) { c.perched = 0; clanGo(e, 'drop'); } else if (e === thief) clanGo(e, 'loot', { B: pick(chests) }); else clanGo(e, 'raid');
  }
  addShake(0.12);
}
function assaultEnd(C, G) {   // it's over: they break off and go, every one of them
  C.rage = Math.min(C.rage, 0.01); C.tokT = 0;
  for (const e of G.M) if (!e.dead && e.cl && !e.cl.loot) { e.cl.hunter = 0; e.cl.done = 1; e.cl.asl = 0; clanGo(e, 'leave'); }
  G.over = 1;
}
function assaultStep(dt) {
  const C = S.rg && S.rg.clan, G = C && C.siege; if (!G) return;
  if (!G.go) { if (S.t >= G.at) assaultGo(C, G); return; }
  if (!(C.rage > 0) || G.over) { if (!G.over) assaultEnd(C, G); C.siege = null; return; }
  const p = S.p, live = G.M.filter(e => !e.dead && e.cl && e.cl.hunter && !e.cl.done && e.cl.st !== 'flee');
  if (live.length <= G.n / 2) return assaultEnd(C, G);   // you've killed or seen off half of them: the rest break and run
  // your house, or the fire pit or a hearthstone: they keep at it a while, then give it up
  const safe = exSafeAt(p.x, p.y, 10), shut = !safe && stShutIn(p.x, p.y) && live.some(e => Math.hypot(e.x - p.x, e.y - p.y) < 220) && !live.some(e => !siegeWall(e, p.x, p.y) && Math.hypot(e.x - p.x, e.y - p.y) < 150);   // (from when they're at your walls)
  G.safeT = safe ? G.safeT + dt : Math.max(0, G.safeT - dt * 0.5); G.shutT = shut ? G.shutT + dt : Math.max(0, G.shutT - dt * 0.5);
  if (!G.giveS) { G.giveS = rnd(ASL.safe); G.giveH = rnd(ASL.shut); }
  if (G.safeT > G.giveS || G.shutT > G.giveH) return assaultEnd(C, G);
  G.gapT -= dt; C.tokT = 1e9;   // (whose turn it is to go at you is the raid's to say, not the hunt's after a kill)
  for (const e of live) {
    const c = e.cl;
    if (c.st === 'hunt' || (c.st === 'wait' && !safe) || (c.st === 'back' && c.t > 0.6)) clanGo(e, 'raid');   // no standing off: straight back at you
    if (safe && c.st === 'raid') clanGo(e, 'wait');
  }
}
{ const cs = clanStep; clanStep = function (dt) { cs(dt); if (CLAN_ON && S.day && S.rg.phase === 'fight') assaultStep(dt); }; }

// ---- while they're at it, only the fire pit and a hearthstone hold them off ----
{ const rf = clanRefugeAt; clanRefugeAt = function (x, y, pad = 0) { return assaultOn() ? exSafeAt(x, y, pad) : rf(x, y, pad); }; }
// a kill in the middle of it doesn't bring more running, nor keep them at it much longer
{ const cd = clanDied; clanDied = function (e) {
    const C = clan(), G = C.siege, r0 = C.rage, c = e.cl;
    if (c && c.loot) { dayDrop(e.x, e.y, c.loot.id, c.loot.n); c.loot = null; }   // what it took from your chest
    cd.apply(this, arguments);
    if (G && G.go) { C.rage = Math.min(C.rage, Math.max(r0, 0) + 10); C.reinf = 0; }
  }; }
// after a go at you it gets its breath for a moment, not the woods' long wait
{ const hd = CLAN_ST.hdart; CLAN_ST.hdart = function (e, c, d, dt) {
    const was = c.st; hd.apply(this, arguments);
    if (was === 'hdart' && c.st !== 'hdart' && c.asl && assaultOn()) { c.cd = rnd(ASL.cd); const G = clan().siege; if (G) G.gapT = rnd(S.day.n >= ASL.two ? ASL.gap : ASL.gapEarly); }
  }; }
// you got a wall or a door between you and it: the blow lands on that
{ const hu = hurt; hurt = function (e) { if (e && e.type === 'cannibal' && assaultOn() && stWallBetween(e.x, e.y, S.p.x, S.p.y)) return; return hu.apply(this, arguments); }; }

// the first of your walls or shut doors on the way from it to (x, y)
function siegeWall(e, x, y) {
  let best = null, bd = 1e9;
  for (const o of stNear((e.x + x) / 2, (e.y + y) / 2, Math.hypot(x - e.x, y - e.y) / 2 + 30)) {
    const P = PC(o.id); if (!o.done || !P.blk || P.sh !== 'edge' || (stDoorish(P) && o.open > 0.5)) continue;
    if (!segX(e.x, e.y, x, y, stFoot(o))) continue;
    const d = stDistTo(o, e.x, e.y); if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function segNear(f, x, y) { const dx = f.bx - f.ax, dy = f.by - f.ay, t = clamp(((x - f.ax) * dx + (y - f.ay) * dy) / (dx * dx + dy * dy || 1), 0.1, 0.9); return { x: f.ax + dx * t, y: f.ay + dy * t }; }
// the ways in to you: which way out from you is clear of walls and shut doors, and how far out the walls go (48 rays, 420 long)
let SG = { t: -9, x: 0, y: 0, rays: null, R: 0 };
function siegeGaps() {
  const p = S.p; if (S.t - SG.t < 0.5 && Math.hypot(p.x - SG.x, p.y - SG.y) < 10) return SG;
  SG = { t: S.t, x: p.x, y: p.y, rays: [], R: 0 };
  const W = wallRuns(p.x, p.y, 420, false);
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * TAU, ux = Math.cos(a), uy = Math.sin(a), bx = p.x + ux * 420, by = p.y + uy * 420; let near = 1e9;
    for (const f of W) if (segX(p.x, p.y, bx, by, f)) { const dx = f.bx - f.ax, dy = f.by - f.ay, den = ux * dy - uy * dx; if (Math.abs(den) < 1e-6) continue; const t = ((f.ax - p.x) * dy - (f.ay - p.y) * dx) / den; if (t > 0 && t < near) near = t; }
    SG.rays.push({ a, open: near > 420 }); if (near <= 420) SG.R = Math.max(SG.R, near);
  }
  SG.R = clamp(SG.R + 40, 80, 320);
  return SG;
}

Object.assign(CLAN_ST, {
  muster(e, c) { c.cr = 0.6; c.stare = 1; if (!assaultOn() && !(clan().siege && !clan().siege.go)) clanGo(e, 'leave'); },   // out of sight in the trees, crying out to the others: any moment now
  raid(e, c, d, dt) {   // straight for you: round to a way in if there's a wall between, through it, and at you whenever it can
    const C = clan(), G = C.siege, p = S.p; if (!assaultOn() || !G) return clanGo(e, 'leave');
    c.cd = (c.cd || 0) - dt; c.cr = 0.35;
    const w = siegeWall(e, p.x, p.y);
    if (!w) {   // nothing between you
      const going = G.M.filter(o => !o.dead && o.cl && (o.cl.st === 'hwarn' || o.cl.st === 'hdart')).length;
      if (going < (S.day.n >= ASL.two && G.n >= 3 ? 2 : 1) && G.gapT <= 0 && c.cd <= 0 && d < 230) { if (!C.tok) C.tok = e; G.gapT = 0.6; return clanGo(e, 'hwarn'); }
      if (!c.o.ring || S.t > c.o.ring.at) {   // round you, close, never still: screaming, beating its chest, feinting in
        const a = Math.atan2(e.y - p.y, e.x - p.x) + (Math.random() - 0.5) * 1.6, r = 55 + Math.random() * 55;
        c.o.ring = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, at: S.t + 0.8 + Math.random() * 1.4 };
        if (Math.random() < 0.55) { clanSay(e, pick(['scream', 'scream', 'growl', 'yell']), 1); c.gest = { k: Math.random() < 0.5 ? 'scream' : 'beat', t: S.t }; }
      }
      const sp = Math.hypot(p.vx, p.vy), fast = d > 170 ? CL.run * 1.05 : CL.dart;
      if (clanMove(e, c.o.ring.x, c.o.ring.y, sp > 110 ? Math.min(fast, Math.max(CL.run, sp * 0.93)) : fast, dt) < 10) { c.v = 0; c.stare = 1; }   // flat out, you keep just ahead of them (while your legs last)
      c.o.round = 0; return;
    }
    const Gs = siegeGaps(), ae = Math.atan2(e.y - p.y, e.x - p.x);
    let gap = null, gd = 9; for (const r of Gs.rays) if (r.open) { const da = Math.abs(angDiff(r.a, ae)); if (da < gd) { gd = da; gap = r; } }
    c.o.round = (c.o.round || 0) + dt;
    if ((c.o.chk = (c.o.chk ?? 2) - dt) <= 0) { c.o.chk = 2; c.o.slow = c.o.px !== undefined && Math.hypot(e.x - c.o.px, e.y - c.o.py) < 12; c.o.px = e.x; c.o.py = e.y; }   // getting nowhere
    if (!gap || c.o.round > 14 || c.o.slow) return clanGo(e, 'batter', { w });   // no way in (or it can't find it): through the wall, then
    const da = angDiff(gap.a, ae);
    if (Math.abs(da) > 0.2) { const a = ae + clamp(da, -0.6, 0.6); clanMove(e, p.x + Math.cos(a) * Gs.R, p.y + Math.sin(a) * Gs.R, CL.dart, dt); }   // round the outside of your walls to the gap
    else clanMove(e, p.x + Math.cos(gap.a) * 20, p.y + Math.sin(gap.a) * 20, CL.dart, dt);   // and in through it
    if (Math.random() < dt * 0.4) clanSay(e, pick(['scream', 'yell', 'growl']), 0.9);
  },
  batter(e, c, d, dt) {   // up against a wall of yours, between it and you, clubbing it and screaming
    const o = c.o.w, next = () => clanGo(e, c.o.then && assaultOn() ? c.o.then : assaultOn() ? 'raid' : 'leave', c.o.then ? { B: c.o.B } : {});
    if (!o || !S.day.bld.has(o.key) || !assaultOn()) return next();
    if (!c.o.then && c.t > 1 && !siegeWall(e, S.p.x, S.p.y)) return next();   // you've come out to it, or there's a way round now
    if (!c.o.G) { const q = segNear(stFoot(o), e.x, e.y), dx = e.x - q.x, dy = e.y - q.y, L = Math.hypot(dx, dy) || 1; c.o.G = { x: q.x + dx / L * 12, y: q.y + dy / L * 12, wx: q.x, wy: q.y }; c.o.swT = 0.2 + Math.random() * 0.5; }
    const G = c.o.G, L = clanMove(e, G.x, G.y, CL.dart, dt); c.cr = 0.45;
    if (L < 9 || c.stuck > 0.4) {
      c.v = 0; c.faceW = Math.atan2(G.wy - e.y, G.wx - e.x);
      if (!e.sw && (c.o.swT -= dt) <= 0) {
        c.o.swT = 0.6 + Math.random() * 0.7; e.sw = { ph: 'wind', t: 0, T: CL_MELEE.wind, a: c.faceW }; playFoeWind(e, CL_MELEE);
        if (Math.random() < 0.45) clanSay(e, pick(['scream', 'growl', 'yell']), 0.9);
      }
      if (e.sw) { const ph = e.sw.ph; foeMelee(e, 1e9, dt, CL_MELEE); if (ph === 'wind' && e.sw && e.sw.ph === 'strike') { o.hp -= ASL.blow; o.hitT = 0.15; o.shakeT = S.t; } }   // each blow tells on it
    }
    if (c.t > 30) next();
  },
  loot(e, c, d, dt) {   // for a chest of yours: in, crouched at it a moment, and away with what it could grab
    const B = c.o.B, go = () => clanGo(e, assaultOn() ? 'raid' : 'leave');
    if (!B || !S.day.builds.includes(B) || !B.inv.some(Boolean)) return go();
    if (!c.o.at) { const w = siegeWall(e, B.x, B.y); if (w && (c.o.wT = (c.o.wT || 0) + dt) > 0.5) return clanGo(e, 'batter', { w, then: 'loot', B }); }
    const L = clanMove(e, B.x, B.y, c.o.at ? 0 : CL.dart, dt); c.cr = 0.5;
    if (L < 26 || (c.stuck > 0.5 && L < 40)) {
      c.v = 0; c.cr = 0.95; c.faceW = Math.atan2(B.y - e.y, B.x - e.x);
      if (!c.o.at) { c.o.at = S.t + 2.5; clanSay(e, 'chatter', 0.7); if (Math.hypot(S.p.x - B.x, S.p.y - B.y) < 500) exNote('one of them is at your chest', true); }
      if (S.t >= c.o.at) {
        const full = B.inv.map((s, i) => s ? i : -1).filter(i => i >= 0), i = pick(full), s = B.inv[i], take = Math.max(1, Math.ceil((s.n || 1) / 2));
        if ((s.n || 1) > take) s.n -= take; else B.inv[i] = null;
        c.loot = { id: s.id, n: take }; dayChanged();
        c.hunter = 0; c.done = 1; clanSay(e, 'yell', 1); clanGo(e, 'flee', { dist: 800 });
      }
    }
    if (c.t > 35) go();
  },
});
