import {describe,expect,it} from 'vitest';
import {createMusicEncounters} from '../../src/world/music-encounters';
import {musicSpatialGain} from '../../src/world/music-arrival-audio';
import {terrainCanHearMusic, terrainMusicSpatial} from '../../src/world/terrain-events-v001';
import {fromTerrainPoint,toTerrainPoint,TERRAIN_ROUTES} from '../../src/content/world/terrain-layout-v001';
const initial={x:-10,z:40},options={useAudiblePlayback:true,hearingDuration:2.5};
describe('terrain v003 heard-music anticipation',()=>{
  it('rejects stale playback at the First Gallery and waits for fresh audible time on the accepted route', () => {
    const easel = fromTerrainPoint('music', toTerrainPoint('courtyard', { x: -6.5, z: -3.9 }));
    const route = TERRAIN_ROUTES[0].points.map(point => fromTerrainPoint('music', point));
    const uphill = route.find(terrainCanHearMusic)!;
    const e = createMusicEncounters(easel, true, terrainCanHearMusic, options);
    expect(terrainCanHearMusic(easel)).toBe(false);
    e.update(easel, .016, false, { audible: true, audibleTime: 12 });
    expect(e.state).toBeNull();
    e.update(uphill, .016, false, { audible: true, audibleTime: 14.49 });
    expect(e.state).toBeNull();
    e.update(uphill, .016, false, { audible: true, audibleTime: 14.50 });
    expect(e.state?.id).toBe('music');
  });
  it('asks only after 2.5 audible playback seconds, never after a long silent game-time delay',()=>{
    const e=createMusicEncounters(initial,true,undefined,options);
    e.update(initial,100,true);expect(e.state).toBeNull();expect(e.musicHeard).toBe(false);
    e.update(initial,100,true,{audible:false,audibleTime:0});expect(e.state).toBeNull();
    e.update(initial,.01,true,{audible:true,audibleTime:1.4});expect(e.state).toBeNull();
    e.update(initial,100,true,{audible:false,audibleTime:1.4});expect(e.state).toBeNull();
    e.update(initial,.01,true,{audible:true,audibleTime:2.49});expect(e.state).toBeNull();
    e.update(initial,.01,true,{audible:true,audibleTime:2.5});expect(e.state?.id).toBe('music');
    expect(e.state?.text).toBe('哪里来的音乐声？');expect(e.musicHeard).toBe(true);
    e.skip();e.update(initial,100,true,{audible:true,audibleTime:50});expect(e.state).toBeNull();
  });
  it('resets the visit baseline without mistaking earlier audible playback for a new visit',()=>{
    const e=createMusicEncounters(initial,true,undefined,options);
    e.update(initial,0,true,{audible:true,audibleTime:2.5});expect(e.state?.id).toBe('music');
    e.reset();e.update(initial,100,true,{audible:true,audibleTime:2.5});expect(e.state).toBeNull();
    e.update(initial,0,true,{audible:true,audibleTime:4.99});expect(e.state).toBeNull();
    e.update(initial,0,true,{audible:true,audibleTime:5});expect(e.state?.id).toBe('music');
  });
  it('uses the heard playback time once the linked courtyard is visible', () => {
    let courtyardReady = false;
    const encounter = createMusicEncounters(initial, true, undefined, { ...options, musicAvailable: () => courtyardReady });
    encounter.update(initial, .016, true, { audible: true, audibleTime: 3 });
    expect(encounter.state).toBeNull();
    expect(encounter.musicHeard).toBe(false);
    courtyardReady = true;
    encounter.update(initial, .016, true, { audible: true, audibleTime: 3.016 });
    expect(encounter.state?.id).toBe('music');
  });
  it('restores an explicitly heard state and keeps mural admiration independent from the approach line',()=>{
    const e=createMusicEncounters(initial,true,undefined,{...options,musicAlreadyHeard:true});
    e.update(initial,0,true,{audible:true,audibleTime:100});expect(e.state).toBeNull();
    const mural={x:52.35,z:-11.9};e.update(mural,0,true,{audible:false,audibleTime:100});expect(e.state?.id).toBe('mural');
    e.skip();expect(e.muralReady).toBe(true);e.update(mural,0,true,{audible:true,audibleTime:103});expect(e.state).toBeNull();
  });
  it('keeps the courtyard quiet, starts softly during the uphill, and becomes much stronger at the music gate',()=>{
    for(const z of [-20,-8,2,6.8]){
      const p=fromTerrainPoint('music',toTerrainPoint('courtyard',{x:-12,z}));
      expect(musicSpatialGain(p,terrainMusicSpatial)).toBe(0);
    }
    const route=TERRAIN_ROUTES[0].points;
    const at=(fraction:number)=>musicSpatialGain(fromTerrainPoint('music',route[Math.floor((route.length-1)*fraction)]),terrainMusicSpatial)*.4;
    const early=at(.2),near=at(1);
    expect(early).toBeGreaterThan(.0025);expect(early).toBeLessThan(.03);
    expect(near).toBeGreaterThan(early*8);expect(near).toBeGreaterThan(.25);
  });
});
