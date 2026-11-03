import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {MOGAO_LAYOUT as layout,MOGAO_PLAYER_COLLIDERS as colliders,MOGAO_ROAD as road,mogaoSurfaceHeight,nearDeerWall,MOGAO_SESSION_OPTIONS} from '../../src/world/mogao-rules-v001';
import {isWalkable,movePlayer,surfaceHeight} from '../../src/world/movement';
import {mogaoCameraSpace,mogaoFollowPose} from '../../src/world/mogao-camera-v001';
import {settleFollowCamera} from '../../src/world/camera';
import {loadWorldSession,saveWorldSession} from '../../src/world/session';
describe('independent monumental Mogao sample',()=>{
 it('has a continuous full-width route and the approved normal walk duration',()=>{
  let distance=5; // music gate z=3 to departure z=8
  for(let i=0;i<road.length;i++){
   for(const p of [road[i].center,road[i].left,road[i].right])expect(isWalkable(p,colliders,layout.bounds),JSON.stringify(p)).toBe(true);
   if(i)distance+=Math.hypot(road[i].center.x-road[i-1].center.x,road[i].center.z-road[i-1].center.z);
  }
  expect(distance/1.8).toBeGreaterThanOrEqual(65);expect(distance/1.8).toBeLessThanOrEqual(75);
 });
 it('supports the complete ascent and the cave floor beside both walls',()=>{
  let previous=0;
  for(let z=-54.9;z>=-81;z-=.02){
   const p={x:122,z},h=mogaoSurfaceHeight(p);expect(isWalkable(p,colliders,layout.bounds)).toBe(true);
   expect(h-previous).toBeLessThan(.04);expect(h).toBeGreaterThanOrEqual(previous);previous=h;
  }
  for(const x of [111.1,114,130,132.9])for(const z of [-82,-92,-105])expect(mogaoSurfaceHeight({x,z})).toBeCloseTo(2.424);
  expect(mogaoSurfaceHeight({x:0,z:18})).toBe(surfaceHeight({x:0,z:18}));
 });
 it('can walk through the former pillar position and around the open hall',()=>{
  const path=[{x:122,z:-54},{x:122,z:-94},{x:122,z:-104},{x:130,z:-104},{x:130,z:-82},{x:114,z:-82},{x:114,z:-104},{x:122,z:-104},{x:122,z:-54}];
  let p=path[0];
  for(const target of path.slice(1)){
   const dx=target.x-p.x,dz=target.z-p.z,steps=Math.ceil(Math.hypot(dx,dz)/.1);
   for(let i=0;i<steps;i++)p=movePlayer(p,{x:dx/steps,z:dz/steps},colliders,layout.bounds);
   expect(p.x).toBeCloseTo(target.x,5);expect(p.z).toBeCloseTo(target.z,5);
  }
  for(const p of [{x:109,z:-94},{x:135,z:-85},{x:130,z:-109},{x:122,z:-109},{x:116,z:-70},{x:128,z:-70}])expect(isWalkable(p,colliders,layout.bounds)).toBe(false);
 });
 it('offers the story throughout the true chamber after the first few steps',()=>{
  for(const x of [114,122,130])for(const z of [-84,-90,-98,-104])expect(nearDeerWall({x,z})).toBe(true);
  for(const p of [{x:114,z:-70},{x:122,z:-79},{x:140,z:-94}])expect(nearDeerWall(p)).toBe(false);
 });
 it('keeps collision-constrained cameras and readable player framing at entry and throughout the open chamber',()=>{
  const space=mogaoCameraSpace();
  for(const key of ['distant','approach','steps','entrance','interior','side','mural','back']){
   const [x,z]=(layout.views as Record<string,number[]>)[key];expect(isWalkable({x,z},colliders,layout.bounds),key).toBe(true);
   for(const yaw of [0,.6,1.57,Math.PI,-1.57]){
    const pose=mogaoFollowPose(x,mogaoSurfaceHeight({x,z}),z,yaw,space),c=settleFollowCamera(pose.target,pose.position,pose.position,space,pose.subjectTarget);
    expect(space.boxes.some(b=>b.containsPoint(c)),`${key}/${yaw}`).toBe(false);
    expect(c.distanceTo(pose.target),`${key}/${yaw}`).toBeGreaterThan(1.2);
    const camera=new THREE.PerspectiveCamera(49,1279/925,.1,450);camera.position.copy(c);camera.lookAt(pose.target);camera.updateMatrixWorld();
    const feet=new THREE.Vector3(x,mogaoSurfaceHeight({x,z}),z).project(camera);
    expect(feet.y,`${key}/${yaw}`).toBeGreaterThan(-1);
   }
  }
 });
 it('saves the new region independently and preserves its position when returning',()=>{
  const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
  const checkpoint={version:1 as const,position:{x:114,z:-84},heading:1.1,cameraYaw:1.1,visitedEvents:[]};
  saveWorldSession(checkpoint,storage,MOGAO_SESSION_OPTIONS);
  expect(loadWorldSession(storage,MOGAO_SESSION_OPTIONS).data.position).toEqual(checkpoint.position);
  expect(values.size).toBe(1);expect([...values.keys()][0]).toBe('dunhuang:mogao-preview:v1');
 });
});
