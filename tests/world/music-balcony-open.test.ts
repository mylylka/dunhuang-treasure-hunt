import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { clearCameraPosition } from '../../src/world/camera';
import { settleMusicInteriorCamera } from '../../src/world/music-interior-camera';
import { musicInteriorCameraSolids } from '../../src/world/music-interior-navigation';
import { musicCameraSpaceV4 } from '../../src/world/music-pavilion-v004';
import { terrainCameraSpace, terrainVector } from '../../src/world/terrain-camera-v001';

const MIDDLE = 39.6925;
const porchRay = (x: number, y: number, startZ = -19.4) => [new THREE.Vector3(x, y, startZ), new THREE.Vector3(x, y, -16.9)] as const;
const worldRay = (x: number, y: number, startZ?: number) => {
  const [start, end] = porchRay(x, y, startZ);
  return [terrainVector('music', start), terrainVector('music', end)] as const;
};

describe('open center of the Second Gallery balcony', () => {
  it('drops the old upstairs camera obstacle in current versions while preserving the lower exterior column', () => {
    const current = musicCameraSpaceV4(true), legacy = musicCameraSpaceV4();
    const terrainCurrent = terrainCameraSpace(true, false, true), terrainLegacy = terrainCameraSpace(true);
    const [eye, desired] = porchRay(MIDDLE, 8.45), [worldEye, worldDesired] = worldRay(MIDDLE, 8.45);
    expect(clearCameraPosition(eye, desired, current).distanceTo(desired)).toBeLessThan(1e-6);
    expect(clearCameraPosition(worldEye, worldDesired, terrainCurrent).distanceTo(worldDesired)).toBeLessThan(1e-6);
    expect(clearCameraPosition(eye, desired, legacy).distanceTo(desired)).toBeGreaterThan(1);
    expect(clearCameraPosition(worldEye, worldDesired, terrainLegacy).distanceTo(worldDesired)).toBeGreaterThan(1);
    const [lowerEye, lowerDesired] = porchRay(MIDDLE, 5), [lowerWorldEye, lowerWorldDesired] = worldRay(MIDDLE, 5);
    expect(clearCameraPosition(lowerEye, lowerDesired, current).distanceTo(lowerDesired)).toBeGreaterThan(1);
    expect(clearCameraPosition(lowerWorldEye, lowerWorldDesired, terrainCurrent).distanceTo(lowerWorldDesired)).toBeGreaterThan(1);
  });

  it('opens the upper center in the double-floor camera while retaining both end columns and the front rail', () => {
    const ids = musicInteriorCameraSolids.map(solid => solid.id);
    expect(ids).not.toContain('music-column-upper-1');
    expect(ids).not.toContain('music-column-upper-foot-1');
    expect(ids).toEqual(expect.arrayContaining(['music-column-upper-0', 'music-column-upper-2', 'music-original-gallery-front-railing']));
    const [eye, desired] = worldRay(MIDDLE, 10.65);
    expect(settleMusicInteriorCamera(eye, desired).distanceTo(desired)).toBeLessThan(1e-6);
    for (const ray of [worldRay(MIDDLE, 8.72, -18.03), worldRay(35.15, 10.65), worldRay(44.3325, 10.65)]) {
      const [start, end] = ray;
      expect(settleMusicInteriorCamera(start, end).distanceTo(end)).toBeGreaterThan(1);
    }
  });
});
