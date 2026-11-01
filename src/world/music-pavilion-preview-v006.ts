import './music-pavilion-preview-v005.css';
import './flying-voice-preview.css';
import { defaultWorldCheckpoint } from './session';
import { MUSIC_LAYOUT_V4 } from './music-pavilion-rules-v004';
import { CINEMATIC_SESSION_KEY } from './character-cinematics';
import './character-cinematics-preview.css';
import './music-pavilion-preview.css';
import './music-pavilion-preview-v002.css';

const MUSIC_SESSION_KEY_V4='dunhuang:music-pavilion-preview:v6';
const query=new URLSearchParams(location.search),view=query.get('view');
const views:Record<string,number[]>={...MUSIC_LAYOUT_V4.views, 'music-road':[.2,12,-1.7], 'music-stop':[2.5,12.2,-1.7], 'mural-left':[46,-10.8,0], 'mural-right':[59.3,-10.8,0], 'caisson':[-12,-17,0], 'story':[-6,-6,0]};
if(view&&views[view]){
  const [x,z,yaw]=views[view],checkpoint=defaultWorldCheckpoint();
  checkpoint.position={x,z};checkpoint.heading=yaw;checkpoint.cameraYaw=yaw;
  try{
    sessionStorage.setItem(MUSIC_SESSION_KEY_V4,JSON.stringify(checkpoint));
    sessionStorage.setItem(CINEMATIC_SESSION_KEY,JSON.stringify({opening:view!=='start',hall:false}));
  }catch{/* Ordinary session recovery remains available. */}
  query.delete('view');history.replaceState(null,'',`${location.pathname}${query.size?`?${query}`:''}${location.hash}`);
}
void import('../main');
