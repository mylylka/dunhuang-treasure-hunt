import * as THREE from 'three';
import { environmentSurfaceHeight } from '../content/world/environment-layout-v001';

/** The original mountain's windblown sand foot floats over the connected terrain. */
export function hideConnectedCliffSandFoot(root: THREE.Object3D) {
  root.traverse(object => {
    if (object.name !== 'sand-foot-1' && object.name !== 'sand-foot--1') return;
    object.visible = false;
    object.traverse(part => { if (part instanceof THREE.Mesh) part.castShadow = false; });
  });
}

/** The outer flank extends beyond the third gallery's level pad. Fit the
 * bottom of the rock to the rendered sand with the same profile in both GLBs. */
export function groundConnectedCliffFlank(root: THREE.Object3D): void {
  const mountain = root.getObjectByName('mountain-sandstone-low');
  if (mountain?.userData.geometryRevision !== 'horizontal-eroded-strata-v001') return;

  // Both assets have metre-scale vertices baked in mountain coordinates.
  // The connected scene positions the model with translation and yaw only.
  const worldPoint = new THREE.Vector3();
  const originalBase = mountain.getWorldPosition(worldPoint).y - 1.2;
  mountain.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry;
    const positions = geometry.getAttribute('position');
    let changed = false;
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const x = positions.getX(vertex);
      const y = positions.getY(vertex);
      if (x <= 22 || y >= 6) continue;
      worldPoint.set(x, y, positions.getZ(vertex)).applyMatrix4(object.matrixWorld);
      const sand = environmentSurfaceHeight(worldPoint.x, worldPoint.z);
      const depth = originalBase - sand + .5;
      if (depth <= 0) continue;
      const blend = (1 - THREE.MathUtils.smoothstep(y, -1.2, 6))
        * THREE.MathUtils.smoothstep(x, 22, 26);
      positions.setY(vertex, y - depth * blend);
      changed = true;
    }
    if (changed) {
      positions.needsUpdate = true;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
  });
}
