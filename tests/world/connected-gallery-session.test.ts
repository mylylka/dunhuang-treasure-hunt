import { describe, expect, it } from 'vitest';
import { TERRAIN_ANCHORS, TERRAIN_ROUTES, toTerrainPoint } from '../../src/content/world/terrain-layout-v001';
import { MUSIC_INSTRUMENT_DISPLAY_SOLIDS } from '../../src/content/world/music-instrument-display-layout-v001';
import { FIRST_GALLERY_WORLD_SESSION_KEY } from '../../src/services/first-gallery-entry';
import {
  CONNECTED_GALLERY_SESSION_OPTIONS, connectedGalleryAt, connectedGalleryBlockedRegion,
  connectedGalleryStartCheckpoint, sanitizeConnectedGalleryCheckpoint,
} from '../../src/world/connected-gallery-session';
import { upperPreviewCheckpoint } from '../../src/world/mogao-upper-session';
import { createMusicInteriorNavigation } from '../../src/world/music-interior-navigation';
import { defaultWorldCheckpoint } from '../../src/world/session';
import { moveTerrainPlayer } from '../../src/world/terrain-rules-v001';
import type { UpperWalkState } from '../../src/world/mogao-upper-navigation';

describe('connected gallery navigation', () => {
  it('enforces progression at the fronts and flanks of both buildings', () => {
    for (const point of [{ x: 40.2, z: 4 }, { x: 30, z: -28 }, { x: 68, z: -38 }]) {
      const position = toTerrainPoint('music', point);
      expect(connectedGalleryBlockedRegion(position, false, true)).toBe('music');
      expect(connectedGalleryBlockedRegion(position, true, false)).toBeNull();
    }
    for (const point of [{ x: 122, z: -39 }, { x: 88, z: -70 }, { x: 153, z: -110 }]) {
      const position = toTerrainPoint('cliff', point);
      expect(connectedGalleryBlockedRegion(position, false, true)).toBe('stories');
      expect(connectedGalleryBlockedRegion(position, true, false)).toBe('stories');
      expect(connectedGalleryBlockedRegion(position, true, true)).toBeNull();
    }
  });

  it('shares the existing journey key and preserves coordinates and layered floor IDs', () => {
    expect(CONNECTED_GALLERY_SESSION_OPTIONS.key).toBe(FIRST_GALLERY_WORLD_SESSION_KEY);
    const first = defaultWorldCheckpoint(toTerrainPoint('courtyard', { x: -12, z: -13 }));
    const musicNav = createMusicInteriorNavigation({ compactBalcony: true, additionalSolids: MUSIC_INSTRUMENT_DISPLAY_SOLIDS });
    const music = { ...defaultWorldCheckpoint(musicNav.musicInteriorSafeState('music-floor-2').position), walkSurface: 'music-floor-2' };
    const cave = upperPreviewCheckpoint('hall-b', true);
    for (const [checkpoint, id] of [[first, 'first'], [music, 'music'], [cave, 'mogao']] as const) {
      expect(connectedGalleryAt(checkpoint)).toBe(id);
      const restored = sanitizeConnectedGalleryCheckpoint(checkpoint, true, true);
      expect(restored.position.x).toBeCloseTo(checkpoint.position.x);
      expect(restored.position.z).toBeCloseTo(checkpoint.position.z);
      expect(restored.walkSurface).toBe(checkpoint.walkSurface);
      expect(restored.heading).toBe(checkpoint.heading);
      expect(restored.cameraYaw).toBe(checkpoint.cameraYaw);
    }
    expect(sanitizeConnectedGalleryCheckpoint(music, false, false)).toEqual(connectedGalleryStartCheckpoint());
    expect(sanitizeConnectedGalleryCheckpoint(cave, true, false)).toEqual(connectedGalleryStartCheckpoint());
    expect(connectedGalleryAt(defaultWorldCheckpoint(TERRAIN_ANCHORS.cliffStairFoot))).toBeUndefined();
  });

  it('retains the existing stone paths and transfers ownership at the actual courtyard gateway', () => {
    for (const route of TERRAIN_ROUTES) {
      let previous = route.points[0];
      for (const point of route.points.slice(1)) {
        const result = moveTerrainPlayer(previous, { x: point.x - previous.x, z: point.z - previous.z }, true);
        expect(result.x).toBeCloseTo(point.x, 3);
        expect(result.z).toBeCloseTo(point.z, 3);
        previous = point;
      }
    }
    const navigation = createMusicInteriorNavigation({ compactBalcony: true, additionalSolids: MUSIC_INSTRUMENT_DISPLAY_SOLIDS });
    let state: UpperWalkState = { position: toTerrainPoint('music', { x: 40.2, z: 5 }), surfaceId: null };
    function move(z: number) {
      const target = toTerrainPoint('music', { x: 40.2, z });
      state = navigation.musicInteriorMove(state, { x: target.x - state.position.x, z: target.z - state.position.z });
      // Crossing hands ownership off at the first outdoor substep; the rest of
      // that frame's intended motion is picked up by the next terrain update.
      expect(Math.hypot(state.position.x - target.x, state.position.z - target.z)).toBeLessThan(.12);
    }
    for (let step = 24; step >= 10; step--) move(step / 5);
    expect(state.surfaceId).toBe('music-courtyard');
    for (let step = 11; step <= 25; step++) move(step / 5);
    expect(state.surfaceId).toBeNull();
    const outside = toTerrainPoint('music', { x: 40.2, z: 5 });
    expect(state.position.x).toBeCloseTo(outside.x, 3);
    expect(state.position.z).toBeCloseTo(outside.z, 3);
  });
});
