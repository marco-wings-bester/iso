import Phaser from 'phaser';
import { createCharacter } from './CharacterSprite.js';
import Player from './Player.js';
import WalkGrid from './WalkGrid.js';
import { IMG_W, IMG_H, PLAYER_SPEED } from './constants.js';
import { setFlag } from './state.js';
import { t } from './i18n.js';
import { roadLayout, drawRoad } from './road.js';

// Level 2: the crossroads past the farm gate, where Boer Johan comes on his
// way to town once Pieter has gone home. He walks in from the farm, at the
// top; the road back up goes there. Down goes to town, right to Pieter's
// house and left to the beach (src/road.js draws it all, at the farm's scale).
// Those three aren't there yet: at the end of the road he turns back and it
// says so. Tap to walk (or the arrow keys), as on the farm; tapping a sign
// walks to the end of its road, and tapping right at the top back to the farm.

const FADE_MS = 250;
const LEVEL = { af: 'Vlak 2\nDie kruispad', en: 'Level 2\nThe crossroads' };
const SIGNS = {
  farm: { af: '▲ Plaas', en: '▲ Farm' },
  town: { af: '▼ Dorp', en: '▼ Town' },
  beach: { af: '◀ Strand', en: '◀ Beach' },
  pieter: { af: 'Pieter se huis ▶', en: "Bob's house ▶" },
};
const SOON = {
  town: { af: 'Die dorp\nkom binnekort', en: 'Town\ncoming soon' },
  beach: { af: 'Die strand\nkom binnekort', en: 'The beach\ncoming soon' },
  pieter: { af: 'Pieter se huis\nkom binnekort', en: "Bob's house\ncoming soon" },
};
// which way he faces, turning back from the end of a road
const TURN = { town: 'up', beach: 'right', pieter: 'left' };

export default class RoadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Road' });
  }

  // `at: 'crossing'` when redrawn for a new screen size (no fanfare then).
  create({ at } = {}) {
    // the farm's scale (its map covers the screen), the picture as big as the screen
    const { width: W, height: H } = this.scale;
    const z = Math.max(W / IMG_W, H / IMG_H);
    const L = roadLayout(Math.ceil(W / z), Math.ceil(H / z));
    this.L = L;
    if (this.textures.exists('road')) this.textures.remove('road');
    const tex = this.textures.createCanvas('road', L.aw, L.ah);
    drawRoad(tex.getContext(), L);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, 'road').setOrigin(0).setScale(L.px).setDepth(-1);

    createCharacter(this);
    const start = at === 'crossing' ? L.crossing : L.fromFarm;
    this.player = new Player(this, {
      ...start,
      dir: 'down',
      texture: 'player',
      speed: PLAYER_SPEED / z,
      grid: WalkGrid.fromFn(L.w, L.h, 4, L.walkable),
      markerScale: 1 / z,
    });
    this.leaving = false;
    // coming from the farm, he walks down into view
    if (!at) this.player.walkTo(L.arrive.x, L.arrive.y);

    const cam = this.cameras.main;
    cam.setZoom(z).centerOn(L.w / 2, L.h / 2).fadeIn(FADE_MS);
    this.signs = L.signs.map(s => this.sign(s, z));

    this.input.on('pointerdown', (p) => {
      if (this.leaving) return;
      const sign = this.signs.find(s => s.area.contains(p.worldX, p.worldY));
      // a sign, or right at the top (back to the farm, as at the bottom of the farm)
      const to = sign ? sign.end : p.worldY < L.top ? L.farmEnd : { x: p.worldX, y: p.worldY };
      this.player.walkTo(to.x, to.y);
    });

    // a new screen size (turning the phone): draw it again to fit
    const redraw = () => this.scene.restart({ at: 'crossing' });
    this.scale.on('resize', redraw);
    this.events.once('shutdown', () => this.scale.off('resize', redraw));

    if (!at) {
      setFlag('level2');
      this.game.events.emit('location', { name: LEVEL });
    }
  }

  // A wooden sign naming a road, its words sharp at any zoom; returns its
  // tap area and the end of its road.
  sign({ to, x, y, ox, oy, end }, z) {
    const words = this.add.text(0, 0, t(SIGNS[to]), {
      fontFamily: 'monospace', fontStyle: 'bold', fontSize: '13px', color: '#fff3c4',
      resolution: window.devicePixelRatio || 1,
    }).setScale(1 / z).setDepth(1e5 + 1);
    const q = 2; // a pixel of the board, as on the map
    const w = Math.ceil(words.width / z) + 5 * q;
    const h = Math.ceil(words.height / z) + 3 * q;
    const bx = Math.round(x - ox * w);
    const by = Math.round(y - oy * h);
    const g = this.add.graphics().setDepth(1e5);
    g.fillStyle(0x2e1d0c).fillRect(bx - q, by, w + 2 * q, h).fillRect(bx, by - q, w, h + 2 * q);
    g.fillStyle(0x8c5838).fillRect(bx, by, w, h);
    g.fillStyle(0xa86a3c).fillRect(bx, by, w, q);
    g.fillStyle(0x6a4028).fillRect(bx, by + h - q, w, q);
    words.setPosition(bx + 2.5 * q, by + 1.5 * q);
    return { area: new Phaser.Geom.Rectangle(bx - 8, by - 8, w + 16, h + 16), end };
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.player.update(delta / 1000);
    const { x, y } = this.player;
    const { exits, beachX, pieterX } = this.L;
    if (exits.farm(y)) this.toFarm();
    else if (exits.town(y)) this.notYet('town');
    else if (x <= beachX) this.notYet('beach');
    else if (x >= pieterX) this.notYet('pieter');
  }

  // Back up the road to the farm.
  toFarm() {
    this.leaving = true;
    this.player.stop();
    const cam = this.cameras.main;
    cam.fadeOut(FADE_MS);
    cam.once('camerafadeoutcomplete', () => this.scene.start('Game', { from: 'road' }));
  }

  // The end of a road that doesn't go anywhere yet: he steps back, turns
  // round, and it says it's coming.
  notYet(to) {
    const { player } = this;
    const { x, y } = this.L.back[to];
    player.stop();
    Object.assign(player, { x, y });
    player.sprite.setPosition(x, y).setDepth(y);
    player.face(TURN[to]);
    this.game.events.emit('location', { name: SOON[to] });
  }
}
