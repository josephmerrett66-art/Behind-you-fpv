// ================= each of them its own: no formations, they see you first, and they know your camp =================
// Joe: "the canibals have this weird mode where they walk in a formation like they are a hive mind in perfect formulation like
// robots almost scanning back and forth... We need each canibal ai to be independent for most of the time, and they should
// always be able to spot you before you spot them. If they are near your camp they can obviously see it so they shouldn't act
// like they don't."
// A band used to be one point moving through the woods with its members pinned in a ring round it, and stalking you was that
// ring swung back and forth round you. Now:
//  - Out in the woods a band is only a few of them going roughly the same way. Each picks its own next spot (often by a trunk),
//    walks there at its own pace and stops when it likes, to look about, crouch or pick at the ground. Some get ahead, some
//    lag and jog to catch up.
//  - Stalking you, each works its own way round you from trunk to trunk and holds behind each one to watch you. Look straight
//    at one and that one answers for itself: it freezes, slips back out of sight, or stands up and stares back. The others
//    carry on. Then they come in one at a time, each from where it is.
//  - They see you first. Anything you can make out on your screen has already seen you, and with nothing in the way they spot
//    you much further off than before (less when you're crouched). They hear you chopping, fighting or running.
//  - Your camp (your bed, fires and builds, as one place): a band that comes near stops to watch it from the trees, and a
//    curious one creeps in to touch something at its edge. Then they go round it, never blundering into it. If you're home,
//    they know you're there.
const SPOT = { see: 700, seeCr: 420, seeRun: 760, near: 150, work: 700, run: 320, camp: 520 };

// ---------------- your camp, as they see it ----------------
let CB = { D: null, key: '', t: -99, v: null };
function clanBase() {   // where your things stand: the middle of them and how far they spread
  const D = S.day; if (!D) return null;
  const key = D.builds.length + ':' + D.bld.size + ':' + (D.bed ? Math.round(D.bed.x) + ',' + Math.round(D.bed.y) : '');
  if (CB.D === D && CB.key === key && S.t - CB.t < 10 && CB.t <= S.t) return CB.v;
  const pts = []; for (const B of D.builds) if (!B.snare && !B.ftrap && B.t !== 'cache') pts.push(B);
  for (const o of D.bld.values()) pts.push(o);
  let v;
  if (D.bed || pts.length) {
    let mid = D.bed, bn = -1;
    if (!mid) for (const a of pts) { let n = 0; for (const b of pts) if (Math.abs(a.x - b.x) < 300 && Math.abs(a.y - b.y) < 300) n++; if (n > bn) { bn = n; mid = a; } }
    let x = 0, y = 0, n = 0; for (const b of pts) if (Math.hypot(b.x - mid.x, b.y - mid.y) < 320) { x += b.x; y += b.y; n++; }
    if (n) { x /= n; y /= n; } else { x = mid.x; y = mid.y; }
    let r = 0; for (const b of pts) { const q = Math.hypot(b.x - x, b.y - y); if (q < 380) r = Math.max(r, q); }
    v = { x, y, r: clamp(r + 50, 100, 380) };
  } else v = { x: EX_FIRE.x, y: EX_FIRE.y, r: PIT_R + 40 };   // nothing built yet: the fire pit on the hill
  CB = { D, key, t: S.t, v };
  return v;
}
const clanAtBase = (x, y, pad = 0) => { const B = clanBase(); return !!B && Math.hypot(x - B.x, y - B.y) < B.r + pad; };
function clanBaseThing(e, B) {   // one of your things at the edge of your camp: out of the firelight, and not right by you
  const D = S.day, p = S.p; let best = null, bs = 1e9, n = 0;
  const look = o => { if (Math.hypot(o.x - p.x, o.y - p.y) < 160 || Math.hypot(o.x - B.x, o.y - B.y) > B.r + 20 || clanRefugeAt(o.x, o.y, 25)) return; const s = Math.hypot(o.x - e.x, o.y - e.y) * (0.7 + Math.random() * 0.6); if (s < bs) { bs = s; best = o; } };
  for (const o of D.builds) if (!o.snare && !o.ftrap) look(o);
  for (const o of D.bld.values()) { if (++n > 240) break; look(o); }
  return best && { x: best.x, y: best.y };
}
function clanInspectAt(e) {   // something of yours worth a look, for one already watching you: what you built last, or a thing of your camp's
  const C = clan(), p = S.p, B = clanBase();
  if (C.build && Math.hypot(C.build.x - p.x, C.build.y - p.y) > 160 && Math.hypot(C.build.x - e.x, C.build.y - e.y) < 500) return C.build;
  return B && Math.hypot(e.x - B.x, e.y - B.y) < B.r + 400 && Math.random() < 0.5 ? clanBaseThing(e, B) : null;
}
function clanHomeR(e) {   // you're home: most keep to the edge of your camp, watching you from there; the bold and the furious come on in
  const B = clanBase(), p = S.p; if (!B || e.cl.P.agg > 0.6 || clanAngK() > 0.6 || clan().rage > 0) return 0;
  const dp = Math.hypot(p.x - B.x, p.y - B.y); return dp > B.r + 40 ? 0 : B.r - dp + 50;
}
// a band out in the woods that comes near your camp: it stops and looks, then goes round it
function clanBaseLook(g, M) {
  const B = clanBase(); if (!B || g.home || g.raid) return;
  if (!g.sawB && Math.hypot(g.x - B.x, g.y - B.y) < B.r + SPOT.camp) {
    g.sawB = 1; g.baseW = { x: g.x, y: g.y, until: S.t + 10 + Math.random() * 14 }; g.stop = 0;
    for (const e of M) { const W = e.cl.wn; if (!W) continue; if (W.at) W.hold = Math.min(W.hold, Math.random() * 2); else W.goT = Math.min(W.goT, 0.3 + Math.random() * 2); }   // each turns to it in its own time
    clanLater(0.3 + Math.random() * 0.8, Math.random() < 0.6 ? 'click' : 'chatter', pick(M), 0.6);
  }
  if (g.baseW && S.t >= g.baseW.until) {   // had their look: off round it
    g.baseW = null; g.a = Math.atan2(g.y - B.y, g.x - B.x) + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.6); g.t = 8 + Math.random() * 6;
    for (const e of M) { const W = e.cl.wn; if (W && W.at) W.hold = Math.min(W.hold, Math.random() * 3); }
  }
}

// ---------------- they see you first ----------------
function clanSpots(e, c, d, dt) {
  if (c.vis || d < SPOT.near) return true;   // anything you could make out on your screen has already seen you (Joe: always first)
  const p = S.p, D = S.day, sp = Math.hypot(p.vx, p.vy);
  if (S.t - clan().busy < 1 && d < SPOT.work) return true;   // chopping, digging, fighting: they hear it a long way off
  if (sp > 120 && d < SPOT.run) return true;   // crashing through the undergrowth
  if (clanKnowsHome(e)) return true;   // you're home: your fire, your smoke, you about the place
  if ((c.losT = (c.losT ?? Math.random() * 0.3) - dt) <= 0) { c.losT = 0.3; c.los = d < SPOT.seeRun && clanLos(e); }
  return !!c.los && d < (D.crouch && sp < 90 ? SPOT.seeCr : sp > 120 ? SPOT.seeRun : SPOT.see);
}
function clanKnowsHome(e) {   // you're home and it's near: it knows you're in there, walls or not
  const B = clanBase(), p = S.p; return !!B && Math.hypot(p.x - B.x, p.y - B.y) < B.r + 40 && Math.hypot(e.x - B.x, e.y - B.y) < B.r + SPOT.camp;
}
function clanLos(e) {   // can it see you: they know the woods, and see you through gaps between the trunks you'd never spot them through
  const p = S.p, dx = p.x - e.x, dy = p.y - e.y, L = Math.hypot(dx, dy) || 1;
  for (const o of propsNear((p.x + e.x) / 2, (p.y + e.y) / 2, L / 2 + 30)) {
    const k = caster(o); if (!k || o.kind === 'post') continue;
    const t = ((o.x - e.x) * dx + (o.y - e.y) * dy) / (L * L); if (t < 0.04 || t > 0.96) continue;
    if (Math.hypot(e.x + dx * t - o.x, e.y + dy * t - o.y) < k.r * 0.75) return false;
  }
  return !stWallBetween(e.x, e.y, p.x, p.y);   // your walls do hide you
}

// ---------------- out in the woods: each its own way ----------------
function clanWander(e, c, g, d, dt) {
  const W = c.wn || (c.wn = { wp: null, at: 0, hold: 0, goT: 0 });
  if (!W.wp) clanWanderPick(e, c, g, W);
  if (!W.at) {   // on its way: a walk, or a jog to catch the others up
    const L = Math.hypot(W.wp.x - e.x, W.wp.y - e.y);
    clanMove(e, W.wp.x, W.wp.y, W.v * clamp(L / 20, 0.5, 1), dt); c.cr = W.v > 80 ? 0.5 : W.low ? 0.75 : 0.35; if (W.v > 80) c.q = 0.4;
    if (L < 6 || c.stuck > 0.6 || (W.goT -= dt) <= 0) { W.at = 1; c.stuck = 0; if (W.hold <= 0) W.wp = null; }
    return;
  }
  // stopped: it looks about, crouches, picks at something, or turns to watch you if it knows you're there
  const knows = S.t - (c.knowT ?? -99) < 4 && d < 750;
  c.cr = W.pose;
  if ((W.lookT -= dt) <= 0) { W.lookT = 1 + Math.random() * 3; W.la = knows ? Math.atan2(S.p.y - e.y, S.p.x - e.x) : W.look ? Math.atan2(W.look.y - e.y, W.look.x - e.x) + (Math.random() - 0.5) * 0.7 : c.face + (Math.random() - 0.5) * 2.4; }
  c.faceW = W.la; if (knows || W.look) c.stare = 1;
  if (W.touch && !W.touched) { W.touched = 1; c.gest = { k: 'touch', t: S.t }; }
  if (W.say && Math.random() < dt * 0.15) { W.say = 0; clanSay(e, pick(['click', 'chatter', 'grunt']), 0.6); }
  if ((W.hold -= dt) <= 0) W.wp = null;
}
function clanWanderPick(e, c, g, W) {
  const M = bandOf(g), B = clanBase(), wB = g.baseW && S.t < g.baseW.until && B ? g.baseW : null;
  const far = M.length > 1 && Math.hypot(e.x - g.x, e.y - g.y) > 230;
  const taken = (x, y) => M.some(o => o !== e && o.cl.wn && o.cl.wn.wp && Math.hypot(o.cl.wn.wp.x - x, o.cl.wn.wp.y - y) < 35);
  for (let k = 0; k < 6; k++) {
    Object.assign(W, { at: 0, hold: 0, pose: 0.3, look: null, touch: 0, touched: 0, say: 0, low: 0, lookT: 0, v: 40 });
    let x, y, trunk = 1, insp = 0;
    if (g.raid) {   // to your chest, low and quiet
      const a = Math.random() * 6.283, r = 15 + Math.random() * 40; x = g.raid.x + Math.cos(a) * r; y = g.raid.y + Math.sin(a) * r; trunk = 0;
      W.v = 42 + Math.random() * 18; W.low = 1; W.hold = Math.random() < 0.5 ? 0.4 + Math.random() * 1.5 : 0;
    } else if (wB) {   // your camp: a spot in the trees to watch it from, or (the curious ones) in to touch something at its edge
      if (W.insp === undefined) W.insp = c.P.cur > 0.55 && Math.random() < 0.6 ? 1 : 0;
      const T = W.insp === 1 && !k ? clanBaseThing(e, B) : null;
      if (T) { const a = Math.atan2(e.y - T.y, e.x - T.x); x = T.x + Math.cos(a) * 22; y = T.y + Math.sin(a) * 22; trunk = 0; insp = 1; W.look = T; W.touch = 1; W.pose = 0.9; W.hold = 2.5 + Math.random() * 2; W.v = 30 + Math.random() * 12; W.low = 1; }
      else { const a = Math.atan2(wB.y - B.y, wB.x - B.x) + (Math.random() - 0.5) * 1.4, r = B.r + 90 + Math.random() * 130; x = B.x + Math.cos(a) * r; y = B.y + Math.sin(a) * r; W.look = B; W.pose = Math.random() < 0.6 ? 0.88 : 0.3; W.hold = 4 + Math.random() * 6; W.v = 34 + Math.random() * 20; W.say = Math.random() < 0.3; }
    } else if (far) {   // left behind: a jog to catch the others up
      x = g.x + Math.cos(g.a) * 50 + (Math.random() - 0.5) * 80; y = g.y + Math.sin(g.a) * 50 + (Math.random() - 0.5) * 80;
      W.v = 85 + Math.random() * 25; W.hold = Math.random() < 0.4 ? 0.5 + Math.random() : 0;
    } else {   // its own way, roughly where the others are going
      const home = g.home && g.stop > 1e8, stopped = g.stop > 0, ux = Math.cos(g.a), uy = Math.sin(g.a), r = Math.random();
      const ah = home ? 0 : stopped ? (Math.random() - 0.5) * 60 : (g.away ? 90 : 40) + Math.random() * (g.away ? 130 : 150), sd = (Math.random() - 0.5) * 2 * (home ? 70 : 45 + 85 * c.seed);
      x = g.x + ux * ah - uy * sd; y = g.y + uy * ah + ux * sd;
      W.v = (g.away ? 55 : 30 + 22 * c.seed) * (0.85 + 0.3 * Math.random());
      if (home || stopped) { W.hold = 3 + Math.random() * 7; W.pose = r < 0.45 ? 0.85 : r < 0.8 ? 0.3 : 0.9; W.touch = r >= 0.8; W.say = Math.random() < 0.35; }
      else if (g.away) W.hold = Math.random() < 0.6 ? 0 : 0.5 + Math.random() * 1.5;
      else { W.hold = r < 0.35 ? 0 : 0.6 + Math.random() * 3; W.pose = Math.random() < 0.6 ? 0.3 : 0.75; W.touch = r > 0.9; }
    }
    if (trunk) {   // beside a trunk if there's one near; watching your camp, round the far side of it
      const t = propsNear(x, y, 45).find(o => o.kind === 'tree' && o.type !== 'dead');
      if (t) { const a = W.look ? Math.atan2(t.y - W.look.y, t.x - W.look.x) + (Math.random() - 0.5) * 1.2 : Math.random() * 6.283, rr = t.r * t.s + 9; x = t.x + Math.cos(a) * rr; y = t.y + Math.sin(a) * rr; }
    }
    if (!g.raid && (lakeAt(x, y, 20) || clanRefugeAt(x, y, 30) || (!insp && clanAtBase(x, y, 40)) || taken(x, y))) continue;   // never into water, the firelight or your camp
    if (insp) W.insp = 2;
    W.wp = { x, y }; W.goT = Math.hypot(x - e.x, y - e.y) / W.v * 2 + 3;
    return;
  }
  W.wp = { x: e.x, y: e.y }; W.at = 1; W.hold = 0.5 + Math.random();   // nowhere good: a moment's pause, then try again
}

// ---------------- stalking you: each its own way round you, trunk to trunk ----------------
function clanShadowOf(e) {
  const c = e.cl, g = c.band; if (c.sh) return c.sh;
  const M = g ? bandOf(g) : [e], i = Math.max(0, M.indexOf(e)), p = S.p, a0 = g && g.stalk ? g.stalk.a : Math.atan2(e.y - p.y, e.x - p.x);
  return (c.sh = { a: a0 + (i - (M.length - 1) / 2) * (0.45 + Math.random() * 0.4) + (Math.random() - 0.5) * 0.4, dir: Math.random() < 0.5 ? 1 : -1,
    dr: (Math.random() - 0.5) * 120, v: 70 + Math.random() * 40, mode: 'move', G: null, t: 0, pose: 0.9, seenAt: -9 });
}
function clanShadow(e, c, g, d, dt) {
  const p = S.p, H = clanShadowOf(e), B = clanBase(), home = B && Math.hypot(p.x - B.x, p.y - B.y) < B.r + 40;
  const stop = home ? Math.max(H.stop ?? 220, B.r + 90 + Math.hypot(p.x - B.x, p.y - B.y)) : H.stop ?? 220;   // at home, it comes as far as the trees round your camp
  if (d < 130 || (g.close && S.t >= (H.inAt ?? 0) && d < stop)) return clanNotice(e);   // close enough: out it comes to look at you
  // you've looked straight at it: it answers for itself, and the others carry on
  if (c.vis && (c.eyed || c.seenT > 0.8) && S.t - H.seenAt > 5) {
    H.seenAt = S.t; const r = Math.random();
    if (r < 0.45) { H.mode = 'freeze'; H.t = 1.5 + Math.random() * 2.5; }
    else if (r < 0.9 || c.P.cur < 0.6) { H.mode = 'move'; H.slip = 1; H.a += (angDiff(Math.atan2(e.y - p.y, e.x - p.x), S.aimW) > 0 ? 1 : -1) * (0.5 + Math.random() * 0.5); H.dr += 70; H.G = null; clanSnd('rustle', e.x, e.y, 1.1, e.cl.vp, e); }
    else { H.mode = 'stare'; H.t = 2 + Math.random() * 2; }
  }
  if (H.mode !== 'move') {   // behind its trunk, watching you (frozen where it stood, or stood up tall staring back)
    c.cr = H.mode === 'stare' ? 0.12 : H.pose; c.faceW = Math.atan2(p.y - e.y, p.x - e.x); c.stare = 1;
    if ((H.t -= dt) > 0 || (g.close && S.t < (H.inAt ?? 0))) return;
    H.mode = 'move'; H.G = null; H.slip = 0;
    if (!g.close) {   // on round you, now and then doubling back, never far round from the side the band came from
      H.a += H.dir * (0.25 + Math.random() * 0.45); if (Math.random() < 0.25) H.dir = -H.dir;
      if (g.stalk && Math.abs(angDiff(H.a, g.stalk.a)) > 1.6) H.dir = Math.sign(angDiff(g.stalk.a, H.a));
    }
  }
  if (!H.G) H.G = clanShadowSpot(e, g, H, B, home, stop);
  const L = clanMove(e, H.G.x, H.G.y, H.slip ? CL.run : g.close ? H.v * 0.9 : H.v, dt); c.cr = 0.72; c.q = c.v > 100 ? 0.5 : 0.2;
  if (L < 6 || c.stuck > 0.6) { H.mode = 'hold'; H.t = g.close ? 0.5 + Math.random() * 1.5 : 2 + Math.random() * 4; H.pose = Math.random() < 0.7 ? 0.9 : 0.4; c.stuck = 0; }
}
function clanShadowSpot(e, g, H, B, home, stop) {   // the far side of a trunk from you, about where it wants to be
  const p = S.p, K = g.stalk;
  let a, R;
  if (g.close) { a = Math.atan2(e.y - p.y, e.x - p.x) + (Math.random() - 0.5) * 0.5; R = Math.max(stop - 20, Math.hypot(e.x - p.x, e.y - p.y) - (90 + Math.random() * 60)); }   // in, a trunk nearer each time
  else { a = H.a; R = lerp(STALK.r0, STALK.r1, K ? clamp(1 - (K.end - S.t) / K.T, 0, 1) : 1) + H.dr; if (home) R = Math.max(R, B.r + 110 + Math.hypot(p.x - B.x, p.y - B.y)); }
  for (let k = 0; k < 6; k++) {
    const b = a + (k ? (Math.random() - 0.5) * 0.9 : 0), x = p.x + Math.cos(b) * R, y = p.y + Math.sin(b) * R;
    if (lakeAt(x, y, 20) || clanRefugeAt(x, y, 40) || (home && clanAtBase(x, y, 70))) continue;   // at home you're watched from the trees round your camp
    let best = null, bs = 1e9;
    for (const t of propsNear(x, y, 90)) {
      if (t.kind !== 'tree' || t.type === 'dead') continue;
      const P = clanSpotAt(t); if (home && clanAtBase(P.x, P.y, 60)) continue;
      const s = Math.hypot(t.x - x, t.y - y) + (clanList().some(o => o !== e && o.cl.sh && o.cl.sh.G && Math.hypot(o.cl.sh.G.x - P.x, o.cl.sh.G.y - P.y) < 50) ? 300 : 0);   // not the trunk another has
      if (s < bs) { bs = s; best = P; }
    }
    if (!g.close) H.a = b;
    return best || { x, y };
  }
  return { x: e.x, y: e.y };
}
