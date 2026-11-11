/** The 2D phone policy is independent of the world's orientation state. */
export interface MobileOrientation {
  screenWidth: number;
  screenHeight: number;
  maxTouchPoints: number;
  touchEvents?: boolean;
  coarsePointer: boolean;
  noHover: boolean;
  portrait: boolean;
  /** Explicit phone identifiers supplement unreliable pointer media queries in embedded browsers. */
  phoneUserAgent?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
}

function isPhoneDevice(device: MobileOrientation): boolean {
  const shortSide = Math.min(device.screenWidth, device.screenHeight);
  const smallScreen = Number.isFinite(shortSide) && shortSide > 0 && shortSide <= 600;
  const viewportShort = Math.min(device.viewportWidth ?? 0, device.viewportHeight ?? 0);
  const smallViewport = Number.isFinite(viewportShort) && viewportShort > 0 && viewportShort <= 600;
  const knownPhone = device.phoneUserAgent === true && (smallScreen || smallViewport);
  const touch = device.maxTouchPoints > 0 || device.touchEvents === true;
  // iOS webviews can report a mouse/hover alongside touch. A real small screen
  // plus touch points and either touch-oriented media signal still identifies a phone.
  const touchPhone = smallScreen && touch && ((device.coarsePointer && device.noHover)
    || (device.maxTouchPoints > 0 && (device.coarsePointer || device.noHover)));
  return knownPhone || touchPhone;
}

export function isPhonePortrait(device: MobileOrientation): boolean {
  return device.portrait && isPhoneDevice(device);
}

function readMobileOrientation(): MobileOrientation {
  return {
    screenWidth: window.screen.width || window.innerWidth,
    screenHeight: window.screen.height || window.innerHeight,
    maxTouchPoints: window.navigator.maxTouchPoints,
    phoneUserAgent: /iPhone|iPod|Android.*Mobile/i.test(window.navigator.userAgent ?? ''),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    // WebKit can expose touch input with maxTouchPoints=0.
    touchEvents: 'ontouchstart' in window,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    noHover: window.matchMedia('(hover: none)').matches,
    // Use the live viewport: WebKit's orientation media state can lag a resized mobile viewport.
    portrait: window.innerHeight > window.innerWidth,
  };
}

export function isMobilePhone(): boolean {
  return typeof window !== 'undefined' && isPhoneDevice(readMobileOrientation());
}

export function getMobileLandscapeBlocked(): boolean {
  return typeof window !== 'undefined' && isPhonePortrait(readMobileOrientation());
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
