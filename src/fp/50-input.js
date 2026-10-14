// ================= your hands on the controls: keys and mouse, thumbs, or a controller =================
// Each press calls the main game's own action (attack, dodge, dayUse, dayCrouch, daySelect, openCraft, exDrink, daySpecial...).
const IN = { lx: 0, ly: 0, mx: 0, my: 0, pause: false };
const held = new Set();
let inputMode = TOUCH ? 'touch' : 'kb', state = 'title';
function setMode(m) { if (inputMode === m) return; inputMode = m; document.body.classList.toggle('touch', m === 'touch'); document.body.classList.toggle('pad', m === 'pad'); FP.layout(); }
document.body.classList.toggle('touch', inputMode === 'touch');
const playing = () => state === 'play' && S && S.running;
const menusOpen = () => !craftEl.hidden || !statsEl.hidden || !deathCard.hidden || !campEl.hidden;
const lockOn = () => { if (inputMode === 'kb' && !document.pointerLockElement && state === 'play' && !isoP()) { try { const r = document.body.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } };
const lockOff = () => { if (document.pointerLockElement) document.exitPointerLock(); };
function wpSpecial() { if (S && S.day && playing()) daySpecial(); }
function useNow() { if (playing()) dayUse(); }
function packToggle() { if (!S || !S.day || state !== 'play') return; if (!craftEl.hidden) { closeCraft(); lockOn(); } else if (S.running) { openCraft(); lockOff(); } }

// ---------------- keys and mouse ----------------
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys[k] = true; held.add(e.code);
  if (e.repeat) { if (playing() && dayTool() === 'build' && (k === 'z' || k === 'x')) stRot(k === 'z' ? -1 : 1); return; }
  setMode('kb');
  if (state === 'title') { if ((e.code === 'Enter' || e.code === 'Space') && ready) startRun(false); return; }
  if (state === 'pause') { if (e.code === 'Escape' || e.code === 'KeyP') unpause(); return; }
  if (state !== 'play') return;
  if (e.code === 'Escape') { if (!statsEl.hidden) { closeStats(); lockOn(); } else if (!craftEl.hidden) { closeCraft(); lockOn(); } else if (!menusOpen()) IN.pause = true; return; }
  if (k === 'c' || k === 'i' || k === 'tab') { e.preventDefault(); packToggle(); return; }
  if (!playing()) return;
  if (e.code === 'Space' || e.code === 'ShiftLeft' && false) { e.preventDefault(); dodge(); }
  if (e.code === 'KeyP') IN.pause = true;
  if (k === 'e') useNow();
  if (k === 'q') dayCrouch();
  if (k === 'h' || k === 'f') exDrink();
  if (k === 'j') attack();
  if (k === 'k' || e.code === 'ShiftRight') wpSpecial();
  if (e.code === 'ShiftLeft') SPR.held = true;   // hold left shift to sprint
  if (k >= '1' && k <= '6' && k.length === 1) daySelect(+k - 1);
  if (dayTool() === 'build') {
    if (k === 'z') stRot(-1); else if (k === 'x') stRot(1);
    else if (k === 'v') stSnapToggle(); else if (k === 'b') stDelToggle(); else if (k === '[') stCycle(-1); else if (k === ']') stCycle(1); else if (k === 'n') stCatCycle(1);
  }
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys[k] = false; held.delete(e.code); if (e.code === 'ShiftLeft') SPR.held = false; if (k === 'j') rngUp(); });
addEventListener('blur', () => { held.clear(); for (const k in keys) keys[k] = false; rngUp(); });
function rngUp() { if (S && S.day && S.day.draw) dayDrawRelease(); }   // any let-go of the attack: an arrow or a stone flies
canvas.addEventListener('contextmenu', e => e.preventDefault());
$('touch').addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => { if (document.pointerLockElement && state === 'play') { IN.lx += e.movementX * 0.0022 * SET.sens; IN.ly += e.movementY * 0.0022 * SET.sens; } });
addEventListener('mousedown', e => {
  if (state !== 'play' || inputMode === 'touch' || menusOpen() || e.target.closest('button, #hotbar, #buildbar')) return;
  if (!document.pointerLockElement && !isoP()) { lockOn(); return; }
  if (e.button === 0) attack(); else if (e.button === 2) dodge(); else if (e.button === 1) { e.preventDefault(); wpSpecial(); }
});
addEventListener('mouseup', e => { if (e.button === 0) rngUp(); });
addEventListener('wheel', e => {
  if (!playing() || (e.ctrlKey && isoP())) return;   // ctrl and the wheel zoom from above (77-iso.js)
  if (dayTool() === 'build' && held.has('ShiftLeft')) { stRot(e.deltaY > 0 ? 1 : -1); return; }
  daySelect((S.day.hot + (e.deltaY > 0 ? 1 : -1) + HOTN) % HOTN);
}, { passive: true });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && state === 'play' && inputMode === 'kb' && !menusOpen() && !isoP()) IN.pause = true; });

// ---------------- touch: a stick under your left thumb, the right side looks, buttons bottom right ----------------
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, looks = new Map();
const tl = $('touch');
tl.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  setMode('touch'); e.preventDefault();
  if (state !== 'play') return;
  if (e.clientX < VW * 0.42 && stick.id === null) { stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0; showStick(); }
  else looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { tl.setPointerCapture(e.pointerId); } catch (_) {}
});
function onMove(e) {
  if (e.pointerType === 'mouse') return;
  if (e.pointerId === stick.id) {
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const d = Math.hypot(dx, dy), R = 52;
    if (d > R * 1.6) { stick.ox += dx * (1 - R * 1.6 / d); stick.oy += dy * (1 - R * 1.6 / d); dx = e.clientX - stick.ox; dy = e.clientY - stick.oy; }   // the stick follows a thumb that wanders off it
    stick.x = clamp(dx / R, -1, 1); stick.y = clamp(dy / R, -1, 1); showStick(); return;
  }
  const L = looks.get(e.pointerId);
  if (L && looks.size === 2 && isoP()) {   // two thumbs on the right pinch to zoom from above
    const [A, B] = [...looks.values()], d0 = Math.hypot(A.x - B.x, A.y - B.y); L.x = e.clientX; L.y = e.clientY;
    const d1 = Math.hypot(A.x - B.x, A.y - B.y); if (d0 > 20 && d1 > 20) isoZoomBy(d0 / d1); return;
  }
  if (L) { const k = 0.0058 * SET.sens; IN.lx += (e.clientX - L.x) * k; IN.ly += (e.clientY - L.y) * k; L.x = e.clientX; L.y = e.clientY; }
}
function onUp(e) {
  if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; $('stick').style.display = 'none'; }
  looks.delete(e.pointerId);
  if (e.pointerId === atkPointer) { atkPointer = null; attackBtn.classList.remove('on'); rngUp(); }
}
addEventListener('pointermove', onMove, { passive: true });
addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
function showStick() { const s = $('stick'); s.style.display = 'block'; s.style.left = stick.ox + 'px'; s.style.top = stick.oy + 'px'; $('knob').style.transform = `translate(${stick.x * 40}px, ${stick.y * 40}px)`; }
// the attack button also looks: press it and drag to turn while you swing (or draw your bow)
let atkPointer = null;
const thumb = (el, fn, drag = true) => el.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation(); if (e.pointerType !== 'mouse') setMode('touch');
  fn(e); if (drag && e.pointerType !== 'mouse') { looks.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { el.setPointerCapture(e.pointerId); } catch (_) {} }
  el.classList.add('on'); if (el !== attackBtn) setTimeout(() => el.classList.remove('on'), 140);
});
thumb(attackBtn, e => { atkPointer = e.pointerId; attack(); });
thumb(dodgeBtn, () => dodge());
thumb(useBtn, () => useNow());
thumb(sneakBtn, () => { if (playing()) dayCrouch(); }, false);
thumb(flaskBtn, () => { if (playing()) exDrink(); }, false);
thumb($('bSpec'), () => wpSpecial());
craftBtn.addEventListener('click', () => packToggle());
campBtn.addEventListener('click', () => { if (playing()) { openWisps(); lockOff(); } });
$('bPack2').addEventListener('click', () => packToggle());
$('craftGo').addEventListener('click', () => { closeCraft(); lockOn(); });
$('statsGo').addEventListener('click', () => { closeStats(); lockOn(); });
$('dcGo').addEventListener('click', () => { deathCard.hidden = true; menuBtn.hidden = false; if (S.rg && S.rg.phase === 'dead') startRun(true); });
function closeStats() {
  statsEl.hidden = true;
  if (statsFrom === 'day') { statsFrom = null; menuBtn.hidden = false; craftBtn.hidden = false; renderHotbar(); S.running = true; }
}

// ---------------- a controller: left stick moves, right stick looks ----------------
const padPrev = []; let padTurn = 0, padAtk = false;
function pollPad(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp || !gp.connected) continue;
    const dz = (x, y, d = 0.16) => { const m = Math.hypot(x, y); if (m < d) return [0, 0]; const k = Math.min(1, (m - d) / (1 - d)) / m; return [x * k, y * k]; };
    const [mx, my] = dz(gp.axes[0] || 0, gp.axes[1] || 0), [rx, ry] = dz(gp.axes[2] || 0, gp.axes[3] || 0, 0.12);
    const btn = i => gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.4);
    let any = Math.abs(mx) + Math.abs(my) + Math.abs(rx) + Math.abs(ry) > 0;
    for (let i = 0; i < gp.buttons.length; i++) if (btn(i)) any = true;
    if (any) setMode('pad');
    if (inputMode !== 'pad') continue;
    IN.mx += mx; IN.my += my;
    // the right stick turns straight away: a gentle curve keeps small pushes fine, and held right over it speeds up within a beat
    const mag = Math.hypot(rx, ry), curve = mag > 0 ? Math.pow(mag, 1.3) / mag : 0;
    padTurn = mag > 0.85 ? Math.min(1, padTurn + dt * 6) : Math.max(0, padTurn - dt * 8);
    IN.lx += rx * curve * (3.8 + 1.8 * padTurn) * SET.sens * dt; IN.ly += ry * curve * 2.6 * SET.sens * dt;
    const press = i => btn(i) && !padPrev[i];
    padMenu(dt, btn, press, gp.axes[0] || 0, gp.axes[1] || 0, ry);
    if (state === 'play' && !menusOpen()) {
      if (press(7) || press(0)) attack();
      const a = btn(7) || btn(0); if (padAtk && !a) rngUp(); padAtk = a;
      if (press(1)) dodge();
      if (press(2)) useNow();
      if (press(3)) wpSpecial();
      if (press(4)) daySelect((S.day.hot + HOTN - 1) % HOTN);
      if (press(5)) daySelect((S.day.hot + 1) % HOTN);
      if (press(6)) exDrink();
      if (press(10)) sprintToggle();   // click the left stick to sprint
      if (press(11)) { if (SPR.on) SPR.on = false; dayCrouch(); }   // click the right stick to sneak
      if (press(12) && dayTool() === 'build') stCycle(-1); if (press(13) && dayTool() === 'build') stCycle(1);
      if (press(14) && dayTool() === 'build') stRot(-1); if (press(15) && dayTool() === 'build') stRot(1);
    }
    if (press(8)) packToggle();
    if (press(9)) { if (state === 'play') IN.pause = true; else if (state === 'pause') unpause(); else if (state === 'title' && ready) startRun(false); }
    for (let i = 0; i < gp.buttons.length; i++) padPrev[i] = btn(i);
  }
}
// what your hands ask of you this frame
function readMove() {
  let mx = 0, my = 0;
  if (held.has('KeyW') || held.has('ArrowUp')) my += 1; if (held.has('KeyS') || held.has('ArrowDown')) my -= 1;
  if (held.has('KeyA') || held.has('ArrowLeft')) mx -= 1; if (held.has('KeyD') || held.has('ArrowRight')) mx += 1;
  mx += stick.x + IN.mx; my += -stick.y - IN.my; IN.mx = IN.my = 0;
  MV.x = mx; MV.y = my;
}
FP.rumble = (k, ms) => { try { for (const gp of navigator.getGamepads ? navigator.getGamepads() : []) if (gp && gp.vibrationActuator) gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: k, weakMagnitude: k * 0.6 }); } catch (e) {} };
