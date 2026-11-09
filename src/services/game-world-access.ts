import { isFirstGalleryUnlocked, loadFirstGallery } from './first-gallery';
import { finishedMusicGallery, loadMusicGalleryProgress } from './music-gallery-progress';
import { hasMogaoGameAccess } from './mogao-game-access';
import type { StorageLike } from './progress';

/** The three game entrances use the same completion records as their halls. */
export function unlockedGameThemes(storage?: StorageLike): string[] {
  const result: string[] = [];
  if (isFirstGalleryUnlocked(loadFirstGallery(storage).data)) result.push('patterns');
  if (finishedMusicGallery(loadMusicGalleryProgress(storage))) result.push('music');
  if (hasMogaoGameAccess(storage)) result.push('stories');
  return result;
}
