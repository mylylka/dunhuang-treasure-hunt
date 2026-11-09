import { describe, expect, it } from 'vitest';
import type { LessonBook } from '../../src/content/lessons/types';
import { patternLesson } from '../../src/content/lessons/patterns';
import { parseLessonBook } from '../../src/services/lesson-schema';
import { makeCatalog } from '../fixtures/catalog';

function fixture(): LessonBook {
  const catalog = makeCatalog();
  return { id: 'test-book', themeId: catalog.themes[0].id, version: 1, title: '测试',
    sources: [{ id: 'verified', title: '真实资料', url: 'https://example.org/source' }],
    units: [{ id: 'motifs', kind: 'motifs', tabLabel: '花叶纹样', title: '纹样', lead: '比较', panels: [{ id: 'lotus', label: '莲花', title: '莲花', body: '观察轮廓',
      imageAssetId: catalog.assets[0].id, imageCaption: '测试图片', sourceIds: ['verified'] }] }],
  };
}
describe('教学图片、资料与互动配置', () => {
  it('接受独立教学数据', () => expect(parseLessonBook(fixture(), makeCatalog()).units).toHaveLength(1));
  it('短页签必填，导语可省略并兼容已有导语', () => {
    const data = fixture();
    expect(parseLessonBook(data, makeCatalog()).units[0].lead).toBe('比较');
    delete data.units[0].lead;
    expect(parseLessonBook(data, makeCatalog()).units[0].lead).toBeUndefined();
    const missingTab = structuredClone(data) as unknown as { units: Record<string, unknown>[] };
    delete missingTab.units[0].tabLabel;
    expect(() => parseLessonBook(missingTab, makeCatalog())).toThrow(/tabLabel/);
    data.units[0].tabLabel = '   ';
    expect(() => parseLessonBook(data, makeCatalog())).toThrow(/tabLabel/);
  });
  it('缺图和缺资料均明确报错', () => {
    const data = fixture(); data.units[0].panels[0].imageAssetId = 'missing';
    expect(() => parseLessonBook(data, makeCatalog())).toThrow(/图片不存在/);
    data.units[0].panels[0].imageAssetId = makeCatalog().assets[0].id;
    data.units[0].panels[0].sourceIds = ['unverified'];
    expect(() => parseLessonBook(data, makeCatalog())).toThrow(/来源不存在/);
  });
  it('拒绝越界热点与无效答案', () => {
    const data = fixture(); data.units[0].panels[0].focus = { x: 0.9, y: 0, width: 0.4, height: 0.2 };
    expect(() => parseLessonBook(data, makeCatalog())).toThrow(/越界/);
    delete data.units[0].panels[0].focus;
    data.units[0].question = { id: 'one', prompt: '选择', options: ['甲', '乙'], correctIndex: 3, feedback: '解释' };
    expect(() => parseLessonBook(data, makeCatalog())).toThrow(/答案编号/);
  });
  it('拒绝重复章节编号', () => {
    const data = fixture(); data.units.push({ ...data.units[0] });
    expect(() => parseLessonBook(data, makeCatalog())).toThrow(/章节编号重复/);
  });
  it('拒绝同一小考中重复的问题编号', () => {
    const data = fixture();
    const one = { id: 'one', prompt: '选择', options: ['甲', '乙'], correctIndex: 0, feedback: '解释' };
    data.units[0].questions = [one, { ...one }];
    expect(() => parseLessonBook(data, makeCatalog())).toThrow(/问题编号重复/);
  });
  it('正式导览保留七个短页签与明确的纹样标题', () => {
    expect(patternLesson.units.map(unit => unit.tabLabel)).toEqual(['装饰部位', '花叶纹样', '几何纹样', '动物纹样', '组织方式', '色彩', '知识小考']);
    expect(patternLesson.units.every(unit => unit.lead === undefined)).toBe(true);
    for (const unit of patternLesson.units) for (const panel of unit.panels) {
      expect(panel.title.startsWith(`${panel.label}｜`)).toBe(true);
    }
    const scroll = patternLesson.units.find(unit => unit.id === 'motifs')!.panels.find(panel => panel.id === 'scroll')!;
    expect(scroll.focus).toBeDefined();
    const mark = scroll.highlights![0];
    expect(scroll.focus!.x).toBeLessThanOrEqual(mark.x);
    expect(scroll.focus!.y).toBeLessThanOrEqual(mark.y);
    expect(scroll.focus!.x + scroll.focus!.width).toBeGreaterThanOrEqual(mark.x + mark.width);
    expect(scroll.focus!.y + scroll.focus!.height).toBeGreaterThanOrEqual(mark.y + mark.height);
  });
  it('六题小考覆盖前六屏，已有题号保留且不在章节重复出题', () => {
    const review = patternLesson.units.find(unit => unit.id === 'review')!;
    expect(review.title).toBe('知识小考');
    expect(review.questions?.map(question => question.id)).toEqual(['review-location', 'review-motifs', 'review-evidence', 'count-rabbit-ears', 'review-organization', 'photo-and-pigment']);
    expect(patternLesson.units.filter(unit => unit.id !== 'review').every(unit => !unit.question && !unit.questions)).toBe(true);
    for (const question of review.questions!) {
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.options[question.correctIndex]).toBeTruthy();
      expect(question.feedback).not.toBe('');
    }
  });
});
