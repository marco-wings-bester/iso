import Phaser from 'phaser';
import { obj, rng } from './pixelArt.js';
import { today } from './days.js';
import { hasFlag } from './state.js';
import { WEDNESDAY } from './chores.js';

// Building interiors, drawn as pixel art in the map's style (dark outlines,
// three-tone shading lit from the top-left). Units are sprite pixels, the same
// as the farmer's, so inside he's shown at his true size relative to the room.
//
// Each room: w/h, back-wall height `wallH`, `door` gap in the bottom wall,
// `solid` furniture rects (blocked for walking), `draw(ctx)`, and optional
// `spots`: things to tap (area) that the farmer walks to (stand)
// and uses — `read` the recipe book at the bookshelf, `cook` at the kitchen
// cupboard (bakes the pie), `eat` half the pie, `hide` Bob in the chest,
// `sleep` in the bed, `fire`: look into the
// fireplace (a first-person view); `picker`, `crowbar`, `knife`, `shovel`: things lying
// about in the tool shed, there from the start, but taken only once the
// story gives him a reason to (`need`; till then he leaves it) (their `prop` is drawn apart from the room so it
// can go; taking one sets `flag` and he thinks hint line `found`). The farmhouse's `kitchen` has the places
// and overlays the baking uses (src/baking.js).

export const WALL = 6; // side/bottom wall thickness

const C = {
  woodHi: '#e0a868', woodLt: '#c88a52', wood: '#a86a3c', woodDk: '#8c5838', woodDkr: '#7a4a2a',
  woodDeep: '#5a3418', seam: '#4a2a14',
  strawHi: '#f8d870', straw: '#e0b050', strawDk: '#b88038',
  red: '#d04c3a', redHi: '#f07a5a', redDk: '#982f2a',
  linen: '#f8f0e0', linenDk: '#d8ccb8', white: '#ffffff',
  stoneHi: '#c4c4bc', stone: '#a8a8a0', stoneDk: '#88887e', stoneDkr: '#686860',
  metalHi: '#d0d8e0', metal: '#a0a8b4', metalDk: '#5a6070',
  leaf: '#5f9e38', leafHi: '#8cc850', leafDk: '#3f7228',
  glass: '#a8d8f0', glassDk: '#80b8dc', glint: '#e8f8ff',
  dark: '#2e1d0c',
};

const fill = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const SHADOW = 'rgba(40, 20, 0, 0.28)';
const drop = (ctx, x, y, w, h) => fill(ctx, x + 1, y + h + 1, w, 2, SHADOW);

// ── Floors & walls ────────────────────────────────────────────────────────

function planks(ctx, x0, y0, w, h, t, seed) {
  const R = rng(seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  for (let y = y0; y < y0 + h; y += 6) {
    fill(ctx, x0, y, w, 6, t.base);
    fill(ctx, x0, y, w, 1, t.hi);
    fill(ctx, x0, y + 5, w, 1, t.seam);
    for (let x = x0 - Math.floor(R() * 30); x < x0 + w; x += 24 + Math.floor(R() * 20)) {
      fill(ctx, x, y, 1, 5, t.seam);
      fill(ctx, x + 1, y + 1, 1, 4, t.hi);
    }
    for (let i = 0; i < w / 14; i++) {
      fill(ctx, x0 + Math.floor(R() * w), y + 2 + Math.floor(R() * 2), 2 + Math.floor(R() * 4), 1, t.grain);
    }
  }
  ctx.restore();
}

function strawFloor(ctx, x0, y0, w, h, seed) {
  const R = rng(seed);
  fill(ctx, x0, y0, w, h, '#c89a60');
  for (let i = 0; i < (w * h) / 20; i++) {
    fill(ctx, x0 + Math.floor(R() * w), y0 + Math.floor(R() * h), 2, 1, R() < 0.5 ? '#b08450' : '#d6aa70');
  }
  for (let i = 0; i < (w * h) / 45; i++) {
    const x = x0 + Math.floor(R() * w);
    const y = y0 + Math.floor(R() * h);
    const c = R() < 0.5 ? C.strawHi : C.straw;
    const len = 3 + Math.floor(R() * 3);
    const dy = R() < 0.5 ? 0 : 1;
    for (let k = 0; k < len; k++) fill(ctx, x + k, y + (dy ? Math.floor(k / 2) : 0), 1, 1, c);
  }
}

function boardWall(ctx, w, h, tones, seed) {
  const R = rng(seed);
  for (let x = 0, i = 0; x < w; x += 6, i++) {
    fill(ctx, x, 0, 6, h, tones[i % 2]);
    fill(ctx, x, 0, 1, h, tones[2]);
    if (R() < 0.5) fill(ctx, x + 2 + Math.floor(R() * 2), 6 + Math.floor(R() * (h - 12)), 2, 2, tones[2]);
  }
}

// Ceiling edge, wall-floor shadow and the side/bottom walls with the door gap.
function frame(ctx, room) {
  const { w, h, wallH, door } = room;
  fill(ctx, 0, 0, w, 4, C.woodDeep);
  fill(ctx, 0, 4, w, 1, C.dark);
  fill(ctx, 0, wallH, w, 3, SHADOW);

  const strip = (x, y, sw, sh) => {
    fill(ctx, x, y, sw, sh, '#6b4226');
    fill(ctx, x, y, sw, 1, C.woodDk);
  };
  strip(0, 0, WALL, h);
  strip(w - WALL, 0, WALL, h);
  fill(ctx, WALL, 0, 1, h, C.dark);
  fill(ctx, w - WALL - 1, 0, 1, h, C.dark);
  strip(0, h - WALL, door.x, WALL);
  strip(door.x + door.w, h - WALL, w - door.x - door.w, WALL);
  fill(ctx, WALL, h - WALL - 1, door.x - WALL, 1, C.dark);
  fill(ctx, door.x + door.w, h - WALL - 1, w - WALL - door.x - door.w, 1, C.dark);
  // door posts
  fill(ctx, door.x - 2, h - WALL - 1, 2, WALL + 1, C.dark);
  fill(ctx, door.x + door.w, h - WALL - 1, 2, WALL + 1, C.dark);
}

function doormat(ctx, room) {
  const x = room.door.x + 1;
  const y = room.h - WALL - 10;
  const w = room.door.w - 2;
  fill(ctx, x, y, w, 8, C.strawDk);
  for (let i = 0; i < 8; i += 2) fill(ctx, x + 1, y + i, w - 2, 1, i % 4 ? C.straw : '#a06a30');
  fill(ctx, x, y + 7, w, 1, C.woodDeep);
}

// ── Furniture & props ─────────────────────────────────────────────────────

function windowPane(ctx, x, y) {
  obj(ctx, x, y, 22, 18, r => {
    r(0, 0, 22, 18, C.woodDk);
    r(2, 2, 18, 13, C.glass);
    r(2, 9, 18, 6, C.glassDk);
    r(10, 2, 2, 13, C.woodDk);
    r(2, 8, 18, 1, C.woodDk);
    r(3, 3, 3, 1, C.glint);
    r(3, 4, 1, 2, C.glint);
    r(13, 3, 2, 1, C.glint);
    r(0, 15, 22, 3, C.woodLt);
    r(0, 17, 22, 1, C.wood);
  });
  [x - 3, x + 21].forEach(cx => obj(ctx, cx, y - 1, 4, 15, r => {
    r(0, 0, 4, 15, C.red);
    r(2, 0, 2, 15, C.redDk);
    r(0, 0, 1, 15, C.redHi);
  }));
}

// Light from a window falling across the floor
function windowLight(ctx, x, y, w = 22, len = 26) {
  for (let i = 0; i < len; i++) fill(ctx, x + Math.floor(i * 0.5), y + i, w, 1, 'rgba(255, 238, 180, 0.16)');
}

function fireplace(ctx, x, y) {
  obj(ctx, x, y, 32, 40, r => {
    r(0, 0, 32, 40, C.stone);
    for (let row = 0, yy = 0; yy < 40; yy += 6, row++) {
      r(0, yy + 5, 32, 1, C.stoneDk);
      for (let xx = row % 2 ? 4 : 0; xx < 32; xx += 9) {
        r(xx, yy, 1, 5, C.stoneDk);
        r(xx + 1, yy, 4, 1, C.stoneHi);
      }
    }
    r(7, 20, 18, 20, C.dark);
    r(8, 19, 16, 1, C.dark);
    r(10, 18, 12, 1, C.dark);
    r(8, 34, 16, 6, '#4a1e10');
    r(9, 36, 14, 3, C.woodDkr);
  });
  obj(ctx, x - 2, y + 11, 36, 4, r => {
    r(0, 0, 36, 4, C.wood);
    r(0, 0, 36, 1, C.woodLt);
    r(0, 3, 36, 1, C.woodDkr);
  });
  obj(ctx, x - 3, y + 40, 38, 5, r => {
    r(0, 0, 38, 5, C.stoneDk);
    r(0, 0, 38, 1, C.stone);
    r(9, 1, 1, 4, C.stoneDkr);
    r(22, 1, 1, 4, C.stoneDkr);
  });
  // candle and a little jug on the mantel
  obj(ctx, x + 3, y + 6, 3, 5, r => { r(0, 0, 3, 5, C.linen); r(2, 0, 1, 5, C.linenDk); });
  fill(ctx, x + 4, y + 3, 1, 2, C.strawHi);
  obj(ctx, x + 24, y + 5, 5, 6, r => { r(0, 1, 5, 5, '#5b86c4'); r(1, 0, 3, 1, '#5b86c4'); r(3, 1, 2, 5, '#3f5f96'); });
}

function bed(ctx, x, y) {
  drop(ctx, x, y, 28, 44);
  obj(ctx, x, y, 28, 44, r => {
    r(0, 0, 28, 10, C.woodDk);
    r(0, 0, 28, 2, C.wood);
    r(4, 3, 20, 5, C.woodDkr);
    r(0, 0, 3, 12, C.woodDkr);
    r(25, 0, 3, 12, C.woodDkr);
    r(0, 0, 3, 2, C.woodLt);
    r(25, 0, 3, 2, C.woodLt);
    r(2, 10, 24, 30, C.linen);
    r(5, 11, 18, 7, C.white);
    r(5, 16, 18, 2, C.linenDk);
    r(2, 19, 24, 3, C.linen);
    r(2, 21, 24, 1, C.linenDk);
    r(2, 22, 24, 18, C.red);
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 6; i++) if ((i + j) % 2) r(2 + i * 4, 22 + j * 4 + 1, 4, 4, C.redHi);
    }
    r(2, 22, 1, 18, C.redHi);
    r(24, 22, 2, 18, C.redDk);
    r(0, 39, 28, 5, C.woodDk);
    r(0, 39, 28, 1, C.wood);
    r(0, 39, 3, 5, C.woodDkr);
    r(25, 39, 3, 5, C.woodDkr);
  });
}

// Returns the books it drew (room coords) so one can be taken off the shelf.
// The farmer tucked up in bed, drawn over the bed: head on the pillow, eyes
// closed, a hand on the sheet, his shape under the quilt and his hat on the
// bedpost. (bx, by) is the bed's top-left within the overlay canvas.
function sleeper(ctx, bx, by) {
  const SK = '#f8c8a0', SKd = '#d89870', HAIR = '#8c5430', HAIRd = '#5e3820';
  obj(ctx, bx + 10, by + 11, 8, 8, r => {
    r(0, 0, 8, 8, SK);
    r(0, 0, 8, 3, HAIR);
    r(0, 0, 8, 1, HAIRd);
    r(0, 3, 1, 2, HAIR);
    r(7, 3, 1, 2, HAIR);
    r(1, 5, 2, 1, HAIRd);  // closed eyes
    r(5, 5, 2, 1, HAIRd);
    r(1, 6, 1, 1, '#f0a0a0');
    r(6, 6, 1, 1, '#f0a0a0');
    r(0, 7, 8, 1, SKd);
  });
  // sheet folded up to his chin
  fill(ctx, bx + 2, by + 19, 24, 3, C.linen);
  fill(ctx, bx + 2, by + 21, 24, 1, C.linenDk);
  fill(ctx, bx + 2, by + 19, 24, 1, C.white);
  obj(ctx, bx + 7, by + 19, 3, 2, r => { r(0, 0, 3, 2, SK); r(0, 1, 3, 1, SKd); });
  // his shape under the quilt
  const fold = 'rgba(70, 10, 0, 0.35)';
  const sheen = 'rgba(255, 255, 255, 0.18)';
  fill(ctx, bx + 7, by + 23, 1, 13, fold);
  fill(ctx, bx + 21, by + 23, 1, 13, fold);
  fill(ctx, bx + 8, by + 36, 13, 1, fold);
  fill(ctx, bx + 8, by + 23, 2, 12, sheen);
  fill(ctx, bx + 13, by + 30, 2, 5, fold);
  // straw hat hung on the bedpost
  obj(ctx, bx + 22, by - 5, 10, 5, r => {
    r(2, 0, 6, 3, C.strawHi);
    r(2, 2, 6, 1, '#a83a2c');
    r(0, 3, 10, 2, C.straw);
    r(0, 4, 10, 1, C.strawDk);
  });
}

function bookshelf(ctx, x, y, seed) {
  const R = rng(seed);
  const drawn = [];
  const books = [C.red, '#5b86c4', C.leaf, C.straw, C.woodDkr, '#8a5ab0', C.linen];
  drop(ctx, x, y, 24, 34);
  obj(ctx, x, y, 24, 34, r => {
    r(0, 0, 24, 34, C.woodDkr);
    r(0, 0, 24, 2, C.wood);
    for (let s = 0; s < 3; s++) {
      const sy = 3 + s * 10;
      r(2, sy, 20, 8, C.seam);
      for (let bx = 2; bx < 21;) {
        const bw = 2 + Math.floor(R() * 2);
        const bh = 5 + Math.floor(R() * 3);
        if (R() < 0.12) { bx += bw; continue; }
        const c = books[Math.floor(R() * books.length)];
        r(bx, sy + 8 - bh, Math.min(bw, 22 - bx), bh, c);
        drawn.push({ x: x + bx, y: y + sy + 8 - bh, w: Math.min(bw, 22 - bx), h: bh, shelf: s, c });
        r(bx, sy + 8 - bh, 1, bh, 'rgba(255,255,255,0.25)');
        bx += bw;
      }
      r(0, sy + 8, 24, 2, C.woodDk);
    }
    r(0, 32, 24, 2, C.woodDeep);
  });
  return drawn;
}

// The tractor's keys, left on the bookshelf: a steel key on a ring, its
// green tag hanging over the edge of the middle shelf.
function tractorKeys(ctx, x, y) {
  obj(ctx, x, y, 4, 3, r => { r(0, 0, 4, 3, C.metal); r(1, 1, 2, 1, C.dark); r(0, 0, 4, 1, C.metalHi); });
  obj(ctx, x + 4, y + 1, 4, 2, r => { r(0, 0, 4, 2, C.metal); r(0, 0, 4, 1, C.metalHi); r(3, 1, 1, 1, C.metalDk); });
  obj(ctx, x + 1, y + 3, 3, 4, r => { r(0, 0, 3, 4, '#3a9a4a'); r(0, 0, 1, 4, '#6ac070'); });
}

function table(ctx, x, y) {
  drop(ctx, x, y, 32, 20);
  obj(ctx, x, y, 32, 20, r => {
    r(0, 0, 32, 14, C.woodLt);
    r(0, 0, 32, 1, C.woodHi);
    r(2, 5, 6, 1, C.wood);
    r(25, 9, 5, 1, C.wood);
    r(8, 0, 16, 14, C.linen);
    for (let i = 0; i < 16; i += 2) { r(8 + i, 0, 1, 1, C.red); r(8 + i, 13, 1, 1, C.red); }
    r(8, 12, 16, 1, C.linenDk);
    r(0, 14, 32, 3, C.woodDk);
    r(1, 17, 3, 3, C.woodDkr);
    r(28, 17, 3, 3, C.woodDkr);
  });
  // a mug (the pie goes on the cloth once it's baked)
  obj(ctx, x + 26, y + 3, 3, 4, r => { r(0, 0, 3, 4, '#5b86c4'); r(2, 0, 1, 4, '#3f5f96'); });
}

// The pie on its plate, `left` of its 8 columns not yet eaten (crumbs where
// it's gone); `raw` is pale, before baking. Body 10×6 at (x, y), outline one
// pixel around.
function piePlate(ctx, x, y, left = 8, raw = false) {
  const [crust, lattice, top] = raw ? ['#f0d8a8', '#d8b880', '#fff0c8'] : ['#e09848', C.strawDk, C.straw];
  obj(ctx, x, y, 10, 6, r => {
    r(0, 0, 10, 6, C.linenDk);
    if (left < 8) { r(7, 2, 1, 1, C.strawDk); r(4, 3, 1, 1, C.straw); }
    if (!left) return;
    r(1, 0, left, 5, crust);
    [2, 5].forEach(lx => { if (lx < 1 + left) r(lx, 1, 1, 3, lattice); });
    r(1, 2, left, 1, lattice);
    r(1, 0, left, 1, top);
  });
}

// The pie as a texture (12×8, outline included); returns its key.
export function pieTexture(scene, left = 8, raw = false) {
  const key = `pie-${left}${raw ? '-raw' : ''}`;
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, 12, 8);
    piePlate(tex.getContext(), 1, 1, left, raw);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  return key;
}

// The kitchen dresser: plates and jars on open shelves, a worktop, and the
// cupboard underneath where the baking things are kept. 16×42.
function dresser(ctx, x, y) {
  drop(ctx, x, y, 16, 42);
  obj(ctx, x, y, 16, 42, r => {
    r(0, 0, 16, 42, C.woodDk);
    r(0, 0, 16, 2, C.wood);
    r(2, 3, 12, 19, C.seam);
    r(2, 12, 12, 1, C.woodDk);
    [2, 6, 10].forEach(px => { r(px, 5, 4, 6, C.linen); r(px + 1, 7, 2, 2, '#5b86c4'); });
    r(3, 15, 3, 7, C.glass); r(3, 15, 3, 1, C.redDk);
    r(7, 16, 3, 6, C.straw); r(7, 16, 3, 1, C.woodDkr);
    r(11, 17, 2, 5, C.glassDk);
    r(0, 22, 16, 3, C.woodLt);
    r(0, 22, 16, 1, C.woodHi);
    r(1, 26, 6, 13, C.wood); r(9, 26, 6, 13, C.wood);
    r(1, 26, 6, 1, C.woodLt); r(9, 26, 6, 1, C.woodLt);
    r(6, 31, 1, 2, C.strawHi); r(9, 31, 1, 2, C.strawHi);
    r(0, 40, 16, 2, C.woodDeep);
  });
}

// The dresser's cupboard opened: a sack of flour and a sugar jar inside (no
// apples: those are on the trees), the doors swung out. (x, y) is the
// dresser's top-left in the overlay canvas.
function dresserOpen(ctx, x, y) {
  fill(ctx, x + 1, y + 26, 14, 13, C.seam);
  obj(ctx, x + 2, y + 30, 5, 8, r => { r(0, 0, 5, 8, C.linen); r(0, 0, 5, 2, C.linenDk); r(1, 4, 3, 2, C.linenDk); });
  obj(ctx, x + 9, y + 32, 4, 6, r => { r(0, 1, 4, 5, C.white); r(3, 1, 1, 5, C.linenDk); r(0, 0, 4, 1, C.redDk); });
  [x - 2, x + 16].forEach(dx => obj(ctx, dx, y + 26, 2, 13, r => { r(0, 0, 2, 13, C.wood); r(0, 0, 1, 13, C.woodLt); }));
}

// The apple picker: a long pole with a little wire basket on top for the
// apples out of reach, leaning in a corner of the tool shed. 6×48.
function applePicker(ctx, x, y) {
  obj(ctx, x + 2, y + 7, 2, 41, r => { r(0, 0, 2, 41, C.wood); r(0, 0, 1, 41, C.woodLt); });
  obj(ctx, x, y, 6, 7, r => {
    r(0, 0, 1, 3, C.metal); r(2, 0, 1, 2, C.metal); r(5, 0, 1, 3, C.metal);
    r(0, 3, 6, 4, C.metalDk); r(1, 3, 4, 3, C.seam);
  });
}

// A crowbar: a red-painted iron bar, hooked at one end, a claw at the other.
// 15×3, lying flat.
function crowbar(ctx, x, y) {
  obj(ctx, x, y, 15, 3, r => {
    r(0, 0, 2, 3, C.redDk);
    r(1, 1, 14, 1, C.red);
    r(2, 1, 11, 1, C.redHi);
    r(13, 0, 2, 1, C.metal);
    r(13, 2, 2, 1, C.metalDk);
  });
}

// A fishing rod lying on two pegs: a long thin pole, its reel and cork grip. 40×3.
function fishingRod(ctx, x, y) {
  obj(ctx, x, y + 1, 40, 1, r => { r(0, 0, 40, 1, C.woodDk); r(28, 0, 12, 1, C.strawDk); });
  obj(ctx, x + 30, y, 4, 3, r => { r(0, 0, 4, 3, C.metalDk); r(1, 1, 2, 1, C.metal); });
}

// A spade, standing on its blade: a wooden shaft with a D-grip. 6×26.
function spade(ctx, x, y) {
  obj(ctx, x + 1, y, 4, 3, r => { r(0, 0, 4, 1, C.woodDk); r(0, 0, 1, 3, C.woodDk); r(3, 0, 1, 3, C.woodDk); r(0, 2, 4, 1, C.woodDk); });
  obj(ctx, x + 2, y + 3, 2, 15, r => { r(0, 0, 2, 15, C.wood); r(0, 0, 1, 15, C.woodLt); });
  obj(ctx, x, y + 18, 6, 8, r => { r(0, 0, 6, 6, C.metal); r(0, 0, 6, 1, C.metalHi); r(1, 6, 4, 2, C.metal); r(5, 1, 1, 5, C.metalDk); });
}

// A kitchen knife: a wooden handle and a steel blade. 11×3.
function knife(ctx, x, y) {
  obj(ctx, x, y, 11, 3, r => {
    r(0, 0, 4, 3, C.woodDk);
    r(1, 1, 2, 1, C.wood);
    r(4, 0, 7, 2, C.metal);
    r(4, 0, 6, 1, C.metalHi);
    r(4, 2, 5, 1, C.metalDk);
  });
}

// A little cast-iron cooking stove with an oven, its pipe going up the wall.
// 14×28.
function stove(ctx, x, y) {
  obj(ctx, x + 8, 3, 3, y - 2, r => { r(0, 0, 3, y, '#3a3a40'); r(0, 0, 1, y, '#5a5a64'); });
  drop(ctx, x, y + 6, 14, 22);
  obj(ctx, x, y, 14, 28, r => {
    r(0, 0, 14, 6, '#4a4a52');
    r(0, 0, 14, 1, '#6a6a74');
    r(2, 1, 4, 3, '#2a2a30'); r(8, 1, 4, 3, '#2a2a30');
    r(0, 6, 14, 22, '#34343a');
    r(0, 6, 14, 1, '#5a5a64');
    r(2, 8, 10, 4, '#24242a');
    r(3, 9, 8, 1, '#a04020');
    r(2, 14, 10, 10, '#2a2a30');
    r(2, 14, 10, 1, '#5a5a64');
    r(4, 15, 6, 1, C.metal);
    r(1, 26, 2, 2, '#24242a'); r(11, 26, 2, 2, '#24242a');
  });
}

// The oven door let down: the hot inside glowing. (x, y) is the stove's
// top-left in the overlay canvas.
function ovenOpen(ctx, x, y) {
  fill(ctx, x + 2, y + 14, 10, 10, '#1a1210');
  fill(ctx, x + 3, y + 20, 8, 3, '#c05020');
  fill(ctx, x + 3, y + 22, 8, 1, '#f08a30');
  obj(ctx, x + 2, y + 24, 10, 3, r => { r(0, 0, 10, 3, '#4a4a52'); r(0, 0, 10, 1, '#6a6a74'); });
}

// A chair facing the room, standing behind the table (its seat and legs
// are hidden by the tabletop).
function seatChair(ctx, x, y) {
  obj(ctx, x, y, 14, 13, r => {
    r(1, 0, 12, 2, C.woodDk);
    r(1, 0, 12, 1, C.wood);
    r(1, 2, 2, 7, C.woodDk);
    r(11, 2, 2, 7, C.woodDk);
    r(3, 5, 8, 1, C.woodDkr);
    r(0, 8, 14, 5, C.wood);
    r(0, 8, 14, 1, C.woodLt);
  });
}

function chair(ctx, x, y, flip) {
  drop(ctx, x, y, 10, 16);
  obj(ctx, x, y, 10, 16, r => {
    const bx = flip ? 7 : 0;
    r(0, 6, 10, 6, C.wood);
    r(0, 6, 10, 1, C.woodLt);
    r(bx, 0, 3, 12, C.woodDk);
    r(bx, 0, 3, 1, C.wood);
    r(0, 12, 2, 4, C.woodDkr);
    r(8, 12, 2, 4, C.woodDkr);
  });
}

function rug(ctx, x, y, w, h) {
  fill(ctx, x, y, w, h, '#7a2a20');
  fill(ctx, x + 1, y + 1, w - 2, h - 2, '#b8402e');
  fill(ctx, x + 3, y + 3, w - 6, h - 6, C.strawHi);
  fill(ctx, x + 4, y + 4, w - 8, h - 8, '#b8402e');
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);
  for (let i = 0; i < 7; i++) {
    fill(ctx, cx - i, cy - 6 + i, 1, 1, C.strawHi);
    fill(ctx, cx + i, cy - 6 + i, 1, 1, C.strawHi);
    fill(ctx, cx - i, cy + 6 - i, 1, 1, C.strawHi);
    fill(ctx, cx + i, cy + 6 - i, 1, 1, C.strawHi);
  }
  fill(ctx, cx - 1, cy - 1, 3, 3, '#d8604a');
  for (let i = 2; i < h - 2; i += 2) { fill(ctx, x - 2, y + i, 2, 1, C.linen); fill(ctx, x + w, y + i, 2, 1, C.linen); }
}

function plant(ctx, x, y) {
  drop(ctx, x + 2, y + 14, 10, 8);
  obj(ctx, x, y, 14, 15, r => {
    r(4, 0, 6, 15, C.leafDk);
    r(0, 4, 6, 6, C.leaf);
    r(8, 1, 6, 7, C.leaf);
    r(3, 8, 8, 7, C.leaf);
    r(1, 4, 2, 1, C.leafHi); r(9, 2, 2, 1, C.leafHi); r(5, 9, 2, 1, C.leafHi); r(5, 1, 2, 2, C.leafHi);
  });
  obj(ctx, x + 2, y + 14, 10, 8, r => {
    r(0, 0, 10, 8, '#c8603a');
    r(0, 0, 10, 2, '#e07850');
    r(7, 2, 3, 6, '#a0482a');
  });
}

function chest(ctx, x, y) {
  drop(ctx, x, y, 22, 16);
  obj(ctx, x, y, 22, 16, r => {
    r(0, 0, 22, 6, C.wood);
    r(0, 0, 22, 1, C.woodLt);
    r(0, 6, 22, 10, C.woodDk);
    r(0, 6, 22, 1, C.dark);
    r(4, 0, 2, 16, C.metalDk);
    r(16, 0, 2, 16, C.metalDk);
    r(4, 0, 2, 1, C.metal);
    r(16, 0, 2, 1, C.metal);
    r(10, 5, 2, 3, C.strawHi);
  });
}

// The chest with its lid up: the lid standing open behind, dark inside.
// (x, y) is the chest's top-left in the overlay canvas.
function chestOpen(ctx, x, y) {
  obj(ctx, x, y - 8, 22, 7, r => {
    r(0, 0, 22, 7, C.woodDk);
    r(0, 0, 22, 1, C.wood);
    r(4, 0, 2, 7, C.metalDk);
    r(16, 0, 2, 7, C.metalDk);
  });
  obj(ctx, x, y, 22, 6, r => {
    r(0, 0, 22, 6, C.seam);
    r(0, 0, 22, 1, C.woodDk);
    r(1, 4, 20, 2, '#3a2a1a');
  });
}

// Just the chest's lid (to give it a little wobble with someone inside).
function chestLid(ctx, x, y) {
  obj(ctx, x, y, 22, 6, r => {
    r(0, 0, 22, 6, C.wood);
    r(0, 0, 22, 1, C.woodLt);
    r(4, 0, 2, 6, C.metalDk);
    r(16, 0, 2, 6, C.metalDk);
    r(4, 0, 2, 1, C.metal);
    r(16, 0, 2, 1, C.metal);
    r(10, 5, 2, 1, C.strawHi);
  });
}

function hayBale(ctx, x, y, seed) {
  const R = rng(seed);
  drop(ctx, x, y, 20, 12);
  obj(ctx, x, y, 20, 12, r => {
    r(0, 0, 20, 12, C.straw);
    r(0, 0, 20, 4, C.strawHi);
    r(0, 10, 20, 2, C.strawDk);
    for (let i = 0; i < 10; i++) r(Math.floor(R() * 17), 4 + Math.floor(R() * 6), 3, 1, C.strawDk);
    r(5, 0, 1, 12, C.woodDk);
    r(14, 0, 1, 12, C.woodDk);
  });
}

function hayPile(ctx, x, y, seed) {
  const R = rng(seed);
  obj(ctx, x, y, 32, 14, r => {
    [[8, 0, 16, 2], [4, 2, 24, 3], [1, 5, 30, 4], [0, 9, 32, 5]].forEach(([a, b, c, d]) => r(a, b, c, d, C.straw));
    r(9, 0, 8, 1, C.strawHi); r(5, 2, 10, 2, C.strawHi); r(2, 5, 8, 2, C.strawHi);
    r(0, 12, 32, 2, C.strawDk);
    for (let i = 0; i < 14; i++) r(2 + Math.floor(R() * 27), 3 + Math.floor(R() * 9), 2, 1, i % 2 ? C.strawDk : C.strawHi);
  });
}

function barrel(ctx, x, y) {
  drop(ctx, x, y, 16, 20);
  obj(ctx, x, y, 16, 20, r => {
    r(0, 3, 16, 17, C.wood);
    r(0, 3, 3, 17, C.woodLt);
    r(12, 3, 4, 17, C.woodDkr);
    r(0, 0, 16, 4, C.woodDk);
    r(2, 1, 12, 2, C.woodDkr);
    [5, 15].forEach(by => { r(0, by, 16, 2, C.metalDk); r(0, by, 16, 1, C.metal); });
  });
}

function crate(ctx, x, y) {
  drop(ctx, x, y, 20, 16);
  obj(ctx, x, y, 20, 16, r => {
    r(0, 0, 20, 16, C.woodLt);
    r(0, 0, 20, 4, C.woodHi);
    r(0, 4, 20, 2, C.woodDk);
    r(0, 14, 20, 2, C.woodDk);
    r(0, 4, 2, 12, C.woodDk);
    r(18, 4, 2, 12, C.woodDk);
    for (let i = 0; i < 8; i++) { r(2 + i * 2, 6 + i, 2, 1, C.wood); r(16 - i * 2, 6 + i, 2, 1, C.wood); }
  });
}

function cow(ctx, x, y) {
  const W = '#f8f4ec', Wd = '#d8d0c4', B = '#2e2a28', P = '#f0a8a0';
  obj(ctx, x, y, 36, 24, r => {
    r(7, 17, 4, 7, Wd); r(12, 17, 4, 7, W); r(24, 17, 4, 7, Wd); r(29, 17, 4, 7, W);
    [7, 12, 24, 29].forEach(lx => r(lx, 22, 4, 2, B));
    r(6, 5, 29, 14, W);
    r(7, 4, 27, 1, W);
    r(6, 16, 29, 3, Wd);
    r(14, 6, 7, 5, B); r(17, 11, 5, 3, B); r(27, 7, 6, 6, B); r(9, 12, 4, 3, B);
    r(22, 18, 5, 3, P);
    r(35, 5, 1, 9, Wd); r(34, 13, 2, 3, B);
    r(0, 3, 9, 10, W);
    r(0, 9, 7, 5, P);
    r(1, 11, 1, 1, '#b87068'); r(4, 11, 1, 1, '#b87068');
    r(4, 5, 1, 2, B);
    r(5, 3, 4, 2, B);
    r(2, 0, 2, 3, C.linen); r(6, 0, 2, 3, C.linen);
    r(8, 3, 3, 2, Wd);
  });
}

function stalls(ctx, x, y) {
  // Floor inside the stalls gets extra straw, the divider and front rails go over the cow.
  strawFloor(ctx, x, y, 84, 52, 7);
  cow(ctx, x + 3, y + 18);
  // feed trough heaped with hay
  obj(ctx, x + 50, y + 20, 26, 10, r => {
    r(0, 2, 26, 8, C.woodDk);
    r(0, 2, 26, 1, C.wood);
    r(2, 1, 22, 3, C.straw);
    r(3, 0, 8, 1, C.strawHi); r(14, 0, 7, 1, C.strawHi);
  });
  obj(ctx, x + 56, y + 36, 8, 8, r => { r(0, 0, 8, 8, C.metal); r(0, 0, 8, 1, C.metalHi); r(5, 1, 3, 7, C.metalDk); r(1, 1, 6, 2, '#5b86c4'); });
  [0, 41, 80].forEach(px => obj(ctx, x + px, y, 4, 52, r => {
    r(0, 0, 4, 52, C.woodDk);
    r(0, 0, 1, 52, C.wood);
    r(0, 0, 4, 2, C.woodLt);
  }));
  [30, 40].forEach(ry => obj(ctx, x + 4, y + ry, 76, 3, r => {
    r(0, 0, 76, 3, C.wood);
    r(0, 0, 76, 1, C.woodLt);
    r(37, 0, 4, 3, C.woodDk);
  }));
  fill(ctx, x, y + 52, 84, 2, SHADOW);
}

function wallTool(ctx, x, y, kind) {
  obj(ctx, x, y + 6, 2, 30, r => { r(0, 0, 2, 30, C.wood); r(0, 0, 1, 30, C.woodLt); });
  if (kind === 'fork') {
    obj(ctx, x - 3, y, 8, 7, r => { r(0, 0, 1, 5, C.metal); r(3, 0, 2, 5, C.metal); r(7, 0, 1, 5, C.metal); r(0, 5, 8, 2, C.metalDk); });
  } else if (kind === 'rake') {
    obj(ctx, x - 5, y + 2, 12, 5, r => { r(0, 0, 12, 2, C.metalDk); for (let i = 0; i < 12; i += 2) r(i, 2, 1, 3, C.metal); });
  } else {
    obj(ctx, x - 3, y + 34, 8, 9, r => { r(0, 0, 8, 7, C.metal); r(1, 7, 6, 2, C.metal); r(0, 0, 8, 1, C.metalHi); r(6, 1, 2, 7, C.metalDk); });
  }
}

function toolRack(ctx, x, y) {
  obj(ctx, x, y, 40, 26, r => {
    r(0, 0, 40, 26, C.wood);
    r(0, 0, 40, 1, C.woodLt);
    for (let j = 3; j < 26; j += 5) for (let i = 3; i < 40; i += 5) r(i, j, 1, 1, C.woodDkr);
  });
  // saw
  obj(ctx, x + 3, y + 4, 14, 8, r => {
    r(0, 0, 4, 6, C.woodDk); r(1, 1, 2, 4, C.seam);
    r(4, 1, 10, 5, C.metal); r(4, 1, 10, 1, C.metalHi);
    for (let i = 4; i < 14; i += 2) r(i, 6, 1, 1, C.metalDk);
  });
  // hammer
  obj(ctx, x + 21, y + 3, 6, 13, r => { r(2, 3, 2, 10, C.wood); r(0, 0, 6, 3, C.metalDk); r(0, 0, 6, 1, C.metal); });
  // wrench
  obj(ctx, x + 31, y + 4, 4, 12, r => { r(1, 2, 2, 8, C.metal); r(0, 0, 4, 3, C.metal); r(1, 0, 2, 1, C.dark); r(0, 9, 4, 3, C.metal); r(2, 2, 1, 8, C.metalDk); });
  // pliers
  obj(ctx, x + 6, y + 15, 6, 9, r => { r(1, 0, 4, 3, C.metal); r(0, 3, 2, 6, C.red); r(4, 3, 2, 6, C.red); });
  // trowel
  obj(ctx, x + 18, y + 18, 12, 5, r => { r(0, 1, 4, 3, C.woodDk); r(4, 0, 8, 5, C.metal); r(4, 0, 8, 1, C.metalHi); });
}

function workbench(ctx, x, y) {
  drop(ctx, x, y, 48, 22);
  obj(ctx, x, y, 48, 22, r => {
    r(0, 0, 48, 7, C.woodLt);
    r(0, 0, 48, 1, C.woodHi);
    r(5, 3, 9, 1, C.wood); r(30, 4, 12, 1, C.wood);
    r(0, 7, 48, 11, C.woodDk);
    r(0, 7, 48, 1, C.dark);
    r(4, 9, 12, 6, C.wood); r(20, 9, 12, 6, C.wood);
    r(9, 11, 2, 2, C.strawHi); r(25, 11, 2, 2, C.strawHi);
    r(0, 18, 4, 4, C.woodDkr);
    r(44, 18, 4, 4, C.woodDkr);
  });
  // vise, a plank and a lantern on top
  obj(ctx, x + 37, y - 3, 8, 6, r => { r(0, 0, 8, 6, C.metalDk); r(0, 0, 8, 1, C.metal); r(3, 1, 2, 5, C.metal); });
  obj(ctx, x + 14, y + 1, 18, 3, r => { r(0, 0, 18, 3, C.woodHi); r(0, 2, 18, 1, C.wood); });
  obj(ctx, x + 4, y - 6, 6, 9, r => {
    r(1, 0, 4, 1, C.metalDk); r(0, 1, 6, 8, C.metalDk);
    r(1, 2, 4, 5, C.strawHi); r(2, 3, 2, 3, C.white);
  });
}

function sack(ctx, x, y) {
  drop(ctx, x, y, 14, 18);
  obj(ctx, x, y, 14, 18, r => {
    r(4, 0, 6, 3, '#d8b880');
    r(5, 3, 4, 1, C.woodDk);
    r(1, 4, 12, 14, '#d8b880');
    r(0, 7, 14, 10, '#d8b880');
    r(10, 6, 4, 11, '#b89860');
    r(2, 5, 3, 3, '#ecd4a0');
    r(4, 11, 6, 2, C.redDk);
  });
}

// ── The cafe ──────────────────────────────────────────────────────────────

// The chalkboard menu on the wall: a coffee cup and the prices in chalk.
function chalkboard(ctx, x, y) {
  obj(ctx, x, y, 28, 22, r => {
    r(0, 0, 28, 22, C.woodDk);
    r(0, 0, 28, 1, C.woodLt);
    r(2, 2, 24, 18, '#2e3a34');
    r(4, 7, 7, 6, C.linen); r(11, 8, 2, 3, C.linen); r(4, 12, 7, 1, C.linenDk); // a cup
    r(6, 4, 1, 2, C.linenDk); r(8, 3, 1, 3, C.linenDk);                        // its steam
    r(15, 5, 9, 1, C.linenDk); r(15, 8, 7, 1, C.linenDk); r(15, 11, 9, 1, C.linenDk);
    r(4, 15, 14, 1, C.linenDk); r(20, 14, 4, 3, C.strawHi);                      // and the price
  });
}

// The counter, along the back: its top (with the coffee machine, the till and
// the cake stand on it) and its panelled front. Drawn on its own, in front of
// whoever's behind it. (x, y): the top's front-left; w wide.
function cafeCounter(ctx, x, y, w) {
  // the coffee machine, steaming at the back left
  obj(ctx, x + 6, y - 22, 18, 20, r => {
    r(0, 0, 18, 20, C.metal); r(0, 0, 18, 2, C.metalHi); r(14, 2, 4, 18, C.metalDk);
    r(3, 5, 8, 5, '#2a2a30'); r(4, 6, 2, 1, C.red); r(7, 6, 2, 1, C.leafHi);
    r(5, 12, 4, 3, C.metalDk); r(5, 16, 5, 4, C.linen); r(9, 17, 2, 2, C.linen);
  });
  // the till
  obj(ctx, x + w - 46, y - 12, 14, 10, r => {
    r(0, 0, 14, 10, '#5a8ac8'); r(0, 0, 14, 2, '#8ab4e0'); r(2, 3, 10, 3, '#2a3a2a'); r(3, 4, 4, 1, C.leafHi);
  });
  // cakes under a glass dome
  obj(ctx, x + w - 26, y - 16, 20, 14, r => {
    r(1, 10, 18, 4, C.metalHi); r(2, 2, 16, 9, C.glass); r(4, 0, 12, 3, C.glass);
    r(4, 6, 6, 4, '#f0a8b8'); r(4, 5, 6, 1, C.white); r(11, 7, 5, 3, '#8c5838'); r(11, 6, 5, 1, C.strawHi);
    r(5, 2, 2, 1, C.glint);
  });
  obj(ctx, x, y, w, 20, r => {
    r(0, 0, w, 6, C.woodLt);
    r(0, 0, w, 1, C.woodHi);
    r(0, 6, w, 14, '#9cc8e4');
    r(0, 6, w, 1, C.dark);
    for (let px = 3; px < w - 4; px += 14) { r(px, 9, 10, 8, '#bcdcf0'); r(px, 16, 10, 1, '#7aa8c8'); }
    r(0, 18, w, 2, '#7aa8c8');
  });
  // two cups waiting on the counter
  [x + 32, x + 38].forEach(cx => obj(ctx, cx, y + 1, 3, 3, r => { r(0, 0, 3, 3, C.linen); r(2, 0, 1, 3, C.linenDk); }));
}

// A little round cafe table with a cup on it, and a chair each side.
function cafeTable(ctx, x, y) {
  chair(ctx, x - 9, y + 2, false);
  chair(ctx, x + 19, y + 2, true);
  drop(ctx, x, y, 18, 16);
  obj(ctx, x, y, 18, 16, r => {
    r(1, 0, 16, 9, C.linen); r(0, 1, 18, 7, C.linen); r(1, 8, 16, 1, C.linenDk);
    for (let i = 2; i < 16; i += 3) r(i, 0, 1, 1, '#5a8ac8');
    r(8, 9, 2, 5, C.metalDk); r(5, 14, 8, 2, C.metalDk);
  });
  obj(ctx, x + 7, y + 2, 4, 3, r => { r(0, 0, 4, 3, '#f8f0e0'); r(1, 0, 2, 1, '#6a3a1e'); });
}

// ── Faan's tailor shop, and the restaurant (in town) ──────────────────────

// A jacket on a hanger, `c` and its shade `d`: 8 wide, 20 tall.
function jacket(ctx, x, y, c, d) {
  obj(ctx, x + 3, y, 2, 2, r => r(0, 0, 2, 2, C.metal)); // the hook
  obj(ctx, x, y + 2, 8, 18, r => {
    r(0, 0, 8, 18, c);
    r(6, 0, 2, 18, d);
    r(3, 0, 2, 7, C.linen); r(3, 3, 1, 2, d); // shirt collar and lapel
    r(0, 17, 8, 1, d);
  });
}

// The clothes rail along the wall, hung with suits and jackets.
function clothesRail(ctx, x, y, w, seed) {
  const R = rng(seed);
  const SUITS = [['#2e2e38', '#1a1a20'], ['#34507a', '#243a5a'], ['#7a7a80', '#5a5a60'], ['#6a4a2a', '#4a3018'], ['#2e2e38', '#1a1a20'], ['#5a2a3a', '#3e1a28']];
  obj(ctx, x, y + 2, w, 2, r => { r(0, 0, w, 2, C.metal); r(0, 0, w, 1, C.metalHi); });
  obj(ctx, x, y + 2, 2, 32, r => r(0, 0, 2, 32, C.metalDk));
  obj(ctx, x + w - 2, y + 2, 2, 32, r => r(0, 0, 2, 32, C.metalDk));
  for (let jx = x + 3; jx + 8 < x + w - 2; jx += 7) {
    const [c, d] = SUITS[Math.floor(R() * SUITS.length)];
    jacket(ctx, jx, y + 3, c, d);
  }
}

// A tailor's dummy in a tuxedo, on its stand: 12 wide, 30 tall.
function dummy(ctx, x, y) {
  drop(ctx, x + 2, y + 26, 8, 4);
  obj(ctx, x + 5, y + 22, 2, 6, r => r(0, 0, 2, 6, C.woodDk));
  obj(ctx, x + 2, y + 27, 8, 2, r => r(0, 0, 8, 2, C.woodDk));
  obj(ctx, x, y, 12, 22, r => {
    r(2, 0, 8, 2, '#e8d8b8');                    // its neck
    r(0, 2, 12, 20, '#2e2e38'); r(9, 2, 3, 20, '#1a1a20');
    r(4, 2, 4, 12, C.linen); r(5, 3, 2, 1, '#141418'); // shirt and bow tie
    r(5, 6, 1, 1, '#141418'); r(5, 9, 1, 1, '#141418');
  });
}

// The counter, with a tape measure, scissors and a roll of cloth on it: 40×16.
function tailorCounter(ctx, x, y) {
  drop(ctx, x, y, 40, 16);
  obj(ctx, x, y, 40, 16, r => {
    r(0, 0, 40, 5, C.woodLt); r(0, 0, 40, 1, C.woodHi);
    r(0, 5, 40, 11, C.woodDk); r(0, 5, 40, 1, C.dark);
    for (let px = 3; px < 37; px += 12) { r(px, 8, 9, 6, C.wood); r(px, 13, 9, 1, C.woodDkr); }
  });
  obj(ctx, x + 4, y - 3, 12, 4, r => { r(0, 0, 12, 4, '#34507a'); r(0, 0, 12, 1, '#5a7aa8'); r(11, 0, 1, 4, '#243a5a'); }); // cloth
  obj(ctx, x + 20, y + 1, 5, 3, r => { r(0, 0, 5, 3, C.strawHi); r(2, 1, 1, 1, C.strawDk); }); // tape measure
  ctx.fillStyle = C.strawHi; ctx.fillRect(x + 25, y + 2, 6, 1);
  obj(ctx, x + 31, y + 1, 6, 3, r => { r(0, 0, 3, 3, C.red); r(3, 1, 3, 1, C.metal); }); // scissors
}

// The changing cubicle in the corner, its curtain drawn back (or `shut`): 26×46.
function cubicle(ctx, x, y, shut = false) {
  obj(ctx, x, y, 26, 2, r => { r(0, 0, 26, 2, C.woodDk); r(0, 0, 26, 1, C.wood); }); // curtain rail
  if (!shut) {
    fill(ctx, x + 1, y + 2, 24, 44, '#e8dcc0');
    obj(ctx, x + 1, y + 2, 6, 44, r => { r(0, 0, 6, 44, '#a8282a'); r(2, 0, 1, 44, '#7a1a1c'); r(4, 0, 1, 44, '#c84a3a'); });
    return;
  }
  obj(ctx, x + 1, y + 2, 24, 44, r => {
    r(0, 0, 24, 44, '#a8282a');
    for (let i = 2; i < 24; i += 4) { r(i, 0, 1, 44, '#7a1a1c'); r(i + 2, 0, 1, 44, '#c84a3a'); }
  });
}

// A tall mirror on its stand: 10×30.
function mirror(ctx, x, y) {
  drop(ctx, x, y + 26, 10, 4);
  obj(ctx, x, y, 10, 30, r => {
    r(0, 0, 10, 30, C.woodDk); r(0, 0, 10, 1, C.wood);
    r(1, 1, 8, 26, C.glass); r(1, 16, 8, 11, C.glassDk);
    r(2, 3, 1, 6, C.glint); r(3, 2, 2, 1, C.glint);
    r(1, 28, 2, 2, C.woodDkr); r(7, 28, 2, 2, C.woodDkr);
  });
}

// A restaurant table for two: a long white cloth, a candle, two plates and
// glasses; a chair each side. (x, y): the cloth's top left; 22×16.
function dinnerTable(ctx, x, y) {
  chair(ctx, x - 10, y + 1, false);
  chair(ctx, x + 22, y + 1, true);
  drop(ctx, x, y, 22, 16);
  obj(ctx, x, y, 22, 16, r => {
    r(0, 0, 22, 12, C.white); r(0, 10, 22, 6, C.linen); r(0, 15, 22, 1, C.linenDk);
    for (let i = 3; i < 22; i += 5) r(i, 11, 1, 5, C.linenDk);
    r(2, 3, 5, 4, C.linenDk); r(3, 4, 3, 2, C.white);   // plates
    r(15, 3, 5, 4, C.linenDk); r(16, 4, 3, 2, C.white);
  });
  obj(ctx, x + 10, y - 3, 2, 6, r => { r(0, 0, 2, 6, C.linen); r(1, 0, 1, 6, C.linenDk); }); // the candle
  obj(ctx, x + 7, y + 2, 1, 2, r => r(0, 0, 1, 2, C.glass));
  obj(ctx, x + 14, y + 2, 1, 2, r => r(0, 0, 1, 2, C.glass));
}

// The host's stand by the door, the bookings book open on it: 14×18.
function lectern(ctx, x, y) {
  drop(ctx, x, y, 14, 18);
  obj(ctx, x, y, 14, 18, r => {
    r(0, 0, 14, 4, C.woodLt); r(0, 0, 14, 1, C.woodHi);
    r(1, 4, 12, 14, C.woodDk); r(1, 4, 12, 1, C.dark); r(3, 7, 8, 8, C.wood);
  });
  obj(ctx, x + 2, y - 2, 10, 4, r => { r(0, 0, 10, 4, C.linen); r(5, 0, 1, 4, C.linenDk); r(1, 1, 3, 1, C.linenDk); r(7, 2, 2, 1, C.linenDk); });
}

// A painting in a gilt frame: the town's fountain, running.
function painting(ctx, x, y) {
  obj(ctx, x, y, 22, 16, r => {
    r(0, 0, 22, 16, C.strawDk); r(0, 0, 22, 1, C.strawHi);
    r(2, 2, 18, 12, '#9cc8e4'); r(2, 9, 18, 5, C.leaf);
    r(8, 7, 6, 4, C.stone); r(10, 4, 2, 3, C.stone); r(9, 3, 4, 1, C.glass);
  });
}

// ── Steffi's beach house ─────────────────────────────────────────────────

// A photo in a frame: Steffi as a little girl, red pigtails, with her oupa
// at the river, a gold pan between them. 26×22.
function portrait(ctx, x, y) {
  obj(ctx, x, y, 26, 22, r => {
    r(0, 0, 26, 22, C.woodDk); r(0, 0, 26, 1, C.wood);
    r(2, 2, 22, 18, '#b8d8e8'); r(2, 12, 22, 8, '#6aa8d0'); r(2, 11, 22, 1, '#e8d8a8'); // sky, the river
    r(4, 5, 4, 3, '#d8d8d8'); r(4, 8, 4, 7, '#7a6a5a'); r(5, 6, 2, 2, '#e8b080');          // oupa: white hair, brown jacket
    r(15, 9, 4, 3, '#c8482a'); r(14, 10, 1, 2, '#c8482a'); r(19, 10, 1, 2, '#c8482a');    // her, red pigtails
    r(16, 10, 2, 2, '#f8d0b0'); r(15, 12, 4, 4, '#e86a6a');
    r(9, 14, 6, 2, '#5a5e68'); r(11, 14, 1, 1, C.strawHi);                                 // the gold pan, a glint
  });
}

// A shelf on the wall, with shells, a starfish, and a jar of gold flakes. 32×14.
function shellShelf(ctx, x, y) {
  obj(ctx, x, y + 10, 32, 3, r => { r(0, 0, 32, 3, C.wood); r(0, 0, 32, 1, C.woodLt); });
  obj(ctx, x + 2, y + 5, 6, 5, r => { r(0, 1, 6, 4, '#f8e0d0'); r(1, 0, 4, 1, '#f8e0d0'); r(1, 2, 1, 3, '#e0b8a8'); r(3, 2, 1, 3, '#e0b8a8'); });
  obj(ctx, x + 10, y + 4, 7, 6, r => { r(3, 0, 1, 6, '#f08a4a'); r(0, 2, 7, 1, '#f08a4a'); r(1, 4, 5, 1, '#f08a4a'); });
  obj(ctx, x + 20, y, 8, 10, r => { r(0, 2, 8, 8, '#cfe8f0'); r(1, 0, 6, 2, C.woodDk); r(1, 6, 6, 3, C.strawHi); r(2, 5, 2, 1, C.straw); r(5, 7, 1, 1, '#fff8c0'); });
}

// A surfboard, standing on its tail in the corner. 9×40.
function surfboard(ctx, x, y) {
  drop(ctx, x, y + 36, 9, 4);
  obj(ctx, x, y, 9, 40, r => {
    r(2, 0, 5, 2, '#f8f4ec'); r(1, 2, 7, 36, '#f8f4ec'); r(2, 38, 5, 2, '#f8f4ec');
    r(4, 1, 1, 38, '#2a9ad0'); r(1, 10, 7, 2, '#f08a4a'); r(6, 2, 1, 36, '#d8d0c0');
  });
}

// A sofa against the wall, cushions plumped. 40×18.
function sofa(ctx, x, y) {
  drop(ctx, x, y, 40, 18);
  obj(ctx, x, y, 40, 18, r => {
    r(0, 0, 40, 9, '#4a8ab0'); r(0, 0, 40, 1, '#6aaad0');            // its back
    r(0, 9, 40, 7, '#5a9ac0'); r(0, 9, 40, 1, '#8ac0e0');            // the seat
    r(0, 2, 5, 14, '#3a7aa0'); r(35, 2, 5, 14, '#3a7aa0');           // arms
    r(7, 3, 9, 6, '#f8d870'); r(24, 3, 9, 6, '#f0a8b8');             // cushions
    r(2, 16, 3, 2, C.woodDkr); r(35, 16, 3, 2, C.woodDkr);
  });
}

// A round coffee table: a bottle of red wine on it. 22×14.
function wineTable(ctx, x, y) {
  drop(ctx, x, y, 22, 14);
  obj(ctx, x, y, 22, 14, r => {
    r(2, 0, 18, 9, C.woodLt); r(0, 2, 22, 5, C.woodLt); r(2, 0, 18, 1, C.woodHi);
    r(2, 8, 18, 2, C.woodDk); r(9, 10, 4, 4, C.woodDk);
  });
  obj(ctx, x + 9, y - 6, 4, 9, r => { r(1, 0, 2, 3, '#2a4a2a'); r(0, 3, 4, 6, '#3a1a2a'); r(0, 5, 4, 2, C.linen); });
}

// ── Rooms ─────────────────────────────────────────────────────────────────

const OAK = { base: '#b07a48', hi: '#c88f5a', seam: '#5a3418', grain: '#9a6a3c' };
const PINE = { base: '#8c6038', hi: '#a07048', seam: '#4a2a14', grain: '#7a5030' };

export const ROOMS = {
  house: {
    w: 144, h: 204, wallH: 44,
    door: { x: 60, w: 24 },
    spots: {
      read: {
        area: { x: 110, y: 14, w: 28, h: 40 }, // tap the bookshelf…
        stand: { x: 124, y: 57 },              // …to walk here and read the recipe book
      },
      // on Wednesday the tractor's keys are on the bookshelf (src/chores.js)
      keys: {
        area: { x: 110, y: 14, w: 28, h: 40 },
        stand: { x: 124, y: 57 },
        prop: { x: 126, y: 32, w: 10, h: 9, draw: ctx => tractorKeys(ctx, 1, 1) },
        flag: 'tractorKeys',
        found: 'tractorKeysFound',
        when: () => today() >= WEDNESDAY,
      },
      hide: {
        area: { x: 110, y: 126, w: 26, h: 22 }, // tap the big chest in the corner…
        stand: { x: 100, y: 152 },              // …to open it (for Bob to hide in, when Sarah knocks)
      },
      eat: {
        area: { x: 90, y: 90, w: 20, h: 16 },  // tap the pie on the table, once baked…
        stand: { x: 86, y: 88 },               // …to sit behind the table and have half
      },
      cook: {
        area: { x: 6, y: 6, w: 20, h: 48 },    // tap the kitchen cupboard…
        stand: { x: 29, y: 57 },               // …to walk beside it (and bake, once he's read the recipe)
      },
      sleep: {
        area: { x: 8, y: 146, w: 32, h: 50 },  // tap the bed…
        stand: { x: 46, y: 186 },              // …to walk beside it and get in
        overlay: { x: 6, y: 142, w: 38, h: 52, draw: ctx => sleeper(ctx, 4, 8) },
        zzz: { x: 28, y: 160 },
      },
      fire: {
        area: { x: 64, y: 4, w: 40, h: 48 }, // tap the fireplace…
        stand: { x: 84, y: 55 },             // …to crouch at the hearth and look in
      },
    },
    kitchen: {
      // he stands beside the cupboard and the stove, facing them, so they show
      cupboard: { stand: { x: 29, y: 57 }, open: { x: 4, y: 32, w: 24, h: 16, draw: ctx => dresserOpen(ctx, 4, -24) } },
      stove: { stand: { x: 47, y: 57 }, open: { x: 26, y: 34, w: 14, h: 16, draw: ctx => ovenOpen(ctx, 0, -12) }, vent: { x: 29, y: 31, w: 8, h: 1 } },
      // he works behind the table (stand), facing out; the chair behind it (seat:
      // middle of the table's back edge) is where the pie gets eaten
      table: { stand: { x: 86, y: 88 }, bowl: { x: 84, y: 94 }, pie: { x: 94, y: 95 }, seat: { x: 100, y: 91 } },
    },
    // the big chest, where Bob hides from Sarah: opened, its lid, where he
    // hops in from (behind it, Jones beside it), the crowbar prising it open,
    // where he waits (up from the table) to be hidden, and where Sarah waits
    // (when she knows he's in there)
    chest: {
      open: { x: 110, y: 121, w: 26, h: 17, draw: ctx => chestOpen(ctx, 2, 9) },
      lid: { x: 111, y: 129, w: 24, h: 8, draw: ctx => chestLid(ctx, 1, 1) },
      bar: { x: 0, y: 0, w: 17, h: 5, draw: ctx => crowbar(ctx, 1, 1), at: { x: 114, y: 136 } },
      behind: { x: 123, y: 124 },
      inside: { x: 123, y: 136 },
    },
    bobWaits: { x: 115, y: 77 },
    sarahWaits: { x: 84, y: 132 },
    solid: [
      { x: 8, y: 20, w: 16, h: 30 },   // kitchen dresser
      { x: 26, y: 30, w: 14, h: 20 },  // stove
      { x: 10, y: 150, w: 28, h: 44 }, // bed
      { x: 66, y: 40, w: 38, h: 10 },  // fireplace + hearth
      { x: 112, y: 16, w: 24, h: 34 }, // bookshelf
      { x: 72, y: 92, w: 56, h: 20 },  // table + chairs
      { x: 93, y: 80, w: 14, h: 12 },  // chair behind the table (Bob's)
      { x: 120, y: 176, w: 14, h: 22 }, // plant
      { x: 112, y: 130, w: 22, h: 16 }, // chest
    ],
    draw(ctx) {
      const { w, h, wallH } = this;
      planks(ctx, 0, wallH, w, h - wallH, OAK, 11);
      windowLight(ctx, 44, wallH, 22, 30);
      rug(ctx, 22, 98, 44, 30);
      doormat(ctx, this);
      // back wall: striped wallpaper over wood wainscot
      fill(ctx, 0, 0, w, wallH, '#efd9b0');
      for (let x = 3; x < w; x += 8) fill(ctx, x, 0, 2, wallH, '#e5cba0');
      fill(ctx, 0, wallH - 14, w, 12, C.wood);
      for (let x = 4; x < w; x += 12) fill(ctx, x, wallH - 12, 1, 10, C.woodDkr);
      fill(ctx, 0, wallH - 15, w, 2, C.woodLt);
      fill(ctx, 0, wallH - 13, w, 1, C.woodDeep);
      fill(ctx, 0, wallH - 2, w, 2, C.woodDeep);
      frame(ctx, this);
      windowPane(ctx, 44, 10);
      fireplace(ctx, 68, 6);
      // The recipe book he reads comes off the top shelf (visible above his hat).
      const books = bookshelf(ctx, 112, 16, 3).filter(b => b.shelf === 0);
      this.spots.read.book = books.find(b => b.c === C.red) || books[0];
      dresser(ctx, 8, 8);
      stove(ctx, 26, 22);
      bed(ctx, 10, 150);
      chair(ctx, 72, 94, false);
      chair(ctx, 118, 94, true);
      seatChair(ctx, 93, 78);
      table(ctx, 84, 92);
      plant(ctx, 120, 176);
      chest(ctx, 112, 130);
    },
    animate(scene) {
      flames(scene, 78, 33);
    },
  },

  // The Cozy Seaside Cafe at the beach (src/cafe.js): Marinel behind the
  // counter, coffee on the go. Out of the door is back to the beach.
  cafe: {
    w: 144, h: 172, wallH: 44,
    name: { af: 'Cozy Seaside Cafe', en: 'Cozy Seaside Cafe' },
    door: { x: 60, w: 24 },
    exit: { to: 'Beach', data: { at: { x: 776, y: 1806 }, out: true } }, // the foot of the deck's steps
    spots: {
      counter: {
        area: { x: 40, y: 20, w: 98, h: 52 }, // tap the counter…
        stand: { x: 84, y: 84 },              // …to walk up to it
      },
      // tap a table: sit down at it (on the chair nearer the room) and drink
      // his coffee (src/cafe.js): where he sits, facing it, and where his cup goes
      tableA: {
        area: { x: 12, y: 94, w: 46, h: 30 },
        stand: { x: 50, y: 125 },
        seat: { x: 50, y: 117, face: 'left', cup: { x: 40, y: 107 } },
      },
      tableB: {
        area: { x: 88, y: 118, w: 46, h: 30 },
        stand: { x: 98, y: 149 },
        seat: { x: 98, y: 141, face: 'right', cup: { x: 108, y: 131 } },
      },
      // tap the window at the back: look out at the garden behind the cafe
      window: {
        area: { x: 4, y: 4, w: 34, h: 32 },
        stand: { x: 21, y: 52 },
      },
    },
    // the counter (with what's on it) drawn over Marinel behind it, so she
    // shows from the waist up; steam curls up off the coffee machine
    counter: { x: 39, y: 31, w: 100, h: 44, depth: 70, draw: ctx => cafeCounter(ctx, 1, 23, 98) },
    sannie: { x: 77, y: 64 },
    steam: { x: 55, y: 31 },
    solid: [
      { x: 40, y: 40, w: 98, h: 34 },  // the counter
      { x: 14, y: 98, w: 40, h: 22 },  // a table and its chairs
      { x: 90, y: 122, w: 40, h: 22 }, // another
      { x: 120, y: 150, w: 14, h: 20 }, // plant
    ],
    draw(ctx) {
      const { w, h, wallH } = this;
      planks(ctx, 0, wallH, w, h - wallH, OAK, 31);
      // a checked rug where you queue
      for (let y = 78; y < 96; y += 4) for (let x = 64; x < 108; x += 4) fill(ctx, x, y, 4, 4, ((x - 64 + y - 78) / 4) % 2 ? '#f4ecd8' : '#5a8ac8');
      windowLight(ctx, 10, wallH, 20, 30);
      doormat(ctx, this);
      // back wall: cream with blue stripes, like the awning outside, over a wainscot
      fill(ctx, 0, 0, w, wallH, '#f4ecd8');
      for (let x = 2; x < w; x += 12) fill(ctx, x, 0, 6, wallH - 14, '#9cc8e4');
      fill(ctx, 0, wallH - 14, w, 12, C.wood);
      for (let x = 4; x < w; x += 12) fill(ctx, x, wallH - 12, 1, 10, C.woodDkr);
      fill(ctx, 0, wallH - 15, w, 2, C.woodLt);
      fill(ctx, 0, wallH - 2, w, 2, C.woodDeep);
      frame(ctx, this);
      windowPane(ctx, 10, 10);
      chalkboard(ctx, 46, 6);
      cafeTable(ctx, 26, 100);
      cafeTable(ctx, 102, 124);
      plant(ctx, 120, 150);
    },
  },

  // Derik's farmhouse kitchen (src/derikHouse.js): on Friday, Derik and his
  // friend Abraham at the table over coffee (later, beer), a stool there for
  // Johan, and a bookshelf. Out of the door is back to Derik's place, at
  // the end of the path by the stoep.
  derik: {
    w: 144, h: 160, wallH: 44,
    name: { af: 'Derik se huis', en: "Derek's house" },
    door: { x: 60, w: 24 },
    exit: { to: 'Derik', data: { at: { x: 656, y: 772 } } },
    spots: {
      // tap the table: sit down at it, on the stool (src/derikHouse.js)
      derikTable: {
        area: { x: 40, y: 72, w: 66, h: 46 },
        stand: { x: 72, y: 124 },
      },
      // tap the bookshelf: a book on dowsing, for the town's dry fountain (src/derikHouse.js)
      derikBooks: {
        area: { x: 114, y: 6, w: 28, h: 42 },
        stand: { x: 126, y: 58 },
      },
    },
    // where they sit (feet), facing the table
    seats: {
      derik: { x: 49, y: 99, face: 'right' },
      abraham: { x: 95, y: 99, face: 'left' },
      johan: { x: 72, y: 114, face: 'up' },
    },
    cups: [{ x: 62, y: 84 }, { x: 82, y: 84 }, { x: 72, y: 92 }],
    solid: [
      { x: 6, y: 40, w: 18, h: 16 },  // the stove
      { x: 42, y: 76, w: 62, h: 26 }, // the table and its chairs
      { x: 116, y: 40, w: 24, h: 10 }, // the bookshelf
      { x: 114, y: 128, w: 22, h: 26 }, // plant
    ],
    draw(ctx) {
      const { w, h, wallH } = this;
      planks(ctx, 0, wallH, w, h - wallH, OAK, 47);
      windowLight(ctx, 34, wallH, 20, 28);
      windowLight(ctx, 86, wallH, 20, 28);
      doormat(ctx, this);
      boardWall(ctx, w, wallH, ['#c8a070', '#b08858', '#6a4a2a'], 17);
      fill(ctx, 0, wallH - 2, w, 2, C.seam);
      frame(ctx, this);
      windowPane(ctx, 34, 10);
      windowPane(ctx, 86, 10);
      stove(ctx, 8, 24);
      bookshelf(ctx, 116, 10, 23);
      rug(ctx, 38, 70, 70, 52);
      chair(ctx, 44, 84, false);
      chair(ctx, 90, 84, true);
      table(ctx, 56, 80);
      // Johan's stool, in front of the table
      obj(ctx, 66, 108, 12, 5, r => { r(0, 0, 12, 3, C.wood); r(0, 0, 12, 1, C.woodLt); r(1, 3, 2, 2, C.woodDkr); r(9, 3, 2, 2, C.woodDkr); });
      // their coffee
      this.cups.forEach(({ x, y }) => obj(ctx, x - 2, y - 3, 4, 3, r => { r(0, 0, 4, 3, '#f8f0e0'); r(1, 0, 2, 1, '#6a3a1e'); }));
      plant(ctx, 120, 130);
    },
  },

  // Faan's tailor shop in town, up from the square (src/tailor.js): suits
  // to rent on a rail along the wall, a dummy in a tuxedo, Faan at his
  // counter, and a changing cubicle in the corner. Out of the door is back to
  // the town, on the path by its steps.
  tailor: {
    w: 144, h: 150, wallH: 44,
    name: { af: 'Faan se Kleremakery', en: "Faan's Tailor" },
    door: { x: 60, w: 24 },
    exit: { to: 'Town', data: { at: { x: 1204, y: 1752 } } },
    spots: {
      // tap the counter (or Faan behind it): talk to him (src/tailor.js)
      faan: {
        area: { x: 52, y: 22, w: 54, h: 46 },
        stand: { x: 74, y: 74 },
      },
      // tap the cubicle: where he changes into the tuxedo
      cubicle: {
        area: { x: 110, y: 4, w: 30, h: 50 },
        stand: { x: 124, y: 60 },
      },
      // tap the tuxedo on the dummy, or the rail
      suits: {
        area: { x: 6, y: 4, w: 46, h: 46 },
        stand: { x: 30, y: 60 },
      },
    },
    faan: { x: 79, y: 52 },
    cubicle: { x: 112, y: 8, shut: { x: 111, y: 7, w: 28, h: 49, draw: ctx => cubicle(ctx, 2, 1, true) } },
    solid: [
      { x: 8, y: 40, w: 42, h: 8 },    // the rail
      { x: 56, y: 54, w: 40, h: 14 },  // the counter
      { x: 70, y: 44, w: 18, h: 10 },  // Faan behind it
      { x: 18, y: 76, w: 12, h: 20 },  // the dummy
      { x: 124, y: 94, w: 12, h: 16 }, // the mirror
      { x: 8, y: 126, w: 14, h: 20 },  // plant
    ],
    draw(ctx) {
      const { w, h, wallH } = this;
      planks(ctx, 0, wallH, w, h - wallH, OAK, 53);
      rug(ctx, 52, 82, 44, 30);
      doormat(ctx, this);
      // back wall: dark green with gold stripes, over a wainscot
      fill(ctx, 0, 0, w, wallH, '#3e6a4a');
      for (let x = 4; x < w; x += 10) fill(ctx, x, 0, 1, wallH - 14, '#c8a850');
      fill(ctx, 0, wallH - 14, w, 12, C.woodDk);
      for (let x = 4; x < w; x += 12) fill(ctx, x, wallH - 12, 1, 10, C.woodDeep);
      fill(ctx, 0, wallH - 15, w, 2, C.woodLt);
      fill(ctx, 0, wallH - 2, w, 2, C.woodDeep);
      frame(ctx, this);
      clothesRail(ctx, 8, 8, 42, 61);
      // a sign over the counter: a needle and thread
      obj(ctx, 66, 8, 20, 10, r => { r(0, 0, 20, 10, C.woodDk); r(2, 2, 16, 6, C.linen); r(4, 4, 10, 1, C.metalDk); r(14, 3, 1, 3, C.metalDk); r(5, 6, 9, 1, C.red); });
      tailorCounter(ctx, 56, 54);
      cubicle(ctx, 112, 8);
      dummy(ctx, 18, 68);
      mirror(ctx, 124, 80);
      plant(ctx, 8, 126);
    },
  },

  // The restaurant on the town square (src/restaurant.js): tables laid for
  // dinner with white cloths and candles, Lize at her stand by the door with
  // the bookings book. Out of the door is back to the town, at the foot of its patio's steps.
  restaurant: {
    w: 160, h: 160, wallH: 44,
    name: { af: 'Die Restaurant', en: 'The Restaurant' },
    door: { x: 64, w: 24 },
    exit: { to: 'Town', data: { at: { x: 1010, y: 1316 } } },
    spots: {
      // tap the stand by the door (or Lize): talk to her (src/restaurant.js)
      lize: {
        area: { x: 102, y: 106, w: 36, h: 32 },
        stand: { x: 99, y: 132 }, // (the stand between them)
      },
      // tap the table by the window: the one he's booked
      ourTable: {
        area: { x: 98, y: 46, w: 46, h: 34 },
        stand: { x: 108, y: 88 },
      },
    },
    lize: { x: 130, y: 132 },
    solid: [
      { x: 14, y: 56, w: 40, h: 20 },   // tables and their chairs
      { x: 100, y: 56, w: 40, h: 20 },
      { x: 14, y: 100, w: 40, h: 20 },
      { x: 108, y: 120, w: 14, h: 14 }, // the stand
      { x: 124, y: 122, w: 12, h: 10 }, // Lize beside it
      { x: 140, y: 136, w: 14, h: 20 }, // plant
    ],
    draw(ctx) {
      const { w, h, wallH } = this;
      // a checked floor, black and white
      for (let y = wallH; y < h; y += 6) for (let x = 0; x < w; x += 6) fill(ctx, x, y, 6, 6, ((x + y - wallH) / 6) % 2 ? '#e8e0d0' : '#4a4038');
      windowLight(ctx, 26, wallH, 20, 26);
      windowLight(ctx, 112, wallH, 20, 26);
      doormat(ctx, this);
      // back wall: wine red, with a gold rail, over dark wood
      fill(ctx, 0, 0, w, wallH, '#7a2a30');
      for (let x = 2; x < w; x += 8) fill(ctx, x, 0, 4, wallH - 14, '#6a2228');
      fill(ctx, 0, wallH - 16, w, 2, '#c8a850');
      fill(ctx, 0, wallH - 14, w, 12, C.woodDkr);
      for (let x = 4; x < w; x += 12) fill(ctx, x, wallH - 12, 1, 10, C.woodDeep);
      fill(ctx, 0, wallH - 2, w, 2, C.woodDeep);
      frame(ctx, this);
      windowPane(ctx, 26, 8);
      windowPane(ctx, 112, 8);
      painting(ctx, 68, 8);
      dinnerTable(ctx, 24, 58);
      dinnerTable(ctx, 110, 58);
      dinnerTable(ctx, 24, 102);
      lectern(ctx, 108, 118);
      plant(ctx, 140, 136);
    },
  },

  // Steffi's beach house, the pink one at the top of the beach road
  // (src/steffiHouse.js): a sofa under the window, a coffee table with the
  // wine, her photo with her oupa on the wall, a shelf of shells and a jar
  // of gold, her surfboard in the corner. Out of the door is back to the
  // beach, at her front door.
  steffi: {
    w: 144, h: 140, wallH: 44,
    name: { af: 'Steffi se huis', en: "Steffi's house" },
    door: { x: 60, w: 24 },
    exit: { to: 'Beach', data: { at: { x: 884, y: 1036 } } },
    spots: {
      portrait: { area: { x: 58, y: 4, w: 30, h: 30 }, stand: { x: 72, y: 54 } },
      shelf: { area: { x: 96, y: 6, w: 34, h: 24 }, stand: { x: 112, y: 54 } },
      surfboard: { area: { x: 124, y: 38, w: 16, h: 48 }, stand: { x: 116, y: 74 } },
      sofa: { area: { x: 6, y: 46, w: 44, h: 22 }, stand: { x: 28, y: 74 }, seat: { x: 28, y: 62 } },
      seaWindow: { area: { x: 8, y: 4, w: 28, h: 26 }, stand: { x: 52, y: 54 } },
      wine: { area: { x: 52, y: 78, w: 30, h: 22 }, stand: { x: 66, y: 106 } },
    },
    steffi: { x: 92, y: 98 },
    glass: { x: 64, y: 82 }, // (the bottle's beside it, on the table)
    solid: [
      { x: 8, y: 48, w: 40, h: 16 },   // the sofa
      { x: 56, y: 82, w: 22, h: 12 },  // the coffee table
      { x: 126, y: 76, w: 10, h: 8 },  // the surfboard's tail
      { x: 122, y: 116, w: 14, h: 20 }, // plant
      { x: 86, y: 90, w: 12, h: 10 },  // Steffi, by the table
    ],
    draw(ctx) {
      const { w, h, wallH } = this;
      planks(ctx, 0, wallH, w, h - wallH, { base: '#d8c8a8', hi: '#e8dcc0', seam: '#a8987a', grain: '#c8b898' }, 71);
      windowLight(ctx, 14, wallH, 20, 30);
      rug(ctx, 44, 74, 50, 34);
      doormat(ctx, this);
      boardWall(ctx, w, wallH, ['#f4ecdc', '#e8e0d0', '#b8c8d0'], 29);
      fill(ctx, 0, wallH - 3, w, 3, '#7ab0c8');
      frame(ctx, this);
      windowPane(ctx, 12, 8);
      portrait(ctx, 60, 8);
      shellShelf(ctx, 98, 10);
      sofa(ctx, 8, 46);
      wineTable(ctx, 56, 82);
      surfboard(ctx, 127, 40);
      plant(ctx, 122, 116);
    },
  },

  barn: {
    w: 160, h: 176, wallH: 46,
    door: { x: 64, w: 32 },
    spots: {
      bike: {
        area: { x: 108, y: 74, w: 34, h: 28 }, // tap his bike on its stand…
        stand: { x: 103, y: 94 },              // …to walk up to it and take it out for a ride
      },
    },
    // his bike (src/bike.js), on its stand by the hay, when it's in here:
    // the picture's top left, and the floor it takes up
    bike: { x: 112, y: 72, solid: { x: 113, y: 92, w: 22, h: 6 } },
    solid: [
      { x: 8, y: 40, w: 86, h: 56 },   // stalls
      { x: 112, y: 40, w: 42, h: 30 }, // hay bales
      { x: 106, y: 104, w: 32, h: 14 }, // hay pile
      { x: 134, y: 124, w: 16, h: 20 }, // barrel
      { x: 10, y: 124, w: 20, h: 32 }, // crates
      { x: 92, y: 36, w: 14, h: 12 },  // tools against the wall
    ],
    draw(ctx) {
      const { w, h, wallH } = this;
      strawFloor(ctx, 0, wallH, w, h - wallH, 5);
      doormat(ctx, this);
      boardWall(ctx, w, wallH, ['#b8402e', '#a8382a', '#6a2418'], 9);
      fill(ctx, 0, 16, w, 4, C.woodDkr);
      fill(ctx, 0, 16, w, 1, C.wood);
      fill(ctx, 0, 20, w, 1, C.dark);
      fill(ctx, 0, wallH - 2, w, 2, '#5a1e16');
      frame(ctx, this);
      stalls(ctx, 8, 44);
      wallTool(ctx, 96, 8, 'fork');
      wallTool(ctx, 104, 10, 'rake');
      hayBale(ctx, 112, 54, 1);
      hayBale(ctx, 133, 54, 2);
      hayBale(ctx, 122, 42, 3);
      hayPile(ctx, 106, 104, 4);
      barrel(ctx, 134, 124);
      crate(ctx, 10, 140);
      crate(ctx, 12, 126);
    },
  },

  shed: {
    w: 112, h: 128, wallH: 40,
    door: { x: 44, w: 24 },
    spots: {
      picker: {
        area: { x: 96, y: 0, w: 12, h: 56 },  // tap the apple picker in the corner…
        stand: { x: 100, y: 58 },             // …to walk over and take it
        prop: { x: 99, y: 0, w: 8, h: 50, draw: ctx => applePicker(ctx, 1, 1) },
        need: () => hasFlag('read'),
        flag: 'picker',
        found: 'pickerFound',
      },
      // the saw on the tool rack (for the willow at the river: src/willow.js)
      saw: {
        area: { x: 9, y: 8, w: 22, h: 14 },
        stand: { x: 42, y: 45 },
        gap: { x: 11, y: 11, w: 16, h: 10 }, // where it hung, once it's taken
      },
      // the fishing rod on its pegs up on the wall (for Wednesday's dry well: src/views/pond.js)
      rod: {
        area: { x: 52, y: 3, w: 46, h: 10 },
        stand: { x: 76, y: 56 },
        prop: { x: 54, y: 7, w: 42, h: 5, draw: ctx => fishingRod(ctx, 1, 1) },
        need: () => hasFlag('wellBottom'),
        flag: 'rod',
        found: 'rodFound',
      },
      // the spade leaning in the corner, once he's found the leak in town (src/fountainFix.js)
      shovel: {
        area: { x: 92, y: 92, w: 14, h: 32 },
        stand: { x: 86, y: 112 },
        prop: { x: 96, y: 94, w: 8, h: 28, draw: ctx => spade(ctx, 1, 1) },
        need: () => hasFlag('foundLeak'),
        flag: 'shovel',
        found: 'shovelFound',
      },
      knife: {
        area: { x: 66, y: 13, w: 24, h: 10 }, // tap the knife hanging on the wall over the workbench…
        stand: { x: 78, y: 56 },              // …to take it (once Derik's asked for meat)
        prop: { x: 71, y: 15, w: 13, h: 5, draw: ctx => knife(ctx, 1, 1) },
        need: () => hasFlag('needMeat'),
        flag: 'knife',
        found: 'knifeFound',
      },
      crowbar: {
        area: { x: 62, y: 22, w: 22, h: 16 }, // tap the crowbar on the workbench…
        stand: { x: 76, y: 56 },              // …to take it
        prop: { x: 67, y: 31, w: 17, h: 5, draw: ctx => crowbar(ctx, 1, 1) },
        need: () => hasFlag('chestStuck'),
        flag: 'crowbar',
        found: 'crowbarFound',
      },
    },
    solid: [
      { x: 52, y: 26, w: 48, h: 24 }, // workbench
      { x: 8, y: 46, w: 26, h: 26 },  // sacks
      { x: 88, y: 70, w: 16, h: 20 }, // barrel
      { x: 8, y: 92, w: 22, h: 18 },  // crate
    ],
    draw(ctx) {
      const { w, h, wallH } = this;
      planks(ctx, 0, wallH, w, h - wallH, PINE, 21);
      doormat(ctx, this);
      boardWall(ctx, w, wallH, ['#8c5838', '#7a4a2a', '#4a2a14'], 13);
      fill(ctx, 0, wallH - 2, w, 2, C.seam);
      frame(ctx, this);
      toolRack(ctx, 9, 8);
      workbench(ctx, 52, 28);
      sack(ctx, 8, 46);
      sack(ctx, 20, 52);
      barrel(ctx, 88, 70);
      crate(ctx, 9, 92);
    },
  },
};

// Flickering fire in the farmhouse fireplace, plus its glow on the floor.
function flames(scene, x, y) {
  if (!scene.textures.exists('fire')) {
    const tex = scene.textures.createCanvas('fire', 24, 10);
    const ctx = tex.getContext();
    const shapes = [
      [[1, 5, 10, 5, C.red], [2, 2, 8, 6, '#f89838'], [3, 1, 3, 4, C.strawHi], [7, 3, 2, 3, C.strawHi], [4, 0, 1, 1, C.strawHi]],
      [[1, 5, 10, 5, C.red], [2, 3, 8, 5, '#f89838'], [5, 1, 3, 5, C.strawHi], [2, 4, 2, 2, C.strawHi], [6, 0, 1, 1, C.strawHi]],
    ];
    shapes.forEach((s, i) => {
      s.forEach(([a, b, c, d, col]) => fill(ctx, i * 12 + a, b, c, d, col));
      tex.add(i, 0, i * 12, 0, 12, 10);
    });
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    scene.anims.create({ key: 'fire-burn', frames: [{ key: 'fire', frame: 0 }, { key: 'fire', frame: 1 }], frameRate: 5, repeat: -1 });
  }
  scene.add.sprite(x, y, 'fire', 0).setOrigin(0).setDepth(1).play('fire-burn');
  const glow = scene.add.rectangle(x - 10, y + 13, 32, 10, 0xffb040, 0.12).setOrigin(0).setDepth(1);
  scene.tweens.add({ targets: glow, alpha: 0.5, duration: 400, yoyo: true, repeat: -1 });
}
