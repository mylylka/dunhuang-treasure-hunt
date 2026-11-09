/** The 2D phone policy is independent of the world's orientation state. */
export interface MobileOrientation {
  screenWidth: number;
  screenHeight: number;
  maxTouchPoints: number;
  touchEvents?: boolean;
  coarsePointer: boolean;
  noHover: boolean;
  portrait: boolean;
}

export function isPhonePortrait(device: MobileOrientation): boolean {
  const shortSide = Math.min(device.screenWidth, device.screenHeight);
  return Number.isFinite(shortSide) && shortSide > 0 && shortSide <= 600
    && (device.maxTouchPoints > 0 || device.touchEvents === true)
    && device.coarsePointer && device.noHover && device.portrait;
}

export function getMobileLandscapeBlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return isPhonePortrait({
    screenWidth: window.screen.width || window.innerWidth,
    screenHeight: window.screen.height || window.innerHeight,
    maxTouchPoints: window.navigator.maxTouchPoints,
    // WebKit can expose touch input with maxTouchPoints=0. Retain the other phone checks.
    touchEvents: 'ontouchstart' in window,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    noHover: window.matchMedia('(hover: none)').matches,
    // Use the live viewport: WebKit's orientation media state can lag a resized mobile viewport.
    portrait: window.innerHeight > window.innerWidth,
  });
}

const listeners = new Set<() => void>();
let stopListening: (() => void) | undefined;

/** Publish at the browser event boundary, before React renders a cover or hides the surface. */
export function subscribeMobileLandscape(listener: () => void): () => void {
  listeners.add(listener);
  if (!stopListening && typeof window !== 'undefined') {
    let previous = getMobileLandscapeBlocked();
    const queries = ['(pointer: coarse)', '(hover: none)', '(orientation: portrait)'].map(query => window.matchMedia(query));
    const update = () => {
      const next = getMobileLandscapeBlocked();
      if (next === previous) return;
      previous = next;
      for (const notify of [...listeners]) notify();
    };
    queries.forEach(query => query.addEventListener('change', update));
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    stopListening = () => {
      queries.forEach(query => query.removeEventListener('change', update));
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { stopListening?.(); stopListening = undefined; }
  };
}
