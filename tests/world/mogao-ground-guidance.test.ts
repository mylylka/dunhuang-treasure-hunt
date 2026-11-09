import { describe, expect, it } from 'vitest';
import { TERRAIN_REGIONS } from '../../src/content/world/terrain-layout-v001';
import { createMogaoGroundGuidance } from '../../src/world/mogao-ground-guidance';
import { moveUpperPlayer, upperToWorld, type UpperWalkState } from '../../src/world/mogao-upper-navigation';

const facing = TERRAIN_REGIONS.cliff.yaw;
const at = (z: number, surfaceId: string | null): UpperWalkState => ({ position: upperToWorld({ x: 0, z }), surfaceId });

function walk(prompt: ReturnType<typeof createMogaoGroundGuidance>, from: UpperWalkState, z: number) {
  const { x, z: targetZ } = at(z, null).position;
  const next = moveUpperPlayer(from, { x: x - from.position.x, z: targetZ - from.position.z }, false, false, true);
  expect(next).not.toBeNull();
  prompt.update(from, next!);
  return next!;
}

describe('first-floor mural arrows', () => {
  it('arms only after crossing the outdoor doorway and walking into the main chamber', () => {
    const prompt = createMogaoGroundGuidance();
    const tunnel = walk(prompt, at(-1.9, null), -2.2);
    expect(tunnel.surfaceId).toBe('entry-tunnel');
    expect(prompt.visible({ ...tunnel, heading: facing, cameraYaw: facing })).toBe(false);
    const room = walk(prompt, tunnel, -8.3);
    expect(room.surfaceId).toBe('ground');
    expect(prompt.visible({ ...room, heading: facing, cameraYaw: facing })).toBe(true);
    expect(prompt.visible({ ...room, heading: facing + Math.PI / 2, cameraYaw: facing })).toBe(false);
    expect(prompt.visible({ ...room, heading: facing, cameraYaw: facing + Math.PI })).toBe(false);
  });

  it('stays hidden for an indoor restore and rearms only after returning outdoors', () => {
    const prompt = createMogaoGroundGuidance();
    const restored = walk(prompt, at(-4, 'entry-tunnel'), -8.3);
    const visible = (point: UpperWalkState) => prompt.visible({ ...point, heading: facing, cameraYaw: facing });
    expect(visible(restored)).toBe(false);
    const exit = walk(prompt, restored, -1.9);
    expect(exit.surfaceId).toBeNull();
    const room = walk(prompt, walk(prompt, exit, -2.2), -8.3);
    expect(visible(room)).toBe(true);
    const fartherIn = walk(prompt, room, -11.8);
    expect(visible(fartherIn)).toBe(false);
    expect(visible(walk(prompt, fartherIn, -8.3))).toBe(false);
  });
});
