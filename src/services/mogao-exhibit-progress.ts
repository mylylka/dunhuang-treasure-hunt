import { getMogaoExhibit, MOGAO_EXHIBIT, type MogaoExhibitId } from '../content/world/mogao-exhibit-v001';
import type { StorageLike } from './progress';

export const MOGAO_EXHIBIT_PROGRESS_KEY = 'dunhuang:mogao-exhibit:progress:v1';

export interface MogaoExhibitProgress {
  version: 1;
  viewed: MogaoExhibitId[];
  introSeen: boolean;
  wallThemeOpened?: true;
  noticeSeen: boolean;
}

export const emptyMogaoExhibitProgress = (): MogaoExhibitProgress => ({
  version: 1, viewed: [], introSeen: false, noticeSeen: false,
});

export function finishedMogaoExhibit(progress: MogaoExhibitProgress): boolean {
  return MOGAO_EXHIBIT.items.every(item => progress.viewed.includes(item.id));
}

export function openedMogaoExhibit(progress: MogaoExhibitProgress): boolean {
  return progress.viewed.length > 0 || progress.wallThemeOpened === true;
}

function parseProgress(raw: string | null): MogaoExhibitProgress {
  if (raw === null) return emptyMogaoExhibitProgress();
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 ||
      !('viewed' in value) || !Array.isArray(value.viewed)) throw new Error('invalid-exhibit-progress');
  const viewed = [...new Set<MogaoExhibitId>(value.viewed.flatMap((id: unknown) => {
    const entry = typeof id === 'string' ? getMogaoExhibit(id) : undefined;
    return entry ? [entry.id] : [];
  }))];
  return {
    version: 1, viewed,
    introSeen: 'introSeen' in value && value.introSeen === true,
    ...('wallThemeOpened' in value && value.wallThemeOpened === true ? { wallThemeOpened: true as const } : {}),
    noticeSeen: viewed.length === MOGAO_EXHIBIT.items.length && 'noticeSeen' in value && value.noticeSeen === true,
  };
}

export function loadMogaoExhibitProgress(storage?: StorageLike) {
  try { return { data: parseProgress((storage ?? window.localStorage).getItem(MOGAO_EXHIBIT_PROGRESS_KEY)), warning: null }; }
  catch { return { data: emptyMogaoExhibitProgress(), warning: '暂时读不到观展记录。' }; }
}

export function saveMogaoExhibitProgress(next: MogaoExhibitProgress, storage?: StorageLike) {
  try {
    const target = storage ?? window.localStorage;
    const raw = target.getItem(MOGAO_EXHIBIT_PROGRESS_KEY);
    let previous = emptyMogaoExhibitProgress();
    try { previous = parseProgress(raw); }
    catch { /* This version can recover its own unreadable snapshot on a new save. */ }
    const data: MogaoExhibitProgress = {
      version: 1, viewed: [...new Set([...previous.viewed, ...next.viewed])],
      introSeen: previous.introSeen || next.introSeen,
      ...(previous.wallThemeOpened || next.wallThemeOpened ? { wallThemeOpened: true as const } : {}),
      noticeSeen: previous.noticeSeen || next.noticeSeen,
    };
    target.setItem(MOGAO_EXHIBIT_PROGRESS_KEY, JSON.stringify(data));
    return { data, warning: null };
  } catch { return { data: next, warning: '观展记录暂未保存，本次可以继续。' }; }
}

export function viewMogaoExhibit(progress: MogaoExhibitProgress, id: MogaoExhibitId): MogaoExhibitProgress {
  if (!getMogaoExhibit(id) || progress.viewed.includes(id)) return progress;
  return { ...progress, viewed: [...progress.viewed, id] };
}
