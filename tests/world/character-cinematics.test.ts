import { describe, expect, it } from 'vitest';
import { createCinematicDirector, characterCameraPose, openingDistance, openingHeading, loadCinematicSeen, saveCinematicSeen } from '../../src/world/character-cinematics';
import { clearCameraPosition, followCameraPose } from '../../src/world/camera';

const fresh = () => createCinematicDirector({ opening: false, hall: false }, () => {});
describe('brief character presentations preserve player agency', () => {
  it('opens once, never reopens after interruption or returning to spawn', () => {
    const d = fresh(); d.opening(true, false); expect(d.state?.id).toBe('opening');
    d.skip(); d.opening(true, false); expect(d.state).toBeNull(); expect(d.seen.opening).toBe(true);
  });
  it.each([[false, false, false], [true, true, false], [true, false, true]])('skips opening on restored position, reduced motion or early input (%s,%s,%s)', (eligible, reduced, intent) => {
    const d = fresh(); d.opening(eligible, reduced, intent); expect(d.state).toBeNull(); expect(d.seen.opening).toBe(true);
  });
  it('does not stop the player on hall entry; waits for stillness in the trigger', () => {
    const d = fresh();
    for (let i = 0; i < 40; i++) d.update(.05, true, true, false, true);
    expect(d.state).toBeNull();
    for (let i = 0; i < 6; i++) d.update(.05, true, false, false, true);
    expect(d.state).toBeNull(); d.update(.05, true, false, false, true); expect(d.state?.id).toBe('hall');
    d.update(.02, true, true, false, true); expect(d.state).toBeNull();
    d.update(2, true, false, false, true); expect(d.state).toBeNull();
  });
  it('does not re-present a hall after the player goes directly to observation', () => {
    const d = fresh(); d.skipHall(); d.update(1, true, false, false, true); expect(d.state).toBeNull(); expect(d.seen.hall).toBe(true);
  });
  it('skips unsafe close shots and reduced motion instead of collapsing into the face', () => {
    const a = fresh(); a.update(.5, true, false, false, false); expect(a.state).toBeNull(); expect(a.seen.hall).toBe(true);
    const b = fresh(); b.update(.5, true, false, true, true); expect(b.state).toBeNull(); expect(b.seen.hall).toBe(true);
  });
  it('keeps the authored step bounded regardless of frame subdivision', () => {
    let step = 0;
    for (let i = 1; i <= 400; i++) step += openingDistance(i / 100) - openingDistance((i - 1) / 100);
    expect(step).toBeCloseTo(.3); expect(openingHeading(0)).toBe(Math.PI); expect(openingHeading(2.2)).toBe(0);
  });
  it('has finite, unobstructed camera poses throughout the opening and ends at the follow pose', () => {
    for (let t = 0; t <= 2.21; t += .02) {
      const p = { x: 0, z: 18 - openingDistance(t) }, pose = characterCameraPose('opening', t, p, 0, 0, 0)!;
      expect(pose).toBeTruthy(); expect(pose.position.distanceTo(clearCameraPosition(pose.target, pose.position))).toBeLessThan(1e-6);
    }
    const pose = characterCameraPose('opening', 2.2, { x: 0, z: 17.7 }, 0, 0, 0)!;
    expect(pose.position.distanceTo(followCameraPose(0, 0, 17.7, 0).position)).toBeLessThan(1e-6);
  });
  it('checks both front-quarter alternatives for multiple hall positions and headings', () => {
    let safe = 0;
    for (const x of [-14, -12, -10]) for (const z of [-19, -17, -15]) for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const pose = characterCameraPose('hall', 1.5, { x, z }, .28, heading, 0);
      if (pose) { safe++; expect(pose.position.distanceTo(clearCameraPosition(pose.target, pose.position))).toBeLessThan(.001); expect(pose.position.distanceTo(pose.target)).toBeGreaterThan(2.1); }
    }
    expect(safe).toBeGreaterThan(20);
    expect(characterCameraPose('hall', 1, { x: -20.5, z: -18.5 }, .28, 0, 0)).toBeNull();
  });
  it('keeps presentation persistence isolated and tolerant of unavailable storage', () => {
    const writes: [string,string][] = [];
    saveCinematicSeen({ setItem: (k,v) => { writes.push([k,v]); } }, { opening: true, hall: false });
    expect(writes[0][0]).toBe('dunhuang:character-cinematics:v1');
    expect(loadCinematicSeen({ getItem: () => writes[0][1] })).toEqual({ opening: true, hall: false });
    expect(loadCinematicSeen({ getItem: () => { throw Error('blocked'); } })).toEqual({ opening: false, hall: false });
    expect(() => saveCinematicSeen({ setItem: () => { throw Error('blocked'); } }, { opening: true, hall: true })).not.toThrow();
  });
});
