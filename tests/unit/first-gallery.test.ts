import { describe, expect, it } from 'vitest';
import rawLevel from '../../src/content/levels/coloring-feitian-lotus.json';
import { toTerrainPoint } from '../../src/content/world/terrain-layout-v001';
import type { ColoringLevel } from '../../src/types';
import { defaultWorldCheckpoint } from '../../src/world/session';
import { ARTWORKS_KEY, emptyArtworks, saveArtworks, withArtwork } from '../../src/services/artworks';
import { canOpenFirstGalleryRoute, completeGalleryCaisson, completeGalleryMuralPart, emptyFirstGallery,
  FIRST_GALLERY_STORAGE_KEY, getFirstGalleryAccess, importGalleryArtworks, isFirstGalleryUnlocked, loadFirstGallery,
  markGalleryCeremonySeen, markGalleryColoringFeedbackSeen, markGalleryIntroductionSeen, selectGalleryArtwork, submitGalleryArtwork } from '../../src/services/first-gallery';
import { clearGalleryColoringEntry, readGalleryColoringEntry, saveGalleryColoringDraft, startGalleryColoring } from '../../src/services/first-gallery-entry';
import type { StorageLike } from '../../src/services/progress';

const level: ColoringLevel = { ...rawLevel, schemaVersion: 1, gameType: 'coloring' };
const catalog = { levels: [level] };
const checkpoint = defaultWorldCheckpoint(toTerrainPoint('courtyard', { x: -7.4, z: -5.3 }));
const red = { 1: '#aa3322' }, blue = { 1: '#3355aa' };
const timestamp = '2026-11-05T12:00:00.000Z';
const requestId = 'a'.repeat(32);

function memory() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
}

function begin(session: StorageLike) {
  const result = startGalleryColoring(checkpoint, level.artworkVersion, session);
  if (!result.ok) throw Error(result.message);
  return result.entry;
}

describe('第一馆进度、画架和作品库', () => {
  it('真实画架在同一关卡内刷新恢复，独立入口不能冒充或进入相邻关', () => {
    const session = memory();
    const distant = defaultWorldCheckpoint(toTerrainPoint('courtyard', { x: -12, z: -15 }));
    expect(startGalleryColoring(distant, level.artworkVersion, session).ok).toBe(false);
    const entry = begin(session);
    expect(readGalleryColoringEntry(null, session)).toBeNull();
    expect(readGalleryColoringEntry('0'.repeat(32), session)).toBeNull();
    expect(readGalleryColoringEntry(entry.token, session)).toEqual(entry);
    const state = emptyFirstGallery();
    expect(canOpenFirstGalleryRoute(state, { page: 'play', id: level.id }, catalog, null, false)).toBe(false);
    expect(canOpenFirstGalleryRoute(state, { page: 'play', id: level.id }, catalog, entry, false)).toBe(true);
    expect(canOpenFirstGalleryRoute(state, { page: 'play', id: 'coloring-rabbit' }, catalog, entry, true)).toBe(false);
    expect(canOpenFirstGalleryRoute(state, { page: 'result', id: level.id }, catalog, entry, true)).toBe(false);
    clearGalleryColoringEntry(entry.token, session);
    expect(readGalleryColoringEntry(entry.token, session)).toBeNull();
  });

  it('提交失败不会提前挂画或发印记，重试同编号只创建一幅，并保存材质', () => {
    const store = memory(), session = memory(), entry = begin(session);
    const submission = { level, requestId: entry.token, easelClaim: entry.token, colors: red,
      materials: { 1: 'sparkle-gold-v001' } as const, submittedAt: timestamp };
    const denied = { ...store, setItem() { throw Error('quota'); } };
    expect(submitGalleryArtwork(submission, denied, session).ok).toBe(false);
    expect(loadFirstGallery(store).data).toEqual(emptyFirstGallery());
    expect(submitGalleryArtwork({ ...submission, easelClaim: requestId }, store, session).ok).toBe(false);
    expect(submitGalleryArtwork(submission, store, session).ok).toBe(true);
    expect(submitGalleryArtwork({ ...submission, colors: blue }, store, session).ok).toBe(true);
    const state = loadFirstGallery(store).data;
    expect(state.displayedArtworkId).toBe(entry.token);
    expect(state.coloringCompleted).toBe(true);
    expect(state.artworks[entry.token]).toMatchObject({ colors: red, materials: { 1: 'sparkle-gold-v001' } });
    expect(Object.keys(state.artworks)).toHaveLength(1);
  });

  it('旧提交只读导入，同关可收藏多次，普通提交不改变已有展品', () => {
    const store = memory(), session = memory();
    const entry = begin(session);
    const old = withArtwork(emptyArtworks(), level, red, true, timestamp);
    expect(saveArtworks(old, store)).toEqual({ ok: true });
    const raw = store.getItem(ARTWORKS_KEY);
    expect(importGalleryArtworks(catalog, store).ok).toBe(true);
    expect(importGalleryArtworks(catalog, store).ok).toBe(true);
    expect(store.getItem(ARTWORKS_KEY)).toBe(raw);
    const imported = loadFirstGallery(store).data;
    expect(Object.keys(imported.artworks)).toHaveLength(1);
    expect(imported.displayedArtworkId).toBeNull();
    expect(imported.coloringCompleted).toBe(false);
    expect(submitGalleryArtwork({ level, requestId: entry.token, easelClaim: entry.token, colors: blue, materials: {} }, store, session).ok).toBe(true);
    expect(submitGalleryArtwork({ level, requestId, colors: red, materials: {} }, store).ok).toBe(true);
    const state = loadFirstGallery(store).data;
    expect(Object.keys(state.artworks)).toHaveLength(3);
    expect(state.displayedArtworkId).toBe(entry.token);
    expect(selectGalleryArtwork(requestId, store).ok).toBe(true);
    expect(loadFirstGallery(store).data.displayedArtworkId).toBe(requestId);
  });

  it('从旧收藏再配一版，刷新恢复本次草稿，提交另存而不覆盖旧作', () => {
    const store = memory(), session = memory();
    expect(submitGalleryArtwork({ level, requestId, colors: red, materials: {} }, store).ok).toBe(true);
    const started = startGalleryColoring(checkpoint, level.artworkVersion, session, requestId);
    if (!started.ok) throw Error(started.message);
    const { token } = started.entry;
    expect(saveGalleryColoringDraft(token, blue, { 1: 'sparkle-silver-v001' }, session)?.draft?.colors).toEqual(blue);
    const resumed = readGalleryColoringEntry(token, session);
    expect(resumed).toMatchObject({ sourceArtworkId: requestId, draft: { colors: blue, materials: { 1: 'sparkle-silver-v001' } } });
    expect(submitGalleryArtwork({ level, requestId: token, easelClaim: token, ...resumed!.draft! }, store, session).ok).toBe(true);
    const state = loadFirstGallery(store).data;
    expect(state.artworks[requestId].colors).toEqual(red);
    expect(state.artworks[token].colors).toEqual(blue);
    expect(state.displayedArtworkId).toBe(token);
  });

  it('已提交作品后续自动保存的草稿和旧线稿版本不会当成新快照', () => {
    const store = memory();
    const older = { ...level, artworkVersion: 'older' };
    const initial = withArtwork(emptyArtworks(), older, blue, true, timestamp);
    const submitted = withArtwork(initial, level, red, true, timestamp);
    const draft = withArtwork(submitted, level, blue, false, '2026-11-05T12:01:00.000Z');
    expect(saveArtworks(draft, store).ok).toBe(true);
    expect(importGalleryArtworks(catalog, store).ok).toBe(true);
    expect(loadFirstGallery(store).data.artworks).toEqual({});
  });

  it('刷新读到最新三事件，资格先于仪式，真实故障模式只放行纹样主题', () => {
    const store = memory(), session = memory(), entry = begin(session);
    expect(markGalleryCeremonySeen(store).ok).toBe(false);
    expect(markGalleryColoringFeedbackSeen(store).ok).toBe(false);
    expect(markGalleryIntroductionSeen('caisson', store).ok).toBe(true);
    expect(markGalleryIntroductionSeen('caisson', store).ok).toBe(true);
    expect(completeGalleryMuralPart('bird', store).ok).toBe(true);
    expect(completeGalleryCaisson(store).ok).toBe(true);
    expect(completeGalleryMuralPart('grapes', store).ok).toBe(true);
    expect(completeGalleryMuralPart('lotus', store).ok).toBe(true);
    const locked = loadFirstGallery(store).data;
    expect(isFirstGalleryUnlocked(locked)).toBe(false);
    expect(canOpenFirstGalleryRoute(locked, { page: 'games', themeId: 'patterns' }, catalog, null, true)).toBe(true);
    expect(canOpenFirstGalleryRoute(locked, { page: 'games', themeId: 'music' }, catalog, null, true)).toBe(false);
    expect(submitGalleryArtwork({ level, requestId: entry.token, easelClaim: entry.token, colors: red, materials: {} }, store, session).ok).toBe(true);
    const unlocked = loadFirstGallery(store).data;
    expect(unlocked.introductionsSeen).toEqual(['caisson']);
    expect(unlocked.muralParts).toEqual(['bird', 'grapes', 'lotus']);
    expect(unlocked.ceremonySeen).toBe(false);
    expect(getFirstGalleryAccess(unlocked, 'music')).toBe(true);
    expect(getFirstGalleryAccess(unlocked, 'stories')).toBe(false);
    expect(canOpenFirstGalleryRoute(unlocked, { page: 'result', id: level.id }, catalog, null, false)).toBe(true);
    expect(markGalleryCeremonySeen(store).ok).toBe(true);
    expect(markGalleryColoringFeedbackSeen(store).ok).toBe(true);
    expect(loadFirstGallery(store).data).toMatchObject({ ceremonySeen: true, firstSuccessSeen: true });
  });

  it('不可读原存档先备份，备份写入受拒时保留原记录', () => {
    const store = memory();
    store.setItem(FIRST_GALLERY_STORAGE_KEY, '{bad');
    expect(loadFirstGallery(store).warning).toBeTruthy();
    const denied = { ...store, setItem(key: string, value: string) {
      if (key.startsWith(`${FIRST_GALLERY_STORAGE_KEY}:unreadable:`)) throw Error('quota');
      store.setItem(key, value);
    } };
    expect(completeGalleryCaisson(denied).ok).toBe(false);
    expect(store.getItem(FIRST_GALLERY_STORAGE_KEY)).toBe('{bad');
    expect(completeGalleryCaisson(store).ok).toBe(true);
    expect([...store.values.entries()].some(([key, value]) => key.startsWith(`${FIRST_GALLERY_STORAGE_KEY}:unreadable:`) && value === '{bad')).toBe(true);
    expect(loadFirstGallery(store).data.caissonCompleted).toBe(true);
  });
});
