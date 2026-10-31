import * as THREE from 'three';
import { clearCameraPosition, followCameraPose } from './camera';
import type { WorldPoint } from './types';

export type CinematicId = 'opening' | 'hall';
export interface CinematicSeen { opening: boolean; hall: boolean }
export interface CinematicState { id: CinematicId; time: number; duration: number }
export const CINEMATIC_DURATION = { opening: 2.2, hall: 2.5 } as const;
export const CINEMATIC_SESSION_KEY = 'dunhuang:character-cinematics:v1';
const ease = (t: number, a: number, b: number) => THREE.MathUtils.smoothstep(t, a, b);
export const openingHeading = (t: number) => Math.PI * (1 - ease(t, 1.05, 1.75));
export const openingDistance = (t: number) => .3 * ease(t, 1.75, 2.2);

/** Presentation history is separate from cultural-event completion and checkpoints. */
export function createCinematicDirector(initial: CinematicSeen, onSeen: (seen: CinematicSeen) => void) {
  const seen = { ...initial }; let active: CinematicState | null = null, still = 0;
  function remember(id: CinematicId) { if (!seen[id]) { seen[id] = true; onSeen({ ...seen }); } }
  function start(id: CinematicId) { remember(id); still = 0; active = { id, time: 0, duration: CINEMATIC_DURATION[id] }; }
  return {
    get state(): CinematicState | null { return active ? { ...active } : null; },
    get seen() { return { ...seen }; },
    opening(eligible: boolean, reduced: boolean, intent = false) {
      if (seen.opening) return;
      if (!eligible || reduced || intent) remember('opening'); else start('opening');
    },
    skip() { active = null; still = 0; },
    skipHall() { remember('hall'); active = null; still = 0; },
    update(dt: number, nearHall: boolean, intent: boolean, reduced: boolean, safeHall: boolean) {
      if (intent || reduced) { active = null; still = 0; if (reduced && nearHall) remember('hall'); return; }
      if (active) { active.time = Math.min(active.duration, active.time + dt); return; }
      if (seen.hall || !nearHall) { still = 0; return; }
      still += dt;
      if (still >= .35) { if (safeHall) start('hall'); else { remember('hall'); still = 0; } }
    },
    finish() { if (active && active.time >= active.duration) active = null; },
  };
}

export function loadCinematicSeen(storage: Pick<Storage, 'getItem'>): CinematicSeen {
  try { const value = JSON.parse(storage.getItem(CINEMATIC_SESSION_KEY) ?? '{}'); return { opening: value?.opening === true, hall: value?.hall === true }; }
  catch { return { opening: false, hall: false }; }
}
export function saveCinematicSeen(storage: Pick<Storage, 'setItem'>, seen: CinematicSeen) {
  try { storage.setItem(CINEMATIC_SESSION_KEY, JSON.stringify(seen)); } catch { /* In-memory director still prevents repeats in this mount. */ }
}

/** Compose two authored shots, independently of the player's movement basis. */
export function characterCameraPose(id: CinematicId, time: number, p: WorldPoint, y: number, heading: number, yaw: number) {
  if (id === 'opening') {
    const follow = followCameraPose(p.x, y, p.z, yaw);
    const target = new THREE.Vector3(p.x, y + 1.15, p.z).lerp(follow.target, ease(time, 1.05, 2.2));
    const close = new THREE.Vector3(1.1, 2.0, 4.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(p.x, y, p.z));
    const desired = close.lerp(follow.position, ease(time, 1.05, 2.2));
    const position = clearCameraPosition(target, desired);
    return position.distanceTo(target) >= 2.1 ? { target, position } : null;
  }
  const target = new THREE.Vector3(p.x, y + 1.42, p.z);
  // Static front-quarter composition; try either shoulder without orbiting through the room.
  for (const side of [1, -1]) {
    const desired = new THREE.Vector3(side * 1.45, .20, -2.15).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading).add(target);
    const position = clearCameraPosition(target, desired);
    if (position.distanceTo(desired) < .08 && position.distanceTo(target) >= 2.1) return { target, position };
  }
  return null;
}
