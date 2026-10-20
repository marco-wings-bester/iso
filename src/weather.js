import { today } from './days.js';

// Friday it rains, all day, everywhere out of doors (the farm, the
// crossroads, the beach…): the light greyer, rain slanting down across the
// screen, and drops splashing on the ground.

export const FRIDAY = 4;

export function isRaining() {
  return today() === FRIDAY;
}

// Rain over a w × h picture (in its own px), over whatever the camera shows.
export function rain(scene, w, h) {
  scene.add.rectangle(0, 0, w, h, 0x4a5868, 0.42).setOrigin(0).setDepth(5e4);
  const cam = scene.cameras.main;
  const k = () => cam.worldView.height / 600; // picture px per screen-ish px
  if (!scene.textures.exists('raindrop')) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xe4eef8, 1).fillRect(0, 0, 3, 20);
    g.generateTexture('raindrop', 3, 20);
    g.destroy();
  }
  scene.time.addEvent({
    delay: 30, loop: true,
    callback: () => {
      const v = cam.worldView;
      const s = k();
      for (let i = 0; i < 5; i++) {
        const fall = v.height * (0.5 + Math.random() * 0.6);
        const x = v.x + Math.random() * (v.width + fall * 0.21); // (slanting left as it falls)
        const y = v.y - 20 * s;
        const d = scene.add.image(x, y, 'raindrop').setScale(s).setAngle(12).setAlpha(0.75).setDepth(5e4 + 1);
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
