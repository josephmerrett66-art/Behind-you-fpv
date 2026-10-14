// ================= third person: you, seen from over your shoulder =================
// The same woods and the same fight with the camera pulled back behind your right shoulder. You're the top-down game's
// figure in a knitted cap and scarf with a pack on your back (76-body.js).
// The camera pulls in when a tree trunk gets between it and you. Switch views (first, third, isometric) in the pause menu, or with V.
const thirdP = () => SET.view === 'third';
const VIEWS = ['first', 'third', 'iso'], VIEW_NAME = { first: 'First person', third: 'Third person', iso: 'Isometric' };
const nextView = () => VIEWS[(VIEWS.indexOf(SET.view) + 1) % VIEWS.length];
const TP = { boom: 76, face: undefined, holdId: null, items: new Map(), hold: new THREE.Group(), yawLast: 0 };
TP.hold.matrixAutoUpdate = false; scene.add(TP.hold);   // its items are marked as casting shadows as they're made (76-body.js)

// the camera: from your head, back along where you look and over your right shoulder, short of any trunk in the way
const _tpv = new V3();
function thirdCamera(p, yaw, pitch, headY) {
  const cp = Math.cos(pitch), fx = -Math.sin(yaw) * cp, fy = Math.sin(pitch), fz = -Math.cos(yaw) * cp, rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const sh = cam.aspect >= 1 ? 19 : 7, px = p.x + rx * sh, py = headY + 4, pz = p.y + rz * sh;   // the point it swings round: just over your right shoulder
  let want = 76;
  for (const o of WORLD.props) {   // a trunk between: come in short of it
    if (o.kind !== 'tree' && o.kind !== 'rock' && o.kind !== 'post') continue;
    const ox = o.x - px, oz = o.y - pz; if (ox * ox + oz * oz > 120 * 120) continue;
    const bx = -fx, bz = -fz, bl = Math.hypot(bx, bz) || 1, t = (ox * bx + oz * bz) / bl; if (t < 0) continue;
    const off = Math.abs(ox * bz - oz * bx) / bl, r = (o.kind === 'tree' ? 8 : o.kind === 'rock' ? 16 : 4) * (o.s || 1) + 5;
    if (off < r) want = Math.min(want, Math.max(14, (t - Math.sqrt(r * r - off * off)) / Math.max(0.2, bl)));
  }
  TP.boom += (want - TP.boom) * (want < TP.boom ? 1 : 0.08);   // snap in, ease back out
  const cx = px - fx * TP.boom, cz = pz - fz * TP.boom;
  cam.position.set(cx, Math.max(terrH(cx, cz) + 6, py - fy * TP.boom), cz);   // never down inside a hill
}

// you: posed from what the main game says you're doing
// you yourself: built and moved in 76-body.js
let frameDtTP = 1 / 60;

// called at the end of placing the camera: swap your eyes for the camera over your shoulder
function thirdFrame(rdt, now, headY) {
  frameDtTP = rdt;
  const on = outsideP() && state === 'play';
  trail.visible = !on;
  if (!isoP() || !on) isoOff();
  if (!on) { TP.hold.visible = false; TP.boom = 76; return false; }
  handG.visible = torchG.visible = false;
  if (isoP()) isoCamera(S.p, rdt); else thirdCamera(S.p, look.yaw, look.pitch, headY);
  cam.rotation.z *= 0.25;   // fallen: the camera stays upright and watches you go down
  cam.updateMatrixWorld(); LU.camPos.value.copy(cam.position);
  return true;
}
addEventListener('keydown', e => {
  if (e.code !== 'KeyV' || e.repeat || state !== 'play' || menusOpen()) return;
  SET.view = nextView(); saveSet(); syncSet();
});
