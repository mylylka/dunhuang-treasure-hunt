import type { ColoringMaterialId, RegionColors, RegionMaterials } from '../../types';
import { fitImageRect, type Point, type Rectangle } from '../../runtime/geometry';
import { isColoringMaterial } from './materials';

export { isColoringMaterial } from './materials';

export type ColoringZoom = number;
export interface ColoringLayout { width: number; height: number; image: Rectangle; zoom: ColoringZoom; pan: Point }
export interface ColorEdit {
  before: RegionColors;
  after: RegionColors;
  beforeMaterials: Record<string, ColoringMaterialId | ''>;
  afterMaterials: Record<string, ColoringMaterialId | ''>;
}
export interface ColoringState { colors: RegionColors; materials: RegionMaterials; history: ColorEdit[] }

export function isColor(value: unknown): value is string { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value); }
export function colorsEqual(a: RegionColors, b: RegionColors): boolean {
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(id => a[id] === b[id]);
}
export function materialsEqual(a: RegionMaterials, b: RegionMaterials): boolean {
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(id => a[id] === b[id]);
}
export function createColoringState(colors: RegionColors = {}, allowedIds?: ReadonlySet<number>, materials: RegionMaterials = {}): ColoringState {
  const allowed = (id: string) => /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) && (!allowedIds || allowedIds.has(Number(id)));
  const cleanedMaterials = Object.fromEntries(Object.entries(materials).filter(([id, material]) =>
    allowed(id) && isColoringMaterial(material) && isColor(colors[id]))) as RegionMaterials;
  const cleanedColors = Object.fromEntries(Object.entries(colors).filter(([id, color]) => allowed(id) && isColor(color)
    && (color.toLowerCase() !== '#ffffff' || cleanedMaterials[id])).map(([id, color]) => [id, color.toLowerCase()]));
  return { colors: cleanedColors, materials: cleanedMaterials, history: [] };
}
export function paintRegion(state: ColoringState, id: number, color: string | null, material?: ColoringMaterialId): ColoringState {
  if (!Number.isSafeInteger(id) || id <= 0 || (color !== null && !isColor(color))
    || (material !== undefined && !isColoringMaterial(material))) return state;
  const nextMaterial = color === null ? undefined : material;
  const normalized = color === null || (color.toLowerCase() === '#ffffff' && !nextMaterial) ? null : color.toLowerCase();
  const previous = state.colors[String(id)] ?? null;
  const previousMaterial = state.materials[String(id)];
  if (previous === normalized && previousMaterial === nextMaterial) return state;
  const colors = { ...state.colors }, materials = { ...state.materials };
  if (normalized === null) delete colors[String(id)];
  else colors[String(id)] = normalized;
  if (nextMaterial === undefined) delete materials[String(id)];
  else materials[String(id)] = nextMaterial;
  return { colors, materials, history: [...state.history, {
    before: { [String(id)]: previous ?? '' }, after: { [String(id)]: normalized ?? '' },
    beforeMaterials: { [String(id)]: previousMaterial ?? '' }, afterMaterials: { [String(id)]: nextMaterial ?? '' },
  }] };
}
export function clearColoring(state: ColoringState): ColoringState {
  const ids = new Set([...Object.keys(state.colors), ...Object.keys(state.materials)]);
  if (!ids.size) return state;
  return { colors: {}, materials: {}, history: [...state.history, {
    before: { ...state.colors }, after: Object.fromEntries([...ids].map(id => [id, ''])),
    beforeMaterials: { ...state.materials }, afterMaterials: Object.fromEntries([...ids].map(id => [id, ''])),
  }] };
}
export function undoColoring(state: ColoringState): ColoringState {
  const edit = state.history.at(-1);
  if (!edit) return state;
  const colors = { ...state.colors }, materials = { ...state.materials };
  for (const [id, color] of Object.entries(edit.before)) {
    if (color) colors[id] = color;
    else delete colors[id];
  }
  for (const [id, material] of Object.entries(edit.beforeMaterials)) {
    if (material) materials[id] = material;
    else delete materials[id];
  }
  return { colors, materials, history: state.history.slice(0, -1) };
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
  const safeZoom = Math.max(1, Math.min(3, Number.isFinite(zoom) ? zoom : 1));
  const imageWidth = fitted.width * safeZoom;
  const imageHeight = fitted.height * safeZoom;
  const limitX = Math.max(0, (imageWidth - viewportWidth) / 2);
  const limitY = Math.max(0, (imageHeight - viewportHeight) / 2);
  const pan = { x: Math.max(-limitX, Math.min(limitX, Number.isFinite(requestedPan.x) ? requestedPan.x : 0)),
    y: Math.max(-limitY, Math.min(limitY, Number.isFinite(requestedPan.y) ? requestedPan.y : 0)) };
  return { width: viewportWidth, height: viewportHeight, zoom: safeZoom, pan,
    image: { x: (viewportWidth - imageWidth) / 2 + pan.x, y: (viewportHeight - imageHeight) / 2 + pan.y, width: imageWidth, height: imageHeight } };
}

/** Prefilter to physical display pixels, retaining native pixels for enlarged views. */
export function coloringTextureSize(sourceWidth: number, sourceHeight: number, image: Rectangle,
  pixelRatioX: number, pixelRatioY = pixelRatioX): { width: number; height: number } {
  const densityX = Number.isFinite(pixelRatioX) ? Math.max(1, pixelRatioX) : 1;
  const densityY = Number.isFinite(pixelRatioY) ? Math.max(1, pixelRatioY) : 1;
  const scale = Math.min(1, image.width * densityX / sourceWidth, image.height * densityY / sourceHeight);
  return { width: Math.max(1, Math.min(sourceWidth, Math.round(sourceWidth * scale))),
    height: Math.max(1, Math.min(sourceHeight, Math.round(sourceHeight * scale))) };
}
export function imagePoint(point: Point, image: Rectangle, sourceWidth: number, sourceHeight: number): Point | null {
  if (point.x < image.x || point.y < image.y || point.x >= image.x + image.width || point.y >= image.y + image.height) return null;
  return { x: Math.floor((point.x - image.x) / image.width * sourceWidth), y: Math.floor((point.y - image.y) / image.height * sourceHeight) };
}
