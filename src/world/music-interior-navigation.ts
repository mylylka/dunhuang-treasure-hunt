import layoutData from '../content/world/music-interior-v005.json';
import solidsData from '../content/world/music-interior-solids-v005.json';
import balcony from '../content/world/music-balcony-ensemble-v001.json';
import compactBalcony from '../content/world/music-balcony-ensemble-v002.json';
import { fromTerrainPoint, toTerrainPoint, TERRAIN_REGIONS } from '../content/world/terrain-layout-v001';
import { moveTerrainPlayer, terrainSurfaceHeight, isTerrainWalkable, TERRAIN_MUSIC_LOCAL_SOLIDS } from './terrain-rules-v001';
import { createUpperNavigation, upperSurfaceHeightAt, type UpperNavigationLayout, type UpperSolid, type UpperWalkState, type UpperWalkSurface } from './mogao-upper-navigation';
import type { WorldPoint } from './types';
import { MUSIC_PAVILION_BUILDINGS_V006 } from './music-pavilion-rules-v004';

export type MusicInteriorWalkState = UpperWalkState;
const replaced = new Set<string>(solidsData.replacedLegacyIds);
const retainedSolids: UpperSolid[] = TERRAIN_MUSIC_LOCAL_SOLIDS.filter(s => !replaced.has(s.id ?? '')).map(s => ({
  id: s.id ?? 'retained-music-solid', min: [s.minX, -.2, s.minZ], max: [s.maxX, s.height, s.maxZ],
}));
// The two removed middle columns and placeholder musicians have no solid
// proxy. Both the navigation and camera keep the actual continuous front rail.
const removedSolids = new Set([
  'music-column-lower-1', 'music-column-lower-foot-1', 'music-column-upper-1', 'music-column-upper-foot-1',
  'music-gallery-musician-0', 'music-gallery-musician-1',
]);
const buildingSolids = [...retainedSolids, ...solidsData.solids as unknown as UpperSolid[]].filter(s => !removedSolids.has(s.id));
const surfacesForEnsemble = layoutData.surfaces.map(surface => surface.id === 'music-gallery'
  ? { ...surface, safePoint: [surface.safePoint[0], surface.y, -20.8] }
  : surface);

/** This configuration is already in music source coordinates; no second origin is added. */
export const musicInteriorToWorld = (p: WorldPoint & { y?: number }) => toTerrainPoint('music', p);
export const musicInteriorFromWorld = (p: WorldPoint & { y?: number }) => fromTerrainPoint('music', p);

export interface MusicInteriorNavigationOptions {
  compactBalcony?: boolean;
  additionalSolids?: readonly UpperSolid[];
}

export function createMusicInteriorNavigation(options: MusicInteriorNavigationOptions = {}) {
  const placement = options.compactBalcony ? compactBalcony : balcony;
  const performers = placement.players.map<UpperSolid>(({ id, min, max }) => ({
    id: `music-gallery-ensemble-${id}`, min, max,
  }));
  const cameraSolids: readonly UpperSolid[] = [...buildingSolids, ...performers, ...(options.additionalSolids ?? [])];
  const layout = {
    ...layoutData,
    assets: { ...layoutData.assets, building: MUSIC_PAVILION_BUILDINGS_V006.interior },
    surfaces: surfacesForEnsemble,
    solids: cameraSolids,
  };
  const navigationLayout = layout as unknown as UpperNavigationLayout;
  const navigation = createUpperNavigation(navigationLayout);
  // The 36 physical risers belong to this walk surface. On the stair the body
  // follows their continuous ramp proxy; below it every riser/soffit stays solid.
  // Using a resolver scoped to that surface avoids treating the next high tread
  // inside the avatar's horizontal radius as a chest-height obstacle.
  const stairNavigation = createUpperNavigation({ ...navigationLayout, solids: navigationLayout.solids.map(s => s.walkSurface === 'music-stair' ? { ...s, navigation: false } : s) });
  const resolverFor = (surfaceId: string | null) => surfaceId === 'music-stair' ? stairNavigation : navigation;
  const validLocal = (p: WorldPoint, id: string) => resolverFor(id).validOnSurface(p, id);
  const surfaces = new Map(navigationLayout.surfaces.map(s => [s.id, s]));
  const pointDistance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);
  const canonicalSurface = (id: string | null) => id === 'music-stair-approach' ? 'music-floor-1' : id?.endsWith('-approach') ? 'music-courtyard' : id;
  const cloneState = (s: UpperWalkState): UpperWalkState => ({ position: { ...s.position }, surfaceId: s.surfaceId });
  const contains = (s: UpperWalkSurface, p: WorldPoint) => p.x >= s.minX - 1e-6 && p.x <= s.maxX + 1e-6 && p.z >= s.minZ - 1e-6 && p.z <= s.maxZ + 1e-6;

  const toLocalState = (state: UpperWalkState): UpperWalkState => ({ position: musicInteriorFromWorld(state.position), surfaceId: state.surfaceId });
  const toWorldState = (state: UpperWalkState): UpperWalkState => {
    const p = musicInteriorToWorld(state.position);
    return { position: { x: p.x, z: p.z }, surfaceId: canonicalSurface(state.surfaceId) };
  };

  /** Acquire an ascending ramp at its foot before the overlapping lower floor wins.
   * Ground below the high half of the stair remains a separate, walkable surface.
   */
  function localStep(state: UpperWalkState, delta: WorldPoint): UpperWalkState | null {
    const active = state.surfaceId ? surfaces.get(state.surfaceId) : undefined;
    if (active?.kind === 'floor') {
      const next = { x: state.position.x + delta.x, z: state.position.z + delta.z };
      const height = upperSurfaceHeightAt(active, state.position), length = Math.hypot(delta.x, delta.z);
      for (const id of active.neighbors) {
        const ramp = surfaces.get(id);
        if (!ramp || ramp.kind !== 'ramp' || !contains(ramp, next)) continue;
        const y = upperSurfaceHeightAt(ramp, next), lower = Math.min(ramp.y, ramp.endY ?? ramp.y);
        if (Math.abs(height - lower) > .045 || y <= height + 1e-7 || y - height > Math.tan(36 * Math.PI / 180) * length + .045) continue;
        if (validLocal(next, id)) return { position: next, surfaceId: id };
      }
    }
    return resolverFor(state.surfaceId).move(state, delta);
  }

  function localMove(state: UpperWalkState, delta: WorldPoint): UpperWalkState | null {
    const length = Math.hypot(delta.x, delta.z);
    if (!Number.isFinite(length)) return cloneState(state);
    const count = Math.max(1, Math.ceil(length / layoutData.navigation.maximumStep));
    const step = { x: delta.x / count, z: delta.z / count };
    let current: UpperWalkState | null = cloneState(state);
    for (let i = 0; i < Math.min(count, 512); i++) {
      const next = localStep(current, step);
      if (!next) return i === 0 ? null : current;
      current = next;
      if (!current.surfaceId) return current;
    }
    return current;
  }

  function musicInteriorHeight(state: UpperWalkState): number {
    const local = musicInteriorFromWorld(state.position);
    const height = navigation.floorHeight(local, state.surfaceId);
    return height === null ? terrainSurfaceHeight(state.position) : height + TERRAIN_REGIONS.music.target.y;
  }

  function musicInteriorValid(state: UpperWalkState): boolean {
    if (!state.surfaceId) return isTerrainWalkable(state.position);
    return validLocal(musicInteriorFromWorld(state.position), state.surfaceId);
  }

  function musicInteriorSafeState(surfaceId: string | null = layoutData.spawn.surfaceId): UpperWalkState {
    return toWorldState(resolverFor(surfaceId).safeState(surfaceId));
  }

  function sanitizeMusicInteriorState(state: UpperWalkState): UpperWalkState {
    return toWorldState(resolverFor(state.surfaceId).sanitize(toLocalState(state)));
  }

  /** One resolver owns both ordinary movement and the two actors' stair movement.
   * Dynamic person collision is applied by the caller through the same API.
   */
  function musicInteriorMove(state: UpperWalkState, delta: WorldPoint): UpperWalkState {
    const from = musicInteriorFromWorld(state.position);
    const to = musicInteriorFromWorld({ x: state.position.x + delta.x, z: state.position.z + delta.z });
    const moved = localMove({ position: from, surfaceId: state.surfaceId }, { x: to.x - from.x, z: to.z - from.z });
    if (moved) return toWorldState(moved);
    if (state.surfaceId) return cloneState(state);
    const ground = moveTerrainPlayer(state.position, delta);
    // The real courtyard gateway is the sole transition out of the old terrain.
    const acquired = navigation.move({ position: musicInteriorFromWorld(ground), surfaceId: null }, { x: 0, z: 0 });
    return acquired?.surfaceId ? toWorldState(acquired) : { position: ground, surfaceId: null };
  }

  interface PathNode extends UpperWalkState { surfaceId: string; height: number; column: number; row: number }
  let nodes: PathNode[] | undefined;
  const cells = new Map<string, number[]>(), edgeCache = new Map<string, boolean>();
  const bounds = layoutData.bounds, gridStep = layoutData.navigation.gridStep;
  const localHeight = (s: UpperWalkState) => navigation.floorHeight(s.position, s.surfaceId) ?? 0;
  const spatialDistance = (a: UpperWalkState, b: UpperWalkState) => Math.hypot(pointDistance(a.position, b.position), localHeight(a) - localHeight(b));

  function clearSegment(from: UpperWalkState, to: UpperWalkState): boolean {
    const count = Math.max(1, Math.ceil(pointDistance(from.position, to.position) / .12));
    let walk = cloneState(from);
    for (let i = 1; i <= count; i++) {
      const expected = { x: from.position.x + (to.position.x - from.position.x) * i / count, z: from.position.z + (to.position.z - from.position.z) * i / count };
      const moved = localStep(walk, { x: expected.x - walk.position.x, z: expected.z - walk.position.z });
      if (!moved?.surfaceId || pointDistance(moved.position, expected) > .002) return false;
      walk = moved;
    }
    return canonicalSurface(walk.surfaceId) === canonicalSurface(to.surfaceId);
  }

  function grid() {
    if (nodes) return nodes;
    nodes = [];
    const columns = Math.ceil((bounds.maxX - bounds.minX) / gridStep), rows = Math.ceil((bounds.maxZ - bounds.minZ) / gridStep);
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const p = { x: bounds.minX + column * gridStep, z: bounds.minZ + row * gridStep };
      for (const surface of navigationLayout.surfaces) {
        if (!contains(surface, p) || !validLocal(p, surface.id)) continue;
        const id = nodes.length;
        nodes.push({ position: p, surfaceId: surface.id, height: upperSurfaceHeightAt(surface, p), column, row });
        const key = `${column}:${row}`, cell = cells.get(key) ?? [];
        cell.push(id); cells.set(key, cell);
      }
    }
    return nodes;
  }

  function linked(a: number, b: number) {
    const points = grid(), from = points[a], to = points[b];
    if (from.surfaceId !== to.surfaceId && !surfaces.get(from.surfaceId)?.neighbors.includes(to.surfaceId)) return false;
    const key = `${a}:${b}`;
    if (!edgeCache.has(key)) edgeCache.set(key, clearSegment(from, to));
    return edgeCache.get(key)!;
  }

  /** Layered A*: nodes at the same X/Z retain different surface IDs and heights.
   * Every edge and the final smoothing pass are validated by actual body movement.
   */
  function musicInteriorPath(fromWorld: UpperWalkState, toWorld: UpperWalkState): UpperWalkState[] | null {
    if (!musicInteriorValid(fromWorld) || !musicInteriorValid(toWorld) || !fromWorld.surfaceId || !toWorld.surfaceId) return null;
    const from = toLocalState(fromWorld), to = toLocalState(toWorld);
    if (clearSegment(from, to)) return [cloneState(fromWorld), cloneState(toWorld)];
    const points = grid();
    const near = (state: UpperWalkState, incoming: boolean) => points.map((node, id) => ({ id, distance: spatialDistance(state, node) }))
      .filter(p => p.distance <= gridStep * 2.8 && (points[p.id].surfaceId === state.surfaceId || surfaces.get(state.surfaceId!)?.neighbors.includes(points[p.id].surfaceId)))
      .sort((a, b) => a.distance - b.distance).slice(0, 32)
      .filter(p => incoming ? clearSegment(points[p.id], state) : clearSegment(state, points[p.id]));
    const starts = near(from, false), ends = new Map(near(to, true).map(p => [p.id, p.distance]));
    if (!starts.length || !ends.size) return null;
    const cost = points.map(() => Infinity), came = points.map(() => -1), open = new Set<number>(), closed = new Set<number>();
    for (const start of starts) { cost[start.id] = start.distance; open.add(start.id); }
    while (open.size) {
      let current = -1, score = Infinity;
      for (const id of open) { const value = cost[id] + spatialDistance(points[id], to); if (value < score) { score = value; current = id; } }
      if (ends.has(current)) {
        const reverse = [current]; for (let id = came[current]; id !== -1; id = came[id]) reverse.push(id);
        const raw = [from, ...reverse.reverse().map(id => points[id]), to], route = [from];
        for (let index = 0; index < raw.length - 1;) {
          let next = raw.length - 1;
          while (next > index + 1 && (raw[index].surfaceId !== raw[next].surfaceId || !clearSegment(raw[index], raw[next]))) next--;
          route.push(raw[next]); index = next;
        }
        return route.map(toWorldState);
      }
      open.delete(current); closed.add(current);
      const node = points[current];
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        for (const next of cells.get(`${node.column + dx}:${node.row + dz}`) ?? []) {
          if (closed.has(next) || !linked(current, next)) continue;
          const value = cost[current] + spatialDistance(node, points[next]);
          if (value < cost[next]) { cost[next] = value; came[next] = current; open.add(next); }
        }
      }
    }
    return null;
  }

  return { layout, cameraSolids, musicInteriorHeight, musicInteriorValid, musicInteriorSafeState,
    sanitizeMusicInteriorState, musicInteriorMove, musicInteriorPath };
}

export type MusicInteriorNavigation = ReturnType<typeof createMusicInteriorNavigation>;
export const legacyMusicInteriorNavigation = createMusicInteriorNavigation();
export const {
  layout: MUSIC_INTERIOR_LAYOUT, cameraSolids: musicInteriorCameraSolids,
  musicInteriorHeight, musicInteriorValid, musicInteriorSafeState, sanitizeMusicInteriorState,
  musicInteriorMove, musicInteriorPath,
} = legacyMusicInteriorNavigation;
