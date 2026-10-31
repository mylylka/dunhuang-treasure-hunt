import { FOLLOW_CAMERA_DISTANCE, WORLD_BOUNDS } from './layout';

export interface SceneryPlacement {
  id: string;
  x: number; y: number; z: number;
  radiusX: number; radiusY: number; radiusZ: number;
  ridgeAxis?: 'x' | 'z';
}

// The whole dune footprint, not merely its centre, stays beyond the player's
// bounds and the longest follow-camera arm. Dunes are scenery, not walk surfaces.
export const DUNE_CAMERA_CLEARANCE = FOLLOW_CAMERA_DISTANCE + .5;
// Overlapping broad ridges form a continuous horizon. Each full rectangular
// footprint is outside the camera envelope; the geometry never exceeds it.
export const WORLD_DUNES: readonly SceneryPlacement[] = [
  ...[-63, -21, 21, 63].flatMap((x, i): SceneryPlacement[] => [
    { id: `dune-north-${i}`, x, y: -1.3, z: WORLD_BOUNDS.minZ - DUNE_CAMERA_CLEARANCE - 20.5,
      radiusX: 25, radiusY: [15, 23, 17, 27][i], radiusZ: 19, ridgeAxis: 'x' },
    { id: `dune-south-${i}`, x, y: -1.3, z: WORLD_BOUNDS.maxZ + DUNE_CAMERA_CLEARANCE + 19.5,
      radiusX: 25, radiusY: [18, 12, 21, 15][i], radiusZ: 18, ridgeAxis: 'x' },
  ]),
  ...[-67, -35, -3, 29, 61].flatMap((z, i): SceneryPlacement[] => [
    { id: `dune-west-${i}`, x: WORLD_BOUNDS.minX - DUNE_CAMERA_CLEARANCE - 21.5, y: -1.3, z,
      radiusX: 20, radiusY: [21, 15, 24, 13, 19][i], radiusZ: 21, ridgeAxis: 'z' },
    { id: `dune-east-${i}`, x: WORLD_BOUNDS.maxX + DUNE_CAMERA_CLEARANCE + 21.5, y: -1.3, z,
      radiusX: 20, radiusY: [16, 25, 14, 21, 17][i], radiusZ: 21, ridgeAxis: 'z' },
  ]),
];

const boundaryStones: SceneryPlacement[] = [];
const edgeGap = .12;
for (let z = WORLD_BOUNDS.minZ + 2; z <= WORLD_BOUNDS.maxZ - 2; z += 5) {
  const variant = (z - WORLD_BOUNDS.minZ - 2) / 5 % 4;
  const radiusX = 1.45 + variant * .22;
  boundaryStones.push(
    { id: `boundary-stone-west-${z}`, x: WORLD_BOUNDS.minX - radiusX - edgeGap, y: -.2, z, radiusX, radiusY: .65 + variant * .16, radiusZ: 1.8 + variant * .2 },
    { id: `boundary-stone-east-${z}`, x: WORLD_BOUNDS.maxX + radiusX + edgeGap, y: -.2, z, radiusX, radiusY: 1.15 - variant * .13, radiusZ: 2.3 - variant * .16 },
  );
}
for (let x = WORLD_BOUNDS.minX + 3; x <= WORLD_BOUNDS.maxX - 3; x += 5) {
  const variant = (x - WORLD_BOUNDS.minX - 3) / 5 % 4;
  const radiusZ = 1.5 + variant * .2;
  boundaryStones.push(
    { id: `boundary-stone-south-${x}`, x, y: -.2, z: WORLD_BOUNDS.maxZ + radiusZ + edgeGap, radiusX: 1.9 + variant * .22, radiusY: .7 + variant * .13, radiusZ },
    { id: `boundary-stone-north-${x}`, x, y: -.2, z: WORLD_BOUNDS.minZ - radiusZ - edgeGap, radiusX: 2.6 - variant * .15, radiusY: 1.15 - variant * .15, radiusZ },
  );
}
export const WORLD_BOUNDARY_STONES: readonly SceneryPlacement[] = boundaryStones;

// These cliff masses remain close enough to mark the future cave region.
// Unlike distant dunes, their full footprints participate in collisions.
export const WORLD_CLIFFS: readonly SceneryPlacement[] = Array.from({ length: 8 }, (_, i) => ({
  id: `cliff-${i}`, x: -18 + i * 6.5, y: 2.8, z: -34,
  radiusX: 5.2, radiusY: [7.5, 10.5, 8, 13, 9, 11.5, 8.5, 10][i], radiusZ: 4,
}));
