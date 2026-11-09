import * as THREE from 'three';
/** Viewer adaptation only affects cave surfaces, never the outside desert. */
export function caveAdaptationTarget(x:number,z:number){
 if(Math.abs(x-122)>14.5)return 0;
 return THREE.MathUtils.smoothstep(-68-z,2,9);
}
export function caveSurfaceGain(adaptation:number){return .004+.48*THREE.MathUtils.clamp(adaptation,0,1);}
interface CaveFinishAdaptation {
  /** The approved stone palette describes the appearance once the eye has adjusted. */
  colorsAtFullAdaptation: ReadonlySet<THREE.MeshStandardMaterial>;
  /** Entrance GLBs also contain exterior meshes that do not use cave adaptation. */
  finishOnly?: boolean;
}
export function createCaveLighting(calibratePaint=false,adaptationAt=caveAdaptationTarget){
 const cave=new Map<THREE.MeshStandardMaterial,THREE.Color>(),traveler=new Map<THREE.MeshStandardMaterial,THREE.Color>();
 let adaptation=0;
 function collect(root:THREE.Object3D,target:typeof cave,finish?:CaveFinishAdaptation){
  root.traverse(object=>{
   if(!(object instanceof THREE.Mesh))return;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!(material instanceof THREE.MeshStandardMaterial))continue;
    const finished=finish?.colorsAtFullAdaptation.has(material);
    if(finish?.finishOnly&&!finished)continue;
    const base=material.color.clone();
    if(target===cave){
     if(finished)base.multiplyScalar(1/caveSurfaceGain(1));
     else if(calibratePaint){
      if(/^(deer|novice)$/.test(material.name))base.multiplyScalar(.53);
      else if(material.name==='border')base.multiplyScalar(.32);
      else if(material.name==='contact-stone')base.multiply(new THREE.Color(.6,.57,.5));
     }
     material.metalness=0;material.roughness=Math.max(.9,material.roughness);
     material.emissive.set(0);material.envMapIntensity=0;
    }
    target.set(material,base);
   }
  });
 }
 return {
  addCave:(root:THREE.Object3D,finish?:CaveFinishAdaptation)=>collect(root,cave,finish),
  addTraveler:(root:THREE.Object3D)=>collect(root,traveler),
  update(eye:THREE.Vector3,dt:number,immediate:boolean){
   const desired=adaptationAt(eye.x,eye.z);adaptation=immediate?desired:THREE.MathUtils.lerp(adaptation,desired,1-Math.exp(-dt*1.25));
   for(const [m,c] of cave)m.color.copy(c).multiplyScalar(caveSurfaceGain(adaptation));
   for(const [m,c] of traveler)m.color.copy(c).multiplyScalar(1-.82*desired);
  },
  inspect:()=>({adaptation,gain:caveSurfaceGain(adaptation),caveMaterials:cave.size}),
 };
}
