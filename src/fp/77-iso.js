// ================= isometric: the woods seen from above, as the top-down game sees them =================
// The camera hangs high off your shoulder at the top-down game's angle and stays put while you move under it. You walk the
// way you push on the screen, and face where you point: the mouse on the ground, or on a phone the way your thumb pushes
// (standing still, you turn to the nearest raider in reach). Trees between the camera and you thin away so you're never lost.
const isoP = () => SET.view === 'iso';
const outsideP = () => SET.view === 'third' || SET.view === 'iso';   // you can see yourself
const ISO = { yaw: Math.PI / 4, pitch: -0.86, mx: -1, my: -1, fogAdd: 0 };
const _isoR = new THREE.Raycaster(), _isoN = new THREE.Vector2();

// where you face: the mouse over the ground, the way you push, or the nearest raider
function isoAim(rdt) {
  const p = S.p;
  let a = aimOfYaw(look.yaw);   // already turned by a thumb dragging on the right of the screen, or a pad's right stick
  if (inputMode === 'kb' && ISO.mx >= 0) {
    _isoN.set(ISO.mx / VW * 2 - 1, 1 - ISO.my / VH * 2); _isoR.setFromCamera(_isoN, cam);
    const o = _isoR.ray.origin, d = _isoR.ray.direction, h = terrH(p.x, p.y) + 18;
    if (d.y < -0.05) { const t = (h - o.y) / d.y, gx = o.x + d.x * t, gz = o.z + d.z * t; if (Math.hypot(gx - p.x, gz - p.y) > 4) a = Math.atan2(gz - p.y, gx - p.x); }
  } else {
    const mx = MV.x, my = MV.y;
    if (Math.hypot(mx, my) > 0.25) a = isoMoveDir(mx, my);
    else {
      let best = null, bd = 150;
      for (const e of S.rg.enemies) if (!e.dead) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
      if (best) a = Math.atan2(best.y - p.y, best.x - p.x);
    }
  }
  look.yaw = look.tYaw = yawOfAim(a); look.pitch = -0.04;
}
// the way a push on the screen goes on the ground: up the screen is away from the camera
function isoMoveDir(mx, my) {
  const f = aimOfYaw(ISO.yaw), fx = Math.cos(f), fy = Math.sin(f), rx = -fy, ry = fx;
  return Math.atan2(ry * mx + fy * my, rx * mx + fx * my);
}

// the camera: high up behind you at a fixed angle, a narrow lens so it reads like the top-down game
function isoCamera(p, rdt) {
  const port = cam.aspect < 1, fov = port ? 50 : 30, dist = port ? 330 : 300;
  const gy = terrH(p.x, p.y) + 14, cp = Math.cos(ISO.pitch), fx = -Math.sin(ISO.yaw) * cp, fy = Math.sin(ISO.pitch), fz = -Math.cos(ISO.yaw) * cp;
  const sh = VIEW_FX.trauma * VIEW_FX.trauma * 3, nz = s => Math.sin(VIEW_FX.shakeT * 37 + s) * sh;
  cam.position.set(p.x - fx * dist + nz(1), gy - fy * dist + nz(2), p.y - fz * dist + nz(3));
  cam.rotation.set(ISO.pitch, ISO.yaw, VIEW_FX.roll * 0.3, 'YXZ');
  if (Math.abs(cam.fov - fov - VIEW_FX.fov * 0.4) > 0.01) { cam.fov = fov + VIEW_FX.fov * 0.4; cam.updateProjectionMatrix(); PU.uScale.value = VH * pixK * 0.5 * cam.projectionMatrix.elements[5]; }
  // the haze starts out round you, not round the camera up there
  ISO.fogAdd = Math.hypot(fx, fz) * dist; LU.fogR.value.x += ISO.fogAdd; LU.fogR.value.y += ISO.fogAdd;
  LU.occ.value.set(p.x, gy - 10, p.y, 1);
}
function isoOff() { LU.occ.value.w = 0; if (ISO.fogAdd) { cam.fov = baseFov(); cam.updateProjectionMatrix(); PU.uScale.value = VH * pixK * 0.5 * cam.projectionMatrix.elements[5]; ISO.fogAdd = 0; } }
addEventListener('mousemove', e => { ISO.mx = e.clientX; ISO.my = e.clientY; });
