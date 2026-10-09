const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 300 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///mnt/project-files/behind-you/behind-you-v202-juice.html');
  await p.waitForTimeout(1500);
  const out = await p.evaluate(() => {
    const res = { colour: COLOUR, kinds: {} };
    const want = ['pine','oak','cherry','dead','bush','fern','grass','rock','flowerY','flowerB','flowerR','log','firepit','lamp','post','shrooms','woodpile','crateB','barrel'];
    for (const kind of want) {
      const K = SPRITE_KINDS[kind]; if (!K) continue;
      const [n, w, h, ax, ay, paint, snow] = K; res.kinds[kind] = [];
      for (let v = 0; v < n; v++) {
        SPR = ['pine','oak','cherry','dead'].includes(kind) ? 4 : 3; MATK = KIND_MAT[kind] || null; SPR_EDGE = !NO_EDGE.has(kind);
        let s; try { s = makeSprite('x' + kind + v, w, h, ax, ay, g => paint(g, sprRand(v * 977 + kind.length * 131 + 7), 1)); } finally { MATK = null; SPR_EDGE = false; }
        res.kinds[kind].push({ w, h, ax, ay, png: s.cv.toDataURL('image/png'), pw: s.cv.width, ph: s.cv.height });
      }
    }
    // floor tile at 2x
    const src = floorPattern.toString().replace('q = 1', 'q = 2').replace('floorPat = ctx.createPattern(cv, \'repeat\'); floorPat.setTransform(new DOMMatrix().scale(1 / q));\n  return floorPat;', 'return cv;').replace('if (floorPat) return floorPat;', '');
    const fp = (0, eval)('(' + src + ')');
    const cv = fp(); res.floor = cv.toDataURL ? cv.toDataURL('image/jpeg', 0.9) : String(cv);
    res.snd = Object.assign({ step: STEP_WAV }, MON_WAV);
    return res;
  });
  fs.writeFileSync('spr/export.json', JSON.stringify(out));
  console.log(out.colour, Object.fromEntries(Object.entries(out.kinds).map(([k, v]) => [k, v.length + ' ' + v[0].pw + 'x' + v[0].ph])), out.floor.slice(0, 40), Object.keys(out.snd));
  await b.close();
})();
