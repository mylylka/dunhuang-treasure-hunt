import { MOGAO_EXHIBIT_SESSION_KEY } from '../world/mogao-exhibit-session';
import { MUSIC_COMPANION_SESSION_KEY_V2 } from '../world/music-companion-session-v002';
import type { DiscoveryId } from '../world/types';
import { FIRST_GALLERY_ENTRY_KEY, FIRST_GALLERY_MURAL_MARKER_KEY, FIRST_GALLERY_WORLD_SESSION_KEY } from './first-gallery-entry';
import { FIRST_GALLERY_STORAGE_KEY, firstGalleryRecordWithoutProgress } from './first-gallery';
import type { GalleryTaskArea } from './gallery-tasks';
import { MOGAO_EXHIBIT_PROGRESS_KEY } from './mogao-exhibit-progress';
import { MOGAO_GAME_NOTICE_KEY } from './mogao-game-access';
import { MOGAO_HALL_A_PROGRESS_KEYS } from './mogao-hall-a-progress';
import { MUSIC_GALLERY_PROGRESS_KEYS } from './music-gallery-progress';
import type { StorageLike } from './progress';

export interface ResettableStorage extends StorageLike {
  removeItem(key: string): void;
}

type ResetResult = { ok: true } | { ok: false; message: string };
type StorageChange = { store: ResettableStorage; key: string; before: string | null; after: string | null };

const DISCOVERIES: Record<GalleryTaskArea, readonly DiscoveryId[]> = {
  first: ['caisson'], music: ['flying'], mogao: ['story-demo', 'novice-story'],
};
const STANDALONE_CHECKPOINT: Partial<Record<GalleryTaskArea, string>> = {
  music: MUSIC_COMPANION_SESSION_KEY_V2,
  mogao: MOGAO_EXHIBIT_SESSION_KEY,
};
const STORAGE_ERROR = '暂时无法清除该馆进度，请重试。';

export function galleryProgressResetKey(gallery: GalleryTaskArea): string {
  return `dunhuang:gallery-reset:v1:${gallery}`;
}

export function galleryForProgressResetKey(key: string | null): GalleryTaskArea | undefined {
  const galleries: GalleryTaskArea[] = ['first', 'music', 'mogao'];
  return galleries.find(gallery => key === galleryProgressResetKey(gallery));
}

function stage(changes: StorageChange[], store: ResettableStorage, key: string, transform: (raw: string | null) => string | null) {
  const before = store.getItem(key);
  const after = transform(before);
  if (after !== before) changes.push({ store, key, before, after });
}

function write(store: ResettableStorage, key: string, value: string | null) {
  if (value === null) store.removeItem(key);
  else store.setItem(key, value);
}

function commit(changes: StorageChange[], signal?: StorageChange): ResetResult {
  const written: StorageChange[] = [];
  try {
    for (const change of changes) {
      const { store, key, before, after } = change;
      if (store.getItem(key) !== before) throw new Error('Concurrent gallery write');
      write(store, key, after);
      written.push(change);
    }
    return { ok: true };
  } catch {
    try {
      // If another tab completed this reset, keep its cleared state.
      if (!signal || signal.store.getItem(signal.key) === signal.before) {
        for (const { store, key, before, after } of written.reverse()) {
          if (store.getItem(key) === after) write(store, key, before);
        }
      }
    } catch {
      return { ok: false, message: '该馆进度可能只清除了一部分，请重试。' };
    }
    return { ok: false, message: STORAGE_ERROR };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withoutVisits(checkpoint: unknown, gallery: GalleryTaskArea): unknown {
  if (!isRecord(checkpoint) || !Array.isArray(checkpoint.visitedEvents)) return checkpoint;
  const visits = checkpoint.visitedEvents.filter((visit: unknown) => !DISCOVERIES[gallery].some(id => visit === id));
  return visits.length === checkpoint.visitedEvents.length ? checkpoint : { ...checkpoint, visitedEvents: visits };
}

function withoutStoredVisits(raw: string | null, gallery: GalleryTaskArea, draft = false): string | null {
  if (raw === null) return null;
  let saved: unknown;
  try { saved = JSON.parse(raw); }
  catch { return raw; }
  if (!isRecord(saved)) return raw;
  const checkpoint = draft ? saved.checkpoint : saved;
  const next = withoutVisits(checkpoint, gallery);
  if (next === checkpoint) return raw;
  return JSON.stringify(draft ? { ...saved, checkpoint: next } : next);
}

function stageSessionChanges(changes: StorageChange[], gallery: GalleryTaskArea, store: ResettableStorage, extraCheckpointKey?: string) {
  const checkpointKeys = new Set([FIRST_GALLERY_WORLD_SESSION_KEY, STANDALONE_CHECKPOINT[gallery], extraCheckpointKey]);
  for (const key of checkpointKeys) {
    if (key) stage(changes, store, key, raw => withoutStoredVisits(raw, gallery));
  }
  stage(changes, store, FIRST_GALLERY_ENTRY_KEY, raw => withoutStoredVisits(raw, gallery, true));
  if (gallery === 'first') stage(changes, store, FIRST_GALLERY_MURAL_MARKER_KEY, () => null);
}

/** Local storage changes are shared between tabs, but walk checkpoints are per tab. */
export function clearGallerySessionProgress(gallery: GalleryTaskArea, session?: ResettableStorage, extraCheckpointKey?: string): ResetResult {
  try {
    const changes: StorageChange[] = [];
    stageSessionChanges(changes, gallery, session ?? window.sessionStorage, extraCheckpointKey);
    return commit(changes);
  } catch {
    return { ok: false, message: STORAGE_ERROR };
  }
}

export function resetGalleryProgress(gallery: GalleryTaskArea,
  stores?: { local: ResettableStorage; session: ResettableStorage }, extraCheckpointKey?: string): ResetResult {
  try {
    const { local, session } = stores ?? { local: window.localStorage, session: window.sessionStorage };
    const changes: StorageChange[] = [];
    stageSessionChanges(changes, gallery, session, extraCheckpointKey);
    if (gallery === 'first') {
      stage(changes, local, FIRST_GALLERY_STORAGE_KEY, raw => raw === null ? null : firstGalleryRecordWithoutProgress(raw));
    } else {
      const keys = gallery === 'music' ? MUSIC_GALLERY_PROGRESS_KEYS
        : [MOGAO_EXHIBIT_PROGRESS_KEY, ...MOGAO_HALL_A_PROGRESS_KEYS, MOGAO_GAME_NOTICE_KEY];
      for (const key of keys) stage(changes, local, key, () => null);
    }
    const key = galleryProgressResetKey(gallery);
    const signal = { store: local, key, before: local.getItem(key), after: crypto.getRandomValues(new Uint32Array(4)).join('-') };
    changes.push(signal);
    return commit(changes, signal);
  } catch {
    return { ok: false, message: STORAGE_ERROR };
  }
}
