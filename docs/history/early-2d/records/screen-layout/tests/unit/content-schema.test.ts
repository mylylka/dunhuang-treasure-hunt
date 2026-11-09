import { describe, expect, it } from 'vitest';
import { assertShellAssets, parseCatalog } from '../../src/services/content-schema';
import { makeCatalog } from '../fixtures/catalog';

describe('内容目录校验', () => {
  it('接受独立两处差异的关卡配置，目标数不写死为三', () => {
    const parsed = parseCatalog(makeCatalog());
    expect(parsed.levels[0].differences).toHaveLength(2);
  });
  it('报告缺少的素材与关卡编号', () => {
    const catalog = makeCatalog(); catalog.levels[0].baseAssetId = 'missing-image';
    expect(() => parseCatalog(catalog)).toThrow(/test-intro.*missing-image/);
  });
  it('A/B 图像尺寸必须相同', () => {
    const catalog = makeCatalog(); catalog.assets[1].width = 1536;
    expect(() => parseCatalog(catalog)).toThrow(/A\/B 尺寸不一致/);
  });
  it('更换图片分辨率但维持比例时不需要改变比例坐标', () => {
    const catalog = makeCatalog(); catalog.assets.forEach(a => { a.width = 1536; a.height = 1024; });
    const parsed = parseCatalog(catalog);
    expect(parsed.levels[0].differences[1].region.x).toBe(0.65);
  });
  it('拒绝越界标注', () => {
    const catalog = makeCatalog(); catalog.levels[0].differences[0].region.x = 0.95;
    expect(() => parseCatalog(catalog)).toThrow(/test-one.*越界/);
  });
  it('拒绝重复差异编号，避免发现状态冲突', () => {
    const catalog = makeCatalog(); catalog.levels[0].differences[1].id = 'test-one';
    expect(() => parseCatalog(catalog)).toThrow(/编号重复/);
  });
  it('拒绝重叠的目标区域', () => {
    const catalog = makeCatalog(); catalog.levels[0].differences[1].region = { ...catalog.levels[0].differences[0].region };
    expect(() => parseCatalog(catalog)).toThrow(/区域重叠/);
  });
  it('存在已制作关卡的主题必须有本主题入门关', () => {
    const catalog = makeCatalog(); catalog.themes[0].introLevelId = 'another-intro';
    expect(() => parseCatalog(catalog)).toThrow(/入门关.*不存在或不属于本主题/);
  });
  it('尚未制作关卡的主题可以展示说明', () => {
    const catalog = makeCatalog(); catalog.themes.push({ ...catalog.themes[0], id: 'future-theme', title: '未来主题', introLevelId: null });
    expect(parseCatalog(catalog).themes).toHaveLength(2);
  });
  it('主题限制可以阻止错误接入玩法', () => {
    const catalog = makeCatalog(); catalog.themes[0].allowedGameTypes = ['puzzle'];
    expect(() => parseCatalog(catalog)).toThrow(/不允许/);
  });
  it('素材路径不能跳出资源目录', () => {
    const catalog = makeCatalog(); catalog.assets[0].path = '/assets/../../outside.svg';
    expect(() => parseCatalog(catalog)).toThrow(/不能包含/);
  });
  it('正式界面不能遗漏背景与其他必需素材', () => {
    const catalog = makeCatalog();
    expect(() => assertShellAssets(catalog)).toThrow(/bg-landscape/);
  });
});
