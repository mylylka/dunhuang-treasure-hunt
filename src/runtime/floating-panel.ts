import type { Point, Rectangle } from './geometry';

export interface FloatingPanelSize { width: number; height: number }
export interface FloatingPanelLayout {
  position: Point;
  initialPosition: Point;
  size: FloatingPanelSize;
  bounds: Rectangle;
}

export function clampFloatingPanel(position: Point, size: FloatingPanelSize, bounds: Rectangle): Point {
  return {
    x: Math.max(bounds.x, Math.min(bounds.x + Math.max(0, bounds.width - size.width), Number.isFinite(position.x) ? position.x : bounds.x)),
    y: Math.max(bounds.y, Math.min(bounds.y + Math.max(0, bounds.height - size.height), Number.isFinite(position.y) ? position.y : bounds.y)),
  };
}

/** Opening always uses the side tools. Only an explicit drag may use the wider viewport. */
export function fitFloatingPanel(viewport: Rectangle, tools: Rectangle, preferred: FloatingPanelSize,
  allowCanvasOverlap = false, previous?: Point): FloatingPanelLayout | null {
  const left = Math.max(viewport.x, tools.x), top = Math.max(viewport.y, tools.y);
  const right = Math.min(viewport.x + viewport.width, tools.x + tools.width);
  const bottom = Math.min(viewport.y + viewport.height, tools.y + tools.height);
  if (![left, top, right, bottom].every(Number.isFinite) || right <= left || bottom <= top) return null;
  const side = { x: left, y: top, width: right - left, height: bottom - top };
  const size = { width: Math.min(preferred.width, side.width), height: Math.min(preferred.height, side.height) };
  const initialPosition = clampFloatingPanel({ x: right - size.width, y: top + (side.height - size.height) / 2 }, size, side);
  const bounds = allowCanvasOverlap ? viewport : side;
  return { size, bounds, initialPosition, position: clampFloatingPanel(previous ?? initialPosition, size, bounds) };
}
