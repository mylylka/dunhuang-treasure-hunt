import * as THREE from 'three';
import { WORLD_COLLIDERS } from './movement';
import { FOLLOW_CAMERA_DISTANCE } from './layout';
import courtyardProps from '../content/world/courtyard-props.json';

export { FOLLOW_CAMERA_DISTANCE } from './layout';

export interface CameraBoxDefinition { id: string; min: number[]; max: number[] }
export const COURTYARD_CAMERA_BOXES: readonly CameraBoxDefinition[] = courtyardProps.cameraBoxes;

// Exported model-piece bounds include the real low caisson, brackets and gate eaves.
// Ground and stair meshes are excluded: they support the player rather than block sight.
export const WORLD_CAMERA_OBSTACLES = [
  ...WORLD_COLLIDERS.filter(box => !box.circle).map(box => new THREE.Box3(
    new THREE.Vector3(box.minX, -.2, box.minZ), new THREE.Vector3(box.maxX, box.height, box.maxZ),
  )),
  ...COURTYARD_CAMERA_BOXES.map(box => new THREE.Box3(
    new THREE.Vector3(...box.min as [number, number, number]),
    new THREE.Vector3(...box.max as [number, number, number]),
  )),
];
export interface CameraCylinder { id: string; x: number; z: number; radius: number; minY: number; maxY: number }
export const WORLD_CAMERA_CYLINDERS: readonly CameraCylinder[] = WORLD_COLLIDERS.flatMap(box => box.circle
  ? [{ id: box.id ?? 'prop', ...box.circle, minY: -.2, maxY: box.height }] : []);
export const CAMERA_CLEARANCE = .24;

/** Nearest intersection with a finite cylinder, including its top and bottom caps. */
export function intersectCameraCylinder(ray: THREE.Ray, cylinder: CameraCylinder, padding = 0): number | null {
  const radius = cylinder.radius + padding;
  const minY = cylinder.minY - padding, maxY = cylinder.maxY + padding;
  const x = ray.origin.x - cylinder.x, z = ray.origin.z - cylinder.z;
  const { x: dx, y: dy, z: dz } = ray.direction;
  if (x * x + z * z <= radius * radius && ray.origin.y >= minY && ray.origin.y <= maxY) return 0;
  let nearest = Infinity;
  const a = dx * dx + dz * dz;
  const b = 2 * (x * dx + z * dz);
  const c = x * x + z * z - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (a > 1e-12 && discriminant >= 0) {
    const root = Math.sqrt(discriminant);
    for (const distance of [(-b - root) / (2 * a), (-b + root) / (2 * a)]) {
      const y = ray.origin.y + dy * distance;
      if (distance >= 0 && y >= minY && y <= maxY) nearest = Math.min(nearest, distance);
    }
  }
  if (Math.abs(dy) > 1e-12) {
    for (const y of [minY, maxY]) {
      const distance = (y - ray.origin.y) / dy;
      if (distance >= 0 && (x + dx * distance) ** 2 + (z + dz * distance) ** 2 <= radius * radius) {
        nearest = Math.min(nearest, distance);
      }
    }
  }
  return Number.isFinite(nearest) ? nearest : null;
}
const cameraBoxes = WORLD_CAMERA_OBSTACLES.map(box => box.clone().expandByScalar(CAMERA_CLEARANCE));

/** Sweep a small camera volume, not merely its centre, from a valid player anchor. */
export function clearCameraPosition(target: THREE.Vector3, desired: THREE.Vector3): THREE.Vector3 {
  const direction = desired.clone().sub(target);
  let distance = direction.length();
  if (distance < .00001) return desired.clone();
  const ray = new THREE.Ray(target, direction.normalize());
  const intersection = new THREE.Vector3();
  for (const box of cameraBoxes) {
    // A contained target can occur only with an invalid/stale anchor. Do not jump
    // to the far exit of a solid and pretend that it is a clear line of sight.
    if (box.containsPoint(target)) { distance = 0; break; }
    const hit = ray.intersectBox(box, intersection);
    if (hit) distance = Math.min(distance, Math.max(0, target.distanceTo(hit) - .04));
  }
  for (const cylinder of WORLD_CAMERA_CYLINDERS) {
    const hit = intersectCameraCylinder(ray, cylinder, CAMERA_CLEARANCE);
    if (hit !== null) distance = Math.min(distance, Math.max(0, hit - .04));
  }
  return target.clone().addScaledVector(direction, distance);
}

function areaBlend(x: number, z: number, minX: number, maxX: number, minZ: number, maxZ: number) {
  const edge = Math.min(x - minX, maxX - x, z - minZ, maxZ - z);
  return THREE.MathUtils.smoothstep(edge, -2.5, 1);
}

export function followCameraPose(x: number, y: number, z: number, yaw: number) {
  // Anticipate the doorway and hall while the camera is still outside them.
  // A low shoulder view keeps both the traveler and the route below lintels.
  const sheltered = Math.max(areaBlend(x, z, -16, -8, -7, 7), areaBlend(x, z, -20.5, -3.5, -24, -10));
  const target = new THREE.Vector3(x, y + 1.8 - sheltered * .35, z);
  const arm = FOLLOW_CAMERA_DISTANCE - sheltered * 3.5;
  const rise = 2.7 - sheltered * 1.1;
  const candidate = (angle: number, length: number, height: number) => clearCameraPosition(target,
    target.clone().add(new THREE.Vector3(Math.sin(angle) * length, height, Math.cos(angle) * length)));
  let position = candidate(yaw, arm, rise);
  // Near a wall/pillar, try a low shoulder offset before collapsing into the avatar.
  // Prefer the user's yaw whenever it still leaves a readable third-person view.
  if (position.distanceTo(target) < 3.8) {
    let score = position.distanceTo(target);
    for (const offset of [0, -.45, .45, -.9, .9, -1.35, 1.35]) {
      const alternative = candidate(yaw + offset, Math.min(arm, 5.7), .85);
      const nextScore = alternative.distanceTo(target) - Math.abs(offset) * .85;
      if (nextScore > score + .05) { position = alternative; score = nextScore; }
    }
  }
  return { target, position };
}

/** Apply after easing: an interpolation between two safe poses can cross a beam. */
export function settleFollowCamera(target: THREE.Vector3, interpolated: THREE.Vector3, desired: THREE.Vector3) {
  const safe = clearCameraPosition(target, interpolated);
  // Retreat from a new obstruction immediately, then ease out on subsequent frames.
  return safe.distanceTo(target) < 3.4 && desired.distanceTo(target) > safe.distanceTo(target) + .8
    ? clearCameraPosition(target, desired) : safe;
}

export function caissonCameraPose() {
  return { position: new THREE.Vector3(-12, 1.3, -10), target: new THREE.Vector3(-12, 4.75, -17.3) };
}
