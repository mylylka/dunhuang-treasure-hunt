import { Euler, Matrix4, Vector3 } from 'three';
import assetBounds from '../content/world/desert-decoration-bounds-v001.json';
import additionalBounds from '../content/world/desert-decoration-bounds-v002.json';
import courtyardBounds from '../content/world/desert-decoration-bounds-v004.json';
import shrubBounds from '../content/world/desert-decoration-bounds-v006.json';
import {
  DESERT_DECORATION_LAYOUT,
  DESERT_DECORATION_PREVIOUS_LAYOUT,
  type DesertDecorationGroup,
  type DesertDecorationAssetId,
  type DesertDecorationRegion,
  type DesertDecorationVenue,
} from '../content/world/desert-decoration-layout-v001';
import { environmentSurfaceHeight } from '../content/world/environment-layout-v001';
import { groundRoadClearance } from '../content/world/environment-ground-v001';
import musicInterior from '../content/world/music-interior-v005.json';
import {
  LAKE_WATER_LEVEL, TERRAIN_ANCHORS, TERRAIN_BOUNDS, TERRAIN_REGIONS,
  fromTerrainPoint, lakeMayBeWithin, lakeSignedDistance, toTerrainPoint,
} from '../content/world/terrain-layout-v001';
import { TERRAIN_TOWER_TREES } from '../content/world/terrain-trees-v001';
import { createMusicInteriorNavigation, musicInteriorToWorld } from './music-interior-navigation';
import { overlapsPolygon } from './movement';
import { terrainPlantFits, terrainRoadClearance } from './terrain-planting-v003';
import { COMPOSED_CONNECTED_TERRAIN_PLAYER_COLLIDERS, CONNECTED_TERRAIN_PLAYER_COLLIDERS } from './terrain-rules-v001';
import type { WorldPoint } from './types';

export interface DesertDecorationPlacement extends WorldPoint {
  id: string;
  region: DesertDecorationRegion;
  assetId: DesertDecorationAssetId;
  y: number;
  yaw: number;
  pitch?: number;
  roll?: number;
  scale: number;
  distance: number;
  castShadow: boolean;
  shoreBand?: DesertDecorationGroup['shoreBand'];
  roadVerge?: DesertDecorationGroup['roadVerge'];
  wallRoot?: true;
  venue?: DesertDecorationVenue;
  requiresMusicCourtyard?: true;
}

// Distance is the visual range, never a reason to stream the whole map at startup.
const boundsByAsset = { ...assetBounds, ...additionalBounds, ...courtyardBounds, ...shrubBounds };
const assetDistances: Record<DesertDecorationAssetId, number> = {
  r01: 32, g02: 34, c04: 43, c01b: 48, c03b: 49, s04b: 37,
  t01: 112, t02: 116, t03: 128, s02: 62, w01b: 72,
  'rock-shrub-3': 31, 'shrub-1': 45, 'shrub-2': 64, 'small-tree-2': 80,
  r02: 49, r03: 74, r04: 65, c02: 60,
};
const court = musicInterior.surfaces.find(surface => surface.id === 'music-courtyard')!;
const courtPaving = { minX: 24.4, maxX: 69.6, minZ: -28.3, maxZ: 2.6, height: .035 };
const towerTrees = TERRAIN_TOWER_TREES.map(tree => ({
  position: toTerrainPoint('cliff', tree.placement),
  radius: tree.collisionRadii.camera,
}));
const contactBounds: Partial<Record<DesertDecorationAssetId, readonly [x: number, z: number, width: number, depth: number]>> = {
  // Low root seats measured from the running meshes. Full clearance still uses
  // the model bounds, including the leaves and spread of the canopy.
  w01b: [.034, .013, .604, .382],
  'shrub-2': [-.0445, .0186, .585, .643],
  s02: [.0054, .0671, .067, .072],
  g02: [.0105, .021, .531, .392],
  t01: [.00933, .06094, .192, .192],
  t02: [-.04292, .01266, .262, .262],
  t03: [-.32110, -.05264, .326, .326],
  'small-tree-2': [.02246, .09131, .51904, .49756],
};
const tiltStones = new Set<DesertDecorationAssetId>(['r01', 'r02', 'r04', 'c01b', 'c02', 'c03b', 'c04', 'rock-shrub-3']);
// The exposed low edges of the source rocks when they rest on either long side.
// These are measured mesh vertices, excluding empty bounding-box corners.
const rockSideContacts = {
  r02: {
    positive: [[-.52626, .02727, -.16609], [-.48031, 0, -.15243], [-.4929, .02096, -.05125]],
    negative: [[.56, .1077, -.03442], [.50065, .07628, -.03165], [.53712, .11133, -.16336]],
  },
  r04: {
    positive: [[-.69677, 0, -.18789], [-.5917, 0, .05308], [-.54684, 0, -.41885]],
    negative: [[.73788, 0, -.00072], [.69113, 0, .15074], [.605, 0, -.14239]],
  },
} as const;

function distanceToRect(point: WorldPoint, bounds: typeof TERRAIN_BOUNDS) {
  return Math.hypot(
    Math.max(bounds.minX - point.x, point.x - bounds.maxX, 0),
    Math.max(bounds.minZ - point.z, point.z - bounds.maxZ, 0),
  );
}

type DecorationColliders = typeof CONNECTED_TERRAIN_PLAYER_COLLIDERS;

function overlapsExistingOutdoorSolid(point: WorldPoint, radius: number, colliders: DecorationColliders, alignedWall?: string) {
  return colliders.some(solid => {
    const clearance = radius + (solid.padding ?? 0);
    if (solid.id === 'terrain-lake' || solid.id === alignedWall || distanceToRect(point, solid) >= clearance) return false;
    if (solid.circle) {
      return Math.hypot(point.x - solid.circle.x, point.z - solid.circle.z) < clearance + solid.circle.radius;
    }
    return !solid.polygon || overlapsPolygon(point, solid.polygon, clearance);
  });
}

function isOutdoorFootprintClear(group: DesertDecorationGroup, point: WorldPoint, radius: number, height: number, colliders: DecorationColliders) {
  const { region, shoreBand, wallRoot, wallAlignment, roadVerge } = group;
  const { x, z } = point;
  const edgeMargin = radius + 1.1;
  if (x - edgeMargin < TERRAIN_BOUNDS.minX || x + edgeMargin > TERRAIN_BOUNDS.maxX
    || z - edgeMargin < TERRAIN_BOUNDS.minZ || z + edgeMargin > TERRAIN_BOUNDS.maxZ) return false;
  // The original landscape check predates the deeper music courtyard in v005.
  const musicLocal = fromTerrainPoint('music', point);
  const lakeDistance = shoreBand || region === 'b' || lakeMayBeWithin(x, z, edgeMargin)
    ? lakeSignedDistance(x, z) : Infinity;
  if (shoreBand) {
    // Soft shoreline leaves can overhang water. The planted root centre stays
    // on the dry side and still clears walls, the causeway and all hard props.
    return lakeDistance > .18 && lakeDistance < 9
      && distanceToRect(musicLocal, court) > radius + .20
      && groundRoadClearance(x, z) > radius + .7
      && !overlapsExistingOutdoorSolid(point, radius + .06, colliders);
  }
  if (roadVerge) {
    const roadGap = groundRoadClearance(point.x, point.z) - radius;
    // Additions may hug the edge. No part of the conservative footprint can
    // reach the paving, the player's running line, or the adjacent structures.
    return roadGap >= .25 && roadGap <= 1.0 && lakeDistance > radius + .5
      && distanceToRect(musicLocal, court) > radius + .35
      && !overlapsExistingOutdoorSolid(point, radius + .13, colliders);
  }
  if (wallRoot) {
    // Authored strips intentionally approach outer walls. Use the actual wall
    // solids here, then preserve a full-width walking lane clear of the art.
    if (lakeDistance < radius + .3 || terrainRoadClearance(point) < radius + .55
      || overlapsExistingOutdoorSolid(point, radius + .045, colliders, wallAlignment?.collider)) return false;
    if (region === 'c' && !wallAlignment && distanceToRect(musicLocal, court) < radius + .2) return false;
    if (region === 'd') {
      const cliffLocal = fromTerrainPoint('cliff', point);
      return Math.abs(cliffLocal.x - 122) > 7.35 + radius;
    }
    return true;
  }
  if (!terrainPlantFits(point, radius) || overlapsExistingOutdoorSolid(point, radius + .3, colliders)) return false;
  if (distanceToRect(musicLocal, court) <= edgeMargin + .25) return false;
  if (region === 'b' && lakeDistance > 25) return false;

  // Tall scenery sits beyond the follow-camera arm along either walking route.
  if (height >= 1.35 && terrainRoadClearance(point) < radius + 8.5) return false;
  if (region === 'd') {
    const stair = TERRAIN_ANCHORS.cliffStairFoot;
    if (Math.hypot(x - stair.x, z - stair.z) < radius + 13
      || towerTrees.some(tree => Math.hypot(x - tree.position.x, z - tree.position.z) < radius + tree.radius)) return false;
  }
  return true;
}

function sampleFootprint(point: WorldPoint, width: number, depth: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [-width / 2, 0, width / 2].flatMap(x => [-depth / 2, 0, depth / 2].map(z => ({
    x: point.x + c * x + s * z,
    z: point.z - s * x + c * z,
  })));
}

export function desertDecorationRootFootprint(point: WorldPoint, assetId: DesertDecorationAssetId, scale: number, yaw: number) {
  const contact = contactBounds[assetId];
  const bounds = boundsByAsset[assetId];
  if (!contact) return sampleFootprint(point, bounds.width * scale, bounds.depth * scale, yaw);
  const [centerX, centerZ, contactWidth, contactDepth] = contact.map(n => n * scale);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return sampleFootprint({
    x: point.x + c * centerX + s * centerZ,
    z: point.z - s * centerX + c * centerZ,
  }, contactWidth, contactDepth, yaw);
}

function alignWithWall(group: DesertDecorationGroup, original: WorldPoint, assetId: DesertDecorationAssetId,
  width: number, depth: number, height: number, scale: number, yaw: number, radius: number, colliders: DecorationColliders) {
  const wall = group.wallAlignment;
  if (!wall) return original;
  const yawLocal = yaw - TERRAIN_REGIONS[wall.region].yaw;
  const local = fromTerrainPoint(wall.region, original);
  const root = desertDecorationRootFootprint({ x: 0, z: 0 }, assetId, scale, yawLocal);
  const full = sampleFootprint({ x: 0, z: 0 }, width, depth, yawLocal);
  const extent = (footprint: WorldPoint[]) => Math.max(...footprint.map(p => -wall.outward * p[wall.axis]));
  const foliage = assetId === 'g02' || assetId === 'shrub-1' || assetId === 'shrub-2';
  // Root and rock surfaces remain outside the wall. Only foliage tips can
  // touch its base, without needing the broad player collision margin.
  const targetGap = foliage ? Math.max(extent(root) + .055, extent(full) - .12) : extent(full) + .07;
  const originalGap = (local[wall.axis] - wall.face) * wall.outward;
  if (targetGap >= originalGap) return original;
  for (let gap = targetGap; gap < originalGap; gap += .075) {
    const point = toTerrainPoint(wall.region, { ...local, [wall.axis]: wall.face + wall.outward * gap });
    if (isOutdoorFootprintClear(group, point, radius, height, colliders)
      && outdoorGround(desertDecorationRootFootprint(point, assetId, scale, yaw), height, group) !== null) return point;
  }
  return original;
}

function seatScaledShore(group: DesertDecorationGroup, original: WorldPoint, assetId: DesertDecorationAssetId,
  height: number, scale: number, yaw: number, radius: number, colliders: DecorationColliders) {
  const { x, z } = original;
  const e = .16;
  const dx = lakeSignedDistance(x + e, z) - lakeSignedDistance(x - e, z);
  const dz = lakeSignedDistance(x, z + e) - lakeSignedDistance(x, z - e);
  const gradient = Math.hypot(dx, dz);
  if (gradient < .00001) return null;
  const nx = dx / gradient;
  const nz = dz / gradient;
  // Keep the authored site first. Move inland only as far as the measured
  // larger roots need, with limited along-bank offsets near a wall or bend.
  const offsets = [0, .5, -.5, 1, -1, 1.5, -1.5, 2.3, -2.3, 3.4, -3.4];
  for (const tangent of offsets) {
    const base = { x: x - nz * tangent, z: z + nx * tangent };
    const roots = desertDecorationRootFootprint(base, assetId, scale, yaw);
    const leastDry = Math.min(...roots.map(root => lakeSignedDistance(root.x, root.z)));
    // A root cannot gain more dry clearance than the actual travel distance.
    const firstStep = Math.max(0, Math.ceil((.035 - leastDry) * 10 - .00001));
    for (let step = firstStep; step <= 35; step++) {
      const inward = step / 10;
      const point = { x: base.x + nx * inward, z: base.z + nz * inward };
      if (!isOutdoorFootprintClear(group, point, radius, height, colliders)) continue;
      const contacts = roots.map(root => ({ x: root.x + nx * inward, z: root.z + nz * inward }));
      const dry = contacts.every(root => lakeSignedDistance(root.x, root.z) >= .035)
        && contacts.every(root => environmentSurfaceHeight(root.x, root.z) > LAKE_WATER_LEVEL + .025);
      if (dry) return point;
    }
  }
  return null;
}

function outdoorGround(points: WorldPoint[], height: number, group: DesertDecorationGroup) {
  const heights = points.map(p => environmentSurfaceHeight(p.x, p.z));
  const lowest = Math.min(...heights);
  const variation = Math.max(...heights) - lowest;
  if (group.shoreBand) {
    // Seat the model in the sculpted beach even when the near-water triangles
    // slope down sharply. Shore foliage can overhang the water from dry roots.
    return Math.max(LAKE_WATER_LEVEL - .19, lowest - .022);
  }
  // Seat the base in the slope, but skip terrain that would bury appreciably
  // more of a low asset. The placement remains at the authored point.
  const variationLimit = group.roadVerge ? Math.max(.18, height * .63) : Math.max(.13, height * .40);
  return variation <= variationLimit ? lowest - .006 : null;
}

function groundTilt(point: WorldPoint, width: number, depth: number, yaw: number) {
  const sampleDistance = .8;
  const h = (x: number, z: number) => environmentSurfaceHeight(x, z);
  const dx = (h(point.x + sampleDistance, point.z) - h(point.x - sampleDistance, point.z)) / (sampleDistance * 2);
  const dz = (h(point.x, point.z + sampleDistance) - h(point.x, point.z - sampleDistance)) / (sampleDistance * 2);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const cap = (angle: number) => Math.max(-.24, Math.min(.24, angle));
  const pitch = cap(-Math.atan(dx * s + dz * c));
  const roll = cap(Math.atan(dx * c - dz * s));
  const tilt = new Matrix4().makeRotationFromEuler(new Euler(pitch, yaw, roll, 'YXZ'));
  const bottom = [-width / 2, 0, width / 2].flatMap(x => [-depth / 2, 0, depth / 2].map(z => {
    const offset = new Vector3(x, 0, z).applyMatrix4(tilt);
    return h(point.x + offset.x, point.z + offset.z) - offset.y;
  }));
  return { y: Math.min(...bottom) - .012, variation: Math.max(...bottom) - Math.min(...bottom), pitch, roll };
}

function tiltedRockClearsWall(group: DesertDecorationGroup, point: WorldPoint, width: number, depth: number,
  height: number, yaw: number, pitch: number, roll: number) {
  const wall = group.wallAlignment;
  if (!wall) return true;
  const center = fromTerrainPoint(wall.region, point);
  const matrix = new Matrix4().makeRotationFromEuler(new Euler(pitch, yaw - TERRAIN_REGIONS[wall.region].yaw, roll, 'YXZ'));
  for (const x of [-width / 2, width / 2]) {
    for (const y of [0, height]) {
      for (const z of [-depth / 2, depth / 2]) {
        const offset = new Vector3(x, y, z).applyMatrix4(matrix);
        if ((center[wall.axis] + offset[wall.axis] - wall.face) * wall.outward < .05) return false;
      }
    }
  }
  return true;
}

function reorientedRockGround(point: WorldPoint, assetId: keyof typeof rockSideContacts, scale: number, yaw: number, roll: number) {
  const rotation = new Matrix4().makeRotationFromEuler(new Euler(0, yaw, roll, 'YXZ'));
  const contacts = rockSideContacts[assetId][roll > 0 ? 'positive' : 'negative'];
  return Math.max(...contacts.map(([x, y, z]) => {
    const offset = new Vector3(x, y, z).multiplyScalar(scale).applyMatrix4(rotation);
    return environmentSurfaceHeight(point.x + offset.x, point.z + offset.z) - offset.y;
  })) - .06 * scale;
}

function courtGround(
  localFootprint: WorldPoint[],
  nav: ReturnType<typeof createMusicInteriorNavigation>,
) {
  const { minX, maxX, minZ, maxZ, height } = courtPaving;
  for (const p of localFootprint) {
    // Narrow east-wall strip outside the entrance, mural and stair approaches.
    if (p.x < 65.5 || p.z < -13.5 || p.z > -4.5
      || p.x < minX || p.x > maxX || p.z < minZ || p.z > maxZ) return null;
    if (!nav.musicInteriorValid({ position: musicInteriorToWorld(p), surfaceId: court.id })) return null;
  }
  // The built stone pavers are 35 mm above the navigation floor.
  return TERRAIN_REGIONS.music.target.y + court.y + height - .005;
}

/** Resolve authored sites, with bounded dressing against the lake or wall plane. */
export function resolveDesertDecorations({ version }: { version?: 'v004' } = {}): DesertDecorationPlacement[] {
  const placements: DesertDecorationPlacement[] = [];
  const nav = createMusicInteriorNavigation({ compactBalcony: true });
  const previous = version === 'v004';
  const layout = previous ? DESERT_DECORATION_PREVIOUS_LAYOUT : DESERT_DECORATION_LAYOUT;
  const colliders = previous ? CONNECTED_TERRAIN_PLAYER_COLLIDERS : COMPOSED_CONNECTED_TERRAIN_PLAYER_COLLIDERS;
  for (const group of layout) {
    for (const [index, [assetId, x, z, target, authoredYaw, sizeBy, castShadow, restingRoll]] of group.entries.entries()) {
      const asset = boundsByAsset[assetId];
      const shoreFoliage = group.shoreBand && (assetId === 'w01b' || assetId === 'shrub-1' || assetId === 'shrub-2');
      const scale = (previous && shoreFoliage ? 3 : 1) * target / (sizeBy === 'height' ? asset.height : Math.max(asset.width, asset.depth));
      const width = asset.width * scale;
      const depth = asset.depth * scale;
      const height = asset.height * scale;
      const radius = Math.hypot(width, depth) / 2;
      const local = group.coordinateSpace === 'music-local';
      const yaw = authoredYaw + (local ? TERRAIN_REGIONS.music.yaw : 0);
      const original = local ? musicInteriorToWorld({ x, z }) : { x, z };
      const point = shoreFoliage ? seatScaledShore(group, original, assetId, height, scale, yaw, radius, colliders)
        : alignWithWall(group, original, assetId, width, depth, height, scale, yaw, radius, colliders);
      if (!point) continue;
      let y: number | null;
      let tilt: { pitch: number; roll: number } | undefined;
      if (local) {
        y = courtGround(sampleFootprint({ x, z }, width, depth, authoredYaw), nav);
      } else if (restingRoll !== undefined && (assetId === 'r02' || assetId === 'r04')) {
        const across = Math.cos(restingRoll) * width / 2 + Math.abs(Math.sin(restingRoll)) * height;
        const standingHeight = Math.cos(restingRoll) * height + Math.abs(Math.sin(restingRoll)) * width;
        if (!isOutdoorFootprintClear(group, point, Math.hypot(across, depth / 2), standingHeight, colliders)) continue;
        y = reorientedRockGround(point, assetId, scale, yaw, restingRoll);
        tilt = { pitch: 0, roll: restingRoll };
      } else {
        if (!isOutdoorFootprintClear(group, point, radius, height, colliders)) continue;
        const contact = desertDecorationRootFootprint(point, assetId, scale, yaw);
        y = outdoorGround(contact, height, group);
        if (group.settleRocks && tiltStones.has(assetId) && (!(group.roadVerge || group.wallAlignment) || y === null)) {
          const fit = groundTilt(point, width, depth, yaw);
          const tiltRadius = radius + height * Math.hypot(fit.pitch, fit.roll);
          if (fit.variation <= Math.max(.11, height * .37) && isOutdoorFootprintClear(group, point, tiltRadius, height, colliders)
            && tiltedRockClearsWall(group, point, width, depth, height, yaw, fit.pitch, fit.roll)) {
            y = fit.y;
            tilt = { pitch: fit.pitch, roll: fit.roll };
          }
        }
      }
      if (y === null) continue;
      placements.push({
        id: `${group.region}-${group.id}-${index + 1}`,
        region: group.region, assetId, x: point.x, y, z: point.z, yaw, scale,
        distance: group.shoreBand ? (group.shoreBand === 'front' ? 78 : 64) : assetDistances[assetId],
        castShadow: castShadow === true,
        ...(local ? { requiresMusicCourtyard: true as const } : {}),
        ...(group.shoreBand ? { shoreBand: group.shoreBand } : {}),
        ...(group.roadVerge ? { roadVerge: group.roadVerge } : {}),
        ...(group.wallRoot || local ? { wallRoot: true as const } : {}),
        ...(group.venue ? { venue: group.venue } : {}),
        ...tilt,
      });
    }
  }
  return placements;
}
