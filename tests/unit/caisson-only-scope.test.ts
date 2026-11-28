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
  it('精简版保留借物桌、画架和画卷台的碰撞，隐藏旧画板与颜料架', () => {
    const ids = ['terrain-courtyard-hall-v003-pattern-display', 'terrain-courtyard-hall-v003-pigment-rack'];
    expect(TERRAIN_CAISSON_ONLY_PLAYER_COLLIDERS.some(solid => solid.id === 'terrain-courtyard-hall-v003-workbench')).toBe(true);
    for (const id of ids) {
      expect(TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS.some(solid => solid.id === id)).toBe(true);
      expect(TERRAIN_CAISSON_ONLY_PLAYER_COLLIDERS.some(solid => solid.id === id)).toBe(false);
    }
    const full = terrainCameraSpace(true, true);
    const compact = terrainCameraSpace(true, true, false, false, false, true);
    expect(full.orientedBoxes!.length - compact.orientedBoxes!.length).toBe(4);
    for (const station of PATTERN_STATIONS) {
      expect(TERRAIN_CAISSON_ONLY_PLAYER_COLLIDERS.some(solid => solid.id === `terrain-courtyard-${station.id}`)).toBe(true);
      const { x, z } = toTerrainPoint('courtyard', station.position);
      const point = { x, z };
      expect(sanitizeTerrainPosition(point, true, false, false, true)).toEqual(TERRAIN_SPAWN);
      expect(sanitizeTerrainPosition(point, true)).toEqual(TERRAIN_SPAWN);
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

  it('画架与藻井可互动，画卷按完成状态开放，漫游限定在第一馆', () => {
    expect(galleryNearby(toTerrainPoint('courtyard', { x: -12, z: -15 }), true)).toBe('caisson');
    expect(galleryNearby(toTerrainPoint('courtyard', { x: -6.5, z: -3.9 }), true)).toBe('easel');
    expect(galleryNearby(toTerrainPoint('courtyard', { x: -19, z: -1.7 }), true)).toBeNull();
    expect(galleryNearby(toTerrainPoint('courtyard', { x: -19, z: -1.7 }), true, true)).toBe('scroll');
    expect(isCaissonOnlyWalkable(TERRAIN_SPAWN)).toBe(true);
    expect(isCaissonOnlyWalkable(toTerrainPoint('courtyard', { x: -12, z: -15 }))).toBe(true);
    expect(isCaissonOnlyWalkable(toTerrainPoint('music', { x: 46, z: -9 }))).toBe(false);
    expect(isCaissonOnlyWalkable(toTerrainPoint('cliff', { x: 122, z: -68 }))).toBe(false);
  });
});
