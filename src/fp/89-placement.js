// Surface-aware aiming uses the same point for the preview, build, and Move tool.
const DECOR_RADIUS = { flowers: 4, candles: 4.6 };
const DECOR_TOPS = { table: { h: 16, x: 14, y: 8 }, stool: { h: 10.15, r: 4.4 }, crate: { h: 13.6, x: 6.5, y: 6.5 } };
const decorSupport = o => ({ id: o.id, x: o.x, y: o.y, a: o.a || 0 });
function decorFits(o, x, y, radius) {
  const top = DECOR_TOPS[o.id]; if (!top || !o.done || o.del) return false;
  const [f, s] = lvLocal(o, x, y);
  if (top.r ? Math.hypot(f, s) + radius > top.r : Math.abs(f) + radius > top.x || Math.abs(s) + radius > top.y) return false;
  // The table's built-in bowl and cup occupy real space too.
  if (o.id === 'table' && (Math.hypot(f + 4, s - 2) < radius + 2.6 || Math.hypot(f - 5, s + 3) < radius + 1.2)) return false;
  return true;
}
function buildRayAt(height, reach = 150) {
  const p = S.p, a = S.aimW || 0, cp = Math.cos(look.pitch), sp = Math.sin(look.pitch);
  const eye = terrH(p.x, p.y) + EYE + (p.jz || 0);
  const at = t => ({ x: p.x + Math.cos(a) * cp * t, y: p.y + Math.sin(a) * cp * t });
  const delta = t => { const q = at(t); return eye + sp * t - terrH(q.x, q.y) - height; };
  let previous = delta(0);
  for (let t = 2; t <= reach; t += 2) {
    const d = delta(t);
    if (d * previous <= 0) {
      let lo = t - 2, hi = t;
      for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (delta(mid) * previous > 0) lo = mid; else hi = mid; }
      return { ...at((lo + hi) / 2), t: (lo + hi) / 2 };
    }
    previous = d;
  }
  return null;
}
{ const snap = stSnap;
  stSnap = function (P, A) {
    if (isoP()) return snap(P, A);
    if (P.lay === 'roof') {
      const hit = buildRayAt(ROOF_H);
      if (hit) A = hit;
      else { // A level view can still select the nearby roof socket above the wall being aimed at.
        let best = null, score = Infinity; const p = S.p, ux = Math.cos(S.aimW), uy = Math.sin(S.aimW);
        for (const o of stNear(p.x, p.y, 150)) for (const q of stSockets(o, P)) {
          const dx = q.x - p.x, dy = q.y - p.y, along = dx * ux + dy * uy, side = Math.abs(dy * ux - dx * uy);
          if (along < 0 || Math.hypot(dx, dy) > 150 || side > GRID / 2) continue;
          const dh = terrH(q.x, q.y) + ROOF_H - terrH(p.x, p.y) - EYE - (p.jz || 0);
          const angle = Math.abs(Math.atan2(dh, Math.max(1, along)) - look.pitch);
          const cost = angle * 100 + side + along * 0.04;
          if (angle < 0.45 && cost < score && stFree(P, { ...q, snap: true }) === true) { best = q; score = cost; }
        }
        A = best || { x: p.x + ux * 58, y: p.y + uy * 58 };
      }
    }
    if (DECOR_RADIUS[P.id]) {
      let best = null; const hits = new Map();
      for (const o of stNear(S.p.x, S.p.y, 150)) {
        const top = DECOR_TOPS[o.id]; if (!top || !o.done || o.del) continue;
        if (!hits.has(top.h)) hits.set(top.h, buildRayAt(top.h));
        const hit = hits.get(top.h); if (!hit || (best && hit.t >= best.t)) continue;
        const [f, s] = lvLocal(o, hit.x, hit.y);
        if (top.r ? Math.hypot(f, s) > top.r : Math.abs(f) > top.x || Math.abs(s) > top.y) continue;
        best = { ...hit, a: S.day.brot || 0, z: top.h, support: decorSupport(o), on: o, snap: false };
      }
      if (best) return best;
    }
    return snap(P, A);
  };
}
{ const free = stFree;
  stFree = function (P, sp) {
    if (sp.support) {
      const r = DECOR_RADIUS[P.id];
      if (!r || !sp.on || S.day.bld.get(sp.on.key) !== sp.on || !decorFits(sp.on, sp.x, sp.y, r)) return 'keep the whole object on a clear surface';
      for (const o of stNear(sp.x, sp.y, 20)) if (o !== sp.on && (o.z || 0) === sp.z && DECOR_RADIUS[o.id] && Math.hypot(o.x - sp.x, o.y - sp.y) < r + DECOR_RADIUS[o.id]) return 'another decoration is in the way';
    } else if (DECOR_RADIUS[P.id]) {
      for (const o of stNear(sp.x, sp.y, 25)) if (o.done && DECOR_TOPS[o.id] && stDistTo(o, sp.x, sp.y) < DECOR_RADIUS[P.id]) return 'aim at a clear spot on the top';
    }
    if (P.lay === 'roof') for (const o of stNear(sp.x, sp.y, GRID)) if (PC(o.id).lay === 'roof' && stOverlap(P, sp, o)) return 'a roof is already there';
    return free(P, sp);
  };
}
// Old saves omit these optional fields. Resolve supports after all pieces have received new runtime keys.
{ const load = dayLoad; dayLoad = function () {
    const r = load.apply(this, arguments);
    if (S && S.day) for (const o of S.day.bld.values()) if (o.support) {
      const b = o.support, parent = stNear(b.x, b.y, 1).find(q => q.id === b.id && Math.hypot(q.x - b.x, q.y - b.y) < 0.2 && q.done);
      if (parent && DECOR_TOPS[parent.id]) { o.on = parent.key; o.support = decorSupport(parent); o.z = DECOR_TOPS[parent.id].h; }
      else { delete o.support; delete o.z; delete o.on; }
    }
    return r;
  }; }

{ const aimed = stAimed; stAimed = function (pred) {
    const nearby = S && S.day && stNear(S.p.x, S.p.y, MV_REACH).some(o => o.support);
    const hit = nearby && mvLook();
    if (hit && hit.o && hit.o.support && (!pred || pred(hit.o))) return hit.o;
    return aimed.apply(this, arguments);
  }; }
