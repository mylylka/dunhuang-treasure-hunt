import { describe, expect, it } from 'vitest';
import { assertShellAssets, parseCatalog } from '../../src/services/content-schema';
import { makeCatalog } from '../fixtures/catalog';

describe('内容目录校验', () => {
  it('文化链接可不附加说明，但标题和网址仍须有效', () => {
    const catalog = makeCatalog(); catalog.levels[0].source.note = '';
    expect(parseCatalog(catalog).levels[0].source.note).toBe('');
    catalog.levels[0].source.title = '';
    expect(() => parseCatalog(catalog)).toThrow(/source.title/);
  });
  it('接受独立两处差异的关卡配置，目标数不写死为三', () => {
    const parsed = parseCatalog(makeCatalog());
    if (parsed.levels[0].gameType !== 'spot-difference') throw new Error('测试关类型错误');
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
    if (parsed.levels[0].gameType !== 'spot-difference') throw new Error('测试关类型错误');
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
  it('保留同一差异的附加区域，允许它与本差异主区域重叠', () => {
    const catalog = makeCatalog();
    catalog.levels[0].differences[0].additionalRegions = [
      { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
      { x: 0.4, y: 0.1, width: 0.1, height: 0.2 },
    ];
    const parsed = parseCatalog(catalog);
    if (parsed.levels[0].gameType !== 'spot-difference') throw new Error('测试关类型错误');
    expect(parsed.levels[0].differences[0].additionalRegions).toEqual(catalog.levels[0].differences[0].additionalRegions);
  });
  it('拒绝附加差异区域越界', () => {
    const catalog = makeCatalog();
    catalog.levels[0].differences[0].additionalRegions = [{ x: 0.95, y: 0.2, width: 0.1, height: 0.1 }];
    expect(() => parseCatalog(catalog)).toThrow(/test-one.*越界/);
  });
  it('拒绝附加区域覆盖另一差异的主区域', () => {
    const catalog = makeCatalog();
    catalog.levels[0].differences[0].additionalRegions = [{ ...catalog.levels[0].differences[1].region }];
    expect(() => parseCatalog(catalog)).toThrow(/test-one.*test-two.*区域重叠/);
  });
  it('拒绝不同差异的附加区域互相覆盖', () => {
    const catalog = makeCatalog();
    catalog.levels[0].differences[0].additionalRegions = [{ x: 0.4, y: 0.4, width: 0.1, height: 0.1 }];
    catalog.levels[0].differences[1].additionalRegions = [{ x: 0.45, y: 0.45, width: 0.1, height: 0.1 }];
    expect(() => parseCatalog(catalog)).toThrow(/test-one.*test-two.*区域重叠/);
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
  it('新方图和旧长方图都按登记尺寸呈现，不强制3:2', () => {
    const catalog = makeCatalog();
    catalog.assets.forEach(asset => { asset.width = 1254; asset.height = 1254; });
    expect(parseCatalog(catalog).levels).toHaveLength(1);
  });
  it('旋转与碎片模式各自校验，不允许非方图块旋转或伪造片数', () => {
    const catalog = makeCatalog();
    const { baseAssetId, editedAssetId, differences, ...metadata } = catalog.levels[0];
    const puzzle = { ...metadata, gameType: 'puzzle', imageAssetId: baseAssetId, mode: 'rotation', rows: 3, columns: 3, seed: 123 };
    const input = { ...catalog, themes: [{ ...catalog.themes[0], allowedGameTypes: ['puzzle'] }], levels: [puzzle] };
    expect(() => parseCatalog(input)).toThrow(/正方形/);
    const square = { ...input, assets: catalog.assets.map(asset => ({ ...asset, width: 1440, height: 1440 })) };
    expect(parseCatalog(square).levels[0]).toMatchObject({ gameType: 'puzzle', mode: 'rotation', rows: 3, columns: 3 });
    expect(parseCatalog({ ...square, levels: [{ ...puzzle, mode: 'jigsaw', rows: 3, columns: 4 }] }).levels[0]).toMatchObject({ rows: 3, columns: 4 });
    expect(() => parseCatalog({ ...square, levels: [{ ...puzzle, rows: 0 }] })).toThrow();
    expect(() => parseCatalog({ ...square, levels: [{ ...puzzle, rows: 8, columns: 8 }] })).toThrow(/最多支持48片/);
    expect(() => parseCatalog({ ...square, levels: [{ ...puzzle, imageAssetId: 'missing-puzzle' }] })).toThrow(/missing-puzzle/);
  });
  it('填色以自己的区域配置通过校验，不需要找不同字段', () => {
    const catalog = makeCatalog();
    const { baseAssetId, editedAssetId, differences, ...metadata } = catalog.levels[0];
    const coloring = { ...metadata, gameType: 'coloring', referenceAssetId: baseAssetId, lineAssetId: baseAssetId,
      regionMapAssetId: editedAssetId, artworkVersion: 'v1', palette: [{ id: 'ochre', label: '赭', color: '#a85131' }],
      regions: [{ id: 1, label: '花瓣', region: { x: .1, y: .1, width: .2, height: .2 }, point: { x: .2, y: .2 }, pixelCount: 30 }] };
    const input = { ...catalog, themes: [{ ...catalog.themes[0], allowedGameTypes: ['coloring'] }], levels: [coloring] };
    expect(parseCatalog(input).levels[0].gameType).toBe('coloring');
    expect('differences' in parseCatalog(input).levels[0]).toBe(false);
    expect(() => parseCatalog({ ...input, levels: [{ ...coloring, regionMapAssetId: 'missing-map' }] })).toThrow(/missing-map/);
    expect(() => parseCatalog({ ...input, levels: [{ ...coloring, regions: [...coloring.regions, ...coloring.regions] }] })).toThrow(/编号重复/);
    expect(() => parseCatalog({ ...input, levels: [{ ...coloring, regions: [{ ...coloring.regions[0], point: { x: .8, y: .2 } }] }] })).toThrow(/取样点越界/);
  });
});
