import flyingArt from '../content/world/flying-history-art-v001.json';
import { MUSIC_INSTRUMENTS, getMusicInstrument, type MusicInstrumentId } from '../content/world/music-instruments-v001';
import type { StorageLike } from './progress';

export const MUSIC_GALLERY_PROGRESS_KEY = 'dunhuang:music-gallery:progress:v1';
export const MUSIC_GALLERY_CHAPTERS = flyingArt.length;
const chapters = Array.from({ length: MUSIC_GALLERY_CHAPTERS }, (_, index) => index);

export interface MusicGalleryProgress {
  chapters: number[];
  instruments: MusicInstrumentId[];
  dressed: boolean;
  awardReceived: boolean;
}

export type MusicGalleryDiscovery = { type: 'chapter'; index: number } | { type: 'instrument'; id: MusicInstrumentId }
  | { type: 'outfit' } | { type: 'receive' };

const empty = (): MusicGalleryProgress => ({ chapters: [], instruments: [], dressed: false, awardReceived: false });
const key = (part: string) => `${MUSIC_GALLERY_PROGRESS_KEY}:${part}`;
const guideApproachKey = key('guide-approach');
export const MUSIC_GALLERY_PROGRESS_KEYS = [
  ...chapters.map(index => key(`chapter:${index + 1}`)),
  ...MUSIC_INSTRUMENTS.map(instrument => key(`instrument:${instrument.id}`)),
  key('outfit'), key('award'), key('unlock-notice'), guideApproachKey,
] as const;

export function completedMusicGalleryChallenges(progress: MusicGalleryProgress) {
  const allChapters = chapters.every(index => progress.chapters.includes(index));
  const allInstruments = MUSIC_INSTRUMENTS.every(instrument => progress.instruments.includes(instrument.id));
  return Number(progress.dressed) + Number(allChapters) + Number(allInstruments);
}

export function finishedMusicGallery(progress: MusicGalleryProgress) {
  return completedMusicGalleryChallenges(progress) === 3;
}

export function loadMusicGalleryProgress(storage?: StorageLike): MusicGalleryProgress {
  try {
    const store = storage ?? window.localStorage;
    const has = (part: string) => store.getItem(key(part)) === 'yes';
    const progress = {
      chapters: chapters.filter(index => has(`chapter:${index + 1}`)),
      instruments: MUSIC_INSTRUMENTS.map(item => item.id).filter(id => has(`instrument:${id}`)),
      dressed: has('outfit'),
      awardReceived: false,
    };
    progress.awardReceived = finishedMusicGallery(progress) && has('award');
    return progress;
  } catch { return empty(); }
}

export function hasApproachedMusicGalleryGuide(storage?: StorageLike): boolean {
  try {
    const store = storage ?? window.localStorage;
    if (store.getItem(guideApproachKey) === 'yes') return true;
    const progress = loadMusicGalleryProgress(store);
    return progress.dressed || progress.chapters.length > 0 || progress.instruments.length > 0;
  } catch { return false; }
}

export function rememberMusicGalleryGuideApproach(storage?: StorageLike) {
  try { (storage ?? window.localStorage).setItem(guideApproachKey, 'yes'); }
  catch { /* The current runtime still remembers the completed approach. */ }
}

export function claimMusicGalleryUnlockNotice(storage?: StorageLike): boolean {
  try {
    const store = storage ?? window.localStorage;
    const notice = key('unlock-notice');
    if (store.getItem(notice) === 'yes') return false;
    store.setItem(notice, 'yes');
  } catch {
    // Keep the notice available during this visit if storage is unavailable.
  }
  return true;
}

export function withMusicGalleryDiscovery(progress: MusicGalleryProgress, discovery: MusicGalleryDiscovery): MusicGalleryProgress {
  switch (discovery.type) {
    case 'chapter':
      return !chapters.includes(discovery.index) || progress.chapters.includes(discovery.index)
        ? progress : { ...progress, chapters: [...progress.chapters, discovery.index] };
    case 'instrument':
      return !getMusicInstrument(discovery.id) || progress.instruments.includes(discovery.id)
        ? progress : { ...progress, instruments: [...progress.instruments, discovery.id] };
    case 'outfit':
      return progress.dressed ? progress : { ...progress, dressed: true };
    case 'receive':
      return progress.awardReceived || !finishedMusicGallery(progress) ? progress : { ...progress, awardReceived: true };
  }
}

export function mergeMusicGalleryProgress(left: MusicGalleryProgress, right: MusicGalleryProgress): MusicGalleryProgress {
  return {
    chapters: [...new Set([...left.chapters, ...right.chapters])],
    instruments: [...new Set([...left.instruments, ...right.instruments])],
    dressed: left.dressed || right.dressed,
    awardReceived: left.awardReceived || right.awardReceived,
  };
}

export function saveMusicGalleryProgress(progress: MusicGalleryProgress, storage?: StorageLike): boolean {
  try {
    const store = storage ?? window.localStorage;
    const mark = (part: string) => {
      if (store.getItem(key(part)) !== 'yes') store.setItem(key(part), 'yes');
    };
    // Independent keys let simultaneous tabs contribute without replacing one another's discoveries.
    for (const index of progress.chapters) mark(`chapter:${index + 1}`);
    for (const id of progress.instruments) mark(`instrument:${id}`);
    if (progress.dressed) mark('outfit');
    if (progress.awardReceived && finishedMusicGallery(progress)) mark('award');
    return true;
  } catch { return false; }
}
