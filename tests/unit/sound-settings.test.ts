import { describe, expect, it } from 'vitest';
import { defaultSoundPreferences, loadSoundSettings, saveSoundSettings, SOUND_RECOVERY_PREFIX, SOUND_SETTINGS_KEY } from '../../src/services/sound-settings';
import { emptyProgress, PROGRESS_KEY, saveProgress, type StorageLike } from '../../src/services/progress';

function storage(): StorageLike & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

describe('独立音效设置', () => {
  it('默认开启40%，每次得到独立数据', () => {
    expect(loadSoundSettings(storage())).toEqual({ data: { version: 1, enabled: true, volume: .4 }, warning: null });
    expect(defaultSoundPreferences()).not.toBe(defaultSoundPreferences());
  });
  it('开关、静音及音量重载不修改旧游戏进度', () => {
    const target = storage();
    saveProgress(emptyProgress(), target);
    const old = target.getItem(PROGRESS_KEY);
    const data = { version: 1 as const, enabled: false, volume: 0 };
    expect(saveSoundSettings(data, target)).toEqual({ ok: true });
    expect(loadSoundSettings(target)).toEqual({ data, warning: null });
    expect(target.getItem(PROGRESS_KEY)).toBe(old);
  });
  it.each(['{bad', '{"version":1,"enabled":true,"volume":1.2}', '{"version":2,"enabled":false,"volume":0.2}'])('无法读取的原数据保留并在保存前备份：%s', original => {
    const target = storage(); target.setItem(SOUND_SETTINGS_KEY, original);
    expect(loadSoundSettings(target).warning).toBeTruthy();
    expect(target.getItem(SOUND_SETTINGS_KEY)).toBe(original);
    expect(saveSoundSettings(defaultSoundPreferences(), target).ok).toBe(true);
    const backup = [...target.values].filter(([key]) => key.startsWith(SOUND_RECOVERY_PREFIX));
    expect(backup).toHaveLength(1); expect(backup[0][1]).toBe(original);
  });
  it('备份失败时不覆盖损坏原记录', () => {
    const memory = storage(); memory.setItem(SOUND_SETTINGS_KEY, '{valuable');
    const target: StorageLike = { getItem: memory.getItem, setItem: (key, value) => {
      if (key.startsWith(SOUND_RECOVERY_PREFIX)) throw new Error('quota');
      memory.setItem(key, value);
    } };
    expect(saveSoundSettings(defaultSoundPreferences(), target).ok).toBe(false);
    expect(memory.getItem(SOUND_SETTINGS_KEY)).toBe('{valuable');
  });
  it('存储不可用时返回警告和重试结果，不依赖浏览器', () => {
    const unavailable: StorageLike = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadSoundSettings(unavailable).data).toEqual(defaultSoundPreferences());
    expect(loadSoundSettings(unavailable).warning).toBeTruthy();
    expect(saveSoundSettings(defaultSoundPreferences(), unavailable).ok).toBe(false);
    expect(saveSoundSettings(defaultSoundPreferences(), storage()).ok).toBe(true);
    expect(loadSoundSettings().warning).toBeTruthy();
  });
  it('拒绝非有限或越界音量，不写入无效设置', () => {
    const target = storage();
    expect(saveSoundSettings({ version: 1, enabled: true, volume: NaN }, target).ok).toBe(false);
    expect(saveSoundSettings({ version: 1, enabled: true, volume: -1 }, target).ok).toBe(false);
    expect(target.values.size).toBe(0);
  });
});
