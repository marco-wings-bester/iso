// Story progress (has he read? slept? met Bob?), kept in localStorage so it
// survives reloads and app updates. Falls back to memory if storage is blocked.
// A new game (menu) forgets it all.
const KEY = 'farm-walk-story';
let flags = {};
try {
  flags = JSON.parse(localStorage.getItem(KEY)) || {};
} catch {
  flags = {};
}

export function hasFlag(name) {
  return !!flags[name];
}

export function setFlag(name) {
  if (flags[name]) return;
  flags[name] = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(flags));
  } catch {
    // private mode: remember for this visit only
  }
}

export function resetFlags() {
  flags = {};
  try {
    localStorage.removeItem(KEY);
  } catch {
    // private mode: nothing was stored
  }
}
