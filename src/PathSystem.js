// All zones are defined in image-space pixels (768 × 1376).
// The pond sits at roughly x:30–285, y:480–855 — none of these zones touch it.
export const PATH_ZONES = [
  // Bottom entry gate
  { x: 245, y: 1155, w: 285, h: 221 },
  // Main path going up from gate (kept right of pond at x≥300)
  { x: 300, y: 830,  w: 215, h: 375 },
  // Central junction (starts at x=305, safely right of pond edge ~285)
  { x: 305, y: 700,  w: 375, h: 200 },
  // Right branch toward barn
  { x: 415, y: 450,  w: 265, h: 315 },
  // Near barn / silo area
  { x: 390, y: 200,  w: 305, h: 305 },
  // Top area near windmill
  { x: 415, y: 50,   w: 265, h: 215 },
];

// sx/sy are in screen-space; scale+offsets convert to image-space before checking.
export function isOnPath(sx, sy, scale, offX, offY, r = 10) {
  const ix = (sx - offX) / scale;
  const iy = (sy - offY) / scale;
  const ri = r / scale;
  return PATH_ZONES.some(
    z =>
      ix + ri > z.x &&
      ix - ri < z.x + z.w &&
      iy + ri > z.y &&
      iy - ri < z.y + z.h
  );
}
