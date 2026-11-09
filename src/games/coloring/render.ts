import type { RegionColors, RegionMaterials } from '../../types';
import { decodeRegionId, isColor } from './rules';
import { getColoringMaterialTile, isColoringMaterial, type ColoringMaterialTile } from './materials';

export interface ColoringArtworkOptions {
  lineImageUrl: string;
  regionMapImageUrl: string;
  colors: RegionColors;
  materials?: RegionMaterials;
  signal?: AbortSignal;
}
export interface ColoringArtworkRenderer {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  regionAt(x: number, y: number): number;
  render(colors: RegionColors, materials?: RegionMaterials): void;
  /** Static endpoints are cached only for changed regions; progress does not regenerate noise. */
  renderTransition(fromColors: RegionColors, fromMaterials: RegionMaterials,
    toColors: RegionColors, toMaterials: RegionMaterials, progress: number): void;
}

interface Paint { rgb: readonly number[]; tile?: ColoringMaterialTile }
function paintFor(key: string, colors: RegionColors, materials: RegionMaterials): Paint {
  const value = isColor(colors[key]) ? colors[key] : '#ffffff';
  const material = materials[key];
  return { rgb: [1, 3, 5].map(start => parseInt(value.slice(start, start + 2), 16)),
    ...(isColoringMaterial(material) ? { tile: getColoringMaterialTile(material) } : {}) };
}
function mapsEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function loadArtworkImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const cleanup = () => { image.onload = null; image.onerror = null; signal?.removeEventListener('abort', abort); };
    const abort = () => { cleanup(); image.src = ''; reject(new DOMException('Image loading aborted', 'AbortError')); };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = () => { cleanup(); reject(new Error('填色图片加载失败，请检查素材后重试。')); };
    image.src = url;
  });
}

/** RGB IDs are decoded at native resolution without smoothing; black/transparent means no region. */
export function createColoringArtworkRenderer(lineImage: HTMLImageElement, regionMapImage: HTMLImageElement): ColoringArtworkRenderer {
  const width = lineImage.naturalWidth;
  const height = lineImage.naturalHeight;
  if (width <= 0 || height <= 0 || width !== regionMapImage.naturalWidth || height !== regionMapImage.naturalHeight) {
    throw new Error('填色线稿与区域蒙版的实际尺寸必须完全一致。');
  }
  const mapCanvas = makeCanvas(width, height);
  const mapContext = mapCanvas.getContext('2d', { willReadFrequently: true });
  if (!mapContext) throw new Error('浏览器无法读取填色区域，请换用支持 Canvas 的浏览器。');
  mapContext.imageSmoothingEnabled = false;
  mapContext.drawImage(regionMapImage, 0, 0);
  const mapPixels = mapContext.getImageData(0, 0, width, height).data;
  const ids = new Uint32Array(width * height);
  const counts = new Map<number, number>();
  for (let pixel = 0; pixel < ids.length; pixel++) {
    const offset = pixel * 4;
    const id = mapPixels[offset + 3] ? decodeRegionId(mapPixels[offset], mapPixels[offset + 1], mapPixels[offset + 2]) : 0;
    ids[pixel] = id;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const indices = new Map([...counts].map(([id, count]) => [id, new Uint32Array(count)]));
  const offsets = new Map<number, number>();
  for (let pixel = 0; pixel < ids.length; pixel++) {
    const id = ids[pixel];
    if (!id) continue;
    const offset = offsets.get(id) ?? 0;
    indices.get(id)![offset] = pixel;
    offsets.set(id, offset + 1);
  }
  const fillCanvas = makeCanvas(width, height);
  const fillContext = fillCanvas.getContext('2d')!;
  const fillPixels = fillContext.createImageData(width, height);
  fillPixels.data.fill(255);
  fillContext.putImageData(fillPixels, 0, 0);
  const canvas = makeCanvas(width, height);
  const context = canvas.getContext('2d')!;
  let previous: RegionColors = {}, previousMaterials: RegionMaterials = {};
  let transientRegions = new Set<string>();
  let transition: { fromColors: RegionColors; fromMaterials: RegionMaterials; toColors: RegionColors; toMaterials: RegionMaterials;
    regions: { key: string; pixels: Uint32Array; from: Uint8ClampedArray; to: Uint8ClampedArray }[] } | null = null;

  function regionRGB(pixels: Uint32Array, paint: Paint): Uint8ClampedArray {
    const result = new Uint8ClampedArray(pixels.length * 3);
    const tile = paint.tile;
    for (let index = 0; index < pixels.length; index++) {
      const pixel = pixels[index];
      const offset = tile ? ((Math.floor(pixel / width) % tile.size) * tile.size + pixel % width % tile.size) * 4 : 0;
      for (let channel = 0; channel < 3; channel++) result[index * 3 + channel] = tile ? tile.pixels[offset + channel] : paint.rgb[channel];
    }
    return result;
  }
  function writeRegion(pixels: Uint32Array, rgb: Uint8ClampedArray): void {
    for (let index = 0; index < pixels.length; index++) {
      const offset = pixels[index] * 4, source = index * 3;
      fillPixels.data[offset] = rgb[source]; fillPixels.data[offset + 1] = rgb[source + 1]; fillPixels.data[offset + 2] = rgb[source + 2];
    }
  }
  function composite(dirty: boolean): void {
    if (dirty) fillContext.putImageData(fillPixels, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, width, height);
    context.drawImage(fillCanvas, 0, 0);
    // Opaque white source art and its antialiased ink retain the existing multiply treatment.
    context.globalCompositeOperation = 'multiply';
    context.drawImage(lineImage, 0, 0);
    context.globalCompositeOperation = 'source-over';
  }
  const renderer: ColoringArtworkRenderer = {
    canvas, width, height,
    regionAt: (x, y) => x >= 0 && y >= 0 && x < width && y < height ? ids[Math.floor(y) * width + Math.floor(x)] : 0,
    render(colors, materials = {}) {
      const changed = new Set([...Object.keys(previous), ...Object.keys(colors), ...Object.keys(previousMaterials),
        ...Object.keys(materials), ...transientRegions]);
      let dirty = false;
      for (const key of changed) {
        if (previous[key] === colors[key] && previousMaterials[key] === materials[key] && !transientRegions.has(key)) continue;
        const regionPixels = indices.get(Number(key));
        if (!regionPixels) continue;
        writeRegion(regionPixels, regionRGB(regionPixels, paintFor(key, colors, materials)));
        dirty = true;
      }
      composite(dirty);
      previous = { ...colors };
      previousMaterials = { ...materials };
      transientRegions.clear();
      transition = null;
    },
    renderTransition(fromColors, fromMaterials, toColors, toMaterials, progress) {
      const t = Math.max(0, Math.min(1, Number.isNaN(progress) ? 0 : progress));
      if (t === 0) { renderer.render(fromColors, fromMaterials); return; }
      if (t === 1) { renderer.render(toColors, toMaterials); return; }
      if (!transition || !mapsEqual(transition.fromColors, fromColors) || !mapsEqual(transition.fromMaterials, fromMaterials)
        || !mapsEqual(transition.toColors, toColors) || !mapsEqual(transition.toMaterials, toMaterials)) {
        renderer.render(fromColors, fromMaterials);
        const changed = new Set([...Object.keys(fromColors), ...Object.keys(toColors), ...Object.keys(fromMaterials), ...Object.keys(toMaterials)]);
        const regions = [];
        for (const key of changed) {
          if (fromColors[key] === toColors[key] && fromMaterials[key] === toMaterials[key]) continue;
          const pixels = indices.get(Number(key));
          if (!pixels) continue;
          regions.push({ key, pixels, from: regionRGB(pixels, paintFor(key, fromColors, fromMaterials)),
            to: regionRGB(pixels, paintFor(key, toColors, toMaterials)) });
        }
        transition = { fromColors: { ...fromColors }, fromMaterials: { ...fromMaterials },
          toColors: { ...toColors }, toMaterials: { ...toMaterials }, regions };
      }
      for (const region of transition.regions) {
        for (let index = 0; index < region.pixels.length; index++) {
          const offset = region.pixels[index] * 4, source = index * 3;
          for (let channel = 0; channel < 3; channel++) {
            fillPixels.data[offset + channel] = Math.round(region.from[source + channel] * (1 - t) + region.to[source + channel] * t);
          }
        }
      }
      transientRegions = new Set(transition.regions.map(region => region.key));
      composite(transition.regions.length > 0);
    },
  };
  renderer.render({});
  return renderer;
}

export async function prepareColoringArtwork(lineImageUrl: string, regionMapImageUrl: string,
  signal?: AbortSignal): Promise<ColoringArtworkRenderer> {
  const [line, map] = await Promise.all([loadArtworkImage(lineImageUrl, signal), loadArtworkImage(regionMapImageUrl, signal)]);
  if (signal?.aborted) throw new DOMException('Artwork loading aborted', 'AbortError');
  return createColoringArtworkRenderer(line, map);
}

/** Returns the full-resolution artwork. Storage/export remain the caller's responsibility. */
export async function renderColoringArtwork(options: ColoringArtworkOptions): Promise<HTMLCanvasElement> {
  const renderer = await prepareColoringArtwork(options.lineImageUrl, options.regionMapImageUrl, options.signal);
  renderer.render(options.colors, options.materials);
  return renderer.canvas;
}
