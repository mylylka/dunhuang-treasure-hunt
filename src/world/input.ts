export interface WorldInputPoint { clientX: number; clientY: number }
export interface WorldInputOptions {
  onTilt?(delta: number): void;
  /** Positive distances pull the camera away from the traveler, in metres. */
  onZoom?(delta: number): void;
}

interface PointerGesture {
  start: WorldInputPoint;
  last: WorldInputPoint;
  startedAt: number;
  moved: boolean;
  look: boolean;
  multiple: boolean;
  mouse: boolean;
  touch: boolean;
  button: number;
}

/** DOM input is deliberately separate from scene movement and React controls. */
export function createWorldInput(canvas: HTMLCanvasElement, onInteract: (point?: WorldInputPoint) => void, onCamera: (delta: number) => void, onIntent?: () => void, options: WorldInputOptions = {}) {
  const keys = new Set<string>();
  let enabled = true;
  const pointers = new Map<number, PointerGesture>();
  const previousTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = 'none';
  let joystick = { x: 0, y: 0 };
  const relevant = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE']);
  const isTyping = (target: EventTarget | null) => target instanceof Element && !!target.closest('input, textarea, select, [contenteditable=true], dialog, [role=dialog]');
  const point = (event: PointerEvent): WorldInputPoint => ({ clientX: event.clientX, clientY: event.clientY });
  function release(id: number) {
    // Cancellation can already have released capture at browser level.
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  function clearPointers() {
    const ids = [...pointers.keys()];
    pointers.clear();
    for (const id of ids) release(id);
  }
  function clear() { keys.clear(); clearPointers(); joystick = { x: 0, y: 0 }; }
  function visibility() { if (document.hidden) clear(); }
  function down(event: KeyboardEvent) {
    if (isTyping(event.target)) return;
    if (relevant.has(event.code)) onIntent?.();
    if (!enabled) return;
    // Enter on a focused button belongs to React, not a second world action.
    if (event.code === 'Enter' && event.target === canvas && !event.repeat) onInteract();
    if (relevant.has(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
  }
  function up(event: KeyboardEvent) { keys.delete(event.code); }
  function pointerDown(event: PointerEvent) {
    const mouse = event.pointerType === 'mouse' || !event.pointerType;
    if (event.button !== 0 && !(mouse && event.button === 2)) return;
    onIntent?.();
    if (!enabled) return;
    const start = point(event);
    const bounds = canvas.getBoundingClientRect();
    const gesture: PointerGesture = {
      start, last: start, startedAt: event.timeStamp, moved: false,
      look: mouse || event.clientX >= bounds.left + bounds.width / 2,
      multiple: pointers.size > 0, mouse, touch: event.pointerType === 'touch', button: event.button,
    };
    // A multi-finger gesture never becomes a delayed tap when a finger lifts.
    if (pointers.size) for (const active of pointers.values()) active.multiple = true;
    pointers.set(event.pointerId, gesture);
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent) {
    if (!enabled) return;
    const current = point(event), gesture = pointers.get(event.pointerId);
    if (gesture) {
      // Capture may outlive the actual button after an interrupted release.
      if (gesture.mouse && (event.buttons & (gesture.button === 2 ? 2 : 1)) === 0) { cancelPointer(event); return; }
      if (gesture.touch && pointers.size === 2 && options.onZoom) {
        const other = [...pointers.values()].find(active => active !== gesture && active.touch);
        if (other) {
          const span = (position: WorldInputPoint) => Math.max(12, Math.hypot(position.clientX - other.last.clientX, position.clientY - other.last.clientY));
          // The ratio makes the gesture independent of the starting finger spacing.
          const delta = 5 * Math.log(span(gesture.last) / span(current));
          gesture.last = current;
          if (Number.isFinite(delta) && delta !== 0) options.onZoom(Math.max(-2, Math.min(2, delta)));
          return;
        }
      }
      if (Math.hypot(event.clientX - gesture.start.clientX, event.clientY - gesture.start.clientY) > 8) gesture.moved = true;
      // A left mouse press remains a click until it has moved beyond the tap threshold.
      if (gesture.look && (gesture.moved || (gesture.mouse && gesture.button === 2)) && !gesture.multiple) {
        onIntent?.();
        onCamera((event.clientX - gesture.last.clientX) * -.004);
        options.onTilt?.((event.clientY - gesture.last.clientY) * -.004);
      }
      gesture.last = current;
    }
  }
  function pointerUp(event: PointerEvent) {
    const gesture = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    release(event.pointerId);
    if (!enabled || !gesture || (gesture.mouse && gesture.button === 2) || gesture.moved || gesture.multiple
      || Math.hypot(event.clientX - gesture.start.clientX, event.clientY - gesture.start.clientY) > 8
      || event.timeStamp - gesture.startedAt > 500) return;
    const bounds = canvas.getBoundingClientRect();
    if (event.clientX >= bounds.left && event.clientX <= bounds.left + bounds.width
      && event.clientY >= bounds.top && event.clientY <= bounds.top + bounds.height) onInteract(point(event));
  }
  function cancelPointer(event: PointerEvent) {
    pointers.delete(event.pointerId);
    release(event.pointerId);
  }
  function wheel(event: WheelEvent) {
    if (!enabled || !options.onZoom) return;
    event.preventDefault();
    onIntent?.();
    for (const gesture of pointers.values()) if (!gesture.mouse || gesture.button !== 2) gesture.multiple = true;
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.getBoundingClientRect().height : 1);
    if (Number.isFinite(pixels)) options.onZoom(Math.max(-2, Math.min(2, pixels / 100)));
  }
  function context(event: Event) { event.preventDefault(); }
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', clear);
  window.addEventListener('pagehide', clear);
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('lostpointercapture', cancelPointer);
  canvas.addEventListener('wheel', wheel, { passive: false });
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
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); window.removeEventListener('pagehide', clear);
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', cancelPointer); canvas.removeEventListener('lostpointercapture', cancelPointer); canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('contextmenu', context);
      canvas.style.touchAction = previousTouchAction;
    },
  };
}
