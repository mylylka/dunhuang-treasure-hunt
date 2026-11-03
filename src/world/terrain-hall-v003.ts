import geometry from '../content/world/courtyard-hall-v006.json';
import type {WorldCollider} from './movement';
import type {WorldPoint} from './types';

interface HallRectangle {minX:number;maxX:number;minZ:number;maxZ:number}
interface HallGeometry {
  version:string;
  hall:HallRectangle;
  floor:HallRectangle & {height:number};
  ramps:(HallRectangle & {id:string;axis:'x'|'z';heightAtMin:number;heightAtMax:number})[];
  playerSolids:(WorldCollider & {id:string})[];
  cameraBoxes:{id:string;min:number[];max:number[]}[];
  retiredCameraIds?:string[];
}
/** Exported together with the actual Blender model, in the old courtyard frame. */
export const TERRAIN_HALL_GEOMETRY=geometry as HallGeometry;
export const TERRAIN_HALL_PLAYER_SOLIDS:readonly WorldCollider[]=TERRAIN_HALL_GEOMETRY.playerSolids;
export const TERRAIN_HALL_CAMERA_BOXES=TERRAIN_HALL_GEOMETRY.cameraBoxes;
const contains=(p:WorldPoint,box:HallRectangle)=>p.x>=box.minX&&p.x<=box.maxX&&p.z>=box.minZ&&p.z<=box.maxZ;

/** A continuous proxy over the real low platform and its three exit ramps. */
export function courtyardHallSurfaceHeight(p:WorldPoint):number {
  const floor=TERRAIN_HALL_GEOMETRY.floor;
  if(contains(p,floor))return floor.height;
  let height=0;
  for(const ramp of TERRAIN_HALL_GEOMETRY.ramps){
    if(!contains(p,ramp))continue;
    const min=ramp.axis==='x'?ramp.minX:ramp.minZ,max=ramp.axis==='x'?ramp.maxX:ramp.maxZ;
    const t=(p[ramp.axis]-min)/(max-min);
    height=Math.max(height,ramp.heightAtMin+(ramp.heightAtMax-ramp.heightAtMin)*t);
  }
  return height;
}

/** The original anonymous graybox proxies must not survive the new GLB.
 * Perimeter/gate and real scenery are retained; new geometry has stable IDs.
 */
export function retiredCourtyardHallCollider(collider:WorldCollider):boolean {
  if(collider.circle||collider.id)return false;
  const x=(collider.minX+collider.maxX)/2,z=(collider.minZ+collider.maxZ)/2;
  const near=(a:number,b:number)=>Math.abs(a-b)<1e-7;
  const hall=near(collider.height,5.4)&&collider.minX>=-20.81&&collider.maxX<=-3.19&&collider.maxZ<=-12.99;
  const rearWall=near(x,-12)&&near(z,-24)&&near(collider.height,4.5);
  const workshop=near(x,-18)&&near(z,-7.5)&&near(collider.height,1.1);
  const absentStoryStand=near(x,-4.4)&&near(z,-7.8)&&near(collider.height,2.7);
  return hall||rearWall||workshop||absentStoryStand;
}

export function retiredCourtyardHallCameraBox(id:string):boolean {
  return /^(hall-|upper-|window-|hall-window-|crossbeam-teal-inlay|courtyard-rear-wall|caisson-)/.test(id)
    || Boolean(TERRAIN_HALL_GEOMETRY.retiredCameraIds?.includes(id));
}
