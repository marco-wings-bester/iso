import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { converse } from './dialog.js';
import { think } from './bubble.js';
import { createVillager } from './CharacterSprite.js';

// The other houses in town (TownScene): tapping one, Johan walks up its
// path to the front door and knocks. Mostly nobody wants a visitor: in the
// house furthest left lives Tokkie, who opens up, with his mates cheering
// the rugby behind him, and can't see why Johan wants to visit now of all
// times ('metTokkie'); the neighbour up from the square is busy baking;
// behind another door they think he's selling something; one has only a
// dog at home; an old man can't hear him; and two have nobody home.
// (Faan's tailor shop and the restaurant he goes into: TownScene.)

const wait = (scene, ms) => new Promise(r => scene.time.delayedCall(ms, r));

// Tokkie: short hair, a green and gold rugby jersey, shorts.
const TOKKIE = {
  name: { af: 'Tokkie', en: 'Tokkie' }, color: '#1e6a3a',
  look: {
    hair: 'short', shorts: true,
    palette: {
      S: '#f0b890', s: '#c88a62', B: '#e8e4dc', d: '#a8a49c',
      R: '#c88a3a', r: '#9a6428', C: '#1e7a3e', c: '#145a2c', O: '#f4f0e8', o: '#c8c0b0',
    },
  },
};

// A voice from behind a door (its top: where the bubble points).
const voice = (door, name, color) => ({ x: door.x, y: door.y - 70, name, color });

const jones = scene => ({ get sprite() { return scene.player.sprite; }, name: { af: 'Johan', en: 'Jones' }, color: '#b8402e' });

// Each house: `area` to tap, `via` the way up to its door (the first point
// on the path, the rest over its own garden path), `door` (its foot, middle;
// `rect`, the doorway itself, if it opens), and what happens when he knocks.
export const HOUSES = [
  // the house furthest left (blue roof, up the path left of the square): Tokkie's
  {
    id: 'tokkie', area: { x: 80, y: 600, w: 360, h: 405 },
    via: [{ x: 484, y: 1084 }, { x: 410, y: 1055 }, { x: 330, y: 1022 }],
    door: { x: 291, y: 984 }, rect: { x: 276, y: 902, w: 30, h: 80 }, stand: { x: 297, y: 1014 },
    answer: atTokkie,
  },
  // at the top of the town
  {
    id: 'top', area: { x: 370, y: 330, w: 370, h: 395 },
    via: [{ x: 692, y: 732 }], door: { x: 617, y: 690 }, stand: { x: 624, y: 714 },
    answer: nobody,
  },
  // up from the square: the neighbour who checks her mail (src/townLife.js), baking
  {
    id: 'neighbour', area: { x: 520, y: 750, w: 340, h: 340 },
    via: [{ x: 780, y: 1092 }], door: { x: 752, y: 1048 }, stand: { x: 754, y: 1066 },
    answer: (scene, h) => converse(scene, { jones: jones(scene), her: voice(h.door, { af: 'Die buurvrou', en: 'The neighbour' }, '#905890') }, [
      ['her', { af: 'Wie’s daar? O, Johan! Ek het my hande vol deeg, my kind. Kom ’n ander keer, hoor!', en: "Who's there? Oh, Jones! My hands are full of dough, dear. Come another time, all right!" }],
    ]),
  },
  // left of the square
  {
    id: 'salesman', area: { x: 120, y: 1030, w: 360, h: 355 },
    via: [{ x: 396, y: 1388 }], door: { x: 367, y: 1344 }, stand: { x: 372, y: 1366 },
    answer: async (scene, h) => {
      await converse(scene, { jones: jones(scene), them: voice(h.door, { af: 'Agter die deur', en: 'Behind the door' }, '#5a4a3a') }, [
        ['them', { af: 'Ons koop niks, dankie!', en: "We're not buying anything, thanks!" }],
      ]);
      await think(scene, scene.player.sprite, { af: 'Ek verkoop mos niks nie…', en: "But I'm not selling anything…" });
    },
  },
  // lower left (blue roof): only the dog's home
  {
    id: 'dog', area: { x: 130, y: 1430, w: 460, h: 370 },
    via: [{ x: 484, y: 1804 }, { x: 430, y: 1780 }], door: { x: 390, y: 1745 }, stand: { x: 396, y: 1766 },
    answer: async (scene, h) => {
      await converse(scene, { dog: voice(h.door, { af: 'Hond', en: 'Dog' }, '#7a5a3a') }, [
        ['dog', { af: 'Woef! Woef! Woef-woef!', en: 'Woof! Woof! Woof-woof!' }],
      ]);
      await think(scene, scene.player.sprite, { af: 'Klink of net die hond tuis is.', en: "Sounds like only the dog's home." });
    },
  },
  // bottom left
  {
    id: 'bottom', area: { x: 130, y: 1870, w: 480, h: 420 },
    via: [{ x: 484, y: 2292 }, { x: 440, y: 2265 }], door: { x: 412, y: 2232 }, stand: { x: 416, y: 2252 },
    answer: nobody,
  },
  // bottom right (blue roof): an old man, hard of hearing
  {
    id: 'oldman', area: { x: 1020, y: 1980, w: 400, h: 400 },
    via: [{ x: 1076, y: 2380 }], door: { x: 1145, y: 2332 }, stand: { x: 1146, y: 2352 },
    answer: (scene, h) => converse(scene, { jones: jones(scene), him: voice(h.door, { af: 'Ou oom', en: 'Old man' }, '#6a6a6a') }, [
      ['him', { af: 'Hè? Wie’s daar?', en: "Eh? Who's there?" }],
      ['jones', { af: 'Dis Johan, oom!', en: "It's Jones, sir!" }],
      ['him', { af: 'Johan? Ek het niks bestel nie! Gaan weg!', en: "Jones? I didn't order anything! Go away!" }],
    ]),
  },
];

export function houseAt(x, y) {
  return HOUSES.find(({ area: a }) => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h);
}

// Up the path to its door, a knock, whoever answers (or not), and back
// down to the path.
export function visit(scene, house) {
  const [first, ...rest] = house.via;
  scene.player.walkTo(first.x, first.y, () => scene.talk(async () => {
    const { player } = scene;
    await new Promise(r => player.follow([...rest, house.stand], r));
    player.face('up');
    await knock(scene);
    await house.answer(scene, house);
    await new Promise(r => player.follow([...rest].reverse().concat(first), r));
  }));
}

async function knock(scene) {
  const { sprite } = scene.player;
  for (let i = 0; i < 3; i++) {
    scene.tweens.add({ targets: sprite, y: sprite.y - 3, duration: 70, yoyo: true });
    await wait(scene, 220);
  }
  await think(scene, sprite, { af: 'Klop, klop!', en: 'Knock, knock!' });
  await wait(scene, 500);
}

async function nobody(scene) {
  await wait(scene, 800);
  await think(scene, scene.player.sprite, { af: 'Niemand maak oop nie. Seker nie tuis nie.', en: "Nobody's answering. Probably not home." });
}

// Tokkie opens the door, his mates cheering the rugby inside; he can't see
// why Johan would come visiting now. The second time, he doesn't open.
async function atTokkie(scene, house) {
  const { door, rect } = house;
  const mates = voice(door, { af: 'Tokkie se pelle', en: "Tokkie's mates" }, '#c8a020');
  if (hasFlag('metTokkie')) {
    await converse(scene, { tokkie: voice(door, TOKKIE.name, TOKKIE.color) }, [
      ['tokkie', { af: 'Jy weer? Ek’s besig, ou maat! Die rugby!', en: "You again? I'm busy, mate! The rugby!" }],
    ]);
    return;
  }
  // the door opens: the dark hall, and Tokkie in it
  const k = scene.map.scale;
  const hall = scene.add.rectangle(rect.x, rect.y, rect.w, rect.h, 0x2a1a10).setOrigin(0).setDepth(door.y - 1);
  createVillager(scene, 'tokkie', TOKKIE.look);
  const tokkie = scene.add.sprite(door.x, door.y, 'tokkie').setOrigin(0.5, FEET_Y / FRAME_H).setScale(k).setDepth(door.y).play('tokkie-idle-down');
  // and the noise from inside
  const cheer = scene.time.addEvent({
    delay: 900, loop: true,
    callback: () => {
      const words = ['Hahaha!', 'Kom aan!', 'Druk hom!', 'Jaaa!'];
      const txt = scene.add.text(door.x + (Math.random() - 0.5) * 40, rect.y + 10, words[Math.floor(Math.random() * words.length)], {
        fontFamily: 'ui-monospace, monospace', fontStyle: 'bold', fontSize: '22px', color: '#ffe080', stroke: '#2e1d0c', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(1e4);
      scene.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 1300, onComplete: () => txt.destroy() });
    },
  });
  const cast = { jones: jones(scene), tokkie: { sprite: tokkie, ...TOKKIE }, mates };
  await converse(scene, cast, [
    ['tokkie', { af: 'Ja…? Wie’s jy?', en: 'Yes…? Who are you?' }],
    ['jones', { af: 'Goeiedag! Ek is Johan, van die plaas net buite die dorp. Ek het gedink ek kom kuier ’n bietjie.', en: "Good day! I'm Jones, from the farm just outside town. I thought I'd pop in for a visit." }],
    ['tokkie', { af: 'Kuier? Hier? Nóú?', en: 'Visit? Here? Now?' }],
    ['mates', { af: 'Tokkie! Wie’s dit? Die rugby begin!', en: "Tokkie! Who is it? The rugby's starting!" }],
    ['tokkie', { af: 'Ek weet nie, een of ander boer!', en: 'No idea, some farmer!' }],
    ['tokkie', { af: 'Kyk, ou maat, ek verstaan nie mooi hoekom jy nou hier wil kuier nie. Ek sit klaar saam met my pelle.', en: "Look, mate, I don't quite get why you want to visit now. I'm already sitting with my mates." }],
    ['jones', { af: 'O… ek verstaan. Jammer om te pla.', en: "Oh… I see. Sorry to bother you." }],
    ['tokkie', { af: 'Lekker dag, nè!', en: 'Have a good one!' }],
    () => setFlag('metTokkie'),
  ]);
  tokkie.destroy();
  hall.destroy();
  cheer.remove();
  await think(scene, scene.player.sprite, { af: 'Nou ja. Dis seker ’n privaat kuier.', en: "Oh well. It's a private party, I suppose." });
}
