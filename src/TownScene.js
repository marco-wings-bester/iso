import MapScene from './MapScene.js';
import { townGrid } from './WalkGrid.js';
import { asset } from './asset.js';

// The town (assets/town.jpg), down the road from the crossroads: houses
// round a square with a fountain, a cafe and a restaurant, the paths
// winding between them. Boer Johan comes in by the road at the top right,
// between the fields, and that's the way back to the crossroads. Open from
// Wednesday afternoon, once the farm work's done (RoadScene).

const HERE = { af: 'Die dorp', en: 'The town' };

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
    if (!at) this.game.events.emit('location', { name: HERE });
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.move(delta);
    this.edges();
  }
}
