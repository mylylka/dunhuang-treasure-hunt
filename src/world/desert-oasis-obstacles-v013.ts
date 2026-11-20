import { DESERT_OASIS_PLACEMENTS } from '../content/world/desert-oasis-layout-v013';
import { fromTerrainPoint } from '../content/world/terrain-layout-v001';
import type { WorldCollider } from './movement';
import type { UpperSolid } from './mogao-upper-navigation';

// Centre of the root collar and trunk radius, in original crown-centred model
// coordinates at unit height. Measured from vertices between 3.2% and 10%
// of mesh height. Rocks use their main body, excluding loose chips.
const trunkProfiles: Record<string, readonly [number, number, number]> = {
  '大树3': [-.02272, .05178, .04751], '大树4': [-.16518, -.00979, .10501],
  '大树6': [-.03279, .09135, .14482], '大树8': [-.01572, .18290, .14646],
  '大树9': [.00950, -.01636, .12490], '大树10': [.03948, .07177, .08313],
  '大树11': [-.00269, .01037, .02376], T02_弯曲胡杨树: [-.00881, .00655, .03875],
  T03_展冠胡杨树: [-.09677, -.01657, .04954], t01: [.00795, .02572, .03801],
  t02: [-.01211, .00538, .03689], t03: [-.10034, -.01645, .04726],
};
const stoneProfiles: typeof trunkProfiles = {
  r01: [0, 0, .79630], r02: [-.02801, -.07115, 1.11436],
  r04: [.06926, -.02260, .94070], 'valley-fractured-slab': [.07176, .01325, .99125],
};

export interface OasisObstacle extends WorldCollider {
  circle: { x: number; z: number; radius: number };
  model: string;
}

// Positions and heights come from the same placement records used for drawing.
// 'height' here is relative to the paving or sand; the camera adds world height.
export const OASIS_OBSTACLES: OasisObstacle[] = DESERT_OASIS_PLACEMENTS.flatMap((p, index) => {
  const trunk = trunkProfiles[p.id];
  const aboveGround = p.height - p.burial;
  const profile = trunk ?? (aboveGround >= .55 ? stoneProfiles[p.id] : undefined);
  if (!profile) return [];
  const [dx, dz, width] = profile;
  const cos = Math.cos(p.yaw), sin = Math.sin(p.yaw);
  const x = p.x + p.height * (dx * cos + dz * sin);
  const z = p.z + p.height * (dz * cos - dx * sin);
  const radius = width * p.height;
  return [{ id: 'oasis-v013-' + index, model: p.id, circle: { x, z, radius },
    minX: x-radius, maxX: x+radius, minZ: z-radius, maxZ: z+radius,
    height: trunk ? p.height * .50 : aboveGround }];
});

// The music interior uses floor-local box solids for both actor and camera.
// Three overlapping strips describe the round lower trunk without blocking
// the whole width of the canopy or closing the nearby stair and doorway.
export const OASIS_MUSIC_TRUNK_SOLIDS: UpperSolid[] = OASIS_OBSTACLES
  .filter(p => p.model === '大树9').flatMap(tree => {
    const { x, z } = fromTerrainPoint('music', tree.circle);
    const r = tree.circle.radius;
    return [[.45, .98], [.78, .78], [.98, .45]].map(([width, depth], i) => ({
      id: tree.id + '-trunk-' + i,
      min: [x-width*r, -.1, z-depth*r], max: [x+width*r, tree.height, z+depth*r],
    }));
  });
