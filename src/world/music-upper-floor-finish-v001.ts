import * as THREE from 'three';
import { createMusicUpperFloorMaterial } from './music-upper-floor-material-v001';

// Pavilion-local measured rear-hall slab. The stair and musician's open
// gallery are outside these limits and retain their existing surface.
export const MUSIC_UPPER_FLOOR_FINISH = {
  minX: 34.7625, maxX: 46.27,
  minZ: -32.175, maxZ: -21.85,
  floorY: 7.915375,
  // A sub-centimetre rendering offset avoids fighting the original slab;
  // navigation remains on the real floor rather than the visual surface.
  surfaceY: 7.921375,
} as const;

export function createMusicUpperFloorGeometry() {
  const c = MUSIC_UPPER_FLOOR_FINISH;
  const geometry = new THREE.PlaneGeometry(c.maxX - c.minX, c.maxZ - c.minZ);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate((c.minX + c.maxX) / 2, c.surfaceY, (c.minZ + c.maxZ) / 2);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** One continuous visual skin for the central field and its inlaid border. */
export function createMusicUpperFloorFinish(root: THREE.Object3D) {
  const c = MUSIC_UPPER_FLOOR_FINISH;
  const group = new THREE.Group();
  group.name = 'music-upper-floor-finish-v001';
  const geometry = createMusicUpperFloorGeometry();
  const finish = createMusicUpperFloorMaterial(c.maxX - c.minX, c.maxZ - c.minZ);
  const mesh = new THREE.Mesh(geometry, finish.material);
  mesh.name = 'music-upper-floor-inlaid-stone';
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.raycast = () => {};
  group.add(mesh);
  root.add(group);
  let disposed = false;
  return {
    group,
    inspect: () => ({ ...c, width: c.maxX - c.minX, depth: c.maxZ - c.minZ }),
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      group.clear();
      geometry.dispose();
      finish.dispose();
    },
  };
}
