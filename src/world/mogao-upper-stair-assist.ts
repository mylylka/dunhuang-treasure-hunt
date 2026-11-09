import layout from '../content/world/mogao-upper-v002.json';
import {
  exhibitUpperNavigation, MOGAO_EXHIBIT_UPPER_LAYOUT, moveUpperPlayer, upperFromWorld, upperNavigation, upperToWorld,
  type UpperWalkState,
} from './mogao-upper-navigation';
import type { WorldPoint } from './types';

export type UpperStairDirection = 'up' | 'down';
interface StairNode { point: WorldPoint; height: number; surfaces: Set<string>; links: number[] }
interface StairStop { node: number; height: number; surfaceId: string; label: string }
export interface UpperStairAssistState {
  direction: UpperStairDirection;
  destination: StairStop;
  /** World-coordinate waypoints, traversed by ordinary collision-aware movement. */
  waypoints: readonly WorldPoint[];
  nextWaypoint: number;
  stalledSeconds: number;
}
export interface UpperStairOption { available: boolean; label: string; surfaceId?: string }

const nodes: StairNode[] = [];
const nodeByPosition = new Map<string, number>();
function addSequence(points: typeof layout.route) {
  let previous: number | undefined;
  for (const item of points) {
    const [x, height, z] = item.position, key = `${x},${height},${z}`;
    let index = nodeByPosition.get(key);
    if (index === undefined) {
      index = nodes.length;
      nodes.push({ point: { x, z }, height, surfaces: new Set(), links: [] });
      nodeByPosition.set(key, index);
    }
    nodes[index].surfaces.add(item.surfaceId);
    if (previous !== undefined && previous !== index && !nodes[previous].links.includes(index)) {
      nodes[previous].links.push(index); nodes[index].links.push(previous);
    }
    previous = index;
  }
}
// Reuse the physically checked stair route, omitting the viewing-platform tour.
// The two hall endpoints form branches, so continuing upstairs returns through
// the real doorway and never cuts diagonally across the stairwell opening.
const firstA = layout.route.findIndex(p => p.surfaceId === 'hall-a');
const lastA = layout.route.length - 1 - [...layout.route].reverse().findIndex(p => p.surfaceId === 'hall-a');
const firstB = layout.route.findIndex(p => p.surfaceId === 'hall-b');
addSequence(layout.route.slice(0, firstA + 1));
addSequence(layout.route.slice(lastA, firstB + 1));
const routeNodeAt = (index: number) => nodeByPosition.get(layout.route[index].position.join(','))!;
const stopAt = (index: number, label: string): StairStop => {
  const item = layout.route[index];
  return { node: routeNodeAt(index), height: item.position[1], surfaceId: item.surfaceId, label };
};
const stops = [stopAt(0, '一层楼梯入口'), stopAt(firstA, '壁画洞窟 A'), stopAt(firstB, '壁画洞窟 B')];
const hallDoorStops = [stopAt(firstA - 1, '二层绘世厅门口'), stopAt(firstB - 1, '三层佛法厅门口')];
const links = nodes.map(node => node.links);
// Continue across the landing between flights without detouring into Hall A.
const landingAFromBelow = hallDoorStops[0].node;
const landingAToAbove = routeNodeAt(lastA + 1);
const hallDoorLinks = links.map((neighbors, index) => index === landingAFromBelow ? [...neighbors, landingAToAbove]
  : index === landingAToAbove ? [...neighbors, landingAFromBelow] : neighbors);
const distance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);

const stairEntry = layout.surfaces.find(surface => surface.id === 'stair-entry')!;
const exhibitStairEntry = MOGAO_EXHIBIT_UPPER_LAYOUT.surfaces.find(surface => surface.id === 'stair-entry')!;
const isStairSurface = (id: string) => /^(flight-\d+|landing-\d+|stair-entry)$/.test(id);

export function isUpperStairAssistArea({ position, surfaceId }: UpperWalkState, exhibit = false) {
  if (!surfaceId) return false;
  const p = upperFromWorld(position);
  // Cover the short approach within the doorway's width on the main-room floor.
  const entry = exhibit ? exhibitStairEntry : stairEntry;
  const atMouth = surfaceId === 'ground' && p.x >= entry.minX - 1.15
    && p.z >= entry.minZ && p.z <= entry.maxZ;
  return (isStairSurface(surfaceId) || atMouth) &&
    (exhibit ? exhibitUpperNavigation : upperNavigation).validOnSurface(p, surfaceId);
}

function localStart(current: UpperWalkState, exhibit: boolean) {
  if (!current.surfaceId) return null;
  const p = upperFromWorld(current.position), id = current.surfaceId;
  if (!(exhibit ? exhibitUpperNavigation : upperNavigation).validOnSurface(p, id)) return null;
  if (isStairSurface(id)) return p;
  if (id === 'ground' && distance(p, nodes[stops[0].node].point) <= 3) return p;
  if ((id === 'hall-a' || id === 'hall-b') && p.x >= 16.4 && p.x <= 21 && p.z >= -21.8 && p.z <= -17.8) return p;
  return null;
}
function destination(current: UpperWalkState, direction: UpperStairDirection, stopAtHallDoors: boolean) {
  const p = localStart(current, stopAtHallDoors);
  if (!p) return null;
  const height = (stopAtHallDoors ? exhibitUpperNavigation : upperNavigation).floorHeight(p, current.surfaceId)!;
  return direction === 'up' ? (stopAtHallDoors ? hallDoorStops : stops).find(s => s.height > height + .001) ?? null
    : [...stops].reverse().find(s => s.height < height - .001) ?? null;
}
export function getUpperStairOptions(current: UpperWalkState, stopAtHallDoors = false): Record<UpperStairDirection, UpperStairOption> {
  const option = (direction: UpperStairDirection): UpperStairOption => {
    const stop = destination(current, direction, stopAtHallDoors);
    return stop ? { available: true, label: stop.label, surfaceId: stop.surfaceId }
      : { available: false, label: direction === 'up' ? '上楼' : '下楼' };
  };
  return { up: option('up'), down: option('down') };
}

/** Shortest route on the actual switchback centreline, including hall doorways. */
function distancesTo(end: number, routeLinks: readonly (readonly number[])[]) {
  const costs = nodes.map(() => Infinity), next = nodes.map(() => -1), pending = new Set(nodes.map((_, i) => i));
  costs[end] = 0;
  while (pending.size) {
    const index = [...pending].reduce((a, b) => costs[a] < costs[b] ? a : b);
    pending.delete(index);
    for (const neighbor of routeLinks[index]) {
      const cost = costs[index] + distance(nodes[index].point, nodes[neighbor].point);
      if (cost < costs[neighbor]) { costs[neighbor] = cost; next[neighbor] = index; }
    }
  }
  return { costs, next };
}

export function startUpperStairAssist(current: UpperWalkState, direction: UpperStairDirection, stopAtHallDoors = false): UpperStairAssistState | null {
  const p = localStart(current, stopAtHallDoors), stop = destination(current, direction, stopAtHallDoors);
  if (!p || !stop) return null;
  const routeLinks = stopAtHallDoors && direction === 'up' ? hallDoorLinks : links;
  const navigation = stopAtHallDoors ? exhibitUpperNavigation : upperNavigation;
  const floor = navigation.floorHeight(p, current.surfaceId)!, routes = distancesTo(stop.node, routeLinks);
  const candidates: { point: WorldPoint; start: number; distance: number }[] = [];
  for (let i = 0; i < nodes.length; i++) for (const j of routeLinks[i]) {
    if (j < i) continue;
    const a = nodes[i], b = nodes[j];
    if (!a.surfaces.has(current.surfaceId!) && !b.surfaces.has(current.surfaceId!)) continue;
    const dx = b.point.x - a.point.x, dz = b.point.z - a.point.z, length2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((p.x - a.point.x) * dx + (p.z - a.point.z) * dz) / length2));
    const point = { x: a.point.x + dx * t, z: a.point.z + dz * t };
    const height = a.height + (b.height - a.height) * t;
    const start = routes.costs[i] + distance(point, a.point) <= routes.costs[j] + distance(point, b.point) ? i : j;
    candidates.push({ point, start, distance: Math.hypot(distance(point, p), height - floor) });
  }
  for (const candidate of candidates.sort((a, b) => a.distance - b.distance)) {
    // Joining the centreline is movement too. Reject an approach that would cut
    // a corner through a rail, a wall or the gap between the two flights.
    const joined = navigation.move({ position: p, surfaceId: current.surfaceId }, {
      x: candidate.point.x - p.x, z: candidate.point.z - p.z,
    });
    if (!joined?.surfaceId || distance(joined.position, candidate.point) > .025) continue;
    const points = [candidate.point];
    for (let index = candidate.start; index !== -1; index = routes.next[index]) {
      points.push(nodes[index].point);
      if (index === stop.node) break;
    }
    return { direction, destination: stop, waypoints: points.map(point => {
      const world = upperToWorld(point); return { x: world.x, z: world.z };
    }), nextWaypoint: 0, stalledSeconds: 0 };
  }
  return null;
}

/** Cancel by discarding the assist state; no checkpoint or world state is mutated. */
export function advanceUpperStairAssist(assist: UpperStairAssistState, current: UpperWalkState, dt: number, speed = 4.2, exhibit = false) {
  const seconds = Number.isFinite(dt) ? Math.max(0, Math.min(.05, dt)) : 0;
  let budget = Number.isFinite(speed) ? Math.max(0, speed) * seconds : 0;
  let walk = current, index = assist.nextWaypoint;
  while (budget > 1e-6 && index < assist.waypoints.length) {
    const goal = assist.waypoints[index], remaining = distance(walk.position, goal);
    if (remaining < .01) { index++; continue; }
    const amount = Math.min(remaining, budget), delta = {
      x: (goal.x - walk.position.x) / remaining * amount,
      z: (goal.z - walk.position.z) / remaining * amount,
    };
    const next = moveUpperPlayer(walk, delta, false, false, exhibit);
    if (!next?.surfaceId) break;
    const progressed = distance(walk.position, next.position);
    walk = next; budget -= amount;
    if (progressed < .0001) break;
  }
  const delta = { x: walk.position.x - current.position.x, z: walk.position.z - current.position.z };
  const stalledSeconds = Math.hypot(delta.x, delta.z) < .0001 && seconds > 0 ? assist.stalledSeconds + seconds : 0;
  const done = index >= assist.waypoints.length;
  const blocked = !walk.surfaceId || stalledSeconds > .45;
  return { assist: done || blocked ? null : { ...assist, nextWaypoint: index, stalledSeconds }, walk, delta, done, blocked };
}

/** Keep real-time speed on slower frames while retaining collision-aware 50 ms steps. */
export function advanceUpperStairAssistFrame(assist: UpperStairAssistState, current: UpperWalkState, dt: number, speed = 4.2, exhibit = false) {
  let remaining = Number.isFinite(dt) ? Math.max(0, Math.min(.15, dt)) : 0;
  const first = Math.min(.05, remaining);
  let result = advanceUpperStairAssist(assist, current, first, speed, exhibit);
  remaining -= first;
  while (result.assist && remaining > 1e-6) {
    const step = Math.min(.05, remaining);
    result = advanceUpperStairAssist(result.assist, result.walk, step, speed, exhibit);
    remaining -= step;
  }
  return { ...result, delta: {
    x: result.walk.position.x - current.position.x,
    z: result.walk.position.z - current.position.z,
  } };
}
