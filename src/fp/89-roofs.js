// ================= roofs, fires under them, a stone fireplace, and the fire pit you can move =================
// Joe: "the rain goes through the roof tiles so that needs fixing also the sun goes through aswell, also if a roof tile is
// placed above a fire place it should take damage and eventually break. This means we should add a stone fire place to the
// game meaning we should also be able to move or delete the main starting fire place"
//   - the rain stops on a roof (85-weather) and a roof throws its shadow, so the room under it is shaded (30-things)
//   - an open fire under a roof scorches it, darker as it goes, smoke seeping out of it, until it burns through: thatch
//     soonest, slate last
//   - the stone fireplace is a fire in every way (cook, warm, light, rest by it) whose chimney takes the heat up through
//     the roof, so it's the fire to have indoors
//   - the fire pit on the hill moves with the hammer's Move and comes down with Recycle like anything you put down (67-move);
//     its safe ring goes where it goes, and is gone if you take it down. S.day.pit keeps where it is in the save

// ---- the fire pit: where it stands ----
function pitSync() {   // EX_FIRE from the run's own record of it
  const D = S && S.day; if (!D) return;
  if (!D.pit) D.pit = { x: 0, y: 0 };
  EX_FIRE.x = D.pit.x; EX_FIRE.y = D.pit.y; EX_FIRE.gone = !!D.pit.gone;
  grassKey = '';   // the bare ground round it follows it
}
function pitSet(x, y, gone) { const D = S.day; D.pit = gone ? { x, y, gone: 1 } : { x, y }; pitSync(); }
{ const db = dayBegin; dayBegin = function () { const r = db.apply(this, arguments); S.day.pit = { x: 0, y: 0 }; pitSync(); return r; }; }
{ const dl = dayLoad; dayLoad = function () {
    const r = dl.apply(this, arguments); pitSync();
    for (const o of S.day.bld.values()) roofBurn(o);   // a roof a fire has scorched stays scorched
    return r;
  }; }

// ---- the stone fireplace ----
const FPL = { top: ROOF_H + 16, flue: 6.5 };   // the chimney's top, and how far back of the fire it stands
const fpFlue = B => { const a = B.a || 0; return [B.x + Math.cos(a) * FPL.flue, B.y + Math.sin(a) * FPL.flue]; };
// a block of rough split stones laid in courses over a mortar core, the stones running the long way
function fpWall(M, B, f0, f1, s0, s1, z0, z1, seed) {
  const alongS = s1 - s0 >= f1 - f0, L = alongS ? s1 - s0 : f1 - f0, T = alongS ? f1 - f0 : s1 - s0;
  const rows = Math.max(1, Math.round((z1 - z0) / 4.3)), h = (z1 - z0) / rows;
  M.box((f0 + f1) / 2, (s0 + s1) / 2, z0, f1 - f0 - 0.8, z1 - z0, s1 - s0 - 0.8, MAKE.mortar, 'stone');
  for (let r = 0; r < rows; r++) {
    const n = Math.max(1, Math.round(L / 7)), bl = L / n, off = r % 2 ? bl / 2 : 0;
    for (let i = -1; i < n; i++) {
      const a0 = Math.max(0, i * bl + off), a1 = Math.min(L, (i + 1) * bl + off); if (a1 - a0 < 1.5) continue;
      const q = pcRnd(B, seed + r * 13 + i), mid = (a0 + a1) / 2, z = z0 + (r + 0.5) * h, col = lit3(MAKE.stone[(r + i + seed) & 3], 0.9 + 0.2 * q), k = seed + r * 3 + i;
      if (alongS) M.stone((f0 + f1) / 2, s0 + mid, z, T + 0.3, h - 0.25, a1 - a0 - 0.35, col, k);
      else M.stone(f0 + mid, (s0 + s1) / 2, z, a1 - a0 - 0.35, h - 0.25, T + 0.3, col, k);
    }
  }
}
// open at the front (towards you as you put it down), the fire on the hearth inside, the chimney breast over it narrowing
// to a stack that rises well clear of a roof
function fplaceKit(M, B) {
  M.box(-2, 0, 0, 30, 1.4, 36, MAKE.stone[1], 'stone');   // the hearthstone it stands on, out in front of the fire
  fpWall(M, B, 8, 13, -15, 15, 1.4, 31, 0);   // the back
  for (const sd of [-1, 1]) fpWall(M, B, -9, 8, sd > 0 ? 10 : -15, sd > 0 ? 15 : -10, 1.4, 19, sd > 0 ? 5 : 9);   // the cheeks either side
  M.box(-7, 0, 19, 4.6, 4, 31, MAKE.stone[2], 'stone');   // the lintel over the opening
  M.box(-7.6, 0, 23, 6, 1.4, 34, MAKE.dark);   // a mantel board on it
  fpWall(M, B, -5, 13, -15, 15, 23, 31, 2);   // the breast
  fpWall(M, B, -1, 13, -10.5, 10.5, 31, 37, 4);   // narrowing
  fpWall(M, B, 1, 12, -6.5, 6.5, 37, FPL.top - 1.4, 6);   // the stack
  M.box(FPL.flue, 0, FPL.top - 1.4, 13, 1.4, 15, MAKE.stone[0], 'stone'); M.box(FPL.flue, 0, FPL.top - 0.2, 7, 0.3, 9, MAKE.soot, 'plain');   // its cap, black inside
  // inside: soot up the back and sides, a bed of ash, embers and logs burning on it
  M.box(7.4, 0, 1.4, 1, 17.4, 19.6, MAKE.soot, 'plain');
  for (const sd of [-1, 1]) M.box(-0.5, sd * 9.6, 1.4, 16, 17.4, 0.9, MAKE.soot, 'plain');
  M.box(0, 0, 18.4, 15.6, 0.8, 19.6, MAKE.soot, 'plain');
  M.cyl(0, 0, 1.4, 7, 0.5, hex('#3a3430'), 'plain', 10);
  for (let k = 0; k < 4; k++) { const t = k * 1.57 + 0.4; M.rock(Math.cos(t) * 2.2, Math.sin(t) * 2.4, 2.3, 3.4, 1.8, 2.8, MAKE.ember, k, t, 0.9, 'plain'); }
  for (let k = 0; k < 3; k++) { const s = (k - 1) * 3.4; M.log([3.5, s, 1.9], [-4, s * 0.4, 6.5 - Math.abs(k - 1) * 1.6], 1.2, k % 2 ? MAKE.char : MAKE.bark[1], 6); }
}

// ---- an open fire under a roof ----
const RFIRE = { every: 0.5, t: 0, dps: { thatch: 0.6, wood: 0.4, stone: 0.22 }, pit: 1.3, hot: [] };
function roofCovers(o, P, x, y, pad) {   // does this roof reach over (x, y), give or take pad?
  const dx = x - o.x, dy = y - o.y, a = o.a || 0;
  if (P.sh === 'tri') { for (let k = 0; k < 3; k++) { const t = a + k * 2.0944; if (-(dx * Math.cos(t) + dy * Math.sin(t)) > TRI_R / 2 + pad) return false; } return true; }
  const c = Math.cos(a), s = Math.sin(a); return Math.abs(dx * c + dy * s) < GRID / 2 + pad && Math.abs(dy * c - dx * s) < GRID / 2 + pad;
}
function roofBurn(o) {   // how scorched it looks: 0 to 3
  const P = PC(o.id); if (!P || P.lay !== 'roof') return;
  const k = o.max ? clamp(1 - o.hp / o.max, 0, 1) : 0, b = k > 0.02 ? Math.min(3, 1 + Math.floor(k * 3)) : 0;
  if (b !== (o.burn || 0)) o.burn = b;
}
function roofFireStep(dt) {
  const D = S.day; if ((RFIRE.t -= dt) > 0) return; RFIRE.t = RFIRE.every; RFIRE.hot = [];
  for (const f of [...pitL(), ...D.builds.filter(B => B.t === 'fire' && !B.fp)]) {
    for (const o of stNear(f.x, f.y, 30)) {
      const P = PC(o.id); if (P.lay !== 'roof' || !o.done || !roofCovers(o, P, f.x, f.y, f === EX_FIRE ? 10 : 6)) continue;
      o.hp -= (RFIRE.dps[P.m] ?? 0.4) * RFIRE.every * (f === EX_FIRE ? RFIRE.pit : 1); roofBurn(o); RFIRE.hot.push(o);
      if (!o.scorch) { o.scorch = 1; exNote(`the fire is scorching your ${P.n.toLowerCase()} · a stone fireplace is safe under a roof`, true); }
      if (o.hp <= 0) {   // burnt through: it comes down in ash and embers
        stGone(o);
        for (let i = 0; i < 3; i++) ashBurst(o.x + (Math.random() - 0.5) * 36, o.y + (Math.random() - 0.5) * 36, 6, ROOF_H);
        dayChips(o.x, o.y, ROOF_H, P.m === 'stone' ? 'stone' : P.m === 'thatch' ? 'leaf' : 'wood', 10);
        addShake(0.2 * monNear(o, 600)); exNote(`the fire burnt through your ${P.n.toLowerCase()}`, true);
        if (actx && !snd('wood_break', { x: o.x, y: o.y, v: 0.8 })) boomAt(actx.currentTime, 90, 40, 0.4, 0.4 * monNear(o, 600), sfxGain);
      }
    }
  }
}
function roofSmoke(add) {   // smoke seeping out from under a roof that's scorching
  for (const o of RFIRE.hot) if (S.day.bld.get(o.key) === o) add(o.x, o.y, terrH(o.x, o.y) + ROOF_H + 2, 1, 3, o.x * 0.1 + o.y, 0.55, 45, 34);
}
{ const ss = stStep; stStep = function (dt) { if (S.day) roofFireStep(dt); return ss.apply(this, arguments); }; }
