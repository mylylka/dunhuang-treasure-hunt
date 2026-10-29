import type { RegionColors } from '../../types';
import { decodeRegionId, isColor } from './rules';

export interface ColoringArtworkOptions {
  lineImageUrl: string;
  regionMapImageUrl: string;
  colors: RegionColors;
  signal?: AbortSignal;
}
export interface ColoringArtworkRenderer {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  regionAt(x: number, y: number): number;
  render(colors: RegionColors): void;
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
  let previous: RegionColors = {};
  const renderer: ColoringArtworkRenderer = {
    canvas, width, height,
    regionAt: (x, y) => x >= 0 && y >= 0 && x < width && y < height ? ids[Math.floor(y) * width + Math.floor(x)] : 0,
    render(colors) {
      const changed = new Set([...Object.keys(previous), ...Object.keys(colors)]);
      let dirty = false;
      for (const key of changed) {
        if (previous[key] === colors[key]) continue;
        const regionPixels = indices.get(Number(key));
        if (!regionPixels) continue;
        const value = isColor(colors[key]) ? colors[key] : '#ffffff';
        const rgb = [1, 3, 5].map(start => parseInt(value.slice(start, start + 2), 16));
        for (const pixel of regionPixels) {
          const offset = pixel * 4;
          fillPixels.data[offset] = rgb[0]; fillPixels.data[offset + 1] = rgb[1]; fillPixels.data[offset + 2] = rgb[2];
        }
        dirty = true;
      }
      if (dirty) fillContext.putImageData(fillPixels, 0, 0);
      context.globalCompositeOperation = 'source-over';
      context.clearRect(0, 0, width, height);
      context.drawImage(fillCanvas, 0, 0);
      // The user's opaque white line art is preserved; multiplying keeps its ink and antialiasing.
      context.globalCompositeOperation = 'multiply';
      context.drawImage(lineImage, 0, 0);
      context.globalCompositeOperation = 'source-over';
      previous = { ...colors };
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
  renderer.render(options.colors);
  return renderer.canvas;
}
