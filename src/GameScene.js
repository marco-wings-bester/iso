import Phaser from 'phaser';
import { createCharacterTexture } from './CharacterSprite.js';
import { isOnPath, isWalkable, findRoute } from './PathSystem.js';
import { CELL, COLS, ROWS } from './walkMask.js';
import {
  IMG_W, IMG_H,
  PLAYER_SPEED, PLAYER_SCALE_BASE,
  DEBUG_PATH,
} from './constants.js';

const DIR_NAMES = ['down', 'left', 'right', 'up'];
const ARRIVE_THRESHOLD = 1; // px; waypoints are hit exactly so turns stay on the path

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('map', 'assets/map.png');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Cover-scale: zoom to fill the entire screen (like CSS background-size:cover).
    // May crop the narrow edges; no black bars.
    this.dispScale = Math.max(W / IMG_W, H / IMG_H);
    this.dispOffX  = Math.round((W - IMG_W * this.dispScale) / 2);
    this.dispOffY  = Math.round((H - IMG_H * this.dispScale) / 2);

    // Background fills screen exactly
    this.add
      .image(
        this.dispOffX + (IMG_W * this.dispScale) / 2,
        this.dispOffY + (IMG_H * this.dispScale) / 2,
        'map'
      )
      .setDisplaySize(IMG_W * this.dispScale, IMG_H * this.dispScale)
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

    // Player – start at gate (image coords 387,1265 → screen coords)
    const { dispScale, dispOffX, dispOffY } = this;
    this.playerX = 387 * dispScale + dispOffX;
    this.playerY = 1265 * dispScale + dispOffY;
    this.lastDir = 'up';
    this.route = []; // screen-space waypoints for tap-to-move

    this.player = this.add
      .sprite(this.playerX, this.playerY, 'player', 0)
      .setScale(PLAYER_SCALE_BASE * dispScale)
      .setOrigin(0.5, 1)
      .setDepth(this.playerY);

    this.player.play('idle-up');

    // Tap/click target marker
    this.targetMarker = this.add.graphics().setDepth(500);

    this.input.on('pointerdown', (pointer) => {
      const toImg = (sx, sy) => [(sx - dispOffX) / dispScale, (sy - dispOffY) / dispScale];
      const [fx, fy] = toImg(this.playerX, this.playerY);
      const [tx, ty] = toImg(pointer.x, pointer.y);
      this.route = findRoute(fx, fy, tx, ty).map(p => ({
        x: p.x * dispScale + dispOffX,
        y: p.y * dispScale + dispOffY,
      }));
      if (this.route.length) {
        const end = this.route[this.route.length - 1];
        this._drawTargetMarker(end.x, end.y);
      } else {
        this.targetMarker.clear();
      }
    });

    // Keyboard
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Debug overlay (walkable cells projected to screen space)
    if (DEBUG_PATH) {
      const g = this.add.graphics().setDepth(999);
      g.fillStyle(0x00ff00, 0.35);
      const size = CELL * dispScale;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (isWalkable((c + 0.5) * CELL, (r + 0.5) * CELL)) {
            g.fillRect(c * size + dispOffX, r * size + dispOffY, size, size);
          }
        }
      }
    }

    // Controls hint
    this.add
      .text(12, 10, 'Tap to walk  •  WASD / Arrow Keys', {
        fontSize: '14px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setDepth(1000);
  }

  update(_time, delta) {
    const dt = delta / 1000;
    const { cursors, wasd, dispScale, dispOffX, dispOffY } = this;

    let vx = 0;
    let vy = 0;

    // ── Keyboard ─────────────────────────────────────────────────────
    const kbActive =
      cursors.left.isDown  || cursors.right.isDown ||
      cursors.up.isDown    || cursors.down.isDown  ||
      wasd.left.isDown     || wasd.right.isDown    ||
      wasd.up.isDown       || wasd.down.isDown;

    if (kbActive) {
      this._clearRoute();
      if (cursors.left.isDown  || wasd.left.isDown)  vx -= PLAYER_SPEED;
      if (cursors.right.isDown || wasd.right.isDown) vx += PLAYER_SPEED;
      if (cursors.up.isDown    || wasd.up.isDown)    vy -= PLAYER_SPEED;
      if (cursors.down.isDown  || wasd.down.isDown)  vy += PLAYER_SPEED;
      if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    }

    // ── Tap-to-move ───────────────────────────────────────────────────
    // Advance past waypoints we've reached; the last one ends the walk.
    while (!kbActive && this.route.length) {
      const { x, y } = this.route[0];
      if (Math.hypot(x - this.playerX, y - this.playerY) > ARRIVE_THRESHOLD) break;
      this.route.shift();
      if (!this.route.length) this._clearRoute();
    }
    if (!kbActive && this.route.length) {
      const dx = this.route[0].x - this.playerX;
      const dy = this.route[0].y - this.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = Math.min(PLAYER_SPEED, dist / dt); // don't overshoot the waypoint
      vx = (dx / dist) * speed;
      vy = (dy / dist) * speed;
    }

    // ── Movement with path constraint ─────────────────────────────────
    if (vx !== 0 || vy !== 0) {
      const nx = this.playerX + vx * dt;
      const ny = this.playerY + vy * dt;

      let moved = false;
      if (isOnPath(nx, ny, dispScale, dispOffX, dispOffY)) {
        this.playerX = nx;
        this.playerY = ny;
        moved = true;
      } else {
        let mx = false, my = false;
        if (isOnPath(nx, this.playerY, dispScale, dispOffX, dispOffY)) {
          this.playerX = nx; mx = true;
        }
        if (isOnPath(this.playerX, ny, dispScale, dispOffX, dispOffY)) {
          this.playerY = ny; my = true;
        }
        moved = mx || my;
        if (!moved) this._clearRoute();
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

  _clearRoute() {
    this.route = [];
    this.targetMarker.clear();
  }

  _playIdle() {
    const key = `idle-${this.lastDir}`;
    if (this.player.anims.currentAnim?.key !== key) {
      this.player.play(key);
    }
  }

  _drawTargetMarker(x, y) {
    this.targetMarker.clear();
    this.targetMarker.lineStyle(2, 0xffffff, 0.8);
    this.targetMarker.strokeCircle(x, y, 10);
    this.targetMarker.fillStyle(0xffffff, 0.6);
    this.targetMarker.fillCircle(x, y, 3);
  }
}
