import {musicSpatialGain} from '../../src/world/music-arrival-audio';
import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {MUSIC_LAYOUT_V4 as layout,MUSIC_PLAYER_COLLIDERS_V4 as colliders,MUSIC_ROAD_V4 as road,musicSurfaceHeightV4,nearFlyingMuralV4,MUSIC_SESSION_KEY_V4} from '../../src/world/music-pavilion-rules-v004';
import {MUSIC_LAYOUT_V3 as old,MUSIC_SESSION_KEY_V3} from '../../src/world/music-pavilion-rules-v003';
import {isWalkable,movePlayer} from '../../src/world/movement';
import {musicCameraSpaceV4,flyingCameraPoseV4} from '../../src/world/music-pavilion-v004';
import {followCameraPose,settleFollowCamera} from '../../src/world/camera';
describe('expanded music courtyard v004',()=>{
 it('keeps the first court quiet and reveals the approaching music after departure',()=>{
  for(const z of [-20,-5,0,2])expect(musicSpatialGain({x:-12,z},layout.audio)).toBe(0);
  expect(musicSpatialGain({x:-8,z:8},layout.audio)).toBeGreaterThan(.05);
  expect(musicSpatialGain({x:layout.audio.source[0],z:layout.audio.source[2]},layout.audio)).toBe(1);
 });
 it('preserves old geometry configuration while doubling mural area at original aspect',()=>{
  expect(MUSIC_SESSION_KEY_V4).not.toBe(MUSIC_SESSION_KEY_V3);
  expect(layout.mural.width*layout.mural.height/(old.mural.width*old.mural.height)).toBeGreaterThanOrEqual(2);
  expect(layout.mural.width/layout.mural.height).toBeCloseTo(4/3,8);
  expect(layout.court.wallTop).toBeLessThan(5.8);expect(layout.court.openworkHeight).toBe(1.6);
  expect(old.mural.width).toBe(7.6);
 });
 it('keeps the sole gate and full-width approach road clear',()=>{
  for(const s of road)for(const p of [s.left,s.center,s.right])expect(isWalkable(p,colliders,layout.bounds),JSON.stringify(p)).toBe(true);
  const c=layout.court,g=layout.gate;
  for(let z=c.backZ;z<=c.frontZ;z+=.1)for(const x of [c.minX,c.maxX])expect(isWalkable({x,z},colliders,layout.bounds)).toBe(false);
  for(let x=c.minX;x<=c.maxX;x+=.1){expect(isWalkable({x,z:c.backZ},colliders,layout.bounds)).toBe(false);if(Math.abs(x-g.center[0])>g.width/2+.25)expect(isWalkable({x,z:c.frontZ},colliders,layout.bounds)).toBe(false);}
  const start={x:g.center[0],z:g.center[1]+2};expect(movePlayer(start,{x:0,z:-5},colliders,layout.bounds).z).toBeCloseTo(start.z-5,6);
 });
 it('supports a continuous ascent on front and both sides of the complete base',()=>{
  const p=layout.platform;
  for(const side of ['front','left','right']){
   let last=0;
   for(let t=0;t<=p.run+.4;t+=.02){
    const point=side==='front'?{x:layout.gate.center[0],z:p.maxZ+p.run+.4-t}:side==='left'?{x:p.minX-p.run-.4+t,z:-22}:{x:p.maxX+p.run+.4-t,z:-22};
    const h=musicSurfaceHeightV4(point);expect(h).toBeGreaterThanOrEqual(last);expect(h-last).toBeLessThan(.08);last=h;
   }
   expect(last).toBeCloseTo(1.8,1);
  }
  expect(musicSurfaceHeightV4({x:layout.gate.center[0],z:-19})).toBe(1.8);
 });
 it('makes mural interaction reachable and visible at desktop and landscape sizes',()=>{
  const [x,z]=layout.mural.trigger;expect(isWalkable({x,z},colliders,layout.bounds)).toBe(true);expect(nearFlyingMuralV4({x,z})).toBe(true);
  for(const aspect of [1279/925,844/390]){
   const pose=flyingCameraPoseV4(aspect),camera=new THREE.PerspectiveCamera(49,aspect,.1,150);camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld(true);
   for(const dx of [-.5,.5])for(const dy of [-.5,.5]){
    const pt=new THREE.Vector3(layout.mural.center[0]+layout.mural.width*dx,layout.mural.center[1]+layout.mural.height*dy,layout.mural.center[2]);const ndc=pt.clone().project(camera);
    expect(Math.abs(ndc.x)).toBeLessThan(.93);expect(ndc.y).toBeGreaterThan(-.65);expect(ndc.y).toBeLessThan(.93);
   }
  }
 });
 it('keeps cameras outside new walls and furniture at the actual walking height',()=>{
  const space=musicCameraSpaceV4();
  for(const key of ['approach','side-west','side-east','steps','porch','mural']){
   const [x,z]=(layout.views as Record<string,number[]>)[key];expect(isWalkable({x,z},colliders,layout.bounds),key).toBe(true);
   for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const pose=followCameraPose(x,musicSurfaceHeightV4({x,z}),z,yaw,space);const c=settleFollowCamera(pose.target,pose.position,pose.position,space,pose.subjectTarget);
    expect(space.boxes.some(box=>box.containsPoint(c)),key).toBe(false);
   }
  }
 });
});
