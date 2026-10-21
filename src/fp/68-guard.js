// ================= a jump and a block, where the roll was (Joe: "Jump and block") =================
// The roll was the old action game's. The Forest has a jump and a block instead, and so does this now:
//   - Space (B on a pad, Jump on a phone) jumps: a short hop for a little stamina, and both feet thump down as you land.
//     It brings you up out of a crouch.
//   - hold right click (LT on a pad, Block on a phone) to block with whatever you're holding: you hold it up across you
//     and go at half pace, and can't swing or sprint. A blow from in front then costs you stamina instead of a heart (more
//     with bare hands, a lot more from a bear), and your stamina doesn't come back while you hold it. Raise it just as the
//     blow comes and it's knocked back, off its stroke.
//     Too tired to take it and the block gives: the blow comes through. From the side or behind it's no help at all.
const GUARD = { want: { m: false, p: false, t: null }, on: false, t0: -9, k: 0, brk: 0, arc: 1.2, perfect: 0.28,
  cost: { cannibal: 20, pale: 22, beast: 14, bear: 32, other: 18 } };
const JUMP = { v: 112, g: 520, st: 8 };
const blockBtn = $('bBlock');
const guardWant = () => GUARD.want.m || GUARD.want.p || GUARD.want.t !== null;
function guardCan() {
  const D = S && S.day, p = S && S.p, rg = S && S.rg;
  return !!(D && rg && S.running && rg.phase === 'fight' && !menusOpen() && !D.draw && !p.act && !(p.atk && p.atk.t < p.atk.dur) && !(p.wact && p.wact.t < (p.wact.dur || 0.4))
    && dayTool() !== 'build' && GUARD.brk <= 0);
}
function guardStep(dt) {
  const was = GUARD.on;
  GUARD.brk = Math.max(0, GUARD.brk - dt);
  GUARD.on = guardWant() && guardCan();
  if (GUARD.on && !was) { GUARD.t0 = S.t; SPR.on = false; guardSnd('up'); }
  if (GUARD.on) S.day.stT = 0;   // and your breath doesn't come back while you hold it: a few blows, then you must hit back or get clear
  GUARD.k += ((GUARD.on ? 1 : 0) - GUARD.k) * Math.min(1, dt * 16);
}
// what hit you: the clan, a pale one, an animal (a bear's the worst), or anything else
function guardWho(e) {
  if (e.type === 'cannibal') return e.cl && e.cl.cave ? 'pale' : 'cannibal';
  if (e.type === 'half') { const b = S.day.beasts.find(o => o.x === e.x && o.y === e.y); return b && b.k === 'bear' ? 'bear' : 'beast'; }
  return 'other';
}
{ const h0 = hurt; hurt = function (e) {
  const rg = S.rg, p = S.p;
  if (S.day && GUARD.on && e && e.x !== undefined && rg && rg.phase === 'fight' && !(e.src === 'bomber' || e.src === 'laser' || e.src === 'kamikaze')) {
    const off = Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), S.aimW || 0));
    if (off < GUARD.arc) {
      const who = guardWho(e), perfect = S.t - GUARD.t0 < GUARD.perfect && who !== 'bear', cost = GUARD.cost[who] * (heldIt() ? 1 : 1.6) * (perfect ? 0.3 : 1);
      if (S.day.st >= cost) { guardTake(e, who, cost, perfect); return; }
      GUARD.brk = 0.9; GUARD.on = false; guardSnd('break'); exNote('too tired to hold your guard', true);   // the blow comes through
    }
  }
  return h0.apply(this, arguments);
}; }
function guardTake(e, who, cost, perfect) {
  const D = S.day, rg = S.rg, p = S.p, ref = e.ref || e, a = Math.atan2(p.y - e.y, p.x - e.x);
  D.st = Math.max(0, D.st - cost); D.stT = 0;
  rg.inv = 0.45;   // that blow, not the next frame of it too
  const push = who === 'bear' ? 26 : perfect ? 3 : 10;
  p.x += Math.cos(a) * push * 0.5; p.y += Math.sin(a) * push * 0.5; p.vx += Math.cos(a) * push * 5; p.vy += Math.sin(a) * push * 5;   // a step back from it
  addShake(who === 'bear' ? 0.5 : perfect ? 0.2 : 0.3);
  CFX.recoil = Math.max(CFX.recoil || 0, 1);   // it jars your hand
  dayWear();
  if (perfect && ref && S.rg.enemies.includes(ref)) {   // knocked back, off its stroke, and slow to come again
    ref.sw = null; ref.swCd = 1.1;
    if (ref.cl) ref.cl.hop = { vx: -Math.cos(a) * 150, vy: -Math.sin(a) * 150, t: 0.2, T: 0.2 }; else shove(ref, 14);
  }
  guardSnd(perfect ? 'perfect' : 'block');
  if (!D.told.guard) { D.told.guard = 1; exNote(perfect ? 'blocked, just as it came · it\'s knocked back' : 'blocked · it costs you stamina · raise it just as the blow comes to knock them back', true); }
}
function guardSnd(k) {
  if (!actx) return; const t = actx.currentTime;
  if (k === 'up' ? snd('cloth', { v: 0.5 }) : k === 'break' ? snd('wood_break', { v: 0.6 }) && (snd('punch', { v: 0.7 }) || 1) : snd('wood_m', { v: k === 'perfect' ? 1.1 : 0.9 }) && (k !== 'perfect' || snd('wood_h', { v: 0.6, rate: 1.2 }) || 1)) return;
  if (k === 'up') noiseAt(t, 900, 500, 0.07, 0.05, sfxGain);   // the cloth of your sleeve
  else if (k === 'break') { boomAt(t, 95, 45, 0.22, 0.4, sfxGain); noiseAt(t, 600, 300, 0.2, 0.18, sfxGain); }
  else { boomAt(t, 150, 70, 0.08, 0.4, sfxGain); noiseAt(t, 1900, 900, 0.06, 0.32, sfxGain);   // the blow on wood (or your arm)
    if (k === 'perfect') noiseAt(t + 0.02, 3200, 1500, 0.05, 0.18, sfxGain); }   // a sharper crack, met square on
}
// no swing while your guard's up
{ const at = attack; attack = function () { if (GUARD.on) return; return at.apply(this, arguments); }; }
// the jump
function jump() {
  const p = S && S.p, D = S && S.day, rg = S && S.rg;
  if (!D || !S.running || !rg || rg.phase !== 'fight' || menusOpen() || p.act) return;
  if (lvAir(p)) return;
  if (!dayStam(JUMP.st)) return;
  if (D.crouch) dayCrouch(false);
  p.jvz = JUMP.v; p.jair = 1;   // from wherever you stand: the ground, a stair, the boards (68-lift)
  if (actx && !snd('cloth', { v: 0.6 })) noiseAt(actx.currentTime, 700, 400, 0.1, 0.07, sfxGain);
}
// up and down: the jump, the stairs, the boards and the drop off them are one step now (lvStep, 68-lift)
{ const ss = simStep; simStep = function (dt) { if (S && S.day) guardStep(dt); const p = S && S.p, px = p ? p.x : 0, py = p ? p.y : 0, r = ss.apply(this, arguments); if (p) lvStep(dt, px, py); return r; }; }
{ const st = FPX.step; FPX.step = function (running, side) { if (S && S.p && lvAir(S.p)) return; return st.call(this, running, side); }; }   // no footfalls in the air
// on a phone: hold the Block button
blockBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (e.pointerType !== 'mouse') setMode('touch'); GUARD.want.t = e.pointerId; blockBtn.classList.add('on'); try { blockBtn.setPointerCapture(e.pointerId); } catch (_) {} });
{ const up = e => { if (e.pointerId === GUARD.want.t) { GUARD.want.t = null; blockBtn.classList.remove('on'); } };
  blockBtn.addEventListener('pointerup', up); blockBtn.addEventListener('pointercancel', up); addEventListener('pointerup', up); addEventListener('pointercancel', up); }
addEventListener('mouseup', e => { if (e.button === 2) GUARD.want.m = false; });
addEventListener('blur', () => { GUARD.want.m = GUARD.want.p = false; GUARD.want.t = null; });
