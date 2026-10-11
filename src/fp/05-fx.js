// ================= sparks, flames, embers, ash, wisps, eyes and glints: one additive point cloud =================
const MAXP = 2400;
const pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 4), pDat = new Float32Array(MAXP * 2);
const PS = [];   // live particles
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('pcol', new THREE.BufferAttribute(pCol, 4).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('pdat', new THREE.BufferAttribute(pDat, 2).setUsage(THREE.DynamicDrawUsage));
const PU = { uScale: { value: 400 }, colourK: null };
const pMat = new THREE.ShaderMaterial({
  uniforms: { uScale: PU.uScale, fogR: LU.fogR, camPos: LU.camPos }, transparent: true, depthWrite: false, depthTest: true,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  vertexShader: `attribute vec4 pcol; attribute vec2 pdat; uniform float uScale; uniform vec2 fogR; uniform vec3 camPos; varying vec4 vC; varying float vK;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(pdat.x * uScale / max(-mv.z, 1.0), 1.5, 512.0);
      vC = pcol; vC.a *= 1.0 - smoothstep(fogR.x, fogR.y * 1.05, distance(position.xz, camPos.xz)); vK = pdat.y; }`,
  fragmentShader: `varying vec4 vC; varying float vK;
    void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float r = dot(q, q); float a;
      if (vK < 0.5) a = exp(-r * 3.2);
      else if (vK < 1.5) a = max(0.0, 1.0 - abs(q.x) * 7.0) * max(0.0, 1.0 - abs(q.y)) + max(0.0, 1.0 - abs(q.y) * 7.0) * max(0.0, 1.0 - abs(q.x)) + exp(-r * 14.0);
      else a = r < 1.0 ? 1.0 - r * r : 0.0;
      a *= vC.a; if (a < 0.003) discard; gl_FragColor = vec4(vC.rgb * a, 1.0); }`,
});
const pts = new THREE.Points(pGeo, pMat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
function spark(x, y, z, vx, vy, vz, life, size, r, g, b, a, kind = 0, grav = 0, drag = 1.5) {
  if (PS.length >= MAXP - 400) return;
  PS.push({ x, y, z, vx, vy, vz, t: 0, life, size, r, g, b, a, kind, grav, drag, fire: 0 });
}
function flame(x, y, z, k) {   // a lick of fire: white-yellow, then orange, then a dull red as it rises and dies
  if (PS.length >= MAXP - 400) return;
  PS.push({ x: x + (Math.random() - 0.5) * 6 * k, y, z: z + (Math.random() - 0.5) * 6 * k, vx: (Math.random() - 0.5) * 8, vy: 26 + Math.random() * 30, vz: (Math.random() - 0.5) * 8,
    t: 0, life: 0.35 + Math.random() * 0.4, size: (6 + Math.random() * 6) * k, r: 1, g: 0.8, b: 0.4, a: 0.7, kind: 0, grav: -10, drag: 2, fire: 1 });
}
const STATIC_PTS = [];   // drawn this frame only: eyes, glints, glows, and the main game's own embers and ash
function stat(x, y, z, size, r, g, b, a, kind = 0) { STATIC_PTS.push(x, y, z, size, r, g, b, a, kind); }
function flushPoints(dt) {
  let n = 0;
  for (let i = PS.length - 1; i >= 0; i--) {
    const p = PS[i]; p.t += dt;
    if (p.t >= p.life) { PS[i] = PS[PS.length - 1]; PS.pop(); continue; }
    const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy = p.vy * dr - p.grav * dt; p.vz *= dr;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
  }
  for (const p of PS) {
    const u = p.t / p.life;
    let r = p.r, g = p.g, b = p.b, a = p.a * (1 - u);
    if (p.fire) { r = 1; g = lerp(0.85, 0.28, u); b = lerp(0.45, 0.06, u); a = p.a * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08)); }
    pPos[n * 3] = p.x; pPos[n * 3 + 1] = p.y; pPos[n * 3 + 2] = p.z;
    pCol[n * 4] = r; pCol[n * 4 + 1] = g; pCol[n * 4 + 2] = b; pCol[n * 4 + 3] = a;
    pDat[n * 2] = p.fire ? p.size * (1 - 0.5 * u) : p.size; pDat[n * 2 + 1] = p.kind; n++;
  }
  const Q = STATIC_PTS;
  for (let i = 0; i < Q.length && n < MAXP; i += 9, n++) {
    pPos[n * 3] = Q[i]; pPos[n * 3 + 1] = Q[i + 1]; pPos[n * 3 + 2] = Q[i + 2];
    pDat[n * 2] = Q[i + 3]; pCol[n * 4] = Q[i + 4]; pCol[n * 4 + 1] = Q[i + 5]; pCol[n * 4 + 2] = Q[i + 6]; pCol[n * 4 + 3] = Q[i + 7]; pDat[n * 2 + 1] = Q[i + 8];
  }
  Q.length = 0;
  pGeo.setDrawRange(0, n);
  for (const k of ['position', 'pcol', 'pdat']) { const a = pGeo.attributes[k]; a.needsUpdate = true; a.clearUpdateRanges ? (a.clearUpdateRanges(), a.addUpdateRange(0, n * a.itemSize)) : (a.updateRange.offset = 0, a.updateRange.count = n * a.itemSize); }
}
const cssRgb = c => {   // '#rrggbb', 'rgb(r,g,b)', 'r,g,b' or [r,g,b] -> [0..1]
  if (!c) return [1, 1, 1];
  if (Array.isArray(c)) return c.map(v => v / 255);
  if (c[0] === '#') { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
  const m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(v => +v / 255) : [1, 1, 1];
};
const BLAST_COL = { white: [1, 0.95, 0.85], red: [1, 0.35, 0.2], gold: [1, 0.8, 0.35], blue: [0.5, 0.75, 1], green: [0.55, 1, 0.55], purple: [0.8, 0.55, 1] };
