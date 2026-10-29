import { z } from 'zod';
import type { StorageLike } from './progress';

export const SOUND_SETTINGS_KEY = 'dunhuang:sound-settings:v1';
export const SOUND_RECOVERY_PREFIX = `${SOUND_SETTINGS_KEY}:unreadable:`;
export interface SoundPreferences { version: 1; enabled: boolean; volume: number }
const schema = z.object({ version: z.literal(1), enabled: z.boolean(), volume: z.number().finite().min(0).max(1) });

export function defaultSoundPreferences(): SoundPreferences { return { version: 1, enabled: true, volume: .4 }; }

export function loadSoundSettings(storage?: StorageLike): { data: SoundPreferences; warning: string | null } {
  try {
    const original = (storage ?? window.localStorage).getItem(SOUND_SETTINGS_KEY);
    if (!original) return { data: defaultSoundPreferences(), warning: null };
    const result = schema.safeParse(JSON.parse(original));
    if (result.success) return { data: result.data, warning: null };
    return { data: defaultSoundPreferences(), warning: '原音效设置暂时无法读取，已使用默认值；原记录已保留。' };
  } catch {
    return { data: defaultSoundPreferences(), warning: '暂时无法读取音效设置，本次仍可调整声音。' };
  }
}

export function saveSoundSettings(data: SoundPreferences, storage?: StorageLike): { ok: true } | { ok: false; message: string } {
  try {
    const value = schema.parse(data);
    const target = storage ?? window.localStorage;
    const original = target.getItem(SOUND_SETTINGS_KEY);
    if (original !== null) {
      let valid = false;
      try { valid = schema.safeParse(JSON.parse(original)).success; } catch { /* Preserve malformed data before replacing it. */ }
      if (!valid) {
        let suffix = Date.now();
        while (target.getItem(`${SOUND_RECOVERY_PREFIX}${suffix}`) !== null) suffix++;
        target.setItem(`${SOUND_RECOVERY_PREFIX}${suffix}`, original);
      }
    }
    target.setItem(SOUND_SETTINGS_KEY, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, message: '音效设置尚未保存，本次调整仍有效，可以重试保存。' };
  }
}
