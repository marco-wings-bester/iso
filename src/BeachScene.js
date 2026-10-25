import MapScene from './MapScene.js';
import { beachGrid } from './WalkGrid.js';
import { preloadSeaside, animateSeaside } from './seaside.js';
import { placeVillagers, BEACH_VILLAGERS } from './villagers.js';
import { asset } from './asset.js';
import { talkToDerik, BY_DERIK } from './derik.js';
import { hasFlag, setFlag } from './state.js';
import { today, THURSDAY } from './days.js';
import { think } from './bubble.js';
import { line } from './hints.js';
import { park } from './bike.js';
import { beachHouseAt } from './beachDoors.js';
import { visit } from './doors.js';

// The beach (assets/seaside.jpg), down the left-hand road from the crossroads:
// a little seaside village (houses, a bakery, the Cozy Seaside Cafe, a
// souvenir shop) with its road winding down past them, and the sand, the
// umbrellas and the jetty below; its boats move about (src/seaside.js), and
// its people are villagers (src/villagers.js). Boer Johan comes in by the road at the top
// right; he can walk the road, the sand and out along the jetty. Off the
// right-hand edge (either road) is back to the crossroads. Tapping the cafe
// (or its deck) walks him to the foot of its steps and in (ROOMS.cafe,
// src/cafe.js); he comes out there again. His bike stays out, by the steps.
// Tapping one of the houses along the road, he knocks (src/beachDoors.js):
// the pink one is Steffi's.

const HERE = { af: 'Die strand', en: 'The beach' };
// The cafe and its deck in the picture, and the foot of the deck's steps.
const CAFE = [{ x: 890, y: 1290, w: 410, h: 340 }, { x: 670, y: 1610, w: 560, h: 160 }];
const CAFE_STEPS = { x: 776, y: 1806 };
const CAFE_PARK = { x: 700, y: 1830 };

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

  // `at`: where he is (redrawn for a new screen size, or out of the cafe:
  // `out`); otherwise he comes down the road from the crossroads.
  create({ at, out } = {}) {
    this.place(at, at ? null : 'crossroads');
    animateSeaside(this);
    // (not Derik on Thursday: he's at home, getting the braai going: src/DerikScene.js)
    const here = today() === THURSDAY ? BEACH_VILLAGERS.filter(v => v.id !== 'derik') : BEACH_VILLAGERS;
    this.villagers = placeVillagers(this, here, this.map.scale);
    if (!at || out) this.game.events.emit('location', { name: HERE });
    // out of the cafe, his coffee finished: wide awake now
    if (out && hasFlag('coffeeDone') && !hasFlag('awake')) {
      setFlag('awake');
      this.time.delayedCall(900, () => { if (!this.thought) think(this, this.player.sprite, line('afterCoffee')); });
    }
  }

  // Tapping someone: Johan walks over to them (the nearest he can get), and
  // they notice him; Derik, fishing, talks to him (src/derik.js). Tapping the
  // cafe: in he goes.
  tapThing(x, y) {
    const v = this.villagers.find(o => o.contains(x, y));
    const house = !v && beachHouseAt(x, y); // a house along the road: up to its door, and a knock (src/beachDoors.js)
    if (house) {
      visit(this, house);
      return true;
    }
    if (!v) {
      if (!CAFE.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)) return false;
      this.player.walkTo(CAFE_STEPS.x, CAFE_STEPS.y, () => this.enterCafe());
      return true;
    }
    if (v.id === 'derik') {
      this.player.walkTo(BY_DERIK.x, BY_DERIK.y, () => talkToDerik(this, v));
      return true;
    }
    const side = this.player.x < v.x ? -1 : 1;
    this.player.walkTo(v.x + side * 60, v.y, () => {
      const dx = v.x - this.player.x;
      const dy = v.y - this.player.y;
      this.player.face(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
      v.notice(this.player);
    });
    return true;
  }

  enterCafe() {
    park(this, CAFE_PARK);
    this.leaving = true;
    this.player.stop();
    this.player.face('up');
    const cam = this.cameras.main;
    cam.fadeOut(250);
    cam.once('camerafadeoutcomplete', () => this.scene.start('Interior', { building: 'cafe' }));
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.move(delta);
    this.edges();
  }
}
