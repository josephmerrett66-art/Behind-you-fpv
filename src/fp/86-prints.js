// ================= your own tracks: boot prints left behind you =================
// Joe: "please add your own character footprints left behind you". Each step you take leaves a print where that foot came
// down, left and right in turn: a boot, sole and heel, not the clan's bare feet, so you can tell your trail from theirs. In
// the woods it's a dark dent in the soil, on the beach a shadowed hollow in the sand. They don't stay for ever: after a few
// minutes they fill in and fade into the ground, sooner in the rain, and down where the waves run up the sand the sea takes
// them in a few seconds. None in water or underground.
const PRINTS = { gap: 9, cap: 240, life: 210, fade: 70, wetLife: 14, R: 620, foot: 2.7 };
PT.print = new Part(new THREE.SphereGeometry(0.5, 10, 5), PRINTS.cap * 2 + 8, false);
function youPrint(side) {
  const p = S && S.p; if (!p || !S.day || !S.rg || S.rg.phase !== 'fight') return;
  if (caveIn() || lakeAt(p.x, p.y, 4)) return;
  const cs = coastS(p.x, p.y); if (cs > -6) return;   // out in the sea
  const v = Math.hypot(p.vx, p.vy); if (v < 8) return;
  const L = p.prints || (p.prints = []), last = L[L.length - 1];
  if (last && Math.hypot(last[0] - p.x, last[1] - p.y) < PRINTS.gap) return;   // shuffling on the spot: one print will do
  const a = Math.atan2(p.vy, p.vx), s = side * PRINTS.foot;
  L.push([p.x - Math.sin(a) * s, p.y + Math.cos(a) * s, a, S.t, cs > -170 ? (cs > -35 ? 2 : 1) : 0]);   // where, which way, when, and on what: soil, sand, wet sand
  if (L.length > PRINTS.cap) L.shift();
}
{ const st = FPX.step; FPX.step = function (running, side) { st.call(this, running, side); youPrint(side); }; }
function youPrintsDraw(dt) {
  const p = S.p, L = p && p.prints; if (!L || !L.length) return;
  // the rain washes them out faster; the sea takes the ones on wet sand
  const rain = typeof wxK === 'function' ? wxK('rain') : 0, now = S.t;
  for (let i = L.length - 1; i >= 0; i--) {
    const q = L[i], life = q[4] === 2 ? PRINTS.wetLife : PRINTS.life;
    if (rain > 0.05) q[3] -= dt * 4 * rain;   // ageing faster in the rain
    if (now - q[3] > life) L.splice(i, 1);
  }
  const COL = [hex('#3c3024'), hex('#a8946e'), hex('#857560')];
  for (const [x, y, a, t, k] of L) {
    if (Math.abs(x - p.x) > PRINTS.R || Math.abs(y - p.y) > PRINTS.R) continue;
    const life = k === 2 ? PRINTS.wetLife : PRINTS.life, fade = k === 2 ? 5 : PRINTS.fade, u = clamp((now - t - (life - fade)) / fade, 0, 1);
    const h = 0.15 - 0.34 * u * u, yaw = faceYaw(a), ca = Math.cos(a), sa = Math.sin(a), col = COL[k];   // filling in: it sinks into the ground till it's gone
    blob(PT.print, x + ca * 1.3, h, y + sa * 1.3, 2.3, 0.3, 3.4, yaw, col);   // the sole
    blob(PT.print, x - ca * 3.1, h, y - sa * 3.1, 1.9, 0.3, 1.8, yaw, col);   // the heel, a gap before it
  }
}
{ const df = drawFigures; drawFigures = function (now, dt) { df(now, dt); if (S && S.day) youPrintsDraw(dt || 0); }; }
