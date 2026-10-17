import { createVillager } from './CharacterSprite.js';
import { FRAME_H, FEET_Y } from './constants.js';
import { walkSprite } from './bob.js';

// The people of the seaside village: real characters like Boer Johan and
// Pieter (drawn by src/CharacterSprite.js, with walking and sitting), each
// with a name ({ af, en }) for when they have something to say. What they do:
//   stroll  walks along `route` and back (picture px), pausing at each end
//   stand   stands facing `face`, looking about now and then (`hops`: and
//           hopping about)
//   sit     sits facing `face`, breathing
//   fish    stands at the end of the jetty with his rod, the line out to
//           a bobbing float
// Tapping one (BeachScene) walks Johan over; those standing turn to face him.

const S = { S: '#f8c8a0', s: '#d89870' };   // skin
const TAN = { S: '#e8b080', s: '#c08458' };
const SHOES = { B: '#7a4a2a', d: '#4a2a14' };

export const BEACH_VILLAGERS = [
  {
    id: 'anika', name: { af: 'Anika', en: 'Annie' },
    look: { hair: 'long', skirt: true, palette: { ...S, ...SHOES, R: '#8a5a3a', r: '#5e3a22', C: '#f0a8b8', c: '#c87888', O: '#5a8ac8', o: '#3e6698' } },
    does: 'stroll', at: { x: 630, y: 1552 }, route: [{ x: 652, y: 1600 }, { x: 700, y: 1690 }],
  },
  {
    id: 'kobus', name: { af: 'Kobus', en: 'Colin' },
    look: { hair: 'short', palette: { ...S, ...SHOES, R: '#7a5236', r: '#4e3420', C: '#5a9ad0', c: '#3e72a0', O: '#8a8468', o: '#64604a' } },
    does: 'stroll', at: { x: 1020, y: 2056 }, route: [{ x: 960, y: 2010 }, { x: 900, y: 1960 }],
  },
  {
    id: 'lientjie', name: { af: 'Lientjie', en: 'Lily' }, small: true,
    look: { hair: 'bob', shorts: true, palette: { ...S, ...SHOES, R: '#8a5a3a', r: '#5e3a22', C: '#f4c0d0', c: '#d090a8', O: '#5a8ac8', o: '#3e6698' } },
    does: 'stand', hops: true, at: { x: 350, y: 2508 }, face: 'down', // watching Derik fish
  },
  {
    id: 'derik', name: { af: 'Derik', en: 'Derek' }, // lends Johan R15 for his coffee (src/derik.js)
    look: { hair: 'hat', palette: { ...TAN, ...SHOES, H: '#c89058', h: '#a87040', j: '#7a5030', b: '#6a4a2a', R: '#6a4630', r: '#4a2e1e', C: '#f0e8d0', c: '#c8bca0', O: '#5a5a60', o: '#3e3e44' } },
    does: 'fish', at: { x: 294, y: 2500 }, face: 'left',
  },
  {
    id: 'hettie', name: { af: 'Tannie Hettie', en: 'Aunt Hattie' },
    look: { hair: 'bob', palette: { ...S, ...SHOES, R: '#b07a50', r: '#86583a', C: '#a8d8e8', c: '#78aec0', O: '#5a7aa8', o: '#3e5a80' } },
    does: 'sit', at: { x: 768, y: 1656 }, face: 'right',
  },
  {
    id: 'frikkie', name: { af: 'Frikkie', en: 'Freddie' },
    look: { hair: 'short', palette: { ...S, ...SHOES, R: '#5e3a22', r: '#3e2414', C: '#4a7ab0', c: '#345a88', O: '#3e5a80', o: '#2a4060' } },
    does: 'sit', at: { x: 866, y: 1688 }, face: 'up',
  },
  {
    id: 'marius', name: { af: 'Marius', en: 'Mark' },
    look: { hair: 'short', shorts: true, palette: { ...S, ...SHOES, R: '#e0b060', r: '#b08840', C: '#3a8ad0', c: '#2a68a8', O: '#f0e8d8', o: '#c8bca8' } },
    does: 'sit', at: { x: 1192, y: 1764 }, face: 'down',
  },
  {
    id: 'ruan', name: { af: 'Ruan', en: 'Ryan' },
    look: { hair: 'short', shorts: true, palette: { ...TAN, ...SHOES, R: '#7a5236', r: '#4e3420', C: '#78b848', c: '#589030', O: '#4a6a98', o: '#344e74' } },
    does: 'sit', at: { x: 893, y: 2472 }, face: 'down', // in his deckchair, by the umbrella
  },
  {
    id: 'elsa', name: { af: 'Elsa', en: 'Elsie' },
    look: { hair: 'bob', shorts: true, palette: { ...S, ...SHOES, R: '#8a5a3a', r: '#5e3a22', C: '#f0a0b8', c: '#c87890', O: '#4a7ab8', o: '#345a90' } },
    does: 'sit', at: { x: 1052, y: 2754 }, face: 'down',
  },
];

const rand = (a, b) => a + Math.random() * (b - a);
const DIRS = ['down', 'left', 'right', 'up'];

class Villager {
  constructor(scene, spec, scale) {
    Object.assign(this, { scene, spec, id: spec.id, name: spec.name, does: spec.does });
    const key = `villager-${spec.id}`;
    this.key = key;
    createVillager(scene, key, spec.look);
    this.scale = scale * (spec.small ? 0.76 : 1);
    this.sprite = scene.add.sprite(spec.at.x, spec.at.y, key).setOrigin(0.5, FEET_Y / FRAME_H).setScale(this.scale).setDepth(spec.at.y);
    this.face(spec.face ?? 'down');
    this.idle = true;
    ({ stroll: () => this.stroll(), stand: () => this.lookAbout(), sit: () => this.sit(), fish: () => this.fish() })[spec.does]();
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  face(dir) {
    this.facing = dir;
    this.sprite.facing = dir;
    this.sprite.play(`${this.key}-${this.does === 'sit' ? 'sit' : 'idle'}-${dir}`, true);
  }

  // Back and forth along the route (routed over the walkable ground, so he
  // keeps to the road), a pause and a look about at each end.
  stroll() {
    const grid = this.scene.map.grid;
    const stops = [this.spec.at, ...this.spec.route];
    let i = 0;
    let out = true;
    const next = () => {
      this.idle = true;
      this.scene.time.delayedCall(rand(1500, 4000), () => {
        if (this.noticing) { next(); return; }
        if (out && i === stops.length - 1) out = false;
        else if (!out && i === 0) out = true;
        i += out ? 1 : -1;
        const to = stops[i];
        this.idle = false;
        const route = grid.findRoute(this.x, this.y, to.x, to.y);
        if (!route.length) route.push(to);
        walkSprite(this.scene, this.sprite, this.key, route, 36 * this.scale, () => {
          this.face(this.sprite.facing);
          next();
        });
      });
    };
    next();
  }

  // Standing about: now and then a look one way, then back (or a hop).
  lookAbout() {
    const look = () => this.scene.time.delayedCall(rand(3000, 7000), () => {
      if (this.spec.hops && Math.random() < 0.5) {
        const y = this.spec.at.y;
        this.scene.tweens.add({ targets: this.sprite, y: y - 18, duration: 170, yoyo: true, repeat: Math.random() < 0.4 ? 1 : 0, ease: 'Quad.easeOut', onComplete: () => this.sprite.setY(y) });
      } else if (!this.noticing) {
        const home = this.spec.face ?? 'down';
        this.face(DIRS[Math.floor(Math.random() * 4)]);
        this.scene.time.delayedCall(rand(900, 1800), () => { if (!this.noticing) this.face(home); });
      }
      look();
    });
    look();
  }

  sit() {
    this.scene.tweens.add({ targets: this.sprite, scaleY: this.scale * 1.02, duration: rand(2200, 3000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // At the end of the jetty: the rod in his hands, the line down to a float
  // bobbing on the water, rings spreading round it now and then.
  fish() {
    const { scene, sprite } = this;
    const s = this.scale;
    const hand = { x: sprite.x - 7 * s, y: sprite.y - 18 * s };
    const tip = { x: sprite.x - 82, y: sprite.y - 86 };
    const float = scene.add.circle(tip.x - 8, sprite.y + 66, 6, 0xffffff).setStrokeStyle(3, 0x2e1d0c).setDepth(sprite.y + 66);
    const red = scene.add.rectangle(float.x, float.y - 2, 9, 4, 0xd04c3a).setDepth(sprite.y + 67);
    scene.tweens.add({ targets: [float, red], y: '+=3', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const rod = scene.add.graphics().setDepth(sprite.y + 1);
    const draw = () => {
      rod.clear();
      rod.lineStyle(6, 0x2e1d0c).lineBetween(hand.x, hand.y, tip.x, tip.y);
      rod.lineStyle(3, 0xa86a3c).lineBetween(hand.x, hand.y, tip.x, tip.y);
      rod.lineStyle(2, 0xe8f4f8, 0.9).lineBetween(tip.x, tip.y, float.x, float.y - 5);
    };
    scene.events.on('update', draw);
    scene.events.once('shutdown', () => scene.events.off('update', draw));
    const ripple = () => {
      const r = scene.add.ellipse(float.x, float.y + 4, 10, 4).setStrokeStyle(3, 0xffffff, 0.8).setDepth(float.y);
      scene.tweens.add({ targets: r, scaleX: 3, scaleY: 3, alpha: 0, duration: 1100, onComplete: () => r.destroy() });
      scene.time.delayedCall(rand(1800, 3200), ripple);
    };
    ripple();
  }

  // Johan's come over: whoever's standing about turns to him for a while.
  notice(johan) {
    if (this.does === 'sit' || this.does === 'fish' || !this.idle) return;
    const dx = johan.x - this.x;
    const dy = johan.y - this.y;
    this.noticing = true;
    this.face(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
    this.scene.time.delayedCall(4000, () => { this.noticing = false; });
  }

  contains(x, y) {
    return this.sprite.getBounds().contains(x, y);
  }
}

export function placeVillagers(scene, specs, scale) {
  return specs.map(spec => new Villager(scene, spec, scale));
}
