import Phaser from 'phaser';
import { createVillager } from './CharacterSprite.js';
import { FRAME_H, FEET_Y, ART_PX } from './constants.js';
import { grid, outline, blit } from './pixelArt.js';
import { hasFlag, setFlag } from './state.js';
import { converse } from './dialog.js';
import { think } from './bubble.js';

// Steffi, at the river (RiverScene): ankle-deep in the shallows off the near
// sandbar, panning for gold, the pan swirling in her hands, a glint of gold
// in it now and then. Tapping her, Johan walks over, quite taken with her
// (hearts), and they talk: what's she doing, does she know anything about
// the town's dry fountain, and would she go out with him on Saturday night?
// ('metSteffi', 'dateSteffi').

const LOOK = {
  hair: 'long', shorts: true,
  palette: { S: '#f8d0b0', s: '#e0a888', B: '#6a4a2a', d: '#4a2a14', R: '#c8482a', r: '#8a2c18', C: '#e86a6a', c: '#c04a4a', O: '#4a7ab8', o: '#345a90' },
};
const AT = { x: 586, y: 1482 };       // where she stands, in the water
const BY_HER = { x: 632, y: 1474 };   // where Johan stands to talk to her
const rand = (a, b) => a + Math.random() * (b - a);

const HEART = ['.rr.rr.', 'rRRrRRr', 'rRRRRRr', '.rRRRr.', '..rRr..', '...r...'];

function heartTexture(scene) {
  if (scene.textures.exists('heart')) return;
  const g = grid(9, 8);
  HEART.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') g[y + 1][x + 1] = c === 'R' ? '#f05a7a' : '#d03a5a'; }));
  const tex = scene.textures.createCanvas('heart', 9 * ART_PX, 8 * ART_PX);
  blit(tex.getContext(), outline(g), 0, 0, ART_PX);
  tex.refresh();
}

// A few hearts floating up from over Johan's head.
function hearts(scene, who) {
  heartTexture(scene);
  for (let i = 0; i < 3; i++) {
    scene.time.delayedCall(i * 260, () => {
      const h = scene.add.image(who.x + rand(-20, 20), who.y - 130, 'heart').setScale(scene.map.scale * 0.8).setDepth(1e4);
      scene.tweens.add({ targets: h, y: h.y - 90, x: h.x + rand(-20, 20), alpha: 0, duration: 1600, ease: 'Sine.easeOut', onComplete: () => h.destroy() });
    });
  }
}

export function placeSteffi(scene) {
  const k = scene.map.scale;
  createVillager(scene, 'steffi', LOOK);
  const sprite = scene.add.sprite(AT.x, AT.y, 'steffi').setOrigin(0.5, FEET_Y / FRAME_H).setScale(k).setDepth(AT.y).play('steffi-idle-down');
  // the water round her ankles
  const ring = () => {
    const r = scene.add.ellipse(AT.x, AT.y - 2, 40, 12).setStrokeStyle(3, 0xeaf6ff, 0.8).setDepth(AT.y + 1);
    scene.tweens.add({ targets: r, scaleX: 2, scaleY: 2, alpha: 0, duration: 1400, onComplete: () => r.destroy() });
  };
  scene.time.addEvent({ delay: 900, loop: true, callback: ring });
  // her pan, swirled about, and now and then a glint of gold in it
  const pan = scene.add.graphics().setDepth(AT.y + 2);
  pan.fillStyle(0x2e1d0c).fillEllipse(0, 0, 50, 18);
  pan.fillStyle(0x6a6e78).fillEllipse(0, 0, 44, 13);
  pan.fillStyle(0x8a8478).fillEllipse(0, 1, 30, 7);
  pan.setPosition(AT.x, AT.y - 34);
  const swirl = scene.tweens.add({ targets: pan, angle: { from: -10, to: 10 }, x: { from: AT.x - 4, to: AT.x + 4 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const glint = scene.time.addEvent({
    delay: 2600, loop: true,
    callback: () => {
      const g = scene.add.star(pan.x + rand(-10, 10), pan.y - 2, 4, 2, 7, 0xffe060).setDepth(AT.y + 3);
      scene.tweens.add({ targets: g, scale: 1.8, alpha: 0, angle: 90, duration: 700, onComplete: () => g.destroy() });
    },
  });
  return { sprite, pan, swirl, glint, name: { af: 'Steffi', en: 'Steffi' } };
}

export function isSteffi(steffi, x, y) {
  return steffi.sprite.getBounds().contains(x, y);
}

// Over to her; she stops panning and turns to him, and they talk.
export function talkToSteffi(scene, steffi) {
  scene.player.walkTo(BY_HER.x, BY_HER.y, () => chat(scene, steffi));
}

async function chat(scene, steffi) {
  const { sprite } = steffi;
  const cast = {
    jones: { get sprite() { return scene.player.sprite; }, name: { af: 'Johan', en: 'Jones' }, color: '#b8402e' },
    steffi: { sprite, name: steffi.name, color: '#c04a7a' },
  };
  scene.player.face('left');
  steffi.swirl.pause();
  sprite.play('steffi-idle-right');
  await scene.talk(async () => {
    if (hasFlag('dateSteffi')) {
      await converse(scene, cast, [['steffi', { af: 'Sien jou Saterdagaand, Johan!', en: 'See you on Saturday night, Jones!' }]]);
      return;
    }
    hearts(scene, scene.player.sprite);
    await think(scene, scene.player.sprite, { af: 'Jinne… wie is sý? Sy is pragtig!', en: 'Goodness… who is she? She is beautiful!' });
    await converse(scene, cast, [
      ['jones', { af: 'Ehm… goeiemiddag! Ek is Johan. Ek boer net hier anderkant die kruispad.', en: "Um… good afternoon! I'm Jones. I farm just over past the crossroads." }],
      ['steffi', { af: 'Hallo, Johan! Ek is Steffi.', en: "Hello, Jones! I'm Steffi." }],
      ['jones', { af: 'Steffi… wat ’n mooi naam. En wat doen jy hier in die rivier?', en: 'Steffi… what a lovely name. And what are you doing here in the river?' }],
      ['steffi', { af: 'Ek pan vir goud! Kyk, daar blink ’n paar korreltjies in die pan.', en: "I'm panning for gold! Look, there are a few little grains shining in the pan." }],
      () => hearts(scene, scene.player.sprite),
      ['jones', { af: 'Sjoe! Sê, weet jy dalk iets van die fontein in die dorp? Hy het opgedroog.', en: "Wow! Say, do you happen to know anything about the fountain in town? It's dried up." }],
      ['steffi', { af: 'Die fontein? Nee, jammer, ek weet nie veel daarvan nie. Ek is meestal hier by die rivier.', en: "The fountain? No, sorry, I don't know much about it. I'm mostly here by the river." }],
      ['jones', { af: 'Ag, toe maar. Steffi… sal jy Saterdagaand saam met my uitgaan?', en: 'Oh, never mind. Steffi… would you go out with me on Saturday night?' }],
      ['steffi', { af: 'Hmm… ja, dit sal lekker wees, Johan!', en: "Hmm… yes, that would be lovely, Jones!" }],
      () => { setFlag('metSteffi'); setFlag('dateSteffi'); hearts(scene, scene.player.sprite); },
    ]);
    await think(scene, scene.player.sprite, { af: 'Sy het ja gesê!', en: 'She said yes!' });
  });
  sprite.play('steffi-idle-down');
  steffi.swirl.resume();
}
