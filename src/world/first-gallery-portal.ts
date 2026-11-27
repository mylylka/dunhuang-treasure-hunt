import { isCaissonOnlyWalkable } from './caisson-only-scope';
import { fromTerrainPoint, isTerrainWalkable, moveTerrainPlayer, toTerrainPoint } from './terrain-rules-v001';
import type { WorldPoint } from './types';

export type GalleryPortalPhase = 'turning' | 'revealing' | 'question' | 'walking' | 'arrived' | 'skipped';

export const GALLERY_PORTAL_PRELUDE = { turn: .28, reveal: 2.05, question: 3.85, walk: 5.25 } as const;
export function galleryPortalPreludePhase(time: number): 'turning' | 'revealing' | 'question' {
  return time < GALLERY_PORTAL_PRELUDE.reveal ? 'turning' : time < GALLERY_PORTAL_PRELUDE.question ? 'revealing' : 'question';
}

const toWorld = ([x, z]: readonly [number, number]): WorldPoint => toTerrainPoint('courtyard', { x, z });
export const GALLERY_PORTAL_STOP = toWorld([-18.9, -1.3]);
// The hall opening, courtyard aisles, and the passage around the east exhibits.
const corridor: readonly WorldPoint[] = [
  [-16.25, -.65], [-12, -5], [-12, .6], [-12, 3.6], [-7, -3.7],
  [-12, -8], [-5, -9.8], [-2.05, -8.9], [-2, -6], [-2, -5],
].map(point => toWorld([point[0], point[1]]));

const distance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);

function movePortalPlayer(position: WorldPoint, delta: WorldPoint, connected: boolean, composedCourtyard: boolean, compact: boolean): WorldPoint {
  const next = moveTerrainPlayer(position, delta, true, undefined, connected, composedCourtyard, compact);
  return compact && !isCaissonOnlyWalkable(next) ? position : next;
}

function clearSegment(from: WorldPoint, to: WorldPoint, connected: boolean, composedCourtyard: boolean, compact: boolean): boolean {
  const count = Math.max(1, Math.ceil(distance(from, to) / .15));
  let position = from;
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    const point = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t };
    position = movePortalPlayer(position, { x: point.x - position.x, z: point.z - position.z }, connected, composedCourtyard, compact);
    if (distance(position, point) > .001) return false;
  }
  return true;
}

/** Route only within the courtyard. Every proposed chord uses the same
 * First Gallery collision and grade checks as actual player movement. */
export function planGalleryPortalRoute(from: WorldPoint, connected = false, composedCourtyard = false, compact = false): readonly WorldPoint[] | null {
  const local = fromTerrainPoint('courtyard', from);
  const walkable = (point: WorldPoint) => (!compact || isCaissonOnlyWalkable(point))
    && isTerrainWalkable(point, true, undefined, connected, composedCourtyard, compact);
  if (local.x < -25 || local.x > 3 || local.z < -25 || local.z > 9 || !walkable(from)) return null;
  if (!walkable(GALLERY_PORTAL_STOP)) return null;
  if (clearSegment(from, GALLERY_PORTAL_STOP, connected, composedCourtyard, compact)) return [GALLERY_PORTAL_STOP];

  const nodes = [from, GALLERY_PORTAL_STOP, ...corridor.filter(walkable)];
  const costs = nodes.map((_, i) => i === 0 ? 0 : Infinity);
  const previous = nodes.map(() => -1);
  const open = new Set(nodes.map((_, i) => i));
  while (open.size) {
    const i = [...open].reduce((best, candidate) => costs[candidate] < costs[best] ? candidate : best);
    if (!Number.isFinite(costs[i])) return null;
    if (i === 1) {
      const path = [];
      for (let index = i; index > 0; index = previous[index]) path.unshift(nodes[index]);
      return path;
    }
    open.delete(i);
    for (const j of open) {
      const cost = costs[i] + distance(nodes[i], nodes[j]);
      if (cost >= costs[j] || !clearSegment(nodes[i], nodes[j], connected, composedCourtyard, compact)) continue;
      costs[j] = cost;
      previous[j] = i;
    }
  }
  return null;
}

export function createGalleryPortalWalk(from: WorldPoint, connected = false, composedCourtyard = false, compact = false) {
  const route = planGalleryPortalRoute(from, connected, composedCourtyard, compact);
  if (!route) return null;
  let index = 0, age = 0, stalled = 0;
  return {
    advance(position: WorldPoint, dt: number): { position: WorldPoint; phase: 'walking' | 'arrived' | 'skipped' } {
      while (index < route.length && distance(position, route[index]) < (index === route.length - 1 ? .045 : .002)) index++;
      const waypoint = route[index];
      if (!waypoint) return { position, phase: 'arrived' };
      if (dt <= 0) return { position, phase: 'walking' };
      age += dt;
      const remaining = distance(position, waypoint);
      const slowing = index === route.length - 1 ? Math.max(.35, remaining * 4) : Infinity;
      const step = Math.min(remaining, dt * Math.min(2.05, .45 + age * 3, slowing));
      const next = movePortalPlayer(position, { x: (waypoint.x - position.x) / remaining * step, z: (waypoint.z - position.z) / remaining * step }, connected, composedCourtyard, compact);
      stalled = remaining - distance(next, waypoint) < Math.min(.001, step / 3) ? stalled + dt : 0;
      return { position: next, phase: stalled > .55 ? 'skipped' : 'walking' };
    },
  };
}
