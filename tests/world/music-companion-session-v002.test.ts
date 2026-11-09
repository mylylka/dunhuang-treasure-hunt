import { describe, expect, it } from 'vitest';
import {
  initializeMusicCompanionPreviewSession, MUSIC_COMPANION_SESSION_KEY_V2,
  MUSIC_GUIDE_SESSION_OPTIONS, musicGuidePreviewCheckpoint,
} from '../../src/world/music-companion-session-v002';
import { musicInteriorToWorld } from '../../src/world/music-interior-navigation';
import { defaultWorldCheckpoint, loadWorldSession, saveWorldSession } from '../../src/world/session';
import type { WorldCheckpoint } from '../../src/world/types';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

function checkpointAt(x: number, z: number, walkSurface?: string): WorldCheckpoint {
  const point = musicInteriorToWorld({ x, z });
  return {
    ...defaultWorldCheckpoint({ x: point.x, z: point.z }),
    walkSurface, heading: 1.2, cameraYaw: -2.2, visitedEvents: ['flying'],
  };
}

describe('second-gallery session recovery', () => {
  it('starts the first guide visit at the yard entrance and leaves existing data to the session loader', () => {
    const memory = storage();
    initializeMusicCompanionPreviewSession(memory, true);
    expect(loadWorldSession(memory, MUSIC_GUIDE_SESSION_OPTIONS).data).toEqual(musicGuidePreviewCheckpoint());

    memory.setItem(MUSIC_COMPANION_SESSION_KEY_V2, '{previous data');
    initializeMusicCompanionPreviewSession(memory, true);
    expect(memory.getItem(MUSIC_COMPANION_SESSION_KEY_V2)).toBe('{previous data');
    expect(loadWorldSession(memory, MUSIC_GUIDE_SESSION_OPTIONS).warning).toBeTruthy();
  });

  it.each([
    [44, -4, 'music-courtyard'],
    [39.5, -14.8, 'music-front-ramp'],
    [39.5, -19.4, 'music-floor-1'],
    [50.98, -30.225, 'music-stair'],
    [43.1, -27, 'music-floor-2'],
    [38.2, -20.55, 'music-gallery'],
  ])('restores (%s, %s) on %s after saving and reopening the preview', (x, z, surface) => {
    const memory = storage();
    initializeMusicCompanionPreviewSession(memory, true);
    const checkpoint = checkpointAt(x, z, surface);
    expect(saveWorldSession(checkpoint, memory, MUSIC_GUIDE_SESSION_OPTIONS).ok).toBe(true);
    const stored = memory.getItem(MUSIC_COMPANION_SESSION_KEY_V2);
    initializeMusicCompanionPreviewSession(memory, true);
    expect(memory.getItem(MUSIC_COMPANION_SESSION_KEY_V2)).toBe(stored);

    const { data, warning } = loadWorldSession(memory, MUSIC_GUIDE_SESSION_OPTIONS);
    expect(warning).toBeNull();
    expect(data).toMatchObject({ position: checkpoint.position, walkSurface: surface, visitedEvents: ['flying'] });
    expect(data.heading).toBeCloseTo(checkpoint.heading);
    expect(data.cameraYaw).toBeCloseTo(checkpoint.cameraYaw);
  });

  it('infers a safe lower floor when an older overlapping checkpoint has no floor ID', () => {
    const memory = storage();
    const checkpoint = checkpointAt(43.1, -27);
    memory.setItem(MUSIC_COMPANION_SESSION_KEY_V2, JSON.stringify(checkpoint));
    expect(loadWorldSession(memory, MUSIC_GUIDE_SESSION_OPTIONS).data).toMatchObject({
      position: checkpoint.position, walkSurface: 'music-floor-1', visitedEvents: ['flying'],
    });
  });

  it('restores an obstructed point on its saved upper floor and falls back to the gate when outside the map', () => {
    const memory = storage();
    const checkpoint = checkpointAt(35.5, -24.85, 'music-floor-2');
    memory.setItem(MUSIC_COMPANION_SESSION_KEY_V2, JSON.stringify(checkpoint));
    const upper = loadWorldSession(memory, MUSIC_GUIDE_SESSION_OPTIONS).data;
    expect(upper.position).not.toEqual(checkpoint.position);
    expect(upper).toMatchObject({ walkSurface: 'music-floor-2', visitedEvents: ['flying'] });

    memory.setItem(MUSIC_COMPANION_SESSION_KEY_V2, JSON.stringify({ ...checkpoint, walkSurface: 'obsolete', position: { x: 5000, z: 5000 } }));
    expect(loadWorldSession(memory, MUSIC_GUIDE_SESSION_OPTIONS).data).toMatchObject({
      position: musicGuidePreviewCheckpoint().position, visitedEvents: ['flying'],
    });
  });
});
