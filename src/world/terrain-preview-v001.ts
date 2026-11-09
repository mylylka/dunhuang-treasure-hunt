import './mogao-preview-v001.css';
import './mogao-preview-v012.css';
import './music-pavilion-preview-v005.css';
import './flying-voice-preview.css';
import './character-cinematics-preview.css';
import './music-pavilion-preview.css';
import './music-pavilion-preview-v002.css';
import './terrain-preview-v001.css';
import { defaultWorldCheckpoint } from './session';
import { TERRAIN_SESSION_OPTIONS, TERRAIN_SPAWN, TERRAIN_REGIONS, TERRAIN_ROUTES, toTerrainPoint, terrainSurfaceHeight, relocateOasisPoint, OASIS_RELOCATION_YAW } from './terrain-rules-v001';
import {TERRAIN_CAISSON_CONFIG,terrainCaissonLookOffset} from './terrain-caisson-v001';
import {terrainCameraSpace,terrainFollowPose} from './terrain-camera-v001';

const query = new URLSearchParams(location.search), view = query.get('view');
const root=document.getElementById('root'),caisson=root?.dataset.terrainCaisson==='v001';
const at = (region:'courtyard'|'music'|'cliff',x:number,z:number,yaw:number):number[] => {
  const p=toTerrainPoint(region,{x,z});return [p.x,p.z,yaw+TERRAIN_REGIONS[region].yaw];
};
const firstRoute=TERRAIN_ROUTES[0].points;
const crest=firstRoute.reduce((highest,p)=>p.y>highest.y?p:highest);
const valley=firstRoute[Math.floor(firstRoute.length*.8)];
const lakeStation=relocateOasisPoint({x:237,z:69});
const stations:Record<string,number[]> = {
  start:[TERRAIN_SPAWN.x,TERRAIN_SPAWN.z,TERRAIN_REGIONS.courtyard.yaw],
  courtyard:at('courtyard',-12,9,0),
  hall:at('courtyard',-12,-3.7,0),
  workshop:at('courtyard',-18.9,-1.3,0),
  'hall-center':at('courtyard',-12,-15,0),
  'hall-left':at('courtyard',-12,-15,Math.PI/2),
  'hall-right':at('courtyard',-12,-15,-Math.PI/2),
  'hall-exit':at('courtyard',-12,-15,Math.PI),
  caisson:at('courtyard',caisson?TERRAIN_CAISSON_CONFIG.sourcePlacement.x:-12,caisson?TERRAIN_CAISSON_CONFIG.sourcePlacement.z:-17,0),
  crest:[crest.x,crest.z,-Math.PI/2],
  valley:[valley.x,valley.z,-1.5],
  lake:[lakeStation.x,lakeStation.z,.4+OASIS_RELOCATION_YAW],
  music:at('music',40.2,6,0),
  flying:at('music',52.35,-11.9,0),
  forecourt:at('cliff',122,35,0),
  cliff:at('cliff',122,-36,0),
  stairs:at('cliff',122,-48,0),
  interior:at('cliff',122,-78,0),
  deer:at('cliff',109,-79,Math.PI/2),
  novice:at('cliff',135,-79,-Math.PI/2),
};
let fresh=false;try{fresh=!sessionStorage.getItem(TERRAIN_SESSION_OPTIONS.key);}catch{/* Session UI reports unavailable storage. */}
const station=view&&stations[view]?view:fresh?'start':null;
if(station) {
  const [x,z,yaw]=stations[station],checkpoint=defaultWorldCheckpoint(TERRAIN_SPAWN);
  checkpoint.position={x,z};checkpoint.heading=yaw;checkpoint.cameraYaw=yaw;
  if(station==='caisson'&&caisson&&root){
    const pose=terrainFollowPose(x,terrainSurfaceHeight({x,z}),z,yaw,terrainCameraSpace(true));
    root.dataset.terrainInitialLook=String(terrainCaissonLookOffset(pose.position,pose.target));
  }
  try {sessionStorage.setItem(TERRAIN_SESSION_OPTIONS.key,JSON.stringify(checkpoint));} catch {/* The normal recoverable session UI handles unavailable storage. */}
  query.delete('view');
  history.replaceState(null,'',`${location.pathname}${query.size?`?${query}`:''}${location.hash}`);
}
export const mainReady = import('../main');
