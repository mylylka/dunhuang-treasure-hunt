import { describe, expect, it } from 'vitest';
import { MOGAO_EXHIBIT } from '../../src/content/world/mogao-exhibit-v001';
import {
  emptyMogaoExhibitProgress, finishedMogaoExhibit, loadMogaoExhibitProgress,
  MOGAO_EXHIBIT_PROGRESS_KEY, openedMogaoExhibit, saveMogaoExhibitProgress, viewMogaoExhibit,
} from '../../src/services/mogao-exhibit-progress';
import { restrictMogaoExhibitCheckpoint } from '../../src/world/mogao-exhibit-session';
import { upperPreviewCheckpoint } from '../../src/world/mogao-upper-session';

function storage() {
  const records = new Map<string, string>();
  return { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => records.set(key, value) };
}

describe('B hall exhibit progress', () => {
  it('opens only after twelve different exhibits, in any order', () => {
    const ids = MOGAO_EXHIBIT.items.map(item => item.id).reverse();
    let data = emptyMogaoExhibitProgress();
    for (const id of ids.slice(1)) {
      data = viewMogaoExhibit(data, id);
      expect(viewMogaoExhibit(data, id)).toBe(data);
      expect(finishedMogaoExhibit(data)).toBe(false);
    }
    expect(finishedMogaoExhibit(viewMogaoExhibit(data, ids[0]))).toBe(true);
  });

  it('merges saves from stale views, preserving first intro and completion notice', () => {
    const memory = storage();
    const initial = emptyMogaoExhibitProgress();
    saveMogaoExhibitProgress({ ...viewMogaoExhibit(initial, 'C02'), introSeen: true }, memory);
    saveMogaoExhibitProgress(viewMogaoExhibit(initial, 'D01'), memory);
    expect(loadMogaoExhibitProgress(memory).data).toMatchObject({ viewed: ['C02', 'D01'], introSeen: true, noticeSeen: false });
    let complete = initial;
    for (const { id } of MOGAO_EXHIBIT.items) complete = viewMogaoExhibit(complete, id);
    saveMogaoExhibitProgress({ ...complete, noticeSeen: true }, memory);
    expect(loadMogaoExhibitProgress(memory).data.noticeSeen).toBe(true);
    saveMogaoExhibitProgress(initial, memory);
    expect(loadMogaoExhibitProgress(memory).data).toMatchObject({ introSeen: true, noticeSeen: true });
  });

  it('requires an opened exhibit or lotus to count as a visit without crediting the lotus toward the gate', () => {
    const memory = storage();
    const previous = { ...emptyMogaoExhibitProgress(), introSeen: true };
    saveMogaoExhibitProgress(previous, memory);
    expect(openedMogaoExhibit(loadMogaoExhibitProgress(memory).data)).toBe(false);
    saveMogaoExhibitProgress({ ...previous, wallThemeOpened: true }, memory);
    saveMogaoExhibitProgress(previous, memory);
    const next = loadMogaoExhibitProgress(memory).data;
    expect(openedMogaoExhibit(next)).toBe(true);
    expect(next.viewed).toEqual([]);
    expect(finishedMogaoExhibit(next)).toBe(false);
  });

  it('filters invalid IDs and recovers a damaged record on the next valid save', () => {
    const memory = storage();
    memory.setItem(MOGAO_EXHIBIT_PROGRESS_KEY, JSON.stringify({ version: 1, viewed: ['A01', 'A01', 'X09'], noticeSeen: true }));
    expect(loadMogaoExhibitProgress(memory).data).toMatchObject({ viewed: ['A01'], noticeSeen: false });
    memory.setItem(MOGAO_EXHIBIT_PROGRESS_KEY, '{broken');
    expect(loadMogaoExhibitProgress(memory).warning).toBeTruthy();
    const next = viewMogaoExhibit(emptyMogaoExhibitProgress(), 'B01');
    expect(saveMogaoExhibitProgress(next, memory).warning).toBeNull();
    expect(loadMogaoExhibitProgress(memory).data).toEqual(next);
  });

  it('retains the current view when storage rejects writes', () => {
    const next = viewMogaoExhibit(emptyMogaoExhibitProgress(), 'D01');
    const saved = saveMogaoExhibitProgress(next, { getItem: () => null, setItem: () => { throw new Error('no storage'); } });
    expect(saved.warning).toBeTruthy();
    expect(saved.data).toBe(next);
  });

  it('keeps locked B-platform saves and direct views inside the gallery', () => {
    const platform = upperPreviewCheckpoint('upper-b', true);
    expect(restrictMogaoExhibitCheckpoint(platform, false).walkSurface).toBe('hall-b');
    expect(restrictMogaoExhibitCheckpoint({ ...platform, walkSurface: 'view-link-b' }, false).walkSurface).toBe('hall-b');
    expect(restrictMogaoExhibitCheckpoint(platform, true)).toEqual(platform);
    expect(restrictMogaoExhibitCheckpoint(upperPreviewCheckpoint('upper-a', true), false).walkSurface).toBe('view-a');
  });
});
