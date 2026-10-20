// ================= how often you see them: a glimpse now and then, and when you're off your guard, all of them =================
// Joe: "it is more the fact that they are pretty much always there meaning eventually it doesn't feel scary to see them it feels
// expected. I think they should come for short periods of time but not close and not attacking so they feel mysterious and maybe
// then you drop your guard slightly then that is when they decide to attack you and really try to kill you."
// The woods used to keep a band or two wandering near you most of the day (72-clan's tide), so there was nearly always one
// watching you. Now there's no one about most of the time, only now and then, far off, a call and an answer. Then:
//  - a sighting: one of them (later two or three) out at the edge of what you can see, by a trunk, watching you; it shifts to
//    another trunk, crouches, stands. It never comes nearer and never goes for you: walk at it, or hold its eye, and it's gone.
//    Half a minute at most, and then the woods are empty again. Or, now and then, a few of them going by out there about
//    their own business, not looking your way, until one stops, and turns, and looks straight at you.
//  - and every so often (from the second day, and never before you've had a sighting since the last time) they come for you,
//    all of them (79-assault). They wait for your guard to be down: you're hurt, hungry, tired, busy chopping or building,
//    laden, far from home, it's getting dark, you've nothing in your hands, or it's been a while since you saw one. If it
//    doesn't come down, they come anyway in the end.
//  - from the fourth day, while you're well away from your camp, a visit may go for your chests instead (78-clan4).
// At night, on the nights they come (78-clan6), it's their torches out in the trees, or it's them coming for you.
const PACE = { first: [50, 90], quiet: [80, 150], len: [18, 30], d: [230, 330], keep: 170, pass: 0.35, atkDay: 2, atkGap: [260, 400], late: 120, guard: 0.9, after: [110, 180], call: [50, 100] };   // seconds of daylight (a day's is about six minutes), and distances
const paceK = () => 1.1 - 0.4 * clanAngK();   // the angrier they are, the less time between
function pace(C) { return C.pace || (C.pace = { t: rnd(PACE.first), atk: rnd(PACE.atkGap), late: 0, n: 0, seenT: S.t, callT: rnd(PACE.call), asl: 0 }); }
const paceSighting = () => clanList().some(e => e.cl.sight);
function paceGuard(C) {   // how far your guard's down, as they see it
  const P = pace(C), p = S.p;
  return (C.w || 0)   // hurt, hungry or thirsty, tired, far from home, dusk, busy, laden (72-clan clanWeak)
    + (dayArmId() || dayRngId() ? 0 : 0.3)   // nothing in your hands
    + (S.t - P.seenT > 90 ? 0.4 : 0)   // it's a while since you saw one
    + (Math.hypot(p.vx, p.vy) < 10 ? 0.2 : 0);   // stood still
}
clanTide = function (C, dt, p) {   // (72-clan's clanStep: true would bring wandering bands near you; never now)
  const D = S.day, P = pace(C), T = C.tide || (C.tide = { ph: 'quiet' });
  const sight = paceSighting();
  T.ph = sight || C.siege ? 'near' : 'quiet';   // (78-clan4 leaves its signs when a visit's over)
  if (P.asl && !C.siege) { P.asl = 0; P.t = Math.max(P.t, rnd(PACE.after)); }   // it's over: a long quiet after
  if (C.rage > 0 || C.revenge || C.siege || clanList().some(e => e.cl.eng && !e.cl.done && !e.cl.sight && e.cl.st !== 'leave')) return false;   // something's already going on
  // far off, now and then: a call, and an answer
  if ((P.callT -= dt) <= 0) {
    P.callT = rnd(PACE.call);
    const a = Math.random() * 6.283, k = Math.random() < 0.6 ? 'yell' : 'chatter';
    clanSnd(k, p.x + Math.cos(a) * 1000, p.y + Math.sin(a) * 1000, 0.75, 100 + Math.random() * 60);
    if (Math.random() < 0.6) { const b = a + 1.5 + Math.random() * 3.3; clanLater(1.2 + Math.random() * 1.5, k, { x: p.x + Math.cos(b) * 1050, y: p.y + Math.sin(b) * 1050, vp: 100 + Math.random() * 70 }, 0.65); }
  }
  if (sight) return false;
  // their time to come for you: they wait for your guard to drop, and in the end they don't wait
  if (D.n >= PACE.atkDay && P.n >= 1 && (P.atk -= dt) <= 0 && !D.sleeping) {
    P.late += dt;
    const safe = clanRefugeAt(p.x, p.y, 20);
    if ((!safe && paceGuard(C) >= PACE.guard && Math.random() < dt * 0.25) || (!safe && P.late > PACE.late) || P.late > PACE.late * 2) {
      if (assaultStart(C)) { P.asl = 1; P.n = 0; P.late = 0; P.aslDay = D.n; P.atk = rnd(PACE.atkGap) * paceK(); return false; }
    }
  }
  // a sighting, now and then (or, from the fourth day while you're out, a visit to your chests)
  if ((P.t -= dt) <= 0) {
    P.t = rnd(PACE.quiet) * paceK();
    if (!(D.n >= 4 && Math.random() < 0.5 && clanRaidVisit(C))) paceSight(C);
  }
  return false;
};
function paceSight(C, o = {}) {   // one or a few of them, just out of your sight to one side: they take up a trunk and watch, or they're passing by
  const D = S.day, P = pace(C), ang = clanAngK();
  const n = o.n || (D.n <= 1 ? 1 : D.n === 2 ? (Math.random() < 0.4 ? 2 : 1) : 1 + (Math.random() < 0.45 + 0.3 * ang ? 1 : 0) + (Math.random() < 0.15 + 0.3 * ang ? 1 : 0));
  const side = Math.random() < 0.5 ? 1 : -1, a = S.aimW + side * (1.1 + Math.random() * 0.6);
  const g = clanBand(n, { a, d: 320, noLead: n < 3 }) || clanBand(n, { d: 340, noLead: n < 3 }); if (!g) return null;
  const M = bandOf(g), len = rnd(PACE.len) * (o.len || 1), r = rnd(PACE.d), pass = D.n >= 2 && Math.random() < PACE.pass;
  const pa = pass ? Math.atan2(M[0].y - S.p.y, M[0].x - S.p.x) - side * 2 : null;   // passing: round across in front of you, to the far side
  M.forEach((e, i) => { e.cl.sight = { end: S.t + len * (pass ? 1.4 : 1) + Math.random() * 4, r: clamp(r + (Math.random() - 0.5) * 60, PACE.keep + 50, 360), side, pa, lag: i * (1.5 + Math.random() * 2) }; clanGo(e, 'glimpse'); });
  P.n++;
  if (Math.random() < 0.6) clanLater(0.8 + Math.random() * 2, Math.random() < 0.6 ? 'twig' : 'click', M[0], 0.9);   // sometimes a sound gives it away first
  return g;
}
function paceMelt(e, c, d) {   // gone: back out of sight and away, unhurried, unless you're right there
  c.sight = null; c.done = 1; c.hunter = 0;
  clanGo(e, d < PACE.keep - 30 ? 'flee' : 'leave', { calm: d > PACE.keep + 40 ? 1 : 0, dist: 800 });
}
function paceLos(x, y, h) {   // nothing in the way from your eyes to (x, y), whichever way you're looking (72-clan clanSeeAt, without the screen)
  const cx = cam.position.x, cz = cam.position.z, dx = x - cx, dy = y - cz, L = Math.hypot(dx, dy);
  for (const o of propsNear((cx + x) / 2, (cz + y) / 2, L / 2 + 40)) {
    const r = o.kind === 'tree' ? (o.type === 'pine' ? (h > 22 ? 24 : 12) : o.type === 'dead' ? 4.5 : 8.5) * o.s : o.kind === 'rock' && h < 16 * o.s ? 12 * o.s : 0; if (!r) continue;
    const t = ((o.x - cx) * dx + (o.y - cz) * dy) / (L * L); if (t < 0.03 || t > 1.03) continue;
    if (Math.hypot(cx + dx * t - o.x, cz + dy * t - o.y) < r) return false;
  }
  return true;
}
function pacePost(e, c, K) {   // a trunk about as far out from you as it likes, with a clear line to you from beside it
  const p = S.p, a0 = Math.atan2(e.y - p.y, e.x - p.x), aim = c.o.G ? a0 + (Math.random() - 0.5) * 0.5 : a0 - K.side * (0.5 + Math.random() * 0.4);   // the first time, round towards where you're looking
  const C = [];
  for (const t of propsNear(p.x + Math.cos(aim) * K.r, p.y + Math.sin(aim) * K.r, 90)) {
    if (t.kind !== 'tree' || t.type === 'dead') continue;
    const r = Math.hypot(t.x - p.x, t.y - p.y); if (r < PACE.keep + 30) continue;
    C.push({ t, r, s: Math.abs(r - K.r) + 70 * Math.abs(angDiff(Math.atan2(t.y - p.y, t.x - p.x), aim)) + (t.type === 'pine' ? 50 : 0) + Math.random() * 30 });   // (a pine's low boughs would hide it)
  }
  C.sort((a, b) => a.s - b.s);
  for (const q of C.slice(0, 12)) {   // at the side of it, half behind: the side you'd see it from
    const t = q.t, ux = t.x - p.x, uy = t.y - p.y, L = Math.hypot(ux, uy) || 1, rr = Math.max(t.r * t.s + 9, (t.type === 'pine' ? 12 : 8.5) * t.s + 7);   // (out far enough that its trunk doesn't hide all of it)
    for (const sd of Math.random() < 0.5 ? [-1, 1] : [1, -1]) {
      const b = Math.atan2(uy, ux) + sd * Math.PI / 2, G = { x: t.x + ux / L * 4 + Math.cos(b) * rr, y: t.y + uy / L * 4 + Math.sin(b) * rr };
      if (paceLos(G.x, G.y, 26)) return G;
    }
  }
  for (let k = 0; k < 10; k++) {   // no trunk with a clear line: out in a gap between them, then
    const a = aim + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.12, r = K.r + (Math.random() - 0.5) * 60, G = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
    if (!lakeAt(G.x, G.y, 10) && paceLos(G.x, G.y, 26)) return G;
  }
  return { x: p.x + Math.cos(aim) * K.r, y: p.y + Math.sin(aim) * K.r };
}
CLAN_ST.glimpse = function (e, c, d, dt) {   // out at the edge of what you can see: by a trunk, watching you, or on its way somewhere
  const K = c.sight, p = S.p; if (!K) return clanGo(e, 'leave', { calm: 1 });
  const P = pace(clan()); if (c.vis) P.seenT = S.t;
  if (S.t > K.end || (d < PACE.keep && c.t > 1.5)) return paceMelt(e, c, d);   // its time's up, or you've come too close
  if (K.pa !== null && !K.eyed) {   // passing by, about its own business: it hasn't seen you, or doesn't care
    if (c.t < K.lag) { c.v = 0; c.cr = 0.6; return; }
    if (c.eyedT > 1.2) { K.eyed = 1; K.end = Math.min(K.end, S.t + 2.5 + Math.random() * 2.5); c.o.G = { x: e.x, y: e.y }; c.o.at = K.end; c.o.pose = 0.15; clanSay(e, 'click', 0.5); }   // then it stops, and turns, and looks straight at you
    const a = Math.atan2(e.y - p.y, e.x - p.x), da = angDiff(K.pa, a); if (Math.abs(da) < 0.15) return paceMelt(e, c, d);   // on round, at about the same way out
    const b = a + Math.sign(da) * 0.35; clanMove(e, p.x + Math.cos(b) * K.r, p.y + Math.sin(b) * K.r, CL.walk * (d < K.r - 60 ? 1.5 : 1), dt); c.cr = 0.5; c.stare = 0;
    return;
  }
  if (c.eyedT > 0.8 && !K.eyed) { K.eyed = 1; K.end = Math.min(K.end, S.t + 1 + Math.random() * 2.5); if (Math.random() < 0.3) clanSay(e, 'click', 0.5); }   // you've seen it: it holds your eye a moment, then it's gone
  const back = c.o.G && Math.hypot(c.o.G.x - p.x, c.o.G.y - p.y) < K.r - 60;   // you're coming its way: it keeps its distance
  if (!c.o.G || back || (c.o.at && S.t > c.o.at)) { c.o.G = pacePost(e, c, K); c.o.at = 0; c.o.pose = Math.random() < 0.55 ? 0.85 : 0.15 + Math.random() * 0.2; }
  const L = clanMove(e, c.o.G.x, c.o.G.y, d < K.r - 40 ? CL.run : CL.walk * (c.o.n ? 0.9 : 1.3), dt);
  if (L < 8 || c.stuck > 0.6) {   // there: still, looking at you
    c.v = 0; c.cr = c.o.pose; c.stare = 1;
    if (!c.o.at) { c.o.at = S.t + 5 + Math.random() * 7; c.o.n = (c.o.n || 0) + 1; }
    if (Math.random() < dt * 0.05) clanSay(e, pick(['click', 'chatter', 'breath']), 0.45);
  } else c.cr = 0.65;
};
// one on the edge of sight only ever does that; and one that's done with you (a sighting over, or they've given up on you) keeps going
{ const th = clanThink; clanThink = function (e) { const c = e.cl; if (c.sight) return clanGo(e, 'glimpse'); if (c.done && !c.hunter) return clanGo(e, 'leave', { calm: c.d > 300 ? 1 : 0 }); return th.apply(this, arguments); }; }
// hurt one and that's the end of the looking: they're as they'd be anywhere else
{ const ch = clanHurt; clanHurt = function (e) { if (e.cl.sight) for (const o of e.cl.band ? bandOf(e.cl.band) : [e]) o.cl.sight = null; return ch.apply(this, arguments); }; }

// ---- at night, on the nights they come: torches out in the trees, or they come for you ----
clanNightCome = function (C, V) {
  V.came = 1; const D = S.day, P = pace(C);
  if (D.sleeping) return;
  D.clanNightLast = D.n;
  if (D.n >= PACE.atkDay && P.aslDay !== D.n && Math.random() < 0.35 + 0.25 * clanAngK()) { if (assaultStart(C, { d: 480 })) { P.asl = 1; P.n = 0; P.late = 0; P.aslDay = D.n; P.atk = Math.max(P.atk, rnd(PACE.atkGap) * paceK()); } return; }   // (not if they've already come for you today)
  const g = paceSight(C, { len: 1.6 }); if (!g) return;
  V.g = g; V.end = S.t + 70;
  const M = bandOf(g), p = S.p, a = Math.atan2(M[0].y - p.y, M[0].x - p.x) + (Math.random() < 0.5 ? 1 : -1) * (0.8 + Math.random());
  clanLater(0.3, Math.random() < 0.6 ? 'yell' : 'wail', M[0], 0.9);   // a call out in the dark, an answer
  clanLater(1.8 + Math.random(), 'yell', M[1] || { x: p.x + Math.cos(a) * 700, y: p.y + Math.sin(a) * 700, vp: 110 + Math.random() * 50 }, 0.8);
};
