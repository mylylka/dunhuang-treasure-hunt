import { z } from 'zod';
import type { LessonBook } from '../content/lessons/types';
import type { StorageLike } from './progress';

export const LEARNING_KEY = 'dunhuang:learning:v1';
const schema = z.object({
  version: z.literal(1), books: z.record(z.string(), z.object({
    contentVersion: z.number().int().positive(), visitedIds: z.array(z.string()), completedAt: z.string().datetime().optional(),
  })),
});
export type LearningData = z.infer<typeof schema>;
export const emptyLearning = (): LearningData => ({ version: 1, books: {} });

export function loadLearning(storage?: StorageLike): { data: LearningData; warning: string | null } {
  try {
    const raw = (storage ?? window.localStorage).getItem(LEARNING_KEY);
    if (!raw) return { data: emptyLearning(), warning: null };
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return { data: parsed.data, warning: null };
  } catch { /* Keep the original record intact until a protected save succeeds. */ }
  return { data: emptyLearning(), warning: '学习记录暂时无法读取，可以继续学习。' };
}

export function saveLearning(data: LearningData, storage?: StorageLike): { ok: true } | { ok: false; message: string } {
  try {
    const next = schema.parse(data);
    const target = storage ?? window.localStorage;
    const original = target.getItem(LEARNING_KEY);
    if (original !== null) {
      let valid = false;
      try { valid = schema.safeParse(JSON.parse(original)).success; } catch { /* Back up malformed JSON too. */ }
      if (!valid) {
        let suffix = Date.now();
        while (target.getItem(`${LEARNING_KEY}:unreadable:${suffix}`) !== null) suffix++;
        target.setItem(`${LEARNING_KEY}:unreadable:${suffix}`, original);
      }
    }
    target.setItem(LEARNING_KEY, JSON.stringify(next));
    return { ok: true };
  } catch { return { ok: false, message: '学习记录尚未保存，请重试。' }; }
}

export function lessonRecord(data: LearningData, book: LessonBook): LearningData['books'][string] {
  const current = data.books[book.id];
  return current?.contentVersion === book.version ? current : { contentVersion: book.version, visitedIds: [] };
}
export const isLessonCompleted = (data: LearningData, book: LessonBook) => Boolean(lessonRecord(data, book).completedAt);

export function withVisitedUnit(data: LearningData, book: LessonBook, unitId: string): LearningData {
  if (!book.units.some(unit => unit.id === unitId)) return data;
  const current = lessonRecord(data, book);
  if (current.visitedIds.includes(unitId)) return data;
  return { ...data, books: { ...data.books, [book.id]: { ...current, visitedIds: [...current.visitedIds, unitId] } } };
}

export function withCompletedLesson(data: LearningData, book: LessonBook, now = new Date().toISOString()): LearningData {
  const current = lessonRecord(data, book);
  if (current.completedAt || !book.units.every(unit => current.visitedIds.includes(unit.id))) return data;
  return { ...data, books: { ...data.books, [book.id]: { ...current, completedAt: now } } };
}
