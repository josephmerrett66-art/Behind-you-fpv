// ================= doors shut behind you (Joe) =================
// A door or gate swings open as you come at it and shuts as soon as you're through, instead of standing open while you're
// anywhere near. It opens when you're in line with the doorway and heading for it (or standing in it), and swings shut,
// quicker than it opens, once you're a step clear of either side.
const DOOR = { inside: 9, ahead: 30, open: 7, shut: 14 };
function doorWant(o, P, p) {
  if (!o.done) return 0;
  const L = P.L || GRID, ux = Math.cos(o.a), uy = Math.sin(o.a), dx = p.x - o.x, dy = p.y - o.y;
  const along = dx * ux + dy * uy, perp = -dx * uy + dy * ux;   // along the doorway, and out from it
  if (Math.abs(along) > L / 2 + 2 || Math.abs(perp) > DOOR.ahead) return 0;
  if (Math.abs(perp) < DOOR.inside) return 1;   // in the doorway: it stays open
  const vn = -(p.vx || 0) * uy + (p.vy || 0) * ux;
  return perp * vn < 0 && Math.abs(vn) > 5 ? 1 : 0;   // coming at it
}
{ const st = stStep;
  stStep = function (dt) {
    const D = S.day, p = S.p, keep = [];
    if (D) for (const o of D.bld.values()) {
      const P = PC(o.id); if (!stDoorish(P)) continue;
      keep.push([o, P, o.open, o._dw || 0]);
      o.want = o.done && Math.hypot(o.x - p.x, o.y - p.y) < (P.L || GRID) / 2 + 22 ? 1 : 0;   // what the old swing would say: so it stays quiet
    }
    st(dt);
    for (const [o, P, open0, was] of keep) {
      const want = doorWant(o, P, p);
      if (want !== was && actx && monNear(o, 500) > 0) noiseAt(actx.currentTime, want ? 500 : 300, 180, 0.3, 0.2 * monNear(o, 500), sfxGain);
      o._dw = want;
      o.open = open0 + (want - open0) * Math.min(1, dt * (want ? DOOR.open : DOOR.shut));
    }
  }; }
