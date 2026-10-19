// ---------------- the cozy pass ----------------
// Joe: get the survival right first. The raiders are switched off (the code all stays, DAY_RAIDERS brings them back),
// the woods feed you instead, food takes its time on the fire and the rack, and the night has the cold.
const DAY_RAIDERS = true;   // Joe: they're back, fought with weapons now: the torch shows them but doesn't burn them, and kills drop no wisps
const DAY_FOE_TOUGH = { shade: 2.6, stalker: 3, brute: 2, bomber: 1.8, laser: 2, kamikaze: 2, splitter: 1.8, splitling: 2, tall: 1.5 };   // two or three hits with a club, not one
const DAY_FOE_FEW = 0.45;   // and fewer of them at once
const BEAST_BACK = 150, BEAST_CAP = 22, BEAST_SKIP = 0.2;   // more animals, and a hunted stretch of woods fills again sooner

// ---- cooking and drying take time ----
// What you make at a fire or a rack goes on it and is ready a while later. Walk up to it to take it.
const COOK_T = { cook: 14, roast: 9, fishC: 12, stew: 30, tea: 12, jerky: 150, jerkyf: 150 };
const POT_MAX = 4, POT_GRAB = 46;
const cookSlow = r => r.g === 'food' && !r.make && (r.at === 'fire' || r.at === 'rack');
function cookAt(at) {   // the fire or rack you are at
  const p = S.p, D = S.day;
  if (at === 'fire' && dist2(EX_FIRE, p) < COOK_R) return { x: EX_FIRE.x, y: EX_FIRE.y };
  let best = null, bd = 1e9;
  for (const B of D.builds) if (B.t === at && dist2(B, p) < (at === 'fire' ? COOK_R : RACK_R) && dist2(B, p) < bd) { bd = dist2(B, p); best = B; }
  return best && { x: best.x, y: best.y };
}
function cookStart(r, times) {
  const D = S.day, pots = D.pots || (D.pots = []), at = cookAt(r.at); if (!at) return;
  const here = pots.filter(q => Math.hypot(q.x - at.x, q.y - at.y) < 4);
  if (here.length >= POT_MAX) { dayNote('pots', r.at === 'rack' ? 'the rack is full · take what\'s done first' : 'the fire is full · take what\'s done first', 2); return; }
  let made = 0;
  for (let k = 0; k < times && canCraft(r) === true; k++) { daySpend(r.cost); made++; }
  if (!made) return;
  const T = Math.round((COOK_T[r.id] || 12) * (1 + 0.25 * (made - 1)));
  pots.push({ at: r.at, x: at.x, y: at.y, id: r.out, n: (r.n || 1) * made, rid: r.id, T, t: 0, slot: here.length });
  const nm = recName(r).toLowerCase(), verb = r.at === 'rack' ? 'drying' : 'cooking';
  PK.flash = { t: `${verb} ${nm}${made > 1 ? ' ×' + made : ''} · ready in ${dayClockS(T)}`, at: performance.now(), rid: r.id };
  exNote(`${verb} · ${nm} · ready in ${dayClockS(T)}`, true);
  dayAct(8, 0.6); sfx(0.6, 0.35, 'lowpass', 900, 0.4);
  if (actx && r.at === 'fire') noiseAt(actx.currentTime, 5200, 2600, 0.9, 0.12, sfxGain);   // a sizzle
  dayChanged();
}
const dayClockS = s => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
function cookStep(dt) {
  const D = S.day, p = S.p; if (!D || !D.pots || !D.pots.length) return;
  for (const q of D.pots) {
    if (!q.ready) { q.t += dt; if (q.t >= q.T) { q.ready = 1; if (Math.hypot(p.x - q.x, p.y - q.y) < 900) { exNote(`${DIT[q.id].n.toLowerCase()} is ready`, true); if (actx) toneAt(actx.currentTime, 880, 0.5, 0.05, 'triangle', sfxGain); } } }
    else if (Math.hypot(p.x - q.x, p.y - q.y) < POT_GRAB && S.rg.phase === 'fight') {   // walk up and take it
      q.done = 1; dayGive(q.id, q.n, q.x, q.y); pickSnd(); exNote(`took · ${DIT[q.id].n.toLowerCase()}${q.n > 1 ? ' ×' + q.n : ''}`);
    }
  }
  if (D.pots.some(q => q.done)) { D.pots = D.pots.filter(q => !q.done); D.pots.forEach(q => q.slot = D.pots.filter(o => o !== q && Math.hypot(o.x - q.x, o.y - q.y) < 4 && D.pots.indexOf(o) < D.pots.indexOf(q)).length); dayChanged(); }
}
// a little card over each fire and rack with what is on it and how long it has left
function cookBusy() { const D = S.day; return !!(D && D.pots && D.pots.some(q => Math.hypot(q.x - S.p.x, q.y - S.p.y) < 260)); }
function cookDraw(g) {
  const D = S.day; if (!D || !D.pots) return;
  g.globalCompositeOperation = 'source-over';
  for (const q of D.pots) {
    const d = Math.hypot(q.x - S.p.x, q.y - S.p.y); if (d > 260) continue;
    const s = scr(q.x, (q.at === 'rack' ? 44 : 30) + 11 * q.slot, q.y); if (!s) continue;
    const a = Math.min(1, (260 - d) / 60), k = Math.min(1.3, Math.max(0.7, s[2] * 0.6)), u = Math.min(1, q.t / q.T);
    const txt = q.ready ? `${DIT[q.id].n}${q.n > 1 ? ' ×' + q.n : ''} · ready` : `${DIT[q.id].n}${q.n > 1 ? ' ×' + q.n : ''} · ${dayClockS(Math.ceil(q.T - q.t))}`;
    g.font = `600 ${Math.round(12 * k)}px "IBM Plex Mono", ui-monospace, monospace`;
    const w = g.measureText(txt).width + 16 * k, h = 18 * k, x = s[0] - w / 2, y = s[1] - h / 2;
    g.globalAlpha = a; g.fillStyle = 'rgba(14,11,8,0.72)'; g.fillRect(x, y, w, h);
    g.fillStyle = q.ready ? 'rgba(150,220,120,0.9)' : 'rgba(255,190,110,0.85)'; g.fillRect(x, y + h - 2.5 * k, w * u, 2.5 * k);
    g.fillStyle = q.ready ? '#c8f0b0' : '#efe6d6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, s[0], s[1] - 1);
    g.globalAlpha = 1;
  }
}
