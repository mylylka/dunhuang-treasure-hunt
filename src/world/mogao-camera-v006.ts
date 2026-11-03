import * as THREE from 'three';
import { CAMERA_CLEARANCE, followCameraPose, clearCameraPosition, settleFollowCamera, type CameraSpace } from './camera';
import { musicCameraSpaceV4 } from './music-pavilion-v004';
import { MOGAO_SOLIDS, MOGAO_LAYOUT } from './mogao-rules-v006';
import { mogaoFollowPose as roomFollowPose } from './mogao-camera-v003';
export function mogaoCameraSpace():CameraSpace{
 const old=musicCameraSpaceV4(),[x,y,z]=MOGAO_LAYOUT.origin;
 return {...old,boxes:[...old.boxes,
  ...MOGAO_SOLIDS.filter(s=>!s.circle).map(s=>new THREE.Box3(new THREE.Vector3(s.minX,-.2,s.minZ),new THREE.Vector3(s.maxX,s.height,s.maxZ)).expandByScalar(CAMERA_CLEARANCE)),
  new THREE.Box3(new THREE.Vector3(x-4.4,y+9,z-3),new THREE.Vector3(x+4.4,y+12,z+3.6)).expandByScalar(CAMERA_CLEARANCE),
  new THREE.Box3(new THREE.Vector3(x-12,y+18,z-33),new THREE.Vector3(x+12,y+40,z-3)).expandByScalar(CAMERA_CLEARANCE),
  new THREE.Box3(new THREE.Vector3(x-19,17.2,z+1),new THREE.Vector3(x+19,20.7,z+14)).expandByScalar(CAMERA_CLEARANCE),
 ],cylinders:[...old.cylinders,...MOGAO_SOLIDS.flatMap(s=>s.circle?[{...s.circle,id:s.id!,minY:0,maxY:s.height}]:[])]};
}
export function mogaoFollowPose(x:number,y:number,z:number,yaw:number,space:CameraSpace){
 if(x>80&&z>0){
  const blend=THREE.MathUtils.smoothstep(z,0,28),arm=12+blend*6;
  const target=new THREE.Vector3(x,y+3.2+blend*3.8,z),subjectTarget=new THREE.Vector3(x,y+.65,z);
  const desired=target.clone().add(new THREE.Vector3(Math.sin(yaw)*arm,1.1-blend*3.1,Math.cos(yaw)*arm));
  const position=settleFollowCamera(target,clearCameraPosition(target,desired,space),desired,space,subjectTarget);
  if(position.distanceTo(target)<8)return followCameraPose(x,y,z,yaw,{...space,landmarkFraming:undefined});
  return {target,position,subjectTarget};
 }
 return roomFollowPose(x,y,z,yaw,space);
}
