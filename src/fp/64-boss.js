// ---------------- the Woodcutter ----------------
// The hunting camp's keeper, brought over from the main game's woods. He is a fight you learn, not a raider you outrun:
// every move has a tell you can read. His overhead chop buries the axe in the ground and leaves him open; from range he
// throws a hatchet that curves out and comes back to his hand; and when you stand near the trees he fells one onto you.
// Below half his health he gets angry: quicker tells, and a second chop straight after the first. The relic is his to keep
// until he falls, and he drops his iron war axe when he does.
const BOSS_CAMP = 0, BOSS_HP = 18, BOSS_LEASH = 640;
FOES.woodcutter = { hp: BOSS_HP, sp: 62, lightSp: 1, h: 46, w: 18 };
FOE_AI.woodcutter = bossStep; NO_TOUCH.woodcutter = 1;
KIT_WEAR.woodcutter = { vest: 1 }; KIT_HEAD.woodcutter = 'beanie';
FP_NAME.woodcutter = 'WOODCUTTER'; MON_PITCH.woodcutter = 0.7; EYES.woodcutter = '255,120,90';
const BM = {   // tell, act and recovery for each move (the main game's numbers, a touch quicker for first person)
  chop:  { tell: 0.95, rec: 1.5, reach: 60, arc: 1.0, lunge: 24 },
  throw: { tell: 0.7, rec: 0.7, sp: 430, max: 400 },
  fell:  { tell: 1.75, fall: 0.75, rec: 1.0, near: 150 },
};
const bossK = e => e.rage ? 0.78 : 1;   // angry: every tell is shorter

function bossSpawn(C) {
  spawnFoe('woodcutter', { x: C.x, y: C.y + 20, d: 400 });
  const e = S.rg.enemies[S.rg.enemies.length - 1];
  Object.assign(e, { ci: C.i, boss: 1, cap: 1, hp: BOSS_HP, maxHp: BOSS_HP, bHp: BOSS_HP, bs: 'walk', bt: 0, bcd: 1.2, thCd: 2.5, flCd: 4, hx: C.x, hy: C.y });
  S.rg.ringMsg = { text: 'the woodcutter', sub: ARENA ? 'Watch the ground for where his axe will land' : 'He keeps the hunting camp · the relic is his', t: 0 }; playRingSting(); addShake(0.45);
  BOSS.e = e; BOSS.show = 0; BOSS.trail = 1;
  if (actx) { const t = actx.currentTime; boomAt(t, 70, 38, 0.9, 0.5, sfxGain); noiseAt(t + 0.05, 600, 200, 0.6, 0.3, sfxGain); }
}
const BOSS = { e: null, show: 0, trail: 1, roar: 0 };
function bossSnd(e, kind) {
  if (!actx) return; const t = actx.currentTime, v = monNear(e, 700); if (v <= 0.02) return;
  if (kind === 'wind') { noiseAt(t, 500, 1400, 0.45, 0.22 * v, sfxGain); toneAt(t, 110, 0.5, 0.08 * v, 'sawtooth', sfxGain); }
  else if (kind === 'chop') { boomAt(t, 140, 50, 0.35, 0.6 * v, sfxGain); noiseAt(t, 2200, 500, 0.18, 0.5 * v, sfxGain); }
  else if (kind === 'thud') { boomAt(t, 220, 120, 0.12, 0.4 * v, sfxGain); noiseAt(t, 1500, 500, 0.08, 0.3 * v, sfxGain); }
  else if (kind === 'throw') noiseAt(t, 3000, 900, 0.25, 0.3 * v, sfxGain);
  else if (kind === 'whirr') noiseAt(t, 2600, 1800, 0.12, 0.08 * v, sfxGain);
  else if (kind === 'crack') { noiseAt(t, 900, 250, 0.5, 0.55 * v, sfxGain); toneAt(t, 80, 0.6, 0.12 * v, 'sawtooth', sfxGain); }
  else if (kind === 'roar') { toneAt(t, 92, 1.1, 0.22 * v, 'sawtooth', sfxGain); toneAt(t + 0.05, 61, 1.2, 0.18 * v, 'square', sfxGain); noiseAt(t, 700, 200, 1, 0.35 * v, sfxGain); }
}
function bossGo(e, bs, extra) { e.bs = bs; e.bt = 0; e.sw = null; e.faceA = null; if (extra) Object.assign(e, extra); }
function bossWalk(e, tx, ty, sp, dt, stop = 0) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1; if (d <= stop) return d;
  const st = Math.min(d - stop, sp * dt); e.x += dx / d * st; e.y += dy / d * st; return d;
}
function bossTree(e) {   // a standing tree near him that would come down across you
  const p = S.p; let best = null, bd = 1e9;
  for (const t of propsNear(e.x, e.y, BM.fell.near)) {
    if (t.kind !== 'tree') continue;
    const de = dist2(t, e), dp = dist2(t, p), L = treeLen(t);
    if (de < BM.fell.near && dp > 30 && dp < L * 0.85 && de < bd) { bd = de; best = t; }
  }
  return best;
}
function bossStep(e, sp0, d, dt) {
  const p = S.p, rg = S.rg, C = ARENA ? { x: e.hx, y: e.hy } : dayCampAt(e.ci), k = bossK(e), sp = FOES.woodcutter.sp * (e.rage ? 1.15 : 1);
  // what got through since last time: the axe stuck in the ground leaves him open, and every blow counts for more
  const took = (e.bHp ?? e.hp) - e.hp;
  if (took > 0 && e.stuck) { e.hp -= took * 0.6; if (!e.openPop) { e.openPop = 1; wpPop('OPEN', e.x, e.y, 60, '255,220,120', 1); } }
  e.bHp = e.hp;
  if (!e.rage && e.hp < e.maxHp * 0.5 && e.hp > 0) {   // the second half: he gets angry
    e.rage = 1; BOSS.roar = 1; bossSnd(e, 'roar'); addShake(0.5); hitStop(0.08);
    wpPop('ENRAGED', e.x, e.y, 62, '255,90,60', 1.2); exNote('the woodcutter is angry now', true);
  }
  if (e.hatch) bossHatch(e, dt);
  if (e.frozen > 0) return;                          // parried: staggered for a beat
  e.bt += dt; e.bcd -= dt; e.thCd -= dt; e.flCd -= dt;
  const far = Math.hypot(p.x - C.x, p.y - C.y) > BOSS_LEASH;
  if (e.bs === 'walk') {
    e.faceA = null;
    if (far || rg.phase !== 'fight') {                // you ran: he goes back to his camp and gets his breath back
      bossWalk(e, e.hx, e.hy, sp, dt, 20); e.hp = Math.min(e.maxHp, e.hp + dt * 1.2); e.bHp = e.hp; e.rage = e.hp < e.maxHp * 0.5 ? e.rage : 0; return;
    }
    if (e.bcd <= 0 && d < BM.chop.reach + 14 && !e.hatch) return bossGo(e, 'chop', { sw: { ph: 'wind', t: 0, T: BM.chop.tell * k, a: Math.atan2(p.y - e.y, p.x - e.x) } }), bossSnd(e, 'wind');
    if (e.bcd <= 0 && e.flCd <= 0 && d < 340) { const t = bossTree(e); if (t) return bossGo(e, 'tofell', { tree: t }); }
    if (e.bcd <= 0 && e.thCd <= 0 && !e.hatch && d > 130 && d < BM.throw.max) return bossGo(e, 'throw');
    bossWalk(e, p.x, p.y, sp * (e.hatch ? 0.7 : 1), dt, BM.chop.reach * 0.7);
    return;
  }
  if (e.bs === 'chop') {
    const s = e.sw; s.t += dt; e.faceA = s.a;
    if (s.ph === 'wind') {
      if (s.t < s.T * 0.7) s.a = Math.atan2(p.y - e.y, p.x - e.x);   // tracks you, then locks
      if (s.t < s.T * 0.7 && d > BM.chop.reach * 0.6) bossWalk(e, p.x, p.y, sp * 0.45, dt, BM.chop.reach * 0.6);
      if (s.t >= s.T) { s.ph = 'strike'; s.t = 0; s.T = 0.16; s.hit = false; }
    } else if (s.ph === 'strike') {
      const st = Math.min(dt, Math.max(0, s.T - (s.t - dt))) / s.T * BM.chop.lunge; e.x += Math.cos(s.a) * st; e.y += Math.sin(s.a) * st;
      const dx = p.x - e.x, dy = p.y - e.y, dd = Math.hypot(dx, dy);
      if (!s.hit && dd < BM.chop.reach && (dd < 14 || Math.abs(angDiff(Math.atan2(dy, dx), s.a)) < BM.chop.arc) && rg.inv <= 0 && rg.phase === 'fight') { s.hit = true; hurt(e); }
      if (s.t >= s.T) {                                // the axe bites the ground
        const ix = e.x + Math.cos(s.a) * 30, iy = e.y + Math.sin(s.a) * 30;
        rg.blasts.push({ x: ix, y: iy, t: 0, life: 0.35, r: 40, col: 'white' }); ashBurst(ix, iy, 10, 14); dayChips(ix, iy, 2, 'stone', 10, undefined, 1.3);
        (rg.wcracks = rg.wcracks || []).push({ x: ix - Math.cos(s.a) * 8, y: iy - Math.sin(s.a) * 8, a: s.a, len: 30, t: 0, life: 1.4, seed: Math.random() * 99 });
        addShake(0.3 * monNear(e, 500) + 0.05); bossSnd(e, 'chop'); padRumble(0.4, 90);
        const again = e.rage && !s.second;             // angry: a second blow straight after the first
        s.ph = 'rec'; s.t = 0; s.T = again ? 0.35 : BM.chop.rec * (e.rage ? 0.85 : 1); s.stuck = !again; e.stuck = s.stuck; e.openPop = 0;
        if (s.stuck) wpPop('AXE STUCK', ix, iy, 30, '255,220,120', 0.8);
      }
    } else if (s.t >= s.T) {
      e.stuck = 0;
      if (rg.phase === 'fight' && !s.stuck && !s.second) { e.sw = { ph: 'wind', t: 0, T: 0.55, a: Math.atan2(p.y - e.y, p.x - e.x), second: 1 }; bossSnd(e, 'wind'); }
      else bossGo(e, 'walk', { bcd: 0.5 + Math.random() * 0.5 });
    }
    return;
  }
  if (e.bs === 'throw') {                              // the hatchet goes back over his shoulder, then out
    e.faceA = Math.atan2(p.y - e.y, p.x - e.x); e.bpose = Math.min(1, e.bt / (BM.throw.tell * k));
    if (e.bt >= BM.throw.tell * k && !e.hatch) {
      const a = e.faceA, side = Math.random() < 0.5 ? -1 : 1, max = Math.min(BM.throw.max, d + 70);
      e.hatch = { x: e.x + Math.cos(a) * 10, y: e.y + Math.sin(a) * 10, a, side, sp: BM.throw.sp * (e.rage ? 1.12 : 1), max, run: 0, back: 0, t: 0, hit: 0, whirr: 0 };
      bossSnd(e, 'throw'); e.bpose = 2;
    }
    if (e.bt >= BM.throw.tell * k + BM.throw.rec) { e.bpose = 0; bossGo(e, 'walk', { thCd: 4 + Math.random() * 2, bcd: 0.4 }); }
    return;
  }
  if (e.bs === 'tofell') {                             // he gets round behind the tree
    const t = e.tree, a = Math.atan2(t.y - p.y, t.x - p.x), tx = t.x + Math.cos(a) * 26, ty = t.y + Math.sin(a) * 26;
    if (S.day.felled.has(t.key) || e.bt > 3 || dist2(t, p) > treeLen(t) * 0.95) return bossGo(e, 'walk', { flCd: 2 });
    if (bossWalk(e, tx, ty, sp * 1.8, dt, 2) < 9) bossGo(e, 'fell', { tree: t, fa: Math.atan2(p.y - t.y, p.x - t.x), cuts: 0 });
    return;
  }
  if (e.bs === 'fell') {
    const t = e.tree, tell = BM.fell.tell * k;
    e.faceA = Math.atan2(t.y - e.y, t.x - e.x);
    if (e.bt < tell * 0.7) e.fa = Math.atan2(p.y - t.y, p.x - t.x);   // it will come down where you are, until the last few blows
    // three blows into the trunk, each one shaking the crown
    const cut = Math.floor(e.bt / (tell / 3));
    if (e.bt < tell) {
      const u = (e.bt % (tell / 3)) / (tell / 3);
      e.sw = { ph: u < 0.7 ? 'wind' : 'strike', t: u < 0.7 ? u * 0.4 : (u - 0.7) * 0.5, T: u < 0.7 ? 0.4 : 0.16, a: e.faceA };
      if (cut > e.cuts) { e.cuts = cut; t.shakeT = S.t; dayChips(t.x, t.y, 10, 'wood', 10, e.faceA + Math.PI, 1.3); bossSnd(e, 'chop'); }
    } else if (!e.log) {                               // it goes
      e.cuts = 3; t.shakeT = S.t; e.sw = { ph: 'rec', t: 0, T: 1, a: e.faceA };
      const D = S.day; D.felled.add(t.key); D.cut.delete(t.key);
      e.log = { kind: 'poof', type: t.type, seed: t.seed, s: t.s, r: 0, x: t.x, y: t.y, t: 0, T: BM.fell.fall, fa: e.fa, shakeT: S.t, give: {} };
      D.logs.push(e.log); bossSnd(e, 'crack'); addShake(0.2);
      const leaf = t.type === 'pine' ? 'needle' : t.type === 'cherry' ? 'petal' : t.type === 'dead' ? 'twig' : 'crown', sc = t.s || 1;
      dayLeaves(t.x, t.y, 30 * sc, 90 * sc, 18 * sc, leaf, 40);
    } else if (e.log.t >= BM.fell.fall && !e.landed) {   // it lands: anything under it is hit hard
      e.landed = 1; const L = treeLen(t), ca = Math.cos(e.fa), sa = Math.sin(e.fa);
      const along = clamp((p.x - t.x) * ca + (p.y - t.y) * sa, 0, L), qx = t.x + ca * along, qy = t.y + sa * along;
      if (Math.hypot(p.x - qx, p.y - qy) < 20 && rg.inv <= 0 && rg.phase === 'fight') hurt({ type: 'woodcutter', kind: 'shade', x: qx, y: qy, ref: e });
      for (let i = 1; i <= 5; i++) { const x = t.x + ca * L * i / 5, y = t.y + sa * L * i / 5; ashBurst(x, y, 6, 8); dayChips(x, y, 4, 'wood', 6, undefined, 1.4); }
      const leaf = t.type === 'pine' ? 'needle' : t.type === 'cherry' ? 'petal' : 'crown';
      dayLeaves(t.x + ca * L * 0.8, t.y + sa * L * 0.8, 2, 30, 26, leaf, 60);
      dayDrop(t.x + ca * L * 0.3, t.y + sa * L * 0.3, 'logs', 1); dayDrop(t.x + ca * L * 0.6, t.y + sa * L * 0.6, 'logs', 1);
      addShake(0.6 * monNear({ x: t.x + ca * L / 2, y: t.y + sa * L / 2 }, 600) + 0.1); hitStop(0.06); padRumble(0.7, 200);
      if (actx) { const t0 = actx.currentTime; boomAt(t0, 80, 32, 0.7, 0.75, sfxGain); noiseAt(t0, 4500, 1500, 0.9, 0.2, sfxGain); }
    }
    if (e.landed && e.bt >= tell + BM.fell.fall + BM.fell.rec) bossGo(e, 'walk', { tree: null, log: null, landed: 0, flCd: 7 + Math.random() * 3, bcd: 0.3 });
    return;
  }
}
function bossHatch(e, dt) {                            // out on a curve, then back to his hand
  const h = e.hatch, p = S.p, rg = S.rg; h.t += dt;
  if (!h.back) {
    const st = h.sp * dt; h.run += st;
    const a = h.a + h.side * 0.9 * (h.run / h.max - 0.4); h.x += Math.cos(a) * st; h.y += Math.sin(a) * st;
    if (h.run >= h.max) h.back = 1;
  } else {
    const dx = e.x - h.x, dy = e.y - h.y, dd = Math.hypot(dx, dy) || 1, st = h.sp * 1.05 * dt;
    if (dd < 18 || h.t > 4) { e.hatch = null; bossSnd(e, 'thud'); return; }
    h.x += dx / dd * Math.min(dd, st) + (-dy / dd) * h.side * st * 0.35 * Math.min(1, dd / 200); h.y += dy / dd * Math.min(dd, st) + (dx / dd) * h.side * st * 0.35 * Math.min(1, dd / 200);
  }
  if ((h.whirr -= dt) <= 0) { h.whirr = 0.11; bossSnd(h, 'whirr'); }
  if (!h.hit && Math.hypot(p.x - h.x, p.y - h.y) < 17 && rg.inv <= 0 && rg.phase === 'fight') { h.hit = 1; hurt({ type: 'half', kind: 'shade', x: h.x, y: h.y, ref: e }); }
}
function bossDown(e) {                                 // he falls: the camp is yours
  const st = dayCampState(e.ci), rg = S.rg; st.beat = 1; e.hatch = null;
  rg.ringMsg = { text: 'the woodcutter falls', sub: 'The hunting camp is yours · take the relic', t: 0 }; playRingSting();
  addShake(0.9); hitStop(0.22); padRumble(1, 400); ashBurst(e.x, e.y, 60, 50);
  rg.blasts.push({ x: e.x, y: e.y, t: 0, life: 0.6, r: 110, col: 'white' });
  dayDrop(e.x, e.y, 'waxe4', 1, DIT.waxe4.dur); gainWisps(40);
  dayJLog('felled the woodcutter'); if (!ARENA) lifeAdd('bosses'); dayChanged();
  if (ARENA) setTimeout(() => arenaOver(true), 3500);
  if (actx) { const t = actx.currentTime; boomAt(t, 60, 28, 1.4, 0.8, sfxGain); toneAt(t + 0.1, 196, 1.6, 0.12, 'triangle', sfxGain); toneAt(t + 0.25, 294, 1.6, 0.1, 'triangle', sfxGain); }
}

// ---- drawn: his hatchet in the air, the tells on the ground, his health bar ----
function bossFigs(now) {
  for (const e of S.rg.enemies) {
    const h = e.hatch; if (!h || e.dead) continue;
    const spin = now * 22, z = 22 + 4 * Math.sin(h.t * 5);
    _base.compose(_p.set(h.x, z, h.y), _q.setFromEuler(_e.set(0, faceYaw(h.a), 0, 'YXZ')), _s.set(1, 1, 1));
    child(_torso, _base, 0, 0, 0, spin, 0, 0);
    child(_m, _torso, 0, -4, 0, 0, 0, 0); scaled(_m, 1.4, 16, 1.4); PT.rod.push(_m, hexK('#6e5235'), 0);
    child(_m, _torso, 0, 4, 2.4, 0, 0, 0); scaled(_m, 1.2, 5, 5.4); PT.box.push(_m, hexK('#b8bcc0'), 0.15);
  }
}
function wcLive() { const e = BOSS.e; return e && !e.dead && S.rg.enemies.includes(e) ? e : null; }
function bossBusy() { return !!wcLive() || BOSS.show > 0; }
function bossGround(g, pts, fill, stroke, lw) {
  const q = pts.map(([x, y]) => scr(x, 0.8, y)); if (q.some(v => !v)) return;
  g.beginPath(); q.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); }
}
const _hb = { el: null };
function bossBarY() {   // just above the hotbar, wherever the layout has put it
  const el = _hb.el || (_hb.el = document.getElementById('hotbar')), r = el && !el.hidden ? el.getBoundingClientRect() : null;
  return r && r.height ? Math.min(FH - 40, r.top - 18) : FH - 60;
}
function bossDraw(g, rdt) {
  const e = wcLive(), now = S.t;
  BOSS.show = Math.max(0, Math.min(1, BOSS.show + (e && dist2(e, S.p) < 560 ? rdt * 3 : -rdt * 2)));
  if (e) {
    g.globalCompositeOperation = 'source-over';
    const s = e.sw;
    if (e.bs === 'chop' && s && s.ph === 'wind') {     // where the axe will land: a wedge that fills as he winds up
      const u = Math.min(1, s.t / s.T), R = BM.chop.reach, pts = [[e.x, e.y]], pts2 = [[e.x, e.y]];
      for (let i = 0; i <= 12; i++) { const a = s.a - BM.chop.arc + 2 * BM.chop.arc * i / 12; pts.push([e.x + Math.cos(a) * R, e.y + Math.sin(a) * R]); pts2.push([e.x + Math.cos(a) * R * u, e.y + Math.sin(a) * R * u]); }
      const pulse = 0.5 + 0.5 * Math.sin(now * 30);
      bossGround(g, pts, `rgba(255,50,30,${0.16 + 0.1 * u})`, `rgba(255,90,60,${0.6 + 0.4 * u * pulse})`, 3);
      bossGround(g, pts2, `rgba(255,60,30,${0.3 + 0.25 * u})`);
    }
    if (e.bs === 'fell' && e.tree && !e.landed) {      // the tree's line across the ground
      const t = e.tree, L = treeLen(t), ca = Math.cos(e.fa), sa = Math.sin(e.fa), nx = -sa * 13, ny = ca * 13;
      const u = Math.min(1, e.bt / (BM.fell.tell * bossK(e))), pulse = 0.5 + 0.5 * Math.sin(now * (14 + 20 * u));
      const seg = 10;
      for (let i = 0; i < seg; i++) {
        const f0 = i / seg, f1 = (i + 1) / seg, x0 = t.x + ca * L * f0, y0 = t.y + sa * L * f0, x1 = t.x + ca * L * f1, y1 = t.y + sa * L * f1;
        const lit = f1 <= u ? 1 : 0.35;
        bossGround(g, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], `rgba(255,60,40,${(0.12 + 0.22 * lit) * (0.7 + 0.3 * pulse)})`);
      }
      bossGround(g, [[t.x + nx, t.y + ny], [t.x + ca * L + nx, t.y + sa * L + ny], [t.x + ca * L - nx, t.y + sa * L - ny], [t.x - nx, t.y - ny]], null, `rgba(255,90,60,${0.4 + 0.5 * pulse * u})`, 2);
    }
    if (e.bs === 'throw' && !e.hatch) {                // a flash on his raised hand
      const q = scr(e.x, 60, e.y); if (q) { const u = Math.min(1, e.bt / (BM.throw.tell * bossK(e))); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,200,140,${0.5 * u})`; g.beginPath(); g.arc(q[0], q[1], (6 + 10 * u) * Math.min(3, q[2]), 0, 7); g.fill(); g.globalCompositeOperation = 'source-over'; }
    }
    BOSS.trail = Math.max(e.hp / e.maxHp, BOSS.trail - rdt * 0.35);
  }
  if (BOSS.show <= 0) return;
  // his name and health along the bottom, over the hotbar, a notch at half where he turns angry
  const a = BOSS.show, w = Math.min(FW * 0.62, 460), x0 = (FW - w) / 2, y = bossBarY(), hp = e ? Math.max(0, e.hp / e.maxHp) : 0;
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = a;
  g.fillStyle = 'rgba(10,8,6,0.72)'; g.fillRect(x0 - 3, y - 3, w + 6, 14);
  g.fillStyle = 'rgba(255,230,190,0.75)'; g.fillRect(x0, y, w * BOSS.trail, 8);
  const rage = e && e.rage, r = rage ? 0.5 + 0.5 * Math.sin(now * 10) : 0;
  g.fillStyle = `rgb(${200 + 55 * r},${50 + 20 * r},${36})`; g.fillRect(x0, y, w * hp, 8);
  g.fillStyle = 'rgba(10,8,6,0.9)'; g.fillRect(x0 + w / 2 - 1, y - 3, 2, 14);
  g.globalAlpha = 1;
  fxText('THE WOODCUTTER', FW / 2, y - 14, Math.min(20, FW * 0.045), rage ? '255,120,90' : '239,232,220', a, { w: 800 });
}
