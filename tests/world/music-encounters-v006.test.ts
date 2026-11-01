import {describe,it,expect} from 'vitest';
import {createMusicEncounters,nearMuralSteps} from '../../src/world/music-encounters';
import {discoveryReducer,discoveryView,initialDiscoveryState} from '../../src/world/events';
describe('revised anticipation',()=>{
 it('lets the player continue for two seconds after the music begins, then pauses at their current point',()=>{
  const d=createMusicEncounters({x:0,z:12},true);d.update({x:2.51,z:12},.05,false);
  expect(d.musicHeard).toBe(true);expect(d.state).toBeNull();
  d.update({x:5.9,z:12.5},1.99,false);expect(d.state).toBeNull();
  d.update({x:6,z:12.5},.01,false);expect(d.state?.id).toBe('music');
  d.skip();d.update({x:7,z:13},5,true);expect(d.state).toBeNull();
 });
 it.each([46,52.35,59.3])('at stair x=%s admiration and awakening share the same footprint',x=>{
  const p={x,z:-10.8},d=createMusicEncounters(p,true);expect(nearMuralSteps(p)).toBe(true);
  d.update(p,0,false);expect(d.state?.id).toBe('mural');expect(d.muralReady).toBe(false);
  d.update(p,1.4,true);expect(d.state).toBeNull();expect(d.muralReady).toBe(true);expect(nearMuralSteps(p)).toBe(true);
 });
 it('excludes the rear wall and distant court from the trigger',()=>{
  expect(nearMuralSteps({x:52,z:-20})).toBe(false);expect(nearMuralSteps({x:52,z:0})).toBe(false);
 });
 it.each(['caisson','flying','story-demo'] as const)('%s completes into a modal choice while retaining the observation view',id=>{
  let s=discoveryReducer(initialDiscoveryState,{type:'start',id,nearby:id});const view=discoveryView(s);
  s=discoveryReducer(s,{type:'complete'});expect(s).toEqual({mode:'choosing',id});expect(discoveryView(s)).toBe(view);
  expect(discoveryReducer(s,{type:'resume'})).toEqual(s);expect(discoveryReducer(s,{type:'exit'})).toEqual(initialDiscoveryState);
 });
});
