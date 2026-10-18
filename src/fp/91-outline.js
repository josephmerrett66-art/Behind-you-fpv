// ---------------- outlines: one switch for every line in the game ----------------
// Joe: Pause > Options > Outlines is all or nothing. On: the ink lines round everything (07-ink), plus the dark shells
// on people, your body and your hands, which give each limb its own line where it crosses another. Off: no lines on
// anything at all. The woods, rocks, logs and buildings no longer draw a shell of their own: the ink already lines
// them, and a shell seen from the inside (under a pine's branches, up against a rock, a low canopy on a slope) blacked
// out most of the view. Dropping them also takes about a third of the draws and a fifth of the triangles off each frame.
const OUTLINE = { t: -1e9 };
function outlineWorldMats() { const L = [kitEdge, treeEdge]; for (const k in PROP_MAT) if (PROP_MAT[k]) L.push(PROP_MAT[k].e); return L; }
function outlineMats() {   // every dark shell drawn now, found by what it is: drawn inside out, and not the sky
  const set = new Set();
  for (const sc of [scene, vmScene]) sc.traverse(o => { const m = o.material; if (!m) return; for (const q of Array.isArray(m) ? m : [m]) if (q.side === THREE.BackSide && !(q.uniforms && q.uniforms.hor)) set.add(q); });
  return set;
}
function outlineSync() {
  const world = new Set(outlineWorldMats());
  for (const m of world) m.visible = false;
  for (const m of outlineMats()) if (!world.has(m)) m.visible = !!SET.ink;
  OUTLINE.t = performance.now();
}
function outlineSet(on) { SET.ink = !!on; saveSet(); syncSet(); }
{ const f = syncSet; syncSet = function () { f.apply(this, arguments); outlineSync(); }; }
// things made later (a new raider, the props as you walk) pick the setting up within a moment
{ const f = inkRender; inkRender = function () { if (performance.now() - OUTLINE.t > 1500) outlineSync(); return f.apply(this, arguments); }; }
outlineSync();
