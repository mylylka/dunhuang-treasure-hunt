import { describe, expect, it } from 'vitest';
import { MOGAO_EXHIBIT } from '../../src/content/world/mogao-exhibit-v001';
import { MUSIC_INSTRUMENTS } from '../../src/content/world/music-instruments-v001';
import { ARTWORKS_KEY, LEGACY_ARTWORKS_KEY } from '../../src/services/artworks';
import { FIRST_GALLERY_ENTRY_KEY, FIRST_GALLERY_MURAL_MARKER_KEY, FIRST_GALLERY_WORLD_SESSION_KEY } from '../../src/services/first-gallery-entry';
import { emptyFirstGallery, FIRST_GALLERY_STORAGE_KEY, loadFirstGallery } from '../../src/services/first-gallery';
import { unlockedGameThemes } from '../../src/services/game-world-access';
import { clearGallerySessionProgress, galleryForProgressResetKey, galleryProgressResetKey, resetGalleryProgress, type ResettableStorage } from '../../src/services/gallery-progress-reset';
import { emptyMogaoExhibitProgress, loadMogaoExhibitProgress, saveMogaoExhibitProgress } from '../../src/services/mogao-exhibit-progress';
import { claimMogaoGameNotice } from '../../src/services/mogao-game-access';
import { emptyMogaoHallAProgress, loadMogaoHallAProgress, saveMogaoHallAProgress } from '../../src/services/mogao-hall-a-progress';
import { claimMusicGalleryUnlockNotice, hasApproachedMusicGalleryGuide, loadMusicGalleryProgress, MUSIC_GALLERY_CHAPTERS, rememberMusicGalleryGuideApproach, saveMusicGalleryProgress } from '../../src/services/music-gallery-progress';
import { PROGRESS_KEY } from '../../src/services/progress';
import { MOGAO_EXHIBIT_SESSION_KEY } from '../../src/world/mogao-exhibit-session';
import { MUSIC_COMPANION_SESSION_KEY_V2 } from '../../src/world/music-companion-session-v002';

function memoryStorage() {
  const values = new Map<string, string>();
  const storage: ResettableStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); },
  };
  return { storage, values };
}

const submittedAt = '2026-11-09T10:00:00.000Z';
const artworks = { painting: { artworkId: 'painting', levelId: 'coloring-feitian-lotus', artworkVersion: 'v1',
  colors: { 1: '#b04e38' }, materials: { 1: 'sparkle-gold-v001' }, submittedAt } };
const checkpoint = { version: 1, position: { x: 2, z: 3 }, heading: 1, cameraYaw: 2, walkSurface: 'ground',
  visitedEvents: ['caisson', 'story-demo', 'novice-story', 'flying'] };
const draft = { draft: { colors: { 1: '#00ff00' }, materials: {} }, checkpoint };

function seed() {
  const local = memoryStorage();
  const session = memoryStorage();
  local.storage.setItem(FIRST_GALLERY_STORAGE_KEY, JSON.stringify({ ...emptyFirstGallery(),
    muralParts: ['lotus', 'bird', 'grapes'], caissonCompleted: true, coloringCompleted: true,
    ceremonySeen: true, introductionsSeen: ['easel'], firstSuccessSeen: true, artworks, displayedArtworkId: 'painting',
  }));
  saveMusicGalleryProgress({ chapters: Array.from({ length: MUSIC_GALLERY_CHAPTERS }, (_, index) => index),
    instruments: MUSIC_INSTRUMENTS.map(item => item.id), dressed: true, awardReceived: true }, local.storage);
  claimMusicGalleryUnlockNotice(local.storage);
  saveMogaoExhibitProgress({ version: 1, viewed: MOGAO_EXHIBIT.items.map(item => item.id), introSeen: true,
    wallThemeOpened: true, noticeSeen: true }, local.storage);
  saveMogaoHallAProgress({ ...emptyMogaoHallAProgress(), opened: true }, local.storage);
  const legacy = 'dunhuang:mogao-hall-a:progress:v1';
  local.storage.setItem(`${legacy}:bandits`, 'complete');
  local.storage.setItem(`${legacy}:burning-house`, 'complete');
  local.storage.setItem(`${legacy}:opened`, 'yes');
  local.storage.setItem(`${legacy}:award`, 'received');
  local.storage.setItem('dunhuang:mogao-hall-a:intro:v1', 'seen');
  saveMogaoHallAProgress({ completed: ['bandits', 'burning-house', 'story-demo', 'novice-story'],
    opened: true, noticeSeen: true }, local.storage);
  claimMogaoGameNotice(local.storage);
  local.storage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, completed: { 'music-hidden-objects-intro': submittedAt },
    settings: { reducedMotion: true } }));
  local.storage.setItem(LEGACY_ARTWORKS_KEY, 'older ordinary artwork');
  local.storage.setItem(ARTWORKS_KEY, 'current ordinary artwork');
  for (const key of [FIRST_GALLERY_WORLD_SESSION_KEY, MUSIC_COMPANION_SESSION_KEY_V2, MOGAO_EXHIBIT_SESSION_KEY]) {
    session.storage.setItem(key, JSON.stringify(checkpoint));
  }
  session.storage.setItem(FIRST_GALLERY_ENTRY_KEY, JSON.stringify(draft));
  session.storage.setItem(FIRST_GALLERY_MURAL_MARKER_KEY, '1');
  return { local, session, stores: { local: local.storage, session: session.storage } };
}

describe('按馆清除进度', () => {
  it('clears the first gallery through its original record while keeping submitted work and the current draft', () => {
    const { local, session, stores } = seed();
    const ordinaryProgress = stores.local.getItem(PROGRESS_KEY);
    expect(unlockedGameThemes(stores.local)).toEqual(['patterns', 'music', 'stories']);
    expect(resetGalleryProgress('first', stores)).toEqual({ ok: true });
    expect(loadFirstGallery(stores.local).data).toEqual({ ...emptyFirstGallery(), artworks });
    expect(unlockedGameThemes(stores.local)).toEqual(['music', 'stories']);
    expect(local.values.get(LEGACY_ARTWORKS_KEY)).toBe('older ordinary artwork');
    expect(local.values.get(ARTWORKS_KEY)).toBe('current ordinary artwork');
    expect(local.values.get(PROGRESS_KEY)).toBe(ordinaryProgress);
    expect(session.values.has(FIRST_GALLERY_MURAL_MARKER_KEY)).toBe(false);
    const next = { ...checkpoint, visitedEvents: ['story-demo', 'novice-story', 'flying'] };
    expect(session.values.get(FIRST_GALLERY_WORLD_SESSION_KEY)).toBe(JSON.stringify(next));
    expect(session.values.get(FIRST_GALLERY_ENTRY_KEY)).toBe(JSON.stringify({ ...draft, checkpoint: next }));
    expect(session.values.get(MUSIC_COMPANION_SESSION_KEY_V2)).toBe(JSON.stringify(checkpoint));
  });

  it('clears all music challenges and lets its notice be claimed again', () => {
    const { local, session, stores } = seed();
    expect(hasApproachedMusicGalleryGuide(stores.local)).toBe(true);
    rememberMusicGalleryGuideApproach(stores.local);
    expect(resetGalleryProgress('music', stores)).toEqual({ ok: true });
    expect(hasApproachedMusicGalleryGuide(stores.local)).toBe(false);
    expect(loadMusicGalleryProgress(stores.local)).toEqual({ chapters: [], instruments: [], dressed: false, awardReceived: false });
    expect(claimMusicGalleryUnlockNotice(stores.local)).toBe(true);
    expect(unlockedGameThemes(stores.local)).toEqual(['patterns', 'stories']);
    const key = galleryProgressResetKey('music');
    const firstSignal = local.values.get(key);
    expect(firstSignal).toEqual(expect.any(String));
    expect(galleryForProgressResetKey(key)).toBe('music');
    expect(galleryForProgressResetKey(PROGRESS_KEY)).toBeUndefined();
    const next = JSON.stringify({ ...checkpoint, visitedEvents: ['caisson', 'story-demo', 'novice-story'] });
    expect(session.values.get(FIRST_GALLERY_WORLD_SESSION_KEY)).toBe(next);
    expect(session.values.get(MUSIC_COMPANION_SESSION_KEY_V2)).toBe(next);
    expect(session.values.get(MOGAO_EXHIBIT_SESSION_KEY)).toBe(JSON.stringify(checkpoint));
    expect(resetGalleryProgress('music', stores)).toEqual({ ok: true });
    expect(local.values.get(key)).not.toBe(firstSignal);
  });

  it('removes both versions of Mogao mural unlocks, exhibition introductions and the game notice', () => {
    const { local, session, stores } = seed();
    expect(resetGalleryProgress('mogao', stores)).toEqual({ ok: true });
    expect(loadMogaoHallAProgress(stores.local).data).toEqual(emptyMogaoHallAProgress());
    expect(loadMogaoExhibitProgress(stores.local).data).toEqual(emptyMogaoExhibitProgress());
    expect(local.values.has('dunhuang:mogao-hall-a:intro:v1')).toBe(false);
    expect(claimMogaoGameNotice(stores.local)).toBe(true);
    expect(unlockedGameThemes(stores.local)).toEqual(['patterns', 'music']);
    expect(session.values.get(MOGAO_EXHIBIT_SESSION_KEY)).toBe(JSON.stringify({ ...checkpoint, visitedEvents: ['caisson', 'flying'] }));
    expect(session.values.get(FIRST_GALLERY_MURAL_MARKER_KEY)).toBe('1');
  });

  it('clears a second tab’s visits, including its active checkpoint, without writing shared progress', () => {
    const { local, session } = seed();
    const before = new Map(local.values);
    const active = 'legacy-world-checkpoint';
    session.storage.setItem(active, JSON.stringify(checkpoint));
    expect(clearGallerySessionProgress('mogao', session.storage, active)).toEqual({ ok: true });
    expect(session.values.get(active)).toBe(JSON.stringify({ ...checkpoint, visitedEvents: ['caisson', 'flying'] }));
    expect(local.values).toEqual(before);
  });

  it('restores earlier writes if the reset signal fails to persist', () => {
    const { local, session, stores } = seed();
    const previousLocal = new Map(local.values);
    const previousSession = new Map(session.values);
    const write = stores.local.setItem;
    stores.local.setItem = (key, value) => {
      if (key === galleryProgressResetKey('music')) throw new Error('storage full');
      write(key, value);
    };
    expect(resetGalleryProgress('music', stores)).toMatchObject({ ok: false });
    expect(local.values).toEqual(previousLocal);
    expect(session.values).toEqual(previousSession);
  });

  it('preserves an unreadable first-gallery artwork record and leaves the reset pending for retry', () => {
    const { local, session, stores } = seed();
    local.storage.setItem(FIRST_GALLERY_STORAGE_KEY, '{unreadable artwork');
    expect(resetGalleryProgress('first', stores)).toMatchObject({ ok: false });
    expect(local.values.get(FIRST_GALLERY_STORAGE_KEY)).toBe('{unreadable artwork');
    expect(local.values.has(galleryProgressResetKey('first'))).toBe(false);
    expect(session.values.get(FIRST_GALLERY_MURAL_MARKER_KEY)).toBe('1');
  });
});
