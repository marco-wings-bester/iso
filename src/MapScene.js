import Phaser from 'phaser';
import { createCharacter } from './CharacterSprite.js';
import Player from './Player.js';
import { PLAYER_SPEED } from './constants.js';

// A place drawn as one picture (Level 2: the crossroads, the beach). The
// picture covers the screen like the farm's map, centred, and he walks where
// its baked mask says (scripts/build-masks.py), drawn as big as the people in
// it. Roads leave it at the edges of the screen: each `exit` names a side,
// roughly where along it the road runs (`near`), and what happens there:
// `to` another scene (with `data`), or `soon` (he steps back, turns round
// and a label says it's coming). A tap near the end of a road walks all the
// way to it. Turning the phone fits the picture again, keeping him where he
// is (or, if that's off the screen now, at `home`).
//
// A scene extends this with `map` = { key, file, w, h, grid, scale, home }
// and `exits`, calls `place(at)` in create and `edges()` in update.

const FADE_MS = 250;
const TURN = { top: 'down', bottom: 'up', left: 'right', right: 'left' };

export default class MapScene extends Phaser.Scene {
  preload() {
    this.load.image(this.map.key, this.map.file);
  }

  // Fit the picture and put him at `at` ({x, y}), or (if not given) at the
  // end of the road `from` (an exit's name), walking in a little way.
  place(at, from) {
    const { w: MW, h: MH, key, grid, scale, home } = this.map;
    const { width: W, height: H } = this.scale;
    const z = Math.max(W / MW, H / MH);
    const view = {
      left: Math.max(0, (MW - W / z) / 2),
      right: Math.min(MW, (MW + W / z) / 2),
      top: Math.max(0, (MH - H / z) / 2),
      bottom: Math.min(MH, (MH + H / z) / 2),
    };
    this.view = view;
    this.add.image(0, 0, key).setOrigin(0).setDepth(-1);
    this.cameras.main.setZoom(z).centerOn(MW / 2, MH / 2).fadeIn(FADE_MS);

    // each road where it leaves the screen, and a few steps back along it
    const road = (name, inset) => {
      const { side, near } = this.exits[name];
      const edge = { top: view.top + inset, bottom: view.bottom - inset, left: view.left + inset, right: view.right - inset }[side];
      return grid.crossing(side === 'top' || side === 'bottom' ? 'y' : 'x', edge, near);
    };
    this.ends = {};
    this.backs = {};
    Object.keys(this.exits).forEach((name) => {
      this.ends[name] = road(name, 2);
      this.backs[name] = road(name, 14 * scale * 3);
    });

    createCharacter(this);
    const onScreen = p => p.x > view.left + 20 && p.x < view.right - 20 && p.y > view.top + 20 && p.y < view.bottom - 20;
    const start = at ? (onScreen(at) ? at : home) : road(from, 14) ?? home;
    this.player = new Player(this, {
      ...start,
      dir: from ? TURN[this.exits[from].side] : 'down',
      texture: 'player',
      speed: PLAYER_SPEED / z,
      grid,
      markerScale: 1 / z,
    });
    this.player.sprite.setScale(scale);
    this.leaving = false;
    const walkIn = !at && from && road(from, 140 * scale);
    if (walkIn) this.player.walkTo(walkIn.x, walkIn.y);

    this.input.on('pointerdown', (p) => {
      if (this.leaving) return;
      const { worldX: x, worldY: y } = p;
      // near the end of a road: all the way to its end (and, for a road
      // with `strip`, anywhere along that edge of the screen)
      const near = Object.keys(this.exits).find((name) => {
        const e = this.ends[name];
        if (!e) return false;
        if (Math.hypot(e.x - x, e.y - y) < 70) return true;
        const { side, strip } = this.exits[name];
        return strip && { top: y < view.top + 40, bottom: y > view.bottom - 40, left: x < view.left + 40, right: x > view.right - 40 }[side];
      });
      const to = near ? this.ends[near] : { x, y };
      this.player.walkTo(to.x, to.y);
    });

    const refit = () => this.scene.restart({ at: { x: this.player.x, y: this.player.y } });
    this.scale.on('resize', refit);
    this.events.once('shutdown', () => this.scale.off('resize', refit));
  }

  // At the edge of the screen: off along that road.
  edges() {
    if (this.leaving) return;
    const { x, y } = this.player;
    const v = this.view;
    const past = { top: y <= v.top + 6, bottom: y >= v.bottom - 10, left: x <= v.left + 10, right: x >= v.right - 10 };
    const name = Object.keys(this.exits).find(n => past[this.exits[n].side]);
    if (name) this.leave(name);
  }

  leave(name) {
    const exit = this.exits[name];
    const { player } = this;
    if (exit.soon) {
      // not there yet: a step back, turn round, and say so
      const { x, y } = this.backs[name];
      player.stop();
      Object.assign(player, { x, y });
      player.sprite.setPosition(x, y).setDepth(y);
      player.face(TURN[exit.side]);
      this.game.events.emit('location', { name: exit.soon });
      return;
    }
    this.leaving = true;
    player.stop();
    const cam = this.cameras.main;
    cam.fadeOut(FADE_MS);
    cam.once('camerafadeoutcomplete', () => this.scene.start(exit.to, exit.data));
  }
}
