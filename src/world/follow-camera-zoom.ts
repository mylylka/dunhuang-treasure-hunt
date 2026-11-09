import { MathUtils, Vector3 } from 'three';

export const MIN_CAMERA_ZOOM_OFFSET = -4;
export const MAX_CAMERA_ZOOM_OFFSET = 10;

/** Offset the requested follow arm; the runtime still resolves all collisions. */
export function zoomFollowPose<T extends { position: Vector3; target: Vector3 }>(pose: T, offset: number): T {
  if (!Number.isFinite(offset) || !offset) return pose;
  const arm = pose.position.clone().sub(pose.target);
  const length = arm.length();
  if (length < .001) return pose;
  const distance = MathUtils.clamp(length + offset, 2.2, 18);
  return { ...pose, position: pose.target.clone().addScaledVector(arm, distance / length) };
}

export function cameraZoomOffset(current: number, delta: number) {
  return Number.isFinite(delta)
    ? MathUtils.clamp(current + delta, MIN_CAMERA_ZOOM_OFFSET, MAX_CAMERA_ZOOM_OFFSET)
    : current;
}
