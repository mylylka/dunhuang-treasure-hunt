import * as THREE from 'three';

/** Conservative front viewing zone plus projected anatomy, not an R-key trigger.
 * Landmarks are measured in the accepted 35m model's world coordinates. */
export function buddhaDominatesView(camera: THREE.PerspectiveCamera) {
  const eye=camera.position;
  if(Math.abs(eye.x-122)>8.5 || eye.z> -74 || eye.z< -82.5)return false;
  camera.updateMatrixWorld(true);
  const forward=camera.getWorldDirection(new THREE.Vector3());
  if(forward.y<.42 || forward.z>-.25)return false;
  const project=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z).project(camera);
  const head=project(122,36.3,-91.8),chest=project(122,27.3,-87.8);
  const left=project(114,24,-87),right=project(130,24,-87),foot=project(122,7.3,-84);
  const inside=(p:THREE.Vector3,x:number,y:number)=>p.z>-1&&p.z<1&&Math.abs(p.x)<x&&Math.abs(p.y)<y;
  return inside(head,.70,.92)&&inside(chest,.60,.85)&&Math.abs(right.x-left.x)>.85&&head.y-foot.y>1.35;
}

/** Once per physical entry; interrupted gaze must dwell again. Pausing passes dt=0. */
export function createBuddhaGaze() {
  let seen=false,dwell=0;
  return {
    update(inside:boolean,eligible:boolean,dt:number){
      if(!inside){seen=false;dwell=0;return false;}
      if(seen)return false;
      dwell=eligible?dwell+Math.max(0,dt):0;
      if(dwell<.65)return false;
      seen=true;return true;
    },
    inspect:()=>({seen,dwell}),
  };
}
