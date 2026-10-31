import { z } from 'zod';
import type { StorageLike } from '../services/progress';
import type { DiscoveryId, WorldCheckpoint } from './types';
import { sanitizePosition, clampCameraYaw } from './movement';

export const WORLD_SESSION_KEY = 'dunhuang:world-session:v1';
const schema = z.object({
  version: z.literal(1),
  position: z.object({ x: z.number().finite(), z: z.number().finite() }),
  heading: z.number().finite(), cameraYaw: z.number().finite(),
  visitedEvents: z.array(z.enum(['caisson', 'story-demo'])),
});
export function defaultWorldCheckpoint(): WorldCheckpoint {
  return { version: 1, position: { x: 0, z: 18 }, heading: 0, cameraYaw: 0, visitedEvents: [] };
}
export function sanitizeCheckpoint(value: unknown): WorldCheckpoint {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return defaultWorldCheckpoint();
  return { ...parsed.data, position: sanitizePosition(parsed.data.position),
    cameraYaw: clampCameraYaw(parsed.data.cameraYaw),
    heading: Math.atan2(Math.sin(parsed.data.heading), Math.cos(parsed.data.heading)),
    visitedEvents: [...new Set(parsed.data.visitedEvents)] };
}
export function loadWorldSession(storage?: StorageLike): { data: WorldCheckpoint; warning: string | null } {
  try {
    const raw = (storage ?? window.sessionStorage).getItem(WORLD_SESSION_KEY);
    if (!raw) return { data: defaultWorldCheckpoint(), warning: null };
    const value: unknown = JSON.parse(raw);
    if (!schema.safeParse(value).success) throw new Error('Unsupported checkpoint');
    return { data: sanitizeCheckpoint(value), warning: null };
  } catch {
    return { data: defaultWorldCheckpoint(), warning: '探索位置暂时无法读取，已回到起点。原记录已保留。' };
  }
}
export function saveWorldSession(checkpoint: WorldCheckpoint, storage?: StorageLike): { ok: true } | { ok: false; message: string } {
  try {
    const target = storage ?? window.sessionStorage;
    const raw = target.getItem(WORLD_SESSION_KEY);
    if (raw) {
      let valid = false;
      try { valid = schema.safeParse(JSON.parse(raw)).success; } catch { /* Preserve damaged records. */ }
      if (!valid) {
        let suffix = Date.now();
        while (target.getItem(`${WORLD_SESSION_KEY}:unreadable:${suffix}`) !== null) suffix++;
        target.setItem(`${WORLD_SESSION_KEY}:unreadable:${suffix}`, raw);
      }
    }
    target.setItem(WORLD_SESSION_KEY, JSON.stringify(sanitizeCheckpoint(checkpoint)));
    return { ok: true };
  } catch {
    return { ok: false, message: '探索位置尚未保存，本次仍可继续；刷新后可能回到起点。' };
  }
}
export function withVisitedDiscovery(checkpoint: WorldCheckpoint, id: DiscoveryId): WorldCheckpoint {
  return { ...checkpoint, position: { ...checkpoint.position }, visitedEvents: [...new Set([...checkpoint.visitedEvents, id])] };
}

/** Entering teaching restores to the hall entrance, not into its active observation. */
export function themeReturnCheckpoint(checkpoint: WorldCheckpoint): WorldCheckpoint {
  return { ...withVisitedDiscovery(checkpoint, 'caisson'), position: { x: -12, z: -13 }, cameraYaw: 0, heading: 0 };
}
