// ================= finding things: the craft list by kind, a search, and filters on the pack (Joe) =================
// Joe: "I am sometimes finding it difficult to navigate through the menus to find the right items, look into how other games
// do this well". The craft tab made you pick where a thing is made first (hand, fire, bench...), then open one folded section
// of it at a time, so a recipe stayed hidden until you knew both where it's made and what kind of thing it is. Now it goes the
// way Don't Starve's crafting menu, Minecraft's recipe book and Rust's do:
//   - the kinds (All, Tools, Weapons, Food...) down the side, or along the top on a narrow screen, each with how many you can
//     make right now. One tap shows all of that kind, nothing folded away. Standing at a fire, bench or forge puts that
//     station's own tab first, and the list opens on it.
//   - a search box: part of a name, or a material ("fibre"), and you see everything it's in.
//   - every list puts what you can make right now first, then what you have the things for but must take to a station (each
//     row says which station), then the rest, the nearest to done first.
//   - it remembers the kind you last looked at.
// The pack gets a row of filters that lights up just your tools, food, medicine or materials and dims the rest, and an item's
// card gets "Craft with it", which opens the craft list on everything that uses it. On a pad, LT and RT step through the kinds.
const CR = { cat: 'all', text: '', fresh: true, q: null };
const CR_KEY = 'behind-you-fp-craftcat';
const crSaved = () => { try { return localStorage.getItem(CR_KEY) || 'all'; } catch (e) { return 'all'; } };
const crPlace = at => PLACES.find(P => P.at === at);
const crKnown = () => DREC.filter(r => S.day.known.has(r.id));
// the stations you're standing at that have something for you, best first
const crHere = known => ['anvil', 'furnace', 'bench', 'rack', 'fire'].filter(at => stationHere(at) && (at === 'anvil' || known.some(r => r.at === at)));
function crTabs(known) {
  const out = crHere(known).map(at => ({ id: 'at:' + at, n: crPlace(at).n, icon: crPlace(at).ic, here: 1, list: known.filter(r => r.at === at) }));
  out.push({ id: 'all', n: 'All', icon: 'back', list: known });
  for (const C of DCATS) { const list = known.filter(r => r.g === C.id); if (list.length) out.push({ id: C.id, n: C.n, icon: C.icon, list }); }
  return out;
}
// 0 ready, 1 you have it all but not the station, 2+ short of things (the fewer missing the sooner), 4 can't be made now
function crRank(r) { const c = canCraft(r); return c === true || c === 'pack full' ? 0 : c === 'not now' ? 4 : craftShort(r) ? 2 + craftShort(r) / 100 : 1; }
function crMatch(r, words) {
  const T = r.out && DIT[r.out], C = DCATS.find(c => c.id === r.g), P = crPlace(r.at);
  const hay = [recName(r), T && T.n, C && C.n, P && P.n, ...Object.keys(r.cost).map(k => DIT[k].n)].filter(Boolean).join(' | ').toLowerCase();
  return words.every(w => hay.includes(w));
}
function crSearch() {   // one box kept from draw to draw, so typing in it isn't lost when the list redraws
  if (!CR.q) {
    const q = CR.q = pkEl('input', 'crq'); q.type = 'search'; q.placeholder = 'Find: a name or a material'; q.setAttribute('aria-label', 'Find a recipe'); q.autocomplete = 'off'; q.spellcheck = false;
    q.addEventListener('input', () => { CR.text = q.value; PK.open = null; renderPack(); });
    q.addEventListener('keydown', e => {   // the letters are for the box, not the game (C, I and Tab would shut the pack)
      if (e.key === 'Escape' && !q.value) { q.blur(); return; }   // with nothing typed Escape goes on and shuts the pack
      if (e.key === 'Escape') { q.value = CR.text = ''; renderPack(); } else if (e.key === 'Enter') q.blur();
      e.stopPropagation();
    });
  }
  if (CR.q.value !== CR.text) CR.q.value = CR.text;
  return CR.q;
}
function crPick(id) {
  CR.cat = id; CR.text = ''; PK.open = null;
  if (!id.startsWith('at:')) try { localStorage.setItem(CR_KEY, id); } catch (e) {}
  if (id === 'at:anvil') PK_ONE['c:anvil'] = 'forge';   // the forge's upgrades open
  renderPack(); crToTop();
}
function crToTop() {   // a new list starts at its top, with the kinds still in sight
  const w = craftEl.querySelector('.crwrap'); if (!w) return;
  const top = w.getBoundingClientRect().top - craftEl.getBoundingClientRect().top + craftEl.scrollTop - 8;
  if (craftEl.scrollTop > top) craftEl.scrollTop = Math.max(0, top);
}
function crCycle(k) {
  const tabs = crTabs(crKnown()); if (!tabs.length) return;
  const i = CR.text ? tabs.findIndex(t => t.id === 'all') : Math.max(0, tabs.findIndex(t => t.id === CR.cat));
  crPick(tabs[(i + k + tabs.length) % tabs.length].id); pmTick();
}
function crRow(r) {
  const here = stationHere(r.at), row = craftRow(r, here);
  if (r.at !== 'hand') {   // where it's made: green if you're there, else what to do about it
    const P = crPlace(r.at), b = pkEl('span', 'crat' + (here ? ' here' : '')); b.innerHTML = iconSvg(P.ic) + '<span></span>';
    b.querySelector('span').textContent = P.n; b.title = here ? `You're at the ${P.n.toLowerCase()}` : placeHint(r.at);
    row.querySelector('.rtext b').append(b);
    const det = row.querySelector('.rdet'); if (det && !here) det.prepend(pkEl('p', 'rlong crhint', placeHint(r.at)));
  }
  return row;
}
const crAn = at => ({ fire: 'a fire', bench: 'a workbench', furnace: 'a furnace', rack: 'a drying rack', anvil: 'a forge' })[at] || at;
craftHtml = function () {
  const D = S.day, el = pkEl, known = crKnown();
  if (!known.length) return [el('p', 'small none', 'Nothing yet. Pick up sticks, stones and fibre to learn your first recipes.')];
  const tabs = crTabs(known);
  if (CR.fresh) {   // coming into the tab: on the station you're at, else on the kind you last looked at
    CR.fresh = false; const at = PK.at && PK.at !== 'hand' ? 'at:' + PK.at : null;
    CR.cat = at && tabs.some(t => t.id === at) ? at : crSaved(); if (CR.cat === 'at:anvil') PK_ONE['c:anvil'] = 'forge';
  }
  if (!tabs.some(t => t.id === CR.cat)) CR.cat = 'all';
  const words = CR.text.trim().toLowerCase().split(/\s+/).filter(Boolean), tab = tabs.find(t => t.id === CR.cat);
  const wrap = el('div', 'crwrap'), rail = el('div', 'crrail'), main = el('div', 'crmain'), chips = el('div', 'crtabs');
  for (const t of tabs) {
    const n = t.list.filter(r => canCraft(r) === true).length, nw = t.list.some(r => D.fresh.has(r.id));
    const b = el('button', 'crtab' + (t.here ? ' here' : '')); b.setAttribute('aria-pressed', !words.length && CR.cat === t.id ? 'true' : 'false'); b.dataset.cr = t.id;
    b.innerHTML = iconSvg(t.icon) + '<span></span>' + (n ? `<b>${n}</b>` : '') + (nw ? '<i class="new"></i>' : '');
    b.querySelector('span').textContent = t.n; b.title = t.here ? `What you can make at the ${t.n.toLowerCase()}` : n ? `${n} ready to make` : t.n;
    b.addEventListener('click', () => crPick(t.id)); chips.append(b);
  }
  rail.append(crSearch(), chips); wrap.append(rail, main);
  // where you are and what it's drawing on
  { const H = crHere(known), C = dayConts(), nc = C.filter(c => !c.box).length, bits = [];
    if (H.length) bits.push('At ' + H.map(a => 'the ' + crPlace(a).n.toLowerCase()).join(' and the '));
    if (C.length) bits.push('using ' + [C.some(c => c.box) ? 'the camp box' : '', nc ? `${nc} storage chest${nc > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ') + ' nearby');
    if (bits.length) main.append(el('p', 'pkwhere ok', bits.join(' · ').replace(/^using/, 'Using'))); }
  if (!words.length && tab.id === 'at:anvil') main.append(...forgeHtml(true));   // the forge's upgrades for what you carry
  const list = words.length ? known.filter(r => crMatch(r, words)) : tab.list;
  if (!list.length && words.length) main.append(el('p', 'small none', `Nothing you know matches "${CR.text.trim()}"`));
  const ci = r => DCATS.findIndex(c => c.id === r.g), name = r => recName(r);
  const secs = [{ h: 'Ready to make', c: 'ready', L: [] }, { h: '', c: 'go', L: [] }, { h: 'Still need things', c: 'need', L: [] }];
  for (const r of list) { const k = crRank(r); secs[k < 1 ? 0 : k < 2 ? 1 : 2].L.push(r); }
  secs[0].L.sort((a, b) => (a.at === 'hand') - (b.at === 'hand') || ci(a) - ci(b) || name(a).localeCompare(name(b)));   // the station's own things first
  secs[1].L.sort((a, b) => a.at.localeCompare(b.at) || ci(a) - ci(b) || name(a).localeCompare(name(b)));
  secs[2].L.sort((a, b) => crRank(a) - crRank(b) || ci(a) - ci(b) || name(a).localeCompare(name(b)));
  { const W = [...new Set(secs[1].L.map(r => r.at))].map(crAn); secs[1].h = 'Have the things · needs ' + (W.length > 1 ? W.slice(0, -1).join(', ') + ' or ' + W[W.length - 1] : W[0]); }
  for (const s of secs) {
    if (!s.L.length) continue;
    const h = el('h3', 'crh ' + s.c); h.append(el('em', '', s.h), el('span', '', String(s.L.length))); main.append(h);
    const box = el('div', 'pkrecs crrecs'); for (const r of s.L) box.append(crRow(r)); main.append(box);
  }
  const left = DREC.length - known.length;
  if (left && !words.length) main.append(el('p', 'small none', `${left} more recipe${left > 1 ? 's' : ''} to find · new things you pick up teach you more`));
  return [wrap];
};
function crFind(text) {   // from an item's card: the craft list on everything that uses it
  PK.tab = 'craft'; PK.sel = null; PK.open = null; CR.fresh = false; CR.text = text.toLowerCase();
  renderPack(); craftEl.scrollTop = 0;
}

// ---- the pack: show just one kind of thing ----
const PKF_K = [{ id: 'tool', n: 'Tools', k: ['tool', 'light'] }, { id: 'food', n: 'Food & drink', k: ['food', 'drink'] }, { id: 'med', n: 'Healing', k: ['med'] },
  { id: 'place', n: 'To place', k: ['place'] }, { id: 'gear', n: 'Clothes', k: ['gear'] }, { id: 'mat', n: 'Materials', k: ['mat'] }];
let PKF = 'all';
const pkfAll = () => { const D = S.day; return [...D.inv, ...Object.values(D.gear), ...(PK.cont ? PK.cont.inv : [])].filter(Boolean); };
const pkfOf = s => { const k = DIT[s.id] && DIT[s.id].k; return PKF_K.find(F => F.k.includes(k)); };
function pkfTabs() { const all = pkfAll(); return [{ id: 'all', n: 'All', c: 0 }, ...PKF_K.map(F => ({ id: F.id, n: F.n, c: all.filter(s => pkfOf(s) === F).length })).filter(F => F.c)]; }
function pkfCycle(k) { const T = pkfTabs(), i = Math.max(0, T.findIndex(t => t.id === PKF)); PKF = T[(i + k + T.length) % T.length].id; renderPack(); pmTick(); }
function pkfDraw(root) {
  const T = pkfTabs(); if (!T.some(t => t.id === PKF)) PKF = 'all';
  if (T.length < 3) return;   // only one kind of thing on you: nothing to pick between
  const row = pkEl('div', 'pkshow');
  for (const t of T) {
    const b = pkEl('button', 'crtab sm', t.n); if (t.c) b.append(pkEl('b', '', String(t.c)));
    b.setAttribute('aria-pressed', PKF === t.id ? 'true' : 'false'); b.addEventListener('click', () => { PKF = PKF === t.id ? 'all' : t.id; renderPack(); }); row.append(b);
  }
  const bar = root.querySelector('.pkorg'); if (bar) bar.after(row); else root.prepend(row);
  if (PKF === 'all') return;
  for (const b of root.querySelectorAll('button.slot')) {   // the rest dim, what you asked for stays bright
    if (!b.dataset.w) continue; const w = b.dataset.w, s = pkGet(w, w === 'gear' ? b.dataset.i : +b.dataset.i);
    const F = s && pkfOf(s), on = !!F && F.id === PKF; b.classList.toggle('dim', !on); b.classList.toggle('lit', on);
  }
}
{ const pc = pkCard; pkCard = function () {
  const c = pc.apply(this, arguments), s = c && PK.sel && pkGet(PK.sel.w, PK.sel.i);
  if (s && itemUses(s.id)) { const b = pkEl('button', 'act', 'Craft with it'); b.title = 'Everything you know that uses it'; b.addEventListener('click', () => crFind(DIT[s.id].n)); c.querySelector('.pkacts').append(b); }
  return c;
}; }
{ const rp = renderPack;
  renderPack = function () {
    if (PK.tab !== 'craft') CR.fresh = true;
    const q = CR.q, f = q && document.activeElement === q, at = f ? q.selectionStart : 0;
    rp.apply(this, arguments);
    if (f && q.isConnected) { q.focus({ preventScroll: true }); try { q.setSelectionRange(at, at); } catch (e) {} }
    if (S && S.day && PK.tab === 'pack') { const root = document.getElementById('pkBody'); if (root) pkfDraw(root); }
  }; }
{ const cc = closeCraft; closeCraft = function () { CR.fresh = true; CR.text = ''; PKF = 'all'; return cc.apply(this, arguments); }; }
// the pad: LT and RT step through the kinds (the craft tab) or what to show (the pack)
{ const pm = padMenu; padMenu = function (dt, btn, press) {
  const r = pm.apply(this, arguments);
  if (r && PM.box === craftEl && (press(6) || press(7))) { const k = press(7) ? 1 : -1; if (PK.tab === 'craft') crCycle(k); else if (PK.tab === 'pack') pkfCycle(k); }
  return r;
}; }
{ const ph = padHintText; padHintText = function () {
  const t = ph.apply(this, arguments);
  return PM.box === craftEl && (PK.tab === 'craft' || PK.tab === 'pack') ? t.replace('LB RB tabs', 'LB RB tabs · LT RT ' + (PK.tab === 'craft' ? 'kinds' : 'show')) : t;
}; }
