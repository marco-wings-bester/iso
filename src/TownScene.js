import MapScene from './MapScene.js';
import { townGrid } from './WalkGrid.js';
import { asset } from './asset.js';
import { animateTown } from './townLife.js';
import { think } from './bubble.js';
import { setFlag, hasFlag } from './state.js';
import { dowse, leak, hasLeak } from './dowsing.js';
import { preloadFountain, fountainRuns, onPatch, atPatch } from './fountainFix.js';
import { park } from './bike.js';
import { townHouseAt } from './townDoors.js';
import { visit } from './doors.js';
import { isEvening } from './evening.js';
import { eveningTown, atGuitarist } from './townEvening.js';

// The town (assets/town.jpg), down the road from the crossroads: houses
// round a square with a fountain, a cafe and a restaurant, the paths
// winding between them. Boer Johan comes in by the road at the top right,
// between the fields, and that's the way back to the crossroads. Open from
// Wednesday afternoon, once the farm work's done (RoadScene). Folk at the
// restaurant and the cafe, a neighbour checking her mail, pigeons and cats
// liven it up (src/townLife.js). Tapping the fountain (dry: it's stopped
// working), he walks up to it, looks it over and wonders where its water
// comes from ('fountainLooked'); with the willow stick, he follows the water
// up to where it's leaking away (src/dowsing.js). Two of its buildings he
// can go into: Faan's tailor shop, the house down to the right of the
// fountain (ROOMS.tailor, src/tailor.js), and the restaurant up from it
// (ROOMS.restaurant, src/restaurant.js): tapping one walks him to its door
// and in (his bike left outside). At the other houses he can knock
// (src/townDoors.js): Tokkie, at the house furthest left, opens up. In the
// evening its street lamps are lit, and a man plays his guitar outside the
// restaurant (src/townEvening.js).

const HERE = { af: 'Die dorp', en: 'The town' };
// The fountain on the square, and where he stands in front of it.
const FOUNTAIN = { x: 680, y: 1270, w: 190, h: 175 };
const AT_FOUNTAIN = { x: 770, y: 1492 };
// The buildings he can go into: tap `area`, he walks to `door` and goes in.
const DOORS = {
  tailor: { area: { x: 950, y: 1430, w: 350, h: 300 }, door: { x: 1204, y: 1752 } },
  restaurant: { area: { x: 1000, y: 900, w: 270, h: 300 }, door: { x: 1010, y: 1316 } }, // (the foot of its patio's steps)
};
const inside = (x, y, a) => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h;

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

  preload() {
    super.preload();
    preloadFountain(this);
  }

  // `at`: where he is, when redrawn for a new screen size.
  create({ at } = {}) {
    this.place(at, at ? null : 'crossroads');
    animateTown(this); // people, pigeons and cats (src/townLife.js)
    this.guitarist = null;
    if (isEvening()) eveningTown(this); // its lamps lit, and a guitarist (src/townEvening.js)
    if (hasFlag('fountainFixed')) fountainRuns(this); // (fixed: src/fountainFix.js)
    else if (hasLeak()) leak(this); // (the soggy patch where the fountain's water goes: src/dowsing.js)
    if (!at) this.game.events.emit('location', { name: HERE });
  }

  // Tapping the fountain: over to it, a look round it, and his thoughts.
  tapThing(x, y) {
    if (onPatch(x, y) && atPatch(this)) return true; // the wet patch (src/fountainFix.js)
    if (this.guitarist?.contains(x, y)) {
      atGuitarist(this);
      return true;
    }
    const id = Object.keys(DOORS).find(k => inside(x, y, DOORS[k].area));
    if (id) {
      const { door } = DOORS[id];
      this.player.walkTo(door.x, door.y, () => this.enter(id));
      return true;
    }
    const house = townHouseAt(x, y); // any other house: up to its door, and a knock (src/townDoors.js)
    if (house) {
      visit(this, house);
      return true;
    }
    if (!inside(x, y, FOUNTAIN)) return false;
    this.player.walkTo(AT_FOUNTAIN.x, AT_FOUNTAIN.y, () => this.lookAtFountain());
    return true;
  }

  // In at a door (his bike left outside it).
  enter(building) {
    const { door } = DOORS[building];
    park(this, { x: door.x - 40, y: door.y });
    this.leaving = true;
    this.player.stop();
    const cam = this.cameras.main;
    cam.fadeOut(250);
    cam.once('camerafadeoutcomplete', () => this.scene.start('Interior', { building }));
  }

  lookAtFountain() {
    if (hasFlag('fountainFixed')) {
      think(this, this.player.sprite, { af: 'Die fontein loop weer. Mooi so!', en: "The fountain's running again. Lovely!" });
      return;
    }
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
