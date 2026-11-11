import { describe, expect, it } from 'vitest';
import {
  advanceSession, createHiddenObjectRound, createSession, findItem, getHintItem,
  pauseSession, restartSession, resumeSession, rotatedItemBounds, startSession,
} from '../../src/games/hidden-object/rules';
import type { HiddenObjectPool, HiddenObjectRecipe, HiddenObjectSprite } from '../../src/games/hidden-object/types';
import productionPoolData from '../../src/content/hidden-object/pool.json';
import productionRecipeData from '../../src/content/levels/music-hidden-objects-intro.json';

const categories = ['instruments', 'clothes', 'animals', 'patterns', 'flowers'];
const recipe: HiddenObjectRecipe = {
  poolId: 'unit-hidden-object',
  board: { width: 960, height: 640, columns: 10, rows: 6, inset: 10, jitter: 5 },
  categoryQuotas: categories.map((categoryId, index) => ({ categoryId, count: [20, 18, 10, 6, 6][index] })),
  tasks: { groupIds: ['pipa', 'drum', 'bell'], groupCount: 3, minCount: 2, maxCount: 2 },
  timeLimitSeconds: 90,
};
const pool: HiddenObjectPool = {
  id: recipe.poolId,
  groups: [{ id: 'pipa', label: '琵琶' }, { id: 'drum', label: '鼓' }, { id: 'bell', label: '铃铛' }],
  sprites: categories.flatMap((categoryId, category) => Array.from({ length: [51, 40, 20, 15, 15][category] }, (_, index): HiddenObjectSprite => ({
    id: `${categoryId}-${index}`, categoryId, path: `assets/unit-${categoryId}-${index}.png`,
    width: 24 + index * 11 % 350, height: 37 + index * 23 % 500,
    groupIds: category > 0 ? [] : index < 4 ? ['pipa'] : index < 10 ? ['drum'] : index < 13 ? ['bell'] : [],
    hitPoint: { x: .45, y: .55 },
  }))),
};

describe('找物程序抽样与连续散放', () => {
  it('多个种子满足60件配额、6个精确同图目标，只有同一任务的目标素材可以重复', () => {
    const before = JSON.stringify({ recipe, pool });
    const sprites = new Map(pool.sprites.map(sprite => [sprite.id, sprite]));
    const selections = new Set<string>();
    let similarDistractors = 0;
    for (let seed = 0; seed < 64; seed++) {
      const round = createHiddenObjectRound(recipe, pool, seed);
      expect(round.items).toHaveLength(60);
      expect(new Set(round.items.map(item => item.id)).size).toBe(60);
      expect(new Set(round.items.map(item => item.spriteId)).size).toBe(57);
      expect(round.tasks).toHaveLength(3);
      expect(round.tasks.reduce((sum, task) => sum + task.required, 0)).toBe(6);
      const activeGroups = round.tasks.map(task => task.id);
      const targetSpriteIds = round.tasks.map(task => task.previewSpriteId);
      expect(new Set(targetSpriteIds).size).toBe(round.tasks.length);
      const distractors = round.items.filter(item => !item.groupId);
      expect(new Set(distractors.map(item => item.spriteId)).size).toBe(distractors.length);
      for (const quota of recipe.categoryQuotas) expect(round.items.filter(item => item.categoryId === quota.categoryId)).toHaveLength(quota.count);
      for (const task of round.tasks) {
        const targets = round.items.filter(item => item.groupId === task.id);
        expect(targets).toHaveLength(task.required);
        expect(task.found).toBe(0);
        expect(targets.every(item => item.spriteId === task.previewSpriteId)).toBe(true);
      }
      for (const item of round.items) {
        if (item.groupId) {
          expect(sprites.get(item.spriteId)!.groupIds).toContain(item.groupId);
          expect(item.spriteId).toBe(round.tasks.find(task => task.id === item.groupId)!.previewSpriteId);
        } else {
          expect(targetSpriteIds).not.toContain(item.spriteId);
          if (sprites.get(item.spriteId)!.groupIds.some(id => activeGroups.includes(id))) similarDistractors++;
        }
      }
      selections.add(round.items.map(item => item.spriteId).sort().join(','));
    }
    expect(selections.size).toBeGreaterThan(50);
    expect(similarDistractors).toBeGreaterThan(0);
    expect(JSON.stringify({ recipe, pool })).toBe(before);
  });

  it('同种子完全复现目标、任务和布局，不同种子重新抽样并变换位置', () => {
    const first = createHiddenObjectRound(recipe, pool, 1234);
    expect(createHiddenObjectRound(recipe, pool, 1234)).toEqual(first);
    const second = createHiddenObjectRound(recipe, pool, 1235);
    expect(second.items.map(item => item.spriteId)).not.toEqual(first.items.map(item => item.spriteId));
    expect(second.items.map(item => [item.x, item.y])).not.toEqual(first.items.map(item => [item.x, item.y]));
    expect(createHiddenObjectRound(recipe, pool, 2 ** 32 + 1234)).toEqual(first);
  });

  it('多个种子的旋转包围盒保持原图比例、盘面安全边距且不重叠', () => {
    const sprites = new Map(pool.sprites.map(sprite => [sprite.id, sprite]));
    const { width, height, columns, rows, inset } = recipe.board;
    const cellWidth = width / columns, cellHeight = height / rows;
    for (let seed = 0; seed < 20; seed++) {
      const round = createHiddenObjectRound(recipe, pool, seed);
      const scaleFactors: number[] = [];
      for (const item of round.items) {
        const sprite = sprites.get(item.spriteId)!;
        const bounds = rotatedItemBounds(item);
        expect(item.width / item.height).toBeCloseTo(sprite.width / sprite.height, 10);
        expect(bounds.x).toBeGreaterThanOrEqual(inset - 1e-9);
        expect(bounds.y).toBeGreaterThanOrEqual(inset - 1e-9);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - inset + 1e-9);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(height - inset + 1e-9);
        const base = Math.min((cellWidth - inset * 2) / sprite.width, (cellHeight - inset * 2) / sprite.height);
        const factor = item.width / sprite.width / base;
        scaleFactors.push(factor);
        expect(factor).toBeGreaterThanOrEqual(.7 - 1e-9);
        expect(factor).toBeLessThanOrEqual(1.08 + 1e-9);
        expect(Math.abs(item.rotation)).toBeLessThanOrEqual(24 * Math.PI / 180);
        const cx = item.x + item.width / 2, cy = item.y + item.height / 2;
        for (const dx of [-item.width / 2, item.width / 2]) for (const dy of [-item.height / 2, item.height / 2]) {
          const cornerX = cx + dx * Math.cos(item.rotation) - dy * Math.sin(item.rotation);
          const cornerY = cy + dx * Math.sin(item.rotation) + dy * Math.cos(item.rotation);
          expect(cornerX).toBeGreaterThanOrEqual(bounds.x - 1e-9);
          expect(cornerX).toBeLessThanOrEqual(bounds.x + bounds.width + 1e-9);
          expect(cornerY).toBeGreaterThanOrEqual(bounds.y - 1e-9);
          expect(cornerY).toBeLessThanOrEqual(bounds.y + bounds.height + 1e-9);
        }
      }
      expect(Math.max(...scaleFactors) - Math.min(...scaleFactors)).toBeGreaterThan(.25);
      expect(Math.max(...round.items.map(item => item.rotation)) - Math.min(...round.items.map(item => item.rotation))).toBeGreaterThan(.6);
      const offColumnCenters = round.items.filter(item => Math.abs(((item.x + item.width / 2) % cellWidth) - cellWidth / 2) > 5);
      const offRowCenters = round.items.filter(item => Math.abs(((item.y + item.height / 2) % cellHeight) - cellHeight / 2) > 5);
      expect(offColumnCenters.length).toBeGreaterThan(40);
      expect(offRowCenters.length).toBeGreaterThan(40);
      expect(new Set(round.items.map(item => (item.x + item.width / 2).toFixed(2))).size).toBeGreaterThan(50);
      expect(new Set(round.items.map(item => (item.y + item.height / 2).toFixed(2))).size).toBeGreaterThan(50);
      for (let a = 0; a < round.items.length; a++) for (let b = a + 1; b < round.items.length; b++) {
        const first = rotatedItemBounds(round.items[a]), second = rotatedItemBounds(round.items[b]);
        const overlaps = first.x < second.x + second.width && first.x + first.width > second.x
          && first.y < second.y + second.height && first.y + first.height > second.y;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('旋转包围盒以中心为轴，直角和斜角均覆盖真实四角', () => {
    const item = { x: 10, y: 30, width: 40, height: 20, rotation: Math.PI / 2 };
    const straight = rotatedItemBounds(item);
    expect(straight.x).toBeCloseTo(20); expect(straight.y).toBeCloseTo(20);
    expect(straight.width).toBeCloseTo(20); expect(straight.height).toBeCloseTo(40);
    const diagonal = rotatedItemBounds({ ...item, rotation: Math.PI / 4 });
    expect(diagonal.width).toBeCloseTo(60 / Math.sqrt(2));
    expect(diagonal.height).toBeCloseTo(60 / Math.sqrt(2));
    expect(diagonal.x + diagonal.width / 2).toBeCloseTo(30);
    expect(diagonal.y + diagonal.height / 2).toBeCloseTo(40);
  });

  it('真实520张素材池连续100种子生成120件长卷、3至6目标及无重叠旋转盘面', () => {
    const realPool = productionPoolData as HiddenObjectPool;
    const realRecipe = productionRecipeData as HiddenObjectRecipe;
    const spriteMap = new Map(realPool.sprites.map(sprite => [sprite.id, sprite]));
    const targetTotals = new Set<number>();
    const targetVariants = new Map<string, Set<string>>();
    let checkedPairs = 0;
    expect(realPool.sprites).toHaveLength(520);
    expect(realRecipe.board.width).toBe(960); expect(realRecipe.board.height).toBe(1800);
    for (let seed = 0; seed < 100; seed++) {
      const round = createHiddenObjectRound(realRecipe, realPool, seed);
      expect(round.items).toHaveLength(120);
      expect(new Set(round.items.map(item => item.id)).size).toBe(120);
      const targets = round.items.filter(item => item.groupId);
      expect(targets.length).toBeGreaterThanOrEqual(3); expect(targets.length).toBeLessThanOrEqual(6);
      targetTotals.add(targets.length);
      expect(round.tasks).toHaveLength(3);
      expect(new Set(round.items.map(item => item.spriteId)).size).toBe(120 - targets.length + round.tasks.length);
      expect(new Set(round.tasks.map(task => task.previewSpriteId)).size).toBe(round.tasks.length);
      const distractors = round.items.filter(item => !item.groupId);
      expect(new Set(distractors.map(item => item.spriteId)).size).toBe(distractors.length);
      expect(round.tasks.reduce((sum, task) => sum + task.required, 0)).toBe(targets.length);
      for (const task of round.tasks) {
        expect(task.required).toBeGreaterThanOrEqual(1); expect(task.required).toBeLessThanOrEqual(2);
        const matches = targets.filter(item => item.groupId === task.id);
        expect(matches).toHaveLength(task.required);
        expect(matches.every(item => item.spriteId === task.previewSpriteId)).toBe(true);
        const variants = targetVariants.get(task.id) ?? new Set<string>();
        for (const item of matches) variants.add(item.spriteId);
        targetVariants.set(task.id, variants);
      }
      for (const quota of realRecipe.categoryQuotas) expect(round.items.filter(item => item.categoryId === quota.categoryId)).toHaveLength(quota.count);
      for (const item of round.items) {
        if (item.groupId) {
          expect(spriteMap.get(item.spriteId)!.groupIds).toContain(item.groupId);
          expect(item.spriteId).toBe(round.tasks.find(task => task.id === item.groupId)!.previewSpriteId);
        } else {
          expect(round.tasks.some(task => task.previewSpriteId === item.spriteId)).toBe(false);
        }
      }
      const bounds = round.items.map(rotatedItemBounds);
      for (const box of bounds) {
        expect(box.x).toBeGreaterThanOrEqual(realRecipe.board.inset - 1e-9);
        expect(box.y).toBeGreaterThanOrEqual(realRecipe.board.inset - 1e-9);
        expect(box.x + box.width).toBeLessThanOrEqual(realRecipe.board.width - realRecipe.board.inset + 1e-9);
        expect(box.y + box.height).toBeLessThanOrEqual(realRecipe.board.height - realRecipe.board.inset + 1e-9);
      }
      const overlaps: { seed: number; firstId: string; secondId: string }[] = [];
      for (let a = 0; a < bounds.length; a++) for (let b = a + 1; b < bounds.length; b++) {
        const first = bounds[a], second = bounds[b];
        checkedPairs++;
        if (first.x < second.x + second.width && first.x + first.width > second.x
          && first.y < second.y + second.height && first.y + first.height > second.y) {
          overlaps.push({ seed, firstId: round.items[a].id, secondId: round.items[b].id });
        }
      }
      expect(overlaps).toEqual([]);
    }
    expect(checkedPairs).toBe(100 * 120 * 119 / 2);
    expect([...targetTotals].sort()).toEqual([3, 4, 5, 6]);
    expect(targetVariants.get('pipa')!.size).toBe(4);
    expect(targetVariants.get('drum')!.size).toBe(6);
    expect(targetVariants.get('bell')!.size).toBe(3);
    expect(createHiddenObjectRound(realRecipe, realPool, 999)).toEqual(createHiddenObjectRound(realRecipe, realPool, 999));
  });

  it('长卷连续窗口保持相近疏密，避免首部堆满而中下段出现大空洞', () => {
    const recipe = productionRecipeData as HiddenObjectRecipe;
    for (const seed of [0, 57, 99, 547]) {
      const bounds = createHiddenObjectRound(recipe, productionPoolData as HiddenObjectPool, seed).items.map(rotatedItemBounds);
      for (const [height, maximumSpread] of [[600, .15], [300, .25]]) {
        const densities: number[] = [];
        for (let top = 0; top + height <= recipe.board.height; top += 100) {
          const occupied = bounds.reduce((sum, box) => sum + box.width
            * Math.max(0, Math.min(top + height, box.y + box.height) - Math.max(top, box.y)), 0);
          densities.push(occupied / (recipe.board.width * height));
        }
        expect(Math.max(...densities) - Math.min(...densities), `seed=${seed}, window=${height}`).toBeLessThan(maximumSpread);
      }
    }
  });

  it('真实首关50秒由配置提供，未开始不扣时且到0后不能完成最后目标', () => {
    const realRecipe = productionRecipeData as HiddenObjectRecipe;
    expect(realRecipe.timeLimitSeconds).toBe(50);
    const round = createHiddenObjectRound(realRecipe, productionPoolData as HiddenObjectPool, 42);
    const ready = createSession(round, realRecipe.timeLimitSeconds * 1000);
    expect(ready.remainingMs).toBe(50_000);
    expect(advanceSession(ready, 1_000_000)).toBe(ready);
    const targets = round.items.filter(item => item.groupId);
    let nearEnd = startSession(ready);
    for (const target of targets.slice(0, -1)) nearEnd = findItem(nearEnd, target.id);
    const expired = advanceSession(nearEnd, 50_000);
    expect(expired.status).toBe('timeout');
    expect(findItem(expired, targets.at(-1)!.id)).toBe(expired);
    expect(findItem(advanceSession(nearEnd, 49_999), targets.at(-1)!.id).status).toBe('won');
  });

  it('任务组与每组件数由配置决定，未激活组可以作普通干扰', () => {
    const variable = { ...recipe, tasks: { ...recipe.tasks, groupCount: 2, minCount: 1, maxCount: 3 } };
    const seenGroups = new Set<string>(), seenCounts = new Set<number>();
    for (let seed = 0; seed < 40; seed++) {
      const round = createHiddenObjectRound(variable, pool, seed);
      expect(round.tasks).toHaveLength(2);
      for (const task of round.tasks) {
        expect(task.required).toBeGreaterThanOrEqual(1); expect(task.required).toBeLessThanOrEqual(3);
        seenGroups.add(task.id); seenCounts.add(task.required);
        expect(round.items.filter(item => item.groupId === task.id)).toHaveLength(task.required);
      }
    }
    expect(seenGroups.size).toBe(3); expect(seenCounts.size).toBe(3);
  });

  it('需要两个就重复任务卡同一张图，同组异色图是干扰且错误组标记也不能得分或提示', () => {
    const exactRecipe: HiddenObjectRecipe = {
      ...recipe, categoryQuotas: [{ categoryId: 'instruments', count: 3 }],
      tasks: { groupIds: ['bell'], groupCount: 1, minCount: 2, maxCount: 2 },
    };
    const exactPool: HiddenObjectPool = {
      ...pool, sprites: ['red-bell', 'blue-bell'].map(id => ({
        ...pool.sprites[0], id, groupIds: ['bell'], path: `${id}.png`,
      })),
    };
    const seenTypes = new Set<string>();
    for (let seed = 0; seed < 12; seed++) {
      const round = createHiddenObjectRound(exactRecipe, exactPool, seed);
      const task = round.tasks[0];
      seenTypes.add(task.previewSpriteId);
      const targets = round.items.filter(item => item.groupId);
      const distractor = round.items.find(item => !item.groupId)!;
      expect(targets.map(item => item.spriteId)).toEqual([task.previewSpriteId, task.previewSpriteId]);
      expect(new Set(round.items.map(item => item.id)).size).toBe(3);
      expect(distractor.spriteId).not.toBe(task.previewSpriteId);
      expect(exactPool.sprites.find(sprite => sprite.id === distractor.spriteId)!.groupIds).toEqual(['bell']);
      const running = startSession(createSession(round, 50_000));
      expect(findItem(running, distractor.id)).toBe(running);
      const forgedRound = { ...round, items: [{ ...distractor, groupId: task.id }, ...targets] };
      const forged = startSession(createSession(forgedRound, 50_000));
      expect(findItem(forged, distractor.id)).toBe(forged);
      expect(getHintItem(forged, task.id)!.spriteId).toBe(task.previewSpriteId);
      expect(getHintItem(forged, task.id)!.id).not.toBe(distractor.id);
      const onlyWrong = startSession(createSession({ ...forgedRound, items: [forgedRound.items[0]] }, 50_000));
      expect(getHintItem(onlyWrong)).toBeUndefined();
      const first = findItem(forged, targets[0].id);
      expect(first.tasks[0].found).toBe(1);
      expect(findItem(first, targets[0].id)).toBe(first);
      const won = findItem(first, targets[1].id);
      expect(won.status).toBe('won'); expect(won.tasks[0].found).toBe(2);
      expect(won.remainingMs).toBe(50_000);
    }
    expect(seenTypes.size).toBe(2);
  });

  it('跨类别任务不会随机耗尽另一个任务唯一可用的配额', () => {
    const crossRecipe: HiddenObjectRecipe = {
      ...recipe, categoryQuotas: [{ categoryId: 'a', count: 1 }, { categoryId: 'b', count: 1 }],
      tasks: { groupIds: ['flexible', 'only-a'], groupCount: 2, minCount: 1, maxCount: 1 },
    };
    const make = (id: string, categoryId: string, groupIds: string[]): HiddenObjectSprite => ({
      id, categoryId, groupIds, path: `${id}.png`, width: 80, height: 150, hitPoint: { x: .5, y: .5 },
    });
    const crossPool: HiddenObjectPool = {
      id: recipe.poolId, groups: [{ id: 'flexible', label: '跨类' }, { id: 'only-a', label: '仅A' }],
      sprites: [make('a-flex', 'a', ['flexible']), make('b-flex', 'b', ['flexible']), make('a-only', 'a', ['only-a'])],
    };
    for (let seed = 0; seed < 30; seed++) {
      const round = createHiddenObjectRound(crossRecipe, crossPool, seed);
      expect(round.items.map(item => item.spriteId).sort()).toEqual(['a-only', 'b-flex']);
    }
    const oneIndexCell = createHiddenObjectRound({ ...crossRecipe, board: { ...crossRecipe.board, columns: 1, rows: 1, minScale: .15, maxScale: .2 } }, crossPool, 7);
    expect(oneIndexCell.items).toHaveLength(2);
    const forcedRecipe = { ...crossRecipe, categoryQuotas: [{ categoryId: 'a', count: 3 }, { categoryId: 'b', count: 2 }], tasks: { groupIds: ['flexible'], groupCount: 1, minCount: 2, maxCount: 2 } };
    const forcedPool = { ...crossPool, sprites: [make('a-target', 'a', ['flexible']), make('a-other', 'a', []), make('b-target', 'b', ['flexible']), make('b-other', 'b', [])] };
    for (let seed = 0; seed < 30; seed++) {
      const forced = createHiddenObjectRound(forcedRecipe, forcedPool, seed);
      expect(forced.items.filter(item => item.groupId).map(item => item.spriteId)).toEqual(['a-target', 'a-target']);
      expect(forced.items.filter(item => item.categoryId === 'a')).toHaveLength(3);
      expect(forced.items.filter(item => item.categoryId === 'b')).toHaveLength(2);
    }
    const splitOnly = { ...forcedRecipe, categoryQuotas: [{ categoryId: 'a', count: 1 }, { categoryId: 'b', count: 1 }] };
    expect(() => createHiddenObjectRound(splitOnly, forcedPool, 0)).toThrow('目标素材或类别配额不足');
  });

  it('跨任务分类的同一素材只分给一个任务，两个任务不能共用精确图片', () => {
    const shared = { ...pool.sprites[0], id: 'two-groups', groupIds: ['pipa', 'drum'] };
    const oneGroup = { ...pool.sprites[1], id: 'pipa-only', groupIds: ['pipa'] };
    const sharedRecipe = { ...recipe, categoryQuotas: [{ categoryId: 'instruments', count: 4 }], tasks: { groupIds: ['pipa', 'drum'], groupCount: 2, minCount: 2, maxCount: 2 } };
    const sharedPool = { ...pool, sprites: [shared, oneGroup] };
    for (let seed = 0; seed < 10; seed++) {
      const round = createHiddenObjectRound(sharedRecipe, sharedPool, seed);
      expect(round.tasks.find(task => task.id === 'drum')!.previewSpriteId).toBe(shared.id);
      expect(round.tasks.find(task => task.id === 'pipa')!.previewSpriteId).toBe(oneGroup.id);
      expect(new Set(round.tasks.map(task => task.previewSpriteId)).size).toBe(2);
    }
    expect(() => createHiddenObjectRound(sharedRecipe, { ...sharedPool, sprites: [shared] }, 0)).toThrow('目标素材或类别配额不足');
  });

  it('素材、目标、空间或配额不足时明确失败，不少放或缩到配置尺寸以下', () => {
    expect(() => createHiddenObjectRound({ ...recipe, poolId: 'missing' }, pool, 1)).toThrow('素材池');
    expect(() => createHiddenObjectRound({ ...recipe, board: { ...recipe.board, columns: 0 } }, pool, 1)).toThrow('网格行列');
    expect(() => createHiddenObjectRound({ ...recipe, board: { ...recipe.board, inset: 50 } }, pool, 1)).toThrow('安全区域');
    expect(() => createHiddenObjectRound({ ...recipe, board: { ...recipe.board, minScale: 3, maxScale: 3, maxRotationDegrees: 0 } }, pool, 1)).toThrow('散放空间不足');
    expect(() => createHiddenObjectRound({ ...recipe, board: { ...recipe.board, minScale: 1, maxScale: .5 } }, pool, 1)).toThrow('尺寸范围');
    expect(() => createHiddenObjectRound({ ...recipe, board: { ...recipe.board, maxRotationDegrees: -1 } }, pool, 1)).toThrow('旋转角度');
    expect(() => createHiddenObjectRound({ ...recipe, tasks: { ...recipe.tasks, groupCount: 4 } }, pool, 1)).toThrow('任务组数量');
    expect(() => createHiddenObjectRound({ ...recipe, tasks: { ...recipe.tasks, minCount: 3, maxCount: 2 } }, pool, 1)).toThrow('数量范围');
    expect(() => createHiddenObjectRound(recipe, { ...pool, sprites: pool.sprites.filter(sprite => !sprite.groupIds.includes('bell')) }, 1)).toThrow('目标素材或类别配额不足');
    expect(() => createHiddenObjectRound({ ...recipe, categoryQuotas: recipe.categoryQuotas.map(quota => quota.categoryId === 'instruments' ? { ...quota, count: 5 } : quota) }, pool, 1)).toThrow('目标素材或类别配额不足');
    expect(() => createHiddenObjectRound(recipe, { ...pool, sprites: pool.sprites.filter(sprite => sprite.categoryId !== 'flowers') }, 1)).toThrow('目标素材或类别配额不足');
    expect(() => createHiddenObjectRound(recipe, { ...pool, sprites: [...pool.sprites, pool.sprites[0]] }, 1)).toThrow('素材编号');
    expect(() => createHiddenObjectRound(recipe, { ...pool, sprites: [{ ...pool.sprites[0], hitPoint: { x: 2, y: .5 } }, ...pool.sprites.slice(1)] }, 1)).toThrow('参考点越界');
    expect(() => createHiddenObjectRound(recipe, pool, NaN)).toThrow('随机种子');
  });
});

describe('找物独立计时与完成判定', () => {
  const round = createHiddenObjectRound(recipe, pool, 8);
  const targetIds = round.items.filter(item => item.groupId).map(item => item.id);
  const distractor = round.items.find(item => !item.groupId)!;

  it('加载等待、暂停和后台冻结不扣时，恢复必须主动操作', () => {
    const ready = createSession(round, 90_000);
    expect(advanceSession(ready, 900_000)).toBe(ready);
    expect(findItem(ready, targetIds[0])).toBe(ready);
    expect(resumeSession(ready)).toBe(ready);
    const running = startSession(ready);
    expect(startSession(running)).toBe(running);
    const elapsed = advanceSession(running, 1_234.25);
    expect(elapsed.remainingMs).toBe(88_765.75);
    const paused = pauseSession(elapsed);
    expect(paused.status).toBe('paused');
    expect(advanceSession(paused, 900_000)).toBe(paused);
    expect(findItem(paused, targetIds[0])).toBe(paused);
    expect(startSession(paused)).toBe(paused);
    expect(advanceSession(resumeSession(paused), 765.75).remainingMs).toBe(88_000);
    expect(ready.remainingMs).toBe(90_000); expect(ready.status).toBe('ready');
  });

  it('误点不扣时，重复点击不计数，胜利只发生一次', () => {
    const initial = startSession(createSession(round, 90_000));
    expect(findItem(initial, distractor.id)).toBe(initial);
    expect(findItem(initial, 'not-on-board')).toBe(initial);
    const first = findItem(initial, targetIds[0]);
    expect(first.remainingMs).toBe(90_000);
    expect(first.foundIds).toHaveLength(1);
    expect(findItem(first, targetIds[0])).toBe(first);
    const won = targetIds.slice(1).reduce(findItem, first);
    expect(won.status).toBe('won'); expect(won.foundIds).toHaveLength(6);
    expect(won.tasks.every(task => task.found === task.required)).toBe(true);
    expect(advanceSession(won, 999_999)).toBe(won);
    expect(findItem(won, targetIds[0])).toBe(won);
    expect(pauseSession(won)).toBe(won); expect(resumeSession(won)).toBe(won);
    expect(initial.foundIds).toEqual([]); expect(round.tasks.every(task => task.found === 0)).toBe(true);
  });

  it('截止瞬间与卡顿跨过截止都失败，最后一个目标不能将超时变成胜利', () => {
    let before = startSession(createSession(round, 1_000));
    for (const id of targetIds.slice(0, -1)) before = findItem(before, id);
    const exact = advanceSession(before, 1_000);
    expect(exact.status).toBe('timeout'); expect(exact.remainingMs).toBe(0);
    expect(findItem(exact, targetIds.at(-1)!)).toBe(exact);
    expect(exact.foundIds).toHaveLength(5);
    const over = advanceSession(before, 5_000);
    expect(over.status).toBe('timeout'); expect(over.remainingMs).toBe(0);
    expect(startSession(over)).toBe(over); expect(resumeSession(over)).toBe(over);
    const justBefore = advanceSession(before, 999.999);
    const won = findItem(justBefore, targetIds.at(-1)!);
    expect(won.status).toBe('won'); expect(won.remainingMs).toBeGreaterThan(0);
  });

  it('无限提示只定位未完成目标，不自动答题或改变剩余时间', () => {
    const initial = startSession(createSession(round, 90_000));
    expect(getHintItem(createSession(round, 90_000))).toBeUndefined();
    const hint = getHintItem(initial)!;
    for (let count = 0; count < 20; count++) expect(getHintItem(initial)).toEqual(hint);
    expect(initial.foundIds).toEqual([]); expect(initial.remainingMs).toBe(90_000);
    const after = findItem(initial, hint.id);
    expect(getHintItem(after)!.id).not.toBe(hint.id);
    const group = round.tasks[0].id;
    expect(getHintItem(initial, group)!.groupId).toBe(group);
    const completedGroup = round.items.filter(item => item.groupId === group).reduce((session, item) => findItem(session, item.id), initial);
    expect(getHintItem(completedGroup, group)).toBeUndefined();
    expect(getHintItem(pauseSession(initial))).toBeUndefined();
    expect(getHintItem(advanceSession(initial, 90_000))).toBeUndefined();
  });

  it('重试原种子、原布局、完整时长且重新等待开始，终局状态不会残留', () => {
    const initial = createSession(round, 90_000);
    const lost = advanceSession(findItem(startSession(initial), targetIds[0]), 90_000);
    const retry = restartSession(lost);
    expect(retry).toEqual(initial);
    expect(retry.round).toBe(round);
    expect(retry.tasks).not.toBe(lost.tasks);
    expect(retry.tasks.every(task => task.found === 0)).toBe(true);
    expect(() => createSession(round, 0)).toThrow('时长');
    expect(() => advanceSession(startSession(initial), -1)).toThrow('计时间隔');
    expect(() => advanceSession(startSession(initial), Infinity)).toThrow('计时间隔');
  });
});
