import { describe, expect, it } from 'vitest';
import type { LessonBook } from '../../src/content/lessons/types';
import { parseLessonBook } from '../../src/services/lesson-schema';
import { makeCatalog } from '../fixtures/catalog';

function fixture(): LessonBook {
  const catalog = makeCatalog();
  return { id: 'test-book', themeId: catalog.themes[0].id, version: 1, title: '测试',
    sources: [{ id: 'verified', title: '真实资料', url: 'https://example.org/source' }],
    units: [{ id: 'motifs', kind: 'motifs', title: '纹样', lead: '比较', panels: [{ id: 'lotus', label: '莲花', title: '莲花', body: '观察轮廓',
      imageAssetId: catalog.assets[0].id, imageCaption: '测试图片', sourceIds: ['verified'] }] }],
  };
}
describe('教学图片、资料与互动配置', () => {
  it('接受独立教学数据', () => expect(parseLessonBook(fixture(), makeCatalog()).units).toHaveLength(1));
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
});
