import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MUSIC_LAYOUT, MUSIC_ROAD, MUSIC_PLAYER_COLLIDERS, MUSIC_SESSION_KEY, nearFlyingMural, musicSurfaceHeight, flyingColor } from '../../src/world/music-pavilion-rules';
import { isWalkable, movePlayer, WORLD_COLLIDERS } from '../../src/world/movement';
import { clearCameraPosition, followCameraPose, settleFollowCamera } from '../../src/world/camera';
import { musicCameraSpace, flyingCameraPose } from '../../src/world/music-pavilion';
import { discoveryReducer, discoveryView } from '../../src/world/events';
import { defaultWorldCheckpoint, loadWorldSession, saveWorldSession, WORLD_SESSION_KEY } from '../../src/world/session';

describe('music pavilion independent world',()=>{
  it('keeps the full new road width clear of real player obstacles',()=>{
    for(const section of MUSIC_ROAD)for(const point of [section.left,section.center,section.right])expect(isWalkable(point,MUSIC_PLAYER_COLLIDERS),JSON.stringify(point)).toBe(true);
  });
  it('walks both ways from the courtyard to the mural without teleporting',()=>{
    const route=[...MUSIC_LAYOUT.walkingRoute,...MUSIC_LAYOUT.walkingRoute.slice().reverse()];
    let position={x:route[0][0],z:route[0][1]};
    for(const [x,z] of route){position=movePlayer(position,{x:x-position.x,z:z-position.z},MUSIC_PLAYER_COLLIDERS);expect(position.x).toBeCloseTo(x,5);expect(position.z).toBeCloseTo(z,5);}
  });
  it('stops at mural walls, poles and pots and keeps the shallow porch walkable',()=>{
    expect(isWalkable({x:21.5,z:-12},MUSIC_PLAYER_COLLIDERS)).toBe(false);
    for(const prop of MUSIC_LAYOUT.props)expect(isWalkable(prop,MUSIC_PLAYER_COLLIDERS)).toBe(false);
    expect(isWalkable({x:12,z:-13.2},MUSIC_PLAYER_COLLIDERS)).toBe(true);
    expect(isWalkable({x:12,z:-13.2},WORLD_COLLIDERS)).toBe(false);
    const wall=movePlayer({x:21.5,z:-7.8},{x:0,z:-8},MUSIC_PLAYER_COLLIDERS);expect(wall.z).toBeGreaterThan(-11);
    expect(musicSurfaceHeight({x:12,z:-13.2})).toBe(.36);
    expect(musicSurfaceHeight({x:21.5,z:-7.8})).toBe(0);
  });
  it('requires an explicit nearby action to observe the mural',()=>{
    const initial={mode:'exploring'} as const;
    expect(nearFlyingMural({x:21.5,z:-7.8})).toBe(true);
    expect(nearFlyingMural({x:14,z:0})).toBe(false);
    expect(discoveryReducer(initial,{type:'start',id:'flying',nearby:null})).toEqual(initial);
    const observing=discoveryReducer(initial,{type:'start',id:'flying',nearby:'flying'});
    expect(discoveryView(observing)).toBe('flying');
    expect(discoveryReducer(observing,{type:'exit'})).toEqual(initial);
  });
  it('has a monotonic reveal and immediate reduced-motion state',()=>{
    expect(flyingColor(0)).toBe(0);expect(flyingColor(3.6)).toBe(1);expect(flyingColor(0,true)).toBe(1);
    for(let t=0;t<4;t+=.05)expect(flyingColor(t+.05)).toBeGreaterThanOrEqual(flyingColor(t));
  });
  it('uses the new porch and roof camera proxies after smoothing',()=>{
    const space=musicCameraSpace();
    for(const point of [...MUSIC_ROAD.map(s=>s.center),{x:12,z:-13.2},{x:21.5,z:-7.8}]){
      for(const yaw of [-1.06,0,1.06]){
        const pose=followCameraPose(point.x,musicSurfaceHeight(point),point.z,yaw,space);
        expect(pose.position.distanceTo(pose.target)).toBeGreaterThan(1.4);
        expect(clearCameraPosition(pose.target,pose.position,space).distanceTo(pose.position)).toBeLessThan(.05);
        const settled=settleFollowCamera(pose.target,pose.position.clone().add(new THREE.Vector3(1,0,0)),pose.position,space);
        expect(clearCameraPosition(pose.target,settled,space).distanceTo(settled)).toBeLessThan(.05);
      }
    }
  });
  it('fits the complete mural above controls on desktop and mobile',()=>{
    for(const [width,height]of [[1279,925],[844,390]]){
      const pose=flyingCameraPose(width/height),camera=new THREE.PerspectiveCamera(49,width/height,.1,150);
      camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld(true);
      const [x,y,z]=MUSIC_LAYOUT.mural.center;
      for(const dx of [-3.8,3.8])for(const dy of [-2.85,2.85]){
        const projected=new THREE.Vector3(x+dx,y+dy,z).project(camera);
        expect(Math.abs(projected.x)).toBeLessThan(.93);expect(projected.y).toBeLessThan(.86);expect(projected.y).toBeGreaterThan(-.62);
      }
    }
  });
  it('restores porch and completed art only in its independent session',()=>{
    const map=new Map<string,string>();const storage={getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{map.set(key,value);}};
    map.set(WORLD_SESSION_KEY,JSON.stringify(defaultWorldCheckpoint()));const old=map.get(WORLD_SESSION_KEY);
    const data={...defaultWorldCheckpoint(),position:{x:12,z:-13.2},visitedEvents:['flying'] as const};
    const options={key:MUSIC_SESSION_KEY,colliders:MUSIC_PLAYER_COLLIDERS};
    expect(saveWorldSession({...data,visitedEvents:[...data.visitedEvents]},storage,options).ok).toBe(true);
    const loaded=loadWorldSession(storage,options);expect(loaded.data.position).toEqual(data.position);expect(loaded.data.visitedEvents).toEqual(['flying']);expect(map.get(WORLD_SESSION_KEY)).toBe(old);
  });
});
