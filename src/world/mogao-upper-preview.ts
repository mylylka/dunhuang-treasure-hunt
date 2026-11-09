import './mogao-preview-v001.css';
import './mogao-preview-v012.css';
import './music-pavilion-preview-v005.css';
import './flying-voice-preview.css';
import './character-cinematics-preview.css';
import './music-pavilion-preview.css';
import './music-pavilion-preview-v002.css';
import './terrain-preview-v001.css';
import { UPPER_PREVIEW_VIEWS, initializeUpperPreviewSession } from './mogao-upper-session';
import { initializeMogaoExhibitPreviewSession } from './mogao-exhibit-session';

const query = new URLSearchParams(location.search);
const requested = query.get('view');
const explicit = requested && UPPER_PREVIEW_VIEWS.some(view => view === requested) ? requested : null;
const root = document.getElementById('root');
try {
  if (root?.dataset.mogaoExhibit === 'v001') initializeMogaoExhibitPreviewSession(sessionStorage, explicit);
  else initializeUpperPreviewSession(sessionStorage, explicit);
}
catch { /* Normal session handling reports unavailable storage. */ }
const look = Number(query.get('look'));
if (root && query.has('look') && Number.isFinite(look)) root.dataset.terrainInitialLook = String(Math.max(-.7, Math.min(1.4, look)));
// Inspection parameters are one-shot so refreshing preserves the player's floor.
if (query.has('view') || query.has('look')) {
  query.delete('view'); query.delete('look');
  history.replaceState(null, '', `${location.pathname}${query.size ? `?${query}` : ''}${location.hash}`);
}
export const mainReady = import('../main');
