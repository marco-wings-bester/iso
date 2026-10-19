import MapScene from './MapScene.js';
import { derikGrid } from './WalkGrid.js';
import { asset } from './asset.js';
import { today, THURSDAY } from './days.js';
import { placeVillagers, BEACH_VILLAGERS } from './villagers.js';
import { braaiWithDerik } from './derik.js';
import { preloadDerik, animateDerik } from './derikLife.js';

// Derik's place (assets/derik.jpg), right from the crossroads: his
// farmhouse with its long stoep and a water tower behind, cattle and sheep
// about, and below it his boma, a fire going in it, logs to sit on round it
// and a brick braai. Boer Johan comes in by the road from the left, which
// goes up to the stoep's steps, a path off it down to the boma; that road's
// the way back to the crossroads. His cows and sheep graze about, the fire
// burns and the chimney smokes (src/derikLife.js). On Thursday it's Derik's
// braai: he's waiting by the fire in the boma (not fishing at the beach), and
// Johan pays him back his R15 (src/derik.js).

const HERE = { af: 'Derik se plek', en: "Derek's place" };
// Derik by the fire, and where Johan stands to talk to him.
const BY_FIRE = { x: 1116, y: 1336 };
const BY_DERIK = { x: 1180, y: 1340 };

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
    this.villagers = today() === THURSDAY
      ? placeVillagers(this, [{ ...derik, does: 'stand', at: BY_FIRE, face: 'left' }], this.map.scale)
      : [];
    if (!at) this.game.events.emit('location', { name: HERE });
  }

  // Tapping Derik: Johan walks over to him by the fire and they talk.
  tapThing(x, y) {
    const derik = this.villagers.find(v => v.contains(x, y));
    if (!derik) return false;
    this.player.walkTo(BY_DERIK.x, BY_DERIK.y, () => braaiWithDerik(this, derik));
    return true;
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.move(delta);
    this.edges();
  }
}
