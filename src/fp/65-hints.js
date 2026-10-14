// ================= what you can gather shows itself (the main game's v156 hints), and the signal fire's countdown =================
// (Joe) no rings on the ground round what you can gather: once you're close enough, the button that gathers it floats over it. Until you've held your first sticks and stones an arrow by the
// crosshair points the way to the nearest. While a signal fire burns, a bar across the top says how long you still have to stand.
const hintB = new Board(240, 400, 0, true, iconTex, ISHEET);
const guideEl = $('guide'), guideA = $('guideA'), guideT = $('guideT'), siegeEl = $('siege'), siegeI = $('siegeI'), siegeT = $('siegeT');
const iconUrl = id => ICON[id] ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${ICON[id]}</svg>`) : '';
let guideKey = '';
function hintsFrame(now) {
  const D = S.day, p = S.p, tgt = dayUseTarget(), lt = dayLight();
  hintB.begin(); hintB.m.uniforms.now.value = S.t;
  const play = state === 'play' && S.running && S.rg.phase === 'fight';
  hintB.end();   // (Joe) no pictures floating over things any more: the button to press shows over the one you're close enough to gather
  useMarkFrame(play, tgt); homeFrame();
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

// the button over what you're close enough to gather: Use for what you take, attack for grass and bushes you strike
const useMark = $('useMark'), useMarkB = useMark.firstChild, _um = [0, 0, 0];
let useMarkKey = '';
function useMarkFrame(play, tgt) {
  let o = null, hit = false;
  if (play && !menusOpen()) { if (tgt) o = tgt; else { o = dayHitTarget(); hit = !!o; } }
  const q = o && o.x !== undefined && scr(o.x, hit ? 26 : 20, o.y, _um);
  if (!q || q[0] < 20 || q[0] > FW - 20 || q[1] < 20 || q[1] > FH - 20) { useMark.hidden = true; return; }
  const key = inputMode === 'pad' ? (hit ? 'RT' : 'X') : inputMode === 'touch' ? (hit ? '⚔' : '✋') : (hit ? '🖱' : 'E');
  if (key !== useMarkKey) { useMarkKey = key; useMarkB.textContent = key; useMark.className = inputMode === 'pad' && !hit ? 'padX' : ''; }
  useMark.hidden = false; useMark.style.transform = `translate(${q[0].toFixed(1)}px, ${(q[1] + Math.sin(S.t * 4) * 2).toFixed(1)}px)`;
}
