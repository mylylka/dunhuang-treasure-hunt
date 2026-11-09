import * as THREE from 'three';
import { terrainPose } from './terrain-camera-v001';

export type FirstGalleryMuralCameraView = 'overview' | 'wall' | 'table' | 'bird' | 'farewell';

export interface FirstGalleryMuralCameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

export const FIRST_GALLERY_MURAL_OBSERVER = { x: -12, z: -17.1 };
export const FIRST_GALLERY_MURAL_TABLE_OBSERVER = { x: -8.3, z: -18.5 };

type Point = readonly [number, number, number];

const SHOTS = {
  overview: { position: [-10.2, 2.58, -10.8], target: [-9.85, 2.2, -23.1], fov: 49, aspect: 16 / 9 },
  wall: { position: [-12, 2.55, -13.7], target: [-12, 2.6, -23.1], fov: 49, aspect: 16 / 9 },
  table: { position: [-10.15, 2.84, -18.9], target: [-5.92, 1.72, -20.03], fov: 45, aspect: 1.6 },
  bird: { position: [-7.8, 3.21, -16.1], target: [-4.96, 2.58, -19.4], fov: 36, aspect: 1.6 },
  farewell: { position: [-8.5, 2.63, -13.7], target: [-7.1, 1.32, -19.7], fov: 45, aspect: 1.6 },
} satisfies Record<FirstGalleryMuralCameraView, { position: Point; target: Point; fov: number; aspect: number }>;

const UP = new THREE.Vector3(0, 1, 0);

export function firstGalleryMuralCameraPose(view: FirstGalleryMuralCameraView, aspect: number): FirstGalleryMuralCameraPose {
  const shot = SHOTS[view];
  const pose = terrainPose('courtyard', {
    position: new THREE.Vector3(...shot.position),
    target: new THREE.Vector3(...shot.target),
  });
  const horizontalFraming = Math.max(1, shot.aspect / Math.max(aspect, 1));
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(shot.fov / 2)) * horizontalFraming));
  return { ...pose, fov };
}

/** The authored camera eyes share a clear corridor in the hall. Use the same
 * path in reverse for the return to the full mural. */
export function firstGalleryMuralCameraTransition(
  from: FirstGalleryMuralCameraPose,
  to: FirstGalleryMuralCameraPose,
  progress: number,
  options?: { slerpView?: boolean },
): FirstGalleryMuralCameraPose {
  const blend = THREE.MathUtils.smoothstep(progress, 0, 1);
  const position = from.position.clone().lerp(to.position, blend);
  const target = from.target.clone().lerp(to.target, blend);
  if (options?.slerpView && blend > 0 && blend < 1) {
    // Entering from free look can mean a half turn. Interpolating the two
    // target points would briefly cancel opposing view directions.
    const basis = new THREE.Matrix4().lookAt(from.position, from.target, UP);
    const rotation = new THREE.Quaternion().setFromRotationMatrix(basis);
    const endRotation = new THREE.Quaternion().setFromRotationMatrix(basis.lookAt(to.position, to.target, UP));
    rotation.slerp(endRotation, blend);
    const distance = THREE.MathUtils.lerp(from.position.distanceTo(from.target), to.position.distanceTo(to.target), blend);
    target.set(0, 0, -distance).applyQuaternion(rotation).add(position);
  }
  return { position, target, fov: THREE.MathUtils.lerp(from.fov, to.fov, blend) };
}
