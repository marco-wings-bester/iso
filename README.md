# Farm Walk

A small Phaser 3 game: walk around a farm with the arrow keys / WASD, or tap where you want to go.
Walk into the farmhouse, barn or tool shed (or tap one) to go inside, where
everything is shown about 3x bigger; walk out the door to leave. Tap a well, the
pond or a tractor and he walks over and you see what he sees: down the well,
out over the pond from the end of the jetty, or from the tractor's seat. In
the farmhouse, tap the fireplace to look into the fire (`src/views/`). Tap the
big pine at the bottom right of the farm to stand under it among its pine cones
(a secret: tap the bottom right cone, then the top right one, to choose a
level).

The story: the farmhouse is locked, so first find the house key (Farmer Jones
left it in the tractor: tap the tractor, then the key); read the recipe book
(farmhouse bookshelf); fetch the apple picker
from the tool shed and pick an apple (tap an apple tree, then an apple); bake
the pie (kitchen cupboard; `src/baking.js`) and eat half of it (tap it on the
table), which makes Farmer Jones sleepy; go to sleep, and Bob turns up at the
farm gate (and gets the other half). When Bob has finished it, there's a knock
at the farmhouse door: it's Bob's wife, Louise (Wiesie in Afrikaans), and Bob
needs hiding (tap the big chest; `src/sarah.js`). Then she comes in for a
chat: Jones can own up that Bob's in the chest (she waits) or keep mum (she
leaves). Either way the
chest is stuck: the crowbar in the tool shed prises it open, and Bob goes
home, with Louise or alone. Then Farmer Jones wants to go to town: tap right
at the bottom of the farm and he walks down the road past the gate to the
crossroads, **Level 2** (`src/RoadScene.js`; the map is
`public/assets/crossroads.jpg`, its roads baked by `scripts/build-roadmask.py`). Up goes back to the farm (or tap
right at the top); down to town, right to Bob's house and left to the
beach (those three are still to come). In conversations
Farmer Jones's replies are picked from two (`src/dialog.js`). Every speech
bubble, thought and caption stays up until a tap (or Space/Enter) moves it
along, so there's always time to read it; place names and messages stay until
the next tap. Doing things out of order gets a hint from Farmer Jones; how
much he gives away is set under **Hints** in the ☰ menu (None, the default /
Subtle / Explicit).

The game is in **Afrikaans** by default, where Farmer Jones is **Boer Johan**,
Bob is **Pieter** and Louise is **Wiesie**; switch to **English** under
**Taal / Language** in the ☰ menu. Every text is written in both languages side
by side as `{ af, en }`, and `t()` in `src/i18n.js` picks the one to show.

## Play / install

**Play: https://marco-wings-bester.github.io/iso/**

Open the **☰ menu** (bottom-left) to **Install app**, **Share game** (sends
the link through the phone's share sheet), **Update game** (load the newest
version now), start a **New game** (back to the farm gate with the story
reset, so Bob isn't waiting there yet), or choose the language and hints. Installing on Android needs Chrome;
if the link opened inside another app, the menu offers **Open in Chrome** first.

Open the GitHub Pages site (deployed from the default branch, `claude/phaser-character-walk-game-gej34`). It's an installable app (PWA) that works offline once it's loaded:

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
`src/constants.js` to see the walkable area in-game. The crossroads' four roads
are baked the same way into `src/roadMask.js` by `scripts/build-roadmask.py`
from `public/assets/crossroads.jpg`.

## Buildings

Door positions on the farm are in `src/buildings.js`. The interiors are drawn
as pixel art in code in `src/interiors.js` (room size, door gap, furniture
that blocks walking, and a `draw` function per room).
