import Phaser from 'phaser';
import { FRAME_W, FRAME_H, ART_PX } from './constants.js';
import { OUTLINE, grid, outline, blit } from './pixelArt.js';
import { hasFlag } from './state.js';

// Farmer sprite, drawn as pixel art to match the map: dark outline, three-tone
// shading lit from the top-left, warm palette sampled from the map.
// Sheet layout: rows = directions (down, left, right, up) + a reading row,
// cols = 4 frames.

const SHADOW = 'rgba(20, 30, 0, 0.28)';
const FARMER_PALETTE = {
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
const FARMER_UPPER = {
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

// Bob, the neighbour: tweed flat cap, ginger beard, green shirt, braces and
// brown trousers. Same body and animations as Farmer Jones, different look.
const BOB_PALETTE = {
  ...FARMER_PALETTE,
  H: '#a89478', h: '#8a7860', j: '#5e5040',               // tweed cap
  R: '#c8783a', r: '#9a5628',                              // ginger hair and beard
  C: '#6aa84f', c: '#447a34',                              // green shirt
  O: '#7a5a3a', o: '#5a4028', k: '#f8d870',                // trousers, braces, buckle
  d: '#3a2a1a',
};
const BOB_UPPER = {
  down: [
    '................',
    '................',
    '.....hHHHHh.....',
    '....hHHHHHHh....',
    '....hhhhhhhhj...',
    '....jjjjjjjjj...',
    '....rssssssr....',
    '....rSSSSSSr....',
    '....SSeSSeSs....',
    '....RSSSSSSR....',
    '....RRSssSRR....',
    '.....RRRRRR.....',
    '....COCCCCOc....',
    '....COCCCCOc....',
    '....cOCCCCOc....',
    '....cddkdddc....',
    '.....OOOOOo.....',
    '.....OOOOOo.....',
    '.....oOOOoo.....',
  ],
  up: [
    '................',
    '................',
    '.....hHHHHh.....',
    '....hHHHHHHh....',
    '....hhhhhhhhh...',
    '....jhhhhhhhj...',
    '....rRRRRRRr....',
    '....rRRRRRRr....',
    '....sRRRRRRs....',
    '....rRRRRRRr....',
    '.....rrrrrr.....',
    '......ssss......',
    '....COCCCCOc....',
    '....CCOCCOCc....',
    '....cCCOOCCc....',
    '....cddddddc....',
    '.....OOOOOo.....',
    '.....OOOOOo.....',
    '.....oOOOoo.....',
  ],
  left: [
    '................',
    '................',
    '......hHHHHh....',
    '.....hHHHHHHh...',
    '...jjhhhhhhhh...',
    '...jjjjhhhhhj...',
    '.....sssssrr....',
    '....SSSSSSRr....',
    '....SeSSSsRr....',
    '...RSSSSSRRr....',
    '...RRRSSRRr.....',
    '....RRRRRr......',
    '......COCCc.....',
    '......COCCc.....',
    '......CCCCc.....',
    '......dkddd.....',
    '......OOOOo.....',
    '......OOOOo.....',
    '......oOOoo.....',
  ],
};

// Sarah, Bob's wife: a pink headscarf over chestnut hair, a lavender dress
// with a white apron, and a skirt down to her boots (`skirt`: the rows below
// the waist, instead of legs).
const SARAH_PALETTE = {
  ...FARMER_PALETTE,
  H: '#e07aa8', h: '#c05a88', j: '#9a3a68',               // headscarf
  R: '#a0522d', r: '#7a3a1e',                              // hair
  C: '#8a78cc', c: '#5e4e9e',                              // dress
  O: '#f8f0e0', o: '#d8ccb8',                              // apron
  p: '#e07a8a',                                            // lips
  B: '#6a4a3a', d: '#3a2a1a',                              // boots
};
const SARAH_UPPER = {
  down: [
    '......hHHh......',
    '.....hHHHHh.....',
    '....hHHHHHHh....',
    '....hhhhhhhhj...',
    '....rRRRRRRr....',
    '....rSSSSSSr....',
    '....RSSSSSSR....',
    '....RSeSSeSR....',
    '....RSSSSSSR....',
    '....rsSppSsr....',
    '.....sSSSSs.....',
    '......ssss......',
    '....CCOOOOCc....',
    '....CCOOOOCc....',
    '....cCOOOOCc....',
    '....cCOOOOCc....',
    '...cCCOOOOCcc...',
    '...cCOOOOOOCc...',
    '..cCCOOOOOOCcc..',
  ],
  up: [
    '......hHHh......',
    '.....hHHHHh.....',
    '....hHHHHHHh....',
    '....hhhhhhhhj...',
    '....rRRRRRRr....',
    '....rRRRRRRr....',
    '....RRRRRRRR....',
    '....rRRhhRRr....',
    '....rRhHHhRr....',
    '.....rRRRRr.....',
    '.....sSSSSs.....',
    '......ssss......',
    '....CCCCCCCc....',
    '....CCCCCCCc....',
    '....cCCCCCCc....',
    '....cCoooCCc....',
    '...cCCCCCCCcc...',
    '...cCCCCCCCCc...',
    '..cCCCCCCCCCcc..',
  ],
  left: [
    '.......hHHh.....',
    '......hHHHHh....',
    '.....hHHHHHHh...',
    '.....hhhhhhhhj..',
    '.....rRRRRRRr...',
    '....SSSSSSRRr...',
    '....SeSSSsRRr...',
    '....SSSSSsRRr...',
    '....spSSSsRr....',
    '.....sSSSsr.....',
    '.......sss......',
    '.......ss.......',
    '......COOCc.....',
    '......COOCc.....',
    '......COOCc.....',
    '......COOCc.....',
    '.....cCOOCCc....',
    '.....cCOOCCc....',
    '....cCCOOCCCc...',
  ],
};
const SARAH_SKIRT = {
  down: ['..cCCOOOOOOCcc..', '..cCCOOOOOOCCc..', '.cCCCOOOOOOCCcc.', '.cCCCooooooCCcc.'],
  up: ['..cCCCCCCCCCcc..', '..cCCCCCCCCCCc..', '.cCCCCCCCCCCCcc.', '.ccCCCCCCCCCCcc.'],
  left: ['....cCCOOCCCc...', '....cCCOOCCCCc..', '...cCCCOOCCCCc..', '...ccCCooCCCcc..'],
};

const FARMER = { palette: FARMER_PALETTE, upper: FARMER_UPPER };
const BOB = { palette: BOB_PALETTE, upper: BOB_UPPER };
const SARAH = { palette: SARAH_PALETTE, upper: SARAH_UPPER, skirt: SARAH_SKIRT };
let look = FARMER; // the character being drawn

// Legs: 6 rows (3 denim + 2 boot + sole), drawn below the torso.
const LEG = ['OOo', 'OOo', 'ooo', 'BBd', 'BBd', 'ddd'];
const LEG_TOP = 20;

// (sleeves, A/a, are the shirt's colours unless the look says otherwise: a
// jacket over a white shirt)
const SLEEVE = { A: 'C', a: 'c' };

function put(grid, x, y, ch) {
  if (ch === '.' || y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return;
  grid[y][x] = look.palette[ch] ?? look.palette[SLEEVE[ch]];
}

// An anim, unless it's there already (the player's sheets get redrawn when he changes)
function anim(scene, config) {
  if (!scene.anims.exists(config.key)) scene.anims.create(config);
}

function stamp(grid, rows, x0, y0) {
  rows.forEach((row, r) => [...row].forEach((ch, c) => put(grid, x0 + c, y0 + r, ch)));
}

// Leg with a per-row horizontal offset (for side-view strides); `back` legs are darker.
function leg(grid, x, lift, offsets, back = false) {
  (look.leg ?? LEG).forEach((row, r) => {
    const dx = offsets ? offsets[r] : 0;
    [...row].forEach((ch, c) => {
      const shaded = back ? { O: 'o', B: 'd' }[ch] || ch : ch;
      put(grid, x + c + dx, LEG_TOP + r - lift, shaded);
    });
  });
}

// Arms: sleeve + hand. The side-view arm carries its own outline so it reads
// against the body. Offsets shift each row horizontally to swing the arm.
const ARM_L = ['.A', 'AA', 'Aa', 'SS'];
const ARM_R = ['a.', 'aa', 'aa', 'ss'];
const ARM_SIDE = ['.Aa.', 'xAax', 'xAax', 'xSsx', '.xx.'];

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

  // in a skirt only the boots show below it, stepping
  const boot = (x, lift) => stamp(g, ['BB', 'dd'], x, 24 - lift);

  if (dir === 'down' || dir === 'up') {
    // Front/back: lift the stepping leg, swing the opposite arm forward.
    const liftL = frame === 1 ? 1 : 0;
    const liftR = frame === 3 ? 1 : 0;
    if (look.skirt) {
      boot(5, liftL);
      boot(9, liftR);
    } else {
      leg(g, 5, liftL, null);
      leg(g, 8, liftR, null);
    }
    stamp(g, look.upper[dir], 0, 1 + bob);
    if (look.skirt) stamp(g, look.skirt[dir], 0, 20 + bob);
    arm(g, ARM_L, 2, 13 + bob + liftR);
    arm(g, ARM_R, 12, 13 + bob + liftL);
  } else {
    // Side view, drawn facing left; 'right' is mirrored afterwards.
    const swing = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    const legFwd = swing === 0 ? null : swing > 0 ? STRIDE_FWD : STRIDE_BACK;
    const legBack = swing === 0 ? null : swing > 0 ? STRIDE_BACK : STRIDE_FWD;
    if (look.skirt) {
      boot(8 + swing, 0);
      boot(6 - swing, 0);
    } else {
      leg(g, 7, 0, legBack, true);
      leg(g, 6, 0, legFwd);
    }
    stamp(g, look.upper.left, 0, 1 + bob);
    if (look.skirt) stamp(g, look.skirt.left, 0, 20 + bob);
    const a = [0, 0, swing, swing, 2 * swing].map(v => -v);
    arm(g, ARM_SIDE, 6, 13 + bob, a);
  }

  const done = outline(g);
  return dir === 'right' ? done.map(row => row.slice().reverse()) : done;
}

// Reading: facing down, eyes lowered, holding an open book at waist height
// (seen from above, like everything else, so the pages face the camera).
const readHead = () => look.upper.down.map((row, i) => (i === 8 ? '....SSSSSSSs....' : i === 9 ? '....sSeSSeSs....' : row));
const blinkHead = () => readHead().map((row, i) => (i === 9 ? '....sSsSSsSs....' : row));
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
  stamp(g, frame === 3 ? blinkHead() : readHead(), 0, 1);
  arm(g, ['.A', 'AA', 'Aa'], 2, 13);
  arm(g, ['a.', 'aa', 'aa'], 12, 13);
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

// Waving (facing down): one arm raised, the hand going side to side.
function buildWaveFrame(frame) {
  const g = grid(FRAME_W, FRAME_H);
  leg(g, 5, 0, null);
  leg(g, 8, 0, null);
  stamp(g, look.upper.down, 0, 1);
  arm(g, ARM_L, 2, 13);
  const dx = frame ? 1 : 0;
  stamp(g, ['SS', 'Ss'], 13 + dx, 8);
  stamp(g, ['aa'], 13 + Math.round(dx / 2), 10);
  stamp(g, ['aa', 'aa', 'a.'], 12, 11);
  return outline(g);
}

// Sitting at a table, facing down: only what shows above the tabletop (head,
// shoulders, arms), with the table's back edge on row SEAT_ROW, just under
// his belt. kind: 'down' fork in the pie, 'up' fork at his mouth, 'chew'
// mouth open, 'full' hands on his belly and eyes shut, 'pat' patting it.
export const SEAT_ROW = 17;
const FORK = '#d0d8e0';

function buildSeatFrame(kind) {
  const g = grid(FRAME_W, FRAME_H);
  const content = kind === 'full' || kind === 'pat';
  const head = look.upper.down.slice(0, 16).map((row, i) => {
    if (i === 8 && content) return row.replace(/e/g, 's');
    if (i === 10 && kind === 'chew') return `${row.slice(0, 7)}xx${row.slice(9)}`;
    return row;
  });
  stamp(g, head, 0, 1);
  if (content) {
    arm(g, ['.A', 'AA', 'Aa'], 2, 13);
    arm(g, ['a.', 'aa', 'aa'], 12, 13);
    stamp(g, ['SS'], 4, 15);
    stamp(g, ['ss'], 10, kind === 'pat' ? 14 : 15);
    return outline(g);
  }
  arm(g, ['.A', 'AA', 'Aa', 'Aa', 'aa', 'SS'], 2, 13); // resting on the table
  if (kind === 'up') arm(g, ['ss', 'Ss', 'aa', 'aa'], 12, 10); // hand by his face
  else arm(g, ['a.', 'aa', 'aa', 'aa', 'aa', 'ss'], 12, 13);   // hand at the plate
  const out = outline(g);
  const fork = kind === 'up' ? [[9, 11], [10, 11], [11, 11]] : [[11, 19], [10, 20]];
  fork.forEach(([x, y]) => { out[y][x] = FORK; });
  return out;
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
function directionRows(scene, key, ctx, fw, fh, p, cols) {
  DIRECTIONS.forEach((dir, row) => {
    for (let frame = 0; frame < cols; frame++) {
      drawFrame(ctx, frame * fw, row * fh, buildFrame(dir, frame), p);
      scene.textures.get(key).add(row * cols + frame, 0, frame * fw, row * fh, fw, fh);
    }
    const base = row * cols;
    anim(scene, {
      key: `${key}-walk-${dir}`,
      frames: [0, 1, 2, 3].map(f => ({ key, frame: base + f })),
      frameRate: 8,
      repeat: -1,
    });
    anim(scene, {
      key: `${key}-idle-${dir}`,
      frames: [{ key, frame: base }],
      frameRate: 1,
      repeat: -1,
    });
  });
}

// Farmer Jones. Two copies of the sheet: 'player' at map resolution
// (smooth-scaled on the farm, like the map) and 'player-px' at 1 texel per
// sprite pixel, kept crisp when shown big. Animations: `${key}-walk-${dir}`,
// `${key}-idle-${dir}`, `${key}-read`, seated at the table `${key}-eat` and
// `${key}-full`, and sitting on a chair `${key}-sit-${dir}`.
export function createCharacter(scene) {
  look = farmer();
  const redraw = worn !== look; // (he's changed: the same sheets, drawn again)
  worn = look;
  [['player', ART_PX], ['player-px', 1]].forEach(([key, p]) => {
    if (scene.textures.exists(key) && !redraw) return;
    const cols = 4; // walk frames
    const fw = FRAME_W * p;
    const fh = FRAME_H * p;
    const tex = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.createCanvas(key, fw * cols, fh * (DIRECTIONS.length + 4));
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, tex.width, tex.height);
    directionRows(scene, key, ctx, fw, fh, p, cols);

    // Reading row: read for a while, turn a page, read, blink, ...
    const readRow = DIRECTIONS.length;
    for (let frame = 0; frame < cols; frame++) {
      drawFrame(ctx, frame * fw, readRow * fh, buildReadFrame(frame), p);
      tex.add(readRow * cols + frame, 0, frame * fw, readRow * fh, fw, fh);
    }
    const rf = (f, duration = 0) => ({ key, frame: readRow * cols + f, duration });
    anim(scene, {
      key: `${key}-read`,
      frames: [rf(0, 2200), rf(1, 60), rf(2, 60), rf(0, 1500), rf(3, 40), rf(0, 1800), rf(1, 60), rf(2, 60), rf(0, 900), rf(3, 40)],
      frameRate: 10,
      repeat: -1,
    });
    seatRows(scene, key, tex, ctx, readRow + 1, fw, fh, p, cols);

    // sitting on a chair, facing each way
    const sitRow = readRow + 3;
    DIRECTIONS.forEach((dir, i) => {
      drawFrame(ctx, i * fw, sitRow * fh, buildSitFrame(dir), p);
      tex.add(`sit-${dir}`, 0, i * fw, sitRow * fh, fw, fh);
      anim(scene, { key: `${key}-sit-${dir}`, frames: [{ key, frame: `sit-${dir}` }], frameRate: 1, repeat: -1 });
    });

    tex.refresh();
    if (p === 1) tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
  look = FARMER;
  createBike(scene, redraw);
}

// Seated at the table (two rows of the sheet from `row`): frames
// `seat-${kind}` and animations `${key}-eat` (one bite of pie per loop) and
// `${key}-full`. No shadow: the feet are under the table.
const SEAT_KINDS = ['down', 'up', 'chew', 'full', 'pat'];

function seatRows(scene, key, tex, ctx, row, fw, fh, p, cols) {
  SEAT_KINDS.forEach((kind, i) => {
    const x = (i % cols) * fw;
    const y = (row + Math.floor(i / cols)) * fh;
    blit(ctx, buildSeatFrame(kind), x, y, p);
    tex.add(`seat-${kind}`, 0, x, y, fw, fh);
  });
  const sf = (kind, duration) => ({ key, frame: `seat-${kind}`, duration }); // ms on screen
  anim(scene, {
    key: `${key}-eat`,
    frames: [sf('down', 600), sf('up', 500), sf('chew', 160), sf('down', 160), sf('chew', 160), sf('down', 160), sf('chew', 160)],
    frameRate: 10,
    repeat: -1,
  });
  anim(scene, {
    key: `${key}-full`,
    frames: [sf('full', 2200), sf('pat', 160), sf('full', 160), sf('pat', 160), sf('full', 1400)],
    frameRate: 10,
    repeat: -1,
  });
}

// Sarah, Bob's wife: 'sarah-px' (crisp, for the farmhouse), with the
// direction animations `sarah-px-walk-${dir}` and `sarah-px-idle-${dir}`.
export function createSarah(scene) {
  const key = 'sarah-px';
  if (scene.textures.exists(key)) return;
  look = SARAH;
  const cols = 4;
  const tex = scene.textures.createCanvas(key, FRAME_W * cols, FRAME_H * DIRECTIONS.length);
  directionRows(scene, key, tex.getContext(), FRAME_W, FRAME_H, 1, cols);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  look = FARMER;
}

// Villagers (the people at the beach, src/villagers.js): the same body,
// shading and animations as Farmer Jones and Bob, in their own clothes and
// hair. `hair` picks the head: 'short', 'bob' (to the jaw), 'long' (over the
// shoulders) or 'hat' (a sun hat and a beard); `skirt` puts a skirt over the
// legs, `shorts` shows the shins; `palette` colours it (H/h/j/b hat, R/r
// hair, S/s skin, C/c top, O/o trousers or skirt, B/d shoes).
const FACE = {
  down: ['....rSSSSSSr....', '....rSSSSSSr....', '....SSeSSeSs....', '....sSSSSSSs....', '.....sSSSSs.....', '......ssss......'],
  left: ['.....sssssRr....', '....SSSSSSRr....', '....SeSSSsRr....', '....sSSSSsRr....', '.....sSSSsr.....', '.......sss......'],
};
const HAIR_TOP = {
  down: ['................', '................', '.....rRRRRr.....', '....rRRRRRRr....', '...rRRRRRRRRr...', '...rRRRRRRRRr...'],
  up: ['................', '................', '.....rRRRRr.....', '....rRRRRRRr....', '...rRRRRRRRRr...', '...RRRRRRRRRR...'],
  left: ['................', '................', '......rRRRRr....', '.....rRRRRRRr...', '....rRRRRRRRRr..', '....RRRRRRRRRr..'],
};
const HEADS = {
  short: {
    down: [...HAIR_TOP.down, ...FACE.down],
    up: [...HAIR_TOP.up, '....rRRRRRRr....', '....rRRRRRRr....', '....sRRRRRRs....', '....rRRRRRRr....', '.....rrrrrr.....', '......ssss......'],
    left: [...HAIR_TOP.left, ...FACE.left],
  },
  bob: {
    down: [...HAIR_TOP.down.slice(0, 5), '...RRRRRRRRRR...', '...RrSSSSSSrR...', '...RRSSSSSSRR...', '...RSSeSSeSsR...', '...RsSSSSSSsR...', '...rRsSSSSsRr...', '....rrssssrr....'],
    up: [...HAIR_TOP.up, '...RRRRRRRRRR...', '...RRRRRRRRRR...', '...RRRRRRRRRR...', '...RRRRRRRRRR...', '...rRRRRRRRRr...', '....rrrrrrrr....'],
    left: [...HAIR_TOP.left, '....rSSSRRRRRR..', '....SSSSSRRRRR..', '....SeSSsRRRRR..', '....sSSSsRRRRr..', '.....sSSsRRRr...', '.......ssrr.....'],
  },
  hat: {
    down: [...FARMER_UPPER.down.slice(0, 9), '....RSSSSSSR....', '....RRSssSRR....', '.....RRRRRR.....'],
    up: FARMER_UPPER.up.slice(0, 12),
    left: [...FARMER_UPPER.left.slice(0, 9), '...RSSSSSRRr....', '...RRRSSRRr.....', '....RRRRRr......'],
  },
};
// long hair: the bob, falling on over the shoulders
HEADS.long = {
  down: [...HEADS.bob.down.slice(0, 11), '...RRrssssrRR...', '...RCCCCCCCcR...', '...rCCCCCCCcr...'],
  up: [...HEADS.bob.up.slice(0, 11), '...RRRRRRRRRR...', '...rCRRRRRRCr...', '....CrRRRRrc....'],
  left: [...HEADS.bob.left.slice(0, 11), '.......ssRRRR...', '......CCCRRRr...', '......CCCCRr....'],
};
// Farmer Jones in the tuxedo he rents for his date with Steffi (src/tailor.js,
// 'tuxedo'): no hat, his hair combed; a black jacket, its lapels over a
// white shirt with a black bow tie, black trousers and polished black shoes.
const TUX_PALETTE = {
  ...FARMER_PALETTE,
  J: '#2e2e38', j: '#1a1a20',              // the jacket
  A: '#2e2e38', a: '#1a1a20',              // its sleeves
  W: '#f8f6f0', T: '#141418',              // white shirt, black bow tie
  O: '#26262e', o: '#141418',              // trousers
  B: '#202024', d: '#0e0e12',              // polished shoes
};
const TUX_TORSO = {
  down: ['....JJWTTWJj....', '....JJWWWWJj....', '....jJJWWJJj....', '....jJJWWJJj....', '.....JJJJJj.....', '.....OOOOOo.....', '.....oOOOoo.....'],
  up: ['....JJJJJJJj....', '....JJJJJJJj....', '....jJJJJJJj....', '....jJJJJJJj....', '.....JJJJJj.....', '.....OOOOOo.....', '.....oOOOoo.....'],
  left: ['......WJJJj.....', '......WJJJj.....', '......JJJJj.....', '......JJJJj.....', '......JJJJj.....', '......OOOOo.....', '......oOOoo.....'],
};
const TUX_UPPER = {
  down: [...HAIR_TOP.down, ...FARMER_UPPER.down.slice(6, 12), ...TUX_TORSO.down],
  up: [...HAIR_TOP.up, ...FARMER_UPPER.up.slice(6, 12), ...TUX_TORSO.up],
  left: [...HAIR_TOP.left, ...FARMER_UPPER.left.slice(6, 12), ...TUX_TORSO.left],
};
const TUX = { palette: TUX_PALETTE, upper: TUX_UPPER };
// What he's wearing now, and what his sheets were last drawn in.
const farmer = () => (hasFlag('tuxedo') ? TUX : FARMER);
let worn = null;

const TORSO = {
  down: ['....CCCCCCCc....', '....CCCCCCCc....', '....cCCCCCCc....', '....cCCCCCCc....', '.....OOOOOo.....', '.....OOOOOo.....', '.....oOOOoo.....'],
  up: ['....CCCCCCCc....', '....CCCCCCCc....', '....cCCCCCCc....', '....cCCCCCCc....', '.....OOOOOo.....', '.....OOOOOo.....', '.....oOOOoo.....'],
  left: ['......CCCCc.....', '......CCCCc.....', '......CCCCc.....', '......cCCCc.....', '......OOOOo.....', '......OOOOo.....', '......oOOoo.....'],
};
const VILLAGER_SKIRT = {
  down: ['....OOOOOOOo....', '...OOOOOOOOOo...', '...OOOOOOOOOo...', '...ooooooooooo..'],
  up: ['....OOOOOOOo....', '...OOOOOOOOOo...', '...OOOOOOOOOo...', '...ooooooooooo..'],
  left: ['......OOOOo.....', '.....OOOOOOo....', '.....OOOOOOo....', '....ooooooooo...'],
};
const SHORTS_LEG = ['OOo', 'SSs', 'SSs', 'BBd', 'BBd', 'ddd'];

function villagerLook({ hair, palette, skirt, shorts }) {
  const upper = {};
  ['down', 'up', 'left'].forEach((dir) => {
    const head = HEADS[hair][dir];
    upper[dir] = [...head, ...TORSO[dir].slice(head.length - 12)];
  });
  return {
    palette: { ...FARMER_PALETTE, ...palette },
    upper,
    skirt: skirt ? VILLAGER_SKIRT : null,
    leg: shorts ? SHORTS_LEG : null,
  };
}

// Sitting (on a chair, a bench or the ground), facing `dir`: the body lower
// by a thigh's length, knees towards us (or out in front, side on), feet on
// the ground.
function buildSitFrame(dir) {
  const g = grid(FRAME_W, FRAME_H);
  const drop = 3;
  const shin = look.leg ? 'S' : 'O';
  if (dir === 'down') {
    stamp(g, look.upper.down, 0, 1 + drop);
    stamp(g, ['....OOOOOOOo....', '....oOOooOOo....', `.....${shin}${shin}..${shin}${shin}.....`, '.....BB..BB.....'], 0, 23);
    arm(g, ARM_L, 2, 13 + drop);
    arm(g, ARM_R, 12, 13 + drop);
  } else if (dir === 'up') {
    stamp(g, look.upper.up, 0, 1 + drop);
    stamp(g, ['....OOOOOOOo....', '....oooooooo....'], 0, 23);
    arm(g, ARM_L, 2, 13 + drop);
    arm(g, ARM_R, 12, 13 + drop);
  } else {
    stamp(g, look.upper.left, 0, 1 + drop);
    stamp(g, ['OOOOOOo', 'ooooooo'], 3, 21);
    stamp(g, [`${shin}${shin}`, `${shin}${shin.toLowerCase()}`], 3, 23);
    stamp(g, ['BBd', 'ddd'], 2, 25);
    arm(g, ARM_SIDE, 6, 13 + drop);
  }
  const done = outline(g);
  return dir === 'right' ? done.map(row => row.slice().reverse()) : done;
}

// A villager's sheet `key`, at the farm's resolution (or `p` texels per
// sprite pixel: 1 for indoors, kept crisp): the direction animations
// (`${key}-walk-${dir}`, `${key}-idle-${dir}`) and sitting (`${key}-sit-${dir}`).
export function createVillager(scene, key, spec, p = ART_PX) {
  if (scene.textures.exists(key)) return;
  look = villagerLook(spec);
  const cols = 4;
  const fw = FRAME_W * p;
  const fh = FRAME_H * p;
  const tex = scene.textures.createCanvas(key, fw * cols, fh * (DIRECTIONS.length + 1));
  const ctx = tex.getContext();
  directionRows(scene, key, ctx, fw, fh, p, cols);
  const sitRow = DIRECTIONS.length;
  DIRECTIONS.forEach((dir, i) => {
    drawFrame(ctx, i * fw, sitRow * fh, buildSitFrame(dir), p);
    tex.add(`sit-${dir}`, 0, i * fw, sitRow * fh, fw, fh);
    anim(scene, { key: `${key}-sit-${dir}`, frames: [{ key, frame: `sit-${dir}` }], frameRate: 1, repeat: -1 });
  });
  tex.refresh();
  if (p === 1) tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  look = FARMER;
}

// Bob the neighbour: 'bob' (farm) and 'bob-px' (crisp, for close-ups), with
// the same direction animations plus `${key}-wave`, and the seated ones.

export function createBob(scene) {
  look = BOB;
  [['bob', ART_PX], ['bob-px', 1]].forEach(([key, p]) => {
    if (scene.textures.exists(key)) return;
    const cols = 4;
    const fw = FRAME_W * p;
    const fh = FRAME_H * p;
    const tex = scene.textures.createCanvas(key, fw * cols, fh * (DIRECTIONS.length + 3));
    const ctx = tex.getContext();
    directionRows(scene, key, ctx, fw, fh, p, cols);

    const waveRow = DIRECTIONS.length;
    for (let frame = 0; frame < 2; frame++) {
      drawFrame(ctx, frame * fw, waveRow * fh, buildWaveFrame(frame), p);
      tex.add(waveRow * cols + frame, 0, frame * fw, waveRow * fh, fw, fh);
    }
    const wf = f => ({ key, frame: waveRow * cols + f });
    anim(scene, { key: `${key}-wave`, frames: [wf(0), wf(1), wf(0), wf(1), wf(0), wf(1)], frameRate: 6, repeat: 0 });

    seatRows(scene, key, tex, ctx, waveRow + 1, fw, fh, p, cols);

    tex.refresh();
    if (p === 1) tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
  look = FARMER;
}

// ── The bicycle (src/bike.js) ─────────────────────────────────────────────
// Farmer Jones riding it: 'player-bike' (outdoors) and 'player-bike-px'
// (crisp, indoors), frames BIKE_W wide (the same height and feet row as his
// walking ones), with `${key}-walk-${dir}` (pedalling, the wheels turning)
// and `${key}-idle-${dir}`. And the bike on its own on its stand: 'bike-px'
// in the barn, 'bike' left outside a door. Side views are drawn facing left, 'right' mirrored.
export const BIKE_W = 24;
const BIKE_COLOURS = {
  G: '#3a9a4a', g: '#2a6a34', // frame
  T: '#3a3430',               // tyres
  W: '#d8dce0', w: '#7a7e84', // rims and spokes, and between them
  M: '#a8b0b8', L: '#3a2618', // metal; saddle and grips
};
const WHEEL_Y = 22;
const SIDE = { front: 5, back: 19, crank: 12, seat: { x: 15, y: 19 }, head: { x: 7, y: 17 } };

function line(g, x0, y0, x1, y1, ch) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) put(g, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), ch);
}

// A wheel side on, centred (cx, WHEEL_Y): tyre, rim, and spokes turned by `turn`.
function wheel(g, cx, turn) {
  for (let y = WHEEL_Y - 4; y <= WHEEL_Y + 4; y++) {
    for (let x = cx - 4; x <= cx + 4; x++) {
      const dx = x - cx;
      const dy = y - WHEEL_Y;
      const d = Math.hypot(dx, dy);
      if (d > 3.6) continue;
      if (d > 2.6) put(g, x, y, 'T');
      else if (d > 1.9) put(g, x, y, 'W');
      else if (d < 0.5) put(g, x, y, 'M');
      else {
        const a = Math.atan2(dy, dx) - turn;
        put(g, x, y, Math.abs(Math.sin(2 * a)) < 0.5 ? 'W' : 'w');
      }
    }
  }
}

// The bike side on, pedals at angle `crank` (and the wheels turned with them).
function bikeSide(g, crank, rider) {
  const { front, back, seat, head } = SIDE;
  const c = SIDE.crank;
  wheel(g, back, crank / 2);
  wheel(g, front, crank / 2);
  line(g, c, WHEEL_Y, back, WHEEL_Y, 'g');        // chain stay
  line(g, back, WHEEL_Y, seat.x, seat.y + 1, 'g'); // seat stay
  line(g, c, WHEEL_Y, seat.x, seat.y, 'G');        // seat tube
  line(g, c, WHEEL_Y, head.x, head.y + 2, 'G');    // down tube
  line(g, seat.x, seat.y, head.x, head.y + 1, 'G'); // top tube
  line(g, head.x, head.y, head.x - 1, head.y + 2, 'G');
  line(g, head.x - 1, head.y + 2, front, WHEEL_Y, 'g'); // fork
  line(g, head.x, head.y - 1, head.x - 2, head.y - 1, 'M'); // handlebar
  put(g, head.x - 2, head.y - 1, 'L');
  if (!rider) stamp(g, ['LLL'], seat.x - 1, seat.y - 1); // saddle (under him, when riding)
}

// A pedal and its crank arm at angle `a` (0 = straight back), and the foot
// on it: returns where the foot is.
function pedal(g, a, ch) {
  const x = Math.round(SIDE.crank + 2 * Math.cos(a));
  const y = Math.round(WHEEL_Y + 2 * Math.sin(a));
  line(g, SIDE.crank, WHEEL_Y, x, y, 'M');
  put(g, x, y, ch);
  return { x, y };
}

// A leg from the hip to the foot on its pedal, the knee bent up and forward.
function bikeLeg(g, hip, foot, far) {
  const knee = { x: Math.round((hip.x + foot.x) / 2) - 2, y: Math.round((hip.y + foot.y) / 2) - 1 };
  const [O, B] = far ? ['o', 'd'] : ['O', 'B'];
  line(g, hip.x, hip.y, knee.x, knee.y, O);
  line(g, hip.x + 1, hip.y, knee.x + 1, knee.y, O);
  line(g, knee.x, knee.y, foot.x, foot.y - 1, O);
  line(g, knee.x + 1, knee.y, foot.x + 1, foot.y - 1, O);
  stamp(g, [B + B + B], foot.x - 1, foot.y - 1);
}

function buildBikeFrame(dir, frame) {
  const g = grid(BIKE_W, FRAME_H);
  if (dir === 'left' || dir === 'right') {
    const a = (frame * Math.PI) / 2;
    const hip = { x: 14, y: 18 };
    bikeLeg(g, hip, pedal(g, a + Math.PI, 'M'), true); // the far leg, behind the bike
    bikeSide(g, a, true);
    bikeLeg(g, hip, pedal(g, a, 'M'), false);
    const upper = look.upper.left;
    stamp(g, upper.slice(0, 12), 6, 0);   // head, leaning into it
    stamp(g, upper.slice(12), 7, 12);     // body over the saddle
    line(g, 13, 13, 8, 16, 'A');          // arm out to the handlebar
    line(g, 13, 14, 9, 16, 'a');
    stamp(g, ['SS'], 6, 16);
  } else {
    // end on: the front (or back) wheel, the handlebar across, his legs
    // either side going up and down
    const up = ['OOo', 'OOo', 'BBd', 'ddd'];
    const mid = ['OOo', 'OOo', 'ooo', 'BBd', 'ddd'];
    const down = ['OOo', 'OOo', 'OOo', 'ooo', 'BBd', 'ddd'];
    const legs = [[up, down], [mid, mid], [down, up], [mid, mid]][frame];
    stamp(g, legs[0], 8, 19);
    stamp(g, legs[1], 13, 19);
    const back = dir === 'up';
    if (back) stamp(g, ['LMMMMMMMMMMMML'], 5, 16);
    stamp(g, look.upper[dir], 4, 0);
    for (let y = 18; y <= 25; y++) stamp(g, [y === 19 + ((frame * 2) % 6) ? 'WT' : 'TT'], 11, y);
    if (back) stamp(g, ['bb'], 11, 18); // the reflector
    else stamp(g, ['LMMMMMMMMMML', '.....gg.....'], 6, 17);
    arm(g, ARM_L, 6, 13);
    arm(g, ARM_R, 16, 13);
  }
  const done = outline(g);
  return dir === 'right' ? done.map(row => row.slice().reverse()) : done;
}

function buildParkedBike() {
  const g = grid(BIKE_W, FRAME_H);
  bikeSide(g, Math.PI / 4, false);
  pedal(g, Math.PI / 4, 'd');
  line(g, SIDE.crank, WHEEL_Y, SIDE.crank + 2, WHEEL_Y + 3, 'M'); // the stand
  return outline(g);
}

const BIKE_SHADOW = { side: [[3, 18], [1, 22], [3, 18]], end: [[8, 8], [7, 10], [8, 8]] };

function drawBikeFrame(ctx, ox, oy, pixels, p, shadow) {
  ctx.fillStyle = SHADOW;
  shadow.forEach(([x, w], r) => ctx.fillRect(ox + x * p, oy + (25 + r) * p, w * p, p));
  blit(ctx, pixels, ox, oy, p);
}

// (`redraw`: he's changed his clothes, so he's drawn on it again)
export function createBike(scene, redraw = false) {
  const rider = farmer();
  look = { ...rider, palette: { ...rider.palette, ...BIKE_COLOURS } };
  [['player-bike', ART_PX], ['player-bike-px', 1]].forEach(([key, p]) => {
    if (scene.textures.exists(key) && !redraw) return;
    const fw = BIKE_W * p;
    const fh = FRAME_H * p;
    const tex = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.createCanvas(key, fw * 4, fh * DIRECTIONS.length);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, tex.width, tex.height);
    DIRECTIONS.forEach((dir, row) => {
      const side = dir === 'left' || dir === 'right';
      for (let f = 0; f < 4; f++) {
        drawBikeFrame(ctx, f * fw, row * fh, buildBikeFrame(dir, f), p, BIKE_SHADOW[side ? 'side' : 'end']);
        tex.add(row * 4 + f, 0, f * fw, row * fh, fw, fh);
      }
      anim(scene, { key: `${key}-walk-${dir}`, frames: [0, 1, 2, 3].map(f => ({ key, frame: row * 4 + f })), frameRate: 10, repeat: -1 });
      anim(scene, { key: `${key}-idle-${dir}`, frames: [{ key, frame: row * 4 }], frameRate: 1, repeat: -1 });
    });
    tex.refresh();
    if (p === 1) tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
  [['bike', ART_PX], ['bike-px', 1]].forEach(([key, p]) => {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, BIKE_W * p, FRAME_H * p);
    drawBikeFrame(tex.getContext(), 0, 0, buildParkedBike(), p, BIKE_SHADOW.side);
    tex.refresh();
    if (p === 1) tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
  look = FARMER;
}
