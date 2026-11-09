import { TERRAIN_COURTYARD_EXPANSION, TERRAIN_REGIONS } from '../content/world/terrain-layout-v001';
import { FIRST_GALLERY_WORLD_SESSION_KEY } from '../services/first-gallery-entry';
import { isFirstGalleryUnlocked, loadFirstGallery } from '../services/first-gallery';
import { finishedMusicGallery, loadMusicGalleryProgress } from '../services/music-gallery-progress';
import { galleryBlockedRegion } from './first-gallery-events';
import { MOGAO_EXHIBIT_SESSION_OPTIONS } from './mogao-exhibit-session';
import { MOGAO_EXHIBIT_UPPER_LAYOUT } from './mogao-upper-navigation';
import { MUSIC_GUIDE_SESSION_OPTIONS } from './music-companion-session-v002';
import { MUSIC_INTERIOR_LAYOUT } from './music-interior-navigation';
import { defaultWorldCheckpoint, type WorldSessionOptions } from './session';
import { fromTerrainPoint, isTerrainWalkable, terrainRegionAt, TERRAIN_SPAWN } from './terrain-rules-v001';
import type { WorldCheckpoint, WorldPoint } from './types';

export type ConnectedGallery = 'first' | 'music' | 'mogao';
const musicSurfaces = new Set<string>(MUSIC_INTERIOR_LAYOUT.surfaces.map(surface => surface.id));
const caveSurfaces = new Set<string>(MOGAO_EXHIBIT_UPPER_LAYOUT.surfaces.map(surface => surface.id));

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

export function sanitizeConnectedGalleryCheckpoint(checkpoint: WorldCheckpoint, firstUnlocked: boolean, musicUnlocked: boolean): WorldCheckpoint {
  const start = () => ({ ...connectedGalleryStartCheckpoint(), visitedEvents: checkpoint.visitedEvents });
  if (connectedGalleryBlockedRegion(checkpoint.position, firstUnlocked, musicUnlocked)) return start();
  const region = terrainRegionAt(checkpoint.position);
  if (firstUnlocked && region === 'music') {
    const restored = MUSIC_GUIDE_SESSION_OPTIONS.sanitizeCheckpoint!(checkpoint);
    if (!connectedGalleryBlockedRegion(restored.position, firstUnlocked, musicUnlocked)) return restored;
  }
  if (firstUnlocked && musicUnlocked && region === 'cliff') {
    const restored = MOGAO_EXHIBIT_SESSION_OPTIONS.sanitizeCheckpoint!(checkpoint);
    if (!connectedGalleryBlockedRegion(restored.position, firstUnlocked, musicUnlocked)) return restored;
  }
  if (isTerrainWalkable(checkpoint.position, true)) return { ...checkpoint, walkSurface: undefined };
  return start();
}

export const CONNECTED_GALLERY_SESSION_OPTIONS: WorldSessionOptions = {
  key: FIRST_GALLERY_WORLD_SESSION_KEY,
  freeYaw: true,
  spawn: { ...TERRAIN_SPAWN, heading: TERRAIN_REGIONS.courtyard.yaw },
  sanitizeCheckpoint: checkpoint => sanitizeConnectedGalleryCheckpoint(checkpoint,
    isFirstGalleryUnlocked(loadFirstGallery().data), finishedMusicGallery(loadMusicGalleryProgress())),
};
