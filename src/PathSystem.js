// Rectangles that approximate the walkable dirt path in the 1376×768 farm scene.
// Tune by setting DEBUG_PATH=true in constants.js to see green overlays.
export const PATH_ZONES = [
  // Bottom-left wide entry area
  { x: 30,  y: 555, w: 210, h: 215 },
  // Lower-left curve going up
  { x: 100, y: 440, w: 190, h: 165 },
  // Upper-left approach
  { x: 195, y: 355, w: 210, h: 145 },
  // Central open area (character starts here)
  { x: 340, y: 345, w: 330, h: 210 },
  // Right path toward barn
  { x: 610, y: 355, w: 270, h: 135 },
  // Near-barn approach
  { x: 820, y: 335, w: 230, h: 155 },
  // Barn entrance area
  { x: 960, y: 265, w: 160, h: 230 },
];

export function isOnPath(x, y, r = 10) {
  return PATH_ZONES.some(
    z =>
      x + r > z.x &&
      x - r < z.x + z.w &&
      y + r > z.y &&
      y - r < z.y + z.h
  );
}
