import { hasFlag, setFlag } from './state.js';
import { think } from './bubble.js';
import { line } from './hints.js';

// Saturday: once the fountain runs again (src/fountainFix.js) and Steffi has
// said yes to going out with him tonight (src/steffi.js), whichever comes
// last, Johan thinks about the evening: he'll need a tuxedo, and a table
// booked ('datePlan'). The tuxedo he rents from Faan in town, paying in
// hens and tomatoes (src/tailor.js); the table he books with Lize at the
// restaurant (src/restaurant.js). Both done: all set for tonight ('dateReady').

export async function planDate(scene) {
  if (hasFlag('datePlan') || !hasFlag('fountainFixed') || !hasFlag('dateSteffi')) return;
  setFlag('datePlan');
  const who = scene.player.sprite;
  await think(scene, who, { af: 'Vanaand gaan ek uit met Steffi! Maar ek kan nie in my oorpak gaan nie…', en: "Tonight I'm going out with Steffi! But I can't go in my overalls…" });
  await think(scene, who, { af: 'Ek het ’n tuxedo nodig. En ek moet ’n tafel vir ons twee bespreek.', en: 'I need a tuxedo. And I must book a table for the two of us.' });
  const hint = line('datePlan');
  if (hint) await think(scene, who, hint);
}

// The tuxedo on and the table booked: ready for tonight.
export async function dateReady(scene) {
  if (hasFlag('dateReady') || !hasFlag('tuxedo') || !hasFlag('tableBooked')) return;
  setFlag('dateReady');
  await think(scene, scene.player.sprite, { af: 'Tuxedo: reg. Tafel: bespreek. Nou is ek gereed vir vanaand!', en: "Tuxedo: done. Table: booked. Now I'm ready for tonight!" });
}
