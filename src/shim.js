'use strict';
// ---- the few things the main game's Daylight code reaches for that belong to its 2D screen, its other modes or its bosses ----
// Daylight runs here word for word (src/ported.js). These stand in for the parts that don't exist in first person: the iso camera,
// the boss fights, the Dunes and the Frost, the lifetime record. Everything the woods themselves do is real.
// note every element the game makes clickable, so a controller can reach the ones that aren't buttons (52-padmenu)
{ const ael = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (t, f, o) { if ((t === 'click' || t === 'pointerdown') && this instanceof Element && this.__tap !== 'click') this.__tap = t; return ael.call(this, t, f, o); }; }
let S = null;
let W = innerWidth, H = innerHeight, Z = 1, last = 0, COLOUR = true;
const K = () => 1, keys = {};
const COARSE = () => document.body.classList.contains('touch');
const byId = id => document.getElementById(id);
const craftEl = byId('craft'), craftBtn = byId('craftBtn'), useBtn = byId('useBtn'), sneakBtn = byId('sneakBtn'), menuBtn = byId('bMenu'),
  hotbarEl = byId('hotbar'), buildbarEl = byId('buildbar'), dodgeBtn = byId('bDodge'), attackBtn = byId('bAtk'), campBtn = byId('campBtn'),
  campEl = byId('camp'), statsEl = byId('stats'), deathCard = byId('deathCard'), flaskBtn = byId('flaskBtn');
const SPRITE_KINDS = { pine: [6, 70, 118, 35, 112], oak: [5, 84, 96, 42, 90], cherry: [5, 100, 104, 50, 92], dead: [4, 76, 72, 38, 66],   // the heights of a felled tree's crown, and how many of each kind of ground cover there are
  grass: [5], fern: [4], pebbles: [4], bush: [4], shrooms: [3], log: [3], rock: [5], post: [3] };
// the first-person view fills these in (src/fp)
const FP = { note() {}, seen() { return false; }, aimPt(d0, d1, def) { return null; }, ui() {}, layout() {}, rumble() {}, fly() {}, squash() {} };
// the screen: a spot on the ground is "seen" if it's in front of you and in reach of your eyes
function toScreen(x, y) { return [x - y, (x + y) / 2]; }   // only ever used here to say which way a figure faces
function seenAt(x, y) { return FP.seen(x, y); }
function viewR() { return 900; }
function stAimPt() { const p = S.p, a = S.aimW || 0, q = FP.aimPt(34, 150); return q || { x: p.x + Math.cos(a) * 58, y: p.y + Math.sin(a) * 58 }; }
function dayThrowPt() { const p = S.p, a = S.aimW || 0, q = FP.aimPt(60, 320); return q || { x: p.x + Math.cos(a) * 220, y: p.y + Math.sin(a) * 220 }; }
function monOut(x, y, gain) { return FP.monOut(x, y, gain); }
function padRumble(k, ms = 120) { FP.rumble(k, ms); }
function jfFly(x, y, it, col) { FP.fly(x, y, it, col); }
function jfSquash(k) { FP.squash(k); }
function layoutBtns() { FP.layout(); }
function wpUi(force) { FP.ui(force); }
function flaskUi() {}
function exNote(text, big, life, sub) {   // sub given: a headline, which outlasts the pickups crowding in after it; two headlines at most
  const N = S.rg.notes, hd = n => n.sub != null; N.push({ text, t: 0, big: !!big, life, sub });
  if (hd(N[N.length - 1]) && N.filter(hd).length > 2) N.splice(N.findIndex(hd), 1);
  if (N.length > 3) { const i = N.findIndex(n => !hd(n)); N.splice(Math.max(0, i), 1); }
}
function showDeathCard() { S.rg.cardShown = true; if (S.day) dayCard(); }
// the woods have no weather yet, and none of the far places
const inBeyond = () => false, inNext = () => false, inDunes = () => false;
const desertPropAt = () => null, snowPropAt = () => null;
const exPathLamps = () => [];
function exMakeLairs() {}
function exRead() { return exFresh(); }
function exSave() {}
const rgRange = () => 1;
// no bosses walk Daylight's woods
const bossLive = () => null, miniLive = () => null, srchOn = () => false;
const MK = {}, B_SLAM = 0, bK = () => 1, miniShield = () => 1;
function bossSay() {} function arenaClamp() {} function lampBreak() {} function duneHitBy() {} function duneCloneCopy() {} function srchDown() {} function stkBlow() {}
// Nightfall's waves and the streak counter belong to other modes
function startWave() {} function endWave() {} function openPicker() {} function pickFoe() { return 'shade'; } const rgMaxAlive = () => 0;
function rdStep() {}
function lifeMax() {}   // the streak counter is real (src/ported.js); only its lifetime records stay behind
function lifeAdd() {} function lifeTally() {} function submitScore() {}
function exStep(dt) { FP.exStep(dt); }   // the woods' own step, Daylight's part of it (src/fp/sim.js)
