import * as THREE from 'three';
import { DESERT_TOWER_TREE_IMPOSTORS } from '../content/world/desert-tower-tree-impostors-v001';
import type { DesertVenueVisibility } from './desert-decoration-overlook';
import type { DesertDecorationPlacement } from './desert-decoration-placement';

type Venue = DesertDecorationPlacement['venue'];
type TreePlacement = Pick<DesertDecorationPlacement, 'id' | 'x' | 'y' | 'z' | 'yaw' | 'scale' | 'venue'> & { assetId: string };
type TreeShape = { row: number; width: number; height: number; centerY: number };

interface TreeAtlas {
  url: string;
  columns: number;
  tileSize: number;
  atlasWidth: number;
  atlasHeight: number;
  shapes: Readonly<Partial<Record<string, TreeShape>>>;
}
const historicalTreeIds = new Set(['t01', 't02', 't03']);
export function isDesertImpostorTree(assetId: string) {
  return historicalTreeIds.has(assetId) || Object.hasOwn(DESERT_TOWER_TREE_IMPOSTORS.shapes, assetId);
}

export function createDesertTreeImpostors(items: readonly TreePlacement[]) {
  const root = new THREE.Group();
  root.name = 'desert-tree-impostors';
  const material = new THREE.MeshBasicMaterial({
    alphaTest: .26,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  // Match the warmer and darker canopy colors of the nearby lit meshes.
  material.color.setRGB(.77, .78, .66);
  function createBatches(shapes: TreeAtlas['shapes']) {
    return ([undefined, 'music', 'cliff'] as const).flatMap(venue => {
      const trees = items.flatMap(tree => {
        const shape = shapes[tree.assetId];
        return tree.venue === venue && shape ? [{ tree, shape }] : [];
      });
      if (!trees.length) return [];
      const position = new THREE.BufferAttribute(new Float32Array(trees.length * 12), 3).setUsage(THREE.DynamicDrawUsage);
      const uv = new THREE.BufferAttribute(new Float32Array(trees.length * 8), 2).setUsage(THREE.DynamicDrawUsage);
      const indices: number[] = [];
      const bounds = new THREE.Box3();
      for (const [index, { tree, shape }] of trees.entries()) {
        const first = index * 4;
        indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
        const width = shape.width * tree.scale / 2;
        const y = tree.y + shape.centerY * tree.scale;
        const height = shape.height * tree.scale / 2;
        bounds.expandByPoint(new THREE.Vector3(tree.x - width, y - height, tree.z - width));
        bounds.expandByPoint(new THREE.Vector3(tree.x + width, y + height, tree.z + width));
      }
      const geometry = new THREE.BufferGeometry().setAttribute('position', position).setAttribute('uv', uv);
      geometry.setIndex(indices);
      geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
      geometry.setDrawRange(0, 0);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `desert-tree-impostors-${venue ?? 'landscape'}`;
      mesh.matrixAutoUpdate = false;
      mesh.visible = false;
      mesh.raycast = () => {};
      root.add(mesh);
      return [{ venue, trees, position, uv, mesh }];
    });
  }
  let batches: ReturnType<typeof createBatches> = [];
  let atlas: TreeAtlas = DESERT_TOWER_TREE_IMPOSTORS;
  const ids = new Set(items.filter(item => isDesertImpostorTree(item.assetId)).map(item => item.id));
  const historical = items.some(item => historicalTreeIds.has(item.assetId));
  let texture: THREE.Texture | undefined;
  let loading: Promise<void> | undefined;
  let disposed = false;
  let visibility: DesertVenueVisibility = { music: false, cliff: false };
  let previousDetail: ReadonlySet<string> | undefined;
  const eye = new THREE.Vector3();
  const previousEye = new THREE.Vector3(Infinity, Infinity, Infinity);

  function canShow(venue: Venue) {
    return !!texture && (venue === undefined || visibility[venue]);
  }

  async function prepareAtlas() {
    if (historical) atlas = (await import('../content/world/desert-tree-impostors-v001')).DESERT_TREE_IMPOSTORS;
    if (disposed) return;
    batches = createBatches(atlas.shapes);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('desert-tree-impostors-decode'));
      img.src = atlas.url;
    });
    if (disposed) return;
    texture = new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    material.map = texture;
    material.needsUpdate = true;
  }

  function prepare() {
    if (disposed || !ids.size) return Promise.resolve();
    return loading ??= prepareAtlas().catch(error => {
      if (!disposed) console.warn(error);
    });
  }

  return {
    root,
    prepare,
    setVenueVisibility(next: DesertVenueVisibility) {
      visibility = next;
      previousDetail = undefined;
    },
    cost(frustum: THREE.Frustum) {
      let draws = 0;
      let triangles = 0;
      const venueInView = { music: false, cliff: false };
      for (const batch of batches) {
        if (!canShow(batch.venue) || !frustum.intersectsObject(batch.mesh)) continue;
        draws++;
        triangles += batch.trees.length * 2;
        if (batch.venue) venueInView[batch.venue] = true;
      }
      return { draws, triangles, venueInView };
    },
    triangleCount: (id: string) => texture && ids.has(id) ? 2 : 0,
    present(camera: THREE.Camera, detailed: ReadonlySet<string>) {
      if (!texture) return;
      eye.setFromMatrixPosition(camera.matrixWorld);
      if (previousDetail === detailed && previousEye.distanceToSquared(eye) < .0004) return;
      previousDetail = detailed;
      previousEye.copy(eye);
      for (const batch of batches) {
        const { mesh, trees, position, uv } = batch;
        mesh.visible = canShow(batch.venue);
        if (!mesh.visible) continue;
        let index = 0;
        for (const { tree, shape } of trees) {
          if (detailed.has(tree.id)) continue;
          const angle = Math.atan2(eye.x - tree.x, eye.z - tree.z);
          const degrees = (angle - tree.yaw) * atlas.columns / (Math.PI * 2);
          const col = THREE.MathUtils.euclideanModulo(Math.round(degrees), atlas.columns);
          // Keep vertical trunks vertical and turn each capture toward the viewer.
          const halfWidth = shape.width * tree.scale / 2;
          const alongX = Math.cos(angle) * halfWidth, alongZ = -Math.sin(angle) * halfWidth;
          const bottom = tree.y + (shape.centerY - shape.height / 2) * tree.scale;
          const top = tree.y + (shape.centerY + shape.height / 2) * tree.scale;
          const u0 = (col * atlas.tileSize + .5) / atlas.atlasWidth;
          const u1 = ((col + 1) * atlas.tileSize - .5) / atlas.atlasWidth;
          const v0 = 1 - ((shape.row + 1) * atlas.tileSize - .5) / atlas.atlasHeight;
          const v1 = 1 - (shape.row * atlas.tileSize + .5) / atlas.atlasHeight;
          position.setXYZ(index, tree.x - alongX, bottom, tree.z - alongZ);
          position.setXYZ(index + 1, tree.x + alongX, bottom, tree.z + alongZ);
          position.setXYZ(index + 2, tree.x + alongX, top, tree.z + alongZ);
          position.setXYZ(index + 3, tree.x - alongX, top, tree.z - alongZ);
          uv.setXY(index, u0, v0); uv.setXY(index + 1, u1, v0);
          uv.setXY(index + 2, u1, v1); uv.setXY(index + 3, u0, v1);
          index += 4;
        }
        mesh.geometry.setDrawRange(0, index * 3 / 2);
        position.needsUpdate = true;
        uv.needsUpdate = true;
      }
    },
    inspect: () => ({
      ready: !!texture,
      textureBytes: texture ? Math.ceil(atlas.atlasWidth * atlas.atlasHeight * 4 * 4 / 3) : 0,
      visibleTrees: batches.reduce((sum, { mesh }) => sum + (mesh.visible ? mesh.geometry.drawRange.count / 6 : 0), 0),
    }),
    dispose() {
      disposed = true;
      texture?.dispose();
      material.dispose();
      for (const { mesh } of batches) mesh.geometry.dispose();
      root.removeFromParent();
    },
  };
}
