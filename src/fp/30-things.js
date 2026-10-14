// ================= Daylight's things: what you gather, what you drop, what you build, the raiders' camps =================
// All of it is the main game's own state (S.day): this only stands it up in 3D in the game's colours.

// ---------------- item pictures: every item's own icon from the pack, painted once into a sheet ----------------
// Dropped things lie on the ground as their picture, standing up and bobbing a little, as in the 2D game.
const ISHEET = { W: 2048, H: 2048, meta: {}, ok: {} };
const iconCv = document.createElement('canvas'); iconCv.width = ISHEET.W; iconCv.height = ISHEET.H;
const iconTex = new THREE.CanvasTexture(iconCv);
iconTex.flipY = false; iconTex.colorSpace = THREE.NoColorSpace; iconTex.generateMipmaps = true; iconTex.minFilter = THREE.LinearMipmapLinearFilter; iconTex.anisotropy = MAX_ANISO;
{
  const g = iconCv.getContext('2d'), ids = Object.keys(ICON), N = 32, CELL = 64;
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
  let any = false;
  for (let j = 0; j < XNN; j++) for (let i = 0; i < XNN; i++) {
    if (!on(i, j)) continue; any = true;
    const x0 = L + i * c, x1 = x0 + c, y1 = XSZ - j * c, y0 = y1 - c, m = uvAt((i + 0.5) / XNN, (j + 0.5) / XNN), uv = [m, m, m, m];
    if (!on(i - 1, j)) quad([x0, y0, -h], [x0, y0, h], [x0, y1, h], [x0, y1, -h], [-1, 0, 0], uv, 0.68);
    if (!on(i + 1, j)) quad([x1, y0, h], [x1, y0, -h], [x1, y1, -h], [x1, y1, h], [1, 0, 0], uv, 0.68);
    if (!on(i, j - 1)) quad([x0, y1, h], [x1, y1, h], [x1, y1, -h], [x0, y1, -h], [0, 1, 0], uv, 0.8);
    if (!on(i, j + 1)) quad([x0, y0, -h], [x1, y0, -h], [x1, y0, h], [x0, y0, h], [0, -1, 0], uv, 0.55);
  }
  if (!any) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('sd', new THREE.Float32BufferAttribute(SD, 1));
  g.computeBoundingSphere(); XGEO.set(id, g); return g;
}
const XGLSL_V = TERR_GLSL + `attribute float sd; varying vec2 vUv; varying vec3 vW, vN; varying float vS;
  void main() { vUv = uv; vS = sd; vec4 w = modelMatrix * vec4(position, 1.0); w.y += terrH(w.xz); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const dropMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ map: { value: iconTex } }, LU),
  vertexShader: XGLSL_V,
  fragmentShader: LIGHT_GLSL + `uniform sampler2D map; varying vec2 vUv; varying vec3 vW, vN; varying float vS;
    void main() { vec4 t = texture2D(map, vUv); if (t.a < 0.5) discard; vec3 c = t.rgb * vS * lightAt(vW, normalize(vN), 1.0) * 1.12; gl_FragColor = vec4(fogged(grey(c), vW), 1.0); }`,
});
const dropPool = [];
function dropMesh(i, geo) {
  let m = dropPool[i];
  if (!m) { m = dropPool[i] = new THREE.Mesh(geo, dropMat); m.frustumCulled = false; scene.add(m); }
  m.geometry = geo; m.visible = true; return m;
}
const dropB = new Board(400, 600, 0, true, iconTex, ISHEET);
const nodeB = new Board(900, 560, 0, true);   // the grass and berry bushes you gather are the woods' own sprites

// ---------------- the kits ----------------
const thingsK = new KitMesh(true), dynK = new KitMesh(true);
// a ghost: what you'd build, green where it fits and red where it won't; a blueprint glows like a plan
const ghostMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ tint: { value: new V3(0.6, 0.92, 0.55) }, alpha: { value: 0.5 } }, LU), transparent: true, depthWrite: false,
  vertexShader: TERR_GLSL + `attribute vec3 color; attribute float em; varying vec3 vC, vW, vN; varying float vE;
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); w.y += terrH(w.xz); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; vE = em; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: LIGHT_GLSL + `uniform vec3 tint; uniform float alpha; varying vec3 vC, vW, vN; varying float vE;
    void main() { vec3 c = mix(vC, tint, 0.65) * (0.6 + 0.5 * max(dot(normalize(vN), vec3(0.3, 0.8, 0.2)), 0.0)) + tint * 0.25; gl_FragColor = vec4(c, alpha); }`,
});
const ghostMesh = new THREE.Mesh(new THREE.BufferGeometry(), ghostMat); ghostMesh.frustumCulled = false; ghostMesh.renderOrder = 6; scene.add(ghostMesh);
const planMat = ghostMat.clone(); planMat.uniforms = Object.assign({ tint: { value: new V3(1, 0.8, 0.5) }, alpha: { value: 0.45 } }, LU);
const planMesh = new THREE.Mesh(new THREE.BufferGeometry(), planMat); planMesh.frustumCulled = false; planMesh.renderOrder = 6; scene.add(planMesh);
function setGeo(mesh, kit) { const old = mesh.geometry; mesh.geometry = kit.geometry(); old.dispose(); }

const C3 = (h, k) => hex(h, k);
const ST_TONE = { thatch: ['#b5a86a', '#8e8248', '#6d6336'], wood: ['#a07a4c', '#7a5232', '#5a3a20'], stone: ['#8e8c86', '#6e6c67', '#54524e'],
  iron: ['#7d8288', '#5c6066', '#41454a'], hide: ['#a88a66', '#86684a', '#5e4a36'], bone: ['#e2dccb', '#bfb8a6', '#8e8878'], cloth: ['#a8443a', '#843228', '#5e2219'] };
const tone = m => (ST_TONE[m] || ST_TONE.wood).map(h => hex(h));
// along a (the way a piece runs) and across it
const U = (a, f, s) => [Math.cos(a) * f - Math.sin(a) * s, Math.sin(a) * f + Math.cos(a) * s];

// ---------------- your grid pieces: floors, walls, doors, roofs, fences, lights, furniture ----------------
function pieceKit(K, o) {
  const P = PC(o.id), T = tone(P.m), a = o.a || 0, x = o.x, y = o.y, H = P.H || 36, L = P.L || GRID;
  const at = (f, s) => { const [dx, dy] = U(a, f, s); return [x + dx, y + dy]; };
  const box = (f, s, z, l, h, w, col, em = 0) => { const [px, py] = at(f, s); K.add(P_BOX(), px, z + h / 2, py, l, h, w, col, -a, 0, 0, em); };
  const post = (f, s, z, r, h, col, n = 8) => { const [px, py] = at(f, s); K.add(P_CYL(n), px, z, py, r * 2, h, r * 2, col); };
  if (P.sh === 'sq' || P.sh === 'tri') {
    const roof = P.lay === 'roof', z = roof ? ROOF_H : 0, th = roof ? 4 : 2;
    if (P.sh === 'sq') { box(0, 0, z - (roof ? 0 : 0.5), GRID, th, GRID, T[roof ? 0 : 1]); if (roof) { box(0, 0, z + th, GRID * 0.98, 6, GRID * 0.3, T[1]); } else if (P.m !== 'thatch') for (const s of [-GRID / 4, GRID / 4]) box(0, s, z + 1.4, GRID - 2, 0.3, 1, T[2]); }
    else K.add(P_CYL(3), x, z - (roof ? 0 : 0.5), y, TRI_R * 2, th, TRI_R * 2, T[roof ? 0 : 1], Math.PI / 2 - a);
    return;
  }
  if (P.sh === 'edge') {
    const k = P.k, h2 = L / 2;
    if (k === 'wall' || k === 'half') {
      box(0, 0, 0, L, H, P.m === 'stone' ? 7 : 5.5, T[0]);
      if (P.m === 'wood') for (let i = 1; i < 4; i++) box(0, 0, H * i / 4, L + 0.2, 0.5, 5.8, T[2]);
      if (P.m === 'stone') for (let i = 1; i < 4; i++) box(0, 0, H * i / 4, L + 0.2, 0.6, 7.4, T[1]);
      if (P.m === 'iron') { for (const f of [-h2 + 4, 0, h2 - 4]) box(f, 0, 0, 2.5, H, 6.4, T[2]); }
      if (P.m === 'thatch') box(0, 0, H - 2, L + 2, 4, 7, T[1]);
    } else if (k === 'door' || k === 'gate' || k === 'arch') {
      const open = o.open ? 1 : 0;
      post(-h2 + 2.5, 0, 0, 2.6, H, T[1]); post(h2 - 2.5, 0, 0, 2.6, H, T[1]); box(0, 0, H - 4, L, 4, 6, T[1]);
      if (P.m === 'stone') { box(-h2 + 3, 0, 0, 6, H, 7, T[0]); box(h2 - 3, 0, 0, 6, H, 7, T[0]); }
      if (k === 'door') { const sw = open * 1.4, [hx, hy] = at(-h2 + 5, 0), w = L - 10; K.add(P_BOX(), hx + Math.cos(a + sw) * w / 2, (H - 4) / 2, hy + Math.sin(a + sw) * w / 2, w, H - 4, 3, P.m === 'iron' ? T[0] : hex('#7a5232'), -(a + sw)); }
      if (k === 'gate') for (const s of [-1, 1]) { const sw = open * 1.3 * s, [hx, hy] = at(s * (h2 - 4), 0), w = h2 - 4; K.add(P_BOX(), hx - Math.cos(a - sw) * s * w / 2, (H - 4) / 2, hy - Math.sin(a - sw) * s * w / 2, w, H - 4, 3, hex('#7a5232'), -(a - sw)); }
    } else if (k === 'window') {
      box(0, 0, 0, L, H * 0.42, P.m === 'stone' ? 7 : 5.5, T[0]); box(0, 0, H * 0.78, L, H * 0.22, P.m === 'stone' ? 7 : 5.5, T[0]);
      for (const f of [-h2 + 3, h2 - 3]) box(f, 0, H * 0.42, 6, H * 0.36, P.m === 'stone' ? 7 : 5.5, T[1]);
      if (P.m !== 'stone') box(0, 0, H * 0.42, 1, H * 0.36, 1, T[2]);
    } else if (k === 'fence') {
      for (const z of [7, 15]) box(0, 0, z, L, 1.6, 1.6, T[1]);
      for (let i = 0; i <= 6; i++) { const [px, py] = at(-h2 + i * L / 6, 0); K.add(P_CYL(5), px, 0, py, 1.6, H + (i % 2) * 2, 1.6, T[0]); }
    } else if (k === 'palis') {
      for (let i = 0; i < 6; i++) { const [px, py] = at(-h2 + (i + 0.5) * L / 6, 0), h = H - 6 + 4 * hash(o.x + i, o.y); K.add(P_CYL(7), px, 0, py, L / 6, h, L / 6, logTone3(i)); K.add(P_CONE(7), px, h, py, L / 6, 6, L / 6, logTone3(i)); }
      for (const z of [8, H - 14]) box(0, 0, z, L, 1.4, L / 6 + 0.6, hex('#2a2724'));
    } else box(0, 0, 0, L, H, 5, T[0]);
    return;
  }
  // posts, lights, furniture and decoration
  const k = P.k, r = P.r || 6, mount = P.lay === 'mount';
  const mz = 26;   // on a wall: about chest height
  switch (k) {
    case 'post': post(0, 0, 0, r * 0.75, H, T[0]); K.add(P_CONE(8), x, H, y, r * 1.5, 3, r * 1.5, T[1]); break;
    case 'pillar': box(0, 0, 0, r * 1.6, H, r * 1.6, T[0]); box(0, 0, H - 3, r * 1.9, 3, r * 1.9, T[1]); box(0, 0, 0, r * 1.9, 3, r * 1.9, T[1]); break;
    case 'stakes': for (let m = -1; m <= 1; m++) { const [bx, by] = at(0, m * 7), [tx, ty] = at(12, m * 7); K.rod(P_CONE(5), bx, 0, by, tx, 16 + 3 * (m & 1), ty, 1.6, logTone3(m + 1)); const [cx, cy] = at(0, m * 7), [dx, dy] = at(-12, m * 7); K.rod(P_CONE(5), cx, 0, cy, dx, 16, dy, 1.6, logTone3(m + 2)); } break;
    case 'spikeF': box(0, 0, 0, r * 1.6, 0.6, r * 1.6, hex('#4a3a2a')); for (let i = 0; i < 9; i++) { const [px, py] = at((i % 3 - 1) * r * 0.5, (Math.floor(i / 3) - 1) * r * 0.5); K.add(P_CONE(4), px, 0, py, 1.6, 5, 1.6, T[0]); } break;
    case 'thorns': for (let i = 0; i < 6; i++) { const [px, py] = at(Math.cos(i * 2.4) * r * 0.55, Math.sin(i * 2.4) * r * 0.55); K.add(P_BALL(), px, 5, py, 12, 9, 12, hex(i % 2 ? '#3e5a30' : '#4a6a36')); } break;
    case 'chimes': post(0, 0, 0, 1.4, H, T[2], 5); box(0, 0, H - 2, 14, 1.4, 1.4, T[2]); for (let i = 0; i < 4; i++) { const [px, py] = at(-5 + i * 3.3, 0); K.add(P_CYL(5), px, H - 13 - (i % 2) * 3, py, 1.4, 9, 1.4, T[0]); } break;
    case 'sconce': { const [px, py] = at(0, 3); K.add(P_BOX(), px, mz, py, 2, 6, 3, T[2], -a); K.add(P_CYL(6), px, mz + 3, py, 2.6, 6, 2.6, hex('#6a4a2a')); break; }
    case 'lamp': { post(0, 0, 0, 1.8, H, hex('#5a3a20'), 6); const [px, py] = at(8, 0); box(4, 0, H - 2, 10, 1.4, 1.4, hex('#5a3a20')); K.add(P_BOX(), px, H - 9, py, 5, 7, 5, hex('#ffd890'), -a, 0, 0, dayLight() < 0.85 ? 0.9 : 0.2); K.add(P_CONE(4), px, H - 5.5, py, 7, 3, 7, hex('#3a3a36'), Math.PI / 4 - a); break; }
    case 'brazier': K.add(P_CYL(10), x, 0, y, 8, 9, 8, T[1]); K.add(P_CYL(10), x, 9, y, 18, 5, 18, T[0]); K.add(P_CYL(10), x, 13.6, y, 15, 0.6, 15, hex('#e08030'), 0, 0, 0, dayLight() < 0.85 ? 1 : 0.3); break;
    case 'candles': for (let i = 0; i < 3; i++) { const [px, py] = at(Math.cos(i * 2.1) * 2.6, Math.sin(i * 2.1) * 2.6); K.add(P_CYL(6), px, 0, py, 2, 5 + i * 1.5, 2, hex('#efe6d2')); } break;
    case 'bed': box(0, 0, 0, 36, 6, 18, T[1]); box(0, 0, 6, 33, 2.4, 16, hex('#a88a66')); box(-13, 0, 8.4, 7, 2.4, 13, hex('#e2dccb')); box(17, 0, 0, 2, 12, 18, T[2]); break;
    case 'table': box(0, 0, 13, 28, 3, 16, T[0]); for (const [f, s] of [[-12, -6], [12, -6], [12, 6], [-12, 6]]) post(f, s, 0, 1.2, 13, T[2], 5); break;
    case 'stool': K.add(P_CYL(8), x, 8, y, 10, 2.4, 10, T[0]); for (let i = 0; i < 3; i++) post(Math.cos(i * 2.1) * 3.5, Math.sin(i * 2.1) * 3.5, 0, 0.9, 8, T[2], 5); break;
    case 'seat': box(0, 0, 8, 28, 2.4, 8, T[0]); for (const f of [-11, 11]) box(f, 0, 0, 2.4, 8, 7, T[2]); break;
    case 'shelf': { const [px, py] = at(0, 3); K.add(P_BOX(), px, mz + 4, py, 20, 1.6, 6, T[0], -a); for (let i = 0; i < 3; i++) { const [qx, qy] = at(-6 + i * 6, 3); K.add(P_CYL(7), qx, mz + 4.8, qy, 3.4, 4 + i, 3.4, hex(['#9a6a4a', '#c8b07a', '#7d8288'][i])); } break; }
    case 'wrack': for (const f of [-9, 9]) post(f, 0, 0, 1, 20, T[1], 5); box(0, 0, 17, 20, 1.6, 1.6, T[1]); for (let m = 0; m < 4; m++) { const [px, py] = at(-6 + m * 4, 2), [qx, qy] = at(-6 + m * 4 + 1, -2); K.rod(P_CYL(4), px, 0, py, qx, 32, qy, 0.65, hex('#6e5235')); K.add(P_CONE(4), qx, 32, qy, 2.2, 6, 2.2, hex('#9a9a92')); } break;
    case 'barrel': K.add(P_CYL(10), x, 0, y, 15, 18, 15, T[0]); for (const z of [3, 14]) K.add(P_CYL(10), x, z, y, 15.6, 1.4, 15.6, hex('#5c6066')); break;
    case 'crate': box(0, 0, 0, 16, 14, 16, T[0]); box(0, 0, 13, 16.4, 1.2, 16.4, T[2]); break;
    case 'rug': box(0, 0, 0, 36, 0.6, 24, hex('#b8483c')); box(0, 0, 0.3, 26, 0.6, 15, hex('#e2c070')); box(0, 0, 0.6, 22, 0.6, 11, hex('#b8483c')); break;
    case 'pelt': K.add(P_CYL(9), x, 0, y, 32, 0.8, 22, hex('#a88a66'), -a); break;
    case 'woodpile': for (let i = 0; i < 6; i++) { const row = i < 3 ? 0 : i < 5 ? 1 : 2, col = row === 0 ? i : row === 1 ? i - 3 : 0, s = (col - (row === 0 ? 1 : row === 1 ? 0.5 : 0)) * 6.2, z = 3 + row * 5.4; const [ax, ay] = at(-9, s), [bx, by] = at(9, s); K.rod(P_CYL(8), ax, z, ay, bx, z, by, 3, logTone3(i)); } break;
    case 'banner': post(0, 0, 0, 1.2, H, T[2], 5); { const [px, py] = at(6, 0); K.add(P_BOX(), px, H - 15, py, 11, 22, 0.8, hex('#a8443a'), -a); } break;
    case 'trophy': { const [px, py] = at(0, 3); K.add(P_BOX(), px, mz + 6, py, 6, 4, 3, hex('#7a5232'), -a); K.add(P_BALL(), px, mz + 8, py, 4, 5, 4, hex('#e2dccb')); for (const s of [-1, 1]) { const [qx, qy] = at(s * 9, 4); K.rod(P_CYL(4), px, mz + 9, py, qx, mz + 20, qy, 0.7, hex('#e2dccb')); } break; }
    case 'skulls': post(0, 0, 0, 1.3, H, hex('#7a5232'), 5); K.add(P_BALL(), x, H, y, 7, 6.5, 7, hex('#e2dccb')); K.add(P_BALL(), x, H - 11, y, 5, 4.6, 5, hex('#e2dccb')); break;
    case 'flowers': K.add(P_CYL(8), x, 0, y, 10, 7, 10, hex('#9a6a4a')); for (let i = 0; i < 4; i++) K.add(P_BALL(), x + Math.cos(i * 1.6) * 2.6, 9 + (i % 2) * 2, y + Math.sin(i * 1.6) * 2.6, 3.2, 3.2, 3.2, hex(['#e2c070', '#c8507a', '#d87a5a', '#f0e6c8'][i])); break;
    case 'ring': for (let i = 0; i < 9; i++) { const t = i / 9 * 6.283; K.add(P_BALL(), x + Math.cos(t) * r * 0.8, 1, y + Math.sin(t) * r * 0.8, 7, 5, 7, hex(i % 2 ? '#7a7872' : '#8d8b85')); } break;
    default: box(0, 0, 0, r * 1.6, P.H || 10, r * 1.6, T[0]);
  }
}

// ---------------- Daylight's builds: walls and spikes, the bench, a chest, furnace, rack, anvil, post, effigy, signal fire, plot ----------------
function buildKit(K, o) {
  const B = o.build || o, a = B.a || 0, x = o.x, y = o.y;
  const at = (f, s) => { const [dx, dy] = U(a, f, s); return [x + dx, y + dy]; };
  const box = (f, s, z, l, h, w, col, em = 0) => { const [px, py] = at(f, s); K.add(P_BOX(), px, z + h / 2, py, l, h, w, col, -a, 0, 0, em); };
  if (o.camp === 'wall') { campKit1(K, o); return; }
  if (o.camp === 'stakes') { campKit1(K, o); return; }
  if (o.kind === 'fire' || B.t === 'fire') { for (let k = 0; k < 8; k++) { const t = k / 8 * 6.283; K.add(P_ROCK(k % 4), x + Math.cos(t) * 10, 1.4, y + Math.sin(t) * 10, 7, 5, 6.5, hex(k % 2 ? '#7a7872' : '#8d8b85'), t); } logRod(K, x - 6, 2, y - 3, x + 6, 2.6, y + 3, 1.6, hex('#5a3e28')); logRod(K, x - 5, 2.4, y + 4, x + 5, 3.2, y - 4, 1.6, hex('#4a3420')); K.add(P_CYL(8), x, 0.2, y, 12, 0.5, 12, hex('#2a2420'), 0, 0, 0, 0.3); return; }
  switch (o.sub) {
    case 'bench':
      for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const [lx, ly] = at(13 * i, 6 * j); K.add(P_BOX(), lx, 5.5, ly, 2.4, 11, 2.4, hex('#5a3e28'), -a); }
      box(0, 0, 11, 32, 3, 15, hex('#c49a62')); box(0, 0, 4.5, 27, 1.2, 1.2, hex('#6a4628'));
      { const [px, py] = at(-8, -1); K.add(P_BALL(), px, 14.6, py, 6, 2.2, 3.6, hex('#8d8b85')); }
      { const [ax, ay] = at(2, -4), [bx, by] = at(11, 4); K.rod(P_CYL(5), ax, 14.6, ay, bx, 14.6, by, 0.7, hex('#7a5a3a')); K.add(P_BOX(), bx, 15, by, 4, 2, 3, hex('#9a9a92'), -a); }
      break;
    case 'chest': chestKit(K, x, y, a + Math.PI / 2, 0.78, B.openT > 0 ? Math.min(1, B.openT * 4) : 0); break;
    case 'furnace': {
      K.add(P_CYL(10), x, 0, y, 26, 14, 26, hex('#7a7872')); K.add(P_BALL(), x, 14, y, 26, 22, 26, hex('#8d8b85')); K.add(P_CYL(8), x, 20, y, 8, 14, 8, hex('#6e6c67'));
      const [mx, my] = at(0, 12.2), lit = B.fuel > 0 || B.lit || B.smelt; K.add(P_BOX(), mx, 6, my, 8, 7, 1.4, hex(lit ? '#ffa040' : '#1c1a18'), -a, 0, 0, lit ? 1 : 0);
      break;
    }
    case 'rack': {
      for (const f of [-14, 14]) { const [px, py] = at(f, 0); K.add(P_CYL(5), px, 0, py, 2.2, 22, 2.2, hex('#5a3e28')); }
      box(0, 0, 20, 30, 1.6, 1.6, hex('#6e5235'));
      const n = B.items ? B.items.length : B.dry ? B.dry.length : 3;
      for (let i = 0; i < Math.max(2, Math.min(5, n)); i++) { const [px, py] = at(-10 + i * 5, 0); K.add(P_BOX(), px, 14, py, 3, 6, 1, hex(i % 2 ? '#b04a3a' : '#a07850'), -a); }
      break;
    }
    case 'anvil': K.add(P_CYL(9), x, 0, y, 14, 9, 14, hex('#6a4a2a')); box(0, 0, 9, 18, 4, 7, hex('#5c6066')); box(-3, 0, 13, 22, 2.6, 8, hex('#7d8288')); { const [px, py] = at(11, 0); K.add(P_CONE(6), px, 14.3, py, 4, 6, 4, hex('#7d8288'), 0, 0, Math.PI / 2); } break;
    case 'tpost': {
      K.add(P_CYL(8), x, 0, y, 5, 46, 5, hex('#6a4a2a')); box(0, 0, 36, 22, 2.6, 2.6, hex('#5a3e28'));
      K.add(P_CYL(10), x, 46, y, 10, 3, 10, hex('#7a7872'));
      for (const s of [-1, 1]) { const [px, py] = at(s * 10, 0); K.add(P_CYL(5), px, 28, py, 1.2, 8, 1.2, hex('#3a2a1a')); K.add(P_BOX(), px, 26, py, 4, 4, 2, hex('#b04a3a'), -a); }
      break;
    }
    case 'effigy': {
      K.add(P_CYL(6), x, 0, y, 3, 44, 3, hex('#6e5235')); box(0, 0, 30, 30, 2.4, 2.4, hex('#6e5235'));
      K.add(P_CYL(8), x, 14, y, 13, 22, 9, hex('#c8b07a')); K.add(P_BALL(), x, 40, y, 10, 11, 10, hex('#d8c08a'));
      for (const s of [-1, 1]) { const [px, py] = at(s * 13, 0); K.add(P_BALL(), px, 31, py, 5, 4, 4, hex('#c8b07a')); }
      break;
    }
    case 'signal': {
      const lit = B.lit || (S.day && S.day.siege);
      for (let i = 0; i < 12; i++) { const t = i / 12 * 6.283, bx = x + Math.cos(t) * 22, by = y + Math.sin(t) * 22; K.rod(P_CYL(6), bx, 0, by, x + Math.cos(t) * 3, 58, y + Math.sin(t) * 3, 2.6, logTone3(i)); }
      for (let i = 0; i < 10; i++) { const t = i / 10 * 6.283; K.add(P_BALL(), x + Math.cos(t) * 26, 2, y + Math.sin(t) * 26, 9, 6, 9, hex(i % 2 ? '#7a7872' : '#8d8b85')); }
      if (lit) K.add(P_CONE(8), x, 0, y, 30, 40, 30, hex('#ff9a40'), 0, 0, 0, 1);
      break;
    }
    case 'plot': {
      box(0, 0, -0.4, 44, 1.2, 30, hex('#4a3a2a'));
      for (const s of [-9, 0, 9]) box(0, s, 0.4, 42, 1.4, 3.4, hex('#5a4632'));
      if (B.crop) for (let i = 0; i < 9; i++) { const [px, py] = at(-15 + (i % 3) * 15, -9 + Math.floor(i / 3) * 9), gr = B.grown ? 1 : clamp(B.sown ? (S.day.t - B.sown) / 120 : 0.2, 0.15, 0.9); K.add(P_CONE(5), px, 1, py, 4 * gr + 1, 8 * gr + 1, 4 * gr + 1, hex('#5f8a3a')); if (B.grown) K.add(P_BALL(), px, 6, py, 2.6, 2.6, 2.6, hex(B.crop === 'mushroom' ? '#c8a070' : '#c23a4a')); }
      break;
    }
  }
}
function campKit1(K, o) {   // one of the camp's own wall sections or stake rows (what you build with the wall and spikes)
  if (o.camp === 'wall') {
    for (let m = 0; m < 3; m++) { const f = (m + 0.5) / 3, x = o.ax + (o.bx - o.ax) * f, y = o.ay + (o.by - o.ay) * f, h = 27 + 5 * hash((o.seq * 3 + m) * 1.3, 7);
      K.add(P_CYL(7), x, 0, y, 4.6, h, 4.6, logTone3(o.seq + m)); K.add(P_CONE(7), x, h, y, 4.6, 4.5, 4.6, logTone3(o.seq + m)); }
    K.rod(P_CYL(5), o.ax, 7, o.ay, o.bx, 7, o.by, 0.75, hex('#2a2724')); K.rod(P_CYL(5), o.ax, 21, o.ay, o.bx, 21, o.by, 0.75, hex('#2a2724'));
  } else {
    const ux = Math.cos(o.a), uy = Math.sin(o.a);
    for (let m = -1; m <= 1; m++) { const bx = o.x - uy * m * 7, by = o.y + ux * m * 7, h = 15 + 4 * ((m + 1 + Math.floor(o.seed * 3)) % 2);
      K.rod(P_CONE(5), bx, 0, by, bx + ux * 13, h, by + uy * 13, 1.4, logTone3(m + 1)); }
    K.rod(P_CYL(5), o.x - uy * 10, 2, o.y + ux * 10, o.x + uy * 10, 2, o.y - ux * 10, 1.5, hex('#3a3631'));
  }
}
// the relic on its cairn, in the middle of each raider camp, until you take it
function relicKit(K, o, C) {
  for (let i = 0; i < 7; i++) { const t = i / 7 * 6.283, r = i < 6 ? 8 : 0; K.add(P_BALL(), o.x + Math.cos(t) * r, i < 6 ? 3 : 9, o.y + Math.sin(t) * r, i < 6 ? 9 : 11, i < 6 ? 7 : 9, i < 6 ? 9 : 11, hex(i % 2 ? '#7a7872' : '#8d8b85')); }
  K.add(P_CYL(6), o.x, 12, o.y, 3, 40, 3, hex('#4a3a2a'));
  K.add(P_BALL(), o.x, 56, o.y, 9, 11, 9, hex(DIT[C.relic] ? DIT[C.relic].c : '#e2c070'), 0, 0, 0, 0.8);
}

// ---------------- keeping it all filled in round you ----------------
let thingsKey = '', thingsT = 0, thingsAt = { x: 1e9, y: 1e9 };
function thingsSync(force) {
  const D = S.day, p = S.p, R = 560;
  // a cheap key for "has anything been built, finished, opened, lit, harvested or taken": rebuild only when it changes
  let key = D.builds.length + ':' + D.bld.size + ':' + dayRelics();
  for (const B of D.builds) if (Math.abs(B.x - p.x) < R && Math.abs(B.y - p.y) < R) key += (B.openT > 0 ? 'o' : '') + (B.lit ? 'l' : '') + (B.crop || '') + (B.grown ? 'g' : '') + (B.fuel > 0 ? 'f' : '') + (B.items ? B.items.length : '');
  for (const o of D.bld.values()) if (Math.abs(o.x - p.x) < R && Math.abs(o.y - p.y) < R) key += (o.done ? 'd' : 'p') + (o.open ? 'o' : '') + (o.del ? 'x' : '') + (o.gone ? 'g' : '');
  key += dayLight() < 0.85 ? 'N' : 'D';
  if (!force && key === thingsKey && Math.hypot(p.x - thingsAt.x, p.y - thingsAt.y) < 120) return;
  thingsKey = key; thingsAt = { x: p.x, y: p.y };
  const K = new Kit(), PK = new Kit();
  for (const B of D.builds) if (Math.abs(B.x - p.x) < R + 60 && Math.abs(B.y - p.y) < R + 60) { if (B.t === 'fire') buildKit(K, { kind: 'fire', x: B.x, y: B.y, build: B }); else for (const o of B.parts) buildKit(K, o); }
  for (const o of D.bld.values()) if (Math.abs(o.x - p.x) < R && Math.abs(o.y - p.y) < R) pieceKit(o.done && !o.del ? K : PK, o);
  for (const C of dayCampList()) if (Math.abs(C.x - p.x) < R + 200 && Math.abs(C.y - p.y) < R + 200) { const st = dayCampState(C.i); for (const o of C.parts) if (o.sub === 'relic' && !st.took) relicKit(K, o, C); }
  thingsK.set(K); setGeo(planMesh, PK);
}

// ---------------- each frame: nodes, drops, ghosts, what's flying, the tree you just felled ----------------
const _gk = { k: null };
function thingsFrame(now) {
  const D = S.day, rg = S.rg, p = S.p;
  // what lies about to be gathered: sticks, stones, mushrooms as shapes; grass and bushes as the woods' own sprites
  nodeB.begin(); propsN.begin(); const K = new Kit();
  // what lies about to be gathered, each a solid model stood in place (14-props): sticks, stones, mushrooms, grass, bushes and their berries
  for (const o of dayNodesNear(p.x, p.y, 540)) {
    if (o.gone) continue;
    const sh = o.shakeT !== undefined ? o.shakeT : -99, sd = o.seed || 0, v = sd * 9 | 0;
    if (o.t === 'grass') propsN.add('grass', v, o.x, o.y, 1.5, sd, sh);
    else if (o.t === 'bush') { propsN.add('bush', v, o.x, o.y, 1.3, sd, sh); if (o.ber) { propsN.add('nberries', 0, o.x, o.y, 1, sd, sh); for (let i = 0; i < 7; i++) { const a = sd * 7 + i * 1.9; stat(o.x + Math.cos(a) * 6, 7 + (i % 3) * 2.3, o.y + Math.sin(a) * 6, 2.2, 0.82, 0.19, 0.24, 0.0, 0); } } }
    else if (o.t === 'sticks') propsN.add('nsticks', v, o.x, o.y, 1, sd);
    else if (o.t === 'stones') propsN.add('nstones', v, o.x, o.y, 1, sd);
    else if (o.t === 'shroom') propsN.add('nshroom' + clamp(o.n || 1, 1, 3), v, o.x, o.y, 1, sd);
  }
  nodeB.end(); propsN.end();
  // dropped things: their own pictures, bobbing; tools glint now and then so you find them again
  dropB.begin(); let dn = 0;
  for (const o of D.drops) {
    if (Math.abs(o.x - p.x) > 600 || Math.abs(o.y - p.y) > 600) continue;
    const bob = Math.sin(now * 3 + (o.seed || 0)) * 1.2, T = DIT[o.it];
    if (o.it === 'logs') { for (const s of [-1, 1]) K.rod(P_CYL(8), o.x - 7, 2.6 + (s > 0 ? 4.4 : 0), o.y + s * 2.2, o.x + 7, 2.6 + (s > 0 ? 4.4 : 0), o.y + s * 2.2 - 1, 2.4, hex('#7a5232')); }
    else { const geo = extrudeIcon(o.it);
      if (geo) { const m = dropMesh(dn++, geo); m.position.set(o.x, 2.4 + bob, o.y); m.rotation.set(0, now * 1.1 + (o.seed || 0) * 7, 0); m.scale.setScalar(1.1); }
      else dropB.add(o.it, 0, o.x, o.y, 1, 1, 0, -99, 0, 2 + bob); }
    shadow(o.x, o.y, 6, 0);
    if (T && (T.dur || T.k === 'place' || T.k === 'gear')) { const g = (now * 0.7 + (o.seed || 0)) % 2.2; if (g < 0.35) stat(o.x, 12 + bob, o.y, 4 + 6 * Math.sin(g / 0.35 * Math.PI), 1, 0.97, 0.86, 0.9, 1); }
  }
  dropB.end(); for (let i = dn; i < dropPool.length; i++) dropPool[i].visible = false;
  // the tree you just felled, toppling
  // (drawn with the standing trees: treesFrame)
  // what's in the air: your arrows, stones, spears, axes; theirs too
  for (const q of rg.dshots || []) {
    if (q.f) continue;
    const ux = Math.cos(q.a), uy = Math.sin(q.a), z = q.land ? 2 : q.z || 18;
    if (q.kind === 'arrow' || q.kind === 'jav') { const L = q.kind === 'jav' ? 34 : 18, tilt = q.land ? 0.45 : 0; K.rod(P_CYL(4), q.x - ux * L, z + (q.land ? L * tilt : 0), q.y - uy * L, q.x, z, q.y, q.kind === 'jav' ? 0.9 : 0.5, hex('#a08a62')); K.add(P_CONE(4), q.x, z, q.y, 1.6, 3.4, 1.6, hex('#4d5560'), 0, 0, 0); }
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
