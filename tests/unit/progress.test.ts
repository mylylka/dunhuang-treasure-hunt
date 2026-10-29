import { describe, expect, it } from 'vitest';
import { emptyProgress, isLevelUnlocked, loadProgress, PROGRESS_KEY, RECOVERY_PREFIX, saveProgress, withCompletedLevel, type StorageLike } from '../../src/services/progress';
import { makeCatalog, makeLevel } from '../fixtures/catalog';

function memoryStorage(): StorageLike & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

describe('进度与解锁', () => {
  it('关卡可用性不再要求先完成找不同入门关，教学闸门由独立记录负责', () => {
    const theme = makeCatalog().themes[0], intro = makeLevel(), next = makeLevel('test-next');
    const empty = emptyProgress();
    expect(isLevelUnlocked(intro, theme, empty)).toBe(true);
    expect(isLevelUnlocked(next, theme, empty)).toBe(true);
    expect(isLevelUnlocked(next, theme, withCompletedLevel(empty, intro.id))).toBe(true);
  });
  it('关卡不能出现在不属于它的主题中', () => {
    const theme = { ...makeCatalog().themes[0], id: 'other-theme', introLevelId: 'other-intro' };
    const next = makeLevel('test-next');
    expect(isLevelUnlocked(next, theme, withCompletedLevel(emptyProgress(), 'test-intro'))).toBe(false);
  });
  it('重玩及重复结算不撤销或重复添加完成记录', () => {
    const first = withCompletedLevel(emptyProgress(), 'test-intro', '2026-10-28T03:00:00.000Z');
    expect(withCompletedLevel(first, 'test-intro', '2026-10-28T04:00:00.000Z')).toBe(first);
    expect(Object.keys(first.completed)).toHaveLength(1);
  });
  it('保存后重新加载能恢复完成记录与设置', () => {
    const storage = memoryStorage(); const data = withCompletedLevel(emptyProgress(), 'test-intro'); data.settings.reducedMotion = true;
    expect(saveProgress(data, storage)).toEqual({ ok: true });
    expect(loadProgress(storage)).toEqual({ data, warning: null });
  });
  it('存储不可写时返回真实失败，允许以后重试', () => {
    const data = withCompletedLevel(emptyProgress(), 'test-intro');
    const broken: StorageLike = { getItem: () => null, setItem: () => { throw new Error('quota exceeded'); } };
    expect(saveProgress(data, broken).ok).toBe(false);
    const recovered = memoryStorage(); expect(saveProgress(data, recovered).ok).toBe(true);
    expect(loadProgress(recovered).data.completed['test-intro']).toBeTruthy();
  });
  it('损坏的记录不阻止开始游玩，读取时不删除原数据', () => {
    const storage = memoryStorage(); storage.setItem(PROGRESS_KEY, '{broken');
    const loaded = loadProgress(storage);
    expect(loaded.warning).toBeTruthy(); expect(loaded.data.completed).toEqual({});
    expect(storage.getItem(PROGRESS_KEY)).toBe('{broken');
  });
  it('隔离测试关可独立记录，不影响正式关卡', () => {
    let data = withCompletedLevel(emptyProgress(), 'patterns-intro');
    data = withCompletedLevel(data, 'test-intro');
    expect(Object.keys(data.completed).sort()).toEqual(['patterns-intro', 'test-intro']);
  });
  it('主题不支持的玩法不能误入关卡列表', () => {
    const theme = { ...makeCatalog().themes[0], allowedGameTypes: ['puzzle' as const], introLevelId: null };
    expect(isLevelUnlocked(makeLevel(), theme, emptyProgress())).toBe(false);
  });
  it('损坏数据在后续保存前保留原始备份', () => {
    const storage = memoryStorage(); const original = '{broken-but-valuable';
    storage.setItem(PROGRESS_KEY, original);
    const result = saveProgress(withCompletedLevel(loadProgress(storage).data, 'test-intro'), storage);
    expect(result.ok).toBe(true);
    const backups = [...storage.values.entries()].filter(([key]) => key.startsWith(RECOVERY_PREFIX));
    expect(backups).toHaveLength(1); expect(backups[0][1]).toBe(original);
    expect(loadProgress(storage).data.completed['test-intro']).toBeTruthy();
  });
  it('原始损坏数据无法备份时禁止覆盖', () => {
    const memory = memoryStorage(); memory.setItem(PROGRESS_KEY, '{broken');
    const storage: StorageLike = { getItem: key => memory.getItem(key), setItem: (key, value) => {
      if (key.startsWith(RECOVERY_PREFIX)) throw new Error('backup unavailable');
      memory.setItem(key, value);
    } };
    expect(saveProgress(withCompletedLevel(emptyProgress(), 'test-intro'), storage).ok).toBe(false);
    expect(memory.getItem(PROGRESS_KEY)).toBe('{broken');
  });
});
