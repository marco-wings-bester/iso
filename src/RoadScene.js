import Phaser from 'phaser';
import { createCharacter } from './CharacterSprite.js';
import Player from './Player.js';
import { roadGrid } from './WalkGrid.js';
import { PLAYER_SPEED } from './constants.js';
import { setFlag } from './state.js';
import { t } from './i18n.js';

// Level 2: the crossroads past the farm gate, where Boer Johan comes on his
// way to town once Pieter has gone home. The picture (assets/crossroads.jpg)
// covers the screen like the farm's map; he walks on its four roads
// (scripts/build-roadmask.py). He comes in from the farm at the top, and the
// road back up goes there. Down goes to town, right to Pieter's house and
// left to the beach: those three aren't there yet, so at the edge of the
// screen he turns back and it says so. Tap to walk (or the arrow keys);
// tapping a sign walks to the end of its road, tapping right at the top back
// to the farm.

const MAP_W = 704;
const MAP_H = 1504;
const SCALE = 0.85; // the farmer as big as the one in the picture
const CROSSING = { x: 350, y: 830 };
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
// Roughly where each road runs (image px), to pick it out where a line
// crosses more than one; and which way he faces turning back from its end.
const ROADS = {
  farm: { axis: 'y', near: 350 },
  town: { axis: 'y', near: 345, turn: 'up' },
  beach: { axis: 'x', near: 940, turn: 'right' },
  pieter: { axis: 'x', near: 955, turn: 'left' },
};

export default class RoadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Road' });
  }

  preload() {
    this.load.image('crossroads', 'assets/crossroads.jpg');
  }

  // `at`: where he is, when redrawn for a new screen size (no fanfare then).
  create({ at } = {}) {
    // the picture covers the screen (like the farm's map), centred
    const { width: W, height: H } = this.scale;
    const z = Math.max(W / MAP_W, H / MAP_H);
    const view = {
      left: Math.max(0, (MAP_W - W / z) / 2),
      right: Math.min(MAP_W, (MAP_W + W / z) / 2),
      top: Math.max(0, (MAP_H - H / z) / 2),
      bottom: Math.min(MAP_H, (MAP_H + H / z) / 2),
    };
    this.view = view;
    this.add.image(0, 0, 'crossroads').setOrigin(0).setDepth(-1);
    const cam = this.cameras.main;
    cam.setZoom(z).centerOn(MAP_W / 2, MAP_H / 2).fadeIn(FADE_MS);

    // each road where it leaves the screen, and a few steps back along it
    const road = (to, inset) => {
      const { axis, near } = ROADS[to];
      const edge = { farm: view.top + inset, town: view.bottom - inset, beach: view.left + inset, pieter: view.right - inset }[to];
      return roadGrid.crossing(axis, edge, near);
    };
    this.ends = Object.fromEntries(Object.keys(ROADS).map(k => [k, road(k, 2)]));
    this.back = Object.fromEntries(Object.keys(ROADS).map(k => [k, road(k, 44)]));

    createCharacter(this);
    // (after turning the phone, back to the crossing if where he was is off the screen now)
    const onScreen = p => p.x > view.left + 20 && p.x < view.right - 20 && p.y > view.top + 20 && p.y < view.bottom - 20;
    const start = at ? (onScreen(at) ? at : CROSSING) : road('farm', 14);
    this.player = new Player(this, {
      ...start,
      dir: 'down',
      texture: 'player',
      speed: PLAYER_SPEED / z,
      grid: roadGrid,
      markerScale: 1 / z,
    });
    this.player.sprite.setScale(SCALE);
    this.leaving = false;
    // coming from the farm, he walks down into view
    if (!at) {
      const inView = roadGrid.crossing('y', view.top + (view.bottom - view.top) * 0.16, 400);
      if (inView) this.player.walkTo(inView.x, inView.y);
    }

    const vh = view.bottom - view.top;
    const farmSign = roadGrid.crossing('y', view.top + vh * 0.12, 380);
    this.signs = [
      { to: 'farm', x: farmSign.x + 26, y: farmSign.y, ox: 0, oy: 0.5 },
      { to: 'town', x: this.ends.town.x - 30, y: view.bottom - vh * 0.08, ox: 1, oy: 0.5 },
      { to: 'beach', x: view.left + 6, y: this.ends.beach.y - 52, ox: 0, oy: 1 },
      { to: 'pieter', x: view.right - 6, y: this.ends.pieter.y - 56, ox: 1, oy: 1 },
    ].map(s => this.sign(s, z));

    this.input.on('pointerdown', (p) => {
      if (this.leaving) return;
      const { worldX: x, worldY: y } = p;
      // a sign, or near the end of a road: all the way to its end; right at
      // the top: back to the farm (as at the bottom of the farm)
      const sign = this.signs.find(s => s.area.contains(x, y));
      const end = Object.values(this.ends).find(e => Math.hypot(e.x - x, e.y - y) < 70);
      const to = sign ? this.ends[sign.to] : end ?? (y < view.top + 40 ? this.ends.farm : { x, y });
      this.player.walkTo(to.x, to.y);
    });

    // a new screen size (turning the phone): fit it again, where he is
    const refit = () => this.scene.restart({ at: { x: this.player.x, y: this.player.y } });
    this.scale.on('resize', refit);
    this.events.once('shutdown', () => this.scale.off('resize', refit));

    if (!at) {
      setFlag('level2');
      this.game.events.emit('location', { name: LEVEL });
    }
  }

  // A wooden sign naming a road, its words sharp at any zoom (behind him, as
  // signs by the road are); returns its tap area and which road it is.
  sign({ to, x, y, ox, oy }, z) {
    const words = this.add.text(0, 0, t(SIGNS[to]), {
      fontFamily: 'monospace', fontStyle: 'bold', fontSize: '13px', color: '#fff3c4',
      resolution: window.devicePixelRatio || 1,
    }).setScale(1 / z).setDepth(2);
    const q = 2 / z / 1.4; // a pixel of the board: about 1.4 screen px
    const w = Math.ceil(words.width / z + 10 * q);
    const h = Math.ceil(words.height / z + 6 * q);
    const bx = Math.round(Phaser.Math.Clamp(x - ox * w, this.view.left + 4, this.view.right - w - 4));
    const by = Math.round(y - oy * h);
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x2e1d0c).fillRect(bx - q, by, w + 2 * q, h).fillRect(bx, by - q, w, h + 2 * q);
    g.fillStyle(0x8c5838).fillRect(bx, by, w, h);
    g.fillStyle(0xa86a3c).fillRect(bx, by, w, q);
    g.fillStyle(0x6a4028).fillRect(bx, by + h - q, w, q);
    words.setPosition(bx + 5 * q, by + 3 * q);
    return { to, area: new Phaser.Geom.Rectangle(bx - 10, by - 10, w + 20, h + 20) };
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.player.update(delta / 1000);
    const { x, y } = this.player;
    const v = this.view;
    if (y <= v.top + 6) this.toFarm();
    else if (y >= v.bottom - 10) this.notYet('town');
    else if (x <= v.left + 10) this.notYet('beach');
    else if (x >= v.right - 10) this.notYet('pieter');
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
    const { x, y } = this.back[to];
    player.stop();
    Object.assign(player, { x, y });
    player.sprite.setPosition(x, y).setDepth(y);
    player.face(ROADS[to].turn);
    this.game.events.emit('location', { name: SOON[to] });
  }
}
