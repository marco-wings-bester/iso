import Phaser from 'phaser';
import { grid, outline, blit } from '../pixelArt.js';
import { hash, band, pixels, rgb } from './art.js';
import { hasFlag, setFlag, getValue, setValue } from '../state.js';
import { line } from '../hints.js';

// Inside the hen house on the farm: a plank wall with a little window, the
// sun slanting in, a row of nest boxes with hens sitting in them, and more
// hens pecking about in the straw. Tapping a hen: she clucks and hops. Once
// Derik has asked for meat for his braai ('needMeat', src/derik.js), with the
// knife from the tool shed ('knife') Johan takes two of them for it (`hens`,
// then 'chickens'); without it, he can't. On Saturday, for the tuxedo he
// rents from Faan in town ('tuxAsked', src/tailor.js), he catches two of
// them, alive, to take him (`faanCaught`, then 'faanHens'). Tapping anywhere
// else looks away.

const WALL = [[96, 60, 36], [122, 80, 48], [148, 102, 62], [172, 124, 78]];
const STRAW = [[150, 112, 48], [184, 142, 64], [214, 176, 86], [236, 204, 118]];
const SEAM = [62, 38, 22];
const NEED = 2; // hens for the braai (and for Faan)

// The hens: three in the nest boxes, three about the floor (fx, fy: where
// her feet are, as parts of the view; nest: sitting, no legs).
const HENS = [
  { fx: 0.24, fy: 0.42, nest: true }, { fx: 0.5, fy: 0.42, nest: true }, { fx: 0.76, fy: 0.42, nest: true },
  { fx: 0.3, fy: 0.72 }, { fx: 0.68, fy: 0.78 }, { fx: 0.45, fy: 0.9, flip: true },
];

// A hen side on, facing left: 12×11 sprite px.
const HEN = [
  '..r.........',
  '.rrr......w.',
  '.WWW.....wW.',
  'yWkW....wWW.',
  '.rWWWWWWWWW.',
  '.rWWWWwwWWW.',
  '..WWWwwwWWW.',
  '...WWWWWWW..',
  '....WWWWW...',
  '.....o.o....',
  '....oo.oo...',
];
const HEN_COLOURS = { W: '#f6eedc', w: '#d8c8a8', r: '#d04c3a', y: '#f0b030', k: '#2e1d0c', o: '#e08a30' };

function geometry(w, h) {
  const k = Math.min(w, h) / 160;
  return {
    k,
    shelf: Math.round(h * 0.44), // the top of the nest boxes' front
    floor: Math.round(h * 0.52),
    window: { x: Math.round(w * 0.08), y: Math.round(h * 0.08), w: Math.round(30 * k), h: Math.round(22 * k) },
    hens: HENS.map((s, i) => ({ ...s, i, x: Math.round(w * s.fx), y: Math.round(h * s.fy) })),
  };
}

function draw(ctx, w, h) {
  const { k, shelf, floor, window: win } = geometry(w, h);
  const plank = Math.max(8, Math.round(12 * k));
  pixels(ctx, w, h, (x, y) => {
    if (y < floor) {
      // the back wall: upright planks, darker at the seams and up high
      const p = Math.floor(x / plank);
      if (x % plank === 0) return SEAM;
      const t = 0.35 + 0.5 * (y / floor) + (hash(p, 3) - 0.5) * 0.25 + (hash(p, Math.floor(y / (4 * k))) - 0.5) * 0.06;
      return band(WALL, Math.min(1, t), x, y);
    }
    // straw over the floor, lighter nearer
    const t = 0.3 + 0.6 * ((y - floor) / (h - floor)) + (hash(x >> 1, y >> 1) - 0.5) * 0.5;
    return band(STRAW, Math.max(0, Math.min(1, t)), x, y);
  });

  // the window, and the sun slanting in from it onto the floor
  ctx.fillStyle = rgb(SEAM);
  ctx.fillRect(win.x - k, win.y - k, win.w + 2 * k, win.h + 2 * k);
  ctx.fillStyle = '#bfe4f4';
  ctx.fillRect(win.x, win.y, win.w, win.h);
  ctx.fillStyle = '#e8f6fc';
  ctx.fillRect(win.x + 2 * k, win.y + 2 * k, win.w / 2 - 3 * k, win.h / 2 - 3 * k);
  ctx.fillStyle = rgb(SEAM);
  ctx.fillRect(win.x + win.w / 2 - k / 2, win.y, k, win.h);
  ctx.fillRect(win.x, win.y + win.h / 2 - k / 2, win.w, k);
  ctx.fillStyle = 'rgba(255, 236, 170, 0.16)';
  ctx.beginPath();
  ctx.moveTo(win.x, win.y + win.h);
  ctx.lineTo(win.x + win.w, win.y + win.h);
  ctx.lineTo(w * 0.75, h);
  ctx.lineTo(w * 0.2, h);
  ctx.closePath();
  ctx.fill();

  // the nest boxes along the back wall: a shelf, three boxes of straw
  const top = Math.round(shelf - 16 * k);
  ctx.fillStyle = rgb(SEAM);
  ctx.fillRect(0, top - k, w, shelf - top + 11 * k);
  [0.24, 0.5, 0.76].forEach((fx) => {
    const bw = Math.round(w * 0.22);
    const bx = Math.round(w * fx - bw / 2);
    ctx.fillStyle = '#3e2414';
    ctx.fillRect(bx, top, bw, shelf - top);
    ctx.fillStyle = rgb(STRAW[2]);
    ctx.fillRect(bx + k, shelf - 5 * k, bw - 2 * k, 5 * k);
  });
  ctx.fillStyle = rgb(WALL[2]);
  ctx.fillRect(0, shelf, w, 8 * k);
  ctx.fillStyle = rgb(WALL[3]);
  ctx.fillRect(0, shelf, w, k);
}

function henTexture(scene, key, legs) {
  if (scene.textures.exists(key)) return key;
  const rows = legs ? HEN : HEN.slice(0, 9);
  const g = grid(14, rows.length + 2);
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') g[y + 1][x + 1] = HEN_COLOURS[c]; }));
  const tex = scene.textures.createCanvas(key, 14, rows.length + 2);
  blit(tex.getContext(), outline(g), 0, 0);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

function animate(scene, w, h) {
  const { k, hens } = geometry(w, h);
  const taken = (getValue('hens') ?? 0) + (getValue('faanCaught') ?? 0);
  const standing = henTexture(scene, 'pov-hen', true);
  const sitting = henTexture(scene, 'pov-hen-nest', false);
  // the ones taken for the braai are gone (floor ones first)
  const left = hens.filter(hn => !hn.nest).slice(taken).concat(hens.filter(hn => hn.nest));
  scene.hens = left.map((hn) => {
    const img = scene.add.image(hn.x, hn.y, hn.nest ? sitting : standing).setOrigin(0.5, 1).setScale(k * (hn.nest ? 1.1 : 1.4)).setDepth(5 + hn.fy).setFlipX(!!hn.flip);
    // sitting ones settle, the others peck now and then
    if (hn.nest) scene.tweens.add({ targets: img, scaleY: img.scaleY * 0.94, duration: 1200 + hn.i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    else {
      scene.time.addEvent({
        delay: 1400 + hn.i * 330, loop: true,
        callback: () => scene.tweens.add({ targets: img, angle: img.flipX ? 25 : -25, duration: 120, yoyo: true, repeat: 1 }),
      });
    }
    return { ...hn, img };
  });
}

function feathers(scene, x, y, k) {
  for (let i = 0; i < 12; i++) {
    const f = scene.add.rectangle(x, y, 2 * k, k, i % 3 ? 0xf6eedc : 0xd8c8a8).setDepth(9);
    scene.tweens.add({
      targets: f, x: x + (Math.random() - 0.5) * 50 * k, y: y + (Math.random() - 0.9) * 30 * k, angle: Math.random() * 360, alpha: 0,
      duration: 900 + Math.random() * 500, onComplete: () => f.destroy(),
    });
  }
}

// Tapping a hen: for the braai (with the knife), or she hops. Anything else
// looks away.
function tap(scene, x, y) {
  const { k } = geometry(scene.pov.w, scene.pov.h);
  const hen = scene.hens.find(hn => hn.img.getBounds().contains(x, y));
  if (!hen) return false;
  const hop = () => scene.tweens.add({ targets: hen.img, y: hen.y - 4 * k, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
  if (hasFlag('tuxAsked') && !hasFlag('faanHens')) {
    catchHen(scene, hen, k);
    return true;
  }
  if (!hasFlag('needMeat') || hasFlag('chickens')) {
    hop();
    return true;
  }
  if (!hasFlag('knife')) {
    hop();
    scene.say(line('coopNoKnife'));
    return true;
  }
  feathers(scene, hen.img.x, hen.img.y - 6 * k, k);
  hen.img.destroy();
  scene.hens = scene.hens.filter(hn => hn !== hen);
  const taken = (getValue('hens') ?? 0) + 1;
  setValue('hens', taken);
  if (taken < NEED) {
    scene.say({ af: 'Een hoender vir die braai… nog een.', en: 'One chicken for the braai… one more.' });
    return true;
  }
  setFlag('chickens');
  scene.busy = true;
  scene.time.delayedCall(500, () => {
    scene.busy = false;
    scene.say(line('chickens'), () => scene.close());
  });
  return true;
}

// One for Faan: she flaps, and he has her under his arm (gone from view).
function catchHen(scene, hen, k) {
  scene.hens = scene.hens.filter(hn => hn !== hen);
  feathers(scene, hen.img.x, hen.img.y - 6 * k, k);
  scene.tweens.add({ targets: hen.img, y: scene.pov.h + 20 * k, angle: 30, duration: 400, ease: 'Quad.easeIn', onComplete: () => hen.img.destroy() });
  const caught = (getValue('faanCaught') ?? 0) + 1;
  setValue('faanCaught', caught);
  if (caught < NEED) {
    scene.say({ af: 'Gevang! Een hoender vir Faan… nog een.', en: 'Caught her! One hen for Faan… one more.' });
    return;
  }
  setFlag('faanHens');
  scene.busy = true;
  scene.time.delayedCall(500, () => {
    scene.busy = false;
    scene.say({ af: 'Twee mooi vet hoenders vir Faan!', en: 'Two nice plump hens for Faan!' }, () => {
      const hint = hasFlag('tomatoes') && line('tradeReady');
      if (hint) scene.say(hint, () => scene.close());
      else scene.close();
    });
  });
}

export default { draw, animate, tap };
