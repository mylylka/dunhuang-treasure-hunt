import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import courtyardProps from '../content/world/courtyard-props.json';
import { TERRAIN_COURTYARD_EXPANSION, terrainCourtyardPartTransform } from '../content/world/terrain-layout-v001';

export interface TerrainCourtyardExpansionReport { movedParts: string[]; pavingMeshes: number; addedWidth: number }

/** Exact bounds in the GLB root's coordinates, independent of the root placement. */
function localBounds(root: THREE.Object3D, object: THREE.Object3D) {
  const bounds = new THREE.Box3(), inverse = root.matrixWorld.clone().invert();
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.computeBoundingBox();
    const box = child.geometry.boundingBox!, matrix = inverse.clone().multiply(child.matrixWorld);
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z])
      bounds.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(matrix));
  });
  return bounds;
}

/** Call once after loading courtyard v002, before attachment grounding/region parenting.
 * Only this terrain instance changes. Original vertex data, texture UVs and main hall
 * stay intact. New paving joins the GLB root and is owned by releaseModel(root).
 */
export function applyTerrainCourtyardExpansion(root: THREE.Object3D): TerrainCourtyardExpansionReport {
  const previous = root.userData.terrainCourtyardExpansionV003 as TerrainCourtyardExpansionReport | undefined;
  if (previous) return previous;
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(), changed = new Set<THREE.Object3D>();
  const report: TerrainCourtyardExpansionReport = { movedParts: [], pavingMeshes: 0, addedWidth: 4 };
  const pavingMaterials = new Set<THREE.Material>();
  root.traverse(object => {
    const id = String(object.userData.semanticGroup ?? '');
    if (id === 'courtyard-paving') object.traverse(child => {
      if (child instanceof THREE.Mesh) for (const material of Array.isArray(child.material) ? child.material : [child.material]) pavingMaterials.add(material);
    });
    if (!id) return;
    for (let ancestor = object.parent; ancestor && ancestor !== root; ancestor = ancestor.parent) if (changed.has(ancestor)) return;
    const box = localBounds(root, object);
    if (box.isEmpty()) return;
    const centerX = (box.min.x + box.max.x) / 2 - 12;
    let transform = terrainCourtyardPartTransform(id, centerX);
    const target = TERRAIN_COURTYARD_EXPANSION.attachedProps[id as keyof typeof TERRAIN_COURTYARD_EXPANSION.attachedProps];
    if (target) {
      const original = courtyardProps.props.find(prop => prop.id === id)!;
      transform = { scaleX: 1, offsetX: target.x - original.x };
    }
    if (!transform || !object.parent) return;
    // Config is in source world X; the baked GLB root is source (-12, 0, 2).
    const affine = new THREE.Matrix4().makeScale(transform.scaleX, 1, 1);
    affine.setPosition(transform.offsetX + 12 * (1 - transform.scaleX), 0, 0);
    const parentToRoot = inverse.clone().multiply(object.parent.matrixWorld);
    object.applyMatrix4(parentToRoot.clone().invert().multiply(affine).multiply(parentToRoot));
    changed.add(object); report.movedParts.push(id);
  });

  // Keep every original paving stone at its original size. Two new side strips
  // reuse the three accepted paving materials; small grout remains visible.
  const materials = [...pavingMaterials];
  if (!materials.length) throw new Error('courtyard-paving-material-missing');
  const batches = materials.map(() => [] as THREE.BufferGeometry[]);
  const strips = [[-11.75, -10.07], [9.77, 11.75]];
  for (let side = 0; side < strips.length; side++) {
    const [left, right] = strips[side], width = (right - left - .04) / 2;
    for (let row = 0; row < 21; row++) for (let col = 0; col < 2; col++) {
      const tile = new THREE.BoxGeometry(width, .012, 1.105);
      tile.translate(left + width / 2 + col * (width + .04), -.003, - .95 - row * 1.15);
      batches[(row * 2 + col + side) % materials.length].push(tile);
    }
  }
  batches.forEach((pieces, index) => {
    if (!pieces.length) return;
    const geometry = mergeGeometries(pieces, false);
    for (const piece of pieces) piece.dispose();
    const mesh = new THREE.Mesh(geometry, materials[index]);
    mesh.name = `terrain-courtyard-side-paving-${index}`;
    mesh.userData.semanticGroup = mesh.name; mesh.userData.cameraRole = 'decoration';
    mesh.castShadow = true; mesh.receiveShadow = true;
    root.add(mesh); report.pavingMeshes++;
  });
  root.userData.terrainCourtyardExpansionV003 = report;
  root.updateWorldMatrix(true, true);
  return report;
}
