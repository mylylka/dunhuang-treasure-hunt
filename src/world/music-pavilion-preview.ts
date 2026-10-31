import { defaultWorldCheckpoint } from './session';
import { MUSIC_SESSION_KEY } from './music-pavilion-rules';
import { CINEMATIC_SESSION_KEY } from './character-cinematics';
import './character-cinematics-preview.css';
import './music-pavilion-preview.css';

// These are explicit review shortcuts, separate from normal game traversal.
// The query is consumed once; refresh restores the independent preview session.
const query=new URLSearchParams(location.search), view=query.get('view');
if(['start','courtyard','approach','mural','porch'].includes(view??'')) {
  const checkpoint=defaultWorldCheckpoint();
  if(view==='courtyard'){checkpoint.position={x:-12,z:0};checkpoint.heading=Math.PI;}
  if(view==='approach')checkpoint.position={x:14,z:2.5};
  if(view==='mural')checkpoint.position={x:21.5,z:-7.8};
  if(view==='porch')checkpoint.position={x:12,z:-13.2};
  try {
    sessionStorage.setItem(MUSIC_SESSION_KEY,JSON.stringify(checkpoint));
    sessionStorage.setItem(CINEMATIC_SESSION_KEY,JSON.stringify({opening:view!=='start',hall:false}));
  } catch { /* The ordinary game's storage warning remains available. */ }
  query.delete('view');history.replaceState(null,'',`${location.pathname}${query.size?`?${query}`:''}${location.hash}`);
}
const tools=document.createElement('nav');tools.className='music-review-tools';tools.setAttribute('aria-label','乐舞馆样片复看');
tools.innerHTML='<a href="?view=start#/">从开场试玩</a><a href="?view=courtyard#/">从纹彩院出发</a><a href="?view=approach#/">到乐舞馆前</a>';
document.body.appendChild(tools);
void import('../main');
