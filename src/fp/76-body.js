// ================= you, in third person: one smooth cartoon body on a skeleton, and how it moves =================
// The body is a single skinned mesh (tunic, trousers, boots, gloves, a knitted cap and scarf, a pack with a bedroll) that
// bends smoothly at every joint, with the game's dark outline round it. Each frame a pose is worked out from what the
// main game says you're doing, and every joint eases toward it, so one movement flows into the next. Blows are built the
// way a brawler's are: a wind-up that coils the body, a strike that throws the hips and shoulders through with a step in,
// a beat of follow-through, then the settle; the blade leaves a smear of light behind it.
// (Joe's character sheet) a red-orange beanie with a white bobble, a cream shirt with the sleeves rolled up, a dark harness and
// belt, a tan rucksack, taupe cargo trousers turned up at the ankle, brown lace-up boots
const BODY_COL = { tunic: [234, 224, 202], trou: [132, 118, 100], trouL: [138, 123, 104], boot: [112, 76, 52], sole: [50, 40, 34], lace: [200, 172, 130], skin: [218, 170, 130],
  rust: [200, 84, 48], rustD: [164, 64, 38], pack: [150, 122, 86], packD: [120, 94, 64], strap: [68, 48, 34], belt: [60, 44, 32], metal: [88, 80, 72], hair: [96, 64, 42], eye: [30, 26, 22],
  btn: [214, 202, 178], roll: [222, 210, 186], nose: [214, 154, 120], bob: [240, 232, 214], rib: [178, 70, 40] };
const BONES = [   // name, parent, rest position (relative to the parent)
  ['root', null, [0, 0, 0]], ['hips', 'root', [0, 17, 0]], ['spine', 'hips', [0, 3.4, 0]], ['chest', 'spine', [0, 5, 0]], ['neck', 'chest', [0, 5.6, 0]], ['head', 'neck', [0, 2, 0]],
  ['armR', 'chest', [5.6, 3.6, 0]], ['foreR', 'armR', [0.3, -7.2, 0]], ['handR', 'foreR', [0.1, -6.4, 0]],
  ['armL', 'chest', [-5.6, 3.6, 0]], ['foreL', 'armL', [-0.3, -7.2, 0]], ['handL', 'foreL', [-0.1, -6.4, 0]],
  ['legR', 'hips', [2.4, -0.4, 0]], ['shinR', 'legR', [0, -8.1, 0]], ['footR', 'shinR', [0, -7.6, 0]],
  ['legL', 'hips', [-2.4, -0.4, 0]], ['shinL', 'legL', [0, -8.1, 0]], ['footL', 'shinL', [0, -7.6, 0]],
  ['pack', 'chest', [0, 0.5, -4.3]], ['cap', 'head', [0, 3.2, -0.2]],
];
const BI = {}; BONES.forEach((b, i) => BI[b[0]] = i);
const BREST = {}; for (const [n, par, p] of BONES) { const q = par ? BREST[par] : [0, 0, 0]; BREST[n] = [q[0] + p[0], q[1] + p[1], q[2] + p[2]]; }

// ---- building the body: tubes and rounded lumps, each bound to its bones, welded into one mesh ----
// o: C a palette in place of yours, tint(rgb, x, y, z) to dirty or tear it, cap / pack false to leave them off, extra(kit) for more
function buildBody(o = {}) {
  const C = o.C || BODY_COL;
  const pos = [], nor = [], idx = [], skI = [], skW = [], tone = [];
  const push = (g, wfn, colfn) => {   // add a geometry; wfn(x, y, z) -> [[bone, w], ...]; colfn(x, y, z) -> rgb 0..255
    const base = pos.length / 3, p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i); pos.push(x, y, z); nor.push(n.getX(i), n.getY(i), n.getZ(i));
      const w = wfn(x, y, z).slice(0, 4); while (w.length < 4) w.push([0, 0]);
      const sum = w.reduce((a, b) => a + b[1], 0) || 1;
      skI.push(...w.map(q => BI[q[0]] ?? 0)); skW.push(...w.map(q => q[1] / sum));
      const c = o.tint ? o.tint(colfn(x, y, z), x, y, z) : colfn(x, y, z); tone.push(c[0] / 255, c[1] / 255, c[2] / 255);
    }
    const ix = g.index.array; for (let i = 0; i < ix.length; i++) idx.push(base + ix[i]);
  };
  // a tube along a straight line from a to b, its radius (rx across, rz front to back) given along the way; rounded shut at both ends
  const tube = (a, b, prof, wfn, colfn, seg = 14, sides = 12) => {
    const g = new THREE.CylinderGeometry(1, 1, 1, sides, seg, false), p = g.attributes.position, v = new V3();
    const dir = new V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = dir.length(); dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, -1, 0), dir);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const t = 0.5 - v.y;   // 0 at a, 1 at b
      const [rx, rz] = prof(clamp(t, 0, 1)), cap = v.y > 0.499 || v.y < -0.499 ? 0 : 1;
      v.set(v.x * rx * cap, -t * L, v.z * rz * cap).applyQuaternion(q).add(new V3(a[0], a[1], a[2])); p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals(); push(g, wfn, colfn);
  };
  const lump = (c, r, wfn, colfn, ws = 16, hs = 12, cut) => {
    const g = new THREE.SphereGeometry(1, ws, hs, 0, Math.PI * 2, 0, cut || Math.PI); g.scale(r[0], r[1], r[2]); g.translate(c[0], c[1], c[2]); push(g, wfn, colfn);
  };
  const one = n => () => [[n, 1]], col = c => () => C[c];
  const blend = (a, b, y0, y1) => (x, y) => { const k = smooth(clamp((y - y0) / (y1 - y0), 0, 1)); return [[a, 1 - k], [b, k]]; };
  const R = BREST;
  // the torso, hips to the base of the neck: broad at the chest, in at the waist
  const torsoProf = t => { const y = 14 + t * 17.2, r = y < 17 ? lerp(3.6, 4.9, (y - 14) / 3) : y < 21 ? lerp(4.9, 4.3, (y - 17) / 4) : y < 28 ? lerp(4.3, 5.7, smooth((y - 21) / 7))  : y < 28 ? 5.7 : lerp(3.0, 5.7, Math.sqrt(Math.max(0, 1 - ((y - 28) / 3.3) ** 2))); return [r * (t < 0.02 || t > 0.98 ? 0.6 : 1), r * 0.68]; };
  tube([0, 31.2, 0], [0, 14, 0], t => torsoProf(1 - t), (x, y) => {
    const w = []; const kS = smooth(clamp((y - 19) / 3, 0, 1)), kC = smooth(clamp((y - 24) / 3, 0, 1));
    w.push(['hips', 1 - kS], ['spine', kS * (1 - kC)], ['chest', kC]); return w.filter(q => q[1] > 0.001);
  }, (x, y) => y < 17.6 ? C.trou : y < 18.9 ? C.belt : C.tunic, 18, 14);
  // the belt's buckle, and the shirt's placket: a short row of buttons down from the collar
  lump([0, 18.2, 3.25], [1.1, 0.85, 0.45], one('hips'), col('metal'), 8, 6);
  for (const y of [29.4, 27.9, 26.4]) lump([0, y, 3.75 + (y - 26) * 0.08], [0.32, 0.32, 0.2], one('chest'), col('btn'), 6, 4);
  // neck and an open collar
  tube([0, 34.5, 0.2], [0, 30.5, 0], () => [1.8, 1.7], blend('chest', 'neck', 30.5, 33), () => C.skin, 4, 10);
  tube([0, 31.6, -0.1], [0, 30.4, 0], t => [2.7 + 0.5 * t, 2.2 + 0.4 * t], blend('chest', 'neck', 30.5, 32), col('tunic'), 3, 14);
  // the head: a round cartoon head, eyes, a nose, ears, brown hair showing below the cap at the back and sides
  lump([0, 36.4, 0.3], [3.9, 4.3, 3.9], one('head'), col('skin'), 18, 14);
  lump([0, 36.9, -0.75], [4.08, 3.9, 3.95], one('head'), col('hair'), 16, 12);
  for (const s of [-1, 1]) { lump([s * 1.45, 36.6, 3.85], [0.62, 0.85, 0.35], one('head'), col('eye'), 8, 6); lump([s * 3.85, 36.2, 0.4], [0.6, 1.1, 0.9], one('head'), col('skin'), 8, 6);
    lump([s * 3.6, 37.4, 1.4], [0.55, 1.2, 0.8], one('head'), col('hair'), 6, 6); }   // sideburns
  lump([0, 35.4, 4.1], [0.75, 0.8, 0.7], one('head'), col('nose'), 8, 6);
  // the beanie: a knitted crown, a deep ribbed turn-up, and the bobble
  if (o.cap !== false) {
    lump([0, 38.0, -0.1], [4.3, 4.3, 4.35], one('cap'), col('rust'), 18, 10, Math.PI * 0.52);
    tube([0, 39.2, -0.1], [0, 36.9, -0.1], () => [4.55, 4.55], one('cap'), (x, y, z) => Math.cos(Math.atan2(x, z + 0.1) * 16) > 0.1 ? C.rustD : C.rib, 4, 64);   // ribbed
    lump([0, 42.6, -0.4], [1.45, 1.4, 1.45], one('cap'), col('bob'), 10, 8);
  }
  // arms: the shirt's sleeve to the elbow, rolled up in a thick band, a bare forearm and a bare hand
  for (const s of [1, -1]) {
    const S = s > 0 ? 'R' : 'L', sh = R['arm' + S], el = R['fore' + S], wr = R['hand' + S];
    tube([s * 1.6, 31.7, -0.3], [sh[0] - s * 0.6, sh[1] - 0.2, sh[2] - 0.1], t => [1.5 + 0.55 * t, 1.55 + 0.45 * t], one('chest'), col('tunic'), 6, 10);   // the slope from neck to shoulder
    lump([sh[0] - s * 0.2, sh[1] - 1.0, sh[2]], [2.45, 2.65, 2.4], (x, y) => [['chest', 0.4], ['arm' + S, 0.6]], col('tunic'), 14, 12);   // a rounded shoulder
    tube(sh, el, t => [1.95 + 0.16 * Math.sin(Math.PI * t) - 0.25 * t, 1.88 + 0.12 * Math.sin(Math.PI * t) - 0.25 * t], (x, y) => { const k = smooth(clamp((sh[1] - y) / 2.2, 0, 1)); return [['chest', (1 - k) * 0.5], ['arm' + S, 1 - (1 - k) * 0.5]]; }, col('tunic'));
    tube([el[0], el[1] + 1.2, el[2]], [el[0], el[1] - 1.3, el[2]], () => [2.05, 2.0], (x, y) => { const k = smooth(clamp((el[1] + 0.4 - y) / 1.6, 0, 1)); return [['arm' + S, 1 - k], ['fore' + S, k]]; }, col('roll'), 3, 12);   // the roll
    tube([el[0], el[1] + 0.6, el[2]], wr, t => [1.5 + 0.14 * Math.sin(Math.PI * Math.min(1, t * 1.4)) - 0.38 * t, 1.38 + 0.1 * Math.sin(Math.PI * Math.min(1, t * 1.4)) - 0.32 * t], (x, y) => { const k = smooth(clamp((el[1] - y) / 1.8, 0, 1)); return [['arm' + S, 1 - k], ['fore' + S, k]]; }, col('skin'));
    // a mitten of a hand: a palm that widens to the knuckles and rounds off, curled a little forward, and a thumb along the front
    const handProf = t => { const r = t < 0.55 ? 1 : Math.sqrt(Math.max(0.04, 1 - ((t - 0.55) / 0.45) ** 2)); return [lerp(1.2, 1.5, Math.min(1, t / 0.55)) * r, lerp(1.0, 1.15, Math.min(1, t / 0.55)) * r]; };
    tube([wr[0], wr[1] + 0.3, wr[2]], [wr[0] + s * 0.1, wr[1] - 3.5, wr[2] + 0.7], handProf, one('hand' + S), col('skin'), 10, 12);
    tube([wr[0] - s * 0.55, wr[1] - 0.6, wr[2] + 0.8], [wr[0] - s * 0.75, wr[1] - 2.3, wr[2] + 1.55], t => { const r = Math.sqrt(Math.max(0.05, 1 - ((t - 0.35) / 0.65) ** 2)); return [0.62 * r, 0.6 * r]; }, one('hand' + S), col('skin'), 6, 8);   // the thumb
  }
  // legs: cargo trousers with a pocket on each thigh, turned up at the ankle over brown lace-up boots with a dark sole
  for (const s of [1, -1]) {
    const S = s > 0 ? 'R' : 'L', hp = R['leg' + S], kn = R['shin' + S], an = R['foot' + S];
    tube([hp[0], hp[1] + 1.2, hp[2]], kn, t => [2.6 + 0.12 * Math.sin(Math.PI * t * 0.8) - 0.62 * t, 2.55 + 0.18 * Math.sin(Math.PI * t * 0.8) - 0.6 * t], (x, y) => { const k = smooth(clamp((hp[1] + 1 - y) / 3, 0, 1)); return [['hips', 1 - k], ['leg' + S, k]]; }, col('trou'));
    lump([kn[0], kn[1] + 0.3, kn[2] + 1.15], [1.55, 1.6, 1.05], (x, y) => [['leg' + S, 0.5], ['shin' + S, 0.5]], col('trou'), 8, 6);   // the knee, a soft bump in the cloth
    lump([hp[0] + s * 2.15, (hp[1] + kn[1]) / 2 - 0.6, hp[2] + 0.2], [0.75, 2.0, 1.7], one('leg' + S), col('trouL'), 8, 6);   // the cargo pocket
    lump([hp[0] + s * 2.45, (hp[1] + kn[1]) / 2 + 1.0, hp[2] + 0.2], [0.45, 0.6, 1.75], one('leg' + S), col('trou'), 6, 4);    // its flap
    tube([kn[0], kn[1] + 0.8, kn[2]], [an[0], an[1] + 2.5, an[2]], t => [1.98 + 0.14 * Math.sin(Math.PI * Math.min(1, t * 1.6)) - 0.3 * t, 1.95 + 0.22 * Math.sin(Math.PI * Math.min(1, t * 1.6)) - 0.3 * t], (x, y) => { const k = smooth(clamp((kn[1] + 0.5 - y) / 1.8, 0, 1)); return [['leg' + S, 1 - k], ['shin' + S, k]]; }, col('trou'));
    tube([an[0], an[1] + 6.6, an[2]], [an[0], an[1] + 4.9, an[2]], () => [2.35, 2.3], one('shin' + S), col('trouL'), 3, 14);   // turned up
    tube([an[0], an[1] + 5.0, an[2]], [an[0], an[1] + 0.2, an[2] + 0.2], () => [2.1, 2.1], (x, y) => { const k = smooth(clamp((an[1] + 3 - y) / 2.5, 0, 1)); return [['shin' + S, 1 - k], ['foot' + S, k]]; }, col('boot'), 6, 12);
    lump([an[0], an[1] - 0.2, an[2] + 1.7], [2.15, 1.45, 3.45], one('foot' + S), col('boot'), 12, 8);
    lump([an[0], an[1] - 1.25, an[2] + 1.6], [2.3, 0.62, 3.65], one('foot' + S), col('sole'), 12, 6);
    for (let k = 0; k < 3; k++) lump([an[0], an[1] + 0.9 + k * 1.15, an[2] + 2.0 - k * 0.15], [1.0, 0.22, 0.3], one(k < 1 ? 'foot' + S : 'shin' + S), col('lace'), 6, 4);
  }
  if (o.pack !== false) {
    // the rucksack: a rounded tan body, a darker flap over its top with a strap and buckle down the middle, a pocket each side
    const P = R.pack;
    lump([0, P[1] + 0.2, P[2] - 0.9], [4.6, 5.6, 2.9], one('pack'), col('pack'), 14, 12);
    lump([0, P[1] + 3.0, P[2] - 1.0], [4.75, 3.1, 3.15], one('pack'), col('packD'), 14, 10, Math.PI * 0.62);
    tube([0, P[1] + 4.6, P[2] - 4.0], [0, P[1] - 1.4, P[2] - 3.75], () => [0.55, 0.22], one('pack'), col('strap'), 4, 6);
    lump([0, P[1] - 0.6, P[2] - 3.9], [0.6, 0.45, 0.25], one('pack'), col('metal'), 6, 4);
    for (const s of [-1, 1]) lump([s * 4.4, P[1] - 1.4, P[2] - 0.8], [1.0, 2.2, 1.8], one('pack'), col('packD'), 8, 6);
    // the harness: straps from the pack over each shoulder and down the chest to the belt, joined by a strap and buckle across the chest
    for (const s of [-1, 1]) {
      tube([s * 3.1, 30.9, -2.6], [s * 3.2, 31.6, 0.4], () => [0.85, 0.4], one('chest'), col('strap'), 3, 6);
      tube([s * 3.2, 31.0, 1.4], [s * 3.45, 19.4, 3.25], () => [0.85, 0.35], (x, y) => [['chest', smooth(clamp((y - 19) / 6, 0, 1))], ['spine', 1 - smooth(clamp((y - 19) / 6, 0, 1))]], col('strap'), 5, 6);
    }
    tube([-3.4, 26.8, 3.95], [3.4, 26.8, 3.95], () => [0.38, 0.3], one('chest'), col('strap'), 2, 6);
    lump([0, 26.8, 4.15], [0.95, 0.7, 0.35], one('chest'), col('metal'), 6, 4);
  }
  if (o.extra) o.extra({ tube, lump, one, col, blend, R, C });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skW, 4));
  g.setAttribute('tone', new THREE.Float32BufferAttribute(tone, 3)); g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new V3(0, 20, 0), 40);
  return g;
}
const BODY_V = (outline) => `#include <common>
  ${TERR_GLSL}
  #include <skinning_pars_vertex>
  attribute vec3 tone; varying vec3 vC, vW, vN;
  void main() {
    #include <skinbase_vertex>
    #include <beginnormal_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    ${outline ? 'transformed += normalize(objectNormal) * 0.5;' : ''}
    vec4 w = modelMatrix * vec4(transformed, 1.0); w.y += terrH(modelMatrix[3].xz); vW = w.xyz; vN = normalize(mat3(modelMatrix) * objectNormal); vC = tone;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const bodyMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ flash: { value: 0 } }, LU),
  vertexShader: BODY_V(false),
  fragmentShader: LIGHT_GLSL + `uniform float flash; varying vec3 vC, vW, vN;
    void main() {
      vec3 N = normalize(vN), V = normalize(camPos - vW), L = lightAt(vW, N, 1.0);
      float lum = dot(L, vec3(0.3, 0.55, 0.15)), band = floor(lum * 3.0 + 0.5) / 3.0;
      vec3 l = L * mix(1.0, band / max(lum, 0.05), 0.35);   // a little banded, like painted shading
      vec3 c = vC * l * 1.08;
      c += vC * pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.35 * (0.35 + lum);   // a soft rim of light round the edge
      c = mix(c, vec3(1.0, 0.92, 0.85), flash);
      gl_FragColor = vec4(fogged(grey(c), vW), 1.0);
    }`,
});
const bodyEdge = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU), side: THREE.BackSide, vertexShader: BODY_V(true),
  fragmentShader: LIGHT_GLSL + `varying vec3 vC, vW, vN;
    void main() { vec3 L = lightAt(vW, vec3(0.0), 0.0); float b = clamp(dot(L, vec3(0.34)) * 2.2, 0.0, 1.0); gl_FragColor = vec4(fogged(vec3(0.13, 0.12, 0.11) * b, vW), 1.0); }`,
});
const BODY = (() => {
  const geo = buildBody(), bones = BONES.map(([n, , p]) => { const b = new THREE.Bone(); b.name = n; b.position.set(p[0], p[1], p[2]); return b; });
  BONES.forEach(([n, par], i) => { if (par) bones[BI[par]].add(bones[i]); });
  const mesh = new THREE.SkinnedMesh(geo, bodyMat), edge = new THREE.SkinnedMesh(geo, bodyEdge);
  const sk = new THREE.Skeleton(bones);
  mesh.add(bones[0]); mesh.bind(sk); edge.bind(sk, mesh.bindMatrix);
  mesh.frustumCulled = edge.frustumCulled = false; mesh.visible = edge.visible = false;
  scene.add(castsShadow(mesh)); scene.add(edge);
  const B = {}; bones.forEach(b => B[b.name] = b);
  const cur = {}; for (const [n] of BONES) cur[n] = [0, 0, 0];
  return { mesh, edge, B, cur, root: [0, 0, 0], face: undefined, deadT: 0, atk: null, lastU: 0 };
})();

// ---- the smear behind the blade: a ribbon of light from the weapon's tip in the world ----
const SMEAR_N = 16, smPos = new Float32Array(SMEAR_N * 2 * 3), smA = new Float32Array(SMEAR_N * 2), smGeo = new THREE.BufferGeometry();
smGeo.setAttribute('position', new THREE.BufferAttribute(smPos, 3).setUsage(THREE.DynamicDrawUsage));
smGeo.setAttribute('ta', new THREE.BufferAttribute(smA, 1).setUsage(THREE.DynamicDrawUsage));
{ const ix = []; for (let i = 0; i < SMEAR_N - 1; i++) { const a = i * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } smGeo.setIndex(ix); }
const smear = new THREE.Mesh(smGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  uniforms: { tcol: { value: new V3(1, 0.8, 0.55) } },
  vertexShader: `attribute float ta; varying float vA; void main() { vA = ta; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 tcol; varying float vA; void main() { gl_FragColor = vec4(mix(tcol, vec3(1.0, 0.98, 0.94), smoothstep(0.55, 1.0, vA)) * vA, 1.0); }`,
}));
smear.frustumCulled = false; smear.renderOrder = 6; scene.add(smear);
const smPts = [];

// ---- the pose: worked out fresh each frame, then every joint eases toward it ----
const ease = {
  out: u => 1 - Math.pow(1 - u, 3), inOut: u => u * u * (3 - 2 * u),
  back: u => { const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },   // overshoots, then settles
};
// three beats of a blow: coil (0..1), strike (0..1, overshooting), settle (0..1)
function beats(u, w = 0.2, s = 0.24) { return [ease.inOut(clamp(u / w, 0, 1)), ease.back(clamp((u - w) / s, 0, 1)), ease.inOut(clamp((u - w - s - 0.08) / (1 - w - s - 0.08), 0, 1))]; }
const bmix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function through(rest, coil, hit, b) { const [c, h, r] = b; return bmix(bmix(bmix(rest, coil, c), hit, h), rest, r); }

const _bm = new M4(), _bq = new THREE.Quaternion(), _bv = new V3(), _be = new THREE.Euler();
// ---- the bow, held properly ----
// Joe: the bow floated beside you while you held the torch up. Now the bow lives in your left fist: carried low and upright
// when you're not shooting (the torch goes on your belt, still lit), and when you draw, the bow arm points straight down
// your aim, the right hand takes the string back to your chin and the arrow lies along the line between them.
const BOW_GRIP = 8.4, ARM_U = 7.2, ARM_F = 8;   // the grip's distance in front of the string; upper arm; forearm to the middle of the fist
const _bx = new V3(), _by = new V3(), _bz = new V3(), _bw = new V3(), _bqc = new THREE.Quaternion(), _bmA = new M4();
function chestQ(P) {   // the chest's turn relative to your body, from the pose about to be eased toward
  _bqc.identity(); for (const n of ['hips', 'spine', 'chest']) _bqc.multiply(_bq.setFromEuler(_be.set(P[n][0], P[n][1], P[n][2], 'YXZ')));
  return _bqc.clone().invert();
}
function armFrame(dir, side) {   // an arm bone's rotation (in the chest) so it runs along dir, its front (+Z, the way the elbow bends) toward side
  _by.copy(dir).negate().normalize(); _bz.copy(side).addScaledVector(_by, -side.dot(_by)).normalize(); _bx.crossVectors(_by, _bz);
  _bmA.makeBasis(_bx, _by, _bz); _be.setFromRotationMatrix(_bmA, 'YXZ'); return [_be.x, _be.y, _be.z];
}
function armReach(sh, T, pole) {   // two bones from the shoulder to the point T, the elbow out toward pole: [upper arm, elbow bend]
  const D = T.clone().sub(sh), d = clamp(D.length(), 2, ARM_U + ARM_F - 0.05); D.normalize();
  const a = Math.acos(clamp((ARM_U * ARM_U + d * d - ARM_F * ARM_F) / (2 * ARM_U * d), -1, 1));
  const pp = pole.clone().addScaledVector(D, -pole.dot(D)).normalize();
  const u = D.clone().multiplyScalar(Math.cos(a)).addScaledVector(pp, Math.sin(a)), E = sh.clone().addScaledVector(u, ARM_U);
  const f = sh.clone().addScaledVector(D, d).sub(E).normalize(), bend = Math.acos(clamp(u.dot(f), -1, 1));
  return [armFrame(u, f.clone().sub(u)), -bend];
}
function bowArms(P, c) {
  const iq = chestQ(P), fwd = new V3(0, 0, 1).applyQuaternion(iq), up = new V3(0, 1, 0).applyQuaternion(iq);
  const chin = new V3(0.8, 6.1, 2.6), shL = new V3(-5.6, 3.6, 0), shR = new V3(5.6, 3.6, 0);
  // the bow arm: straight out from the shoulder, aimed so the line from your chin through the grip runs along your aim
  const grip = chin.clone().addScaledVector(fwd, 14).addScaledVector(up, -0.8), dirL = grip.clone().sub(shL).normalize();
  P.armL = armFrame(dirL, up); P.foreL = [-0.06, 0, 0]; P.handL = [0, 0, 0];
  // the string hand: from the string at the bow back to your chin as you draw, the elbow up and out behind
  const H = grip.clone().addScaledVector(fwd, -(5 + 9 * c)).lerp(chin, c);
  const [aR, bR] = armReach(shR, H, new V3(1, 0.4, 0).addScaledVector(fwd, -1.2));
  P.armR = aR; P.foreR = [bR, 0, 0]; P.handR = [0.2, 0, 0];
}
function bowNock(G, draw) {   // the string to your right fist, and the arrow from there through the grip
  const ar = G.getObjectByName('arrow');
  if (!draw) { vmString(G, 0); ar.visible = false; return; }
  G.updateMatrixWorld(true);
  _bmA.copy(TP.hold.matrix).invert();
  const N = _bw.set(0, -1.6, 0.3).applyMatrix4(BODY.B.handR.matrixWorld); N.y += terrH(BODY.mesh.position.x, BODY.mesh.position.z); N.applyMatrix4(_bmA);
  N.z = clamp(N.z, -3.4, 16); vmString(G, 0, N);
  const d = _bv.set(0, 0.5, -BOW_GRIP).sub(N).normalize();
  ar.visible = dayAmmoN('bow') > 0; ar.quaternion.setFromUnitVectors(_bz.set(0, 0, -1), d); ar.position.copy(N).addScaledVector(d, 2);
}
function posePlayer(now) {
  const p = S.p, D = S.day, rg = S.rg, s = heldSlot(), id = s ? s.id : null, T = id ? DIT[id] : null, dt = Math.min(0.05, frameDtTP);
  const X = BODY, P = {}; for (const [n] of BONES) P[n] = [0, 0, 0];
  const v = Math.hypot(p.vx, p.vy), gk = Math.min(1, v / RUN) + 0.6 * SPR.k, wk = Math.min(1, v / WALK), ph = p.phase || 0, t = now;
  const A = p.atk && p.atk.t < p.atk.dur ? p.atk : null, Wa = p.wact && !p.wact.hold && !D.draw && p.wact.t < (p.wact.dur || 0.4) ? p.wact : null, act = p.act && p.act.t < p.act.dur ? p.act : null;
  // which way you face: you snap to your aim for a blow or a shot, otherwise you turn smoothly into the way you're going
  const aimF = A || Wa || D.draw, want = aimF || v < 12 ? S.aimW : Math.atan2(p.vy, p.vx);
  X.face = X.face === undefined ? want : X.face + angDiff(want, X.face) * Math.min(1, dt * (aimF ? 30 : 18));
  let rootY = 0, lunge = 0, side = 0, rollX = 0, stiff = 14;
  const lean = (k) => { P.spine[0] += k * 0.55; P.chest[0] += k * 0.35; };
  // ---- moving: a run with real weight in it, or standing and breathing ----
  if (v > 4) {
    const sw = Math.sin(ph), cw = Math.cos(ph), k = 0.35 + 0.65 * gk;
    P.legL[0] = -sw * 0.85 * k; P.legR[0] = sw * 0.85 * k;
    P.shinL[0] = 0.2 + 1.35 * k * Math.max(0, cw) ** 1.5 + 0.15 * k; P.shinR[0] = 0.2 + 1.35 * k * Math.max(0, -cw) ** 1.5 + 0.15 * k;
    P.footL[0] = -P.legL[0] * 0.5 - P.shinL[0] * 0.55 + 0.15; P.footR[0] = -P.legR[0] * 0.5 - P.shinR[0] * 0.55 + 0.15;
    // arms swing from the shoulder against the legs, the elbow bending more as each comes forward, a little out from the body
    P.armL[0] = sw * (0.55 + 0.3 * gk) * k; P.armR[0] = -sw * (0.55 + 0.3 * gk) * k; P.armL[2] = -0.13 - 0.04 * Math.max(0, -sw) * k; P.armR[2] = 0.13 + 0.04 * Math.max(0, sw) * k;
    P.foreL[0] = -0.35 - 0.55 * k - 0.45 * k * Math.max(0, -sw); P.foreR[0] = -0.35 - 0.55 * k - 0.45 * k * Math.max(0, sw);
    P.armL[1] = 0.1 * sw * k; P.armR[1] = 0.1 * sw * k;
    // the hips turn with the leading leg and the shoulders against them; the weight rocks over onto each foot as it lands
    P.hips[1] = sw * 0.22 * k; P.chest[1] = -sw * 0.32 * k; P.hips[2] = -cw * 0.09 * k; P.chest[2] = cw * 0.05 * k; P.head[1] = sw * 0.08 * k; P.head[2] = -cw * 0.03 * k;
    lean(0.12 + 0.35 * gk); P.head[0] -= 0.2 * gk;
    rootY = Math.abs(cw) * (1.5 + 0.8 * (1 - gk)) * k - 0.6 * k;   // a springy bounce: more of it at a walk
    P.pack[0] = -Math.abs(cw) * 0.12 * k; P.cap[0] = -0.1 * k;
  } else {   // idle: breathing, weight on one hip, hands loose
    // breathing lifts the chest and shoulders; every so often the weight drifts from one hip to the other and the head looks round
    const br = Math.sin(t * 1.9), shift = Math.sin(t * 0.33) * 0.7 + Math.sin(t * 0.13 + 1) * 0.3, look = Math.sin(t * 0.21) * 0.6 + Math.sin(t * 0.53 + 2) * 0.4;
    P.chest[0] = br * 0.03; P.spine[0] = -br * 0.01; P.head[0] = -br * 0.02 + 0.03 * Math.sin(t * 0.4); P.head[1] = look * 0.22;
    P.hips[2] = 0.05 * shift; P.chest[2] = -0.035 * shift; P.legL[2] = -0.04 + 0.03 * shift; P.legR[2] = 0.02 + 0.03 * shift;
    P.shinL[0] = 0.1 + 0.08 * Math.max(0, shift); P.shinR[0] = 0.04 + 0.08 * Math.max(0, -shift);
    P.armL[2] = -0.14 - br * 0.025; P.armR[2] = 0.14 + br * 0.025; P.armL[0] = 0.04 * shift; P.armR[0] = -0.04 * shift;
    P.foreL[0] = -0.35; P.foreR[0] = -0.45; rootY = -0.3 + br * 0.08 - 0.15 * Math.abs(shift);
  }
  // ---- sneaking: low, knees bent, weight forward ----
  const cr = D.crK || 0;
  if (cr > 0) { rootY -= 4.5 * cr; P.legL[0] -= 0.75 * cr; P.legR[0] -= 0.75 * cr; P.shinL[0] += 1.3 * cr; P.shinR[0] += 1.3 * cr; P.footL[0] -= 0.5 * cr; P.footR[0] -= 0.5 * cr; lean(0.5 * cr); P.foreL[0] -= 0.6 * cr; P.foreR[0] -= 0.6 * cr; }
  // ---- what's in your hand when you're not swinging it ----
  const spearish = T && (T.wpn === 'spear' || T.thr === 'jav'), bow = T && T.tool === 'bow', armed = T && (T.wpn || T.tool);
  if (armed && !bow) { P.armR[0] += -0.25; P.foreR[0] += -0.55; P.handR[0] = -0.2; }
  if (bow) { P.armL = [-0.15 + 0.4 * P.armL[0], 0.15, -0.22]; P.foreL = [-1.2, 0, 0]; P.handL = [0, 0, 0.25]; }   // the bow carried low in front, upright, ready
  // ---- a blow ----
  const kind = A ? (A.ov ? 'chop' : A.pose === 3 || spearish ? 'thrust' : A.i === 2 ? 'slam' : A.i === 3 ? 'thrust' : A.side < 0 ? 'back' : 'fore') : Wa ? 'slam' : null;
  if (kind) {
    const u = (A || Wa).t / ((A || Wa).dur || 0.4), b = beats(u), sd = 1;
    stiff = 34;
    const fy = kind === 'fore' || kind === 'back' ? -1 : 1, set = (n, rest, coil, hit) => { P[n] = through(P[n].map((q, i) => q + rest[i]), [coil[0], coil[1] * fy, coil[2]], [hit[0], hit[1] * fy, hit[2]], b); };
    if (kind === 'fore') {        // forehand: coil the blade back over your right shoulder, then whip it round across you, hips first
      set('hips', [0, 0, 0], [0, 0.25, 0], [0.05, -0.3, 0]); set('spine', [0.1, 0, 0], [0, 0.2, 0.05], [0.3, -0.25, -0.05]); set('chest', [0, 0, 0], [-0.1, 0.35, 0], [0.15, -0.45, 0]);
      set('armR', [0, 0, 0], [-1.2, 0.3, 1.5], [-1.45, -0.5, -0.2]); set('foreR', [0, 0, 0], [-1.6, 0, 0], [-0.15, 0, 0]); set('handR', [0, 0, 0], [0.5, 0, 0], [1.25, 0, 0]);
      set('armL', [0, 0, 0], [-0.5, 0, -0.4], [0.5, 0, -0.5]); set('foreL', [0, 0, 0], [-1.2, 0, 0], [-0.9, 0, 0]);
      set('legL', [0, 0, 0], [0.2, 0, 0], [-0.75, 0, 0]); set('shinL', [0, 0, 0], [0.4, 0, 0], [0.45, 0, 0]); set('legR', [0, 0, 0], [-0.2, 0, 0], [0.45, 0, 0]); set('shinR', [0, 0, 0], [0.5, 0, 0], [0.2, 0, 0]);
      set('head', [0, 0, 0], [0, -0.2, 0], [0, 0.3, 0]);
      lunge = through([0, 0, 0], [-2.5, 0, 0], [8, 0, 0], b)[0]; rootY += through([0, 0, 0], [0.5, 0, 0], [-2.2, 0, 0], b)[0];
    } else if (kind === 'back') {  // backhand: the blade comes across your chest and lashes back out the other way
      set('hips', [0, 0, 0], [0, -0.3, 0], [0.05, 0.3, 0]); set('spine', [0.1, 0, 0], [0.1, -0.25, 0], [0.25, 0.25, 0.05]); set('chest', [0, 0, 0], [0.1, -0.4, 0], [0.1, 0.45, 0]);
      set('armR', [0, 0, 0], [-1.35, -0.9, -0.5], [-1.2, 0.6, 1.4]); set('foreR', [0, 0, 0], [-1.9, 0, 0], [-0.2, 0, 0]); set('handR', [0, 0, 0], [0.3, 0, 0], [1.25, 0, 0]);
      set('armL', [0, 0, 0], [0.4, 0, -0.6], [-0.4, 0, -0.3]); set('foreL', [0, 0, 0], [-0.9, 0, 0], [-1.3, 0, 0]);
      set('legR', [0, 0, 0], [0.2, 0, 0], [-0.7, 0, 0]); set('shinR', [0, 0, 0], [0.4, 0, 0], [0.45, 0, 0]); set('legL', [0, 0, 0], [-0.2, 0, 0], [0.45, 0, 0]); set('shinL', [0, 0, 0], [0.5, 0, 0], [0.2, 0, 0]);
      set('head', [0, 0, 0], [0, 0.25, 0], [0, -0.3, 0]);
      lunge = through([0, 0, 0], [-2, 0, 0], [7, 0, 0], b)[0]; rootY += through([0, 0, 0], [0.4, 0, 0], [-2, 0, 0], b)[0];
    } else if (kind === 'slam' || kind === 'chop') {   // overhead: both hands up and back, a rise on the toes, then everything driven down
      const big = kind === 'slam' ? 1 : 0.7;
      set('spine', [0, 0, 0], [-0.35 * big, 0, 0], [0.65 * big, 0, 0]); set('chest', [0, 0, 0], [-0.3 * big, 0.15, 0], [0.45 * big, -0.1, 0]);
      set('armR', [0, 0, 0], [-2.9, 0, 0.3], [-0.7, 0, 0.15]); set('foreR', [0, 0, 0], [-1.3, 0, 0], [-0.2, 0, 0]); set('handR', [0, 0, 0], [0.6, 0, 0], [-0.3, 0, 0]);
      set('armL', [0, 0, 0], [-2.7, 0, -0.3], [-0.8, 0, -0.2]); set('foreL', [0, 0, 0], [-1.4, 0, 0], [-0.4, 0, 0]);
      set('legL', [0, 0, 0], [-0.1, 0, 0], [-0.9 * big, 0, 0]); set('shinL', [0, 0, 0], [0.1, 0, 0], [1.1 * big, 0, 0]); set('legR', [0, 0, 0], [0.1, 0, 0], [0.5 * big, 0, 0]); set('shinR', [0, 0, 0], [0.2, 0, 0], [0.9 * big, 0, 0]);
      set('head', [0, 0, 0], [-0.3, 0, 0], [-0.2, 0, 0]);
      lunge = through([0, 0, 0], [-1.5, 0, 0], [6 * big, 0, 0], b)[0]; rootY += through([0, 0, 0], [2.5 * big, 0, 0], [-4.5 * big, 0, 0], b)[0];
    } else {                       // a thrust: drawn right back, then everything behind the point as it drives out
      set('hips', [0, 0, 0], [0, 0.4, 0], [0.1, -0.35, 0]); set('spine', [0, 0, 0], [-0.1, 0.35, 0], [0.45, -0.3, 0]); set('chest', [0, 0, 0], [0, 0.4, 0], [0.2, -0.45, 0]);
      set('armR', [0, 0, 0], [0.5, 0, 0.35], [-1.55, 0, 0.05]); set('foreR', [0, 0, 0], [-1.9, 0, 0], [-0.05, 0, 0]); set('handR', [0, 0, 0], [0, 0, 0], [0, 0, 0]);
      set('armL', [0, 0, 0], [-1.1, 0, -0.3], [0.6, 0, -0.4]); set('foreL', [0, 0, 0], [-0.8, 0, 0], [-0.5, 0, 0]);
      set('legL', [0, 0, 0], [0.1, 0, 0], [-1.0, 0, 0]); set('shinL', [0, 0, 0], [0.5, 0, 0], [0.35, 0, 0]); set('legR', [0, 0, 0], [-0.1, 0, 0], [0.65, 0, 0]); set('shinR', [0, 0, 0], [0.3, 0, 0], [0.15, 0, 0]);
      lunge = through([0, 0, 0], [-3, 0, 0], [12, 0, 0], b)[0]; rootY += through([0, 0, 0], [-0.5, 0, 0], [-2.8, 0, 0], b)[0];
    }
    // a heavy weapon swings bigger and slower through the body
    if (T && (T.wpn === 'waxe' || T.wpn === 'club' || T.wpn === 'bone' || id === 'maul')) { P.chest[1] *= 1.15; lunge *= 1.15; }
  } else if (D.draw && bow) {   // the bow: side on, the bow arm straight out along your aim, the string drawn back to your chin
    const c = clamp(D.draw.t / (RNG.bow ? RNG.bow.full : 0.8), 0, 1); stiff = 22;
    P.hips[1] = 0.45; P.chest[1] = 0.4; P.head[1] = -0.75; P.head[0] = 0.12; P.spine[0] = 0.05;
    P.legL[0] = -0.3; P.legR[0] = 0.25; P.shinL[0] = 0.25; P.shinR[0] = 0.2;
    bowArms(P, ease.inOut(c));
  } else if (D.draw) {         // the sling, whirling over your head
    P.armR = [-2.7, 0, 0.3 + 0.25 * Math.sin(t * 16)]; P.foreR = [-0.5 - 0.3 * Math.cos(t * 16), 0, 0]; P.chest[1] = 0.3;
  } else if (act) {
    const u = act.t / act.dur, k = Math.sin(Math.PI * Math.min(1, u * 1.1)); stiff = 16;
    if (act.pose === 8 || act.pose === 9) { P.armR = bmix(P.armR, [-1.3, -0.4, 0.2], k); P.foreR = bmix(P.foreR, [-2.4, 0, 0], k); P.head[0] -= 0.25 * k; }   // to your mouth
    else if (act.pose === 7) { rootY -= 7 * k; lean(1.1 * k); P.legL[0] -= 1.1 * k; P.legR[0] -= 0.5 * k; P.shinL[0] += 1.6 * k; P.shinR[0] += 1.2 * k; P.armR = bmix(P.armR, [-1.1, 0, 0.2], k); P.foreR[0] = -0.2; }
    else if (act.pose === 10) { const c = Math.abs(Math.sin(u * Math.PI * 3)); lean(0.4); P.armR = [-1.0 - 1.4 * (1 - c), 0, 0.2]; P.foreR = [-0.9, 0, 0]; P.armL = [-0.9, 0, -0.2]; P.foreL = [-1.2, 0, 0]; }
    else if (act.pose === 11) { const c = Math.sin(u * Math.PI * 4), q = act.cont ? 1 : Math.min(1, u * 6); rootY -= 8 * q; lean(0.9 * q); P.legL[0] -= 1.2 * q; P.legR[0] -= 0.3 * q; P.shinL[0] += 1.7 * q; P.shinR[0] += 1.9 * q; P.armR = [-1.0 + 0.3 * c, 0, 0.3 + 0.2 * c]; P.foreR = [-0.5 - 0.3 * c, 0, 0]; P.armL = [-0.8, 0, -0.3]; P.foreL = [-0.9, 0, 0]; }   // knelt at a body, cutting (88-meat)
    else { P.armR = bmix(P.armR, [-1.3, 0, 0.1], k); P.foreR = bmix(P.foreR, [-0.6, 0, 0], k); }
  }
  // your torch, held up and out in the left hand by night; with a bow in that hand it hangs from your belt instead, still lit
  const lit = S.torchLvl > 0.05 || S.torchOn, torch = lit && !bow && !(kind === 'slam' || kind === 'chop');
  if (torch) { P.armL = [-1.15, 0.25, -0.1]; P.foreL = [-0.55, 0, 0]; P.handL = [0.35, 0, 0]; }
  // a dash: low and long, arms swept back, one leg reaching
  const rollU = p.roll > 0 ? 1 - p.roll / ROLL_T : -1;
  if (rollU >= 0) {
    const k = Math.sin(Math.PI * Math.min(1, rollU * 1.15)); stiff = 40;
    lean(1.5 * k); P.head[0] -= 0.6 * k; P.armL = bmix(P.armL, [1.2, 0, -0.45], k); P.armR = bmix(P.armR, [1.1, 0, 0.45], k); P.foreL[0] = -0.3; P.foreR[0] = -0.3;
    P.legL[0] = -1.05 * k; P.shinL[0] = 0.6; P.legR[0] = 0.9 * k; P.shinR[0] = 1.3 * k; rootY -= 4 * k;
    if (Math.random() < 0.6) { const a = X.face + Math.PI + (Math.random() - 0.5) * 0.8; spark(p.x, 2, p.y, Math.cos(a) * 40, 12 + Math.random() * 20, Math.sin(a) * 40, 0.4, 8 + Math.random() * 6, 0.62, 0.55, 0.45, 0.35, 0, -10, 2); }
  }
  // hurt: knocked back, chin up; dead: pitched forward onto your face, away from the camera
  const hk = CFX.hurt ? Math.max(0, 1 - CFX.hurt.t / 0.35) : 0;
  if (hk > 0) { P.spine[0] -= 0.45 * hk; P.chest[0] -= 0.25 * hk; P.head[0] -= 0.35 * hk; P.armL[2] -= 0.5 * hk; P.armR[2] += 0.5 * hk; lunge -= 4 * hk; }
  X.deadT = rg.phase === 'dead' ? X.deadT + dt : 0;
  if (X.deadT > 0) { const k = ease.back(Math.min(1, X.deadT / 0.6)); rollX = 1.45 * k; rootY += 2 * k; P.armL = [-2.5, 0.2, -0.5]; P.armR = [-2.2, -0.2, 0.6]; P.foreL[0] = -0.4; P.foreR[0] = -0.3; P.legL[0] = 0.2; P.shinL[0] = 1.1; P.head[0] = -0.5; stiff = 10; }
  // ease every joint toward the pose
  const k = 1 - Math.exp(-stiff * dt);
  for (const [n] of BONES) { const c = X.cur[n], q = P[n]; for (let i = 0; i < 3; i++) c[i] += (q[i] - c[i]) * k; X.B[n].rotation.set(c[0], c[1], c[2], 'YXZ'); }
  // the pack rides on a spring: it lags the bounce, sways as your weight rocks and swings out a little as you turn
  { const pk = X.pk || (X.pk = { a: [0, 0], v: [0, 0], y: X.root[1], f: X.face });
    const vy = (X.root[1] - pk.y) / Math.max(dt, 1e-3), turn = angDiff(X.face, pk.f) / Math.max(dt, 1e-3); pk.y = X.root[1]; pk.f = X.face;
    const want = [clamp(vy * 0.012, -0.12, 0.12), clamp(-X.cur.hips[2] * 0.8 - turn * 0.04, -0.2, 0.2)];
    for (let i = 0; i < 2; i++) { pk.v[i] += ((want[i] - pk.a[i]) * 120 - pk.v[i] * 9) * dt; pk.a[i] += pk.v[i] * dt; }
    X.B.pack.rotation.x += pk.a[0]; X.B.pack.rotation.z += pk.a[1]; }
  // the pack and cap swing a beat behind you
  X.root[0] += (lunge - X.root[0]) * (1 - Math.exp(-(kind ? 30 : 12) * dt)); X.root[1] += (rootY - X.root[1]) * (1 - Math.exp(-20 * dt));
  const fx = Math.cos(X.face), fy = Math.sin(X.face);
  X.mesh.position.set(p.x + fx * X.root[0], X.root[1], p.y + fy * X.root[0]);
  X.mesh.rotation.set(rollX, faceYaw(X.face), 0, 'YXZ');
  X.edge.position.copy(X.mesh.position); X.edge.rotation.copy(X.mesh.rotation);
  X.mesh.visible = X.edge.visible = true;
  bodyMat.uniforms.flash.value = Math.max(0, CFX.hurt ? 0.7 * (1 - CFX.hurt.t / 0.15) : 0);
  X.mesh.updateMatrixWorld(true); X.edge.updateMatrixWorld(true);
  // what's in your hand: the same model as in first person, gripped in your fist
  if (id !== TP.holdId) {
    if (TP.holdId && TP.items.has(TP.holdId)) TP.items.get(TP.holdId).visible = false;
    TP.holdId = id;
    if (id) { if (!TP.items.has(id)) { const G = castsShadow(itemModel(id).clone(true)); TP.hold.add(G); TP.items.set(id, G); } TP.items.get(id).visible = true; }
  }
  const hand = bow ? X.B.handL : X.B.handR;
  if (id && TP.items.has(id)) {
    TP.items.get(id).position.set(0, 0, 0); TP.items.get(id).rotation.set(0, 0, 0);
    TP.hold.matrix.makeTranslation(0, terrH(X.mesh.position.x, X.mesh.position.z), 0).multiply(hand.matrixWorld).multiply(_bm.makeTranslation(0, -1.6, 0.3));
    if (bow) TP.hold.matrix.multiply(_bm.makeBasis(_bx.set(-1, 0, 0), _by.set(0, 0, 1), _bz.set(0, 1, 0))).multiply(_bm.makeTranslation(0, 0, BOW_GRIP));   // the grip in your fist, limbs across it, the string toward you
    else TP.hold.matrix.multiply(_bm.makeRotationFromEuler(_be.set(Math.PI / 2, 0, 0)));
    TP.hold.matrixWorldNeedsUpdate = true; TP.hold.visible = true;
    if (bow) bowNock(TP.items.get(id), D.draw);
  } else TP.hold.visible = false;
  // the torch in your left fist, its lens glowing
  if (torch) {
    const a = _bv.set(0, -1.6, 0).applyMatrix4(X.B.handL.matrixWorld).clone(), b = _bv.set(0, -2, 6.5).applyMatrix4(X.B.handL.matrixWorld).clone();
    between(PT.rod, a.x, a.y, a.z, b.x, b.y, b.z, 1.2, hex('#66655e'), 0);
    stat(b.x, b.y, b.z, 10, 1, 0.92, 0.75, 0.8 * S.torchLvl, 0); stat(b.x, b.y, b.z, 3, 1, 1, 0.95, 1, 0);
  } else if (lit && bow) {   // clipped to your belt on the left hip, lens down and forward
    const ty = terrH(X.mesh.position.x, X.mesh.position.z), a = _bv.set(-4.9, 0.6, 1.2).applyMatrix4(X.B.hips.matrixWorld).clone(), b = _bv.set(-5.3, -4.6, 3.4).applyMatrix4(X.B.hips.matrixWorld).clone();
    a.y += ty; b.y += ty;
    between(PT.rod, a.x, a.y, a.z, b.x, b.y, b.z, 1.2, hex('#66655e'), 0);
    stat(b.x, b.y, b.z, 7, 1, 0.92, 0.75, 0.6 * S.torchLvl, 0); stat(b.x, b.y, b.z, 2.4, 1, 1, 0.95, 1, 0);
  }
  // the smear: tip and middle of the blade while it's cutting
  const cutting = kind && (() => { const u = (A || Wa).t / ((A || Wa).dur || 0.4); return u > 0.17 && u < 0.6; })();
  if (TP.hold.visible || kind) {
    const L = T && (T.wpn === 'spear' || T.thr === 'jav') ? 30 : T && T.wpn === 'sword' ? 17 : TP.hold.visible ? 14 : 4;
    const m = TP.hold.visible ? TP.hold.matrix : hand.matrixWorld, tip = new V3(0, TP.hold.visible ? L : -3, 0).applyMatrix4(m), mid = new V3(0, TP.hold.visible ? L * 0.6 : -1, 0).applyMatrix4(m);
    if (!TP.hold.visible) { const ty = terrH(X.mesh.position.x, X.mesh.position.z); tip.y += ty; mid.y += ty; }   // the item's matrix is already lifted onto the ground
    smPts.unshift({ tip, mid, a: cutting ? 1 : 0 });
  } else smPts.unshift({ tip: new V3(), mid: new V3(), a: 0 });
  if (smPts.length > SMEAR_N) smPts.length = SMEAR_N;
  for (let i = 0; i < SMEAR_N; i++) {
    const q = smPts[Math.min(i, smPts.length - 1)];
    smPos.set([q.tip.x, q.tip.y, q.tip.z], i * 6); smPos.set([q.mid.x, q.mid.y, q.mid.z], i * 6 + 3);
    const fa = 0.8 * q.a * Math.pow(1 - i / SMEAR_N, 1.6); smA[i * 2] = fa; smA[i * 2 + 1] = 0;
  }
  smGeo.attributes.position.needsUpdate = true; smGeo.attributes.ta.needsUpdate = true;
  { const c = CFX.tint.split(','); smear.material.uniforms.tcol.value.set(c[0] / 255, c[1] / 255, c[2] / 255); }
  smear.visible = true;
}
function bodyHide() { BODY.mesh.visible = BODY.edge.visible = false; smear.visible = false; }
