import layout from '../content/world/mogao-layout-v010.json';
import geometry from '../content/world/mogao-geometry-v007.json';
import {MUSIC_PLAYER_COLLIDERS_V4,musicSurfaceHeightV4} from './music-pavilion-rules-v004';
import {surfaceHeight,movePlayer,PLAYER_RADIUS,type WorldCollider} from './movement';
import {MOGAO_ROAD,sandFootHeight} from './mogao-rules-v007';
import type {WorldPoint,DiscoveryId} from './types';
export {layout as MOGAO_LAYOUT,MOGAO_ROAD};
export const MOGAO_SESSION_KEY='dunhuang:mogao-preview:v10';
const [ox,oy,oz]=layout.origin;
const solid=(id:string,x1:number,x2:number,y1:number,y2:number,height:number):WorldCollider=>({id:`mogao-v8-${id}`,minX:ox+x1,maxX:ox+x2,minZ:oz-y2,maxZ:oz-y1,height});
export const MOGAO_SOLIDS:readonly WorldCollider[]=[
 ...geometry.frontBands.map(([x1,x2,front],i)=>solid(`rock-${i}`,x1,x2,front,7,59)),
 solid('west-plinth',-12.5,-5.2,-10.2,3,oy),solid('east-plinth',5.2,12.5,-10.2,3,oy),
 solid('west-entry',-12.5,-3.04,-2.4,7,oy+7.4),solid('east-entry',3.04,12.5,-2.4,7,oy+7.4),
 solid('west-room',-64,-14,7,49,59),solid('east-room',14,64,7,49,59),solid('rear-room',-14,14,32,49,59),
 solid('buddha',-layout.buddha.width/2,layout.buddha.width/2,layout.buddha.front,layout.buddha.back,oy+35),
 ...geometry.columns.map((x,i)=>solid(`column-${i}`,x-geometry.columnRadius,x+geometry.columnRadius,geometry.columnY-.3,geometry.columnY+.3,oy+7.2)),
 ...layout.routeTrees.map(([x,z,s],i)=>({id:`mogao-v8-tree-${i}`,minX:x-s,maxX:x+s,minZ:z-s,maxZ:z+s,height:2.1*s,circle:{x,z,radius:1.01*s}})),
];
export const MOGAO_PLAYER_COLLIDERS=[...MUSIC_PLAYER_COLLIDERS_V4,...MOGAO_SOLIDS.map(s=>({...s,minX:s.minX-.21,maxX:s.maxX+.21,minZ:s.minZ-.21,maxZ:s.maxZ+.21,...(s.circle?{circle:{...s.circle,radius:s.circle.radius+.21}}:{})}))];
export const MOGAO_SESSION_OPTIONS={key:MOGAO_SESSION_KEY,colliders:MOGAO_PLAYER_COLLIDERS,bounds:layout.bounds,freeYaw:true};
export function inMogaoRoom(p:WorldPoint){const x=p.x-ox,y=oz-p.z;return Math.abs(x)<14&&y>7&&y<32;}
export function nearStoryWall(p:WorldPoint):DiscoveryId|null{
 if(!inMogaoRoom(p))return null;
 const x=p.x-ox,y=oz-p.z;
 if(x< -5&&((y<10.8)||(x< -10.8&&y<22.8)))return 'story-demo';
 if(x>5&&((y<10.8)||(x>10.8&&y<23.1)))return 'novice-story';
 return null;
}
export function nearDeerWall(p:WorldPoint){return nearStoryWall(p)==='story-demo';}
export function mogaoLocation(p:WorldPoint):string|null{
 if(inMogaoRoom(p))return '莫高窟 · 大佛殿';
 if(Math.abs(p.x-ox)<10&&p.z<oz+29&&p.z>oz-7)return '莫高窟 · 窟口';
 return p.x>80&&p.z<45?'莫高窟 · 崖前古道':null;
}
export function mogaoSurfaceHeight(p:WorldPoint){
 const x=p.x-ox,y=oz-p.z,s=geometry.stairs;
 if(inMogaoRoom(p))return oy+.024;
 if(Math.abs(x)<=s.width/2&&y>=s.front&&y<s.back)return oy*(y-s.front)/(s.back-s.front)+.024;
 if((Math.abs(x)<=12.5&&y>=s.back&&y<=3.1)||(Math.abs(x)<=3.04&&y>=3&&y<=7.1))return oy+.024;
 return Math.max(surfaceHeight(p)+musicSurfaceHeightV4(p),sandFootHeight(p));
}
export function moveMogaoPlayer(position:WorldPoint,delta:WorldPoint){
 const length=Math.hypot(delta.x,delta.z);if(!Number.isFinite(length)||!length)return {...position};
 const count=Math.min(128,Math.ceil(length/(PLAYER_RADIUS*.45))),fraction=Math.min(1,128/Math.ceil(length/(PLAYER_RADIUS*.45)))/count;
 let result={...position};
 for(let i=0;i<count;i++)for(const axis of ['x','z'] as const){const change={x:0,z:0};change[axis]=delta[axis]*fraction;const next=movePlayer(result,change,MOGAO_PLAYER_COLLIDERS,layout.bounds);if(Math.abs(mogaoSurfaceHeight(next)-mogaoSurfaceHeight(result))<=.32)result=next;}
 return result;
}
