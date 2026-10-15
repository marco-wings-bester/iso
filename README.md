# Farm Walk

A small Phaser 3 game: walk around a farm with the arrow keys / WASD, or tap where you want to go.
Walk into the farmhouse, barn or tool shed (or tap one) to go inside, where
everything is shown about 3x bigger; walk out the door to leave. Tap a well, the
pond or a tractor and he walks over and you see what he sees: down the well,
out over the pond from the end of the jetty, or from the tractor's seat
(`src/views/`).

## Play / install

**Play: https://marco-wings-bester.github.io/iso/**

Open the **☰ menu** (bottom-left) to **Install app** or **Share game** (sends
the link through the phone's share sheet). Installing on Android needs Chrome;
if the link opened inside another app, the menu offers **Open in Chrome** first.

Open the GitHub Pages site (deployed from `main`). It's an installable app (PWA) that works offline once it's loaded:

- **Android (Chrome):** menu ⋮ → *Install app* / *Add to Home screen*
- **iPhone/iPad (Safari):** Share → *Add to Home Screen*
- **Desktop (Chrome/Edge):** click the install icon in the address bar

## Develop

```sh
npm install
npm run dev      # http://localhost:3000/iso/
npm run build    # outputs dist/
```

## Walkable area

The character can only walk on the dirt path. It's baked from the map into
`src/walkMask.js` by `scripts/build-walkmask.py` (needs Pillow + numpy) —
re-run it if you change `public/assets/map.png`. Set `DEBUG_PATH = true` in
`src/constants.js` to see the walkable area in-game.

## Buildings

Door positions on the farm are in `src/buildings.js`. The interiors are drawn
as pixel art in code in `src/interiors.js` (room size, door gap, furniture
that blocks walking, and a `draw` function per room).
