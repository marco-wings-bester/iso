import Phaser from 'phaser';
import { createCharacter } from './CharacterSprite.js';
import Player from './Player.js';
import WalkGrid from './WalkGrid.js';
import { BUILDINGS, inRect } from './buildings.js';
import { ROOMS, WALL } from './interiors.js';
import { INTERIOR_SPEED } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { seatBob } from './bob.js';

const FADE_MS = 250;
const BODY = 5; // half the farmer's width in sprite px: keeps him off walls and furniture

// Feet-position walkability inside a room (room px = sprite px).
function walkable(room, x, y) {
  const { w, h, wallH, door, solid } = room;
  const inDoorway = x >= door.x + BODY && x <= door.x + door.w - BODY && y >= h - WALL - 2 && y < h;
  const onFloor = x >= WALL + BODY && x <= w - WALL - BODY && y >= wallH + 3 && y <= h - WALL - 1;
  if (!onFloor && !inDoorway) return false;
  return !solid.some(r => x > r.x - BODY && x < r.x + r.w + BODY && y > r.y - 2 && y < r.y + r.h + 3);
}

// Pixel-art "z" for sleeping, white with the usual dark outline.
function makeZ(scene) {
  if (scene.textures.exists('zzz')) return;
  const rows = ['#####', '...#.', '..#..', '.#...', '#####'];
  const tex = scene.textures.createCanvas('zzz', 7, 7);
  const ctx = tex.getContext();
  const on = (x, y) => rows[y]?.[x] === '#';
  for (let y = -1; y <= 5; y++) {
    for (let x = -1; x <= 5; x++) {
      const filled = on(x, y);
      const edge = !filled && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => on(x + dx, y + dy));
      if (!filled && !edge) continue;
      ctx.fillStyle = filled ? '#ffffff' : '#2e1d0c';
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

// Inside a building: same farmer and controls, everything drawn ~3x bigger.
export default class InteriorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Interior' });
  }

  create({ building }) {
    this.building = building;
    const room = ROOMS[building];
    const key = `room-${building}`;
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, room.w, room.h);
      room.draw(tex.getContext());
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.add.image(0, 0, key).setOrigin(0).setDepth(0);
    room.animate?.(this);
    createCharacter(this);

    const grid = WalkGrid.fromFn(room.w, room.h, 2, (x, y) => walkable(room, x, y));
    const doorX = room.door.x + room.door.w / 2;
    this.player = new Player(this, {
      x: doorX,
      y: room.h - WALL - 8,
      dir: 'up',
      texture: 'player-px',
      speed: INTERIOR_SPEED,
      grid,
    });
    this.exitY = room.h - 3;
    this.leaving = false;

    // Fixed camera: the whole room fills the screen (~3x on a phone, so the
    // farmer is ~2.5x his farm size) and stays put while he walks around.
    const cam = this.cameras.main;
    cam.setBackgroundColor('#1a1008').fadeIn(FADE_MS);
    const fit = () => {
      const zoom = Math.min(this.scale.width / room.w, this.scale.height / room.h);
      cam.setZoom(zoom).centerOn(room.w / 2, room.h / 2);
      this.player.markerScale = 1 / zoom;
    };
    fit();
    this.scale.on('resize', fit);
    this.events.once('shutdown', () => this.scale.off('resize', fit));

    this.room = room;
    const spots = room.spots ?? {};
    if (spots.read) {
      // Gap left on the shelf while he's reading that book.
      const b = spots.read.book;
      this.bookGap = this.add.rectangle(b.x, b.y, b.w, b.h, 0x4a2a14).setOrigin(0).setDepth(1).setVisible(false);
    }
    if (spots.sleep) {
      // Him asleep in bed, and the room dimming to night (the fire stays bright).
      const o = spots.sleep.overlay;
      const key = `sleeper-${building}`;
      if (!this.textures.exists(key)) {
        const tex = this.textures.createCanvas(key, o.w, o.h);
        o.draw(tex.getContext());
        tex.refresh();
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      this.sleeper = this.add.image(o.x, o.y, key).setOrigin(0).setDepth(0.4).setVisible(false);
      this.night = this.add.rectangle(0, 0, room.w, room.h, 0x0b0a24).setOrigin(0).setDepth(0.5).setAlpha(0);
      makeZ(this);
    }

    // Tap to walk; tapping the doorway or below the room walks out; tapping
    // a spot (bookshelf, bed, fireplace) walks there and uses it.
    this.input.on('pointerdown', (pointer) => {
      if (this.leaving) return;
      const { worldX: x, worldY: y } = pointer;
      const spot = Object.entries(spots).find(([, s]) => inRect(x, y, s.area));
      if (spot) {
        const [id, s] = spot;
        const use = { read: () => this.read(), sleep: () => this.sleep(), fire: () => this.lookAtFire() }[id];
        this.player.walkTo(s.stand.x, s.stand.y, use);
      } else if (y > room.h - WALL) this.player.walkTo(doorX, room.h - 1);
      else this.player.walkTo(x, y);
    });

    // Given the pie, Bob is at the farmhouse table eating it. The night
    // overlay is under him, so he's dimmed by hand while Jones sleeps.
    this.bob = building === 'house' && hasFlag('gavePie') ? seatBob(this) : null;

    this.game.events.emit('location', { name: BUILDINGS[building].name });
  }

  // Tint Bob to match the room dimming to night.
  dimBob() {
    if (!this.bob) return;
    const a = this.night.alpha;
    this.bob.setTint(Phaser.Display.Color.GetColor(255 * (1 - a), 255 * (1 - a), 255 * (1 - a * 0.8)));
  }

  // Take a book off the shelf, turn around and read until the next tap or key.
  read() {
    const timer = this.time.delayedCall(450, () => {
      this.bookGap.setVisible(true);
      setFlag('read');
      this.player.dir = 'down';
      this.player.sprite.play('player-px-read');
    });
    this.player.face('up');
    this.player.act('player-px-idle-up', () => {
      timer.remove();
      this.bookGap.setVisible(false);
    });
  }

  // Look into the fire: his view of it (ViewScene), then back in the room.
  lookAtFire() {
    this.player.face('up');
    this.leaving = true;
    const cam = this.cameras.main;
    cam.fadeOut(300);
    cam.once('camerafadeoutcomplete', () => {
      this.events.once('resume', () => {
        this.leaving = false;
        cam.fadeIn(300);
      });
      this.scene.launch('View', { view: 'fire', from: 'Interior' });
      this.scene.pause();
    });
  }

  // Climb into bed: the room darkens and z's float up until the next tap or key.
  sleep() {
    const { player } = this;
    let zzz = null;
    const timer = this.time.delayedCall(300, () => {
      player.sprite.setVisible(false);
      this.sleeper.setVisible(true);
      setFlag('slept');
      this.tweens.killTweensOf(this.night);
      this.tweens.add({ targets: this.night, alpha: 0.45, duration: 900, onUpdate: () => this.dimBob() });
      zzz = this.time.addEvent({ delay: 1100, startAt: 900, loop: true, callback: () => this.puffZ() });
    });
    player.face('left');
    player.act('player-px-idle-left', () => {
      timer.remove();
      zzz?.remove();
      player.sprite.setVisible(true);
      this.sleeper.setVisible(false);
      this.tweens.killTweensOf(this.night);
      this.tweens.add({ targets: this.night, alpha: 0, duration: 400, onUpdate: () => this.dimBob() });
      player.face('down');
    });
  }

  puffZ() {
    const { x, y } = this.room.spots.sleep.zzz;
    const z = this.add.image(x, y, 'zzz').setDepth(2).setScale(0.6);
    this.tweens.add({
      targets: z, x: x + 10, y: y - 20, scale: 1.1, alpha: 0, duration: 2200,
      onComplete: () => z.destroy(),
    });
  }

  update(_time, delta) {
    if (this.leaving) return;
    this.player.update(delta / 1000);
    if (this.player.y >= this.exitY) this.leave();
  }

  leave() {
    this.leaving = true;
    this.player.stop();
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { from: this.building }));
  }
}
