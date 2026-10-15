// ================= the wisp upgrades as a tab of the pack, beside Pack, Craft, Book and Journal =================
// The main game shows them on a screen of their own (#stats). Here that same list is lifted into the pack while the Wisps tab
// is up, and put back where it was if the screen of its own is ever opened.
const wispBody = $('statsBody'), wispWrap = document.createElement('div'), wispHead = document.createElement('p');
wispWrap.className = 'wispsTab'; wispHead.className = 'eyebrow';
function wispHome() { if (wispBody.parentElement !== statsEl.querySelector('.pick')) statsEl.querySelector('.pickfoot').before(wispBody); }
{
  const basePack = renderPack, baseStats = renderStats, baseOpen = openStats;
  renderPack = function () {
    basePack();
    if (PK.tab !== 'wisps') return;
    const pc = $('pkCard'); pc.replaceChildren(); pc.hidden = true; craftEl.classList.remove('carded');
    if (statsFrom !== 'pack') { statsFrom = 'pack'; statCat = null; statOpen = null; }
    wispWrap.replaceChildren(wispHead, wispBody); $('pkBody').replaceChildren(wispWrap);
    baseStats(); wispHead.textContent = `${stPool().w} wisps to spend · bring them back to your bed or fire`;
  };
  renderStats = function () { baseStats(); if (wispBody.parentElement === wispWrap) wispHead.textContent = `${stPool().w} wisps to spend · bring them back to your bed or fire`; };
  openStats = function (from) { wispHome(); baseOpen(from); };
}
// the Wisps button in camp (on a phone) opens the pack on this tab
function openWisps() { PK.tab = 'wisps'; statsFrom = null; openCraft(); }
