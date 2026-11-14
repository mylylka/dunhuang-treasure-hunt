import {
  TERRAIN_ANCHORS, TERRAIN_BOUNDS, TERRAIN_REGIONS, TERRAIN_SESSION_KEY, TERRAIN_SPAWN, TERRAIN_SCENERY_SOURCE_OVERRIDES,
  LAKE_BOUNDS, LAKE_SHORELINE, fromTerrainPoint, lakeMayBeWithin, lakeSignedDistance, terrainHeight, toTerrainPoint,
  type TerrainRegion,
  TERRAIN_COURTYARD_EXPANSION, terrainCourtyardPartTransform,
} from '../content/world/terrain-layout-v001';
import { isWalkable, PLAYER_RADIUS, WORLD_COLLIDERS, type WorldCollider } from './movement';
import {courtyardHallSurfaceHeight,retiredCourtyardHallCollider,TERRAIN_FIRST_GALLERY_HALL_PLAYER_SOLIDS,TERRAIN_HALL_PLAYER_SOLIDS} from './terrain-hall-v003';
import { MUSIC_PLAYER_COLLIDERS_V4, MUSIC_SOLIDS_V4, musicSurfaceHeightV4, inMusicCourtV4 } from './music-pavilion-rules-v004';
import {MUSIC_COURTYARD_TREE,musicCourtyardRelocationForProp,relocatedMusicPoint} from '../content/world/music-courtyard-tree-v001';
import { MOGAO_SESSION_OPTIONS, mogaoSurfaceHeight, inMogaoRoom } from './mogao-rules-v012';
import type { WorldPoint } from './types';
import { TERRAIN_TOWER_TREES } from '../content/world/terrain-trees-v001';
import { PATTERN_STATION_SOLIDS } from './pattern-interactives';
import { CAISSON_ONLY_HIDDEN_COURTYARD_OBJECTS } from './caisson-only-props';
import { COURTYARD_ROCK_SCALE, ENLARGED_COURTYARD_ROCKS } from '../content/world/courtyard-rock-refinement-v001';

export * from '../content/world/terrain-layout-v001';

/** Furniture uses the same source-space rigid transform as the loaded mesh. */
function relocatedMusicCollider(collider:WorldCollider):WorldCollider{
  const relocation=musicCourtyardRelocationForProp(collider.id??'');
  if(!relocation)return collider;
  const points=(collider.polygon??[[collider.minX,collider.minZ],[collider.maxX,collider.minZ],[collider.maxX,collider.maxZ],[collider.minX,collider.maxZ]])
    .map(([x,z])=>relocatedMusicPoint({x,z},relocation));
  return {...collider,minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z)),
    ...(collider.circle?{circle:{...collider.circle,...relocatedMusicPoint(collider.circle,relocation)}}:{}),polygon:points.map(p=>[p.x,p.z])};
}
const musicTreeBounds=MUSIC_COURTYARD_TREE.playerBounds;
const musicTreeCollider:WorldCollider={id:MUSIC_COURTYARD_TREE.id,minX:musicTreeBounds.min[0],maxX:musicTreeBounds.max[0],minZ:musicTreeBounds.min[2],maxZ:musicTreeBounds.max[2],height:musicTreeBounds.max[1]};
export const TERRAIN_MUSIC_LOCAL_SOLIDS=[...MUSIC_SOLIDS_V4.filter(s=>s.id?.startsWith('music-')).map(relocatedMusicCollider),musicTreeCollider];

/** Transform existing architecture proxies together with the original meshes. */
function transformedCollider(region: TerrainRegion, collider: WorldCollider): WorldCollider {
  const sourceOverride = collider.id ? TERRAIN_SCENERY_SOURCE_OVERRIDES[region]?.[collider.id] : undefined;
  if (sourceOverride) {
    const center = collider.circle ?? { x: (collider.minX + collider.maxX) / 2, z: (collider.minZ + collider.maxZ) / 2 };
    const dx = sourceOverride.x - center.x, dz = sourceOverride.z - center.z;
    collider = { ...collider, minX: collider.minX + dx, maxX: collider.maxX + dx, minZ: collider.minZ + dz, maxZ: collider.maxZ + dz,
      ...(collider.circle ? { circle: { ...collider.circle, ...sourceOverride } } : {}),
      ...(collider.polygon ? { polygon: collider.polygon.map(([x, z]) => [x + dx, z + dz]) } : {}) };
  }
  const points = (collider.polygon ?? [[collider.minX, collider.minZ], [collider.maxX, collider.minZ], [collider.maxX, collider.maxZ], [collider.minX, collider.maxZ]])
    .map(([x, z]) => toTerrainPoint(region, { x, z }));
  const center = toTerrainPoint(region, collider.circle ?? { x: (collider.minX + collider.maxX) / 2, z: (collider.minZ + collider.maxZ) / 2 });
  const isGroundProp = !!collider.circle || !!collider.id?.startsWith('rock-') || !!collider.id?.startsWith('pot-');
  const base = isGroundProp ? terrainHeight(center.x, center.z) : TERRAIN_REGIONS[region].target.y - TERRAIN_REGIONS[region].source.y;
  return {
    ...collider, id: `terrain-${region}-${collider.id ?? 'wall'}`,
    minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
    minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)),
    height: base + collider.height,
    ...(collider.circle ? { circle: { ...collider.circle, x: center.x, z: center.z } }
      : { polygon: points.map(p => [p.x, p.z]) }),
  };
}
const courtyardEnd = WORLD_COLLIDERS.findIndex(collider => collider.id === 'music-placeholder');
/** Legacy proxies have no wall IDs; identify the five perimeter pieces by footprint. */
function expandCourtyardPerimeter(collider: WorldCollider): WorldCollider {
  if (collider.id || collider.circle) return collider;
  const x = (collider.minX + collider.maxX) / 2, z = (collider.minZ + collider.maxZ) / 2;
  const id = z === -11 && (x === -22 || x === -2) ? 'courtyard-side-wall'
    : z === -24 && x === -12 ? 'courtyard-rear-wall'
      : z === 2 && (x === -18.5 || x === -5.5) ? 'entrance-wing' : undefined;
  const transform = id && terrainCourtyardPartTransform(id, x);
  return transform ? { ...collider, id: `${id}-${x < -12 ? 'west' : 'east'}`,
    minX: collider.minX * transform.scaleX + transform.offsetX,
    maxX: collider.maxX * transform.scaleX + transform.offsetX } : collider;
}
export const TERRAIN_COURTYARD_LOCAL_COLLIDERS = [
  ...WORLD_COLLIDERS.slice(0, courtyardEnd)
    .filter(collider => !collider.id?.startsWith('tree-')&&!retiredCourtyardHallCollider(collider)).map(expandCourtyardPerimeter),
  ...TERRAIN_HALL_PLAYER_SOLIDS,
];
const revisedWorkshop = new Set(['hall-v003-workbench', 'hall-v003-pattern-display', 'hall-v003-pigment-rack']);
const revisedWorkshopSources = new Map(TERRAIN_FIRST_GALLERY_HALL_PLAYER_SOLIDS
  .filter(solid => revisedWorkshop.has(solid.id ?? '')).map(solid => [solid.id, solid]));
export const TERRAIN_FIRST_GALLERY_COURTYARD_LOCAL_COLLIDERS = TERRAIN_COURTYARD_LOCAL_COLLIDERS
  .map(solid => enlargeReviewedRockCollider(revisedWorkshopSources.get(solid.id) ?? solid));
function enlargeReviewedRockCollider(collider: WorldCollider): WorldCollider {
  if (!ENLARGED_COURTYARD_ROCKS.has(collider.id ?? '')) return collider;
  const center = collider.circle ?? {x: (collider.minX + collider.maxX) / 2, z: (collider.minZ + collider.maxZ) / 2};
  return { ...collider,
    minX: center.x + (collider.minX - center.x) * COURTYARD_ROCK_SCALE,
    maxX: center.x + (collider.maxX - center.x) * COURTYARD_ROCK_SCALE,
    minZ: center.z + (collider.minZ - center.z) * COURTYARD_ROCK_SCALE,
    maxZ: center.z + (collider.maxZ - center.z) * COURTYARD_ROCK_SCALE,
    height: collider.height * COURTYARD_ROCK_SCALE,
    ...(collider.circle ? {circle: {...collider.circle, radius: collider.circle.radius * COURTYARD_ROCK_SCALE}} : {}),
    ...(collider.polygon ? {polygon: collider.polygon.map(([x, z]) => [center.x + (x - center.x) * COURTYARD_ROCK_SCALE, center.z + (z - center.z) * COURTYARD_ROCK_SCALE])} : {}),
  };
}
function padCourtyardCollider(collider: WorldCollider): WorldCollider {
  return {
    ...collider, minX: collider.minX - .21, maxX: collider.maxX + .21, minZ: collider.minZ - .21, maxZ: collider.maxZ + .21,
    ...(collider.circle ? { circle: { ...collider.circle, radius: collider.circle.radius + .21 } } : {}),
  };
}
const courtyardSolids = TERRAIN_COURTYARD_LOCAL_COLLIDERS.map(padCourtyardCollider);
const sampleTree: WorldCollider = { id: 'sample-tree-a', minX: 1.78, maxX: 4.22, minZ: 3.78, maxZ: 6.22, height: 2.1, circle: { x: 3, z: 5, radius: 1.22 } };
export const TERRAIN_PLAYER_COLLIDERS: readonly WorldCollider[] = [
  ...[...courtyardSolids, sampleTree].map(collider => transformedCollider('courtyard', collider)),
  ...PATTERN_STATION_SOLIDS.map(collider => transformedCollider('courtyard', collider)),
  ...[...MUSIC_PLAYER_COLLIDERS_V4.filter(collider => collider.id?.startsWith('music-')).map(relocatedMusicCollider),musicTreeCollider].map(collider => transformedCollider('music', collider)),
  ...MOGAO_SESSION_OPTIONS.colliders.filter(collider => collider.id?.startsWith('mogao-v8-')).map(collider => transformedCollider('cliff', collider)),
  ...TERRAIN_TOWER_TREES.map(tree => {
    const p = toTerrainPoint('cliff', tree.placement), radius = tree.collisionRadii.player;
    return { id: tree.id, minX: p.x - radius, maxX: p.x + radius, minZ: p.z - radius, maxZ: p.z + radius,
      height: terrainHeight(p.x, p.z) + tree.placement.height, circle: { x: p.x, z: p.z, radius } };
  }),
  { id: 'terrain-lake', ...LAKE_BOUNDS, height: 0, padding: .35, polygon: LAKE_SHORELINE.map(p => [p.x, p.z]) },
];
const firstGalleryFurniture = [...revisedWorkshopSources.values()]
  .map(solid => transformedCollider('courtyard', padCourtyardCollider(solid)));
const firstGalleryRocks = TERRAIN_FIRST_GALLERY_COURTYARD_LOCAL_COLLIDERS
  .filter(solid => ENLARGED_COURTYARD_ROCKS.has(solid.id ?? ''))
  .map(solid => transformedCollider('courtyard', padCourtyardCollider(solid)));
const firstGalleryById = new Map([...firstGalleryFurniture, ...firstGalleryRocks].map(solid => [solid.id, solid]));
export const TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS: readonly WorldCollider[] = TERRAIN_PLAYER_COLLIDERS
  .map(solid => firstGalleryById.get(solid.id ?? '') ?? solid);
export const TERRAIN_CAISSON_ONLY_PLAYER_COLLIDERS = TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS.filter(
  solid => solid.id !== 'terrain-courtyard-mural-station' && solid.id !== 'terrain-courtyard-coloring-station'
    && !CAISSON_ONLY_HIDDEN_COURTYARD_OBJECTS.has((solid.id ?? '').replace(/^terrain-courtyard-/, '')),
);

/** Sand is continuous; building floors and accepted stair ramps retain scale. */
export function terrainSurfaceHeight(p: WorldPoint): number {
  const courtyard = fromTerrainPoint('courtyard', p);
  const floor = TERRAIN_COURTYARD_EXPANSION.floor;
  if (courtyard.x >= floor.minX && courtyard.x <= floor.maxX && courtyard.z >= floor.minZ && courtyard.z <= floor.maxZ)
    return TERRAIN_REGIONS.courtyard.target.y + courtyardHallSurfaceHeight(courtyard);
  const music = fromTerrainPoint('music', p);
  if (inMusicCourtV4(music)) return TERRAIN_REGIONS.music.target.y + musicSurfaceHeightV4(music);
  const cliff = fromTerrainPoint('cliff', p), x = cliff.x - 122, depth = -68 - cliff.z;
  if (inMogaoRoom(cliff) || (Math.abs(x) <= 5.2 && depth >= -29 && depth < -10)
    || (Math.abs(x) <= 12.5 && depth >= -10 && depth <= 3.1) || (Math.abs(x) <= 3.04 && depth >= 3 && depth <= 7.1))
    return TERRAIN_REGIONS.cliff.target.y + mogaoSurfaceHeight(cliff);
  return terrainHeight(p.x, p.z);
}

/** Building camera proxies apply around their complete transformed extents. */
export function terrainRegionAt(p: WorldPoint): TerrainRegion | null {
  const courtyard = fromTerrainPoint('courtyard', p);
  if (courtyard.x >= -42 && courtyard.x <= 18 && courtyard.z >= -41 && courtyard.z <= 24) return 'courtyard';
  const music = fromTerrainPoint('music', p);
  if (music.x >= 7 && music.x <= 87 && music.z >= -49 && music.z <= 28) return 'music';
  const cliff = fromTerrainPoint('cliff', p);
  if (cliff.x >= 42 && cliff.x <= 202 && cliff.z >= -132 && cliff.z <= -23) return 'cliff';
  return null;
}
export const TERRAIN_MAX_WALK_SLOPE = Math.tan(36 * Math.PI / 180);
function surfaceSlope(p: WorldPoint) {
  const e = .25;
  const dx = (terrainSurfaceHeight({ x: p.x + e, z: p.z }) - terrainSurfaceHeight({ x: p.x - e, z: p.z })) / (2 * e);
  const dz = (terrainSurfaceHeight({ x: p.x, z: p.z + e }) - terrainSurfaceHeight({ x: p.x, z: p.z - e })) / (2 * e);
  return Math.hypot(dx, dz);
}
export function isTerrainWalkable(p: WorldPoint, firstGallery = false, caissonOnly = false): boolean {
  const bankClearance = PLAYER_RADIUS + .35;
  return isWalkable(p, caissonOnly ? TERRAIN_CAISSON_ONLY_PLAYER_COLLIDERS : firstGallery ? TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS : TERRAIN_PLAYER_COLLIDERS, TERRAIN_BOUNDS)
    && (!lakeMayBeWithin(p.x, p.z, bankClearance) || lakeSignedDistance(p.x, p.z) >= bankClearance - .00001)
    && surfaceSlope(p) <= TERRAIN_MAX_WALK_SLOPE;
}
export function sanitizeTerrainPosition(p: WorldPoint, firstGallery = false, caissonOnly = false): WorldPoint {
  return isTerrainWalkable(p, firstGallery, caissonOnly) ? { ...p } : { ...TERRAIN_SPAWN };
}
export const TERRAIN_SESSION_OPTIONS = {
  key: TERRAIN_SESSION_KEY, bounds: TERRAIN_BOUNDS, colliders: TERRAIN_PLAYER_COLLIDERS,
  spawn: TERRAIN_SPAWN, sanitizePosition: sanitizeTerrainPosition, freeYaw: true,
};
export const TERRAIN_FIRST_GALLERY_SESSION_OPTIONS = {
  ...TERRAIN_SESSION_OPTIONS, colliders: TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS,
  sanitizePosition: (point: WorldPoint) => sanitizeTerrainPosition(point, true),
};
export const TERRAIN_CAISSON_ONLY_SESSION_OPTIONS = {
  ...TERRAIN_FIRST_GALLERY_SESSION_OPTIONS, colliders: TERRAIN_CAISSON_ONLY_PLAYER_COLLIDERS,
  spawn: { ...TERRAIN_SPAWN, heading: TERRAIN_REGIONS.courtyard.yaw },
  sanitizePosition: (point: WorldPoint) => sanitizeTerrainPosition(point, true, true),
};

/** Substeps stop tunnelling through walls, steep banks and either crescent tip. */
export function moveTerrainPlayer(position: WorldPoint, delta: WorldPoint, firstGallery = false, caissonOnly = false): WorldPoint {
  const length = Math.hypot(delta.x, delta.z);
  if (!Number.isFinite(length) || !length) return { ...position };
  const count = Math.ceil(length / (PLAYER_RADIUS * .4)), steps = Math.min(128, count), fraction = Math.min(1, 128 / count) / steps;
  let result = { ...position };
  for (let i = 0; i < steps; i++) {
    const step = { x: delta.x * fraction, z: delta.z * fraction }, combined = { x: result.x + step.x, z: result.z + step.z };
    if (isTerrainWalkable(combined, firstGallery, caissonOnly) && Math.abs(terrainSurfaceHeight(combined) - terrainSurfaceHeight(result)) <= Math.hypot(step.x, step.z) * TERRAIN_MAX_WALK_SLOPE + .035) {
      result = combined; continue;
    }
    // Slide along an actual obstacle only after trying the intended diagonal;
    // splitting every clear diagonal into X/Z could catch a rotated door jamb.
    for (const axis of ['x', 'z'] as const) {
      const distance = delta[axis] * fraction;
      if (!distance) continue;
      const next = { ...result, [axis]: result[axis] + distance };
      if (isTerrainWalkable(next, firstGallery, caissonOnly) && Math.abs(terrainSurfaceHeight(next) - terrainSurfaceHeight(result)) <= Math.abs(distance) * TERRAIN_MAX_WALK_SLOPE + .035) result = next;
    }
  }
  return result;
}

// Stable local safe anchors are available without importing rendering modules.
export const TERRAIN_SAFE_POINTS = { courtyard: TERRAIN_ANCHORS.courtyardSafe, music: TERRAIN_ANCHORS.musicSafe, cliff: TERRAIN_ANCHORS.cliffStairFoot };
