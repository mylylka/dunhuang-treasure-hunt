import { describe, expect, it } from 'vitest';
import { emptyFirstGallery } from '../../src/services/first-gallery';
import { firstGalleryTasks, mogaoGalleryTasks, musicGalleryTasks } from '../../src/services/gallery-tasks';
import { emptyMogaoExhibitProgress, viewMogaoExhibit } from '../../src/services/mogao-exhibit-progress';
import { loadMogaoHallAProgress } from '../../src/services/mogao-hall-a-progress';
import { loadMusicGalleryProgress, withMusicGalleryDiscovery } from '../../src/services/music-gallery-progress';

describe('gallery task progress', () => {
  it('lists each courtyard challenge and reports mural progress without revealing the pieces', () => {
    const groups = firstGalleryTasks({ ...emptyFirstGallery(), muralParts: ['bird'], caissonCompleted: true });
    expect(groups).toEqual([
      { label: '借物补画', complete: false, progress: { completed: 1, total: 3 } },
      { label: '三兔共耳', complete: true },
      { label: '画架设色', complete: false },
    ]);
    const [mural] = firstGalleryTasks({ ...emptyFirstGallery(), muralParts: ['lotus', 'bird', 'grapes'] });
    expect(mural).toEqual({ label: '借物补画', complete: true, progress: { completed: 3, total: 3 } });
  });

  it('uses recorded chapters, instruments and historical wardrobe changes', () => {
    const initial = loadMusicGalleryProgress({ getItem: () => null, setItem: () => {} });
    const chapter = withMusicGalleryDiscovery(initial, { type: 'chapter', index: 0 });
    const instrument = withMusicGalleryDiscovery(chapter, { type: 'instrument', id: 'pipa' });
    const [chapters, instruments, wardrobe] = musicGalleryTasks(withMusicGalleryDiscovery(instrument, { type: 'outfit' }));
    expect(chapters).toEqual({ label: '飞天年代', complete: false, progress: { completed: 1, total: 9 } });
    expect(instruments.progress).toEqual({ completed: 1, total: 12 });
    expect(instruments.items).toHaveLength(12);
    expect(instruments.items?.filter(item => item.complete)).toEqual([{ label: '琵琶', complete: true }]);
    expect(wardrobe).toEqual({ label: '服饰', complete: true });
  });

  it('retains each older mural completion without inventing other viewed works', () => {
    const legacyPrefix = 'dunhuang:mogao-hall-a:progress:v1:';
    const saved = new Map([
      [`${legacyPrefix}bandits`, 'complete'], [`${legacyPrefix}burning-house`, 'complete'],
    ]);
    const { data: murals } = loadMogaoHallAProgress({ getItem: key => saved.get(key) ?? null, setItem: () => {} });
    const [stories, exhibits] = mogaoGalleryTasks(murals, viewMogaoExhibit(emptyMogaoExhibitProgress(), 'C03'));
    expect(murals.legacyUnlocked).toBe(true);
    expect(stories.items).toEqual([
      { label: '九色鹿王本生', complete: false }, { label: '沙弥守戒', complete: false },
      { label: '五百强盗成佛图', complete: true }, { label: '火宅喻', complete: true },
    ]);
    expect(exhibits.items).toHaveLength(12);
    expect(exhibits.items?.filter(item => item.complete)).toEqual([{ label: '十一面千手千眼观音', complete: true }]);
  });
});
