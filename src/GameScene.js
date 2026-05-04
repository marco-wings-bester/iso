import Phaser from 'phaser';
import { createCharacterTexture } from './CharacterSprite.js';
import { PATH_ZONES, isOnPath } from './PathSystem.js';
import {
  GAME_WIDTH, GAME_HEIGHT,
  PLAYER_SPEED, PLAYER_SCALE,
  DEBUG_PATH,
} from './constants.js';

const DIR_NAMES = ['down', 'left', 'right', 'up'];
const ARRIVE_THRESHOLD = 12; // pixels – stop when this close to tap target

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('map', 'assets/map.png');
  }

  create() {
    // Background
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'map')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(0);

    // Programmatic character sprite sheet
    createCharacterTexture(this);

    // Animations – 4 directions × walk + idle
    DIR_NAMES.forEach((name, row) => {
      const base = row * 4;
      this.anims.create({
        key: `walk-${name}`,
        frames: [
          { key: 'player', frame: base + 0 },
          { key: 'player', frame: base + 1 },
          { key: 'player', frame: base + 2 },
          { key: 'player', frame: base + 3 },
        ],
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `idle-${name}`,
        frames: [{ key: 'player', frame: base + 0 }],
        frameRate: 1,
        repeat: -1,
      });
    });

    // Player – origin at bottom-center so playerY == feet position
    this.playerX = 565;
    this.playerY = 455;
    this.lastDir = 'down';
    this.tapTargetX = null;
    this.tapTargetY = null;

    this.player = this.add
      .sprite(this.playerX, this.playerY, 'player', 0)
      .setScale(PLAYER_SCALE)
      .setOrigin(0.5, 1)
      .setDepth(this.playerY);

    this.player.play('idle-down');

    // Tap target marker – a small pulsing circle drawn at the tap point
    this.targetMarker = this.add.graphics().setDepth(500);

    // Tap / click to move
    this.input.on('pointerdown', (pointer) => {
      this.tapTargetX = pointer.x;
      this.tapTargetY = pointer.y;
      this._drawTargetMarker(pointer.x, pointer.y);
    });

    // Keyboard input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Debug overlay
    if (DEBUG_PATH) {
      const g = this.add.graphics().setDepth(999);
      g.fillStyle(0x00ff00, 0.25);
      g.lineStyle(1, 0x00ff00, 0.9);
      PATH_ZONES.forEach(z => {
        g.fillRect(z.x, z.y, z.w, z.h);
        g.strokeRect(z.x, z.y, z.w, z.h);
      });
    }

    // Controls hint
    this.add
      .text(12, 10, 'Tap to walk  •  WASD / Arrow Keys', {
        fontSize: '15px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setDepth(1000);
  }

  update(_time, delta) {
    const dt = delta / 1000;
    const { cursors, wasd } = this;

    let vx = 0;
    let vy = 0;

    // ── Keyboard input ────────────────────────────────────────────────
    const kbActive =
      cursors.left.isDown  || cursors.right.isDown ||
      cursors.up.isDown    || cursors.down.isDown  ||
      wasd.left.isDown     || wasd.right.isDown    ||
      wasd.up.isDown       || wasd.down.isDown;

    if (kbActive) {
      // Keyboard takes over – cancel any tap target
      this.tapTargetX = null;
      this.tapTargetY = null;
      this.targetMarker.clear();

      if (cursors.left.isDown  || wasd.left.isDown)  vx -= PLAYER_SPEED;
      if (cursors.right.isDown || wasd.right.isDown) vx += PLAYER_SPEED;
      if (cursors.up.isDown    || wasd.up.isDown)    vy -= PLAYER_SPEED;
      if (cursors.down.isDown  || wasd.down.isDown)  vy += PLAYER_SPEED;

      if (vx !== 0 && vy !== 0) {
        vx *= 0.707;
        vy *= 0.707;
      }
    }

    // ── Tap-to-move ───────────────────────────────────────────────────
    if (!kbActive && this.tapTargetX !== null) {
      const dx = this.tapTargetX - this.playerX;
      const dy = this.tapTargetY - this.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > ARRIVE_THRESHOLD) {
        vx = (dx / dist) * PLAYER_SPEED;
        vy = (dy / dist) * PLAYER_SPEED;
      } else {
        // Arrived
        this.tapTargetX = null;
        this.tapTargetY = null;
        this.targetMarker.clear();
      }
    }

    // ── Apply movement with path constraint ───────────────────────────
    if (vx !== 0 || vy !== 0) {
      const nx = this.playerX + vx * dt;
      const ny = this.playerY + vy * dt;

      let moved = false;
      if (isOnPath(nx, ny)) {
        this.playerX = nx;
        this.playerY = ny;
        moved = true;
      } else {
        let movedX = false;
        let movedY = false;
        if (isOnPath(nx, this.playerY)) { this.playerX = nx; movedX = true; }
        if (isOnPath(this.playerX, ny)) { this.playerY = ny; movedY = true; }
        moved = movedX || movedY;

        // If tap target is off-path, cancel it so the character stops
        if (!moved && this.tapTargetX !== null) {
          this.tapTargetX = null;
          this.tapTargetY = null;
          this.targetMarker.clear();
        }
      }

      if (moved) {
        let dir = this.lastDir;
        if (Math.abs(vx) >= Math.abs(vy)) {
          dir = vx < 0 ? 'left' : 'right';
        } else {
          dir = vy < 0 ? 'up' : 'down';
        }
        this.lastDir = dir;
        const key = `walk-${dir}`;
        if (this.player.anims.currentAnim?.key !== key) {
          this.player.play(key);
        }
      } else {
        this._playIdle();
      }
    } else {
      this._playIdle();
    }

    this.player.setPosition(this.playerX, this.playerY);
    this.player.setDepth(this.playerY);
  }

  _playIdle() {
    const key = `idle-${this.lastDir}`;
    if (this.player.anims.currentAnim?.key !== key) {
      this.player.play(key);
    }
  }

  _drawTargetMarker(x, y) {
    this.targetMarker.clear();
    // Outer ring
    this.targetMarker.lineStyle(2, 0xffffff, 0.8);
    this.targetMarker.strokeCircle(x, y, 10);
    // Inner dot
    this.targetMarker.fillStyle(0xffffff, 0.6);
    this.targetMarker.fillCircle(x, y, 3);
  }
}
