import { FRAME_W, FRAME_H, ART_PX } from './constants.js';

// Farmer sprite, drawn as pixel art to match the map: dark outline, three-tone
// shading lit from the top-left, warm palette sampled from the map.
// Sheet layout: rows = directions (down, left, right, up), cols = 4 walk frames.

const OUTLINE = '#2e1d0c';
const SHADOW = 'rgba(20, 30, 0, 0.28)';
const PALETTE = {
  H: '#f8d870', h: '#e0b050', j: '#b88038', b: '#a83a2c', // straw hat + band
  S: '#f8c8a0', s: '#d89870', e: OUTLINE,                  // skin, eyes
  R: '#8c5430', r: '#5e3820',                              // hair
  C: '#d04c3a', c: '#982f2a',                              // red shirt
  O: '#4f8cc0', o: '#36628f', k: '#f8d870',                // overalls, buckles
  B: '#7a4a2a', d: '#4a2a14',                              // boots
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

function blank() {
  return Array.from({ length: FRAME_H }, () => Array(FRAME_W).fill(null));
}

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

// Dark 1px outline around the silhouette, like every object on the map.
function outline(grid) {
  const out = grid.map(row => row.slice());
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      if (grid[y][x]) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy]?.[x + dx]);
      if (n) out[y][x] = OUTLINE;
    }
  }
  return out;
}

const STRIDE_FWD = [0, -1, -1, -2, -2, -2];
const STRIDE_BACK = [0, 1, 1, 2, 2, 2];

// frame: 0 = stand, 1 = left foot forward, 2 = stand, 3 = right foot forward
function buildFrame(dir, frame) {
  const g = blank();
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

function drawFrame(ctx, ox, oy, pixels) {
  const p = ART_PX;
  // Ground shadow under the feet
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.ellipse(ox + 8 * p, oy + 26 * p, 5.5 * p, 1.6 * p, 0, 0, Math.PI * 2);
  ctx.fill();

  pixels.forEach((row, y) => row.forEach((color, x) => {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(ox + x * p, oy + y * p, p, p);
  }));
}

export const DIRECTIONS = ['down', 'left', 'right', 'up'];

export function createCharacterTexture(scene) {
  const cols = 4; // walk frames
  const fw = FRAME_W * ART_PX;
  const fh = FRAME_H * ART_PX;
  const tex = scene.textures.createCanvas('player', fw * cols, fh * DIRECTIONS.length);
  const ctx = tex.getContext();

  DIRECTIONS.forEach((dir, row) => {
    for (let frame = 0; frame < cols; frame++) {
      drawFrame(ctx, frame * fw, row * fh, buildFrame(dir, frame));
      tex.add(row * cols + frame, 0, frame * fw, row * fh, fw, fh);
    }
  });

  tex.refresh();
}
