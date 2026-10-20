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
  if (VOX) for (const k in VOX) { CL_VB[k] = []; VOX[k].forEach((c, i) => dec(c.d, buf => { buf.lead = vocLead(buf); buf.voice = c.v; CL_VB[k][i] = buf; })); }   // the clan's recorded voices, each marked with whose it is
  dec(AMB_SRC, b => { const s = actx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(ambG); s.start(); });
  noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  forestVerb();   // made now, on the tap that starts the sound, not mid-fight on the first cannibal's call (it takes a few frames' worth)
}
function setSoundOn(on) { if (sfxGain) sfxGain.gain.setTargetAtTime(on ? 0.9 : 0, actx.currentTime, 0.05); }
function startBurnLoop() {   // the hiss of a raider burning in your torchlight, looped
  const s = actx.createBufferSource(); s.buffer = mon.burn; s.loop = true; s.loopStart = 0.38; s.loopEnd = 0.75;
  burnG = actx.createGain(); burnG.gain.value = 0; s.connect(burnG); burnG.connect(sfxGain); s.start(0, 0.38);
}
// ---- where a sound is, kept up while it plays ----
// Joe: "they should change where they sit in the sound scape to show where they are in orientation to the player so if they are
// to your left and right you can hear them. It should also be distance based". A placed sound used to be set once, as it started,
// and then stayed where it was in your ears however you turned; and a plain left-right pan on top of the head-shaped one pushed
// anything off to one side almost wholly into one ear, so it sounded panned rather than placed. Now every placed sound is set
// again each frame from where you stand and which way you face (and, for a cannibal's, from where that cannibal has got to), so
// a call off to your left comes round in front as you turn to it, and a scream closes in as the one making it runs at you. The
// near-ear lean is gentler: a sound at your side is plainly that side, but still in both ears. And distance is heard three
// ways: quieter, duller (the trees and the air take the top off it), and more of it reaching you as echo off the woods.
const PLACED = [];
let FVERB = null;
function forestVerb() {   // the woods' echo: a short dense wash, darker as it dies away, a little different in each ear
  if (FVERB || !actx || !sfxGain || !actx.createConvolver) return FVERB;
  const sr = actx.sampleRate, n = Math.floor(sr * 1.6), ir = actx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c); let lp = 0;
    for (let i = 0; i < n; i++) { const t = i / sr, k = 0.12 + 0.85 * Math.exp(-t * 2.4); lp += k * ((Math.random() * 2 - 1) - lp); d[i] = lp * Math.exp(-t * 4.2) * (t < 0.025 ? t / 0.025 : 1); }
    for (let j = 0; j < 7; j++) d[Math.floor(sr * (0.016 + Math.random() * 0.09))] += (Math.random() < 0.5 ? -1 : 1) * (0.45 - j * 0.05);   // the first few trunks it comes back off
  }
  const conv = actx.createConvolver(); conv.buffer = ir; const g = actx.createGain(); g.gain.value = 1;
  conv.connect(g); g.connect(sfxGain); return (FVERB = { in: conv, g });
}
function placeCalc(P) {
  const p = S ? S.p : { x: 0, y: 0 }, w = P.who && !P.who.gone ? P.who : P, dx = w.x - p.x, dy = w.y - p.y, d = Math.hypot(dx, dy), a = S ? S.aimW : 0;
  const front = d > 1 ? (dx * Math.cos(a) + dy * Math.sin(a)) / d : 1, side = d > 1 ? (dx * -Math.sin(a) + dy * Math.cos(a)) / d : 0, u = clamp(d / P.far, 0, 1);
  return { side, front,
    dir: P.vol * Math.pow(1 - u, 1.4) * lerp(0.72, 1, sstep(-1, 0.2, front)),   // quieter further off, and a little behind your head
    wet: P.vol * 0.3 * Math.pow(1 - u, 0.5) * (0.12 + 0.88 * sstep(0.05, 0.75, u)),   // the echo falls away slower than the sound itself, so far off it's most of what you hear
    f: 900 + 13100 * Math.pow(1 - Math.min(u, 0.9), 1.6) * lerp(0.22, 1, sstep(-1, 0.15, front) ** 1.6) };   // duller with distance, and behind you (smoothly, no step at your shoulder)
}
function placeSet(P, v, now) {
  const t = actx.currentTime, set = (q, x) => { if (now) q.value = x; else q.setTargetAtTime(x, t, 0.04); };
  set(P.g.gain, v.dir); set(P.lp.frequency, v.f); if (P.wet) set(P.wet.gain, v.wet);
  if (P.pn) { if (P.pn.positionX) { set(P.pn.positionX, v.side); set(P.pn.positionY, 0.08); set(P.pn.positionZ, -v.front); } else P.pn.setPosition(v.side, 0.08, -v.front); }
  if (P.bal) set(P.bal.pan, clamp(P.pn ? v.side * 0.45 : Math.sign(v.side) * Math.abs(v.side) ** 0.7 * 0.85, -1, 1));
}
// x, y where it is (or who: the thing making it, followed while it plays), for about life seconds
function placeOut(x, y, vol, far = 700, who = null, life = 3) {
  if (!actx) return null;
  const P = { x, y, vol, far, who, until: actx.currentTime + life }, v = placeCalc(P);
  const inp = actx.createGain(), lp = actx.createBiquadFilter(), g = actx.createGain(); lp.type = 'lowpass'; lp.Q.value = 0.6;
  inp.connect(lp); lp.connect(g); P.g = g; P.lp = lp;
  const R = forestVerb(); if (R) { P.wet = actx.createGain(); lp.connect(P.wet); P.wet.connect(R.in); }
  // where it is round your head: a head-shaped (HRTF) panner, so left, right, in front and behind each sound like it, best in
  // headphones, with a gentle lean to the near side for phone speakers; a plain pan only where a browser has no such panner
  if (actx.createPanner) {
    const pn = actx.createPanner(); pn.panningModel = 'HRTF'; pn.distanceModel = 'linear'; pn.refDistance = 1; pn.maxDistance = 1e4; pn.rolloffFactor = 0; P.pn = pn; g.connect(pn);
    if (actx.createStereoPanner) { P.bal = actx.createStereoPanner(); pn.connect(P.bal); P.bal.connect(sfxGain); } else pn.connect(sfxGain);
  } else if (actx.createStereoPanner) { P.bal = actx.createStereoPanner(); g.connect(P.bal); P.bal.connect(sfxGain); } else g.connect(sfxGain);
  placeSet(P, v, true);
  PLACED.push(P); if (PLACED.length > 64) PLACED.shift();
  return inp;
}
function placeFrame() {   // every placed sound still playing, set again from where you are now
  if (!actx) return;
  const t = actx.currentTime;
  for (let i = PLACED.length - 1; i >= 0; i--) { const P = PLACED[i]; if (t > P.until) PLACED.splice(i, 1); else placeSet(P, placeCalc(P), false); }
  if (FVERB) FVERB.g.gain.setTargetAtTime(typeof caveIn === 'function' && caveIn() ? 0.25 : 1, t, 0.4);   // underground the rock's own echo takes over
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
  placeFrame();
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
// where a clip's sound really starts: an mp3 opens on a few tens of milliseconds of nothing, which you'd hear as a lag
function vocLead(buf) { const d = buf.getChannelData(0); let pk = 0; for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > pk * 0.06) return Math.max(0, i / buf.sampleRate - 0.004); return 0; }
