import Phaser from 'phaser';
import { FRAME_W, FRAME_H, ART_PX } from './constants.js';
import { OUTLINE, grid, outline, blit } from './pixelArt.js';

// Farmer sprite, drawn as pixel art to match the map: dark outline, three-tone
// shading lit from the top-left, warm palette sampled from the map.
// Sheet layout: rows = directions (down, left, right, up) + a reading row,
// cols = 4 frames.

const SHADOW = 'rgba(20, 30, 0, 0.28)';
const PALETTE = {
  H: '#f8d870', h: '#e0b050', j: '#b88038', b: '#a83a2c', // straw hat + band
  S: '#f8c8a0', s: '#d89870', e: OUTLINE,                  // skin, eyes
  R: '#8c5430', r: '#5e3820',                              // hair
  C: '#d04c3a', c: '#982f2a',                              // red shirt
  O: '#4f8cc0', o: '#36628f', k: '#f8d870',                // overalls, buckles
  B: '#7a4a2a', d: '#4a2a14',                              // boots
  P: '#fbf6ea', p: '#d8ccb8', t: '#a8987e',                // book pages, spine, text
  K: '#b8402e', q: '#7a2a20',                              // book cover
  x: OUTLINE,
};

// Head + torso, art rows 1–19 (legs and arms are added per frame).
const UPPER = {
  down: [
    '......hHHh......',
    '.....hHHHHh.....',
    '.....hHHHhj.....',
    '.....bbbbbb.....',
    '..hHHHHHHHHHHh..',
    '...jhhhhhhhhj...',
    '....rssssssr....',
    '....rSSSSSSr....',
    '....SSeSSeSs....',
    '....sSSSSSSs....',
    '.....sSSSSs.....',
    '......ssss......',
    '....COCCCCOc....',
    '....COCCCCOc....',
    '....cOOOOOOc....',
    '....cOkOOkOc....',
    '.....OOOOOo.....',
    '.....OOOOOo.....',
    '.....oOOOoo.....',
  ],
  up: [
    '......hHHh......',
    '.....hHHHHh.....',
    '.....hHHHhj.....',
    '.....bbbbbb.....',
    '..hHHHHHHHHHHh..',
    '...jhhhhhhhhj...',
    '....rrrrrrrr....',
    '....rRRRRRRr....',
    '....sRRRRRRs....',
    '....rRRRRRRr....',
    '.....rrrrrr.....',
    '......ssss......',
    '....COCCCCOc....',
    '....CCOCCOCc....',
    '....cCCOOCCc....',
    '....cOOOOOOc....',
    '.....OOOOOo.....',
    '.....OOOOOo.....',
    '.....oOOOoo.....',
  ],
  left: [
    '.......hHHh.....',
    '......hHHHHh....',
    '......hHHHhj....',
    '......bbbbbb....',
    '..hHHHHHHHHHh...',
    '...jhhhhhhhhj...',
    '.....sssssrr....',
    '....SSSSSSRr....',
    '....SeSSSsRr....',
    '....sSSSSsRr....',
    '.....sSSSsr.....',
    '.......sss......',
    '......COCCc.....',
    '......COCCc.....',
    '......OOOOo.....',
    '......OOOOo.....',
    '......OOOOo.....',
    '......OOOOo.....',
    '......oOOoo.....',
  ],
};

// Legs: 6 rows (3 denim + 2 boot + sole), drawn below the torso.
const LEG = ['OOo', 'OOo', 'ooo', 'BBd', 'BBd', 'ddd'];
const LEG_TOP = 20;

function put(grid, x, y, ch) {
  if (ch === '.' || y < 0 || y >= FRAME_H || x < 0 || x >= FRAME_W) return;
  grid[y][x] = PALETTE[ch];
}

function stamp(grid, rows, x0, y0) {
  rows.forEach((row, r) => [...row].forEach((ch, c) => put(grid, x0 + c, y0 + r, ch)));
}

// Leg with a per-row horizontal offset (for side-view strides); `back` legs are darker.
function leg(grid, x, lift, offsets, back = false) {
  LEG.forEach((row, r) => {
    const dx = offsets ? offsets[r] : 0;
    [...row].forEach((ch, c) => {
      const shaded = back ? { O: 'o', B: 'd' }[ch] || ch : ch;
      put(grid, x + c + dx, LEG_TOP + r - lift, shaded);
    });
  });
}

// Arms: sleeve + hand. The side-view arm carries its own outline so it reads
// against the body. Offsets shift each row horizontally to swing the arm.
const ARM_L = ['.C', 'CC', 'Cc', 'SS'];
const ARM_R = ['c.', 'cc', 'cc', 'ss'];
const ARM_SIDE = ['.Cc.', 'xCcx', 'xCcx', 'xSsx', '.xx.'];

function arm(grid, rows, x, y, offsets) {
  rows.forEach((row, r) => [...row].forEach((ch, c) => put(grid, x + c + (offsets ? offsets[r] : 0), y + r, ch)));
}

const STRIDE_FWD = [0, -1, -1, -2, -2, -2];
const STRIDE_BACK = [0, 1, 1, 2, 2, 2];

// frame: 0 = stand, 1 = left foot forward, 2 = stand, 3 = right foot forward
function buildFrame(dir, frame) {
  const g = grid(FRAME_W, FRAME_H);
  const step = frame % 2 === 1;
  const bob = step ? 1 : 0;

  if (dir === 'down' || dir === 'up') {
    // Front/back: lift the stepping leg, swing the opposite arm forward.
    const liftL = frame === 1 ? 1 : 0;
    const liftR = frame === 3 ? 1 : 0;
    leg(g, 5, liftL, null);
    leg(g, 8, liftR, null);
    stamp(g, UPPER[dir], 0, 1 + bob);
    arm(g, ARM_L, 2, 13 + bob + liftR);
    arm(g, ARM_R, 12, 13 + bob + liftL);
  } else {
    // Side view, drawn facing left; 'right' is mirrored afterwards.
    const swing = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    const legFwd = swing === 0 ? null : swing > 0 ? STRIDE_FWD : STRIDE_BACK;
    const legBack = swing === 0 ? null : swing > 0 ? STRIDE_BACK : STRIDE_FWD;
    leg(g, 7, 0, legBack, true);
    leg(g, 6, 0, legFwd);
    stamp(g, UPPER.left, 0, 1 + bob);
    const a = [0, 0, swing, swing, 2 * swing].map(v => -v);
    arm(g, ARM_SIDE, 6, 13 + bob, a);
  }

  const done = outline(g);
  return dir === 'right' ? done.map(row => row.slice().reverse()) : done;
}

// Reading: facing down, eyes lowered, holding an open book at waist height
// (seen from above, like everything else, so the pages face the camera).
const READ_HEAD = UPPER.down.map((row, i) => (i === 8 ? '....SSSSSSSs....' : i === 9 ? '....sSeSSeSs....' : row));
const BLINK_HEAD = READ_HEAD.map((row, i) => (i === 9 ? '....sSsSSsSs....' : row));
const BOOK = [
  'KPPPPPpPPPPK',
  'KPttPPpPtttK',
  'KPPPPPpPPPPK',
  'KPtttPpPttPK',
  'qKKKKKKKKKKq',
];
// A page turning: standing up from the spine, then falling to the left.
const PAGE_UP = ['.xx.', 'xPPx', 'xPPx', 'xPpx'];
const PAGE_LEFT = ['.xxx..', 'xPPPxx', '.xxPPx'];
const BOOK_X = 2;
const BOOK_Y = 16;

// frame: 0 = reading, 1 = page up, 2 = page falling, 3 = blink
function buildReadFrame(frame) {
  const g = grid(FRAME_W, FRAME_H);
  leg(g, 5, 0, null);
  leg(g, 8, 0, null);
  stamp(g, frame === 3 ? BLINK_HEAD : READ_HEAD, 0, 1);
  arm(g, ['.C', 'CC', 'Cc'], 2, 13);
  arm(g, ['c.', 'cc', 'cc'], 12, 13);
  stamp(g, BOOK, BOOK_X, BOOK_Y);
  stamp(g, ['x'.repeat(BOOK[0].length)], BOOK_X, BOOK_Y - 1); // dark edge against the shirt
  put(g, BOOK_X - 1, BOOK_Y + 1, 'S');
  put(g, BOOK_X - 1, BOOK_Y + 2, 's');
  put(g, BOOK_X + 12, BOOK_Y + 1, 's');
  put(g, BOOK_X + 12, BOOK_Y + 2, 's');
  if (frame === 1) stamp(g, PAGE_UP, BOOK_X + 5, BOOK_Y - 4);
  if (frame === 2) stamp(g, PAGE_LEFT, BOOK_X + 2, BOOK_Y - 3);
  return outline(g);
}

// Soft pixel shadow under the feet (not outlined)
const SHADOW_ROWS = [[4, 8], [3, 10], [4, 8]];

function drawFrame(ctx, ox, oy, pixels, p) {
  ctx.fillStyle = SHADOW;
  SHADOW_ROWS.forEach(([x, w], r) => ctx.fillRect(ox + x * p, oy + (25 + r) * p, w * p, p));
  blit(ctx, pixels, ox, oy, p);
}

export const DIRECTIONS = ['down', 'left', 'right', 'up'];

// Two copies of the sheet: 'player' at map resolution (smooth-scaled on the
// farm, like the map) and 'player-px' at 1 texel per sprite pixel, kept crisp
// for the zoomed-in interiors. Animations: `${key}-walk-${dir}`, `${key}-idle-${dir}`
// and `${key}-read`.
export function createCharacter(scene) {
  [['player', ART_PX], ['player-px', 1]].forEach(([key, p]) => {
    if (scene.textures.exists(key)) return;
    const cols = 4; // walk frames
    const fw = FRAME_W * p;
    const fh = FRAME_H * p;
    const tex = scene.textures.createCanvas(key, fw * cols, fh * (DIRECTIONS.length + 1));
    const ctx = tex.getContext();

    DIRECTIONS.forEach((dir, row) => {
      for (let frame = 0; frame < cols; frame++) {
        drawFrame(ctx, frame * fw, row * fh, buildFrame(dir, frame), p);
        tex.add(row * cols + frame, 0, frame * fw, row * fh, fw, fh);
      }
      const base = row * cols;
      scene.anims.create({
        key: `${key}-walk-${dir}`,
        frames: [0, 1, 2, 3].map(f => ({ key, frame: base + f })),
        frameRate: 8,
        repeat: -1,
      });
      scene.anims.create({
        key: `${key}-idle-${dir}`,
        frames: [{ key, frame: base }],
        frameRate: 1,
        repeat: -1,
      });
    });

    // Reading row: read for a while, turn a page, read, blink, ...
    const readRow = DIRECTIONS.length;
    for (let frame = 0; frame < cols; frame++) {
      drawFrame(ctx, frame * fw, readRow * fh, buildReadFrame(frame), p);
      tex.add(readRow * cols + frame, 0, frame * fw, readRow * fh, fw, fh);
    }
    const rf = (f, duration = 0) => ({ key, frame: readRow * cols + f, duration });
    scene.anims.create({
      key: `${key}-read`,
      frames: [rf(0, 2200), rf(1, 60), rf(2, 60), rf(0, 1500), rf(3, 40), rf(0, 1800), rf(1, 60), rf(2, 60), rf(0, 900), rf(3, 40)],
      frameRate: 10,
      repeat: -1,
    });

    tex.refresh();
    if (p === 1) tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
}
