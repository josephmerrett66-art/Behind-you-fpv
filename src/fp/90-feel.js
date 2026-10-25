// ================= how it feels to move about in first person =================
// Joe: "some things could be improved, like the movement ... the jumping, and maybe ... a little bit of camera bobbing for the
// steps ... look into other games, how they make first person movement feel really good. It's not so much ... changing the
// physics of it ... more about adding those kind of game feel elements". How you move is as it was; what the camera does
// as you move is what first-person games lean on to make it feel like a body carrying you about:
//   - the step: your head is lowest just after each foot comes down (when the footfall is heard) and highest as you pass
//     over that foot, a sharper dip and a rounder top the harder you go, and it sways side to side once every two steps,
//     tipping a touch with it. Walking it's gentle, running more, sprinting most; crouched it's smaller
//   - each footfall gives the view a small jolt of its own, a little more when you run
//   - your weight: setting off, the view tips back a touch and settles; pulling up, it nods forward. Stepping sideways
//     you lean into it, and running round a bend you lean into the turn
//   - your breath: standing still the view rises and falls a little with it, slower and deeper when you're worn out
//   - the jump: the view tips up as you push off and drifts down as you come down, your hands lagging behind the rise
//     and floating at the top; landing, you sink into your knees with a nod and come back up, more from higher up
// Settings → View bob turns the step, the sway and the breathing off for anyone they don't sit well with.
SET.bob = SET.bob !== false;
const FEEL = {
  k: 0, br: 0, tired: 0, fA: 0, sA: 0, lastF: 0, lastS: 0, yawR: 0, lastYaw: null, air: false, airP: 0, handJ: 0,
  land: { y: 0, vy: 0, p: 0, vp: 0, r: 0, vr: 0 },   // the give in your knees, and the nod with it, after a landing (or a push off)
  foot: { y: 0, v: 0 },   // a footfall's jolt
  lean: { r: 0, v: 0 }, tip: { p: 0, v: 0 },   // leaning into a sidestep or a turn; tipping back and forward as you set off and pull up
  o: { x: 0, y: 0, pitch: 0, roll: 0, hx: 0, hy: 0 },
};
// a damped spring, pulled back to (or towards) a target: w how quick, z how damped (under 1 it overshoots a little and settles)
function feelSpr(o, x, v, to, w, z, dt) {
  for (let n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n; n > 0; n--) { o[v] += (-w * w * (o[x] - to) - 2 * z * w * o[v]) * h; o[x] += o[v] * h; }
}
function feelLand(hard) {   // down: into your knees, and a nod (68-lift)
  if (outsideP()) { VIEW_FX.dip = Math.max(VIEW_FX.dip, 3.2 * hard); return; }
  const L = FEEL.land, k = SET.bob ? 1 : 0.6;
  L.vy -= (55 + 45 * hard) * k; L.vp -= (0.16 + 0.2 * hard) * k; L.vr += (Math.random() - 0.5) * 0.08 * hard * k;
  if (hard > 1.2) VIEW_FX.dip = Math.max(VIEW_FX.dip, 2 * (hard - 1));
}
function feelFoot(running) { if (SET.bob && !outsideP()) FEEL.foot.v -= running ? 11 : 6; }
// how far round the stride you are: 0 as a foot comes down (the footfalls are on the stride's half turns, 40-sim), 1 at the next
const feelU = ph => { const u = (ph - Math.PI / 2) / Math.PI; return u - Math.floor(u); };
function feelStep(dt, now, v) {
  const p = S.p, D = S.day, rg = S.rg, o = FEEL.o;
  if (outsideP()) {   // seen from outside: the camera bobs as it always has
    o.x = Math.cos(p.phase) * 0.7 * VIEW_FX.bobAmt; o.y = Math.sin(p.phase * 2) * 1.1 * VIEW_FX.bobAmt; o.pitch = o.roll = o.hx = o.hy = 0;
    FEEL.lastYaw = null; return o;
  }
  if (!(dt > 0)) return o; dt = Math.min(dt, 0.05);   // (a frame with no time in it, paused or held: nothing moves)
  const air = lvAir(p), dead = rg.phase === 'dead', on = SET.bob ? 1 : 0, cr = D.crK || 0;
  // how hard you're going: 1 at your usual pace, about 1.45 sprinting, less pushing a stick part way; nothing in the air or when you've fallen
  FEEL.k += ((air || dead ? 0 : Math.min(1.6, v / (RUN * rgSpeed()))) - FEEL.k) * Math.min(1, dt * 7);
  const K = FEEL.k, g = Math.min(1, K / 0.25) * on * (1 - 0.35 * cr) * (D.draw ? 0.35 : 1);   // steadier with a bow drawn or a crossbow up
  // the step
  const w = feelU(p.phase) - 0.06, cusp = 0.35 + 0.4 * Math.min(1, K);
  const vert = (1 - cusp) * -Math.cos(TAU * w) + cusp * (2 * Math.abs(Math.sin(Math.PI * w)) - 1);   // -1 just after a footfall, 1 over the foot
  const sway = -Math.cos(p.phase - 0.15);   // side to side, once every two steps
  const Ay = g * (0.15 + 0.65 * K), Ax = g * (0.25 + 0.25 * K), Ar = g * (0.003 + 0.003 * K), Ap = g * (0.002 + 0.003 * K);
  // the footfall's jolt
  feelSpr(FEEL.foot, 'y', 'v', 0, 30, 0.7, dt);
  // your breath: deeper and quicker when you're spent, most of it lost under your stride
  FEEL.tired += (clamp(1 - D.st / STA_MAX, 0, 1) ** 1.5 + 0.5 * SPR.k - FEEL.tired) * Math.min(1, dt * 0.8);
  const T = Math.min(1, FEEL.tired); FEEL.br += dt * TAU * (0.22 + 0.28 * T);
  const bk = on * (dead ? 0 : 1) * (1 - 0.6 * Math.min(1, K / 0.3)), By = bk * (0.12 + 0.32 * T), Bp = bk * (0.0012 + 0.0035 * T);
  // your weight: the view swings against a change of speed, and leans into a sidestep and a turn
  const a = S.aimW || 0, fv = p.vx * Math.cos(a) + p.vy * Math.sin(a), sv = -p.vx * Math.sin(a) + p.vy * Math.cos(a);
  FEEL.fA += (clamp((fv - FEEL.lastF) / dt, -2000, 2000) - FEEL.fA) * Math.min(1, dt * 12); FEEL.lastF = fv;
  if (FEEL.lastYaw === null) FEEL.lastYaw = look.yaw;
  FEEL.yawR += (clamp(angDiff(look.yaw, FEEL.lastYaw) / dt, -8, 8) - FEEL.yawR) * Math.min(1, dt * 8); FEEL.lastYaw = look.yaw;
  feelSpr(FEEL.tip, 'p', 'v', on * (air ? 0 : clamp(FEEL.fA * 1.2e-5, -0.014, 0.014)), 10, 0.6, dt);
  feelSpr(FEEL.lean, 'r', 'v', on * (-sv / (RUN * rgSpeed()) * 0.016 + clamp(FEEL.yawR * 0.0035, -0.01, 0.01) * Math.min(1, K)), 9, 0.8, dt);
  // the jump: off the ground the view tips with how you're going up or down, and your hands lag behind
  if (air && !FEEL.air && p.jvz > 0) { FEEL.land.vp += 0.1 * (0.6 + 0.4 * on); FEEL.land.vy += 18 * on; VIEW_FX.fov += 1.2; }   // pushing off
  FEEL.air = air;
  FEEL.airP += ((air ? clamp((p.jvz || 0) * 6e-5, -0.012, 0.008) : 0) - FEEL.airP) * Math.min(1, dt * 10);
  FEEL.handJ += ((air ? clamp(-(p.jvz || 0) * 0.012, -1.6, 1.6) : 0) - FEEL.handJ) * Math.min(1, dt * 9);
  const L = FEEL.land; feelSpr(L, 'y', 'vy', 0, 16, 0.5, dt); feelSpr(L, 'p', 'vp', 0, 14, 0.55, dt); feelSpr(L, 'r', 'vr', 0, 12, 0.6, dt);
  o.x = Ax * sway;
  o.y = Ay * vert + FEEL.foot.y + By * Math.sin(FEEL.br) + L.y;
  o.pitch = Ap * vert + FEEL.foot.y * 0.0025 + Bp * Math.sin(FEEL.br - 0.5) + FEEL.tip.p + FEEL.airP + L.p;
  o.roll = -Ar * sway + FEEL.lean.r + L.r;
  // your hands: the same stride a beat behind, and the jump and the landing in them
  const wh = feelU(p.phase) - 0.16, vh = -Math.cos(TAU * wh);
  o.hx = Math.cos(p.phase - 0.4) * 0.45 * Math.min(1, K) * (on ? 1 : 0.5);
  o.hy = vh * 0.5 * Math.min(1.3, K) * (on ? 1 : 0.5) + FEEL.handJ + L.y * 0.25 + FEEL.foot.y * 0.6;
  return o;
}
{ const st = FPX.step; FPX.step = function (running) { const r = st.apply(this, arguments); if (S && S.p && !lvAir(S.p)) feelFoot(running); return r; }; }
{ const ss = syncSet; syncSet = function () { ss.apply(this, arguments); const b = $('sBob'); if (b) b.setAttribute('aria-pressed', SET.bob ? 'true' : 'false'); }; }
$('sBob').addEventListener('click', () => { SET.bob = !SET.bob; saveSet(); syncSet(); });
