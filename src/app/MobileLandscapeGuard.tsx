import { useCallback, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type SyntheticEvent } from 'react';
import { getMobileLandscapeBlocked, subscribeMobileLandscape } from '../services/mobile-landscape';
import '../styles/mobile-landscape.css';

export interface MobileLandscapeGuardProps {
  active: boolean;
  children: ReactNode;
}

const getServerSnapshot = () => false;

/** Keep an entered 2D screen alive while a native modal blocks portrait phone use. */
export function MobileLandscapeGuard({ active, children }: MobileLandscapeGuardProps) {
  const surface = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const pointerIds = useRef(new Set<number>());
  const captures = useRef(new Map<number, Element>());
  const titleId = useId();
  const descriptionId = useId();

  const rememberFocus = useCallback(() => {
    const element = document.activeElement;
    if (element instanceof HTMLElement && element !== document.body && !dialog.current?.contains(element)) {
      returnFocus.current = element;
    }
  }, []);

  const releaseCaptures = useCallback(() => {
    const ids = new Set([...pointerIds.current, ...captures.current.keys()]);
    if (!ids.size) return;
    // Capture can be set on an ancestor of pointerdown's target before gotpointercapture fires.
    const elements = new Set<Element>(captures.current.values());
    document.querySelectorAll('*').forEach(element => {
      for (const id of ids) if (element.hasPointerCapture(id)) elements.add(element);
    });
    for (const element of elements) {
      for (const id of ids) {
        try {
          if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
        } catch {
          // A native pointer can finish between checking and releasing its capture.
        }
      }
    }
    pointerIds.current.clear();
    captures.current.clear();
    // No synthetic pointerup: runtime setBlocked cancels unfinished game gestures.
  }, []);

  const subscribe = useCallback((listener: () => void) => subscribeMobileLandscape(() => {
    if (active && getMobileLandscapeBlocked()) {
      // Save focus and release captures before React hides the entered screen.
      rememberFocus();
      releaseCaptures();
    }
    listener();
  }), [active, rememberFocus, releaseCaptures]);
  const portraitBlocked = useSyncExternalStore(subscribe, getMobileLandscapeBlocked, getServerSnapshot);
  const blocked = active && portraitBlocked;
  const [entered, setEntered] = useState(() => !blocked);

  useLayoutEffect(() => {
    if (!blocked) setEntered(true);
  }, [blocked]);

  useLayoutEffect(() => {
    if (!active) return;
    const down = (event: PointerEvent) => {
      if (event.target instanceof Node && dialog.current?.contains(event.target)) return;
      pointerIds.current.add(event.pointerId);
    };
    const finish = (event: PointerEvent) => {
      pointerIds.current.delete(event.pointerId);
      captures.current.delete(event.pointerId);
    };
    const captured = (event: PointerEvent) => {
      if (event.target instanceof Element && !dialog.current?.contains(event.target)) {
        pointerIds.current.add(event.pointerId);
        captures.current.set(event.pointerId, event.target);
      }
    };
    const lost = (event: PointerEvent) => captures.current.delete(event.pointerId);
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerup', finish, true);
    document.addEventListener('pointercancel', finish, true);
    document.addEventListener('gotpointercapture', captured, true);
    document.addEventListener('lostpointercapture', lost, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerup', finish, true);
      document.removeEventListener('pointercancel', finish, true);
      document.removeEventListener('gotpointercapture', captured, true);
      document.removeEventListener('lostpointercapture', lost, true);
      releaseCaptures();
    };
  }, [active, releaseCaptures]);

  useLayoutEffect(() => {
    const gate = dialog.current;
    if (!gate) return;
    if (!blocked) {
      const wasOpen = gate.open;
      if (wasOpen) gate.close();
      const target = returnFocus.current;
      returnFocus.current = null;
      if (!target && !wasOpen) return;
      // Let the gate leave the top layer before restoring an existing observer's focus.
      const frame = requestAnimationFrame(() => {
        if (target?.isConnected && !target.closest('[hidden], [inert]') && !target.matches(':disabled') && target.getClientRects().length) {
          target.focus({ preventScroll: true });
        } else {
          // A timer may have paused behind the gate, disabling the previously focused hint button.
          surface.current?.querySelector<HTMLElement>('dialog[open] button:not(:disabled), [role="dialog"] button:not(:disabled)')?.focus({ preventScroll: true });
        }
      });
      return () => cancelAnimationFrame(frame);
    }
    if (!returnFocus.current) rememberFocus();
    releaseCaptures();
    const showGate = () => {
      if (!gate.open) gate.showModal();
      heading.current?.focus({ preventScroll: true });
    };
    showGate();
    // A just-opened observation dialog must not appear above the orientation gate.
    const observer = new MutationObserver(records => {
      if (!records.some(record => record.target instanceof HTMLDialogElement && record.target !== gate && record.target.open)) return;
      if (gate.open) gate.close();
      showGate();
    });
    if (surface.current) observer.observe(surface.current, { attributes: true, attributeFilter: ['open'], subtree: true });
    return () => {
      observer.disconnect();
      if (gate.open) gate.close();
    };
  }, [blocked, rememberFocus, releaseCaptures]);

  const blockUnsupportedInteraction = (event: SyntheticEvent) => {
    if (active && getMobileLandscapeBlocked()) { event.preventDefault(); event.stopPropagation(); }
  };

  return <>
    <div ref={surface} className="mobile-landscape-surface" data-testid="mobile-landscape-surface"
      hidden={blocked} inert={blocked} aria-hidden={blocked ? true : undefined}
      onClickCapture={blockUnsupportedInteraction}
      onChangeCapture={blockUnsupportedInteraction}
      onInputCapture={blockUnsupportedInteraction}>
      {(entered || !blocked) && children}
    </div>
    <dialog ref={dialog} className="mobile-landscape-gate" data-testid="mobile-landscape-gate"
      role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); heading.current?.focus({ preventScroll: true }); }}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); } }}>
      <div className="mobile-landscape-panel">
        <div className="mobile-landscape-content">
          <svg className="mobile-landscape-symbol" viewBox="0 0 100 80" aria-hidden="true" focusable="false">
            <rect x="16" y="26" width="68" height="42" rx="6" />
            <path d="M25 39v16M75 45v4M29 14a30 30 0 0 1 43 2M72 7v10H62" />
          </svg>
          <h2 ref={heading} id={titleId} tabIndex={-1}>请横过手机</h2>
          <p id={descriptionId}>横屏后继续，本局进度会保留</p>
          <a className="button button-secondary" href="#/"><span className="button-label">返回探索</span></a>
        </div>
      </div>
    </dialog>
  </>;
}
