import type { WorldPoint } from './types';

export interface RoadSection { center: WorldPoint; left: WorldPoint; right: WorldPoint }
export const ROAD_HALF_WIDTH = 1.65;

// Turn outside the front wall (z=2), then enter straight through the gate (x=-12).
// Explicit Bezier controls keep the full ribbon outside the wall throughout the turn.
const segments: { points: readonly [WorldPoint, WorldPoint, WorldPoint, WorldPoint]; steps: number }[] = [
  { points: [{ x: 0, z: 26 }, { x: 0, z: 22 }, { x: 0, z: 16 }, { x: 0, z: 12 }], steps: 28 },
  { points: [{ x: 0, z: 12 }, { x: 0, z: 8 }, { x: -12, z: 10 }, { x: -12, z: 6 }], steps: 48 },
  { points: [{ x: -12, z: 6 }, { x: -12, z: 0 }, { x: -12, z: -7 }, { x: -12, z: -13 }], steps: 38 },
];

export const COURTYARD_ROAD: readonly RoadSection[] = segments.flatMap(({ points: [a, b, c, d], steps }, segment) => {
  return Array.from({ length: steps + (segment === 0 ? 1 : 0) }, (_, index) => {
    const t = (index + (segment === 0 ? 0 : 1)) / steps, s = 1 - t;
    const center = { x: s ** 3 * a.x + 3 * s * s * t * b.x + 3 * s * t * t * c.x + t ** 3 * d.x,
      z: s ** 3 * a.z + 3 * s * s * t * b.z + 3 * s * t * t * c.z + t ** 3 * d.z };
    const dx = 3 * s * s * (b.x - a.x) + 6 * s * t * (c.x - b.x) + 3 * t * t * (d.x - c.x);
    const dz = 3 * s * s * (b.z - a.z) + 6 * s * t * (c.z - b.z) + 3 * t * t * (d.z - c.z);
    const normal = { x: -dz * ROAD_HALF_WIDTH / Math.hypot(dx, dz), z: dx * ROAD_HALF_WIDTH / Math.hypot(dx, dz) };
    return { center, left: { x: center.x + normal.x, z: center.z + normal.z }, right: { x: center.x - normal.x, z: center.z - normal.z } };
  });
});
