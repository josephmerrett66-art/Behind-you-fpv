// ================= the sea round the island: its waves and foam, and the sound of it (Joe) =================
// All round the island (00-core shapes the coast and colours the sand) the woods thin to dunes and a wide sandy beach; here
// the sea lies over it: turquoise over the shallows going to deep blue further out, clear
// enough in the shallows to see the sand, swells rolling in parallel to the shore and breaking into lines of foam that run
// up the beach and draw back, leaving the sand dark and wet. Sun glints on the swell, the sky in it toward the horizon. You
// can wade out to your knees, no further. The surf gets louder as you come down to it, each wave a rush and a hiss.
if (BEACH) {
  const SEA_N = 200, SEA_W = 2600;
  const g = new THREE.PlaneGeometry(SEA_W, SEA_W, SEA_N, SEA_N); g.rotateX(-Math.PI / 2);
  const seaMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ lt: { value: 1 }, sky: { value: SKY.hor }, skyTop: { value: SKY.top } }, LU),
    transparent: true, depthWrite: true,
    vertexShader: TERR_GLSL + `uniform float time, wph, wsz; varying vec3 vW; varying float vS;
      float swell(vec2 p, float s) {   // long swells rolling in toward the shore, smaller chop across them
        float a = s * 0.12 + wph;
        return (0.3 + 0.55 * wsz) * sin(a) * smoothstep(-20.0, 140.0, s) + 0.18 * sin(p.x * 0.07 + p.y * 0.05 + time * 1.7) + 0.12 * sin(p.x * -0.05 + p.y * 0.09 + time * 2.3);
      }
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); float s = coastS(w.xz); vS = s;
        w.y = SEA_Y + swell(w.xz, s) * smoothstep(-40.0, 60.0, s);
        vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: TERR_GLSL + LIGHT_GLSL + `uniform float lt, time, wph, wash; uniform vec3 sky, skyTop; varying vec3 vW; varying float vS;
      float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0)), f.x), f.y); }
      void main() {
        float s = coastS(vW.xz); if (s < -120.0) discard;
        float ground = terrH(vW.xz);
        float wsh = wash + 0.12 * sin(vW.z * 0.004 + vW.x * 0.003);                        // each wave running up the sand and back
        float lvl = vW.y + wsh * (1.0 - smoothstep(0.0, 90.0, s));
        float depth = lvl - ground; if (depth < 0.0) discard;
        // colour: turquoise over the sand, through green-blue, to the deep
        vec3 shal = vec3(0.36, 0.78, 0.74), mid = vec3(0.12, 0.5, 0.6), deep = vec3(0.05, 0.22, 0.36);
        vec3 c = mix(shal, mid, smoothstep(0.3, 4.0, depth)); c = mix(c, deep, smoothstep(4.0, 22.0, depth));
        // ripples: a wobbling normal from two drifting noise layers
        vec2 q = vW.xz * 0.09; float e = 0.6;
        float r0 = n2(q + time * vec2(0.15, 0.1)) + 0.5 * n2(q * 2.3 - time * vec2(0.12, 0.2));
        float rx = n2(q + vec2(e, 0.0) + time * vec2(0.15, 0.1)) + 0.5 * n2((q + vec2(e, 0.0)) * 2.3 - time * vec2(0.12, 0.2));
        float rz = n2(q + vec2(0.0, e) + time * vec2(0.15, 0.1)) + 0.5 * n2((q + vec2(0.0, e)) * 2.3 - time * vec2(0.12, 0.2));
        vec3 N = normalize(vec3((r0 - rx) * 0.9, 1.0, (r0 - rz) * 0.9));
        vec3 V = normalize(camPos - vW);
        float fres = pow(1.0 - max(dot(V, N), 0.0), 4.0);
        c = mix(c, mix(sky, skyTop, 0.35), clamp(fres * 0.9, 0.0, 0.75) * (0.4 + 0.6 * lt));     // the sky in it, more toward the horizon
        float sp = pow(max(dot(reflect(-V, N), sunDir), 0.0), 140.0);
        c += vec3(1.0, 0.95, 0.82) * sp * 2.2 * sunK;                                   // sun glints
        // foam: lines where the swells break, running in across the shallows, and a lace along the edge of the water
        float f = fract((s * 0.12 + wph) / 6.2832 + 0.6);                  // in step with the swell (one line per crest)
        float crest = smoothstep(0.78, 0.9, f) * (1.0 - smoothstep(0.9, 0.985, f));
        float br = n2(vW.xz * 0.08 + vec2(time * 0.3, 0.0)) * 0.6 + n2(vW.xz * 0.3 - time * 0.2) * 0.4;
        float surf = crest * smoothstep(-10.0, 25.0, s) * (1.0 - smoothstep(110.0, 190.0, s)) * smoothstep(0.35, 0.6, br);
        float lace = (1.0 - smoothstep(0.0, 0.32, depth)) * smoothstep(0.25, 0.55, n2(vW.xz * 0.25 + time * 0.25) + 0.25);
        float trail = (1.0 - smoothstep(0.0, 1.1, depth)) * smoothstep(0.6, 0.8, n2(vW.xz * 0.15 - vec2(0.0, time * 0.1))) * 0.6;   // what's left of the last wave
        float foam = clamp(max(max(surf, lace), trail), 0.0, 1.0);
        c = mix(c, vec3(0.97, 0.98, 0.96), foam * 0.9);
        float a = mix(0.42, 1.0, smoothstep(0.0, 6.0, depth)); a = max(a, foam * 0.95);
        a *= smoothstep(0.0, 0.08, depth);                                              // a soft edge on the sand
        vec3 lit = c * mix(vec3(1.0), lightAt(vW, vec3(0.0, 1.0, 0.0), 0.0), 0.75);
        gl_FragColor = vec4(fogged(grey(lit), vW), a);
      }`,
  });
  const sea = new THREE.Mesh(g, seaMat); sea.frustumCulled = false; sea.renderOrder = 2; scene.add(sea);
  { const ws = worldSync; worldSync = function (f) { const r = ws(f), p = S ? S.p : { x: 0, y: 0 };   // the sea rides along with you
      sea.position.set(Math.round(p.x / 13) * 13, 0, Math.round(p.y / 13) * 13); sea.updateMatrixWorld(); sea.visible = !S || coastS(p.x, p.y) > -1600; seaMat.uniforms.lt.value = pondMat.uniforms.lt.value; return r; }; }

  // nothing grows on the sand or stands in the sea
  const onLand = (o, need) => coastS(o.x, o.y) < need;
  { const pn = propsNear; propsNear = function (x, y, R) { return pn(x, y, R).filter(o => onLand(o, o.kind === 'tree' ? -190 : -40)); }; }
  { const dn = decorNear; decorNear = function (x, y, R) { return dn(x, y, R).filter(d => onLand(d, d.dk === 'log' ? -30 : -175)); }; }
  { const ln = lakesNear; lakesNear = function (x, y, R) { return ln(x, y, R).filter(P => onLand(P, -420)); }; }
  { const nn = dayNodesNear; dayNodesNear = function (x, y, R) { return nn(x, y, R).filter(o => onLand(o, o.it === 'stones' || o.k === 'stones' ? -10 : -170)); }; }

  // wading: out to your knees and no further
  const WADE = 3.2, seaDepth = (x, y) => coastS(x, y) > -120 ? SEA_Y - terrH(x, y) : -1;   // only the sea itself: low ground inland is dry land
  { const ss = simStep; simStep = function (dt) {
      const p = S && S.p, x0 = p ? p.x : 0, y0 = p ? p.y : 0; ss(dt);
      if (p && seaDepth(p.x, p.y) > WADE && seaDepth(p.x, p.y) > seaDepth(x0, y0)) { p.x = x0; p.y = y0; p.vx = p.vy = 0; if (S.day) dayNote('deep', 'the water gets too deep', 6); }
      if (S && S.day && S.day.beasts.some(b => b._sx === undefined && seaDepth(b.x, b.y) > 0.5)) S.day.beasts = S.day.beasts.filter(b => b._sx !== undefined || seaDepth(b.x, b.y) <= 0.5);   // none born out at sea
      if (S) for (const L of [S.rg.enemies, S.day && S.day.beasts]) if (L) for (const o of L) {   // the animals and the clan keep out of the sea
        if (o.dead) continue;
        if (o._sx !== undefined && seaDepth(o.x, o.y) > 1.2 && seaDepth(o.x, o.y) > seaDepth(o._sx, o._sy)) { o.x = o._sx; o.y = o._sy; }
        o._sx = o.x; o._sy = o.y;
      }
      seaSound(dt);
    }; }

  // the surf: Joe's recording of waves on a beach, looped, and the waves on the shore timed to it. The loudest moment of each wave
  // in the recording (found by tools, stored in assets/surf.json) is when a crest breaks on the beach; the swell, the foam lines
  // and the run of water up the sand all follow that clock. Big waves in the sound are big on the shore and run further up.
  const SURF = /*SURFT*/0, SURF_B64 = '/*SURF*/', BREAK_S = 25;
  let surf = null, surfBuf = null, surfLoading = false;
  function surfClock() {   // seconds into the loop: from the sound itself once it plays, else from the clock
    if (surf && actx) return ((actx.currentTime - surf.t0) % SURF.len + SURF.len) % SURF.len;
    return LU.time.value % SURF.len;
  }
  let wetH = 0, lastC = 0;
  function waveFrame() {
    const C = SURF.crash, K = SURF.k, N = C.length, tc = surfClock();
    let i = -1; for (let j = 0; j < N; j++) if (C[j] <= tc) i = j;
    const prev = i >= 0 ? C[i] : C[N - 1] - SURF.len, ci = i >= 0 ? i : N - 1, ni = (ci + 1) % N, next = ni === 0 ? C[0] + (i >= 0 ? SURF.len : 0) : C[ni];
    const f = clamp((tc - prev) / (next - prev), 0, 1), k = K[ci];
    LU.wph.value = (Math.PI / 2 - BREAK_S * 0.12 + 2 * Math.PI * f) % (2 * Math.PI);   // at the crash, a crest on the break line
    LU.wsz.value = lerp(k, K[ni], _sst(0.3, 0.9, f));
    LU.wash.value = (0.35 + 1.25 * k) * _sst(0.0, 0.14, f) * (1 - _sst(0.18, 0.9, f));   // runs up fast, slides back slowly
    const t = LU.time.value, dt = clamp(t - lastC, 0, 0.2); lastC = t;
    wetH = Math.max(LU.wash.value, wetH - dt * 0.12); LU.wet.value = wetH;
  }
  function surfLoad() {
    if (surfLoading || !actx) return; surfLoading = true;
    try { const bin = atob(SURF_B64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      actx.decodeAudioData(u.buffer, b => { surfBuf = b; }, () => {}); } catch (e) {}
  }
  function seaSound(dt) {
    if (!actx || !sfxGain || !S) return;
    if (!surfBuf) { surfLoad(); return; }
    if (!surf) {
      const src = actx.createBufferSource(); src.buffer = surfBuf; src.loop = true;
      const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
      const g = actx.createGain(); g.gain.value = 0;
      const pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
      src.connect(lp); lp.connect(g); if (pan) { g.connect(pan); pan.connect(sfxGain); } else g.connect(sfxGain);
      const t0 = actx.currentTime + 0.05; src.start(t0);
      surf = { src, lp, g, pan, t0 };
    }
    const p = S.p, s = coastS(p.x, p.y), near = Math.pow(clamp(1 - Math.abs(Math.min(s, 0) + 15) / 900, 0, 1), 1.5);
    const t = actx.currentTime, k = state === 'play' ? 1 : 0;
    surf.g.gain.setTargetAtTime(k * near * 0.9, t, 0.3);
    surf.lp.frequency.setTargetAtTime(500 + 17000 * near * near * near, t, 0.3);   // far off, only the low roar comes through the trees
    if (surf.pan) {   // which way the sea is: out from the middle of the island (or the islet's shore, when that's nearer)
      const di = Math.hypot(p.x - ISLET.x, p.y - ISLET.y) - ISLET.r, a = di < Math.hypot(p.x, p.y) - isleR(Math.atan2(p.y, p.x)) ? Math.atan2(ISLET.y - p.y, ISLET.x - p.x) : Math.atan2(p.y, p.x);
      const side = -Math.sin(S.aimW || 0) * Math.cos(a) + Math.cos(S.aimW || 0) * Math.sin(a);
      surf.pan.pan.setTargetAtTime(clamp(side * 0.6 * (1 - near * 0.5), -1, 1), t, 0.2);
    }
  }
  { const ws = worldSync; worldSync = function (f) { const r = ws(f); waveFrame(); return r; }; }
}
