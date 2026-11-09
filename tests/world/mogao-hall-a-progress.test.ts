import { describe, expect, it } from 'vitest';
import {
  emptyMogaoHallAProgress, finishedMogaoHallA, loadMogaoHallAProgress, saveMogaoHallAProgress,
  type MogaoHallAProgress,
} from '../../src/services/mogao-hall-a-progress';
import type { StorageLike } from '../../src/services/progress';

const legacyPrefix = 'dunhuang:mogao-hall-a:progress:v1';

function memoryStorage(initial: [string, string][] = []) {
  const values = new Map(initial);
  const storage: StorageLike = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  return { values, storage };
}

describe('绘世厅观赏记录', () => {
  it('merges separate completion records and unlocks only after all four stories finish', () => {
    const { values, storage } = memoryStorage();
    const first = loadMogaoHallAProgress(storage).data;
    const second = loadMogaoHallAProgress(storage).data;
    const one = saveMogaoHallAProgress({ ...first, completed: ['story-demo'] }, storage).data;
    expect(one.opened).toBe(false);
    const three = saveMogaoHallAProgress({ ...second, completed: ['bandits', 'burning-house'] }, storage).data;
    expect(three.opened).toBe(true);
    expect(finishedMogaoHallA(three)).toBe(false);
    expect(loadMogaoHallAProgress(storage).data.noticeSeen).toBe(false);
    expect([...values.keys()].some(key => key.startsWith(legacyPrefix))).toBe(false);

    const four = saveMogaoHallAProgress({ ...first, completed: ['novice-story'] }, storage).data;
    expect(four.completed).toEqual(['bandits', 'burning-house', 'story-demo', 'novice-story']);
    expect(finishedMogaoHallA(four)).toBe(true);
    expect(four.noticeSeen).toBe(false);
    saveMogaoHallAProgress({ ...four, noticeSeen: true }, storage);
    expect(saveMogaoHallAProgress(one, storage).data).toEqual({ ...four, noticeSeen: true });
  });

  it.each([false, true])('keeps legacy two-story unlocks with a prior award receipt of %s', noticeSeen => {
    const entries: [string, string][] = [
      [`${legacyPrefix}:bandits`, 'complete'], [`${legacyPrefix}:burning-house`, 'complete'],
    ];
    if (noticeSeen) entries.push([`${legacyPrefix}:award`, 'received']);
    const { values, storage } = memoryStorage(entries);
    const before = loadMogaoHallAProgress(storage).data;
    expect(before).toEqual({ completed: ['bandits', 'burning-house'], opened: true, noticeSeen, legacyUnlocked: true });
    expect(finishedMogaoHallA(before)).toBe(true);
    expect(saveMogaoHallAProgress({ ...before, noticeSeen: true }, storage).data.noticeSeen).toBe(true);
    expect([...values].filter(([key]) => key.startsWith(legacyPrefix))).toEqual(entries);
  });

  it('counts a partial legacy save toward four without granting a two-story unlock', () => {
    const { storage } = memoryStorage([[`${legacyPrefix}:bandits`, 'complete']]);
    const before = loadMogaoHallAProgress(storage).data;
    expect(before.completed).toEqual(['bandits']);
    const two = saveMogaoHallAProgress({ ...before, completed: ['burning-house'] }, storage).data;
    expect(two.completed).toEqual(['bandits', 'burning-house']);
    expect(finishedMogaoHallA(two)).toBe(false);
    expect(saveMogaoHallAProgress({ ...two, noticeSeen: true }, storage).data.noticeSeen).toBe(false);
  });

  it('remembers an opened story independently of completion and ignores legacy intro-only flags', () => {
    const { storage } = memoryStorage([['dunhuang:mogao-hall-a:intro:v1', 'seen']]);
    const before = loadMogaoHallAProgress(storage).data;
    expect(before.opened).toBe(false);
    const downstairs = saveMogaoHallAProgress({ ...before, completed: ['story-demo'] }, storage).data;
    expect(downstairs.opened).toBe(false);
    const opened = saveMogaoHallAProgress({ ...downstairs, opened: true }, storage).data;
    expect(opened).toEqual({ ...downstairs, opened: true });
    expect(saveMogaoHallAProgress(before, storage).data).toEqual(opened);
    expect(finishedMogaoHallA(opened)).toBe(false);

    const { storage: legacy } = memoryStorage([[`${legacyPrefix}:opened`, 'yes']]);
    expect(loadMogaoHallAProgress(legacy).data).toEqual({ ...before, opened: true });
  });

  it('keeps completion usable in memory when browser storage is unavailable', () => {
    const denied: StorageLike = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('denied'); },
    };
    expect(loadMogaoHallAProgress(denied)).toMatchObject({ data: emptyMogaoHallAProgress(), warning: expect.any(String) });
    const next: MogaoHallAProgress = {
      completed: ['bandits', 'burning-house', 'story-demo', 'novice-story'], opened: true, noticeSeen: true,
    };
    expect(saveMogaoHallAProgress(next, denied)).toMatchObject({ data: next, warning: expect.any(String) });
  });
});
