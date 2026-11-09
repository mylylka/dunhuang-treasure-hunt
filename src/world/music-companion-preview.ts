import './mogao-preview-v001.css';
import './mogao-preview-v012.css';
import './music-pavilion-preview-v005.css';
import './music-pavilion-preview-v002.css';
import './terrain-preview-v001.css';
import { companionPreviewCheckpoint, MUSIC_COMPANION_SESSION_KEY } from './music-companion-session';

// The companion is deliberately visit-scoped; reload starts both actors together.
try { sessionStorage.setItem(MUSIC_COMPANION_SESSION_KEY, JSON.stringify(companionPreviewCheckpoint())); }
catch { /* The ordinary world-session warning and retry remain available. */ }
void import('../main');
