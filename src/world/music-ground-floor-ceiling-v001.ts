import * as THREE from 'three';
import { worldAssetUrl } from '../content/world/assets';

// The two rectangles are the actual undersides of the upper-floor slabs,
// in the source pavilion's coordinates.  The small return is not the stairwell.
export const MUSIC_GROUND_FLOOR_CEILING = {
  minX: 34.7625, maxX: 46.27,
  minZ: -32.175, mainMaxZ: -21.95, maxZ: -21.85,
  returnMinX: 44.7801,
  undersideY: 7.426,
  paintY: 7.414,
} as const;

/** Two coplanar, downward-facing slab surfaces sharing one continuous image. */
export function createMusicGroundFloorCeilingGeometry() {
  const c = MUSIC_GROUND_FLOOR_CEILING;
  const geometry = new THREE.BufferGeometry();
  const position: number[] = [], uv: number[] = [], index: number[] = [];
  function rectangle(minX: number, maxX: number, minZ: number, maxZ: number) {
    const offset = position.length / 3;
    const points = [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ]];
    for (const [x, z] of points) {
      position.push(x, c.paintY, z);
      // Orient the top of the artwork toward the back wall. Use one UV system
      // across both slabs, so the little return cannot produce a visible seam.
      uv.push((x - c.minX) / (c.maxX - c.minX), (c.maxZ - z) / (c.maxZ - c.minZ));
    }
    index.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  }
  rectangle(c.minX, c.maxX, c.minZ, c.mainMaxZ);
  rectangle(c.returnMinX, c.maxX, c.mainMaxZ, c.maxZ);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Load near the hall; original slab and its collision remain untouched. */
export function createMusicGroundFloorCeiling(root: THREE.Object3D, textureLimit: number,
  loadAsset?: (name: string, signal: AbortSignal) => Promise<Blob>) {
  const group = new THREE.Group();
  group.name = 'music-ground-floor-ceiling-v001';
  const controller = new AbortController();
  let status: 'loading' | 'ready' | 'failed' | 'disposed' = 'loading';
  let bitmap: ImageBitmap | undefined;
  let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | undefined;
  const timeout = setTimeout(() => controller.abort(), 20_000);

  function release() {
    group.removeFromParent();
    if (mesh) {
      mesh.geometry.dispose();
      mesh.material.map?.dispose();
      mesh.material.dispose();
      group.remove(mesh);
      mesh = undefined;
    }
    bitmap?.close();
    bitmap = undefined;
  }

  const ready = (async () => {
    const blob = loadAsset ? await loadAsset('ceiling.webp', controller.signal) : await (async () => {
      const response = await fetch(worldAssetUrl('music-ground-floor-mural/v001/ceiling.webp'), { signal: controller.signal });
      if (!response.ok) throw new Error('music-ground-floor-ceiling-request-failed');
      return response.blob();
    })();
    if (controller.signal.aborted) throw new Error('music-ground-floor-ceiling-load-cancelled');
    let decoded = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
    if (controller.signal.aborted) {
      decoded.close();
      throw new Error('music-ground-floor-ceiling-load-cancelled');
    }
    if (Math.max(decoded.width, decoded.height) > textureLimit) {
      const original = decoded;
      const scale = textureLimit / Math.max(original.width, original.height);
      try {
        decoded = await createImageBitmap(original, {
          resizeWidth: Math.max(1, Math.floor(original.width * scale)),
          resizeHeight: Math.max(1, Math.floor(original.height * scale)),
          resizeQuality: 'high',
        });
      } finally {
        original.close();
      }
      if (controller.signal.aborted) {
        decoded.close();
        throw new Error('music-ground-floor-ceiling-load-cancelled');
      }
    }
    bitmap = decoded;
    const map = new THREE.Texture(bitmap);
    map.flipY = false;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({ map, roughness: 1 });
    mesh = new THREE.Mesh(createMusicGroundFloorCeilingGeometry(), material);
    mesh.name = 'music-ground-floor-ceiling-painted-slab';
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.raycast = () => {};
    group.add(mesh);
    root.add(group);
    status = 'ready';
  })().catch(() => {
    if (status === 'disposed') return;
    status = 'failed';
    controller.abort();
    release();
  }).finally(() => clearTimeout(timeout));

  return {
    group,
    ready,
    inspect: () => ({ status, panel: mesh?.name }),
    dispose() {
      if (status === 'disposed') return;
      status = 'disposed';
      clearTimeout(timeout);
      controller.abort();
      release();
    },
  };
}
