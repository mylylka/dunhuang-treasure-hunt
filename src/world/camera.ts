import * as THREE from 'three';
import { WORLD_COLLIDERS } from './movement';
import { FOLLOW_CAMERA_DISTANCE } from './layout';

export { FOLLOW_CAMERA_DISTANCE } from './layout';

// Expanded proxy boxes keep the near plane clear; camera and character do not share a radius.
const cameraBoxes = WORLD_COLLIDERS.map(box => new THREE.Box3(
  new THREE.Vector3(box.minX - .18, -.2, box.minZ - .18),
  new THREE.Vector3(box.maxX + .18, box.height + .18, box.maxZ + .18),
));
// Hall ceiling and gate lintel also block the camera even though not walk blockers.
cameraBoxes.push(
  new THREE.Box3(new THREE.Vector3(-21, 5.25, -24), new THREE.Vector3(-3, 5.65, -13)),
  new THREE.Box3(new THREE.Vector3(-15.7, 3.82, .3), new THREE.Vector3(-8.3, 4.6, 3.7)),
);
const ray = new THREE.Ray();
const intersection = new THREE.Vector3();

export function clearCameraPosition(target: THREE.Vector3, desired: THREE.Vector3): THREE.Vector3 {
  const direction = desired.clone().sub(target);
  let distance = direction.length();
  ray.set(target, direction.normalize());
  for (const box of cameraBoxes) {
    const hit = ray.intersectBox(box, intersection);
    if (hit) distance = Math.min(distance, Math.max(.38, target.distanceTo(hit) - .13));
  }
  return target.clone().addScaledVector(direction, distance);
}

export function followCameraPose(x: number, y: number, z: number, yaw: number) {
  // A lower, longer arm leaves a readable horizon and keeps the traveler near 20% screen height.
  const target = new THREE.Vector3(x, y + 1.8, z);
  const desired = target.clone().add(new THREE.Vector3(Math.sin(yaw) * FOLLOW_CAMERA_DISTANCE, 2.7, Math.cos(yaw) * FOLLOW_CAMERA_DISTANCE));
  return { target, position: clearCameraPosition(target, desired) };
}

export function caissonCameraPose() {
  // Retreat into the open court: all four corners of the 6.7 m caisson fit the 49° lens.
  // The slightly lower gaze moves the complete ornament above the bottom observation panel.
  return { position: new THREE.Vector3(-12, 1.3, -10), target: new THREE.Vector3(-12, 4.75, -17.3) };
}
