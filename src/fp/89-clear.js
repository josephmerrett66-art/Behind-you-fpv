// ================= clearing the ground: chop up fallen logs and saplings, cut back bushes and ferns =================
// Joe: to clear a spot for a base. The undergrowth is the woods' decor (decorAt, one thing a tile), so what you clear is kept
// by its tile in D.cleared (saved with the run) and decorNear leaves it out from then on. A log or a sapling wants the axe,
// like a tree; a bush or a fern comes away by hand, quicker with a tool. What gets the blow is what's near and most nearly
// where you're looking (clearScore), so a log at your feet is chopped before the tree behind it.
const CLEAR = { log: { r: 4.2, axe: true }, sapling: { r: 5, axe: true }, bush: { r: 9 }, fern: { r: 7 } };
{ const da = decorAt; decorAt = function (i, j) { const d = da(i, j); if (d && d.ck === undefined) d.ck = i * 2097152 + j; return d; }; }
{ const dn = decorNear; decorNear = function (x, y, R) {
    const r = dn(x, y, R), C = S && S.day && S.day.cleared;
    return C ? r.filter(d => !C[d.ck]) : r;
  }; }
// the point of it nearest you: along a log's length (it lies the way 14-props turns it), else its middle
function clearPt(d, p) {
  if (d.dk !== 'log') return { x: d.x, y: d.y };
  const a = (d.seed * 7919 % 1) * 6.283 + d.x * 0.013, ux = Math.cos(a), uy = -Math.sin(a), h = 19 * d.s;
  const t = Math.max(-h, Math.min(h, (p.x - d.x) * ux + (p.y - d.y) * uy));
  return { x: d.x + ux * t, y: d.y + uy * t };
}
const clearScore = (o, a, rim) => { const p = S.p; return Math.max(0, dist2(o, p) - rim) + 25 * Math.abs(angDiff(Math.atan2(o.y - p.y, o.x - p.x), a)); };
function clearTarget(Dk, a, inReach) {
  const p = S.p; let best = null, bd = 1e9;
  for (const d of decorNear(p.x, p.y, Dk.reach + dayR() + 40)) {
    const C = CLEAR[d.dk]; if (!C) continue;
    const q = clearPt(d, p), r = C.r * d.s + 2; if (!inReach(q, r)) continue;
    const dd = clearScore(q, a, r); if (dd < bd) { bd = dd; best = { d, q, dd }; }
  }
  return best;
}
function clearHit(c) {
  const D = S.day, p = S.p, d = c.d, C = CLEAR[d.dk], tool = dayTool(), T = heldIt(), key = 'd' + d.ck;
  const hitA = Math.atan2(p.y - c.q.y, p.x - c.q.x), hx = c.q.x + Math.cos(hitA) * C.r * d.s, hy = c.q.y + Math.sin(hitA) * C.r * d.s;
  if (C.axe && tool !== 'axe') {
    dayNote('axe', D.inv.some(s => s && DIT[s.id].tool === 'axe') ? 'hold your axe to chop' : 'you need an axe · craft one', 3);
    if (actx) noiseAt(actx.currentTime, 500, 200, 0.12, 0.3, sfxGain); return;
  }
  if (C.axe && !dayStam(STA_CHOP)) return;
  const tier = T && T.tier || 0, need = d.dk === 'log' ? (tier > 3 ? 1 : tier > 1 ? 2 : 3) : d.dk === 'sapling' ? (tier > 1 ? 1 : 2) : d.dk === 'bush' && tool === 'hand' ? 2 : 1;
  const n = (D.cut.get(key) || 0) + 1;
  if (C.axe) { dayChips(hx, hy, d.dk === 'log' ? 6 : 9, 'wood', 8, hitA); if (actx) { const t = actx.currentTime; boomAt(t, 200, 100, 0.1, 0.4, sfxGain); noiseAt(t, 1700, 600, 0.09, 0.32, sfxGain); } }
  else { dayChips(hx, hy, 8, 'leaf', 9, hitA); if (actx) noiseAt(actx.currentTime, 3000, 1500, 0.15, 0.3, sfxGain); }
  if (n < need) { D.cut.set(key, n); exNote(`chop · ${need - n} more`); return; }
  D.cut.delete(key); (D.cleared || (D.cleared = {}))[d.ck] = 1; worldDirty = true;
  if (d.dk === 'log') {   // it splits apart along its length
    const a = (d.seed * 7919 % 1) * 6.283 + d.x * 0.013, ux = Math.cos(a), uy = -Math.sin(a);
    for (let k = -1; k <= 1; k++) dayChips(d.x + ux * k * 12 * d.s, d.y + uy * k * 12 * d.s, 5, 'wood', 7, undefined, 1.5);
    ashBurst(d.x, d.y, 8, 6); addShake(0.2); padRumble(0.4, 120);
    if (actx) { const t0 = actx.currentTime; noiseAt(t0, 900, 300, 0.25, 0.4, sfxGain); boomAt(t0 + 0.02, 110, 55, 0.25, 0.4, sfxGain); }
    dayGive('logs', d.s > 1.3 ? 2 : 1, d.x, d.y); dayGive('sticks', 1, d.x, d.y); pickSnd(); exNote('timber', true);
  } else if (d.dk === 'sapling') {
    dayChips(d.x, d.y, 4, 'wood', 6, hitA + Math.PI, 1.3); dayLeaves(d.x, d.y, 12, 44 * d.s, 16 * d.s, d.v < 2 ? 'needle' : 'crown', 30);
    if (actx) noiseAt(actx.currentTime + 0.03, 4500, 1800, 0.6, 0.15, sfxGain);
    dayGive('sticks', 2, d.x, d.y); pickSnd();
  } else {
    dayLeaves(d.x, d.y, 2, (d.dk === 'bush' ? 18 : 10) * d.s, (d.dk === 'bush' ? 12 : 8) * d.s, 'leaf', d.dk === 'bush' ? 24 : 12);
    dayGive('fibre', d.dk === 'bush' ? 2 : 1, d.x, d.y); if (d.dk === 'bush') dayGive('sticks', 1, d.x, d.y);
  }
}
{ const dh = dayHarvest; dayHarvest = function (Dk, a, inReach, spark) {
    const D = S.day, p = S.p, A = p.atk;
    if (!D || !A || A.hit.has('world')) return dh.apply(this, arguments);
    const c = clearTarget(Dk, a, inReach); if (!c) return dh.apply(this, arguments);
    // the game's own trees, rocks and gathering bushes, if one of them is the better mark
    for (const o of propsNear(p.x, p.y, Dk.reach + dayR() + 30)) if ((o.kind === 'tree' || o.kind === 'rock') && inReach(o, 12) && clearScore(o, a, (o.kind === 'tree' ? 6 : 10) * (o.s || 1)) < c.dd) return dh.apply(this, arguments);
    for (const o of dayNodesNear(p.x, p.y, Dk.reach + 40)) if ((o.t === 'bush' || o.t === 'grass') && !o.gone && inReach(o, 10) && clearScore(o, a, 10) < c.dd) return dh.apply(this, arguments);
    A.hit.add('world'); const hits = dh.apply(this, arguments);   // (any creature in the swing still takes it)
    clearHit(c); return hits + 1;
  }; }
