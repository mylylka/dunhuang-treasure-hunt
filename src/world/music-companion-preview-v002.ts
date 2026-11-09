import './mogao-preview-v001.css';
import './mogao-preview-v012.css';
import './music-pavilion-preview-v005.css';
import './music-pavilion-preview-v002.css';
import './terrain-preview-v001.css';
import { initializeMusicCompanionPreviewSession } from './music-companion-session-v002';

const guide = document.getElementById('root')?.dataset.musicGuide === 'v001';
try { initializeMusicCompanionPreviewSession(sessionStorage, guide); }
catch { /* The ordinary world-session warning and retry remain available. */ }
void import('../main');
