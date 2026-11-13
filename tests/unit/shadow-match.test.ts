import { describe, expect, it, vi } from 'vitest';
import type { GameEvent, ShadowMatchLevel } from '../../src/types';
import type { ShadowCardLayout, ShadowMatchLayout } from '../../src/games/shadow-match/types';
import { calculateShadowLayout, createShadowMatchState, fitShadowImage, nextShadowHint, restartShadowMatchState, selectShadowOption } from '../../src/games/shadow-match/rules';
import { createShadowMatchScene } from '../../src/games/shadow-match/scene';
import productionAssets from '../../src/content/assets.json';

const level: ShadowMatchLevel = {
  schemaVersion: 1, id: 'unit-shadow-match', themeId: 'music', gameType: 'shadow-match',
  title: '飞天影子', subtitle: '轮廓观察', objective: '找到轮廓一致的影子', difficulty: '观察入门',
  estimatedMinutes: 2, thumbnailAssetId: 'reference', teachingNote: 'AI教学示意',
  source: { title: '测试来源', url: 'https://example.com/', note: '独立测试素材' },
  referenceAssetId: 'reference',
  options: [
    { id: 'one', assetId: 'shadow-one' }, { id: 'two', assetId: 'shadow-two' },
    { id: 'three', assetId: 'shadow-three' }, { id: 'four', assetId: 'shadow-four' },
  ],
  correctOptionId: 'three',
  hints: [
    { text: '观察手臂', region: { x: .1, y: .2, width: .3, height: .2 } },
    { text: '观察飘带', region: { x: .4, y: .5, width: .5, height: .4 } },
  ],
};

describe('影子配对独立规则', () => {
  it('四个稳定选项可产生全部24种排列，配置与输入数组保持不变', () => {
    const before = JSON.stringify(level), orders = new Set<string>();
    for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 2; c++) {
      const values = [(a + .5) / 4, (b + .5) / 3, (c + .5) / 2];
      const state = createShadowMatchState(level, () => values.shift()!);
      expect([...state.optionIds].sort()).toEqual(['four', 'one', 'three', 'two']);
      expect(state).toMatchObject({ selectedOptionId: null, wrongOptionIds: [], completed: false, hintIndex: null, message: '' });
      orders.add(state.optionIds.join(','));
    }
    expect(orders.size).toBe(24);
    expect(JSON.stringify(level)).toBe(before);
  });

  it('仅正确选项ID可完成，所有错误或素材ID点击均不能冒充正确答案', () => {
    const initial = createShadowMatchState(level, () => .5);
    expect(selectShadowOption(level, initial, 'shadow-three')).toBe(initial);
    expect(selectShadowOption(level, initial, 'not-on-board')).toBe(initial);
    let state = initial;
    for (const id of ['one', 'two', 'four']) {
      state = selectShadowOption(level, state, id);
      expect(state.completed).toBe(false);
      expect(state.selectedOptionId).toBe(id);
    }
    expect(state.wrongOptionIds).toEqual(['one', 'two', 'four']);
    state = selectShadowOption(level, state, 'one');
    expect(state.wrongOptionIds).toHaveLength(3);
    const completed = selectShadowOption(level, state, 'three');
    expect(completed.completed).toBe(true);
    expect(completed.selectedOptionId).toBe('three');
    expect(selectShadowOption(level, completed, 'three')).toBe(completed);
    expect(selectShadowOption(level, completed, 'one')).toBe(completed);
    expect(nextShadowHint(level, completed)).toBe(completed);
    expect(initial.wrongOptionIds).toEqual([]);
    expect(initial.completed).toBe(false);
  });

  it('提示循环观察区域，不替玩家选择或完成', () => {
    let state = selectShadowOption(level, createShadowMatchState(level), 'two');
    for (let index = 0; index < 20; index++) {
      state = nextShadowHint(level, state);
      expect(state.hintIndex).toBe(index % level.hints.length);
      expect(state.message).toBe(level.hints[index % level.hints.length].text);
      expect(state.completed).toBe(false);
      expect(state.selectedOptionId).toBe('two');
      expect(state.wrongOptionIds).toEqual(['two']);
    }
  });

  it('无限重试清除错误、完成和提示，并在随机同序时仍更换排列', () => {
    let state = createShadowMatchState(level, () => .5);
    state = nextShadowHint(level, selectShadowOption(level, state, 'one'));
    state = selectShadowOption(level, state, 'three');
    for (let count = 0; count < 20; count++) {
      const next = restartShadowMatchState(level, state, () => .5);
      expect(next.optionIds).not.toEqual(state.optionIds);
      expect([...next.optionIds].sort()).toEqual(['four', 'one', 'three', 'two']);
      expect(next).toMatchObject({ selectedOptionId: null, wrongOptionIds: [], completed: false, hintIndex: null, message: '' });
      state = next;
    }
  });

  it('拒绝重复/缺失答案和越界提示，不生成含糊或无法完成的题目', () => {
    expect(() => createShadowMatchState({ ...level, options: level.options.slice(1) })).toThrow('四个');
    expect(() => createShadowMatchState({ ...level, options: [level.options[0], level.options[0], ...level.options.slice(2)] })).toThrow('选项编号');
    expect(() => createShadowMatchState({ ...level, options: level.options.map(option => ({ ...option, assetId: 'same' })) })).toThrow('影子图片');
    expect(() => createShadowMatchState({ ...level, correctOptionId: 'shadow-three' })).toThrow('正确选项');
    expect(() => createShadowMatchState({ ...level, hints: [] })).toThrow('提示');
    expect(() => createShadowMatchState({ ...level, hints: [{ text: '越界', region: { x: .8, y: 0, width: .3, height: .2 } }] })).toThrow('区域');
    for (const value of [NaN, Infinity, -1, 1]) expect(() => createShadowMatchState(level, () => value)).toThrow('随机值');
  });
});

function within(inner: { x: number; y: number; width: number; height: number }, outer: { x: number; y: number; width: number; height: number }) {
  return inner.width > 0 && inner.height > 0 && inner.x >= outer.x - 1e-9 && inner.y >= outer.y - 1e-9
    && inner.x + inner.width <= outer.x + outer.width + 1e-9 && inner.y + inner.height <= outer.y + outer.height + 1e-9;
}

describe('影子配对完整等比布局', () => {
  it('电脑窗口与手机横屏五张卡片、紧凑标签和绘图框完整处于视口内且不重叠', () => {
    for (const [width, height] of [[1440, 800], [1024, 600], [844, 240], [568, 220], [390, 600], [360, 460], [320, 300], [280, 180], [112, 48], [1, 1]]) {
      const layout = calculateShadowLayout(width, height);
      expect(layout.options).toHaveLength(4);
      const cards = [layout.reference, ...layout.options];
      for (const card of cards) {
        expect(within(card, { x: 0, y: 0, width, height })).toBe(true);
        expect(within(card.image, card)).toBe(true);
        if (card.height >= 100) expect(card.y + card.height - card.image.y - card.image.height).toBeGreaterThanOrEqual(14);
      }
      for (let a = 0; a < cards.length; a++) for (let b = a + 1; b < cards.length; b++) {
        const first = cards[a], second = cards[b];
        expect(first.x < second.x + second.width && first.x + first.width > second.x
          && first.y < second.y + second.height && first.y + first.height > second.y).toBe(false);
      }
      if (width >= height * 1.1) expect(layout.reference.x + layout.reference.width).toBeLessThan(layout.options[0].x);
      else expect(layout.reference.y + layout.reference.height).toBeLessThan(layout.options[0].y);
      expect(layout.options[0].y).toBe(layout.options[1].y);
      expect(layout.options[2].y).toBe(layout.options[3].y);
      expect(layout.options[0].x).toBe(layout.options[2].x);
    }
  });

  it('手机侧栏之外的画布以高度优先，参照接近整高，四候选保持清晰的2×2大图', () => {
    for (const [width, height, referenceMinimum, optionMinimum] of [[524, 288, 245, 110], [736, 318, 280, 130]]) {
      const layout = calculateShadowLayout(width, height);
      const reference = fitShadowImage(layout.reference.image, 1254, 1254);
      expect(reference.height).toBeGreaterThanOrEqual(referenceMinimum);
      for (const card of layout.options) {
        const option = fitShadowImage(card.image, 1254, 1254);
        expect(option.height).toBeGreaterThanOrEqual(optionMinimum);
        expect(card.width).toBeGreaterThanOrEqual(44); expect(card.height).toBeGreaterThanOrEqual(44);
        expect(within(option, card)).toBe(true);
      }
      expect(layout.options[0].y).toBe(layout.options[1].y);
      expect(layout.options[2].y).toBe(layout.options[3].y);
      expect(layout.reference.x + layout.reference.width).toBeLessThan(layout.options[0].x);
    }
  });

  it('实际素材在手机横竖屏选项至少70像素，电脑利用卡片空间放大完整图像', () => {
    const assets = productionAssets.filter(asset => asset.id.startsWith('shadow-apsara-'));
    expect(assets).toHaveLength(5);
    for (const [width, height, minimumSize] of [[298, 409, 70], [732, 235, 70], [1160, 670, 260]]) {
      const layout = calculateShadowLayout(width, height);
      for (const asset of assets) for (const option of layout.options) {
        const image = fitShadowImage(option.image, asset.width, asset.height);
        expect(Math.min(image.width, image.height)).toBeGreaterThanOrEqual(minimumSize);
        expect(within(image, option)).toBe(true);
        expect(image.width / image.height).toBeCloseTo(asset.width / asset.height, 12);
      }
    }
  });

  it('宽图、长图和方图都完整contain，保留原图比例及居中位置', () => {
    for (const card of [calculateShadowLayout(1100, 600).reference, ...calculateShadowLayout(360, 500).options]) {
      for (const [width, height] of [[1800, 1200], [600, 1800], [1000, 1000]]) {
        const image = fitShadowImage(card.image, width, height);
        expect(within(image, card.image)).toBe(true);
        expect(image.width / image.height).toBeCloseTo(width / height, 12);
        expect(image.x + image.width / 2).toBeCloseTo(card.image.x + card.image.width / 2);
        expect(image.y + image.height / 2).toBeCloseTo(card.image.y + card.image.height / 2);
      }
    }
    expect(() => calculateShadowLayout(0, 400)).toThrow('画布宽高');
    expect(() => calculateShadowLayout(300, Infinity)).toThrow('画布宽高');
    expect(() => fitShadowImage({ x: 0, y: 0, width: 100, height: 100 }, 0, 200)).toThrow('尺寸');
  });
});

function sceneFixture() {
  const emitted: GameEvent[] = [], layouts: ShadowMatchLayout[] = [];
  const camera = { setViewport: vi.fn().mockReturnThis(), setOrigin: vi.fn().mockReturnThis(), setZoom: vi.fn().mockReturnThis(), setScroll: vi.fn().mockReturnThis() };
  const graphics = { clear: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), lineStyle: vi.fn().mockReturnThis(), strokeEllipse: vi.fn().mockReturnThis(), destroy: vi.fn() };
  const handlers = new Map<string, () => void>();
  class FakeScene {
    game = { canvas: { width: 2000, height: 1200 } };
    cameras = { main: camera };
    events = { once: vi.fn() };
    textures = { exists: () => true, getFrame: () => ({ realWidth: 1800, realHeight: 1200 }) };
    load = {
      on(event: string, callback: () => void, context: object) { handlers.set(event, callback.bind(context)); },
      off(event: string) { handlers.delete(event); }, image: vi.fn(),
    };
    add = {
      image: vi.fn(() => ({ setOrigin: vi.fn().mockReturnThis(), setDisplaySize: vi.fn().mockReturnThis(), destroy: vi.fn() })),
      graphics: () => graphics,
    };
  }
  const Phaser = { Scene: FakeScene, Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } } } as unknown as typeof import('phaser');
  const runtime = createShadowMatchScene(Phaser, {
    level, images: Object.fromEntries([level.referenceAssetId, ...level.options.map(option => option.assetId)].map(id => [id, `${id}.png`])),
    viewport: { width: 1000, height: 600 }, reducedMotion: false,
    emit: event => emitted.push(event), publishLayout: layout => layouts.push(layout),
  });
  const scene = runtime.scene as unknown as FakeScene & { preload(): void; create(): void };
  return { ...runtime, scene, emitted, layouts, camera, graphics, handlers };
}

describe('影子配对场景事件与生命周期', () => {
  it('正确只完成一次，错误/非法选择不完成；重试、提示序列、DPR和resize均独立保留规则', () => {
    const fixture = sceneFixture();
    fixture.scene.preload(); fixture.scene.create();
    const { controller, emitted } = fixture;
    expect(fixture.scene.add.image).toHaveBeenCalledTimes(5);
    expect(fixture.camera.setZoom).toHaveBeenLastCalledWith(2, 2);
    controller.execute({ type: 'shadow-select', optionId: 'not-on-board', sequence: 1 });
    controller.execute({ type: 'shadow-select', optionId: 'one', sequence: 2 });
    expect(emitted.filter(event => event.type === 'completed')).toHaveLength(0);
    expect(emitted.filter(event => event.type === 'feedback' && event.cue === 'error')).toHaveLength(1);
    controller.execute({ type: 'shadow-select', optionId: 'three', sequence: 3 });
    controller.execute({ type: 'shadow-select', optionId: 'three', sequence: 4 });
    expect(emitted.filter(event => event.type === 'completed')).toHaveLength(1);
    controller.execute({ type: 'restart', sequence: 5 });
    controller.execute({ type: 'hint', sequence: 6 });
    controller.execute({ type: 'hint', sequence: 6 });
    const snapshots = () => emitted.flatMap(event => event.type === 'shadow-match-change' ? [event.snapshot] : []);
    const beforeResize = snapshots().at(-1)!;
    expect(beforeResize.hintIndex).toBe(0); expect(beforeResize.completed).toBe(false);
    expect(emitted.filter(event => event.type === 'feedback' && event.cue === 'hint')).toHaveLength(1);
    fixture.scene.game.canvas.width = 720; fixture.scene.game.canvas.height = 1000;
    controller.resize({ width: 360, height: 500 });
    controller.setReducedMotion(true);
    expect(snapshots().at(-1)).toEqual(beforeResize);
    expect(fixture.camera.setZoom).toHaveBeenLastCalledWith(2, 2);
    expect(fixture.layouts.at(-1)!.width).toBe(360);
    for (const card of [fixture.layouts.at(-1)!.reference, ...fixture.layouts.at(-1)!.options]) expect(card.image.width / card.image.height).toBeCloseTo(1.5);
    expect(fixture.graphics.strokeEllipse).toHaveBeenCalled();
    controller.execute({ type: 'shadow-select', optionId: 'three', sequence: 7 });
    expect(emitted.filter(event => event.type === 'completed')).toHaveLength(2);
    controller.dispose(); controller.dispose();
    const count = emitted.length;
    controller.execute({ type: 'restart', sequence: 8 });
    controller.resize({ width: 844, height: 240 });
    expect(emitted).toHaveLength(count);
    expect(fixture.handlers.size).toBe(0);
  });

  it('加载中命令只执行一次；加载失败不接受答案或伪发ready/完成', () => {
    const queued = sceneFixture();
    queued.scene.preload();
    queued.controller.execute({ type: 'hint', sequence: 1 });
    queued.controller.execute({ type: 'hint', sequence: 1 });
    queued.scene.create();
    expect(queued.emitted.filter(event => event.type === 'feedback' && event.cue === 'hint')).toHaveLength(1);
    queued.controller.dispose();
    const failed = sceneFixture();
    failed.scene.preload(); failed.handlers.get('loaderror')!(); failed.handlers.get('loaderror')!();
    failed.scene.create(); failed.controller.execute({ type: 'shadow-select', optionId: 'three', sequence: 1 });
    expect(failed.emitted.filter(event => event.type === 'error')).toHaveLength(1);
    expect(failed.emitted.some(event => event.type === 'ready' || event.type === 'completed')).toBe(false);
    failed.controller.dispose();
  });
});
