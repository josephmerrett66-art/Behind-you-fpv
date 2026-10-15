// ---------------- aiming the bow (and the sling) ----------------
// Joe: you couldn't tell where an arrow would go. Now, while you draw, a guide shows it: a wedge on the ground for how far
// a shot might stray, the arc the arrow will fly along, and a ring where it comes down. A light pull is loose and short;
// the further you draw the narrower the wedge, until at full draw it closes to a single line and the arrow goes exactly
// there. It lands where your crosshair meets the ground, as far as the draw will carry it; look higher and it flies its
// full length. The guide and the flight use the same sums, so what you see is what it does.
const AIM_SPREAD = 0.2, AIM_NEAR = 50;
const aimSpread = c => AIM_SPREAD * Math.pow(1 - Math.min(1, c), 1.4);   // half-angle the shot can stray, in radians
function aimReach(kind, c) {   // how far this draw carries, and where under the crosshair that is
  const R = RNG[kind], max = R.rng[0] + (R.rng[1] - R.rng[0]) * Math.max(0.2, Math.min(1, c));
  const sp = Math.sin(look.pitch), d = sp < -0.02 ? EYE * Math.cos(look.pitch) / -sp : 1e9;
  return Math.max(AIM_NEAR, Math.min(max, d));
}
// height along the flight: it leaves your hand at bow height, rises a touch and comes down at the end
const shotZ = (L, u) => 22 * (1 - u) + (4 + 0.035 * L) * Math.sin(Math.PI * u);
function aimLooseAt(kind, c) {   // where this release goes: the way you face, strayed a little by a weak draw
  const s = aimSpread(c);
  return { off: s * (Math.random() * 2 - 1), L: aimReach(kind, c) };
}
function aimBusy() { return !!(S.day && S.day.draw && state === 'play' && !isoP()); }
function aimDraw(g) {
  const W = S.day && S.day.draw; if (!W || isoP()) return;
  const R = RNG[W.kind], c = Math.min(1, W.t / R.full), p = S.p, a = S.aimW, s = aimSpread(c), L = aimReach(W.kind, c), now = S.t;
  const d0 = thirdP() ? 48 : AIM_NEAR * 0.6, a0 = thirdP() ? 48 : 12;   // from behind, start clear of your own body
  const full = c >= 1, col = full ? '255,214,120' : '240,236,226', at = (ang, d, h) => scr(p.x + Math.cos(ang) * d, h, p.y + Math.sin(ang) * d);
  g.globalCompositeOperation = 'source-over'; g.lineCap = 'round';
  // the wedge it could stray across, on the ground
  if (s > 0.004) {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const q = at(a - s, d0 + (L - d0) * i / 10, 0.6); if (q) pts.push(q); }
    for (let i = 10; i >= 0; i--) { const q = at(a + s, d0 + (L - d0) * i / 10, 0.6); if (q) pts.push(q); }
    if (pts.length > 4) {
      g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
      g.fillStyle = `rgba(${col},${0.07 + 0.08 * c})`; g.fill(); g.strokeStyle = `rgba(${col},0.35)`; g.lineWidth = 1.5; g.stroke();
    }
  }
  // the arc it flies along: dashes that run outward, brighter as the draw builds
  g.setLineDash([7, 9]); g.lineDashOffset = -now * 60;
  g.strokeStyle = `rgba(${col},${0.25 + 0.35 * c})`; g.lineWidth = full ? 2.5 : 1.6;
  g.beginPath(); let on = false;
  for (let i = 0; i <= 24; i++) { const u = i / 24, d = 12 + (L - 12) * u; if (d < a0) continue; const q = at(a, d, shotZ(L, u)); if (!q) { on = false; continue; } on ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); on = true; }
  g.stroke(); g.setLineDash([]);
  // where it comes down: brackets either side as wide as it could stray there, closing in on the spot as you draw
  const lx = p.x + Math.cos(a) * L, ly = p.y + Math.sin(a) * L, w = Math.sin(s) * L, m = scr(lx, 1, ly), e = scr(lx - Math.sin(a) * w, 1, ly + Math.cos(a) * w);
  if (m) {
    const r = Math.max(5, e ? Math.hypot(e[0] - m[0], e[1] - m[1]) : 5), hgt = 9 + 5 * (1 - c), x = m[0], y = m[1];
    g.strokeStyle = 'rgba(10,8,6,0.5)'; g.lineWidth = 4.5;
    const brk = () => { for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x + sd * (r - 4), y - hgt); g.lineTo(x + sd * r, y - hgt); g.lineTo(x + sd * r, y + hgt); g.lineTo(x + sd * (r - 4), y + hgt); g.stroke(); } };
    brk(); g.strokeStyle = `rgba(${col},${0.7 + 0.3 * c})`; g.lineWidth = full ? 2.5 : 1.8; brk();
    g.fillStyle = `rgba(${col},0.95)`; g.beginPath(); g.arc(x, y, full ? 3 + Math.sin(now * 12) : 2, 0, 7); g.fill();
    const ring = [], rw = Math.max(4, w);   // and a ring on the ground there, so you can judge the distance
    for (let i = 0; i <= 20; i++) { const t = i / 20 * 6.283, q = scr(lx + Math.cos(t) * rw, 0.8, ly + Math.sin(t) * Math.max(4, rw * 0.35)); if (q) ring.push(q); }
    if (ring.length > 12) { g.beginPath(); ring.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.strokeStyle = `rgba(${col},${0.4 + 0.3 * c})`; g.lineWidth = 1.5; g.stroke(); }
  }
}
