import { describe, expect, it, vi } from 'vitest';
import { calculateColoringLayout, clearColoring, coloringTextureSize, colorsEqual, createColoringState, decodeRegionId,
  imagePoint, interpolateColor, isColoringMaterial, materialsEqual, paintRegion, undoColoring } from '../../src/games/coloring/rules';
import { calculateLayout } from '../../src/runtime/layout';
import { createColoringScene } from '../../src/games/coloring/scene';
import type { ColoringLevel, ColoringMaterialId, RegionMaterials } from '../../src/types';

describe('独立填色状态与可撤销编辑', () => {
  it('滤除未知区域及坏颜色，白色不伪记为实际着色', () => {
    expect(createColoringState({ 1: '#AABBCC', 2: '#ffffff', 3: 'red', 4: '#112233', 0: '#123456' }, new Set([1, 2, 3]))
      .colors).toEqual({ 1: '#aabbcc' });
    const empty = createColoringState();
    expect(paintRegion(empty, 1, '#ffffff')).toBe(empty);
    expect(paintRegion(empty, 0, '#123456')).toBe(empty);
  });

  it('重复同色不生成编辑，撤销返回原颜色且原状态不被改变', () => {
    const initial = createColoringState({ 1: '#aabbcc' });
    const changed = paintRegion(initial, 1, '#345678');
    expect(paintRegion(changed, 1, '#345678')).toBe(changed);
    expect(undoColoring(changed).colors).toEqual({ 1: '#aabbcc' });
    expect(initial.colors).toEqual({ 1: '#aabbcc' });
    expect(initial.history).toEqual([]);
  });

  it('擦除和清空均可撤销，连续撤销不丢失其他区域', () => {
    const initial = createColoringState({ 1: '#123456', 2: '#abcdef' });
    const erased = paintRegion(initial, 1, null);
    const cleared = clearColoring(erased);
    expect(cleared.colors).toEqual({});
    expect(undoColoring(cleared).colors).toEqual({ 2: '#abcdef' });
    expect(undoColoring(undoColoring(cleared)).colors).toEqual(initial.colors);
    expect(clearColoring(createColoringState()).history).toHaveLength(0);
  });

  it('ID按低位R、高位B解码，柔和插值两端与中点正确', () => {
    expect(decodeRegionId(1, 2, 3)).toBe(197121);
    expect(decodeRegionId(0, 0, 0)).toBe(0);
    expect(interpolateColor('#ffffff', '#000000', 0)).toBe('#ffffff');
    expect(interpolateColor('#ffffff', '#000000', 0.5)).toBe('#808080');
    expect(interpolateColor('#ffffff', '#000000', 1)).toBe('#000000');
    expect(colorsEqual({ 1: '#aabbcc' }, { 1: '#aabbcc' })).toBe(true);
    expect(colorsEqual({ 1: '#aabbcc' }, { 2: '#aabbcc' })).toBe(false);
  });

  it('同底色的金银与纯色互换都算编辑，重复同材质不制造历史', () => {
    const empty = createColoringState();
    const gold = paintRegion(empty, 1, '#aabbcc', 'sparkle-gold-v001');
    expect(gold.materials).toEqual({ 1: 'sparkle-gold-v001' });
    expect(paintRegion(gold, 1, '#AABBCC', 'sparkle-gold-v001')).toBe(gold);
    const silver = paintRegion(gold, 1, '#aabbcc', 'sparkle-silver-v001');
    const plain = paintRegion(silver, 1, '#aabbcc');
    expect(plain.colors).toEqual(gold.colors); expect(plain.materials).toEqual({});
    expect(plain.history).toHaveLength(3);
    const restoreSilver = undoColoring(plain), restoreGold = undoColoring(restoreSilver);
    expect(restoreSilver.materials).toEqual({ 1: 'sparkle-silver-v001' });
    expect(restoreGold.materials).toEqual({ 1: 'sparkle-gold-v001' });
    expect(undoColoring(restoreGold)).toEqual(empty);
    expect(gold.materials).toEqual({ 1: 'sparkle-gold-v001' });
  });

  it('白底材质是真实着色，纯白及null擦除两表，撤销和清空均恢复材质', () => {
    const whiteGold = paintRegion(createColoringState(), 1, '#FFFFFF', 'sparkle-gold-v001');
    expect(whiteGold.colors).toEqual({ 1: '#ffffff' });
    expect(Object.keys(whiteGold.colors)).toHaveLength(1);
    for (const erased of [paintRegion(whiteGold, 1, '#ffffff'), paintRegion(whiteGold, 1, null, 'sparkle-silver-v001')]) {
      expect(erased.colors).toEqual({}); expect(erased.materials).toEqual({});
      expect(undoColoring(erased).colors).toEqual(whiteGold.colors);
      expect(undoColoring(erased).materials).toEqual(whiteGold.materials);
    }
    const mixed = paintRegion(whiteGold, 2, '#778899');
    const cleared = clearColoring(mixed);
    expect(cleared.colors).toEqual({}); expect(cleared.materials).toEqual({});
    expect(undoColoring(cleared).colors).toEqual(mixed.colors);
    expect(undoColoring(cleared).materials).toEqual(mixed.materials);
    expect(clearColoring(cleared)).toBe(cleared);
  });

  it('载入时清理非法材质、孤立材质与未知区域，保留合法白色材质', () => {
    const state = createColoringState({ 1: '#FFFFFF', 2: '#ffffff', 3: '#123456', 4: 'bad', 5: '#abcdef', '01': '#123456' },
      new Set([1, 2, 3, 4]), { 1: 'sparkle-silver-v001', 2: 'bad', 4: 'sparkle-gold-v001', 5: 'sparkle-gold-v001',
        6: 'sparkle-gold-v001', '01': 'sparkle-gold-v001' } as unknown as RegionMaterials);
    expect(state.colors).toEqual({ 1: '#ffffff', 3: '#123456' });
    expect(state.materials).toEqual({ 1: 'sparkle-silver-v001' });
    expect(createColoringState().materials).toEqual({});
  });

  it('非法材质命令不擦掉已有作品，材料比较使用区域及固定版本ID', () => {
    const state = createColoringState({ 1: '#123456' }, undefined, { 1: 'sparkle-gold-v001' });
    expect(paintRegion(state, 1, '#abcdef', 'bad' as ColoringMaterialId)).toBe(state);
    expect(paintRegion(state, 1, 'bad', 'sparkle-silver-v001')).toBe(state);
    expect(isColoringMaterial('sparkle-gold-v001')).toBe(true);
    expect(isColoringMaterial('sparkle-silver-v001')).toBe(true);
    expect(isColoringMaterial('sparkle-gold-v002')).toBe(false);
    expect(isColoringMaterial(null)).toBe(false);
    expect(materialsEqual({ 1: 'sparkle-gold-v001', 2: 'sparkle-silver-v001' },
      { 2: 'sparkle-silver-v001', 1: 'sparkle-gold-v001' })).toBe(true);
    expect(materialsEqual(state.materials, { 1: 'sparkle-silver-v001' })).toBe(false);
    expect(materialsEqual(state.materials, {})).toBe(false);
    expect(materialsEqual({}, {})).toBe(true);
  });
});

describe('真实图幅与放大拖动坐标', () => {
  it.each([1, 1.5, 0.75])('两图ratio=%s保持原比例并完整放入画布', ratio => {
    for (const [width, height] of [[1200, 500], [360, 440], [844, 200]]) {
      const layout = calculateLayout(width, height, ratio);
      for (const rectangle of [layout.reference, layout.edited]) {
        expect(rectangle.width / rectangle.height).toBeCloseTo(ratio, 8);
        expect(rectangle.x).toBeGreaterThanOrEqual(0);
        expect(rectangle.y).toBeGreaterThanOrEqual(0);
        expect(rectangle.x + rectangle.width).toBeLessThanOrEqual(width + 0.001);
        expect(rectangle.y + rectangle.height).toBeLessThanOrEqual(height + 0.001);
      }
    }
  });

  it('填色1倍完整显示，3倍拖动限于图像边缘，坐标仍映射原像素', () => {
    const fitted = calculateColoringLayout(360, 440, 1);
    expect(fitted.image.width / fitted.image.height).toBe(1);
    expect(fitted.image.x).toBeGreaterThanOrEqual(0);
    expect(fitted.image.y).toBeGreaterThanOrEqual(0);
    const zoomed = calculateColoringLayout(360, 440, 1, 3, { x: 99999, y: -99999 });
    expect(zoomed.image.x).toBe(0);
    expect(zoomed.image.y + zoomed.image.height).toBe(440);
    const point = imagePoint({ x: zoomed.image.x + zoomed.image.width * 0.5, y: zoomed.image.y + zoomed.image.height * 0.5 }, zoomed.image, 1254, 1254);
    expect(point).toEqual({ x: 627, y: 627 });
    expect(imagePoint({ x: 0, y: 0 }, fitted.image, 1254, 1254)).toBeNull();
  });

  it('双指产生的连续倍率保持小数，并将坏倍率与越界倍率限制在1至3', () => {
    const layout = calculateColoringLayout(620, 318, 1, 2.375, { x: 31.5, y: -20.25 });
    expect(layout.zoom).toBe(2.375);
    expect(imagePoint({ x: layout.image.x + layout.image.width * .5, y: layout.image.y + layout.image.height * .5 },
      layout.image, 1206, 1206)).toEqual({ x: 603, y: 603 });
    expect(calculateColoringLayout(620, 318, 1, 8).zoom).toBe(3);
    expect(calculateColoringLayout(620, 318, 1, -1).zoom).toBe(1);
    const invalid = calculateColoringLayout(620, 318, 1, NaN, { x: NaN, y: Infinity });
    expect(invalid.zoom).toBe(1); expect(invalid.pan).toEqual({ x: 0, y: 0 });
  });

  it('填色纹理使用真实DPR，缩放后恢复更多原像素而不放大原稿', () => {
    const overview = { x: 0, y: 0, width: 300, height: 300 };
    expect(coloringTextureSize(1206, 1206, overview, 1)).toEqual({ width: 300, height: 300 });
    expect(coloringTextureSize(1206, 1206, overview, 2)).toEqual({ width: 600, height: 600 });
    expect(coloringTextureSize(1206, 1206, { ...overview, width: 712.5, height: 712.5 }, 2))
      .toEqual({ width: 1206, height: 1206 });
    expect(coloringTextureSize(900, 1200, { ...overview, width: 225, height: 300 }, 1.5))
      .toEqual({ width: 338, height: 450 });
  });

  it('画布尺寸来回变化时保留同一连续视图和颜色，渲染相机仍使用实际2倍DPR', () => {
    const camera = { setOrigin: vi.fn(), setScroll: vi.fn(), setZoom: vi.fn() };
    Object.values(camera).forEach(method => method.mockReturnValue(camera));
    class FakeScene {
      game = { scale: { gameSize: { width: 1280, height: 660 } } };
      cameras = { main: camera };
    }
    const publishLayout = vi.fn(), emit = vi.fn();
    const { scene, controller } = createColoringScene({ Scene: FakeScene } as unknown as typeof import('phaser'), {
      level: { palette: [{ color: '#883344' }], regions: [{ id: 1 }] } as ColoringLevel,
      lineImageUrl: 'line', regionMapImageUrl: 'map', initialColors: { 1: '#883344' },
      viewport: { width: 640, height: 330 }, imageAspectRatio: 1, reducedMotion: true, publishLayout, emit,
    });
    const local = scene as unknown as { view: { zoom: number; center: { x: number; y: number } }; state: { colors: unknown }; game: FakeScene['game'] };
    local.view = { zoom: 2.375, center: { x: .61, y: .4 } };
    const retainedView = local.view, retainedColors = local.state.colors;
    for (const viewport of [{ width: 640, height: 330 }, { width: 844, height: 390 }, { width: 640, height: 330 }]) {
      local.game.scale.gameSize = { width: viewport.width * 2, height: viewport.height * 2 };
      controller.resize(viewport);
      expect(local.view).toBe(retainedView); expect(local.state.colors).toBe(retainedColors);
    }
    expect(publishLayout.mock.calls[2][0]).toEqual(publishLayout.mock.calls[0][0]);
    expect(camera.setZoom.mock.calls).toEqual([[2], [2], [2]]);
    expect(emit).not.toHaveBeenCalled();
  });
});
