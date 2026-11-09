import { legacyMusicInteriorNavigation, MUSIC_INTERIOR_LAYOUT, musicInteriorMove, musicInteriorToWorld, type MusicInteriorNavigation, type MusicInteriorWalkState } from './music-interior-navigation';
import type { WorldPoint } from './types';

export type MusicInteriorStairDirection = 'up' | 'down';
export type MusicInteriorMove = (state: MusicInteriorWalkState, delta: WorldPoint) => MusicInteriorWalkState;
export interface MusicInteriorStairStop { surfaceId: string; position: WorldPoint; height: number; label: string }
export interface MusicInteriorWalkAssistState {
  waypoints: readonly WorldPoint[];
  nextWaypoint: number;
  stalledSeconds: number;
}
export interface MusicInteriorStairAssistState extends MusicInteriorWalkAssistState {
  direction: MusicInteriorStairDirection;
  destination: MusicInteriorStairStop;
}
export interface MusicInteriorStairOption { available: boolean; label: string; surfaceId?: string }
const distance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);
const stops: MusicInteriorStairStop[] = MUSIC_INTERIOR_LAYOUT.stops.map(stop => {
  const p = musicInteriorToWorld({ x: stop.position[0], y: stop.position[1], z: stop.position[2] });
  return { surfaceId: stop.surfaceId, position: { x: p.x, z: p.z }, height: p.y, label: stop.label };
});

function availableDestination(current: MusicInteriorWalkState, direction: MusicInteriorStairDirection, navigation: MusicInteriorNavigation) {
  if (!navigation.musicInteriorValid(current)) return null;
  const onStair = current.surfaceId === 'music-stair';
  const atStop = stops.some(stop => stop.surfaceId === current.surfaceId && distance(stop.position, current.position) <= MUSIC_INTERIOR_LAYOUT.assist.startRadius);
  if (!onStair && !atStop) return null;
  const height = navigation.musicInteriorHeight(current);
  return (direction === 'up' ? stops : [...stops].reverse()).find(stop => direction === 'up' ? stop.height > height + .001 : stop.height < height - .001) ?? null;
}

export function getMusicInteriorStairOptions(current: MusicInteriorWalkState,
  navigation: MusicInteriorNavigation = legacyMusicInteriorNavigation): Record<MusicInteriorStairDirection, MusicInteriorStairOption> {
  const option = (direction: MusicInteriorStairDirection): MusicInteriorStairOption => {
    const destination = availableDestination(current, direction, navigation);
    return destination ? { available: true, label: destination.label, surfaceId: destination.surfaceId } : { available: false, label: direction === 'up' ? '上楼' : '下楼' };
  };
  return { up: option('up'), down: option('down') };
}

export function startMusicInteriorStairAssist(current: MusicInteriorWalkState, direction: MusicInteriorStairDirection,
  navigation: MusicInteriorNavigation = legacyMusicInteriorNavigation): MusicInteriorStairAssistState | null {
  const destination = availableDestination(current, direction, navigation);
  if (!destination) return null;
  const route = navigation.musicInteriorPath(current, { position: destination.position, surfaceId: destination.surfaceId });
  return route ? { direction, destination: { ...destination, position: { ...destination.position } }, waypoints: route.map(s => ({ ...s.position })), nextWaypoint: 0, stalledSeconds: 0 } : null;
}

/** Every intermediate movement passes through the injected resolver, including
 * player/NPC collision. Discarding the returned assist cancels without a jump.
 */
export function advanceMusicInteriorStairAssist<Assist extends MusicInteriorWalkAssistState>(assist: Assist, current: MusicInteriorWalkState, dt: number, speed: number = MUSIC_INTERIOR_LAYOUT.assist.speed, move: MusicInteriorMove = musicInteriorMove) {
  const seconds = Number.isFinite(dt) ? Math.max(0, Math.min(.05, dt)) : 0;
  let budget = Number.isFinite(speed) ? Math.max(0, speed) * seconds : 0;
  let walk = current, index = assist.nextWaypoint;
  while (budget > 1e-6 && index < assist.waypoints.length) {
    const goal = assist.waypoints[index], remaining = distance(walk.position, goal);
    if (remaining < .01) { index++; continue; }
    const amount = Math.min(remaining, budget), delta = { x: (goal.x - walk.position.x) / remaining * amount, z: (goal.z - walk.position.z) / remaining * amount };
    const next = move(walk, delta), progressed = distance(walk.position, next.position);
    walk = next; budget -= amount;
    if (progressed < .0001) break;
  }
  const delta = { x: walk.position.x - current.position.x, z: walk.position.z - current.position.z };
  const stalledSeconds = Math.hypot(delta.x, delta.z) < .0001 && seconds > 0 ? assist.stalledSeconds + seconds : 0;
  const done = index >= assist.waypoints.length;
  const blocked = !walk.surfaceId || stalledSeconds > MUSIC_INTERIOR_LAYOUT.assist.stallSeconds;
  return { assist: done || blocked ? null : { ...assist, nextWaypoint: index, stalledSeconds }, walk, delta, done, blocked };
}

/** Up to 150ms of real time, retaining 50ms collision/actor-avoidance steps. */
export function advanceMusicInteriorWalkAssistFrame<Assist extends MusicInteriorWalkAssistState>(assist: Assist, current: MusicInteriorWalkState, dt: number, speed: number = MUSIC_INTERIOR_LAYOUT.assist.speed, move: MusicInteriorMove = musicInteriorMove) {
  let remaining = Number.isFinite(dt) ? Math.max(0, Math.min(.15, dt)) : 0;
  const first = Math.min(.05, remaining);
  let result = advanceMusicInteriorStairAssist(assist, current, first, speed, move);
  remaining -= first;
  while (result.assist && remaining > 1e-6) {
    const step = Math.min(.05, remaining);
    result = advanceMusicInteriorStairAssist(result.assist, result.walk, step, speed, move); remaining -= step;
  }
  return { ...result, delta: { x: result.walk.position.x - current.position.x, z: result.walk.position.z - current.position.z } };
}

export const advanceMusicInteriorStairAssistFrame = advanceMusicInteriorWalkAssistFrame;
