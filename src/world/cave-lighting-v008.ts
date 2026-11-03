import * as THREE from 'three';
/** Viewer adaptation only affects cave surfaces, never the outside desert. */
export function caveAdaptationTarget(x:number,z:number){
 if(Math.abs(x-122)>14.5)return 0;
 return THREE.MathUtils.smoothstep(-68-z,2,9);
}
export function caveSurfaceGain(adaptation:number){return .004+.48*THREE.MathUtils.clamp(adaptation,0,1);}
export function createCaveLighting(calibratePaint=false,adaptationAt=caveAdaptationTarget){
 const cave=new Map<THREE.MeshStandardMaterial,THREE.Color>(),traveler=new Map<THREE.MeshStandardMaterial,THREE.Color>();
 let adaptation=0;
 function collect(root:THREE.Object3D,target:typeof cave){root.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){const base=m.color.clone();if(calibratePaint&&target===cave){if(/^(deer|novice)$/.test(m.name))base.multiplyScalar(.53);else if(m.name==='border')base.multiplyScalar(.32);else if(m.name==='contact-stone')base.multiply(new THREE.Color(.6,.57,.5));}target.set(m,base);if(target===cave){m.metalness=0;m.roughness=Math.max(.9,m.roughness);m.emissive.set(0);m.envMapIntensity=0;}}});}
 return {
  addCave:(root:THREE.Object3D)=>collect(root,cave),addTraveler:(root:THREE.Object3D)=>collect(root,traveler),
  update(eye:THREE.Vector3,dt:number,immediate:boolean){
   const desired=adaptationAt(eye.x,eye.z);adaptation=immediate?desired:THREE.MathUtils.lerp(adaptation,desired,1-Math.exp(-dt*1.25));
   for(const [m,c] of cave)m.color.copy(c).multiplyScalar(caveSurfaceGain(adaptation));
   for(const [m,c] of traveler)m.color.copy(c).multiplyScalar(1-.82*desired);
  },
  inspect:()=>({adaptation,gain:caveSurfaceGain(adaptation),caveMaterials:cave.size}),
 };
}
