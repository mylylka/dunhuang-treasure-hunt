import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { terrainCameraSpace, terrainFollowPose, terrainLocalCamera, terrainPose } from '../../src/world/terrain-camera-v001';
import { TERRAIN_ROUTES, fromTerrainPoint, terrainSurfaceHeight, toTerrainPoint } from '../../src/world/terrain-rules-v001';
import { terrainCanHearMusic, terrainMusicSpatial } from '../../src/world/terrain-events-v001';
import { createMusicEncounters } from '../../src/world/music-encounters';
import { MUSIC_LAYOUT_V4 } from '../../src/world/music-pavilion-rules-v004';
import { musicSpatialGain } from '../../src/world/music-arrival-audio';
import { buddhaDominatesView } from '../../src/world/buddha-gaze';

describe('terrain camera and cultural approach',()=>{
  const space=terrainCameraSpace();
  it('retired dune geometry cannot collapse the camera beside either courtyard',()=>{
    for(const [x,z] of [[26,0],[26,2],[25,4],[158,25]]) {
      const pose=terrainFollowPose(x,terrainSurfaceHeight({x,z}),z,0,space);
      expect(pose.position.distanceTo(pose.target),`${x},${z}`).toBeGreaterThan(3);
    }
  });
  it('the follow eye stays above the real surface through the full graded route',()=>{
    for(const route of TERRAIN_ROUTES) for(let i=1;i<route.points.length;i+=7){
      const p=route.points[i],before=route.points[i-1];
      const yaw=Math.atan2(-(p.x-before.x),-(p.z-before.z));
      const pose=terrainFollowPose(p.x,terrainSurfaceHeight(p),p.z,yaw,space);
      expect(pose.position.y-terrainSurfaceHeight(pose.position),`${route.id}:${i}`).toBeGreaterThanOrEqual(.20);
    }
  });
  it('keeps the projected Buddha rule after the cliff rotation',()=>{
    const camera=new THREE.PerspectiveCamera(49,1.6,.1,1400);
    const original={position:new THREE.Vector3(122,9.38,-74),target:new THREE.Vector3(122,30,-91)};
    camera.position.copy(original.position);camera.lookAt(original.target);camera.updateMatrixWorld(true);
    const before=buddhaDominatesView(camera),moved=terrainPose('cliff',original);
    camera.position.copy(moved.position);camera.lookAt(moved.target);camera.updateMatrixWorld(true);
    expect(buddhaDominatesView(terrainLocalCamera(camera,'cliff'))).toBe(before);
  });
  it('hears the uphill music once after actual playback evidence, inside the new audible area',()=>{
    const path=TERRAIN_ROUTES[0].points;
    const encounter=createMusicEncounters(fromTerrainPoint('music',path[0]),true,terrainCanHearMusic,{useAudiblePlayback:true,hearingDuration:2.5});
    let count=0,previous:string|undefined,heardAt:typeof path[number]|undefined;
    let audibleTime=0;
    for(const p of path){
      const local=fromTerrainPoint('music',p),heard=encounter.musicHeard;
      const audible=terrainCanHearMusic(local);if(audible)audibleTime+=.4;
      encounter.update(local,.4,true,{audible,audibleTime});
      if(!heard&&encounter.musicHeard)heardAt=p;
      const id=encounter.state?.id;
      if(id==='music'&&previous!=='music')count++;
      previous=id;
    }
    expect(count).toBe(1);
    expect(heardAt).toBeDefined();
    expect(musicSpatialGain(fromTerrainPoint('music',heardAt!),terrainMusicSpatial)).toBeGreaterThan(0);
    const gate=toTerrainPoint('music',{x:40.2,z:3});
    expect(Math.hypot(heardAt!.x-gate.x,heardAt!.z-gate.z)).toBeGreaterThan(15);
  });
});
