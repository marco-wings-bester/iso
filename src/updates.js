/* global __BUILD_ID__ */

// Pages kept open in a phone's in-app browser (or an installed app) can keep
// running an old version long after a new one is deployed. Check the server's
// version.json whenever the game comes back to the foreground, and every few
// minutes, and offer a one-tap update when it differs from this build.
export function watchForUpdates() {
  if (!import.meta.env.PROD) return;

  const check = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const { build } = await res.json();
      if (build && build !== __BUILD_ID__) showBanner();
    } catch {
      // offline: keep playing the version we have
    }
  };

  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  setInterval(check, 5 * 60 * 1000);
  check();
}

function showBanner() {
  if (document.getElementById('update-btn')) return;
  const btn = Object.assign(document.createElement('button'), {
    id: 'update-btn',
    type: 'button',
    textContent: '✨ New version — tap to update',
  });
  btn.onclick = () => location.reload();
  document.body.append(btn);
}
