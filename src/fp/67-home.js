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
  if (NO_CAMP || P.lay !== 'floor') return 0;
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
// a floor from an older save, laid across the fence before floors were trimmed: it was meant for the camp, so it keeps the
// inside (Joe: keeping the side its middle was on came out backwards)
function stClipOld(P, o) {
  if (NO_CAMP || P.lay !== 'floor') return 0;
  const rs = stCorners(o).map(([x, y]) => Math.hypot(x, y));
  return Math.max(...rs) < CAMP_R - 2 || Math.min(...rs) > CAMP_R + 2 ? 0 : 1;
}

// ---- the harvest basket ----
// Joe enjoys building a base that keeps itself going. A harvest basket set down among your plots picks whatever ripens
// within reach, sows the same crop again straight away, and keeps the harvest for you to collect. It's a small chest
// underneath, so it opens like one and the crafting stations nearby can draw on it.
const BASKET_R = 130, BASKET_SLOTS = 9;
function basketStep() {
  const D = S.day; if (!D) return;
  if (!D.knownChk) {   // an older save: the basket's recipe shows up once you've seen what it takes
    D.knownChk = 1;
    for (const r of DREC) if (!D.known.has(r.id) && Object.keys(r.cost).every(k => D.seen.has(k))) { D.known.add(r.id); D.fresh.add(r.id); }
  }
  for (const K of D.builds) {
    if (!K.basket) continue;
    for (const B of D.builds) {
      if (B.t !== 'plot' || !B.grown || !B.crop || Math.hypot(B.x - K.x, B.y - K.y) > BASKET_R) continue;
      const n = (B.crop === 'mushroom' ? 4 : B.crop === 'fibre' ? 8 : 6) + Math.floor(Math.random() * 3);
      if (roomIn(K.inv, B.crop) < n) continue;   // full: it waits for you to empty it
      addTo(K.inv, B.crop, n); if (B.crop !== 'fibre') addTo(K.inv, 'fibre', 1);
      B.grown = false; B.sown = D.t;   // sown again, the same crop
      ashBurst(B.x, B.y, 4, 5);
      if (Math.hypot(S.p.x - B.x, S.p.y - B.y) < 400) exNote(`the basket picked · ${n} ${DIT[B.crop].n.toLowerCase()}`);
      dayChanged();
    }
  }
}

// ---- the rain barrel ----
// It fills slowly on its own and quickly in the rain. Use it to drink or fill your waterskins, and while it has water in
// it the plots around it stay watered and grow faster.
const RB_MAX = 10, RB_FILL = 1 / 45, RB_RAIN = 0.35, RB_GROW = 0.4, RB_THIRST = 0.004;
function rainbStep(dt) {
  const D = S.day;
  for (const R of D.builds) {
    if (R.t !== 'rainb') continue;
    R.w = Math.min(RB_MAX, (R.w || 0) + dt * (RB_FILL + RB_RAIN * wxK('rain')));
    for (const B of D.builds) {
      if (B.t !== 'plot' || !B.crop || B.grown || R.w <= 0.05 || Math.hypot(B.x - R.x, B.y - R.y) > BASKET_R) continue;
      B.sown -= dt * RB_GROW; R.w = Math.max(0, R.w - dt * RB_THIRST);   // watered: it comes on a little faster
    }
  }
}
function rainbUse(R) {   // the barrel's water is clean, so skins filled from it are too
  const D = S.day, skins = D.inv.filter(s => s && s.id === 'skin' && s.w < SKIN_SIPS);
  if ((R.w || 0) < 1) { dayNote('dry', 'the barrel is nearly dry · it fills in the rain', 2); return; }
  if (skins.length) { let n = 0; for (const s of skins) if (R.w >= 1) { R.w -= 1; s.w = SKIN_SIPS; s.dirty = 0; n++; } exNote(n > 1 ? `${n} waterskins filled` : 'waterskin filled'); sfx(0.7, 0.4, 'lowpass', 700, 0.3); }
  else if (D.water >= FOOD_MAX - 2) { dayNote('full', 'you\'re not thirsty', 1.5); return; }
  else { R.w -= 1; D.water = Math.min(FOOD_MAX, D.water + 40); dayAct(9, 1.1, '#8ab8e0', 'cup'); exNote('a drink'); sfx(0.8, 0.3, 'lowpass', 900, 0.25); }
  dayChanged();
}

// ---- the tarp water collector ----
// What you start with: a tarp stretched over four sticks catches a little rain and dew. About a day's drinking if it's all
// you have, never a store. The water is dirty: drunk straight it can make you sick, unless a campfire is close by to boil
// it over, and skins filled from it are murky until you boil them. The rain barrel is the clean, plentiful step up.
const TC_MAX = 3, TC_FILL = 1 / 60, TC_RAIN = 0.12, TC_BOIL_R = 120, START_WATER = 75;
function tcolStep(dt) {
  for (const T of S.day.builds) if (T.t === 'tcol') T.w = Math.min(TC_MAX, (T.w || 0) + dt * (TC_FILL + TC_RAIN * wxK('rain')));
}
function tcolUse(T) {
  const D = S.day, skins = D.inv.filter(s => s && s.id === 'skin' && s.w < SKIN_SIPS), boil = Math.hypot(EX_FIRE.x - T.x, EX_FIRE.y - T.y) < TC_BOIL_R || D.builds.some(B => B.t === 'fire' && Math.hypot(B.x - T.x, B.y - T.y) < TC_BOIL_R);
  if ((T.w || 0) < 1) { dayNote('dry', 'only a puddle in it · it fills slowly, faster in the rain', 2); return; }
  if (skins.length) { let n = 0; for (const s of skins) if (T.w >= 1) { T.w -= 1; s.w = SKIN_SIPS; s.dirty = boil ? 0 : 1; n++; } exNote((n > 1 ? `${n} waterskins filled` : 'waterskin filled') + (boil ? ' · boiled over the fire' : ' · murky, boil it')); sfx(0.7, 0.4, 'lowpass', 700, 0.3); }
  else if (D.water >= FOOD_MAX - 2) { dayNote('full', 'you\'re not thirsty', 1.5); return; }
  else {
    T.w -= 1; D.water = Math.min(FOOD_MAX, D.water + 35); dayAct(9, 1.1, '#8ab8e0', 'cup'); sfx(0.8, 0.3, 'lowpass', 900, 0.25);
    if (boil) exNote('boiled over the fire · a clean drink');
    else { exNote('a drink'); if (Math.random() < 0.35) { D.sick = 30; exNote('the water was bad', true); } }
  }
  dayChanged();
}

// ---- a run from when there was a camp ----
// Its camp box, water barrel and fire become things you built, where they stood, so nothing it had is lost.
function campToBuilds() {
  const D = S.day;
  if (D.box && D.box.some(Boolean)) { const B = dayMakeBuild('chest', -52, -50, 0); B.inv = D.box.slice(); D.box = Array(BOX_SLOTS).fill(null); }
  dayMakeBuild('rainb', 60, 56, 0).w = RB_MAX;
  for (const o of D.bld.values()) o.clip = 0;
  D.noCamp = 1;
}

// ---- home, now there's no camp: your bed, else the nearest fire (the fire pit, or one you built) ----
function homeSpot() {
  const D = S.day; if (!D) return null;
  if (D.bed) return D.bed;
  let best = EX_FIRE, bd = Math.hypot(EX_FIRE.x - S.p.x, EX_FIRE.y - S.p.y);   // the fire pit on the hill, or a nearer fire of yours
  for (const B of D.builds) if (B.t === 'fire') { const d = Math.hypot(B.x - S.p.x, B.y - S.p.y); if (d < bd) { bd = d; best = B; } }
  return best;
}
const HOME_R = 110;
const atHome = () => { const h = homeSpot(); return !!h && Math.hypot(h.x - S.p.x, h.y - S.p.y) < HOME_R; };

// ---- the smokehouse and the compost heap: two more chests that work by themselves ----
// The smokehouse takes raw meat or fish put in it and, a batch at a time, smokes it into dried meat that keeps.
// The compost heap eats scraps put in it, and while it has some the plots around it grow faster.
const SMOKE_T = 90, COMP_T = 75, COMP_GROW = 0.5;
const COMP_OK = new Set(['berries', 'mushroom', 'fibre', 'sticks', 'meat', 'fish', 'bone', 'cooked', 'jerky']);
const chestName = B => B.pen ? 'Deer pen' : B.basket ? 'Harvest basket' : B.smoke ? 'Smokehouse' : B.comp ? 'Compost heap' : 'Storage chest';
function workStep(dt) {
  const D = S.day;
  for (const H of D.builds) {
    if (H.smoke) {
      const raw = countIn(H.inv, 'meat') >= 2 ? 'meat' : countIn(H.inv, 'fish') >= 2 ? 'fish' : null;
      if (!raw) { H.cT = 0; continue; }
      H.cT = (H.cT || 0) + dt;
      if (Math.random() < dt * 3 && Math.hypot(S.p.x - H.x, S.p.y - H.y) < 700) { const [cx, cy] = U(H.a || 0, -7, -5); spark(H.x + cx, 26, H.y + cy, (Math.random() - 0.5) * 6, 9, (Math.random() - 0.5) * 6, 2.4, 9 + Math.random() * 5, 0.6, 0.6, 0.6, 0.3, 0, 3, 2); }
      if (H.cT < SMOKE_T) continue;
      takeFrom(H.inv, raw, 2);
      const left = addTo(H.inv, 'jerky', 3); if (left) addTo(H.inv, raw, 2);   // no room for it: put the meat back and wait
      H.cT = left ? SMOKE_T : 0;
      if (!left && Math.hypot(S.p.x - H.x, S.p.y - H.y) < 500) exNote('the smokehouse finished · 3 dried meat');
      dayChanged();
    } else if (H.comp) {
      const food = H.inv.findIndex(s => s && COMP_OK.has(s.id));
      if (food < 0) { H.cT = 0; continue; }
      for (const B of D.builds) if (B.t === 'plot' && B.crop && !B.grown && Math.hypot(B.x - H.x, B.y - H.y) <= BASKET_R) B.sown -= dt * COMP_GROW;
      if ((H.cT = (H.cT || 0) + dt) >= COMP_T) { H.cT = 0; const s = H.inv[food]; s.n--; if (!s.n) H.inv[food] = null; dayChanged(); }
    }
  }
}
