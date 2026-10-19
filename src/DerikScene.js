import MapScene from './MapScene.js';
import { derikGrid } from './WalkGrid.js';
import { asset } from './asset.js';
import { today, THURSDAY } from './days.js';
import { placeVillagers, BEACH_VILLAGERS } from './villagers.js';
import { braaiWithDerik } from './derik.js';

// Derik's place (assets/derik.jpg), right from the crossroads: his
// farmhouse with its long stoep and a water tower behind, cattle and sheep
// about, and below it his boma, a fire going in it, logs to sit on round it
// and a brick braai. Boer Johan comes in by the road from the left, which
// goes up to the stoep's steps, a path off it down to the boma; that road's
// the way back to the crossroads. On Thursday it's Derik's braai: he's at
// the braai in the boma (not fishing at the beach), and Johan pays him back
// his R15 (src/derik.js).

const HERE = { af: 'Derik se plek', en: "Derek's place" };
// Derik at his braai, and where Johan stands to talk to him.
const AT_BRAAI = { x: 1196, y: 1300 };
const BY_BRAAI = { x: 1120, y: 1310 };

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

  // `at`: where he is, when redrawn for a new screen size.
  create({ at } = {}) {
    this.place(at, at ? null : 'crossroads');
    const derik = BEACH_VILLAGERS.find(v => v.id === 'derik');
    this.villagers = today() === THURSDAY
      ? placeVillagers(this, [{ ...derik, does: 'stand', at: AT_BRAAI, face: 'left' }], this.map.scale)
      : [];
    if (!at) this.game.events.emit('location', { name: HERE });
  }

  // Tapping Derik: Johan walks over to the braai and they talk.
  tapThing(x, y) {
    const derik = this.villagers.find(v => v.contains(x, y));
    if (!derik) return false;
    this.player.walkTo(BY_BRAAI.x, BY_BRAAI.y, () => braaiWithDerik(this, derik));
    return true;
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.move(delta);
    this.edges();
  }
}
