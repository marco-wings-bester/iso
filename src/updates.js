/* global __BUILD_ID__ */

// Keep the game up to date by itself. Pages kept open in a phone's in-app
// browser, and installed apps resumed from the background, can keep running
// an old version long after a new one is deployed. So we compare this build's
// id with the server's version.json:
//  - when the game starts or comes back to the foreground, a newer version is
//    loaded straight away (nothing in progress to lose; a toast confirms it);
//  - if one appears mid-play (5-minute check), an update button is shown and
//    the update happens automatically next time the game comes back.
// A reload that doesn't actually bring the new build (e.g. the server is still
// updating) isn't retried in a loop; the button is shown instead.
// The menu's "Update game" checks on demand (updateNow).

const KEY = 'farm-walk-update-target';

function remember(build) {
  try {
    if (build) sessionStorage.setItem(KEY, build);
    else sessionStorage.removeItem(KEY);
  } catch {
    // private mode: no loop protection needed beyond the button
  }
}

function recalled() {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}

async function serverBuild() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).build || null;
  } catch {
    return null; // offline: keep playing the version we have
  }
}

export function watchForUpdates() {
  if (!import.meta.env.PROD) return;

  // Just reloaded to update?
  if (recalled() === __BUILD_ID__) {
    remember(null);
    toast('✨ Updated to the latest version');
  }

  const check = async (canReload) => {
    const build = await serverBuild();
    if (!build || build === __BUILD_ID__) return;
    if (canReload && recalled() !== build) {
      remember(build);
      location.reload();
    } else {
      showButton();
    }
  };

  check(true);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(true); });
  setInterval(() => check(false), 5 * 60 * 1000);
}

// Menu "Update game": check now and, if there's a newer version, drop the
// offline copies (so nothing old, like the map, is served from the cache) and
// reload. Returns 'updating', 'latest', or 'offline' if the server can't be
// reached.
export async function updateNow() {
  const build = await serverBuild();
  if (!build) return 'offline';
  if (build === __BUILD_ID__) return 'latest';
  remember(build);
  try {
    if (window.caches) await Promise.all((await caches.keys()).map(k => caches.delete(k)));
  } catch {
    // reload anyway
  }
  location.reload();
  return 'updating';
}

function showButton() {
  if (document.getElementById('update-btn')) return;
  const btn = Object.assign(document.createElement('button'), {
    id: 'update-btn',
    type: 'button',
    textContent: '✨ New version — tap to update',
  });
  btn.onclick = () => location.reload();
  document.body.append(btn);
}

function toast(text) {
  const el = Object.assign(document.createElement('div'), { id: 'update-toast', textContent: text });
  document.body.append(el);
  setTimeout(() => el.remove(), 2500);
}
