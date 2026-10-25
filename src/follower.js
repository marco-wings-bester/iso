import { FRAME_H, FEET_Y } from './constants.js';
import { hasFlag } from './state.js';
import { steffiDressed } from './steffi.js';

// Steffi on their date: from her front door ('withSteffi', src/steffiHouse.js)
// till dinner's done ('dateDone', src/restaurant.js) she walks with Johan
// wherever he goes, a step or two behind him, along the way he went. In every
// place (the maps, the farm, inside): `scene.follower`, or null.

const GAP = 15; // how far behind him she keeps (his own sprite px)

export function followMe(scene) {
  scene.follower = null;
  if (!hasFlag('withSteffi') || hasFlag('dateDone')) return null;
  const { player } = scene;
  const ps = player.sprite;
  const inside = scene.scene.key === 'Interior';
  const key = steffiDressed(scene, inside);
  const k = ps.scaleX;
  const u = k * (inside ? 1 : 2); // (sprite px → this place's px)
  const sprite = scene.add.sprite(ps.x + 8 * u, ps.y + 2 * u, key).setOrigin(0.5, FEET_Y / FRAME_H).setScale(k).setDepth(ps.y);
  sprite.play(`${key}-idle-${player.dir}`);
  const trail = [];
  let facing = player.dir;
  let paused = false;
  const tick = (_t, delta) => {
    if (paused || !sprite.active) return;
    const last = trail[trail.length - 1];
    if (!last || Math.hypot(ps.x - last.x, ps.y - last.y) > u) trail.push({ x: ps.x, y: ps.y });
    const far = Math.hypot(ps.x - sprite.x, ps.y - sprite.y) > GAP * u;
    let moved = false;
    let step = player.speed * 1.1 * delta / 1000;
    while (far && trail.length && step > 0) {
      const to = trail[0];
      const dx = to.x - sprite.x;
      const dy = to.y - sprite.y;
      const d = Math.hypot(dx, dy);
      if (d <= step) {
        sprite.setPosition(to.x, to.y);
        trail.shift();
        step -= d;
      } else {
        sprite.setPosition(sprite.x + (dx / d) * step, sprite.y + (dy / d) * step);
        step = 0;
      }
      if (d > 0.01) facing = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      moved = true;
    }
    sprite.setDepth(sprite.y);
    const anim = `${key}-${moved ? 'walk' : 'idle'}-${facing}`;
    if (sprite.anims.currentAnim?.key !== anim) sprite.play(anim);
  };
  scene.events.on('update', tick);
  scene.events.once('shutdown', () => scene.events.off('update', tick));
  scene.follower = {
    sprite, key,
    // stop following (a scene walks her somewhere itself), and start again
    pause: () => { paused = true; },
    resume: () => { trail.length = 0; paused = false; },
    face: (dir) => { facing = dir; sprite.play(`${key}-idle-${dir}`); },
  };
  return scene.follower;
}
