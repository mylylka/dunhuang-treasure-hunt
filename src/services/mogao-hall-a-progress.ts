import type { MogaoHallAStoryId } from '../content/world/mogao-hall-a-layout-v001';
import type { StorageLike } from './progress';

export type MogaoMuralCompletionId = MogaoHallAStoryId | 'story-demo' | 'novice-story';

const HALL_STORIES: readonly MogaoHallAStoryId[] = ['bandits', 'burning-house'];
const STORIES: readonly MogaoMuralCompletionId[] = [...HALL_STORIES, 'story-demo', 'novice-story'];
const LEGACY_PREFIX = 'dunhuang:mogao-hall-a:progress:v1';
const PREFIX = 'dunhuang:mogao-hall-a:progress:v2';
const AWARD_KEY = `${PREFIX}:award`;
const OPENED_KEY = `${PREFIX}:opened`;
export const MOGAO_HALL_A_PROGRESS_KEYS = [
  ...STORIES.map(id => `${PREFIX}:${id}`), AWARD_KEY, OPENED_KEY,
  ...HALL_STORIES.map(id => `${LEGACY_PREFIX}:${id}`), `${LEGACY_PREFIX}:award`, `${LEGACY_PREFIX}:opened`,
  'dunhuang:mogao-hall-a:intro:v1',
] as const;

export interface MogaoHallAProgress {
  completed: MogaoMuralCompletionId[];
  opened: boolean;
  noticeSeen: boolean;
  legacyUnlocked?: true;
}

export const emptyMogaoHallAProgress = (): MogaoHallAProgress => ({ completed: [], opened: false, noticeSeen: false });

export function finishedMogaoHallA(progress: MogaoHallAProgress): boolean {
  return progress.legacyUnlocked === true || STORIES.every(id => progress.completed.includes(id));
}

function readProgress(source: StorageLike): MogaoHallAProgress {
  const legacyCompleted: readonly MogaoMuralCompletionId[] = HALL_STORIES.filter(id => source.getItem(`${LEGACY_PREFIX}:${id}`) === 'complete');
  const legacyUnlocked = legacyCompleted.length === HALL_STORIES.length;
  const completed = STORIES.filter(id => legacyCompleted.includes(id) || source.getItem(`${PREFIX}:${id}`) === 'complete');
  const opened = HALL_STORIES.some(id => completed.includes(id)) || source.getItem(OPENED_KEY) === 'yes'
    || source.getItem(`${LEGACY_PREFIX}:opened`) === 'yes';
  const data: MogaoHallAProgress = { completed, opened, noticeSeen: false, ...(legacyUnlocked ? { legacyUnlocked: true } : {}) };
  data.noticeSeen = finishedMogaoHallA(data) && (source.getItem(AWARD_KEY) === 'received'
    || (legacyUnlocked && source.getItem(`${LEGACY_PREFIX}:award`) === 'received'));
  return data;
}

export function loadMogaoHallAProgress(storage?: StorageLike) {
  try {
    return { data: readProgress(storage ?? window.localStorage), warning: null };
  } catch {
    return { data: emptyMogaoHallAProgress(), warning: '暂时读不到绘世厅的观赏记录。' };
  }
}

export function saveMogaoHallAProgress(next: MogaoHallAProgress, storage?: StorageLike) {
  try {
    const target = storage ?? window.localStorage;
    // Only the old namespace can grant the old two-story unlock. Story keys stay monotonic across tabs.
    for (const id of STORIES) {
      if (next.completed.includes(id)) target.setItem(`${PREFIX}:${id}`, 'complete');
    }
    if (next.opened && !HALL_STORIES.some(id => next.completed.includes(id))) target.setItem(OPENED_KEY, 'yes');
    const saved = readProgress(target);
    if (next.noticeSeen && !saved.noticeSeen && finishedMogaoHallA(saved)) {
      target.setItem(AWARD_KEY, 'received');
      saved.noticeSeen = true;
    }
    return { data: saved, warning: null };
  } catch {
    return { data: next, warning: '绘世厅的观赏记录暂未保存，本次可以继续。' };
  }
}
