import {describe,it,expect} from 'vitest';
import {MOGAO_LAYOUT as layout,MOGAO_PLAYER_COLLIDERS as colliders,MOGAO_ROAD as road,mogaoSurfaceHeight,nearDeerWall} from '../../src/world/mogao-rules-v006';
import {isWalkable,movePlayer} from '../../src/world/movement';
import {mogaoCameraSpace,mogaoFollowPose} from '../../src/world/mogao-camera-v006';

describe('nine-storey tower and authored sandstone integration',()=>{
 it('keeps the full existing approach road clear and walks the new stair, portal and retained room',()=>{
  for(const s of road)for(const p of [s.left,s.center,s.right])expect(isWalkable(p,colliders,layout.bounds),JSON.stringify(p)).toBe(true);
  const path=[{x:119,z:-39},{x:119,z:-58},{x:122,z:-58},{x:122,z:-78},{x:114,z:-78},{x:114,z:-97},{x:130,z:-97},{x:130,z:-78},{x:122,z:-78},{x:122,z:-58},{x:119,z:-58},{x:119,z:-39}];let p=path[0];
  for(const q of path.slice(1)){const dx=q.x-p.x,dz=q.z-p.z,n=Math.ceil(Math.hypot(dx,dz)/.08);for(let i=0;i<n;i++)p=movePlayer(p,{x:dx/n,z:dz/n},colliders,layout.bounds);expect(p.x).toBeCloseTo(q.x,5);expect(p.z).toBeCloseTo(q.z,5);}
  for(const x of [82,94,155,170])expect(isWalkable({x,z:-69},colliders,layout.bounds)).toBe(false);
 });
 it('joins ground to the retained elevated cave without a threshold jump',()=>{
  expect(mogaoSurfaceHeight({x:122,z:-39})).toBeCloseTo(.024,3);
  const h=[-39,-42,-45,-48,-51,-54,-55,-58,-64,-70,-76].map(z=>mogaoSurfaceHeight({x:122,z}));expect(h.every((v,i)=>i===0||v>=h[i-1])).toBe(true);
  expect(mogaoSurfaceHeight({x:122,z:-70.99})).toBeCloseTo(mogaoSurfaceHeight({x:122,z:-71.01}),5);
  expect(mogaoSurfaceHeight({x:122,z:-80})).toBeCloseTo(layout.origin[1]+.024,5);
  expect(nearDeerWall({x:114,z:-76})).toBe(true);
 });
 it('preserves accepted room dimensions and has nine ascending, narrowing eaves',()=>{
  expect(layout.room.width).toBe(24);expect(layout.room.depth).toBe(30);expect(layout.mural.height).toBe(18);
  expect(layout.tower.eaves).toHaveLength(9);expect(layout.tower.eaves.every((h,i)=>i===0||h>layout.tower.eaves[i-1])).toBe(true);expect(layout.tower.widths.every((w,i)=>i===0||w<layout.tower.widths[i-1])).toBe(true);
 });
 it('keeps the actual follow camera outside solids in front of the tower, on the stairs and indoors',()=>{
  const space=mogaoCameraSpace();for(const key of ['overview','approach','steps','entrance','passage','interior','side','back']){
   const [x,z]=(layout.views as Record<string,number[]>)[key];expect(isWalkable({x,z},colliders,layout.bounds),key).toBe(true);
   for(const yaw of [0,1.57,Math.PI,-1.57]){const pose=mogaoFollowPose(x,mogaoSurfaceHeight({x,z}),z,yaw,space);expect(space.boxes.some(b=>b.containsPoint(pose.position)),`${key}/${yaw}`).toBe(false);}
  }
 });
});
