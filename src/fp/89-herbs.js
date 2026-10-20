// ================= healing plants, and the mixes you make from them (Joe's number 7) =================
// Four herbs grow wild, each in its own kind of place, in little patches of two to four:
//   yarrow      flat white heads in the open meadows · chew it on a wound and the bleeding stops
//   aloe        a rosette of thick spiky leaves on sunny ground, by the rocks and up the beach · heals a little
//   coneflower  pink-purple daisies round a dark cone, at the edges of the woods · eases sickness
//   chicory     sky-blue flowers on wiry stems out in the open · a little energy
// Walk up and press E to pick one. It grows back after a couple of days. Mash two together, in your hands:
//   Health mix  aloe + yarrow            heals a heart and a half, stops bleeding
//   Energy mix  coneflower + chicory     stamina full, and for a while it hardly drains · cures sickness
//   Herb poultice  yarrow ×2 + fibre ×2  a better bandage: stops bleeding, heals a whole heart
Object.assign(DIT, {
  yarrow: { n: 'Yarrow', c: '#ece6d2', st: 12, k: 'food', eat: { food: 1 }, herb: { stanch: 1 }, b: 'Flat white heads in open meadows · chew it on a wound and the bleeding stops' },
  aloe: { n: 'Aloe', c: '#7a9a6a', st: 12, k: 'food', eat: { food: 1, water: 4 }, herb: { heal: 0.25 }, b: 'Thick spiky leaves on sunny ground, by rocks and up the beach · soothing, heals a little' },
  coneflower: { n: 'Coneflower', c: '#c46aa8', st: 12, k: 'food', eat: { food: 1 }, herb: { ease: 1 }, b: 'Pink-purple, at the edges of the woods · eases sickness' },
  chicory: { n: 'Chicory', c: '#7ea6e0', st: 12, k: 'food', eat: { food: 2 }, herb: { st: 30 }, b: 'Sky-blue flowers on wiry stems, out in the open · a little energy' },
  hmix: { n: 'Health mix', c: '#c8504a', st: 6, k: 'food', eat: { food: 2, water: 8 }, herb: { heal: 1.5, stanch: 1 }, b: 'Aloe and yarrow mashed together · heals a heart and a half, and stops bleeding' },
  emix: { n: 'Energy mix', c: '#e0b040', st: 6, k: 'food', eat: { food: 2, water: 8 }, herb: { st: STA_MAX, buff: 150, cure: 1 }, b: 'Coneflower and chicory · stamina full, and for a while it hardly drains · cures sickness' },
  poultice: { n: 'Herb poultice', c: '#a8b86a', st: 6, k: 'med', b: 'Yarrow bound up in fibre · stops bleeding, heals a whole heart' },
});
DREC.push(
  { id: 'hmix', g: 'use', out: 'hmix', at: 'hand', cost: { aloe: 1, yarrow: 1 } },
  { id: 'emix', g: 'use', out: 'emix', at: 'hand', cost: { coneflower: 1, chicory: 1 } },
  { id: 'poultice', g: 'use', out: 'poultice', at: 'hand', cost: { yarrow: 2, fibre: 2 } },
);
Object.assign(ICON, {
  yarrow: '<path d="M12 22V9M12 15l-4-5M12 13l4-4" stroke="#6a8040" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M6 21c1.5-2.5 3.5-3 6-3M18 21c-1.5-2.5-3.5-3-6-3" stroke="#5f7a3a" stroke-width="1.3" fill="none"/><g fill="#ece6d2"><ellipse cx="12" cy="7.5" rx="5" ry="2.4"/><ellipse cx="7" cy="9" rx="3" ry="1.6"/><ellipse cx="16.5" cy="8" rx="3" ry="1.6"/></g><g fill="#cfc6a8"><circle cx="10.5" cy="7" r=".7"/><circle cx="13.5" cy="7.6" r=".7"/><circle cx="7" cy="8.6" r=".6"/><circle cx="16.4" cy="7.6" r=".6"/></g>',
  aloe: '<g fill="#7a9a6a"><path d="M12 21c-1-5-1-11 0-17 1 6 1 12 0 17z"/><path d="M11 21c-3-3-5.5-7-7-12 3.5 3.5 6 7.5 7 12z"/><path d="M13 21c3-3 5.5-7 7-12-3.5 3.5-6 7.5-7 12z"/></g><g fill="#5f7d52"><path d="M10.5 21.5C7 20 4 18 2 15.5c3.5.8 6.5 2.8 8.5 6z"/><path d="M13.5 21.5c3.5-1.5 6.5-3.5 8.5-6-3.5.8-6.5 2.8-8.5 6z"/></g><g fill="#d6e2c4"><circle cx="12" cy="12" r=".6"/><circle cx="7.6" cy="13" r=".5"/><circle cx="16.4" cy="13" r=".5"/></g>',
  coneflower: '<path d="M12 22V12" stroke="#5f7a3a" stroke-width="1.4"/><path d="M12 19c-2-1-4-1-5.5 0 1.5-2.4 3.6-2.6 5.5 0z" fill="#5f7a3a"/><g fill="#c46aa8"><path d="M12 10l-7 3.2 1.2-2.6z"/><path d="M12 10l7 3.2-1.2-2.6z"/><path d="M12 10l-5 5 .4-3z"/><path d="M12 10l5 5-.4-3z"/><path d="M12 10l-7.5.5 2.5-2z"/><path d="M12 10l7.5.5-2.5-2z"/></g><path d="M9 10.5c0-3 1.4-5.5 3-5.5s3 2.5 3 5.5z" fill="#7a3e1e"/>',
  chicory: '<path d="M12 22V5M12 12l4.5-4M12 16l-4.5-3" stroke="#6a8040" stroke-width="1.2" fill="none"/><g fill="#7ea6e0"><circle cx="12" cy="5" r="3.2"/><circle cx="17" cy="7.5" r="2.6"/><circle cx="7" cy="12.5" r="2.6"/></g><g fill="#3e5a9a"><circle cx="12" cy="5" r=".9"/><circle cx="17" cy="7.5" r=".7"/><circle cx="7" cy="12.5" r=".7"/></g>',
  hmix: '<path d="M4.5 11h15c0 5-3.4 8.5-7.5 8.5S4.5 16 4.5 11z" fill="#8a6440"/><path d="M5 11.2c.8-1.2 3.6-2 7-2s6.2.8 7 2c-.8 1-3.6 1.6-7 1.6S5.8 12.2 5 11.2z" fill="#c8504a"/><path d="M14 9.5l5-6" stroke="#cfc6a8" stroke-width="2" stroke-linecap="round"/><g fill="#7a9a6a"><path d="M8 10.5l-2-4 3 3z"/></g><g fill="#ece6d2"><circle cx="10" cy="10.6" r=".8"/></g>',
  emix: '<path d="M4.5 11h15c0 5-3.4 8.5-7.5 8.5S4.5 16 4.5 11z" fill="#8a6440"/><path d="M5 11.2c.8-1.2 3.6-2 7-2s6.2.8 7 2c-.8 1-3.6 1.6-7 1.6S5.8 12.2 5 11.2z" fill="#e0b040"/><path d="M14 9.5l5-6" stroke="#cfc6a8" stroke-width="2" stroke-linecap="round"/><circle cx="8.5" cy="10.4" r="1.1" fill="#7ea6e0"/><circle cx="11" cy="10.8" r="1" fill="#c46aa8"/>',
  poultice: '<rect x="3" y="8.5" width="18" height="7.5" rx="3.4" fill="#cfc29a" transform="rotate(-20 12 12)"/><rect x="8" y="8.5" width="8" height="7.5" rx="1.6" fill="#8aa05a" transform="rotate(-20 12 12)"/><g stroke="#a8986a" stroke-width=".9"><path d="M6 15l2.5-7M17.5 11l-2.4 6.8" /></g><circle cx="12" cy="12" r="1.3" fill="#ece6d2"/>',
});
Object.assign(MAT_GET, { yarrow: 'pick it in open meadows', aloe: 'pick it on sunny ground, by rocks and on the beach', coneflower: 'pick it at the edges of the woods', chicory: 'pick it out in the open' });
BOOK.splice(BOOK.findIndex(b => b.id === 'made'), 0, { id: 'herbs', n: 'Herbs and mixes', icon: 'yarrow', blurb: 'Picked wild with E, each in its own kind of place. They grow back. Mash two together for something stronger.', items: ['yarrow', 'aloe', 'coneflower', 'chicory', 'hmix', 'emix', 'poultice'] });
{ const sh = DIT.shell; if (sh) sh.b = 'Hard and light · plates for bone armour'; }

// ---------------- where they grow ----------------
const HERB = { C: 480, R: 520, regrow: DAY_LEN * 2, reach: 34, ch: new Map() };
const HERB_KINDS = ['yarrow', 'aloe', 'coneflower', 'chicory'];
function herbNear(x, y, R, kinds) { let d = 1e9; for (const o of propsNear(x, y, R)) if (kinds.includes(o.kind)) d = Math.min(d, Math.hypot(o.x - x, o.y - y) - (o.r || 8) * (o.s || 1) * 0.5); return d; }
function herbKind(x, y, h) {   // what grows here, if anything: from how open it is, the rocks and the sea
  if (inPlaza(x, y) || (!NO_CAMP && Math.hypot(x, y) < CAMP_R + 80) || x > CAVE_X0 - 500) return null;
  const s = BEACH ? coastS(x, y) : -9999; if (s > -70) return null;
  if (s > -280) return h < 0.75 ? 'aloe' : 'chicory';   // sandy and sunny, up from the sea
  const dT = herbNear(x, y, 150, ['tree']), dR = herbNear(x, y, 110, ['rock', 'rockIron', 'crag']);
  if (dR < 70 && dT > 50) return h < 0.6 ? 'aloe' : 'yarrow';   // warm stone, in the sun
  if (dT > 80) return h < 0.55 ? 'yarrow' : 'chicory';          // out in the open
  if (dT > 30) return h < 0.7 ? 'coneflower' : 'yarrow';       // the edge of the woods
  return h < 0.35 ? 'coneflower' : null;                        // under the trees, now and then
}
function herbSpot(x, y) {
  if (fishWater(x, y) || pondAt(x, y, 10) || inPlaza(x, y)) return false;
  if (BEACH && coastS(x, y) > -70) return false;
  return !propsNear(x, y, 40).some(o => (o.kind === 'tree' || o.kind === 'rock' || o.kind === 'rockIron' || o.kind === 'crag') && Math.hypot(o.x - x, o.y - y) < (o.r || 8) * (o.s || 1) * 0.6 + 7);
}
function herbChunk(ci, cj) {   // the same patches every run, worked out from where they are
  const key = ci + ',' + cj; let L = HERB.ch.get(key); if (L) return L;
  L = []; HERB.ch.set(key, L);
  for (let k = 0; k < 3; k++) {
    if (hash(ci * 3.1 + k * 17.3, cj * 5.7 - k * 11.1) > 0.44) continue;
    const x = (ci + 0.08 + 0.84 * hash(ci + k * 9.1, cj * 1.3 + 4.4)) * HERB.C, y = (cj + 0.08 + 0.84 * hash(ci * 2.2 + 7.7, cj + k * 3.3)) * HERB.C;
    const kind = herbKind(x, y, hash(ci + k * 0.7, cj - k * 1.9)); if (!kind) continue;
    const n = 2 + Math.floor(hash(x * 0.01, y * 0.01) * 3);
    for (let i = 0; i < n; i++) {
      const a = hash(x * 0.01 + i, y * 0.01) * 6.283, r = i ? 6 + hash(x * 0.01, y * 0.01 + i) * 16 : 0, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (!herbSpot(px, py)) continue;
      L.push({ kind: 'dherb', k: kind, x: px, y: py, id: key + ':' + k + ':' + i, pt: key + ':' + k, sd: hash(px * 0.37, py * 0.53), r: 0, s: 1 });
    }
  }
  return L;
}
const herbTaken = o => { const D = S.day, t = D && D.herbs && D.herbs[o.id]; return t !== undefined && D.t - t < HERB.regrow; };
function herbsNear(x, y, R) {
  const out = []; if (!S.day || caveIn()) return out;
  for (let ci = Math.floor((x - R) / HERB.C); ci <= Math.floor((x + R) / HERB.C); ci++)
    for (let cj = Math.floor((y - R) / HERB.C); cj <= Math.floor((y + R) / HERB.C); cj++)
      for (const o of herbChunk(ci, cj)) if (Math.abs(o.x - x) < R && Math.abs(o.y - y) < R && !herbTaken(o)) out.push(o);
  return out;
}
const herbBuilt = o => S.day.builds.some(B => B.parts.some(q => Math.hypot(q.x - o.x, q.y - o.y) < (q.r || 8) + 4)) || stNear(o.x, o.y, 2).some(q => Math.hypot(q.x - o.x, q.y - o.y) < GRID * 0.6);

// ---------------- what they look like ----------------
// built from the low balls (P_LEAF, P_BEAD): a plant of full ones was as heavy as a hut
function herbKit(K0, o) {
  let K;
  const x = o.x, y = o.y, sd = o.sd, r0 = sd * 6.283, R = (i, j = 0) => hash(sd * 91 + i * 7.3, j * 3.1 + sd * 17);
  const sc = { yarrow: 0.82, aloe: 0.8, coneflower: 0.8, chicory: 0.8 }[o.k] || 1;   // every part scaled in about the plant's foot
  const P = (a, d) => [x + Math.cos(a) * d, y + Math.sin(a) * d];
  const sx_ = v => x + (v - x) * sc, sy_ = v => y + (v - y) * sc;
  K = { add: (g, px, h, py, a, b, c, col, yaw = 0, pitch = 0, roll = 0) => K0.add(g, sx_(px), h * sc, sy_(py), a * sc, b * sc, c * sc, col, yaw, pitch, roll),
        rod: (g, ax, ah, ay, bx, bh, by, r, col) => K0.rod(g, sx_(ax), ah * sc, sy_(ay), sx_(bx), bh * sc, sy_(by), r * sc, col) };
  const rod = (ax, ah, ay, bx, bh, by, r, col) => K.rod(P_CYL(4), ax, ah, ay, bx, bh, by, r, col);
  const leafC = hex('#5f7a3a'), leafD = hex('#4e6a32'), stemC = hex('#6a8040');
  const leaf = (a, d, h, len, w, col, droop = 0.25) => { const [lx, ly] = P(a, d); K.add(P_LEAF(), lx, h, ly, len, Math.max(0.8, w * 0.35), w, col, -a, 0, -droop); };
  if (o.k === 'yarrow') {
    for (let i = 0; i < 5; i++) leaf(r0 + i * 1.3, 3.2, 1, 7, 1.6, i % 2 ? leafC : leafD, 0.2);   // the feathery leaves at its foot
    const n = 2 + (R(1) < 0.6 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const a = r0 + i * 2.1, [bx, by] = P(a, 1.2), [tx, ty] = P(a, 2.4 + R(i, 2) * 2), h = 11 + R(i, 3) * 4;
      rod(bx, 0, by, tx, h, ty, 0.32, stemC);
      { const [mx, my] = P(a + 0.5, 1.6); K.add(P_LEAF(), mx, h * 0.5, my, 3.4, 0.9, 1.3, leafC, -a - 0.5, 0, -0.5); }
      K.add(P_LEAF(), tx, h + 0.3, ty, 4.4, 1.5, 4.4, hex('#ece6d2'));   // the flat head of little flowers
      for (let k = 0; k < 6; k++) { const t = k / 6 * 6.283 + sd, px = tx + Math.cos(t) * 1.6, py = ty + Math.sin(t) * 1.6; K.add(P_BEAD(), px, h + 0.7 + (k % 2) * 0.25, py, 1.4, 1.1, 1.4, hex(k % 2 ? '#f4efe0' : '#dcd4bc')); }
    }
  } else if (o.k === 'aloe') {
    // a rosette of fat spikes: the inner ones near upright, the outer spread low
    const outer = hex('#6a8a5a'), inner = hex('#86a676'), N = 11;
    for (let i = 0; i < N; i++) {
      const a = r0 + i / N * 6.283 + (i % 2) * 0.2, ring = i % 3, tilt = [0.95, 0.6, 0.28][ring], len = [7.4, 9, 10][ring], wd = [2.6, 2.4, 2.1][ring];
      const [px, py] = P(a, [1.6, 1, 0.4][ring]); K.add(P_CONE(5), px, 0.2, py, wd, len, wd * 0.62, ring === 2 ? inner : ring ? hex('#7a9a6a') : outer, -a, 0, -tilt);
    }
    K.add(P_LEAF(), x, 1, y, 4, 2.2, 4, outer);
    if (R(5) < 0.45) {   // in flower: a tall stalk hung with orange tubes
      const [tx, ty] = P(r0 + 1, 1.4); rod(x, 1, y, tx, 17, ty, 0.36, hex('#7a8a52'));
      for (let k = 0; k < 6; k++) { const t = k / 6 * 6.283, hh = 13.6 + (k % 3) * 1.2; K.add(P_CONE(4), tx + Math.cos(t) * 0.9, hh + 1.6, ty + Math.sin(t) * 0.9, 0.9, -2.2, 0.9, hex(k % 2 ? '#e0703a' : '#f0a040')); }
    }
  } else if (o.k === 'coneflower') {
    for (let i = 0; i < 4; i++) leaf(r0 + i * 1.6, 3.4, 1.2, 7.4, 2.2, i % 2 ? leafC : leafD, 0.15);
    const n = 2 + (R(1) < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const a = r0 + i * 2.3 + 0.4, [bx, by] = P(a, 1), [tx, ty] = P(a, 2.2 + R(i, 2) * 2.4), h = 13 + R(i, 3) * 4;
      rod(bx, 0, by, tx, h, ty, 0.34, stemC);
      { const [mx, my] = P(a - 0.4, 1.8); K.add(P_LEAF(), mx, h * 0.45, my, 4.2, 1, 1.6, leafC, -a + 0.4, 0, -0.35); }
      for (let k = 0; k < 11; k++) {   // the petals, drooping back off the cone
        const t = k / 11 * 6.283 + sd * 3, px = tx + Math.cos(t) * 1.6, py = ty + Math.sin(t) * 1.6;
        K.add(P_BEAD(), px, h - 0.4, py, 2.7, 0.6, 1.1, hex(k % 2 ? '#c46aa8' : '#b45a98'), -t, 0, -0.5);
      }
      K.add(P_BEAD(), tx, h + 0.2, ty, 2.1, 1.4, 2.1, hex('#6a3418'));
      K.add(P_CONE(6), tx, h + 0.4, ty, 2, 1.9, 2, hex('#8a4a22'));
    }
  } else {   // chicory: two or three wiry stems, branching, with blue flowers along the top
    for (let i = 0; i < 5; i++) leaf(r0 + i * 1.25, 3, 0.9, 6.4, 1.8, i % 2 ? leafC : leafD, 0.1);
    const n = 2 + (R(1) < 0.5 ? 1 : 0), blue = [hex('#7ea6e0'), hex('#6e96d8'), hex('#92b6ea')];
    for (let i = 0; i < n; i++) {
      const a = r0 + i * 2.2, [bx, by] = P(a, 0.8), [tx, ty] = P(a, 2 + R(i, 2) * 3), h = 15 + R(i, 3) * 5;
      rod(bx, 0, by, tx, h, ty, 0.26, stemC);
      const [cx, cy] = P(a + 0.9, 4.4 + R(i, 4) * 2), hb = h * 0.62, [sx, sy] = P(a, 1.2 + R(i, 2) * 1.6);
      rod(sx, hb, sy, cx, h * 0.86, cy, 0.22, stemC);   // a side branch
      const fl = [[tx, h, ty], [cx, h * 0.86, cy], [(sx + tx) / 2, h * 0.78, (sy + ty) / 2]];
      fl.forEach(([fx, fh, fy], k) => {
        const t = a + k * 1.9 + sd;
        K.add(P_LEAF(), fx, fh + 0.2, fy, 2.5, 1, 2.5, blue[(i + k) % 3], -t, 0, -0.55);
        K.add(P_BEAD(), fx + Math.cos(t) * 0.3, fh + 0.55, fy + Math.sin(t) * 0.3, 0.7, 0.7, 0.7, hex('#3e5a9a'));
      });
    }
  }
}
// Each patch is its own small batch, shown while it's within HERB.R and hidden past it, so walking only shows and hides them;
// one is redone (from its plants' packs: each plant is put together once, a couple a frame as it comes near, and kept with
// Kit.take) only when a plant in it is picked or grows back or something's built. Before, every herb in reach was put together
// again from scratch every few steps you took, a hitch of a tenth of a second and more in a meadow.
const HERB_PATCH = new Map(), HERB_SHOWN = new Set(), HERB_MESHED = new Set(), HERB_PACKED = new Set();
function herbPack(o) { if (!o.pack) { const K = new Kit(); herbKit(K, o); o.pack = K.take(); HERB_PACKED.add(o); } return o.pack; }
function herbPatches(ci, cj) {   // a chunk's plants by patch: { L, x, y, km, key }
  const key = ci + ',' + cj; let P = HERB_PATCH.get(key); if (P) return P;
  const by = new Map(); for (const o of herbChunk(ci, cj)) { let q = by.get(o.pt); if (!q) by.set(o.pt, q = { L: [], x: o.x, y: o.y, km: null, key: '' }); q.L.push(o); }
  HERB_PATCH.set(key, P = [...by.values()]); return P;
}
function herbHide() { for (const q of HERB_SHOWN) q.km.visible = false; HERB_SHOWN.clear(); }
function herbSync() {
  const D = S && S.day, p = S && S.p;
  if (!D || !p || ARENA || caveIn()) { herbHide(); return; }
  const R = HERB.R, C = HERB.C, far = R + 320, gen = D.builds.length + ':' + D.bld.size, t0 = performance.now(), on = new Set();
  let made = 0;
  for (let ci = Math.floor((p.x - far) / C); ci <= Math.floor((p.x + far) / C); ci++)
    for (let cj = Math.floor((p.y - far) / C); cj <= Math.floor((p.y + far) / C); cj++)
      for (const q of herbPatches(ci, cj)) {
        const d = Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y));
        if (d > far) continue;
        if (d > R) { for (const o of q.L) if (!o.pack && performance.now() - t0 < 1.5) herbPack(o); continue; }   // coming up: its plants, while there's time this frame
        let n = 0; for (const o of q.L) if (!herbTaken(o)) n++;
        const key = n + ':' + gen;
        if (q.key !== key) {
          if (made && d > R - 160 && q.L.some(o => !o.pack)) continue;   // out at the edge, still to put together: next frame
          const K = new Kit(); for (const o of q.L) if (!herbTaken(o) && !herbBuilt(o)) K.chunk(herbPack(o));
          if (!q.km) { q.km = new KitMesh(true); HERB_MESHED.add(q); }
          q.km.set(K); q.key = key; made++;
        }
        on.add(q);
      }
  for (const q of HERB_SHOWN) if (!on.has(q)) q.km.visible = false;
  for (const q of on) q.km.visible = true;
  HERB_SHOWN.clear(); for (const q of on) HERB_SHOWN.add(q);
  if (made) {   // well behind you: let their batches and packs go
    for (const q of HERB_MESHED) if (Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y)) > far + 600) { scene.remove(q.km.mesh); scene.remove(q.km.edge); q.km.mesh.geometry.dispose(); q.km = null; q.key = ''; HERB_MESHED.delete(q); }
    for (const o of HERB_PACKED) if (Math.max(Math.abs(o.x - p.x), Math.abs(o.y - p.y)) > far + 600) { o.pack = null; HERB_PACKED.delete(o); }
  }
}
{ const tf = thingsFrame; thingsFrame = function (now) { const r = tf(now); try { herbSync(); } catch (e) { console.error(e); } return r; }; }

// ---------------- picking one ----------------
function herbAimed() {   // the nearest one in reach, in front of you
  const p = S.p; let best = null, bd = HERB.reach;
  for (const o of herbsNear(p.x, p.y, 70)) { const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < bd && !herbBuilt(o)) { bd = d; best = o; } }
  return best ? { o: best, d: bd } : null;
}
{ const ut = dayUseTarget; dayUseTarget = function () {
    const best = ut(), D = S.day; if (!D) return best;
    const h = herbAimed(); if (!h) return best;
    if (best && Math.hypot(best.x - S.p.x, best.y - S.p.y) - (best.t === 'chest' ? 12 : 0) < h.d) return best;
    return h.o;
  }; }
function herbPick(o) {
  const D = S.day; D.herbs = D.herbs || {};
  if (dayRoom(o.k) <= 0) { dayNote('full', 'pack full', 1); return; }
  dayAct(7, 0.42); S.p.vx *= 0.3; S.p.vy *= 0.3;
  D.herbs[o.id] = D.t;
  const n = 1 + (o.sd < 0.35 ? 1 : 0); dayGive(o.k, n, o.x, o.y, true);
  exNote(`picked ${DIT[o.k].n.toLowerCase()}${n > 1 ? ' ×' + n : ''}`);
  dayChips(o.x, o.y, 8, o.k === 'aloe' ? 'leaf' : 'petal', 6);
  pickSnd(); if (actx) noiseAt(actx.currentTime, 2600, 900, 0.14, 0.12, sfxGain);
  dayChanged();
}
{ const du = dayUse; dayUse = function () {
    const D = S.day, rg = S.rg;
    if (D && rg && rg.phase === 'fight' && S.running) { const o = dayUseTarget(); if (o && o.kind === 'dherb') { herbPick(o); return; } }
    return du.apply(this, arguments);
  }; }

// ---------------- what they do ----------------
function herbFx(id) {
  const D = S.day, rg = S.rg, H = DIT[id] && DIT[id].herb; if (!H) return;
  if (H.heal && rg.hp < rg.maxHp) { rg.hp = Math.min(rg.maxHp, rg.hp + H.heal); rg.pop = { t: 0, gained: Math.ceil(rg.hp) - 1 }; }
  if (H.stanch && D.bleed > 0) { D.bleed = 0; D.bleedT = 0; exNote('the bleeding stops', true); }
  if (H.cure && D.sick > 0) { D.sick = 0; exNote('the sickness passes', true); }
  else if (H.ease && D.sick > 0) { D.sick *= 0.4; exNote('the sickness eases'); }
  if (H.st) D.st = Math.min(STA_MAX, D.st + H.st);
  if (H.buff) { D.buffE = D.t + H.buff; exNote('your legs feel light', true); }
}
{ const de = dayEat; dayEat = function (arr, i) {
    const s = arr && arr[i], id = s && s.id, n0 = s ? s.n : 0;
    const r = de.apply(this, arguments);
    if (id && DIT[id].herb && (!arr[i] || arr[i] !== s || s.n < n0)) herbFx(id);
    return r;
  }; }
{ const db = dayBind; dayBind = function (arr, i) {
    const s = arr && arr[i], id = s && s.id, rg = S.rg;
    const r = db.apply(this, arguments);
    if (id === 'poultice' && rg.hp < rg.maxHp) { rg.hp = Math.min(rg.maxHp, rg.hp + 0.5); rg.pop = { t: 0, gained: Math.ceil(rg.hp) - 1 }; }
    return r;
  }; }
const herbBuffed = () => { const D = S && S.day; return !!(D && D.buffE && D.buffE > D.t); };
{ const st = dayStam; dayStam = function (cost) { return st(herbBuffed() ? cost * 0.4 : cost); }; }
{ const ws = workStep; workStep = function (dt) {
    ws(dt); const D = S.day;
    if (herbBuffed()) D.st = Math.min(STA_MAX, D.st + 14 * dt);
    else if (D.buffE) { D.buffE = 0; exNote('the energy mix wears off'); }
  }; }
{ const sv = daySave; daySave = function () {
    const r = sv.apply(this, arguments);
    try { const D = S && S.day; if (D && !ARENA && (D.herbs || D.buffE)) { const k = dayKey(), raw = localStorage.getItem(k); if (raw) { const o = JSON.parse(raw); if (o && o.d) { o.d.herbs = D.herbs || {}; o.d.buffE = D.buffE || 0; localStorage.setItem(k, JSON.stringify(o)); } } } } catch (e) {}
    return r;
  }; }

// ---------------- what it says when you're at one ----------------
{ const dh = drawHud; drawHud = function (...a) {
    const r = dh.apply(this, a), D = S && S.day;
    if (D) {
      const o = dayUseTarget();
      if (o && o.kind === 'dherb') {
        const t = (inputMode === 'kb' ? 'E · ' : inputMode === 'pad' ? 'X · ' : '') + 'PICK ' + DIT[o.k].n.toUpperCase();
        if (hudEl.prompt.textContent !== t) { hudEl.prompt.textContent = t; hudEl.prompt.className = ''; }
        if (useBtn.textContent !== 'Pick') useBtn.textContent = 'Pick';
      } else if (isTrap(o) && useBtn.textContent !== 'Check') useBtn.textContent = 'Check';
      if (herbBuffed() && !hudEl.say.textContent) hudEl.say.textContent = 'ENERGISED';
    }
    return r;
  }; }
