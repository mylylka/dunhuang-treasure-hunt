import { describe, expect, it } from 'vitest';
import { discoveryReducer, discoveryView, initialDiscoveryState } from '../../src/world/events';

describe('explicit shared discovery lifecycle', () => {
  it('nearby checks and mismatched start requests cannot automatically open an event', () => {
    expect(discoveryReducer(initialDiscoveryState, { type: 'start', id: 'caisson', nearby: null })).toBe(initialDiscoveryState);
    expect(discoveryReducer(initialDiscoveryState, { type: 'start', id: 'caisson', nearby: 'story-demo' })).toBe(initialDiscoveryState);
    expect(discoveryView(initialDiscoveryState)).toBe('follow');
  });
  it.each(['caisson', 'story-demo'] as const)('explicit %s interaction can pause, resume and cancel cleanly', id => {
    const observing = discoveryReducer(initialDiscoveryState, { type: 'start', id, nearby: id });
    expect(observing).toEqual({ mode: 'observing', id, paused: false });
    expect(discoveryView(observing)).toBe(id === 'caisson' ? 'caisson' : 'story');
    const paused = discoveryReducer(observing, { type: 'pause' });
    expect(paused).toEqual({ mode: 'observing', id, paused: true });
    expect(discoveryReducer(paused, { type: 'resume' })).toEqual(observing);
    expect(discoveryReducer(paused, { type: 'exit' })).toBe(initialDiscoveryState);
  });
  it('an active event cannot be replaced by another proximity prompt', () => {
    const first = discoveryReducer(initialDiscoveryState, { type: 'start', id: 'caisson', nearby: 'caisson' });
    expect(discoveryReducer(first, { type: 'start', id: 'story-demo', nearby: 'story-demo' })).toBe(first);
  });
  it('pause and resume in free exploration do not manufacture a discovery', () => {
    expect(discoveryReducer(initialDiscoveryState, { type: 'pause' })).toBe(initialDiscoveryState);
    expect(discoveryReducer(initialDiscoveryState, { type: 'resume' })).toBe(initialDiscoveryState);
  });
});
