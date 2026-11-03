import {fromTerrainPoint, lakeSignedDistance, TERRAIN_ROUTES} from '../content/world/terrain-layout-v001';
import type {WorldPoint} from './types';

/** Distance to the paved edge, measured over every segment, including bends. */
export function terrainRoadClearance(p:WorldPoint) {
  let clearance=Infinity;
  for(const route of TERRAIN_ROUTES)for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));
    clearance=Math.min(clearance,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)-route.width/2);
  }
  return clearance;
}
function outsideRect(p:WorldPoint,r:number,minX:number,maxX:number,minZ:number,maxZ:number){
  return Math.hypot(Math.max(minX-p.x,p.x-maxX,0),Math.max(minZ-p.z,p.z-maxZ,0))>r;
}
export function terrainPlantFits(p:WorldPoint,radius:number){
  const margin=radius+1.1;
  if(terrainRoadClearance(p)<margin||lakeSignedDistance(p.x,p.z)<margin)return false;
  // Outdoor vegetation cannot intrude into either courtyard, the tower steps,
  // landing or rock body. The radius is the actual scaled model footprint.
  const courtyard=fromTerrainPoint('courtyard',p),music=fromTerrainPoint('music',p),cliff=fromTerrainPoint('cliff',p);
  return outsideRect(courtyard,margin,-24.8,.8,-27,3)
    &&outsideRect(music,margin,23.4,70.6,-29.4,3.5)
    &&outsideRect(cliff,margin,105,139,-108,-38.7);
}
/** Move the same model to the nearest clear patch; never hide or shrink it. */
export function clearTerrainPlant(p:WorldPoint,radius:number):WorldPoint{
  if(terrainPlantFits(p,radius))return p;
  for(let distance=.5;distance<=48;distance+=.5){
    const count=Math.max(24,Math.ceil(Math.PI*2*distance/.5));
    for(let i=0;i<count;i++){
      const angle=i*Math.PI*2/count,candidate={x:p.x+Math.sin(angle)*distance,z:p.z+Math.cos(angle)*distance};
      if(terrainPlantFits(candidate,radius))return candidate;
    }
  }
  throw new Error('No clear terrain planting position');
}
