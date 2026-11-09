import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { COURTYARD_ROCK_SCALE, ENLARGED_COURTYARD_ROCKS, REFINED_COURTYARD_ROCKS } from '../content/world/courtyard-rock-refinement-v001';

/** Replace just the marked scenery in this instance; the archived GLB stays intact. */
export function refineCourtyardRocks(root: THREE.Object3D): void {
  root.updateWorldMatrix(true, true);
  const rocks: THREE.Object3D[] = [];
  root.traverse(object => {
    if (REFINED_COURTYARD_ROCKS.has(String(object.userData.semanticGroup ?? ''))) rocks.push(object);
  });
  for (const rock of rocks) {
    const original: THREE.Mesh[] = [];
    rock.traverse(object => { if (object instanceof THREE.Mesh) original.push(object); });
    if (!original.length) continue;
    const box = new THREE.Box3().setFromObject(rock);
    if (box.isEmpty()) continue;
    const inverse = rock.matrixWorld.clone().invert();
    const local = new THREE.Box3();
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z])
      local.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(inverse));
    const size = local.getSize(new THREE.Vector3()), center = local.getCenter(new THREE.Vector3());
    const scale = ENLARGED_COURTYARD_ROCKS.has(String(rock.userData.semanticGroup)) ? COURTYARD_ROCK_SCALE : 1;
    // Asymmetric broken planes instead of an evenly rounded, tent-like outline.
    const top = String(rock.userData.semanticGroup) === 'rock-road-east-low'
      ? [[-.38, .67, -.25], [.1, .98, -.33], [.42, .73, .07], [-.12, .84, .35]]
      : [[-.24, .78, -.21], [.13, 1, -.17], [.32, .71, .16], [-.16, .87, .31]];
    const points = [
      [-.48, 0, -.32], [.08, 0, -.49], [.47, 0, -.19], [.43, 0, .35], [-.13, 0, .49], [-.5, 0, .19],
      [-.43, .38, -.35], [.18, .24, -.46], [.5, .31, .05], [.23, .47, .43], [-.4, .35, .3],
      ...top,
    ].map(([x, y, z]) => new THREE.Vector3(center.x + x * size.x * scale, local.min.y + y * size.y * scale, center.z + z * size.z * scale));
    const geometry = new ConvexGeometry(points);
    const material = Array.isArray(original[0].material) ? original[0].material[0] : original[0].material;
    const replacement = new THREE.Mesh(geometry, material);
    replacement.name = `${rock.name}-review-shape`;
    replacement.castShadow = true;
    replacement.receiveShadow = true;
    for (const mesh of original) mesh.visible = false;
    if (rock instanceof THREE.Mesh && rock.parent) {
      // A single-primitive GLB node is itself a Mesh: a child of a hidden mesh
      // would be hidden too, so keep the replacement beside it instead.
      replacement.position.copy(rock.position);
      replacement.quaternion.copy(rock.quaternion);
      replacement.scale.copy(rock.scale);
      replacement.userData.semanticGroup = rock.userData.semanticGroup;
      rock.parent.add(replacement);
    } else rock.add(replacement);
  }
}
