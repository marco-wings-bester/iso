import Phaser from 'phaser';
import { createCharacter } from './CharacterSprite.js';
import Player from './Player.js';
import WalkGrid from './WalkGrid.js';
import { BUILDINGS } from './buildings.js';
import { ROOMS, WALL } from './interiors.js';
import { INTERIOR_SPEED } from './constants.js';

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

    // Crisp integer zoom: ~4x on a phone, so the farmer is ~3x his farm size.
    const { width: W, height: H } = this.scale;
    const zoom = Math.max(2, Math.round(Math.min(W / 100, H / 140)));
    const grid = WalkGrid.fromFn(room.w, room.h, 2, (x, y) => walkable(room, x, y));
    const doorX = room.door.x + room.door.w / 2;
    this.player = new Player(this, {
      x: doorX,
      y: room.h - WALL - 8,
      dir: 'up',
      texture: 'player-px',
      speed: INTERIOR_SPEED,
      grid,
      markerScale: 1 / zoom,
    });
    this.exitY = room.h - 3;
    this.leaving = false;

    // Camera follows the farmer; a room smaller than the screen is centred.
    const cam = this.cameras.main;
    const vw = W / zoom;
    const vh = H / zoom;
    const bx = Math.min(0, (room.w - vw) / 2);
    const by = Math.min(0, (room.h - vh) / 2);
    cam.setBackgroundColor('#1a1008')
      .setZoom(zoom)
      .setBounds(bx, by, Math.max(room.w, vw), Math.max(room.h, vh))
      .setRoundPixels(true)
      .startFollow(this.player.sprite, true)
      .fadeIn(FADE_MS);

    // Tap to walk; tapping the doorway or below the room walks out.
    this.input.on('pointerdown', (pointer) => {
      if (this.leaving) return;
      const { worldX: x, worldY: y } = pointer;
      if (y > room.h - WALL) this.player.walkTo(doorX, room.h - 1);
      else this.player.walkTo(x, y);
    });

    this.game.events.emit('location', { name: BUILDINGS[building].name, hint: 'Walk out the door to leave' });
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
