const MOUSE_LOOK_YAW_PER_PIXEL = .006;
const MOUSE_LOOK_PITCH_PER_PIXEL = .004;

export function createMouseLook(
  canvas: HTMLCanvasElement,
  surface: HTMLElement,
  canCapture: () => boolean,
  onMove: (yaw: number, pitch: number) => void,
  onChange: (active: boolean) => void,
) {
  if (typeof canvas.requestPointerLock !== 'function' || typeof document.exitPointerLock !== 'function') return;

  let captureOnMove = true;
  let pending = false;
  let requested = false;
  let active = false;
  let disposed = false;
  const ownsLock = () => document.pointerLockElement === canvas;

  function setActive(value: boolean) {
    if (active === value) return;
    active = value;
    onChange(active);
  }

  function release() {
    requested = false;
    if (!active) return;
    setActive(false);
    if (ownsLock()) document.exitPointerLock();
  }

  function removeLockListeners() {
    document.removeEventListener('pointerlockchange', lockChanged);
    document.removeEventListener('pointerlockerror', lockFailed);
  }

  function lockChanged() {
    if (ownsLock()) {
      pending = false;
      if (requested && canCapture()) setActive(true);
      else document.exitPointerLock();
    } else if (active) {
      requested = false;
      setActive(false);
    }
    if (disposed && !pending) removeLockListeners();
  }

  function lockFailed() {
    pending = false;
    requested = false;
    if (disposed) removeLockListeners();
  }

  function request() {
    if (pending || document.pointerLockElement || !canCapture()) return;
    captureOnMove = false;
    pending = requested = true;
    canvas.focus({ preventScroll: true });
    try {
      // Browsers report failure through pointerlockerror even when returning a promise.
      void canvas.requestPointerLock()?.catch(() => {});
    } catch {
      lockFailed();
    }
  }

  function overDialog(event: Event) {
    return event.target instanceof Element && !!event.target.closest('dialog, [role="dialog"], [role="alertdialog"]');
  }

  function mouseDown(event: MouseEvent) {
    if (event.button !== 2 || (!ownsLock() && (!canCapture() || overDialog(event)))) return;
    event.preventDefault();
    if (active || pending) release();
    else request();
  }

  function mouseMove(event: MouseEvent) {
    if (!active || !ownsLock() || !canCapture() || (!event.movementX && !event.movementY)) return;
    onMove(-event.movementX * MOUSE_LOOK_YAW_PER_PIXEL, -event.movementY * MOUSE_LOOK_PITCH_PER_PIXEL);
  }

  function contextMenu(event: MouseEvent) {
    if (ownsLock() || (canCapture() && !overDialog(event))) event.preventDefault();
  }

  document.addEventListener('pointerlockchange', lockChanged);
  document.addEventListener('pointerlockerror', lockFailed);
  surface.addEventListener('mousedown', mouseDown);
  surface.addEventListener('contextmenu', contextMenu);
  canvas.addEventListener('mousemove', mouseMove);

  return {
    ownsLock,
    get active() { return active; },
    captureFromKeyboard() {
      if (captureOnMove && window.matchMedia('(any-pointer: fine)').matches) request();
    },
    release,
    suspend() {
      captureOnMove = true;
      release();
    },
    dispose() {
      disposed = true;
      release();
      // A request that completes after disposal must still release its lock.
      if (!pending) removeLockListeners();
      surface.removeEventListener('mousedown', mouseDown);
      surface.removeEventListener('contextmenu', contextMenu);
      canvas.removeEventListener('mousemove', mouseMove);
    },
  };
}
