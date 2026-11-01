import layout from '../content/world/music-pavilion-layout-v003.json';
import { WORLD_COLLIDERS, type WorldCollider } from './movement';
import type { WorldPoint } from './types';
import type { RoadSection } from './road';

export { layout as MUSIC_LAYOUT_V3 };
export const MUSIC_SESSION_KEY_V3 = 'dunhuang:music-pavilion-preview:v3';
export const MUSIC_ROAD_V3: readonly RoadSection[] = layout.road.flatMap(([a,b,c,d], segment) => {
  const steps = 100;
  return Array.from({length:steps+(segment===0?1:0)},(_,index)=>{
    const t=(index+(segment?1:0))/steps,s=1-t;
    const center={x:s**3*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t**3*d[0],z:s**3*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t**3*d[1]};
    const dx=3*s*s*(b[0]-a[0])+6*s*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]);
    const dz=3*s*s*(b[1]-a[1])+6*s*t*(c[1]-b[1])+3*t*t*(d[1]-c[1]);
    const nx=-dz*1.65/Math.hypot(dx,dz),nz=dx*1.65/Math.hypot(dx,dz);
    return {center,left:{x:center.x+nx,z:center.z+nz},right:{x:center.x-nx,z:center.z-nz}};
  });
});
const tree=(x:number,z:number,scale:number,id:string):WorldCollider=>({id,minX:x-1.01*scale,maxX:x+1.01*scale,minZ:z-1.01*scale,maxZ:z+1.01*scale,height:2.1*scale,circle:{x,z,radius:1.01*scale}});
const box=(id:string,center:number[],size:number[]):WorldCollider=>({id,minX:center[0]-size[0]/2,maxX:center[0]+size[0]/2,minZ:center[2]-size[2]/2,maxZ:center[2]+size[2]/2,height:center[1]+size[1]/2});
export const MUSIC_SOLIDS_V3: readonly WorldCollider[] = [
  ...WORLD_COLLIDERS.filter(item=>!item.id?.startsWith('tree-')&&item.id!=='music-placeholder'),
  tree(3,5,1,'sample-tree-a'),
  ...layout.walls.map(item=>box(item.id,item.center,item.size)),
  ...layout.posts.map(([x,z],i)=>box(`music-column-${i}`,[x,2.1,z],[.72,4.2,.72])),
  ...layout.props.map(item=>({id:item.id,minX:item.x-item.radius,maxX:item.x+item.radius,minZ:item.z-item.radius,maxZ:item.z+item.radius,height:item.height,circle:{x:item.x,z:item.z,radius:item.radius}})),
  ...layout.trees.map(([x,z,scale],i)=>tree(x,z,scale,`music-tree-${i}`)),
  ...layout.banners.map(x=>({id:`music-banner-${x}`,minX:x-.06,maxX:x+.06,minZ:layout.bannerZ-.06,maxZ:layout.bannerZ+.06,height:3.5,circle:{x,z:layout.bannerZ,radius:.06}})),
  {id:'route-dune',polygon:layout.dune.footprint,minX:Math.min(...layout.dune.footprint.map(p=>p[0])),maxX:Math.max(...layout.dune.footprint.map(p=>p[0])),minZ:Math.min(...layout.dune.footprint.map(p=>p[1])),maxZ:Math.max(...layout.dune.footprint.map(p=>p[1])),height:9},
];
export const MUSIC_PLAYER_COLLIDERS_V3=MUSIC_SOLIDS_V3.map(item=>({...item,padding:item.polygon?.length ? .21 : undefined,minX:item.minX-.21,maxX:item.maxX+.21,minZ:item.minZ-.21,maxZ:item.maxZ+.21,...(item.circle?{circle:{...item.circle,radius:item.circle.radius+.21}}:{})}));
export const MUSIC_SESSION_OPTIONS_V3={key:MUSIC_SESSION_KEY_V3,colliders:MUSIC_PLAYER_COLLIDERS_V3,bounds:layout.bounds,freeYaw:true};
export function nearFlyingMuralV3(p:WorldPoint){return Math.hypot(p.x-layout.mural.trigger[0],p.z-layout.mural.trigger[1])<layout.mural.radius;}
export function inMusicCourtV3(p:WorldPoint){return p.x>36.55&&p.x<55.45&&p.z< -7.95&&p.z> -30.75;}
export function musicSurfaceHeightV3(p:WorldPoint){const x=p.x-layout.offset[0],z=p.z-layout.offset[1];return x>10.12&&x<17.05&&z< -10.4&&z> -15.6?Math.min(.36,Math.max(0,(-z-10.4)*.36/1.4)):0;}
export function arrivalGain(p:WorldPoint){
  const distance=Math.hypot(p.x-layout.audio.source[0],p.z-layout.audio.source[2]);
  const t=Math.max(0,Math.min(1,(layout.audio.outerRadius-distance)/(layout.audio.outerRadius-layout.audio.innerRadius)));
  return t*t*(3-2*t);
}
