import * as THREE from 'three';
import { MUSIC_RELIEF_CEILING } from './music-interior-relief-ceiling-v001';

/** Measured underside of roof-wall-closure--wood in music-pavilion source metres. */
export const MUSIC_CONNECTED_CEILING = {
  minX: 34.7045, maxX: 59.4924,
  minZ: -32.215, maxZ: -18.210,
  // One continuous plaster face hides the original plain backing. The relief
  // mouldings project lower than this plane and remain visible.
  y: MUSIC_RELIEF_CEILING.undersideY - .005,
} as const;

/** Continuous flat plaster along the hall, stair and covered balcony.
 * The relief is still visible below this surface and the original backing is
 * retained above it. Depth separation avoids coplanar flicker and seams.
 * The open balcony and front beam beyond the existing ceiling remain untouched.
 */
export function createMusicTransitionCeiling(root: THREE.Object3D) {
  const outer = MUSIC_CONNECTED_CEILING;
  const shape = new THREE.Shape();
  shape.moveTo(outer.minX, outer.minZ);
  shape.lineTo(outer.maxX, outer.minZ);
  shape.lineTo(outer.maxX, outer.maxZ);
  shape.lineTo(outer.minX, outer.maxZ);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  // XY source shape maps to XZ, with its front facing down into the room.
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, outer.y, 0);
  geometry.computeBoundingSphere();
  // Same material values as the existing relief ceiling's plaster panel.
  const material = new THREE.MeshStandardMaterial({
    color: '#f4e4c6', roughness: 1, emissive: '#e2cba5', emissiveIntensity: .22,
  });
  const group = new THREE.Group();
  group.name = 'music-transition-ceiling-v001';
  const panel = new THREE.Mesh(geometry, material);
  panel.name = 'music-transition-ceiling-plaster';
  panel.receiveShadow = true;
  panel.castShadow = false;
  panel.raycast = () => {};
  group.add(panel);
  root.add(group);

  let disposed = false;
  return {
    group,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
