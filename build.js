// Packs the first-person Daylight into one page: three.js, the main game's Daylight code (src/ported.js, lifted by tools/port.js),
// the few stand-ins it needs (src/shim.js), the first-person view (src/fp/*.js), the sprite sheet, the floor and the sounds.
const fs = require('fs'), path = require('path');
const out = process.argv[2] || 'dist/index.html';
const three = fs.readFileSync('tools/three.min.js', 'utf8').replace(/^console\.warn\([^\n]*\),\n/, 'void 0,\n');
const fp = fs.readdirSync('src/fp').filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join('src/fp', f), 'utf8'));
let game = [fs.readFileSync('src/shim.js', 'utf8').replace(/^'use strict';\n/, ''), fs.readFileSync('src/ported.js', 'utf8').replace(/^'use strict';\n/, ''), ...fp].join('\n;\n');
const rep = (s, k, v) => s.split(k).join(v);
game = rep(game, '/*ATLAS*/', 'data:image/png;base64,' + fs.readFileSync('assets/atlas.png').toString('base64'));
game = rep(game, '/*ATLASMETA*/0', fs.readFileSync('assets/atlas.json', 'utf8'));
game = rep(game, '/*FLOOR*/', 'data:image/jpeg;base64,' + fs.readFileSync('assets/floor.jpg').toString('base64'));
game = rep(game, '/*SND*/0', fs.readFileSync('assets/snd.json', 'utf8'));
game = rep(game, '/*RAIN*/', fs.readFileSync('assets/rain.mp3').toString('base64'));
game = rep(game, '/*VOX*/0', fs.readFileSync('assets/voices.json', 'utf8'));
game = rep(game, '/*AMB*/', fs.readFileSync('assets/ambience.mp3').toString('base64'));
game = rep(game, '/*BEACH*/false', process.env.BEACH ? 'true' : 'false');   // the test beach (src/fp/15-sea.js): BEACH=1 node build.js
let html = fs.readFileSync('src/shell.html', 'utf8');
html = rep(html, '/*DAYCSS*/', fs.readFileSync('src/daylight.css', 'utf8'));
html = rep(html, '/*THREE*/', three.replace(/<\/script/g, '<\\/script'));
html = rep(html, '/*GAME*/', game.replace(/<\/script/g, '<\\/script'));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(out, (html.length / 1e6).toFixed(2) + ' MB');
