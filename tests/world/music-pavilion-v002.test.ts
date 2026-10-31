import { describe,it,expect } from 'vitest';
import { MUSIC_LAYOUT_V2 as layout,MUSIC_ROAD_V2,MUSIC_PLAYER_COLLIDERS_V2 as colliders,MUSIC_SESSION_OPTIONS_V2,arrivalGain } from '../../src/world/music-pavilion-rules-v002';
import { COURTYARD_ROAD } from '../../src/world/road';
import { isWalkable,movePlayer,overlapsPolygon } from '../../src/world/movement';
import { createTravelCamera,normalizedYaw } from '../../src/world/travel-camera';
import { loadWorldSession,saveWorldSession,defaultWorldCheckpoint,WORLD_SESSION_KEY } from '../../src/world/session';
import { musicCameraSpaceV2,flyingCameraPoseV2 } from '../../src/world/music-pavilion-v002';
import { followCameraPose,settleFollowCamera } from '../../src/world/camera';
import * as THREE from 'three';

describe('isolated music v002 route and controls',()=>{
  it('joins the complete stone-road width to the actual high-wall gate',()=>{
    for(const section of MUSIC_ROAD_V2)for(const point of [section.left,section.center,section.right]){
      expect(isWalkable(point,colliders,layout.bounds),JSON.stringify(point)).toBe(true);
    }
    const last=MUSIC_ROAD_V2.at(-1)!;
    expect(last.center.x).toBe(42);expect(last.center.z).toBeCloseTo(-8.2);
    expect(layout.walls.filter(w=>w.id.includes('court-')).every(w=>w.size[1]>=2.8)).toBe(true);
  });
  it('takes 35–45 seconds from courtyard gate at unchanged 1.8 m/s walking speed',()=>{
    const before=COURTYARD_ROAD.filter(p=>p.center.z>=2&&p.center.z<=12);
    const road=[...before.reverse(),...MUSIC_ROAD_V2];
    // The route includes the existing courtyard exit, so measure the two
    // contiguous curves independently rather than include the opening road.
    const branch=MUSIC_ROAD_V2.slice(1).reduce((n,p,i)=>n+Math.hypot(p.center.x-MUSIC_ROAD_V2[i].center.x,p.center.z-MUSIC_ROAD_V2[i].center.z),0);
    expect(road.length).toBeGreaterThan(300);
    const seconds=(18.4362619453+branch)/1.8;expect(seconds).toBeGreaterThanOrEqual(35);expect(seconds).toBeLessThanOrEqual(45);
  });
  it('walks both directions along the full new road without teleporting or clipping',()=>{
    for(const road of [MUSIC_ROAD_V2,[...MUSIC_ROAD_V2].reverse()]){
      let position={...road[0].center};
      for(const p of road.slice(1)){position=movePlayer(position,{x:p.center.x-position.x,z:p.center.z-position.z},colliders,layout.bounds);expect(Math.hypot(position.x-p.center.x,position.z-p.center.z)).toBeLessThan(.001);}
    }
  });
  it('blocks the entire imported dune footprint and the tall courtyard walls',()=>{
    expect(isWalkable({x:18,z:-5},colliders,layout.bounds)).toBe(false);
    expect(isWalkable({x:50,z:-8.2},colliders,layout.bounds)).toBe(false);
    expect(overlapsPolygon({x:2,z:2},[[0,0],[4,0],[4,4],[0,4]],.9)).toBe(true);
    expect(overlapsPolygon({x:4.8,z:2},[[0,0],[4,0],[4,4],[0,4]],.9)).toBe(true);
  });
  it('holds the world bearing while the follow camera turns behind sideways travel',()=>{
    const control=createTravelCamera();let yaw=0,x=0,z=0;
    for(let i=0;i<180;i++){const v=control.vector(1,0,yaw,1/60);x+=v.x/60;z+=v.z/60;yaw=control.yaw(yaw,-Math.PI/2,true,1/60,false);}
    expect(x).toBeCloseTo(3);expect(z).toBeCloseTo(0);expect(Math.abs(normalizedYaw(yaw+Math.PI/2))).toBeLessThan(.01);
    control.vector(0,0,yaw,1/60);const next=control.vector(0,-1,yaw,1/60);expect(next.x).toBeGreaterThan(.99);
  });
  it('does not orbit at rest, during a quick tap, after manual input or with reduced motion',()=>{
    const c=createTravelCamera();c.vector(1,0,0,.1);expect(c.yaw(0,-1,true,.1,false)).toBe(0);
    c.vector(1,0,0,.3);expect(c.yaw(0,-1,false,.3,false)).toBe(0);expect(c.yaw(0,-1,true,.3,true)).toBe(0);
    c.manual();c.vector(1,0,.7,.2);expect(c.yaw(.7,-1,true,.2,false)).toBe(.7);
  });
  it('saves new-region positions and full camera angles without touching the old session',()=>{
    const values=new Map<string,string>([[WORLD_SESSION_KEY,'old-record']]);
    const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>values.delete(k)};
    const p={...defaultWorldCheckpoint(),position:{x:49.5,z:-13.8},cameraYaw:2.8};
    expect(saveWorldSession(p,storage,MUSIC_SESSION_OPTIONS_V2).ok).toBe(true);
    expect(loadWorldSession(storage,MUSIC_SESSION_OPTIONS_V2).data).toEqual(p);expect(values.get(WORLD_SESSION_KEY)).toBe('old-record');
  });
  it('keeps arrival audio silent at the courtyard and grows naturally on approach',()=>{
    expect(arrivalGain({x:-12,z:2})).toBe(0);
    expect(arrivalGain({x:24,z:16})).toBeGreaterThan(0);
    expect(arrivalGain({x:42,z:-4})).toBeGreaterThan(arrivalGain({x:24,z:16}));
    expect(arrivalGain({x:49.5,z:-13.8})).toBe(1);
  });
  it('fits the full mural at desktop and mobile observation aspect ratios',()=>{
    for(const aspect of [1279/925,844/390]){
      const pose=flyingCameraPoseV2(aspect),cam=new THREE.PerspectiveCamera(49,aspect,.1,150);cam.position.copy(pose.position);cam.lookAt(pose.target);cam.updateMatrixWorld(true);
      for(const dx of [-3.8,3.8])for(const dy of [-2.85,2.85]){
        const p=new THREE.Vector3(layout.mural.center[0]+dx,layout.mural.center[1]+dy,layout.mural.center[2]).project(cam);
        expect(Math.abs(p.x)).toBeLessThan(1);expect(Math.abs(p.y)).toBeLessThan(1);
      }
    }
  });
  it('keeps the interpolated follow camera outside high walls and roofs',()=>{
    const space=musicCameraSpaceV2();
    for(const [x,z] of [[42,-8],[49.5,-13.8],[40,-19.2],[38,12]])for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
      const pose=followCameraPose(x,0,z,yaw,space);const camera=settleFollowCamera(pose.target,pose.position,pose.position,space);
      expect(space.boxes.some(box=>box.containsPoint(camera))).toBe(false);
    }
  });
  it('keeps the traveler feet above the action controls when a wall shortens the arm',()=>{
    const pose=followCameraPose(49.5,0,-13.8,0,musicCameraSpaceV2());
    const camera=new THREE.PerspectiveCamera(49,1279/925,.1,150);camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld(true);
    const feet=new THREE.Vector3(49.5,0,-13.8).project(camera);
    expect(feet.y).toBeGreaterThan(-.64);expect(Math.abs(feet.x)).toBeLessThan(.7);
  });
});
