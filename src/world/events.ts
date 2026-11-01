import type { DiscoveryId, WorldView } from './types';

export type DiscoveryState = { mode: 'exploring' } | { mode: 'observing'; id: DiscoveryId; paused: boolean } | { mode: 'choosing'; id: DiscoveryId };
export type DiscoveryAction = { type: 'start'; id: DiscoveryId; nearby: DiscoveryId | null }
  | { type: 'pause' | 'resume' | 'exit' | 'complete' };
export const initialDiscoveryState: DiscoveryState = { mode: 'exploring' };

/** Proximity never starts an event; an explicit valid action is required. */
export function discoveryReducer(state: DiscoveryState, action: DiscoveryAction): DiscoveryState {
  if (action.type === 'exit') return initialDiscoveryState;
  if (action.type === 'start') return state.mode === 'exploring' && action.nearby === action.id
    ? { mode: 'observing', id: action.id, paused: false } : state;
  if (action.type === 'complete') return state.mode==='observing'?{mode:'choosing',id:state.id}:state;
  if (state.mode !== 'observing') return state;
  return { ...state, paused: action.type === 'pause' };
}
export function discoveryView(state: DiscoveryState): WorldView {
  return state.mode === 'exploring' ? 'follow' : state.id === 'caisson' ? 'caisson' : state.id === 'flying' ? 'flying' : 'story';
}
