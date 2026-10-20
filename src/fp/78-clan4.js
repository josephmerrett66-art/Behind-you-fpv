// ================= the clan, over the days: stalked first, signs left behind, a little worse each day, drums at night =================
// (Joe) A visit no longer starts on top of you. For the best part of a minute they keep out in the trees, each working its own way round you: a twig going,
// feet in the leaves off to one side, a shape slipping between trunks that's gone when you look. Then the call, the answer, and
// they come in. When they've gone they leave something behind: tracks in the mud round your camp, a bone marker at its edge, and
// later on a chest with something missing. On the first day it's only one, a scout, that watches and goes. The second day two
// come; from the third whole bands, and from the fourth they go for your things while you're out. At night they don't come, but
// you hear their drums from their camp, and see their fire glowing off in the trees.
const STALK = { t: [40, 70], r0: 430, r1: 270 };   // how long, how far out (at the start and at the end)
const SIGNS = { gap: 30, cap: 300, keep: 2, marks: 5 };       // a print each 30 of ground walked; up to 300 kept two days; five markers
const signs = () => { const D = S.day; return D.clanSigns || (D.clanSigns = { prints: [], marks: [], stolen: null }); };

// ---- arriving: quietly now ----
clanArrive = function (C, T, p) {
  T.ph = 'near'; T.t = rnd(TIDE.near); T.met = 0; T.after = TIDE.after;
  const day = S.day.n, scout = day <= 1;
  if (day >= 4 && Math.random() < 0.6 && clanRaidVisit(C)) return;   // you're out: this time they go for your camp instead
  const n = scout ? 1 : day === 2 ? 2 : 2 + (Math.random() < 0.3 + 0.08 * day + 0.4 * clanAngK() ? 1 : 0);
  const g = clanBand(n, { d: STALK.r0 + 60, noLead: scout || day === 2 });
  const M = g ? bandOf(g) : []; if (!M.length) return;
  const st = rnd(STALK.t) * (scout ? 0.8 : 1);
  g.stalk = { end: S.t + st, T: st, a: Math.atan2(g.y - p.y, g.x - p.x), dir: Math.random() < 0.5 ? 1 : -1, cue: 2 + Math.random() * 3, seenT: -9 };
  if (scout) for (const e of M) { e.cl.scout = 1; e.cl.P.agg *= 0.4; }
  C.bandT = Math.max(C.bandT || 0, st + 30 + Math.random() * 40);   // no second band walking in on top of it
  T.t += st;   // the visit runs on past the stalking
  clanLater(0.3, 'twig', M[0], 1.15);   // the first you know of it: something out there in the trees
};
function clanStalkEnd(g, M) {   // done circling: the call, an answer, and in they come
  const p = S.p, e = M[0];
  clanSay(e, e.cl.scout ? 'click' : Math.random() < 0.6 ? 'yell' : 'scream', 1.15);
  const o = M[1], a = Math.atan2(e.y - p.y, e.x - p.x) + (Math.random() < 0.5 ? 1 : -1) * (1.2 + Math.random());
  if (!e.cl.scout) clanLater(1.2 + Math.random() * 0.8, Math.random() < 0.5 ? 'yell' : 'chatter', o || { x: p.x + Math.cos(a) * 520, y: p.y + Math.sin(a) * 520, vp: 110 + Math.random() * 50 }, 1);
  g.close = 1; g.stop = 0; g.closeEnd = S.t + 25;
  M.slice().sort(() => Math.random() - 0.5).forEach((o, i) => { const H = clanShadowOf(o); H.inAt = S.t + 0.4 + i * (0.6 + Math.random() * 1.2) + Math.random() * 0.8; H.stop = 170 + Math.random() * 100; });   // in one at a time, each from where it is
}
// ---- the band, while it stalks you, closes in, or goes for your things: each of them moves on its own (78-clan5) ----
{ const step = clanBandStep;
  clanBandStep = function (g, dt) {
    const M = bandOf(g);
    if (!M.length) { g.dead = 1; return; }
    if (M.some(e => e.cl.eng)) { g.stalk = null; g.close = 0; return step(g, dt); }
    if (!g.stalk && !g.close && !g.raid) return step(g, dt);
    let x = 0, y = 0; for (const e of M) { x += e.x; y += e.y; } g.x = x / M.length; g.y = y / M.length; g.stop = 0;   // the band is wherever they are
    const K = g.stalk;
    if (K) {
      if (S.t >= K.end) { g.stalk = null; clanStalkEnd(g, M); return; }
      if ((K.cue -= dt) <= 0) { K.cue = 4 + Math.random() * 6; const e = pick(M); clanSnd(pick(['twig', 'twig', 'rustle', 'rustle', 'click', 'breath']), e.x, e.y, 1.15, e.cl.vp, e); }
    }
    else if (g.close) { if (S.t > g.closeEnd) { g.close = 0; clanNotice(M[0]); } }   // you kept away from them: the nearest has you in sight anyway
    else if (g.raid) { const R = g.raid; if (M.some(e => Math.hypot(e.x - R.x, e.y - R.y) < 40)) clanSteal(g, R.B); }   // to your chest, while you're away
  }; }
// caught at your things: one grabs what it can and they all run for it
{ const notice = clanNotice;
  clanNotice = function (e, quiet) {
    const g = e.cl.band;
    if (g && g.raid && !quiet) {
      const R = g.raid, M = bandOf(g);
      if (M.some(o => Math.hypot(o.x - R.x, o.y - R.y) < 160)) { clanSteal(g, R.B); clanSay(e, 'yell'); for (const o of M) { o.cl.done = 1; clanGo(o, 'flee', { dist: 600 }); } return; }
    }
    if (g) { g.stalk = null; g.raid = null; g.close = 0; }
    return notice(e, quiet);
  }; }
// a scout only looks: it never goes for you, and when you come at it, it's off
{ const think = clanThink;
  clanThink = function (e) { think(e); const c = e.cl; if (c.scout && ['attack', 'threat', 'stalk', 'pursue', 'flank', 'approach', 'command'].includes(c.st)) clanGo(e, 'watch'); }; }
{ const react = clanReact;
  clanReact = function (e) { if (e.cl.scout) { e.cl.done = 1; return clanGo(e, 'flee'); } return react(e); }; }

// ---- your things: from the fourth day, while you're well away from your camp, a visit may go there instead of to you ----
function clanRaidVisit(C) {
  const D = S.day, p = S.p, home = homeSpot();
  if (D.clanRaidDay === D.n || !home) return false;
  const dh = Math.hypot(p.x - home.x, p.y - home.y); if (dh < 450) return false;
  const chests = D.builds.filter(B => Array.isArray(B.inv) && !B.pen && B.inv.some(Boolean) && Math.hypot(B.x - home.x, B.y - home.y) < 260 && !stShutIn(B.x, B.y)); if (!chests.length) return false;   // not one you've shut in
  const g = clanBand(2, { a: Math.atan2(home.y - p.y, home.x - p.x) + (Math.random() - 0.5) * 0.5, d: dh + 320, noLead: 1, nearBase: 1 }); if (!g) return false;
  const B = pick(chests); g.raid = { B, x: B.x, y: B.y }; D.clanRaidDay = D.n;
  C.bandT = Math.max(C.bandT || 0, 60 + Math.random() * 40);
  return true;
}
function clanSteal(g, B) {
  const D = S.day, home = homeSpot() || B; g.raid = null; g.away = 1; g.a = Math.atan2(g.y - home.y, g.x - home.x);
  if (stShutIn(B.x, B.y)) return;   // you shut it in since: the door holds
  const full = B.inv.map((s, i) => s ? i : -1).filter(i => i >= 0); if (!full.length) return;
  const i = pick(full), s = B.inv[i], take = Math.max(1, Math.ceil((s.n || 1) / 2)), T = DIT[s.id] || {};
  if ((s.n || 1) > take) s.n -= take; else B.inv[i] = null;
  dayChanged();
  signs().stolen = { x: B.x, y: B.y, what: (T.n || T.s || s.id).toLowerCase(), n: take, told: 0 };
  clanMarkAt(B.x + (Math.random() - 0.5) * 40, B.y + (Math.random() - 0.5) * 40, Math.atan2(g.y - B.y, g.x - B.x));
}

// ---- signs: tracks, a bone marker, the lid left open ----
function clanMarkAt(x, y, a) {
  const G = signs(); if (lakeAt(x, y, 10)) return;
  G.marks.push({ x: Math.round(x), y: Math.round(y), a, day: S.day.n, seen: 0 }); if (G.marks.length > SIGNS.marks) G.marks.shift();
}
function clanSignStep(dt, C) {
  const D = S.day, G = signs(), p = S.p, home = homeSpot();
  if (G.day !== D.n) { G.day = D.n; G.prints = G.prints.filter(q => D.n - q[3] < SIGNS.keep); G.marks = G.marks.filter(m => D.n - m.day < SIGNS.keep + 2); }
  // their feet: bare prints, left and right, wherever they walk near your camp or your way
  for (const e of clanList()) {
    const c = e.cl; if (c.z > 0.5 || c.climbing || !(c.v > 8)) { c.prX = e.x; c.prY = e.y; continue; }
    if (c.prX === undefined) { c.prX = e.x; c.prY = e.y; }
    const L = Math.hypot(e.x - c.prX, e.y - c.prY); if (L < SIGNS.gap) continue;
    const nearHome = home && Math.hypot(e.x - home.x, e.y - home.y) < 520;
    if (nearHome || Math.hypot(e.x - p.x, e.y - p.y) < 260) { const a = Math.atan2(e.y - c.prY, e.x - c.prX), s = (c.prS = -(c.prS || 1)) * 2.6; G.prints.push([Math.round(e.x - Math.sin(a) * s), Math.round(e.y + Math.cos(a) * s), +a.toFixed(2), D.n]); if (G.prints.length > SIGNS.cap) G.prints.shift(); }
    c.prX = e.x; c.prY = e.y;
  }
  // a visit over: from the second day, one of them leaves a marker at the edge of your camp
  const ph = C.tide && C.tide.ph;
  if (G.ph === 'near' && ph === 'quiet' && D.n >= 2 && home && Math.random() < 0.8) { const a = Math.random() * 6.283, r = 95 + Math.random() * 60; clanMarkAt(home.x + Math.cos(a) * r, home.y + Math.sin(a) * r, a); }
  G.ph = ph;
  // finding them
  for (const m of G.marks) if (!m.seen && Math.hypot(m.x - p.x, m.y - p.y) < 120) { m.seen = 1; dayNote('clanmark', 'bones tied to a stick, pushed into the ground · they\'ve been here', 1); if (actx) clanSnd('breath', p.x + 30, p.y, 0.4); }
  const st = G.stolen; if (st && !st.told && Math.hypot(st.x - p.x, st.y - p.y) < 90) { st.told = 1; dayNote('clanstole', `the lid's been opened · ${st.n > 1 ? st.n + ' ' : ''}${st.what} gone`, 1); }
}
function clanSignDraw() {
  const D = S.day; if (!D || !D.clanSigns) return;
  const G = D.clanSigns, p = S.p, R = 700, g = () => 0;   // the figure parts already sit on the ground (terrH is added on the card)
  const mud = hex('#5e4a36');
  for (const [x, y, a] of G.prints) {
    if (Math.abs(x - p.x) > R || Math.abs(y - p.y) > R) continue;
    const h = g(x, y) + 0.15, yaw = faceYaw(a);
    blob(PT.aBall, x, h, y, 2.2, 0.25, 4.0, yaw, mud);   // the sole
    blob(PT.aBall, x + Math.cos(a) * 2.9, h, y + Math.sin(a) * 2.9, 2.1, 0.25, 1.4, yaw, mud);   // the toes
  }
  for (const m of G.marks) {
    if (Math.abs(m.x - p.x) > R || Math.abs(m.y - p.y) > R) continue;
    const h = g(m.x, m.y), ux = Math.cos(m.a + Math.PI / 2), uy = Math.sin(m.a + Math.PI / 2), lean = 4;
    between(PT.rod, m.x, h, m.y, m.x + Math.cos(m.a) * lean, h + 34, m.y + Math.sin(m.a) * lean, 1.4, hex('#5a4330'));   // a stick, leaning
    const tx = m.x + Math.cos(m.a) * lean, ty = m.y + Math.sin(m.a) * lean;
    between(PT.rod, tx - ux * 9, h + 27, ty - uy * 9, tx + ux * 9, h + 27, ty + uy * 9, 1, hex('#5a4330'));   // a crosspiece
    blob(PT.ball, tx, h + 37, ty, 5, 5.6, 5, -m.a, hex('#e4dcc6'));   // a skull on top
    for (const e of [-1, 1]) blob(PT.ball, tx + Math.cos(m.a) * 2 + ux * 1.6 * e, h + 37.6, ty + Math.sin(m.a) * 2 + uy * 1.6 * e, 1.5, 1.8, 1.4, 0, hex('#1e1a16'));
    for (const e of [-1, 1]) { const hx = tx + ux * 8 * e, hy = ty + uy * 8 * e; between(PT.rod, hx, h + 27, hy, hx, h + 19, hy, 0.4, hex('#3a2c20')); between(PT.rod, hx, h + 19, hy, hx + 1, h + 12, hy + 1, 0.9, hex('#ddd4bc')); }   // bones hung on cord
    for (let i = 0; i < 6; i++) { const b = i * 1.05 + m.a; blob(PT.ball, m.x + Math.cos(b) * 7, h + 1, m.y + Math.sin(b) * 7, 2.8, 2, 2.6, b, hex(i % 2 ? '#6f6c66' : '#85827b')); }   // stones round its foot
  }
}

// ---- night: their drums, their fire off in the trees ----
function clanNightStep(dt, C) {
  const p = S.p, ks = clanCamps(); if (!ks.length || !actx) return;
  let k = ks[0], kd = 1e9; for (const q of ks) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < kd) { kd = d; k = q; } }
  if (kd > 5200) return;
  if ((C.drumT = (C.drumT ?? 6 + Math.random() * 10) - dt) > 0) return;
  C.drumT = 22 + Math.random() * 40;
  const beat = 0.36 + Math.random() * 0.12, n = 10 + Math.floor(Math.random() * 14), out = placeOut(k.x, k.y, 0.55 + 0.3 * clanAngK(), 6000, null, n * beat * 1.6 + 2); if (!out) return;
  const t0 = actx.currentTime + 0.05, pat = pick([[1, 0.5, 0.7, 0], [1, 0, 0.6, 0.6], [1, 0.4, 0.4, 0.8, 0, 0.6]]);
  for (let i = 0; i < n; i++) { const acc = pat[i % pat.length]; if (!acc) continue; const t = t0 + i * beat + (Math.random() - 0.5) * 0.025;
    if (!snd('drum', { out, at: t - actx.currentTime, v: 0.5 + 0.7 * acc, rate: 0.94 + 0.08 * acc, j: 0.02 })) { boomAt(t, 92 + 18 * acc, 46, 0.42, 0.9 * acc, out); noiseAt(t, 700, 160, 0.14, 0.28 * acc, out); } }
  if (Math.random() < 0.45) { const a = Math.atan2(k.y - p.y, k.x - p.x) + (Math.random() - 0.5) * 0.3; clanLater(n * beat * 0.6, pick(['wail', 'yell', 'chatter']), { x: p.x + Math.cos(a) * 1600, y: p.y + Math.sin(a) * 1600, vp: 100 + Math.random() * 60 }, 0.7); }   // and voices with it
}
// their fire, far off: a glow low between the trunks the way their camp lies (a soft light the fog doesn't swallow, but trees hide)
const CL_GLOW = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,190,110,1)'); gr.addColorStop(0.25, 'rgba(255,120,40,0.75)'); gr.addColorStop(1, 'rgba(255,60,10,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const mk = () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); s.visible = false; scene.add(s); return s; };
  return [0, 1, 2, 3].map(mk);
})();
function clanNightDraw(now) {
  const p = S.p; CL_GLOW.forEach(s => { s.visible = false; });
  if (!dayNight()) return;
  clanCamps().forEach((k, i) => {
    const d = Math.hypot(k.x - p.x, k.y - p.y), s = CL_GLOW[i]; if (!s || d < 900 || d > 5200) return;   // close enough and its own fire shows
    const a = Math.atan2(k.y - p.y, k.x - p.x), r = 780, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r, f = 0.8 + 0.2 * Math.sin(now * 9 + k.seed * 7) * Math.sin(now * 3.3 + i), far = 1 - Math.min(0.75, (d - 900) / 5000);
    s.position.set(x, terrH(x, y) + 16, y); s.scale.set(70 * far, 46 * far, 1); s.material.opacity = 0.42 * f * far; s.visible = true;
  });
}
// ---- wired in ----
{ const step = clanStep;
  clanStep = function (dt) {
    step(dt);
    const D = S.day; if (!CLAN_ON || !D || S.rg.phase !== 'fight' || ARENA) return;
    const C = clan();
    if (dayNight()) return clanNightStep(dt, C);
    for (const e of clanList()) { const c = e.cl; if (c.scout && c.eng && c.engT > 18 + c.seed * 20 && !['leave', 'flee'].includes(c.st)) { c.done = 1; clanGo(e, 'leave'); } }   // the scout has had its look
    clanSignStep(dt, C);
  }; }
{ const draw = clanDraw;
  clanDraw = function (now, dt) { draw(now, dt); if (!CLAN_ON || !S.rg || !S.day) return; clanSignDraw(); clanNightDraw(now); }; }
