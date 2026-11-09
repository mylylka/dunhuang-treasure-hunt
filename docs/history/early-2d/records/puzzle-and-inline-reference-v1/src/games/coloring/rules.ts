import type { RegionColors } from '../../types';
import { fitImageRect, type Point, type Rectangle } from '../../runtime/geometry';

export type ColoringZoom = 1 | 2 | 3;
export interface ColoringLayout { width: number; height: number; image: Rectangle; zoom: ColoringZoom; pan: Point }
export interface ColorEdit { before: RegionColors; after: RegionColors }
export interface ColoringState { colors: RegionColors; history: ColorEdit[] }

export function isColor(value: unknown): value is string { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value); }
export function colorsEqual(a: RegionColors, b: RegionColors): boolean {
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(id => a[id] === b[id]);
}
export function createColoringState(colors: RegionColors = {}, allowedIds?: ReadonlySet<number>): ColoringState {
  return { colors: Object.fromEntries(Object.entries(colors).filter(([id, color]) => Number.isInteger(Number(id))
    && Number(id) > 0 && (!allowedIds || allowedIds.has(Number(id))) && isColor(color) && color.toLowerCase() !== '#ffffff')
    .map(([id, color]) => [id, color.toLowerCase()])), history: [] };
}
export function paintRegion(state: ColoringState, id: number, color: string | null): ColoringState {
  if (!Number.isInteger(id) || id <= 0 || (color !== null && !isColor(color))) return state;
  const normalized = color?.toLowerCase() === '#ffffff' ? null : color?.toLowerCase() ?? null;
  const previous = state.colors[String(id)] ?? null;
  if (previous === normalized) return state;
  const colors = { ...state.colors };
  if (normalized === null) delete colors[String(id)];
  else colors[String(id)] = normalized;
  return { colors, history: [...state.history, { before: { [String(id)]: previous ?? '' }, after: { [String(id)]: normalized ?? '' } }] };
}
export function clearColoring(state: ColoringState): ColoringState {
  if (!Object.keys(state.colors).length) return state;
  return { colors: {}, history: [...state.history, { before: { ...state.colors }, after: Object.fromEntries(Object.keys(state.colors).map(id => [id, ''])) }] };
}
export function undoColoring(state: ColoringState): ColoringState {
  const edit = state.history.at(-1);
  if (!edit) return state;
  const colors = { ...state.colors };
  for (const [id, color] of Object.entries(edit.before)) {
    if (color) colors[id] = color;
    else delete colors[id];
  }
  return { colors, history: state.history.slice(0, -1) };
}
export function decodeRegionId(red: number, green: number, blue: number): number {
  return red + green * 256 + blue * 65536;
}
export function interpolateColor(from: string, to: string, progress: number): string {
  const t = Math.max(0, Math.min(1, progress));
  return `#${[1, 3, 5].map(start => Math.round(parseInt(from.slice(start, start + 2), 16) * (1 - t)
    + parseInt(to.slice(start, start + 2), 16) * t).toString(16).padStart(2, '0')).join('')}`;
}
export function calculateColoringLayout(width: number, height: number, ratio: number, zoom: ColoringZoom = 1,
  requestedPan: Point = { x: 0, y: 0 }): ColoringLayout {
  const viewportWidth = Math.max(1, Math.floor(Number.isFinite(width) ? width : 1));
  const viewportHeight = Math.max(1, Math.floor(Number.isFinite(height) ? height : 1));
  const fitted = fitImageRect(viewportWidth, viewportHeight, ratio, Math.min(8, viewportWidth / 20, viewportHeight / 20));
  const imageWidth = fitted.width * zoom;
  const imageHeight = fitted.height * zoom;
  const limitX = Math.max(0, (imageWidth - viewportWidth) / 2);
  const limitY = Math.max(0, (imageHeight - viewportHeight) / 2);
  const pan = { x: Math.max(-limitX, Math.min(limitX, requestedPan.x)), y: Math.max(-limitY, Math.min(limitY, requestedPan.y)) };
  return { width: viewportWidth, height: viewportHeight, zoom, pan,
    image: { x: (viewportWidth - imageWidth) / 2 + pan.x, y: (viewportHeight - imageHeight) / 2 + pan.y, width: imageWidth, height: imageHeight } };
}
export function imagePoint(point: Point, image: Rectangle, sourceWidth: number, sourceHeight: number): Point | null {
  if (point.x < image.x || point.y < image.y || point.x >= image.x + image.width || point.y >= image.y + image.height) return null;
  return { x: Math.floor((point.x - image.x) / image.width * sourceWidth), y: Math.floor((point.y - image.y) / image.height * sourceHeight) };
}
