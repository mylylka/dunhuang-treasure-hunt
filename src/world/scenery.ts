import { FOLLOW_CAMERA_DISTANCE, WORLD_BOUNDS } from './layout';

export interface SceneryPlacement {
  id: string;
  x: number; y: number; z: number;
  radiusX: number; radiusY: number; radiusZ: number;
}

// The whole dune footprint, not merely its centre, stays beyond the player's
// bounds and the longest follow-camera arm. Dunes are scenery, not walk surfaces.
export const DUNE_CAMERA_CLEARANCE = FOLLOW_CAMERA_DISTANCE + .5;
const centerX = (WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2;
const centerZ = (WORLD_BOUNDS.minZ + WORLD_BOUNDS.maxZ) / 2;
const halfWidth = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) / 2;
const halfDepth = (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) / 2;

export const WORLD_DUNES: readonly SceneryPlacement[] = Array.from({ length: 18 }, (_, i) => {
  const angle = i * 2.39996;
  const directionX = Math.cos(angle), directionZ = Math.sin(angle);
  const radiusX = 13 + i % 3 * 4, radiusZ = 10 + i % 4 * 2;
  const distance = Math.min(
    (halfWidth + DUNE_CAMERA_CLEARANCE + radiusX) / Math.abs(directionX),
    (halfDepth + DUNE_CAMERA_CLEARANCE + radiusZ) / Math.abs(directionZ),
  ) + i % 3 * 3;
  return { id: `dune-${i}`, x: centerX + directionX * distance, y: -1.3, z: centerZ + directionZ * distance,
    radiusX, radiusY: 4 + i % 4, radiusZ };
});

const boundaryStones: SceneryPlacement[] = [];
const edgeGap = .12;
for (let z = WORLD_BOUNDS.minZ + 2; z <= WORLD_BOUNDS.maxZ - 2; z += 5) {
  boundaryStones.push(
    { id: `boundary-stone-west-${z}`, x: WORLD_BOUNDS.minX - 2 - edgeGap, y: -.2, z, radiusX: 2, radiusY: 1.2, radiusZ: 2.5 },
    { id: `boundary-stone-east-${z}`, x: WORLD_BOUNDS.maxX + 2 + edgeGap, y: -.2, z, radiusX: 2, radiusY: 1.1, radiusZ: 2.5 },
  );
}
for (let x = WORLD_BOUNDS.minX + 3; x <= WORLD_BOUNDS.maxX - 3; x += 5) {
  boundaryStones.push(
    { id: `boundary-stone-south-${x}`, x, y: -.2, z: WORLD_BOUNDS.maxZ + 2 + edgeGap, radiusX: 2.7, radiusY: 1.1, radiusZ: 2 },
    { id: `boundary-stone-north-${x}`, x, y: -.2, z: WORLD_BOUNDS.minZ - 2 - edgeGap, radiusX: 2.7, radiusY: 1.1, radiusZ: 2 },
  );
}
export const WORLD_BOUNDARY_STONES: readonly SceneryPlacement[] = boundaryStones;

// These cliff masses remain close enough to mark the future cave region.
// Unlike distant dunes, their full footprints participate in collisions.
export const WORLD_CLIFFS: readonly SceneryPlacement[] = Array.from({ length: 8 }, (_, i) => ({
  id: `cliff-${i}`, x: -8 + i * 5, y: 2.8, z: -34,
  radiusX: 4, radiusY: 6 + i % 3, radiusZ: 4,
}));
