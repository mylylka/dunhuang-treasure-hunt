import { loadMogaoExhibitProgress } from './mogao-exhibit-progress';
import { loadMogaoHallAProgress } from './mogao-hall-a-progress';
import type { StorageLike } from './progress';

export const MOGAO_GAME_NOTICE_KEY = 'dunhuang:mogao-story-games:notice:v1';

export function hasMogaoGameAccess(storage?: StorageLike): boolean {
  return loadMogaoHallAProgress(storage).data.noticeSeen && loadMogaoExhibitProgress(storage).data.noticeSeen;
}

export function claimMogaoGameNotice(storage?: StorageLike): boolean {
  try {
    const target = storage ?? window.localStorage;
    if (target.getItem(MOGAO_GAME_NOTICE_KEY) === 'shown') return false;
    target.setItem(MOGAO_GAME_NOTICE_KEY, 'shown');
  } catch {
    // The current visit can still see the notice when storage is unavailable.
  }
  return true;
}
