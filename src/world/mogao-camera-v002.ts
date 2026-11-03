import * as THREE from 'three';
import { CAMERA_CLEARANCE, followCameraPose, clearCameraPosition, settleFollowCamera, type CameraSpace } from './camera';
import { musicCameraSpaceV4 } from './music-pavilion-v004';
import { MOGAO_SOLIDS, MOGAO_LAYOUT } from './mogao-rules-v002';

export function mogaoCameraSpace():CameraSpace {
  const existing=musicCameraSpaceV4(),[x,y,z]=MOGAO_LAYOUT.origin;
  return {...existing, boxes:[...existing.boxes,
    ...MOGAO_SOLIDS.filter(s=>!s.circle).map(s=>new THREE.Box3(new THREE.Vector3(s.minX,-.2,s.minZ),new THREE.Vector3(s.maxX,s.height,s.maxZ)).expandByScalar(CAMERA_CLEARANCE)),
    new THREE.Box3(new THREE.Vector3(x-4,y+9,z-MOGAO_LAYOUT.room.front),new THREE.Vector3(x+4,y+12,z)).expandByScalar(CAMERA_CLEARANCE),
    new THREE.Box3(new THREE.Vector3(x-MOGAO_LAYOUT.room.width/2,y+MOGAO_LAYOUT.room.height,z-MOGAO_LAYOUT.room.front-MOGAO_LAYOUT.room.depth),new THREE.Vector3(x+MOGAO_LAYOUT.room.width/2,y+40,z-MOGAO_LAYOUT.room.front)).expandByScalar(CAMERA_CLEARANCE),
  ],cylinders:[...existing.cylinders,...MOGAO_SOLIDS.flatMap(s=>s.circle?[{...s.circle,id:s.id!,minY:0,maxY:s.height}]:[])]};
}
export function mogaoFollowPose(x:number,y:number,z:number,yaw:number,space:CameraSpace){
  // Raise the aim gradually, keeping the same controls and collision solver.
  // The low shoulder angle reveals the upper vault while walking around the pillar.
  if(x>74&&z<60){
    const blend=THREE.MathUtils.smoothstep(x,74,85);
    const target=new THREE.Vector3(x,y+1.8+blend*1.4,z);
    const subjectTarget=new THREE.Vector3(x,y+.65,z);
    const arm=9.2+blend*2.8;
    const desired=target.clone().add(new THREE.Vector3(Math.sin(yaw)*arm,2.7-blend*1.6,Math.cos(yaw)*arm));
    const position=settleFollowCamera(target,clearCameraPosition(target,desired,space),desired,space,subjectTarget);
    if(position.distanceTo(target)<8.0)return followCameraPose(x,y,z,yaw,{...space,landmarkFraming:undefined});
    return {target,position,subjectTarget};
  }
  return followCameraPose(x,y,z,yaw,space);
}
