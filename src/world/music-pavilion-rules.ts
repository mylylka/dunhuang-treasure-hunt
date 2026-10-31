import layout from '../content/world/music-pavilion-layout.json';
import { WORLD_COLLIDERS, type WorldCollider } from './movement';
import type { WorldPoint } from './types';
import type { RoadSection } from './road';

export { layout as MUSIC_LAYOUT };
export const MUSIC_SESSION_KEY = 'dunhuang:music-pavilion-preview:v1';
export const FLYING_DURATION = 3.6;
export const MUSIC_ROAD: readonly RoadSection[] = layout.road.flatMap((points, segment) => {
  const [a,b,c,d] = points, steps = 50;
  return Array.from({ length: steps + (segment === 0 ? 1 : 0) }, (_, index) => {
    const t = (index + (segment ? 1 : 0)) / steps, s = 1 - t;
    const center = { x: s**3*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t**3*d[0], z: s**3*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t**3*d[1] };
    const dx=3*s*s*(b[0]-a[0])+6*s*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]);
    const dz=3*s*s*(b[1]-a[1])+6*s*t*(c[1]-b[1])+3*t*t*(d[1]-c[1]);
    const nx=-dz*1.65/Math.hypot(dx,dz), nz=dx*1.65/Math.hypot(dx,dz);
    return { center, left:{x:center.x+nx,z:center.z+nz}, right:{x:center.x-nx,z:center.z-nz} };
  });
});
const box = (id: string, center: number[], size: number[]): WorldCollider => ({ id,
  minX:center[0]-size[0]/2,maxX:center[0]+size[0]/2,minZ:center[2]-size[2]/2,maxZ:center[2]+size[2]/2,height:center[1]+size[1]/2 });
const tree = (x:number,z:number,scale=1,id='music-tree'): WorldCollider => ({id,minX:x-1.01*scale,maxX:x+1.01*scale,minZ:z-1.01*scale,maxZ:z+1.01*scale,height:2.1*scale,circle:{x,z,radius:1.01*scale}});
export const MUSIC_SOLIDS: readonly WorldCollider[] = [
  ...WORLD_COLLIDERS.filter(item => !item.id?.startsWith('tree-') && item.id !== 'music-placeholder'),
  tree(4.8,13,1,'sample-tree-a'),
  ...layout.walls.map(item => box(item.id,item.center,item.size)),
  ...layout.posts.map(([x,z],i)=>box(`music-column-${i}`,[x,2.1,z],[.72,4.2,.72])),
  ...layout.props.map(item=>({id:item.id,minX:item.x-item.radius,maxX:item.x+item.radius,minZ:item.z-item.radius,maxZ:item.z+item.radius,height:item.height,circle:{x:item.x,z:item.z,radius:item.radius}})),
  ...layout.trees.map(([x,z,scale],i)=>tree(x,z,scale,`music-tree-${i}`)),
  // The two banner poles also have small, real obstacles.
  ...layout.banners.map(x=>({id:`music-banner-${x}`,minX:x-.06,maxX:x+.06,minZ:-4.26,maxZ:-4.14,height:3.5,circle:{x,z:-4.2,radius:.06}})),
];
export const MUSIC_PLAYER_COLLIDERS = MUSIC_SOLIDS.map(item => ({ ...item,
  minX:item.minX-.21,maxX:item.maxX+.21,minZ:item.minZ-.21,maxZ:item.maxZ+.21,
  ...(item.circle ? {circle:{...item.circle,radius:item.circle.radius+.21}} : {}),
}));
export function nearFlyingMural(point:WorldPoint) { return Math.hypot(point.x-layout.mural.trigger[0],point.z-layout.mural.trigger[1]) < layout.mural.radius; }
export function musicSurfaceHeight(point:WorldPoint) {
  if(point.x>10.12&&point.x<17.05&&point.z< -10.4&&point.z> -15.6) return Math.min(.36,Math.max(0,(-point.z-10.4)*.36/1.4));
  return 0;
}
export function flyingColor(time:number,reduced=false) {
  if(reduced)return 1;
  const t=Math.max(0,Math.min(1,(time-.45)/2.65));return t*t*(3-2*t);
}
