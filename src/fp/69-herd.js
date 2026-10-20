// ---------------- sealed caches, and the deer you can keep ----------------
// Joe: a few sealed things lie in the quieter woods near the fire pit, where you come on them in the first day or two:
// a stone cache in an old grove, a locked chest. You can't open them yet. What opens them (a pry bar, or a heavy
// sledgehammer; either will do) lies out in the dangerous outer woods. What's inside is rare and specific, never just
// materials: a herder's bell that lets you keep deer, sweetroot to grow, and a hearthstone whose light keeps the dark out.
//
// The bell: hold it and ring it, and the wild deer near you come and follow you. Lead them into a pen and they stay,
// breed slowly, and leave a steady trickle of meat in the pen's trough, so you no longer have to hunt, dry and hunt again.
// At night a shade comes for a pen that has nothing guarding it, and takes a deer unless you're there to fight it.

Object.assign(DIT, {
  prybar: { n: 'Rusty pry bar', c: '#8a6a52', st: 1, k: 'mat', b: 'Opens a sealed cache · it doesn\'t get used up' },
  sledge: { n: 'Old sledgehammer', c: '#7a7c80', st: 1, k: 'mat', b: 'Opens a sealed cache · it doesn\'t get used up' },
  hbell: { n: 'Herder\'s bell', c: '#c8a050', st: 1, k: 'tool', tool: 'bell', b: 'Ring it and wild deer come and follow you · lead them into a pen' },
  sweetroot: { n: 'Sweetroot', c: '#c8784a', st: 12, k: 'food', b: 'Sweet and filling raw · plant it in a plot and it multiplies', eat: { food: 16, water: 4 } },
  hearth: { n: 'Hearthstone', c: '#e0904a', st: 1, k: 'place', build: 'hearth', b: 'An old warm stone · set it down and its glow keeps the dark out, like the fire pit\'s' },
  pen: { n: 'Deer pen', c: '#7a5a3a', st: 1, k: 'place', build: 'pen', b: 'Lead deer in with the bell · they breed and leave meat in the trough' },
});
DREC.push({ id: 'pen', g: 'stn', out: 'pen', at: 'hand', need: 'hbell', cost: { sticks: 12, rope: 2 } });
Object.assign(ICON, {
  prybar: '<path d="M5 20.5L17.5 5" stroke="#8a6a52" stroke-width="2.6" stroke-linecap="round"/><path d="M17.5 5c1.6-.8 3.2-.2 3.6 1.2" stroke="#8a6a52" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M4 21.5l2.5-1" stroke="#5a4232" stroke-width="2.2" stroke-linecap="round"/>',
  sledge: '<path d="M6 21l9-10" stroke="#7a5a3a" stroke-width="2.4" stroke-linecap="round"/><path d="M11.5 6.5l6-4 4.5 5-4 6z" fill="#7a7c80"/><path d="M12.5 7.2l7 8" stroke="#55575a" stroke-width="1.2"/>',
  hbell: '<path d="M12 3.5a1.5 1.5 0 0 1 1.5 1.5c3.5 1 5 4 5 8.5l1.5 3h-16l1.5-3c0-4.5 1.5-7.5 5-8.5A1.5 1.5 0 0 1 12 3.5z" fill="#c8a050"/><circle cx="12" cy="18.6" r="1.8" fill="#8a6a30"/><path d="M8.5 9.5c.4-1.4 1.2-2.2 2.2-2.6" stroke="#f0d890" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
  sweetroot: '<path d="M12 9c3.5 0 5 3 4 6.5S13 21.5 12 21.5 9 19 8 15.5 8.5 9 12 9z" fill="#c8784a"/><path d="M10 13.5h2.5M10.5 16.5h3" stroke="#9a5232" stroke-width="1.1"/><path d="M12 9c-1-2.5-3.5-4-5-4 .5 2 2 3.5 5 4zm0 0c1-3 3-5 5-5.5-.3 2.3-2 4.3-5 5.5z" fill="#6a9a3a"/>',
  hearth: '<path d="M5 18c-.5-4 2-8 7-8s7.5 4 7 8c-2 2-12 2-14 0z" fill="#7a7872"/><path d="M8.5 15.5c1-2.5 2-4 3.5-4s2.5 1.5 3.5 4" stroke="#ffb050" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="12" cy="7" r="2.6" fill="#ffd27a" opacity=".8"/>',
  pen: '<g stroke="#7a5a3a" stroke-width="1.8" stroke-linecap="round"><path d="M4 8v13M12 6v15M20 8v13"/><path d="M3 11.5h18M3 16.5h18"/></g>',
});

// ---- where the caches and the tools that open them lie ----
// The places with a story (00-areas) nearest the fire hold the caches; the next ones out, past the edge of the safe
// woods, hold the tools. Worked out from the map itself, so every run finds them in the same places.
const CACHE_REWARDS = ['hbell', 'sweetroot', 'hearth'], CACHE_KIND = ['stone', 'chest', 'stone'];
function marksByDist(lo, hi) {
  const out = [];
  for (const M of AREA.marks) for (const ox of [-AREA_P, 0]) for (const oy of [-AREA_P, 0]) {
    const x = M.x + ox, y = M.y + oy, d = Math.hypot(x, y);
    if (d >= lo && d <= hi) out.push({ t: M.t, x, y, d, r: M.r });
  }
  return out.sort((a, b) => a.d - b.d);
}
function clearSpot(x, y) {   // walk in towards the fire until nothing stands there
  for (let k = 0; k < 8; k++) {
    if (!propsNear(x, y, 40).some(o => (o.kind === 'tree' || o.kind === 'rock') && Math.hypot(o.x - x, o.y - y) < 30)) return { x, y };
    const d = Math.hypot(x, y) || 1; x -= x / d * 25; y -= y / d * 25;
  }
  return { x, y };
}
function cacheSeed() {
  const D = S.day; if (D.cacheV) return;
  const near = marksByDist(900, 2600), far = marksByDist(2700, 5200);
  CACHE_REWARDS.forEach((rw, i) => {
    const M = near[i] || { x: Math.cos(i * 2.1 + 0.4) * 1400, y: Math.sin(i * 2.1 + 0.4) * 1400, r: 0 }, d = Math.hypot(M.x, M.y) || 1;
    const at = clearSpot(M.x - M.x / d * Math.min(60, M.r * 0.4), M.y - M.y / d * Math.min(60, M.r * 0.4));
    const B = dayMakeBuild('cache', at.x, at.y, Math.atan2(-at.y, -at.x)); B.ck = CACHE_KIND[i]; B.rw = rw;
  });
  ['prybar', 'sledge'].forEach((id, i) => {
    const M = far[i] || { x: Math.cos(i * 3 + 1) * 3400, y: Math.sin(i * 3 + 1) * 3400 }, at = clearSpot(M.x, M.y);
    const f = dayDrop(at.x, at.y, id, 1); f.keep = 1;
  });
  D.cacheV = 1;
}

// ---- opening one ----
const cacheTool = () => ['prybar', 'sledge'].find(id => dayHave(id) > 0);
const cacheLabel = B => B.open ? 'Empty' : cacheTool() ? 'Open' : 'Sealed';
function cacheUse(B) {
  if (B.open) { dayNote('cacheE', 'empty now', 2); return; }
  const T = cacheTool();
  if (!T) { dayNote('cacheS', B.ck === 'chest' ? 'locked fast · a pry bar or a heavy hammer would open it · try the outer woods' : 'the lid won\'t shift · a pry bar or a heavy hammer would do it · try the outer woods', 3); snd('latch') || sfx(0.5, 0.2, 'lowpass', 300, 0.2); return; }
  B.open = 1; dayAct(14, 0.9); addShake(0.25);
  if (actx) { const t = actx.currentTime; if (!snd('chest_open', { x: B.x, y: B.y, v: 1.2 })) noiseAt(t, 700, 200, 0.4, 0.4, sfxGain); [392, 523, 659, 784].forEach((f, i) => toneAt(t + 0.25 + i * 0.09, f, 0.7, 0.04, 'triangle', sfxGain)); }
  const n = B.rw === 'sweetroot' ? 4 : 1; dayGive(B.rw, n, B.x, B.y, true);
  if (B.rw === 'hbell') S.day.herd = 1;
  S.rg.ringMsg = { text: DIT[B.rw].n.toLowerCase(), sub: DIT[B.rw].b.replace(/^An old warm stone · /, ''), t: 0 }; playRingSting();
  wpRing(B.x, B.y, 60, '255,210,120', 0.8); wpEmbers(B.x, B.y, 16, 22, '255,210,120'); dayJLog(`opened a ${B.ck === 'chest' ? 'locked chest' : 'stone cache'} · ${DIT[B.rw].n}`);
  dayChanged();
}

// ---- the hearthstone: a safe ring of your own ----
function hearthAt(x, y, pad) { const D = S && S.day; if (!D) return null; for (const B of D.builds) if (B.t === 'hearth' && Math.hypot(x - B.x, y - B.y) < PIT_R + pad) return { x: B.x, y: B.y, r: PIT_R }; return null; }

// ---- the herd ----
const HERD_R = 320, LEAD_T = 90, PEN_R = 62, PEN_CAP = 6, PEN_BREED = 240, PEN_MEAT = 150, PEN_SLOTS = 6;
const penOf = b => b.pen && S.day.builds.find(B => B.pen && Math.abs(B.x - b.pen[0]) < 1 && Math.abs(B.y - b.pen[1]) < 1);
function herdRing() {
  const D = S.day, p = S.p; dayAct(8, 0.6);
  if (actx && !snd('bell', { far: 1400 })) { const t = actx.currentTime; [1318, 1568, 1318].forEach((f, i) => toneAt(t + i * 0.16, f, 0.9, 0.05, 'triangle', sfxGain)); }
  wpRing(p.x, p.y, HERD_R, '240,215,150', 0.5);
  let n = 0;
  for (const b of D.beasts) if (!b.dead && b.k === 'deer' && !b.pen && Math.hypot(b.x - p.x, b.y - p.y) < HERD_R) { b.lead = LEAD_T; b.st = 'graze'; n++; }
  exNote(n ? `${n} deer come to the bell` : 'no deer near enough to hear it');
}
function herdStep(b, dt, d, dx, dy) {   // a deer following you, or living in a pen
  const B = BEAST[b.k];
  if (b.pen) {
    const P = penOf(b); if (!P) { b.pen = null; return; }
    const pd = Math.hypot(b.x - P.x, b.y - P.y);
    if (pd > PEN_R - 8) { b.dir = Math.atan2(P.y - b.y, P.x - b.x); b.sp = 16; }
    else if (b.t <= 0) { b.t = 2 + Math.random() * 3; b.dir = Math.random() * 7; b.sp = Math.random() < 0.6 ? 0 : 10; }
    return;
  }
  b.lead -= dt;
  for (const P of S.day.builds) if (P.pen && Math.hypot(b.x - P.x, b.y - P.y) < PEN_R - 6 && S.day.beasts.filter(o => o.pen && o.pen[0] === P.x && o.pen[1] === P.y && !o.dead).length < PEN_CAP) {
    b.pen = [P.x, P.y]; b.lead = 0; b.st = 'graze'; exNote('a deer settles in the pen'); dayChanged(); return;
  }
  if (b.lead <= 0) { b.lead = 0; return; }
  b.dir = Math.atan2(-dy, -dx); b.sp = d > 160 ? B.sp * 0.55 : d > 55 ? 48 : 0;   // keeps a few steps behind you
}
function penStep(dt) {
  const D = S.day;
  for (const P of D.builds) {
    if (!P.pen) continue;
    const herd = D.beasts.filter(b => !b.dead && b.pen && b.pen[0] === P.x && b.pen[1] === P.y);
    if (herd.length >= 2 && herd.length < PEN_CAP && (P.bT = (P.bT || 0) + dt) >= PEN_BREED) {   // a fawn
      P.bT = 0; D.beasts.push({ kind: 'beast', k: 'deer', chunk: 'pen', x: P.x + (Math.random() - 0.5) * 30, y: P.y + (Math.random() - 0.5) * 30, r: 0, s: 1, hp: BEAST.deer.hp, st: 'graze', t: 1, dir: Math.random() * 7, sp: 0, ph: Math.random() * 9, flash: 0, pen: [P.x, P.y] });
      if (Math.hypot(S.p.x - P.x, S.p.y - P.y) < 700) exNote('a fawn is born in the pen', true);
    }
    if (herd.length && (P.cT = (P.cT || 0) + dt * Math.max(1, herd.length / 2)) >= PEN_MEAT) {   // meat in the trough
      P.cT = 0; if (!addTo(P.inv, 'meat', 1)) dayChanged();
    }
    // the dark comes for a pen with nothing guarding it
    if (!NIGHT_FOES || !dayNight() || !herd.length || penSafe(P)) { P.raid = 0; continue; }
    if (!P.raid) { P.raid = 1; P.rT = 20 + Math.random() * 60; }
    if (P.raid === 1 && (P.rT -= dt) <= 0) {
      P.raid = 2;
      for (let k = 0; k < 1; k++) { const a = Math.random() * 6.283;   // one comes, takes one deer and is gone
        spawnFoe('stalker', { x: P.x + Math.cos(a) * 260, y: P.y + Math.sin(a) * 260, d: 260 }); S.rg.enemies[S.rg.enemies.length - 1].penT = [P.x, P.y]; }
      if (Math.hypot(S.p.x - P.x, S.p.y - P.y) < 900) S.rg.ringMsg = { text: 'the pen', sub: 'Something is coming for your deer', t: 0 };
      else exNote('something is after your deer', true);
    }
  }
  for (const e of S.rg.enemies) {   // with you far off, they go for the deer instead
    if (!e.penT || e.dead || Math.hypot(e.x - S.p.x, e.y - S.p.y) < 300) continue;
    let tgt = null, bd = 1e9; for (const b of D.beasts) if (!b.dead && b.pen && b.pen[0] === e.penT[0] && b.pen[1] === e.penT[1]) { const dd = dist2(b, e); if (dd < bd) { bd = dd; tgt = b; } }
    if (!tgt) { e.penT = null; continue; }
    const a = Math.atan2(tgt.y - e.y, tgt.x - e.x); e.x += Math.cos(a) * 60 * dt; e.y += Math.sin(a) * 60 * dt;
    if (bd < 16) { tgt.hp = 0; beastDie(tgt); exNote('a deer was taken from your pen', true); e.dead = e.gone = true; ashBurst(e.x, e.y, 10, 20); }
  }
}
function penSafe(P) {   // firelight, a hearthstone, a lit torch post, or a ring of your own walls round it
  if (exSafeAt(P.x, P.y, PEN_R)) return true;
  if (S.day.builds.some(B => B.t === 'tpost' && B.fuel > 0 && Math.hypot(B.x - P.x, B.y - P.y) < 150)) return true;
  return stNear(P.x, P.y, PEN_R + 50).filter(o => o.done && PC(o.id).lay === 'edge').length >= 6;
}
