// ================= up off the ground: a staircase and a lookout on scaffolding =================
// Joe: "we need things like stairs, so you can place a staircase, and then a like second level stand, which is kind of
// like a not just a floating floor, but like a floor with scaffolding underneath it. So you can't build a house with a
// second level on top of it, but you can build a second level section for a lookout or something like that."
//   - the lookout stand is one floor square of boards up at roof height on four posts, braced on its open sides, with a rail
//     round the edge. Stands snap side by side into a bigger lookout (no rail or bracing where they meet).
//   - the staircase is one square long and climbs to it; it snaps against a stand's side, and the rail opens where it
//     comes up. You can put a stand at the top of a staircase too.
//   - you walk up the stairs and stand on the boards. Under the boards is all posts and braces, so you go round, not under.
//     Over the rail is a jump; off the top of open stairs is a drop.
//   - up there nothing on the ground can reach you with its hands (arrows and thrown spears still can), and you can only
//     reach down to them with a spear. What they can do is knock the posts out from under you.
// Heights here are above the ground under you, the way everything you build follows the lie of the land: p.jz is how high
// your feet are, p.gz what they'd come down on.
const LV = { deck: ROOF_H, rail: 16, step: 8, stairW: 30, up: 22, r: 7, n: 8 };
PIECES.push(
  { id: 'stairs', cat: 'floor', sh: 'sq', lay: 'stair', k: 'stairs', m: 'wood', blk: 1, r: 14, H: LV.deck, s: 'Stairs', n: 'Staircase', b: 'Steps up to a lookout · snaps to its side', cost: { planks: 4, logs: 1 }, hp: 40 },
  { id: 'stand', cat: 'floor', sh: 'sq', lay: 'deck', k: 'stand', m: 'wood', blk: 1, r: 26, H: LV.deck + LV.rail, s: 'Lookout', n: 'Lookout stand', b: 'Boards up on braced posts · see over the trees round you', cost: { logs: 4, planks: 4, rope: 2 }, hp: 80 },
);
for (const P of PIECES.slice(-2)) PC_BY.set(P.id, P);
BPIC.stairs = '<path d="M3 20.5h4.5v-4h4v-4h4v-4h4v-4H21v16z" fill="#b08a58"/><path d="M3 20.5h4.5v-4h4v-4h4v-4h4v-4" fill="none" stroke="#7a5232" stroke-width="1.3" stroke-linejoin="round"/>';
BPIC.stand = '<path d="M2.5 9h19v2.6h-19z" fill="#b08a58"/><path d="M4.5 11.6V21M19.5 11.6V21M4.5 21l15-9.4M4.5 11.6l15 9.4" fill="none" stroke="#7a5232" stroke-width="1.5"/><path d="M4 9V3.5M20 9V3.5M4 4.6h16M4 6.8h16" fill="none" stroke="#7a5232" stroke-width="1.2"/>';

function lvPiece(o) { const L = PC(o.id).lay; return L === 'deck' || L === 'stair'; }
function lvLocal(o, x, y) { const c = Math.cos(o.a || 0), s = Math.sin(o.a || 0), dx = x - o.x, dy = y - o.y; return [dx * c + dy * s, -dx * s + dy * c]; }
function lvWorld(o, f, q) { const c = Math.cos(o.a || 0), s = Math.sin(o.a || 0); return [o.x + c * f - s * q, o.y + s * f + c * q]; }
const lvStairH = f => clamp(LV.deck * ((f + GRID / 2) / GRID + 0.5 / LV.n), 0, LV.deck);   // the line of the treads, from the bottom step up to the boards
// every stand and staircase you've put down (blueprints too: they shape the rails), found again only when something's built or pulled down
let LVL = { g: -1, bld: null, all: [] };
function lvAll() {
  const D = S.day; if (!D) return [];
  if (LVL.g !== stGen || LVL.bld !== D.bld) LVL = { g: stGen, bld: D.bld, all: [...D.bld.values()].filter(lvPiece) };
  return LVL.all;
}
// a stand's four sides: [along the boards, across] for which way is out, whether another stand shares it (no rail, no
// bracing) and where a staircase comes up through its rail
const LV_SIDES = [[1, 0], [0, 1], [-1, 0], [0, -1]];
function lvSides(o) {
  const out = LV_SIDES.map(([nf, ns]) => ({ nf, ns, shared: false, gaps: [] }));
  for (const q of lvAll()) {
    if (q === o || q.key === o.key && o.key) continue;
    const Q = PC(q.id), da = angDiff(q.a || 0, o.a || 0);
    if (Q.lay === 'deck') {
      if (Math.abs(Math.sin(2 * da)) > 0.1) continue;   // only one lined up square with it
      const [f, s] = lvLocal(o, q.x, q.y);
      for (const sd of out) if (Math.abs(f - sd.nf * GRID) < 4 && Math.abs(s - sd.ns * GRID) < 4) sd.shared = true;
    } else {   // the top of a staircase, at a side and climbing into it
      const [tx, ty] = lvWorld(q, GRID / 2, 0), [f, s] = lvLocal(o, tx, ty), uf = Math.cos(da), us = Math.sin(da);
      for (const sd of out) {
        const n = f * sd.nf + s * sd.ns, t = -f * sd.ns + s * sd.nf;   // out from the middle, and along the side
        if (Math.abs(n - GRID / 2) < 5 && Math.abs(t) < GRID / 2 && uf * sd.nf + us * sd.ns < -0.9) sd.gaps.push([t - LV.stairW / 2 - 1, t + LV.stairW / 2 + 1]);
      }
    }
  }
  for (const sd of out) {   // what's left of each side once the gaps are cut out of it: where the rail runs
    let runs = [[-GRID / 2 + 3, GRID / 2 - 3]];
    if (!sd.shared) for (const [g0, g1] of sd.gaps) runs = runs.flatMap(([a, b]) => [[a, Math.min(b, g0)], [Math.max(a, g1), b]]).filter(([a, b]) => b - a > 2);
    sd.rails = sd.shared ? [] : runs;
  }
  return out;
}
function lvStairTop(o) {   // the stand a staircase climbs to, if there is one
  const [tx, ty] = lvWorld(o, GRID / 2 + 3, 0);
  return lvAll().find(q => PC(q.id).lay === 'deck' && (([f, s]) => Math.abs(f) <= GRID / 2 && Math.abs(s) <= GRID / 2)(lvLocal(q, tx, ty)));
}

// ---- standing on them ----
// the highest thing under (x, y) your feet could be on, coming from z: the ground (0), a step of the stairs, the boards
function lvGround(x, y, z) {
  let g = 0;
  for (const o of lvAll()) {
    if (!o.done || Math.abs(o.x - x) > GRID || Math.abs(o.y - y) > GRID) continue;
    const [f, s] = lvLocal(o, x, y), deck = PC(o.id).lay === 'deck';
    if (Math.abs(f) > GRID / 2 + 0.5 || Math.abs(s) > (deck ? GRID / 2 : LV.stairW / 2) + 0.5) continue;
    const h = deck ? LV.deck : lvStairH(f);
    if (h > g && h <= z + LV.step) g = h;
  }
  return g;
}
function lvUp() { return !!(S && S.p && (S.p.jz || 0) > LV.up); }   // high enough that a club from the ground can't reach
function lvUnder() {   // the stand or staircase you're up on, if you're up
  if (!lvUp()) return null; const p = S.p;
  for (const o of lvAll()) {
    if (!o.done) continue; const [f, s] = lvLocal(o, p.x, p.y), deck = PC(o.id).lay === 'deck';
    if (Math.abs(f) <= GRID / 2 + 1 && Math.abs(s) <= (deck ? GRID / 2 : LV.stairW / 2) + 1) return o;
  }
  return null;
}
// in the way: the scaffold under the boards, the rail round them, the solid run of the stairs and their handrails.
// (px, py) is where you stood last step, so a rail only ever holds you in from the side you were on.
function lvPush(p, px, py) {
  const z = p.jz || 0, R = LV.r;
  for (const o of lvAll()) {
    if (!o.done || Math.abs(o.x - p.x) > GRID + R || Math.abs(o.y - p.y) > GRID + R) continue;
    const deck = PC(o.id).lay === 'deck', hx = GRID / 2, hy = deck ? GRID / 2 : LV.stairW / 2;
    let [f, s] = lvLocal(o, p.x, p.y); const [f0, s0] = lvLocal(o, px, py);
    if (Math.abs(f) > hx + R || Math.abs(s) > hy + R) continue;
    let moved = false;
    if (deck) {
      const sides = lvSides(o);
      if (z < LV.deck - LV.step) {   // down among the posts: out through the nearest open side
        let best = null, bd = 1e9;
        for (const sd of sides) { if (sd.shared) continue; const pen = (sd.nf ? hx : hy) + R - (f * sd.nf + s * sd.ns); if (pen < bd) { bd = pen; best = sd; } }
        if (best && bd > 0) { if (best.nf) f = best.nf * (hx + R); else s = best.ns * (hy + R); moved = true; }
      } else if (z < LV.deck + LV.rail - LV.step && Math.abs(f0) <= hx && Math.abs(s0) <= hy) {   // on the boards: the rail
        for (const sd of sides) for (const [a, b] of sd.rails) {
          const n = f * sd.nf + s * sd.ns, t = -f * sd.ns + s * sd.nf, n0 = f0 * sd.nf + s0 * sd.ns, lim = hx - 3 - 4.5;
          if (n > lim && n0 <= lim + 0.01 && t > a - 2 && t < b + 2) { const d = n - lim; f -= sd.nf * d; s -= sd.ns * d; moved = true; }
        }
      }
    } else {
      const h = lvStairH(clamp(f, -hx, hx)), lim = hy - 4.5;
      if (h > z + LV.step && z < h) {   // against the side (or the high end) of the run: back off it
        const top = !lvStairTop(o), ps = hy + R - Math.abs(s), pf = top ? hx + R - f : 1e9;
        if (ps <= pf) s = Math.sign(s || 1) * (hy + R); else f = hx + R;
        moved = true;
      } else if (z > 3 && Math.abs(f) < hx && Math.abs(f0) < hx + 1 && Math.abs(s) > lim && Math.abs(s0) <= hy + 0.5) { s = Math.sign(s) * lim; moved = true; }   // the handrails
    }
    if (moved) { [p.x, p.y] = lvWorld(o, f, s); }
  }
}
// the step: up and down the stairs with your feet, off an edge and down, a jump and back onto whatever's under you
function lvStep(dt, px, py) {
  const p = S.p;
  if (Math.hypot(p.x - (p.lvX ?? p.x), p.y - (p.lvY ?? p.y)) > 40) { p.jz = 0; p.jvz = 0; p.jair = 0; }   // somewhere else entirely (you woke at your bed): on the ground there
  else if (lvAll().length) lvPush(p, p.lvX ?? px, p.lvY ?? py);
  const z = p.jz || 0, g = p.gz = lvAll().length ? lvGround(p.x, p.y, z) : 0;
  if (!p.jair && !(p.jvz > 0)) {
    if (z - g <= LV.step) {   // on your feet
      p.jz = g; p.lvX = p.x; p.lvY = p.y;
      const D = S.day; if (g >= LV.deck && D && D.told && !D.told.lookout) { D.told.lookout = 1; exNote('up on the lookout · their clubs can\'t reach you here, their arrows can · and they can knock it down', true); }
      return;
    }
    p.jair = 1; p.jvz = 0;   // walked off the edge
  }
  p.jvz -= JUMP.g * dt; p.jz = Math.max(g, z + p.jvz * dt);
  if (p.jz <= g && p.jvz <= 0) {   // down: both feet, and the view gives a little (a long drop more)
    const hard = clamp(-p.jvz / JUMP.v, 0, 1.4); p.jvz = 0; p.jair = 0; p.jz = g;
    feelLand(hard); FPX.step(true, -1); if (g > 0 || stepKind(p.x, p.y)[0] !== 'water_wade') snd('jump_land', { v: 0.35 + 0.35 * hard }); setTimeout(() => FPX.step(true, 1), 45);
    if (hard > 1.2) addShake(0.25);
  }
  p.lvX = p.x; p.lvY = p.y;
}
function lvAir(p) { return !!(p && (p.jair || p.jvz > 0)); }   // in the air: jumped, or off an edge

// ---- what they're made of, to the rest of the game ----
// how far a point is from one: from the boards' (or the run's) edge, not from a circle round the middle
{ const sd = stDistTo; stDistTo = function (o, x, y) {
    if (!lvPiece(o)) return sd.apply(this, arguments);
    const [f, s] = lvLocal(o, x, y), hy = PC(o.id).lay === 'deck' ? GRID / 2 : LV.stairW / 2;
    return Math.hypot(Math.max(0, Math.abs(f) - GRID / 2), Math.max(0, Math.abs(s) - hy));
  }; }
// what they bump into: posts all round the stand and along the stairs (you have your own rules, above)
{ const so = stSolids; stSolids = function (o) {
    if (!lvPiece(o)) return so.apply(this, arguments);
    if (!o.done) return [];
    const out = [], at = (f, s, r) => { const [x, y] = lvWorld(o, f, s); out.push({ x, y, r, s: 1, st: o, nocol: 1 }); };
    if (PC(o.id).lay === 'deck') { for (const [nf, ns] of LV_SIDES) for (const t of [-28, -14, 0, 14]) at(nf * 28 - ns * t, ns * 28 + nf * t, 9); }
    else for (const f of [-20, -6, 8, 22]) at(f, 0, LV.stairW / 2 - 1);
    return out;
  }; }
// where they snap: stands side by side, a staircase up against a stand's side, a stand on top of a staircase
{ const sk = stSockets; stSockets = function (o, P) {
    const Q = PC(o.id), mine = P.lay === 'deck' || P.lay === 'stair';
    if (lvPiece(o) && !mine) return [];   // nothing else builds onto them: they're for standing on
    const out = sk.apply(this, arguments);
    if (P.lay === 'stair' && Q.lay === 'deck') for (const e of stEdges(o)) out.push({ x: e.x + e.nx * GRID / 2, y: e.y + e.ny * GRID / 2, a: Math.atan2(-e.ny, -e.nx) });
    if (P.lay === 'deck' && Q.lay === 'stair') { const [x, y] = lvWorld(o, GRID, 0); out.push({ x, y, a: o.a }); }
    return out;
  }; }
// not over a trunk or a rock: the boards would go straight through it
{ const sf = stFree; stFree = function (P, sp) {
    const why = sf.apply(this, arguments); if (why !== true || (P.lay !== 'deck' && P.lay !== 'stair')) return why;
    const o = { id: P.id, x: sp.x, y: sp.y, a: sp.a }, hy = P.lay === 'deck' ? GRID / 2 : LV.stairW / 2;
    for (const t of propsNear(sp.x, sp.y, GRID)) {
      if (t.kind !== 'tree' && t.kind !== 'rock' && t.kind !== 'rockIron') continue;
      const [f, s] = lvLocal(o, t.x, t.y), r = (t.r || 8) * (t.s || 1) * 0.5;
      if (Math.abs(f) < GRID / 2 + r && Math.abs(s) < hy + r) return t.kind === 'tree' ? 'a tree is in the way' : 'a rock is in the way';
    }
    return true;
  }; }
// up there: a club or a claw from the ground can't reach you; an arrow, a thrown spear or a blast still can
{ const hu = hurt; hurt = function (e) { if (lvUp() && !(e && e.src)) return; return hu.apply(this, arguments); }; }
// and only a spear reaches down to them
{ const ah = atkHit; atkHit = function () { if (lvUp()) { const T = heldIt(); if (!T || T.wpn !== 'spear') return 0; } return ah.apply(this, arguments); }; }

// ---- how they look ----
// the stand: four posts in their bark, braced zigzag up each open side and lashed where the poles cross, a frame of beams
// under the boards, and a pole rail round the edge with a gap where a staircase comes up
function standKit(K, o) {
  const M = maker(K, o.x, o.y, o.a || 0), G = GRID, h = G / 2, D = LV.deck, top = D + LV.rail, sides = lvSides(o), c = h - 3;
  const B = (i) => MAKE.bark[i % 3];
  const corners = [[c, c], [-c, c], [-c, -c], [c, -c]];
  corners.forEach(([f, s], i) => {   // a post runs up through the rail only where a railed side meets it
    const railed = sides.some(sd => !sd.shared && (sd.nf ? sd.nf * f > 0 : sd.ns * s > 0));
    M.log([f, s, 0], [f, s, railed ? top + 0.5 : D - 0.4], 2.5, B(i), 7);
    for (const z of [21, D - 4.5]) M.lash(f, s, z, 2.5);
  });
  sides.forEach((sd, i) => {
    if (sd.shared) return;
    const P0 = t => [sd.nf * c - sd.ns * t, sd.ns * c + sd.nf * t], [af, as] = P0(-c), [bf, bs] = P0(c), w = (i % 2) ? 1 : -1;
    M.rod([af, as, 21], [bf, bs, 21], 1.5, B(i + 1), 'bark', 6);   // the ledger halfway up
    const [lf, ls] = w > 0 ? [af, as] : [bf, bs], [rf, rs] = w > 0 ? [bf, bs] : [af, as];
    M.rod([lf, ls, 3], [rf, rs, 20], 1.25, B(i + 2), 'bark', 6);   // and a brace across each bay, zigzag
    M.rod([rf, rs, 22], [lf, ls, D - 5.5], 1.25, B(i), 'bark', 6);
  });
  for (const [nf, ns] of LV_SIDES) M.box(nf * (h - 1.6), ns * (h - 1.6), D - 5.6, nf ? 3.2 : G - 0.4, 3.7, nf ? G - 0.4 : 3.2, MAKE.dark);   // the frame under the boards
  for (const f of [-h / 3, h / 3]) M.box(f, 0, D - 5.2, 2.6, 3.3, G - 4, MAKE.dark);   // and joists across, under the run of the boards
  floorKit(maker(K, o.x, o.y, o.a || 0, D - 1.7), o, { m: 'wood' });
  for (const sd of sides) for (const [a, b] of sd.rails) {   // the rail: a top pole and a knee pole, a post at a gap
    const P0 = t => [sd.nf * c - sd.ns * t, sd.ns * c + sd.nf * t], [af, as] = P0(a), [bf, bs] = P0(b);
    M.rod([af, as, D + 15.2], [bf, bs, D + 15.2], 1.2, MAKE.bark[2], 'bark', 6);
    M.rod([af, as, D + 7.6], [bf, bs, D + 7.6], 0.95, MAKE.bark[0], 'bark', 6);
    for (const t of [a, b]) if (Math.abs(Math.abs(t) - c) > 1) { const [f, s] = P0(t); M.log([f, s, D - 0.5], [f, s, top], 1.6, MAKE.bark[1], 6); M.lash(f, s, D + 15.2, 1.6, 1.1); }
  }
}
// the stairs: two sawn stringers on posts, eight treads across them, and a handrail on each side
function stairKit(K, o) {
  const M = maker(K, o.x, o.y, o.a || 0), G = GRID, h = G / 2, D = LV.deck, w = LV.stairW / 2, n = LV.n, rise = D / n, run = G / n;
  for (const s of [-(w - 1), w - 1]) {
    M.slab([-h + 0.5, s, 0.6], [h - 0.6, s, D - 4.2], 1.8, 6.5, MAKE.plank[1]);   // the stringers, under the line of the treads
    M.log([h - 2.6, s, 0], [h - 2.6, s, D - 4.5], 1.9, MAKE.bark[s > 0 ? 0 : 2], 6);   // a post under the top
    M.log([-0.5, s, 0], [-0.5, s, D / 2 - 6], 1.7, MAKE.bark[1], 6);   // and one under the middle
  }
  for (let i = 0; i < n; i++) { const q = pcRnd(o, i); M.box(-h + (i + 0.5) * run, 0, (i + 1) * rise - 1.6, run + 1.3, 1.6, 2 * w - 0.4, lit3(MAKE.plank[i % 3], 0.92 + 0.12 * q)); }
  for (const s of [-(w + 0.6), w + 0.6]) {   // the handrails
    const b = -h + 2.5, t = h - 2.5;
    M.log([b, s, 0], [b, s, lvStairH(b) + 16.5], 1.4, MAKE.bark[2], 6);
    M.log([t, s, lvStairH(t) - 4], [t, s, lvStairH(t) + 16.5], 1.4, MAKE.bark[0], 6);
    M.rod([b, s, lvStairH(b) + 15.2], [t, s, lvStairH(t) + 15.2], 1.1, MAKE.bark[1], 'bark', 6);
    M.rod([b, s, lvStairH(b) + 7.8], [t, s, lvStairH(t) + 7.8], 0.9, MAKE.bark[0], 'bark', 6);
  }
}
{ const pk = pieceKit; pieceKit = function (K, o) {
    const L = PC(o.id).lay;
    if (L === 'deck' || L === 'stair') {
      if (!o.done || !SWING.next) return L === 'deck' ? standKit(K, o) : stairKit(K, o);
      const key = [o.id, o.x, o.y, o.a, stGen].join('|'); let c = PCACHE.get(o);
      if (!c || c.k !== key) { const T = new Kit(); if (L === 'deck') standKit(T, o); else stairKit(T, o); c = { k: key, c: T.take() }; PCACHE.set(o, c); }
      K.chunk(c.c); return;
    }
    return pk.apply(this, arguments);
  }; }
