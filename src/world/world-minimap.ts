import { TERRAIN_ANCHORS, TERRAIN_ROUTES } from '../content/world/terrain-layout-v001';

type MapPoint = { x: number; y: number };
type Calibration = { world: { x: number; z: number }; image: MapPoint };

/**
 * The painted map deliberately changes perspective and the shapes of paths.
 * These landmarks refer to the actual road samples and to positions on that
 * image, so the marker follows the depicted route rather than a single global
 * projection. Fractions index the existing distance-sampled route arrays.
 */
const routeMarks: Readonly<Record<string, readonly MapPoint[]>> = {
  'courtyard-to-valley': [
    {x:.294,y:.816}, {x:.345,y:.86}, {x:.405,y:.88}, {x:.43,y:.83},
    {x:.44,y:.73}, {x:.468,y:.65}, {x:.45,y:.59}, {x:.42,y:.54},
    {x:.37,y:.50}, {x:.285,y:.45}, {x:.334,y:.37},
  ],
  'lake-to-cliff': [
    {x:.334,y:.37}, {x:.285,y:.45}, {x:.32,y:.48}, {x:.43,y:.53},
    {x:.47,y:.54}, {x:.49,y:.59}, {x:.55,y:.63}, {x:.64,y:.645},
    {x:.68,y:.645}, {x:.709,y:.64}, {x:.735,y:.616},
  ],
};

const calibration: Calibration[] = TERRAIN_ROUTES.flatMap(route => {
  const marks = routeMarks[route.id];
  if (!marks) return [];
  return marks.map((image, index) => ({
    world: route.points[Math.round(index / (marks.length - 1) * (route.points.length - 1))],
    image,
  }));
});
// The illustrated staircase has depth: walking up to the doorway must move
// the marker toward its top instead of leaving it at the foot.
for (let step = 1; step <= 10; step++) {
  const t = step / 10;
  calibration.push({
    world: {
      x: TERRAIN_ANCHORS.cliffStairFoot.x * (1 - t) + TERRAIN_ANCHORS.cliffDoor.x * t,
      z: TERRAIN_ANCHORS.cliffStairFoot.z * (1 - t) + TERRAIN_ANCHORS.cliffDoor.z * t,
    },
    image: {x:.735 + .027 * t, y:.616 - .074 * t},
  });
}

function baseProjection(position: { x: number; z: number }): MapPoint {
  return {
    x: .00156345 * position.x + .00269066 * position.z + .08073282,
    y: -.00211263 * position.x + .00509995 * position.z + .97119047,
  };
}

function calibratedProjection(position: { x: number; z: number }): MapPoint {
  const base = baseProjection(position);
  let xOffset = 0, yOffset = 0, totalWeight = 0;
  for (const point of calibration) {
    const dx = position.x - point.world.x, dz = position.z - point.world.z;
    const distanceSquared = dx * dx + dz * dz;
    // A landmark is exact; elsewhere every landmark contributes continuously.
    if (distanceSquared < 1e-12) return {...point.image};
    const weight = 1 / distanceSquared;
    const original = baseProjection(point.world);
    xOffset += weight * (point.image.x - original.x);
    yOffset += weight * (point.image.y - original.y);
    totalWeight += weight;
  }
  // The base contributes outside the mapped roads, without snapping a player
  // on nearby open ground or in a courtyard to the closest road point.
  const blendWeight = totalWeight + 1 / (40 * 40);
  return {x:base.x + xOffset / blendWeight, y:base.y + yOffset / blendWeight};
}

/** Approximate positions on the illustrated map, not surveying/navigation. */
export function worldMinimapPosition(position: { x: number; z: number }): MapPoint | null {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) return null;
  const result = calibratedProjection(position);
  const foot = TERRAIN_ANCHORS.cliffStairFoot, door = TERRAIN_ANCHORS.cliffDoor;
  const dx = door.x - foot.x, dz = door.z - foot.z;
  const stairLength = Math.hypot(dx, dz);
  // The path extends ten metres in front of the stairs. Correct that approach
  // as well: clamping it to the foot made a player walk upwards on the map
  // before reaching the stairs, and then jump back down at the foot.
  const t = Math.max(-10 / stairLength, Math.min(1, ((position.x - foot.x) * dx + (position.z - foot.z) * dz) / (stairLength * stairLength)));
  const axis = {x:foot.x + t * dx, z:foot.z + t * dz};
  const distanceSquared = (position.x - axis.x) ** 2 + (position.z - axis.z) ** 2;
  // Correct the staircase continuously rather than pulling every nearby
  // point onto its centreline: lateral movement still changes the marker.
  if (distanceSquared < 400) {
    const projectedAxis = calibratedProjection(axis);
    const weight = Math.exp(-distanceSquared / 16);
    const target = t < 0
      ? {x:.735 + .022 * t * stairLength / 10, y:.616 - .024 * t * stairLength / 10}
      : {x:.735 + .027 * t, y:.616 - .074 * t};
    result.x += weight * (target.x - projectedAxis.x);
    result.y += weight * (target.y - projectedAxis.y);
  }
  const {x, y} = result;
  return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? {x, y} : null;
}
