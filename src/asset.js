/* global __BUILD_ID__ */

// A picture in public/assets, its address tagged with this build's id: a new
// version always loads its own pictures, never ones an older version left in
// the offline cache (src/sw.js precaches the same addresses).
export const asset = name => `assets/${name}?v=${__BUILD_ID__}`;
