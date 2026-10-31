import { defaultWorldCheckpoint } from './session';
import { MUSIC_SESSION_KEY_V2, MUSIC_LAYOUT_V2 } from './music-pavilion-rules-v002';
import { CINEMATIC_SESSION_KEY } from './character-cinematics';
import './character-cinematics-preview.css';
import './music-pavilion-preview.css';
import './music-pavilion-preview-v002.css';

const query=new URLSearchParams(location.search),view=query.get('view');
const views=MUSIC_LAYOUT_V2.views as Record<string,number[]>;
if(view&&views[view]){
  const [x,z,yaw]=views[view],checkpoint=defaultWorldCheckpoint();
  checkpoint.position={x,z};checkpoint.heading=yaw;checkpoint.cameraYaw=yaw;
  try{
    sessionStorage.setItem(MUSIC_SESSION_KEY_V2,JSON.stringify(checkpoint));
    sessionStorage.setItem(CINEMATIC_SESSION_KEY,JSON.stringify({opening:view!=='start',hall:false}));
  }catch{/* Ordinary session recovery remains available. */}
  query.delete('view');history.replaceState(null,'',`${location.pathname}${query.size?`?${query}`:''}${location.hash}`);
}
const links=document.createElement('nav');links.className='music-review-tools';links.setAttribute('aria-label','乐舞馆样片复看');
links.innerHTML='<a href="?view=start#/">从开场试玩</a><a href="?view=courtyard#/">从纹彩院出发</a><a href="?view=approach#/">到乐舞馆前</a><a href="review.html">验收图册</a>';
document.body.appendChild(links);
void import('../main');
