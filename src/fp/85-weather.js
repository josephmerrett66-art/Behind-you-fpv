// ================= the weather: rain, fog and thunderstorms, as the main game's woods have them =================
// The main game's weatherStep decides what the sky does (and the rain chills you and fills your waterskin); here it is seen:
// streaks of rain falling round you, the fog closing in on what you can see, the whole wood lit white for a blink by lightning.
const RAIN_N = 900, RAIN_BOX = 260;
const rainPos = new Float32Array(RAIN_N * 2 * 3), rainSeed = new Float32Array(RAIN_N * 3);
for (let i = 0; i < RAIN_N; i++) { rainSeed[i * 3] = Math.random(); rainSeed[i * 3 + 1] = Math.random(); rainSeed[i * 3 + 2] = Math.random(); }
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3).setUsage(THREE.DynamicDrawUsage));
const rainMat = new THREE.LineBasicMaterial({ color: 0xc8d2dc, transparent: true, opacity: 0, depthWrite: false });
const rainMesh = new THREE.LineSegments(rainGeo, rainMat); rainMesh.frustumCulled = false; scene.add(rainMesh);
const WXV = { rain: 0, fog: 0, flash: 0 };
function weatherFrame(now) {
  const w = S && S.wx, rain = S ? wxK('rain') : 0, fog = S ? wxK('fog') : 0, storm = w && w.kind === 'storm' ? w.k : 0;
  WXV.rain = rain; WXV.fog = fog; WXV.flash = w ? w.flash || 0 : 0;
  rainMesh.visible = rain > 0.02;
  if (!rainMesh.visible) return;
  // drops wrap round a box that follows you, so the rain never runs out; a storm slants them on the wind
  const cx = cam.position.x, cz = cam.position.z, n = Math.floor(RAIN_N * Math.min(1, rain * (1 + storm * 0.6)));
  const fall = 520, len = 16 + storm * 8, sx = 60 * storm, sz = 25 * storm;
  for (let i = 0; i < RAIN_N; i++) {
    const o = i * 6;
    if (i >= n) { rainPos.fill(0, o, o + 6); continue; }
    const a = rainSeed[i * 3], b = rainSeed[i * 3 + 1], c = rainSeed[i * 3 + 2];
    const y = cam.position.y - EYE + 220 - ((now * fall * (0.85 + c * 0.3) + c * 2200) % 240);
    const x = cx + (((a * RAIN_BOX + now * sx - cx) % RAIN_BOX + RAIN_BOX) % RAIN_BOX) - RAIN_BOX / 2;
    const z = cz + (((b * RAIN_BOX + now * sz - cz) % RAIN_BOX + RAIN_BOX) % RAIN_BOX) - RAIN_BOX / 2;
    rainPos[o] = x; rainPos[o + 1] = y; rainPos[o + 2] = z;
    rainPos[o + 3] = x - sx * 0.03; rainPos[o + 4] = y - len; rainPos[o + 5] = z - sz * 0.03;
  }
  rainGeo.attributes.position.needsUpdate = true;
  rainMat.opacity = 0.35 * rain * (0.45 + 0.55 * ENV.lt) + 0.5 * WXV.flash;
}
// what the weather does to the light: greyer and dimmer in the rain, the haze much nearer in fog, white in a lightning flash
function weatherLight() {
  const r = WXV.rain, f = WXV.fog, fl = WXV.flash;
  if (r < 0.01 && f < 0.01 && fl < 0.01) return;
  const grey = (v, k) => { const g = (v.x + v.y + v.z) / 3; v.set(lerp(v.x, g, k), lerp(v.y, g, k), lerp(v.z, g, k)); };
  const dim = 1 - 0.3 * r;
  LU.amb.value.multiplyScalar(dim); grey(LU.amb.value, 0.5 * r);
  SKY.top.multiplyScalar(1 - 0.35 * r); grey(SKY.top, 0.7 * r + 0.5 * f);
  SKY.hor.multiplyScalar(1 - 0.2 * r); grey(SKY.hor, 0.6 * r + 0.5 * f);
  LU.sunK.value *= 1 - 0.75 * Math.max(r, f * 0.6);
  shMat.uniforms.k.value *= 1 - 0.85 * Math.max(r, f);
  const fr = LU.fogR.value; fr.set(fr.x * (1 - 0.6 * f - 0.25 * r), fr.y * (1 - 0.55 * f - 0.25 * r));
  if (fl > 0.01) { const k = fl * 0.9; LU.amb.value.set(lerp(LU.amb.value.x, 0.95, k), lerp(LU.amb.value.y, 0.97, k), lerp(LU.amb.value.z, 1.05, k)); SKY.top.set(lerp(SKY.top.x, 0.8, k), lerp(SKY.top.y, 0.84, k), lerp(SKY.top.z, 0.95, k)); SKY.hor.set(lerp(SKY.hor.x, 0.85, k), lerp(SKY.hor.y, 0.88, k), lerp(SKY.hor.z, 0.95, k)); }
  LU.fogCol.value.copy(SKY.hor);
}
// the main game's own rain recording, packed into the page; the hiss stands in only until it's decoded (its thunder isn't shipped, so its boom stands in)
const RAIN_SRC = '/*RAIN*/';
function wxLoad() {
  if (wxS.tried || !actx) return; wxS.tried = true;
  try { const bin = atob(RAIN_SRC), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); actx.decodeAudioData(u.buffer, b => { wxS.buf = b; }, () => {}); } catch (e) {}
}
