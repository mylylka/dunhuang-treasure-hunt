import type { ColoringMaterialId } from '../../types';

export const COLORING_MATERIALS = [
  { id: 'sparkle-gold-v001', label: '闪金', color: '#d6a229' },
  { id: 'sparkle-silver-v001', label: '闪银', color: '#bdc4cb' },
] as const;

export function isColoringMaterial(value: unknown): value is ColoringMaterialId {
  return value === 'sparkle-gold-v001' || value === 'sparkle-silver-v001';
}

export const COLORING_MATERIAL_TILE_SIZE = 256;
export interface ColoringMaterialTile {
  readonly size: number;
  /** Cached native tile, shared read-only by previews and all artwork renderers. */
  readonly pixels: Uint8ClampedArray;
}

const tiles = new Map<ColoringMaterialId, ColoringMaterialTile>();
const previews = new Map<ColoringMaterialId, string>();
const mod = (value: number, period: number) => ((value % period) + period) % period;

/** Integer hash: no time, viewport, Math.random or image-dependent seed enters a saved material. */
function hash(x: number, y: number, salt: number): number {
  let value = Math.imul(x, 0x1f123bb5) ^ Math.imul(y, 0x5f356495) ^ salt;
  value = Math.imul(value ^ value >>> 16, 0x7feb352d);
  value = Math.imul(value ^ value >>> 15, 0x846ca68b);
  return ((value ^ value >>> 16) >>> 0) / 4294967296;
}

type RGB = readonly [number, number, number];
const gold: readonly RGB[] = [[110, 66, 8], [158, 100, 13], [189, 133, 22], [219, 166, 40],
  [239, 195, 76], [252, 224, 132], [255, 245, 201]];
const silver: readonly RGB[] = [[69, 78, 90], [113, 124, 137], [153, 165, 179], [191, 202, 214],
  [218, 226, 235], [239, 244, 250], [255, 255, 255]];

function buildTile(id: ColoringMaterialId): ColoringMaterialTile {
  const size = COLORING_MATERIAL_TILE_SIZE, cellSize = 8, divisions = size / cellSize;
  const palette = id === 'sparkle-gold-v001' ? gold : silver;
  const salt = id === 'sparkle-gold-v001' ? 0x5327a91 : 0x75291ab;
  // A jittered periodic Voronoi field makes angular foil fragments, rather than
  // a flat yellow/grey fill with uniform noise or a smooth plastic gradient.
  const sites = Array.from({ length: divisions * divisions }, (_, index) => {
    const x = index % divisions, y = Math.floor(index / divisions);
    const face = hash(x, y, salt + 13);
    const tone = face < .055 ? 0 : face < .17 ? 1 : face < .39 ? 2 : face < .69 ? 3 : face < .87 ? 4 : face < .975 ? 5 : 6;
    const angle = hash(x, y, salt + 17) * Math.PI * 2;
    return { x: .08 + hash(x, y, salt + 1) * .84, y: .08 + hash(x, y, salt + 2) * .84,
      color: palette[tone], nx: Math.cos(angle), ny: Math.sin(angle),
      fold: hash(x, y, salt + 21), tone };
  });
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const cellX = Math.floor(x / cellSize), cellY = Math.floor(y / cellSize);
    let nearest = Infinity, second = Infinity, site = sites[0], dx = 0, dy = 0;
    for (let row = cellY - 1; row <= cellY + 1; row++) for (let column = cellX - 1; column <= cellX + 1; column++) {
      const candidate = sites[mod(row, divisions) * divisions + mod(column, divisions)];
      const localX = x + .5 - (column + candidate.x) * cellSize;
      const localY = y + .5 - (row + candidate.y) * cellSize;
      const squared = localX * localX + localY * localY;
      if (squared < nearest) { second = nearest; nearest = squared; site = candidate; dx = localX; dy = localY; }
      else if (squared < second) second = squared;
    }
    const edge = (Math.sqrt(second) - Math.sqrt(nearest)) * .5;
    const crease = dx * site.nx + dy * site.ny;
    let shift = (crease > .35 ? 8 : -4) * (site.fold > .3 ? 1 : 0);
    if (Math.abs(crease) < .22 && site.fold > .76) shift -= 24;
    if (edge < .18 && site.fold > .58) shift -= 32;
    // Small clustered shards provide fixed glints. They are short slivers/triangles,
    // not equal-sized dots spread with equal density over a yellow base.
    const shardX = Math.floor(x / 3), shardY = Math.floor(y / 3);
    const shard = hash(shardX, shardY, salt + 41);
    const localX = x % 3, localY = y % 3;
    const glint = shard > .89 && localX + localY < (shard > .97 ? 4 : 2)
      && site.tone >= 2;
    const micro = (hash(x, y, salt + 57) - .5) * 7;
    const offset = (y * size + x) * 4;
    for (let channel = 0; channel < 3; channel++) {
      pixels[offset + channel] = glint ? palette[6][channel] : site.color[channel] + shift + micro;
    }
    pixels[offset + 3] = 255;
  }
  return Object.freeze({ size, pixels });
}

/** One lazily generated native tile per versioned material, reused for the session. */
export function getColoringMaterialTile(id: ColoringMaterialId): ColoringMaterialTile {
  if (!isColoringMaterial(id)) throw new Error('未知填色材质。');
  let tile = tiles.get(id);
  if (!tile) { tile = buildTile(id); tiles.set(id, tile); }
  return tile;
}

/** Original-image pixel coordinates; periodic lookup also works for negative integer samples. */
export function sampleColoringMaterial(id: ColoringMaterialId, x: number, y: number): RGB {
  const tile = getColoringMaterialTile(id);
  const offset = (mod(Math.floor(y), tile.size) * tile.size + mod(Math.floor(x), tile.size)) * 4;
  return [tile.pixels[offset], tile.pixels[offset + 1], tile.pixels[offset + 2]];
}

/** Synchronous and DOM-lazy: importing materials in Node or a storage module is safe. */
export function getMaterialPreviewDataUrl(id: ColoringMaterialId): string {
  const existing = previews.get(id);
  if (existing) return existing;
  const tile = getColoringMaterialTile(id);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 48;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器无法生成填色材质预览。');
  const image = context.createImageData(48, 48);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    // A 96px source patch is shown at 48px, retaining recognisable small foil flakes.
    const from = ((y * 2) * tile.size + x * 2) * 4, to = (y * 48 + x) * 4;
    image.data.set(tile.pixels.subarray(from, from + 4), to);
  }
  context.putImageData(image, 0, 0);
  const result = canvas.toDataURL('image/png');
  previews.set(id, result);
  return result;
}
