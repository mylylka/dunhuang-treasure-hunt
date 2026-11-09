import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Scene, Vector3 } from 'three';
import { MUSIC_GUIDE_STATION, MUSIC_GUIDE_PLAYER_START } from '../../src/content/world/music-guide-v001';
import { MUSIC_INSTRUMENT_DISPLAY_SOLIDS } from '../../src/content/world/music-instrument-display-layout-v001';
import { createGalleryGamePortal } from '../../src/world/first-gallery-portal-light';
import { MUSIC_GAME_PORTAL_CENTER, nearMusicGamePortal } from '../../src/world/music-game-portal';
import { createMusicInteriorNavigation, musicInteriorFromWorld, musicInteriorToWorld } from '../../src/world/music-interior-navigation';
import { defaultWorldCheckpoint } from '../../src/world/session';

describe('second gallery courtyard game portal', () => {
  it('fits beside the exit on the real courtyard floor and outside the arrival and guide area', () => {
    const navigation = createMusicInteriorNavigation({ compactBalcony: true, additionalSolids: MUSIC_INSTRUMENT_DISPLAY_SOLIDS });
    const portal = { position: MUSIC_GAME_PORTAL_CENTER, surfaceId: 'music-courtyard' };
    const gateway = navigation.layout.gateways.find(entry => entry.surfaceId === portal.surfaceId)!;
    const { x, z } = musicInteriorFromWorld(portal.position);
    expect(x - .67).toBeGreaterThan(gateway.maxX);
    expect(z + .67).toBeLessThan(gateway.minZ);
    for (const point of [{ x, z }, { x: x - .67, z }, { x: x + .67, z }, { x, z: z - .67 }, { x, z: z + .67 }]) {
      expect(navigation.musicInteriorValid({ ...portal, position: musicInteriorToWorld(point) })).toBe(true);
    }

    const from = { ...portal, position: musicInteriorToWorld({ x: (gateway.minX + gateway.maxX) / 2, z: 1 }) };
    expect(navigation.musicInteriorPath(from, portal)?.at(-1)).toEqual(portal);
    const checkpoint = { ...defaultWorldCheckpoint(portal.position), walkSurface: portal.surfaceId };
    expect(nearMusicGamePortal(checkpoint)).toBe(true);
    expect(nearMusicGamePortal({ ...checkpoint, walkSurface: 'music-floor-2' })).toBe(false);
    for (const position of [MUSIC_GUIDE_STATION, MUSIC_GUIDE_PLAYER_START]) {
      expect(nearMusicGamePortal({ ...checkpoint, position: musicInteriorToWorld(position) })).toBe(false);
    }
  });

  it('uses the shared golden effect and picks its disk at the scene position', () => {
    const scene = new Scene();
    const center = new Vector3().copy(MUSIC_GAME_PORTAL_CENTER);
    const portal = createGalleryGamePortal(scene, 'music-courtyard-game-portal', center);
    const camera = new PerspectiveCamera(49, 1.7, .1, 20);
    camera.position.copy(center).add(new Vector3(0, 2.7, -4.3));
    camera.lookAt(center);
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    expect(portal.inspect()).toMatchObject({ visible: true, reveal: 1 });
    expect(portal.pick(camera, { x: 0, y: 0 })).toBe(true);
    expect(portal.pick(camera, { x: .75, y: 0 })).toBe(false);
    portal.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
