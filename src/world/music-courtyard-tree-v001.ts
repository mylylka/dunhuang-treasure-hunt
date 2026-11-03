import * as THREE from 'three';
import { MUSIC_COURTYARD_RELOCATIONS, MUSIC_COURTYARD_TREE, relocatedMusicPoint } from '../content/world/music-courtyard-tree-v001';
import { TERRAIN_REGIONS, toTerrainPoint } from '../content/world/terrain-layout-v001';

/** Existing art-sample loader owns the GLB's geometry, materials and textures. */
export function placeMusicCourtyardTree(model: THREE.Object3D) {
  const definition = MUSIC_COURTYARD_TREE;
  const root = new THREE.Group(); root.name = definition.id;
  const normalization = new THREE.Group();
  normalization.position.set(-definition.rootAnchor.x, 0, -definition.rootAnchor.z);
  normalization.add(model); root.add(normalization);
  root.scale.setScalar(definition.placement.height / definition.sourceHeight);
  const p = toTerrainPoint('music', definition.placement);
  root.position.set(p.x, p.y, p.z);
  root.rotation.y = TERRAIN_REGIONS.music.yaw + definition.placement.yaw;
  const meshes: THREE.Mesh[] = [];
  model.traverse(object => {
    if (object instanceof THREE.Mesh) { object.castShadow = object.receiveShadow = true; meshes.push(object); }
  });
  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root, true);
  return {
    root, meshes, worldBounds: bounds,
    inspect: () => ({ id: definition.id, height: bounds.max.y - bounds.min.y,
      position: root.position.toArray(), worldBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } }),
    dispose() { model.removeFromParent(); root.removeFromParent(); root.clear(); },
  };
}

/** Move complete furniture components inside their material batches.
 * Coordinates are measured in the original music layout, independent of any
 * parent terrain transform. Only the fresh loaded instance is edited.
 */
export function relocateMusicCourtyardFurnishings(pavilion: THREE.Object3D) {
  pavilion.updateWorldMatrix(true, true);
  const inverseRoot = pavilion.matrixWorld.clone().invert();
  const restores: { mesh: THREE.Mesh; position: Float32Array; normal: Float32Array | null }[] = [];
  const counts: Record<string, number> = Object.fromEntries(MUSIC_COURTYARD_RELOCATIONS.map(item => [item.id, 0]));
  pavilion.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const group = String(object.userData.semanticGroup ?? '');
    if (group !== 'high-drapery' && group !== 'workshop-furnishings') return;
    const geometry = object.geometry;
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const toModel = inverseRoot.clone().multiply(object.matrixWorld), toLocal = toModel.clone().invert();
    const normalToModel = new THREE.Matrix3().getNormalMatrix(toModel), normalToLocal = normalToModel.clone().invert();
    const choices: number[] = [];
    const p = new THREE.Vector3();
    for (let index = 0; index < positions.count; index++) {
      p.fromBufferAttribute(positions, index).applyMatrix4(toModel); p.x += 46; p.z -= 9;
      choices.push(MUSIC_COURTYARD_RELOCATIONS.findIndex(item => p.x >= item.sourceMin[0] && p.x <= item.sourceMax[0]
        && p.y >= item.sourceMin[1] && p.y <= item.sourceMax[1] && p.z >= item.sourceMin[2] && p.z <= item.sourceMax[2]));
    }
    if (!choices.some(index => index >= 0)) return;
    // A relocation must never cut a triangle or stretch a connected component.
    const index = geometry.index;
    for (let triangle = 0; triangle < (index?.count ?? positions.count); triangle += 3) {
      const ids = [0, 1, 2].map(offset => choices[index ? index.getX(triangle + offset) : triangle + offset]);
      if (ids[0] !== ids[1] || ids[0] !== ids[2]) throw new Error(`Furniture relocation cuts a triangle in ${object.name}`);
    }
    restores.push({ mesh: object, position: new Float32Array(positions.array), normal: normals ? new Float32Array(normals.array) : null });
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const selection = choices[vertex]; if (selection < 0) continue;
      const relocation = MUSIC_COURTYARD_RELOCATIONS[selection];
      p.fromBufferAttribute(positions, vertex).applyMatrix4(toModel); p.x += 46; p.z -= 9;
      const next = relocatedMusicPoint(p, relocation);
      p.set(next.x - 46, p.y, next.z + 9).applyMatrix4(toLocal); positions.setXYZ(vertex, p.x, p.y, p.z);
      if (normals && relocation.yaw) {
        p.fromBufferAttribute(normals, vertex).applyMatrix3(normalToModel).normalize();
        p.applyAxisAngle(THREE.Object3D.DEFAULT_UP, relocation.yaw).applyMatrix3(normalToLocal).normalize(); normals.setXYZ(vertex, p.x, p.y, p.z);
      }
      counts[relocation.id]++;
    }
    positions.needsUpdate = true; if (normals) normals.needsUpdate = true;
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  });
  let disposed = false;
  return {
    inspect: () => ({ movedVertices: { ...counts }, changedMeshes: restores.length }),
    dispose() {
      if (disposed) return; disposed = true;
      for (const item of restores) {
        const positions = item.mesh.geometry.getAttribute('position'); positions.array.set(item.position); positions.needsUpdate = true;
        const normals = item.mesh.geometry.getAttribute('normal'); if (normals && item.normal) { normals.array.set(item.normal); normals.needsUpdate = true; }
        item.mesh.geometry.computeBoundingBox(); item.mesh.geometry.computeBoundingSphere();
      }
    },
  };
}
