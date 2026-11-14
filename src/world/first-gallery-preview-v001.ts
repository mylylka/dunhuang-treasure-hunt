import './first-gallery-world-styles';
import { CAISSON_ONLY_WORLD_SESSION_KEY, FIRST_GALLERY_WORLD_SESSION_KEY } from '../services/first-gallery-entry';
import { isCaissonOnlyMode } from '../services/first-gallery';
import { TERRAIN_REGIONS, TERRAIN_SPAWN, terrainRegionAt, toTerrainPoint } from './terrain-rules-v001';
import { defaultWorldCheckpoint } from './session';
import { FIRST_GALLERY_MURAL_OBSERVER } from './first-gallery-mural-camera';
import { TERRAIN_FIRST_GALLERY_COURTYARD_MODEL, travelerModelPath, worldAssetUrl } from '../content/world/assets';
import { isMobilePhone } from '../services/mobile-landscape';
import { readTravelerSelection } from '../services/traveler-selection';

// Only curated first-hall inspection stations; the story entry cannot use the
// terrain preview's second/third-gallery stations to bypass progression.
const positions: Record<string, [number, number, number]> = {
  easel: [-6.5, -3.9, -2.18], mural: [FIRST_GALLERY_MURAL_OBSERVER.x, FIRST_GALLERY_MURAL_OBSERVER.z, 0], caisson: [-12, -14, 0], scroll: [-19, -1.7, 2.45],
};
const query = new URLSearchParams(location.search), station = query.get('view');
const sessionKey = isCaissonOnlyMode() ? CAISSON_ONLY_WORLD_SESSION_KEY : FIRST_GALLERY_WORLD_SESSION_KEY;
if (station && positions[station] && (!isCaissonOnlyMode() || station === 'caisson')) {
  const [x, z, yaw] = positions[station], point = toTerrainPoint('courtyard', { x, z });
  const checkpoint = defaultWorldCheckpoint(TERRAIN_SPAWN);
  checkpoint.position = { x: point.x, z: point.z }; checkpoint.heading = checkpoint.cameraYaw = yaw + TERRAIN_REGIONS.courtyard.yaw;
  try { sessionStorage.setItem(sessionKey, JSON.stringify(checkpoint)); } catch { /* Normal in-app save warning is retained. */ }
  query.delete('view'); history.replaceState(null, '', `${location.pathname}${query.size ? `?${query}` : ''}${location.hash}`);
}
const connected = document.getElementById('root')?.dataset.connectedGalleries === 'v001';
const travelerSelectionEnabled = connected || isCaissonOnlyMode();
const travelerId = travelerSelectionEnabled ? readTravelerSelection() : 'classic';
if (travelerId && (!location.hash || location.hash === '#' || location.hash === '#/')) {
  let preloadCourtyard = true;
  try {
    const saved = sessionStorage.getItem(sessionKey);
    const checkpoint = saved ? JSON.parse(saved) : null;
    if (checkpoint?.position && Number.isFinite(checkpoint.position.x) && Number.isFinite(checkpoint.position.z)) {
      preloadCourtyard = terrainRegionAt(checkpoint.position) === 'courtyard';
    }
  } catch { /* Invalid sessions fall back to the first courtyard. */ }
  const traveler = travelerModelPath(travelerId, travelerSelectionEnabled && isMobilePhone());
  const paths = preloadCourtyard ? [TERRAIN_FIRST_GALLERY_COURTYARD_MODEL, traveler] : [traveler];
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
