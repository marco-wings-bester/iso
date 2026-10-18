import Phaser from 'phaser';
import { createCharacter, createBike } from './CharacterSprite.js';
import { createAmbient } from './ambient.js';
import { spawnBob, BOB_AREA, BOB_STAND } from './bob.js';
import { hasFlag, setFlag } from './state.js';
import { FIRST_MEETING, AGAIN } from './dialogue.js';
import { think } from './bubble.js';
import { line } from './hints.js';
import Player from './Player.js';
import { farmGrid } from './WalkGrid.js';
import { BUILDINGS, ROAD, SPOTS, inRect, rectCenter } from './buildings.js';
import { IMG_W, IMG_H, PLAYER_SPEED, DEBUG_PATH } from './constants.js';
import { bike, pedal, SPEED as BIKE_SPEED } from './bike.js';
import { today } from './days.js';
import { WEDNESDAY, choresLeft } from './chores.js';
import { asset } from './asset.js';
import { UI } from './screen.js';

const SPAWN = { x: 387, y: 1265 }; // farm gate, image px
// the pail beside the red-roofed well: where the water shows once he's filled
// it (Wednesday's work, src/chores.js)
const PAIL = { x: 178, y: 611, depth: 629 };
const FADE_MS = 250;

// The farm. World coordinates are map image pixels; the camera zooms the map
// to cover the screen (like CSS background-size: cover).
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  preload() {
    this.load.image('map', asset('map.png'));
  }

  create(data = {}) {
    const cam = this.cameras.main;
    cam.fadeIn(FADE_MS);
    const coverZoom = () => Math.max(this.scale.width / IMG_W, this.scale.height / IMG_H);
    const zoom = coverZoom();

    this.add.image(0, 0, 'map').setOrigin(0).setDepth(0);
    createAmbient(this);
    createCharacter(this);
    createBike(this);

    // Coming back out of a building: stand outside its door, facing out (or
    // back up the road from the crossroads, facing the farm).
    const from = data.from === 'road' ? { exit: ROAD.back, face: 'up' } : BUILDINGS[data.from];
    const start = from ? from.exit : SPAWN;
    this.player = new Player(this, {
      x: start.x,
      y: start.y,
      dir: from ? from.face ?? 'down' : 'up',
      texture: bike.riding ? 'player-bike' : 'player',
      speed: PLAYER_SPEED * UI / zoom * (bike.riding ? BIKE_SPEED : 1), // page px/s → image px/s
      grid: farmGrid,
      markerScale: UI / zoom,
    });
    this.leaving = false;
    this.pail = null;
    this.fillPail();

    // After a read and a sleep, Bob is waiting at the gate (until he's been
    // given the pie: then he's in the farmhouse eating it).
    this.bob = null;
    if (hasFlag('ate') && hasFlag('slept') && !hasFlag('gavePie')) {
      this.bob = spawnBob(this, { showMark: !hasFlag('metBob') });
      const news = { af: 'Daar is iemand by die hek!', en: 'Someone is at the gate!' };
      if (from && !hasFlag('metBob')) this.time.delayedCall(600, () => this.game.events.emit('location', { name: news }));
    }

    // Keep the map covering the screen if the window size changes.
    const fit = () => {
      const z = coverZoom();
      cam.setZoom(z).centerOn(IMG_W / 2, IMG_H / 2);
      this.player.speed = PLAYER_SPEED * UI / z * (bike.riding ? BIKE_SPEED : 1);
      this.player.markerScale = UI / z;
    };
    fit();
    this.scale.on('resize', fit);
    this.events.once('shutdown', () => this.scale.off('resize', fit));

    // Tap to walk; tapping a building walks to its door; tapping a well, the
    // pond or a tractor walks there and shows what he sees; tapping right at
    // the bottom walks down the road off the farm. A thought of his
    // stays up until a tap (or Space/Enter) moves it along, and that's all
    // that tap does.
    this.input.keyboard.on('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && this.thought) this.thought.destroy();
    });
    this.input.on('pointerdown', (pointer) => {
      if (this.leaving) return;
      if (this.thought) {
        this.thought.destroy();
        return;
      }
      const { worldX: x, worldY: y } = pointer;
      if (this.bob && inRect(x, y, BOB_AREA)) {
        this.player.walkTo(BOB_STAND.x, BOB_STAND.y, () => this.talkToBob());
        return;
      }
      const spot = SPOTS.find(s => inRect(x, y, s.area));
      if (spot) {
        this.player.walkTo(spot.stand.x, spot.stand.y, () => this.lookAt(spot));
        return;
      }
      if (y >= ROAD.tap) {
        this.player.walkTo(x, IMG_H - 2);
        return;
      }
      const b = Object.values(BUILDINGS).find(bd => inRect(x, y, bd.area));
      const target = b ? rectCenter(b.door) : { x, y };
      this.player.walkTo(target.x, target.y);
    });

    if (DEBUG_PATH) {
      const g = this.add.graphics().setDepth(999);
      const { cols, rows, cell } = farmGrid;
      g.fillStyle(0x00ff00, 0.35);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (farmGrid.cellWalkable(c, r)) g.fillRect(c * cell, r * cell, cell, cell);
        }
      }
      g.lineStyle(2, 0x00ffff, 1);
      Object.values(BUILDINGS).forEach(b => g.strokeRect(b.door.x, b.door.y, b.door.w, b.door.h));
    }

    if (!(from && this.bob && !hasFlag('metBob'))) this.game.events.emit('location', { name: from ? { af: 'Plaas', en: 'Farm' } : null });
  }

  update(_time, delta) {
    if (this.leaving) return;
    pedal(this, this.player.update(delta / 1000), delta / 1000);

    const { x, y } = this.player;
    if (y >= ROAD.edge) {
      this.offTheFarm();
      return;
    }
    const id = Object.keys(BUILDINGS).find(k => inRect(x, y, BUILDINGS[k].door));
    if (id === 'house' && !hasFlag('key')) this.locked();
    else if (id) this.enter(id);
  }

  // The farmhouse before he's found his key (left in the tractor): locked.
  // He steps back out of the doorway and wonders where it is.
  locked() {
    const { exit } = BUILDINGS.house;
    this.player.stop();
    Object.assign(this.player, { x: exit.x, y: exit.y });
    this.player.sprite.setPosition(exit.x, exit.y);
    this.player.face('down');
    think(this, this.player.sprite, line('doorLocked'));
  }

  // Down the road past the gate to the crossroads, once Pieter has
  // gone home and Johan's off to town; until then he turns back.
  offTheFarm() {
    const { player } = this;
    player.stop();
    if (!hasFlag('bobHome')) {
      Object.assign(player, ROAD.back);
      player.sprite.setPosition(ROAD.back.x, ROAD.back.y);
      player.face('up');
      think(this, player.sprite, { af: 'Nog nie; daar is nog werk op die plaas.', en: "Not yet; there's still work to do on the farm." });
      return;
    }
    this.leaving = true;
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Road'));
  }

  // Switch to his eyes: down the well, over the pond, or from the tractor seat.
  lookAt(spot) {
    this.player.face(spot.face);
    this.leaving = true;
    const cam = this.cameras.main;
    cam.fadeOut(300);
    cam.once('camerafadeoutcomplete', () => {
      this.events.once('resume', () => {
        this.leaving = false;
        cam.fadeIn(300);
        this.fillPail();
        this.workDone();
      });
      this.scene.launch('View', { view: spot.view, spot: spot.id });
      this.scene.pause();
    });
  }

  // Water in the pail by the red-roofed well, once he's filled it.
  fillPail() {
    if (this.pail || !hasFlag('wellTop')) return;
    const { x, y, depth } = PAIL;
    this.pail = this.add.graphics().setDepth(depth);
    this.pail.fillStyle(0x3a86c8).fillEllipse(x, y, 14, 5);
    this.pail.fillStyle(0xa8dcf8).fillEllipse(x - 3, y - 1, 5, 1.5);
  }

  // Wednesday's work all done (src/chores.js): tired out, ready for bed.
  workDone() {
    if (today() !== WEDNESDAY || choresLeft() || hasFlag('choresDone')) return;
    setFlag('choresDone');
    setFlag('tired');
    this.time.delayedCall(400, () => think(this, this.player.sprite, {
      af: 'So, dis klaar vir vandag. Nou is ek moeg! Môre kyk ek wat met die onderste put fout is.',
      en: "There, that's today's work done. Now I'm tired! Tomorrow I'll see what's wrong with the bottom well.",
    }));
  }

  // Close-up of the two of them talking (TalkScene), then back to the farm.
  // Bob's "!" stays until a talk is heard to the end (not closed early).
  talkToBob() {
    this.player.face('right');
    this.bob.faceJones();
    this.leaving = true;
    const cam = this.cameras.main;
    cam.fadeOut(300);
    cam.once('camerafadeoutcomplete', () => {
      this.events.once('resume', (_sys, { finished } = {}) => {
        if (finished) {
          setFlag('metBob');
          this.bob.hideMark();
        }
        if (hasFlag('gavePie')) this.sendBobForPie();
        else this.bob.faceFarm();
        this.leaving = false;
        cam.fadeIn(300);
      });
      this.scene.launch('Talk', { lines: hasFlag('metBob') ? AGAIN : FIRST_MEETING });
      this.scene.pause();
    });
  }

  // Offered the pie, Bob walks up the path to the farmhouse and goes in.
  sendBobForPie() {
    const bob = this.bob;
    this.bob = null; // nobody to talk to at the gate now
    const door = rectCenter(BUILDINGS.house.door);
    bob.walkInto(farmGrid.findRoute(bob.sprite.x, bob.sprite.y, door.x, door.y), this.player.speed * 0.8);
    this.game.events.emit('location', { name: { af: 'Pieter is op pad na sy tert!', en: "Bob's off for his pie!" } });
  }

  enter(id) {
    if (id === 'barn') bike.riding = false; // his bike, back on its stand
    this.leaving = true;
    this.player.stop();
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Interior', { building: id }));
  }
}
