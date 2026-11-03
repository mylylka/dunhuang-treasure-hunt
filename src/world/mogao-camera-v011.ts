import * as THREE from 'three';
import geometry from '../content/world/mogao-geometry-v007.json';
import { CAMERA_CLEARANCE, clearCameraPosition, type CameraSpace } from './camera';
import { mogaoCameraSpace as previousSpace, mogaoFollowPose as previousPose } from './mogao-camera-v008';
import { MOGAO_LAYOUT } from './mogao-rules-v008';

const [ox, floor, oz] = MOGAO_LAYOUT.origin;
const stairs = geometry.stairs;
const paddedBox = (x1:number,x2:number,depth1:number,depth2:number,top:number) =>
  new THREE.Box3(new THREE.Vector3(ox+x1,-.2,oz-depth2),new THREE.Vector3(ox+x2,top,oz-depth1)).expandByScalar(CAMERA_CLEARANCE);

/** Walkable surfaces still obstruct the camera. Match the exported 30 risers,
 * including the raised porch, rather than using the player's smooth ramp. */
export function stairCameraBoxes() {
  const boxes = Array.from({length:stairs.steps},(_,i)=> {
    const d0=stairs.front+(stairs.back-stairs.front)*i/stairs.steps;
    const d1=stairs.front+(stairs.back-stairs.front)*(i+1)/stairs.steps;
    return paddedBox(-stairs.width/2,stairs.width/2,d0,d1,floor*(i+1)/stairs.steps);
  });
  boxes.push(paddedBox(-12.5,12.5,-10.2,3.1,floor+.01));
  boxes.push(paddedBox(-3.04,3.04,3.1,7.1,floor+.024));
  return boxes;
}
export function mogaoCameraSpace():CameraSpace {
  const old=previousSpace();
  return {...old,subjectHeight:.65,boxes:[...old.boxes,...stairCameraBoxes()]};
}

/** Both body and aim must have clear sight lines, also after camera easing. */
export function settleStairCamera(target:THREE.Vector3,interpolated:THREE.Vector3,desired:THREE.Vector3,space:CameraSpace,subject:THREE.Vector3) {
  const resolve=(eye:THREE.Vector3)=> {
    let safe=eye.clone();
    for(let i=0;i<3;i++) {
      safe=clearCameraPosition(target,safe,space);
      safe=clearCameraPosition(subject,safe,space);
    }
    return safe;
  };
  const safe=resolve(interpolated),preferred=resolve(desired);
  // A newly intersected stair/platform must not leave the camera at avatar
  // distance while it slowly catches up. Retreat to the already-safe pose.
  return safe.distanceTo(subject)<3.4&&preferred.distanceTo(subject)>safe.distanceTo(subject)+.6?preferred:safe;
}
export function mogaoFollowPose(x:number,y:number,z:number,yaw:number,space:CameraSpace) {
  const previous=previousPose(x,y,z,yaw,space);
  const depth=oz-z;
  const blend=(1-THREE.MathUtils.smoothstep(Math.abs(x-ox),7.5,12))
    *THREE.MathUtils.smoothstep(depth,-35,-29)
    *(1-THREE.MathUtils.smoothstep(depth,5,7));
  if(blend<=0)return previous;
  const subjectTarget=new THREE.Vector3(x,y+.65,z);
  const target=previous.target.clone().lerp(new THREE.Vector3(x,y+1.6,z),blend);
  // See down over the rising stairs behind the traveler, with a shorter arm
  // under the porch. The user's look-up/down angle remains independent.
  const porch=THREE.MathUtils.smoothstep(depth,-11,-7);
  const arm=THREE.MathUtils.lerp(7,4.4,porch),rise=THREE.MathUtils.lerp(4.1,2.4,porch);
  const stepEye=new THREE.Vector3(x+Math.sin(yaw)*arm,y+1.6+rise,z+Math.cos(yaw)*arm);
  const desired=previous.position.clone().lerp(stepEye,blend);
  const position=settleStairCamera(target,desired,desired,space,subjectTarget);
  return {target,position,subjectTarget};
}
