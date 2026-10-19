// ================= what a dead cannibal is worth (Joe) =================
// Killing one is worth the risk now. It leaves what it carried on the ground by its body: bone and hide always, often flint,
// its club when it had one, and a tooth. The leader leaves far more. The game tells you plainly: a big line with what it
// dropped and how few of them are left in the woods, and the day's journal keeps the tally.
// Their teeth make a Tooth necklace (by hand: 3 teeth, 2 fibre). Carry one and the clan knows what you've done: they lose
// their nerve sooner and come at you less (it doesn't stop them when they're out for blood).
Object.assign(DIT, {
  ctooth: { n: 'Cannibal tooth', c: '#e8dcc0', st: 20, k: 'mat', b: 'Taken from one of the clan · three make a tooth necklace' },
  cneck: { n: 'Tooth necklace', c: '#d8c8a0', st: 1, k: 'mat', b: 'Carry it · the clan knows what you\'ve done, and they lose their nerve sooner' },
});
DREC.push({ id: 'cneck', g: 'gear', out: 'cneck', at: 'hand', cost: { ctooth: 3, fibre: 2 } });
Object.assign(ICON, {
  ctooth: '<path d="M8 4.5c2-1 6-1 8 0 1.5 1 1.5 4 .5 6.5L15 19c-.3 1.5-2 1.5-2.2 0L12 13.5 11.2 19c-.2 1.5-1.9 1.5-2.2 0L7.5 11C6.5 8.5 6.5 5.5 8 4.5z" fill="#e8dcc0"/><path d="M9 6.5c1.5-.6 4.5-.6 6 0" stroke="#b8a888" stroke-width="1" fill="none"/>',
  cneck: '<path d="M4 5c1 7 4 10 8 10s7-3 8-10" stroke="#8a6a44" stroke-width="1.3" fill="none"/><g fill="#e8dcc0"><path d="M6.6 10.5l1.6.9-.6 3.4z"/><path d="M9.2 13l1.6.4.2 3.6z"/><path d="M12 14l1.4.2-.7 4.3z"/><path d="M14.4 13.4l1.6-.4-1.2 3.4z"/><path d="M16.6 11.4l1.6-.9-1 3.3z"/></g>',
});
const SPOILS = { bone: [2, 3], hide: [1, 1], flint: [1, 2], flintP: 0.5, clubP: 0.7, lead: 3 };   // the leader leaves three times as much
const spN = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
function clanSpoils(e, g) {   // g, its body: the bone, hide and teeth are in it, for your knife (88-meat); what it carried falls by it
  const c = e.cl || {}, k = c.kind === 'leader' ? SPOILS.lead : 1, got = [];
  const drop = (id, n) => { if (n <= 0) return; dayDrop(e.x, e.y, id, n); got.push(n > 1 ? `${DIT[id].n.toLowerCase()} ×${n}` : DIT[id].n.toLowerCase()); };
  const cut = (id, n) => { if (n <= 0) return; if (g) cutAdd(g, id, n); else drop(id, n); };
  cut('bone', spN(SPOILS.bone) * k); cut('hide', spN(SPOILS.hide) * k);
  if (k > 1 || Math.random() < SPOILS.flintP) drop('flint', spN(SPOILS.flint) * k);
  if (c.club && Math.random() < SPOILS.clubP) drop('club', 1);
  cut('ctooth', k);
  return got;
}
{ const died = clanDied;
  clanDied = function (e) {
    died(e);
    const D = S.day; if (!D) return;
    const g = cutBody(clan().dead.find(q => q.e === e)), got = clanSpoils(e, g), lead = e.cl && e.cl.kind === 'leader';
    D.clanKills = (D.clanKills || 0) + 1;
    const left = D.clanN ?? CL.pool;
    exNote(`${lead ? 'their leader is dead' : 'a cannibal dead'} · ${left ? `${left} of them left in the woods` : 'the last of them'}${got.length ? ` · it dropped ${got.join(', ')}` : ''}`, true);
    if (g) cutTell(g);
    dayJLog(lead ? `killed the clan's leader (${D.clanKills} of them dead)` : `killed a cannibal (${D.clanKills} of them dead)`);
    if (actx) { const t = actx.currentTime; boomAt(t + 0.15, 110, 55, 0.4, 0.35, sfxGain); toneAt(t + 0.2, 196, 0.9, 0.05, 'triangle', sfxGain); }
    dayChanged();
  }; }
// the necklace: they know what you've done
const clanNeck = () => !!(S.day && S.day.inv.some(s => s && s.id === 'cneck'));
{ const conf = clanConf; clanConf = function (e) { return conf(e) - (clanNeck() && !(clan().rage > 0) ? 0.22 : 0); }; }
