// ================= what you can gather shows itself (the main game's v156 hints), and the signal fire's countdown =================
// Everything Take picks up has a warm ring on the ground and its picture floating over it as you come near; grass and berry
// bushes, which you strike instead, get a green ring close up. Until you've held your first sticks and stones an arrow by the
// crosshair points the way to the nearest. While a signal fire burns, a bar across the top says how long you still have to stand.
const hintB = new Board(240, 400, 0, true, iconTex, ISHEET);
const guideEl = $('guide'), guideA = $('guideA'), guideT = $('guideT'), siegeEl = $('siege'), siegeI = $('siegeI'), siegeT = $('siegeT');
const iconUrl = id => ICON[id] ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${ICON[id]}</svg>`) : '';
let guideKey = '';
function hintsFrame(now) {
  const D = S.day, p = S.p, tgt = dayUseTarget(), lt = dayLight();
  hintB.begin(); hintB.m.uniforms.now.value = S.t;
  const play = state === 'play' && S.running && S.rg.phase === 'fight';
  if (play) for (const { o, it, how } of dayPickables(PICK_SEE)) {
    const R = how === 'take' ? PICK_SEE : PICK_HIT, d = Math.hypot(o.x - p.x, o.y - p.y), f = Math.max(0, 1 - d / R) * Math.max(lt, 1 - d / 90);   // in the dark, only what's at your feet
    if (f <= 0.01) continue;
    const pulse = 0.65 + 0.35 * Math.sin(S.t * 3 + o.x * 0.05), on = o === tgt, rr = on ? 15 : 12, a = how === 'take' ? (on ? 0.95 : 0.25 + 0.45 * f) * pulse : 0.5 * f * pulse;
    const [cr, cg, cb] = how === 'take' ? [1, 0.88, 0.59] : [0.67, 0.88, 0.55];
    for (let i = 0; i < 20; i++) { const q = i / 20 * 6.283 + now * 0.4; stat(o.x + Math.cos(q) * rr, 0.8, o.y + Math.sin(q) * rr, on ? 2.6 : 2, cr, cg, cb, a * 0.8, 0); }
    if (on || d > R) continue;   // the one you'd take next is named under the crosshair instead
    hintB.add(it, 0, o.x, o.y, 1.25, 1, 0, -99, 0, 17 + 2.5 * Math.sin(S.t * 2.5 + o.x));
  }
  hintB.end();
  // the first-time guide
  let best = null;
  if (play && !(D.seen.has('sticks') && D.seen.has('stones')) && !dayPickables(140).some(q => q.how === 'take' && (q.it === 'sticks' || q.it === 'stones') && Math.hypot(q.o.x - p.x, q.o.y - p.y) < 140)) {
    let bd = 1100;
    for (const o of dayNodesNear(p.x, p.y, 1100)) if (!o.gone && ((o.t === 'sticks' && !D.seen.has('sticks')) || (o.t === 'stones' && !D.seen.has('stones')))) { const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < bd) { bd = d; best = o; } }
  }
  guideEl.hidden = !best || menusOpen();
  if (best && !guideEl.hidden) {
    const a = S.aimW, dx = best.x - p.x, dy = best.y - p.y, fw = dx * Math.cos(a) + dy * Math.sin(a), rt = -dx * Math.sin(a) + dy * Math.cos(a);
    const ang = Math.atan2(-fw, rt), r = 74 + 4 * Math.sin(S.t * 4);
    guideEl.style.transform = `translate(${Math.cos(ang) * r}px, ${Math.sin(ang) * r * 0.85}px)`;
    guideA.style.transform = `rotate(${ang}rad)`; guideA.style.opacity = 0.8 + 0.2 * Math.sin(S.t * 4);
    if (guideKey !== best.t) { guideKey = best.t; guideT.innerHTML = `<img src="${iconUrl(best.t)}" alt=""><span>${best.t.toUpperCase()}</span>`; }
  }
  // the signal fire's siege
  const G = D.siege; siegeEl.hidden = !(G && play);
  if (G && play) {
    const left = Math.max(0, SIEGE_T - G.t);
    siegeI.style.transform = `scaleX(${clamp(1 - left / SIEGE_T, 0.01, 1)})`;
    siegeT.textContent = G.far ? 'BACK TO THE FIRE' : `HOLD OUT · ${Math.ceil(left)}S`; siegeT.classList.toggle('far', !!G.far);
  }
}
