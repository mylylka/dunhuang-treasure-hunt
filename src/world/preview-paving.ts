import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COURTYARD_ROAD } from './road';

/** Paving follows the accepted road ribbon; large irregular slabs, not gravel. */
export function createPreviewPaving() {
  const group = new THREE.Group(); group.name = 'preview-only-stone-paving';
  const materials = ['#c6b498', '#d1bea0', '#bcaa8d', '#d8c7a9'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  let distance = 0, stone = 0;
  for (let index = 1; index < COURTYARD_ROAD.length; index++) {
    const a = COURTYARD_ROAD[index - 1], b = COURTYARD_ROAD[index];
    distance += Math.hypot(b.center.x - a.center.x, b.center.z - a.center.z);
    if (distance < .95 || b.center.z < 3) continue;
    distance = 0;
    const angle = Math.atan2(b.center.x - a.center.x, b.center.z - a.center.z);
    for (let column = 0; column < 3; column++) {
      const seed = stone++;
      const shape = new THREE.Shape();
      const points = [[-.43, -.39], [.26, -.44], [.43, -.24], [.39, .34], [-.24, .43], [-.45, .18]];
      for (let p = 0; p < points.length; p++) {
        const [x, z] = points[p], jitter = Math.sin(seed * 13.37 + p * 7.9) * .045;
        if (!p) shape.moveTo(x + jitter, z); else shape.lineTo(x + jitter, z);
      }
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: .055, bevelEnabled: true, bevelSegments: 1, bevelSize: .025, bevelThickness: .015, steps: 1 });
      geometry.rotateX(-Math.PI / 2);
      const slab = new THREE.Mesh(geometry, materials[seed % materials.length]);
      const offset = (column - 1) * .98;
      slab.position.set(b.center.x + Math.cos(angle) * offset, .012, b.center.z - Math.sin(angle) * offset);
      slab.rotation.y = angle + Math.sin(seed * 5.2) * .045; slab.castShadow = true; slab.receiveShadow = true; group.add(slab);
    }
  }
  // Bake the small slabs into four static material batches rather than drawing each slab.
  group.updateMatrixWorld(true);
  const batches = materials.map(material => ({ material, geometries: [] as THREE.BufferGeometry[] }));
  for (const object of group.children) {
    const slab = object as THREE.Mesh;
    slab.geometry.applyMatrix4(slab.matrixWorld);
    batches[materials.indexOf(slab.material as THREE.MeshStandardMaterial)].geometries.push(slab.geometry);
  }
  group.clear();
  for (const { material, geometries } of batches) {
    const geometry = mergeGeometries(geometries);
    for (const source of geometries) source.dispose();
    if (geometry) { const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }
  }
  return group;
}

