import { describe, expect, it } from 'vitest';
import { CAMERA_YAW_LIMIT, clampCameraYaw, isWalkable, movePlayer, movementVector, sanitizePosition, surfaceHeight, WORLD_SPAWN } from '../../src/world/movement';

describe('world movement and safe anchors', () => {
  it('rejects corrupt or wall-embedded checkpoints', () => {
    expect(sanitizePosition({ x: Infinity, z: 0 })).toEqual(WORLD_SPAWN);
    expect(sanitizePosition({ x: -22, z: -10 })).toEqual(WORLD_SPAWN);
    expect(sanitizePosition({ x: -12, z: -13 })).toEqual({ x: -12, z: -13 });
  });
  it('allows the open gateway and hall route but blocks court walls', () => {
    for (let z = 4; z >= -22; z -= .2) expect(isWalkable({ x: -12, z })).toBe(true);
    expect(isWalkable({ x: -22, z: -6 })).toBe(false);
    expect(isWalkable({ x: -18.5, z: 2 })).toBe(false);
  });
  it('substeps through a long frame without tunneling across the wall', () => {
    const result = movePlayer({ x: -24, z: -9 }, { x: 8, z: 0 });
    expect(result.x).toBeLessThan(-22.6);
    expect(isWalkable(result)).toBe(true);
  });
  it('slides along walls instead of sticking both axes', () => {
    const result = movePlayer({ x: -21.3, z: -7 }, { x: -2, z: -2 });
    expect(result.x).toBeGreaterThan(-21.4);
    expect(result.z).toBeCloseTo(-9);
  });
  it('bounds diagonal speed and rotates movement with the camera', () => {
    expect(Math.hypot(...Object.values(movementVector(1, -1, 0)))).toBeCloseTo(1);
    expect(movementVector(0, -1, 0)).toEqual({ x: 0, z: -1 });
    expect(movementVector(0, -1, Math.PI / 2).x).toBeCloseTo(-1);
    expect(clampCameraYaw(999)).toBe(CAMERA_YAW_LIMIT);
  });
  it('has a continuous ramp, not impassable stair colliders', () => {
    expect(surfaceHeight({ x: -12, z: -12.3 })).toBe(0);
    expect(surfaceHeight({ x: -12, z: -12.9 })).toBeCloseTo(.14);
    expect(surfaceHeight({ x: -12, z: -14 })).toBe(.28);
  });
});
