import { describe, expect, it } from 'vitest';
import { getLevelChoices, levelRoadmap } from '../../src/content/level-roadmap';
import { makeLevel } from '../fixtures/catalog';

const patternLevel = (id: string) => ({ ...makeLevel(id), themeId: 'patterns' });

describe('规划关卡与正式关卡分开管理', () => {
  it('没有正式内容时，六个筹备位都不包含可玩的关卡对象', () => {
    const choices = getLevelChoices({ levels: [] }, 'patterns', 'spot-difference');
    expect(choices.map(choice => choice.title)).toEqual(['藻井寻踪', '莲瓣与团花', '忍冬与卷草', '联珠与几何', '三兔与旋转', '色彩与层次']);
    expect(choices.every(choice => choice.status === 'planned' && !('level' in choice))).toBe(true);
    expect(levelRoadmap.map(entry => entry.plannedDifferenceCount)).toEqual([5, 5, 5, 5, 5, 6]);
  });

  it('只按实际目录开放首关，差异数量和图片来自正式内容', () => {
    const level = patternLevel('patterns-intro');
    const choices = getLevelChoices({ levels: [level] }, 'patterns', 'spot-difference');
    expect(choices).toHaveLength(6);
    const open = choices.filter(choice => choice.status === 'available');
    expect(open).toHaveLength(1);
    expect(open[0].id).toBe(level.id);
    expect(open[0].level).toBe(level);
    // The fixture has two actual targets although the editorial plan says five.
    if (open[0].level.gameType !== 'spot-difference') throw new Error('测试关类型错误');
    expect(open[0].level.differences).toHaveLength(2);
    expect(open[0].roadmap!.plannedDifferenceCount).toBe(5);
    expect(choices.slice(1).every(choice => choice.status === 'planned')).toBe(true);
  });

  it('与规划同ID的新正式关替换筹备位，不重复出现', () => {
    const level = patternLevel('patterns-lotus');
    const choices = getLevelChoices({ levels: [patternLevel('patterns-intro'), level] }, 'patterns', 'spot-difference');
    expect(choices).toHaveLength(6);
    expect(choices.filter(choice => choice.id === level.id)).toHaveLength(1);
    expect(choices[1]).toMatchObject({ id: level.id, title: '莲瓣与团花', status: 'available', level });
  });

  it('路线之外的真实新增关全部保留，六关测试目录不会被规划吞掉', () => {
    const levels = [patternLevel('patterns-intro'), ...Array.from({ length: 5 }, (_, index) => patternLevel(`test-pagination-${index}`))];
    const choices = getLevelChoices({ levels }, 'patterns', 'spot-difference');
    expect(choices).toHaveLength(11);
    expect(choices.filter(choice => choice.status === 'available').map(choice => choice.id)).toEqual(levels.map(level => level.id));
    expect(new Set(choices.map(choice => choice.id)).size).toBe(choices.length);
  });

  it('其他主题的同名ID不能开放本主题的筹备位，也不会混入别的玩法', () => {
    const otherTheme = { ...makeLevel('patterns-lotus'), themeId: 'different-theme' };
    const choices = getLevelChoices({ levels: [otherTheme] }, 'patterns', 'spot-difference');
    expect(choices.every(choice => choice.status === 'planned')).toBe(true);
    const puzzles = getLevelChoices({ levels: [otherTheme] }, 'patterns', 'puzzle');
    expect(puzzles).toHaveLength(6);
    expect(puzzles.every(choice => choice.status === 'planned' && !('level' in choice))).toBe(true);
    expect(getLevelChoices({ levels: [otherTheme] }, 'different-theme', 'spot-difference'))
      .toEqual([{ id: otherTheme.id, title: otherTheme.title, status: 'available', level: otherTheme }]);
  });

  it('生成目录不会修改正式内容或向目录插入假关卡', () => {
    const catalog = { levels: [patternLevel('patterns-intro')] };
    const before = JSON.stringify(catalog);
    getLevelChoices(catalog, 'patterns', 'spot-difference');
    expect(JSON.stringify(catalog)).toBe(before);
    expect(catalog.levels).toHaveLength(1);
  });
});
