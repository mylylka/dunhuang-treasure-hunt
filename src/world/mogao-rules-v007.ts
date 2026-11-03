import layout from '../content/world/mogao-layout-v007.json';
import geometry from '../content/world/mogao-geometry-v007.json';
import { MUSIC_PLAYER_COLLIDERS_V4, musicSurfaceHeightV4 } from './music-pavilion-rules-v004';
import { surfaceHeight, movePlayer, PLAYER_RADIUS, type WorldCollider } from './movement';
import { MOGAO_ROAD, inMogaoRoom, nearDeerWall, mogaoLocation } from './mogao-rules-v003';
import type { WorldPoint } from './types';
export { layout as MOGAO_LAYOUT, MOGAO_ROAD, inMogaoRoom, nearDeerWall, mogaoLocation };
export const MOGAO_SESSION_KEY='dunhuang:mogao-preview:v7';
const [ox,oy,oz]=layout.origin;
const solid=(id:string,x1:number,x2:number,y1:number,y2:number,height:number):WorldCollider=>({id:`mogao-v7-${id}`,minX:ox+x1,maxX:ox+x2,minZ:oz-y2,maxZ:oz-y1,height});
export const MOGAO_SOLIDS:readonly WorldCollider[]=[
 ...geometry.frontBands.map(([x1,x2,front],i)=>solid(`rock-${i}`,x1,x2,front,49,59)),
 // The side plinths cannot be mounted from bare sand. The stairs remain clear.
 solid('west-plinth',-12.5,-5.2,-10.2,3,oy),solid('east-plinth',5.2,12.5,-10.2,3,oy),
 solid('west-entry',-12.5,-3.04,-2.4,3,oy+7.4),solid('east-entry',3.04,12.5,-2.4,3,oy+7.4),
 solid('west-room',-64,-12,3,49,59),solid('east-room',12,64,3,49,59),solid('rear-room',-12,12,33,49,59),
 ...geometry.columns.map((x,i)=>solid(`column-${i}`,x-geometry.columnRadius,x+geometry.columnRadius,geometry.columnY-.3,geometry.columnY+.3,oy+7.2)),
 ...layout.routeTrees.map(([x,z,s],i)=>({id:`mogao-v7-tree-${i}`,minX:x-s,maxX:x+s,minZ:z-s,maxZ:z+s,height:2.1*s,circle:{x,z,radius:1.01*s}})),
];
export const MOGAO_PLAYER_COLLIDERS=[...MUSIC_PLAYER_COLLIDERS_V4,...MOGAO_SOLIDS.map(s=>({...s,minX:s.minX-.21,maxX:s.maxX+.21,minZ:s.minZ-.21,maxZ:s.maxZ+.21,...(s.circle?{circle:{...s.circle,radius:s.circle.radius+.21}}:{})}))];
export const MOGAO_SESSION_OPTIONS={key:MOGAO_SESSION_KEY,colliders:MOGAO_PLAYER_COLLIDERS,bounds:layout.bounds,freeYaw:true};
/** Evaluates actual exported sand triangles; no new terrain shape at runtime. */
export function sandFootHeight(p:WorldPoint){
 const x=p.x-ox,y=oz-p.z;let height=0;
 for(const [a,b,c] of geometry.sandTriangles){
  const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  if(Math.abs(det)<1e-9)continue;
  const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/det;
  const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det,w=1-u-v;
  if(u>=-1e-6&&v>=-1e-6&&w>=-1e-6)height=Math.max(height,u*a[2]+v*b[2]+w*c[2]);
 }
 return height;
}
export function mogaoSurfaceHeight(p:WorldPoint){
 const x=p.x-ox,y=oz-p.z,s=geometry.stairs;
 if(inMogaoRoom(p))return oy+.024;
 if(Math.abs(x)<=s.width/2&&y>=s.front&&y<s.back)return oy*(y-s.front)/(s.back-s.front)+.024;
 if(Math.abs(x)<=12.5&&y>=s.back&&y<=3.1)return oy+.024;
 return Math.max(surfaceHeight(p)+musicSurfaceHeightV4(p),sandFootHeight(p));
}

/** Keep the traveler on connected walk surfaces; no sideways fall off tall stairs. */
export function moveMogaoPlayer(position:WorldPoint,delta:WorldPoint){
 const length=Math.hypot(delta.x,delta.z);if(!Number.isFinite(length)||!length)return {...position};
 const count=Math.min(128,Math.ceil(length/(PLAYER_RADIUS*.45))),fraction=Math.min(1,128/Math.ceil(length/(PLAYER_RADIUS*.45)))/count;
 let result={...position};
 for(let i=0;i<count;i++)for(const axis of ['x','z'] as const){
  const change={x:0,z:0};change[axis]=delta[axis]*fraction;
  const next=movePlayer(result,change,MOGAO_PLAYER_COLLIDERS,layout.bounds);
  if(Math.abs(mogaoSurfaceHeight(next)-mogaoSurfaceHeight(result))<=.32)result=next;
 }
 return result;
}
