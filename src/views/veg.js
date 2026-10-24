import Phaser from 'phaser';
import { obj } from '../pixelArt.js';
import { hash, band, pixels, ellipse, limb, rgb, OUTLINE } from './art.js';
import { hasFlag, setFlag, getValue, setValue } from '../state.js';
import { line } from '../hints.js';

// Farmer Jones in the vegetable garden, looking down the rows of tomato
// plants: dark tilled earth, each plant tied to its stake, ripe red
// tomatoes hanging in the leaves, and his basket at his feet. On Saturday,
// for the tuxedo he rents from Faan in town ('tuxAsked', src/tailor.js),
// tapping a tomato picks it into the basket (`tomatoesPicked`); a basketful
// and he has Faan's tomatoes ('tomatoes'). Tapping anywhere else looks away.

const SOIL = [[58, 36, 22], [74, 48, 28], [94, 62, 36], [116, 80, 46]];
const LEAF = [[34, 74, 30], [52, 104, 40], [80, 140, 52], [116, 176, 72]];
const NEED = 6; // a basketful

// The plants (as parts of the view: where the stake meets the earth), the
// back row smaller; and on each, where its tomatoes hang.
const PLANTS = [
  { fx: 0.2, fy: 0.46, s: 0.75 }, { fx: 0.5, fy: 0.44, s: 0.75 }, { fx: 0.8, fy: 0.46, s: 0.75 },
  { fx: 0.3, fy: 0.84, s: 1 }, { fx: 0.7, fy: 0.84, s: 1 },
];
const HANG = [[-0.35, -0.55], [0.3, -0.75], [0.05, -0.3], [-0.2, -0.95]];

function geometry(w, h) {
  const k = Math.min(w, h) / 160;
  const plants = PLANTS.map((p, i) => {
    const r = 22 * k * p.s;
    const x = Math.round(w * p.fx);
    const y = Math.round(h * p.fy);
    return { ...p, i, x, y, r, top: y - 2.2 * r };
  });
  const tomatoes = plants.flatMap(p => HANG.slice(0, p.s < 1 ? 3 : 4).map(([dx, dy], j) => ({
    x: Math.round(p.x + dx * p.r * 1.2), y: Math.round(p.y - p.r * 1.1 + dy * p.r), s: p.s, plant: p.i, j,
  })));
  return { k, plants, tomatoes, basket: { x: Math.round(w * 0.1), y: Math.round(h - 8 * k) } };
}

function draw(ctx, w, h) {
  const { k, plants } = geometry(w, h);
  const far = Math.round(h * 0.14);
  // grass and the fence at the far end, then the tilled rows coming towards him
  pixels(ctx, w, h, (x, y) => {
    if (y < far) return band([[96, 150, 56], [120, 176, 64], [140, 192, 76]], y / far + (hash(x >> 1, y >> 1) - 0.5) * 0.4, x, y);
    const d = (y - far) / (h - far);
    const furrow = Math.sin((y - far) / (6 * k * (0.5 + d))) * 0.25;
    return band(SOIL, Math.max(0, Math.min(1, 0.25 + 0.4 * d + furrow + (hash(x >> 1, y >> 1) - 0.5) * 0.3)), x, y);
  });
  // the fence along the far end
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(0, far - 9 * k, w, 3 * k);
  ctx.fillStyle = '#a86a3c';
  ctx.fillRect(0, far - 9 * k + 1, w, k);
  for (let x = 4 * k; x < w; x += 22 * k) {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 1, far - 14 * k, 5 * k + 2, 15 * k);
    ctx.fillStyle = '#8c5838';
    ctx.fillRect(x, far - 14 * k + 1, 5 * k, 14 * k);
  }
  // the plants, back row first: a stake, and leaves round it
  plants.forEach((p) => {
    limb(ctx, p.x, p.y, p.x, p.top, 1.6 * k * p.s + 0.5, () => [168, 120, 70]);
    ellipse(ctx, p.x, p.y + 1, p.r * 0.9, p.r * 0.25, () => 'rgba(30, 18, 8, 0.4)');
    [[-0.5, -0.5, 0.65], [0.45, -0.7, 0.6], [0, -1.15, 0.7], [-0.3, -1.6, 0.55], [0.35, -1.5, 0.55], [0, -0.35, 0.6]].forEach(([dx, dy, rr], j) => {
      const cx = p.x + dx * p.r;
      const cy = p.y + dy * p.r;
      const R = rr * p.r;
      ellipse(ctx, cx, cy, R, R * 0.85, (u, v, x, y) => {
        if (u * u + v * v > 0.86) return OUTLINE;
        const t = 0.55 - 0.35 * v - 0.2 * u + (hash(x + j, y) - 0.5) * 0.4;
        return band(LEAF, Math.max(0, Math.min(1, t)), x, y);
      });
    });
  });
}

function texture(scene, key, w, h, paint) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h);
  paint(tex.getContext());
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

function animate(scene, w, h) {
  const { k, tomatoes, basket } = geometry(w, h);
  const tomato = texture(scene, 'pov-tomato', 10, 10, ctx => obj(ctx, 1, 2, 8, 7, (r) => {
    r(0, 1, 8, 5, '#d83a2a'); r(1, 0, 6, 7, '#d83a2a');
    r(1, 1, 2, 2, '#f87a5a'); r(5, 4, 2, 2, '#982a1e');
    r(2, 0, 4, 1, '#3f7228'); r(3, 0, 2, 1, '#5f9e38');
  }));
  const basketKey = texture(scene, 'pov-basket', 30, 18, ctx => obj(ctx, 1, 1, 28, 16, (r) => {
    r(2, 4, 24, 12, '#c88a52'); r(0, 4, 28, 3, '#e0a868');
    for (let x = 3; x < 26; x += 4) r(x, 7, 2, 9, '#a86a3c');
    r(4, 0, 2, 5, '#a86a3c'); r(22, 0, 2, 5, '#a86a3c'); r(4, 0, 20, 1, '#a86a3c');
  }));
  const picked = getValue('tomatoesPicked') ?? 0;
  const bs = 2.2 * k;
  scene.basket = scene.add.image(basket.x, basket.y, basketKey).setOrigin(0, 1).setScale(bs).setDepth(20);
  scene.inBasket = 0;
  scene.basketSpot = () => ({ x: basket.x + (8 + (scene.inBasket % 4) * 4) * bs, y: basket.y - (13 + Math.floor(scene.inBasket / 4) * 2) * bs });
  for (let i = 0; i < picked; i++) {
    const at = scene.basketSpot();
    scene.add.image(at.x, at.y, tomato).setScale(bs * 0.5).setDepth(21);
    scene.inBasket++;
  }
  scene.tomatoes = tomatoes.slice(picked).map((t) => {
    const img = scene.add.image(t.x, t.y, tomato).setOrigin(0.5, 0).setScale(k * 1.6 * t.s).setDepth(10);
    scene.tweens.add({ targets: img, angle: { from: -5, to: 5 }, duration: 1300 + Math.random() * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 800 });
    return img;
  });
  // a white butterfly over the plants
  const fly = scene.add.rectangle(w * 0.3, h * 0.3, 2 * k, 2 * k, 0xf8f8f0).setDepth(30);
  const wander = () => scene.tweens.add({
    targets: fly, x: w * (0.1 + Math.random() * 0.8), y: h * (0.15 + Math.random() * 0.5), duration: 1800, ease: 'Sine.easeInOut', onComplete: wander,
  });
  wander();
  scene.time.addEvent({ delay: 150, loop: true, callback: () => fly.setScale(fly.scaleX === 1 ? 0.4 : 1, 1) });
}

// Tapping a tomato: into the basket (once Faan wants them). Anything else
// looks away.
function tap(scene, x, y) {
  const img = scene.tomatoes.find(tm => tm.getBounds().contains(x, y));
  if (!img) return false;
  if (!hasFlag('tuxAsked') || hasFlag('tomatoes')) {
    scene.say(hasFlag('tomatoes')
      ? { af: 'Ek het genoeg tamaties vir Faan.', en: 'I have enough tomatoes for Faan.' }
      : { af: 'Lekker ryp tamaties. Hulle groei mooi vanjaar.', en: "Lovely ripe tomatoes. They're doing well this year." });
    return true;
  }
  scene.tomatoes = scene.tomatoes.filter(tm => tm !== img);
  scene.tweens.killTweensOf(img);
  const to = scene.basketSpot();
  scene.inBasket++;
  const s = scene.basket.scaleX * 0.5;
  scene.tweens.add({ targets: img, x: to.x, y: to.y, scale: s, angle: 0, duration: 450, ease: 'Quad.easeIn', onComplete: () => img.setOrigin(0.5).setDepth(21) });
  const picked = (getValue('tomatoesPicked') ?? 0) + 1;
  setValue('tomatoesPicked', picked);
  if (picked < NEED) return true;
  setFlag('tomatoes');
  scene.busy = true;
  scene.time.delayedCall(600, () => {
    scene.busy = false;
    scene.say({ af: '’n Mandjie vol rooi tamaties vir Faan!', en: 'A basket full of red tomatoes for Faan!' }, () => {
      const hint = hasFlag('faanHens') && line('tradeReady');
      if (hint) scene.say(hint, () => scene.close());
      else scene.close();
    });
  });
  return true;
}

export default { draw, animate, tap };
