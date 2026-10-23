// ================= Daylight's things: what you gather, what you drop, what you build, the raiders' camps =================
// All of it is the main game's own state (S.day): this only stands it up in 3D in the game's colours.

// ---------------- item pictures: every item's own icon from the pack, painted once into a sheet ----------------
// Dropped things lie on the ground as their picture, standing on their visible bottom edge.
const ISHEET = { W: 2048, H: 2048, meta: {}, ok: {} };
const iconCv = document.createElement('canvas'); iconCv.width = ISHEET.W; iconCv.height = ISHEET.H;
const iconTex = new THREE.CanvasTexture(iconCv);
iconTex.flipY = false; iconTex.colorSpace = THREE.NoColorSpace; iconTex.generateMipmaps = true; iconTex.minFilter = THREE.LinearMipmapLinearFilter; iconTex.anisotropy = MAX_ANISO;
{
  const g = iconCv.getContext('2d', { willReadFrequently: true }), ids = Object.keys(ICON), N = 32, CELL = 64;   // kept in memory, so tracing a picture (extrudeIcon) never waits on the graphics card
  let loadedN = 0;
  ids.forEach((id, i) => {
    const x = (i % N) * CELL, y = Math.floor(i / N) * CELL;
    ISHEET.meta[id] = [[x + 1, y + 1, CELL - 2, CELL - 2, 13, 13, 6.5, 12]];   // 13 across, its foot on the ground
    const img = new Image();
    img.onload = () => { g.drawImage(img, x + 2, y + 2, CELL - 4, CELL - 4); ISHEET.ok[id] = 1; if (++loadedN % 16 === 0 || loadedN === ids.length) iconTex.needsUpdate = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${CELL}" height="${CELL}">${ICON[id]}</svg>`);
  });
}
// ---------------- items as thick cut-outs: the pack's own picture, given depth ----------------
// Each icon is traced at 20×20 and pushed out into a slab: the picture on the front and back, its own colours round the edge.
// It keeps the painted look of the 2D game but turns and catches the light like a solid thing.
const XNN = 20, XSZ = 13, XTH = 1.3, XGEO = new Map();
function extrudeIcon(id) {
  if (XGEO.has(id)) return XGEO.get(id);
  if (!ISHEET.ok[id] || !ISHEET.meta[id]) return null;
  const r = ISHEET.meta[id][0], ox = r[0] + 1, oy = r[1] + 1, A = 60, px = iconCv.getContext('2d').getImageData(ox, oy, A, A).data;
  const on = (i, j) => i >= 0 && j >= 0 && i < XNN && j < XNN && px[((Math.floor((j + 0.5) * A / XNN)) * A + Math.floor((i + 0.5) * A / XNN)) * 4 + 3] > 110;
  const P = [], Nn = [], U = [], SD = [], c = XSZ / XNN, h = XTH / 2;
  const uvAt = (fx, fy) => [(ox + fx * A) / ISHEET.W, (oy + fy * A) / ISHEET.H];   // fx, fy: 0..1 across the picture, from its top left
  const quad = (a, b, cc, d, n, uv, sd) => { for (const v of [a, b, cc, a, cc, d]) { P.push(...v); Nn.push(...n); } for (const q of [uv[0], uv[1], uv[2], uv[0], uv[2], uv[3]]) U.push(...q); for (let k = 0; k < 6; k++) SD.push(sd); };
  const L = -XSZ / 2, R = XSZ / 2;
  quad([L, 0, h], [R, 0, h], [R, XSZ, h], [L, XSZ, h], [0, 0, 1], [uvAt(0, 1), uvAt(1, 1), uvAt(1, 0), uvAt(0, 0)], 1);
  quad([R, 0, -h], [L, 0, -h], [L, XSZ, -h], [R, XSZ, -h], [0, 0, -1], [uvAt(1, 1), uvAt(0, 1), uvAt(0, 0), uvAt(1, 0)], 0.92);
  let any = false, groundY=XSZ;
  for (let j = 0; j < XNN; j++) for (let i = 0; i < XNN; i++) {
    if (!on(i, j)) continue; any = true; groundY=Math.min(groundY,XSZ-(j+1)*c);
    const x0 = L + i * c, x1 = x0 + c, y1 = XSZ - j * c, y0 = y1 - c, m = uvAt((i + 0.5) / XNN, (j + 0.5) / XNN), uv = [m, m, m, m];
    if (!on(i - 1, j)) quad([x0, y0, -h], [x0, y0, h], [x0, y1, h], [x0, y1, -h], [-1, 0, 0], uv, 0.68);
    if (!on(i + 1, j)) quad([x1, y0, h], [x1, y0, -h], [x1, y1, -h], [x1, y1, h], [1, 0, 0], uv, 0.68);
    if (!on(i, j - 1)) quad([x0, y1, h], [x1, y1, h], [x1, y1, -h], [x0, y1, -h], [0, 1, 0], uv, 0.8);
    if (!on(i, j + 1)) quad([x0, y0, -h], [x1, y0, -h], [x1, y0, h], [x0, y0, h], [0, -1, 0], uv, 0.55);
  }
  if (!any) { XGEO.set(id, null); return null; }   // nothing solid to trace (a glow, say): remembered, so the picture isn't read back off the card every frame
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('sd', new THREE.Float32BufferAttribute(SD, 1));
  g.userData.groundY=groundY; g.computeBoundingSphere(); XGEO.set(id, g); return g;
}
const XGLSL_V = TERR_GLSL + `attribute float sd; varying vec2 vUv; varying vec3 vW, vN; varying float vS;
  void main() { vUv = uv; vS = sd; vec4 w = modelMatrix * vec4(position, 1.0); w.y += terrH(w.xz); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const dropMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ map: { value: iconTex } }, LU),
  vertexShader: XGLSL_V,
  fragmentShader: LIGHT_GLSL + `uniform sampler2D map; varying vec2 vUv; varying vec3 vW, vN; varying float vS;
    void main() { vec4 t = texture2D(map, vUv); if (t.a < 0.5) discard; vec3 c = t.rgb * vS * lightAt(vW, normalize(vN), 1.0) * 1.12; gl_FragColor = vec4(fogged(grey(c), vW), 1.0); }`,
});
const dropRangeMat = rangeMaterial(dropMat, VIS.drops);
const dropPool = [];
function dropMesh(i, geo) {
  let m = dropPool[i];
  if (!m) { m = dropPool[i] = new THREE.Mesh(geo, dropRangeMat); m.frustumCulled = false; scene.add(m); }
  m.geometry = geo; m.visible = true; return m;
}
const dropB = new Board(1600, VIS.drops, 0, true, iconTex, ISHEET);
const nodeB = new Board(3600, VIS.nodes, 0, true);   // the grass and berry bushes you gather are the woods' own sprites

// ---------------- the kits ----------------
const thingsK = new KitMesh(true), dynK = new KitMesh(true);
const buildRangeMat = rangeMaterial(kitMat, VIS.builds);
thingsK.mesh.material = buildRangeMat; dynK.mesh.material = rangeMaterial(kitMat, VIS.drops);
castsShadow(thingsK.mesh); castsShadow(dynK.mesh);   // what you build stands in the sun's light too: a roof shades the room under it (Joe: "the sun goes through")
// a ghost: what you'd build, green where it fits and red where it won't; a blueprint glows like a plan
const ghostMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ tint: { value: new V3(0.6, 0.92, 0.55) }, alpha: { value: 0.5 } }, LU), transparent: true, depthWrite: false,
  vertexShader: TERR_GLSL + `attribute vec3 color; attribute float em; varying vec3 vC, vW, vN; varying float vE;
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); w.y += terrH(w.xz); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; vE = em; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `uniform vec3 tint; uniform float alpha; varying vec3 vC, vW, vN; varying float vE;
    void main() { vec3 c = mix(vC, tint, 0.65) * (0.6 + 0.5 * max(dot(normalize(vN), vec3(0.3, 0.8, 0.2)), 0.0)) + tint * 0.25; gl_FragColor = vec4(c, alpha); }`,
});
const ghostMesh = new THREE.Mesh(new THREE.BufferGeometry(), ghostMat); ghostMesh.frustumCulled = false; ghostMesh.renderOrder = 6; scene.add(ghostMesh);
const planMat = rangeMaterial(ghostMat, VIS.builds); planMat.uniforms = Object.assign({ tint: { value: new V3(1, 0.8, 0.5) }, alpha: { value: 0.45 }, visualRange: planMat.uniforms.visualRange }, LU);
const planMesh = new THREE.Mesh(new THREE.BufferGeometry(), planMat); planMesh.frustumCulled = false; planMesh.renderOrder = 6; scene.add(planMesh);
function setGeo(mesh, kit) { const old = mesh.geometry; mesh.geometry = kit.geometry(); old.dispose(); }

const C3 = (h, k) => hex(h, k);
const ST_TONE = { thatch: ['#b5a86a', '#8e8248', '#6d6336'], wood: ['#a07a4c', '#7a5232', '#5a3a20'], stone: ['#8e8c86', '#6e6c67', '#54524e'],
  iron: ['#7d8288', '#5c6066', '#41454a'], hide: ['#a88a66', '#86684a', '#5e4a36'], bone: ['#e2dccb', '#bfb8a6', '#8e8878'], cloth: ['#a8443a', '#843228', '#5e2219'] };
const tone = m => (ST_TONE[m] || ST_TONE.wood).map(h => hex(h));
// along a (the way a piece runs) and across it
const U = (a, f, s) => [Math.cos(a) * f - Math.sin(a) * s, Math.sin(a) * f + Math.cos(a) * s];

// (the pieces you build with the hammer and the stations you put down are drawn in 31-make)

// the relic on its cairn, in the middle of each raider camp, until you take it

// ---------------- keeping it all filled in round you ----------------
let thingsKey = '', thingsT = 0, thingsAt = { x: 1e9, y: 1e9 };
function thingsSmallSync(force) {
  const D = S.day, p = S.p, R = VIS.builds + 240;
  // a cheap key for "has anything been built, finished, opened, lit, harvested or taken": rebuild only when it changes
  let key = D.builds.length + ':' + D.bld.size;
  for (const B of D.builds) if (Math.abs(B.x - p.x) < R && Math.abs(B.y - p.y) < R) key += (B.openT > 0 ? 'o' : '') + (B.open ? 'O' : '') + (B.pen && B.inv.some(s => s && s.id === 'meat') ? 'm' : '') + (B.lit ? 'l' : '') + (B.crop || '') + (B.grown ? 'g' : '') + ((B.basket || B.comp) && B.inv.find(Boolean) ? 'h' : '') + (B.t === 'rainb' || B.t === 'tcol' ? Math.round((B.w || 0) * 2) : '') + (B.fuel > 0 ? 'f' : '') + (B.items ? B.items.length : '');
  for (const o of D.bld.values()) if (Math.abs(o.x - p.x) < R && Math.abs(o.y - p.y) < R) key += (o.done ? 'd' : 'p') + (o.burn || '') + (o.open ? 'o' : '') + ((o.open || 0) !== (o.ajar || 0) ? 'm' : '') + (o.del ? 'x' : '') + (o.gone ? 'g' : '');   // m: a door on the swing (31-make draws it)
  key += dayLight() < 0.85 ? 'N' : 'D'; key += EX_FIRE.gone ? 'P' : '@' + EX_FIRE.x + ',' + EX_FIRE.y;
  if (!force && key === thingsKey && Math.hypot(p.x - thingsAt.x, p.y - thingsAt.y) < 120) return;
  thingsKey = key; thingsAt = { x: p.x, y: p.y };
  const K = new Kit(), PK = new Kit();
  if (!EX_FIRE.gone && Math.abs(EX_FIRE.x - p.x) < R + 60 && Math.abs(EX_FIRE.y - p.y) < R + 60) pitKit(K, EX_FIRE.x, EX_FIRE.y);   // the fire pit on the hill, wherever you've moved it (89-roofs)
  for (const B of D.builds) if (Math.abs(B.x - p.x) < R + 60 && Math.abs(B.y - p.y) < R + 60) { if (B.t === 'fire') buildKit(K, { kind: 'fire', x: B.x, y: B.y, build: B }); else for (const o of B.parts) buildKit(K, o); }
  for (const o of D.bld.values()) if (Math.abs(o.x - p.x) < R && Math.abs(o.y - p.y) < R) pieceKit(o.done && !o.del ? K : PK, o);
  thingsK.set(K); setGeo(planMesh, PK);
}

// Keep local batches independent: changing a door, crop or blueprint must not upload the whole base.
const THING_CELLS = new Map(), THING_IDS = new WeakMap();
let thingUid = 0, thingDay = null, thingCheck = 0, thingGen = -1, thingDoor = -1;
function thingId(o) { if (!THING_IDS.has(o)) THING_IDS.set(o, ++thingUid); return THING_IDS.get(o); }
function thingsSync(force) {
  const D = S.day, p = S.p, R = VIS.builds + 240, size = 280, cells = new Map(), now = performance.now();
  if (D.bld.size + D.builds.length < 64) {
    if (THING_CELLS.size) {
      for (const c of THING_CELLS.values()) { for (const m of [c.solid.mesh, c.solid.edge, c.plan, c.depth]) scene.remove(m); c.solid.mesh.geometry.dispose(); c.plan.geometry.dispose(); }
      THING_CELLS.clear(); force = true; thingDay = null;
    }
    thingsK.visible = true; planMesh.visible = true;
    return thingsSmallSync(force);
  }
  thingsK.visible = false; planMesh.visible = false;
  if (!force && thingDay === D && thingGen === stGen && thingDoor === doorV && now < thingCheck) return;
  thingCheck = now + 100; thingGen = stGen; thingDoor = doorV;
  const add = (o, type, state) => {
    // Whole cells retain their membership while you walk. Clipping individual pieces at the
    // view boundary rebuilt/uploaded an otherwise unchanged cell whenever one crossed it.
    const cx = Math.floor(o.x / size), cy = Math.floor(o.y / size);
    if (cx * size > p.x + R || (cx + 1) * size < p.x - R || cy * size > p.y + R || (cy + 1) * size < p.y - R) return;
    const id = cx + ',' + cy;
    let c = cells.get(id); if (!c) cells.set(id, c = { key: '', items: [] });
    c.key += '|' + thingId(o) + ':' + state; c.items.push([o, type]);
  };
  if (!EX_FIRE.gone) add(EX_FIRE, 'pit', EX_FIRE.x + ',' + EX_FIRE.y);
  for (const B of D.builds) add(B, 'build', JSON.stringify([B.x, B.y, B.a, B.openT > 0, B.open, B.pen && B.inv.some(s => s && s.id === 'meat'), B.lit, B.crop, B.grown, (B.basket || B.comp) && !!B.inv.find(Boolean), Math.round((B.w || 0) * 2), B.fuel > 0, B.items && B.items.length]));
  for (const o of stNear(p.x, p.y, R + size)) {
    const P = PC(o.id);
    // Moving doors remain in their existing dynamic batch, independent of all static cells.
    if (o.done && !o.del && stDoorish(P) && (o.open || 0) !== (o.ajar || 0)) { if (SWING.next) SWING.next.add(o); continue; }
    add(o, 'piece', JSON.stringify([o.id, o.x, o.y, o.a, o.z || 0, o.done, o.burn, o.open, o.del, o.gone, o.clip, P.lay === 'flat' && floorBelow(o), lvPiece(o) ? stGen : 0]));
  }
  let changed = thingDay !== D; thingDay = D;
  const night = dayLight() < 0.85;
  for (const [id, c] of cells) {
    c.key += ':' + night;
    let old = THING_CELLS.get(id);
    if (!old) {
      const solid = new KitMesh(true), plan = new THREE.Mesh(new THREE.BufferGeometry(), planMat);
      solid.mesh.material = buildRangeMat;
      castsShadow(solid.mesh); plan.renderOrder = 6; scene.add(plan);
      const depth = new THREE.Mesh(plan.geometry, GHOST_D[1][1].material); depth.renderOrder = 5; scene.add(depth);
      THING_CELLS.set(id, old = { solid, plan, depth, key: null });
    }
    old.used = now;
    old.solid.visible = old.solid.mesh.geometry.attributes.position?.count > 0;
    old.plan.visible = old.depth.visible = old.plan.geometry.attributes.position?.count > 0;
    if (old.key === c.key && !changed) continue;
    const K = new Kit(), PK = new Kit();
    for (const [o, type] of c.items) {
      if (type === 'pit') pitKit(K, o.x, o.y);
      else if (type === 'build') { if (o.t === 'fire') buildKit(K, { kind: 'fire', x: o.x, y: o.y, build: o }); else for (const q of o.parts) buildKit(K, q); }
      else pieceKit(o.done && !o.del ? K : PK, o);
    }
    old.solid.set(K); setGeo(old.plan, PK); old.depth.geometry = old.plan.geometry;
    old.solid.visible = old.solid.mesh.geometry.attributes.position.count > 0;
    old.plan.visible = old.depth.visible = old.plan.geometry.attributes.position.count > 0;
    for (const m of [old.solid.mesh, old.solid.edge, old.plan, old.depth]) {
      // Geometry is lifted in the vertex shader. Expand bounds for surface terrain and flattening;
      // retain the original uncullable behaviour in the separate underground world.
      m.frustumCulled = c.items.every(([o]) => o.x < CAVE_X0);
    }
    for (const g of [old.solid.mesh.geometry, old.plan.geometry]) if (g.boundingSphere) g.boundingSphere.radius += 128;
    old.key = c.key; thingsKey += '.';
  }
  for (const [id, c] of THING_CELLS) if (!cells.has(id)) {
    c.solid.visible = c.plan.visible = c.depth.visible = false;
  }
  // Keep recently visited cells resident, so turning back does not upload them again.
  // Bound the cache and evict only inactive cells, oldest first.
  if (THING_CELLS.size > VIS.buildCache) {
    const cold = [...THING_CELLS].filter(([id]) => !cells.has(id)).sort((a, b) => a[1].used - b[1].used);
    for (const [id, c] of cold) {
      if (THING_CELLS.size <= VIS.buildCache) break;
      for (const m of [c.solid.mesh, c.solid.edge, c.plan, c.depth]) scene.remove(m);
      c.solid.mesh.geometry.dispose(); c.plan.geometry.dispose(); THING_CELLS.delete(id);
    }
  }
  // A door can start/finish swinging without changing any remaining static cell.
  thingsKey = 'cells:' + [...cells.keys()].map(id => THING_CELLS.get(id).key).join(';') + '|s:' + [...(SWING.next || [])].map(thingId).join(',');
}

// A grounded drop can sit on a built floor as well as on bare terrain. Cache the
// exact floor triangles until placement/building state changes; no per-frame raycasts.
const DROP_SUPPORT=new WeakMap();
function dropSupport(o) {
  const h=terrH(o.x,o.y),old=DROP_SUPPORT.get(o);
  if(old&&old.gen===stGen&&old.terrain===PROP_GROUND_FIELDS.gen&&old.x===o.x&&old.y===o.y&&old.h===h)return old.z;
  let z=0;
  for(const floor of stNear(o.x,o.y,GRID)){
    const P=PC(floor.id);if(!P||P.lay!=='floor'||!floor.done||floor.del||floor.gone)continue;
    const K=new Kit();pieceKit(K,floor);const p=K.pos;
    for(let i=0;i<p.length;i+=9){
      const ax=p[i],az=p[i+2],bx=p[i+3],bz=p[i+5],cx=p[i+6],cz=p[i+8];
      const den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(den)<1e-8)continue;
      const u=((bz-cz)*(o.x-cx)+(cx-bx)*(o.y-cz))/den,v=((cz-az)*(o.x-cx)+(ax-cx)*(o.y-cz))/den;
      if(u<-.0001||v<-.0001||u+v>1.0001)continue;
      z=Math.max(z,u*(p[i+1]+terrH(ax,az))+v*(p[i+4]+terrH(bx,bz))+(1-u-v)*(p[i+7]+terrH(cx,cz))-h);
    }
  }
  DROP_SUPPORT.set(o,{gen:stGen,terrain:PROP_GROUND_FIELDS.gen,x:o.x,y:o.y,h,z});return z;
}

// ---------------- each frame: nodes, drops, ghosts, what's flying, the tree you just felled ----------------
const _gk = { k: null };
function thingsFrame(now) {
  const D = S.day, rg = S.rg, p = S.p;
  // what lies about to be gathered: sticks, stones, mushrooms as shapes; grass and bushes as the woods' own sprites
  nodeB.begin(); propsN.begin(); const K = new Kit();
  // what lies about to be gathered, each a solid model stood in place (14-props): sticks, stones, mushrooms, grass, bushes and their berries
  for (const o of dayNodesNear(p.x, p.y, VIS.nodes + 80)) {
    if (o.gone || (o.x - p.x) ** 2 + (o.y - p.y) ** 2 > (VIS.nodes + 80) ** 2) continue;
    const sh = o.shakeT !== undefined ? o.shakeT : -99, sd = o.seed || 0, v = sd * 9 | 0;
    if (o.t === 'grass') propsN.add('grass', v, o.x, o.y, 1.5, sd, sh);
    else if (o.t === 'bush') { propsN.add('bbush', v, o.x, o.y, 1.15, sd, sh); if (o.ber) { propsN.add('nberries', v, o.x, o.y, 1.15, sd, sh); } }
    else if (o.t === 'sticks') propsN.add('nsticks', v, o.x, o.y, 1, sd);
    else if (o.t === 'stones') propsN.add('nstones', v, o.x, o.y, 1, sd);
    else if (o.t === 'shroom') propsN.add('nshroom' + clamp(o.n || 1, 1, 3), v, o.x, o.y, 1, sd);
  }
  nodeB.end(); propsN.end();
  // dropped things rest on their visible feet; tools still glint so you can find them
  dropB.begin(); let dn = 0;
  for (const o of D.drops) {
    if (Math.abs(o.x - p.x) > VIS.drops + 60 || Math.abs(o.y - p.y) > VIS.drops + 60) continue;
    const support=dropSupport(o),T=DIT[o.it];
    if (o.it === 'logs') { for (const s of [-1, 1]) K.rod(P_CYL(8), o.x - 7, support + 2.6 + (s > 0 ? 4.4 : 0), o.y + s * 2.2, o.x + 7, support + 2.6 + (s > 0 ? 4.4 : 0), o.y + s * 2.2 - 1, 2.4, hex('#7a5232')); }
    else { const geo = extrudeIcon(o.it);
      if (geo) { const m = dropMesh(dn++, geo); m.position.set(o.x, support - geo.userData.groundY * 1.1 - 0.05, o.y); m.rotation.set(0, (o.seed || 0) * 7, 0); m.scale.setScalar(1.1); }
      else dropB.add(o.it, 0, o.x, o.y, 1, 1, 0, -99, 0, support); }
    shadow(o.x, o.y, 6, 0);
    if (T && (T.dur || T.k === 'place' || T.k === 'gear')) { const g = (now * 0.7 + (o.seed || 0)) % 2.2; if (g < 0.35) stat(o.x, support + 12, o.y, 4 + 6 * Math.sin(g / 0.35 * Math.PI), 1, 0.97, 0.86, 0.9, 1); }
  }
  dropB.end(); for (let i = dn; i < dropPool.length; i++) dropPool[i].visible = false;
  // the tree you just felled, toppling
  // (drawn with the standing trees: treesFrame)
  // what's in the air: your arrows, stones, spears, axes; theirs too
  for (const q of rg.dshots || []) {
    if (q.f) continue;
    const ux = Math.cos(q.a), uy = Math.sin(q.a), z = q.land ? 2 : q.z || 18;
    if (q.kind === 'arrow' || q.kind === 'jav') { const L = q.kind === 'jav' ? 34 : q.xb ? 14 : 18, tilt = q.land ? 0.45 : 0; K.rod(P_CYL(4), q.x - ux * L, z + (q.land ? L * tilt : -(q.dz || 0) * L), q.y - uy * L, q.x, z, q.y, q.kind === 'jav' ? 0.9 : 0.5, hex('#a08a62')); K.add(P_CONE(4), q.x, z, q.y, 1.6, 3.4, 1.6, hex('#4d5560'), 0, 0, 0); }
    else if (q.kind === 'stone' || q.kind === 'bomb' || q.kind === 'flash') K.add(P_BALL(), q.x, z, q.y, 3.6, 3.6, 3.6, hex(q.kind === 'stone' ? '#9a9893' : q.kind === 'bomb' ? '#3a3632' : '#e8e2d0'), 0, 0, 0, q.kind === 'flash' ? 0.6 : 0);
    else { const r = now * 14; K.rod(P_CYL(5), q.x - Math.cos(r) * 9, z - Math.sin(r) * 9, q.y, q.x + Math.cos(r) * 9, z + Math.sin(r) * 9, q.y, 0.9, hex('#6b4a2e')); }
  }
  for (const q of rg.dspears || []) {
    const ux = Math.cos(q.a), uy = Math.sin(q.a), z = q.land ? 3 : q.z || 20, L = 40, tilt = q.land ? 12 : 0;
    K.rod(P_CYL(5), q.x - ux * L, z + tilt, q.y - uy * L, q.x, z, q.y, 0.9, hex('#8a6a44')); K.add(P_CONE(5), q.x, z, q.y, 2.4, 5, 2.4, hex('#9a9a92'));
  }
  for (const s of rg.darts) {
    const h = dartLift(s), ux = Math.cos(s.a), uy = Math.sin(s.a), L = s.kind === 'spear' ? 36 : 18;
    K.rod(P_CYL(4), s.x - ux * L, h + (s.stuck ? L * 0.4 : 0), s.y - uy * L, s.x, h, s.y, s.kind === 'spear' ? 0.9 : 0.5, hex(s.kind === 'spear' ? '#6e5235' : '#a08a62'));
    const fc = s.from && FOE_TINT[s.from.type] ? FOE_TINT[s.from.type] : [255, 200, 160]; stat(s.x, h, s.y, 3, fc[0] / 255, fc[1] / 255, fc[2] / 255, 0.6, 0);
  }
  // fishing: the line and the float
  if (D.fish && D.fish.x !== undefined) { const f = D.fish, bob = f.bite ? Math.sin(now * 30) * 1.4 : Math.sin(now * 2) * 0.4; K.add(P_BALL(), f.x, 1 + bob, f.y, 3, 3, 3, hex('#e04030'), 0, 0, 0, 0.2); }
  if (K.pos.length || dynK.had) { dynK.set(K); dynK.had = K.pos.length > 0; }   // nothing flying: nothing rebuilt
  // the ghost of what you'd put down, and of the grid piece you're placing
  const GK = new Kit(); let ok = true, any = false;
  const g = dayGhost();
  if (g) { any = true; ok = g.ok; const fake = dayMakeBuild(g.build, g.x, g.y, g.a, true); for (const o of fake.parts) buildKit(GK, o); if (!fake.parts.length) GK.add(P_CYL(16), g.x, 0, g.y, 38, 1, 38, hex('#ffffff')); }
  const sg = stGhost();
  if (sg) { any = true; ok = sg.ok; pieceKit(GK, sg); }
  ghostMesh.visible = any;
  if (any) { setGeo(ghostMesh, GK); ghostMat.uniforms.tint.value.set(...(ok ? [0.6, 0.94, 0.55] : [0.95, 0.38, 0.3])); ghostMat.uniforms.alpha.value = 0.45 + 0.12 * Math.sin(now * 6); }
  planMat.uniforms.alpha.value = 0.36 + 0.08 * Math.sin(now * 3);
}
