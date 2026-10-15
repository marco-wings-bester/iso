import { ART_PX } from './constants.js';
import { grid, rect, outline, blit } from './pixelArt.js';

// Life on the farm: smoke from the farmhouse chimney, birds hopping about the
// trees (and now and then flying a loop), chickens pecking in the coop yard,
// butterflies over the flower beds, glints and ripples on the pond, clouds
// drifting by and the odd flock of birds crossing the sky. All pixel art at
// the map's scale (ART_PX image px per sprite pixel). Positions are map px.

const CHIMNEY = { x: 160, y: 181 };
const TREES = [
  // the apple tree by the farmhouse
  { perches: [[310, 138], [338, 122], [370, 128], [392, 160], [296, 170], [384, 204]], center: [342, 172], r: [62, 56] },
  // the top tree in the orchard
  { perches: [[598, 925], [625, 905], [655, 915], [668, 950], [592, 958]], center: [628, 940], r: [50, 42] },
];
const COOP_YARD = { x: 222, y: 730, w: 108, h: 22 };
const FLOWER_BEDS = [[450, 880, 60], [255, 1168, 40], [36, 410, 30], [540, 862, 30]];
const POND = { cx: 110, cy: 812, rx: 115, ry: 58, jetty: { x: 138, y: 788, w: 110, h: 80 } };
const ABOVE = 5000; // depth for things up in the air

// ── Sprites ───────────────────────────────────────────────────────────────

// Build a sprite sheet from paint functions (sprite px), outlined like the map.
function sheet(scene, key, w, h, frames, outlined = true) {
  if (scene.textures.exists(key)) return;
  const p = ART_PX;
  const fw = (w + 2) * p;
  const fh = (h + 2) * p;
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh);
  const ctx = tex.getContext();
  frames.forEach((paint, i) => {
    const g = grid(w + 2, h + 2);
    paint((x, y, ww, hh, c) => rect(g, x + 1, y + 1, ww, hh, c));
    blit(ctx, outlined ? outline(g) : g, i * fw, 0, p);
    tex.add(i, 0, i * fw, 0, fw, fh);
  });
  tex.refresh();
}

function anim(scene, key, sheetKey, frames, frameRate, repeat = -1) {
  if (!scene.anims.exists(key)) {
    scene.anims.create({ key, frames: frames.map(frame => ({ key: sheetKey, frame })), frameRate, repeat });
  }
}

function makeSprites(scene) {
  // A robin: brown back, orange breast. 0 perched, 1 pecking, 2–3 flying.
  const BR = '#8c5430', BRd = '#5e3820', OR = '#e8703a', BEAK = '#f0c040', LEG = '#c08040';
  sheet(scene, 'bird', 9, 6, [
    r => { r(0, 2, 2, 1, BRd); r(1, 2, 5, 2, BR); r(4, 2, 2, 2, OR); r(3, 0, 3, 2, BR); r(5, 1, 1, 1, '#1a1008'); r(6, 1, 1, 1, BEAK); r(3, 4, 1, 1, LEG); r(5, 4, 1, 1, LEG); },
    r => { r(0, 1, 2, 1, BRd); r(1, 2, 5, 2, BR); r(4, 2, 2, 2, OR); r(5, 1, 3, 2, BR); r(7, 2, 1, 1, '#1a1008'); r(8, 2, 1, 1, BEAK); r(3, 4, 1, 1, LEG); r(5, 4, 1, 1, LEG); },
    r => { r(0, 2, 1, 2, BRd); r(1, 2, 5, 2, BR); r(4, 3, 2, 1, OR); r(5, 1, 2, 2, BR); r(6, 1, 1, 1, '#1a1008'); r(7, 2, 1, 1, BEAK); r(2, 0, 3, 2, BRd); },
    r => { r(0, 2, 1, 2, BRd); r(1, 2, 5, 2, BR); r(4, 3, 2, 1, OR); r(5, 1, 2, 2, BR); r(6, 1, 1, 1, '#1a1008'); r(7, 2, 1, 1, BEAK); r(2, 4, 3, 2, BRd); },
  ]);
  anim(scene, 'bird-fly', 'bird', [2, 3], 14);
  anim(scene, 'bird-perch', 'bird', [0], 1);
  anim(scene, 'bird-peck', 'bird', [1, 0, 1, 0], 8, 0);

  // A chicken: 0–1 walking, 2 pecking.
  const W = '#f8f4ec', Wd = '#d8d0c4', COMB = '#d04c3a', Y = '#f0b030';
  const body = r => { r(0, 2, 2, 2, W); r(1, 3, 5, 3, W); r(1, 5, 5, 1, Wd); r(2, 4, 3, 1, Wd); };
  sheet(scene, 'chicken', 9, 7, [
    r => { body(r); r(5, 1, 2, 3, W); r(5, 0, 2, 1, COMB); r(6, 1, 1, 1, '#1a1008'); r(7, 2, 1, 1, Y); r(6, 3, 1, 1, COMB); r(3, 6, 1, 1, Y); r(5, 6, 1, 1, Y); },
    r => { body(r); r(5, 1, 2, 3, W); r(5, 0, 2, 1, COMB); r(6, 1, 1, 1, '#1a1008'); r(7, 2, 1, 1, Y); r(6, 3, 1, 1, COMB); r(2, 6, 1, 1, Y); r(4, 6, 1, 1, Y); },
    r => { body(r); r(6, 3, 2, 2, W); r(6, 2, 2, 1, COMB); r(7, 3, 1, 1, '#1a1008'); r(8, 4, 1, 1, Y); r(3, 6, 1, 1, Y); r(5, 6, 1, 1, Y); },
  ]);
  anim(scene, 'chicken-walk', 'chicken', [0, 1], 6);
  anim(scene, 'chicken-peck', 'chicken', [2, 0, 2, 0], 6, 0);

  // A butterfly (tinted per butterfly): wings open, then folded.
  sheet(scene, 'butterfly', 5, 3, [
    r => { r(0, 0, 2, 2, '#ffffff'); r(3, 0, 2, 2, '#ffffff'); r(0, 1, 1, 1, '#e0e0e0'); r(4, 1, 1, 1, '#e0e0e0'); r(2, 0, 1, 3, '#3a2a1a'); },
    r => { r(1, 0, 1, 2, '#ffffff'); r(3, 0, 1, 2, '#ffffff'); r(2, 0, 1, 3, '#3a2a1a'); },
  ]);
  anim(scene, 'butterfly-flap', 'butterfly', [0, 1], 10);

  // A distant bird crossing the sky: a little dark "v".
  sheet(scene, 'gull', 5, 2, [
    r => { r(0, 0, 1, 1, '#3a3a44'); r(1, 1, 1, 1, '#3a3a44'); r(2, 1, 1, 1, '#3a3a44'); r(3, 1, 1, 1, '#3a3a44'); r(4, 0, 1, 1, '#3a3a44'); },
    r => { r(0, 1, 1, 1, '#3a3a44'); r(1, 1, 1, 1, '#3a3a44'); r(2, 1, 1, 1, '#3a3a44'); r(3, 1, 1, 1, '#3a3a44'); r(4, 1, 1, 1, '#3a3a44'); r(2, 0, 1, 1, '#3a3a44'); },
  ], false);
  anim(scene, 'gull-flap', 'gull', [0, 1], 5);

  // A puff of chimney smoke and a sparkle on the water (no outline).
  sheet(scene, 'puff', 7, 7, [r => {
    r(2, 0, 3, 1, '#e8eaea'); r(1, 1, 5, 5, '#e8eaea'); r(0, 2, 7, 3, '#e8eaea'); r(2, 6, 3, 1, '#d4d8d8');
    r(1, 1, 3, 2, '#fafafa'); r(1, 3, 2, 1, '#fafafa'); r(5, 4, 1, 2, '#d4d8d8'); r(3, 5, 2, 1, '#d4d8d8');
  }], false);
  sheet(scene, 'sparkle', 3, 3, [r => { r(1, 0, 1, 3, '#ffffff'); r(0, 1, 3, 1, '#ffffff'); }], false);

  // A soft cloud, like the ones painted on the map.
  sheet(scene, 'cloud', 26, 9, [r => {
    r(6, 2, 12, 7, '#fbfdff'); r(2, 5, 22, 4, '#fbfdff'); r(9, 0, 7, 3, '#fbfdff'); r(16, 2, 6, 4, '#fbfdff');
    r(2, 8, 22, 1, '#dce8f4'); r(4, 7, 6, 1, '#dce8f4'); r(16, 7, 7, 1, '#dce8f4');
  }], false);
}

// ── Behaviours ────────────────────────────────────────────────────────────

// Per-frame callback for this run of the scene (Phaser keeps scene listeners
// across restarts, so drop it on shutdown).
function onUpdate(scene, fn) {
  scene.events.on('update', fn);
  scene.events.once('shutdown', () => scene.events.off('update', fn));
}

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function chimneySmoke(scene) {
  scene.time.addEvent({
    delay: 380,
    loop: true,
    callback: () => {
      const s = scene.add.image(CHIMNEY.x + rand(-2, 2), CHIMNEY.y, 'puff').setDepth(ABOVE).setScale(0.45).setAlpha(0.9);
      scene.tweens.add({
        targets: s,
        x: s.x - rand(10, 22),
        y: s.y - rand(60, 80),
        scale: rand(1.4, 1.9),
        alpha: 0,
        duration: rand(2800, 3600),
        ease: 'Sine.easeOut',
        onComplete: () => s.destroy(),
      });
    },
  });
}

// A bird that hops between perches on a tree, pecks, and sometimes flies a
// loop round the tree before landing again.
function treeBird(scene, tree) {
  const bird = scene.add.sprite(0, 0, 'bird', 0).setOrigin(0.5, 1).setDepth(ABOVE);
  let at = pick(tree.perches);
  bird.setPosition(at[0], at[1]);

  const flyTo = (to, duration, path, done) => {
    bird.play('bird-fly');
    const from = { x: bird.x, y: bird.y };
    const t = { v: 0 };
    scene.tweens.add({
      targets: t,
      v: 1,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const [x, y] = path(from, to, t.v);
        bird.setFlipX(x < bird.x);
        bird.setPosition(x, y);
      },
      onComplete: () => {
        bird.play('bird-perch');
        done();
      },
    });
  };

  const hop = (from, to, v) => [from.x + (to[0] - from.x) * v, from.y + (to[1] - from.y) * v - Math.sin(v * Math.PI) * 10];
  const loop = (from, to, v) => {
    // out round the tree on an ellipse, then in to the new perch
    const [cx, cy] = tree.center;
    const a0 = Math.atan2(from.y - cy, from.x - cx);
    const a = a0 + v * Math.PI * 2 * (tree.dir || 1);
    const swing = Math.sin(v * Math.PI);
    const ex = cx + Math.cos(a) * tree.r[0] * (1 + 0.5 * swing);
    const ey = cy + Math.sin(a) * tree.r[1] * (1 + 0.5 * swing) - swing * 18;
    const ease = v * v;
    return [ex + (to[0] - ex) * ease, ey + (to[1] - ey) * ease];
  };

  const next = () => {
    const wait = rand(1200, 3800);
    scene.time.delayedCall(wait * 0.5, () => {
      bird.setFlipX(Math.random() < 0.5);
      bird.play('bird-peck');
    });
    scene.time.delayedCall(wait, () => {
      const to = pick(tree.perches.filter(p => p !== at));
      at = to;
      if (Math.random() < 0.3) {
        tree.dir = Math.random() < 0.5 ? 1 : -1;
        flyTo(to, rand(2600, 3400), loop, next);
      } else {
        flyTo(to, rand(450, 750), hop, next);
      }
    });
  };
  bird.play('bird-perch');
  next();
}

function chicken(scene) {
  const { x, y, w, h } = COOP_YARD;
  const c = scene.add.sprite(rand(x, x + w), rand(y, y + h), 'chicken', 0).setOrigin(0.5, 1);
  c.setDepth(c.y);
  const next = () => {
    if (Math.random() < 0.55) {
      c.play('chicken-peck');
      scene.time.delayedCall(rand(700, 1600), next);
      return;
    }
    const tx = rand(x, x + w);
    const ty = rand(y, y + h);
    const dist = Math.hypot(tx - c.x, ty - c.y);
    c.setFlipX(tx < c.x);
    c.play('chicken-walk');
    scene.tweens.add({
      targets: c,
      x: tx,
      y: ty,
      duration: (dist / 14) * 1000,
      onUpdate: () => c.setDepth(c.y),
      onComplete: () => {
        c.stop().setFrame(0);
        scene.time.delayedCall(rand(300, 1200), next);
      },
    });
  };
  next();
}

function butterfly(scene, [cx, cy, r]) {
  const tints = [0xf8b040, 0xfff2a0, 0xf8f8f8, 0x9fd0ff, 0xf0a0d0];
  const b = scene.add.sprite(cx, cy, 'butterfly', 0).setDepth(ABOVE).setTint(pick(tints)).setScale(0.8);
  b.play({ key: 'butterfly-flap', startFrame: Math.floor(Math.random() * 2) });
  const seed = Math.random() * 100;
  onUpdate(scene, (time) => {
    const t = time / 1000 + seed;
    const x = cx + Math.sin(t * 0.7) * r * 0.8 + Math.sin(t * 2.3) * r * 0.2;
    const y = cy + Math.sin(t * 0.9 + 1) * r * 0.4 + Math.sin(t * 3.1) * 4;
    b.setFlipX(x < b.x);
    b.setPosition(x, y);
  });
}

function pondLife(scene) {
  const inWater = (x, y) => {
    if (((x - POND.cx) / POND.rx) ** 2 + ((y - POND.cy) / POND.ry) ** 2 > 1) return false;
    const j = POND.jetty;
    if (x > j.x && x < j.x + j.w && y > j.y && y < j.y + j.h) return false;
    const px = scene.textures.getPixel(Math.round(x), Math.round(y), 'map');
    return px && px.blue > px.red + 40 && px.blue > px.green;
  };
  const spot = () => {
    for (let i = 0; i < 20; i++) {
      const x = POND.cx + rand(-1, 1) * POND.rx;
      const y = POND.cy + rand(-1, 1) * POND.ry;
      if (inWater(x, y)) return [x, y];
    }
    return null;
  };

  scene.time.addEvent({
    delay: 240,
    loop: true,
    callback: () => {
      const p = spot();
      if (!p) return;
      const s = scene.add.image(p[0], p[1], 'sparkle').setDepth(1).setScale(0.6).setAlpha(0);
      scene.tweens.add({ targets: s, alpha: 0.95, scale: 0.9, duration: 260, yoyo: true, onComplete: () => s.destroy() });
    },
  });

  scene.time.addEvent({
    delay: 3400,
    loop: true,
    callback: () => {
      const p = spot();
      if (!p) return;
      const g = scene.add.graphics().setDepth(1);
      const ring = { r: 1, a: 0.6 };
      scene.tweens.add({
        targets: ring,
        r: 16,
        a: 0,
        duration: 1800,
        onUpdate: () => g.clear().lineStyle(1.5, 0xe8f6ff, ring.a).strokeEllipse(p[0], p[1], ring.r * 2, ring.r),
        onComplete: () => g.destroy(),
      });
    },
  });
}

function clouds(scene) {
  [[60, 30, 1], [420, 66, 0.8], [700, 22, 0.9]].forEach(([x0, y, s]) => {
    const c = scene.add.image(x0, y, 'cloud').setDepth(2).setScale(s).setAlpha(0.92);
    const speed = rand(3, 6); // map px per second
    onUpdate(scene, (_t, dt) => {
      c.x += (speed * dt) / 1000;
      if (c.x > 830) c.x = -70;
    });
  });
}

// Every so often a little flock crosses the sky.
function flocks(scene) {
  const fly = () => {
    const leftToRight = Math.random() < 0.5;
    const y = rand(40, 100);
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const g = scene.add.sprite(0, 0, 'gull', 0).setDepth(ABOVE).setScale(0.8);
      g.play({ key: 'gull-flap', startFrame: i % 2 });
      const dx = (leftToRight ? -1 : 1) * (i * 14 + rand(0, 6));
      const startX = (leftToRight ? -20 : 790) + dx;
      g.setPosition(startX, y + Math.abs(i - count / 2) * 7);
      scene.tweens.add({
        targets: g,
        x: startX + (leftToRight ? 860 : -860),
        y: g.y + rand(-20, 20),
        duration: rand(15000, 19000),
        onComplete: () => g.destroy(),
      });
    }
    scene.time.delayedCall(rand(14000, 26000), fly);
  };
  scene.time.delayedCall(rand(3000, 7000), fly);
}

export function createAmbient(scene) {
  makeSprites(scene);
  clouds(scene);
  chimneySmoke(scene);
  TREES.forEach(t => treeBird(scene, t));
  chicken(scene);
  chicken(scene);
  FLOWER_BEDS.forEach(bed => butterfly(scene, bed));
  pondLife(scene);
  flocks(scene);
}
