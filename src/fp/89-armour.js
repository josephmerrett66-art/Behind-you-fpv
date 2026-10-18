// ================= bone armour, and a leaf cloak to creep about in (Joe's number 7) =================
// Bone armour is the strong stuff between hide and iron, made at the workbench from what the hunt leaves you:
//   Bone helm      bones lashed over a hide cap, a nose guard, two tusks      soaks two hits
//   Bone plate     a turtle shell for a breastplate, bone ribs round it        one more heart, and soaks a hit
//   Bone greaves   splints down the shins, a cap over each knee                soaks two hits
// It rattles: each piece lets things hear you a little further off.
// The leaf cloak is the other way to go: a mantle and hood of grass and leaves bound on a hide backing. It soaks a hit,
// and everything that would see you (deer, birds, wolves, the clan) has to be a lot nearer before it does; the pale
// ones in the caves hear you a little less. It takes the body slot, so it's that or the vest's extra heart.
// What you wear now shows on you in third person and from above.
Object.assign(DIT, {
  bhelm: { n: 'Bone helm', c: '#e2dccb', st: 1, k: 'gear', slot: 'head', arm: 2, loud: 1.08, b: 'Armour · soaks two hits, then mends · it rattles' },
  bplate: { n: 'Bone plate', c: '#e2dccb', st: 1, k: 'gear', slot: 'body', heart: 1, arm: 1, loud: 1.12, b: 'One more heart, and soaks a hit · a turtle shell bound in bone · it rattles' },
  bgreave: { n: 'Bone greaves', c: '#e2dccb', st: 1, k: 'gear', slot: 'legs', arm: 2, loud: 1.08, b: 'Armour · soaks two hits, then mends · it rattles' },
  cloak: { n: 'Leaf cloak', c: '#6a7a3a', st: 1, k: 'gear', slot: 'body', arm: 1, hush: 0.6, b: 'Soaks a hit · things have to be much nearer to see you · quieter too' },
});
DREC.push(
  { id: 'bhelm', g: 'gear', out: 'bhelm', at: 'bench', cost: { bone: 3, hide: 1, rope: 1 } },
  { id: 'bplate', g: 'gear', out: 'bplate', at: 'bench', cost: { bone: 4, shell: 1, hide: 1, rope: 2 } },
  { id: 'bgreave', g: 'gear', out: 'bgreave', at: 'bench', cost: { bone: 3, hide: 1, rope: 1 } },
  { id: 'cloak', g: 'gear', out: 'cloak', at: 'bench', cost: { fibre: 12, rope: 2, hide: 1 } },
);
Object.assign(ICON, {
  bhelm: '<path d="M4.5 14a7.5 7.5 0 0 1 15 0v5h-3.6v-2.6a3.9 3.9 0 0 0-7.8 0V19H4.5z" fill="#e2dccb"/><path d="M11.1 8.5h1.8v8.2h-1.8z" fill="#bfb8a6"/><path d="M4.8 11.5C3 10 2.4 7.5 2.8 5c1.2 2.2 2.6 3.6 4 4.2M19.2 11.5c1.8-1.5 2.4-4 2-6.5-1.2 2.2-2.6 3.6-4 4.2" fill="#d6cfb8"/><path d="M5 14.5h14" stroke="#8e8878" stroke-width="1.2"/>',
  bplate: '<path d="M7.5 3.5L3.5 6.5v8.5c2 3 5 5 8.5 5.5 3.5-.5 6.5-2.5 8.5-5.5V6.5l-4-3c-.4 1.8-2.2 3-4.5 3s-4.1-1.2-4.5-3z" fill="#6e6a3e"/><path d="M12 8.5l3 2.2v3.6l-3 2.2-3-2.2v-3.6z" fill="#8a865a"/><g stroke="#e2dccb" stroke-width="1.5" stroke-linecap="round"><path d="M4 9.5l3 .8M4 12.5l3 .4M20 9.5l-3 .8M20 12.5l-3 .4"/></g><circle cx="5.5" cy="5.8" r="1.5" fill="#e2dccb"/><circle cx="18.5" cy="5.8" r="1.5" fill="#e2dccb"/>',
  bgreave: '<g fill="#e2dccb"><path d="M5 4h3.2l.4 15H4.6z"/><path d="M15.8 4H19l.4 15h-4z"/></g><g fill="#bfb8a6"><ellipse cx="6.6" cy="5" rx="2.6" ry="1.8"/><ellipse cx="17.6" cy="5" rx="2.6" ry="1.8"/></g><path d="M4.4 10.5h4.4M4.4 15h4.4M15.4 10.5h4.4M15.4 15h4.4" stroke="#6e5235" stroke-width="1.2"/><path d="M4 19.5h5.2l.6 1.8H3.4zM15 19.5h5.2l.6 1.8H14.4z" fill="#7a5a3a"/>',
  cloak: '<path d="M12 3c-3 0-5 2.2-5.4 5L3.5 20.5h17L17.4 8C17 5.2 15 3 12 3z" fill="#5e7a3a"/><path d="M9 9.5c.6-2 1.7-3 3-3s2.4 1 3 3l-1.2 5H10.2z" fill="#2e2a20"/><g fill="#7a9a4a"><path d="M5 16l2.5-1 .5 2.6z"/><path d="M16 15l2.6 1-2 1.8z"/><path d="M10.5 18l2-1.6 1.4 2.2z"/><path d="M7.5 11l2-.4-.8 2z"/></g><g fill="#8a7a3a"><path d="M14 11.5l2 .8-1.8 1.2z"/><path d="M6 19l1.8-.9.3 1.9z"/></g>',
});

// ---------------- what it does: armour from the body slot too, and how far things notice you ----------------
{ const gf = dayGearFx; dayGearFx = function () {
    const D = S.day, rg = S.rg, pre = steelMax(), preS = rg.steel || 0;
    gf.apply(this, arguments);
    const body = D && D.gear.body && DIT[D.gear.body.id];
    if (!body || !body.arm || !XS || !XS.arm) return;   // the original only counted helmets and leggings: a breastplate's armour counts as well
    const arm = (XS.arm.steel || 0) + body.arm; XS.arm.steel = arm;
    rg.steel = arm > pre ? Math.min(arm, preS + (arm - pre)) : Math.min(preS, arm); D.steelSeen = rg.steel;
  }; }
function gearSense() {   // [how far things see you, how far things hear you], as a share of the usual
  const D = S && S.day; let see = 1, hear = 1; if (!D || !D.gear) return [1, 1];
  for (const k of ['head', 'body', 'legs']) { const s = D.gear[k], T = s && DIT[s.id]; if (!T) continue; if (T.hush) { see *= T.hush; hear *= 0.85; } if (T.loud) hear *= T.loud; }
  return [see, hear];
}
const SENSE0 = { beast: Object.fromEntries(Object.entries(BEAST).map(([k, B]) => [k, B.scare])), clan: CL.notice,
  ear: { sneak: PALE_EAR.sneak.slice(), walk: PALE_EAR.walk.slice(), sprint: PALE_EAR.sprint, swing: PALE_EAR.swing } };
let senseK = '';
function senseApply() {
  const [see, hear] = gearSense(), k = see + ':' + hear; if (k === senseK) return; senseK = k;
  for (const b in SENSE0.beast) if (BEAST[b]) BEAST[b].scare = SENSE0.beast[b] * see;
  CL.notice = SENSE0.clan * see;
  PALE_EAR.sneak = [SENSE0.ear.sneak[0] * hear, SENSE0.ear.sneak[1] * hear]; PALE_EAR.walk = [SENSE0.ear.walk[0] * hear, SENSE0.ear.walk[1] * hear];
  PALE_EAR.sprint = SENSE0.ear.sprint * hear; PALE_EAR.swing = SENSE0.ear.swing * hear;
}
{ const ws = workStep; workStep = function (dt) { senseApply(); return ws(dt); }; }

// ---------------- what it looks like on you ----------------
const ARM_COL = { bone: [226, 219, 200], boneD: [186, 178, 158], boneE: [150, 142, 124], shell: [112, 106, 62], shellD: [82, 78, 46], shellL: [138, 132, 84],
  leaf: [94, 122, 58], leafD: [70, 96, 46], leafL: [122, 150, 74], leafB: [128, 112, 60] };
function armourExtra(ids) {
  return ({ tube, lump, one, R, C }) => {
    const A = ARM_COL, c = k => () => A[k], S2 = s => s > 0 ? 'R' : 'L';
    if (ids.head === 'bhelm') {
      lump([0, 38.1, -0.1], [4.5, 4.5, 4.55], one('cap'), c('bone'), 18, 10, Math.PI * 0.52);
      tube([0, 39.1, -0.1], [0, 37.9, -0.1], () => [4.68, 4.7], one('cap'), (x, y, z) => Math.cos(Math.atan2(x, z) * 9) > 0.55 ? A.boneE : A.boneD, 2, 36);   // the lashed brow band
      lump([0, 41.9, -0.5], [0.75, 1.2, 3.6], one('cap'), c('boneD'), 8, 6);   // a ridge over the crown
      lump([0, 37.5, 4.5], [0.55, 1.3, 0.45], one('cap'), c('bone'), 6, 6);     // the nose guard
      for (const s of [-1, 1]) {
        tube([s * 4.1, 39.4, 0.6], [s * 5.6, 43.4, 1.5], t => [0.75 * (1 - t * 0.8), 0.75 * (1 - t * 0.8)], one('cap'), c('bone'), 5, 8);   // boar tusks for horns
        lump([s * 3.9, 36.6, -0.6], [0.75, 2.2, 1.9], one('head'), c('boneD'), 8, 6);   // guards over the ears
      }
    }
    if (ids.body === 'bplate') {
      const bw = (x, y) => { const k = smooth(clamp((y - 21) / 4, 0, 1)); return [['spine', 1 - k], ['chest', k]]; };
      lump([0, 25.4, 2.7], [4.7, 5.4, 2.2], bw, c('shell'), 16, 12);   // the shell, worn as a breastplate
      lump([0, 26.4, 4.55], [1.7, 1.9, 0.45], bw, c('shellL'), 8, 6);
      for (const [x, y] of [[-2.5, 28.2], [2.5, 28.2], [-2.6, 24.2], [2.6, 24.2], [0, 22.6]]) lump([x, y, 4.15], [1.25, 1.35, 0.4], bw, c('shellD'), 8, 6);   // its plates
      for (const s of [-1, 1]) {
        for (const y of [22.6, 24.8, 27]) tube([s * 3.9, y, 3.2], [s * 5.5, y + 0.5, 0.2], () => [0.55, 0.5], bw, c('bone'), 3, 6);   // bone ribs round the flanks
        lump([s * 5.9, 30.1, 0], [3.0, 1.75, 3.0], (x, y) => [['chest', 0.55], ['arm' + S2(s), 0.45]], c('bone'), 12, 8, Math.PI * 0.55);   // shoulder caps
        lump([s * 6.4, 30.6, 0], [1.1, 0.7, 1.1], (x, y) => [['chest', 0.5], ['arm' + S2(s), 0.5]], c('boneD'), 6, 4);
      }
    }
    if (ids.legs === 'bgreave') {
      for (const s of [-1, 1]) {
        const S = S2(s), kn = R['shin' + S], an = R['foot' + S], hp = R['leg' + S];
        for (const dx of [-0.75, 0.75]) tube([an[0] + dx, kn[1] - 0.4, 2.15], [an[0] + dx * 0.9, an[1] + 3.8, 2.4], () => [0.6, 0.5], one('shin' + S), c('bone'), 4, 6);   // splints down the shin
        lump([kn[0], kn[1] + 0.2, 2.0], [1.6, 1.5, 1.05], one('shin' + S), c('boneD'), 10, 8);   // the knee cap
        lump([hp[0], hp[1] - 4.6, 2.0], [1.8, 2.7, 0.85], one('leg' + S), c('bone'), 10, 8);   // a plate down the thigh
        for (const y of [kn[1] - 1.6, an[1] + 5.1]) tube([an[0], y + 0.3, 0.15], [an[0], y - 0.3, 0.15], () => [2.42, 2.48], one('shin' + S), () => C.strap, 1, 14);   // lashed on
      }
    }
    if (ids.body === 'cloak') {
      // a capelet of leaves and grass over the shoulders and down the back, its hem ragged with leaves, and a leafy hood
      const cw = (x, y) => { const k = smooth(clamp((y - 22) / 5, 0, 1)); return [['spine', 1 - k], ['chest', k]]; };
      const patch = (x, y, z) => { const h = hash(Math.floor(x / 1.6) * 3.1 + Math.floor(z / 1.6) * 1.7, Math.floor(y / 1.6) * 2.3); return h < 0.3 ? A.leafD : h < 0.66 ? A.leaf : h < 0.9 ? A.leafL : A.leafB; };
      tube([0, 32.6, -0.4], [0, 21.0, -1.0], t => { const k = smooth(Math.min(1, t * 3.2)); return [lerp(3.3, 8.7, k) - t * 0.6, lerp(3.1, 6.3, k) - t * 0.2]; }, cw, patch, 16, 20);
      for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, y = 21.6 + (i % 2) * 0.6; lump([Math.sin(a) * 8.1, y, Math.cos(a) * 6.1 - 1.0], [1.3, 1.8, 1.3], cw, patch, 6, 5); }   // the ragged hem
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.3, y = 23.8 + (i % 3) * 1.9; lump([Math.sin(a) * 8.5, y, Math.cos(a) * 6.4 - 0.9], [1.2, 1.5, 1.2], cw, patch, 6, 5); }   // leaves stuck through it
      if (ids.head !== 'bhelm') {
        lump([0, 37.8, -0.7], [4.75, 4.9, 4.85], one('head'), patch, 16, 10, Math.PI * 0.5);   // the hood over the crown
        lump([0, 35.6, -1.7], [4.7, 4.6, 3.7], one('head'), patch, 14, 10);                  // and down round the back and the ears
        tube([0, 38.0, -0.7], [0, 37.2, -0.7], () => [4.95, 5.0], one('head'), patch, 2, 18);   // its rim
        for (const [x, y, z] of [[0, 40.6, -4.2], [3.9, 38.6, -2.6], [-4.0, 38.4, -2.2], [2.2, 35.4, -4.6], [-2.4, 35.2, -4.5]]) lump([x, y, z], [1.2, 1.4, 1.2], one('head'), patch, 6, 5);
      }
    }
  };
}
let armLookKey = 'none';
function armourLook() {
  const D = S && S.day, g = D && D.gear, ids = { head: g && g.head ? g.head.id : '', body: g && g.body ? g.body.id : '', legs: g && g.legs ? g.legs.id : '' };
  const shows = ids.head === 'bhelm' || ids.body === 'bplate' || ids.body === 'cloak' || ids.legs === 'bgreave';
  const key = shows ? ids.head + '|' + ids.body + '|' + ids.legs : '';
  if (key === armLookKey) return; armLookKey = key;
  const geo = buildBody(shows ? { cap: !(ids.head === 'bhelm' || ids.body === 'cloak'), extra: armourExtra(ids) } : {});
  const old = BODY.mesh.geometry; BODY.mesh.geometry = geo; BODY.edge.geometry = geo; old.dispose();
}
{ const tf = thingsFrame; thingsFrame = function (now) { const r = tf(now); try { armourLook(); } catch (e) { console.error(e); } return r; }; }
