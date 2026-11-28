import { describe, expect, it } from 'vitest';
import { MOGAO_EXHIBIT } from '../../src/content/world/mogao-exhibit-v001';
import { MUSIC_INSTRUMENTS } from '../../src/content/world/music-instruments-v001';
import { ARTWORKS_KEY, LEGACY_ARTWORKS_KEY } from '../../src/services/artworks';
import { CAISSON_ONLY_MURAL_MARKER_KEY, CAISSON_ONLY_WORLD_SESSION_KEY, FIRST_GALLERY_ENTRY_KEY, FIRST_GALLERY_MURAL_MARKER_KEY, FIRST_GALLERY_WORLD_SESSION_KEY } from '../../src/services/first-gallery-entry';
import { CAISSON_ONLY_GALLERY_STORAGE_KEY, emptyFirstGallery, FIRST_GALLERY_STORAGE_KEY, loadFirstGallery } from '../../src/services/first-gallery';
import { unlockedGameThemes } from '../../src/services/game-world-access';
import { clearGallerySessionProgress, galleryForProgressResetKey, galleryProgressResetKey, galleryResetScopeForKey,
  galleryTaskProgressResetKey, resetGalleryProgress, type ResettableStorage } from '../../src/services/gallery-progress-reset';
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
    ceremonySeen: true, introductionsSeen: ['mural', 'caisson', 'easel'], firstSuccessSeen: true, artworks, displayedArtworkId: 'painting',
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
  it('clears only compact first-gallery progress and its session while preserving both versions of artwork', () => {
    const { local, session, stores } = seed();
    const originalFull = stores.local.getItem(FIRST_GALLERY_STORAGE_KEY);
    const originalProgress = stores.local.getItem(PROGRESS_KEY);
    const originalDraft = stores.session.getItem(FIRST_GALLERY_ENTRY_KEY);
    const originalWorld = stores.session.getItem(FIRST_GALLERY_WORLD_SESSION_KEY);
    stores.local.setItem(CAISSON_ONLY_GALLERY_STORAGE_KEY, JSON.stringify({ ...emptyFirstGallery(),
      muralParts: ['lotus', 'bird', 'grapes'], caissonCompleted: true, coloringCompleted: true,
      ceremonySeen: true, introductionsSeen: ['easel'], firstSuccessSeen: true, artworks, displayedArtworkId: 'painting',
    }));
    stores.session.setItem(CAISSON_ONLY_WORLD_SESSION_KEY, JSON.stringify(checkpoint));
    stores.session.setItem(CAISSON_ONLY_MURAL_MARKER_KEY, '1');

    expect(resetGalleryProgress('first', stores, CAISSON_ONLY_WORLD_SESSION_KEY, undefined, true)).toEqual({ ok: true });
    expect(JSON.parse(stores.local.getItem(CAISSON_ONLY_GALLERY_STORAGE_KEY)!)).toEqual({ ...emptyFirstGallery(), artworks });
    expect(stores.local.getItem(FIRST_GALLERY_STORAGE_KEY)).toBe(originalFull);
    expect(stores.local.getItem(PROGRESS_KEY)).toBe(originalProgress);
    expect(local.values.get(LEGACY_ARTWORKS_KEY)).toBe('older ordinary artwork');
    expect(local.values.get(ARTWORKS_KEY)).toBe('current ordinary artwork');
    expect(session.values.get(CAISSON_ONLY_WORLD_SESSION_KEY)).toBe(JSON.stringify({ ...checkpoint,
      visitedEvents: ['story-demo', 'novice-story', 'flying'] }));
    expect(session.values.has(CAISSON_ONLY_MURAL_MARKER_KEY)).toBe(false);
    expect(stores.session.getItem(FIRST_GALLERY_WORLD_SESSION_KEY)).toBe(originalWorld);
    expect(stores.session.getItem(FIRST_GALLERY_MURAL_MARKER_KEY)).toBe('1');
    expect(stores.session.getItem(FIRST_GALLERY_ENTRY_KEY)).toBe(originalDraft);
    expect(local.values.has(galleryProgressResetKey('first'))).toBe(false);
    expect(local.values.get(galleryProgressResetKey('first', true))).toEqual(expect.any(String));
    expect(galleryForProgressResetKey(galleryProgressResetKey('first', true), true)).toBe('first');
    expect(galleryForProgressResetKey(galleryProgressResetKey('first', true))).toBeUndefined();
    expect(galleryForProgressResetKey(galleryProgressResetKey('first'), true)).toBeUndefined();
    expect(galleryResetScopeForKey(galleryProgressResetKey('first', true), true)).toEqual({ gallery: 'first' });
    expect(galleryResetScopeForKey(galleryProgressResetKey('first', true))).toBeUndefined();
    expect(galleryResetScopeForKey(galleryTaskProgressResetKey('first', 'caisson'), true)).toBeUndefined();
  });

  it('isolates compact reset in another tab and refuses to clear a different gallery', () => {
    const { local, session } = seed();
    const beforeLocal = new Map(local.values);
    const beforeFull = new Map(session.values);
    session.storage.setItem(CAISSON_ONLY_WORLD_SESSION_KEY, JSON.stringify(checkpoint));
    session.storage.setItem(CAISSON_ONLY_MURAL_MARKER_KEY, '1');
    expect(clearGallerySessionProgress('first', session.storage, FIRST_GALLERY_WORLD_SESSION_KEY, undefined, true)).toEqual({ ok: true });
    expect(local.values).toEqual(beforeLocal);
    for (const [key, value] of beforeFull) expect(session.values.get(key)).toBe(value);
    expect(session.values.has(CAISSON_ONLY_MURAL_MARKER_KEY)).toBe(false);
    expect(session.values.get(CAISSON_ONLY_WORLD_SESSION_KEY)).toBe(JSON.stringify({ ...checkpoint,
      visitedEvents: ['story-demo', 'novice-story', 'flying'] }));
    const priorSession = new Map(session.values);
    const stores = { local: local.storage, session: session.storage };
    expect(clearGallerySessionProgress('music', session.storage, undefined, undefined, true)).toMatchObject({ ok: false });
    expect(resetGalleryProgress('music', stores, undefined, undefined, true)).toMatchObject({ ok: false });
    expect(clearGallerySessionProgress('first', session.storage, undefined, 'chapters', true)).toMatchObject({ ok: false });
    expect(resetGalleryProgress('first', stores, undefined, 'chapters', true)).toMatchObject({ ok: false });
    expect(local.values).toEqual(beforeLocal);
    expect(session.values).toEqual(priorSession);
  });

  it('rolls back compact reset on signal failure and preserves unreadable compact artwork records', () => {
    const { local, session, stores } = seed();
    stores.local.setItem(CAISSON_ONLY_GALLERY_STORAGE_KEY, JSON.stringify({ ...emptyFirstGallery(), artworks }));
    stores.session.setItem(CAISSON_ONLY_WORLD_SESSION_KEY, JSON.stringify(checkpoint));
    stores.session.setItem(CAISSON_ONLY_MURAL_MARKER_KEY, '1');
    const beforeLocal = new Map(local.values), beforeSession = new Map(session.values);
    const write = stores.local.setItem;
    stores.local.setItem = (key, value) => {
      if (key === galleryProgressResetKey('first', true)) throw new Error('storage full');
      write(key, value);
    };
    expect(resetGalleryProgress('first', stores, CAISSON_ONLY_WORLD_SESSION_KEY, undefined, true)).toMatchObject({ ok: false });
    expect(local.values).toEqual(beforeLocal);
    expect(session.values).toEqual(beforeSession);
    stores.local.setItem = write;
    stores.local.setItem(CAISSON_ONLY_GALLERY_STORAGE_KEY, '{unreadable artwork');
    expect(resetGalleryProgress('first', stores, CAISSON_ONLY_WORLD_SESSION_KEY, undefined, true)).toMatchObject({ ok: false });
    expect(stores.local.getItem(CAISSON_ONLY_GALLERY_STORAGE_KEY)).toBe('{unreadable artwork');
    expect(session.values).toEqual(beforeSession);
  });

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

  it.each([undefined, 'chapters'] as const)('restores earlier writes if the reset signal fails to persist (%s)', task => {
    const { local, session, stores } = seed();
    const previousLocal = new Map(local.values);
    const previousSession = new Map(session.values);
    const write = stores.local.setItem;
    const signal = task ? galleryTaskProgressResetKey('music', task) : galleryProgressResetKey('music');
    stores.local.setItem = (key, value) => {
      if (key === signal) throw new Error('storage full');
      write(key, value);
    };
    expect(resetGalleryProgress('music', stores, undefined, task)).toMatchObject({ ok: false });
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

describe('按任务清除进度', () => {
  it.each(['mural', 'caisson', 'easel'] as const)('clears compact %s and its unlock with a separate cross-tab signal', task => {
    const { local, session, stores } = seed();
    const priorLocal = new Map(local.values);
    const priorSession = new Map(session.values);
    const before = loadFirstGallery(stores.local).data;
    local.storage.setItem(CAISSON_ONLY_GALLERY_STORAGE_KEY, JSON.stringify(before));
    session.storage.setItem(CAISSON_ONLY_WORLD_SESSION_KEY, JSON.stringify(checkpoint));
    session.storage.setItem(CAISSON_ONLY_MURAL_MARKER_KEY, '1');

    expect(resetGalleryProgress('first', stores, FIRST_GALLERY_WORLD_SESSION_KEY, task, true)).toEqual({ ok: true });
    expect(JSON.parse(local.values.get(CAISSON_ONLY_GALLERY_STORAGE_KEY)!)).toEqual({
      ...before, ceremonySeen: false, introductionsSeen: before.introductionsSeen.filter(id => id !== task),
      ...(task === 'mural' && { muralParts: [] }),
      ...(task === 'caisson' && { caissonCompleted: false }),
      ...(task === 'easel' && { coloringCompleted: false, firstSuccessSeen: false, displayedArtworkId: null }),
    });
    const key = galleryTaskProgressResetKey('first', task, true);
    expect(local.values.get(key)).toEqual(expect.any(String));
    expect(local.values.size).toBe(priorLocal.size + 2);
    for (const [priorKey, priorValue] of priorLocal) expect(local.values.get(priorKey)).toBe(priorValue);
    for (const [priorKey, priorValue] of priorSession) expect(session.values.get(priorKey)).toBe(priorValue);
    expect(galleryResetScopeForKey(key)).toBeUndefined();
    expect(galleryResetScopeForKey(galleryTaskProgressResetKey('first', task), true)).toBeUndefined();
    expect(galleryResetScopeForKey(galleryTaskProgressResetKey('music', 'chapters', true), true)).toBeUndefined();
    const scope = galleryResetScopeForKey(key, true);
    expect(scope).toEqual({ gallery: 'first', task });

    const otherTab = memoryStorage();
    for (const [priorKey, priorValue] of priorSession) otherTab.storage.setItem(priorKey, priorValue);
    otherTab.storage.setItem(CAISSON_ONLY_WORLD_SESSION_KEY, JSON.stringify(checkpoint));
    otherTab.storage.setItem(CAISSON_ONLY_MURAL_MARKER_KEY, '1');
    expect(clearGallerySessionProgress(scope!.gallery, otherTab.storage, FIRST_GALLERY_WORLD_SESSION_KEY, scope!.task, true))
      .toEqual({ ok: true });
    const nextVisits = checkpoint.visitedEvents.filter(id => task !== 'caisson' || id !== 'caisson');
    expect(otherTab.values).toEqual(session.values);
    expect(otherTab.values.get(CAISSON_ONLY_WORLD_SESSION_KEY)).toBe(JSON.stringify({ ...checkpoint, visitedEvents: nextVisits }));
    expect(otherTab.values.get(CAISSON_ONLY_MURAL_MARKER_KEY)).toBe(task === 'mural' ? undefined : '1');
  });

  it.each(['mural', 'caisson', 'easel'] as const)('clears only the first-gallery %s task and its shared unlock', task => {
    const { stores, session } = seed();
    const before = loadFirstGallery(stores.local).data;
    expect(resetGalleryProgress('first', stores, undefined, task)).toEqual({ ok: true });
    expect(loadFirstGallery(stores.local).data).toEqual({
      ...before, ceremonySeen: false, introductionsSeen: before.introductionsSeen.filter(id => id !== task),
      ...(task === 'mural' && { muralParts: [] }),
      ...(task === 'caisson' && { caissonCompleted: false }),
      ...(task === 'easel' && { coloringCompleted: false, firstSuccessSeen: false, displayedArtworkId: null }),
    });
    const next = { ...checkpoint, visitedEvents: checkpoint.visitedEvents.filter(id => task !== 'caisson' || id !== 'caisson') };
    expect(session.values.get(FIRST_GALLERY_ENTRY_KEY)).toBe(JSON.stringify({ ...draft, checkpoint: next }));
    expect(session.values.get(FIRST_GALLERY_MURAL_MARKER_KEY)).toBe(task === 'mural' ? undefined : '1');
    expect(unlockedGameThemes(stores.local)).toEqual(['music', 'stories']);
    expect(stores.local.getItem(ARTWORKS_KEY)).toBe('current ordinary artwork');
    expect(stores.local.getItem(PROGRESS_KEY)).toContain('music-hidden-objects-intro');
  });

  it.each(['chapters', 'instruments', 'outfit'] as const)('clears only the music %s task and its shared unlock', task => {
    const { stores, session } = seed();
    rememberMusicGalleryGuideApproach(stores.local);
    const before = loadMusicGalleryProgress(stores.local);
    expect(resetGalleryProgress('music', stores, undefined, task)).toEqual({ ok: true });
    expect(loadMusicGalleryProgress(stores.local)).toEqual({
      chapters: task === 'chapters' ? [] : before.chapters,
      instruments: task === 'instruments' ? [] : before.instruments,
      dressed: task === 'outfit' ? false : before.dressed,
      awardReceived: false,
    });
    expect(hasApproachedMusicGalleryGuide(stores.local)).toBe(true);
    expect(claimMusicGalleryUnlockNotice(stores.local)).toBe(true);
    expect(unlockedGameThemes(stores.local)).toEqual(['patterns', 'stories']);
    expect(session.values.get(MUSIC_COMPANION_SESSION_KEY_V2)).toBe(JSON.stringify({
      ...checkpoint, visitedEvents: checkpoint.visitedEvents.filter(id => task !== 'chapters' || id !== 'flying'),
    }));
  });

  it.each(['murals', 'exhibits'] as const)('clears only Mogao %s, including older mural data when selected', task => {
    const { stores, session } = seed();
    const legacyIntro = 'dunhuang:mogao-hall-a:intro:v1';
    const murals = loadMogaoHallAProgress(stores.local).data;
    const exhibits = loadMogaoExhibitProgress(stores.local).data;
    expect(resetGalleryProgress('mogao', stores, undefined, task)).toEqual({ ok: true });
    expect(loadMogaoHallAProgress(stores.local).data).toEqual(task === 'murals' ? emptyMogaoHallAProgress() : murals);
    expect(loadMogaoExhibitProgress(stores.local).data).toEqual(task === 'exhibits' ? emptyMogaoExhibitProgress() : exhibits);
    expect(stores.local.getItem(legacyIntro)).toBe(task === 'murals' ? null : 'seen');
    expect(claimMogaoGameNotice(stores.local)).toBe(true);
    expect(unlockedGameThemes(stores.local)).toEqual(['patterns', 'music']);
    expect(session.values.get(MOGAO_EXHIBIT_SESSION_KEY)).toBe(JSON.stringify(task === 'murals'
      ? { ...checkpoint, visitedEvents: ['caisson', 'flying'] } : checkpoint));
  });

  it('uses a task-specific signal so another tab clears only the matching session visits', () => {
    const { stores, session } = seed();
    const otherTab = memoryStorage();
    const active = 'active-checkpoint';
    otherTab.storage.setItem(active, JSON.stringify(checkpoint));
    expect(resetGalleryProgress('music', stores, undefined, 'chapters')).toEqual({ ok: true });
    const key = galleryTaskProgressResetKey('music', 'chapters');
    expect(stores.local.getItem(key)).toEqual(expect.any(String));
    expect(stores.local.getItem(galleryProgressResetKey('music'))).toBeNull();
    expect(galleryForProgressResetKey(key)).toBeUndefined();
    expect(galleryResetScopeForKey(galleryTaskProgressResetKey('first', 'chapters'))).toBeUndefined();
    expect(galleryResetScopeForKey(galleryProgressResetKey('music'))).toEqual({ gallery: 'music' });
    const scope = galleryResetScopeForKey(key);
    expect(scope).toEqual({ gallery: 'music', task: 'chapters' });
    expect(clearGallerySessionProgress(scope!.gallery, otherTab.storage, active, scope!.task)).toEqual({ ok: true });
    expect(otherTab.values.get(active)).toBe(session.values.get(FIRST_GALLERY_WORLD_SESSION_KEY));
  });
});
