import { afterEach, describe, expect, it, vi } from 'vitest';
import * as hiddenObjectRules from '../../src/games/hidden-object/rules';
import { parseCatalog } from '../../src/services/content-schema';
import type { ContentCatalog, HiddenObjectLevel } from '../../src/types';
import type { HiddenObjectPool, HiddenObjectSprite } from '../../src/games/hidden-object/types';
import { makeCatalog, makeLevel } from '../fixtures/catalog';

const runtime = { hiddenObjectValidation: 'runtime' } as const;

function fixture(): { catalog: ContentCatalog & { levels: HiddenObjectLevel[] }; pool: HiddenObjectPool } {
  const base = makeCatalog();
  const level: HiddenObjectLevel = { ...makeLevel(), gameType: 'hidden-object', poolId: 'unit-pool',
    board: { width: 600, height: 600, columns: 6, rows: 6, inset: 6, jitter: 2 },
    categoryQuotas: [{ categoryId: 'a', count: 4 }, { categoryId: 'b', count: 2 }],
    tasks: { groupIds: ['alpha', 'beta', 'gamma'], groupCount: 2, minCount: 1, maxCount: 2 },
    timeLimitSeconds: 50 };
  const sprite = (id: string, categoryId: string, groupIds: string[] = []): HiddenObjectSprite => ({
    id, categoryId, groupIds, path: `/assets/shared/hidden-object/v001/${id}.png`,
    width: 80, height: 80, hitPoint: { x: .5, y: .5 },
  });
  return {
    catalog: { ...base, themes: [{ ...base.themes[0], allowedGameTypes: ['hidden-object'] }], levels: [level] },
    pool: { id: level.poolId, groups: ['alpha', 'beta', 'gamma'].map(id => ({ id, label: id })),
      sprites: [sprite('alpha', 'a', ['alpha']), sprite('gamma', 'a', ['gamma']),
        ...Array.from({ length: 4 }, (_, index) => sprite(`a-${index}`, 'a')),
        sprite('beta', 'b', ['beta']), sprite('b-0', 'b'), sprite('b-1', 'b')] },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('浏览器静态内容校验与构建试排分离', () => {
  it('真实应用目录打开时不对九关试摆，保留全部正式内容', async () => {
    const generate = vi.spyOn(hiddenObjectRules, 'createHiddenObjectRound');
    const { loadCatalog } = await import('../../src/content');
    const catalog = loadCatalog();
    expect(catalog.levels.filter(level => level.gameType === 'hidden-object')).toHaveLength(9);
    expect(catalog.levels.find(level => level.id === 'music-hidden-objects-intro')).toBeDefined();
    expect(generate).not.toHaveBeenCalled();
  });

  it('runtime不生成坐标，默认及显式deep仍执行两个实际种子的试排', () => {
    const { catalog, pool } = fixture();
    const generate = vi.spyOn(hiddenObjectRules, 'createHiddenObjectRound');
    expect(parseCatalog(catalog, pool, runtime).levels[0]).toMatchObject({ gameType: 'hidden-object', timeLimitSeconds: 50 });
    expect(generate).not.toHaveBeenCalled();
    parseCatalog(catalog, pool);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls.map(call => call[2])).toEqual([0, 1]);
    expect(generate.mock.calls[1][0].tasks.minCount).toBe(catalog.levels[0].tasks.maxCount);
    generate.mockClear();
    parseCatalog(catalog, pool, { hiddenObjectValidation: 'deep' });
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('runtime保留结构、素材引用、池编号与任务组校验', () => {
    const { catalog, pool } = fixture();
    expect(() => parseCatalog({ ...catalog, levels: [{ ...catalog.levels[0], timeLimitSeconds: 0 }] }, pool, runtime)).toThrow(/timeLimitSeconds/);
    expect(() => parseCatalog({ ...catalog, levels: [{ ...catalog.levels[0], thumbnailAssetId: 'missing' }] }, pool, runtime)).toThrow(/missing/);
    expect(() => parseCatalog(catalog, undefined, runtime)).toThrow(/缺少找物素材池/);
    expect(() => parseCatalog(catalog, { ...pool, id: 'wrong-pool' }, runtime)).toThrow(/素材池编号不匹配/);
    expect(() => parseCatalog({ ...catalog, levels: [{ ...catalog.levels[0], tasks: {
      ...catalog.levels[0].tasks, groupIds: ['alpha', 'missing'],
    } }] }, pool, runtime)).toThrow(/候选任务组在素材池中不存在/);
  });

  it('检查所有可抽组合：单个组各自有图也不能让两个任务共用同一目标原图', () => {
    const { catalog, pool } = fixture();
    pool.sprites = pool.sprites.filter(sprite => sprite.id !== 'gamma');
    pool.sprites.find(sprite => sprite.id === 'alpha')!.groupIds.push('gamma');
    const generate = vi.spyOn(hiddenObjectRules, 'createHiddenObjectRound');
    expect(() => parseCatalog(catalog, pool, runtime)).toThrow(/目标素材或类别配额不足/);
    expect(generate).not.toHaveBeenCalled();
  });

  it('拒绝超出类别配额的目标、未列入盘面的目标类别及不够用的唯一干扰图', () => {
    const { catalog, pool } = fixture();
    const level = catalog.levels[0];
    level.tasks = { groupIds: ['alpha'], groupCount: 1, minCount: 2, maxCount: 2 };
    level.categoryQuotas = [{ categoryId: 'a', count: 1 }, { categoryId: 'b', count: 2 }];
    expect(() => parseCatalog(catalog, pool, runtime)).toThrow(/目标素材或类别配额不足/);
    level.categoryQuotas = [{ categoryId: 'b', count: 2 }];
    expect(() => parseCatalog(catalog, pool, runtime)).toThrow(/目标素材或类别配额不足/);
    level.categoryQuotas = [{ categoryId: 'a', count: 8 }];
    expect(() => parseCatalog(catalog, pool, runtime)).toThrow(/目标素材或类别配额不足/);
  });

  it('允许目标精确副本填补类别配额，但较少副本不能伪造额外干扰图', () => {
    const { catalog, pool } = fixture();
    const level = catalog.levels[0];
    level.categoryQuotas = [{ categoryId: 'a', count: 4 }];
    level.tasks = { groupIds: ['alpha'], groupCount: 1, minCount: 2, maxCount: 2 };
    pool.sprites = pool.sprites.filter(sprite => ['alpha', 'a-0', 'a-1'].includes(sprite.id));
    expect(() => parseCatalog(catalog, pool, runtime)).not.toThrow();
    level.tasks.minCount = 1;
    expect(() => parseCatalog(catalog, pool, runtime)).toThrow(/目标素材或类别配额不足/);
  });

  it('固定总数只检查合计可达的数量向量，非法总数仍报错且不改原数据', () => {
    const { catalog, pool } = fixture();
    const level = catalog.levels[0]; level.tasks.totalCount = 3;
    const before = JSON.stringify({ catalog, pool });
    expect(() => parseCatalog(catalog, pool, runtime)).not.toThrow();
    expect(JSON.stringify({ catalog, pool })).toBe(before);
    level.tasks.totalCount = 5;
    expect(() => parseCatalog(catalog, pool, runtime)).toThrow(/目标总数须位于/);
  });
});
