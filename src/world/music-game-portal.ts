import { musicInteriorToWorld } from './music-interior-navigation';
import type { WorldCheckpoint } from './types';

// Just inside the courtyard wall, on the left when facing the exit. The pavers rise to .035 m.
export const MUSIC_GAME_PORTAL_CENTER = musicInteriorToWorld({ x: 44.9, y: .05, z: 1.38 });
const INTERACT_DISTANCE = 2.25;

export function nearMusicGamePortal(checkpoint: WorldCheckpoint): boolean {
  return checkpoint.walkSurface === 'music-courtyard' &&
    Math.hypot(checkpoint.position.x - MUSIC_GAME_PORTAL_CENTER.x, checkpoint.position.z - MUSIC_GAME_PORTAL_CENTER.z) < INTERACT_DISTANCE;
}
