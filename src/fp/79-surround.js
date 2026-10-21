// ================= all round you =================
// Joe: "they need to surround the player. At the moment they all come from the same side, but we need them to surround you
// and get 'behind you'." A band used to keep to the side it came from: stalking you it never went far round from there, and
// once it was on you they watched, came in and swung from that one side, so you could keep all of them in front of you.
// Now each one works its own way round:
//   - stalking you, the band spreads out: each heads round you to its own side (78-clan5), so when they call and come in,
//     they come in from all round.
//   - once they're on you, each keeps to its own place round you, spaced out, with one always making for your back. The
//     places turn as you turn (more slowly than you can), so you can't keep them all in front of you by facing them. Off
//     its place, one circles round to it (round you, never through you) instead of standing where it is.
//   - the blows come from where you aren't looking: the one at your back is the one most likely to go for you (its warning
//     is a twig or a breath), while the one you're facing tends to threaten you and hold your eye.
const SURR = { every: 1, turn: 0.55, off: 0.75, go: 0.75, hops: 4 };
const SURR_SKIP = new Set(['flee', 'leave', 'down', 'drag', 'climbTo', 'climb', 'perch', 'drop', 'raid', 'batter', 'mourn', 'rescue', 'pounce', 'glimpse']);
const surrSpread = (i, n) => n < 2 ? 0 : n === 2 ? (i ? 1.45 : -1.45) : (i - (n - 1) / 2) * Math.PI * 2 / n;   // two: either side of your back; more: evenly round you
const surrAt = e => Math.atan2(e.y - S.p.y, e.x - S.p.x);
const surrOff = e => e.cl.slot === undefined ? 0 : angDiff(e.cl.slot, surrAt(e));   // how far round it still has to go to its place
const surrBehind = e => Math.abs(angDiff(surrAt(e), S.aimW)) > 1.9;
function surrStep(dt) {   // each of them on you gets its place round you
  const C = clan(), R = C.surr || (C.surr = { ref: S.aimW + Math.PI, t: 0 });
  R.ref += clamp(angDiff(S.aimW + Math.PI, R.ref), -SURR.turn * dt, SURR.turn * dt);   // your back, followed round slowly as you turn
  if ((R.t -= dt) > 0) return; R.t = SURR.every;
  const E = clanList().filter(e => e.cl && e.cl.eng && !e.cl.scout && !SURR_SKIP.has(e.cl.st)), n = E.length;
  const rel = e => angDiff(surrAt(e), R.ref);
  E.sort((a, b) => rel(a) - rel(b));   // in the order they stand round you, so none has to cross another's way
  E.forEach((e, i) => { e.cl.slot = R.ref + surrSpread(i, n); });
}
{ const cs = clanStep; clanStep = function (dt) { cs(dt); if (CLAN_ON && S.day && S.rg.phase === 'fight') surrStep(dt); }; }
{ const th = clanThink; clanThink = function (e) {
  th(e);
  const c = e.cl, p = S.p, C = clan();
  if (!c || !c.eng || c.slot === undefined || c.scout || c.sight || clanRefugeAt(p.x, p.y, 40)) return;
  // off its place: round you to it
  if (['watch', 'approach', 'threat', 'circle', 'hesitate'].includes(c.st) && Math.abs(surrOff(e)) > SURR.off && c.d > 60 && Math.random() < SURR.go) { c.hops = 0; return clanGo(e, 'circle', { slot: 1 }); }
  if (C.rage > 0 && c.hunter) return;
  // at your back: its moment
  if (surrBehind(e) && ['watch', 'approach', 'circle'].includes(c.st) && c.d > 50 && c.d < 320 && clanTokFree()) {
    c.allies = clanAllies(e);
    if (clanConf(e) > 0.3 && Math.random() < 0.25 + 0.35 * c.P.agg + (c.P.opp ? 0.2 : 0)) return clanGo(e, c.d > 150 ? 'stalk' : 'attack');
  }
  // the one you're looking at holds your eye while another is at your back
  if (c.st === 'attack' && c.eyed && Math.random() < 0.6 && clanList().some(o => o !== e && o.cl && o.cl.eng && !SURR_SKIP.has(o.cl.st) && surrBehind(o))) return clanGo(e, 'threat');
}; }
{ const ci = CLAN_ST.circle; CLAN_ST.circle = function (e, c, d, dt) {
  if (c.o.slot && !c.o.init) {   // round to its place: the shorter way round, a stretch at a time, no change of mind on the way
    const off = surrOff(e), a0 = surrAt(e);
    c.o.init = 1; c.o.flip = 1; c.o.s = Math.sign(off) || 1; c.o.zz = Math.random() * 6;
    c.o.r = clamp(Math.max(clanR(e), Math.min(d, 240)), 110, 280); c.o.fast = Math.abs(off) > 1.6 || Math.random() < 0.3;
    for (let k = 0; k < 4; k++) { c.o.a = a0 + clamp(off, -1.2, 1.2) * (1 - k * 0.25); const Q = clanAround(c.o.r, c.o.a); if (clanOpen(Q.x, Q.y)) break; }
  }
  const slot = c.o.slot; ci.apply(this, arguments);
  if (slot && c.st === 'watch' && Math.abs(surrOff(e)) > SURR.off * 0.8 && (c.hops = (c.hops || 0) + 1) < SURR.hops && !clanRefugeAt(S.p.x, S.p.y, 40)) clanGo(e, 'circle', { slot: 1 });   // not there yet: on round
}; }
{ const wa = CLAN_ST.watch; CLAN_ST.watch = function (e, c, d, dt) {   // you've turned: the one stood watching goes round again
  if (c.eng && !(c.o.delay > 0) && (c.o.sl = (c.o.sl ?? 1.5) - dt) <= 0) {
    c.o.sl = 1.5;
    if (Math.abs(surrOff(e)) > 1.2 && !c.scout && !c.sight && !clanRefugeAt(S.p.x, S.p.y, 40) && Math.random() < 0.5) { c.hops = 0; return clanGo(e, 'circle', { slot: 1 }); }
  }
  return wa.apply(this, arguments);
}; }
