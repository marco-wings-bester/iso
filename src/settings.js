// Player settings (not story progress: New game keeps them), in localStorage.
// Both are chosen in the menu:
// - lang: 'af' (Afrikaans, the default) or 'en' (English; src/i18n.js);
// - hints: how much Farmer Jones lets on about what to do next — 'none' (the
//   default), 'subtle' or 'explicit' (src/hints.js).
// (index.html reads lang too, for its loading messages.)
const KEY = 'farm-walk-settings';
const VERSION = 2;
const settings = { lang: 'af', hints: 'none' };
try {
  const saved = JSON.parse(localStorage.getItem(KEY)) ?? {};
  // Saved before version 2, hints 'subtle' was most likely just the old
  // default (stored along with any other change), so it goes.
  if (!saved.v && saved.hints === 'subtle') delete saved.hints;
  Object.assign(settings, saved, { v: VERSION });
} catch {
  // private mode: defaults for this visit
}

export function getSetting(name) {
  return settings[name];
}

export function setSetting(name, value) {
  settings[name] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // private mode: remember for this visit only
  }
}
