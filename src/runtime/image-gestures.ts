import type { Point, Viewport } from './geometry';

export interface ImageGestureOptions {
  viewport(): Viewport;
  enabled(): boolean;
  canStart(point: Point): boolean;
  onStart?(point: Point): void;
  onTap(point: Point): void;
  onPan(delta: Point, point: Point): void;
  /** Opt in to wheel zoom; other canvases retain their existing scroll behaviour. */
  wheelZoom?: boolean;
  /** Incremental scale and previous/current two-finger midpoint, all in CSS coordinates. */
  onPinch(change: { from: Point; to: Point; scale: number }): void;
}

/** Tap only after release. A drag, second finger or interruption suppresses the entire tap. */
export function bindImageGestures(canvas: HTMLCanvasElement, options: ImageGestureOptions) {
  const points = new Map<number, Point>();
  let start: Point | null = null;
  let last: Point | null = null;
  let moved = false;
  let multiple = false;
  let pair: { midpoint: Point; distance: number } | null = null;
  const canInteract = () => options.enabled() && !canvas.closest?.('[inert]')
    && (typeof document === 'undefined' || (!document.hidden && !document.querySelector('dialog[open]')));
  const position = (event: PointerEvent | WheelEvent): Point => {
    const rect = canvas.getBoundingClientRect(), viewport = options.viewport();
    return { x: (event.clientX - rect.left) * viewport.width / Math.max(1, rect.width),
      y: (event.clientY - rect.top) * viewport.height / Math.max(1, rect.height) };
  };
  const measurePair = () => {
    const [a, b] = [...points.values()];
    return a && b ? { midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      distance: Math.hypot(a.x - b.x, a.y - b.y) } : null;
  };
  const cancel = () => {
    const ids = [...points.keys()];
    points.clear(); start = null; last = null; pair = null; moved = true; multiple = false;
    for (const id of ids) if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
  };
  const down = (event: PointerEvent) => {
    if (!canInteract() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const point = position(event);
    if (!options.canStart(point)) return;
    event.preventDefault();
    if (!points.size) { start = point; last = point; moved = false; multiple = false; options.onStart?.(point); }
    points.set(event.pointerId, point);
    canvas.setPointerCapture?.(event.pointerId);
    if (points.size > 1) { multiple = true; moved = true; pair = measurePair(); }
  };
  const move = (event: PointerEvent) => {
    if (!points.has(event.pointerId)) return;
    if (!canInteract()) { cancel(); return; }
    event.preventDefault();
    const point = position(event); points.set(event.pointerId, point);
    if (points.size > 1) {
      const next = measurePair();
      if (next && pair && pair.distance > 1 && next.distance > 1)
        options.onPinch({ from: pair.midpoint, to: next.midpoint, scale: next.distance / pair.distance });
      pair = next; return;
    }
    if (start && Math.hypot(point.x - start.x, point.y - start.y) > 5) moved = true;
    if (moved && last) options.onPan({ x: point.x - last.x, y: point.y - last.y }, point);
    last = point;
  };
  const up = (event: PointerEvent) => {
    if (!points.has(event.pointerId)) return;
    event.preventDefault();
    const point = position(event);
    const tap = canInteract() && points.size === 1 && !multiple && !moved && start
      && Math.hypot(point.x - start.x, point.y - start.y) <= 5;
    points.delete(event.pointerId); pair = null;
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (tap) options.onTap(point);
    if (points.size) { last = [...points.values()][0]; start = last; moved = true; }
    else { start = null; last = null; }
  };
  const lost = (event: PointerEvent) => { if (points.has(event.pointerId)) cancel(); };
  const wheel = (event: WheelEvent) => {
    if (!canInteract() || !Number.isFinite(event.deltaY) || event.deltaY === 0) return;
    const point = position(event);
    if (!options.canStart(point)) return;
    event.preventDefault();
    // Scrolling during a held mouse press must not paint on the later release.
    cancel();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? options.viewport().height : 1;
    const pixels = Math.max(-240, Math.min(240, event.deltaY * unit));
    options.onPinch({ from: point, to: point, scale: Math.exp(-pixels * .002) });
  };
  const preventTouch = (event: TouchEvent) => { if (points.size) event.preventDefault(); };
  const previousTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', lost);
  canvas.addEventListener('touchmove', preventTouch, { passive: false });
  if (options.wheelZoom) canvas.addEventListener('wheel', wheel, { passive: false });
  window.addEventListener('blur', cancel);
  return { cancel, dispose() {
    cancel(); canvas.style.touchAction = previousTouchAction;
    canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel);
    canvas.removeEventListener('lostpointercapture', lost); canvas.removeEventListener('touchmove', preventTouch);
    if (options.wheelZoom) canvas.removeEventListener('wheel', wheel);
    window.removeEventListener('blur', cancel);
  } };
}
