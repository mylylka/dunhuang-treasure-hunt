import * as THREE from 'three';
/** Tilt only the view ray. The already collision-checked camera position stays unchanged. */
export function caveLookTarget(eye:THREE.Vector3,target:THREE.Vector3,lift:number){
 if(lift<=0)return target.clone();
 const direction=target.clone().sub(eye),distance=Math.max(1,direction.length());
 const horizontal=Math.hypot(direction.x,direction.z),pitch=Math.min(1.28,Math.atan2(direction.y,horizontal)+lift);
 if(horizontal<.001)return target.clone();
 return eye.clone().add(new THREE.Vector3(direction.x/horizontal*Math.cos(pitch),Math.sin(pitch),direction.z/horizontal*Math.cos(pitch)).multiplyScalar(distance));
}
