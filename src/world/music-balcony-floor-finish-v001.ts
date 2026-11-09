import * as THREE from 'three';
import { createMusicUpperFloorMaterial } from './music-upper-floor-material-v001';

// Measured playable terrace, excluding the shared 10 cm overlap with the
// adjoining music hall's existing finish. The musicians' mat remains above it.
export const MUSIC_BALCONY_FLOOR_FINISH = {
  minX: 34.4725, maxX: 44.7801,
  minZ: -21.85, maxZ: -17.65,
  floorY: 7.915375, surfaceY: 7.921375,
  inset: .15, band: .24, leftInsetExtra: .35,
} as const;

export function createMusicBalconyFloorGeometry() {
  const c = MUSIC_BALCONY_FLOOR_FINISH;
  const geometry = new THREE.PlaneGeometry(c.maxX - c.minX, c.maxZ - c.minZ);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate((c.minX + c.maxX) / 2, c.surfaceY, (c.minZ + c.maxZ) / 2);
  geometry.computeBoundingBox();
  return geometry;
}

/** One plane, painted with the same material in a slimmer terrace proportion. */
export function createMusicBalconyFloorFinish(root: THREE.Object3D) {
  const c = MUSIC_BALCONY_FLOOR_FINISH;
  const group = new THREE.Group(); group.name = 'music-balcony-floor-finish-v001';
  const geometry = createMusicBalconyFloorGeometry();
  // The western end of the old terrace navigation bounds extends behind the
  // hall wall. Move that short edge of the inlay onto its visible floor face.
  const finish = createMusicUpperFloorMaterial(c.maxX - c.minX, c.maxZ - c.minZ,
    { inset: c.inset, band: c.band, leftInsetExtra: c.leftInsetExtra });
  const mesh = new THREE.Mesh(geometry, finish.material);
  mesh.name = 'music-balcony-floor-inlaid-stone';
  mesh.receiveShadow = true; mesh.castShadow = false; mesh.raycast = () => {};
  group.add(mesh); root.add(group);
  let disposed = false;
  return {
    group,
    inspect: () => ({ ...c, width: c.maxX - c.minX, depth: c.maxZ - c.minZ }),
    dispose() {
      if (disposed) return;
      disposed = true; group.removeFromParent(); group.clear(); geometry.dispose(); finish.dispose();
    },
  };
}
