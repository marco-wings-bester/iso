// Boer Johan's bicycle. It lives in the barn, on its stand (ROOMS.barn.bike);
// tapping it there takes it out, and he rides about the farm just as he
// walks, only faster (GameScene). Going in at a door, or off down the road,
// he gets off and leaves it standing there (`at`, farm px), and tapping it
// gets him back on; riding into the barn puts it away again. A good long
// ride (`TIRING` seconds of pedalling) after the cafe's coffee tires him out
// ('exercised'), so he can sleep. Kept for this visit only: a reload puts it
// back in the barn.

export const SPEED = 1.7;  // times his walking speed
export const TIRING = 15; // seconds of pedalling

export const bike = { at: 'barn', riding: false, pedalled: 0 };

export function resetBike() {
  Object.assign(bike, { at: 'barn', riding: false, pedalled: 0 });
}
