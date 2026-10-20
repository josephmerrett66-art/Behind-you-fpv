// Packs the recorded sound effects into assets/sfx.json ({ kind: [base64 mp3, ...] }, read by src/fp/46-sfx.js) and writes
// assets/SOUNDS.md, where every clip came from and under what licence.
//   node tools/sfxpack.js <lib dir>
// The lib dir holds <source key>/<source key>_<n>.mp3 (mono 22.05 kHz mp3s, trimmed and levelled) and manifest-*.json files,
// each an array of { key, file, title, author, license, page_url } for those clips. Clips named k_* are from Kenney's CC0
// packs and need no manifest. Each kind the game asks for is filled from a list of source keys, best first, up to a cap.
const fs = require('fs'), path = require('path');
const lib = process.argv[2]; if (!lib) { console.error('usage: node tools/sfxpack.js <lib dir>'); process.exit(1); }
const KENNEY = {
  impact: { title: 'Impact Sounds', page: 'https://kenney.nl/assets/impact-sounds' },
  rpg: { title: 'RPG Audio', page: 'https://kenney.nl/assets/rpg-audio' },
  ui: { title: 'Interface Sounds', page: 'https://kenney.nl/assets/interface-sounds' },
};
const kPack = k => /^k_(door|creak|cloth|knife|chop|metal_click|latch|pot|leather|belt|book|coins|step_rpg)/.test(k) ? 'rpg' : 'impact';
// the game's kind: [source keys, best first], how many clips at most
const MAP = {
  step_grass: [['k_step_grass', 'footstep_grass'], 8], step_leaves: [['footstep_leaves', 'k_step_grass'], 8], step_dirt: [['footstep_dirt', 'k_step_rpg'], 8],
  step_sand: [['footstep_sand', 'k_step_snow'], 7], step_wood: [['k_step_wood', 'footstep_wood'], 7], step_stone: [['k_step_stone', 'footstep_stone'], 7],
  step_mud: [['footstep_mud'], 6], water_wade: [['water_wade'], 6],
  wood_l: [['k_wood_l'], 4], wood_m: [['k_wood_m'], 4], wood_h: [['k_wood_h'], 4], plank: [['k_plank'], 4], metal_l: [['k_metal_l'], 4], metal_m: [['k_metal_m'], 4],
  mining: [['k_mining'], 5], punch: [['k_punch_m', 'k_punch_h'], 5], body_fall: [['body_fall', 'k_soft_h'], 4], hit_flesh: [['hit_flesh', 'k_punch_h'], 6],
  blade_flesh: [['blade_flesh', 'k_knife_slice'], 4], meat_cut: [['meat_cut', 'k_knife_slice'], 4], blade_draw: [['k_knife_draw'], 2],
  cloth: [['k_cloth'], 4], leather: [['k_leather', 'k_belt'], 4], bag: [['bag', 'k_cloth'], 4], paper: [['paper', 'k_book_flip'], 3],
  door_open: [['k_door_open'], 3], door_close: [['k_door_close'], 3], creak: [['k_creak'], 3], latch: [['k_latch', 'k_metal_click'], 3], pot: [['k_pot'], 2],
  bell: [['bell', 'k_bell'], 2], chop_wood: [['chop_wood', 'k_chop'], 8], craft: [['hammer_wood', 'k_wood_l'], 3], hammer_wood: [['hammer_wood', 'k_wood_m'], 5],
  build_thud: [['build_thud', 'k_wood_h'], 4], wood_break: [['wood_break', 'k_wood_h'], 4], stick_pick: [['stick_pick', 'k_wood_l'], 4], stone_pick: [['stone_pick'], 3],
  chest_open: [['chest_open', 'k_door_open'], 2], chest_close: [['chest_close', 'k_door_close'], 2], metal_clang: [['metal_clang', 'k_metal_m'], 3],
  fire_ignite: [['fire_ignite', 'fire_light', 'match_strike'], 3], chimes: [['chimes'], 2], snap: [['line_snap'], 2],
  bird_song: [['bird_song'], 14], drum: [['drum'], 8], bed_day: [['bed_day'], 1], bed_night: [['bed_night'], 1], bed_wind: [['bed_wind'], 1],
  bed_pond: [['bed_pond'], 1], bed_cave: [['bed_cave'], 1], fire_loop: [['fire_loop'], 1],
};
const CAP = 6;
// the clips there are, by source key
const have = {};
for (const d of fs.readdirSync(lib)) {
  const dir = path.join(lib, d); if (!fs.statSync(dir).isDirectory()) continue;
  const f = fs.readdirSync(dir).filter(n => n.endsWith('.mp3')).sort((a, b) => (+a.match(/_(\d+)\.mp3$/)?.[1] || 0) - (+b.match(/_(\d+)\.mp3$/)?.[1] || 0));
  if (f.length) have[d] = f.map(n => path.join(d, n));
}
const meta = {};
for (const m of fs.readdirSync(lib).filter(n => /^manifest-.*\.json$/.test(n))) for (const e of JSON.parse(fs.readFileSync(path.join(lib, m), 'utf8'))) meta[e.file] = e;
const kinds = new Set([...Object.keys(MAP), ...Object.keys(have).filter(k => !k.startsWith('k_') && !k.startsWith('footstep_'))]);
const out = {}, used = [];
for (const k of [...kinds].sort()) {
  const [src, cap] = MAP[k] || [[k], CAP], files = [];
  for (const s of src) for (const f of have[s] || []) if (files.length < cap) files.push(f);
  if (!files.length) continue;
  out[k] = files.map(f => fs.readFileSync(path.join(lib, f)).toString('base64'));
  for (const f of files) used.push([k, f]);
}
fs.writeFileSync('assets/sfx.json', JSON.stringify(out));
// the credits
const rows = used.map(([k, f]) => {
  const m = meta[f], src = f.split('/')[0];
  if (src.startsWith('k_')) { const P = KENNEY[kPack(src)]; return [k, `Kenney · ${P.title}`, 'Kenney (kenney.nl)', 'CC0 1.0', P.page]; }
  if (!m) return [k, f, '?', '?', ''];
  const lic = /Designer's Choice/.test(m.license || '') ? "Designer's Choice royalty-free" : (m.license || '').replace(/ \(page (also )?offers.*\)$/, '');
  return [k, m.title || f, m.author || '', lic, m.page_url || m.file_url || ''];
});
const md = ['# Sound effects', '',
  'Every sound the game plays that was made up out of noise and tones now has real recordings behind it (src/fp/46-sfx.js picks',
  'one at random each time). They were all found free to use: CC0 or public domain where possible, some CC-BY or OGA-BY',
  '(credited here, as those licences ask). Each was cut to the sound itself, made mono and levelled. Packed by',
  '`node tools/sfxpack.js <lib dir>` into assets/sfx.json.', '',
  "\"Designer's Choice royalty-free\" is The Designer's Choice sound collection on archive.org, tagged CC0 there, whose own licence",
  'file adds a few terms (among them: the sounds are not to be resold as sounds or passed off as your own recordings). Where a',
  'page offered several licences, CC0 was taken.', '',
  '| Kind | Recording | By | Licence | Source |', '|---|---|---|---|---|',
  ...rows.map(r => `| ${r.slice(0, 4).map(c => String(c).replace(/\|/g, '/')).join(' | ')} | ${r[4] ? `[link](${r[4]})` : ''} |`), ''];
fs.writeFileSync('assets/SOUNDS.md', md.join('\n'));
const bytes = Object.values(out).flat().reduce((a, s) => a + s.length, 0);
console.log(`${Object.keys(out).length} kinds, ${used.length} clips, ${(bytes / 1e6).toFixed(2)} MB of base64`);
const missing = [...kinds].filter(k => !out[k]); if (missing.length) console.log('no clips for:', missing.join(' '));
