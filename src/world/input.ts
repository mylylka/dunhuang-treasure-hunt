/** DOM input is deliberately separate from scene movement and React controls. */
export function createWorldInput(canvas: HTMLCanvasElement, onInteract: () => void, onCamera: (delta: number) => void, onIntent?: () => void) {
  const keys = new Set<string>();
  let enabled = true;
  let dragging = false;
  let lastX = 0;
  let joystick = { x: 0, y: 0 };
  const relevant = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE', 'KeyF']);
  const isTyping = (target: EventTarget | null) => target instanceof Element && !!target.closest('input, textarea, select, [contenteditable=true], dialog, [role=dialog]');
  function clear() { keys.clear(); dragging = false; joystick = { x: 0, y: 0 }; }
  function down(event: KeyboardEvent) {
    if (isTyping(event.target)) return;
    if (relevant.has(event.code)) onIntent?.();
    if (!enabled) return;
    if (relevant.has(event.code)) event.preventDefault();
    // Enter on a focused button belongs to React, not a second world action.
    if ((event.code === 'KeyF' || (event.code === 'Enter' && event.target === canvas)) && !event.repeat) onInteract();
    keys.add(event.code);
  }
  function up(event: KeyboardEvent) { keys.delete(event.code); }
  function pointerDown(event: PointerEvent) {
    if (!enabled || event.button !== 2) return;
    onIntent?.();
    dragging = true; lastX = event.clientX; canvas.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent) {
    if (!enabled || !dragging) return;
    onCamera((event.clientX - lastX) * -.004); lastX = event.clientX;
  }
  function pointerUp() { dragging = false; }
  function context(event: Event) { event.preventDefault(); }
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', clear);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('lostpointercapture', pointerUp);
  canvas.addEventListener('contextmenu', context);
  return {
    clear,
    setEnabled(value: boolean) { enabled = value; clear(); },
    setJoystick(x: number, y: number) { if (Math.hypot(x, y) > .08) onIntent?.(); if (enabled) joystick = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) }; },
    read() {
      const keyX = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      const keyY = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
      const keyboard = keyX !== 0 || keyY !== 0;
      return { x: keyboard ? keyX : joystick.x, y: keyboard ? keyY : joystick.y, run: keyboard ? keys.has('ShiftLeft') || keys.has('ShiftRight') : Math.hypot(joystick.x, joystick.y) > .82,
        camera: Number(keys.has('KeyQ')) - Number(keys.has('KeyE')) };
    },
    dispose() {
      clear();
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear);
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp); canvas.removeEventListener('lostpointercapture', pointerUp); canvas.removeEventListener('contextmenu', context);
    },
  };
}
