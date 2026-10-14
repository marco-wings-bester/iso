// Enterable buildings, in farm image px. Tapping anywhere on `area` walks to
// the door; stepping into `door` goes inside; leaving puts you back at `exit`.
export const BUILDINGS = {
  house: {
    name: 'Farmhouse',
    area: { x: 105, y: 150, w: 200, h: 170 },
    door: { x: 244, y: 322, w: 24, h: 10 },
    exit: { x: 262, y: 344 },
  },
  barn: {
    name: 'Barn',
    area: { x: 440, y: 175, w: 210, h: 185 },
    door: { x: 472, y: 364, w: 30, h: 10 },
    exit: { x: 486, y: 386 },
  },
  shed: {
    name: 'Tool Shed',
    area: { x: 600, y: 680, w: 110, h: 108 },
    door: { x: 612, y: 788, w: 26, h: 10 },
    exit: { x: 624, y: 806 },
  },
};

export function inRect(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export function rectCenter(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
