import { LAKE_SHORELINE, TERRAIN_REGIONS, TERRAIN_ROUTES, lakeSignedDistance, toTerrainPoint, type TerrainRegion } from './terrain-layout-v001';

export type DesertDecorationRegion = 'a' | 'b' | 'c' | 'd';
export type DesertDecorationVenue = 'music' | 'cliff';

export type DesertDecorationAssetId =
  | 'r01' | 'g02' | 'c04' | 'c01b' | 'c03b' | 's04b'
  | 't01' | 't02' | 't03' | 's02' | 'w01b'
  | 'rock-shrub-3' | 'shrub-1' | 'shrub-2' | 'small-tree-2'
  | 'r02' | 'r03' | 'r04' | 'c02';

type DecorationEntry = readonly [
  assetId: DesertDecorationAssetId, x: number, z: number, targetSize: number, yaw: number,
  sizeBy?: 'height', castShadow?: true, restingRoll?: number,
];

export interface DesertDecorationGroup {
  id: string;
  region: DesertDecorationRegion;
  coordinateSpace: 'world' | 'music-local';
  wallRoot?: true;
  wallAlignment?: {
    region: TerrainRegion;
    axis: 'x' | 'z';
    face: number;
    outward: -1 | 1;
    collider: string;
  };
  shoreBand?: 'front' | 'back' | 'outer';
  roadVerge?: string;
  venue?: DesertDecorationVenue;
  settleRocks?: true;
  entries: readonly DecorationEntry[];
}

// Curves 2 and 3 are the concave lip that faces the pavilion. Sample physical
// distance along it so that repeat spacing doesn't change with curve speed.
const innerShore = [...LAKE_SHORELINE.slice(LAKE_SHORELINE.length / 2), LAKE_SHORELINE[0]];
const innerShoreDistance = [0];
for (const [index, point] of innerShore.entries()) {
  if (!index) continue;
  const previous = innerShore[index - 1];
  innerShoreDistance.push(innerShoreDistance[index - 1] + Math.hypot(point.x - previous.x, point.z - previous.z));
}

function innerShorePlant(distance: number, bankOffset: number, index: number, back: boolean): DecorationEntry {
  const next = innerShoreDistance.findIndex(current => current > distance);
  const t = (distance - innerShoreDistance[next - 1]) / (innerShoreDistance[next] - innerShoreDistance[next - 1]);
  const a = innerShore[next - 1];
  const b = innerShore[next];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  const x = a.x + dx * t;
  const z = a.z + dz * t;
  const nx = dz / length;
  const nz = -dx / length;
  const drySide = lakeSignedDistance(x + nx, z + nz) > 0 ? 1 : -1;
  const shrub = back ? index % 4 !== 2 : index % 5 === 2 || index % 7 === 5;
  const assetId = shrub ? 'shrub-2' : 'w01b';
  const size = back
    ? 1.62 + .82 * (.5 + .5 * Math.sin(index * 1.87))
    : 1.92 + .64 * (.5 + .5 * Math.sin(index * 1.19 + .4));
  const yaw = Math.atan2(-dz, dx) + (index % 2 ? Math.PI : 0) + .63 * Math.sin(index * 1.61);
  return [assetId, x + drySide * nx * bankOffset, z + drySide * nz * bankOffset, size, yaw];
}

function innerShoreGroup(shoreBand: 'front' | 'back'): DesertDecorationGroup {
  const back = shoreBand === 'back';
  const entries: DecorationEntry[] = [];
  for (let distance = back ? 4.4 : 1.7; distance < innerShoreDistance.at(-1)! - 2.1;) {
    const index = entries.length;
    const bankOffset = back ? 2.65 + 1.42 * (.5 + .5 * Math.sin(index * 1.76)) : .68 + .31 * Math.sin(index * .82 + .30);
    entries.push(innerShorePlant(distance, bankOffset, index, back));
    distance += back ? 4.03 + 1.54 * (.5 + .5 * Math.cos(index * 1.98)) : 1.58 + .35 * (.5 + .5 * Math.cos(index * 2.13));
  }
  return { id: `inner-bank-${shoreBand}`, region: 'b', coordinateSpace: 'world', shoreBand, entries };
}

function outerShoreGroup(): DesertDecorationGroup {
  const entries: DecorationEntry[] = [];
  const clumps = [41, 49, 58, 65, 72];
  for (const [index, sample] of clumps.entries()) {
    const assets = [ 'w01b', 'shrub-2', index % 2 ? 'r01' : 'w01b'] as const;
    for (const [branch, assetId] of assets.entries()) {
      const pointIndex = sample + (index % 2 ? -branch : branch);
      const a = LAKE_SHORELINE[pointIndex - 1];
      const point = LAKE_SHORELINE[pointIndex];
      const b = LAKE_SHORELINE[pointIndex + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      const nx = dz / length;
      const nz = -dx / length;
      const side = lakeSignedDistance(point.x + nx, point.z + nz) > 0 ? 1 : -1;
      const offset = [.68, 1.9, 1.36][branch] + (index % 3) * .17;
      const target = [1.68, 2.32, assetId === 'r01' ? 1.05 : 1.28][branch];
      const yaw = Math.atan2(-dz, dx) + index * 1.17 + branch * .67;
      entries.push([assetId, point.x + side * nx * offset, point.z + side * nz * offset, target, yaw]);
    }
  }
  return { id: 'far-bank-clumps', region: 'b', coordinateSpace: 'world', shoreBand: 'outer', entries };
}

function wallRootGroup(
  id: string,
  region: DesertDecorationRegion,
  gallery: 'courtyard' | 'music' | 'cliff',
  localEntries: readonly DecorationEntry[],
  wall?: Omit<NonNullable<DesertDecorationGroup['wallAlignment']>, 'region' | 'collider'> & { collider: string },
): DesertDecorationGroup {
  return {
    id, region, coordinateSpace: 'world', wallRoot: true, settleRocks: true,
    ...(gallery === 'courtyard' ? {} : { venue: gallery }),
    ...(wall ? { wallAlignment: { ...wall, region: gallery, collider: `terrain-${gallery}-${wall.collider}` } } : {}),
    entries: localEntries.map(([assetId, x, z, size, yaw]) => {
      const point = toTerrainPoint(gallery, { x, z });
      return [assetId, point.x, point.z, size, yaw + TERRAIN_REGIONS[gallery].yaw];
    }),
  };
}

function roadVergeGroup(routeIndex: number, region: DesertDecorationRegion): DesertDecorationGroup {
  const route = TERRAIN_ROUTES[routeIndex];
  const distances = [0];
  for (const [index, point] of route.points.entries()) {
    if (!index) continue;
    const previous = route.points[index - 1];
    distances.push(distances[index - 1] + Math.hypot(point.x - previous.x, point.z - previous.z));
  }
  const entries: DecorationEntry[] = [];
  // Long and short clumps alternate between the two verges. Stop before the
  // entrances and skip the duplicate approach at the shared music junction.
  for (const side of [-1, 1]) {
    const start = (routeIndex ? 22 : 7) + (side > 0 ? 2.7 : 0);
    for (let distance = start, cluster = 0; distance < distances.at(-1)! - 9; cluster++) {
      const mix = cluster + (side > 0 ? 3 : 0);
      const nearOasis = routeIndex ? distance < 62 : distance > 73;
      const nearCourtyard = !routeIndex && distance < 45;
      const shrubLead = nearOasis || nearCourtyard ? mix % 4 !== 1 : mix % 2 === 0;
      const lead = shrubLead ? 'shrub-2' : 'g02';
      const leadSize = shrubLead ? 1.325 + .125 * Math.sin(mix * 1.37 + side * .4)
        : 1.07 + .20 * Math.sin(mix * 1.2);
      const stone = routeIndex && mix % 2 ? 'r02' : 'r01';
      const accents: readonly [asset: DesertDecorationAssetId, offset: number, size: number][] = [
        [lead, 0, leadSize],
        [stone, 1.22, .60 + .19 * Math.cos(mix * 1.3)],
        [mix % 3 === 1 ? 's04b' : 'g02', 2.39, .66 + .13 * Math.sin(mix * 1.79)],
      ];
      for (const [index, [assetId, offset, size]] of accents.entries()) {
        const at = distance + offset * (mix % 2 ? -1 : 1);
        const next = distances.findIndex(d => d > at);
        const a = route.points[next - 1];
        const b = route.points[next];
        const t = (at - distances[next - 1]) / (distances[next] - distances[next - 1]);
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const length = Math.hypot(dx, dz);
        const across = side * (route.width / 2 + size * .72 + [.40, .60, .85][index]);
        entries.push([
          assetId, a.x + dx * t + dz / length * across, a.z + dz * t - dx / length * across,
          size, Math.atan2(-dz, dx) + mix * 1.06 + index * .77,
        ]);
      }
      distance += 6.4 + 1.7 * (.5 + .5 * Math.cos(mix * 1.81 + routeIndex));
    }
  }
  return { id: `${route.id}-verge`, region, coordinateSpace: 'world', roadVerge: route.id, settleRocks: true, entries };
}

// Coordinates and dimensions are in metres. Targets use the largest horizontal
// dimension, except for taller subjects explicitly sized by height.
export const DESERT_DECORATION_PREVIOUS_LAYOUT: readonly DesertDecorationGroup[] = [
  roadVergeGroup(0, 'a'),
  roadVergeGroup(1, 'd'),
  {
    id: 'courtyard-fold', region: 'a', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['c04', 111.9, 25.5, 2.48, .35],
      ['g02', 114.85, 26.7, .85, 1.30],
      ['r01', 111.0, 28.0, 1.12, -.38],
    ],
  },
  {
    id: 'trail-bend', region: 'a', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['s04b', 127.3, 11.15, .83, 1.12],
      ['r04', 129.55, 4.7, 2.45, 1.4],
      ['c02', 121.45, 28.7, 2.25, .27],
      ['g02', 114.75, 30.1, .95, .46],
    ],
  },
  // There is no group on the crest or across the view down into the valley.
  {
    id: 'lower-slope', region: 'a', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['c01b', 180.8, 28, 3.0, -1.74],
      ['s04b', 176.7, 28.4, .91, 1.4],
      ['r01', 177.9, 30.0, 1.10, 1.4],
      ['c04', 183.1, 30.25, 1.75, .8],
    ],
  },
  {
    id: 'valley-edge', region: 'a', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['c03b', 174.5, 7.1, 2.6, 2.04],
      ['g02', 176.95, 6.0, .95, -.49],
      ['r01', 174.0, 4.9, .94, .22],
    ],
  },
  wallRootGroup('court-west-wall-root', 'a', 'courtyard', [
    ['g02', -25.4, -3.1, .87, .10], ['r01', -25.9, -4.15, .73, .80],
    ['shrub-2', -26.05, -5.8, 1.84, -.31], ['r02', -25.9, -8.0, 1.72, .69],
    ['c04', -25.6, -10.15, 1.53, 1.11], ['g02', -25.5, -12.5, 1.08, .87],
    ['shrub-2', -26.05, -14.1, 2.06, .21], ['r01', -26.2, -16.1, .78, -2.3],
    ['g02', -25.5, -19.25, .87, -.33], ['c02', -26.05, -20.85, 1.78, -1.36],
  ], { axis: 'x', face: -24.3, outward: -1, collider: 'courtyard-side-wall-west' }),
  wallRootGroup('court-east-wall-root', 'a', 'courtyard', [
    ['c04', 3.1, .85, 1.44, -.38], ['shrub-2', 3.15, -6.3, 1.98, -.55],
    ['r02', 2.05, -4.45, 1.66, .71], ['g02', 1.45, -6.2, 1.1, 2.21],
    ['shrub-2', 2.10, -8.5, 2.05, -2.11], ['r01', 2.15, -10.45, .83, 2.8],
    ['g02', 1.65, -14.2, .92, -.41], ['c04', 1.9, -16.25, 1.60, .71],
  ], { axis: 'x', face: .3, outward: 1, collider: 'courtyard-side-wall-east' }),
  {
    id: 'oasis-first-court-frame', region: 'a', coordinateSpace: 'world',
    entries: [
      ['t03', 90.1, 16.7, 6.6, -.8, 'height', true],
      ['t01', 116.4, -17.5, 5.65, 1.29, 'height'],
    ],
  },
  {
    id: 'courtyard-entrance-greenery', region: 'a', coordinateSpace: 'world',
    entries: [
      ['shrub-2', 107.9, 23.7, 2.3, .39],
      ['g02', 107.15, 25.15, 1.16, -.5],
      ['s02', 106.15, 22.75, 1.18, .94],
      ['shrub-2', 118.65, 13.35, 2.0, -1.34],
      ['g02', 107.5, 27.0, .98, .61],
    ],
  },
  {
    id: 'west-road-tree-beacons', region: 'a', coordinateSpace: 'world',
    entries: [
      ['t01', 123.2, 33.2, 6.20, -.28, 'height'],
      ['t02', 188.4, 25.0, 6.45, 1.33, 'height'],
      ['t03', 190.6, -11.0, 6.65, -.77, 'height', true],
    ],
  },
  {
    id: 'south-bank', region: 'b', coordinateSpace: 'world',
    entries: [
      ['t01', 250.2, -17.9, 5.85, -.62, 'height', true],
      ['s02', 252.5, -17.85, 1.66, .9],
      ['c03b', 247.1, -15.2, 2.48, .32],
    ],
  },
  {
    id: 'inside-crescent', region: 'b', coordinateSpace: 'world',
    entries: [
      ['t03', 243.4, -29.8, 7.35, 1.08, 'height', true],
      ['s02', 246.5, -32.1, 1.85, -.94],
      ['r04', 245.0, -24.5, 2.79, -.52],
    ],
  },
  {
    id: 'upper-crescent', region: 'b', coordinateSpace: 'world',
    entries: [
      ['t02', 238.2, -52.6, 6.30, 1.93, 'height'],
      ['s02', 241.6, -53.95, 1.48, -.37],
      ['t01', 211.6, -82.4, 5.6, -.58, 'height'],
    ],
  },
  innerShoreGroup('front'),
  innerShoreGroup('back'),
  outerShoreGroup(),
  {
    id: 'pavilion-approach-greenery', region: 'b', coordinateSpace: 'world',
    entries: [
      ['shrub-2', 245.25, -9.4, 2.66, .57],
      ['shrub-2', 247.6, -10.45, 1.94, -1.22],
      ['s02', 244.0, -11.35, 1.47, 1.57],
      ['g02', 246.95, -8.1, 1.11, -.5],
      ['shrub-2', 238.3, -16.5, 2.35, -2.3],
      ['shrub-2', 236.65, -15.0, 1.88, .98],
      ['r01', 238.4, -14.9, .94, .79],
    ],
  },
  {
    id: 'outer-crescent-groves', region: 'b', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['t03', 245.4, -109.1, 7.0, -.37, 'height'],
      ['shrub-2', 247.1, -106.6, 2.33, .18],
      ['r04', 238.5, -107.25, 3.1, 1.16],
      ['t02', 276.8, -79.3, 6.45, .81, 'height'],
      ['shrub-2', 277.8, -82.0, 2.36, -.66],
      ['r02', 276.85, -75.75, 2.04, 1.43],
      ['t01', 278.8, -22.3, 5.75, 1.75, 'height'],
      ['shrub-2', 276.7, -24.7, 2.33, 1.72],
      ['r04', 277.5, -20.2, 2.24, -.29],
    ],
  },
  {
    id: 'east-courtyard-wall', region: 'c', coordinateSpace: 'music-local', venue: 'music',
    entries: [
      ['rock-shrub-3', 67.1, -6.6, 1.36, .52],
      ['shrub-2', 68.3, -8.0, 1.10, -.25],
      ['shrub-2', 67.8, -9.5, .82, 1.07],
      ['rock-shrub-3', 68.0, -11.0, .93, -.81],
    ],
  },
  wallRootGroup('pavilion-wall-west-root', 'c', 'music', [
    ['g02', 22.85, -.75, .88, -.56], ['shrub-2', 21.95, -2.4, 1.86, .22],
    ['r01', 22.65, -4.0, .83, -.8], ['g02', 22.8, -6.0, .92, .68],
    ['c02', 22.15, -7.45, 1.78, -.49], ['shrub-2', 22.1, -11.6, 1.97, .48],
    ['r02', 22.5, -14.0, 1.63, 1.5], ['g02', 22.65, -15.9, 1.03, 1.12],
    ['shrub-2', 22.05, -19.35, 1.82, -2.69], ['r01', 22.5, -22.35, .82, 2.5],
    ['g02', 22.85, -24.5, .94, .55], ['shrub-2', 21.9, -26.4, 1.93, -.32],
    ['r01', 22.9, -28.6, .81, .47], ['g02', 22.75, -31.25, .83, 1.9],
  ], { axis: 'x', face: 23.75, outward: -1, collider: 'music-court-west' }),
  wallRootGroup('pavilion-wall-east-root', 'c', 'music', [
    ['g02', 71.1, -.9, .85, .7], ['c02', 71.55, -2.45, 1.65, 1.3],
    ['shrub-2', 73.05, -7.6, 1.98, 1.43], ['r01', 72.0, -6.2, .73, 1.24],
    ['g02', 71.45, -9.8, .95, 2.67], ['shrub-2', 72.15, -11.8, 2.06, -2.66],
    ['r02', 72.1, -14.14, 1.83, .24], ['g02', 71.35, -15.9, 1.06, -.66],
    ['g02', 71.15, -18.9, .98, 1.22], ['shrub-2', 72.0, -21.2, 1.93, .38],
    ['r02', 71.85, -23.8, 1.68, -.9], ['g02', 71.15, -25.8, .90, 1.63],
    ['shrub-2', 72.2, -28.0, 1.85, -.41], ['r01', 71.45, -30.5, .86, -.75],
  ], { axis: 'x', face: 70.25, outward: 1, collider: 'music-court-east' }),
  wallRootGroup('pavilion-front-west-root', 'c', 'music', [
    ['g02', 25.6, 4.25, .96, .29], ['shrub-2', 27.35, 5.14, 1.91, -.45],
    ['r01', 29.1, 4.15, .75, 1.3], ['g02', 30.75, 4.2, 1.05, .82],
    ['shrub-2', 33.35, 4.82, 1.82, 1.38], ['g02', 35.1, 4.21, .91, -.55],
  ], { axis: 'z', face: 3.25, outward: 1, collider: 'music-court-front-west' }),
  wallRootGroup('pavilion-front-east-root', 'c', 'music', [
    ['g02', 45.15, 4.34, .95, -.4], ['shrub-2', 46.65, 4.83, 1.85, .97],
    ['r01', 48.2, 4.25, .80, .77], ['g02', 49.8, 4.29, .98, 1.31],
    ['shrub-2', 52.1, 5.14, 2.06, -.78], ['r02', 54.15, 4.9, 1.37, .27],
    ['g02', 55.55, 4.3, 1.03, -.33], ['shrub-2', 57.5, 4.86, 1.80, 1.3],
    ['r01', 59.25, 4.22, .78, .19], ['g02', 61.0, 4.32, 1.03, -.91],
    ['shrub-2', 63.7, 5.2, 2.05, .7], ['g02', 65.8, 4.34, .93, -.8],
    ['r01', 67.0, 4.29, .9, 2.03], ['shrub-2', 68.65, 4.8, 1.72, -.34],
  ], { axis: 'z', face: 3.25, outward: 1, collider: 'music-court-front-east' }),
  wallRootGroup('pavilion-back-root', 'c', 'music', [
    ['shrub-2', 27.2, -34.95, 1.9, .5], ['g02', 29.25, -34.25, .97, -.39],
    ['r01', 32.0, -34.15, .84, -.39], ['shrub-2', 33.75, -34.95, 1.9, 1.22],
    ['g02', 36.0, -34.22, .9, .19], ['g02', 39.8, -34.35, 1.0, .77],
    ['shrub-2', 42.0, -34.95, 1.95, -.45], ['r01', 44.15, -34.25, .87, -.88],
    ['g02', 49.25, -34.25, 1.03, .5], ['shrub-2', 51.2, -34.95, 1.86, 1.01],
    ['r02', 55.7, -34.75, 1.65, .17], ['g02', 57.15, -34.25, .92, .72],
    ['shrub-2', 61.0, -34.95, 1.94, 1.10], ['g02', 63.05, -34.25, 1.03, -.32],
    ['r01', 66.5, -34.32, .91, .63], ['shrub-2', 68.25, -34.9, 1.82, -.4],
  ], { axis: 'z', face: -33.325, outward: -1, collider: 'music-court-back' }),
  {
    id: 'gravel-transition', region: 'd', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['c02', 238.4, 23.9, 3.1, -.50],
      ['r02', 241.5, 27.4, 2.25, .26, undefined, undefined, .64],
      ['s04b', 235.8, 22.8, 1.2, 1.2],
    ],
  },
  {
    id: 'low-sandstone-ledges', region: 'd', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['r04', 264.95, 9.2, 4.1, 1.4, undefined, undefined, -.59],
      ['r02', 260.4, 12.9, 2.50, .87],
      ['c02', 267.6, 15.8, 2.65, 2.5],
      ['r01', 268.3, 13.0, 1.28, -.32],
    ],
  },
  {
    id: 'wind-cut-ridge', region: 'd', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['r03', 280.1, 42.2, 2.8, .25, 'height', true],
      ['r04', 274.2, 41.15, 4.3, -1.22],
      ['r02', 283.05, 44.4, 2.90, -.27, undefined, undefined, -.53],
      ['s04b', 276.4, 43.4, 1.31, 1.06],
    ],
  },
  {
    id: 'cliff-approach', region: 'd', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['c02', 301.1, 24.85, 3.3, -.65],
      ['r02', 298.3, 27.1, 2.41, .50],
      ['r03', 304.4, 24.45, 2.27, 1.6, 'height'],
      ['s04b', 302.3, 29.3, 1.19, .36],
    ],
  },
  wallRootGroup('cliff-step-flank-roots', 'd', 'cliff', [
    ['g02', 110.15, -44.1, 1.32, .25], ['r02', 108.55, -45.7, 2.23, .1],
    ['shrub-2', 109.35, -47.4, 2.60, .95], ['r01', 110.4, -49.45, 1.20, 1.43],
    ['g02', 133.3, -44.5, 1.23, .27], ['r02', 134.1, -46.1, 1.85, 1.7],
    ['shrub-2', 134.1, -48.5, 2.18, 1.23], ['r01', 134.15, -50.2, 1.13, -2.4],
  ]),
  {
    id: 'east-road-tree-beacons', region: 'd', coordinateSpace: 'world',
    entries: [
      ['t01', 249.75, 32.75, 6.15, 1.72, 'height'],
      ['t02', 286.1, 17.1, 6.25, -.65, 'height', true],
    ],
  },
  {
    id: 'gobi-tree-foreground', region: 'd', coordinateSpace: 'world',
    entries: [
      ['t01', 297.4, 19.55, 5.8, -1.7, 'height'],
      ['t03', 325.7, 30.1, 6.6, .41, 'height', true],
    ],
  },
  {
    id: 'gobi-rock-root-greenery', region: 'd', coordinateSpace: 'world',
    entries: [
      ['shrub-2', 261.2, 9.35, 2.05, .85],
      ['g02', 267.4, 10.75, 1.18, 1.8],
      ['shrub-2', 274.75, 44.4, 2.46, -.54],
      ['g02', 275.95, 46.1, 1.30, .28],
      ['shrub-2', 304.4, 29.65, 2.27, 1.85],
      ['s04b', 305.85, 30.7, 1.18, -.61],
    ],
  },
];

function shorePatch(id: string, samples: readonly [DesertDecorationAssetId, index: number, bankOffset: number, size: number, yaw: number][]): DesertDecorationGroup {
  const entries: DecorationEntry[] = samples.map(([assetId, index, bankOffset, size, turn]) => {
    const point = LAKE_SHORELINE[index];
    const a = LAKE_SHORELINE[index - 1];
    const b = LAKE_SHORELINE[index + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const nx = dz / length;
    const nz = -dx / length;
    const side = lakeSignedDistance(point.x + nx, point.z + nz) > 0 ? 1 : -1;
    return [assetId, point.x + side * nx * bankOffset, point.z + side * nz * bankOffset,
      size, Math.atan2(-dz, dx) + turn];
  });
  return { id, region: 'b', coordinateSpace: 'world', shoreBand: 'front', entries };
}

// One set of authored world-space scenes for all viewing angles. Leaving
// sections of sand empty is part of each composition.
export const DESERT_DECORATION_LAYOUT: readonly DesertDecorationGroup[] = [
  {
    id: 'oasis-first-court-frame', region: 'a', coordinateSpace: 'world',
    // Pivots compensate for the offset of the roots from the crown centre, so
    // the planted points match the earlier /v004 view despite the new crown.
    entries: [['small-tree-2', 89.868, 15.911, 3.0, -.8, 'height', true]],
  },
  {
    id: 'dune-road-tree-silhouettes', region: 'a', coordinateSpace: 'world',
    entries: [
      ['small-tree-2', 188.178, 25.085, 2.4, 1.33, 'height', true],
      ['small-tree-2', 190.368, -11.835, 3.6, -.77, 'height', true],
    ],
  },
  {
    id: 'gallery-entry-foreground-rock-garden', region: 'a', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['rock-shrub-3', 117.18, 23.38, 2.93, .42],
      ['shrub-2', 115.61, 24.22, .42, -.83, 'height'],
      ['r02', 118.60, 24.08, 1.06, .86],
    ],
  },
  {
    id: 'gallery-entry-west-tree-foot', region: 'a', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['rock-shrub-3', 90.4, 17.1, 1.86, -.33],
    ],
  },
  wallRootGroup('gallery-entry-east-wall-echo', 'a', 'courtyard', [
    ['r02', 2.05, -4.45, 1.20, .71],
    ['shrub-2', 3.15, -5.8, .49, -.55, 'height'],
  ], { axis: 'x', face: .3, outward: 1, collider: 'courtyard-side-wall-east' }),
  {
    id: 'dune-road-tree-foot', region: 'a', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['rock-shrub-3', 190.72, -9.35, 1.82, .51],
    ],
  },
  {
    id: 'dune-bend-low-outcrop', region: 'a', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['rock-shrub-3', 129.05, 12.8, 2.78, -.85],
      ['shrub-2', 128.1, 10.03, .34, .79, 'height'],
      ['r02', 131.4, 11.45, 1.05, 1.38],
    ],
  },
  {
    id: 'dune-bend-quiet-reply', region: 'a', coordinateSpace: 'world', settleRocks: true,
    entries: [['rock-shrub-3', 131.45, 28.35, 1.27, 1.07]],
  },
  {
    id: 'ridge-overlook-foreground-outcrop', region: 'a', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['rock-shrub-3', 152.85, 13.2, 2.82, .89],
      ['r02', 154.2, 12.48, 1.35, 1.54],
    ],
  },
  {
    id: 'valley-descent-outcrop', region: 'a', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['rock-shrub-3', 179.25, 28.20, 2.35, .87],
      ['r02', 180.68, 29.30, 1.28, -1.17],
    ],
  },
  {
    id: 'valley-road-foreground-ochre', region: 'a', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['rock-shrub-3', 202.50, 6.25, 2.52, .63],
      ['r02', 201.32, 7.21, .87, -1.4],
    ],
  },
  shorePatch('crescent-south-pocket', [
    ['w01b', 66, .92, 1.05, -.37], ['shrub-1', 67, 2.05, 1.20, .4],
    ['r02', 68, 1.73, 1.30, .53], ['w01b', 69, .84, 1.23, -.49],
    ['shrub-2', 70, 1.82, 1.31, 1.07],
  ]),
  shorePatch('crescent-mid-pocket', [
    ['w01b', 54, .83, 1.08, .41], ['shrub-2', 55, 1.8, .92, .94],
    ['w01b', 56, .94, 1.34, -.32], ['r02', 57, 1.65, 1.16, .18],
    ['shrub-1', 58, 1.91, 1.42, 2.13],
  ]),
  {
    id: 'east-courtyard-wall', region: 'c', coordinateSpace: 'music-local', venue: 'music',
    entries: [
      ['rock-shrub-3', 67.1, -6.6, 1.05, .52],
      ['shrub-2', 67.9, -8.8, .70, -.25, 'height'],
    ],
  },
  wallRootGroup('pavilion-front-west-root', 'c', 'music', [
    ['rock-shrub-3', 31.7, 4.77, 1.47, .81],
    ['shrub-1', 33.2, 4.76, 1.12, 1.38],
  ], { axis: 'z', face: 3.25, outward: 1, collider: 'music-court-front-west' }),
  wallRootGroup('pavilion-front-east-root', 'c', 'music', [
    ['rock-shrub-3', 67.0, 4.8, 1.06, -1.03],
    ['shrub-2', 68.45, 4.8, .79, -.34, 'height'],
  ], { axis: 'z', face: 3.25, outward: 1, collider: 'music-court-front-east' }),
  {
    id: 'gobi-route-far-bends', region: 'd', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['rock-shrub-3', 260.0, 14.1, 1.92, -.64],
      ['r02', 261.15, 14.98, .92, .26],
      ['rock-shrub-3', 279.25, 40.30, 1.87, .94],
      ['r02', 280.70, 41.12, .78, -1.20],
    ],
  },
  {
    id: 'gobi-route-close-accents', region: 'd', coordinateSpace: 'world', settleRocks: true,
    entries: [
      ['shrub-2', 283.7, 25.65, .35, -.61, 'height'],
      ['r02', 274.4, 33.2, .83, 1.45],
    ],
  },
];
