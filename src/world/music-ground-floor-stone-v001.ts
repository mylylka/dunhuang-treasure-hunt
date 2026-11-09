import * as THREE from 'three';

// Interior-facing finish only. Coordinates follow the original pavilion model;
// the porch, the outdoor steps and the upper floor keep their own finishes.
export const MUSIC_GROUND_FLOOR_STONE = {
  minX: 34.7625, maxX: 59.4023,
  minZ: -32.175, maxZ: -18.247,
  // Existing landing inlays sit at 1.802; stay slightly above them to avoid
  // coplanar flashing, while remaining below the separate contact shadow.
  floorY: 1.8, finishY: 1.8045,
  tileWidth: 1.8, tileDepth: 1.3, textureSize: 512, tilesAcross: 4,
  // The upper hall's existing music-decor-wood floor, expressed in sRGB.
  color: '#a97a54',
} as const;

/** A very quiet, seamless four-by-four stone repeat, generated locally.
 * The 1-pixel joints and small per-stone tone shifts do not need extra meshes. */
export function createMusicGroundFloorStoneTexture() {
  const { textureSize: size, tilesAcross: tiles } = MUSIC_GROUND_FLOOR_STONE;
  const pixels = new Uint8Array(size * size * 4), pitch = size / tiles;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(y / pitch);
    // Stagger alternate rows by half a tile, so it reads as stone rather than a grid.
    const shiftedX = (x + (row % 2) * pitch / 2) % size;
    const column = Math.floor(shiftedX / pitch);
    const joint = y % pitch === 0 || shiftedX % pitch === 0;
    const variation = ((row * 13 + column * 7 + row * column * 3) % 7) - 3;
    const grain = ((Math.imul(x + 1, 157) ^ Math.imul(y + 3, 79)) & 3) - 1;
    const value = joint ? 235 : Math.max(0, Math.min(255, 250 + variation + grain));
    const i = (y * size + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
    pixels[i + 3] = 255;
  }
  const map = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  map.name = 'music-ground-floor-stone-v001';
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set((MUSIC_GROUND_FLOOR_STONE.maxX - MUSIC_GROUND_FLOOR_STONE.minX) / (MUSIC_GROUND_FLOOR_STONE.tileWidth * tiles),
    (MUSIC_GROUND_FLOOR_STONE.maxZ - MUSIC_GROUND_FLOOR_STONE.minZ) / (MUSIC_GROUND_FLOOR_STONE.tileDepth * tiles));
  map.colorSpace = THREE.LinearSRGBColorSpace;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 4;
  map.needsUpdate = true;
  return map;
}

/** Decoration only: the existing floor and its collision remain intact. */
export function createMusicGroundFloorStone(root: THREE.Object3D) {
  const c = MUSIC_GROUND_FLOOR_STONE;
  const group = new THREE.Group(); group.name = 'music-ground-floor-stone-finish-v001';
  const texture = createMusicGroundFloorStoneTexture();
  const geometry = new THREE.PlaneGeometry(c.maxX - c.minX, c.maxZ - c.minZ);
  const material = new THREE.MeshStandardMaterial({ color: c.color, roughness: .91, map: texture });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'music-ground-floor-stone-finish';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((c.minX + c.maxX) / 2, c.finishY, (c.minZ + c.maxZ) / 2);
  mesh.receiveShadow = true; mesh.castShadow = false; mesh.raycast = () => {};
  group.add(mesh); root.add(group);
  return {
    group,
    inspect: () => ({ status: 'ready', floorY: c.floorY, finishY: c.finishY }),
    dispose() { group.removeFromParent(); group.clear(); geometry.dispose(); material.dispose(); texture.dispose(); },
  };
}
