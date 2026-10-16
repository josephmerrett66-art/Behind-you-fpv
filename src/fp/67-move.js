// ================= moving and recycling what you've built (Joe) =================
// With the hammer out, the build bar has Move (M) beside Pull down (B), now called Recycle. Move: point at anything you've
// built or laid out as a blueprint and press Attack to pick it up; it rides in front of you as a ghost (pieces turn with Z and X; placed things face where you look)
// and Attack puts it down again wherever there's room. A blueprint keeps the materials already worked into it, a chest keeps
// what's in it, a bed stays your bed. Put the hammer away, or change mode, and it goes back where it was. Recycle now takes
// the things you place from your hands too (a chest, a fire, a workbench, a tarp...): the thing itself comes back to your pack,
// and anything stored in it is left on the ground. Grid pieces give back half their materials as before (all, from a blueprint).
// A pen with animals in it and the sealed caches out in the woods can't be moved or recycled.
const MV_REACH = 90, MV_PICK = 30;
const mvT0 = B => B.basket ? 'basket' : B.smoke ? 'smoke' : B.pen ? 'pen' : B.comp ? 'compost' : B.t;   // what it was put down as
const mvItem = B => { const t = mvT0(B); if (DIT[t] && DIT[t].build === t) return t; if (t === 'fire') return 'campfire'; return Object.keys(DIT).find(k => DIT[k].k === 'place' && DIT[k].build === t) || null; };
const mvFixed = B => B.t === 'cache' || (B.pen && (S.day.beasts || []).some(b => !b.dead && b.pen && Math.hypot(b.pen[0] - B.x, b.pen[1] - B.y) < 2));
function mvAimPt() { const p = S.p, A = stAimPt(); if (Math.hypot(A.x - p.x, A.y - p.y) > MV_REACH) { const a = S.aimW || 0; return { x: p.x + Math.cos(a) * MV_REACH, y: p.y + Math.sin(a) * MV_REACH }; } return A; }
function mvAimedBuild() {   // the placed thing you're pointing at
  const A = mvAimPt(); let best = null, bd = MV_PICK;
  for (const B of S.day.builds) { if (B.t === 'cache') continue; for (const q of B.parts) { const d = Math.hypot(q.x - A.x, q.y - A.y) - (q.r || 8) * 0.5; if (d < bd) { bd = d; best = B; } } }
  return best;
}
function mvAimed() { const o = stAimed(); if (o) return { kind: 'st', o }; const B = mvAimedBuild(); return B ? { kind: 'b', B } : null; }
const mvName = t => t.kind === 'st' ? PC(t.o.id).n.toLowerCase() : ((DIT[mvItem(t.B)] || {}).n || t.B.t).toLowerCase();

// ---- picking up, carrying, putting down ----
function mvPick(t) {
  const D = S.day;
  if (t.kind === 'b' && mvFixed(t.B)) { dayNote('mvfix', t.B.pen ? 'not with animals in it' : 'it won\'t shift', 1.5); return; }
  if (t.kind === 'st') { const o = t.o; D.mv = { kind: 'st', o, x: o.x, y: o.y, a: o.a, clip: o.clip, bed: o.k === 'bed' && D.bed && Math.abs(D.bed.x - o.x) < 1 && Math.abs(D.bed.y - o.y) < 1 }; D.bld.delete(o.key); stGen++; D.brot = o.a; }
  else { const B = t.B; D.mv = { kind: 'b', B, x: B.x, y: B.y, a: B.a }; D.builds = D.builds.filter(q => q !== B); }
  exNote(`moving · ${mvName(t)} · Attack to put it down`); dayAct(10, 0.45); sfx(1.4, 0.15, 'bandpass', 1500, 0.2); dayChanged();
}
function mvSpot() {   // where the thing you're carrying would go, and whether it fits
  const D = S.day, M = D.mv; if (!M) return null;
  if (M.kind === 'st') { const P = PC(M.o.id), sp = stSnap(P, stAimPt()), why = stFree(P, sp); return { sp, ok: why === true, why }; }
  const sp = dayPlaceSpot(mvT0(M.B)); return { sp, ok: sp.ok, why: sp.ok ? true : 'no room there' };
}
function mvPut(back) {   // down where you're pointing (or, back, where it came from)
  const D = S.day, M = D.mv; if (!M) return;
  let x = M.x, y = M.y, a = M.a, clip = M.clip;
  if (!back) { const s = mvSpot(); if (!s.ok) { dayNote('mvno', s.why || 'no room there', 1.2); if (actx) noiseAt(actx.currentTime, 600, 300, 0.1, 0.25, sfxGain); return; } x = s.sp.x; y = s.sp.y; a = s.sp.a; if (M.kind === 'st') clip = stClipOf(PC(M.o.id), s.sp); }
  if (M.kind === 'st') {
    const o = M.o; o.x = x; o.y = y; o.a = a; o.clip = clip; if (clip) o.clipV = 1; D.bld.set(o.key, o); stGen++;
    if (M.bed) D.bed = { x, y };
  } else {
    const B = M.B, fake = dayMakeBuild(mvT0(B), x, y, a, true);
    B.x = x; B.y = y; B.a = a; B.parts = fake.parts.map(q => Object.assign(q, { build: B })); D.builds.push(B);
  }
  D.mv = null;
  if (!back) { addShake(0.12); ashBurst(x, y, 6, 6); dayAct(10, 0.6); exNote('moved'); if (actx) { const t = actx.currentTime; boomAt(t, 160, 80, 0.12, 0.35, sfxGain); } }
  try { thingsSync(true); } catch (e) {}
  dayChanged();
}
function mvToggle() {
  const D = S.day; if (!D) return;
  if (D.mv) mvPut(true);
  D.bmove = !D.bmove; if (D.bmove) D.bdel = false;
  exNote(D.bmove ? 'move · point at something you built' : 'building'); renderBuildBar();
}
// recycling a placed thing: it comes back to you whole; what was stored in it is left on the ground
function mvRecycle(B) {
  const D = S.day; if (mvFixed(B)) { dayNote('mvfix', B.pen ? 'not with animals in it' : 'it won\'t shift', 1.5); return; }
  const id = mvItem(B);
  if (Array.isArray(B.inv)) for (const s of B.inv) if (s) dayDrop(B.x, B.y, s.id, s.n || 1, s);
  D.builds = D.builds.filter(q => q !== B);
  if (id) dayGive(id, 1, B.x, B.y, true);
  ashBurst(B.x, B.y, 8, 16); addShake(0.18); dayChips(B.x, B.y, 10, B.t === 'fire' ? 'stone' : 'wood', 8);
  exNote(`recycled · ${((DIT[id] || {}).n || B.t).toLowerCase()} back in your pack`);
  if (actx) noiseAt(actx.currentTime, 700, 200, 0.3, 0.35, sfxGain);
  try { thingsSync(true); } catch (e) {}
  dayChanged();
}

// ---- wired into the hammer ----
{ const verb = dayVerb;
  dayVerb = function () {
    const T = heldIt(), D = S.day;
    if (T && T.tool === 'build' && D) {
      if (D.bmove) return D.mv ? (mvSpot().ok ? 'Put down' : 'No room') : mvAimed() ? 'Pick up' : 'Point at it';
      if (D.bdel) return stAimed() || mvAimedBuild() ? 'Recycle' : 'Point at it';
    }
    return verb();
  }; }
{ const prim = dayPrimary;
  dayPrimary = function () {
    const T = heldIt(), D = S.day;
    if (T && T.tool === 'build' && D && !S.p.act) {
      if (D.bmove) { if (D.mv) mvPut(false); else { const t = mvAimed(); if (t) mvPick(t); else dayNote('mvnone', 'point at something you built', 1.5); } return true; }
      if (D.bdel && !stAimed()) { const B = mvAimedBuild(); if (B) { dayAct(10, 0.45); mvRecycle(B); } else dayNote('nodel', 'point at something you built to recycle it', 1.5); return true; }
    }
    return prim();
  }; }
// the ghost of what you're carrying
{ const sg = stGhost;
  stGhost = function () {
    const D = S.day; if (!D || !D.bmove) return sg();
    const M = D.mv; if (!M || M.kind !== 'st' || dayTool() !== 'build') return null;
    const P = PC(M.o.id), s = mvSpot(); if (!s) return null;
    return { kind: 'dstg', id: P.id, k: P.k, clip: stClipOf(P, s.sp), x: s.sp.x, y: s.sp.y, a: s.sp.a, ok: s.ok, why: s.ok ? '' : s.why, snap: s.sp.snap, r: 0, s: 1, need: P.cost, done: false, open: 0, seed: 3 };
  }; }
{ const dg = dayGhost;
  dayGhost = function () {
    const D = S.day; if (!D || !D.mv || D.mv.kind !== 'b' || dayTool() !== 'build' || !S.running || S.rg.phase !== 'fight') return dg();
    const s = mvSpot(); return { kind: 'dghost', build: mvT0(D.mv.B), x: s.sp.x, y: s.sp.y, a: s.sp.a, ok: s.ok, r: 0, s: 1 };
  }; }
// changing mode or tool: whatever you're carrying goes back
{ const del = stDelToggle; stDelToggle = function () { const D = S.day; if (D && D.mv) mvPut(true); if (D) D.bmove = false; return del(); }; }
{ const pk = stPick; stPick = function (id) { const D = S.day; if (D && D.mv) mvPut(true); if (D) D.bmove = false; return pk(id); }; }
{ const ct = stCat; stCat = function (c) { const D = S.day; if (D && D.mv) mvPut(true); if (D) D.bmove = false; return ct(c); }; }
function mvStep() { const D = S && S.day; if (D && D.mv && (dayTool() !== 'build' || !D.bmove || S.rg.phase !== 'fight')) mvPut(true); }
{ const bs = buildStep; buildStep = function (dt) { mvStep(); return bs(dt); }; }
// the build bar: a Move button, and Pull down named for what it does
{ const rb = renderBuildBar;
  renderBuildBar = function () {
    rb(); const D = S && S.day, bar = document.getElementById('buildbar'); if (!D || bar.hidden) return;
    const tools = bar.querySelector('.bptools'), del = tools && tools.querySelector('.bt.del');
    if (del) del.title = 'Recycle (B)';
    if (tools) {
      const b = document.createElement('button'); b.className = 'bt mv' + (D.bmove ? ' on' : ''); b.title = 'Move (M)';
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 2.5l-3 3h6zM12 21.5l-3-3h6zM2.5 12l3-3v6zM21.5 12l-3-3v6z" fill="currentColor"/></svg>';
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); mvToggle(); });
      if (del) tools.insertBefore(b, del); else tools.append(b);
    }
    const lab = bar.querySelector('.bpname');
    if (lab && D.bmove) lab.textContent = D.mv ? 'Move · point where it goes and press Attack' : 'Move · point at something you built, or a blueprint, and press Attack';
    else if (lab && D.bdel) lab.textContent = 'Recycle · point at something you built and press Attack · placed things come back whole, built pieces give back half (all from a blueprint)';
  }; }
addEventListener('keydown', e => { if (e.code === 'KeyM' && !e.repeat && state === 'play' && S && S.day && dayTool() === 'build' && !menusOpen()) mvToggle(); });
// saving while you carry something saves it where it came from
{ const sv = daySave; daySave = function () { const D = S && S.day, M = D && D.mv; if (!M) return sv.apply(this, arguments);
  if (M.kind === 'st') D.bld.set(M.o.key, M.o); else D.builds.push(M.B);
  try { return sv.apply(this, arguments); } finally { if (M.kind === 'st') D.bld.delete(M.o.key); else D.builds = D.builds.filter(q => q !== M.B); } }; }
