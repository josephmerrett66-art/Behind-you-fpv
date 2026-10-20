// ================= recorded sounds for the woods' own small noises (see 46-sfx) =================
// Each of these used to be made up on the spot out of noise and tones. Where there's a recording of the thing, it plays
// instead, in the same place; where there isn't, the built one is still there behind it.

// the fishing (71-fish): the cast, the float going in, the bite, the hook set, the line snapping, the fish landed
{
  const F = fSnd, wrap = (k, f) => { const o = F[k]; F[k] = function () { if (f.apply(this, arguments)) return; return o.apply(this, arguments); }; };
  wrap('whip', c => snd('fishing_cast', { v: 0.6 + 0.6 * c }) || snd('whoosh', { v: 0.4 + 0.5 * c, rate: 1.1 }));
  wrap('plop', (x, y, k = 1) => snd('splash_small', { x, y, v: 0.6 + 0.5 * k, far: 500 }));
  wrap('thud', (x, y) => snd('wood_l', { x, y, v: 0.8, far: 500 }));
  wrap('bite', (x, y) => snd('splash', { x, y, v: 0.9, far: 600 }));
  wrap('hook', () => snd('reel', { v: 0.8, dur: 0.35 }) || snd('rope', { v: 0.8 }));
  wrap('splash', (x, y, k = 1) => snd(k > 0.7 ? 'splash' : 'splash_small', { x, y, v: 0.5 + 0.5 * k, far: 600 }));
  wrap('snap', () => snd('branch_snap', { v: 0.8, rate: 1.5 }));
  { const o = F.land; F.land = function (big) { if (!snd('splash', { v: big ? 1.1 : 0.85 })) return o.apply(this, arguments); if (!actx) return; const t = actx.currentTime;
    for (const [f, d] of [[660, 0], [880, 0.08], [1320, 0.16]]) toneAt(t + 0.12 + d, f * (big ? 0.8 : 1), 0.35, 0.03, 'triangle', sfxGain); }; }   // the little ring of the catch stays
}

// the small things on the ground (87-critters): a lizard's claws on grit, a grouse going up and its alarm, the hens' cluck
{ const cs = critSnd; critSnd = function (b, k) {
  if (actx && Math.hypot(b.x - S.p.x, b.y - S.p.y) < 750) {
    const o = { x: b.x, y: b.y, who: b, far: 750 };
    if (k === 'skit' && snd('leaves_rustle', Object.assign(o, { v: 0.3, rate: 1.5, dur: 0.3 }))) return;
    if (k === 'flush' && snd('bird_wings', Object.assign(o, { v: 1 }))) return;
    if (k === 'cackle' && sndAny(['grouse', 'bird_alarm'], Object.assign(o, { v: 0.9 }))) return;
    if (k === 'cluck' && sndAny(['grouse_cluck', 'grouse'], Object.assign(o, { v: 0.35, dur: 0.5 }))) return;
  }
  return cs.apply(this, arguments);
}; }

// the cannibals' noises that aren't voices (72-clan): a twig going under a foot, the brush pushed through, a club knocked on
// a club, a body coming down, a breath close behind you. Their voices were already recordings.
{ const CLR = { twig: 'branch_snap', rustle: 'leaves_rustle', clack: 'wood_l', thud: 'body_fall', breath: 'breath_tired' };
  const cs = clanSnd; clanSnd = function (k, x, y, v = 1, vp = 120, who = null) {
    if (actx && CLR[k] && CL_SND[k] && snd(CLR[k], { x, y, who, v: v * CL_SND[k][0] * (k === 'breath' ? 0.8 : 1), far: CL_SND[k][1], rate: k === 'clack' ? 1.15 : k === 'breath' ? 0.92 : 1 })) return;
    return cs.apply(this, arguments);
  }; }

// the pale things in the caves (80-pale): the shriek, the rattle in the throat, the hurt and the dying
{ const PR = { shriek: ['creature_screech', 1], hurt: ['creature_growl', 1.1], die: ['creature_screech', 0.75], rattle: ['creature_growl', 0.9], breath: ['breath_tired', 0.7] };
  const ps = paleSnd; paleSnd = function (k, x, y, v = 1, vp = 210, who = null) {
    if (actx && PR[k] && PALE_SND[k] && snd(PR[k][0], { x, y, who, v: v * PALE_SND[k][0], far: PALE_SND[k][1], rate: PR[k][1] })) return;
    return ps.apply(this, arguments);
  }; }

// nightfall: it used to be a low built swell; now the dark comes in with a wolf far off, and an owl starting up
{ const rs = playRingSting; playRingSting = function () {
  const m = S && S.rg && S.rg.ringMsg, p = S && S.p;
  if (m && m.text === 'night' && p && sndHas('wolf_howl')) {
    const a = Math.random() * TAU; snd('wolf_howl', { x: p.x + Math.cos(a) * 1400, y: p.y + Math.sin(a) * 1400, far: 2600, v: 0.9 });
    const b = a + 2 + Math.random() * 2; snd('bird_owl', { x: p.x + Math.cos(b) * 380, y: p.y + Math.sin(b) * 380, at: 3 + Math.random() * 3, far: 1200 });
    return;
  }
  return rs.apply(this, arguments);
}; }
