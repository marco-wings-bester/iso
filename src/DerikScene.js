import MapScene from './MapScene.js';
import { derikGrid } from './WalkGrid.js';
import { asset } from './asset.js';
import { today, THURSDAY } from './days.js';
import { hasFlag } from './state.js';
import { placeVillagers, BEACH_VILLAGERS } from './villagers.js';
import { braaiWithDerik } from './derik.js';
import { preloadDerik, animateDerik } from './derikLife.js';
import { FRIDAY } from './weather.js';
import { park } from './bike.js';
import { think } from './bubble.js';
import { saturdayAtDerik } from './derikHouse.js';

// Derik's place (assets/derik.jpg), right from the crossroads: his
// farmhouse with its long stoep and a water tower behind, cattle and sheep
// about, and below it his boma, a fire going in it, logs to sit on round it
// and a brick braai. Boer Johan comes in by the road from the left, which
// goes up to the stoep's steps, a path off it down to the boma; that road's
// the way back to the crossroads. His cows and sheep graze about, the fire
// burns and the chimney smokes (src/derikLife.js). On Thursday it's Derik's
// braai: he's waiting by the fire in the boma (not fishing at the beach), and
// Johan pays him back his R15 (src/derik.js); once the chicken's done they
// sit and eat on the log by the fire, and night falls. Tapping the
// farmhouse walks Johan to the end of the path by its stoep and in: on
// Friday Derik and Abraham are in there over coffee (ROOMS.derik,
// src/derikHouse.js); any other day there's nobody home.

const HERE = { af: 'Derik se plek', en: "Derek's place" };
// Derik by the fire, and where Johan stands to talk to him; where they sit
// to eat (on the log behind the fire, facing it), the way there round the
// fire, and where Johan gets up from it (src/derik.js).
const BY_FIRE = { x: 1116, y: 1336 };
const BY_DERIK = { x: 1180, y: 1340 };
// The farmhouse and its stoep, and the end of the path in front of it.
const HOUSE = { x: 600, y: 300, w: 720, h: 440 };
const DOOR = { x: 656, y: 772 };
const MEAL = {
  johan: { x: 962, y: 1238 }, derik: { x: 1046, y: 1238 },
  via: { x: 1120, y: 1272 }, up: { x: 1140, y: 1296 },
};

export default class DerikScene extends MapScene {
  constructor() {
    super({ key: 'Derik' });
    this.map = {
      key: 'derik', file: asset('derik.jpg'), w: 1408, h: 2550, grid: derikGrid,
      scale: 2.1, // as big as his stoep and fences want
      home: { x: 300, y: 1040 }, // on the road in
    };
    this.exits = {
      crossroads: { side: 'left', near: 1080, to: 'Road', data: { from: 'derik' } },
    };
  }

  preload() {
    super.preload();
    preloadDerik(this);
  }

  // `at`: where he is, when redrawn for a new screen size.
  create({ at } = {}) {
    this.place(at, at ? null : 'crossroads');
    animateDerik(this);
    const derik = BEACH_VILLAGERS.find(v => v.id === 'derik');
    // (after the meal, still on his log by the fire)
    const spec = hasFlag('braaiDone') ? { ...derik, does: 'sit', at: MEAL.derik, face: 'down' } : { ...derik, does: 'stand', at: BY_FIRE, face: 'left' };
    this.villagers = today() === THURSDAY ? placeVillagers(this, [spec], this.map.scale) : [];
    this.meal = MEAL;
    if (!at) this.game.events.emit('location', { name: HERE });
  }

  // Tapping Derik: Johan walks over to him by the fire and they talk.
  tapThing(x, y) {
    const derik = this.villagers.find(v => v.contains(x, y));
    if (!derik && x >= HOUSE.x && x < HOUSE.x + HOUSE.w && y >= HOUSE.y && y < HOUSE.y + HOUSE.h) {
      this.player.walkTo(DOOR.x, DOOR.y, () => this.enterHouse());
      return true;
    }
    if (!derik) return false;
    if (hasFlag('braaiDone')) this.player.walkTo(MEAL.up.x, MEAL.up.y, () => braaiWithDerik(this, derik));
    else this.player.walkTo(BY_DERIK.x, BY_DERIK.y, () => braaiWithDerik(this, derik));
    return true;
  }

  // In at the door, on Friday (his bike left outside), or on Saturday morning
  // if he's still to read the book there (src/derikHouse.js); any other day,
  // nobody's home.
  enterHouse() {
    this.player.face('right');
    if (today() !== FRIDAY && !saturdayAtDerik()) {
      think(this, this.player.sprite, today() === THURSDAY
        ? { af: 'Derik is buite by sy vuur.', en: "Derek's outside by his fire." }
        : { af: 'Daar is niemand tuis nie.', en: "There's nobody home." });
      return;
    }
    park(this, { x: DOOR.x - 40, y: DOOR.y });
    this.leaving = true;
    this.player.stop();
    const cam = this.cameras.main;
    cam.fadeOut(250);
    cam.once('camerafadeoutcomplete', () => this.scene.start('Interior', { building: 'derik' }));
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.move(delta);
    this.edges();
  }
}
