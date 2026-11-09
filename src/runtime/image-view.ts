import type { Point, Rectangle } from './geometry';

export interface ImageView { zoom: number; center: Point }
export const initialImageView = (): ImageView => ({ zoom: 1, center: { x: .5, y: .5 } });
export function clampImageView(view: ImageView): ImageView {
  const zoom = Math.max(1, Math.min(3, Number.isFinite(view.zoom) ? view.zoom : 1));
  const inset = .5 / zoom;
  return { zoom, center: { x: Math.max(inset, Math.min(1 - inset, view.center.x)),
    y: Math.max(inset, Math.min(1 - inset, view.center.y)) } };
}
export function imageViewRect(base: Rectangle, view: ImageView): Rectangle {
  const width = base.width * view.zoom, height = base.height * view.zoom;
  return { x: base.x + base.width / 2 - view.center.x * width,
    y: base.y + base.height / 2 - view.center.y * height, width, height };
}
/** Preserve the original-image point under the gesture midpoint while scaling and moving. */
export function pinchImageView(view: ImageView, base: Rectangle, from: Point, to: Point, scale: number): ImageView {
  const image = imageViewRect(base, view);
  const zoom = Math.max(1, Math.min(3, view.zoom * scale));
  const anchor = { x: (from.x - image.x) / image.width, y: (from.y - image.y) / image.height };
  return clampImageView({ zoom, center: {
    x: anchor.x - (to.x - base.x - base.width / 2) / (base.width * zoom),
    y: anchor.y - (to.y - base.y - base.height / 2) / (base.height * zoom),
  } });
}
export function panImageView(view: ImageView, base: Rectangle, delta: Point): ImageView {
  return clampImageView({ zoom: view.zoom, center: {
    x: view.center.x - delta.x / (base.width * view.zoom),
    y: view.center.y - delta.y / (base.height * view.zoom),
  } });
}
