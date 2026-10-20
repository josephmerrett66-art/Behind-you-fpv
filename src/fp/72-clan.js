// ================= the clan: the people from the crash, living wild in the woods =================
// Joe: "This is the heart of the game... The player should feel small and watched, like prey." By day the raiders are gone. In
// their place is a clan of survivors from the plane crash, gone wild. They eat their weakest, so they are careful and every loss
// hurts them. They look like you (the same body, gone ragged, muddy and painted, now and then one still in an orange beanie) and
// move like people: hunched and watchful when still, running upright like you (Joe), up in the branches.
// Joe's second brief (after The Forest): they aren't programmed to spot you, chase you and fight to the death. They're curious,
// territorial, unpredictable and sometimes frightened, and you should never be sure whether an encounter will become a fight.
//  - They live out here whether you're near or not: small bands wander the woods, stopping, crouching, calling to each other.
//    You meet them because your paths cross. They notice you long before you notice them.
//  - Each one has a personality (curious, aggressive, cowardly, territorial, opportunistic, social) that sets how curious,
//    aggressive and fearful it is. Fear and confidence move through an encounter: hurt, alone, a friend killed, you charging at
//    it, you holding a weapon or standing in firelight all make it warier; numbers, your weakness and its own ground make it bolder.
//  - Once they've seen you they stay near, rarely still: watching from beside a trunk, circling round you to look from another
//    side, creeping closer and backing off, flanking. Some threaten you: a scream with arms thrown wide, a chest beat, a charge
//    that stops short, a feinted swing, a fast swerving dance round you. Now and then one really attacks, always with a warning
//    first (a scream if you can see it, a twig or a breath if it's behind you), lands one blow or misses, and backs off.
//  - What you do matters: walk at one and it backs off, threatens or flies at you; hit it and it may run or turn on you; run and
//    the bold ones follow; build or chop and the curious ones come to watch; break their sight of you and they search where they
//    last saw you; stay long enough and they lose interest and wander off.
//  - Kill one and the rest react as individuals: the bold hunt you down (to the edge of your firelight, where they stop and wait),
//    the frightened flee, others hesitate and scream.
// Night is left as it was: at dusk they melt away and the night's hunters come.
const CLAN_ON = true;
FOES.cannibal = { hp: 3.4, sp: 70, lightSp: 1, h: 40, w: 12 };
NO_TOUCH.cannibal = 1; MON_PITCH.cannibal = 1.1; STK_PTS.cannibal = 20; STK_COL.cannibal = '214,150,104';
FOE_TINT.cannibal = [176, 124, 86]; WISP.cannibal = 0;
const CL_MELEE = { wind: 0.3, trig: 44, hit: 33, lunge: 40, rec: 0.36 };   // quick: the warning came before it, not in the swing
FOE_AI.cannibal = (e, sp, d, dt) => clanAI(e, d, dt);
const CL = {
  dart: 178,      // flat out, coming at you
  run: 122,       // running about near you
  walk: 52,       // wandering, creeping closer
  flee: 150,      // running from you: quicker than your run, slower than your sprint, so a chase can be won (Joe)
  notice: 430,    // how far off they see you (they see you first: you can't make them out half that far in the trees)
  pool: 14,       // how many of them there are; each one killed is one fewer, and two more come each morning
  rage: 100,      // how long the bold ones hunt you after a kill
};
// what each kind of them is like: curiosity, aggression, fear, how much the others' company matters, and a few habits
const PERS = {
  curious:     { cur: 0.9, agg: 0.25, fear: 0.35, soc: 0.5 },
  aggressive:  { cur: 0.45, agg: 0.85, fear: 0.12, soc: 0.4 },
  cowardly:    { cur: 0.4, agg: 0.15, fear: 0.75, soc: 0.6 },
  territorial: { cur: 0.35, agg: 0.6, fear: 0.3, soc: 0.4, terr: 1 },
  opportunist: { cur: 0.5, agg: 0.5, fear: 0.4, soc: 0.4, opp: 1 },
  social:      { cur: 0.5, agg: 0.45, fear: 0.4, soc: 1 },
};
const PERS_K = Object.keys(PERS);
const clanList = () => S.rg.enemies.filter(e => e.type === 'cannibal' && !e.dead);
function clan() {
  const rg = S.rg;
  return rg.clan || (rg.clan = { bands: [], bandN: 0, bandT: 0, tok: null, gap: 25, rage: 0, more: 0, busy: -9, build: null, q: [], dead: [], w: 0, first: 1 });
}
const pick = a => a[Math.floor(Math.random() * a.length)];
const wpick = W => { let s = 0; for (const w of W) s += Math.max(0, w[1]); let r = Math.random() * s; for (const w of W) { r -= Math.max(0, w[1]); if (r <= 0) return w[0]; } return W[0][0]; };
const ENGAGED = ['watch', 'circle', 'approach', 'threat', 'attack', 'back', 'retreat', 'flank', 'pursue', 'search', 'inspect', 'climb', 'perch', 'drop', 'hesitate'];
const HOSTILE = ['attack', 'threat', 'pursue', 'hunt', 'hwarn', 'hdart', 'wait'];
function clanHostile(e) { return !!e.cl && HOSTILE.includes(e.cl.st); }

// ---------------- what you can see: on your screen, near enough, and nothing standing in the way ----------------
const _clp = new V3();
function clanSeeAt(x, y, h) {
  const cx = cam.position.x, cz = cam.position.z, dx = x - cx, dy = y - cz, L = Math.hypot(dx, dy);
  if (L > 780) return false;
  _clp.set(x, h + terrH(x, y), y).project(cam);
  if (_clp.z > 1 || Math.abs(_clp.x) > 1.02 || Math.abs(_clp.y) > 1.05) return false;
  if (L < 30) return true;
  const hi = cam.position.y - terrH(cx, cz) > 150;   // from high above, the crowns hide what's under them
  for (const o of propsNear((cx + x) / 2, (cz + y) / 2, L / 2 + 40)) {
    let r = 0;
    if (o.kind === 'tree') r = hi ? (o.type === 'dead' ? 0 : 34 * o.s) : (o.type === 'pine' ? (h > 22 ? 24 : 12) : o.type === 'dead' ? 4.5 : 8.5) * o.s;
    else if (o.kind === 'rock') r = h < 16 * o.s ? 12 * o.s : 0;
    if (!r) continue;
    const t = ((o.x - cx) * dx + (o.y - cz) * dy) / (L * L); if (t < 0 || t > 1.03) continue;
    if (Math.hypot(cx + dx * t - o.x, cz + dy * t - o.y) < r) return false;
  }
  return true;
}
function clanOnScreen(x, y, h = 30) { _clp.set(x, h + terrH(x, y), y).project(cam); return _clp.z < 1 && Math.abs(_clp.x) < 0.85 && Math.abs(_clp.y) < 1; }
const clanTop = e => e.cl.z + lerp(lerp(43, 27, e.cl.crK), 22, e.cl.qK);
function clanSee(e, dt) {
  const c = e.cl, top = clanTop(e);
  c.vis = clanSeeAt(e.x, e.y, top - 3) || clanSeeAt(e.x, e.y, top * 0.55);
  c.seenT = c.vis ? c.seenT + dt : 0; c.unseenT = c.vis ? 0 : c.unseenT + dt;
}
// places they won't follow you into: the firelight, a fire of your own, a lit torch post, inside your walls with the doors shut
function clanRefugeAt(x, y, pad = 0) {
  const s = exSafeAt(x, y, pad); if (s) return s;
  const D = S.day;
  for (const B of D.builds) {
    if (B.t === 'fire' && Math.hypot(B.x - x, B.y - y) < 80 + pad) return { x: B.x, y: B.y, r: 80 };
    if (B.t === 'tpost' && B.fuel > 0 && Math.hypot(B.x - x, B.y - y) < 130 + pad) return { x: B.x, y: B.y, r: 130 };
    if (B.t === 'effigy' && !(S.rg.clan && S.rg.clan.rage > 0) && Math.hypot(B.x - x, B.y - y) < 150 + pad) return { x: B.x, y: B.y, r: 150 };   // your effigy keeps them off (not when they're out for blood)
  }
  if (pad <= 10) { const r = stShutIn(x, y); if (r && !clanList().some(e => Math.hypot(e.x - x, e.y - y) < r + 10 && !stWallBetween(e.x, e.y, x, y))) return { x, y, r: Math.max(60, r), walls: 1 }; }   // shut in: walls all round, every door closed, and none of them in there with you (67-doors)
  return null;
}

// ---------------- where to wait: behind a trunk, its back to you ----------------
function clanSpotAt(t, perch) {
  const cx = cam.position.x, cz = cam.position.z, dx = t.x - cx, dy = t.y - cz, L = Math.hypot(dx, dy) || 1, r = t.r * t.s + 8;
  if (perch) { const a = Math.atan2(-dy, -dx) + (t.seed > 0.5 ? 1.1 : -1.1); return { x: t.x + Math.cos(a) * r, y: t.y + Math.sin(a) * r }; }   // out on a limb, to the side
  return { x: t.x + dx / L * r, y: t.y + dy / L * r };
}

// ---------------- moving: round the trunks in the way ----------------
function clanMove(e, tx, ty, v, dt) {   // toward (tx, ty) at v; how far it still has to go
  const c = e.cl, dx = tx - e.x, dy = ty - e.y, L = Math.hypot(dx, dy);
  c.want = 0; c.mvF = 1; v *= c.spd || 1;
  if (L < 0.5 || v <= 0) { c.v = 0; return L; }
  let ux = dx / L, uy = dy / L;
  for (const o of propsNear(e.x + ux * 20, e.y + uy * 20, 30).concat(assaultOn() ? daySolidsNear(e.x + ux * 20, e.y + uy * 20, 30) : [])) {   // (coming for you: round your walls and things too, 79-assault)
    if (o.kind !== 'tree' && o.kind !== 'rock' && o.kind !== 'dbuild' && !o.st) continue;
    const ox = o.x - e.x, oy = o.y - e.y, ahead = ox * ux + oy * uy, R = o.r * o.s + 9;
    if (ahead <= 0 || ahead > 42 || ahead > L + R) continue;
    const side = ox * -uy + oy * ux;
    if (Math.abs(side) < R) { const s = side > 0 ? -1 : 1, k = (R - Math.abs(side)) / R * 1.4, nx = ux - uy * s * k, ny = uy + ux * s * k, n = Math.hypot(nx, ny); ux = nx / n; uy = ny / n; }
  }
  if (v > 30 && L > 20 && !c.hop && c.st !== 'drag') { const da = angDiff(Math.atan2(uy, ux), c.face ?? 0); c.face = (c.face ?? 0) + clamp(da, -11 * dt, 11 * dt); }   // a quick pivot into the run
  const tn = Math.abs(angDiff(Math.atan2(uy, ux), c.face ?? 0)), step = Math.min(L, v * dt * (v > 30 && !c.hop && c.st !== 'drag' ? clamp(1.3 - tn * 0.75, 0.15, 1) : 1));   // it turns into its run, not sliding off sideways
  e.x += ux * step; e.y += uy * step;
  c.v = step / Math.max(dt, 1e-4); c.dir = Math.atan2(uy, ux); c.want = step; e.phase += step * 1.348 / (c.v > 70 ? 15 : 11);   // the same stride as yours
  return L - step;
}
function clanAway(e, dist, lure) {   // a spot to run to: away from you, toward another of them if one's that way (Joe: chasing one leads you to others)
  const p = S.p; let a = Math.atan2(e.y - p.y, e.x - p.x) + (Math.random() - 0.5) * 0.9;
  if (lure) { const o = clanList().filter(q => q !== e && Math.abs(angDiff(Math.atan2(q.y - e.y, q.x - e.x), a)) < 1.2)[0]; if (o) a = lerp(a, a + angDiff(Math.atan2(o.y - e.y, o.x - e.x), a), 0.6); }
  if (Math.hypot(e.x, e.y) < 700) a = lerp(a, a + angDiff(Math.atan2(e.y, e.x), a), 0.3);   // and out, away from the fire on the hill
  for (let k = 0; k < 8; k++) { const b = a + (k ? (Math.random() - 0.5) * 1.2 : 0), x = e.x + Math.cos(b) * dist, y = e.y + Math.sin(b) * dist; if (!lakeAt(x, y, 20) && !clanRefugeAt(x, y, 40) && !clanAtBase(x, y, 40)) return { x, y }; }
  return { x: e.x + Math.cos(a) * dist, y: e.y + Math.sin(a) * dist };
}
function clanBehind(r, side = 0) { const p = S.p, a = S.aimW + Math.PI + side; return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r }; }


// ---------------- each of them ----------------
function clanVoiceFree(g) { const used = g ? clanList().filter(o => o.cl && o.cl.band === g).map(o => o.cl.voice) : [], free = CL_VOICES.filter(v => !used.includes(v)); return pick(free.length ? free : CL_VOICES); }
function clanInit(e, g) {
  const vi = Math.random() < 0.22 ? 1 : pick([0, 2, 3]), pk = pick(PERS_K), B = PERS[pk], j = () => (Math.random() - 0.5) * 0.2;
  e.cl = { st: 'roam', t: 0, o: {}, band: g || null, pers: pk, P: { cur: clamp(B.cur + j(), 0, 1), agg: clamp(B.agg + j(), 0, 1), fear: clamp(B.fear + j(), 0, 1), soc: B.soc, terr: B.terr, opp: B.opp },
    fear: B.fear * 0.4, conf: 0, allies: 0, eng: false, engT: 0, hunter: 0, z: 0, cr: 0.5, crK: 0.5, q: 0, qK: 0, v: 0, dir: 0, face: Math.random() * 6.283, faceW: 0,
    vis: false, seenT: 0, unseenT: 9, hp0: e.hp, d: 999, dPrev: 999, vi, club: Math.random() < 0.55, seed: Math.random(), rus: 0, cd: 0, stuck: 0, px: e.x, py: e.y,
    vp: Math.random() < 0.25 ? 175 + Math.random() * 45 : 95 + Math.random() * 45, voice: clanVoiceFree(g),
    lx: S.p.x, ly: S.p.y, lostT: 0, sees: false, noteT: Math.random() * 0.3, react: 0, kind: 'reg', spd: 1 };
}
function clanGo(e, st, o = {}) {
  const c = e.cl; c.st = st; c.t = 0; c.o = o; c.stuck = 0; c.dest = null; c.lean = 0; c.stare = 0; c.coil = 0; c.fake = null; c.kneel = 0; c.dragK = 0; c.flyK = 0; c.wn = c.sh = null;
  if (st !== 'roam' && st !== 'leave') c.eng = true;
  if (st === 'flee' || st === 'leave') c.dest = clanAway(e, o.dist || (st === 'flee' ? 420 : 700), st === 'flee');
  if (st === 'hdart') { e.swCd = 0; c.swung = false; }
  if (st === 'hwarn') { c.wT = 0.45 + Math.random() * 0.3; clanSay(e, 'scream'); c.gest = { k: 'scream', t: S.t }; }
  if (st === 'drop') clanSnd('rustle', e.x, e.y, 1.2, e.cl.vp, e);
}
function clanSay(e, k, v = 1) { clanSnd(k, e.x, e.y, v, e.cl.vp, e); if (k !== 'click' && k !== 'breath' && k !== 'grunt' && k !== 'hurt') e.cl.callT = S.t; }
function clanLater(dt, k, who, v = 1) { clan().q.push({ at: S.t + dt, k, who, v }); }
function clanAllies(e) { let n = 0; for (const o of clanList()) if (o !== e && o.cl.eng && o.cl.st !== 'flee' && o.cl.st !== 'leave' && Math.hypot(o.x - e.x, o.y - e.y) < 420) n++; return n; }
// how bold it feels right now: its nature, its friends about, its own ground, how weak you look, against its fear and your weapon
function clanConf(e) {
  const c = e.cl, P = c.P, C = clan(), p = S.p, g = c.band, armed = !!(dayArmId() || dayRngId());
  return P.agg + 0.15 * Math.min(3, c.allies) * (0.5 + P.soc) + (g ? g.heat * (P.terr ? 0.2 : 0.07) : 0) + C.w * (P.opp ? 0.3 : 0.1)
    + 0.06 * exRing(Math.hypot(p.x, p.y)) + (C.rage > 0 ? 0.3 : 0) - c.fear - (armed ? 0.08 : 0)
    + 0.45 * clanAngK() - 0.15 + (clanCampAt(p.x, p.y) ? 0.3 : 0)   // the days' anger; their own camp
    + 0.5 * clanHurtK() + clanAggK() * (0.45 * P.agg - 0.3) - 0.3 * (c.wary || 0);   // you're hurt; how hard you've fought them (it puts most off, and the wild ones up)
}
const clanTokFree = (urgent) => { const C = clan(); return !C.tok && C.gap <= (urgent ? 4 : 0); };
const clanR = e => { const P = e.cl.P; return Math.max(clanHomeR(e), clamp(300 - 170 * P.cur + 90 * e.cl.fear + 110 * clanAggK() + 60 * (e.cl.wary || 0) + (Math.random() - 0.5) * 60, 125, 420)); };   // how close it likes to keep (at home, outside your camp: 78-clan5)
const bandOf = g => clanList().filter(e => e.cl.band === g);
function clanBand(n, o = {}) {   // a few of them, out in the woods together, going about their own business
  const p = S.p, C = clan(), D = S.day;
  n = Math.min(n, (D.clanN ?? CL.pool) - clanList().length); if (n <= 0) return null;
  for (let k = 0; k < 60; k++) {
    const a = o.a ?? Math.random() * 6.283, d = (o.d || 780) + (Math.random() - 0.5) * 160;
    let x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    if (o.camp) { const b = Math.random() * 6.283, r = 35 + Math.random() * 30; x = o.camp.x + Math.cos(b) * r; y = o.camp.y + Math.sin(b) * r; }
    else if (lakeAt(x, y, 80) || clanRefugeAt(x, y, 200) || clanAtBase(x, y, o.nearBase ? 60 : 250) || clanSeeAt(x, y, 30) || propsNear(x, y, 24).length) continue;
    // headed somewhere that crosses your way, not straight at you: you meet because your paths cross
    const ta = Math.atan2(p.y - y, p.x - x), side = (Math.random() < 0.5 ? -1 : 1) * (100 + Math.random() * 300);
    const g = { id: ++C.bandN, x, y, a: Math.atan2(p.y + Math.sin(ta + Math.PI / 2) * side - y, p.x + Math.cos(ta + Math.PI / 2) * side - x), t: 4 + Math.random() * 4, stop: 0, heat: 0, eng: false, cool: 0 };
    C.bands.push(g);
    if (o.camp) { g.x = x; g.y = y; g.stop = 1e9; g.home = o.camp; }   // resting at their camp
    for (let i = 0; i < n; i++) {
      const b = Math.random() * 6.283, r = 15 + Math.random() * 40; spawnFoe('cannibal', { x: x + Math.cos(b) * r, y: y + Math.sin(b) * r, d }); const e = S.rg.enemies[S.rg.enemies.length - 1]; clanInit(e, g);
      clanKind(e, i === 0 && (n >= 3 || (n === 2 && Math.random() < 0.3)) && !o.noLead ? 'leader' : Math.random() < 0.28 ? 'skinny' : 'reg');   // a leader with most bands; some skinny ones
    }
    return g;
  }
  return null;
}
function clanBandStep(g, dt) {
  const p = S.p, M = bandOf(g);
  if (!M.length) { g.dead = 1; return; }
  const was = g.eng; g.eng = M.some(e => e.cl.eng); g.cool = Math.max(0, g.cool - dt);
  if (was && !g.eng) { g.cool = 45; g.a = g.home ? Math.atan2(g.home.y - g.y, g.home.x - g.x) : Math.atan2(g.y - p.y, g.x - p.x) + (Math.random() - 0.5); g.stop = 0; }   // they've had their look: off they go
  if (g.eng) { g.heat = Math.min(3, g.heat + dt / 45 * (0.5 + 0.5 * exRing(Math.hypot(p.x, p.y)))); return; }   // the longer you stay on their ground, the less they like it
  g.heat = Math.max(0, g.heat - dt / 60);
  // the band is only wherever its members are: each walks its own way (78-clan5), and nothing holds them in a ring (Joe)
  if (!(g.home && g.stop > 1e8)) { let x = 0, y = 0; for (const e of M) { x += e.x; y += e.y; } g.x = x / M.length; g.y = y / M.length; }
  if (g.stop > 0) g.stop -= dt;   // wandering: on along its way, a stop now and then, turning from water, the light and your camp
  else { const ax = g.x + Math.cos(g.a) * 90, ay = g.y + Math.sin(g.a) * 90; if (lakeAt(ax, ay, 60) || clanRefugeAt(ax, ay, 160) || (!g.home && !g.raid && clanAtBase(ax, ay, 150))) g.a += 3 * dt; }
  if ((g.t -= dt) <= 0) { g.t = 4 + Math.random() * 6; g.a = g.home && g.stop < 1e8 ? Math.atan2(g.home.y - g.y, g.home.x - g.x) + (Math.random() - 0.5) * 0.4 : g.a + (Math.random() - 0.5) * (g.away ? 0.3 : 1.3); if (!g.away && Math.random() < 0.35) g.stop = 3 + Math.random() * 6; }
  if (g.home && g.stop < 1e8 && Math.hypot(g.x - g.home.x, g.y - g.home.y) < 90) { g.stop = 1e9; g.x = g.home.x; g.y = g.home.y; }   // home: they settle by their fire
  clanBaseLook(g, M);
  if (Math.hypot(g.x - p.x, g.y - p.y) > (g.home ? 2400 : 1700) && !M.some(e => e.cl.vis)) for (const e of M) e.dead = e.gone = true;   // gone on their way
}
function clanNotice(e, quiet) {   // it has seen you: its band gathers round to look
  const c = e.cl; if (c.eng) return;
  const M = c.band ? bandOf(c.band) : [e];
  M.forEach((o, i) => { if (o.cl.eng || o.cl.st === 'leave') return; o.cl.eng = true; o.cl.engT = 0; o.cl.lx = S.p.x; o.cl.ly = S.p.y; clanGo(o, 'watch', { delay: o === e ? 0 : 0.3 + Math.random() * 0.9 }); });
  if (!quiet) { clanSay(e, Math.random() < 0.5 ? 'click' : 'chatter', 0.8); const o = M.find(q => q !== e); if (o) clanLater(0.7 + Math.random(), Math.random() < 0.5 ? 'chatter' : 'click', o, 0.7); }
}
function clanHurt(e) {   // hit: a grunt and a flinch, more afraid; then it runs, backs off, or turns on you
  const c = e.cl; c.hp0 = e.hp; c.flinch = 1; clanSay(e, 'hurt'); clanAngAdd(0.6); c.wary = 1; if (clan().rd) clan().rd.aggr += 0.35; clanFriendHit(e);
  if (c.st === 'down') return;
  if (c.saving) { const w = c.saving; c.saving = null; c.dragK = 0; if (w.cl) w.cl.saver = null; }   // hit while dragging: it lets go
  if (e.sw && e.sw.ph === 'wind') e.sw = null;
  if (c.z > 0 && ['climb', 'perch', 'leap'].includes(c.st)) { c.climbing = c.perched = 0; c.flyK = 0; clanGo(e, 'drop'); return; }
  c.fear += c.pers === 'cowardly' ? 0.55 : 0.28; if (c.pers === 'aggressive') c.P.agg = Math.min(1, c.P.agg + 0.1);
  if (!c.eng) clanNotice(e, true);
  if (clan().tok === e) clan().tok = null;
  if (e.hp < e.maxHp * 0.32 && c.kind !== 'leader' && Math.random() < 0.65) return clanDown(e);   // badly hurt: down, and one of them may come for it
  if (e.hp < e.maxHp * 0.4) { c.done = 1; return clanGo(e, 'flee', { hurt: 1 }); }   // badly hurt: it's had enough
  if (['hunt', 'hwarn', 'hdart', 'wait'].includes(c.st)) return clanGo(e, 'back', { dist: 200 });
  c.allies = clanAllies(e);
  if (clanConf(e) > 0.5 && Math.random() < 0.55 && clanTokFree(true)) return clanGo(e, 'attack', { now: 1 });
  clanGo(e, Math.random() < 0.55 ? 'retreat' : 'flee');
}
function clanReact(e) {   // you're coming at it: it stands its ground, backs off, or runs
  const c = e.cl; c.allies = clanAllies(e); if (clanPushed(e)) return; const conf = c.conf = clanConf(e); c.fear += 0.05;
  if (c.d < 60 && !(conf > 0.55 && clanTokFree(true))) return clanGo(e, Math.random() < 0.6 ? 'back' : 'flee', { dist: 160 });   // too close: it springs away
  if (conf > 0.55 && Math.random() < 0.6) return clanGo(e, clanTokFree(true) && Math.random() < 0.45 ? 'attack' : 'threat', { k: pick(['scream', 'bluff', 'beat', 'fake']) });
  if (conf > 0.12 && Math.random() < 0.55) {   // it holds its ground: a start, a hop back, and it stands there staring at you
    const a = Math.atan2(e.y - S.p.y, e.x - S.p.x) + (Math.random() - 0.5); c.hop = { vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, t: 0.22, T: 0.22 }; clanSay(e, Math.random() < 0.5 ? 'growl' : 'grunt', 0.8);
    return clanGo(e, 'watch', { pose: 0.2 });
  }
  if (conf > 0.12 || Math.random() < 0.3) return clanGo(e, 'retreat');
  clanGo(e, 'flee');
}
function clanThink(e) {   // what next: never the same each time, but always for a reason
  const c = e.cl, P = c.P, C = clan(), p = S.p, d = c.d;
  if (!rmOn() && !c.night) return clanGo(e, 'leave');
  if (C.rage > 0 && c.hunter) return clanGo(e, 'hunt');
  if (c.lostT > 4) return clanGo(e, 'search');
  c.allies = clanAllies(e);
  const conf = c.conf = clanConf(e), sp = Math.hypot(p.vx, p.vy), lit = !!clanRefugeAt(p.x, p.y, 40), busy = S.t - C.busy < 3, lead = c.kind === 'leader' && c.allies > 0, AK = 0.35 + 0.9 * clanAngK();
  const hurt = e.hp < e.maxHp * 0.6, aggK = clanAggK(), hK = clanHurtK(), seen = c.eyed ? 0.45 : c.backT > 0.5 ? 1.8 : 1;   // your eyes on it, or your back
  const off = sp > 30 && ((p.x - e.x) * p.vx + (p.y - e.y) * p.vy) / (Math.max(d, 1) * sp) > 0.5;   // you're going
  const away = sp > 105 && ((p.x - e.x) * p.vx + (p.y - e.y) * p.vy) / (Math.max(d, 1) * sp) > 0.5;
  const W = [['circle', 0.25 + 0.15 * P.cur], ['watch', 2.6 + 1.2 * P.cur],   // Joe: mostly they just stand and look at you
    ['approach', lit ? 0.1 : P.cur * 1.3 * (1 - Math.min(1, c.fear)) * (1 - 0.7 * aggK) + (busy ? 0.9 * P.cur : 0) + (clanCalm() ? 1.2 * P.cur : 0) + (off ? 0.6 * (P.agg + P.cur) : 0) + hK * P.agg],
    ['retreat', c.fear * 0.6 + (c.allies ? 0 : 0.15 * (1 - P.agg)) + aggK * (1 - P.agg) + 0.5 * (c.wary || 0) + (hurt ? 0.7 : 0)]];
  if (!lit && c.backT > 1 && d > 90 && d < 500 && !hurt) W.push(['stalk', (P.agg + P.cur) * 0.9 + hK]);   // your back's turned
  if (conf > 0.2 && !lit) W.push(['threat', (P.agg + 0.2) * conf * 1.6 + (c.band ? c.band.heat * (P.terr ? 0.5 : 0.15) : 0)]);
  if (conf > 0.45 && !lit && d < 300 && clanTokFree()) W.push(['attack', AK * (lead ? 0.3 : c.kind === 'skinny' ? 1.3 : 1) * (conf - 0.4) * 1.4 * (0.4 + 0.4 * C.w) * (P.opp ? 1 + C.w : 1) * (busy ? (P.opp ? 2.5 : 1.6) : 1) * seen * (hurt ? 0.2 : 1) * (1 + 1.5 * hK)]);   // mostly when you're weak or busy, more as their anger grows
  if (lead) { W[0][1] = 0; W[2][1] *= 0.2; if (S.t - (c.cmdT || -99) > 9 && !lit) W.push(['command', 1 + P.agg + clanAngK()]); }   // the leader holds back and sends the others
  if (c.allies && !lit) W.push(['flank', 0.15 * (P.agg + P.soc)]);
  if (away && !lit) W.push(['pursue', conf > 0.35 ? P.agg * 2 : 0.1]);
  if ((c.ib = clanInspectAt(e))) W.push(['inspect', P.cur * 1.2]);   // what you built last, or something at the edge of your camp
  if (aggK > 0.5 && P.agg < 0.5) W.push(['leave', (aggK - 0.4) * 1.5 * (1 - P.agg)]);   // you've fought too hard: it wants no more of you
  if (c.engT > 30) W.push(['leave', (0.15 + 0.4 * (1 - P.cur)) * (1 - P.agg) * Math.min(2, c.engT / 60) + (away && P.agg < 0.4 ? 0.8 : 0)]);
  if (P.cur > 0.5 && Math.random() < 0.07) {   // up a tree to look down at you
    const t = propsNear(e.x, e.y, 80).find(o => o.kind === 'tree' && (o.type === 'oak' || o.type === 'cherry'));
    if (t) { const P2 = clanSpotAt(t, true); c.post = { t, x: P2.x, y: P2.y, perch: 1 }; return clanGo(e, 'climbTo'); }
  }
  const k = wpick(W.map(w => [w[0], Math.pow(Math.max(0, w[1]), 1.5)])); if (k === 'command') c.cmdT = S.t;
  clanGo(e, k);
}
function clanAI(e, d, dt) {
  if (!e.cl) clanInit(e, null);
  const c = e.cl, p = S.p;
  c.t += dt; c.dPrev = c.d; c.d = d;
  const closing = c.closing = (p.vx * (e.x - p.x) + p.vy * (e.y - p.y)) / Math.max(d, 1);   // how fast YOU are coming at it (not it at you)
  clanEye(e, c, d, dt);
  { const moved = Math.hypot(e.x - c.px, e.y - c.py); c.stuck = c.want > 1 && moved < c.want * 0.3 ? c.stuck + dt : Math.max(0, c.stuck - dt); c.px = e.x; c.py = e.y; c.want = 0; }   // (only a move this frame counts toward being stuck)
  c.flinch = Math.max(0, (c.flinch || 0) - dt * 3);
  c.cr = 0.5; c.q = 0; c.faceW = c.eng ? Math.atan2(p.y - e.y, p.x - e.x) : c.face;
  // can it see you from where it is
  if ((c.noteT -= dt) <= 0) { c.noteT = 0.3; c.sees = d < 650 && (d < 140 || clanKnowsHome(e) || !rmBlocked(e)); if (c.sees) { c.lx = p.x; c.ly = p.y; } }
  c.lostT = c.sees ? 0 : c.lostT + dt;
  if (c.eng) c.engT += dt;
  // fear drifts toward what the moment calls for: its nature, being alone, your weapon, your firelight, its wounds
  { const armed = !!(dayArmId() || dayRngId()), lit = !!clanRefugeAt(p.x, p.y, 70);
    const eff = S.day.builds.some(B => B.t === 'effigy' && Math.hypot(B.x - e.x, B.y - e.y) < EFFIGY_R * 0.7);   // your effigy: it doesn't like it at all
    const fT = c.P.fear * 0.45 + (c.allies ? 0 : 0.15) + (armed ? 0.06 : 0) + (lit ? 0.35 : 0) + (eff ? 0.5 : 0) + (1 - e.hp / e.maxHp) * 0.6
      + clanAggK() * 0.35 * (1 - 0.6 * c.P.agg) + 0.2 * (c.wary || 0) - 0.25 * clanHurtK();   // the fight you've put up; your blood
    c.fear += (fT - c.fear) * Math.min(1, dt * 0.25); }
  { const A = p.atk; if (A && A !== c.atkSeen) { c.atkSeen = A; if (A.t < 0.25) clanParry(e, A, d); if (d < 160) c.fear += 0.06; } }   // your swing: hop clear, or the club up
  if (e.hp < c.hp0 - 0.01 && S.t < (c.block || 0)) clanBlocked(e);
  if (e.hp < c.hp0 - 0.01) clanHurt(e);
  if (c.eng && ['watch', 'circle', 'approach', 'search', 'inspect', 'hesitate', 'retreat', 'command', 'stalk', 'hide'].includes(c.st) && (c.react -= dt) <= 0 && ((closing > 70 && d < 190) || d < 55 || c.pushT > 0.9)) { c.react = 1.5; c.pushT = 0; clanReact(e); }
  else clanAnswer(e, c, d, dt);
  (CLAN_ST[c.st] || CLAN_ST.roam)(e, c, d, dt, closing);
  clanHopStep(e, dt);
  if (!c.mvF) c.v = 0; c.mvF = 0;   // stood still this frame: not still mid-stride from the last time it moved
  if (c.lookT && S.t - c.lookT < 1.2 && c.lookAt) c.faceW = Math.atan2(c.lookAt.y - e.y, c.lookAt.x - e.x);   // a glance at the one that called it
  // it can't stand inside you: bodies push apart, and one that finds itself right on top of you springs back
  if (d < 24 && c.z < 1 && !['down', 'drag', 'pounce'].includes(c.st)) {   // bodies don't pass through each other: you bump into it (it isn't shoved along ahead of you)
    const dx = p.x - e.x, dy = p.y - e.y, L = Math.hypot(dx, dy) || 1; p.x = e.x + dx / L * 24; p.y = e.y + dy / L * 24;
    if (!['attack', 'hdart', 'hwarn', 'back', 'flee', 'retreat'].includes(c.st) && !e.sw) clanGo(e, 'back', { dist: 140 + Math.random() * 60 });
  }
  // the firelight: they won't set foot in it (only to creep up to a chest of yours while you're well away)
  const R = clanRefugeAt(e.x, e.y, 26);
  if (R && !R.walls && !(c.band && c.band.raid && !c.eng)) { const dx = e.x - R.x, dy = e.y - R.y, dd = Math.hypot(dx, dy) || 1, r = R.r + 26; if (dd < r) { e.x = R.x + dx / dd * r; e.y = R.y + dy / dd * r; } }
  // rustling through the undergrowth when one moves near you, now and then a twig
  if (c.v > 40 && d < 280 && c.z < 1 && (c.rus -= dt) <= 0) {
    c.rus = (c.v > 120 ? 0.22 : 0.45) + Math.random() * 0.35;
    clanSnd(Math.random() < (c.vis ? 0.02 : 0.07) ? 'twig' : 'rustle', e.x, e.y, (0.3 + 0.7 * (1 - d / 280)) * (c.v > 120 ? 1 : 0.6), e.cl.vp, e);
  }
  // which way it faces: at you while it's watching you, the way it's going when it runs
  if (c.v > 25 && !['drag', 'down'].includes(c.st)) c.faceW = c.dir;   // moving: it looks the way it's going (Joe: no gliding sideways)
  c.face += angDiff(c.faceW, c.face) * Math.min(1, dt * (c.v > 100 ? 12 : c.v < 5 ? 8 : 6));   // stopped: it turns round to you
  e.face = Math.cos(c.face) >= 0 ? 1 : -1;
}
function clanAround(r, a) { const p = S.p; return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r }; }
function clanOpen(x, y) { return !lakeAt(x, y, 20) && !clanRefugeAt(x, y, 40); }
const CLAN_ST = {
  roam(e, c, d, dt) {   // going about its own business: its own way, its own pace, its own stops (78-clan5)
    const g = c.band;
    if (!g || g.dead) { c.band = null; return clanGo(e, 'leave', { calm: 1 }); }
    if (g.stalk || g.close) return clanShadow(e, c, g, d, dt);   // it knows where you are: round you trunk to trunk, then in
    clanWander(e, c, g, d, dt);
    // it sees you first (Joe: always): on its way off after a look, it only keeps an eye on you unless you come close
    if (clanSpots(e, c, d, dt)) { c.knowT = S.t; if (g.cool <= 0 || d < 250) clanNotice(e); }
  },
  watch(e, c, d, dt) {   // stood or crouched at the side of a trunk, looking at you; shifting about, head on one side
    if (c.o.delay > 0) { c.o.delay -= dt; c.cr = 0.7; c.t = 0; return; }
    if (!c.o.init) {
      c.o.init = 1; c.o.T = (6 + Math.random() * 9) * (0.7 + 0.6 * c.P.cur); const held = c.o.pose !== undefined; c.o.pose = c.o.pose ?? (Math.random() < 0.55 ? 0.9 : 0.15 + 0.3 * Math.random()); c.o.sh = 1 + Math.random();
      const t = !held && propsNear(e.x, e.y, 45).find(o => o.kind === 'tree' && o.type !== 'dead');
      if (t) { const a = Math.atan2(t.y - cam.position.z, t.x - cam.position.x) + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 0.5), r = t.r * t.s + 10; c.goal = { x: t.x + Math.cos(a) * r, y: t.y + Math.sin(a) * r }; }
    }
    if ((c.o.sh -= dt) <= 0) { c.o.sh = 3 + Math.random() * 4; if (Math.random() < 0.2) { const a = Math.random() * 6.283; c.goal = { x: e.x + Math.cos(a) * 12, y: e.y + Math.sin(a) * 12 }; } if (Math.random() < 0.15) c.o.pose = c.o.pose > 0.5 ? 0.2 : 0.9; }   // shifting its weight, a step aside
    if (c.goal) clanMove(e, c.goal.x, c.goal.y, CL.walk * 0.8, dt);
    c.cr = c.o.pose; c.stare = 1;
    if (!c.o.said && c.t > 0.8 && Math.random() < dt * 0.15) { c.o.said = 1; clanSay(e, pick(['click', 'chatter', 'growl']), 0.7); }
    if (c.lostT > 4) return clanGo(e, 'search');
    if (c.t > c.o.T) clanThink(e);
  },
  circle(e, c, d, dt) {   // round you to look from another side: quick, swerving, sometimes doubling back
    const p = S.p;
    if (!c.o.init) {
      c.o.init = 1; const a0 = Math.atan2(e.y - p.y, e.x - p.x); c.o.s = Math.random() < 0.5 ? -1 : 1; c.o.r = clanR(e); c.o.fast = Math.random() < 0.1; c.o.zz = Math.random() * 6;
      for (let k = 0; k < 5; k++) { c.o.a = a0 + c.o.s * (0.5 + Math.random() * 1.0); const Q = clanAround(c.o.r, c.o.a); if (clanOpen(Q.x, Q.y)) break; c.o.s = -c.o.s; }
    }
    if (!c.o.G || c.o.flipped) { c.o.G = clanAround(c.o.r, c.o.a); c.o.flipped = 0; }   // a spot on the ground to go to: it doesn't slide along with you (Joe)
    const G = c.o.G, L = Math.hypot(G.x - e.x, G.y - e.y);
    clanMove(e, G.x, G.y, c.o.fast ? CL.run : CL.walk * 1.3, dt);
    c.q = c.o.fast ? 1 : 0.35; c.cr = 0.45;
    if (!c.o.flip && c.t > 0.6 && Math.random() < dt * 0.15) { c.o.flip = 1; c.o.s = -c.o.s; c.o.a += c.o.s * (0.7 + Math.random() * 0.6); c.o.flipped = 1; }   // a sudden change of mind
    if (L < 18 || c.t > 8 || c.stuck > 0.6) clanGo(e, 'watch');
  },
  approach(e, c, d, dt) {   // closer, a few steps at a time, stopping to look
    if (!c.o.init) { c.o.init = 1; c.o.stop = Math.max(clanHomeR(e), clamp(150 - 80 * c.P.cur + 70 * c.fear - (c.o.calm ? 45 : 0), 60, 180)); c.o.go = 1 + Math.random() * 1.5; }
    const to = c.o.to || S.p, dd = Math.hypot(to.x - e.x, to.y - e.y);
    if (dd > c.o.stop) {
      c.o.go -= dt;
      if (c.o.go > 0) { clanMove(e, to.x, to.y, CL.walk * (c.o.crawl ? 0.7 : 1.1), dt); c.cr = c.o.crawl ? 0.85 : 0.35; }
      else { c.cr = 0.7; c.stare = 1; if (c.o.go < -(0.5 + Math.random() * 0.03 * 30)) { c.o.go = 0.8 + Math.random() * 1.8; c.o.crawl = Math.random() < 0.4; } }
    } else {
      c.stare = 1; c.cr = 0.25; c.o.held = (c.o.held || 0) + dt;
      if (!c.o.said) { c.o.said = 1; if (Math.random() < 0.5) clanSay(e, pick(['chatter', 'click', 'growl']), 0.8); }
      if (c.o.held > 1.2 + 2 * c.P.cur) return clanGo(e, 'watch');
    }
    if (c.t > 14 || c.stuck > 0.8) clanThink(e);
  },
  threat(e, c, d, dt) {   // a scream, a chest beat, a charge that stops short, a feinted swing, or a fast swerving dance round you
    if (!c.o.init) {
      c.o.init = 1; c.o.k = c.o.k || wpick([['scream', 1], ['beat', 0.8], ['bluff', 0.3 + c.P.agg], ['fake', 0.8 * c.P.agg + 0.1], ['dance', 0.2]]);
      if (c.o.k === 'scream' || c.o.k === 'bluff') clanSay(e, 'scream');
      if (c.o.k === 'beat') clanSay(e, 'growl');
      if (c.o.k === 'dance') clanSay(e, 'chatter');
      if (c.o.k === 'scream' || c.o.k === 'beat') c.gest = { k: c.o.k, t: S.t };
      c.o.s = Math.random() < 0.5 ? -1 : 1; c.o.flipT = 0.4;
    }
    const k = c.o.k, p = S.p;
    if (k === 'scream' || k === 'beat') { c.cr = 0.2; c.stare = 1; if (k === 'beat' && Math.random() < dt * 3) clanSnd('thud', e.x, e.y, 0.25, e.cl.vp, e); if (c.t > (k === 'beat' ? 1.9 : 1.4)) clanThink(e); return; }
    if (k === 'bluff' || k === 'fake') {
      const stop = k === 'bluff' ? 78 : 56;
      if (!c.o.ph) { clanMove(e, p.x, p.y, CL.dart, dt); c.q = d > 120 ? 0.7 : 0; c.cr = 0.4; if (d < stop || c.t > 2.5) { c.o.ph = 1; c.o.t1 = c.t; if (k === 'bluff') { c.gest = { k: 'scream', t: S.t }; clanSay(e, 'scream'); } else { c.fake = { t0: S.t }; clanSay(e, 'grunt'); } } return; }
      c.cr = 0.3; c.stare = 1;
      if (c.t - c.o.t1 > (k === 'bluff' ? 1.1 : 0.5)) { const A = clanAway(e, 90); c.o.facing = 1; clanMove(e, A.x, A.y, CL.run, dt); if (c.t - c.o.t1 > 1.6) clanThink(e); }
      return;
    }
    // dance: swerving round you, close, never still
    if (!c.o.G || c.o.flipT <= 0) { const r = clamp(d, 90, 150), a = Math.atan2(e.y - p.y, e.x - p.x) + c.o.s * 0.9; c.o.G = clanAround(r, a); }
    clanMove(e, c.o.G.x, c.o.G.y, CL.run * 1.15, dt); c.cr = 0.5; c.q = 0.2;
    if ((c.o.flipT -= dt) <= 0) { c.o.flipT = 0.35 + Math.random() * 0.6; if (Math.random() < 0.6) c.o.s = -c.o.s; if (Math.random() < 0.3) clanSay(e, pick(['chatter', 'growl']), 0.7); }
    if (c.t > 2.5 + 1.5 * c.seed) clanThink(e);
  },
  attack(e, c, d, dt) {   // for real: a warning, then in at you for one blow, then off
    const C = clan();
    if (!c.o.init) {
      c.o.init = 1;
      if (C.tok && C.tok !== e) return clanGo(e, 'threat');
      C.tok = e; c.o.ph = 'warn';
      if (c.o.landed) { c.o.ph = 'in'; c.o.t0 = c.t; e.swCd = 0; c.swung = false; }   // straight out of the pounce
      if (c.vis) { clanSay(e, 'scream'); c.gest = { k: 'scream', t: S.t }; c.o.wT = 0.4 + Math.random() * 0.35; }   // in front of you: it screams
      else { clanSnd(Math.random() < 0.6 ? 'twig' : 'breath', e.x, e.y, 1, e.cl.vp, e); c.o.wT = 0.8 + Math.random() * 0.6; }   // behind you: a twig, a breath
      if (c.o.now) c.o.wT *= 0.6;
      if (c.o.landed) c.o.wT = 0;
    }
    if (c.o.ph === 'warn') { c.cr = 0.9; c.coil = 1; if (c.t >= c.o.wT) { c.coil = 0; c.o.ph = 'in'; c.o.t0 = c.t; e.swCd = 0; c.swung = false; } return; }
    if ((clanRefugeAt(S.p.x, S.p.y, 10) || d > 280) && !e.sw) return clanAtkEnd(e);
    if (!e.sw && !c.swung && c.t - c.o.t0 > 0.35 && Math.random() < dt * 0.9 * c.fear) { clanSay(e, 'grunt'); return clanAtkEnd(e); }   // loses its nerve partway
    c.q = 0; c.cr = 0.45;
    if (c.o.lp) {   // the running leap: off its feet and in at you
      const L = c.o.lp; L.t += dt; const u = Math.min(1, L.t / L.T); c.z = Math.sin(Math.PI * u) * 15; c.flyK = 1;
      clanMove(e, S.p.x, S.p.y, 270, dt); if (u >= 1) { c.z = 0; c.flyK = 0; c.o.lp = null; clanSnd('thud', e.x, e.y, 0.6, e.cl.vp, e); }
      if (d > CL_MELEE.trig * 1.1) return;
      c.z = 0; c.flyK = 0; c.o.lp = null;
    }
    if (!c.o.leapt && !e.sw && d > 70 && d < 120) { c.o.leapt = 1; if (Math.random() < 0.2 + 0.4 * c.P.agg) { c.o.lp = { t: 0, T: 0.4 }; clanSay(e, 'grunt'); return; } }
    if (e.sw || d < CL_MELEE.trig * 1.1) { const on = foeMelee(e, d, dt, CL_MELEE); if (e.sw) c.swung = true; c.v = 0; if (on) return; }
    if (c.swung && !e.sw) {   // the bold ones swing again
      if (!c.o.combo && c.P.agg > 0.55 && c.kind !== 'skinny' && d < 60 && Math.random() < 0.6) { c.o.combo = 1; c.swung = false; e.swCd = 0; return; }
      return clanAtkEnd(e);
    }
    clanMove(e, S.p.x, S.p.y, CL.dart * 0.95, dt);
    if (c.t - c.o.t0 > 2.6) clanAtkEnd(e);
  },
  back(e, c, d, dt) {   // after a go at you: off a little way, looking back at you
    if (!c.o.init) { c.o.init = 1; const a = Math.atan2(e.y - S.p.y, e.x - S.p.x) + (Math.random() - 0.5) * 1.2, r = c.o.dist || 190 + Math.random() * 70; c.dest = clanAround(r, a); }
    c.cr = 0.5;
    const L = clanMove(e, c.dest.x, c.dest.y, CL.run * 1.1, dt);   // it turns and runs (Joe: never backpedalling, never sliding)
    if (L < 12 || c.t > 3.5 || c.stuck > 0.5) { if (clan().rage > 0 && c.hunter) clanGo(e, 'hunt'); else clanGo(e, 'watch'); }
  },
  retreat(e, c, d, dt) {   // backing away: a few steps facing you, then turning to go, then a look back
    if (!c.o.init) { c.o.init = 1; const a = Math.atan2(e.y - S.p.y, e.x - S.p.x) + (Math.random() - 0.5) * 0.9; c.dest = clanAround(Math.max(d + 130, 300 + Math.random() * 100), a); }
    c.cr = 0.55;
    const L = clanMove(e, c.dest.x, c.dest.y, c.t < 0.6 ? CL.walk * 1.3 : CL.run, dt);
    if (L < 15 || c.t > 5 || c.stuck > 0.6) { if (c.fear > 0.85 || c.done) clanGo(e, 'leave'); else clanGo(e, 'watch'); }
  },
  flee(e, c, d, dt) {   // off into the trees at a run; hurt, it stumbles
    c.q = c.o.hurt ? 0.4 : 1; c.cr = 0.5; c.stumble = c.o.hurt ? 1 : 0;
    if (!c.dest || c.stuck > 0.4) { c.dest = clanAway(e, 380, true); c.stuck = 0; }
    if (d < 42 && c.t > 0.6 && !c.o.hurt && clanTokFree(true)) { c.stumble = 0; return clanGo(e, 'attack', { now: 1 }); }   // caught: it turns on you
    const L = clanMove(e, c.dest.x, c.dest.y, CL.flee * (c.o.hurt ? 0.8 : 1), dt);
    if (L < 12 || (c.unseenT > 1.2 && d > 300) || c.t > 7) { c.stumble = 0; if (c.done || c.fear > 0.8) clanGo(e, 'leave'); else if (clan().rage > 0 && c.hunter) clanGo(e, 'hunt'); else clanGo(e, 'watch'); }
  },
  flank(e, c, d, dt) {   // round behind you while another has your eye
    if (!c.o.init) { c.o.init = 1; c.o.r = Math.max(clanHomeR(e), 120 + Math.random() * 50); c.o.side = (Math.random() - 0.5) * 0.9; }
    const B = clanBehind(c.o.r, c.o.side), p = S.p, a = Math.atan2(e.y - p.y, e.x - p.x), da = angDiff(Math.atan2(B.y - p.y, B.x - p.x), a);
    if (!c.o.G || S.t > c.o.Gt) { c.o.G = Math.abs(da) > 0.5 ? clanAround(Math.max(c.o.r, Math.min(d, 220)), a + clamp(da, -0.7, 0.7)) : B; c.o.Gt = S.t + 1.2; }   // round you, not through you: spot to spot
    const G = c.o.G;
    clanMove(e, G.x, G.y, CL.run, dt); const L = Math.hypot(B.x - e.x, B.y - e.y); c.cr = 0.65; c.q = c.v > 100 ? 0.6 : 0;
    if (L < 20) { c.allies = clanAllies(e); if (clanConf(e) > 0.45 && clanTokFree() && Math.random() < 0.5 + (c.P.opp ? 0.3 : 0)) clanGo(e, 'attack'); else clanGo(e, 'watch'); }
    else if (c.t > 7) clanThink(e);
  },
  pursue(e, c, d, dt) {   // you ran: the bold ones come after you
    const p = S.p, sp = Math.hypot(p.vx, p.vy);
    clanMove(e, p.x, p.y, d > 110 ? Math.max(CL.run, sp * 0.95) : sp * 0.8, dt); c.q = c.v > 115 ? 1 : 0.3; c.cr = 0.45;
    if ((c.o.yell = (c.o.yell ?? 0.5) - dt) <= 0) { c.o.yell = 2 + Math.random() * 2; clanSay(e, Math.random() < 0.5 ? 'scream' : 'yell', 0.9); }
    if (d < 75 && clanTokFree(true)) return clanGo(e, 'attack', { now: 1 });
    if (c.t > 5 + 4 * c.P.agg || sp < 40) clanThink(e);
  },
  search(e, c, d, dt) {   // you went out of its sight: it goes to where it saw you last and looks about
    if (!c.o.G) { const B = clanBase(); c.o.G = clanHomeR(e) && clanAtBase(c.lx, c.ly) ? (a => ({ x: B.x + Math.cos(a) * (B.r + 30), y: B.y + Math.sin(a) * (B.r + 30) }))(Math.atan2(e.y - B.y, e.x - B.x)) : { x: c.lx, y: c.ly }; }   // not into your camp: to its edge
    const L = clanMove(e, c.o.G.x, c.o.G.y, CL.walk * 1.3, dt); c.cr = 0.7; c.o.facing = 1;
    c.faceW = L > 20 ? Math.atan2(c.o.G.y - e.y, c.o.G.x - e.x) : c.face + Math.sin(c.t * 1.3) * 0.05;
    if (L < 20 && !c.o.said) { c.o.said = 1; clanSay(e, pick(['click', 'chatter']), 0.6); }
    if (c.sees && c.t > 0.5) { clanSay(e, 'chatter', 0.8); return clanGo(e, 'watch'); }
    if (c.t > 12) clanGo(e, 'leave');
  },
  inspect(e, c, d, dt) {   // something you built: it goes to have a look, crouches, touches it
    const B = c.ib || clan().build; if (!B) return clanThink(e);
    const L = clanMove(e, B.x, B.y, CL.walk * 1.2, dt);
    if (L < 30) { c.cr = 0.9; c.gest = c.gest && c.gest.k === 'touch' ? c.gest : { k: 'touch', t: S.t }; c.o.at = (c.o.at || 0) + dt; c.faceW = Math.atan2(B.y - e.y, B.x - e.x); c.o.facing = 1; if (c.o.at > 3 + Math.random() * 0.05 * 60) { if (B === clan().build && Math.random() < 0.5) clan().build = null; c.ib = null; clanThink(e); } }
    if (c.t > 15) clanThink(e);
  },
  hesitate(e, c, d, dt) {   // one of them dead: it stops, screams or wails at you, unsure
    c.cr = 0.3; c.stare = 1;
    if (!c.o.said) { c.o.said = 1; clanSay(e, Math.random() < 0.5 ? 'wail' : 'scream'); c.gest = { k: 'scream', t: S.t }; }
    if (c.t > 1.8 + Math.random() * 0.03) clanThink(e);
  },
  climbTo(e, c, d, dt) { if (!c.post) return clanThink(e); const L = clanMove(e, c.post.x, c.post.y, CL.run, dt); c.q = 0.6; if (L < 5) clanGo(e, 'climb'); else if (c.t > 5) clanThink(e); },
  climb(e, c, d, dt) {   // up the trunk, quick, hand over hand
    c.z = Math.min(c.post.t.s * 62, c.z + dt * 55); c.cr = 0.9; c.climbing = 1;
    c.faceW = Math.atan2(c.post.t.y - e.y, c.post.t.x - e.x); c.o.facing = 1;
    if (c.z >= c.post.t.s * 62 - 0.5) { c.climbing = 0; clanGo(e, 'perch'); }
    if (d < 90) { c.climbing = 0; clanGo(e, 'drop'); }
  },
  perch(e, c, d, dt) {   // crouched on a limb, looking down at you; it drops when you come close or it's had its look
    c.cr = 1; c.perched = 1; c.stare = 1;
    if (!c.o.said && c.t > 1.5) { c.o.said = 1; clanSay(e, Math.random() < 0.5 ? 'click' : 'chatter', 0.6); }
    if (c.t > 2.5 && Math.random() < dt * 0.15 && clanPerchMove(e, c, d)) return;   // across to another tree
    if (d < 110 || c.t > 8 + 10 * c.seed) { if (clanPerchMove(e, c, d)) return; c.perched = 0; clanGo(e, 'drop'); }
  },
  drop(e, c, d, dt) {   // down out of the branches with a thud
    c.vz = (c.vz || 0) - 520 * dt; c.z = Math.max(0, c.z + c.vz * dt); c.cr = 0.2; c.falling = 1;
    if (c.z <= 0) { c.vz = 0; c.falling = 0; c.climbing = 0; c.perched = 0; clanSnd('thud', e.x, e.y, 1, e.cl.vp, e); clanThink(e); }
  },
  hunt(e, c, d, dt) {   // after a kill, the bold ones: out in the open round you, running from spot to spot, stopping to scream at you
    const C = clan(), p = S.p;
    if (clanRefugeAt(p.x, p.y)) return clanGo(e, 'wait');
    c.cd -= dt;
    if (!c.hs || (c.hs.at && S.t > c.hs.at)) {   // a new spot on the ground, away from where the others are
      let best = null, bs = -1e9;
      for (let k = 0; k < 8; k++) {
        const a = Math.atan2(e.y - p.y, e.x - p.x) + (Math.random() - 0.5) * 2.4, r = 140 + Math.random() * 90, G = clanAround(r, a);
        if (!clanOpen(G.x, G.y)) continue;
        let sc = -Math.hypot(G.x - e.x, G.y - e.y) * 0.2 + Math.random() * 40;
        for (const o of clanList()) if (o !== e && o.cl.hs) sc -= Math.max(0, 140 - Math.hypot(o.cl.hs.x - G.x, o.cl.hs.y - G.y));
        if (sc > bs) { bs = sc; best = G; }
      }
      c.hs = best || clanAround(180, Math.random() * 6.283); c.hs.at = 0;
    }
    const L = clanMove(e, c.hs.x, c.hs.y, Math.hypot(c.hs.x - e.x, c.hs.y - e.y) > 120 ? CL.dart : CL.run, dt); c.cr = 0.4;
    if (L < 12) {   // there: it stands, faces you, screams or beats its chest; then off to another spot
      c.v = 0; c.stare = 1; c.cr = 0.25;
      if (!c.hs.at) { c.hs.at = S.t + 1.5 + Math.random() * 2.5; if (Math.random() < 0.6) { clanSay(e, pick(['scream', 'yell', 'growl']), 0.9); c.gest = { k: Math.random() < 0.5 ? 'scream' : 'beat', t: S.t }; } }
    }
    if (d < 120 && (c.dPrev - d) > 2.5) {   // you come at it: it stands its ground, or runs for it
      c.hs = null;
      if (clanTokFree(true) && Math.random() < 0.5) { C.tok = e; clanGo(e, 'hwarn'); } else { const A = clanAway(e, 260); c.hs = { x: A.x, y: A.y, at: 0 }; }
    }
  },
  hwarn(e, c, d, dt) { c.cr = 0.9; c.coil = 1; if (c.t >= c.wT) { c.coil = 0; clanGo(e, 'hdart'); } },
  hdart(e, c, d, dt) {
    const C = clan(); c.q = d > 90 ? 0.7 : 0; c.cr = 0.45;
    const end = () => { C.tok = null; C.tokT = 5 + Math.random() * 2; c.cd = 3.5 + Math.random() * 2.5; clanGo(e, 'back', { dist: 200 }); };
    if (clanRefugeAt(S.p.x, S.p.y, 10) && !e.sw) return end();
    if (e.sw || d < CL_MELEE.trig * 1.1) { const on = foeMelee(e, d, dt, CL_MELEE); if (e.sw) c.swung = true; c.v = 0; if (on) return; }
    if (c.swung && !e.sw) return end();
    clanMove(e, S.p.x, S.p.y, CL.dart * 0.95, dt);
    if (c.t > 2.6) end();
  },
  wait(e, c, d, dt) {   // you're in the light: they stop at its edge and wait for you, each shifting spot to spot in its own time
    const R = clanRefugeAt(S.p.x, S.p.y, 0);
    if (!R) return clanGo(e, clan().rage > 0 && c.hunter ? 'hunt' : 'watch');
    if (!c.o.G || (c.o.at && S.t > c.o.at)) {
      const a0 = Math.atan2(e.y - R.y, e.x - R.x); let G = null;
      for (let k = 0; k < 6 && !G; k++) { const a = a0 + (Math.random() - 0.5) * 1.6, r = R.r + 50 + Math.random() * 70, x = R.x + Math.cos(a) * r, y = R.y + Math.sin(a) * r; if (!lakeAt(x, y, 20) && !clanList().some(o => o !== e && o.cl.o.G && Math.hypot(o.cl.o.G.x - x, o.cl.o.G.y - y) < 45)) G = { x, y }; }
      c.o.G = G || { x: e.x, y: e.y }; c.o.at = 0; c.o.pose = Math.random() < 0.5 ? 0.88 : 0.12; c.o.v = CL.walk * (1 + Math.random());
    }
    const L = clanMove(e, c.o.G.x, c.o.G.y, c.o.v, dt);
    if (L < 10) { c.cr = c.o.pose; c.stare = 1; if (!c.o.at) c.o.at = S.t + 3 + Math.random() * 6; } else c.cr = 0.5;
    if ((c.hoot = (c.hoot ?? 2) - dt) <= 0) { c.hoot = 5 + Math.random() * 7; clanSay(e, pick(['yell', 'growl', 'chatter']), 0.7); }
    if (clan().rage <= 0 && c.t > 6) clanGo(e, 'leave');
  },
  leave(e, c, d, dt) {   // lost interest (or dusk): away into the trees
    c.q = c.o.calm ? 0 : 0.6; c.cr = 0.4;
    if (!c.dest || c.stuck > 0.4) { c.dest = clanAway(e, 700); c.stuck = 0; }
    clanMove(e, c.dest.x, c.dest.y, c.o.calm ? CL.walk * 1.4 : CL.run, dt);
    if ((c.unseenT > 0.5 && d > 520) || d > 1000 || c.t > 25) {
      const g = c.band, others = g ? bandOf(g).filter(o => o !== e && o.cl.eng) : [];
      if (g && !g.dead && rmOn() && !c.night && !c.done && !others.length) { c.eng = false; c.engT = 0; c.hunter = 0; for (const o of bandOf(g)) if (o !== e && o.cl.st === 'leave') { o.cl.eng = false; o.cl.engT = 0; clanGo(o, 'roam'); } clanGo(e, 'roam'); }   // the band off on its way again, each finding the others in its own time
      else e.dead = e.gone = true;
    }
  },
};
function clanAtkEnd(e) { const C = clan(); if (C.tok === e) C.tok = null; C.gap = (C.rage > 0 ? 3 + Math.random() * 4 : 12 + Math.random() * 10) * (1.2 - 0.5 * clanAngK()); e.cl.z = 0; e.cl.flyK = 0; clanGo(e, e.cl.kind === 'skinny' ? 'flee' : 'back'); }   // the skinny ones hit and run

// ---------------- the clan as a whole ----------------
function clanWeak(C) {   // how good a moment this is for them: hurt, hungry or thirsty, tired, far from the fire, dusk, busy, laden
  const D = S.day, rg = S.rg, p = S.p; let w = 0;
  if (rg.hp <= rg.maxHp * 0.5) w += 1;
  if (D.food < 25 || D.water < 25) w += 0.6;
  if (D.st < 30) w += 0.5;
  const h = homeSpot(); if (!h || Math.hypot(p.x - h.x, p.y - h.y) > 700) w += 0.7;
  const f = dayT(); if (f > NIGHT_IN - 0.07 && f < NIGHT_IN + DUSK) w += 0.7;
  if (S.t - C.busy < 1.5) w += 0.8;
  if (D.inv.reduce((a, s) => a + (s && s.id === 'logs' ? s.n : 0), 0) >= 4) w += 0.5;
  return w;
}
function clanDied(e) {   // one of them dead: the others react each in its own way; if any are bold enough, the woods ring and they hunt you
  const C = clan(), D = S.day, c = e.cl || {};
  D.clanN = Math.max(0, (D.clanN ?? CL.pool) - 1);
  if (C.tok === e) C.tok = null; if (C.rd) C.rd.aggr += 0.8;   // you killed one: the rest take note
  const body = { e, t: 0, rig: c.rig, face: c.face || 0, z: c.z || 0, x: e.x, y: e.y }; C.dead.push(body); if (c.rig) c.rig.keep = true;
  clanSnd('die', e.x, e.y, 1, c.vp || 120, e);
  clanAngAdd(c.kind === 'leader' ? 16 : 10);   // they don't forget
  if (c.saving && c.saving.cl) { c.saving.cl.saver = null; } if (c.saver && c.saver.cl) { c.saver.cl.saving = null; if (!c.saver.dead) clanGo(c.saver, 'hesitate'); }
  if (c.kind === 'leader') {   // the leader: its band breaks and runs, wailing, and will be back for you
    const M = c.band ? bandOf(c.band).filter(o => o !== e) : [];
    for (const o of M) { o.cl.fear += 0.6; o.cl.hunter = 0; o.cl.done = 1; clanGo(o, 'flee', { dist: 700 }); clanLater(0.3 + Math.random(), 'wail', o, 1); }
    C.revenge = { t: 70 + Math.random() * 50, n: Math.max(3, M.length + 1) };
    addShake(0.15); return;
  }
  let hunters = 0;
  for (const o of clanList()) {
    if (o === e || Math.hypot(o.x - e.x, o.y - e.y) > 800 || o.cl.st === 'down' || o.cl.st === 'drag') continue;
    const q = o.cl; q.fear += q.pers === 'cowardly' ? 0.55 : 0.25; if (!q.eng) clanNotice(o, true);
    q.allies = clanAllies(o);
    const bold = q.P.agg + 0.12 * q.allies - q.fear + (q.P.terr ? 0.15 : 0);
    if (bold > 0.3 || (C.rage > 0 && bold > 0.1)) { q.hunter = 1; hunters++; clanGo(o, 'hesitate'); }   // a scream first, then it comes
    else if (q.fear > 0.7 || q.pers === 'cowardly') clanGo(o, 'flee');
    else if (Math.hypot(S.p.x - e.x, S.p.y - e.y) > 140 && Math.random() < 0.65) clanGo(o, 'mourn', { body });   // to its side, on its knees
    else clanGo(o, 'hesitate');
  }
  if (hunters || C.rage > 0 || Math.random() < 0.6) {   // the calls ring through the woods, and more come
    C.more = C.rage > 0 ? Math.min(2, C.more + 1) : 0;
    C.rage = C.rage > 0 ? C.rage + 40 : CL.rage; C.tokT = 4.5;
    for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283, d = 500 + Math.random() * 400; clanLater(1 + i * 0.8 + Math.random() * 0.5, 'wail', { x: S.p.x + Math.cos(a) * d, y: S.p.y + Math.sin(a) * d, vp: 100 + Math.random() * 60 }, 1); }
    C.reinf = Math.max(0, 3 + C.more - hunters); C.reinfT = 3 + Math.random() * 3;
  }
  addShake(0.15);
}
// ---------------- they come and go (Joe) ----------------
// They aren't always about. Most of the day the woods are quiet: long enough to build your bed, gather and almost forget them.
// Then they come: the first you know of it is a call close by in the trees, an answer from somewhere else, and a band near
// you. Once they've had their look and gone (or their time is up), the woods go quiet again. The quiet gets shorter as their
// anger grows. A kill, revenge, their camps and anyone already watching you all carry on whatever the woods are doing.
const TIDE = { first: [45, 90], quiet: [70, 150], near: [70, 140], after: 20 };   // seconds; a day's light lasts about six minutes
const rnd = ([a, b]) => a + Math.random() * (b - a);
function clanTide(C, dt, p) {
  const T = C.tide || (C.tide = { ph: 'quiet', t: rnd(TIDE.first) });
  const busy = C.rage > 0 || !!C.revenge || clanList().some(e => e.cl.eng && e.cl.st !== 'leave' && !e.cl.done);
  if (T.ph === 'near') {
    if (C.bands.some(g => g.eng)) T.met = 1;
    T.t -= dt; if (T.met && !busy) T.after -= dt;
    if (!busy && (T.t <= 0 || T.after <= 0)) {   // they've gone: the woods go quiet
      T.ph = 'quiet'; T.t = rnd(TIDE.quiet) * (1.15 - 0.45 * clanAngK()); T.hint = 0;
      for (const g of C.bands) if (!g.home && !g.eng) { g.away = 1; g.stop = 0; g.a = Math.atan2(g.y - p.y, g.x - p.x) + (Math.random() - 0.5) * 0.6; }
    }
  } else {
    if (!busy) T.t -= dt;
    if (!T.hint && T.t < 30) { T.hint = 1; if (Math.random() < 0.4) { const a = Math.random() * 6.283; clanSnd('yell', p.x + Math.cos(a) * 1150, p.y + Math.sin(a) * 1150, 0.6, 100 + Math.random() * 60); } }   // sometimes, just before, something very far off
    if (T.t <= 0) clanArrive(C, T, p);
  }
  return T.ph === 'near';
}
function clanArrive(C, T, p) {   // all of a sudden: a call in the trees close by, an answer, and they're here
  T.ph = 'near'; T.t = rnd(TIDE.near); T.met = 0; T.after = TIDE.after;
  const n = 2 + (Math.random() < 0.3 + 0.08 * S.day.n + 0.4 * clanAngK() ? 1 : 0), g = clanBand(n, { d: 470 });
  C.bandT = 50 + Math.random() * 40;
  const M = g ? bandOf(g) : []; if (!M.length) return;
  clanLater(0.1, Math.random() < 0.6 ? 'yell' : 'scream', M[0], 1.1);
  const a = Math.atan2(M[0].y - p.y, M[0].x - p.x) + (Math.random() < 0.5 ? 1 : -1) * (1.2 + Math.random());
  clanLater(1.3 + Math.random() * 0.8, Math.random() < 0.5 ? 'yell' : 'chatter', M[1] || { x: p.x + Math.cos(a) * 520, y: p.y + Math.sin(a) * 520, vp: 110 + Math.random() * 50 }, 1);
  if (Math.random() < 0.5) clanLater(0.6, 'twig', M[M.length - 1], 1.2);
}
function clanStep(dt) {
  const rg = S.rg, D = S.day, p = S.p;
  if (!CLAN_ON || !D || rg.phase !== 'fight') return;
  const C = clan();
  for (const q of C.q) if (S.t >= q.at) { const w = q.who; if (!w.dead) clanSnd(q.k, w.x, w.y, q.v, w.cl ? w.cl.vp : w.vp, w.cl ? w : null); if (w.cl && q.k !== 'click') w.cl.callT = S.t; q.done = 1; }
  C.q = C.q.filter(q => !q.done);
  if (ARENA && !ARENA.woods) { for (const e of clanList()) e.dead = e.gone = true; return; }
  if (D.clanN === undefined) D.clanN = CL.pool;
  if (D.clanDay !== D.n) { if (D.clanDay !== undefined) { D.clanN = Math.min(CL.pool, D.clanN + 2); clanAngAdd(4); } D.clanDay = D.n; }   // a new morning: more of them come out of the woods, angrier
  const all = clanList();
  for (const e of all) { if (!e.cl) clanInit(e, null); clanSee(e, dt); }
  if (ARENA && ARENA.woods) woodsStep(dt, C, all);
  const night = !rmOn();
  if (night) {   // dusk: they melt away, all but any out after you tonight with torches (78-clan6)
    for (const e of all) if (!e.cl.night && e.cl.st !== 'leave') { e.cl.done = 1; clanGo(e, 'leave'); }
    if (!all.some(e => e.cl.night)) { C.rage = 0; C.tok = null; return; }
  }
  // what you're up to: chopping and working with your hands, building
  const H = heldSlot();
  if (p.act || (p.atk && H && DIT[H.id] && DIT[H.id].tool)) C.busy = S.t;
  if ((C.nb ?? D.builds.length) < D.builds.length) { const B = D.builds[D.builds.length - 1]; if (B && B.t !== 'cache') C.build = { x: B.x, y: B.y }; }
  C.nb = D.builds.length;
  C.w = clanWeak(C); C.gap -= dt; clanRead(dt);
  if (S.t - C.busy < 0.1) clanAngAdd(dt * 0.02);   // felling their trees
  const K = !ARENA && !night && clanCampAt(p.x, p.y, 200);
  if (K) {
    if (clanCampAt(p.x, p.y)) clanAngAdd(dt * 0.08);   // in their camp
    if (!C.bands.some(g => g.home === K) && clanList().length < 7 && (C.campT = (C.campT ?? 0) - dt) <= 0) { C.campT = 120; const g = clanBand(2 + (Math.random() < 0.5 + clanAngK() ? 1 : 0), { camp: K }); if (g) g.heat = 1; }   // there's always someone at home
  }
  if (!ARENA && !night) for (const k of clanCamps()) if (!C.bands.some(g => g.home === k) && Math.hypot(k.x - p.x, k.y - p.y) < 1100 && Math.hypot(k.x - p.x, k.y - p.y) > 700 && clanList().length < 6 && (C.campT = (C.campT ?? 0) - dt) <= 0) { C.campT = 120; clanBand(2 + (Math.random() < 0.4 ? 1 : 0), { camp: k }); }
  if (!night && C.revenge && (C.revenge.t -= dt) <= 0) {   // back for their leader
    const R2 = C.revenge; C.revenge = null; const g = clanBand(Math.min(4, R2.n), { d: 520, noLead: 1 });
    if (g) { for (const e of bandOf(g)) { e.cl.hunter = 1; e.cl.fear = 0; clanGo(e, 'hunt'); } C.rage = CL.rage; C.tokT = 6; for (let i = 0; i < 3; i++) clanLater(i * 0.7, 'yell', bandOf(g)[i % bandOf(g).length], 1); }
  }
  const near = ARENA ? true : !night && clanTide(C, dt, p);
  for (const g of C.bands) clanBandStep(g, dt);
  C.bands = C.bands.filter(g => !g.dead);
  if (C.tok && (C.tok.dead || !['attack', 'hwarn', 'hdart'].includes(C.tok.cl.st))) C.tok = null;
  // more of them out in the woods: a band or two about, wandering
  const want = (D.n >= 3 || clanAngK() > 0.45 ? 2 : 1) + (C.bands.length && C.bands.every(g => g.eng) ? 1 : 0);
  if (near && C.bands.filter(g => !g.home || g.eng).length < Math.min(2, want) && (C.bandT -= dt) <= 0 && clanList().length < 7) {
    clanBand(2 + (Math.random() < 0.3 + 0.08 * D.n + 0.4 * clanAngK() ? 1 : 0) + (clanAngK() > 0.6 && Math.random() < 0.5 ? 1 : 0), C.first ? { d: 600 } : {}); C.first = 0; C.bandT = (40 + Math.random() * 50) * (1.2 - 0.5 * clanAngK());   // bigger bands, more often, as their anger grows
  }
  // retaliation
  if (C.rage > 0) {
    C.rage -= dt;
    if (C.reinf > 0 && (C.reinfT -= dt) <= 0) { const g = clanBand(Math.min(C.reinf, 3), { d: 520 }); if (g) for (const e of bandOf(g)) { e.cl.hunter = 1; e.cl.fear = 0; clanGo(e, 'hunt'); } C.reinf = 0; }
    const H2 = clanList().filter(e => e.cl.hunter && !e.cl.done);
    for (const e of H2) if (!['hunt', 'hwarn', 'hdart', 'wait', 'back', 'flee', 'drop', 'hesitate', 'down', 'drag', 'rescue', 'pounce', 'attack', 'batter', 'loot', 'raid'].includes(e.cl.st)) { e.cl.climbing = 0; if (e.cl.z > 0) { e.cl.perched = 0; clanGo(e, 'drop'); } else clanGo(e, 'hunt'); }
    if (!clanRefugeAt(p.x, p.y) && !C.tok && (C.tokT -= dt * (Math.hypot(p.vx, p.vy) > 80 ? 0.6 : 1)) <= 0) {   // one at a time, its turn to go at you
      const ready = H2.filter(e => e.cl.st === 'hunt' && e.cl.cd <= 0 && e.cl.d < 280);
      if (ready.length) { const behind = e => Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), S.aimW)); ready.sort((a, b) => behind(b) - behind(a)); C.tok = ready[0]; clanGo(C.tok, 'hwarn'); }
    }
    if (C.rage <= 0 || (!H2.length && !C.reinf)) { C.rage = 0; C.more = 0; for (const e of H2) { e.cl.hunter = 0; e.cl.hs = null; clanGo(e, 'retreat'); } }   // it's over: they fall back into the trees
  }
  // now and then, far off, their calls
  if (near && (C.callT = (C.callT ?? 20) - dt) <= 0) {
    C.callT = 22 + Math.random() * 35;
    const far = clanList().filter(e => e.cl.d > 350), a = Math.random() * 6.283;
    const w = far.length ? pick(far) : { x: p.x + Math.cos(a) * 900, y: p.y + Math.sin(a) * 900, vp: 100 + Math.random() * 60 };
    const k = Math.random() < 0.6 ? 'yell' : 'chatter'; clanSnd(k, w.x, w.y, 0.8, w.cl ? w.cl.vp : w.vp, w.cl ? w : null);
    if (Math.random() < 0.7) { const b = Math.random() * 6.283; clanLater(1 + Math.random() * 1.5, k, { x: p.x + Math.cos(b) * 950, y: p.y + Math.sin(b) * 950, vp: 100 + Math.random() * 70 }, 0.7); }   // and an answer from somewhere else
  }
}

// ---------------- their sounds: human voices, and the woods they move through ----------------
// A voice is built like a real one: a buzzing throat (its pitch sliding, wobbling, cracking into a rasp when it strains), breath
// through it, and three resonances for the vowel. Grunts, screams, calls to each other, growls, a jabbering chatter, a death cry.
// Each of them has its own pitch (some deep, some higher), so you can tell there are several.
const CL_SND = { clack: [1.1, 600], twig: [1.1, 520], rustle: [0.55, 420], click: [0.9, 700], thud: [1, 700], breath: [0.8, 380],
  grunt: [1, 800], hurt: [1, 800], scream: [1.15, 1400], yell: [1, 1900], growl: [1, 700], chatter: [0.9, 1000], die: [1.15, 1400], wail: [1, 2100] };
// Real recorded voices (assets/voices.json, listed in assets/VOICES.md) take over from the built voice once they're decoded.
// Joe: "the canibals sounds need to be better I think their is some in there that don't match so let's narrow it down a bit to
// create a consistent coherent sound library". So the screams, calls, grunts and some of the hurt cries are now four men
// recorded in one studio on one mic, and each cannibal keeps one of those four voices (a band's members each a different one)
// for everything that man recorded, so you can tell them apart and none of them changes voice mid-fight. The growls, pain
// grunts, death cries, long wails and a babble come from the few other dry, close, single-man recordings, matched in tone to
// the four. Only a touch of pitch from its owner (deep leaders, high skinny ones) now, as more bends it out of a human voice.
// Distance and direction are placeOut's: it keeps the voice where the cannibal is as it moves and as you turn.
const CL_VB = {}, CL_VLAST = {}, CL_VG = { grunt: 1.6, hurt: 1.6, scream: 1.9, yell: 1.4, growl: 1.2, chatter: 0.95, die: 2.2, wail: 1.9 };   // about as loud as the built voice was
const CL_VOICES = ['A', 'B', 'C', 'D'];
function clanVoiceOf(who, vp) { return who && who.cl ? who.cl.voice : CL_VOICES[Math.floor(vp * 7.3) % 4]; }   // a call from no one in particular: still one man's
function clanRec(k, x, y, v, vp, who) {
  let B = (CL_VB[k] || []).filter(Boolean); if (B.length < 2) return false;
  const mine = B.filter(b => b.voice === clanVoiceOf(who, vp)); if (mine.length >= 2) B = mine;   // its own voice, where that man recorded this kind of cry
  let i = Math.floor(Math.random() * B.length); if (B[i] === CL_VLAST[k]) i = (i + 1) % B.length; CL_VLAST[k] = B[i];
  const rate = clamp(Math.pow(vp / 125, 0.2), 0.93, 1.08) * (0.98 + Math.random() * 0.04);
  const o = placeOut(x, y, CL_SND[k][0] * v * CL_VG[k], CL_SND[k][1], who, (B[i].duration - (B[i].lead || 0)) / rate + 0.3); if (!o) return true;
  const s = actx.createBufferSource(); s.buffer = B[i]; s.playbackRate.value = rate;
  s.connect(o); s.start(actx.currentTime, B[i].lead || 0);   // from where the voice starts, straight away
  return true;
}
const VOW = { a: [730, 1090, 2440], o: [570, 840, 2410], u: [320, 870, 2240], e: [530, 1840, 2480], i: [290, 2290, 3010], ae: [660, 1720, 2410], uh: [560, 1190, 2390] };
let CL_RASP = null;
function clanNz(t, type, f, len, g, out, Q = 0.8) {
  const s = actx.createBufferSource(), bq = actx.createBiquadFilter(), gn = actx.createGain();
  s.buffer = noiseBuf; bq.type = type; bq.frequency.value = f; bq.Q.value = Q;
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + Math.min(0.01, len * 0.2)); gn.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(bq); bq.connect(gn); gn.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
}
// o: len, f [[u, Hz]...] the pitch, v [[u, vowel]...], env [[u, level]...], g loudness, breath, rasp, jit, vib, fk (formants up for a higher voice)
function clanVoice(t, out, o) {
  const len = o.len, src = actx.createOscillator(), lfo = actx.createOscillator(), lg = actx.createGain(), fl = actx.createOscillator(), fg0 = actx.createGain();
  src.type = 'sawtooth';
  o.f.forEach(([u, f], i) => src.frequency[i ? 'linearRampToValueAtTime' : 'setValueAtTime'](f, t + u * len));
  lfo.type = 'triangle'; lfo.frequency.value = o.vib || 5 + Math.random() * 2; lg.gain.value = o.f[0][1] * (o.jit ?? 0.025); lfo.connect(lg); lg.connect(src.frequency);
  fl.type = 'sine'; fl.frequency.value = 23 + Math.random() * 9; fg0.gain.value = o.f[0][1] * 0.012 * (1 + 3 * (o.rasp || 0)); fl.connect(fg0); fg0.connect(src.frequency);   // the throat's roughness
  let node = src;
  if (o.rasp) {
    if (!CL_RASP) { CL_RASP = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 1023 * 2 - 1; CL_RASP[i] = Math.tanh(x * 2.5) + 0.15 * Math.sin(x * 23); } }
    const dr = actx.createGain(), ws = actx.createWaveShaper(); dr.gain.value = 1 + 4 * o.rasp; ws.curve = CL_RASP; src.connect(dr); dr.connect(ws); node = ws;
  }
  const nz = actx.createBufferSource(), ng = actx.createGain(), mix = actx.createGain(); nz.buffer = noiseBuf; ng.gain.value = (o.breath ?? 0.2) * 2.2; nz.connect(ng);
  node.connect(mix); ng.connect(mix);
  const env = actx.createGain(); env.gain.setValueAtTime(0.0001, t);
  for (let k = 0; k < 3; k++) {
    const bp = actx.createBiquadFilter(), fg = actx.createGain(); bp.type = 'bandpass'; bp.Q.value = [5, 7, 9][k]; fg.gain.value = [1, 0.55, 0.28][k];
    o.v.forEach(([u, vw], i) => bp.frequency[i ? 'linearRampToValueAtTime' : 'setValueAtTime'](VOW[vw][k] * (o.fk || 1), t + u * len));
    mix.connect(bp); bp.connect(fg); fg.connect(env);
  }
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800; env.connect(lp); lp.connect(out);
  for (const [u, g] of o.env) env.gain.linearRampToValueAtTime(Math.max(0.0001, g * o.g * 3.2), t + u * len);
  env.gain.linearRampToValueAtTime(0.0001, t + len);
  src.start(t); lfo.start(t); fl.start(t); nz.start(t, Math.random() * 0.4);
  for (const s of [src, lfo, fl, nz]) s.stop(t + len + 0.05);
}
function clanSnd(k, x, y, v = 1, vp = 120, who = null) {
  if (!actx || !noiseBuf || !sfxGain || !CL_SND[k]) return;
  if (CL_VG[k] && (clanRec(k, x, y, v, vp, who) || (VOX && VOX[k]))) return;   // a voice: the recorded one, never the built one beside it
  if (k === 'hurt') k = 'grunt';
  const o = placeOut(x, y, CL_SND[k][0] * v, CL_SND[k][1], who, 2.6); if (!o) return;
  const t = actx.currentTime, R = Math.random, fk = vp > 160 ? 1.17 : 1, V = (q) => clanVoice(q.t ?? t, o, Object.assign({ fk }, q));
  if (k === 'twig') { clanNz(t, 'highpass', 2600, 0.025, 0.9, o); clanNz(t + 0.035 + R() * 0.03, 'bandpass', 1800, 0.045, 0.6, o, 3); boomAt(t, 260, 120, 0.05, 0.25, o); }
  else if (k === 'rustle') { for (let i = 0; i < 3; i++) clanNz(t + i * 0.07 + R() * 0.05, 'bandpass', 2400 + R() * 2400, 0.12 + R() * 0.1, 0.35, o, 1.2); }
  else if (k === 'click') { const n = 3 + Math.floor(R() * 4); for (let i = 0; i < n; i++) clanNz(t + i * (0.09 + R() * 0.06), 'bandpass', 1900 + R() * 600, 0.02, 0.9, o, 9); }   // tongue clicks
  else if (k === 'clack') { clanNz(t, 'bandpass', 1300, 0.06, 1, o, 4); clanNz(t, 'highpass', 3000, 0.03, 0.7, o); boomAt(t, 340, 180, 0.07, 0.4, o); }   // a blow on its club
  else if (k === 'thud') { boomAt(t, 95, 42, 0.3, 0.6, o); clanNz(t, 'lowpass', 1400, 0.25, 0.45, o); }
  else if (k === 'breath') { clanNz(t, 'bandpass', 1100, 0.32, 0.45, o, 1.4); clanNz(t + 0.4, 'bandpass', 760, 0.4, 0.4, o, 1.4); }   // a breath in, a breath out, close by
  else if (k === 'grunt') V({ len: 0.18 + R() * 0.1, f: [[0, vp * 1.35], [1, vp * 0.85]], v: [[0, 'uh'], [1, 'u']], env: [[0.07, 1], [0.5, 0.7]], g: 0.9, breath: 0.45, rasp: 0.5 });
  else if (k === 'scream') {   // high and ragged, the voice cracking
    const L = 0.65 + R() * 0.35, hi = vp * (3.1 + R() * 0.8);
    V({ len: L, f: [[0, hi * 0.75], [0.12, hi], [0.6, hi * 0.95], [1, hi * 0.7]], v: [[0, 'a'], [0.5, 'ae'], [1, 'a']], env: [[0.06, 1], [0.7, 0.85]], g: 1, breath: 0.4, rasp: 0.9, jit: 0.05, vib: 7 });
  }
  else if (k === 'yell') {   // calling to the others: "hoo-ah, hoo-AH"
    const n = 2 + Math.floor(R() * 3); let tt = t;
    for (let i = 0; i < n; i++) { const last = i === n - 1, L = last ? 0.45 : 0.24, f = vp * (1.7 + 0.25 * i + (last ? 0.4 : 0)); V({ t: tt, len: L, f: [[0, f * 0.85], [0.4, f], [1, f * (last ? 1.1 : 0.9)]], v: [[0, 'o'], [0.5, last ? 'a' : 'o'], [1, 'a']], env: [[0.12, 1], [0.7, 0.8]], g: 0.8, breath: 0.25, rasp: 0.25 }); tt += L + 0.07; }
  }
  else if (k === 'growl') {   // low in the throat, rattling
    const L = 0.6 + R() * 0.4, env = []; for (let u = 0.04; u < 0.95; u += 0.035) env.push([u, 0.5 + 0.5 * (Math.round(u / 0.035) % 2)]);
    V({ len: L, f: [[0, vp * 0.8], [0.5, vp * 0.92], [1, vp * 0.75]], v: [[0, 'uh'], [1, 'u']], env, g: 0.9, breath: 0.35, rasp: 1 });
  }
  else if (k === 'chatter') {   // a quick jabbering "eh-eh-ah-eh", half a laugh
    const n = 4 + Math.floor(R() * 4); let tt = t;
    for (let i = 0; i < n; i++) { const L = 0.08 + R() * 0.05, f = vp * (1.8 + R() * 0.5); V({ t: tt, len: L, f: [[0, f], [1, f * 0.85]], v: [[0, pick(['e', 'ae', 'a'])], [1, 'uh']], env: [[0.15, 1], [0.6, 0.6]], g: 0.7, breath: 0.3, rasp: 0.3 }); tt += L + 0.04 + R() * 0.05; }
  }
  else if (k === 'wail') {   // a long call carried a long way: "ooo-AAA"
    const n = 2 + Math.floor(R() * 2); let tt = t;
    for (let i = 0; i < n; i++) { const L = 0.5 + R() * 0.3, f = vp * (2.2 + 0.35 * i); V({ t: tt, len: L, f: [[0, f * 0.8], [0.3, f], [1, f * 1.08]], v: [[0, 'u'], [0.4, 'o'], [1, 'a']], env: [[0.15, 1], [0.8, 0.9]], g: 0.9, breath: 0.25, rasp: 0.4, vib: 6 }); tt += L + 0.1; }
  }
  else if (k === 'die') {   // a cry that breaks and falls away
    V({ len: 1.2, f: [[0, vp * 3.2], [0.25, vp * 3], [0.7, vp * 1.6], [1, vp * 1.0]], v: [[0, 'a'], [0.5, 'o'], [1, 'u']], env: [[0.05, 1], [0.5, 0.8], [0.9, 0.3]], g: 1, breath: 0.45, rasp: 0.8, jit: 0.06 });
    V({ t: t + 1.3, len: 0.35, f: [[0, vp * 1.1], [1, vp * 0.7]], v: [[0, 'uh'], [1, 'u']], env: [[0.1, 0.6], [0.6, 0.4]], g: 0.6, breath: 0.6, rasp: 0.4 });
  }
}

// ---------------- how they look: your body, gone wild ----------------
// The same skinned body as yours (76-body), with no pack or harness, barefoot, the trousers torn off below the knee and the
// sleeves gone, everything filthy, mud up the legs, clay or ochre or charcoal on the face, matted hair. One look in four or so
// still has the orange beanie it crashed in.
const clanHash = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
const cmix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const smoothK = u => u * u * (3 - 2 * u);
const CL_BASE = { feet: [92, 70, 54], sole2: [52, 40, 32], mud: [64, 50, 38], belt: [96, 76, 50], band: [138, 26, 24], bandD: [96, 18, 18] };
// Their look is one clan's: ash-grey or mud-dark skin, and painted over it in the same three colours every time, bone-white clay,
// dried-blood red and soot black, in big shapes you can read across a clearing. Each wears a strip of red rag knotted round
// the arm. Grim against the bright woods, never cheerful, but you know one of them the moment you see it.
const CL_RED = [158, 28, 22], CL_WHITE = [226, 220, 204], CL_SOOT = [30, 26, 24];
const CLAN_LOOK = [
  // ash-grey, red to the elbows as if it had dipped its arms in blood, a red slash across the chest, a soot band over the eyes
  { C: { tunic: [72, 62, 52], trou: [56, 46, 38], trouL: [60, 49, 40], skin: [164, 156, 144], hair: [28, 22, 18] }, bare: 1,
    body: (x, y, z) => y > 19 && y < 31.5 && Math.abs(x + (y - 25) * 0.9) < 3.4 + 0.5 * Math.sin(y * 3 + z) ? CL_RED : (Math.abs(x) > 6 && y < 22.5 + 0.9 * Math.sin(z * 3 + x * 2) ? CL_RED : null),
    paintC: CL_SOOT, paint: (x, y, z) => z > 2.4 && Math.abs(y - 36.7) < 0.95 },
  // the one in the beanie: pale as ash, white clay round the eyes, red fingers dragged down the chest, red round the mouth
  { C: { tunic: [92, 80, 64], trou: [62, 52, 42], trouL: [66, 55, 44], skin: [178, 170, 156], hair: [40, 30, 22], rust: [196, 92, 50], rustD: [150, 68, 40], rib: [164, 76, 44], bob: [176, 166, 146] },
    cap: 1, bare: 1, body: (x, y, z) => z > 0 && y > 20 && y < 31 - Math.abs(x) * 0.3 && [-2.6, -0.9, 0.8, 2.5].some(o => Math.abs(x - o - Math.sin(y * 0.8) * 0.3) < 0.42) ? CL_RED : null,
    paintC: CL_WHITE, paint: (x, y, z) => z > 2.4 && y > 35.4 && y < 37.8 && Math.abs(x) < 3.6, paint2C: CL_RED, paint2: (x, y, z) => z > 2.4 && y > 32.8 && y < 34.8 && Math.abs(x) < 2.2 },
  // mud-dark, striped all over in white clay, the jaw chalked white like bone
  { C: { tunic: [70, 56, 44], trou: [54, 44, 36], trouL: [58, 47, 38], skin: [104, 78, 58], hair: [24, 20, 16] }, bare: 1,
    body: (x, y, z) => y > 9 && y < 31.5 && ((y + Math.abs(x) * 0.35 + 0.4 * Math.sin(x * 2 + z)) % 3.2) < 0.95 ? CL_WHITE : null,
    paintC: CL_WHITE, paint: (x, y, z) => z > 1.8 && y > 32.6 && y < 35.6 },
  // soot to the elbows and over the face like a mask, the eyes ringed in white; a red handprint on the chest
  { C: { tunic: [64, 52, 42], trou: [50, 42, 36], trouL: [54, 45, 38], skin: [134, 116, 100], hair: [22, 18, 16] }, beard: 1, bare: 1,
    body: (x, y, z) => (Math.abs(x) > 6 && y < 25 + 0.8 * Math.sin(z * 3 + x)) || (y < 13 + Math.sin(x * 3 + z * 2)) ? CL_SOOT
      : z > 2 && y > 23 && y < 29 && Math.hypot(x - 1.6, (y - 25.6) * 0.8) < 2.1 + 0.6 * Math.sin(Math.atan2(y - 25.6, x - 1.6) * 5) ? CL_RED : null,
    paintC: CL_SOOT, paint: (x, y, z) => z > 1.6 && y > 33.4 && y < 40 && !(Math.abs(Math.abs(x) - 1.7) < 1.1 && Math.abs(y - 36.7) < 1.1 && Math.abs(Math.abs(x) - 1.7) > 0.45) },
  // the leader: white-painted, the face chalked into a skull, red smeared across the chest, a crown of sticks and bone
  { C: { tunic: [196, 186, 166], trou: [44, 36, 30], trouL: [48, 39, 32], skin: [206, 198, 180], hair: [22, 18, 16], bone: [228, 220, 200], stick: [70, 52, 38] }, bare: 1, lead: 1,
    body: (x, y, z) => z > 0 && y > 24 && y < 28.5 && Math.abs(y - 26.2 - Math.sin(x * 0.6) * 0.8) < 0.9 ? CL_RED : null,
    paintC: CL_WHITE, paint: (x, y, z) => z > 1.6 && y > 33.4 && y < 40 },
];
function clanTint(V) {
  const C = V.C;
  return (c, x, y, z) => {
    let k = c;
    if (c === C.boot || c === C.lace) k = C.feet;   // barefoot: the boots long gone
    else if (c === C.sole) k = C.sole2;
    else if ((c === C.trou || c === C.trouL) && y < 9.5 + 1.8 * Math.sin(x * 2.1 + z * 3.3) + 1.2 * Math.sin(x * 5.7 - z * 1.3)) k = C.skin;   // torn off below the knee
    else if (c === C.roll || c === C.btn) k = c === C.roll ? C.skin : C.tunic;
    else if (c === C.tunic && (V.bare || (Math.abs(x) > 6 && y < 30.2 + 1.2 * Math.sin(z * 4 + y * 2)))) k = C.skin;   // the sleeves gone (or the whole shirt)
    else if (c === C.tunic && y < 20.4 + 0.9 * Math.sin(x * 3.1 + z * 2.3)) k = C.trou;   // a ragged hem
    else if (c === C.strap || c === C.metal) k = C.belt;
    let painted = false;
    if (V.body && k === C.skin) { const b = V.body(x, y, z); if (b) { k = b; painted = true; } }   // the clan's paint
    if (V.paint && k !== C.eye && V.paint(x, y, z)) { k = V.paintC; painted = true; }
    if (V.paint2 && k !== C.eye && V.paint2(x, y, z)) { k = V.paint2C; painted = true; }
    const n = 0.5 + 0.5 * Math.sin(x * 1.3 + y * 0.9) * Math.sin(z * 1.7 - y * 0.6), mud = clamp((13 - y) / 13, 0, 1);
    k = cmix(k, C.mud, clamp((painted ? 0.02 : 0.08) + 0.55 * mud * (0.4 + 0.6 * n) + (painted ? 0.06 : 0.14) * n, 0, 0.7));   // the paint flaked and dirty, but bold
    const sp = 0.86 + 0.2 * clanHash(Math.round(x * 2), Math.round(y * 2), Math.round(z * 2));
    return [k[0] * sp, k[1] * sp, k[2] * sp];
  };
}
function clanExtra(V) {
  return K => {
    const { lump, one, col } = K;
    if (!V.cap) {   // matted hair over the crown, clumps hanging behind
      lump([0, 38.4, -0.5], [4.45, 3.9, 4.45], one('head'), col('hair'), 14, 10, Math.PI * 0.62);
      for (let i = 0; i < 5; i++) { const a = -1.2 + i * 0.6; lump([Math.sin(a) * 3.4, 34.6 + (i % 2) * 0.8, -2.6 - Math.cos(a) * 0.9], [1.2, 2.2, 1.0], one('head'), col('hair'), 6, 6); }
    }
    if (V.lead) {   // a crown of sticks with bone on the tips, and a string of bones round the neck
      for (let i = 0; i < 7; i++) { const a = -1.3 + i * 0.43, L = 5 + 3 * (i % 2); lump([Math.sin(a) * 3.2, 41 + L * 0.5, -0.4 + Math.cos(a) * 1.2], [0.45, L * 0.5, 0.45], one('head'), col('stick'), 6, 6); lump([Math.sin(a) * 3.2, 41 + L, -0.4 + Math.cos(a) * 1.2], [0.8, 1.2, 0.8], one('head'), col('bone'), 6, 6); }
      for (let i = 0; i < 9; i++) { const a = -1.4 + i * 0.35; lump([Math.sin(a) * 4.3, 30.4 - Math.cos(a) * 1.4, Math.cos(a) * 3.9], [0.7, 1.2, 0.6], one('chest'), col('bone'), 6, 6); }
    }
    if (V.beard) lump([0, 33.8, 2.5], [2.6, 2.4, 1.9], one('head'), col('hair'), 10, 8);
    lump([0, 18.2, 0], [5.0, 0.7, 3.9], one('hips'), col('belt'), 14, 4);   // a rope belt
    lump([-6.0, 26.4, 0], [2.3, 1.0, 2.3], one('armL'), col('band'), 10, 4);   // the clan's red rag, knotted round the arm
    lump([-7.4, 25.2, 0.4], [0.5, 1.8, 0.4], one('armL'), col('bandD'), 6, 6);
  };
}
let CLAN_GEO = null;
const CLAN_RIGS = [];
// every look's body, made as a run starts (startRun): it's a fifth of a second's work, and made the first time one came in
// sight it froze the game just as a cannibal stepped out of the trees
function clanGeoInit() {
  if (!CLAN_GEO) CLAN_GEO = CLAN_LOOK.map(V => buildBody({ C: Object.assign({}, BODY_COL, CL_BASE, V.C), tint: clanTint(Object.assign({}, V, { C: Object.assign({}, BODY_COL, CL_BASE, V.C) })), cap: !!V.cap, pack: false, extra: clanExtra(V) }));
}
function clanRig(vi) {
  let R = CLAN_RIGS.find(q => !q.owner && q.vi === vi); if (R) return R;
  if (CLAN_RIGS.length >= 12) return null;
  clanGeoInit();
  const bones = BONES.map(([n, , p]) => { const b = new THREE.Bone(); b.name = n; b.position.set(p[0], p[1], p[2]); return b; });
  BONES.forEach(([n, par], i) => { if (par) bones[BI[par]].add(bones[i]); });
  const mat = new THREE.ShaderMaterial({ uniforms: Object.assign({ flash: { value: 0 } }, LU), vertexShader: bodyMat.vertexShader, fragmentShader: bodyMat.fragmentShader });
  const mesh = new THREE.SkinnedMesh(CLAN_GEO[vi], mat), edge = new THREE.SkinnedMesh(CLAN_GEO[vi], bodyEdge), sk = new THREE.Skeleton(bones);
  mesh.add(bones[0]); mesh.bind(sk); edge.bind(sk, mesh.bindMatrix);
  mesh.frustumCulled = edge.frustumCulled = false; mesh.visible = edge.visible = false;
  scene.add(castsShadow(mesh)); scene.add(edge);
  const B = {}; bones.forEach(b => B[b.name] = b);
  const cur = {}; for (const [n] of BONES) cur[n] = [0, 0, 0];
  R = { mesh, edge, B, cur, mat, vi, owner: null, root: [0, 0] }; CLAN_RIGS.push(R); return R;
}
// ---- the pose: hunched and watchful standing, a deep squat behind a tree, running upright like you ----
function clanPose(R, e, c, now, dt, dead) {
  const P = {}; for (const [n] of BONES) P[n] = [0, 0, 0];
  // how fast it is really going over the ground, from where it was last frame (not what its brain last asked for), smoothed,
  // and the stride from the ground it covers: the legs only move when it does, and settle together as it stops
  const mx = e.x - (R.px ?? e.x), my = e.y - (R.py ?? e.y), md = dead || c.flyK || c.hop || c.climbing ? 0 : Math.hypot(mx, my); R.px = e.x; R.py = e.y;
  const vNow = dt > 0 && md < 40 ? md / dt : 0; R.vs = (R.vs ?? vNow) + (vNow - (R.vs ?? vNow)) * Math.min(1, dt * 7);
  if (md < 40) R.ph = (R.ph ?? c.seed * 6.283) + md * 1.348 / lerp(11, 15, clamp((R.vs - 45) / 50, 0, 1));
  { const st = Math.floor((R.ph ?? 0) / Math.PI); if (R.stepI !== undefined && st !== R.stepI && R.vs > 8 && !dead && !(c.z > 1)) clanFoot(e, R.vs, c.crK); R.stepI = st; }   // a foot down, twice a stride
  const t = now + c.seed * 37, v = R.vs, ph = R.ph ?? 0, wk = smoothK(clamp((v - 3) / 26, 0, 1));
  c.crK += ((c.cr ?? 0.6) - c.crK) * Math.min(1, dt * 5); c.qK = 0;
  const cr = c.crK * (1 - 0.9 * clamp(v / 70, 0, 1)), q = 0;
  let rootY = -1.2, stiff = 12, lunge = 0, roll = 0;
  // standing: hunched, knees soft, arms hanging long, the head pushed forward; a slow sway and a curious tilt of the head
  P.spine[0] = 0.32; P.chest[0] = 0.16; P.neck[0] = -0.12; P.head[0] = -0.3 + 0.05 * Math.sin(t * 0.7);
  P.head[2] = 0.22 * Math.sin(t * 0.43) * (c.stare ? 1.3 : 0.6); P.head[1] = 0.25 * Math.sin(t * 0.31);
  P.legL[0] = P.legR[0] = -0.22; P.shinL[0] = P.shinR[0] = 0.45; P.footL[0] = P.footR[0] = -0.2;
  P.armL = [-0.14 + 0.04 * Math.sin(t * 0.9), 0, -0.16]; P.armR = [-0.14 - 0.04 * Math.sin(t * 0.9), 0, 0.16]; P.foreL[0] = P.foreR[0] = -0.35;
  P.hips[2] = 0.04 * Math.sin(t * 0.5); P.chest[2] = -0.03 * Math.sin(t * 0.5);
  // walking or running: the same run as yours (76-body), upright, arms pumping against the legs (Joe: human, not gorillas)
  if (wk > 0) {
    const I = {}; for (const [n] of BONES) I[n] = P[n].slice(); const rY = rootY;
    const gk = Math.min(1, v / RUN) + 0.6 * clamp((v - 130) / 50, 0, 1), sw = Math.sin(ph), cw = Math.cos(ph), k = 0.35 + 0.65 * gk;
    P.legL = [-sw * 0.85 * k, 0, 0]; P.legR = [sw * 0.85 * k, 0, 0];
    P.shinL[0] = 0.2 + 1.35 * k * Math.max(0, cw) ** 1.5 + 0.15 * k; P.shinR[0] = 0.2 + 1.35 * k * Math.max(0, -cw) ** 1.5 + 0.15 * k;
    P.footL[0] = -P.legL[0] * 0.5 - P.shinL[0] * 0.55 + 0.15; P.footR[0] = -P.legR[0] * 0.5 - P.shinR[0] * 0.55 + 0.15;
    P.armL = [sw * (0.55 + 0.3 * gk) * k, 0.1 * sw * k, -0.13 - 0.04 * Math.max(0, -sw) * k]; P.armR = [-sw * (0.55 + 0.3 * gk) * k, 0.1 * sw * k, 0.13 + 0.04 * Math.max(0, sw) * k];
    P.foreL[0] = -0.35 - 0.55 * k - 0.45 * k * Math.max(0, -sw); P.foreR[0] = -0.35 - 0.55 * k - 0.45 * k * Math.max(0, sw);
    P.hips = [0, sw * 0.22 * k, -cw * 0.09 * k]; P.spine = [0.12 + 0.55 * (0.12 + 0.35 * gk), 0, 0]; P.chest = [0.35 * (0.12 + 0.35 * gk), -sw * 0.32 * k, cw * 0.05 * k];
    P.neck[0] = -0.05; P.head = [-0.1 - 0.2 * gk, sw * 0.08 * k, -cw * 0.03 * k];
    rootY = Math.abs(cw) * (1.5 + 0.8 * (1 - gk)) * k - 0.6 * k;
    if (wk < 1) { for (const [n] of BONES) P[n] = cmix(I[n], P[n], wk); rootY = lerp(rY, rootY, wk); }   // easing out of the stance into the stride, and back
  }
  // crouching: a deep squat, weight forward, hands down near the ground, the head up and watching
  if (cr > 0.01) {
    rootY -= 9.5 * cr; P.legL[0] -= 1.3 * cr; P.legR[0] -= 1.3 * cr; P.shinL[0] += 1.85 * cr; P.shinR[0] += 1.85 * cr; P.footL[0] -= 0.55 * cr; P.footR[0] -= 0.55 * cr;
    P.spine[0] += 0.45 * cr; P.chest[0] += 0.25 * cr; P.head[0] -= 0.55 * cr;
    P.armL[0] -= 0.75 * cr; P.armR[0] -= 0.75 * cr; P.foreL[0] -= 0.25 * cr; P.foreR[0] -= 0.25 * cr; P.armL[2] -= 0.1 * cr; P.armR[2] += 0.1 * cr;
    P.legL[2] = -0.18 * cr; P.legR[2] = 0.18 * cr;   // knees out
  }
  // leaning out from behind the trunk to look at you
  if (c.lean) { const s = c.lean; P.spine[2] += -s * 0.3; P.chest[2] += -s * 0.25; P.head[2] += s * 0.25; P.hips[1] += s * 0.2; }
  // up a tree: hand over hand on the trunk, or crouched on a limb with a hand up on it
  if (c.climbing) { const g = Math.sin(t * 9); P.armL = [-2.6 + 0.5 * g, 0, -0.2]; P.armR = [-2.6 - 0.5 * g, 0, 0.2]; P.foreL[0] = P.foreR[0] = -0.6; P.legL[0] = -1.2 + 0.5 * g; P.legR[0] = -1.2 - 0.5 * g; P.shinL[0] = P.shinR[0] = 1.6; P.spine[0] = 0.1; P.chest[0] = 0; P.head[0] = -0.5; rootY = -5; stiff = 20; }
  if (c.perched) { P.armL = [-2.4, 0.3, -0.35]; P.foreL[0] = -0.7; }
  if (c.falling) { P.armL = [-2.8, 0, -0.5]; P.armR = [-2.8, 0, 0.5]; P.foreL[0] = P.foreR[0] = -0.4; P.legL[0] = P.legR[0] = -1.1; P.shinL[0] = P.shinR[0] = 1.7; stiff = 18; }
  // a call: the head thrown back, mouth up, arms out and bouncing
  if (c.callT && S.t - c.callT < 1.1 && !c.climbing) { const u = (S.t - c.callT) / 1.1, k = Math.sin(Math.PI * u), b = Math.abs(Math.sin(u * 18)); P.head[0] -= 0.75 * k; P.neck[0] -= 0.3 * k; P.spine[0] -= 0.25 * k; P.armL = cmix(P.armL, [-0.6, 0, -1.0 - 0.2 * b], k); P.armR = cmix(P.armR, [-0.6, 0, 1.0 + 0.2 * b], k); P.foreL[0] = lerp(P.foreL[0], -1.3, k); P.foreR[0] = lerp(P.foreR[0], -1.3, k); rootY += 1.2 * b * k; }
  // gestures, to warn you off: a scream with the arms thrown wide, beating its chest, reaching down to touch something of yours
  const G = c.gest, GT = G ? { scream: 1.3, beat: 1.9, touch: 3, point: 1.6 }[G.k] : 0;
  if (G && S.t - G.t < GT && !c.climbing && !dead) {
    const u = (S.t - G.t) / GT, k = Math.min(1, u * 6, (1 - u) * 5);
    if (G.k === 'scream') { const sh = 0.08 * Math.sin(t * 40); P.spine[0] = lerp(P.spine[0], 0.05, k); P.chest[0] = lerp(P.chest[0], -0.2, k); P.neck[0] = lerp(P.neck[0], 0.1, k); P.head[0] = lerp(P.head[0], -0.15 + sh, k); P.armL = cmix(P.armL, [-1.0, 0, -1.25 + sh], k); P.armR = cmix(P.armR, [-1.0, 0, 1.25 - sh], k); P.foreL[0] = lerp(P.foreL[0], -0.7, k); P.foreR[0] = lerp(P.foreR[0], -0.7, k); rootY += 1.5 * k; lunge += 2 * k; }
    else if (G.k === 'beat') { const b = Math.sin(now * 16), l = Math.max(0, b), r = Math.max(0, -b); P.spine[0] = lerp(P.spine[0], 0.0, k); P.chest[0] = lerp(P.chest[0], -0.15, k); P.head[0] = lerp(P.head[0], -0.4, k); P.armL = cmix(P.armL, [-0.55 + 0.35 * l, 0.9, -0.25], k); P.armR = cmix(P.armR, [-0.55 + 0.35 * r, -0.9, 0.25], k); P.foreL[0] = lerp(P.foreL[0], -2.2, k); P.foreR[0] = lerp(P.foreR[0], -2.2, k); P.legL[0] += 0.3 * l * k; rootY += (0.8 * Math.abs(b) - 0.5) * k; }
    else if (G.k === 'point') { P.armR = cmix(P.armR, [-1.5, -0.25, 0.15], k); P.foreR[0] = lerp(P.foreR[0], -0.05, k); P.handR[0] = lerp(P.handR[0], 0.2, k); P.chest[1] -= 0.3 * k; P.head[0] -= 0.1 * k; P.spine[0] -= 0.15 * k; }   // an arm out at you
    else if (G.k === 'touch') { const r = Math.sin(t * 2.2); P.armR = cmix(P.armR, [-1.4 + 0.25 * r, 0, 0.1], k); P.foreR[0] = lerp(P.foreR[0], -0.2, k); P.head[0] -= 0.2 * k; P.head[2] += 0.3 * k; }
  }
  // a feinted swing: the arm up and down across you, but stopping short and pulling back
  if (c.fake && S.t - c.fake.t0 < 0.6 && !dead) { const u = (S.t - c.fake.t0) / 0.6; if (u < 0.45) { P.armR = [-2.7, 0, 0.35]; P.foreR[0] = -1; P.chest[1] = 0.3; lunge = -1.5; } else { const k = 1 - (u - 0.45) / 0.55; P.armR = cmix([-1, 0, 0.2], [-0.5, 0, -0.1], k); P.spine[0] += 0.4 * k; lunge = 3 * k; } stiff = 26; }
  // hurt and running: staggering, lurching to one side
  // rocking where it stands, staring at you
  if (c.stare && v < 4 && c.seed > 0.45 && !dead) { const w = Math.sin(t * 1.5); P.hips[2] += 0.07 * w; P.spine[2] -= 0.06 * w; P.head[2] -= 0.05 * w; rootY += 0.4 * Math.abs(w); }
  // a hop clear of your swing: knees up, arms out for balance
  if (c.hop && !dead) { const u = 1 - c.hop.t / c.hop.T, k = Math.sin(Math.PI * u); rootY += 5 * k; P.legL[0] -= 0.7 * k; P.legR[0] -= 0.5 * k; P.shinL[0] += 1.2 * k; P.shinR[0] += 1.0 * k; P.armL = cmix(P.armL, [-0.6, 0, -0.9], k); P.armR = cmix(P.armR, [-0.6, 0, 0.9], k); stiff = 26; }
  // the club up across its face to take your blow
  if (S.t < (c.block || 0) || S.t - (c.blockedT || -9) < 0.3) { P.armR = [-1.75, 0.5, 0.75]; P.foreR[0] = -1.5; P.armL = [-1.6, -0.4, -0.6]; P.foreL[0] = -1.6; P.spine[0] += 0.15; P.head[0] -= 0.15; rootY -= 1.5; stiff = 30; }
  // in the air: a leap from tree to tree, a pounce, a running jump at you
  if (c.flyK && !dead) { P.legL[0] = -1.2; P.legR[0] = -0.5; P.shinL[0] = 1.5; P.shinR[0] = 1.1; P.armR = [-2.7, 0, 0.4]; P.foreR[0] = -0.9; P.armL = [-1.2, 0, -0.7]; P.spine[0] = 0.3; P.head[0] = -0.4; stiff = 22; }
  // dragging a hurt one: bent double, both arms down and forward gripping its wrists, stepping backwards
  if (c.dragK && !dead) { P.spine[0] = 0.85; P.chest[0] = 0.3; P.head[0] = -0.7; P.armL = [-1.25, 0, -0.12]; P.armR = [-1.25, 0, 0.12]; P.foreL[0] = P.foreR[0] = -0.15; rootY -= 3; }
  // on its knees over a body
  if (c.kneel && !dead) { rootY = -10.5; P.legL[0] = -1.4; P.legR[0] = -0.1; P.shinL[0] = 1.9; P.shinR[0] = 2.3; P.footL[0] = -0.4; P.footR[0] = 0.6; P.spine[0] = 0.6; P.head[0] = -0.2; }
  // down: on its back, knees up, an arm reaching out
  if (c.st === 'down' && !dead) { roll = -1.4; rootY = 3; P.legL[0] = -0.9 + 0.3 * Math.sin(t * 2); P.shinL[0] = 1.4; P.legR[0] = -0.4; P.shinR[0] = 0.8; P.armL = [-2.8, 0, -0.3]; P.armR = [-2.6 + 0.3 * Math.sin(t * 1.7), 0, 0.4]; P.foreL[0] = P.foreR[0] = -0.3; P.head[0] = -0.5 + 0.2 * Math.sin(t * 2.5); stiff = 8; }
  if (c.stumble) { const w = Math.sin(t * 6.5); P.spine[2] += 0.22 * w; P.hips[2] -= 0.1 * w; P.head[0] += 0.15 * Math.abs(w); rootY -= 1.2 * Math.abs(Math.sin(t * 3.2)); }
  // coiled to spring
  if (c.coil) { P.spine[0] += 0.2; P.head[0] -= 0.2; P.armR = [-0.9, 0, 0.5]; P.foreR[0] = -1.2; rootY -= 1; }
  // the swing: the club (or a fist) up over its shoulder, then down across you with the whole body behind it
  const sw = e.sw;
  if (sw && !dead) {
    stiff = 30; const u = clamp(sw.t / sw.T, 0, 1);
    const up = [[-2.8, 0, 0.35], [-1.0, 0, 0]], dn = [[-0.35, 0, -0.1], [-0.2, 0, 0]];
    if (sw.ph === 'wind') { P.armR = up[0]; P.foreR[0] = up[1][0]; P.spine[0] = 0.15; P.chest[1] = 0.35; P.head[0] = -0.35; P.armL = [-1.0, 0, -0.4]; rootY -= 2 * u; lunge = -2 * u; }
    else if (sw.ph === 'strike') { P.armR = dn[0]; P.foreR[0] = dn[1][0]; P.spine[0] = 0.85; P.chest[0] = 0.35; P.chest[1] = -0.4; P.legL[0] = -1.0; P.shinL[0] = 0.4; P.legR[0] = 0.5; P.shinR[0] = 0.3; P.head[0] = -0.6; lunge = 6; rootY -= 2.5; }
    else { const k = 1 - u; P.armR = cmix(P.armR, dn[0], k); P.spine[0] += 0.4 * k; lunge = 4 * k; }
  }
  // a torch held up in the left hand, out in front of it
  if (c.torch && !dead && !c.climbing && !c.perched && !c.falling && !c.dragK && !c.flyK && c.st !== 'down' && !(S.t < (c.block || 0))) { P.armL = cmix(P.armL, [-1.2 + 0.05 * Math.sin(t * 1.3), 0.2, -0.32], 0.85); P.foreL[0] = lerp(P.foreL[0], -1.0, 0.85); }
  if (c.flinch > 0) { P.spine[0] -= 0.5 * c.flinch; P.head[0] -= 0.4 * c.flinch; P.armL[2] -= 0.5 * c.flinch; P.armR[2] += 0.5 * c.flinch; lunge -= 4 * c.flinch; }
  // dead: pitched over onto its face
  if (dead) { const k = ease.back(Math.min(1, dead.t / 0.6)); roll = 1.45 * k; rootY = -9.5 * c.crK * (1 - k) + 2 * k - Math.max(0, dead.t - (dead.life || 40) + 3) * 3; P.armL = [-2.5, 0.2, -0.5]; P.armR = [-2.2, -0.2, 0.6]; P.foreL[0] = -0.4; P.foreR[0] = -0.3; P.legL[0] = 0.2; P.shinL[0] = 1.1; P.head[0] = -0.5; stiff = 10; }
  const k = 1 - Math.exp(-stiff * dt);
  for (const [n] of BONES) { const cu = R.cur[n], w = P[n]; for (let i = 0; i < 3; i++) cu[i] += (w[i] - cu[i]) * k; R.B[n].rotation.set(cu[0], cu[1], cu[2], 'YXZ'); }
  R.root[0] += (lunge - R.root[0]) * Math.min(1, dt * 25); R.root[1] += (rootY - R.root[1]) * Math.min(1, dt * 18);
  const x = dead ? dead.x : e.x, y = dead ? dead.y : e.y, z = dead ? dead.z : c.z, f = dead ? dead.face : c.face;
  R.mesh.position.set(x + Math.cos(f) * R.root[0], R.root[1] + z, y + Math.sin(f) * R.root[0]);
  const sk = c.kind === 'skinny' ? 0.8 : c.kind === 'leader' ? 1.06 : 1; R.mesh.scale.set(sk, c.kind === 'leader' ? 1.04 : 1, sk); R.edge.scale.copy(R.mesh.scale);   // skinny: thin as a rail
  if (!dead) { R.rollK = (R.rollK || 0) + (roll - (R.rollK || 0)) * Math.min(1, dt * 6); roll = R.rollK; }
  R.mesh.rotation.set(roll, faceYaw(f), 0, 'YXZ'); R.edge.position.copy(R.mesh.position); R.edge.rotation.copy(R.mesh.rotation);
  R.mesh.visible = R.edge.visible = true;
  R.mesh.updateMatrixWorld(true);
  // the club in its fist: a crooked branch with a knot of root on the end
  if (c.club) {
    const a = new V3(0, -1.6, -1.5).applyMatrix4(R.B.handR.matrixWorld), b = new V3(0, -3.2, 15).applyMatrix4(R.B.handR.matrixWorld);
    between(PT.rod, a.x, a.y, a.z, b.x, b.y, b.z, 1.15, hex('#5a4330'), 0);
    blob(PT.ball, b.x, b.y, b.z, 3.6, 3.2, 3.6, 0, hex('#4a3626'));
  }
  // a torch in the other: a stick standing up out of its fist, the head bound in rag and burning (the flame and light: 78-clan6)
  c.torchAt = null;
  if (c.torch && !dead) {
    const h = new V3(0, 0, 0).applyMatrix4(R.B.handL.matrixWorld), fx = Math.cos(f) * 2.5, fz = Math.sin(f) * 2.5;
    between(PT.rod, h.x - fx * 0.4, h.y - 5, h.z - fz * 0.4, h.x + fx, h.y + 12, h.z + fz, 1.0, hex('#4a3626'), 0);
    blob(PT.ball, h.x + fx, h.y + 12.5, h.z + fz, 2.1, 2.8, 2.1, 0, hex('#2c2018'));
    c.torchAt = { x: h.x + fx, y: h.z + fz, h: h.y + 13.5 };
  }
}
// its feet on the forest floor: heavier and lower than yours, bare feet thudding through leaf litter; a run pounds, a creep
// barely whispers. Placed round your head like every sound of theirs, so you can hear which way it's coming from.
const CL_FOOT_FAR = 460;   // far enough to hear them circling out in the trees (78-clan4)
function clanFoot(e, v, cr) {
  if (!actx || !stepBuf || !S) return;
  const d = Math.hypot(e.x - S.p.x, e.y - S.p.y); if (d > CL_FOOT_FAR) return;
  const run = clamp((v - 50) / 70, 0, 1), vol = (0.22 + 0.4 * run) * (1 - 0.6 * clamp(cr, 0, 1)) * (0.8 + Math.random() * 0.35);
  const o = placeOut(e.x, e.y, vol, CL_FOOT_FAR, e, 0.7); if (!o) return;
  const s = actx.createBufferSource(), lp = actx.createBiquadFilter();
  s.buffer = stepBuf; s.playbackRate.value = lerp(0.74, 0.9, run) + Math.random() * 0.1;
  lp.type = 'lowpass'; lp.frequency.value = lerp(1500, 3200, run) * (1 - 0.4 * d / CL_FOOT_FAR);
  s.connect(lp); lp.connect(o); s.start(actx.currentTime);
}
function clanDraw(now, dt) {
  if (!CLAN_ON || !S.rg) return;
  clanCampDraw();
  const C = S.rg.clan, p = S.p, R0 = drawR();
  for (const R of CLAN_RIGS) { R.mesh.visible = R.edge.visible = false; if (R.owner && (R.owner.dead || !S.rg.enemies.includes(R.owner)) && !R.keep) R.owner = null; }
  for (const e of S.rg.enemies) {
    if (e.type !== 'cannibal' || e.dead || !e.cl) continue;
    if (Math.abs(e.x - p.x) > R0 || Math.abs(e.y - p.y) > R0) continue;
    const c = e.cl;
    if (!c.rig || c.rig.owner !== e) { c.rig = clanRig(c.vi); if (!c.rig) continue; c.rig.owner = e; c.rig.keep = false; Object.values(c.rig.cur).forEach(a => a.fill(0)); c.rig.root = [0, -9 * c.crK]; c.rig.px = c.rig.py = c.rig.vs = c.rig.stepI = undefined; }
    clanPose(c.rig, e, c, now, dt, null);
  }
  if (C) {
    for (const g of C.dead) { g.t += dt; if (g.x === undefined) { g.x = g.e.x; g.y = g.e.y; } if (g.rig && g.t < (g.life || 40)) clanPose(g.rig, g.e, g.e.cl, now, dt, g); }
    for (const g of C.dead) if (g.t >= (g.life || 40) && g.rig) { g.rig.keep = false; g.rig.owner = null; g.rig = null; }
    C.dead = C.dead.filter(g => g.t < (g.life || 40));   // life: a body lasts till it's cut up and a while after (88-meat)
  }
}
