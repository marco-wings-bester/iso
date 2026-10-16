import { FRAME_H, FEET_Y } from './constants.js';
import { SEAT_ROW } from './CharacterSprite.js';
import { pieTexture } from './interiors.js';

// Someone on the chair behind the farmhouse table, facing the room, eating
// the pie in front of them: `key` is their sprite sheet ('player-px' for
// Farmer Jones, 'bob-px'). Each time the fork goes up a bite comes off, and
// every `bitesPerColumn` bites the pie loses a column (of 8), from `from`
// down to `to`; then they sit back full, patting their belly, and `onFull`
// runs. With `sitDown` they first stand at the chair and sit (then
// `onSeated`). Returns their sprite.
export function eatAtTable(scene, key, pie, { from, to, bitesPerColumn = 2, sitDown = false, onSeated, onFull }) {
  const { seat } = scene.room.kitchen.table;
  const who = scene.add.sprite(seat.x, seat.y, key).setDepth(seat.y);
  const sit = anim => who.setOrigin(0.5, SEAT_ROW / FRAME_H).setPosition(seat.x, seat.y).play(anim);
  let left = from;
  pie.setTexture(pieTexture(scene, left));

  let bites = 0;
  who.on('animationupdate', (anim, frame) => {
    if (anim.key !== `${key}-eat` || frame.textureFrame !== 'seat-up') return;
    if (++bites % bitesPerColumn === 0 && left > to) pie.setTexture(pieTexture(scene, --left));
  });
  who.on('animationrepeat', (anim) => {
    if (anim.key !== `${key}-eat` || left > to) return;
    who.play(`${key}-full`);
    onFull?.();
  });

  if (left <= to) {
    sit(`${key}-full`);
  } else if (!sitDown) {
    sit(`${key}-eat`);
  } else {
    who.setOrigin(0.5, FEET_Y / FRAME_H).setPosition(seat.x, seat.y - 1).play(`${key}-idle-down`);
    scene.time.delayedCall(900, () => scene.tweens.add({
      targets: who, y: who.y + 5, duration: 180, ease: 'Quad.easeIn',
      onComplete: () => {
        onSeated?.();
        sit(`${key}-eat`);
      },
    }));
  }
  return who;
}
