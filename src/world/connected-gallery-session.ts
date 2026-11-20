import { OASIS_OBSTACLES } from './desert-oasis-obstacles-v013';
import { PLAYER_RADIUS } from './movement';
import { TERRAIN_COURTYARD_EXPANSION, TERRAIN_REGIONS } from '../content/world/terrain-layout-v001';
import { FIRST_GALLERY_WORLD_SESSION_KEY } from '../services/first-gallery-entry';
import { isFirstGalleryUnlocked, loadFirstGallery } from '../services/first-gallery';
import { finishedMusicGallery, loadMusicGalleryProgress } from '../services/music-gallery-progress';
import { galleryBlockedRegion } from './first-gallery-events';
import { MOGAO_EXHIBIT_SESSION_OPTIONS } from './mogao-exhibit-session';
import { MOGAO_EXHIBIT_UPPER_LAYOUT } from './mogao-upper-navigation';
import { sanitizeMusicCompanionCheckpoint } from './music-companion-session-v002';
import { createMusicInteriorNavigation, MUSIC_INTERIOR_LAYOUT } from './music-interior-navigation';
import { MUSIC_INSTRUMENT_DISPLAY_SOLIDS } from '../content/world/music-instrument-display-layout-v001';
import { defaultWorldCheckpoint, type WorldSessionOptions } from './session';
import { fromTerrainPoint, isTerrainWalkable, terrainRegionAt, TERRAIN_SPAWN } from './terrain-rules-v001';
import type { WorldCheckpoint, WorldPoint } from './types';

export type ConnectedGallery = 'first' | 'music' | 'mogao';
const musicSurfaces = new Set<string>(MUSIC_INTERIOR_LAYOUT.surfaces.map(surface => surface.id));
const caveSurfaces = new Set<string>(MOGAO_EXHIBIT_UPPER_LAYOUT.surfaces.map(surface => surface.id));
const musicNavigationOptions = {
  compactBalcony: true, connectedTerrain: true, additionalSolids: MUSIC_INSTRUMENT_DISPLAY_SOLIDS,
};
const connectedMusicNavigation = createMusicInteriorNavigation({ ...musicNavigationOptions, composedCourtyard: true });
const priorMusicNavigation = createMusicInteriorNavigation(musicNavigationOptions);

export const isMusicWalkSurface = (surface?: string | null) => !!surface && musicSurfaces.has(surface);
export const isMogaoWalkSurface = (surface?: string | null) => !!surface && caveSurfaces.has(surface);

export function connectedGalleryAt({ position, walkSurface }: Pick<WorldCheckpoint, 'position' | 'walkSurface'>): ConnectedGallery | undefined {
  if (isMusicWalkSurface(walkSurface)) return 'music';
  if (isMogaoWalkSurface(walkSurface)) return 'mogao';
  const local = fromTerrainPoint('courtyard', position);
  const { floor } = TERRAIN_COURTYARD_EXPANSION;
  if (local.x >= floor.minX && local.x <= floor.maxX && local.z >= floor.minZ && local.z <= floor.maxZ) return 'first';
}

export function connectedGalleryBlockedRegion(position: WorldPoint, firstUnlocked: boolean, musicUnlocked: boolean) {
  return galleryBlockedRegion(position, firstUnlocked, firstUnlocked && musicUnlocked);
}

export const connectedGalleryStartCheckpoint = () => defaultWorldCheckpoint({ ...TERRAIN_SPAWN, heading: TERRAIN_REGIONS.courtyard.yaw });

/** A traveller saved on a new trunk or rock can continue beside it on the same walk surface. */
function clearNewOasisFootprint(checkpoint: WorldCheckpoint, firstUnlocked: boolean, musicUnlocked: boolean): WorldCheckpoint {
  if (checkpoint.walkSurface && checkpoint.walkSurface !== 'music-courtyard') return checkpoint;
  const { x, z } = checkpoint.position;
  const occupied = OASIS_OBSTACLES.find(({ circle }) =>
    Math.hypot(circle.x - x, circle.z - z) < circle.radius + PLAYER_RADIUS);
  if (!occupied) return checkpoint;
  const surfaceId = checkpoint.walkSurface ?? null;
  const direction = Math.atan2(z - occupied.circle.z, x - occupied.circle.x);
  // Start just beyond the blocking body. Try both sides if a wall or another
  // tree occupies the closest exit. Never move a checkpoint through a locked gate.
  for (let extra = .10; extra < 4; extra += .5) {
    const radius = occupied.circle.radius + PLAYER_RADIUS + extra;
    for (let i = 0; i < 16; i++) {
      const angle = direction + Math.ceil(i / 2) * (i % 2 ? 1 : -1) * Math.PI / 8;
      const position = { x: occupied.circle.x + radius * Math.cos(angle), z: occupied.circle.z + radius * Math.sin(angle) };
      if (connectedGalleryBlockedRegion(position, firstUnlocked, musicUnlocked)) continue;
      if (!isTerrainWalkable(position, true, undefined, true, true)) continue;
      if (surfaceId && !connectedMusicNavigation.musicInteriorValid({ position, surfaceId })) continue;
      return { ...checkpoint, position };
    }
  }
  return checkpoint;
}

export function sanitizeConnectedGalleryCheckpoint(checkpoint: WorldCheckpoint, firstUnlocked: boolean, musicUnlocked: boolean, composedCourtyard = true): WorldCheckpoint {
  const start = () => ({ ...connectedGalleryStartCheckpoint(), visitedEvents: checkpoint.visitedEvents });
  if (connectedGalleryBlockedRegion(checkpoint.position, firstUnlocked, musicUnlocked)) return start();
  if (composedCourtyard) checkpoint = clearNewOasisFootprint(checkpoint, firstUnlocked, musicUnlocked);
  const region = terrainRegionAt(checkpoint.position);
  if (firstUnlocked && region === 'music') {
    const restored = sanitizeMusicCompanionCheckpoint(checkpoint, composedCourtyard ? connectedMusicNavigation : priorMusicNavigation, true);
    if (!connectedGalleryBlockedRegion(restored.position, firstUnlocked, musicUnlocked)) return restored;
  }
  if (firstUnlocked && musicUnlocked && region === 'cliff') {
    const restored = MOGAO_EXHIBIT_SESSION_OPTIONS.sanitizeCheckpoint(checkpoint, undefined, true);
    if (!connectedGalleryBlockedRegion(restored.position, firstUnlocked, musicUnlocked)) return restored;
  }
  if (isTerrainWalkable(checkpoint.position, true, undefined, true, composedCourtyard)) return { ...checkpoint, walkSurface: undefined };
  return start();
}

export const CONNECTED_GALLERY_SESSION_OPTIONS: WorldSessionOptions = {
  key: FIRST_GALLERY_WORLD_SESSION_KEY,
  freeYaw: true,
  spawn: { ...TERRAIN_SPAWN, heading: TERRAIN_REGIONS.courtyard.yaw },
  sanitizeCheckpoint: checkpoint => sanitizeConnectedGalleryCheckpoint(checkpoint,
    isFirstGalleryUnlocked(loadFirstGallery().data), finishedMusicGallery(loadMusicGalleryProgress())),
};
