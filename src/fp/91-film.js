// ================= the old film look, as the 2D game has it =================
// Joe: "a toggle in settings to add the film camera grain that is on the original behind you. Make sure it doesn't effect
// performance". Settings → Film grain puts on the 2D game's look: its grain, as strong as it is there, its heavier vignette,
// the exposure flicker of an uneven old projector, and the odd speck of dust or a hair for a frame. All of it is plain layers
// over the picture, laid on by the browser as it puts each frame on the screen: the 3D renderer draws nothing more, and there's
// no blending mode that would make the screen be read back. Each frame only moves the grain and sets a shade or two; the
// flicker layer is left out on the frames (most of them) where it wouldn't change a pixel. Off, the faint grain this version
// has always had is as it was.
SET.film = !!SET.film;
const FILM = { flick: 0, op: -1, col: '', base: grainEl.style.backgroundImage, tile: '', dust: [] };
{   // the grain: dark and light specks over a clear tile, about the 2D game's grain at its strength (it lays its noise on in overlay)
  const N = 192, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = Math.random() - 0.5, w = v > 0; d[i] = d[i + 1] = d[i + 2] = w ? 255 : 0; d[i + 3] = Math.abs(v) * (w ? 0.2 : 0.28) * 255; }
  g.putImageData(img, 0, 0); FILM.tile = `url(${c.toDataURL()})`;
}
{   // dust and hairs: a light and a dark of each, shown one at a time
  const svg = b => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'>${b}</svg>`)}")`;
  const L = 'rgba(235,235,228,0.5)', Dk = 'rgba(0,0,0,0.6)';
  for (const b of [`<circle cx='24' cy='24' r='1.6' fill='${L}'/>`, `<circle cx='24' cy='24' r='1.9' fill='${Dk}'/>`,
    `<path d='M8 30Q20 14 40 20' stroke='${L}' stroke-width='0.8' fill='none'/>`, `<path d='M10 16Q26 34 38 26' stroke='${Dk}' stroke-width='0.8' fill='none'/>`]) {
    const el = document.createElement('div'); el.className = 'dust'; el.style.backgroundImage = svg(b); document.body.insertBefore(el, $('cold')); FILM.dust.push({ el, on: false });
  }
}
function filmSync() {
  document.body.classList.toggle('film', SET.film);
  grainEl.style.backgroundImage = SET.film ? FILM.tile : FILM.base; grainEl.style.backgroundSize = SET.film ? '192px 192px' : '256px 256px';
  $('sFilm').setAttribute('aria-pressed', SET.film ? 'true' : 'false');
  if (!SET.film) { FILM.flick = 0; FILM.op = -1; for (const q of FILM.dust) if (q.on) { q.on = false; q.el.style.opacity = 0; } }
}
function filmFrame() {
  if (!SET.film) return;
  // the exposure flicker: under half a shade it would change nothing, so it's left out
  FILM.flick += (Math.random() - 0.5) * 0.01; FILM.flick *= 0.85;
  const up = FILM.flick > 0, op = up ? FILM.flick * 0.6 : -FILM.flick * 1.5, el = $('flick');
  const show = op > 0.5 / 255 ? Math.round(op * 1000) / 1000 : 0;
  if (show && (up ? '#fffffa' : '#000') !== FILM.col) { FILM.col = up ? '#fffffa' : '#000'; el.style.background = FILM.col; }
  if (show !== FILM.op) { FILM.op = show; el.style.opacity = show; }
  // a speck of dust or a hair, for a frame now and then
  for (const q of FILM.dust) if (q.on) { q.on = false; q.el.style.opacity = 0; }
  if (Math.random() < 0.12) {
    const q = FILM.dust[(Math.random() * 4) | 0], s = 0.6 + Math.random() * 0.9;
    q.on = true; q.el.style.transform = `translate(${(Math.random() * innerWidth) | 0}px, ${(Math.random() * innerHeight) | 0}px) rotate(${(Math.random() * 360) | 0}deg) scale(${s.toFixed(2)})`; q.el.style.opacity = 1;
  }
}
{ const ss = syncSet; syncSet = function () { ss.apply(this, arguments); filmSync(); }; }
$('sFilm').addEventListener('click', () => { SET.film = !SET.film; saveSet(); syncSet(); });
filmSync();
