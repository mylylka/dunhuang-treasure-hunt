import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ColoringLevel, GameCommand, GameEvent, HiddenObjectLevel, LevelMetadata, PuzzleLevel, ShadowMatchLevel, SpotDifferenceLevel } from '../../src/types';
import { calculateLayout } from '../../src/runtime/layout';
import { createSpotDifferenceScene } from '../../src/games/spot-difference/scene';
import { createColoringScene } from '../../src/games/coloring/scene';
import { createPuzzleScene } from '../../src/games/puzzle/scene';
import { createHiddenObjectScene } from '../../src/games/hidden-object/scene';
import { createShadowMatchScene } from '../../src/games/shadow-match/scene';
import { startSession } from '../../src/games/hidden-object/rules';
import type { HiddenObjectSession } from '../../src/games/hidden-object/types';

const metadata: LevelMetadata = {
  schemaVersion: 1, id: 'unit-blocking', themeId: 'patterns', title: '中断测试', subtitle: '单元测试',
  objective: '保留本局', difficulty: '测试', estimatedMinutes: 1, thumbnailAssetId: 'cover', teachingNote: '测试',
  source: { title: '测试', url: 'https://example.com/', note: '不登记正式关卡' },
};
const viewport = { width: 844, height: 300 };
const spot: SpotDifferenceLevel = { ...metadata, gameType: 'spot-difference', baseAssetId: 'a', editedAssetId: 'b', differences: [
  { id: 'detail', region: { x: .1, y: .1, width: .1, height: .1 }, hint: '提示', detailHint: '详细提示' },
] };
const coloring: ColoringLevel = { ...metadata, gameType: 'coloring', referenceAssetId: 'reference', lineAssetId: 'line', regionMapAssetId: 'map',
  artworkVersion: 'unit', palette: [{ id: 'red', label: '红', color: '#883344' }],
  regions: [{ id: 1, label: '区', region: { x: 0, y: 0, width: 1, height: 1 }, point: { x: .5, y: .5 }, pixelCount: 10 }],
};
const puzzle: PuzzleLevel = { ...metadata, gameType: 'puzzle', imageAssetId: 'image', mode: 'jigsaw', rows: 2, columns: 2, seed: 7 };
const hidden: HiddenObjectLevel = { ...metadata, gameType: 'hidden-object', poolId: 'unit-pool',
  board: { width: 960, height: 640, columns: 10, rows: 6, inset: 10, jitter: 5 },
  categoryQuotas: [{ categoryId: 'objects', count: 2 }], tasks: { groupIds: ['shape'], groupCount: 1, minCount: 1, maxCount: 1 }, timeLimitSeconds: 90,
};
const shadow: ShadowMatchLevel = { ...metadata, gameType: 'shadow-match', referenceAssetId: 'reference',
  options: ['one', 'two', 'three', 'four'].map(id => ({ id, assetId: `asset-${id}` })), correctOptionId: 'one',
  hints: [{ text: '轮廓', region: { x: .1, y: .1, width: .3, height: .3 } }],
};

class FakeScene {
  input = { enabled: true, on: vi.fn(), off: vi.fn() };
  tweens = { killAll: vi.fn() };
}
const Phaser = { Scene: FakeScene } as unknown as typeof import('phaser');
type Controller = { setBlocked(blocked: boolean): void; execute(command: GameCommand): void; resize(size: typeof viewport): void };
// Inspect existing local state without starting WebGL or creating browser image resources.
type InspectableScene = Record<string, any>;

function fixture(kind: 'spot' | 'coloring' | 'puzzle' | 'hidden' | 'shadow') {
  const events: GameEvent[] = [], emit = (event: GameEvent) => events.push(event), publishLayout = vi.fn();
  let runtime: { scene: unknown; controller: Controller };
  if (kind === 'spot') runtime = createSpotDifferenceScene(Phaser, { level: spot, baseImageUrl: 'a', editedImageUrl: 'b',
    layout: calculateLayout(viewport.width, viewport.height, 1.5), reducedMotion: false, publishLayout, emit });
  else if (kind === 'coloring') runtime = createColoringScene(Phaser, { level: coloring, lineImageUrl: 'line', regionMapImageUrl: 'map',
    initialColors: { '1': '#883344' }, viewport, imageAspectRatio: 1, reducedMotion: false, publishLayout, emit });
  else if (kind === 'puzzle') runtime = createPuzzleScene(Phaser, { level: puzzle, imageUrl: 'image', viewport,
    imageAspectRatio: 1.5, reducedMotion: false, publishLayout, emit });
  else if (kind === 'hidden') runtime = createHiddenObjectScene(Phaser, { level: hidden, pool: {
    id: 'unit-pool', groups: [{ id: 'shape', label: '轮廓' }], sprites: ['target', 'noise'].map(id => ({
      id, categoryId: 'objects', path: `${id}.png`, width: 80, height: 100,
      groupIds: id === 'target' ? ['shape'] : [], hitPoint: { x: .5, y: .5 },
    })),
  }, viewport, reducedMotion: false, publishLayout, emit });
  else runtime = createShadowMatchScene(Phaser, { level: shadow, images: {}, viewport, reducedMotion: false, publishLayout, emit });
  const scene = runtime.scene as InspectableScene;
  return { controller: runtime.controller, scene, events };
}

beforeEach(() => vi.stubGlobal('document', { hidden: false }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('五种玩法的独立阻挡生命周期', () => {
  it.each(['spot', 'coloring', 'puzzle', 'hidden', 'shadow'] as const)('%s在加载时阻挡会丢弃旧命令，解除不重放或占用命令序号', kind => {
    const { scene, controller, events } = fixture(kind);
    const queue = kind === 'spot' ? 'pendingCommands' : 'pending';
    const sequence = kind === 'spot' ? 'lastCommandSequence' : 'sequence';
    controller.execute({ type: 'hint', sequence: 10 });
    expect(scene[queue]).toHaveLength(1);
    const before = JSON.stringify(scene.state);
    controller.setBlocked(true);
    expect(scene[queue]).toEqual([]); expect(scene.input.enabled).toBe(false);
    expect(scene[sequence]).toBe(10);
    controller.execute({ type: 'restart', sequence: 11 });
    expect(scene[queue]).toEqual([]); expect(scene[sequence]).toBe(11);
    controller.setBlocked(false);
    expect(scene[sequence]).toBe(11); expect(scene.input.enabled).toBe(true);
    expect(JSON.stringify(scene.state)).toBe(before);
    expect(events).toEqual([]);
  });

  it('找物在事件边界结算此前时间，旋转期间不扣时，解除后必须主动继续且不补扣', () => {
    let now = 1_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { scene, controller } = fixture('hidden');
    scene.initialized = true; scene.render = vi.fn(); scene.publish = vi.fn();
    scene.state = startSession(scene.state as HiddenObjectSession); scene.lastTime = now;
    scene.scrollTop = 123; scene.zoom = 2; scene.selectedTaskId = 'shape';
    const round = scene.state.round;
    now = 2_500; controller.setBlocked(true);
    expect(scene.state.status).toBe('paused'); expect(scene.state.remainingMs).toBe(88_500);
    now = 100_000; scene.update();
    for (const [index, type] of ['hidden-start', 'hidden-resume', 'hidden-new-round', 'restart'].entries()) {
      controller.execute({ type, sequence: index + 1 } as GameCommand);
    }
    expect(scene.state.round).toBe(round); expect(scene.state.status).toBe('paused');
    expect(scene.state.remainingMs).toBe(88_500);
    const size = scene.viewport; controller.resize({ width: 1, height: 1 }); expect(scene.viewport).toBe(size);
    controller.setBlocked(false);
    expect(scene.lastTime).toBe(now); expect(scene.state.status).toBe('paused');
    expect(scene.scrollTop).toBe(123); expect(scene.zoom).toBe(2); expect(scene.selectedTaskId).toBe('shape');
    now += 20_000; scene.update();
    expect(scene.state.remainingMs).toBe(88_500);
    controller.execute({ type: 'hidden-resume', sequence: 20 });
    now += 1_000; scene.update();
    expect(scene.state.status).toBe('running'); expect(scene.state.remainingMs).toBe(87_500);
    expect(scene.state.round).toBe(round);
  });

  it('找物首次点击读取透明蒙版失败时暂停并保留重新加载入口，不继续空扣时间', () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { scene, events } = fixture('hidden');
    scene.initialized = true; scene.state = startSession(scene.state); scene.lastTime = now;
    scene.alphaMask = () => { throw new Error('Canvas readback failed'); };
    const item = scene.state.round.items[0], transform = scene.transform();
    const pointer = { id: 1, x: transform.x + (item.x + item.width / 2) * transform.scale,
      y: transform.y + (item.y + item.height / 2) * transform.scale };
    scene.pointerDown(pointer);
    now = 2000; scene.pointerUp(pointer);
    expect(events.filter(event => event.type === 'error')).toHaveLength(1);
    expect(scene.state.status).toBe('paused'); expect(scene.input.enabled).toBe(false);
    const remaining = scene.state.remainingMs;
    now = 30000; scene.update(); expect(scene.state.remainingMs).toBe(remaining);
    expect(scene.state.foundIds).toEqual([]);
  });

  it('新一局配方或有限摆放失败会报告可重载错误，而非停在无反馈的加载层', () => {
    const { scene, events } = fixture('hidden');
    const quotas = hidden.categoryQuotas;
    hidden.categoryQuotas = [{ categoryId: 'objects', count: 1000 }];
    try {
      expect(() => scene.newRound()).not.toThrow();
      expect(events).toContainEqual({ type: 'error', message: '本局暂时无法布置，请重新加载后再试。' });
      expect(scene.input.enabled).toBe(false);
      expect(scene.failed).toBe(true); expect(scene.initialized).toBe(false);
      expect(scene.state.foundIds).toEqual([]);
    } finally { hidden.categoryQuotas = quotas; }
  });

  it('拼图撤回尚未提交的拖拽，保留摆放/滚动，并拦截绕过Phaser输入的原生wheel', () => {
    const { scene, controller, events } = fixture('puzzle');
    scene.ready = true; scene.renderBoard = vi.fn();
    scene.state.placedIds = [0]; scene.state.selectedId = 1; scene.trayScroll = 37;
    scene.gesture = { id: 1, pieceId: 1, dragged: true, fromTray: true };
    scene.scrollGesture = { id: 1, start: { x: 0, y: 0 }, startScroll: 37 };
    const state = scene.state;
    controller.setBlocked(true);
    expect(scene.gesture).toBeNull(); expect(scene.scrollGesture).toBeNull();
    expect(scene.renderBoard).toHaveBeenCalledTimes(1);
    scene.pointerUp({ id: 1, x: 100, y: 100 });
    scene.wheel({ preventDefault: vi.fn(), deltaY: 200 });
    controller.execute({ type: 'puzzle-scroll', offset: 0, sequence: 1 });
    controller.execute({ type: 'restart', sequence: 2 });
    expect(scene.state).toBe(state); expect(scene.trayScroll).toBe(37); expect(events).toEqual([]);
    controller.setBlocked(false);
    expect(scene.state.placedIds).toEqual([0]); expect(scene.state.selectedId).toBe(1);
  });

  it('填色中断取消未抬起的触点并收束过渡，不撤销已接受颜色或产生新的着色', () => {
    const { scene, controller, events } = fixture('coloring');
    scene.ready = true; scene.renderImmediate = vi.fn();
    scene.gestures = { cancel: vi.fn(), dispose: vi.fn() };
    scene.view = { zoom: 2.375, center: { x: .6, y: .4 } };
    const state = scene.state;
    const view = scene.view;
    controller.setBlocked(true);
    expect(scene.gestures.cancel).toHaveBeenCalledTimes(1); expect(scene.renderImmediate).toHaveBeenCalledTimes(1);
    scene.tap({ x: 10, y: 10 });
    controller.execute({ type: 'undo', sequence: 1 });
    controller.execute({ type: 'finish', sequence: 2 });
    expect(scene.state).toBe(state); expect(scene.state.colors).toEqual({ '1': '#883344' }); expect(events).toEqual([]);
    controller.setBlocked(false); expect(scene.state).toBe(state); expect(scene.view).toBe(view);
  });

  it('影子保留原选项顺序与错误状态，阻挡期间正确命令也不能完成', () => {
    const { scene, controller, events } = fixture('shadow');
    scene.initialized = true; scene.render = vi.fn(); scene.publish = vi.fn();
    controller.execute({ type: 'shadow-select', optionId: 'two', sequence: 1 });
    const state = scene.state;
    controller.setBlocked(true);
    controller.execute({ type: 'shadow-select', optionId: 'one', sequence: 2 });
    controller.execute({ type: 'restart', sequence: 3 });
    expect(scene.state).toBe(state); expect(events.some(event => event.type === 'completed')).toBe(false);
    controller.setBlocked(false);
    expect(scene.state.optionIds).toEqual(state.optionIds); expect(scene.state.wrongOptionIds).toEqual(['two']);
    controller.execute({ type: 'shadow-select', optionId: 'one', sequence: 4 });
    expect(events.filter(event => event.type === 'completed')).toHaveLength(1);
  });
});
