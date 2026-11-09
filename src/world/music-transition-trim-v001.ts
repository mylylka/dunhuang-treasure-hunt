import * as THREE from 'three';

/** Pavilion-local metres, measured against the decorated back wall and mural edge. */
export const MUSIC_TRANSITION_TRIM = {
  wallZ: -32.145,
  seamX: 46.27,
  floorY: 7.915375,
  ceilingY: 13.475,
  width: .18,
  depth: .045,
  goldWidth: .010,
} as const;

/** A narrow wood finish on the existing back wall's change-of-finish seam.
 * The strip sits on the hall side of the seam, rather than forming a doorway
 * across the stairs. Picking and navigation continue to use the original wall.
 */
export function createMusicTransitionTrim(root: THREE.Object3D) {
  const c = MUSIC_TRANSITION_TRIM;
  const group = new THREE.Group();
  group.name = 'music-transition-trim-v001';
  const wood = new THREE.MeshStandardMaterial({ color: '#4d251c', roughness: .9 });
  const gold = new THREE.MeshStandardMaterial({ color: '#9c7849', roughness: .85, metalness: .12 });
  const height = c.ceilingY - c.floorY;
  const woodGeometry = new THREE.BoxGeometry(c.width, height, c.depth);
  const strip = new THREE.Mesh(woodGeometry, wood);
  // The right edge ends at the mural junction; the back is on the wall face.
  strip.position.set(c.seamX - c.width / 2, (c.floorY + c.ceilingY) / 2, c.wallZ + c.depth / 2);
  strip.receiveShadow = true;
  strip.castShadow = false;
  strip.raycast = () => {};
  strip.name = 'music-transition-wood';
  group.add(strip);

  const goldGeometry = new THREE.BoxGeometry(c.goldWidth, height - .16, .003);
  const line = new THREE.Mesh(goldGeometry, gold);
  line.position.set(c.seamX - .022, (c.floorY + c.ceilingY) / 2, c.wallZ + c.depth + .0015);
  line.receiveShadow = true;
  line.castShadow = false;
  line.raycast = () => {};
  line.name = 'music-transition-gold-line';
  group.add(line);
  root.add(group);
  let disposed = false;
  return {
    group,
    inspect: () => ({ version: 'music-transition-trim-v001', seamX: c.seamX, wallZ: c.wallZ, width: c.width, depth: c.depth }),
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      woodGeometry.dispose(); goldGeometry.dispose(); wood.dispose(); gold.dispose();
    },
  };
}
