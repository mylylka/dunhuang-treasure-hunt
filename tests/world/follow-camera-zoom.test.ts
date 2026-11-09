import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { cameraZoomOffset, zoomFollowPose } from '../../src/world/follow-camera-zoom';
import { settleFollowCamera } from '../../src/world/camera';

describe('follow camera zoom', () => {
  const target = new Vector3(0, 1.8, 0);
  const pose = () => ({ target: target.clone(), position: new Vector3(0, 4.5, 8.5) });

  it('changes distance without changing the orbit direction or follow target', () => {
    const original = pose(), closer = zoomFollowPose(original, -3), farther = zoomFollowPose(original, 4);
    expect(closer.position.distanceTo(target)).toBeCloseTo(original.position.distanceTo(target) - 3);
    expect(farther.position.distanceTo(target)).toBeCloseTo(original.position.distanceTo(target) + 4);
    expect(closer.target.equals(target)).toBe(true);
    expect(closer.position.clone().sub(target).normalize().distanceTo(original.position.clone().sub(target).normalize())).toBeLessThan(1e-8);
    expect(original.position.equals(new Vector3(0, 4.5, 8.5))).toBe(true);
  });

  it('limits extreme scroll input and ignores invalid deltas', () => {
    expect(cameraZoomOffset(0, 100)).toBe(10);
    expect(cameraZoomOffset(0, -100)).toBe(-4);
    expect(cameraZoomOffset(2, NaN)).toBe(2);
    expect(zoomFollowPose(pose(), -100).position.distanceTo(target)).toBeCloseTo(2.2);
    expect(zoomFollowPose(pose(), 100).position.distanceTo(target)).toBeCloseTo(18);
  });

  it('still shortens a zoomed arm at an intervening wall', () => {
    const desired = zoomFollowPose(pose(), 8);
    const wall = new Box3(new Vector3(-2, 0, 5), new Vector3(2, 8, 5.5));
    const safe = settleFollowCamera(target, desired.position, desired.position, { boxes:[wall], cylinders:[] });
    expect(safe.z).toBeLessThan(5);
    expect(wall.containsPoint(safe)).toBe(false);
  });
});
