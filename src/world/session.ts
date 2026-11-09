import { z } from 'zod';
import type { StorageLike } from '../services/progress';
import type { DiscoveryId, WorldCheckpoint, WorldPoint } from './types';
import { sanitizePosition, clampCameraYaw, type WorldBounds, type WorldCollider } from './movement';

export const WORLD_SESSION_KEY = 'dunhuang:world-session:v1';
const schema = z.object({
  version: z.literal(1),
  position: z.object({ x: z.number().finite(), z: z.number().finite() }),
  heading: z.number().finite(), cameraYaw: z.number().finite(),
  visitedEvents: z.array(z.enum(['caisson', 'story-demo', 'novice-story', 'flying'])),
  walkSurface: z.string().min(1).max(128).optional(),
});
type WorldSessionSpawn = WorldPoint & { heading?: number };
export interface WorldSessionOptions {
  key?: string; colliders?: readonly WorldCollider[]; bounds?: WorldBounds; freeYaw?: boolean; spawn?: WorldSessionSpawn;
  sanitizePosition?(p: WorldPoint): WorldPoint;
  /** Takes precedence over horizontal sanitation so stacked floors retain their surface. */
  sanitizeCheckpoint?(checkpoint: WorldCheckpoint): WorldCheckpoint;
}
export function defaultWorldCheckpoint({ x, z, heading = 0 }: WorldSessionSpawn = { x: 0, z: 18 }): WorldCheckpoint {
  return { version: 1, position: { x, z }, heading, cameraYaw: heading, visitedEvents: [] };
}
export function sanitizeCheckpoint(value: unknown, colliders?: readonly WorldCollider[], bounds?: WorldBounds, freeYaw = false, positionResolver?:(p:WorldPoint)=>WorldPoint, spawn?: WorldSessionSpawn, checkpointResolver?: (checkpoint: WorldCheckpoint) => WorldCheckpoint): WorldCheckpoint {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return initialCheckpoint({ spawn, sanitizeCheckpoint: checkpointResolver });
  const checkpoint: WorldCheckpoint = { ...parsed.data, position: { ...parsed.data.position },
    cameraYaw: freeYaw ? Math.atan2(Math.sin(parsed.data.cameraYaw), Math.cos(parsed.data.cameraYaw)) : clampCameraYaw(parsed.data.cameraYaw),
    heading: Math.atan2(Math.sin(parsed.data.heading), Math.cos(parsed.data.heading)),
    visitedEvents: [...new Set(parsed.data.visitedEvents)] };
  if (checkpointResolver) return checkpointResolver(checkpoint);
  return { ...checkpoint, position: positionResolver ? positionResolver(checkpoint.position) : sanitizePosition(checkpoint.position, colliders, bounds) };
}
function initialCheckpoint(options: WorldSessionOptions): WorldCheckpoint {
  const checkpoint = defaultWorldCheckpoint(options.spawn);
  return options.sanitizeCheckpoint?.(checkpoint) ?? checkpoint;
}
export function loadWorldSession(storage?: StorageLike, options: WorldSessionOptions = {}): { data: WorldCheckpoint; warning: string | null } {
  try {
    const raw = (storage ?? window.sessionStorage).getItem(options.key ?? WORLD_SESSION_KEY);
    if (!raw) return { data: initialCheckpoint(options), warning: null };
    const value: unknown = JSON.parse(raw);
    if (!schema.safeParse(value).success) throw new Error('Unsupported checkpoint');
    return { data: sanitizeCheckpoint(value, options.colliders, options.bounds, options.freeYaw, options.sanitizePosition, options.spawn, options.sanitizeCheckpoint), warning: null };
  } catch {
    return { data: initialCheckpoint(options), warning: '探索位置暂时无法读取，已回到起点。原记录已保留。' };
  }
}
export function saveWorldSession(checkpoint: WorldCheckpoint, storage?: StorageLike, options: WorldSessionOptions = {}): { ok: true } | { ok: false; message: string } {
  try {
    const target = storage ?? window.sessionStorage;
    const key = options.key ?? WORLD_SESSION_KEY;
    const raw = target.getItem(key);
    if (raw) {
      let valid = false;
      try { valid = schema.safeParse(JSON.parse(raw)).success; } catch { /* Preserve damaged records. */ }
      if (!valid) {
        let suffix = Date.now();
        while (target.getItem(`${key}:unreadable:${suffix}`) !== null) suffix++;
        target.setItem(`${key}:unreadable:${suffix}`, raw);
      }
    }
    target.setItem(key, JSON.stringify(sanitizeCheckpoint(checkpoint, options.colliders, options.bounds, options.freeYaw, options.sanitizePosition, options.spawn, options.sanitizeCheckpoint)));
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
