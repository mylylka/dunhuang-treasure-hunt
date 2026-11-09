import config from '../content/world/music-companion-v001.json';
import { fromTerrainPoint, toTerrainPoint, isTerrainWalkable, terrainSurfaceHeight } from './terrain-rules-v001';
import type { WorldPoint } from './types';

const bounds = config.flatBounds;
const gap = config.follow.minimumSeparation;
const distance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);
export function inMusicCompanionArea(point: WorldPoint): boolean {
  const p = fromTerrainPoint('music', point);
  return Number.isFinite(p.x) && Number.isFinite(p.z) && p.x >= bounds.minX - 1e-6 && p.x <= bounds.maxX + 1e-6 && p.z >= bounds.minZ - 1e-6 && p.z <= bounds.maxZ + 1e-6;
}
export function isMusicCompanionWalkable(point: WorldPoint): boolean {
  return inMusicCompanionArea(point) && isTerrainWalkable(point) && Math.abs(terrainSurfaceHeight(point) - 2.5) < .025;
}
function avoidsPlayer(a: WorldPoint, b: WorldPoint, player?: WorldPoint): boolean {
  if (!player) return true;
  const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
  const t = length2 ? Math.max(0, Math.min(1, ((player.x - a.x) * dx + (player.z - a.z) * dz) / length2)) : 0;
  return Math.hypot(a.x + t * dx - player.x, a.z + t * dz - player.z) >= gap - 1e-5;
}

/** Small, bounded local grid; all final segments are checked against the current terrain collision API. */
export function createMusicCompanionNavigation() {
  const step = config.follow.gridStep, columns = Math.floor((bounds.maxX - bounds.minX) / step) + 1;
  const rows = Math.floor((bounds.maxZ - bounds.minZ) / step) + 1;
  let nodes: WorldPoint[] | undefined, free: boolean[] = [];
  const edgeCache = new Map<string, boolean>();
  function clear(a: WorldPoint, b: WorldPoint, player?: WorldPoint): boolean {
    if (!avoidsPlayer(a, b, player)) return false;
    const count = Math.max(1, Math.ceil(distance(a, b) / .18));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      if (!isMusicCompanionWalkable({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false;
    }
    return true;
  }
  function grid() {
    if (nodes) return nodes;
    nodes = [];
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const point = toTerrainPoint('music', { x: bounds.minX + column * step, z: bounds.minZ + row * step });
      nodes.push({ x: point.x, z: point.z }); free.push(isMusicCompanionWalkable(point));
    }
    return nodes;
  }
  function closest(point: WorldPoint, player?: WorldPoint): number {
    const points = grid();
    const candidates = points.map((p, id) => ({ id, distance: distance(p, point) }))
      .filter(item => free[item.id] && item.distance <= step * 2.5)
      .sort((a, b) => a.distance - b.distance);
    return candidates.find(item => clear(point, points[item.id], player))?.id ?? -1;
  }
  function edge(a: number, b: number, player?: WorldPoint) {
    const points = grid(), key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (!edgeCache.has(key)) edgeCache.set(key, clear(points[a], points[b]));
    return edgeCache.get(key)! && avoidsPlayer(points[a], points[b], player);
  }
  function findPath(start: WorldPoint, goal: WorldPoint, player?: WorldPoint): WorldPoint[] | null {
    if (!isMusicCompanionWalkable(start) || !isMusicCompanionWalkable(goal)) return null;
    if (clear(start, goal, player)) return [{ ...goal }];
    const points = grid(), from = closest(start, player), to = closest(goal, player);
    if (from < 0 || to < 0) return null;
    const cost = points.map(() => Infinity), came = points.map(() => -1), open = new Set([from]), closed = new Set<number>();
    cost[from] = 0;
    while (open.size) {
      let current = -1, score = Infinity;
      for (const id of open) { const value = cost[id] + distance(points[id], points[to]); if (value < score) { current = id; score = value; } }
      if (current === to) {
        const reverse = [to]; for (let id = came[to]; id !== -1; id = came[id]) reverse.push(id);
        const route = [start, ...reverse.reverse().map(id => points[id]), goal], result: WorldPoint[] = [];
        for (let index = 0; index < route.length - 1;) {
          let next = route.length - 1;
          while (next > index + 1 && !clear(route[index], route[next], player)) next--;
          result.push({ ...route[next] }); index = next;
        }
        return result;
      }
      open.delete(current); closed.add(current);
      const column = current % columns, row = Math.floor(current / columns);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz || column + dx < 0 || column + dx >= columns || row + dz < 0 || row + dz >= rows) continue;
        const next = (row + dz) * columns + column + dx;
        if (closed.has(next) || !free[next]) continue;
        if (dx && dz && (!free[row * columns + column + dx] || !free[(row + dz) * columns + column])) continue;
        if (!edge(current, next, player)) continue;
        const value = cost[current] + distance(points[current], points[next]);
        if (value < cost[next]) { cost[next] = value; came[next] = current; open.add(next); }
      }
    }
    return null;
  }
  return { findPath, clear };
}
