import { describe, expect, it } from 'vitest';
import { defaultWorldCheckpoint, loadWorldSession, saveWorldSession, WORLD_SESSION_KEY } from '../../src/world/session';
import { LEGACY_UPPER_SESSION_KEY, UPPER_PREVIEW_VIEWS, UPPER_SESSION_KEY, UPPER_SESSION_OPTIONS, initializeUpperPreviewSession, restoreLegacyUpperCheckpoint, upperPreviewCheckpoint } from '../../src/world/mogao-upper-session';
import { upperFloorHeight, upperFromWorld, upperToWorld } from '../../src/world/mogao-upper-navigation';
import { TERRAIN_SESSION_KEY, TERRAIN_SPAWN } from '../../src/content/world/terrain-layout-v001';

function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('isolated upper-gallery session', () => {
  it('keeps overlapping A/B platform coordinates on their original floors after save/load', () => {
    const memory = storage();
    const a = upperPreviewCheckpoint('upper-a'), b = upperPreviewCheckpoint('upper-b');
    expect(a.position).toEqual(b.position);
    expect(a.walkSurface).not.toBe(b.walkSurface);
    for (const checkpoint of [a, b]) {
      const before = upperFloorHeight(checkpoint.position, checkpoint.walkSurface)!;
      expect(saveWorldSession(checkpoint, memory, UPPER_SESSION_OPTIONS)).toEqual({ ok: true });
      const restored = loadWorldSession(memory, UPPER_SESSION_OPTIONS);
      expect(restored.warning).toBeNull();
      expect(restored.data.walkSurface).toBe(checkpoint.walkSurface);
      expect(restored.data.position).toEqual(checkpoint.position);
      expect(upperFloorHeight(restored.data.position, restored.data.walkSurface)).toBeCloseTo(before);
      expect(restored.data.cameraYaw).toBeCloseTo(checkpoint.cameraYaw);
    }
  });
  it('writes only its own key and leaves approved terrain/world/game records untouched', () => {
    const memory = storage();
    for (const key of [LEGACY_UPPER_SESSION_KEY, TERRAIN_SESSION_KEY, WORLD_SESSION_KEY, 'dunhuang:progress:v1', 'dunhuang:artworks:v1']) memory.setItem(key, `preserve:${key}`);
    const before = new Map(memory.values);
    saveWorldSession(upperPreviewCheckpoint('upper-b'), memory, UPPER_SESSION_OPTIONS);
    for (const [key, value] of before) expect(memory.getItem(key)).toBe(value);
    expect(memory.values.size).toBe(before.size + 1);
    expect(memory.getItem(UPPER_SESSION_KEY)).toBeTruthy();
  });
  it('repairs an invalid saved upper position on the same level instead of dropping downstairs', () => {
    const memory = storage(), checkpoint = upperPreviewCheckpoint('upper-b');
    memory.setItem(UPPER_SESSION_KEY, JSON.stringify({ ...checkpoint, position: { x: 1e4, z: 1e4 } }));
    const restored = loadWorldSession(memory, UPPER_SESSION_OPTIONS).data;
    expect(restored.walkSurface).toBe(checkpoint.walkSurface);
    expect(upperFloorHeight(restored.position, restored.walkSurface)).toBeCloseTo(36.43546875);
  });
  it('offers valid authored inspection stations and a ground start for fresh/invalid sessions', () => {
    for (const view of UPPER_PREVIEW_VIEWS) {
      const checkpoint = upperPreviewCheckpoint(view);
      expect(checkpoint.walkSurface).toBeTruthy();
      expect(upperFloorHeight(checkpoint.position, checkpoint.walkSurface)).not.toBeNull();
      expect(Number.isFinite(checkpoint.cameraYaw)).toBe(true);
    }
    const memory = storage();
    expect(loadWorldSession(memory, UPPER_SESSION_OPTIONS).data.walkSurface).toBe('ground');
    memory.setItem(UPPER_SESSION_KEY, '{unreadable');
    const result = loadWorldSession(memory, UPPER_SESSION_OPTIONS);
    expect(result.warning).toBeTruthy();
    expect(result.data.walkSurface).toBe('ground');
    expect(memory.getItem(UPPER_SESSION_KEY)).toBe('{unreadable');
    const local = upperFromWorld(result.data.position);
    expect(local.x).toBeCloseTo(12.85);
  });
  it('continues ordinary outdoor terrain checkpoints without attaching an upper surface', () => {
    const memory = storage(), checkpoint = defaultWorldCheckpoint(TERRAIN_SPAWN);
    saveWorldSession(checkpoint, memory, UPPER_SESSION_OPTIONS);
    const restored = loadWorldSession(memory, UPPER_SESSION_OPTIONS).data;
    expect(restored.position).toEqual(checkpoint.position);
    expect(restored.walkSurface).toBeUndefined();
  });

  it('restores old stair checkpoints by their old height, including IDs reused at different heights', () => {
    for (const [id, local, expected, height] of [
      ['flight-2', { x: 20.3, z: -26.025 }, 'ground', .024],
      ['flight-4', { x: 20.3, z: -26.025 }, 'ground', .024],
      ['flight-6', { x: 20.3, z: -26.025 }, 'hall-a', 8.11],
      ['landing-8', { x: 18.7, z: -23 }, 'hall-b', 19.58],
      ['flight-6', { x: 999, z: -999 }, 'hall-a', 8.11],
    ] as const) {
      const checkpoint = { ...defaultWorldCheckpoint(upperToWorld(local)), walkSurface: id, visitedEvents: ['story-demo'] as const };
      const input = { ...checkpoint, visitedEvents: [...checkpoint.visitedEvents] };
      const before = JSON.stringify(input), restored = restoreLegacyUpperCheckpoint(input);
      expect(restored.walkSurface, id).toBe(expected);
      expect(upperFromWorld({ ...restored.position, y: upperFloorHeight(restored.position, restored.walkSurface)! }).y, id).toBeCloseTo(height);
      expect(restored.visitedEvents).toEqual(['story-demo']);
      expect(JSON.stringify(input)).toBe(before);
      if (expected === 'hall-a' || expected === 'hall-b') {
        expect(upperFromWorld(restored.position).x).toBeCloseTo(18.7);
        expect(upperFromWorld(restored.position).z).toBeCloseTo(-18.8);
      }
    }
  });

  it('keeps old gallery and viewing-platform positions and initializes only the new session key', () => {
    expect(UPPER_SESSION_KEY).toBe('dunhuang:mogao-upper:v2');
    for (const view of ['hall-a', 'upper-a', 'hall-b', 'upper-b'] as const) {
      const memory = storage(), old = upperPreviewCheckpoint(view);
      const raw = JSON.stringify(old);
      memory.setItem(LEGACY_UPPER_SESSION_KEY, raw);
      initializeUpperPreviewSession(memory);
      const restored = loadWorldSession(memory, UPPER_SESSION_OPTIONS).data;
      expect(restored.walkSurface).toBe(old.walkSurface);
      expect(restored.position.x).toBeCloseTo(old.position.x, 8);
      expect(restored.position.z).toBeCloseTo(old.position.z, 8);
      expect(memory.getItem(LEGACY_UPPER_SESSION_KEY)).toBe(raw);
      expect(memory.values.size).toBe(2);
    }
  });

  it('never revives v1 over existing v2, even when the new record is empty or damaged', () => {
    const oldRaw = JSON.stringify(upperPreviewCheckpoint('upper-b'));
    for (const raw of ['', '{damaged', JSON.stringify(upperPreviewCheckpoint('upper-a'))]) {
      const memory = storage();
      memory.setItem(LEGACY_UPPER_SESSION_KEY, oldRaw);
      memory.setItem(UPPER_SESSION_KEY, raw);
      initializeUpperPreviewSession(memory);
      expect(memory.getItem(UPPER_SESSION_KEY)).toBe(raw);
      expect(memory.getItem(LEGACY_UPPER_SESSION_KEY)).toBe(oldRaw);
    }
  });

  it('applies an explicit inspection view only to v2 while retaining damaged legacy text', () => {
    const memory = storage();
    memory.setItem(LEGACY_UPPER_SESSION_KEY, '{damaged legacy');
    initializeUpperPreviewSession(memory);
    expect(loadWorldSession(memory, UPPER_SESSION_OPTIONS).data.walkSurface).toBe('ground');
    initializeUpperPreviewSession(memory, 'upper-b');
    expect(loadWorldSession(memory, UPPER_SESSION_OPTIONS).data.walkSurface).toBe('view-b');
    expect(memory.getItem(LEGACY_UPPER_SESSION_KEY)).toBe('{damaged legacy');
  });
});
