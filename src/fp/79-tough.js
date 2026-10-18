// ================= harder to kill, and worse when you hurt them (Joe) =================
// They take nearly twice the blows they did (the leader more than that). Hurting one no longer sends it running: the bold
// ones, and any of them while the clan is out for blood, turn on you with a scream instead, wounded and furious, and only
// break when they're nearly dead. They read your swings better too: they're quicker to hop clear or get the club up again,
// so a fight is a fight, not a few free hits.
FOES.cannibal.hp = 6;   // was 3.4
CL_KIND.leader.hp = 1.8;   // was 1.45
const TOUGH = { fury: 0.35, furyAgg: 0.45, furyRage: 0.35, furyMin: 0.12, dodgeCd: 0.55, block: 0.18 };
{ const hurt0 = clanHurt;
  clanHurt = function (e) {
    hurt0(e);
    const c = e.cl, C = clan(); if (!c || e.dead || ['down', 'drag', 'attack', 'pounce'].includes(c.st) || c.z > 0) return;
    const k = e.hp / e.maxHp; if (k < TOUGH.furyMin || c.pers === 'cowardly' || c.kind === 'skinny' && C.rage <= 0) return;
    const p = TOUGH.fury + TOUGH.furyAgg * c.P.agg + (C.rage > 0 ? TOUGH.furyRage : 0) + (c.kind === 'leader' ? 0.25 : 0);
    if (Math.random() > p) return;
    // wounded and furious: it screams at you and comes straight back
    c.done = 0; c.fear = Math.max(0, c.fear - 0.35); c.hunter = 1;
    if (C.tok && C.tok.dead) C.tok = null;
    clanGo(e, 'attack', { now: 1 });   // a scream in your face (or, if another is already coming, a threat) and back at you
  }; }
{ const parry0 = clanParry;
  clanParry = function (e, A, d) {
    const c = e.cl, hop = c.hop, cd = c.dgCd || 0;
    parry0(e, A, d);
    if ((c.dgCd || 0) === cd) return;   // it didn't read this swing at all
    if (c.hop === hop && !(c.block > S.t) && c.club && Math.random() < TOUGH.block) { c.block = S.t + 0.55; c.o.facing = 1; }   // caught it on the club after all
    c.dgCd -= TOUGH.dodgeCd;   // and ready for the next one sooner
  }; }
