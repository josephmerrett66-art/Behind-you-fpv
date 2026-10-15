// ================= Daylight's step, driven from first person =================
// The main game's update() and exStep() each do a little screen work around the woods' own rules. These are the same two
// functions with the screen work taken out: what moves you, what bumps you, what comes for you and when is all theirs.

// where you look: yaw and pitch in the 3D view; S.aimW (the way you face on the ground) follows from yaw
const look = { yaw: 0, pitch: -0.08, tYaw: 0, tPitch: 0 };
const aimOfYaw = y => -y - Math.PI / 2, yawOfAim = a => -a - Math.PI / 2;
function setAim() {
  const a = aimOfYaw(look.yaw), wx = Math.cos(a), wy = Math.sin(a);
  S.aimW = a; S.aim = Math.atan2((wx + wy) / 2, wx - wy);   // the same way, as the 2D screen would have it (rolls and a few aims read it)
}

// ---------------- a run ----------------
function newGame(fresh) {
  S = { p: { x: 0, y: 0, vx: 0, vy: 0, phase: 0, step: 0, side: 1, prints: [] }, dash: 0, dashTick: 0, needRelease: false, look: 6, lookMax: 6, spotted: false, rounds: 0,
    over: false, overT: 0, catches: 0, msg: null, q: null, birds: [], watchers: [], watchT: 3, flushed: new Map(), rabbits: [], rabbitChunks: new Set(), cam: { x: 0, y: 0 },
    torchOn: true, torchLvl: 1, torchOnT: 1, aim: -Math.PI / 2, aimW: -Math.PI * 0.75, t: 0, running: true };
  S.mode = 'expedition'; EX_TEST = false;
  dayYard(true);
  const sv = dayReadSave();
  if (ARENA) dayBegin();   // the boss arena: a run of its own, your save left as it is
  else if (fresh || !sv) { dayClearSave(); dayBegin(); } else dayLoad(sv);
  dayPowApply();
  S.torchOn = !S.day;
  campBtn.hidden = true; campEl.hidden = true; craftBtn.hidden = true; useBtn.hidden = true; hotbarEl.hidden = true; craftEl.hidden = true; deathCard.hidden = true; statsEl.hidden = true;
  renderHotbar(); dodgeBtn.dataset.cool = '0'; menuBtn.hidden = false;
  // face out of camp, toward the gate you're nearest
  const p = S.p, d = Math.hypot(p.x, p.y);
  look.yaw = look.tYaw = yawOfAim(d > 5 ? Math.atan2(p.y, p.x) : -Math.PI / 2); look.pitch = look.tPitch = -0.08;
  S.cam.x = p.x; S.cam.y = p.y; setAim();
  worldDirty = true; FPX.reset();
}

// ---------------- your step (update(), less the screen) ----------------
const MV = { x: 0, y: 0 };   // what your hands ask for this frame: x right, y forward
// a sprint: click the left stick (or hold left shift) and you run flat out until you let the stick go, crouch, draw a bow
// or run out of breath. It burns stamina as it goes, and stamina doesn't come back while you're running.
const SPRINT_K = 1.45, SPRINT_COST = 15, SPR = { on: false, k: 0 };
function sprintToggle() { if (!S || !S.day) return; SPR.on = !SPR.on; if (SPR.on && S.day.crouch) dayCrouch(); }
function sprintStep(dt, ml) {
  const D = S.day, p = S.p;
  if (SPR.on && (ml < 0.2 || D.crouch || D.draw || p.roll > 0 || S.rg.phase === 'dead')) SPR.on = SPR.held = false;
  if (SPR.on && D.st <= 1) { SPR.on = false; dayNote('tired', 'out of breath', 1.5); }
  const want = SPR.on || SPR.held && ml > 0.2 && !D.crouch && !D.draw && D.st > 1 ? 1 : 0;
  SPR.k += (want - SPR.k) * Math.min(1, dt * 6);
  if (want) { D.st = Math.max(0, D.st - SPRINT_COST * dt); D.stT = 0; }
  return 1 + (SPRINT_K - 1) * SPR.k;
}
function simStep(dt) {
  S.t += dt;
  const p = S.p, rg = S.rg;
  setAim();
  // move: the way you push, turned to the way you face. Backing up is a little slower; there is no walk, as in the 2D game.
  let mx = MV.x, my = MV.y; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  const a = isoP() ? aimOfYaw(ISO.yaw) : S.aimW, fx = Math.cos(a), fy = Math.sin(a), rx = -fy, ry = fx;   // from above, the way you push on the screen
  const back = my < 0 && !isoP() ? 0.78 : 1;
  const speed = RUN * rgSpeed() * exWeight() * dayMoveK() * (rg.drink ? 0.3 : 1) * (S.day ? sprintStep(dt, ml) : 1);
  const wx = (rx * mx * 0.95 + fx * my * back) * speed, wy = (ry * mx * 0.95 + fy * my * back) * speed;
  const k = 1 - Math.exp(-ACCEL * 1.9 * dt);   // you get going and stop sharply, so the stick feels direct
  p.vx += (wx - p.vx) * k; p.vy += (wy - p.vy) * k;
  if (p.rollCool > 0) { p.rollCool -= dt; if (p.rollCool <= 0) dodgeBtn.dataset.cool = '0'; }
  if (p.roll > 0) {                          // fast at the start, easing out at the end
    const u = 1 - p.roll / ROLL_T, v = ROLL_DIST / ROLL_T * 2 * (1 - u);
    p.vx = Math.cos(p.rollA) * v; p.vy = Math.sin(p.rollA) * v;
    p.roll -= dt; p.rollSafe -= dt;
    if (!p.rollThud && p.roll < ROLL_T * 0.55) { p.rollThud = 1; if (actx && noiseBuf) noiseAt(actx.currentTime, 300, 120, 0.09, 0.2, sfxGain); FPX.thud(); }
    if (p.roll <= 0) { p.vx *= 0.3; p.vy *= 0.3; p.rollEnd = 0.16; }
  }
  if (p.ghosts) p.ghosts.length = 0;
  atkStep(dt);
  wpTick(dt);
  dayArmTick(dt);
  const ox = p.x, oy = p.y;
  p.x += p.vx * dt; p.y += p.vy * dt;
  exWall(p, ox, oy);
  // bump into trees and rocks, the camp's towers and stores, your own walls and lamps
  const near = Math.hypot(p.x, p.y) < CAMP_R + 40;
  for (const o of propsNear(p.x, p.y, 60).concat(daySolidsNear(p.x, p.y, 60), lightsNear(p.x, p.y, 60).filter(L => L.r), near ? CAMP_SOLID : [])) {
    if (o.nocol) continue;
    const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy), min = o.r * o.s + 7;
    if (d < min && d > 0) { p.x = o.x + dx / d * min; p.y = o.y + dy / d * min; }
  }
  // your stride, for the footsteps and the bob
  const v = Math.hypot(p.vx, p.vy), before = Math.floor((p.phase - Math.PI / 2) / Math.PI);
  if (v > 1) p.phase += 1.348 * v / (v > 70 ? 15 : 11) * dt;
  if (v > 8 && Math.floor((p.phase - Math.PI / 2) / Math.PI) > before) { p.side *= -1; FPX.step(v > WALK + 20, p.side); }
  S.cam.x = p.x; S.cam.y = p.y;
  updateSurvive(dt);
  if (S.msg) S.msg.t += dt;
  // the torch: lit by night (Daylight's own rule), needs oil only when you roll, gutters and sputters as it comes on
  const dry = rg.oil !== undefined && !rg.inCamp ? rg.oil / oilMax() : 1;
  const want = S.torchOn && dry > 0 && !(rg.snuff > 0);
  if (want !== !!S.wasLit) { S.wasLit = want; S.torchOnT = 0; FPX.click(want); }
  if (want) {
    S.torchOnT += dt;
    const sputter = S.torchOnT < 0.25 && Math.random() < 0.35 ? 0.2 : 1;
    S.torchLvl = Math.min(1, S.torchLvl + dt * 10) * sputter;
  } else S.torchLvl = Math.max(0, S.torchLvl - dt * 25);
}

// ---------------- the woods' step (exStep(), Daylight's part of it) ----------------
FP.exStep = function (dt) {
  const rg = S.rg, p = S.p, d0 = Math.hypot(p.x, p.y), ring = exRing(d0), inCamp = d0 < CAMP_R;
  weatherStep(dt);                            // rain, fog and storms come and go while you are out
  rg.wave = Math.min(13, 1 + d0 / 800 + dayTough());
  dayTorchOn(); dayStep(dt, inCamp);
  for (const n of rg.notes) n.t += dt;
  rg.notes = rg.notes.filter(n => n.t < 2.4);
  if (rg.ringMsg && !(S.msg && S.msg.t < 2.2)) { rg.ringMsg.t += dt; if (rg.ringMsg.t > 2.8) rg.ringMsg = null; }
  if (inCamp !== rg.inCamp) {
    rg.inCamp = inCamp;
    if (inCamp) { rg.oil = oilMax(); dayBankWisps(); }   // wisps you carry home are banked
    else { rg.ringMax = 0; rg.ringMsg = { text: RING_NAMES[0], t: 0 }; rg.tallCd = 10; rg.outT = 0; if (actx) noiseAt(actx.currentTime, 900, 200, 0.5, 0.25, sfxGain); }   // the gate creaks shut behind you
  }
  campBtn.hidden = !inCamp; if (campBtn.textContent !== 'Wisps') campBtn.textContent = 'Wisps';
  craftBtn.hidden = false; useBtn.hidden = !dayUseTarget(); sneakBtn.hidden = inCamp; dodgeBtn.hidden = inCamp; attackBtn.hidden = false; flaskBtn.hidden = inCamp;
  if (inCamp) {
    for (const e of rg.enemies) if ((e.type === 'bomber' || e.type === 'laser') && !e.dead) { e.dead = e.gone = true; ashBurst(e.x, e.y, 12, 24); }
    return;                                  // nothing new comes while you're home
  }
  if (ring > rg.ringMax) { rg.ringMax = ring; rg.ringMsg = { text: RING_NAMES[ring], t: 0 }; if (ring > 0) playRingSting(); }
  rg.spawnT -= dt;
  const cap = Math.round((EX_CAP[ring] + Math.floor(packUsed(rg.pack) / packMax() * 3)) * dayCrowd() * dayCapK());   // fewer by day, far more by night, more with a heavy pack
  if (rg.spawnT <= 0) {
    rg.spawnT = EX_GAP[ring] * (0.6 + Math.random() * 0.8);
    if (rg.enemies.length < cap && rmOn()) rmSpawn(ring, Math.min(cap - rg.enemies.length, 1 + Math.floor(Math.random() * 3) + (ring > 1 && Math.random() < 0.5 ? 1 : 0)));   // a band out roaming
    else if (rg.enemies.length < cap) { if (ring > 0 && Math.random() < 0.25 && cap - rg.enemies.length >= 3) exPack(ring, Math.min(cap - rg.enemies.length, 3 + (Math.random() < 0.5 ? 1 : 0))); else exSpawn(exPickFoe(ring)); }
  }
  if (ring === 3 && !rg.enemies.some(e => e.type === 'tall') && (rg.tallCd -= dt) <= 0) {
    exSpawn('tall'); rg.tallCd = 45;
    if (!rg.tallSeen) { rg.tallSeen = true; rg.ringMsg = { text: 'something tall', sub: 'walks the deep', t: 0 }; }
  }
};

// ---------------- the torch in 3D: what its beam falls on ----------------
// The 2D game asks whether a point is in the wedge of light on screen. Here it is a cone from your hand, and a trunk or a rock
// between you and the thing keeps it dark.
const BEAM = { on: false, x: 0, y: 0, h: 0, dx: 0, dy: 0, dz: 0 };
function beamAt(x, y, h, wide = 1) {
  if (!BEAM.on) return 0;
  const vx = x - BEAM.x, vy = h - BEAM.h, vz = y - BEAM.y, d = Math.hypot(vx, vy, vz);
  if (d > RANGE * 0.95 * (1 - 0.25 * wxK('fog')) || d < 1) return d < 1 ? 1 : 0;
  const c = (vx * BEAM.dx + vy * BEAM.dy + vz * BEAM.dz) / d;
  if (c < Math.cos(HALF * 1.12 * wide)) return 0;
  if (beamBlocked(x, y, d)) return 0;
  return 1 - 0.5 * d / RANGE;
}
function beamBlocked(x, y) {
  const px = BEAM.x, py = BEAM.y, dx = x - px, dy = y - py, L = Math.hypot(dx, dy) || 1;
  for (const o of WORLD.props) {
    if (o.kind !== 'tree' && o.kind !== 'rock') continue;
    const ox = o.x - px, oy = o.y - py, t = (ox * dx + oy * dy) / L;
    if (t <= 4 || t >= L - 4) continue;
    if (Math.abs(ox * dy - oy * dx) / L < (o.kind === 'rock' ? 11 : 6) * o.s) return true;
  }
  return false;
}
function inBeam(x, y, h = 0, wide = 1) { return S.torchLvl >= 0.6 && beamAt(x, y, h, wide) > 0; }   // the main game's question, answered in 3D
function beamStep() {
  const rg = S.rg, rolling = S.p.roll > 0;
  BEAM.on = S.torchLvl > 0.6 && !rolling && !!S.torchOn;
  S.beamInfo = BEAM.on ? { bx: -1e6, by: -1e6, br: 0 } : null;   // only its being there is read now
  for (const e of rg.enemies) e.beam = BEAM.on ? beamAt(e.x, e.y, FOES[e.type].h * 0.5) : 0;
}

// ---------------- what the main game asks of the view ----------------
FP.seen = (x, y) => {                       // in front of you and near enough to make out
  const p = S.p, dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
  if (d < 90) return true;
  if (d > 720) return false;
  const c = (dx * Math.cos(S.aimW) + dy * Math.sin(S.aimW)) / d;
  return c > Math.cos(cam.fov * Math.PI / 180 * 0.5 * Math.max(1, cam.aspect) + 0.15);
};
FP.aimPt = (d0, d1) => {                    // the spot on the ground under your crosshair, kept between d0 and d1 away
  const p = S.p, cp = Math.cos(look.pitch), sp = Math.sin(look.pitch);
  let d = sp < -0.02 ? (EYE * cp) / -sp : d1;
  d = clamp(d, d0, d1);
  return { x: p.x + Math.cos(S.aimW) * d, y: p.y + Math.sin(S.aimW) * d };
};
FP.monOut = (x, y, gain) => placeOut(x, y, gain);
// Putting something down: the main game sets it a fixed step in front of you, which from eye height is down at your feet,
// half off the bottom of the screen. Here it goes where you look on the ground, from that same step out to a little further;
// almost nothing stops it.
function dayPlaceSpot(t) {
  const p = S.p, a = S.aimW || 0, near = t === 'wall' ? 46 : t === 'bench' || t === 'furnace' || t === 'anvil' ? 38 : t === 'rack' || t === 'plot' ? 44 : 34;
  const { x, y } = FP.aimPt(near, near + 80);
  const fake = dayMakeBuild(t, x, y, a, true);
  let ok = true;
  for (const q of fake.parts) {                 // almost anywhere: just not on the shrine stones, inside a trunk, on top of another one, or on yourself
    if ([TELE, TELE2].some(o => dist2(o, q) < 24)) { ok = false; break; }
    if (propsNear(q.x, q.y, 40).some(o => (o.kind === 'tree' || o.kind === 'rock' || o.kind === 'rockIron') && dist2(o, q) < (o.r || 8) * (o.s || 1) * 0.5)) { ok = false; break; }
    if (S.day.builds.some(B => B.parts.some(o => dist2(o, q) < 4))) { ok = false; break; }
    if (dist2(q, p) < 6) { ok = false; break; }
  }
  return { x, y, a, ok };
}

// Cooking and the other fire recipes are done at a fire: the camp's own fire in the middle of the yard, or a campfire
// you've built, not from anywhere inside the palisade (the main game lets the whole camp count as "at the fire").
// Close enough to sit by it: a couple of steps from the stones.
const COOK_R = 60;
function stationHere(at) {
  const p = S.p;
  if (at === 'fire') return Math.hypot(p.x - EX_FIRE.x, p.y - EX_FIRE.y) < COOK_R || S.day.builds.some(B => B.t === 'fire' && Math.hypot(B.x - p.x, B.y - p.y) < COOK_R);
  return at === 'hand' || (at === 'bench' && dayBenchNear(p.x, p.y)) || (at === 'furnace' && dayFurnNear(p.x, p.y)) || (at === 'rack' && dayRackNear(p.x, p.y)) || (at === 'anvil' && dayAnvilNear(p.x, p.y));
}
