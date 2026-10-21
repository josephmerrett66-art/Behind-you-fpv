// ================= isometric: the woods seen from above, as the top-down game sees them =================
// The camera hangs high off your shoulder at the top-down game's angle and stays put while you move under it. You walk the
// way you push on the screen, and face where you point: the mouse on the ground, or on a phone the way your thumb pushes
// (standing still, you turn to the nearest raider in reach). Trees between the camera and you thin away so you're never lost.
const isoP = () => SET.view === 'iso';
const outsideP = () => SET.view === 'third' || SET.view === 'iso';   // you can see yourself
const ISO = { yaw: Math.PI / 4, yawT: Math.PI / 4, pitch: -0.56, mx: -1, my: -1, fogAdd: 0 };
const _isoR = new THREE.Raycaster(), _isoN = new THREE.Vector2();

// where you face: the mouse over the ground, the way you push, or the nearest raider. The right stick (or a thumb dragging on
// the right of a phone screen) doesn't aim from up here: it swings the camera round you, smoothly, the way it turns the view
// in the other views (Joe)
function isoAim(rdt) {
  const p = S.p, dl = look.yaw - (ISO.lastLook ?? look.yaw);
  if (dl) { ISO.yaw += dl; ISO.yawT += dl; }
  let a = ISO.face ?? aimOfYaw(look.yaw);
  if (inputMode === 'kb' && ISO.mx >= 0) {
    _isoN.set(ISO.mx / VW * 2 - 1, 1 - ISO.my / VH * 2); _isoR.setFromCamera(_isoN, cam);
    const o = _isoR.ray.origin, d = _isoR.ray.direction, h = terrH(p.x, p.y) + 18 + (p.jz || 0);
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
  ISO.face = a; look.yaw = look.tYaw = yawOfAim(a); look.pitch = -0.04; ISO.lastLook = look.yaw;
}
// the way a push on the screen goes on the ground: up the screen is away from the camera
function isoMoveDir(mx, my) {
  const f = aimOfYaw(ISO.yaw), fx = Math.cos(f), fy = Math.sin(f), rx = -fy, ry = fx;
  return Math.atan2(ry * mx + fy * my, rx * mx + fx * my);
}

// the camera: well back and up behind you at a fixed angle, tilted toward the horizon like a far-off third-person view,
// looking a little past you so more of the woods ahead is in sight
function isoCamera(p, rdt) {
  const spin = (held.has('KeyR') ? -1 : 0) + (held.has('KeyT') ? 1 : 0);   // on a keyboard, hold R or T to swing round
  if (spin) ISO.yawT += spin * rdt * 1.8;
  let dy = ISO.yawT - ISO.yaw; ISO.yaw += dy * Math.min(1, rdt * 10);
  const port = cam.aspect < 1, fov = port ? 62 : 46, dist = (port ? 320 : 290) * (SET.isoZoom || 1.7);   // the zoom setting pulls the camera back
  const gy = terrH(p.x, p.y) + 14 + (p.jz || 0), cp = Math.cos(ISO.pitch), fx = -Math.sin(ISO.yaw) * cp, fy = Math.sin(ISO.pitch), fz = -Math.cos(ISO.yaw) * cp;
  const sh = VIEW_FX.trauma * VIEW_FX.trauma * 3, nz = s => Math.sin(VIEW_FX.shakeT * 37 + s) * sh;
  const ahead = dist * 0.14, tx = p.x + fx / cp * ahead, tz = p.y + fz / cp * ahead;   // the point looked at sits a little beyond you
  cam.position.set(tx - fx * dist + nz(1), gy - fy * dist + nz(2), tz - fz * dist + nz(3));
  cam.rotation.set(ISO.pitch, ISO.yaw, VIEW_FX.roll * 0.3, 'YXZ');
  if (Math.abs(cam.fov - fov - VIEW_FX.fov * 0.4) > 0.01) { cam.fov = fov + VIEW_FX.fov * 0.4; cam.updateProjectionMatrix(); PU.uScale.value = VH * pixK * 0.5 * cam.projectionMatrix.elements[5]; }
  // the haze is measured from you (LU.fogC, set in placeCamera) and reaches further than down on the ground, so the woods run
  // out of sight into it, not off an edge; the far plane reaches past the last tree drawn
  LU.fogR.value.multiplyScalar(VIEW_ISO / VIEW * 0.95); ISO.fogAdd = 1;
  const far = dist + VIEW_ISO + 300; if (Math.abs(cam.far - far) > 1) { cam.far = far; cam.updateProjectionMatrix(); PU.uScale.value = VH * pixK * 0.5 * cam.projectionMatrix.elements[5]; }
  LU.occ.value.set(p.x, gy - 10, p.y, 1);
}
// how far out the zoom is, as the menu says it: 1 is right in close
const isoZoomName = () => (SET.isoZoom || 1.7) <= 1.05 ? 'close' : (SET.isoZoom || 1.7) >= 2.95 ? 'far' : (SET.isoZoom || 1.7).toFixed(1) + '×';
// pinch with two thumbs, or ctrl and the mouse wheel, to zoom from above
function isoZoomBy(k) { SET.isoZoom = clamp((SET.isoZoom || 1.7) * k, 1, 3); saveSet(); }
addEventListener('wheel', e => { if (isoP() && state === 'play' && e.ctrlKey) { e.preventDefault(); isoZoomBy(e.deltaY > 0 ? 1.08 : 1 / 1.08); } }, { passive: false });
function isoOff() { LU.occ.value.w = 0; ISO.lastLook = undefined; if (ISO.fogAdd) { cam.fov = baseFov(); cam.far = 1400; cam.updateProjectionMatrix(); PU.uScale.value = VH * pixK * 0.5 * cam.projectionMatrix.elements[5]; ISO.fogAdd = 0; } }
addEventListener('mousemove', e => { ISO.mx = e.clientX; ISO.my = e.clientY; });
