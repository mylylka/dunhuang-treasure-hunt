import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { firstGalleryNarration } from '../../src/content/world/first-gallery-narration';
import type { FirstGalleryMuralPart } from '../../src/services/first-gallery';
import { createFirstGalleryMural, muralObserver } from '../../src/world/first-gallery-mural';
import { isTerrainWalkable, toTerrainPoint } from '../../src/world/terrain-rules-v001';
import type { WorldPoint } from '../../src/world/types';

const dt = .05;
const gap = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);
const camera = { position: new Vector3(), target: new Vector3(0, 0, -1), fov: 45 };

function startGuide({ audioManaged = false, initialParts = [] as FirstGalleryMuralPart[], failFirstSave = false } = {}) {
  const saved = [...initialParts];
  const attempts: FirstGalleryMuralPart[] = [];
  let position: WorldPoint = toTerrainPoint('courtyard', { x: -11.6, z: -17.1 });
  const guide = createFirstGalleryMural((part, replayParts) => {
    attempts.push(part);
    if (failFirstSave && attempts.length === 1) return false;
    if (!replayParts) saved.push(part);
    return true;
  });
  guide.update(position, 0, true, saved);
  expect(guide.start(position, saved, camera)).toBe(true);
  function tick({ facingWall = true, elapsedRealSeconds = dt } = {}) {
    const next = guide.update(position, dt, false, saved, audioManaged, facingWall, elapsedRealSeconds);
    expect(gap(next, position)).toBeLessThanOrEqual(1.65 * dt + .00001);
    expect(isTerrainWalkable(next, true)).toBe(true);
    position = next;
  }
  function waitFor(condition: () => boolean) {
    for (let i = 0; !condition() && i < 600; i++) tick();
    expect(condition()).toBe(true);
  }
  return { guide, saved, attempts, tick, waitFor, position: () => position };
}

describe('First Gallery mural narration', () => {
  it('ends one visible line at a time and follows the actual outward and return walk', () => {
    const { guide, waitFor, tick, position } = startGuide({ audioManaged: true });
    const entryPosition = position();
    expect(guide.phase).toBe('wall');
    expect(guide.advanceNarration()).toBe(false);
    for (let i = 0; i < 16; i++) tick({ facingWall: false });
    expect(guide.snapshot()).toMatchObject({ phase: 'wall', narration: null });
    expect(position()).toEqual(entryPosition);
    waitFor(() => guide.snapshot().text?.startsWith('这面墙') === true);
    for (let i = 0; i < 200; i++) tick();
    expect(guide.snapshot()).toMatchObject({ phase: 'wall', narration: 'mural-wall' });
    expect(guide.advanceNarration()).toBe(true);
    expect(guide.advanceNarration()).toBe(false);
    tick();
    expect(guide.phase).toBe('outbound');
    expect(position()).toEqual(entryPosition);
    expect(guide.advanceNarration()).toBe(false);
    waitFor(() => guide.snapshot().text === '这边有莲花……');
    expect(gap(position(), muralObserver)).toBeGreaterThan(3);
    expect(guide.advanceNarration()).toBe(true);
    tick();
    expect(guide.phase).toBe('bird');
    expect(guide.advanceNarration()).toBe(false);
    waitFor(() => guide.snapshot().text === '这些东西会不会跟画有关呢？');
    expect(guide.advanceNarration()).toBe(true);
    tick();
    expect(guide.phase).toBe('return-ready');
    expect(guide.advanceNarration()).toBe(false);
    waitFor(() => guide.snapshot().text === '我再去看一眼壁画吧。');
    expect(guide.advanceNarration()).toBe(true);
    tick();
    expect(guide.phase).toBe('returning');
    expect(gap(position(), muralObserver)).toBeGreaterThan(3);
    expect(guide.advanceNarration()).toBe(false);
    waitFor(() => guide.phase === 'face-wall');
    expect(gap(position(), muralObserver)).toBeLessThan(.025);
    tick({ facingWall: false, elapsedRealSeconds: 1 });
    expect(guide.snapshot()).toMatchObject({ phase: 'face-wall', narration: null, text: null });
    expect(guide.pick('lotus')).toBe(false);
    tick();
    expect(guide.phase).toBe('pick');
    expect(guide.snapshot()).toMatchObject({ narration: 'mural-guess', text: '嗯，好像真的有关系。中间这个会不会是莲花？' });
    expect(guide.pick('lotus')).toBe(false);
    expect(guide.advanceNarration()).toBe(true);
    expect(guide.snapshot().text).toBe('点一下桌上的莲花试试。');
    expect(guide.advanceNarration()).toBe(false);
    expect(guide.phase).toBe('pick');
  });

  it.each([
    { parts: ['lotus', 'bird', 'grapes'], end: 'finished', hold: 2 },
    { parts: ['lotus', 'grapes', 'bird'], end: 'skipped', hold: 1 },
  ] as const)('shows explanations for $parts and returns to roaming $hold seconds after the summary is $end', ({ parts, end, hold }) => {
    const { guide, saved, tick, waitFor } = startGuide();
    waitFor(() => guide.phase === 'pick');
    for (const [index, part] of parts.entries()) {
      expect(guide.snapshot().narration).toBe(part === 'lotus' ? 'mural-guess' : 'mural-missing');
      expect(guide.advanceNarration()).toBe(true);
      if (index === 0) {
        expect(guide.pick('bird')).toBe(false);
        expect(guide.pick('grapes')).toBe(false);
      }
      expect(guide.pick(part)).toBe(true);
      expect(guide.advanceNarration()).toBe(false);
      waitFor(() => guide.phase === 'education');
      const id = `mural-${part}-note` as const;
      expect(guide.snapshot()).toMatchObject({ narration: id, text: firstGalleryNarration[id].text });
      if (index < parts.length - 1) {
        expect(guide.advanceNarration()).toBe(true);
        tick({ elapsedRealSeconds: .99 });
        expect(guide.snapshot()).toMatchObject({ phase: 'education', narration: null });
        tick({ elapsedRealSeconds: .02 });
        expect(guide.snapshot()).toMatchObject({ phase: 'pick', narration: 'mural-missing' });
      } else waitFor(() => guide.phase === 'summary');
    }
    expect(saved).toEqual(parts);
    const finalText = '敦煌壁画中的许多纹样，都从真实的花草、动物等形象中提炼而来，也有联珠、菱格等几何纹样。'
      + '古代画师将这些图案加以美化，再通过重复、对称、旋转等方式巧妙组合，形成装饰在壁画和藻井上的精美纹样。';
    expect(guide.snapshot()).toMatchObject({ narration: 'mural-summary', text: finalText });
    expect(guide.advanceNarration(end)).toBe(true);
    expect(guide.advanceNarration()).toBe(false);
    tick({ elapsedRealSeconds: hold - .01 });
    expect(guide.snapshot()).toMatchObject({ phase: 'summary', narration: null, text: finalText, active: true });
    tick({ elapsedRealSeconds: .02 });
    expect(guide.active).toBe(false);
  });

  it.each([
    { initialParts: ['lotus'] as FirstGalleryMuralPart[], nextPart: 'grapes' },
    { initialParts: ['lotus', 'grapes'] as FirstGalleryMuralPart[], nextPart: 'bird' },
  ] as const)('resumes a partially repaired mural with $nextPart and only reports a save failure', ({ initialParts, nextPart }) => {
    const { guide, saved, attempts, waitFor } = startGuide({ initialParts, failFirstSave: true });
    waitFor(() => guide.phase === 'pick');
    expect(guide.snapshot().narration).toBe('mural-missing');
    expect(guide.advanceNarration()).toBe(true);
    expect(guide.pick('lotus')).toBe(false);
    if (initialParts.includes('grapes')) expect(guide.pick('grapes')).toBe(false);
    expect(guide.snapshot().text).toBeNull();
    expect(attempts).toEqual([]);
    expect(guide.pick(nextPart)).toBe(true);
    waitFor(() => guide.phase === 'pick');
    expect(guide.snapshot()).toMatchObject({ narration: null, text: '这处暂时没能保存，请再点一次试试。' });
    expect(saved).toEqual(initialParts);
    expect(guide.pick(nextPart)).toBe(true);
    waitFor(() => guide.phase === 'education');
    expect(guide.snapshot().narration).toBe(`mural-${nextPart}-note`);
    expect(saved).toEqual([...initialParts, nextPart]);
  });

  it('allows a declined first visit and a finished replay without rewriting saved parts', () => {
    const guide = createFirstGalleryMural(() => true);
    const outside = { ...muralObserver, x: muralObserver.x + 2 };
    guide.update(muralObserver, 0, true, []);
    expect(guide.snapshot()).toMatchObject({ phase: 'invite', marker: false });
    guide.decline();
    guide.update(muralObserver, dt, true, []);
    expect(guide.snapshot()).toMatchObject({ phase: 'idle', marker: false });
    guide.update(outside, dt, true, []);
    expect(guide.marker).toBe(true);
    guide.update(muralObserver, dt, true, []);
    expect(guide.phase).toBe('invite');

    const saved = ['lotus', 'bird', 'grapes'] as const;
    const replay = createFirstGalleryMural((part, replayParts) => part === 'lotus' && replayParts?.length === 1);
    replay.request(muralObserver, saved);
    expect(replay.start(muralObserver, saved, camera)).toBe(true);
    let position: WorldPoint = muralObserver;
    for (let i = 0; i < 600 && replay.phase !== 'pick'; i++) position = replay.update(position, dt, false, saved);
    expect(replay.snapshot()).toMatchObject({ phase: 'pick', replay: true, narration: 'mural-guess' });
    expect(replay.advanceNarration()).toBe(true);
    expect(replay.pick('lotus')).toBe(true);
    for (let i = 0; i < 300 && replay.phase === 'repair'; i++) replay.update(position, dt, false, saved);
    expect(replay.snapshot().narration).toBe('mural-lotus-note');
    expect(saved).toEqual(['lotus', 'bird', 'grapes']);
  });
});
