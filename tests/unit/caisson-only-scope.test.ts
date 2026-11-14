import { afterEach, describe, expect, it, vi } from 'vitest';
import { toTerrainPoint, TERRAIN_SPAWN } from '../../src/content/world/terrain-layout-v001';
import { completeGalleryCaisson, loadFirstGallery, FIRST_GALLERY_STORAGE_KEY, CAISSON_ONLY_GALLERY_STORAGE_KEY } from '../../src/services/first-gallery';
import { galleryNearby } from '../../src/world/first-gallery-events';
import { isCaissonOnlyWalkable } from '../../src/world/caisson-only-scope';
import { sanitizeTerrainPosition, TERRAIN_CAISSON_ONLY_PLAYER_COLLIDERS, TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS } from '../../src/world/terrain-rules-v001';
import { terrainCameraSpace } from '../../src/world/terrain-camera-v001';
import { PATTERN_STATIONS } from '../../src/world/pattern-interactives';

afterEach(() => vi.unstubAllGlobals());

describe('精简版第一馆', () => {
  it('仅精简版移除两件装置的玩家和镜头碰撞', () => {
    const ids = ['terrain-courtyard-mural-station', 'terrain-courtyard-coloring-station',
      'terrain-courtyard-hall-v003-workbench', 'terrain-courtyard-hall-v003-pattern-display', 'terrain-courtyard-hall-v003-pigment-rack'];
    for (const id of ids) {
      expect(TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS.some(solid => solid.id === id)).toBe(true);
      expect(TERRAIN_CAISSON_ONLY_PLAYER_COLLIDERS.some(solid => solid.id === id)).toBe(false);
    }
    const full = terrainCameraSpace(true, true, false, false);
    const compact = terrainCameraSpace(true, true, false, true);
    // Two station boxes plus three furnishings' player and camera proxies.
    expect(full.orientedBoxes!.length - compact.orientedBoxes!.length).toBe(8);
    for (const station of PATTERN_STATIONS) {
      const { x, z } = toTerrainPoint('courtyard', station.position);
      const point = { x, z };
      expect(sanitizeTerrainPosition(point, true, true)).toEqual(point);
      expect(sanitizeTerrainPosition(point, true, false)).toEqual(TERRAIN_SPAWN);
    }
  });
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
