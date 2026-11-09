import { describe, expect, it } from 'vitest';
import { MOGAO_EXHIBIT } from '../../src/content/world/mogao-exhibit-v001';
import { MUSIC_INSTRUMENTS } from '../../src/content/world/music-instruments-v001';
import { emptyFirstGallery, FIRST_GALLERY_STORAGE_KEY } from '../../src/services/first-gallery';
import { unlockedGameThemes } from '../../src/services/game-world-access';
import { saveMogaoExhibitProgress } from '../../src/services/mogao-exhibit-progress';
import { saveMogaoHallAProgress } from '../../src/services/mogao-hall-a-progress';
import { MUSIC_GALLERY_CHAPTERS, saveMusicGalleryProgress } from '../../src/services/music-gallery-progress';

describe('游戏世界主题', () => {
  it('只显示已完成的馆，并能从已有记录逐个恢复', () => {
    const values = new Map<string, string>();
    const store = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(unlockedGameThemes(store)).toEqual([]);
    const artwork = { artworkId: 'saved', levelId: 'coloring-feitian-lotus', artworkVersion: '1', colors: { 1: '#aa3322' }, materials: {}, submittedAt: '2026-11-05T12:00:00.000Z' };
    store.setItem(FIRST_GALLERY_STORAGE_KEY, JSON.stringify({ ...emptyFirstGallery(), muralParts: ['lotus', 'bird', 'grapes'], caissonCompleted: true, coloringCompleted: true, artworks: { saved: artwork }, displayedArtworkId: 'saved' }));
    expect(unlockedGameThemes(store)).toEqual(['patterns']);
    saveMusicGalleryProgress({ chapters: Array.from({ length: MUSIC_GALLERY_CHAPTERS }, (_, index) => index),
      instruments: MUSIC_INSTRUMENTS.map(item => item.id), dressed: true, awardReceived: false }, store);
    expect(unlockedGameThemes(store)).toEqual(['patterns', 'music']);
    saveMogaoExhibitProgress({ version: 1, viewed: MOGAO_EXHIBIT.items.map(item => item.id), introSeen: true, noticeSeen: true }, store);
    saveMogaoHallAProgress({ completed: ['bandits', 'burning-house'], opened: true, noticeSeen: false }, store);
    expect(unlockedGameThemes(store)).toEqual(['patterns', 'music']);
    saveMogaoHallAProgress({ completed: ['story-demo', 'novice-story'], opened: true, noticeSeen: true }, store);
    expect(unlockedGameThemes(store)).toEqual(['patterns', 'music', 'stories']);
  });
});
