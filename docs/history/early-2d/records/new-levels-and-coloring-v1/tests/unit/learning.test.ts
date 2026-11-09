import { describe, expect, it } from 'vitest';
import { emptyLearning, isLessonCompleted, LEARNING_KEY, lessonRecord, loadLearning, saveLearning, withCompletedLesson, withVisitedUnit } from '../../src/services/learning';
import { emptyProgress, PROGRESS_KEY, saveProgress, withCompletedLevel, type StorageLike } from '../../src/services/progress';
import type { LessonBook } from '../../src/content/lessons/types';

const book: LessonBook = { id: 'test-lesson', themeId: 'patterns', version: 1, title: '测试导览', sources: [],
  units: ['first', 'review'].map(id => ({ id, title: id, tabLabel: id, kind: 'review', panels: [] })) };
function memory() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

describe('教学记录与游戏成绩分开保存', () => {
  it('只记录真实章节，重复浏览幂等，未浏览全章不能标完成', () => {
    const initial = emptyLearning();
    expect(withVisitedUnit(initial, book, 'unknown')).toBe(initial);
    const visited = withVisitedUnit(initial, book, 'first');
    expect(withVisitedUnit(visited, book, 'first')).toBe(visited);
    expect(withCompletedLesson(visited, book)).toBe(visited);
    expect(initial.books).toEqual({});
  });
  it('全章参与后记录一次完成日期，复习不改日期', () => {
    const visited = book.units.reduce((data, unit) => withVisitedUnit(data, book, unit.id), emptyLearning());
    const completed = withCompletedLesson(visited, book, '2026-10-28T00:00:00.000Z');
    expect(isLessonCompleted(completed, book)).toBe(true);
    expect(withCompletedLesson(completed, book)).toBe(completed);
    expect(lessonRecord(completed, book).completedAt).toBe('2026-10-28T00:00:00.000Z');
  });
  it('完成游戏不能冒充已完成教学，教学保存也不覆盖游戏记录', () => {
    const storage = memory();
    const progress = withCompletedLevel(emptyProgress(), 'patterns-intro');
    saveProgress(progress, storage);
    expect(isLessonCompleted(loadLearning(storage).data, book)).toBe(false);
    const visited = withVisitedUnit(emptyLearning(), book, 'first');
    expect(saveLearning(visited, storage)).toEqual({ ok: true });
    expect(JSON.parse(storage.getItem(PROGRESS_KEY)!).completed).toEqual(progress.completed);
    expect(loadLearning(storage).data).toEqual(visited);
  });
  it('新版本教学不会误用旧版本已完成标记，保留其他主题记录', () => {
    const visited = book.units.reduce((data, unit) => withVisitedUnit(data, book, unit.id), emptyLearning());
    const completed = withCompletedLesson(visited, book);
    expect(isLessonCompleted(completed, { ...book, version: 2 })).toBe(false);
    expect(lessonRecord(completed, { ...book, version: 2 }).visitedIds).toEqual([]);
    const other = withVisitedUnit(completed, { ...book, id: 'other' }, 'first');
    expect(isLessonCompleted(other, book)).toBe(true);
  });
  it('损坏记录读取不覆盖，首次保存前备份原值', () => {
    const storage = memory(); storage.setItem(LEARNING_KEY, '{broken');
    expect(loadLearning(storage).warning).toBeTruthy();
    expect(storage.getItem(LEARNING_KEY)).toBe('{broken');
    expect(saveLearning(emptyLearning(), storage).ok).toBe(true);
    expect([...storage.data].filter(([key]) => key.startsWith(`${LEARNING_KEY}:unreadable:`)).map(([, value]) => value)).toEqual(['{broken']);
  });
  it('无法备份损坏记录时禁止覆盖原值', () => {
    const storage = memory(); storage.setItem(LEARNING_KEY, '{broken');
    const blocked: StorageLike = { getItem: storage.getItem, setItem: (key, value) => {
      if (key !== LEARNING_KEY) throw Error('backup full');
      storage.setItem(key, value);
    } };
    expect(saveLearning(emptyLearning(), blocked).ok).toBe(false);
    expect(storage.getItem(LEARNING_KEY)).toBe('{broken');
  });
  it('存储失败保留内存记录，并可重试', () => {
    const data = withVisitedUnit(emptyLearning(), book, 'first');
    const blocked: StorageLike = { getItem: () => null, setItem: () => { throw Error('unavailable'); } };
    expect(saveLearning(data, blocked).ok).toBe(false);
    expect(lessonRecord(data, book).visitedIds).toEqual(['first']);
    expect(saveLearning(data, memory()).ok).toBe(true);
  });
});
