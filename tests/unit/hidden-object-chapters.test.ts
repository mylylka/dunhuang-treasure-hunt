import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AssetDefinition, HiddenObjectLevel, Level } from '../../src/types';
import type { HiddenObjectPool } from '../../src/games/hidden-object/types';
import { createHiddenObjectRound, rotatedItemBounds } from '../../src/games/hidden-object/rules';
import { getLevelChoices } from '../../src/content/level-roadmap';
import { getNextOpenLevel, getPreviousOpenLevel } from '../../src/services/level-sequence';

const allLevels = readdirSync('src/content/levels').filter(name => name.endsWith('.json'))
  .map(name => JSON.parse(readFileSync(`src/content/levels/${name}`, 'utf8')) as Level);
const levels = allLevels.filter((level): level is HiddenObjectLevel => level.gameType === 'hidden-object')
  .sort((a, b) => (a.chapter?.order ?? 99) - (b.chapter?.order ?? 99) || (a.chapter?.level ?? 99) - (b.chapter?.level ?? 99));
const pool = JSON.parse(readFileSync('src/content/hidden-object/pool.json', 'utf8')) as HiddenObjectPool;
const assets = JSON.parse(readFileSync('src/content/assets.json', 'utf8')) as AssetDefinition[];
const sprites = new Map(pool.sprites.map(sprite => [sprite.id, sprite]));
const profiles = [
  { order: 1, categories: ['clothing', 'instruments'], groups: 3, total: undefined },
  { order: 2, categories: ['animals', 'plants'], groups: 4, total: 7 },
  { order: 3, categories: ['animals', 'clothing', 'instruments', 'patterns', 'plants', 'ritual'], groups: 4, total: 8 },
];
const chapter = (order: number) => levels.filter(level => level.chapter?.order === order);
const difficultyProfile = (level: HiddenObjectLevel) => ({ board: level.board, time: level.timeLimitSeconds,
  quotas: [...level.categoryQuotas].sort((a, b) => a.categoryId.localeCompare(b.categoryId)),
  groups: level.tasks.groupCount, min: level.tasks.minCount, max: level.tasks.maxCount, total: level.tasks.totalCount });

describe('正式三章九关配置与目录', () => {
  it('每章三个实际关，首关稳定ID、三个背景与三档参数准确，同章不额外加难', () => {
    expect(levels).toHaveLength(9);
    expect(new Set(levels.map(level => level.id)).size).toBe(9);
    expect(levels[0].id).toBe('music-hidden-objects-intro');
    const backgrounds = new Set<string>();
    for (const profile of profiles) {
      const entries = chapter(profile.order);
      expect(entries).toHaveLength(3);
      expect(entries.map(level => level.chapter!.level)).toEqual([1, 2, 3]);
      expect(new Set(entries.map(level => level.chapter!.id)).size).toBe(1);
      expect(new Set(entries.map(level => level.chapter!.title)).size).toBe(1);
      expect(entries[0].chapter!.title.trim().length).toBeGreaterThan(0);
      const backgroundId = entries[0].chapter!.backgroundAssetId;
      backgrounds.add(backgroundId);
      const asset = assets.find(item => item.id === backgroundId);
      expect(asset).toMatchObject({ kind: 'background', placeholder: false });
      expect(asset!.path).toMatch(/^\/assets\/shared\/hidden-object-backgrounds\/v\d{3}\/.+\.png$/);
      for (const level of entries) {
        expect(level.themeId).toBe('music'); expect(level.timeLimitSeconds).toBe(50);
        expect(level.chapter!.backgroundAssetId).toBe(backgroundId);
        expect(level.categoryQuotas.reduce((sum, quota) => sum + quota.count, 0)).toBe(120);
        expect(level.categoryQuotas.filter(quota => quota.count > 0).map(quota => quota.categoryId).sort()).toEqual(profile.categories);
        expect(level.board).toMatchObject({ width: 960, height: 1800, minScale: 1.2, maxScale: 1.6, maxRotationDegrees: 24 });
        expect(level.tasks).toMatchObject({ groupCount: profile.groups, minCount: 1, maxCount: 2 });
        expect(level.tasks.totalCount).toBe(profile.total);
        expect(difficultyProfile(level)).toEqual(difficultyProfile(entries[0]));
      }
    }
    expect(backgrounds.size).toBe(3);
  });

  it('文件顺序打乱后仍按章与章内关序排序，相邻关跨章且首末不循环', () => {
    const catalog = { levels: [...allLevels].reverse() };
    const before = JSON.stringify(catalog);
    const choices = getLevelChoices(catalog, 'music', 'hidden-object');
    expect(choices.map(choice => choice.id)).toEqual(levels.map(level => level.id));
    expect(choices.every(choice => choice.status === 'available')).toBe(true);
    for (const [index, level] of levels.entries()) {
      expect(getPreviousOpenLevel(catalog, level)?.id ?? null).toBe(levels[index - 1]?.id ?? null);
      expect(getNextOpenLevel(catalog, level)?.id ?? null).toBe(levels[index + 1]?.id ?? null);
    }
    expect(getNextOpenLevel(catalog, chapter(1)[2])?.id).toBe(chapter(2)[0].id);
    expect(getNextOpenLevel(catalog, chapter(2)[2])?.id).toBe(chapter(3)[0].id);
    expect(JSON.stringify(catalog)).toBe(before);
  });
});

describe('三档真实素材生成，保持精确图片匹配与大图散放', () => {
  it.each(profiles)('第$order章代表配置连续30种子生成完整120件，不越库、不重复干扰、不缩图', profile => {
    const level = chapter(profile.order)[0];
    expect(level).toBeDefined();
    const untouched = JSON.stringify({ level, pool });
    const variations = new Set<string>(), totals = new Set<number>();
    for (let seed = 0; seed < 30; seed++) {
      const round = createHiddenObjectRound(level, pool, seed);
      expect(round.items, `chapter ${profile.order}, seed ${seed}`).toHaveLength(120);
      expect(new Set(round.items.map(item => item.id)).size).toBe(120);
      expect(round.tasks).toHaveLength(profile.groups);
      const targets = round.items.filter(item => item.groupId), distractors = round.items.filter(item => !item.groupId);
      const total = round.tasks.reduce((sum, task) => sum + task.required, 0);
      expect(targets).toHaveLength(total); totals.add(total);
      if (profile.total !== undefined) expect(total).toBe(profile.total);
      else { expect(total).toBeGreaterThanOrEqual(3); expect(total).toBeLessThanOrEqual(6); }
      const targetSprites = new Set(round.tasks.map(task => task.previewSpriteId));
      expect(targetSprites.size).toBe(profile.groups);
      expect(new Set(distractors.map(item => item.spriteId)).size).toBe(distractors.length);
      expect(new Set(round.items.map(item => item.spriteId)).size).toBe(120 - total + profile.groups);
      for (const task of round.tasks) {
        expect(task.required).toBeGreaterThanOrEqual(1); expect(task.required).toBeLessThanOrEqual(2);
        const copies = targets.filter(item => item.groupId === task.id);
        expect(copies).toHaveLength(task.required);
        expect(copies.every(item => item.spriteId === task.previewSpriteId)).toBe(true);
        expect(sprites.get(task.previewSpriteId)!.groupIds).toContain(task.id);
      }
      for (const quota of level.categoryQuotas) expect(round.items.filter(item => item.categoryId === quota.categoryId)).toHaveLength(quota.count);
      const violations: string[] = [], bounds = round.items.map(rotatedItemBounds);
      for (const [index, item] of round.items.entries()) {
        const sprite = sprites.get(item.spriteId)!;
        expect(profile.categories).toContain(item.categoryId);
        expect(item.categoryId).toBe(sprite.categoryId);
        if (!item.groupId) expect(targetSprites.has(item.spriteId)).toBe(false);
        expect(item.width / item.height).toBeCloseTo(sprite.width / sprite.height, 10);
        const reference = Math.min((960 / level.board.columns - 2 * level.board.inset) / sprite.width,
          (1800 / level.board.rows - 2 * level.board.inset) / sprite.height);
        const scale = item.width / sprite.width / reference;
        expect(scale).toBeGreaterThanOrEqual(1.2 - 1e-9); expect(scale).toBeLessThanOrEqual(1.6 + 1e-9);
        expect(Math.abs(item.rotation)).toBeLessThanOrEqual(24 * Math.PI / 180 + 1e-9);
        const box = bounds[index], inset = level.board.inset;
        if (box.x < inset - 1e-9 || box.y < inset - 1e-9 || box.x + box.width > 960 - inset + 1e-9
          || box.y + box.height > 1800 - inset + 1e-9) violations.push(`outside ${item.id}`);
        for (let other = index + 1; other < bounds.length; other++) {
          const next = bounds[other];
          if (box.x < next.x + next.width && box.x + box.width > next.x && box.y < next.y + next.height && box.y + box.height > next.y)
            violations.push(`overlap ${item.id}/${round.items[other].id}`);
        }
      }
      expect(violations, `chapter ${profile.order}, seed ${seed}`).toEqual([]);
      expect(round.items.some(item => item.rotation > .1)).toBe(true);
      expect(round.items.some(item => item.rotation < -.1)).toBe(true);
      variations.add(round.tasks.map(task => `${task.id}:${task.previewSpriteId}:${task.required}`).sort().join('|'));
    }
    expect(variations.size).toBeGreaterThan(1);
    if (profile.order === 1) expect(totals.size).toBeGreaterThan(1);
    expect(createHiddenObjectRound(level, pool, 742)).toEqual(createHiddenObjectRound(level, pool, 742));
    expect(JSON.stringify({ level, pool })).toBe(untouched);
  });

  it('其余六关也能生成本章严格目标数，不以首关代表掩盖错误配置', () => {
    expect(levels).toHaveLength(9);
    for (const level of levels) {
      const round = createHiddenObjectRound(level, pool, 2718 + level.chapter!.level);
      expect(round.items).toHaveLength(120);
      expect(round.tasks).toHaveLength(level.chapter!.order === 1 ? 3 : 4);
      const total = round.tasks.reduce((sum, task) => sum + task.required, 0);
      if (level.chapter!.order === 2) expect(total).toBe(7);
      if (level.chapter!.order === 3) expect(total).toBe(8);
    }
  });

  it.each([
    { level: 1, seed: 43 }, { level: 1, seed: 66 }, { level: 1, seed: 74 },
    { level: 2, seed: 15 }, { level: 2, seed: 74 }, { level: 3, seed: 74 },
  ])('第二章第$level关 seed $seed 的密集盘面完整生成，不以缩图或碰撞绕过原失败', ({ level: chapterLevel, seed }) => {
    const level = chapter(2).find(entry => entry.chapter!.level === chapterLevel)!;
    expect(level).toBeDefined();
    const round = createHiddenObjectRound(level, pool, seed);
    expect(round.items).toHaveLength(120);
    expect(new Set(round.items.map(item => item.id)).size).toBe(120);
    expect(round.tasks).toHaveLength(4);
    expect(round.tasks.reduce((total, task) => total + task.required, 0)).toBe(7);
    expect(round.items.filter(item => item.groupId)).toHaveLength(7);
    const { board } = level;
    const bounds = round.items.map(rotatedItemBounds), violations: string[] = [];
    for (const [index, item] of round.items.entries()) {
      const sprite = sprites.get(item.spriteId)!;
      const reference = Math.min((board.width / board.columns - 2 * board.inset) / sprite.width,
        (board.height / board.rows - 2 * board.inset) / sprite.height);
      const scale = item.width / sprite.width / reference;
      expect(item.width / item.height).toBeCloseTo(sprite.width / sprite.height, 10);
      expect(scale).toBeGreaterThanOrEqual(board.minScale! - 1e-9);
      expect(scale).toBeLessThanOrEqual(board.maxScale! + 1e-9);
      expect(Math.abs(item.rotation)).toBeLessThanOrEqual(board.maxRotationDegrees! * Math.PI / 180 + 1e-9);
      const box = bounds[index];
      if (box.x < board.inset - 1e-9 || box.y < board.inset - 1e-9
        || box.x + box.width > board.width - board.inset + 1e-9
        || box.y + box.height > board.height - board.inset + 1e-9) violations.push(`outside ${item.id}`);
      for (let other = index + 1; other < bounds.length; other++) {
        const next = bounds[other];
        if (box.x < next.x + next.width && box.x + box.width > next.x
          && box.y < next.y + next.height && box.y + box.height > next.y)
          violations.push(`overlap ${item.id}/${round.items[other].id}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('拒绝不可实现、非整数和非有限的总目标数', () => {
    const level = chapter(2)[0];
    expect(level).toBeDefined();
    for (const totalCount of [0, level.tasks.groupCount * level.tasks.minCount - 1,
      level.tasks.groupCount * level.tasks.maxCount + 1, 7.5, NaN, Infinity]) {
      expect(() => createHiddenObjectRound({ ...level, tasks: { ...level.tasks, totalCount } }, pool, 1)).toThrow(/找物配置/);
    }
  });
});
