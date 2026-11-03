import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {MOGAO_LAYOUT as layout,MOGAO_PLAYER_COLLIDERS as colliders,MOGAO_ROAD as road,mogaoSurfaceHeight,nearDeerWall} from '../../src/world/mogao-rules-v003';
import {isWalkable,movePlayer} from '../../src/world/movement';
import {mogaoCameraSpace,mogaoFollowPose} from '../../src/world/mogao-camera-v003';
import {caveLookTarget} from '../../src/world/cave-look';

describe('user cliff integration and four-wall viewing',()=>{
 it('joins the existing road to the supplied stairs without obstructing its full width',()=>{
  for(const s of road)for(const p of [s.left,s.center,s.right])expect(isWalkable(p,colliders,layout.bounds),JSON.stringify(p)).toBe(true);
  expect(road.at(-1)?.center).toEqual({x:119,z:-39});
 });
 it('walks from the actual staircase through the main doorway and around the accepted chamber',()=>{
  const path=[{x:119,z:-39},{x:119,z:-60},{x:122,z:-60},{x:122,z:-78},{x:114,z:-78},{x:114,z:-97},{x:130,z:-97},{x:130,z:-78},{x:122,z:-78},{x:122,z:-60},{x:119,z:-60},{x:119,z:-39}];let p=path[0];
  for(const target of path.slice(1)){
   const dx=target.x-p.x,dz=target.z-p.z,n=Math.ceil(Math.hypot(dx,dz)/.08);
   for(let i=0;i<n;i++)p=movePlayer(p,{x:dx/n,z:dz/n},colliders,layout.bounds);
   expect(p.x).toBeCloseTo(target.x,5);expect(p.z).toBeCloseTo(target.z,5);
  }
  for(const x of [85,105,138,160])expect(isWalkable({x,z:-67},colliders,layout.bounds)).toBe(false);
 });
 it('uses measured model heights, meeting the elevated room without a threshold jump',()=>{
  expect(mogaoSurfaceHeight({x:119,z:-39})).toBeCloseTo(.024,3);
  const heights=[-43,-46,-49,-52,-55,-58,-61,-64].map(z=>mogaoSurfaceHeight({x:119,z}));
  expect(heights.every((h,i)=>i===0||h>=heights[i-1])).toBe(true);
  expect(mogaoSurfaceHeight({x:122,z:-70.99})).toBeCloseTo(mogaoSurfaceHeight({x:122,z:-71.01}),3);
  expect(mogaoSurfaceHeight({x:122,z:-80})).toBeCloseTo(layout.origin[1]+.024,5);
  for(const x of [114,122,130])expect(nearDeerWall({x,z:-76})).toBe(true);
  expect(nearDeerWall({x:122,z:-72})).toBe(false);
 });
 it('retains room proportions and source aspect across four walls, with an open doorway',()=>{
  expect(layout.room.width).toBe(24);expect(layout.room.depth).toBe(30);expect(layout.mural.height).toBe(18);
  const perimeter=2*(layout.room.width+layout.room.depth),crop=layout.mural.cropPixels;
  expect((crop[2]-crop[0])/(crop[3]-crop[1])).toBeCloseTo(perimeter/layout.mural.height,8);
  expect(crop[2]/12918).toBeGreaterThan(.998);
  expect(layout.mural.entryOpeningPixels[0]).toBeGreaterThan(84/18*2150);
 });
 it('keeps the camera outside solids at the stairs, doorway and each room orientation',()=>{
  const space=mogaoCameraSpace();
  for(const key of ['steps','entrance','passage','interior','side','back']){
   const [x,z]=(layout.views as Record<string,number[]>)[key];expect(isWalkable({x,z},colliders,layout.bounds),key).toBe(true);
   for(const yaw of [0,1.57,Math.PI,-1.57]){
    const pose=mogaoFollowPose(x,mogaoSurfaceHeight({x,z}),z,yaw,space);
    expect(space.boxes.some(b=>b.containsPoint(pose.position)),`${key}/${yaw}`).toBe(false);
   }
  }
 });
 it('looks up without moving the collision-checked camera, preserves azimuth and resets exactly',()=>{
  const eye=new THREE.Vector3(122,11,-79),target=new THREE.Vector3(122,10,-90),copy=eye.clone();
  const tilted=caveLookTarget(eye,target,.66);expect(eye.equals(copy)).toBe(true);expect(tilted.y).toBeGreaterThan(eye.y);expect(tilted.x).toBe(target.x);
  const d=caveLookTarget(eye,target,10).sub(eye);expect(Math.atan2(d.y,Math.hypot(d.x,d.z))).toBeCloseTo(1.28);
  expect(caveLookTarget(eye,target,0)).toEqual(target);
 });
});
