import { describe, expect, it } from 'vitest';
import { ARTWORKS_KEY, LEGACY_ARTWORKS_KEY, artworkColors, artworkMaterials, emptyArtworks, hasOlderArtwork, loadArtworks, saveArtworks, withArtwork } from '../../src/services/artworks';
import { PROGRESS_KEY } from '../../src/services/progress';
import type { ColoringLevel, RegionMaterials } from '../../src/types';
import { makeLevel } from '../fixtures/catalog';

export const testColoringLevel: ColoringLevel = {
  ...makeLevel('test-coloring'), gameType: 'coloring', referenceAssetId: 'test-a', lineAssetId: 'test-a', regionMapAssetId: 'test-b', artworkVersion: 'v1',
  palette: [{ id: 'red', label: '红', color: '#aa3322' }],
  regions: [{ id: 1, label: '花瓣', region: { x: .1, y: .1, width: .2, height: .2 }, point: { x: .2, y: .2 }, pixelCount: 10 }],
};
function storage() {
  const values = new Map<string, string>(), writes: string[] = [];
  return { values, writes, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); } };
}
describe('填色作品独立保存', () => {
  it('刷新后恢复颜色，不写旧游戏进度键', () => {
    const target = storage(); target.setItem(PROGRESS_KEY, 'unchanged');
    const data = withArtwork(emptyArtworks(), testColoringLevel, { 1: '#aa3322' });
    expect(saveArtworks(data, target)).toEqual({ ok: true });
    expect(artworkColors(loadArtworks(target).data, testColoringLevel)).toEqual({ 1: '#aa3322' });
    expect(target.getItem(PROGRESS_KEY)).toBe('unchanged');
  });
  it('新版区域不能套用旧作品，保存新作品后两版都保留', () => {
    const original = withArtwork(emptyArtworks(), testColoringLevel, { 1: '#aa3322' });
    const revised = { ...testColoringLevel, artworkVersion: 'v2' };
    expect(hasOlderArtwork(original, revised)).toBe(true);
    expect(artworkColors(original, revised)).toEqual({});
    const next = withArtwork(original, revised, { 1: '#0055aa' });
    expect(artworkColors(next, testColoringLevel)).toEqual({ 1: '#aa3322' });
    expect(artworkColors(next, revised)).toEqual({ 1: '#0055aa' });
  });
  it('剔除无效区域和非法颜色，完成时间如实记录', () => {
    const data = withArtwork(emptyArtworks(), testColoringLevel, { 1: '#cc7722', 999: '#000000', 2: 'bad' }, true, '2026-10-28T00:00:00.000Z');
    expect(artworkColors(data, testColoringLevel)).toEqual({ 1: '#cc7722' });
    expect(data.artworks['test-coloring'].v1.submittedAt).toBe('2026-10-28T00:00:00.000Z');
  });
  it('存储失败明确返回错误，原始不可读记录不被覆盖', () => {
    const target = storage(); target.setItem(ARTWORKS_KEY, '{bad');
    const denied = { ...target, setItem: () => { throw new Error('quota'); } };
    expect(loadArtworks(denied).warning).toBeTruthy();
    expect(saveArtworks(emptyArtworks(), denied).ok).toBe(false);
    expect(target.getItem(ARTWORKS_KEY)).toBe('{bad');
  });
  it('原始不可读记录成功备份后才能写新记录', () => {
    const target = storage(); target.setItem(ARTWORKS_KEY, '{bad');
    expect(saveArtworks(emptyArtworks(), target).ok).toBe(true);
    expect([...target.values.entries()].some(([key, value]) => key.startsWith(`${ARTWORKS_KEY}:unreadable:`) && value === '{bad')).toBe(true);
  });

  it('旧v1原字节只读，编辑与材质提交都独写v2，刷新保留白底材质', () => {
    const target = storage(), timestamp = '2026-10-28T00:00:00.000Z';
    const raw = JSON.stringify({ version: 1, artworks: { [testColoringLevel.id]: { v1: {
      colors: { 1: '#AABBCC' }, updatedAt: timestamp, submittedAt: timestamp,
    } } } }, null, 2) + '\n';
    target.values.set(LEGACY_ARTWORKS_KEY, raw); target.values.set(PROGRESS_KEY, 'unchanged');
    const loaded = loadArtworks(target);
    expect(loaded.warning).toBeNull(); expect(loaded.data.version).toBe(2);
    expect(artworkColors(loaded.data, testColoringLevel)).toEqual({ 1: '#aabbcc' });
    expect(artworkMaterials(loaded.data, testColoringLevel)).toEqual({});
    expect(target.writes).toEqual([]);
    const changed = withArtwork(loaded.data, testColoringLevel, { 1: '#ffffff' }, true,
      '2026-11-04T00:00:00.000Z', { 1: 'sparkle-silver-v001' });
    expect(saveArtworks(changed, target)).toEqual({ ok: true });
    const refreshed = loadArtworks(target).data;
    expect(artworkColors(refreshed, testColoringLevel)).toEqual({ 1: '#ffffff' });
    expect(artworkMaterials(refreshed, testColoringLevel)).toEqual({ 1: 'sparkle-silver-v001' });
    expect(refreshed.artworks[testColoringLevel.id].v1.submittedAt).toBe('2026-11-04T00:00:00.000Z');
    expect(target.getItem(LEGACY_ARTWORKS_KEY)).toBe(raw);
    expect(target.getItem(PROGRESS_KEY)).toBe('unchanged');
    expect(target.writes).toEqual([ARTWORKS_KEY]);
    expect(JSON.parse(target.getItem(ARTWORKS_KEY)!).version).toBe(2);
  });

  it('按关卡和线稿版本合并，空v2压住旧画，缺少v2条目仍能读取其他旧作品', () => {
    const target = storage(), timestamp = '2026-10-28T00:00:00.000Z';
    const snapshot = (color: string) => ({ colors: { 1: color }, updatedAt: timestamp });
    const raw = JSON.stringify({ version: 1, artworks: {
      [testColoringLevel.id]: { v0: snapshot('#112233'), v1: snapshot('#aabbcc') },
      another: { v1: snapshot('#445566') },
    } });
    target.values.set(LEGACY_ARTWORKS_KEY, raw);
    expect(saveArtworks(withArtwork(emptyArtworks(), testColoringLevel, {}, false, timestamp), target).ok).toBe(true);
    const loaded = loadArtworks(target).data;
    expect(artworkColors(loaded, testColoringLevel)).toEqual({});
    expect(artworkMaterials(loaded, testColoringLevel)).toEqual({});
    expect(hasOlderArtwork(loaded, testColoringLevel)).toBe(false);
    expect(loaded.artworks[testColoringLevel.id].v0.colors).toEqual({ 1: '#112233' });
    expect(artworkColors(loaded, { ...testColoringLevel, id: 'another' })).toEqual({ 1: '#445566' });
    const revised = { ...testColoringLevel, artworkVersion: 'v2' };
    expect(hasOlderArtwork(loaded, revised)).toBe(true);
    const saved = withArtwork(loaded, revised, { 1: '#998877' }, false, timestamp, { 1: 'sparkle-gold-v001' });
    expect(saveArtworks(saved, target).ok).toBe(true);
    expect(artworkColors(loadArtworks(target).data, testColoringLevel)).toEqual({});
    expect(artworkMaterials(loadArtworks(target).data, revised)).toEqual({ 1: 'sparkle-gold-v001' });
    expect(target.getItem(LEGACY_ARTWORKS_KEY)).toBe(raw);
  });

  it('有效但没有对应条目的v2不会隐藏旧作品，普通编辑不伪更新完成时间', () => {
    const target = storage(), timestamp = '2026-10-28T00:00:00.000Z';
    target.values.set(LEGACY_ARTWORKS_KEY, JSON.stringify({ version: 1, artworks: { [testColoringLevel.id]: {
      v1: { colors: { 1: '#123456' }, updatedAt: timestamp, submittedAt: timestamp },
    } } }));
    target.values.set(ARTWORKS_KEY, JSON.stringify({ version: 2, artworks: {} }));
    const loaded = loadArtworks(target).data;
    expect(artworkColors(loaded, testColoringLevel)).toEqual({ 1: '#123456' });
    const changed = withArtwork(loaded, testColoringLevel, { 1: '#123456' }, false,
      '2026-11-04T00:00:00.000Z', { 1: 'sparkle-gold-v001' });
    expect(changed.artworks[testColoringLevel.id].v1.submittedAt).toBe(timestamp);
    expect(changed.artworks[testColoringLevel.id].v1.updatedAt).toBe('2026-11-04T00:00:00.000Z');
  });

  it('非法与孤立材质被清理，普通重涂会清除同底色的材质', () => {
    const gold = withArtwork(emptyArtworks(), testColoringLevel, { 1: '#aabbcc' }, false,
      '2026-11-04T00:00:00.000Z', { 1: 'sparkle-gold-v001' });
    const plain = withArtwork(gold, testColoringLevel, { 1: '#aabbcc' });
    expect(artworkMaterials(plain, testColoringLevel)).toEqual({});
    const cleaned = withArtwork(gold, testColoringLevel, { 1: '#aabbcc', 2: '#ffffff' }, false,
      '2026-11-04T00:00:00.000Z', { 1: 'invalid', 2: 'sparkle-silver-v001', 999: 'sparkle-gold-v001' } as unknown as RegionMaterials);
    expect(artworkColors(cleaned, testColoringLevel)).toEqual({ 1: '#aabbcc' });
    expect(artworkMaterials(cleaned, testColoringLevel)).toEqual({});
  });

  it('坏v1保留原文不阻挡有效v2，坏v2可回读旧画并必须先备份再保存', () => {
    const target = storage(); target.values.set(LEGACY_ARTWORKS_KEY, '{legacy-bad');
    const valid = withArtwork(emptyArtworks(), testColoringLevel, { 1: '#aabbcc' });
    expect(saveArtworks(valid, target).ok).toBe(true);
    expect(loadArtworks(target).warning).toBeTruthy();
    expect(artworkColors(loadArtworks(target).data, testColoringLevel)).toEqual({ 1: '#aabbcc' });
    expect(target.getItem(LEGACY_ARTWORKS_KEY)).toBe('{legacy-bad');
    const legacy = JSON.stringify({ version: 1, artworks: { [testColoringLevel.id]: {
      v1: { colors: { 1: '#445566' }, updatedAt: '2026-10-28T00:00:00.000Z' },
    } } });
    target.values.set(LEGACY_ARTWORKS_KEY, legacy); target.values.set(ARTWORKS_KEY, '{new-bad');
    const recovered = loadArtworks(target);
    expect(recovered.warning).toBeTruthy();
    expect(artworkColors(recovered.data, testColoringLevel)).toEqual({ 1: '#445566' });
    expect(target.getItem(ARTWORKS_KEY)).toBe('{new-bad');
    expect(saveArtworks(recovered.data, target).ok).toBe(true);
    expect([...target.values.entries()].some(([key, value]) => key.startsWith(`${ARTWORKS_KEY}:unreadable:`) && value === '{new-bad')).toBe(true);
    expect(target.getItem(LEGACY_ARTWORKS_KEY)).toBe(legacy);
  });

  it('备份失败不覆盖坏v2，写入拒绝后可重试且旧v1始终不变', () => {
    const target = storage(), legacyRaw = '{keep-old-bytes';
    target.values.set(LEGACY_ARTWORKS_KEY, legacyRaw); target.values.set(ARTWORKS_KEY, '{new-bad');
    const next = withArtwork(emptyArtworks(), testColoringLevel, { 1: '#112233' }, false,
      '2026-11-04T00:00:00.000Z', { 1: 'sparkle-silver-v001' });
    const noBackup = { ...target, setItem: (key: string, value: string) => {
      if (key.startsWith(`${ARTWORKS_KEY}:unreadable:`)) throw new Error('backup denied');
      target.setItem(key, value);
    } };
    expect(saveArtworks(next, noBackup).ok).toBe(false);
    expect(target.getItem(ARTWORKS_KEY)).toBe('{new-bad');
    const denied = { ...target, setItem: (key: string, value: string) => {
      if (key === ARTWORKS_KEY) throw new Error('quota'); target.setItem(key, value);
    } };
    expect(saveArtworks(next, denied).ok).toBe(false);
    expect(target.getItem(ARTWORKS_KEY)).toBe('{new-bad');
    expect(target.getItem(LEGACY_ARTWORKS_KEY)).toBe(legacyRaw);
    expect(saveArtworks(next, target).ok).toBe(true);
    expect(artworkMaterials(loadArtworks(target).data, testColoringLevel)).toEqual({ 1: 'sparkle-silver-v001' });
    expect(target.getItem(LEGACY_ARTWORKS_KEY)).toBe(legacyRaw);
  });

  it('坏材质快照不被当作有效v2覆盖，拒绝直接保存非法或缺底色的材质', () => {
    const target = storage();
    const invalid = JSON.stringify({ version: 2, artworks: { [testColoringLevel.id]: { v1: {
      colors: { 1: '#aabbcc' }, materials: { 1: 'unknown-material' }, updatedAt: '2026-11-04T00:00:00.000Z',
    } } } });
    target.values.set(ARTWORKS_KEY, invalid);
    expect(loadArtworks(target).warning).toBeTruthy();
    expect(target.getItem(ARTWORKS_KEY)).toBe(invalid);
    const missingBase = withArtwork(emptyArtworks(), testColoringLevel, {});
    missingBase.artworks[testColoringLevel.id].v1.materials = { 1: 'sparkle-gold-v001' };
    expect(saveArtworks(missingBase, target).ok).toBe(false);
    expect(target.getItem(ARTWORKS_KEY)).toBe(invalid);
  });
});
