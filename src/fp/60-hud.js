// ================= what's written on the screen: hearts, the day, your needs, what you can use, the woods' words =================
// The 2D game wrote these over your head and in the corner; here they sit in the top left, under the crosshair and across the top.
const HEART_P = 'M12 20.5 2.4 11A6 6 0 0 1 12 3.6 6 6 0 0 1 21.6 11Z';
const heartSvg = (fill, stroke, half) => `<svg viewBox="0 0 24 21">${half ? `<defs><clipPath id="hh"><rect width="12" height="21"/></clipPath></defs><path d="${HEART_P}" fill="${fill}" clip-path="url(#hh)"/>` : ''}<path d="${HEART_P}" fill="${half ? 'none' : fill}" stroke="${stroke}" stroke-width="1.6"/></svg>`;
const SUN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#efe0b0" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>';
const MOON_SVG = '<svg viewBox="0 0 24 24"><path d="M15.5 3.5a8.5 8.5 0 1 0 5 15 7 7 0 0 1-5-15z" fill="#c8d0dc"/></svg>';
const BAR_ICO = {
  st: '<svg viewBox="0 0 24 24"><path d="M13 2 5 13.5h6L10 22l9-12h-6z" fill="#efe296"/></svg>',
  food: '<svg viewBox="0 0 24 24"><path d="M14 4.5c4.2 0 6.5 3.2 5.5 7.4s-5.2 6.3-9.3 5.3l-3.3 3.1-2.3-2.3 3.1-3.3c-1-4.2 2-10.2 6.3-10.2z" fill="#e29650"/></svg>',
  water: '<svg viewBox="0 0 24 24"><path d="M12 3c3 4.5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6.5 6-11z" fill="#6eaae6"/></svg>',
  warm: '<svg viewBox="0 0 24 24"><path d="M12 2.5c1 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 0 2 1 3 2 3 0-3-1-5.5.5-8.5z" fill="#96c8d7"/></svg>',
};
const hudEl = { hearts: $('hearts'), day: $('dayLine'), bars: $('bars'), say: $('say'), info: $('info'), prompt: $('promptT'), notes: $('notes'), bT: $('bannerT'), bS: $('bannerS'), banner: $('banner'), spec: $('bSpec') };
hudEl.bars.innerHTML = ['st', 'food', 'water', 'warm'].map(k => `<div class="barrow" id="row_${k}">${BAR_ICO[k]}<div class="bar" id="bar_${k}"><i></i></div></div>`).join('');
const barI = {}; for (const k of ['st', 'food', 'water', 'warm']) barI[k] = { row: $('row_' + k), bar: $('bar_' + k), i: $('bar_' + k).firstChild, last: '' };
const COLS = { st: 'rgba(239,226,150,0.92)', sick: 'rgba(170,190,90,0.92)', food: 'rgba(226,150,80,0.92)', water: 'rgba(110,170,230,0.92)', warm: 'rgba(150,200,215,0.92)', low: 'rgba(226,84,60,0.95)' };
let hudKey = '', promptKey = '', notesKey = '', bannerKey = '';
function setBar(k, f, col, low, show = true) {
  const b = barI[k], key = (show ? 1 : 0) + ':' + f.toFixed(3) + col + low;
  if (key === b.last) return; b.last = key;
  b.row.style.display = show ? '' : 'none';
  b.i.style.transform = `scaleX(${clamp(f, 0, 1)})`; b.i.style.background = low ? COLS.low : col; b.bar.classList.toggle('low', !!low);
}
function drawHud() {
  const rg = S.rg, D = S.day; if (!rg || !D) return;
  // hearts (steel ones after, if your upgrades gave you any)
  const sm = steelMax(), hk = rg.hp + ':' + rg.maxHp + ':' + (rg.steel || 0) + ':' + sm;
  if (hk !== hudKey) {
    hudKey = hk; let h = '';
    const red = rg.hp <= 1 ? '#d23030' : 'rgba(239,239,234,0.92)';
    for (let i = 0; i < rg.maxHp; i++) h += i + 1 <= rg.hp ? heartSvg(red, red) : rg.hp > i ? heartSvg(red, 'rgba(239,239,234,0.35)', true) : heartSvg('none', 'rgba(239,239,234,0.35)');
    for (let i = 0; i < sm; i++) h += i < (rg.steel || 0) ? heartSvg('#9ca3a9', '#9ca3a9') : heartSvg('none', 'rgba(156,163,169,0.4)');
    hudEl.hearts.innerHTML = h;
  }
  const lt = dayLight(), night = dayNight();
  const dl = `${night ? MOON_SVG : SUN_SVG}<span>Day ${D.n}</span><span class="clk">${dayClock(D.t)} · ${rg.inCamp ? 'camp' : RING_NAMES[exRing(Math.hypot(S.p.x, S.p.y))]}</span>`;
  if (hudEl.day.dataset.k !== dl) { hudEl.day.dataset.k = dl; hudEl.day.innerHTML = dl; }
  setBar('st', D.st / STA_MAX, D.sick > 0 ? COLS.sick : COLS.st, D.st < 15);
  setBar('food', D.food / FOOD_MAX, COLS.food, D.food < 30);
  setBar('water', D.water / FOOD_MAX, COLS.water, D.water < 30);
  setBar('warm', D.warm / WARM_MAX, COLS.warm, D.warm < 30, D.warm < 92 || night);
  const say = D.bleed > 0 ? 'BLEEDING' : D.warm <= 0 ? 'FREEZING' : D.food <= 0 ? 'STARVING' : D.water <= 0 ? 'PARCHED' : D.warm < 30 ? 'COLD' : D.st < 15 ? 'TIRED' : D.food < 30 ? 'HUNGRY' : D.water < 30 ? 'THIRSTY' : D.sick > 0 ? 'SICK' : D.crouch ? 'SNEAKING' : '';
  if (hudEl.say.textContent !== say) hudEl.say.textContent = say;
  const used = D.inv.filter(Boolean).length, T = heldIt(), s = heldSlot();
  let wear = ''; if (s && s.d !== undefined) { const f = s.d / slotDur(s); if (f < 0.25) wear = ' · worn'; }
  const info = `${rg.kills || 0} killed · ${rg.wispCarry || 0} wisps · pack ${used}/${invSize()} · ${(T ? T.n : 'bare hands').toLowerCase()}${wear} · flasks ${rg.flask ?? FLASK_MAX}/${FLASK_MAX} · relics ${dayRelics()}/4`;
  if (hudEl.info.textContent !== info) hudEl.info.textContent = info;
  flaskBtn.textContent = `Flask ${rg.flask ?? FLASK_MAX}`; flaskBtn.classList.toggle('empty', (rg.flask ?? FLASK_MAX) <= 0);
  // under the crosshair: what you'd use, or an animal you could take unawares
  let pr = '', sneak = false, hit = false;
  const o = dayUseTarget();
  if (o) pr = (inputMode === 'kb' ? 'E · ' : inputMode === 'pad' ? 'X · ' : '') + useLabel(o).toUpperCase() + (STN_N[o.t] ? ' ' + STN_N[o.t].toUpperCase() : o.kind === 'dday' ? ' ' + DIT[o.it].n.toUpperCase() + (o.n > 1 ? ' ×' + o.n : '') : o.kind === 'dnode' ? ' ' + DIT[o.t === 'shroom' ? 'mushroom' : o.t].n.toUpperCase() : o === CAMP_BOX ? ' BOX' : o === EX_FIRE ? ` · ${stPool().w} TO SPEND` : '');
  else if (D.crouch) for (const b of D.beasts) if (!b.dead && !b.tame && b.st === 'graze' && Math.hypot(b.x - S.p.x, b.y - S.p.y) < 44 + BEAST[b.k].w) { pr = (inputMode === 'kb' ? 'CLICK · ' : '') + 'SNEAK KILL'; sneak = true; break; }
  if (!pr && !(T && (T.rng || T.thr))) { const h = dayHitTarget(); if (h) { pr = (inputMode === 'kb' ? 'CLICK · ' : '') + 'HIT FOR ' + (h.t === 'grass' ? 'FIBRE' : 'BERRIES'); hit = true; } }   // nothing to take: the grass or bush a swing would gather from
  const pk = pr + sneak;
  if (pk !== promptKey) { promptKey = pk; hudEl.prompt.textContent = pr; hudEl.prompt.className = sneak ? 'sneak' : hit ? 'hit' : ''; useBtn.textContent = o ? useLabel(o) : 'Use'; }
  // the woods' words: the notes that pop up as things happen, the big banner for a new day or a new place
  const nk = rg.notes.map(n => n.text + (n.t > 1.8 ? 'f' : '')).join('|');
  if (nk !== notesKey) { notesKey = nk; hudEl.notes.innerHTML = rg.notes.map(n => `<div class="${n.big ? 'big' : ''}" style="opacity:${n.t > 1.8 ? 0.15 : 1}">${esc(n.text)}</div>`).join(''); }
  const m = S.msg && S.msg.t < 3.2 ? S.msg : rg.ringMsg && rg.ringMsg.t < 2.8 ? rg.ringMsg : null;
  const bk = m ? m.text + '|' + (m.sub || '') : '';
  if (bk !== bannerKey) { bannerKey = bk; if (m) { hudEl.bT.textContent = m.text; hudEl.bS.textContent = m.sub || ''; } }
  hudEl.banner.style.opacity = !deathCard.hidden ? 0 : m ? clamp(Math.min(m.t * 3, (m === S.msg ? 3.2 : 2.8) - m.t), 0, 1) : 0;
  // the weapon's special, when what you hold has one
  const rk = dayRngId(), w = rk || (dArmOn() ? curW() : null), SPC = w ? DSP[w] : null;
  hudEl.spec.hidden = !SPC || rg.inCamp;
  if (SPC) { const cool = Math.max(0, rg.wspT || 0); hudEl.spec.textContent = SPC.n; hudEl.spec.classList.toggle('cool', cool > 0); }
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
FP.ui = () => {};
FP.layout = () => {};
FP.fly = (x, y, it) => { if (DIT[it]) for (let k = 0; k < 6; k++) spark(x, 10, y, (Math.random() - 0.5) * 40, 40 + Math.random() * 40, (Math.random() - 0.5) * 40, 0.4, 2.2, 1, 0.95, 0.8, 0.8, 0, 120); };
FP.squash = () => {};
