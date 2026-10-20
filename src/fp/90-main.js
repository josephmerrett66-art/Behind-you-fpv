// ================= the sun and the dark, the lights, the camera, the frame =================

// ---------------- the sky through the day ----------------
// Daylight's clock (dayLight: 1 in full sun, 0 at the dead of night) sets everything: where the sun is, how warm the light,
// the sky, the haze, and how far you can see once it's dark and only your torch and your fires are left.
const ENV = { lt: 1 };
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function envFrame() {
  const lt = S && S.day ? dayLight() : 1, f = S && S.day ? dayT() : 0.2, set = lt < 1 && lt > 0 ? Math.sin(Math.PI * lt) : 0;
  ENV.lt = lt;
  // the hours have their own light: a cool clear morning, white noon, the afternoon warming toward gold before the dusk
  const gold = lt >= 1 ? 0.85 * _sst(0.4, NIGHT_IN, f) : 0, morn = lt >= 1 ? 1 - _sst(0.0, 0.14, f) : 0;
  const dayAmb = mix3(mix3([1.06, 1.0, 0.88], [1.12, 0.9, 0.66], gold), [0.96, 0.98, 1.0], morn * 0.8), duskAmb = [1.0, 0.68, 0.5], nightAmb = [0.075, 0.085, 0.125];
  LU.amb.value.set(...mix3(nightAmb, mix3(dayAmb, duskAmb, set * 0.85), Math.pow(lt, 0.8)));
  LU.sunK.value = lt;
  const sa = clamp(f / (NIGHT_IN + DUSK), 0, 1) * Math.PI, el = Math.max(0.12, Math.sin(sa)) * 0.95;
  LU.sunDir.value.set(Math.cos(sa) * 0.9, el, -0.45).normalize();
  const dTop = mix3(mix3([0.42, 0.6, 0.84], [0.4, 0.52, 0.76], gold), [0.46, 0.64, 0.86], morn), dHor = mix3(mix3([0.8, 0.83, 0.82], [0.94, 0.8, 0.6], gold), [0.82, 0.86, 0.9], morn);
  const top = mix3([0.02, 0.025, 0.05], mix3(dTop, [0.35, 0.3, 0.5], set), lt);
  const hor = mix3([0.035, 0.04, 0.06], mix3(dHor, [0.95, 0.56, 0.32], set), lt);
  SKY.top.set(...top); SKY.hor.set(...hor); SKY.set.value = set;
  LU.fogCol.value.set(...hor);
  LU.fogR.value.set(lerp(150, 430, lt), lerp(560, 950, lt));
  const tl = S ? S.torchLvl * (S.torchOn ? 1 : 0) : 0;
  LU.tCol.value.set(1.0 * tl, 0.88 * tl, 0.7 * tl);
  LU.colourK.value = COLOUR ? 1 : 0;
  shMat.uniforms.k.value = 0.4 * lt;
  shMat.uniforms.lean.value.set(-LU.sunDir.value.x * 1.4, -LU.sunDir.value.z * 1.4);
  pondMat.uniforms.lt.value = lt;
  const s2 = 1 - lt * 0.95; vmLight.value.set(lerp(1, 0.32, s2), lerp(0.97, 0.3, s2), lerp(0.9, 0.36, s2));
}

// ---------------- lights: fires, lamps, your torch's spill, anything burning ----------------
const TORCH_R = 210;   // how far a fire torch you're holding lights (the pale ones shy from it as far, 80-pale)
const _lights = [];
function lightsFrame(now, dt) {
  const L = LU.pl.value, C = LU.plc.value, p = S.p, D = S.day, rg = S.rg, night = 1 - ENV.lt * 0.85;
  _lights.length = 0;
  const add = (x, h, y, r, cr, cg, cb, pri = 0) => { const d = Math.hypot(x - p.x, y - p.y); if (d - r > 700) return; _lights.push({ x, h: h + terrH(x, y), y, r, cr, cg, cb, w: pri - d / (r + 1) }); };
  const fk = s => 0.85 + 0.1 * Math.sin(now * 7.3 + s) + 0.06 * Math.sin(now * 13.1 + s * 2) + 0.05 * Math.random();
  const fire = (x, y, k, h = 5) => { if (Math.hypot(x - p.x, y - p.y) < 520 && Math.random() < Math.min(1, dt * 50 * k)) flame(x, h, y, k); if (Math.random() < dt * 6 * k) spark(x, h + 8, y, (Math.random() - 0.5) * 14, 40 + Math.random() * 40, (Math.random() - 0.5) * 14, 1.2 + Math.random(), 1.5, 1, 0.6, 0.25, 1, 0, -6, 0.6); };
  // the camp's own fire, and your campfires
  { const f = fk(0); add(EX_FIRE.x, 24, EX_FIRE.y, 300, 1.05 * f * night, 0.62 * f * night, 0.3 * f * night, 2); fire(EX_FIRE.x, EX_FIRE.y, 1.05); tongues(EX_FIRE.x, EX_FIRE.y, 1.05); }
  for (const B of D.builds) if (B.t === 'fire') { const f = fk(B.x); add(B.x, 22, B.y, 230, 1.0 * f * night, 0.6 * f * night, 0.28 * f * night, 1.5); fire(B.x, B.y, 0.9); tongues(B.x, B.y, 0.9); }
  else if (B.t === 'signal' && B.lit) { const f = fk(B.y); add(B.x, 50, B.y, 520, 1.2 * f, 0.6 * f, 0.25 * f, 3); for (let i = 0; i < 3; i++) fire(B.x + (Math.random() - 0.5) * 30, B.y + (Math.random() - 0.5) * 30, 2.4, 10 + Math.random() * 30); tongues(B.x, B.y, 2.2, 12); tongues(B.x + 8, B.y - 6, 1.4, 20); }
  else if (B.t === 'tpost' && B.fuel > 0) { const f = fk(B.x); add(B.x, 48, B.y, 200, 0.9 * f * night, 0.55 * f * night, 0.25 * f * night, 1); fire(B.x, B.y, 0.6, 48); tongues(B.x, B.y, 0.6, 46); }
  else if (B.t === 'furnace' && (B.fuel > 0 || B.lit || B.smelt)) { add(B.x, 10, B.y, 120, 0.8 * night, 0.4 * night, 0.15 * night, 0.5); }
  clanLights(add, fire);   // the clan's camp fires (74-clan2)
  // the woods' lamps and fires
  for (const o of lightsNear(p.x, p.y, 700)) if (o.kind === 'fire' && o !== EX_FIRE) { const f = fk(o.x); add(o.x, 22, o.y, 240, f * night, 0.6 * f * night, 0.28 * f * night, 1); fire(o.x, o.y, 0.9); tongues(o.x, o.y, 0.9); }
  // your lamps, sconces, braziers and candles, lit at dusk
  if (ENV.lt < 0.85) for (const o of stNear(p.x, p.y, 700)) { const P = PC(o.id); if (!P.light || !o.done) continue; const f = fk(o.x) * (1 - ENV.lt);
    const h = P.k === 'lamp' ? 41 : P.k === 'sconce' ? 32 : P.k === 'brazier' ? 14 : 8, [lx, ly] = P.k === 'lamp' ? [o.x + Math.cos(o.a) * 8, o.y + Math.sin(o.a) * 8] : P.k === 'sconce' ? [o.x - Math.sin(o.a) * 3, o.y + Math.cos(o.a) * 3] : [o.x, o.y];
    add(lx, h, ly, P.light * 1.6, 0.95 * f, 0.6 * f, 0.28 * f, 0.8); if (P.k !== 'lamp') { fire(lx, ly, P.k === 'brazier' ? 0.8 : 0.3, h); tongues(lx, ly, P.k === 'brazier' ? 0.7 : 0.3, h - 2); } else stat(lx, h, ly, 9, 1, 0.75, 0.4, 0.6 * f, 0); }
  // a hand torch, held up
  if (dayTorch()) { const f = fk(1.3); add(p.x + Math.cos(S.aimW) * 8, 40, p.y + Math.sin(S.aimW) * 8, TORCH_R, 1.0 * f, 0.62 * f, 0.3 * f, 4); }
  // a small glow round you at night, so your feet aren't lost
  add(p.x, 18, p.y, 80, 0.12 * night, 0.11 * night, 0.1 * night, 5);
  // anything burning, the burst of a kill, ground fire
  for (const e of rg.enemies) if (!e.dead && e.beam > 0.1) add(e.x, 20, e.y, 60 + 50 * e.beam, 0.5 * e.beam, 0.25 * e.beam, 0.08 * e.beam, 0.5);
  for (const b of rg.blasts) { const k = 1 - b.t / b.life, c = BLAST_COL[b.col] || cssRgb(b.col); add(b.x, 16, b.y, (b.r || 60) * 2, c[0] * k * 1.2, c[1] * k * 1.2, c[2] * k * 1.2, 2); stat(b.x, 14, b.y, (b.r || 40) * 1.2 * (0.5 + 0.5 * (1 - k)), c[0], c[1], c[2], 0.6 * k, 0); }
  for (const g of rg.fires) { const k = Math.min(1, g.life / Math.max(0.1, g.max || 1)); add(g.x, 10, g.y, g.r * 2.2, 0.9 * k, 0.5 * k, 0.15 * k, 0.5); fire(g.x + (Math.random() - 0.5) * g.r, g.y + (Math.random() - 0.5) * g.r, 0.7 * k, 1); }
  for (const g of rg.dying) if (g.t < 0.5) { const k = 1 - g.t * 2; add(g.x, 20, g.y, 140, 0.9 * k, 0.5 * k, 0.18 * k, 1); }
  if (D.died) { add(D.died.x, 40, D.died.y, 90, 0.5 * night, 0.42 * night, 0.32 * night, 0.5); for (let i = 0; i < 6; i++) stat(D.died.x, 10 + i * 22, D.died.y, 16 - i, 1, 0.86, 0.66, (0.22 + 0.06 * Math.sin(now * 2.5)) * (1 - i / 7), 0); }
  _lights.sort((a, b) => b.w - a.w);
  let n = 0;
  for (const l of _lights) { if (n >= NL) break; L[n].set(l.x, l.h, l.y, l.r); C[n].set(l.cr, l.cg, l.cb); n++; }
  LU.plN.value = n;
  for (; n < NL; n++) { L[n].set(0, -9999, 0, 1); C[n].set(0, 0, 0); }
  // how lit your own hands are: near a fire they warm up
  let warm = 0; for (const l of _lights.slice(0, 4)) { const d = Math.hypot(l.x - p.x, l.y - p.y); warm = Math.max(warm, clamp(1 - d / l.r, 0, 1) * (l.cr + l.cg) * 0.5); }
  vmLight.value.x += 0.6 * warm; vmLight.value.y += 0.4 * warm; vmLight.value.z += 0.15 * warm;
  vmLight.value.x += 0.25 * S.torchLvl * (1 - ENV.lt); vmLight.value.y += 0.22 * S.torchLvl * (1 - ENV.lt); vmLight.value.z += 0.18 * S.torchLvl * (1 - ENV.lt);
}

// ---------------- the main game's own sparks, ash, chips, wisps and the like ----------------
const chipP = new Part(new THREE.BoxGeometry(1, 1, 1), 900, false);
function fxFrame(dt, now) {
  const rg = S.rg, D = S.day;
  for (const m of rg.embers) stat(m.x, m.z, m.y, m.ember ? 2.6 : 3.2, 1, 0.55 + 0.25 * Math.sin(m.x), 0.2, Math.min(1, m.life * 2), 0);
  for (const a of rg.ash) stat(a.x, Math.max(0.5, a.z), a.y, 2, 0.32, 0.31, 0.3, Math.min(0.5, a.life), 0);
  for (const s of rg.wsparks || []) { const c = cssRgb(s.col); stat(s.x, s.z, s.y, 2.4, c[0], c[1], c[2], Math.min(1, s.life * 5), 0); }
  for (const c of (rg.wchips || []).concat(D.chips)) { const col = hex(c.col || '#999'), w = c.w || 1.4; _m.compose(_p.set(c.x, Math.max(0.3, c.z), c.y), _q.setFromEuler(_e.set(c.rot || 0, (c.rot || 0) * 0.7, 0)), _s.set(w * 1.6, w * 0.5, w * 1.2)); chipP.push(_m, col, 0); }
  chipP.done();
  for (const w of rg.wisps || []) { const z = (w.z || 10) + Math.sin(now * 3 + w.seed) * 2 + (w.t < 0.7 ? w.t * 20 : 14); stat(w.x, z, w.y, 7, 0.72, 0.5, 1, 0.55, 0); stat(w.x, z, w.y, 2.4, 0.95, 0.9, 1, 0.9, 0); if (w.wild && !w.fly) stat(w.x, z, w.y, 26 + 6 * Math.sin(now * 2 + w.seed), 0.62, 0.45, 1, 0.22, 0); }   // the night's wild ones glow soft enough to spot through the trees
  for (const k of rg.wmarks || []) { const u = 1 - k.t / k.life, c = cssRgb(k.col); for (let i = -3; i <= 3; i++) stat(k.x + Math.cos(k.a + 1.57) * i * k.len / 7, k.h + i * k.len / 14, k.y + Math.sin(k.a + 1.57) * i * k.len / 7, 2.6 * k.w, c[0], c[1], c[2], u, 0); }
  for (const k of rg.wrings || []) { const u = k.t / k.life, c = cssRgb(k.col), R = k.r * (0.3 + 0.7 * u); for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; stat(k.x + Math.cos(a) * R, 1.5, k.y + Math.sin(a) * R, 4, c[0], c[1], c[2], 0.7 * (1 - u), 0); } }
  if (rg.slashes) { for (const s of rg.slashes) s.t += dt; rg.slashes = rg.slashes.filter(s => s.t < s.life); }
  if (rg.wflash) { rg.wflash.t += dt; const k = rg.wflash.k * Math.max(0, 1 - rg.wflash.t / 0.25), c = cssRgb(rg.wflash.col); flashEl.style.background = `rgb(${c.map(v => v * 255 | 0).join(',')})`; flashEl.style.opacity = k; if (rg.wflash.t > 0.25) { rg.wflash = null; flashEl.style.opacity = 0; } }
  // the eyes of animals you've tamed, wisps' light, berries ripe on the bush: done where they're drawn
}
const flashEl = $('flashFx');

// ---------------- the camera ----------------
const VIEW_FX = { trauma: 0, dip: 0, fov: 0, roll: 0, bob: 0, bobAmt: 0, shakeT: 0 };
const _v = new V3();
function placeCamera(dt, rdt, now) {
  const p = S.p, D = S.day, rg = S.rg;
  VIEW_FX.trauma = Math.max(VIEW_FX.trauma, Math.min(1, S.trauma || 0)); S.trauma = Math.max(0, (S.trauma || 0) - rdt * 1.6);
  VIEW_FX.trauma = Math.max(0, VIEW_FX.trauma - rdt * 1.6); VIEW_FX.shakeT += rdt;
  const sh = VIEW_FX.trauma * VIEW_FX.trauma, nz = s => Math.sin(VIEW_FX.shakeT * 37 + s) * 0.6 + Math.sin(VIEW_FX.shakeT * 61 + s * 2) * 0.4;
  VIEW_FX.fov *= Math.exp(-rdt * 7); VIEW_FX.roll *= Math.exp(-rdt * 6);
  if (S.kick) { S.kick.x *= Math.exp(-rdt * 9); S.kick.y *= Math.exp(-rdt * 9); }
  // a roll: you tumble low and fast; crouching takes you down; a swing leans you in
  const rollU = p.roll > 0 ? 1 - p.roll / ROLL_T : -1;
  VIEW_FX.dip = rollU >= 0 ? Math.sin(Math.PI * rollU) * 14 : VIEW_FX.dip * Math.exp(-rdt * 10);
  if (rollU >= 0) VIEW_FX.fov = Math.max(VIEW_FX.fov, 6 * Math.sin(Math.PI * rollU));
  VIEW_FX.fov = Math.max(VIEW_FX.fov, 7 * SPR.k);   // sprinting: the view stretches a little
  const crouch = (D.crK || 0) * 10 + (D.butK || 0) * 9;   // knelt at a body you're cutting up (88-meat)
  const v = Math.hypot(p.vx, p.vy);
  VIEW_FX.bobAmt = lerp(VIEW_FX.bobAmt, p.roll > 0 ? 0 : Math.min(1, v / RUN), Math.min(1, rdt * 8));
  const bobY = Math.sin(p.phase * 2) * 1.1 * VIEW_FX.bobAmt, bobX = Math.cos(p.phase) * 0.7 * VIEW_FX.bobAmt;
  const yaw = look.yaw, RX = Math.cos(yaw), RZ = -Math.sin(yaw);
  const kx = S.kick ? S.kick.x * 0.4 : 0, ky = S.kick ? S.kick.y * 0.4 : 0;
  // fallen: the view drops to the ground and tips over onto its side
  const fallK = rg.phase === 'dead' ? smooth(Math.min(1, (rg.deadT || 0) / 1.1)) : 0;
  cam.position.set(p.x + RX * bobX + nz(1) * sh * 2 + kx, terrH(p.x, p.y) + EYE + (p.jz || 0) - crouch + bobY - VIEW_FX.dip + nz(2) * sh * 2 - fallK * (EYE - 7), p.y + RZ * bobX + nz(3) * sh * 2 + ky);
  const side = (p.vx * -Math.sin(S.aimW) + p.vy * Math.cos(S.aimW)) / RUN;
  cam.rotation.set(lerp(look.pitch, 0.15, fallK) + nz(4) * sh * 0.05, yaw + nz(5) * sh * 0.05, fallK * 1.35 + VIEW_FX.roll + nz(6) * sh * 0.06 - side * 0.012 + (rollU >= 0 ? Math.sin(rollU * Math.PI) * 0.05 * (p.rollBack ? 0 : 1) : 0));
  aimZoomStep(rdt); cam.fov = (baseFov() + VIEW_FX.fov) * (1 - AIM.z); cam.updateProjectionMatrix();   // v124: a drawn bow brings the view in (66-aim) cam.updateMatrixWorld();
  LU.camPos.value.copy(cam.position); LU.fogC.value.copy(cam.position); LU.camRight.value.set(RX, 0, RZ);
  // the torch's light comes from your left hand and aims where you look, a beat behind
  look.tYaw += angDiff(look.yaw, look.tYaw) * Math.min(1, rdt * 15); look.tPitch += (look.pitch - look.tPitch) * Math.min(1, rdt * 15);
  const cp = Math.cos(look.tPitch), tdx = -Math.sin(look.tYaw) * cp, tdy = Math.sin(look.tPitch), tdz = -Math.cos(look.tYaw) * cp;
  const hand = LU.tPos.value.set(cam.position.x - RX * 6, cam.position.y - 6, cam.position.z - RZ * 6);
  _v.set(cam.position.x + tdx * 160 - hand.x, cam.position.y + tdy * 160 - hand.y, cam.position.z + tdz * 160 - hand.z).normalize();
  LU.tDir.value.copy(_v);
  BEAM.x = hand.x; BEAM.h = hand.y; BEAM.y = hand.z; BEAM.dx = _v.x; BEAM.dy = _v.y; BEAM.dz = _v.z;
  LU.tCone.value.set(Math.cos(HALF * 1.12), Math.cos(HALF * 0.5));
  // hands
  const ly = angDiff(look.tYaw, look.yaw), lp = look.tPitch - look.pitch;
  if (thirdFrame(rdt, now, cam.position.y)) return;
  handG.visible = torchG.visible = fallK < 0.3; if (fallK >= 0.3) return;
  placeHands(rdt, now, [Math.cos(p.phase) * 0.45 * VIEW_FX.bobAmt, Math.sin(p.phase * 2) * 0.55 * VIEW_FX.bobAmt], [ly, lp]);
}

// ---------------- film grain, as in the 2D game's film look ----------------
{
  const gc = $('grain'), g = gc.getContext('2d'), img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const tile = gc.toDataURL(); const div = document.createElement('div'); div.id = 'grain'; div.style.backgroundImage = `url(${tile})`; div.style.backgroundSize = '256px 256px'; gc.replaceWith(div);
}
const grainEl = $('grain');

// ---------------- the screens: title, playing, paused ----------------
function ovResize() {}
function titleText() {
  let sv = null; try { sv = dayReadSave(); } catch (e) {}
  const n = sv && (sv.n || (sv.day && sv.day.n));
  $('beginT').textContent = sv ? 'carry on' : 'start';
  $('beginS').textContent = sv ? `Your run${n ? ` · day ${n}` : ''} is where you left it.` : 'Gather, build, hunt, last the nights.';
  $('beginNew').hidden = !sv;
}
function onReady() { $('loading').textContent = ''; $('begin').disabled = false; $('beginWoods').disabled = false; titleText(); }
function startRun(fresh) {
  if (!ready) return;
  initAudio();
  newGame(fresh);
  state = 'play'; document.body.classList.add('playing');
  $('title').classList.remove('show'); $('pause').classList.remove('show');
  if (TOUCH) { const el = document.documentElement, fs = el.requestFullscreen || el.webkitRequestFullscreen; if (fs) { try { const r = fs.call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } catch (_) {} }
    try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (_) {} }
  else lockOn();
  worldSync(true); thingsSync(true);
  try { clanGeoInit(); clanRig(0); } catch (e) { console.error(e); }   // the cannibals' bodies, and one rig so its shader is made with the rest just below
  try { for (const k in PT) PT[k].mesh.count = 1; renderer.compile(scene, cam); renderer.compile(vmScene, vmCam); for (const k in PT) PT[k].mesh.count = 0; } catch (_) {}
  last = performance.now(); saveT = 0;
}
let saveT = 0;
function pause() { if (state !== 'play') return; state = 'pause'; try { daySave(); } catch (e) {} $('pause').classList.add('show'); syncSet(); lockOff(); if (actx) actx.suspend(); rngUp(); }
function unpause() { state = 'play'; $('pause').classList.remove('show'); if (actx) actx.resume(); last = performance.now(); lockOn(); }
function quitToTitle() { try { daySave(); } catch (e) {} ARENA = null; woodsUi(false); state = 'title'; document.body.classList.remove('playing'); $('pause').classList.remove('show'); craftEl.hidden = statsEl.hidden = deathCard.hidden = true; $('title').classList.add('show'); titleText(); if (actx) actx.suspend(); }
$('begin').addEventListener('click', () => startRun(false));
// a pad can't answer the browser's own question, so on a controller the button asks a second press instead
$('beginNew').addEventListener('click', () => {
  const b = $('beginNew'), t = b.querySelector('b'), s = t.nextElementSibling;
  if (inputMode !== 'pad') { if (confirm('Start a new Daylight run? Your saved run will be lost.')) startRun(true); return; }
  if (b.dataset.arm) { delete b.dataset.arm; t.textContent = 'new run'; s.textContent = 'Start again from nothing. Your saved run is lost.'; startRun(true); return; }
  b.dataset.arm = 1; t.textContent = 'sure?'; s.textContent = 'Press A again to start over. Your saved run will be lost.';
  setTimeout(() => { if (b.dataset.arm) { delete b.dataset.arm; t.textContent = 'new run'; s.textContent = 'Start again from nothing. Your saved run is lost.'; } }, 4000);
});
menuBtn.addEventListener('click', () => { if (state === 'play' && !menusOpen()) pause(); });
$('resume').addEventListener('click', unpause);
$('quit').addEventListener('click', quitToTitle);
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') { if (menusOpen()) { try { daySave(); } catch (e) {} } else pause(); } });
addEventListener('pagehide', () => { if (S && S.day && state !== 'title') try { daySave(); } catch (e) {} });
function syncSet() {
  $('sSens').value = SET.sens; $('sFov').value = SET.fov; $('sFovV').textContent = SET.fov + '°';
  $('sZoom').value = SET.isoZoom; $('sZoomV').textContent = isoZoomName();
  for (const b of document.querySelectorAll('#sQual .tab')) b.setAttribute('aria-pressed', b.dataset.q === SET.quality ? 'true' : 'false');
  $('sInv').setAttribute('aria-pressed', SET.invert ? 'true' : 'false');
  $('sInk').setAttribute('aria-pressed', SET.ink ? 'true' : 'false');
  $('sGrass').setAttribute('aria-pressed', SET.grass ? 'true' : 'false'); for (const o of grassMesh.meshes) o.visible = SET.grass;
  $('sFps').setAttribute('aria-pressed', SET.fps ? 'true' : 'false');
  $('sSnd').setAttribute('aria-pressed', SET.sound ? 'true' : 'false');
  $('sCol').setAttribute('aria-pressed', COLOUR ? 'true' : 'false');
  $('sView').setAttribute('aria-pressed', SET.view !== 'first' ? 'true' : 'false'); $('sView').textContent = 'View: ' + VIEW_NAME[SET.view];
  document.body.classList.toggle('iso', isoP());
  if (isoP()) lockOff();
  document.body.classList.toggle('showfps', SET.fps);
}
$('sSens').addEventListener('input', e => { SET.sens = +e.target.value; saveSet(); });
$('sZoom').addEventListener('input', e => { SET.isoZoom = +e.target.value; $('sZoomV').textContent = isoZoomName(); saveSet(); });
$('sFov').addEventListener('input', e => { SET.fov = +e.target.value; $('sFovV').textContent = SET.fov + '°'; saveSet(); resize(); });
for (const b of document.querySelectorAll('#sQual .tab')) b.addEventListener('click', () => {
  SET.quality = b.dataset.q; saveSet();
  pixK = SET.quality === 'fast' ? Math.min(DPR, 0.8) : SET.quality === 'sharp' ? QCAP : Math.min(QCAP, TOUCH ? 1.25 : 1.5);
  resize(); syncSet();
});
$('sView').addEventListener('click', () => { SET.view = nextView(); saveSet(); syncSet(); });
$('sInk').addEventListener('click', () => { SET.ink = !SET.ink; saveSet(); syncSet(); });
$('sGrass').addEventListener('click', () => { SET.grass = !SET.grass; saveSet(); syncSet(); });
$('sInv').addEventListener('click', () => { SET.invert = !SET.invert; saveSet(); syncSet(); });
$('sFps').addEventListener('click', () => { SET.fps = !SET.fps; saveSet(); syncSet(); });
$('sSnd').addEventListener('click', () => { SET.sound = !SET.sound; saveSet(); syncSet(); if (sfxGain) setSoundOn(SET.sound); });
$('sCol').addEventListener('click', () => { COLOUR = !COLOUR; SET.colour = COLOUR; saveSet(); syncSet(); if (S && S.day) { renderHotbar(); thingsKey = ''; } });
syncSet();
$('how').innerHTML = TOUCH
  ? '<div><b>Left thumb</b> moves · <b>right thumb</b> drags to look · <b>Attack</b> also drags to look</div><div><b>Take</b> picks up, opens, drinks · <b>Pack</b> crafts and equips · tap the hotbar to hold something</div><div>Hold <b>Attack</b> with a bow or sling to draw, let go to loose · <b>Sneak</b> to creep up on animals · hold <b>Block</b> to block</div>'
  : '<div><b>WASD</b> move · <b>mouse</b> look · <b>click</b> attack, chop, mine · <b>Space</b> jump · hold <b>right click</b> to block</div><div><b>E</b> take, open, drink · <b>C</b> pack and crafting · <b>1–6</b> or <b>wheel</b> hotbar · <b>Q</b> sneak · <b>K</b> throw your spear</div><div>Building with the hammer: <b>Z X</b> turn · <b>[ ]</b> piece · <b>N</b> kind · <b>V</b> snap · <b>B</b> pull down · <b>Esc</b> menu</div>';

// ---------------- the loop, and keeping the frame rate up ----------------
// The sharpness (pixK) steps down when frames keep being dropped against the screen's own beat, and only tries a step up after
// a long smooth spell, never past a level that was dropping them until it has been smooth a good while. It used to climb
// whenever it read over 57 fps and only fall back under 50, so it settled just below the screen's rate, a dropped frame every
// few (Joe: "frame rate is 58 but it is not running smooth"), and it resized the screen every few seconds as it hunted, a hitch
// of its own each time. A frame dropped because the game itself took too long that frame (building a pond, a save) isn't the
// drawing's fault, so it doesn't count against the sharpness.
let fpsAcc = 0, fpsN = 0, fpsShow = 0, lastDrop = -99, hurtFx = 0, healFx = 0, lastHp = null;
const AQ = { iv: 1 / 60, dts: [], miss: 0, all: 0, hist: [], good: 0, ceil: 9, tryAt: -99, cpu: 0 };
function autoQuality(rawDt, now) {
  fpsAcc += rawDt; fpsN++; AQ.dts.push(rawDt);
  if (rawDt > AQ.iv * 1.6) { AQ.all++; if (AQ.cpu < AQ.iv * 0.75) AQ.miss++; }   // shown twice (or more): the drawing's doing, unless the frame before was long in the game itself
  if (fpsAcc < 0.5) return;
  const fps = fpsN / fpsAcc, miss = AQ.miss, H = AQ.hist; fpsShow = fps; fpsAcc = 0; fpsN = 0;
  const d = AQ.dts.sort((x, y) => x - y), med = d[d.length >> 1]; AQ.dts.length = 0;
  AQ.iv = Math.min(AQ.iv * 1.01, med);   // the screen's beat: the steadiest a half second has run lately (60, 120, 144 a second...)
  $('fps').textContent = `${Math.round(fps)} fps · ${pixK.toFixed(2)}x` + (AQ.all ? ` · ${AQ.all} dropped` : '');
  AQ.miss = AQ.all = 0;
  if (SET.quality !== 'auto' || state !== 'play') { H.length = 0; AQ.good = 0; return; }
  H.push(miss); if (H.length > 8) H.shift();
  if (miss) AQ.good = 0; else AQ.good++;
  const sum = n => H.slice(-n).reduce((t, v) => t + v, 0);
  if (sum(2) >= 4 || (H.length >= 8 && sum(8) >= 5)) {   // a burst, or one or two a second for four seconds: a step down
    H.length = 0;
    if (pixK > 0.55) { AQ.ceil = pixK * 0.97; pixK = Math.max(0.55, pixK * 0.88); resize(); lastDrop = now; }
    else if (grassMesh.geometry.drawRange.count > GR_N * 1.2) grassMesh.geometry.setDrawRange(0, Math.floor(Math.min(GR_N, grassMesh.geometry.drawRange.count / 3) * 0.7) * 3);   // still dropping at the lowest sharpness: thin the grass
  } else if (AQ.good >= 20) {   // ten seconds without one dropped: a step up, toward the ceiling
    AQ.good = 0;
    if (pixK >= Math.min(QCAP, AQ.ceil) - 0.01 && AQ.ceil < QCAP && now - lastDrop > 30 && now - AQ.tryAt > 20) { AQ.ceil *= 1.07; AQ.tryAt = now; }   // half a minute smooth at the ceiling: try one higher
    const to = Math.min(QCAP, AQ.ceil, pixK * 1.07);
    if (to > pixK + 0.01) { pixK = to; resize(); }
  }
}
let titleYaw = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const fT0 = performance.now();
  const now = t / 1000, rawDt = Math.min(0.1, Math.max(0, (t - last) / 1000)); last = t;
  const rdt = Math.min(rawDt, 1 / 20);
  pollPad(rdt);
  LU.time.value = now;
  if (state === 'title' || !S) {
    titleYaw += rdt * 0.04; cam.position.set(0, terrH(0, 0) + EYE, 0); cam.rotation.set(0.05, titleYaw, 0); cam.updateMatrixWorld(); LU.camPos.value.copy(cam.position); LU.fogC.value.copy(cam.position);
    envFrame(); IN.lx = IN.ly = 0;
    inkRender(); return;
  }
  if (state === 'play') {
    if (IN.pause) { IN.pause = false; pause(); }
    // look: straight away, never slowed by hit-stop, so the view always answers your hand
    const free = S.running && !menusOpen();
    if (free) { const k = aimSensK(); look.yaw -= IN.lx * k; look.pitch = clamp(look.pitch - IN.ly * k * (SET.invert ? -1 : 1), -1.3, 1.2); }   // drawn and zoomed in, the view turns slower
    IN.lx = IN.ly = 0;
    readMove(); if (!free) MV.x = MV.y = 0;
    if (free && isoP()) isoAim(rdt);
    let dt = rdt;
    if (S.hitstop > 0) { S.hitstop -= rdt; dt = 0; }   // a blow lands: everything holds dead still for a beat
    if (S.running) {
      simStep(dt);
      beamStep();
      saveT += rdt; if (saveT > 30) { saveT = 0; daySaveIdle(); }
    }
    if (menusOpen() && document.pointerLockElement) lockOff();
    autoQuality(rawDt, now);
  } else { IN.lx = IN.ly = 0; }
  // what changed this frame for the hurt and heal flashes
  const hp = S.rg.hp; if (lastHp !== null) { if (hp < lastHp) { hurtFx = 1; VIEW_FX.trauma = Math.min(1, VIEW_FX.trauma + 0.35); } else if (hp > lastHp) healFx = 1; } lastHp = hp;
  envFrame(); weatherFrame(now); weatherLight(); lifeFrame(rdt);
  worldSync(false); thingsSync(false);
  for (const b of [tallB, coverB, plantB, bushB, nodeB, dropB]) b.m.uniforms.now.value = S.t;
  tallB.m.uniforms.cull.value = drawR();
  if (SET.grass) grassMask(S.p.x, S.p.y, WORLD.lakes, S.day.bld.size * 31 + S.day.builds.length);
  flagStep(now);
  const fdt = state === 'play' && S.running ? (S.hitstop > 0 ? 0 : rdt) : 0;
  lightsFrame(now, fdt); tpTorchTongue(); tonguesEnd();
  placeCamera(fdt, rdt, now);
  thingsFrame(now); treesFrame(); propsFrame(); hintsFrame(now);
  drawFigures(now, fdt);
  fxFrame(fdt, now);
  if (state === 'play') combatFrame(fdt, rdt, now); else combatDraw(rdt, now);
  shN = shBase; for (const e of S.rg.enemies) if (!e.dead && !(e.cl && e.cl.z > 1)) shadow(e.x, e.y, 9 * foeScale(e), -30); for (const o of S.day.beasts) shadow(o.x, o.y, (BEAST[o.k] ? BEAST[o.k].w : 10) * 0.8, -12); if (thirdP()) shadow(S.p.x, S.p.y, 8, -24); shadowsEnd();
  figuresEnd();
  flushPoints(fdt);
  hurtFx = Math.max(0, hurtFx - rdt * 1.6); healFx = Math.max(0, healFx - rdt * 1.4);
  $('hurt').style.opacity = Math.max(hurtFx, S.rg.hp <= 1 && state === 'play' && !S.rg.inCamp ? 0.25 + 0.1 * Math.sin(now * 4) : 0);
  $('heal').style.opacity = healFx;
  $('cold').style.opacity = S.day.warm < 30 ? (1 - S.day.warm / 30) * 0.8 : 0;
  grainEl.style.transform = `translate(${(Math.random() * 64 - 64) | 0}px, ${(Math.random() * 64 - 64) | 0}px)`;
  hotbarEl.hidden = !(state === 'play' && S.running && S.rg.phase === 'fight');
  document.body.classList.toggle('fallen', S.rg.phase === 'dead');
  buildbarEl.hidden = hotbarEl.hidden || dayTool() !== 'build' || !craftEl.hidden;
  drawHud(); audioFrame();
  groundMesh.position.set(Math.round(S.p.x / 10) * 10, 0, Math.round(S.p.y / 10) * 10);   // the ground's grid rides along with you
  sunShadows();
  inkRender();
  renderer.clearDepth(); renderer.render(vmScene, vmCam);
  AQ.cpu = (performance.now() - fT0) / 1000;   // (autoQuality) how long the frame took on this side, in seconds
}
addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);
window.__fp = { get S() { return S; }, look, MV, IN, startRun, cam, renderer, simStep, beamStep, get fps() { return fpsShow; }, get pixK() { return pixK; }, worldSync, thingsSync };
