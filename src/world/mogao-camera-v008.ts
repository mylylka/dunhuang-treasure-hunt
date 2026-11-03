import * as THREE from 'three';
import {CAMERA_CLEARANCE,clearCameraPosition,settleFollowCamera,type CameraSpace} from './camera';
import {musicCameraSpaceV4} from './music-pavilion-v004';
import {mogaoFollowPose as exteriorPose} from './mogao-camera-v007';
import {MOGAO_SOLIDS,MOGAO_LAYOUT,inMogaoRoom} from './mogao-rules-v008';
export function mogaoCameraSpace():CameraSpace{
 const old=musicCameraSpaceV4(),[x,y,z]=MOGAO_LAYOUT.origin;
 return {...old,boxes:[...old.boxes,...MOGAO_SOLIDS.filter(s=>!s.circle).map(s=>new THREE.Box3(new THREE.Vector3(s.minX,-.2,s.minZ),new THREE.Vector3(s.maxX,s.height,s.maxZ)).expandByScalar(CAMERA_CLEARANCE)),
 new THREE.Box3(new THREE.Vector3(x-3.04,y+6.28,z-7),new THREE.Vector3(x+3.04,y+7.5,z+2.4)).expandByScalar(CAMERA_CLEARANCE)],cylinders:[...old.cylinders,...MOGAO_SOLIDS.flatMap(s=>s.circle?[{...s.circle,id:s.id!,minY:0,maxY:s.height}]:[])]};
}
export function mogaoFollowPose(x:number,y:number,z:number,yaw:number,space:CameraSpace){
 if(inMogaoRoom({x,z})||(Math.abs(x-122)<3.04&&z< -65)){
  const target=new THREE.Vector3(x,y+1.6,z),subjectTarget=new THREE.Vector3(x,y+.65,z);
  const desired=target.clone().add(new THREE.Vector3(Math.sin(yaw)*4.4,.9,Math.cos(yaw)*4.4));
  const position=settleFollowCamera(target,clearCameraPosition(target,desired,space),desired,space,subjectTarget);
  return {target,position,subjectTarget};
 }
 return exteriorPose(x,y,z,yaw,space);
}
