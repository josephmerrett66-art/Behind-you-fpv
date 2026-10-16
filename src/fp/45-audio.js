// ================= sound: the main game's own voices, placed around your head =================
// The main game's sounds (src/ported.js) all play through actx, sfxGain and OUT, and ask monOut() where a thing is. Here monOut
// pans it left or right of where you face, quietens it with distance and muffles it when it's behind you.
let ambG = null, burnG = null;
function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  actx = new AC();
  OUT = actx.createBiquadFilter(); OUT.type = 'lowpass'; OUT.frequency.value = 20000; OUT.Q.value = 0.5; OUT.connect(actx.destination);
  sfxGain = actx.createGain(); sfxGain.gain.value = SET.sound ? 0.9 : 0; sfxGain.connect(OUT);
  ambG = actx.createGain(); ambG.gain.value = 0; ambG.connect(sfxGain);
  const dec = (b64, done) => { try { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); actx.decodeAudioData(u.buffer, done, () => {}); } catch (e) {} };
  dec(SND.step, b => { stepBuf = b; });
  for (const k of ['death', 'burn', 'big', 'small']) if (SND[k]) dec(SND[k], b => { mon[k] = b; if (k === 'burn') startBurnLoop(); });
  if (VOX) for (const k in VOX) { CL_VB[k] = []; VOX[k].forEach((b, i) => dec(b, buf => { CL_VB[k][i] = buf; })); }   // the clan's recorded voices
  dec(AMB_SRC, b => { const s = actx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(ambG); s.start(); });
  noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
}
function setSoundOn(on) { if (sfxGain) sfxGain.gain.setTargetAtTime(on ? 0.9 : 0, actx.currentTime, 0.05); }
function startBurnLoop() {   // the hiss of a raider burning in your torchlight, looped
  const s = actx.createBufferSource(); s.buffer = mon.burn; s.loop = true; s.loopStart = 0.38; s.loopEnd = 0.75;
  burnG = actx.createGain(); burnG.gain.value = 0; s.connect(burnG); burnG.connect(sfxGain); s.start(0, 0.38);
}
function placeOut(x, y, vol, far = 700) {
  if (!actx) return null;
  const p = S ? S.p : { x: 0, y: 0 }, dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy), a = S ? S.aimW : 0;
  const front = d > 1 ? (dx * Math.cos(a) + dy * Math.sin(a)) / d : 1, side = d > 1 ? (dx * -Math.sin(a) + dy * Math.cos(a)) / d : 0;
  const g = actx.createGain(); g.gain.value = vol * Math.pow(clamp(1 - d / far, 0, 1), 1.4);
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = front < -0.2 ? 1300 + 1500 * (1 + front) : 12000;
  g.connect(lp);
  if (actx.createStereoPanner) { const pn = actx.createStereoPanner(); pn.pan.value = clamp(side * 0.85, -1, 1); lp.connect(pn); pn.connect(sfxGain); } else lp.connect(sfxGain);
  return g;
}
// the few sounds update() made itself
const FPX = {
  reset() {},
  step(running, side) {
    if (!actx || !stepBuf) return;
    const t = actx.currentTime, src = actx.createBufferSource(); src.buffer = stepBuf;
    src.playbackRate.value = (running ? 1.06 : 0.92) + Math.random() * 0.16;
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200 + Math.random() * 3500;
    const g = actx.createGain(); g.gain.value = (S.day && S.day.crouch ? 0.3 : running ? 0.62 : 0.45) * (0.8 + Math.random() * 0.35);
    src.connect(lp); lp.connect(g);
    if (actx.createStereoPanner) { const pan = actx.createStereoPanner(); pan.pan.value = side * 0.12; g.connect(pan); pan.connect(sfxGain); } else g.connect(sfxGain);
    src.start(t);
  },
  click(on) {
    if (!actx || !stepBuf) return;
    const src = actx.createBufferSource(); src.buffer = stepBuf; src.playbackRate.value = on ? 3.2 : 2.7;
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 3;
    const g = actx.createGain(), t = actx.currentTime; g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(bp); bp.connect(g); g.connect(sfxGain); src.start(t); src.stop(t + 0.07);
  },
  thud() { VIEW_FX.trauma = Math.min(1, VIEW_FX.trauma + 0.08); },
};
// how loud the woods are round you: quiet in the day, louder and closer at night; the burn hiss follows the hottest raider in your light
function audioFrame() {
  if (!actx || !S || !S.day) return;
  const t = actx.currentTime, night = 1 - dayLight();
  if (ambG) ambG.gain.setTargetAtTime(0.16 + 0.34 * night, t, 0.5);
  if (burnG) {
    let k = 0; for (const e of S.rg.enemies) if (!e.dead && e.beam > 0) k = Math.max(k, e.beam * (1 - Math.hypot(e.x - S.p.x, e.y - S.p.y) / 500));
    burnG.gain.setTargetAtTime(0.35 * clamp(k, 0, 1), t, 0.08);
  }
  const low = S.rg.hp <= 1 && !S.rg.inCamp;
  OUT.frequency.setTargetAtTime(low ? 1100 : 20000, t, 0.3);
}
