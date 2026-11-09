import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createMusicGroundFloorStone, createMusicGroundFloorStoneTexture, MUSIC_GROUND_FLOOR_STONE as floor } from '../../src/world/music-ground-floor-stone-v001';

describe('music ground-floor stone finish', () => {
  it('stays on the interior floor and leaves the original collision alone', () => {
    const root = new THREE.Group(), finish = createMusicGroundFloorStone(root);
    root.updateMatrixWorld(true);
    const mesh = finish.group.children[0] as THREE.Mesh;
    const box = new THREE.Box3().setFromObject(mesh);
    expect(box.min.x).toBeCloseTo(floor.minX, 4);
    expect(box.max.x).toBeCloseTo(floor.maxX, 4);
    expect(box.min.z).toBeCloseTo(floor.minZ, 4);
    expect(box.max.z).toBeCloseTo(floor.maxZ, 4);
    expect(box.min.y).toBeCloseTo(floor.floorY + .0045, 4);
    expect(box.min.y).toBeGreaterThan(floor.floorY + .002); // Existing landing inlay.
    expect(mesh.receiveShadow).toBe(true);
    expect(new THREE.Raycaster(new THREE.Vector3(40, 2, -25), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)).toHaveLength(0);
    finish.dispose(); expect(root.children).toHaveLength(0);
  });

  it('keeps stone, fine joints, and natural color changes very low contrast', () => {
    const texture = createMusicGroundFloorStoneTexture();
    const data = texture.image.data as Uint8Array;
    const channel = (x: number, y: number) => data[(y * floor.textureSize + x) * 4];
    expect(texture.wrapS).toBe(THREE.RepeatWrapping);
    expect(channel(0, 1)).toBe(235);
    expect(channel(1, 0)).toBe(235);
    expect(channel(1, 1)).toBeGreaterThan(240);
    expect(Math.abs(channel(1, 1) - channel(129, 1))).toBeLessThan(10);
    expect(channel(1, 129)).toBeGreaterThan(240); // shifted join on next row
    expect(channel(64, 129)).toBe(235);
    texture.dispose();
  });
});
