import layout from '../content/world/mogao-layout-v003.json';
import { MUSIC_PLAYER_COLLIDERS_V4, musicSurfaceHeightV4 } from './music-pavilion-rules-v004';
import { surfaceHeight, type WorldCollider } from './movement';
import type { RoadSection } from './road';
import type { WorldPoint } from './types';

export { layout as MOGAO_LAYOUT };
const [ox, oy, oz] = layout.origin;
const halfWidth=layout.room.width/2,back=layout.room.front+layout.room.depth;
export const MOGAO_SESSION_KEY = 'dunhuang:mogao-preview:v3';
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
  ...layout.frontRocks.map(([x1,x2,front,height],i)=>solid(`rock-apron-${i}`,x1,x2,front,layout.room.front,height-layout.origin[1])),
  // The central stair and colonnade are the only route through the supplied facade.
  solid('west-facade',-60,-7,-19,layout.room.front,69), solid('east-facade',3.5,60,-21,layout.room.front,69),
  solid('west-entry-return',-12,-4,-8,layout.room.front,19), solid('east-entry-return',4,12,-8,layout.room.front,19),
  solid('west-chamber',-60,-halfWidth,layout.room.front,36,69), solid('east-chamber',halfWidth,60,layout.room.front,36,69),
  solid('rear-facade',-halfWidth,halfWidth,back,36,69),
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
  if(p.x>ox-10&&p.x<ox+10&&p.z<oz+29&&p.z>oz-layout.room.front)return '莫高窟 · 窟口';
  return p.x>80&&p.z<45?'莫高窟 · 崖前古道':null;
}
export function mogaoSurfaceHeight(p:WorldPoint){
  if(inMogaoRoom(p))return oy+.024;
  const x=p.x-ox,y=oz-p.z,s=layout.walkSurface;
  if(x<s.x0||x>s.x0+(s.heights[0].length-1)*s.step||y<s.y0||y>layout.room.front)return surfaceHeight(p)+musicSurfaceHeightV4(p);
  const gx=(x-s.x0)/s.step,gy=(y-s.y0)/s.step;
  const ix=Math.min(s.heights[0].length-2,Math.max(0,Math.floor(gx))),iy=Math.min(s.heights.length-2,Math.max(0,Math.floor(gy)));
  const tx=Math.min(1,gx-ix),ty=Math.min(1,gy-iy);
  const a=s.heights[iy][ix]*(1-tx)+s.heights[iy][ix+1]*tx,b=s.heights[iy+1][ix]*(1-tx)+s.heights[iy+1][ix+1]*tx;
  return a*(1-ty)+b*ty+.024;
}
