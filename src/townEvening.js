import { createVillager } from './CharacterSprite.js';
import { FRAME_H, FEET_Y } from './constants.js';
import { converse } from './dialog.js';
import { lampLight } from './nightLights.js';

// The town in the evening (TownScene, src/evening.js): its street lamps lit,
// and outside the restaurant a man on a stool playing his guitar, notes
// drifting up from it. Tapping him, Johan walks over and he plays them a
// little something.

// The lamps in the picture: their lanterns, and the feet of their posts.
const LAMPS = [
  { x: 848, y: 1130 }, { x: 567, y: 1215 }, { x: 1180, y: 1330 },
  { x: 1000, y: 1875 }, { x: 1225, y: 835 }, { x: 865, y: 2212 },
];
const LAMP_H = 92; // lantern to foot

// The guitar man: by the restaurant's patio steps, facing the square.
const PLAYER_AT = { x: 1080, y: 1290 };
const BY_HIM = { x: 1010, y: 1316 };
const LOOK = {
  hair: 'hat',
  palette: {
    S: '#c88a5a', s: '#a06a40', B: '#3a2a1a', d: '#24180e',
    H: '#3a3a40', h: '#2a2a30', j: '#1e1e24', b: '#a8282a', R: '#2e2018', r: '#1a120c',
    C: '#e8d8b0', c: '#c0ac80', O: '#3a4a6a', o: '#2a344e',
  },
};
const NAME = { af: 'Die kitaarspeler', en: 'The guitarist' };

export function eveningTown(scene) {
  LAMPS.forEach(head => lampLight(scene, head, { x: head.x, y: head.y + LAMP_H }, scene.map.scale / 1.5));
  const k = scene.map.scale;
  createVillager(scene, 'town-guitar', LOOK);
  const { x, y } = PLAYER_AT;
  const man = scene.add.sprite(x, y, 'town-guitar').setOrigin(0.5, FEET_Y / FRAME_H).setScale(k).setDepth(y).play('town-guitar-sit-down');
  // his guitar across his lap, strummed
  const u = k * 2;
  // (its body on his lap, to his right; its neck up across him to the left)
  const guitar = scene.add.graphics().setDepth(y + 1).setPosition(x + 2 * u, y - 6 * u);
  guitar.lineStyle(2.4 * u, 0x2e1d0c).lineBetween(0, 0, -8 * u, -6 * u);
  guitar.lineStyle(1.2 * u, 0x8a5a2a).lineBetween(0, 0, -8 * u, -6 * u);
  guitar.fillStyle(0x2e1d0c).fillRect(-9.5 * u, -7.5 * u, 2.6 * u, 2.6 * u);
  guitar.fillStyle(0x2e1d0c).fillEllipse(0, 0, 8 * u, 6.4 * u);
  guitar.fillStyle(0xc8803a).fillEllipse(0, 0, 6.4 * u, 4.8 * u);
  guitar.fillStyle(0x2e1d0c).fillCircle(-0.5 * u, -0.4 * u, 1.1 * u);
  scene.tweens.add({ targets: guitar, angle: 3, duration: 220, yoyo: true, repeat: -1 });
  // notes drifting up
  scene.time.addEvent({
    delay: 700, loop: true,
    callback: () => {
      const n = scene.add.text(x + (Math.random() - 0.3) * 20 * u, y - 18 * u, Math.random() < 0.5 ? '♪' : '♫', {
        fontFamily: 'serif', fontSize: `${Math.round(7 * u)}px`, color: '#fff0c0', stroke: '#2e1d0c', strokeThickness: Math.round(u),
      }).setOrigin(0.5).setDepth(5e4 + 2);
      scene.tweens.add({ targets: n, y: n.y - 22 * u, x: n.x + (Math.random() - 0.5) * 10 * u, alpha: 0, duration: 2200, onComplete: () => n.destroy() });
    },
  });
  scene.guitarist = { sprite: man, contains: (px, py) => man.getBounds().contains(px, py) };
}

// Tapping him: over to him, and a word between songs.
export function atGuitarist(scene) {
  scene.player.walkTo(BY_HIM.x, BY_HIM.y, () => scene.talk(async () => {
    scene.player.face('right');
    const cast = {
      jones: { get sprite() { return scene.player.sprite; }, name: { af: 'Johan', en: 'Jones' }, color: '#b8402e' },
      him: { sprite: scene.guitarist.sprite, name: NAME, color: '#8a5a2a' },
    };
    await converse(scene, cast, scene.follower ? [
      ['him', { af: 'Goeienaand, julle twee! Iets romanties vir die mooi paartjie?', en: 'Good evening, you two! Something romantic for the lovely couple?' }],
      ['jones', { af: 'Ja, asseblief!', en: 'Yes, please!' }],
    ] : [
      ['him', { af: 'Goeienaand, meneer! Lekker aand om buite te wees, nè?', en: "Good evening, sir! Lovely evening to be out, isn't it?" }],
    ]);
  }));
}
