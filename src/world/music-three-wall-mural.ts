import * as THREE from 'three';
import { worldAssetUrl } from '../content/world/assets';

const floorY = 1.8;
const ceilingY = 13.5305;
// The v008 wall skirts and decorative bands project 13–17 mm into the room.
// This offset covers them and leaves the existing fixtures in front of the paint.
const paintOffset = .022;
const eastX = 59.424298 - paintOffset;
const backZ = -32.175 + paintOffset;
const frontZ = -18.225 - paintOffset;
const panels = [
  { id: 'back-stair', left: [46.27, backZ], right: [eastX, backZ] },
  { id: 'east', left: [eastX, backZ], right: [eastX, frontZ] },
  { id: 'flying-reverse', left: [eastX, frontZ], right: [44.907851, frontZ] },
] as const;

export function createMusicThreeWallMural(root: THREE.Object3D, textureLimit: number) {
  const group = new THREE.Group();
  group.name = 'music-three-wall-mural-v001';
  const quality = textureLimit >= 4096 ? 'desktop' : 'mobile';
  const controller = new AbortController();
  const resources: { bitmap: ImageBitmap; mesh?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> }[] = [];
  let status: 'loading' | 'ready' | 'failed' | 'disposed' = 'loading';
  const timeout = setTimeout(() => controller.abort(), 20_000);

  function release() {
    for (const { bitmap, mesh } of resources) {
      mesh?.geometry.dispose();
      mesh?.material.map?.dispose();
      mesh?.material.dispose();
      bitmap.close();
    }
    resources.length = 0;
    group.removeFromParent();
    group.clear();
  }

  const ready = Promise.all(panels.map(async panel => {
    const suffix = quality === 'mobile' ? '-mobile' : '';
    const url = worldAssetUrl(`music-three-wall-mural/v001/${panel.id}${suffix}.webp`);
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('music-three-wall-mural-texture-request-failed');
    const bitmap = await createImageBitmap(await response.blob(), { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
    if (controller.signal.aborted || Math.max(bitmap.width, bitmap.height) > textureLimit) {
      bitmap.close();
      throw new Error('music-three-wall-mural-texture-unavailable');
    }
    const resource: typeof resources[number] = { bitmap };
    resources.push(resource);
    return { panel, resource };
  })).then(loaded => {
    if (controller.signal.aborted) throw new Error('music-three-wall-mural-load-cancelled');
    for (const { panel, resource } of loaded) {
      const [leftX, leftZ] = panel.left;
      const [rightX, rightZ] = panel.right;
      // Matching vertices at both bends keep the three UV panels edge to edge.
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        leftX, floorY, leftZ, rightX, floorY, rightZ,
        rightX, ceilingY, rightZ, leftX, ceilingY, leftZ,
      ], 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      geometry.setIndex([0, 1, 2, 0, 2, 3]);
      geometry.computeVertexNormals();
      const map = new THREE.Texture(resource.bitmap);
      map.flipY = false;
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 8;
      map.needsUpdate = true;
      const material = new THREE.MeshStandardMaterial({ map, roughness: 1 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `music-three-wall-mural-${panel.id}`;
      mesh.receiveShadow = true;
      group.add(mesh);
      resource.mesh = mesh;
    }
    root.add(group);
    status = 'ready';
  }).catch(() => {
    if (status === 'disposed') return;
    // Keep the original room usable if any paint image cannot be loaded.
    status = 'failed';
    controller.abort();
    release();
  }).finally(() => clearTimeout(timeout));

  return {
    ready,
    inspect: () => ({
      status,
      quality,
      panels: group.children.map(mesh => mesh.name),
    }),
    dispose() {
      if (status === 'disposed') return;
      status = 'disposed';
      clearTimeout(timeout);
      controller.abort();
      release();
    },
  };
}
