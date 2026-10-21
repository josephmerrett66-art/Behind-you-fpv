// ================= doors you open and shut yourself; shut doors and spikes keep the clan out (Joe) =================
// A door stays as you left it: E (X on a pad) opens it and E shuts it again, when you're at it and looking its way. A gate
// (Joe: "the gates and only the gates auto opening and closing when you walk through pretty much instantly") swings open,
// away from you, as you come up to it and shuts again once you're through and a few steps on.
// Shut, it's part of the wall. Nothing walks through it, the clan don't batter it down, and a blow can't come through a
// standing wall or a shut door. A cannibal moving fast enough to have gone clean through one in a step is put back on its own
// side. Shut yourself in (walls all round, every door closed) and they won't come at you: they prowl round outside, calling,
// and wait. They won't rob a chest that's shut in either. Leave a door open and they can come in.
// Spikes bite the clan whenever one comes close: a stake barricade or a palisade when it's in reach of the points, a spike
// strip or a spike trap when it steps in among them. Each bite is a real wound against their thicker hides.
const DOOR = { open: 7, shut: 14, reach: 34, look: 1.25 };
const GATE = { near: 30, far: 38, open: 30, shut: 18 };   // how close it opens and how far off it shuts (from its line), and how fast
const SPIKE = { reach: 24, strip: 8, trapR: 24, bite: 1.5, trap: 2.5, every: 0.7 };
PC('door').b = 'You open and shut it · shut, it keeps them out';
PC('gate').b = 'Two leaves, two walls wide · opens as you come to it';
PC('stakes').b = 'Crossed stakes · the points bite whatever comes close';
PC('palis').b = 'Sharpened logs · the points bite whatever comes close';
let doorV = 0;   // bumped whenever a door is opened or shut, so the shut-in test looks again
const isDoor = o => !!o && o.kind === 'dst' && o.done && stDoorish(PC(o.id));
const useLab = o => isDoor(o) ? (o.ajar ? 'Close ' : 'Open ') + (PC(o.id).k === 'gate' ? 'gate' : 'door') : useLabel(o);

// ---- which door you're at: in reach, and the way you're looking (or you're stood in it) ----
function doorTarget() {
  const D = S.day, p = S.p; if (!D || !D.bld.size) return null;
  let best = null, bs = 1e9;
  for (const o of stNear(p.x, p.y, 70)) {
    if (!isDoor(o) || PC(o.id).k === 'gate') continue;   // (a gate sees to itself)
    const d = stDistTo(o, p.x, p.y); if (d > DOOR.reach) continue;
    const off = Math.abs(angDiff(Math.atan2(o.y - p.y, o.x - p.x), S.aimW || 0));
    if (d > 10 && off > DOOR.look) continue;
    const sc = d + off * 20; if (sc < bs) { bs = sc; best = o; }
  }
  return best;
}
{ const ut = dayUseTarget;
  dayUseTarget = function () {
    const o = ut(), dr = doorTarget();
    if (!dr) return o; if (!o) return dr;
    const off = q => Math.abs(angDiff(Math.atan2(q.y - S.p.y, q.x - S.p.x), S.aimW || 0));
    return off(dr) < off(o) ? dr : o;   // both in reach: whichever you're looking at more squarely
  }; }
{ const use = dayUse;
  dayUse = function () {
    const rg = S.rg;
    if (S.day && rg && rg.phase === 'fight' && S.running) { const o = dayUseTarget(); if (isDoor(o)) return doorToggle(o); }
    return use();
  }; }
function doorToggle(o) {
  o.ajar = o.ajar ? 0 : 1; doorV++;   // (no hinge hiss: Joe asked for the swinging sound to go)
}

// ---- the swing: toward however you left it ----
{ const st = stStep;
  stStep = function (dt) {
    const D = S.day, rg = S.rg, keep = [];
    if (D) for (const o of D.bld.values()) {
      const P = PC(o.id); if (!stDoorish(P)) continue;
      if (!o.done) o.ajar = 0;
      else if (P.k === 'gate') {   // open as you come up to it, shut once you're off it; the leaves swing away from your side
        const d = stDistTo(o, S.p.x, S.p.y), want = o.ajar ? d < GATE.far : d < GATE.near;
        if (want && !o.ajar && !((o.open || 0) > 0.05)) o.gsd = Math.sign(-(S.p.x - o.x) * Math.sin(o.a || 0) + (S.p.y - o.y) * Math.cos(o.a || 0)) || 1;
        if (want !== !!o.ajar) { o.ajar = want ? 1 : 0; doorV++; }
      }
      // the main game's own swing (below, in st) opens a door for whoever's beside it and hisses each time that changes: told
      // the same as it will work out, it never sees a change, so it stays quiet (told how you left it, it hissed every frame
      // you stood by a shut door or walked off from an open one, and the thud below went with it)
      keep.push([o, o.open]); o.want = o.done && Math.hypot(o.x - S.p.x, o.y - S.p.y) < (P.L || GRID) / 2 + 22 ? 1 : 0;
    }
    // the clan are kept out of the main game's pass (where anything at a door batters it) and get their own below
    const all = rg.enemies, cl = all.filter(e => e.type === 'cannibal' && !e.dead);
    if (cl.length) rg.enemies = all.filter(e => e.type !== 'cannibal');
    try { st(dt); } finally { rg.enemies = all; }
    for (const [o, open0] of keep) {
      const want = o.ajar || 0, was = open0;
      const R = PC(o.id).k === 'gate' ? GATE : DOOR;
      o.open = open0 + (want - open0) * Math.min(1, dt * (want ? R.open : R.shut));
      if (Math.abs(want - o.open) < 0.004) o.open = want;   // come to rest, so it's drawn at rest
      if (!want && was >= 0.08 && o.open < 0.08 && actx && monNear(o, 500) > 0 && !snd('door_close', { x: o.x, y: o.y })) boomAt(actx.currentTime, 120, 60, 0.12, 0.3 * monNear(o, 500), sfxGain);   // the thud as it meets the frame
    }
    if (D && cl.length) clanSpikes(D, cl, dt, dayNight());
  }; }
function clanSpikes(D, cl, dt, night) {
  for (const e of cl) e.spkT = Math.max(0, (e.spkT || 0) - dt);
  for (const o of D.bld.values()) {
    if (!o.done) continue;
    const P = PC(o.id); if (!P.thorn && !P.trap && !P.mire && P.k !== 'chimes') continue;
    for (const e of cl) {
      if (e.dead || Math.abs(e.x - o.x) > 90 || Math.abs(e.y - o.y) > 90) continue;
      const ed = stDistTo(o, e.x, e.y);
      if (((P.thorn && ed < SPIKE.reach) || (P.trap && ed < SPIKE.strip)) && !(e.cl && e.cl.z > 8) && e.spkT <= 0) {   // close enough to the points
        spikeBite(e, P.trap ? SPIKE.trap : SPIKE.bite); if (P.trap) snd('trap_snap', { x: o.x, y: o.y });
        if (P.trap) o.hp -= 1;
      }
      if (P.mire && ed < 6) { e.mire = S.t + 0.25; if (Math.random() < dt * 2) e.hp -= 0.1; }   // the hedge drags at them
      if (P.k === 'chimes' && ed < 220 && !(o.ring > 0)) { o.ring = 6; exNote('the chimes are ringing', true); if (actx && !snd('chimes', { x: o.x, y: o.y, far: 900 })) for (let i = 0; i < 4; i++) setTimeout(() => sfx(2.2 + Math.random() * 1.2, 0.5, 'bandpass', 2600 + Math.random() * 1800, 0.18), i * 120); }
    }
    if (o.hp <= 0 && D.bld.has(o.key)) {
      stGone(o); for (let i = 0; i < 3; i++) ashBurst(o.x + (Math.random() - 0.5) * 40, o.y + (Math.random() - 0.5) * 40, 6, 22);
      exNote(`your ${P.n.toLowerCase()} is spent`, true);
    }
  }
}
function spikeBite(e, dmg) {   // a point goes in: it jerks, and the wound bleeds (the clan's own hurt yelp follows from it)
  e.spkT = SPIKE.every; e.hp -= dmg; e.jit = 1; e.spkHitT = S.t;
  plainBlood(e, (FOES[e.type] ? FOES[e.type].h : 40) * 0.6, Math.random() * TAU, 6);   // v129: blood, not sparks (62-plain)
  ashBurst(e.x, e.y, 3, 14);
  if (actx && monNear(e, 600) > 0 && !snd('blade_flesh', { x: e.x, y: e.y, v: 0.7 })) noiseAt(actx.currentTime, 2600, 900, 0.1, 0.3 * monNear(e, 600), sfxGain);
}
{ const bs = buildStep;
  buildStep = function (dt) {
    const D = S.day, rg = S.rg, all = rg.enemies, cl = all.filter(e => e.type === 'cannibal' && !e.dead);
    if (cl.length) rg.enemies = all.filter(e => e.type !== 'cannibal');
    try { bs(dt); } finally { rg.enemies = all; }
    if (!cl.length) return;
    let gone = false;
    for (const B of D.builds) if (B.t === 'spikes' && !B.gone) for (const e of cl) {
      if (e.dead || e.spkT > 0 || (e.cl && e.cl.z > 8) || !B.parts.some(o => dist2(o, e) < SPIKE.trapR)) continue;
      spikeBite(e, SPIKE.trap); B.uses--;
      if (B.uses <= 0) { B.gone = gone = true; for (const o of B.parts) ashBurst(o.x, o.y, 5, 12); break; }
    }
    if (gone) D.builds = D.builds.filter(B => !B.gone);
  }; }

// ---- walls and shut doors: what stands in the way ----
const _cr = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
function segX(ax, ay, bx, by, f) {   // does a-b cross the wall's run (a hair longer at each end, so a joint between two can't let it by)
  const dx = f.bx - f.ax, dy = f.by - f.ay, L = Math.hypot(dx, dy) || 1, ex = dx / L, ey = dy / L;
  const cx = f.ax - ex, cy = f.ay - ey, qx = f.bx + ex, qy = f.by + ey;
  return _cr(ax, ay, bx, by, cx, cy) * _cr(ax, ay, bx, by, qx, qy) < 0 && _cr(cx, cy, qx, qy, ax, ay) * _cr(cx, cy, qx, qy, bx, by) < 0;
}
function wallRuns(x, y, R, meant) {   // the standing walls and shut doors near (x, y); meant: a door counts as you left it, not as it hangs
  const out = []; if (!S.day || !S.day.bld.size) return out;
  for (const o of stNear(x, y, R)) {
    const P = PC(o.id); if (!o.done || !P.blk || P.sh !== 'edge') continue;
    if (stDoorish(P) && (meant ? o.ajar : o.open > 0.5)) continue;
    out.push(stFoot(o));
  }
  return out;
}
function stWallBetween(ax, ay, bx, by) {
  if (ax === bx && ay === by) return false;
  const W = wallRuns((ax + bx) / 2, (ay + by) / 2, Math.hypot(bx - ax, by - ay) / 2 + 10);
  return W.some(f => segX(ax, ay, bx, by, f));
}
// shut in: every way out of (x, y) runs into a wall or a shut door. Returns how far out the walls go (0: not shut in).
const SHUT = { rays: 48, len: 420 };
let shutC = new Map(), shutK = '';
function stShutIn(x, y) {
  const D = S.day; if (!D || !D.bld.size) return 0;
  const k = stGen + '|' + doorV + '|' + Math.floor(S.t * 2);
  if (k !== shutK) { shutK = k; shutC.clear(); }
  const ck = Math.round(x / 6) + ',' + Math.round(y / 6); let v = shutC.get(ck);
  if (v === undefined) { v = shutTest(x, y); shutC.set(ck, v); }
  return v;
}
function shutTest(x, y) {
  const W = wallRuns(x, y, SHUT.len, true); if (W.length < 3) return 0;
  let far = 0;
  for (let i = 0; i < SHUT.rays; i++) {
    const a = i / SHUT.rays * TAU, ux = Math.cos(a), uy = Math.sin(a), bx = x + ux * SHUT.len, by = y + uy * SHUT.len;
    let near = 1e9;
    for (const f of W) if (segX(x, y, bx, by, f)) {   // how far along the ray it meets this wall
      const dx = f.bx - f.ax, dy = f.by - f.ay, den = ux * dy - uy * dx; if (Math.abs(den) < 1e-6) continue;
      const t = ((f.ax - x) * dy - (f.ay - y) * dx) / den; if (t > 0 && t < near) near = t;
    }
    if (near > SHUT.len) return 0;   // a way out
    far = Math.max(far, near);
  }
  return far;
}
// no blow through a wall: one already coming lands on the planks
{ const fm = foeMelee;
  foeMelee = function (e, d, dt, M0) {
    if (!e.dead && d < 120 && S.day && S.day.bld.size && stWallBetween(e.x, e.y, S.p.x, S.p.y)) {
      if (!e.sw) return false;
      if (e.sw.ph === 'strike') e.sw.hit = true;
    }
    return fm(e, d, dt, M0);
  }; }
// nothing goes clean through a wall in one step (a lunge, a leap, a shove from the posts): it's put back where it was
{ const us = updateSurvive;
  updateSurvive = function (dt) {
    const rg = S.rg, was = [];
    if (S.day && S.day.bld.size && rg) for (const e of rg.enemies) if (!e.dead) was.push([e, e.x, e.y]);
    us(dt);
    for (const [e, x0, y0] of was) if (!e.dead && (e.x !== x0 || e.y !== y0) && Math.hypot(e.x - x0, e.y - y0) < 120 && stWallBetween(x0, y0, e.x, e.y)) { e.x = x0; e.y = y0; }   // (a long way in one go is a respawn, not a step)
  }; }
