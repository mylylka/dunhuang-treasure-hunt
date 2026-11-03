import layout from '../content/world/mogao-layout-v002.json';
import { MUSIC_PLAYER_COLLIDERS_V4, musicSurfaceHeightV4 } from './music-pavilion-rules-v004';
import { surfaceHeight, type WorldCollider } from './movement';
import type { RoadSection } from './road';
import type { WorldPoint } from './types';

export { layout as MOGAO_LAYOUT };
const [ox, oy, oz] = layout.origin;
const halfWidth=layout.room.width/2,back=layout.room.front+layout.room.depth;
export const MOGAO_SESSION_KEY = 'dunhuang:mogao-preview:v2';
export const MOGAO_ROAD: readonly RoadSection[] = layout.road.flatMap(([a,b,c,d], segment) =>
  Array.from({length: 100 + (segment === 0 ? 1 : 0)}, (_,i) => {
    const t=(i+(segment?1:0))/100, s=1-t;
    const center={x:s**3*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t**3*d[0],z:s**3*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t**3*d[1]};
    const dx=3*s*s*(b[0]-a[0])+6*s*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]);
    const dz=3*s*s*(b[1]-a[1])+6*s*t*(c[1]-b[1])+3*t*t*(d[1]-c[1]);
    const nx=-dz*1.65/Math.hypot(dx,dz), nz=dx*1.65/Math.hypot(dx,dz);
    return {center,left:{x:center.x+nx,z:center.z+nz},right:{x:center.x-nx,z:center.z-nz}};
  }));
const solid=(id:string,x1:number,x2:number,y1:number,y2:number,height:number):WorldCollider =>
  ({id:`mogao-${id}`,minX:ox+x1,maxX:ox+x2,minZ:oz-y2,maxZ:oz-y1,height:oy+height});
export const MOGAO_SOLIDS: readonly WorldCollider[] = [
  solid('west-rock',-80,-halfWidth,-4,layout.cliff.depth,44), solid('east-rock',halfWidth,80,-4,layout.cliff.depth,44),
  solid('entry-west',-halfWidth,-4,0,layout.room.front,layout.room.height), solid('entry-east',4,halfWidth,0,layout.room.front,layout.room.height),
  solid('rock-mouth-left',-7.2,-4.05,-.65,3,12),solid('rock-mouth-right',4.05,7.2,-.65,3,12),
  solid('rear-rock',-halfWidth,halfWidth,back,layout.cliff.depth,44),
  solid('terrace-west',-10,-9,-7,0,1.4),solid('terrace-east',9,10,-7,0,1.4),
  // Raised terrace is reached through the stairs, never by stepping up its sides.
  solid('terrace-front-west',-10,-6,-7.3,-6.7,1.4),solid('terrace-front-east',6,10,-7.3,-6.7,1.4),
  ...layout.routeTrees.map(([x,z,scale],i)=>({id:`mogao-tree-${i}`,minX:x-1.01*scale,maxX:x+1.01*scale,minZ:z-1.01*scale,maxZ:z+1.01*scale,height:2.1*scale,circle:{x,z,radius:1.01*scale}})),
];
export const MOGAO_PLAYER_COLLIDERS = [...MUSIC_PLAYER_COLLIDERS_V4,...MOGAO_SOLIDS.map(item=>({...item,
  minX:item.minX-.21,maxX:item.maxX+.21,minZ:item.minZ-.21,maxZ:item.maxZ+.21,
  ...(item.circle?{circle:{...item.circle,radius:item.circle.radius+.21}}:{}),
}))];
export const MOGAO_SESSION_OPTIONS = {key:MOGAO_SESSION_KEY,colliders:MOGAO_PLAYER_COLLIDERS,bounds:layout.bounds,freeYaw:true};
export function inMogaoRoom(p:WorldPoint){return p.x>ox-halfWidth&&p.x<ox+halfWidth&&p.z<oz-layout.room.front&&p.z>oz-back;}
export function nearDeerWall(p:WorldPoint){return inMogaoRoom(p)&&p.z<oz-layout.room.front-3;}
export function mogaoLocation(p:WorldPoint):string|null {
  if(inMogaoRoom(p))return '莫高窟 · 九色鹿壁画厅';
  if(p.x>ox-10&&p.x<ox+10&&p.z<oz+13&&p.z>oz-layout.room.front)return '莫高窟 · 窟口';
  return p.x>80&&p.z<45?'莫高窟 · 崖前古道':null;
}
export function mogaoSurfaceHeight(p:WorldPoint){
  if(inMogaoRoom(p))return oy+.024;
  if(p.z<oz-layout.room.front)return surfaceHeight(p)+musicSurfaceHeightV4(p);
  if(p.x<ox-10||p.x>ox+10||p.z>oz+13)return surfaceHeight(p)+musicSurfaceHeightV4(p);
  if(p.z>=oz+7){
    if(Math.abs(p.x-ox)>layout.stairs.width/2)return surfaceHeight(p)+musicSurfaceHeightV4(p);
    return Math.max(0,Math.min(oy,oy*(oz+13-p.z)/6));
  }
  return oy+.024;
}
