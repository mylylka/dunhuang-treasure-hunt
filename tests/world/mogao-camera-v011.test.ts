import {describe,it,expect} from 'vitest';
import {PerspectiveCamera,Vector3} from 'three';
import {mogaoCameraSpace,mogaoFollowPose,settleStairCamera,stairCameraBoxes} from '../../src/world/mogao-camera-v011';
import {mogaoSurfaceHeight} from '../../src/world/mogao-rules-v008';
import {clearCameraPosition} from '../../src/world/camera';
import {explorationLookTarget} from '../../src/world/exploration-look';
const space=mogaoCameraSpace();
function assertVisible(x:number,z:number,position:Vector3,target:Vector3){
 const y=mogaoSurfaceHeight({x,z}),body=new Vector3(x,y+.65,z);
 expect(space.boxes.some(b=>b.containsPoint(position)),`camera inside solid at ${x},${z}`).toBe(false);
 expect(clearCameraPosition(body,position,space).distanceTo(position),`blocked body at ${x},${z}`).toBeLessThan(.001);
 const camera=new PerspectiveCamera(49,1279/925,.1,450);camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();
 for(const h of [.3,1.8]){
  const p=new Vector3(x,y+h,z).project(camera);
  expect(Math.abs(p.x)).toBeLessThan(.92);expect(Math.abs(p.y),`cropped traveler at ${x},${z}`).toBeLessThan(.92);
 }
}
describe('v011 staircase camera',()=>{
 it('has a stepped camera obstruction including the walkable central platform',()=>{
  expect(stairCameraBoxes()).toHaveLength(32);
  expect(stairCameraBoxes().some(b=>b.containsPoint(new Vector3(122,5,-59)))).toBe(true);
 });
 it('keeps the whole traveler visible on each tread facing up/down/across',()=>{
  for(const x of [119,122,125])for(let z=-57.8;z<=-39;z+=.317)for(const yaw of [0,Math.PI,Math.PI-.4,Math.PI+.4,Math.PI/2,-Math.PI/2]){
   const p=mogaoFollowPose(x,mogaoSurfaceHeight({x,z}),z,yaw,space);assertVisible(x,z,p.position,p.target);
  }
 });
 it('keeps descending/running poses safe after damping, including turns',()=>{
  let eye=mogaoFollowPose(122,mogaoSurfaceHeight({x:122,z:-59}),-59,Math.PI,space).position;
  for(let frame=0;frame<400;frame++){
   const z=-59+frame*.06,x=122,y=mogaoSurfaceHeight({x,z});
   const p=mogaoFollowPose(x,y,z,Math.PI+Math.sin(frame*.03)*.3,space);
   eye.lerp(p.position,1-Math.exp(-10/60));eye=settleStairCamera(p.target,eye,p.position,space,new Vector3(x,y+.65,z));
   assertVisible(x,z,eye,p.target);
  }
 });
 it('global look changes signed pitch without shifting the eye or horizontal direction',()=>{
  const eye=new Vector3(122,9,-50),target=new Vector3(122,6,-56),original=eye.clone();
  const up=explorationLookTarget(eye,target,1.25),down=explorationLookTarget(eye,target,-.55);
  expect(up.y).toBeGreaterThan(target.y);expect(down.y).toBeLessThan(target.y);expect(eye).toEqual(original);
  expect(up.z).toBeLessThan(eye.z);expect(down.z).toBeLessThan(eye.z);
  expect(explorationLookTarget(eye,target,0)).toEqual(target);
 });
});
