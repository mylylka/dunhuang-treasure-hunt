import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ContentCatalog, ProgressData, PuzzleLevel } from '../../src/types';
import { makeCatalog, makeLevel } from '../fixtures/catalog';
import { LevelSelectScreen, calculateLevelGridLayout } from '../../src/app/LevelSelectScreen';

vi.mock('../../src/content', () => ({
  getAssetUrl: (_catalog: ContentCatalog, id: string) => `https://selection.test/assets/${id}.png`,
}));

function render(catalog: ContentCatalog, progress: ProgressData, gameType: 'spot-difference' | 'puzzle' = 'spot-difference') {
  return renderToStaticMarkup(createElement(LevelSelectScreen, {
    catalog, theme: catalog.themes[0], gameType, progress, onBack: () => {}, hrefForLevel: id => `#/play/${id}`,
  }));
}

describe('连续滚动关卡目录', () => {
  it.each([{ width: 768, height: 176, screen: 300 }, { width: 776, height: 206, screen: 330 }])(
    '手机横屏列表$width宽至少三列，卡片紧凑且首排可完整进入可见区', ({ width, height, screen }) => {
      const layout = calculateLevelGridLayout(width, height, screen);
      expect(layout.columns).toBeGreaterThanOrEqual(3);
      expect(layout.cardHeight).toBeGreaterThanOrEqual(120);
      expect(layout.cardHeight).toBeLessThanOrEqual(155);
      expect(layout.cardHeight).toBeLessThanOrEqual(height);
      expect((width - (layout.columns - 1) * layout.gap) / layout.columns).toBeGreaterThanOrEqual(192);
    },
  );

  it('大屏保留同屏六卡，宽度充足的短屏可使用四列', () => {
    const desktop = calculateLevelGridLayout(1100, 700, 800);
    expect(desktop.compact).toBe(false);
    expect(desktop.columns).toBe(3);
    expect(desktop.cardHeight * 2 + desktop.gap).toBeLessThanOrEqual(700);
    expect(calculateLevelGridLayout(1040, 210, 330).columns).toBe(4);
    expect(calculateLevelGridLayout(300, 600, 700).columns).toBe(1);
  });

  it('所有正式关与筹备位都留在同一目录，不因一屏容量而截断或生成翻页', () => {
    const fixture = makeCatalog();
    const levels = ['patterns-intro', ...Array.from({ length: 5 }, (_, index) => `extra-${index}`)]
      .map(id => ({ ...makeLevel(id), themeId: 'patterns' }));
    const catalog = { ...fixture, themes: [{ ...fixture.themes[0], id: 'patterns' }], levels };
    const progress: ProgressData = { version: 1, completed: { 'patterns-intro': '2026-11-01T00:00:00.000Z', 'patterns-geometry': 'older-record' }, settings: { reducedMotion: true } };
    const original = JSON.stringify({ catalog, progress });
    const markup = render(catalog, progress);
    const cards = [...markup.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]);
    expect(cards).toHaveLength(11);
    expect(markup).toContain('data-testid="level-choice-scroll"');
    expect(markup).not.toContain('关卡分页');
    expect(markup).not.toContain('上一页');
    expect(markup).not.toContain('下一页');
    for (const level of levels) {
      const card = cards.find(value => value.includes(`data-level-id="${level.id}"`))!;
      expect(card.match(new RegExp(`href="#/play/${level.id}"`, 'g'))).toHaveLength(3);
    }
    for (const card of cards.filter(value => value.includes('data-status="planned"'))) {
      expect(card).not.toContain('<a ');
      expect(card).toContain('筹备中');
      expect(card).not.toContain('已完成');
    }
    expect(JSON.stringify({ catalog, progress })).toBe(original);
  });

  it('已完成拼图仍显示开始拼图，筹备位不会读取旧完成记录变成入口', () => {
    const fixture = makeCatalog();
    const puzzle: PuzzleLevel = { ...makeLevel('puzzle-lotus-ceiling'), themeId: 'patterns', gameType: 'puzzle', imageAssetId: 'test-a', mode: 'rotation', rows: 3, columns: 3, seed: 42 };
    const catalog: ContentCatalog = { ...fixture, themes: [{ ...fixture.themes[0], id: 'patterns' }], levels: [puzzle] };
    const progress: ProgressData = { version: 1, completed: { [puzzle.id]: '2026-11-01T00:00:00.000Z' }, settings: { reducedMotion: false } };
    const markup = render(catalog, progress, 'puzzle');
    expect(markup.match(/data-status="planned"/g)).toHaveLength(5);
    expect(markup).toContain('开始拼图');
    expect(markup).not.toContain('再拼一次');
    expect(markup).toContain('已完成');
  });
});
