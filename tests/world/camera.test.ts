import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { caissonCameraPose, clearCameraPosition, followCameraPose } from '../../src/world/camera';

describe('world camera obstruction', () => {
  it('shortens the follow arm before passing through a courtyard wall', () => {
    const target = new Vector3(-20, 1.5, -8);
    const position = clearCameraPosition(target, new Vector3(-26, 4, -8));
    expect(position.x).toBeGreaterThan(-21.52);
    expect(position.distanceTo(target)).toBeLessThan(2);
  });
  it('keeps the default hall camera below the upper floor', () => {
    const pose = followCameraPose(-12, .28, -18, 0);
    expect(pose.position.y).toBeLessThan(5.25);
    expect(pose.position.z).toBeGreaterThan(-18);
  });
  it('looks upward at the gray caisson from inside the ground-floor hall', () => {
    const pose = caissonCameraPose();
    expect(pose.position.y).toBeLessThan(2);
    expect(pose.target.y).toBeGreaterThan(pose.position.y + 3);
    expect(pose.position.x).toBe(-12);
  });
  it.each([1.6, 844 / 390])('fits every caisson corner above the observation controls at aspect %s', aspect => {
    const pose = caissonCameraPose();
    const camera = new PerspectiveCamera(49, aspect, .1, 150);
    camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
    for (const x of [-15.475, -8.525]) for (const z of [-21.475, -14.525]) {
      const ndc = new Vector3(x, 5.14, z).project(camera);
      expect(Math.abs(ndc.x)).toBeLessThan(.95);
      expect(ndc.y).toBeLessThan(.95);
      expect(ndc.y).toBeGreaterThan(-.4);
    }
  });
});
