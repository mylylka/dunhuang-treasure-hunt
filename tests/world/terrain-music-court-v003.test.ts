import {describe,expect,it} from 'vitest';
import {isTerrainWalkable,toTerrainPoint,TERRAIN_PLAYER_COLLIDERS} from '../../src/world/terrain-rules-v001';

describe('music courtyard tree and relocated furnishings',()=>{
  it('keeps the full door approach and route to the mural open',()=>{
    for(let z=8;z>=-11.5;z-=.5)for(const x of [39.3,40.2,41.1])
      expect(isTerrainWalkable(toTerrainPoint('music',{x,z})),`door approach ${x},${z}`).toBe(true);
  });
  it('clears the old left furniture spot and blocks the new seating position',()=>{
    expect(isTerrainWalkable(toTerrainPoint('music',{x:26.4,z:-21}))).toBe(true);
    expect(isTerrainWalkable(toTerrainPoint('music',{x:31.4,z:.55}))).toBe(false);
  });
  it('protects the actual tree base while leaving the main hall access open',()=>{
    expect(isTerrainWalkable(toTerrainPoint('music',{x:31.3,z:-8.5}))).toBe(false);
    expect(TERRAIN_PLAYER_COLLIDERS.some(s=>s.id==='terrain-music-music-courtyard-tree')).toBe(true);
    expect(isTerrainWalkable(toTerrainPoint('music',{x:40.2,z:-16}))).toBe(true);
  });
});
