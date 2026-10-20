import Phaser from 'phaser';
import { createCharacter, createBike } from './CharacterSprite.js';
import Player from './Player.js';
import { PLAYER_SPEED } from './constants.js';
import { UI } from './screen.js';
import { bike, pedal, showParked, tapParked, SPEED as BIKE_SPEED } from './bike.js';
import { think } from './bubble.js';
import { isEvening, dusk } from './evening.js';
import { isRaining, rain } from './weather.js';

// A place drawn as one picture (the crossroads, the beach). The
// picture covers the screen like the farm's map, centred, and he walks where
// its baked mask says (scripts/build-masks.py), drawn as big as the people in
// it. Roads leave it at the edges of the screen: each `exit` names a side,
// roughly where along it the road runs (`near`), and what happens there:
// `to` another scene (with `data`); while `closed()` gives words of his
// (not today, say), he steps back, turns round and thinks them instead. A tap near the end of a road walks all the
// way to it. Turning the phone fits the picture again, keeping him where he
// is (or, if that's off the screen now, at `home`). On his bike (src/bike.js)
// he rides here too (and where he left it outside a door, it's still there).
// On Thursday evening, after Derik's braai, it's dark (src/evening.js).
//
// A scene extends this with `map` = { key, file, w, h, grid, scale, home }
// and `exits`, calls `place(at)` in create and `move(delta)` and `edges()` in
// update. Someone
// can talk to him there (`talk`: src/dialog.js); taps meanwhile only move the
// talk along.
//
// The pictures are much bigger than the screen; drawn shrunk as they are, the
// screen would only pick up every third pixel or so, and lettering and
// outlines would break up. So each is redrawn once at the size it's shown
// (`fit`), smoothly, the way a photo is resized.

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
    this.k = z;
    const bg = this.fit(key);
    this.add.image(0, 0, bg.key).setOrigin(0).setScale(bg.sx, bg.sy).setDepth(-1);
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
    createBike(this);
    const onScreen = p => p.x > view.left + 20 && p.x < view.right - 20 && p.y > view.top + 20 && p.y < view.bottom - 20;
    const start = at ? (onScreen(at) ? at : home) : road(from, 14) ?? home;
    this.player = new Player(this, {
      ...start,
      dir: from ? TURN[this.exits[from].side] : 'down',
      texture: bike.riding ? 'player-bike' : 'player',
      speed: PLAYER_SPEED * UI / z * (bike.riding ? BIKE_SPEED : 1),
      grid,
      markerScale: UI / z,
    });
    this.player.sprite.setScale(scale);
    // Thursday evening after the braai: dark (Derik's place darkens itself)
    if (isEvening() && this.scene.key !== 'Derik') dusk(this, MW, MH);
    if (isRaining()) rain(this, MW, MH); // Friday (src/weather.js)
    showParked(this, scale);
    this.leaving = false;
    this.busy = false;  // talking: taps and keys only move it along
    this.choice = null; // replies to pick from (src/dialog.js)
    this.refitAfter = false;
    document.body.classList.remove('choosing');
    const walkIn = !at && from && road(from, 140 * scale);
    if (walkIn) this.player.walkTo(walkIn.x, walkIn.y);

    this.input.keyboard.on('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && this.thought && !this.choice) this.thought.destroy();
    });
    this.input.on('pointerdown', (p) => {
      const { worldX: x, worldY: y } = p;
      if (this.choice) {
        this.choice.tap(x, y);
        return;
      }
      // a bubble stays up until a tap moves it along (and that's all the tap does)
      if (this.thought) {
        this.thought.destroy();
        return;
      }
      if (this.leaving || this.busy) return;
      if (tapParked(this, x, y)) return;
      if (this.tapThing?.(x, y)) return; // someone or something there (the scene's own)
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

    // (not in the middle of a talk: once it's over)
    const refit = () => {
      if (this.busy) this.refitAfter = true;
      else this.scene.restart({ at: { x: this.player.x, y: this.player.y } });
    };
    this.refit = refit;
    this.scale.on('resize', refit);
    this.events.once('shutdown', () => this.scale.off('resize', refit));
  }

  // A talk (or anything else he has to stand still for): `work()` returns a
  // promise; meanwhile he stays put and taps only move speech along.
  async talk(work) {
    this.busy = true;
    this.player.locked = true;
    this.player.stop();
    await work();
    this.busy = false;
    this.player.locked = false;
    if (this.refitAfter) this.refit();
  }

  // Picture `key` redrawn at the size it's shown (this.k × its own), smoothly,
  // as texture `${key}@fit`: shown at scale (sx, sy) it covers the picture's
  // own size again. Frames can be added to it (in its own px: × k).
  fit(key) {
    const fitKey = `${key}@fit`;
    if (this.textures.exists(fitKey)) this.textures.remove(fitKey);
    const src = this.textures.get(key).getSourceImage();
    const w = Math.max(1, Math.round(src.width * this.k));
    const h = Math.max(1, Math.round(src.height * this.k));
    const tex = this.textures.createCanvas(fitKey, w, h);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    tex.refresh();
    return { key: fitKey, tex, sx: src.width / w, sy: src.height / h };
  }

  // A frame of `delta` ms: he walks (or rides) on.
  move(delta) {
    pedal(this, this.player.update(delta / 1000), delta / 1000);
  }

  // At the edge of the screen: off along that road (of those on that side,
  // the one nearest to where he is).
  edges() {
    if (this.leaving) return;
    const { x, y } = this.player;
    const v = this.view;
    const past = { top: y <= v.top + 6, bottom: y >= v.bottom - 10, left: x <= v.left + 10, right: x >= v.right - 10 };
    const off = n => Math.abs(this.exits[n].near - (['top', 'bottom'].includes(this.exits[n].side) ? x : y));
    const [name] = Object.keys(this.exits).filter(n => past[this.exits[n].side]).sort((a, b) => off(a) - off(b));
    if (name) this.leave(name);
  }

  leave(name) {
    const exit = this.exits[name];
    const { player } = this;
    const closed = exit.closed?.();
    if (closed) {
      // not now: a step back, turn round, and why not
      const { x, y } = this.backs[name];
      player.stop();
      Object.assign(player, { x, y });
      player.sprite.setPosition(x, y).setDepth(y);
      player.face(TURN[exit.side]);
      think(this, player.sprite, closed);
      return;
    }
    this.leaving = true;
    player.stop();
    const cam = this.cameras.main;
    cam.fadeOut(FADE_MS);
    // (always with data: started without any, a scene gets what it was given
    // last time, and he'd turn up wherever that was)
    cam.once('camerafadeoutcomplete', () => this.scene.start(exit.to, exit.data ?? { fresh: true }));
  }
}
