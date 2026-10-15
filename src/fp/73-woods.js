// ---------------- the test woods ----------------
// Joe: "like the boss arena, a patch of woods with the player and two or three cannibals, for tuning". From the title screen:
// you're set down among thick trees with a sword, a spear, a bow, food and bandages, and three of the clan are about. The sun
// stays where it is. A few buttons in the corner make them do things on demand, and one shows what each of them is up to.
// Nothing is read from your save or written to it.
let WOODS_UI = null;
function woodsUi(on) {
  if (!WOODS_UI) {
    const box = document.createElement('div'); box.id = 'woodsUi';
    box.style.cssText = 'position:fixed;left:8px;top:8px;z-index:30;display:none;flex-direction:column;gap:6px;font:12px/1.3 system-ui,sans-serif;color:#efefea;max-width:min(92vw,360px);pointer-events:none';
    const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;pointer-events:auto';
    const btn = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'font:600 12px system-ui,sans-serif;padding:6px 9px;border-radius:8px;border:1px solid #ffffff40;background:#141210cc;color:#efefea;cursor:pointer'; b.addEventListener('click', ev => { ev.stopPropagation(); fn(); b.blur(); }); b.addEventListener('pointerdown', ev => ev.stopPropagation()); row.append(b); return b; };
    btn('Test me', () => { const C = clan(); C.test = 0; C.atk = null; });
    btn('Kill one', () => { const e = clanList().filter(q => q.cl.st !== 'leave')[0]; if (e) { e.hp = 0; } });
    btn('Hurt me', () => { const rg = S.rg; rg.hp = Math.max(1, Math.ceil(rg.maxHp * 0.4)); });
    btn('Show one', () => { clan().show = 0; });
    const st = btn('States', () => { WOODS_UI.dbg = !WOODS_UI.dbg; info.style.display = WOODS_UI.dbg ? 'block' : 'none'; });
    btn('Leave', () => quitToTitle());
    const info = document.createElement('div'); info.style.cssText = 'display:none;white-space:pre;background:#141210b0;padding:6px 8px;border-radius:8px';
    box.append(row, info); document.body.append(box);
    WOODS_UI = { box, info, dbg: false, st };
  }
  WOODS_UI.box.style.display = on ? 'flex' : 'none';
}
function woodsStart() {
  if (!ready) return;
  ARENA = { woods: true, kit: { n: 'test woods' } };
  startRun(true);
  const S0 = S, D = S.day, p = S.p;
  D.t = DAY_LEN * 0.2; ARENA.t0 = D.t;
  D.inv = D.inv.map(() => null);
  const give = (i, id, n) => { D.inv[i] = { id, n, d: DIT[id] && DIT[id].dur }; D.seen.add(id); };
  give(0, 'sword2', 1); give(1, 'spear3', 1); give(2, 'bow3', 1); give(3, 'arrows', 40); give(4, 'cooked', 6); give(5, 'bandage', 4);
  D.hot = 0; D.clanN = CL.pool; D.food = D.water = 100;
  // thick woods: plenty of trees close round you to hide behind, open enough to see between
  let spot = null;
  for (let t = 0; t < 900 && !spot; t++) {
    const a = Math.random() * 6.283, d = 1300 + Math.random() * 1200, x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (lakeAt(x, y, 200) || propsNear(x, y, 40).length || dayCampList().some(C => Math.hypot(C.x - x, C.y - y) < 1200)) continue;   // well clear of the hunting camps
    const n = propsNear(x, y, 360).filter(o => o.kind === 'tree' && o.type !== 'dead').length;
    if (n < 14) continue;
    spot = { x, y };
  }
  spot = spot || { x: 1500, y: 0 };
  p.x = spot.x; p.y = spot.y; S.rg.inCamp = false;
  look.yaw = look.tYaw = yawOfAim(0); look.pitch = look.tPitch = -0.04; setAim();
  S.cam.x = p.x; S.cam.y = p.y; worldDirty = true;
  dayChanged();
  const C = clan(); C.spawnT = 99; C.test = 45; C.show = 8;
  setTimeout(() => { if (S === S0 && ARENA && ARENA.woods) for (let i = 0; i < 3; i++) clanSpawn('go', { d: 380 + i * 60 }); C.spawnT = 6; }, 600);
  S.rg.ringMsg = { text: 'test woods', sub: 'Three of them are out there', t: 0 };
  woodsUi(true);
}
function woodsStep(dt, C, all) {   // the sun held still, the clan kept at three (more while they hunt you)
  const D = S.day; D.t = ARENA.t0; D.clanN = CL.pool;
  D.food = Math.max(D.food, 40); D.water = Math.max(D.water, 40);
  if (WOODS_UI && WOODS_UI.dbg) {
    const p = S.p, lines = all.map((e, i) => `${i + 1} ${e.cl.st}${e.cl.role !== 'post' ? ' (' + e.cl.role + ')' : ''} · ${Math.round(e.cl.d)} away${e.cl.vis ? ' · SEEN' : ''}${e.cl.z > 1 ? ' · up a tree' : ''} · ${Math.round(e.hp / e.maxHp * 100)}%`);
    lines.push(C.rage > 0 ? `hunting you · ${Math.ceil(C.rage)}s left` : `next test in ~${Math.max(0, Math.round(C.test / (0.35 + 0.6 * C.w)))}s · weak ${C.w.toFixed(1)}${C.atk ? ' · testing now' : ''}`);
    lines.push(`next show in ${Math.max(0, Math.round(C.show))}s${clanRefugeAt(p.x, p.y) ? ' · you are safe here' : ''}`);
    WOODS_UI.info.textContent = lines.join('\n');
  }
}
function woodsOver() {
  if (!ARENA || ARENA.over) return; ARENA.over = true;
  setTimeout(() => { if (ARENA && ARENA.woods) { const S0 = S; woodsStart(); } }, 1800);   // straight back in for another go
}
$('beginWoods').addEventListener('click', () => { if (ready) woodsStart(); });
