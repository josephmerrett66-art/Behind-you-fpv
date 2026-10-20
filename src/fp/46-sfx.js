// ================= recorded sounds, for everything that used to be made out of noise and tones =================
// Joe: "do a full sound fix rework on anything that is code generated and get live sounds from free sources". Nearly every
// sound in the game was built on the spot: a burst of filtered noise for a chop, a falling sine for a thud, the footstep
// recording pitched up for a pickup. Now each kind of sound is a few real recordings (assets/sfx.json; where each came from
// is in assets/SOUNDS.md), and a play picks one at random (never the same one twice running) and nudges its pitch, so nothing
// repeats exactly. A sound with a place in the world goes through placeOut (left or right, in front or behind, how far, the
// woods' echo); one that's yours (your hands, your pack, the menus) plays straight. snd() gives back null when it has no
// recording of that kind, so the old built sound can stay behind it as a stand-in: snd('chop', ...) || noiseAt(...).
const SFX = /*SFX*/0;
const SB = {}, SBL = {};
// how loud each kind sits against the rest (the recordings are all levelled to the same peak)
const SFXV = {
  step_grass: 0.42, step_leaves: 0.42, step_dirt: 0.42, step_wood: 0.45, step_stone: 0.4, step_sand: 0.4, step_snow: 0.4, water_wade: 0.5,
  pick: 0.45, stick_pick: 0.45, stone_pick: 0.4, bush_rustle: 0.5, grass_pull: 0.5, bag: 0.45, cloth: 0.4, leather: 0.45,
  ui_click: 0.35, ui_tick: 0.3, ui_open: 0.4, ui_close: 0.4, ui_confirm: 0.4, ui_error: 0.4, paper: 0.45, book_flip: 0.4,
  chop_wood: 0.8, chop: 0.75, tree_crack: 0.9, tree_fall: 1, wood_break: 0.85, stone_break: 0.85, mining: 0.7,
  whoosh: 0.5, bow_draw: 0.5, bow_release: 0.6, arrow_whiz: 0.5, arrow_hit_wood: 0.7, arrow_hit_flesh: 0.7,
  hit_flesh: 0.8, blade_flesh: 0.75, punch: 0.75, body_fall: 0.8, metal_clang: 0.7, metal_l: 0.5, metal_m: 0.6, wood_l: 0.5, wood_m: 0.6, wood_h: 0.75, plank: 0.6,
  eat: 0.55, drink: 0.55, water_fill: 0.5, pour: 0.5, sizzle: 0.45, meat_cut: 0.6, cloth_tear: 0.5,
  hammer_wood: 0.65, build_thud: 0.7, door_open: 0.55, door_close: 0.6, creak: 0.45, chest_open: 0.5, chest_close: 0.5, latch: 0.45, trap_snap: 0.7, rope: 0.45,
  fishing_cast: 0.5, reel: 0.45, splash: 0.7, splash_small: 0.55, swim: 0.5, fire_ignite: 0.6, fire_pop: 0.45, match: 0.5,
  heartbeat: 0.7, breath_tired: 0.45, player_hurt: 0.6, jump_land: 0.5, bell: 0.55, pot: 0.45, coins: 0.4,
  bird_song: 0.5, bird_crow: 0.55, bird_woodpecker: 0.5, bird_owl: 0.55, bird_wings: 0.6, bird_hawk: 0.45, frog: 0.5, tree_creak: 0.45, branch_snap: 0.7, leaves_rustle: 0.5,
  wolf_howl: 0.7, wolf_growl: 0.7, wolf_bark: 0.7, boar: 0.65, bear: 0.8, deer: 0.6, bat: 0.45, bat_wings: 0.45,
  thunder: 1, drum: 0.9, cave_drip: 0.45, creature_screech: 0.85, creature_growl: 0.8,
  step_mud: 0.42, blade_draw: 0.45, craft: 0.55, chimes: 0.5, snap: 0.6, wind_gust: 0.5, gull: 0.4, grouse: 0.6, grouse_cluck: 0.5, bird_alarm: 0.55,
  bed_day: 0.55, bed_night: 0.5, bed_wind: 0.4, bed_pond: 0.55, bed_cave: 0.55, fire_loop: 0.5,   // the beds, under everything
};
function sfxInit() {   // (on the tap that starts the sound, with the rest: 45-audio)
  if (!SFX || !actx) return;
  for (const k in SFX) {
    SB[k] = [];
    SFX[k].forEach((d, i) => { try { const bin = atob(d), u = new Uint8Array(bin.length); for (let j = 0; j < bin.length; j++) u[j] = bin.charCodeAt(j); actx.decodeAudioData(u.buffer, b => { b.lead = vocLead(b); SB[k][i] = b; }, () => {}); } catch (e) {} });
  }
}
{ const ia = initAudio; initAudio = function () { const had = !!actx; ia.apply(this, arguments); if (!had && actx) sfxInit(); }; }
const sndHas = k => !!(SB[k] && SB[k].some(Boolean));
function sndBuf(k) {
  const B = (SB[k] || []).filter(Boolean); if (!B.length) return null;
  let i = Math.floor(Math.random() * B.length); if (B.length > 1 && B[i] === SBL[k]) i = (i + 1 + Math.floor(Math.random() * (B.length - 1))) % B.length;
  return (SBL[k] = B[i]);
}
// k: the kind · o: x, y (where it is) or who (the thing making it, followed while it plays) · v loudness · far (how far it carries)
// rate, j (how much the pitch wanders, either way) · at (seconds from now) · lp (muffle above this) · dur (cut it short, faded)
// pan (for one of yours: a little to one side) · out (straight into this node instead)
function snd(k, o = {}) {
  if (!actx || !sfxGain || !SET.sound && !o.force) return null;
  const b = sndBuf(k); if (!b) return null;
  const t = actx.currentTime + (o.at || 0), rate = (o.rate || 1) * (1 + (Math.random() * 2 - 1) * (o.j ?? 0.05)), v = (o.v ?? 1) * (SFXV[k] ?? 0.6);
  const len = Math.min(o.dur || 1e9, (b.duration - b.lead) / rate);
  let out;
  if (o.out) { out = actx.createGain(); out.gain.value = v; out.connect(o.out); }
  else if (o.x !== undefined || o.who) { out = placeOut(o.x ?? o.who.x, o.y ?? o.who.y, v, o.far || 700, o.who || null, len + (o.at || 0) + 0.4); if (!out) return null; }
  else {
    out = actx.createGain(); out.gain.value = v;
    if (o.pan && actx.createStereoPanner) { const pn = actx.createStereoPanner(); pn.pan.value = clamp(o.pan, -1, 1); out.connect(pn); pn.connect(sfxGain); } else out.connect(sfxGain);
  }
  const s = actx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
  let node = s;
  if (o.lp) { const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
  if (o.dur) { const g = actx.createGain(); g.gain.setValueAtTime(1, t); g.gain.setValueAtTime(1, t + Math.max(0, len - 0.06)); g.gain.linearRampToValueAtTime(0.0001, t + len); node.connect(g); node = g; }
  node.connect(out); s.start(t, b.lead); if (o.dur) s.stop(t + len + 0.02);
  return s;
}
// the same, at the player: for what you do with your own hands (a small lean to the side it happens on)
const sndMe = (k, o = {}) => snd(k, o);
// a kind of sound for a given place: the nearest of what's there (e.g. step_leaves else step_grass)
function sndAny(keys, o) { for (const k of keys) if (sndHas(k)) return snd(k, o); return null; }

// ---- sounds that keep going: a fire's crackle, the water's edge, the woods round you ----
// An emitter is one recording on a loop, placed like any other sound but kept up for as long as it's wanted; its loudness
// eases to whatever it's last set to, so it can fade in and out as you come and go.
const EMIT = new Set();
function emitter(k, o = {}) {
  if (!actx || !sfxGain || !sndHas(k)) return null;
  const b = sndBuf(k), s = actx.createBufferSource(); s.buffer = b; s.loop = true; s.playbackRate.value = o.rate || 1;
  const lvl = actx.createGain(); lvl.gain.value = 0;
  const E = { k, x: o.x || 0, y: o.y || 0, who: o.who || null, vol: 0, want: 0, far: o.far || 500, s, lvl, flat: !!o.flat, P: null };
  s.connect(lvl);
  if (E.flat) lvl.connect(o.out || sfxGain);
  else {
    const P = { x: E.x, y: E.y, vol: 1, far: E.far, who: E.who }, lp = actx.createBiquadFilter(), g = actx.createGain(); lp.type = 'lowpass'; lp.Q.value = 0.6;
    lvl.connect(lp); lp.connect(g); P.g = g; P.lp = lp;
    const R = forestVerb(); if (R) { P.wet = actx.createGain(); lp.connect(P.wet); P.wet.connect(R.in); }
    if (actx.createPanner) { const pn = actx.createPanner(); pn.panningModel = 'HRTF'; pn.distanceModel = 'linear'; pn.refDistance = 1; pn.maxDistance = 1e4; pn.rolloffFactor = 0; P.pn = pn; g.connect(pn);
      if (actx.createStereoPanner) { P.bal = actx.createStereoPanner(); pn.connect(P.bal); P.bal.connect(sfxGain); } else pn.connect(sfxGain); }
    else g.connect(sfxGain);
    E.P = P; placeSet(P, placeCalc(P), true);
  }
  s.start(actx.currentTime, Math.random() * Math.max(0, b.duration - 0.1));   // from anywhere in it, so two of the same aren't in step
  EMIT.add(E); return E;
}
function emitSet(E, v, x, y) { if (!E) return; E.want = v; if (x !== undefined) { E.x = x; E.y = y; } }
function emitStop(E) { if (!E) return; E.dead = 1; E.want = 0; }
function emitFrame(dt) {
  if (!actx) return;
  const t = actx.currentTime;
  for (const E of EMIT) {
    E.vol += (E.want - E.vol) * Math.min(1, dt * 2.5);
    E.lvl.gain.setTargetAtTime(E.vol * (SFXV[E.k] ?? 0.6), t, 0.05);
    if (E.P) { E.P.x = E.x; E.P.y = E.y; placeSet(E.P, placeCalc(E.P), false); }
    if (E.dead && E.vol < 0.003) { try { E.s.stop(); } catch (e) {} E.lvl.disconnect(); EMIT.delete(E); }
  }
}
{ const af = audioFrame; audioFrame = function () { af.apply(this, arguments); emitFrame(frameDtTP || 0.016); }; }

// what a beast sounds like: kind is charge (it comes at you), angry (it turns on you), bolt (it runs), call (it calls out)
function beastVoice(b, kind) {
  const k = b && b.k;
  if (k === 'wolf') return kind === 'bolt' ? 'wolf_bark' : kind === 'call' ? 'wolf_howl' : 'wolf_growl';
  if (k === 'boar' || k === 'bear') return k;
  if (k === 'deer') return kind === 'bolt' && Math.random() < 0.5 ? 'leaves_rustle' : 'deer';
  return 'leaves_rustle';
}

// ---- what's underfoot ----
// Your footsteps are the one recording, pitched about, whatever you walk on (Joe: "the footsteps should stay one noise instead
// of changing for different textures"; for a while they changed with the ground). What's underfoot is still worked out here,
// for the thump of a landing, which you don't hear in water.
function floorUnder(x, y) {
  const D = S && S.day; if (!D || !D.bld || !D.bld.size) return null;
  for (const o of D.bld.values()) { if (!o.done || Math.abs(o.x - x) > GRID || Math.abs(o.y - y) > GRID) continue; const P = PC(o.id); if (P.k === 'floor' && stDistTo(o, x, y) < 3) return P.m; }
  return null;
}
function stepKind(x, y) {
  if (typeof caveIn === 'function' && caveIn()) return ['step_stone'];
  const pd = pondDepth(x, y); if (pd > 0.35) return ['water_wade', 'splash_small'];
  if (BEACH && terrH(x, y) < SEA_Y - 0.4) return ['water_wade', 'splash_small'];
  const fl = floorUnder(x, y); if (fl) return fl === 'stone' ? ['step_stone'] : fl === 'thatch' ? ['step_grass'] : ['step_wood'];
  if (BEACH && coastS(x, y) > -165) return ['step_sand', 'step_dirt'];
  if (Math.hypot(x - EX_FIRE.x, y - EX_FIRE.y) < PIT_R * 0.8) return ['step_dirt', 'step_grass'];   // the trodden ground round the pit
  const L = landAt(x, y), cover = landCover(x, y), wet = wxK('rain');
  if (L[1] > 0.55) return ['step_stone', 'step_dirt'];   // rocky ground
  if (wet > 0.4 && Math.random() < 0.5) return ['step_mud', 'step_dirt'];
  if (L[2] > 0.5) return ['step_dirt', 'step_grass'];   // dry, bare
  return cover > 0.35 || L[0] > 0.4 ? ['step_leaves', 'step_grass'] : ['step_grass', 'step_leaves'];
}

// ---- the old built sounds that were whole functions of their own ----
{ const f = playClang; playClang = function () { if (S && S.day ? snd('punch', { v: 0.9 }) && (snd('leather', { v: 0.7 }) || 1) : snd('metal_clang')) return; return f.apply(this, arguments); }; }   // a blow your armour takes
{ const f = playHeartbeat; playHeartbeat = function (k) { if (snd('heartbeat', { v: 0.45 + 0.6 * k, j: 0.02 })) return; return f.apply(this, arguments); }; }
{ const f = playChestOpen; playChestOpen = function () { if (snd('chest_open')) return; return f.apply(this, arguments); }; }
{ const f = playFoeWind; playFoeWind = function (e, M) { if (monNear(e, 700) > 0 && snd('cloth', { x: e.x, y: e.y, who: e, v: M && M.heavy ? 1.3 : 1, rate: M && M.heavy ? 0.8 : 1 })) return; return f.apply(this, arguments); }; }   // the scrape of a foot set back
{ const f = playFoeStrike; playFoeStrike = function (e, M) { if (monNear(e, 700) > 0 && snd('whoosh', { x: e.x, y: e.y, who: e, v: M && M.heavy ? 1.2 : 1, rate: M && M.heavy ? 0.78 : 1 })) return; return f.apply(this, arguments); }; }
{ const f = playSpearWind; playSpearWind = function (e) { if (snd('cloth', { x: e.x, y: e.y, who: e, v: 1.1 })) return; return f.apply(this, arguments); }; }
{ const f = playSpearThrow; playSpearThrow = function (e) { if (snd('whoosh', { x: e.x, y: e.y, who: e, v: 1.1, rate: 0.85, far: 900 })) return; return f.apply(this, arguments); }; }
{ const f = playBowDraw; playBowDraw = function (e) { const s = snd('bow_draw', { x: e.x, y: e.y, who: e, far: 800 }); if (s) { e.drawSnd = s; return; } return f.apply(this, arguments); }; }
{ const f = playBowLoose; playBowLoose = function (e) { if (snd('bow_release', { x: e.x, y: e.y, who: e, far: 900 })) return; return f.apply(this, arguments); }; }

// a weapon's swing: one real swish, timed to land just before the blow (heavier and slower for a club or an axe)
function sndSwing(w, D) {
  if (!sndHas('whoosh')) return false;
  if (D.proj) return !!snd('bow_draw', { v: 0.7 });
  const heavy = w === 'club' || w === 'axe' || D.charge, h = D.hits ? D.hits[0].at : D.hitAt || 0.12;
  snd('whoosh', { at: Math.max(0, h - (heavy ? 0.16 : 0.1)), rate: heavy ? 0.8 : w === 'knife' || w === 'twin' ? 1.25 : 1, v: (D.fin ? 1.1 : 0.85) * (heavy ? 1.1 : 1) });
  if (D.hits) for (let i = 1; i < D.hits.length; i++) snd('whoosh', { at: Math.max(0, D.hits[i].at - 0.1), rate: 0.92, v: 0.8 });
  return true;
}
