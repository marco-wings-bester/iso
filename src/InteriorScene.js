import Phaser from 'phaser';
import { createCharacter } from './CharacterSprite.js';
import Player from './Player.js';
import WalkGrid from './WalkGrid.js';
import { BUILDINGS, inRect } from './buildings.js';
import { ROOMS, WALL, pieTexture } from './interiors.js';
import { INTERIOR_SPEED } from './constants.js';
import { hasFlag, setFlag } from './state.js';
import { seatBob } from './bob.js';
import { bakePie, eatHalf } from './baking.js';
import { think } from './bubble.js';
import { line } from './hints.js';
import { knock, hideBob, bobWaiting, bobInChest } from './sarah.js';

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
    this.busy = false;  // baking, eating, talking: taps and keys are ignored…
    this.skippable = false; // …or, while people talk, a tap cuts a line short
    this.carry = null;  // what he's carrying (follows him)

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
    if (spots.picker && !hasFlag('picker')) this.pickerProp = this.roomImage(`picker-${building}`, spots.picker.prop);
    if (spots.sleep) {
      // Him asleep in bed, and the room dimming to night (the fire stays bright).
      this.sleeper = this.roomImage(`sleeper-${building}`, spots.sleep.overlay).setDepth(0.4).setVisible(false);
      this.night = this.add.rectangle(0, 0, room.w, room.h, 0x0b0a24).setOrigin(0).setDepth(0.5).setAlpha(0);
      makeZ(this);
    }

    // Tap to walk; tapping the doorway or below the room walks out; tapping
    // a spot (bookshelf, cupboard, table, chest, bed, fireplace) walks there
    // and uses it.
    this.input.on('pointerdown', (pointer) => {
      if (this.busy && this.skippable) this.thought?.destroy();
      if (this.leaving || this.busy) return;
      const { worldX: x, worldY: y } = pointer;
      const spot = Object.entries(spots).find(([, s]) => inRect(x, y, s.area));
      if (spot) {
        const [id, s] = spot;
        const use = {
          read: () => this.read(), cook: () => this.useCupboard(), eat: () => this.eatPie(), sleep: () => this.tryToSleep(),
          fire: () => this.lookAtFire(), picker: () => this.takePicker(), hide: () => this.useChest(),
        }[id];
        this.player.walkTo(s.stand.x, s.stand.y, use);
      } else if (y > room.h - WALL) this.player.walkTo(doorX, room.h - 1);
      else this.player.walkTo(x, y);
    });

    // Once baked, the pie is on the table (half of it once Jones has had his);
    // given the rest, Bob is there eating it, and once he's finished there's
    // a knock at the door (src/sarah.js): then he's waiting to be hidden, or
    // hidden in the chest. The night overlay is under Bob, so he's dimmed by
    // hand while Jones sleeps.
    const house = building === 'house';
    const { pie } = room.kitchen?.table ?? {};
    if (house && hasFlag('baked') && !hasFlag('gavePie')) {
      this.pie = this.add.image(pie.x, pie.y, pieTexture(this, hasFlag('ate') ? 4 : 8)).setOrigin(0).setDepth(0.45);
    }
    this.bob = null;
    if (house && hasFlag('gavePie')) {
      const knockSoon = () => this.time.delayedCall(2500, () => knock(this));
      if (hasFlag('sarahKnocked')) {
        this.add.image(pie.x, pie.y, pieTexture(this, 0)).setOrigin(0).setDepth(0.45); // his empty plate
        if (hasFlag('bobHidden')) bobInChest(this);
        else this.bob = bobWaiting(this);
      } else {
        this.bob = seatBob(this, knockSoon);
        if (hasFlag('pieEaten')) knockSoon();
      }
    }

    this.game.events.emit('location', { name: BUILDINGS[building].name });
  }

  // Tint Bob to match the room dimming to night.
  dimBob() {
    if (!this.bob) return;
    const a = this.night.alpha;
    this.bob.setTint(Phaser.Display.Color.GetColor(255 * (1 - a), 255 * (1 - a), 255 * (1 - a * 0.8)));
  }

  // An image from a room's {x, y, w, h, draw} (drawn once into a texture).
  roomImage(key, o) {
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, o.w, o.h);
      o.draw(tex.getContext());
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    return this.add.image(o.x, o.y, key).setOrigin(0);
  }

  think(text) {
    return think(this, this.player.sprite, text);
  }

  // The kitchen cupboard: bake the pie, once he's read the recipe and has an
  // apple. Otherwise a hint, at the level set in the menu.
  useCupboard() {
    this.player.face('left');
    if (!hasFlag('read')) this.think(line('cupboardNoRecipe'));
    else if (hasFlag('baked')) this.think(hasFlag('gavePie') ? 'Bob has the pie now.' : "I've already baked a pie.");
    else if (!hasFlag('apple')) this.think(line('cupboardNoApple'));
    else bakePie(this);
  }

  // The big chest: where Bob hides when Sarah knocks.
  useChest() {
    this.player.face('right');
    if (hasFlag('sarahKnocked') && !hasFlag('bobHidden')) hideBob(this);
    else this.think(hasFlag('bobHidden') ? "Shh… Bob's in there." : 'Just old blankets in here.');
  }

  // Sarah's at the door and Bob isn't hidden yet: no going out.
  mustHideBob() {
    return this.building === 'house' && hasFlag('sarahKnocked') && !hasFlag('bobHidden');
  }

  // The pie on the table: he has half of it, and that makes him sleepy.
  eatPie() {
    if (!hasFlag('baked') || hasFlag('gavePie')) return;
    if (hasFlag('ate')) this.think("I'm full. I'll save the rest for later.");
    else eatHalf(this);
  }

  // Bed: only once he's had his pie.
  tryToSleep() {
    if (hasFlag('ate')) this.sleep();
    else this.think(line('bedEarly'));
  }

  // The apple picker in the tool shed: take it, for the apples out of reach.
  takePicker() {
    this.player.face('up');
    if (hasFlag('picker')) return;
    this.pickerProp.destroy();
    setFlag('picker');
    this.think(line('pickerFound'));
  }

  // Take the recipe book off the shelf, turn around and read until the next
  // tap or key. The first time, it gives him an idea.
  read() {
    const firstTime = !hasFlag('read');
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
      if (firstTime && hasFlag('read')) this.think(line('idea'));
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
    const { x, y, dir } = this.player;
    // what he carries is in his hands: in front of him, or hidden behind him facing away
    const side = { left: -4, right: 4 }[dir] ?? 0;
    this.carry?.setPosition(x + side, y - 7).setDepth(y + (dir === 'up' ? -0.5 : 0.5));
    if (y < this.exitY) return;
    if (!this.mustHideBob()) {
      this.leave();
      return;
    }
    // back from the doorway
    this.player.stop();
    this.player.y = this.room.h - WALL - 10;
    this.player.face('up');
    this.think(line('notNow'));
  }

  leave() {
    this.leaving = true;
    this.player.stop();
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { from: this.building }));
  }
}
