// Enterable buildings, in farm image px. Tapping anywhere on `area` walks to
// the door; stepping into `door` goes inside; leaving puts you back at `exit`.
// On his bike, he leaves it at `park` (src/bike.js; the barn's has a stand inside).
// `name` is shown as you go in ({ af, en }: src/i18n.js).
export const BUILDINGS = {
  house: {
    name: { af: 'Plaashuis', en: 'Farmhouse' },
    area: { x: 105, y: 150, w: 200, h: 170 },
    door: { x: 244, y: 322, w: 24, h: 10 },
    exit: { x: 262, y: 344 },
    park: { x: 298, y: 346 },
  },
  barn: {
    name: { af: 'Skuur', en: 'Barn' },
    area: { x: 440, y: 175, w: 210, h: 185 },
    door: { x: 472, y: 364, w: 30, h: 10 },
    exit: { x: 486, y: 386 },
  },
  shed: {
    name: { af: 'Gereedskapskuur', en: 'Tool Shed' },
    area: { x: 600, y: 680, w: 110, h: 108 },
    door: { x: 612, y: 788, w: 26, h: 10 },
    exit: { x: 624, y: 806 },
    park: { x: 592, y: 824 },
  },
};

// The road off the farm, down past the gate: a tap anywhere along the bottom
// (below `tap`) walks down it, and once his feet cross `edge` he's off the
// farm, to the crossroads (src/RoadScene.js); coming back up, he
// stands at `back`.
export const ROAD = { tap: 1300, edge: 1362, back: { x: 384, y: 1336 } };

// Things to look at: tap `area`, he walks to `stand`, faces `face`, and the
// screen switches to what he sees (ViewScene: well, pond, tractor, apple
// tree, pine, or inside the hen house). The apple trees are off the path, so he stands on the path nearby.
// A well's `id` names it (for the view, and Wednesday's buckets: src/chores.js).
export const SPOTS = [
  { view: 'well', id: 'wellTop', area: { x: 98, y: 540, w: 64, h: 92 }, stand: { x: 168, y: 590 }, face: 'left' },        // red-roofed well
  { view: 'well', id: 'wellBottom', area: { x: 458, y: 1060, w: 52, h: 80 }, stand: { x: 452, y: 1092 }, face: 'right' }, // orchard well
  { view: 'coop', area: { x: 185, y: 605, w: 165, h: 150 }, stand: { x: 380, y: 772 }, face: 'left' }, // the hen house
  { view: 'pond', area: { x: 0, y: 735, w: 248, h: 145 }, stand: { x: 172, y: 824 }, face: 'left' },    // pond / end of the jetty
  { view: 'tractor', area: { x: 525, y: 560, w: 170, h: 118 }, stand: { x: 556, y: 650 }, face: 'up' }, // the tractors
  { view: 'apple', area: { x: 305, y: 105, w: 90, h: 160 }, stand: { x: 286, y: 322 }, face: 'up' },     // big apple tree by the farmhouse
  { view: 'apple', area: { x: 495, y: 950, w: 85, h: 100 }, stand: { x: 482, y: 1050 }, face: 'right' }, // orchard apple trees
  { view: 'apple', area: { x: 580, y: 905, w: 90, h: 95 }, stand: { x: 482, y: 1026 }, face: 'right' },
  { view: 'pine', area: { x: 612, y: 1145, w: 116, h: 150 }, stand: { x: 410, y: 1318 }, face: 'right' }, // the big pine, bottom right
];

export function inRect(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export function rectCenter(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
