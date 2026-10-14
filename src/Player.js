import Phaser from 'phaser';
import { FRAME_H, FEET_Y } from './constants.js';

const ARRIVE = 0.5; // world px; waypoints are hit exactly so turns stay walkable

// The farmer: keyboard + tap-to-walk movement over a WalkGrid, in world pixels.
// Shared by the farm and the interiors (which differ in texture, speed and grid).
export default class Player {
  constructor(scene, { x, y, dir = 'up', texture, speed, grid, markerScale = 1 }) {
    Object.assign(this, { scene, x, y, dir, texture, speed, grid, markerScale });
    this.route = [];

    this.sprite = scene.add
      .sprite(x, y, texture, 0)
      .setOrigin(0.5, FEET_Y / FRAME_H)
      .setDepth(y);
    this.marker = scene.add.graphics().setDepth(1e6);

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = scene.input.keyboard.addKeys({
      left: K.LEFT, right: K.RIGHT, up: K.UP, down: K.DOWN,
      a: K.A, d: K.D, w: K.W, s: K.S,
    });
    this._play('idle');
  }

  walkTo(tx, ty) {
    this.route = this.grid.findRoute(this.x, this.y, tx, ty);
    const end = this.route[this.route.length - 1];
    this.marker.clear();
    if (!end) return;
    const m = this.markerScale;
    this.marker.lineStyle(2 * m, 0xffffff, 0.8).strokeCircle(end.x, end.y, 10 * m);
    this.marker.fillStyle(0xffffff, 0.6).fillCircle(end.x, end.y, 3 * m);
  }

  stop() {
    this.route = [];
    this.marker.clear();
    this._play('idle');
  }

  update(dt) {
    const k = this.keys;
    let vx = 0;
    let vy = 0;

    const kbActive = [k.left, k.right, k.up, k.down, k.a, k.d, k.w, k.s].some(key => key.isDown);
    if (kbActive) {
      this.route = [];
      this.marker.clear();
      if (k.left.isDown || k.a.isDown) vx -= this.speed;
      if (k.right.isDown || k.d.isDown) vx += this.speed;
      if (k.up.isDown || k.w.isDown) vy -= this.speed;
      if (k.down.isDown || k.s.isDown) vy += this.speed;
      if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    }

    // Tap-to-walk: advance past reached waypoints; the last one ends the walk.
    while (!kbActive && this.route.length) {
      const { x, y } = this.route[0];
      if (Math.hypot(x - this.x, y - this.y) > ARRIVE) break;
      this.route.shift();
      if (!this.route.length) this.marker.clear();
    }
    if (!kbActive && this.route.length) {
      const dx = this.route[0].x - this.x;
      const dy = this.route[0].y - this.y;
      const dist = Math.hypot(dx, dy);
      const speed = Math.min(this.speed, dist / dt); // don't overshoot the waypoint
      vx = (dx / dist) * speed;
      vy = (dy / dist) * speed;
    }

    // Move, sliding along edges when the direct step is blocked.
    let moved = false;
    if (vx !== 0 || vy !== 0) {
      const nx = this.x + vx * dt;
      const ny = this.y + vy * dt;
      if (this.grid.isWalkable(nx, ny)) {
        this.x = nx;
        this.y = ny;
        moved = true;
      } else {
        if (this.grid.isWalkable(nx, this.y)) { this.x = nx; moved = true; }
        if (this.grid.isWalkable(this.x, ny)) { this.y = ny; moved = true; }
        if (!moved) { this.route = []; this.marker.clear(); }
      }
    }

    if (moved) {
      if (Math.abs(vx) >= Math.abs(vy)) this.dir = vx < 0 ? 'left' : 'right';
      else this.dir = vy < 0 ? 'up' : 'down';
      this._play('walk');
    } else {
      this._play('idle');
    }

    this.sprite.setPosition(this.x, this.y).setDepth(this.y);
  }

  _play(kind) {
    const key = `${this.texture}-${kind}-${this.dir}`;
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
  }
}
