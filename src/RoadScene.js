import Phaser from 'phaser';
import { createCharacter } from './CharacterSprite.js';
import Player from './Player.js';
import WalkGrid from './WalkGrid.js';
import { INTERIOR_SPEED } from './constants.js';
import { setFlag } from './state.js';
import { t } from './i18n.js';
import { roadLayout, drawRoad } from './road.js';

// Level 2: the crossroads past the farm gate, where Boer Johan comes on his
// way to town once Pieter has gone home. The road back up goes to the farm;
// down goes to town, right to Pieter's house and left to the beach (src/road.js
// draws it all). Those three aren't there yet: at the end of the road he
// turns back and it says so. Tap to walk (or the arrow keys), as indoors;
// tapping a sign walks to the end of its road.

const ART = 150; // px on the screen's short side: he's as big as indoors
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
    const { width: W, height: H } = this.scale;
    const z = Math.min(W, H) / ART;
    const L = roadLayout(Math.ceil(W / z), Math.ceil(H / z));
    this.L = L;
    if (this.textures.exists('road')) this.textures.remove('road');
    const tex = this.textures.createCanvas('road', L.w, L.h);
    drawRoad(tex.getContext(), L);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, 'road').setOrigin(0).setDepth(-1);

    createCharacter(this);
    const start = at === 'crossing' ? L.crossing : L.fromFarm;
    this.player = new Player(this, {
      ...start,
      dir: 'down',
      texture: 'player-px',
      speed: INTERIOR_SPEED,
      grid: WalkGrid.fromFn(L.w, L.h, 2, L.walkable),
      markerScale: 1 / z,
    });
    this.leaving = false;

    const cam = this.cameras.main;
    cam.setZoom(z).centerOn(L.w / 2, L.h / 2).fadeIn(FADE_MS);
    this.signs = L.signs.map(s => this.sign(s, z));

    this.input.on('pointerdown', (p) => {
      if (this.leaving) return;
      const sign = this.signs.find(s => s.area.contains(p.worldX, p.worldY));
      const to = sign ? sign.end : { x: p.worldX, y: p.worldY };
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
      fontFamily: 'monospace', fontStyle: 'bold', fontSize: '12px', color: '#fff3c4',
      resolution: window.devicePixelRatio || 1,
    }).setScale(1 / z).setDepth(1e5 + 1);
    const w = Math.ceil(words.width / z) + 4;
    const h = Math.ceil(words.height / z) + 2;
    const bx = Math.round(x - ox * w);
    const by = Math.round(y - oy * h);
    const g = this.add.graphics().setDepth(1e5);
    g.fillStyle(0x2e1d0c).fillRect(bx - 1, by, w + 2, h).fillRect(bx, by - 1, w, h + 2);
    g.fillStyle(0x8c5838).fillRect(bx, by, w, h);
    g.fillStyle(0xa86a3c).fillRect(bx, by, w, 1);
    words.setPosition(bx + 2, by + 1 + 1 / z);
    return { area: new Phaser.Geom.Rectangle(bx - 3, by - 3, w + 6, h + 6), end };
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.player.update(delta / 1000);
    const { x, y } = this.player;
    const { w, h } = this.L;
    if (y <= 2) this.toFarm();
    else if (y >= h - 2) this.notYet('town');
    else if (x <= 2) this.notYet('beach');
    else if (x >= w - 2) this.notYet('pieter');
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
