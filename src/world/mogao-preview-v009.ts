import './mogao-preview-v001.css';
import './music-pavilion-preview-v005.css';
import './flying-voice-preview.css';
import './character-cinematics-preview.css';
import './music-pavilion-preview.css';
import './music-pavilion-preview-v002.css';
import { defaultWorldCheckpoint } from './session';
import { MOGAO_LAYOUT, MOGAO_SESSION_KEY } from './mogao-rules-v009';
import { CINEMATIC_SESSION_KEY } from './character-cinematics';

const query=new URLSearchParams(location.search),view=query.get('view');
const views:Record<string,number[]>={...MOGAO_LAYOUT.views,'study-front':[93,-8,0],'study-oblique':[113,-14,.55],'foot-left':[93,-32,-.15],'foot-right':[158,-36,.24]};
let fresh=true;try{fresh=!sessionStorage.getItem(MOGAO_SESSION_KEY);}catch{/* Session recovery remains available. */}
const seeded=view&&views[view]?view:fresh?'overview':null;
if(seeded){
  const [x,z,yaw]=views[seeded],checkpoint=defaultWorldCheckpoint();
  checkpoint.position={x,z};checkpoint.heading=yaw;checkpoint.cameraYaw=yaw;
  try{
    sessionStorage.setItem(MOGAO_SESSION_KEY,JSON.stringify(checkpoint));
    sessionStorage.setItem(CINEMATIC_SESSION_KEY,JSON.stringify({opening:true,hall:true}));
  }catch{/* The ordinary recoverable session UI remains available. */}
  query.delete('view');history.replaceState(null,'',`${location.pathname}${query.size?`?${query}`:''}${location.hash}`);
}
void import('../main');
