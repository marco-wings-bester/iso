import Phaser from 'phaser';
import { createCharacter, createBike } from './CharacterSprite.js';
import Player from './Player.js';
import WalkGrid from './WalkGrid.js';
import { BUILDINGS, inRect } from './buildings.js';
import { ROOMS, WALL, pieTexture } from './interiors.js';
import { INTERIOR_SPEED } from './constants.js';
import { UI } from './screen.js';
import { hasFlag, setFlag, clearFlag } from './state.js';
import { nextDay, today, SUNDAY } from './days.js';
import { wakeThought } from './morning.js';
import { night, lastNight } from './night.js';
import { choresLeft, notYet } from './chores.js';
import { seatBob } from './bob.js';
import { bakePie, eatHalf } from './baking.js';
import { think } from './bubble.js';
import { line } from './hints.js';
import { knock, hideBob, bobWaiting, bobInChest, sarahVisits, sarahWaiting, openChest } from './sarah.js';
import { setUpCafe, atCounter, atTable, atWindow } from './cafe.js';
import { setUpDerikHouse, atDerikTable, atDerikBooks } from './derikHouse.js';
import { setUpTailor, atFaan, atCubicle, atSuits } from './tailor.js';
import { setUpRestaurant, atLize, atOurTable } from './restaurant.js';
import { isRaining } from './weather.js';
import { bike, pedal, SPEED as BIKE_SPEED, BODY as BIKE_BODY } from './bike.js';

const FADE_MS = 250;
const BODY = 5; // half the farmer's width in sprite px: keeps him off walls and furniture

// Feet-position walkability inside a room (room px = sprite px), around
// `solid` things, for someone `body` px either side of his feet.
function walkable(room, x, y, solid, body) {
  const { w, h, wallH, door } = room;
  const inDoorway = x >= door.x + body && x <= door.x + door.w - body && y >= h - WALL - 2 && y < h;
  const onFloor = x >= WALL + body && x <= w - WALL - body && y >= wallH + 3 && y <= h - WALL - 1;
  if (!onFloor && !inDoorway) return false;
  return !solid.some(r => x > r.x - body && x < r.x + r.w + body && y > r.y - 2 && y < r.y + r.h + 3);
}

// Pixel-art "z" for sleeping, white with the usual dark outline.
function makeZ(scene) {
  if (scene.textures.exists('zzz')) return;
  const rows = ['#####', '...#.', '..#..', '.#...', '#####'];
  const tex = scene.textures.createCanvas('zzz', 7, 7);
  const ctx = tex.getContext();
  const on = (x, y) => rows[y]?.[x] === '#';
  for (let y = -1; y <= 5; y++) {
    for (let x = -1; x <= 5; x++) {
      const filled = on(x, y);
      const edge = !filled && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => on(x + dx, y + dy));
      if (!filled && !edge) continue;
      ctx.fillStyle = filled ? '#ffffff' : '#2e1d0c';
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

// Inside a building: same farmer and controls, everything drawn ~3x bigger.
export default class InteriorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Interior' });
  }

  create({ building }) {
    this.building = building;
    const room = ROOMS[building];
    const key = `room-${building}`;
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, room.w, room.h);
      room.draw(tex.getContext());
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.add.image(0, 0, key).setOrigin(0).setDepth(0);
    room.animate?.(this);
    createCharacter(this);
    createBike(this);
    // his bike, if it's here on its stand (and not out with him, or left outside another door)
    this.bikeHere = !!room.bike && !bike.riding && !bike.parked;
    if (this.bikeHere) this.bikeImage = this.add.image(room.bike.x, room.bike.y, 'bike-px').setOrigin(0).setDepth(room.bike.y + 26);

    // (on his bike, he's wider: the wheels stay off the walls and furniture)
    const solid = this.bikeHere ? [...room.solid, room.bike.solid] : room.solid;
    const body = bike.riding ? BIKE_BODY : BODY;
    const grid = WalkGrid.fromFn(room.w, room.h, 2, (x, y) => walkable(room, x, y, solid, body));
    const doorX = room.door.x + room.door.w / 2;
    this.player = new Player(this, {
      x: doorX,
      y: room.h - WALL - 8,
      dir: 'up',
      texture: bike.riding ? 'player-bike-px' : 'player-px',
      speed: INTERIOR_SPEED * (bike.riding ? BIKE_SPEED : 1),
      grid,
    });
    this.exitY = room.h - 3;
    this.leaving = false;
    this.busy = false;  // baking, eating, talking: taps and keys only move speech along
    this.carry = null;  // what he's carrying (follows him)
    this.choice = null; // replies to pick from, while someone's waiting for one (src/dialog.js)
    document.body.classList.remove('choosing');
    this.sarah = null;
    this.chestLid = null;  // Bob in the chest (src/sarah.js)…
    this.wobbleChest = null; // …and its wobble

    // Fixed camera: the whole room fills the screen (~3x on a phone, so the
    // farmer is ~2.5x his farm size) and stays put while he walks around.
    const cam = this.cameras.main;
    cam.setBackgroundColor('#1a1008').fadeIn(FADE_MS);
    const fit = () => {
      const zoom = Math.min(this.scale.width / room.w, this.scale.height / room.h);
      cam.setZoom(zoom).centerOn(room.w / 2, room.h / 2);
      this.player.markerScale = UI / zoom;
    };
    fit();
    this.scale.on('resize', fit);
    this.events.once('shutdown', () => this.scale.off('resize', fit));

    this.room = room;
    const spots = room.spots ?? {};
    if (spots.read) {
      // Gap left on the shelf while he's reading that book.
      const b = spots.read.book;
      this.bookGap = this.add.rectangle(b.x, b.y, b.w, b.h, 0x4a2a14).setOrigin(0).setDepth(1).setVisible(false);
    }
    // things lying about to take (the apple picker, the crowbar, the
    // tractor's keys), from when they're there (`when`) till they're taken
    this.props = {};
    this.placeProps();
    if (spots.saw && hasFlag('saw')) this.sawGap();
    if (spots.sleep) {
      // Him asleep in bed, and the room dimming to night (the fire stays bright).
      this.sleeper = this.roomImage(`sleeper-${building}`, spots.sleep.overlay).setDepth(0.4).setVisible(false);
      this.night = this.add.rectangle(0, 0, room.w, room.h, 0x0b0a24).setOrigin(0).setDepth(0.5).setAlpha(0);
      makeZ(this);
    }

    // Tap to walk; tapping the doorway or below the room walks out; tapping
    // a spot (bookshelf, cupboard, table, chest, bed, fireplace) walks there
    // and uses it.
    this.input.keyboard.on('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && this.thought && !this.choice) this.thought.destroy();
    });
    this.input.on('pointerdown', (pointer) => {
      const { worldX: x, worldY: y } = pointer;
      if (this.choice) {
        this.choice.tap(x, y);
        return;
      }
      // a bubble stays up until a tap moves it along (and that's all the tap does)
      if (this.thought) {
        this.thought.destroy();
        return;
      }
      if (this.leaving || this.busy) return;
      // (something lying there to take comes first: the keys on the bookshelf)
      const here = ([id, s]) => inRect(x, y, s.area) && (id !== 'bike' || this.bikeHere) && (!s.prop || this.props[id]);
      const spot = Object.entries(spots).filter(here).sort(([, a], [, b]) => !!b.prop - !!a.prop)[0];
      if (spot) {
        const [id, s] = spot;
        const use = s.prop ? () => this.take(id) : {
          read: () => this.read(), cook: () => this.useCupboard(), eat: () => this.eatPie(), sleep: () => this.tryToSleep(),
          fire: () => this.lookAtFire(), hide: () => this.useChest(), counter: () => atCounter(this), bike: () => this.takeBike(),
          tableA: () => atTable(this, 'tableA'), tableB: () => atTable(this, 'tableB'), window: () => atWindow(this),
          derikTable: () => atDerikTable(this), derikBooks: () => atDerikBooks(this), saw: () => this.takeSaw(),
          faan: () => atFaan(this), cubicle: () => atCubicle(this), suits: () => atSuits(this),
          lize: () => atLize(this), ourTable: () => atOurTable(this),
        }[id];
        this.player.walkTo(s.stand.x, s.stand.y, use);
      } else if (y > room.h - WALL) this.player.walkTo(doorX, room.h - 1);
      else this.player.walkTo(x, y);
    });

    // Once baked, the pie is on the table (half of it once Jones has had his);
    // given the rest, Bob is there eating it, and once he's finished there's
    // a knock at the door (src/sarah.js): then he's waiting to be hidden, or
    // hidden in the chest. The night overlay is under Bob, so he's dimmed by
    // hand while Jones sleeps.
    const house = building === 'house';
    const { pie } = room.kitchen?.table ?? {};
    if (house && hasFlag('baked') && !hasFlag('gavePie')) {
      this.pie = this.add.image(pie.x, pie.y, pieTexture(this, hasFlag('ate') ? 4 : 8)).setOrigin(0).setDepth(0.45);
    }
    this.bob = null;
    if (house && hasFlag('gavePie')) {
      const knockSoon = () => this.time.delayedCall(2500, () => knock(this));
      if (hasFlag('sarahKnocked')) {
        this.add.image(pie.x, pie.y, pieTexture(this, 0)).setOrigin(0).setDepth(0.45); // his empty plate
        if (hasFlag('bobHome')) {
          // all over: Bob's gone home
        } else if (hasFlag('bobHidden')) {
          bobInChest(this);
          if (!hasFlag('sarahVisited')) this.time.delayedCall(1200, () => sarahVisits(this));
          else if (hasFlag('toldSarah')) sarahWaiting(this);
        }
        else this.bob = bobWaiting(this);
      } else {
        this.bob = seatBob(this, knockSoon);
        if (hasFlag('pieEaten')) knockSoon();
      }
    }

    if (building === 'cafe') setUpCafe(this);
    if (building === 'derik') setUpDerikHouse(this);
    if (building === 'tailor') setUpTailor(this);
    if (building === 'restaurant') setUpRestaurant(this);
    // home for salt for Derik's braai (src/derik.js): the salt pot's empty
    if (house && hasFlag('needSalt') && !hasFlag('salt') && !hasFlag('noSaltHome')) {
      setFlag('noSaltHome');
      this.time.delayedCall(800, async () => {
        await this.think({ af: 'Kom ek kyk of daar sout is…', en: "Let me see if there's any salt…" });
        if (this.sys.isActive()) this.think(line('noSalt'));
      });
    }

    this.game.events.emit('location', { name: room.name ?? BUILDINGS[building].name });
  }

  // Tint Bob to match the room dimming to night.
  dimBob() {
    if (!this.bob) return;
    const a = this.night.alpha;
    this.bob.setTint(Phaser.Display.Color.GetColor(255 * (1 - a), 255 * (1 - a), 255 * (1 - a * 0.8)));
  }

  // The things lying about that are there now and not yet taken.
  placeProps() {
    Object.entries(this.room.spots ?? {}).forEach(([id, s]) => {
      if (!s.prop || this.props[id] || hasFlag(s.flag) || !(s.when?.() ?? true)) return;
      this.props[id] = this.roomImage(`${id}-${this.building}`, s.prop).setDepth(1);
    });
  }

  // An image from a room's {x, y, w, h, draw} (drawn once into a texture).
  roomImage(key, o) {
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, o.w, o.h);
      o.draw(tex.getContext());
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    return this.add.image(o.x, o.y, key).setOrigin(0);
  }

  think(text) {
    return think(this, this.player.sprite, text);
  }

  // The kitchen cupboard: bake the pie, once he's read the recipe and has an
  // apple. Otherwise a hint, at the level set in the menu.
  useCupboard() {
    this.player.face('left');
    if (hasFlag('needSalt') && !hasFlag('salt')) this.think(line('noSalt'));
    else if (!hasFlag('read')) this.think(line('cupboardNoRecipe'));
    else if (hasFlag('gavePie')) this.think({ af: 'Pieter het nou die tert.', en: 'Bob has the pie now.' });
    else if (hasFlag('baked')) this.think({ af: 'Ek het al klaar ’n tert gebak.', en: "I've already baked a pie." });
    else if (!hasFlag('apple')) this.think(line('cupboardNoApple'));
    else bakePie(this);
  }

  // The big chest: where Bob hides when Sarah knocks, then gets stuck in
  // (until it's prised open with the crowbar).
  useChest() {
    this.player.face('right');
    if (isRaining() && !hasFlag('umbrella')) this.takeUmbrella();
    else if (hasFlag('sarahKnocked') && !hasFlag('bobHidden')) hideBob(this);
    else if (hasFlag('bobHidden') && hasFlag('sarahVisited') && !hasFlag('bobHome')) openChest(this);
    else if (hasFlag('bobHidden') && !hasFlag('bobHome')) this.think({ af: 'Sjuut… Pieter is daarin.', en: "Shh… Bob's in there." });
    else if (isRaining()) this.think({ af: 'Net ou komberse hierin.', en: 'Just old blankets in here.' }); // (his umbrella's out with him)
    else this.think({ af: 'Net ou komberse hierin, en my sambreel.', en: 'Just old blankets in here, and my umbrella.' });
  }

  // Sarah's at the door and Bob isn't hidden yet: no going out.
  mustHideBob() {
    return this.building === 'house' && hasFlag('sarahKnocked') && !hasFlag('bobHidden');
  }

  // Friday's rain (src/weather.js), and he hasn't got his umbrella: no going out.
  needUmbrella() {
    return this.building === 'house' && isRaining() && !hasFlag('umbrella');
  }

  // His umbrella, from the big chest: he opens it, takes it out, and shuts it.
  async takeUmbrella() {
    this.busy = true;
    const { chest } = this.room;
    const open = this.roomImage('chest-open', chest.open).setDepth(0.4);
    await new Promise(r => this.time.delayedCall(500, r));
    setFlag('umbrella');
    await this.think({ af: 'Daar’s my sambreel! Nou kan ek uitgaan.', en: "There's my umbrella! Now I can go out." });
    open.destroy();
    this.busy = false;
  }

  // The pie on the table: he has half of it, and that makes him sleepy.
  eatPie() {
    if (!hasFlag('baked') || hasFlag('gavePie')) return;
    if (hasFlag('ate')) this.think({ af: 'Ek is vol. Ek hou die res vir later.', en: "I'm full. I'll save the rest for later." });
    else eatHalf(this);
  }

  // Bed: only when he's tired (after eating the pie, or a good long ride on
  // his bike, src/bike.js); after the cafe's coffee he's wide awake till then.
  // And not before the day's farm work is done (Wednesday: src/chores.js).
  tryToSleep() {
    if (this.mustHideBob()) this.think(line('notNow'));
    else if (choresLeft()) this.think(notYet()); // the day's farm work first (src/chores.js)
    else if (hasFlag('tired')) this.sleep();
    else if (hasFlag('wired')) this.think(line('wideAwake'));
    else this.think(line('bedEarly'));
  }

  // His bike: out of the barn on it, riding (GameScene). Not before the
  // cafe's coffee, though: there's too much to do.
  async takeBike() {
    this.player.face('right');
    if (!hasFlag('coffee')) {
      this.think({ af: 'Ek sou graag wou, maar ek het vandag ander goed om te doen.', en: "I'd love to, but I've got other things to do today." });
      return;
    }
    this.busy = true;
    await this.think(hasFlag('wired')
      ? { af: '’n Bietjie oefening… kom ek gaan fietsry!', en: 'A bit of exercise… time for a bike ride!' }
      : { af: 'Kom ek gaan ry ’n bietjie fiets!', en: "I'll go for a little bike ride!" });
    bike.riding = true;
    this.bikeImage.setVisible(false);
    this.leaving = true;
    this.player.stop();
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { from: this.building }));
  }

  // The saw on the tool rack: once he knows what he wants a willow stick for
  // (Derik's book: src/derikHouse.js), he takes it.
  takeSaw() {
    this.player.face('up');
    if (hasFlag('saw')) return;
    if (!hasFlag('readDowsing')) {
      this.think({ af: '’n Saag. Ek het dit nou nie nodig nie.', en: "A saw. I don't need it right now." });
      return;
    }
    setFlag('saw');
    this.sawGap();
    this.think(line('sawFound'));
  }

  // The tool rack with the saw gone: just its peg.
  sawGap() {
    const { x, y, w, h } = this.room.spots.saw.gap;
    const g = this.add.graphics().setDepth(0.3);
    g.fillStyle(0xa86a3c).fillRect(x, y, w, h);
    g.fillStyle(0x7a4a2a);
    [12, 17, 22].forEach(px => [11, 16].forEach(py => g.fillRect(px, py, 1, 1)));
    g.fillStyle(0x5a6070).fillRect(x + 7, y + 1, 2, 2); // the peg it hung on
  }

  // Take something lying about (the apple picker, the crowbar).
  take(id) {
    const s = this.room.spots[id];
    this.player.face('up');
    if (hasFlag(s.flag)) return;
    if (s.need && !s.need()) {
      this.think({ af: 'Hmm. Ek het dit nou nie nodig nie.', en: "Hmm. I don't need that right now." });
      return;
    }
    this.props[id].destroy();
    delete this.props[id];
    setFlag(s.flag);
    this.think(line(s.found));
  }

  // Take the recipe book off the shelf, turn around and read until the next
  // tap or key. The first time, it gives him an idea.
  read() {
    const firstTime = !hasFlag('read');
    const timer = this.time.delayedCall(450, () => {
      this.bookGap.setVisible(true);
      setFlag('read');
      this.player.dir = 'down';
      this.player.sprite.play('player-px-read');
    });
    this.player.face('up');
    this.player.act(`${this.player.texture}-idle-up`, () => {
      timer.remove();
      this.bookGap.setVisible(false);
      if (firstTime && hasFlag('read')) this.think(line('idea'));
    });
  }

  // Look into the fire: his view of it (ViewScene), then back in the room.
  lookAtFire() {
    this.player.face('up');
    this.look('fire');
  }

  // Look in his wallet (at the cafe's counter); resolves once he's done.
  lookInWallet() {
    return this.look('wallet');
  }

  // His view of something (ViewScene `view`, which one: `spot`), then back
  // in the room.
  look(view, spot = null) {
    this.leaving = true;
    const cam = this.cameras.main;
    cam.fadeOut(300);
    return new Promise(done => cam.once('camerafadeoutcomplete', () => {
      this.events.once('resume', () => {
        this.leaving = false;
        cam.fadeIn(300);
        done();
      });
      this.scene.launch('View', { view, from: 'Interior', spot });
      this.scene.pause();
    }));
  }

  // Climb into bed: the room darkens to night and z's float up until the
  // next tap or key; then the night passes.
  sleep() {
    const { player } = this;
    let zzz = null;
    const timer = this.time.delayedCall(300, () => {
      player.sprite.setVisible(false);
      this.sleeper.setVisible(true);
      this.tweens.killTweensOf(this.night);
      this.tweens.add({ targets: this.night, alpha: 0.6, duration: 900, onUpdate: () => this.dimBob() });
      zzz = this.time.addEvent({ delay: 1100, startAt: 900, loop: true, callback: () => this.puffZ() });
    });
    player.face('left');
    player.act(`${player.texture}-idle-left`, () => {
      timer.remove();
      zzz?.remove();
      if (this.sleeper.visible) this.nightPasses();
      else player.face('down'); // (changed his mind before he was in)
    });
  }

  // The night goes by over the farm, sunset to sunrise (src/night.js; the new
  // day comes with the dawn); then he's up beside the bed in the early light,
  // rested (and, the night after the pie, Bob's at the gate). Sunday night
  // is the end of the week, and of the game.
  async nightPasses() {
    const { player } = this;
    const cam = this.cameras.main;
    this.leaving = true; // nothing moves meanwhile
    await new Promise((r) => {
      cam.fadeOut(900);
      cam.once('camerafadeoutcomplete', r);
    });
    const map = this.textures.get('map').getSourceImage(); // the farm (GameScene's)
    if (today() === SUNDAY) {
      // the end of the week, and of the game: then a new week (main.js)
      await lastNight(map);
      window.dispatchEvent(new Event('farmwalk-newgame'));
      return;
    }
    if (hasFlag('ate')) setFlag('slept');
    clearFlag('tired');
    clearFlag('wired');
    bike.pedalled = 0;
    await night(map, () => nextDay());
    this.placeProps(); // (a new day: something may be lying about now)
    player.stop(); // (not off to wherever the tap that ended the night was)
    player.sprite.setVisible(true);
    this.sleeper.setVisible(false);
    this.tweens.killTweensOf(this.night);
    this.night.setAlpha(0);
    this.dimBob();
    const sunrise = this.add.rectangle(0, 0, this.room.w, this.room.h, 0xffb060).setOrigin(0).setDepth(0.5).setAlpha(0.35);
    this.tweens.add({ targets: sunrise, alpha: 0, duration: 3000, onComplete: () => sunrise.destroy() });
    player.face('down');
    cam.fadeIn(900);
    this.leaving = false;
    this.time.delayedCall(1100, () => { if (!this.thought && !this.busy) this.think(wakeThought()); });
  }

  puffZ() {
    const { x, y } = this.room.spots.sleep.zzz;
    const z = this.add.image(x, y, 'zzz').setDepth(2).setScale(0.6);
    this.tweens.add({
      targets: z, x: x + 10, y: y - 20, scale: 1.1, alpha: 0, duration: 2200,
      onComplete: () => z.destroy(),
    });
  }

  update(_time, delta) {
    if (this.leaving) return;
    pedal(this, this.player.update(delta / 1000), delta / 1000);
    const { x, y, dir } = this.player;
    // what he carries is in his hands: in front of him, or hidden behind him facing away
    const side = { left: -4, right: 4 }[dir] ?? 0;
    this.carry?.setPosition(x + side, y - 7).setDepth(y + (dir === 'up' ? -0.5 : 0.5));
    if (y < this.exitY) return;
    if (!this.mustHideBob() && !this.needUmbrella()) {
      this.leave();
      return;
    }
    // back from the doorway
    this.player.stop();
    this.player.y = this.room.h - WALL - 10;
    this.player.face('up');
    this.think(line(this.mustHideBob() ? 'notNow' : 'needUmbrella'));
  }

  leave() {
    if (this.coffee) setFlag('coffeeDone'); // out of the cafe with it: it's finished
    this.leaving = true;
    this.player.stop();
    this.cameras.main.fadeOut(FADE_MS);
    // out to the farm (by this building's door), or wherever its door goes
    const { to = 'Game', data = { from: this.building } } = this.room.exit ?? {};
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(to, data));
  }
}
