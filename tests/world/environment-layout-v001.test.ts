import {describe,it,expect} from 'vitest';
import {environmentVisualHeight,environmentSampleAxes,environmentSurfaceHeight,ENVIRONMENT_ROCKS,ENVIRONMENT_CAMERA_BUFFER} from '../../src/content/world/environment-layout-v001';
import {terrainHeight,TERRAIN_BOUNDS,TERRAIN_ROUTES} from '../../src/content/world/terrain-layout-v001';

describe('accepted playable terrain during environment integration',()=>{
  it('preserves all route sample heights and the existing boundary/pad coordinates',()=>{
    for(const route of TERRAIN_ROUTES)for(const p of route.points)expect(environmentVisualHeight(p.x,p.z)).toBe(terrainHeight(p.x,p.z));
    const b=TERRAIN_BOUNDS;
    for(const x of [b.minX,0,110,136,185,330,b.maxX])for(const z of [b.minZ,12,15,90,b.maxZ])expect(environmentVisualHeight(x,z)).toBe(terrainHeight(x,z));
  });
  it('retains the old 2m interior grid and uses matching barycentric surface heights',()=>{
    const {xs,zs}=environmentSampleAxes(),b=TERRAIN_BOUNDS;
    const count=Math.ceil((b.maxX-b.minX)/2);
    expect(xs.filter(x=>x>=b.minX&&x<=b.maxX)).toEqual(Array.from({length:count+1},(_,i)=>b.minX+(b.maxX-b.minX)*i/count));
    const i=xs.findIndex(x=>x>b.maxX+45),j=zs.findIndex(z=>z>b.maxZ+45);
    const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;
    expect(environmentSurfaceHeight(x,z)).toBeCloseTo((environmentVisualHeight(xs[i],zs[j+1])+environmentVisualHeight(xs[i+1],zs[j]))/2-.025,7);
  });
  it('places rock centers beyond the playable boundary plus their design radius and camera margin',()=>{
    const b=TERRAIN_BOUNDS;
    for(const rock of ENVIRONMENT_ROCKS){
      const clearance=Math.hypot(Math.max(b.minX-rock.x,rock.x-b.maxX,0),Math.max(b.minZ-rock.z,rock.z-b.maxZ,0));
      expect(clearance).toBeGreaterThan(Math.min(rock.radiusX,rock.radiusZ)+ENVIRONMENT_CAMERA_BUFFER);
    }
  });
});
