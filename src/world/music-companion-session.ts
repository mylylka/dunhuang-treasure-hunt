import config from '../content/world/music-companion-v001.json';
import { toTerrainPoint, TERRAIN_REGIONS } from '../content/world/terrain-layout-v001';
import { sanitizeTerrainPosition } from './terrain-rules-v001';
import { defaultWorldCheckpoint } from './session';

export const MUSIC_COMPANION_SESSION_KEY = 'dunhuang:music-companion:v1';
export function companionPreviewCheckpoint() {
  const point = toTerrainPoint('music', config.playerSpawn);
  const checkpoint = defaultWorldCheckpoint({ x: point.x, z: point.z });
  checkpoint.heading = checkpoint.cameraYaw = config.playerSpawn.heading + TERRAIN_REGIONS.music.yaw;
  return checkpoint;
}
export const MUSIC_COMPANION_SESSION_OPTIONS = {
  key: MUSIC_COMPANION_SESSION_KEY,
  spawn: companionPreviewCheckpoint().position,
  freeYaw: true,
  sanitizeCheckpoint: () => companionPreviewCheckpoint(),
  sanitizePosition: sanitizeTerrainPosition,
};
