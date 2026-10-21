import Phaser from 'phaser';
import { today } from './days.js';
import { hasFlag } from './state.js';
import { ART_PX } from './constants.js';
import { grid, rect, outline, blit } from './pixelArt.js';

// Friday it rains, gently, all day, everywhere out of doors (the farm, the
// crossroads, the beach…): the light greyer, rain slanting down across the
// screen, and drops splashing on the ground. Johan won't go out in it without
// his umbrella (in the chest in the farmhouse: 'umbrella', src/InteriorScene.js);
// out of doors he holds it up over his head (`umbrella`), and indoors it's
// shut.

export const FRIDAY = 4;

export function isRaining() {
  return today() === FRIDAY;
}

// Rain over a w × h picture (in its own px), over whatever the camera shows.
export function rain(scene, w, h) {
  scene.add.rectangle(0, 0, w, h, 0x4a5868, 0.22).setOrigin(0).setDepth(5e4);
  const cam = scene.cameras.main;
  const k = () => cam.worldView.height / 600; // picture px per screen-ish px
  if (!scene.textures.exists('raindrop')) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xe4eef8, 1).fillRect(0, 0, 2, 14);
    g.generateTexture('raindrop', 2, 14);
    g.destroy();
  }
  scene.time.addEvent({
    delay: 60, loop: true,
    callback: () => {
      const v = cam.worldView;
      const s = k();
      for (let i = 0; i < 2; i++) {
        const fall = v.height * (0.5 + Math.random() * 0.6);
        const x = v.x + Math.random() * (v.width + fall * 0.21); // (slanting left as it falls)
        const y = v.y - 20 * s;
        const d = scene.add.image(x, y, 'raindrop').setScale(s).setAngle(12).setAlpha(0.5).setDepth(5e4 + 1);
        scene.tweens.add({
          targets: d, x: x - fall * 0.21, y: y + fall, duration: 700 * fall / v.height + 150, ease: 'Linear',
          onComplete: () => {
            // a little splash where it lands
            const splash = scene.add.ellipse(d.x, d.y, 8 * s, 3 * s).setStrokeStyle(Math.max(1, s), 0xd8e8f4, 0.7).setDepth(5e4 + 1);
            scene.tweens.add({ targets: splash, scaleX: 2, scaleY: 2, alpha: 0, duration: 260, onComplete: () => splash.destroy() });
            d.destroy();
          },
        });
      }
    },
  });
}

// His umbrella, red and cream: a dome and its shaft down to the crook, 24×30
// sprite px (at the map's resolution, like his own sprite).
const UMBRELLA_W = 24;
const UMBRELLA_H = 30;
function umbrellaTexture(scene) {
  if (scene.textures.exists('umbrella')) return;
  const g = grid(UMBRELLA_W + 2, UMBRELLA_H + 2);
  const cx = UMBRELLA_W / 2;
  for (let y = 0; y < 9; y++) {
    const half = Math.round(11.5 * Math.sqrt(1 - ((8.5 - y) / 9.5) ** 2));
    for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) {
      const panel = Math.floor((x - cx + 12) / 4) % 2;
      const lit = x < cx - 2 && y < 5;
      rect(g, x + 1, y + 1, 1, 1, panel ? (lit ? '#fffaf0' : '#f6eedc') : (lit ? '#f07a5a' : '#d04c3a'));
    }
  }
  for (let x = 1; x < UMBRELLA_W; x += 4) rect(g, x + 1, 9, 2, 1, x % 8 === 1 ? '#982f2a' : '#d8ccb8'); // its scalloped hem
  rect(g, cx, 0, 1, 1, '#4a3020'); // the tip
  const tex = scene.textures.createCanvas('umbrella', (UMBRELLA_W + 2) * ART_PX, (UMBRELLA_H + 2) * ART_PX);
  const ctx = tex.getContext();
  blit(ctx, outline(g), 0, 0, ART_PX);
  // the shaft and its crook: thin, half a sprite pixel, no outline
  const px = (cx + 1) * ART_PX;
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(px, 11 * ART_PX, 1, (UMBRELLA_H - 11) * ART_PX);
  ctx.fillRect(px, (UMBRELLA_H + 1) * ART_PX - 1, 2 * ART_PX, 1);
  ctx.fillRect(px + 2 * ART_PX - 1, (UMBRELLA_H - 1) * ART_PX, 1, 2 * ART_PX);
  tex.refresh();
}

// Out in the rain with it: the umbrella up over his head, following him.
export function umbrella(scene) {
  if (!isRaining() || !hasFlag('umbrella')) return;
  umbrellaTexture(scene);
  const { sprite } = scene.player;
  const u = scene.add.image(0, 0, 'umbrella').setOrigin(0.5, 1);
  const follow = () => {
    const s = sprite.scaleX;
    u.setScale(s).setPosition(sprite.x + 2 * ART_PX * s, sprite.y - 7 * ART_PX * s).setDepth(sprite.depth + 0.5).setVisible(sprite.visible);
  };
  follow();
  scene.events.on('update', follow);
  scene.events.once('shutdown', () => scene.events.off('update', follow));
}
