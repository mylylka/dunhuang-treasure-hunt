import type { Page } from '@playwright/test';
import { MUSIC_INSTRUMENTS } from '../../src/content/world/music-instruments-v001';

const artworkId = 'finished-gallery-easel';
const finishedAt = '2026-11-03T00:00:00.000Z';
const musicKeys = [
  ...Array.from({ length: 9 }, (_, index) => `chapter:${index + 1}`),
  ...MUSIC_INSTRUMENTS.map(({ id }) => `instrument:${id}`),
  'outfit',
];

export async function unlockPatternsForTest(page: Page) {
  await page.addInitScript(({ artworkId, finishedAt }) => {
    const key = 'dunhuang:first-gallery:v1';
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, JSON.stringify({
      version: 1, muralParts: ['lotus', 'bird', 'grapes'], caissonCompleted: true,
      coloringCompleted: true, ceremonySeen: true, displayedArtworkId: artworkId,
      introductionsSeen: [], firstSuccessSeen: false,
      artworks: {
        [artworkId]: {
          artworkId, levelId: 'coloring-feitian-lotus', artworkVersion: 'fixture-v001',
          colors: { 1: '#886644' }, materials: {}, submittedAt: finishedAt,
        },
      },
    }));
  }, { artworkId, finishedAt });
}

export async function unlockMusicForTest(page: Page) {
  await page.addInitScript(keys => {
    for (const key of keys) localStorage.setItem(`dunhuang:music-gallery:progress:v1:${key}`, 'yes');
  }, musicKeys);
}
