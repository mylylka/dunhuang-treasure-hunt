import * as THREE from 'three';

// The 18 balusters and two horizontal members share one imported wood mesh.
// Coordinates are metres in the music-pavilion root, not scene/world axes.
export const MUSIC_BALCONY_FRONT_RAIL = {
  minX: 34.75, maxX: 44.49, minZ: -17.76, maxZ: -17.62,
  floorY: 7.915375, maxY: 9.31, heightScale: .5,
  meshName: 'porch--wood-light.001',
} as const;

/** Shorten the front balusters and top rail, removing the lower timber rail.
 *  The original asset and its collision/navigation geometry are untouched. */
export function applyMusicBalconyRail(root: THREE.Object3D) {
  const c = MUSIC_BALCONY_FRONT_RAIL;
  // GLTFLoader strips dots from node names when creating animation-safe names.
  const target = root.getObjectByName(c.meshName) ?? root.getObjectByName('porch--wood-light001');
  if (!(target instanceof THREE.Mesh) || !(target.geometry instanceof THREE.BufferGeometry)) {
    throw new Error('music-balcony-front-rail-mesh-missing');
  }
  const original = target.geometry;
  const position = original.getAttribute('position');
  const normal = original.getAttribute('normal');
  const index = original.getIndex();
  if (!position || !index || original.groups.length) throw new Error('music-balcony-front-rail-geometry-unexpected');
  root.updateWorldMatrix(true, true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(target.matrixWorld);
  const fromRoot = toRoot.clone().invert();
  const toRootNormal = new THREE.Matrix3().getNormalMatrix(toRoot);
  const fromRootNormal = new THREE.Matrix3().getNormalMatrix(fromRoot);
  const vertices: THREE.Vector3[] = [];
  for (let i = 0; i < position.count; i++) vertices.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(toRoot));
  const inside = (v: THREE.Vector3) => v.x >= c.minX && v.x <= c.maxX && v.y >= c.floorY - .01 && v.y <= c.maxY && v.z >= c.minZ && v.z <= c.maxZ;
  const key = (v: THREE.Vector3) => `${Math.round(v.x * 10000)},${Math.round(v.y * 10000)},${Math.round(v.z * 10000)}`;
  // GLTF duplicates vertices for normals/UV. Weld by position for component
  // classification, otherwise post end-caps can be mistaken for rails.
  const parents = new Map<string, string>();
  function find(k: string): string {
    const p = parents.get(k);
    if (!p) { parents.set(k, k); return k; }
    if (p === k) return k;
    const r = find(p); parents.set(k, r); return r;
  }
  function union(a: string, b: string) { parents.set(find(a), find(b)); }
  const selected: { offset: number; ids: [number, number, number]; keys: [string, string, string] }[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const ids: [number, number, number] = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    if (!ids.every(id => inside(vertices[id]))) continue;
    const keys: [string, string, string] = ids.map(id => key(vertices[id])) as [string, string, string];
    union(keys[0], keys[1]); union(keys[0], keys[2]); selected.push({ offset: i, ids, keys });
  }
  const components = new Map<string, { bounds: THREE.Box3; offsets: number[]; ids: Set<number> }>();
  for (const triangle of selected) {
    const id = find(triangle.keys[0]);
    let component = components.get(id);
    if (!component) { component = { bounds: new THREE.Box3(), offsets: [], ids: new Set() }; components.set(id, component); }
    component.offsets.push(triangle.offset);
    for (const vertex of triangle.ids) { component.ids.add(vertex); component.bounds.expandByPoint(vertices[vertex]); }
  }
  const beams: typeof components extends Map<string, infer T> ? T[] : never = [];
  const posts: typeof components extends Map<string, infer T> ? T[] : never = [];
  for (const component of components.values()) {
    const size = component.bounds.getSize(new THREE.Vector3());
    if (size.x > 5 && size.y < .2) beams.push(component);
    else if (size.x < .11 && size.y > 1) posts.push(component);
  }
  if (beams.length !== 2 || posts.length !== 18) throw new Error(`music-balcony-front-rail-components-unexpected: ${beams.length}/${posts.length}`);
  beams.sort((a, b) => a.bounds.min.y - b.bounds.min.y);
  const [lowerBeam, upperBeam] = beams;
  const remove = new Set(lowerBeam.offsets);
  const revised = original.clone();
  const revisedPosition = revised.getAttribute('position');
  const revisedNormal = revised.getAttribute('normal');
  const altered = new Set([...posts, upperBeam].flatMap(component => [...component.ids]));
  for (const i of altered) {
    const v = vertices[i].clone();
    v.y = c.floorY + (v.y - c.floorY) * c.heightScale;
    v.applyMatrix4(fromRoot);
    revisedPosition.setXYZ(i, v.x, v.y, v.z);
    if (normal && revisedNormal) {
      const n = new THREE.Vector3().fromBufferAttribute(normal, i).applyMatrix3(toRootNormal);
      n.y /= c.heightScale;
      n.applyMatrix3(fromRootNormal).normalize();
      revisedNormal.setXYZ(i, n.x, n.y, n.z);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    if (!remove.has(i)) indices.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  }
  revised.setIndex(indices);
  revisedPosition.needsUpdate = true;
  if (revisedNormal) revisedNormal.needsUpdate = true;
  revised.computeBoundingBox(); revised.computeBoundingSphere();

  // The gallery's east return is in two separate, shared guardrail meshes.
  // Remove only triangles wholly inside its measured volume, leaving the
  // adjoining staircase guardrails and the actual navigation barriers intact.
  const sideNames = ['music-interior-guardrail--music-decor-cinnabar', 'music-interior-guardrail--music-decor-wood'];
  const sideRevisions: { mesh: THREE.Mesh; original: THREE.BufferGeometry; revised: THREE.BufferGeometry }[] = [];
  for (const name of sideNames) {
    const mesh = root.getObjectByName(name);
    if (!(mesh instanceof THREE.Mesh) || !(mesh.geometry instanceof THREE.BufferGeometry)) {
      revised.dispose(); sideRevisions.forEach(item => item.revised.dispose());
      throw new Error(`music-balcony-side-rail-mesh-missing: ${name}`);
    }
    const geometry = mesh.geometry, attr = geometry.getAttribute('position'), idx = geometry.getIndex();
    if (!attr || !idx || geometry.groups.length) {
      revised.dispose(); sideRevisions.forEach(item => item.revised.dispose());
      throw new Error('music-balcony-side-rail-geometry-unexpected');
    }
    const matrix = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);
    const pts = Array.from({ length: attr.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(attr, i).applyMatrix4(matrix));
    const within = (v: THREE.Vector3) => v.x >= 44.680 && v.x <= 44.790 && v.y >= c.floorY - .01 && v.y <= 9 && v.z >= -21.95 && v.z <= -17.64;
    const keep: number[] = []; let removed = 0;
    for (let i = 0; i < idx.count; i += 3) {
      const ids = [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)];
      if (ids.every(id => within(pts[id]))) removed++;
      else keep.push(...ids);
    }
    if (removed < 100) {
      revised.dispose(); sideRevisions.forEach(item => item.revised.dispose());
      throw new Error(`music-balcony-side-rail-triangles-unexpected: ${name}/${removed}`);
    }
    const newGeometry = geometry.clone(); newGeometry.setIndex(keep);
    newGeometry.computeBoundingBox(); newGeometry.computeBoundingSphere();
    sideRevisions.push({ mesh, original: geometry, revised: newGeometry });
  }

  const postHeight = (9.253 - c.floorY) * c.heightScale;
  const sideGeometry = new THREE.BoxGeometry(.075, postHeight, .075);
  const sideGroup = new THREE.Group(); sideGroup.name = 'music-balcony-short-side-pickets';
  // Match the existing front balusters rather than the darker stair railing.
  const sidePosts = new THREE.InstancedMesh(sideGeometry, target.material, 10);
  sidePosts.name = 'music-balcony-side-pickets'; sidePosts.castShadow = true; sidePosts.receiveShadow = true;
  sidePosts.raycast = () => {};
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < 9; i++) {
    matrix.makeTranslation(44.7351, c.floorY + postHeight / 2, -21.895 + i * (4.205 / 8));
    sidePosts.setMatrixAt(i, matrix);
  }
  // A short return finishes the front edge at the side rather than leaving a gap.
  matrix.makeTranslation(44.53, c.floorY + postHeight / 2, -17.69);
  sidePosts.setMatrixAt(9, matrix);
  sidePosts.instanceMatrix.needsUpdate = true; sideGroup.add(sidePosts);

  // Restore one slender top rail along the return and join it to the now
  // shortened original front top rail at the corner. No lower rail is added.
  const beamTop = c.floorY + (upperBeam.bounds.max.y - c.floorY) * c.heightScale;
  const beamHeight = (upperBeam.bounds.max.y - upperBeam.bounds.min.y) * c.heightScale;
  const sideBeamGeometry = new THREE.BoxGeometry(.09, beamHeight, 4.29);
  const sideBeam = new THREE.Mesh(sideBeamGeometry, target.material);
  sideBeam.name = 'music-balcony-side-upper-rail';
  sideBeam.position.set(44.7351, beamTop - beamHeight / 2, (-21.94 - 17.65) / 2);
  sideBeam.castShadow = true; sideBeam.receiveShadow = true; sideBeam.raycast = () => {};
  sideGroup.add(sideBeam);
  const connectorGeometry = new THREE.BoxGeometry(44.7351 - 44.4775, beamHeight, .12);
  const connector = new THREE.Mesh(connectorGeometry, target.material);
  connector.name = 'music-balcony-front-upper-rail-corner';
  connector.position.set((44.7351 + 44.4775) / 2, beamTop - beamHeight / 2, -17.69);
  connector.castShadow = true; connector.receiveShadow = true; connector.raycast = () => {};
  sideGroup.add(connector); root.add(sideGroup);
  target.geometry = revised;
  for (const item of sideRevisions) item.mesh.geometry = item.revised;
  let disposed = false;
  return {
    group: sideGroup,
    inspect: () => ({ posts: posts.length, removedLowerRails: 1, retainedUpperRails: 2, sidePosts: sidePosts.count, heightScale: c.heightScale, postHeight }),
    dispose() {
      if (disposed) return;
      disposed = true;
      if (target.geometry === revised) target.geometry = original;
      for (const item of sideRevisions) {
        if (item.mesh.geometry === item.revised) item.mesh.geometry = item.original;
        item.revised.dispose();
      }
      sideGroup.removeFromParent(); sideGroup.clear(); sideGeometry.dispose(); sideBeamGeometry.dispose(); connectorGeometry.dispose();
      revised.dispose();
    },
  };
}
