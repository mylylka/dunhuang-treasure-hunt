import { describe, expect, it } from 'vitest';
import { createFirstGalleryEvents, galleryBlockedRegion, galleryNearby } from '../../src/world/first-gallery-events';
import { GALLERY_TARGETS } from '../../src/content/world/first-gallery-v001';
import { readGalleryColoringEntry, startGalleryColoring } from '../../src/services/first-gallery-entry';
import { defaultWorldCheckpoint } from '../../src/world/session';
import { isTerrainWalkable, TERRAIN_SPAWN, toTerrainPoint } from '../../src/world/terrain-rules-v001';
const state = { mural: false, caisson: false, easel: false, unlocked: false };
const courtyard = (x: number, z: number) => toTerrainPoint('courtyard', { x, z });
describe('first gallery exploration cues and access', () => {
  it('walking towards the easel does not consume the cue before stopping', () => {
    const events = createFirstGalleryEvents(), position = GALLERY_TARGETS.easel;
    for (let i = 0; i < 20; i++) { events.cancel(); events.update(position, true, .05, state); }
    expect(events.snapshot()).toMatchObject({ nearby: 'easel', cue: null, easelReady: false });
    for (let i = 0; i < 30; i++) events.update(position, false, .05, state);
    expect(events.snapshot().line?.target).toBe('easel');
    for (let i = 0; i < 100; i++) events.update(position, false, .05, state);
    expect(events.snapshot().line?.target).toBe('pigments');
    events.update(toTerrainPoint('courtyard', { x: -20, z: 0 }), true, .05, state);
    expect(events.consumeIntroduction()).toBeNull();
    events.update(position, false, .05, state);
    expect(events.snapshot()).toMatchObject({ line: null, easelReady: false });
    events.update(position, false, .8, state, true, true);
    expect(events.snapshot().line?.narration).toBe('easel-discover');
  });
  it('keeps the enlarged easel approach available during small overshoots inside the courtyard', () => {
    const events = createFirstGalleryEvents();
    const approach = courtyard(-8.2, -2.1), overshoot = courtyard(-8.9, -2.1), outside = courtyard(-9.35, -2.1);
    expect(isTerrainWalkable(approach, true)).toBe(true);
    expect(isTerrainWalkable(overshoot, true)).toBe(true);
    expect(galleryNearby(overshoot)).toBeNull();
    events.update(approach, true, 1, state, true, true);
    expect(events.snapshot()).toMatchObject({ nearby: 'easel', cue: null, easelReady: false });
    events.update(overshoot, false, .8, state, true, true);
    expect(events.snapshot()).toMatchObject({ nearby: 'easel', line: { narration: 'easel-discover' } });
    events.update(outside, true, .05, state, true, true);
    expect(events.snapshot()).toMatchObject({ nearby: null, cue: null });
    events.update(overshoot, false, .8, state, true, true);
    expect(events.snapshot()).toMatchObject({ nearby: null, cue: null });

    expect(galleryNearby(TERRAIN_SPAWN)).toBeNull();
    expect(galleryNearby(courtyard(-3.3, 3.3), false, false, 'easel')).toBeNull();
    expect(galleryNearby(courtyard(.8, -1.8), false, false, 'easel')).toBeNull();

    const entries = new Map<string, string>();
    const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
    const checkpoint = defaultWorldCheckpoint(overshoot);
    const result = startGalleryColoring(checkpoint, 'test-artwork', storage);
    expect(result.ok).toBe(true);
    if (result.ok) expect(readGalleryColoringEntry(result.entry.token, storage)?.checkpoint).toEqual(checkpoint);
  });
  it('offers the mural across a wider strip without masking the caisson center or the scroll', () => {
    expect(galleryNearby(courtyard(-13.9, -17.1))).toBe('mural');
    expect(galleryNearby(courtyard(-12, -18.9))).toBe('mural');
    expect(galleryNearby(courtyard(-12, -15.8))).toBe('mural');
    expect(galleryNearby(courtyard(-12, -15.2))).toBe('caisson');
    expect(galleryNearby(courtyard(-12, -14))).toBe('caisson');
    expect(galleryNearby(GALLERY_TARGETS.scroll)).toBe('scroll');
  });
  it.each([false, true])('does not repeat completed or persisted introductions (compact: %s)', (compact) => {
    const seen = createFirstGalleryEvents(['easel'], compact);
    seen.update(GALLERY_TARGETS.easel, false, 2, state);
    expect(seen.snapshot()).toMatchObject({ cue: null, easelInvitation: false, easelReady: true });
    const completed = createFirstGalleryEvents([], compact);
    completed.update(GALLERY_TARGETS.easel, false, 2, { ...state, easel: true });
    expect(completed.snapshot()).toMatchObject({ cue: null, easelInvitation: false, easelReady: true });
    expect(galleryNearby(toTerrainPoint('courtyard', { x: -12, z: -15 }))).toBe('caisson');
  });
  it('waits for the compact easel invitation to be accepted and offers it again after leaving', () => {
    const events = createFirstGalleryEvents([], true);
    const approach = courtyard(-8.2, -2.1), outside = courtyard(-9.35, -2.1);
    events.update(outside, true, .05, state);
    expect(events.snapshot().easelInvitation).toBe(false);
    events.update(approach, true, .05, state);
    expect(events.snapshot()).toMatchObject({ easelInvitation: true, cue: null, easelReady: false });
    events.update(approach, false, 2, state);
    expect(events.snapshot()).toMatchObject({ easelInvitation: true, cue: null });

    expect(events.respondToEaselInvitation('explore')).toBe(true);
    events.update(approach, false, 2, state);
    expect(events.snapshot()).toMatchObject({ easelInvitation: false, cue: null });
    events.update(outside, true, .05, state);
    expect(events.respondToEaselInvitation('look')).toBe(false);
    events.update(approach, true, .05, state);
    expect(events.snapshot().easelInvitation).toBe(true);
    expect(events.respondToEaselInvitation('look')).toBe(true);
    expect(events.snapshot()).toMatchObject({ easelInvitation: false, line: { narration: 'easel-discover' } });
  });
  it('shows the caisson cue two floor tiles earlier along the entrance approach', () => {
    const at = (x: number, z: number) => galleryNearby(toTerrainPoint('courtyard', { x, z }));
    expect(at(-12, -8.6)).toBe('caisson');
    expect(at(-12, -8.4)).toBeNull();
    expect(at(-16, -12)).toBeNull();
  });
  it.each([false, true])('offers the easel after both introduction lines (compact: %s)', (compact) => {
    const events = createFirstGalleryEvents([], compact), position = GALLERY_TARGETS.easel;
    events.update(position, false, .8, state, true, true);
    if (compact) expect(events.respondToEaselInvitation('look')).toBe(true);
    expect(events.snapshot().line?.narration).toBe('easel-discover');
    expect(events.advanceCue()).toBe(true);
    expect(events.snapshot()).toMatchObject({ line: null, betweenLines: true, easelReady: false });
    expect(events.advanceCue()).toBe(false);
    events.update(position, false, .04, state, true, true, .95);
    expect(events.snapshot().line).toBeNull();
    events.update(position, false, .04, state, true, true, .06);
    expect(events.snapshot()).toMatchObject({ line: { narration: 'easel-pigments' }, easelReady: false });
    expect(events.consumeIntroduction()).toBeNull();
    expect(events.advanceCue()).toBe(true);
    expect(events.snapshot()).toMatchObject({ line: null, easelReady: true });
    expect(events.consumeIntroduction()).toBe('easel');
    expect(events.consumeIntroduction()).toBeNull();
  });
  it('blocks locked halls from side/rear as well as the entry', () => {
    for (const p of [{ x: 46, z: 5 }, { x: 30, z: -28 }, { x: 68, z: -38 }]) {
      expect(galleryBlockedRegion(toTerrainPoint('music', p), false)).toBe('music');
      expect(galleryBlockedRegion(toTerrainPoint('music', p), true)).toBeNull();
    }
    expect(galleryBlockedRegion(toTerrainPoint('cliff', { x: 122, z: -70 }), true)).toBe('stories');
    expect(galleryBlockedRegion(toTerrainPoint('courtyard', { x: -12, z: -15 }), false)).toBeNull();
  });
});
