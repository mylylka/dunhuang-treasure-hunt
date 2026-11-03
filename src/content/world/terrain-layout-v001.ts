/** Approved terrain study. Metres, Y up; authored points always use {x,y,z}. */
export type TerrainRegion = 'courtyard' | 'music' | 'cliff';
export interface TerrainPoint { x: number; y: number; z: number }
export interface TerrainPlanPoint { x: number; y?: number; z: number }
export interface TerrainRoute { id: string; width: number; points: readonly TerrainPoint[] }
export const TERRAIN_REGIONS: Record<TerrainRegion, { source: TerrainPoint; target: TerrainPoint; yaw: number }> = {
  courtyard: { source: { x: -12, y: 0, z: 2 }, target: { x: 110, y: 12, z: 12 }, yaw: 24 * Math.PI / 180 },
  music: { source: { x: 46, y: 0, z: -9 }, target: { x: 185, y: 2.5, z: 15 }, yaw: -12 * Math.PI / 180 },
  cliff: { source: { x: 122, y: 0, z: -68 }, target: { x: 330, y: 10, z: 90 }, yaw: -160 * Math.PI / 180 },
};
export const TERRAIN_BOUNDS = { minX: -75, maxX: 430, minZ: -125, maxZ: 185 };
const spawnPoint = toTerrainPoint('courtyard', { x: -12, z: 6.8 });
export const TERRAIN_SPAWN = { x: spawnPoint.x, z: spawnPoint.z };
export const TERRAIN_SPAWN_YAW = TERRAIN_REGIONS.courtyard.yaw;
export const TERRAIN_SESSION_KEY = 'dunhuang:terrain-preview:v3';
export const TERRAIN_RUN_SPEED = 7;
export const TERRAIN_WALK_SPEED = 1.8;
export const LAKE_WATER_LEVEL = 0;
export const LAKE_SCALE = 1.75;
export const LAKE_ORIGIN = { x: 210, z: 15 };
/** v003 extends the perimeter only. Coordinates remain in the original GLB space. */
export const TERRAIN_COURTYARD_EXPANSION = {
  perSide: 2,
  floor: { minX: -24.3, maxX: .3, minZ: -24, maxZ: 2.05 },
  // The existing 25 m blend already encloses the enlarged footprint. Retain
  // its outer envelope so widening the yard cannot flatten the accepted ridge.
  shoulder: { minX: -24.5, maxX: .5, minZ: -27, maxZ: 6 },
  attachedProps: {
    'pot-west-front': { x: -23.35, z: -3 },
    'pot-west-workshop': { x: -23.35, z: -10 },
    'pot-east-hall': { x: -.65, z: -10.8 },
  },
};
/** The same source-X affine transform moves visual parts and camera bounds. */
export function terrainCourtyardPartTransform(id: string, centerX: number): { scaleX: number; offsetX: number } | null {
  const side = centerX < -12 ? -1 : 1, amount = TERRAIN_COURTYARD_EXPANSION.perSide;
  if (/^courtyard-(side-wall|side-art|wall-)/.test(id)) return { scaleX: 1, offsetX: side * amount };
  const stretch = (width: number, pivot: number) => { const scaleX = (width + amount) / width; return { scaleX, offsetX: pivot * (1 - scaleX) }; };
  if (id === 'courtyard-rear-wall') return { scaleX: 1.2, offsetX: 2.4 };
  if (id === 'courtyard-ground') { const scaleX = 23.7 / 19.7; return { scaleX, offsetX: -12 * (1 - scaleX) }; }
  if (/^entrance-wing-coping/.test(id)) return stretch(7.2, side < 0 ? -14.9 : -9.1);
  if (/^entrance-(wing|stone-base)/.test(id)) return stretch(7, side < 0 ? -15 : -9);
  if (/^wall-painted-border/.test(id)) return stretch(6.5, side < 0 ? -15.25 : -8.75);
  if (/^entrance-(inner|outer)-art/.test(id)) {
    // Space the original square panels across the wider wings without stretching art.
    const pivot = side < 0 ? -15 : -9;
    return { scaleX: 1, offsetX: (centerX - pivot) * amount / 7 };
  }
  return null;
}
/** Existing roadside assets move off the shortened road; meshes stay unchanged. */
export const TERRAIN_SCENERY_SOURCE_OVERRIDES: Partial<Record<TerrainRegion, Record<string, { x: number; z: number }>>> = {
  courtyard: { 'rock-road-east-low': { x: 8.5, z: 13.2 }, 'shrub-rock-east-low': { x: 8.6, z: 13.1 }, ...TERRAIN_COURTYARD_EXPANSION.attachedProps },
  music: { 'music-tree-1': { x: 19.2, z: 28.4 }, 'music-tree-2': { x: 35, z: 29 } },
};
export const TERRAIN_PROP_OVERRIDES = TERRAIN_SCENERY_SOURCE_OVERRIDES;
export function getTerrainPropPosition(region: TerrainRegion, id: string, original: { x: number; z: number }) {
  return TERRAIN_PROP_OVERRIDES[region]?.[id] ?? original;
}

export function toTerrainPoint(region: TerrainRegion, p: TerrainPlanPoint): TerrainPoint {
  const f = TERRAIN_REGIONS[region], c = Math.cos(f.yaw), s = Math.sin(f.yaw);
  const x = p.x - f.source.x, z = p.z - f.source.z;
  return { x: f.target.x + c * x + s * z, y: f.target.y + (p.y ?? f.source.y) - f.source.y, z: f.target.z - s * x + c * z };
}
export function fromTerrainPoint(region: TerrainRegion, p: TerrainPlanPoint): TerrainPoint {
  const f = TERRAIN_REGIONS[region], c = Math.cos(f.yaw), s = Math.sin(f.yaw);
  const x = p.x - f.target.x, z = p.z - f.target.z;
  return { x: f.source.x + c * x - s * z, y: f.source.y + (p.y ?? f.target.y) - f.target.y, z: f.source.z + s * x + c * z };
}
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// The exact four curves from the approved water study, uniformly enlarged. The
// concave shore faces the complete music courtyard; it is not an ellipse cutout.
const lakeCurves = [
  [[-4, 34], [12, 27], [26, 14], [25, 0]],
  [[25, 0], [25, -14], [11, -28], [-4, -34]],
  [[-4, -34], [3, -22], [7, -11], [7, 0]],
  [[7, 0], [7, 11], [3, 22], [-4, 34]],
];
export const LAKE_SHORELINE: readonly { x: number; z: number }[] = lakeCurves.flatMap(([a, b, c, d]) =>
  Array.from({ length: 40 }, (_, i) => {
    const t = i / 40, s = 1 - t;
    return { x: LAKE_ORIGIN.x + LAKE_SCALE * (s ** 3 * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t ** 3 * d[0]),
      z: LAKE_ORIGIN.z - LAKE_SCALE * (s ** 3 * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t ** 3 * d[1]) };
  }));
export function lakeSignedDistance(x: number, z: number): number {
  let distance2 = Infinity, inside = false;
  for (let i = 0, j = LAKE_SHORELINE.length - 1; i < LAKE_SHORELINE.length; j = i++) {
    const a = LAKE_SHORELINE[j], b = LAKE_SHORELINE[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz));
    distance2 = Math.min(distance2, (x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2);
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return Math.sqrt(distance2) * (inside ? -1 : 1);
}

// These are real doors, not visual building centres. The cliff route terminates
// at the existing stair foot; its original ramp remains a building surface.
export const TERRAIN_ANCHORS = {
  courtyardGate: toTerrainPoint('courtyard', { x: -12, y: 0, z: 2 }),
  courtyardSafe: toTerrainPoint('courtyard', { x: -12, y: 0, z: -13 }),
  musicGate: toTerrainPoint('music', { x: 40.2, y: 0, z: 3 }),
  musicSafe: toTerrainPoint('music', { x: 52.35, y: 0, z: -11.9 }),
  cliffStairFoot: toTerrainPoint('cliff', { x: 122, y: 0, z: -39 }),
  cliffDoor: toTerrainPoint('cliff', { x: 122, y: 6.85546875, z: -65 }),
};
const courtyardApproach = (x: number, z: number, y: number) => toTerrainPoint('courtyard', { x: x - 12, y: y - TERRAIN_REGIONS.courtyard.target.y, z: z + 2 });
const musicApproach = (distance: number) => toTerrainPoint('music', { x: 40.2, y: 0, z: 3 + distance });
const cliffApproach = (distance: number, y = 10) => toTerrainPoint('cliff', { x: 122, y: y - 10, z: -39 + distance });
const routeControls: { id: string; width: number; controls: TerrainPoint[] }[] = [
  { id: 'courtyard-to-valley', width: 3.3, controls: [
    TERRAIN_ANCHORS.courtyardGate, courtyardApproach(0, 3, 12), courtyardApproach(0, 6, 12),
    courtyardApproach(5, 9, 13.2), courtyardApproach(12, 13, 16.3), { x: 136.5, y: 20.6, z: 22 },
    { x: 150, y: 13.1, z: 35 }, { x: 163, y: 7, z: 43 }, musicApproach(12),
    musicApproach(8), musicApproach(2), TERRAIN_ANCHORS.musicGate,
  ] },
  { id: 'lake-to-cliff', width: 3.3, controls: [
    TERRAIN_ANCHORS.musicGate, musicApproach(2), musicApproach(7), { x: 193, y: 2.5, z: 43 },
    { x: 197, y: 2.2, z: 70 }, { x: 205, y: 2, z: 83 }, { x: 239, y: 2.8, z: 85 },
    { x: 277, y: 6, z: 74 }, { x: 309, y: 9.5, z: 62 }, cliffApproach(4), TERRAIN_ANCHORS.cliffStairFoot,
  ] },
];
interface PathPoint extends TerrainPoint { distance: number }
function sampleGradingPath(controls: readonly TerrainPoint[]): PathPoint[] {
  const result: PathPoint[] = [], marks: { distance: number; height: number }[] = [{ distance: 0, height: controls[0].y }];
  const tangent = (index: number) => {
    const a = controls[Math.max(0, index - 1)], b = controls[index], c = controls[Math.min(controls.length - 1, index + 1)];
    const before = Math.hypot(b.x - a.x, b.z - a.z), after = Math.hypot(c.x - b.x, c.z - b.z);
    if (!before) return { x: (c.x - b.x) * .85, z: (c.z - b.z) * .85 };
    if (!after) return { x: (b.x - a.x) * .85, z: (b.z - a.z) * .85 };
    const x = (b.x - a.x) / before + (c.x - b.x) / after, z = (b.z - a.z) / before + (c.z - b.z) / after;
    const scale = .85 * Math.min(before, after) / Math.max(.00001, Math.hypot(x, z));
    return { x: x * scale, z: z * scale };
  };
  let distance = 0;
  for (let segment = 0; segment < controls.length - 1; segment++) {
    const b = controls[segment], c = controls[segment + 1], startTangent = tangent(segment), endTangent = tangent(segment + 1);
    const steps = Math.max(8, Math.ceil(Math.hypot(c.x - b.x, c.z - b.z) * 1.5));
    for (let i = segment ? 1 : 0; i <= steps; i++) {
      const t = i / steps, t2 = t * t, t3 = t2 * t;
      // Tangent length is bounded by adjacent segment lengths. A short final
      // approach can never overshoot, reverse, then produce near-duplicate points.
      const axis = (key: 'x' | 'z') => (2 * t3 - 3 * t2 + 1) * b[key] + (t3 - 2 * t2 + t) * startTangent[key]
        + (-2 * t3 + 3 * t2) * c[key] + (t3 - t2) * endTangent[key];
      const p = { x: axis('x'), y: 0, z: axis('z'), distance: 0 }, previous = result.at(-1);
      if (previous) distance += Math.hypot(p.x - previous.x, p.z - previous.z);
      p.distance = distance; result.push(p);
    }
    marks.push({ distance, height: c.y });
  }
  const heightAt = (s: number) => {
    if (s <= 0) return marks[0].height;
    for (let i = 1; i < marks.length; i++) if (s <= marks[i].distance) return lerp(marks[i - 1].height, marks[i].height, (s - marks[i - 1].distance) / (marks[i].distance - marks[i - 1].distance));
    return marks.at(-1)!.height;
  };
  // Positive smoothing of the grade profile rounds crests without introducing
  // Catmull-Rom height overshoot or abrupt changes in the traveler's foot height.
  for (const p of result) p.y = [-6, -4, -2, 0, 2, 4, 6].reduce((sum, offset, i) => sum + heightAt(p.distance + offset) * [1, 2, 3, 4, 3, 2, 1][i], 0) / 16;
  result[0].y = controls[0].y; result.at(-1)!.y = controls.at(-1)!.y;
  return result;
}
const gradingPaths = routeControls.map(route => ({ ...route, points: sampleGradingPath(route.controls) }));
interface GradingSegment { a: PathPoint; b: PathPoint; length2: number; route: number }
const gradingBins = new Map<string, GradingSegment[]>();
const BIN_SIZE = 24, GRADING_RADIUS = 32;
for (const [route, path] of gradingPaths.entries()) for (let i = 1; i < path.points.length; i++) {
  const a = path.points[i - 1], b = path.points[i], segment = { a, b, route, length2: (b.x - a.x) ** 2 + (b.z - a.z) ** 2 };
  for (let bx = Math.floor((Math.min(a.x, b.x) - GRADING_RADIUS) / BIN_SIZE); bx <= Math.floor((Math.max(a.x, b.x) + GRADING_RADIUS) / BIN_SIZE); bx++)
    for (let bz = Math.floor((Math.min(a.z, b.z) - GRADING_RADIUS) / BIN_SIZE); bz <= Math.floor((Math.max(a.z, b.z) + GRADING_RADIUS) / BIN_SIZE); bz++) {
      const key = `${bx},${bz}`, bin = gradingBins.get(key) ?? []; bin.push(segment); gradingBins.set(key, bin);
    }
}
const profile = [[-120, 16], [-40, 18], [40, 16], [90, 14], [110, 14], [136.5, 20], [153, 10], [172, 3], [215, 2.1], [260, 3.1], [320, 9.5], [365, 10], [450, 14]];
function sandProfile(x: number) {
  if (x <= profile[0][0]) return profile[0][1];
  for (let i = 1; i < profile.length; i++) if (x <= profile[i][0]) return lerp(profile[i - 1][1], profile[i][1], smooth(profile[i - 1][0], profile[i][0], x));
  return profile.at(-1)![1];
}
function padDistance(x: number, z: number, minX: number, maxX: number, minZ: number, maxZ: number) {
  return Math.hypot(Math.max(minX - x, x - maxX, 0), Math.max(minZ - z, z - maxZ, 0));
}
/** One continuous sand surface. Architecture and the stair ramps are separate. */
export function terrainHeight(x: number, z: number): number {
  const lakeDistance = lakeSignedDistance(x, z);
  if (lakeDistance <= 0) return LAKE_WATER_LEVEL - Math.min(4.2, -lakeDistance * .45);
  const broad = (Math.sin(z * .018 + x * .006) * 1.1 + Math.cos(z * .011 - x * .014) * .55) * (1 - smooth(125, 190, x) * .65);
  let height = sandProfile(x - Math.sin(z * .013) * 3) + broad;
  // Broad shoulders join each building pad back into sand, rather than creating
  // isolated raised platforms. Grading the route afterwards preserves its grade.
  const courtyard = fromTerrainPoint('courtyard', { x, z });
  const shoulder = TERRAIN_COURTYARD_EXPANSION.shoulder;
  const courtyardPad = padDistance(courtyard.x, courtyard.z, shoulder.minX, shoulder.maxX, shoulder.minZ, shoulder.maxZ);
  height = lerp(height, TERRAIN_REGIONS.courtyard.target.y - .025, 1 - smooth(0, 25, courtyardPad));
  const music = fromTerrainPoint('music', { x, z });
  const musicPad = padDistance(music.x, music.z, 22, 71, -30, 4);
  height = lerp(height, 2.475, 1 - smooth(0, 13, musicPad));
  const cliff = fromTerrainPoint('cliff', { x, z });
  const cliffPad = padDistance(cliff.x, cliff.z, 106, 138, -105, -37.5);
  height = lerp(height, 9.975, 1 - smooth(0, 18, cliffPad));
  const closestByRoute = gradingPaths.map(() => ({ distance2: GRADING_RADIUS ** 2, weightedHeight: 0, weight: 0 }));
  const bin = gradingBins.get(`${Math.floor(x / BIN_SIZE)},${Math.floor(z / BIN_SIZE)}`) ?? [];
  for (const { a, b, length2, route } of bin) {
    const t = clamp(((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) / length2);
    const distance2 = (x - lerp(a.x, b.x, t)) ** 2 + (z - lerp(a.z, b.z, t)) ** 2;
    if (distance2 >= GRADING_RADIUS ** 2) continue;
    const nearest = closestByRoute[route];
    if (distance2 < nearest.distance2) {
      const scale = Math.exp((distance2 - nearest.distance2) / 1.44);
      nearest.weight *= scale; nearest.weightedHeight *= scale; nearest.distance2 = distance2;
    }
    // A soft nearest-segment blend keeps the sand continuous at a curved road's
    // medial axis; selecting one segment's height creates invisible slope walls.
    const weight = Math.exp((nearest.distance2 - distance2) / 1.44) * Math.sqrt(length2);
    nearest.weight += weight; nearest.weightedHeight += weight * lerp(a.y, b.y, t);
  }
  let roadWeight = 0, roadWeightedHeight = 0, strongestBlend = 0;
  for (const road of closestByRoute) {
    if (!road.weight) continue;
    const distance = Math.sqrt(road.distance2), blend = 1 - smooth(3.4, GRADING_RADIUS, distance);
    const weight = blend / (1 + Math.max(0, distance - 3.4) ** 2);
    roadWeight += weight; roadWeightedHeight += weight * road.weightedHeight / road.weight; strongestBlend = Math.max(strongestBlend, blend);
  }
  if (roadWeight > 0) height = lerp(height, roadWeightedHeight / roadWeight, strongestBlend);
  // Keep sand below the model's existing floor slabs inside the actual footprint.
  const floor = TERRAIN_COURTYARD_EXPANSION.floor;
  height = lerp(height, TERRAIN_REGIONS.courtyard.target.y - .025, 1 - smooth(0, 1.5, padDistance(courtyard.x, courtyard.z, floor.minX, floor.maxX, floor.minZ, floor.maxZ)));
  height = lerp(height, 2.475, 1 - smooth(0, 1.5, padDistance(music.x, music.z, 23.51, 70.49, -29.29, 3.49)));
  // The same curve creates the dry shore, waterline and basin. A shallow bank
  // replaces the local sand only near water, leaving the music pad untouched.
  const bank = LAKE_WATER_LEVEL + lakeDistance * .19;
  return lerp(bank, height, smooth(0, 8, lakeDistance));
}
export const TERRAIN_ROUTES: readonly TerrainRoute[] = gradingPaths.map(({ id, width, points }) => ({
  id, width, points: points.map(({ x, z }) => ({ x, y: terrainHeight(x, z), z })),
}));
