import { describe, expect, it } from 'vitest';
import { createMusicEncounters } from '../../src/world/music-encounters';
const before={x:1,z:12},gate={x:2.6,z:12.2},mural={x:52.35,z:-11.9};
describe('music courtyard anticipation',()=>{
  it('keeps the approach silent until the marked route, then stops for 2.8 seconds only once',()=>{
    const d=createMusicEncounters({x:-12,z:0});
    d.update(before,1,true);expect(d.musicHeard).toBe(false);expect(d.state).toBeNull();
    d.update(gate,.02,true);expect(d.musicHeard).toBe(true);expect(d.state?.id).toBe('music');
    d.update(gate,2.7,true);expect(d.state).not.toBeNull();
    d.update(gate,.11,true);expect(d.state).toBeNull();d.update(gate,.1,true);expect(d.state).toBeNull();
  });
  it('waits for speech to finish and permits an immediate explicit skip',()=>{
    const d=createMusicEncounters(before);d.update(gate,0,false);d.update(gate,2.81,false);expect(d.state).not.toBeNull();
    d.skip();expect(d.state).toBeNull();expect(d.musicHeard).toBe(true);
  });
  it('never leaves the traveler frozen waiting for a stalled audio request',()=>{
    const d=createMusicEncounters(before);d.update(gate,0,false);d.update(gate,3.01,false);expect(d.state).toBeNull();
  });
  it('gates awakening until admiration ends; repeats after each real exit, not after observing',()=>{
    const d=createMusicEncounters(mural);expect(d.muralReady).toBe(false);
    d.update(mural,0,true);expect(d.state?.id).toBe('mural');expect(d.muralReady).toBe(false);
    d.skip();expect(d.muralReady).toBe(true);d.update(mural,1,true);expect(d.state).toBeNull();
    d.update({x:40.2,z:3.4},.1,true);expect(d.muralReady).toBe(true);
    d.update({x:40.2,z:4},.1,true);expect(d.muralReady).toBe(false);
    d.update(mural,.1,true);expect(d.state?.id).toBe('mural');
  });
  it('does not strand a saved position beyond the music gate and resets on return to start',()=>{
    const d=createMusicEncounters(mural);expect(d.musicHeard).toBe(true);d.reset();expect(d.musicHeard).toBe(false);expect(d.muralReady).toBe(false);
  });
});
