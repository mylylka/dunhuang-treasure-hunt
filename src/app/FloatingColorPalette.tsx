import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { clampFloatingPanel, fitFloatingPanel, type FloatingPanelLayout } from '../runtime/floating-panel';
import { getMobileLandscapeBlocked, subscribeMobileLandscape } from '../services/mobile-landscape';
import { DialogCloseButton } from './DialogCloseButton';

export interface FloatingColorPaletteProps {
  referenceRef: RefObject<HTMLElement | null>;
  actionsRef: RefObject<HTMLElement | null>;
  opener: HTMLElement | null;
  onClose(): void;
  children: ReactNode;
  allowCanvasOverlap?: boolean;
}

export function FloatingColorPalette({ referenceRef, actionsRef, opener, onClose, children,
  allowCanvasOverlap = false }: FloatingColorPaletteProps) {
  const [layout, setLayout] = useState<FloatingPanelLayout | null>(null);
  const frame = useRef<FloatingPanelLayout | null>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const helpId = useId();
  const update = (next: FloatingPanelLayout) => { frame.current = next; setLayout(next); };
  const cancelDrag = () => {
    const active = drag.current; drag.current = null;
    if (active && handle.current?.hasPointerCapture(active.id)) handle.current.releasePointerCapture(active.id);
  };

  useLayoutEffect(() => {
    let request = 0;
    const measure = () => {
      request = 0;
      // Hidden portrait surfaces have zero bounds; retain the last legal position
      // and remeasure after the guard reveals the same studio on return.
      if (getMobileLandscapeBlocked()) return;
      const reference = referenceRef.current?.getBoundingClientRect(), actions = actionsRef.current?.getBoundingClientRect();
      if (!reference?.width || !reference.height || !actions?.width || !actions.height) return;
      const tools = { x: reference.left, y: Math.min(reference.top, actions.top),
        width: Math.max(reference.right, actions.right) - reference.left,
        height: Math.max(reference.bottom, actions.bottom) - Math.min(reference.top, actions.top) };
      const next = fitFloatingPanel({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }, tools,
        { width: 210, height: 250 }, allowCanvasOverlap, frame.current?.position);
      if (next) update(next);
    };
    const schedule = () => {
      cancelDrag();
      if (request) window.cancelAnimationFrame(request);
      request = window.requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    for (const element of [referenceRef.current, actionsRef.current, actionsRef.current?.parentElement]) if (element) observer.observe(element);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    window.addEventListener('blur', cancelDrag);
    const hide = () => { if (document.hidden) cancelDrag(); };
    document.addEventListener('visibilitychange', hide);
    window.visualViewport?.addEventListener('resize', schedule);
    const unsubscribe = subscribeMobileLandscape(schedule);
    measure();
    return () => {
      cancelDrag(); observer.disconnect(); unsubscribe();
      if (request) window.cancelAnimationFrame(request);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      window.removeEventListener('blur', cancelDrag);
      document.removeEventListener('visibilitychange', hide);
      window.visualViewport?.removeEventListener('resize', schedule);
    };
  }, [referenceRef, actionsRef, allowCanvasOverlap]);

  useEffect(() => () => {
    window.requestAnimationFrame(() => { if (opener?.isConnected) opener.focus({ preventScroll: true }); });
  }, [opener]);

  const pointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (drag.current || (event.pointerType === 'mouse' && event.button !== 0) || getMobileLandscapeBlocked()) return;
    event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current, current = frame.current;
    if (!active || active.id !== event.pointerId || !current) return;
    event.preventDefault(); event.stopPropagation();
    if (getMobileLandscapeBlocked()) { cancelDrag(); return; }
    const position = clampFloatingPanel({ x: current.position.x + event.clientX - active.x,
      y: current.position.y + event.clientY - active.y }, current.size, current.bounds);
    drag.current = { id: active.id, x: event.clientX, y: event.clientY };
    update({ ...current, position });
  };
  const pointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (drag.current?.id === event.pointerId) cancelDrag();
  };
  const moveWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = frame.current;
    if (!current) return;
    const distance = event.shiftKey ? 30 : 10;
    const offsets: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -distance, y: 0 }, ArrowRight: { x: distance, y: 0 },
      ArrowUp: { x: 0, y: -distance }, ArrowDown: { x: 0, y: distance },
    };
    if (event.key === 'Home' || offsets[event.key]) {
      event.preventDefault(); event.stopPropagation(); cancelDrag();
      const delta = offsets[event.key];
      const requested = event.key === 'Home' ? current.initialPosition
        : { x: current.position.x + delta.x, y: current.position.y + delta.y };
      update({ ...current, position: clampFloatingPanel(requested, current.size, current.bounds) });
    }
  };

  return <section className="floating-color-palette" role="dialog" aria-label="完整色盘" aria-modal="false"
    data-testid="floating-color-palette" style={{ visibility: layout ? 'visible' : 'hidden',
      left: layout?.position.x ?? 0, top: layout?.position.y ?? 0, width: layout?.size.width ?? 210, height: layout?.size.height ?? 250 }}
    onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}
    onPointerUp={event => event.stopPropagation()} onWheel={event => event.stopPropagation()}
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    <header>
      <button ref={handle} type="button" className="coloring-palette-drag-handle" aria-label="拖动完整色盘" data-sound="none"
        aria-describedby={helpId} onPointerDown={pointerDown} onPointerMove={pointerMove}
        onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd} onKeyDown={moveWithKeyboard}>
        <span aria-hidden="true">⠿</span><strong>完整色盘</strong>
      </button>
      <DialogCloseButton className="coloring-palette-close" label="关闭完整色盘" onClick={onClose} />
    </header>
    <p id={helpId} className="visually-hidden">按住标题拖动；方向键移动，Shift加速，Home回到右侧，Esc关闭。</p>
    <div className="floating-color-palette-content">{children}</div>
  </section>;
}
