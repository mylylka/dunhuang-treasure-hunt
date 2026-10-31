import { describe, expect, it } from 'vitest';
import type { StorageLike } from '../../src/services/progress';
import { CAMERA_YAW_LIMIT, WORLD_SPAWN } from '../../src/world/movement';
import { defaultWorldCheckpoint, loadWorldSession, sanitizeCheckpoint, saveWorldSession, themeReturnCheckpoint, withVisitedDiscovery, WORLD_SESSION_KEY } from '../../src/world/session';

function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('world session isolation and recovery', () => {
  it('roundtrips through its own key without touching pre-existing game, art or lesson records', () => {
    const memory = storage();
    for (const key of ['dunhuang:progress:v1', 'dunhuang:artworks:v1', 'dunhuang:learning:v1']) memory.setItem(key, `preserve:${key}`);
    const before = new Map(memory.values);
    const checkpoint = { ...defaultWorldCheckpoint(), position: { x: -12, z: -13 }, cameraYaw: CAMERA_YAW_LIMIT };
    expect(saveWorldSession(checkpoint, memory)).toEqual({ ok: true });
    const restored = loadWorldSession(memory);
    expect(restored.warning).toBeNull();
    expect(restored.data.position).toEqual(checkpoint.position);
    // The full permitted orbit must survive exiting and returning from 2D.
    expect(restored.data.cameraYaw).toBeCloseTo(checkpoint.cameraYaw);
    for (const [key, value] of before) expect(memory.getItem(key)).toBe(value);
    expect(memory.values.size).toBe(before.size + 1);
  });
  it.each([
    { ...defaultWorldCheckpoint(), position: { x: -22, z: -10 } },
    { ...defaultWorldCheckpoint(), position: { x: 999, z: 0 } },
    { ...defaultWorldCheckpoint(), position: { x: NaN, z: 0 } },
    { ...defaultWorldCheckpoint(), version: 2 },
  ])('corrupt, unknown or wall-embedded snapshots safely return to spawn', data => {
    expect(sanitizeCheckpoint(data).position).toEqual(WORLD_SPAWN);
  });
  it('reading broken data preserves it, and a later write archives it before replacing', () => {
    const memory = storage(); memory.setItem(WORLD_SESSION_KEY, '{broken');
    expect(loadWorldSession(memory).warning).toBeTruthy();
    expect(memory.getItem(WORLD_SESSION_KEY)).toBe('{broken');
    expect(saveWorldSession(defaultWorldCheckpoint(), memory).ok).toBe(true);
    const backup = [...memory.values].filter(([key]) => key.startsWith(`${WORLD_SESSION_KEY}:unreadable:`));
    expect(backup).toHaveLength(1);
    expect(backup[0][1]).toBe('{broken');
  });
  it('cannot overwrite broken data if backup fails; storage denial is an honest retriable error', () => {
    const memory = storage(); memory.setItem(WORLD_SESSION_KEY, '{valuable');
    const blocked: StorageLike = { getItem: memory.getItem, setItem: () => { throw new Error('storage blocked'); } };
    expect(saveWorldSession(defaultWorldCheckpoint(), blocked).ok).toBe(false);
    expect(memory.getItem(WORLD_SESSION_KEY)).toBe('{valuable');
    expect(saveWorldSession(defaultWorldCheckpoint(), memory).ok).toBe(true);
    const unreadable: StorageLike = { getItem: () => { throw new Error('denied'); }, setItem: () => undefined };
    expect(loadWorldSession(unreadable)).toEqual({ data: defaultWorldCheckpoint(), warning: expect.any(String) });
  });
  it('theme exit stores a safe hall entry and only its own cultural participation', () => {
    const before = { ...defaultWorldCheckpoint(), position: { x: -12, z: -17 } };
    const after = themeReturnCheckpoint(before);
    expect(after.position).toEqual({ x: -12, z: -13 });
    expect(after.visitedEvents).toEqual(['caisson']);
    expect(before.position).toEqual({ x: -12, z: -17 });
    expect(before.visitedEvents).toEqual([]);
    expect(withVisitedDiscovery(after, 'caisson').visitedEvents).toEqual(['caisson']);
  });
});
