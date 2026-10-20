// ================= the fight, from behind your own eyes: a blow jars your hand, and one that gets you comes from somewhere =================
// v129 (Joe: "de-arcadeify ... a more kind of realistic, simple, real version"): the top-down game's light show is gone. No
// crescent of light sweeping across the view with every swing, no sparks and white stars off every blow, no kill bursting in
// its colour with a ring and a pillar of light, no flare round the edges, no crosshair flicking, no words punching up, no
// streak counting it all up. What's left is plain: your hand jars back when a blow lands, the blood is where it went in
// (62-plain), and a blow on you knocks your head away from it and reddens that edge of the view for a moment.
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

// ---- what the fight feels like in your hands ----
const CFX = { recoil: 0, atk: null, hurt: null, threats: [], warned: new WeakSet() };
function fxHit(e) { if (S.p.atk || S.p.wact) CFX.recoil = Math.max(CFX.recoil, 0.7); }   // your own blow landing: it jars back up your arm

// ---- each frame: notice new blows, age what's ours, draw the flat layer ----
function combatFrame(dt, rdt, now) {
  const rg = S.rg; if (!rg) return;
  threatScan(rdt);
  for (const e of rg.enemies) { if (e.dead || e.kHitT === undefined || e.kHitT === e.fxSeen) continue; e.fxSeen = e.kHitT; if (S.t - e.kHitT < 0.2) fxHit(e); }
  const A = S.p.atk; if (A && A !== CFX.atk) { CFX.atk = A; VIEW_FX.roll += (A.side || 1) * 0.012; }   // a new swing: your shoulders turn into it, a little
  CFX.recoil = Math.max(0, CFX.recoil - rdt * 6);
  combatDraw(rdt, now);
}

// ---- the flat layer over the view ----
const sEase = u => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
function fxText(txt, x, y, size, rgb, a, opt = {}) {   // slanted numerals, a dark rim then the fill (the stealth alerts, 63-alert)
  const g = fx2; g.save(); g.translate(x, y); g.transform(1, 0, -0.18, 1, 0, 0); if (opt.s) g.scale(opt.s, opt.s);
  g.font = `${opt.w || 700} ${Math.round(size)}px "IBM Plex Mono", ui-monospace, monospace`; g.textAlign = opt.align || 'center'; g.textBaseline = 'middle';
  g.globalAlpha = Math.max(0, Math.min(1, a));
  g.lineJoin = 'round'; g.lineWidth = Math.max(2, size * 0.16); g.strokeStyle = 'rgba(8,6,4,0.85)'; g.strokeText(txt, 0, 0);
  if (opt.glow) { g.shadowColor = `rgba(${opt.glow},0.85)`; g.shadowBlur = opt.blur || 12; }
  g.fillStyle = `rgb(${rgb})`; g.fillText(txt, 0, 0);
  g.restore();
}
const _q0 = [0, 0, 0];
function combatDraw(rdt, now) {
  const g = fx2, rg = S.rg, alert = alertScan(rdt);
  const busy = alert || cookBusy() || aimBusy() || CFX.hurt || CFX.threats.length || (rg.wpops && rg.wpops.length);
  if (!busy && !fxDirty) return;
  g.setTransform(FD, 0, 0, FD, 0, 0); g.clearRect(0, 0, FW, FH); fxDirty = !!busy;
  if (!busy || state !== 'play') return;
  g.lineCap = 'round'; g.lineJoin = 'round';
  // a word over something, small and plain, rising and fading: what came off a body you're cutting up (88-meat)
  for (const w of rg.wpops || []) {
    const q = scr(w.x, w.h, w.y, _q0); if (!onScr(q, 200)) continue;
    const u = w.t, a = Math.min(1, u / 0.1) * (u > 0.7 ? (1 - u) / 0.3 : 1), zk = Math.max(0.9, Math.min(1.4, q[2] * 0.9));
    g.save(); g.font = `600 ${Math.round(13 * zk)}px "IBM Plex Mono", ui-monospace, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = Math.max(0, a);
    g.lineWidth = 3; g.strokeStyle = 'rgba(8,6,4,0.6)'; g.strokeText(w.text, q[0], q[1] - 14 * u * zk); g.fillStyle = `rgb(${w.col})`; g.fillText(w.text, q[0], q[1] - 14 * u * zk); g.restore();
  }
  cookDraw(g);
  aimDraw(g);
  alertDraw(g, rdt);
  drawThreats(g, rdt);
}

// ---- what's behind you: the blow that got you, and what's coming that you can't see ----
// Where something is, as an angle round the middle of the screen: straight ahead is up, behind you is down.
function viewAngle(x, y) {
  const dx = x - cam.position.x, dy = y - cam.position.z, yaw = look.yaw;
  const fwd = -dx * Math.sin(yaw) - dy * Math.cos(yaw), right = dx * Math.cos(yaw) - dy * Math.sin(yaw);
  return { th: Math.atan2(-fwd, right), off: Math.atan2(right, fwd), d: Math.hypot(dx, dy) };
}
function rdHitBy(e, kind) {   // something got you: remember where from, and take the blow
  const p = S.p, src = e && e.x !== undefined ? e : null, x = src ? src.x : p.x, y = src ? src.y : p.y + 1;
  const col = kind === 'shield' ? '200,225,255' : kind === 'steel' ? '210,215,230' : '200,40,30';
  CFX.hurt = { t: 0, x, y, ref: src, col, heart: kind === 'heart' };
  const v = viewAngle(x, y), side = Math.cos(v.th) >= 0 ? 1 : -1;
  // your head goes with it, away from where it came from, and the view drops a little
  VIEW_FX.roll -= side * (kind === 'heart' ? 0.035 : 0.02); VIEW_FX.dip += kind === 'heart' ? 3 : 2;
  camKick(Math.atan2(p.y - y, p.x - x), kind === 'heart' ? 3 : 2);
  if (actx && sfxGain && !snd(kind === 'heart' ? 'hit_flesh' : 'punch', { v: kind === 'heart' ? 1.1 : 0.8, pan: side * -0.5 })) { const t = actx.currentTime; boomAt(t, 120, 38, 0.3, kind === 'heart' ? 0.55 : 0.3, sfxGain); noiseAt(t, 2200, 260, 0.16, kind === 'heart' ? 0.4 : 0.25, sfxGain); }
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
    // Joe: no chevrons pointing at what's behind you any more; you hear it winding up, that's all
    if (wind && v.d < 200 && !CFX.warned.has(e.sw || e)) { CFX.warned.add(e.sw || e); warnCue(e); }
  }
  T.sort((a, b) => a.d - b.d); if (T.length > 6) T.length = 6;
}
function warnCue(e) {   // a sharp rising hiss from where it's winding up, so you hear it coming
  if (!actx || !noiseBuf) return;
  const out = placeOut(e.x, e.y, 0.9, 400, e, 1.2); if (!out) return;
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
  // the blow that got you: that edge of the view goes red for a moment, the side it came from (following it if it's still about)
  const H = CFX.hurt;
  if (H) {
    H.t += dt; const src = H.ref && !H.ref.dead ? H.ref : H, th = viewAngle(src.x, src.y).th, k = 1 - H.t / 0.5;
    if (k > 0) { const ex = cx + Math.cos(th) * FW * 0.75, ey = cy + Math.sin(th) * FH * 0.75, gr = g.createRadialGradient(ex, ey, 0, ex, ey, M);
      gr.addColorStop(0, `rgba(${H.col},${(H.heart ? 0.4 : 0.22) * k})`); gr.addColorStop(1, `rgba(${H.col},0)`); g.fillStyle = gr; g.fillRect(0, 0, FW, FH); }
    else CFX.hurt = null;
  }
}

// ---- the way home: a little house over the camp, or on the ring pointing round to it when it's out of sight ----
// A page element moved about, not the flat drawing layer, so a quiet walk home costs that layer nothing.
const homeAt = () => NO_CAMP ? S && S.day && homeSpot() : { x: 0, y: 0 };   // with no camp, home is your bed or your nearest fire
const homeOn = () => { if (!(state === 'play' && S && S.rg && !S.rg.inCamp && S.rg.phase !== 'dead' && !menusOpen())) return false; const h = homeAt(); return !!h && Math.hypot(S.p.x - h.x, S.p.y - h.y) > 200; };
const _hv = new V3(), homeEl = $('homeMark'), homeArrow = homeEl.querySelector('i'), homeTxt = homeEl.querySelector('span');
let homeM = -1;
function homeFrame() {
  if (!homeOn()) { homeEl.hidden = true; return; }
  const h = homeAt(), m = Math.round(Math.hypot(S.p.x - h.x, S.p.y - h.y) / 20); if (m !== homeM) { homeM = m; homeTxt.textContent = `HOME · ${m} m`; }
  _hv.set(h.x, terrH(h.x, h.y) + 70, h.y).applyMatrix4(cam.matrixWorldInverse);
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
