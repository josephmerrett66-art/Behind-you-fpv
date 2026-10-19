// ================= the clan by night: now and then they come for you in the dark, with torches =================
// Joe: "now can we add the canibals into night as you planned earlier". The plan (from the weak spots): with the night monsters
// gone, the dark had become the safest time, when in a horror game it should be the worst. So now and then the clan comes at
// night carrying torches, rarely enough that it's still a shock:
//  - never the first night, and never two nights running unless they're furious with you. The more days and the angrier they
//    are, the likelier a night is to be one of them;
//  - the first you know of it is that their drums have stopped. Then a call out in the dark, an answer, and lights moving
//    between the trunks, closer each time you look. From the third night one of them may come without a torch;
//  - they stalk you as they do by day, then come in bolder than by day, and stay for their go at you before they take their
//    lights away into the trees. Your fire still keeps them off; at first light they put their torches out.
const NIGHTV = { first: 2, p: 0.25, pDay: 0.06, pAng: 0.3, max: 0.65, at: [0.2, 0.55], hush: 20, stalk: [18, 32], stay: 110, bold: 0.15 };

// ---- will they come tonight, and when ----
function clanNightPlan(C) {
  const D = S.day;
  if (C.nightN !== D.n) {
    C.nightN = D.n; C.nightV = null; C.nightDrums = 0;
    const ang = clanAngK(), p = D.n < NIGHTV.first ? 0 : Math.min(NIGHTV.max, NIGHTV.p + NIGHTV.pDay * (D.n - NIGHTV.first) + NIGHTV.pAng * ang);
    if ((D.clanNightLast !== D.n - 1 || ang > 0.6) && Math.random() < p) C.nightV = { at: S.t + rnd(NIGHTV.at) * NIGHT_LEN, came: 0, hushed: 0 };
  }
  return C.nightV;
}
function clanNightCome(C, V) {   // a call out in the dark, an answer, and their lights in the trees
  V.came = 1; const D = S.day, p = S.p;
  if (D.sleeping) return;
  const n = 2 + (Math.random() < 0.35 + 0.1 * (D.n - 2) + 0.4 * clanAngK() ? 1 : 0) + (D.n >= 4 && Math.random() < 0.4 ? 1 : 0);
  const g = clanBand(Math.min(4, n), { d: STALK.r0 + 120, noLead: D.n < 3 }); if (!g) return;
  D.clanNightLast = D.n;
  const M = bandOf(g), st = rnd(NIGHTV.stalk);
  g.stalk = { end: S.t + st, T: st, a: Math.atan2(g.y - p.y, g.x - p.x), cue: 1 + Math.random() * 2, seenT: -9 };
  V.g = g; V.end = S.t + st + NIGHTV.stay;
  C.bandT = Math.max(C.bandT || 0, 60);
  clanLater(0.2, Math.random() < 0.6 ? 'yell' : 'wail', M[0], 1.1);
  const a = Math.atan2(M[0].y - p.y, M[0].x - p.x) + (Math.random() < 0.5 ? 1 : -1) * (0.8 + Math.random());
  clanLater(1.6 + Math.random(), 'yell', M[1] || { x: p.x + Math.cos(a) * 600, y: p.y + Math.sin(a) * 600, vp: 110 + Math.random() * 50 }, 0.9);
}
{ const ns = clanNightStep;
  clanNightStep = function (dt, C) {
    const V = clanNightPlan(C);
    if (!V || S.t < V.at - NIGHTV.hush) { const t0 = C.drumT; ns(dt, C); if (C.drumT > (t0 ?? 1e9)) C.nightDrums = 1; }   // the drums, as on any night, until they stop
    else if (!V.hushed) { V.hushed = 1; if (C.nightDrums) exNote('the drums have stopped', true); }
    if (V && !V.came && S.t >= V.at) clanNightCome(C, V);
    if (V && V.g && S.t > (V.end || 1e9)) for (const e of bandOf(V.g)) if (!e.cl.hunter && CL_CALM.includes(e.cl.st)) { e.cl.done = 1; clanGo(e, 'leave'); }   // they've had their go: off into the trees with their lights, each when it's done
  }; }

// ---- out after dark: fire in their hands ----
{ const band = clanBand;
  clanBand = function (n, o = {}) {
    const g = band(n, o);
    if (g && !rmOn()) {   // a night visit, or more of them come after a kill: torches, and bolder (but now and then one without, so you never see it)
      g.night = 1; const M = bandOf(g), dark = S.day.n >= 3 && M.length >= 3 && Math.random() < 0.5 ? pick(M) : null;
      for (const e of M) { const c = e.cl; c.night = 1; c.torch = e === dark ? 0 : 1; c.fear *= 0.7; }
    }
    return g;
  }; }
{ const conf = clanConf; clanConf = function (e) { return conf(e) + (e.cl.night ? NIGHTV.bold : 0); }; }
// first light: the torches go out, and they're the day's again
{ const step = clanStep;
  clanStep = function (dt) {
    step(dt);
    if (!CLAN_ON || !S.day || dayLight() < 0.6) return;
    for (const e of clanList()) if (e.cl && (e.cl.night || e.cl.torch)) { e.cl.night = 0; e.cl.torch = 0; }
  }; }

// ---- their torches: a flame you see across the dark, lighting them and the trunks round them ----
const CL_TGLOW = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(0.2, 'rgba(255,150,60,0.8)'); gr.addColorStop(1, 'rgba(255,80,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  return Array.from({ length: 6 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); s.visible = false; scene.add(s); return s; });
})();
{ const lights = clanLights;
  clanLights = function (add, fire) {
    lights(add, fire);
    CL_TGLOW.forEach(s => { s.visible = false; });
    if (!CLAN_ON || !S.day || !S.rg) return;
    const p = S.p, dark = 1 - ENV.lt, now = LU.time.value; let i = 0;
    for (const e of clanList()) {
      const c = e.cl; if (!c || !c.torch) continue;
      const T = c.torchAt || { x: e.x, y: e.y, h: 34 }, d = Math.hypot(T.x - p.x, T.y - p.y), f = 0.85 + 0.1 * Math.sin(now * 8.1 + c.seed * 9) + 0.06 * Math.random();
      add(T.x, T.h + 4, T.y, 170, 1.0 * f * dark, 0.58 * f * dark, 0.26 * f * dark, 1.2);
      if (c.torchAt) { fire(T.x, T.y, 0.35, T.h); tongues(T.x, T.y, 0.45, T.h); }
      const s = CL_TGLOW[i]; if (!s || d < 90 || dark < 0.2) continue;   // far off: a glow the dark and the haze don't swallow (the trunks still hide it)
      const k = Math.min(1, (d - 90) / 160), sz = (16 + d * 0.025) * f;
      s.position.set(T.x, terrH(T.x, T.y) + T.h + 2, T.y); s.scale.set(sz, sz, 1); s.material.opacity = 0.75 * k * dark * f; s.visible = true; i++;
    }
  }; }
