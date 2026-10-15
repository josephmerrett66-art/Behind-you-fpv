// ================= the fight: blows that land hard, kills that blow apart, and the streak counting it all up =================
// Everything the top-down game throws on screen in a fight, seen from behind your own eyes: the crescent of a swing sweeping
// across the view, sparks off every blow, a kill bursting in its colour with a ring of light, words punching up off the bodies,
// and the streak (its count, its multiplier, its bonus words, the tier names slamming in) drawn over it all on a flat layer.
const fxc = document.createElement('canvas'); fxc.id = 'fxc'; $('gl').after(fxc);
const fx2 = fxc.getContext('2d');
let FW = innerWidth, FH = innerHeight, FD = 1, fxDirty = true;
function fxcSize() { FD = Math.min(2, devicePixelRatio || 1); FW = innerWidth; FH = innerHeight; fxc.width = Math.round(FW * FD); fxc.height = Math.round(FH * FD); fxDirty = true; }
addEventListener('resize', fxcSize); fxcSize();

// a world point on the screen, and how many pixels one world unit is out there
const _cv = new V3();
function scr(x, h, y, out) {
  _cv.set(x, h + terrH(x, y), y).applyMatrix4(cam.matrixWorldInverse);   // heights are above the ground there
  const z = -_cv.z; if (z < 3) return null;
  _cv.applyMatrix4(cam.projectionMatrix);
  out = out || [0, 0, 0];
  out[0] = (_cv.x + 1) / 2 * FW; out[1] = (1 - _cv.y) / 2 * FH; out[2] = FH / (2 * Math.tan(cam.fov * Math.PI / 360)) / z;
  return out;
}
const onScr = (q, m = 80) => q && q[0] > -m && q[0] < FW + m && q[1] > -m && q[1] < FH + m;

// ---- what the fight feels like in your hands and eyes ----
const CFX = { recoil: 0, marks: [], kflash: null, rings: [], pillars: [], tint: '255,200,130', lastStop: -9, atk: null, wact: null, seen: new WeakSet(), sl: [], hurt: null, threats: [], warned: new WeakSet() };
const rgbOf = s => s.split(',').map(v => +v / 255);
function fxTint() {   // the colour of what you're swinging: its own if it has one, else torchlight
  const rg = S.rg, sl = rg.slashes && rg.slashes[rg.slashes.length - 1];
  if (sl && sl.tint) return sl.tint[1];
  const s = heldSlot(), T = s && DIT[s.id];
  if (T && T.wpn && ARMS[s.id] && ARMS[s.id].tint) return ARMS[s.id].tint[1];
  return '255,200,130';
}
function fxHit(e) {   // a blow lands: sparks off the far side, a white star where it struck, the view jolts
  const p = S.p, F = FOES[e.type], sc = foeScale(e), h = (F ? F.h : 30) * sc, a = Math.atan2(e.y - p.y, e.x - p.x), ca = Math.cos(a), sa = Math.sin(a);
  const x = e.x - ca * 5 * sc, y = e.y - sa * 5 * sc, z = h * 0.62, t = rgbOf(CFX.tint);
  spark(x, z, y, 0, 0, 0, 0.09, 34 * sc, 1, 1, 1, 1, 1);
  spark(x, z, y, 0, 0, 0, 0.16, 22 * sc, t[0], t[1], t[2], 0.9, 0);
  for (let i = 0; i < 22; i++) {
    const b = a + (Math.random() - 0.5) * 1.9, v = 120 + Math.random() * 260, w = Math.random() < 0.45;
    spark(x, z + (Math.random() - 0.5) * 8, y, Math.cos(b) * v, 40 + Math.random() * 180, Math.sin(b) * v, 0.22 + Math.random() * 0.3, 2.6 + Math.random() * 3,
      w ? 1 : t[0], w ? 0.97 : t[1], w ? 0.9 : t[2], 1, 0, 520, 2.4);
  }
  hitStop(0.045); S.trauma = Math.min(1, (S.trauma || 0) + 0.14);
  VIEW_FX.roll += (Math.random() < 0.5 ? -1 : 1) * 0.018; VIEW_FX.fov -= 2.2;
  CFX.recoil = 1; CFX.marks.push({ t: 0, kill: 0, col: '255,250,240' });
  e.fxHitT = S.t;
}
function fxKill(g) {   // a kill: it blows apart in its colour, a ring of light snaps out along the ground, a pillar of light goes up
  const p = S.p, F = FOES[g.type], sc = (g.k || 1) * (g.type === 'tall' ? 1.6 : g.type === 'brute' ? 1.25 : 1), h = (F ? F.h : 30) * sc;
  const col = typeof rdCol === 'function' ? rdCol(g.type) : '236,226,210', c = rgbOf(col), big = g.type === 'tall' || g.type === 'brute';
  const a = Math.atan2(g.y - p.y, g.x - p.x), z = h * 0.55;
  spark(g.x, z, g.y, 0, 0, 0, 0.14, 55 * sc, 1, 1, 1, 0.9, 0);
  spark(g.x, z, g.y, 0, 0, 0, 0.12, 60 * sc, 1, 1, 1, 1, 1);
  for (let i = 0; i < (big ? 90 : 56); i++) {   // the burst: mostly its colour, some white-hot, thrown on away from you
    const b = Math.random() * Math.PI * 2, el = (Math.random() - 0.25) * 1.5, v = (140 + Math.random() * 320) * (big ? 1.3 : 1), w = Math.random() < 0.3;
    const vx = Math.cos(b) * Math.cos(el) * v + Math.cos(a) * 120, vz = Math.sin(b) * Math.cos(el) * v + Math.sin(a) * 120, vy = Math.sin(el) * v + 90;
    spark(g.x, z + (Math.random() - 0.5) * h * 0.5, g.y, vx, vy, vz, 0.35 + Math.random() * 0.6, 3 + Math.random() * 5, w ? 1 : c[0], w ? 0.96 : c[1], w ? 0.88 : c[2], 1, Math.random() < 0.15 ? 1 : 0, 420, 2);
  }
  for (let i = 0; i < 14; i++) { const b = Math.random() * 6.283, v = 30 + Math.random() * 60; spark(g.x, 4, g.y, Math.cos(b) * v, 10 + Math.random() * 30, Math.sin(b) * v, 0.6 + Math.random() * 0.5, 10 + Math.random() * 8, c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, 0.6, 0, -20, 2.5); }
  CFX.rings.push({ x: g.x, y: g.y, t: 0, life: big ? 0.6 : 0.45, r: (big ? 150 : 95) * sc, c });
  CFX.pillars.push({ x: g.x, y: g.y, t: 0, life: 0.32, h: h * 2.2, c });
  if (S.t - CFX.lastStop > 0.22) { CFX.lastStop = S.t; hitStop(big ? 0.12 : 0.075); }
  S.trauma = Math.min(1, (S.trauma || 0) + (big ? 0.4 : 0.22)); VIEW_FX.fov += big ? 6 : 3.5;
  CFX.kflash = { t: 0, col, k: big ? 0.5 : 0.28 };
  CFX.marks.push({ t: 0, kill: 1, col });
  g.ka = a;
}

// ---- each frame: notice new blows and kills, age what's ours, put the 3D parts in the point cloud ----
function combatFrame(dt, rdt, now) {
  const rg = S.rg; if (!rg) return;
  CFX.tint = fxTint();
  threatScan(rdt);
  for (const e of rg.enemies) { if (e.dead || e.kHitT === undefined || e.kHitT === e.fxSeen) continue; e.fxSeen = e.kHitT; if (S.t - e.kHitT < 0.2) fxHit(e); }
  for (const g of rg.dying) if (!CFX.seen.has(g)) { CFX.seen.add(g); fxKill(g); }
  // a new swing: the view leans into it and widens a touch
  const A = S.p.atk, W = S.p.wact;
  if (A && A !== CFX.atk) {
    CFX.atk = A; VIEW_FX.roll += (A.side || 1) * (A.i === 3 ? 0.02 : 0.045); VIEW_FX.fov += A.i === 3 ? 5 : 2.5;
    const sl = rg.slashes && rg.slashes[rg.slashes.length - 1];
    if (!sl || sl.t > 0.05) CFX.sl.push({ i: A.ov ? 2 : A.pose === 3 ? 3 : A.i, a: A.a, side: A.side || 1, t: 0, life: A.ov ? 0.22 : 0.26, r: A.ov ? 34 : 40, arc: A.ov ? 1.6 : 2.2, dim: A.ov ? 0.6 : 1 });   // a tool or a bare swing: the main game draws no crescent for it, so we do
  }
  for (const s of CFX.sl) s.t += dt; CFX.sl = CFX.sl.filter(s => s.t < s.life);
  if (W && W !== CFX.wact) { CFX.wact = W; VIEW_FX.roll += 0.04; VIEW_FX.fov += 3; }
  CFX.recoil = Math.max(0, CFX.recoil - rdt * 7);
  if (rg.rdPops) { for (const k of rg.rdPops) k.t += dt; rg.rdPops = rg.rdPops.filter(k => k.t < 0.42); }
  for (const R of CFX.rings) {   // the shockwave: a flat ring of light racing out along the ground
    R.t += dt; const u = R.t / R.life, e = 1 - (1 - u) * (1 - u), r = R.r * (0.15 + 0.85 * e), n = 40;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283; stat(R.x + Math.cos(a) * r, 2, R.y + Math.sin(a) * r, 7 * (1 - u) + 3, 1, 1, 1, 0.8 * (1 - u), 0); stat(R.x + Math.cos(a) * r * 0.9, 2, R.y + Math.sin(a) * r * 0.9, 12 * (1 - u) + 4, R.c[0], R.c[1], R.c[2], 0.5 * (1 - u), 0); }
  }
  CFX.rings = CFX.rings.filter(R => R.t < R.life);
  for (const P of CFX.pillars) {   // a column of light where it stood
    P.t += dt; const u = P.t / P.life, w = 1 - u;
    for (let i = 0; i < 12; i++) { const f = i / 11; stat(P.x, f * P.h * (0.6 + 0.4 * u), P.y, (26 - 14 * f) * w + 2, lerp(1, P.c[0], f), lerp(1, P.c[1], f), lerp(1, P.c[2], f), 0.35 * w * (1 - f * 0.6), 0); }
  }
  CFX.pillars = CFX.pillars.filter(P => P.t < P.life);
  combatDraw(rdt, now);
}

// ---- the flat layer over the view ----
const sEase = u => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
function fxText(txt, x, y, size, rgb, a, opt = {}) {   // slanted arcade numerals: a dark rim, then the fill
  const g = fx2; g.save(); g.translate(x, y); g.transform(1, 0, -0.18, 1, 0, 0); if (opt.s) g.scale(opt.s, opt.s);
  g.font = `${opt.w || 700} ${Math.round(size)}px "IBM Plex Mono", ui-monospace, monospace`; g.textAlign = opt.align || 'center'; g.textBaseline = 'middle';
  g.globalAlpha = Math.max(0, Math.min(1, a));
  g.lineJoin = 'round'; g.lineWidth = Math.max(2, size * 0.16); g.strokeStyle = 'rgba(8,6,4,0.85)'; g.strokeText(txt, 0, 0);
  if (opt.glow) { g.shadowColor = `rgba(${opt.glow},0.85)`; g.shadowBlur = opt.blur || 12; }
  g.fillStyle = `rgb(${rgb})`; g.fillText(txt, 0, 0);
  g.restore();
}
const _q0 = [0, 0, 0], _q1 = [0, 0, 0];
function combatDraw(rdt, now) {
  const g = fx2, rg = S.rg, p = S.p, alert = alertScan(rdt);
  const busy = alert || bossBusy() || cookBusy() || aimBusy() || CFX.hurt || CFX.threats.length || (rg.slashes && rg.slashes.length) || CFX.sl.length || (rg.rdPops && rg.rdPops.length) || (rg.wpops && rg.wpops.length) || (rg.wcracks && rg.wcracks.length) || (rg.wlines && rg.wlines.length)
    || CFX.marks.length || CFX.kflash || (rg.stkfx && (rg.stk && rg.stk.n || rg.stkfx.pops.length || rg.stkfx.words.length || rg.stkfx.tier || rg.stkfx.cash || rg.stkfx.lost || rg.stkfx.drop));
  if (!busy && !fxDirty) return;
  g.setTransform(FD, 0, 0, FD, 0, 0); g.clearRect(0, 0, FW, FH); fxDirty = !!busy;
  if (!busy || state !== 'play') return;
  const cx = cam.position.x, cz = cam.position.z;
  g.lineCap = 'round'; g.lineJoin = 'round';
  // splits in the ground, glowing hot inside, then closing over
  for (const k of rg.wcracks || []) {
    const u = k.t / k.life, a = (1 - u) * (1 - u), segs = k.big ? 14 : 5, pts = [];
    for (let j = 0; j <= segs; j++) { const f = j / segs, off = (hash(k.seed + j, 3.1) - 0.5) * (k.big ? 14 : 8) * Math.sin(f * Math.PI + 0.2); const q = scr(k.x + Math.cos(k.a) * k.len * f - Math.sin(k.a) * off, 0.6, k.y + Math.sin(k.a) * k.len * f + Math.cos(k.a) * off); if (q) pts.push(q.slice()); }
    if (pts.length < 2) continue;
    const line = () => { g.beginPath(); pts.forEach(([x, y], j) => j ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }, z = Math.min(4, pts[0][2]);
    g.strokeStyle = `rgba(12,9,6,${0.85 * Math.min(1, (1 - u) * 3)})`; g.lineWidth = (k.big ? 6 : 3.5) * z; line();
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,140,50,${0.8 * a})`; g.lineWidth = (k.big ? 2.6 : 1.4) * z; line(); g.globalCompositeOperation = 'source-over';
  }
  g.globalCompositeOperation = 'lighter';
  // lines of light left hanging in the air
  for (const L of rg.wlines || []) {
    const u = L.t / L.life, a = scr(L.x0, 20, L.y0, _q0), b = a && scr(L.x1, 20, L.y1, _q1); if (!a || !b) continue;
    const z = Math.min(4, (a[2] + b[2]) / 2);
    g.strokeStyle = `rgba(${L.col},${0.45 * (1 - u)})`; g.lineWidth = (L.w || 1) * 9 * z; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.strokeStyle = `rgba(255,252,240,${1 - u})`; g.lineWidth = (L.w || 1) * 2.4 * z; g.stroke();
  }
  // the swing: a crescent of light sweeping across your view the way the blade goes, white-hot on its leading edge
  for (const s of (rg.slashes || []).concat(CFX.sl)) drawCrescent(g, s);
  // kill pops: a white flash in the body, a ring in its colour, four ticks flying out
  for (const k of rg.rdPops || []) {
    const q = scr(k.x, k.h * 0.55, k.y, _q0); if (!onScr(q)) continue;
    const u = k.t / 0.42, Z = Math.min(3.2, q[2]), [x, y] = q, r = (8 + 30 * (1 - (1 - u) * (1 - u))) * Z * Math.sqrt(k.h / 34);
    if (u < 0.25) { const gr = g.createRadialGradient(x, y, 0, x, y, r * 0.9); gr.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - u / 0.25)})`); gr.addColorStop(1, `rgba(${k.col},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 0.9, 0, 7); g.fill(); }
    g.strokeStyle = `rgba(${k.col},${0.95 * (1 - u)})`; g.lineWidth = (3.5 * (1 - u) + 0.5) * Z; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
    g.strokeStyle = `rgba(255,250,240,${1 - u})`; g.lineWidth = 1.6 * Z;
    for (let i = 0; i < 4; i++) { const a = k.a + i * Math.PI / 2, r0 = r * 0.6, r1 = r * (1.05 + 0.35 * (1 - u)); g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke(); }
  }
  // the crosshair answers: a hit flicks four white ticks out, a kill flings them wide in its colour
  const mx = FW / 2, my = FH / 2;
  for (const m of CFX.marks) {
    m.t += rdt; const L = m.kill ? 0.38 : 0.2, u = m.t / L, r0 = (m.kill ? 9 : 7) + (m.kill ? 16 : 7) * sEase(u), r1 = r0 + (m.kill ? 13 : 8) * (1 - u * 0.5);
    g.strokeStyle = `rgba(${m.kill ? m.col : '255,252,245'},${1 - u})`; g.lineWidth = m.kill ? 3 : 2;
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; g.beginPath(); g.moveTo(mx + Math.cos(a) * r0, my + Math.sin(a) * r0); g.lineTo(mx + Math.cos(a) * r1, my + Math.sin(a) * r1); g.stroke(); }
  }
  CFX.marks = CFX.marks.filter(m => m.t < (m.kill ? 0.38 : 0.2));
  // a kill flares the edges of the view in its colour
  if (CFX.kflash) {
    const K = CFX.kflash; K.t += rdt; const u = K.t / 0.3, gr = g.createRadialGradient(mx, my, Math.min(FW, FH) * 0.25, mx, my, Math.hypot(FW, FH) / 2);
    gr.addColorStop(0, `rgba(${K.col},0)`); gr.addColorStop(1, `rgba(${K.col},${K.k * (1 - u)})`); g.fillStyle = gr; g.fillRect(0, 0, FW, FH);
    if (u >= 1) CFX.kflash = null;
  }
  g.globalCompositeOperation = 'source-over';
  // words punching up off the bodies
  for (const w of rg.wpops || []) {
    const q = scr(w.x, w.h, w.y, _q0); if (!onScr(q, 200)) continue;
    const u = w.t, pop = u < 0.12 ? 1.6 - 0.6 * (u / 0.12) : 1, a = u > 0.7 ? (1 - u) / 0.3 : 1, zk = Math.max(0.9, Math.min(1.6, q[2] * 0.9));
    fxText(w.text, q[0], q[1] - 18 * u * zk, 21 * (w.s || 1) * zk, w.col, a, { s: pop, glow: w.col, blur: 12 });
  }
  bossDraw(g, rdt);
  cookDraw(g);
  aimDraw(g);
  alertDraw(g, rdt);
  drawThreats(g, rdt);
  stkDrawFp(rdt);
}

function drawCrescent(g, s) {
  if (outsideP()) return;   // seen from outside the blade itself leaves the smear (76-body.js)
  const k = s.t / s.life, fade = (1 - k * k) * (s.dim || 1), tint = s.tint || ['255,150,60', '255,200,120', '255,248,225'];
  const thrust = s.i === 3 || (s.cleave && !s.whirl && (s.life || 0) < 0.2), whirl = s.whirl || s.ring, chop = s.i === 2;
  const sweep = sEase(Math.min(1, s.t / (thrust ? 0.06 : 0.11))), M = Math.min(FW, FH);
  if (thrust) {   // a spear of light driving out from your hand to the point you aim at, with the air rushing in round it
    const x0 = FW * 0.66, y0 = FH * 1.02, x1 = FW / 2, y1 = FH / 2, f = sweep, xe = x0 + (x1 - x0) * f, ye = y0 + (y1 - y0) * f, nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny), w = M * 0.05;
    const gr = g.createLinearGradient(x0, y0, xe, ye); gr.addColorStop(0, `rgba(${tint[0]},0)`); gr.addColorStop(0.6, `rgba(${tint[1]},${0.6 * fade})`); gr.addColorStop(1, `rgba(${tint[2]},${fade})`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0 + nx / nl * w, y0 + ny / nl * w); g.lineTo(xe, ye); g.lineTo(x0 - nx / nl * w, y0 - ny / nl * w); g.closePath(); g.fill();
    g.strokeStyle = `rgba(255,252,242,${0.8 * fade})`; g.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + 0.3, r0 = M * (0.08 + 0.1 * k), r1 = r0 + M * 0.1 * (1 - k); g.beginPath(); g.moveTo(x1 + Math.cos(a) * r1, y1 + Math.sin(a) * r1); g.lineTo(x1 + Math.cos(a) * r0, y1 + Math.sin(a) * r0); g.stroke(); }
    return;
  }
  // an ellipse round the middle of the view; the cut runs along it from where the blade starts to where it ends
  const side = s.side || 1, cx = FW / 2, cy = chop ? FH * 0.5 : whirl ? FH * 0.66 : FH * 0.74;
  const rx = chop ? M * 0.24 : FW * 0.44, ry = chop ? FH * 0.46 : whirl ? FH * 0.2 : FH * 0.44, tilt = chop ? 0.12 * side : whirl ? 0 : side * 0.22;
  const span = whirl ? Math.PI * 2 : Math.PI + 0.6, th0 = chop ? -Math.PI / 2 - 0.3 : side > 0 ? 0.3 : Math.PI - 0.3, dir = chop ? 1 : side > 0 ? -1 : 1;
  const lead = sweep, tail = Math.max(0, lead - 0.85) + 0.75 * sEase(Math.max(0, (s.t - 0.06) / (s.life - 0.06)));
  if (lead - tail < 0.01) return;
  const n = 26, ct = Math.cos(tilt), st = Math.sin(tilt), wMax = M * (whirl ? 0.1 : 0.17);
  const at = (f, inset) => { const th = th0 + dir * span * f, x = Math.cos(th) * (rx - inset), y = Math.sin(th) * (ry - inset * ry / rx); return [cx + x * ct - y * st, cy + x * st + y * ct]; };
  const outer = [], inner = [];
  for (let j = 0; j <= n; j++) { const f = tail + (lead - tail) * j / n, w = wMax * (0.12 + 0.88 * Math.pow(j / n, 0.9)); outer.push(at(f, 0)); inner.push(at(f, w)); }
  const a = outer[0], b = outer[n], gr = g.createLinearGradient(a[0], a[1], b[0], b[1]);
  gr.addColorStop(0, `rgba(${tint[0]},0)`); gr.addColorStop(0.45, `rgba(${tint[1]},${0.6 * fade})`); gr.addColorStop(1, `rgba(${tint[2]},${0.95 * fade})`);
  g.fillStyle = gr; g.beginPath(); outer.concat(inner.reverse()).forEach(([x, y], j) => j ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
  const edge = (w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); for (let j = Math.floor(n * 0.3); j <= n; j++) { const [x, y] = outer[j]; j > Math.floor(n * 0.3) ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
  edge(M * 0.03, `rgba(${tint[0]},${0.3 * fade})`);       // a warm glow round the edge
  edge(M * 0.009, `rgba(${tint[1]},${0.85 * fade})`);
  edge(Math.max(2, M * 0.004), `rgba(255,252,242,${fade})`);   // the white-hot leading edge
  if (sweep < 1) { const gl = g.createRadialGradient(b[0], b[1], 0, b[0], b[1], M * 0.06); gl.addColorStop(0, `rgba(255,252,240,${fade})`); gl.addColorStop(1, `rgba(${tint[1]},0)`); g.fillStyle = gl; g.beginPath(); g.arc(b[0], b[1], M * 0.06, 0, 7); g.fill(); }
}

// ---- the streak, as the top-down game draws it, anchored up over the middle of your view ----
function stkAnchorFp() { return FW >= FH ? [FW / 2 + Math.min(FW * 0.2, 210), FH * 0.42] : [FW / 2 - 20, FH * 0.64]; }   // beside where you aim, clear of the notes up top
const stkUFp = () => Math.max(0.8, Math.min(1.15, Math.min(FW, FH) / 540));
function stkDrawFp(dt) {
  const rg = S.rg, F = rg.stkfx; if (!F || !stkOn()) return;
  const g = fx2, k = rg.stk, live = k && k.n >= 2, [ax, ay] = stkAnchorFp();
  const T = live ? STK_TIERS[k.tier] : STK_TIERS[0], tcol = COLOUR ? T.col.join(',') : '239,239,234';
  F.punch = Math.max(0, F.punch - dt * 5); F.crack = Math.max(0, F.crack - dt * 2.2); F.glow = Math.max(0, F.glow - dt * 1.6);
  // the edges warm as the streak climbs, with a flare on each tier up
  if (stkLoud() && live && k.tier > 0) {
    const a = 0.05 * k.tier + 0.22 * F.glow, gr = g.createRadialGradient(FW / 2, FH / 2, Math.min(FW, FH) * 0.32, FW / 2, FH / 2, Math.hypot(FW, FH) / 2);
    gr.addColorStop(0, 'rgba(255,130,40,0)'); gr.addColorStop(1, `rgba(255,${COLOUR ? 120 : 200},${COLOUR ? 40 : 160},${a})`);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(0, 0, FW, FH); g.restore();
  }
  // a tier up: a ring of light snapping out along the ground round you
  if (F.ring.length) {
    for (const r of F.ring) { r.t += dt; const u = r.t / 0.45, R = 20 + 190 * sEase(u), c = rgbOf(tcol); for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283; stat(S.p.x + Math.cos(a) * R, 3, S.p.y + Math.sin(a) * R, 9 * (1 - u) + 3, c[0], c[1], c[2], 0.9 * (1 - u), 0); } }
    F.ring = F.ring.filter(r => r.t < 0.45);
  }
  // the points: burst out of the body, hang a beat, then arc into the counter
  for (const P of F.pops) {
    P.t += dt;
    const U1 = 0.26, U2 = P.big ? 0.62 : 0.56;
    let x, y, s, a = 1;
    if (P.t < U1) {
      const q = scr(P.x, P.z + 8, P.y, _q0), u = P.t / U1;
      if (q && onScr(q, 40)) { x = q[0]; y = q[1] - 18 * sEase(u) * Math.min(3, q[2]); } else { x = P.sx ?? ax; y = P.sy ?? ay + 60; }
      s = u < 0.35 ? 1.7 - 0.9 * (u / 0.35) : 0.8 + 0.2 * Math.min(1, (u - 0.35) / 0.3) + 0.08 * Math.sin(Math.min(1, (u - 0.35) / 0.65) * Math.PI);
      P.sx = x; P.sy = y;
    } else {
      const u = (P.t - U1) / (U2 - U1), e = u * u;
      x = P.sx + (ax - P.sx) * e; y = P.sy + (ay - P.sy) * e - Math.sin(u * Math.PI) * 50;
      s = 1 - 0.45 * u; a = 1 - 0.3 * u;
      if (u >= 1 && !P.in) { P.in = true; F.punch = 1; F.shown += P.v; }
    }
    if (P.in) continue;
    const size = P.big ? 30 : P.spot ? 18 : 22;
    if (P.t >= U1) {   // sparks trailing it along its path
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(${P.col},0.55)`;
      for (let j = 1; j <= 4; j++) { g.beginPath(); g.arc(x + (P.sx - x) * 0.06 * j, y + (P.sy - y) * 0.06 * j, 3 - 0.55 * j, 0, 7); g.fill(); }
      g.restore();
    } else if (P.t < 0.12) {   // a thin white ring snapping out of the body
      const u = P.t / 0.12; g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,250,240,${1 - u})`; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(x, y + 12, 8 + 34 * u, 5 + 18 * u, 0, 0, 7); g.stroke(); g.restore();
    }
    fxText(P.spot ? 'SPOTTED' : `+${Math.round(P.v).toLocaleString()}`, x, y, size, P.col, a, { s });
  }
  F.pops = F.pops.filter(P => !P.in);
  // the counter itself
  const U = stkUFp(); g.save(); g.translate(ax, ay); g.scale(U, U); g.translate(-ax, -ay);
  const show = live || F.cash ? 1 : 0;
  if (show > 0.01) {
    const sh = F.crack > 0 ? (Math.random() - 0.5) * 7 * F.crack : 0, pu = 1 + 0.32 * F.punch * F.punch;
    const cx = ax + sh, cy = ay;
    if (F.cash) {   // cashing out: the total counts up, swells, then lifts away
      const C = F.cash; C.t += dt;
      const u = sEase(C.t / 0.55), n = Math.round(C.pts * u), sw = 1 + 0.35 * Math.max(0, 1 - Math.abs(C.t - 0.6) / 0.2);
      const fa = C.t < 1.3 ? 1 : Math.max(0, 1 - (C.t - 1.3) / 0.45), lift = Math.max(0, C.t - 1.3) * 30;
      const cc = COLOUR ? STK_TIERS[C.tier].col.join(',') : '239,239,234';
      fxText(n.toLocaleString(), cx, cy - lift, 32 * sw, cc, fa, { glow: C.tier > 0 ? cc : null, blur: 16 });
      fxText(`STREAK ${C.n}${C.tier ? ' · x' + STK_TIERS[C.tier].m : ''}`, cx, cy + 26 - lift, 12, '239,239,234', fa * 0.85, { w: 600 });
      if (C.t > 1.75) F.cash = null;
    } else {
      const n = live ? k.n : (F.lastN || 0); if (live) { F.lastN = k.n; F.lastM = T.m; F.lastPts = k.pts; }
      const m = live ? T.m : F.lastM || 1;
      fxText(`${n}`, cx - (m > 1 ? 16 : 0), cy, 40 * pu, tcol, show, { glow: m > 1 && stkLoud() ? tcol : null, blur: 10 + 8 * F.punch });
      if (m > 1) fxText(`x${m}`, cx + 26 + (n > 9 ? 11 : 0) + (n > 99 ? 11 : 0), cy + 5, 22 * (1 + 0.4 * F.glow), tcol, show);
      // the timer: a thin bar draining in to the middle, flickering in its last moments
      const left = live ? Math.max(0, k.t / stkWin(k)) : 0, bw = 80, low = live && k.t < 0.6;
      g.save(); g.globalAlpha = show * (low ? 0.55 + 0.45 * Math.sin(S.t * 40) : 1);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(cx - bw / 2 - 1, cy + 23, bw + 2, 5);
      g.fillStyle = `rgb(${tcol})`; g.fillRect(cx - bw / 2 * left, cy + 24, bw * left, 3);
      g.restore();
      if (live) F.shown += (k.pts - F.shown) * Math.min(1, dt * 10);
      fxText(Math.round(live ? F.shown : F.lastPts || 0).toLocaleString(), cx, cy + 39, 12, '239,239,234', show * 0.8, { w: 600 });
      if (live && T.name && !(F.tier && F.tier.t < 0.5)) fxText(T.name, cx, cy - 31, 13, tcol, show * 0.9, { w: 700 });
    }
    if (F.crack > 0.05) {   // the hit: a crack across the counter
      g.save(); g.strokeStyle = `rgba(255,90,70,${F.crack})`; g.lineWidth = 2; g.beginPath();
      g.moveTo(cx - 30, cy - 16); g.lineTo(cx - 7, cy - 2); g.lineTo(cx - 14, cy + 7); g.lineTo(cx + 12, cy + 16); g.moveTo(cx - 7, cy - 2); g.lineTo(cx + 16, cy - 12); g.stroke(); g.restore();
    }
  }
  // bonus words, stacked to the right of the counter
  F.words.forEach((w, i) => {
    w.t += dt; const a = Math.min(1, w.t / 0.06) * Math.max(0, 1 - Math.max(0, w.t - 0.85) / 0.3), s = 1 + 0.5 * Math.max(0, 1 - w.t / 0.12);
    const y = ay - 12 + (i - (F.words.length - 1)) * 17, x = ax + 58 + 14 * Math.max(0, 1 - w.t / 0.1);
    fxText(w.c > 1 && w.id !== 'quick' ? `${w.txt} x${w.c}` : w.txt, x, y, w.id === 'nohit' || w.id === 'boss' || w.id === 'untouched' ? 16 : 13, w.id === 'last' ? '255,90,80' : '255,240,220', a, { align: 'left', s, w: 700 });
  });
  F.words = F.words.filter(w => w.t < 1.15);
  g.restore();
  // a tier up: its name slams into the middle of the screen, then shrinks into the counter
  if (F.tier) {
    const R = F.tier; R.t += dt;
    if (stkLoud()) {
      const u = R.t, cc = COLOUR ? R.col.join(',') : '239,239,234', fs = Math.min(72, FW / 8);
      let x = FW / 2, y = FH * 0.36, s, a = 1;
      if (u < 0.1) s = 2.4 - 1.4 * (u / 0.1); else if (u < 0.32) s = 1 + 0.06 * Math.sin((u - 0.1) / 0.22 * Math.PI); else { const v = sEase((u - 0.32) / 0.22); s = 1 - 0.8 * v; x += (ax - x) * v; y += (ay - 31 - y) * v; a = 1 - 0.5 * v; }
      if (u < 0.08) { g.save(); g.fillStyle = `rgba(255,240,220,${0.18 * (1 - u / 0.08)})`; g.fillRect(0, 0, FW, FH); g.restore(); }
      fxText(R.name, x, y, fs, cc, a, { s, glow: cc, blur: 22 });
      if (u < 0.32) fxText(`x${R.m}`, x, y + fs * 0.75 * s, fs * 0.42, cc, a, { s });
    }
    if (R.t > 0.54) F.tier = null;
  }
  if (F.drop) { F.drop.t += dt; if (F.drop.t < 0.6 && F.drop.name) fxText(F.drop.name, ax, ay - 46 - 34 * F.drop.t, 13, '255,90,70', 1 - F.drop.t / 0.6, { w: 700, s: 1 + 0.3 * F.drop.t }); else if (F.drop.t >= 0.6) F.drop = null; }
  if (F.lost) { F.lost.t += dt; const u = F.lost.t; fxText(`STREAK LOST · ${F.lost.n}`, ax, ay + 10 * u, 15, '255,90,70', Math.max(0, 1 - u / 1.4), { w: 700 }); if (u > 1.4) F.lost = null; }
}

// ---- what's behind you: the blow that got you, and what's coming that you can't see ----
// Where something is, as an angle round the middle of the screen: straight ahead is up, behind you is down.
function viewAngle(x, y) {
  const dx = x - cam.position.x, dy = y - cam.position.z, yaw = look.yaw;
  const fwd = -dx * Math.sin(yaw) - dy * Math.cos(yaw), right = dx * Math.cos(yaw) - dy * Math.sin(yaw);
  return { th: Math.atan2(-fwd, right), off: Math.atan2(right, fwd), d: Math.hypot(dx, dy) };
}
const FP_NAME = { shade: 'SHADE', stalker: 'STALKER', brute: 'BRUTE', tall: 'TALL ONE', bomber: 'BOMB', laser: 'LASER', kamikaze: 'KAMIKAZE', splitter: 'SPLITTER', splitling: 'SPLITTER', centi: 'CENTIPEDE', spear: 'SPEAR', archer: 'ARROW', wolf: 'WOLF', boar: 'BOAR', bear: 'BEAR' };
function rdHitBy(e, kind) {   // something got you: remember where from, and take the blow on the chin
  const p = S.p, src = e && e.x !== undefined ? e : null, x = src ? src.x : p.x, y = src ? src.y : p.y + 1;
  const col = kind === 'shield' ? '200,225,255' : kind === 'steel' ? '210,215,230' : '255,70,50';
  CFX.hurt = { t: 0, x, y, ref: src, col, name: src ? FP_NAME[src.type || src.k] || '' : '', heart: kind === 'heart' };
  const v = viewAngle(x, y), side = Math.cos(v.th) >= 0 ? 1 : -1, behind = Math.sin(v.th) > 0.3;
  // your head snaps away from it, the view drops and staggers, the world goes tight for a beat
  VIEW_FX.roll -= side * (kind === 'heart' ? 0.11 : 0.06); VIEW_FX.fov -= kind === 'heart' ? 7 : 4; VIEW_FX.dip += kind === 'heart' ? 9 : 5;
  camKick(Math.atan2(p.y - y, p.x - x), kind === 'heart' ? 9 : 5);
  if (behind) look.yaw += side * 0.06;   // hit from behind: it turns you a little toward it
  if (actx && sfxGain) { const t = actx.currentTime; boomAt(t, 120, 38, 0.3, kind === 'heart' ? 0.55 : 0.3, sfxGain); noiseAt(t, 2200, 260, 0.16, kind === 'heart' ? 0.4 : 0.25, sfxGain); }
}
function foeWinding(e) { return (e.sw && e.sw.ph === 'wind') || e.ai === 'wind' || e.ai === 'draw' || e.ai === 'aim' || (e.type === 'kamikaze' && e.lit); }
function threatScan(dt) {   // what's close and out of sight, nearest first
  const rg = S.rg, T = CFX.threats; T.length = 0;
  if (state !== 'play' || rg.phase === 'dead') return;
  const hfov = Math.atan(Math.tan(cam.fov * Math.PI / 360) * cam.aspect) * 0.85;
  for (const e of rg.enemies) {
    if (e.dead) continue;
    const v = viewAngle(e.x, e.y); if (v.d > 320) continue;
    const wind = foeWinding(e);
    if (Math.abs(v.off) < hfov && !(wind && v.d < 60 && Math.abs(v.off) > hfov * 0.7)) continue;
    T.push({ e, th: v.th, d: v.d, wind, col: typeof rdCol === 'function' ? rdCol(e.type) : '236,226,210' });
    if (wind && v.d < 200 && !CFX.warned.has(e.sw || e)) { CFX.warned.add(e.sw || e); warnCue(e); }
  }
  T.sort((a, b) => a.d - b.d); if (T.length > 6) T.length = 6;
}
function warnCue(e) {   // a sharp rising hiss from where it's winding up, so you hear it coming
  if (!actx || !noiseBuf) return;
  const out = placeOut(e.x, e.y, 0.9, 400); if (!out) return;
  const t = actx.currentTime, src = actx.createBufferSource(), bp = actx.createBiquadFilter(), g = actx.createGain();
  src.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.value = 4; bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(4200, t + 0.28);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  src.connect(bp); bp.connect(g); g.connect(out); src.start(t, Math.random() * 0.5); src.stop(t + 0.36);
}
function drawThreats(g, dt) {
  const cx = FW / 2, cy = FH / 2, M = Math.min(FW, FH), RX = FW * 0.36, RY = FH * 0.29;   // a ring round where you aim, clear of the hotbar
  // things you can't see: a chevron on the ring pointing at each, red and pulsing if it's about to strike
  for (const q of CFX.threats) {
    const near = 1 - Math.min(1, q.d / 320), u = q.wind ? 0.6 + 0.4 * Math.abs(Math.sin(S.t * 18)) : 0.35 + 0.5 * near;
    const sz = (q.wind ? 16 : 10) + 8 * near, x = cx + Math.cos(q.th) * RX, y = cy + Math.sin(q.th) * RY, ca = Math.cos(q.th), sa = Math.sin(q.th);
    const col = q.wind ? (Math.sin(S.t * 18) > 0 ? '255,70,50' : '255,235,220') : q.col;
    g.save(); g.translate(x, y); g.rotate(q.th); g.globalAlpha = u;
    g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = 'rgba(8,6,4,0.7)';
    const path = () => { g.beginPath(); g.moveTo(sz, 0); g.lineTo(-sz * 0.4, -sz * 0.75); g.lineTo(0, 0); g.lineTo(-sz * 0.4, sz * 0.75); g.closePath(); };
    path(); g.stroke(); g.fillStyle = `rgb(${col})`; path(); g.fill();
    g.restore();
    if (q.wind) { g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(cx + ca * FW, cy + sa * FH, 0, cx + ca * FW, cy + sa * FH, M * 0.9); gr.addColorStop(0, `rgba(255,60,40,${0.28 * u})`); gr.addColorStop(1, 'rgba(255,60,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, FW, FH); g.restore(); }
  }
  // the blow that got you: an arc on the ring pointing back at it (following it if it's still about), its name, that edge of the view red
  const H = CFX.hurt;
  if (H) {
    H.t += dt; const u = H.t / 1.6, a = u < 0.7 ? 1 : Math.max(0, (1 - u) / 0.3), src = H.ref && !H.ref.dead ? H.ref : H;
    const th = viewAngle(src.x, src.y).th, pop = 1 + 0.25 * Math.max(0, 1 - H.t / 0.15), rx = RX * pop, ry = RY * pop;
    g.save(); g.globalAlpha = a; g.lineCap = 'round';
    g.strokeStyle = 'rgba(8,6,5,0.75)'; g.lineWidth = 14; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, th - 0.42, th + 0.42); g.stroke();
    g.strokeStyle = `rgb(${H.col})`; g.lineWidth = 8; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, th - 0.42, th + 0.42); g.stroke();
    if (H.name) fxText(H.name, cx + Math.cos(th) * (rx - 30), cy + Math.sin(th) * (ry - 24), 13, H.col, a, { w: 700 });
    if (H.t < 0.5) { const k = 1 - H.t / 0.5, ex = cx + Math.cos(th) * FW * 0.75, ey = cy + Math.sin(th) * FH * 0.75, gr = g.createRadialGradient(ex, ey, 0, ex, ey, M);
      gr.addColorStop(0, `rgba(${H.col},${(H.heart ? 0.55 : 0.3) * k})`); gr.addColorStop(1, `rgba(${H.col},0)`); g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, FW, FH); }
    // three raking claw marks across the view from the side it came, for a heart lost
    if (H.heart && H.t < 0.7) {
      const k = 1 - H.t / 0.7, sd = Math.cos(th) >= 0 ? 1 : -1, L = Math.min(FW * 0.5, M * 0.9); g.globalAlpha = k;
      for (let i = 0; i < 3; i++) {
        const x0 = cx + sd * L * 0.55 + sd * i * 14, y0 = cy - M * 0.3 + i * M * 0.09, x1 = x0 - sd * L, y1 = y0 + M * 0.32, mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - M * 0.04, w = 9 - i * 1.5;
        const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny), ox = nx / nl * w, oy = ny / nl * w;
        g.fillStyle = 'rgba(120,8,4,0.9)'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx + ox, my + oy, x1, y1); g.quadraticCurveTo(mx - ox, my - oy, x0, y0); g.fill();
        g.fillStyle = 'rgba(255,90,60,0.8)'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx + ox * 0.3, my + oy * 0.3, x1, y1); g.quadraticCurveTo(mx - ox * 0.3, my - oy * 0.3, x0, y0); g.fill();
      }
    }
    g.restore();
    if (u >= 1) CFX.hurt = null;
  }
}

// ---- the way home: a little house over the camp, or on the ring pointing round to it when it's out of sight ----
// A page element moved about, not the flat drawing layer, so a quiet walk home costs that layer nothing.
const homeOn = () => state === 'play' && S && S.rg && !S.rg.inCamp && S.rg.phase !== 'dead' && Math.hypot(S.p.x, S.p.y) > 200 && !menusOpen();
const _hv = new V3(), homeEl = $('homeMark'), homeArrow = homeEl.querySelector('i'), homeTxt = homeEl.querySelector('span');
let homeM = -1;
function homeFrame() {
  if (!homeOn()) { homeEl.hidden = true; return; }
  const m = Math.round(Math.hypot(S.p.x, S.p.y) / 20); if (m !== homeM) { homeM = m; homeTxt.textContent = `HOME · ${m} m`; }
  _hv.set(0, terrH(0, 0) + 70, 0).applyMatrix4(cam.matrixWorldInverse);
  const fwd = -_hv.z, right = _hv.x, cx = FW / 2, cy = FH / 2;
  let x, y, th = null;
  if (fwd > 3) {   // in front: over the camp itself, if that's on the screen
    _hv.applyMatrix4(cam.projectionMatrix); x = (_hv.x + 1) / 2 * FW; y = (1 - _hv.y) / 2 * FH;
    if (!(x > 40 && x < FW - 40 && y > 50 && y < FH - 90)) x = null;
  }
  if (x == null) {   // out of sight: on the ring round where you aim, the same as what's coming for you, pointing the way round
    th = Math.atan2(-fwd, right); x = cx + Math.cos(th) * FW * 0.36 * 1.12; y = Math.min(FH - 100, cy + Math.sin(th) * FH * 0.29 * 1.12);
  }
  homeEl.hidden = false; homeEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  homeArrow.hidden = th === null; if (th !== null) homeArrow.style.transform = `rotate(${th.toFixed(3)}rad) translateX(26px)`;
}
