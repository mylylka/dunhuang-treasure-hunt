import * as THREE from 'three';
export const MIN_EXPLORATION_LOOK=-.55;
export const MAX_EXPLORATION_LOOK=1.25;
/** Change only the view ray; collision-safe camera and movement yaw stay put. */
export function explorationLookTarget(eye:THREE.Vector3,target:THREE.Vector3,offset:number) {
  const ray=target.clone().sub(eye),distance=ray.length(),horizontal=Math.hypot(ray.x,ray.z);
  if(horizontal<.001||!offset)return target.clone();
  const pitch=THREE.MathUtils.clamp(Math.atan2(ray.y,horizontal)+offset,-1.2,1.28);
  return eye.clone().add(new THREE.Vector3(ray.x/horizontal*Math.cos(pitch),Math.sin(pitch),ray.z/horizontal*Math.cos(pitch)).multiplyScalar(distance));
}
