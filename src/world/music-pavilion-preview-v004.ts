import './flying-voice-preview.css';
import { defaultWorldCheckpoint } from './session';
import { MUSIC_LAYOUT_V4, MUSIC_SESSION_KEY_V4 } from './music-pavilion-rules-v004';
import { CINEMATIC_SESSION_KEY } from './character-cinematics';
import './character-cinematics-preview.css';
import './music-pavilion-preview.css';
import './music-pavilion-preview-v002.css';

const query=new URLSearchParams(location.search),view=query.get('view');
const views=MUSIC_LAYOUT_V4.views as Record<string,number[]>;
if(view&&views[view]){
  const [x,z,yaw]=views[view],checkpoint=defaultWorldCheckpoint();
  checkpoint.position={x,z};checkpoint.heading=yaw;checkpoint.cameraYaw=yaw;
  try{
    sessionStorage.setItem(MUSIC_SESSION_KEY_V4,JSON.stringify(checkpoint));
    sessionStorage.setItem(CINEMATIC_SESSION_KEY,JSON.stringify({opening:view!=='start',hall:false}));
  }catch{/* Ordinary session recovery remains available. */}
  query.delete('view');history.replaceState(null,'',`${location.pathname}${query.size?`?${query}`:''}${location.hash}`);
}
const links=document.createElement('nav');links.className='music-review-tools';links.setAttribute('aria-label','乐舞馆样片复看');
links.innerHTML='<a href="?view=start#/">从开场试玩</a><a href="?view=courtyard#/">从纹彩院出发</a><a href="?view=approach#/">看扩建院落</a><a href="?view=side-west#/">侧院与布幔</a><a href="?view=mural#/">到壁画前</a>';
document.body.appendChild(links);
void import('../main');
