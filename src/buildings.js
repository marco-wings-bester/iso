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

// Things to look at: tap `area`, he walks to `stand`, faces `face`, and the
// screen switches to what he sees (ViewScene: well, pond or tractor).
export const SPOTS = [
  { view: 'well', area: { x: 98, y: 540, w: 64, h: 92 }, stand: { x: 168, y: 590 }, face: 'left' },     // red-roofed well
  { view: 'well', area: { x: 458, y: 1060, w: 52, h: 80 }, stand: { x: 452, y: 1092 }, face: 'right' }, // orchard well
  { view: 'pond', area: { x: 0, y: 735, w: 248, h: 145 }, stand: { x: 172, y: 824 }, face: 'left' },    // pond / end of the jetty
  { view: 'tractor', area: { x: 525, y: 560, w: 170, h: 118 }, stand: { x: 556, y: 650 }, face: 'up' }, // the tractors
];

export function inRect(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export function rectCenter(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
