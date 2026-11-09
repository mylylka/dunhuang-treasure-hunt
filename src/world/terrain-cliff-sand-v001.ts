import * as THREE from 'three';

/** The original mountain's windblown sand foot floats over the connected terrain. */
export function hideConnectedCliffSandFoot(root: THREE.Object3D) {
  root.traverse(object => {
    if (object.name !== 'sand-foot-1' && object.name !== 'sand-foot--1') return;
    object.visible = false;
    object.traverse(part => { if (part instanceof THREE.Mesh) part.castShadow = false; });
  });
}
