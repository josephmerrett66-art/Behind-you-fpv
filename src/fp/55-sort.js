// ================= keeping your pack in order (Joe) =================
// With the pack open:
//   R            sort your pockets (and the chest or box you've opened): stacks merged, tools first, then light, food, drink,
//                medicine, things to place, what you wear and the materials, each by name. The hotbar stays as you set it.
//   Shift-click  send a stack straight across: pack to chest, chest to pack; with no chest open, between hotbar and pockets.
//   Q            stack into the chest: everything in your pockets that the chest already holds some of goes in.
//   T            take everything out of the chest.
// The same are buttons along the top of the pack, for the mouse and the pad.
const SORT_K = { tool: 0, light: 1, food: 2, drink: 3, med: 4, place: 5, gear: 6, mat: 7 };
const sortRank = s => { const T = DIT[s.id]; return (SORT_K[T.k] ?? 8) * 1000 + (T.tool === 'weapon' ? 0 : 1); };
const plainSlot = s => Object.keys(s).every(k => k === 'id' || k === 'n');   // nothing of its own (wear, water, upgrades): can join a stack
function sortSlots(arr, from) {
  const items = arr.slice(from).filter(Boolean), out = [];
  for (const s of items) {   // merge loose stacks of the same thing
    const T = DIT[s.id];
    if (T.st > 1 && plainSlot(s)) for (const o of out) { if (o.id !== s.id || !plainSlot(o) || o.n >= T.st) continue; const k = Math.min(s.n, T.st - o.n); o.n += k; s.n -= k; if (!s.n) break; }
    if (s.n > 0) out.push(s);
  }
  out.sort((a, b) => sortRank(a) - sortRank(b) || DIT[a.id].n.localeCompare(DIT[b.id].n) || b.n - a.n);
  for (let i = from; i < arr.length; i++) arr[i] = out[i - from] || null;
}
function pkSort() {
  const D = S.day; sortSlots(D.inv, HOTN); if (PK.cont) sortSlots(PK.cont.inv, 0);
  PK.sel = null; pkSay(PK.cont ? 'sorted your pockets and the ' + (PK.cont.box ? 'box' : 'chest') : 'sorted your pockets');
  sfx(1.2, 0.25, 'bandpass', 900, 0.22); dayChanged(); renderPack();
}
function pkStackIn() {   // into the chest: whatever it already has some of
  const D = S.day; if (!PK.cont) { pkSay('open a chest first'); renderPack(); return; }
  const has = new Set(PK.cont.inv.filter(Boolean).map(s => s.id)); let n = 0;
  for (let i = HOTN; i < D.inv.length; i++) if (D.inv[i] && has.has(D.inv[i].id)) { const a = D.inv[i]; pkQuick('inv', i); if (D.inv[i] !== a || (D.inv[i] && D.inv[i].n !== a.n)) n++; }
  pkSay(n ? `stacked ${n} into the ${PK.cont.box ? 'box' : 'chest'}` : 'nothing here it already holds'); renderPack();
}
function pkTakeAll() {
  if (!PK.cont) { pkSay('open a chest first'); renderPack(); return; }
  const C = PK.cont.inv; let n = 0, full = false;
  for (let i = 0; i < C.length; i++) if (C[i]) { const a = C[i], n0 = a.n; pkQuick('cont', i); if (C[i] !== a || a.n !== n0) n++; else full = true; }
  pkSay(full ? (n ? 'took what fits · your pack is full' : 'your pack is full') : n ? 'took everything' : 'it\'s empty'); renderPack();
}
function pkShiftMove(w, i) {
  const D = S.day;
  if (w === 'gear') { if (D.gear[i]) { dayUnequip(i); PK.sel = null; dayChanged(); } renderPack(); return; }
  if (PK.cont && (w === 'inv' || w === 'cont')) { pkQuick(w, i); renderPack(); return; }
  const s = D.inv[i]; if (w !== 'inv' || !s) return;
  // no chest: hotbar to pockets, pockets to the hotbar (onto a stack of the same, else the first free slot)
  const [a, b] = i < HOTN ? [HOTN, D.inv.length] : [0, HOTN], T = DIT[s.id];
  let j = -1;
  if (T.st > 1 && plainSlot(s)) for (let k = a; k < b; k++) { const o = D.inv[k]; if (o && o.id === s.id && plainSlot(o) && o.n < T.st) { j = k; break; } }
  if (j < 0) for (let k = a; k < b; k++) if (!D.inv[k]) { j = k; break; }
  if (j < 0) { pkSay(i < HOTN ? 'your pockets are full' : 'the hotbar is full'); renderPack(); return; }
  pkMove({ w: 'inv', i }, { w: 'inv', i: j }); PK.sel = null; sfx(0.9, 0.2, 'bandpass', 600, 0.2); dayChanged(); renderPack();
}
// shift-click on a slot: the slot says where it is
{ const ps = pkSlot; pkSlot = function (s, w, i, extra) { const b = ps(s, w, i, extra); b.dataset.w = w; b.dataset.i = i; return b; }; }
craftEl.addEventListener('click', e => {
  if (!e.shiftKey) return; const b = e.target.closest && e.target.closest('button.slot'); if (!b || !b.dataset.w) return;
  e.stopPropagation(); e.preventDefault();
  const w = b.dataset.w; pkShiftMove(w, w === 'gear' ? b.dataset.i : +b.dataset.i);
}, true);
const pkKeysOn = () => S && S.day && state === 'play' && !craftEl.hidden && statsEl.hidden && PK.tab === 'pack';
addEventListener('keydown', e => {
  if (e.repeat || !pkKeysOn() || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'KeyR') pkSort(); else if (e.code === 'KeyQ') pkStackIn(); else if (e.code === 'KeyT') pkTakeAll();
});
// the buttons, along the top of the pack
{ const st = document.createElement('style');
  st.textContent = `#craft .pkorg { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; }
    #craft .pkorg .act kbd { font: inherit; opacity: 0.6; margin-left: 0.35rem; }
    #craft .pkorg .tip { font: 0.62rem var(--mono); opacity: 0.55; flex: 1 1 12rem; }`;
  document.head.append(st); }
{ const rp = renderPack;
  renderPack = function () {
    rp.apply(this, arguments);
    if (!S || !S.day || PK.tab !== 'pack') return;
    const root = document.getElementById('pkBody'); if (!root) return;
    const bar = pkEl('div', 'pkorg'), kb = inputMode === 'kb';
    const btn = (t, key, fn) => { const b = pkEl('button', 'act', t); if (kb) b.append(pkEl('kbd', '', key)); b.addEventListener('click', fn); bar.append(b); };
    btn('Sort', 'R', pkSort);
    if (PK.cont) { btn('Stack into ' + (PK.cont.box ? 'box' : 'chest'), 'Q', pkStackIn); btn('Take all', 'T', pkTakeAll); }
    if (kb) bar.append(pkEl('span', 'tip', PK.cont ? 'shift-click a stack to send it across' : 'shift-click moves between hotbar and pockets'));
    const fl = root.querySelector('.pkflash'); if (fl) fl.after(bar); else root.prepend(bar);
  }; }
