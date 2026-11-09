import { describe, expect, it } from 'vitest';
import { MOGAO_EXHIBIT } from '../../src/content/world/mogao-exhibit-v001';
import { saveMogaoExhibitProgress } from '../../src/services/mogao-exhibit-progress';
import { claimMogaoGameNotice, hasMogaoGameAccess } from '../../src/services/mogao-game-access';
import { saveMogaoHallAProgress, type MogaoHallAProgress } from '../../src/services/mogao-hall-a-progress';

describe('Mogao story game access', () => {
  it('requires both complete and received folios, and only claims the hint once', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    const a: MogaoHallAProgress = { completed: ['bandits', 'burning-house', 'story-demo', 'novice-story'], opened: true, noticeSeen: false };
    const b = { version: 1 as const, viewed: MOGAO_EXHIBIT.items.map(item => item.id), introSeen: true, noticeSeen: false };

    saveMogaoHallAProgress(a, storage);
    saveMogaoExhibitProgress(b, storage);
    expect(hasMogaoGameAccess(storage)).toBe(false);
    saveMogaoExhibitProgress({ ...b, noticeSeen: true }, storage);
    expect(hasMogaoGameAccess(storage)).toBe(false);
    saveMogaoHallAProgress({ ...a, noticeSeen: true }, storage);
    expect(hasMogaoGameAccess(storage)).toBe(true);
    expect(claimMogaoGameNotice(storage)).toBe(true);
    expect(claimMogaoGameNotice(storage)).toBe(false);
    expect(hasMogaoGameAccess(storage)).toBe(true);
  });

  it('keeps the game entrance unlocked when a legacy save already received both folios', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    const legacy = 'dunhuang:mogao-hall-a:progress:v1';
    storage.setItem(`${legacy}:bandits`, 'complete');
    storage.setItem(`${legacy}:burning-house`, 'complete');
    saveMogaoExhibitProgress({ version: 1, viewed: MOGAO_EXHIBIT.items.map(item => item.id), introSeen: true, noticeSeen: true }, storage);
    expect(hasMogaoGameAccess(storage)).toBe(false);
    storage.setItem(`${legacy}:award`, 'received');
    expect(hasMogaoGameAccess(storage)).toBe(true);
  });
});
