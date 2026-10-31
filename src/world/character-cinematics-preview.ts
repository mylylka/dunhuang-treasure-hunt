import { CINEMATIC_SESSION_KEY } from './character-cinematics';
import { defaultWorldCheckpoint, WORLD_SESSION_KEY } from './session';
import './character-cinematics-preview.css';

// Explicit reviewer links start a new demonstration; ordinary reload never resets history.
const query = new URLSearchParams(location.search), shot = query.get('shot');
if (shot === 'opening' || shot === 'hall' || shot === 'approach') {
  const checkpoint = defaultWorldCheckpoint();
  if (shot !== 'opening') checkpoint.position = { x: -12, z: shot === 'hall' ? -17 : -13.8 };
  try {
    sessionStorage.setItem(WORLD_SESSION_KEY, JSON.stringify(checkpoint));
    sessionStorage.setItem(CINEMATIC_SESSION_KEY, JSON.stringify({ opening: shot !== 'opening', hall: false }));
  } catch { /* The game's normal storage warning still applies. */ }
  query.delete('shot'); history.replaceState(null, '', `${location.pathname}${query.size ? `?${query}` : ''}${location.hash}`);
}
const tools = document.createElement('nav'); tools.className = 'cinematic-review-tools'; tools.setAttribute('aria-label', '镜头样片复看');
tools.innerHTML = '<a href="?shot=opening#/">重播开场</a><a href="?shot=hall#/">重播入厅</a><a href="?shot=approach#/">从门口走入</a>';
document.body.appendChild(tools);
void import('../main');
