import MapScene from './MapScene.js';
import { beachGrid } from './WalkGrid.js';
import { preloadSeaside, animateSeaside } from './seaside.js';
import { placeVillagers, BEACH_VILLAGERS } from './villagers.js';
import { asset } from './asset.js';

// The beach (assets/seaside.jpg), down the left-hand road from the crossroads:
// a little seaside village (houses, a bakery, the Cozy Seaside Cafe, a
// souvenir shop) with its road winding down past them, and the sand, the
// umbrellas and the jetty below; its boats move about (src/seaside.js), and
// its people are villagers (src/villagers.js). Boer Johan comes in by the road at the top
// right; he can walk the road, the sand and out along the jetty. Off the
// right-hand edge (either road) is back to the crossroads.

const HERE = { af: 'Die strand', en: 'The beach' };

export default class BeachScene extends MapScene {
  constructor() {
    super({ key: 'Beach' });
    this.map = {
      key: 'seaside', file: asset('seaside.jpg'), w: 1408, h: 2928, grid: beachGrid,
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
    this.villagers = placeVillagers(this, BEACH_VILLAGERS, this.map.scale);
    if (!at) this.game.events.emit('location', { name: HERE });
  }

  // Tapping someone: Johan walks over to them (the nearest he can get), and
  // they notice him.
  tapThing(x, y) {
    const v = this.villagers.find(o => o.contains(x, y));
    if (!v) return false;
    const side = this.player.x < v.x ? -1 : 1;
    this.player.walkTo(v.x + side * 60, v.y, () => {
      const dx = v.x - this.player.x;
      const dy = v.y - this.player.y;
      this.player.face(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
      v.notice(this.player);
    });
    return true;
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.player.update(delta / 1000);
    this.edges();
  }
}
