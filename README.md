# Farm Walk

A small Phaser 3 game: walk around a farm with the arrow keys / WASD, or tap where you want to go.
Walk into the farmhouse, barn or tool shed (or tap one) to go inside, where
everything is shown about 3x bigger; walk out the door to leave. Tap a well, the
pond or a tractor and he walks over and you see what he sees: down the well,
out over the pond from the end of the jetty, or from the tractor's seat. In
the farmhouse, tap the fireplace to look into the fire (`src/views/`). Tap the
big pine at the bottom right of the farm to stand under it among its pine cones
(a secret: tap the bottom right cone, then the top right one, to choose a
day of the week to start on, with the story done up to then).

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
crossroads (`src/RoadScene.js`; the map is
`public/assets/crossroads.jpg`). Up goes back to the farm (or tap
right at the top); left goes to **the beach**, a little seaside village with
its cafe, the sand and a jetty (`src/BeachScene.js`). Its people are real
characters like Farmer Jones and Bob, drawn the same way, each with a name
(`src/villagers.js`): Anika and Kobus stroll the village road, Derik fishes
off the jetty with Lientjie watching, three guests sit at the cafe and two
sunbathers on the sand; tap one and Farmer Jones walks over. Boats rock gently
at anchor, a fish jumps now and then, coffee steams at the cafe, and the
umbrellas are drawn in front of whoever sits under them (`src/seaside.js`; the
boats and canopies are cut out of the picture, `art/beach-source.jpg`, and its
people taken out, by `scripts/cut-seaside.py`). Tap the **Cozy Seaside Cafe**
(or its deck) and Boer Johan goes in (`src/cafe.js`, the room in
`src/interiors.js`): he'd love a coffee, so he orders one from Sannie (Sally in
English) at the counter, checks his wallet (his view of it,
`src/views/wallet.js`) and finds he hasn't a cent in cash; she says to come
back when he has some. Derik, fishing off the jetty, lends him R15 (tap him;
`src/derik.js`): "Bring dit sommer oormore aand as jy by ons kom braai." Back
at the counter Johan pays, Sannie makes his coffee, and he carries it about,
steaming. Back home that coffee keeps him up: in bed he's not tired enough,
and needs some exercise first. His **bicycle** is in the barn (tap it; before
the coffee he'd love to, but he's got other things to do today): from
then on he rides it everywhere he'd walk, only faster: the farm, the
crossroads, the beach, and indoors too (`src/bike.js`; the sprite is drawn in
`src/CharacterSprite.js`). The barn is the only place it's put away: ride in
there and he leaves it on its stand. A good long ride tires him out, and
then he can sleep.

**Days.** The game is a week long: the story starts on a **Monday**, each
night is a new day, and after Sunday night the week, and the game, is done
(under the stars, "the week is done!", then a new week). Each night is a new day
(`src/days.js`; the day is always shown at the top of the screen, and in the menu). Farmer Jones only goes to
sleep when he's tired: after eating the pie, or after a good long bike ride
(coffee wakes him up again). Then the room goes dark, and the night passes
over the farm as a pixel-art animation (`src/night.js`): the sun setting in
gold and pink, dusk, stars and the moon going down behind the hills (a
shooting star, the farmhouse's windows lit), first light and the sun coming
up; the day at the top changes with the dawn. He's up in the early light,
thinking of what the day holds (`src/morning.js`). So: Monday he bakes and eats the pie and sleeps; Tuesday Bob comes by,
and so on. Derik's braai is the evening of the day after tomorrow from when
he lent the R15: Derik, and Johan's first thought of the day, remind him as it comes up, and
it can't be before then. (The braai itself is still to come.)

**Wednesday** there's farm work before bed (`src/chores.js`; the morning
screen and the menu list it, ticked off as it's done). Plough the land: in
the tractor the keys are gone again, the engine silent; they're on the
bookshelf in the farmhouse, and with them the engine starts and off he goes,
clods rolling past. And see that the wells work: a bucket from each. The top
one comes up full (and the pail beside that well has water in it after); the
bottom one, by the orchard, comes up empty: that well has run dry (to put
right on Thursday). Both done, he's tired out and can go to bed. That
afternoon **the town** opens: down the road from the crossroads (before then
he turns back: "not today", or "farm work first"), a square with a fountain,
houses, a cafe and a restaurant to walk round (`src/TownScene.js`; the map is
`public/assets/town.jpg`, from `art/town-source.jpg`, its paths baked into
`src/townMask.js` by `scripts/build-masks.py`). The road out at the top right
goes back to the crossroads. Right from the crossroads is **Bob's farm**
(Pieter se plaas: `src/PieterScene.js`, `public/assets/pieter.jpg`): in by the
road from the left, up to his farmhouse's stoep, and down the path to the
braai with its fire going. Off the bottom left of the crossroads, a path
leads to **the river** (`src/RiverScene.js`, `public/assets/river.jpg`): a gold
diggers' camp with a tent, pans and a sluice, a rocker on the near sandbar and
more pans on the far one, across a shallow ford. The picture maps are
`src/MapScene.js` scenes. In conversations
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

All lettering is drawn at the phone's own screen sharpness: the game draws
at up to twice the page's pixel size (`UI` in `src/screen.js`) and every size
on screen (text, bubbles, buttons, the tap marker) is scaled by it. Speech,
thoughts, captions and replies are a sturdy bold monospace (`FONT` in
`src/bubble.js`) with a little space between lines.

## Play / install

**Play: https://marco-wings-bester.github.io/iso/**

Opened in a browser (a shared link, say), the game greets you each time
with a **welcome card**: how to install it, step by step for the phone and
browser it's open in (or, when Chrome offers it, a one-tap **Install now**;
from an iPhone app's own browser, how to get it into Safari), and where the
menu is. Closing it points at the menu button; until it's installed, a
yellow **⬇ Install** button sits beside it (`src/menu.js`).

Open the **☰ menu** (bottom-left) to **Install app**, **Share game** (sends
the link through the phone's share sheet), **Update game** (load the newest
version now), start a **New game** (back to the farm gate with the story
reset, so Bob isn't waiting there yet), or choose the language and hints. Installing on Android needs Chrome;
if the link opened inside another app, the menu offers **Open in Chrome** first.

Open the GitHub Pages site (deployed from the default branch, `claude/phaser-character-walk-game-gej34`). It's an installable app (PWA) that works offline once it's loaded (the service worker, `src/sw.js`, is built with each release's id in its cache's name, and pictures are loaded with it in their address, `src/asset.js`, so a new release never shows pictures cached for an older one):

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
and the beach's road, sand and jetty are baked the same way, into
`src/roadMask.js` and `src/beachMask.js`, by `scripts/build-masks.py` from
`public/assets/crossroads.jpg` and `public/assets/seaside.jpg`.

## Buildings

Door positions on the farm are in `src/buildings.js`. The interiors are drawn
as pixel art in code in `src/interiors.js` (room size, door gap, furniture
that blocks walking, and a `draw` function per room).
