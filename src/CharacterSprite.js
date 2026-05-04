import { FRAME_W, FRAME_H } from './constants.js';

// Walk-cycle per-frame offsets.
// Directions: 0=down, 1=left, 2=right, 3=up
// 4 frames each: neutral, left-fwd, neutral, right-fwd
const WALK = [
  { ll: 0, rl: 0 },   // frame 0 – neutral
  { ll: -1, rl: 1 },  // frame 1 – left leg forward
  { ll: 0, rl: 0 },   // frame 2 – neutral
  { ll: 1, rl: -1 },  // frame 3 – right leg forward
];

function drawFrame(ctx, ox, oy, dir, frame) {
  const { ll, rl } = WALK[frame];
  // bob: slight down-shift on stepping frames for a bounce feel
  const bob = frame === 1 || frame === 3 ? 1 : 0;
  // arm swing is opposite to legs
  const la = rl;
  const ra = ll;

  // ── shadow (fixed at ground, no bob) ─────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(ox + 3, oy + 22, 10, 2);

  // ── left leg + boot ───────────────────────────────────────────────
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(ox + 4, oy + 15 + bob + ll, 3, 5);
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(ox + 4, oy + 19 + bob + ll, 3, 3);

  // ── right leg + boot ──────────────────────────────────────────────
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(ox + 9, oy + 15 + bob + rl, 3, 5);
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(ox + 9, oy + 19 + bob + rl, 3, 3);

  // ── arms (drawn before torso so torso edge covers them slightly) ──
  ctx.fillStyle = '#7a5c2e';
  ctx.fillRect(ox + 1, oy + 9 + bob + la, 2, 5);
  ctx.fillRect(ox + 13, oy + 9 + bob + ra, 2, 5);

  // ── torso / coat ─────────────────────────────────────────────────
  ctx.fillStyle = '#7a5c2e';
  ctx.fillRect(ox + 3, oy + 8 + bob, 10, 8);
  // belt
  ctx.fillStyle = '#5c4220';
  ctx.fillRect(ox + 3, oy + 14 + bob, 10, 1);

  // ── neck (hidden for up-facing) ───────────────────────────────────
  if (dir !== 3) {
    ctx.fillStyle = '#e0a882';
    ctx.fillRect(ox + 7, oy + 6 + bob, 2, 3);
  }

  // ── head (skin) ───────────────────────────────────────────────────
  ctx.fillStyle = '#e8b89a';
  ctx.fillRect(ox + 5, oy + 1 + bob, 6, 7);

  // ── hair ─────────────────────────────────────────────────────────
  ctx.fillStyle = '#6b4226';
  if (dir === 3) {
    // facing up – more hair visible
    ctx.fillRect(ox + 5, oy + 1 + bob, 6, 4);
  } else {
    ctx.fillRect(ox + 5, oy + 1 + bob, 6, 2);
  }

  // ── hat brim + crown ─────────────────────────────────────────────
  ctx.fillStyle = '#4a2e10';
  ctx.fillRect(ox + 4, oy + 2 + bob, 8, 1); // brim
  ctx.fillStyle = '#5c3a18';
  ctx.fillRect(ox + 5, oy + 0 + bob, 6, 3); // crown (overlaps brim)

  // ── eyes (direction-dependent) ───────────────────────────────────
  ctx.fillStyle = '#1a1208';
  if (dir === 0) {
    ctx.fillRect(ox + 6, oy + 5 + bob, 1, 1);
    ctx.fillRect(ox + 9, oy + 5 + bob, 1, 1);
  } else if (dir === 1) {
    ctx.fillRect(ox + 5, oy + 5 + bob, 1, 1);
  } else if (dir === 2) {
    ctx.fillRect(ox + 10, oy + 5 + bob, 1, 1);
  }
  // dir===3 (up): no eyes visible
}

export function createCharacterTexture(scene) {
  const cols = 4; // walk frames
  const rows = 4; // directions: down, left, right, up
  const tex = scene.textures.createCanvas('player', FRAME_W * cols, FRAME_H * rows);
  const ctx = tex.getContext();

  ctx.clearRect(0, 0, FRAME_W * cols, FRAME_H * rows);

  for (let dir = 0; dir < rows; dir++) {
    for (let frame = 0; frame < cols; frame++) {
      drawFrame(ctx, frame * FRAME_W, dir * FRAME_H, dir, frame);
    }
  }

  tex.refresh();

  // Register numbered frames so anims.create can reference them
  for (let dir = 0; dir < rows; dir++) {
    for (let frame = 0; frame < cols; frame++) {
      tex.add(
        dir * cols + frame,
        0,
        frame * FRAME_W,
        dir * FRAME_H,
        FRAME_W,
        FRAME_H
      );
    }
  }
}
