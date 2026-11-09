import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('../../src/world/music-upper-floor-material-v001', () => ({
  createMusicUpperFloorMaterial: () => ({ material: new THREE.MeshStandardMaterial(), dispose: vi.fn() }),
}));
import { createMusicUpperFloorFinish, MUSIC_UPPER_FLOOR_FINISH } from '../../src/world/music-upper-floor-finish-v001';

describe('music upper hall floor finish', () => {
  it('covers exactly the existing hall slab, receives shadows and does not create a pickable obstacle', () => {
    const root = new THREE.Group();
    const floor = createMusicUpperFloorFinish(root);
    const mesh = floor.group.children[0] as THREE.Mesh;
    const bounds = new THREE.Box3().setFromObject(mesh);
    const c = MUSIC_UPPER_FLOOR_FINISH;
    expect(bounds.min.x).toBeCloseTo(c.minX, 4);
    expect(bounds.max.x).toBeCloseTo(c.maxX, 4);
    expect(bounds.min.z).toBeCloseTo(c.minZ, 4);
    expect(bounds.max.z).toBeCloseTo(c.maxZ, 4);
    expect(bounds.min.y).toBeCloseTo(c.surfaceY, 4);
    expect(c.surfaceY - c.floorY).toBeGreaterThan(0);
    expect(c.surfaceY - c.floorY).toBeLessThan(.01);
    expect(mesh.receiveShadow).toBe(true);
    expect(new THREE.Raycaster(new THREE.Vector3(40, 9, -26), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)).toHaveLength(0);
    floor.dispose();
    expect(root.children).toHaveLength(0);
  });
});
