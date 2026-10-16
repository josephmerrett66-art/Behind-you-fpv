# Behind You: first person

*Behind You*'s **Daylight** mode, played in first person. Open `index.html` in any browser (phone, tablet, desktop or with a controller). It is one self-contained file.

It runs Daylight's own rules: the day and night clock, hunger, thirst, stamina and warmth, bleeding, gathering, the pack, crafting and the recipe book, building (campfires, walls, benches, the hammer's floors, walls and roofs), tools and weapons with their specials, bows, slings and throwing, animals to hunt and tame, raiders by day and the shades at night, raider camps and their relics, the signal fire, the weather, saving and the death card. Only the drawing is new: the woods, the camp, the people and animals, what you hold and the HUD are stood up in 3D around you.

- **Touch:** the left thumb moves, the right thumb looks (Attack also drags to look). Take picks up, opens and drinks; Pack crafts and equips; tap the hotbar to hold something. Hold Attack with a bow or sling to draw, let go to loose.
- **Keyboard and mouse:** WASD moves, the mouse looks, click attacks, chops and mines, right-click or Space rolls. E takes, C opens the pack, 1 to 6 or the wheel pick from the hotbar, Q sneaks, H drinks a flask, Shift uses your weapon's special. With the hammer: Z and X turn, [ and ] change piece, N changes kind, V snaps, B pulls down. Esc opens the menu.
- **Controller:** the left stick moves, the right stick looks, RT or A attacks, B rolls, X takes, Y uses your special, the bumpers pick from the hotbar, LT drinks a flask, clicking the left stick sneaks, View opens the pack and Menu pauses.

## How it's built
- `src/ported.js` is Daylight's code lifted word for word from the main game by `tools/port.js` (what it takes and what it leaves is in `tools/port.config.js`). Run `node tools/port.js <main game script> > src/ported.js` to bring in a newer version. `src/shim.js` stands in for the main game's screen-drawing parts that this version doesn't use.
- `src/fp/*.js` is the first-person part, made with three.js (r158): the world and its lighting (`00-core`, `10-world`), people and animals (`20-figures`), items, buildings and camps (`30-things`), the per-frame step (`40-sim`), sound (`45-audio`), controls (`50-input`), the HUD and gathering hints (`60-hud`, `65-hints`), your hands (`70-hands`), weather (`85-weather`) and the frame loop (`90-main`).
- `src/shell.html` is the page (HUD, menus and styles); `src/daylight.css` is the main game's styles for the pack, crafting and death card.
- `assets/` holds the main game's own painted sprites (`atlas.png`, `atlas.json`), the forest floor tile, Joe's sound samples, the night ambience, and the clan's recorded voices (`voices.json`: 73 short CC0 screams, grunts, growls, calls, wails and death cries cut from Freesound recordings, listed in `VOICES.md`), painted by the main game's code (`tools/exp.js`, `tools/pack.js`).
- `node build.js index.html` packs everything into the single `index.html`.
