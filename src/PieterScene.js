import MapScene from './MapScene.js';
import { pieterGrid } from './WalkGrid.js';
import { asset } from './asset.js';

// Pieter's farm (assets/pieter.jpg), right from the crossroads: his
// farmhouse with its long stoep, a water tower and a barn behind, and in
// front a braai with a fire going, seats round it. Boer Johan comes in by
// the road at the bottom, which winds up past the gate to the house; that's
// the way back to the crossroads.

const HERE = { af: 'Pieter se plaas', en: "Bob's farm" };

export default class PieterScene extends MapScene {
  constructor() {
    super({ key: 'Pieter' });
    this.map = {
      key: 'pieter', file: asset('pieter.jpg'), w: 1536, h: 2752, grid: pieterGrid,
      scale: 1.8, // as big as his fences and stoep want
      home: { x: 560, y: 1100 }, // on the path below the stoep
    };
    this.exits = {
      crossroads: { side: 'bottom', near: 1140, to: 'Road', data: { from: 'pieter' } },
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
