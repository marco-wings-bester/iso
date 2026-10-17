import MapScene from './MapScene.js';
import { beachGrid } from './WalkGrid.js';
import { preloadSeaside, animateSeaside } from './seaside.js';

// The beach (assets/seaside.jpg), down the left-hand road from the crossroads:
// a little seaside village (houses, a bakery, the Cozy Seaside Cafe, a
// souvenir shop) with its road winding down past them, and the sand, the
// umbrellas and the jetty below; its people and boats move about
// (src/seaside.js). Boer Johan comes in by the road at the top
// right; he can walk the road, the sand and out along the jetty. Off the
// right-hand edge (either road) is back to the crossroads.

const HERE = { af: 'Die strand', en: 'The beach' };

export default class BeachScene extends MapScene {
  constructor() {
    super({ key: 'Beach' });
    this.map = {
      key: 'seaside', file: 'assets/seaside.jpg', w: 1408, h: 2928, grid: beachGrid,
      scale: 1.8, // as big as the people in the picture
      home: { x: 600, y: 1580 }, // on the road, by the cafe
    };
    // both roads off to the right go back to the crossroads (he comes in by the top one)
    this.exits = {
      crossroads: { side: 'right', near: 520, to: 'Road', data: { from: 'beach' } },
      lowerRoad: { side: 'right', near: 2668, to: 'Road', data: { from: 'beach' } },
    };
  }

  preload() {
    super.preload();
    preloadSeaside(this);
  }

  create({ at } = {}) {
    this.place(at, 'crossroads');
    animateSeaside(this);
    if (!at) this.game.events.emit('location', { name: HERE });
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.player.update(delta / 1000);
    this.edges();
  }
}
