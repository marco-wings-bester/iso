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
