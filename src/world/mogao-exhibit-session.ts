import { TERRAIN_ANCHORS } from '../content/world/terrain-layout-v001';
import { finishedMogaoExhibit, loadMogaoExhibitProgress } from '../services/mogao-exhibit-progress';
import { finishedMogaoHallA, loadMogaoHallAProgress } from '../services/mogao-hall-a-progress';
import type { StorageLike } from '../services/progress';
import { MOGAO_BUDDHA_GATE, MOGAO_HALL_A_BUDDHA_GATE, upperFromWorld, upperToWorld } from './mogao-upper-navigation';
import { sanitizeUpperPreviewCheckpoint, UPPER_SESSION_OPTIONS, upperPreviewCheckpoint } from './mogao-upper-session';
import { defaultWorldCheckpoint } from './session';
import type { WorldCheckpoint } from './types';

export const MOGAO_EXHIBIT_SESSION_KEY = 'dunhuang:mogao-exhibit:walk:v1';
const { cliffStairFoot, cliffDoor } = TERRAIN_ANCHORS;
const exhibitSpawn = {
  x: cliffStairFoot.x, z: cliffStairFoot.z,
  heading: Math.atan2(cliffStairFoot.x - cliffDoor.x, cliffStairFoot.z - cliffDoor.z),
};

export function mogaoExhibitStartCheckpoint(): WorldCheckpoint {
  return defaultWorldCheckpoint(exhibitSpawn);
}

export function restrictMogaoExhibitCheckpoint(checkpoint: WorldCheckpoint, bFinished: boolean, aFinished = true): WorldCheckpoint {
  const safe = sanitizeUpperPreviewCheckpoint(checkpoint, true);
  if (bFinished && aFinished) return safe;
  const local = upperFromWorld(safe.position);
  const nearDoor = local.x < 15.5 && local.z > -14.7;
  const crosses = (hall: 'a' | 'b') => safe.walkSurface === `view-${hall}` ||
    safe.walkSurface === `view-link-${hall}` || (safe.walkSurface === `hall-${hall}` && nearDoor);
  const blockedHall = !aFinished && crosses('a') ? 'a' : !bFinished && crosses('b') ? 'b' : null;
  if (!blockedHall) return safe;
  const gate = blockedHall === 'a' ? MOGAO_HALL_A_BUDDHA_GATE : MOGAO_BUDDHA_GATE;
  const inside = upperToWorld({ x: 17, y: gate.min[1], z: (gate.min[2] + gate.max[2]) / 2 });
  return { ...safe, position: { x: inside.x, z: inside.z }, walkSurface: `hall-${blockedHall}` };
}

const sanitize = (checkpoint: WorldCheckpoint, progressStorage?: StorageLike) =>
  restrictMogaoExhibitCheckpoint(checkpoint,
    finishedMogaoExhibit(loadMogaoExhibitProgress(progressStorage).data),
    finishedMogaoHallA(loadMogaoHallAProgress(progressStorage).data));

export const MOGAO_EXHIBIT_SESSION_OPTIONS = {
  ...UPPER_SESSION_OPTIONS, key: MOGAO_EXHIBIT_SESSION_KEY, spawn: exhibitSpawn, sanitizeCheckpoint: sanitize,
};

export function initializeMogaoExhibitPreviewSession(storage: StorageLike, view?: string | null, progressStorage?: StorageLike) {
  if (!view && storage.getItem(MOGAO_EXHIBIT_SESSION_KEY) !== null) return;
  const checkpoint = view ? sanitize(upperPreviewCheckpoint(view, true), progressStorage) : mogaoExhibitStartCheckpoint();
  storage.setItem(MOGAO_EXHIBIT_SESSION_KEY, JSON.stringify(checkpoint));
}
