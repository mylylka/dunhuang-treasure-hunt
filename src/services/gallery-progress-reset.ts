import { MOGAO_EXHIBIT_SESSION_KEY } from '../world/mogao-exhibit-session';
import { MUSIC_COMPANION_SESSION_KEY_V2 } from '../world/music-companion-session-v002';
import type { DiscoveryId, WorldCheckpoint } from '../world/types';
import { CAISSON_ONLY_MURAL_MARKER_KEY, CAISSON_ONLY_WORLD_SESSION_KEY, FIRST_GALLERY_ENTRY_KEY, FIRST_GALLERY_MURAL_MARKER_KEY, FIRST_GALLERY_WORLD_SESSION_KEY } from './first-gallery-entry';
import { CAISSON_ONLY_GALLERY_STORAGE_KEY, FIRST_GALLERY_STORAGE_KEY, firstGalleryRecordWithoutProgress, firstGalleryRecordWithoutTask } from './first-gallery';
import { galleryTaskResetOptions, type GalleryTaskArea, type GalleryTaskId } from './gallery-tasks';
import { MOGAO_EXHIBIT_PROGRESS_KEY } from './mogao-exhibit-progress';
import { MOGAO_GAME_NOTICE_KEY, mogaoTaskProgressKeys } from './mogao-game-access';
import { MOGAO_HALL_A_PROGRESS_KEYS } from './mogao-hall-a-progress';
import { MUSIC_GALLERY_PROGRESS_KEYS, musicTaskProgressKeys } from './music-gallery-progress';
import type { StorageLike } from './progress';

export interface ResettableStorage extends StorageLike {
  removeItem(key: string): void;
}

type ResetResult = { ok: true } | { ok: false; message: string };
type StorageChange = { store: ResettableStorage; key: string; before: string | null; after: string | null };

const DISCOVERIES: Record<GalleryTaskArea, readonly DiscoveryId[]> = {
  first: ['caisson'], music: ['flying'], mogao: ['story-demo', 'novice-story'],
};
const TASK_DISCOVERIES: Partial<Record<GalleryTaskId, readonly DiscoveryId[]>> = {
  caisson: DISCOVERIES.first, chapters: DISCOVERIES.music, murals: DISCOVERIES.mogao,
};
const STANDALONE_CHECKPOINT: Partial<Record<GalleryTaskArea, string>> = {
  music: MUSIC_COMPANION_SESSION_KEY_V2,
  mogao: MOGAO_EXHIBIT_SESSION_KEY,
};
const STORAGE_ERROR = '暂时无法清除所选进度，请重试。';
const GALLERIES: readonly GalleryTaskArea[] = ['first', 'music', 'mogao'];

export function galleryProgressResetKey(gallery: GalleryTaskArea, compact = false): string {
  return `dunhuang:gallery-reset:v1:${compact ? 'compact:' : ''}${gallery}`;
}

export function galleryForProgressResetKey(key: string | null, compact = false): GalleryTaskArea | undefined {
  if (compact) return key === galleryProgressResetKey('first', true) ? 'first' : undefined;
  return GALLERIES.find(gallery => key === galleryProgressResetKey(gallery));
}

export function galleryTaskProgressResetKey(gallery: GalleryTaskArea, task: GalleryTaskId, compact = false): string {
  return `dunhuang:gallery-task-reset:v1:${compact ? 'compact:' : ''}${gallery}:${task}`;
}

export function galleryResetScopeForKey(key: string | null, compact = false): { gallery: GalleryTaskArea; task?: GalleryTaskId } | undefined {
  if (key === null) return;
  const gallery = galleryForProgressResetKey(key, compact);
  if (gallery) return { gallery };
  for (const area of compact ? ['first'] as const : GALLERIES) {
    const task = galleryTaskResetOptions(area).find(({ id }) => key === galleryTaskProgressResetKey(area, id, compact));
    if (task) return { gallery: area, task: task.id };
  }
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
      return { ok: false, message: '所选进度可能只清除了一部分，请重试。' };
    }
    return { ok: false, message: STORAGE_ERROR };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withoutVisits<T>(checkpoint: T, discoveries: readonly DiscoveryId[]): T {
  if (!isRecord(checkpoint) || !Array.isArray(checkpoint.visitedEvents)) return checkpoint;
  const visits = checkpoint.visitedEvents.filter((visit: unknown) => !discoveries.some(id => visit === id));
  return visits.length === checkpoint.visitedEvents.length ? checkpoint : { ...checkpoint, visitedEvents: visits };
}

function discoveriesForReset(gallery: GalleryTaskArea, task?: GalleryTaskId) {
  return task ? TASK_DISCOVERIES[task] : DISCOVERIES[gallery];
}

export function checkpointAfterGalleryReset(checkpoint: WorldCheckpoint, gallery: GalleryTaskArea, task?: GalleryTaskId): WorldCheckpoint {
  const discoveries = discoveriesForReset(gallery, task);
  return discoveries ? withoutVisits(checkpoint, discoveries) : checkpoint;
}

function withoutStoredVisits(raw: string | null, discoveries: readonly DiscoveryId[], draft = false): string | null {
  if (raw === null) return null;
  let saved: unknown;
  try { saved = JSON.parse(raw); }
  catch { return raw; }
  if (!isRecord(saved)) return raw;
  const checkpoint = draft ? saved.checkpoint : saved;
  const next = withoutVisits(checkpoint, discoveries);
  if (next === checkpoint) return raw;
  return JSON.stringify(draft ? { ...saved, checkpoint: next } : next);
}

function stageSessionChanges(changes: StorageChange[], gallery: GalleryTaskArea, store: ResettableStorage,
  extraCheckpointKey?: string, task?: GalleryTaskId, compact = false) {
  const discoveries = discoveriesForReset(gallery, task);
  if (compact) {
    // The shared coloring-entry key can contain an unfinished draft from the full experience.
    if (discoveries) stage(changes, store, CAISSON_ONLY_WORLD_SESSION_KEY, raw => withoutStoredVisits(raw, discoveries));
    if (!task || task === 'mural') stage(changes, store, CAISSON_ONLY_MURAL_MARKER_KEY, () => null);
    return;
  }
  if (discoveries) {
    const checkpointKeys = new Set([FIRST_GALLERY_WORLD_SESSION_KEY, STANDALONE_CHECKPOINT[gallery], extraCheckpointKey]);
    for (const key of checkpointKeys) {
      if (key) stage(changes, store, key, raw => withoutStoredVisits(raw, discoveries));
    }
    stage(changes, store, FIRST_GALLERY_ENTRY_KEY, raw => withoutStoredVisits(raw, discoveries, true));
  }
  if (gallery === 'first' && (!task || task === 'mural')) stage(changes, store, FIRST_GALLERY_MURAL_MARKER_KEY, () => null);
}

/** Local storage changes are shared between tabs, but walk checkpoints are per tab. */
export function clearGallerySessionProgress(gallery: GalleryTaskArea, session?: ResettableStorage,
  extraCheckpointKey?: string, task?: GalleryTaskId, compact = false): ResetResult {
  try {
    if (compact && gallery !== 'first') return { ok: false, message: STORAGE_ERROR };
    if (task && !galleryTaskResetOptions(gallery).some(option => option.id === task)) return { ok: false, message: STORAGE_ERROR };
    const changes: StorageChange[] = [];
    stageSessionChanges(changes, gallery, session ?? window.sessionStorage, extraCheckpointKey, task, compact);
    return commit(changes);
  } catch {
    return { ok: false, message: STORAGE_ERROR };
  }
}

function stageTaskChanges(changes: StorageChange[], store: ResettableStorage, task: GalleryTaskId, firstGalleryKey: string) {
  switch (task) {
    case 'mural':
    case 'caisson':
    case 'easel':
      stage(changes, store, firstGalleryKey, raw => raw === null ? null : firstGalleryRecordWithoutTask(raw, task));
      break;
    case 'chapters':
    case 'instruments':
    case 'outfit':
      for (const key of musicTaskProgressKeys(task)) stage(changes, store, key, () => null);
      break;
    case 'murals':
    case 'exhibits':
      for (const key of mogaoTaskProgressKeys(task)) stage(changes, store, key, () => null);
      break;
  }
}

export function resetGalleryProgress(gallery: GalleryTaskArea,
  stores?: { local: ResettableStorage; session: ResettableStorage }, extraCheckpointKey?: string,
  task?: GalleryTaskId, compact = false): ResetResult {
  try {
    if (compact && gallery !== 'first') return { ok: false, message: STORAGE_ERROR };
    if (task && !galleryTaskResetOptions(gallery).some(option => option.id === task)) return { ok: false, message: STORAGE_ERROR };
    const { local, session } = stores ?? { local: window.localStorage, session: window.sessionStorage };
    const changes: StorageChange[] = [];
    const firstGalleryKey = compact ? CAISSON_ONLY_GALLERY_STORAGE_KEY : FIRST_GALLERY_STORAGE_KEY;
    stageSessionChanges(changes, gallery, session, extraCheckpointKey, task, compact);
    if (task) {
      stageTaskChanges(changes, local, task, firstGalleryKey);
    } else if (gallery === 'first') {
      stage(changes, local, firstGalleryKey, raw => raw === null ? null : firstGalleryRecordWithoutProgress(raw));
    } else {
      const keys = gallery === 'music' ? MUSIC_GALLERY_PROGRESS_KEYS
        : [MOGAO_EXHIBIT_PROGRESS_KEY, ...MOGAO_HALL_A_PROGRESS_KEYS, MOGAO_GAME_NOTICE_KEY];
      for (const key of keys) stage(changes, local, key, () => null);
    }
    const key = task ? galleryTaskProgressResetKey(gallery, task, compact) : galleryProgressResetKey(gallery, compact);
    const signal = { store: local, key, before: local.getItem(key), after: crypto.getRandomValues(new Uint32Array(4)).join('-') };
    changes.push(signal);
    return commit(changes, signal);
  } catch {
    return { ok: false, message: STORAGE_ERROR };
  }
}
