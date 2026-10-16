import Phaser from 'phaser';
import { FRAME_H, FEET_Y } from './constants.js';
import { createCharacter, createBob } from './CharacterSprite.js';
import { band, hash, pixels, ellipse } from './views/art.js';

// A close-up of Farmer Jones and Bob at the gate, talking. The scene and the
// two of them are pixel art at a big, crisp zoom; speech bubbles are drawn on
// a screen-resolution layer on top so the words stay sharp. Lines type out;
// tap to finish a line or go to the next; after the last, back to the farm.
// Where Jones has something to say you pick one of two replies (tap, or keys
// 1/2, or arrows + Enter). The ✕ (or Esc) leaves the talk at any time.

const FADE_MS = 300;
const SPEAKERS = {
  jones: { name: 'Farmer Jones', color: '#b8402e' },
  bob: { name: 'Bob', color: '#447a34' },
};
const SKY = [[110, 172, 226], [134, 190, 236], [164, 208, 240], [196, 226, 246]];
const INK = '#2e1d0c';

// The gate, path and fence behind them, as pixel art (w × h sprite px).
function drawBackdrop(ctx, w, h, ground) {
  const horizon = ground - 30;
  pixels(ctx, w, h, (x, y) => {
    const hill = horizon - 6 - 4 * Math.sin(x * 0.12 + 1) - 2 * Math.sin(x * 0.31);
    if (y < hill) return band(SKY, y / hill, x, y);
    if (y < horizon) return hash(x >> 1, y >> 1) < 0.3 ? [140, 186, 104] : [156, 198, 118];
    // grass, with the dirt path they're standing on
    const pathHalf = 14 + (y - horizon) * 0.5;
    if (Math.abs(x - w / 2) < pathHalf && y > ground - 8) {
      return hash(x, y) < 0.06 ? [196, 150, 90] : hash(x >> 1, y) < 0.3 ? [218, 170, 102] : [228, 180, 110];
    }
    return hash(x >> 1, y >> 1) < 0.3 ? [104, 156, 56] : hash(x, y) < 0.03 ? [168, 212, 96] : [120, 176, 64];
  });

  const wood = (x, y, ww, hh, light) => {
    ctx.fillStyle = INK;
    ctx.fillRect(x - 1, y - 1, ww + 2, hh + 2);
    ctx.fillStyle = '#8c5838';
    ctx.fillRect(x, y, ww, hh);
    ctx.fillStyle = light ? '#a86a3c' : '#7a4a2a';
    ctx.fillRect(x, y, Math.max(1, ww >> 2), hh);
  };
  // fence rails and posts along the back
  const railY = ground - 20;
  wood(0, railY, w, 2, true);
  wood(0, railY + 6, w, 2, true);
  for (let x = 3; x < w; x += 9) wood(x, railY - 3, 2, 14, true);
  // the gate: tall posts either side, a beam across
  const gx = Math.round(w / 2);
  wood(gx - 21, ground - 44, 4, 46, true);
  wood(gx + 17, ground - 44, 4, 46, false);
  wood(gx - 23, ground - 46, 46, 3, true);
  // a few clouds
  [[0.2, 0.12, 7], [0.75, 0.2, 5], [0.45, 0.05, 4]].forEach(([fx, fy, r]) => {
    [[0, 0, 1], [-0.9, 0.25, 0.7], [0.9, 0.2, 0.75], [0.3, -0.35, 0.7]].forEach(([dx, dy, k]) => {
      ellipse(ctx, fx * w + dx * r, fy * h + dy * r * 0.6, r * k, r * k * 0.6, (u, v) => (v > 0.35 ? [214, 228, 240] : [252, 252, 252]));
    });
  });
}

export default class TalkScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Talk' });
  }

  create({ lines }) {
    createCharacter(this);
    createBob(this);
    const { width: W, height: H } = this.scale;
    // as big as fits: the two of them and the gateposts across the width
    const z = Math.max(3, Math.floor(Math.min((H * 0.36) / FRAME_H, W / 44)));
    const w = Math.ceil(W / z) + 2; // a little spare so no edge shows
    const h = Math.ceil(H / z) + 2;
    const ground = Math.round(h * 0.7); // leaves room below for the replies

    if (this.textures.exists('talk-bg')) this.textures.remove('talk-bg');
    const tex = this.textures.createCanvas('talk-bg', w, h);
    drawBackdrop(tex.getContext(), w, h, ground);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

    // Farmer Jones on the left facing right, Bob on the right facing left.
    const world = this.add.layer();
    world.add(this.add.image(0, 0, 'talk-bg').setOrigin(0));
    this.people = {
      jones: this.add.sprite(w / 2 - 9, ground, 'player-px').setOrigin(0.5, FEET_Y / FRAME_H).play('player-px-idle-right'),
      bob: this.add.sprite(w / 2 + 9, ground, 'bob-px').setOrigin(0.5, FEET_Y / FRAME_H).play('bob-px-idle-left'),
    };
    world.add([this.people.jones, this.people.bob]);
    this.ui = this.add.layer();
    this.uiObjects = [];

    const cam = this.cameras.main;
    cam.setZoom(z).centerOn(w / 2, h / 2).setRoundPixels(true).ignore(this.ui).fadeIn(FADE_MS);
    const uiCam = this.cameras.add(0, 0, W, H).ignore(world).fadeIn(FADE_MS);
    this.toScreen = (x, y) => ({ x: (x - w / 2) * z + W / 2, y: (y - h / 2) * z + H / 2 });
    this.z = z;
    this.ground = ground;

    document.body.classList.add('pov-view');
    this.events.once('shutdown', () => document.body.classList.remove('pov-view'));

    this.queue = [...lines];
    this.started = false;
    this.choices = null;
    this.leaving = false;
    this.closeArea = this.drawClose();
    this.input.on('pointerdown', (p) => this.tap(p.x, p.y));
    this.input.keyboard.on('keydown', (e) => this.key(e.key));
    this.time.delayedCall(FADE_MS + 150, () => this.next());

    // Back to the farm; `finished` if the talk was heard to the end.
    this.finish = () => {
      if (this.leaving) return;
      this.leaving = true;
      const finished = this.started && !this.choices && this.queue.length === 0;
      cam.fadeOut(FADE_MS);
      uiCam.fadeOut(FADE_MS);
      cam.once('camerafadeoutcomplete', () => {
        this.scene.resume('Game', { finished });
        this.scene.stop();
      });
    };
  }

  tap(x, y) {
    if (this.leaving) return;
    const inside = (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    if (inside(this.closeArea)) {
      this.finish();
    } else if (this.choices) {
      const i = this.choices.findIndex(c => inside(c.area));
      if (i >= 0) this.pick(i);
    } else {
      this.advance();
    }
  }

  key(k) {
    if (this.leaving) return;
    if (k === 'Escape') {
      this.finish();
    } else if (!this.choices) {
      this.advance();
    } else if (k === '1' || k === '2') {
      this.pick(Number(k) - 1);
    } else if (k === 'ArrowUp' || k === 'ArrowDown') {
      this.highlight(this.selected === 0 ? 1 : 0);
    } else if ((k === 'Enter' || k === ' ') && this.selected >= 0) {
      this.pick(this.selected);
    }
  }

  advance() {
    if (!this.started) return;
    if (this.typing) {
      this.typing.remove();
      this.typing = null;
      this.message.setText(this.full);
      this.doneTyping();
    } else if (this.queue.length === 0) {
      this.finish();
    } else {
      this.next();
    }
  }

  next() {
    this.started = true;
    const step = this.queue.shift();
    if (step.choose) this.ask(step.choose);
    else this.say(...step);
  }

  // Jones says the reply you picked, then Bob answers it.
  pick(i) {
    const choice = this.choices[i];
    this.choices = null;
    this.queue.unshift(...(choice.then ?? []));
    this.say('jones', choice.say);
  }

  say(who, text) {
    this.uiObjects.forEach(o => o.destroy());
    this.uiObjects = [];
    this.tweens.killTweensOf(Object.values(this.people));
    Object.values(this.people).forEach(p => p.setY(this.ground));

    // bubble geometry, sized for the whole line
    const { width: W } = this.scale;
    const font = Math.round(Math.max(15, Math.min(20, W / 22)));
    const pad = Math.round(font * 0.8);
    const bw = Math.min(W - 24, 360);
    const dpr = window.devicePixelRatio || 1;
    const name = this.add.text(0, 0, SPEAKERS[who].name, {
      fontFamily: 'monospace', fontStyle: 'bold', fontSize: `${Math.round(font * 0.85)}px`, color: SPEAKERS[who].color, resolution: dpr,
    });
    const message = this.add.text(0, 0, text, {
      fontFamily: 'monospace', fontStyle: 'bold', fontSize: `${font}px`, color: INK, resolution: dpr,
      wordWrap: { width: bw - pad * 2, useAdvancedWrap: true }, lineSpacing: Math.round(font * 0.2),
    });
    const bh = Math.round(pad * 2 + name.height + font * 0.3 + message.height);

    const speaker = this.people[who];
    const head = this.toScreen(speaker.x, this.ground - FRAME_H + 2);
    const tail = Math.round(this.z * 3);
    const by = Math.round(head.y - tail - bh - 6);
    const bx = Math.round(Phaser.Math.Clamp(head.x - bw / 2 + (who === 'jones' ? -bw * 0.15 : bw * 0.15), 12, W - 12 - bw));

    const g = this.add.graphics();
    this.drawBubble(g, bx, by, bw, bh, head.x, by + bh + tail);
    name.setPosition(bx + pad, by + pad);
    message.setPosition(bx + pad, by + pad + name.height + font * 0.3);
    this.ui.add([g, name, message]);
    this.uiObjects.push(g, name, message);

    // type the line out; the speaker bobs while talking
    this.full = text;
    this.message = message;
    message.setText('');
    let n = 0;
    this.typing = this.time.addEvent({
      delay: 28,
      repeat: text.length - 1,
      callback: () => {
        n++;
        message.setText(text.slice(0, n));
        if (n >= text.length) {
          this.typing = null;
          this.doneTyping();
        }
      },
    });
    this.tweens.add({ targets: speaker, y: this.ground - 0.75, duration: 140, yoyo: true, repeat: -1 });

    this.more = this.add.text(bx + bw - pad, by + bh - pad * 0.6, '▼', {
      fontFamily: 'monospace', fontSize: `${Math.round(font * 0.7)}px`, color: INK, resolution: dpr,
    }).setOrigin(1, 1).setAlpha(0);
    this.ui.add(this.more);
    this.uiObjects.push(this.more);
  }

  doneTyping() {
    this.tweens.killTweensOf(Object.values(this.people));
    Object.values(this.people).forEach(p => p.setY(this.ground));
    // a reply to pick next? offer it straight away, under the line it answers
    if (this.queue[0]?.choose) this.ask(this.queue.shift().choose);
    else this.tweens.add({ targets: this.more, alpha: 1, duration: 300, yoyo: true, repeat: -1 });
  }

  // Two reply buttons along the bottom, under a "Your reply" label.
  ask(options) {
    const { width: W, height: H } = this.scale;
    const font = Math.round(Math.max(14, Math.min(18, W / 24)));
    const pad = Math.round(font * 0.7);
    const bw = Math.min(W - 24, 360);
    const bx = Math.round((W - bw) / 2);
    const gap = Math.round(font * 0.6);
    const dpr = window.devicePixelRatio || 1;
    const style = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: `${font}px`, color: INK, resolution: dpr };

    let y = H - 16;
    this.choices = options.map(o => ({ ...o })).reverse().map((c) => {
      const arrow = this.add.text(0, 0, '▶', { ...style, color: SPEAKERS.jones.color });
      const text = this.add.text(0, 0, c.say, {
        ...style, wordWrap: { width: bw - pad * 3 - arrow.width, useAdvancedWrap: true }, lineSpacing: Math.round(font * 0.2),
      });
      const bh = Math.round(text.height + pad * 1.6);
      y -= bh;
      const g = this.add.graphics();
      arrow.setPosition(bx + pad, y + pad * 0.8);
      text.setPosition(bx + pad * 2 + arrow.width, y + pad * 0.8);
      const parts = [g, arrow, text];
      this.ui.add(parts);
      this.uiObjects.push(...parts);
      this.tweens.add({ targets: parts, alpha: { from: 0, to: 1 }, duration: 200 });
      const choice = { ...c, g, area: { x: bx - 6, y: y - gap / 2, w: bw + 12, h: bh + gap }, box: [bx, y, bw, bh] };
      y -= gap + 4;
      return choice;
    }).reverse();

    const label = this.add.text(bx + 2, y, 'Your reply', {
      fontFamily: 'monospace', fontStyle: 'bold', fontSize: `${Math.round(font * 0.85)}px`, color: '#fffcf2',
      stroke: INK, strokeThickness: 4, resolution: dpr,
    }).setOrigin(0, 1);
    this.ui.add(label);
    this.uiObjects.push(label);
    this.highlight(-1);
  }

  highlight(i) {
    this.selected = i;
    this.choices.forEach((c, j) => {
      c.g.clear();
      this.drawBox(c.g, ...c.box, j === i ? 0xf8d870 : 0xfff3c4, j === i ? 0xe0bc50 : 0xecdc9c);
    });
  }

  // ✕ in the top-right corner to leave the talk; returns its tap area.
  drawClose() {
    const { width: W } = this.scale;
    const s = 40;
    const x = W - s - 12;
    const y = 12;
    const g = this.add.graphics();
    this.drawBox(g, x, y, s, s, 0xfffcf2, 0xe8e0cc);
    const c = 4; // a 5×5-cell pixel X
    const ox = x + (s - 5 * c) / 2;
    const oy = y + (s - 5 * c) / 2;
    g.fillStyle(0x2e1d0c);
    for (let i = 0; i < 5; i++) {
      g.fillRect(ox + i * c, oy + i * c, c, c);
      g.fillRect(ox + (4 - i) * c, oy + i * c, c, c);
    }
    this.ui.add(g);
    return { x: x - 10, y: 0, w: s + 22, h: s + 22 };
  }

  // A chunky pixel-art bubble: white, dark outline, notched corners and a
  // stepped tail pointing down at the speaker's head (tx, ty).
  drawBubble(g, x, y, w, h, tx, ty) {
    const q = this.drawBox(g, x, y, w, h, 0xfffcf2, 0xe8e0cc);

    const cx = Phaser.Math.Clamp(Math.round(tx), x + 4 * q, x + w - 4 * q);
    const steps = Math.max(2, Math.round((ty - (y + h)) / q));
    for (let i = 0; i < steps; i++) {
      const half = Math.max(q, Math.round((steps - i) * q * 0.7));
      const yy = y + h + i * q;
      g.fillStyle(0x2e1d0c).fillRect(cx - half - q, yy - (i === 0 ? q : 0), half * 2 + 2 * q, q + (i === 0 ? q : 0));
      g.fillStyle(0xfffcf2).fillRect(cx - half, yy - (i === 0 ? q : 0), half * 2, q + (i === 0 ? q : 0));
    }
    g.fillStyle(0x2e1d0c).fillRect(cx - q, y + h + steps * q, 2 * q, q);
  }

  // The bubble's box: dark outline, notched corners, shading along the
  // bottom. Returns the pixel size used.
  drawBox(g, x, y, w, h, fill, shade) {
    const q = Math.max(2, Math.round(this.z / 3));
    g.fillStyle(0x2e1d0c);
    g.fillRect(x + q, y - q, w - 2 * q, h + 2 * q);
    g.fillRect(x - q, y + q, w + 2 * q, h - 2 * q);
    g.fillRect(x, y, w, h);
    g.fillStyle(fill);
    g.fillRect(x + q, y, w - 2 * q, h);
    g.fillRect(x, y + q, w, h - 2 * q);
    g.fillStyle(shade);
    g.fillRect(x + q, y + h - q, w - 2 * q, q);
    return q;
  }
}
