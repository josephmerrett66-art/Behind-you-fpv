// ================= a plain fight: one stroke at a time, and blood instead of light (Joe: "de-arcadeify") =================
// Joe: "because this game is becoming more of a real survival sim ... we probably should go back and kind of de-arcadeify all
// these animations and game feel aspects ... put back to a more kind of realistic, simple, real version". The old action game
// made every blow loud so you could cut through crowds and build combos; here a fight is you and one or two of them in the
// woods, so:
//   - every weapon swings one stroke at a time, forehand then backhand (a spear jabs), however long you keep at it: no
//     finishers, spins, leaps or ground cracks, no words over your head, and a swing is a step in, not a lunge.
//   - a blow that lands draws blood: dark drops thrown off the far side and a spot on the ground. Nothing flashes white or
//     throws sparks, and nothing goes flying; a cannibal grunts and flinches (72-clan).
//   - nothing freezes when a blow lands (hitStop), and the shake from everything, a blow on you or a tree coming down, is
//     half what it was (addShake). Your hand jars back instead (62-combat).
//   - no streak: no points, no counter, no tier names.
const PLAIN_ATK = {   // [reach, arc, a step in, how long, when it lands, damage, knock]: about the old combos' damage over time
  club: { reach: 92, arc: 2.4, lunge: 12, moveT: [0.16, 0.3], dur: 0.62, hitAt: 0.3, dmg: 1.45, boss: 1.9, knock: 16, shake: 0.12, stop: 0, kick: 2, kh: 'sweep' },
  axe: { reach: 80, arc: 1.9, lunge: 10, moveT: [0.15, 0.28], dur: 0.58, hitAt: 0.29, dmg: 1.7, boss: 2.2, knock: 14, shake: 0.12, stop: 0, kick: 2, kh: 'chop' },
  sword: { reach: 86, arc: 2.2, lunge: 12, moveT: [0.1, 0.2], dur: 0.44, hitAt: 0.2, dmg: 1.3, boss: 1.5, knock: 14, shake: 0.08, stop: 0, kick: 1.5, kh: 'slash' },
  knife: { reach: 52, arc: 1.5, lunge: 8, moveT: [0.05, 0.14], dur: 0.36, hitAt: 0.15, dmg: 0.95, boss: 1.1, knock: 5, shake: 0.04, stop: 0, kick: 1, kh: 'cut' },
  twin: { reach: 94, arc: 0.5, lunge: 10, moveT: [0.08, 0.18], dur: 0.48, hitAt: 0.2, dmg: 1.3, boss: 1.6, knock: 10, shake: 0.06, stop: 0, kick: 1.5, thrust: 1, kh: 'jab' },
};
function plainArms() {   // each family's two strokes, in place of the boss weapon's combo it borrowed
  for (const w in PLAIN_ATK) {
    const W = ARMS[w], old = w === 'twin' ? W.spear : W.atk;
    W.atk = [Object.assign({ pose: old[0].pose }, PLAIN_ATK[w]), Object.assign({ pose: old[1].pose, side: -1 }, PLAIN_ATK[w])];
    W.loop = W.beat = 0;
  }
}
{ const init = dArmInit; dArmInit = function () { if (dArmInit.done) return; init(); plainArms(); }; }
// the blow lands: a thud through it, and a knife's cut keeps bleeding (the blood itself is plainBlood, from where it struck)
const PLAIN_THUD = { club: [1, 0.8], axe: [0.9, 0.9], sword: [0.6, 1.1], twin: [0.5, 1.2], knife: [0.3, 1.4] };
function plainHit(w, D, n, a, hit) {
  if (!n) return;
  if (w === 'knife') for (const o of hit) { o.wbleed = Math.min(4, (o.wbleed || 0) + 1); o.wbleedT = 2.2; o.wbleedK = 1; }
  if (!actx) return;
  const t = actx.currentTime, [k, f] = PLAIN_THUD[w] || [0.6, 1];
  boomAt(t, 115 * f, 40, 0.1 + 0.1 * k, 0.35 + 0.35 * k, sfxGain); noiseAt(t, 1700 * f, 600, 0.06, 0.2 + 0.1 * k, sfxGain);   // the meat of it
  if (w !== 'club') noiseAt(t + 0.01, 3200, 1400, 0.07, 0.16, sfxGain);   // an edge going in
}
function plainBlood(o, h, a, n = 5) {   // dark drops thrown off the far side of the wound, and a spot of it on the ground
  dayChips(o.x, o.y, h * 0.6, 'blood', n, a, 0.6);
  if (Math.random() < 0.7) huntBlood(o.x + Math.cos(a) * 4, o.y + Math.sin(a) * 4, 1, 0.7);
}
