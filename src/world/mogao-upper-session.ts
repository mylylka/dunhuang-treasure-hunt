import layout from '../content/world/mogao-upper-v002.json';
import exhibitLayout from '../content/world/mogao-upper-v003.json';
import legacyLayout from '../content/world/mogao-upper-v001.json';
import { TERRAIN_REGIONS } from '../content/world/terrain-layout-v001';
import type { StorageLike } from '../services/progress';
import { sanitizeTerrainPosition } from './terrain-rules-v001';
import { createUpperNavigation, sanitizeUpperCheckpoint, upperFromWorld, upperToWorld, type UpperNavigationLayout } from './mogao-upper-navigation';
import { defaultWorldCheckpoint, loadWorldSession, type WorldSessionOptions } from './session';
import type { WorldCheckpoint } from './types';

export const LEGACY_UPPER_SESSION_KEY = 'dunhuang:mogao-upper:v1';
export const UPPER_SESSION_KEY = 'dunhuang:mogao-upper:v2';
export const UPPER_PREVIEW_VIEWS = ['start', 'ground', 'upper-a', 'upper-b', 'hall-a', 'hall-b'] as const;
export type UpperPreviewView = typeof UPPER_PREVIEW_VIEWS[number];
const normalizeYaw = (yaw: number) => Math.atan2(Math.sin(yaw), Math.cos(yaw));
const legacyNavigation = createUpperNavigation(legacyLayout as unknown as UpperNavigationLayout);

/** Explicit inspection stations affect only the isolated upper-gallery preview. */
export function upperPreviewCheckpoint(view: string = 'start', exhibit = false): WorldCheckpoint {
  const source = exhibit ? exhibitLayout : layout;
  const viewpoint = source.viewpoints.find(p => p.id === (view === 'upper-a' ? 'view-a' : view === 'upper-b' ? 'view-b' : view));
  const room = source.rooms.find(p => p.id === view);
  let position = source.spawn.position;
  let surfaceId = source.spawn.surfaceId;
  // At the side doorway the next step is toward the right-hand stairwell.
  let yaw = -Math.PI / 2;
  if (viewpoint) {
    position = viewpoint.position;
    surfaceId = viewpoint.surfaceId;
    yaw = Math.atan2(position[0] - viewpoint.target[0], position[2] - viewpoint.target[2]);
  } else if (room) {
    position = [(room.min[0] + room.max[0]) / 2, room.floorY, (room.min[2] + room.max[2]) / 2];
    surfaceId = room.id;
    yaw = Math.PI;
  }
  const world = upperToWorld({ x: position[0], y: position[1], z: position[2] });
  const checkpoint = defaultWorldCheckpoint({ x: world.x, z: world.z });
  checkpoint.walkSurface = surfaceId;
  checkpoint.heading = checkpoint.cameraYaw = normalizeYaw(yaw + TERRAIN_REGIONS.cliff.yaw);
  return sanitizeUpperCheckpoint(checkpoint, exhibit);
}

/** Preserve the level before applying the old terrain sanitizer to outdoor points. */
export function sanitizeUpperPreviewCheckpoint(checkpoint: WorldCheckpoint, exhibit = false): WorldCheckpoint {
  const restored = sanitizeUpperCheckpoint(checkpoint, exhibit);
  return restored.walkSurface ? restored : { ...restored, position: sanitizeTerrainPosition(restored.position) };
}

/** Old flight IDs have different heights in v2, so resolve against the old layout first. */
export function restoreLegacyUpperCheckpoint(checkpoint: WorldCheckpoint): WorldCheckpoint {
  const local = upperFromWorld(checkpoint.position);
  const savedSurface = checkpoint.walkSurface;
  if (!savedSurface) return sanitizeUpperPreviewCheckpoint(checkpoint);
  const oldState = legacyNavigation.sanitize({ position: local, surfaceId: savedSurface });
  if (!/^(flight|landing)-/.test(savedSurface) && oldState.surfaceId === savedSurface) {
    return sanitizeUpperPreviewCheckpoint(checkpoint);
  }
  const height = legacyNavigation.floorHeight(oldState.position, oldState.surfaceId) ?? 0;
  const hall = [...layout.rooms].sort((a, b) => b.floorY - a.floorY)
    .find(room => room.floorY <= height + .001);
  const safe = upperPreviewCheckpoint(hall?.id ?? 'start');
  const stop = hall && layout.route.find(point => point.surfaceId === hall.id);
  if (stop) {
    const world = upperToWorld({ x: stop.position[0], y: stop.position[1], z: stop.position[2] });
    safe.position = { x: world.x, z: world.z };
    safe.walkSurface = stop.surfaceId;
  }
  safe.visitedEvents = [...checkpoint.visitedEvents];
  return sanitizeUpperPreviewCheckpoint(safe);
}

/** Initialize only the new key; damaged/empty existing v2 records never revive v1. */
export function initializeUpperPreviewSession(storage: StorageLike, view?: string | null): void {
  if (view && UPPER_PREVIEW_VIEWS.some(option => option === view)) {
    storage.setItem(UPPER_SESSION_KEY, JSON.stringify(upperPreviewCheckpoint(view)));
    return;
  }
  if (storage.getItem(UPPER_SESSION_KEY) !== null) return;
  const checkpoint = storage.getItem(LEGACY_UPPER_SESSION_KEY) === null
    ? upperPreviewCheckpoint()
    : loadWorldSession(storage, {
      key: LEGACY_UPPER_SESSION_KEY,
      freeYaw: true,
      spawn: upperPreviewCheckpoint().position,
      sanitizeCheckpoint: restoreLegacyUpperCheckpoint,
    }).data;
  storage.setItem(UPPER_SESSION_KEY, JSON.stringify(checkpoint));
}

export const UPPER_SESSION_OPTIONS: WorldSessionOptions & { key: string } = {
  key: UPPER_SESSION_KEY,
  freeYaw: true,
  spawn: upperPreviewCheckpoint().position,
  sanitizeCheckpoint: sanitizeUpperPreviewCheckpoint,
};
