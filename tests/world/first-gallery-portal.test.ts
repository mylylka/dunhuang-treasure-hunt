import { describe, expect, it } from 'vitest';
import { galleryNearby } from '../../src/world/first-gallery-events';
import { createGalleryPortalWalk, GALLERY_PORTAL_STOP, planGalleryPortalRoute } from '../../src/world/first-gallery-portal';
import { isTerrainWalkable, toTerrainPoint } from '../../src/world/terrain-rules-v001';
import type { WorldPoint } from '../../src/world/types';

const distance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);
const courtyard = (x: number, z: number) => toTerrainPoint('courtyard', { x, z });

describe('First Gallery portal walk', () => {
  it.each([
    ['mural', -12, -17.1], ['caisson', -12, -14], ['easel', -6.5, -3.9], ['east aisle', -2.105, -4.575],
    ['far side of the caisson', -10.5, -18.5], ['far end of the easel aisle', -1.5, -4],
  ])('continuously walks from %s to the interactive side of the revised desk', (_exhibit, x, z) => {
    let position: WorldPoint = courtyard(x, z);
    const walk = createGalleryPortalWalk(position);
    expect(walk).not.toBeNull();
    const dt = 1 / 40;
    let arrived = false;
    for (let i = 0; i < 760; i++) {
      if (i === 45) {
        for (let paused = 0; paused < 100; paused++) expect(walk!.advance(position, 0)).toEqual({ position, phase: 'walking' });
      }
      const result = walk!.advance(position, dt);
      expect(isTerrainWalkable(result.position, true)).toBe(true);
      expect(distance(position, result.position)).toBeLessThanOrEqual(2.05 * dt + .000001);
      position = result.position;
      if (result.phase === 'walking') continue;
      arrived = result.phase === 'arrived';
      break;
    }
    expect(arrived).toBe(true);
    expect(distance(position, GALLERY_PORTAL_STOP)).toBeLessThan(.045);
    expect(galleryNearby(position)).toBe('scroll');
  });

  it('offers a manual fallback for unreachable saved positions', () => {
    expect(planGalleryPortalRoute(courtyard(-50, 50))).toBeNull();
    expect(planGalleryPortalRoute(courtyard(-1.26, .34))).toBeNull();
  });

  it.each([[-2.5, .5], [-2, 0], [-2, .5], [-1.5, -.5], [-1.5, 0], [-1.5, .5]])(
    'does not guide through the courtyard walls from an isolated east-edge saved point (%s, %s)',
    (x, z) => {
      const point = courtyard(x, z);
      expect(isTerrainWalkable(point, true)).toBe(true);
      expect(galleryNearby(point)).toBe('easel');
      expect(createGalleryPortalWalk(point)).toBeNull();
    },
  );
});
