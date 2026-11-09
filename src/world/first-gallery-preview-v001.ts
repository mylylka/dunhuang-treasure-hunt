import './mogao-preview-v001.css';
import './mogao-preview-v012.css';
import './music-pavilion-preview-v005.css';
import './flying-voice-preview.css';
import './character-cinematics-preview.css';
import './music-pavilion-preview.css';
import './music-pavilion-preview-v002.css';
import './terrain-preview-v001.css';
import { FIRST_GALLERY_WORLD_SESSION_KEY } from '../services/first-gallery-entry';
import { TERRAIN_REGIONS, TERRAIN_SPAWN, terrainRegionAt, toTerrainPoint } from './terrain-rules-v001';
import { defaultWorldCheckpoint } from './session';
import { FIRST_GALLERY_MURAL_OBSERVER } from './first-gallery-mural-camera';
import { TERRAIN_FIRST_GALLERY_COURTYARD_MODEL, TERRAIN_TRAVELER_MODEL, worldAssetUrl } from '../content/world/assets';

// Only curated first-hall inspection stations; the story entry cannot use the
// terrain preview's second/third-gallery stations to bypass progression.
const positions: Record<string, [number, number, number]> = {
  easel: [-6.5, -3.9, -2.18], mural: [FIRST_GALLERY_MURAL_OBSERVER.x, FIRST_GALLERY_MURAL_OBSERVER.z, 0], caisson: [-12, -14, 0], scroll: [-19, -1.7, 2.45],
};
const query = new URLSearchParams(location.search), station = query.get('view');
if (station && positions[station]) {
  const [x, z, yaw] = positions[station], point = toTerrainPoint('courtyard', { x, z });
  const checkpoint = defaultWorldCheckpoint(TERRAIN_SPAWN);
  checkpoint.position = { x: point.x, z: point.z }; checkpoint.heading = checkpoint.cameraYaw = yaw + TERRAIN_REGIONS.courtyard.yaw;
  try { sessionStorage.setItem(FIRST_GALLERY_WORLD_SESSION_KEY, JSON.stringify(checkpoint)); } catch { /* Normal in-app save warning is retained. */ }
  query.delete('view'); history.replaceState(null, '', `${location.pathname}${query.size ? `?${query}` : ''}${location.hash}`);
}
if (!location.hash || location.hash === '#' || location.hash === '#/') {
  let preloadCourtyard = true;
  try {
    const saved = sessionStorage.getItem(FIRST_GALLERY_WORLD_SESSION_KEY);
    const checkpoint = saved ? JSON.parse(saved) : null;
    if (checkpoint?.position && Number.isFinite(checkpoint.position.x) && Number.isFinite(checkpoint.position.z)) {
      preloadCourtyard = terrainRegionAt(checkpoint.position) === 'courtyard';
    }
  } catch { /* Invalid sessions fall back to the first courtyard. */ }
  const paths = preloadCourtyard ? [TERRAIN_FIRST_GALLERY_COURTYARD_MODEL, TERRAIN_TRAVELER_MODEL] : [TERRAIN_TRAVELER_MODEL];
  for (const path of paths) {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'fetch';
    preload.crossOrigin = 'anonymous';
    preload.href = worldAssetUrl(path);
    document.head.append(preload);
  }
}
export const mainReady = import('../main');
