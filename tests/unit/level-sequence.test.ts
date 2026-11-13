import { describe, expect, it } from 'vitest';
import type { GameType, Level } from '../../src/types';
import { compactTitleWords, getNextOpenLevel, getPreviousOpenLevel } from '../../src/services/level-sequence';
import { makeLevel } from '../fixtures/catalog';

function levelForGame(id: string, gameType: GameType, themeId = 'unit'): Level {
  const base = { ...makeLevel(id), themeId };
  if (gameType === 'spot-difference') return base;
  if (gameType === 'puzzle') return { ...base, gameType, imageAssetId: 'test-a', mode: 'rotation', rows: 2, columns: 2, seed: 1 };
  if (gameType === 'coloring') return { ...base, gameType, referenceAssetId: 'test-a', lineAssetId: 'test-a', regionMapAssetId: 'test-a', artworkVersion: 'unit', palette: [], regions: [] };
  if (gameType === 'shadow-match') return { ...base, gameType, referenceAssetId: 'test-a', options: [], correctOptionId: 'unit', hints: [] };
  return { ...base, gameType, poolId: 'unit', board: { width: 960, height: 1800, columns: 12, rows: 20, inset: 10, jitter: 5 }, categoryQuotas: [], tasks: { groupIds: [], groupCount: 1, minCount: 1, maxCount: 2 }, timeLimitSeconds: 50 };
}

describe('同主题同玩法的关间导航', () => {
  it('沿选关顺序前后切换实际关，跨过筹备位且不修改任何关卡', () => {
    const intro = { ...makeLevel('patterns-intro'), themeId: 'patterns' };
    const later = { ...makeLevel('patterns-scrolls'), themeId: 'patterns' };
    const levels = Object.freeze([Object.freeze(later), Object.freeze(intro)]);
    const catalog = { levels: [...levels] };
    const original = JSON.stringify(catalog);
    expect(getNextOpenLevel(catalog, intro)).toBe(later);
    expect(getNextOpenLevel(catalog, later)).toBeNull();
    expect(getPreviousOpenLevel(catalog, intro)).toBeNull();
    expect(getPreviousOpenLevel(catalog, later)).toBe(intro);
    expect(JSON.stringify(catalog)).toBe(original);
  });

  it.each(['spot-difference', 'puzzle', 'coloring', 'hidden-object', 'shadow-match'] as const)('%s只在当前主题当前玩法切换，首末不循环', gameType => {
    const make = (id: string, themeId = 'unit') => levelForGame(id, gameType, themeId);
    const first = make('first'), second = make('second');
    const differentTheme = make('other-theme', 'other');
    const differentGame = levelForGame('other-game', gameType === 'puzzle' ? 'coloring' : 'puzzle');
    const catalog = { levels: [differentTheme, first, differentGame, second] };
    expect(getNextOpenLevel(catalog, first)).toBe(second);
    expect(getNextOpenLevel(catalog, second)).toBeNull();
    expect(getPreviousOpenLevel(catalog, first)).toBeNull();
    expect(getPreviousOpenLevel(catalog, second)).toBe(first);
    expect(getNextOpenLevel({ levels: [differentTheme, first, differentGame] }, first)).toBeNull();
    expect(getPreviousOpenLevel({ levels: [differentTheme, first, differentGame] }, first)).toBeNull();
  });

  it('不在正式目录中的关卡不能凭元数据造出上一关或下一关', () => {
    expect(getNextOpenLevel({ levels: [makeLevel('actual')] }, makeLevel('missing'))).toBeNull();
    expect(getPreviousOpenLevel({ levels: [makeLevel('actual')] }, makeLevel('missing'))).toBeNull();
  });

  it('三张新增填色图按交付顺序替换前三关', () => {
    const sequence = [
      'coloring-floral-scroll', 'coloring-lotus-rosette', 'coloring-deer-medallion',
      'coloring-three-rabbits', 'coloring-feitian-lotus',
    ].map(id => levelForGame(id, 'coloring', 'patterns'));
    const catalog = { levels: [...sequence].reverse() };
    for (const [index, level] of sequence.entries()) {
      expect(getPreviousOpenLevel(catalog, level)).toBe(sequence[index - 1] ?? null);
      expect(getNextOpenLevel(catalog, level)).toBe(sequence[index + 1] ?? null);
    }
  });

  it('四字题名按双字词组换行，题名冒号之后仍由完整无障碍名称承载', () => {
    expect(compactTitleWords('双龙藻井')).toEqual(['双龙', '藻井']);
    expect(compactTitleWords('莲花平棋')).toEqual(['莲花', '平棋']);
    expect(compactTitleWords('莲瓣团花：寻找五处变化')).toEqual(['莲瓣', '团花']);
    expect(compactTitleWords('三兔')).toEqual(['三兔']);
  });
});
