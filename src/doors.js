import { think } from './bubble.js';

// Knocking at people's front doors (the town: src/townDoors.js; the beach:
// src/beachDoors.js). A house: `area` to tap, `via` the way up to its door
// (the first point on the walkable path, the rest over its own garden path
// or stoep), `door` (its foot, middle; `rect`, the doorway itself, if it
// opens), `stand` (where he knocks from), and `answer(scene, house)`: what
// happens when he knocks.

export const wait = (scene, ms) => new Promise(r => scene.time.delayedCall(ms, r));

// A voice from behind a door (its top: where the bubble points).
export const voice = (door, name, color) => ({ x: door.x, y: door.y - 70, name, color });

export const jones = scene => ({ get sprite() { return scene.player.sprite; }, name: { af: 'Johan', en: 'Jones' }, color: '#b8402e' });

export function inHouse(houses, x, y) {
  return houses.find(({ area: a }) => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h);
}

// Up the path to its door, a knock, whoever answers (or not), and back
// down to the path (unless he's been asked in: `answer` resolves 'in').
export function visit(scene, house) {
  const [first, ...rest] = house.via;
  scene.player.walkTo(first.x, first.y, () => scene.talk(async () => {
    const { player } = scene;
    await new Promise(r => player.follow([...rest, house.stand], r));
    player.face('up');
    await knock(scene);
    if (await house.answer(scene, house) === 'in') return;
    await new Promise(r => player.follow([...rest].reverse().concat(first), r));
  }));
}

export async function knock(scene) {
  const { sprite } = scene.player;
  for (let i = 0; i < 3; i++) {
    scene.tweens.add({ targets: sprite, y: sprite.y - 3, duration: 70, yoyo: true });
    await wait(scene, 220);
  }
  await think(scene, sprite, { af: 'Klop, klop!', en: 'Knock, knock!' });
  await wait(scene, 500);
}

export async function nobody(scene) {
  await wait(scene, 800);
  await think(scene, scene.player.sprite, { af: 'Niemand maak oop nie. Seker nie tuis nie.', en: "Nobody's answering. Probably not home." });
}

