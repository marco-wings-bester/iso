import { hasFlag, setFlag } from './state.js';
import { think } from './bubble.js';
import { line } from './hints.js';

// Saturday: once the fountain runs again (src/fountainFix.js) and Steffi has
// said yes to going out with him tonight (src/steffi.js), whichever comes
// last, Johan thinks about the evening: he'd better book a table
// ('datePlan'). He books it with Lize at the restaurant (src/restaurant.js),
// who mentions they dress formally for dinner: so a tuxedo, which he rents
// from Faan in town, paying in hens and tomatoes (src/tailor.js). Both done:
// all set for tonight ('dateReady').

export async function planDate(scene) {
  if (hasFlag('datePlan') || !hasFlag('fountainFixed') || !hasFlag('dateSteffi')) return;
  setFlag('datePlan');
  const who = scene.player.sprite;
  await think(scene, who, { af: 'Vanaand gaan ek uit met Steffi! Ek moet seker gaan ’n tafel vir ons twee bespreek.', en: "Tonight I'm going out with Steffi! I'd better go and book a table for the two of us." });
  const hint = line('datePlan');
  if (hint) await think(scene, who, hint);
}

// The tuxedo on and the table booked: ready for tonight.
export async function dateReady(scene) {
  if (hasFlag('dateReady') || !hasFlag('tuxedo') || !hasFlag('tableBooked')) return;
  setFlag('dateReady');
  await think(scene, scene.player.sprite, { af: 'Tuxedo: reg. Tafel: bespreek. Nou is ek gereed vir vanaand!', en: "Tuxedo: done. Table: booked. Now I'm ready for tonight!" });
}
