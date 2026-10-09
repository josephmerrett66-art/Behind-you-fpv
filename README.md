# Behind You: first person

A first-person test of *Behind You*. Open `index.html` in any browser (phone, tablet, desktop or with a controller). It is one self-contained file.

- **Touch:** the left thumb moves, the right thumb looks, and Attack and Dodge also drag to look.
- **Keyboard and mouse:** WASD moves, the mouse looks, click attacks, Space, Q or right-click dodges, H drinks a flask and Esc opens the menu.
- **Controller:** the left stick moves, the right stick looks, RT or A attacks, B dodges, LT drinks a flask and Menu pauses.

## How it's built
- `src/game.js` is the game, made with three.js (r158). `src/shell.html` is the page: HUD, menus and styles.
- `assets/` holds the game's own painted sprites (`atlas.png`, `atlas.json`), the forest floor tile, Joe's sound samples and the night ambience. They were painted by the main game's code (`tools/exp.js`, `tools/pack.js`, run against a `behind-you-vNNN` file).
- `node build.js index.html` packs everything into the single `index.html`.
