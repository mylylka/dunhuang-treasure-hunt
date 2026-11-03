import {describe,expect,it} from 'vitest';
import {clearTerrainPlant,terrainPlantFits,terrainRoadClearance} from '../../src/world/terrain-planting-v003';
import {toTerrainPoint,TERRAIN_ROUTES} from '../../src/content/world/terrain-layout-v001';

describe('terrain outdoor vegetation clearance',()=>{
  it('moves full shrub footprints off both shortened routes without changing size',()=>{
    for(const route of TERRAIN_ROUTES)for(let i=0;i<route.points.length;i+=17){
      const p=route.points[i],radius=1.5,target=clearTerrainPlant(p,radius);
      expect(terrainRoadClearance(target)).toBeGreaterThanOrEqual(radius+1.1);
      expect(terrainPlantFits(target,radius)).toBe(true);
      expect(Math.hypot(target.x-p.x,target.z-p.z)).toBeLessThan(18);
    }
  });
  it('clears the tower stair corners and the existing courtyard floors',()=>{
    for(const [region,x,z] of [['cliff',116.9,-39],['cliff',127,-47],['music',46,-5],['courtyard',-12,0]] as const){
      const p=toTerrainPoint(region,{x,z}),target=clearTerrainPlant(p,1.2);
      expect(terrainPlantFits(p,1.2)).toBe(false);
      expect(terrainPlantFits(target,1.2)).toBe(true);
    }
  });
  it('preserves a clear original planting position',()=>{
    const p={x:270,z:110};expect(clearTerrainPlant(p,.8)).toBe(p);
  });
});
