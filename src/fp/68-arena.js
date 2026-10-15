// ---------------- the boss arena ----------------
// Joe: a way to try the Woodcutter from the title screen. Pick a weapon, and you're dropped in a clearing in the woods
// with food and bandages and he comes for you. It's a run of its own: nothing is read from your save or written to it.
const ARENA_KITS = [
  { id: 'sword2', n: 'Iron sword', s: 'Quick cuts, a good reach' },
  { id: 'waxe4', n: 'Iron war axe', s: 'Slow and heavy, hits hard' },
  { id: 'spear3', n: 'Iron spear', s: 'Keeps him at arm\'s length' },
  { id: 'mace', n: 'Iron mace', s: 'Big swings that stagger' },
  { id: 'knife3', n: 'Iron knife', s: 'Fast, but you have to get close' },
  { id: 'bow3', n: 'War bow', s: 'With 40 arrows · shoot from afar', more: [['arrows', 40]] },
  { id: 'sling2', n: 'Braided sling', s: 'With 40 stones', more: [['stones', 40]] },
  { id: 'jav', n: 'Javelins', s: '12 to throw', n0: 12 },
];
function arenaShow(head, sub) {
  $('arenaH').textContent = head || 'boss arena';
  $('arenaS').textContent = sub || 'Pick your weapon. You fight the Woodcutter in the woods with food and bandages. Nothing here is saved.';
  const box = $('arenaPick'); box.replaceChildren();
  for (const K of ARENA_KITS) {
    const b = document.createElement('button'); b.className = 'panel';
    b.innerHTML = `<span><b>${K.n}</b><span>${K.s}</span></span>`;
    b.addEventListener('click', () => arenaStart(K));
    box.append(b);
  }
  $('title').classList.remove('show'); $('arena').classList.add('show');
  if (inputMode === 'pad') pmSet(null);
}
function arenaStart(K) {
  if (!ready) return;
  ARENA = { kit: K };
  $('arena').classList.remove('show');
  startRun(true);
  const S0 = S, D = S.day, p = S.p;
  D.t = DAY_LEN * 0.25;   // late morning, a long way from dark
  D.inv = D.inv.map(() => null);
  D.inv[0] = { id: K.id, n: K.n0 || 1, d: DIT[K.id].dur };
  (K.more || []).forEach(([id, n], i) => { D.inv[1 + i] = { id, n }; });
  const at = (K.more || []).length + 1;
  D.inv[at] = { id: 'cooked', n: 6 }; D.inv[at + 1] = { id: 'bandage', n: 4 };
  D.hot = 0; D.seen.add(K.id);
  // a clearing in the woods: open ground under you, trees close enough for him to fell
  let spot = null;
  for (let t = 0; t < 600 && !spot; t++) {
    const a = Math.random() * 6.283, d = 1200 + Math.random() * 900, x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (lakeAt(x, y, 80) || propsNear(x, y, 110).some(o => o.kind === 'tree' || o.kind === 'rock')) continue;
    if (propsNear(x, y, 320).filter(o => o.kind === 'tree').length < 4) continue;
    spot = { x, y };
  }
  spot = spot || { x: 1500, y: 0 };
  p.x = spot.x; p.y = spot.y; S.rg.inCamp = false;
  look.yaw = look.tYaw = yawOfAim(0); look.pitch = look.tPitch = -0.08; setAim();
  S.cam.x = p.x; S.cam.y = p.y; worldDirty = true;
  dayChanged();
  setTimeout(() => { if (S === S0 && ARENA) bossSpawn({ i: 0, x: spot.x + 180, y: spot.y - 20 }); }, 1200);
  S.rg.ringMsg = { text: 'boss arena', sub: 'Get ready · he\'s coming', t: 0 };
}
function arenaOver(won) {
  if (!ARENA || ARENA.over) return; ARENA.over = true;
  const kit = ARENA.kit;
  setTimeout(() => {
    state = 'title'; document.body.classList.remove('playing'); lockOff();
    craftEl.hidden = statsEl.hidden = deathCard.hidden = true; $('pause').classList.remove('show');
    if (actx) actx.suspend();
    ARENA = null;
    arenaShow(won ? 'you felled him' : 'the woodcutter wins', won ? `With the ${kit.n.toLowerCase()}. Try another weapon, or go back.` : `With the ${kit.n.toLowerCase()}. Try again, or pick another weapon.`);
  }, won ? 0 : 1600);
}
$('beginArena').addEventListener('click', () => { if (ready) arenaShow(); });
$('arenaBack').addEventListener('click', () => { $('arena').classList.remove('show'); $('title').classList.add('show'); titleText(); });
