const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const ex = JSON.parse(fs.readFileSync('spr/export.json'));
  delete ex.kinds.stump;   // stumps are rejected for good
  const b = await chromium.launch(); const p = await b.newPage();
  const res = await p.evaluate(async (ex) => {
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const items = [];
    for (const k in ex.kinds) for (let v = 0; v < ex.kinds[k].length; v++) { const s = ex.kinds[k][v]; items.push({ k, v, s, img: await load(s.png) }); }
    items.sort((a, b) => b.s.ph - a.s.ph);
    const W = 2048, PAD = 2; let x = 0, y = 0, rowH = 0; const rects = [];
    for (const it of items) { if (x + it.s.pw + PAD > W) { x = 0; y += rowH + PAD; rowH = 0; } it.x = x; it.y = y; x += it.s.pw + PAD; rowH = Math.max(rowH, it.s.ph); }
    const H = 1 << Math.ceil(Math.log2(y + rowH));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const meta = {};
    for (const it of items) { g.drawImage(it.img, it.x, it.y); (meta[it.k] = meta[it.k] || [])[it.v] = [it.x, it.y, it.s.pw, it.s.ph, it.s.w, it.s.h, it.s.ax, it.s.ay]; }
    return { W, H, meta, png: cv.toDataURL('image/png') };
  }, ex);
  fs.writeFileSync('spr/atlas.png', Buffer.from(res.png.split(',')[1], 'base64'));
  fs.writeFileSync('spr/atlas.json', JSON.stringify({ W: res.W, H: res.H, meta: res.meta }));
  fs.writeFileSync('spr/floor.jpg', Buffer.from(ex.floor.split(',')[1], 'base64'));
  console.log(res.W, res.H);
  await b.close();
})();
