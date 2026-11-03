import * as THREE from 'three';
import { TERRAIN_TOWER_TREES } from '../content/world/terrain-trees-v001';
import { TERRAIN_REGIONS, terrainHeight, toTerrainPoint } from '../content/world/terrain-layout-v001';

export interface PlacedTerrainTree {
  id: string;
  object: THREE.Group;
  meshes: THREE.Mesh[];
  baseY: number;
  height: number;
  cameraRadius: number;
  worldBounds: THREE.Box3;
}

/** Placement only. The existing GLB owner retains all GPU resource ownership. */
export function placeTerrainTowerTrees(models: readonly THREE.Object3D[]) {
  if (models.length !== TERRAIN_TOWER_TREES.length) {
    throw new Error('Two supplied tower-tree models are required, in configuration order.');
  }
  const root = new THREE.Group();
  root.name = 'terrain-tower-trees-v001';
  const trees: PlacedTerrainTree[] = [];
  const originalTransforms = models.map(model => ({
    position: model.position.clone(), quaternion: model.quaternion.clone(), scale: model.scale.clone(),
  }));
  for (const [index, definition] of TERRAIN_TOWER_TREES.entries()) {
    const model = models[index];
    // Precise bounds avoid lifting a model because of empty rotated-box corners.
    model.updateWorldMatrix(true, true);
    const sourceBounds = new THREE.Box3().setFromObject(model, true);
    const sourceSize = sourceBounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(sourceSize.y) || sourceSize.y <= 0) {
      throw new Error(`Invalid tree height: ${definition.id}`);
    }
    const center = sourceBounds.getCenter(new THREE.Vector3());
    const normalization = new THREE.Group();
    normalization.name = `${definition.id}-normalization`;
    normalization.position.set(-center.x, -sourceBounds.min.y, -center.z);
    normalization.add(model);
    const wrapper = new THREE.Group();
    wrapper.name = definition.id;
    wrapper.scale.setScalar(definition.placement.height / sourceSize.y);
    wrapper.add(normalization);
    const position = toTerrainPoint('cliff', definition.placement);
    const baseY = terrainHeight(position.x, position.z);
    wrapper.position.set(position.x, baseY, position.z);
    wrapper.rotation.y = TERRAIN_REGIONS.cliff.yaw + definition.placement.yaw;
    const meshes: THREE.Mesh[] = [];
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      meshes.push(object);
    });
    wrapper.userData = { sourceAsset: definition.assetPath, targetHeight: definition.placement.height };
    root.add(wrapper);
    wrapper.updateWorldMatrix(true, true);
    const worldBounds = new THREE.Box3().setFromObject(wrapper, true);
    trees.push({
      id: definition.id, object: wrapper, meshes, baseY,
      height: worldBounds.max.y - worldBounds.min.y,
      cameraRadius: definition.collisionRadii.camera, worldBounds,
    });
  }
  let disposed = false;
  return {
    root,
    trees,
    inspect: () => trees.map(tree => ({
      id: tree.id, baseY: tree.baseY, height: tree.height,
      position: tree.object.position.toArray(),
      worldBounds: { min: tree.worldBounds.min.toArray(), max: tree.worldBounds.max.toArray() },
    })),
    dispose() {
      if (disposed) return;
      disposed = true;
      // No geometry, texture or material disposal here: art-sample owns them.
      for (const [index, model] of models.entries()) {
        model.removeFromParent();
        model.position.copy(originalTransforms[index].position);
        model.quaternion.copy(originalTransforms[index].quaternion);
        model.scale.copy(originalTransforms[index].scale);
      }
      root.removeFromParent();
      root.clear();
    },
  };
}
