// ================= the menus on a controller: every screen, button and slider within reach of the pad =================
// While a menu is up (the title, pause, the pack, stats and the wisp shop, the death card) a lit outline marks what's picked.
// The d-pad or left stick moves it to the nearest thing in that direction, A presses it, B goes back, left and right slide a
// slider, LB and RB flip the pack's tabs and the right stick scrolls a long list. Anything the main game made clickable
// counts, buttons or not (the shim notes every element that's given a click), so new menus come in on their own.
const PM = { el: null, box: null, cx: 0, cy: 0, dir: '', rep: 0, armT: 0 };
function pmBox() {
  if (!deathCard.hidden) return deathCard;
  if (!statsEl.hidden) return statsEl;
  if (!campEl.hidden) return campEl;
  if (!craftEl.hidden) return craftEl;
  if (state === 'pause') return $('pause');
  if (state === 'title') return $('title');
  return null;
}
function pmItems(box) {
  const out = [];
  for (const e of box.querySelectorAll('button, input[type=range], *')) {
    if (!(e.tagName === 'BUTTON' || (e.tagName === 'INPUT' && e.type === 'range') || e.__tap) || e.disabled) continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    out.push(e);
  }
  return out;
}
const pmMid = r => [r.left + r.width / 2, r.top + r.height / 2];
function pmSet(e, scroll = true) {
  if (PM.el && PM.el !== e) PM.el.classList.remove('padfocus');
  PM.el = e; if (!e) return;
  e.classList.add('padfocus');
  if (scroll) e.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  [PM.cx, PM.cy] = pmMid(e.getBoundingClientRect());
}
// the first thing to pick when a menu opens: what the game itself put first, or the top of the list
function pmFirst(box, items) {
  const pref = { title: 'begin', pause: 'resume', deathCard: 'dcGo' }[box.id], p = pref ? $(pref) : box === craftEl ? craftEl.querySelector('.pktab[aria-pressed="true"]') : null;
  if (p && items.includes(p)) return p;
  if (items.includes(document.activeElement)) return document.activeElement;
  return items[0] || null;
}
// the nearest thing in the way you pushed, favouring what's straight ahead over what's off to the side
function pmMove(items, dx, dy) {
  const cur = PM.el.getBoundingClientRect(); let best = null, bs = Infinity;
  for (const e of items) {
    if (e === PM.el) continue;
    const r = e.getBoundingClientRect(), [x, y] = pmMid(r);
    let gap, side;
    if (dx) { gap = dx > 0 ? r.left - cur.right : cur.left - r.right; side = Math.abs(y - PM.cy); if ((x - PM.cx) * dx <= 2 || r.bottom < cur.top - 6 || r.top > cur.bottom + 6) continue; }   // sideways stays on the row
    else { gap = dy > 0 ? r.top - cur.bottom : cur.top - r.bottom; side = Math.abs(x - PM.cx); if ((y - PM.cy) * dy <= 2) continue; }
    const s = Math.max(0, gap + 4) + side * (dx ? 3 : 1.2);
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}
function pmPress(e) {
  if (e.__tap === 'pointerdown') e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  else e.click();
}
function pmSlide(e, k) {
  const st = parseFloat(e.step) || 1, v = clamp(parseFloat(e.value) + st * k, parseFloat(e.min), parseFloat(e.max));
  e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true }));
}
function pmBack(box) {
  if (box === statsEl) { if (statCat) { statCat = null; statOpen = null; renderStats(); } else $('statsGo').click(); }   // out of a group first
  else if (box === craftEl) { if (PK.sel) { PK.sel = null; renderPack(); } else $('craftGo').click(); }   // put down what's picked first
  else if (box === campEl) { campEl.hidden = true; }
  else if (box.id === 'pause') unpause();
}
// called by pollPad every frame a pad is in use; returns true while a menu has the pad
function padMenu(dt, btn, press, ax, ay, ry) {
  const box = inputMode === 'pad' ? pmBox() : null;
  if (box !== PM.box) { PM.box = box; pmSet(null); }
  if (!box) { if (PM.el) pmSet(null); return false; }
  const items = pmItems(box);
  if (!PM.el || !PM.el.isConnected || !items.includes(PM.el)) {   // the menu was redrawn: pick what now sits where the outline was
    let e = null;
    if (PM.el) { let bd = Infinity; for (const c of items) { const [x, y] = pmMid(c.getBoundingClientRect()), d = Math.hypot(x - PM.cx, y - PM.cy); if (d < bd) { bd = d; e = c; } } }
    pmSet(e || pmFirst(box, items), false);
    if (!PM.el) return true;
  } else PM.el.classList.add('padfocus');
  // which way: the d-pad, or the left stick pushed well over; held, it repeats
  const sx = ax > 0.55 ? 1 : ax < -0.55 ? -1 : 0, sy = ay > 0.55 ? 1 : ay < -0.55 ? -1 : 0;
  const dir = btn(12) || sy < 0 ? 'u' : btn(13) || sy > 0 ? 'd' : btn(14) || sx < 0 ? 'l' : btn(15) || sx > 0 ? 'r' : '';
  let go = false;
  if (dir !== PM.dir) { PM.dir = dir; PM.rep = 0.38; go = !!dir; }
  else if (dir) { PM.rep -= dt; if (PM.rep <= 0) { PM.rep = 0.11; go = true; } }
  if (go) {
    const slider = PM.el.tagName === 'INPUT';
    if (slider && (dir === 'l' || dir === 'r')) pmSlide(PM.el, dir === 'l' ? -1 : 1);
    else { const n = pmMove(items, dir === 'l' ? -1 : dir === 'r' ? 1 : 0, dir === 'u' ? -1 : dir === 'd' ? 1 : 0); if (n) { pmSet(n); pmTick(); } }
  }
  if (press(0)) pmPress(PM.el);
  else if (press(1)) pmBack(box);
  if (box === craftEl && (press(4) || press(5))) {   // LB RB: the pack's tabs
    const tabs = [...craftEl.querySelectorAll('.pktab')], i = tabs.findIndex(b => b.getAttribute('aria-pressed') === 'true');
    const t = tabs[(i + (press(5) ? 1 : tabs.length - 1)) % tabs.length]; if (t) { t.click(); pmSet(null); }
  }
  if (Math.abs(ry) > 0.2) {   // the right stick scrolls whatever long list holds the outline
    let s = PM.el.parentElement;
    while (s && s !== document.body) { const cs = getComputedStyle(s); if (/(auto|scroll)/.test(cs.overflowY) && s.scrollHeight > s.clientHeight + 2) break; s = s.parentElement; }
    if (s && s !== document.body) { s.scrollTop += ry * 900 * dt; [PM.cx, PM.cy] = pmMid(PM.el.getBoundingClientRect()); }
  }
  return true;
}
const pmTick = () => { try { sfx(2.2, 0.03, 'bandpass', 2400, 0.06); } catch (e) {} };
