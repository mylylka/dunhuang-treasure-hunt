import { expect, it } from 'vitest';
import { discoveryReducer, discoveryView, initialDiscoveryState } from '../../src/world/events';
import { isWalkable } from '../../src/world/movement';
import { defaultWorldCheckpoint, loadWorldSession, saveWorldSession, themeReturnCheckpoint } from '../../src/world/session';

it('persists a safe teaching return without persisting an active observation or overwriting completed story participation', () => {
  const memory = new Map<string, string>();
  const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
  const previous = { ...defaultWorldCheckpoint(), position: { x: -12, z: -17 }, visitedEvents: ['story-demo' as const] };
  const observing = discoveryReducer(initialDiscoveryState, { type: 'start', id: 'caisson', nearby: 'caisson' });
  expect(discoveryView(observing)).toBe('caisson');
  expect(saveWorldSession(themeReturnCheckpoint(previous), storage).ok).toBe(true);
  const restored = loadWorldSession(storage).data;
  expect(isWalkable(restored.position)).toBe(true);
  expect(Math.hypot(restored.position.x + 12, restored.position.z + 17)).toBeGreaterThan(2.6);
  expect(restored.visitedEvents).toEqual(['story-demo', 'caisson']);
  expect(discoveryView(initialDiscoveryState)).toBe('follow');
  expect(restored).not.toHaveProperty('mode');
  expect(restored).not.toHaveProperty('paused');
});
