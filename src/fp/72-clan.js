// ================= the clan: the people from the crash, who watch you from the trees =================
// Joe: "This is the heart of the game... The player should feel small and watched, like prey. They always spot you first. You
// only see them when they let you, and you fight on their terms." By day the raiders are gone. In their place is a clan of
// survivors from the plane crash, gone wild in the woods. They eat their weakest, so they are patient and careful and every loss
// hurts them. They look like you (the same body, gone ragged, muddy and painted, now and then one still in an orange beanie) and
// move like apes: low, darting from tree to tree, on all fours when they hurry, up in the branches, calling with hoots and clicks.
// There is nothing on the screen about them: you find out by looking and listening.
//  1. Watching (always): two or three keep near you from the start, behind trunks, behind you, or up a tree. Now and then one
//     lets itself be seen (leaning out from a trunk, standing at the edge of sight, crossing a gap, a shape in the branches)
//     and is gone again before you get a good look.
//  2. Chasing: go for one and it's off into the trees quicker than you can run. Keep after it and you'll turn round to find
//     others standing behind you.
//  3. Retaliation: kill one and the woods ring with their calls. Several come for you openly, circling and taking turns to dart
//     in, until you reach your fire or your walls, where they stop at the edge of the light and wait.
//  4. Testing: at a weak or busy moment (hurt, hungry, tired, far from the fire, at dusk, chopping, laden with logs) one creeps
//     up behind you. A twig snaps or a hoot comes first; then it darts in, tries for one blow and is gone. Sometimes another
//     rustles and hoots in front of you while it comes from behind. If it gets hurt, or the clan calls, it breaks off.
// Night is left as it was: at dusk they melt away and the night's hunters come.
const CLAN_ON = true;
FOES.cannibal = { hp: 3.4, sp: 70, lightSp: 1, h: 40, w: 12 };
NO_TOUCH.cannibal = 1; MON_PITCH.cannibal = 1.1; STK_PTS.cannibal = 20; STK_COL.cannibal = '214,150,104';
FOE_TINT.cannibal = [176, 124, 86]; WISP.cannibal = 0; FP_NAME.cannibal = 'ONE OF THEM';
const CL_MELEE = { wind: 0.3, trig: 44, hit: 33, lunge: 40, rec: 0.36 };   // quick: the warning came before it, not in the swing
FOE_AI.cannibal = (e, sp, d, dt) => clanAI(e, d, dt);
const CL = {
  dart: 178,      // flat out on all fours: quicker than your sprint
  lope: 114,      // between trees, out of your sight
  creep: 52,      // closing in behind you
  near: 190, far: 430,   // how far off the watchers keep
  pool: 14,       // how many of them there are; each one killed is one fewer, and two more come each morning
  rage: 110,      // how long they hunt you after you kill one (longer for each more)
  glimpse: 1.1,   // how long one lets you look at it before it's gone
};
const clanList = () => S.rg.enemies.filter(e => e.type === 'cannibal' && !e.dead);
function clan() {
  const rg = S.rg;
  return rg.clan || (rg.clan = { show: 12 + 10 * Math.random(), test: 100 + 40 * Math.random(), call: 8 + 8 * Math.random(), spawnT: 0, rage: 0, more: 0,
    chase: null, chaseT: 0, loomT: 0, tok: null, tokT: 2, busy: -9, atk: null, q: [], dead: [], w: 0 });
}
const pick = a => a[Math.floor(Math.random() * a.length)];

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
// places they won't follow you into: the firelight, a fire of your own, a lit torch post, a ring of your walls
function clanRefugeAt(x, y, pad = 0) {
  const s = exSafeAt(x, y, pad); if (s) return s;
  const D = S.day;
  for (const B of D.builds) {
    if (B.t === 'fire' && Math.hypot(B.x - x, B.y - y) < 80 + pad) return { x: B.x, y: B.y, r: 80 };
    if (B.t === 'tpost' && B.fuel > 0 && Math.hypot(B.x - x, B.y - y) < 130 + pad) return { x: B.x, y: B.y, r: 130 };
  }
  if (!pad && stNear(x, y, 120).filter(o => o.done && PC(o.id).lay === 'edge').length >= 6) return { x, y, r: 120, walls: 1 };
  return null;
}

// ---------------- where to wait: behind a trunk, its back to you ----------------
function clanSpotAt(t, perch) {
  const cx = cam.position.x, cz = cam.position.z, dx = t.x - cx, dy = t.y - cz, L = Math.hypot(dx, dy) || 1, r = t.r * t.s + 8;
  if (perch) { const a = Math.atan2(-dy, -dx) + (t.seed > 0.5 ? 1.1 : -1.1); return { x: t.x + Math.cos(a) * r, y: t.y + Math.sin(a) * r }; }   // out on a limb, to the side
  return { x: t.x + dx / L * r, y: t.y + dy / L * r };
}
function clanTaken(x, y, e) {
  for (const o of clanList()) if (o !== e && o.cl.post && Math.hypot(o.cl.post.x - x, o.cl.post.y - y) < 60) return true;
  return false;
}
function clanPost(e, o = {}) {
  const p = S.p, role = e.cl.role, shadow = role === 'shadow';
  const dmin = o.dmin ?? (shadow ? 175 : CL.near), dmax = o.dmax ?? (shadow ? 250 : CL.far);
  let best = null, bs = -1e9;
  for (let k = 0; k < 9; k++) {
    const a = o.a != null ? o.a + (Math.random() - 0.5) * 2 * (o.spread || 0.5)
      : shadow ? S.aimW + Math.PI + (Math.random() - 0.5) * 1.6
      : Math.atan2(e.y - p.y, e.x - p.x) + (Math.random() - 0.5) * 2.4;   // somewhere on its own side of you
    const d = lerp(dmin, dmax, Math.random()), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    for (const t of propsNear(x, y, 60)) {
      if (t.kind !== 'tree' || t.type === 'dead' || (o.perch && t.type === 'pine')) continue;
      const P = clanSpotAt(t, o.perch), dd = Math.hypot(P.x - p.x, P.y - p.y);
      if (dd < dmin || dd > dmax || lakeAt(P.x, P.y, 16) || clanRefugeAt(P.x, P.y, 40) || clanTaken(P.x, P.y, e)) continue;
      if (shadow && Math.abs(angDiff(Math.atan2(P.y - p.y, P.x - p.x), S.aimW)) < 1.9) continue;
      const s = -Math.abs(dd - (dmin + dmax) / 2) * 0.3 - Math.hypot(P.x - e.x, P.y - e.y) * 0.12 + (t.type === 'pine' && !o.perch ? 25 : 0) + Math.random() * 20;
      if (s > bs) { bs = s; best = { t, x: P.x, y: P.y, perch: !!o.perch }; }
    }
  }
  return best;
}
function clanPostOk(e, P) {
  if (!P || !P.t) return false;
  const p = S.p, d = Math.hypot(P.x - p.x, P.y - p.y), shadow = e.cl.role === 'shadow';
  if (d < (shadow ? 110 : CL.near * 0.72) || d > (shadow ? 330 : CL.far * (propsNear(S.p.x, S.p.y, 200).length ? 1.3 : 1.75))) return false;
  if (shadow && Math.abs(angDiff(Math.atan2(P.y - p.y, P.x - p.x), S.aimW)) < 1.3 && !e.cl.vis) return false;   // you've turned its way: it moves round behind you again (when you aren't looking)
  return !clanRefugeAt(P.x, P.y, 30);
}

// ---------------- moving: round the trunks in the way ----------------
function clanMove(e, tx, ty, v, dt) {   // toward (tx, ty) at v; how far it still has to go
  const c = e.cl, dx = tx - e.x, dy = ty - e.y, L = Math.hypot(dx, dy);
  c.want = 0;
  if (L < 0.5 || v <= 0) { c.v = 0; return L; }
  let ux = dx / L, uy = dy / L;
  for (const o of propsNear(e.x + ux * 20, e.y + uy * 20, 30)) {
    if (o.kind !== 'tree' && o.kind !== 'rock') continue;
    const ox = o.x - e.x, oy = o.y - e.y, ahead = ox * ux + oy * uy, R = o.r * o.s + 9;
    if (ahead <= 0 || ahead > 42 || ahead > L + R) continue;
    const side = ox * -uy + oy * ux;
    if (Math.abs(side) < R) { const s = side > 0 ? -1 : 1, k = (R - Math.abs(side)) / R * 1.4, nx = ux - uy * s * k, ny = uy + ux * s * k, n = Math.hypot(nx, ny); ux = nx / n; uy = ny / n; }
  }
  const step = Math.min(L, v * dt);
  e.x += ux * step; e.y += uy * step;
  c.v = step / Math.max(dt, 1e-4); c.dir = Math.atan2(uy, ux); c.want = step; e.phase += step * (c.qK > 0.5 ? 0.075 : 0.11);
  return L - step;
}
function clanAway(e, dist, lure) {   // a spot to run to: away from you, toward another of them if one's that way (Joe: chasing one leads you to others)
  const p = S.p; let a = Math.atan2(e.y - p.y, e.x - p.x) + (Math.random() - 0.5) * 0.9;
  if (lure) { const o = clanList().filter(q => q !== e && Math.abs(angDiff(Math.atan2(q.y - e.y, q.x - e.x), a)) < 1.2)[0]; if (o) a = lerp(a, a + angDiff(Math.atan2(o.y - e.y, o.x - e.x), a), 0.6); }
  if (Math.hypot(e.x, e.y) < 700) a = lerp(a, a + angDiff(Math.atan2(e.y, e.x), a), 0.3);   // and out, away from the fire on the hill
  for (let k = 0; k < 8; k++) { const b = a + (k ? (Math.random() - 0.5) * 1.2 : 0), x = e.x + Math.cos(b) * dist, y = e.y + Math.sin(b) * dist; if (!lakeAt(x, y, 20) && !clanRefugeAt(x, y, 40)) return { x, y }; }
  return { x: e.x + Math.cos(a) * dist, y: e.y + Math.sin(a) * dist };
}
function clanBehind(r, side = 0) { const p = S.p, a = S.aimW + Math.PI + side; return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r }; }

// ---------------- each of them ----------------
function clanInit(e, role = 'post') {
  const ix = clanList().length, vi = Math.random() < 0.22 ? 1 : pick([0, 2, 3]);
  e.cl = { st: 'go', t: 0, role, z: 0, cr: 0.6, crK: 0.6, q: 0, qK: 0, v: 0, dir: 0, face: Math.atan2(S.p.y - e.y, S.p.x - e.x), faceW: 0, vis: false, seenT: 0, unseenT: 9,
    hp0: e.hp, o: {}, d: 999, dPrev: 999, post: null, vi, club: Math.random() < 0.55, seed: Math.random(), rus: 0, cd: 0, stuck: 0, px: e.x, py: e.y, ix };
}
function clanGo(e, st, o = {}) {
  const c = e.cl; c.st = st; c.t = 0; c.o = o; c.dest = null;
  if (st === 'flee' || st === 'back' || st === 'leave') c.dest = clanAway(e, o.dist || (st === 'back' ? 290 : 380), st === 'flee');
  if (st === 'go' && !o.keep) c.post = null;
  if (st === 'warn') { c.wT = 0.8 + Math.random() * 0.7; clanSnd(Math.random() < 0.65 ? 'twig' : 'huff', e.x, e.y); if (Math.random() < 0.35) clanLater(0.25, 'hoot', e.x, e.y, 0.5); }
  if (st === 'dart' || st === 'hdart') { e.swCd = 0; c.swung = false; c.callback = st === 'dart' && Math.random() < 0.15; }
  if (st === 'hwarn') { c.wT = 0.45 + Math.random() * 0.3; clanSnd('scream', e.x, e.y); }
  if (st === 'peek') { c.side = Math.random() < 0.5 ? -1 : 1; c.pT = 0.9 + Math.random() * 0.9; }
  if (st === 'drop') clanSnd('rustle', e.x, e.y, 1.2);
}
function clanSpawn(st, o = {}) {
  const p = S.p;
  for (let k = 0; k < 40; k++) {
    const a = (o.any ? Math.random() * 6.283 : S.aimW + Math.PI + (Math.random() - 0.5) * 2.6), d = o.d || 430 + Math.random() * 180, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    if (lakeAt(x, y, 30) || clanRefugeAt(x, y, 60) || clanSeeAt(x, y, 30) || propsNear(x, y, 22).length) continue;
    spawnFoe('cannibal', { x, y, d });
    const e = S.rg.enemies[S.rg.enemies.length - 1]; clanInit(e, o.role); clanGo(e, st); return e;
  }
  return null;
}
function clanOuch(e) {   // hit: a grunt, a flinch
  clanSnd('ouch', e.x, e.y); e.cl.flinch = 1;
}
function clanAI(e, d, dt) {
  if (!e.cl) clanInit(e);
  const c = e.cl, p = S.p;
  c.t += dt; c.dPrev = c.d; c.d = d;
  const closing = (c.dPrev - d) / Math.max(dt, 1e-4);
  // stuck on something: it tries another way
  { const moved = Math.hypot(e.x - c.px, e.y - c.py); c.stuck = c.want > 1 && moved < c.want * 0.3 ? c.stuck + dt : Math.max(0, c.stuck - dt); c.px = e.x; c.py = e.y; }
  c.flinch = Math.max(0, (c.flinch || 0) - dt * 3);
  c.cr = 0.6; c.q = 0; c.faceW = Math.atan2(p.y - e.y, p.x - e.x); c.call = 0;
  // hurt: it's off. In a hunt it only falls back, unless it's badly hurt
  if (e.hp < c.hp0 - 0.01) {
    c.hp0 = e.hp; clanOuch(e);
    if (e.sw && e.sw.ph === 'wind') e.sw = null;
    const hunting = ['hunt', 'hwarn', 'hdart', 'wait'].includes(c.st);
    if (hunting && e.hp > e.maxHp * 0.4) clanGo(e, 'back', { dist: 220, hunt: 1 });
    else { clanGo(e, 'flee', { dist: 420, hurt: 1 }); if (hunting) c.done = 1; }
    if (clan().atk && (clan().atk.a === e)) clanAtkEnd();
  }
  (CLAN_ST[c.st] || CLAN_ST.go)(e, c, d, dt, closing);
  // the firelight: they won't set foot in it
  const R = clanRefugeAt(e.x, e.y, 26);
  if (R && !R.walls) { const dx = e.x - R.x, dy = e.y - R.y, dd = Math.hypot(dx, dy) || 1, r = R.r + 26; if (dd < r) { e.x = R.x + dx / dd * r; e.y = R.y + dy / dd * r; } }
  // rustling through the undergrowth when one moves near you, now and then a twig
  if (c.v > 40 && d < 280 && c.z < 1 && (c.rus -= dt) <= 0) {
    c.rus = (c.v > 120 ? 0.22 : 0.45) + Math.random() * 0.35;
    clanSnd(Math.random() < (c.vis ? 0.02 : 0.07) ? 'twig' : 'rustle', e.x, e.y, (0.3 + 0.7 * (1 - d / 280)) * (c.v > 120 ? 1 : 0.6));
  }
  // which way it faces: at you while it watches, the way it's going when it runs
  if (c.v > 60 && !['stalk', 'dart', 'hdart', 'hunt'].includes(c.st)) c.faceW = c.dir;
  c.face += angDiff(c.faceW, c.face) * Math.min(1, dt * (c.v > 100 ? 12 : 6));
  e.face = Math.cos(c.face) >= 0 ? 1 : -1;
}
function clanFleeR(e) { return S.day.crouch ? 95 : 130; }
function clanCharged(e, c, d, closing) { return d < clanFleeR(e) || (closing > 45 && d < (c.vis ? 330 : 250)); }   // seen coming, or heard running at it
const clanFast = () => Math.max(CL.dart, Math.hypot(S.p.vx, S.p.vy) + 45);   // always that bit quicker than you
const CLAN_ST = {
  go(e, c, d, dt, closing) {   // to a tree to watch from
    if (!c.post || (!c.o.keep && !c.o.show && !clanPostOk(e, c.post))) { c.post = clanPost(e, c.role === 'perch' ? { perch: 1, a: S.aimW, spread: 1 } : {}) || clanPost(e, { dmin: 250, dmax: 720 }); c.o.keep = 0; }   // out in the open (the hill), they keep to the treeline
    if (!c.post) { c.cr = 0.8; if (d < clanFleeR(e)) clanGo(e, 'flee'); return; }
    const P = c.post.perch ? c.post : clanSpotAt(c.post.t, false);
    let v = c.o.show ? CL.dart : CL.lope; c.cr = 0.45;
    if (c.vis && !c.o.show) {   // caught in the open: far off it goes still and hopes; close, it bolts
      if (d > 300 && c.seenT < 1.2) { v = 0; c.cr = 1; } else v = CL.dart;
    }
    if (d > 650 && c.unseenT > 1) { const Q = clanPost(e); if (Q && !clanSeeAt(Q.x, Q.y, 30)) { e.x = Q.x; e.y = Q.y; c.post = Q; } }   // left far behind: it's already somewhere near you
    if (v >= CL.dart) c.q = 1;
    const L = clanMove(e, P.x, P.y, v, dt);
    if (c.stuck > 0.7) { c.post = null; c.stuck = 0; }
    if (L < 5) { if (c.post.perch) clanGo(e, 'climb', { keep: 1 }); else clanGo(e, 'hide', { keep: 1, show: c.o.show }); }
    if (clanCharged(e, c, d, closing)) clanGo(e, 'flee');
  },
  hide(e, c, d, dt, closing) {   // behind its trunk, round the side away from you, keeping it between you as you move
    c.cr = 1;
    if (!clanPostOk(e, c.post)) return clanGo(e, 'go');
    const P = clanSpotAt(c.post.t, false); clanMove(e, P.x, P.y, CL.creep * 1.6, dt);
    if (c.vis && c.seenT > (c.o.show ? CL.glimpse : 0.3)) return clanGo(e, 'go');   // you've seen it: it's away to another tree
    if (clanCharged(e, c, d, closing)) clanGo(e, 'flee');
  },
  peek(e, c, d, dt, closing) {   // it lets you see it: out from the side of its trunk, or standing up at the edge of sight
    const t = c.post && c.post.t; if (!t) return clanGo(e, 'go');
    const cx = cam.position.x, cz = cam.position.z, a = Math.atan2(t.y - cz, t.x - cx), r = t.r * t.s + 13;
    const out = c.o.kind === 'stand' ? r + 10 : r;
    clanMove(e, t.x + Math.cos(a + c.side * 1.35) * out, t.y + Math.sin(a + c.side * 1.35) * out, 40, dt);
    c.cr = c.o.kind === 'stand' ? 0.05 : 0.7; c.lean = c.o.kind === 'stand' ? 0 : c.side;
    if (c.vis && c.seenT > 0.3 && !c.called) { c.called = 1; if (Math.random() < 0.4) clanSnd('click', e.x, e.y, 0.6); }
    if (c.t > c.pT + (c.vis ? 0 : 1.5) || c.seenT > CL.glimpse) { c.lean = 0; c.called = 0; clanGo(e, Math.random() < 0.6 ? 'go' : 'hide', { keep: 0 }); }
    if (clanCharged(e, c, d, closing)) { c.lean = 0; clanGo(e, 'flee'); }
  },
  climb(e, c, d, dt) {   // up the trunk, quick, hand over hand
    c.z = Math.min(c.post.t.s * 62, c.z + dt * 55); c.cr = 0.9; c.climbing = 1;
    c.faceW = Math.atan2(c.post.t.y - e.y, c.post.t.x - e.x);
    if (c.z >= c.post.t.s * 62 - 0.5) { c.climbing = 0; clanGo(e, 'perch', { keep: 1 }); }
    if (d < 150) { c.climbing = 0; clanGo(e, 'drop'); }
  },
  perch(e, c, d, dt) {   // crouched on a limb, watching you; when you look at it too long, or come close, it drops and runs
    c.cr = 1; c.perched = 1;
    if (c.vis && c.seenT > 0.4 && !c.called) { c.called = 1; clanSnd(Math.random() < 0.5 ? 'click' : 'hoot', e.x, e.y, 0.5); }
    if (d < 170 || c.seenT > 2.4 || (c.t > 25 + 15 * c.seed && !c.vis) || d > CL.far * 1.5) { c.perched = 0; c.called = 0; clanGo(e, 'drop'); }
  },
  drop(e, c, d, dt) {   // down out of the branches: a thud, and off
    c.vz = (c.vz || 0) - 520 * dt; c.z = Math.max(0, c.z + c.vz * dt); c.cr = 0.2; c.falling = 1;
    if (c.z <= 0) { c.vz = 0; c.falling = 0; clanSnd('thud', e.x, e.y); c.role = 'post'; c.post = null; clanGo(e, d < 260 ? 'flee' : 'go'); }
  },
  flee(e, c, d, dt) {   // off into the trees, on all fours, quicker than you can run
    c.q = 1; c.cr = 0.5;
    if (!c.dest || c.stuck > 0.4) { c.dest = clanAway(e, 360, true); c.stuck = 0; }
    const L = clanMove(e, c.dest.x, c.dest.y, clanFast(), dt);
    if (L < 12 || (c.unseenT > 1.2 && d > 270) || c.t > 7) {
      if (c.done) return clanGo(e, 'leave');
      if (clan().rage > 0) return clanGo(e, 'hunt');
      clanGo(e, 'go');   // and out of sight it's soon watching you again from somewhere else
    }
  },
  back(e, c, d, dt) {   // after a go at you: back off to cover, quick
    c.q = c.t > 0.3 ? 1 : 0.5; c.cr = 0.5;
    if (!c.dest || c.stuck > 0.4) { c.dest = clanAway(e, c.o.dist || 290); c.stuck = 0; }
    const L = clanMove(e, c.dest.x, c.dest.y, clanFast(), dt);
    if (L < 12 || c.t > 4) clanGo(e, clan().rage > 0 ? 'hunt' : 'go');
  },
  shadow() {},   // (a role, not a state)
  loom(e, c, d, dt) {   // Joe: "you may turn around to find two behind you": standing up, still, close behind you
    const P = clanBehind(c.o.r || 130, c.o.side || 0);
    if (c.t < 9 && !c.seen) { const L = clanMove(e, P.x, P.y, Math.max(d > 200 ? CL.dart : CL.creep * 1.8, Math.hypot(S.p.vx, S.p.vy) + 10), dt); c.cr = L > 20 ? 0.6 : 0.1; if (L > 20 && c.vis) c.q = 0.6; }
    else c.cr = 0.1;
    if (c.vis && c.seenT > 0.15) c.seen = 1;
    if (c.seen) { c.cr = 0.05; c.stare = 1; if ((c.held = (c.held || 0) + dt) > 0.7 + 0.4 * c.seed) { c.stare = 0; c.seen = 0; c.held = 0; clanSnd('hoot', e.x, e.y, 0.8); clanGo(e, 'flee'); } }
    else if (c.t > 12) clanGo(e, 'go');
    if (d < 70 && !c.seen) clanGo(e, 'flee');
  },
  stalk(e, c, d, dt) {   // a test: round behind you, low and quiet
    const A = clan().atk; if (!A || A.a !== e) return clanGo(e, 'go');
    c.side = c.side ?? (Math.random() < 0.5 ? -0.4 : 0.4);
    const P = clanBehind(115, c.side), L = clanMove(e, P.x, P.y, d > 240 ? CL.lope : Math.max(CL.creep, Math.hypot(S.p.vx, S.p.vy) * 1.1), dt);
    c.cr = d > 240 ? 0.5 : 0.85; c.q = d > 240 && c.v > 100 ? 1 : 0;
    const decoyOn = !A.dec || A.noise || c.t > 14;
    if (L < 24 && d < 155 && decoyOn) return clanGo(e, 'warn');
    if (c.vis && c.seenT > 0.3) { if (d < 140 && Math.random() < 0.5) clanGo(e, 'dart'); else { clanGo(e, 'flee'); clanAtkEnd(); } return; }
    if (c.t > 28 || clanRefugeAt(S.p.x, S.p.y, 40)) { clanAtkEnd(); clanGo(e, 'go'); }
  },
  warn(e, c, d, dt) {   // the twig snaps (or a breath, a hoot) and it holds still a moment, coiled: your chance to turn
    c.cr = 0.95; c.coil = 1;
    if (c.vis && c.seenT > 0.25 && !c.o.seen) { c.o.seen = 1; if (Math.random() < 0.5) { c.coil = 0; clanAtkEnd(); return clanGo(e, 'flee'); } c.t = c.wT; }
    if (c.t >= c.wT) { c.coil = 0; clanGo(e, 'dart'); }
  },
  dart(e, c, d, dt) { clanDart(e, c, d, dt, false); },
  hdart(e, c, d, dt) { clanDart(e, c, d, dt, true); },
  decoy(e, c, d, dt) {   // the other half of a flank: noise and a glimpse in front of you while the first comes from behind
    const A = clan().atk; if (!A || A.dec !== e) return clanGo(e, 'go');
    if (!c.post) c.post = clanPost(e, { a: S.aimW + (c.seed < 0.5 ? -0.4 : 0.4), spread: 0.25, dmin: 180, dmax: 280 });
    if (!c.post) { A.noise = 1; return clanGo(e, 'go'); }
    const P = clanSpotAt(c.post.t, false);
    if (!A.noise) { const L = clanMove(e, P.x, P.y, CL.lope, dt); c.cr = 0.6; if (L < 8 || c.t > 10) { A.noise = 1; c.nT = 0; clanSnd('rustle', e.x, e.y, 1.3); clanLater(0.4, 'hoot', e.x, e.y, 0.9); } }
    else {   // shaking the brush and showing itself, side to side
      c.nT += dt; c.cr = 0.4; c.lean = Math.sin(c.nT * 2.5) > 0 ? 1 : -1;
      const t = c.post.t, a = Math.atan2(t.y - cam.position.z, t.x - cam.position.x) + c.lean * 1.35, r = t.r * t.s + 12; clanMove(e, t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, 60, dt);
      if ((c.rus -= dt) <= 0) { c.rus = 0.5 + Math.random() * 0.5; clanSnd('rustle', e.x, e.y, 1); }
      if (c.nT > 3.2) { c.lean = 0; A.dec = null; clanGo(e, 'go'); }
    }
    if (d < clanFleeR(e)) { c.lean = 0; A.dec = null; A.noise = 1; clanGo(e, 'flee'); }
  },
  hunt(e, c, d, dt) {   // retaliation: in the open, circling you, calling, waiting their turn
    const C = clan(), p = S.p, sp = Math.hypot(p.vx, p.vy);
    if (c.orb === undefined) c.orb = Math.atan2(e.y - p.y, e.x - p.x);
    c.orb += (c.seed < 0.5 ? 1 : -1) * dt * 0.22;
    for (const o of clanList()) if (o !== e && o.cl.st === 'hunt' && o.cl.orb !== undefined) { const da = angDiff(c.orb, o.cl.orb); if (Math.abs(da) < 0.9) c.orb += Math.sign(da || 1) * dt * 0.8; }   // spread round you
    const r = 165 + 30 * Math.sin(S.t * 0.6 + c.seed * 6), P = { x: p.x + Math.cos(c.orb) * r, y: p.y + Math.sin(c.orb) * r };
    const L = Math.hypot(P.x - e.x, P.y - e.y), v = L > 140 ? CL.dart : Math.max(CL.lope * 0.6, sp + 15);
    clanMove(e, P.x, P.y, v, dt); c.cr = 0.4; c.q = c.v > 125 ? 1 : 0;
    if ((c.hoot = (c.hoot ?? Math.random() * 3) - dt) <= 0) { c.hoot = 3 + Math.random() * 4; clanSnd(Math.random() < 0.3 ? 'scream' : 'hoot', e.x, e.y, 0.9); c.call = 1; c.callT = S.t; }
    c.cd -= dt;
    if (clanRefugeAt(p.x, p.y)) clanGo(e, 'wait');
  },
  hwarn(e, c, d, dt) {   // its turn: a scream, a crouch, then it comes
    c.cr = 0.9; c.coil = 1;
    if (c.t >= c.wT) { c.coil = 0; clanGo(e, 'hdart'); }
  },
  wait(e, c, d, dt) {   // you're in the light: they stop at its edge and wait for you
    const R = clanRefugeAt(S.p.x, S.p.y, 0);
    if (!R) return clanGo(e, clan().rage > 0 ? 'hunt' : 'go');
    if (c.wa === undefined) c.wa = Math.atan2(e.y - R.y, e.x - R.x);
    c.wa += Math.sin(S.t * 0.3 + c.seed * 9) * dt * 0.15;
    const r = R.r + 55 + 25 * c.seed, L = clanMove(e, R.x + Math.cos(c.wa) * r, R.y + Math.sin(c.wa) * r, CL.lope * 0.7, dt);
    c.cr = L < 10 ? (Math.sin(S.t * 0.5 + c.seed * 5) > 0.3 ? 0.1 : 0.9) : 0.5; c.stare = L < 10 ? 1 : 0;
    if ((c.hoot = (c.hoot ?? 2) - dt) <= 0) { c.hoot = 5 + Math.random() * 7; clanSnd(Math.random() < 0.5 ? 'hoot' : 'click', e.x, e.y, 0.7); c.call = 1; c.callT = S.t; }
  },
  leave(e, c, d, dt) {   // dusk, or there are more of them about than need be: away into the trees and gone
    c.q = 1; c.cr = 0.5;
    if (!c.dest || c.stuck > 0.4) { c.dest = clanAway(e, 500); c.stuck = 0; }
    clanMove(e, c.dest.x, c.dest.y, CL.lope, dt);
    if ((c.unseenT > 0.5 && d > 420) || d > 900 || c.t > 20) { e.dead = e.gone = true; }
  },
};
function clanDart(e, c, d, dt, hunt) {   // straight in at you; the swing, then back off
  c.q = d > 90 ? 0.7 : 0; c.cr = 0.45;
  if (clanRefugeAt(S.p.x, S.p.y, 10) && !e.sw) return clanDartEnd(e, hunt);
  if (c.callback && c.t > 0.4 && !e.sw) {   // the clan calls it back
    const o = clanList().find(q => q !== e); clanSnd('hoot', o ? o.x : e.x + 300, o ? o.y : e.y, 0.9); return clanDartEnd(e, hunt);
  }
  if (e.sw || d < CL_MELEE.trig * 1.1) { const on = foeMelee(e, d, dt, CL_MELEE); if (e.sw) c.swung = true; c.v = 0; if (on) return; }
  if (c.swung && !e.sw) return clanDartEnd(e, hunt);
  clanMove(e, S.p.x, S.p.y, CL.dart * 0.95, dt);
  if (c.t > 2.6) clanDartEnd(e, hunt);
}
function clanDartEnd(e, hunt) {
  const C = clan();
  if (hunt) { C.tok = null; C.tokT = 5 + Math.random() * 2; e.cl.cd = 3.5 + Math.random() * 2.5; clanGo(e, 'back', { dist: 200 }); }
  else { clanAtkEnd(); clanGo(e, 'back'); }
}
function clanAtkEnd() { const C = clan(); if (C.atk && C.atk.dec && C.atk.dec.cl) { const q = C.atk.dec; q.cl.lean = 0; if (q.cl.st === 'decoy') clanGo(q, 'go'); } C.atk = null; }

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
function clanTest(C, all) {
  const free = all.filter(e => ['hide', 'go'].includes(e.cl.st) && e.cl.z === 0);
  if (!free.length) return false;
  const behind = e => -Math.abs(angDiff(Math.atan2(e.y - S.p.y, e.x - S.p.x), S.aimW + Math.PI)) * 100 - e.cl.d * 0.1;
  free.sort((a, b) => behind(b) - behind(a));
  C.atk = { a: free[0], t: 0 }; clanGo(free[0], 'stalk');
  if (free.length > 1 && Math.random() < 0.5) { C.atk.dec = free[1]; clanGo(free[1], 'decoy'); }   // Joe: one makes noise in front while another comes from behind
  return true;
}
function clanShow(C, all) {   // one of them lets you see it
  const idle = all.filter(e => (e.cl.st === 'hide' || e.cl.st === 'go') && e.cl.z === 0 && !(C.atk && (C.atk.a === e || C.atk.dec === e)));
  if (!idle.length) return false;
  const inView = idle.filter(e => e.cl.st === 'hide' && e.cl.d > 170 && e.cl.d < 440 && clanOnScreen(e.x, e.y));
  const r = Math.random();
  if (inView.length && r < 0.55) { clanGo(pick(inView), 'peek', { kind: Math.random() < 0.6 ? 'lean' : 'stand' }); return true; }
  const e = pick(idle);
  if (r < 0.8) {   // across a gap in front of you, from one tree to the next
    const P = clanPost(e, { a: S.aimW + (Math.random() - 0.5) * 0.8, spread: 0.45, dmin: 220, dmax: 400 });
    if (P) { e.cl.post = P; clanGo(e, 'go', { keep: 1, show: 1 }); return true; }
  }
  const P = clanPost(e, { a: S.aimW + (Math.random() - 0.5) * 1.1, spread: 0.6, dmin: 230, dmax: 420, perch: 1 });   // a shape in the branches ahead
  if (P) { e.cl.post = P; e.cl.role = 'perch'; clanGo(e, 'go', { keep: 1 }); return true; }
  return false;
}
function clanLater(dt, k, x, y, v) { clan().q.push({ at: S.t + dt, k, x, y, v }); }
function clanCall(all) {   // calling to each other through the woods: one hoots or clicks, another answers from somewhere else
  const far = all.filter(e => e.cl.d > 250), a = pick(far.length ? far : all);
  const k = Math.random() < 0.6 ? 'hoot' : 'click', b = all.filter(e => e !== a);
  if (a) { clanSnd(k, a.x, a.y, 0.7); a.cl.call = 1; a.cl.callT = S.t; }
  else { const t = Math.random() * 6.283; clanSnd(k, S.p.x + Math.cos(t) * 800, S.p.y + Math.sin(t) * 800, 0.7); }
  const o = b.length ? pick(b) : null, t2 = Math.random() * 6.283;
  if (Math.random() < 0.75) clanLater(0.9 + Math.random() * 1.4, k, o ? o.x : S.p.x + Math.cos(t2) * 850, o ? o.y : S.p.y + Math.sin(t2) * 850, 0.6);
}
function clanDied(e) {   // one of them dead: the clan stops being careful
  const C = clan(), D = S.day, c = e.cl || {};
  D.clanN = Math.max(0, (D.clanN ?? CL.pool) - 1);
  C.more = C.rage > 0 ? Math.min(2, C.more + 1) : 0;
  C.rage = C.rage > 0 ? C.rage + 50 : CL.rage; C.tokT = 4.5;   // the calls first, then they come C.tok = null; clanAtkEnd();
  C.dead.push({ e, t: 0, rig: c.rig, face: c.face || 0, z: c.z || 0, x: e.x, y: e.y }); if (c.rig) c.rig.keep = true;
  clanSnd('die', e.x, e.y);
  for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283, d = 500 + Math.random() * 400; clanLater(1 + i * 0.8 + Math.random() * 0.5, 'whoop', S.p.x + Math.cos(a) * d, S.p.y + Math.sin(a) * d, 1); }
  addShake(0.15);
}
function clanStep(dt) {
  const rg = S.rg, D = S.day, p = S.p;
  if (!CLAN_ON || !D || rg.phase !== 'fight') return;
  const C = clan();
  for (const q of C.q) if (S.t >= q.at) { clanSnd(q.k, q.x, q.y, q.v); q.done = 1; }
  C.q = C.q.filter(q => !q.done);
  if (ARENA && !ARENA.woods) { for (const e of clanList()) e.dead = e.gone = true; return; }
  if (D.clanN === undefined) D.clanN = CL.pool;
  if (D.clanDay !== D.n) { if (D.clanDay !== undefined) D.clanN = Math.min(CL.pool, D.clanN + 2); D.clanDay = D.n; }   // a new morning: more of them come out of the woods
  const all = clanList();
  for (const e of all) { if (!e.cl) clanInit(e); clanSee(e, dt); }
  if (ARENA && ARENA.woods) woodsStep(dt, C, all);
  if (!rmOn()) { for (const e of all) if (e.cl.st !== 'leave') clanGo(e, 'leave'); C.rage = 0; C.atk = null; return; }   // dusk: they melt away and the night is as it was
  if (p.act || (p.atk && heldSlot() && DIT[heldSlot().id] && DIT[heldSlot().id].tool)) C.busy = S.t;
  const refuge = clanRefugeAt(p.x, p.y);
  // how many of them are about
  const live = all.filter(e => e.cl.st !== 'leave' && !e.cl.done);
  const want = C.rage > 0 ? Math.min(D.clanN, 3 + C.more) : Math.min(D.clanN, D.n >= 3 ? 3 : 2);
  if ((C.spawnT -= dt) <= 0 && live.length < want) { C.spawnT = C.rage > 0 ? 2.5 : 5 + 6 * Math.random(); clanSpawn(C.rage > 0 ? 'hunt' : 'go', C.rage > 0 ? { any: 1, d: 420 } : {}); }
  if (live.length > want + (C.rage > 0 ? 0 : 1)) { const e = live.filter(q => !q.cl.vis && !['stalk', 'warn', 'dart'].includes(q.cl.st))[0]; if (e) clanGo(e, 'leave'); }
  // retaliation
  if (C.rage > 0) {
    C.rage -= dt;
    for (const e of live) if (!['hunt', 'hwarn', 'hdart', 'wait', 'back', 'flee', 'drop'].includes(e.cl.st)) { e.cl.climbing = 0; if (e.cl.z > 0) { e.cl.perched = 0; clanGo(e, 'drop'); } else clanGo(e, 'hunt'); }
    if (!refuge && !C.tok && (C.tokT -= dt * (Math.hypot(p.vx, p.vy) > 80 ? 0.6 : 1)) <= 0) {   // running for it, you get a little more room   // one at a time, its turn to go at you
      const ready = live.filter(e => e.cl.st === 'hunt' && e.cl.cd <= 0 && e.cl.d < 280);
      if (ready.length) { const behind = e => Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), S.aimW)); ready.sort((a, b) => behind(b) - behind(a)); C.tok = ready[0]; clanGo(C.tok, 'hwarn'); }
    }
    if (C.tok && (C.tok.dead || !['hwarn', 'hdart'].includes(C.tok.cl.st))) { C.tok = null; C.tokT = 1.5; }
    if (C.rage <= 0) { C.rage = 0; C.more = 0; for (const e of live) { e.cl.orb = undefined; clanGo(e, 'flee'); } C.test = Math.max(C.test, 90); }   // it's over: they scatter back into the trees
    return;
  }
  // one of them is watching from behind you
  if (live.length >= 2 && !live.some(e => e.cl.role === 'shadow')) { const e = live.filter(q => q.cl.role === 'post' && ['hide', 'go'].includes(q.cl.st))[0]; if (e && Math.random() < dt * 0.05) { e.cl.role = 'shadow'; clanGo(e, 'go'); } }
  // being chased: others close in behind you (Joe: "you may turn around to find two behind you")
  const run = live.find(e => e.cl.st === 'flee' && e.cl.d < 340);
  const sp = Math.hypot(p.vx, p.vy), toward = run && sp > 55 && ((run.x - p.x) * p.vx + (run.y - p.y) * p.vy) / (run.cl.d * sp) > 0.6;
  C.chaseT = toward ? C.chaseT + dt : Math.max(0, C.chaseT - dt * 0.5);
  if (C.chaseT > 1.6 && (C.loomT -= dt) <= 0) {
    C.loomT = 25; C.chaseT = 0;
    const others = live.filter(e => e !== run && ['hide', 'go'].includes(e.cl.st) && e.cl.z === 0 && !(C.atk && (C.atk.a === e || C.atk.dec === e)));
    if (others.length < 2 && live.length < 4) { const n = clanSpawn('go', { d: 330 }); if (n) others.push(n); }
    others.sort((a, b) => a.cl.d - b.cl.d);
    others.slice(0, 2).forEach((e, i) => {
      const side = i ? 0.45 : -0.3;
      if (e.cl.d > 200 && !e.cl.vis) for (let k = 0; k < 6; k++) { const Q = clanBehind(170 + 30 * i + 15 * k, side + (Math.random() - 0.5) * 0.3); if (!clanSeeAt(Q.x, Q.y, 40) && !propsNear(Q.x, Q.y, 20).length && !lakeAt(Q.x, Q.y, 20)) { e.x = Q.x; e.y = Q.y; break; } }   // it's already round behind you
      clanGo(e, 'loom', { r: 110 + 35 * i, side });
    });
  }
  C.loomT = Math.max(-1, C.loomT - dt);
  // now and then one lets itself be seen
  if (!C.atk && (C.show -= dt) <= 0) C.show = clanShow(C, live) ? 12 + 16 * Math.random() : 3;
  // calling to each other
  if ((C.call -= dt) <= 0) { C.call = 18 + 30 * Math.random(); if (live.length) clanCall(live); }
  // testing you, at a weak or busy moment
  C.w = clanWeak(C);
  C.test -= dt * (0.35 + 0.6 * C.w) * (D.clanN < 5 ? 0.5 : 1);
  if (!C.atk && !refuge && (C.test <= 0 || (C.w >= 1.5 && C.test < 25 && S.t - C.busy < 0.3))) C.test = clanTest(C, live) ? 70 + 50 * Math.random() : 6;
  if (C.atk && (C.atk.a.dead || !['stalk', 'warn', 'dart'].includes(C.atk.a.cl.st))) clanAtkEnd();
}

// ---------------- their sounds: rustles, twigs, hoots and clicks, all from where they are ----------------
const CL_SND = { twig: [1.1, 520], rustle: [0.55, 420], hoot: [0.8, 1500], click: [0.9, 700], whoop: [1, 2000], scream: [1, 900], die: [1.1, 1200], ouch: [0.9, 700], thud: [1, 700], huff: [0.7, 380] };
function clanNz(t, type, f, len, g, out, Q = 0.8) {
  const s = actx.createBufferSource(), bq = actx.createBiquadFilter(), gn = actx.createGain();
  s.buffer = noiseBuf; bq.type = type; bq.frequency.value = f; bq.Q.value = Q;
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + Math.min(0.01, len * 0.2)); gn.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(bq); bq.connect(gn); gn.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
}
function clanVox(t, f0, f1, len, g, out, type = 'sine', lp = 1200, vib = 5) {   // a voice: a sliding pitch with a wobble in it, muffled
  const o = actx.createOscillator(), v = actx.createOscillator(), vg = actx.createGain(), f = actx.createBiquadFilter(), gn = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.7);
  v.frequency.value = vib; vg.gain.value = f0 * 0.03; v.connect(vg); vg.connect(o.frequency);
  f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 2;
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + Math.min(0.05, len * 0.25)); gn.gain.setValueAtTime(g, t + len * 0.6); gn.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(f); f.connect(gn); gn.connect(out); o.start(t); v.start(t); o.stop(t + len + 0.05); v.stop(t + len + 0.05);
}
function clanSnd(k, x, y, v = 1) {
  if (!actx || !noiseBuf || !sfxGain || !CL_SND[k]) return;
  const o = placeOut(x, y, CL_SND[k][0] * v, CL_SND[k][1]); if (!o) return;
  const t = actx.currentTime, R = Math.random;
  if (k === 'twig') { clanNz(t, 'highpass', 2600, 0.025, 0.9, o); clanNz(t + 0.035 + R() * 0.03, 'bandpass', 1800, 0.045, 0.6, o, 3); boomAt(t, 260, 120, 0.05, 0.25, o); }
  else if (k === 'rustle') { for (let i = 0; i < 3; i++) clanNz(t + i * 0.07 + R() * 0.05, 'bandpass', 2400 + R() * 2400, 0.12 + R() * 0.1, 0.35, o, 1.2); }
  else if (k === 'hoot') { const n = 2 + Math.floor(R() * 3), f = 250 + R() * 80; for (let i = 0; i < n; i++) clanVox(t + i * 0.3, f * (1 + i * 0.1), f * (1.25 + i * 0.1), 0.22, 0.32, o, 'sine', 900); }
  else if (k === 'click') { const n = 3 + Math.floor(R() * 4); for (let i = 0; i < n; i++) clanNz(t + i * (0.09 + R() * 0.06), 'bandpass', 1900 + R() * 600, 0.02, 0.9, o, 9); }
  else if (k === 'whoop') { const f = 230 + R() * 60; let tt = t; for (let i = 0; i < 7; i++) { clanVox(tt, f * (1 + i * 0.12), f * (1.3 + i * 0.14), 0.2, 0.3, o, 'triangle', 1400); tt += 0.26 - i * 0.022; } clanVox(tt + 0.05, 820, 1150, 0.6, 0.35, o, 'sawtooth', 2200, 9); }
  else if (k === 'scream') { clanVox(t, 950, 620, 0.45, 0.4, o, 'sawtooth', 2400, 14); clanNz(t, 'bandpass', 2600, 0.3, 0.3, o, 1); }
  else if (k === 'die') { clanVox(t, 620, 180, 1.1, 0.45, o, 'sawtooth', 1300, 6); }
  else if (k === 'ouch') { clanVox(t, 300, 170, 0.18, 0.4, o, 'sawtooth', 900); clanNz(t, 'lowpass', 900, 0.12, 0.3, o); }
  else if (k === 'thud') { boomAt(t, 95, 42, 0.3, 0.6, o); clanNz(t, 'lowpass', 1400, 0.25, 0.45, o); }
  else if (k === 'huff') { clanNz(t, 'bandpass', 900, 0.25, 0.4, o, 1.5); clanNz(t + 0.32, 'bandpass', 780, 0.3, 0.35, o, 1.5); }
}

// ---------------- how they look: your body, gone wild ----------------
// The same skinned body as yours (76-body), with no pack or harness, barefoot, the trousers torn off below the knee and the
// sleeves gone, everything filthy, mud up the legs, clay or ochre or charcoal on the face, matted hair. One look in four or so
// still has the orange beanie it crashed in.
const clanHash = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
const cmix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const CL_BASE = { feet: [112, 82, 60], sole2: [62, 48, 38], mud: [70, 54, 40], belt: [108, 88, 58] };
const CLAN_LOOK = [
  { C: { tunic: [84, 80, 70], trou: [70, 60, 50], trouL: [76, 64, 52], skin: [192, 144, 106], hair: [40, 30, 22] }, paintC: [176, 74, 40],
    paint: (x, y, z) => z > 2.4 && Math.abs(y - 36.7) < 0.75 },   // an ochre band across the eyes
  { C: { tunic: [104, 94, 76], trou: [88, 76, 62], trouL: [94, 80, 64], skin: [200, 152, 112], hair: [64, 44, 30], rust: [196, 92, 50], rustD: [150, 68, 40], rib: [164, 76, 44], bob: [176, 166, 146] },
    cap: 1, paintC: [232, 226, 212], paint: (x, y, z) => z > 2.4 && y > 35.6 && y < 37.6 && Math.abs(x) < 3.4 },   // the beanie, and white clay round the eyes
  { C: { tunic: [160, 114, 82], trou: [78, 68, 56], trouL: [84, 72, 58], skin: [160, 114, 82], hair: [52, 36, 26] }, bare: 1, paintC: [168, 46, 32],
    paint: (x, y, z) => (z > 3 && y > 22 && y < 28.5 && Math.hypot(x + 1.6, (y - 25.4) * 0.8) < 2.1 + 0.6 * Math.sin(Math.atan2(y - 25.4, x + 1.6) * 5)) || (z > 2.4 && y > 34.8 && y < 38 && Math.abs(Math.abs(x) - 2.2) < 0.45) },   // bare-chested: a red handprint, red stripes down the cheeks
  { C: { tunic: [70, 56, 44], trou: [58, 50, 42], trouL: [62, 53, 44], skin: [186, 140, 104], hair: [30, 24, 20] }, beard: 1, paintC: [34, 30, 28],
    paint: (x, y, z) => z > 2.2 && y > 35 && y < 39 && (Math.abs(x) < 0.5 || Math.abs(Math.abs(x) - 1.9) < 0.4) },   // charcoal stripes down the face
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
    if (V.paint && k !== C.eye && V.paint(x, y, z)) k = V.paintC;
    const n = 0.5 + 0.5 * Math.sin(x * 1.3 + y * 0.9) * Math.sin(z * 1.7 - y * 0.6), mud = clamp((13 - y) / 13, 0, 1);
    k = cmix(k, C.mud, clamp(0.08 + 0.55 * mud * (0.4 + 0.6 * n) + 0.14 * n, 0, 0.7));
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
    if (V.beard) lump([0, 33.8, 2.5], [2.6, 2.4, 1.9], one('head'), col('hair'), 10, 8);
    lump([0, 18.2, 0], [5.0, 0.7, 3.9], one('hips'), col('belt'), 14, 4);   // a rope belt
  };
}
let CLAN_GEO = null;
const CLAN_RIGS = [];
function clanRig(vi) {
  let R = CLAN_RIGS.find(q => !q.owner && q.vi === vi); if (R) return R;
  if (CLAN_RIGS.length >= 12) return null;
  if (!CLAN_GEO) CLAN_GEO = CLAN_LOOK.map(V => buildBody({ C: Object.assign({}, BODY_COL, CL_BASE, V.C), tint: clanTint(Object.assign({}, V, { C: Object.assign({}, BODY_COL, CL_BASE, V.C) })), cap: !!V.cap, pack: false, extra: clanExtra(V) }));
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
// ---- the pose: hunched and watchful standing, a deep squat behind a tree, a loping gallop on all fours ----
function clanPose(R, e, c, now, dt, dead) {
  const P = {}; for (const [n] of BONES) P[n] = [0, 0, 0];
  const t = now + c.seed * 37, v = c.v || 0, ph = e.phase || 0;
  c.crK += ((c.cr ?? 0.6) - c.crK) * Math.min(1, dt * 5); c.qK += ((c.q || (v > 128 ? 1 : 0)) - c.qK) * Math.min(1, dt * 7);
  const cr = c.crK, q = c.qK;
  let rootY = -1.2, stiff = 12, lunge = 0, roll = 0;
  // standing: hunched, knees soft, arms hanging long, the head pushed forward; a slow sway and a curious tilt of the head
  P.spine[0] = 0.32; P.chest[0] = 0.16; P.neck[0] = -0.12; P.head[0] = -0.3 + 0.05 * Math.sin(t * 0.7);
  P.head[2] = 0.22 * Math.sin(t * 0.43) * (c.stare ? 1.3 : 0.6); P.head[1] = 0.25 * Math.sin(t * 0.31);
  P.legL[0] = P.legR[0] = -0.22; P.shinL[0] = P.shinR[0] = 0.45; P.footL[0] = P.footR[0] = -0.2;
  P.armL = [-0.14 + 0.04 * Math.sin(t * 0.9), 0, -0.16]; P.armR = [-0.14 - 0.04 * Math.sin(t * 0.9), 0, 0.16]; P.foreL[0] = P.foreR[0] = -0.35;
  P.hips[2] = 0.04 * Math.sin(t * 0.5); P.chest[2] = -0.03 * Math.sin(t * 0.5);
  // walking or running upright, from your own run (76-body)
  if (v > 4 && q < 0.99) {
    const sw = Math.sin(ph), cw = Math.cos(ph), k = clamp(v / 110, 0.3, 1) * (1 - 0.5 * cr);
    P.legL[0] += -sw * 0.85 * k; P.legR[0] += sw * 0.85 * k;
    P.shinL[0] += 1.3 * k * Math.max(0, cw) ** 1.5; P.shinR[0] += 1.3 * k * Math.max(0, -cw) ** 1.5;
    P.armL[0] += sw * 0.6 * k; P.armR[0] -= sw * 0.6 * k; P.foreL[0] -= 0.4 * k; P.foreR[0] -= 0.4 * k;
    P.hips[1] = sw * 0.2 * k; P.chest[1] = -sw * 0.28 * k; P.spine[0] += 0.25 * k;
    rootY += Math.abs(cw) * 1.6 * k - 0.6 * k;
  }
  // crouching: a deep squat, weight forward, hands down near the ground, the head up and watching
  if (cr > 0.01) {
    rootY -= 9.5 * cr; P.legL[0] -= 1.3 * cr; P.legR[0] -= 1.3 * cr; P.shinL[0] += 1.85 * cr; P.shinR[0] += 1.85 * cr; P.footL[0] -= 0.55 * cr; P.footR[0] -= 0.55 * cr;
    P.spine[0] += 0.45 * cr; P.chest[0] += 0.25 * cr; P.head[0] -= 0.55 * cr;
    P.armL[0] -= 0.75 * cr; P.armR[0] -= 0.75 * cr; P.foreL[0] -= 0.25 * cr; P.foreR[0] -= 0.25 * cr; P.armL[2] -= 0.1 * cr; P.armR[2] += 0.1 * cr;
    P.legL[2] = -0.18 * cr; P.legR[2] = 0.18 * cr;   // knees out
  }
  // on all fours: the back near level, the arms reaching down to the ground ahead, both legs and both arms bounding together
  if (q > 0.01) {
    const g = Math.sin(ph), h = Math.cos(ph), Q = {};
    Q.spine = [0.8, 0, 0]; Q.chest = [0.55, 0, 0]; Q.neck = [-0.5, 0, 0]; Q.head = [-0.75, 0, 0]; Q.hips = [0, 0, 0];
    Q.legL = [-0.95 + 0.62 * g, 0, -0.1]; Q.legR = [-0.95 + 0.62 * Math.sin(ph + 0.35), 0, 0.1];
    Q.shinL = [1.45 - 0.5 * g, 0, 0]; Q.shinR = [1.45 - 0.5 * Math.sin(ph + 0.35), 0, 0]; Q.footL = [-0.3, 0, 0]; Q.footR = [-0.3, 0, 0];
    Q.armL = [-1.55 - 0.55 * g, 0, -0.12]; Q.armR = [-1.55 - 0.55 * Math.sin(ph + 0.4), 0, 0.12]; Q.foreL = [-0.18, 0, 0]; Q.foreR = [-0.18, 0, 0]; Q.handL = [0.5, 0, 0]; Q.handR = [0.5, 0, 0];
    for (const n in Q) P[n] = cmix(P[n], Q[n], q);
    rootY = lerp(rootY, -6.5 + 2.4 * Math.abs(h), q);
  }
  // leaning out from behind the trunk to look at you
  if (c.lean) { const s = c.lean; P.spine[2] += -s * 0.3; P.chest[2] += -s * 0.25; P.head[2] += s * 0.25; P.hips[1] += s * 0.2; }
  // up a tree: hand over hand on the trunk, or crouched on a limb with a hand up on it
  if (c.climbing) { const g = Math.sin(t * 9); P.armL = [-2.6 + 0.5 * g, 0, -0.2]; P.armR = [-2.6 - 0.5 * g, 0, 0.2]; P.foreL[0] = P.foreR[0] = -0.6; P.legL[0] = -1.2 + 0.5 * g; P.legR[0] = -1.2 - 0.5 * g; P.shinL[0] = P.shinR[0] = 1.6; P.spine[0] = 0.1; P.chest[0] = 0; P.head[0] = -0.5; rootY = -5; stiff = 20; }
  if (c.perched) { P.armL = [-2.4, 0.3, -0.35]; P.foreL[0] = -0.7; }
  if (c.falling) { P.armL = [-2.8, 0, -0.5]; P.armR = [-2.8, 0, 0.5]; P.foreL[0] = P.foreR[0] = -0.4; P.legL[0] = P.legR[0] = -1.1; P.shinL[0] = P.shinR[0] = 1.7; stiff = 18; }
  // a call: the head thrown back, mouth up, arms out and bouncing
  if (c.callT && now - c.callT < 1.1 && !c.climbing) { const u = (now - c.callT) / 1.1, k = Math.sin(Math.PI * u), b = Math.abs(Math.sin(u * 18)); P.head[0] -= 0.75 * k; P.neck[0] -= 0.3 * k; P.spine[0] -= 0.25 * k; P.armL = cmix(P.armL, [-0.6, 0, -1.0 - 0.2 * b], k); P.armR = cmix(P.armR, [-0.6, 0, 1.0 + 0.2 * b], k); P.foreL[0] = lerp(P.foreL[0], -1.3, k); P.foreR[0] = lerp(P.foreR[0], -1.3, k); rootY += 1.2 * b * k; }
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
  if (c.flinch > 0) { P.spine[0] -= 0.5 * c.flinch; P.head[0] -= 0.4 * c.flinch; P.armL[2] -= 0.5 * c.flinch; P.armR[2] += 0.5 * c.flinch; lunge -= 4 * c.flinch; }
  // dead: pitched over onto its face
  if (dead) { const k = ease.back(Math.min(1, dead.t / 0.6)); roll = 1.45 * k; rootY = -9.5 * c.crK * (1 - k) + 2 * k - Math.max(0, dead.t - 8) * 3; P.armL = [-2.5, 0.2, -0.5]; P.armR = [-2.2, -0.2, 0.6]; P.foreL[0] = -0.4; P.foreR[0] = -0.3; P.legL[0] = 0.2; P.shinL[0] = 1.1; P.head[0] = -0.5; stiff = 10; }
  const k = 1 - Math.exp(-stiff * dt);
  for (const [n] of BONES) { const cu = R.cur[n], w = P[n]; for (let i = 0; i < 3; i++) cu[i] += (w[i] - cu[i]) * k; R.B[n].rotation.set(cu[0], cu[1], cu[2], 'YXZ'); }
  R.root[0] += (lunge - R.root[0]) * Math.min(1, dt * 25); R.root[1] += (rootY - R.root[1]) * Math.min(1, dt * 18);
  const x = dead ? dead.x : e.x, y = dead ? dead.y : e.y, z = dead ? dead.z : c.z, f = dead ? dead.face : c.face;
  R.mesh.position.set(x + Math.cos(f) * R.root[0], R.root[1] + z, y + Math.sin(f) * R.root[0]);
  R.mesh.rotation.set(roll, faceYaw(f), 0, 'YXZ'); R.edge.position.copy(R.mesh.position); R.edge.rotation.copy(R.mesh.rotation);
  R.mesh.visible = R.edge.visible = true;
  R.mat.uniforms.flash.value = e.kHitT !== undefined && now - e.kHitT < 0.15 ? 0.7 * (1 - (now - e.kHitT) / 0.15) : 0;
  R.mesh.updateMatrixWorld(true);
  // the club in its fist: a crooked branch with a knot of root on the end
  if (c.club) {
    const a = new V3(0, -1.6, -1.5).applyMatrix4(R.B.handR.matrixWorld), b = new V3(0, -3.2, 15).applyMatrix4(R.B.handR.matrixWorld);
    between(PT.rod, a.x, a.y, a.z, b.x, b.y, b.z, 1.15, hex('#5a4330'), 0);
    blob(PT.ball, b.x, b.y, b.z, 3.6, 3.2, 3.6, 0, hex('#4a3626'));
  }
}
function clanDraw(now, dt) {
  if (!CLAN_ON || !S.rg) return;
  const C = S.rg.clan, p = S.p, R0 = drawR();
  for (const R of CLAN_RIGS) { R.mesh.visible = R.edge.visible = false; if (R.owner && (R.owner.dead || !S.rg.enemies.includes(R.owner)) && !R.keep) R.owner = null; }
  for (const e of S.rg.enemies) {
    if (e.type !== 'cannibal' || e.dead || !e.cl) continue;
    if (Math.abs(e.x - p.x) > R0 || Math.abs(e.y - p.y) > R0) continue;
    const c = e.cl;
    if (!c.rig || c.rig.owner !== e) { c.rig = clanRig(c.vi); if (!c.rig) continue; c.rig.owner = e; c.rig.keep = false; Object.values(c.rig.cur).forEach(a => a.fill(0)); c.rig.root = [0, -9 * c.crK]; }
    clanPose(c.rig, e, c, now, dt, null);
  }
  if (C) {
    for (const g of C.dead) { g.t += dt; if (g.x === undefined) { g.x = g.e.x; g.y = g.e.y; } if (g.rig && g.t < 10) clanPose(g.rig, g.e, g.e.cl, now, dt, g); }
    for (const g of C.dead) if (g.t >= 10 && g.rig) { g.rig.keep = false; g.rig.owner = null; g.rig = null; }
    C.dead = C.dead.filter(g => g.t < 10);
  }
}
