// ================= raiders noticing you by day: the warning climbs, stage by stage =================
// The main game's Daylight puts a '?' over a raider that fills as it notices you, slams a '!' when it has you, and throws
// SPOTTED across the screen with the woods coming for you. Here the same thing from behind your own eyes, and climbing:
// a raider glancing your way shows a pale '?' (on the ring round your aim if it's out of sight, since it's often behind you),
// the bar at the top fills from white to yellow to red with a rising tick and your heart starting to go, then SPOTTED slams in,
// the screen flashes red, a sour sting and a drum hit, and the edges of the view throb red while they hunt you. Break their
// line of sight and they fall back to searching (amber, '...'); lose them for good and LOST THEM comes up with a falling pair.
const ALERT = { top: 0, st: 'calm', prev: 'calm', tick: 0, beat: 0, spot: null, lost: null, calm: [], seen: new WeakMap(), busy: false };
const susRgb = k => k < 0.45 ? [255, 255 - 30 * k / 0.45, 235 - 175 * k / 0.45].map(Math.round).join(',') : [255, Math.round(225 - 165 * (k - 0.45) / 0.55), Math.round(60 - 20 * (k - 0.45) / 0.55)].join(',');   // white, to yellow, to red
const spotPopFp = t => t < 0.1 ? 0.2 + 1.3 * (t / 0.1) : t < 0.26 ? 1.5 - 0.5 * ((t - 0.1) / 0.16) : 1 + 0.05 * Math.sin(t * 22) * Math.max(0, 1 - (t - 0.26) * 1.5);   // slam in, overshoot, settle
const roamers = () => S.rg.enemies.filter(e => e.roam && !e.dead);
function alertSound(kind, k = 0) {
  if (!actx || !sfxGain) return;
  const t = actx.currentTime, o = sfxGain;
  if (kind === 'tick') toneAt(t, 520 + 900 * k, 0.05, 0.04 + 0.05 * k, 'square', o);   // a rising tick as the bar fills
  else if (kind === 'beat') { boomAt(t, 70, 40, 0.16, 0.18 + 0.3 * k, o); boomAt(t + 0.17, 62, 36, 0.2, 0.12 + 0.22 * k, o); }   // your heart
  else if (kind === 'spot') {   // the sting, a drum hit under it, a burst of breath, and a sour low stab hanging after
    toneAt(t, 988, 0.14, 0.16, 'square', o); toneAt(t + 0.07, 1480, 0.24, 0.16, 'square', o);
    boomAt(t, 85, 38, 1.1, 0.7, o); noiseAt(t, 3200, 900, 0.3, 0.3, o);
    toneAt(t + 0.3, 196, 1.3, 0.08, 'sawtooth', o); toneAt(t + 0.3, 207.6, 1.3, 0.07, 'sawtooth', o);
  } else if (kind === 'search') { toneAt(t, 660, 0.12, 0.06, 'triangle', o); toneAt(t + 0.1, 587, 0.18, 0.06, 'triangle', o); }
  else if (kind === 'lost') { toneAt(t, 740, 0.12, 0.08, 'triangle', o); toneAt(t + 0.1, 494, 0.24, 0.08, 'triangle', o); toneAt(t + 0.22, 370, 0.4, 0.05, 'sine', o); }
}
function alertScan(dt) {   // where things stand: who is noticing you, and how far it has gone
  if (CLAN_ON) return false;   // Joe: no SEEN meter or '?' any more; the clan (72-clan) is known by sight and sound alone
  const A = ALERT, rg = S.rg, live = state === 'play' && S.day && rg && rg.phase !== 'dead' && rmOn();
  let top = 0, hunt = false, search = false, sus = false;
  if (live) for (const e of roamers()) {
    if (e.st2 === 'hunt') hunt = true; else if (e.st2 === 'search') search = true; else { if (e.aw > 0.04) sus = true; top = Math.max(top, e.aw); }
    const was = A.seen.get(e); if (was && was !== 'roam' && e.st2 === 'roam' && !hunt) A.calm.push({ e, t: 0 });   // gave up on you: its '?' greys and fades
    A.seen.set(e, e.st2);
  }
  A.prev = A.st; A.st = hunt ? 'hunt' : search ? 'search' : sus ? 'sus' : 'calm';
  A.top = hunt ? 1 : top;
  if (A.st === 'hunt' && A.prev !== 'hunt') {   // SPOTTED: everything at once
    A.spot = { t: 0 }; A.lost = null; alertSound('spot'); addShake(0.35); hitStop(0.1); VIEW_FX.fov -= 7; VIEW_FX.dip += 4; padRumble(0.6, 260);
    rg.notes = rg.notes.filter(n => n.text !== 'spotted' && n.text !== 'they know you\'re here');
  }
  if (A.prev === 'hunt' && A.st === 'search') { alertSound('search'); rg.notes = rg.notes.filter(n => n.text !== 'they lost you'); }
  if ((A.prev === 'hunt' || A.prev === 'search') && (A.st === 'calm' || A.st === 'sus')) { A.lost = { t: 0 }; alertSound('lost'); }
  // the bar filling ticks up, and past halfway your heart starts to go, faster the closer they are to having you
  if (A.st === 'sus' || A.st === 'calm') {
    const step = Math.floor(top * 8); if (step > A.tick) alertSound('tick', top); A.tick = step;
  } else A.tick = 0;
  const pulse = A.st === 'hunt' ? 0.55 : A.st === 'sus' && top > 0.45 ? 1.05 - 0.5 * top : 0;
  if (pulse) { A.beat -= dt; if (A.beat <= 0) { A.beat = pulse; alertSound('beat', A.st === 'hunt' ? 0.8 : top); } } else A.beat = 0.15;
  if (A.spot && (A.spot.t += dt) > 2.4) A.spot = null;
  if (A.lost && (A.lost.t += dt) > 1.9) A.lost = null;
  for (const c of A.calm) c.t += dt; A.calm = A.calm.filter(c => c.t < 1 && !c.e.dead);
  A.busy = live && (A.st !== 'calm' || A.spot || A.lost || A.calm.length) || !!A.spot || !!A.lost;
  return A.busy;
}
function alertMeter(g, x, y, w, k, a) {   // a slanted arcade bar: dark rim, the fill, a bright leading edge
  const h = 7, sk = 4, bar = (x0, x1) => { g.beginPath(); g.moveTo(x0 + sk, y - h / 2); g.lineTo(x1 + sk, y - h / 2); g.lineTo(x1 - sk, y + h / 2); g.lineTo(x0 - sk, y + h / 2); g.closePath(); };
  g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(8,6,4,0.85)'; bar(x - w / 2 - 2, x + w / 2 + 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.12)'; bar(x - w / 2, x + w / 2); g.fill();
  if (k > 0.005) { const c = susRgb(k); g.shadowColor = `rgba(${c},0.8)`; g.shadowBlur = 8; g.fillStyle = `rgb(${c})`; bar(x - w / 2, x - w / 2 + w * k); g.fill(); }
  g.restore();
}
const _qa = [0, 0, 0];
function alertDraw(g, dt) {
  if (CLAN_ON) return;
  const A = ALERT, cx = FW / 2, cy = FH / 2, M = Math.min(FW, FH), RX = FW * 0.36 * 0.9, RY = FH * 0.29 * 0.9, hy = Math.max(132, FH * 0.2), live = state === 'play' && S.day && rmOn();
  // hunted: the edges of the view throb red until you've lost them
  if (live && A.st === 'hunt') {
    const b = 0.5 + 0.5 * Math.sin(S.t * 7), gr = g.createRadialGradient(cx, cy, M * 0.3, cx, cy, Math.hypot(FW, FH) / 2);
    gr.addColorStop(0, 'rgba(255,30,20,0)'); gr.addColorStop(1, `rgba(255,30,20,${0.16 + 0.1 * b})`);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(0, 0, FW, FH); g.restore();
  } else if (live && A.st === 'search') {   // searching: a low amber glow at the edges
    const gr = g.createRadialGradient(cx, cy, M * 0.35, cx, cy, Math.hypot(FW, FH) / 2);
    gr.addColorStop(0, 'rgba(255,170,60,0)'); gr.addColorStop(1, `rgba(255,170,60,${0.07 + 0.03 * Math.sin(S.t * 3)})`);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(0, 0, FW, FH); g.restore();
  }
  // over each raider: the '?' filling as it notices you, '...' while it searches, the '!' when it has you
  if (live) for (const e of roamers()) {
    const bangT = e.bang ? S.t - e.bang : 9, hunting = e.st2 === 'hunt';
    if (!hunting && e.aw <= 0.04 && e.st2 !== 'search') continue;
    if (hunting && bangT > 1.4 && Math.hypot(e.x - S.p.x, e.y - S.p.y) > 420) continue;
    const h = (FOES[e.type] ? FOES[e.type].h : 38) * (e.k || 1) * 1.15 + 20, q = scr(e.x, h, e.y, _qa), col = e.st2 === 'search' ? '255,190,80' : susRgb(e.aw);
    if (q && q[0] > 20 && q[0] < FW - 20 && q[1] > 30 && q[1] < FH - 20) {
      const zk = Math.max(0.75, Math.min(1.5, q[2] * 1.6));
      if (hunting) {
        if (bangT >= 0 && bangT < 1.4) fxText('!', q[0], q[1] - 6, 40 * zk, '255,70,50', Math.min(1, (1.4 - bangT) / 0.3) + 0.5, { s: spotPopFp(bangT), glow: '255,40,30', blur: 18 });
        else if (bangT >= 1.4) fxText('!', q[0], q[1] - 6, (20 + 3 * Math.sin(S.t * 7)) * zk, '255,70,50', 0.85, { glow: '255,40,30', blur: 10 });
        continue;
      }
      const R = 13 * zk, a = Math.min(1, e.aw * 4 + (e.st2 === 'search' ? 1 : 0)), pop = e.huh && S.t - e.huh < 0.3 ? 1 + 0.6 * (1 - (S.t - e.huh) / 0.3) : 1;
      g.save(); g.globalAlpha = a;
      g.fillStyle = 'rgba(10,8,6,0.6)'; g.beginPath(); g.arc(q[0], q[1], (R + 4) * pop, 0, 7); g.fill();
      g.lineWidth = 3.5 * zk; g.strokeStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.arc(q[0], q[1], R * pop, 0, 7); g.stroke();
      g.strokeStyle = `rgb(${col})`; g.shadowColor = `rgba(${col},0.8)`; g.shadowBlur = e.aw > 0.45 ? 10 : 0;
      g.beginPath(); g.arc(q[0], q[1], R * pop, -Math.PI / 2, -Math.PI / 2 + (e.st2 === 'search' ? 1 : e.aw) * Math.PI * 2); g.stroke();
      g.restore();
      fxText(e.st2 === 'search' ? '…' : '?', q[0], q[1] + 1, 19 * zk * pop, col, a, { glow: e.aw > 0.45 ? col : null, blur: 10 });
    } else if (!hunting) {   // out of sight (often behind you): a chevron on the ring, pointing at it, filling the same way
      const th = viewAngle(e.x, e.y).th, k = e.st2 === 'search' ? 0.5 : e.aw, r = 12 + 7 * k, x = cx + Math.cos(th) * RX, y = cy + Math.sin(th) * RY;
      g.save(); g.translate(x, y); g.rotate(th);
      g.fillStyle = 'rgba(8,6,4,0.85)'; g.beginPath(); g.moveTo(r + 3, 0); g.lineTo(-r * 0.7 - 2, -r * 0.8 - 2); g.lineTo(-r * 0.3, 0); g.lineTo(-r * 0.7 - 2, r * 0.8 + 2); g.closePath(); g.fill();
      g.shadowColor = `rgba(${col},0.8)`; g.shadowBlur = 10; g.fillStyle = `rgba(${col},${0.5 + 0.5 * k})`;
      g.beginPath(); g.moveTo(r, 0); g.lineTo(-r * 0.7, -r * 0.8); g.lineTo(-r * 0.3, 0); g.lineTo(-r * 0.7, r * 0.8); g.closePath(); g.fill();
      g.restore();
      fxText(e.st2 === 'search' ? '…' : '?', x - Math.cos(th) * 24, y - Math.sin(th) * 24, 17, col, 1);
    }
  }
  for (const c of A.calm) {   // gave up: the '?' greys and fades away
    const q = scr(c.e.x, (FOES[c.e.type] ? FOES[c.e.type].h : 38) * (c.e.k || 1) * 1.15 + 20, c.e.y, _qa); if (!onScr(q, 0)) continue;
    fxText('?', q[0], q[1] - 10 * c.t, 22, '200,200,195', 1 - c.t, { s: 0.8 + 0.2 * (1 - c.t) });
  }
  // up top: how close you are to being caught, from whichever of them is closest to it
  if (live && A.st === 'sus' && !A.spot && (!A.lost || A.top >= 0.45)) {
    const top = A.top, c = susRgb(top), hot = top >= 0.45, sh = hot ? (Math.random() - 0.5) * 4 * top : 0;
    fxText(hot ? 'SUSPICIOUS' : 'SEEN', cx + sh, hy - 8, hot ? 17 : 13, c, Math.min(1, top * 4), { glow: hot ? c : null, blur: 10, w: 700 });
    alertMeter(g, cx + sh, hy + 10, 120, top, Math.min(1, top * 4));
  } else if (live && A.st === 'hunt' && !A.spot) {
    const b = 0.5 + 0.5 * Math.sin(S.t * 7);
    fxText('HUNTED', cx, hy - 8, 17 + 2 * b, '255,72,52', 0.95, { glow: '255,40,30', blur: 10 + 6 * b });
    fxText('BREAK THEIR LINE OF SIGHT', cx, hy + 12, 10, '255,214,200', 0.75, { w: 600 });
  } else if (live && A.st === 'search' && !A.lost) {
    fxText('SEARCHING', cx, hy - 8, 15, '255,190,80', 0.9, { glow: '255,150,40', blur: 8 });
    fxText('STAY OUT OF SIGHT', cx, hy + 12, 10, '255,230,200', 0.7, { w: 600 });
  }
  // SPOTTED: a red flash across the screen, two rings snapping out, the word slamming in and THEY'RE COMING under it
  if (A.spot) {
    const t = A.spot.t, fade = t < 1.7 ? 1 : Math.max(0, 1 - (t - 1.7) / 0.6), sy = Math.max(hy + 40, FH * 0.3);
    g.save(); g.globalCompositeOperation = 'lighter';
    if (t < 0.18) { g.fillStyle = `rgba(255,40,25,${0.45 * (1 - t / 0.18)})`; g.fillRect(0, 0, FW, FH); }
    for (const d of [0, 0.12]) { const u = (t - d) / 0.55; if (u <= 0 || u >= 1) continue; const R = (30 + M * 0.55 * sEase(u)); g.strokeStyle = `rgba(255,60,40,${0.8 * (1 - u)})`; g.lineWidth = 8 - 6 * u; g.beginPath(); g.ellipse(cx, cy, R * FW / M * 0.8, R * 0.6, 0, 0, 7); g.stroke(); }
    g.restore();
    const jx = t < 0.5 ? (Math.random() - 0.5) * 10 * (1 - t / 0.5) : 0;
    fxText('SPOTTED!', cx + jx, sy, Math.min(56, FW * 0.11), '255,72,52', fade, { s: spotPopFp(t), glow: '255,40,30', blur: 18 });
    if (t > 0.22) fxText("THEY'RE COMING", cx, sy + Math.min(40, FW * 0.08), 14, '255,214,200', fade * Math.min(1, (t - 0.22) / 0.15), { w: 600 });
  }
  if (A.lost) {
    const t = A.lost.t;
    fxText('LOST THEM', cx, Math.max(hy + 40, FH * 0.3), Math.min(40, FW * 0.08), '239,239,234', t < 1.3 ? 1 : 1 - (t - 1.3) / 0.6, { s: spotPopFp(t), glow: '255,200,140', blur: 12 });
  }
}
