// ================= fishing, done properly (Joe) =================
// Fish anywhere there's water: a pond, or the sea all round the island. With the rod out:
//  - cast: hold Attack and the rod comes back over your shoulder, further the longer you hold; let go and it whips forward,
//    the float sails out on its line and lands with a plop (on dry ground it just thumps down: reel it in and try again)
//  - wait: the float rides the water. Fish come and nibble (little dips and rings): pull on a nibble and you scare it off for
//    a while. Then the bite: the float is dragged right under. Press Attack, quick, to set the hook.
//  - the fight: hold Attack to reel. The line's tension shows on the meter. When the fish runs (a splash, the rod bends hard,
//    the reel screams) let go or the line snaps; turn the other way to it and you pull against it, so it tires faster and the
//    line holds better. Leave the line slack too long and it shakes the hook. Reel it right in and it's yours.
// Ponds hold perch, trout and the odd old pike; the sea mackerel, sea bass and big cod further out, and things wash up on the line.
const FISH = {
  pond: [
    { n: 'Perch', w: 5, cm: [15, 26], str: 0.6, give: 1 },
    { n: 'Trout', w: 3, cm: [28, 46], str: 0.9, give: 1 },
    { n: 'Old pike', w: 0.8, cm: [60, 95], str: 1.35, give: 2 },
    { n: 'Knot of weed', w: 0.9, junk: { fibre: 2 } },
    { n: 'Old bone', w: 0.4, junk: { bone: 1 } },
  ],
  sea: [
    { n: 'Mackerel', w: 5, cm: [24, 36], str: 0.8, give: 1 },
    { n: 'Sea bass', w: 2.6, cm: [40, 62], str: 1.1, give: 2 },
    { n: 'Cod', w: 1.2, cm: [60, 95], str: 1.45, give: 3, deep: 1 },
    { n: 'Kelp', w: 0.8, junk: { fibre: 3 } },
    { n: 'Old bottle', w: 0.35, junk: { rope: 1, flint: 2 } },
  ],
};
const FSH = { charge: 1.1, castMin: 40, castMax: 175, bite: 0.8, line: 185, reel: 17, take: 15 };
const fRnd = (a, b) => a + Math.random() * (b - a);
// the water at a spot: the sea (its surface rides the swell, as 15-sea draws it) or a pond
function seaSurfY(x, y) {
  const s = coastS(x, y), t = LU.time.value, k = _sst(-40, 60, s);
  return SEA_Y + k * ((0.3 + 0.55 * LU.wsz.value) * Math.sin(s * 0.12 + LU.wph.value) * _sst(-20, 140, s) + 0.18 * Math.sin(x * 0.07 + y * 0.05 + t * 1.7) + 0.12 * Math.sin(x * -0.05 + y * 0.09 + t * 2.3));
}
function fishWater(x, y) {
  if (BEACH) { const d = SEA_Y - terrH(x, y); if (d > 0.5) return { sea: true, y: seaSurfY(x, y), depth: d }; }
  const P = lakeAt(x, y, -6); if (P) return { sea: false, y: terrH(P.x, P.y) + 0.35, depth: 4, P };
  return null;
}
const FHOLD = { down: false };   // is Attack held

// ---------------- the float, out on the water ----------------
const bobG = new THREE.Group(); bobG.visible = false; bobG.scale.setScalar(1.5); scene.add(bobG);
const bobTop = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd8402c }));
const bobBot = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xece6d6 }));
const bobStem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.4, 5).translate(0, 2, 0), new THREE.MeshBasicMaterial({ color: 0x2a221c }));
bobG.add(bobTop, bobBot, bobStem);
// the line: from the rod's tip in your hand out to the float, drawn over the view the hands are drawn in
const LINE_N = 28, linePos = new Float32Array(LINE_N * 3), lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
const lineMesh = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xe8e2d2, transparent: true, opacity: 0.85, depthTest: false }));
lineMesh.frustumCulled = false; lineMesh.renderOrder = 20; lineMesh.visible = false; vmScene.add(lineMesh);

// ---------------- the meter ----------------
const fishHud = document.createElement('div'); fishHud.id = 'fishhud';
fishHud.innerHTML = '<div class="fh-cue"></div><div class="fh-bar"><div class="fh-zone"></div><div class="fh-fill"></div><div class="fh-mark"></div></div><div class="fh-row"><span class="fh-info"></span><span class="fh-stam"><i></i></span></div><div class="fh-tip"></div>';
document.body.appendChild(fishHud);
{ const st = document.createElement('style'); st.textContent = `
#fishhud { position: fixed; left: 50%; bottom: 23%; transform: translateX(-50%); width: min(340px, 70vw); font-family: var(--mono, monospace); color: #efe8dc; text-align: center; pointer-events: none; display: none; z-index: 5; text-shadow: 0 1px 2px #000; }
#fishhud.on { display: block; }
#fishhud .fh-cue { font-size: 15px; letter-spacing: 0.18em; min-height: 1.4em; margin-bottom: 6px; transition: transform 0.08s; }
#fishhud .fh-cue.big { font-size: 26px; color: #ffd27a; transform: scale(1.15); }
#fishhud .fh-cue.bad { color: #ff8a70; }
#fishhud .fh-bar { position: relative; height: 12px; border: 1px solid rgba(239,232,220,0.7); background: rgba(10,10,9,0.55); overflow: hidden; }
#fishhud .fh-zone { position: absolute; top: 0; bottom: 0; left: 18%; width: 57%; background: rgba(120,190,120,0.22); }
#fishhud .fh-fill { position: absolute; top: 0; bottom: 0; left: 0; width: 0; background: #8fd08a; }
#fishhud .fh-mark { position: absolute; top: -2px; bottom: -2px; left: 86%; width: 2px; background: #ff7a5a; }
#fishhud .fh-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 5px; opacity: 0.9; }
#fishhud .fh-stam { width: 80px; height: 5px; border: 1px solid rgba(239,232,220,0.5); }
#fishhud .fh-stam i { display: block; height: 100%; background: #9ac0d8; }
#fishhud .fh-tip { font-size: 11px; margin-top: 6px; opacity: 0.75; }
#fishhud.cast .fh-zone, #fishhud.cast .fh-mark, #fishhud.cast .fh-row { display: none; }
#fishhud.wait .fh-bar, #fishhud.wait .fh-row { display: none; }`; document.head.appendChild(st); }
const fhEl = k => fishHud.querySelector('.fh-' + k);

// ---------------- sounds ----------------
const fSnd = {
  whip(c) { if (!actx) return; const t = actx.currentTime; noiseAt(t, 1400 + 1600 * c, 900, 0.22, 0.12 + 0.12 * c, sfxGain); },
  plop(x, y, k = 1) { if (!actx) return; const t = actx.currentTime; const o = placeOut(x, y, 1, 500); if (!o) return; boomAt(t, 420, 140, 0.09, 0.3 * k, o); noiseAt(t + 0.01, 2600, 1400, 0.14, 0.22 * k, o); },
  thud(x, y) { if (!actx) return; const o = placeOut(x, y, 1, 500); if (o) boomAt(actx.currentTime, 160, 70, 0.08, 0.3, o); },
  nib(x, y) { if (!actx) return; const o = placeOut(x, y, 1, 400); if (o) { toneAt(actx.currentTime, 760 + Math.random() * 300, 0.12, 0.05, 'sine', o); noiseAt(actx.currentTime, 3200, 1500, 0.05, 0.06, o); } },
  bite(x, y) { if (!actx) return; const t = actx.currentTime, o = placeOut(x, y, 1, 600); if (o) { boomAt(t, 300, 90, 0.14, 0.45, o); noiseAt(t, 1800, 900, 0.28, 0.4, o); } toneAt(t + 0.02, 1320, 0.09, 0.05, 'triangle', sfxGain); },
  hook() { if (!actx) return; const t = actx.currentTime; noiseAt(t, 900, 500, 0.1, 0.25, sfxGain); toneAt(t, 220, 0.2, 0.06, 'sawtooth', sfxGain); },
  click(k) { if (!actx) return; toneAt(actx.currentTime, 2100 + 400 * Math.random(), 0.012, 0.018 + 0.01 * k, 'square', sfxGain); },
  scream(k) { if (!actx) return; noiseAt(actx.currentTime, 3800 + 1200 * k, 1800, 0.07, 0.05 + 0.05 * k, sfxGain); },
  creak(k) { if (!actx) return; toneAt(actx.currentTime, 120 + 160 * k, 0.09, 0.01 + 0.03 * k, 'sawtooth', sfxGain); },
  splash(x, y, k = 1) { if (!actx) return; const o = placeOut(x, y, 1, 600); if (o) { noiseAt(actx.currentTime, 2200, 1000, 0.18 + 0.1 * k, 0.25 * k, o); boomAt(actx.currentTime, 260, 100, 0.07, 0.15 * k, o); } },
  snap() { if (!actx) return; const t = actx.currentTime; noiseAt(t, 5200, 3000, 0.05, 0.45, sfxGain); toneAt(t, 1900, 0.18, 0.06, 'square', sfxGain); toneAt(t + 0.03, 480, 0.3, 0.04, 'triangle', sfxGain); },
  land(big) { if (!actx) return; const t = actx.currentTime; noiseAt(t, 1800, 800, 0.35, 0.35, sfxGain); for (const [f, d] of [[660, 0], [880, 0.08], [1320, 0.16]]) toneAt(t + 0.12 + d, f * (big ? 0.8 : 1), 0.35, 0.05, 'triangle', sfxGain); },
};
function fSplash(x, y, wy, n, sp = 1) {   // droplets thrown up off the water
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = (10 + Math.random() * 24) * sp; spark(x, wy - terrH(x, y) + 0.5, y, Math.cos(a) * v, (24 + Math.random() * 40) * sp, Math.sin(a) * v, 0.5 + Math.random() * 0.4, 1.6 + Math.random() * 1.6, 0.75, 0.85, 0.9, 0.55, 2, 90, 0.6); }
}
function fRing(x, y, wy, r = 6) { for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; spark(x + Math.cos(a) * r, wy - terrH(x, y) + 0.2, y + Math.sin(a) * r, Math.cos(a) * 14, 0, Math.sin(a) * 14, 0.55, 1.4, 0.7, 0.8, 0.85, 0.35, 2, 0, 2.2); } }

// ---------------- the game itself ----------------
const fState = () => S && S.day && S.day.fsh;
function fishPick(W) {
  const L = FISH[W.sea ? 'sea' : 'pond'].map(f => [f, f.w * (f.deep ? (W.depth > 7 ? 2.2 : 0.3) : 1)]);
  return wpick(L);
}
function fishPress() {   // Attack went down with the rod out
  const D = S.day, F = D.fsh; FHOLD.down = true;
  if (!F) {   // start the cast: the rod comes back
    D.fsh = { st: 'charge', t: 0 }; fSnd.creak(0.2); return;
  }
  if (F.st === 'wait') {
    if (F.nib > 0) { F.at += 3 + Math.random() * 3; F.nib = 0; F.cue = 'too soon · it took fright'; F.cueT = 1.4; F.bad = 1; fSnd.splash(F.x, F.y, 0.3); return; }
    D.fsh = null; exNote('you reel in'); fSnd.click(0.5); return;
  }
  if (F.st === 'bite') { fishHook(F); return; }
  if (F.st === 'dry') { D.fsh = null; return; }
}
function fishRelease() {
  FHOLD.down = false;
  const F = fState(); if (!F || F.st !== 'charge') return;
  const c = clamp(F.t / FSH.charge, 0.12, 1), p = S.p, a = S.aimW || 0, R = FSH.castMin + (FSH.castMax - FSH.castMin) * c;
  S.day.fsh = { st: 'fly', t: 0, T: 0.35 + 0.45 * c, c, x0: p.x + Math.cos(a) * 12, y0: p.y + Math.sin(a) * 12, z0: terrH(p.x, p.y) + EYE + 6, x1: p.x + Math.cos(a) * R, y1: p.y + Math.sin(a) * R, x: p.x, y: p.y, z: 0, whip: 0 };
  fSnd.whip(c); dayAct(4, 0.35);
}
function fishHook(F) {
  const f = F.fish, p = S.p;
  if (f.junk) {   // nothing fights: it just comes up on the line
    F.st = 'fight'; F.junkK = 1;
  } else F.st = 'fight';
  Object.assign(F, { t: 0, ten: f.junk ? 0.25 : 0.35, stam: 1, run: null, runT: fRnd(0.6, 1.6), side: 0, slack: 0, dist: Math.hypot(F.x - p.x, F.y - p.y), la: Math.atan2(F.y - p.y, F.x - p.x), clk: 0, cr: 0 });
  F.cue = f.junk ? 'something on the line' : 'hooked!'; F.cueT = 1; F.bad = 0;
  addShake(0.25); hitStop(0.05); padRumble(0.6, 160); fSnd.hook(); fSplash(F.x, F.y, F.wy, 14, 0.8);
}
function fishLose(why, bad = 1) {
  const D = S.day, F = D.fsh; if (!F) return;
  if (bad === 2) { fSnd.snap(); addShake(0.2); dayWear(2); }
  D.fsh = { st: 'lost', t: 0, why, x: F.x, y: F.y };
  exNote(why, true); dayChanged();
}
function fishLand(F) {
  const D = S.day, f = F.fish;
  fSplash(F.x, F.y, F.wy, 20, 1.2); fSnd.land(f.cm && f.cm[1] > 55);
  if (f.junk) {
    const got = []; for (const k in f.junk) { dayGive(k, f.junk[k]); got.push(`${f.junk[k]} ${DIT[k].n.toLowerCase()}`); }
    exNote(`${f.n.toLowerCase()} · ${got.join(', ')}`, true);
  } else {
    const cm = Math.round(F.cm), big = cm >= f.cm[0] + (f.cm[1] - f.cm[0]) * 0.8, n = f.give + (big ? 1 : 0);
    dayGive('fish', n);
    const best = D.fishBest || {}, pb = !best[f.n] || cm > best[f.n]; if (pb) best[f.n] = cm; D.fishBest = best;
    D.fishN = (D.fishN || 0) + 1;
    exNote(`caught a ${f.n.toLowerCase()} · ${cm} cm${pb ? ' · your biggest yet' : ''} · ${n} raw fish`, true);
    if (pb && cm > 50) dayJLog(`landed a ${cm} cm ${f.n.toLowerCase()}`);
  }
  addShake(0.2); dayWear(); dayChanged();
  D.fsh = { st: 'landed', t: 0, x: S.p.x, y: S.p.y };
}
function fishStep(dt) {
  const D = S.day, F = D.fsh; if (!F) return;
  const p = S.p; F.t += dt;
  if (dayTool() !== 'rod' || S.rg.phase !== 'fight') { D.fsh = null; FHOLD.down = false; return; }
  if (F.cueT > 0) F.cueT -= dt;
  if (F.st === 'charge') { if (!FHOLD.down) fishRelease(); else if (F.t > FSH.charge && !F.full) { F.full = 1; padRumble(0.2, 50); if (actx) toneAt(actx.currentTime, 1320, 0.06, 0.03, 'square', sfxGain); } return; }
  if (F.st === 'fly') {
    const u = Math.min(1, F.t / F.T);
    F.x = lerp(F.x0, F.x1, u); F.y = lerp(F.y0, F.y1, u);
    const W = u >= 1 ? fishWater(F.x, F.y) : null, g = terrH(F.x, F.y), end = W ? W.y : g;
    F.z = lerp(F.z0, end, u) + Math.sin(Math.PI * u) * (22 + 34 * F.c);
    if (u < 1) return;
    if (!W) { D.fsh = { st: 'dry', t: 0, x: F.x, y: F.y, z: g }; fSnd.thud(F.x, F.y); dayNote('dry', 'that landed on dry ground · cast at the water', 3); return; }
    const sea = W.sea, near = sea ? 0.8 : 1, dawn = (() => { const f = dayT(); return Math.abs(f - 0.05) < 0.08 || Math.abs(f - (NIGHT_IN - 0.03)) < 0.08; })();
    D.fsh = { st: 'wait', t: 0, x: F.x, y: F.y, wy: W.y, W, at: fRnd(3, 9) * near * (dawn ? 0.7 : 1), nibT: fRnd(1, 3), nib: 0, ring: 0, dip: 0 };
    fSnd.plop(F.x, F.y, 1); fRing(F.x, F.y, W.y, 3); fSplash(F.x, F.y, W.y, 6, 0.5);
    return;
  }
  if (F.st === 'dry' || F.st === 'lost' || F.st === 'landed') { if (F.t > (F.st === 'dry' ? 0.8 : 0.6)) D.fsh = null; return; }
  if (F.W && F.W.sea) F.wy = seaSurfY(F.x, F.y);
  if (Math.hypot(p.x - F.x, p.y - F.y) > FSH.line) return fishLose('the line ran out', 0);
  if (F.st === 'wait') {
    F.dip *= Math.exp(-dt * 6);
    if (F.nib > 0) F.nib -= dt;
    if ((F.nibT -= dt) <= 0 && F.t < F.at - 0.8) { F.nibT = fRnd(1.2, 3.5); F.nib = 0.5; F.dip = 0.9; fSnd.nib(F.x, F.y); fRing(F.x, F.y, F.wy, 2.5); }
    if (F.t >= F.at) {
      F.st = 'bite'; F.t = 0; F.fish = fishPick(F.W); F.dip = 3.2; F.cue = '!'; F.cueT = FSH.bite;
      if (F.fish.cm) F.cm = fRnd(F.fish.cm[0], F.fish.cm[1]) * (F.W.sea && F.W.depth > 8 ? 1.08 : 1);
      fSnd.bite(F.x, F.y); fSplash(F.x, F.y, F.wy, 10, 0.7); fRing(F.x, F.y, F.wy, 4); addShake(0.08); padRumble(0.4, 90);
    }
    return;
  }
  if (F.st === 'bite') {
    F.dip = 3 + Math.sin(F.t * 40) * 0.6;
    if (F.t > FSH.bite) { const D2 = S.day.fsh; Object.assign(D2, { st: 'wait', t: 0, at: fRnd(4, 10), nibT: fRnd(1, 3), nib: 0, dip: 0, cue: 'it stole the bait', cueT: 1.4, bad: 1 }); fSnd.splash(F.x, F.y, 0.4); }
    return;
  }
  // ---- the fight ----
  const f = F.fish, junk = !!f.junk, str = (junk ? 0.25 : f.str) * (F.stam < 0.25 ? 0.6 : 1), reel = FHOLD.down;
  if (!junk) {
    if (F.run) { F.run.t -= dt; if (F.run.t <= 0) { F.run = null; F.runT = fRnd(1.2, 3.4) / Math.max(0.5, str) * (0.6 + 0.8 * F.stam); } }
    else if ((F.runT -= dt) <= 0) { F.run = { t: fRnd(0.6, 1.0 + 1.2 * str) * (0.5 + 0.5 * F.stam), side: Math.random() < 0.5 ? -1 : 1 }; F.cue = 'it runs!'; F.cueT = 0.9; F.bad = 1; fSnd.splash(F.x, F.y, 0.9); fSplash(F.x, F.y, F.wy, 12, 0.9); padRumble(0.5, 120); }
  }
  const run = F.run;
  F.side += ((run ? run.side * 0.75 : 0) - F.side) * Math.min(1, dt * 2.2);
  const toFish = Math.atan2(F.y - p.y, F.x - p.x), off = angDiff(S.aimW || 0, toFish);
  const against = run && off * run.side < -0.2;   // you've turned away from where it's pulling
  F.against = against;
  let dT;
  if (reel) dT = (run ? 1.3 : 0.32) * str * (against ? 0.5 : 1) * (junk ? 0.6 : 1);
  else dT = run ? -0.35 : -0.85;
  F.ten = Math.max(0, F.ten + dT * dt);
  if (reel) F.dist -= (run ? 3.5 : FSH.reel) * dt * (0.75 + 0.5 * (1 - F.stam)) * (junk ? 0.8 : 1);
  else if (run) F.dist += FSH.take * str * dt;
  F.stam = Math.max(0, F.stam - dt * (0.035 + (reel ? 0.05 : 0) + (run && reel ? 0.09 : 0)) * (against ? 2.2 : 1) / Math.max(0.5, str));
  if (F.ten > 0.1) F.slack = 0; else if (!reel) F.slack += dt;
  // the fish moves about out there: further off as it takes line, swinging to the side it runs
  F.la += angDiff(toFish + F.side * 0.6, F.la) * Math.min(1, dt * 1.5);
  F.x = p.x + Math.cos(F.la) * F.dist; F.y = p.y + Math.sin(F.la) * F.dist;
  const W = fishWater(F.x, F.y); if (W) { F.wy = W.y; F.W = W; }
  F.dip = run ? 1.6 + Math.sin(F.t * 30) * 0.5 : 0.6 + Math.sin(F.t * 9) * 0.2;
  if (run && Math.random() < dt * 8) fSplash(F.x, F.y, F.wy, 3, 0.6);
  // the reel and the line
  if (reel && (F.clk -= dt) <= 0) { F.clk = run ? 0.03 : 0.07; if (run) fSnd.scream(F.ten); else fSnd.click(F.ten); }
  if (F.ten > 0.6 && (F.cr -= dt) <= 0) { F.cr = 0.18 - 0.1 * F.ten; fSnd.creak(F.ten); }
  if (F.ten >= 1) return fishLose('the line snapped', 2);
  if (F.slack > (junk ? 99 : 2.4)) return fishLose('it shook the hook', 1);
  if (F.dist > FSH.line - 5) return fishLose('it took all your line', 1);
  if (F.dist < 7 || (W && W.depth < 0.15 && F.dist < 24)) return fishLand(F);
}

// ---------------- drawing: the float, the line, the rod bending, the meter ----------------
const _fv = new V3(), _fw = new V3(), _ft = new V3();
const FOV_K = Math.tan(58 * Math.PI / 360) / Math.tan(70 * Math.PI / 360);
function toVm(w, out) {   // a point in the world, placed in the hands' own view so it lands on the same spot on screen
  _fv.copy(w).applyMatrix4(cam.matrixWorldInverse); const z = Math.min(-0.6, _fv.z), k = Math.min(1, 90 / -z);
  return out.set(_fv.x * FOV_K * k, _fv.y * FOV_K * k, z * k);
}
function fishDraw(now, dt) {
  const F = fState(), on = !!F && dayTool() === 'rod';
  const G = ITEM.get('rod');
  // the rod: back over the shoulder while you hold the cast, whipping through, bending to a fish
  if (G && G.visible) {
    const A = G.getObjectByName('rodA'), B = G.getObjectByName('rodB'), C = G.getObjectByName('rodC'), crank = G.getObjectByName('crank');
    let bend = 0, back = 0, shake = 0;
    if (on && F.st === 'charge') back = clamp(F.t / FSH.charge, 0, 1);
    if (on && F.st === 'fly') { const u = clamp(F.t / 0.16, 0, 1), v = clamp((F.t - 0.16) / 0.35, 0, 1); back = F.t < 0.16 ? 1 - u * 1.5 : -0.5 * (1 - smooth(v)); bend = -0.35 * Math.sin(Math.PI * u); }
    if (on && F.st === 'bite') bend = 0.3 + 0.1 * Math.sin(now * 40);
    if (on && F.st === 'wait') bend = 0.04 + F.dip * 0.05;
    if (on && F.st === 'fight') { bend = 0.18 + 0.85 * F.ten; shake = F.run ? 0.5 : 0.15 * F.ten; }
    const b0 = (G.userData.bend ?? 0) + (bend - (G.userData.bend ?? 0)) * Math.min(1, dt * 12); G.userData.bend = b0;
    const jit = shake ? (Math.sin(now * 47) * 0.6 + Math.sin(now * 71) * 0.4) * shake : 0;
    if (A) { A.rotation.x = -(b0 * 0.12 + jit * 0.02); B.rotation.x = -(b0 * 0.3 + jit * 0.04); C.rotation.x = -(b0 * 0.5 + jit * 0.06); }
    if (crank && on && F.st === 'fight' && FHOLD.down) crank.rotation.x -= dt * (F.run ? 30 : 14);
    // the arm: up and back for the cast, raised against a fish
    const k = back > 0 ? back : back < 0 ? back : 0;
    handG.rotation.x += 0.9 * k + (on && F.st === 'fight' ? 0.35 + 0.25 * F.ten : 0) + jit * 0.05;
    handG.position.y += 2.5 * Math.max(0, k) + (on && F.st === 'fight' ? 1.5 : 0);
    handG.position.z += 2 * Math.max(0, k);
    handG.rotation.z += jit * 0.03;
    handG.updateMatrixWorld(true);
  }
  // the float
  const showBob = on && ['fly', 'wait', 'bite', 'fight', 'dry'].includes(F.st);
  bobG.visible = showBob;
  if (showBob) {
    let y = F.st === 'fly' ? F.z : F.st === 'dry' ? F.z + 1 : F.wy + 0.4 - (F.dip || 0) + Math.sin(now * 2.2) * 0.2;
    bobG.position.set(F.x, y, F.y);
    bobG.rotation.z = F.st === 'bite' || (F.st === 'fight' && F.run) ? Math.sin(now * 25) * 0.5 : Math.sin(now * 1.7) * 0.12;
    const lt = pondMat.uniforms.lt.value, l = 0.35 + 0.65 * lt;
    bobTop.material.color.setRGB(0.85 * l, 0.25 * l, 0.17 * l); bobBot.material.color.setRGB(0.92 * l, 0.9 * l, 0.84 * l);
    if (F.st === 'wait' && Math.random() < dt * 1.2) fRing(F.x, F.y, F.wy, 2);
  }
  // the line from the rod's tip to the float (in the air while it flies)
  const tipO = G && G.visible ? G.getObjectByName('rodTip') : null;
  lineMesh.visible = !!(showBob && tipO);
  if (lineMesh.visible) {
    tipO.getWorldPosition(_ft);   // in the hands' view
    _fw.set(_ft.x / FOV_K, _ft.y / FOV_K, _ft.z).applyMatrix4(cam.matrixWorld);   // the same spot on screen, out in the world
    const ex = F.x, ey = (F.st === 'fly' ? F.z : bobG.position.y) + 1.2, ez = F.y;
    const tense = F.st === 'fight' ? clamp(F.ten * 1.4, 0, 1) : F.st === 'fly' ? 0.6 : 0.15;
    const span = Math.hypot(ex - _fw.x, ez - _fw.z), sag = (1 - tense) * Math.min(9, span * 0.07);
    for (let i = 0; i < LINE_N; i++) {
      const u = i / (LINE_N - 1);
      const w = new V3(lerp(_fw.x, ex, u), lerp(_fw.y, ey, u) - sag * 4 * u * (1 - u), lerp(_fw.z, ez, u));
      if (i === 0) linePos.set([_ft.x, _ft.y, _ft.z], 0); else { toVm(w, _fv); linePos.set([_fv.x, _fv.y, _fv.z], i * 3); }
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineMesh.material.opacity = 0.55 + 0.4 * pondMat.uniforms.lt.value;
  }
  // the meter
  const hud = on && ['charge', 'wait', 'bite', 'fight'].includes(F.st);
  fishHud.className = hud ? 'on ' + (F.st === 'charge' ? 'cast' : F.st === 'fight' ? 'fight' : 'wait') : '';
  if (hud) {
    const cue = fhEl('cue'), fill = fhEl('fill'), tip = fhEl('tip');
    if (F.st === 'charge') {
      const c = clamp(F.t / FSH.charge, 0, 1); fill.style.width = (c * 100) + '%'; fill.style.background = '#e8d8a8';
      cue.textContent = c >= 1 ? 'FULL CAST · LET GO' : 'CASTING'; cue.className = 'fh-cue'; tip.textContent = 'let go of Attack to cast';
    } else if (F.st === 'wait' || F.st === 'bite') {
      const bite = F.st === 'bite';
      cue.textContent = bite ? '! STRIKE !' : F.cueT > 0 ? F.cue : 'waiting for a bite'; cue.className = 'fh-cue' + (bite ? ' big' : F.cueT > 0 && F.bad ? ' bad' : '');
      tip.textContent = bite ? 'press Attack now' : 'watch the float · a nibble isn\'t a bite · Attack reels in';
    } else {
      fill.style.width = Math.min(100, F.ten * 100) + '%';
      fill.style.background = F.ten > 0.86 ? '#ff6a4a' : F.ten > 0.75 ? '#e8b84a' : F.ten < 0.18 ? '#9aa8b0' : '#8fd08a';
      const sideTxt = F.run ? (F.against ? 'pulling against it' : `it pulls ${angDiff(Math.atan2(F.y - S.p.y, F.x - S.p.x) + F.run.side, S.aimW || 0) > 0 ? 'left · turn right' : 'right · turn left'}`) : '';
      cue.textContent = F.cueT > 0 ? F.cue : F.run ? 'IT RUNS · EASE OFF' : F.ten < 0.12 ? 'slack line · reel!' : F.stam < 0.25 ? 'it\'s tiring' : 'reel it in';
      cue.className = 'fh-cue' + (F.run || F.ten > 0.86 ? ' bad' : F.cueT > 0 && !F.bad ? ' big' : '');
      fhEl('info').textContent = `${Math.round(F.dist / 21)} m out` + (sideTxt ? ' · ' + sideTxt : '');
      fhEl('stam').firstChild.style.width = (F.stam * 100) + '%';
      tip.textContent = 'hold Attack to reel · let go when it runs';
    }
  }
}

// ---------------- wired in ----------------
dayCast = function () { fishPress(); };   // the rod's Attack (dayPrimary)
dayFishStep = function (dt) { S.day.fish = null; fishStep(dt); };
{ const up = rngUp; rngUp = function () { up(); if (FHOLD.down) { FHOLD.down = false; if (fState() && fState().st === 'charge') fishRelease(); } }; }
{ const verb = dayVerb; dayVerb = function () { const T = heldIt(); if (T && T.tool === 'rod') { const F = fState(); return !F ? 'Cast' : F.st === 'charge' ? 'Let go' : F.st === 'bite' ? 'Strike!' : F.st === 'fight' ? 'Reel' : F.st === 'wait' ? 'Reel in' : 'Cast'; } return verb(); }; }
{ const ph = placeHands; placeHands = function (dt, now, bob, lag) { ph(dt, now, bob, lag); try { fishDraw(now, dt); } catch (e) { console.error(e); } }; }
{ const sv = daySave; daySave = function () { const D = S && S.day, F = D && D.fsh; if (D) D.fsh = null; try { return sv.apply(this, arguments); } finally { if (D) D.fsh = F; } }; }
DIT.rod.b = 'Cast into a pond or the sea · hold Attack to cast further · strike on the bite, then reel it in';
