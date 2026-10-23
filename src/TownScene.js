import MapScene from './MapScene.js';
import { townGrid } from './WalkGrid.js';
import { asset } from './asset.js';
import { animateTown } from './townLife.js';
import { think } from './bubble.js';
import { setFlag, hasFlag } from './state.js';
import { dowse, leak, hasLeak } from './dowsing.js';

// The town (assets/town.jpg), down the road from the crossroads: houses
// round a square with a fountain, a cafe and a restaurant, the paths
// winding between them. Boer Johan comes in by the road at the top right,
// between the fields, and that's the way back to the crossroads. Open from
// Wednesday afternoon, once the farm work's done (RoadScene). Folk at the
// restaurant and the cafe, a neighbour checking her mail, pigeons and cats
// liven it up (src/townLife.js). Tapping the fountain (dry: it's stopped
// working), he walks up to it, looks it over and wonders where its water
// comes from ('fountainLooked'); with the willow stick, he follows the water
// up to where it's leaking away (src/dowsing.js).

const HERE = { af: 'Die dorp', en: 'The town' };
// The fountain on the square, and where he stands in front of it.
const FOUNTAIN = { x: 680, y: 1270, w: 190, h: 175 };
const AT_FOUNTAIN = { x: 770, y: 1492 };

export default class TownScene extends MapScene {
  constructor() {
    super({ key: 'Town' });
    this.map = {
      key: 'town', file: asset('town.jpg'), w: 1536, h: 2752, grid: townGrid,
      scale: 1.5, // about right for its doors and benches, and easy to see
      home: { x: 760, y: 1500 }, // below the fountain
    };
    this.exits = {
      crossroads: { side: 'right', near: 120, to: 'Road', data: { from: 'town' } },
    };
  }

  // `at`: where he is, when redrawn for a new screen size.
  create({ at } = {}) {
    this.place(at, at ? null : 'crossroads');
    animateTown(this); // people, pigeons and cats (src/townLife.js)
    if (hasLeak()) leak(this); // (the soggy patch where the fountain's water goes: src/dowsing.js)
    if (!at) this.game.events.emit('location', { name: HERE });
  }

  // Tapping the fountain: over to it, a look round it, and his thoughts.
  tapThing(x, y) {
    const f = FOUNTAIN;
    if (x < f.x || x >= f.x + f.w || y < f.y || y >= f.y + f.h) return false;
    this.player.walkTo(AT_FOUNTAIN.x, AT_FOUNTAIN.y, () => this.lookAtFountain());
    return true;
  }

  lookAtFountain() {
    // with the willow stick: off following the water (src/dowsing.js)
    if (hasFlag('willowStick') && !hasLeak()) {
      dowse(this);
      return;
    }
    this.talk(async () => {
      const { player } = this;
      const wait = ms => new Promise(r => this.time.delayedCall(ms, r));
      for (const dir of ['up', 'left', 'up', 'right', 'up']) {
        player.face(dir);
        await wait(550);
      }
      await think(this, player.sprite, { af: 'Hmm, kurkdroog…', en: 'Hmm, bone dry…' });
      await think(this, player.sprite, { af: 'Daar’s geen watertoevoer hier nie. Ek wonder waar die water vandaan kom.', en: "There's no water supply here. I wonder where the water comes from." });
      setFlag('fountainLooked');
    });
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.move(delta);
    this.edges();
  }
}
