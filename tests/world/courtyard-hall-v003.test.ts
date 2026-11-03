import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import exportedGeometry from '../../src/content/world/courtyard-hall-v006.json';
import {COURTYARD_CAMERA_BOXES,clearCameraPosition} from '../../src/world/camera';
import {WORLD_COLLIDERS} from '../../src/world/movement';
import {courtyardHallSurfaceHeight,retiredCourtyardHallCollider,TERRAIN_HALL_CAMERA_BOXES,TERRAIN_HALL_GEOMETRY,TERRAIN_HALL_PLAYER_SOLIDS} from '../../src/world/terrain-hall-v003';
import {TERRAIN_COURTYARD_CAMERA_BOXES,settleTerrainCamera,terrainCameraSpace,terrainFollowPose} from '../../src/world/terrain-camera-v001';
import {TERRAIN_COURTYARD_LOCAL_COLLIDERS,TERRAIN_REGIONS,fromTerrainPoint,isTerrainWalkable,moveTerrainPlayer,terrainSurfaceHeight,toTerrainPoint} from '../../src/world/terrain-rules-v001';

function walk(source:{x:number;z:number},target:{x:number;z:number},step:number){
  let p=toTerrainPoint('courtyard',source);
  const finish=toTerrainPoint('courtyard',target),length=Math.hypot(finish.x-p.x,finish.z-p.z),count=Math.ceil(length/step);
  const delta={x:(finish.x-p.x)/count,z:(finish.z-p.z)/count};
  for(let i=0;i<count;i++){
    const previous=p,next=moveTerrainPlayer(p,delta);
    expect(Math.hypot(next.x-previous.x-delta.x,next.z-previous.z-delta.z),`stopped at ${JSON.stringify(fromTerrainPoint('courtyard',p))}`).toBeLessThan(1e-6);
    expect(Math.abs(terrainSurfaceHeight(next)-terrainSurfaceHeight(previous))).toBeLessThan(step*.73+.035);
    p={...p,...next};
  }
  expect(p.x).toBeCloseTo(finish.x,6);expect(p.z).toBeCloseTo(finish.z,6);
}

describe('terrain-only 17m square hall geometry v003',()=>{
  it('uses the model-exported square, platform and connected ramps',()=>{
    const {hall,floor,ramps}=TERRAIN_HALL_GEOMETRY;
    expect(hall.maxX-hall.minX).toBe(17);expect(hall.maxZ-hall.minZ).toBe(17);
    expect(hall).toEqual({minX:-20.5,maxX:-3.5,minZ:-23.5,maxZ:-6.5});
    expect(floor.height).toBe(.28);
    expect(ramps.find(r=>r.axis==='z')?.maxZ).toBe(-4.8);
    expect(courtyardHallSurfaceHeight({x:-12,z:-8})).toBe(.28);
    expect(courtyardHallSurfaceHeight({x:-12,z:-5.65})).toBeCloseTo(.14,8);
    expect(courtyardHallSurfaceHeight({x:-21,z:-15})).toBeCloseTo(.14,8);
    expect(courtyardHallSurfaceHeight({x:-22,z:-15})).toBe(0);
  });

  it.each([.09,.35])('walks through the front and both left platform transitions with a %sm frame step',step=>{
    walk({x:-12,z:1},{x:-12,z:-21},step);
    walk({x:-12,z:-21},{x:-12,z:1},step);
    walk({x:-19,z:-15},{x:-22.5,z:-15},step);
    walk({x:-22.5,z:-15},{x:-19,z:-15},step);
  });

  it('removes retired walls, columns, the old workshop and absent story stand while preserving the expanded perimeter',()=>{
    const retired=WORLD_COLLIDERS.filter(retiredCourtyardHallCollider);
    expect(retired).toHaveLength(10);
    expect(TERRAIN_COURTYARD_LOCAL_COLLIDERS.every(collider=>!retired.includes(collider))).toBe(true);
    expect(TERRAIN_COURTYARD_LOCAL_COLLIDERS.some(c=>c.id==='hall-v003-workbench')).toBe(true);
    expect(isTerrainWalkable(toTerrainPoint('courtyard',{x:-19,z:-2.8}))).toBe(false);
    expect(isTerrainWalkable(toTerrainPoint('courtyard',{x:-18,z:-7.5}))).toBe(true);
    for(const p of [{x:-24,z:-8},{x:0,z:-8},{x:-12,z:-24}])expect(isTerrainWalkable(toTerrainPoint('courtyard',p))).toBe(false);
    for(const p of [{x:-22,z:-15},{x:-2,z:-15},{x:-12,z:1}])expect(isTerrainWalkable(toTerrainPoint('courtyard',p))).toBe(true);
  });

  it('uses stable new solids for actual walls/columns and keeps old game geometry untouched',()=>{
    for(const solid of TERRAIN_HALL_GEOMETRY.playerSolids){
      const center={x:(solid.minX+solid.maxX)/2,z:(solid.minZ+solid.maxZ)/2};
      expect(isTerrainWalkable(toTerrainPoint('courtyard',center)),solid.id).toBe(false);
    }
    // The old preview still has its original hall, workbench and ghost stand;
    // this replacement filters only the new terrain's derived arrays.
    expect(WORLD_COLLIDERS.some(c=>c.minZ===-9.3&&c.maxZ===-6.3)).toBe(true);
    expect(COURTYARD_CAMERA_BOXES.find(c=>c.id==='hall-ceiling')!.max[2]).toBe(-13);
  });

  it('replaces the old hall and hidden caisson proxies while preserving gate bounds and the original data',()=>{
    const originalCaissons=COURTYARD_CAMERA_BOXES.filter(c=>c.id.startsWith('caisson-'));
    expect(originalCaissons).toHaveLength(13);
    expect(originalCaissons.find(c=>c.id==='caisson-art-panel')).toEqual({id:'caisson-art-panel',min:[-15.35,4.78,-21.35],max:[-8.65,4.78,-14.65]});
    for(const source of COURTYARD_CAMERA_BOXES.filter(c=>/^(gate-|entrance-roof)/.test(c.id)))
      expect(TERRAIN_COURTYARD_CAMERA_BOXES.find(c=>c.id===source.id)).toEqual(source);
    for(const source of COURTYARD_CAMERA_BOXES.filter(c=>/^(hall-|upper-|courtyard-rear-wall|caisson-)/.test(c.id)))
      expect(TERRAIN_COURTYARD_CAMERA_BOXES.some(c=>c.id===source.id)).toBe(false);
    for(const box of TERRAIN_HALL_CAMERA_BOXES)expect(TERRAIN_COURTYARD_CAMERA_BOXES).toContain(box);
    expect(TERRAIN_HALL_CAMERA_BOXES.some(box=>box.min[2]<-6.4&&box.max[2]>-6.6&&box.min[1]>3)).toBe(true);
  });

  it('connects the workshop painting, pigment and reference positions while freeing the former east-side displays',()=>{
    expect(exportedGeometry.retiredCameraIds.length).toBeGreaterThan(0);
    for(const id of exportedGeometry.retiredCameraIds)
      expect(TERRAIN_COURTYARD_CAMERA_BOXES.some(box=>box.id===id),id).toBe(false);
    const rack=TERRAIN_HALL_PLAYER_SOLIDS.find(box=>box.id==='hall-v003-pigment-rack')!;
    expect(rack).toBeDefined();
    expect(rack.height).toBeCloseTo(1.5,5);
    const z=(rack.minZ+rack.maxZ)/2;
    expect(isTerrainWalkable(toTerrainPoint('courtyard',{x:(rack.minX+rack.maxX)/2,z}))).toBe(false);
    const workshop=exportedGeometry.workshop;
    for(const point of [workshop.paintPoint,workshop.takeColorPoint,workshop.referencePoint])
      expect(isTerrainWalkable(toTerrainPoint('courtyard',point)),JSON.stringify(point)).toBe(true);
    for(const route of [workshop.accessPath,workshop.takeColorPath,workshop.referencePath])
      for(let i=1;i<route.length;i++){
        walk(route[i-1],route[i],.09);walk(route[i],route[i-1],.35);
      }
    expect(rack.maxX).toBeLessThan(-20);
    expect(TERRAIN_HALL_PLAYER_SOLIDS.find(solid=>solid.id==='hall-v003-workbench')?.polygon).toHaveLength(4);
    expect(isTerrainWalkable(toTerrainPoint('courtyard',{x:-1.3,z:-2.5}))).toBe(true);
    expect(isTerrainWalkable(toTerrainPoint('courtyard',{x:-1.4,z:-4.55}))).toBe(true);
    walk({x:-2.75,z:-.8},{x:-2.75,z:-4.75},.15);
    walk({x:-2.75,z:-4.75},{x:-2.75,z:-.8},.15);
  });

  it('keeps the central hall open from the low platform to the high roof lining',()=>{
    // Actual exported bounds prove the floor/roof geometry is hollow. Camera
    // clearance padding belongs to movement, not this physical headroom check.
    const bounds=TERRAIN_COURTYARD_CAMERA_BOXES.map(box=>({id:box.id,bounds:new THREE.Box3(new THREE.Vector3(...box.min as [number,number,number]),new THREE.Vector3(...box.max as [number,number,number]))}));
    const floor=TERRAIN_HALL_GEOMETRY.floor.height,startY=floor+.3;
    for(const x of [-18,-15,-12,-9,-6])for(const z of [-21,-18,-15,-12,-9]){
      const start=new THREE.Vector3(x,startY,z),ray=new THREE.Ray(start,new THREE.Vector3(0,1,0));
      const hits=bounds.flatMap(box=>{const hit=box.bounds.containsPoint(start)?start:ray.intersectBox(box.bounds,new THREE.Vector3());return hit?[{id:box.id,y:hit.y}]:[];}).sort((a,b)=>a.y-b.y);
      expect(hits.filter(hit=>hit.y<=7.9),`low overhead geometry at ${x},${z}`).toEqual([]);
      // The solid upper lining remains above the atrium, with about 7.7m of
      // real headroom; deleting every overhead collider would not satisfy this.
      expect(hits[0],`missing roof lining at ${x},${z}`).toBeDefined();
      expect(hits[0].y-floor).toBeGreaterThanOrEqual(7.6);
      expect(hits[0].y-floor).toBeLessThanOrEqual(7.9);
    }
  });

  it('leaves real sight gaps through both rear windows instead of retaining an invisible wall across them',()=>{
    // The camera volume is deliberately wider than a lattice opening. Test
    // optical rays against actual unpadded bounds, not passage of that volume.
    const bounds=TERRAIN_COURTYARD_CAMERA_BOXES.map(box=>new THREE.Box3(new THREE.Vector3(...box.min as [number,number,number]),new THREE.Vector3(...box.max as [number,number,number])));
    for(const window of exportedGeometry.windows){
      let clear=0,total=0;
      for(let x=window.minX+.1;x<window.maxX-.1;x+=.125)for(let y=window.minY+.2;y<window.maxY-.2;y+=.125){
        const start=new THREE.Vector3(x,y,-22),ray=new THREE.Ray(start,new THREE.Vector3(0,0,-1)),hit=new THREE.Vector3();
        if(!bounds.some(box=>ray.intersectBox(box,hit)&&start.distanceTo(hit)<3))clear++;
        total++;
      }
      expect(clear/total).toBeGreaterThan(.2);
    }
  });

  it('keeps rendered follow cameras outside beams and roofs throughout the newly covered front half',()=>{
    const space=terrainCameraSpace();let checked=0;
    for(const x of [-18,-12,-6])for(const z of [-5.2,-6.8,-9.5,-14.5]){
      const p=toTerrainPoint('courtyard',{x,z});if(!isTerrainWalkable(p))continue;
      const y=terrainSurfaceHeight(p),subject=new THREE.Vector3(p.x,y+.65,p.z);
      for(const angle of [0,.65,1.3,Math.PI,-1.3]){
        const pose=terrainFollowPose(p.x,y,p.z,TERRAIN_REGIONS.courtyard.yaw+angle,space);
        for(const item of space.orientedBoxes??[])expect(item.bounds.containsPoint(pose.position.clone().applyMatrix4(item.inverse)),`${x},${z} yaw ${angle}`).toBe(false);
        expect(clearCameraPosition(subject,pose.position,space).distanceTo(pose.position)).toBeLessThan(.001);
        expect(pose.position.y).toBeGreaterThanOrEqual(terrainSurfaceHeight(pose.position)+.2);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(45);
  });

  it('rechecks the moving camera after easing through the new entrance and turning beneath its beams',()=>{
    const space=terrainCameraSpace();let eye:THREE.Vector3|undefined;
    for(let i=0;i<110;i++){
      const z=1-i*.14,p=toTerrainPoint('courtyard',{x:-12,z}),y=terrainSurfaceHeight(p);
      const yaw=TERRAIN_REGIONS.courtyard.yaw+.6*Math.sin(i*.07);
      const desired=terrainFollowPose(p.x,y,p.z,yaw,space),subject=new THREE.Vector3(p.x,y+.65,p.z);
      eye=settleTerrainCamera(desired.target,eye?eye.lerp(desired.position,1-Math.exp(-.5)):desired.position,desired.position,space,subject);
      for(const box of space.orientedBoxes??[])expect(box.bounds.containsPoint(eye.clone().applyMatrix4(box.inverse)),`frame ${i}`).toBe(false);
      expect(clearCameraPosition(subject,eye,space).distanceTo(eye)).toBeLessThan(.001);
    }
  });
});
