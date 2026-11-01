/** One capture listener for all narration owners. A held Space skips exactly one line. */
const owners: (() => boolean)[] = [];
let consumed = false;
function typing(target: EventTarget | null) {
  return target instanceof Element && !!target.closest('input, textarea, select, [contenteditable=true]');
}
function down(event: KeyboardEvent) {
  if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey || typing(event.target)) return;
  if (!consumed && !event.repeat) {
    for (let i = owners.length - 1; i >= 0; i--) if (owners[i]()) { consumed = true; break; }
  }
  if (consumed) { event.preventDefault(); event.stopImmediatePropagation(); }
}
function up(event: KeyboardEvent) {
  if (event.code !== 'Space' || !consumed) return;
  event.preventDefault(); event.stopImmediatePropagation(); consumed = false;
}
function blur() { consumed = false; }
export function registerSpeechSkip(skip: () => boolean) {
  if (typeof window === 'undefined') return () => {};
  if (!owners.length) {
    window.addEventListener('keydown', down, true); window.addEventListener('keyup', up, true);
    window.addEventListener('blur', blur);
  }
  owners.push(skip);
  return () => {
    const index = owners.indexOf(skip); if (index >= 0) owners.splice(index, 1);
    if (!owners.length) {
      window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up, true);
      window.removeEventListener('blur', blur); consumed = false;
    }
  };
}
