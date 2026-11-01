import { describe,it,expect } from 'vitest';
import * as THREE from 'three';
import { MUSIC_LAYOUT_V3 as layout, MUSIC_PLAYER_COLLIDERS_V3 as colliders, MUSIC_ROAD_V3 as road, MUSIC_SESSION_KEY_V3 } from '../../src/world/music-pavilion-rules-v003';
import { MUSIC_LAYOUT_V2 as previous, MUSIC_SESSION_KEY_V2 } from '../../src/world/music-pavilion-rules-v002';
import { isWalkable,movePlayer } from '../../src/world/movement';
import { musicCameraSpaceV3,flyingCameraPoseV3 } from '../../src/world/music-pavilion-v003';
import { followCameraPose,settleFollowCamera } from '../../src/world/camera';

describe('music v003 complete enclosure',()=>{
  it('keeps the approved road, sound, mural and independent previous session intact',()=>{
    for(const key of ['road','audio','mural','dune'] as const)expect(layout[key]).toEqual(previous[key]);
    expect(MUSIC_SESSION_KEY_V3).not.toBe(MUSIC_SESSION_KEY_V2);
    expect(previous.walls.filter(w=>w.id.includes('court-')).every(w=>w.size[1]===3)).toBe(true);
  });
  it('has a continuous physical perimeter all the way behind the building, with only the front gate open',()=>{
    const walls=layout.walls.filter(w=>w.id.includes('court-'));
    const inside=(x:number,z:number)=>walls.some(w=>Math.abs(x-w.center[0])<=w.size[0]/2+.0001&&Math.abs(z-w.center[2])<=w.size[2]/2+.0001);
    for(let z=-30.5;z<=-8.2;z+=.1){expect(inside(36.8,z)).toBe(true);expect(inside(55.2,z)).toBe(true);}
    for(let x=36.8;x<=55.2;x+=.1){expect(inside(x,-30.5)).toBe(true);expect(inside(x,-8.2)).toBe(x<=38.9+.0001||x>=45.2-.0001);}
    expect(walls.every(w=>w.center[1]+w.size[1]/2===5.8)).toBe(true);
    expect(-30.5).toBeLessThan(layout.walls.find(w=>w.id==='music-back')!.center[2]-2);
  });
  it('keeps the full road width open and blocks side and rear shortcuts',()=>{
    for(const s of road)for(const p of [s.left,s.center,s.right])expect(isWalkable(p,colliders,layout.bounds)).toBe(true);
    for(const [p,d] of [[{x:46,z:-33},{x:0,z:4}],[{x:58,z:-26},{x:-4,z:0}],[{x:34,z:-26},{x:4,z:0}]] as const){
      const end=movePlayer(p,d,colliders,layout.bounds);expect(Math.hypot(end.x-p.x-d.x,end.z-p.z-d.z)).toBeGreaterThan(1);
    }
    let p={x:42,z:-6};p=movePlayer(p,{x:0,z:-5},colliders,layout.bounds);expect(p.z).toBeCloseTo(-11,6);
  });
  it('shows the complete mural above the raised wall at desktop and mobile aspect ratios',()=>{
    const walls=layout.walls.filter(w=>w.id.includes('court-')).map(w=>new THREE.Box3(new THREE.Vector3(w.center[0]-w.size[0]/2-.06,0,w.center[2]-w.size[2]/2-.06),new THREE.Vector3(w.center[0]+w.size[0]/2+.06,5.94,w.center[2]+w.size[2]/2+.06)));
    for(const aspect of [1279/925,844/390]){
      const pose=flyingCameraPoseV3(aspect),cam=new THREE.PerspectiveCamera(49,aspect,.1,150);cam.position.copy(pose.position);cam.lookAt(pose.target);cam.updateMatrixWorld(true);
      for(const dx of [-3.8,0,3.8])for(const dy of [-2.85,0,2.85]){
        const point=new THREE.Vector3(layout.mural.center[0]+dx,layout.mural.center[1]+dy,layout.mural.center[2]);
        const projected=point.clone().project(cam);expect(Math.abs(projected.x)).toBeLessThan(1);expect(Math.abs(projected.y)).toBeLessThan(1);
        const ray=new THREE.Ray(pose.position,point.clone().sub(pose.position).normalize());
        for(const wall of walls){const hit=ray.intersectBox(wall,new THREE.Vector3());expect(hit&&pose.position.distanceTo(hit)<pose.position.distanceTo(point)).toBeFalsy();}
      }
    }
  });
  it('keeps follow cameras out of front, side and rear walls',()=>{
    const space=musicCameraSpaceV3();
    for(const [x,z] of [[42,-8],[49.5,-13.8],[40,-19.2],[61,-23],[32,-25],[46,-33]])for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
      const pose=followCameraPose(x,0,z,yaw,space),camera=settleFollowCamera(pose.target,pose.position,pose.position,space,pose.subjectTarget);
      expect(space.boxes.some(box=>box.containsPoint(camera))).toBe(false);
    }
  });
});
