// ---------------- home: sleeping in your bed, and floors inside the palisade ----------------
// Joe: you should be able to sleep the night away in your bed, and lay floors in the camp that stop at the fence.

// ---- sleep ----
// Use your bed from the evening on: the screen goes dark, the night passes while you sleep (whatever's on the fire or the
// rack keeps going), and you wake at first light rested, a little hungry and thirsty.
const SLEEP_FROM = NIGHT_IN - 30 / DAY_LEN, SLEEP_FOOD = 18, SLEEP_WATER = 22;
let sleepEl = null;
function daySleep(bed) {
  const D = S.day, f = dayT(); if (!D || D.sleeping) return;
  if (f < SLEEP_FROM && f > 0.02) { dayNote('sleep', 'you can sleep once evening comes', 2); return; }
  if (S.rg.enemies.some(e => !e.dead && Math.hypot(e.x - S.p.x, e.y - S.p.y) < 260)) { dayNote('sleep', 'you can\'t sleep with something close by', 2); return; }
  D.sleeping = true; S.p.vx = S.p.vy = 0;
  if (!sleepEl) { sleepEl = document.createElement('div'); sleepEl.style.cssText = 'position:fixed;inset:0;background:#05040a;opacity:0;pointer-events:none;transition:opacity 0.9s ease;z-index:40;'; document.body.appendChild(sleepEl); }
  requestAnimationFrame(() => { sleepEl.style.opacity = '1'; });
  if (actx) noiseAt(actx.currentTime, 400, 200, 1.2, 0.12, sfxGain);
  setTimeout(() => {
    const D2 = S.day; if (D2 !== D) { sleepEl.style.opacity = '0'; return; }
    const to = (Math.floor(D.t / DAY_LEN) + (f > 0.5 ? 1 : 0)) * DAY_LEN + 3, gap = Math.max(0, to - D.t);
    D.t = to;
    for (const q of D.pots || []) if (!q.ready) q.t = Math.min(q.T, q.t + gap);   // the pots keep cooking while you sleep
    for (const B of D.builds) if (B.fuel > 0) B.fuel = Math.max(0, B.fuel - gap);
    D.food = Math.max(5, D.food - SLEEP_FOOD); D.water = Math.max(5, D.water - SLEEP_WATER);
    D.st = STA_MAX; D.warm = WARM_MAX; S.rg.hp = Math.max(S.rg.hp, S.rg.maxHp || S.rg.hp);
    if (S.rg.wisps) S.rg.wisps = S.rg.wisps.filter(w => !w.wild);
    S.p.x = bed.x + Math.cos((bed.a || 0) + Math.PI / 2) * 16; S.p.y = bed.y + Math.sin((bed.a || 0) + Math.PI / 2) * 16;
    daySave(); dayChanged();
    setTimeout(() => { sleepEl.style.opacity = '0'; D.sleeping = false; S.rg.ringMsg = { text: `day ${Math.max(D.n, 1 + Math.floor(D.t / DAY_LEN))}`, sub: 'You slept through the night', t: 0 }; }, 500);
  }, 1000);
}

// ---- floors at the palisade ----
// A floor laid across the camp's fence keeps only the side you laid it from: from inside the camp, the part inside;
// from outside, the part outside. It's drawn as small tiles, the ones on the far side of the fence left out.
function stClipOf(P, sp) {
  if (P.lay !== 'floor') return 0;
  const cs = stCorners({ id: P.id, x: sp.x, y: sp.y, a: sp.a }), rs = cs.map(([x, y]) => Math.hypot(x, y));
  if (Math.max(...rs) < CAMP_R - 2 || Math.min(...rs) > CAMP_R + 2) return 0;   // not touching the fence
  return Math.hypot(S.p.x, S.p.y) < CAMP_R ? 1 : -1;
}
const CLIP_N = 8;
function floorClipKit(K, o, col, z, th) {   // the floor as CLIP_N x CLIP_N tiles, only those on the kept side of the fence
  const P = PC(o.id), cs = stCorners(o), side = o.clip, c = GRID / CLIP_N, a = o.a || 0;
  const inPoly = (x, y) => { let s = 0; for (let i = 0; i < cs.length; i++) { const [ax, ay] = cs[i], [bx, by] = cs[(i + 1) % cs.length]; const cr = (bx - ax) * (y - ay) - (by - ay) * (x - ax); if (cr !== 0) { if (s && Math.sign(cr) !== s) return false; s = Math.sign(cr); } } return true; };
  const span = P.sh === 'tri' ? TRI_R * 2 : GRID, n = Math.ceil(span / c);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const f = -span / 2 + (i + 0.5) * c, s = -span / 2 + (j + 0.5) * c, [dx, dy] = U(a, f, s), x = o.x + dx, y = o.y + dy;
    if (!inPoly(x, y)) continue;
    const r = Math.hypot(x, y); if (side > 0 ? r > CAMP_R - 1 : r < CAMP_R + 1) continue;
    K.add(P_BOX(), x, z + th / 2, y, c + 0.15, th, c + 0.15, col, -a);
  }
}
// a floor from an older save, laid across the fence before floors were trimmed: keep the side most of it sits on
function stClipOld(P, o) {
  if (P.lay !== 'floor') return 0;
  const rs = stCorners(o).map(([x, y]) => Math.hypot(x, y));
  if (Math.max(...rs) < CAMP_R - 2 || Math.min(...rs) > CAMP_R + 2) return 0;
  return Math.hypot(o.x, o.y) < CAMP_R ? 1 : -1;
}
