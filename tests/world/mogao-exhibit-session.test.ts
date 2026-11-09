import { describe, expect, it } from 'vitest';
import { TERRAIN_ANCHORS, toTerrainPoint } from '../../src/content/world/terrain-layout-v001';
import {
  initializeMogaoExhibitPreviewSession, MOGAO_EXHIBIT_SESSION_KEY, MOGAO_EXHIBIT_SESSION_OPTIONS,
  mogaoExhibitStartCheckpoint,
} from '../../src/world/mogao-exhibit-session';
import { createMogaoGroundGuidance } from '../../src/world/mogao-ground-guidance';
import { moveUpperPlayer, type UpperWalkState } from '../../src/world/mogao-upper-navigation';
import { initializeUpperPreviewSession, UPPER_SESSION_KEY, upperPreviewCheckpoint } from '../../src/world/mogao-upper-session';
import { movementVector } from '../../src/world/movement';
import { loadWorldSession } from '../../src/world/session';
import { moveTerrainPlayer } from '../../src/world/terrain-rules-v001';

function memory() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

describe('standalone third-gallery entry', () => {
  it('starts outside at the actual stair foot, facing the door, and can walk straight inside', () => {
    const storage = memory();
    initializeMogaoExhibitPreviewSession(storage);
    const checkpoint = loadWorldSession(storage, MOGAO_EXHIBIT_SESSION_OPTIONS).data;
    const { cliffStairFoot, cliffDoor } = TERRAIN_ANCHORS;
    expect(checkpoint.position).toEqual({ x: cliffStairFoot.x, z: cliffStairFoot.z });
    expect(checkpoint.walkSurface).toBeUndefined();
    expect(checkpoint.heading).toBe(checkpoint.cameraYaw);
    const direction = movementVector(0, -1, checkpoint.cameraYaw);
    const distance = Math.hypot(cliffDoor.x - cliffStairFoot.x, cliffDoor.z - cliffStairFoot.z);
    expect(direction.x).toBeCloseTo((cliffDoor.x - cliffStairFoot.x) / distance);
    expect(direction.z).toBeCloseTo((cliffDoor.z - cliffStairFoot.z) / distance);

    let state: UpperWalkState = { position: checkpoint.position, surfaceId: null };
    const surfaces = new Set<string>();
    const guidance = createMogaoGroundGuidance();
    for (let z = -39.22; z >= -77; z -= .22) {
      const target = toTerrainPoint('cliff', { x: 122, z });
      const delta = { x: target.x - state.position.x, z: target.z - state.position.z };
      const next = moveUpperPlayer(state, delta, true, true, true) ?? { position: moveTerrainPlayer(state.position, delta), surfaceId: null };
      guidance.update(state, next);
      state = next;
      expect(state.position.x).toBeCloseTo(target.x, 5);
      expect(state.position.z).toBeCloseTo(target.z, 5);
      if (state.surfaceId) surfaces.add(state.surfaceId);
    }
    expect([...surfaces]).toEqual(['entry-tunnel', 'ground']);
    expect(guidance.visible({ ...checkpoint, position: state.position })).toBe(true);
  });

  it('restores valid checkpoints and keeps both the existing inspection views and older upper preview', () => {
    const storage = memory();
    const original = { ...upperPreviewCheckpoint('hall-a', true), visitedEvents: ['story-demo'] };
    storage.setItem(MOGAO_EXHIBIT_SESSION_KEY, JSON.stringify(original));
    initializeMogaoExhibitPreviewSession(storage);
    expect(JSON.parse(storage.getItem(MOGAO_EXHIBIT_SESSION_KEY)!)).toEqual(original);
    const restored = loadWorldSession(storage, MOGAO_EXHIBIT_SESSION_OPTIONS).data;
    expect(restored).toMatchObject({ position: original.position, walkSurface: original.walkSurface, visitedEvents: original.visitedEvents });
    expect(restored.heading).toBeCloseTo(original.heading);
    expect(restored.cameraYaw).toBeCloseTo(original.cameraYaw);

    initializeMogaoExhibitPreviewSession(storage, 'start');
    expect(JSON.parse(storage.getItem(MOGAO_EXHIBIT_SESSION_KEY)!)).toEqual(upperPreviewCheckpoint('start', true));
    initializeUpperPreviewSession(storage);
    expect(JSON.parse(storage.getItem(UPPER_SESSION_KEY)!)).toEqual(upperPreviewCheckpoint());
  });

  it('uses the same outdoor position and heading if no checkpoint can be read', () => {
    const storage = memory();
    const expected = mogaoExhibitStartCheckpoint();
    expect(loadWorldSession(storage, MOGAO_EXHIBIT_SESSION_OPTIONS)).toEqual({ data: expected, warning: null });
    storage.setItem(MOGAO_EXHIBIT_SESSION_KEY, '{unreadable');
    expect(loadWorldSession(storage, MOGAO_EXHIBIT_SESSION_OPTIONS)).toEqual({ data: expected, warning: expect.any(String) });
    expect(storage.getItem(MOGAO_EXHIBIT_SESSION_KEY)).toBe('{unreadable');
  });
});
