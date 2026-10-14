# Farm Walk

A small Phaser 3 game: walk around a farm with the arrow keys / WASD, or tap where you want to go.

## Play / install

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
