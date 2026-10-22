import MapScene from './MapScene.js';
import { riverGrid } from './WalkGrid.js';
import { asset } from './asset.js';
import { flowRiver, flowSluice } from './riverFlow.js';

// The river (assets/river.jpg), down the path off the bottom left of the
// crossroads: a gold diggers' camp in the woods, a tent and crates, pans
// and a sluice in the stream, a rocker on the near sandbar and more pans
// on the far one, across the river (which he can't wade: it flows, ripples
// drifting downstream, src/riverFlow.js). Boer Johan comes in by the track
// at the top, which is the way back to the crossroads.

const HERE = { af: 'Die rivier', en: 'The river' };

export default class RiverScene extends MapScene {
  constructor() {
    super({ key: 'River' });
    this.map = {
      key: 'river', file: asset('river.jpg'), w: 1408, h: 2550, grid: riverGrid,
      scale: 2.1, // as big as the tent and the pans want
      home: { x: 640, y: 640 }, // in the camp
    };
    this.exits = {
      crossroads: { side: 'top', near: 1110, to: 'Road', data: { from: 'river' } },
    };
  }

  // `at`: where he is, when redrawn for a new screen size.
  create({ at } = {}) {
    this.place(at, at ? null : 'crossroads');
    flowRiver(this); // (src/riverFlow.js)
    flowSluice(this);
    if (!at) this.game.events.emit('location', { name: HERE });
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.move(delta);
    this.edges();
  }
}
