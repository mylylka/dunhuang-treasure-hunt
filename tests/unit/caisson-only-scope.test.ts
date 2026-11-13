import { afterEach, describe, expect, it, vi } from 'vitest';
import { toTerrainPoint, TERRAIN_SPAWN } from '../../src/content/world/terrain-layout-v001';
import { completeGalleryCaisson, loadFirstGallery, FIRST_GALLERY_STORAGE_KEY, CAISSON_ONLY_GALLERY_STORAGE_KEY } from '../../src/services/first-gallery';
import { galleryNearby } from '../../src/world/first-gallery-events';
import { isCaissonOnlyWalkable } from '../../src/world/caisson-only-scope';

afterEach(() => vi.unstubAllGlobals());

describe('精简版第一馆', () => {
  it('藻井使用独立记录，完整三馆的第一馆存档不变', () => {
    const records = new Map<string, string>();
    const storage = { getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => { records.set(key, value); } };
    expect(completeGalleryCaisson(storage).ok).toBe(true);
    const original = records.get(FIRST_GALLERY_STORAGE_KEY);
    vi.stubGlobal('document', { getElementById: () => ({ dataset: { caissonOnly: 'v001' } }) });
    expect(loadFirstGallery(storage).data.caissonCompleted).toBe(false);
    expect(completeGalleryCaisson(storage).ok).toBe(true);
    expect(loadFirstGallery(storage).data.caissonCompleted).toBe(true);
    expect(records.get(CAISSON_ONLY_GALLERY_STORAGE_KEY)).toBeDefined();
    expect(records.get(FIRST_GALLERY_STORAGE_KEY)).toBe(original);
  });

  it('仅藻井可互动，漫游范围包含第一馆和起点，不延伸到其他馆', () => {
    expect(galleryNearby(toTerrainPoint('courtyard', { x: -12, z: -15 }), true)).toBe('caisson');
    expect(galleryNearby(toTerrainPoint('courtyard', { x: -6.5, z: -3.9 }), true)).toBeNull();
    expect(galleryNearby(toTerrainPoint('courtyard', { x: -19, z: -1.7 }), true)).toBeNull();
    expect(isCaissonOnlyWalkable(TERRAIN_SPAWN)).toBe(true);
    expect(isCaissonOnlyWalkable(toTerrainPoint('courtyard', { x: -12, z: -15 }))).toBe(true);
    expect(isCaissonOnlyWalkable(toTerrainPoint('music', { x: 46, z: -9 }))).toBe(false);
    expect(isCaissonOnlyWalkable(toTerrainPoint('cliff', { x: 122, z: -68 }))).toBe(false);
  });
});
