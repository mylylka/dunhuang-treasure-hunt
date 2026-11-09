import * as THREE from 'three';
import layout from '../content/world/mogao-upper-v002.json';
import { MOGAO_EXHIBIT_ENTRANCES } from '../content/world/mogao-exhibit-entrance-v001';
import { settleUpperCamera } from './mogao-upper-camera';
import { upperFromWorld, upperToWorld, type UpperWalkState } from './mogao-upper-navigation';
import type { MogaoExhibitHall, WorldPoint, WorldSnapshot } from './types';

const HALL_TITLE_TURN_SECONDS = .55;
export const HALL_TITLE_HOLD_SECONDS = 2.5;
const HALL_ENTRY_SPEED = 2.35;
const landingByHall = { 'hall-a': 'landing-2', 'hall-b': 'landing-4' } as const;
const titleFraming = {
  'hall-a': { distance: 3.5, lift: 1.85, focus: .34, fov: 60 },
  // A lower eye line keeps the title on B's canopy readable from the landing.
  'hall-b': { distance: 4, lift: 1.45, focus: .42, fov: 58 },
};
const halls = MOGAO_EXHIBIT_ENTRANCES.map(entrance => {
  const room = layout.rooms.find(room => room.id === entrance.id)!;
  const landing = layout.surfaces.find(surface => surface.id === landingByHall[entrance.id])!;
  const [x, , z] = layout.route.find(point => point.surfaceId === entrance.id)!.position;
  const [tx, ty, tz] = entrance.center;
  return { id: entrance.id, floor: room.floorY, landing, destination: upperToWorld({ x, z }), title: upperToWorld({ x: tx, y: ty, z: tz }) };
});
const settingsFor = (id: MogaoExhibitHall) => halls.find(hall => hall.id === id)!;
const pointDistance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);

export type MogaoHallArrival = NonNullable<WorldSnapshot['mogaoHallArrival']> & {
  start: WorldPoint;
  seconds: number;
  stalledSeconds: number;
};

function isAtMouth(point: WorldPoint, hall: typeof halls[number]) {
  return point.x >= hall.landing.minX + .18 && point.x <= hall.landing.maxX - .18
    && point.z >= hall.landing.maxZ - 1.15;
}

export function isMogaoHallAtDoor(walk: UpperWalkState, id: MogaoExhibitHall) {
  const hall = settingsFor(id);
  return (walk.surfaceId === hall.landing.id || walk.surfaceId === id) && isAtMouth(upperFromWorld(walk.position), hall);
}

export function findMogaoHallArrival(before: UpperWalkState, after: UpperWalkState, completedUp = false) {
  const hall = halls.find(item => after.surfaceId === item.landing.id || after.surfaceId === item.id);
  if (!hall || before.surfaceId === hall.id) return null;
  if (completedUp && after.surfaceId === hall.landing.id) return hall.id;
  const next = upperFromWorld(after.position);
  const prior = upperFromWorld(before.position);
  if (next.z - prior.z <= Math.max(.0001, Math.abs(next.x - prior.x) * .28) || !isAtMouth(next, hall)) return null;
  // A normal approach can start on the last stair or on the same landing.
  // Only the actual doorway seam can start it from an overlapping hall floor.
  return after.surfaceId === hall.landing.id || before.surfaceId === hall.landing.id ? hall.id : null;
}

export function createMogaoHallArrival(hall: MogaoExhibitHall, start: WorldPoint): MogaoHallArrival {
  return { hall, start: { ...start }, phase: 'title', seconds: 0, stalledSeconds: 0 };
}

export function mogaoHallArrivalDelta(arrival: MogaoHallArrival, point: WorldPoint, dt: number): WorldPoint {
  if (arrival.phase !== 'entering') return { x: 0, z: 0 };
  const goal = settingsFor(arrival.hall).destination;
  const remaining = pointDistance(point, goal);
  const fraction = remaining ? Math.min(1, HALL_ENTRY_SPEED * dt / remaining) : 0;
  return { x: (goal.x - point.x) * fraction, z: (goal.z - point.z) * fraction };
}

export function advanceMogaoHallArrival(arrival: MogaoHallArrival, before: WorldPoint, after: UpperWalkState, dt: number) {
  if (arrival.phase === 'intro') return null;
  arrival.seconds += dt;
  if (arrival.phase === 'title' && arrival.seconds >= HALL_TITLE_TURN_SECONDS + HALL_TITLE_HOLD_SECONDS) {
    arrival.phase = 'entering';
    arrival.seconds = 0;
  } else if (arrival.phase === 'entering') {
    if (after.surfaceId === arrival.hall && pointDistance(after.position, settingsFor(arrival.hall).destination) <= .02) {
      arrival.phase = 'intro';
      arrival.seconds = 0;
      return 'ready';
    }
    arrival.stalledSeconds = pointDistance(before, after.position) < .0001 ? arrival.stalledSeconds + dt : 0;
    if (arrival.stalledSeconds > .75) return 'blocked';
  }
  return null;
}

export function mogaoHallTitleYaw(hall: MogaoExhibitHall, point: WorldPoint) {
  const { title } = settingsFor(hall);
  return Math.atan2(point.x - title.x, point.z - title.z);
}

export function mogaoHallTitleCamera(arrival: MogaoHallArrival, reduced: boolean, bLocked: boolean, aLocked: boolean) {
  const weight = arrival.phase === 'title'
    ? reduced ? 1 : THREE.MathUtils.smoothstep(arrival.seconds, 0, HALL_TITLE_TURN_SECONDS)
    : arrival.phase === 'entering' && !reduced ? 1 - THREE.MathUtils.smoothstep(arrival.seconds, 0, .65) : 0;
  if (!weight) return null;
  const hall = settingsFor(arrival.hall);
  const framing = titleFraming[arrival.hall];
  const start = upperFromWorld(arrival.start);
  const eye = upperToWorld({ ...start, y: hall.floor + 1.25 });
  const z = Math.min(start.z, hall.landing.maxZ - 1.2) - framing.distance;
  const back = upperToWorld({ x: start.x, y: hall.floor + framing.lift, z });
  const anchor = new THREE.Vector3(eye.x, eye.y, eye.z);
  const position = settleUpperCamera(anchor, new THREE.Vector3(back.x, back.y, back.z), bLocked, true, aLocked);
  const target = anchor.clone().lerp(new THREE.Vector3(hall.title.x, hall.title.y, hall.title.z), framing.focus);
  return { position, target, weight, fov: framing.fov };
}
