// ================= small life: lizards, grouse and turtles (Joe's number 7) =================
// Lizards bask beside the warm rocks and out on the sand. Come near and one darts off in quick stop-start bursts, freezes,
// darts again, and is gone into a crack. Grouse peck about the woods in little flocks; get too close and they burst up all
// together with a whirr of wings, fly off low and glide down again a way off (and the deer nearby hear it and bolt). Turtles
// plod about the edges of ponds and up the beach, and pull into their shells when you come up to them.
// All three are animals like the rest (D.beasts): you can hunt them, sneak up and stab them, shoot them, even out of the air.
// They have their own ways and their own bodies here; the woods' beast step and drawing leave them alone.
Object.assign(BEAST, {
  lizard: { hp: 0.35, sp: 250, w: 5, h: 3, scare: 80, drop: { meat: 1 }, crit: 1 },
  grouse: { hp: 0.7, sp: 230, w: 6, h: 9, scare: 145, drop: { meat: 1, feather: 2 }, crit: 1 },
  turtle: { hp: 2.6, sp: 12, w: 9, h: 6, scare: 70, drop: { meat: 2, shell: 1 }, crit: 1 },
});
Object.assign(DIT, {
  feather: { n: 'Feathers', c: '#d8cbb0', st: 30, k: 'mat', b: 'From grouse · fletch arrows with them and the same wood makes more' },
  shell: { n: 'Turtle shell', c: '#6e6a3e', st: 5, k: 'mat', b: 'Hard and light · plates for armour, or a bowl to mix herbs in' },
});
DREC.push({ id: 'arrowsFe', g: 'wpn', name: 'Flint arrows, feathered', out: 'arrows', n: 10, at: 'hand', cost: { sticks: 3, flint: 1, feather: 2 } });
Object.assign(ICON, {
  feather: '<path d="M5 20.5C8 13 12.5 6.5 19.5 3.5c-.6 7.4-5.4 12.6-12.4 15.2z" fill="#d8cbb0"/><path d="M4 21.5L17 6" stroke="#8a7a5a" stroke-width="1.1" stroke-linecap="round"/><path d="M9.5 15.5l-2.6-1.2M12 12.4l-2.8-1.4M14.4 9.6l-2.4-1.6M11.6 14.6l2.6.4M14 11.6l2.8.2" stroke="#a8987a" stroke-width=".8"/>',
  shell: '<path d="M2.5 15.5C3 9 7 5.5 12 5.5S21 9 21.5 15.5z" fill="#6e6a3e"/><path d="M2 15.5h20v1.6c-3 1.6-17 1.6-20 0z" fill="#b4a676"/><g fill="none" stroke="#3e3d28" stroke-width="1"><path d="M9 7.6l-1.4 3.6 2 4.3M15 7.6l1.4 3.6-2 4.3M7.6 11.2h8.8M5 12.8l2.6-1.6M19 12.8l-2.6-1.6"/></g>',
});
Object.assign(MAT_GET, { feather: 'hunt grouse, in the woods', shell: 'hunt turtles, at the ponds and on the beach' });
{ const H = BOOK.find(b => b.id === 'hunt'); if (H) H.items.push('feather', 'shell'); }

const CRIT = { C: 560, back: DAY_LEN * 1.2, cap: 18, near: 300, hide: { lizard: 0.3, grouse: 0.36, turtle: 0.5 } };   // hide: crouched, how much of its notice is left at best (a grouse is hard to creep up on)
const critOf = b => !!(b && BEAST[b.k] && BEAST[b.k].crit);
const CRT = { ch: new Map(), clk: 2 };

// ---------------- where they live ----------------
function critOk(x, y, wet) {
  if (x > CAVE_X0 - 400 || inPlaza(x, y)) return false;
  if (!NO_CAMP && Math.hypot(x, y) < CAMP_R + 120) return false;
  if (BEACH && (coastS(x, y) > -34 || terrH(x, y) < SEA_Y + 1.2)) return false;
  if (!wet && pondAt(x, y, 6)) return false;
  if (propsNear(x, y, 30).some(o => (o.kind === 'tree' || o.kind === 'rock' || o.kind === 'rockIron' || o.kind === 'crag') && Math.hypot(o.x - x, o.y - y) < (o.r || 8) * (o.s || 1) * 0.6 + 5)) return false;
  if (S.day.builds.some(B => Math.hypot(B.x - x, B.y - y) < 150)) return false;   // they keep away from where you've built
  return Math.hypot(x - S.p.x, y - S.p.y) > CRIT.near;
}
function critMake(k, x, y, key, o) {
  const b = Object.assign({ kind: 'beast', k, chunk: key, x, y, r: 0, s: 1, hp: BEAST[k].hp, st: 'graze', t: Math.random() * 3, dir: Math.random() * 6.283, sp: 0, ph: Math.random() * 9, flash: 0, z: 0, hx: x, hy: y, seed: Math.random() }, o);
  S.day.beasts.push(b); return b;
}
function critStock(dt) {
  const D = S.day, p = S.p;
  if ((CRT.clk -= dt) > 0) return; CRT.clk = 1.5;
  if (caveIn()) return;
  let alive = D.beasts.filter(b => !b.dead && critOf(b)).length; if (alive >= CRIT.cap) return;
  const C = CRIT.C, R = 1150;
  for (let ci = Math.floor((p.x - R) / C); ci <= Math.floor((p.x + R) / C); ci++)
    for (let cj = Math.floor((p.y - R) / C); cj <= Math.floor((p.y + R) / C); cj++) {
      const key = 'cr' + ci + ',' + cj, at = CRT.ch.get(key);
      if (at !== undefined && D.t - at < CRIT.back) continue;
      CRT.ch.set(key, D.t);
      if (alive >= CRIT.cap || D.beasts.some(b => b.chunk === key && !b.dead)) continue;
      const cx = (ci + 0.5) * C, cy = (cj + 0.5) * C, s = BEACH ? coastS(cx, cy) : -9999, r = Math.random();
      const spot = (f, wet) => { for (let k = 0; k < 14; k++) { const q = f(); if (q && critOk(q[0], q[1], wet)) return q; } return null; };
      const inChunk = () => [cx + (Math.random() - 0.5) * C * 0.9, cy + (Math.random() - 0.5) * C * 0.9];
      const pond = lakesNear(cx, cy, C * 0.5).find(P => Math.abs(P.x - cx) < C / 2 && Math.abs(P.y - cy) < C / 2);
      let made = 0;
      if (pond && r < 0.55) {   // turtles round the edge of the pond
        const n = 1 + (Math.random() < 0.45 ? 1 : 0);
        for (let i = 0; i < n; i++) { const q = spot(() => { const a = Math.random() * 6.283, d = pond.rad + 6 + Math.random() * 16; return [pond.x + Math.cos(a) * d, pond.y + Math.sin(a) * d]; }, true); if (q) { critMake('turtle', q[0], q[1], key); made++; } }
      } else if (s > -460 && r < 0.6) {   // the beach: turtles up from the sea, lizards on the warm sand
        const turt = Math.random() < 0.45, k = turt ? 'turtle' : 'lizard', n = turt ? 1 + (Math.random() < 0.3 ? 1 : 0) : 1 + (Math.random() * 2 | 0);
        for (let i = 0; i < n; i++) { const q = spot(() => { const [x, y] = inChunk(), cs = coastS(x, y); return cs > -150 && cs < -40 ? [x, y] : null; }); if (q) { critMake(k, q[0], q[1], key); made++; } }
      } else if (r < 0.5) {   // a flock of grouse in the woods
        const c = spot(inChunk), n = 3 + (Math.random() * 3 | 0);
        if (c) for (let i = 0; i < n; i++) { const q = spot(() => [c[0] + (Math.random() - 0.5) * 50, c[1] + (Math.random() - 0.5) * 50]); if (q) { critMake('grouse', q[0], q[1], key); made++; } }
      } else if (r < 0.78) {   // lizards by the rocks
        const rocks = propsNear(cx, cy, C * 0.45).filter(o => o.kind === 'rock' || o.kind === 'crag'), n = 1 + (Math.random() * 2 | 0);
        for (let i = 0; i < n; i++) { const q = spot(() => { const o = rocks[(Math.random() * rocks.length) | 0]; if (!o) return null; const a = Math.random() * 6.283, d = (o.r || 10) * (o.s || 1) * 0.6 + 6 + Math.random() * 8; return [o.x + Math.cos(a) * d, o.y + Math.sin(a) * d]; }); if (q) { critMake('lizard', q[0], q[1], key); made++; } }
      }
      alive += made;
    }
}

// ---------------- how they behave ----------------
function critScare(b) {
  const p = S.p, a = Math.atan2(b.y - p.y, b.x - p.x);
  if (b.dead) return;
  if (b.k === 'lizard') {
    if (b.st === 'dart' || b.st === 'freeze') return;
    b.st = 'dart'; b.t = 0.18 + Math.random() * 0.2; b.dir = a + (Math.random() - 0.5) * 1.2; b.n = 0; b.nMax = 3 + (Math.random() * 3 | 0); critSnd(b, 'skit');
  } else if (b.k === 'grouse') {
    if (b.st !== 'graze') return;
    critFlush(b, a, true);
    for (const o of S.day.beasts) if (o !== b && o.k === 'grouse' && !o.dead && o.st === 'graze' && o.fd === undefined && dist2(o, b) < 150) o.fd = 0.06 + Math.random() * 0.4;   // the rest of the flock go up with it
  } else if (b.k === 'turtle') {
    if (b.st === 'shell') { b.t = Math.max(b.t, 4); return; }
    b.st = 'shell'; b.t = 5 + Math.random() * 4; b.sp = 0; critSnd(b, 'hiss');
  }
}
function critFlush(b, a, first) {
  const p = S.p; if (a === undefined) a = Math.atan2(b.y - p.y, b.x - p.x);
  b.st = 'fly'; b.ft = 0; b.flyT = 2.2 + Math.random() * 1.4; b.dir = a + (Math.random() - 0.5) * 1.1; b.turn = (Math.random() - 0.5) * 0.6;
  b.zT = 34 + Math.random() * 24; b.sp = 60; b.fd = undefined;
  critSnd(b, 'flush'); if (first) critSnd(b, 'cackle');
  for (const o of S.day.beasts) if (!o.dead && !critOf(o) && !o.tame && !o.pen && !(o.lead > 0) && o.st === 'graze' && dist2(o, b) < 260 && !BEAST[o.k].angry && !BEAST[o.k].pack) beastScare(o);   // the deer hear it and go
}
function critStep(dt) {
  const D = S.day, p = S.p, pv = Math.hypot(p.vx, p.vy);
  const flock = new Map();   // where each flock of grouse is, so the stragglers keep up
  for (const b of D.beasts) if (b.k === 'grouse' && !b.dead && b.st === 'graze') { const f = flock.get(b.chunk) || { x: 0, y: 0, n: 0 }; f.x += b.x; f.y += b.y; f.n++; flock.set(b.chunk, f); }
  for (const b of D.beasts) {
    if (!critOf(b)) continue;
    const B = BEAST[b.k], dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (b.z === undefined) { b.z = 0; b.hx = b.x; b.hy = b.y; b.seed = Math.random(); }
    b.flash = Math.max(0, b.flash - dt * 4); b.wary = Math.max(0, (b.wary || 0) - dt);
    if (b.dead) { b.dieT += dt; if (b.z > 0) { b.vz = (b.vz || 0) - 320 * dt; b.z = Math.max(0, b.z + b.vz * dt); } continue; }
    b.t -= dt;
    const notice = B.scare * (D.crouch ? Math.max(sneakHide(b, dx, dy), CRIT.hide[b.k]) : pv > 60 ? 1 : 0.62) * (b.wary > 0 ? 1.5 : 1) * (dayLight() < 0.3 ? 0.75 : 1);
    if (b.k === 'lizard') {
      b.pu = Math.max(0, (b.pu || 0) - dt);
      if (b.st === 'graze') {
        b.sp = 0;
        if (b.t <= 0) { const r = Math.random(); if (r < 0.35) { b.st = 'scoot'; b.t = 0.2 + Math.random() * 0.25; b.dir += (Math.random() - 0.5) * 2.5; } else if (r < 0.6) { b.pu = 0.9; b.t = 1.5 + Math.random() * 2; } else { b.look = (Math.random() - 0.5) * 1.2; b.t = 1.2 + Math.random() * 2.5; } }
        if (d < notice) critScare(b);
      } else if (b.st === 'scoot') { b.sp = 75; if (b.t <= 0) { b.st = 'graze'; b.t = 1 + Math.random() * 2; } if (d < notice) critScare(b); }
      else if (b.st === 'dart') {
        b.sp = B.sp;
        if (b.t <= 0) { b.n++; if (b.n >= b.nMax || d > 320) { b.dead = true; b.hid = 1; b.dieT = 99; continue; } b.st = 'freeze'; b.t = 0.25 + Math.random() * 0.6; }   // into a crack in the rock, and gone
      } else if (b.st === 'freeze') { b.sp = 0; if (b.t <= 0) { b.st = 'dart'; b.t = 0.16 + Math.random() * 0.26; b.dir = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.6; critSnd(b, 'skit'); } }
      else { b.st = 'graze'; b.t = 1; }
    } else if (b.k === 'grouse') {
      if (b.st === 'graze') {
        if (b.t <= 0) { b.t = 0.8 + Math.random() * 2.2; const r = Math.random(); b.sp = r < 0.5 ? 0 : 12 + Math.random() * 12; b.dir += (Math.random() - 0.5) * 2; b.peck = r < 0.5 ? 1 : 0; }
        const f = flock.get(b.chunk); if (f && f.n > 1) { const fx = f.x / f.n, fy = f.y / f.n; if (Math.hypot(fx - b.x, fy - b.y) > 42) { b.dir = Math.atan2(fy - b.y, fx - b.x); b.sp = Math.max(b.sp, 20); b.peck = 0; } }
        if (b.fd !== undefined) { b.fd -= dt; if (b.fd <= 0) critFlush(b); }
        else if (d < notice) critScare(b);
        if (d < 280 && Math.random() < dt * 0.25) critSnd(b, 'cluck');
      } else if (b.st === 'fly') {
        b.ft += dt; b.dir += b.turn * dt;
        b.sp = lerp(b.sp, B.sp, Math.min(1, dt * 2.2)); b.z += (b.zT - b.z) * Math.min(1, dt * (b.ft < 0.5 ? 3.2 : 1.6));
        if (b.ft > b.flyT) { b.st = 'glide'; b.ft = 0; b.z0 = b.z; }
      } else if (b.st === 'glide') {
        b.ft += dt; b.dir += b.turn * dt * 0.5; b.sp = lerp(b.sp, 85, Math.min(1, dt * 1.2));
        b.z = b.z0 * Math.max(0, 1 - b.ft / 2.2);
        if (b.z <= 0.2) { b.z = 0; b.st = 'graze'; b.t = 1 + Math.random(); b.sp = 0; b.wary = 12; b.hx = b.x; b.hy = b.y; }
      } else { b.st = 'graze'; b.t = 1; b.z = 0; }
      if (d > 1700) { b.dead = true; b.hid = 1; b.dieT = 99; continue; }   // flown right away
    } else if (b.k === 'turtle') {
      b.inT = (b.st === 'shell' ? 1 : b.st === 'peek' ? 0.45 : 0);
      if (b.st === 'graze') {
        if (b.t <= 0) { b.t = 1.5 + Math.random() * 3; b.sp = Math.random() < 0.5 ? 0 : B.sp * (0.7 + Math.random() * 0.5); const hd = Math.hypot(b.hx - b.x, b.hy - b.y); b.dir = hd > 55 ? Math.atan2(b.hy - b.y, b.hx - b.x) + (Math.random() - 0.5) * 0.8 : b.dir + (Math.random() - 0.5) * 1.8; }
        if (d < notice) critScare(b);
      } else if (b.st === 'shell') { b.sp = 0; if (d < B.scare * 1.4) b.t = Math.max(b.t, 1.2); if (b.t <= 0) { b.st = 'peek'; b.t = 1.6; } }
      else if (b.st === 'peek') { b.sp = 0; if (d < notice * 1.2) { b.st = 'shell'; b.t = 4; critSnd(b, 'hiss'); } else if (b.t <= 0) { b.st = 'graze'; b.t = 1; } }
      else { b.st = 'graze'; b.t = 1; }
    }
    // moving: off the walls, the trees, the rocks and the water (a turtle may go to the water's edge); in the air, over it all
    if (b.sp > 0) {
      const nx = b.x + Math.cos(b.dir) * b.sp * dt, ny = b.y + Math.sin(b.dir) * b.sp * dt;
      if (b.z > 14) { b.x = nx; b.y = ny; }
      else {
        const blocked = (!NO_CAMP && Math.hypot(nx, ny) < CAMP_R + 40) || (BEACH && terrH(nx, ny) < SEA_Y + 0.6) || (b.k !== 'turtle' && pondAt(nx, ny, 0)) || (b.k === 'turtle' && pondAt(nx, ny, -6))
          || daySolidsNear(nx, ny, 8).some(o => dist2(o, { x: nx, y: ny }) < (o.r || 10) + 3)
          || propsNear(nx, ny, 16).some(o => (o.kind === 'tree' || o.kind === 'rock' || o.kind === 'rockIron' || o.kind === 'crag') && Math.hypot(o.x - nx, o.y - ny) < (o.r || 8) * (o.s || 1) * 0.5 + 2);
        if (!blocked) { b.x = nx; b.y = ny; }
        else if (b.k === 'lizard' && b.st === 'dart') b.dir += (Math.random() < 0.5 ? 1 : -1) * 1.3;
        else b.dir += Math.PI * (0.6 + Math.random() * 0.8);
      }
    }
    b.ph += dt * (2 + b.sp * 0.25);
  }
  D.beasts = D.beasts.filter(b => !critOf(b) || !(b.hid || (b.dead && b.dieT > 1.2 && !b.carc) || Math.hypot(b.x - p.x, b.y - p.y) > 2600));   // a body stays till it's cut up (88-meat)
}
// the woods' own animal step leaves them out; the rest of the game (your blows, arrows, the journal) treats them like any other
{ const bs = beastStep; beastStep = function (dt) {
    const D = S.day; if (!D) return bs(dt);
    const cr = D.beasts.filter(critOf); if (cr.length) D.beasts = D.beasts.filter(b => !critOf(b));
    bs(dt);
    if (cr.length) D.beasts.push(...cr);
    critStock(dt); critStep(dt);
  }; }
{ const sc = beastScare; beastScare = function (b) { if (critOf(b)) { if (b.k === 'grouse' && (b.st === 'fly' || b.st === 'glide')) return; return critScare(b); } return sc(b); }; }
// a bird up in the air is out of reach of a swing (an arrow or a thrown axe still finds it)
{ const dh = dayHarvest; dayHarvest = function (...a) {
    const D = S.day, up = D ? D.beasts.filter(b => !b.dead && b.z > 14) : [];
    for (const b of up) b.dead = true;
    try { return dh.apply(this, a); } finally { for (const b of up) b.dead = false; }
  }; }
{ const dj = dayJournal; dayJournal = function () {
    const out = dj(), D = S.day, bag = D.bag || {}, C = out.find(s => s.n === 'Creatures');
    const ks = ['lizard', 'grouse', 'turtle'].filter(k => bag[k]);
    if (C && ks.length) { if (!C.rows.length) C.blurb = ''; C.rows.push(...ks.map(k => [k[0].toUpperCase() + k.slice(1), `${bag[k]} taken · ${Object.entries(BEAST[k].drop).map(([i, n]) => `${n} ${DIT[i].n.toLowerCase()}`).join(', ')}`])); }
    return out;
  }; }

// ---------------- their sounds ----------------
function critSnd(b, k) {
  if (!actx || !noiseBuf) return;
  const d = Math.hypot(b.x - S.p.x, b.y - S.p.y); if (d > 750) return;
  const out = placeOut(b.x, b.y, 1, 750, b); if (!out) return;
  const t = actx.currentTime;
  if (k === 'skit') noiseAt(t, 6500, 2400, 0.08, 0.1, out);   // claws on grit
  else if (k === 'hiss') noiseAt(t, 3400, 900, 0.5, 0.16, out);
  else if (k === 'flush') {   // the whirr of a grouse going up: a run of quick wingbeats, slowing as it gets away
    const src = actx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800 + Math.random() * 500; bp.Q.value = 0.8;
    const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t);
    let tt = t + Math.random() * 0.03;
    for (let i = 0; i < 16; i++) { const w = 0.042 + i * 0.006, a = 0.55 * (1 - i / 18); g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(a, tt + w * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, tt + w); tt += w; }
    src.connect(bp); bp.connect(g); g.connect(out); src.start(t); src.stop(tt + 0.05);
  } else if (k === 'cackle' || k === 'cluck') {   // the alarm, kuk-kuk-kuk, or a soft cluck while they feed
    const n = k === 'cackle' ? 5 : 1, f0 = k === 'cackle' ? 760 : 520 + Math.random() * 80, vol = k === 'cackle' ? 0.12 : 0.05;
    for (let i = 0; i < n; i++) {
      const o = actx.createOscillator(), g = actx.createGain(), t0 = t + 0.12 + i * (0.085 + i * 0.012);
      o.type = 'triangle'; o.frequency.setValueAtTime(f0 * (1 - i * 0.05), t0); o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t0 + 0.06);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.075);
      o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.09);
    }
  }
}

// ---------------- their bodies ----------------
// Built the way the woods' animals are (20-figures): soft rounded parts in the animal's own frame (x across, y up, z forward),
// turned into the woods by one matrix, so a lizard can flip on its back dead or a grouse bank into a turn.
const critTint = (o, h) => { let c = hexK(h); const f = o.flash > 0 ? o.flash : 0; if (o.skin) c = mixc(c, CUT_RAW, o.skin * 0.85); return f ? c.map(v => lerp(v, 1.5, f)) : c; };
function critFrame(o, dt, turnK, pitch, roll, lift, sc = 1) {
  const want = o.dir ?? 0;
  if (o.dead) { const k = cutFallK(o.dieT); roll = (roll || 0) * k; lift = (lift || 0) * k; }   // it flips over as it dies (88-meat)
  o.fa = o.fa === undefined ? want : o.fa + clamp(angDiff(want, o.fa), -turnK * dt, turnK * dt);
  _B.compose(_aV.set(o.x, (o.z || 0) + (lift || 0), o.y), _aQ.setFromEuler(_e.set(pitch || 0, faceYaw(o.fa), roll || 0, 'YXZ')), _aS.set(sc, sc, sc));
}
function lizardPose(o, now, dt) {
  const em = (o.flash > 0 ? o.flash : 0) * 0.7, col = critTint(o, '#8c8e54'), back = critTint(o, '#5e6238'), belly = critTint(o, '#dcd4ae'), stripe = critTint(o, '#e0cc84'), dark = hexK('#15130f');
  AO_H = 3;
  const dead = !!o.dead, mv = !dead && o.sp > 5 ? 1 : 0;
  o.gph = (o.gph || 0) + dt * (o.sp || 0) * 0.32;
  const pk = !dead && o.pu > 0 ? Math.max(0, Math.sin((1 - o.pu / 0.9) * Math.PI * 3)) : 0;   // the push-up: the front of it bobbing up and down
  o.lk = lerp(o.lk || 0, mv ? 0 : (o.look || 0), Math.min(1, dt * 6));
  critFrame(o, dt, o.st === 'dart' ? 30 : 10, 0, dead ? Math.PI : 0, dead ? 3.9 : 0, 1.3);
  const sw = Math.sin(o.gph * 6.283), wv = mv ? 0.55 : 0.08 * Math.sin(now * 1.3 + o.seed * 9);
  const H = [sw * wv, 1.2, -2.2], Sh = [-sw * wv, 1.35 + pk * 0.9, 2.0];
  bOval(PT.aBall, H, Sh, 3.0, 1.55, col, em, 1.3);
  bOval(PT.aBall, addv(H, [0, 0.62, 0]), addv(Sh, [0, 0.62, 0]), 0.9, 0.5, stripe, em, 1.2);
  for (const s of [-1, 1]) bOval(PT.aBall, addv(H, [0.95 * s, 0.35, 0.3]), addv(Sh, [0.95 * s, 0.35, -0.3]), 0.5, 0.45, back, em, 1.05);
  bOval(PT.aBall, addv(H, [0, -0.4, 0]), addv(Sh, [0, -0.4, 0]), 2.5, 1.0, belly, em, 1.2);
  // the head on its short neck, turning to look about
  const N = [Sh[0] * 1.3, 1.45 + pk * 1.3, 2.9], la = o.lk, Hd = [N[0] + Math.sin(la) * 1.5, 1.6 + pk * 1.5, N[2] + Math.cos(la) * 1.5], Sn = [N[0] + Math.sin(la) * 2.7, 1.45 + pk * 1.5, N[2] + Math.cos(la) * 2.7];
  bOval(PT.aBall, N, Hd, 2.2, 1.4, col, em, 1.35); bBall(PT.aBall, Sn, 1.5, 1.0, 1.9, 0, la, col, em);
  for (const s of [-1, 1]) bBall(PT.aBall, [Hd[0] + Math.cos(la) * 0.75 * s, Hd[1] + 0.35, Hd[2] - Math.sin(la) * 0.75 * s], 0.5, 0.5, 0.5, 0, 0, dark, 0);
  // the tail, long and whipping side to side as it runs
  let q = [H[0], 1.1, -2.6];
  for (let i = 1; i <= 5; i++) {
    const n = [q[0] + Math.sin(o.gph * 6.283 - i * 0.9) * (dead ? 0 : wv) * 1.1 + (dead ? 0 : 0.12 * Math.sin(now * 0.8 + o.seed * 5 + i)), 0.95 - i * 0.12, q[2] - 1.95];
    bSeg(PT.aLimb, q, n, 0.9 - i * 0.14, col, em); q = n;
  }
  // four legs splayed out to the sides, the diagonal pairs going together
  for (const [fx, fz, po] of [[1, 1.7, 0], [-1, 1.7, Math.PI], [1, -1.9, Math.PI], [-1, -1.9, 0]]) {
    const base = fz > 0 ? Sh : H, ph = o.gph * 6.283 + po, swing = mv ? Math.sin(ph) * 1.3 : 0, lift = mv ? Math.max(0, Math.cos(ph)) * 0.8 : 0;
    const R0 = [base[0] + fx * 1.1, base[1] - 0.2, fz], K0 = [base[0] + fx * 2.0, 1.25 + lift * 0.4 + (fz > 0 ? pk * 0.5 : 0), fz + swing * 0.4 - (fz > 0 ? 0.3 : -0.3)], F0 = [fx * 2.5, 0.2 + lift, fz + swing + (fz > 0 ? 0.5 : -0.4)];
    bSeg(PT.aLimb, R0, K0, 0.5, col, em); bSeg(PT.aLimb, K0, F0, 0.4, col, em); bBall(PT.aBall, F0, 1.2, 0.35, 1.1, 0, 0, back, em);
  }
}
function grousePose(o, now, dt) {
  const em = (o.flash > 0 ? o.flash : 0) * 0.7, col = critTint(o, '#9a7650'), back = critTint(o, '#684c34'), belly = critTint(o, '#d6c29e'), bar = critTint(o, '#3e2e20');
  const red = hexK('#c8402c'), beak = hexK('#3a3026'), leg = hexK('#a08a66'), dark = hexK('#120f0c');
  AO_H = 8;
  const dead = !!o.dead, air = !dead && (o.st === 'fly' || o.st === 'glide') && o.z > 0.3, mv = !dead && !air && o.sp > 4;
  o.fph = (o.fph || 0) + dt * (o.st === 'fly' ? 24 : 0);
  o.bank = lerp(o.bank || 0, air ? -clamp((o.turn || 0) * 1.2, -0.4, 0.4) : 0, Math.min(1, dt * 4));
  critFrame(o, dt, air ? 4 : 8, air ? 0.08 : -0.06, dead ? 1.45 : o.bank, dead ? 2.7 : 0, 1.12);
  // pecking at the ground when it's stopped to feed
  const pk = !dead && !air && !mv && o.peck ? Math.pow(Math.max(0, Math.sin(now * 6.5 + o.seed * 20)), 6) : 0;
  bBall(PT.aBall, [0, 4.4, 0], 5.6, 5, 8.4, -0.08, 0, col, em);
  bBall(PT.aBall, [0, 3.7, 1.5], 4.8, 4, 5.6, 0, 0, belly, em);
  bBall(PT.aBall, [0, 5.7, -0.8], 4.4, 2.2, 6, 0.1, 0, back, em);
  for (let i = 0; i < 3; i++) bBall(PT.aBall, [0, 5.95, 1.2 - i * 1.9], 3.6 - i * 0.4, 0.5, 0.7, 0, 0, bar, em);   // the dark bars across its back
  const tw = air ? 5.4 : 3.6, tu = air ? 0.2 : 0.5 + 0.25 * Math.sin(now * 2 + o.seed * 3);
  bOval(PT.aBall, [0, 5.0, -3.4], [0, 5.0 + tu, -7.0], tw, 0.75, back, em);
  bBall(PT.aBall, [0, 5.0 + tu, -6.9], tw * 0.9, 0.5, 0.9, 0, 0, bar, em);
  // its neck and head: bobbing as it walks, dipped to the ground to peck, stretched out in flight
  const bob = mv ? Math.sin(o.ph * 3) * 0.4 : 0, Hc = air ? [0, 6.2, 5.2] : dead ? [0, 4.2, 5.4] : [0, 7.6 - pk * 4.6 + bob, 3.4 + pk * 2.4];
  bOval(PT.aBall, [0, 5.6, 2.4], Hc, 2.4, 2.4, col, em, 1.1); bBall(PT.aBall, Hc, 2.6, 2.6, 2.9, 0, 0, col, em);
  bSeg(PT.aCone, addv(Hc, [0, -0.2, 1.1]), addv(Hc, [0, -0.7, 2.4]), 0.55, beak, 0);
  for (const s of [-1, 1]) { bBall(PT.aBall, addv(Hc, [0.85 * s, 0.6, 0.35]), 0.6, 0.5, 1.2, 0, 0, red, 0); bBall(PT.aBall, addv(Hc, [1.05 * s, 0.2, 0.7]), 0.55, 0.55, 0.55, 0, 0, dark, 0); }
  if (air) {   // the wings: beating hard going up, held out stiff in the glide
    const f = o.st === 'fly' ? Math.sin(o.fph) * 0.95 : 0.18 + 0.05 * Math.sin(now * 3);
    for (const s of [-1, 1]) {
      const W0 = [2.1 * s, 5.4, 0.5], W1 = [W0[0] + 4.6 * Math.cos(f) * s, W0[1] + 4.6 * Math.sin(f), 0], W2 = [W1[0] + 3.9 * Math.cos(f * 1.3) * s, W1[1] + 3.9 * Math.sin(f * 1.3), -1.3];
      bOval(PT.aBall, W0, W1, 4.4, 0.7, col, em, 1.1); bOval(PT.aBall, W1, W2, 3.4, 0.55, back, em, 1.1);
    }
  } else {
    for (const s of [-1, 1]) bBall(PT.aBall, [2.5 * s, 4.7, -0.4], 1.2, 3.6, 6.6, 0.1, 0.08 * s, back, em);
    // the legs: short, feathered, stepping
    for (const s of [-1, 1]) {
      const st = mv ? Math.sin(o.ph * 1.5 + (s > 0 ? 0 : Math.PI)) * 1.2 : 0, lf = mv ? Math.max(0, Math.cos(o.ph * 1.5 + (s > 0 ? 0 : Math.PI))) * 0.7 : 0;
      const hip = [1.1 * s, 2.6, 0.3], ft = dead ? [1.6 * s, 0.4, 2] : [1.1 * s, lf, 0.6 + st];
      bSeg(PT.aLimb, hip, ft, 0.32, leg, em); bBall(PT.aBall, addv(ft, [0, 0.15, 0.6]), 0.7, 0.3, 1.7, 0, 0, leg, em);
    }
  }
}
function turtlePose(o, now, dt) {
  const em = (o.flash > 0 ? o.flash : 0) * 0.7, shell = critTint(o, '#66643e'), scute = critTint(o, '#837a48'), rim = critTint(o, '#4a482e'), plast = critTint(o, '#c4b684'), skin = critTint(o, '#8a865a'), dark = hexK('#120f0c'), yel = critTint(o, '#c8b860');
  AO_H = 5;
  const dead = !!o.dead, mv = !dead && o.sp > 2;
  o.inK = lerp(o.inK || 0, dead ? 0 : (o.inT || 0), Math.min(1, dt * ((o.inT || 0) > (o.inK || 0) ? 9 : 1.6)));   // snapping in fast, coming out slow
  const ext = 1 - o.inK, sc = 0.35 + 0.65 * ext;
  o.gph = (o.gph || 0) + dt * (o.sp || 0) * 0.09;
  critFrame(o, dt, 1.6, 0, dead ? Math.PI : Math.sin(o.gph * 6.283) * 0.03 * (mv ? 1 : 0), dead ? 6.8 : 0, 1.1);
  bBall(PT.aBall, [0, 1.4, 0], 9, 1.8, 11, 0, 0, plast, em);
  bBall(PT.aBall, [0, 1.9, 0], 10.6, 1.6, 12.8, 0, 0, rim, em);
  bBall(PT.aBall, [0, 2.5, 0], 9.8, 5.6, 12.2, 0, 0, shell, em);
  for (const z of [-3.2, 0, 3.2]) bBall(PT.aBall, [0, 5.0 - Math.abs(z) * 0.12, z], 3.4, 0.9, 3.0, -z * 0.06, 0, scute, em);
  for (const s of [-1, 1]) for (const z of [-1.8, 1.8]) bBall(PT.aBall, [2.9 * s, 4.15, z], 2.6, 0.8, 2.8, -z * 0.08, 0, scute, em);
  // the head on its long neck: out and looking about, or pulled right in
  const look = mv ? 0 : 0.5 * Math.sin(now * 0.4 + o.seed * 7) * ext, bob = mv ? Math.sin(o.gph * 12.566) * 0.25 : 0;
  const Hd = [Math.sin(look) * 1.4 * ext, 2.3 + 0.6 * ext + bob, 4.9 + 3.6 * ext];
  bOval(PT.aBall, [0, 2.1, 4.4], Hd, 1.9 * sc, 1.7 * sc, skin, em, 1.1);
  bBall(PT.aBall, Hd, 2.4 * sc, 2.0 * sc, 3.0 * sc, 0, look, skin, em);
  if (ext > 0.3) { bBall(PT.aBall, addv(Hd, [0, 0.55 * sc, -0.4]), 1.4 * sc, 0.4, 2.2 * sc, 0, look, yel, em); for (const s of [-1, 1]) bBall(PT.aBall, addv(Hd, [1.05 * s * sc, 0.35 * sc, 0.5 * sc]), 0.5, 0.5, 0.5, 0, 0, dark, 0); }
  // four stumpy legs, the diagonal pairs stepping together; and the tail
  for (const [fx, fz, po] of [[1, 3.6, 0], [-1, 3.6, Math.PI], [1, -3.6, Math.PI], [-1, -3.6, 0]]) {
    const ph = o.gph * 6.283 + po, swing = mv ? Math.sin(ph) * 1.4 : 0, lift = mv ? Math.max(0, Math.cos(ph)) * 0.6 : 0;
    const R0 = [fx * 3.4, 1.9, fz], F0 = dead ? [fx * 5.2, 1.6, fz * 1.15] : [fx * (3.4 + 1.9 * ext), 0.2 + lift + o.inK * 1.3, fz + swing * ext + (fz > 0 ? 0.6 : -0.6) * ext];
    bSeg(PT.aLimb, R0, F0, 1.0 * sc + 0.15, skin, em);
  }
  if (ext > 0.2) bSeg(PT.aCone, [0, 1.9, -5.9], [0, 1.3, -7.6 * (0.6 + 0.4 * ext)], 0.65, skin, em);
}
function critPose(o, now, dt) { if (o.k === 'lizard') lizardPose(o, now, dt); else if (o.k === 'grouse') grousePose(o, now, dt); else if (o.k === 'turtle') turtlePose(o, now, dt); }
{ const df = drawFigures; drawFigures = function (now, dt) {
    df(now, dt);
    const D = S.day, p = S.p; if (!D) return;
    for (const o of D.beasts) if (critOf(o) && Math.abs(o.x - p.x) < drawR() && Math.abs(o.y - p.y) < drawR()) critPose(o, now, dt);
  }; }
