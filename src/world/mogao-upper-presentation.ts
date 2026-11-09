import * as THREE from 'three';

/** GLTFLoader strips the dot from Blender's duplicate suffix (rail.001 → rail001). */
export const isUpperRailing = (name: string) => /(?:^|-)rail(?=[._-]|\d|$)/.test(name);

/** Remove the A room's engineering mockup while retaining its viewing-way sign. */
export const isUpperHallAGrayboxMarker = (name: string) =>
  /^hall-a-(?:mural-panel|placeholder-label|hall-label|bottom-label|height-dimension|panel-dimension(?:[._]?\d{3})?)$/.test(name);

export function fitMogaoExhibitEntranceMeshes(root: THREE.Object3D) {
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry;
    if (/^[ab]-vault-ceiling-south-\d+$/.test(object.name)) {
      const { index } = geometry;
      if (!index) return;
      const positions = geometry.getAttribute('position');
      geometry.computeBoundingBox();
      const back = geometry.boundingBox!.min.z;
      // These caps are completely covered by the south wall. Keep the
      // sloping ceiling and remove the triangles on the outer wall plane.
      const visible: number[] = [];
      for (let i = 0; i < index.count; i += 3) {
        const triangle = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
        if (!triangle.every(vertex => Math.abs(positions.getZ(vertex) - back) < .0001)) visible.push(...triangle);
      }
      geometry.setIndex(visible);
    }
  });

  const canopy = root.getObjectByName('stair-top-ceiling');
  const lintel = root.getObjectByName('b-south-lintel');
  if (!(canopy instanceof THREE.Mesh) || !(lintel instanceof THREE.Mesh)) return;
  canopy.geometry.computeBoundingBox();
  lintel.geometry.computeBoundingBox();
  const roofBounds = canopy.geometry.boundingBox!;
  const lintelBounds = lintel.geometry.boundingBox!;
  // Recess the end cap behind both jambs and close the gap with the lintel
  // itself. The old thin backing surface intersected the two visible edges.
  const trim = .018 / (roofBounds.max.z - roofBounds.min.z);
  canopy.position.z += roofBounds.min.z * trim;
  canopy.scale.z -= trim;
  const roofTop = canopy.position.y + roofBounds.max.y * canopy.scale.y;
  const lintelBottom = lintel.position.y + lintelBounds.min.y * lintel.scale.y;
  const extension = (lintelBottom - roofTop + .006) / (lintelBounds.max.y - lintelBounds.min.y);
  lintel.position.y -= lintelBounds.max.y * extension;
  lintel.scale.y += extension;
}

// The C wall is x=14.80. Keep the original ceiling inside the viewing
// passage, and replace only its 0.90 m room-side projection with a slim lip.
export const MOGAO_EXHIBIT_VIEW_LINTEL = {
  passage: { min: [14, 22.68, -14.25], max: [14.8, 22.88, -10.7] },
  lip: { min: [14.8, 22.78, -14.25], max: [14.94, 22.88, -10.7] },
} as const;

export function trimMogaoExhibitViewLintel(root: THREE.Object3D) {
  const original = root.getObjectByName('b-view-ceiling');
  if (!(original instanceof THREE.Mesh) || !original.parent) return;
  const parent = original.parent;
  original.geometry.computeBoundingBox();
  const source = original.geometry.boundingBox;
  if (!source || source.isEmpty()) return;
  const originalSize = source.getSize(new THREE.Vector3());
  if (originalSize.x <= 0 || originalSize.y <= 0 || originalSize.z <= 0) return;
  const originalCenter = source.getCenter(new THREE.Vector3());
  function fit(mesh: THREE.Mesh, part: (typeof MOGAO_EXHIBIT_VIEW_LINTEL)[keyof typeof MOGAO_EXHIBIT_VIEW_LINTEL]) {
    const bounds = new THREE.Box3(new THREE.Vector3(...part.min), new THREE.Vector3(...part.max));
    mesh.scale.copy(bounds.getSize(new THREE.Vector3()).divide(originalSize));
    mesh.position.copy(bounds.getCenter(new THREE.Vector3())).sub(originalCenter.clone().multiply(mesh.scale));
  }
  const lip = original.clone();
  lip.name = 'b-view-ceiling-exhibit-lip';
  fit(original, MOGAO_EXHIBIT_VIEW_LINTEL.passage);
  fit(lip, MOGAO_EXHIBIT_VIEW_LINTEL.lip);
  parent.add(lip);
}
