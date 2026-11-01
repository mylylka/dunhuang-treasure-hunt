import { MUSIC_HEARING_GATE, musicEncounters } from '../content/world/music-encounters';
import { inMusicCourtV4, MUSIC_LAYOUT_V4 } from './music-pavilion-rules-v004';
import type { WorldPoint } from './types';
export type MusicEncounterId = keyof typeof musicEncounters;
export interface MusicEncounterState { id: MusicEncounterId; time: number; duration: number; text: string }
/** Visit-scoped anticipation. Mural discovery stays unavailable until its line finishes. */
export function createMusicEncounters(initial: WorldPoint) {
  let musicHeard = initial.x > MUSIC_HEARING_GATE.maxX;
  let admired = false, active: MusicEncounterState | null = null;
  function finish() { if (active?.id === 'mural') admired = true; active = null; }
  function begin(id: MusicEncounterId) { active = { id, time: 0, ...musicEncounters[id] }; }
  return {
    get state() { return active ? { ...active } : null; },
    get musicHeard() { return musicHeard; },
    get muralReady() { return admired && !active; },
    update(p: WorldPoint, dt: number, speechEnded: boolean) {
      // Hysteresis prevents a doorway edge wobble from creating a new visit.
      const c = MUSIC_LAYOUT_V4.court;
      if (p.x < c.minX - .7 || p.x > c.maxX + .7 || p.z > c.frontZ + .7 || p.z < c.backZ - .7) admired = false;
      if (active) {
        active.time += dt;
        if (active.time >= active.duration && (speechEnded || active.time >= active.duration + .2)) finish();
        return;
      }
      const g = MUSIC_HEARING_GATE;
      if (!musicHeard && p.x >= g.minX && p.x <= g.maxX && p.z >= g.minZ && p.z <= g.maxZ) {
        musicHeard = true; begin('music'); return;
      }
      // A reload/preview start farther along must not remain permanently silent.
      if (p.x > g.maxX) musicHeard = true;
      const [x,z] = MUSIC_LAYOUT_V4.mural.trigger;
      if (!admired && inMusicCourtV4(p) && Math.hypot(p.x-x,p.z-z) < 4.1) begin('mural');
    },
    skip: finish,
    reset() { musicHeard = false; admired = false; active = null; },
  };
}
