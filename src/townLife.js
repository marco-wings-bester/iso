import { createVillager } from './CharacterSprite.js';
import { FRAME_H, FEET_Y, ART_PX } from './constants.js';
import { grid, outline, blit } from './pixelArt.js';
import { walkSprite } from './bob.js';

// Life in the town (TownScene), in picture px: people at the restaurant's
// and the cafe's tables, a waiter going between them; now and then the door
// of the house up from the square opens and someone comes out to check the
// mailbox; pigeons pecking about the square (they fly off when Johan comes
// near, and come back later); and two cats, one dozing by a doorstep, one
// wandering along the path past the fountain.

const rand = (a, b) => a + Math.random() * (b - a);
const S = { S: '#f8c8a0', s: '#d89870' };
const TAN = { S: '#e8b080', s: '#c08458' };
const SHOES = { B: '#4a2a14', d: '#2e1a0c' };

// Folk sitting at the tables (on the chairs in the picture), facing the table.
const SITTERS = [
  { key: 'town-anna', at: { x: 1012, y: 1228 }, face: 'left', look: { hair: 'long', skirt: true, palette: { ...S, ...SHOES, R: '#e0b060', r: '#b08840', C: '#7ab0d8', c: '#5a8ab0', O: '#e8e0d0', o: '#c8bca8' } } },
  { key: 'town-gert', at: { x: 1182, y: 1334 }, face: 'right', look: { hair: 'short', palette: { ...TAN, ...SHOES, R: '#3a2414', r: '#24160c', C: '#d8a040', c: '#b07c28', O: '#4a5a78', o: '#344058' } } },
  { key: 'town-mina', at: { x: 1238, y: 1340 }, face: 'left', look: { hair: 'bob', skirt: true, palette: { ...S, ...SHOES, R: '#8a3a28', r: '#5e2418', C: '#e8a0b0', c: '#c07888', O: '#5a8ac8', o: '#3e6698' } } },
  { key: 'town-oom', at: { x: 1214, y: 784 }, face: 'down', look: { hair: 'hat', palette: { ...TAN, ...SHOES, H: '#5a6a3a', h: '#3e4a28', j: '#3a4424', b: '#2e3a1e', R: '#c8c8c8', r: '#a0a0a0', C: '#9a6a4a', c: '#7a5038', O: '#5a5a60', o: '#3e3e44' } } },
  { key: 'town-lien', at: { x: 1292, y: 818 }, face: 'right', look: { hair: 'long', skirt: true, palette: { ...S, ...SHOES, R: '#5e3a22', r: '#3e2414', C: '#98c878', c: '#709c58', O: '#e8d8b8', o: '#c8b898' } } },
];
// The waiter: white shirt, black trousers; from the restaurant door round
// the tables and back.
const WAITER = { key: 'town-waiter', look: { hair: 'short', palette: { ...S, ...SHOES, R: '#2e2018', r: '#1a120c', C: '#f8f4ec', c: '#d8d0c0', O: '#2e2e34', o: '#1e1e24' } } };
const WAITER_ROUTES = [
  [{ x: 1056, y: 1244 }, { x: 1110, y: 1290 }, { x: 1160, y: 1300 }],
  [{ x: 1056, y: 1244 }, { x: 1150, y: 1262 }, { x: 1300, y: 1300 }],
  [{ x: 1056, y: 1244 }, { x: 1000, y: 1250 }],
];
// The house up from the square: its door, the mailbox on its post, and the
// one who checks it.
const DOOR = { x: 738, y: 978, w: 28, h: 70 };
const MAILBOX = { x: 662, y: 1080 };
const NEIGHBOUR = { key: 'town-neighbour', look: { hair: 'bob', skirt: true, palette: { ...S, ...SHOES, R: '#c8c8c8', r: '#a0a0a0', C: '#b878b8', c: '#905890', O: '#5a4a6a', o: '#3e3448' } } };

function person(scene, key, look) {
  createVillager(scene, key, look);
  return scene.add.sprite(0, 0, key).setOrigin(0.5, FEET_Y / FRAME_H).setScale(scene.map.scale);
}

// ── Little pixel sprites (cats, pigeons), drawn once at the map's resolution ──

function sprite(scene, key, rows, colours) {
  if (scene.textures.exists(key)) return key;
  const w = rows[0].length;
  const g = grid(w + 2, rows.length + 2);
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') g[y + 1][x + 1] = colours[c]; }));
  const tex = scene.textures.createCanvas(key, (w + 2) * ART_PX, (rows.length + 2) * ART_PX);
  blit(tex.getContext(), outline(g), 0, 0, ART_PX);
  tex.refresh();
  return key;
}

// A cat side on, facing left: walking (two steps) and sitting (tail two ways).
const CAT = {
  walk0: ['.e.e.........', '.eee........t', 'eyeye.......t', 'eeeebbbbbbbt.', '.eebbbbbbbb..', '..bbbbbbbbb..', '..l.l...l.l..', '..l.l...l.l..'],
  walk1: ['.e.e.........', '.eee.........', 'eyeye.......t', 'eeeebbbbbbbbt', '.eebbbbbbbb..', '..bbbbbbbbb..', '...l.l..l.l..', '..l...l...l..'],
  sit0: ['.e.e.....', '.eee.....', 'eyeye....', 'eeeeb....', '.ebbbb...', '.bbbbbb..', '.bbbbbbt.', '.bbbbbb.t', '.ll.bb..t'],
  sit1: ['.e.e.....', '.eee.....', 'eyeye....', 'eeeeb....', '.ebbbb...', '.bbbbbb..', '.bbbbbb..', '.bbbbbbtt', '.ll.bb...'],
  nap: ['.e.e......', '.eee.bbbb.', 'eeeebbbbbb', 'eeebbbbbbt', '.bbbbbbbtt'],
};

function catTextures(scene, name, colours) {
  const keys = {};
  Object.entries(CAT).forEach(([k, rows]) => { keys[k] = sprite(scene, `cat-${name}-${k}`, rows, colours); });
  return keys;
}

const PIGEON = {
  stand: ['.hh.....', 'bhhh....', '.nggggg.', '..ggwwwt', '..gggwt.', '...f.f..'],
  fly: ['..w...w.', '.hhwwww.', 'bhhgggg.', '.nggwwwt', '..ggg.t.', '........'],
};
const PIGEON_COLOURS = { h: '#8a92a0', b: '#e09040', n: '#5a9a7a', g: '#a8b0bc', w: '#7a8290', t: '#4a505c', f: '#d87a5a' };

export function animateTown(scene) {
  const k = scene.map.scale;

  // folk at the tables, breathing, now and then looking about
  SITTERS.forEach((s) => {
    const p = person(scene, s.key, s.look).setPosition(s.at.x, s.at.y).setDepth(s.at.y).play(`${s.key}-sit-${s.face}`);
    scene.tweens.add({ targets: p, scaleY: k * 1.02, duration: rand(2200, 3000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  });

  // the waiter, out of the restaurant door, round a table, and back in
  const waiter = person(scene, WAITER.key, WAITER.look).setVisible(false);
  const serve = () => scene.time.delayedCall(rand(2500, 6000), () => {
    const route = WAITER_ROUTES[Math.floor(Math.random() * WAITER_ROUTES.length)].map(p => ({ ...p }));
    const [start, ...out] = route;
    waiter.setPosition(start.x, start.y).setDepth(start.y).setVisible(true);
    walkSprite(scene, waiter, WAITER.key, out, 70, () => {
      waiter.play(`${WAITER.key}-idle-${waiter.facing}`);
      scene.time.delayedCall(rand(1500, 3000), () => {
        walkSprite(scene, waiter, WAITER.key, [...out].reverse().slice(1).concat([start]), 70, () => {
          waiter.setVisible(false);
          serve();
        });
      });
    });
  });
  serve();

  // the neighbour checking the mail: the door opens, out she comes, down to
  // the mailbox, a letter, back in, and the door shuts
  const door = scene.add.graphics().setDepth(DOOR.y + DOOR.h - 2).setVisible(false);
  door.fillStyle(0x24160c).fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  door.fillStyle(0x5a7aa0).fillRect(DOOR.x - 6, DOOR.y + 2, 6, DOOR.h - 2);
  const neighbour = person(scene, NEIGHBOUR.key, NEIGHBOUR.look).setVisible(false);
  const letter = scene.add.rectangle(0, 0, 14, 9, 0xfffaf0).setStrokeStyle(2, 0x2e1d0c).setVisible(false);
  const step = { x: DOOR.x + DOOR.w / 2, y: DOOR.y + DOOR.h + 2 };
  const mail = () => scene.time.delayedCall(rand(9000, 18000), () => {
    door.setVisible(true);
    neighbour.setPosition(step.x, step.y).setDepth(step.y).setVisible(true).play(`${NEIGHBOUR.key}-idle-down`);
    scene.time.delayedCall(700, () => walkSprite(scene, neighbour, NEIGHBOUR.key, [{ x: 720, y: 1066 }, { ...MAILBOX }], 55, () => {
      neighbour.play(`${NEIGHBOUR.key}-idle-left`);
      scene.time.delayedCall(1300, () => {
        const got = Math.random() < 0.6;
        if (got) letter.setPosition(MAILBOX.x - 12, MAILBOX.y - 40).setDepth(MAILBOX.y + 1).setVisible(true);
        const follow = () => letter.setPosition(neighbour.x - 10, neighbour.y - 40).setDepth(neighbour.depth + 1);
        if (got) {
          scene.events.on('update', follow);
          scene.events.once('shutdown', () => scene.events.off('update', follow));
        }
        scene.time.delayedCall(900, () => walkSprite(scene, neighbour, NEIGHBOUR.key, [{ x: 720, y: 1066 }, { ...step }], 55, () => {
          scene.events.off('update', follow);
          letter.setVisible(false);
          neighbour.play(`${NEIGHBOUR.key}-idle-up`);
          scene.time.delayedCall(300, () => {
            neighbour.setVisible(false);
            door.setVisible(false);
            mail();
          });
        }));
      });
    }));
  });
  mail();

  // pigeons about the square, pecking; off they fly when Johan comes near
  const stand = sprite(scene, 'pigeon-stand', PIGEON.stand, PIGEON_COLOURS);
  const fly = sprite(scene, 'pigeon-fly', PIGEON.fly, PIGEON_COLOURS);
  const spots = [{ x: 600, y: 1492 }, { x: 640, y: 1502 }, { x: 676, y: 1488 }, { x: 830, y: 1497 }, { x: 866, y: 1486 }, { x: 900, y: 1500 }];
  const pigeons = spots.map((at, i) => {
    const p = scene.add.image(at.x, at.y, stand).setOrigin(0.5, 1).setScale(k * 0.8).setDepth(at.y).setFlipX(i % 2 === 1);
    const peck = () => scene.time.delayedCall(rand(600, 2600), () => {
      if (p.flying) return;
      if (Math.random() < 0.3) p.setFlipX(!p.flipX);
      else scene.tweens.add({ targets: p, angle: p.flipX ? 30 : -30, duration: 110, yoyo: true, repeat: 1 });
      peck();
    });
    peck();
    return { p, at, peck };
  });
  let away = false;
  // (off again when the town's left: the listener would outlive these pigeons)
  const scare = () => {
    if (away || !scene.player) return;
    const { x, y } = scene.player;
    if (!pigeons.some(({ at }) => Math.hypot(at.x - x, at.y - y) < 140)) return;
    away = true;
    pigeons.forEach(({ p, at }) => {
      p.flying = true;
      p.setTexture(fly).setAngle(0);
      const dir = at.x < x ? -1 : 1;
      p.setFlipX(dir > 0);
      const flap = scene.time.addEvent({ delay: 120, loop: true, callback: () => p.setTexture(p.texture.key === fly ? stand : fly) });
      scene.tweens.add({
        targets: p, x: at.x + dir * rand(500, 800), y: at.y - rand(600, 900), duration: rand(1400, 2000), ease: 'Quad.easeIn',
        onComplete: () => { flap.remove(); p.setVisible(false); },
      });
    });
    // back a while later, landing where they were
    scene.time.delayedCall(rand(12000, 18000), () => {
      pigeons.forEach(({ p, at, peck }, i) => {
        const flap = scene.time.addEvent({ delay: 120, loop: true, callback: () => p.setTexture(p.texture.key === fly ? stand : fly) });
        p.setVisible(true).setPosition(at.x + (i % 2 ? 600 : -600), at.y - 700).setFlipX(i % 2 === 0);
        scene.tweens.add({
          targets: p, x: at.x, y: at.y, duration: rand(1600, 2200), ease: 'Quad.easeOut',
          onComplete: () => { flap.remove(); p.setTexture(stand); p.flying = false; peck(); },
        });
      });
      scene.time.delayedCall(2500, () => { away = false; });
    });
  };
  scene.events.on('update', scare);
  scene.events.once('shutdown', () => scene.events.off('update', scare));

  // a ginger cat dozing by the neighbour's doorstep, waking now and then to
  // sit up, flick its tail and lie down again
  const ginger = catTextures(scene, 'ginger', { e: '#e8913a', b: '#e8913a', t: '#c87028', l: '#c87028', y: '#2e1d0c' });
  const dozer = scene.add.image(806, 1072, ginger.nap).setOrigin(0.5, 1).setScale(k * 0.8).setDepth(1072).setFlipX(true);
  scene.tweens.add({ targets: dozer, scaleY: k * 0.83, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const wake = () => scene.time.delayedCall(rand(8000, 14000), () => {
    dozer.setTexture(ginger.sit0);
    const swish = scene.time.addEvent({ delay: 380, loop: true, callback: () => dozer.setTexture(dozer.texture.key === ginger.sit0 ? ginger.sit1 : ginger.sit0) });
    scene.time.delayedCall(rand(3000, 5000), () => { swish.remove(); dozer.setTexture(ginger.nap); wake(); });
  });
  wake();

  // a black-and-white cat wandering along the path past the fountain:
  // a stroll, a sit, a flick of the tail, and back
  const tux = catTextures(scene, 'tux', { e: '#2e2a2a', b: '#2e2a2a', t: '#2e2a2a', l: '#f4f0e8', y: '#f0d040' });
  const ends = [{ x: 610, y: 1246 }, { x: 800, y: 1254 }];
  const cat = scene.add.image(ends[0].x, ends[0].y, tux.sit0).setOrigin(0.5, 1).setScale(k * 0.8).setDepth(ends[0].y);
  let at = 0;
  const wander = () => scene.time.delayedCall(rand(2500, 5000), () => {
    at = 1 - at;
    const to = ends[at];
    cat.setFlipX(to.x > cat.x);
    const steps = scene.time.addEvent({ delay: 160, loop: true, callback: () => cat.setTexture(cat.texture.key === tux.walk0 ? tux.walk1 : tux.walk0) });
    cat.setTexture(tux.walk0);
    scene.tweens.add({
      targets: cat, x: to.x, y: to.y, duration: Math.abs(to.x - cat.x) / 40 * 1000, onUpdate: () => cat.setDepth(cat.y),
      onComplete: () => {
        steps.remove();
        cat.setTexture(tux.sit0);
        const swish = scene.time.addEvent({ delay: 420, loop: true, callback: () => cat.setTexture(cat.texture.key === tux.sit0 ? tux.sit1 : tux.sit0) });
        scene.time.delayedCall(2400, () => { swish.remove(); cat.setTexture(tux.sit0); wander(); });
      },
    });
  });
  wander();
}
