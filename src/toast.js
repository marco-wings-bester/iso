// A short message over the game (e.g. "New game started"). It stays until
// the next tap or key press, so there's time to read it (and that tap still
// does what it would anyway). One per `id` at a time.
export function toast(text, { id = 'menu-toast', className = 'toast' } = {}) {
  document.getElementById(id)?.remove();
  const el = Object.assign(document.createElement('div'), { id, className, textContent: text });
  document.body.append(el);
  const hide = (e) => {
    if (e.repeat) return;
    el.remove();
    removeEventListener('pointerdown', hide, true);
    removeEventListener('keydown', hide, true);
  };
  // from the next tap on: not the one that's showing it
  setTimeout(() => {
    if (!el.isConnected) return;
    addEventListener('pointerdown', hide, true);
    addEventListener('keydown', hide, true);
  });
}
