import { AnimationClip, VectorKeyframeTrack } from 'three';
import { describe, expect, it } from 'vitest';
import { caissonTravelerClips } from '../../src/world/caisson-traveler';

function clip(name: string, start: [number, number, number], end: [number, number, number]) {
  return new AnimationClip(name, 1, [new VectorKeyframeTrack('mixamorigHips.position', [0, 1], [...start, ...end])]);
}

describe('standalone first-gallery traveler clips', () => {
  it('uses the supplied clips while removing duplicated forward travel', () => {
    const input = [clip('standing_relax.001', [0, 0.5, 0.03], [0, 0.5, 0.03]),
      clip('walk.001', [0.01, 0.5, 0.03], [0.02, 0.52, 1.52]),
      clip('run.001', [-0.03, 0.45, 0.56], [-0.02, 0.48, 3.47]),
      clip('look_around.001', [0, 0.5, 0.03], [0, 0.5, 0.03])];
    const output = caissonTravelerClips(input);
    expect(output.map(item => item.name)).toEqual(['Idle', 'Walk', 'Run', 'LookAround', 'Greeting', 'HallLookUp']);
    for (const name of ['Walk', 'Run']) {
      const values = output.find(item => item.name === name)!.tracks[0].values;
      expect(values[0]).toBeCloseTo(0);
      expect(values[2]).toBeCloseTo(0.03);
      expect(values[5]).toBeCloseTo(0.03);
      expect(values[4]).not.toBeCloseTo(values[1]);
    }
    expect(input[2].tracks[0].values[5]).toBeCloseTo(3.47);
  });

  it('rejects incomplete supplied clips', () => {
    expect(() => caissonTravelerClips([])).toThrow('caisson-traveler-idle-hips-missing');
  });
});
