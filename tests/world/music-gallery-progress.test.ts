import { describe, expect, it } from 'vitest';
import { MUSIC_INSTRUMENTS } from '../../src/content/world/music-instruments-v001';
import {
  claimMusicGalleryUnlockNotice, finishedMusicGallery, loadMusicGalleryProgress, mergeMusicGalleryProgress, MUSIC_GALLERY_CHAPTERS,
  saveMusicGalleryProgress, withMusicGalleryDiscovery,
} from '../../src/services/music-gallery-progress';

const memory = () => {
  const items = new Map<string, string>();
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); } };
};

describe('music gallery exploration progress', () => {
  it('requires every distinct chapter, every instrument and a historical outfit', () => {
    const store = memory();
    let progress = loadMusicGalleryProgress(store);
    for (const { id } of MUSIC_INSTRUMENTS) progress = withMusicGalleryDiscovery(progress, { type: 'instrument', id });
    progress = withMusicGalleryDiscovery(progress, { type: 'outfit' });
    const last = { type: 'chapter', index: MUSIC_GALLERY_CHAPTERS - 1 } as const;
    progress = withMusicGalleryDiscovery(progress, last);
    expect(withMusicGalleryDiscovery(progress, last)).toBe(progress);
    expect(withMusicGalleryDiscovery(progress, { type: 'chapter', index: MUSIC_GALLERY_CHAPTERS })).toBe(progress);
    expect(withMusicGalleryDiscovery(progress, { type: 'receive' })).toBe(progress);
    expect(finishedMusicGallery(progress)).toBe(false);
    for (let index = 0; index < MUSIC_GALLERY_CHAPTERS - 1; index++) {
      progress = withMusicGalleryDiscovery(progress, { type: 'chapter', index });
    }
    expect(finishedMusicGallery(progress)).toBe(true);
    expect(saveMusicGalleryProgress(progress, store)).toBe(true);
    const reloaded = loadMusicGalleryProgress(store);
    expect(finishedMusicGallery(reloaded)).toBe(true);
    expect(reloaded.awardReceived).toBe(false);
    saveMusicGalleryProgress(withMusicGalleryDiscovery(reloaded, { type: 'receive' }), store);
    expect(loadMusicGalleryProgress(store).awardReceived).toBe(true);
    expect(claimMusicGalleryUnlockNotice(store)).toBe(true);
    expect(claimMusicGalleryUnlockNotice(store)).toBe(false);
  });

  it('keeps discoveries from independently saving tabs', () => {
    const store = memory();
    const blank = loadMusicGalleryProgress(store);
    const first = withMusicGalleryDiscovery(blank, { type: 'chapter', index: 3 });
    const second = withMusicGalleryDiscovery(blank, { type: 'instrument', id: 'pipa' });
    saveMusicGalleryProgress(first, store);
    saveMusicGalleryProgress(second, store);
    const expected = { chapters: [3], instruments: ['pipa'], dressed: false, awardReceived: false };
    expect(loadMusicGalleryProgress(store)).toEqual(expected);
    expect(mergeMusicGalleryProgress(first, second)).toEqual(expected);
  });
});
