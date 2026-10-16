// Player settings (not story progress: New game keeps them), in localStorage.
// hints: how much Farmer Jones lets on about what to do next — 'none',
// 'subtle' or 'explicit' (src/hints.js); chosen in the menu.
const KEY = 'farm-walk-settings';
const settings = { hints: 'subtle' };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(KEY)));
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
