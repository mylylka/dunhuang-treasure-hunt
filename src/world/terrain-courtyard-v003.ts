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

/** The hall's millimetre bevels put nearly vertical faces into subpixel joints.
 * Use one shadow-receiving surface with filtered joints and the authored tile colours.
 */
export function applyFirstGalleryHallPaving(root: THREE.Object3D): void {
  const batches = ['a', 'b', 'c'].map(suffix => root.getObjectByName(`hall-v003-paving-${suffix}`));
  const platform = root.getObjectByName('hall-v003-platform');
  if (!platform || batches.some(batch => !(batch instanceof THREE.Mesh) || !(batch.material instanceof THREE.MeshStandardMaterial))) return;
  const tiles = batches as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[];
  const tileCount = 13;
  const cellsPerTexture = 3;
  const pixelsPerCell = 128;
  const size = cellsPerTexture * pixelsPerCell;
  const bounds = localBounds(root, platform);
  const width = bounds.max.x - bounds.min.x, depth = bounds.max.z - bounds.min.z;
  const y = localBounds(root, tiles[0]).max.y;
  const halfJoint = .013 / (width / tileCount) * pixelsPerCell;
  const grout = tiles[0].material.color.clone().multiplyScalar(.84);
  const colors = [...tiles.map(tile => tile.material.color), grout].map(color =>
    color.clone().convertLinearToSRGB().toArray().map(channel => Math.round(channel * 255)));
  const data = new Uint8Array(size * size * 4);
  for (let v = 0; v < size; v++) for (let u = 0; u < size; u++) {
    const column = Math.floor(u / pixelsPerCell), row = (3 - Math.floor(v / pixelsPerCell)) % 3;
    const x = (u + .5) % pixelsPerCell, z = (v + .5) % pixelsPerCell;
    const joint = Math.min(x, z, pixelsPerCell - x, pixelsPerCell - z) <= halfJoint;
    const color = colors[joint ? 3 : (row + 2 * column) % 3];
    const index = (v * size + u) * 4;
    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
    data[index + 3] = 255;
  }
  const map = new THREE.DataTexture(data, size, size);
  map.name = 'first-gallery-hall-stone-joints';
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.setScalar(tileCount / cellsPerTexture);
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.anisotropy = 8;
  map.needsUpdate = true;
  const material = tiles[0].material.clone();
  material.color.set(0xffffff);
  material.map = map;
  const geometry = new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2);
  const paving = new THREE.Mesh(geometry, material);
  paving.name = 'first-gallery-hall-stone-surface';
  paving.position.set((bounds.min.x + bounds.max.x) / 2, y, (bounds.min.z + bounds.max.z) / 2);
  paving.receiveShadow = true;
  for (const tile of tiles) {
    tile.visible = false;
    tile.castShadow = false;
  }
  root.add(paving);
}

/** The v007 front and side trims occupy the same top faces at each corner.
 * Shorten only the hidden end of the side trim, leaving the front trim and
 * its visible silhouette in place. Geometry is cloned for this instance.
 */
function removeOverlappingCornerTrim(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const byId = new Map<string, THREE.Object3D>();
  root.traverse(object => {
    const id = String(object.userData.semanticGroup ?? '');
    if (/^courtyard-v005-(side|wing)-(coping|plinth)-(east|west)$/.test(id)) byId.set(id, object);
  });
  for (const kind of ['coping', 'plinth']) for (const side of ['east', 'west']) {
    const part = byId.get(`courtyard-v005-side-${kind}-${side}`);
    const wing = byId.get(`courtyard-v005-wing-${kind}-${side}`);
    if (!part || !wing) continue;
    const cutZ = localBounds(root, wing).min.z;
    part.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const toRoot = root.matrixWorld.clone().invert().multiply(object.matrixWorld);
      // These source parts are axis-aligned. Do not modify unrelated geometry.
      const e = toRoot.elements;
      if (Math.abs(e[2]) > 1e-6 || Math.abs(e[6]) > 1e-6 || Math.abs(e[8]) > 1e-6 || Math.abs(e[9]) > 1e-6 || e[10] <= 0) return;
      const geometry = object.geometry.clone(), position = geometry.getAttribute('position');
      const limit = (cutZ - e[14]) / e[10];
      for (let i = 0; i < position.count; i++) if (position.getZ(i) > limit) position.setZ(i, limit);
      position.needsUpdate = true;
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      object.geometry = geometry;
    });
  }
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

  removeOverlappingCornerTrim(root);

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
