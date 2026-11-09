import { TERRAIN_REGIONS, toTerrainPoint } from '../content/world/terrain-layout-v001';
import { MUSIC_GUIDE_PLAYER_START } from '../content/world/music-guide-v001';
import { MUSIC_INSTRUMENT_DISPLAY_SOLIDS } from '../content/world/music-instrument-display-layout-v001';
import type { StorageLike } from '../services/progress';
import { defaultWorldCheckpoint, type WorldSessionOptions } from './session';
import { createMusicInteriorNavigation, legacyMusicInteriorNavigation, type MusicInteriorNavigation } from './music-interior-navigation';
import type { WorldCheckpoint } from './types';

export const MUSIC_COMPANION_SESSION_KEY_V2 = 'dunhuang:music-companion:v2';
export function companionPreviewCheckpointV2(navigation: MusicInteriorNavigation = legacyMusicInteriorNavigation) {
  const state = navigation.musicInteriorSafeState();
  const checkpoint = defaultWorldCheckpoint(state.position);
  checkpoint.walkSurface = state.surfaceId ?? undefined;
  checkpoint.heading = checkpoint.cameraYaw = TERRAIN_REGIONS.music.yaw;
  return checkpoint;
}
export function musicGuidePreviewCheckpoint() {
  const { x, z } = toTerrainPoint('music', MUSIC_GUIDE_PLAYER_START);
  const checkpoint = defaultWorldCheckpoint({ x, z });
  checkpoint.heading = checkpoint.cameraYaw = TERRAIN_REGIONS.music.yaw;
  return checkpoint;
}

export function sanitizeMusicCompanionCheckpoint(checkpoint: WorldCheckpoint, navigation: MusicInteriorNavigation, guide: boolean): WorldCheckpoint {
  const { position, walkSurface } = checkpoint;
  if (walkSurface && navigation.layout.surfaces.some(surface => surface.id === walkSurface)) {
    const state = { position, surfaceId: walkSurface };
    if (navigation.musicInteriorValid(state)) return checkpoint;
    // If a layout change obstructs a saved point, use the safe point on its own floor.
    const safe = navigation.sanitizeMusicInteriorState(state);
    if (safe.surfaceId && navigation.musicInteriorValid(safe)) {
      return { ...checkpoint, position: safe.position, walkSurface: safe.surfaceId };
    }
  }

  // Older saves did not record floor ownership. Prefer the first valid surface
  // in lower-to-upper layout order; exact stacked-floor restoration requires a saved ID.
  const surface = navigation.layout.surfaces.find(({ id }) => navigation.musicInteriorValid({ position, surfaceId: id }));
  if (surface) return { ...checkpoint, walkSurface: surface.id };
  if (navigation.musicInteriorValid({ position, surfaceId: null })) return { ...checkpoint, walkSurface: undefined };

  const start = guide ? musicGuidePreviewCheckpoint() : companionPreviewCheckpointV2(navigation);
  return { ...start, visitedEvents: checkpoint.visitedEvents };
}

const guideNavigation = createMusicInteriorNavigation({ compactBalcony: true, additionalSolids: MUSIC_INSTRUMENT_DISPLAY_SOLIDS });

export const MUSIC_COMPANION_SESSION_OPTIONS_V2: WorldSessionOptions = {
  key: MUSIC_COMPANION_SESSION_KEY_V2,
  spawn: companionPreviewCheckpointV2().position,
  freeYaw: true,
  sanitizeCheckpoint: checkpoint => sanitizeMusicCompanionCheckpoint(checkpoint, legacyMusicInteriorNavigation, false),
};

export const MUSIC_GUIDE_SESSION_OPTIONS: WorldSessionOptions = {
  ...MUSIC_COMPANION_SESSION_OPTIONS_V2,
  spawn: musicGuidePreviewCheckpoint().position,
  sanitizeCheckpoint: checkpoint => sanitizeMusicCompanionCheckpoint(checkpoint, guideNavigation, true),
};

export function initializeMusicCompanionPreviewSession(storage: StorageLike, guide: boolean) {
  if (storage.getItem(MUSIC_COMPANION_SESSION_KEY_V2) !== null) return;
  const start = guide ? musicGuidePreviewCheckpoint() : companionPreviewCheckpointV2();
  storage.setItem(MUSIC_COMPANION_SESSION_KEY_V2, JSON.stringify(start));
}
