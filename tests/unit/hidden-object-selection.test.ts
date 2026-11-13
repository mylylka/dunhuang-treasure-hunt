import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LevelSelectScreen, calculateHiddenObjectChapterGridLayout, groupHiddenObjectChoices } from '../../src/app/LevelSelectScreen';
import { getLevelChoices } from '../../src/content/level-roadmap';
import type { ContentCatalog, HiddenObjectLevel, ProgressData } from '../../src/types';
import { makeCatalog, makeLevel } from '../fixtures/catalog';

vi.mock('../../src/content', () => ({
  getAssetUrl: (_catalog: ContentCatalog, id: string) => `https://selection.test/assets/${id}.png`,
}));

const titles = ['衣冠乐舞', '花间生灵', '万象寻宝'];
const firstId = 'music-hidden-objects-intro';

function hiddenLevel(order: number, number: number): HiddenObjectLevel {
  const id = order === 1 && number === 1 ? firstId : `chapter-${order}-level-${number}`;
  return { ...makeLevel(id), themeId: 'music', gameType: 'hidden-object', title: `${titles[order - 1]}${number}`,
    poolId: 'fixture', board: { width: 960, height: 1800, columns: 12, rows: 20, inset: 10, jitter: 5 },
    categoryQuotas: [], timeLimitSeconds: 50,
    tasks: { groupIds: ['one', 'two', 'three', 'four'], groupCount: order === 1 ? 3 : 4,
      minCount: 1, maxCount: 2, ...(order > 1 ? { totalCount: order === 2 ? 7 : 8 } : {}) },
    chapter: { id: `chapter-${order}`, title: titles[order - 1], order, level: number,
      backgroundAssetId: `hidden-object-background-ch${order}` },
  };
}

function fixture() {
  const base = makeCatalog();
  const ordered = [1, 2, 3].flatMap(order => [1, 2, 3].map(number => hiddenLevel(order, number)));
  const catalog: ContentCatalog = { ...base, themes: [{ ...base.themes[0], id: 'music' }], levels: [...ordered].reverse() };
  return { catalog, ordered };
}

describe('找物章节目录与紧凑列表', () => {
  it.each([{ width: 590, height: 220, screen: 288 }, { width: 802, height: 250, screen: 318 }])(
    '手机$width宽每章三张卡同排，首章无需页面滚动且入口有足够宽度', ({ width, height, screen }) => {
      const layout = calculateHiddenObjectChapterGridLayout(width, height, screen);
      expect(layout.compact).toBe(true);
      expect(layout.columns).toBe(3);
      expect((width - 2 * layout.gap) / 3).toBeGreaterThanOrEqual(170);
      expect(layout.cardHeight).toBeGreaterThanOrEqual(122);
      expect(layout.cardHeight).toBeLessThanOrEqual(138);
      expect(layout.cardHeight + 40).toBeLessThanOrEqual(height);
    },
  );

  it('宽电脑仍按章三列，窄电脑按实际宽度换行而不假装手机', () => {
    const desktop = calculateHiddenObjectChapterGridLayout(1100, 700, 850);
    expect(desktop.columns).toBe(3); expect(desktop.compact).toBe(false);
    expect(desktop.cardHeight).toBeLessThanOrEqual(290);
    expect(calculateHiddenObjectChapterGridLayout(310, 600, 760).columns).toBe(1);
  });

  it('乱序正式目录按章再按关分成三组，不创建额外可玩位置', () => {
    const { catalog, ordered } = fixture();
    const original = JSON.stringify(catalog);
    const choices = getLevelChoices(catalog, 'music', 'hidden-object');
    expect(choices.map(choice => choice.id)).toEqual(ordered.map(level => level.id));
    const groups = groupHiddenObjectChoices(choices);
    expect(groups.map(group => group.chapter?.title)).toEqual(titles);
    expect(groups.map(group => group.entries.length)).toEqual([3, 3, 3]);
    expect(groups.flatMap(group => group.entries.map(entry => entry.offset))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(JSON.stringify(catalog)).toBe(original);
  });

  it('九卡使用各章真实底图，封面标题与入口均保留链接及旧首关完成标记', () => {
    const { catalog, ordered } = fixture();
    const progress: ProgressData = { version: 1, completed: { [firstId]: '2026-11-01T00:00:00.000Z' }, settings: { reducedMotion: true } };
    const original = JSON.stringify({ catalog, progress });
    const markup = renderToStaticMarkup(createElement(LevelSelectScreen, {
      catalog, theme: catalog.themes[0], gameType: 'hidden-object', progress,
      onBack: () => {}, hrefForLevel: id => `#/play/${id}`,
    }));
    const sections = [...markup.matchAll(/<section class="level-chapter"[^>]*>[\s\S]*?<\/section>/g)].map(match => match[0]);
    expect(sections).toHaveLength(3);
    expect(markup).toContain('data-chapter-count="3"');
    expect(markup).toContain('data-testid="level-choice-scroll"');
    for (const [index, section] of sections.entries()) {
      expect(section).toContain(`data-chapter-order="${index + 1}"`);
      expect(section).toContain(titles[index]);
      expect(section.match(/<article\b/g)).toHaveLength(3);
      expect(section.match(new RegExp(`src="https://selection.test/assets/hidden-object-background-ch${index + 1}\\.png"`, 'g'))).toHaveLength(3);
    }
    const cards = [...markup.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]);
    expect(cards).toHaveLength(9);
    for (const level of ordered) {
      const card = cards.find(value => value.includes(`data-level-id="${level.id}"`))!;
      expect(card.match(new RegExp(`href="#/play/${level.id}"`, 'g'))).toHaveLength(3);
      expect(card).toContain(`data-chapter-level="${level.chapter!.level}"`);
      expect(card).toContain('开始找物');
    }
    expect(markup.match(/selected-level-completed completed-label/g)).toHaveLength(1);
    expect(markup).not.toContain('上一页'); expect(markup).not.toContain('下一页');
    expect(JSON.stringify({ catalog, progress })).toBe(original);
  });
});
