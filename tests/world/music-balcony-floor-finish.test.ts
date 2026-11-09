import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('../../src/world/music-upper-floor-material-v001', () => ({
  createMusicUpperFloorMaterial: () => ({ material: new THREE.MeshStandardMaterial(), dispose: vi.fn() }),
}));
import { createMusicBalconyFloorFinish, MUSIC_BALCONY_FLOOR_FINISH as balcony } from '../../src/world/music-balcony-floor-finish-v001';
import { MUSIC_UPPER_FLOOR_FINISH as hall } from '../../src/world/music-upper-floor-finish-v001';

describe('music balcony floor finish', () => {
  it('fits the terrace, abuts the hall without an overlapping surface, and leaves shadows and picking intact', () => {
    const root = new THREE.Group();
    const floor = createMusicBalconyFloorFinish(root);
    const mesh = floor.group.children[0] as THREE.Mesh;
    const bounds = new THREE.Box3().setFromObject(mesh);
    expect(bounds.min.x).toBeCloseTo(balcony.minX, 4);
    expect(bounds.max.x).toBeCloseTo(balcony.maxX, 4);
    expect(bounds.min.z).toBeCloseTo(hall.maxZ, 4);
    expect(bounds.max.z).toBeCloseTo(balcony.maxZ, 4);
    expect(bounds.min.y).toBeCloseTo(hall.surfaceY, 4);
    expect(balcony.band).toBeLessThan(.5);
    // The west wall overlaps part of the legacy navigation rectangle: the
    // complete short side must sit on the visible side of that wall.
    expect(balcony.minX + balcony.inset + balcony.leftInsetExtra).toBeGreaterThan(34.7625);
    expect(mesh.receiveShadow).toBe(true);
    expect(new THREE.Raycaster(new THREE.Vector3(40, 9, -20), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)).toHaveLength(0);
    floor.dispose();
    expect(root.children).toHaveLength(0);
  });
});
