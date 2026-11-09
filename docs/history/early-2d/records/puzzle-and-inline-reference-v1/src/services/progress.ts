import { z } from 'zod';
import type { ProgressData, Level, ThemeDefinition } from '../types';

export const PROGRESS_KEY = 'dunhuang:progress:v1';
export const RECOVERY_PREFIX = `${PROGRESS_KEY}:unreadable:`;
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
const progressSchema = z.object({
  version: z.literal(1), completed: z.record(z.string(), z.string().datetime()),
  settings: z.object({ reducedMotion: z.boolean() }),
});
export function emptyProgress(): ProgressData { return { version: 1, completed: {}, settings: { reducedMotion: false } }; }

export function loadProgress(storage?: StorageLike): { data: ProgressData; warning: string | null } {
  try {
    const source = storage ?? window.localStorage;
    const value = source.getItem(PROGRESS_KEY);
    if (!value) return { data: emptyProgress(), warning: null };
    const parsed = progressSchema.safeParse(JSON.parse(value));
    if (!parsed.success) return { data: emptyProgress(), warning: '这份浏览器记录暂时无法读取。原始记录没有被删除；你仍可以开始游玩。' };
    return { data: parsed.data, warning: null };
  } catch {
    return { data: emptyProgress(), warning: '暂时无法读取浏览器记录。你仍可以游玩，保存时会再次尝试。' };
  }
}

export function saveProgress(data: ProgressData, storage?: StorageLike): { ok: true } | { ok: false; message: string } {
  try {
    const parsed = progressSchema.parse(data);
    const target = storage ?? window.localStorage;
    const original = target.getItem(PROGRESS_KEY);
    if (original !== null) {
      let validOriginal = false;
      try { validOriginal = progressSchema.safeParse(JSON.parse(original)).success; } catch { /* Preserve the unreadable original before writing a fresh record. */ }
      if (!validOriginal) {
        let suffix = Date.now();
        while (target.getItem(`${RECOVERY_PREFIX}${suffix}`) !== null) suffix++;
        // If backup fails, the outer catch prevents overwriting the original data.
        target.setItem(`${RECOVERY_PREFIX}${suffix}`, original);
      }
    }
    target.setItem(PROGRESS_KEY, JSON.stringify(parsed));
    return { ok: true };
  } catch {
    return { ok: false, message: '本次进度尚未保存。浏览器存储可能不可用，你可以重试保存。' };
  }
}

export function withCompletedLevel(data: ProgressData, levelId: string, now = new Date().toISOString()): ProgressData {
  if (data.completed[levelId]) return data;
  return { ...data, completed: { ...data.completed, [levelId]: now } };
}

export function isLevelUnlocked(level: Level, theme: ThemeDefinition, _data: ProgressData): boolean {
  return level.themeId === theme.id && theme.allowedGameTypes.includes(level.gameType);
}
