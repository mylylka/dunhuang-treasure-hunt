import * as THREE from 'three';
import { DESERT_DECORATION_OVERLOOK } from '../content/world/desert-decoration-overlook-v002';
import { LAYERED_ROCK_OVERLOOK } from '../content/world/desert-decoration-layered-rock-v006';
import { ROCK_SHRUB_3_OVERLOOK } from '../content/world/desert-decoration-rock-shrub-v005';
import { SHRUB_1_OVERLOOK } from '../content/world/desert-decoration-shrub-v006';
import { SMALL_TREE_2_OVERLOOK } from '../content/world/desert-decoration-small-tree-v004';
import { TERRAIN_REGIONS, terrainHeight, toTerrainPoint } from '../content/world/terrain-layout-v001';
import { TERRAIN_TOWER_TREES } from '../content/world/terrain-trees-v001';
import type { DesertDecorationPlacement } from './desert-decoration-placement';
import { createDesertTreeImpostors, isDesertImpostorTree } from './desert-tree-impostors';

export type DesertVenueVisibility = Readonly<{ music: boolean; cliff: boolean; cliffTreesDetailed?: boolean }>;

const towerTrees = TERRAIN_TOWER_TREES.map(({ id, placement }) => {
  const { x, z } = toTerrainPoint('cliff', placement);
  return { id, x, y: terrainHeight(x, z), z, yaw: TERRAIN_REGIONS.cliff.yaw + placement.yaw,
    assetId: id, venue: 'cliff', scale: 1 } as const;
});
export const desertOverlookTowerTreeIds = towerTrees.map(tree => tree.id);

export function visibleAtVenue(venue: DesertDecorationPlacement['venue'], visibility: DesertVenueVisibility) {
  return venue === undefined || visibility[venue];
}

export function desertDecorationShape(assetId: DesertDecorationPlacement['assetId'], composition: boolean) {
  if (assetId === 'shrub-1') return SHRUB_1_OVERLOOK;
  if (assetId === 'small-tree-2') return SMALL_TREE_2_OVERLOOK;
  if (composition && assetId === 'r02') return LAYERED_ROCK_OVERLOOK;
  if (composition && assetId === 'rock-shrub-3') return ROCK_SHRUB_3_OVERLOOK;
  return DESERT_DECORATION_OVERLOOK[assetId];
}

export function createDesertDecorationOverlook(placements: readonly DesertDecorationPlacement[], composition: boolean, includeLandmarks = true) {
  const root = new THREE.Group();
  root.name = 'desert-overlook';
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, side: THREE.DoubleSide });
  const trees = createDesertTreeImpostors(includeLandmarks ? [...placements, ...towerTrees] : placements);
  root.add(trees.root);
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const point = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const batches = ([undefined, 'music', 'cliff'] as const).flatMap(venue => {
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const ranges = new Map<string, { start: number; count: number }>();
    for (const item of placements) {
      if (item.venue !== venue || isDesertImpostorTree(item.assetId)) continue;
      const shape = desertDecorationShape(item.assetId, composition);
      const vertexStart = positions.length / 3;
      ranges.set(item.id, { start: indices.length, count: shape.indices.length });
      rotation.setFromEuler(euler.set(item.pitch ?? 0, item.yaw, item.roll ?? 0));
      for (let i = 0; i < shape.positions.length; i += 3) {
        point.fromArray(shape.positions, i).multiplyScalar(item.scale).applyQuaternion(rotation);
        positions.push(item.x + point.x, item.y + point.y, item.z + point.z);
      }
      for (const value of shape.colors) colors.push(value);
      for (const index of shape.indices) indices.push(vertexStart + index);
    }
    if (!indices.length) return [];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const index = positions.length / 3 > 65_535 ? new Uint32Array(indices) : new Uint16Array(indices);
    const indexAttribute = new THREE.BufferAttribute(index, 1).setUsage(THREE.DynamicDrawUsage);
    geometry.setIndex(indexAttribute);
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `desert-overlook-${venue ?? 'landscape'}`;
    mesh.matrixAutoUpdate = false;
    mesh.receiveShadow = true;
    mesh.raycast = () => {};
    root.add(mesh);
    return [{ venue, mesh, indexAttribute, ranges, indices: index.slice() }];
  });
  let previousDetailed: ReadonlySet<string> = new Set();

  return {
    root,
    prepare: trees.prepare,
    inspectTrees: trees.inspect,
    setVenueVisibility(visibility: DesertVenueVisibility) {
      for (const batch of batches) batch.mesh.visible = visibleAtVenue(batch.venue, visibility);
      trees.setVenueVisibility(visibility);
    },
    cost(frustum: THREE.Frustum) {
      let { draws, triangles, venueInView } = trees.cost(frustum);
      for (const batch of batches) {
        if (!batch.mesh.visible || !frustum.intersectsObject(batch.mesh)) continue;
        draws++;
        if (batch.venue) venueInView[batch.venue] = true;
        triangles += batch.indices.length / 3;
      }
      return { draws, triangles, venueInView };
    },
    triangleCount(id: string) {
      for (const batch of batches) {
        const range = batch.ranges.get(id);
        if (range) return range.count / 3;
      }
      return trees.triangleCount(id);
    },
    showDetail(detailed: ReadonlySet<string>, camera: THREE.Camera) {
      const unchanged = detailed.size === previousDetailed.size && [...detailed].every(id => previousDetailed.has(id));
      if (unchanged) {
        trees.present(camera, previousDetailed);
        return;
      }
      for (const { mesh, indexAttribute, ranges, indices } of batches) {
        let writeAt = 0;
        for (const [id, { start, count }] of ranges) {
          if (detailed.has(id)) continue;
          indexAttribute.array.set(indices.subarray(start, start + count), writeAt);
          writeAt += count;
        }
        mesh.geometry.setDrawRange(0, writeAt);
        indexAttribute.clearUpdateRanges();
        if (writeAt > 0) indexAttribute.addUpdateRange(0, writeAt);
        indexAttribute.needsUpdate = true;
      }
      previousDetailed = detailed;
      trees.present(camera, detailed);
    },
    dispose() {
      for (const { mesh } of batches) mesh.geometry.dispose();
      material.dispose();
      trees.dispose();
      root.removeFromParent();
    },
  };
}
