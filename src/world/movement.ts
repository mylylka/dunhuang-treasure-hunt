import type { WorldPoint } from './types';
import { WORLD_BOUNDS } from './layout';
import { WORLD_CLIFFS } from './scenery';
import courtyardProps from '../content/world/courtyard-props.json';

export { WORLD_BOUNDS } from './layout';

export interface WorldCollider { minX: number; maxX: number; minZ: number; maxZ: number; height: number; id?: string; circle?: { x: number; z: number; radius: number } }
export const WORLD_SPAWN: WorldPoint = { x: 0, z: 18 };
export const CAISSON_SAFE_POINT: WorldPoint = { x: -12, z: -13 };
// The sample avatar's full animated silhouette reaches 0.677 m, including sleeves.
export const PLAYER_RADIUS = 0.69;
export const WALK_SPEED = 3.2;
export const RUN_SPEED = 5.7;
export const CAMERA_YAW_LIMIT = Math.PI * 0.34;
const wall = (x: number, z: number, w: number, d: number, height: number): WorldCollider => ({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height });
export const WORLD_PROP_COLLIDERS: WorldCollider[] = courtyardProps.props.filter(prop => prop.collidable !== false).map(prop => ({
  id: prop.id, minX: prop.x - prop.radius, maxX: prop.x + prop.radius,
  minZ: prop.z - prop.radius, maxZ: prop.z + prop.radius, height: prop.y + prop.height,
  circle: { x: prop.x, z: prop.z, radius: prop.radius },
}));
export const WORLD_COLLIDERS: WorldCollider[] = [
  // Courtyard entrance is a six-metre opening. Upper floors have no walk surface.
  wall(-22, -11, .6, 26, 2.7), wall(-2, -11, .6, 26, 2.7), wall(-12, -24, 20, .6, 4.5),
  wall(-18.5, 2, 7, .6, 2.7), wall(-5.5, 2, 7, .6, 2.7),
  wall(-15, 2, .9, 1.2, 3.6), wall(-9, 2, .9, 1.2, 3.6),
  // Ground-floor hall is open to the south, with physical side and rear walls.
  wall(-20.5, -18.5, .6, 11, 5.4), wall(-3.5, -18.5, .6, 11, 5.4), wall(-12, -23.5, 17, .6, 5.4),
  ...[-18, -6].flatMap(x => [-14, -20].map(z => wall(x, z, .65, .65, 5.4))),
  // Work table and story display are deliberately coarse collision proxies.
  wall(-18, -7.5, 3.3, 1.4, 1.1), wall(-4.4, -7.8, .35, 3, 2.7),
  ...WORLD_PROP_COLLIDERS,
  // Distant regions are visible only in this stage, without enterable false content.
  { ...wall(18, -18, 14, 12, 8), id: 'music-placeholder' },
  ...WORLD_CLIFFS.map(item => wall(item.x, item.z, item.radiusX * 2, item.radiusZ * 2, item.y + item.radiusY)),
];

export function clampCameraYaw(yaw: number) { return Math.max(-CAMERA_YAW_LIMIT, Math.min(CAMERA_YAW_LIMIT, Number.isFinite(yaw) ? yaw : 0)); }
export function isWalkable(point: WorldPoint, colliders: readonly WorldCollider[] = WORLD_COLLIDERS): boolean {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) return false;
  const r = PLAYER_RADIUS;
  if (point.x < WORLD_BOUNDS.minX + r || point.x > WORLD_BOUNDS.maxX - r || point.z < WORLD_BOUNDS.minZ + r || point.z > WORLD_BOUNDS.maxZ - r) return false;
  return !colliders.some(box => {
    if (box.circle) return Math.hypot(point.x - box.circle.x, point.z - box.circle.z) < r + box.circle.radius - .00001;
    const x = Math.max(box.minX, Math.min(point.x, box.maxX));
    const z = Math.max(box.minZ, Math.min(point.z, box.maxZ));
    return Math.hypot(x - point.x, z - point.z) < r - .00001;
  });
}
export function sanitizePosition(point?: WorldPoint, colliders: readonly WorldCollider[] = WORLD_COLLIDERS): WorldPoint {
  return point && isWalkable(point, colliders) ? { ...point } : { ...WORLD_SPAWN };
}

/** Small deterministic steps prevent tunnelling; independent axes allow wall sliding. */
export function movePlayer(position: WorldPoint, delta: WorldPoint, colliders: readonly WorldCollider[] = WORLD_COLLIDERS): WorldPoint {
  let result = { ...position };
  const length = Math.hypot(delta.x, delta.z);
  if (!Number.isFinite(length) || length === 0) return result;
  const count = Math.ceil(length / (PLAYER_RADIUS * .45));
  // A frame cannot cause an unbounded loop even with invalid external input.
  const steps = Math.min(count, 128);
  const scale = Math.min(1, 128 / count);
  for (let i = 0; i < steps; i++) {
    const nextX = { x: result.x + delta.x * scale / steps, z: result.z };
    if (isWalkable(nextX, colliders)) result = nextX;
    const nextZ = { x: result.x, z: result.z + delta.z * scale / steps };
    if (isWalkable(nextZ, colliders)) result = nextZ;
  }
  return result;
}

export function movementVector(x: number, y: number, cameraYaw: number): WorldPoint {
  const magnitude = Math.hypot(x, y);
  const amount = Math.max(1, magnitude);
  return { x: (x * Math.cos(cameraYaw) + y * Math.sin(cameraYaw)) / amount, z: (-x * Math.sin(cameraYaw) + y * Math.cos(cameraYaw)) / amount };
}

export function surfaceHeight(position: WorldPoint): number {
  // Ramp proxy over two shallow visual steps, not collision boxes.
  if (position.x > -20.2 && position.x < -3.8 && position.z < -12.3 && position.z > -23.2) return Math.min(.28, Math.max(0, (-position.z - 12.3) * .28 / 1.2));
  return 0;
}
