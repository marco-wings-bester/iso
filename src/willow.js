import { ART_PX } from './constants.js';
import { grid, outline, blit, rng } from './pixelArt.js';
import { hasFlag, setFlag } from './state.js';
import { think } from './bubble.js';
import { line } from './hints.js';

// The willow tree at the river (RiverScene), on the grass past the near
// sandbar: a gnarled trunk, its long fronds hanging down, swaying. Once
// Johan's read Derik's book on finding water (src/derikHouse.js) and has the
// saw from his tool shed ('saw'), he cuts a forked branch off it: the stick
// to find the fountain's water with ('willowStick').

const BASE = { x: 1110, y: 1560 };  // the foot of its trunk, in picture px
const STAND = { x: 1040, y: 1600 }; // where Johan stands to cut it
const W = 52;
const H = 66;
const LEAF = ['#4f8a2a', '#64a032', '#7ab840', '#98cc58'];

function willowTexture(scene) {
  if (scene.textures.exists('willow')) return;
  const R = rng(11);
  const g = grid(W + 2, H + 2);
  const put = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y + 1][x + 1] = c; };
  // the trunk, splitting into two limbs, roots spreading at the foot
  for (let y = 28; y < H; y++) {
    const w = y > H - 4 ? 9 + (y - (H - 4)) * 2 : 6;
    for (let x = 26 - w / 2; x < 26 + w / 2; x++) put(Math.round(x), y, x < 25 ? '#8a6040' : '#6a4630');
  }
  for (let i = 0; i < 12; i++) { put(23 - i, 30 - i, '#6a4630'); put(24 - i, 30 - i, '#8a6040'); put(28 + i, 30 - i, '#6a4630'); }
  // the crown: a dome of leaves
  for (let y = 2; y < 30; y++) {
    for (let x = 0; x < W; x++) {
      const d = ((x - 26) / 25) ** 2 + ((y - 20) / 18) ** 2;
      if (d < 1 && R() < 0.92) put(x, y, LEAF[Math.min(3, Math.floor((1 - y / 30) * 3 + R() * 1.4))]);
    }
  }
  // the fronds hanging down from it, long and thin
  for (let x = 1; x < W - 1; x += 2) {
    if (x > 21 && x < 31 && R() < 0.6) continue; // (the trunk shows between them)
    const top = 18 + Math.round(Math.abs(x - 26) * 0.2);
    const len = 22 + Math.round(R() * 18);
    for (let y = top; y < Math.min(H - 6, top + len); y++) put(x, y, LEAF[(y + x) % 3 === 0 ? 2 : 1]);
  }
  const tex = scene.textures.createCanvas('willow', (W + 2) * ART_PX, (H + 2) * ART_PX);
  blit(tex.getContext(), outline(g), 0, 0, ART_PX);
  tex.refresh();
}

export function placeWillow(scene) {
  willowTexture(scene);
  const k = scene.map.scale;
  const tree = scene.add.image(BASE.x, BASE.y + 4 * k, 'willow').setOrigin(0.5, 1).setScale(k * 1.4).setDepth(BASE.y);
  // swaying in the breeze
  scene.tweens.add({ targets: tree, angle: { from: -0.8, to: 0.8 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return tree;
}

export function isWillow(tree, x, y) {
  return tree.getBounds().contains(x, y);
}

// Over to it: without the saw, a look; with it (and knowing why), a forked
// branch sawn off.
export function atWillow(scene) {
  scene.player.walkTo(STAND.x, STAND.y, () => cut(scene));
}

async function cut(scene) {
  const { player } = scene;
  player.face('right');
  if (hasFlag('willowStick')) {
    think(scene, player.sprite, { af: 'Ek het al my wilgerstok.', en: "I've got my willow stick already." });
    return;
  }
  if (!hasFlag('readDowsing')) {
    think(scene, player.sprite, { af: '’n Wilgerboom. Hoe mooi hang sy takke.', en: 'A willow tree. How lovely its branches hang.' });
    return;
  }
  if (!hasFlag('saw')) {
    think(scene, player.sprite, line('willowNoSaw'));
    return;
  }
  await scene.talk(async () => {
    // saw, saw, saw: sawdust flying, and down comes the branch
    for (let i = 0; i < 6; i++) {
      await new Promise(r => scene.tweens.add({ targets: player.sprite, x: player.x + 4, duration: 140, yoyo: true, onComplete: r }));
      const dust = scene.add.rectangle(player.x + 50, player.y - 60, 6, 6, 0xe8c890).setDepth(1e4);
      scene.tweens.add({ targets: dust, y: dust.y + 50, x: dust.x + (Math.random() - 0.5) * 30, alpha: 0, duration: 600, onComplete: () => dust.destroy() });
    }
    setFlag('willowStick');
    await think(scene, player.sprite, line('willowStick'));
  });
}
