import { describe, expect, it } from 'vitest';
import { ARTWORKS_KEY, artworkColors, emptyArtworks, hasOlderArtwork, loadArtworks, saveArtworks, withArtwork } from '../../src/services/artworks';
import { PROGRESS_KEY } from '../../src/services/progress';
import type { ColoringLevel } from '../../src/types';
import { makeLevel } from '../fixtures/catalog';

export const testColoringLevel: ColoringLevel = {
  ...makeLevel('test-coloring'), gameType: 'coloring', referenceAssetId: 'test-a', lineAssetId: 'test-a', regionMapAssetId: 'test-b', artworkVersion: 'v1',
  palette: [{ id: 'red', label: '红', color: '#aa3322' }],
  regions: [{ id: 1, label: '花瓣', region: { x: .1, y: .1, width: .2, height: .2 }, point: { x: .2, y: .2 }, pixelCount: 10 }],
};
function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
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
});
