import layout from '../content/world/mogao-layout-v006.json';
import { MUSIC_PLAYER_COLLIDERS_V4, musicSurfaceHeightV4 } from './music-pavilion-rules-v004';
import { surfaceHeight, type WorldCollider } from './movement';
import { MOGAO_ROAD, inMogaoRoom, nearDeerWall, mogaoLocation } from './mogao-rules-v003';
import type { WorldPoint } from './types';
export { layout as MOGAO_LAYOUT, MOGAO_ROAD, inMogaoRoom, nearDeerWall, mogaoLocation };
const [ox,oy,oz]=layout.origin;
export const MOGAO_SESSION_KEY='dunhuang:mogao-preview:v6';
const solid=(id:string,x1:number,x2:number,y1:number,y2:number,height:number):WorldCollider=>({id:`mogao-v6-${id}`,minX:ox+x1,maxX:ox+x2,minZ:oz-y2,maxZ:oz-y1,height});
export const MOGAO_SOLIDS:readonly WorldCollider[]=[
 ...layout.frontBands.map(([x1,x2,front],i)=>solid(`mountain-${i}`,x1,x2,front,40,70)),
 solid('west-entrance-wall',-18,-4.4,-3.6,3,oy+9.3),solid('east-entrance-wall',4.4,18,-3.6,3,oy+9.3),
 solid('west-plinth',-17,-6.5,-13,3,oy),solid('east-plinth',6.5,17,-13,3,oy),
 solid('west-passage',-18,-4.4,-3.6,3,oy+10),solid('east-passage',4.4,18,-3.6,3,oy+10),
 solid('west-room',-63,-12,3,40,70),solid('east-room',12,63,3,40,70),solid('rear-room',-12,12,33,40,70),
 ...[-15.65,-9.6045,-4.55,4.55,9.6045,15.65].map((x,i)=>solid(`ground-column-${i}`,x-.37,x+.37,-11.47,-10.73,17)),
 ...layout.routeTrees.map(([x,z,scale],i)=>({id:`mogao-v6-tree-${i}`,minX:x-1.01*scale,maxX:x+1.01*scale,minZ:z-1.01*scale,maxZ:z+1.01*scale,height:2.1*scale,circle:{x,z,radius:1.01*scale}})),
];
export const MOGAO_PLAYER_COLLIDERS=[...MUSIC_PLAYER_COLLIDERS_V4,...MOGAO_SOLIDS.map(s=>({...s,minX:s.minX-.21,maxX:s.maxX+.21,minZ:s.minZ-.21,maxZ:s.maxZ+.21,...(s.circle?{circle:{...s.circle,radius:s.circle.radius+.21}}:{})}))];
export const MOGAO_SESSION_OPTIONS={key:MOGAO_SESSION_KEY,colliders:MOGAO_PLAYER_COLLIDERS,bounds:layout.bounds,freeYaw:true};
/** Bilinear height of the actual Blender sand strip; no terrain is generated here. */
export function sandFootHeight(p:WorldPoint){
 const x=Math.abs(p.x-ox),y=oz-p.z,s=layout.sandFoot;
 if(x<s.xMin||x>s.xMax)return 0;
 const gx=(x-s.xMin)/(s.xMax-s.xMin)*s.columns,i=Math.min(s.columns-1,Math.floor(gx)),tx=gx-i;
 const profiles=p.x<ox?s.leftProfiles:s.rightProfiles;
 const a=profiles[i],b=profiles[i+1],inner=a[1]*(1-tx)+b[1]*tx,t=(inner-y)/s.outwardLength;
 if(t<0||t>1)return 0;
 const gy=t*s.rows,j=Math.min(s.rows-1,Math.floor(gy)),ty=gy-j;
 const h=(row:number)=>((a[2]*(1-tx)+b[2]*tx)*(1-row/s.rows)**2-.045);
 return Math.max(0,h(j)*(1-ty)+h(j+1)*ty);
}
export function mogaoSurfaceHeight(p:WorldPoint){
 const x=p.x-ox,y=oz-p.z;
 if(inMogaoRoom(p))return oy+.024;
 if(Math.abs(x)<=6.5&&y>=-29&&y<-13)return oy*(y+29)/16+.024;
 if(Math.abs(x)<=17&&y>=-13&&y<=3)return oy+.024;
 return Math.max(surfaceHeight(p)+musicSurfaceHeightV4(p),sandFootHeight(p));
}
