// ================= snares and fish traps: traps that hunt for you while you're away (Joe's number 7) =================
// A snare is a bent sapling, a trigger peg and a noose on a cord. Set it out in the woods, away from your camp, and now and
// then a rabbit or a grouse runs into it: come back and it's hanging there for you to take. Bait it with berries and it
// catches twice as often; hang about right next to it and nothing comes.
// A fish trap is a woven cone of sticks staked into shallow water, at a pond or the edge of the sea. Fish swim in and can't
// find the way out; up to three at a time. Bait it with raw meat (or fish) and they come quicker.
// Both are chests that work by themselves, like the smokehouse: open one with E to take what's in it, or put the bait in.
Object.assign(DIT, {
  snare: { n: 'Snare', c: '#a08a5a', st: 4, k: 'place', build: 'snare', b: 'Set it in the woods, away from camp · rabbits and grouse get caught in it · bait it with berries' },
  ftrap: { n: 'Fish trap', c: '#b08a52', st: 2, k: 'place', build: 'ftrap', b: 'Set it in shallow water · fish swim in and can\'t get out · bait it with raw meat' },
});
DREC.push(
  { id: 'snare', g: 'build', out: 'snare', n: 2, at: 'hand', cost: { sticks: 3, rope: 1 } },
  { id: 'ftrap', g: 'build', out: 'ftrap', at: 'bench', cost: { sticks: 10, rope: 2, fibre: 4 } },
);
Object.assign(ICON, {
  snare: '<path d="M5 21.5c-.5-7 1-12.5 6-16" stroke="#8a6a44" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M11 5.5L15 15" stroke="#c8b07a" stroke-width="1"/><circle cx="16" cy="17.5" r="3.4" stroke="#c8b07a" stroke-width="1.3" fill="none"/><path d="M12.5 21.5v-4.5M19.5 21.5v-4.5" stroke="#6e5235" stroke-width="1.6" stroke-linecap="round"/>',
  ftrap: '<path d="M3 8.5l15 2.8v4.4L3 18.5z" fill="#b08a52"/><path d="M18 11.3c2.4.3 3.4 1.2 3.4 2.2s-1 1.9-3.4 2.2z" fill="#8a6a3c"/><g stroke="#7a5a32" stroke-width=".9"><path d="M7 9.3v8.4M11 10v7M15 10.8v5.6M3 13.5h15"/></g><path d="M1.5 20.5c3-1.2 6-1.2 9 0s6 1.2 9 0" stroke="#6eaae6" stroke-width="1.2" fill="none"/>',
});
const TRAP = { snareT: 230, fishT: 160, near: 160, camp: 260, fishMax: 3, rot: DAY_LEN * 1.25 };
const SNARE_BAIT = new Set(['berries', 'sweetroot']), FISH_BAIT = new Set(['meat', 'fish']);
const isTrap = B => !!(B && (B.snare || B.ftrap));

// ---------------- making one, putting one down ----------------
{ const mb = dayMakeBuild; dayMakeBuild = function (t, cx, cy, a, fake) {
    if (t !== 'snare' && t !== 'ftrap') return mb(t, cx, cy, a, fake);
    const B = mb('chest', cx, cy, a, fake);
    B[t] = 1; B.inv = Array(4).fill(null); B.tT = B.tT || Math.random() * 30;
    for (const q of B.parts) q.r = t === 'snare' ? 5 : 8;
    return B;
  }; }
const trapWet = (x, y) => { const W = fishWater(x, y); return W && W.depth < 16 ? W : null; };
{ const ps = dayPlaceSpot; dayPlaceSpot = function (t) {
    const D = S.day, mv = D && D.mv && D.mv.kind === 'b' ? D.mv.B : null;   // carrying one you're moving: it goes back in the water, or on dry land
    const kind = t === 'ftrap' || (mv && mv.ftrap && t === 'chest') ? 'ftrap' : t === 'snare' || (mv && mv.snare && t === 'chest') ? 'snare' : null;
    const sp = ps(t);
    if (kind === 'ftrap') sp.ok = sp.ok && !!trapWet(sp.x, sp.y);
    else if (kind === 'snare') sp.ok = sp.ok && !fishWater(sp.x, sp.y);
    return sp;
  }; }
{ const ph = dayPlaceHeld; dayPlaceHeld = function () {
    const s = heldSlot(), T = s && DIT[s.id];
    if (T && T.build === 'ftrap') { const sp = dayPlaceSpot('ftrap'); if (!sp.ok && !trapWet(sp.x, sp.y)) { dayNote('noroom', 'set it down in shallow water', 1.4); if (actx) noiseAt(actx.currentTime, 600, 300, 0.1, 0.25, sfxGain); return; } }
    return ph();
  }; }
// moving one keeps it what it is, and its ghost shows it; recycling one gives you the trap back, not a chest
{ const mp = mvPut; mvPut = function (back) {
    const M = S.day && S.day.mv, B = M && M.kind === 'b' ? M.B : null; mp(back);
    if (isTrap(B)) for (const q of B.parts) q.r = B.snare ? 5 : 8;
  }; }
{ const dg = dayGhost; dayGhost = function () {
    const g = dg(), M = S.day && S.day.mv;
    if (g && M && M.kind === 'b' && isTrap(M.B)) g.build = M.B.snare ? 'snare' : 'ftrap';
    return g;
  }; }
{ const rc = mvRecycle; mvRecycle = function (B) {
    if (!isTrap(B)) return rc(B);
    const D = S.day, id = B.snare ? 'snare' : 'ftrap';
    for (const s of B.inv) if (s) dayDrop(B.x, B.y, s.id, s.n || 1, s);
    D.builds = D.builds.filter(q => q !== B); dayGive(id, 1, B.x, B.y, true);
    ashBurst(B.x, B.y, 6, 10); addShake(0.12); exNote(`recycled · ${DIT[id].n.toLowerCase()} back in your pack`);
    if (actx) noiseAt(actx.currentTime, 700, 200, 0.3, 0.35, sfxGain);
    try { thingsSync(true); } catch (e) {}
    dayChanged();
  }; }
{ const oc = openCraft; openCraft = function (t) {
    if (t && t.snare && t.robbed) { t.robbed = 0; exNote('a fox got to your snare first · only scraps left', true); }
    return oc.apply(this, arguments);
  }; }
// opened with E, it's named for what it is
{ const dc = dayConts; dayConts = function (R) {
    return dc(R).filter(c => !(c.far && isTrap(c.B))).map(c => isTrap(c.B) ? Object.assign(c, { name: c.B.snare ? 'Snare' : 'Fish trap' }) : c);
  }; }

// ---------------- the catch ----------------
function trapStep(dt) {
  const D = S.day, p = S.p;
  for (const B of D.builds) {
    if (!isTrap(B)) continue;
    const d = Math.hypot(p.x - B.x, p.y - B.y);
    if (B.snare) {
      if (B.got && !B.inv.some(s => s && (s.id === 'meat' || s.id === 'hide' || s.id === 'feather'))) B.got = null;   // you've taken it out
      if (B.got && (B.gotT = (B.gotT || 0) + dt) > TRAP.rot && d > 300) {   // left too long: a fox gets to it first, and leaves you the scraps
        const i = B.inv.findIndex(s => s && s.id === 'meat'); if (i >= 0) B.inv[i] = null;
        B.got = null; B.gotT = 0; B.robbed = 1; dayChanged();
      }
      if (B.got) continue;
      const bait = B.inv.findIndex(s => s && SNARE_BAIT.has(s.id));
      const camp = D.builds.some(o => (o.t === 'fire' || STN_N[o.t]) && Math.hypot(o.x - B.x, o.y - B.y) < TRAP.camp);
      const k = (bait >= 0 ? 2 : 1) * (d < TRAP.near ? 0.15 : 1) * (camp ? 0.35 : 1) * (caveIn() ? 0 : 1);
      if ((B.tT = (B.tT || 0) + dt * k) < TRAP.snareT) continue;
      B.tT = Math.random() * 25;
      const bird = Math.random() < 0.38, got = bird ? { meat: 1, feather: 2 } : Math.random() < 0.4 ? { meat: 1, hide: 1 } : { meat: 1 };
      if (Object.entries(got).some(([id, n]) => addTo(B.inv, id, n))) { B.tT = TRAP.snareT; continue; }   // no room in it: it waits
      B.got = bird ? 'grouse' : 'rabbit'; B.gotT = 0; B.robbed = 0;
      if (bait >= 0) { const s = B.inv[bait]; s.n--; if (!s.n) B.inv[bait] = null; }
      dayKillLog(B.got);
      if (d < 900) exNote(`something is caught in your snare`, true);
      dayChanged();
    } else {
      const fish = countIn(B.inv, 'fish');
      if (fish >= TRAP.fishMax) continue;
      const bait = B.inv.findIndex(s => s && FISH_BAIT.has(s.id) && !(s.id === 'fish' && fish > 0));
      const k = (bait >= 0 ? 1.8 : 1) * (d < 60 ? 0.3 : 1);
      if ((B.tT = (B.tT || 0) + dt * k) < TRAP.fishT) continue;
      B.tT = Math.random() * 20;
      if (addTo(B.inv, 'fish', 1)) { B.tT = TRAP.fishT; continue; }
      if (bait >= 0 && B.inv[bait] && B.inv[bait].id === 'meat') { const s = B.inv[bait]; s.n--; if (!s.n) B.inv[bait] = null; }
      if (d < 500) exNote('a fish in your trap', false);
      dayChanged();
    }
  }
}
{ const ws = workStep; workStep = function (dt) { ws(dt); if (S.day) trapStep(dt); }; }
// a trap redraws when what's in it changes
let trapKey = '';
{ const ts = thingsSync; thingsSync = function (force) {
    const D = S.day;
    if (D) { const k = D.builds.filter(isTrap).map(B => (B.got || '') + countIn(B.inv, 'fish') + (B.inv.some(s => s && (SNARE_BAIT.has(s.id) || FISH_BAIT.has(s.id))) ? 'b' : '')).join(); if (k !== trapKey) { trapKey = k; force = true; } }
    return ts(force);
  }; }

// ---------------- saving: which chests are traps ----------------
{ const sv = daySave; daySave = function () {
    const r = sv.apply(this, arguments);
    try {
      const D = S && S.day, M = D && D.mv, all = D ? D.builds.concat(M && M.kind === 'b' ? [M.B] : []).filter(isTrap) : [];   // one you're carrying is saved where it came from
      if (!all.length || ARENA) return r;
      const k = dayKey(), raw = localStorage.getItem(k); if (!raw) return r;
      const o = JSON.parse(raw); if (!o || !o.d || !o.d.builds) return r;
      for (const B of all) { const q = o.d.builds.find(q => q.t === 'chest' && !q.trap && q.x === B.x && q.y === B.y); if (q) { q.trap = B.snare ? 'snare' : 'ftrap'; q.tT = B.tT; q.got = B.got; q.gotT = B.gotT; } }
      localStorage.setItem(k, JSON.stringify(o));
    } catch (e) {}
    return r;
  }; }
{ const dl = dayLoad; dayLoad = function (sv) {
    const traps = [];
    if (sv && sv.d && sv.d.builds) for (const q of sv.d.builds) if (q.trap) { traps.push(q); q.t = q.trap; }
    const r = dl.apply(this, arguments);
    for (const q of traps) { const B = S.day.builds.find(o => isTrap(o) && o.x === q.x && o.y === q.y); if (B) { if (q.tT !== undefined) B.tT = q.tT; if (q.got) { B.got = q.got; B.gotT = q.gotT || 0; } } }
    return r;
  }; }

// ---------------- what they look like ----------------
{ const bk = buildKit; buildKit = function (K, o) {
    const B = o.build || o;
    if (o.sub !== 'chest' || !isTrap(B)) return bk(K, o);
    const a = B.a || 0, x = o.x, y = o.y, at = (f, s) => { const [dx, dy] = U(a, f, s); return [x + dx, y + dy]; };
    const rod = (f0, s0, h0, f1, s1, h1, r, col) => { const [ax, ay] = at(f0, s0), [bx, by] = at(f1, s1); K.rod(P_CYL(5), ax, h0, ay, bx, h1, by, r, col); };
    const ball = (f, s, h, sx, sy, sz, col, pitch = 0, roll = 0) => { const [px, py] = at(f, s); K.add(P_BALL(), px, h, py, sx, sy, sz, col, -a, pitch, roll); };
    const bend = (pts, r0, r1, col) => { for (let i = 0; i < pts.length - 1; i++) rod(...pts[i], ...pts[i + 1], lerp(r0, r1, i / (pts.length - 2)), col); };
    const wood = hex('#7a5a3a'), dk = hex('#5a4028'), cord = hex('#d8c08a'), leaf = hex('#5e7a3a');
    if (B.snare) {
      const caught = B.got;
      K.mt = 'wood';
      for (const s of [-2.6, 2.6]) rod(3, s, -0.5, 3, s, 5.6, 0.55, dk);   // the two trigger pegs, driven in
      if (!caught) {
        // set: the sapling bent right over and held down by the cord on the trigger bar; the noose hangs open across the run
        const tip = [0.5, 0, 17.5];
        bend([[-11, 0, 0], [-10.6, 0, 7], [-9, 0, 12.6], [-5.6, 0, 16.4], tip], 0.8, 0.35, wood);
        rod(3, -2.8, 5, 3, 2.8, 5, 0.4, wood);
        K.mt = 'cloth'; rod(...tip, 3, 0, 5.2, 0.17, cord);
        for (let i = 0; i < 12; i++) { const t0 = i / 12 * 6.283, t1 = (i + 1) / 12 * 6.283; rod(5.6, Math.cos(t0) * 3, 5.6 + Math.sin(t0) * 3.4, 5.6, Math.cos(t1) * 3, 5.6 + Math.sin(t1) * 3.4, 0.15, cord); }
        rod(3, 0, 5, 5.6, 0, 9, 0.15, cord);
        K.mt = null;
        ball(...tip.slice(0, 2), tip[2] + 1, 4.5, 3, 4, leaf); ball(-4, 1.2, 16.8, 3.6, 2.6, 3.4, leaf);
        if (B.inv.some(s => s && SNARE_BAIT.has(s.id))) for (let i = 0; i < 5; i++) ball(6.8 + (i % 2) * 1.4, -1.6 + i * 0.8, 0.7, 1.4, 1.3, 1.4, hex('#c23a4a'));
      } else {
        // sprung: the sapling has whipped back up, and what it caught hangs off the ground by the neck
        const tip = [-4, 0, 31], nk = [-2.6, 0, 20];
        bend([[-11, 0, 0], [-10.7, 0, 10], [-9.4, 0, 19], [-7.2, 0, 26], tip], 0.8, 0.35, wood);
        rod(3, -2.6, 0.6, 5, 1.2, 0.4, 0.4, wood);   // the trigger bar knocked aside
        K.mt = 'cloth'; rod(...tip, ...nk, 0.17, cord); K.mt = null;
        ball(tip[0] + 0.6, 0, tip[2] + 1, 5, 3.4, 4.6, leaf); ball(-8.4, 1.4, 25, 3.8, 2.8, 3.6, leaf);
        if (caught === 'rabbit') {
          const fur = hex('#93745a'), pale = hex('#e6dccb'), dkf = hex('#6e5640');
          ball(nk[0], 0, 17.6, 4.4, 4.2, 4, fur);                                   // head
          for (const s of [-1, 1]) ball(nk[0] - 0.6, s * 1.1, 22.4, 1.6, 6.2, 1.1, s > 0 ? fur : dkf, s * 0.22);   // the long ears, laid back up the cord
          ball(nk[0] + 1.8, 0, 17, 1.5, 1.3, 1.5, hex('#3a2c22'));                  // nose
          for (const s of [-1, 1]) ball(nk[0] + 1, s * 1.7, 18.2, 0.9, 0.9, 0.9, hex('#1a1612'));   // eyes, shut
          ball(nk[0], 0, 11, 5.4, 9.6, 5.8, fur); ball(nk[0] + 1.6, 0, 11.4, 2.6, 7.4, 4.2, pale);   // body, hanging straight, the pale belly
          for (const s of [-1, 1]) ball(nk[0] + 1.4, s * 1.3, 14.2, 1.4, 3.8, 1.6, fur);   // forepaws hanging
          for (const s of [-1, 1]) { ball(nk[0] - 0.4, s * 1.8, 6.2, 2.4, 5.2, 2.6, fur); ball(nk[0] + 0.6, s * 1.8, 3.4, 3.4, 1.4, 1.8, dkf); }   // hind legs, feet
          ball(nk[0] - 2.8, 0, 7.4, 2.4, 2.4, 2.4, pale);   // the tail
        } else if (caught === 'grouse') {
          const br = hex('#9a7650'), dkb = hex('#684c34'), pale = hex('#d6c29e');
          ball(nk[0], 0, 18, 3, 3.2, 3, br); ball(nk[0] + 1.8, 0, 17.6, 1.6, 0.9, 1, hex('#3e2e20'));   // head, beak
          ball(nk[0] + 0.4, 0, 19.4, 1.4, 0.9, 2.4, hex('#c0402c'));   // the red over its eye
          ball(nk[0], 0, 11.4, 6.6, 10, 6.4, br); ball(nk[0] + 1.6, 0, 11.6, 3, 7, 4.4, pale);
          for (const s of [-1, 1]) ball(nk[0] - 0.6, s * 3.8, 10.6, 3.6, 9.4, 1, dkb, s * 0.35);   // wings fallen open
          ball(nk[0] - 0.6, 0, 4.6, 1.4, 5, 6.4, dkb);   // the tail fanned under it
          for (const s of [-1, 1]) rod(nk[0] + 0.6, s * 1.2, 7.4, nk[0] + 1, s * 1.4, 4.4, 0.35, hex('#a89a7a'));
        }
      }
    } else {
      // a long woven cone of sticks staked into the bed of the shallows, its open mouth upstream; fish showing through the weave
      const W = trapWet(x, y), dep = W ? Math.min(7, W.depth) : 0, hc = Math.max(3.2, dep - 0.6), wv = hex('#b08a52'), wd = hex('#7e5e36');
      K.mt = 'wood';
      for (let i = 0; i < 10; i++) {   // the ribs along it, from the wide mouth to the tied-off tail
        const t = i / 10 * 6.283, c = Math.cos(t), s = Math.sin(t);
        rod(-11, c * 5.6, hc + s * 5, 10, c * 1.1, hc + s * 1, 0.32, i % 2 ? wv : wd);
      }
      for (const f of [-10.5, -6, -1.5, 3, 7.5]) { const R = lerp(5.6, 1.1, (f + 11) / 21); for (let i = 0; i < 14; i++) { const t0 = i / 14 * 6.283, t1 = (i + 1) / 14 * 6.283; rod(f, Math.cos(t0) * R, hc + Math.sin(t0) * R * 0.9, f, Math.cos(t1) * R, hc + Math.sin(t1) * R * 0.9, 0.34, f === -10.5 ? wd : wv); } }
      rod(10, 0, hc, 12.6, 0, hc + 0.4, 0.7, wd);   // the tail tied off
      for (const [f, s] of [[-8, -7.4], [-8, 7.4], [6, -4], [6, 4]]) rod(f, s, -1, f, s + (s > 0 ? 0.6 : -0.6), dep + 7, 0.62, hex('#5a4028'));   // stakes driven into the bed
      K.mt = 'cloth'; for (const [f, s] of [[-8, -7.4], [-8, 7.4], [6, -4], [6, 4]]) rod(f, s, dep + 5, f * 0.92, s * 0.62, hc + 2, 0.15, cord); K.mt = null;
      const n = countIn(B.inv, 'fish');
      for (let i = 0; i < n; i++) { const f = -4 + i * 4.2, s = (i % 2 ? 1 : -1) * 1.3, h = hc - 0.6 + i * 0.5; ball(f, s, h, 6.8, 2.6, 2.2, hex('#a4c0c6'), 0, 0.2); ball(f, s, h + 0.8, 5.6, 1, 1.4, hex('#5e7e86')); ball(f - 3.6, s, h, 1.6, 2.6, 0.6, hex('#6a8a94')); }
      if (B.inv.some(s => s && s.id === 'meat')) ball(2, 0, hc - 1.6, 2.8, 1.8, 2.2, hex('#b04a3a'));
    }
  }; }

// ---------------- what it says when you're at one, or carrying one ----------------
{ const pk = mvPick; mvPick = function (t) {
    pk(t);
    if (t && t.kind === 'b' && isTrap(t.B)) { const n = S.rg.notes[S.rg.notes.length - 1]; if (n && n.text.startsWith('moving · ')) n.text = `moving · ${t.B.snare ? 'snare' : 'fish trap'} · Attack to put it down`; }
  }; }
{ const dh = drawHud; drawHud = function (...a) {
    const r = dh.apply(this, a), D = S && S.day;
    if (D && D.builds.some(isTrap)) {
      const o = dayUseTarget();
      if (isTrap(o)) {
        const n = countIn(o.inv, 'fish'), t = (inputMode === 'kb' ? 'E · ' : inputMode === 'pad' ? 'X · ' : '') + (o.snare ? (o.got ? `TAKE THE ${o.got.toUpperCase()}` : 'CHECK SNARE') : n ? `EMPTY FISH TRAP · ${n} FISH` : 'CHECK FISH TRAP');
        if (hudEl.prompt.textContent !== t) hudEl.prompt.textContent = t;
      }
    }
    return r;
  }; }
