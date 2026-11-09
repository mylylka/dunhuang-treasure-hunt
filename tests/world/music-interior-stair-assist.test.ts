import { describe, expect, it } from 'vitest';
import { musicInteriorHeight, musicInteriorMove, musicInteriorToWorld, musicInteriorValid, type MusicInteriorWalkState } from '../../src/world/music-interior-navigation';
import { advanceMusicInteriorStairAssistFrame, getMusicInteriorStairOptions, startMusicInteriorStairAssist, type MusicInteriorStairAssistState } from '../../src/world/music-interior-stair-assist';
const state = (x: number, z: number, surfaceId: string): MusicInteriorWalkState => { const p = musicInteriorToWorld({ x, z }); return { position: { x: p.x, z: p.z }, surfaceId }; };

describe('music interior stoppable stair assistance', () => {
  it('offers assistance at the real stair endpoints and on the stair, not from the porch', () => {
    expect(getMusicInteriorStairOptions(state(39.5, -19.4, 'music-floor-1')).up.available).toBe(false);
    expect(getMusicInteriorStairOptions(state(56.8, -30.225, 'music-floor-1')).up.available).toBe(true);
    expect(getMusicInteriorStairOptions(state(44.8, -30.225, 'music-floor-2')).down.available).toBe(true);
    const options = getMusicInteriorStairOptions(state(51, -30.225, 'music-stair'));
    expect(options.up.available).toBe(true); expect(options.down.available).toBe(true);
  });

  it('moves continuously up and down to the next floor using the injected actor-aware resolver', () => {
    let current = state(56.8, -30.225, 'music-floor-1'), calls = 0;
    for (const direction of ['up', 'down'] as const) {
      let assist: MusicInteriorStairAssistState | null = startMusicInteriorStairAssist(current, direction);
      expect(assist).not.toBeNull();
      for (let frame = 0; frame < 500 && assist; frame++) {
        const before = current;
        const result = advanceMusicInteriorStairAssistFrame(assist, current, 1 / 30, 3.2, (walk, delta) => { calls++; return musicInteriorMove(walk, delta); });
        expect(result.blocked).toBe(false); expect(musicInteriorValid(result.walk)).toBe(true);
        expect(Math.hypot(result.walk.position.x - before.position.x, result.walk.position.z - before.position.z)).toBeLessThanOrEqual(3.2 / 30 + 1e-5);
        current = result.walk; assist = result.assist;
      }
      expect(assist).toBeNull();
      expect(current.surfaceId).toBe(direction === 'up' ? 'music-floor-2' : 'music-floor-1');
      expect(musicInteriorHeight(current)).toBeCloseTo(direction === 'up' ? 10.415375 : 4.3);
    }
    expect(calls).toBeGreaterThan(100);
  });

  it('cancels a blocked injected move without bypassing the other actor or teleporting', () => {
    const current = state(56.8, -30.225, 'music-floor-1');
    let assist = startMusicInteriorStairAssist(current, 'up')!;
    let blocked = false;
    for (let i = 0; i < 20; i++) {
      const result = advanceMusicInteriorStairAssistFrame(assist, current, .05, 3.2, walk => walk);
      expect(result.walk.position).toEqual(current.position);
      if (!result.assist) { blocked = result.blocked; break; }
      assist = result.assist;
    }
    expect(blocked).toBe(true);
    const restart = startMusicInteriorStairAssist(current, 'up');
    expect(restart?.nextWaypoint).toBe(0); expect(restart?.stalledSeconds).toBe(0);
  });
});
