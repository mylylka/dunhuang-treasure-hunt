import { createMusicInteriorNavigation } from '../../src/world/music-interior-navigation';
import { sanitizeConnectedGalleryCheckpoint } from '../../src/world/connected-gallery-session';
import { OASIS_OBSTACLES } from '../../src/world/desert-oasis-obstacles-v013';
import { expect, test } from 'vitest';
import { TERRAIN_ROUTES } from '../../src/content/world/terrain-layout-v001';
import { isReplacedCourtyardRock } from '../../src/content/world/courtyard-rock-refinement-v001';
import { terrainCameraSpace } from '../../src/world/terrain-camera-v001';
import {
  isRetiredConnectedVegetation, isTerrainWalkable, moveTerrainPlayer,
  TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS, CONNECTED_TERRAIN_PLAYER_COLLIDERS,
  COMPOSED_CONNECTED_TERRAIN_PLAYER_COLLIDERS,
} from '../../src/world/terrain-rules-v001';

test('the connected world clears embedded plants, landmark trees and their player and camera bounds', () => {
  const retired = TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS.filter(solid => isRetiredConnectedVegetation(solid.id));
  expect(retired).toHaveLength(17);
  expect(CONNECTED_TERRAIN_PLAYER_COLLIDERS).toHaveLength(TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS.length - retired.length);
  expect(terrainCameraSpace(true, true, true, true).cylinders.some(solid => isRetiredConnectedVegetation(solid.id))).toBe(false);
  expect(terrainCameraSpace(true, true, true).cylinders.some(solid => isRetiredConnectedVegetation(solid.id))).toBe(true);
  for (const collider of retired) {
    const point = collider.circle ?? {
      x: (collider.minX + collider.maxX) / 2,
      z: (collider.minZ + collider.maxZ) / 2,
    };
    expect(isTerrainWalkable(point, true)).toBe(false);
    expect(isTerrainWalkable(point, true, undefined, true)).toBe(true);
  }
});

test('the composed entrance retires replaced rock bounds and keeps them in the previous layout', () => {
  const previous = CONNECTED_TERRAIN_PLAYER_COLLIDERS.filter(solid => isReplacedCourtyardRock(solid.id));
  expect(previous.length).toBeGreaterThan(3);
  expect(COMPOSED_CONNECTED_TERRAIN_PLAYER_COLLIDERS).toHaveLength(CONNECTED_TERRAIN_PLAYER_COLLIDERS.length - previous.length);
  const earlierCamera = terrainCameraSpace(true, true, true, true);
  const composedCamera = terrainCameraSpace(true, true, true, true, true);
  expect(earlierCamera.cylinders.some(item => isReplacedCourtyardRock(item.id))).toBe(true);
  expect(composedCamera.cylinders.some(item => isReplacedCourtyardRock(item.id))).toBe(false);
});

test('approved grove trunks stop the player and camera while an overlapping older save recovers locally', () => {
  const court = createMusicInteriorNavigation({ connectedTerrain: true, composedCourtyard: true });
  const camera = terrainCameraSpace(true, true, true, true, true);
  for (const model of ['T03_展冠胡杨树', 'T02_弯曲胡杨树', '大树9']) {
    const tree = OASIS_OBSTACLES.find(o => o.model === model)!;
    const position = { x: tree.circle.x, z: tree.circle.z };
    const surface = model === '大树9' ? 'music-courtyard' : undefined;
    expect(isTerrainWalkable(position, true, undefined, true, true)).toBe(false);
    expect(camera.cylinders.some(o => o.id === tree.id)).toBe(true);
    if (surface) expect(court.musicInteriorValid({ position, surfaceId: surface })).toBe(false);
    const saved = { version: 1 as const, position, heading: .25, cameraYaw: .75,
      walkSurface: surface, visitedEvents: ['caisson' as const] };
    const restored = sanitizeConnectedGalleryCheckpoint(saved, true, true);
    expect(Math.hypot(restored.position.x - position.x, restored.position.z - position.z)).toBeLessThan(5);
    expect(isTerrainWalkable(restored.position, true, undefined, true, true)).toBe(true);
    expect(restored).toMatchObject({ heading: .25, cameraYaw: .75, visitedEvents: ['caisson'] });
    expect(restored.walkSurface).toBe(surface);
  }
});

test('the player can follow both stone paths past the V013 trunks and rocks', () => {
  for (const { points } of TERRAIN_ROUTES) {
    let position = { x: points[0].x, z: points[0].z };
    for (const goal of points.slice(1)) {
      const delta = { x: goal.x - position.x, z: goal.z - position.z };
      position = moveTerrainPlayer(position, delta, true, [], true, true);
      expect(Math.hypot(position.x - goal.x, position.z - goal.z)).toBeLessThan(.01);
    }
  }
});
