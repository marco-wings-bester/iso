// Story progress, kept in localStorage so it survives reloads and app
// updates; falls back to memory if storage is blocked. A new game (menu)
// forgets it all. The story so far: read the recipe book ('read') → bake the
// pie ('baked') → sleep ('slept') → Bob at the gate ('metBob', 'gavePie', …).
// (v2: progress saved under the old order — read, sleep, Bob — is dropped.)
const KEY = 'farm-walk-story-v2';
let flags = {};
try {
  localStorage.removeItem('farm-walk-story');
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
