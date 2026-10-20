// ================= a map that fills in as you go, and a compass (Joe's number 7) =================
// You remember where you've been from the start; make a Map (a hide and a stick of charcoal, in your hands) and it's drawn
// out for you: hold it and press Attack, or press M (with the hammer out, M is still Move). The island as far as you've
// walked it, in ink on old hide: the coast and the sea, the beaches, the ponds, the thick woods and the open glades, the
// places with a story to them, the raider camps and the clan's villages you've come near, the cave mouths you've found,
// your home and what you've built, and you, the red arrow. The wheel (or + and -) zooms. Down in a cave it shows the cave
// instead, as far as your torch has shown it. A Compass, made at the workbench, puts a strip across the top of the
// screen: the way you're facing, with home, the caves you've found and the camps you know marked along it.
Object.assign(DIT, {
  map: { n: 'Map', c: '#d8c8a0', st: 1, k: 'tool', tool: 'map', b: 'Hold it and press Attack, or press M · it fills in wherever you go' },
  compass: { n: 'Compass', c: '#c8a050', st: 1, k: 'tool', tool: 'compass', b: 'Carry it: the way you face shows across the top of the screen, with home and the caves you\'ve found on it' },
});
DREC.push(
  { id: 'map', g: 'tool', out: 'map', at: 'hand', cost: { hide: 1, sticks: 1 } },
  { id: 'compass', g: 'tool', out: 'compass', at: 'bench', cost: { flint: 2, sticks: 2, rope: 1 } },
);
Object.assign(ICON, {
  map: '<path d="M3 5.5l5.5-2 7 2 5.5-2v15l-5.5 2-7-2-5.5 2z" fill="#d8c8a0"/><path d="M8.5 3.5v15M15.5 5.5v15" stroke="#a8946a" stroke-width="1"/><path d="M4.5 13c2-1 3-3.5 5.5-3.5s3 2.5 5 2 2.5-3 4-3.5" stroke="#5a7a8a" stroke-width="1.3" fill="none"/><path d="M14 15.5l1.6 1.6M15.6 15.5L14 17.1" stroke="#a83a2a" stroke-width="1.3"/><circle cx="7" cy="8" r="1.1" fill="#5e7a3a"/>',
  compass: '<circle cx="12" cy="12" r="9" fill="#c8a050"/><circle cx="12" cy="12" r="7" fill="#efe6d0"/><path d="M12 5.6l2 6.4h-4z" fill="#b8402c"/><path d="M12 18.4l-2-6.4h4z" fill="#3e3a34"/><circle cx="12" cy="12" r="1.1" fill="#8a6a30"/><path d="M12 2.2v1.6" stroke="#8a6a30" stroke-width="1.6"/>',
});

// ---------------- remembering where you've been ----------------
const MAPG = { N: 160, W: 6400, R: 430 }, MAPC = { N: 72, W: 1720, R: 250 };   // cells across, half the width it covers, how far round you you see
const b64Of = A => { let s = ''; for (let i = 0; i < A.length; i += 8192) s += String.fromCharCode.apply(null, A.subarray(i, i + 8192)); return btoa(s); };
const bitsOf = (s, n) => { const A = new Uint8Array(n); if (s) try { const t = atob(s); for (let i = 0; i < Math.min(n, t.length); i++) A[i] = t.charCodeAt(i); } catch (e) {} return A; };
function mapSeen() { const D = S.day; if (!D._mapA) D._mapA = bitsOf(D.mapSeen, MAPG.N * MAPG.N / 8); return D._mapA; }
function mapCaveSeen(si) { const D = S.day; D._mapC = D._mapC || {}; if (!D._mapC[si]) D._mapC[si] = bitsOf((D.mapCave || {})[si], MAPC.N * MAPC.N / 8); return D._mapC[si]; }
const bitGet = (A, i) => (A[i >> 3] >> (i & 7)) & 1;
function bitsReveal(A, G, x, y, R) {   // every cell within R of (x, y)
  const c = G.W * 2 / G.N, ci = (x + G.W) / c, cj = (y + G.W) / c, r = R / c; let n = 0;
  for (let j = Math.max(0, Math.floor(cj - r)); j <= Math.min(G.N - 1, Math.ceil(cj + r)); j++)
    for (let i = Math.max(0, Math.floor(ci - r)); i <= Math.min(G.N - 1, Math.ceil(ci + r)); i++) {
      if ((i + 0.5 - ci) ** 2 + (j + 0.5 - cj) ** 2 > r * r) continue;
      const k = j * G.N + i; if (!bitGet(A, k)) { A[k >> 3] |= 1 << (k & 7); n++; }
    }
  return n;
}
const mapSeenAt = (A, G, x, y) => { const c = G.W * 2 / G.N, i = Math.floor((x + G.W) / c), j = Math.floor((y + G.W) / c); return i >= 0 && j >= 0 && i < G.N && j < G.N && bitGet(A, j * G.N + i); };
const MAP = { at: { x: 1e9, y: 1e9 }, gen: 0, open: false, zoom: 1, base: null, caveBase: {}, drawT: 0 };
function mapReveal() {
  const D = S.day, p = S.p; if (!D || !p) return;
  if (MAP.D !== D) { MAP.D = D; MAP.at = { x: 1e9, y: 1e9 }; }   // a new run, or one picked up again
  if (Math.hypot(p.x - MAP.at.x, p.y - MAP.at.y) < 36) return; MAP.at = { x: p.x, y: p.y };
  const si = caveSysAt(p.x);
  if (si >= 0) { const Sy = caveSys(si); if (bitsReveal(mapCaveSeen(si), MAPC, p.x - Sy.C.x, p.y - Sy.C.y, MAPC.R)) MAP.gen++; }
  else if (bitsReveal(mapSeen(), MAPG, p.x, p.y, MAPG.R)) MAP.gen++;
}
{ const ws = workStep; workStep = function (dt) { ws(dt); try { mapReveal(); } catch (e) { console.error(e); } }; }
{ const sv = daySave; daySave = function () {
    const r = sv.apply(this, arguments);
    try { const D = S && S.day; if (D && !ARENA && (D._mapA || D.mapSeen)) { const k = dayKey(), raw = localStorage.getItem(k); if (raw) { const o = JSON.parse(raw); if (o && o.d) {
      o.d.mapSeen = D._mapA ? b64Of(D._mapA) : D.mapSeen; const mc = Object.assign({}, D.mapCave || {}); for (const si in D._mapC || {}) mc[si] = b64Of(D._mapC[si]); o.d.mapCave = mc;
      localStorage.setItem(k, JSON.stringify(o)); } } } } catch (e) {}
    return r;
  }; }

// ---------------- the island, drawn once ----------------
const MCOL = { paper: [226, 212, 178], paperD: [196, 178, 138], ink: [62, 48, 34], sea: [150, 172, 172], seaD: [118, 146, 152], sand: [226, 206, 150], land: [168, 172, 112],
  thick: [96, 120, 72], rock: [150, 146, 126], dry: [196, 178, 112], glade: [184, 196, 120], pond: [116, 152, 166] };
const mixC = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
function mapBase() {
  if (MAP.base) return MAP.base;
  const n = 512, W = MAPG.W, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const g = cv.getContext('2d'), img = g.createImageData(n, n), d = img.data, sea = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = (i + 0.5) / n * 2 * W - W, y = (j + 0.5) / n * 2 * W - W; sea[j * n + i] = BEACH ? coastS(x, y) : -9999; }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, s = sea[k], x = (i + 0.5) / n * 2 * W - W, y = (j + 0.5) / n * 2 * W - W; let c;
    if (s > 0) { c = mixC(MCOL.sea, MCOL.seaD, clamp(s / 900, 0, 1)); if (((i + j * 3) % 23 === 0 || (i * 2 + j) % 29 === 0) && s > 60) c = mixC(c, MCOL.paper, 0.35); }   // a few pale strokes for the swell
    else if (s > -150) c = mixC(MCOL.sand, MCOL.land, clamp((-s - 90) / 60, 0, 1));
    else {
      const L = landAt(x, y); c = MCOL.land;
      c = mixC(c, MCOL.thick, clamp(L[0] * 1.2, 0, 1)); c = mixC(c, MCOL.rock, clamp(L[1] * 1.1, 0, 1)); c = mixC(c, MCOL.dry, clamp(L[2], 0, 1)); c = mixC(c, MCOL.glade, clamp(L[3] * 1.2, 0, 1));
      if (L[0] > 0.45 && hash(i * 0.71, j * 1.37) < 0.22 * L[0]) c = mixC(c, [60, 84, 50], 0.6);   // stipple: trees
    }
    let edge = false;   // the coastline, inked
    if (s <= 0) for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = sea[(j + dj) * n + i + di]; if (i + di >= 0 && i + di < n && j + dj >= 0 && j + dj < n && q > 0) edge = true; }
    if (edge) c = MCOL.ink;
    d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const px = v => (v + W) / (2 * W) * n;
  g.fillStyle = `rgb(${MCOL.pond})`; g.strokeStyle = `rgb(${MCOL.ink})`; g.lineWidth = 0.8;
  for (const P of lakesNear(0, 0, W)) {
    if (BEACH && coastS(P.x, P.y) > -150) continue;
    g.beginPath();
    const rays = P.rays, N = rays ? rays.length : 24;
    for (let k = 0; k <= N; k++) { const a = k / N * Math.PI * 2, r = rays ? rays[k % N] : P.rad; g[k ? 'lineTo' : 'moveTo'](px(P.x + Math.cos(a) * r), px(P.y + Math.sin(a) * r)); }
    g.fill(); g.stroke();
  }
  return (MAP.base = cv);
}
function mapCaveBase(si) {   // the cave's floor, pale on dark, from its chambers and passages
  if (MAP.caveBase[si]) return MAP.caveBase[si];
  const Sy = caveSys(si), n = 512, W = MAPC.W, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const g = cv.getContext('2d'), px = v => (v + W) / (2 * W) * n, sc = n / (2 * W);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [col, grow] of [['#1c1712', 10], ['#a8987a', 0]]) {
    g.strokeStyle = g.fillStyle = col;
    for (const t of Sy.tubes) { g.lineWidth = (t.w * 2 + grow * 2) * sc; g.beginPath(); g.moveTo(px(t.ax), px(t.ay)); g.lineTo(px(t.bx), px(t.by)); g.stroke(); }
    for (const o of Sy.rooms) { g.beginPath(); g.arc(px(o.x), px(o.y), (o.r + grow) * sc, 0, Math.PI * 2); g.fill(); }
  }
  g.fillStyle = '#6a8a98'; for (const P of Sy.pools || []) { g.beginPath(); g.arc(px(P.x), px(P.y), (P.r || P.rad || 30) * sc, 0, Math.PI * 2); g.fill(); }
  return (MAP.caveBase[si] = cv);
}

// ---------------- the map itself: an overlay you look at while the world goes on ----------------
const mapStyle = document.createElement('style');
mapStyle.textContent = `
#mapEl { position: fixed; inset: 0; z-index: 6; display: flex; align-items: center; justify-content: center; background: radial-gradient(ellipse at center, rgba(8,6,4,0.25), rgba(8,6,4,0.7)); }
#mapEl[hidden] { display: none; }
#mapEl canvas { box-shadow: 0 10px 40px rgba(0,0,0,0.6); border-radius: 6px; touch-action: none; }
#mapEl .mbtn { position: absolute; font: 700 13px var(--mono, monospace); letter-spacing: 0.08em; color: #3e3022; background: rgba(226,212,178,0.92); border: 1px solid #8a7450; padding: 6px 11px; border-radius: 4px; }
#bMap { position: fixed; right: calc(196px + env(safe-area-inset-right, 0px)); top: calc(12px + env(safe-area-inset-top, 0px)); padding: 0.5rem 0.75rem; font-size: 0.7rem; letter-spacing: 0.12em; color: var(--ash); background: rgba(5,5,5,0.6); border: 1px solid rgba(138,138,138,0.45); display: none; z-index: 4; }
body.playing #bMap.have { display: block; }
body.touch #bMap { right: calc(86px + env(safe-area-inset-right, 0px)); }
#compassEl { position: fixed; left: 50%; top: calc(8px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 3; pointer-events: none; }
#compassEl[hidden] { display: none; }`;
document.head.append(mapStyle);
const mapEl = document.createElement('div'); mapEl.id = 'mapEl'; mapEl.hidden = true;
const mapCv = document.createElement('canvas'), mapG = mapCv.getContext('2d'); mapEl.append(mapCv);
const mapClose = document.createElement('button'); mapClose.className = 'mbtn'; mapClose.textContent = 'Close · M';
const mapIn = document.createElement('button'); mapIn.className = 'mbtn'; mapIn.textContent = '+';
const mapOut = document.createElement('button'); mapOut.className = 'mbtn'; mapOut.textContent = '−';
mapEl.append(mapClose, mapIn, mapOut); document.body.append(mapEl);
const mapBtn = document.createElement('button'); mapBtn.id = 'bMap'; mapBtn.textContent = 'Map · M'; document.body.append(mapBtn);
const compassCv = document.createElement('canvas'); compassCv.id = 'compassEl'; compassCv.hidden = true; document.body.append(compassCv);
const ZOOMS = [1, 2.2, 4.6];
const mapHave = id => { const D = S && S.day; return !!(D && D.inv.some(s => s && s.id === id)); };
function mapToggle(on = !MAP.open) {
  if (on && !(S && S.day && mapHave('map'))) return;
  MAP.open = on; mapEl.hidden = !on;
  if (on) { MAP.drawT = 0; if (MAP.zoomSet === undefined) { MAP.zi = 1; MAP.zoomSet = 1; } if (!snd('paper')) { sfx(1.6, 0.2, 'bandpass', 2400, 0.12); if (actx) noiseAt(actx.currentTime, 3000, 1200, 0.25, 0.1, sfxGain); } }
}
const mapZoom = dz => { MAP.zi = clamp((MAP.zi ?? 1) + dz, 0, ZOOMS.length - 1); MAP.drawT = 0; };
mapClose.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); mapToggle(false); });
mapIn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); mapZoom(1); });
mapOut.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); mapZoom(-1); });
mapBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); mapToggle(); });
mapEl.addEventListener('mousedown', e => { e.stopPropagation(); }, false);
addEventListener('keydown', e => {
  if (!MAP.open) return;
  if (e.code === 'Escape' || (e.code === 'KeyM' && !e.repeat)) { e.stopImmediatePropagation(); e.preventDefault(); mapToggle(false); return; }
  if (e.key === '+' || e.key === '=') { e.stopImmediatePropagation(); mapZoom(1); } else if (e.key === '-' || e.key === '_') { e.stopImmediatePropagation(); mapZoom(-1); }
}, true);
addEventListener('keydown', e => { if (e.code === 'KeyM' && !e.repeat && !MAP.open && state === 'play' && S && S.day && S.running && dayTool() !== 'build' && !menusOpen()) mapToggle(true); });
addEventListener('wheel', e => { if (!MAP.open) return; e.stopPropagation(); mapZoom(e.deltaY < 0 ? 1 : -1); }, { capture: true, passive: true });
// holding it: Attack opens it
{ const dp = dayPrimary; dayPrimary = function () {
    const T = heldIt();
    if (T && T.tool === 'map') { if (!S.p.act) mapToggle(); return true; }
    if (T && T.tool === 'compass') { if (!S.p.act) { dayAct(10, 0.5); exNote(`facing ${compassWord(camHeading())} · ${Math.round(camHeading())}°`); } return true; }
    return dp();
  }; }
{ const dv = dayVerb; dayVerb = function () { const T = heldIt(); if (T && T.tool === 'map') return 'Look'; if (T && T.tool === 'compass') return 'Check'; return dv(); }; }

// which way the camera faces, as a bearing: north is up the map (towards -y), east is +x
const _cd = new V3();
function camHeading() { cam.getWorldDirection(_cd); const a = Math.atan2(_cd.z, _cd.x); return ((a + Math.PI / 2) * 180 / Math.PI % 360 + 360) % 360; }
const bearingTo = (x, y) => { const p = S.p, a = Math.atan2(y - p.y, x - p.x); return ((a + Math.PI / 2) * 180 / Math.PI % 360 + 360) % 360; };
const compassWord = h => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(h / 45) % 8];

// what goes on it: [kind, x, y, label]
function mapMarks() {
  const D = S.day, out = [];
  const h = homeAt(); if (h) out.push(['home', h.x, h.y, 'home']);
  for (const B of D.builds) {
    if (B.t === 'fire') out.push(['fire', B.x, B.y]);
    else if (B.snare || B.ftrap) out.push(['trap', B.x, B.y]);
    else if (B.t === 'chest' || STN_N[B.t] || B.t === 'tpost' || B.t === 'signal') out.push(['build', B.x, B.y]);
    else if (B.t === 'cache') out.push(['cache', B.x, B.y]);
  }
  { const seenG = new Set(); for (const o of D.bld.values()) { const k = Math.round(o.x / 60) + ',' + Math.round(o.y / 60); if (!seenG.has(k)) { seenG.add(k); out.push(['piece', o.x, o.y]); } } }
  try { for (const k of clanCamps()) out.push(['clan', k.x, k.y, 'clan village']); } catch (e) {}
  try { for (const m of caveEnts()) if (D.cave && D.cave.found && D.cave.found[m.key]) out.push(['cave', m.x, m.y, caveSys(m.si).sp.n]); } catch (e) {}
  for (const M of AREA.marks) for (const ox of [0, -AREA_P]) for (const oy of [0, -AREA_P]) { const x = M.x + ox, y = M.y + oy; if (Math.abs(x) < MAPG.W && Math.abs(y) < MAPG.W && (!BEACH || coastS(x, y) < -200)) out.push(['mark', x, y, MARK_LABEL[M.t]]); }
  return out;
}
const MARK_LABEL = { stones: 'standing stones', grove: 'old oaks', deadwood: 'dead wood', fairy: 'fairy ring', fallen: 'storm-felled', boulders: 'boulder field' };
function mapGlyph(g, kind, x, y, s) {   // little ink drawings
  g.save(); g.translate(x, y); g.lineJoin = 'round'; g.lineCap = 'round';
  const ink = '#3e3022';
  if (kind === 'home') { g.fillStyle = '#c8901c'; g.strokeStyle = ink; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, -8 * s); g.lineTo(8 * s, -1 * s); g.lineTo(5.5 * s, -1 * s); g.lineTo(5.5 * s, 6 * s); g.lineTo(-5.5 * s, 6 * s); g.lineTo(-5.5 * s, -1 * s); g.lineTo(-8 * s, -1 * s); g.closePath(); g.fill(); g.stroke(); }
  else if (kind === 'fire') { g.fillStyle = '#d0602a'; g.beginPath(); g.moveTo(0, -5 * s); g.quadraticCurveTo(4 * s, 0, 2.5 * s, 3.5 * s); g.lineTo(-2.5 * s, 3.5 * s); g.quadraticCurveTo(-4 * s, 0, 0, -5 * s); g.fill(); }
  else if (kind === 'build' || kind === 'piece') { g.fillStyle = '#7a5a3a'; g.fillRect(-2.6 * s, -2.6 * s, 5.2 * s, 5.2 * s); }
  else if (kind === 'trap') { g.strokeStyle = '#6a4a2a'; g.lineWidth = 1.3; g.beginPath(); g.arc(0, 0, 2.6 * s, 0, Math.PI * 2); g.stroke(); }
  else if (kind === 'cache') { g.strokeStyle = ink; g.lineWidth = 1.2; g.strokeRect(-3 * s, -2.2 * s, 6 * s, 4.4 * s); }
  else if (kind === 'camp' || kind === 'campDone') { g.strokeStyle = kind === 'camp' ? '#a8301e' : '#7a6a58'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-5 * s, -5 * s); g.lineTo(5 * s, 5 * s); g.moveTo(5 * s, -5 * s); g.lineTo(-5 * s, 5 * s); g.stroke(); }
  else if (kind === 'clan') { g.fillStyle = '#5a2a1e'; for (const [dx, dy] of [[-4, 2], [0, -2], [4, 2]]) { g.beginPath(); g.moveTo((dx - 3) * s, (dy + 3) * s); g.lineTo(dx * s, (dy - 3) * s); g.lineTo((dx + 3) * s, (dy + 3) * s); g.fill(); } }
  else if (kind === 'cave') { g.fillStyle = '#7a7266'; g.beginPath(); g.ellipse(0, 1 * s, 7 * s, 5 * s, 0, Math.PI, 0); g.lineTo(7 * s, 3 * s); g.lineTo(-7 * s, 3 * s); g.fill(); g.fillStyle = '#16120e'; g.beginPath(); g.ellipse(0, 3 * s, 3.4 * s, 4 * s, 0, Math.PI, 0); g.fill(); }
  else if (kind === 'mark') { g.fillStyle = 'rgba(62,48,34,0.55)'; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * 3.4 * s, Math.sin(a) * 3.4 * s, 1 * s, 0, Math.PI * 2); g.fill(); } }
  g.restore();
}
function mapDraw(now) {
  const D = S.day, p = S.p, dpr = Math.min(2, devicePixelRatio || 1);
  const size = Math.floor(Math.min(innerWidth * 0.94, innerHeight * 0.9));
  if (mapCv.width !== size * dpr) { mapCv.width = mapCv.height = size * dpr; mapCv.style.width = mapCv.style.height = size + 'px'; }
  const bx = (innerWidth - size) / 2, by = (innerHeight - size) / 2;
  mapClose.style.left = (bx + size - 108) + 'px'; mapClose.style.top = (by + 10) + 'px';
  mapIn.style.left = (bx + 10) + 'px'; mapIn.style.top = (by + size - 44) + 'px'; mapOut.style.left = (bx + 48) + 'px'; mapOut.style.top = (by + size - 44) + 'px';
  const g = mapG, Wd = size * dpr, si = caveSysAt(p.x), cave = si >= 0, G = cave ? MAPC : MAPG;
  const zoom = ZOOMS[MAP.zi ?? 1], k = Wd / (2 * G.W) * zoom;
  const Sy = cave ? caveSys(si) : null, lx = cave ? p.x - Sy.C.x : p.x, ly = cave ? p.y - Sy.C.y : p.y;
  const half = G.W / zoom, cx = zoom === 1 ? 0 : clamp(lx, -G.W + half, G.W - half), cy = zoom === 1 ? 0 : clamp(ly, -G.W + half, G.W - half);
  const X = x => (x - cx) * k + Wd / 2, Y = y => (y - cy) * k + Wd / 2;
  // the hide it's drawn on
  g.setTransform(1, 0, 0, 1, 0, 0);
  const pg = g.createRadialGradient(Wd / 2, Wd / 2, Wd * 0.2, Wd / 2, Wd / 2, Wd * 0.75);
  pg.addColorStop(0, cave ? '#4a4036' : `rgb(${MCOL.paper})`); pg.addColorStop(1, cave ? '#2a241e' : `rgb(${MCOL.paperD})`);
  g.fillStyle = pg; g.fillRect(0, 0, Wd, Wd);
  // what you've seen of it, the edges soft
  const A = cave ? mapCaveSeen(si) : mapSeen(), base = cave ? mapCaveBase(si) : mapBase();
  const fog = MAP.fog || (MAP.fog = document.createElement('canvas')); if (fog.width !== G.N) fog.width = fog.height = G.N;
  { const fg = fog.getContext('2d'), im = fg.createImageData(G.N, G.N); for (let i = 0; i < G.N * G.N; i++) if (bitGet(A, i)) im.data[i * 4 + 3] = 255; fg.putImageData(im, 0, 0); }
  const tmp = MAP.tmp || (MAP.tmp = document.createElement('canvas')); if (tmp.width !== Wd) tmp.width = tmp.height = Wd;
  const tg = tmp.getContext('2d'); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, Wd, Wd); tg.imageSmoothingEnabled = true;
  tg.drawImage(base, X(-G.W), Y(-G.W), 2 * G.W * k, 2 * G.W * k);
  tg.globalCompositeOperation = 'destination-in'; tg.filter = `blur(${Math.max(2, 2 * G.W / G.N * k * 0.6)}px)`;
  tg.drawImage(fog, X(-G.W), Y(-G.W), 2 * G.W * k, 2 * G.W * k); tg.filter = 'none'; tg.globalCompositeOperation = 'source-over';
  g.drawImage(tmp, 0, 0);
  // a faint grid, every 50 m
  g.strokeStyle = cave ? 'rgba(220,200,160,0.07)' : 'rgba(62,48,34,0.09)'; g.lineWidth = 1;
  for (let v = -G.W; v <= G.W; v += 1000) { g.beginPath(); g.moveTo(X(v), 0); g.lineTo(X(v), Wd); g.moveTo(0, Y(v)); g.lineTo(Wd, Y(v)); g.stroke(); }
  const gs = dpr * clamp(0.75 + zoom * 0.18, 0.8, 1.5);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (!cave) {
    // the woods by name, where you've been
    g.font = `italic ${Math.round(13 * dpr)}px Georgia, serif`; g.fillStyle = 'rgba(62,48,34,0.62)';
    [[RING_NAMES[0], 0, -1150], [RING_NAMES[1], 0, -3000], [RING_NAMES[2], 0, -5000], [RING_NAMES[1], 0, 3000]].forEach(([t, x, y]) => { if (mapSeenAt(A, G, x, y)) g.fillText(t, X(x), Y(y)); });
    for (const [kind, x, y, label] of mapMarks()) {
      if (!mapSeenAt(A, G, x, y)) continue;
      mapGlyph(g, kind, X(x), Y(y), gs);
      if (label && kind !== 'home' && (zoom > 1 || kind === 'cave' || kind === 'camp')) { g.font = `${Math.round(10 * dpr)}px Georgia, serif`; g.fillStyle = 'rgba(62,48,34,0.85)'; const hw = g.measureText(label).width / 2 + 6 * dpr; g.fillText(label, clamp(X(x), hw, Wd - hw), Y(y) + 12 * gs); }
    }
    // the islet, if you've been out to it
    if (BEACH && mapSeenAt(A, G, ISLET.x, ISLET.y)) { g.font = `italic ${Math.round(11 * dpr)}px Georgia, serif`; g.fillStyle = 'rgba(62,48,34,0.7)'; g.fillText('the islet', X(ISLET.x), Y(ISLET.y)); }
  } else {
    g.font = `italic ${Math.round(15 * dpr)}px Georgia, serif`; g.fillStyle = 'rgba(232,214,176,0.8)'; g.fillText(Sy.sp.n, Wd / 2, 26 * dpr);
    for (const e of Sy.exits || []) if (mapSeenAt(A, G, e.x, e.y)) { g.fillStyle = '#e8d6b0'; g.font = `${Math.round(11 * dpr)}px Georgia, serif`; g.fillText('▲ the way out', X(e.x), Y(e.y) - 14 * gs); }
  }
  // you
  { const s = 1.25 * gs; cam.getWorldDirection(_cd);
    const h = Math.atan2(_cd.z, _cd.x);
    g.save(); g.translate(X(lx), Y(ly)); g.rotate(h); g.fillStyle = '#b8301e'; g.strokeStyle = '#fff4dc'; g.lineWidth = 1.5 * dpr;
    g.beginPath(); g.moveTo(9 * s, 0); g.lineTo(-6 * s, -6 * s); g.lineTo(-3 * s, 0); g.lineTo(-6 * s, 6 * s); g.closePath(); g.fill(); g.stroke(); g.restore(); }
  // the rose, the scale and the title
  { const rx = Wd - 46 * dpr, ry = 104 * dpr, r = 24 * dpr; g.save(); g.translate(rx, ry); g.strokeStyle = cave ? 'rgba(232,214,176,0.7)' : 'rgba(62,48,34,0.75)'; g.fillStyle = g.strokeStyle; g.lineWidth = 1.2 * dpr;
    g.beginPath(); g.arc(0, 0, r * 0.62, 0, Math.PI * 2); g.stroke();
    for (let q = 0; q < 4; q++) { g.save(); g.rotate(q * Math.PI / 2); g.beginPath(); g.moveTo(0, -r); g.lineTo(4 * dpr, 0); g.lineTo(-4 * dpr, 0); g.closePath(); if (q === 0) { g.fillStyle = '#a8301e'; } g.fill(); g.restore(); }
    g.font = `bold ${Math.round(11 * dpr)}px Georgia, serif`; g.fillStyle = cave ? '#e8d6b0' : '#3e3022'; g.fillText('N', 0, -r - 9 * dpr); g.restore(); }
  { const m = zoom === 1 ? 1000 : zoom < 3 ? 500 : 200, L = m * k, x0 = 18 * dpr, y0 = Wd - 62 * dpr; g.strokeStyle = cave ? '#e8d6b0' : '#3e3022'; g.lineWidth = 2 * dpr;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + L, y0); g.moveTo(x0, y0 - 4 * dpr); g.lineTo(x0, y0 + 4 * dpr); g.moveTo(x0 + L, y0 - 4 * dpr); g.lineTo(x0 + L, y0 + 4 * dpr); g.stroke();
    g.font = `${Math.round(11 * dpr)}px Georgia, serif`; g.fillStyle = g.strokeStyle; g.textAlign = 'left'; g.fillText(`${m / 20} m`, x0 + L + 8 * dpr, y0); }
  g.textAlign = 'left'; g.font = `italic ${Math.round(14 * dpr)}px Georgia, serif`; g.fillStyle = cave ? 'rgba(232,214,176,0.85)' : 'rgba(62,48,34,0.85)';
  if (!cave) g.fillText(`the island · day ${D.n}`, 18 * dpr, 26 * dpr);
}

// ---------------- the compass across the top ----------------
function compassDraw() {
  const D = S.day, dpr = Math.min(2, devicePixelRatio || 1), Wc = Math.min(420, innerWidth - 220), Hc = 38;
  if (compassCv.width !== Math.round(Wc * dpr)) { compassCv.width = Math.round(Wc * dpr); compassCv.height = Hc * dpr; compassCv.style.width = Wc + 'px'; compassCv.style.height = Hc + 'px'; }
  const g = compassCv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, Wc, Hc);
  const h = camHeading(), span = 110, px = deg => Wc / 2 + angDiffDeg(deg, h) / span * Wc;
  const bg = g.createLinearGradient(0, 0, Wc, 0); bg.addColorStop(0, 'rgba(8,6,4,0)'); bg.addColorStop(0.15, 'rgba(8,6,4,0.55)'); bg.addColorStop(0.85, 'rgba(8,6,4,0.55)'); bg.addColorStop(1, 'rgba(8,6,4,0)');
  g.fillStyle = bg; g.fillRect(0, 4, Wc, 20);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let d = 0; d < 360; d += 5) {
    const x = px(d); if (x < 6 || x > Wc - 6) continue;
    const fade = 1 - Math.abs(x - Wc / 2) / (Wc / 2);
    if (d % 45 === 0) { g.font = `700 ${d % 90 ? 9 : 11}px ui-monospace, monospace`; g.fillStyle = d === 0 ? `rgba(232,96,64,${0.4 + 0.6 * fade})` : `rgba(240,228,204,${0.35 + 0.65 * fade})`; g.fillText(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][d / 45], x, 14); }
    else { g.strokeStyle = `rgba(240,228,204,${0.2 + 0.4 * fade})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, d % 15 ? 11 : 9); g.lineTo(x, d % 15 ? 17 : 19); g.stroke(); }
  }
  // what's marked on it
  const p = S.p, inCave = caveSysAt(p.x) >= 0, marks = [];
  if (!inCave) {
    const hm = homeAt(); if (hm && Math.hypot(hm.x - p.x, hm.y - p.y) > 60) marks.push(['home', hm.x, hm.y]);
    try { for (const m of caveEnts()) if (D.cave.found[m.key]) marks.push(['cave', m.x, m.y]); } catch (e) {}
  }
  for (const [kind, x, y] of marks) {
    const x0 = px(bearingTo(x, y)); if (x0 < 10 || x0 > Wc - 10) continue;
    if (kind === 'home') { g.fillStyle = '#ffd68c'; g.beginPath(); g.moveTo(x0, 22); g.lineTo(x0 + 5, 27); g.lineTo(x0 + 3.4, 27); g.lineTo(x0 + 3.4, 32); g.lineTo(x0 - 3.4, 32); g.lineTo(x0 - 3.4, 27); g.lineTo(x0 - 5, 27); g.closePath(); g.fill(); }
    else if (kind === 'cave') { g.fillStyle = '#b8b0a2'; g.beginPath(); g.arc(x0, 30, 4.4, Math.PI, 0); g.fill(); g.fillStyle = '#16120e'; g.beginPath(); g.arc(x0, 31, 2, Math.PI, 0); g.fill(); }
    else { g.strokeStyle = '#e0503a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0 - 3, 24); g.lineTo(x0 + 3, 30); g.moveTo(x0 + 3, 24); g.lineTo(x0 - 3, 30); g.stroke(); }
  }
  g.fillStyle = '#ffd68c'; g.beginPath(); g.moveTo(Wc / 2, 4); g.lineTo(Wc / 2 + 4, 0); g.lineTo(Wc / 2 - 4, 0); g.closePath(); g.fill();
  g.font = '600 9px ui-monospace, monospace'; g.fillStyle = 'rgba(240,228,204,0.75)'; g.fillText(String(Math.round(h) % 360).padStart(3, '0'), Wc / 2, 31);
}
const angDiffDeg = (a, b) => ((a - b + 540) % 360) - 180;

// ---------------- each frame ----------------
{ const tf = thingsFrame; thingsFrame = function (now) {
    const r = tf(now);
    try {
      const D = S && S.day, live = !!(D && state === 'play' && S.running && S.rg && S.rg.phase !== 'dead');
      mapBtn.classList.toggle('have', live && mapHave('map'));
      if (MAP.open && (!live || !mapHave('map') || menusOpen())) mapToggle(false);
      if (MAP.open && now - MAP.drawT > 0.08) { MAP.drawT = now; mapDraw(now); }
      const showC = live && mapHave('compass') && !menusOpen() && !MAP.open;
      if (compassCv.hidden === showC) compassCv.hidden = !showC;
      if (showC) compassDraw();
    } catch (e) { console.error(e); }
    return r;
  }; }
